/** Does viewport size change hydration? Usage: node scripts/viewport-probe.mjs */
import { chromium } from "playwright";

const browser = await chromium.launch();
for (const vp of [
  { width: 430, height: 900 },
  { width: 1280, height: 720 },
]) {
  const page = await browser.newPage({ viewport: vp });
  let hydration = 0;
  let detail = "";
  const seen = [];
  page.on("console", async (m) => {
    if (m.type() === "error" && m.text().includes("hydrated")) {
      hydration++;
      try {
        const args = await Promise.all(m.args().map((a) => a.jsonValue().catch(() => null)));
        seen.push(args.map((a) => (typeof a === "string" ? a : JSON.stringify(a))).join(" | "));
      } catch {
        seen.push("(args unavailable)");
      }
    }
  });
  await page.goto("http://localhost:3000/studio", { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);
  detail = seen.join("\n").slice(0, 600);
  console.log(`viewport ${vp.width}x${vp.height} -> warnings: ${hydration}`);
  if (detail) console.log("  detail: " + detail.replace(/\n/g, " "));
  await page.close();
}
await browser.close();
