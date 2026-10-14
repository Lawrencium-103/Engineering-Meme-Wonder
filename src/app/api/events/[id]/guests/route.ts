import { NextResponse } from "next/server";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { events, guests } from "@/db/schema";
import { getSessionAccount } from "@/lib/auth";
import { rateLimit, clientIp } from "@/lib/rate-limit";

/**
 * Guest list for an event. Owner-only (spec §9: only the event owner may read
 * guest data). Returns a capped page; the client can request more.
 */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const ip = clientIp(req);
  if (!rateLimit(`guests:${ip}`, 60, 60 * 1000).ok) {
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

  // Ownership check.
  const [event] = await db
    .select({ id: events.id, guestCap: events.guestCap, status: events.status })
    .from(events)
    .where(and(eq(events.id, id), eq(events.ownerId, session.id)))
    .limit(1);
  if (!event) {
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }

  const url = new URL(req.url);
  const offset = Math.max(0, Math.min(10000, Number(url.searchParams.get("offset") ?? 0) || 0));
  const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit") ?? 100) || 100));

  const rows = await db
    .select({
      id: guests.id,
      side: guests.side,
      guestCode: guests.guestCode,
      firstName: guests.firstName,
      lastName: guests.lastName,
      email: guests.email,
      phone: guests.phone,
      dietary: guests.dietary,
      partySize: guests.partySize,
      checkedInAt: guests.checkedInAt,
      createdAt: guests.createdAt,
    })
    .from(guests)
    .where(eq(guests.eventId, id))
    .orderBy(desc(guests.createdAt))
    .offset(offset)
    .limit(limit);

  const [counts] = await db
    .select({
      total: sql<number>`count(*)::int`,
      totalPeople: sql<number>`coalesce(sum(${guests.partySize}), 0)::int`,
      totalCheckedIn: sql<number>`count(*) filter (where ${guests.checkedInAt} is not null)::int`,
    })
    .from(guests)
    .where(eq(guests.eventId, id));

  const bySide = await db
    .select({
      side: guests.side,
      rsvps: sql<number>`count(*)::int`,
      people: sql<number>`coalesce(sum(${guests.partySize}), 0)::int`,
    })
    .from(guests)
    .where(eq(guests.eventId, id))
    .groupBy(guests.side);

  const groom = bySide.find((r) => r.side === "GROOM");
  const bride = bySide.find((r) => r.side === "BRIDE");

  return NextResponse.json({
    guests: rows,
    total: counts.total,
    totalPeople: counts.totalPeople,
    totalCheckedIn: counts.totalCheckedIn,
    groomPeople: groom?.people ?? 0,
    bridePeople: bride?.people ?? 0,
    groomRsvps: groom?.rsvps ?? 0,
    brideRsvps: bride?.rsvps ?? 0,
    guestCap: event.guestCap,
    status: event.status,
  });
}
