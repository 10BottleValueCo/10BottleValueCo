import { observeMeritCodeCells } from "./merit-code-input.js";

const SESSION_ERROR = "Secure payment is unavailable. Reload checkout and try again.";
export const MERIT_ATTEMPT_STORAGE_KEY = "tbv-merit-checkout-attempt";

export function meritOrderCardSurcharge(order) {
  const isMerit = [order?.payment_provider, order?.paymentProvider, order?.metadata?.paymentProvider].some(value => /^merit$/i.test(String(value || "")));
  const raw = order?.customerCardSurcharge ?? order?.metadata?.customerCardSurcharge;
  const amount = raw !== null && raw !== undefined && raw !== "" && Number.isFinite(Number(raw)) && Number(raw) >= 0 ? Number(raw) : null;
  return { isMerit, amount: isMerit ? amount : null };
}

export function meritCartMatchesOrder(cart, order) {
  const normalize = items => JSON.stringify((items || []).map(item => [item.name, item.dose, item.noteLabel || "", item.fromWarehouse || "", Number(item.vials ?? 10), Number(item.quantity ?? item.qty ?? 1)]).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))));
  return Array.isArray(cart) && cart.length > 0 && Array.isArray(order?.items) && normalize(cart) === normalize(order.items);
}

export function buildMeritCheckoutPayload({ items, checkoutForm, shippingType, promoCode, affiliateCode, affiliateDiscountDisabled, ownerFreeShipping, orderNotes, purchaserAttestation, useStoreCredit = false }) {
  const contact = {};
  for (const key of ["firstName", "lastName", "country", "address", "address2", "city", "state", "postalCode", "phone", "taxId"]) contact[key] = String(checkoutForm?.[key] || "");
  return {
    items: (items || []).map(item => ({ name: item.name, dose: item.dose, quantity: item.quantity ?? item.qty ?? 1,
      ...(item.fromWarehouse ? { fromWarehouse: item.fromWarehouse } : {}), ...(item.vials !== undefined && item.vials !== 10 ? { vials: item.vials } : {}), ...(item.noteLabel ? { noteLabel: item.noteLabel } : {}) })),
    checkoutForm: contact, shippingType, promoCode: promoCode || "", affiliateCode: affiliateCode || "",
    affiliateDiscountDisabled: Boolean(affiliateDiscountDisabled), ownerFreeShipping: Boolean(ownerFreeShipping),
    useStoreCredit: useStoreCredit === true,
    orderNotes: String(orderNotes || ""), purchaserAttestation: { ...purchaserAttestation },
  };
}

export async function meritPayloadDigest(payload, buyerEmail, surchargeBps, cryptoApi = globalThis.crypto) {
  if (!cryptoApi?.subtle) throw new Error(SESSION_ERROR);
  const bytes = new TextEncoder().encode(JSON.stringify({ payload, buyerEmail: String(buyerEmail || "").trim().toLowerCase(), surchargeBps }));
  return Array.from(new Uint8Array(await cryptoApi.subtle.digest("SHA-256", bytes)), byte => byte.toString(16).padStart(2, "0")).join("");
}

export function readMeritAttempt(storage) {
  try {
    const value = JSON.parse(storage.getItem(MERIT_ATTEMPT_STORAGE_KEY) || "null");
    if (!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value?.key || "")
      || !/^[a-f0-9]{64}$/.test(value?.digest || "")
      || (value.orderId && !/^INV-[A-Z0-9]{6,32}$/i.test(value.orderId))
      || (value.submitted === true && !value.orderId)) return null;
    return { key: value.key, digest: value.digest, orderId: value.orderId || "", submitted: value.submitted === true, ...(value.createRequested === true ? { createRequested: true } : {}) };
  } catch { return null; }
}

export function saveMeritAttempt(storage, value) {
  // No contact information, OTP token, client secret, or bearer token in storage.
  storage.setItem(MERIT_ATTEMPT_STORAGE_KEY, JSON.stringify({ key: value.key, digest: value.digest, orderId: value.orderId || "", submitted: value.submitted === true, ...(value.createRequested === true ? { createRequested: true } : {}) }));
}

export async function verifyMeritCheckoutBuyer(email, otp = globalThis.window?.AttestlyOTP, { signal } = {}) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) || typeof otp?.verify !== "function") throw new Error(SESSION_ERROR);
  let disposeCodeCells = () => {};
  try { disposeCodeCells = observeMeritCodeCells({ signal }); } catch { /* Appearance must never block verification. */ }
  let result;
  try { result = await otp.verify({ email: normalizedEmail }); }
  finally { try { disposeCodeCells(); } catch { /* Preserve the provider result if its DOM changed during cleanup. */ } }
  if (!result?.verified) return null;
  if (result.verified !== true || result.skipped || typeof result.token !== "string" || !result.token.trim()
    || String(result.email || "").trim().toLowerCase() !== normalizedEmail) throw new Error(SESSION_ERROR);
  return { otpToken: result.token, verifiedEmail: normalizedEmail,
    ...(typeof result.captureId === "string" && result.captureId.trim() ? { captureId: result.captureId.trim() } : {}) };
}

export function createMeritApiClient({ getAccessToken, fetchImpl = globalThis.fetch }) {
  async function post(body) {
    const token = await getAccessToken();
    if (!token) { const error = new Error(SESSION_ERROR); error.code = "authentication_required"; throw error; }
    const response = await fetchImpl("/api/merit-checkout", { method: "POST", cache: "no-store", credentials: "same-origin",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
    const result = await response.json().catch(() => null);
    if (!response.ok || result?.ok !== true) {
      const error = new Error(SESSION_ERROR);
      error.code = response.status === 401 ? "authentication_required" : String(result?.code || "request_failed");
      throw error;
    }
    return result;
  }
  return {
    async configuration() {
      const response = await fetchImpl("/api/merit-checkout", { cache: "no-store", credentials: "same-origin" });
      const result = await response.json().catch(() => null);
      if (response.ok && result?.ok === true && result.enabled === false) return { enabled: false };
      if (!response.ok || result?.ok !== true || typeof result.enabled !== "boolean" || result.currency !== "usd"
        || !Number.isSafeInteger(result.surchargeBps) || result.surchargeBps < 0 || result.surchargeBps > 10000) throw new Error(SESSION_ERROR);
      return { enabled: result.enabled, currency: result.currency, surchargeBps: result.surchargeBps };
    },
    async create({ checkoutKey, payload, proof }) {
      const result = await post({ ...payload, ...proof, action: "create", checkoutKey });
      const session = validateMeritSession(result.session);
      const order = { ...result.order?.metadata, ...result.order };
      const credit = result.session.storeCreditUsedCents ?? (payload.useStoreCredit ? null : 0);
      const cardBase = result.session.cardBaseAmountCents ?? (payload.useStoreCredit ? null : result.session.baseAmountCents);
      if (result.order?.id !== session.orderId || !Number.isSafeInteger(result.session.baseAmountCents)
        || !Number.isSafeInteger(result.session.surchargeCents) || result.session.baseAmountCents < 0 || result.session.surchargeCents < 0
        || !Number.isSafeInteger(credit) || credit < 0 || !Number.isSafeInteger(cardBase) || cardBase <= 0
        || credit + cardBase !== result.session.baseAmountCents
        || cardBase + result.session.surchargeCents !== session.amountCents
        || (result.session.appliedCreditCents !== undefined && result.session.appliedCreditCents !== credit)) throw new Error(SESSION_ERROR);
      const moneyFields = ["subtotal", "shipping", "automaticDiscount", "promoDiscount", "affiliateDiscount", "total", "customerCardSurcharge"];
      if (!Array.isArray(order.items) || !order.items.length
        || order.items.some(item => typeof item.name !== "string" || typeof item.dose !== "string" || typeof item.price !== "number" || !Number.isFinite(item.price) || item.price < 0 || !Number.isSafeInteger(item.quantity) || item.quantity < 1)
        || moneyFields.some(key => typeof order[key] !== "number" || !Number.isFinite(order[key]) || order[key] < 0)
        || !Number.isSafeInteger(order.customerCardSurchargeBps) || order.customerCardSurchargeBps < 0 || order.customerCardSurchargeBps > 10000
        || (payload.useStoreCredit && (typeof order.storeCreditUsed !== "number" || !Number.isFinite(order.storeCreditUsed) || order.storeCreditUsed < 0))
        || Math.round(Number(order.storeCreditUsed || 0) * 100) !== credit
        || Math.round(order.total * 100) !== session.amountCents
        || Math.round(order.customerCardSurcharge * 100) !== result.session.surchargeCents
        || Math.round(result.session.baseAmountCents * order.customerCardSurchargeBps / 10000) !== result.session.surchargeCents
        || Math.round((order.subtotal + order.shipping - order.automaticDiscount - order.promoDiscount - order.affiliateDiscount) * 100) !== result.session.baseAmountCents) throw new Error(SESSION_ERROR);
      return { ...result, order, session: { ...session, baseAmountCents: result.session.baseAmountCents,
        storeCreditUsedCents: credit, cardBaseAmountCents: cardBase, surchargeCents: result.session.surchargeCents } };
    },
    async reconcile({ orderId }) {
      if (!/^INV-[A-Z0-9]{6,32}$/i.test(orderId || "")) throw new Error(SESSION_ERROR);
      const result = await post({ action: "reconcile", orderId });
      if (result.orderId !== orderId || (result.paid === true && result.order?.id !== orderId)) throw new Error(SESSION_ERROR);
      return result;
    },
  };
}

// Display estimate only. The authenticated create response reserves credit and
// supplies the amount mounted into Elements; no preview amount is sent to it.
export function estimateMeritCreditSplit(baseTotal, availableCredit, surchargeBps) {
  const baseAmountCents = Math.max(0, Math.round(Number(baseTotal || 0) * 100));
  const storeCreditUsedCents = Math.min(baseAmountCents, Math.max(0, Math.round(Number(availableCredit || 0) * 100)));
  const cardBaseAmountCents = baseAmountCents - storeCreditUsedCents;
  const surchargeCents = cardBaseAmountCents > 0 ? Math.round(baseAmountCents * Number(surchargeBps || 0) / 10000) : 0;
  return { baseAmountCents, storeCreditUsedCents, cardBaseAmountCents, surchargeCents, amountCents: cardBaseAmountCents + surchargeCents };
}

export function validateMeritSession(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)
    || !/^pi_[A-Za-z0-9]+_secret_[A-Za-z0-9]+$/.test(value.clientSecret || "")
    || !/^pk_(?:test|live)_[A-Za-z0-9]+$/.test(value.publishableKey || "")
    || !/^acct_[A-Za-z0-9]+$/.test(value.stripeAccount || "")
    || !/^INV-[A-Z0-9]{6,32}$/i.test(value.orderId || "")
    || !Number.isSafeInteger(value.amountCents) || value.amountCents <= 0
    || value.currency !== "usd") {
    throw new Error(SESSION_ERROR);
  }
  if (value.storeCreditUsedCents !== undefined || value.cardBaseAmountCents !== undefined) {
    const { baseAmountCents, storeCreditUsedCents, cardBaseAmountCents, surchargeCents } = value;
    if (![baseAmountCents, storeCreditUsedCents, cardBaseAmountCents, surchargeCents].every(amount => Number.isSafeInteger(amount) && amount >= 0)
      || cardBaseAmountCents <= 0 || storeCreditUsedCents + cardBaseAmountCents !== baseAmountCents
      || cardBaseAmountCents + surchargeCents !== value.amountCents) throw new Error(SESSION_ERROR);
  }
  return {
    ...(Number.isSafeInteger(value.baseAmountCents) && Number.isSafeInteger(value.storeCreditUsedCents) && Number.isSafeInteger(value.cardBaseAmountCents) && Number.isSafeInteger(value.surchargeCents)
      ? { baseAmountCents: value.baseAmountCents, storeCreditUsedCents: value.storeCreditUsedCents, cardBaseAmountCents: value.cardBaseAmountCents, surchargeCents: value.surchargeCents } : {}),
    clientSecret: value.clientSecret, publishableKey: value.publishableKey,
    stripeAccount: value.stripeAccount, orderId: value.orderId,
    amountCents: value.amountCents, currency: value.currency,
  };
}

export function meritReturnUrl(session, origin) {
  const validated = validateMeritSession(session);
  const url = new URL(origin);
  if (!["https:", "http:"].includes(url.protocol)) throw new Error(SESSION_ERROR);
  const result = new URL("/", url.origin);
  result.search = new URLSearchParams({ payment: "pending", provider: "merit", order: validated.orderId }).toString();
  return result.toString();
}

export function formatMeritAmount(session, language = "en") {
  const validated = validateMeritSession(session);
  return new Intl.NumberFormat(language === "ru" ? "ru-RU" : "en-US", {
    style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(validated.amountCents / 100);
}

export const meritCheckoutMessages = {
  en: {
    heading: "Secure payment", order: "Order", amount: "Card payment",
    orderBase: "Order amount", credit: "Store credit applied", cardBase: "Remaining before card surcharge", surcharge: "Card surcharge on full order",
    loading: "Loading secure payment details…", card: "Or pay by card",
    pay: "Pay", confirming: "Confirming payment…", checking: "Checking payment status…",
    pending: "We’re confirming your payment. Your order will update when confirmation arrives.",
    statusUnavailable: "Payment confirmation is taking longer than expected. Check its status before trying another payment.",
    checkStatus: "Check payment status", paid: "Payment confirmed",
    paymentError: "Payment could not be completed. Check your payment details and try again.",
    promoUnverified: "This promo code cannot be verified for card payment. Remove it or contact support.",
    affiliateUnverified: "This affiliate code cannot be verified for card payment. Choose another payment method or contact support.",
    unavailable: "Secure payment is unavailable. Reload checkout and try again.",
    secure: "Secure card payment.",
  },
  ru: {
    heading: "Безопасная оплата", order: "Заказ", amount: "Оплата картой",
    orderBase: "Сумма заказа", credit: "Использованный кредит магазина", cardBase: "Остаток до доплаты за карту", surcharge: "Доплата за карту на весь заказ",
    loading: "Загружаем защищённую форму оплаты…", card: "Или оплатите картой",
    pay: "Оплатить", confirming: "Подтверждаем оплату…", checking: "Проверяем статус оплаты…",
    pending: "Подтверждаем оплату. Статус заказа обновится после получения подтверждения.",
    statusUnavailable: "Подтверждение оплаты занимает больше времени, чем обычно. Проверьте статус, прежде чем оплачивать повторно.",
    checkStatus: "Проверить статус оплаты", paid: "Оплата подтверждена",
    paymentError: "Не удалось завершить оплату. Проверьте платёжные данные и повторите попытку.",
    promoUnverified: "Этот промокод не удаётся проверить для оплаты картой. Удалите его или обратитесь в поддержку.",
    affiliateUnverified: "Этот партнёрский код не удаётся проверить для оплаты картой. Выберите другой способ оплаты или обратитесь в поддержку.",
    unavailable: "Защищённая форма оплаты недоступна. Обновите страницу оформления заказа и повторите попытку.",
    secure: "Безопасная оплата картой.",
  },
};

export function meritCheckoutBusinessError(error, language = "en") {
  const messages = meritCheckoutMessages[String(language).toLowerCase() === "ru" ? "ru" : "en"];
  if (error?.code === "MERIT_CREDIT_PENDING") return String(language).toLowerCase() === "ru"
    ? "В старом заказе есть несверенное использование кредита магазина. Эта оплата не начата. Обратитесь в поддержку для проверки старого заказа."
    : "An earlier order has an unresolved store-credit claim. This payment has not started. Contact support to review the earlier order.";
  if (error?.code === "MERIT_CREDIT_BALANCE_UNAVAILABLE") return String(language).toLowerCase() === "ru"
    ? "Не удалось подтвердить доступный кредит магазина. Оплата картой не начата. Повторите попытку с тем же заказом или обратитесь в поддержку."
    : "Your available store credit could not be verified. Card payment has not started. Retry this same checkout or contact support.";
  if (error?.code === "MERIT_FULL_CREDIT_AVAILABLE") return String(language).toLowerCase() === "ru"
    ? "Кредит магазина покрывает заказ целиком. Вернитесь к оформлению и выберите оплату кредитом магазина."
    : "Your store credit covers the entire order. Return to checkout and choose Pay with store credit.";
  if (error?.code === "MERIT_PROMO_UNVERIFIED") return messages.promoUnverified;
  if (error?.code === "MERIT_AFFILIATE_UNVERIFIED") return messages.affiliateUnverified;
  return "";
}

/**
 * In-memory confirmation state only: no storage, network endpoints, or authority
 * from redirect parameters. onReconcile must query the authenticated server for
 * this order; a Stripe/browser success alone can never call onPaid.
 * The getters allow React's current callbacks/Elements to change without losing
 * the lock on a submitted session. Dispose on identity/cart/session invalidation.
 */
export function createMeritCheckoutClient({
  session, getStripe, getElements, origin, onReconcile, onPaid = () => {}, onState = () => {},
}) {
  if (typeof getStripe !== "function" || typeof getElements !== "function" || typeof onReconcile !== "function") throw new Error(SESSION_ERROR);
  const validated = validateMeritSession(session);
  const returnUrl = meritReturnUrl(validated, origin);
  let active = true;
  let busy = false;
  let submitted = false;
  let paid = false;
  let state = { phase: "ready", messageKey: "", busy: false, submitted: false };
  const notify = (phase, messageKey = "") => {
    state = { phase, messageKey, busy, submitted };
    if (active) {
      try { onState({ ...state }); } catch { /* View errors cannot release a payment lock. */ }
    }
  };
  const failWallet = event => {
    try { event?.paymentFailed?.({ reason: "fail" }); } catch { /* Never log payment objects. */ }
  };

  async function reconcile() {
    if (!active || paid) return;
    notify("checking", "checking");
    try {
      const result = await onReconcile({ orderId: validated.orderId });
      if (!active) return;
      // Require the authenticated server's exact order binding, including on a
      // recovered response. Missing or stale identity is never paid evidence.
      if (result?.ok === true && result?.paid === true
        && result.orderId === validated.orderId) {
        paid = true;
        notify("paid", "paid");
        try { Promise.resolve(onPaid(result)).catch(() => {}); } catch { /* A failed navigation cannot undo payment confirmation. */ }
      } else {
        notify("pending", result?.ok === true ? "pending" : "statusUnavailable");
      }
    } catch {
      if (active) notify("pending", "statusUnavailable");
    }
  }

  return {
    getState: () => ({ ...state }),
    dispose() { active = false; },
    async confirm(walletEvent) {
      if (!active || busy || submitted || paid) {
        failWallet(walletEvent);
        return { ignored: true };
      }
      const stripe = getStripe();
      const elements = getElements();
      if (!stripe || typeof stripe.confirmPayment !== "function" || !elements || typeof elements.submit !== "function") {
        failWallet(walletEvent);
        notify("error", "unavailable");
        return { ignored: true };
      }
      busy = true; // Synchronous lock covers card and wallet callbacks together.
      notify("confirming", "confirming");
      let confirmationStarted = false;
      try {
        const submission = await elements.submit();
        if (!active) return { ignored: true };
        if (submission?.error) {
          failWallet(walletEvent);
          notify("error", "paymentError");
          return { submitted: false };
        }
        confirmationStarted = true;
        const result = await stripe.confirmPayment({
          elements,
          confirmParams: { return_url: returnUrl },
          redirect: "if_required",
        });
        if (!active) return { ignored: true };
        if (result?.error) {
          failWallet(walletEvent);
          if (["card_error", "validation_error"].includes(result.error.type)) {
            notify("error", "paymentError");
            return { submitted: false };
          }
          // Transport/API errors can follow a successful charge. Recover the
          // status; do not offer a second confirmation while it is uncertain.
          submitted = true;
          await reconcile();
          return { submitted: true };
        }
        if (result?.paymentIntent?.status === "requires_payment_method") {
          failWallet(walletEvent);
          notify("error", "paymentError");
          return { submitted: false };
        }
        submitted = true; // Includes processing/succeeded and unknown redirect outcomes.
        await reconcile();
        return { submitted: true };
      } catch {
        failWallet(walletEvent);
        if (!active) return { ignored: true };
        if (confirmationStarted) {
          submitted = true;
          await reconcile();
        } else {
          notify("error", "paymentError");
        }
        return { submitted };
      } finally {
        busy = false;
        if (active) notify(state.phase, state.messageKey);
      }
    },
    async checkStatus() {
      if (!active || busy || paid || !submitted) return { ignored: true };
      busy = true;
      try { await reconcile(); }
      finally {
        busy = false;
        if (active) notify(state.phase, state.messageKey);
      }
      return { paid };
    },
  };
}
