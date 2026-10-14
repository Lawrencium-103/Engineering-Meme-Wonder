import { NextResponse } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { TEMPLATES } from "@/lib/flyer/catalog";
import { renderFlyer } from "@/lib/flyer/render";
import type { FlyerData } from "@/lib/flyer/types";

/**
 * Render a small PNG thumbnail for every flyer template into public/templates/.
 *
 * Auth-gated dev tool: hit GET /api/flyer/thumbnails once (or run
 * `npm run thumbnails`, which fetches it) to (re)generate the set. The Studio
 * picker then shows the REAL design instead of palette swatches, so couples
 * stop picking blind. The render engine (satori + resvg + fs) cannot bundle
 * for the browser, so thumbnails are produced here server-side once and
 * shipped as static files.
 *
 * Each thumbnail uses a fixed sample FlyerData with NO photo, so the design's
 * signature empty-frame motif is what shows.
 */

const SAMPLE: FlyerData = {
  monogram: "A & B",
  hashtag: "#Forever",
  couple: { bride: "Amara", groom: "Tunde" },
  families: {
    brideParents: "Mr. & Mrs. Okafor",
    groomParents: "Mr. & Mrs. Adeyemi",
    introLine: "Together with their families",
  },
  invitationMessage: "request the pleasure of your company",
  events: [
    { kind: "TRADITIONAL", date: "Saturday, 12 June 2027", time: "12:00 PM", venue: "The Civic Centre, Lagos" },
    { kind: "RECEPTION", date: "Saturday, 12 June 2027", time: "5:00 PM", venue: "Eko Hotel Grand Ballroom" },
  ],
  palette: [
    { label: "Gold", hex: "#C9A227" },
    { label: "Champagne", hex: "#E8D3C4" },
    { label: "Ivory", hex: "#F5EFE3" },
  ],
  scripture: "And above all these put on love.",
  closingMessage: "With love",
  rsvpContacts: [{ name: "Bola", phone: "+234 801 234 5678" }],
  theme: { primary: "#C9A227", accent: "#E8D3C4" },
  photoUrl: null,
};

export const dynamic = "force-dynamic";

export async function GET() {
  // Only meaningful in dev / behind an authenticated local session; refuse in
  // production so this never becomes a public render endpoint.
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available" }, { status: 403 });
  }

  const outDir = path.join(process.cwd(), "public", "templates");
  await mkdir(outDir, { recursive: true });

  const written: string[] = [];
  for (const tpl of TEMPLATES) {
    const png = await renderFlyer(tpl, SAMPLE, { scale: 0.18 });
    const file = path.join(outDir, `${tpl.spec.id}.png`);
    await writeFile(file, png);
    written.push(`${tpl.spec.id}.png`);
  }

  return NextResponse.json({ ok: true, count: written.length, files: written });
}
