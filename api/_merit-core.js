// The provider adapter must populate proof from a server-to-server verification
// response. Browser redirects, client SDK results and webhook fields alone are
// never payment evidence for these helpers.
export class MeritError extends Error {
  constructor(status, message, code = "MERIT_UNAVAILABLE") {
    super(message);
    this.name = "MeritError";
    this.status = status;
    this.code = code;
  }
}

const normalizeEmail = value => String(value || "").trim().toLowerCase();
const uuid = /^[a-f\d]{8}-[a-f\d]{4}-4[a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i;
const orderIdPattern = /^INV-[A-F\d]{32}$/;

export function readMeritCheckoutKey(value) {
  if (typeof value !== "string" || !uuid.test(value)) {
    throw new MeritError(400, "Refresh this checkout and try again.", "MERIT_INVALID_ATTEMPT");
  }
  return value.toLowerCase();
}

export function readMeritOrderId(value) {
  if (typeof value !== "string" || !orderIdPattern.test(value)) {
    throw new MeritError(400, "The order number is invalid.", "MERIT_INVALID_ORDER");
  }
  return value;
}

function basisPoints(value, optional = false) {
  if (optional && (value === undefined || value === "")) return null;
  if (!/^\d{1,5}$/.test(String(value ?? ""))) return undefined;
  const result = Number(value);
  return result <= 10000 ? result : undefined;
}

export function getMeritConfig(env = process.env) {
  const surchargeBps = basisPoints(env.MERIT_CARD_SURCHARGE_BPS);
  const processorFeeBps = basisPoints(env.MERIT_PROCESSOR_FEE_BPS, true);
  const mode = env.MERIT_MODE;
  const config = {
    apiKey: String(env.ATTESTLY_API_KEY || ""),
    webhookSecret: String(env.ATTESTLY_WEBHOOK_SECRET || ""),
    stripeAccount: String(env.MERIT_STRIPE_ACCOUNT || ""),
    live: mode === "live",
    ruleVersion: String(env.MERIT_RULE_VERSION || ""),
    surchargeBps,
    processorFeeBps,
    // Unknown or unsupported basis keeps the margin estimate unavailable; it
    // does not change the customer's charge or block payment confirmation.
    processorFeeBasis: env.MERIT_PROCESSOR_FEE_BASIS === "charged_amount" ? "charged_amount" : null,
    processorFeeSource: String(env.MERIT_PROCESSOR_FEE_SOURCE || ""),
    processorFeeEffectiveAt: String(env.MERIT_PROCESSOR_FEE_EFFECTIVE_AT || ""),
    surchargeSource: String(env.MERIT_CARD_SURCHARGE_SOURCE || ""),
    surchargeEffectiveAt: String(env.MERIT_CARD_SURCHARGE_EFFECTIVE_AT || ""),
  };
  config.configured = Boolean(
    config.apiKey && config.webhookSecret && (!config.stripeAccount || /^acct_[A-Za-z0-9]+$/.test(config.stripeAccount))
    && ["live", "test"].includes(mode) && config.ruleVersion
    && surchargeBps !== undefined && processorFeeBps !== undefined
    && config.surchargeSource && Number.isFinite(Date.parse(config.surchargeEffectiveAt))
    && (processorFeeBps === null || (config.processorFeeSource && Number.isFinite(Date.parse(config.processorFeeEffectiveAt)))),
  );
  config.enabled = env.MERIT_ENABLED === "true" && config.configured;
  return config;
}

export function publicMeritConfig(config) {
  // Keep this allowlist explicit: the private object contains credentials.
  return {
    ok: true,
    enabled: config.enabled === true,
    ...(config.enabled ? { currency: "usd", surchargeBps: config.surchargeBps } : {}),
  };
}

export function meritRuleSnapshot(config) {
  return {
    version: config.ruleVersion,
    currency: "usd",
    customerCardSurcharge: {
      status: "owner_approved",
      basis: "order_before_credit",
      rate: config.surchargeBps,
      unit: "basis_points",
      source: config.surchargeSource,
      effectiveAt: config.surchargeEffectiveAt,
    },
    merchantProcessingExpense: config.processorFeeBps === null ? null : {
      ...(config.processorFeeBasis === "charged_amount" ? { basis: "charged_amount" } : {}),
      rate: config.processorFeeBps,
      unit: "basis_points",
      source: config.processorFeeSource,
      effectiveAt: config.processorFeeEffectiveAt,
      status: "reported_rate_not_actual_settlement",
    },
  };
}

export function requireMeritProof(attempt, proof) {
  const invalid = () => {
    throw new MeritError(409, "Payment details could not be verified. Contact support with your order number.", "MERIT_PROOF_MISMATCH");
  };
  // The documented verify endpoint returns paid, gross amount and currency.
  // Request/context bindings are recorded separately; they are not represented
  // as email/order/account fields returned by that endpoint.
  if (proof?.source === "merit_authenticated_verify") {
    if (!attempt || !orderIdPattern.test(attempt.order_id || "")
      || !/^pi_[A-Za-z0-9]+$/.test(attempt.intent_id || "")
      || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(attempt.email))
      || !/^acct_[A-Za-z0-9]+$/.test(attempt.expected_account || "")
      || typeof attempt.expected_live !== "boolean"
      || proof.request?.intentId !== attempt.intent_id
      || proof.context?.source !== "authenticated_provider_config"
      || proof.context.stripeAccount !== attempt.expected_account
      || proof.context.live !== attempt.expected_live
      || typeof proof.verified?.paid !== "boolean"
      || !Number.isSafeInteger(proof.verified.amountCents) || proof.verified.amountCents <= 0
      || proof.verified.amountCents !== Number(attempt.amount_cents)
      || proof.verified.currency !== "usd" || attempt.currency !== "usd") invalid();
    return { paid: proof.verified.paid, status: proof.verified.paid ? "succeeded" : "pending" };
  }
  if (!attempt || !proof || !/^pi_[A-Za-z0-9]+$/.test(proof.intentId || "")) invalid();
  if (!orderIdPattern.test(attempt.order_id || "") || !orderIdPattern.test(proof.orderId || "")) invalid();
  if (attempt.currency !== "usd" || proof.currency !== "usd") invalid();
  if (!/^acct_[A-Za-z0-9]+$/.test(attempt.expected_account || "") || !/^acct_[A-Za-z0-9]+$/.test(proof.stripeAccount || "")) invalid();
  if (typeof proof.amountCents !== "number" || !Number.isSafeInteger(proof.amountCents) || proof.amountCents <= 0) invalid();
  if (
    proof.intentId !== attempt.intent_id
    || proof.orderId !== attempt.order_id
    || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(proof.email))
    || normalizeEmail(proof.email) !== normalizeEmail(attempt.email)
    || proof.amountCents !== Number(attempt.amount_cents)
    || proof.currency !== attempt.currency
    || proof.stripeAccount !== attempt.expected_account
    || typeof proof.live !== "boolean" || proof.live !== attempt.expected_live
  ) invalid();
  if (!["requires_payment_method", "requires_confirmation", "requires_action", "processing", "requires_capture", "canceled", "succeeded"].includes(proof.status)) invalid();
  if (proof.status === "succeeded" && proof.amountReceivedCents !== proof.amountCents) invalid();
  return { paid: proof.status === "succeeded", status: proof.status };
}

export function assertCheckoutOrigin(req, env = process.env) {
  // Bearer authorization is still required separately. Permit absent Origin for
  // native clients; reject browser cross-site requests before provider work.
  const origin = String(req.headers?.origin || "");
  let isReplitPreview = false;
  const mode = String(env.MERIT_MODE || "");
  if (origin && (mode === "test" || mode === "live")) {
    try {
      const parsed = new URL(origin);
      const configuredHost = String(env.REPLIT_DEV_DOMAIN || "").trim().toLowerCase();
      const isTestPreviewHost = parsed.hostname.endsWith(".replit.dev")
        || (configuredHost !== "" && parsed.hostname === configuredHost);
      const isExplicitLivePreviewOrigin = env.NODE_ENV === "development"
        && env.MERIT_ALLOW_REPLIT_PREVIEW_LIVE === "true"
        && configuredHost !== ""
        && parsed.origin === `https://${configuredHost}`;
      isReplitPreview = parsed.protocol === "https:"
        && (mode === "test" ? isTestPreviewHost : isExplicitLivePreviewOrigin);
    } catch {
      isReplitPreview = false;
    }
  }
  if (origin && !["https://10bottlevalue.co", "https://www.10bottlevalue.co"].includes(origin) && !isReplitPreview) {
    throw new MeritError(403, "This checkout request is not allowed.", "MERIT_ORIGIN_REJECTED");
  }
}
