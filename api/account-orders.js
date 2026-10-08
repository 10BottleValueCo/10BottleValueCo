import { requireUser } from "./_auth.js";
import { AccountOrdersError, accountIdentity, readAccountOrders } from "./_account-orders.js";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("Vary", "Authorization");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, error: "Method not allowed." });
  }
  const user = await requireUser(req, res);
  if (!user) return;
  res.setHeader("Cache-Control", "private, no-store");
  try {
    if (Object.keys(req.query || {}).length > 0
      || (req.url && new URL(req.url, "https://local.invalid").search)) {
      return res.status(400).json({ ok: false, code: "NO_ACCOUNT_SELECTOR", error: "Account selectors are not accepted." });
    }
    const identity = accountIdentity(user);
    if (!identity) return res.status(403).json({ ok: false, code: "VERIFIED_ACCOUNT_REQUIRED", error: "A verified account email is required." });
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) return res.status(503).json({ ok: false, error: "Order history is not configured." });
    const result = await readAccountOrders({ url: url.replace(/\/+$/, ""), serviceKey }, identity);
    return res.status(200).json({ ok: true, ...result, complete: true });
  } catch (error) {
    return res.status(error instanceof AccountOrdersError ? error.status : 503).json({
      ok: false,
      code: error instanceof AccountOrdersError ? error.code : "ACCOUNT_ORDERS_UNAVAILABLE",
      error: "Order history could not be loaded completely. Please try again.",
    });
  }
}
