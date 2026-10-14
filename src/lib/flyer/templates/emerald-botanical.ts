import { h, type El } from "../h";
import {
  cornerBracket,
  framedEmpty,
  framedPhoto,
  leafCluster,
  paperBackground,
  ringCircle,
  ruleLine,
  sprig,
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
import { emeraldBotanicalSpec } from "../catalog-meta";

/**
 * NG-002 — Emerald Botanical.
 *
 * A garden card: pale sage paper, deep emerald rule work and a gold keyline.
 * Where NG-001 is an arch, this design is a square "window" wrapped in loose
 * foliage — leaf clusters anchor to the photo box and grow with it, so the
 * frame always sits inside the greenery however much content the couple fills in.
 *
 * Same content sections as every other design (`../sections`); only the art and
 * the style table differ. That is the whole point of the engine.
 */

const W = 1080;
const H = 1920;
const BG = "#F3F7EE";

/** The photo window at its base size. Growth is uniform, so the aspect — and
 *  therefore the Cloudinary pre-crop in `spec.photoFrame` — never changes. */
const PHOTO = { y: 672, w: 520, h: 520 };

/** Fixed anchors. The leaf clusters are pinned to these exact lines. */
const TOP = {
  rule: 92,
  crown: { cx: 540, cy: 162, scale: 0.42 },
  medallion: { cx: 540, cy: 236, r: 74 },
  monogram: 202,
  hashtag: 372,
  head: 428,
  bottom: 1806,
} as const;

/** Lowest the photo may bottom out, so the lower band keeps breathing room. */
const PHOTO_FLOOR_BOTTOM = 1500;

interface Layout {
  photo: { x: number; y: number; w: number; h: number; r: number };
  lower: { top: number; bottom: number };
}

/**
 * Lay the card out for the amount of content it actually has — the same
 * adaptive rule as NG-001, but the photo starts below the flowed head block
 * (parents → names → invitation) so a long family block can never collide.
 */
function layout(headBottom: number, lowerCount: number): Layout {
  const grow = lowerCount >= 4 ? 1 : lowerCount === 3 ? 1.06 : lowerCount === 2 ? 1.14 : 1.24;
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
  const photo = { x, y, w, h, r: 26 };
  return { photo, lower: { top: photo.y + photo.h + 42, bottom: TOP.bottom } };
}

/** Colours resolved for this render: the couple's theme, then the template's. */
interface Ink {
  primary: string;
  accent: string;
  ink: string;
}

/** Every lower section this template knows how to render, in reading order. */
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

/** A leafy medallion shown inside the window when the couple has no photo. */
function windowMotif(L: Layout, primary: string): string {
  const cx = L.photo.x + L.photo.w / 2;
  const cy = L.photo.y + L.photo.h / 2 + 56;
  const s = L.photo.w / PHOTO.w;
  return [
    leafCluster(cx - 118 * s, cy + 30 * s, -46, 0.72 * s, primary),
    leafCluster(cx + 118 * s, cy + 30 * s, 46, 0.72 * s, primary),
    sprig(cx, cy, 1.35 * s, primary),
    ringCircle(cx, cy - 8 * s, 150 * s, primary, 1.6, 0.35),
  ].join("\n");
}

function renderText(data: FlyerData, L: Layout, lower: El[], c: Ink): El {
  const blocks = [
    monogramBlock(data, { top: TOP.monogram, color: c.primary, size: 60 }),
    hashtagBlock(data, { top: TOP.hashtag, color: c.accent, size: 19, tracking: 7 }),
    hierarchyBlock(data, {
      top: TOP.head,
      ink: c.ink,
      primary: c.primary,
      accent: c.accent,
      familySize: 24,
      introSize: 22,
      nameSize: 84,
      inviteSize: 25,
      gap: 24,
    }),
    lowerBand(lower, L.lower, 3),
  ].filter((b): b is El => b !== null);

  return h("div", { width: W, height: H, display: "flex", position: "relative" }, blocks);
}

function renderArt(photoDataUrl: string | null, L: Layout, c: Ink, ground: string): string {
  const parts: string[] = [];
  const { x, y, w, h, r } = L.photo;

  parts.push(paperBackground(W, H, ground, c.ink));

  // Letterpress rules top and bottom, kept clear of the corner foliage.
  parts.push(ruleLine(TOP.rule, 210, W - 210, c.primary, 1.6, 0.9));
  parts.push(ruleLine(TOP.rule + 7, 150, W - 150, c.accent, 1, 0.7));
  parts.push(ruleLine(TOP.bottom + 42, 260, W - 260, c.primary, 1.6, 0.9));
  parts.push(ruleLine(TOP.bottom + 49, 200, W - 200, c.accent, 1, 0.7));

  // Corner foliage — clusters aimed into the page.
  parts.push(leafCluster(126, 132, 135, 0.62, c.primary));
  parts.push(leafCluster(W - 126, 132, -135, 0.62, c.primary));
  parts.push(leafCluster(126, H - 128, 45, 0.68, c.primary));
  parts.push(leafCluster(W - 126, H - 128, -45, 0.68, c.primary));

  // The medallion the monogram sits inside.
  parts.push(
    leafCluster(TOP.crown.cx, TOP.crown.cy, 0, TOP.crown.scale, c.primary, { spread: 34 }),
  );
  parts.push(ringCircle(TOP.medallion.cx, TOP.medallion.cy, TOP.medallion.r, c.primary, 2.2, 0.9));
  parts.push(
    ringCircle(TOP.medallion.cx, TOP.medallion.cy, TOP.medallion.r - 9, c.accent, 1, 0.6),
  );

  // Foliage hugging the window — anchored to the frame, so it travels with it.
  // Four clusters a side, fanning outward, so the window reads as planted in
  // greenery rather than as a box with two arrows beside it.
  const side: { t: number; rot: number; scale: number; off: number }[] = [
    { t: 0.24, rot: 56, scale: 0.55, off: 4 },
    { t: 0.44, rot: 76, scale: 0.64, off: 8 },
    { t: 0.64, rot: 104, scale: 0.66, off: 8 },
    { t: 0.82, rot: 124, scale: 0.57, off: 4 },
  ];
  for (const s of side) {
    parts.push(
      leafCluster(x - s.off, y + h * s.t, -s.rot, s.scale, c.primary, { spread: 24 }),
    );
    parts.push(
      leafCluster(x + w + s.off, y + h * s.t, s.rot, s.scale, c.primary, { spread: 24 }),
    );
  }

  // The photo window, or a leafy medallion when there is no photo.
  parts.push(
    photoDataUrl
      ? framedPhoto(x, y, w, h, r, photoDataUrl, c.primary, c.accent)
      : framedEmpty(x, y, w, h, r, c.primary, windowMotif(L, c.primary)),
  );

  // Gold corner ticks on the outer keyline.
  parts.push(cornerBracket(x - 15, y - 15, 40, 0, c.accent, 3));
  parts.push(cornerBracket(x + w + 15, y - 15, 40, 90, c.accent, 3));
  parts.push(cornerBracket(x + w + 15, y + h + 15, 40, 180, c.accent, 3));
  parts.push(cornerBracket(x - 15, y + h + 15, 40, 270, c.accent, 3));

  return parts.join("\n");
}

export const emeraldBotanical: FlyerTemplate = {
  spec: emeraldBotanicalSpec,
  build(data: FlyerData, photoDataUrl: string | null): TemplateRender {
    const c: Ink = {
      // On pale paper a couple's own deep colour reads as text (gate 4.5);
      // the accent/ornament ink uses the softer art floor so pastels show.
      primary: pickArtColor(BG, [data.theme.primary], this.spec.palette.primary, 4.5),
      accent: pickArtColor(BG, [data.theme.accent], this.spec.palette.accent, 2.2),
      ink: this.spec.palette.text,
    };
    const lower = sectionList(data, c);
    const headBottom =
      TOP.head + hierarchyHeight(data, { width: W - 192, familySize: 24, introSize: 22, nameSize: 84, inviteSize: 25, gap: 24 });
    const L = layout(headBottom, lower.length);
    const ground = tintGround(BG, data.theme.primary, 0.07);
    return { art: renderArt(photoDataUrl, L, c, ground), text: renderText(data, L, lower, c) };
  },
};
