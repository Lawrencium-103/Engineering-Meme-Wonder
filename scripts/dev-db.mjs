/**
 * Dev-only embedded PostgreSQL (Windows-friendly, no admin needed).
 * Usage: node scripts/dev-db.mjs   (starts and stays alive)
 */
import EmbeddedPostgres from "embedded-postgres";
import { mkdirSync } from "fs";

const DATA_DIR = process.cwd() + "/.pgdata";
mkdirSync(DATA_DIR, { recursive: true });

const pg = new EmbeddedPostgres({
  databaseDir: DATA_DIR,
  user: "postgres",
  password: "postgres",
  port: 5433,
  persistent: true,
});

async function main() {
  try {
    await pg.initialise();
  } catch {
    // already initialised
  }
  try {
    await pg.start();
  } catch (e) {
    if (!String(e).includes("already")) throw e;
  }
  try {
    await pg.createDatabase("aravow");
  } catch {
    // exists
  }
  console.log("dev postgres ready on port 5433 (database: aravow)");

  const shutdown = async () => {
    try {
      await pg.stop();
    } finally {
      process.exit(0);
    }
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
