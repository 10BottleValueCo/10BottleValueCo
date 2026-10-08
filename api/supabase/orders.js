import { requireAdmin } from "../_require-admin.js";

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
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
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

const ALLOWED_COLUMNS = new Set([
  "id",
  "email",
  "total",
  "status",
  "created_at",
  "metadata",
]);

function shapeRow(body) {
  if (!body || typeof body !== "object") return body;

  const keys = Object.keys(body);
  const onlyKnown = keys.every((key) => ALLOWED_COLUMNS.has(key));
  if (onlyKnown) return body;

  return {
    id: body.id,
    email: body.email,
    total: body.total,
    status: body.status || "pending",
    created_at: body.created_at || body.createdAt || new Date().toISOString(),
    metadata: body,
  };
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (!["GET", "POST"].includes(req.method)) {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }
  if (!(await requireAdmin(req, res))) return;

  try {
    if (req.method === "GET") {
      const data = await supabaseAdmin("orders?select=*&order=created_at.desc", {
        method: "GET",
        headers: { Prefer: "return=representation" },
      });
      return res.status(200).json({ ok: true, orders: Array.isArray(data) ? data : [] });
    }

    const row = shapeRow(req.body || {});
    await supabaseAdmin("orders", { method: "POST", body: JSON.stringify(row) });
    return res.status(201).json({ ok: true });
  } catch (err) {
    console.error("supabase/orders failed:", err.message);
    return res.status(500).json({ ok: false, error: "Order request failed" });
  }
}
