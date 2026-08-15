// Server-side promo code verification.
// Mirrors the promo codes defined in App.jsx's `promoCatalog` (static codes)
// plus admin-issued personal codes stored in Supabase's `user_promos` table.
//
// This exists so the server never has to trust a client-submitted promo
// discount amount/rate — it looks up the real code and applies its real rate.

const STATIC_PROMO_CODES = {
  REVIEW10: { rate: 0.1, freeShipping: false },
  OWNERFREESHIP: { rate: 0, freeShipping: true, emailLock: "support@10bottlevalue.co" },
};

async function lookupUserPromo({ code, email, sbUrl, sbKey }) {
  if (!sbUrl || !sbKey || !email) return null;
  try {
    const url =
      `${sbUrl}/rest/v1/user_promos?code=eq.${encodeURIComponent(code)}` +
      `&email=eq.${encodeURIComponent(String(email).trim().toLowerCase())}` +
      `&used=eq.false&select=rate,used`;
    const res = await fetch(url, {
      headers: { apikey: sbKey, Authorization: `Bearer ${sbKey}` },
    });
    if (!res.ok) return null;
    const rows = await res.json();
    if (Array.isArray(rows) && rows.length > 0) {
      const rate = Number(rows[0].rate);
      if (Number.isFinite(rate) && rate > 0 && rate <= 1) {
        return { rate, freeShipping: false };
      }
    }
  } catch {
    // Network/Supabase errors fail closed (no discount) rather than trusting the client.
  }
  return null;
}

// Returns { rate, freeShipping } for a verified promo code, or null if invalid/unverifiable.
async function verifyPromoCode({ code, email, sbUrl, sbKey }) {
  const normalized = String(code || "").trim().toUpperCase();
  if (!normalized) return null;

  const staticPromo = STATIC_PROMO_CODES[normalized];
  if (staticPromo) {
    if (staticPromo.emailLock && String(email || "").trim().toLowerCase() !== staticPromo.emailLock.toLowerCase()) {
      return null;
    }
    return { rate: staticPromo.rate, freeShipping: !!staticPromo.freeShipping };
  }

  return lookupUserPromo({ code: normalized, email, sbUrl, sbKey });
}

export { verifyPromoCode };
