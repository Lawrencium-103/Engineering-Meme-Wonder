/**
 * Phase 6 API verification (auth, guest list, CSV, delete, PATCH).
 * Usage: node scripts/phase6-test.mjs
 */
import "dotenv/config";

const B = process.env.E2E_BASE ?? "http://localhost:3000";
const results = [];
const check = (name, ok, detail = "") => {
  results.push(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? " — " + detail : ""}`);
};

// 1. Unauthenticated guest-list access must be rejected.
const anon = await fetch(`${B}/api/events/00000000-0000-0000-0000-000000000000/guests`);
check("anonymous guest list rejected", anon.status === 401, `status ${anon.status}`);

// 2. Create a draft + account via the studio save endpoint.
const saveRes = await fetch(`${B}/api/studio/save`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    groomName: "Tunde",
    brideName: "Wale",
    monogram: "TW",
    weddingDate: "2027-06-19",
    timezone: "Africa/Lagos",
    theme: { primary: "#D4AF37", accent: "#E8D3C4" },
    story: "",
    email: "phase6@aravow.test",
    ceremonies: [
      { kind: "RECEPTION", enabled: true, venueName: "Test Hall", startsAt: "2027-06-19T16:00" },
    ],
  }),
});
const saveData = await saveRes.json();
check("draft created", saveRes.ok && Boolean(saveData.eventId), JSON.stringify(saveData).slice(0, 80));
const eventId = saveData.eventId;

// 3. Sign in via dev magic link, capture the session cookie.
const mlRes = await fetch(saveData.devMagicLink, { redirect: "manual" });
const cookies = (mlRes.headers.getSetCookie?.() ?? [mlRes.headers.get("set-cookie") ?? ""])
  .map((c) => c.split(";")[0])
  .join("; ");
check("magic-link sign-in", mlRes.status === 307, `status ${mlRes.status}`);
check("session cookie set", cookies.includes("av_session="));

// 4. Owner can read the (empty) guest list.
const listRes = await fetch(`${B}/api/events/${eventId}/guests`, { headers: { cookie: cookies } });
const listData = await listRes.json();
check(
  "owner guest list",
  listRes.ok && listData.total === 0 && listData.guestCap > 0,
  `total=${listData.total} cap=${listData.guestCap}`,
);

// 5. CSV export (header row).
const csvRes = await fetch(`${B}/api/events/${eventId}/guests/export`, { headers: { cookie: cookies } });
const csvText = await csvRes.text();
const csvLines = csvText.replace(/^\uFEFF/, "").split(/\r\n/);
check(
  "CSV export header",
  csvRes.ok && csvLines[0]?.startsWith("Guest ID,Side,First Name"),
  csvLines[0],
);

// 6. PATCH event details (slug immutability: endpoint accepts no slug field at all).
const patchRes = await fetch(`${B}/api/events/${eventId}`, {
  method: "PATCH",
  headers: { cookie: cookies, "Content-Type": "application/json" },
  body: JSON.stringify({ story: "Updated by phase6 test", weddingDate: "2027-06-20" }),
});
check("PATCH event details", patchRes.ok, `status ${patchRes.status}`);

// 7. PATCH with an invalid value must fail validation.
const badPatch = await fetch(`${B}/api/events/${eventId}`, {
  method: "PATCH",
  headers: { cookie: cookies, "Content-Type": "application/json" },
  body: JSON.stringify({ story: "x".repeat(501) }),
});
check("PATCH rejects invalid input", badPatch.status === 400, `status ${badPatch.status}`);

// 8. Guest delete: create a published event + RSVP via direct SQL is not
// possible from here; instead verify delete of a non-existent guest.
const delRes = await fetch(
  `${B}/api/events/${eventId}/guests/11111111-1111-1111-1111-111111111111`,
  { method: "DELETE", headers: { cookie: cookies } },
);
check("delete unknown guest → 404", delRes.status === 404, `status ${delRes.status}`);

console.log("\n=== PHASE 6 RESULTS ===");
results.forEach((r) => console.log(r));
