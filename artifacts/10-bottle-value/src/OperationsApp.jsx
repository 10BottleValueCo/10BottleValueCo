import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { createClient } from "@supabase/supabase-js";
import OperationsPortalStudio from "./components/OperationsPortalStudio.jsx";
import { boundedAuth, checkOperationsAccess, sessionIdentity, signInOperations } from "./operations-auth.js";
import "./operations-shell.css";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const configured = !!url && !!anonKey;
// /operations reuses the same-origin site session. The Operations subdomain
// has its own browser storage and requires its own sign-in.
const supabase = configured ? createClient(url, anonKey) : null;
const emailCodeEnabled = import.meta.env.VITE_OPERATIONS_EMAIL_CODE_ENABLED === "true";
const words = {
  en: {
    title: "Your operations, in focus.", subtitle: "Recorded orders and browser activity, with clear sources and honest limits.",
    private: "PRIVATE WORKSPACE", email: "Email", password: "Password", login: "Sign in", logout: "Sign out", busy: "Please wait…",
    checking: "Checking administrator access…", denied: "This account cannot open Operations. Sign out and use an authorized account.",
    unavailable: "Access could not be checked. Retry in a moment.", failed: "Sign-in could not be completed. Check your details and try again.",
    config: "Operations sign-in is not configured on this deployment.", retry: "Retry", account: "Signed in as", language: "Language / Язык",
    hint: "Use your existing administrator account. Access is checked by the server.", back: "Visit the store", code: "Email code", passwordMode: "Use password", sendCode: "Send sign-in code", verify: "Verify code", token: "Six-digit code", sent: "If this account can sign in, a code has been requested. Check your email.", wait: "Wait 60 seconds before requesting another code.", signoutError: "Sign-out could not finish. Retry to clear this session.",
  },
  ru: {
    title: "Все операции — перед вами.", subtitle: "Записи заказов и браузерная активность с понятными источниками и границами данных.",
    private: "ЗАКРЫТОЕ РАБОЧЕЕ ПРОСТРАНСТВО", email: "Электронная почта", password: "Пароль", login: "Войти", logout: "Выйти", busy: "Подождите…",
    checking: "Проверяем доступ администратора…", denied: "Этот аккаунт не может открыть центр управления. Выйдите и используйте разрешённый аккаунт.",
    unavailable: "Не удалось проверить доступ. Повторите попытку позже.", failed: "Не удалось войти. Проверьте данные и повторите попытку.",
    config: "Вход в центр управления не настроен для этой версии сайта.", retry: "Повторить", account: "Аккаунт", language: "Language / Язык",
    hint: "Используйте существующий аккаунт администратора. Доступ проверяет сервер.", back: "Открыть магазин", code: "Код по почте", passwordMode: "Использовать пароль", sendCode: "Отправить код входа", verify: "Подтвердить код", token: "Шестизначный код", sent: "Если вход для этого аккаунта доступен, код запрошен. Проверьте почту.", wait: "Подождите 60 секунд перед повторным запросом кода.", signoutError: "Не удалось завершить выход. Повторите попытку, чтобы закрыть сессию.",
  },
};

export function OperationsApp() {
  const [language, setLanguage] = useState("en");
  const [auth, setAuth] = useState({ loading: configured, session: null });
  const [access, setAccess] = useState({ key: "", status: "checking" });
  const [retry, setRetry] = useState(0);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState("password");
  const [token, setToken] = useState("");
  const [form, setForm] = useState({ busy: false, notice: "" });
  const [signingOut, setSigningOut] = useState(false);
  const codeUntil = useRef(0);
  const mounted = useRef(true);
  const t = words[language];
  const key = sessionIdentity(auth.session);
  const checked = access.key === key && access.status === "allowed" && !signingOut;

  useEffect(() => {
    mounted.current = true;
    if (!supabase) return () => { mounted.current = false; };
    let revision = 0;
    const controller = new AbortController();
    const subscription = supabase.auth.onAuthStateChange((_event, session) => {
      revision += 1;
      if (mounted.current) setAuth({ loading: false, session });
    });
    const initialRevision = revision;
    boundedAuth(() => supabase.auth.getSession(), { signal: controller.signal })
      .then(result => { if (mounted.current && revision === initialRevision) setAuth({ loading: false, session: result.error ? null : result.data?.session, error: !!result.error }); })
      .catch(() => { if (mounted.current && revision === initialRevision) setAuth({ loading: false, session: null, error: true }); });
    return () => { mounted.current = false; controller.abort(); subscription.data.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    if (!key || signingOut) { setAccess({ key: "", status: "checking" }); return; }
    let active = true;
    const controller = new AbortController();
    setAccess({ key, status: "checking" });
    checkOperationsAccess(auth.session, { signal: controller.signal })
      .then(user => { if (active) setAccess({ key, status: "allowed", user }); })
      .catch(error => { if (active) setAccess({ key, status: error.code === "denied" ? "denied" : "unavailable" }); });
    return () => { active = false; controller.abort(); };
  }, [key, retry, signingOut]);

  async function submit(event) {
    event.preventDefault();
    if (form.busy || !supabase) return;
    if (mode === "email_code" && Date.now() < codeUntil.current) { setForm({ busy: false, notice: "wait" }); return; }
    setForm({ busy: true, notice: "" });
    if (mode === "email_code") codeUntil.current = Date.now() + 60_000;
    try {
      await signInOperations(supabase, { email, password, method: mode, token, emailCodeEnabled });
      if (!mounted.current) return;
      setPassword("");
      if (mode === "email_code") { setMode("verify_code"); setForm({ busy: false, notice: "sent" }); }
      else { setToken(""); setForm({ busy: false, notice: "" }); }
    } catch { if (mounted.current) setForm({ busy: false, notice: "failed" }); }
  }

  async function signOut() {
    setSigningOut(true);
    setAccess({ key: "", status: "checking" });
    setForm({ busy: true, notice: "" });
    try {
      const result = await boundedAuth(() => supabase.auth.signOut({ scope: "local" }));
      if (result?.error) throw result.error;
      if (mounted.current) { setAuth({ loading: false, session: null }); setSigningOut(false); setForm({ busy: false, notice: "" }); }
    } catch { if (mounted.current) setForm({ busy: false, notice: "signoutError" }); }
  }

  return <div className="operations-shell">
    <nav className="operations-nav" aria-label="Operations"><a className="operations-brand" href="https://10bottlevalue.co/">10<span>BOTTLE</span>VALUE</a><div>
      <div className="operations-language" role="group" aria-label={t.language}>{["en", "ru"].map(code => <button type="button" key={code} aria-pressed={language === code} onClick={() => setLanguage(code)}>{code.toUpperCase()}</button>)}</div>
      {key && <button type="button" className="operations-logout" disabled={form.busy} onClick={signOut}>{form.busy ? t.busy : t.logout}</button>}
    </div></nav>
    {checked ? <><div className="operations-account">{t.account}: {access.user.email}</div><OperationsPortalStudio key={key} supabase={supabase} expectedEmail={access.user.email} language={language} onLanguageChange={setLanguage} /></> : <main className="operations-entry">
      <div className="operations-intro"><span>{t.private}</span><h1>{t.title}</h1><p>{t.subtitle}</p></div>
      <section className="operations-login">
        {!configured ? <p role="alert">{t.config}</p> : auth.loading ? <p role="status">{t.busy}</p> : key ? <>
          <p role={access.status === "checking" ? "status" : "alert"}>{signingOut ? (form.notice ? t[form.notice] : t.busy) : t[access.key === key ? access.status : "checking"]}</p>
          {!signingOut && access.status === "unavailable" && <button type="button" onClick={() => setRetry(value => value + 1)}>{t.retry}</button>}
          <p className="operations-hint">{auth.session.user.email}</p>
        </> : <form onSubmit={submit}>
          <h2>{t.login}</h2><p className="operations-hint">{t.hint}</p>
          <label>{t.email}<input type="email" autoComplete="username" required maxLength={254} value={email} disabled={form.busy || mode === "verify_code"} onChange={event => setEmail(event.target.value)} /></label>
          {mode === "password" && <label>{t.password}<input type="password" autoComplete="current-password" required value={password} disabled={form.busy} onChange={event => setPassword(event.target.value)} /></label>}
          {mode === "verify_code" && <label>{t.token}<input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={token} disabled={form.busy} onChange={event => setToken(event.target.value.replace(/\D/g, ""))} /></label>}
          <button type="submit" disabled={form.busy}>{form.busy ? t.busy : mode === "password" ? t.login : mode === "email_code" ? t.sendCode : t.verify}</button>
          {(form.notice || auth.error) && <p role="status">{t[form.notice] || t.unavailable}</p>}
          {emailCodeEnabled && <button type="button" className="operations-switch" disabled={form.busy} onClick={() => { setMode(mode === "password" ? "email_code" : "password"); setPassword(""); setToken(""); setForm({ busy: false, notice: "" }); }}>{mode === "password" ? t.code : t.passwordMode}</button>}
        </form>}
      </section><a className="operations-back" href="https://10bottlevalue.co/">← {t.back}</a>
    </main>}
  </div>;
}

createRoot(document.getElementById("root")).render(<OperationsApp />);
