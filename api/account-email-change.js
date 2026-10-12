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

async function prepare(req, config, customer, body, replace = false) {
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
      !normalizeEmail(user.new_email);
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
  const pending = {
    from: customer.email,
    to: newEmail,
    createdAt: new Date().toISOString(),
  };
  await setPending(config, user, pending);
  return { ok: true, prepared: true, ...(replace ? { previousPending: existing || null, pending } : {}) };
}

async function requestEmailChange(req, config, customer, body) {
  const reservation = await prepare(req, config, customer, body, true);
  let failure;
  let rejected = false;
  try {
    const response = await fetch(`${config.url}/auth/v1/user`, {
      method: "PUT",
      headers: {
        apikey: config.anonKey,
        Authorization: `Bearer ${customer.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email: reservation.pending.to }),
      signal: AbortSignal.timeout(10000),
    });
    const result = await readBody(response);
    if (!response.ok) {
      rejected = true;
      const taken = result?.code === "email_exists" ||
        /already.*(registered|exists|use)|email.*taken/i.test(String(result?.msg || result?.message || result?.error_description || ""));
      const limited = response.status === 429;
      failure = new EmailChangeError(
        taken ? 409 : limited ? 429 : 503,
        taken ? "This email is already used by another account. Enter a different email."
          : limited ? "Too many email requests. Wait a few minutes and try again."
          : "Could not send the confirmation email. Please try again.",
      );
    }
  } catch {
    failure = new EmailChangeError(503, "Could not verify whether the confirmation email was sent. Check status or try again.");
  }
  // Read the provider's actual state, not just our reservation. This also
  // reconciles a timeout after Supabase accepted the request.
  const user = await adminRequest(config, customer.id);
  if (normalizeEmail(user.email) === reservation.pending.to ||
      (!rejected && normalizeEmail(user.new_email) === reservation.pending.to)) {
    try {
      return await finalize(config, customer, req);
    } catch (error) {
      if (normalizeEmail(user.email) === reservation.pending.to &&
          error instanceof EmailChangeError && error.status >= 500) {
        return { ok: true, migrated: false, pendingMigration: true, newEmail: reservation.pending.to };
      }
      throw error;
    }
  }
  const latest = user?.app_metadata?.[PENDING_FIELD];
  if (latest?.createdAt === reservation.pending.createdAt &&
      normalizeEmail(latest.to) === reservation.pending.to) {
    if (reservation.previousPending) await setPending(config, user, reservation.previousPending);
    else await clearPending(config, customer.id, reservation.pending);
  }
  throw failure || new EmailChangeError(409, "The email change was not started. The address may already be in use. Enter a different email.");
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
    if (body.action === "request") result = await requestEmailChange(req, config, customer, body);
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
