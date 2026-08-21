const SUPABASE_URL = "https://danpkqqzcptamojrnrmk.supabase.co";

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
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }
  try {
    await supabaseAdmin("affiliate_orders?on_conflict=order_id", {
      method: "POST",
      headers: { Prefer: "resolution=ignore-duplicates,return=minimal" },
      body: JSON.stringify(req.body || {}),
    });
    return res.status(201).json({ ok: true });
  } catch (err) {
    console.error("affiliate-orders POST failed:", err.message);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
