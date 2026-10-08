import { requireUser } from "./_auth.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const emailKey = (value) => typeof value === "string" ? value.trim().toLowerCase() : "";

// Registration is already required by checkout. Verify that same identity on
// every provider-create route. This is not an order-ownership or quote guard:
// those still require the coordinated server-order and database transition.
export async function requireCheckoutIdentity(req, res) {
  const user = await requireUser(req, res);
  if (!user) return null;
  const email = emailKey(user.email);
  if (!UUID.test(user.id) || !user.email_confirmed_at || !email
    || email.length > 320 || /[\u0000-\u0020\u007f]/.test(email) || !email.includes("@")) {
    res.status(403).json({ error: "Sign in with a confirmed email to continue checkout.", code: "CHECKOUT_IDENTITY_REQUIRED" });
    return null;
  }
  const body = req.body;
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    res.status(400).json({ error: "Invalid checkout request." });
    return null;
  }
  for (const claimed of [body.email, body.customer_email, body.metadata?.email]) {
    if (claimed !== undefined && claimed !== null && claimed !== "" && emailKey(claimed) !== email) {
      res.status(403).json({ error: "Checkout email must match your signed-in account.", code: "CHECKOUT_IDENTITY_MISMATCH" });
      return null;
    }
  }
  return { id: user.id.toLowerCase(), email };
}
