import { verifyAffiliateQuote } from './_affiliate-quote.js';

// Old invoices keep payment settlement independent from commission review.
// Unverified browser/provider fields can never establish a commission owner.
export async function settlementAffiliate(metadata, email, subtotal) {
  const none = { code: '', ownerEmail: '', commission: 0 };
  const code = String(metadata?.affiliateAttributionCode || metadata?.affiliateCode || '').trim().toUpperCase();
  if (!code) return none;
  if (metadata.affiliateQuoteVersion === 'server-referral-v1') {
    const commission = Number(metadata.affiliateCommission);
    if (/^[A-Z0-9_-]{1,64}$/.test(metadata.affiliateAttributionCode || '') && metadata.affiliateRuleVersion
      && Number.isFinite(commission) && commission >= 0 && commission <= Math.round(subtotal * .1 * 100) / 100)
      return { code: metadata.affiliateAttributionCode, ownerEmail: String(metadata.affiliateOwnerEmail || ''), commission };
    console.error('Affiliate settlement snapshot needs review');
    return none;
  }
  // Older payable invoices predate the verified snapshot. Resolve against the
  // active private registry instead of trusting their browser-supplied owner.
  try {
    const verified = await verifyAffiliateQuote({ code, email, disabled: true,
      supabaseUrl: process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY, rules: process.env.MERIT_AFFILIATE_RULES_JSON });
    return { code: verified.code, ownerEmail: verified.ownerEmail, commission: Math.round(subtotal * verified.commissionBps / 10000 * 100) / 100 };
  } catch {
    console.error('Historical affiliate commission needs review');
    return none;
  }
}
