import assert from "node:assert/strict";
import { test } from "node:test";
import handler from "./account-email-change.js";
import { createEmailChallenge, CURRENT_EMAIL_MODE } from "./_current-email-confirmation.js";

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
    "RESEND_API_KEY",
  ];
  const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  for (const key of keys) delete process.env[key];
  process.env.SUPABASE_URL = "https://supabase.test";
  process.env.SUPABASE_ANON_KEY = "test-anon-key";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
  process.env.RESEND_API_KEY = "test-email-key";

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

function createSupabaseMock({ authEmail = CURRENT_EMAIL, adminEmail = CURRENT_EMAIL, pending = null, newEmail = pending?.mode === CURRENT_EMAIL_MODE ? null : pending?.to, updateError = null, silentReject = false, timeoutAfterUpdate = false, migrateError = false, mailError = false, occupied = false } = {}) {
  const calls = [];
  let adminUser = {
    id: USER_ID,
    email: adminEmail,
    new_email: newEmail,
    app_metadata: { providers: ["email"], ...(pending ? { tbv_pending_email_migration: pending } : {}) },
  };

  const fetchMock = async (input, options = {}) => {
    const url = new URL(String(input));
    const method = options.method || "GET";
    calls.push({ url, method, body: options.body ? JSON.parse(options.body) : null });

    if (url.hostname === "api.resend.com") {
      return makeResponse(mailError ? { error: "rejected" } : { id: "mock-mail" }, mailError ? 503 : 200);
    }
    if (url.pathname === "/auth/v1/admin/users") {
      return makeResponse({ users: occupied ? [{ id: "another-user", email: NEW_EMAIL }] : [] });
    }
    if (url.pathname.endsWith("/auth/v1/user")) {
      if (method === "PUT") {
        if (updateError) return makeResponse(updateError.data, updateError.status);
        if (!silentReject) adminUser.new_email = JSON.parse(options.body).email;
        if (timeoutAfterUpdate) throw new Error("Simulated timeout");
        return makeResponse(adminUser);
      }
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
        const update = JSON.parse(options.body || "{}");
        const metadata = { ...adminUser.app_metadata };
        for (const [key, value] of Object.entries(update.app_metadata || {})) {
          if (value === null) delete metadata[key];
          else metadata[key] = value;
        }
        adminUser = { ...adminUser, ...update, app_metadata: metadata };
        if (update.email) adminUser.new_email = null;
        return makeResponse({ user: adminUser });
      }
    }
    if (url.pathname.startsWith("/rest/v1/")) {
      if (method === "GET") return makeResponse([]);
      if (method === "PATCH") return makeResponse(null, migrateError ? 503 : 204);
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
  assert.deepEqual(mock.getAdminUser().app_metadata.providers, ["email"]);

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

const emailRequest = (newEmail = NEW_EMAIL) => makeRequest({
  action: "request-current", currentEmail: CURRENT_EMAIL, newEmail, currentPassword: "correct-password",
});

test("a rejected occupied address leaves no false confirmation reservation", async (t) => {
  const mock = createSupabaseMock({ occupied: true });
  withTestEnvironment(t, mock.fetchMock);
  const res = mockRes();
  await handler(emailRequest(), res);
  assert.equal(res.statusCode, 409);
  assert.match(res.body.error, /already used/);
  assert.equal(mock.getAdminUser().app_metadata.tbv_pending_email_migration, undefined);
  assert.equal(mock.calls.some(c => c.method === "PATCH"), false);
});

test("rejected delivery is not claimed as a sent confirmation", async (t) => {
  const mock = createSupabaseMock({ mailError: true });
  withTestEnvironment(t, mock.fetchMock);
  const res = mockRes();
  await handler(emailRequest(), res);
  assert.equal(res.statusCode, 503);
  assert.match(res.body.error, /Could not send/);
  assert.equal(mock.getAdminUser().app_metadata.tbv_pending_email_migration.delivery, "failed");
  assert.equal(mock.getAdminUser().app_metadata.tbv_pending_email_migration.codeHash, null);
});

test("a genuine confirmation returns its destination and leaves all history untouched", async (t) => {
  const mock = createSupabaseMock();
  withTestEnvironment(t, mock.fetchMock);
  const res = mockRes();
  await handler(emailRequest(), res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.pendingConfirmation, true);
  assert.equal(res.body.newEmail, NEW_EMAIL);
  assert.equal(mock.calls.some(c => c.method === "PATCH"), false);
});

test("a metadata-only leftover restores the form instead of claiming email was sent", async (t) => {
  const mock = createSupabaseMock({
    pending: { from: CURRENT_EMAIL, to: NEW_EMAIL, createdAt: new Date().toISOString() },
    newEmail: null,
  });
  withTestEnvironment(t, mock.fetchMock);
  const status = mockRes();
  await handler(makeRequest({ action: "finalize" }), status);
  assert.equal(status.body.requestNotSent, true);
  assert.equal(status.body.pendingConfirmation, undefined);
  const retry = mockRes();
  await handler(emailRequest(), retry);
  assert.equal(retry.statusCode, 200);
  assert.equal(retry.body.pendingConfirmation, true);
});

test("a different destination can replace an unconfirmed request without waiting 24 hours", async (t) => {
  const mock = createSupabaseMock({
    pending: { from: CURRENT_EMAIL, to: "previous@example.org", createdAt: new Date().toISOString() },
  });
  withTestEnvironment(t, mock.fetchMock);
  const res = mockRes();
  await handler(emailRequest(), res);
  assert.equal(res.statusCode, 200);
  assert.equal(mock.getAdminUser().new_email, null);
  assert.equal(mock.getAdminUser().app_metadata.tbv_pending_email_migration.to, NEW_EMAIL);
  assert.equal(mock.calls.some(c => c.method === "PATCH"), false);
});

test("rejected replacement preserves the previous valid migration", async (t) => {
  const pending = { from: CURRENT_EMAIL, to: "previous@example.org", createdAt: new Date().toISOString() };
  const mock = createSupabaseMock({ pending, occupied: true });
  withTestEnvironment(t, mock.fetchMock);
  const res = mockRes();
  await handler(emailRequest(), res);
  assert.equal(res.statusCode, 409);
  assert.deepEqual(mock.getAdminUser().app_metadata.tbv_pending_email_migration, pending);
});

test("a rejected resend is not masked by the previous pending state", async (t) => {
  const pending = { mode: CURRENT_EMAIL_MODE, from: CURRENT_EMAIL, to: NEW_EMAIL, createdAt: new Date().toISOString() };
  const mock = createSupabaseMock({ pending });
  withTestEnvironment(t, mock.fetchMock);
  const res = mockRes();
  await handler(emailRequest(), res);
  assert.equal(res.statusCode, 429);
  assert.match(res.body.error, /Too many/);
  assert.deepEqual(mock.getAdminUser().app_metadata.tbv_pending_email_migration, pending);
});

test("a current-mail request never calls the two-mailbox Supabase update endpoint", async (t) => {
  const mock = createSupabaseMock();
  withTestEnvironment(t, mock.fetchMock);
  const res = mockRes();
  await handler(emailRequest(), res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.pendingConfirmation, true);
  assert.equal(mock.getAdminUser().app_metadata.tbv_pending_email_migration.to, NEW_EMAIL);
  assert.equal(mock.calls.some(c => c.url.pathname === "/auth/v1/user" && c.method === "PUT"), false);
});

test("wrong password cannot send an email-change request", async (t) => {
  const mock = createSupabaseMock();
  withTestEnvironment(t, mock.fetchMock);
  const req = emailRequest();
  req.body.currentPassword = "wrong-password";
  const res = mockRes();
  await handler(req, res);
  assert.equal(res.statusCode, 401);
  assert.equal(mock.calls.some(c => c.url.pathname.endsWith("/auth/v1/user") && c.method === "PUT"), false);
});

test("cancel cannot remove the migration for a still-valid confirmation link", async (t) => {
  const pending = { from: CURRENT_EMAIL, to: NEW_EMAIL, createdAt: new Date().toISOString() };
  const mock = createSupabaseMock({ pending });
  withTestEnvironment(t, mock.fetchMock);
  const res = mockRes();
  await handler(makeRequest({ action: "cancel" }), res);
  assert.equal(res.statusCode, 409);
  assert.deepEqual(mock.getAdminUser().app_metadata.tbv_pending_email_migration, pending);
});

test("failed history migration remains retryable without losing its reservation", async (t) => {
  const pending = { from: CURRENT_EMAIL, to: NEW_EMAIL, createdAt: new Date().toISOString() };
  const mock = createSupabaseMock({ authEmail: NEW_EMAIL, adminEmail: NEW_EMAIL, pending, migrateError: true });
  withTestEnvironment(t, mock.fetchMock);
  const res = mockRes();
  await handler(makeRequest({ action: "finalize" }), res);
  assert.equal(res.statusCode, 503);
  assert.deepEqual(mock.getAdminUser().app_metadata.tbv_pending_email_migration, pending);
});

function sentChallenge(userId = USER_ID) {
  const challenge = createEmailChallenge("test-service-role-key", userId, CURRENT_EMAIL, NEW_EMAIL);
  return { code: challenge.code, pending: { ...challenge.pending, delivery: "sent" } };
}

test("confirmation email is sent only to the authenticated current email, never the new email", async (t) => {
  const mock = createSupabaseMock();
  withTestEnvironment(t, mock.fetchMock);
  const res = mockRes();
  await handler(emailRequest(), res);
  const emails = mock.calls.filter(c => c.url.hostname === "api.resend.com");
  assert.equal(emails.length, 1);
  assert.equal(emails[0].body.to, CURRENT_EMAIL);
  assert.equal(emails[0].body.bcc, undefined);
  assert.equal(emails[0].body.cc, undefined);
  assert.match(emails[0].body.text, /person.new@example.org/);
  const code = /Confirmation code: ([A-F0-9]{16})/.exec(emails[0].body.text)?.[1];
  assert.ok(code);
  assert.equal(JSON.stringify(mock.getAdminUser().app_metadata).includes(code), false);
  assert.equal(JSON.stringify(res.body).includes(code), false);
  assert.equal(res.body.currentEmail, CURRENT_EMAIL);
  assert.equal(res.body.confirmationMode, CURRENT_EMAIL_MODE);
  assert.equal(mock.getAdminUser().email, CURRENT_EMAIL);
});

test("only the correct current-mailbox code changes auth email and preserves history", async (t) => {
  const { code, pending } = sentChallenge();
  const mock = createSupabaseMock({ pending });
  withTestEnvironment(t, mock.fetchMock);
  const res = mockRes();
  await handler(makeRequest({ action: "confirm-current", code, newEmail: NEW_EMAIL }), res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.migrated, true);
  assert.equal(mock.getAdminUser().email, NEW_EMAIL);
  assert.equal(mock.getAdminUser().app_metadata.tbv_pending_email_migration, undefined);
  assert.deepEqual(mock.getAdminUser().app_metadata.providers, ["email"]);
  assert.equal(mock.calls.filter(c => c.url.hostname === "api.resend.com").length, 0);
  assert.equal(mock.calls.filter(c => c.method === "PATCH").length, 5);
});

test("an incorrect code cannot update email or migrate any history", async (t) => {
  const { pending } = sentChallenge();
  const mock = createSupabaseMock({ pending });
  withTestEnvironment(t, mock.fetchMock);
  const res = mockRes();
  await handler(makeRequest({ action: "confirm-current", code: "invalid", newEmail: NEW_EMAIL }), res);
  assert.equal(res.statusCode, 400);
  assert.equal(mock.getAdminUser().email, CURRENT_EMAIL);
  assert.equal(mock.getAdminUser().app_metadata.tbv_pending_email_migration.attempts, 1);
  assert.equal(mock.calls.some(c => c.method === "PATCH"), false);
});

test("five incorrect code attempts lock confirmation, including a later correct code", async (t) => {
  const { code, pending } = sentChallenge();
  const mock = createSupabaseMock({ pending });
  withTestEnvironment(t, mock.fetchMock);
  for (let i = 0; i < 5; i++) await handler(makeRequest({ action: "confirm-current", code: "invalid", newEmail: NEW_EMAIL }), mockRes());
  const res = mockRes();
  await handler(makeRequest({ action: "confirm-current", code, newEmail: NEW_EMAIL }), res);
  assert.equal(res.statusCode, 429);
  assert.equal(mock.getAdminUser().email, CURRENT_EMAIL);
});

test("an expired code cannot update email", async (t) => {
  const { code, pending } = sentChallenge();
  pending.expiresAt = new Date(Date.now() - 1000).toISOString();
  const mock = createSupabaseMock({ pending });
  withTestEnvironment(t, mock.fetchMock);
  const res = mockRes();
  await handler(makeRequest({ action: "confirm-current", code, newEmail: NEW_EMAIL }), res);
  assert.equal(res.statusCode, 410);
  assert.equal(mock.getAdminUser().email, CURRENT_EMAIL);
});

test("code proof is bound to the authenticated user, not merely the destination", async (t) => {
  const { code, pending } = sentChallenge("another-user");
  const mock = createSupabaseMock({ pending });
  withTestEnvironment(t, mock.fetchMock);
  const res = mockRes();
  await handler(makeRequest({ action: "confirm-current", code, newEmail: NEW_EMAIL }), res);
  assert.equal(res.statusCode, 400);
  assert.equal(mock.getAdminUser().email, CURRENT_EMAIL);
});

test("missing mail configuration fails explicitly without changing auth or creating a reservation", async (t) => {
  const mock = createSupabaseMock();
  withTestEnvironment(t, mock.fetchMock);
  delete process.env.RESEND_API_KEY;
  const res = mockRes();
  await handler(emailRequest(), res);
  assert.equal(res.statusCode, 503);
  assert.equal(mock.getAdminUser().app_metadata.tbv_pending_email_migration, undefined);
  assert.equal(mock.getAdminUser().email, CURRENT_EMAIL);
});

test("older cached clients are told to reload instead of sending to a new mailbox", async (t) => {
  const mock = createSupabaseMock();
  withTestEnvironment(t, mock.fetchMock);
  const req = emailRequest();
  req.body.action = "request";
  const res = mockRes();
  await handler(req, res);
  assert.equal(res.statusCode, 409);
  assert.match(res.body.error, /Reload/);
  assert.equal(mock.calls.some(c => c.url.hostname === "api.resend.com" || c.method === "PUT"), false);
});

test("current-mailbox status exposes no code hash or nonce and never migrates before proof", async (t) => {
  const { pending } = sentChallenge();
  const mock = createSupabaseMock({ pending });
  withTestEnvironment(t, mock.fetchMock);
  const res = mockRes();
  await handler(makeRequest({ action: "finalize" }), res);
  assert.equal(res.body.pendingConfirmation, true);
  assert.equal(res.body.confirmationMode, CURRENT_EMAIL_MODE);
  assert.equal(res.body.codeHash, undefined);
  assert.equal(res.body.nonce, undefined);
  assert.equal(mock.calls.some(c => c.method === "PATCH"), false);
});

test("confirmation must match the destination displayed in the active request", async (t) => {
  const { code, pending } = sentChallenge();
  const mock = createSupabaseMock({ pending });
  withTestEnvironment(t, mock.fetchMock);
  const res = mockRes();
  await handler(makeRequest({ action: "confirm-current", code, newEmail: "different@example.org" }), res);
  assert.equal(res.statusCode, 409);
  assert.equal(mock.getAdminUser().email, CURRENT_EMAIL);
  assert.equal(mock.calls.some(c => c.method === "PATCH"), false);
});
