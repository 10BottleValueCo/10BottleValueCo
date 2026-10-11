import assert from "node:assert/strict";
import { test } from "node:test";
import handler from "./account-email-change.js";

const CURRENT_EMAIL = "person@example.org";
const NEW_EMAIL = "person.new@example.org";
const USER_ID = "user-1";

function makeResponse(data, status = 200) {
  return new Response(data === null ? null : JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function withTestEnvironment(t, fetchMock) {
  const keys = [
    "SUPABASE_URL",
    "VITE_SUPABASE_URL",
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

function makeRequest(body, authorization = "Bearer user-token") {
  return {
    method: "POST",
    headers: authorization ? { authorization } : {},
    body,
    log: { error() {}, info() {} },
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

function createSupabaseMock({ authEmail = CURRENT_EMAIL, adminEmail = CURRENT_EMAIL, pending = null } = {}) {
  const calls = [];
  let adminUser = {
    id: USER_ID,
    email: adminEmail,
    app_metadata: pending
      ? { tbv_pending_email_migration: pending }
      : {},
  };

  const fetchMock = async (input, options = {}) => {
    const url = new URL(String(input));
    const method = options.method || "GET";
    calls.push({ url, method, body: options.body ? JSON.parse(options.body) : null });

    if (url.pathname.endsWith("/auth/v1/user")) {
      return makeResponse({ id: USER_ID, email: authEmail });
    }
    if (url.pathname.endsWith("/auth/v1/token")) {
      const body = JSON.parse(options.body || "{}");
      return body.password === "correct-password"
        ? makeResponse({ user: { id: USER_ID, email: CURRENT_EMAIL } })
        : makeResponse({ error: "invalid_grant" }, 400);
    }
    if (url.pathname.endsWith(`/auth/v1/admin/users/${USER_ID}`)) {
      if (method === "GET") return makeResponse({ user: adminUser });
      if (method === "PUT") {
        adminUser = { ...adminUser, ...JSON.parse(options.body || "{}") };
        return makeResponse({ user: adminUser });
      }
    }
    if (url.pathname.startsWith("/rest/v1/")) {
      if (method === "GET") return makeResponse([]);
      if (method === "PATCH") return makeResponse(null, 204);
    }
    throw new Error(`Unexpected Supabase request: ${method} ${url}`);
  };

  return { fetchMock, calls, getAdminUser: () => adminUser };
}

test("email preparation requires the current password and records a pending migration", async (t) => {
  const mock = createSupabaseMock();
  withTestEnvironment(t, mock.fetchMock);
  const res = mockRes();

  await handler(
    makeRequest({
      action: "prepare",
      currentEmail: CURRENT_EMAIL,
      newEmail: NEW_EMAIL,
      currentPassword: "correct-password",
    }),
    res,
  );

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.prepared, true);
  assert.equal(
    mock.getAdminUser().app_metadata.tbv_pending_email_migration.from,
    CURRENT_EMAIL,
  );
  assert.equal(
    mock.getAdminUser().app_metadata.tbv_pending_email_migration.to,
    NEW_EMAIL,
  );
  const passwordRequest = mock.calls.find(({ url }) => url.pathname.endsWith("/auth/v1/token"));
  assert.equal(passwordRequest.body.password, "correct-password");
  const adminUpdate = mock.calls.find(
    ({ url, method }) => url.pathname.includes("/auth/v1/admin/users/") && method === "PUT",
  );
  assert.equal(JSON.stringify(adminUpdate.body).includes("correct-password"), false);
});

test("incorrect password cannot create a pending email change", async (t) => {
  const mock = createSupabaseMock();
  withTestEnvironment(t, mock.fetchMock);
  const res = mockRes();

  await handler(
    makeRequest({
      action: "prepare",
      currentEmail: CURRENT_EMAIL,
      newEmail: NEW_EMAIL,
      currentPassword: "wrong-password",
    }),
    res,
  );

  assert.equal(res.statusCode, 401);
  assert.equal(mock.getAdminUser().app_metadata.tbv_pending_email_migration, undefined);
  assert.equal(
    mock.calls.some(({ url, method }) => url.pathname.includes("/auth/v1/admin/users/") && method === "PUT"),
    false,
  );
});

test("history remains untouched until the new email is confirmed", async (t) => {
  const mock = createSupabaseMock({
    pending: { from: CURRENT_EMAIL, to: NEW_EMAIL, createdAt: new Date().toISOString() },
  });
  withTestEnvironment(t, mock.fetchMock);
  const res = mockRes();

  await handler(makeRequest({ action: "finalize" }), res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.pendingConfirmation, true);
  assert.equal(
    mock.calls.some(({ url, method }) => url.pathname.startsWith("/rest/v1/") && method === "PATCH"),
    false,
  );
});

test("confirmed changes transfer account history and can be safely retried", async (t) => {
  const mock = createSupabaseMock({
    authEmail: NEW_EMAIL,
    adminEmail: NEW_EMAIL,
    pending: { from: CURRENT_EMAIL, to: NEW_EMAIL, createdAt: new Date().toISOString() },
  });
  withTestEnvironment(t, mock.fetchMock);
  const res = mockRes();

  await handler(makeRequest({ action: "finalize" }), res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { ok: true, migrated: true, email: NEW_EMAIL });
  const patches = mock.calls.filter(
    ({ url, method }) => url.pathname.startsWith("/rest/v1/") && method === "PATCH",
  );
  const tables = patches.map(({ url }) => url.pathname.split("/").pop());
  for (const table of ["orders", "user_credits", "user_promos", "contact_messages", "affiliates"]) {
    assert.ok(tables.includes(table), `expected ${table} email rows to be migrated`);
  }
  assert.equal(mock.getAdminUser().app_metadata.tbv_pending_email_migration, undefined);

  const retry = mockRes();
  await handler(makeRequest({ action: "finalize" }), retry);
  assert.equal(retry.statusCode, 200);
  assert.deepEqual(retry.body, { ok: true, migrated: false });
});

test("unauthenticated email changes are rejected", async (t) => {
  const mock = createSupabaseMock();
  withTestEnvironment(t, mock.fetchMock);
  const res = mockRes();

  await handler(makeRequest({ action: "prepare" }, ""), res);

  assert.equal(res.statusCode, 401);
  assert.equal(mock.calls.length, 0);
});
