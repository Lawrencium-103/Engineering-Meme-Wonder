import { NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { events, guests } from "@/db/schema";
import { getSessionAccount } from "@/lib/auth";
import { rateLimit, clientIp } from "@/lib/rate-limit";

/**
 * Gate check-in. Owner-only for now (planner PIN links come with the planner
 * tier). Accepts a guest id, guest code, or publicToken (from the QR scan).
 * Idempotent: checking in an already-checked-in guest is a no-op that returns
 * the current state, so double-taps and two gate staff can't corrupt counts.
 *
 * POST body: { guestId? | guestCode? | token?, undo?: boolean }
 */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const ip = clientIp(req);
  if (!rateLimit(`gate:${ip}`, 120, 60 * 1000).ok) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const session = await getSessionAccount();
  if (!session) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "Invalid event." }, { status: 400 });
  }

  const [event] = await db
    .select({ id: events.id })
    .from(events)
    .where(and(eq(events.id, id), eq(events.ownerId, session.id)))
    .limit(1);
  if (!event) {
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }

  let json: { guestId?: string; guestCode?: string; token?: string; undo?: boolean };
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  // Resolve the guest by whichever identifier was provided.
  let where;
  if (json.guestId && /^[0-9a-f-]{36}$/i.test(json.guestId)) {
    where = and(eq(guests.id, json.guestId), eq(guests.eventId, id));
  } else if (json.guestCode && json.guestCode.trim()) {
    // Case-insensitive exact match; tolerate stray spaces.
    const code = json.guestCode.trim().toUpperCase();
    where = and(sql`upper(replace(${guests.guestCode}, ' ', '')) = ${code}`, eq(guests.eventId, id));
  } else if (json.token && /^[0-9a-f]{32}$/i.test(json.token)) {
    where = and(eq(guests.publicToken, json.token), eq(guests.eventId, id));
  } else {
    return NextResponse.json({ error: "Provide a guest ID, code, or token." }, { status: 400 });
  }

  const [guest] = await db
    .select({
      id: guests.id,
      guestCode: guests.guestCode,
      firstName: guests.firstName,
      lastName: guests.lastName,
      side: guests.side,
      partySize: guests.partySize,
      dietary: guests.dietary,
      checkedInAt: guests.checkedInAt,
    })
    .from(guests)
    .where(where)
    .limit(1);

  if (!guest) {
    return NextResponse.json({ error: "Guest not found." }, { status: 404 });
  }

  // Toggle: undo clears the timestamp, otherwise set it if not already set.
  let updated;
  if (json.undo) {
    [updated] = await db
      .update(guests)
      .set({ checkedInAt: null })
      .where(and(eq(guests.id, guest.id), sql`${guests.checkedInAt} is not null`))
      .returning({ checkedInAt: guests.checkedInAt });
  } else {
    [updated] = await db
      .update(guests)
      .set({ checkedInAt: new Date() })
      .where(and(eq(guests.id, guest.id), sql`${guests.checkedInAt} is null`))
      .returning({ checkedInAt: guests.checkedInAt });
  }

  // Live counts after the write (or the current state if it was a no-op).
  const [counts] = await db
    .select({
      totalPeople: sql<number>`coalesce(sum(${guests.partySize}), 0)::int`,
      checkedInPeople: sql<number>`coalesce(sum(${guests.partySize}) filter (where ${guests.checkedInAt} is not null), 0)::int`,
      totalRsvps: sql<number>`count(*)::int`,
      checkedInRsvps: sql<number>`count(*) filter (where ${guests.checkedInAt} is not null)::int`,
    })
    .from(guests)
    .where(eq(guests.eventId, id));

  return NextResponse.json({
    ok: true,
    // If the conditional update matched 0 rows the guest was already in the
    // requested state — report the state they are in now.
    checkedIn: json.undo ? false : (updated?.checkedInAt ?? guest.checkedInAt) !== null,
    alreadyInState: updated === undefined,
    guest: {
      ...guest,
      checkedInAt: (updated?.checkedInAt ?? guest.checkedInAt)?.toISOString() ?? null,
    },
    counts,
  });
}
