import { Resend } from "resend";

let client: Resend | null = null;

function resend(): Resend {
  if (!client) {
    client = new Resend(process.env.RESEND_API_KEY);
  }
  return client;
}

/** True only when a real (non-placeholder) Resend key is present. */
export function emailConfigured(): boolean {
  const key = process.env.RESEND_API_KEY ?? "";
  return key.length > 10 && !["re_xxx", "your-key", "xxx"].includes(key);
}

/** Resend resolves with { error } instead of throwing — normalise that. */
async function send(payload: Parameters<Resend["emails"]["send"]>[0]): Promise<void> {
  if (!emailConfigured()) {
    throw new Error("Email is not configured");
  }
  const res = (await resend().emails.send(payload)) as { error?: { message?: string } };
  if (res?.error) {
    throw new Error(`Resend error: ${res.error.message ?? "unknown"}`);
  }
}

export function emailFrom(): string {
  return process.env.EMAIL_FROM ?? "Aravow <onboarding@resend.dev>";
}

export async function sendMagicLinkEmail(email: string, url: string): Promise<void> {
  await send({
    from: emailFrom(),
    to: email,
    subject: "Your Aravow sign-in link",
    html: `
      <div style="font-family: Georgia, serif; background:#0B0C10; color:#F9F8F6; padding:40px;">
        <p style="color:#D4AF37; letter-spacing:2px; font-size:12px;">ARAVOW</p>
        <h1 style="font-weight:400;">Your sign-in link</h1>
        <p style="color:#E8D3C4;">Click below to continue crafting your wedding suite. This link expires in 15 minutes.</p>
        <p><a href="${url}" style="background:#D4AF37; color:#0B0C10; padding:12px 24px; text-decoration:none;">Sign in to Aravow</a></p>
        <p style="color:#666; font-size:12px;">If you did not request this, ignore this email.</p>
      </div>`,
  });
}

export async function sendCapReachedEmail(email: string, slug: string): Promise<void> {
  const upgradeUrl = `${process.env.APP_URL ?? "http://localhost:3000"}/dashboard`;
  await send({
    from: emailFrom(),
    to: email,
    subject: "RSVPs are full — consider upgrading",
    html: `
      <div style="font-family: Georgia, serif; background:#0B0C10; color:#F9F8F6; padding:40px;">
        <p style="color:#D4AF37; letter-spacing:2px; font-size:12px;">ARAVOW</p>
        <h1 style="font-weight:400;">Your guest list is full</h1>
        <p style="color:#E8D3C4;">RSVPs for your wedding page have reached the current guest limit.
        Guests are now seeing "RSVPs are full for this wedding".</p>
        <p><a href="${upgradeUrl}" style="background:#D4AF37; color:#0B0C10; padding:12px 24px; text-decoration:none;">Upgrade your guest cap</a></p>
      </div>`,
  });
}

export async function sendReceiptEmail(
  email: string,
  publicUrl: string,
  tierLabel: string,
  amountNaira: string,
): Promise<void> {
  await send({
    from: emailFrom(),
    to: email,
    subject: "Your Aravow invitation is live",
    html: `
      <div style="font-family: Georgia, serif; background:#0B0C10; color:#F9F8F6; padding:40px;">
        <p style="color:#D4AF37; letter-spacing:2px; font-size:12px;">ARAVOW</p>
        <h1 style="font-weight:400;">Your invitation is live</h1>
        <p style="color:#E8D3C4;">Payment received: ${amountNaira} (${tierLabel}).</p>
        <p>Share your wedding page:</p>
        <p><a href="${publicUrl}" style="background:#D4AF37; color:#0B0C10; padding:12px 24px; text-decoration:none;">${publicUrl}</a></p>
      </div>`,
  });
}
