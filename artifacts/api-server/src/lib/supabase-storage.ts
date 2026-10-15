import { env } from "../config/env";
import { HttpError } from "./http-errors";

export type SupabaseStorageConfig = {
  base: string;
  key: string;
};

/** Storage is enabled when the project URL and either modern or legacy server key are configured. */
export function hasSupabaseStorageConfig(): boolean {
  return Boolean(env.SUPABASE_URL && (env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY));
}

/**
 * Prefer Supabase's modern server-only secret key. Keep the legacy
 * service_role variable supported so existing Render deployments continue
 * working while teams migrate their secrets.
 */
export function requireSupabaseStorageConfig(featureName = "Private Supabase Storage"): SupabaseStorageConfig {
  const key = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
  const missing: string[] = [];
  if (!env.SUPABASE_URL) missing.push("SUPABASE_URL");
  if (!key) missing.push("SUPABASE_SECRET_KEY (recommended) or SUPABASE_SERVICE_ROLE_KEY (legacy)");

  if (missing.length) {
    throw new HttpError(
      503,
      "supabase_storage_not_configured",
      `${featureName} is unavailable because the Kaira Africa API is missing ${missing.join(" and ")}. Configure SUPABASE_URL and either SUPABASE_SECRET_KEY (recommended) or SUPABASE_SERVICE_ROLE_KEY on the Kaira Africa API service in Render. Keep the storage key server-side only.`,
    );
  }

  return { base: env.SUPABASE_URL!.replace(/\/$/, ""), key: key! };
}
