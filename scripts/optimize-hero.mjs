// Optimize marketing hero images: PNG -> WebP (full + mobile) + OG card.
// Usage: node scripts/optimize-hero.mjs
import sharp from "sharp";
import { readdir, mkdir } from "node:fs/promises";
import path from "node:path";

const SRC = path.join(process.cwd(), "public", "marketing");

// Marketing heroes: served behind headline text on 4G. Keep them light.
const TARGETS = [
  { suffix: "", width: 1672, quality: 80 },
  { suffix: "-900", width: 900, quality: 76 },
];

async function main() {
  await mkdir(SRC, { recursive: true });
  const files = (await readdir(SRC)).filter(
    (f) => f.endsWith(".png") && f.startsWith("hero-"),
  );

  if (files.length === 0) {
    console.log("No hero-*.png found in public/marketing");
    return;
  }

  for (const file of files) {
    const base = path.basename(file, ".png");
    for (const t of TARGETS) {
      const out = path.join(SRC, `${base}${t.suffix}.webp`);
      const info = await sharp(path.join(SRC, file))
        .resize({ width: t.width, withoutEnlargement: true })
        .webp({ quality: t.quality, effort: 6 })
        .toFile(out);
      console.log(
        `${path.basename(out).padEnd(18)} ${info.width}x${info.height}  ${(info.size / 1024).toFixed(0)} KB`,
      );
    }

    // Social/OG fallback card (1200x630) cropped from the centre-top.
    const og = path.join(SRC, `og-${base.replace("hero-", "")}.jpg`);
    const ogInfo = await sharp(path.join(SRC, file))
      .resize({ width: 1200, height: 630, fit: "cover", position: "top" })
      .jpeg({ quality: 78, mozjpeg: true })
      .toFile(og);
    console.log(
      `${path.basename(og).padEnd(18)} ${ogInfo.width}x${ogInfo.height}  ${(ogInfo.size / 1024).toFixed(0)} KB`,
    );
  }

  // 9:16 pass background, pre-blurred and darkened.
  // Production does this with a Cloudinary e_blur:2000 transformation on the
  // couple's own photo; Satori cannot do backdrop-filter, so it must be baked.
  const passBg = await sharp(path.join(SRC, "hero-01.png"))
    .resize({ width: 1080, height: 1920, fit: "cover", position: "right" })
    .blur(26)
    .modulate({ brightness: 0.68 })
    .jpeg({ quality: 84, mozjpeg: true })
    .toFile(path.join(SRC, "pass-bg.jpg"));
  console.log(
    `${"pass-bg.jpg".padEnd(18)} ${passBg.width}x${passBg.height}  ${(passBg.size / 1024).toFixed(0)} KB`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
