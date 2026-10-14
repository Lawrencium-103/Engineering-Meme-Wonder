import { NextResponse } from "next/server";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { events, guests } from "@/db/schema";
import { getSessionAccount } from "@/lib/auth";
import { rateLimit, clientIp } from "@/lib/rate-limit";

/** CSV escape: quote when needed, double internal quotes. */
function csvField(v: string | null | undefined): string {
  const s = (v ?? "").toString();
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** Owner-only CSV export of the guest list (spec §4.6, §9). */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const ip = clientIp(req);
  if (!rateLimit(`csv:${ip}`, 10, 60 * 1000).ok) {
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
    .select({ id: events.id, slug: events.slug })
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
      email: guests.email,
      phone: guests.phone,
      dietary: guests.dietary,
      partySize: guests.partySize,
      checkedInAt: guests.checkedInAt,
      createdAt: guests.createdAt,
    })
    .from(guests)
    .where(eq(guests.eventId, id))
    .orderBy(asc(guests.side), asc(guests.seq));

  const header = [
    "Guest ID",
    "Side",
    "First Name",
    "Last Name",
    "Email",
    "Phone",
    "Dietary Note",
    "Party Size",
    "Checked In",
    "RSVP Date",
  ];
  const lines = [header.join(",")];
  for (const r of rows) {
    lines.push(
      [
        r.guestCode,
        r.side,
        csvField(r.firstName),
        csvField(r.lastName),
        csvField(r.email),
        csvField(r.phone),
        csvField(r.dietary),
        r.partySize,
        r.checkedInAt ? "YES" : "NO",
        r.createdAt.toISOString(),
      ].join(","),
    );
  }

  const filename = `guests-${event.slug ?? id}.csv`;
  return new NextResponse("\uFEFF" + lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
