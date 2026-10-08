import { Router, type IRouter, type Request, type Response } from "express";
import { logger } from "../lib/logger";

const router: IRouter = Router();
const ADMIN_EMAIL = "support@10bottlevalue.co";

function normalizeEmail(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const replacements: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return replacements[character] ?? character;
  });
}

router.post(
  "/supabase/send-tracking-email",
  async (req: Request, res: Response) => {
    const body =
      req.body && typeof req.body === "object"
        ? (req.body as Record<string, unknown>)
        : {};
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const orderId = typeof body.orderId === "string" ? body.orderId.trim() : "";
    const trackingNumber =
      typeof body.trackingNumber === "string"
        ? body.trackingNumber.trim()
        : "";
    const firstName =
      typeof body.firstName === "string" ? body.firstName.trim() : "";

    if (
      !email ||
      email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      !orderId ||
      orderId.length > 120 ||
      !trackingNumber ||
      trackingNumber.length > 200 ||
      firstName.length > 100
    ) {
      return res.status(400).json({ error: "Invalid tracking email details" });
    }

    const token = req
      .header("authorization")
      ?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!token) {
      return res.status(401).json({ error: "Admin sign-in required" });
    }

    const supabaseUrl = process.env.VITE_SUPABASE_URL?.replace(/\/+$/, "");
    const supabaseAnonKey =
      process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
      return res.status(503).json({ error: "Admin authentication is unavailable" });
    }

    try {
      const authResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
        headers: {
          apikey: supabaseAnonKey,
          authorization: `Bearer ${token}`,
        },
        signal: AbortSignal.timeout(10000),
      });
      if (!authResponse.ok) {
        return res.status(401).json({ error: "Admin sign-in expired" });
      }

      const user = (await authResponse.json()) as { email?: unknown };
      if (normalizeEmail(user.email) !== ADMIN_EMAIL) {
        return res.status(403).json({ error: "Admin access required" });
      }
    } catch {
      return res.status(503).json({ error: "Could not verify admin sign-in" });
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      return res.status(503).json({ error: "Tracking email service is not configured" });
    }

    const safeFirstName = escapeHtml(firstName);
    const safeOrderId = escapeHtml(orderId);
    const safeTrackingNumber = escapeHtml(trackingNumber);
    const trackingUrl = `https://t.17track.net/en#nums=${encodeURIComponent(trackingNumber)}`;
    const greeting = safeFirstName ? `Hi ${safeFirstName},` : "Hello,";
    const subject = "Your order tracking number";
    const text = [
      greeting,
      "",
      `Your order ${orderId} has shipped.`,
      `Tracking number: ${trackingNumber}`,
      `Track your shipment: ${trackingUrl}`,
      "",
      "10 Bottle Value",
    ].join("\n");
    const html = `
      <div style="margin:0 auto;max-width:560px;padding:32px 24px;color:#20242a;font-family:Arial,sans-serif;line-height:1.6">
        <p>${greeting}</p>
        <p>Your order <strong>${safeOrderId}</strong> has shipped.</p>
        <p style="margin-bottom:6px">Tracking number:</p>
        <p style="font-size:18px;font-weight:700;letter-spacing:.04em">
          <a href="${trackingUrl}" style="color:#176b48">${safeTrackingNumber}</a>
        </p>
        <p>You can use the link above to follow your shipment.</p>
        <p style="margin-top:28px;color:#60666d">10 Bottle Value</p>
      </div>
    `;

    try {
      const emailResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "10 Bottle Value <support@10bottlevalue.co>",
          to: [email],
          reply_to: "support@10bottlevalue.co",
          subject,
          text,
          html,
        }),
        signal: AbortSignal.timeout(15000),
      });

      if (!emailResponse.ok) {
        logger.error(
          { statusCode: emailResponse.status },
          "Resend rejected a tracking email",
        );
        return res.status(502).json({ error: "Email provider rejected the message" });
      }

      const result = (await emailResponse.json()) as { id?: string };
      return res.status(200).json({ success: true, id: result.id });
    } catch (error) {
      logger.error({ err: error }, "Tracking email request failed");
      return res.status(502).json({ error: "Could not send the tracking email" });
    }
  },
);

export default router;
