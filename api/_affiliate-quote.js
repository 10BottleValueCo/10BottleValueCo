// Server-only referral verification. Rates and provenance are private release
// configuration; browser totals, owner email and commission are never authority.
export class AffiliateQuoteError extends Error {
  constructor(status = 503, code = status === 409 ? 'MERIT_AFFILIATE_UNAVAILABLE' : 'MERIT_AFFILIATE_LOOKUP_UNAVAILABLE') {
    super(status === 409
      ? 'This referral code is unavailable for this checkout. Remove the code or contact support before paying.'
      : 'Referral verification is temporarily unavailable. Please try again.');
    this.status = status; this.code = code;
  }
}
export function readAffiliateRules(value) {
  let rule; try { rule = typeof value === 'string' ? JSON.parse(value) : value; } catch {}
  if (!rule || !rule.version || !rule.source || !['operator_report', 'confirmed_terms'].includes(rule.status) || rule.currency !== 'USD'
    || !['allowlist', 'active_registry'].includes(rule.approvalMode || 'allowlist')
    || ((rule.approvalMode || 'allowlist') === 'allowlist' && (!Array.isArray(rule.approvedCodes) || !rule.approvedCodes.length || rule.approvedCodes.length > 1000
      || rule.approvedCodes.some(code => !/^[A-Z0-9_-]{1,64}$/.test(code))))
    || rule.unit !== 'basis_points' || !Number.isFinite(Date.parse(rule.effectiveFrom))
    || Date.parse(rule.effectiveFrom) > Date.now()
    || (rule.effectiveUntil && (!Number.isFinite(Date.parse(rule.effectiveUntil)) || Date.parse(rule.effectiveUntil) <= Date.now()))
    || rule.firstOrderDiscountBps !== 500 || rule.commissionBps !== 1000) {
    throw new AffiliateQuoteError(503, 'MERIT_AFFILIATE_RULES_UNAVAILABLE');
  }
  return { version: rule.version, source: rule.source, status: rule.status, unit: rule.unit, currency: rule.currency,
    effectiveFrom: rule.effectiveFrom, effectiveUntil: rule.effectiveUntil || null,
    firstOrderDiscountBps: rule.firstOrderDiscountBps, commissionBps: rule.commissionBps, approvalMode: rule.approvalMode || 'allowlist', approvedCodes: [...new Set(rule.approvedCodes || [])] };
}
export async function verifyAffiliateQuote({ code, email, disabled = false, supabaseUrl, serviceRoleKey, rules, fetcher = fetch }) {
  code = String(code || '').trim().toUpperCase();
  email = String(email || '').trim().toLowerCase();
  const rule = readAffiliateRules(rules);
  const approved = value => rule.approvalMode === 'active_registry' || rule.approvedCodes.includes(value);
  if (!supabaseUrl || !serviceRoleKey) throw new AffiliateQuoteError();
  if (!/^[A-Z0-9_-]{1,64}$/.test(code) || !approved(code)) throw new AffiliateQuoteError(409);
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
  const affiliateRows = selectedCode => rows('affiliates', { code: affiliateCodeFilter(selectedCode), select: 'code,email,active', limit: '2' });
  const [affiliates, attribution, purchases] = await Promise.all([
    affiliateRows(code),
    rows('affiliate_customers', { email: `eq.${email}`, select: 'affiliate_code', limit: '2' }),
    rows('orders', { email: `eq.${email}`, status: 'in.(paid,done,processing,shipped,delivered,refunded)',
      select: 'id,metadata', order: 'created_at.asc', limit: '1' }),
  ]);
  function verifyOwner(records, selectedCode) {
    if (records.length > 1 || records.some(row => !row || typeof row !== 'object')) throw new AffiliateQuoteError();
    const selected = records[0];
    if (!selected || String(selected.code || '').trim().toUpperCase() !== selectedCode || selected.active !== true
      || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(selected.email || '')
      || selected.email.trim().toLowerCase() === email) throw new AffiliateQuoteError(409);
    return selected.email.trim().toLowerCase();
  }
  let ownerEmail = verifyOwner(affiliates, code);
  if (attribution.length > 1 || attribution.some(row => !/^[A-Z0-9_-]{1,64}$/i.test(row.affiliate_code || ''))) throw new AffiliateQuoteError();
  let attributionCode = String(attribution[0]?.affiliate_code || code).trim().toUpperCase();
  // Card referrals already recorded in a protected paid order retain their owner
  // even before a separate legacy affiliate ledger is populated.
  if (purchases.length > 1 || purchases.some(row => typeof row.id !== 'string' || !row.id)) throw new AffiliateQuoteError();
  const previousCode = String(purchases[0]?.metadata?.affiliateCode || '').trim().toUpperCase();
  if (!attribution.length && /^[A-Z0-9_-]{1,64}$/.test(previousCode || '')) attributionCode = previousCode;
  if (!approved(attributionCode)) throw new AffiliateQuoteError(409);
  // Historical metadata and attribution rows are evidence of a proposed owner,
  // never authority to pay an unknown, inactive or self-referring account.
  if (attributionCode !== code) ownerEmail = verifyOwner(await affiliateRows(attributionCode), attributionCode);
  return { code: attributionCode, ownerEmail, discountBps: disabled || purchases.length ? 0 : rule.firstOrderDiscountBps,
    commissionBps: rule.commissionBps, rule };
}

// Escape SQL LIKE wildcards: a literal underscore must never match another code.
export function affiliateCodeFilter(code) {
  return `ilike.${String(code).replace(/_/g, '\\_')}`;
}
