import { useState } from "react";
import { X } from "lucide-react";

const confirmations = [
  "I confirm that I am over 21 years old and understand that all products are sold strictly for research purposes only and not for human or animal use.",
  "I confirm that I am a qualified researcher, licensed professional, or authorized representative of a qualified research organization. I will not use these products on humans or animals.",
];

export function AttestationModal({ cartStyle = false }: { cartStyle?: boolean }) {
  const [accepted, setAccepted] = useState([false, false, false]);
  const allAccepted = accepted.every(Boolean);

  function toggle(index: number) {
    setAccepted((current) => current.map((value, position) => position === index ? !value : value));
  }

  return (
    <main className="attestation-preview-stage relative flex min-h-screen items-center justify-center px-4 py-6 text-white sm:px-8">
      <div className="absolute inset-0 bg-black/75" aria-hidden="true" />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={cartStyle ? "attestation-cart-title" : "attestation-current-title"}
        className={`relative z-10 box-border max-h-[92vh] w-full max-w-3xl overflow-y-auto p-5 sm:p-8 ${
          cartStyle
            ? "rounded-[1.2rem] border border-white/20 bg-[#30343a]/95 md:rounded-[1.6rem]"
            : "rounded-t-[2rem] border border-white/20 bg-[#858585] shadow-[0_28px_90px_rgba(0,0,0,0.45)] sm:rounded-[2rem]"
        }`}
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          {cartStyle ? (
            <div className="min-w-0 flex-1">
              <h1
                id="attestation-cart-title"
                className="text-[15px] font-bold uppercase leading-tight tracking-[0.12em] text-white sm:text-2xl sm:tracking-[0.16em]"
              >
                Purchaser attestation
              </h1>
              <p className="mt-1.5 text-[10px] uppercase leading-4 tracking-[0.12em] text-white/75 sm:text-[11px] sm:leading-5 sm:tracking-[0.14em]">
                All confirmations are required before checkout.
              </p>
            </div>
          ) : (
            <div className="min-w-0 flex-1">
              <div className="flex w-fit max-w-full flex-col rounded-full border border-white/15 bg-black/10 px-5 py-3">
              <h1
                id="attestation-current-title"
                className="text-[15px] font-bold uppercase leading-tight tracking-[0.12em] text-white sm:text-2xl sm:tracking-[0.16em]"
              >
                Purchaser attestation
              </h1>
              <p className="mt-1.5 text-[10px] uppercase leading-4 tracking-[0.12em] text-white/75 sm:text-[11px] sm:leading-5 sm:tracking-[0.14em]">
                All confirmations are required before checkout.
              </p>
              </div>
            </div>
          )}
          <button
            type="button"
            aria-label="Close"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
          >
            <X size={20} strokeWidth={2.5} aria-hidden="true" />
          </button>
        </div>

        <div className="space-y-3">
          {confirmations.map((text, index) => (
            <label
              key={text}
              className="flex cursor-pointer items-start gap-4 rounded-[1.35rem] border border-black/25 bg-black/25 px-5 py-5 text-[11px] uppercase leading-[1.75] tracking-[0.12em] text-white"
            >
              <input
                type="checkbox"
                checked={accepted[index]}
                onChange={() => toggle(index)}
                className="mt-1 h-5 w-5 shrink-0 cursor-pointer accent-green-500 transition-none"
              />
              <span className="font-semibold">{text}</span>
            </label>
          ))}

          <label className="flex cursor-pointer items-start gap-4 rounded-[1.35rem] border border-black/25 bg-black/25 px-5 py-5 text-[11px] uppercase leading-[1.75] tracking-[0.12em] text-white">
            <input
              type="checkbox"
              checked={accepted[2]}
              onChange={() => toggle(2)}
              className="mt-1 h-5 w-5 shrink-0 cursor-pointer accent-green-500 transition-none"
            />
            <span>
              I have read and agree to the website{" "}
              <span className="font-semibold underline underline-offset-4">terms and conditions</span>,{" "}
              <span className="font-semibold underline underline-offset-4">privacy policy</span>,{" "}
              <span className="font-semibold underline underline-offset-4">refund policy</span>,{" "}
              <span className="font-semibold underline underline-offset-4">shipping policy</span>.
            </span>
          </label>
        </div>

        <button
          type="button"
          disabled={!allAccepted}
          className={`mt-6 w-full rounded-full px-6 py-4 text-[13px] font-bold uppercase tracking-[0.22em] ${
            allAccepted ? "bg-white text-black" : "cursor-not-allowed bg-white/45 text-black/45"
          }`}
        >
          Confirm &amp; proceed to checkout
        </button>
      </section>
    </main>
  );
}
