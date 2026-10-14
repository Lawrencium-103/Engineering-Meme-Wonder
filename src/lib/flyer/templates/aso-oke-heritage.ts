import { h, type El } from "../h";
import {
  cornerBracket,
  diamondRow,
  framedEmpty,
  framedPhoto,
  gradientBackground,
  ruleLine,
  warpTexture,
  weaveBand,
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
import { asoOkeHeritageSpec } from "../catalog-meta";

/**
 * NG-003 — Aso-Oke Heritage.
 *
 * The inverse of NG-001 and NG-002: a dark indigo ground with hand-woven
 * selvedges, gold-and-clay warp stripes and a portrait cloth window. Nigerian
 * traditional weddings are the Yoruba aso-oke / gele story, so this design leads
 * with the textile rather than the paper.
 *
 * Because the ground is dark, the couple's own colours are adopted only where
 * they actually read on indigo (see `pickReadable`) — their maroon still appears
 * in the cloth, but the names stay legible no matter what theme they picked.
 */

const W = 1080;
const H = 1920;
const BG = "#141A38";
const CREAM = "#F2EAD9";
const GOLD = "#E9C46A";
const CLAY = "#D9835E";

/** Cloth head and foot bands, plus the side selvedges that frame the field. */
const BAND = { top: 0, h: 104, footY: 1816, footH: 104, selvedge: 22 };

/** The portrait cloth window. */
const PHOTO = { y: 620, w: 470, h: 560 };

/** Fixed anchors. The ornaments are pinned to these exact lines. */
const TOP = {
  diamonds: 148,
  ruleTop: BAND.h + 8,
  ruleBottom: BAND.footY - 12,
  monogram: 196,
  hashtag: 300,
  head: 366,
  bottom: 1786,
} as const;

/** Lowest the photo may bottom out, so the lower band keeps breathing room. */
const PHOTO_FLOOR_BOTTOM = 1460;

interface Layout {
  photo: { x: number; y: number; w: number; h: number; r: number };
  lower: { top: number; bottom: number };
}

/**
 * Lay the card out for the amount of content it actually has — the same
 * adaptive rule as the other designs, but pushed further: on a dark field a
 * sparse card must not leave a sheet of empty indigo, so the window grows hard
 * into the space a fuller card would have used. The head block (parents →
 * names → invitation) flows first; the photo starts below it.
 */
function layout(headBottom: number, lowerCount: number): Layout {
  const grow = lowerCount >= 4 ? 1 : lowerCount === 3 ? 1.08 : lowerCount === 2 ? 1.34 : 1.5;
  const y = Math.max(PHOTO.y, headBottom + 36);
  let h = Math.round(PHOTO.h * grow);
  let w = Math.round(PHOTO.w * grow);
  if (y + h > PHOTO_FLOOR_BOTTOM) {
    const fit = Math.max(340, PHOTO_FLOOR_BOTTOM - y);
    const k = fit / h;
    h = Math.round(fit);
    w = Math.round(w * k);
  }
  const x = Math.round((W - w) / 2);
  const photo = { x, y, w, h, r: 6 };
  return { photo, lower: { top: photo.y + photo.h + 44, bottom: TOP.bottom } };
}

/** Colours resolved for this render: the couple's theme, then the template's. */
interface Ink {
  /** Headings and names — gold unless the couple's colour reads better. */
  head: string;
  /** Rules, eyebrow text and small geometry. */
  accent: string;
  /** Body copy — undyed cotton. */
  ink: string;
}

/** Every lower section this template knows how to render, in reading order. */
function sectionList(data: FlyerData, c: Ink): El[] {
  return [
    eventsSection(data, {
      ink: c.ink,
      primary: c.head,
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

/** Woven geometry shown in the window when the couple has no photo. */
function windowMotif(L: Layout, gold: string, clay: string): string {
  const cx = L.photo.x + L.photo.w / 2;
  const cy = L.photo.y + L.photo.h / 2;
  const s = L.photo.w / PHOTO.w;
  return [
    diamondRow(cx, cy - 148 * s, 5, 46 * s, 17 * s, gold, { opacity: 0.85, plus: true }),
    diamondRow(cx, cy - 58 * s, 3, 86 * s, 30 * s, clay, { opacity: 0.9, plus: true }),
    diamondRow(cx, cy + 32 * s, 5, 46 * s, 17 * s, gold, { opacity: 0.85, plus: true }),
    diamondRow(cx, cy + 122 * s, 7, 34 * s, 11 * s, gold, { opacity: 0.6 }),
  ].join("\n");
}

function renderText(data: FlyerData, L: Layout, lower: El[], c: Ink): El {
  const blocks = [
    monogramBlock(data, { top: TOP.monogram, color: c.head, size: 64 }),
    hashtagBlock(data, { top: TOP.hashtag, color: c.accent, size: 18, tracking: 8 }),
    // Hierarchy fix: PARENTS BEFORE NAMES (this design used to lead with the
    // couple, which inverts the Nigerian host-first convention).
    hierarchyBlock(data, {
      top: TOP.head,
      ink: c.ink,
      primary: c.ink,
      accent: c.head,
      familySize: 23,
      introSize: 21,
      nameSize: 80,
      ampSize: 48,
      inviteSize: 24,
      gap: 22,
      pad: 90,
    }),
    lowerBand(lower, L.lower, 3),
  ].filter((b): b is El => b !== null);

  return h("div", { width: W, height: H, display: "flex", position: "relative" }, blocks);
}

function renderArt(photoDataUrl: string | null, L: Layout, c: Ink, cloth: string[]): string {
  const parts: string[] = [];
  const { x, y, w, h, r } = L.photo;
  const fieldH = BAND.footY - BAND.h;

  // The cloth: an indigo ground, a fine warp of vertical threads and the woven
  // selvedges that bound the field on all four sides.
  parts.push(
    gradientBackground(W, H, "avfClothGround", [
      { offset: 0, color: "#1B2350" },
      { offset: 52, color: BG },
      { offset: 100, color: "#0B0F26" },
    ]),
  );
  parts.push(warpTexture(W, H, "#8FA0D8", 13, 0.05));

  parts.push(weaveBand(0, 0, W, BAND.h, cloth, { bg: "#0E1330" }));
  parts.push(weaveBand(0, BAND.footY, W, BAND.footH, cloth, { bg: "#0E1330" }));
  parts.push(weaveBand(0, BAND.h, BAND.selvedge, fieldH, cloth, { bg: "#0E1330" }));
  parts.push(
    weaveBand(W - BAND.selvedge, BAND.h, BAND.selvedge, fieldH, cloth, { bg: "#0E1330" }),
  );
  // A gold hairline run inside each selvedge.
  parts.push(weaveBand(BAND.selvedge + 3, BAND.h, 3, fieldH, [c.head], { bg: BG }));
  parts.push(weaveBand(W - BAND.selvedge - 6, BAND.h, 3, fieldH, [c.head], { bg: BG }));

  parts.push(ruleLine(TOP.ruleTop, 70, W - 70, c.head, 1.6, 0.7));
  parts.push(ruleLine(TOP.ruleBottom, 70, W - 70, c.head, 1.6, 0.7));
  parts.push(diamondRow(540, TOP.diamonds, 5, 34, 9, c.head, { plus: true }));

  // The cloth window, or woven geometry when there is no photo.
  parts.push(
    photoDataUrl
      ? framedPhoto(x, y, w, h, r, photoDataUrl, c.head, c.accent)
      : framedEmpty(x, y, w, h, r, c.head, windowMotif(L, c.head, c.accent), {
          fill: "#0B0F26",
          fillOpacity: 0.55,
        }),
  );

  // Clay brackets on the outer keyline — the cloth binding.
  parts.push(cornerBracket(x - 15, y - 15, 36, 0, c.accent, 3));
  parts.push(cornerBracket(x + w + 15, y - 15, 36, 90, c.accent, 3));
  parts.push(cornerBracket(x + w + 15, y + h + 15, 36, 180, c.accent, 3));
  parts.push(cornerBracket(x - 15, y + h + 15, 36, 270, c.accent, 3));

  return parts.join("\n");
}

export const asoOkeHeritage: FlyerTemplate = {
  spec: asoOkeHeritageSpec,
  build(data: FlyerData, photoDataUrl: string | null): TemplateRender {
    const c: Ink = {
      // Dark cloth: adopt the couple's colour for headings when it reads on
      // indigo (text gate 3+); ornaments use the softer art floor. Their primary
      // still appears in the weaving either way.
      head: pickArtColor(BG, [data.theme.accent, data.theme.primary], GOLD, 3),
      accent: pickArtColor(BG, [data.theme.primary], CLAY, 2.2),
      ink: CREAM,
    };
    const cloth = [
      data.theme.primary || "#8E2B3A",
      GOLD,
      "#8E2B3A",
      CREAM,
      data.theme.accent || GOLD,
      "#C2664A",
      "#2E6B63",
    ];
    const lower = sectionList(data, c);
    const headBottom =
      TOP.head +
      hierarchyHeight(data, { width: W - 180, familySize: 23, introSize: 21, nameSize: 80, inviteSize: 24, gap: 22 });
    const L = layout(headBottom, lower.length);
    return { art: renderArt(photoDataUrl, L, c, cloth), text: renderText(data, L, lower, c) };
  },
};
