/** Focused probe: load a URL and dump the Next.js dev-overlay text (hydration diff). */
import { chromium } from "playwright";

const url = process.argv[2] ?? "http://localhost:3000/studio";
const browser = await chromium.launch();
const page = await browser.newPage();

const msgs = [];
page.on("console", async (m) => {
  if (m.type() === "error" && m.text().includes("hydrated")) {
    const args = await Promise.all(m.args().map((a) => a.jsonValue().catch(() => null)));
    msgs.push(args.map((a) => (typeof a === "string" ? a : JSON.stringify(a))).join("\n---ARG---\n"));
  }
});

await page.goto(url, { waitUntil: "networkidle" });
await page.waitForTimeout(3000);

const overlay = await page.evaluate(() => {
  const portal = document.querySelector("nextjs-portal");
  const root = portal && portal.shadowRoot ? portal.shadowRoot : null;
  return root ? root.textContent || "" : "(no overlay)";
});

console.log("=== CONSOLE ARGS ===");
console.log(msgs.join("\n=====\n").slice(0, 3000) || "(none)");
console.log("\n=== OVERLAY TEXT ===");
console.log(overlay.slice(0, 3000));

await browser.close();
