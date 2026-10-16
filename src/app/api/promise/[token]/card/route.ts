import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { events, giftPromises, guests } from "@/db/schema";
import { renderPromiseCard } from "@/lib/promise-card";
import { rateLimit, clientIp } from "@/lib/rate-limit";

/**
 * Gift-promise card PNG, rendered on the fly (never stored — the guest can
 * edit their promise). Downloaded from the thank-you screen as image two of
 * two, alongside the access pass.
 */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  const ip = clientIp(req);
  if (!rateLimit(`promise-card:${ip}`, 10, 60 * 1000).ok) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }
  const { token } = await ctx.params;
  if (!/^[0-9a-f]{32}$/.test(token)) {
    return NextResponse.json({ error: "Invalid token." }, { status: 400 });
  }

  const [guest] = await db
    .select({
      id: guests.id,
      firstName: guests.firstName,
      lastName: guests.lastName,
      guestCode: guests.guestCode,
      eventId: guests.eventId,
    })
    .from(guests)
    .where(eq(guests.publicToken, token))
    .limit(1);
  if (!guest) {
    return NextResponse.json({ error: "Guest not found." }, { status: 404 });
  }

  const [promise] = await db
    .select({ items: giftPromises.items })
    .from(giftPromises)
    .where(eq(giftPromises.guestId, guest.id))
    .limit(1);
  if (!promise) {
    return NextResponse.json({ error: "No promise yet." }, { status: 404 });
  }

  const [event] = await db
    .select()
    .from(events)
    .where(eq(events.id, guest.eventId))
    .limit(1);
  if (!event) {
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }

  const png = await renderPromiseCard({
    monogram: event.monogram,
    groomName: event.groomName,
    brideName: event.brideName,
    weddingDate: new Date(event.weddingDate),
    theme: event.theme ?? { primary: "#D4AF37", accent: "#E8D3C4" },
    templateId: event.flyer?.templateId,
    guestFirstName: guest.firstName,
    guestLastName: guest.lastName,
    guestCode: guest.guestCode,
    items: promise.items,
  });

  return new NextResponse(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `attachment; filename="Aravow-Promise-${guest.guestCode}.png"`,
      "Cache-Control": "no-store",
    },
  });
}
