const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL || "https://danpkqqzcptamojrnrmk.supabase.co";
const SUPABASE_ANON_KEY =
  process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";
const ADMIN_EMAIL = "support@10bottlevalue.co";

function reject(res, status, error) {
  res.setHeader("Cache-Control", "no-store");
  res.status(status).json({ ok: false, error });
  return false;
}

export async function requireAdmin(req, res) {
  const authorization = req.headers?.authorization || "";
  const match = /^Bearer\s+(.+)$/i.exec(String(authorization));
  if (!match) return reject(res, 401, "Authentication required");

  if (!SUPABASE_ANON_KEY) {
    console.error("Admin authorization is unavailable: Supabase anon key is not configured");
    return reject(res, 503, "Authorization is temporarily unavailable");
  }

  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${match[1]}`,
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) return reject(res, 401, "Authentication required");

    const user = await response.json();
    const email = String(user?.email || "").trim().toLowerCase();
    const emailVerified = Boolean(user?.email_confirmed_at || user?.confirmed_at);
    if (!emailVerified || email !== ADMIN_EMAIL) {
      return reject(res, 403, "Forbidden");
    }
    return true;
  } catch (error) {
    console.error("Admin authorization request failed:", error?.message || "unknown error");
    return reject(res, 503, "Authorization is temporarily unavailable");
  }
}
