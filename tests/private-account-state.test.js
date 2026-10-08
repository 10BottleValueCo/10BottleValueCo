import assert from "node:assert/strict";
import { test } from "node:test";
import { createPrivateAccountState, LEGACY_PRIVATE_KEYS, purgeLegacyPrivateState } from "../artifacts/10-bottle-value/src/private-account-state.js";
import { serverOrder, isConfirmedPaidOrder } from "../artifacts/10-bottle-value/src/server-order.js";

test("legacy customer/operational records are purged while public preferences survive", () => {
  const values = new Map(LEGACY_PRIVATE_KEYS.map(key => [key, "private fixture"]));
  values.set("cookieAccepted", "1");
  values.set("tbv-active-affiliate", "PUBLIC-CODE");
  purgeLegacyPrivateState({ removeItem(key) { values.delete(key); } });
  assert.deepEqual([...values], [["cookieAccepted", "1"], ["tbv-active-affiliate", "PUBLIC-CODE"]]);
  assert.doesNotThrow(() => purgeLegacyPrivateState({ removeItem() { throw new Error("denied"); } }));
});

test("account change clears memory and invalidates in-flight responses", () => {
  const store = createPrivateAccountState();
  store.switchAccount("Owner@Example.test");
  store.setItem("tbv-orders", "admin order fixture");
  const adminRequest = store.capture();
  assert.equal(store.switchAccount("owner@example.test"), false);
  assert.equal(store.getItem("tbv-orders"), "admin order fixture");
  assert.equal(store.switchAccount("customer@example.test"), true);
  assert.equal(store.getItem("tbv-orders"), null);
  assert.equal(store.isCurrent(adminRequest), false);
  store.setItem("tbv_guest_email", "customer@example.test");
  const customerRequest = store.capture();
  store.clear();
  assert.equal(store.getItem("tbv_guest_email"), null);
  assert.equal(store.isCurrent(customerRequest), false);
  assert.equal(createPrivateAccountState().getItem("tbv-orders"), null);
});

test("database columns override optimistic paid metadata and missing totals stay unknown", () => {
  const order = serverOrder({
    id: "TEST-safe", status: "checkout", total: 0, paid_at: null,
    metadata: { status: "paid", total: 999, email: "fixture@example.test", items: [] },
  });
  assert.equal(order.status, "checkout");
  assert.equal(order.total, 0);
  assert.equal(isConfirmedPaidOrder(order), false);
  assert.equal(serverOrder({ id: "TEST-missing", metadata: { status: "paid", total: 99 } }).total, null);
  assert.equal(isConfirmedPaidOrder(serverOrder({ id: "TEST-missing", metadata: { status: "paid" } })), false);
  assert.equal(isConfirmedPaidOrder(serverOrder({ id: "TEST-confirmed", status: "paid", total: 100 })), true);
});
