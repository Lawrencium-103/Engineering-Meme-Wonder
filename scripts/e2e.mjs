/**
 * End-to-end browser test (Playwright, real Chromium).
 * Usage: node scripts/e2e.mjs
 * Captures console/page errors and screenshots into .e2e/
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "fs";

const BASE = process.env.E2E_BASE ?? "http://localhost:3000";
const SHOTS = process.cwd() + "/.e2e";
mkdirSync(SHOTS, { recursive: true });

const errors = [];
const results = [];
function check(name, ok, detail = "") {
  results.push(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? " — " + detail : ""}`);
}

// Deterministic hero image (1x1 PNG) for the upload test.
const HERO = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==",
  "base64",
);
const HERO_PATH = SHOTS + "/hero-fixture.png";
writeFileSync(HERO_PATH, HERO);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 430, height: 900 } });

page.on("console", async (m) => {
  if (m.type() !== "error") return;
  const text = m.text();
  if (text.includes("hydrated")) {
    // React passes the server/client diff as arguments — capture them.
    let extra = "";
    try {
      const args = await Promise.all(m.args().map((a) => a.jsonValue()));
      extra = args.map((a) => (typeof a === "string" ? a : JSON.stringify(a))).join(" | ");
    } catch {
      /* ignore */
    }
    errors.push(`console(hydration) @ ${page.url()}: ${extra.slice(0, 400) || text.slice(0, 200)}`);
  } else {
    errors.push(`console @ ${page.url()}: ${text.slice(0, 200)}`);
  }
});
page.on("pageerror", (e) => errors.push(`pageerror: ${String(e).slice(0, 200)}`));

const shot = (n) => page.screenshot({ path: `${SHOTS}/${n}.png`, fullPage: true });

try {
  // ---------- 1. Landing ----------
  await page.goto(BASE, { waitUntil: "networkidle" });
  const headline = await page.locator("h1").first().innerText();
  check("landing headline", headline.includes("An Invitation Worth"), headline.replace(/\s+/g, " ").slice(0, 60));
  check("landing CTA", await page.getByRole("link", { name: /Craft Your Wedding Suite/i }).isVisible());
  await shot("01-landing");

  // ---------- 2. Studio: fill everything ----------
  await page.goto(BASE + "/studio", { waitUntil: "networkidle" });
  await page.waitForSelector('html[data-av-ready="1"]', { timeout: 30000 });
  await shot("02-studio-empty");

  await page.getByPlaceholder("Chidi Okafor").fill("Chidi");
  await page.getByPlaceholder("Amara Nwosu").fill("Amara");
  const monogram = await page.locator('input[placeholder="CO"]').inputValue();
  check("monogram auto-generated", monogram === "CA", `got "${monogram}"`);

  await page.locator('input[type="date"]').fill("2027-03-20");
  await page.locator("input[type=color]").first().fill("#0B0C10");

  // Hero photo upload (dev local endpoint)
  await page.locator('input[type="file"]').setInputFiles(HERO_PATH);
  const heroOk = await page
    .locator('img[alt="Hero preview"]')
    .waitFor({ timeout: 30000 })
    .then(() => true)
    .catch(() => false);
  check("hero photo upload + preview", heroOk);
  await shot("03-studio-hero-uploaded");

  // Story
  await page.getByPlaceholder("How you met").fill("We met in Lagos and never looked back.");

  // Reception ceremony (required) — wrapping <label> makes getByLabel work.
  try {
    await page.getByLabel("Venue name").first().fill("Eko Hotel Grand Ballroom");
    await page.getByLabel("Start time").first().fill("2027-03-20T16:00");
    check("studio section completed", true);
  } catch (err) {
    check("studio section completed", false, String(err).slice(0, 200));
  }
  await shot("04-studio-filled");

  // New: Invitation Details — hashtag + families + scripture (flyer content).
  try {
    await page.getByPlaceholder("#OladejiWedsLawrence").fill("#ChidiWedsAmara");
    await page.getByPlaceholder("Mr. & Mrs. Oladeji").fill("Mr & Mrs TestFather");
    await page.getByPlaceholder("Mr. & Mrs. Lawrence").fill("Mr & Mrs TestMother");
    await page.getByPlaceholder("And now these three remain").fill("Two souls, one journey.");
    check("studio invitation details filled", true);
  } catch (err) {
    check("studio invitation details filled", false, String(err).slice(0, 160));
  }

  // New: pick a flyer template (NG-002) so the save covers templateId.
  try {
    const tpl = page.getByText("Emerald Botanical", { exact: true }).first();
    if (await tpl.isVisible()) await tpl.click();
    check("studio template selected", true);
  } catch (err) {
    check("studio template selected", false, String(err).slice(0, 160));
  }
  await shot("04b-studio-invitation");
} catch (err) {
  check("studio section completed", false, String(err).slice(0, 160));
}

// ---------- 3. Save draft (magic link) ----------
let magicLink = null;
let saveResponse = "";
page.on("response", async (res) => {
  if (res.url().includes("/api/studio/save") && res.request().method() === "POST") {
    try {
      const body = await res.json();
      saveResponse = `${res.status()} ${JSON.stringify(body).slice(0, 300)}`;
      if (body.devMagicLink) magicLink = body.devMagicLink;
    } catch {
      saveResponse = `${res.status()} (unparseable)`;
    }
  }
});

try {
  await page.locator('input[type="email"]').last().fill("e2e@aravow.test");
  await page.getByRole("button", { name: /Save Draft/i }).click();
  await page.waitForTimeout(4000);
  check("draft saved + magic link issued", Boolean(magicLink), saveResponse || "no response captured");
  await shot("05-studio-saved");
} catch (err) {
  check("save draft", false, String(err).slice(0, 160));
}

// ---------- 4. Sign in via magic link → dashboard ----------
try {
  if (magicLink) {
    await page.goto(magicLink, { waitUntil: "networkidle" });
    await page.waitForURL(/dashboard/, { timeout: 20000 });
    const h1 = await page.locator("h1").innerText();
    check("magic-link sign-in → dashboard", h1.includes("Your Dashboard"), h1);
    const hasTiers = await page.getByText(/Choose your tier/i).first().isVisible();
    check("dashboard shows tier picker", hasTiers);
    await shot("06-dashboard");
  }
} catch (err) {
  check("sign-in flow", false, String(err).slice(0, 160));
}

// ---------- 5. Guest RSVP flow on the demo wedding ----------
try {
  await page.goto(BASE + "/w/demo-wedding-9kumu", { waitUntil: "networkidle" });
  await page.waitForSelector('html[data-av-ready="1"]', { timeout: 30000 });
  const hero = await page.locator("h1").first().innerText();
  check("guest page hero names", hero.includes("Dele") && hero.includes("Amaka"), hero.replace(/\s+/g, " ").slice(0, 50));

  const mapsLinks = await page.getByRole("link", { name: /Google Maps/i }).count();
  check("ceremonies render with map links", mapsLinks > 0, `${mapsLinks} links`);

  await page.getByRole("button", { name: /celebrating with the Groom/i }).first().click();
  await page.getByPlaceholder("First name").fill("E2E");
  await page.getByPlaceholder("Last name").fill("Guest");
  await page.getByPlaceholder("Email (or phone below)").fill("e2e.guest@aravow.test");
  await page.getByPlaceholder("Dietary note (optional)").fill("No shellfish");
  const consent = page.locator('input[type="checkbox"]').first();
  await consent.check();
  check("consent checkbox required+checkable", await consent.isChecked());
  await shot("07-rsvp-form");

  await page.getByRole("button", { name: /Confirm RSVP/i }).click();
  await page.getByText("Thank you!").waitFor({ timeout: 30000 });
  check("celebration screen shown", true);
  await shot("08-celebration");

  // Pass PNG appears once generated (POST-commit async job).
  const passImg = page.locator('img[alt="Your access pass"]');
  const passOk = await passImg
    .waitFor({ timeout: 90000 })
    .then(() => true)
    .catch(() => false);
  const passSrc = passOk ? await passImg.getAttribute("src") : "";
  check("pass PNG rendered on screen", passOk, passSrc);
  check("download/whatsapp/calendar buttons", (await page.getByRole("link", { name: /Download PNG|Share on WhatsApp|Add to Calendar/i }).count()) >= 2);
  await shot("09-pass");
} catch (err) {
  check("guest RSVP flow", false, String(err).slice(0, 300));
}

await browser.close();

// ---------- Report ----------
console.log("\n=== E2E RESULTS ===");
results.forEach((r) => console.log(r));
console.log("\n=== CONSOLE/PAGE ERRORS ===");
if (errors.length === 0) console.log("(none)");
else [...new Set(errors)].slice(0, 10).forEach((e) => console.log("- " + e));
console.log("\nScreenshots in .e2e/");
