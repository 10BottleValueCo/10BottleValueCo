import test from "node:test";
import assert from "node:assert/strict";
import handler from "./account-email-login.js";
import { requireUser } from "./_auth.js";
import { EMAIL_FACTOR_NAME, needsEmailLoginCode, totpCode } from "./_email-login-mfa.js";
import { readFileSync } from "node:fs";

const userId = "11111111-1111-4111-8111-111111111111";
const sessionId = "22222222-2222-4222-8222-222222222222";
const factorId = "33333333-3333-4333-8333-333333333333";
const challengeId = "44444444-4444-4444-8444-444444444444";
const secret = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";
const user = { id: userId, email: "fixture@example.test", email_confirmed_at: "2026-01-01", factors: [{ id: factorId, friendly_name: EMAIL_FACTOR_NAME, status: "verified" }] };
const jwt = (aal = "aal1", sub = userId) => "fixture." + Buffer.from(JSON.stringify({ sub, session_id: sessionId, aal, amr: [{ method: "password" }] })).toString("base64url") + ".fixture";
const res = () => ({ statusCode: 200, setHeader() {}, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
function request(body, token = jwt()) { return { method: body ? "POST" : "GET", headers: { authorization: "Bearer " + token }, body }; }
async function mocked(run, options = {}) {
  const prior = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, init = {}) => {
    const path = new URL(url).pathname;
    const body = init.body ? JSON.parse(init.body) : undefined;
    calls.push({ path, body });
    if (path === "/auth/v1/user") return json(options.user || user);
    if (path.endsWith("/email_login_state")) return options.missing ? json({ code: "PGRST202" }, 404) : json({ factor: options.noFactor ? null : { id: factorId }, challenge: null });
    if (path === "/auth/v1/factors") return json({ id: factorId, totp: { secret } });
    if (path.endsWith("/email_login_store_factor")) return json({});
    if (path.endsWith("/email_login_challenge")) return json(options.locked && body.p_step === "claim" ? { error: "locked" } : { id: challengeId, purpose: body.p_purpose, expiresAt: "2030-01-01", resendAt: "2030-01-01" });
    if (path === "/auth/v1/otp") return json({});
    if (path === "/auth/v1/verify") return options.badCode ? json({ error: "invalid" }, 400) : json({ user: options.wrongOwner ? { ...user, id: sessionId } : user, access_token: "temporary-mail-proof" });
    if (path === "/auth/v1/logout") return json({});
    if (path.endsWith("/email_login_factor_secret")) return json(secret);
    if (path.endsWith("/challenge")) return json({ id: challengeId });
    if (path.endsWith("/verify")) return json({ access_token: jwt("aal2"), refresh_token: "fixture-refresh", user });
    if (path.endsWith("/" + factorId) || path.endsWith("/email_login_remove_factor")) return json({});
    throw new Error("Unexpected request " + path);
  };
  try { await run(calls); } finally { globalThis.fetch = prior; }
}
process.env.SUPABASE_URL = "https://fixture.supabase.test";
process.env.SUPABASE_SERVICE_ROLE_KEY = "fixture-server-key";

test("native factor code follows RFC 6238; weak or wrong-owner sessions cannot pass", () => {
  assert.equal(totpCode(secret, 59000), "287082");
  assert.equal(needsEmailLoginCode(user, jwt()), true);
  assert.equal(needsEmailLoginCode(user, jwt("aal2")), false);
  assert.equal(needsEmailLoginCode(user, jwt("aal2", sessionId)), true);
  assert.equal(needsEmailLoginCode({ ...user, factors: [] }, jwt()), false);
  assert.throws(() => totpCode("invalid!"));
});
test("private API authorization rejects password-only sessions but challenge endpoints may authenticate identity", async () => {
  await mocked(async () => {
    const denied = res();
    assert.equal(await requireUser(request(), denied), null);
    assert.equal(denied.statusCode, 403);
    assert.equal(denied.body.code, "EMAIL_LOGIN_CODE_REQUIRED");
    assert.equal((await requireUser(request(), res(), { allowEmailChallenge: true })).id, userId);
    assert.equal((await requireUser(request(undefined, jwt("aal2")), res())).id, userId);
  });
});
test("missing SQL disables setup without breaking users who have not enabled MFA", async () => {
  await mocked(async () => {
    const out = res(); await handler(request(), out);
    assert.equal(out.statusCode, 200);
    assert.equal(out.body.available, false);
    assert.equal(out.body.requiresCode, false);
  }, { missing: true, user: { ...user, factors: [] } });
});
test("mail goes only to the authenticated current address, not client-supplied email", async () => {
  await mocked(async calls => {
    const out = res(); await handler(request({ action: "send", purpose: "login", email: "attacker@example.test" }), out);
    assert.equal(out.statusCode, 200);
    assert.equal(calls.find(x => x.path === "/auth/v1/otp").body.email, user.email);
    assert.equal(calls.some(x => x.path.endsWith("/email_login_factor_secret")), false);
    assert.equal(JSON.stringify(out.body).includes(secret), false);
  });
});
test("activation stores the native secret privately and exposes only a mailbox challenge", async () => {
  await mocked(async calls => {
    const out = res(); await handler(request({ action: "send", purpose: "enable" }), out);
    assert.equal(out.statusCode, 200);
    assert.equal(calls.find(x => x.path.endsWith("/email_login_store_factor")).body.p_secret, secret);
    assert.equal(out.body.challenge.id, challengeId);
    assert.equal(out.body.enabled, undefined);
    assert.equal(JSON.stringify(out.body).includes(secret), false);
  }, { noFactor: true, user: { ...user, factors: [] } });
});
test("only a valid, same-owner mailbox proof can upgrade the original session", async () => {
  await mocked(async calls => {
    const out = res(); await handler(request({ action: "verify", purpose: "login", challengeId, code: "123456" }), out);
    assert.equal(out.statusCode, 200);
    assert.equal(out.body.session.access_token, jwt("aal2"));
    assert.notEqual(out.body.session.access_token, "temporary-mail-proof");
    const emailIndex = calls.findIndex(x => x.path === "/auth/v1/verify");
    const secretIndex = calls.findIndex(x => x.path.endsWith("/email_login_factor_secret"));
    assert(secretIndex > emailIndex);
    assert(calls.some(x => x.path === "/auth/v1/logout"));
    assert.equal(JSON.stringify(out.body).includes(secret), false);
  });
});
for (const options of [{ badCode: true }, { wrongOwner: true }, { locked: true }]) {
  test("failed, wrong-owner or locked mailbox verification cannot access the factor secret: " + JSON.stringify(options), async () => {
    await mocked(async calls => {
      const out = res(); await handler(request({ action: "verify", purpose: "login", challengeId, code: "123456" }), out);
      assert.equal(out.statusCode, 400);
      assert.equal(calls.some(x => x.path.endsWith("/email_login_factor_secret")), false);
      assert.equal(out.body.session, undefined);
    }, options);
  });
}
test("disabling requires an existing aal2 session and a fresh code", async () => {
  await mocked(async calls => {
    const weak = res(); await handler(request({ action: "send", purpose: "disable" }), weak);
    assert.equal(weak.statusCode, 403);
    assert.equal(calls.some(x => x.path === "/auth/v1/otp"), false);
    const out = res(); await handler(request({ action: "verify", purpose: "disable", challengeId, code: "123456" }, jwt("aal2")), out);
    assert.equal(out.body.enabled, false);
    assert(calls.some(x => x.path.endsWith("/email_login_remove_factor")));
  });
});
test("email-only sign-in cannot replace the required password or obtain a mail challenge", async () => {
  const token = "fixture." + Buffer.from(JSON.stringify({ sub: userId, session_id: sessionId, aal: "aal1", amr: [{ method: "otp" }] })).toString("base64url") + ".fixture";
  await mocked(async calls => {
    const out = res(); await handler(request({ action: "send", purpose: "login" }, token), out);
    assert.equal(out.statusCode, 403);
    assert.equal(out.body.code, "EMAIL_LOGIN_PASSWORD_REQUIRED");
    assert.equal(calls.some(x => x.path === "/auth/v1/otp"), false);
    const strongButNoPassword = "fixture." + Buffer.from(JSON.stringify({ sub: userId, session_id: sessionId, aal: "aal2", amr: [{ method: "otp" }] })).toString("base64url") + ".fixture";
    assert(needsEmailLoginCode(user, strongButNoPassword));
  });
});
test("SQL keeps secrets service-only and gates tables, storage and security-definer Data API calls", () => {
  const sql = readFileSync(new URL("../supabase/migrations/20261014020000_email_login_mfa.sql", import.meta.url), "utf8");
  assert.match(sql, /vault\.create_secret/);
  assert.match(sql, /REVOKE ALL ON public\.email_login_factors.*authenticated/);
  assert.match(sql, /AS RESTRICTIVE FOR ALL TO authenticated/);
  assert.match(sql, /ALTER ROLE authenticator SET pgrst\.db_pre_request/);
  assert.match(sql, /CREATE POLICY email_login_mfa_guard ON storage\.objects/);
  assert.match(sql, /previous_call/);
  assert.match(sql, /lim\.attempts>=10/);
});
