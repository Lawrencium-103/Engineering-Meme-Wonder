import { NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import path from "path";
import { TEMPLATES, getTemplate } from "@/lib/flyer/catalog";
import { renderFlyer, renderFlyerSvg } from "@/lib/flyer/render";
import type { FlyerData } from "@/lib/flyer/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Dev-only: renders a sample flyer through the REAL pipeline so we can eyeball
 * quality during Phase A. Never served in production.
 *
 *   /api/marketing/sample-flyer            → template NG-001, 2x PNG
 *   /api/marketing/sample-flyer?scale=1    → 1x
 *   /api/marketing/sample-flyer?nophoto=1  → photo-less variant
 *   /api/marketing/sample-flyer?events=3   → three ceremonies (layout stress test)
 *   /api/marketing/sample-flyer?worst=1    → longest plausible content
 *   /api/marketing/sample-flyer?minimal=1  → required fields only
 *   /api/marketing/sample-flyer?two=1      → two lower sections (sparse layout)
 *   /api/marketing/sample-flyer?longnames=1 → long couple names (names row wraps)
 *   /api/marketing/sample-flyer?svg=1      → the composed SVG (debug)
 *   /api/marketing/sample-flyer?t=NG-002   → another template
 */

const SAMPLE: FlyerData = {
  monogram: "BO",
  hashtag: "#BLESSOT'24",
  couple: { bride: "Blessing", groom: "Otobha" },
  families: {
    introLine: "Joyfully invite you to the Wedding Ceremony of their children",
    brideParents: "Rev. & Mrs. Domis Afekhai Samson (Edo State)",
    groomParents: "Barr. & Mrs. Jombo Okpa Okey (Cross River State)",
  },
  invitationMessage: "Together with their families, request the honour of your presence",
  events: [
    {
      kind: "TRADITIONAL",
      title: "Traditional Wedding",
      date: "22nd Nov, 2024",
      time: "9:00 AM",
      venue: "Samson Compound, Idu, Abuja",
    },
    {
      kind: "RELIGIOUS",
      title: "White Wedding",
      date: "23rd Nov, 2024",
      time: "10:00 AM",
      venue: "Christian Pilgrimage Welfare Board, Abuja",
    },
  ],
  palette: [
    { label: "Gold", hex: "#D4AF37" },
    { label: "White", hex: "#FFFFFF" },
    { label: "Maroon", hex: "#641F26" },
  ],
  scripture: "And now these three remain: faith, hope and love. But the greatest of these is love.",
  closingMessage: "Can't wait to celebrate with you!",
  rsvpContacts: [
    { name: "Ada", phone: "08104251129" },
    { name: "Chidi", phone: "07032507820" },
  ],
  theme: { primary: "#641F26", accent: "#B58A35" },
  photoUrl: "/marketing/hero-01.png",
};

/** A third ceremony, used by the ?events=3 layout stress test. */
const RECEPTION: FlyerData["events"][number] = {
  kind: "RECEPTION",
  title: "Reception",
  date: "23rd Nov, 2024",
  time: "2:00 PM",
  venue: "Grand Ballroom, Transcorp Hilton, Abuja",
};

/**
 * The longest plausible content for this template — three ceremonies, a
 * two-line invitation, a two-line scripture, four swatches and three RSVP
 * contacts. Used by ?worst=1 to prove nothing collides or overflows.
 */
function worstCase(d: FlyerData): FlyerData {
  return {
    ...d,
    events: [...d.events, RECEPTION],
    invitationMessage:
      "Together with their families, request the honour of your presence as they celebrate the joining of two families",
    scripture:
      "And now these three remain: faith, hope and love. But the greatest of these is love, and it binds every heart together.",
    closingMessage: "With hearts full of joy, we can't wait to celebrate with you and our families.",
    palette: [
      { label: "Champagne Gold", hex: "#D4AF37" },
      { label: "Ivory", hex: "#FFFFFF" },
      { label: "Deep Maroon", hex: "#641F26" },
      { label: "Olive", hex: "#4A5D23" },
    ],
    rsvpContacts: [
      { name: "Ada", phone: "08104251129" },
      { name: "Chidi", phone: "07032507820" },
      { name: "Emeka", phone: "08033445566" },
    ],
  };
}

export async function GET(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const url = new URL(req.url);
  const id = url.searchParams.get("t") ?? TEMPLATES[0].spec.id;
  const template = getTemplate(id);
  if (!template) {
    return NextResponse.json(
      { error: `Unknown template ${id}`, available: TEMPLATES.map((t) => t.spec.id) },
      { status: 404 },
    );
  }

  const noPhoto = url.searchParams.get("nophoto") === "1";
  const scale = Number(url.searchParams.get("scale") ?? "2") || 2;

  // QA variants — exercise the ways real content differs from the happy path.
  let data: FlyerData = { ...SAMPLE, photoUrl: noPhoto ? null : SAMPLE.photoUrl };
  if (url.searchParams.get("events") === "3") {
    data = { ...data, events: [...data.events, RECEPTION] };
  }
  if (url.searchParams.get("worst") === "1") {
    data = worstCase(data);
  }
  if (url.searchParams.get("minimal") === "1") {
    data = {
      monogram: data.monogram,
      hashtag: data.hashtag,
      couple: data.couple,
      events: [data.events[0]],
      theme: data.theme,
      photoUrl: data.photoUrl,
    };
  }
  if (url.searchParams.get("two") === "1") {
    data = {
      monogram: data.monogram,
      hashtag: data.hashtag,
      couple: data.couple,
      families: data.families,
      invitationMessage: data.invitationMessage,
      events: [data.events[0]],
      theme: data.theme,
      photoUrl: data.photoUrl,
    };
  }
  if (url.searchParams.get("longnames") === "1") {
    // Real-world content that broke the layout: a long pair whose names row
    // wraps, plus long host lines. Guards the hierarchyHeight wrap estimate.
    data = {
      ...data,
      couple: { groom: "Lawrence Oladeji", bride: "Babajide Lawrence" },
      families: {
        introLine: "Joyfully Invites you the wedding ceremony of their children",
        brideParents: "Mr & Mrs Bbajide",
        groomParents: "Mr & Mrs Oladeji",
      },
      invitationMessage: "Together with their families, request the honour of your presence",
    };
  }

  const asSvg = url.searchParams.get("svg") === "1";
  if (asSvg) {
    const svg = await renderFlyerSvg(template, data);
    return new NextResponse(svg, {
      headers: { "Content-Type": "image/svg+xml; charset=utf-8", "Cache-Control": "no-store" },
    });
  }

  const png = await renderFlyer(template, data, { scale });
  await writeFile(
    path.join(process.cwd(), "public", "marketing", `sample-flyer-${id}.png`),
    png,
  );

  return new NextResponse(new Uint8Array(png), {
    headers: { "Content-Type": "image/png", "Cache-Control": "no-store" },
  });
}
