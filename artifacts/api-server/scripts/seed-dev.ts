/**
 * LOCAL DEV/TEST SEED ONLY.
 *
 * Phase 3 added a real +220/OTP login flow (/auth/request-otp +
 * /auth/verify-otp) — prefer exercising that directly for auth
 * testing. This script remains as a fast way to seed a user +
 * business + session without going through OTP/rate limits, useful
 * for testing Phase 2 business routes in isolation.
 *
 * Run with: DATABASE_URL=... npx tsx scripts/seed-dev.ts
 */
import { eq } from "drizzle-orm";
import { db, users, businesses, userSessions } from "@workspace/db";
import { generateSessionToken, hashToken } from "../src/lib/tokens";

async function main() {
  const [user] = await db
    .insert(users)
    .values({
      phoneCountryCode: "+220",
      phoneNumber: "7001234",
      firstName: "Amie",
      lastName: "Jallow",
      email: null,
      role: "owner",
      status: "active",
    })
    .returning();

  const [business] = await db
    .insert(businesses)
    .values({
      ownerId: user.id,
      name: "Kaira Test Traders",
      type: "Retail",
      industry: "General Trade",
      country: "The Gambia",
      city: "Banjul",
      status: "active",
    })
    .returning();

  await db
    .update(users)
    .set({ businessId: business.id })
    .where(eq(users.id, user.id));

  const rawToken = generateSessionToken("usr");
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await db.insert(userSessions).values({
    userId: user.id,
    tokenHash: hashToken(rawToken),
    expiresAt,
  });

  console.log("Seed complete.");
  console.log("userId:", user.id);
  console.log("businessId:", business.id);
  console.log("Bearer token (dev/test only):", rawToken);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
