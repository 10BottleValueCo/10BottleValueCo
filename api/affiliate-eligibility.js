import { requireVerifiedCustomer } from "./_require-customer.js";
import { AffiliateQuoteError, verifyAffiliateQuote } from "./_affiliate-quote.js";

// Read-only eligibility for the signed-in buyer. Browser order caches cannot
// establish first-purchase eligibility, and no payment is started here.
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("Vary", "Authorization");
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Method not allowed." });
  const customer = await requireVerifiedCustomer(req, res, { purpose: "your referral discount" });
  if (!customer) return;
  const code = String(req.body?.code || "").trim().toUpperCase();
  try {
    const affiliate = await verifyAffiliateQuote({ code, email: customer.email, customerId: customer.id,
      supabaseUrl: process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      rules: process.env.MERIT_AFFILIATE_RULES_JSON });
    return res.status(200).json({ ok: true, code, discountBps: affiliate.discountBps });
  } catch (error) {
    const known = error instanceof AffiliateQuoteError;
    return res.status(known ? error.status : 503).json({ ok: false,
      code: known ? error.code : "MERIT_AFFILIATE_LOOKUP_UNAVAILABLE",
      error: known ? error.message : "Referral verification is temporarily unavailable. Please try again." });
  }
}
