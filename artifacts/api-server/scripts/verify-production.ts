/**
 * Post-deployment smoke check. Run this against a freshly deployed
 * environment (staging or production) to confirm the whole stack is
 * actually reachable and correctly configured — NOT a substitute for
 * the manual verification already done during development (see the
 * Phase 2/3/4 verification reports), but a fast, safe, repeatable
 * check to run after every deploy.
 *
 * Deliberately does NOT:
 *  - send a real SMS or email (costs money / spams real inboxes)
 *  - create real user/admin accounts
 *  - require any real secrets beyond DATABASE_URL/REDIS_URL/SMTP_* and
 *    the base URL of the deployed API
 *
 * Run with:
 *   DATABASE_URL=... REDIS_URL=... SMTP_HOST=... [...] \
 *     VERIFY_BASE_URL=https://api.kairaafrica.com \
 *     node dist/scripts/verify-production.mjs
 * (or, from source in dev: npx tsx scripts/verify-production.ts)
 */
import pg from "pg";
import Redis from "ioredis";
import { env } from "../src/config/env";
import { verifyEmailTransport } from "../src/services/email.service";
import { smsProvider } from "../src/services/sms.service";

const baseUrl = process.env.VERIFY_BASE_URL ?? env.API_BASE_URL;

interface CheckResult {
  name: string;
  ok: boolean;
  detail: string;
}

const results: CheckResult[] = [];

function record(name: string, ok: boolean, detail: string) {
  results.push({ name, ok, detail });
  const icon = ok ? "✅" : "❌";
  console.log(`${icon} ${name}: ${detail}`);
}

async function checkEnvironment() {
  // Importing env.ts already validated and exited on failure if
  // something was wrong — reaching this line means it passed. Report
  // which optional pieces are configured, since that's genuinely
  // useful deploy-time information.
  record(
    "Environment",
    true,
    `NODE_ENV=${env.NODE_ENV}, Redis=${env.REDIS_URL ? "configured" : "not set"}, SMTP=${env.SMTP_HOST ? "configured" : "not set"}, SMS_PROVIDER=${env.SMS_PROVIDER}`,
  );
}

async function checkDatabase() {
  const pool = new pg.Pool({ connectionString: env.DATABASE_URL, connectionTimeoutMillis: 5000 });
  try {
    const result = await pool.query("SELECT 1 AS ok");
    record("PostgreSQL", result.rows[0]?.ok === 1, `Connected to ${maskUrl(env.DATABASE_URL)}`);

    const tableCount = await pool.query(
      "SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema = 'public'",
    );
    const n = tableCount.rows[0]?.n ?? 0;
    record("PostgreSQL schema", n >= 14, `${n} tables found in public schema (expected >= 14)`);
  } catch (err) {
    record("PostgreSQL", false, `Connection failed: ${(err as Error).message}`);
  } finally {
    await pool.end().catch(() => {});
  }
}

async function checkRedis() {
  if (!env.REDIS_URL) {
    record("Redis", false, "REDIS_URL not set — rate limiting will run in degraded in-process mode");
    return;
  }
  const client = new Redis(env.REDIS_URL, { maxRetriesPerRequest: 1, lazyConnect: true, connectTimeout: 5000 });
  try {
    await client.connect();
    const pong = await client.ping();
    record("Redis", pong === "PONG", `Connected to ${maskUrl(env.REDIS_URL)}`);
  } catch (err) {
    record("Redis", false, `Connection failed: ${(err as Error).message}`);
  } finally {
    client.disconnect();
  }
}

async function checkSmtp() {
  if (!env.SMTP_HOST) {
    record("SMTP", env.NODE_ENV !== "production", "Not configured (only acceptable outside production)");
    return;
  }
  const ok = await verifyEmailTransport();
  record("SMTP", ok, ok ? `Transport verified for ${env.SMTP_HOST}` : "Transport verification failed — check SMTP credentials");
}

async function checkSms() {
  record(
    "SMS provider",
    true,
    `Using "${smsProvider.name}" provider${smsProvider.name === "mock" && env.NODE_ENV === "production" ? " ⚠️  mock provider in production — OTPs will not actually send" : ""}`,
  );
}

async function checkHealthEndpoints() {
  for (const path of ["/live", "/ready", "/health"]) {
    try {
      const res = await fetch(`${baseUrl}${path}`, { signal: AbortSignal.timeout(5000) });
      record(`Health endpoint ${path}`, res.ok, `HTTP ${res.status}`);
    } catch (err) {
      record(`Health endpoint ${path}`, false, `Request failed: ${(err as Error).message}`);
    }
  }
}

async function checkAuthentication() {
  // Safe, non-destructive checks: confirm the auth surface responds
  // correctly WITHOUT creating real accounts or sending real
  // OTPs/emails.
  try {
    const meRes = await fetch(`${baseUrl}/api/auth/me`, { signal: AbortSignal.timeout(5000) });
    record("Auth: rejects missing token", meRes.status === 401, `GET /api/auth/me without a token -> HTTP ${meRes.status}`);
  } catch (err) {
    record("Auth: rejects missing token", false, `Request failed: ${(err as Error).message}`);
  }

  try {
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "verify-production-nonexistent@kairaafrica.invalid", password: "not-a-real-password" }),
      signal: AbortSignal.timeout(5000),
    });
    record(
      "Auth: rejects invalid admin login",
      loginRes.status === 401,
      `POST /api/auth/login with bogus credentials -> HTTP ${loginRes.status}`,
    );
  } catch (err) {
    record("Auth: rejects invalid admin login", false, `Request failed: ${(err as Error).message}`);
  }

  try {
    const otpRes = await fetch(`${baseUrl}/api/auth/request-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phoneNumber: "not-a-valid-phone" }),
      signal: AbortSignal.timeout(5000),
    });
    record(
      "Auth: validates phone number format",
      otpRes.status === 400,
      `POST /api/auth/request-otp with an invalid number -> HTTP ${otpRes.status}`,
    );
  } catch (err) {
    record("Auth: validates phone number format", false, `Request failed: ${(err as Error).message}`);
  }
}

function maskUrl(url: string): string {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.hostname}:${u.port || "default"}${u.pathname}`;
  } catch {
    return "(unparseable URL)";
  }
}

async function main() {
  console.log(`\nKaira Africa — production verification`);
  console.log(`Target: ${baseUrl}\n`);

  await checkEnvironment();
  await checkDatabase();
  await checkRedis();
  await checkSmtp();
  await checkSms();
  await checkHealthEndpoints();
  await checkAuthentication();

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);

  if (failed.length > 0) {
    console.log("\nFailed checks:");
    for (const f of failed) {
      console.log(`  - ${f.name}: ${f.detail}`);
    }
    process.exit(1);
  }

  console.log("\nAll production verification checks passed.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Verification script crashed:", err);
  process.exit(1);
});
