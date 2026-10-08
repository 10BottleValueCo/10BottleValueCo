import { createHash } from "node:crypto";
import {
  getAutomaticDiscountRate,
  getShippingPrice,
  validateAndPriceItems,
} from "./_catalog.js";
import { requireVerifiedCustomer } from "./_require-customer.js";

const STATIC_PROMOS = {
  REVIEW10: { rate: 0.1, freeShipping: false },
  OWNERFREESHIP: {
    rate: 0,
    freeShipping: true,
    emailLock: "support@10bottlevalue.co",
  },
};
const EXPRESS_COUNTRIES = new Set([
  "United States",
  "Puerto Rico",
  "Australia",
  "Colombia",
]);
const ADMIN_EMAIL = "support@10bottlevalue.co";

class CheckoutError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function cleanString(value, field, maxLength, required = false) {
  if (typeof value !== "string") {
    if (required) throw new CheckoutError(400, `Enter your ${field}.`);
    return "";
  }
  const cleaned = value.trim();
  if (cleaned.length > maxLength || (required && !cleaned)) {
    throw new CheckoutError(400, `Check your ${field} and try again.`);
  }
  return cleaned;
}

function getSupabaseConfig() {
  return {
    url: String(
      process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "",
    ).replace(/\/+$/, ""),
    key: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  };
}

async function supabaseServiceJson(path, options = {}) {
  const { url, key } = getSupabaseConfig();
  if (!url || !key) {
    throw new CheckoutError(
      503,
      "Store Credit checkout is not configured on the server.",
    );
  }

  const response = await fetch(`${url}/rest/v1/${path}`, {
    method: options.method || "GET",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...(options.body === undefined
      ? {}
      : { body: JSON.stringify(options.body) }),
    signal: AbortSignal.timeout(10000),
  });
  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }
  if (!response.ok) {
    const error = new Error("Supabase request failed.");
    error.status = response.status;
    throw error;
  }
  return data;
}

function readCheckoutInput(body, customerEmail) {
  const checkout = body.checkoutForm;
  if (!checkout || typeof checkout !== "object" || Array.isArray(checkout)) {
    throw new CheckoutError(400, "Checkout details are incomplete.");
  }

  const phone = cleanString(checkout.phone, "phone number", 40, true);
  const phoneDigits = phone.replace(/\D/g, "");
  if (
    phoneDigits.length < 7 ||
    phoneDigits.length > 15 ||
    new Set(phoneDigits).size < 3
  ) {
    throw new CheckoutError(400, "Check your phone number and try again.");
  }

  const form = {
    firstName: cleanString(checkout.firstName, "first name", 100, true),
    lastName: cleanString(checkout.lastName, "last name", 100, true),
    country: cleanString(checkout.country, "country", 100, true),
    address: cleanString(checkout.address, "address", 250, true),
    address2: cleanString(checkout.address2, "address line 2", 250),
    city: cleanString(checkout.city, "city", 100, true),
    state: cleanString(checkout.state, "state or region", 100),
    postalCode: cleanString(checkout.postalCode, "postal code", 40, true),
    phone,
    taxId: cleanString(checkout.taxId, "tax ID", 40),
  };
  if (
    form.country === "Mexico" &&
    !/^\d{12,13}$/.test(form.taxId.replace(/\s/g, ""))
  ) {
    throw new CheckoutError(400, "Enter a valid tax ID for this address.");
  }

  const shippingType = body.shippingType;
  if (
    shippingType !== "standard" &&
    shippingType !== "express" &&
    shippingType !== "us-warehouse"
  ) {
    throw new CheckoutError(400, "Select a valid shipping method.");
  }
  if (shippingType === "express" && !EXPRESS_COUNTRIES.has(form.country)) {
    throw new CheckoutError(
      400,
      "Express shipping is unavailable for this destination.",
    );
  }

  const rawItems = body.items;
  if (!Array.isArray(rawItems) || rawItems.length === 0 || rawItems.length > 100) {
    throw new CheckoutError(400, "Your cart is empty or invalid.");
  }
  const items = rawItems.map((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new CheckoutError(400, "Your cart contains an invalid item.");
    }
    return {
      name: cleanString(item.name, "product name", 160, true),
      dose: cleanString(item.dose, "product size", 80, true),
      quantity: item.quantity,
      ...(item.fromWarehouse ? { fromWarehouse: item.fromWarehouse } : {}),
      ...(item.noteLabel
        ? { noteLabel: cleanString(item.noteLabel, "product option", 80) }
        : {}),
    };
  });
  if (
    shippingType === "us-warehouse" &&
    !items.every((item) => item.fromWarehouse === "us")
  ) {
    throw new CheckoutError(400, "Refresh the cart and select shipping again.");
  }
  if (
    items.some((item) => item.fromWarehouse === "us") &&
    form.country !== "United States"
  ) {
    throw new CheckoutError(
      400,
      "US warehouse products can only be shipped to the United States.",
    );
  }
  const ownerFreeShipping = body.ownerFreeShipping === true;
  if (ownerFreeShipping && customerEmail !== ADMIN_EMAIL) {
    throw new CheckoutError(400, "That shipping adjustment is not valid.");
  }

  const promoCode = cleanString(body.promoCode || "", "promo code", 80)
    .toUpperCase();
  if (promoCode && !/^[A-Z0-9_-]+$/.test(promoCode)) {
    throw new CheckoutError(400, "That promo code is not valid.");
  }
  const affiliateCode = cleanString(
    body.affiliateCode || "",
    "affiliate code",
    80,
  ).toUpperCase();
  if (affiliateCode && !/^[A-Z0-9_-]+$/.test(affiliateCode)) {
    throw new CheckoutError(400, "That affiliate code is not valid.");
  }
  const affiliateDiscountDisabled = body.affiliateDiscountDisabled === true;
  const paymentMethod = cleanString(
    body.paymentMethod || "",
    "payment method",
    40,
  ).toLowerCase();
  const orderNotes = cleanString(body.orderNotes || "", "order notes", 2000);
  const requestedStoreCredit = Number(body.storeCreditUsed);
  if (!Number.isFinite(requestedStoreCredit) || requestedStoreCredit <= 0) {
    throw new CheckoutError(400, "Store Credit must cover the full order.");
  }
  const requestedCents = Math.round(requestedStoreCredit * 100);

  const attestation = body.purchaserAttestation;
  if (
    attestation?.over21AndResearchUseOnly !== true ||
    attestation?.qualifiedResearcherOrLicensedProfessional !== true ||
    attestation?.noHumanOrAnimalUse !== true ||
    attestation?.policiesAccepted !== true
  ) {
    throw new CheckoutError(
      400,
      "Confirm all purchaser attestations before placing the order.",
    );
  }

  const orderId = cleanString(body.orderId, "order number", 40, true);
  if (!/^INV-[A-F0-9]{32}$/i.test(orderId)) {
    throw new CheckoutError(400, "The checkout request has expired. Try again.");
  }

  const fingerprintInput = {
    customerEmail,
    items,
    shippingType,
    paymentMethod,
    promoCode,
    affiliateCode,
    affiliateDiscountDisabled,
    ownerFreeShipping,
    requestedCents,
    checkoutForm: form,
    orderNotes,
    purchaserAttestation: {
      over21AndResearchUseOnly: true,
      qualifiedResearcherOrLicensedProfessional: true,
      noHumanOrAnimalUse: true,
      policiesAccepted: true,
    },
  };
  const checkoutFingerprint = createHash("sha256")
    .update(JSON.stringify(fingerprintInput))
    .digest("hex");

  return {
    orderId,
    items,
    form,
    shippingType,
    paymentMethod,
    promoCode,
    affiliateCode,
    affiliateDiscountDisabled,
    ownerFreeShipping,
    orderNotes,
    requestedCents,
    checkoutFingerprint,
  };
}

async function findExistingOrder(orderId) {
  const rows = await supabaseServiceJson(
    `orders?select=id,email,status,metadata&id=eq.${encodeURIComponent(orderId)}&limit=1`,
  );
  if (!Array.isArray(rows)) {
    throw new CheckoutError(503, "Could not verify this checkout attempt.");
  }
  return rows[0] || null;
}

function getMetadata(value) {
  if (value && typeof value === "object" && !Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? parsed
        : null;
    } catch {}
  }
  return null;
}

async function verifyPromo({ code, email }) {
  if (!code) return { rate: 0, freeShipping: false, userPromoId: null };

  const fixed = STATIC_PROMOS[code];
  if (fixed) {
    if (fixed.emailLock && normalizeEmail(email) !== fixed.emailLock) {
      throw new CheckoutError(400, "That promo code is not valid.");
    }
    return { ...fixed, userPromoId: null };
  }

  // Dynamic promotion and affiliate records still have legacy public writers.
  // Do not let them price a newly enabled credit-funded order.
  throw new CheckoutError(409, "This promo code needs verification before Store Credit checkout. Remove the code or contact support.");
}

async function verifyAffiliate({ code }) {
  if (!code) return null;
  throw new CheckoutError(409, "This affiliate code needs verification before Store Credit checkout. Remove the code or contact support.");
}

function errorForRpcCode(code) {
  const messages = {
    INSUFFICIENT_CREDIT: "Your Store Credit no longer covers this order.",
    CREDIT_ROW_AMBIGUOUS:
      "We could not safely verify your Store Credit. Please contact support.",
    MERIT_CREDIT_BALANCE_UNAVAILABLE:
      "We could not safely verify your Store Credit balance. Please contact support.",
    MERIT_CREDIT_PENDING:
      "A previous Store Credit checkout needs reconciliation. Contact support before starting another payment.",
    PROMO_ALREADY_USED: "That promo code has already been used.",
    ORDER_ID_CONFLICT: "This checkout request was already used. Refresh and try again.",
  };
  return messages[code] || "Store Credit checkout could not be completed.";
}

async function completeCreditCheckout({ input, customerEmail, customerId, order, amount, userPromoId = null }) {
  const resultData = await supabaseServiceJson("rpc/checkout_store_credit", {
    method: "POST",
    body: { p_customer_email: customerEmail, p_order: order,
      p_store_credit_used: amount, p_user_promo_id: userPromoId, p_customer_id: customerId },
  });
  const result = Array.isArray(resultData) && resultData.length === 1 ? resultData[0] : resultData;
  if (!result || result.ok !== true) throw new CheckoutError(409, errorForRpcCode(String(result?.error || "")));
  const balance = result.balance;
  const savedOrder = getMetadata(result.order);
  if (!savedOrder || result.orderId !== input.orderId || savedOrder.id !== input.orderId
    || savedOrder.email !== customerEmail || savedOrder.paymentProvider !== "StoreCredit"
    || savedOrder.status !== "paid" || savedOrder.total !== 0
    || savedOrder.checkoutFingerprint !== input.checkoutFingerprint
    || typeof savedOrder.storeCreditUsed !== "number" || Math.round(savedOrder.storeCreditUsed * 100) !== input.requestedCents
    || typeof balance !== "number" || !Number.isFinite(balance) || balance < 0
    || !Number.isSafeInteger(Math.round(balance * 100)) || Math.abs(balance * 100 - Math.round(balance * 100)) > 1e-7
    || typeof result.replayed !== "boolean") throw new CheckoutError(503, "The order result could not be confirmed.");
  return { ok: true, order: savedOrder, balance, replayed: result.replayed };
}

async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method not allowed." });
  }

  const customer = await requireVerifiedCustomer(req, res);
  if (!customer) return;

  try {
    const { url, key } = getSupabaseConfig();
    if (!url || !key) {
      throw new CheckoutError(
        503,
        "Store Credit checkout is not configured on the server.",
      );
    }

    const body =
      req.body && typeof req.body === "object" && !Array.isArray(req.body)
        ? req.body
        : {};
    const input = readCheckoutInput(body, customer.email);

    // Return a completed request after a lost client response without consuming
    // Store Credit a second time.
    const existingOrder = await findExistingOrder(input.orderId);
    if (existingOrder) {
      const metadata = getMetadata(existingOrder.metadata);
      const balance = Number(metadata?.storeCreditBalanceAfter);
      if (
        normalizeEmail(existingOrder.email) === customer.email &&
        String(existingOrder.status).toLowerCase() === "paid" &&
        metadata?.paymentProvider === "StoreCredit" &&
        metadata?.checkoutFingerprint === input.checkoutFingerprint &&
        Number.isFinite(balance)
      ) {
        // Public order metadata is only a lookup hint. The private ledger must
        // acknowledge this exact completed attempt before it is shown as paid.
        const result = await completeCreditCheckout({ input, customerEmail: customer.email, customerId: customer.id,
          order: metadata, amount: input.requestedCents / 100 });
        if (!result.replayed) throw new CheckoutError(503, "The order result could not be confirmed.");
        return res.status(200).json(result);
      }
      return res.status(409).json({
        ok: false,
        error: "This checkout request was already used. Refresh and try again.",
      });
    }

    let priced;
    try {
      priced = validateAndPriceItems(input.items);
    } catch (error) {
      throw new CheckoutError(400, error.message);
    }
    const { pricedItems, subtotal, regularSubtotal } = priced;
    const promo = await verifyPromo({
      code: input.promoCode,
      email: customer.email,
    });
    const affiliate = await verifyAffiliate({
      code: input.affiliateCode,
      email: customer.email,
    });

    const automaticRate = getAutomaticDiscountRate(subtotal);
    const automaticAmount = roundMoney(subtotal * automaticRate);
    const promoAmount = roundMoney(subtotal * promo.rate);
    const affiliateRate =
      promo.rate === 0 &&
      !input.affiliateDiscountDisabled &&
      affiliate?.firstTimeBuyer
        ? 0.05
        : 0;
    const automaticWins =
      promo.rate > 0 || !affiliateRate || automaticRate >= affiliateRate;
    const automaticDiscount =
      promo.rate === 0 && automaticWins ? automaticAmount : 0;
    const affiliateDiscount =
      promo.rate === 0 && affiliateRate > 0 && !automaticWins
        ? roundMoney(subtotal * affiliateRate)
        : 0;
    const promoDiscount = promoAmount;

    const shipping =
      promo.freeShipping || input.ownerFreeShipping || regularSubtotal === 0
        ? 0
        : getShippingPrice(regularSubtotal, input.shippingType);
    const baseTotal = roundMoney(
      subtotal -
        automaticDiscount -
        promoDiscount -
        affiliateDiscount +
        shipping,
    );
    const cryptoDiscount =
      input.paymentMethod === "crypto" ? roundMoney(baseTotal * 0.025) : 0;
    // A fully credit-funded order has no card tender and no card surcharge.
    const storeCreditUsed = roundMoney(baseTotal - cryptoDiscount);
    if (storeCreditUsed <= 0) {
      throw new CheckoutError(400, "The order total must be greater than zero.");
    }
    if (Math.round(storeCreditUsed * 100) !== input.requestedCents) {
      throw new CheckoutError(
        409,
        "The checkout total changed. Refresh the cart and try again.",
      );
    }

    const paidAt = new Date().toISOString();
    const order = {
      id: input.orderId,
      email: customer.email,
      status: "paid",
      paymentProvider: "StoreCredit",
      paymentId: "",
      paidAt,
      confirmationEmailSentAt: "",
      createdAt: paidAt,
      shippingType: input.shippingType,
      firstName: input.form.firstName,
      lastName: input.form.lastName,
      country: input.form.country,
      address: input.form.address,
      address2: input.form.address2,
      city: input.form.city,
      state: input.form.state,
      postalCode: input.form.postalCode,
      phone: input.form.phone,
      taxId: input.form.taxId,
      purchaserAttestation: {
        over21AndResearchUseOnly: true,
        qualifiedResearcherOrLicensedProfessional: true,
        noHumanOrAnimalUse: true,
        policiesAccepted: true,
        acceptedAt: paidAt,
      },
      orderNotes: input.orderNotes,
      subtotal,
      shipping,
      automaticDiscount,
      promoDiscount,
      promoCode: input.promoCode,
      promoFreeShipping: Boolean(promo.freeShipping),
      affiliateDiscount,
      cryptoDiscount,
      storeCreditUsed,
      total: 0,
      affiliateCode: affiliate?.code || "",
      affiliateOwnerEmail: affiliate?.ownerEmail || "",
      affiliateCommission: affiliate
        ? roundMoney(subtotal * 0.1)
        : 0,
      items: pricedItems,
      checkoutFingerprint: input.checkoutFingerprint,
    };

    return res.status(200).json(await completeCreditCheckout({ input, customerEmail: customer.email, customerId: customer.id,
      order, amount: storeCreditUsed, userPromoId: promo.userPromoId }));
  } catch (error) {
    if (error instanceof CheckoutError) {
      return res.status(error.status).json({ ok: false, error: error.message });
    }
    if (typeof req.log?.error === "function") {
      req.log.error(
        { statusCode: error?.status || 0 },
        "Store Credit checkout dependency failed",
      );
    }
    return res.status(503).json({
      ok: false,
      error: "Store Credit checkout is temporarily unavailable.",
    });
  }
}

export default handler;
