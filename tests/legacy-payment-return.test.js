import test from "node:test";
import assert from "node:assert/strict";
import { readPaymentReturn, legacyCheckoutHeaders, checkLegacyPaymentReturn, syncVerifiedLegacyOrder } from "../artifacts/10-bottle-value/src/legacy-payment-return.js";

const user = { id: "owner-id", email: "owner@example.invalid" };
const session = { user, access_token: "synthetic-token" };
const supabase = { auth: { getSession: async () => ({ data: { session } }) }, from: () => assert.fail("direct database access") };
const paymentReturn = { order: "INV-ABC123", provider: "stripe", piId: "pi_synthetic" };
const json = (body, status = 200) => new Response(JSON.stringify(body), { status });
const recorded = (status = "pending", patch = {}) => json({ ok: true, id: paymentReturn.order, status, ...patch });
const run = options => checkLegacyPaymentReturn({ supabase, expectedEmail: user.email, paymentReturn, ...options });
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };

test("all provider success/cancel/failure URL claims begin pending, without demo order or credit/payment authority", () => {
  for (const provider of ["stripe", "nowpayments", "catalystpay", "paylio", "merit", "anything"]) {
    for (const status of ["success", "pending", "cancelled", "cancel", "failed"]) {
      const value = readPaymentReturn(`?payment=${status}&provider=${provider}&order=inv-abc123&payment_intent=pi_test&payment_intent_client_secret=secret`);
      assert.equal(value.status, "pending"); assert.equal(value.order, "INV-ABC123");
      assert.equal(value.origin, "provider-return"); assert.equal(value.piId, "pi_test");
      assert.ok(!JSON.stringify(value).includes("secret"));
    }
  }
  assert.equal(readPaymentReturn("?payment=success").order, "");
  assert.equal(readPaymentReturn("?payment=other").status, "");
});

test("legacy create headers require the signed-in checkout owner", async () => {
  assert.deepEqual(await legacyCheckoutHeaders(supabase, " OWNER@example.invalid "), { "Content-Type": "application/json", Authorization: "Bearer synthetic-token" });
  for (const current of [null, { ...session, user: { ...user, email: "other@example.invalid" } }, { user, access_token: "" }]) {
    await assert.rejects(legacyCheckoutHeaders({ auth: { getSession: async () => ({ data: { session: current } }) } }, user.email), error => error.code === "authentication_required");
  }
});

test("only established owner-scoped paid states confirm; extra body fields cannot supply a receipt", async () => {
  for (const status of ["paid", "done", "completed"]) {
    let calls = 0;
    const result = await run({ fetcher: async (url, options) => {
      calls++; assert.equal(url, "/api/order-checkout?orderId=INV-ABC123");
      assert.equal(options.method, "GET"); assert.equal(options.headers.Authorization, "Bearer synthetic-token");
      assert.equal(options.cache, "no-store"); assert.equal(options.credentials, "same-origin");
      return recorded(status, { metadata: { email: "foreign@example.invalid", total: 500 } });
    } });
    assert.deepEqual(result, { status: "paid", order: { id: "INV-ABC123", status } }); assert.equal(calls, 1);
  }
});

test("generic fulfillment states are not payment evidence", async () => {
  for (const status of ["processing", "shipped", "delivered"]) {
    let calls = 0;
    const result = await run({ fetcher: async () => { calls++; return recorded(status); } });
    assert.deepEqual(result, { status: "unavailable", order: null });
    assert.equal(calls, 1);
    const local = [{ id: paymentReturn.order, email: user.email, status: "pending" }];
    assert.deepEqual(syncVerifiedLegacyOrder(local, { id: paymentReturn.order, status }, user.email), { orders: local, receipt: null });
  }
});

test("successful provider responses cannot convert pending or terminal unpaid canonical status to success", async () => {
  for (const status of ["pending", "refunded", "cancelled", "canceled", "failed", "expired"]) {
    let posts = 0;
    const result = await run({ fetcher: async (url, options) => {
      if (options.method === "GET") return recorded(status);
      posts++; assert.equal(options.headers.Authorization, "Bearer synthetic-token");
      return json({ confirmed: true, dbUpdated: true, dbMarkedPaid: true, isPaid: true });
    } });
    assert.equal(result.status, status === "pending" ? "pending" : "unconfirmed");
    assert.equal(result.order, null); assert.equal(posts, status === "pending" ? 1 : 0);
  }
});

test("fresh canonical state after reconciliation or a lost response is authoritative", async () => {
  for (const loseResponse of [false, true]) {
    let reads = 0;
    const result = await run({ fetcher: async (url, options) => {
      if (options.method === "GET") return recorded(++reads === 1 ? "checkout" : "paid");
      if (loseResponse) throw new Error("lost response");
      return json({ confirmed: false });
    } });
    assert.equal(result.status, "paid"); assert.equal(reads, 2);
  }
});

test("only known providers reconcile on bounded attempts with current Bearer identity", async () => {
  for (const provider of ["stripe", "nowpayments", "paylio", "catalystpay", "", "unknown"]) {
    for (const attempt of [1, 2, 3, 6, 8]) {
      const posts = [];
      const result = await run({ paymentReturn: { ...paymentReturn, provider, paymentId: "np_fixture" }, attempt,
        fetcher: async (url, options) => {
          assert.equal(options.headers.Authorization, "Bearer synthetic-token");
          if (options.method === "GET") return recorded();
          posts.push([url, JSON.parse(options.body)]); return json({});
        } });
      const expected = ["stripe", "nowpayments"].includes(provider) && [1, 3, 6].includes(attempt);
      assert.equal(posts.length, expected ? 1 : 0);
      if (provider === "nowpayments" && expected) assert.deepEqual(posts[0], ["/api/verify-nowpayments-payment", { order_id: "INV-ABC123", payment_id: "np_fixture" }]);
      assert.equal(result.status, "pending");
    }
  }
});

test("anonymous, mismatched and expired identities never confirm or call reconciliation", async () => {
  for (const current of [null, { ...session, user: { ...user, email: "other@example.invalid" } }]) {
    const result = await run({ supabase: { auth: { getSession: async () => ({ data: { session: current } }) } }, fetcher: () => assert.fail("guest request") });
    assert.equal(result.status, "signin");
  }
  for (const [http, expected] of [[401, "signin"], [403, "signin"], [404, "not-found"], [503, "unavailable"]]) {
    let calls = 0;
    assert.equal((await run({ fetcher: async () => { calls++; return json({}, http); } })).status, expected);
    assert.equal(calls, 1);
  }
});

test("same-email identity changes at any request boundary invalidate the confirmation", async () => {
  for (const switchAt of [2, 3, 4, 5, 6]) {
    let sessions = 0; let reads = 0;
    const result = await run({ supabase: { auth: { getSession: async () => ({ data: { session: ++sessions >= switchAt ? { ...session, user: { ...user, id: "other-id" } } : session } }) } },
      fetcher: async (url, options) => options.method === "GET" ? recorded(++reads === 1 ? "pending" : "paid") : json({ confirmed: true }) });
    assert.equal(result.status, "signin"); assert.equal(result.order, null);
  }
});

test("stale view, unmount, abort and timeout discard delayed responses and schedule no extra I/O", async () => {
  for (const mode of ["view", "abort"]) {
    let current = true; const gate = deferred(); const entered = deferred(); const controller = new AbortController(); let calls = 0;
    const work = run({ isCurrent: () => current, signal: controller.signal, fetcher: async () => { calls++; entered.resolve(); return gate.promise; } });
    await entered.promise;
    if (mode === "view") current = false; else controller.abort();
    gate.resolve(recorded("paid"));
    assert.equal(await work, null); assert.equal(calls, 1);
  }
  const auth = deferred(); let calls = 0;
  assert.equal((await run({ timeoutMs: 5, supabase: { auth: { getSession: () => auth.promise } }, fetcher: () => { calls++; } })).status, "unavailable");
  auth.resolve({ data: { session } }); await new Promise(r => setTimeout(r, 0)); assert.equal(calls, 0);
  let providerSignal;
  assert.equal((await run({ timeoutMs: 5, fetcher: async (url, options) => {
    if (options.method === "GET") return recorded(); providerSignal = options.signal; return new Promise(() => {});
  } })).status, "unavailable"); assert.ok(providerSignal.aborted);
});

test("malformed canonical bodies stay unavailable", async () => {
  for (const patch of [{ ok: false }, { id: "INV-FOREIGN" }, { status: "success" }, { status: null }, { status: "mystery" }]) {
    assert.deepEqual(await run({ fetcher: async () => recorded("paid", patch) }), { status: "unavailable", order: null });
  }
});

test("local paid history sync never touches another account or invents financial proof", () => {
  const foreign = { id: "INV-ABC123", email: "foreign@example.invalid", status: "pending", total: 500 };
  const own = { id: "INV-ABC123", email: user.email, status: "pending", items: [] };
  const input = [foreign, own];
  const result = syncVerifiedLegacyOrder(input, { id: "INV-ABC123", status: "paid" }, user.email);
  assert.equal(result.orders[0], foreign); assert.equal(input[1].status, "pending");
  assert.deepEqual(result.receipt, { ...own, status: "paid" });
  for (const field of ["paidAt", "paymentId", "confirmationEmailSentAt"]) assert.equal(field in result.receipt, false);
  assert.equal(syncVerifiedLegacyOrder([foreign], { id: "INV-ABC123", status: "paid" }, user.email).receipt, null);
  assert.equal(syncVerifiedLegacyOrder(input, { id: "INV-ABC123", status: "refunded" }, user.email).receipt, null);
});
