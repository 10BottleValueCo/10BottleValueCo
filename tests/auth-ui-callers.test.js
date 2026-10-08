import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { createRequire } from "node:module";
import {
  requestEmailCode,
  confirmEmailCode,
  emailCodeWaitSeconds,
  isEmailCodeRateLimit,
} from "../artifacts/10-bottle-value/src/email-code-auth.js";
import {
  startOAuthSignIn,
  clearOAuthReturn,
  confirmedOAuthReturnPage,
} from "../artifacts/10-bottle-value/src/oauth-auth.js";

const require = createRequire(
  new URL("../artifacts/10-bottle-value/package.json", import.meta.url),
);
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");

const source = ts.createSourceFile(
  "App.jsx",
  fs.readFileSync(
    new URL("../artifacts/10-bottle-value/src/App.jsx", import.meta.url),
    "utf8",
  ),
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.JSX,
);
const functions = new Map();
const effects = new Map();
let authForm, providerControls, defaultMethod;
function visit(node) {
  if (ts.isFunctionDeclaration(node))
    functions.set(node.name?.text, node.getText(source));
  if (
    ts.isVariableDeclaration(node) &&
    node.name.getText(source) === "loadInitialSession"
  )
    functions.set("loadInitialSession", node.initializer.getText(source));
  if (
    ts.isVariableDeclaration(node) &&
    node.name.getText(source) === "defaultAuthMethod"
  )
    defaultMethod = node.initializer.getText(source);
  if (
    ts.isCallExpression(node) &&
    node.expression.getText(source) === "useEffect"
  ) {
    const callback = node.arguments[0]?.getText(source) || "";
    if (callback.includes("cartHydratedFor !== normalizeEmail"))
      effects.set("saveCart", callback);
    if (
      callback.includes(
        "const savedCart = data?.user?.user_metadata?.savedCart",
      )
    )
      effects.set("hydrateCart", callback);
  }
  if (
    ts.isJsxElement(node) &&
    node.openingElement.tagName.getText(source) === "form" &&
    node.openingElement.attributes
      .getText(source)
      .includes("onSubmit={handleAccountSubmit}")
  )
    authForm = node.getText(source);
  if (
    ts.isJsxExpression(node) &&
    node.expression?.getText(source).includes("configuredOAuthProviders.map")
  ) {
    const candidate = node.expression.getText(source);
    if (!providerControls || candidate.length < providerControls.length)
      providerControls = candidate;
  }
  ts.forEachChild(node, visit);
}
visit(source);

const user = {
  id: "fixture-user",
  email: "fixture@example.invalid",
  email_confirmed_at: "2026-10-08T00:00:00Z",
  user_metadata: {},
};
const verifiedSession = { access_token: "synthetic-token", user };
function fixture({
  codeEnabled = true,
  mode = "signin",
  method,
  password = "",
  oauthStatus = "none",
} = {}) {
  const values = {},
    calls = [],
    storageValues = new Map();
  const storage = {
    getItem: (key) => storageValues.get(key) ?? null,
    setItem: (key, value) => storageValues.set(key, value),
    removeItem: (key) => storageValues.delete(key),
  };
  const scope = {
    React,
    tx: (text) => text,
    t: (text) => text,
    authMethod:
      method ||
      vm.runInNewContext(defaultMethod, { emailCodeAuthEnabled: codeEnabled }),
    emailCodeAuthEnabled: codeEnabled,
    authMode: mode,
    accountForm: { email: user.email, password, confirmPassword: password },
    accountPromoCodeInput: "",
    getResolvedAffiliateCode: () => "",
    affiliateProfiles: [],
    emailCodeCooldown: { email: "", until: 0 },
    emailCodeWait: 0,
    activeAffiliateCode: "",
    browserAffiliateCode: "",
    appliedPromo: null,
    requestEmailCode,
    confirmEmailCode,
    emailCodeWaitSeconds,
    isEmailCodeRateLimit,
    startOAuthSignIn,
    clearOAuthReturn,
    confirmedOAuthReturnPage,
    accountAuthBusyRef: { current: false },
    accountAuthBusy: false,
    signupVerificationBusyRef: { current: false },
    requireSignupVerificationRef: { current: false },
    signupVerificationEmail: user.email,
    signupVerificationCode: "123456",
    verificationKind: "email",
    oauthReturnRef: {
      current: {
        status: oauthStatus,
        initialized: false,
        provider: "google",
        returnTo: "cart",
        cart: [{ name: "Fixture", dose: "5 mg", quantity: 2 }],
      },
    },
    configuredOAuthProviders: ["google"],
    authSupabaseUrl: "https://project.supabase.invalid",
    PRODUCTS_BASE: [{ name: "Fixture", dose: "5 mg", price: 50 }],
    cart: [{ name: "Fixture", dose: "5 mg", price: 50, quantity: 2 }],
    pendingCheckoutAfterAuth: true,
    sessionStorage: storage,
    localStorage: storage,
    window: {
      location: {
        origin: "https://shop.invalid",
        assign: (value) => calls.push(["navigate", value]),
      },
      history: {
        replaceState: (_, __, value) => calls.push(["history", value]),
      },
      setTimeout,
    },
    track: (event, meta) => calls.push(["track", event, meta]),
    startEmailCodeCooldown: (email) => calls.push(["cooldown", email]),
    userFromSupabase: (value) => ({
      email: value.email,
      affiliateCode: value.user_metadata?.affiliateCode || "",
    }),
    syncUserPaidOrders: () => {},
    fetchUserPromos: () => {},
    loadStoreCredit: () => {},
    normalizeEmail: (email) =>
      String(email || "")
        .trim()
        .toLowerCase(),
    clearPrivateAccountView: () => calls.push(["clear-private"]),
    currentUser: { email: user.email },
    cartHydratedFor: "",
    privateAccountState: { capture: () => 1, isCurrent: () => true },
    migrateCartItem: (item) => item,
    getProductId: (item) =>
      `${item.name}|${item.dose}|${item.fromWarehouse || ""}`,
    showAccountPassword: false,
    showAccountConfirmPassword: false,
    Mail: () => null,
    LockKeyhole: () => null,
    EyeOff: () => null,
    Eye: () => null,
    Tag: () => null,
    ArrowRight: () => null,
    supabase: {
      auth: {
        initialize: async () => {
          calls.push(["initialize"]);
          return { error: null };
        },
        getSession: async () => {
          calls.push(["getSession"]);
          return { data: { session: verifiedSession }, error: null };
        },
        signInWithOtp: async (args) => {
          calls.push(["otp", args]);
          return { data: { user: null, session: null }, error: null };
        },
        verifyOtp: async (args) => {
          calls.push(["verify", args]);
          return { data: { user, session: verifiedSession }, error: null };
        },
        signInWithPassword: async (args) => {
          calls.push(["password", args]);
          return { data: { user, session: verifiedSession }, error: null };
        },
        signUp: async (args) => {
          calls.push(["signup", args]);
          return { data: { user, session: null }, error: null };
        },
        signInWithOAuth: async (args) => {
          calls.push(["oauth", args]);
          return {
            data: {
              url: `https://project.supabase.invalid/auth/v1/authorize?provider=${args.provider}&redirect_to=${encodeURIComponent(args.options.redirectTo)}`,
            },
            error: null,
          };
        },
        updateUser: async (args) => {
          calls.push(["updateUser", args]);
          return { error: null };
        },
        signOut: async () => {
          calls.push(["signOut"]);
          return { error: null };
        },
      },
    },
  };
  for (const name of [
    "AccountMessage",
    "AccountAuthBusy",
    "RecoverySession",
    "VerificationKind",
    "VerificationEntryMode",
    "SignupVerificationEmail",
    "SignupVerificationCode",
    "PendingRegistrationPromoCode",
    "AccountForm",
    "AuthMode",
    "AuthMethod",
    "CurrentUser",
    "AccountPromoCodeInput",
    "ActiveAffiliateCode",
    "PendingCheckoutAfterAuth",
    "Page",
    "SignupVerificationBusy",
    "UserOrders",
    "CheckoutForm",
    "CheckoutMessage",
    "CheckoutErrors",
    "IsEditingProfile",
    "ShowAccountPassword",
    "ShowAccountConfirmPassword",
  ])
    scope[`set${name}`] = (value) => {
      values[name] =
        typeof value === "function"
          ? value(scope[name[0].toLowerCase() + name.slice(1)] || {})
          : value;
    };
  const context = vm.createContext(scope);
  for (const name of [
    "oauthNotCompletedMessage",
    "finishOAuthCallback",
    "handleOAuthSignIn",
    "submitAccountCredentials",
    "handleAccountSubmit",
    "handleSignupVerificationSubmit",
    "handleSignOut",
    "loadInitialSession",
  ])
    scope[name] = vm.runInContext(`(${functions.get(name)})`, context);
  scope.setCart = (update) => {
    scope.cart = typeof update === "function" ? update(scope.cart) : update;
  };
  scope.setCartHydratedFor = (value) => {
    scope.cartHydratedFor = value;
  };
  for (const [name, effect] of effects)
    scope[name] = vm.runInContext(`(${effect})`, context);
  return { scope, values, calls, storageValues, context };
}

function render(expression, f) {
  const js = ts.transpileModule(`(() => (${expression}))`, {
    compilerOptions: {
      jsx: ts.JsxEmit.React,
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.None,
    },
  }).outputText;
  return renderToStaticMarkup(vm.runInContext(js, f.context)());
}

test("configured email-code default renders and submits signin/create without any password", async () => {
  for (const mode of ["signin", "create"]) {
    const f = fixture({ mode });
    const html = render(authForm, f);
    assert.doesNotMatch(html, /type="password"/);
    assert.match(html, /No password needed/);
    await f.scope.handleAccountSubmit({ preventDefault() {} });
    const otp = f.calls.find(([kind]) => kind === "otp");
    assert.equal(otp[1].options.shouldCreateUser, mode === "create");
    assert.equal(f.values.AuthMode, "verify");
    assert.equal(f.values.VerificationKind, "email");
    assert.equal(f.values.CurrentUser, undefined);
    assert.equal(f.values.Page, undefined);
    assert.equal(f.values.AccountAuthBusy, false);
  }
});

test("email-code release gate falls back to working existing password signin/create", async () => {
  for (const mode of ["signin", "create"]) {
    const f = fixture({
      codeEnabled: false,
      mode,
      password: "synthetic-password",
    });
    const html = render(authForm, f);
    assert.equal(
      (html.match(/type="password"/g) || []).length,
      mode === "create" ? 2 : 1,
    );
    assert.doesNotMatch(html, /No password needed/);
    await f.scope.handleAccountSubmit({ preventDefault() {} });
    assert.ok(
      f.calls.some(
        ([kind]) => kind === (mode === "create" ? "signup" : "password"),
      ),
    );
    assert.equal(
      f.calls.some(([kind]) => kind === "otp"),
      false,
    );
    if (mode === "create") assert.equal(f.values.VerificationKind, "signup");
    else {
      assert.equal(f.values.CurrentUser.email, user.email);
      assert.equal(f.values.Page, "cart");
    }
  }
});

test("explicit password remains available when email code is enabled", async () => {
  const f = fixture({ method: "password", password: "synthetic-password" });
  await f.scope.handleAccountSubmit({ preventDefault() {} });
  assert.ok(f.calls.some(([kind]) => kind === "password"));
  assert.equal(f.values.Page, "cart");
});

test("verified email code resumes the preserved checkout and rejects expired code without account state", async () => {
  const f = fixture();
  await f.scope.handleSignupVerificationSubmit({ preventDefault() {} });
  assert.equal(f.values.CurrentUser.email, user.email);
  assert.equal(f.values.Page, "cart");
  assert.equal(f.scope.cart.length, 1);
  assert.equal(f.values.PendingCheckoutAfterAuth, false);
  const bad = fixture();
  bad.scope.supabase.auth.verifyOtp = async () => ({
    data: null,
    error: new Error("Code expired"),
  });
  await bad.scope.handleSignupVerificationSubmit({ preventDefault() {} });
  assert.equal(bad.values.CurrentUser, undefined);
  assert.equal(bad.values.Page, undefined);
  assert.match(bad.values.AccountMessage, /expired/);
  assert.equal(bad.values.SignupVerificationBusy, false);
});

test("social controls render only explicitly enabled providers", () => {
  const f = fixture();
  f.scope.configuredOAuthProviders = [];
  assert.equal(render(providerControls, f), "");
  f.scope.configuredOAuthProviders = ["google"];
  assert.match(render(providerControls, f), /Continue with Google/);
  assert.doesNotMatch(render(providerControls, f), /Continue with Apple/);
});

test("actual OAuth handler preserves checkout, clears recovery intent and unlocks on provider failure", async () => {
  const f = fixture();
  for (const key of ["tbv-pw-recovery", "tbv-recovery-at", "tbv-recovery-rt"])
    f.storageValues.set(key, "synthetic");
  await f.scope.handleOAuthSignIn("google");
  assert.ok(f.calls.some(([kind]) => kind === "oauth"));
  assert.ok(f.calls.some(([kind]) => kind === "navigate"));
  assert.equal(f.values.CurrentUser, undefined);
  assert.equal(f.values.Page, undefined);
  assert.equal(
    JSON.parse(f.storageValues.get("tbv-oauth-return")).returnTo,
    "cart",
  );
  assert.equal(f.storageValues.has("tbv-pw-recovery"), false);
  assert.equal(f.scope.requireSignupVerificationRef.current, false);
  const bad = fixture();
  bad.scope.supabase.auth.signInWithOAuth = async () => ({
    data: null,
    error: new Error("Unavailable"),
  });
  await bad.scope.handleOAuthSignIn("google");
  assert.match(bad.values.AccountMessage, /Unavailable/);
  assert.equal(bad.values.AccountAuthBusy, false);
  assert.equal(bad.storageValues.has("tbv-oauth-return"), false);
  assert.equal(
    bad.calls.some(([kind]) => kind === "navigate"),
    false,
  );
});

test("actual callback waits for SDK initialization and consumes one confirmed return without starting payment", async () => {
  const f = fixture({ oauthStatus: "pending" });
  assert.equal(f.scope.finishOAuthCallback(verifiedSession), true);
  assert.equal(f.values.Page, undefined);
  await f.scope.loadInitialSession();
  assert.equal(f.scope.oauthReturnRef.current.initialized, true);
  assert.equal(f.scope.finishOAuthCallback(verifiedSession, true), false);
  assert.equal(f.values.Page, "cart");
  assert.equal(f.scope.oauthReturnRef.current.status, "complete");
  const verified = f.calls.filter(
    ([, event]) => event === "auth_verified",
  ).length;
  f.scope.finishOAuthCallback(verifiedSession);
  assert.equal(
    f.calls.filter(([, event]) => event === "auth_verified").length,
    verified,
  );
  assert.equal(
    f.calls.some(([kind]) => ["navigate", "updateUser"].includes(kind)),
    false,
  );
});

test("SDK redirect failure and cancellation cannot resume using a preserved older session", async () => {
  const f = fixture({ oauthStatus: "pending", codeEnabled: false });
  f.scope.supabase.auth.initialize = async () => ({
    error: new Error("Expired callback token"),
  });
  await assert.rejects(f.scope.loadInitialSession(), /Expired/);
  assert.equal(
    f.calls.some(([kind]) => kind === "getSession"),
    false,
  );
  f.scope.finishOAuthCallback(null, true);
  assert.equal(f.scope.oauthReturnRef.current.status, "failed");
  assert.equal(f.values.Page, "account");
  assert.match(f.values.AccountMessage, /email and password/);
  assert.doesNotMatch(f.values.AccountMessage, /email code/);
  f.values.Page = undefined;
  f.scope.finishOAuthCallback(verifiedSession);
  assert.equal(f.values.Page, undefined);
  const cancelled = fixture({ oauthStatus: "cancelled" });
  cancelled.scope.finishOAuthCallback(verifiedSession, true);
  assert.equal(cancelled.values.Page, undefined);
  assert.equal(cancelled.values.PendingCheckoutAfterAuth, undefined);
});

test("signout cannot overwrite a cart whose account hydration has not completed", async () => {
  const f = fixture();
  await f.scope.handleSignOut();
  assert.equal(
    f.calls.some(([kind]) => kind === "updateUser"),
    false,
  );
  assert.ok(f.calls.some(([kind]) => kind === "signOut"));
  const hydrated = fixture();
  hydrated.scope.cartHydratedFor = user.email;
  hydrated.scope.supabase.auth.updateUser = async () => {
    throw new Error("Network unavailable");
  };
  await hydrated.scope.handleSignOut();
  assert.ok(hydrated.calls.some(([kind]) => kind === "signOut"));
});

test("actual cart effects wait for account hydration and preserve OAuth quantities before saving", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const f = fixture();
  let resolveUser;
  f.scope.window.setTimeout = setTimeout;
  f.scope.window.clearTimeout = clearTimeout;
  f.scope.supabase.auth.getUser = () =>
    new Promise((resolve) => {
      resolveUser = resolve;
    });
  const cleanup = f.scope.hydrateCart();
  f.scope.saveCart();
  t.mock.timers.tick(1500);
  assert.equal(
    f.calls.some(([kind]) => kind === "updateUser"),
    false,
  );
  resolveUser({
    data: {
      user: {
        ...user,
        user_metadata: {
          savedCart: [
            { name: "Fixture", dose: "5 mg", quantity: 9 },
            { name: "Saved", dose: "10 mg", quantity: 3 },
          ],
        },
      },
    },
    error: null,
  });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(f.scope.cartHydratedFor, user.email);
  assert.equal(
    f.scope.cart.find((item) => item.name === "Fixture").quantity,
    2,
  );
  assert.equal(f.scope.cart.find((item) => item.name === "Saved").quantity, 3);
  const stopSave = f.scope.saveCart();
  t.mock.timers.tick(1000);
  const saved = f.calls.find(([kind]) => kind === "updateUser");
  assert.equal(saved[1].data.savedCart.length, 2);
  cleanup();
  stopSave();
});

test("failed, foreign or stale cart reads never enable persistence", async () => {
  for (const kind of ["failed", "foreign", "stale"]) {
    const f = fixture();
    if (kind === "stale") f.scope.privateAccountState.isCurrent = () => false;
    f.scope.supabase.auth.getUser = async () => ({
      data: {
        user: {
          ...user,
          email: kind === "foreign" ? "other@example.invalid" : user.email,
        },
      },
      error: kind === "failed" ? new Error("Unavailable") : null,
    });
    const cleanup = f.scope.hydrateCart();
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(f.scope.cartHydratedFor, "");
    assert.equal(f.scope.saveCart(), undefined);
    assert.equal(
      f.calls.some(([call]) => call === "updateUser"),
      false,
    );
    cleanup();
  }
});
