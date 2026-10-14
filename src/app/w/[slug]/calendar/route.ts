import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { ceremonies, events } from "@/db/schema";
import { zonedTimeToUtc } from "@/lib/time";
import { rateLimit, clientIp } from "@/lib/rate-limit";

/**
 * GET /w/[slug]/calendar — .ics file built from the reception start time in
 * the event's timezone. Download-only; no PII.
 */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  const ip = clientIp(req);
  if (!rateLimit(`ics:${ip}`, 30, 60 * 1000).ok) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const { slug } = await ctx.params;
  const [event] = await db
    .select()
    .from(events)
    .where(and(eq(events.slug, slug), eq(events.status, "PUBLISHED")))
    .limit(1);
  if (!event) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const rows = await db.select().from(ceremonies).where(eq(ceremonies.eventId, event.id));
  const reception = rows.find((c) => c.kind === "RECEPTION");
  if (!reception) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Build the local wall-clock string in the event timezone, then format as UTC.
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: event.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(reception.startsAt);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  const hour = get("hour") === "24" ? "00" : get("hour");
  const local = `${get("year")}-${get("month")}-${get("day")}T${hour}:${get("minute")}`;
  const startUtc = zonedTimeToUtc(local, event.timezone);

  function ics(d: Date): string {
    return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  }
  // 3-hour event block.
  const end = new Date(startUtc.getTime() + 3 * 60 * 60 * 1000);
  const stamp = new Date();

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Aravow//Wedding Invitation//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${event.id}@aravow.com`,
    `DTSTAMP:${ics(stamp)}`,
    `DTSTART:${ics(startUtc)}`,
    `DTEND:${ics(end)}`,
    `SUMMARY:Wedding of ${event.groomName} & ${event.brideName}`,
    `LOCATION:${reception.venueName}${reception.address ? `, ${reception.address}` : ""}`,
    `DESCRIPTION:Join us to celebrate! Details: ${process.env.APP_URL ?? ""}/w/${slug}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return new NextResponse(lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="wedding-${slug}.ics"`,
      "Cache-Control": "no-store",
    },
  });
}
