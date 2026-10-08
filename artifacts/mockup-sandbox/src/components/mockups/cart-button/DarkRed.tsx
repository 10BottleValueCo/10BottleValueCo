import "./_group.css";

export function DarkRed() {
  return (
    <main className="cart-button-preview">
      <article className="bpc-catalog-card bpc-catalog-card--catalog">
        <div className="bpc-catalog-card__cart-action">
          <div className="flex h-full w-full overflow-hidden rounded-full border border-black shadow-[0_6px_20px_rgba(0,0,0,0.15)]">
            <button
              type="button"
              className="flex items-center justify-center bg-[#a33b3b] px-3 py-2 text-black transition-colors hover:bg-[#b34848] md:px-5"
              aria-label="Remove one BPC-157 from cart"
            >
              <span
                aria-hidden="true"
                className="block h-[2px] w-[11px] rounded-full bg-black"
              />
            </button>
            <button
              type="button"
              className="bpc-catalog-card__cart-primary flex flex-1 items-center justify-center gap-1 bg-white px-2 py-2 text-[11px] font-black uppercase tracking-[0.06em] text-black transition-none hover:bg-white/90 md:px-5 md:text-[14px] md:tracking-[0.16em]"
            >
              <span className="bpc-catalog-card__cart-label whitespace-nowrap">
                ADD TO CART
              </span>
            </button>
          </div>
        </div>
      </article>
    </main>
  );
}
