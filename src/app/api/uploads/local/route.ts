import { NextResponse } from "next/server";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { randomBytes } from "crypto";

/**
 * DEV-ONLY upload endpoint. In production, photos go browser → Cloudinary
 * directly (see /api/uploads/sign); this route exists purely so the Studio is
 * usable locally without Cloudinary credentials. It refuses to run in prod.
 */
export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available." }, { status: 403 });
  }

  const ip = clientIp(req);
  if (!rateLimit(`local-upload:${ip}`, 40, 10 * 60 * 1000).ok) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const kind = new URL(req.url).searchParams.get("kind");
  if (kind !== "hero" && kind !== "signature") {
    return NextResponse.json({ error: "Invalid kind." }, { status: 400 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid upload." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Only images are allowed." }, { status: 400 });
  }
  const maxBytes = 10 * 1024 * 1024;
  if (file.size > maxBytes) {
    return NextResponse.json({ error: "File too large." }, { status: 413 });
  }

  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const name = `${randomBytes(8).toString("hex")}.${ext}`;

  const { writeFile, mkdir } = await import("fs/promises");
  const path = await import("path");
  const dir = path.join(process.cwd(), "public", "uploads", kind);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));

  return NextResponse.json({ secure_url: `/uploads/${kind}/${name}` });
}
