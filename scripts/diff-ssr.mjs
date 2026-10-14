/**
 * Diff server HTML vs hydrated DOM (attributes + text) to pinpoint a
 * hydration mismatch. Usage: node scripts/diff-ssr.mjs <url>
 */
import { chromium } from "playwright";

const url = process.argv[2] ?? "http://localhost:3000/studio";
const browser = await chromium.launch();

// 1. Server output: JS disabled → DOM is exactly what the server sent.
const noJs = await browser.newContext({ javaScriptEnabled: false });
const p1 = await noJs.newPage();
await p1.goto(url, { waitUntil: "domcontentloaded" });
const serverSnap = await p1.evaluate(() =>
  [...document.querySelectorAll("*")].map((el) => ({
    tag: el.tagName,
    attrs: Object.fromEntries([...el.attributes].map((a) => [a.name, a.value])),
    text: el.children.length === 0 ? (el.textContent || "").trim().slice(0, 60) : "",
  })),
);

// 2. Client DOM after hydration.
const p2 = await browser.newPage();
await p2.goto(url, { waitUntil: "networkidle" });
await p2.waitForTimeout(2500);
const clientSnap = await p2.evaluate(() =>
  [...document.querySelectorAll("*")].map((el) => ({
    tag: el.tagName,
    attrs: Object.fromEntries([...el.attributes].map((a) => [a.name, a.value])),
    text: el.children.length === 0 ? (el.textContent || "").trim().slice(0, 60) : "",
  })),
);

const diffs = [];
const n = Math.max(serverSnap.length, clientSnap.length);
for (let i = 0; i < n; i++) {
  const a = serverSnap[i];
  const b = clientSnap[i];
  if (!a || !b) {
    diffs.push(`[${i}] node count differs: server=${a ? a.tag : "none"} client=${b ? b.tag : "none"}`);
    continue;
  }
  if (a.tag !== b.tag) {
    diffs.push(`[${i}] tag differs: server=${a.tag} client=${b.tag}`);
    continue;
  }
  const keys = new Set([...Object.keys(a.attrs), ...Object.keys(b.attrs)]);
  for (const k of keys) {
    if (a.attrs[k] !== b.attrs[k]) {
      diffs.push(`[${i}] <${a.tag}> ${k}: server="${String(a.attrs[k]).slice(0, 120)}" client="${String(b.attrs[k]).slice(0, 120)}"`);
    }
  }
  if (a.text !== b.text) {
    diffs.push(`[${i}] <${a.tag}> text: server="${a.text}" client="${b.text}"`);
  }
}

console.log(`elements: server=${serverSnap.length} client=${clientSnap.length}`);
console.log(diffs.length ? diffs.slice(0, 25).join("\n") : "NO DIFFS FOUND");
await browser.close();
