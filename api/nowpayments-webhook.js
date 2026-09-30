import { processNowPaymentsStatus } from "./_nowpayments-shared.js";
import crypto from "crypto";

function sortObject(value) {
  if (Array.isArray(value)) return value.map(sortObject);
  if (value && typeof value === "object") {
    return Object.keys(value).sort().reduce((sorted, key) => {
      sorted[key] = sortObject(value[key]);
      return sorted;
    }, {});
  }
  return value;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end("Method Not Allowed");

  try {
    const secret = process.env.NOWPAYMENTS_IPN_SECRET || "";
    if (!secret) return res.status(503).json({ error: "NOWPAYMENTS_IPN_SECRET is not configured" });
    const supplied = String(req.headers?.["x-nowpayments-sig"] || "").trim().toLowerCase();
    if (!/^[a-f0-9]{128}$/.test(supplied)) return res.status(401).json({ error: "Invalid NOWPayments signature" });
    const data = req.body || {};
    const expected = crypto.createHmac("sha512", secret).update(JSON.stringify(sortObject(data))).digest("hex");
    const expectedBytes = Buffer.from(expected, "hex");
    const suppliedBytes = Buffer.from(supplied, "hex");
    if (expectedBytes.length !== suppliedBytes.length || !crypto.timingSafeEqual(expectedBytes, suppliedBytes)) {
      return res.status(401).json({ error: "Invalid NOWPayments signature" });
    }
    const result = await processNowPaymentsStatus(data);
    return res.status(200).json(result);
  } catch (err) {
    console.error("NOWPayments webhook error:", err.message);
    return res.status(500).json({ error: "NOWPayments webhook failed", message: err.message });
  }
}
