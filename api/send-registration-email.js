const FROM_EMAIL = "10BottleValueCo <support@10bottlevalue.co>";
const SITE_URL = "https://10bottlevalue.co";
const TRUSTPILOT_URL = "https://www.trustpilot.com/review/10bottlevalue.co";
const SUPPORT_EMAIL = "support@10bottlevalue.co";
const LOGO_URL = "https://10bottlevalue.co/logo.png";
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const SUPABASE_PUBLIC_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";

function validEmail(value) {
  return typeof value === "string" && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function authenticateUser(req) {
  const token = String(req.headers?.authorization || "").match(/^Bearer\s+(\S+)$/i)?.[1];
  if (!token) return { error: "A Supabase bearer token is required", status: 401 };
  if (!SUPABASE_URL || !SUPABASE_PUBLIC_KEY) return { error: "Supabase authentication is not configured", status: 500 };
  const response = await fetch(`${SUPABASE_URL.replace(/\/+$/, "")}/auth/v1/user`, {
    headers: { apikey: SUPABASE_PUBLIC_KEY, Authorization: `Bearer ${token}` },
  });
  if (!response.ok) return { error: "Invalid Supabase bearer token", status: 401 };
  const user = await response.json();
  const email = String(user?.email || "").trim().toLowerCase();
  return validEmail(email) ? { email } : { error: "Authenticated user has no valid email address", status: 403 };
}

function emailShell(bodyHtml) {
  return `<!doctype html>
<html><body style="font-family:Arial,Helvetica,sans-serif;background:#f4f4f4;margin:0;padding:24px;color:#222;">
  <table cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;">
    <tr><td style="padding:24px 24px 8px;text-align:center;">
      <img src="${LOGO_URL}" alt="10BottleValueCo" width="60" style="display:block;width:60px;height:auto;max-width:60px;margin:0 auto 10px;" />
      <div style="font-size:20px;font-weight:bold;letter-spacing:1px;">10BottleValueCo</div>
    </td></tr>
    <tr><td style="padding:8px 32px 24px;">${bodyHtml}</td></tr>
    <tr><td style="background:#fff;border-top:1px solid #eee;color:#888;padding:18px 24px;font-size:12px;text-align:center;line-height:1.7;">
      SUPPORT: <a href="mailto:${SUPPORT_EMAIL}" style="color:#888;">${SUPPORT_EMAIL}</a><br/>
      OPERATED FROM LIELVĀRDE, LV-5071, LATVIA<br/>
      ORDERS ARE FULFILLED BY INTERNATIONAL PARTNERS<br/>
      <a href="${SITE_URL}" style="color:#888;">Website</a> · <a href="${SITE_URL}/?page=terms" style="color:#888;">Terms</a> · <a href="${SITE_URL}/?page=privacy" style="color:#888;">Privacy</a><br/><br/>
      FOR LABORATORY RESEARCH USE ONLY. NOT FOR HUMAN OR ANIMAL USE.
    </td></tr>
  </table>
</body></html>`;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Method not allowed" });

  let auth;
  try {
    auth = await authenticateUser(req);
  } catch {
    return res.status(502).json({ ok: false, error: "Unable to verify Supabase user" });
  }
  if (auth.error) return res.status(auth.status).json({ ok: false, error: auth.error });

  const requestedEmail = String(req.body?.email || "").trim().toLowerCase();
  if (!validEmail(requestedEmail)) return res.status(400).json({ ok: false, error: "A valid email is required" });
  if (requestedEmail !== auth.email) return res.status(403).json({ ok: false, error: "Email must match the authenticated account" });
  if (!process.env.RESEND_API_KEY) return res.status(500).json({ ok: false, error: "Missing RESEND_API_KEY" });
  const safeEmail = auth.email.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char]);

  const html = emailShell(`
    <h1 style="margin:0 0 12px;font-size:22px;text-align:center;">Account created successfully</h1>
    <p style="margin:0 0 12px;color:#444;">Your 10BottleValueCo account has been created successfully.</p>
    <p style="margin:0 0 16px;color:#444;"><strong>Email:</strong> ${safeEmail}</p>
    <div style="background:#f6f6f6;border-radius:6px;padding:16px 20px;margin:0 0 24px;">
      <div style="font-weight:bold;margin-bottom:8px;">What you can do next:</div>
      <div style="color:#444;line-height:1.9;">
        ✓ Browse 10-vial bulk kits only<br/>
        ✓ Review order details from your account<br/>
        ✓ Track updates after fulfillment<br/>
        ✓ Leave a review on Trustpilot and get 10% off your next order
      </div>
    </div>
    <div style="text-align:center;margin:24px 0 12px;">
      <a href="${SITE_URL}/?page=account" style="display:inline-block;background:#000;color:#fff;text-decoration:none;padding:12px 32px;border-radius:24px;font-weight:bold;letter-spacing:1px;">GO TO ACCOUNT</a>
    </div>
    <div style="text-align:center;margin:0 0 8px;">
      <a href="${TRUSTPILOT_URL}" style="display:inline-block;background:#00b67a;color:#fff;text-decoration:none;padding:12px 32px;border-radius:24px;font-weight:bold;letter-spacing:1px;">REVIEW ON TRUSTPILOT</a>
    </div>
  `);

  try {
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [auth.email],
        subject: "Your 10BottleValueCo account was created",
        html
      })
    });

    const data = await resp.json();

    if (!resp.ok) return res.status(500).json({ ok: false, error: data.message || "Resend error" });

    res.json({ ok: true, id: data.id });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}
