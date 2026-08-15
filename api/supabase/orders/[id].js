const SUPABASE_URL = "https://danpkqqzcptamojrnrmk.supabase.co";
const ALLOWED_ORDER_STATUSES = new Set(["pending","paid","done","refunded","cancelled"]);

function getServiceKey() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  return key;
}

async function supabaseAdmin(path, options = {}) {
  const key = getServiceKey();
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: key, Authorization: `Bearer ${key}`,
      "Content-Type": "application/json", Prefer: "return=minimal",
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  if (!res.ok) {
    let msg = text;
    try { msg = JSON.parse(text)?.message || text; } catch {}
    throw new Error(`Supabase error ${res.status}: ${msg}`);
  }
  return text ? JSON.parse(text) : null;
}

export default async function handler(req, res) {
  if (req.method !== "PATCH") {
    res.setHeader("Allow", "PATCH");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }
  try {
    const { id } = req.query;
    if (!id) return res.status(400).json({ ok: false, error: "Missing order id" });
    const body = req.body || {};
    const update = {};
    if (Object.prototype.hasOwnProperty.call(body, "status")) {
      const status = String(body.status || "").toLowerCase();
      if (!ALLOWED_ORDER_STATUSES.has(status)) {
        return res.status(400).json({ ok: false, error: `Invalid status: ${status}` });
      }
      update.status = status;
    }
    if (Object.prototype.hasOwnProperty.call(body, "affiliate_commission_adjustment")) {
      const raw = Number(body.affiliate_commission_adjustment);
      if (!Number.isFinite(raw) || raw < 0) {
        return res.status(400).json({ ok: false, error: "must be non-negative number" });
      }
      update.affiliate_commission_adjustment = Number(raw.toFixed(2));
    }
    if (Object.keys(update).length === 0) {
      return res.status(400).json({ ok: false, error: "No supported fields to update" });
    }
    await supabaseAdmin(`orders?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH", body: JSON.stringify(update),
    });
    return res.status(200).json({ ok: true, updated: update });
  } catch (err) {
    console.error("orders/[id] PATCH failed:", err.message);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
