import assert from "node:assert/strict";
import test from "node:test";
import {
  inventoryImageObjectPath,
  isInventoryImagePathForProduct,
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
