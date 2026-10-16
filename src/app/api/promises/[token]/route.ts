import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { giftPromises, guests } from "@/db/schema";
import { rateLimit, clientIp } from "@/lib/rate-limit";

/** A guest's own promise (for prefill / showing they already submitted). */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  const ip = clientIp(req);
  if (!rateLimit(`promise-get:${ip}`, 30, 60 * 1000).ok) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }
  const { token } = await ctx.params;
  if (!/^[0-9a-f]{32}$/.test(token)) {
    return NextResponse.json({ error: "Invalid token." }, { status: 400 });
  }

  const rows = await db
    .select({ items: giftPromises.items, updatedAt: giftPromises.updatedAt })
    .from(giftPromises)
    .innerJoin(guests, eq(giftPromises.guestId, guests.id))
    .where(eq(guests.publicToken, token))
    .limit(1);

  const row = rows[0];
  return NextResponse.json(
    { promise: row ? { items: row.items, updatedAt: row.updatedAt.toISOString() } : null },
    { headers: { "Cache-Control": "no-store" } },
  );
}
