import { NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { accounts, events, guests } from "@/db/schema";
import { rsvpSchema, registerGuest, CapReachedError, verifyTurnstile } from "@/lib/guests";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { sendCapReachedEmail } from "@/lib/email";
import { generateAndStorePass } from "@/lib/pass-job";

/**
 * Public RSVP endpoint. Rate limited + Turnstile protected. Duplicate emails
 * are NOT rejected and list membership is never revealed.
 */
export async function POST(req: Request) {
  const ip = clientIp(req);
  if (!rateLimit(`rsvp:${ip}`, 5, 60 * 60 * 1000).ok) {
    return NextResponse.json(
      { error: "Too many attempts. Please try again later." },
      { status: 429, headers: { "Retry-After": "3600" } },
    );
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = rsvpSchema.safeParse(json);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json({ error: first?.message ?? "Invalid input." }, { status: 400 });
  }

  const slug = new URL(req.url).searchParams.get("slug") ?? "";
  if (!/^[a-z0-9-]{1,60}$/.test(slug)) {
    return NextResponse.json({ error: "Invalid wedding." }, { status: 400 });
  }

  const [event] = await db
    .select({
      id: events.id,
      ownerId: events.ownerId,
      guestCap: events.guestCap,
    })
    .from(events)
    .where(and(eq(events.slug, slug), eq(events.status, "PUBLISHED")))
    .limit(1);

  // Never reveal whether a wedding exists before Turnstile passes.
  const human = await verifyTurnstile(parsed.data.turnstileToken, ip);
  if (!event) {
    return NextResponse.json({ error: "This wedding page is not available." }, { status: 404 });
  }
  if (!human) {
    return NextResponse.json({ error: "Verification failed. Please try again." }, { status: 400 });
  }

  // Pre-check for fast 409 (the authoritative check is inside the transaction).
  // The cap counts PEOPLE (sum of party sizes), not RSVP rows.
  const [{ totalPeople }] = await db
    .select({ totalPeople: sql<number>`coalesce(sum(${guests.partySize}), 0)::int` })
    .from(guests)
    .where(eq(guests.eventId, event.id));
  if (totalPeople + parsed.data.partySize > event.guestCap) {
    void notifyCoupleCapReached(event.id, event.ownerId, slug);
    return NextResponse.json({ error: "RSVPs are full for this wedding." }, { status: 409 });
  }

  try {
    const guest = await registerGuest(event.id, parsed.data);
    // Fire-and-forget: generate + upload the pass PNG after commit.
    void generateAndStorePass(guest.id);
    return NextResponse.json({
      ok: true,
      guestCode: guest.guestCode,
      publicToken: guest.publicToken,
    });
  } catch (err) {
    if (err instanceof CapReachedError) {
      void notifyCoupleCapReached(event.id, event.ownerId, slug);
      return NextResponse.json({ error: "RSVPs are full for this wedding." }, { status: 409 });
    }
    console.error("rsvp failed");
    return NextResponse.json({ error: "Could not complete your RSVP. Please try again." }, { status: 500 });
  }
}

async function notifyCoupleCapReached(eventId: string, ownerId: string, slug: string) {
  try {
    const [owner] = await db
      .select({ email: accounts.email })
      .from(accounts)
      .where(eq(accounts.id, ownerId))
      .limit(1);
    if (owner) {
      await sendCapReachedEmail(owner.email, slug);
    }
  } catch {
    console.error("cap email failed");
  }
}
