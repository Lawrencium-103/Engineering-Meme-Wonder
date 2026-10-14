/** One-shot smoke test: RSVP -> pass poll -> guest count. */
const BASE = "http://localhost:3000";
const SLUG = process.argv[2] || "demo-wedding-9kumu";

const email = `smoke-${Date.now()}@example.com`;

// 1. RSVP
const rsvp = await fetch(`${BASE}/api/rsvp?slug=${SLUG}`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    side: "GROOM",
    firstName: "Smoke",
    lastName: "Tester",
    email,
    consent: true,
  }),
});
const rsvpBody = await rsvp.json().catch(() => null);
console.log("RSVP status:", rsvp.status);
console.log("RSVP body:", JSON.stringify(rsvpBody, null, 2));

const token = rsvpBody?.publicToken || rsvpBody?.token || rsvpBody?.passToken;
if (!token) {
  console.log("No token returned — stopping here.");
  process.exit(0);
}

// 2. Poll pass a few times (generation is async after commit)
for (let i = 0; i < 10; i++) {
  await new Promise((r) => setTimeout(r, 1500));
  const pr = await fetch(`${BASE}/api/pass/${token}`);
  const pb = await pr.json().catch(() => null);
  console.log(`pass poll #${i + 1}:`, pr.status, JSON.stringify(pb));
  if (pb?.ready) break;
}
