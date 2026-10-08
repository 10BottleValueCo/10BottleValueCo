type OrderPanelsProps = {
  outlined: boolean;
};

const addressRows = [
  ["NAME", "Ilja Malcenko", true],
  ["ADDRESS", "Latvia, Lielvarde, Avotu iela 7, dzivoklis 31", false],
  ["APT/SUITE", "—", false],
  ["CITY", "Lielvārde, Ogres nov.", false],
  ["POSTAL CODE", "LV-5070", false],
  ["STATE", "222", false],
  ["COUNTRY", "Latvia", false],
  ["PHONE", "20565109", false],
  ["CARRIER", "—", false],
] as const;

export function OrderPanels({ outlined }: OrderPanelsProps) {
  const panelOutline = outlined ? "border border-white/40" : "";

  return (
    <main className="min-h-screen bg-[#17191b] p-4 font-sans text-white md:p-6">
      <article className="mx-auto w-full max-w-[720px] rounded-[1.4rem] border-2 border-white/40 bg-black px-5 pb-5 pt-5">
        <div className="mb-2 flex flex-wrap items-center gap-3">
          <span className="font-mono text-sm font-bold">INV-78TWA5ZO</span>
          <span className="rounded-full border border-amber-300/40 bg-amber-300/10 px-2 py-[2px] text-[10px] font-bold uppercase tracking-[0.18em] text-amber-200">
            CHECKOUT (CLICKED PAY)
          </span>
          <span className="ml-auto text-xs text-white/50">Oct 8, 2026, 12:13 PM</span>
        </div>

        <div className={`mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 rounded-lg bg-black/15 px-3 py-2 text-xs ${panelOutline}`}>
          {addressRows.map(([label, value, isName]) => (
            <div key={label} className="contents">
              <span className="uppercase tracking-[0.12em] text-white/50">{label}</span>
              <span className={isName ? "font-semibold text-white/85" : "text-white/70"}>{value}</span>
            </div>
          ))}
        </div>

        <div className="mt-6 flex items-center gap-2 text-[11px]">
          <div className="min-w-0 flex-1 rounded-lg bg-[#5a5a5a] px-3 py-2 text-white">GLP RT-3 20 mg</div>
          <span className="text-white/50">×</span>
          <div className="rounded-lg border border-white/20 px-3 py-2">1</div>
          <span className="text-white/50">$</span>
          <div className="rounded-lg border border-white/20 px-3 py-2">259</div>
          <span className="text-white/70">$259.00</span>
        </div>

        <div className={`mt-6 grid w-fit grid-cols-[auto_auto] items-center gap-x-4 gap-y-1.5 rounded-lg bg-black/15 px-3 py-2 text-xs ${panelOutline}`}>
          <span className="uppercase tracking-[0.12em] text-white/50">Subtotal</span>
          <span className="w-24 border-b border-white/10 pr-0.5 text-right tabular-nums text-white/70">259,00</span>
          <span className="uppercase tracking-[0.12em] text-white/50">Shipping</span>
          <span className="w-24 border-b border-white/10 pr-0.5 text-right tabular-nums text-white/70">39,99</span>
          <span className="uppercase tracking-[0.12em] text-white/50">Credits used</span>
          <span className="w-24 border-b border-white/10 pr-0.5 text-right tabular-nums text-cyan-300">1,00</span>
          <span className="font-bold uppercase tracking-[0.12em] text-white/50">Total</span>
          <span className="w-24 border-b border-white/10 pr-0.5 text-right font-bold tabular-nums text-white">297,99</span>
        </div>
      </article>
    </main>
  );
}
