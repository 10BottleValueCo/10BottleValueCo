// Retired privileged registration endpoint. Account creation must prove email
// ownership through Supabase Auth; never pre-confirm caller-supplied email.
export default function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  return res.status(410).json({ ok: false, code: "signup_flow_updated", error: "Refresh the store to create your account securely." });
}
