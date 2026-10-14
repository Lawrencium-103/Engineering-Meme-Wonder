import { h, type El } from "../h";
import {
  archFrame,
  archPhoto,
  cornerFlourish,
  doubleBorder,
  leafCluster,
  paperBackground,
  ringCircle,
} from "../art";
import { pickReadable } from "../../contrast";
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
import { rosewaterIvorySpec } from "../catalog-meta";

/**
 * NG-005 — Rosewater Ivory.
 *
 * Warm blush paper with a rosewood rule frame and gold keyline; the photo
 * sits in a round scalloped window ringed by rose-leaf clusters (roses for
 * the blush couple — the natural counterpart to NG-002's garden greens).
 *
 * Host-first hierarchy, same as every catalog design.
 */

const W = 1080;
const H = 1920;
const BG = "#FBF3EF";
const ROSEWOOD = "#9C4A54";
const GOLD = "#C9973F";

/** Square window at base size — growth stays uniform so `photoFrame` holds. */
const PHOTO = { y: 676, w: 500, h: 500 };

const TOP = {
  inset: 42,
  medallion: { cx: 540, cy: 218, r: 64 },
  monogram: 194,
  hashtag: 348,
  head: 402,
  bottom: 1802,
} as const;

/** Lowest the photo may bottom out, so the lower band keeps breathing room. */
const PHOTO_FLOOR_BOTTOM = 1500;

interface Layout {
  photo: { x: number; y: number; w: number; h: number; r: number };
  lower: { top: number; bottom: number };
}

function layout(headBottom: number, lowerCount: number): Layout {
  const grow = lowerCount >= 4 ? 1 : lowerCount === 3 ? 1.06 : lowerCount === 2 ? 1.15 : 1.26;
  const y = Math.max(PHOTO.y, headBottom + 42);
  let h = Math.round(PHOTO.h * grow);
  let w = Math.round(PHOTO.w * grow);
  if (y + h > PHOTO_FLOOR_BOTTOM) {
    const fit = Math.max(360, PHOTO_FLOOR_BOTTOM - y);
    const k = fit / h;
    h = Math.round(fit);
    w = Math.round(w * k);
  }
  const x = Math.round((W - w) / 2);
  const photo = { x, y, w, h, r: Math.round(w * 0.14) };
  return { photo, lower: { top: photo.y + photo.h + 44, bottom: TOP.bottom } };
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

/** Rosy medallion for the photo-less window. */
function windowMotif(L: Layout, primary: string): string {
  const cx = L.photo.x + L.photo.w / 2;
  const cy = L.photo.y + L.photo.h / 2;
  const s = L.photo.w / PHOTO.w;
  return [
    ringCircle(cx, cy, 150 * s, primary, 1.6, 0.4),
    leafCluster(cx - 96 * s, cy + 20 * s, -50, 0.68 * s, primary),
    leafCluster(cx + 96 * s, cy + 20 * s, 50, 0.68 * s, primary),
    leafCluster(cx, cy + 8 * s, 0, 1.1 * s, primary, { spread: 40 }),
  ].join("\n");
}

function renderText(data: FlyerData, L: Layout, lower: El[], c: Ink): El {
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
    lowerBand(lower, L.lower, 3),
  ].filter((b): b is El => b !== null);

  return h("div", { width: W, height: H, display: "flex", position: "relative" }, blocks);
}

function renderArt(photoDataUrl: string | null, L: Layout, c: Ink): string {
  const parts: string[] = [];
  const { x, y, w, h, r } = L.photo;

  parts.push(paperBackground(W, H, BG, c.ink));
  parts.push(doubleBorder(W, H, TOP.inset, c.primary, c.accent));

  // Corner rose sprays — smaller and rounder than NG-001's vines.
  parts.push(cornerFlourish(TOP.inset + 24, TOP.inset + 24, 104, 0, c.primary));
  parts.push(cornerFlourish(W - TOP.inset - 24, TOP.inset + 24, 104, 90, c.primary));
  parts.push(cornerFlourish(W - TOP.inset - 24, H - TOP.inset - 24, 104, 180, c.primary));
  parts.push(cornerFlourish(TOP.inset + 24, H - TOP.inset - 24, 104, 270, c.primary));

  // Monogram medallion — double ring, like a wax seal.
  parts.push(ringCircle(TOP.medallion.cx, TOP.medallion.cy, TOP.medallion.r, c.primary, 2.2, 0.9));
  parts.push(ringCircle(TOP.medallion.cx, TOP.medallion.cy, TOP.medallion.r - 8, c.accent, 1, 0.6));

  // Foliage hugging the window — anchored to the frame so it travels with it.
  const side: { t: number; rot: number; scale: number }[] = [
    { t: 0.3, rot: 62, scale: 0.58 },
    { t: 0.7, rot: 118, scale: 0.58 },
  ];
  for (const sd of side) {
    parts.push(leafCluster(x - 8, y + h * sd.t, -sd.rot, sd.scale, c.primary, { spread: 26 }));
    parts.push(leafCluster(x + w + 8, y + h * sd.t, sd.rot, sd.scale, c.primary, { spread: 26 }));
  }

  parts.push(
    photoDataUrl
      ? archPhoto(x, y, w, h, r, photoDataUrl, c.accent)
      : archFrame(x, y, w, h, r, c.accent, windowMotif(L, c.primary)),
  );

  return parts.join("\n");
}

export const rosewaterIvory: FlyerTemplate = {
  spec: rosewaterIvorySpec,
  build(data: FlyerData, photoDataUrl: string | null): TemplateRender {
    const c: Ink = {
      primary: pickReadable(BG, [data.theme.primary], this.spec.palette.primary, 4.5),
      accent: pickReadable(BG, [data.theme.accent], this.spec.palette.accent, 2.2),
      ink: this.spec.palette.text,
    };
    const lower = sectionList(data, c);
    const headBottom =
      TOP.head +
      hierarchyHeight(data, { width: W - 192, familySize: 26, introSize: 24, nameSize: 86, inviteSize: 25, gap: 26 });
    const L = layout(headBottom, lower.length);
    return { art: renderArt(photoDataUrl, L, c), text: renderText(data, L, lower, c) };
  },
};