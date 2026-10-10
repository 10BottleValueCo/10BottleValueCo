// Server-only referral verification. Rates and provenance are private release
// configuration; browser totals, owner email and commission are never authority.
export class AffiliateQuoteError extends Error {
  constructor(status = 503, code = 'MERIT_AFFILIATE_UNAVAILABLE') {
    super(status === 409
      ? 'This referral code is unavailable for this checkout. Remove the code or contact support before paying.'
      : 'Referral verification is temporarily unavailable. Please try again.');
    this.status = status; this.code = code;
  }
}
export function readAffiliateRules(value) {
  let rule; try { rule = typeof value === 'string' ? JSON.parse(value) : value; } catch {}
  if (!rule || !rule.version || !rule.source || !rule.status || rule.currency !== 'USD'
    || !Array.isArray(rule.approvedCodes) || !rule.approvedCodes.length || rule.approvedCodes.length > 1000
    || rule.approvedCodes.some(code => !/^[A-Z0-9_-]{1,64}$/.test(code))
    || rule.unit !== 'basis_points' || !Number.isFinite(Date.parse(rule.effectiveFrom))
    || Date.parse(rule.effectiveFrom) > Date.now()
    || (rule.effectiveUntil && (!Number.isFinite(Date.parse(rule.effectiveUntil)) || Date.parse(rule.effectiveUntil) <= Date.now()))
    || ![rule.firstOrderDiscountBps, rule.commissionBps].every(n => Number.isSafeInteger(n) && n >= 0 && n <= 10000)) {
    throw new AffiliateQuoteError(409, 'MERIT_AFFILIATE_UNVERIFIED');
  }
  return { version: rule.version, source: rule.source, status: rule.status, unit: rule.unit, currency: rule.currency,
    effectiveFrom: rule.effectiveFrom, effectiveUntil: rule.effectiveUntil || null,
    firstOrderDiscountBps: rule.firstOrderDiscountBps, commissionBps: rule.commissionBps, approvedCodes: [...new Set(rule.approvedCodes)] };
}
export async function verifyAffiliateQuote({ code, email, disabled = false, supabaseUrl, serviceRoleKey, rules, fetcher = fetch }) {
  const rule = readAffiliateRules(rules);
  if (!supabaseUrl || !serviceRoleKey) throw new AffiliateQuoteError();
  if (!/^[A-Z0-9_-]{1,64}$/.test(code) || !rule.approvedCodes.includes(code)) throw new AffiliateQuoteError(409);
  async function rows(table, params) {
    try {
      const res = await fetcher(`${supabaseUrl.replace(/\/+$/, '')}/rest/v1/${table}?${new URLSearchParams(params)}`, {
        method: 'GET', headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` }, signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (!Array.isArray(data)) throw new Error();
      return data;
    } catch { throw new AffiliateQuoteError(); }
  }
  const affiliates = await rows('affiliates', { code: `eq.${code}`, select: 'code,email,active', limit: '2' });
  if (affiliates.length > 1) throw new AffiliateQuoteError();
  const selected = affiliates[0];
  if (!selected || selected.code !== code || selected.active === false || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(selected.email || '')
    || ![true, false, null].includes(selected.active) || selected.email.trim().toLowerCase() === email) throw new AffiliateQuoteError(409);
  const attribution = await rows('affiliate_customers', { email: `eq.${email}`, select: 'affiliate_code', limit: '2' });
  if (attribution.length > 1 || attribution.some(row => !/^[A-Z0-9_-]{1,64}$/.test(row.affiliate_code || ''))) throw new AffiliateQuoteError();
  let attributionCode = attribution[0]?.affiliate_code || code;
  // Card referrals already recorded in a protected paid order retain their owner
  // even before a separate legacy affiliate ledger is populated.
  const purchases = await rows('orders', { email: `eq.${email}`, status: 'in.(paid,done,processing,shipped,delivered,refunded)',
    select: 'id,metadata', order: 'created_at.asc', limit: '1' });
  if (purchases.length > 1 || purchases.some(row => typeof row.id !== 'string' || !row.id)) throw new AffiliateQuoteError();
  const previousCode = purchases[0]?.metadata?.affiliateCode;
  if (!attribution.length && /^[A-Z0-9_-]{1,64}$/.test(previousCode || '')) attributionCode = previousCode;
  if (!rule.approvedCodes.includes(attributionCode)) throw new AffiliateQuoteError(409);
  return { code: attributionCode, discountBps: disabled || purchases.length ? 0 : rule.firstOrderDiscountBps,
    commissionBps: rule.commissionBps, rule };
}
