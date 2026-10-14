export async function emailLoginApi(token, body) {
  if (!token) throw new Error("Sign in again before continuing.");
  const response = await fetch("/api/account-email-login", {
    method: body ? "POST" : "GET", cache: "no-store",
    headers: { Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": "application/json" } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(15000),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || !result?.ok) throw new Error(result?.error || "Could not verify your sign-in. Please try again.");
  return result;
}

// Deduplicate React effect replays without storing tokens or codes persistently.
const pendingSignInCodes = new Map();
export function prepareEmailSignInCode(token) {
  if (pendingSignInCodes.has(token)) return pendingSignInCodes.get(token);
  const pending = (async () => {
    const status = await emailLoginApi(token);
    const challenge = status.challenge;
    if (challenge?.purpose === "login" && new Date(challenge.expiresAt).getTime() > Date.now()) {
      return challenge;
    }
    const result = await emailLoginApi(token, { action: "send", purpose: "login" });
    if (!result.challenge?.id) throw new Error("Could not send the sign-in code. Please try again.");
    return result.challenge;
  })().finally(() => pendingSignInCodes.delete(token));
  pendingSignInCodes.set(token, pending);
  return pending;
}
