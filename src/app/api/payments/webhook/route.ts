import { NextResponse, type NextRequest } from "next/server";
import { and, eq, sum } from "drizzle-orm";
import { db } from "@/db";
import { accounts, events, payments } from "@/db/schema";
import { generateSlug } from "@/lib/slug";
import { sendReceiptEmail } from "@/lib/email";
import { appUrl } from "@/lib/auth";
import { formatNaira, upgradeAmountMinor, capForTier, normalizeTier, tierLabel, type TierId } from "@/lib/pricing";
import { verifyBachsSignature, decimalToKobo } from "@/lib/bachs";

/**
 * Bachs webhook.
 * - Verifies X-Bachs-Signature-V2 (preferred) or X-Bachs-Signature:
 *   HMAC-SHA256 of "{timestamp}.{rawBody}" with the per-endpoint signing
 *   secret (BACHS_WEBHOOK_SECRET, NOT the API key).
 * - Fulfils on collection.succeeded only. Webhooks are the source of truth;
 *   client redirects are never trusted.
 * - Idempotent: provider_ref has a UNIQUE constraint; replays insert nothing.
 * - On success one transaction: record payment, recheck the charged amount
 *   against the tier/cap we priced, set guest_cap + tier, set status
 *   PUBLISHED, claim the slug. Slug collisions retry the whole transaction
 *   (a failed UPDATE aborts a PG transaction — never continue it).
 * - Never logs the payload (contains PII).
 */
export async function POST(req: NextRequest) {
  const secret = process.env.BACHS_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  const raw = await req.text();
  const valid = verifyBachsSignature({
    rawBody: raw,
    signatureV2: req.headers.get("x-bachs-signature-v2"),
    signatureV1: req.headers.get("x-bachs-signature"),
    timestamp: req.headers.get("x-bachs-timestamp"),
    secret,
  });
  if (!valid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let body: {
    type?: string;
    data?: {
      reference?: string | null;
      amount?: string;
      currency?: string;
      status?: string;
      metadata?: { eventId?: string; cap?: string; tier?: string };
    };
  };
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  if (body.type !== "collection.succeeded" || body.data?.status !== "SUCCEEDED") {
    // Acknowledge other events without action.
    return NextResponse.json({ ok: true, ignored: true });
  }

  const providerRef = body.data.reference ?? "";
  const eventId = body.data.metadata?.eventId ?? "";
  if (!providerRef || !eventId) {
    return NextResponse.json({ error: "Missing reference/event" }, { status: 400 });
  }

  const amountMinor = decimalToKobo(body.data.amount ?? "0");
  const currency = body.data.currency ?? "NGN";
  const metaCap = Number(body.data.metadata?.cap ?? 0);
  const metaTier = body.data.metadata?.tier;
  // Normalise the tier once; derive its flat cap (legacy INTIMATE → FREE).
  const paidTier: TierId = normalizeTier(metaTier ?? "CLASSIC");
  const paidCap = metaCap > 0 ? metaCap : capForTier(paidTier);

  type Outcome =
    | { result: "recorded"; email: string; slug: string; tier: string }
    | { result: "duplicate" }
    | { result: "amount-mismatch" };

  let outcome: Outcome | "unknown-event" | "failed";
  outcome = "failed";

  // Whole-transaction retry loop: a slug collision aborts the transaction.
  for (let attempt = 0; attempt < 5 && outcome === "failed"; attempt++) {
    try {
      outcome = await db.transaction(async (tx): Promise<Outcome> => {
        // Amount recheck: recompute the expected price for this tier/cap from
        // what was already paid, and refuse to fulfil on a mismatch.
        const [{ total }] = await tx
          .select({ total: sum(payments.amountMinor) })
          .from(payments)
          .where(and(eq(payments.eventId, eventId), eq(payments.status, "SUCCESS")));
        const paidBefore = Number(total ?? 0);
        const expected = upgradeAmountMinor(paidTier, paidBefore).amountMinor;
        if (amountMinor < expected) {
          return { result: "amount-mismatch" };
        }

        // Idempotency via UNIQUE(provider_ref): replay inserts nothing.
        const inserted = await tx
          .insert(payments)
          .values({
            eventId,
            provider: "bachs",
            providerRef,
            amountMinor,
            currency,
            status: "SUCCESS",
            // Minimal raw data only — never store full payloads (PII rule).
            raw: { type: body.type, reference: providerRef, amountMinor, currency },
          })
          .onConflictDoNothing({ target: payments.providerRef })
          .returning({ id: payments.id });

        if (inserted.length === 0) {
          return { result: "duplicate" };
        }

        const [event] = await tx.select().from(events).where(eq(events.id, eventId)).limit(1);
        if (!event) throw new Error("unknown-event");

        const newCap = paidCap;
        const tier = paidTier;
        const newSlug = generateSlug(event.groomName, event.brideName);

        if (event.status !== "PUBLISHED") {
          await tx
            .update(events)
            .set({ status: "PUBLISHED", guestCap: newCap, tier, slug: newSlug })
            .where(eq(events.id, event.id));
        } else {
          // Upgrade path: only raise the cap (slug never changes after publish).
          await tx.update(events).set({ guestCap: newCap, tier }).where(eq(events.id, event.id));
        }

        const [owner] = await tx
          .select({ email: accounts.email })
          .from(accounts)
          .where(eq(accounts.id, event.ownerId))
          .limit(1);

        return {
          result: "recorded",
          email: owner?.email ?? "",
          slug: event.slug ?? newSlug,
          tier,
        };
      });
    } catch (err) {
      if (err instanceof Error && err.message === "unknown-event") {
        outcome = "unknown-event";
        break;
      }
      // Slug unique-violation (or transient) → retry the transaction.
      console.error("webhook tx retry");
      outcome = "failed";
    }
  }

  if (outcome === "failed") {
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
  if (outcome === "unknown-event") {
    return NextResponse.json({ ok: true, ignored: "unknown event id" });
  }
  if (outcome.result === "duplicate") {
    return NextResponse.json({ ok: true, result: "duplicate" });
  }
  if (outcome.result === "amount-mismatch") {
    console.error("bachs amount mismatch", { reference: providerRef, eventId });
    return NextResponse.json({ ok: false, result: "amount-mismatch" }, { status: 400 });
  }

  // Receipt email after commit.
  const publicUrl = `${appUrl()}/w/${outcome.slug}`;
  try {
    await sendReceiptEmail(
      outcome.email,
      publicUrl,
      tierLabel(outcome.tier as TierId),
      formatNaira(amountMinor),
    );
  } catch {
    console.error("receipt email failed");
  }

  return NextResponse.json({ ok: true, result: outcome.result });
}
