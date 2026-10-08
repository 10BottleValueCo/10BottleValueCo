import { Info } from "lucide-react";
import "./_group.css";

const tx = (_en: string, ru: string) => ru;

export function Current() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[#111315] p-5">
      <div className="relative h-[210px] w-full max-w-[360px] overflow-hidden rounded-[28px] border border-white/10 bg-[radial-gradient(ellipse_at_24%_10%,rgba(255,255,255,0.18),transparent_36%),linear-gradient(135deg,#35383b_0%,#202326_48%,#111315_100%)] shadow-[0_16px_36px_rgba(0,0,0,0.45)]">
        <div className="absolute inset-y-0 left-[24%] w-px bg-white/[0.035]" />
        <details className="absolute left-2 top-2 z-20 text-left">
          <summary
            aria-label={tx("Label information", "Информация об этикетках")}
            className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-full text-black/65 transition-colors hover:bg-black/10 hover:text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-black/70 [&::-webkit-details-marker]:hidden"
          >
            <Info size={19} strokeWidth={1.8} aria-hidden="true" />
          </summary>
          <div
            role="note"
            className="absolute left-0 top-11 w-56 rounded-xl border border-white/20 bg-[#1f1f1f]/95 p-3 text-xs font-semibold leading-relaxed text-white shadow-xl sm:w-64"
          >
            {tx(
              "Orders of 10 vials are supplied without labels.",
              "Заказы по 10 флаконов поставляются без этикеток."
            )}
          </div>
        </details>
      </div>
    </div>
  );
}
