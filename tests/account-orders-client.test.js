import assert from "node:assert/strict";
import { test } from "node:test";
import {
  loadAccountOrders,
  canViewAccountOrderConfirmation,
  isAccountHistoryConfirmation,
  clearAccountHistoryConfirmation,
} from "../artifacts/10-bottle-value/src/account-orders.js";

const expectedEmail = "current@example.invalid";
const supabase = {
  auth: {
    getSession: async () => ({
      data: {
        session: {
          access_token: "synthetic-token",
          user: { email: expectedEmail },
        },
      },
    }),
  },
};
const order = (values = {}) => ({
  id: "fixture-order",
  email: "old@example.invalid",
  status: "paid",
  total: 10,
  items: [{ name: "Fixture", quantity: 1, price: 10 }],
  ...values,
});
const response = (orders) => ({
  ok: true,
  json: async () => ({
    ok: true,
    complete: true,
    total: orders.length,
    orders,
  }),
});
const load = (options = {}) =>
  loadAccountOrders({ supabase, expectedEmail, ...options });

test("customer history sends only Bearer and keeps server-owned rows after an email change", async () => {
  const orders = [order()];
  const result = await load({
    fetcher: async (url, options) => {
      assert.equal(url, "/api/account-orders");
      assert.deepEqual(options, {
        method: "GET",
        headers: { Authorization: "Bearer synthetic-token" },
        cache: "no-store",
      });
      return response(orders);
    },
  });
  assert.deepEqual(result, orders);
});

test("only a complete explicit zero-count response establishes empty history", async () => {
  assert.deepEqual(await load({ fetcher: async () => response([]) }), []);
  for (const body of [
    { ok: true, orders: [], total: 0 },
    { ok: true, complete: false, orders: [], total: 0 },
    { ok: true, complete: true, orders: [], total: 1 },
    { ok: true, complete: true, orders: [], total: "0" },
    { ok: false, complete: true, orders: [], total: 0 },
  ])
    await assert.rejects(
      load({ fetcher: async () => ({ ok: true, json: async () => body }) }),
    );
  await assert.rejects(
    load({ fetcher: async () => ({ ok: false, status: 503 }) }),
  );
});

test("malformed, duplicated, unpaid or incomplete monetary records never appear as complete history", async () => {
  for (const orders of [
    [order(), order()],
    [order({ status: "checkout" })],
    [order({ total: undefined })],
    [order({ total: "10" })],
    [order({ total: -1 })],
    [order({ items: null })],
    [order({ items: [{ quantity: 0, price: 10 }] })],
    [order({ items: [{ quantity: 1, price: false }] })],
  ])
    await assert.rejects(load({ fetcher: async () => response(orders) }));
  const unknown = order({ total: null, items: [{ quantity: 1, price: null }] });
  assert.deepEqual(await load({ fetcher: async () => response([unknown]) }), [
    unknown,
  ]);
});

test("missing or switched sessions cannot start a customer history request", async () => {
  for (const session of [
    null,
    { access_token: "other-token", user: { email: "other@example.invalid" } },
  ]) {
    await assert.rejects(
      load({
        supabase: { auth: { getSession: async () => ({ data: { session } }) } },
        fetcher: async () => assert.fail("unowned fetch"),
      }),
    );
  }
});

test("account or request changes before fetch, during fetch or parsing discard old history", async () => {
  assert.equal(
    await load({
      isCurrent: () => false,
      fetcher: async () => assert.fail("stale fetch"),
    }),
    null,
  );
  let current = true;
  assert.equal(
    await load({
      isCurrent: () => current,
      fetcher: async () => {
        current = false;
        return { ok: true, json: async () => assert.fail("stale parse") };
      },
    }),
    null,
  );
  current = true;
  assert.equal(
    await load({
      isCurrent: () => current,
      fetcher: async () => ({
        ok: true,
        json: async () => {
          current = false;
          return { ok: true, complete: true, orders: [order()], total: 1 };
        },
      }),
    }),
    null,
  );
});

test("confirmation accepts known zero prices and denies missing prices or unpaid state", () => {
  assert.equal(canViewAccountOrderConfirmation(order()), true);
  assert.equal(
    canViewAccountOrderConfirmation(
      order({ total: 0, items: [{ price: 0, quantity: 1 }] }),
    ),
    true,
  );
  assert.equal(canViewAccountOrderConfirmation(order({ total: null })), false);
  assert.equal(
    canViewAccountOrderConfirmation(
      order({ items: [{ price: null, quantity: 1 }] }),
    ),
    false,
  );
  assert.equal(
    canViewAccountOrderConfirmation(order({ status: "pending" })),
    false,
  );
  assert.equal(canViewAccountOrderConfirmation(order({ items: [] })), false);
});

test("history presentation requires its explicit origin and never overrides a provider return", () => {
  assert.equal(
    isAccountHistoryConfirmation({
      status: "success",
      origin: "account-history",
    }),
    true,
  );
  assert.equal(
    isAccountHistoryConfirmation({ status: "success", provider: "stripe" }),
    false,
  );
  assert.equal(
    isAccountHistoryConfirmation({
      status: "success",
      origin: "account-history",
      provider: "paypal",
    }),
    false,
  );
  assert.equal(
    isAccountHistoryConfirmation({
      status: "pending",
      origin: "account-history",
    }),
    false,
  );
  assert.equal(isAccountHistoryConfirmation({ status: "success" }), false);
});

test("account changes clear a history confirmation without losing a real pending provider return", () => {
  const cleared = clearAccountHistoryConfirmation({
    status: "success",
    origin: "account-history",
    order: "private-history-order",
  });
  assert.equal(cleared.order, "");
  assert.equal(cleared.status, "");
  assert.equal(isAccountHistoryConfirmation(cleared), false);
  const provider = {
    status: "pending",
    provider: "stripe",
    order: "provider-order",
    piId: "synthetic-pi",
  };
  assert.equal(clearAccountHistoryConfirmation(provider), provider);
});
