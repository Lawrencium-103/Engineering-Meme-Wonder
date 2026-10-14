/**
 * Seed a demo PUBLISHED wedding for local smoke tests.
 * Usage: node scripts/seed-demo.mjs
 */
import "dotenv/config";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const slug = `demo-wedding-${Math.random().toString(36).slice(2, 7)}`;

async function main() {
  const acc = await pool.query(
    "INSERT INTO accounts (email) VALUES ('demo@aravow.test') RETURNING id",
  );
  const ev = await pool.query(
    `INSERT INTO events
      (owner_id, status, slug, timezone, monogram, groom_name, bride_name, wedding_date,
       guest_cap, tier, theme, story)
     VALUES ($1,'PUBLISHED',$2,'Africa/Lagos','DA','Dele','Amaka','2026-12-12',
             70,'CLASSIC',$3,$4)
     RETURNING id`,
    [
      acc.rows[0].id,
      slug,
      JSON.stringify({ primary: "#D4AF37", accent: "#E8D3C4" }),
      "We met at a friend's party in Yaba. Two years, one proposal, and a thousand cups of zobo later — we are getting married!",
    ],
  );
  await pool.query(
    `INSERT INTO ceremonies
      (event_id, kind, venue_name, address, maps_url, starts_at, dress_code, is_required, sort_order)
     VALUES
      ($1,'TRADITIONAL','Amaka Family Compound','12 Awolowo Rd, Ikoyi, Lagos','https://maps.app.goo.gl/demo',
       '2026-12-11T10:00:00+01:00','Aso-Oke: Gold & Ivory',false,0),
      ($1,'RECEPTION','The Grand Ballroom, Eko Atlantic','Eko Atlantic City, Lagos','https://maps.app.goo.gl/demo',
       '2026-12-12T16:00:00+01:00','Formal: Black Tie with Gold accents',true,1)`,
    [ev.rows[0].id],
  );
  console.log("DEMO_SLUG=" + slug);
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
