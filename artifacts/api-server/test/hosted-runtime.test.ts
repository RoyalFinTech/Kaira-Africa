import assert from "node:assert/strict";
import { test } from "node:test";
import { isProductionRuntime } from "../src/config/env";

test("Render hosted runtime is production-like even when NODE_ENV defaults to development", () => {
  assert.equal(isProductionRuntime({
    NODE_ENV: "development",
    RENDER_SERVICE_ID: "srv-api",
  }), true);
  assert.equal(isProductionRuntime({
    NODE_ENV: "development",
    RENDER: "true",
  }), true);
});

test("local development and CI test runtimes are not treated as production", () => {
  assert.equal(isProductionRuntime({ NODE_ENV: "development" }), false);
  assert.equal(isProductionRuntime({ NODE_ENV: "test" }), false);
});

test("explicit production NODE_ENV remains production without Render metadata", () => {
  assert.equal(isProductionRuntime({ NODE_ENV: "production" }), true);
});
