export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const paymentId = Array.isArray(req.query?.payment_id)
    ? req.query.payment_id[0]
    : req.query?.payment_id;
  if (typeof paymentId !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(paymentId)) {
    return res.status(400).json({ error: "A valid payment_id is required" });
  }

  const apiKey = process.env.NOWPAYMENTS_API_KEY || process.env.NOW_PAYMENTS_API_KEY || "";
  if (!apiKey) return res.status(500).json({ error: "NOWPAYMENTS_API_KEY not configured on server." });

  try {
    const response = await fetch(
      `https://api.nowpayments.io/v1/payment/${encodeURIComponent(paymentId)}`,
      { headers: { "x-api-key": apiKey } }
    );
    const body = await response.json().catch(() => null);

    if (!response.ok) {
      return res.status(response.status === 404 ? 404 : 502).json({
        error: body?.message || "NOWPayments payment lookup failed",
      });
    }

    if (!body || typeof body.payment_status !== "string") {
      return res.status(502).json({ error: "NOWPayments returned an invalid payment status response" });
    }

    // Read-only status lookup: do not mutate orders or capture/settle payments.
    return res.status(200).json({ payment_status: body.payment_status });
  } catch (error) {
    console.error("payment-status error:", error?.message || error);
    return res.status(502).json({ error: "Unable to retrieve NOWPayments payment status" });
  }
}