import { useState, type FormEvent } from "react";
import { ArrowRight } from "lucide-react";
import { CombinationLock } from "./_shared/CombinationLock";
import "./_group.css";

export function Current() {
  const [code, setCode] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
  }

  return (
    <main className="signup-verification-stage relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-6 text-white sm:px-8">
      <section className="relative z-10 box-border w-full max-w-[1200px] rounded-[2rem] border border-white/30 bg-black/40 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.3)] backdrop-blur-2xl sm:p-8 md:p-12">
        <div className="relative mt-3 inline-block">
          <h1 className="inline-flex items-center gap-2 font-sans text-4xl font-semibold uppercase tracking-[-0.04em] sm:gap-4 sm:text-5xl md:text-6xl">
            Verify your email
            <CombinationLock />
          </h1>
          <div
            role="status"
            aria-live="polite"
            className="pointer-events-none absolute left-full top-0 z-30 ml-3 w-max break-words rounded-2xl border border-white/20 bg-black/90 px-2 py-2 text-left text-[10px] font-semibold uppercase leading-tight tracking-[0.08em] text-white shadow-[0_12px_36px_rgba(0,0,0,0.3)] sm:top-1/2 sm:-translate-y-1/2 sm:px-3 md:text-[11px]"
            style={{ maxWidth: "min(18rem, calc(100vw - 15rem))" }}
          >
            A six-digit code was sent. Check your inbox and spam folder.
          </div>
        </div>

        <p className="mt-5 max-w-3xl text-[12px] uppercase leading-7 tracking-[0.16em] text-white/75 sm:text-[13px]">
          Enter the six-digit code sent to <span className="normal-case tracking-normal text-white">j***@example.com</span>
        </p>

        <form onSubmit={submit} className="mt-7 grid w-full max-w-4xl gap-4 sm:gap-5">
          <label className="box-border flex min-h-[72px] w-full items-center gap-4 rounded-[1.5rem] border border-white/25 bg-white/[0.04] px-5 transition-colors focus-within:border-white/45 focus-within:bg-white/[0.07] sm:min-h-[84px] sm:px-8">
            <span className="shrink-0 text-[11px] font-bold uppercase tracking-[0.14em] text-white/75">
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
              className="min-w-0 flex-1 bg-transparent text-center font-mono text-2xl font-bold tracking-[0.4em] text-white outline-none placeholder:text-white/35 sm:text-3xl"
              placeholder="••••••"
            />
          </label>
          <button
            type="submit"
            className="mt-2 inline-flex min-h-[68px] w-full items-center justify-center gap-4 rounded-full bg-black px-8 py-5 text-[11px] font-black uppercase tracking-[0.22em] text-white shadow-[0_10px_30px_rgba(0,0,0,0.18)] transition-colors hover:bg-black/90 sm:min-h-[76px] sm:w-fit sm:min-w-[300px] sm:px-10"
          >
            Verify email
            <ArrowRight aria-hidden="true" className="h-6 w-6" strokeWidth={2} />
          </button>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <button type="button" className="w-fit text-[11px] font-bold uppercase tracking-[0.18em] text-white/80">
              Resend code
            </button>
            <button type="button" className="w-fit text-[11px] font-bold uppercase tracking-[0.18em] text-white/55">
              Change email
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
