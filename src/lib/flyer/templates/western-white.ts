import { h, type El } from "../h";
import {
  archFrame,
  archPhoto,
  cornerBracket,
  leafCluster,
  ruleLine,
  ringCircle,
} from "../art";
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
import { westernWhiteSpec } from "../catalog-meta";

/**
 * NG-007 — Western White.
 *
 * The classic church invitation: tall arch photo on cream, sage-green
 * botanicals, a hairline rule frame. The ground tints toward the couple's
 * primary so an aso-ebi green or blush carries through the whole sheet.
 *
 * Host-first hierarchy, same as every catalog design.
 */

const W = 1080;
const H = 1920;
const DEFAULT_BG = "#FCFBF8";
const SAGE = "#5C6B5A";
const GOLD = "#C9A86A";

/** Tall portrait arch — the church-invitation proportion. */
const PHOTO = { y: 690, w: 480, h: 600 };

const TOP = {
  inset: 46,
  monogram: 214,
  hashtag: 358,
  head: 414,
  bottom: 1806,
} as const;

/** Lowest the photo may bottom out so the lower band keeps room. */
const PHOTO_FLOOR_BOTTOM = 1470;

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
  const photo = { x, y, w, h, r: Math.round(w * 0.5) };
  return { photo, lower: { top: photo.y + photo.h + 44, bottom: TOP.bottom } };
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

/** Botanical medallion inside the arch when there is no photo. */
function windowMotif(L: Layout, primary: string): string {
  const cx = L.photo.x + L.photo.w / 2;
  const cy = L.photo.y + L.photo.h / 2;
  const s = L.photo.w / PHOTO.w;
  return [
    ringCircle(cx, cy, 120 * s, primary, 1.4, 0.35),
    leafCluster(cx - 70 * s, cy + 12 * s, -52, 0.6 * s, primary),
    leafCluster(cx + 70 * s, cy + 12 * s, 52, 0.6 * s, primary),
    leafCluster(cx, cy + 6 * s, 0, 0.95 * s, primary, { spread: 36 }),
  ].join("\n");
}

function renderArt(photoDataUrl: string | null, L: Layout, c: Ink): string {
  const parts: string[] = [];
  const { x, y, w, h, r } = L.photo;

  parts.push(`<rect width="${W}" height="${H}" fill="${c.bg}"/>`);

  // Hairline double frame — the Western invitation rule.
  parts.push(ruleLine(TOP.inset, TOP.inset, W - TOP.inset, c.primary, 1.4, 0.55));
  parts.push(ruleLine(H - TOP.inset, TOP.inset, W - TOP.inset, c.primary, 1.4, 0.55));
  parts.push(
    `<line x1="${TOP.inset}" y1="${TOP.inset}" x2="${TOP.inset}" y2="${H - TOP.inset}" stroke="${c.primary}" stroke-width="1.4" stroke-opacity="0.55"/>`,
  );
  parts.push(
    `<line x1="${W - TOP.inset}" y1="${TOP.inset}" x2="${W - TOP.inset}" y2="${H - TOP.inset}" stroke="${c.primary}" stroke-width="1.4" stroke-opacity="0.55"/>`,
  );

  // Sage corner brackets — quieter than full flourishes.
  const b = TOP.inset + 20;
  const bs = 74;
  parts.push(cornerBracket(b, b, bs, 0, c.primary, 2));
  parts.push(cornerBracket(W - b, b, bs, 90, c.primary, 2));
  parts.push(cornerBracket(W - b, H - b, bs, 180, c.primary, 2));
  parts.push(cornerBracket(b, H - b, bs, 270, c.primary, 2));

  parts.push(
    photoDataUrl
      ? archPhoto(x, y, w, h, r, photoDataUrl, c.accent)
      : archFrame(x, y, w, h, r, c.accent, windowMotif(L, c.primary)),
  );

  return parts.join("\n");
}

export const westernWhite: FlyerTemplate = {
  spec: westernWhiteSpec,
  build(data: FlyerData, photoDataUrl: string | null): TemplateRender {
    const bg = tintGround(DEFAULT_BG, data.theme.primary, 0.06);
    const c: Ink = {
      bg,
      primary: pickArtColor(bg, [data.theme.primary], SAGE, 2.2),
      accent: pickArtColor(bg, [data.theme.accent], GOLD, 2.0),
      ink: this.spec.palette.text,
    };
    const lower = sectionList(data, c);
    const headBottom =
      TOP.head +
      hierarchyHeight(data, {
        width: W - 192,
        familySize: 26,
        introSize: 24,
        nameSize: 84,
        inviteSize: 25,
        gap: 26,
      });
    const L = layout(headBottom, lower.length);
    // Rebuild the lower band with the photo-aware top.
    const band = lowerBand(lower, L.lower, 3);
    const blocks = [
      monogramBlock(data, { top: TOP.monogram, color: c.primary, size: 60 }),
      hashtagBlock(data, { top: TOP.hashtag, color: c.accent, size: 18, tracking: 7 }),
      hierarchyBlock(data, {
        top: TOP.head,
        ink: c.ink,
        primary: c.primary,
        accent: c.accent,
        familySize: 26,
        introSize: 24,
        nameSize: 84,
        ampSize: 48,
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
