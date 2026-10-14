import { NextResponse, type NextRequest } from "next/server";
import { verifyMagicToken, establishSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  // Only allow safe internal redirect targets.
  const nextRaw = req.nextUrl.searchParams.get("next") ?? "/dashboard";
  const next = nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "/dashboard";

  if (!token) {
    return NextResponse.redirect(new URL("/auth/check-email?error=missing", req.url));
  }
  const result = await verifyMagicToken(token);
  if (!result) {
    return NextResponse.redirect(new URL("/auth/check-email?error=expired", req.url));
  }
  await establishSession(result.email);
  return NextResponse.redirect(new URL(next, req.url));
}
