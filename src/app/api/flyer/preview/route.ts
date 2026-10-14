import { NextResponse } from "next/server";
import { z } from "zod";
import { getTemplate } from "@/lib/flyer/catalog";
import { renderFlyer } from "@/lib/flyer/render";
import type { CeremonyKind, FlyerData } from "@/lib/flyer/types";
import { rateLimit, clientIp } from "@/lib/rate-limit";

/**
 * Live flyer preview: render the REAL card from the Studio's current draft
 * without saving. The couple sees the design update as they change template
 * or colours, instead of round-tripping through /preview after a save.
 *
 * The render engine (satori + resvg + fs) cannot bundle client-side, so the
 * Studio posts its draft here and gets a PNG data-URI back. Content is the
 * in-memory draft — nothing is written to the DB.
 */

const CEREMONY_KINDS = ["TRADITIONAL", "COURT", "RELIGIOUS", "RECEPTION"] as const;

const bodySchema = z.object({
  templateId: z.string().min(1),
  monogram: z.string().max(24).default(""),
  hashtag: z.string().max(80).optional(),
  groomName: z.string().max(80).default("Groom"),
  brideName: z.string().max(80).default("Bride"),
  timezone: z.string().max(64).default("Africa/Lagos"),
  heroImageUrl: z.string().max(2048).nullable().optional(),
  theme: z.object({ primary: z.string(), accent: z.string() }),
  flyer: z.object({
    families: z
      .object({
        introLine: z.string().max(160).optional(),
        brideParents: z.string().max(160).optional(),
        groomParents: z.string().max(160).optional(),
      })
      .optional(),
    invitationMessage: z.string().max(400).optional(),
    palette: z.array(z.object({ label: z.string().max(40), hex: z.string() })).max(6).optional(),
    scripture: z.string().max(400).optional(),
    closingMessage: z.string().max(160).optional(),
    rsvpContacts: z.array(z.object({ name: z.string().max(80), phone: z.string().max(40) })).max(6).optional(),
    nameFont: z.string().max(40).optional(),
  }),
  ceremonies: z
    .array(
      z.object({
        kind: z.enum(CEREMONY_KINDS),
        title: z.string().max(80).optional(),
        venueName: z.string().max(160).default("Venue"),
        startsAt: z.string(), // ISO instant
      }),
    )
    .max(8)
    .optional(),
});

function fmtTime(iso: string, tz: string): string {
  try {
    return new Intl.DateTimeFormat("en-NG", { timeZone: tz, hour: "numeric", minute: "2-digit", hour12: true }).format(
      new Date(iso),
    );
  } catch {
    return "";
  }
}

function fmtDate(iso: string, tz: string): string {
  try {
    return new Intl.DateTimeFormat("en-NG", { timeZone: tz, day: "numeric", month: "short", year: "numeric" }).format(
      new Date(iso),
    );
  } catch {
    return "";
  }
}

export async function POST(req: Request) {
  const ip = clientIp(req);
  if (!rateLimit(`preview:${ip}`, 30, 60 * 1000).ok) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }
  const d = parsed.data;

  const template = getTemplate(d.templateId);
  if (!template) {
    return NextResponse.json({ error: "Unknown template." }, { status: 400 });
  }

  const tz = d.timezone;
  const data: FlyerData = {
    monogram: d.monogram || "A & B",
    hashtag: d.hashtag || undefined,
    couple: { bride: d.brideName, groom: d.groomName },
    families: d.flyer.families
      ? {
          introLine: d.flyer.families.introLine || undefined,
          brideParents: d.flyer.families.brideParents || undefined,
          groomParents: d.flyer.families.groomParents || undefined,
        }
      : undefined,
    invitationMessage: d.flyer.invitationMessage || undefined,
    events: (d.ceremonies ?? []).map((c) => ({
      kind: c.kind as CeremonyKind,
      title: c.title || undefined,
      date: fmtDate(c.startsAt, tz),
      time: fmtTime(c.startsAt, tz),
      venue: c.venueName,
    })),
    palette: d.flyer.palette && d.flyer.palette.length > 0 ? d.flyer.palette : undefined,
    scripture: d.flyer.scripture || undefined,
    closingMessage: d.flyer.closingMessage || undefined,
    rsvpContacts: d.flyer.rsvpContacts && d.flyer.rsvpContacts.length > 0 ? d.flyer.rsvpContacts : undefined,
    theme: d.theme,
    photoUrl: d.heroImageUrl ?? null,
  };

  try {
    const png = await renderFlyer(template, data, { scale: 0.5 });
    const b64 = png.toString("base64");
    return NextResponse.json({ ok: true, image: `data:image/png;base64,${b64}` });
  } catch (err) {
    console.error("live preview render failed", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Render failed." }, { status: 500 });
  }
}
