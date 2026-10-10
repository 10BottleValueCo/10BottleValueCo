import assert from "node:assert/strict";
import { test } from "node:test";
import handler from "./affiliate-account.js";

const AFFILIATE_EMAIL = "affiliate@example.org";

function makeResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
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
  process.env.SUPABASE_URL = "https://supabase.test";
  process.env.SUPABASE_ANON_KEY = "test-anon-key";
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

function makeRequest(query = {}, authorization = "Bearer test-user-token") {
  return {
    method: "GET",
    headers: authorization ? { authorization } : {},
    query,
    log: { error() {} },
  };
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

test("unauthenticated requests are rejected before reading affiliate data", async (t) => {
  let fetchCount = 0;
  withTestEnvironment(t, async () => {
    fetchCount += 1;
    throw new Error("Unexpected network request");
  });

  const res = mockRes();
  await handler(makeRequest({}, ""), res);

  assert.equal(res.statusCode, 401);
  assert.equal(fetchCount, 0);
  assert.equal(res.headers["Cache-Control"], "no-store");
});

test("public affiliate lookup returns only the requested code and active status", async (t) => {
  let requestedUrl;
  withTestEnvironment(t, async (input) => {
    requestedUrl = new URL(String(input));
    return makeResponse([
      {
        code: "AFF-ONE",
        active: true,
        email: "private@example.org",
      },
    ]);
  });

  const res = mockRes();
  await handler(makeRequest({ code: " aff-one " }, ""), res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, {
    ok: true,
    affiliate: { code: "AFF-ONE", active: true },
  });
  assert.equal(requestedUrl.searchParams.get("code"), "ilike.AFF-ONE");
  assert.equal(requestedUrl.searchParams.get("select"), "code,active");
  assert.equal(res.headers["Cache-Control"], "no-store");
});

test("affiliate history is scoped to the verified owner and removes private order fields", async (t) => {
  const calls = [];
  withTestEnvironment(t, async (input, options = {}) => {
    const url = new URL(String(input));
    calls.push(url);

    if (url.pathname.endsWith("/auth/v1/user")) {
      return makeResponse({
        email: AFFILIATE_EMAIL,
        email_confirmed_at: "2026-01-01T00:00:00.000Z",
      });
    }
    if (url.pathname.endsWith("/rest/v1/affiliates")) {
      assert.equal(url.searchParams.get("email"), `eq.${AFFILIATE_EMAIL}`);
      return makeResponse([
        {
          code: "AFF-ONE",
          email: AFFILIATE_EMAIL,
          active: true,
          created_at: "2026-01-01T00:00:00.000Z",
        },
      ]);
    }
    if (url.pathname.endsWith("/rest/v1/affiliate_orders")) {
      assert.equal(url.searchParams.get("affiliate_code"), "ilike.AFF-ONE");
      return makeResponse([
        {
          order_id: "ORDER-1",
          affiliate_code: "AFF-ONE",
          commission_amount: 12.5,
          shipping_type: "standard",
          created_at: "2026-01-02T00:00:00.000Z",
        },
      ]);
    }
    if (url.pathname.endsWith("/rest/v1/orders")) {
      const row = {
        id: "ORDER-1",
        status: "paid",
        created_at: "2026-01-02T00:00:00.000Z",
        total: 125,
        affiliate_code: "AFF-ONE",
        metadata: {
          affiliateCode: "AFF-ONE",
          affiliateCommission: 12.5,
          subtotal: 125,
          total: 125,
          status: "paid",
          items: [
            {
              name: "BPC-157",
              dose: "10 mg",
              quantity: 1,
              price: 125,
              customerEmail: "buyer@example.org",
              address: "Private street 1",
            },
          ],
          email: "buyer@example.org",
          phone: "+1 212 555 0100",
          address: "Private street 1",
          paymentId: "private-payment-id",
        },
      };
      if (url.searchParams.has("affiliate_code")) return makeResponse([row]);
      assert.equal(
        url.searchParams.get("metadata->>affiliateCode"),
        "ilike.AFF-ONE",
      );
      return makeResponse([]);
    }
    if (url.pathname.endsWith("/rest/v1/affiliate_payouts")) {
      assert.equal(url.searchParams.get("affiliate_code"), "ilike.AFF-ONE");
      return makeResponse([{ amount: 8.25 }]);
    }
    throw new Error(`Unexpected Supabase request: ${url} ${options.method || "GET"}`);
  });

  const res = mockRes();
  await handler(makeRequest({ orders: "1" }), res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.ok, true);
  assert.equal(res.body.affiliate.email, AFFILIATE_EMAIL);
  assert.equal(res.body.affiliate.code, "AFF-ONE");
  assert.equal(res.body.payoutsTotal, 8.25);
  assert.equal(res.body.ledgerRows[0].order_id, "ORDER-1");
  assert.equal(res.body.codeColumnOrders[0].metadata.affiliateCode, "AFF-ONE");

  const visibleOrder = JSON.stringify(res.body.codeColumnOrders[0]);
  for (const privateValue of [
    "buyer@example.org",
    "Private street 1",
    "+1 212 555 0100",
    "private-payment-id",
    "customerEmail",
  ]) {
    assert.equal(visibleOrder.includes(privateValue), false);
  }
  assert.equal(res.body.codeColumnOrders[0].metadata.items[0].name, "BPC-157");
  assert.deepEqual(
    Object.keys(res.body.codeColumnOrders[0].metadata.items[0]).sort(),
    ["dose", "name", "price", "quantity"],
  );
  assert.ok(
    calls.every((url) => url.origin === "https://supabase.test"),
    "Supabase requests must use the configured server URL",
  );
});
