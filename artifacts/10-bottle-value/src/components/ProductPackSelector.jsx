const LABELS = {
  EN: { title: "Choose your quantity", vial: "vial", vials: "vials", unavailable: "Unavailable" },
  RU: { title: "Выберите количество", vial: "флакон", vials: "флаконов", unavailable: "Недоступно" },
  UA: { title: "Оберіть кількість", vial: "флакон", vials: "флаконів", unavailable: "Недоступно" },
  DE: { title: "Menge wählen", vial: "Fläschchen", vials: "Fläschchen", unavailable: "Nicht verfügbar" },
  ES: { title: "Seleccionar cantidad", vial: "vial", vials: "viales", unavailable: "No disponible" },
};

export default function ProductPackSelector({ language, price, selectedVials = 10, pricesByPack = { 10: price }, onSelectPack }) {
  const labels = LABELS[language] || LABELS.EN;

  return (
    <section className="mt-6" aria-label={labels.title}>
      <div className="grid gap-2">
        {[1, 5, 10].map((count) => {
          const packPrice = pricesByPack[count];
          const available = typeof packPrice === "number" && Number.isFinite(packPrice);
          const selected = count === selectedVials;
          return (
            <button
              key={count}
              type="button"
              disabled={!available}
              aria-pressed={selected}
              onClick={() => onSelectPack?.(count)}
              aria-label={`${count} ${count === 1 ? labels.vial : labels.vials}${available ? `, $${packPrice.toFixed(2)}` : `, ${labels.unavailable}`}`}
              className={`flex min-h-14 w-full items-center gap-3 rounded-2xl border px-4 text-left transition-colors ${
                selected && available
                  ? "border-white bg-white text-[#222] shadow-[0_10px_28px_rgba(0,0,0,0.18)]"
                  : `${available ? "border-white/30 bg-white/10 text-white hover:bg-white/20" : "cursor-not-allowed border-white/15 bg-black/10 text-white/45"} ${selected ? "ring-1 ring-white/50" : ""}`
              }`}
            >
              <span className={`flex size-5 shrink-0 items-center justify-center rounded-full border-2 ${selected && available ? "border-black" : "border-white/40"}`} aria-hidden="true">
                {selected && <span className={`size-2 rounded-full ${available ? "bg-black" : "bg-white/40"}`} />}
              </span>
              <span className="flex-1 text-sm font-bold uppercase tracking-[0.09em]">
                {count} {count === 1 ? labels.vial : labels.vials}
              </span>
              {available ? (
                <strong className="text-lg font-extrabold tabular-nums">${packPrice.toFixed(2)}</strong>
              ) : (
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em]">{labels.unavailable}</span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}