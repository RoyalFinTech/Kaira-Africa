/** Stable private Storage object paths and signed URL normalization for inventory photos. */

export function parseInventoryPhotoDataUrl(dataUrl: string): Buffer {
  const match = /^data:image\/jpeg;base64,([A-Za-z0-9+/]+={0,2})$/.exec(dataUrl);
  if (!match) throw new Error("Upload a JPEG product photo. Images are resized before upload.");
  const bytes = Buffer.from(match[1], "base64");
  const canonicalBase64 = bytes.toString("base64").replace(/=+$/, "");
  if (!bytes.length || bytes.length > 204800 || canonicalBase64 !== match[1].replace(/=+$/, "")) {
    throw new Error("Product photos must be valid JPEG images 200 KB or smaller.");
  }
  return bytes;
}
export function inventoryImageObjectPath(businessId: string, productId: string): string {
  return `${businessId}/${productId}/product.jpg`;
}

/** Only delete stored object paths that belong to the exact business/product pair. */
export function isInventoryImagePathForProduct(path: string, businessId: string, productId: string): boolean {
  if (!path || /^https?:\/\//i.test(path)) return false;
  return path.startsWith(`${businessId}/${productId}/`) && path.length > businessId.length + productId.length + 2;
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
