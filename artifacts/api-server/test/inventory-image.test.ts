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

test("validates inventory photo MIME, image signatures, canonical base64 and exact 200 KB boundary", () => {
  const jpeg = Buffer.alloc(4, 0);
  jpeg.set([0xff, 0xd8, 0xff]);
  assert.deepEqual([...parseInventoryPhotoDataUrl("data:image/jpeg;base64," + jpeg.toString("base64")).subarray(0, 3)], [255, 216, 255]);

  const exactLimit = Buffer.alloc(204800);
  exactLimit.set([0xff, 0xd8, 0xff]);
  assert.equal(parseInventoryPhotoDataUrl("data:image/jpeg;base64," + exactLimit.toString("base64")).length, 204800);
  const tooLarge = Buffer.alloc(204801);
  tooLarge.set([0xff, 0xd8, 0xff]);
  assert.throws(() => parseInventoryPhotoDataUrl("data:image/jpeg;base64," + tooLarge.toString("base64")), /200 KB/);
  assert.throws(() => parseInventoryPhotoDataUrl("data:image/png;base64,/w=="), /JPEG product photo/);
  assert.throws(() => parseInventoryPhotoDataUrl("data:image/jpeg;base64,A"), /valid JPEG images/);
  assert.throws(() => parseInventoryPhotoDataUrl("data:image/jpeg;base64,/w=="), /valid JPEG images/);
});
