import { requireAdmin } from "./_auth.js";
import { operationsDays } from "./_admin-operations-summary.js";
import { readOperationsEvents, OperationsEventsError } from "./_admin-operations-events.js";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("Vary", "Authorization");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, error: "Method not allowed." });
  }
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  res.setHeader("Cache-Control", "private, no-store");
  const days = operationsDays(req.query);
  if (days === null) return res.status(400).json({ ok: false, error: "Choose 1, 7, 30 or 90 days." });
  const config = { url: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL, serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY };
  if (!config.url || !config.serviceKey) return res.status(503).json({ ok: false, error: "Operations storage is not configured." });
  try {
    return res.status(200).json(await readOperationsEvents(config, days));
  } catch (error) {
    const known = error instanceof OperationsEventsError;
    return res.status(known ? error.status : 502).json({ ok: false, code: known ? error.code : "OPERATIONS_READ_INCOMPLETE", error: "Browser activity is unavailable. Choose a shorter range or refresh; no partial totals are shown." });
  }
}
