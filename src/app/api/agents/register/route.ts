import { NextResponse } from "next/server";
import { z } from "zod";
import { createMagicToken, appUrl } from "@/lib/auth";
import { sendMagicLinkEmail } from "@/lib/email";
import { createAgent, findAgentByEmail } from "@/lib/agents";
import { rateLimit, clientIp } from "@/lib/rate-limit";

/**
 * Sales-agent self-registration.
 * - Creates the agent with a generated code (AV-01-SWT).
 * - Then sends the usual magic link so the agent lands on /agent signed in.
 * - If AGENT_SIGNUP_CODE is set in the env, registration requires it (keeps
 *   the funnel closed to the recruited team only).
 */
const bodySchema = z.object({
  name: z.string().trim().min(2, "Enter your full name.").max(100),
  email: z.string().email("Enter a valid email."),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  signupCode: z.string().trim().max(60).optional().or(z.literal("")),
});

export async function POST(req: Request) {
  const ip = clientIp(req);
  if (!rateLimit(`agent-register:${ip}`, 5, 15 * 60 * 1000).ok) {
    return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 },
    );
  }
  const { name, email, phone, signupCode } = parsed.data;
  const normalizedEmail = email.toLowerCase();

  // Optional closed-funnel gate.
  const required = process.env.AGENT_SIGNUP_CODE?.trim();
  if (required && signupCode !== required) {
    return NextResponse.json(
      { error: "That team signup code is not recognised." },
      { status: 403 },
    );
  }

  // One agent profile per email — resend the sign-in link instead of duplicating.
  const existing = await findAgentByEmail(normalizedEmail);
  if (existing) {
    return NextResponse.json(
      { error: "This email is already registered. Check your email for your sign-in link." },
      { status: 409 },
    );
  }

  let agent: { id: string; code: string };
  try {
    agent = await createAgent({ name, email: normalizedEmail, phone });
  } catch (err) {
    console.error("agent register failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Could not register right now. Try again." }, { status: 500 });
  }

  const token = await createMagicToken(normalizedEmail);
  const url = `${appUrl()}/auth/verify?token=${encodeURIComponent(token)}&next=/agent`;
  let magicLinkSent = false;
  try {
    await sendMagicLinkEmail(normalizedEmail, url);
    magicLinkSent = true;
  } catch {
    console.error("agent magic link email failed");
    // Dev convenience: never enabled in production. If email isn't configured
    // (or fails locally), return the link so the agent can still get in.
    if (process.env.NODE_ENV !== "production") {
      return NextResponse.json({ ok: true, code: agent.code, magicLinkSent: false, devMagicLink: url });
    }
  }

  return NextResponse.json({ ok: true, code: agent.code, magicLinkSent });
}
