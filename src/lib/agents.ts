import { count, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { agents } from "@/db/schema";

/**
 * Sales-agent codes: AV-01-SWT
 *   AV   — Aravow prefix
 *   01   — monotonic agent number (2+ digits, zero-padded)
 *   SWT  — 3 random letters (no vowels-with-I/O ambiguity; I, O, Q, U excluded)
 */
export const AGENT_CODE_RE = /^AV-\d{2,}-[ACDEFGHJKLMNPRTVWXYZ]{3}$/;

const LETTERS = "ACDEFGHJKLMNPRTVWXYZ"; // 20 consonant-ish chars, easy to read aloud

function randomSuffix(): string {
  const bytes = new Uint8Array(3);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => LETTERS[b % LETTERS.length]).join("");
}

/** Normalise user-typed codes: trim, uppercase, collapse spaces. */
export function normalizeAgentCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

/**
 * Create an agent row and return its generated code.
 * Retries on the (astronomically unlikely) suffix collision — the unique
 * indexes on code/seq are the real guarantee.
 */
export async function createAgent(input: {
  name: string;
  email: string;
  phone?: string | null;
}): Promise<{ id: string; code: string }> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const [{ nextSeq }] = await db
      .select({ nextSeq: sql<number>`coalesce(max(${agents.seq}), 0) + 1` })
      .from(agents);
    const seq = Number(nextSeq);
    const code = `AV-${String(seq).padStart(2, "0")}-${randomSuffix()}`;
    try {
      const [row] = await db
        .insert(agents)
        .values({
          code,
          seq,
          name: input.name,
          email: input.email.toLowerCase(),
          phone: input.phone || null,
        })
        .returning({ id: agents.id, code: agents.code });
      return row;
    } catch {
      // unique violation on code/seq (concurrent registration) → retry
    }
  }
  throw new Error("Could not allocate an agent code — try again.");
}

/** Look up an ACTIVE agent by code (case-insensitive via normalisation). */
export async function findActiveAgentByCode(code: string) {
  const [agent] = await db
    .select()
    .from(agents)
    .where(eq(agents.code, normalizeAgentCode(code)))
    .limit(1);
  return agent && agent.active ? agent : null;
}

/** The agent profile for a signed-in account email, if any. */
export async function findAgentByEmail(email: string) {
  const [agent] = await db
    .select()
    .from(agents)
    .where(eq(agents.email, email.toLowerCase()))
    .limit(1);
  return agent ?? null;
}

/** Total active agents (used for onboarding copy). */
export async function countAgents(): Promise<number> {
  const [{ n }] = await db.select({ n: count() }).from(agents);
  return Number(n ?? 0);
}
