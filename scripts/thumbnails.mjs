/**
 * Regenerate the Studio template thumbnails.
 *
 * The render engine (satori + resvg + fs) can't run in plain Node because the
 * flyer modules use Next's `@/` aliases, so rendering happens in a dev-only
 * server route. This script just triggers it.
 *
 * Usage: make sure `next dev` is running, then `npm run thumbnails`.
 */
const base = process.env.APP_URL ?? "http://localhost:3000";

const res = await fetch(`${base}/api/flyer/thumbnails`);
if (!res.ok) {
  console.error(`thumbnails failed: HTTP ${res.status} ${await res.text()}`);
  process.exit(1);
}
const data = await res.json();
console.log(`Wrote ${data.count} thumbnails: ${data.files.join(", ")}`);
