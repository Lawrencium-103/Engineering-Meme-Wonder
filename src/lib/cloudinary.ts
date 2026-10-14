import { createHash } from "crypto";

/**
 * Cloudinary signed direct-upload helper.
 * The browser uploads straight to Cloudinary — photo bytes never pass through
 * our API routes (serverless body limits).
 */

export interface SignedUpload {
  uploadUrl: string;
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
}

/** True only when real (non-placeholder) Cloudinary credentials are present. */
export function cloudinaryConfigured(): boolean {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME ?? "";
  const apiKey = process.env.CLOUDINARY_API_KEY ?? "";
  const apiSecret = process.env.CLOUDINARY_API_SECRET ?? "";
  const placeholders = ["your-cloud", "1234567890", "your-secret", "xxx", ""];
  if (placeholders.includes(cloudName) || placeholders.includes(apiKey) || placeholders.includes(apiSecret)) {
    return false;
  }
  return true;
}

function cloudinaryEnv() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("Cloudinary environment variables are not configured");
  }
  return { cloudName, apiKey, apiSecret };
}

/** SHA-1 signature over sorted params + secret, per Cloudinary docs. */
function signParams(params: Record<string, string>, apiSecret: string): string {
  const toSign = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return createHash("sha1").update(toSign + apiSecret).digest("hex");
}

export function createSignedUpload(folder: string): SignedUpload {
  const { cloudName, apiKey, apiSecret } = cloudinaryEnv();
  const timestamp = Math.floor(Date.now() / 1000);
  // Only folder + timestamp are signed; the browser cannot add arbitrary params.
  const signature = signParams({ folder, timestamp: String(timestamp) }, apiSecret);
  return {
    uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    cloudName,
    apiKey,
    timestamp,
    signature,
    folder,
  };
}

/** Cloudinary delivery URL for a blurred hero (used on passes / OG). */
export function blurredUrl(secureUrl: string, width = 1080): string {
  // e_blur:2000 + q_auto/f_auto; sized for pass background.
  const marker = "/upload/";
  const idx = secureUrl.indexOf(marker);
  if (idx === -1) return secureUrl;
  const transform = `upload/e_blur:2000,c_fill,w_${width},h_${Math.round((width * 1920) / 1080)},q_auto/f_auto/`;
  return secureUrl.slice(0, idx) + "/" + transform + secureUrl.slice(idx + marker.length);
}
