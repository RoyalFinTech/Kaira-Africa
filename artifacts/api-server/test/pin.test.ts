import assert from "node:assert/strict";
import test from "node:test";
import { isSixDigitPin, isStrongPin } from "../src/lib/pin";
import { hashPassword, verifyPassword } from "../src/lib/password";

test("PIN accepts exactly six digits and preserves leading zeroes", () => {
  assert.equal(isSixDigitPin("012984"), true);
  assert.equal(isSixDigitPin("12984"), false);
  assert.equal(isSixDigitPin("0129847"), false);
  assert.equal(isSixDigitPin("12a984"), false);
});

test("PIN setup rejects repeated and sequential patterns", () => {
  assert.equal(isStrongPin("482951"), true);
  assert.equal(isStrongPin("000000"), false);
  assert.equal(isStrongPin("111111"), false);
  assert.equal(isStrongPin("123456"), false);
  assert.equal(isStrongPin("654321"), false);
});


test("PIN credential storage uses a one-way password hash", async () => {
  const pin = "482951";
  const pinHash = await hashPassword(pin);

  assert.notEqual(pinHash, pin);
  assert.equal(await verifyPassword(pinHash, pin), true);
  assert.equal(await verifyPassword(pinHash, "482952"), false);
});
