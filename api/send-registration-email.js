// Supabase Auth owns registration delivery. This unused public sender is retired.
export default function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  return res.status(410).json({ ok: false, error: "Registration emails are managed by account verification." });
}
