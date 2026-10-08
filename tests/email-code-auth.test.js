import assert from "node:assert/strict";
import { test } from "node:test";
import {
  requestEmailCode,
  confirmEmailCode,
  emailCodeWaitSeconds,
  isEmailCodeRateLimit,
} from "../artifacts/10-bottle-value/src/email-code-auth.js";

function fixture(overrides = {}) {
  const calls = [];
  const user = {
    id: "fixture-id",
    email: "person@example.test",
    email_confirmed_at: "2026-10-07T00:00:00Z",
  };
  return {
    calls,
    user,
    supabase: {
      auth: {
        signInWithOtp: async (args) => {
          calls.push(args);
          return { data: { user: null, session: null }, error: null };
        },
        verifyOtp: async (args) => {
          calls.push(args);
          return {
            data: { user, session: { access_token: "fixture-token", user } },
            error: null,
          };
        },
        signOut: async () => {
          calls.push("signed-out");
        },
        ...overrides,
      },
    },
  };
}

test("email sign-in cannot create accounts or change referral metadata", async () => {
  const f = fixture();
  await requestEmailCode({
    ...f,
    email: " Person@Example.Test ",
    mode: "signin",
    affiliateCode: "OTHER",
  });
  assert.deepEqual(f.calls, [
    { email: "person@example.test", options: { shouldCreateUser: false } },
  ]);
});

test("explicit registration creates users with the selected referral metadata", async () => {
  const f = fixture();
  await requestEmailCode({
    ...f,
    email: f.user.email,
    mode: "create",
    affiliateCode: " fixture ",
  });
  assert.equal(f.calls[0].options.shouldCreateUser, true);
  assert.equal(f.calls[0].options.data.affiliateCode, "FIXTURE");
  assert.ok(Date.parse(f.calls[0].options.data.promoLockedAt));
});

test("invalid entry modes and addresses fail before an auth request", async () => {
  const f = fixture();
  await assert.rejects(
    requestEmailCode({ ...f, email: f.user.email, mode: "reset" }),
  );
  await assert.rejects(
    requestEmailCode({ ...f, email: "invalid", mode: "create" }),
  );
  assert.equal(f.calls.length, 0);
});

test("email and existing signup codes use their corresponding Supabase OTP types", async () => {
  for (const type of ["email", "signup"]) {
    const f = fixture();
    const result = await confirmEmailCode({
      ...f,
      email: f.user.email,
      token: "123456",
      type,
    });
    assert.equal(result.id, f.user.id);
    assert.deepEqual(f.calls[0], {
      email: f.user.email,
      token: "123456",
      type,
    });
  }
});

test("a code cannot accept an unconfirmed user, missing session, or different identity", async () => {
  for (const kind of [
    "no-session",
    "no-token",
    "unconfirmed",
    "wrong-email",
    "wrong-session-user",
  ]) {
    const f = fixture();
    const user = { ...f.user };
    const sessionUser = { ...user };
    if (kind === "unconfirmed") delete user.email_confirmed_at;
    if (kind === "wrong-email") user.email = "other@example.test";
    if (kind === "wrong-session-user") sessionUser.id = "another-id";
    f.supabase.auth.verifyOtp = async () => ({
      data: {
        user,
        session:
          kind === "no-session"
            ? null
            : {
                user: sessionUser,
                access_token: kind === "no-token" ? "" : "fixture",
              },
      },
      error: null,
    });
    await assert.rejects(
      confirmEmailCode({ ...f, email: f.user.email, token: "123456" }),
    );
    assert.deepEqual(f.calls, ["signed-out"]);
  }
});

test("invalid/expired codes preserve the auth error without accepting a user", async () => {
  const problem = { message: "Token has expired", status: 403 };
  const f = fixture({
    verifyOtp: async () => ({ data: null, error: problem }),
  });
  await assert.rejects(
    confirmEmailCode({ ...f, email: f.user.email, token: "123456" }),
    (error) => error === problem,
  );
  await assert.rejects(
    confirmEmailCode({ ...f, email: f.user.email, token: "abc" }),
  );
});

test("resend cooldown is bound to the same email and expires without negative seconds", () => {
  const cooldown = { email: "PERSON@example.test", until: 61000 };
  assert.equal(emailCodeWaitSeconds(cooldown, "person@example.test", 1001), 60);
  assert.equal(emailCodeWaitSeconds(cooldown, "other@example.test", 1001), 0);
  assert.equal(emailCodeWaitSeconds(cooldown, "person@example.test", 62000), 0);
  assert.equal(isEmailCodeRateLimit({ status: 429 }), true);
  assert.equal(
    isEmailCodeRateLimit({ code: "over_email_send_rate_limit" }),
    true,
  );
  assert.equal(isEmailCodeRateLimit({ message: "Invalid credentials" }), false);
});
