/** Stable private Storage object paths and signed URL normalization for inventory photos. */
export function inventoryImageObjectPath(businessId: string, productId: string): string {
  return `${businessId}/${productId}/product.jpg`;
}

/** Only delete stored object paths that belong to the exact business/product pair. */
export function isInventoryImagePathForProduct(path: string, businessId: string, productId: string): boolean {
  if (!path || /^https?:\/\//i.test(path)) return false;
  return path.startsWith(`${businessId}/${productId}/`) && path.length > businessId.length + productId.length + 2;
}

export function normalizeSignedInventoryImageUrl(baseUrl: string, signedUrl: string): string {
  if (/^https?:\/\//i.test(signedUrl)) return signedUrl;
  const base = baseUrl.replace(/\/$/, "");
  if (signedUrl.startsWith("/storage/v1/")) return base + signedUrl;
  return `${base}/storage/v1${signedUrl.startsWith("/") ? "" : "/"}${signedUrl}`;
}
