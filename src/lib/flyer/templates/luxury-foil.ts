import { h, type El } from "../h";
import {
  framedEmpty,
  framedPhoto,
  gradientBackground,
  insetKeylines,
  diamondRow,
  foilGradient,
  foilRect,
  ringCircle,
} from "../art";
import { pickArtColor } from "../../contrast";
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
import { luxuryFoilSpec } from "../catalog-meta";

/**
 * NG-009 — Luxury Foil.
 *
 * Evening glamour: a deep plum-black ground with a brushed-gold foil keyline
 * and foil-set names. The gold is a real metal gradient (light → dark → light)
 * so it reads as foil, not a flat yellow. Art colour stays on the couple's
 * primary only when it is bright enough to sit on the dark ground.
 *
 * Host-first hierarchy, same as every catalog design.
 */

const W = 1080;
const H = 1920;
const BG_TOP = "#1A1420";
const BG_BOT = "#0C0910";
const FALLBACK_GOLD = "#D4AF37";
const FALLBACK_CREAM = "#E8D6C0";

const PHOTO = { y: 700, w: 480, h: 560 };

const TOP = {
  inset: 48,
  monogram: 212,
  hashtag: 356,
  head: 412,
  bottom: 1804,
} as const;

const PHOTO_FLOOR_BOTTOM = 1480;

interface Layout {
  photo: { x: number; y: number; w: number; h: number; r: number };
  lower: { top: number; bottom: number };
}

function layout(headBottom: number, lowerCount: number): Layout {
  const grow = lowerCount >= 4 ? 1 : lowerCount === 3 ? 1.05 : lowerCount === 2 ? 1.13 : 1.24;
  const y = Math.max(PHOTO.y, headBottom + 40);
  let h = Math.round(PHOTO.h * grow);
  let w = Math.round(PHOTO.w * grow);
  if (y + h > PHOTO_FLOOR_BOTTOM) {
    const fit = Math.max(360, PHOTO_FLOOR_BOTTOM - y);
    const k = fit / h;
    h = Math.round(fit);
    w = Math.round(w * k);
  }
  const x = Math.round((W - w) / 2);
  return {
    photo: { x, y, w, h, r: Math.round(w * 0.06) },
    lower: { top: y + h + 44, bottom: TOP.bottom },
  };
}

interface Ink {
  primary: string; // foil gold or a bright couple colour
  accent: string;
  ink: string; // near-white body copy
}

function sectionList(data: FlyerData, c: Ink): El[] {
  return [
    eventsSection(data, {
      ink: c.ink,
      primary: c.primary,
      accent: c.accent,
      titleSize: 17,
      dateSize: 23,
      venueSize: 21,
      gap: 11,
      ruleWidth: 230,
    }),
    paletteSection(data, { ink: c.ink, eyebrowSize: 15, swatchSize: 30, swatchLabelSize: 14, gap: 24 }),
    scriptureSection(data, { ink: c.ink, size: 21 }),
    rsvpSection(data, { ink: c.ink, accent: c.accent, labelSize: 14, valueSize: 19, ruleWidth: 190 }),
    closingSection(data, { ink: c.ink, size: 22 }),
  ].filter((s): s is El => s !== null);
}

/** Foil-ringed medallion inside the photo-less window. */
function windowMotif(L: Layout, primary: string): string {
  const cx = L.photo.x + L.photo.w / 2;
  const cy = L.photo.y + L.photo.h / 2;
  const s = L.photo.w / PHOTO.w;
  return [
    ringCircle(cx, cy, 140 * s, primary, 2, 0.85),
    ringCircle(cx, cy, 120 * s, primary, 1, 0.4),
    diamondRow(cx, cy, 5, 62 * s, 12 * s, primary, { opacity: 0.85, plus: true }),
  ].join("\n");
}

function renderArt(photoDataUrl: string | null, L: Layout, c: Ink): string {
  const parts: string[] = [];
  const { x, y, w, h, r } = L.photo;

  // Deep plum-black vertical ground.
  parts.push(gradientBackground(W, H, "avfFoilGround", [
    { offset: 0, color: BG_TOP },
    { offset: 55, color: "#120E18" },
    { offset: 100, color: BG_BOT },
  ]));

  // The foil keyline — brushed gold, inset from the edge.
  parts.push(foilGradient("avfFoil", "gold"));
  parts.push(insetKeylines(W, H, TOP.inset, "url(#avfFoil)", c.accent, 2.5, 1));

  // Small foil diamonds at the four corners of the keyline.
  const d = TOP.inset;
  for (const [cx, cy] of [[d, d], [W - d, d], [W - d, H - d], [d, H - d]]) {
    parts.push(diamondRow(cx, cy, 1, 0, 10, c.primary, { opacity: 0.9, plus: true }));
  }

  // Foil band under the monogram — the "brushed metal" rule.
  parts.push(foilRect(W / 2 - 160, TOP.hashtag + 42, 320, 3, "url(#avfFoil)", 3));

  parts.push(
    photoDataUrl
      ? framedPhoto(x, y, w, h, r, photoDataUrl, c.primary, c.accent)
      : framedEmpty(x, y, w, h, r, c.primary, windowMotif(L, c.primary), {
          fill: "#000000",
          fillOpacity: 0.25,
        }),
  );

  return parts.join("\n");
}

export const luxuryFoil: FlyerTemplate = {
  spec: luxuryFoilSpec,
  build(data: FlyerData, photoDataUrl: string | null): TemplateRender {
    // On this dark ground only bright colours survive as art; fall back to the
    // foil gold. Body copy is always the near-white text colour.
    const primary = pickArtColor(BG_TOP, [data.theme.primary], FALLBACK_GOLD, 3.2);
    const accent = pickArtColor(BG_TOP, [data.theme.accent], FALLBACK_CREAM, 2.6);
    const c: Ink = { primary, accent, ink: this.spec.palette.text };

    const lower = sectionList(data, c);
    const headBottom =
      TOP.head +
      hierarchyHeight(data, { width: W - 192, familySize: 26, introSize: 24, nameSize: 86, inviteSize: 25, gap: 26 });
    const L = layout(headBottom, lower.length);
    const band = lowerBand(lower, L.lower, 3);
    const blocks = [
      monogramBlock(data, { top: TOP.monogram, color: c.primary, size: 62 }),
      hashtagBlock(data, { top: TOP.hashtag, color: c.accent, size: 18, tracking: 7 }),
      hierarchyBlock(data, {
        top: TOP.head,
        ink: c.ink,
        primary: c.primary,
        accent: c.accent,
        familySize: 26,
        introSize: 24,
        nameSize: 86,
        ampSize: 50,
        inviteSize: 25,
        gap: 26,
      }),
      band,
    ].filter((b): b is El => b !== null);
    return {
      art: renderArt(photoDataUrl, L, c),
      text: h("div", { width: W, height: H, display: "flex", position: "relative" }, blocks),
    };
  },
};
