const ADMIN_EMAIL = "support@10bottlevalue.co";
const PAGE_SIZE = 1_000;
const MAX_PAYOUT_ROWS = 20_000;
const MAX_REQUEST_BYTES = 12_000;

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !serviceKey || !anonKey) return null;
  return { url: url.replace(/\/+$/, ""), serviceKey, anonKey };
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

async function requireAdmin(authorization, config, res) {
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  if (!token) {
    res.status(401).json({ error: "Sign in with the admin account to manage payouts." });
    return false;
  }

  const response = await fetch(`${config.url}/auth/v1/user`, {
    headers: {
      apikey: config.anonKey,
      Authorization: `Bearer ${token}`,
    },
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) {
    res.status(401).json({ error: "Your session is invalid or expired. Sign in again." });
    return false;
  }

  const user = await response.json();
  if (!isRecord(user) || !user.email_confirmed_at
    || typeof user.email !== "string" || user.email.trim().toLowerCase() !== ADMIN_EMAIL) {
    res.status(403).json({ error: "Admin access is required to manage payouts." });
    return false;
  }
  return true;
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
    || !Number.isFinite(amount)
    || amount <= 0
    || Math.round(amount * 100) / 100 !== amount
  ) {
    return null;
  }
  return { affiliateCode: affiliateCode.toUpperCase(), amount };
}

async function handleList(req, res, config) {
  if (!(await requireAdmin(req.headers.authorization, config, res))) return;

  const payouts = [];
  for (let offset = 0; offset < MAX_PAYOUT_ROWS; offset += PAGE_SIZE) {
    const endpoint = new URL(`${config.url}/rest/v1/affiliate_payouts`);
    endpoint.searchParams.set("select", "affiliate_code,amount");
    endpoint.searchParams.set("order", "affiliate_code.asc,amount.asc");
    endpoint.searchParams.set("limit", String(PAGE_SIZE));
    endpoint.searchParams.set("offset", String(offset));

    const response = await fetch(endpoint, {
      headers: {
        apikey: config.serviceKey,
        Authorization: `Bearer ${config.serviceKey}`,
      },
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) {
      const databaseError = await getSupabaseError(response);
      console.error("Supabase rejected affiliate payout history", {
        status: response.status,
        code: databaseError.code,
        message: databaseError.message,
      });
      if (isPermissionError(databaseError)) return sendPermissionError(res);
      return res.status(502).json({ error: "Payout history could not be loaded." });
    }

    const rows = await response.json();
    if (!Array.isArray(rows)) {
      console.error("Supabase returned an invalid affiliate payout response");
      return res.status(502).json({ error: "Payout history could not be loaded." });
    }

    for (const row of rows) {
      const amount = Number(row?.amount);
      if (!isRecord(row) || typeof row.affiliate_code !== "string" || !Number.isFinite(amount)) {
        console.error("Supabase returned an invalid affiliate payout row");
        return res.status(502).json({ error: "Payout history could not be loaded." });
      }
      payouts.push({ affiliate_code: row.affiliate_code, amount });
    }

    if (rows.length < PAGE_SIZE) return res.status(200).json({ payouts });
  }

  console.error("Affiliate payout history exceeds the safe pagination limit", {
    maxRows: MAX_PAYOUT_ROWS,
  });
  return res.status(503).json({ error: "Payout history is too large to summarize safely." });
}

async function handleRecord(req, res, config) {
  if (!(await requireAdmin(req.headers.authorization, config, res))) return;

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
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Vary", "Authorization");
  const config = getSupabaseConfig();
  if (!config) {
    return res.status(503).json({ error: "Payout storage is not configured." });
  }

  try {
    if (req.method === "GET") return await handleList(req, res, config);
    if (req.method === "POST") return await handleRecord(req, res, config);
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method not allowed." });
  } catch (error) {
    console.error("Affiliate payouts API failed", {
      message: error instanceof Error ? error.message.slice(0, 180) : "Unknown error",
    });
    return res.status(503).json({ error: "Could not verify admin access or reach payout storage." });
  }
}
