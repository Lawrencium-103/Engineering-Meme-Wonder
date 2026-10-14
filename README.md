# Aravow

Premium digital wedding invitations + RSVP for Nigerian weddings.

## Phase 1 — Setup, schema, pricing config, magic-link auth

### Stack
Next.js 15 (App Router, TypeScript) · Tailwind CSS v4 · Framer Motion · PostgreSQL (Neon/Supabase) with Drizzle ORM on a standard `pg` Pool (interactive transactions supported) · Resend email · JWT magic-link auth (`jose`).

### Setup
1. Create a Neon (or Supabase) Postgres database.
2. `cp .env.example .env` and fill in:
   - `DATABASE_URL` — the **pooled** connection string with `?sslmode=require`
   - `AUTH_SECRET` — long random string (32+ bytes)
   - `APP_URL` — e.g. `http://localhost:3000`
   - `RESEND_API_KEY`, `EMAIL_FROM`
3. `npm install`
4. Apply migrations: `npm run db:migrate` (generates are committed in `drizzle/`)
5. `npm run dev` → http://localhost:3000

### What's here
- **Pricing config** (`src/lib/pricing.ts`) — all amounts in kobo: Intimate 30 guests / ₦15,000; Classic 31–70 / ₦30,000 (default); Grand 70 + ₦5,000 per block of 25 above 70. `priceForCap()` powers difference-only upgrades later.
- **Schema** (`src/db/schema.ts` + `drizzle/0000_*.sql`) — `accounts`, `events` (slug unique-nullable, `groom_seq`/`bride_seq` atomic counters, `guest_cap`, tier, theme JSONB), `ceremonies`, `payments` (unique `provider_ref` for webhook idempotency), `guests` (citext email, unique `(event_id, side, seq)`, unique `public_token`). All timestamps are `timestamptz`.
- **Magic-link auth** — `POST /api/auth/magic-link` sends a single-use JWT link (15 min TTL) via Resend; `GET /auth/verify?token=…` consumes it, creates the account if needed, and sets a 30-day HttpOnly session cookie. `POST /api/auth/signout` clears it.
- **Design system** — Onyx `#0B0C10`, Champagne Gold `#D4AF37`, Rose Champagne `#E8D3C4`, Alabaster `#F9F8F6`; Cormorant Garamond + Inter + Great Vibes via `next/font`; `prefers-reduced-motion` respected.
- Landing page (`/`), Studio stub (`/studio`), dashboard placeholder (`/dashboard`).

### Next phases
Phase 3: Paystack checkout + idempotent webhook + publishing.
Phase 4: public event page, RSVP flow, atomic ID generation, cap enforcement.

## Phase 3 — Payments & publishing (built)

- **`POST /api/payments/initialize`** (session + ownership required) — computes the tier price in kobo from the config (Grand = ₦30,000 + ₦5,000 per 25-guest block above 70), or **only the difference** when upgrading (sums prior SUCCESS payments). Creates a unique reference `AV-…`, calls Paystack initialize, and moves DRAFT → PENDING_PAYMENT.
- **`POST /api/payments/webhook`** — verifies `x-paystack-signature` (HMAC-SHA512 over the raw body, `timingSafeEqual`); idempotent via **UNIQUE(provider_ref)** + `onConflictDoNothing`; on `charge.success` one transaction inserts the payment (minimal raw JSON, never the full payload), sets `guest_cap` + `tier`, flips status to **PUBLISHED** and claims a unique slug (`chidi-weds-amara-x7k2p`); slug collisions retry the whole transaction; receipt email sent after commit with the public link. Payload is never logged.
- **Dashboard** (`/dashboard`) — lists your events with status pills; tier picker (Intimate/Classic/Grand + guest count for Grand); Paystack checkout button; after publish: public link with **Copy** + **WhatsApp share**.
- Env: `PAYSTACK_SECRET_KEY` (+ register `{APP_URL}/api/payments/webhook` in the Paystack dashboard).

## Phase 4 — Public page & RSVP (built)

- **`/w/[slug]`** — server-rendered invitation: CSS-only hero with the couple's theme colors, story, ceremony cards (timezone-aware dates/times, maps links, dress codes), and the RSVP section. Dynamic OG metadata per slug. Non-published slugs 404.
- **`POST /api/rsvp?slug=…`** — rate limited (5/h/IP) + Turnstile verified. Zod-validated; email or phone required; NDPA consent required; duplicates never rejected. Atomically registers the guest in one transaction: `UPDATE events SET …_seq = seq + 1 … RETURNING` (row-lock counter), cap enforcement, insert with unique `public_token` (16 random bytes hex). On cap-full: "RSVPs are full for this wedding" + email to the couple with an upgrade link.

## Phase 5 — Pass generation, OG, calendar (built)

- **Pass PNG** (1080×1920) via Satori + @resvg/resvg-js (Node runtime): gold-bordered card over a pre-blurred Cloudinary hero (no backdrop-filter — unsupported in Satori), "Cordially Inviting {name}", side pill, display ID, date + reception venue, both signatures, QR (local `qrcode` pkg) encoding `{APP_URL}/p/{public_token}` — never the display ID. Min text 28px. Fonts in `public/fonts/`.
- **Async after commit**: RSVP route fires `generateAndStorePass()` (fire-and-forget) — renders once, uploads to Cloudinary, stores `pass_image_url`. Never regenerated per view.
- **`GET /api/pass/[token]`** — rate-limited lookup used by the celebration screen to poll and swap in the PNG when ready (`{ guestCode, passImageUrl, ready }`).
- **Celebration screen** — soft gold `canvas-confetti` (respects `prefers-reduced-motion`), placeholder 9:16 card with the guest code, then the real PNG; **Download PNG**, **Share on WhatsApp**, **Add to Calendar** buttons.
- **`GET /w/[slug]/calendar`** — `.ics` built from the reception time in the event timezone.
- **`/w/[slug]/opengraph-image`** — 1200×630 Satori OG image (names + date + hero) for WhatsApp link previews.

## Phase 6 — Dashboard guest management (built)

- **`GET /api/events/[id]/guests`** — owner-only guest list (401 unauthenticated, 404 for other owners), paginated, returns `total` + `guestCap`.
- **`GET /api/events/[id]/guests/export`** — owner-only CSV (BOM-prefixed UTF-8, quoted fields) with guest ID, side, names, contact, dietary, checked-in, RSVP date.
- **`DELETE /api/events/[id]/guests/[guestId]`** — NDPA erasure, owner-only. Hard delete; guest IDs are never reused, so numbering keeps no gaps/duplicates.
- **`PATCH /api/events/[id]`** — edit details after publishing: names, date, timezone, theme, hero, signatures, story, monogram, ceremonies (replaces the set; only enabled ones are stored). **The slug is not in the schema at all, so it can never change.**
- **Dashboard** — capacity meter (gold → amber at 90% → red at 100%) with an **Upgrade** flow (Grand tier, difference-only pricing via the Phase 3 payment path), guest table with per-row **Delete** + confirm, **Export CSV**, copy/WhatsApp link, and **Edit details** deep-linking to `/studio?event=<id>`.
- **Studio editing** — loading `/studio?event=<id>` prefills the published event (owner-scoped) and saves through `PATCH` instead of creating a new draft.

Verified: `scripts/phase6-test.mjs` (9 checks), `scripts/phase6b-test.mjs` (5 checks incl. CSV row + delete), `scripts/phase6c-test.mjs` (7 checks incl. slug immutability and cross-owner isolation).

### Phase 7 setup
Fonts are committed under `public/fonts/` (Google Fonts, OFL — **static** TTFs; Satori's bundled opentype parser crashes on variable fonts). `@resvg/resvg-js` and `satori` are native/wasm-bearing — already marked `serverExternalPackages` in `next.config.ts`.
Fonts are committed under `public/fonts/` (Google Fonts, OFL — **static** TTFs; Satori's bundled opentype parser crashes on variable fonts). `@resvg/resvg-js` and `satori` are native/wasm-bearing — already marked `serverExternalPackages` in `next.config.ts`.

## Local development (no external accounts needed)

The app runs fully offline for development:

| Concern | Production | Local dev fallback |
|---|---|---|
| Database | Neon/Supabase via `DATABASE_URL` | `node scripts/dev-db.mjs` (embedded Postgres, port 5433, data in `.pgdata/`) |
| Photos / signatures | Cloudinary signed direct upload | `POST /api/uploads/local` → writes to `public/uploads/` (403 in production) |
| Pass PNG storage | Cloudinary | writes to `public/passes/` (throws in production) |
| Magic-link email | Resend | the sign-in URL is returned as `devMagicLink` in the save response |
| Payments | Paystack checkout + webhook | needs `PAYSTACK_SECRET_KEY` (test key) |

Run: `node scripts/dev-db.mjs` → `npm run db:migrate` → `node scripts/seed-demo.mjs` (prints a demo slug) → `npm run dev`.

Env vars: `DATABASE_URL`, `AUTH_SECRET`, `APP_URL`, `RESEND_API_KEY`, `EMAIL_FROM`, `CLOUDINARY_*`, `PAYSTACK_SECRET_KEY`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`.

