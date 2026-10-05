import { useState } from "react";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";

const stripePromise = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)
  : null;

function StripePaymentForm({ orderNumber, onSuccess }) {
  const stripe = useStripe();
  const elements = useElements();
  const [confirming, setConfirming] = useState(false);
  const [formError, setFormError] = useState("");
  const [elementsReady, setElementsReady] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!stripe || !elements) return;
    setConfirming(true);
    setFormError("");

    const { error: submitError } = await elements.submit();
    if (submitError) {
      setFormError(submitError.message || "Payment failed.");
      setConfirming(false);
      return;
    }

    const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/?payment=success&order=${encodeURIComponent(orderNumber)}&provider=stripe`,
      },
      redirect: "if_required",
    });

    if (confirmError) {
      setFormError(confirmError.message || "Payment failed. Please try again.");
      setConfirming(false);
    } else if (paymentIntent?.status === "succeeded") {
      onSuccess(paymentIntent);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4">
      <div
        style={
          elementsReady
            ? undefined
            : {
                visibility: "hidden",
                position: "absolute",
                width: "calc(100% - 2rem)",
                pointerEvents: "none",
              }
        }
      >
        <PaymentElement
          options={{
            layout: { type: "tabs" },
            paymentMethodOrder: ["card", "google_pay", "apple_pay"],
            wallets: { applePay: "auto", googlePay: "auto" },
            terms: { card: "never", applePay: "never", googlePay: "never" },
            defaultValues: { billingDetails: { address: { country: "US" } } },
          }}
          onReady={() => setElementsReady(true)}
        />
      </div>
      {!elementsReady && (
        <div className="space-y-2.5">
          {[0, 120, 240].map((delay, index) =>
            index === 1 ? (
              <div key={index} className="flex gap-2.5">
                {[0, 120].map((extraDelay, itemIndex) => (
                  <div
                    key={itemIndex}
                    className="relative flex-1 overflow-hidden rounded-[10px] bg-black/[0.11]"
                    style={{ height: 48 }}
                  >
                    <div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent"
                      style={{
                        animation: `shimmer 1.2s ease-in-out ${delay + extraDelay}ms infinite`,
                      }}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div
                key={index}
                className="relative overflow-hidden rounded-[10px] bg-black/[0.11]"
                style={{ height: 48 }}
              >
                <div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent"
                  style={{ animation: `shimmer 1.2s ease-in-out ${delay}ms infinite` }}
                />
              </div>
            ),
          )}
          <div className="flex items-center gap-2 pt-2">
            <svg className="animate-spin shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="#635BFF" strokeWidth="2.5" strokeOpacity="0.25" />
              <path d="M12 2a10 10 0 0 1 10 10" stroke="#635BFF" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
            <span className="text-[13px] font-medium text-black/50">
              Preparing secure payment form…
            </span>
          </div>
        </div>
      )}
      {formError && (
        <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
          {formError}
        </div>
      )}
      <button
        type="submit"
        disabled={!stripe || confirming}
        style={
          elementsReady
            ? { opacity: 1, transition: "opacity 0.3s ease" }
            : { opacity: 0, pointerEvents: "none", height: 0, overflow: "hidden", marginTop: 0 }
        }
        className={`mt-4 w-full rounded-[1.2rem] py-4 text-[15px] font-bold text-white ${
          !stripe || confirming
            ? "bg-[#635BFF]/60 cursor-not-allowed"
            : "bg-[#635BFF] hover:bg-[#4f46e5] active:scale-[0.98] cursor-pointer"
        }`}
      >
        {confirming ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
              <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
            </svg>
            Processing…
          </span>
        ) : (
          "Complete Purchase"
        )}
      </button>
    </form>
  );
}

const stripeAppearance = {
  theme: "flat",
  variables: {
    colorPrimary: "#635BFF",
    colorBackground: "#f9f9fb",
    colorText: "#0d0d0d",
    colorTextSecondary: "#6b7280",
    colorTextPlaceholder: "#9ca3af",
    colorDanger: "#e53e3e",
    fontFamily: "inherit",
    fontSizeBase: "15px",
    fontWeightNormal: "450",
    borderRadius: "10px",
    spacingUnit: "5px",
  },
  rules: {
    ".Input": {
      border: "1.5px solid #e5e7eb",
      boxShadow: "none",
      backgroundColor: "#ffffff",
      color: "#0d0d0d",
      fontSize: "15px",
    },
    ".Input:focus": {
      border: "1.5px solid #635BFF",
      boxShadow: "0 0 0 3px rgba(99,91,255,0.12)",
    },
    ".Label": {
      fontSize: "12px",
      fontWeight: "600",
      color: "#374151",
      textTransform: "uppercase",
      letterSpacing: "0.06em",
    },
    ".Tab": {
      border: "1.5px solid #e5e7eb",
      boxShadow: "none",
      backgroundColor: "#ffffff",
    },
    ".Tab:hover": { backgroundColor: "#f5f4ff" },
    ".Tab--selected": {
      border: "1.5px solid #635BFF",
      backgroundColor: "#f5f4ff",
      boxShadow: "none",
    },
    ".TabIcon--selected": { fill: "#635BFF" },
    ".TabLabel": {
      textTransform: "uppercase",
      fontSize: "11px",
      fontWeight: "700",
      letterSpacing: "0.07em",
    },
    ".TabLabel--selected": {
      color: "#635BFF",
      textTransform: "uppercase",
      fontSize: "11px",
      fontWeight: "700",
      letterSpacing: "0.07em",
    },
    ".TermsText": {
      textTransform: "uppercase",
      fontSize: "10px",
      fontWeight: "700",
      letterSpacing: "0.06em",
    },
    ".Block": {
      border: "1.5px solid #e5e7eb",
      boxShadow: "none",
      backgroundColor: "#ffffff",
    },
  },
};

export default function StripeCheckoutPanel({ clientSecret, orderNumber, onSuccess }) {
  return (
    <Elements
      stripe={stripePromise}
      options={{ clientSecret, locale: "en", appearance: stripeAppearance }}
    >
      <StripePaymentForm orderNumber={orderNumber} onSuccess={onSuccess} />
    </Elements>
  );
}
