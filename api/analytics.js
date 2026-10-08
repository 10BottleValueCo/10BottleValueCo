import { requireAdmin } from "./_auth.js";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
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
  "auth_started",
  "auth_code_sent",
  "auth_verified",
  "auth_failed",
  "product_selection_changed",
]);
const DEVICE_TYPES = new Set(["phone", "tablet", "desktop"]);
const STRING_PROPERTIES = new Set([
  "product_name",
  "product_dose",
  "strength",
  "payment_method",
  "action",
  "element_type",
  "destination",
  "form",
  "step",
]);
const ENUM_PROPERTIES = {
  method: new Set(["email_code", "password", "google", "apple"]),
  stage: new Set(["signin", "create", "verify", "resend"]),
  warehouse: new Set(["us", "worldwide"]),
};
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
  const page = cleanText(value.trim().replace(/[?#].*$/, ""), 160);
  return page || null;
}

function cleanReferrer(value) {
  if (typeof value !== "string" || value.length > 2048) return null;
  try {
    const referrer = new URL(value);
    if (referrer.protocol !== "http:" && referrer.protocol !== "https:") return null;
    return referrer.origin.slice(0, 500);
  } catch {
    return null;
  }
}

function cleanProperties(value) {
  const result = {};
  if (!isRecord(value)) return result;

  for (const [key, property] of Object.entries(value)) {
    if (key === "device_type" || key === "page") continue;
    if (Object.hasOwn(ENUM_PROPERTIES, key)) {
      if (ENUM_PROPERTIES[key].has(property)) result[key] = property;
      continue;
    }
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
    if (sessionRateLimits.size >= 10_000) {
      for (const [id, entry] of sessionRateLimits) {
        if (entry.expiresAt <= now) sessionRateLimits.delete(id);
      }
    }
    // Bound memory even when attackers continuously rotate session IDs.
    // This is per-instance load shedding, not a distributed bot defense.
    if (!sessionRateLimits.has(sessionId) && sessionRateLimits.size >= 10_000) return false;
    sessionRateLimits.set(sessionId, { count: 1, expiresAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (existing.count >= MAX_EVENTS_PER_SESSION) return false;
  existing.count += 1;
  return true;
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
  if (!UUID_PATTERN.test(sessionId)) {
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

  const eventId = typeof body.event_id === "string" ? body.event_id : null;
  if ((eventId !== null && !UUID_PATTERN.test(eventId)) || (body.schema_version === 2 && !eventId)) {
    res.status(400).json({ error: "Invalid event ID" });
    return;
  }
  const properties = cleanProperties(body.properties);
  properties.schema_version = body.schema_version === 2 ? 2 : 1;
  properties.session_definition = body.schema_version === 2 ? "tab_30min_inactivity" : "legacy_persistent_browser_id";
  const occurredAt = typeof body.occurred_at === "string" ? Date.parse(body.occurred_at) : NaN;
  if (Number.isFinite(occurredAt) && Math.abs(Date.now() - occurredAt) <= 86_400_000) {
    properties.occurred_at = new Date(occurredAt).toISOString();
  }
  const deviceType = isRecord(body.properties) ? body.properties.device_type : null;
  properties.device_type = typeof deviceType === "string" && DEVICE_TYPES.has(deviceType)
    ? deviceType
    : "unknown";

  const event = {
    ...(eventId ? { id: eventId } : {}),
    session_id: sessionId,
    event_type: eventType,
    page: cleanPage(body.page),
    referrer: cleanReferrer(body.referrer),
    properties,
  };

  try {
    const response = await fetch(`${config.url}/rest/v1/analytics_events?on_conflict=id`, {
      method: "POST",
      headers: {
        apikey: config.serviceKey,
        Authorization: `Bearer ${config.serviceKey}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal,resolution=ignore-duplicates",
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
  if (!(await requireAdmin(req, res))) return;

  const rawDays = Array.isArray(req.query.days) ? req.query.days[0] : req.query.days;
  const days = Number(rawDays || 7);
  if (![1, 7, 30, 90].includes(days)) {
    res.status(400).json({ error: "Invalid analytics range" });
    return;
  }

  const until = new Date().toISOString();
  const since = new Date(Date.parse(until) - days * 86_400_000).toISOString();
  const readLimit = MAX_EVENTS_TO_READ + 1; // Sentinel makes truncation explicit.
  const events = [];
  try {
    for (let offset = 0; offset < readLimit; offset += PAGE_SIZE) {
      const endpoint = new URL(`${config.url}/rest/v1/analytics_events`);
      endpoint.searchParams.set("select", "id,session_id,event_type,page,properties,created_at");
      endpoint.searchParams.set("and", `(created_at.gte.${since},created_at.lte.${until})`);
      endpoint.searchParams.set("order", "created_at.desc,id.desc");
      endpoint.searchParams.set("limit", String(Math.min(PAGE_SIZE, readLimit - offset)));
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
      if (rows.length < Math.min(PAGE_SIZE, readLimit - offset)) break;
    }
    res.setHeader("Cache-Control", "private, no-store");
    const truncated = events.length > MAX_EVENTS_TO_READ;
    const returned = events.slice(0, MAX_EVENTS_TO_READ);
    res.status(200).json({ events: returned, metadata: {
      schema_version: 2, source: "browser_events_untrusted", timezone: "UTC",
      since, until, received_at: new Date().toISOString(), returned_events: returned.length,
      limit: MAX_EVENTS_TO_READ, truncated, coverage: truncated ? "partial_latest_events" : "complete_for_requested_window",
      legacy_events: returned.filter(event => event.properties?.schema_version !== 2).length,
      session_definition: "v2: per-tab, 30 minutes inactivity; v1: persistent browser identifier",
      orders_definition: "order_placed is browser-reported submission, not verified payment",
      ordering_basis: "server_received_created_at",
    } });
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
