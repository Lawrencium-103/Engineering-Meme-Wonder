import { h, type El } from "../h";
import {
  arabesqueBand,
  framedEmpty,
  framedPhoto,
  gradientBackground,
  insetKeylines,
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
import { nikahSpec } from "../catalog-meta";

/**
 * NG-011 — Nikah.
 *
 * Islamic ceremony design: a deep teal ground, an eight-point arabesque star
 * medallion, and repeating arabesque bands top and foot. Gold-on-teal, the
 * classic nikah palette, with the couple's colour adopted only when bright
 * enough to hold on the dark ground.
 *
 * Host-first hierarchy, same as every catalog design.
 */

const W = 1080;
const H = 1920;
const BG_TOP = "#14453F";
const BG_BOT = "#0A2A26";
const FALLBACK_GOLD = "#C9A86A";
const FALLBACK_CREAM = "#E6D9B8";

const PHOTO = { y: 700, w: 480, h: 480 };

const TOP = {
  inset: 48,
  band: 118,
  monogram: 216,
  hashtag: 358,
  head: 414,
  bottom: 1802,
} as const;

const PHOTO_FLOOR_BOTTOM = 1460;

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
    photo: { x, y, w, h, r: Math.round(w * 0.5) },
    lower: { top: y + h + 44, bottom: TOP.bottom },
  };
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

/** Arabesque star inside the round photo-less window. */
function windowMotif(L: Layout, primary: string): string {
  const cx = L.photo.x + L.photo.w / 2;
  const cy = L.photo.y + L.photo.h / 2;
  const s = L.photo.w / PHOTO.w;
  // Re-implement a single star here rather than importing arabesque (band
  // helper already covers the borders); keeps the window self-contained.
  const r = 120 * s;
  const pts = (rot: number) => {
    const rad = (rot * Math.PI) / 180;
    const side = r * 0.62;
    return [0, 1, 2, 3]
      .map((i) => {
        const a = rad + (i * Math.PI) / 2;
        return `${(cx + Math.cos(a) * side).toFixed(1)},${(cy + Math.sin(a) * side).toFixed(1)}`;
      })
      .join(" ");
  };
  return `<g fill="none" stroke="${primary}" stroke-width="2" stroke-linejoin="round">
    <polygon points="${pts(0)}"/>
    <polygon points="${pts(45)}"/>
    <circle cx="${cx}" cy="${cy}" r="${r * 0.22}" stroke-opacity="0.85"/>
    <circle cx="${cx}" cy="${cy}" r="${r * 0.44}" stroke-opacity="0.4"/>
  </g>`;
}

function renderArt(photoDataUrl: string | null, L: Layout, c: Ink): string {
  const parts: string[] = [];
  const { x, y, w, h, r } = L.photo;

  parts.push(gradientBackground(W, H, "avfNikahGround", [
    { offset: 0, color: BG_TOP },
    { offset: 60, color: "#0F3833" },
    { offset: 100, color: BG_BOT },
  ]));

  // Arabesque bands, top and foot.
  parts.push(arabesqueBand(0, TOP.band, W, 92, 30, c.primary, 1.6));
  parts.push(arabesqueBand(0, H - TOP.band, W, 92, 30, c.primary, 1.6));

  // A quiet gold keyline inside the bands.
  parts.push(insetKeylines(W, H, TOP.inset, c.primary, c.accent, 1.6, 0.8));

  // Small star at the monogram baseline — the seal.
  parts.push(ringCircle(W / 2, TOP.monogram - 40, 34, c.primary, 1.6, 0.8));

  parts.push(
    photoDataUrl
      ? framedPhoto(x, y, w, h, r, photoDataUrl, c.primary, c.accent)
      : framedEmpty(x, y, w, h, r, c.primary, windowMotif(L, c.primary), {
          fill: "#000000",
          fillOpacity: 0.22,
        }),
  );

  return parts.join("\n");
}

export const nikah: FlyerTemplate = {
  spec: nikahSpec,
  build(data: FlyerData, photoDataUrl: string | null): TemplateRender {
    const primary = pickArtColor(BG_TOP, [data.theme.primary], FALLBACK_GOLD, 3.0);
    const accent = pickArtColor(BG_TOP, [data.theme.accent], FALLBACK_CREAM, 2.4);
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
