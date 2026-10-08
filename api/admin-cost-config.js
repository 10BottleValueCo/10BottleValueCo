import { requireAdmin } from "./_auth.js";
import { parseSupplierCostConfig } from "./_supplier-cost-config.js";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("Vary", "Authorization");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed." });
  }
  if (!(await requireAdmin(req, res))) return;
  const config = parseSupplierCostConfig(process.env.SUPPLIER_COSTS_JSON);
  if (!config) {
    return res.status(503).json({ error: "Supplier costs are not configured. Cost and contribution estimates remain unknown." });
  }
  return res.status(200).json({ config });
}
