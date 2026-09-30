const SB_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const SB_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
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
  if (!SB_URL || !SB_SERVICE_KEY) {
    return jsonError(res, 500, "Supabase URL and service-role key are required");
  }
  if (!process.env.RESEND_API_KEY) return jsonError(res, 500, "Missing RESEND_API_KEY");

  const orderNumber = String(req.body?.orderNumber || "").trim();
  const requestedEmail = String(req.body?.email || "").trim().toLowerCase();
  if (!orderNumber || !requestedEmail) return jsonError(res, 400, "orderNumber and email are required");
  if (orderNumber.length > 160 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(requestedEmail)) {
    return jsonError(res, 400, "Invalid orderNumber or email");
  }

  try {
    const orderResponse = await supabaseRequest(
      `orders?id=eq.${encodeURIComponent(orderNumber)}&select=id,email,status,total,metadata&limit=1`
    );
    if (!orderResponse.ok) {
      const details = await orderResponse.text();
      if (/metadata/i.test(details) && /column|field|schema/i.test(details)) {
        return jsonError(res, 501, "Wire confirmation idempotency requires orders.metadata (JSON/JSONB); the column is unavailable", details);
      }
      return jsonError(res, 502, "Could not verify order in Supabase", details);
    }
    const rows = await orderResponse.json();
    const order = Array.isArray(rows) && rows.length === 1 ? rows[0] : null;
    if (!order) return jsonError(res, 404, "Order not found");
    const storedEmail = String(order.email || "").trim().toLowerCase();
    if (!storedEmail || storedEmail !== requestedEmail) {
      return jsonError(res, 403, "Email does not match the order recipient");
    }

    const metadata = order.metadata && typeof order.metadata === "object" && !Array.isArray(order.metadata)
      ? order.metadata
      : {};
    if (String(order.status || "").toLowerCase() !== "wire_pending" || !metadata.wireConfirmedAt) {
      return jsonError(res, 409, "Order is not a verified wire-transfer checkout");
    }
    if (metadata.email && String(metadata.email).trim().toLowerCase() !== storedEmail) {
      return jsonError(res, 409, "Order email metadata does not match the stored order recipient");
    }
    if (metadata.wireConfirmationEmailSentAt || metadata.wireConfirmationEmailSendStartedAt) {
      return jsonError(res, 409, "Wire confirmation email has already been sent or claimed");
    }

    const claimedAt = new Date().toISOString();
    const claimMetadata = { ...metadata, wireConfirmationEmailSendStartedAt: claimedAt };
    const claim = await supabaseRequest(
      `orders?id=eq.${encodeURIComponent(orderNumber)}&email=eq.${encodeURIComponent(storedEmail)}&status=eq.wire_pending&metadata-%3E%3EwireConfirmationEmailSendStartedAt=is.null&select=id`,
      {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({ metadata: claimMetadata }),
      }
    );
    if (!claim.ok) {
      const details = await claim.text();
      if (/metadata/i.test(details) && /column|field|schema/i.test(details)) {
        return jsonError(res, 501, "Wire confirmation idempotency requires orders.metadata (JSON/JSONB); the column is unavailable", details);
      }
      return jsonError(res, 502, "Could not claim wire confirmation email send", details);
    }
    const claimedRows = await claim.json();
    if (!Array.isArray(claimedRows) || claimedRows.length !== 1) {
      return jsonError(res, 409, "Wire confirmation email has already been sent or claimed");
    }

    const firstName = String(metadata.firstName || "").trim();
    const greeting = firstName ? `Hello ${escapeHtml(firstName)},` : "Hello,";
    const total = Number(order.total ?? metadata.total);
    const safeTotal = Number.isFinite(total) ? total.toFixed(2) : "";
    const html = `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#222"><h1>Wire transfer instructions</h1><p>${greeting}</p><p>We have received your order ${escapeHtml(order.id)} and recorded your selection to pay by wire transfer.</p>${safeTotal ? `<p>Order total: <strong>$${safeTotal}</strong></p>` : ""}<p>Please contact support@10bottlevalue.co for the current bank transfer instructions. Your order will be processed after payment is received and verified.</p><p>10BottleValueCo Support</p></body></html>`;
    const sent = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [storedEmail],
        subject: `Wire transfer order confirmation — ${String(order.id)}`,
        html,
      }),
    });
    const result = await sent.json().catch(() => ({}));
    await supabaseRequest(`orders?id=eq.${encodeURIComponent(orderNumber)}`, {
      method: "PATCH",
      body: JSON.stringify({
        metadata: {
          ...claimMetadata,
          wireConfirmationEmailSentAt: sent.ok ? new Date().toISOString() : null,
          wireConfirmationEmailSendStatus: sent.ok ? "sent" : "failed",
          wireConfirmationEmailProviderId: sent.ok ? (result.id || null) : null,
        },
      }),
    }).catch(() => {});
    if (!sent.ok) return jsonError(res, 502, result.message || "Email provider rejected the wire confirmation");
    return res.status(200).json({ ok: true, id: result.id });
  } catch (error) {
    return jsonError(res, 500, "Wire confirmation request failed", error.message);
  }
}