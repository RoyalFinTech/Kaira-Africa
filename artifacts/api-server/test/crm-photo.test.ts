import assert from "node:assert/strict";
import test from "node:test";
import {
  extractSignedCustomerPhotoUrl,
  parseCustomerPhotoDataUrl,
  isCustomerPhotoPathForCustomer,
  normalizeSignedCustomerPhotoUrl,
} from "../src/lib/crm-photo";

test("customer photo cleanup is restricted to the exact business/customer prefix", () => {
  assert.equal(isCustomerPhotoPathForCustomer("business-1/customer-9/photo.jpg", "business-1", "customer-9"), true);
  assert.equal(isCustomerPhotoPathForCustomer("business-1/customer-90/photo.jpg", "business-1", "customer-9"), false);
  assert.equal(isCustomerPhotoPathForCustomer("business-2/customer-9/photo.jpg", "business-1", "customer-9"), false);
  assert.equal(isCustomerPhotoPathForCustomer("https://example.com/photo.jpg", "business-1", "customer-9"), false);
  assert.equal(isCustomerPhotoPathForCustomer("", "business-1", "customer-9"), false);
});

test("signed customer photo URLs normalize Supabase storage paths", () => {
  assert.equal(
    normalizeSignedCustomerPhotoUrl("https://project.supabase.co/", "/storage/v1/object/sign/customer-photos/b/c/photo.jpg?token=x"),
    "https://project.supabase.co/storage/v1/object/sign/customer-photos/b/c/photo.jpg?token=x",
  );
  assert.equal(
    normalizeSignedCustomerPhotoUrl("https://project.supabase.co", "/object/sign/customer-photos/b/c/photo.jpg?token=x"),
    "https://project.supabase.co/storage/v1/object/sign/customer-photos/b/c/photo.jpg?token=x",
  );
  assert.equal(
    normalizeSignedCustomerPhotoUrl("https://project.supabase.co", "https://project.supabase.co/storage/v1/object/sign/customer-photos/b/c/photo.jpg?token=x"),
    "https://project.supabase.co/storage/v1/object/sign/customer-photos/b/c/photo.jpg?token=x",
  );
});

test("missing signed URL payload is rejected", () => {
  assert.throws(() => extractSignedCustomerPhotoUrl({}, "https://project.supabase.co"), /no signed URL/);
  assert.throws(() => extractSignedCustomerPhotoUrl({ signedURL: "" }, "https://project.supabase.co"), /no signed URL/);
  assert.equal(
    extractSignedCustomerPhotoUrl({ signedUrl: "/object/sign/customer-photos/b/c/photo.jpg?token=x" }, "https://project.supabase.co"),
    "https://project.supabase.co/storage/v1/object/sign/customer-photos/b/c/photo.jpg?token=x",
  );
});

test("validates customer photo MIME, canonical base64 and the exact 2 MB boundary", () => {
  const oneByteJpeg = "data:image/jpeg;base64,/w==";
  const parsed = parseCustomerPhotoDataUrl(oneByteJpeg);
  assert.equal(parsed.mime, "image/jpeg");
  assert.equal(parsed.extension, "jpg");
  assert.deepEqual([...parsed.bytes], [255]);

  const exactLimit = Buffer.alloc(2 * 1024 * 1024).toString("base64");
  assert.equal(parseCustomerPhotoDataUrl("data:image/png;base64," + exactLimit).bytes.length, 2 * 1024 * 1024);
  const tooLarge = Buffer.alloc(2 * 1024 * 1024 + 1).toString("base64");
  assert.throws(() => parseCustomerPhotoDataUrl("data:image/png;base64," + tooLarge), /2 MB/);
  assert.throws(() => parseCustomerPhotoDataUrl("data:image/gif;base64,/w=="), /JPEG, PNG or WebP/);
  assert.throws(() => parseCustomerPhotoDataUrl("data:image/jpeg;base64,A"), /valid JPEG, PNG or WebP/);
});
