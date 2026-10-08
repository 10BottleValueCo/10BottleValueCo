// Do not create charges while their callback cannot be safely reconciled.
// Re-enable only alongside persisted private ipn_token/payment/order binding.
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed." });
  return res.status(503).json({
    error: "This payment method is temporarily unavailable. Please select another method.",
    code: "PAYLIO_VERIFICATION_NOT_CONFIGURED",
  });
}
