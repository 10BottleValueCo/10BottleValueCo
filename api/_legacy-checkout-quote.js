import { validateAndPriceItems, getShippingPrice, getAutomaticDiscountRate } from './_catalog.js';
import { verifyPromoCode } from './_promo.js';
import { verifyAffiliateQuote } from './_affiliate-quote.js';

const money = n => Math.round(n * 100) / 100;
export async function legacyCheckoutQuote(body, email, { crypto = false } = {}) {
  const { pricedItems, subtotal, regularSubtotal } = validateAndPriceItems(body.items);
  const sbUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  let promoDiscount = 0, discountRule = null, freeShipping = false;
  if (String(body.promoCode || '').trim()) {
    const promo = await verifyPromoCode({ code: body.promoCode, email, sbUrl, sbKey, subtotalCents: Math.round(subtotal * 100) });
    if (!promo) throw Object.assign(new Error('This promo code is unavailable. Review or remove it before paying.'), { status: 400, code: 'PROMO_UNAVAILABLE' });
    promoDiscount = money(subtotal * promo.rate); discountRule = promo.rule; freeShipping = !!promo.freeShipping;
  }
  let affiliate = null;
  const code = String(body.affiliateCode || '').trim().toUpperCase();
  if (code) affiliate = await verifyAffiliateQuote({ code, email, disabled: !!promoDiscount || body.affiliateDiscountDisabled === true,
    supabaseUrl: sbUrl, serviceRoleKey: sbKey, rules: process.env.MERIT_AFFILIATE_RULES_JSON });
  const auto = money(subtotal * getAutomaticDiscountRate(subtotal));
  const referral = money(subtotal * (affiliate?.discountBps || 0) / 10000);
  const finalAutomaticDiscount = promoDiscount || referral > auto ? 0 : auto;
  const finalAffiliateDiscount = promoDiscount || auto >= referral ? 0 : referral;
  const shipping = pricedItems.length === 0 || freeShipping || regularSubtotal === 0 ? 0
    : getShippingPrice(regularSubtotal, body.shippingType === 'express' ? 'express' : 'standard');
  const beforeCrypto = money(Math.max(0, subtotal - promoDiscount - finalAutomaticDiscount - finalAffiliateDiscount + shipping));
  const cryptoDiscount = crypto ? money(beforeCrypto * 0.025) : 0;
  const total = money(beforeCrypto - cryptoDiscount);
  return { pricedItems, subtotal, regularSubtotal, promoDiscount, discountRule, finalAutomaticDiscount, finalAffiliateDiscount,
    shipping, cryptoDiscount, total, affiliateCode: code, affiliateAttributionCode: affiliate?.code || '',
    affiliateOwnerEmail: affiliate?.ownerEmail || '', affiliateCommission: money(subtotal * (affiliate?.commissionBps || 0) / 10000),
    affiliateRuleVersion: affiliate?.rule.version || null };
}

// This check runs before a reservation, quote write or provider invoice creation.
export function assertExpectedTotal(expected, total) {
  if (typeof expected !== 'number' || !Number.isFinite(expected) || expected <= 0) {
    throw Object.assign(new Error('Refresh the page to review the current checkout total before paying.'), { status: 409, code: 'CHECKOUT_REFRESH_REQUIRED' });
  }
  if (Math.round(expected * 100) !== Math.round(total * 100)) {
    throw Object.assign(new Error(`Your checkout total is now $${total.toFixed(2)}. Review the updated discounts and total before continuing. Payment has not started.`),
      { status: 409, code: 'CHECKOUT_QUOTE_CHANGED', total });
  }
}
