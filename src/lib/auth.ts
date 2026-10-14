import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { accounts } from "@/db/schema";

const SESSION_COOKIE = "av_session";
const MAGIC_PURPOSE = "magic";
const SESSION_PURPOSE = "session";

const MAGIC_TTL_SEC = 15 * 60; // 15 minutes
const SESSION_TTL_SEC = 30 * 24 * 60 * 60; // 30 days

function secretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("AUTH_SECRET must be set to at least 16 characters");
  }
  return new TextEncoder().encode(secret);
}

export function appUrl(): string {
  return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

/** Create a single-use magic link token for an email. */
export async function createMagicToken(email: string): Promise<string> {
  return new SignJWT({ email: email.toLowerCase(), purpose: MAGIC_PURPOSE })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAGIC_TTL_SEC}s`)
    .setJti(crypto.randomUUID())
    .sign(secretKey());
}

/** Verify a magic token; returns the email or null. */
export async function verifyMagicToken(
  token: string,
): Promise<{ email: string } | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (payload.purpose !== MAGIC_PURPOSE || typeof payload.email !== "string") return null;
    return { email: payload.email };
  } catch {
    return null;
  }
}

/** Create a long-lived session token for an account id. */
async function createSessionToken(accountId: string): Promise<string> {
  return new SignJWT({ sub: accountId, purpose: SESSION_PURPOSE })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SEC}s`)
    .sign(secretKey());
}

/** Establish the session cookie for an account (creating the account if needed). */
export async function establishSession(email: string): Promise<string> {
  const normalized = email.toLowerCase();
  let [account] = await db
    .select()
    .from(accounts)
    .where(eq(accounts.email, normalized))
    .limit(1);
  if (!account) {
    [account] = await db
      .insert(accounts)
      .values({ email: normalized })
      .returning();
  }
  const token = await createSessionToken(account.id);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_TTL_SEC,
    path: "/",
  });
  return account.id;
}

/** Get the current logged-in account, or null. */
export async function getSessionAccount() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (payload.purpose !== SESSION_PURPOSE || typeof payload.sub !== "string") return null;
    const [account] = await db
      .select()
      .from(accounts)
      .where(eq(accounts.id, payload.sub))
      .limit(1);
    return account ?? null;
  } catch {
    return null;
  }
}

/** Sign out by clearing the cookie. */
export async function signOut() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}
