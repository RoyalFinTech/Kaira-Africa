/**
 * LOCAL DEV/TEST SEED ONLY.
 *
 * There is no self-service admin signup by design — admin accounts
 * are created out-of-band by ops. This script inserts one admin user
 * directly so /auth/login can be exercised end-to-end.
 *
 * Run with: DATABASE_URL=... npx tsx scripts/seed-admin.ts
 */
import argon2 from "argon2";
import { db, adminUsers } from "@workspace/db";

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@kairaafrica.test";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "Kaira#Admin2026!";
  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });

  const [admin] = await db
    .insert(adminUsers)
    .values({
      email,
      passwordHash,
      firstName: process.env.SEED_ADMIN_FIRST_NAME ?? "Isatou",
      lastName: process.env.SEED_ADMIN_LAST_NAME ?? "Njie",
      role: "super_admin",
      status: "active",
    })
    .returning();

  console.log("Admin seed complete.");
  console.log("adminId:", admin.id);
  console.log("email:", admin.email);
  console.log("password (dev/test only):", password);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
