import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { Trophy } from "lucide-react";
import "./BpcCatalogCard.css";
import UsFlag from "./UsFlag.jsx";

const PACK_SIZES = [1, 5, 10];
const displayDose = (value) => value.replace(/\s+each\b/gi, "").trim().toUpperCase();

const LABELS = {
  EN: { dosage: "Dosage", quantity: "Select Quantity", perVial: "per vial", vial: "Vial", vials: "Vials", add: "Add to Cart", outOfStock: "Out of stock" },
  RU: { dosage: "Дозировка", quantity: "Выберите количество", perVial: "на флакон", vial: "Флакон", vials: "Флаконов", add: "В корзину", outOfStock: "Нет в наличии" },
  UA: { dosage: "Дозування", quantity: "Оберіть кількість", perVial: "на флакон", vial: "Флакон", vials: "Флаконів", add: "До кошика", outOfStock: "Немає в наявності" },
  DE: { dosage: "Dosierung", quantity: "Menge wählen", perVial: "pro Fläschchen", vial: "Fläschchen", vials: "Fläschchen", add: "In den Warenkorb", outOfStock: "Nicht verfügbar" },
  ES: { dosage: "Dosis", quantity: "Seleccionar cantidad", perVial: "por vial", vial: "Vial", vials: "Viales", add: "Añadir al carrito", outOfStock: "Agotado" },
};

export default function BpcCatalogCard({ id, language, name = "BPC-157", noteLabel, pricesByDose, renderVial, onAddToCart, onDecrementCart, getCartQuantity, isOutOfStock, onOpenProduct, getBadges }) {
  const doses = Object.keys(pricesByDose);
  const [dose, setDose] = useState(doses[0]);
  const [doseMenuOpen, setDoseMenuOpen] = useState(false);
  const [selectedVials, setSelectedVials] = useState(10);
  const doseMenuRef = useRef(null);
  const doseTriggerRef = useRef(null);
  const doseOptionRefs = useRef([]);
  const titleRef = useRef(null);
  const titleMeasureRef = useRef(null);
  const [fittedTitleSize, setFittedTitleSize] = useState(null);
  const idPrefix = useId().replace(/:/g, "");
  const labels = LABELS[language] || LABELS.EN;
  const packs = PACK_SIZES.map((vials) => ({ vials, price: pricesByDose[dose]?.[vials] ?? null }));
  const selectedPack = packs.find((choice) => choice.vials === selectedVials);
  const selection = { dose, vials: selectedVials, price: selectedPack?.price };
  const cartQuantity = Number.isFinite(selectedPack?.price) ? getCartQuantity(selection) : 0;
  const unavailable = Number.isFinite(selectedPack?.price) && isOutOfStock(selection);
  const badges = getBadges?.(selection) || {};

  useEffect(() => {
    if (!doses.includes(dose)) setDose(doses[0]);
  }, [dose, doses.join("|")]);

  useLayoutEffect(() => {
    const title = titleRef.current;
    const measure = titleMeasureRef.current;
    if (!title || !measure) return;

    let mounted = true;
    function fitTitle() {
      const baseSize = parseFloat(getComputedStyle(title).fontSize);
      measure.style.fontSize = `${baseSize}px`;
      const needed = measure.getBoundingClientRect().width;
      const available = title.clientWidth;
      const ratio = available / needed;
      const nextSize = ratio < 1 && ratio >= 0.72
        ? Math.floor(baseSize * ratio * 10) / 10
        : null;
      setFittedTitleSize((previous) => previous === nextSize ? previous : nextSize);
    }

    fitTitle();
    const observer = new ResizeObserver(fitTitle);
    observer.observe(title);
    window.addEventListener("resize", fitTitle);
    document.fonts?.ready.then(() => { if (mounted) fitTitle(); });
    return () => {
      mounted = false;
      observer.disconnect();
      window.removeEventListener("resize", fitTitle);
    };
  }, [name, noteLabel]);

  useEffect(() => {
    if (!doseMenuOpen) return;
    function closeOnOutsideClick(event) {
      if (!doseMenuRef.current?.contains(event.target)) setDoseMenuOpen(false);
    }
    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, [doseMenuOpen]);

  function selectDose(value) {
    setDose(value);
    setSelectedVials(10);
    setDoseMenuOpen(false);
    doseTriggerRef.current?.focus();
  }

  function handleDoseKeyDown(event, index) {
    if (event.key === "Escape") {
      event.preventDefault();
      setDoseMenuOpen(false);
      doseTriggerRef.current?.focus();
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const next = (index + (event.key === "ArrowDown" ? 1 : -1) + doses.length) % doses.length;
      doseOptionRefs.current[next]?.focus();
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      doseOptionRefs.current[event.key === "Home" ? 0 : doses.length - 1]?.focus();
    }
  }

  function add() {
    if (!Number.isFinite(selectedPack?.price) || unavailable) return;
    onAddToCart(selection);
  }

  function open() {
    if (!Number.isFinite(selectedPack?.price)) return;
    onOpenProduct({ dose, vials: selectedVials, price: selectedPack.price });
  }

  return (
    <article id={id} className={`bpc-catalog-card bpc-catalog-card--quantity-list${name.length > 18 ? " bpc-catalog-card--long-name" : ""}`} aria-label={`${name}${noteLabel ? ` ${noteLabel}` : ""}`}>
      <button type="button" className="bpc-catalog-card__product-link" aria-label={`${name} ${displayDose(dose)}`} onClick={open}>
        <div className="bpc-catalog-card__vial">
          {renderVial(dose)}
          <span className="bpc-catalog-card__badges">
            {badges.hot && <span className="bpc-catalog-card__badge bpc-catalog-card__badge--top"><Trophy size={11} strokeWidth={2.5} aria-hidden="true" />Top</span>}
            {badges.sale && <span className="bpc-catalog-card__badge bpc-catalog-card__badge--sale">Sale</span>}
            {badges.us && <span className="bpc-catalog-card__badge bpc-catalog-card__badge--us"><UsFlag />US</span>}
          </span>
        </div>
        <h2 className="bpc-catalog-card__title" ref={titleRef}>
          <span style={fittedTitleSize ? { fontSize: `${fittedTitleSize}px`, whiteSpace: "nowrap" } : undefined}>
            {name}{noteLabel && <> <small>{noteLabel}</small></>}
          </span>
          <span className="bpc-catalog-card__title-measure" ref={titleMeasureRef} aria-hidden="true">
            {name}{noteLabel && <> <small>{noteLabel}</small></>}
          </span>
        </h2>
      </button>

      <div className="bpc-catalog-card__dosages">
        <div className="bpc-catalog-card__select-wrap" ref={doseMenuRef} onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setDoseMenuOpen(false);
        }}>
          <button
            ref={doseTriggerRef}
            type="button"
            className="bpc-catalog-card__select"
            aria-labelledby={`${idPrefix}-card-dosage-label ${idPrefix}-card-dosage-value`}
            aria-haspopup="listbox"
            aria-expanded={doseMenuOpen}
            aria-controls={`${idPrefix}-card-dosage-options`}
            onClick={() => setDoseMenuOpen((open) => !open)}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                event.preventDefault();
                setDoseMenuOpen(true);
                requestAnimationFrame(() => doseOptionRefs.current[doses.indexOf(dose)]?.focus());
              } else if (event.key === "Escape") {
                setDoseMenuOpen(false);
              }
            }}
          >
            <span className="bpc-catalog-card__select-content">
              <span className="bpc-catalog-card__select-value" id={`${idPrefix}-card-dosage-value`}>{displayDose(dose)}</span>
              <span className="bpc-catalog-card__label" id={`${idPrefix}-card-dosage-label`}>
                <span className="bpc-catalog-card__label-main">{labels.dosage}</span>{" "}
                <span className="bpc-catalog-card__label-detail">{labels.perVial}</span>
              </span>
            </span>
            <span className="bpc-catalog-card__chevron" aria-hidden="true" />
          </button>
          {doseMenuOpen && (
            <div id={`${idPrefix}-card-dosage-options`} className="bpc-catalog-card__menu" role="listbox" aria-labelledby={`${idPrefix}-card-dosage-label`}>
              {doses.map((value, index) => {
                const doseUnavailable = isOutOfStock({ dose: value, vials: 10 });
                return (
                  <button
                    key={value}
                    ref={(element) => { doseOptionRefs.current[index] = element; }}
                    type="button"
                    role="option"
                    aria-selected={dose === value}
                    aria-label={`${displayDose(value)}${doseUnavailable ? ", OUT OF STOCK" : ""}`}
                    className={`bpc-catalog-card__option${dose === value ? " is-selected" : ""}`}
                    onClick={() => selectDose(value)}
                    onKeyDown={(event) => handleDoseKeyDown(event, index)}
                  >
                    <span>{displayDose(value)}</span>
                    {doseUnavailable && (
                      <span className="bpc-catalog-card__option-status">OUT OF STOCK</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div
        className="bpc-catalog-card__packs"
        role="group"
        aria-label={labels.quantity}
      >
        {packs.map((choice) => (
          <button
            key={choice.vials}
            type="button"
            aria-pressed={selectedVials === choice.vials}
            disabled={!Number.isFinite(choice.price)}
            onClick={() => setSelectedVials(choice.vials)}
            className={`bpc-catalog-card__pack${selectedVials === choice.vials ? " is-selected" : ""}`}
          >
            <span className="bpc-catalog-card__radio" aria-hidden="true" />
            <span>{choice.vials} {choice.vials === 1 ? labels.vial : labels.vials}</span>
            {Number.isFinite(choice.price) && (
              <strong>
                <span className="md:hidden">${choice.price.toFixed(2).replace(/\.00$/, "")}</span>
                <span className="hidden md:inline">${choice.price.toFixed(2)}</span>
              </strong>
            )}
          </button>
        ))}
      </div>

      <div className="bpc-catalog-card__cart-action">
        {unavailable ? (
          <div className="flex h-full w-full items-center justify-center rounded-full border border-white/20 bg-white/10 px-3 text-[10px] font-black uppercase tracking-[0.18em] text-white/50 cursor-not-allowed md:px-5 md:text-[13px] md:tracking-[0.26em]">{labels.outOfStock}</div>
        ) : cartQuantity > 0 ? (
          <div className="flex h-full w-full overflow-hidden rounded-full border border-black shadow-[0_6px_20px_rgba(0,0,0,0.15)]">
            <button type="button" className="flex items-center justify-center bg-black px-3 py-2 hover:bg-black/80 transition-colors md:px-5" onClick={() => onDecrementCart(selection)} aria-label={`− 1 ${name} ${dose}, ${selectedVials} ${labels.vials}`}>
              <span className="select-none text-[10px] font-black leading-[1.5] text-white md:text-[13px]">−</span>
            </button>
            <button type="button" className="bpc-catalog-card__cart-primary flex flex-1 items-center justify-center gap-1 bg-white px-2 py-2 text-[11px] font-black uppercase tracking-[0.06em] text-black hover:bg-white/90 transition-none md:px-5 md:text-[14px] md:tracking-[0.16em]" onClick={add}>
              <span className="bpc-catalog-card__cart-label whitespace-nowrap">
                {labels.add}
                {cartQuantity > 1 && <span className="bpc-catalog-card__cart-count ml-1 tracking-normal">×{cartQuantity}</span>}
              </span>
            </button>
          </div>
        ) : (
          <button type="button" className="flex h-full w-full items-center justify-center rounded-full border border-black bg-white px-3 text-[11px] font-black uppercase tracking-[0.06em] whitespace-nowrap text-black shadow-[0_6px_20px_rgba(0,0,0,0.15)] hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed md:px-5 md:text-[14px] md:tracking-[0.16em]" disabled={!Number.isFinite(selectedPack?.price)} onClick={add}>
            {labels.add}
          </button>
        )}
      </div>
    </article>
  );
}