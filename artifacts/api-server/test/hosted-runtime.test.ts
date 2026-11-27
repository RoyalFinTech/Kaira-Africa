import assert from "node:assert/strict";
import { test } from "node:test";
import { isProductionRuntime } from "../src/config/env";

test("Render hosted service ID activates production safeguards when NODE_ENV defaults to development", () => {
  assert.equal(isProductionRuntime({
    NODE_ENV: "development",
    RENDER_SERVICE_ID: "srv-kaira-api",
  }), true);
});

test("Render flag activates production safeguards when NODE_ENV defaults to development", () => {
  assert.equal(isProductionRuntime({
    NODE_ENV: "development",
    RENDER: "true",
  }), true);
});

test("local development and CI test runtimes remain non-production", () => {
  assert.equal(isProductionRuntime({ NODE_ENV: "development" }), false);
  assert.equal(isProductionRuntime({ NODE_ENV: "test" }), false);
});

test("explicit production NODE_ENV remains production without Render metadata", () => {
  assert.equal(isProductionRuntime({ NODE_ENV: "production" }), true);
});
