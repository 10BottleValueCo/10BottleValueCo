import { requireUser } from "./_auth.js";
import { EMAIL_FACTOR_NAME, validatedSessionClaims, needsEmailLoginCode, totpCode, hasPasswordOrRecoveryProof } from "./_email-login-mfa.js";

class LoginError extends Error {
  constructor(status, message, code = "EMAIL_LOGIN_UNAVAILABLE") { super(message); this.status = status; this.code = code; }
}
function config() {
  const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "https://danpkqqzcptamojrnrmk.supabase.co").replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new LoginError(503, "Email login verification is not configured.");
  return { url, key };
}
async function request(c, path, { token, body, method = "POST" } = {}) {
  const response = await fetch(c.url + path, {
    method, headers: { apikey: c.key, Authorization: `Bearer ${token || c.key}`, "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(8000),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 404 && String(data?.code || "").startsWith("PGRST")) throw new LoginError(503, "Run the email login SQL setup in Supabase first.", "EMAIL_LOGIN_SETUP_REQUIRED");
    if (response.status === 429) throw new LoginError(429, "Please wait before requesting another code.", "EMAIL_LOGIN_RATE_LIMITED");
    throw new LoginError(response.status < 500 ? 400 : 503, "Email verification could not be completed. Request a new code and try again.");
  }
  return data;
}
const rpc = (c, name, body) => request(c, "/rest/v1/rpc/" + name, { body });
const native = (c, path, token, body, method = "POST") => request(c, "/auth/v1/" + path, { token, body, method });
function challengeArgs(user, sessionId, purpose, step, id) {
  return { p_user: user.id, p_session: sessionId, p_purpose: purpose, p_step: step, p_email: user.email.trim().toLowerCase(), ...(id ? { p_id: id } : {}) };
}
function assertChallenge(result) {
  if (result?.error) throw new LoginError(result.error === "rate_limited" ? 429 : 400,
    result.error === "rate_limited" ? "Please wait 60 seconds before resending. Too many attempts may require 15 minutes." : "This code request has expired or reached its attempt limit. Request a new code.",
    "EMAIL_LOGIN_CHALLENGE_REJECTED");
  return result;
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "private, no-store");
  if (!["GET", "POST"].includes(req.method)) { res.setHeader("Allow", "GET, POST"); return res.status(405).json({ ok: false, error: "Method not allowed." }); }
  // These narrowly scoped challenge/status endpoints accept the first-factor
  // session; all account/data endpoints enforce the second factor.
  const user = await requireUser(req, res, { allowEmailChallenge: true });
  if (!user) return;
  const token = req.headers.authorization.match(/^Bearer\s+(\S+)$/i)[1];
  const claims = validatedSessionClaims(user, token);
  if (!/^[0-9a-f-]{36}$/i.test(claims.session_id || "")) return res.status(401).json({ ok: false, error: "Sign in again before continuing." });
  try {
    const c = config();
    let state;
    try { state = await rpc(c, "email_login_state", { p_user: user.id, p_session: claims.session_id }); }
    catch (error) {
      if (req.method === "GET" && error.code === "EMAIL_LOGIN_SETUP_REQUIRED")
        return res.status(200).json({ ok: true, userId: user.id, email: user.email, available: false, enabled: false, requiresCode: needsEmailLoginCode(user, token) });
      throw error;
    }
    let factor = user.factors?.find(f => f.id === state.factor?.id);
    // Reconcile a completed native unenrollment whose final database response
    // was lost, without leaving an unusable enrollment/secret behind.
    if (state.factor && Array.isArray(user.factors) && !factor) {
      await rpc(c, "email_login_remove_factor", { p_user: user.id, p_factor: state.factor.id });
      state = { factor: null, challenge: null };
    }
    const enabled = factor?.status === "verified";
    if (req.method === "GET") return res.status(200).json({
      ok: true, userId: user.id, email: user.email, available: Boolean(user.email_confirmed_at),
      enabled, requiresCode: needsEmailLoginCode(user, token), challenge: state.challenge,
    });
    let body = req.body;
    if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = null; } }
    const { action, purpose, challengeId, code } = body || {};
    if (!["send", "verify", "disable"].includes(action) || !["enable", "disable", "login"].includes(purpose)
      || (action === "disable" && purpose !== "disable"))
      throw new LoginError(400, "Invalid verification request.");
    if (!user.email_confirmed_at) throw new LoginError(403, "Confirm your account email first.");
    if (!hasPasswordOrRecoveryProof(claims)) throw new LoginError(403, "Sign in with your password first, then confirm the email code.", "EMAIL_LOGIN_PASSWORD_REQUIRED");
    if (purpose === "disable" && (!enabled || claims.aal !== "aal2")) throw new LoginError(403, "Complete email verification before disabling this protection.");
    if (purpose === "enable" && enabled) throw new LoginError(409, "Email verification is already enabled.");
    if (purpose === "login" && !enabled) throw new LoginError(409, "Email verification is not enabled for this account.");
    if (action === "disable") {
      // The existing password + second-factor session is sufficient. Never
      // allow a password-only session to remove the sign-in requirement.
      await native(c, "factors/" + state.factor.id, token, undefined, "DELETE");
      await rpc(c, "email_login_remove_factor", { p_user: user.id, p_factor: state.factor.id });
      return res.status(200).json({ ok: true, enabled: false });
    }
    if (action === "send") {
      // Reserve the user's rate-limited slot before any SMTP request or factor
      // enrollment, including simultaneous requests from different sessions.
      const challenge = assertChallenge(await rpc(c, "email_login_challenge", challengeArgs(user, claims.session_id, purpose, "send")));
      if (purpose === "enable" && !state.factor) {
        for (const stale of user.factors || []) {
          if (stale.friendly_name === EMAIL_FACTOR_NAME && stale.status === "unverified")
            await native(c, "factors/" + stale.id, token, undefined, "DELETE");
        }
        const enrollment = await native(c, "factors", token, { factor_type: "totp", friendly_name: EMAIL_FACTOR_NAME, issuer: "10BottleValueCo" });
        try {
          await rpc(c, "email_login_store_factor", { p_user: user.id, p_factor: enrollment.id, p_secret: enrollment.totp.secret.toUpperCase() });
        } catch (error) {
          await native(c, "factors/" + enrollment.id, token, undefined, "DELETE").catch(() => {});
          throw error;
        }
      }
      // Supabase delivers the code using its existing SMTP configuration.
      // The Magic Link template must display {{ .Token }} for this flow.
      await native(c, "otp", token, { email: user.email, create_user: false });
      await rpc(c, "email_login_challenge", challengeArgs(user, claims.session_id, purpose, "delivered", challenge.id));
      return res.status(200).json({ ok: true, challenge });
    }
    if (!/^\d{6}$/.test(String(code || "")) || !/^[0-9a-f-]{36}$/i.test(challengeId || ""))
      throw new LoginError(400, "Enter the six-digit code from your email.");
    assertChallenge(await rpc(c, "email_login_challenge", challengeArgs(user, claims.session_id, purpose, "claim", challengeId)));
    let emailProof;
    try {
      emailProof = await native(c, "verify", token, { email: user.email, token: code, type: "email" });
      if (emailProof?.user?.id !== user.id || emailProof.user.email?.toLowerCase() !== user.email.toLowerCase())
        throw new LoginError(403, "The code does not match this account.");
    } catch {
      await rpc(c, "email_login_challenge", challengeArgs(user, claims.session_id, purpose, "failed", challengeId)).catch(() => {});
      throw new LoginError(400, "Invalid or expired code. Check the latest email and try again.", "EMAIL_LOGIN_INVALID_CODE");
    }
    // The temporary email-only Supabase session is never returned to a client.
    // It is not the password+second-factor session being upgraded.
    if (emailProof.access_token) await native(c, "logout?scope=local", emailProof.access_token, undefined).catch(() => {});
    assertChallenge(await rpc(c, "email_login_challenge", challengeArgs(user, claims.session_id, purpose, "consume", challengeId)));
    const factorId = state.factor?.id;
    if (!factorId) throw new LoginError(503, "Verification setup is incomplete. Request a new code.");
    if (purpose === "disable") {
      await native(c, "factors/" + factorId, token, undefined, "DELETE");
      await rpc(c, "email_login_remove_factor", { p_user: user.id, p_factor: factorId });
      return res.status(200).json({ ok: true, enabled: false });
    }
    const secret = await rpc(c, "email_login_factor_secret", { p_user: user.id });
    const nativeChallenge = await native(c, "factors/" + factorId + "/challenge", token, {});
    const session = await native(c, "factors/" + factorId + "/verify", token, {
      challenge_id: nativeChallenge.id, code: totpCode(secret),
    });
    if (!session?.access_token || !session.refresh_token || session.user?.id !== user.id
      || validatedSessionClaims(user, session.access_token).aal !== "aal2"
      || !hasPasswordOrRecoveryProof(validatedSessionClaims(user, session.access_token)))
      throw new LoginError(503, "Could not establish the verified session. Request a new code.");
    return res.status(200).json({ ok: true, enabled: true, session });
  } catch (error) {
    return res.status(error instanceof LoginError ? error.status : 503).json({
      ok: false, code: error instanceof LoginError ? error.code : "EMAIL_LOGIN_UNAVAILABLE",
      error: error instanceof LoginError ? error.message : "Email verification is temporarily unavailable. Please try again.",
    });
  }
}
