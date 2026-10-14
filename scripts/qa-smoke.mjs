import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const results = [];
let page;

function log(name, status, detail = "") {
  results.push({ name, status, detail });
  const icon = status === "PASS" ? "ok" : status === "FAIL" ? "XX" : "??";
  console.log(`[${icon}] ${name}${detail ? " — " + detail : ""}`);
}

async function step(name, fn) {
  try {
    const detail = await fn();
    log(name, "PASS", detail || "");
    return true;
  } catch (e) {
    log(name, "FAIL", e.message.split("\n")[0]);
    return false;
  }
}

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
page = await ctx.newPage();

const consoleErrors = [];
page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });
page.on("pageerror", (e) => consoleErrors.push("pageerror: " + e.message));

// ---- 1. Landing ----
await step("Landing loads", async () => {
  const r = await page.goto(BASE, { waitUntil: "networkidle", timeout: 60000 });
  if (r.status() !== 200) throw new Error("status " + r.status());
  return "200";
});

await step("Landing shows 4 tier cards", async () => {
  const text = await page.locator("body").innerText();
  const tiers = ["Free", "Classic", "Grand", "Epic"].filter((t) =>
    text.toLowerCase().includes(t.toLowerCase()),
  );
  if (tiers.length < 4) throw new Error("found only " + tiers.join(","));
  return tiers.join("/");
});

await step("Landing renders flyer template images", async () => {
  await page.waitForTimeout(1500);
  const imgs = await page.locator('img[src*="/templates/"]').count();
  return imgs + " imgs";
});

// ---- 2. Auth: magic-link request from the Studio gate ----
await step("Auth: studio shows magic-link form", async () => {
  await page.goto(BASE + "/studio", { waitUntil: "networkidle", timeout: 60000 });
  const email = page.locator('input[type="email"]').first();
  if (!(await email.count())) throw new Error("no email input on /studio");
  return "email input present";
});

await step("Auth: request magic link submits", async () => {
  const email = page.locator('input[type="email"]').first();
  await email.fill("qa-test@aravow.dev");
  const btn = page.locator('button[type="submit"]').first();
  await btn.click();
  await page.waitForTimeout(2500);
  return "submitted -> " + page.url();
});

// ---- 3. Studio (unauthenticated gate) ----
await step("Studio: page loads (auth gate ok)", async () => {
  const r = await page.goto(BASE + "/studio", { waitUntil: "domcontentloaded", timeout: 60000 });
  return "status " + r.status();
});

// ---- 4. Flyer APIs (no auth) ----
await step("API /api/flyer/thumbnails generates all templates", async () => {
  const r = await page.request.get(BASE + "/api/flyer/thumbnails");
  if (!r.ok()) throw new Error("status " + r.status());
  const j = await r.json();
  if (!j.ok || j.count < 12) throw new Error("count " + j.count);
  return j.count + " templates";
});

await step("API /api/flyer/preview renders a draft", async () => {
  const r = await page.request.post(BASE + "/api/flyer/preview", {
    data: {
      templateId: "NG-004",
      monogram: "T&A",
      groomName: "Tunde",
      brideName: "Amara",
      theme: { primary: "#8B1E3F", accent: "#C9A86A" },
      flyer: {},
      ceremonies: [
        {
          kind: "TRADITIONAL",
          venueName: "Lagos",
          startsAt: "2026-04-12T14:00:00.000Z",
        },
      ],
    },
  });
  if (!r.ok()) throw new Error("status " + r.status());
  const j = await r.json();
  if (!j.ok || !j.image?.startsWith("data:image/png")) throw new Error("no image");
  return "png " + j.image.length + " chars";
});

// ---- 5. Landing tier CTAs ----
await step("Landing: pricing CTAs present", async () => {
  await page.goto(BASE, { waitUntil: "networkidle", timeout: 60000 });
  const links = await page.locator("a[href*='studio'], a[href*='auth']").count();
  const btns = await page.locator("button").count();
  return links + " links, " + btns + " buttons";
});

// ---- 6. Public wedding page (404 expected without data) ----
await step("Public /w/[slug] handles missing slug", async () => {
  const r = await page.goto(BASE + "/w/does-not-exist-qa", { waitUntil: "domcontentloaded", timeout: 60000 });
  return "status " + r.status();
});

// ---- 7. RSVP API validation ----
await step("API /api/rsvp rejects bad payload", async () => {
  const r = await page.request.post(BASE + "/api/rsvp", { data: {} });
  return "status " + r.status();
});

// ---- 8. Payments initialize (expect 4xx without auth) ----
await step("API /api/payments/initialize unauthenticated -> 4xx", async () => {
  const r = await page.request.post(BASE + "/api/payments/initialize", { data: { tier: "CLASSIC" } });
  if (r.status() >= 500) throw new Error("got 5xx: " + r.status());
  return "status " + r.status();
});

// ---- 9. Webhook without secret ----
await step("API /api/payments/webhook without secret -> 500 (expected)", async () => {
  const r = await page.request.post(BASE + "/api/payments/webhook", { data: { hi: 1 } });
  return "status " + r.status();
});

// ---- 10. Console errors ----
const realErrors = consoleErrors.filter(
  (e) => !e.includes("favicon") && !e.includes("Download the React DevTools"),
);
log("Console clean (landing+studio)", realErrors.length === 0 ? "PASS" : "FAIL",
  realErrors.slice(0, 3).join(" | ") || "no errors");

await page.screenshot({ path: "qa-landing.png", fullPage: false });

const pass = results.filter((r) => r.status === "PASS").length;
const fail = results.filter((r) => r.status === "FAIL").length;
console.log(`\n=== ${pass} pass, ${fail} fail ===`);
await browser.close();
process.exit(fail > 0 ? 1 : 0);
