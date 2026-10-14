import { h, type El } from "../h";
import { cornerBracket, framedEmpty, framedPhoto, ruleLine, divider } from "../art";
import { pickArtColor, tintGround } from "../../contrast";
import {
  closingSection,
  eventsSection,
  hierarchyBlock,
  hierarchyHeight,
  hashtagBlock,
  lowerBand,
  monogramBlock,
  paletteSection,
  rsvpSection,
  scriptureSection,
} from "../sections";
import type { FlyerData, FlyerTemplate, TemplateRender } from "../types";
import { editorialNoirSpec } from "../catalog-meta";

/**
 * NG-006 — Editorial Noir.
 *
 * A modern-magazine layout: alabaster paper, an onyx masthead rule, all-sans
 * eyebrows and a WIDE landscape photo band instead of a portrait window —
 * the variation for couples who want "Vogue engagement announcement", not
 * "traditional invitation". Ornaments are hairlines and corner ticks only.
 *
 * Host-first hierarchy, same as every catalog design.
 */

const W = 1080;
const H = 1920;
const BG = "#F9F8F6";
const ONYX = "#0B0C10";
const GOLD = "#B58A35";

/** Landscape band at base size — growth stays uniform so `photoFrame` holds. */
const PHOTO = { y: 640, w: 620, h: 420 };

const TOP = {
  masthead: 118,
  monogram: 172,
  hashtag: 320,
  head: 372,
  footRule: 1836,
  bottom: 1806,
} as const;

/** Lowest the band may bottom out, so the lower list keeps breathing room. */
const PHOTO_FLOOR_BOTTOM = 1440;

interface Layout {
  photo: { x: number; y: number; w: number; h: number; r: number };
  lower: { top: number; bottom: number };
}

function layout(headBottom: number, lowerCount: number): Layout {
  const grow = lowerCount >= 4 ? 1 : lowerCount === 3 ? 1.06 : lowerCount === 2 ? 1.16 : 1.3;
  const y = Math.max(PHOTO.y, headBottom + 44);
  let h = Math.round(PHOTO.h * grow);
  let w = Math.round(PHOTO.w * grow);
  if (y + h > PHOTO_FLOOR_BOTTOM) {
    const fit = Math.max(300, PHOTO_FLOOR_BOTTOM - y);
    const k = fit / h;
    h = Math.round(fit);
    w = Math.round(w * k);
  }
  const x = Math.round((W - w) / 2);
  const photo = { x, y, w, h, r: 4 };
  return { photo, lower: { top: photo.y + photo.h + 54, bottom: TOP.bottom } };
}

interface Ink {
  primary: string;
  accent: string;
  ink: string;
}

function sectionList(data: FlyerData, c: Ink): El[] {
  return [
    eventsSection(data, {
      ink: c.ink,
      primary: c.primary,
      accent: c.accent,
      titleSize: 18,
      dateSize: 24,
      venueSize: 22,
      gap: 14,
      ruleWidth: 260,
    }),
    paletteSection(data, { ink: c.ink, eyebrowSize: 16, swatchSize: 28, swatchLabelSize: 14, gap: 26 }),
    scriptureSection(data, { ink: c.ink, size: 21 }),
    rsvpSection(data, { ink: c.ink, accent: c.accent, labelSize: 15, valueSize: 20, ruleWidth: 220 }),
    closingSection(data, { ink: c.ink, size: 24 }),
  ].filter((s): s is El => s !== null);
}

/** Gold lozenge divider for the photo-less band. */
function bandMotif(L: Layout): string {
  const cx = L.photo.x + L.photo.w / 2;
  const cy = L.photo.y + L.photo.h / 2;
  return [
    divider(cx, cy - 34, 150, GOLD),
    `<text x="${cx}" y="${cy + 26}" fill="${ONYX}" fill-opacity="0.55" font-family="serif" font-size="34" font-style="italic" text-anchor="middle">Save the date</text>`,
    divider(cx, cy + 66, 150, GOLD),
  ].join("\n");
}

function renderText(data: FlyerData, L: Layout, lower: El[], c: Ink): El {
  const blocks = [
    monogramBlock(data, { top: TOP.monogram, color: c.primary, size: 56, tracking: 10 }),
    hashtagBlock(data, { top: TOP.hashtag, color: c.accent, size: 17, tracking: 8 }),
    hierarchyBlock(data, {
      top: TOP.head,
      ink: c.ink,
      primary: c.primary,
      accent: c.accent,
      familySize: 25,
      introSize: 23,
      nameSize: 82,
      ampSize: 48,
      inviteSize: 24,
      gap: 24,
    }),
    lowerBand(lower, L.lower, 3),
  ].filter((b): b is El => b !== null);

  return h("div", { width: W, height: H, display: "flex", position: "relative" }, blocks);
}

function renderArt(photoDataUrl: string | null, L: Layout, c: Ink, ground: string): string {
  const parts: string[] = [];
  const { x, y, w, h, r } = L.photo;

  // Alabaster ground (optionally tinted with the couple's colour): flat and
  // printed — the editorial look.
  parts.push(`<rect width="${W}" height="${H}" fill="${ground}"/>`);

  // Masthead + foot rules: a thick onyx rule with a gold hairline beneath.
  parts.push(ruleLine(TOP.masthead, 90, W - 90, ONYX, 3.2, 1));
  parts.push(ruleLine(TOP.masthead + 9, 90, W - 90, c.accent, 1, 0.75));
  parts.push(ruleLine(TOP.footRule, 90, W - 90, c.accent, 1, 0.75));
  parts.push(ruleLine(TOP.footRule + 9, 90, W - 90, ONYX, 3.2, 1));

  // The landscape band, or a typographic divider when there is no photo.
  parts.push(
    photoDataUrl
      ? framedPhoto(x, y, w, h, r, photoDataUrl, ONYX, c.accent)
      : framedEmpty(x, y, w, h, r, ONYX, bandMotif(L), { fill: "#FFFFFF", fillOpacity: 0.7 }),
  );

  // Gold corner ticks — minimal, square, editorial.
  parts.push(cornerBracket(x - 14, y - 14, 34, 0, c.accent, 2.5));
  parts.push(cornerBracket(x + w + 14, y - 14, 34, 90, c.accent, 2.5));
  parts.push(cornerBracket(x + w + 14, y + h + 14, 34, 180, c.accent, 2.5));
  parts.push(cornerBracket(x - 14, y + h + 14, 34, 270, c.accent, 2.5));

  return parts.join("\n");
}

export const editorialNoir: FlyerTemplate = {
  spec: editorialNoirSpec,
  build(data: FlyerData, photoDataUrl: string | null): TemplateRender {
    const c: Ink = {
      // On alabaster the couple's own deep colour reads as text (gate 4.5);
      // the accent/ornament ink uses the softer art floor so pastels show.
      primary: pickArtColor(BG, [data.theme.primary], this.spec.palette.primary, 4.5),
      accent: pickArtColor(BG, [data.theme.accent], this.spec.palette.accent, 2.2),
      ink: this.spec.palette.text,
    };
    const lower = sectionList(data, c);
    const headBottom =
      TOP.head +
      hierarchyHeight(data, { width: W - 192, familySize: 25, introSize: 23, nameSize: 82, inviteSize: 24, gap: 24 });
    const L = layout(headBottom, lower.length);
    const ground = tintGround(BG, data.theme.primary, 0.06);
    return { art: renderArt(photoDataUrl, L, c, ground), text: renderText(data, L, lower, c) };
  },
};