/**
 * Applies pending migrations using drizzle-orm's programmatic migrator
 * (NOT the drizzle-kit CLI) — this is what makes migrations runnable
 * from the pruned production image (see Dockerfile), which has
 * drizzle-orm/pg as regular dependencies but does not have drizzle-kit
 * or the full pnpm workspace context available.
 *
 * Intended to run as a one-off release step (Railway "Release
 * Command" / Render "Pre-Deploy Command" / a CI job), NOT
 * automatically on every container boot — running it from N replicas
 * simultaneously on every boot is a real footgun (races, locks).
 *
 * Run with: DATABASE_URL=... node dist/scripts/migrate.mjs
 * (or, from source in dev): DATABASE_URL=... npx tsx scripts/migrate.ts
 */
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const databaseUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL (or DIRECT_URL) must be set to run migrations.");
  process.exit(1);
}

/**
 * This script runs from two different layouts, and rather than guess
 * which one via string-matching on paths (fragile — got this wrong
 * once already), it just tries every candidate and uses whichever
 * actually exists:
 *  - Docker production image: dist/scripts/migrate.mjs, with
 *    migrations copied to ./lib/db/migrations alongside dist/ (see
 *    Dockerfile) → ../../lib/db/migrations from this file.
 *  - Monorepo dev, bundled: artifacts/api-server/dist/scripts/migrate.mjs,
 *    real migrations at lib/db/migrations from the repo root →
 *    ../../../../lib/db/migrations from this file.
 *  - Monorepo dev, via tsx from source: artifacts/api-server/scripts/migrate.ts
 *    → ../../../lib/db/migrations from this file.
 *  - Explicit override for anything else.
 */
function resolveMigrationsFolder(): string {
  if (process.env.MIGRATIONS_DIR) {
    return path.resolve(process.env.MIGRATIONS_DIR);
  }

  const candidates = [
    path.resolve(__dirname, "../../lib/db/migrations"),
    path.resolve(__dirname, "../../../../lib/db/migrations"),
    path.resolve(__dirname, "../../../lib/db/migrations"),
  ];

  const found = candidates.find((candidate) => existsSync(candidate));
  if (!found) {
    console.error(
      "Could not locate the migrations folder. Set MIGRATIONS_DIR explicitly. Tried:\n" +
        candidates.map((c) => `  - ${c}`).join("\n"),
    );
    process.exit(1);
  }
  return found;
}

async function main() {
  const pool = new pg.Pool({ connectionString: databaseUrl });
  const db = drizzle(pool);

  const migrationsFolder = resolveMigrationsFolder();
  console.log(`Applying migrations from ${migrationsFolder} ...`);
  await migrate(db, { migrationsFolder });
  console.log("Migrations applied successfully.");

  await pool.end();
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
