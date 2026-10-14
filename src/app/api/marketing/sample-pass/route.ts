import { NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import path from "path";
import { renderPass, type PassData } from "@/lib/pass";
import { appUrl } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Dev-only: renders a sample access pass for the marketing landing page using
 * the REAL pass pipeline, so the page shows the genuine deliverable rather than
 * a mock. Writes to public/marketing/sample-pass.png. Never served in production.
 */
export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const base = appUrl();

  const data: PassData = {
    guestFirstName: "Adaeze",
    guestLastName: "Okafor",
    side: "GROOM",
    guestCode: "G-DA-001",
    publicToken: "9f2c1d7a4b6e8f0a1c3e5d7b9f1a2c4e",
    monogram: "DA",
    groomName: "Dele",
    brideName: "Amaka",
    weddingDate: new Date("2026-12-12T15:00:00.000Z"),
    timezone: "Africa/Lagos",
    receptionVenue: "The Grand Ballroom, Eko Atlantic",
    // Local absolute URL: renderPass fetches this server-side. In production the
    // couple's Cloudinary hero is used and blurred by a delivery transformation.
    heroImageUrl: `${base}/marketing/pass-bg.jpg`,
    groomSignatureUrl: null,
    brideSignatureUrl: null,
    theme: { primary: "#D4AF37", accent: "#E8D3C4" },
  };

  const png = await renderPass(data);
  await writeFile(
    path.join(process.cwd(), "public", "marketing", "sample-pass.png"),
    png,
  );

  return new NextResponse(new Uint8Array(png), {
    headers: { "Content-Type": "image/png", "Cache-Control": "no-store" },
  });
}
