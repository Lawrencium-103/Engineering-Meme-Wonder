/**
 * Copy runtime .wasm assets into .next/standalone after `next build`.
 *
 * Next's file tracer (nft) cannot follow dynamically-computed paths, so the
 * wasm blobs loaded at runtime by satori/harfbuzz/yoga never land in the
 * standalone bundle — the server then aborts at boot with ENOENT hb.wasm.
 * Runs automatically via the npm "postbuild" script (works in the Docker
 * builder stage too, since that runs npm run build).
 */
import { readdir, mkdir, copyFile, stat } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const outRoot = path.join(root, ".next", "standalone");

try {
  await stat(path.join(outRoot, "server.js"));
} catch {
  console.log("[standalone-assets] no standalone bundle (output:standalone off?) — skipped");
  process.exit(0);
}

const wasmFiles = [];

async function walk(dir, allowNestedNodeModules) {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "node_modules" && !allowNestedNodeModules) continue;
      await walk(p, false);
    } else if (e.name.endsWith(".wasm")) {
      wasmFiles.push(p);
    }
  }
}

await walk(path.join(root, "node_modules"), true);

let copied = 0;
for (const src of wasmFiles) {
  const rel = path.relative(root, src);
  const dest = path.join(outRoot, rel);
  await mkdir(path.dirname(dest), { recursive: true });
  await copyFile(src, dest);
  copied++;
}
console.log(`[standalone-assets] copied ${copied} wasm file(s) into .next/standalone`);
