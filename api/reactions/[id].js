const SB_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const SB_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const SB_PUBLIC_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
const ADMIN_EMAIL = "support@10bottlevalue.co";
const ALLOWED_EMOJIS = new Set(["👍", "❤️", "😂", "😮", "😢", "👏"]);

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

function unknownReactionsSchema(res, details) {
  return responseError(
    res,
    501,
    "Persistent reactions are unavailable: contact_messages.reactions (JSON/JSONB) is required. No schema change was attempted.",
    details
  );
}

function validSide(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return Object.entries(value).every(([emoji, active]) => ALLOWED_EMOJIS.has(emoji) && typeof active === "boolean");
}

export default async function handler(req, res) {
  if (req.method !== "PUT") {
    res.setHeader("Allow", "PUT");
    return responseError(res, 405, "Method not allowed");
  }
  try {
    const auth = await authenticate(req);
    if (auth.error) return responseError(res, auth.status, auth.error);

    const id = String(req.query?.id || "").trim();
    const reactions = req.body?.reactions;
    if (!id || id.length > 200) return responseError(res, 400, "A valid message id is required");
    if (!reactions || typeof reactions !== "object" || Array.isArray(reactions)
      || !validSide(reactions.msg) || !validSide(reactions.reply)
      || Object.keys(reactions).some((key) => key !== "msg" && key !== "reply")) {
      return responseError(res, 400, "reactions must contain msg and reply maps with supported emoji boolean values");
    }

    // Resolve the thread before writing: a missing/deleted message is not a valid target.
    const encodedId = encodeURIComponent(id);
    const lookup = await supabaseRequest(
      `contact_messages?id=eq.${encodedId}&select=id,email,reactions&limit=1`
    );
    if (!lookup.ok) {
      const details = await lookup.text();
      if (/reactions/i.test(details) && /column|field|schema/i.test(details)) return unknownReactionsSchema(res, details);
      return responseError(res, 502, "Could not authorize message thread in Supabase", details);
    }
    const rows = await lookup.json();
    if (!Array.isArray(rows) || rows.length !== 1 || !rows[0].email) {
      return responseError(res, 404, "Message thread not found");
    }
    if (!auth.isAdmin && String(rows[0].email).trim().toLowerCase() !== auth.email) {
      // Do not distinguish a foreign message id from a nonexistent one.
      return responseError(res, 404, "Message thread not found");
    }

    const ownerFilter = auth.isAdmin ? "" : `&email=eq.${encodeURIComponent(auth.email)}`;
    const update = await supabaseRequest(
      `contact_messages?id=eq.${encodedId}${ownerFilter}&select=id`,
      {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({ reactions: { msg: reactions.msg, reply: reactions.reply } }),
      }
    );
    if (!update.ok) {
      const details = await update.text();
      if (/reactions/i.test(details) && /column|field|schema/i.test(details)) return unknownReactionsSchema(res, details);
      return responseError(res, 502, "Could not save message reactions", details);
    }
    const updatedRows = await update.json();
    if (!Array.isArray(updatedRows) || updatedRows.length !== 1) {
      return responseError(res, 404, "Message thread no longer exists");
    }
    return res.status(200).json({ ok: true });
  } catch (error) {
    return responseError(res, 500, "Reaction update failed", error.message);
  }
}