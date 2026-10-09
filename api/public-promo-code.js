import { promoRows, promoFromRow } from "./_promo.js";
const CODE_PATTERN = /^[A-Z0-9_-]{1,80}$/;

class PromoCodeError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function setNoStore(res) {
  res.setHeader("Cache-Control", "no-store");
}

function normalizeCode(value) {
  const code = String(value || "").trim().toUpperCase();
  if (!CODE_PATTERN.test(code)) {
    throw new PromoCodeError(400, "Enter a valid promo code.");
  }
  return code;
}

function getSupabaseConfig() {
  const url = String(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "",
  ).replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url || !key) {
    throw new PromoCodeError(503, "Promo code validation is unavailable.");
  }
  return { url, key };
}

async function getPublicPromoRows(code) {
  const { url, key } = getSupabaseConfig();
  return promoRows({ code, email: "__PUBLIC__", sbUrl: url, sbKey: key });
}

export default async function handler(req, res) {
  setNoStore(res);
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, error: "Method not allowed." });
  }

  try {
    const code = normalizeCode(req.query?.code);
    const rows = await getPublicPromoRows(code);

    const subtotal = req.query?.subtotal === undefined ? undefined : Number(req.query.subtotal);
    if (subtotal !== undefined && (!Number.isFinite(subtotal) || subtotal < 0 || subtotal > 100000)) throw new PromoCodeError(400, "Invalid cart subtotal.");
    const benefit = promoFromRow(rows[0], { code, email: "__PUBLIC__", subtotalCents: subtotal === undefined ? undefined : Math.round(subtotal * 100) });
    const promo = benefit ? { code, rate: benefit.rate, minimumSubtotal: benefit.rule.minimumSubtotalCents / 100,
      startsAt: benefit.rule.startsAt, endsAt: benefit.rule.endsAt } : null;

    return res.status(200).json({ ok: true, promo });
  } catch (error) {
    const status = error instanceof PromoCodeError ? error.status : 503;
    if (status >= 500) {
      req.log?.error({ statusCode: status }, "Public promo-code lookup failed");
    }
    return res.status(status).json({
      ok: false,
      error:
        error instanceof PromoCodeError
          ? error.message
          : "Promo code validation is unavailable.",
    });
  }
}
