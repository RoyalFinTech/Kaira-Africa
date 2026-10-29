/** Private CRM photo path and signed URL validation helpers. */

export function parseCustomerPhotoDataUrl(dataUrl: string): { mime: string; extension: string; bytes: Buffer } {
  const match = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(dataUrl);
  if (!match) throw new Error("Choose a JPEG, PNG or WebP image.");
  const bytes = Buffer.from(match[2], "base64");
  const mime = `image/${match[1]}`;
  const isCanonicalBase64 = bytes.toString("base64") === match[2];
  const hasValidSignature = match[1] === "jpeg"
    ? bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
    : match[1] === "png"
      ? bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      : bytes.length >= 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP";
  if (!bytes.length || bytes.length > 2 * 1024 * 1024 || !isCanonicalBase64 || !hasValidSignature) {
    throw new Error("Customer photos must be valid JPEG, PNG or WebP images no larger than 2 MB.");
  }
  return { mime, extension: match[1] === "jpeg" ? "jpg" : match[1], bytes };
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
