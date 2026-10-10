import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { requireVerifiedCustomer } from "./_require-customer.js";
import { MeritError, assertCheckoutOrigin, getMeritConfig, meritRuleSnapshot, publicMeritConfig, readMeritCheckoutKey } from "./_merit-core.js";
import { buildMeritQuote, meritCreditSnapshot, MeritQuoteError } from "./_merit-quote.js";
import { createMeritProvider } from "./_merit-provider.js";
import { createMeritStore } from "./_merit-storage.js";
import { reconcileMeritOrder } from "./_merit-reconcile.js";
import { sendMeritReceipt } from "./_merit-receipt.js";

const uuid = /^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i;
const record = value => value !== null && typeof value === "object" && !Array.isArray(value);
const pending = () => new MeritError(503, "Your checkout is being prepared. Check again using this same checkout before making another payment.", "MERIT_PREPARING");
const orderIdFor = key => `INV-${key.replaceAll("-", "").toUpperCase()}`;
const publicFields = ["email", "firstName", "lastName", "country", "address", "address2", "city", "state", "postalCode", "phone", "taxId", "orderNotes", "purchaserAttestation", "shippingType", "items", "subtotal", "shipping", "automaticDiscount", "promoDiscount", "promoCode", "promoFreeShipping", "ownerFreeShipping", "affiliateDiscount", "affiliateDiscountDisabled", "affiliateCode", "affiliateCommission", "customerCardSurcharge", "customerCardSurchargeBps", "cryptoDiscount", "storeCreditUsed", "storeCreditUsedCents", "orderBaseAmountCents", "cardBaseAmountCents", "total"];

function validateAttempt(attempt, customer, checkoutKey) {
  if (!record(attempt) || !uuid.test(attempt.id || "") || attempt.customer_id !== customer.id
    || attempt.email !== customer.email || attempt.checkout_key !== checkoutKey
    || attempt.order_id !== orderIdFor(checkoutKey) || !record(attempt.snapshot)
    || attempt.snapshot.email !== customer.email || attempt.currency !== "usd"
    || !Number.isSafeInteger(Number(attempt.amount_cents)) || Number(attempt.amount_cents) <= 0
    || Math.round(Number(attempt.snapshot.total) * 100) !== Number(attempt.amount_cents)
    || !/^acct_[A-Za-z0-9]+$/.test(attempt.expected_account || "")
    || typeof attempt.expected_live !== "boolean" || !["reserved", "ready", "paid"].includes(attempt.state)) throw pending();
  const credit = Number(attempt.credit_reserved_cents ?? 0);
  const fee = Math.round(Number(attempt.snapshot.customerCardSurcharge) * 100);
  if (!Number.isSafeInteger(credit) || credit < 0 || Math.round(Number(attempt.snapshot.storeCreditUsed ?? 0) * 100) !== credit) throw pending();
  if (credit > 0 && (!record(attempt.credit_request_snapshot)
    || !isDeepStrictEqual(attempt.snapshot, meritCreditSnapshot(attempt.credit_request_snapshot, credit))
    || !Number.isSafeInteger(fee))) throw pending();
  return attempt;
}

function sessionResponse(attempt) {
  const amountCents = Number(attempt.amount_cents);
  const surchargeCents = Math.round(Number(attempt.snapshot.customerCardSurcharge) * 100);
  const storeCreditUsedCents = Number(attempt.credit_reserved_cents ?? 0);
  const cardBaseAmountCents = amountCents - surchargeCents;
  const baseAmountCents = cardBaseAmountCents + storeCreditUsedCents;
  if (!["ready", "paid"].includes(attempt.state) || !/^pi_[A-Za-z0-9]+$/.test(attempt.intent_id || "")
    || !new RegExp(`^${attempt.intent_id}_secret_[A-Za-z0-9]+$`).test(attempt.client_secret || "")
    || !/^pk_(?:live|test)_[A-Za-z0-9]+$/.test(attempt.publishable_key || "")
    || attempt.publishable_key.startsWith("pk_live_") !== attempt.expected_live
    || !Number.isSafeInteger(surchargeCents) || surchargeCents < 0 || surchargeCents > amountCents) throw pending();
  const order = Object.fromEntries(publicFields.filter(key => Object.hasOwn(attempt.snapshot, key)).map(key => [key, attempt.snapshot[key]]));
  Object.assign(order, { id: attempt.order_id, paymentProvider: "Merit", status: attempt.state === "paid" ? "paid" : "pending", createdAt: attempt.created_at });
  return {
    ok: true, orderId: attempt.order_id, paid: attempt.state === "paid", order,
    session: { clientSecret: attempt.client_secret, publishableKey: attempt.publishable_key, stripeAccount: attempt.expected_account,
      orderId: attempt.order_id, amountCents, currency: "usd", baseAmountCents, cardBaseAmountCents, storeCreditUsedCents, appliedCreditCents: storeCreditUsedCents, surchargeCents },
  };
}

export function createMeritCheckoutHandler({ env = process.env, provider = createMeritProvider({ env }), store = createMeritStore({ env }), authenticate = requireVerifiedCustomer, quote = buildMeritQuote, notify = payload => sendMeritReceipt(payload, { env }) } = {}) {
  return async function handler(req, res) {
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("Vary", "Authorization");
    res.setHeader("X-Content-Type-Options", "nosniff");
    const config = getMeritConfig(env);
    try {
      if (req.method === "GET") {
        if (!config.enabled) return res.status(200).json(publicMeritConfig(config));
        try { await Promise.all([provider.configuration(), store.ready()]); }
        catch { return res.status(200).json({ ok: true, enabled: false }); }
        return res.status(200).json(publicMeritConfig(config));
      }
      if (req.method !== "POST") { res.setHeader("Allow", "GET, POST"); return res.status(405).json({ ok: false, error: "Method not allowed." }); }
      assertCheckoutOrigin(req, env);
      if (!record(req.body) || Buffer.byteLength(JSON.stringify(req.body)) > 65536) throw new MeritError(400, "Checkout details are invalid.", "MERIT_INVALID_REQUEST");
      const customer = await authenticate(req, res, { purpose: "card checkout" });
      if (!customer) return;
      res.setHeader("Cache-Control", "private, no-store");
      if (!uuid.test(customer.id || "") || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email || "")
        || customer.email !== customer.email.trim().toLowerCase()) throw new MeritError(401, "Sign in to use card checkout.", "MERIT_IDENTITY_REQUIRED");
      if (req.body.action === "reconcile") {
        return res.status(200).json(await reconcileMeritOrder({ orderId: req.body.orderId, customerId: customer.id, provider, store, notify }));
      }
      if (req.body.action !== "create") throw new MeritError(400, "Checkout action is invalid.", "MERIT_INVALID_REQUEST");
      if (!config.enabled) throw new MeritError(503, "Card checkout is unavailable.");
      const checkoutKey = readMeritCheckoutKey(req.body.checkoutKey);
      // Check this before re-quoting: a personal promo is already consumed by
      // reservation, and a lost acknowledgement must recover the existing intent.
      const existing = await store.findByCheckoutKey(checkoutKey, customer.id);
      if (existing) return res.status(200).json(sessionResponse(validateAttempt(existing, customer, checkoutKey)));
      if (typeof req.body.otpToken !== "string" || !req.body.otpToken.trim() || req.body.otpToken.length > 16384
        || typeof req.body.verifiedEmail !== "string" || req.body.verifiedEmail.trim().toLowerCase() !== customer.email
        || (req.body.organization !== undefined && (typeof req.body.organization !== "string" || req.body.organization.length > 250))) {
        throw new MeritError(403, "Verify your checkout email before paying.", "MERIT_ATTESTATION_REQUIRED");
      }
      const providerConfig = await provider.configuration();
      const priced = await quote({ ...req.body, orderId: undefined }, customer.email, {
        customerId: customer.id, surchargeBps: config.surchargeBps, serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY, affiliateRules: env.MERIT_AFFILIATE_RULES_JSON,
        supabaseUrl: env.SUPABASE_URL || env.VITE_SUPABASE_URL,
      });
      const snapshot = { ...priced.snapshot, paymentRules: { ...meritRuleSnapshot(config), ...(priced.affiliateRule ? { affiliateRule: priced.affiliateRule } : {}) }, costSnapshot: null };
      const useStoreCredit = req.body.useStoreCredit === true;
      const fingerprint = createHash("sha256").update(JSON.stringify({ version: useStoreCredit ? 2 : 1, currency: priced.currency, amountCents: priced.amountCents, userPromoId: priced.userPromoId, snapshot })).digest("hex");
      const reservation = await (useStoreCredit ? store.reserveCredit : store.reserve)({
        p_checkout_key: checkoutKey, p_email: customer.email, p_customer_id: customer.id, p_fingerprint: fingerprint,
        p_amount_cents: priced.amountCents, p_currency: priced.currency, p_snapshot: snapshot,
        p_expected_account: providerConfig.stripeAccount, p_expected_live: providerConfig.live, p_user_promo_id: priced.userPromoId,
      });
      if (reservation?.ok !== true) {
        const creditErrors = {
          MERIT_CREDIT_PENDING: "A previous Store Credit checkout needs reconciliation. Contact support before making another payment.",
          MERIT_FULL_CREDIT_AVAILABLE: "Store Credit covers this order. Choose full Store Credit checkout.",
          MERIT_CREDIT_BALANCE_UNAVAILABLE: "Your Store Credit balance is unavailable or has changed. Refresh your balance before preparing payment.",
        };
        if (useStoreCredit && Object.hasOwn(creditErrors, reservation?.error)) throw new MeritError(409, creditErrors[reservation.error], reservation.error);
        throw pending();
      }
      if (typeof reservation.created !== "boolean") throw pending();
      const attempt = validateAttempt(reservation.attempt, customer, checkoutKey);
      const expectedSnapshot = useStoreCredit ? meritCreditSnapshot(snapshot, Number(attempt.credit_reserved_cents)) : snapshot;
      const expectedAmountCents = Math.round(expectedSnapshot.total * 100);
      if (attempt.quote_fingerprint !== fingerprint || Number(attempt.amount_cents) !== expectedAmountCents
        || attempt.expected_account !== providerConfig.stripeAccount || attempt.expected_live !== providerConfig.live
        || !isDeepStrictEqual(attempt.snapshot, expectedSnapshot)) throw pending();
      if (!reservation.created) return res.status(200).json(sessionResponse(attempt));
      if (attempt.state !== "reserved" || attempt.intent_id) throw pending();
      // Only the transaction's first creator can reach the provider. A crash
      // here leaves this same attempt pending; never silently start another.
      const intent = await provider.create({ amountCents: Number(attempt.amount_cents), orderId: attempt.order_id,
        otpToken: req.body.otpToken, verifiedEmail: customer.email, organization: req.body.organization?.trim() });
      if (intent.stripeAccount !== attempt.expected_account || intent.live !== attempt.expected_live) throw pending();
      const bound = await store.bind({ p_attempt_id: attempt.id, p_intent_id: intent.intentId, p_stripe_account: intent.stripeAccount,
        p_livemode: intent.live, p_client_secret: intent.clientSecret, p_publishable_key: intent.publishableKey });
      if (bound?.ok !== true) throw pending();
      const ready = validateAttempt(bound.attempt, customer, checkoutKey);
      if (ready.id !== attempt.id || ready.intent_id !== intent.intentId || ready.client_secret !== intent.clientSecret
        || ready.publishable_key !== intent.publishableKey || ready.quote_fingerprint !== fingerprint) throw pending();
      return res.status(200).json(sessionResponse(ready));
    } catch (error) {
      const known = error instanceof MeritError || error instanceof MeritQuoteError;
      return res.status(known ? error.status : 503).json({ ok: false,
        error: known ? error.message : "Your payment status is unavailable. Check this checkout again before making another payment.",
        code: known ? error.code : "MERIT_PENDING" });
    }
  };
}

export default createMeritCheckoutHandler();
