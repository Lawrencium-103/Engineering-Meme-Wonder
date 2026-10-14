import { h, type El } from "../h";
import {
  cornerBracket,
  diamondRow,
  doubleBorder,
  framedEmpty,
  framedPhoto,
  gradientBackground,
  rings,
  warpTexture,
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
import { onyxGoldSpec } from "../catalog-meta";

/**
 * NG-004 — Onyx & Gold.
 *
 * The black-tie design: an onyx ground with a champagne-gold double frame,
 * diamond rows top and foot, and a rounded portrait window keylined in gold.
 * Built for evening receptions and the couple who want the Aravow house
 * palette (onyx / champagne gold / rose champagne) itself.
 *
 * Hierarchy (host-first, as every design in the catalog): monogram →
 * hashtag → BRIDE'S PARENTS → GROOM'S PARENTS → intro → couple →
 * invitation → photo → ceremonies → colours → scripture → RSVP → closing.
 */

const W = 1080;
const H = 1920;
const BG = "#0B0C10";
const GOLD = "#D4AF37";
const ROSE = "#E8D3C4";

/** Portrait window at base size — growth stays uniform so `photoFrame` holds. */
const PHOTO = { y: 668, w: 470, h: 560 };

const TOP = {
  inset: 46,
  diamondsTop: { cy: 150, count: 5, spacing: 34, r: 9 },
  rings: { cx: 540, cy: 232, r: 27 },
  monogram: 268,
  hashtag: 360,
  head: 414,
  bottom: 1800,
  diamondsFoot: { cy: 1848, count: 5, spacing: 34, r: 9 },
} as const;

/** Lowest the photo may bottom out, so the lower band keeps breathing room. */
const PHOTO_FLOOR_BOTTOM = 1500;

interface Layout {
  photo: { x: number; y: number; w: number; h: number; r: number };
  lower: { top: number; bottom: number };
}

/** Adaptive layout — identical contract to the other catalog designs. */
function layout(headBottom: number, lowerCount: number): Layout {
  const grow = lowerCount >= 4 ? 1 : lowerCount === 3 ? 1.06 : lowerCount === 2 ? 1.16 : 1.28;
  const y = Math.max(PHOTO.y, headBottom + 44);
  let h = Math.round(PHOTO.h * grow);
  let w = Math.round(PHOTO.w * grow);
  if (y + h > PHOTO_FLOOR_BOTTOM) {
    const fit = Math.max(360, PHOTO_FLOOR_BOTTOM - y);
    const k = fit / h;
    h = Math.round(fit);
    w = Math.round(w * k);
  }
  const x = Math.round((W - w) / 2);
  const photo = { x, y, w, h, r: Math.round(w * 0.1) };
  return { photo, lower: { top: photo.y + photo.h + 48, bottom: TOP.bottom } };
}

interface Ink {
  /** Couple names — gold unless their own colour reads on onyx. */
  head: string;
  /** Rules, diamonds, keylines. */
  accent: string;
  /** Body copy — alabaster. */
  ink: string;
}

function sectionList(data: FlyerData, c: Ink): El[] {
  return [
    eventsSection(data, {
      ink: c.ink,
      primary: c.head,
      accent: c.accent,
      titleSize: 18,
      dateSize: 24,
      venueSize: 22,
      gap: 12,
      ruleWidth: 240,
    }),
    paletteSection(data, { ink: c.ink, eyebrowSize: 15, swatchSize: 30, swatchLabelSize: 14, gap: 26 }),
    scriptureSection(data, { ink: c.ink, size: 21 }),
    rsvpSection(data, { ink: c.ink, accent: c.accent, labelSize: 14, valueSize: 19, ruleWidth: 200 }),
    closingSection(data, { ink: c.ink, size: 23 }),
  ].filter((s): s is El => s !== null);
}

/** Gold geometry for the photo-less window: rings + a diamond crown. */
function windowMotif(L: Layout): string {
  const cx = L.photo.x + L.photo.w / 2;
  const cy = L.photo.y + L.photo.h / 2;
  const s = L.photo.w / PHOTO.w;
  return [
    rings(cx, cy - 40 * s, 54 * s, GOLD, ROSE),
    diamondRow(cx, cy + 70 * s, 5, 44 * s, 14 * s, GOLD, { opacity: 0.85, plus: true }),
    diamondRow(cx, cy + 130 * s, 3, 36 * s, 10 * s, ROSE, { opacity: 0.7 }),
  ].join("\n");
}

function renderText(data: FlyerData, L: Layout, lower: El[], c: Ink): El {
  const blocks = [
    monogramBlock(data, { top: TOP.monogram, color: c.head, size: 64 }),
    hashtagBlock(data, { top: TOP.hashtag, color: c.accent, size: 18, tracking: 8 }),
    hierarchyBlock(data, {
      top: TOP.head,
      ink: c.ink,
      primary: c.head,
      accent: c.accent,
      familySize: 26,
      introSize: 24,
      nameSize: 84,
      ampSize: 50,
      inviteSize: 25,
      gap: 26,
    }),
    lowerBand(lower, L.lower, 3),
  ].filter((b): b is El => b !== null);

  return h("div", { width: W, height: H, display: "flex", position: "relative" }, blocks);
}

function renderArt(photoDataUrl: string | null, L: Layout, c: Ink, ground: string): string {
  const parts: string[] = [];

  // Onyx ground (optionally tinted with the couple's colour) with a faint gold
  // warp, and the double gold frame.
  parts.push(
    gradientBackground(W, H, "avfOnyxGround", [
      { offset: 0, color: tintGround(ground, "#FFFFFF", 0.05) },
      { offset: 55, color: ground },
      { offset: 100, color: tintGround(ground, "#000000", 0.35) },
    ]),
  );
  parts.push(warpTexture(W, H, GOLD, 17, 0.035));
  parts.push(doubleBorder(W, H, TOP.inset, GOLD, ROSE));

  // Diamond crowns, top and foot.
  parts.push(
    diamondRow(W / 2, TOP.diamondsTop.cy, TOP.diamondsTop.count, TOP.diamondsTop.spacing, TOP.diamondsTop.r, GOLD, {
      plus: true,
    }),
  );
  parts.push(
    diamondRow(W / 2, TOP.diamondsFoot.cy, TOP.diamondsFoot.count, TOP.diamondsFoot.spacing, TOP.diamondsFoot.r, GOLD, {
      plus: true,
    }),
  );
  parts.push(rings(TOP.rings.cx, TOP.rings.cy, TOP.rings.r, GOLD, ROSE));

  // The portrait window, or gold geometry when there is no photo.
  const { x, y, w, h, r } = L.photo;
  parts.push(
    photoDataUrl
      ? framedPhoto(x, y, w, h, r, photoDataUrl, GOLD, ROSE)
      : framedEmpty(x, y, w, h, r, GOLD, windowMotif(L), { fill: "#101218", fillOpacity: 0.9 }),
  );

  // Rose-champagne binding brackets on the outer keyline.
  parts.push(cornerBracket(x - 15, y - 15, 38, 0, ROSE, 3));
  parts.push(cornerBracket(x + w + 15, y - 15, 38, 90, ROSE, 3));
  parts.push(cornerBracket(x + w + 15, y + h + 15, 38, 180, ROSE, 3));
  parts.push(cornerBracket(x - 15, y + h + 15, 38, 270, ROSE, 3));

  return parts.join("\n");
}

export const onyxGold: FlyerTemplate = {
  spec: onyxGoldSpec,
  build(data: FlyerData, photoDataUrl: string | null): TemplateRender {
    // Art/ornament inks use a low floor (2.2) so a couple's colour shows as
    // linework; text stays on the stricter gate inside sectionList.
    const c: Ink = {
      head: pickArtColor(BG, [data.theme.accent, data.theme.primary], GOLD, 4),
      accent: pickArtColor(BG, [data.theme.primary], ROSE, 2.5),
      ink: this.spec.palette.text,
    };
    const lower = sectionList(data, c);
    const headBottom =
      TOP.head +
      hierarchyHeight(data, { width: W - 192, familySize: 26, introSize: 24, nameSize: 84, inviteSize: 25, gap: 26 });
    const L = layout(headBottom, lower.length);
    // Tint the onyx ground with the couple's primary so their colour reaches
    // the dominant field, not just the accents.
    const ground = tintGround(BG, data.theme.primary, 0.06);
    return { art: renderArt(photoDataUrl, L, c, ground), text: renderText(data, L, lower, c) };
  },
};