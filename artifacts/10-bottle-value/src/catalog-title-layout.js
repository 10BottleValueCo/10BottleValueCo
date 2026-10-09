// One read phase per frame for every visible card. The previous per-card
// effect wrote a font size before reading layout, once for every product.
const titles = new Map();
const pending = new Set();
let frame = null;
let sizeObserver = null;
let visibilityObserver = null;
let removeResizeListener = null;

function schedule(record) {
  if (!record.visible) return;
  pending.add(record);
  if (frame !== null) return;
  frame = requestAnimationFrame(flush);
}

function flush() {
  frame = null;
  const measurements = [];
  for (const record of pending) {
    if (!record.visible || !titles.has(record.card)) continue;
    const baseSize = parseFloat(getComputedStyle(record.title).fontSize);
    const available = record.title.clientWidth;
    // The measuring span inherits the title's font. No DOM write is needed.
    const needed = record.measure.getBoundingClientRect().width;
    if (!(available > 0 && needed > 0 && baseSize > 0)) continue;
    const ratio = available / needed;
    const size = ratio < 1 && ratio >= 0.72
      ? Math.floor(baseSize * ratio * 10) / 10
      : null;
    measurements.push([record, size]);
  }
  pending.clear();
  // Apply only after all geometry reads, so a React update cannot split them.
  for (const [record, size] of measurements) record.onSize(size);
}

function scheduleVisible() {
  for (const record of titles.values()) schedule(record);
}

function connect() {
  if (typeof ResizeObserver !== "undefined") {
    sizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const record = titles.get(entry.target);
        if (!record || record.width === entry.contentRect.width) continue;
        record.width = entry.contentRect.width;
        schedule(record);
      }
    });
  }
  // Font breakpoints can change while a fixed-width card stays the same size.
  // One shared listener preserves that refit without one listener per card.
  window.addEventListener("resize", scheduleVisible, { passive: true });
  removeResizeListener = () => window.removeEventListener("resize", scheduleVisible);
  if (typeof IntersectionObserver !== "undefined") {
    visibilityObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const record = titles.get(entry.target);
        if (!record) continue;
        record.visible = entry.isIntersecting;
        if (record.visible) schedule(record);
        else pending.delete(record);
      }
    }, { rootMargin: "600px 0px" });
  }
  document.fonts?.ready.then(scheduleVisible);
}

export function observeCatalogTitle(card, title, measure, onSize) {
  if (!card || !title || !measure) return () => {};
  if (!titles.size) connect();
  const record = { card, title, measure, onSize, visible: !visibilityObserver, width: null };
  titles.set(card, record);
  sizeObserver?.observe(card);
  visibilityObserver?.observe(card);
  schedule(record);
  return () => {
    titles.delete(card);
    pending.delete(record);
    sizeObserver?.unobserve(card);
    visibilityObserver?.unobserve(card);
    if (titles.size) return;
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
    sizeObserver?.disconnect();
    visibilityObserver?.disconnect();
    sizeObserver = visibilityObserver = null;
    removeResizeListener?.();
    removeResizeListener = null;
  };
}
