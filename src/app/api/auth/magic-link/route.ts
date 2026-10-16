import { NextResponse } from "next/server";
import { z } from "zod";
import { createMagicToken, appUrl } from "@/lib/auth";
import { sendMagicLinkEmail } from "@/lib/email";
import { rateLimit, clientIp } from "@/lib/rate-limit";

const bodySchema = z.object({ email: z.string().email() });

export async function POST(req: Request) {
  const ip = clientIp(req);
  if (!rateLimit(`magic-link:${ip}`, 5, 15 * 60 * 1000).ok) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
  }
  const { email } = parsed.data;

  const token = await createMagicToken(email);
  const url = `${appUrl()}/auth/verify?token=${encodeURIComponent(token)}`;

  try {
    await sendMagicLinkEmail(email, url);
  } catch (err) {
    // Never log full PII; log only that it failed.
    console.error("magic link email failed");
    return NextResponse.json(
      { error: "Could not send the sign-in email. Try again." },
      { status: 500 },
    );
  }

  // In dev without RESEND_API_KEY the send may silently fail above; still return ok
  // so the UI flow works (token is logged to server console in dev only).
  if (process.env.NODE_ENV !== "production") {
    console.log(`[dev] magic link for ${email.slice(0, 2)}***: ${url}`);
  }

  return NextResponse.json({ ok: true });
}
