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

function resolveMigrationsFolder(): string {
  if (process.env.MIGRATIONS_DIR) return path.resolve(process.env.MIGRATIONS_DIR);
  const candidates = [
    path.resolve(__dirname, "../../lib/db/migrations"),
    path.resolve(__dirname, "../../../../lib/db/migrations"),
    path.resolve(__dirname, "../../../lib/db/migrations"),
  ];
  const found = candidates.find((candidate) => existsSync(candidate));
  if (!found) {
    console.error(
      "Could not locate the migrations folder. Set MIGRATIONS_DIR explicitly. Tried:\n" +
      candidates.map((c) => "  - " + c).join("\n"),
    );
    process.exit(1);
  }
  return found;
}

async function main() {
  const pool = new pg.Pool({ connectionString: databaseUrl });
  const db = drizzle(pool);
  const migrationsFolder = resolveMigrationsFolder();

  await pool.query("select pg_advisory_lock(hashtext('kaira_africa_migrations'))");
  try {
    console.log("Applying migrations from " + migrationsFolder + " ...");
    await migrate(db, { migrationsFolder });
    console.log("Migrations applied successfully.");
  } finally {
    await pool.query("select pg_advisory_unlock(hashtext('kaira_africa_migrations'))").catch(() => undefined);
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
