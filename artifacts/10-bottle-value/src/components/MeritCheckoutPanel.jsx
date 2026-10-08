import { useEffect, useMemo, useRef, useState } from "react";
import { Elements, ExpressCheckoutElement, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { createMeritCheckoutClient, formatMeritAmount, meritCheckoutMessages, validateMeritSession } from "../merit-checkout-client.js";

const appearance = {
  theme: "stripe",
  variables: { colorPrimary: "#111111", colorText: "#171717", colorBackground: "#ffffff", borderRadius: "12px", fontFamily: "Arial, sans-serif", fontSizeBase: "16px" },
  rules: { ".Input": { border: "1px solid #d4d4d4", boxShadow: "none" }, ".Input:focus": { border: "1px solid #111111", boxShadow: "0 0 0 1px #111111" } },
};

function MeritPaymentForm({ session, onReconcile, onPaid, onState, language }) {
  const stripe = useStripe();
  const elements = useElements();
  const messages = meritCheckoutMessages[language];
  const [state, setState] = useState({ phase: "ready", messageKey: "", busy: false, submitted: false });
  const [cardReady, setCardReady] = useState(false);
  const [walletsAvailable, setWalletsAvailable] = useState(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const callbackRef = useRef({ stripe, elements, onReconcile, onPaid, onState });
  callbackRef.current = { stripe, elements, onReconcile, onPaid, onState };
  const clientRef = useRef(null);
  const inFlightRef = useRef(false);
  useEffect(() => {
    const client = createMeritCheckoutClient({
      session,
      origin: window.location.origin,
      getStripe: () => callbackRef.current.stripe,
      getElements: () => callbackRef.current.elements,
      onReconcile: request => callbackRef.current.onReconcile(request),
      onPaid: result => callbackRef.current.onPaid?.(result),
      onState: next => { setState(next); callbackRef.current.onState?.(next); },
    });
    clientRef.current = client;
    return () => { client.dispose(); if (clientRef.current === client) clientRef.current = null; };
    // The keyed parent remounts this form when any session binding changes.
  }, [session]);

  async function confirm(walletEvent) {
    if (inFlightRef.current || !clientRef.current) {
      try { walletEvent?.paymentFailed?.({ reason: "fail" }); } catch { /* No payment details in logs. */ }
      return;
    }
    inFlightRef.current = true;
    try { await clientRef.current.confirm(walletEvent); }
    finally { inFlightRef.current = false; }
  }
  const locked = state.busy || state.submitted || state.phase === "paid";
  const pending = state.submitted && state.phase !== "paid";
  const amount = formatMeritAmount(session, language);
  return (
    <section className="rounded-2xl border border-black/10 bg-white p-5 text-black sm:p-6" aria-label={messages.heading}>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">{messages.heading}</h3>
          <p className="mt-1 break-all text-xs text-black/50">{messages.order} {session.orderId}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-xs text-black/50">{messages.amount}</p>
          <p className="mt-1 text-xl font-semibold tabular-nums">{amount}</p>
        </div>
      </div>

      <div style={state.submitted ? { display: "none" } : undefined}>
        <div style={{ display: walletsAvailable === false ? "none" : undefined, pointerEvents: locked ? "none" : undefined }} aria-disabled={locked}>
          <ExpressCheckoutElement
            onConfirm={confirm}
            onReady={event => setWalletsAvailable(Boolean(event.availablePaymentMethods && Object.values(event.availablePaymentMethods).some(Boolean)))}
            onLoadError={() => setWalletsAvailable(false)}
          />
        </div>
        {walletsAvailable && <p className="my-4 text-center text-xs text-black/45">{messages.card}</p>}
        <form onSubmit={event => { event.preventDefault(); void confirm(); }} aria-busy={state.busy}>
          {!cardReady && !loadFailed && <p className="mb-4 text-sm text-black/50" role="status">{messages.loading}</p>}
          <div style={{ pointerEvents: locked ? "none" : undefined }} aria-disabled={locked}>
            <PaymentElement
              options={{ layout: "tabs", wallets: { applePay: "never", googlePay: "never" } }}
              onReady={() => setCardReady(true)}
              onLoadError={() => setLoadFailed(true)}
            />
          </div>
          {loadFailed && <p className="mt-4 text-sm text-red-700" role="alert">{messages.unavailable}</p>}
          <button type="submit" disabled={!stripe || !elements || !cardReady || loadFailed || locked}
            className="mt-5 min-h-12 w-full rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black">
            {state.busy ? messages.confirming : `${messages.pay} ${amount}`}
          </button>
        </form>
      </div>

      {state.messageKey && <p className={`mt-4 text-sm leading-6 ${state.phase === "error" ? "text-red-700" : state.phase === "paid" ? "text-emerald-800" : "text-black/65"}`} role={state.phase === "error" ? "alert" : "status"} aria-live="polite">{messages[state.messageKey]}</p>}
      {pending && <button type="button" disabled={state.busy}
        onClick={() => { void clientRef.current?.checkStatus(); }}
        className="mt-4 min-h-11 w-full rounded-xl border border-black/20 px-5 py-3 text-sm font-semibold disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black">
        {state.busy ? messages.checking : messages.checkStatus}
      </button>}
      {state.phase !== "paid" && <p className="mt-4 text-center text-xs leading-5 text-black/45">{messages.secure}</p>}
    </section>
  );
}

function ValidatedMeritPanel({ session, onReconcile, onPaid, onState, language }) {
  const [stripeUnavailable, setStripeUnavailable] = useState(false);
  const stripePromise = useMemo(() => Promise.resolve().then(() => loadStripe(session.publishableKey, { stripeAccount: session.stripeAccount })).catch(() => null), [session.publishableKey, session.stripeAccount]);
  useEffect(() => {
    let active = true;
    stripePromise.then(stripe => { if (active && !stripe) setStripeUnavailable(true); });
    return () => { active = false; };
  }, [stripePromise]);
  const options = useMemo(() => ({ clientSecret: session.clientSecret, appearance, locale: language }), [session.clientSecret, language]);
  if (stripeUnavailable) return <p role="alert" className="rounded-xl border border-black/10 bg-white p-4 text-sm text-red-700">{meritCheckoutMessages[language].unavailable}</p>;
  return <Elements stripe={stripePromise} options={options}><MeritPaymentForm session={session} onReconcile={onReconcile} onPaid={onPaid} onState={onState} language={language} /></Elements>;
}

export default function MeritCheckoutPanel({ session, onReconcile, onPaid, onState, language = "en" }) {
  const locale = language === "ru" ? "ru" : "en";
  // Depend on values, not the parent's object identity, so ordinary rerenders do
  // not replace the controller and release a submitted session's lock.
  const validated = useMemo(() => {
    try { return validateMeritSession(session); } catch { return null; }
  }, [session?.clientSecret, session?.publishableKey, session?.stripeAccount, session?.orderId, session?.amountCents, session?.currency]);
  if (!validated || typeof onReconcile !== "function") return <p role="alert" className="rounded-xl border border-black/10 bg-white p-4 text-sm text-red-700">{meritCheckoutMessages[locale].unavailable}</p>;
  const sessionKey = `${validated.orderId}:${validated.clientSecret}:${validated.publishableKey}:${validated.stripeAccount}:${validated.amountCents}`;
  return <ValidatedMeritPanel key={sessionKey} session={validated} onReconcile={onReconcile} onPaid={onPaid} onState={onState} language={locale} />;
}
