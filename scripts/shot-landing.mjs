// Landing page visual + console check.
// Usage: node scripts/shot-landing.mjs
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const OUT = ".e2e";

const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844 },
];

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch();

  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();

    const errors = [];
    page.on("console", (m) => {
      if (m.type() === "error" || m.type() === "warning") {
        errors.push(`${m.type()}: ${m.text()}`);
      }
    });
    page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));

    await page.goto(BASE, { waitUntil: "networkidle" });
    await page.waitForTimeout(1800); // let the hero reveal finish

    // Hero only
    await page.screenshot({ path: `${OUT}/landing-${vp.name}-hero.png` });

    // Full page
    await page.screenshot({
      path: `${OUT}/landing-${vp.name}-full.png`,
      fullPage: true,
    });

    const h1 = (await page.locator("h1").first().innerText()).replace(/\s+/g, " ");
    const ctaCount = await page
      .getByRole("link", { name: /Craft Your Wedding Suite/i })
      .count();
    const belowFold = await page
      .locator("text=Most chosen")
      .first()
      .isVisible();

    console.log(`--- ${vp.name} ---`);
    console.log(`h1: ${h1}`);
    console.log(`CTA links matching "Craft Your Wedding Suite": ${ctaCount}`);
    console.log(`tiers rendered: ${belowFold}`);
    console.log(
      `console issues: ${errors.length ? errors.slice(0, 6).join(" | ") : "none"}`,
    );

    await context.close();
  }

  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
