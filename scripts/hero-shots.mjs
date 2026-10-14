/**
 * Capture the hero at each of the three slides (crossfade + Ken Burns) on
 * desktop and mobile, so every downloaded image can be judged in context.
 * The CSS cycle holds each slide 7s in a 21s loop.
 */
import { chromium } from "playwright";

const BASE = process.env.BASE ?? "http://localhost:3000";
const OUT = ".e2e";
const HOLDS = [1200, 8200, 15200]; // just after each slide settles

const browser = await chromium.launch();

for (const [name, viewport, isMobile] of [
  ["desktop", { width: 1440, height: 900 }, false],
  ["mobile", { width: 390, height: 844 }, true],
]) {
  const ctx = await browser.newContext({
    viewport,
    deviceScaleFactor: isMobile ? 2 : 1,
    isMobile,
    hasTouch: isMobile,
  });
  const page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push(String(e)));
  await page.goto(BASE + "/", { waitUntil: "networkidle", timeout: 120_000 });
  await page.waitForTimeout(600);

  const start = Date.now();
  for (let i = 0; i < HOLDS.length; i++) {
    const wait = HOLDS[i] - (Date.now() - start);
    if (wait > 0) await page.waitForTimeout(wait);
    // Screenshot only the hero region, not the fixed header overlay.
    await page.screenshot({
      path: `${OUT}/hero-${name}-slide${i + 1}.png`,
      clip: { x: 0, y: 0, ...viewport },
    });
    console.log(`${name} slide ${i + 1} captured`);
  }
  console.log(`${name} page errors:`, errs.length ? errs.slice(0, 3) : "none");
  await ctx.close();
}

await browser.close();
