export const EMAIL_CODE_COOLDOWN_SECONDS = 60;

export function isEmailCodeEnabled(env = {}) {
  return (
    env.VITE_AUTH_EMAIL_CODE_ENABLED === "true" &&
    Boolean(env.VITE_SUPABASE_URL && env.VITE_SUPABASE_ANON_KEY)
  );
}

const emailValue = (email) =>
  String(email || "")
    .trim()
    .toLowerCase();

export async function requestEmailCode({
  supabase,
  email,
  mode,
  affiliateCode = "",
}) {
  const normalizedEmail = emailValue(email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throw new Error("Enter a valid email address.");
  }
  if (mode !== "signin" && mode !== "create") {
    throw new Error("Choose sign in or create account.");
  }
  const options = { shouldCreateUser: mode === "create" };
  if (mode === "create") {
    const code = String(affiliateCode || "")
      .trim()
      .toUpperCase();
    options.data = {
      affiliateCode: code,
      promoLockedAt: code ? new Date().toISOString() : "",
    };
  }
  const { data, error } = await supabase.auth.signInWithOtp({
    email: normalizedEmail,
    options,
  });
  if (error) throw error;
  return data;
}

export async function confirmEmailCode({
  supabase,
  email,
  token,
  type = "email",
}) {
  const normalizedEmail = emailValue(email);
  if (
    !normalizedEmail ||
    !/^\d{6}$/.test(String(token || "")) ||
    !["email", "signup"].includes(type)
  ) {
    throw new Error("Enter the six-digit code from your email.");
  }
  const { data, error } = await supabase.auth.verifyOtp({
    email: normalizedEmail,
    token,
    type,
  });
  if (error) throw error;
  const user = data?.user || data?.session?.user;
  const sessionUser = data?.session?.user;
  if (
    !data?.session?.access_token ||
    !user?.id ||
    user.id !== sessionUser?.id ||
    emailValue(user.email) !== normalizedEmail ||
    emailValue(sessionUser?.email) !== normalizedEmail ||
    !(user.email_confirmed_at || user.confirmed_at)
  ) {
    await supabase.auth.signOut();
    throw new Error(
      "The code could not confirm this email. Request a new code and try again.",
    );
  }
  return user;
}

export function isEmailCodeRateLimit(error) {
  return (
    error?.status === 429 ||
    /rate_limit|too many|after \d+ seconds/i.test(
      `${error?.code || ""} ${error?.message || ""}`,
    )
  );
}

export function emailCodeWaitSeconds(cooldown, email, now = Date.now()) {
  if (emailValue(cooldown?.email) !== emailValue(email)) return 0;
  return Math.max(0, Math.ceil(((cooldown?.until || 0) - now) / 1000));
}
