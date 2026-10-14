import { h, type El } from "../h";
import {
  archFrame,
  archPhoto,
  cornerFlourish,
  doubleBorder,
  paperBackground,
  rings,
  sprig,
} from "../art";
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
import { royalBurgundySpec } from "../catalog-meta";

/**
 * NG-001 — Royal Burgundy.
 *
 * Ivory paper, deep burgundy rule work and gold accents. The couple's own
 * colours drive every accent (frames, ornaments, rings, names), so the design
 * adapts to their theme without the layout moving a millimetre.
 *
 * Reading order (Nigerian invitation hierarchy): monogram → hashtag →
 * BRIDE'S PARENTS → GROOM'S PARENTS → intro line → couple → invitation
 * message → photo → ceremonies → colours → scripture → RSVP → closing.
 */

const W = 1080;
const H = 1920;

/** The photo box at its base size. Growth is uniform, so the frame's aspect —
 *  and therefore the Cloudinary pre-crop declared in `spec.photoFrame` —
 *  never changes. */
const PHOTO = { y: 660, w: 460, h: 508 };

/** Fixed anchors. The artwork's ornaments are pinned to these exact lines. */
const TOP = {
  inset: 44,
  sprig: { cx: 540, cy: 150, scale: 0.9 },
  rings: { cx: 540, cy: 228, r: 26 },
  monogram: 258,
  hashtag: 352,
  head: 404,
  bottom: 1802,
  sprigBottom: { cx: 540, cy: 1852, scale: 0.42 },
} as const;

/** Lowest the photo may bottom out, so the lower band keeps breathing room. */
const PHOTO_FLOOR_BOTTOM = 1500;

interface Layout {
  photo: { x: number; y: number; w: number; h: number; r: number };
  lower: { top: number; bottom: number };
}

/**
 * Lay the card out for the amount of content it actually has.
 *
 * The head block (parents + names + invitation) flows downward, so the photo
 * starts BELOW whatever that block occupies — never on top of it. A sparse
 * card would otherwise leave a hole in the middle, so the arch GROWS into the
 * freed space instead of the composition collapsing.
 */
function layout(headBottom: number, lowerCount: number): Layout {
  const grow = lowerCount >= 4 ? 1 : lowerCount === 3 ? 1.06 : lowerCount === 2 ? 1.16 : 1.3;
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
  const photo = { x, y, w, h, r: Math.round(w / 2) };
  return { photo, lower: { top: photo.y + photo.h + 50, bottom: TOP.bottom } };
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
    eventsSection(data, { ink: c.ink, primary: c.primary, accent: c.accent }),
    paletteSection(data, { ink: c.ink }),
    scriptureSection(data, { ink: c.ink }),
    rsvpSection(data, { ink: c.ink, accent: c.accent }),
    closingSection(data, { ink: c.ink }),
  ].filter((s): s is El => s !== null);
}

/** Botanical medallion shown inside the arch when the couple has no photo. */
function archMotif(L: Layout, primary: string): string {
  const cx = L.photo.x + L.photo.w / 2;
  const cy = L.photo.y + L.photo.h / 2 + 60;
  const s = L.photo.w / PHOTO.w;
  return [
    sprig(cx - 122 * s, cy + 44 * s, 1.1 * s, primary, -24),
    sprig(cx + 122 * s, cy + 44 * s, 1.1 * s, primary, 24),
    sprig(cx, cy, 2.2 * s, primary),
  ].join("\n");
}

function renderText(data: FlyerData, L: Layout, lower: El[], c: Ink): El {
  const blocks = [
    monogramBlock(data, { top: TOP.monogram, color: c.primary }),
    hashtagBlock(data, { top: TOP.hashtag, color: c.accent }),
    hierarchyBlock(data, {
      top: TOP.head,
      ink: c.ink,
      primary: c.primary,
      accent: c.accent,
    }),
    lowerBand(lower, L.lower),
  ].filter((b): b is El => b !== null);

  return h("div", { width: W, height: H, display: "flex", position: "relative" }, blocks);
}

function renderArt(photoDataUrl: string | null, L: Layout, c: Ink): string {
  const parts: string[] = [];

  parts.push(paperBackground(W, H, "#F7F1E5", c.ink));
  parts.push(doubleBorder(W, H, TOP.inset, c.primary, c.accent));

  // Corner vines — one motif rotated into each corner.
  parts.push(cornerFlourish(TOP.inset + 22, TOP.inset + 22, 116, 0, c.primary));
  parts.push(cornerFlourish(W - TOP.inset - 22, TOP.inset + 22, 116, 90, c.primary));
  parts.push(cornerFlourish(W - TOP.inset - 22, H - TOP.inset - 22, 116, 180, c.primary));
  parts.push(cornerFlourish(TOP.inset + 22, H - TOP.inset - 22, 116, 270, c.primary));

  // Top + bottom botanical motifs, and the interlocking rings.
  parts.push(sprig(TOP.sprig.cx, TOP.sprig.cy, TOP.sprig.scale, c.primary));
  parts.push(rings(TOP.rings.cx, TOP.rings.cy, TOP.rings.r, c.primary, c.accent));
  parts.push(sprig(TOP.sprigBottom.cx, TOP.sprigBottom.cy, TOP.sprigBottom.scale, c.primary, 180));

  // The photo — masked into an arch, with a soft drop shadow (resvg-only).
  // With no photo the same arch becomes a framed botanical medallion, so the
  // composition keeps its structure instead of collapsing into a void.
  const { x, y, w, h, r } = L.photo;
  parts.push(
    photoDataUrl
      ? archPhoto(x, y, w, h, r, photoDataUrl, c.accent)
      : archFrame(x, y, w, h, r, c.accent, archMotif(L, c.primary)),
  );

  return parts.join("\n");
}

export const royalBurgundy: FlyerTemplate = {
  spec: royalBurgundySpec,
  build(data: FlyerData, photoDataUrl: string | null): TemplateRender {
    const c: Ink = {
      primary: data.theme.primary || this.spec.palette.primary,
      accent: data.theme.accent || this.spec.palette.accent,
      ink: this.spec.palette.text,
    };
    const lower = sectionList(data, c);
    const headBottom = TOP.head + hierarchyHeight(data, { width: W - 192 });
    const L = layout(headBottom, lower.length);
    return { art: renderArt(photoDataUrl, L, c), text: renderText(data, L, lower, c) };
  },
};

