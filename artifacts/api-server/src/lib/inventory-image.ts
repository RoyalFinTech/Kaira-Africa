/** Stable private Storage object paths and signed URL normalization for inventory photos. */

export function parseInventoryPhotoDataUrl(dataUrl: string): Buffer {
  const match = /^data:image\/jpeg;base64,([A-Za-z0-9+/]+={0,2})$/.exec(dataUrl);
  if (!match) throw new Error("Upload a JPEG product photo. Images are resized before upload.");
  const bytes = Buffer.from(match[1], "base64");
  const isCanonicalBase64 = bytes.toString("base64") === match[1];
  const hasJpegSignature = bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (!bytes.length || bytes.length > 204800 || !isCanonicalBase64 || !hasJpegSignature) {
    throw new Error("Product photos must be valid JPEG images 200 KB or smaller.");
  }
  return bytes;
}
export function inventoryImageObjectPath(businessId: string, productId: string): string {
  return `${businessId}/${productId}/product.jpg`;
}

/** Only delete stored object paths that belong to the exact business/product pair. */
export function isInventoryImagePathForProduct(path: string, businessId: string, productId: string): boolean {
  if (!path || /^https?:\/\//i.test(path) || path.includes(String.fromCharCode(92)) || /[%?#\u0000-\u001f]/.test(path)) return false;
  const segments = path.split("/");
  if (segments.length !== 3 || segments[0] !== businessId || segments[1] !== productId) return false;
  const filename = segments[2];
  return filename !== "." && filename !== ".." && /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(filename);
}

export function extractSignedInventoryImageUrl(payload: unknown, baseUrl: string): string {
  if (!payload || typeof payload !== "object") {
    throw new Error("Supabase Storage returned no signed URL.");
  }
  const record = payload as Record<string, unknown>;
  const candidate = record.signedURL ?? record.signedUrl;
  if (typeof candidate !== "string" || !candidate.trim()) {
    throw new Error("Supabase Storage returned no signed URL.");
  }
  return normalizeSignedInventoryImageUrl(baseUrl, candidate.trim());
}

export function normalizeSignedInventoryImageUrl(baseUrl: string, signedUrl: string): string {
  if (/^https?:\/\//i.test(signedUrl)) return signedUrl;
  const base = baseUrl.replace(/\/$/, "");
  if (signedUrl.startsWith("/storage/v1/")) return base + signedUrl;
  return `${base}/storage/v1${signedUrl.startsWith("/") ? "" : "/"}${signedUrl}`;
}
