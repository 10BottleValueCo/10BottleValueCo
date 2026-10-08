import { timingSafeEqual } from "node:crypto";

// Authorize on the server, using Supabase's validated user response. Never use
// browser state or user_metadata for permissions.
export async function requireUser(req, res) {
  res.setHeader("Cache-Control", "no-store");
  const authorization = req.headers?.authorization;
  const token = typeof authorization === "string" ? authorization.match(/^Bearer\s+(\S+)$/i)?.[1] : null;
  if (!token) {
    res.status(401).json({ ok: false, error: "Authentication required." });
    return null;
  }
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "https://danpkqqzcptamojrnrmk.supabase.co";
  const key = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    res.status(503).json({ ok: false, error: "Authentication is not configured." });
    return null;
  }
  try {
    const response = await fetch(`${url.replace(/\/+$/, "")}/auth/v1/user`, {
      headers: { apikey: key, Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) {
      res.status(response.status === 401 || response.status === 403 ? 401 : 503)
        .json({ ok: false, error: "Could not verify your session." });
      return null;
    }
    const user = await response.json();
    if (!user || typeof user.id !== "string" || !user.id) {
      res.status(401).json({ ok: false, error: "Invalid session." });
      return null;
    }
    return user;
  } catch {
    res.status(503).json({ ok: false, error: "Authentication service unavailable." });
    return null;
  }
}

export async function requireAdmin(req, res) {
  const user = await requireUser(req, res);
  if (!user) return null;
  const allowedIds = (process.env.ADMIN_USER_IDS || "").split(",").map(value => value.trim()).filter(Boolean);
  const allowedEmails = (process.env.ADMIN_EMAILS || "support@10bottlevalue.co")
    .split(",").map(value => value.trim().toLowerCase()).filter(Boolean);
  const allowed = allowedIds.length > 0
    ? allowedIds.includes(user.id)
    : !!user.email_confirmed_at && allowedEmails.includes(String(user.email || "").trim().toLowerCase());
  if (!allowed) {
    res.status(403).json({ ok: false, error: "Administrator access required." });
    return null;
  }
  return user;
}

export function requireInternalRequest(req, res) {
  const expected = process.env.INTERNAL_API_SECRET;
  if (!expected) {
    res.status(503).json({ ok: false, error: "Internal delivery authentication is not configured." });
    return false;
  }
  const supplied = req.headers?.["x-internal-api-secret"];
  const valid = typeof supplied === "string" && Buffer.byteLength(supplied) === Buffer.byteLength(expected)
    && timingSafeEqual(Buffer.from(supplied), Buffer.from(expected));
  if (!valid) res.status(401).json({ ok: false, error: "Internal authentication required." });
  return valid;
}
