import assert from "node:assert/strict";
import { test } from "node:test";
import handler from "./store-credit-checkout.js";
import {
  getUnitPrice,
  validateAndPriceItems,
} from "./_catalog.js";

const TEST_EMAIL = "customer@example.org";
const ORDER_ID = "INV-0123456789ABCDEF0123456789ABCDEF";

function makeResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function makeRequest(body, authorization = "Bearer test-user-token") {
  return {
    method: "POST",
    headers: authorization ? { authorization } : {},
    body,
  };
}

function makeCheckout(overrides = {}) {
  return {
    orderId: ORDER_ID,
    items: [
      {
        name: "BPC-157",
        dose: "10 mg",
        quantity: 1,
        price: 0,
      },
    ],
    checkoutForm: {
      firstName: "Alex",
      lastName: "Example",
      country: "United States",
      address: "10 Example Street",
      address2: "",
      city: "Riga",
      state: "",
      postalCode: "LV-1001",
      phone: "+1 212 555 1212",
      taxId: "",
    },
    shippingType: "standard",
    paymentMethod: "cashapp",
    promoCode: "",
    affiliateCode: "",
    storeCreditUsed: 178.99,
    orderNotes: "",
    purchaserAttestation: {
      over21AndResearchUseOnly: true,
      qualifiedResearcherOrLicensedProfessional: true,
      noHumanOrAnimalUse: true,
      policiesAccepted: true,
    },
    ...overrides,
  };
}

function withTestEnvironment(t, fetchMock) {
  const keys = [
    "VITE_SUPABASE_URL",
    "SUPABASE_URL",
    "SUPABASE_ANON_KEY",
    "VITE_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
  ];
  const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  for (const key of keys) delete process.env[key];
  process.env.VITE_SUPABASE_URL = "https://supabase.test";
  process.env.VITE_SUPABASE_ANON_KEY = "test-anon-key";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";

  const previousFetch = globalThis.fetch;
  globalThis.fetch = fetchMock;
  t.after(() => {
    globalThis.fetch = previousFetch;
    for (const key of keys) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  });
}

function mockRes() {
  return {
    headers: {},
    statusCode: 200,
    body: null,
    setHeader(name, value) {
      this.headers[name] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(value) {
      this.body = value;
      return this;
    },
  };
}

function authResponse() {
  return makeResponse({
    id: "verified-user-id",
    email: TEST_EMAIL,
    email_confirmed_at: "2026-01-01T00:00:00.000Z",
  });
}

function orderLookupResponse(rows = []) {
  return makeResponse(rows);
}

test("catalog re-prices client-supplied amounts and applies US pricing", () => {
  const worldwide = validateAndPriceItems([
    { name: "BPC-157", dose: "10 mg", quantity: 1, price: 0.01 },
  ]);
  assert.equal(worldwide.subtotal, 139);
  assert.equal(worldwide.pricedItems[0].price, 139);

  const usProduct = validateAndPriceItems([
    {
      name: "BPC-157",
      dose: "10 mg",
      quantity: 1,
      fromWarehouse: "us",
      price: 0.01,
    },
  ]);
  assert.equal(getUnitPrice({ price: 179, usPriceBase: 174 }, "us"), 179);
  assert.equal(usProduct.subtotal, 179);
});

test("out-of-stock and invalid-quantity items are rejected", () => {
  assert.throws(
    () =>
      validateAndPriceItems([
        {
          name: "TB-500 + BPC-157",
          dose: "20 mg",
          quantity: 1,
          fromWarehouse: "us",
        },
      ]),
    /out of stock/i,
  );
  assert.throws(
    () =>
      validateAndPriceItems([
        { name: "BPC-157", dose: "10 mg", quantity: 51 },
      ]),
    /quantity/i,
  );
});

test("unauthenticated checkout is rejected before touching Supabase data", async (t) => {
  let fetchCount = 0;
  withTestEnvironment(t, async () => {
    fetchCount += 1;
    throw new Error("Unexpected network request");
  });
  const res = mockRes();
  await handler(makeRequest(makeCheckout(), ""), res);
  assert.equal(res.statusCode, 401);
  assert.equal(fetchCount, 0);
});

test("full-credit checkout rejects unsupported pack and warehouse selectors before any credit write", async (t) => {
  withTestEnvironment(t, async (url, options = {}) => {
    assert.equal(options.method ?? "GET", "GET", "invalid offer must not reach a financial write");
    if (String(url).endsWith("/auth/v1/user")) return authResponse();
    if (String(url).includes("/rest/v1/orders?")) return orderLookupResponse();
    throw new Error(`Unexpected request: ${url}`);
  });
  for (const selector of [
    { vials: 1 }, { vials: 5 }, { vials: "10" }, { vials: null }, { vials: false },
    { fromWarehouse: false }, { fromWarehouse: 0 }, { fromWarehouse: null },
    { name: "DSIP", dose: "10 mg" },
  ]) {
    const res = mockRes();
    await handler(makeRequest(makeCheckout({ items: [{ ...makeCheckout().items[0], ...selector }] })), res);
    assert.equal(res.statusCode, 400, JSON.stringify(selector));
  }
});

test("server verifies identity, re-prices the cart, and sends only a paid order to the RPC", async (t) => {
  const calls = [];
  withTestEnvironment(t, async (url, options = {}) => {
    calls.push({ url: String(url), options });
    if (String(url).endsWith("/auth/v1/user")) return authResponse();
    if (String(url).includes("/rest/v1/orders?")) return orderLookupResponse();
    if (String(url).endsWith("/rest/v1/rpc/checkout_store_credit")) {
      const request = JSON.parse(options.body);
      const storedOrder = {
        ...request.p_order,
        storeCreditBalanceAfter: 21.01,
      };
      return makeResponse({
        ok: true,
        orderId: ORDER_ID,
        balance: 21.01,
        order: storedOrder,
        replayed: false,
      });
    }
    throw new Error(`Unexpected network request: ${url}`);
  });
  process.env.SUPABASE_URL = "https://staging.supabase.test";

  const res = mockRes();
  await handler(makeRequest(makeCheckout()), res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.ok, true);
  assert.equal(res.body.order.email, TEST_EMAIL);
  assert.equal(res.body.order.items[0].price, 139);
  assert.equal(res.body.order.storeCreditUsed, 178.99);
  assert.equal(res.body.balance, 21.01);

  const rpcCall = calls.find((call) =>
    call.url.endsWith("/rest/v1/rpc/checkout_store_credit"),
  );
  assert.ok(rpcCall);
  const rpcBody = JSON.parse(rpcCall.options.body);
  assert.equal(rpcBody.p_customer_email, TEST_EMAIL);
  assert.equal(rpcBody.p_customer_id, "verified-user-id");
  assert.equal(rpcBody.p_order.status, "paid");
  assert.equal(rpcBody.p_order.total, 0);
  assert.equal(rpcBody.p_store_credit_used, 178.99);
  assert.equal(rpcBody.p_user_promo_id, null);
  assert.ok(
    calls.every((call) =>
      call.url.startsWith("https://staging.supabase.test/"),
    ),
    "the explicit server URL must take precedence over the public VITE URL",
  );
});

test("retries with an explicit ten-vial pack retain the legacy fingerprint and do not debit twice", async (t) => {
  let completedOrder = null;
  let rpcCalls = 0;
  withTestEnvironment(t, async (url, options = {}) => {
    const requestUrl = String(url);
    if (requestUrl.endsWith("/auth/v1/user")) return authResponse();
    if (requestUrl.includes("/rest/v1/orders?")) {
      return orderLookupResponse(
        completedOrder
          ? [
              {
                id: ORDER_ID,
                email: TEST_EMAIL,
                status: "paid",
                metadata: completedOrder,
              },
            ]
          : [],
      );
    }
    if (requestUrl.endsWith("/rest/v1/rpc/checkout_store_credit")) {
      rpcCalls += 1;
      const request = JSON.parse(options.body);
      completedOrder = {
        ...request.p_order,
        storeCreditBalanceAfter: 21.01,
      };
      return makeResponse({
        ok: true,
        orderId: ORDER_ID,
        balance: 21.01,
        order: completedOrder,
        replayed: rpcCalls > 1,
      });
    }
    throw new Error(`Unexpected network request: ${url}`);
  });

  const firstResponse = mockRes();
  await handler(makeRequest(makeCheckout()), firstResponse);
  assert.equal(firstResponse.statusCode, 200);
  assert.equal(firstResponse.body.replayed, false);

  const retryResponse = mockRes();
  await handler(makeRequest(makeCheckout({ items: [{ ...makeCheckout().items[0], vials: 10, fromWarehouse: "" }] })), retryResponse);
  assert.equal(retryResponse.statusCode, 200);
  assert.equal(retryResponse.body.replayed, true);
  assert.equal(retryResponse.body.order.id, ORDER_ID);
  assert.equal(retryResponse.body.balance, 21.01);
  assert.equal(rpcCalls, 2, "every replay must be acknowledged by the private ledger RPC");

  const changedPackResponse = mockRes();
  await handler(makeRequest(makeCheckout({ items: [{ ...makeCheckout().items[0], vials: 5 }] })), changedPackResponse);
  assert.equal(changedPackResponse.statusCode, 409);
  assert.equal(rpcCalls, 2, "a different pack must never replay the existing debit");
});

test("stale client totals are rejected without a credit mutation", async (t) => {
  let rpcCalled = false;
  withTestEnvironment(t, async (url) => {
    if (String(url).endsWith("/auth/v1/user")) return authResponse();
    if (String(url).includes("/rest/v1/orders?")) return orderLookupResponse();
    if (String(url).endsWith("/rest/v1/rpc/checkout_store_credit")) {
      rpcCalled = true;
    }
    throw new Error("Unexpected network request");
  });

  const res = mockRes();
  await handler(
    makeRequest(makeCheckout({ storeCreditUsed: 1 })),
    res,
  );
  assert.equal(res.statusCode, 409);
  assert.equal(rpcCalled, false);
});

test("insufficient credit is surfaced without reporting a completed order", async (t) => {
  withTestEnvironment(t, async (url) => {
    if (String(url).endsWith("/auth/v1/user")) return authResponse();
    if (String(url).includes("/rest/v1/orders?")) return orderLookupResponse();
    if (String(url).endsWith("/rest/v1/rpc/checkout_store_credit")) {
      return makeResponse({
        ok: false,
        error: "INSUFFICIENT_CREDIT",
      });
    }
    throw new Error(`Unexpected network request: ${url}`);
  });

  const res = mockRes();
  await handler(makeRequest(makeCheckout()), res);
  assert.equal(res.statusCode, 409);
  assert.equal(res.body.ok, false);
  assert.match(res.body.error, /no longer covers/i);
});

for (const override of [{ promoCode: "DYNAMIC10" }, { affiliateCode: "AFFILIATE" }]) {
  test(`untrusted dynamic discount cannot fund full-credit checkout: ${Object.keys(override)[0]}`, async (t) => {
    const calls = [];
    withTestEnvironment(t, async (url) => {
      calls.push(String(url));
      if (String(url).endsWith("/auth/v1/user")) return authResponse();
      if (String(url).includes("/rest/v1/orders?")) return orderLookupResponse();
      if (String(url).includes("/rest/v1/user_promos?")) return makeResponse([]);
      throw new Error("Unexpected discount or mutation request");
    });
    const res = mockRes();
    await handler(makeRequest(makeCheckout(override)), res);
    assert.equal(res.statusCode, 409);
    assert.match(res.body.error, /needs verification|unavailable/);
    assert.equal(calls.length, override.promoCode ? 4 : 2);
  });
}

test("static approved promotion remains available for full-credit checkout", async (t) => {
  withTestEnvironment(t, async (url, options = {}) => {
    if (String(url).endsWith("/auth/v1/user")) return authResponse();
    if (String(url).includes("/rest/v1/orders?")) return orderLookupResponse();
    if (String(url).endsWith("/rest/v1/rpc/checkout_store_credit")) {
      const body = JSON.parse(options.body);
      assert.equal(body.p_user_promo_id, null);
      assert.equal(body.p_order.promoDiscount, 13.9);
      assert.equal(body.p_store_credit_used, 165.09);
      return makeResponse({ ok: true, orderId: ORDER_ID, order: body.p_order, balance: 20, replayed: false });
    }
    throw new Error("Unexpected network request");
  });
  const res = mockRes();
  await handler(makeRequest(makeCheckout({ promoCode: "REVIEW10", storeCreditUsed: 165.09 })), res);
  assert.equal(res.statusCode, 200);
});

test("full-credit checkout never adds a card fee even if an old client sends stripe", async (t) => {
  withTestEnvironment(t, async (url, options = {}) => {
    if (String(url).endsWith("/auth/v1/user")) return authResponse();
    if (String(url).includes("/rest/v1/orders?")) return orderLookupResponse();
    if (String(url).endsWith("/rest/v1/rpc/checkout_store_credit")) {
      const body = JSON.parse(options.body);
      assert.equal(body.p_store_credit_used, 178.99);
      assert.equal(body.p_order.total, 0);
      return makeResponse({ ok: true, orderId: ORDER_ID, order: body.p_order, balance: 20, replayed: false });
    }
    throw new Error("Unexpected network request");
  });
  const res = mockRes();
  await handler(makeRequest(makeCheckout({ paymentMethod: "stripe" })), res);
  assert.equal(res.statusCode, 200);
});

test("a public paid row cannot bypass a failed private ledger replay", async (t) => {
  let completedOrder;
  let rpcCalls = 0;
  withTestEnvironment(t, async (url, options = {}) => {
    if (String(url).endsWith("/auth/v1/user")) return authResponse();
    if (String(url).includes("/rest/v1/orders?")) return orderLookupResponse(completedOrder
      ? [{ id: ORDER_ID, email: TEST_EMAIL, status: "paid", metadata: completedOrder }] : []);
    if (String(url).endsWith("/rest/v1/rpc/checkout_store_credit")) {
      rpcCalls++;
      if (rpcCalls > 1) return makeResponse({ ok: false, error: "ORDER_ID_CONFLICT" });
      completedOrder = { ...JSON.parse(options.body).p_order, storeCreditBalanceAfter: 20 };
      return makeResponse({ ok: true, orderId: ORDER_ID, order: completedOrder, balance: 20, replayed: false });
    }
    throw new Error("Unexpected network request");
  });
  const first = mockRes(); await handler(makeRequest(makeCheckout()), first); assert.equal(first.statusCode, 200);
  const replay = mockRes(); await handler(makeRequest(makeCheckout()), replay);
  assert.equal(replay.statusCode, 409); assert.equal(replay.body.ok, false); assert.equal(rpcCalls, 2);
});

for (const receiptOverride of [{ balance: null }, { balance: -1 }, { balance: 1.001 }, { orderId: "OTHER" }, { replayed: "true" }]) {
  test(`invalid full-credit acknowledgement stays unconfirmed: ${JSON.stringify(receiptOverride)}`, async (t) => {
    withTestEnvironment(t, async (url, options = {}) => {
      if (String(url).endsWith("/auth/v1/user")) return authResponse();
      if (String(url).includes("/rest/v1/orders?")) return orderLookupResponse();
      if (String(url).endsWith("/rest/v1/rpc/checkout_store_credit")) return makeResponse({ ok: true, orderId: ORDER_ID,
        order: JSON.parse(options.body).p_order, balance: 20, replayed: false, ...receiptOverride });
      throw new Error("Unexpected network request");
    });
    const res = mockRes(); await handler(makeRequest(makeCheckout()), res);
    assert.equal(res.statusCode, 503); assert.equal(res.body.ok, false);
  });
}

test('public promo can fund full credit only at the private verified amount',async t=>{
 withTestEnvironment(t,async(url,options={})=>{
  if(String(url).endsWith('/auth/v1/user'))return authResponse();
  if(String(url).includes('/rest/v1/orders?'))return orderLookupResponse();
  if(String(url).includes('/rest/v1/user_promos?'))return makeResponse(new URL(url).searchParams.get('email')==='eq.__PUBLIC__'?[{id:'33333333-3333-4333-8333-333333333333',email:'__PUBLIC__',code:'CARD5',rate:.05,used:false,revision:2}]:[]);
  if(String(url).endsWith('/rest/v1/rpc/checkout_store_credit')){const body=JSON.parse(options.body);assert.equal(body.p_user_promo_id,null);assert.equal(body.p_order.promoDiscount,6.95);assert.equal(body.p_order.discountRule.revision,2);assert.equal(body.p_store_credit_used,172.04);return makeResponse({ok:true,orderId:ORDER_ID,order:body.p_order,balance:20,replayed:false});}
  throw new Error('Unexpected request');
 });
 const res=mockRes();await handler(makeRequest(makeCheckout({promoCode:'CARD5',storeCreditUsed:172.04})),res);assert.equal(res.statusCode,200);
});
