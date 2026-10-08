import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";
import handler from "./order-checkout.js";

const ORDER_ID = "INV-ABC12345";
const EMAIL = "guest@example.org";

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
  const calls = [];
  const fetchMock = async (input, options = {}) => {
    const url = new URL(input);
    const method = options.method || "GET";
    calls.push({ method, url, body: options.body });
    const id = url.searchParams.get("id")?.replace(/^eq\./, "");

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
  return { fetchMock, rows, calls };
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

test("guest order writes use a scoped HttpOnly capability and expose status only", async (t) => {
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
  });
});

test("guest checkout cannot write paid status or update without its capability", async (t) => {
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

test("guest checkout cannot change a paid order", async (t) => {
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
