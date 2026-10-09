import assert from "node:assert/strict";
import { test } from "node:test";
import handler from "./public-promo-code.js";

function response(body, status = 200) {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
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
    json(body) {
      this.body = body;
      return this;
    },
  };
}

function withEnvironment(t, fetchMock) {
  const keys = ["SUPABASE_URL", "VITE_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"];
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

function makeRequest({ method = "GET", query = {} } = {}) {
  return { method, query, log: { error() {} } };
}

test("public lookup returns only the requested code and rate", async (t) => {
  let requestedUrl;
  withEnvironment(t, async (input, options) => {
    requestedUrl = new URL(String(input));
    assert.equal(options.headers.Authorization, "Bearer test-service-role-key");
    return response([
      {
        code: "SPRING-10",
        rate: 0.1,
        email: "__PUBLIC__",
        id: "33333333-3333-4333-8333-333333333333", used: false,
      },
    ]);
  });

  const res = mockRes();
  await handler(makeRequest({ query: { code: " spring-10 " } }), res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, {
    ok: true,
    promo: { code: "SPRING-10", rate: 0.1, minimumSubtotal: 0, startsAt: null, endsAt: null },
  });
  assert.equal(requestedUrl.searchParams.get("select"), "*");
  assert.equal(requestedUrl.searchParams.get("email"), "eq.__PUBLIC__");
  assert.equal(requestedUrl.searchParams.get("code"), "eq.SPRING-10");
  assert.equal(requestedUrl.searchParams.get("used"), "eq.false");
  assert.equal(requestedUrl.searchParams.get("limit"), "2");
  assert.equal(res.headers["Cache-Control"], "no-store");
});

test("unknown and malformed public promo rows do not expose row data", async (t) => {
  withEnvironment(t, async () => response([]));
  const res = mockRes();
  await handler(makeRequest({ query: { code: "UNKNOWN" } }), res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { ok: true, promo: null });

  withEnvironment(t, async () => response([{ code: "BAD", rate: 4 }]));
  const malformedRes = mockRes();
  await handler(makeRequest({ query: { code: "BAD" } }), malformedRes);
  assert.deepEqual(malformedRes.body, { ok: true, promo: null });
});

test("invalid codes are rejected before querying Supabase", async (t) => {
  let fetchCount = 0;
  withEnvironment(t, async () => {
    fetchCount += 1;
    throw new Error("Unexpected network request");
  });
  const res = mockRes();
  await handler(makeRequest({ query: { code: "A/B" } }), res);
  assert.equal(res.statusCode, 400);
  assert.equal(fetchCount, 0);
  assert.equal(res.headers["Cache-Control"], "no-store");
});

test("ambiguous duplicate codes require support review", async (t) => {
  withEnvironment(t, async () =>
    response([
      { code: "DUPLICATE", rate: 0.1 },
      { code: "DUPLICATE", rate: 0.2 },
    ]),
  );
  const res = mockRes();
  await handler(makeRequest({ query: { code: "DUPLICATE" } }), res);
  assert.equal(res.statusCode, 503);
});

test("non-GET requests are rejected", async (t) => {
  let fetchCount = 0;
  withEnvironment(t, async () => {
    fetchCount += 1;
    throw new Error("Unexpected network request");
  });
  const res = mockRes();
  await handler(makeRequest({ method: "POST" }), res);
  assert.equal(res.statusCode, 405);
  assert.equal(res.headers.Allow, "GET");
  assert.equal(fetchCount, 0);
});
