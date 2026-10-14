/** WCAG 2.x relative luminance + contrast ratio helpers. */

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function channel(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** Contrast ratio between two hex colors (1..21). */
export function contrastRatio(a: string, b: string): number {
  const l1 = luminance(a);
  const l2 = luminance(b);
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

export const ALABASTER = "#F9F8F6";
export const ONYX = "#0B0C10";

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

/**
 * Keep a couple's own colour when it actually reads on the design's ground,
 * otherwise swap in the template's house colour.
 *
 * A deep maroon that is perfect on ivory is invisible on indigo, and a couple
 * who picks ivory + blush for a dark cloth design would otherwise get unreadable
 * names. Preferring the values in order keeps the design personalised whenever
 * the colours allow it, and safely legible when they do not.
 */
export function pickReadable(
  bg: string,
  preferred: (string | null | undefined)[],
  fallback: string,
  min = 3,
): string {
  if (!HEX.test(bg)) return fallback;
  for (const c of preferred) {
    if (!c || !HEX.test(c)) continue;
    const ratio = contrastRatio(c, bg);
    if (Number.isFinite(ratio) && ratio >= min) return c;
  }
  return fallback;
}

/** True if `text` on `bg` meets WCAG AA for normal text (4.5:1). */
export function meetsAA(text: string, bg: string): boolean {
  try {
    return contrastRatio(text, bg) >= 4.5;
  } catch {
    return true;
  }
}

function hexToRgbTuple(hex: string): [number, number, number] | null {
  const h = hex.replace("#", "");
  if (h.length !== 6 || !/^[0-9a-f]{6}$/i.test(h)) return null;
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toHex(n: number): string {
  return Math.max(0, Math.min(255, Math.round(n)))
    .toString(16)
    .padStart(2, "0");
}

/**
 * Blend `primary` into `bg` by `amount` (0–1) to produce a subtle ground wash.
 *
 * Lets a couple's own colour reach the dominant paper/ground field — not just
 * the accents — so their theme visibly shapes the whole card. Kept subtle by
 * default (≤ ~0.15) so the template's curated identity still reads, and the
 * text inks (which go through pickReadable) stay legible.
 *
 * Falls back to `bg` if either colour isn't a valid 6-digit hex.
 */
export function tintGround(bg: string, primary: string, amount = 0.08): string {
  const b = hexToRgbTuple(bg);
  const p = hexToRgbTuple(primary);
  if (!b || !p) return bg;
  const a = Math.max(0, Math.min(1, amount));
  const r = b[0] * (1 - a) + p[0] * a;
  const g = b[1] * (1 - a) + p[1] * a;
  const bl = b[2] * (1 - a) + p[2] * a;
  return `#${toHex(r)}${toHex(g)}${toHex(bl)}`;
}

/**
 * A readable LINE colour for non-text art (rules, frames, ornaments) on `bg`.
 *
 * Text stays gated at 4.5:1 via pickReadable; decorative strokes only need to
 * be visible, so a much lower floor (default 2.2) lets a couple's pastel show
 * as delicate linework on light paper instead of being discarded outright.
 * Falls back to `fallback` when nothing readable is available.
 */
export function pickArtColor(
  bg: string,
  preferred: (string | null | undefined)[],
  fallback: string,
  min = 2.2,
): string {
  return pickReadable(bg, preferred, fallback, min);
}
