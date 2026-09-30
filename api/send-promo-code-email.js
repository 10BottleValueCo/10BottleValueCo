const SB_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const SB_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const SB_PUBLIC_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
const ADMIN_EMAIL = "support@10bottlevalue.co";
const FROM_EMAIL = "10BottleValueCo <support@10bottlevalue.co>";

function jsonError(res, status, error, details) {
  return res.status(status).json({ ok: false, error, ...(details ? { details } : {}) });
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char]);
}

async function supabaseRequest(path, options = {}) {
  return fetch(`${SB_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: SB_SERVICE_KEY,
      Authorization: `Bearer ${SB_SERVICE_KEY}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return jsonError(res, 405, "Method not allowed");
  }

  const authorization = req.headers.authorization || "";
  const token = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return jsonError(res, 401, "A Supabase Authorization bearer token is required");
  if (!SB_URL || !SB_PUBLIC_KEY || !SB_SERVICE_KEY) {
    return jsonError(res, 500, "Supabase URL, public key, and service-role key are required");
  }

  try {
    const identityResponse = await fetch(`${SB_URL}/auth/v1/user`, {
      headers: { apikey: SB_PUBLIC_KEY, Authorization: `Bearer ${token}` },
    });
    if (!identityResponse.ok) return jsonError(res, 401, "Invalid Supabase bearer token");
    const identity = await identityResponse.json();
    if (String(identity.email || "").trim().toLowerCase() !== ADMIN_EMAIL) {
      return jsonError(res, 403, "Administrator access required");
    }

    const code = String(req.body?.code || "").trim().toUpperCase();
    if (!code || code.length > 100) return jsonError(res, 400, "A valid promo code is required");

    // Email and discount are always sourced from the issued promo, never the caller.
    const lookup = await supabaseRequest(
      `user_promos?code=eq.${encodeURIComponent(code)}&select=id,code,email,rate,metadata&limit=2`
    );
    if (!lookup.ok) {
      const details = await lookup.text();
      if (/metadata/i.test(details) && /column|field|schema/i.test(details)) {
        return jsonError(res, 501, "Promo email idempotency requires user_promos.metadata (JSON/JSONB); the column is unavailable", details);
      }
      return jsonError(res, 502, "Could not verify promo code in Supabase", details);
    }
    const promos = await lookup.json();
    if (!Array.isArray(promos) || promos.length !== 1) {
      return jsonError(res, promos?.length > 1 ? 409 : 404, promos?.length > 1 ? "Promo code is ambiguous" : "Promo code not found");
    }
    const promo = promos[0];
    const email = String(promo.email || "").trim().toLowerCase();
    const rate = Number(promo.rate);
    if (email === "__public__" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return jsonError(res, 400, "This promo is not assigned to an email recipient");
    }
    if (!Number.isFinite(rate) || rate <= 0 || rate > 1) {
      return jsonError(res, 400, "Promo has an invalid discount rate");
    }
    if (!promo.id) return jsonError(res, 501, "Promo email idempotency requires user_promos.id");

    const existingMetadata = promo.metadata && typeof promo.metadata === "object" && !Array.isArray(promo.metadata)
      ? promo.metadata
      : {};
    if (existingMetadata.promoEmailSentAt || existingMetadata.promoEmailSendStartedAt) {
      return jsonError(res, 409, "Promo email has already been sent or claimed");
    }

    // Claim the send atomically before contacting the mail provider so concurrent
    // requests and retries cannot deliver duplicate emails.
    const claimedAt = new Date().toISOString();
    const claimMetadata = { ...existingMetadata, promoEmailSendStartedAt: claimedAt };
    const claim = await supabaseRequest(
      `user_promos?id=eq.${encodeURIComponent(String(promo.id))}&metadata-%3E%3EpromoEmailSendStartedAt=is.null&select=id`,
      {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({ metadata: claimMetadata }),
      }
    );
    if (!claim.ok) {
      const details = await claim.text();
      if (/metadata/i.test(details) && /column|field|schema/i.test(details)) {
        return jsonError(res, 501, "Promo email idempotency requires user_promos.metadata (JSON/JSONB); the column is unavailable", details);
      }
      return jsonError(res, 502, "Could not claim promo email send", details);
    }
    const claimedRows = await claim.json();
    if (!Array.isArray(claimedRows) || claimedRows.length !== 1) {
      return jsonError(res, 409, "Promo email has already been sent or claimed");
    }

    if (!process.env.RESEND_API_KEY) {
      return jsonError(res, 500, "Missing RESEND_API_KEY; promo email send was claimed and requires administrator review");
    }
    const safeCode = escapeHtml(promo.code);
    const safeRate = escapeHtml(`${Math.round(rate * 100)}%`);
    const html = `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#222"><h1>Your promo code</h1><p>Your personal promo code is <strong>${safeCode}</strong>.</p><p>It gives you ${safeRate} off your order.</p><p>Enter this code at checkout.</p><p>10BottleValueCo Support</p></body></html>`;
    const sent = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [email],
        subject: `Your 10BottleValueCo promo code: ${String(promo.code)}`,
        html,
      }),
    });
    const result = await sent.json().catch(() => ({}));
    await supabaseRequest(`user_promos?id=eq.${encodeURIComponent(String(promo.id))}`, {
      method: "PATCH",
      body: JSON.stringify({
        metadata: {
          ...claimMetadata,
          promoEmailSentAt: sent.ok ? new Date().toISOString() : null,
          promoEmailSendStatus: sent.ok ? "sent" : "failed",
          promoEmailProviderId: sent.ok ? (result.id || null) : null,
        },
      }),
    }).catch(() => {});
    if (!sent.ok) return jsonError(res, 502, result.message || "Email provider rejected the promo email");
    return res.status(200).json({ ok: true, id: result.id });
  } catch (error) {
    return jsonError(res, 500, "Promo email request failed", error.message);
  }
}