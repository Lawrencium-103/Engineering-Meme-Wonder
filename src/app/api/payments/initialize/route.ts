import { NextResponse } from "next/server";
import { z } from "zod";
import { and, desc, eq, sum } from "drizzle-orm";
import { db } from "@/db";
import { events, payments } from "@/db/schema";
import { getSessionAccount, appUrl } from "@/lib/auth";
import { createCheckoutSession, bachsConfigured } from "@/lib/bachs";
import { upgradeAmountMinor, type TierId } from "@/lib/pricing";
import { rateLimit, clientIp } from "@/lib/rate-limit";

// Paid tiers only — FREE publishes without a checkout (see /publish-free).
const bodySchema = z.object({
  eventId: z.string().uuid(),
  tier: z.enum(["CLASSIC", "GRAND", "EPIC"]),
});

/** Bachs refuses localhost/private redirect URLs, so detect them to omit. */
function isLocalhost(url: string): boolean {
  try {
    const h = new URL(url).hostname;
    return h === "localhost" || h === "127.0.0.1" || h === "::1" || h === "[::1]";
  } catch {
    return true;
  }
}

export async function POST(req: Request) {
  const ip = clientIp(req);
  if (!rateLimit(`pay:${ip}`, 10, 10 * 60 * 1000).ok) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }
  if (!bachsConfigured()) {
    return NextResponse.json({ error: "Payments are not configured." }, { status: 500 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }
  const { eventId, tier } = parsed.data;

  const session = await getSessionAccount();
  if (!session) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  // Ownership check.
  const [event] = await db
    .select()
    .from(events)
    .where(and(eq(events.id, eventId), eq(events.ownerId, session.id)))
    .limit(1);
  if (!event) {
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }
  if (event.status === "ARCHIVED") {
    return NextResponse.json({ error: "This event is archived." }, { status: 400 });
  }

  const effectiveTier: TierId = tier;

  // Already paid so far (for upgrade difference pricing).
  const [{ total }] = await db
    .select({ total: sum(payments.amountMinor) })
    .from(payments)
    .where(and(eq(payments.eventId, eventId), eq(payments.status, "SUCCESS")));
  const paidSoFar = Number(total ?? 0);

  const { cap, amountMinor, isUpgrade } = upgradeAmountMinor(effectiveTier, paidSoFar);

  if (amountMinor <= 0) {
    return NextResponse.json(
      { error: "Nothing to pay — your tier already covers this." },
      { status: 400 },
    );
  }

  // Human-readable unique reference; also our idempotency key at the webhook.
  const reference = `AV-${event.id.slice(0, 8)}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;

  try {
    const checkout = await createCheckoutSession({
      email: session.email,
      amountMinor,
      reference,
      metadata: {
        eventId,
        tier: effectiveTier,
        cap: String(cap),
        isUpgrade: String(isUpgrade),
      },
      // Bachs refuses localhost/private URLs, so omit when running locally.
      successUrl: isLocalhost(appUrl())
        ? undefined
        : `${appUrl()}/dashboard?ref=${encodeURIComponent(reference)}`,
      cancelUrl: isLocalhost(appUrl()) ? undefined : `${appUrl()}/dashboard`,
    });

    // Move DRAFT events to PENDING_PAYMENT so the dashboard reflects intent.
    if (event.status === "DRAFT") {
      await db
        .update(events)
        .set({ status: "PENDING_PAYMENT", tier: effectiveTier, guestCap: cap })
        .where(eq(events.id, eventId));
    }

    return NextResponse.json({ checkoutUrl: checkout.checkoutUrl, reference, amountMinor });
  } catch {
    console.error("payment init error");
    return NextResponse.json({ error: "Could not start payment." }, { status: 502 });
  }
}
