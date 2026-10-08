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
  const query = new URLSearchParams({
    select: "code,rate",
    email: "eq.__PUBLIC__",
    code: `eq.${code}`,
    used: "eq.false",
    limit: "2",
  });

  let response;
  try {
    response = await fetch(`${url}/rest/v1/user_promos?${query}`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    throw new PromoCodeError(503, "Promo code validation is unavailable.");
  }

  if (!response.ok) {
    throw new PromoCodeError(503, "Promo code validation is unavailable.");
  }
  const rows = await response.json().catch(() => null);
  if (!Array.isArray(rows)) {
    throw new PromoCodeError(503, "Promo code validation is unavailable.");
  }
  return rows;
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
    if (rows.length > 1) {
      throw new PromoCodeError(409, "This promo code needs support review.");
    }

    const row = rows[0];
    const rate = Number(row?.rate);
    const promo =
      row &&
      Number.isFinite(rate) &&
      rate > 0 &&
      rate <= 1 &&
      String(row.code || "").trim().toUpperCase() === code
        ? { code, rate }
        : null;

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
