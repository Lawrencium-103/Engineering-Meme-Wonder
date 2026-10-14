/**
 * Phase 6c: verify editing a PUBLISHED event via the Studio flow.
 * - draft?event=<id> returns the owned published event
 * - PATCH saves Studio-shaped payload (incl. disabled ceremonies)
 * - the slug never changes
 * Usage: node scripts/phase6c-test.mjs
 */
import { chromium } from "playwright";
import { Pool } from "pg";
import "dotenv/config";

const B = process.env.E2E_BASE ?? "http://localhost:3000";
const results = [];
const check = (name, ok, detail = "") =>
  results.push(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? " — " + detail : ""}`);

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// 1. Seed a published event owned by a fresh account.
const email = `phase6c-${Date.now().toString(36)}@aravow.test`;
const saveRes = await fetch(`${B}/api/studio/save`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    groomName: "Ifeanyi",
    brideName: "Zainab",
    monogram: "IZ",
    weddingDate: "2027-09-04",
    timezone: "Africa/Lagos",
    theme: { primary: "#D4AF37", accent: "#E8D3C4" },
    email,
    ceremonies: [
      { kind: "RECEPTION", enabled: true, venueName: "Oceanview Hall", startsAt: "2027-09-04T16:00" },
    ],
  }),
});
const save = await saveRes.json();
const eventId = save.eventId;

const slug = `phase6c-${Math.random().toString(36).slice(2, 8)}`;
await pool.query(
  `UPDATE events SET status='PUBLISHED', slug=$2 WHERE id=$1`,
  [eventId, slug],
);

// 2. Sign in as the owner (browser sets the session cookie).
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(save.devMagicLink, { waitUntil: "networkidle" });
await page.waitForURL(/dashboard/, { timeout: 30000 });
const cookieHeader = (await page.context().cookies()).map((c) => `${c.name}=${c.value}`).join("; ");

// 3. Studio loads the published event by id.
const draftRes = await fetch(`${B}/api/studio/draft?event=${eventId}`, {
  headers: { cookie: cookieHeader },
});
const draftData = await draftRes.json();
check(
  "studio loads published event",
  draftRes.ok && draftData.status === "PUBLISHED" && draftData.draft?.event?.id === eventId,
  `status=${draftData.status}`,
);

// 4. PATCH with the exact payload shape the Studio sends (all 4 ceremonies,
//    optional ones disabled with empty venue names).
const patchBody = {
  groomName: "Ifeanyi",
  brideName: "Zainab",
  monogram: "IZ",
  weddingDate: "2027-09-05",
  timezone: "Africa/Lagos",
  theme: { primary: "#D4AF37", accent: "#E8D3C4" },
  heroImageUrl: "",
  groomSignatureUrl: "",
  brideSignatureUrl: "",
  story: "Edited after publishing.",
  ceremonies: [
    { kind: "RECEPTION", enabled: true, venueName: "Oceanview Hall, VI", address: "Lagos", mapsUrl: "", startsAt: "2027-09-05T17:00", dressCode: "Black tie" },
    { kind: "TRADITIONAL", enabled: true, venueName: "Family Compound", address: "", mapsUrl: "", startsAt: "2027-09-04T10:00", dressCode: "" },
    { kind: "COURT", enabled: false, venueName: "", address: "", mapsUrl: "", startsAt: "", dressCode: "" },
    { kind: "RELIGIOUS", enabled: false, venueName: "", address: "", mapsUrl: "", startsAt: "", dressCode: "" },
  ],
};
const patchRes = await fetch(`${B}/api/events/${eventId}`, {
  method: "PATCH",
  headers: { cookie: cookieHeader, "Content-Type": "application/json" },
  body: JSON.stringify(patchBody),
});
const patchData = await patchRes.json();
check("PATCH published event (studio payload)", patchRes.ok, JSON.stringify(patchData).slice(0, 120));

// 5. Slug unchanged + fields updated.
const { rows } = await pool.query(
  `SELECT slug, wedding_date, story FROM events WHERE id=$1`,
  [eventId],
);
check("slug is immutable", rows[0].slug === slug, `slug=${rows[0].slug}`);
const d = rows[0].wedding_date;
const storedDate =
  d instanceof Date
    ? // pg returns `date` as local midnight — format locally, not via UTC.
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
    : String(d).slice(0, 10);
check(
  "details updated",
  rows[0].story === "Edited after publishing." && storedDate === "2027-09-05",
  `date=${storedDate} story="${rows[0].story}"`,
);

// 6. Only enabled ceremonies persisted.
const cers = await pool.query(
  `SELECT kind, venue_name FROM ceremonies WHERE event_id=$1 ORDER BY sort_order`,
  [eventId],
);
check(
  "only enabled ceremonies stored",
  cers.rows.length === 2 && cers.rows[0].kind === "RECEPTION" && cers.rows[1].kind === "TRADITIONAL",
  JSON.stringify(cers.rows),
);

// 7. An unrelated user cannot read that event.
const otherEmail = `phase6c-other-${Date.now().toString(36)}@aravow.test`;
const otherSave = await (
  await fetch(`${B}/api/studio/save`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      groomName: "Other", brideName: "Person", monogram: "OP", weddingDate: "2027-02-02",
      timezone: "Africa/Lagos", theme: { primary: "#D4AF37", accent: "#E8D3C4" }, email: otherEmail,
      ceremonies: [{ kind: "RECEPTION", enabled: true, venueName: "X", startsAt: "2027-02-02T12:00" }],
    }),
  })
).json();
const page2 = await browser.newPage();
await page2.goto(otherSave.devMagicLink, { waitUntil: "networkidle" });
await page2.waitForURL(/dashboard/, { timeout: 30000 });
const otherCookie = (await page2.context().cookies()).map((c) => `${c.name}=${c.value}`).join("; ");
await browser.close();

const foreignRead = await fetch(`${B}/api/studio/draft?event=${eventId}`, { headers: { cookie: otherCookie } });
const foreignBody = await foreignRead.json();
check(
  "other owner cannot read the event",
  foreignBody.draft === null,
  JSON.stringify(foreignBody).slice(0, 80),
);
const foreignPatch = await fetch(`${B}/api/events/${eventId}`, {
  method: "PATCH",
  headers: { cookie: otherCookie, "Content-Type": "application/json" },
  body: JSON.stringify({ story: "hacked" }),
});
check("other owner cannot edit (404)", foreignPatch.status === 404, `status ${foreignPatch.status}`);

await pool.end();
console.log("\n=== PHASE 6C RESULTS ===");
results.forEach((r) => console.log(r));
