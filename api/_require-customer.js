function reject(res, status, error) {
  res.status(status).json({ ok: false, error });
  return null;
}

export async function requireVerifiedCustomer(req, res) {
  res.setHeader("Cache-Control", "no-store");

  const authorization = String(req.headers?.authorization || "");
  const token = /^Bearer\s+(.+)$/i.exec(authorization)?.[1];
  if (!token) return reject(res, 401, "Sign in to use Store Credit.");

  const supabaseUrl = String(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "",
  ).replace(/\/+$/, "");
  const anonKey =
    process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
  if (!supabaseUrl || !anonKey) {
    return reject(res, 503, "Checkout authentication is unavailable.");
  }

  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${token}`,
      },
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return reject(res, 401, "Your sign-in has expired.");

    const user = await response.json();
    const email = String(user?.email || "").trim().toLowerCase();
    const verified = Boolean(user?.email_confirmed_at || user?.confirmed_at);
    if (!verified || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return reject(res, 403, "Verify your email before using Store Credit.");
    }
    return { email };
  } catch {
    return reject(res, 503, "Could not verify your sign-in.");
  }
}
