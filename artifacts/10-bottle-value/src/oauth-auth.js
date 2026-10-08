import {
  productWarehouse,
  resolveProductSelection,
} from "./product-selection.js";

export const OAUTH_RETURN_KEY = "tbv-oauth-return";
export const OAUTH_RETURN_MAX_AGE_MS = 15 * 60 * 1000;
const PROVIDERS = ["google", "apple"];
const isRecord = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

export function enabledOAuthProviders(env = {}) {
  if (!env.VITE_SUPABASE_URL || !env.VITE_SUPABASE_ANON_KEY) return [];
  return PROVIDERS.filter(
    (provider) => env[`VITE_AUTH_${provider.toUpperCase()}_ENABLED`] === "true",
  );
}

export function oauthRedirectUrl(origin) {
  const url = new URL(origin);
  if (!["https:", "http:"].includes(url.protocol) || url.origin !== origin)
    throw new Error("Sign-in is not configured for this website.");
  // Supabase must allow this exact same-origin URL. Never accept a return URL
  // from query parameters, product data, browser storage, or a caller's form.
  return `${url.origin}/?auth_return=1`;
}

// Capture only callback status before the SDK removes URL credentials. Never
// retain access/refresh tokens or the provider's untrusted error description.
export function captureOAuthCallback(location) {
  const query = new URLSearchParams(location?.search || "");
  const hash = new URLSearchParams(
    String(location?.hash || "").replace(/^#/, ""),
  );
  return {
    marked: query.get("auth_return") === "1",
    failed: ["error", "error_code", "error_description"].some(
      (key) => query.has(key) || hash.has(key),
    ),
    recovery: query.get("recovery") === "1" || hash.get("type") === "recovery",
    // The current browser client uses Supabase's implicit flow. A query-only
    // PKCE code is not proof of a handled callback without a stored verifier.
    hasCredentials: Boolean(hash.get("access_token")),
  };
}

function canonicalCart(cart, catalog) {
  if (!Array.isArray(cart) || cart.length > 100)
    throw new Error("Your cart could not be preserved. Please retry sign-in.");
  return cart.map((item) => {
    if (
      !isRecord(item) ||
      !Number.isInteger(item.quantity) ||
      item.quantity < 1 ||
      item.quantity > 50
    )
      throw new Error("Check the quantities in your cart before signing in.");
    if (
      ![undefined, "", "worldwide", "us"].includes(item.fromWarehouse) ||
      ![undefined, "", "worldwide", "us"].includes(item.warehouse)
    )
      throw new Error(
        "A product warehouse could not be restored. Please review your cart.",
      );
    const product = resolveProductSelection(
      catalog,
      item,
      productWarehouse(item),
    );
    if (!product)
      throw new Error(
        "A product in your cart is no longer available. Please review your cart.",
      );
    return { ...product, quantity: item.quantity };
  });
}

function selectors(cart) {
  return cart.map((item) => ({
    name: item.name,
    dose: item.dose,
    quantity: item.quantity,
    ...(item.noteLabel ? { noteLabel: item.noteLabel } : {}),
    ...(Number(item.vials || 10) !== 10 ? { vials: Number(item.vials) } : {}),
    ...(productWarehouse(item) === "us" ? { fromWarehouse: "us" } : {}),
  }));
}

export function clearOAuthReturn(storage) {
  try {
    storage?.removeItem(OAUTH_RETURN_KEY);
  } catch {
    /* Read-only storage cannot retain a new intent. */
  }
}

export function readOAuthReturn({
  storage,
  callback,
  catalog,
  now = Date.now(),
}) {
  if (callback?.recovery) return { status: "none", cart: [] };
  let intent;
  try {
    const raw = storage.getItem(OAUTH_RETURN_KEY);
    if (typeof raw !== "string" || raw.length > 40_000)
      throw new Error("Invalid intent");
    intent = JSON.parse(raw);
    if (
      !isRecord(intent) ||
      intent.version !== 1 ||
      !PROVIDERS.includes(intent.provider) ||
      !["account", "cart"].includes(intent.returnTo) ||
      !Number.isFinite(intent.createdAt) ||
      intent.createdAt > now ||
      now - intent.createdAt > OAUTH_RETURN_MAX_AGE_MS
    )
      throw new Error("Expired intent");
    const cart = canonicalCart(intent.items, catalog);
    return {
      status:
        callback?.marked && callback.hasCredentials && !callback.failed
          ? "pending"
          : "cancelled",
      initialized: false,
      provider: intent.provider,
      returnTo: intent.returnTo,
      cart,
    };
  } catch {
    return { status: callback?.marked ? "failed" : "none", cart: [] };
  }
}

export function confirmedOAuthReturnPage(state, session) {
  const user = session?.user;
  if (
    state?.status !== "pending" ||
    state.initialized !== true ||
    !session?.access_token ||
    !user?.id ||
    typeof user.email !== "string" ||
    !user.email.trim() ||
    !(user.email_confirmed_at || user.confirmed_at)
  )
    return null;
  return state.returnTo === "cart" && state.cart.length > 0
    ? "cart"
    : "account";
}

export async function startOAuthSignIn({
  supabase,
  provider,
  enabledProviders,
  supabaseUrl,
  origin,
  storage,
  catalog,
  cart,
  returnTo = "account",
  navigate,
  now = Date.now(),
}) {
  if (!PROVIDERS.includes(provider) || !enabledProviders.includes(provider))
    throw new Error(
      "This sign-in option is not available. Please choose another method.",
    );
  const redirectTo = oauthRedirectUrl(origin);
  const intent = {
    version: 1,
    provider,
    createdAt: now,
    returnTo: returnTo === "cart" ? "cart" : "account",
    items: selectors(canonicalCart(cart, catalog)),
  };
  try {
    storage.setItem(OAUTH_RETURN_KEY, JSON.stringify(intent));
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (error) throw error;
    const url = new URL(data?.url);
    const expected = new URL(
      `${String(supabaseUrl).replace(/\/$/, "")}/auth/v1/authorize`,
    );
    if (
      !["https:", "http:"].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.origin !== expected.origin ||
      url.pathname !== expected.pathname ||
      url.searchParams.get("provider") !== provider ||
      url.searchParams.get("redirect_to") !== redirectTo
    )
      throw new Error(
        "The sign-in redirect was invalid. Please choose another method.",
      );
    navigate(url.href);
  } catch (error) {
    clearOAuthReturn(storage);
    throw error;
  }
}
