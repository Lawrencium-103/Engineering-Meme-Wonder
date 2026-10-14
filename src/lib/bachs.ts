import { createHmac, timingSafeEqual } from "crypto";
import { NGN } from "./pricing";

/**
 * Bachs helper (NGN only at launch). Hosted checkout via checkout sessions;
 * the webhook (collection.succeeded) is the single source of truth — we never
 * trust client redirects.
 *
 * Money is always a decimal string at currency precision ("15000.00"), never
 * minor units. Internally we keep kobo integers and convert at the boundary.
 */

function baseUrl(): string {
  if (process.env.BACHS_BASE_URL) return process.env.BACHS_BASE_URL.replace(/\/$/, "");
  const key = process.env.BACHS_SECRET_KEY ?? "";
  return key.startsWith("sk_sandbox_") ? "https://sandbox-api.bachs.io" : "https://api.bachs.io";
}

function secretKey(): string {
  const key = process.env.BACHS_SECRET_KEY;
  if (!key) throw new Error("BACHS_SECRET_KEY is not configured");
  return key;
}

export function bachsConfigured(): boolean {
  return Boolean(process.env.BACHS_SECRET_KEY);
}

/** Kobo integer → decimal string at NGN precision ("1500000" → "15000.00"). */
export function koboToDecimal(amountMinor: number): string {
  const sign = amountMinor < 0 ? "-" : "";
  const abs = Math.abs(Math.round(amountMinor));
  const whole = Math.floor(abs / 100);
  const frac = String(abs % 100).padStart(2, "0");
  return `${sign}${whole}.${frac}`;
}

/** Decimal string at NGN precision → kobo integer ("15000.00" → 1500000). */
export function decimalToKobo(amount: string): number {
  const n = Number(amount);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

export interface CheckoutSession {
  checkoutId: string;
  checkoutUrl: string;
}

export async function createCheckoutSession(params: {
  email: string;
  name?: string;
  amountMinor: number;
  reference: string;
  metadata: Record<string, string>;
  successUrl?: string;
  cancelUrl?: string;
}): Promise<CheckoutSession> {
  const body: Record<string, unknown> = {
    pricing: { currency: NGN, amount: koboToDecimal(params.amountMinor) },
    customer: params.name
      ? { email: params.email, name: params.name }
      : { email: params.email },
    reference: params.reference,
    metadata: params.metadata,
  };
  // Bachs refuses localhost / private URLs for redirects, even in sandbox —
  // omit them when running locally so checkout still opens.
  if (params.successUrl) body.success_url = params.successUrl;
  if (params.cancelUrl) body.cancel_url = params.cancelUrl;

  const res = await fetch(`${baseUrl()}/v1/checkout-sessions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey()}`,
      "Content-Type": "application/json",
      "Idempotency-Key": params.reference,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    console.error("bachs checkout session failed", res.status);
    throw new Error("Could not start payment");
  }
  const data = (await res.json()) as { checkout_id: string; checkout_url: string };
  return { checkoutId: data.checkout_id, checkoutUrl: data.checkout_url };
}

/**
 * Verify an X-Bachs-Signature-V2 (preferred) or legacy X-Bachs-Signature
 * delivery against the raw body. HMAC-SHA256 of "{timestamp}.{rawBody}" using
 * the per-endpoint signing secret (NOT the API key). Rejects stale timestamps
 * outside the tolerance and compares signatures timing-safely.
 */
export function verifyBachsSignature({
  rawBody,
  signatureV2,
  signatureV1,
  timestamp,
  secret,
  toleranceSeconds = 300,
}: {
  rawBody: string;
  signatureV2: string | null;
  signatureV1: string | null;
  timestamp: string | null;
  secret: string;
  toleranceSeconds?: number;
}): boolean {
  const ts = Number(signatureV2?.match(/t=(\d+)/)?.[1] ?? timestamp ?? NaN);
  if (!Number.isFinite(ts)) return false;
  if (Math.abs(Math.floor(Date.now() / 1000) - ts) > toleranceSeconds) return false;

  const expected = createHmac("sha256", secret).update(`${ts}.${rawBody}`).digest("hex");
  const candidates = signatureV2
    ? [...signatureV2.matchAll(/v1=([0-9a-f]+)/g)].map((m) => m[1])
    : signatureV1
      ? [signatureV1]
      : [];
  if (candidates.length === 0) return false;

  const expBuf = Buffer.from(expected, "utf8");
  return candidates.some((cand) => {
    const candBuf = Buffer.from(cand, "utf8");
    return candBuf.length === expBuf.length && timingSafeEqual(candBuf, expBuf);
  });
}
