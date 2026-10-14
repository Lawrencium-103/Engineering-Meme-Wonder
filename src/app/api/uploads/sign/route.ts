import { NextResponse } from "next/server";
import { z } from "zod";
import { createSignedUpload, cloudinaryConfigured } from "@/lib/cloudinary";
import { rateLimit, clientIp } from "@/lib/rate-limit";

const bodySchema = z.object({ kind: z.enum(["hero", "signature"]) });

export async function POST(req: Request) {
  const ip = clientIp(req);
  if (!rateLimit(`sign:${ip}`, 30, 10 * 60 * 1000).ok) {
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
    return NextResponse.json({ error: "kind must be 'hero' or 'signature'" }, { status: 400 });
  }

  const folder = parsed.data.kind === "hero" ? "aravow/hero" : "aravow/signatures";

  // Production always uses Cloudinary. Locally, without credentials, fall back
  // to a dev-only endpoint that writes into /public/uploads.
  if (!cloudinaryConfigured()) {
    if (process.env.NODE_ENV === "production") {
      console.error("cloudinary not configured");
      return NextResponse.json({ error: "Uploads are not configured." }, { status: 500 });
    }
    return NextResponse.json({
      mode: "local" as const,
      uploadUrl: `/api/uploads/local?kind=${parsed.data.kind}`,
      folder,
    });
  }

  const signed = createSignedUpload(folder);
  return NextResponse.json({ mode: "cloudinary" as const, ...signed });
}
