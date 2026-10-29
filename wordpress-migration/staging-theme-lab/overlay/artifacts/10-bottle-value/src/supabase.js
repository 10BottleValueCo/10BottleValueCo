import { saveCheckoutProfile } from "./checkout-details.js";

// WordPress staging: the support inbox (contact_messages) is a real table behind
// tbv-storefront-admin's messages endpoint. The chain is sent as a small query
// description; WordPress decides what the visitor may read or change.
function wordpressTable(table, endpoint, nonce) {
  const query = { table, op: "select", columns: "*", values: null, filters: [], order: null, limit: null, single: false };
  const run = async () => {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", "X-WP-Nonce": nonce },
        body: JSON.stringify(query),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) return { data: null, error: { message: body?.message || `Request failed (${response.status})` } };
      const rows = Array.isArray(body?.data) ? body.data : [];
      return { data: query.single ? rows[0] ?? null : rows, error: null };
    } catch (error) {
      return { data: null, error: { message: error?.message || "Network error" } };
    }
  };
  const chain = {
    select: (columns = "*") => { if (query.op === "select") query.columns = columns; else query.returning = columns; return chain; },
    insert: (values) => { query.op = "insert"; query.values = values; return chain; },
    update: (values) => { query.op = "update"; query.values = values; return chain; },
    delete: () => { query.op = "delete"; return chain; },
    eq: (column, value) => { query.filters.push(["eq", column, value]); return chain; },
    in: (column, values) => { query.filters.push(["in", column, values]); return chain; },
    is: (column, value) => { query.filters.push(["is", column, value]); return chain; },
    not: (column, operator, value) => { query.filters.push(["not", column, operator, value]); return chain; },
    order: (column, options = {}) => { query.order = [column, options.ascending !== false]; return chain; },
    limit: (count) => { query.limit = count; return chain; },
    single: () => { query.single = true; return run(); },
    maybeSingle: () => { query.single = true; return run(); },
    then: (resolve, reject) => run().then(resolve, reject),
    catch: (reject) => run().catch(reject),
  };
  return chain;
}

// Use the real client whenever the artifact has repository credentials. The
// inert fallback keeps the presentation preview mountable without secrets and
// mirrors the async surface App.jsx uses for auth, orders, chat, and storage.
function createPreviewClient() {
  const result = Promise.resolve({ data: [], error: null });
  const query = () => {
    const chain = {
      select: () => chain,
      insert: () => chain,
      update: () => chain,
      upsert: () => chain,
      delete: () => chain,
      eq: () => chain,
      neq: () => chain,
      ilike: () => chain,
      in: () => chain,
      is: () => chain,
      filter: () => chain,
      match: () => chain,
      contains: () => chain,
      gt: () => chain,
      gte: () => chain,
      lt: () => chain,
      lte: () => chain,
      limit: () => chain,
      range: () => chain,
      order: () => chain,
      single: () => Promise.resolve({ data: null, error: null }),
      maybeSingle: () => Promise.resolve({ data: null, error: null }),
      then: (...args) => result.then(...args),
      catch: (...args) => result.catch(...args),
    };
    return chain;
  };

  const messages = typeof window !== "undefined" ? window.TBV_COMMERCE?.messages : null;
  return {
    from: (table) => (table === "contact_messages" && messages?.endpoint ? wordpressTable(table, messages.endpoint, String(messages.nonce || "")) : query()),
    storage: {
      from: () => ({
        upload: async () => ({ data: null, error: null }),
        getPublicUrl: () => ({ data: { publicUrl: "" } }),
      }),
    },
    channel: () => ({
      on: function on() { return this; },
      send: async () => "ok",
      subscribe: (callback) => { callback?.("SUBSCRIBED"); return { unsubscribe: () => {} }; },
    }),
    removeChannel: () => {},
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      getUser: async () => ({ data: { user: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      signInWithPassword: async () => ({ data: { user: null, session: null }, error: { message: "Supabase credentials are not configured." } }),
      signUp: async () => ({ data: { user: null, session: null }, error: { message: "Supabase credentials are not configured." } }),
      verifyOtp: async () => ({ data: { user: null, session: null }, error: { message: "Supabase credentials are not configured." } }),
      resend: async () => ({ data: null, error: { message: "Supabase credentials are not configured." } }),
      signOut: async () => ({ error: null }),
      updateUser: async () => ({ data: { user: null }, error: null }),
      resetPasswordForEmail: async () => ({ data: null, error: null }),
      setSession: async () => ({ data: { session: null, user: null }, error: null }),
    },
  };
}

// This local preview cannot instantiate a live Supabase client, even if build environment variables are present.
export const supabase = createPreviewClient();

export function userFromSupabase(supabaseUser) {
  if (!supabaseUser) return null;
  const meta = supabaseUser.user_metadata || {};
  return {
    id: supabaseUser.id,
    email: supabaseUser.email,
    createdAt: supabaseUser.created_at || new Date().toISOString(),
    affiliateCode: meta.affiliateCode || "",
    promoLockedAt: meta.promoLockedAt || "",
    firstName: meta.firstName || "",
    lastName: meta.lastName || "",
    avatarId: meta.avatarId || "",
    country: meta.country || "",
    address: meta.address || "",
    address2: meta.address2 || "",
    city: meta.city || "",
    state: meta.state || "",
    postalCode: meta.postalCode || "",
    phone: meta.phone || "",
    carrierPreference: meta.carrierPreference || "",
  };
}

export function saveAccountCheckoutDetails(user, form) {
  return saveCheckoutProfile({ auth: supabase.auth, url: supabaseUrl, anonKey: supabaseAnonKey, user, form });
}
