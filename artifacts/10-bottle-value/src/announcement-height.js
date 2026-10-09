const HEIGHT_PROPERTY = "--tbv-announcement-height";

// Only desktop uses the announcement height for the sticky header. Read sizes
// supplied by ResizeObserver rather than forcing layout during React's commit.
export function observeAnnouncementHeight(bar, header, view = window) {
  if (!bar || !header) return () => {};

  const desktop = view.matchMedia("(min-width: 768px)");
  let disposed = false;
  let stopObserving = () => {};

  const setHeight = (height) => {
    if (!disposed && desktop.matches && Number.isFinite(height) && height > 0) {
      header.style.setProperty(HEIGHT_PROPERTY, `${Math.ceil(height)}px`);
    }
  };

  const updateViewport = () => {
    stopObserving();
    header.style.setProperty(HEIGHT_PROPERTY, "32px");
    if (disposed || !desktop.matches) return;

    let active = true;
    let frame = null;
    const scheduleFallbackMeasure = () => {
      if (!active || disposed || !desktop.matches || frame !== null) return;
      frame = view.requestAnimationFrame(() => {
        frame = null;
        if (active && !disposed && desktop.matches) {
          setHeight(bar.getBoundingClientRect().height);
        }
      });
    };
    const stop = () => {
      active = false;
      if (frame !== null) view.cancelAnimationFrame(frame);
    };

    if (typeof view.ResizeObserver === "function") {
      const observer = new view.ResizeObserver((entries) => {
        if (!active || disposed || !desktop.matches) return;
        const entry = entries.find((item) => item.target === bar);
        if (!entry) return;
        const boxes = entry.borderBoxSize;
        const height = (Array.isArray(boxes) ? boxes[0] : boxes)?.blockSize;
        if (Number.isFinite(height) && height > 0) setHeight(height);
        else scheduleFallbackMeasure();
      });
      try { observer.observe(bar, { box: "border-box" }); }
      catch { observer.observe(bar); }
      stopObserving = () => { stop(); observer.disconnect(); };
      return;
    }

    // Older browsers measure after commit, coalesced into one animation frame.
    // Text changes and late fonts can change wrapping without a window resize.
    const fonts = view.document?.fonts;
    const mutationObserver = typeof view.MutationObserver === "function"
      ? new view.MutationObserver(scheduleFallbackMeasure)
      : null;
    mutationObserver?.observe(bar, { childList: true, characterData: true, subtree: true });
    view.addEventListener("resize", scheduleFallbackMeasure);
    fonts?.addEventListener?.("loadingdone", scheduleFallbackMeasure);
    fonts?.ready?.then(scheduleFallbackMeasure, () => {});
    scheduleFallbackMeasure();
    stopObserving = () => {
      stop();
      mutationObserver?.disconnect();
      view.removeEventListener("resize", scheduleFallbackMeasure);
      fonts?.removeEventListener?.("loadingdone", scheduleFallbackMeasure);
    };
  };

  if (desktop.addEventListener) desktop.addEventListener("change", updateViewport);
  else desktop.addListener(updateViewport);
  updateViewport();

  return () => {
    disposed = true;
    stopObserving();
    if (desktop.removeEventListener) desktop.removeEventListener("change", updateViewport);
    else desktop.removeListener(updateViewport);
    header.style.setProperty(HEIGHT_PROPERTY, "32px");
  };
}
