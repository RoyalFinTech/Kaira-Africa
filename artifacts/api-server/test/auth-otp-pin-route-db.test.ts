import assert from "node:assert/strict";
import { eq } from "drizzle-orm";
import { randomInt } from "node:crypto";
import type { Server } from "node:http";
import type Redis from "ioredis";
import { after, test } from "node:test";
import express from "express";
import {
  authAuditLogs,
  db,
  otpVerifications,
  pool,
  users,
} from "@workspace/db";
import { errorHandler } from "../src/middlewares/error-handler";
import { hashOtp } from "../src/lib/otp";
import { verifyPin } from "../src/lib/pin";

// This route-level test runs only in Backend CI's disposable PostgreSQL and
// Redis services after fresh migrations. It pre-seeds a hashed OTP record:
// it tests verification/session/PIN behavior but intentionally sends no SMS.
const databaseAcceptanceEnabled =
  process.env.KAIRA_DB_INTEGRATION_TESTS === "true";
const testPhoneNumbers: string[] = [];
const testUserIds: string[] = [];
let server: Server | null = null;
let baseUrl = "";
let redisClient: Redis | null = null;

function randomPhone(): string {
  return `87${randomInt(1_000_000, 9_999_999)}`;
}

async function startTestServer(): Promise<void> {
  // Lazy imports keep the non-DB Work Management workflow from connecting to
  // Redis or building provider clients when this opt-in suite is skipped.
  const redisModule = await import("../src/lib/redis");
  redisClient = redisModule.redis;
  const authModule = await import("../src/routes/auth");

  const app = express();
  app.use(express.json());
  app.use("/api", authModule.default);
  app.use(errorHandler);

  server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve, reject) => {
    server!.once("listening", resolve);
    server!.once("error", reject);
  });

  const address = server.address();
  assert.ok(address && typeof address !== "string");
  baseUrl = `http://127.0.0.1:${address.port}`;
}

async function request(
  path: string,
  body?: unknown,
  token?: string,
): Promise<Response> {
  return fetch(`${baseUrl}${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      Accept: "application/json",
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(8_000),
  });
}

after(async () => {
  try {
    if (server) {
      await new Promise<void>((resolve, reject) => {
        server!.close((error) => error ? reject(error) : resolve());
      });
      server = null;
    }

    if (redisClient) {
      try {
        await redisClient.quit();
      } catch {
        redisClient.disconnect();
      }
      redisClient = null;
    }

    // Discover users by the unique CI phones in case the OTP route created a
    // user before an assertion failed. Remove only this suite's test identities.
    for (const phoneNumber of testPhoneNumbers) {
      const matchingUsers = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.phoneNumber, phoneNumber));
      for (const user of matchingUsers) {
        if (!testUserIds.includes(user.id)) testUserIds.push(user.id);
      }

      await db.delete(otpVerifications)
        .where(eq(otpVerifications.phoneNumber, phoneNumber));
    }

    for (const userId of testUserIds) {
      await db.delete(authAuditLogs)
        .where(eq(authAuditLogs.actorId, userId));
      await db.update(users)
        .set({ businessId: null })
        .where(eq(users.id, userId));
      await db.delete(users)
        .where(eq(users.id, userId));
    }
  } finally {
    await pool.end();
  }
});

test("OTP verification creates a user session and the PIN setup/login HTTP flow works", {
  skip: !databaseAcceptanceEnabled,
}, async () => {
  const phoneNumber = randomPhone();
  testPhoneNumbers.push(phoneNumber);
  const phoneKey = `+220${phoneNumber}`;
  const code = String(randomInt(100_000, 999_999));

  const [seededOtp] = await db
    .insert(otpVerifications)
    .values({
      phoneCountryCode: "+220",
      phoneNumber,
      codeHash: hashOtp(code, phoneKey),
      purpose: "login",
      attempts: 0,
      maxAttempts: 5,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    })
    .returning({ id: otpVerifications.id });

  await startTestServer();

  const verifyResponse = await request("/api/auth/verify-otp", {
    phoneNumber: phoneKey,
    code,
  });
  assert.equal(verifyResponse.status, 200);
  const verified = await verifyResponse.json() as {
    token: string;
    isNewUser: boolean;
    user: { id: string; phone: string; role: string; businessId: string | null };
  };

  assert.ok(verified.token.startsWith("usr_"));
  assert.equal(verified.isNewUser, true);
  assert.equal(verified.user.phone, phoneKey);
  assert.equal(verified.user.role, "owner");
  assert.equal(verified.user.businessId, null);
  testUserIds.push(verified.user.id);

  const [consumedOtp] = await db
    .select({ consumedAt: otpVerifications.consumedAt })
    .from(otpVerifications)
    .where(eq(otpVerifications.id, seededOtp.id))
    .limit(1);
  assert.ok(consumedOtp?.consumedAt, "successful OTP verification consumes the code");

  const meResponse = await request("/api/auth/me", undefined, verified.token);
  assert.equal(meResponse.status, 200);
  const me = await meResponse.json() as { id: string; phone: string };
  assert.equal(me.id, verified.user.id);
  assert.equal(me.phone, phoneKey);

  const firstPin = "583917";
  const setPinResponse = await request(
    "/api/auth/set-pin",
    { pin: firstPin },
    verified.token,
  );
  assert.equal(setPinResponse.status, 204);

  const [afterPinSetup] = await db
    .select({ pinHash: users.pinHash })
    .from(users)
    .where(eq(users.id, verified.user.id))
    .limit(1);
  assert.ok(afterPinSetup?.pinHash);
  assert.ok(afterPinSetup.pinHash.startsWith("$argon2id$"));
  assert.notEqual(afterPinSetup.pinHash, firstPin);
  assert.equal(await verifyPin(afterPinSetup.pinHash, firstPin), true);

  const missingCurrentPinResponse = await request(
    "/api/auth/set-pin",
    { pin: "739251" },
    verified.token,
  );
  assert.equal(
    missingCurrentPinResponse.status,
    401,
    "changing an existing PIN must require proof of the current PIN",
  );

  const changePinResponse = await request(
    "/api/auth/set-pin",
    { pin: "739251", currentPin: firstPin },
    verified.token,
  );
  assert.equal(changePinResponse.status, 204);

  const [afterPinChange] = await db
    .select({ pinHash: users.pinHash })
    .from(users)
    .where(eq(users.id, verified.user.id))
    .limit(1);
  assert.ok(afterPinChange?.pinHash);
  assert.notEqual(afterPinChange.pinHash, afterPinSetup.pinHash);
  assert.equal(await verifyPin(afterPinChange.pinHash, firstPin), false);
  assert.equal(await verifyPin(afterPinChange.pinHash, "739251"), true);

  // Returning users with a configured PIN must use PIN login, not get a
  // newly issued OTP. This branch exits before the SMS provider is called.
  const otpRequestForPinUser = await request("/api/auth/request-otp", {
    phoneNumber: phoneKey,
  });
  assert.equal(otpRequestForPinUser.status, 409);
  const otpRequestError = await otpRequestForPinUser.json() as { error?: { code?: string } };
  assert.equal(otpRequestError.error?.code, "pin_login_required");

  const [otpRowsAfterPinRequest] = await db
    .select({ value: otpVerifications.id })
    .from(otpVerifications)
    .where(eq(otpVerifications.phoneNumber, phoneNumber));
  assert.equal(
    otpRowsAfterPinRequest?.value,
    seededOtp.id,
    "PIN-enabled OTP rejection must not create another verification record",
  );

  const invalidPinLogin = await request("/api/auth/login-pin", {
    phoneNumber: phoneKey,
    pin: firstPin,
  });
  assert.equal(invalidPinLogin.status, 401);

  const validPinLogin = await request("/api/auth/login-pin", {
    phoneNumber: phoneKey,
    pin: "739251",
  });
  assert.equal(validPinLogin.status, 200);
  const pinSession = await validPinLogin.json() as {
    token: string;
    isNewUser: boolean;
    user: { id: string; phone: string; role: string };
  };
  assert.ok(pinSession.token.startsWith("usr_"));
  assert.equal(pinSession.isNewUser, false);
  assert.equal(pinSession.user.id, verified.user.id);
  assert.equal(pinSession.user.phone, phoneKey);

  const pinMeResponse = await request(
    "/api/auth/me",
    undefined,
    pinSession.token,
  );
  assert.equal(pinMeResponse.status, 200);
  const pinMe = await pinMeResponse.json() as { id: string };
  assert.equal(pinMe.id, verified.user.id);
});
