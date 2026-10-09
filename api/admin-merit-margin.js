import { requireAdmin } from "./_auth.js";
import { operationsDays } from "./_admin-operations-summary.js";
import { MeritMarginReadError, readMeritMarginSummary } from "./_admin-merit-margin.js";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("Vary", "Authorization");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, error: "Method not allowed." });
  }
  if (!await requireAdmin(req, res)) return;
  res.setHeader("Cache-Control", "private, no-store");
  const days = operationsDays(req.query);
  if (days === null) return res.status(400).json({ ok: false, code: "INVALID_OPERATIONS_RANGE", error: "Choose 1, 7, 30 or 90 days." });
  const config = { url: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL, serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY };
  if (!config.url || !config.serviceKey) return res.status(503).json({ ok: false, code: "MERIT_MARGIN_UNAVAILABLE", error: "Private Merit records are unavailable." });
  try {
    return res.status(200).json(await readMeritMarginSummary(config, days));
  } catch (error) {
    const known = error instanceof MeritMarginReadError;
    return res.status(known ? error.status : 502).json({
      ok: false, code: known ? error.code : "MERIT_MARGIN_UNAVAILABLE",
      error: "Merit fee records are unavailable. No partial amounts or profit estimates are shown.",
    });
  }
}
