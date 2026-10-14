import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { events, guests } from "@/db/schema";
import { getSessionAccount } from "@/lib/auth";
import { rateLimit, clientIp } from "@/lib/rate-limit";

/**
 * Delete a guest record (NDPA right-to-erasure). Owner-only. Hard delete —
 * the guest's pass URL becomes invalid and their seq is NOT reused
 * (numbering must never have gaps or duplicate IDs, per spec §6).
 */
export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ id: string; guestId: string }> },
) {
  const ip = clientIp(req);
  if (!rateLimit(`guest-delete:${ip}`, 30, 60 * 1000).ok) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const session = await getSessionAccount();
  if (!session) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  const { id, guestId } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id) || !/^[0-9a-f-]{36}$/i.test(guestId)) {
    return NextResponse.json({ error: "Invalid identifiers." }, { status: 400 });
  }

  // Ownership check.
  const [event] = await db
    .select({ id: events.id })
    .from(events)
    .where(and(eq(events.id, id), eq(events.ownerId, session.id)))
    .limit(1);
  if (!event) {
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }

  const deleted = await db
    .delete(guests)
    .where(and(eq(guests.id, guestId), eq(guests.eventId, id)))
    .returning({ id: guests.id });

  if (deleted.length === 0) {
    return NextResponse.json({ error: "Guest not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
