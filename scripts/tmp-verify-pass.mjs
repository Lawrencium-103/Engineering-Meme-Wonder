import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const SHOT = (n) => `scripts/shots/vpass-${n}.png`;

const out = [];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

// 1. Guest page: hero photo + families markers
await page.goto(`${BASE}/w/demo-wedding-9kumu`, { waitUntil: "networkidle" });
const html = await page.content();
const markers = [
  "Mr &amp; Mrs Obiora Nwosu",
  "Chief &amp; Mrs Emeka Okonkwo",
  "Joyfully invite you",
  "#ForeverBeginsWithYou",
  "marketing/hero-01.png",
  "Dele &amp; Amaka",
];
for (const m of markers) out.push(`${html.includes(m) ? "PASS" : "FAIL"} guest-html has ${JSON.stringify(m)}`);
const heroBg = html.includes("marketing/hero-01.png");
out.push(`${heroBg ? "PASS" : "FAIL"} guest hero background rendered`);
await page.screenshot({ path: SHOT("guest"), fullPage: false });

// 2. Card PNG route
const card = await page.request.get(`${BASE}/w/demo-wedding-9kumu/card`);
out.push(`${card.status() === 200 ? "PASS" : "FAIL"} card route 200 (${card.status()})`);

// 3. Fresh RSVP -> new pass PNG has families + photo frame.
// Uses tmp-smoke-rsvp.mjs (the working RSVP helper): RSVP, then poll
// GET /api/pass/[token] until ready, then fetch the stored PNG.
try {
  const email = `verify-${Date.now()}@example.com`;
  const rsvp = await page.request.post(`${BASE}/api/rsvp?slug=demo-wedding-9kumu`, {
    data: { side: "BRIDE", firstName: "Fresh", lastName: "Verify", email, consent: true },
  });
  const rsvpBody = await rsvp.json().catch(() => null);
  out.push(`${rsvp.status() === 200 ? "PASS" : "FAIL"} fresh RSVP accepted (${rsvp.status()})`);
  const token = rsvpBody?.publicToken;
  let passUrl = null;
  if (token) {
    for (let i = 0; i < 12 && !passUrl; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      const pr = await page.request.get(`${BASE}/api/pass/${token}`);
      const pb = await pr.json().catch(() => null);
      if (pb?.ready && pb?.passImageUrl) passUrl = pb.passImageUrl;
    }
  }
  out.push(`${passUrl ? "PASS" : "FAIL"} fresh pass ready${passUrl ? ` (${passUrl})` : " (token missing or timeout)"}`);
  if (passUrl) {
    const png = await page.request.get(`${BASE}${passUrl}`);
    out.push(`${png.status() === 200 ? "PASS" : "FAIL"} fresh RSVP pass 200`);
    const buf = Buffer.from(await png.body());
    await import("fs").then((fs) => fs.writeFileSync(SHOT("fresh-pass"), buf));
    out.push(`${buf.length > 50000 ? "PASS" : "FAIL"} fresh pass size ${buf.length} bytes`);
  }
} catch (e) {
  out.push(`FAIL fresh RSVP threw: ${String(e).slice(0, 200)}`);
}

// 4. Marketing sample-pass route still renders through the real pipeline
const sample = await page.request.get(`${BASE}/api/marketing/sample-pass`);
out.push(`${sample.status() === 200 ? "PASS" : "FAIL"} sample-pass route 200 (${sample.status()})`);

await browser.close();
console.log(out.join("\n"));
