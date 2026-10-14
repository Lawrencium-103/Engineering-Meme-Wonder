import { h, type El } from "../h";
import { cornerFlourish, framedEmpty, framedPhoto, leafCluster, ringCircle, watercolorBloom } from "../art";
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
import { watercolorBloomSpec } from "../catalog-meta";

/**
 * NG-008 — Watercolor Bloom.
 *
 * Soft garden romantic: translucent washes of the couple's colours bleeding
 * from the corners, a round photo window, and loose foliage. The ground tints
 * toward the primary so a blush or sage aso-ebi carries the whole sheet.
 *
 * Host-first hierarchy, same as every catalog design.
 */

const W = 1080;
const H = 1920;
const DEFAULT_BG = "#FBF7F4";
const BLUSH = "#B5838D";
const SLATE = "#94A8B8";

const PHOTO = { y: 690, w: 500, h: 500 };

const TOP = {
  monogram: 208,
  hashtag: 352,
  head: 408,
  bottom: 1804,
} as const;

const PHOTO_FLOOR_BOTTOM = 1480;

interface Layout {
  photo: { x: number; y: number; w: number; h: number; r: number };
  lower: { top: number; bottom: number };
}

function layout(headBottom: number, lowerCount: number): Layout {
  const grow = lowerCount >= 4 ? 1 : lowerCount === 3 ? 1.05 : lowerCount === 2 ? 1.14 : 1.25;
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
    photo: { x, y, w, h, r: Math.round(w / 2) },
    lower: { top: y + h + 44, bottom: TOP.bottom },
  };
}

interface Ink {
  bg: string;
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

function windowMotif(L: Layout, primary: string, accent: string): string {
  const cx = L.photo.x + L.photo.w / 2;
  const cy = L.photo.y + L.photo.h / 2;
  const s = L.photo.w / PHOTO.w;
  return [
    ringCircle(cx, cy, 128 * s, primary, 1.5, 0.4),
    watercolorBloom(cx - 40 * s, cy - 20 * s, 70 * s, 58 * s, accent, {
      id: "avfWashIn",
      opacity: 0.5,
    }),
    leafCluster(cx - 78 * s, cy + 16 * s, -54, 0.6 * s, primary),
    leafCluster(cx + 78 * s, cy + 16 * s, 54, 0.6 * s, primary),
    leafCluster(cx, cy + 6 * s, 0, 0.92 * s, primary, { spread: 38 }),
  ].join("\n");
}

function renderArt(photoDataUrl: string | null, L: Layout, c: Ink): string {
  const parts: string[] = [];
  const { x, y, w, h, r } = L.photo;

  parts.push(`<rect width="${W}" height="${H}" fill="${c.bg}"/>`);

  // Watercolor washes bleeding in from the corners — the garden atmosphere.
  parts.push(watercolorBloom(60, 120, 300, 240, c.primary, { id: "avfWashTL", opacity: 0.32, rotate: -18 }));
  parts.push(watercolorBloom(W - 40, 80, 260, 210, c.accent, { id: "avfWashTR", opacity: 0.28, rotate: 22 }));
  parts.push(watercolorBloom(30, H - 60, 280, 220, c.accent, { id: "avfWashBL", opacity: 0.24, rotate: 12 }));
  parts.push(watercolorBloom(W - 20, H - 40, 300, 230, c.primary, { id: "avfWashBR", opacity: 0.26, rotate: -14 }));

  // Loose corner sprays over the washes.
  parts.push(leafCluster(150, 190, 40, 0.9, c.primary, { spread: 40 }));
  parts.push(leafCluster(W - 150, 190, -40, 0.9, c.accent, { spread: 40 }));
  parts.push(leafCluster(150, H - 170, -140, 0.78, c.accent, { spread: 36 }));
  parts.push(leafCluster(W - 150, H - 170, 140, 0.78, c.primary, { spread: 36 }));

  // Corner flourish anchors — one per corner, quiet over the washes.
  parts.push(cornerFlourish(96, 96, 80, 0, c.primary));
  parts.push(cornerFlourish(W - 96, 96, 80, 90, c.accent));
  parts.push(cornerFlourish(W - 96, H - 96, 80, 180, c.primary));
  parts.push(cornerFlourish(96, H - 96, 80, 270, c.accent));

  parts.push(
    photoDataUrl
      ? framedPhoto(x, y, w, h, r, photoDataUrl, c.primary, c.accent)
      : framedEmpty(x, y, w, h, r, c.primary, windowMotif(L, c.primary, c.accent), {
          fill: "#FFFFFF",
          fillOpacity: 0.45,
        }),
  );

  return parts.join("\n");
}

export const watercolorBloomTemplate: FlyerTemplate = {
  spec: watercolorBloomSpec,
  build(data: FlyerData, photoDataUrl: string | null): TemplateRender {
    const bg = tintGround(DEFAULT_BG, data.theme.primary, 0.07);
    const c: Ink = {
      bg,
      primary: pickArtColor(bg, [data.theme.primary], BLUSH, 2.2),
      accent: pickArtColor(bg, [data.theme.accent], SLATE, 2.0),
      ink: this.spec.palette.text,
    };
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
