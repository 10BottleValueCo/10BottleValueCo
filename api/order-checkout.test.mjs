import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";
import handler from "./order-checkout.js";

const ORDER_ID = "INV-ABC12345";
const EMAIL = "guest@example.org";
const USER_ID = "00000000-0000-4000-8000-000000000001";
const verifiedUser = { id: USER_ID, email: EMAIL, email_confirmed_at: "2026-10-08T00:00:00Z" };

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

function makeRequest({ method = "POST", body, url = "/api/order-checkout", cookie, authorization } = {}) {
  return {
    method,
    url,
    headers: {
      ...(body ? { "content-type": "application/json" } : {}),
      ...(cookie ? { cookie } : {}),
      ...(authorization ? { authorization } : {}),
    },
    body,
  };
}

function withTestEnvironment(t, fetchMock) {
  const keys = [
    "SUPABASE_URL",
    "VITE_SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_ANON_KEY",
    "VITE_SUPABASE_ANON_KEY",
  ];
  const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  for (const key of keys) delete process.env[key];
  process.env.SUPABASE_URL = "https://supabase.test";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
  process.env.SUPABASE_ANON_KEY = "test-anon-key";

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
    calls.push({ method, url, body: options.body, headers: options.headers });
    if (url.pathname === "/auth/v1/user") return makeResponse(verifiedUser);
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

test("existing guest POST keeps its scoped capability; GET requires verified owner and exposes status only", async (t) => {
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
      authorization: "Bearer owner-session",
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
      authorization: "Bearer owner-session",
    }),
    statusResponse,
  );
  assert.equal(statusResponse.statusCode, 200);
  assert.deepEqual(statusResponse.body, {
    ok: true,
    id: ORDER_ID,
    status: "checkout",
  });
  assert.equal(statusResponse.headers.Vary, "Authorization");
  assert.equal(statusResponse.headers["Cache-Control"], "private, no-store");
});

function statusRequest(overrides = {}) {
  return makeRequest({ method: "GET", url: `/api/order-checkout?orderId=${ORDER_ID}`,
    authorization: "Bearer owner-session", ...overrides });
}

test("GET recovers the verified owner without a checkout cookie and queries only existing status columns", async (t) => {
  const store = createSupabaseMock();
  store.rows.push({ id: ORDER_ID, email: " GUEST@example.org ", status: "paid", metadata: { private: "hidden" } });
  withTestEnvironment(t, store.fetchMock);
  for (const cookie of [undefined, "tbv_checkout_access=INV-OTHER000.other-token"]) {
    const res = makeRes();
    await handler(statusRequest({ cookie }), res);
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, { ok: true, id: ORDER_ID, status: "paid" });
  }
  const reads = store.calls.filter(call => call.url.pathname.endsWith("/orders"));
  assert.equal(reads.length, 2);
  for (const read of reads) {
    assert.equal(read.url.searchParams.get("select"), "id,email,status");
    assert.equal(read.url.searchParams.get("limit"), "2");
    assert.equal(read.method, "GET");
  }
  assert.ok(store.calls.every(call => !call.url.pathname.includes("paylio")));
  assert.ok(store.calls.filter(call => call.url.pathname === "/auth/v1/user")
    .every(call => call.headers.Authorization === "Bearer owner-session"));
});

test("an order capability cookie cannot expose another account's status", async (t) => {
  const store = createSupabaseMock();
  store.rows.push({ id: ORDER_ID, email: EMAIL, status: "paid" });
  withTestEnvironment(t, async (input, options) => new URL(input).pathname === "/auth/v1/user"
    ? makeResponse({ ...verifiedUser, id: "00000000-0000-4000-8000-000000000002", email: "different@example.org" })
    : store.fetchMock(input, options));
  const res = makeRes();
  await handler(statusRequest({ cookie: `tbv_checkout_access=${ORDER_ID}.valid-owner-capability` }), res);
  assert.equal(res.statusCode, 404);
  assert.equal(res.body.ok, false);
  assert.ok(!JSON.stringify(res.body).includes(EMAIL));
  assert.ok(!JSON.stringify(res.body).includes("paid"));
});

test("GET rejects missing or malformed Bearer credentials before any private read", async (t) => {
  withTestEnvironment(t, () => assert.fail("unauthenticated request reached storage"));
  for (const authorization of [undefined, "", "Basic owner-session", "Bearer"]) {
    const res = makeRes();
    await handler(statusRequest({ authorization, cookie: `tbv_checkout_access=${ORDER_ID}.old-cookie` }), res);
    assert.equal(res.statusCode, 401);
    assert.equal(res.body.ok, false);
  }
});

test("GET rejects expired tokens, unconfirmed email and malformed server identities", async (t) => {
  let authReply;
  withTestEnvironment(t, input => {
    assert.equal(new URL(input).pathname, "/auth/v1/user");
    return authReply();
  });
  const cases = [
    [() => makeResponse({ error: "expired" }, 401), 401],
    [() => makeResponse({ ...verifiedUser, email_confirmed_at: null }), 403],
    [() => makeResponse({ ...verifiedUser, id: "" }), 403],
    [() => makeResponse({ ...verifiedUser, email: "invalid" }), 403],
    [() => { throw new Error("auth unavailable"); }, 503],
  ];
  for (const [reply, expected] of cases) {
    authReply = reply;
    const res = makeRes(); await handler(statusRequest(), res);
    assert.equal(res.statusCode, expected); assert.equal(res.body.ok, false);
  }
});

test("GET refuses missing and ambiguous records, malformed storage responses and wrong order IDs", async (t) => {
  let storageReply;
  withTestEnvironment(t, input => new URL(input).pathname === "/auth/v1/user"
    ? makeResponse(verifiedUser) : storageReply());
  const row = { id: ORDER_ID, email: EMAIL, status: "paid" };
  const cases = [
    [() => makeResponse([]), 404],
    [() => makeResponse([row, row]), 503],
    [() => makeResponse({ rows: [row] }), 503],
    [() => makeResponse([{ ...row, id: "INV-DIFFERENT" }]), 503],
    [() => makeResponse([{ ...row, status: null }]), 503],
    [() => makeResponse({ message: "private database detail" }, 500), 503],
    [() => new Response("not JSON"), 503],
    [() => { throw new Error("storage unavailable"); }, 503],
  ];
  for (const [reply, expected] of cases) {
    storageReply = reply;
    const res = makeRes(); await handler(statusRequest(), res);
    assert.equal(res.statusCode, expected); assert.equal(res.body.ok, false);
    assert.ok(!JSON.stringify(res.body).includes("private database detail"));
  }
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
