import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { FONT_FAMILIES, loadFonts } from "./fonts";
import { loadImageDataUrl, photoFrameUrl } from "./photo";
import type { El } from "./h";
import type { FlyerData, FlyerTemplate } from "./types";

/**
 * The flyer render engine.
 *
 * Two layers, one document:
 *   1. ART  — a full-fidelity SVG fragment (gradients, filters, clip paths, the
 *             masked photo) that resvg renders natively.
 *   2. TEXT — a Satori element tree, converted to vector <path> output so it is
 *             pixel-sharp at any scale and never depends on runtime fonts.
 * The layers are merged and rasterised as ONE SVG by resvg.
 *
 * No new runtime dependencies, no headless browser: both libraries are already
 * in the stack (they render the guest pass + OG image today).
 */

/** Satori → SVG string (text becomes <path>; embedFont defaults to true). */
export async function textLayerSvg(
  el: El,
  width: number,
  height: number,
): Promise<string> {
  const fonts = await loadFonts();
  return satori(el as never, {
    width,
    height,
    fonts: [
      { name: FONT_FAMILIES.serif, data: fonts.serif, weight: 600, style: "normal" },
      { name: FONT_FAMILIES.script, data: fonts.script, weight: 400, style: "normal" },
      { name: FONT_FAMILIES.sans, data: fonts.sans, weight: 400, style: "normal" },
      { name: FONT_FAMILIES.scriptAlt, data: fonts.scriptAlt, weight: 400, style: "normal" },
      { name: FONT_FAMILIES.scriptFlourish, data: fonts.scriptFlourish, weight: 400, style: "normal" },
      { name: FONT_FAMILIES.serifDisplay, data: fonts.serifDisplay, weight: 400, style: "normal" },
    ],
  });
}

/** Merge the SVG art fragment with Satori's text layer into one document. */
export function composeFlyerSvg(
  art: string,
  textSvg: string,
  width: number,
  height: number,
): string {
  const start = textSvg.indexOf(">") + 1;
  const end = textSvg.lastIndexOf("</svg>");
  const inner = start > 0 && end > start ? textSvg.slice(start, end) : "";
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ` +
    `width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
    art +
    `<g>${inner}</g>` +
    `</svg>`
  );
}

/** Rasterise at `scale`× (2 = print-grade) with resvg. */
export function rasterize(svg: string, width: number, scale = 2): Buffer {
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: Math.round(width * scale) },
    font: { loadSystemFonts: false },
  });
  return Buffer.from(resvg.render().asPng());
}

export interface RenderOptions {
  /** Output scale relative to the template canvas. Default 2 (print-grade). */
  scale?: number;
}

/**
 * Render a flyer to a high-resolution PNG buffer.
 * The photo is pre-cropped on Cloudinary (face-aware, 2×) and inlined as a data
 * URI so the render itself never touches the network.
 */
export async function renderFlyer(
  template: FlyerTemplate,
  data: FlyerData,
  opts: RenderOptions = {},
): Promise<Buffer> {
  const { width, height } = template.spec.canvas;
  const scale = opts.scale ?? 2;

  let photoDataUrl: string | null = null;
  if (data.photoUrl) {
    const frame = template.spec.photoFrame;
    const url = frame
      ? photoFrameUrl(data.photoUrl, Math.round(frame.w * 2), Math.round(frame.h * 2))
      : data.photoUrl;
    photoDataUrl = await loadImageDataUrl(url);
  }

  const { art, text } = template.build(data, photoDataUrl);
  const textSvg = await textLayerSvg(text, width, height);
  const composed = composeFlyerSvg(art, textSvg, width, height);
  return rasterize(composed, width, scale);
}

/** Also expose the raw SVG (for a future PDF export / debugging). */
export async function renderFlyerSvg(
  template: FlyerTemplate,
  data: FlyerData,
): Promise<string> {
  const { width, height } = template.spec.canvas;
  let photoDataUrl: string | null = null;
  if (data.photoUrl) {
    const frame = template.spec.photoFrame;
    const url = frame
      ? photoFrameUrl(data.photoUrl, Math.round(frame.w * 2), Math.round(frame.h * 2))
      : data.photoUrl;
    photoDataUrl = await loadImageDataUrl(url);
  }
  const { art, text } = template.build(data, photoDataUrl);
  const textSvg = await textLayerSvg(text, width, height);
  return composeFlyerSvg(art, textSvg, width, height);
}
