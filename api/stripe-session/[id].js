import Stripe from "stripe";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const SUPABASE_KEY =
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "";
const ADMIN_EMAIL = "support@10bottlevalue.co";

async function requireAdmin(req) {
  const authorization = req.headers?.authorization || req.headers?.Authorization || "";
  const match = String(authorization).match(/^Bearer\s+(\S+)$/i);
  if (!match) return { authorized: false, status: 401, error: "Admin authentication required" };

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return { authorized: false, status: 500, error: "Supabase authentication is not configured on server" };
  }

  try {
    // Supabase validates the access token and returns its authenticated user.
    const response = await fetch(`${SUPABASE_URL.replace(/\/+$/, "")}/auth/v1/user`, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${match[1]}`,
      },
    });
    if (!response.ok) return { authorized: false, status: 401, error: "Invalid or expired admin session" };

    const user = await response.json();
    if (String(user?.email || "").trim().toLowerCase() !== ADMIN_EMAIL) {
      return { authorized: false, status: 403, error: "Admin access required" };
    }
    return { authorized: true };
  } catch {
    return { authorized: false, status: 502, error: "Unable to verify admin session" };
  }
}

function parseItems(metadataItems, lineItems) {
  if (typeof metadataItems === "string" && metadataItems) {
    try {
      const parsed = JSON.parse(metadataItems);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // Metadata can be truncated by Stripe's per-field size limit. Use
      // provider line items below rather than treating partial JSON as data.
    }
  }

  return lineItems.map((item) => ({
    name: item.description || item.price?.product?.name || "Stripe line item",
    quantity: Number(item.quantity) || 1,
    price: Number(item.price?.unit_amount || 0) / 100,
  }));
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const auth = await requireAdmin(req);
  if (!auth.authorized) return res.status(auth.status).json({ ok: false, error: auth.error });

  const sessionId = Array.isArray(req.query?.id) ? req.query.id[0] : req.query?.id;
  if (typeof sessionId !== "string" || !/^cs_(?:test|live)_[A-Za-z0-9_-]{1,200}$/.test(sessionId)) {
    return res.status(400).json({ ok: false, error: "A valid Stripe checkout session ID is required" });
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) return res.status(500).json({ ok: false, error: "STRIPE_SECRET_KEY not configured on server." });

  try {
    const stripe = new Stripe(stripeKey);
    const [session, lineItems] = await Promise.all([
      stripe.checkout.sessions.retrieve(sessionId),
      stripe.checkout.sessions.listLineItems(sessionId, { limit: 100 }),
    ]);
    const items = parseItems(session.metadata?.items, lineItems.data || []);

    return res.status(200).json({
      ok: true,
      items,
      session: {
        id: session.id,
        payment_status: session.payment_status,
        amount_total: session.amount_total,
        currency: session.currency,
      },
      line_items: lineItems.data,
    });
  } catch (error) {
    const status = error?.type === "StripeInvalidRequestError" ? 404 : 502;
    console.error("stripe-session lookup error:", error?.message || error);
    return res.status(status).json({ ok: false, error: "Unable to retrieve Stripe checkout session" });
  }
}