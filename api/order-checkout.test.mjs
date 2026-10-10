import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";
import handler from "./order-checkout.js";

const ORDER_ID = "INV-ABC12345";
const EMAIL = "guest@example.org";
const USER_ID = "11111111-1111-4111-8111-111111111111";

function makeResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function makeRes() {
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

function makeRequest({ method = "POST", body, url = "/api/order-checkout", cookie } = {}) {
  return {
    method,
    url,
    headers: {
      authorization: "Bearer fixture-session",
      ...(body ? { "content-type": "application/json" } : {}),
      ...(cookie ? { cookie } : {}),
    },
    body,
  };
}

function withTestEnvironment(t, fetchMock) {
  const keys = [
    "SUPABASE_URL",
    "VITE_SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
  ];
  const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  for (const key of keys) delete process.env[key];
  process.env.SUPABASE_URL = "https://supabase.test";
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

function createSupabaseMock() {
  const rows = [];
  const bindings = [];
  const calls = [];
  const fetchMock = async (input, options = {}) => {
    const url = new URL(input);
    const method = options.method || "GET";
    if (url.pathname === "/auth/v1/user") return makeResponse({ id: USER_ID, email: EMAIL, email_confirmed_at: "2026-10-08T00:00:00Z" });
    calls.push({ method, url, body: options.body });
    const id = url.searchParams.get("id")?.replace(/^eq\./, "");

    if (url.pathname.endsWith("/paylio_payment_attempts") && method === "GET") {
      return makeResponse(bindings.filter(row => row.order_id === url.searchParams.get("order_id")?.replace(/^eq\./, "")));
    }

    if (url.pathname.endsWith("/orders") && method === "GET") {
      return makeResponse(rows.filter((row) => row.id === id));
    }
    if (url.pathname.endsWith("/orders") && method === "POST") {
      const row = JSON.parse(options.body);
      if (rows.some((saved) => saved.id === row.id)) {
        return makeResponse({ code: "23505" }, 409);
      }
      rows.push(row);
      return makeResponse([row], 201);
    }
    if (url.pathname.endsWith("/orders") && method === "PATCH") {
      const row = rows.find(
        (saved) =>
          saved.id === id &&
          saved.email === url.searchParams.get("email")?.replace(/^eq\./, "") &&
          saved.checkout_access_hash ===
            url.searchParams
              .get("checkout_access_hash")
              ?.replace(/^eq\./, "") &&
          ["pending", "checkout", "wire_pending"].includes(saved.status),
      );
      if (!row) return makeResponse([]);
      Object.assign(row, JSON.parse(options.body));
      return makeResponse([row]);
    }
    throw new Error(`Unexpected mock request: ${method} ${url.pathname}`);
  };
  return { fetchMock, rows, calls, bindings };
}

function checkoutOrder(overrides = {}) {
  return {
    id: ORDER_ID,
    email: EMAIL,
    status: "pending",
    total: 129.5,
    metadata: {
      items: [{ name: "Example product", quantity: 1 }],
      paymentId: "untrusted-client-value",
    },
    ...overrides,
  };
}

test("authenticated order writes use a scoped HttpOnly capability and expose only the owner receipt and status", async (t) => {
  const supabase = createSupabaseMock();
  withTestEnvironment(t, supabase.fetchMock);

  const createResponse = makeRes();
  await handler(
    makeRequest({ body: { order: checkoutOrder() } }),
    createResponse,
  );

  assert.equal(createResponse.statusCode, 200);
  assert.equal(createResponse.body.ok, true);
  const cookie = createResponse.headers["Set-Cookie"];
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /Secure/);
  assert.match(cookie, /SameSite=Lax/);
  assert.match(cookie, /Path=\/api\/order-checkout/);

  const cookieValue = decodeURIComponent(cookie.match(/^[^=]+=([^;]+)/)[1]);
  const token = cookieValue.slice(cookieValue.indexOf(".") + 1);
  assert.equal(supabase.rows[0].checkout_access_hash, createHash("sha256").update(token).digest("hex"));
  assert.equal("paymentId" in supabase.rows[0].metadata, false);

  const updateResponse = makeRes();
  await handler(
    makeRequest({
      cookie: cookie.split(";")[0],
      body: {
        order: checkoutOrder({
          status: "checkout",
          metadata: { status: "checkout", paymentProvider: "Card" },
        }),
      },
    }),
    updateResponse,
  );
  assert.equal(updateResponse.statusCode, 200);
  assert.equal(supabase.rows[0].status, "checkout");

  const statusResponse = makeRes();
  await handler(
    makeRequest({
      method: "GET",
      url: `/api/order-checkout?orderId=${ORDER_ID}`,
      cookie: cookie.split(";")[0],
    }),
    statusResponse,
  );
  assert.equal(statusResponse.statusCode, 200);
  assert.deepEqual(statusResponse.body, {
    ok: true,
    id: ORDER_ID,
    status: "checkout",
    receipt: { total: 129.5, items: [{ name: "Example product", quantity: 1 }] },
  });
});

test("authenticated checkout cannot write paid status or update without its capability", async (t) => {
  const supabase = createSupabaseMock();
  withTestEnvironment(t, supabase.fetchMock);

  const paidResponse = makeRes();
  await handler(
    makeRequest({
      body: { order: checkoutOrder({ status: "paid" }) },
    }),
    paidResponse,
  );
  assert.equal(paidResponse.statusCode, 400);
  assert.equal(supabase.rows.length, 0);

  const createResponse = makeRes();
  await handler(
    makeRequest({ body: { order: checkoutOrder() } }),
    createResponse,
  );
  const unauthorizedResponse = makeRes();
  await handler(
    makeRequest({
      body: { order: checkoutOrder({ status: "checkout" }) },
    }),
    unauthorizedResponse,
  );
  assert.equal(unauthorizedResponse.statusCode, 403);
  assert.equal(supabase.calls.filter((call) => call.method === "PATCH").length, 0);
});

test("authenticated checkout cannot change a paid order", async (t) => {
  const supabase = createSupabaseMock();
  withTestEnvironment(t, supabase.fetchMock);

  const createResponse = makeRes();
  await handler(
    makeRequest({ body: { order: checkoutOrder() } }),
    createResponse,
  );
  supabase.rows[0].status = "paid";

  const updateResponse = makeRes();
  await handler(
    makeRequest({
      cookie: createResponse.headers["Set-Cookie"].split(";")[0],
      body: { order: checkoutOrder({ status: "checkout" }) },
    }),
    updateResponse,
  );
  assert.equal(updateResponse.statusCode, 409);
  assert.equal(supabase.rows[0].status, "paid");
  assert.equal(supabase.calls.filter((call) => call.method === "PATCH").length, 0);
});


test("anonymous and unconfirmed checkout cannot read or create an order", async t => {
  const supabase = createSupabaseMock();
  withTestEnvironment(t, supabase.fetchMock);
  for (const method of ["GET", "POST"]) {
    const req = makeRequest({ method, body: { order: checkoutOrder() }, url: `/api/order-checkout?orderId=${ORDER_ID}` });
    delete req.headers.authorization;
    const res = makeRes(); await handler(req, res);
    assert.equal(res.statusCode, 401); assert.equal(supabase.calls.length, 0);
  }
  globalThis.fetch = async () => makeResponse({ id: USER_ID, email: EMAIL, email_confirmed_at: null });
  const res = makeRes(); await handler(makeRequest({ body: { order: checkoutOrder() } }), res);
  assert.equal(res.statusCode, 403); assert.equal(supabase.rows.length, 0);
});

test("confirmed identity binds new rows and email spoofing creates no row", async t => {
  const supabase = createSupabaseMock(); withTestEnvironment(t, supabase.fetchMock);
  const spoofed = makeRes(); await handler(makeRequest({ body: { order: checkoutOrder({ email: "other@example.test" }) } }), spoofed);
  assert.equal(spoofed.statusCode, 403); assert.equal(supabase.rows.length, 0);
  const created = makeRes(); await handler(makeRequest({ body: { order: checkoutOrder({ user_id: "22222222-2222-4222-8222-222222222222" }) } }), created);
  assert.equal(created.statusCode, 200); assert.equal(supabase.rows[0].user_id, USER_ID);
});

test("GET needs actual owner; same-email foreign UUID and missing order are indistinguishable", async t => {
  const supabase = createSupabaseMock(); withTestEnvironment(t, supabase.fetchMock);
  supabase.rows.push({ ...checkoutOrder(), user_id: "22222222-2222-4222-8222-222222222222" });
  const responseBodies = [];
  for (const id of [ORDER_ID, "INV-MISSING1"]) {
    const res = makeRes(); await handler(makeRequest({ method: "GET", url: `/api/order-checkout?orderId=${id}` }), res);
    assert.equal(res.statusCode, 404); responseBodies.push(res.body);
  }
  assert.deepEqual(responseBodies[0], responseBodies[1]);
  supabase.rows[0].user_id = null;
  const legacy = makeRes(); await handler(makeRequest({ method: "GET", url: `/api/order-checkout?orderId=${ORDER_ID}` }), legacy);
  assert.equal(legacy.statusCode, 200); assert.deepEqual(Object.keys(legacy.body).sort(), ["id", "ok", "receipt", "status"]);
});

test("an edit capability cannot override a different recorded UUID owner", async t => {
  const supabase = createSupabaseMock(); withTestEnvironment(t, supabase.fetchMock);
  const created = makeRes(); await handler(makeRequest({ body: { order: checkoutOrder() } }), created);
  supabase.rows[0].user_id = "22222222-2222-4222-8222-222222222222";
  const res = makeRes(); await handler(makeRequest({ cookie: created.headers["Set-Cookie"].split(";")[0], body: { order: checkoutOrder({ status: "checkout" }) } }), res);
  assert.equal(res.statusCode, 403); assert.equal(supabase.calls.filter(x => x.method === "PATCH").length, 0);
});

test("owned frozen Paylio checkout resumes without changing its order or amount", async t => {
  const sb = createSupabaseMock(); withTestEnvironment(t, sb.fetchMock);
  const metadata = {
    items: [{name: "Example product", dose: "5 mg", quantity: 1, price: 129.5}],
    subtotal: 129.5, shipping: 0, automaticDiscount: 0, promoDiscount: 0,
    affiliateDiscount: 0, storeCreditUsed: 0, shippingType: "standard",
    firstName: "Test", address: "Fixture address", country: "US",
  };
  const created = makeRes();
  await handler(makeRequest({body: {order: checkoutOrder({metadata})}}), created);
  const cookie = created.headers['Set-Cookie'].split(';')[0];
  sb.rows[0].status = 'checkout (clicked pay)';
  sb.bindings.push({order_id: ORDER_ID, customer_id: USER_ID, email: EMAIL,
    state: 'ready', amount_cents: 12950, quote: structuredClone(metadata)});
  const before = structuredClone(sb.rows[0]);
  const resumed = makeRes();
  await handler(makeRequest({cookie, body: {order: checkoutOrder({status:'checkout', metadata})}}), resumed);
  assert.equal(resumed.statusCode, 200);
  assert.deepEqual(resumed.body, {ok:true, id:ORDER_ID, status:'checkout (clicked pay)', locked:true, saved:false});
  assert.deepEqual(sb.rows[0], before);
  assert.equal(sb.calls.filter(c=>c.method==='PATCH').length, 0);
  for (const change of [{total: 1}, {metadata:{...metadata, address:'Changed destination'}},
    {metadata:{...metadata, items:[{...metadata.items[0],quantity:2}]}}]) {
    const changed = makeRes();
    await handler(makeRequest({cookie, body:{order:checkoutOrder({metadata,...change})}}), changed);
    assert.equal(changed.statusCode, 409);
    assert.deepEqual(sb.rows[0], before);
  }
  const missingCapability = makeRes();
  await handler(makeRequest({body:{order:checkoutOrder({metadata})}}), missingCapability);
  assert.equal(missingCapability.statusCode, 403);
  sb.rows[0].status = 'refunded';
  const refunded = makeRes();
  await handler(makeRequest({cookie, body:{order:checkoutOrder({metadata})}}), refunded);
  assert.equal(refunded.statusCode, 409);
  assert.equal(sb.rows[0].status, 'refunded');
});

test("Lightning switch-back resumes its frozen checkout without writing or replacing the invoice", async t => {
  const sb = createSupabaseMock(); withTestEnvironment(t, sb.fetchMock);
  const metadata = {
    paymentProvider: "CatalystPay BTC", total: 129.5,
    items: [{ name: "Example product", dose: "5 mg", quantity: 1, price: 129.5 }],
    subtotal: 129.5, shipping: 0, automaticDiscount: 0, promoDiscount: 0,
    affiliateDiscount: 0, cryptoDiscount: 0, storeCreditUsed: 0, shippingType: "standard",
    firstName: "Test", address: "Fixture address", country: "US", orderNotes: "Fixture note",
  };
  const created = makeRes();
  await handler(makeRequest({ body: { order: checkoutOrder({ metadata }) } }), created);
  const cookie = created.headers['Set-Cookie'].split(';')[0];
  sb.rows[0].status = 'checkout (clicked pay)';
  sb.rows[0].metadata.catalystpay_invoice_id = 'original_invoice';
  const before = structuredClone(sb.rows[0]);
  const resume = async (change = {}, capability = cookie) => {
    const response = makeRes();
    await handler(makeRequest({ cookie: capability, body: { order: checkoutOrder({ status: 'checkout', metadata, ...change }) } }), response);
    return response;
  };
  for (let retry = 0; retry < 2; retry++) {
    const response = await resume();
    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.body, { ok: true, id: ORDER_ID, status: 'checkout (clicked pay)', locked: true, saved: false });
    assert.deepEqual(sb.rows[0], before);
  }
  const changedMetadata = [
    ...['subtotal', 'shipping', 'automaticDiscount', 'promoDiscount', 'affiliateDiscount', 'cryptoDiscount', 'storeCreditUsed'].map(field => ({ ...metadata, [field]: 2 })),
    ...['shippingType', 'promoCode', 'affiliateCode', 'firstName', 'lastName', 'country', 'address', 'address2', 'city', 'state', 'postalCode', 'phone', 'taxId', 'orderNotes', 'paymentProvider'].map(field => ({ ...metadata, [field]: 'changed' })),
    ...[{ quantity: 2 }, { price: 1 }, { dose: '10 mg' }, { fromWarehouse: 'us' }, { vials: 5 }].map(change => ({ ...metadata, items: [{ ...metadata.items[0], ...change }] })),
  ];
  for (const change of [{ total: 1 }, ...changedMetadata.map(metadata => ({ metadata }))]) {
    assert.equal((await resume(change)).statusCode, 409, JSON.stringify(change));
    assert.deepEqual(sb.rows[0], before);
  }
  assert.equal((await resume({}, '')).statusCode, 403);
  sb.rows[0].user_id = '22222222-2222-4222-8222-222222222222';
  assert.equal((await resume()).statusCode, 403);
  sb.rows[0].user_id = USER_ID;
  for (const status of ['paid', 'done', 'refunded', 'cancelled']) {
    sb.rows[0].status = status;
    assert.equal((await resume()).statusCode, 409);
  }
  sb.rows[0].status = 'checkout (clicked pay)';
  delete sb.rows[0].metadata.catalystpay_invoice_id;
  assert.equal((await resume()).statusCode, 409);
  assert.equal(sb.calls.filter(call => call.method === 'PATCH').length, 0);
  assert.equal(sb.calls.filter(call => call.method === 'POST').length, 1); // Initial draft only.
});

test('customer checkout cannot set wire_pending or inject server-owned invoice and commission fields', async t => {
  const sb = createSupabaseMock(); withTestEnvironment(t, sb.fetchMock);
  const wire = makeRes(); await handler(makeRequest({ body: { order: checkoutOrder({ status:'wire_pending' }) } }), wire);
  assert.equal(wire.statusCode,400);assert.equal(sb.rows.length,0);
  const injected = { catalystpay_invoice_id:'forged',legacyInvoiceAttempt:{state:'ready'},affiliateQuoteVersion:'server-referral-v1',affiliateAttributionCode:'FORGED',affiliateCommission:999,affiliateOwnerEmail:'forged@example.test',affiliateRuleVersion:'forged',discountRule:{rate:1} };
  const saved=makeRes();await handler(makeRequest({body:{order:checkoutOrder({metadata:injected})}}),saved);assert.equal(saved.statusCode,200);
  for(const key of Object.keys(injected))assert.equal(sb.rows[0].metadata[key],undefined,key);
});
