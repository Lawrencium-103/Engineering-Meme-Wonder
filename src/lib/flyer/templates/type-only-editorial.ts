import { h, type El } from "../h";
import { cornerBracket, divider, diamondRow, ruleLine, warpTexture } from "../art";
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
import { typeOnlyEditorialSpec } from "../catalog-meta";

/**
 * NG-010 — Type-Only Editorial.
 *
 * No photo, no illustration. Pure typography: an oversized script monogram, a
 * hard-edged rule system, and generous tracking on every label. The ground
 * tints toward the couple's primary so their colour reaches the field. Craft
 * comes entirely from type scale, rules and space — the anti-template.
 *
 * Host-first hierarchy, same as every catalog design.
 */

const W = 1080;
const H = 1920;
const DEFAULT_BG = "#F4F1EA";
const INK_FALLBACK = "#1A1A1A";
const CLAY = "#8C7B5A";

const TOP = {
  inset: 60,
  monogram: 268,
  monogramSize: 210,
  hashtag: 508,
  head: 566,
  bottom: 1812,
} as const;

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
      titleSize: 18,
      dateSize: 24,
      venueSize: 22,
      gap: 14,
      ruleWidth: 240,
    }),
    paletteSection(data, { ink: c.ink, eyebrowSize: 15, swatchSize: 30, swatchLabelSize: 14, gap: 24 }),
    scriptureSection(data, { ink: c.ink, size: 21 }),
    rsvpSection(data, { ink: c.ink, accent: c.accent, labelSize: 14, valueSize: 19, ruleWidth: 200 }),
    closingSection(data, { ink: c.ink, size: 22 }),
  ].filter((s): s is El => s !== null);
}

function renderArt(c: Ink): string {
  const parts: string[] = [];

  parts.push(`<rect width="${W}" height="${H}" fill="${c.bg}"/>`);
  // Faint warp threads — texture without illustration.
  parts.push(warpTexture(W, H, c.ink, 15, 0.04));

  // Hard-edge corner brackets — the editorial frame.
  const b = TOP.inset;
  const bs = 92;
  parts.push(cornerBracket(b, b, bs, 0, c.primary, 3));
  parts.push(cornerBracket(W - b, b, bs, 90, c.primary, 3));
  parts.push(cornerBracket(W - b, H - b, bs, 180, c.primary, 3));
  parts.push(cornerBracket(b, H - b, bs, 270, c.primary, 3));

  // Stacked hairline rules under the monogram — the type-system spine.
  parts.push(ruleLine(TOP.hashtag + 30, 200, W - 200, c.primary, 2.4, 0.9));
  parts.push(ruleLine(TOP.hashtag + 40, 200, W - 200, c.accent, 1, 0.5));

  // A row of small diamonds as the only ornament.
  parts.push(diamondRow(W / 2, TOP.monogram - 46, 3, 44, 9, c.accent, { opacity: 0.85 }));

  // Closing rule above the foot.
  parts.push(ruleLine(H - 130, 200, W - 200, c.primary, 1.2, 0.4));

  return parts.join("\n");
}

export const typeOnlyEditorial: FlyerTemplate = {
  spec: typeOnlyEditorialSpec,
  build(data: FlyerData, _photoDataUrl: string | null): TemplateRender {
    const bg = tintGround(DEFAULT_BG, data.theme.primary, 0.08);
    const c: Ink = {
      bg,
      primary: pickArtColor(bg, [data.theme.primary], INK_FALLBACK, 4),
      accent: pickArtColor(bg, [data.theme.accent], CLAY, 2.2),
      ink: this.spec.palette.text,
    };

    const lower = sectionList(data, c);
    const headBottom =
      TOP.head +
      hierarchyHeight(data, { width: W - 200, familySize: 28, introSize: 25, nameSize: 92, inviteSize: 26, gap: 28 });
    const lowerTop = headBottom + 48;
    const band = lowerBand(lower, { top: lowerTop, bottom: TOP.bottom }, 3);

    const blocks = [
      monogramBlock(data, { top: TOP.monogram, color: c.primary, size: TOP.monogramSize, tracking: 4 }),
      hashtagBlock(data, { top: TOP.hashtag, color: c.accent, size: 19, tracking: 9 }),
      hierarchyBlock(data, {
        top: TOP.head,
        ink: c.ink,
        primary: c.primary,
        accent: c.accent,
        familySize: 28,
        introSize: 25,
        nameSize: 92,
        ampSize: 54,
        inviteSize: 26,
        gap: 28,
        pad: 100,
      }),
      band,
      divider(W / 2, H - 118, 120, c.accent),
    ].filter((b): b is El => b !== null);

    return {
      art: renderArt(c),
      text: h("div", { width: W, height: H, display: "flex", position: "relative" }, blocks),
    };
  },
};
