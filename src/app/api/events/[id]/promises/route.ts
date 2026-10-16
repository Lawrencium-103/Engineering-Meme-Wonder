import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { events, giftPromises, guests } from "@/db/schema";
import { getSessionAccount } from "@/lib/auth";
import { totalCashMinor } from "@/lib/promises";
import { rateLimit, clientIp } from "@/lib/rate-limit";

/** Owner-only list of gift promises for an event. */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const ip = clientIp(req);
  if (!rateLimit(`promises:${ip}`, 30, 60 * 1000).ok) {
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

  const rows = await db
    .select({
      guestCode: guests.guestCode,
      side: guests.side,
      firstName: guests.firstName,
      lastName: guests.lastName,
      items: giftPromises.items,
      updatedAt: giftPromises.updatedAt,
    })
    .from(giftPromises)
    .innerJoin(guests, eq(giftPromises.guestId, guests.id))
    .where(eq(giftPromises.eventId, id))
    .orderBy(desc(giftPromises.updatedAt));

  return NextResponse.json(
    {
      count: rows.length,
      totalCashMinor: rows.reduce((sum, r) => sum + totalCashMinor(r.items), 0),
      promises: rows.map((r) => ({
        guestCode: r.guestCode,
        side: r.side,
        name: `${r.firstName} ${r.lastName}`,
        items: r.items,
        updatedAt: r.updatedAt.toISOString(),
      })),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
