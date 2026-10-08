import "./_group.css";

const missing = "Not saved yet";

export function Current() {
  return (
    <div className="min-h-screen bg-[#8f8f8f] px-4 py-6 text-white md:px-10 md:py-12">
      <main className="mx-auto max-w-7xl rounded-[1.5rem] border border-white/20 bg-black/[0.18] p-4 md:rounded-[2rem] md:p-10">
        <div className="text-[11px] uppercase tracking-[0.24em] text-white/60">
          My account
        </div>

        <div className="mt-3 flex items-start justify-between gap-4">
          <h1 className="flex items-center gap-3 text-2xl font-semibold tracking-[-0.04em] md:text-4xl">
            Welcome back!
            <span className="inline-block" aria-hidden="true">👋</span>
          </h1>
        </div>

        <div className="mt-6 grid gap-4 md:mt-8 md:grid-cols-2 md:gap-5">
          <section className="rounded-[1.6rem] border border-white/20 bg-black/[0.18] p-4 md:p-6">
            <div className="text-[11px] uppercase tracking-[0.22em] text-white/60">
              Account email
            </div>
            <div className="mt-2 break-all text-base font-semibold md:mt-3 md:text-2xl">
              researcher@example.com
            </div>
          </section>

          <button
            type="button"
            className="rounded-[1.6rem] border border-white/20 bg-black/[0.18] p-4 text-left shadow-[0_4px_20px_rgba(0,0,0,0.15)] transition-none hover:bg-black/[0.18] active:scale-[0.98] md:p-6"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-white/60">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
                Messages
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-white/30" aria-hidden="true">
                <path d="m9 18 6-6-6-6" />
              </svg>
            </div>
            <div className="mt-2 text-base font-semibold md:mt-3 md:text-2xl">
              View inbox
            </div>
          </button>
        </div>

        <div className="mt-6 grid gap-4 md:mt-8 md:grid-cols-2 md:gap-5">
          {[
            ["First name", missing],
            ["Last name", missing],
            ["Country", missing],
            ["City", missing],
          ].map(([label, value]) => (
            <section
              key={label}
              className="rounded-[1.6rem] border border-white/20 bg-black/[0.18] p-4 md:p-6"
            >
              <div className="text-[11px] uppercase tracking-[0.22em] text-white/60">
                {label}
              </div>
              <div className="mt-2 text-sm font-semibold md:mt-3 md:text-xl">
                {value}
              </div>
            </section>
          ))}
        </div>

        <section className="mt-6 rounded-[1.6rem] border border-white/20 bg-black/[0.18] p-4 md:mt-8 md:p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-4">
            <div className="text-[11px] uppercase tracking-[0.22em]">
              Saved shipping details (used at checkout)
            </div>
            <div className="flex flex-wrap gap-3">
              <button type="button" className="rounded-full bg-white px-6 py-2 text-[11px] font-extrabold uppercase tracking-[0.22em] text-black">
                Edit shipping details
              </button>
              <button type="button" className="rounded-full bg-white px-6 py-2 text-[11px] font-extrabold uppercase tracking-[0.22em] text-black">
                Change password
              </button>
            </div>
          </div>
          <div className="mt-5 grid gap-3 border-t border-white/10 pt-5 sm:grid-cols-2">
            {["Address", "Postal code", "State / province", "Phone"].map((label) => (
              <div key={label} className="rounded-2xl border border-white/10 bg-black/[0.18] px-4 py-3">
                <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/50">
                  {label}
                </div>
                <div className="mt-1 text-xs font-semibold text-white/80">{missing}</div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
