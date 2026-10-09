// One private lookup for every payment method. The promo table is protected by
// 20261009040000_promo_affiliate_access_containment.sql; rates never come from
// checkout request bodies. Personal codes cannot fall through to other buyers.
export const STATIC_PROMO_CODES = Object.freeze({
  REVIEW10: { rate: 0.1, freeShipping: false },
  OWNERFREESHIP: { rate: 0, freeShipping: true, emailLock: "support@10bottlevalue.co" },
});
const CODE = /^[A-Z0-9_-]{1,80}$/;
const UUID = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const emailKey = value => String(value || "").trim().toLowerCase();

export class PromoLookupError extends Error {
  constructor(message = "Promo code validation is temporarily unavailable.") {
    super(message); this.status = 503; this.code = "PROMO_LOOKUP_UNAVAILABLE";
  }
}

export function promoFromRow(row, { code, email, now = Date.now(), subtotalCents } = {}) {
  if (!row || !UUID.test(row.id || "") || row.code !== code || row.used !== false
    || (row.email !== "__PUBLIC__" && emailKey(row.email) !== emailKey(email))) return null;
  const rate = Number(row.rate);
  if (!Number.isFinite(rate) || rate <= 0 || rate > 1 || row.active === false) return null;
  for (const field of ["starts_at", "ends_at"]) {
    if (row[field] != null && !Number.isFinite(Date.parse(row[field]))) return null;
  }
  if ((row.starts_at && now < Date.parse(row.starts_at)) || (row.ends_at && now >= Date.parse(row.ends_at))) return null;
  const minimum = row.minimum_subtotal_cents ?? 0;
  if (!Number.isSafeInteger(minimum) || minimum < 0 || (subtotalCents !== undefined && subtotalCents < minimum)) return null;
  return {
    code, rate, freeShipping: false, source: row.email === "__PUBLIC__" ? "public" : "personal",
    userPromoId: row.email === "__PUBLIC__" ? null : row.id,
    rule: { id: row.id, revision: row.revision ?? 1, rate, minimumSubtotalCents: minimum,
      startsAt: row.starts_at || null, endsAt: row.ends_at || null },
  };
}

export async function promoRows({ code, email, sbUrl, sbKey, fetcher = globalThis.fetch }) {
  if (!sbUrl || !sbKey) throw new PromoLookupError();
  const query = new URLSearchParams({ code: `eq.${code}`, email: `eq.${email}`, select: "*", used: "eq.false", limit: "2" });
  try {
    const response = await fetcher(`${String(sbUrl).replace(/\/+$/, "")}/rest/v1/user_promos?${query}`, {
      method: "GET", headers: { apikey: sbKey, Authorization: `Bearer ${sbKey}` },
      signal: AbortSignal.timeout(8000), redirect: "error",
    });
    if (!response.ok) throw new Error();
    const rows = await response.json();
    if (!Array.isArray(rows) || rows.length > 1) throw new Error();
    return rows;
  } catch { throw new PromoLookupError(); }
}

export async function verifyPromoCode({ code, email, sbUrl, sbKey, fetcher, now, subtotalCents }) {
  const normalized = String(code || "").trim().toUpperCase();
  if (!CODE.test(normalized)) return null;
  if (Object.hasOwn(STATIC_PROMO_CODES, normalized)) {
    const promo = STATIC_PROMO_CODES[normalized];
    if (promo.emailLock && emailKey(email) !== promo.emailLock) return null;
    return { ...promo, code: normalized, source: "static", userPromoId: null,
      rule: { id: normalized, revision: 1, rate: promo.rate, freeShipping: promo.freeShipping } };
  }
  const context = { code: normalized, email, now, subtotalCents };
  if (emailKey(email)) {
    const personal = await promoRows({ code: normalized, email: emailKey(email), sbUrl, sbKey, fetcher });
    if (personal.length) return promoFromRow(personal[0], context);
  }
  const publicRows = await promoRows({ code: normalized, email: "__PUBLIC__", sbUrl, sbKey, fetcher });
  return promoFromRow(publicRows[0], context);
}
