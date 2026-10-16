import { createHmac, timingSafeEqual } from "crypto";

/**
 * Paystack helper (NGN only). Hosted checkout via /transaction/initialize;
 * the webhook (charge.success) is the single source of truth — we never
 * trust the browser redirect. Local dev cannot receive webhooks (localhost
 * is unreachable from Paystack), so a dev-only route confirms via the
 * server-to-server verify endpoint instead.
 *
 * Amounts are integer kobo everywhere (Paystack's native format).
 */

const BASE_URL = "https://api.paystack.co";

function secretKey(): string {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) throw new Error("PAYSTACK_SECRET_KEY is not configured");
  return key;
}

export function paystackConfigured(): boolean {
  return Boolean(process.env.PAYSTACK_SECRET_KEY);
}

export interface PaystackInitResult {
  checkoutUrl: string;
  accessCode: string;
  reference: string;
}

export async function initializeTransaction(params: {
  email: string;
  amountMinor: number;
  reference: string;
  currency?: string;
  callbackUrl?: string;
  metadata?: Record<string, string>;
}): Promise<PaystackInitResult> {
  const body: Record<string, unknown> = {
    email: params.email,
    amount: Math.round(params.amountMinor),
    reference: params.reference,
    currency: params.currency ?? "NGN",
    metadata: params.metadata ?? {},
  };
  if (params.callbackUrl) body.callback_url = params.callbackUrl;

  const res = await fetch(`${BASE_URL}/transaction/initialize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as {
    status?: boolean;
    message?: string;
    data?: { authorization_url?: string; access_code?: string; reference?: string };
  };
  if (!res.ok || !json.status || !json.data?.authorization_url) {
    console.error("paystack initialize failed", res.status, json.message);
    throw new Error("Could not start payment");
  }
  return {
    checkoutUrl: json.data.authorization_url,
    accessCode: json.data.access_code ?? "",
    reference: json.data.reference ?? params.reference,
  };
}

/**
 * Verify an X-Paystack-Signature delivery: hex HMAC-SHA512 of the raw body
 * using the secret key (Paystack has no separate webhook secret). Compared
 * timing-safely.
 */
export function verifyPaystackSignature({
  rawBody,
  signature,
  secret,
}: {
  rawBody: string;
  signature: string | null;
  secret: string;
}): boolean {
  if (!signature) return false;
  const expected = createHmac("sha512", secret).update(rawBody).digest("hex");
  const expBuf = Buffer.from(expected, "utf8");
  const sigBuf = Buffer.from(signature, "utf8");
  return expBuf.length === sigBuf.length && timingSafeEqual(expBuf, sigBuf);
}

export interface VerifiedTransaction {
  reference: string;
  amountMinor: number;
  currency: string;
  status: string;
  /** Metadata we attached at initialize; Paystack may coerce numeric strings to numbers. */
  metadata: { eventId?: string; tier?: string; cap?: string };
}

/** GET /transaction/verify/:reference — server-to-server, Paystack-confirmed. */
export async function fetchTransaction(reference: string): Promise<VerifiedTransaction | null> {
  const res = await fetch(`${BASE_URL}/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${secretKey()}` },
    cache: "no-store",
  });
  const json = (await res.json()) as {
    status?: boolean;
    data?: {
      reference?: string;
      amount?: number | string;
      currency?: string;
      status?: string;
      metadata?: Record<string, unknown>;
    };
  };
  if (!res.ok || !json.status || !json.data) return null;
  const meta = json.data.metadata ?? {};
  return {
    reference: json.data.reference ?? reference,
    amountMinor: Number(json.data.amount ?? 0),
    currency: json.data.currency ?? "NGN",
    status: json.data.status ?? "",
    metadata: {
      eventId: meta.eventId != null ? String(meta.eventId) : undefined,
      tier: meta.tier != null ? String(meta.tier) : undefined,
      cap: meta.cap != null ? String(meta.cap) : undefined,
    },
  };
}
