/**
 * Landing-page regression probe for the three reported defects:
 *   1. the solid-gold CTA smearing through the translucent fixed header
 *   2. dead space between the tier cards and the closing section
 *   3. scroll-driven motion actually being applied (not just entrance fades)
 *
 * Also refreshes .e2e/scroll-NN.png so the fix can be eyeballed.
 * Usage: node scripts/motion-audit.mjs
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const OUT = ".e2e";

const browser = await chromium.launch();
await mkdir(OUT, { recursive: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const errors = [];
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
page.on("pageerror", (e) => errors.push(String(e)));

await page.goto(BASE + "/", { waitUntil: "networkidle", timeout: 120_000 });
await page.waitForTimeout(1200);

const toTop = async (y) => {
  await page.evaluate((top) => window.scrollTo({ top, behavior: "instant" }), y);
  // Scroll-driven animations live on the compositor; wait for two real frames or
  // getComputedStyle returns the pre-scroll values.
  await page.evaluate(
    () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
  );
};
const matrices = () =>
  page.evaluate(() => {
    const read = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const cs = getComputedStyle(el);
      return {
        transform: cs.transform,
        opacity: Number(cs.opacity).toFixed(2),
        timeline: el.getAnimations().some((a) => a.timeline !== null),
      };
    };
    return {
      heroStage: read(".hero-stage"),
      heroRise: read(".hero-rise"),
      progress: read(".scroll-progress"),
      pass: read(".parallax-soft"),
      tierRule: read(".rule-draw"),
    };
  });

console.log("=== environment ===");
console.log(
  await page.evaluate(() => ({
    scrollTimeline: CSS.supports("animation-timeline: scroll()"),
    docHeight: document.documentElement.scrollHeight,
  })),
);

/* ---- defect 1: header must be effectively opaque + scrim present ---- */
console.log("\n=== defect 1: header smear ===");
await toTop(0);
const header = await page.evaluate(() => {
  const bar = document.querySelector("header");
  const scrim = bar?.nextElementSibling;
  return {
    headerBg: getComputedStyle(bar).backgroundColor,
    backdrop: getComputedStyle(bar).backdropFilter,
    zIndex: getComputedStyle(bar).zIndex,
    progressRule: Boolean(bar.querySelector(".scroll-progress")),
    scrimGradient: scrim ? getComputedStyle(scrim).backgroundImage.slice(0, 46) : null,
    scrimPointerEvents: scrim ? getComputedStyle(scrim).pointerEvents : null,
  };
});
console.log(header);

/* ---- defect 2: gap between tier cards and closing content ---- */
console.log("\n=== defect 2: dead space ===");
const gap = await page.evaluate(() => {
  const card = document.querySelector(".tier-card");
  const tiers = card.closest("section");
  const love = [...document.querySelectorAll("p")].find(
    (p) => p.textContent.trim() === "with love",
  );
  const tiersBottom = tiers.getBoundingClientRect().bottom + window.scrollY;
  const loveTop = love.getBoundingClientRect().top + window.scrollY;
  const closing = love.closest("section");
  return {
    tiersPaddingBottom: getComputedStyle(tiers).paddingBottom,
    closingPaddingTop: getComputedStyle(closing).paddingTop,
    gapPx: Math.round(loveTop - tiersBottom),
  };
});
console.log(gap);

/* ---- theme 3: is the motion scroll-linked? ---- */
console.log("\n=== scroll-linked motion ===");
const STOPS = [0, 300, 600, 900, 1200, 1600, 2100, 2600, 3010];
const samples = [];
for (const stop of STOPS) {
  await toTop(stop);
  samples.push({ stop, ...(await matrices()) });
}

for (const key of ["heroStage", "heroRise", "progress", "pass", "tierRule"]) {
  console.log(`\n${key}`);
  for (const s of samples) {
    const v = s[key];
    const ty = v ? v.transform.split(",").pop().replace(")", "").trim() : "n/a";
    const sx = v ? v.transform.split(",")[0].replace("matrix(", "").trim() : "n/a";
    console.log(
      `  scroll ${String(s.stop).padStart(4)} | y=${String(ty).padStart(10)} | x-scale=${String(sx).padStart(8)} | opacity=${v ? v.opacity : "n/a"}`,
    );
  }
}

/* ---- refresh the visual audit stops ---- */
console.log("\n=== screenshots ===");
const metrics = await page.evaluate(() => ({
  docHeight: document.documentElement.scrollHeight,
}));
const height = 900;
const steps = Math.ceil(metrics.docHeight / height);
for (let i = 1; i <= steps; i++) {
  const y = Math.min(i * height, metrics.docHeight - height);
  await toTop(y);
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/scroll-${String(i).padStart(2, "0")}.png` });
}
await toTop(0);
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}/landing-desktop-hero.png` });
await page.screenshot({ path: `${OUT}/landing-desktop-full.png`, fullPage: true });
console.log(`scroll stops captured: ${steps} | doc height: ${metrics.docHeight}`);
console.log("console errors:", errors.length ? errors.slice(0, 5) : "none");

await browser.close();