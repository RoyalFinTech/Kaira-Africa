/**
 * Supabase's modern sb_secret_* keys are API keys, not JWTs. They must be
 * sent via the apikey header only; a Bearer Authorization header makes
 * Supabase try to validate the key as a JWT and reject it.
 *
 * Legacy service_role keys are JWTs and keep the Authorization header for
 * compatibility with existing deployments.
 */
export function supabaseStorageHeaders(
  key: string,
  additionalHeaders: Record<string, string> = {},
): Record<string, string> {
  return {
    apikey: key,
    ...(key.startsWith("sb_secret_") ? {} : { Authorization: `Bearer ${key}` }),
    ...additionalHeaders,
  };
}
