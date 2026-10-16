import { AffiliateQuoteError, verifyAffiliateQuote } from "./_affiliate-quote.js";
import { requireVerifiedCustomer } from "./_require-customer.js";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("Vary", "Authorization");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method not allowed." });
  }

  const customer = await requireVerifiedCustomer(req, res);
  if (!customer) return;

  try {
    const attribution = await verifyAffiliateQuote({
      code: "",
      email: customer.email,
      customerId: customer.id,
      disabled: true,
      supabaseUrl: process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      rules: process.env.MERIT_AFFILIATE_RULES_JSON,
    });
    return res.status(200).json({ ok: true, code: attribution.code, locked: Boolean(attribution.locked) });
  } catch (error) {
    if (error instanceof AffiliateQuoteError) {
      return res.status(error.status).json({ ok: false, code: error.code, error: error.message });
    }
    console.error("affiliate attribution lookup failed:", error?.message || error);
    return res.status(503).json({ ok: false, error: "Could not load your saved referral attribution." });
  }
}
