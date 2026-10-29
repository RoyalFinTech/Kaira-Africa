import assert from "node:assert/strict";
import test from "node:test";
import {
  inventoryImageObjectPath,
  parseInventoryPhotoDataUrl,
  isInventoryImagePathForProduct,
  extractSignedInventoryImageUrl,
  normalizeSignedInventoryImageUrl,
} from "../src/lib/inventory-image";

test("uses one stable private object path per business product", () => {
  assert.equal(
    inventoryImageObjectPath("business-1", "product-9"),
    "business-1/product-9/product.jpg",
  );
});

test("only treats object paths under the exact business and product as owned", () => {
  assert.equal(isInventoryImagePathForProduct("business-1/product-9/product.jpg", "business-1", "product-9"), true);
  assert.equal(isInventoryImagePathForProduct("business-1/product-9/old.jpg", "business-1", "product-9"), true);
  assert.equal(isInventoryImagePathForProduct("business-2/product-9/product.jpg", "business-1", "product-9"), false);
  assert.equal(isInventoryImagePathForProduct("business-1/product-10/product.jpg", "business-1", "product-9"), false);
  assert.equal(isInventoryImagePathForProduct("https://example.com/photo.jpg", "business-1", "product-9"), false);
});

test("normalizes Supabase signed URLs without duplicating storage path prefixes", () => {
  assert.equal(
    normalizeSignedInventoryImageUrl("https://project.supabase.co/", "/storage/v1/object/sign/inventory-images/b/p.jpg?token=x"),
    "https://project.supabase.co/storage/v1/object/sign/inventory-images/b/p.jpg?token=x",
  );
  assert.equal(
    normalizeSignedInventoryImageUrl("https://project.supabase.co", "/object/sign/inventory-images/b/p.jpg?token=x"),
    "https://project.supabase.co/storage/v1/object/sign/inventory-images/b/p.jpg?token=x",
  );
  assert.equal(
    normalizeSignedInventoryImageUrl("https://project.supabase.co", "https://project.supabase.co/storage/v1/object/sign/inventory-images/b/p.jpg?token=x"),
    "https://project.supabase.co/storage/v1/object/sign/inventory-images/b/p.jpg?token=x",
  );
});

test("rejects successful Storage responses that omit a signed URL", () => {
  assert.throws(() => extractSignedInventoryImageUrl({}, "https://project.supabase.co"), /no signed URL/);
  assert.throws(() => extractSignedInventoryImageUrl({ signedURL: "" }, "https://project.supabase.co"), /no signed URL/);
  assert.equal(
    extractSignedInventoryImageUrl({ signedURL: "/object/sign/inventory-images/b/p.jpg?token=x" }, "https://project.supabase.co"),
    "https://project.supabase.co/storage/v1/object/sign/inventory-images/b/p.jpg?token=x",
  );
});

test("validates inventory photo MIME, canonical base64 and the exact 200 KB boundary", () => {
  const oneByteJpeg = "data:image/jpeg;base64,/w==";
  assert.deepEqual([...parseInventoryPhotoDataUrl(oneByteJpeg)], [255]);

  const exactLimit = Buffer.alloc(204800).toString("base64");
  assert.equal(parseInventoryPhotoDataUrl("data:image/jpeg;base64," + exactLimit).length, 204800);
  const tooLarge = Buffer.alloc(204801).toString("base64");
  assert.throws(() => parseInventoryPhotoDataUrl("data:image/jpeg;base64," + tooLarge), /200 KB/);
  assert.throws(() => parseInventoryPhotoDataUrl("data:image/png;base64,/w=="), /JPEG product photo/);
  assert.throws(() => parseInventoryPhotoDataUrl("data:image/jpeg;base64,A"), /valid JPEG images/);
});
