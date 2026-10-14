import { z } from "zod";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { events } from "@/db/schema";
import { guests } from "@/db/schema";
import { randomBytes } from "crypto";

/**
 * Atomic guest registration. The guest ID counter lives on the event row and
 * is incremented with UPDATE ... RETURNING inside the caller's transaction.
 * NEVER use SELECT COUNT(*) ... FOR UPDATE (not a valid lock target in
 * Postgres and unsafe for the first row).
 */

export const rsvpSchema = z.object({
  side: z.enum(["GROOM", "BRIDE"]),
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  /** At least one of email / phone must be present (checked in superRefine). */
  email: z.string().email().max(255).optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  dietary: z.string().trim().max(300).optional().or(z.literal("")),
  /** Total people attending with this RSVP (guest + plus-ones). Caps count people. */
  partySize: z.coerce.number().int().min(1).max(10).optional().default(1),
  consent: z.literal(true, { message: "Consent is required" }),
  turnstileToken: z.string().min(1).optional(),
}).superRefine((val, ctx) => {
  if (!val.email && !val.phone) {
    ctx.addIssue({
      code: "custom",
      message: "Please provide an email address or a phone number.",
      path: ["email"],
    });
  }
});

export type RsvpInput = z.infer<typeof rsvpSchema>;

export class CapReachedError extends Error {}

export interface RegisteredGuest {
  id: string;
  guestCode: string;
  publicToken: string;
  seq: number;
}

/** Verify a Cloudflare Turnstile token with our secret. No-op when unset (dev). */
export async function verifyTurnstile(token: string | undefined, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true; // dev / not configured
  if (!token) return false;
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token, remoteip: ip }),
    });
    const data = (await res.json()) as { success: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}

/**
 * Display code {G|B}-{MONOGRAM}-{3-digit padded seq}-{XX} where XX is 2 random
 * letters (A–Z excluding I and O to avoid confusion with 1 and 0). The random
 * suffix makes codes unguessable — the sequence alone would let anyone walk
 * the guest list. Display only, not a credential (the publicToken is).
 * Existing codes without the suffix remain valid.
 */
const CODE_LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // no I, no O

export function randomCodeSuffix(): string {
  const bytes = randomBytes(2);
  return CODE_LETTERS[bytes[0] % CODE_LETTERS.length] + CODE_LETTERS[bytes[1] % CODE_LETTERS.length];
}

export function formatGuestCode(prefix: "G" | "B", monogram: string, seq: number): string {
  return `${prefix}-${monogram}-${String(seq).padStart(3, "0")}-${randomCodeSuffix()}`;
}

/**
 * Register a guest atomically: claim the sequence, enforce the cap, insert.
 * Runs in ONE transaction; any failure rolls back so numbering has no gaps.
 */
export async function registerGuest(
  eventId: string,
  input: RsvpInput,
): Promise<RegisteredGuest> {
  return db.transaction(async (tx) => {
    // 1. Lock the event row and atomically bump the per-side counter.
    const counterCol = input.side === "GROOM" ? events.groomSeq : events.brideSeq;
    const prefix = input.side === "GROOM" ? "G" : "B";

    const [updated] = await tx
      .update(events)
      .set(
        input.side === "GROOM"
          ? { groomSeq: sql`${events.groomSeq} + 1` }
          : { brideSeq: sql`${events.brideSeq} + 1` },
      )
      .where(and(eq(events.id, eventId), eq(events.status, "PUBLISHED")))
      .returning({
        seq: counterCol,
        guestCap: events.guestCap,
        monogram: events.monogram,
        groomSeq: events.groomSeq,
        brideSeq: events.brideSeq,
      });

    if (!updated) {
      throw new Error("event-not-publishable");
    }

    // 2. Enforce the cap inside the same transaction. The cap counts PEOPLE
    // (sum of party sizes), not RSVP rows — one party of 4 uses 4 seats.
    const [{ totalPeople }] = await tx
      .select({ totalPeople: sql<number>`coalesce(sum(${guests.partySize}), 0)::int` })
      .from(guests)
      .where(eq(guests.eventId, eventId));
    if (totalPeople + input.partySize > updated.guestCap) {
      throw new CapReachedError();
    }

    // 3. Build the guest row. publicToken = 16 random bytes, hex (32 chars).
    const seq = updated.seq;
    const publicToken = randomBytes(16).toString("hex");
    const guestCode = formatGuestCode(prefix, updated.monogram, seq);

    const [guest] = await tx
      .insert(guests)
      .values({
        eventId,
        side: input.side,
        seq,
        guestCode,
        publicToken,
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email || null,
        phone: input.phone || null,
        dietary: input.dietary || null,
        partySize: input.partySize,
      })
      .returning({
        id: guests.id,
        guestCode: guests.guestCode,
        publicToken: guests.publicToken,
        seq: guests.seq,
      });

    return guest;
  });
}
