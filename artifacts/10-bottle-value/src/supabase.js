import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

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

  return {
    from: query,
    storage: {
      from: () => ({
        upload: async () => ({ data: null, error: null }),
        getPublicUrl: () => ({ data: { publicUrl: "" } }),
      }),
    },
    channel: () => ({
      on: function on() { return this; },
      subscribe: (callback) => { callback?.("SUBSCRIBED"); return { unsubscribe: () => {} }; },
    }),
    removeChannel: () => {},
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      getUser: async () => ({ data: { user: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      signInWithPassword: async () => ({ data: { user: null, session: null }, error: { message: "Supabase credentials are not configured." } }),
      signUp: async () => ({ data: { user: null, session: null }, error: { message: "Supabase credentials are not configured." } }),
      signOut: async () => ({ error: null }),
      updateUser: async () => ({ data: { user: null }, error: null }),
      resetPasswordForEmail: async () => ({ data: null, error: null }),
      setSession: async () => ({ data: { session: null, user: null }, error: null }),
    },
  };
}

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : createPreviewClient();

export function userFromSupabase(supabaseUser) {
  if (!supabaseUser) return null;
  const meta = supabaseUser.user_metadata || {};
  return {
    email: supabaseUser.email,
    createdAt: supabaseUser.created_at || new Date().toISOString(),
    affiliateCode: meta.affiliateCode || "",
    promoLockedAt: meta.promoLockedAt || "",
    firstName: meta.firstName || "",
    lastName: meta.lastName || "",
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
