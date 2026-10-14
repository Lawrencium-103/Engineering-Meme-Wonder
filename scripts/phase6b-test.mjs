/**
 * Phase 6b: verify guest list CSV rows + NDPA deletion with a real guest.
 * Usage: node scripts/phase6b-test.mjs
 */
import { chromium } from "playwright";
import { Pool } from "pg";
import { randomBytes } from "crypto";
import "dotenv/config";

const B = process.env.E2E_BASE ?? "http://localhost:3000";
const results = [];
const check = (name, ok, detail = "") =>
  results.push(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? " — " + detail : ""}`);

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// 1. Create a fresh account + draft via the studio save endpoint.
const saveRes = await fetch(`${B}/api/studio/save`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    groomName: "Obi",
    brideName: "Nkechi",
    monogram: "ON",
    weddingDate: "2027-01-09",
    timezone: "Africa/Lagos",
    theme: { primary: "#D4AF37", accent: "#E8D3C4" },
    email: `phase6b-${Date.now().toString(36)}@aravow.test`,
    ceremonies: [
      { kind: "RECEPTION", enabled: true, venueName: "Ruby Gardens", startsAt: "2027-01-09T15:00" },
    ],
  }),
});
const save = await saveRes.json();
const eventId = save.eventId;

// 2. Sign in with the dev magic link (headless browser → session cookie).
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(save.devMagicLink, { waitUntil: "networkidle" });
await page.waitForURL(/dashboard/, { timeout: 30000 });
const cookies = await page.context().cookies();
const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join("; ");
await browser.close();
check("signed in via browser", cookieHeader.includes("av_session="));

// 3. Insert a guest directly (simulating an RSVP without Paystack).
const token = randomBytes(16).toString("hex");
await pool.query(
  `INSERT INTO guests (event_id, side, seq, guest_code, public_token, first_name, last_name, email, phone)
   VALUES ($1, 'GROOM', 1, 'G-ON-001', $2, 'Adaora', 'Solomon', 'adaora@example.com', '08011122233')`,
  [eventId, token],
);

// 4. Owner sees the guest in the list API.
const list = await (await fetch(`${B}/api/events/${eventId}/guests`, { headers: { cookie: cookieHeader } })).json();
check("guest appears in list", list.total === 1 && list.guests[0]?.guestCode === "G-ON-001", JSON.stringify(list).slice(0, 120));

// 5. CSV export contains the data row.
const csv = await (await fetch(`${B}/api/events/${eventId}/guests/export`, { headers: { cookie: cookieHeader } })).text();
const csvLines = csv.replace(/^\uFEFF/, "").split(/\r\n/).filter(Boolean);
check("CSV has data row", csvLines.length === 2 && csvLines[1].includes("G-ON-001") && csvLines[1].includes("Adaora"), csvLines[1]?.slice(0, 90));

// 6. Delete the guest (NDPA erasure).
const guestId = list.guests[0].id;
const del = await fetch(`${B}/api/events/${eventId}/guests/${guestId}`, {
  method: "DELETE",
  headers: { cookie: cookieHeader },
});
check("guest deleted", del.ok);

// 7. List is empty again.
const after = await (await fetch(`${B}/api/events/${eventId}/guests`, { headers: { cookie: cookieHeader } })).json();
check("list empty after delete", after.total === 0, `total=${after.total}`);

await pool.end();
console.log("\n=== PHASE 6B RESULTS ===");
results.forEach((r) => console.log(r));
