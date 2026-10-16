import { NextResponse, type NextRequest } from "next/server";
import { appUrl } from "@/lib/auth";
import { sendReceiptEmail } from "@/lib/email";
import { formatNaira, tierLabel } from "@/lib/pricing";
import { verifyPaystackSignature } from "@/lib/paystack";
import { fulfilPayment } from "@/lib/payments-fulfil";

/**
 * Paystack webhook.
 * - Verifies X-Paystack-Signature: hex HMAC-SHA512 of the raw body using the
 *   secret key (Paystack has no separate webhook secret).
 * - Fulfils on charge.success only. Webhooks are the source of truth; client
 *   redirects are never trusted.
 * - Idempotent: provider_ref has a UNIQUE constraint; replays insert nothing.
 * - Never logs the payload (contains PII).
 */
export async function POST(req: NextRequest) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) {
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  const raw = await req.text();
  const valid = verifyPaystackSignature({
    rawBody: raw,
    signature: req.headers.get("x-paystack-signature"),
    secret,
  });
  if (!valid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let body: {
    event?: string;
    data?: {
      reference?: string | null;
      amount?: number | string;
      currency?: string;
      status?: string;
      metadata?: Record<string, unknown>;
    };
  };
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  if (body.event !== "charge.success" || body.data?.status !== "success") {
    // Acknowledge other events without action.
    return NextResponse.json({ ok: true, ignored: true });
  }

  const providerRef = body.data.reference ?? "";
  const meta = body.data.metadata ?? {};
  const eventId = meta.eventId != null ? String(meta.eventId) : "";
  if (!providerRef || !eventId) {
    return NextResponse.json({ error: "Missing reference/event" }, { status: 400 });
  }

  const currency = body.data.currency ?? "NGN";
  if (currency !== "NGN") {
    return NextResponse.json({ ok: true, ignored: "currency" });
  }

  const amountMinor = Number(body.data.amount ?? 0);
  const outcome = await fulfilPayment({
    providerRef,
    eventId,
    amountMinor,
    currency,
    tier: meta.tier != null ? String(meta.tier) : undefined,
    cap: meta.cap != null ? Number(String(meta.cap)) : undefined,
  });

  if (outcome.result === "failed") {
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
  if (outcome.result === "unknown-event") {
    return NextResponse.json({ ok: true, ignored: "unknown event id" });
  }
  if (outcome.result === "duplicate") {
    return NextResponse.json({ ok: true, result: "duplicate" });
  }
  if (outcome.result === "amount-mismatch") {
    console.error("paystack amount mismatch", { reference: providerRef, eventId });
    return NextResponse.json({ ok: false, result: "amount-mismatch" }, { status: 400 });
  }

  // Receipt email after commit.
  const publicUrl = `${appUrl()}/w/${outcome.slug}`;
  try {
    await sendReceiptEmail(
      outcome.email,
      publicUrl,
      tierLabel(outcome.tier),
      formatNaira(amountMinor),
    );
  } catch {
    console.error("receipt email failed");
  }

  return NextResponse.json({ ok: true, result: outcome.result });
}
