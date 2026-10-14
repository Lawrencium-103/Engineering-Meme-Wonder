/** Which routes trigger a hydration warning? Usage: node scripts/hydration-scan.mjs */
import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const routes = ["/", "/studio", "/auth/check-email", "/w/demo-wedding-9kumu"];
const browser = await chromium.launch();

for (const route of routes) {
  const page = await browser.newPage();
  let hydration = 0;
  page.on("console", (m) => {
    if (m.type() === "error" && m.text().includes("hydrated")) hydration++;
  });
  page.on("pageerror", () => {});
  try {
    await page.goto(BASE + route, { waitUntil: "networkidle", timeout: 60000 });
    await page.waitForTimeout(2500);
  } catch {
    /* ignore nav errors */
  }
  console.log(`${route} -> hydration warnings: ${hydration}`);
  await page.close();
}

await browser.close();
