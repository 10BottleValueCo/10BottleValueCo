import { requireAdmin } from "./_auth.js";
import { payoutConfig, payoutCents, readPayouts, sendPayoutError } from "./_affiliate-payouts.js";

const MAX_REQUEST_BYTES = 12_000;

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function getSupabaseError(response) {
  try {
    const body = await response.json();
    if (!isRecord(body)) return {};
    return {
      code: typeof body.code === "string" ? body.code.slice(0, 40) : undefined,
      message: typeof body.message === "string" ? body.message.slice(0, 180) : undefined,
    };
  } catch {
    return {};
  }
}

function isPermissionError(error) {
  return error.code === "42501" || /permission denied/i.test(error.message || "");
}

function sendPermissionError(res) {
  return res.status(503).json({
    error: "Payout storage permissions are missing. Apply the affiliate payout permissions migration.",
  });
}

function parsePayoutBody(body) {
  if (Buffer.isBuffer(body)) body = body.toString("utf8");
  if (typeof body === "string") {
    if (Buffer.byteLength(body) > MAX_REQUEST_BYTES) return null;
    try {
      body = JSON.parse(body);
    } catch {
      return null;
    }
  }
  if (!isRecord(body) || Buffer.byteLength(JSON.stringify(body)) > MAX_REQUEST_BYTES) return null;

  const affiliateCode = typeof body.affiliate_code === "string" ? body.affiliate_code.trim() : "";
  const amount = body.amount;
  if (
    affiliateCode.length < 1
    || affiliateCode.length > 64
    || !/^[A-Za-z0-9_-]+$/.test(affiliateCode)
    || typeof amount !== "number"
    || payoutCents(amount) === null
  ) {
    return null;
  }
  return { affiliateCode: affiliateCode.toUpperCase(), amount };
}

async function handleList(req, res, config) {
  const rows = await readPayouts(config);
  return res.status(200).json({ payouts: rows.map(({ affiliate_code, amount }) => ({ affiliate_code, amount })) });
}

async function handleRecord(req, res, config) {
  const payout = parsePayoutBody(req.body);
  if (!payout) {
    return res.status(400).json({
      error: "Enter an affiliate code and a positive payout amount with no more than two decimal places.",
    });
  }

  const response = await fetch(`${config.url}/rest/v1/affiliate_payouts`, {
    method: "POST",
    headers: {
      apikey: config.serviceKey,
      Authorization: `Bearer ${config.serviceKey}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      affiliate_code: payout.affiliateCode,
      amount: payout.amount,
      note: `Admin payout ${new Date().toISOString().slice(0, 10)}`,
    }),
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) {
    const databaseError = await getSupabaseError(response);
    console.error("Supabase rejected an affiliate payout insert", {
      status: response.status,
      code: databaseError.code,
      message: databaseError.message,
    });
    if (isPermissionError(databaseError)) return sendPermissionError(res);
    return res.status(502).json({ error: "The payout could not be saved. No paid total was changed." });
  }

  return res.status(201).json({ ok: true });
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("Vary", "Authorization");
  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method not allowed." });
  }
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  res.setHeader("Cache-Control", "private, no-store");
  const config = payoutConfig();
  if (!config) return res.status(503).json({ error: "Payout storage is not configured." });

  try {
    if (req.method === "GET") return await handleList(req, res, config);
    return await handleRecord(req, res, config);
  } catch (error) {
    return sendPayoutError(res, error);
  }
}
