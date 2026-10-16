import { and, eq, sum } from "drizzle-orm";
import { db } from "@/db";
import { accounts, events, payments } from "@/db/schema";
import { generateSlug } from "@/lib/slug";
import { upgradeAmountMinor, normalizeTier, capForTier, type TierId } from "@/lib/pricing";

/**
 * Payment fulfilment — shared by the Paystack webhook (production source of
 * truth) and the dev-only verify fallback (local dev can't receive webhooks).
 *
 * - Amount recheck: recompute the expected price for this tier/cap from what
 *   was already paid, and refuse to fulfil on a mismatch.
 * - Idempotent: UNIQUE(provider_ref); replays insert nothing.
 * - On success one transaction: record the payment (minimal raw data, never
 *   the full payload — PII rule), set guest_cap + tier, set PUBLISHED, claim
 *   a unique slug. Slug collisions abort the transaction and retry whole.
 */

export interface FulfilInput {
  providerRef: string;
  eventId: string;
  amountMinor: number;
  currency: string;
  tier?: string;
  cap?: number;
}

export type FulfilOutcome =
  | { result: "recorded"; email: string; slug: string; tier: TierId }
  | { result: "duplicate" }
  | { result: "amount-mismatch" }
  | { result: "unknown-event" }
  | { result: "failed" };

export async function fulfilPayment(input: FulfilInput): Promise<FulfilOutcome> {
  const { providerRef, eventId, amountMinor, currency } = input;
  const metaCap = Number(input.cap ?? 0);
  const paidTier: TierId = normalizeTier(input.tier ?? "CLASSIC");
  const paidCap = metaCap > 0 ? metaCap : capForTier(paidTier);

  let outcome: FulfilOutcome = { result: "failed" };

  for (let attempt = 0; attempt < 5 && outcome.result === "failed"; attempt++) {
    try {
      outcome = await db.transaction(async (tx): Promise<FulfilOutcome> => {
        const [{ total }] = await tx
          .select({ total: sum(payments.amountMinor) })
          .from(payments)
          .where(and(eq(payments.eventId, eventId), eq(payments.status, "SUCCESS")));
        const paidBefore = Number(total ?? 0);
        const expected = upgradeAmountMinor(paidTier, paidBefore).amountMinor;
        if (amountMinor < expected) {
          return { result: "amount-mismatch" };
        }

        const inserted = await tx
          .insert(payments)
          .values({
            eventId,
            provider: "paystack",
            providerRef,
            amountMinor,
            currency,
            status: "SUCCESS",
            // Minimal raw data only — never store full payloads (PII rule).
            raw: { reference: providerRef, amountMinor, currency },
          })
          .onConflictDoNothing({ target: payments.providerRef })
          .returning({ id: payments.id });
        if (inserted.length === 0) {
          return { result: "duplicate" };
        }

        const [event] = await tx.select().from(events).where(eq(events.id, eventId)).limit(1);
        if (!event) throw new Error("unknown-event");

        const newSlug = generateSlug(event.groomName, event.brideName);
        if (event.status !== "PUBLISHED") {
          await tx
            .update(events)
            .set({ status: "PUBLISHED", guestCap: paidCap, tier: paidTier, slug: newSlug })
            .where(eq(events.id, event.id));
        } else {
          // Upgrade path: only raise the cap (slug never changes after publish).
          await tx.update(events).set({ guestCap: paidCap, tier: paidTier }).where(eq(events.id, event.id));
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
          tier: paidTier,
        };
      });
    } catch (err) {
      if (err instanceof Error && err.message === "unknown-event") {
        return { result: "unknown-event" };
      }
      // Slug unique-violation (or transient) → retry the transaction.
      console.error("payment fulfil tx retry");
      outcome = { result: "failed" };
    }
  }
  return outcome;
}
