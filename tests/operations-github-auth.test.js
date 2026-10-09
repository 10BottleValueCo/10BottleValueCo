import test from "node:test";
import assert from "node:assert/strict";
import { operationsGithubSignInUrl } from "../artifacts/10-bottle-value/src/operations-auth.js";

const supabaseUrl = "https://database.example.invalid";
const redirectTo = "https://10bottlevalue.co/operations";
const target = `${supabaseUrl}/auth/v1/authorize?provider=github&redirect_to=${encodeURIComponent(redirectTo)}`;
const options = { enabled: true, supabaseUrl };
const client = result => ({ auth: { signInWithOAuth: async () => result } });
const success = url => ({ data: { provider: "github", url }, error: null });

test("GitHub rollout defaults off and never starts an OAuth request", async () => {
  let called = false;
  await assert.rejects(operationsGithubSignInUrl({ auth: { signInWithOAuth() { called = true; } } }, { supabaseUrl }));
  assert.equal(called, false);
});

test("GitHub sign-in requests identity only and returns to the exact Operations route", async () => {
  const result = await operationsGithubSignInUrl({ auth: { async signInWithOAuth(input) {
    assert.deepEqual(input, { provider: "github", options: { redirectTo, scopes: "user:email", skipBrowserRedirect: true } });
    return success(target);
  } } }, options);
  assert.equal(result, target);
});

test("provider failures, unexpected destinations and modified callbacks fail closed", async () => {
  for (const result of [null, { error: new Error("synthetic failure") }, success("javascript:alert(1)"),
    success(target.replace(supabaseUrl, "https://untrusted.example.invalid")),
    success(target.replace("/auth/v1/authorize", "/other")), success(target.replace("provider=github", "provider=other")),
    success(target.replace(encodeURIComponent(redirectTo), encodeURIComponent("https://untrusted.example.invalid/"))),
    success(target.replace("https://", "https://user:pass@")), { data: { provider: "other", url: target } }]) {
    await assert.rejects(operationsGithubSignInUrl(client(result), options));
  }
  await assert.rejects(operationsGithubSignInUrl(client(success(target)), { ...options, supabaseUrl: "http://database.example.invalid" }));
});

test("a stalled provider result times out without any browser navigation", async () => {
  await assert.rejects(operationsGithubSignInUrl({ auth: { signInWithOAuth: () => new Promise(() => {}) } }, { ...options, timeoutMs: 5 }), e => e.code === "unavailable");
});
