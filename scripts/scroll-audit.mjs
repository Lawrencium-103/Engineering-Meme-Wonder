/**
 * Does a real, scrolling user actually see the landing-page sections?
 * Reports computed opacity of every `.reveal` at each scroll stop, plus
 * whether the browser applies a scroll-driven animation timeline.
 */
import { chromium } from "playwright";

const BASE = process.env.BASE ?? "http://localhost:3000";
const OUT = ".e2e";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
page.on("pageerror", (e) => errors.push(String(e)));

await page.goto(BASE + "/", { waitUntil: "networkidle", timeout: 120_000 });

const support = await page.evaluate(() => ({
  viewTimeline: CSS.supports("animation-timeline: view()"),
  revealCount: document.querySelectorAll(".reveal").length,
  docHeight: document.documentElement.scrollHeight,
}));
console.log("scroll-timeline support:", support.viewTimeline);
console.log(".reveal elements:", support.revealCount, "| doc height:", support.docHeight);

const height = 900;
const steps = Math.ceil(support.docHeight / height);

for (let i = 1; i <= steps; i++) {
  const y = Math.min(i * height, support.docHeight - height);
  await page.evaluate((top) => window.scrollTo({ top, behavior: "instant" }), y);
  await page.waitForTimeout(400);

  const state = await page.evaluate(() => {
    const els = [...document.querySelectorAll(".reveal")];
    return els.map((el) => {
      const r = el.getBoundingClientRect();
      return {
        op: getComputedStyle(el).opacity,
        inView: r.top < window.innerHeight && r.bottom > 0,
      };
    });
  });

  const hidden = state.filter((s) => s.inView && Number(s.op) < 0.9).length;
  const invisible = state.filter((s) => Number(s.op) < 0.05).length;
  console.log(
    `scroll ${String(y).padStart(5)} | reveal in-view ${state.filter((s) => s.inView).length}/${state.length} | in-view-but-faded: ${hidden} | fully invisible: ${invisible}`,
  );
  await page.screenshot({ path: `${OUT}/scroll-${String(i).padStart(2, "0")}.png` });
}

console.log("console errors:", errors.length ? errors.slice(0, 5) : "none");
await browser.close();
