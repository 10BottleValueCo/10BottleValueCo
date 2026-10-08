import { useState, type FormEvent } from "react";
import { ArrowRight, Mail } from "lucide-react";
import "./_group.css";

export function Refined() {
  const [code, setCode] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
  }

  return (
    <main className="signup-verification-stage relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-6 text-white sm:px-8">
      <section className="relative z-10 box-border w-full max-w-[1080px] rounded-[1.6rem] border border-white/15 bg-[#1c1d1f]/90 p-6 shadow-[0_18px_54px_rgba(0,0,0,0.24)] backdrop-blur-xl sm:p-8 md:p-10">
        <div className="mt-1">
          <h1 className="inline-flex items-center gap-3 font-sans text-3xl font-semibold uppercase tracking-[-0.04em] sm:gap-4 sm:text-4xl md:text-6xl">
            Verify your email
          </h1>

          <div
            role="status"
            aria-live="polite"
            className="mt-5 flex w-full items-center gap-3 rounded-xl border border-white/15 bg-black/25 px-4 py-3.5 text-left text-sm leading-5 text-white/90 sm:px-5"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/[0.08] text-white/80">
              <Mail aria-hidden="true" className="h-4 w-4" strokeWidth={1.8} />
            </span>
            <span className="font-semibold uppercase tracking-[0.05em]">
              A six-digit code was sent. Check your inbox and spam folder.
            </span>
          </div>

          <p className="mt-4 text-[12px] uppercase leading-6 tracking-[0.14em] text-white/70 sm:text-[13px]">
            Enter the six-digit code sent to{" "}
            <span className="normal-case text-base font-semibold tracking-normal text-white sm:text-lg">
              j***@example.com
            </span>
          </p>
        </div>

        <form onSubmit={submit} className="mt-6 grid w-full max-w-4xl gap-4 sm:gap-5">
          <label className="box-border flex min-h-[84px] w-full flex-col items-start justify-center gap-2 rounded-[1.15rem] border border-white/20 bg-white/[0.035] px-4 py-3.5 transition-colors focus-within:border-white/40 focus-within:bg-white/[0.06] sm:px-5">
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white">
              Six-digit code
            </span>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              aria-label="Six-digit verification code"
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
              className="w-full max-w-[16rem] bg-transparent text-left font-mono text-2xl font-semibold tracking-[0.34em] text-white outline-none placeholder:text-white/30 sm:text-[28px]"
              placeholder="••••••"
            />
          </label>

          <button
            type="submit"
            className="mt-1 inline-flex min-h-[60px] w-full items-center justify-center gap-3 rounded-full bg-black px-7 py-4 text-[11px] font-bold uppercase tracking-[0.2em] text-white shadow-[0_8px_24px_rgba(0,0,0,0.2)] transition-colors hover:bg-black/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 sm:w-fit sm:min-w-[260px]"
          >
            Verify email
            <ArrowRight aria-hidden="true" className="h-5 w-5" strokeWidth={2} />
          </button>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-1">
            <button
              type="button"
              className="w-fit text-[11px] font-semibold uppercase tracking-[0.16em] text-white/75 transition-colors hover:text-white"
            >
              Resend code
            </button>
            <button
              type="button"
              className="w-fit text-[11px] font-semibold uppercase tracking-[0.16em] text-white/50 transition-colors hover:text-white"
            >
              Change email
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
