import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

/**
 * Standard pg Pool (NOT neon-http) — required for interactive transactions
 * used by atomic guest-ID generation and the publish webhook.
 */
const connectionString = process.env.DATABASE_URL!;

export const pool = new Pool({
  connectionString,
  ssl:
    connectionString.includes("localhost") || connectionString.includes("127.0.0.1")
      ? undefined
      : { rejectUnauthorized: false },
  max: 10,
});

export const db = drizzle(pool, { schema });
export { schema };
