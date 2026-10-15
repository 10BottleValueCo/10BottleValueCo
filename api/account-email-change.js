import { CURRENT_EMAIL_MODE, EMAIL_RESEND_INTERVAL_MS, MAX_CODE_ATTEMPTS, createEmailChallenge, currentEmailStatus, emailCodeMatches, sendCurrentEmailCode } from "./_current-email-confirmation.js";
import { needsEmailLoginCode } from "./_email-login-mfa.js";

const PENDING_FIELD = "tbv_pending_email_migration";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

class EmailChangeError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function getConfig() {
  const url = String(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "",
  ).replace(/\/+$/, "");
  const anonKey =
    process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url || !anonKey || !serviceKey) {
    throw new EmailChangeError(503, "Email changes are temporarily unavailable.");
  }
  return { url, anonKey, serviceKey };
}

function serviceHeaders(serviceKey, json = false) {
  return {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    ...(json ? { "Content-Type": "application/json" } : {}),
  };
}

async function readBody(response) {
  return response.json().catch(() => null);
}

async function getCustomer(req, config) {
  const token = /^Bearer\s+(.+)$/i.exec(
    String(req.headers?.authorization || ""),
  )?.[1];
  if (!token) throw new EmailChangeError(401, "Sign in to change your email.");

  let response;
  try {
    response = await fetch(`${config.url}/auth/v1/user`, {
      headers: {
        apikey: config.anonKey,
        Authorization: `Bearer ${token}`,
      },
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    throw new EmailChangeError(503, "Could not verify your sign-in.");
  }
  if (!response.ok) throw new EmailChangeError(401, "Your sign-in has expired.");
  const user = await readBody(response);
  if (needsEmailLoginCode(user, token)) throw new EmailChangeError(403, "Confirm your email login code first.");
  const id = String(user?.id || "");
  const email = normalizeEmail(user?.email);
  if (!id || !EMAIL_PATTERN.test(email)) {
    throw new EmailChangeError(401, "Your sign-in could not be verified.");
  }
  return { id, email, token };
}

async function adminRequest(config, userId, method = "GET", body) {
  let response;
  try {
    response = await fetch(
      `${config.url}/auth/v1/admin/users/${encodeURIComponent(userId)}`,
      {
        method,
        headers: serviceHeaders(config.serviceKey, body !== undefined),
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        signal: AbortSignal.timeout(10000),
      },
    );
  } catch {
    throw new EmailChangeError(503, "Email changes are temporarily unavailable.");
  }
  if (!response.ok) {
    const error = await readBody(response);
    if (error?.code === "email_exists" || /already.*(registered|exists)/i.test(String(error?.msg || error?.message || ""))) {
      throw new EmailChangeError(409, "This email is already used by another account. Enter a different email.");
    }
    throw new EmailChangeError(503, "Email changes are temporarily unavailable.");
  }
  const result = await readBody(response);
  return result?.user || result;
}

async function restRequest(config, table, params, method = "GET", body) {
  let response;
  try {
    response = await fetch(
      `${config.url}/rest/v1/${table}?${params.toString()}`,
      {
        method,
        headers: {
          ...serviceHeaders(config.serviceKey, body !== undefined),
          ...(method === "PATCH" ? { Prefer: "return=minimal" } : {}),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        signal: AbortSignal.timeout(10000),
      },
    );
  } catch {
    throw new EmailChangeError(503, "Account history could not be transferred yet.");
  }
  if (!response.ok) {
    throw new EmailChangeError(503, "Account history could not be transferred yet.");
  }
  return method === "GET" ? await readBody(response) : null;
}

async function assertNoUniqueConflicts(config, email) {
  for (const table of ["user_credits", "affiliates"]) {
    const params = new URLSearchParams({
      select: "email",
      email: `eq.${email}`,
      limit: "1",
    });
    const rows = await restRequest(config, table, params);
    if (Array.isArray(rows) && rows.length > 0) {
      throw new EmailChangeError(
        409,
        "The new email already has a balance or affiliate account. Contact support before changing it.",
      );
    }
  }
}

async function verifyCurrentPassword(config, customer, password) {
  if (typeof password !== "string" || password.length === 0) {
    throw new EmailChangeError(400, "Enter your current password.");
  }
  let response;
  try {
    response = await fetch(
      `${config.url}/auth/v1/token?grant_type=password`,
      {
        method: "POST",
        headers: {
          apikey: config.anonKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: customer.email, password }),
        signal: AbortSignal.timeout(8000),
      },
    );
  } catch {
    throw new EmailChangeError(503, "Could not verify your current password.");
  }
  if (!response.ok) {
    throw new EmailChangeError(401, "The current password is incorrect.");
  }
  const proof = await readBody(response);
  if (String(proof?.user?.id || "") !== customer.id) {
    throw new EmailChangeError(401, "The current password is incorrect.");
  }
}

async function setPending(config, user, pending) {
  await adminRequest(config, user.id, "PUT", {
    app_metadata: { [PENDING_FIELD]: pending },
  });
}

async function clearPending(config, userId, expected) {
  const latest = await adminRequest(config, userId);
  const metadata =
    latest?.app_metadata && typeof latest.app_metadata === "object"
      ? latest.app_metadata
      : {};
  const pending = metadata[PENDING_FIELD];
  if (
    expected &&
    (!pending ||
      normalizeEmail(pending.from) !== normalizeEmail(expected.from) ||
      normalizeEmail(pending.to) !== normalizeEmail(expected.to) ||
      (expected.createdAt && pending.createdAt !== expected.createdAt))
  ) {
    return;
  }
  if (!pending) return;
  // Supabase merges app_metadata; omitting a key does not remove it.
  // Null explicitly removes only our reservation without rewriting roles.
  await adminRequest(config, userId, "PUT", { app_metadata: { [PENDING_FIELD]: null } });
}

async function prepare(req, config, customer, body, replace = false, checkAuthEmail = false) {
  const currentEmail = normalizeEmail(body.currentEmail);
  const newEmail = normalizeEmail(body.newEmail);
  if (currentEmail !== customer.email) {
    throw new EmailChangeError(400, "Enter the email currently used by your account.");
  }
  if (!EMAIL_PATTERN.test(newEmail)) {
    throw new EmailChangeError(400, "Enter a valid new email address.");
  }
  if (newEmail === customer.email) {
    throw new EmailChangeError(400, "The new email must be different.");
  }

  await verifyCurrentPassword(config, customer, body.currentPassword);
  const user = await adminRequest(config, customer.id);
  if (normalizeEmail(user?.email) !== customer.email) {
    throw new EmailChangeError(409, "Your account email changed. Reload and try again.");
  }

  let existing = user?.app_metadata?.[PENDING_FIELD];
  if (existing) {
    const stale =
      normalizeEmail(user.email) === normalizeEmail(existing.from) &&
      !normalizeEmail(user.new_email) && existing.mode !== CURRENT_EMAIL_MODE;
    if (stale) {
      await clearPending(config, customer.id, existing);
      existing = null;
    }
  }
  if (existing && (!replace || normalizeEmail(existing.from) !== customer.email)) {
    throw new EmailChangeError(
      409,
      "An email change is already pending. Check its status before starting another.",
    );
  }

  await assertNoUniqueConflicts(config, newEmail);
  if (checkAuthEmail) await assertAuthEmailAvailable(config, customer, newEmail);
  const pending = {
    from: customer.email,
    to: newEmail,
    createdAt: new Date().toISOString(),
  };
  await setPending(config, user, pending);
  return { ok: true, prepared: true, ...(replace ? { previousPending: existing || null, pending } : {}) };
}

async function cancel(config, customer) {
  const user = await adminRequest(config, customer.id);
  const pending = user?.app_metadata?.[PENDING_FIELD];
  if (!pending) return { ok: true, cancelled: false };
  if (normalizeEmail(user.email) !== normalizeEmail(pending.from)) {
    throw new EmailChangeError(409, "This email change has already been confirmed.");
  }
  if (normalizeEmail(user.new_email) === normalizeEmail(pending.to)) {
    throw new EmailChangeError(409, "This change is awaiting confirmation. Enter a different email to replace it.");
  }
  await clearPending(config, customer.id, pending);
  return { ok: true, cancelled: true };
}

async function assertAuthEmailAvailable(config, customer, email) {
  for (let page = 1; page <= 10; page++) {
    let response;
    try {
      const params = new URLSearchParams({ filter: email, per_page: "1000", page: String(page) });
      response = await fetch(`${config.url}/auth/v1/admin/users?${params}`, {
        headers: serviceHeaders(config.serviceKey), signal: AbortSignal.timeout(8000),
      });
    } catch {
      throw new EmailChangeError(503, "Could not check the new email. Please try again.");
    }
    const data = await readBody(response);
    if (!response.ok || !Array.isArray(data?.users)) throw new EmailChangeError(503, "Could not check the new email. Please try again.");
    if (data.users.some(user => user.id !== customer.id && normalizeEmail(user.email) === email)) {
      throw new EmailChangeError(409, "This email is already used by another account. Enter a different email.");
    }
    if (data.users.length < 1000) return;
  }
  throw new EmailChangeError(503, "Could not check the new email. Please try again.");
}

async function requestCurrentEmailCode(req, config, customer, body) {
  if (!process.env.RESEND_API_KEY) throw new EmailChangeError(503, "Confirmation emails are temporarily unavailable.");
  const before = await adminRequest(config, customer.id);
  const previous = before?.app_metadata?.[PENDING_FIELD];
  if (previous?.mode === CURRENT_EMAIL_MODE && Date.now() - Date.parse(previous.createdAt) < EMAIL_RESEND_INTERVAL_MS) {
    throw new EmailChangeError(429, "Too many email requests. Wait a minute and try again.");
  }
  const reservation = await prepare(req, config, customer, body, true, true);
  // Retire older two-mailbox links before creating the current-mailbox proof.
  if (before.new_email) {
    await adminRequest(config, customer.id, "PUT", { email: customer.email, email_confirm: true });
    const latest = await adminRequest(config, customer.id);
    if (normalizeEmail(latest.new_email)) {
      await setPending(config, latest, reservation.previousPending);
      throw new EmailChangeError(409, "The previous email-confirmation links could not be retired. Contact support.");
    }
  }
  const { pending, code } = createEmailChallenge(config.serviceKey, customer.id, customer.email, reservation.pending.to);
  await setPending(config, { id: customer.id }, pending);
  try {
    await sendCurrentEmailCode(pending, code);
  } catch {
    // Preserve the rate-limit timestamp but never claim delivery succeeded.
    await setPending(config, { id: customer.id }, { ...pending, delivery: "failed", codeHash: null });
    throw new EmailChangeError(503, "Could not send the confirmation email. Please try again.");
  }
  const latest = await adminRequest(config, customer.id);
  if (normalizeEmail(latest.email) !== customer.email ||
      latest.app_metadata?.[PENDING_FIELD]?.nonce !== pending.nonce) {
    throw new EmailChangeError(409, "This request was replaced. Check status before continuing.");
  }
  await setPending(config, { id: customer.id }, { ...pending, delivery: "sent" });
  return currentEmailStatus({ ...pending, delivery: "sent" });
}

async function confirmCurrentEmailCode(config, customer, req, body) {
  const user = await adminRequest(config, customer.id);
  const pending = user?.app_metadata?.[PENDING_FIELD];
  if (!pending || pending.mode !== CURRENT_EMAIL_MODE) throw new EmailChangeError(409, "Request a new confirmation code.");
  if (normalizeEmail(user.email) === normalizeEmail(pending.to)) return finalize(config, customer, req);
  if (normalizeEmail(user.email) !== normalizeEmail(pending.from) || customer.email !== normalizeEmail(pending.from)) {
    throw new EmailChangeError(409, "Your account email changed. Reload and try again.");
  }
  if (normalizeEmail(body.newEmail) !== normalizeEmail(pending.to)) {
    throw new EmailChangeError(409, "This code is for a different email-change request. Check status or request a new code.");
  }
  const state = currentEmailStatus(pending);
  if (!state.confirmationSent) throw new EmailChangeError(409, "Request a new confirmation code.");
  if (state.codeExpired) throw new EmailChangeError(410, "The confirmation code has expired. Request a new code.");
  if (state.codeLocked) throw new EmailChangeError(429, "Too many incorrect codes. Request a new code.");
  if (!emailCodeMatches(config.serviceKey, customer.id, pending, body.code)) {
    await setPending(config, user, { ...pending, attempts: Number(pending.attempts || 0) + 1 });
    throw new EmailChangeError(400, "The confirmation code is incorrect.");
  }
  await assertNoUniqueConflicts(config, pending.to);
  await assertAuthEmailAvailable(config, customer, pending.to);
  await adminRequest(config, customer.id, "PUT", {
    email: pending.to, email_confirm: true,
    app_metadata: { [PENDING_FIELD]: pending },
  });
  try {
    return await finalize(config, customer, req);
  } catch (error) {
    if (error instanceof EmailChangeError && error.status >= 500) {
      return { ok: true, migrated: false, pendingMigration: true, newEmail: pending.to };
    }
    throw error;
  }
}

async function transferEmailRows(config, from, to) {
  for (const table of [
    "orders",
    "user_credits",
    "user_promos",
    "contact_messages",
    "affiliates",
  ]) {
    const params = new URLSearchParams({ email: `eq.${from}` });
    await restRequest(config, table, params, "PATCH", { email: to });
  }

}

async function finalize(config, customer, req) {
  const user = await adminRequest(config, customer.id);
  const pending = user?.app_metadata?.[PENDING_FIELD];
  if (!pending) return { ok: true, migrated: false };
  const from = normalizeEmail(pending.from);
  const to = normalizeEmail(pending.to);
  if (from === "" || to === "" || !EMAIL_PATTERN.test(from) || !EMAIL_PATTERN.test(to)) {
    throw new EmailChangeError(409, "The pending email change needs support review.");
  }
  const adminEmail = normalizeEmail(user.email);
  if (adminEmail !== to) {
    if (adminEmail === from) {
      if (pending.mode === CURRENT_EMAIL_MODE) return currentEmailStatus(pending);
      if (normalizeEmail(user.new_email) === to) {
        return { ok: true, migrated: false, pendingConfirmation: true, newEmail: to };
      }
      return { ok: true, migrated: false, requestNotSent: true };
    }
    throw new EmailChangeError(409, "The pending email change needs support review.");
  }

  await transferEmailRows(config, from, to);
  await clearPending(config, customer.id, pending);
  req.log?.info?.({ requestId: req.id }, "Account email history transferred");
  return { ok: true, migrated: true, email: to };
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "private, no-store");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method not allowed." });
  }

  try {
    const config = getConfig();
    const customer = await getCustomer(req, config);
    const body =
      req.body && typeof req.body === "object" && !Array.isArray(req.body)
        ? req.body
        : {};

    let result;
    if (body.action === "request-current") result = await requestCurrentEmailCode(req, config, customer, body);
    else if (body.action === "confirm-current") result = await confirmCurrentEmailCode(config, customer, req, body);
    else if (body.action === "request") throw new EmailChangeError(409, "Reload this page to confirm the change using only your current email.");
    else if (body.action === "prepare") result = await prepare(req, config, customer, body);
    else if (body.action === "cancel") result = await cancel(config, customer);
    else if (body.action === "finalize") result = await finalize(config, customer, req);
    else throw new EmailChangeError(400, "Invalid email change action.");

    return res.status(200).json(result);
  } catch (error) {
    const status = error instanceof EmailChangeError ? error.status : 503;
    if (status >= 500) {
      req.log?.error?.({ requestId: req.id, errorType: error?.name || "unknown" }, "Account email change failed");
    }
    return res.status(status).json({
      ok: false,
      error:
        error instanceof EmailChangeError
          ? error.message
          : "Email changes are temporarily unavailable.",
    });
  }
}
