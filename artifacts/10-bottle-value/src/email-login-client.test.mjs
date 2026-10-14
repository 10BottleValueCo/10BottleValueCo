import { test } from "node:test";
import assert from "node:assert/strict";
import { prepareEmailSignInCode } from "./email-login-client.js";

const challenge = () => ({
  id: "test-challenge",
  purpose: "login",
  expiresAt: new Date(Date.now() + 600000).toISOString(),
  resendAt: new Date(Date.now() + 60000).toISOString(),
});
const reply = (value, status = 200) => new Response(JSON.stringify(value), { status });

test("automatically sends once when simultaneous effects prepare the same session", async () => {
  const original = globalThis.fetch;
  const methods = [];
  globalThis.fetch = async (_url, options) => {
    methods.push(options.method);
    if (options.method === "GET") return reply({ ok: true, challenge: null });
    assert.deepEqual(JSON.parse(options.body), { action: "send", purpose: "login" });
    return reply({ ok: true, challenge: challenge() });
  };
  try {
    const first = prepareEmailSignInCode("fixture-session-1");
    const replay = prepareEmailSignInCode("fixture-session-1");
    assert.equal(first, replay);
    assert.equal((await first).id, "test-challenge");
    assert.deepEqual(methods, ["GET", "POST"]);
  } finally { globalThis.fetch = original; }
});

test("resumes the delivered login code after remount without another email", async () => {
  const original = globalThis.fetch;
  let requests = 0;
  const existing = challenge();
  globalThis.fetch = async (_url, options) => {
    requests++;
    assert.equal(options.method, "GET");
    return reply({ ok: true, challenge: existing });
  };
  try {
    assert.deepEqual(await prepareEmailSignInCode("fixture-session-2"), existing);
    assert.equal(requests, 1);
  } finally { globalThis.fetch = original; }
});

test("expired or different-purpose codes are not reused for sign-in", async () => {
  const original = globalThis.fetch;
  let sends = 0;
  let mode = "different-purpose";
  globalThis.fetch = async (_url, options) => {
    if (options.method === "GET") return reply({
      ok: true,
      challenge: mode === "different-purpose"
        ? { ...challenge(), purpose: "disable" }
        : { ...challenge(), expiresAt: new Date(Date.now() - 1000).toISOString() },
    });
    sends++;
    return reply({ ok: true, challenge: challenge() });
  };
  try {
    await prepareEmailSignInCode("fixture-session-3");
    mode = "expired";
    await prepareEmailSignInCode("fixture-session-5");
    assert.equal(sends, 2);
  } finally { globalThis.fetch = original; }
});

test("a delivery failure stays explicit and permits a later retry", async () => {
  const original = globalThis.fetch;
  let posts = 0;
  globalThis.fetch = async (_url, options) => {
    if (options.method === "GET") return reply({ ok: true, challenge: null });
    if (++posts === 1) return reply({ ok: false, error: "Mail delivery failed." }, 503);
    return reply({ ok: true, challenge: challenge() });
  };
  try {
    await assert.rejects(prepareEmailSignInCode("fixture-session-4"), /Mail delivery failed/);
    assert.equal((await prepareEmailSignInCode("fixture-session-4")).id, "test-challenge");
    assert.equal(posts, 2);
  } finally { globalThis.fetch = original; }
});
