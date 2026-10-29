/** Private CRM photo path and signed URL validation helpers. */
export function isCustomerPhotoPathForCustomer(path: string, businessId: string, customerId: string): boolean {
  if (!path || /^https?:\/\//i.test(path)) return false;
  return path.startsWith(`${businessId}/${customerId}/`) &&
    path.length > businessId.length + customerId.length + 2;
}

export function normalizeSignedCustomerPhotoUrl(baseUrl: string, signedUrl: string): string {
  if (/^https?:\/\//i.test(signedUrl)) return signedUrl;
  const base = baseUrl.replace(/\/$/, "");
  if (signedUrl.startsWith("/storage/v1/")) return base + signedUrl;
  return `${base}/storage/v1${signedUrl.startsWith("/") ? "" : "/"}${signedUrl}`;
}

export function extractSignedCustomerPhotoUrl(payload: unknown, baseUrl: string): string {
  if (!payload || typeof payload !== "object") throw new Error("Supabase Storage returned no signed URL.");
  const record = payload as Record<string, unknown>;
  const candidate = record.signedURL ?? record.signedUrl;
  if (typeof candidate !== "string" || !candidate.trim()) throw new Error("Supabase Storage returned no signed URL.");
  return normalizeSignedCustomerPhotoUrl(baseUrl, candidate.trim());
}
