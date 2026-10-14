import { NextResponse } from "next/server";
import { and, eq, or, sql, ilike } from "drizzle-orm";
import { db } from "@/db";
import { events, guests } from "@/db/schema";
import { getSessionAccount } from "@/lib/auth";
import { rateLimit, clientIp } from "@/lib/rate-limit";

/**
 * Gate lookup. Owner-only. Supports:
 *   ?q=name-or-code   fuzzy search on name / phone / email / guest code
 *   ?token=hex32      exact lookup by publicToken (from a QR scan of the pass)
 * Returns minimal fields needed at the gate plus live counts.
 */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const ip = clientIp(req);
  if (!rateLimit(`gate-lookup:${ip}`, 120, 60 * 1000).ok) {
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

  const url = new URL(req.url);
  const token = url.searchParams.get("token")?.trim();
  const q = url.searchParams.get("q")?.trim();

  const fields = {
    id: guests.id,
    guestCode: guests.guestCode,
    firstName: guests.firstName,
    lastName: guests.lastName,
    side: guests.side,
    partySize: guests.partySize,
    dietary: guests.dietary,
    checkedInAt: guests.checkedInAt,
  };

  type GateGuestRow = {
    id: string;
    guestCode: string;
    firstName: string;
    lastName: string;
    side: "GROOM" | "BRIDE";
    partySize: number;
    dietary: string | null;
    checkedInAt: Date | null;
  };

  let rows: GateGuestRow[] = [];
  if (token && /^[0-9a-f]{32}$/i.test(token)) {
    rows = await db
      .select(fields)
      .from(guests)
      .where(and(eq(guests.publicToken, token), eq(guests.eventId, id)))
      .limit(1);
  } else if (q && q.length >= 1) {
    // If it looks like a guest code (contains a dash), try exact code match
    // first, then fall back to fuzzy name/phone search.
    const like = `%${q.replace(/[%_]/g, "")}%`;
    rows = await db
      .select(fields)
      .from(guests)
      .where(
        and(
          eq(guests.eventId, id),
          or(
            ilike(guests.guestCode, like),
            ilike(guests.firstName, like),
            ilike(guests.lastName, like),
            sql`(${guests.firstName} || ' ' || ${guests.lastName}) ILIKE ${like}`,
            ilike(sql`coalesce(${guests.phone}, '')`, like),
            ilike(sql`coalesce(${guests.email}, '')`, like),
          ),
        ),
      )
      .limit(20);
  } else {
    rows = [];
  }

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
    guests: rows.map((g) => ({
      ...g,
      checkedInAt: g.checkedInAt?.toISOString() ?? null,
    })),
    counts,
  });
}
