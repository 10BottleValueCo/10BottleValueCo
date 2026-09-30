const ADMIN_EMAIL = "support@10bottlevalue.co";
const ALLOWED_EVENTS = new Set([
  "page_view",
  "page_exit",
  "product_view",
  "add_to_cart",
  "checkout_started",
  "checkout_step",
  "order_placed",
  "ui_click",
  "form_submit",
]);
const DEVICE_TYPES = new Set(["phone", "tablet", "desktop"]);
const STRING_PROPERTIES = new Set([
  "product_name",
  "product_dose",
  "payment_method",
  "action",
  "element_type",
  "destination",
  "form",
  "step",
]);
const NUMBER_PROPERTIES = new Set([
  "product_price",
  "total",
  "items_count",
  "quantity",
  "duration_ms",
]);
const RATE_WINDOW_MS = 10 * 60 * 1000;
const MAX_EVENTS_PER_SESSION = 180;
const MAX_EVENTS_TO_READ = 5000;
const PAGE_SIZE = 1000;
const sessionRateLimits = new Map();

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

function cleanText(value, maxLength = 120) {
  return value
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[email]")
    .replace(/\+?\d[\d().\-\s]{7,}\d/g, "[number]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function cleanPage(value) {
  if (typeof value !== "string") return null;
  const page = value.trim().replace(/[?#].*$/, "").slice(0, 160);
  return page || null;
}

function cleanReferrer(value) {
  if (typeof value !== "string" || value.length > 2048) return null;
  try {
    const referrer = new URL(value);
    if (referrer.protocol !== "http:" && referrer.protocol !== "https:") return null;
    return `${referrer.origin}${referrer.pathname}`.slice(0, 500);
  } catch {
    return null;
  }
}

function cleanProperties(value) {
  const result = {};
  if (!isRecord(value)) return result;

  for (const [key, property] of Object.entries(value)) {
    if (key === "device_type" || key === "page") continue;
    if (STRING_PROPERTIES.has(key) && typeof property === "string") {
      const cleaned = cleanText(property, key === "product_name" ? 100 : 120);
      if (cleaned) result[key] = cleaned;
    } else if (NUMBER_PROPERTIES.has(key) && typeof property === "number" && Number.isFinite(property)) {
      result[key] = Math.max(0, Math.min(property, 1_000_000_000));
    }
  }
  return result;
}

function takeSessionRateLimit(sessionId) {
  const now = Date.now();
  const existing = sessionRateLimits.get(sessionId);
  if (!existing || existing.expiresAt <= now) {
    sessionRateLimits.set(sessionId, { count: 1, expiresAt: now + RATE_WINDOW_MS });
    if (sessionRateLimits.size > 10_000) {
      for (const [id, entry] of sessionRateLimits) {
        if (entry.expiresAt <= now) sessionRateLimits.delete(id);
      }
    }
    return true;
  }
  if (existing.count >= MAX_EVENTS_PER_SESSION) return false;
  existing.count += 1;
  return true;
}

async function authenticateAdmin(authorization, config) {
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  if (!token) return false;

  const response = await fetch(`${config.url}/auth/v1/user`, {
    headers: {
      apikey: config.anonKey,
      Authorization: `Bearer ${token}`,
    },
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) return false;

  const user = await response.json();
  return isRecord(user)
    && typeof user.email === "string"
    && user.email.trim().toLowerCase() === ADMIN_EMAIL;
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

function hasPermissionError(error) {
  return error.code === "42501" || /permission denied/i.test(error.message || "");
}

function sendDatabaseFailure(res, databaseError, fallbackMessage) {
  if (hasPermissionError(databaseError)) {
    res.status(503).json({
      error: "Analytics database permissions are missing; run the analytics permissions migration.",
    });
    return;
  }
  res.status(502).json({ error: fallbackMessage });
}

async function handlePost(req, res, config) {
  let body = req.body;
  if (Buffer.isBuffer(body)) body = body.toString("utf8");
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      res.status(400).json({ error: "Invalid analytics event" });
      return;
    }
  }

  if (!isRecord(body) || Buffer.byteLength(JSON.stringify(body)) > 12_000) {
    res.status(400).json({ error: "Invalid analytics event" });
    return;
  }

  const sessionId = typeof body.session_id === "string" ? body.session_id.trim() : "";
  const eventType = typeof body.event_type === "string" ? body.event_type : "";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sessionId)) {
    res.status(400).json({ error: "Invalid session" });
    return;
  }
  if (!ALLOWED_EVENTS.has(eventType)) {
    res.status(400).json({ error: "Unsupported analytics event" });
    return;
  }
  if (!takeSessionRateLimit(sessionId)) {
    res.status(429).json({ error: "Too many analytics events" });
    return;
  }

  const properties = cleanProperties(body.properties);
  const deviceType = isRecord(body.properties) ? body.properties.device_type : null;
  properties.device_type = typeof deviceType === "string" && DEVICE_TYPES.has(deviceType)
    ? deviceType
    : "unknown";

  const event = {
    session_id: sessionId,
    event_type: eventType,
    page: cleanPage(body.page),
    referrer: cleanReferrer(body.referrer),
    properties,
  };

  try {
    const response = await fetch(`${config.url}/rest/v1/analytics_events`, {
      method: "POST",
      headers: {
        apikey: config.serviceKey,
        Authorization: `Bearer ${config.serviceKey}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(event),
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) {
      const databaseError = await getSupabaseError(response);
      console.error("Supabase rejected an analytics event", {
        status: response.status,
        code: databaseError.code,
        message: databaseError.message,
      });
      sendDatabaseFailure(res, databaseError, "Analytics event could not be stored");
      return;
    }
    res.status(202).json({ ok: true });
  } catch (error) {
    console.error("Could not store analytics event", error instanceof Error ? error.message : "unknown error");
    res.status(502).json({ error: "Analytics event could not be stored" });
  }
}

async function handleGet(req, res, config) {
  try {
    if (!(await authenticateAdmin(req.headers.authorization, config))) {
      res.status(403).json({ error: "Admin access is required" });
      return;
    }
  } catch (error) {
    console.error("Could not verify Funnel admin access", error instanceof Error ? error.message : "unknown error");
    res.status(503).json({ error: "Could not verify admin access" });
    return;
  }

  const rawDays = Array.isArray(req.query.days) ? req.query.days[0] : req.query.days;
  const days = Number(rawDays || 7);
  if (![1, 7, 30, 90].includes(days)) {
    res.status(400).json({ error: "Invalid analytics range" });
    return;
  }

  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const events = [];
  try {
    for (let offset = 0; offset < MAX_EVENTS_TO_READ; offset += PAGE_SIZE) {
      const endpoint = new URL(`${config.url}/rest/v1/analytics_events`);
      endpoint.searchParams.set("select", "id,session_id,event_type,page,properties,created_at");
      endpoint.searchParams.set("created_at", `gte.${since}`);
      endpoint.searchParams.set("order", "created_at.desc");
      endpoint.searchParams.set("limit", String(Math.min(PAGE_SIZE, MAX_EVENTS_TO_READ - offset)));
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
        console.error("Supabase rejected a Funnel events query", {
          status: response.status,
          code: databaseError.code,
          message: databaseError.message,
        });
        sendDatabaseFailure(res, databaseError, "Funnel events could not be loaded");
        return;
      }
      const rows = await response.json();
      if (!Array.isArray(rows)) {
        res.status(502).json({ error: "Funnel returned an invalid events response" });
        return;
      }
      events.push(...rows);
      if (rows.length < Math.min(PAGE_SIZE, MAX_EVENTS_TO_READ - offset)) break;
    }
    res.setHeader("Cache-Control", "private, no-store");
    res.status(200).json({ events });
  } catch (error) {
    console.error("Could not load Funnel events", error instanceof Error ? error.message : "unknown error");
    res.status(502).json({ error: "Funnel events could not be loaded" });
  }
}

export default async function handler(req, res) {
  const config = getSupabaseConfig();
  if (!config) {
    res.status(503).json({ error: "Analytics storage is not configured" });
    return;
  }

  if (req.method === "POST") {
    await handlePost(req, res, config);
    return;
  }
  if (req.method === "GET") {
    await handleGet(req, res, config);
    return;
  }
  res.setHeader("Allow", "GET, POST");
  res.status(405).json({ error: "Method not allowed" });
}