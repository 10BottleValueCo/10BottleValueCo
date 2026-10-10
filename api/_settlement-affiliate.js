import { discountAmount } from "../shared/checkout-money.js";
import { createHmac, timingSafeEqual } from "node:crypto";
import { verifyAffiliateQuote } from './_affiliate-quote.js';

// Old invoices keep payment settlement independent from commission review.
// Unverified browser/provider fields can never establish a commission owner.
export function signSettlementAffiliate(metadata, email, subtotal, orderId) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('Private quote signing is unavailable');
  return createHmac('sha256', key).update(JSON.stringify(['legacy-referral-quote-v1', orderId, email, subtotal,
    metadata.affiliateAttributionCode, metadata.affiliateOwnerEmail, metadata.affiliateCommission, metadata.affiliateRuleVersion])).digest('hex');
}
function verifiedSnapshot(metadata, email, subtotal, orderId) {
  if (!/^[a-f0-9]{64}$/.test(metadata.affiliateQuoteProof || '')) return false;
  try { return timingSafeEqual(Buffer.from(metadata.affiliateQuoteProof, 'hex'), Buffer.from(signSettlementAffiliate(metadata, email, subtotal, orderId), 'hex')); }
  catch { return false; }
}
export async function settlementAffiliate(metadata, email, subtotal, orderId, priorStatus) {
  const none = { code: '', ownerEmail: '', commission: 0 };
  const code = String(metadata?.affiliateAttributionCode || metadata?.affiliateCode || '').trim().toUpperCase();
  if (!code) return none;
  if (metadata.affiliateQuoteVersion === 'server-referral-v1' && verifiedSnapshot(metadata, email, subtotal, orderId)) {
    const commission = Number(metadata.affiliateCommission);
    if (/^[A-Z0-9_-]{1,64}$/.test(metadata.affiliateAttributionCode || '') && metadata.affiliateRuleVersion
      && Number.isFinite(commission) && commission >= 0 && commission <= discountAmount(subtotal, .1))
      return { code: metadata.affiliateAttributionCode, ownerEmail: String(metadata.affiliateOwnerEmail || ''), commission };
    console.error('Affiliate settlement snapshot needs review');
    return none;
  }
  if (String(priorStatus || '').trim().toLowerCase() !== 'checkout (clicked pay)') {
    console.error('Historical affiliate commission needs protected-quote review');
    return none;
  }
  // Older payable invoices predate the verified snapshot. Resolve against the
  // active private registry instead of trusting their browser-supplied owner.
  try {
    const verified = await verifyAffiliateQuote({ code, email, disabled: true,
      supabaseUrl: process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY, rules: process.env.MERIT_AFFILIATE_RULES_JSON });
    return { code: verified.code, ownerEmail: verified.ownerEmail, commission: discountAmount(subtotal, verified.commissionBps / 10000) };
  } catch {
    console.error('Historical affiliate commission needs review');
    return none;
  }
}
