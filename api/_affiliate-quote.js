// Server-only referral verification. Rates and provenance are private release
// configuration; browser totals, owner email and commission are never authority.
export class AffiliateQuoteError extends Error {
  constructor(status = 503, code = status === 409 ? 'MERIT_AFFILIATE_UNAVAILABLE' : 'MERIT_AFFILIATE_LOOKUP_UNAVAILABLE', message) {
    super(message || (status === 409
      ? 'This referral code is unavailable for this checkout. Remove the code or contact support before paying.'
      : 'Referral verification is temporarily unavailable. Please try again.'));
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
export async function verifyAffiliateQuote({ code, email, customerId, disabled = false, ignoreUnattributedRepeatBuyerCode = false, supabaseUrl, serviceRoleKey, rules, fetcher = fetch }) {
  code = String(code || '').trim().toUpperCase();
  email = String(email || '').trim().toLowerCase();
  if (code && !/^[A-Z0-9_-]{1,64}$/.test(code)) throw new AffiliateQuoteError(409);
  let rule = code ? readAffiliateRules(rules) : null;
  const approved = value => !rule || rule.approvalMode === 'active_registry' || rule.approvedCodes.includes(value);
  if (code && !approved(code)) throw new AffiliateQuoteError(409);
  if (!supabaseUrl || !serviceRoleKey) throw new AffiliateQuoteError();
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
  // Legacy rows can use mixed-case/padded email and completed/paid_at states.
  // Broad database candidates are bounded and rechecked against exact identity
  // here; no candidate belonging to a different email/user can grant a benefit.
  const emailPattern = affiliateEmailFilter(email).slice(7);
  const identityFilter = /^[0-9a-f-]{36}$/i.test(customerId || '')
    ? { or: `(user_id.eq.${customerId},email.imatch."${emailPattern.replace(/[\\"]/g, value => `\\${value}`)}")` }
    : { email: `imatch.${emailPattern}` };
  const paidStates = new Set(['paid', 'done', 'completed', 'processing', 'shipped', 'delivered', 'refunded']);
  const isOwner = row => String(row?.email || '').trim().toLowerCase() === email
    || (customerId && String(row?.user_id || '').toLowerCase() === customerId.toLowerCase());
  async function previousPurchase() {
    for (let offset = 0; offset < 1000; offset += 100) {
      const batch = await rows('orders', { ...identityFilter, select: 'id,email,user_id,status,paid_at,metadata', order: 'created_at.asc,id.asc', limit: '100', offset: String(offset) });
      if (batch.some(row => !row || typeof row.id !== 'string' || (row.email !== null && typeof row.email !== 'string') || typeof row.status !== 'string')) throw new AffiliateQuoteError();
      const firstPaid = batch.find(row => isOwner(row)
        && (paidStates.has(row.status.trim().toLowerCase()) || (row.paid_at && Number.isFinite(Date.parse(row.paid_at)))));
      if (firstPaid) {
        const metadata = firstPaid.metadata && typeof firstPaid.metadata === 'object' && !Array.isArray(firstPaid.metadata)
          ? firstPaid.metadata
          : typeof firstPaid.metadata === 'string' ? (() => { try { return JSON.parse(firstPaid.metadata); } catch { return null; } })() : null;
        const historicalCode = String(metadata?.affiliateAttributionCode || metadata?.affiliateCode || '').trim().toUpperCase();
        return {
          firstPaid,
          code: /^[A-Z0-9_-]{1,64}$/.test(historicalCode) ? historicalCode : '',
        };
      }
      if (batch.length < 100) return { firstPaid: null, code: '' };
    }
    throw new AffiliateQuoteError();
  }
  async function previousAttribution() {
    const batch = await rows('affiliate_customers', { email: `imatch.${emailPattern}`, select: 'email,affiliate_code', limit: '100' });
    if (batch.length >= 100 || batch.some(row => !row || typeof row.email !== 'string')) throw new AffiliateQuoteError();
    return batch.filter(row => row.email.trim().toLowerCase() === email);
  }
  const [attribution, purchases] = await Promise.all([previousAttribution(), previousPurchase()]);
  if (attribution.length > 1 || attribution.some(row => !/^[A-Z0-9_-]{1,64}$/i.test(row.affiliate_code || ''))) throw new AffiliateQuoteError();
  if (purchases.firstPaid && (!purchases.firstPaid.id || typeof purchases.firstPaid.id !== 'string')) throw new AffiliateQuoteError();
  const savedCode = String(attribution[0]?.affiliate_code || '').trim().toUpperCase();
  const orderCode = purchases.code;
  const lockedCode = savedCode || orderCode;
  if (code && purchases.firstPaid && !lockedCode) {
    if (ignoreUnattributedRepeatBuyerCode) {
      return { code: '', ownerEmail: '', discountBps: 0, commissionBps: 0, rule: null, locked: false };
    }
    throw new AffiliateQuoteError(409, 'MERIT_AFFILIATE_FIRST_ORDER_ONLY',
      'An affiliate code can only be applied to your first paid order. This account already has a paid order.');
  }
  if (code && lockedCode && code !== lockedCode && !ignoreUnattributedRepeatBuyerCode) {
    throw new AffiliateQuoteError(409, 'MERIT_AFFILIATE_LOCKED',
      'This account is already linked to a different affiliate code.');
  }
  const effectiveCode = lockedCode || code;
  if (!effectiveCode) return { code: '', ownerEmail: '', discountBps: 0, commissionBps: 0, rule: null, locked: false };
  if (!rule) rule = readAffiliateRules(rules);
  const isApproved = value => rule.approvalMode === 'active_registry' || rule.approvedCodes.includes(value);
  if (!/^[A-Z0-9_-]{1,64}$/.test(effectiveCode) || !isApproved(effectiveCode)) throw new AffiliateQuoteError(409);
  const affiliates = await affiliateRows(effectiveCode);
  function verifyOwner(records, selectedCode) {
    if (records.length > 1 || records.some(row => !row || typeof row !== 'object')) throw new AffiliateQuoteError();
    const selected = records[0];
    if (!selected || String(selected.code || '').trim().toUpperCase() !== selectedCode || selected.active !== true
      || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(selected.email || '')
      || selected.email.trim().toLowerCase() === email) throw new AffiliateQuoteError(409);
    return selected.email.trim().toLowerCase();
  }
  // A paid order is the durable attribution record. It takes priority over any
  // later code entered by the customer, and can be found by account id or email.
  const ownerEmail = verifyOwner(affiliates, effectiveCode);
  return { code: effectiveCode, ownerEmail, discountBps: disabled || purchases.firstPaid ? 0 : rule.firstOrderDiscountBps,
    commissionBps: rule.commissionBps, rule, locked: Boolean(lockedCode) };
}

// Escape SQL LIKE wildcards: a literal underscore must never match another code.
export function affiliateCodeFilter(code) {
  return `ilike.${String(code).replace(/_/g, '\\_')}`;
}

// Match only the exact email plus legacy whitespace padding. A substring
// pattern would let unrelated addresses exhaust the bounded candidate window.
export function affiliateEmailFilter(email) {
  const literal = String(email).trim().toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return `imatch.^[[:space:]]*${literal}[[:space:]]*$`;
}
