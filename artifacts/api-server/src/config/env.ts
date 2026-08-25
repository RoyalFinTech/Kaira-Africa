import { z } from "zod";

const isProduction = process.env.NODE_ENV === "production";

/**
 * Base schema — what every environment (dev, test, prod) needs at
 * minimum for the process to boot at all.
 */
const baseSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),

  // Postgres. DIRECT_URL is optional — when the primary DATABASE_URL
  // points at a pooled connection (e.g. Supabase's PgBouncer pooler
  // on port 6543), migrations need a direct, non-pooled connection.
  // If DIRECT_URL isn't set, DATABASE_URL is used for both.
  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url().optional(),

  API_BASE_URL: z.string().url().default("http://localhost:3000"),
  WEB_BASE_URL: z.string().url().default("http://localhost:5173"),
  FRONTEND_URL: z.string().url().optional(),
  BACKEND_URL: z.string().url().optional(),

  // Secrets. These pepper the hashes we already compute for session
  // tokens, OTP codes, and password-reset tokens — see
  // lib/tokens.ts / lib/otp.ts / repositories/admin-password-resets.ts.
  // This codebase does NOT issue JWTs (sessions are opaque, DB-backed
  // tokens so they can be individually revoked — see requireUser/
  // requireAdmin) — JWT_SECRET is accepted and validated because it's
  // part of the standard deployment contract, and reserved for a
  // possible future service (e.g. minting short-lived JWTs for a
  // partner integration) — nothing in this codebase signs or verifies
  // a JWT with it today.
  JWT_SECRET: z.string().min(32).optional(),
  SESSION_SECRET: z.string().min(32).optional(),
  OTP_SECRET: z.string().min(16).optional(),
  PASSWORD_RESET_SECRET: z.string().min(16).optional(),

  ADMIN_SEED_EMAIL: z.string().email().optional(),
  ADMIN_SEED_PASSWORD: z.string().min(10).optional(),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(120),

  REDIS_URL: z.string().url().optional(),

  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM: z.string().optional(),

  SMS_PROVIDER: z.enum(["mock", "africastalking", "twilio"]).default("mock"),
  SMS_API_KEY: z.string().optional(),
  SMS_SENDER_ID: z.string().optional(),

  // Supabase is used as the PostgreSQL infrastructure via DATABASE_URL
  // (see Phase 2 architecture decision) — these are only needed if a
  // future feature calls the Supabase client SDK directly (e.g.
  // Storage). Never required for the API server to boot.
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),

  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),
});

/**
 * Production adds hard requirements that are fine to leave unset in
 * local development (where OTPs print to the console and there's no
 * real SMTP/SMS/Redis). This is why there are three separate
 * .env.*.example files rather than one — dev should be fast to boot.
 */
const productionRequirements = z.object({
  JWT_SECRET: z.string().min(32),
  SESSION_SECRET: z.string().min(32),
  OTP_SECRET: z.string().min(16),
  PASSWORD_RESET_SECRET: z.string().min(16),
  REDIS_URL: z.string().url(),
  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.number().int().positive(),
  SMTP_USER: z.string().min(1),
  SMTP_PASSWORD: z.string().min(1),
  SMTP_FROM: z.string().min(1),
  ADMIN_SEED_EMAIL: z.string().email(),
  ADMIN_SEED_PASSWORD: z.string().min(10),
});

function loadEnv() {
  const parsed = baseSchema.safeParse(process.env);
  if (!parsed.success) {
    // eslint-disable-next-line no-console
    console.error("❌ Invalid environment configuration:");
    for (const issue of parsed.error.issues) {
      // eslint-disable-next-line no-console
      console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
    }
    process.exit(1);
  }

  if (isProduction) {
    const prodCheck = productionRequirements.safeParse(parsed.data);
    if (!prodCheck.success) {
      // eslint-disable-next-line no-console
      console.error(
        "❌ Missing required production environment variables:",
      );
      for (const issue of prodCheck.error.issues) {
        // eslint-disable-next-line no-console
        console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
      }
      process.exit(1);
    }
  }

  return parsed.data;
}

export const env = loadEnv();
export type Env = typeof env;

/** DIRECT_URL when present (unpooled — required for migrations against a pooled DATABASE_URL), else DATABASE_URL. */
export const migrationDatabaseUrl = env.DIRECT_URL ?? env.DATABASE_URL;

export const isDev = env.NODE_ENV === "development";
export const isTest = env.NODE_ENV === "test";
export const isProd = env.NODE_ENV === "production";
