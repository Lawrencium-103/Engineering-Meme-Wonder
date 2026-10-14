import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { guests } from "@/db/schema";
import { rateLimit, clientIp } from "@/lib/rate-limit";

/**
 * Pass lookup by public token (the QR target: /p/{token}).
 * Rate limited. Returns pass image URL + display code when ready.
 */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  const ip = clientIp(req);
  if (!rateLimit(`pass:${ip}`, 30, 60 * 1000).ok) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }
  const { token } = await ctx.params;
  if (!/^[0-9a-f]{32}$/.test(token)) {
    return NextResponse.json({ error: "Invalid pass." }, { status: 400 });
  }

  const [guest] = await db
    .select({
      guestCode: guests.guestCode,
      passImageUrl: guests.passImageUrl,
    })
    .from(guests)
    .where(eq(guests.publicToken, token))
    .limit(1);

  if (!guest) {
    return NextResponse.json({ error: "Pass not found." }, { status: 404 });
  }

  return NextResponse.json(
    {
      guestCode: guest.guestCode,
      passImageUrl: guest.passImageUrl, // null while generating
      ready: Boolean(guest.passImageUrl),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
