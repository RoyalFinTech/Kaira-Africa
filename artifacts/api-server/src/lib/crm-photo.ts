/** Private CRM photo path and signed URL validation helpers. */

export function parseCustomerPhotoDataUrl(dataUrl: string): { mime: string; extension: string; bytes: Buffer } {
  const match = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(dataUrl);
  if (!match) throw new Error("Choose a JPEG, PNG or WebP image.");
  const bytes = Buffer.from(match[2], "base64");
  const canonicalBase64 = bytes.toString("base64").replace(/=+$/, "");
  if (!bytes.length || bytes.length > 2 * 1024 * 1024 || canonicalBase64 !== match[2].replace(/=+$/, "")) {
    throw new Error("Customer photos must be valid JPEG, PNG or WebP images no larger than 2 MB.");
  }
  return { mime: `image/${match[1]}`, extension: match[1] === "jpeg" ? "jpg" : match[1], bytes };
}
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
