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
  assert.equal(isCustomerPhotoPathForCustomer("business-1/customer-9/../customer-10/photo.jpg", "business-1", "customer-9"), false);
  assert.equal(isCustomerPhotoPathForCustomer("business-1/customer-9/../../other.jpg", "business-1", "customer-9"), false);
  assert.equal(isCustomerPhotoPathForCustomer("business-1/customer-9/%2e%2e.jpg", "business-1", "customer-9"), false);
  assert.equal(isCustomerPhotoPathForCustomer("business-1/customer-9/nested/photo.jpg", "business-1", "customer-9"), false);
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
  assert.throws(
    () => normalizeSignedCustomerPhotoUrl("https://project.supabase.co", "https://attacker.example/storage/v1/object/sign/customer-photos/b/c/photo.jpg?token=x"),
    /invalid signed URL/,
  );
  assert.throws(
    () => normalizeSignedCustomerPhotoUrl("https://project.supabase.co", "https://project.supabase.co/storage/v1/object/public/customer-photos/b/c/photo.jpg"),
    /invalid signed URL/,
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

test("validates customer photo MIME, image signatures, canonical base64 and exact 2 MB boundary", () => {
  const jpeg = Buffer.alloc(4, 0);
  jpeg.set([0xff, 0xd8, 0xff]);
  const parsed = parseCustomerPhotoDataUrl("data:image/jpeg;base64," + jpeg.toString("base64"));
  assert.equal(parsed.mime, "image/jpeg");
  assert.equal(parsed.extension, "jpg");
  assert.deepEqual([...parsed.bytes.subarray(0, 3)], [255, 216, 255]);

  const exactLimit = Buffer.alloc(2 * 1024 * 1024);
  exactLimit.set([137, 80, 78, 71, 13, 10, 26, 10]);
  assert.equal(parseCustomerPhotoDataUrl("data:image/png;base64," + exactLimit.toString("base64")).bytes.length, 2 * 1024 * 1024);
  const tooLarge = Buffer.alloc(2 * 1024 * 1024 + 1);
  tooLarge.set([137, 80, 78, 71, 13, 10, 26, 10]);
  assert.throws(() => parseCustomerPhotoDataUrl("data:image/png;base64," + tooLarge.toString("base64")), /2 MB/);
  assert.throws(() => parseCustomerPhotoDataUrl("data:image/gif;base64,/w=="), /JPEG, PNG or WebP/);
  assert.throws(() => parseCustomerPhotoDataUrl("data:image/jpeg;base64,A"), /valid JPEG, PNG or WebP/);
  assert.throws(() => parseCustomerPhotoDataUrl("data:image/jpeg;base64,/w=="), /valid JPEG, PNG or WebP/);
  assert.throws(() => parseCustomerPhotoDataUrl("data:image/jpeg;base64,/9j="), /valid JPEG, PNG or WebP/);
});
