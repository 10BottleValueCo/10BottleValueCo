import { getMeritConfig, MeritError } from "./_merit-core.js";

// Fixed official origin prevents request data or environment typos from sending
// the private API key to an unrelated host. Never log provider responses.
const HUB = "https://getonmerit.com";
const unavailable = () => new MeritError(503, "Secure payment is temporarily unavailable.", "MERIT_PROVIDER_UNAVAILABLE");
const record = value => value !== null && typeof value === "object" && !Array.isArray(value);

export function createMeritProvider({ env = process.env, fetcher = globalThis.fetch, now = Date.now } = {}) {
  let cachedConfig, pendingConfig, cachedUntil = 0;

  async function request(path, body) {
    const apiKey = String(env.ATTESTLY_API_KEY || "");
    if (!apiKey) throw unavailable();
    try {
      const response = await fetcher(HUB + path, {
        method: body === undefined ? "GET" : "POST", redirect: "error", cache: "no-store",
        headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json", "Content-Type": "application/json" },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        signal: AbortSignal.timeout(12000),
      });
      if (!response.ok || Number(response.headers.get("content-length") || 0) > 65536) throw unavailable();
      const reader = response.body?.getReader();
      if (!reader) throw unavailable();
      const chunks = []; let size = 0;
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          size += value.byteLength;
          if (size > 65536) { await reader.cancel(); throw unavailable(); }
          chunks.push(Buffer.from(value));
        }
      } finally { reader.releaseLock(); }
      const data = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      if (!record(data)) throw unavailable();
      return data;
    } catch { throw unavailable(); }
  }

  async function configuration() {
    if (cachedUntil > now()) {
      if (!cachedConfig) throw unavailable();
      return cachedConfig;
    }
    if (!pendingConfig) pendingConfig = (async () => {
      try {
        const cfg = await request("/api/connect/config");
        const config = getMeritConfig(env);
        const publishableKey = cfg.payments?.publishableKey;
        const stripeAccount = cfg.payments?.stripeAccountId;
        if (!/^pk_(?:test|live)_[A-Za-z0-9]+$/.test(publishableKey || "")
          || !/^acct_[A-Za-z0-9]+$/.test(stripeAccount || "")
          || !["live", "test"].includes(env.MERIT_MODE)
          || publishableKey.startsWith("pk_live_") !== config.live
          || (config.stripeAccount && config.stripeAccount !== stripeAccount)) throw unavailable();
        cachedConfig = Object.freeze({ publishableKey, stripeAccount, live: config.live });
        cachedUntil = now() + 300000;
        return cachedConfig;
      } catch {
        cachedConfig = null; cachedUntil = now() + 5000;
        throw unavailable();
      } finally { pendingConfig = null; }
    })();
    return pendingConfig;
  }

  return {
    configuration,
    async create({ amountCents, orderId, otpToken, verifiedEmail, organization }) {
      const config = await configuration();
      if (!Number.isSafeInteger(amountCents) || amountCents <= 0 || !/^INV-[A-F\d]{32}$/.test(orderId || "")
        || typeof otpToken !== "string" || !otpToken || otpToken.length > 16384
        || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(verifiedEmail || "")) throw unavailable();
      const data = await request("/api/connect/create-intent", {
        amountCents, currency: "usd", idempotencyKey: `order_${orderId}`, metadata: { orderId }, otpToken, verifiedEmail,
        ...(organization ? { organization } : {}),
      });
      const match = typeof data.clientSecret === "string" && /^(pi_[A-Za-z0-9]+)_secret_[A-Za-z0-9]+$/.exec(data.clientSecret);
      if (data.ok !== true || !match || data.clientSecret.length > 4096
        || (Object.hasOwn(data, "paymentIntentId") && data.paymentIntentId !== match[1])) throw unavailable();
      return { ...config, intentId: match[1], clientSecret: data.clientSecret };
    },
    async verify({ intentId }) {
      if (!/^pi_[A-Za-z0-9]+$/.test(intentId || "")) throw unavailable();
      const config = await configuration();
      const data = await request("/api/connect/verify-intent", { paymentIntentId: intentId });
      if (data.ok !== true || typeof data.paid !== "boolean" || !Number.isSafeInteger(data.amount)
        || data.amount <= 0 || data.currency !== "usd"
        || (Object.hasOwn(data, "paymentIntentId") && data.paymentIntentId !== intentId)) throw unavailable();
      return {
        source: "merit_authenticated_verify", request: { intentId },
        verified: { paid: data.paid, amountCents: data.amount, currency: data.currency },
        context: { source: "authenticated_provider_config", stripeAccount: config.stripeAccount, live: config.live },
      };
    },
  };
}
