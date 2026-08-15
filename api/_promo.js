// Server-side promo code verification.
// Mirrors the promo codes defined in App.jsx's `promoCatalog` (static codes)
// plus admin-issued personal codes stored in Supabase's `user_promos` table.
//
// This exists so the server never has to trust a client-submitted promo
// discount amount/rate — it looks up the real code and applies its real rate.

const STATIC_PROMO_CODES = {
  REVIEW10:      { rate: 0.1, freeShipping: false },
  OWNERFREESHIP: { rate: 0,   freeShipping: true, emailLock: "support@10bottlevalue.co" },
};

async function lookupUserPromo({ code, email, sbUrl, sbKey }) {
  if (!sbUrl || !sbKey) return null;

  try {
    // Primary lookup: by code + email (ignore `used` — used flag is set by the
    // webhook AFTER payment succeeds, so during checkout it may already be true
    // if the user switched payment methods or retried).
    let url =
      `${sbUrl}/rest/v1/user_promos?code=eq.${encodeURIComponent(code)}` +
      `&select=rate,email,used`;

    if (email) {
      url += `&email=eq.${encodeURIComponent(String(email).trim().toLowerCase())}`;
    }

    const res = await fetch(url, {
      headers: { apikey: sbKey, Authorization: `Bearer ${sbKey}` },
    });

    if (!res.ok) {
      console.error(`[promo] Supabase lookup failed: HTTP ${res.status} for code=${code}`);
      return null;
    }

    const rows = await res.json();

    if (Array.isArray(rows) && rows.length > 0) {
      const rate = Number(rows[0].rate);
      if (Number.isFinite(rate) && rate > 0 && rate <= 1) {
        return { rate, freeShipping: false };
      }
    }

    // Fallback: if email was provided but found nothing, try without email
    // (handles case where stored email differs slightly from checkout email)
    if (email) {
      const fallbackUrl =
        `${sbUrl}/rest/v1/user_promos?code=eq.${encodeURIComponent(code)}&select=rate,email,used`;
      const fallbackRes = await fetch(fallbackUrl, {
        headers: { apikey: sbKey, Authorization: `Bearer ${sbKey}` },
      });
      if (fallbackRes.ok) {
        const fallbackRows = await fallbackRes.json();
        if (Array.isArray(fallbackRows) && fallbackRows.length > 0) {
          const rate = Number(fallbackRows[0].rate);
          if (Number.isFinite(rate) && rate > 0 && rate <= 1) {
            console.error(`[promo] Used fallback (no-email) lookup for code=${code}`);
            return { rate, freeShipping: false };
          }
        }
      }
    }
  } catch (err) {
    console.error(`[promo] lookupUserPromo error for code=${code}:`, err.message);
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
