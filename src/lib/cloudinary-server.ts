/**
 * Server-side Cloudinary upload (passes only). Guest/couple photos always go
 * browser → Cloudinary directly; the pass PNG is generated server-side after
 * commit and uploaded here.
 */
import { createHash } from "crypto";

function env() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("Cloudinary is not configured");
  }
  return { cloudName, apiKey, apiSecret };
}

export async function uploadPassPng(png: Buffer, publicId: string): Promise<string> {
  const hasCloudinary =
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET;

  // Dev fallback: store locally when Cloudinary isn't configured.
  // (Production always uploads to Cloudinary — the spec's storage/CDN.)
  if (!hasCloudinary) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Cloudinary is not configured");
    }
    const { writeFile, mkdir } = await import("fs/promises");
    const path = await import("path");
    const rel = `passes/${publicId}.png`.replace(/\\/g, "/");
    const abs = path.join(process.cwd(), "public", rel);
    await mkdir(path.dirname(abs), { recursive: true });
    await writeFile(abs, png);
    return `/${rel}`;
  }

  const { cloudName, apiKey, apiSecret } = env();
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = publicId.split("/").slice(0, -1).join("/");
  const toSign = `public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
  const signature = createHash("sha1").update(toSign).digest("hex");

  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(png)], { type: "image/png" }), "pass.png");
  form.append("api_key", apiKey);
  form.append("timestamp", String(timestamp));
  form.append("public_id", publicId);
  form.append("signature", signature);
  if (folder) form.append("folder", folder);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    throw new Error("pass upload failed");
  }
  const data = (await res.json()) as { secure_url: string };
  return data.secure_url;
}
