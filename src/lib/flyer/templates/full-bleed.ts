import { h, type El } from "../h";
import { bleedPhoto, photoScrim, foilGradient, insetKeylines, diamondRow } from "../art";
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
import { fullBleedSpec } from "../catalog-meta";

/**
 * NG-012 — Full Bleed.
 *
 * The photo-forward cinematic design: the couple's photo covers the entire
 * sheet, a graduated scrim keeps every line of type readable, and a gold
 * keyline frames the whole. When there is no photo, a deep onyx ground with
 * the same scrim and keyline stands in — the composition never collapses.
 *
 * Host-first hierarchy, same as every catalog design.
 */

const W = 1080;
const H = 1920;
const FALLBACK_GROUND = "#0B0C10";
const FALLBACK_GOLD = "#D4AF37";

const TOP = {
  inset: 44,
  monogram: 236,
  hashtag: 372,
  head: 428,
  bottom: 1808,
} as const;

interface Ink {
  primary: string;
  accent: string;
  ink: string; // near-white — always over the scrim
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

function renderArt(photoDataUrl: string | null, c: Ink): string {
  const parts: string[] = [];

  // The photo IS the ground — full-bleed, slice-cropped to the canvas.
  if (photoDataUrl) {
    parts.push(bleedPhoto(W, H, photoDataUrl));
  } else {
    parts.push(`<rect width="${W}" height="${H}" fill="${FALLBACK_GROUND}"/>`);
  }

  // Graduated scrim — dark at top and foot, lighter through the middle, so
  // monogram, names and the lower band all sit on readable ground.
  parts.push(photoScrim(W, H, "avfBleedScrim", {
    topOp: photoDataUrl ? 0.62 : 0.4,
    midOp: photoDataUrl ? 0.3 : 0.25,
    bottomOp: photoDataUrl ? 0.78 : 0.6,
  }));

  // Gold keyline framing the whole sheet.
  parts.push(foilGradient("avfBleedFoil", "gold"));
  parts.push(insetKeylines(W, H, TOP.inset, "url(#avfBleedFoil)", c.accent, 2.4, 1));

  // Corner diamonds — the only ornament over the photo.
  const d = TOP.inset;
  for (const [cx, cy] of [[d, d], [W - d, d], [W - d, H - d], [d, H - d]]) {
    parts.push(diamondRow(cx, cy, 1, 0, 9, c.primary, { opacity: 0.9, plus: true }));
  }

  return parts.join("\n");
}

export const fullBleed: FlyerTemplate = {
  spec: fullBleedSpec,
  build(data: FlyerData, photoDataUrl: string | null): TemplateRender {
    // Over the scrim (near-white type on dark) only bright colours survive;
    // fall back to the foil gold so the design never goes muddy.
    const primary = photoDataUrl
      ? pickArtColor("#1A1A1A", [data.theme.primary], "#FFFFFF", 1.6)
      : pickArtColor(FALLBACK_GROUND, [data.theme.primary], FALLBACK_GOLD, 2.4);
    const accent = photoDataUrl ? "#FFFFFF" : FALLBACK_GOLD;
    const c: Ink = { primary, accent, ink: this.spec.palette.text };

    const lower = sectionList(data, c);
    const headBottom =
      TOP.head +
      hierarchyHeight(data, { width: W - 192, familySize: 26, introSize: 24, nameSize: 86, inviteSize: 25, gap: 26 });
    const lowerTop = headBottom + 48;
    const band = lowerBand(lower, { top: lowerTop, bottom: TOP.bottom }, 3);

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
      art: renderArt(photoDataUrl, c),
      text: h("div", { width: W, height: H, display: "flex", position: "relative" }, blocks),
    };
  },
};
