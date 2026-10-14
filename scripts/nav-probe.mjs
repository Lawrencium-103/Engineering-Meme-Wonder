/**
 * Replicate the E2E navigation order on a single page and report warnings per URL.
 * Usage: node scripts/nav-probe.mjs
 */
import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 430, height: 900 } });

const seen = [];
page.on("console", async (m) => {
  if (m.type() === "error" && m.text().includes("hydrated")) {
    let tree = "";
    try {
      const args = await Promise.all(m.args().map((a) => a.jsonValue().catch(() => null)));
      tree = args.map((a) => (typeof a === "string" ? a : JSON.stringify(a))).join(" | ");
    } catch {
      /* ignore */
    }
    seen.push(`@${page.url()} :: ${tree.slice(0, 900)}`);
  }
});

await page.goto("http://localhost:3000/", { waitUntil: "networkidle" });
await page.waitForTimeout(1500);
console.log("after / : warnings so far =", seen.length);

await page.goto("http://localhost:3000/studio", { waitUntil: "networkidle" });
await page.waitForTimeout(3000);
console.log("after /studio : warnings so far =", seen.length);

console.log("--- details ---");
seen.forEach((s) => console.log(s + "\n"));
await browser.close();
