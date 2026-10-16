/**
 * Gift promises: submit → fetch → card PNG → owner list → CSV.
 * Usage: node scripts/promises-test.mjs
 */
import { Pool } from "pg";
import { randomBytes } from "crypto";
import { writeFile } from "fs/promises";
import { SignJWT } from "jose";
import "dotenv/config";

const B = process.env.E2E_BASE ?? "http://localhost:3000";
const results = [];
const check = (name, ok, detail = "") =>
  results.push(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? " — " + detail : ""}`);

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const secret = new TextEncoder().encode(process.env.AUTH_SECRET);

/** Mint the av_session cookie for an account id (same shape as lib/auth). */
async function sessionCookie(accountId) {
  const token = await new SignJWT({ sub: accountId, purpose: "session" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret);
  return `av_session=${token}`;
}

// 1. Fresh account + draft via the studio save endpoint.
const email1 = `promises-${Date.now().toString(36)}@aravow.test`;
const saveRes = await fetch(`${B}/api/studio/save`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    groomName: "Chidi",
    brideName: "Amara",
    monogram: "CA",
    weddingDate: "2027-03-14",
    timezone: "Africa/Lagos",
    theme: { primary: "#D4AF37", accent: "#E8D3C4" },
    email: email1,
    ceremonies: [
      { kind: "RECEPTION", enabled: true, venueName: "The Haven", startsAt: "2027-03-14T16:00" },
    ],
  }),
});
const save = await saveRes.json();
const eventId = save.eventId;
check("event created", Boolean(eventId), String(saveRes.status));

// 2. Session cookie for the owner account (created by the save).
const acct1 = await pool.query(`SELECT id FROM accounts WHERE email = $1`, [email1]);
const cookieHeader = await sessionCookie(acct1.rows[0].id);
check("session minted", Boolean(acct1.rows[0].id));

// 3. Insert a guest directly (simulating an RSVP).
const token = randomBytes(16).toString("hex");
await pool.query(
  `INSERT INTO guests (event_id, side, seq, guest_code, public_token, first_name, last_name, email)
   VALUES ($1, 'GROOM', 1, 'G-CA-001', $2, 'Tunde', 'Bakare', 'tunde@example.com')`,
  [eventId, token],
);

// 4. Submit a promise: ₦20,000 cash + Handbag + a custom gift.
const items = [
  { kind: "CASH", label: "Cash / Transfer", amountMinor: 2_000_000 },
  { kind: "ITEM", label: "Handbag", note: "Tan, size medium" },
  { kind: "ITEM", label: "Rice & palm oil basket" },
];
const post = await fetch(`${B}/api/promises`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ publicToken: token, items }),
});
const postData = await post.json().catch(() => ({}));
check("promise submitted", post.ok && postData.ok === true, JSON.stringify(postData).slice(0, 120));

// 5. Fetch it back (prefill).
const get = await fetch(`${B}/api/promises/${token}`);
const getData = await get.json();
check(
  "promise retrievable",
  get.ok && getData.promise?.items?.length === 3,
  JSON.stringify(getData).slice(0, 120),
);

// 6. Resubmit (update) — only cash now; row is updated, not duplicated.
await fetch(`${B}/api/promises`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ publicToken: token, items: [{ kind: "CASH", label: "Cash / Transfer", amountMinor: 5_000_000 }] }),
});
const get2 = await (await fetch(`${B}/api/promises/${token}`)).json();
const rowCount = await pool.query(`SELECT count(*)::int AS n FROM gift_promises WHERE guest_id = (SELECT id FROM guests WHERE public_token = $1)`, [token]);
check(
  "resubmit updates in place",
  get2.promise?.items?.length === 1 && rowCount.rows[0].n === 1 && get2.promise.items[0].amountMinor === 5_000_000,
  `items=${get2.promise?.items?.length} rows=${rowCount.rows[0].n}`,
);

// 7. Promise card PNG renders and is a real PNG.
const cardRes = await fetch(`${B}/api/promise/${token}/card`);
const cardBuf = Buffer.from(await cardRes.arrayBuffer());
const isPng = cardBuf.length > 1000 && cardBuf[0] === 0x89 && cardBuf[1] === 0x50;
check("promise card PNG", cardRes.ok && isPng, `${cardRes.status}, ${cardBuf.length} bytes`);
if (isPng) await writeFile("promise-card-test.png", cardBuf);
check(
  "card download filename",
  (cardRes.headers.get("content-disposition") ?? "").includes("Aravow-Promise-G-CA-001.png"),
  cardRes.headers.get("content-disposition") ?? "",
);

// 8. Card 404s before a promise exists (second guest).
const token2 = randomBytes(16).toString("hex");
await pool.query(
  `INSERT INTO guests (event_id, side, seq, guest_code, public_token, first_name, last_name)
   VALUES ($1, 'BRIDE', 1, 'B-CA-001', $2, 'Ngozi', 'Eze')`,
  [eventId, token2],
);
const noCard = await fetch(`${B}/api/promise/${token2}/card`);
check("card 404 without promise", noCard.status === 404, String(noCard.status));

// 9. Owner list + totals + CSV.
const list = await (await fetch(`${B}/api/events/${eventId}/promises`, { headers: { cookie: cookieHeader } })).json();
check(
  "owner list",
  list.count === 1 && list.totalCashMinor === 5_000_000 && list.promises[0]?.name === "Tunde Bakare",
  JSON.stringify({ count: list.count, total: list.totalCashMinor }).slice(0, 120),
);
const csv = await (await fetch(`${B}/api/events/${eventId}/promises/export`, { headers: { cookie: cookieHeader } })).text();
const csvLines = csv.replace(/^\uFEFF/, "").split(/\r\n/).filter(Boolean);
check("CSV row", csvLines.length === 2 && csvLines[1].includes("G-CA-001") && csvLines[1].includes("Cash / Transfer"), csvLines[1]?.slice(0, 100));

// 10. Another owner cannot see the promises (cross-owner isolation).
const email2 = `other-${Date.now().toString(36)}@aravow.test`;
const save2 = await (
  await fetch(`${B}/api/studio/save`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      groomName: "Ada",
      brideName: "Bola",
      monogram: "AB",
      weddingDate: "2027-06-01",
      timezone: "Africa/Lagos",
      theme: { primary: "#D4AF37", accent: "#E8D3C4" },
      email: email2,
      ceremonies: [{ kind: "RECEPTION", enabled: true, venueName: "Hall", startsAt: "2027-06-01T16:00" }],
    }),
  })
).json();
const acct2 = await pool.query(`SELECT id FROM accounts WHERE email = $1`, [email2]);
const cookie2 = await sessionCookie(acct2.rows[0].id);
const cross = await fetch(`${B}/api/events/${eventId}/promises`, { headers: { cookie: cookie2 } });
check("cross-owner blocked", cross.status === 404, String(cross.status));

await pool.end();
console.log(results.join("\n"));
process.exit(results.some((r) => r.startsWith("FAIL")) ? 1 : 0);
