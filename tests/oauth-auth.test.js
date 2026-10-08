import test from "node:test";
import assert from "node:assert/strict";
import {
  enabledOAuthProviders,
  oauthRedirectUrl,
  captureOAuthCallback,
  readOAuthReturn,
  confirmedOAuthReturnPage,
  startOAuthSignIn,
  OAUTH_RETURN_KEY,
  OAUTH_RETURN_MAX_AGE_MS,
} from "../artifacts/10-bottle-value/src/oauth-auth.js";
import { isEmailCodeEnabled } from "../artifacts/10-bottle-value/src/email-code-auth.js";

const catalog = [
  { name: "Fixture", dose: "5 mg", price: 50 },
  { name: "Fixture", dose: "5 mg", price: 70, warehouse: "us" },
  { name: "Fixture", dose: "5 mg", price: 80, noteLabel: "with DAC" },
  { name: "Fixture", dose: "5 mg", price: 10, vials: 1 },
];
const session = {
  access_token: "synthetic-token",
  user: {
    id: "fixture-owner",
    email: "fixture@example.invalid",
    email_confirmed_at: "2026-10-08T00:00:00Z",
  },
};
const callback = captureOAuthCallback({
  search: "?auth_return=1",
  hash: "#access_token=synthetic",
});
const now = 1_000_000;
function fixture(overrides = {}) {
  const values = new Map();
  const calls = [],
    redirects = [];
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
  const options = {
    provider: "google",
    enabledProviders: ["google", "apple"],
    origin: "https://shop.invalid",
    supabaseUrl: "https://project.supabase.invalid",
    storage,
    catalog,
    now,
    cart: [
      {
        ...catalog[0],
        quantity: 2,
        email: "private@example.invalid",
        price: 0.01,
        status: "paid",
      },
    ],
    returnTo: "cart",
    navigate: (url) => redirects.push(url),
    supabase: {
      auth: {
        signInWithOAuth: async (args) => {
          calls.push(args);
          return {
            data: {
              url: `https://project.supabase.invalid/auth/v1/authorize?provider=${args.provider}&redirect_to=${encodeURIComponent(args.options.redirectTo)}`,
            },
            error: null,
          };
        },
      },
    },
    ...overrides,
  };
  return { options, calls, redirects, storage, values };
}

test("email code and social buttons require explicit true release flags and a configured auth client", () => {
  const base = {
    VITE_SUPABASE_URL: "https://project.supabase.invalid",
    VITE_SUPABASE_ANON_KEY: "public-fixture",
  };
  assert.deepEqual(enabledOAuthProviders(base), []);
  assert.equal(isEmailCodeEnabled(base), false);
  for (const value of [true, "1", "TRUE", "false", ""]) {
    assert.deepEqual(
      enabledOAuthProviders({ ...base, VITE_AUTH_GOOGLE_ENABLED: value }),
      [],
    );
    assert.equal(
      isEmailCodeEnabled({ ...base, VITE_AUTH_EMAIL_CODE_ENABLED: value }),
      false,
    );
  }
  assert.deepEqual(
    enabledOAuthProviders({
      ...base,
      VITE_AUTH_GOOGLE_ENABLED: "true",
      VITE_AUTH_APPLE_ENABLED: "true",
    }),
    ["google", "apple"],
  );
  assert.equal(
    isEmailCodeEnabled({ ...base, VITE_AUTH_EMAIL_CODE_ENABLED: "true" }),
    true,
  );
  assert.equal(
    isEmailCodeEnabled({ VITE_AUTH_EMAIL_CODE_ENABLED: "true" }),
    false,
  );
});

test("real OAuth call uses a fixed callback and saves selectors without contact, token, price or paid state", async () => {
  const f = fixture();
  await startOAuthSignIn(f.options);
  assert.deepEqual(f.calls, [
    {
      provider: "google",
      options: {
        redirectTo: "https://shop.invalid/?auth_return=1",
        skipBrowserRedirect: true,
      },
    },
  ]);
  const intent = JSON.parse(f.values.get(OAUTH_RETURN_KEY));
  assert.deepEqual(intent, {
    version: 1,
    provider: "google",
    createdAt: now,
    returnTo: "cart",
    items: [{ name: "Fixture", dose: "5 mg", quantity: 2 }],
  });
  assert.equal(f.redirects.length, 1);
  assert.equal(f.options.cart[0].price, 0.01);
});

test("callback cart is rebuilt from current catalog and retains warehouse, note variant and pack", async () => {
  const f = fixture({
    cart: [
      { ...catalog[1], fromWarehouse: "us", quantity: 2 },
      { ...catalog[2], quantity: 3 },
      { ...catalog[3], quantity: 1 },
    ],
  });
  await startOAuthSignIn(f.options);
  const state = readOAuthReturn({
    storage: f.storage,
    callback,
    catalog: catalog.map((p) => ({ ...p, price: p.price + 20 })),
    now,
  });
  assert.equal(state.status, "pending");
  assert.equal(state.initialized, false);
  assert.deepEqual(
    state.cart.map((p) => [p.quantity, p.price]),
    [
      [2, 95],
      [3, 100],
      [1, 30],
    ],
  );
  assert.equal(state.cart[0].fromWarehouse, "us");
  assert.equal(state.cart[1].noteLabel, "with DAC");
  assert.equal(state.cart[2].vials, 1);
});

test("provider errors and bad redirects remove the temporary intent without navigating", async () => {
  for (const url of [
    "https://foreign.invalid/auth/v1/authorize?provider=google",
    "https://project.supabase.invalid/other?provider=google",
    "https://project.supabase.invalid/auth/v1/authorize?provider=apple",
    "https://project.supabase.invalid/auth/v1/authorize?provider=google&redirect_to=https%3A%2F%2Fforeign.invalid",
  ]) {
    const f = fixture({
      supabase: {
        auth: { signInWithOAuth: async () => ({ data: { url }, error: null }) },
      },
    });
    await assert.rejects(startOAuthSignIn(f.options), /redirect/);
    assert.equal(f.values.has(OAUTH_RETURN_KEY), false);
    assert.equal(f.redirects.length, 0);
  }
  const problem = new Error("Provider unavailable");
  const f = fixture({
    supabase: {
      auth: { signInWithOAuth: async () => ({ data: null, error: problem }) },
    },
  });
  await assert.rejects(
    startOAuthSignIn(f.options),
    (error) => error === problem,
  );
  assert.equal(f.values.has(OAUTH_RETURN_KEY), false);
  assert.equal(f.redirects.length, 0);
});

test("disabled provider, bad cart and unavailable browser storage fail before OAuth", async () => {
  for (const change of [
    { enabledProviders: [] },
    { provider: "unknown" },
    { cart: [{ ...catalog[0], quantity: 51 }] },
    { cart: [{ ...catalog[0], quantity: 1, fromWarehouse: "unknown" }] },
    { cart: [{ name: "Missing", dose: "5 mg", quantity: 1 }] },
    {
      storage: {
        setItem: () => {
          throw new Error("Storage unavailable");
        },
        removeItem: () => {},
      },
    },
  ]) {
    const f = fixture(change);
    await assert.rejects(startOAuthSignIn(f.options));
    assert.equal(f.calls.length, 0);
    assert.equal(f.redirects.length, 0);
  }
});

test("callback origin is fixed and arbitrary destinations are never returned", async () => {
  assert.equal(
    oauthRedirectUrl("https://shop.invalid"),
    "https://shop.invalid/?auth_return=1",
  );
  for (const origin of [
    "javascript:alert(1)",
    "https://shop.invalid/?next=elsewhere",
    "https://user:password@shop.invalid",
    "https://shop.invalid/path",
  ])
    assert.throws(() => oauthRedirectUrl(origin));
  const f = fixture({ returnTo: "https://foreign.invalid" });
  await startOAuthSignIn(f.options);
  assert.equal(
    readOAuthReturn({ storage: f.storage, callback, catalog, now }).returnTo,
    "account",
  );
});

test("cancelled, failed or marker-only callbacks cannot resume an older confirmed session", async () => {
  const f = fixture();
  await startOAuthSignIn(f.options);
  for (const location of [
    { search: "?auth_return=1", hash: "#error=access_denied" },
    { search: "?auth_return=1", hash: "#error_description=Cancelled" },
    {
      search: "?auth_return=1&error_code=failed",
      hash: "#access_token=synthetic",
    },
    { search: "?auth_return=1", hash: "" },
    { search: "", hash: "" },
    { search: "?auth_return=1&code=unverified-pkce", hash: "" },
  ]) {
    const state = readOAuthReturn({
      storage: f.storage,
      callback: captureOAuthCallback(location),
      catalog,
      now,
    });
    assert.equal(state.status, "cancelled");
    assert.equal(state.cart.length, 1);
    assert.equal(
      confirmedOAuthReturnPage({ ...state, initialized: true }, session),
      null,
    );
  }
});

test("password recovery always takes precedence over an abandoned or mixed OAuth return", async () => {
  const f = fixture();
  await startOAuthSignIn(f.options);
  for (const location of [
    { search: "?recovery=1", hash: "#access_token=synthetic" },
    { search: "?auth_return=1&recovery=1", hash: "#access_token=synthetic" },
    { search: "?auth_return=1", hash: "#type=recovery&access_token=synthetic" },
  ]) {
    const state = readOAuthReturn({
      storage: f.storage,
      callback: captureOAuthCallback(location),
      catalog,
      now,
    });
    assert.equal(state.status, "none");
    assert.equal(confirmedOAuthReturnPage(state, session), null);
  }
});

test("missing, expired, future, malformed and changed catalog intents fail closed", async () => {
  const f = fixture();
  await startOAuthSignIn(f.options);
  for (const time of [now - 1, now + OAUTH_RETURN_MAX_AGE_MS + 1])
    assert.equal(
      readOAuthReturn({ storage: f.storage, callback, catalog, now: time })
        .status,
      "failed",
    );
  assert.equal(
    readOAuthReturn({ storage: f.storage, callback, catalog: [], now }).status,
    "failed",
  );
  for (const raw of [
    null,
    "{",
    JSON.stringify({ version: 1 }),
    "x".repeat(40_001),
  ]) {
    f.values.set(OAUTH_RETURN_KEY, raw);
    const state = readOAuthReturn({
      storage: f.storage,
      callback,
      catalog,
      now,
    });
    assert.equal(state.status, "failed");
    assert.deepEqual(state.cart, []);
  }
});

test("checkout resumption requires successful SDK initialization and a confirmed session", async () => {
  const f = fixture();
  await startOAuthSignIn(f.options);
  const state = readOAuthReturn({ storage: f.storage, callback, catalog, now });
  assert.equal(confirmedOAuthReturnPage(state, session), null);
  state.initialized = true;
  assert.equal(confirmedOAuthReturnPage(state, session), "cart");
  for (const invalid of [
    null,
    { ...session, access_token: "" },
    { ...session, user: { ...session.user, id: "" } },
    { ...session, user: { ...session.user, email_confirmed_at: undefined } },
  ])
    assert.equal(confirmedOAuthReturnPage(state, invalid), null);
  state.status = "complete";
  assert.equal(confirmedOAuthReturnPage(state, session), null);
});
