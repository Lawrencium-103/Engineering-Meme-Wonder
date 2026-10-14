/**
 * Verifies the landing page still renders correctly on a phone and under
 * `prefers-reduced-motion: reduce` after the cinematic-motion work.
 * Usage: node scripts/motion-reduced-mobile.mjs
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const OUT = ".e2e";
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch();

/* ---- phone ---- */
const mobile = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 1,
});
const mp = await mobile.newPage();
const errors = [];
mp.on("console", (m) => m.type() === "error" && errors.push(m.text()));
mp.on("pageerror", (e) => errors.push(String(e)));
await mp.goto(BASE + "/", { waitUntil: "networkidle", timeout: 120_000 });
await mp.waitForTimeout(1500);
await mp.screenshot({ path: `${OUT}/landing-mobile-hero.png` });

console.log("=== mobile 390x844 ===");
console.log(
  await mp.evaluate(() => {
    const bar = document.querySelector("header");
    const brand = bar.querySelector("a");
    const overflow = document.documentElement.scrollWidth > window.innerWidth;
    return {
      horizontalOverflow: overflow,
      docHeight: document.documentElement.scrollHeight,
      headerBg: getComputedStyle(bar).backgroundColor,
      brandVisible: brand.getBoundingClientRect().height > 0,
      tierColumns: getComputedStyle(document.querySelector(".tier-card").parentElement)
        .gridTemplateColumns.split(" ").length,
    };
  }),
);

/* ---- scroll sweep ----
   A `fullPage` screenshot cannot represent this page: Playwright resizes the
   whole document instead of scrolling it, so every `animation-timeline: view()`
   reveal collapses and the capture comes back blank. Sweep the real phone
   viewport instead and prove each section is genuinely visible as it arrives. */
const docHeight = await mp.evaluate(() => document.documentElement.scrollHeight);
const viewport = 844;
const stops = [];
for (let y = 0; y <= docHeight - viewport; y += 700) stops.push(y);
if (stops[stops.length - 1] !== docHeight - viewport) stops.push(docHeight - viewport);

console.log("\n=== mobile scroll sweep ===");
let staleInView = 0;
for (let i = 0; i < stops.length; i++) {
  const top = stops[i];
  await mp.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), top);
  // Scroll-driven animations live on the compositor; wait two real frames.
  await mp.evaluate(
    () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
  );
  await mp.waitForTimeout(200);

  const state = await mp.evaluate(() => {
    const els = [...document.querySelectorAll(".reveal")];
    return els.map((el, idx) => {
      const r = el.getBoundingClientRect();
      // How much of the element is genuinely on screen right now.
      const shown = Math.max(0, Math.min(r.bottom, innerHeight) - Math.max(r.top, 0));
      const frac = shown / Math.max(1, Math.min(r.height, innerHeight));
      return {
        idx,
        op: Number(getComputedStyle(el).opacity),
        shown: Math.round(shown),
        frac: Number(frac.toFixed(2)),
        inView: r.top < innerHeight && r.bottom > 0,
        text: (el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 42),
      };
    });
  });
  const inView = state.filter((s) => s.inView);
  // A section mid-entrance (just peeking in at the bottom edge) is expected to be
  // faded; one that is substantially on screen and still faded would be a bug.
  const faded = inView.filter((s) => s.op < 0.9);
  const stuck = faded.filter((s) => s.frac > 0.25);
  staleInView += stuck.length;
  console.log(
    `scroll ${String(top).padStart(5)} | reveal in-view ${inView.length}/${state.length}` +
      ` | in-view-but-faded: ${faded.length} | substantially-shown-but-faded: ${stuck.length}` +
      ` | fully invisible: ${state.filter((s) => s.op < 0.05).length}`,
  );
  for (const s of faded) {
    console.log(
      `    · #${s.idx} op=${s.op.toFixed(2)} ${s.shown}px shown (${Math.round(
        s.frac * 100,
      )}% of it visible) “${s.text}”`,
    );
  }
  await mp.screenshot({
    path: `${OUT}/mobile-scroll-${String(i + 1).padStart(2, "0")}.png`,
  });
}
console.log(`substantially-shown-but-faded across all stops: ${staleInView}`);

await mobile.close();

/* ---- full-page layout, captured with motion off so nothing is mid-reveal ---- */
const flat = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 1,
  reducedMotion: "reduce",
});
const fp = await flat.newPage();
await fp.goto(BASE + "/", { waitUntil: "networkidle", timeout: 120_000 });
await fp.waitForTimeout(600);
await fp.screenshot({ path: `${OUT}/landing-mobile-full.png`, fullPage: true });
await flat.close();

/* ---- reduced motion ---- */
const rm = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  reducedMotion: "reduce",
});
const rp = await rm.newPage();
await rp.goto(BASE + "/", { waitUntil: "networkidle", timeout: 120_000 });
await rp.waitForTimeout(900);

console.log("\n=== prefers-reduced-motion: reduce ===");
console.log(
  await rp.evaluate(() => {
    const read = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const cs = getComputedStyle(el);
      return { display: cs.display, opacity: cs.opacity, transform: cs.transform };
    };
    return {
      heroSlides: [...document.querySelectorAll(".hero-slide")].map(
        (el) => getComputedStyle(el).opacity,
      ),
      heroStage: read(".hero-stage"),
      heroRise: read(".hero-rise"),
      progress: read(".scroll-progress"),
      sheen: read(".hero-sheen"),
      tierRule: read(".rule-draw"),
      pass: read(".parallax-soft"),
      h1Visible: document.querySelector("h1").getBoundingClientRect().height > 0,
    };
  }),
);
await rp.screenshot({ path: `${OUT}/landing-reduced-motion.png` });
await rm.close();

console.log("\nconsole errors:", errors.length ? errors.slice(0, 5) : "none");
await browser.close();