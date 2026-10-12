import assert from "node:assert/strict";
import { test } from "node:test";
import { checkoutFailureMessage } from "./checkout-diagnostics.js";

test("checkout form displays the safe failure code, step and Supabase status", () => {
  const text = checkoutFailureMessage({
    error: "Checkout order storage is unavailable.",
    code: "CHECKOUT_STORAGE_REJECTED",
    diagnostic: { stage: "ORDER_CREATE", storageStatus: 400, storageCode: "PGRST204" },
  });
  for (const part of ["CHECKOUT_STORAGE_REJECTED", "ORDER_CREATE", "400", "PGRST204"]) assert.ok(text.includes(part));
});

test("configuration diagnostics list only missing setting names", () => {
  assert.match(checkoutFailureMessage({
    code: "CHECKOUT_STORAGE_CONFIG_MISSING",
    diagnostic: { missing: ["url", "service_key", "private-secret-value", "url"] },
  }), /Missing: Supabase URL, service-role key/);
});

test("raw upstream details and invalid diagnostic fields are never rendered", () => {
  const text = checkoutFailureMessage({
    error: "Storage unavailable.", code: "CHECKOUT_STORAGE_REJECTED",
    diagnostic: {
      stage: "private-query", storageStatus: "secret", storageCode: "private-key-value",
      missing: ["private-secret-value"], message: "customer@example.test", hint: "private-token",
    },
  });
  assert.equal(text, "Storage unavailable. [Code: CHECKOUT_STORAGE_REJECTED]");
  assert.equal(checkoutFailureMessage({ error: "Old error." }), "Old error.");
  assert.equal(checkoutFailureMessage({ code: "private-token" }), "Could not save this checkout.");
});
