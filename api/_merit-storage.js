import { MeritError } from "./_merit-core.js";

export function createMeritStore({ env = process.env, fetcher = globalThis.fetch } = {}) {
  const url = String(env.SUPABASE_URL || env.VITE_SUPABASE_URL || "").replace(/\/+$/, "");
  const key = String(env.SUPABASE_SERVICE_ROLE_KEY || "");
  let readyUntil = 0, readiness;

  async function request(path, body, accept = "application/json") {
    if (!url || !key) throw new MeritError(503, "Card checkout storage is unavailable.");
    try {
      const response = await fetcher(`${url}/rest/v1/${path}`, {
        method: body === undefined ? "GET" : "POST",
        headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Accept: accept },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) throw new MeritError(503, "Card checkout storage is unavailable.");
      return await response.json();
    } catch {
      // Do not echo database errors: they may contain order data or credentials.
      throw new MeritError(503, "Card checkout storage is unavailable.");
    }
  }

  async function findAttempt(filters) {
    const query = new URLSearchParams({ ...filters, select: "*", limit: "2" });
    const rows = await request(`merit_payment_attempts?${query}`);
    if (!Array.isArray(rows) || rows.length > 1) throw new MeritError(503, "Card checkout storage is unavailable.");
    return rows[0] || null;
  }

  return {
    async ready() {
      if (readyUntil > Date.now()) return true;
      if (!readiness) readiness = (async () => {
        // No customer rows and no mutations. This confirms the private schema
        // and all three RPCs exist before the browser offers card checkout.
        const [schema, rows] = await Promise.all([
          request("", undefined, "application/openapi+json"),
          request("merit_payment_attempts?select=id,checkout_key,customer_id,order_id,amount_cents,currency,snapshot,expected_account,expected_live,intent_id,client_secret,publishable_key,state&limit=0"),
        ]);
        if (!Array.isArray(rows) || rows.length !== 0 || ["reserve_merit_checkout", "bind_merit_checkout", "finalize_merit_checkout"].some(name => !schema?.paths?.[`/rpc/${name}`]?.post)) {
          throw new MeritError(503, "Card checkout storage is unavailable.");
        }
        readyUntil = Date.now() + 30000;
        return true;
      })().finally(() => { readiness = null; });
      return readiness;
    },
    findByOrder: (orderId, customerId) => findAttempt({ order_id: `eq.${orderId}`, customer_id: `eq.${customerId}` }),
    findByIntent: intentId => findAttempt({ intent_id: `eq.${intentId}` }),
    findByCheckoutKey: (checkoutKey, customerId) => findAttempt({ checkout_key: `eq.${checkoutKey}`, customer_id: `eq.${customerId}` }),
    reserve: params => request("rpc/reserve_merit_checkout", params),
    bind: params => request("rpc/bind_merit_checkout", params),
    finalize: params => request("rpc/finalize_merit_checkout", params),
  };
}
