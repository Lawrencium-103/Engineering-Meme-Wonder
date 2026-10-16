import { NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { ceremonies, events } from "@/db/schema";
import { renderOgImage } from "@/lib/og";
import { getTemplate } from "@/lib/flyer/catalog";
import { toFlyerData } from "@/lib/flyer/from-event";
import { renderFlyer } from "@/lib/flyer/render";
import { renderPass, type PassData } from "@/lib/pass";
import { appUrl } from "@/lib/auth";
import { HERO_VARIANTS, type HeroVariant } from "@/lib/hero-variants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Dev-only: pre-renders the hero demo's couple variations (og + card + pass)
 * to public/marketing/variants/{key}-{og,card,pass}.png so HeroDemo can cycle
 * cultures without depending on live DB rows. Run once after editing
 * hero-variants.ts, convert the PNGs to .webp, and commit the results.
 */

const TZ = "Africa/Lagos";
const THEME = { primary: "#D4AF37", accent: "#E8D3C4" };

function isoDayPlus(ymd: string, days: number): string {
  const d = new Date(`${ymd}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function fakeEvent(v: HeroVariant) {
  return {
    id: `00000000-0000-0000-0000-00000000000${HERO_VARIANTS.indexOf(v)}`,
    ownerId: "00000000-0000-0000-0000-0000000000ff",
    status: "PUBLISHED",
    slug: v.slug,
    timezone: TZ,
    monogram: v.monogram,
    groomName: v.groom,
    brideName: v.bride,
    weddingDate: v.weddingDate,
    groomSeq: 0,
    brideSeq: 0,
    guestCap: 100,
    tier: "CLASSIC",
    theme: THEME,
    heroImageUrl: "/marketing/hero-01.png",
    groomSignatureUrl: null,
    brideSignatureUrl: null,
    story: null,
    flyer: {
      hashtag: "#ForeverBeginsWithYou",
      invitationMessage:
        "Together with their families, request the honour of your presence as they begin forever",
      families: {
        introLine: "Joyfully invite you to the Wedding Ceremony of their children",
        brideParents: v.families.brideParents,
        groomParents: v.families.groomParents,
      },
      palette: [
        { hex: "#D4AF37", label: "Champagne Gold" },
        { hex: "#F9F8F6", label: "Ivory" },
        { hex: "#E8D3C4", label: "Rose Champagne" },
      ],
      scripture:
        "And now these three remain: faith, hope and love. But the greatest of these is love.",
      rsvpContacts: [
        { name: "Ada (Bride's sister)", phone: "08104251129" },
        { name: "Chidi (Groom's brother)", phone: "07032507820" },
      ],
      closingMessage: "Can't wait to celebrate with you!",
      templateId: "NG-001",
    },
  } as unknown as typeof events.$inferSelect;
}

function fakeCeremonies(v: HeroVariant) {
  const tradDay = isoDayPlus(v.weddingDate, -1);
  return [
    {
      id: "00000000-0000-0000-0000-00000000c001",
      eventId: fakeEvent(v).id,
      kind: "TRADITIONAL",
      venueName: v.tradVenue,
      address: null,
      mapsUrl: null,
      startsAt: new Date(`${tradDay}T10:00:00+01:00`),
      dressCode: "Aso-Oke: Gold & Ivory",
      isRequired: false,
      sortOrder: 0,
    },
    {
      id: "00000000-0000-0000-0000-00000000c002",
      eventId: fakeEvent(v).id,
      kind: "RECEPTION",
      venueName: "The Grand Ballroom, Eko Atlantic",
      address: null,
      mapsUrl: null,
      startsAt: new Date(`${v.weddingDate}T16:00:00+01:00`),
      dressCode: "Formal: Black Tie with Gold accents",
      isRequired: true,
      sortOrder: 1,
    },
  ] as unknown as (typeof ceremonies.$inferSelect)[];
}

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const base = appUrl();
  const dir = path.join(process.cwd(), "public", "marketing", "variants");
  await mkdir(dir, { recursive: true });
  const written: Array<{ file: string; bytes: number }> = [];

  for (const v of HERO_VARIANTS) {
    const og = await renderOgImage({
      groomName: v.groom,
      brideName: v.bride,
      weddingDate: new Date(`${v.weddingDate}T12:00:00Z`),
      timezone: TZ,
      theme: THEME,
      heroImageUrl: null,
    });

    const template = getTemplate("NG-001");
    if (!template) throw new Error("NG-001 template missing");
    const card = await renderFlyer(
      template,
      toFlyerData(fakeEvent(v), fakeCeremonies(v), TZ),
      { scale: 1 },
    );

    const passData: PassData = {
      guestFirstName: v.guest.first,
      guestLastName: v.guest.last,
      side: "GROOM",
      guestCode: v.guestCode,
      publicToken: `${v.key.repeat(32).slice(0, 32)}`,
      monogram: v.monogram,
      groomName: v.groom,
      brideName: v.bride,
      weddingDate: new Date(`${v.weddingDate}T15:00:00.000Z`),
      timezone: TZ,
      receptionVenue: "The Grand Ballroom, Eko Atlantic",
      heroImageUrl: `${base}/marketing/pass-bg.jpg`,
      groomSignatureUrl: null,
      brideSignatureUrl: null,
      theme: THEME,
    };
    const pass = await renderPass(passData);

    for (const [kind, buf] of [
      ["og", og],
      ["card", card],
      ["pass", pass],
    ] as const) {
      const file = `${v.key}-${kind}.png`;
      await writeFile(path.join(dir, file), buf);
      written.push({ file, bytes: buf.length });
    }
  }

  return NextResponse.json({ ok: true, written }, { status: 200 });
}
