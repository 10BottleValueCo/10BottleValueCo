import { useCallback, useEffect, useRef, useState } from "react";
import { emailLoginApi, prepareEmailSignInCode } from "../email-login-client.js";

const primaryBtn =
  "min-h-[44px] whitespace-nowrap rounded-full bg-white !text-black px-5 py-2.5 text-[11px] font-extrabold uppercase tracking-[0.16em] transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60";
const ghostBtn =
  "min-h-[44px] whitespace-nowrap rounded-full border border-white/30 bg-white/10 px-5 py-2.5 text-[11px] font-extrabold uppercase tracking-[0.16em] text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60";
const inputCls =
  "w-full rounded-2xl border border-white/20 bg-black/[0.18] px-4 py-3 text-center text-lg tracking-[0.4em] text-white placeholder:text-white/35 outline-none focus:border-white/50";

function secondsLeft(iso, now) {
  const t = iso ? new Date(iso).getTime() : 0;
  return Math.max(0, Math.ceil((t - now) / 1000));
}

function useNow(active) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!active) return undefined;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [active]);
  return now;
}

async function getToken(supabase) {
  const { data, error } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  if (error || !token) throw new Error("Your session has expired. Please sign in again.");
  return token;
}

// Shared challenge flow: send + verify, scoped by owner key.
function useChallenge(supabase, ownerKey, getTokenFn) {
  const [challenge, setChallenge] = useState(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const ownerRef = useRef(ownerKey);
  ownerRef.current = ownerKey;

  useEffect(() => {
    setChallenge(null);
    setCode("");
    setBusy(false);
    setError("");
  }, [ownerKey]);

  const run = useCallback(
    async (body) => {
      const owner = ownerRef.current;
      setBusy(true);
      setError("");
      try {
        const token = await getTokenFn();
        const res = await emailLoginApi(token, body);
        if (owner !== ownerRef.current) return null;
        return res;
      } catch (e) {
        if (owner === ownerRef.current) setError(e?.message || "Something went wrong.");
        return null;
      } finally {
        if (owner === ownerRef.current) setBusy(false);
      }
    },
    [getTokenFn]
  );

  const send = useCallback(
    async (purpose) => {
      const res = await run({ action: "send", purpose });
      if (res?.challenge) {
        setChallenge(res.challenge);
        setCode("");
      }
    },
    [run]
  );

  return { challenge, setChallenge, code, setCode, busy, setBusy, error, setError, run, send };
}

function CodeBox({ ch, now, state, purpose, onVerify, onResend, onCancel, inputRef }) {
  const { code, setCode, busy, error } = state;
  const expired = !!ch && secondsLeft(ch.expiresAt, now) <= 0;
  const cooldown = secondsLeft(ch?.resendAt, now);
  return (
    <form
      className="grid gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (ch && code.length === 6 && !busy && !expired) onVerify();
      }}
    >
      <label className="text-sm text-white/80" htmlFor={`elc-code-${purpose}`}>
        Enter your 6-digit email code.
      </label>
      <input
        id={`elc-code-${purpose}`}
        ref={inputRef}
        inputMode="numeric"
        pattern="[0-9]{6}"
        maxLength={6}
        autoComplete="one-time-code"
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
        placeholder="000000"
        className={inputCls}
      />
      <div role="status" className="text-sm text-white/70">
        {!ch ? (busy ? "Sending code…" : "") : expired ? "This code has expired. Request a new one." : `Code expires in ${Math.floor(secondsLeft(ch.expiresAt, now) / 60)}:${String(secondsLeft(ch.expiresAt, now) % 60).padStart(2, "0")}.`}
      </div>
      {error ? <div role="alert" className="text-sm text-white">{error}</div> : null}
      <div className={`flex flex-wrap gap-2${purpose === "login" ? " email-login-actions" : ""}`}>
        <button type="submit" disabled={!ch || busy || code.length !== 6 || expired} className={`${primaryBtn}${purpose === "login" ? " email-login-enter" : ""}`}>
          {busy ? (ch ? (purpose === "login" ? "Signing in…" : "Verifying…") : "Sending…") : purpose === "login" ? "Enter" : "Verify"}
        </button>
        <button type="button" disabled={busy || cooldown > 0 || (!ch && !error)} onClick={onResend} className={`${ghostBtn}${purpose === "login" ? " email-login-resend" : ""}`}>
          {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
        </button>
        {onCancel ? (
          <button type="button" disabled={busy} onClick={onCancel} className={ghostBtn}>
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  );
}

export function EmailLoginSecurity({ supabase, userId }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [target, setTarget] = useState(null); // "enable" | "disable"
  const [note, setNote] = useState("");
  const tokenFn = useCallback(() => getToken(supabase), [supabase]);
  const st = useChallenge(supabase, userId, tokenFn);
  const inputRef = useRef(null);
  const userRef = useRef(userId);
  userRef.current = userId;
  const now = useNow(!!st.challenge);

  const load = useCallback(async () => {
    const owner = userId;
    setLoading(true);
    setLoadError("");
    try {
      const res = await emailLoginApi(await tokenFn());
      if (owner !== userRef.current) return;
      setStatus(res);
      if (res?.challenge && !st.challenge) { /* pending challenge exists; user may resend */ }
    } catch (e) {
      if (owner === userRef.current) setLoadError(e?.message || "Could not load status.");
    } finally {
      if (owner === userRef.current) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, tokenFn]);

  useEffect(() => {
    setStatus(null);
    setTarget(null);
    setNote("");
    if (userId) load();
  }, [userId, load]);

  useEffect(() => {
    if (st.challenge) inputRef.current?.focus();
  }, [st.challenge]);

  const enabled = !!status?.enabled;
  const available = status?.available !== false && !!status;

  const begin = (purpose) => {
    setNote("");
    setTarget(purpose);
    st.send(purpose);
  };
  const cancel = () => {
    setTarget(null);
    st.setChallenge(null);
    st.setCode("");
    st.setError("");
  };
  const disable = async () => {
    const owner = userRef.current;
    setNote("");
    const res = await st.run({ action: "disable", purpose: "disable" });
    if (owner !== userRef.current) return;
    if (!res) {
      await load();
      return;
    }
    setStatus((s) => ({ ...s, enabled: false }));
    st.setBusy(true);
    try {
      const { error } = await supabase.auth.refreshSession();
      if (error) throw error;
      if (owner !== userRef.current) return;
      await load();
      if (owner === userRef.current) setNote("Email code at sign-in is off.");
    } catch {
      if (owner === userRef.current)
        st.setError("Email codes are off, but your session could not be refreshed. Please sign in again.");
    } finally {
      if (owner === userRef.current) st.setBusy(false);
    }
  };
  const verify = async () => {
    const res = await st.run({ action: "verify", purpose: target, challengeId: st.challenge.id, code: st.code });
    if (!res) return;
    const purpose = target;
    st.setBusy(true);
    try {
      const result = res.session ? await supabase.auth.setSession(res.session) : purpose === "disable" ? await supabase.auth.refreshSession() : null;
      if (result?.error) throw result.error;
    } catch {
      st.setError("The code was accepted, but your session could not be updated. Please sign in again.");
      return;
    } finally { st.setBusy(false); }
    setTarget(null);
    st.setChallenge(null);
    st.setCode("");
    if (purpose === "disable" || res.session) await load();
    else setStatus((s) => ({ ...s, enabled: !!res.enabled }));
    setNote(res.enabled ? "Email code at sign-in is on." : "Email code at sign-in is off.");
  };

  const switchDisabled = !available || loading || st.busy || !!target;

  return (
    <div id="account-email-login-details" className="mt-4 rounded-[1.6rem] border border-white/20 bg-black/[0.18] p-5 uppercase">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div id="elc-label" className="text-[11px] font-bold uppercase tracking-[0.22em] text-white/70">
            Email code at sign-in
          </div>
          <p id="elc-desc" className="mt-2 text-sm leading-6 text-white/80">
            {loading
              ? "Checking status…"
              : loadError
                ? loadError
                : !available
                  ? "Email sign-in codes are not set up yet, so this option is unavailable."
                  : enabled
                    ? "On. We email a code each time you sign in."
                    : "Off. Optionally require an emailed code when you sign in."}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-labelledby="elc-label"
          aria-describedby="elc-desc"
          disabled={switchDisabled}
          onClick={() => enabled ? disable() : begin("enable")}
          className={`relative mt-1 h-8 w-14 shrink-0 rounded-full border border-white/30 transition disabled:opacity-50 ${enabled ? "bg-white" : "bg-white/10"}`}
        >
          <span style={{ position: "absolute", left: 4, right: "auto", top: 4, width: 24, height: 24, borderRadius: "50%", transform: `translateX(${enabled ? 24 : 0}px)`, background: enabled ? "#000" : "#fff", transition: "transform .15s" }} />
        </button>
      </div>
      {loadError ? (
        <button type="button" onClick={load} className={`${ghostBtn} mt-3`}>Retry</button>
      ) : null}
      {target ? (
        <div className="mt-4">
          {st.challenge ? (
            <CodeBox
              ch={st.challenge}
              now={now}
              state={st}
              purpose={target}
              inputRef={inputRef}
              onVerify={verify}
              onResend={() => st.send(target)}
              onCancel={cancel}
            />
          ) : (
            <div className="grid gap-3">
              <div role="status" className="text-sm text-white/80">
                {st.busy ? "Sending code…" : `Confirm to ${target} email codes.`}
              </div>
              {st.error ? <div role="alert" className="text-sm text-white">{st.error}</div> : null}
              <div className="flex flex-wrap gap-2">
                {!st.busy ? <button type="button" onClick={() => st.send(target)} className={primaryBtn}>Send code</button> : null}
                <button type="button" onClick={cancel} className={ghostBtn}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      ) : null}
      {st.error && !target ? <div role="alert" className="mt-3 text-sm text-white">{st.error}</div> : null}
      {note && !target ? <div role="status" className="mt-3 text-sm text-white/80">{note}</div> : null}
    </div>
  );
}

export function EmailLoginPrompt({ supabase, session, onVerified, onCancel, inline = false }) {
  const ownerKey = `${session?.user?.id || ""}:${session?.access_token || ""}`;
  const tokenFn = useCallback(async () => {
    const t = session?.access_token;
    if (!t) throw new Error("Your session has expired. Please sign in again.");
    return t;
  }, [session?.access_token]);
  const st = useChallenge(supabase, ownerKey, tokenFn);
  const now = useNow(!!st.challenge);
  const inputRef = useRef(null);
  const dialogRef = useRef(null);
  const email = session?.user?.email || "";
  const okRef = useRef(onVerified);
  okRef.current = onVerified;

  useEffect(() => {
    const prev = document.activeElement;
    inputRef.current?.focus();
    return () => prev?.focus?.();
  }, []);
  useEffect(() => {
    let active = true;
    st.setBusy(true);
    prepareEmailSignInCode(session?.access_token).then((challenge) => {
      if (active) st.setChallenge(challenge);
    }).catch((error) => {
      if (active) st.setError(error?.message || "Could not send the sign-in code. Please try again.");
    }).finally(() => {
      if (active) st.setBusy(false);
    });
    return () => { active = false; };
  }, [ownerKey]);
  useEffect(() => {
    if (st.challenge) inputRef.current?.focus();
  }, [st.challenge]);

  const verify = async () => {
    if (!st.challenge || st.busy) return;
    const res = await st.run({ action: "verify", purpose: "login", challengeId: st.challenge.id, code: st.code });
    if (!res) return;
    if (!res.session?.access_token || !res.session.refresh_token) {
      st.setError("The verified session was not received. Request a new code.");
      return;
    }
    st.setBusy(true);
    if (res.session) {
      try {
        const r = await supabase.auth.setSession(res.session);
        if (r?.error) throw r.error;
      } catch (e) {
        st.setError(e?.message || "Could not finish sign-in.");
        return;
      } finally { st.setBusy(false); }
    }
    okRef.current?.();
  };

  const onKey = (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onCancel?.();
      return;
    }
    if (inline || e.key !== "Tab") return;
    const els = dialogRef.current?.querySelectorAll("button:not(:disabled),input");
    if (!els?.length) return;
    const first = els[0];
    const last = els[els.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };

  return (
    <div className={`email-login-prompt${inline ? " email-login-prompt--inline" : ""}`} key={ownerKey}>
      <style>{`
        .email-login-prompt{position:fixed;inset:0;z-index:12000;display:flex;align-items:center;justify-content:center;overflow:auto;background:#0b0b0d;padding:16px;color:#fff}
        .email-login-prompt>[role=dialog]{box-sizing:border-box;width:100%;max-width:448px;border:1px solid #ffffff33;border-radius:26px;background:#17171b;padding:24px;color:#fff}
        .email-login-prompt input{box-sizing:border-box;width:100%;padding:12px 16px;border:1px solid #ffffff33;border-radius:16px;background:#101014;color:#fff;font-size:18px;text-align:center;letter-spacing:.3em}
        .email-login-prompt button{box-sizing:border-box;min-height:44px;margin-top:12px;padding:10px 20px;border:1px solid #ffffff55;border-radius:30px;background:#fff;color:#000;font-size:15px;line-height:1.3;font-weight:700;cursor:pointer}
        .email-login-prompt button:disabled{opacity:.5;cursor:default}
        .email-login-prompt p{line-height:1.6;overflow-wrap:anywhere}
        .email-login-prompt p,.email-login-prompt label,.email-login-prompt [role=status],.email-login-prompt [role=alert]{text-transform:uppercase;letter-spacing:.06em}
        .email-login-prompt .email-login-address{text-transform:none;letter-spacing:normal}
        .email-login-prompt .email-login-actions{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:12px;margin-top:12px}
        .email-login-prompt .email-login-enter{background:#fff;color:#000!important;border-color:#fff;font-size:16px;font-weight:800;letter-spacing:.12em;min-height:64px;margin-top:0;box-shadow:0 6px 24px #0003}
        .email-login-prompt .email-login-resend,.email-login-prompt .email-login-cancel{background:#000;color:#fff!important;border:1px solid #000;font-size:15px;font-weight:700;min-height:64px}
        .email-login-prompt .email-login-resend{margin-top:0}
        .email-login-prompt .email-login-cancel{margin-top:16px}
        .email-login-prompt button:not(:disabled):hover{filter:brightness(.9)}
        .email-login-prompt button:focus-visible{outline:2px solid #fff;outline-offset:4px}
        @media(max-width:480px){.email-login-prompt .email-login-actions{grid-template-columns:minmax(0,1fr)}.email-login-prompt .email-login-cancel{width:100%}}
        .email-login-prompt--inline{position:static;inset:auto;z-index:auto;display:block;overflow:visible;background:transparent;padding:0;width:100%}
        .email-login-prompt--inline>[role=region]{width:100%;max-width:896px;padding:0;border:0;border-radius:0;background:transparent}
        .email-login-prompt--inline h2{font-size:clamp(28px,5vw,60px);font-weight:600;letter-spacing:-.04em;line-height:1.15;margin-top:12px}
        .email-login-prompt--inline p{margin-top:20px;margin-bottom:28px;font-size:14px;font-weight:600;line-height:1.8}
        .email-login-prompt--inline label{font-size:12px;font-weight:700;line-height:1.7}
        .email-login-prompt--inline [role=status],.email-login-prompt--inline [role=alert]{font-size:13px;line-height:1.7}
        .email-login-prompt--inline input{min-height:80px;text-align:left;background:rgba(255,255,255,.04);border-radius:24px;font-size:24px;letter-spacing:.4em;padding:20px 24px}
        .email-login-prompt--inline input:focus{border-color:#ffffff99;outline:none;box-shadow:0 0 0 3px #ffffff0d}
        .email-login-prompt--inline button{min-height:60px;background:#000;color:#fff!important;border-color:transparent;letter-spacing:.1em;text-transform:uppercase;font-size:15px;line-height:1.3}
        .email-login-prompt--inline .email-login-cancel{width:calc(50% - 6px)}
        @media(max-width:480px){.email-login-prompt--inline .email-login-cancel{width:100%}}
      `}</style>
      <div
        ref={dialogRef}
        role={inline ? "region" : "dialog"}
        aria-modal={inline ? undefined : true}
        aria-labelledby="elc-prompt-title"
        onKeyDown={onKey}
        className={inline ? "w-full text-white" : "w-full max-w-md rounded-[1.6rem] border border-white/20 bg-[#17171b] p-6 text-white"}
      >
        <h2 id="elc-prompt-title" className="text-[11px] font-bold uppercase tracking-[0.22em] text-white/70">
          Confirm it's you
        </h2>
        <p className="mt-3 text-sm leading-6 text-white/80">
          {st.challenge ? "Enter the sign-in code sent to " : st.error ? "Sign-in code for " : "Sending a sign-in code to "}
          <span className="email-login-address break-all font-semibold text-white">{email}</span>.
        </p>
        <div className="mt-4">
          <CodeBox
              ch={st.challenge}
              now={now}
              state={st}
              purpose="login"
              inputRef={inputRef}
              onVerify={verify}
              onResend={() => st.send("login")}
          />
        </div>
        <button type="button" onClick={() => onCancel?.()} disabled={st.busy} className={`${ghostBtn} email-login-cancel mt-4 w-full`}>
          Cancel and sign out
        </button>
      </div>
    </div>
  );
}
