import { readFile } from "fs/promises";
import path from "path";

/**
 * Photo handling for flyers.
 *
 * The render must be fully offline + deterministic, so images are loaded as
 * data URIs before rendering (exactly like src/lib/pass.ts does for the pass).
 * Failures return null so a template can fall back to its photo-less layout —
 * a broken photo must never produce a broken flyer.
 */

const cache = new Map<string, string | null>();

function mimeFor(url: string): string {
  const clean = url.split("?")[0].toLowerCase();
  if (clean.endsWith(".png")) return "image/png";
  if (clean.endsWith(".webp")) return "image/webp";
  if (clean.endsWith(".gif")) return "image/gif";
  if (clean.endsWith(".svg")) return "image/svg+xml";
  return "image/jpeg";
}

export async function loadImageDataUrl(
  url: string | null | undefined,
): Promise<string | null> {
  if (!url) return null;
  const cached = cache.get(url);
  if (cached !== undefined) return cached;

  let out: string | null = null;
  try {
    let buf: Buffer;
    if (url.startsWith("/")) {
      // Site-relative (dev uploads / bundled marketing art): read from disk.
      // No self-fetch, so there's no dev-server deadlock.
      buf = await readFile(path.join(process.cwd(), "public", url));
    } else {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`image ${res.status}`);
      buf = Buffer.from(await res.arrayBuffer());
    }
    out = `data:${mimeFor(url)};base64,${buf.toString("base64")}`;
  } catch {
    out = null;
  }
  cache.set(url, out);
  return out;
}

/**
 * Cloudinary delivery URL that pre-crops the photo to the frame's aspect ratio,
 * face-aware, at 2× for print quality. Mirrors blurredUrl() in cloudinary.ts.
 * Non-Cloudinary URLs (local dev paths) are returned unchanged.
 */
export function photoFrameUrl(
  secureUrl: string,
  w: number,
  h: number,
  faceAware = true,
): string {
  const marker = "/upload/";
  const idx = secureUrl.indexOf(marker);
  if (idx === -1) return secureUrl;
  const gravity = faceAware ? "g_face" : "g_auto";
  const transform = `upload/c_fill,${gravity},w_${w},h_${h},dpr_2,q_auto,f_auto/`;
  return secureUrl.slice(0, idx) + "/" + transform + secureUrl.slice(idx + marker.length);
}
