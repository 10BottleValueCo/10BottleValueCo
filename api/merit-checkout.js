import { requireVerifiedCustomer } from "./_require-customer.js";
import { MeritError, assertCheckoutOrigin } from "./_merit-core.js";
import { createMeritProvider } from "./_merit-provider.js";
import { createMeritStore } from "./_merit-storage.js";
import { reconcileMeritOrder } from "./_merit-reconcile.js";
import { sendMeritReceipt } from "./_merit-receipt.js";

const uuid = /^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i;
const record = value => value !== null && typeof value === "object" && !Array.isArray(value);

// Keep authenticated payment returns for existing orders. No environment flag
// or stale browser can reserve funds or start another payment through this route.
export function createMeritCheckoutHandler({ env = process.env, provider = createMeritProvider({ env }), store = createMeritStore({ env }), authenticate = requireVerifiedCustomer, notify = payload => sendMeritReceipt(payload, { env }) } = {}) {
  return async function handler(req, res) {
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("Vary", "Authorization");
    res.setHeader("X-Content-Type-Options", "nosniff");
    try {
      if (req.method === "GET") return res.status(200).json({ ok: true, enabled: false, retired: true });
      if (req.method !== "POST") { res.setHeader("Allow", "GET, POST"); return res.status(405).json({ ok: false, error: "Method not allowed." }); }
      assertCheckoutOrigin(req, env);
      if (!record(req.body) || Buffer.byteLength(JSON.stringify(req.body)) > 65536) throw new MeritError(400, "Checkout details are invalid.", "MERIT_INVALID_REQUEST");
      const customer = await authenticate(req, res, { purpose: "payment status" });
      if (!customer) return;
      res.setHeader("Cache-Control", "private, no-store");
      if (!uuid.test(customer.id || "") || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email || "")
        || customer.email !== customer.email.trim().toLowerCase()) throw new MeritError(401, "Sign in to check your payment.", "MERIT_IDENTITY_REQUIRED");
      if (req.body.action === "reconcile") {
        return res.status(200).json(await reconcileMeritOrder({ orderId: req.body.orderId, customerId: customer.id, provider, store, notify }));
      }
      if (req.body.action === "create") throw new MeritError(410, "This payment method is no longer available. Choose another payment method, or contact support about an existing payment.", "MERIT_CHECKOUT_RETIRED");
      throw new MeritError(400, "Checkout action is invalid.", "MERIT_INVALID_REQUEST");
    } catch (error) {
      const known = error instanceof MeritError;
      return res.status(known ? error.status : 503).json({ ok: false,
        error: known ? error.message : "Your payment status is unavailable. Check this checkout again before making another payment.",
        code: known ? error.code : "MERIT_PENDING" });
    }
  };
}

export default createMeritCheckoutHandler();
