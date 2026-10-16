import { NextResponse, type NextRequest } from "next/server";
import { appUrl } from "@/lib/auth";
import { sendReceiptEmail } from "@/lib/email";
import { formatNaira, tierLabel } from "@/lib/pricing";
import { paystackConfigured, fetchTransaction } from "@/lib/paystack";
import { fulfilPayment } from "@/lib/payments-fulfil";
import { rateLimit, clientIp } from "@/lib/rate-limit";

/**
 * DEV-ONLY payment confirmation. 404s in production.
 *
 * Local dev can't receive Paystack's server-to-server webhook (localhost is
 * unreachable), so after the checkout redirect the dashboard calls this with
 * ?ref=… . The payment is confirmed against Paystack's verify endpoint —
 * server-to-server, still Paystack-confirmed, never trusts the browser — and
 * then fulfilled with the exact same logic as the webhook.
 */
export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const ip = clientIp(req);
  if (!rateLimit(`dev-verify:${ip}`, 20, 10 * 60 * 1000).ok) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }
  if (!paystackConfigured()) {
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  const reference = req.nextUrl.searchParams.get("ref") ?? "";
  if (!reference) {
    return NextResponse.json({ error: "Missing ref" }, { status: 400 });
  }

  const tx = await fetchTransaction(reference);
  if (!tx) {
    return NextResponse.json({ ok: false, result: "not-found" });
  }
  if (tx.status !== "success") {
    return NextResponse.json({ ok: true, result: tx.status });
  }
  if (tx.currency !== "NGN") {
    return NextResponse.json({ ok: true, result: "currency" });
  }

  const outcome = await fulfilPayment({
    providerRef: tx.reference,
    eventId: tx.metadata.eventId ?? "",
    amountMinor: tx.amountMinor,
    currency: tx.currency,
    tier: tx.metadata.tier,
    cap: tx.metadata.cap != null ? Number(tx.metadata.cap) : undefined,
  });

  if (outcome.result === "failed") {
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
  if (outcome.result === "unknown-event") {
    return NextResponse.json({ ok: true, ignored: "unknown event id" });
  }

  if (outcome.result === "recorded") {
    const publicUrl = `${appUrl()}/w/${outcome.slug}`;
    try {
      await sendReceiptEmail(
        outcome.email,
        publicUrl,
        tierLabel(outcome.tier),
        formatNaira(tx.amountMinor),
      );
    } catch {
      console.error("receipt email failed");
    }
  }

  return NextResponse.json({ ok: true, result: outcome.result });
}
