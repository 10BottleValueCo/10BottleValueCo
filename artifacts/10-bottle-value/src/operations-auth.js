export class OperationsAuthError extends Error {
  constructor(code = "unavailable") { super("Operations access could not be verified."); this.code = code; }
}

export async function boundedAuth(work, { signal, timeoutMs = 20_000 } = {}) {
  const controller = new AbortController();
  let timer;
  let cancel;
  const stopped = new Promise((_, reject) => {
    cancel = () => { controller.abort(); reject(new OperationsAuthError("cancelled")); };
    if (signal?.aborted) { cancel(); return; }
    signal?.addEventListener("abort", cancel, { once: true });
    timer = setTimeout(() => { controller.abort(); reject(new OperationsAuthError()); }, timeoutMs);
  });
  try {
    return await Promise.race([stopped, Promise.resolve().then(() => {
      if (controller.signal.aborted) throw new OperationsAuthError("cancelled");
      return work(controller.signal);
    })]);
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", cancel);
  }
}

export function sessionIdentity(session) {
  return typeof session?.access_token === "string" && session.access_token && typeof session.user?.id === "string" && session.user.id
    && typeof session.user?.email === "string" && session.user.email.trim()
    ? `${session.user.id}:${session.access_token}` : "";
}

export async function checkOperationsAccess(session, { fetcher = fetch, signal, timeoutMs } = {}) {
  if (!sessionIdentity(session)) throw new OperationsAuthError("denied");
  return boundedAuth(async requestSignal => {
    const response = await fetcher("/api/admin-operations-access", {
      method: "GET", headers: { Authorization: `Bearer ${session.access_token}` }, cache: "no-store", signal: requestSignal,
    });
    if (response.status === 401 || response.status === 403) throw new OperationsAuthError("denied");
    if (!response.ok) throw new OperationsAuthError();
    const body = await response.json();
    if (body?.ok !== true || body.user?.id !== session.user.id
      || body.user.email !== session.user.email.trim().toLowerCase()) throw new OperationsAuthError("denied");
    return { id: body.user.id, email: body.user.email };
  }, { signal, timeoutMs });
}

export async function signInOperations(supabase, { email, password, method = "password", token, emailCodeEnabled = false }) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) throw new OperationsAuthError("signin");
  if (method !== "password" && (!emailCodeEnabled || !["email_code", "verify_code"].includes(method))) throw new OperationsAuthError("signin");
  if (method === "password" && (typeof password !== "string" || !password)) throw new OperationsAuthError("signin");
  if (method === "verify_code" && !/^\d{6}$/.test(String(token || ""))) throw new OperationsAuthError("signin");
  return boundedAuth(async () => {
    const result = method === "password"
      ? await supabase.auth.signInWithPassword({ email: normalizedEmail, password })
      : method === "email_code"
        ? await supabase.auth.signInWithOtp({ email: normalizedEmail, options: { shouldCreateUser: false } })
        : await supabase.auth.verifyOtp({ email: normalizedEmail, token, type: "email" });
    if (result?.error || (method !== "email_code" && !sessionIdentity(result?.data?.session))) throw new OperationsAuthError("signin");
    return result?.data;
  });
}

// OAuth authenticates identity only. Every Operations API still checks the
// server-maintained administrator roster before returning private data.
export async function operationsGithubSignInUrl(supabase, { enabled = false, supabaseUrl, timeoutMs } = {}) {
  if (!enabled) throw new OperationsAuthError("signin");
  let authOrigin;
  try {
    const configured = new URL(supabaseUrl);
    if (configured.protocol !== "https:" || configured.username || configured.password) throw new Error();
    authOrigin = configured.origin;
  } catch { throw new OperationsAuthError("signin"); }
  const redirectTo = "https://10bottlevalue.co/operations";
  const result = await boundedAuth(() => supabase.auth.signInWithOAuth({
    provider: "github",
    options: { redirectTo, scopes: "user:email", skipBrowserRedirect: true },
  }), { timeoutMs });
  if (result?.error || result?.data?.provider !== "github") throw new OperationsAuthError("signin");
  let target;
  try { target = new URL(result.data.url); } catch { throw new OperationsAuthError("signin"); }
  if (target.origin !== authOrigin || target.username || target.password || target.pathname !== "/auth/v1/authorize"
    || target.searchParams.get("provider") !== "github" || target.searchParams.get("redirect_to") !== redirectTo) {
    throw new OperationsAuthError("signin");
  }
  return target.href;
}
