const SB_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const SB_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const SB_PUBLIC_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
const ADMIN_EMAIL = "support@10bottlevalue.co";

function responseError(res, status, error, details) {
  return res.status(status).json({ ok: false, error, ...(details ? { details } : {}) });
}

async function authenticate(req) {
  const token = String(req.headers.authorization || "").match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return { status: 401, error: "A Supabase Authorization bearer token is required" };
  if (!SB_URL || !SB_PUBLIC_KEY || !SB_SERVICE_KEY) {
    return { status: 500, error: "Supabase URL, public key, and service-role key are required" };
  }
  const response = await fetch(`${SB_URL}/auth/v1/user`, {
    headers: { apikey: SB_PUBLIC_KEY, Authorization: `Bearer ${token}` },
  });
  if (!response.ok) return { status: 401, error: "Invalid Supabase bearer token" };
  const user = await response.json();
  const email = String(user.email || "").trim().toLowerCase();
  if (!email) return { status: 403, error: "Authenticated Supabase user must have an email address" };
  return { user, email, isAdmin: email === ADMIN_EMAIL };
}

async function selectMessages(email, isAdmin) {
  const ownerFilter = isAdmin ? "" : `&email=eq.${encodeURIComponent(email)}`;
  return fetch(`${SB_URL}/rest/v1/contact_messages?select=id,email,reactions${ownerFilter}`, {
    headers: {
      apikey: SB_SERVICE_KEY,
      Authorization: `Bearer ${SB_SERVICE_KEY}`,
      "Content-Type": "application/json",
    },
  });
}

function unknownReactionsSchema(res, details) {
  return responseError(
    res,
    501,
    "Persistent reactions are unavailable: contact_messages.reactions (JSON/JSONB) is required. No schema change was attempted.",
    details
  );
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return responseError(res, 405, "Method not allowed");
  }
  try {
    const auth = await authenticate(req);
    if (auth.error) return responseError(res, auth.status, auth.error);

    const response = await selectMessages(auth.email, auth.isAdmin);
    if (!response.ok) {
      const details = await response.text();
      if (/reactions/i.test(details) && /column|field|schema/i.test(details)) return unknownReactionsSchema(res, details);
      return responseError(res, 502, "Could not load reactions from Supabase", details);
    }

    const messages = await response.json();
    const reactionsByMessage = {};
    for (const message of Array.isArray(messages) ? messages : []) {
      // Keep a second ownership check at the response boundary as defense in depth.
      if (!auth.isAdmin && String(message.email || "").trim().toLowerCase() !== auth.email) continue;
      reactionsByMessage[String(message.id)] = message.reactions || { msg: {}, reply: {} };
    }
    return res.status(200).json(reactionsByMessage);
  } catch (error) {
    return responseError(res, 500, "Reaction request failed", error.message);
  }
}