// PayLio requires a privately stored ipn_token to verify X-PayLio-Signature,
// followed by server-to-server /payment-status verification and order binding.
// https://paylio.org/api-docs#callback
// The legacy flow did not store that binding. Never trust body/query status.
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }
  return res.status(503).json({
    error: "PayLio verification requires a persisted payment binding. Contact support for reconciliation.",
    code: "PAYLIO_VERIFICATION_NOT_CONFIGURED",
  });
}
