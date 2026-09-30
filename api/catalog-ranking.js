const FROM = "2026-04-01";
const PAGE_SIZE = 1000;
const CACHE_MS = 5 * 60 * 1000;

const aliases = {
  "retatrutide / glp-3": "GLP RT-3",
  retatrutide: "GLP RT-3",
  "glp-3-r": "GLP RT-3",
  "tirzepatide / glp-2": "GLP TZ-2",
  tirzepatide: "GLP TZ-2",
  "glp-2-t": "GLP TZ-2",
  semaglutide: "GLP SG-1",
  "glp-1-s": "GLP SG-1",
  "cagrilintide + semaglutide": "Cagrilintide + GLP SG-1",
  "cagrilintide + glp-1-s": "Cagrilintide + GLP SG-1",
  "bac water": "Reconstitution Solution",
  hgh: "10-GH",
  "ara290 (cibinetide)": "ARA290",
};

let cache = null;
let inFlight = null;

function todayInRiga() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Riga",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const part = (type) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

async function calculateRanking(through) {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase server configuration is missing");

  const units = new Map();
  const usUnits = new Map();
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const endpoint = new URL("/rest/v1/orders", url);
    endpoint.searchParams.set("select", "created_at,items,metadata");
    endpoint.searchParams.set("status", "in.(paid,done)");
    endpoint.searchParams.set("order", "created_at.desc");
    endpoint.searchParams.set("limit", String(PAGE_SIZE));
    endpoint.searchParams.set("offset", String(offset));
    const response = await fetch(endpoint, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error(`Supabase orders request failed (${response.status})`);
    const rows = await response.json();
    if (!Array.isArray(rows)) throw new Error("Supabase orders response was not a list");

    for (const row of rows) {
      const meta = row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
        ? row.metadata
        : {};
      const date = String(meta.paidAt || meta.createdAt || row.created_at || "").slice(0, 10);
      if (date < FROM || date > through) continue;
      const items = Array.isArray(meta.items) && meta.items.length ? meta.items : row.items;
      if (!Array.isArray(items)) continue;
      const orderIsUS = String(meta.fromWarehouse || "").toLowerCase() === "us"
        || String(meta.shippingType || "").toLowerCase() === "us-warehouse";
      for (const item of items) {
        if (!item || typeof item !== "object" || typeof item.name !== "string") continue;
        const name = aliases[item.name.trim().toLowerCase()] ?? item.name.trim();
        const quantity = Number(item.quantity || item.qty || 1);
        if (!name || !Number.isFinite(quantity) || quantity <= 0) continue;
        units.set(name, (units.get(name) ?? 0) + quantity);
        if (String(item.fromWarehouse || "").toLowerCase() === "us" ||
            (!item.fromWarehouse && orderIsUS)) {
          usUnits.set(name, (usUnits.get(name) ?? 0) + quantity);
        }
      }
    }
    if (rows.length < PAGE_SIZE) break;
  }

  return {
    from: FROM,
    through,
    names: [...units.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 40)
      .map(([name]) => name),
    usNames: [...usUnits.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 40)
      .map(([name]) => name),
  };
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }
  const through = todayInRiga();
  if (cache && cache.expires > Date.now() && cache.value.through === through) {
    res.setHeader("Cache-Control", "public, max-age=60");
    return res.json(cache.value);
  }
  try {
    inFlight ??= calculateRanking(through);
    const ranking = await inFlight;
    cache = { value: ranking, expires: Date.now() + CACHE_MS };
    res.setHeader("Cache-Control", "public, max-age=60");
    return res.json(ranking);
  } catch (error) {
    console.error("Could not build catalog ranking", error);
    return res.status(503).json({ error: "Catalog ranking is temporarily unavailable" });
  } finally {
    inFlight = null;
  }
}