// Cosmetic adapter for the current provider card. There is no supported SDK
// appearance hook. If its DOM contract changes, keep the provider's native UI.
// The original input, verification handlers and all network I/O stay with SDK.
const CODE_LENGTH = 6;
const digits = value => String(value || "").replace(/[^0-9]/g, "");

export function normalizeMeritCode(value, start = String(value || "").length, end = start) {
  const raw = String(value || "");
  return { value: digits(raw).slice(0, CODE_LENGTH),
    start: Math.min(CODE_LENGTH, digits(raw.slice(0, start)).length),
    end: Math.min(CODE_LENGTH, digits(raw.slice(0, end)).length) };
}

export function pasteMeritCode(value, pasted, start, end) {
  const code = digits(pasted).slice(0, CODE_LENGTH);
  // A complete code replaces a previous attempt; partial paste follows native
  // selection replacement. Handle separators before maxlength can truncate it.
  if (code.length === CODE_LENGTH) return { value: code, start: CODE_LENGTH, end: CODE_LENGTH };
  return normalizeMeritCode(value.slice(0, start) + code + value.slice(end), start + code.length);
}

const STYLE = `
#avrp-coderow[data-tbv-code-cells]{flex-direction:column;gap:12px}
#avrp-coderow .tbv-code{position:relative;width:100%;max-width:360px;margin:0 auto;direction:ltr}
#avrp-coderow .tbv-code-cells{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:8px;pointer-events:none}
#avrp-coderow .tbv-code-cell{position:relative;display:flex;align-items:center;justify-content:center;min-width:0;height:52px;border:1px solid #cbd5e1;border-radius:10px;background:#fff;color:#0f172a;font:500 24px/1 ui-monospace,'SF Mono',Menlo,Consolas,monospace}
#avrp-coderow .tbv-code-cell[data-active]{border-color:#0c8fd6;box-shadow:0 0 0 3px #e6f3fb}
#avrp-coderow .tbv-code-cell[data-selected]{background:#e6f3fb}
#avrp-coderow .tbv-code-cell[data-caret]::after{content:'';width:2px;height:24px;background:#0f172a;position:absolute}
#avrp-coderow .tbv-code #avrp-code{position:absolute;inset:0;z-index:1;width:100%;height:100%;margin:0;padding:0;border:0;border-radius:10px;background:transparent;color:transparent;-webkit-text-fill-color:transparent;caret-color:transparent;box-shadow:none;outline:none;text-align:left;direction:ltr;letter-spacing:normal;font-size:16px}
#avrp-coderow .tbv-code #avrp-code::placeholder{color:transparent}
#avrp-coderow .tbv-code #avrp-code::selection{background:transparent}
#avrp-coderow .tbv-code #avrp-code:disabled{cursor:not-allowed}
@media(forced-colors:active){#avrp-coderow .tbv-code-cell{border-color:CanvasText;background:Canvas;color:CanvasText}#avrp-coderow .tbv-code-cell[data-active]{border:2px solid Highlight}#avrp-coderow .tbv-code-cell[data-selected]{background:Highlight;color:HighlightText}#avrp-coderow .tbv-code-cell[data-caret]::after{background:CanvasText}}
`;

export function attachMeritCodeCells(root) {
  const input = root?.querySelector?.("#avrp-code");
  const row = root?.querySelector?.("#avrp-coderow");
  const verify = root?.querySelector?.("#avrp-verify");
  if (!input || !row || !verify || input.parentElement !== row || verify.parentElement !== row
    || input.tagName !== "INPUT" || input.type !== "text" || input.maxLength !== CODE_LENGTH
    || input.getAttribute("autocomplete") !== "one-time-code" || input.getAttribute("inputmode") !== "numeric"
    || input.getAttribute("pattern") !== "[0-9]{6}" || row.hasAttribute("data-tbv-code-cells")) return null;
  const doc = input.ownerDocument;
  const shell = doc.createElement("div");
  shell.className = "tbv-code";
  const display = doc.createElement("div");
  display.className = "tbv-code-cells";
  display.setAttribute("aria-hidden", "true");
  const cells = Array.from({ length: CODE_LENGTH }, () => {
    const cell = doc.createElement("span");
    cell.className = "tbv-code-cell";
    display.appendChild(cell);
    return cell;
  });
  const style = doc.createElement("style");
  style.textContent = STYLE;
  const original = new Map(["aria-label", "aria-describedby", "placeholder", "dir"].map(name => [name, input.getAttribute(name)]));
  const wasFocused = root.activeElement === input || doc.activeElement === input;
  const originalSelection = [input.selectionStart, input.selectionEnd];

  function render() {
    const focused = root.activeElement === input || doc.activeElement === input;
    const start = input.selectionStart ?? 0;
    const end = input.selectionEnd ?? start;
    cells.forEach((cell, index) => {
      cell.textContent = input.value[index] || "";
      const active = focused && index === Math.min(start, CODE_LENGTH - 1);
      cell.toggleAttribute("data-active", active);
      cell.toggleAttribute("data-selected", focused && index >= start && index < end);
      cell.toggleAttribute("data-caret", active && !input.value[index] && start === end);
    });
  }
  function normalize() {
    const next = normalizeMeritCode(input.value, input.selectionStart ?? 0, input.selectionEnd ?? 0);
    if (next.value !== input.value) {
      input.value = next.value;
      input.setSelectionRange(next.start, next.end);
    }
    render();
  }
  function insert(text) {
    if (!digits(text)) return;
    const next = pasteMeritCode(input.value, text, input.selectionStart ?? 0, input.selectionEnd ?? input.value.length);
    input.value = next.value;
    input.setSelectionRange(next.start, next.end);
    input.dispatchEvent(new doc.defaultView.Event("input", { bubbles: true, composed: true }));
  }
  function paste(event) {
    const text = event.clipboardData?.getData("text/plain");
    if (typeof text !== "string") return;
    event.preventDefault();
    insert(text);
  }
  function beforeInput(event) {
    // Some autofill keyboards include a separator. Intercept their complete
    // replacement before native maxlength; ordinary digit editing stays native.
    if (!event.isComposing && event.cancelable && typeof event.data === "string"
      && event.inputType?.startsWith("insert") && /[^0-9]/.test(event.data)) {
      event.preventDefault();
      insert(event.data);
    }
  }
  function point(event) {
    // Keyboard/assistive clicks have no pointer position; preserve selection.
    if (!event.detail || input.selectionEnd > input.selectionStart) return;
    let closest = 0;
    let distance = Infinity;
    cells.forEach((cell, index) => {
      const bounds = cell.getBoundingClientRect();
      const delta = Math.abs(event.clientX - bounds.left - bounds.width / 2);
      if (delta < distance) { closest = index; distance = delta; }
    });
    const start = Math.min(closest, input.value.length);
    input.setSelectionRange(start, Math.min(start + 1, input.value.length));
    render();
  }
  const handlers = { beforeinput: beforeInput, input: normalize, change: normalize, paste, click: point, focus: render, blur: render, keyup: render, select: render };
  const capture = { capture: true };
  let disposed = false;
  function dispose() {
    if (disposed) return;
    disposed = true;
    const keepFocus = root.activeElement === input || doc.activeElement === input;
    const selection = [input.selectionStart, input.selectionEnd];
    for (const [event, handler] of Object.entries(handlers)) input.removeEventListener(event, handler, capture);
    doc.removeEventListener("selectionchange", render);
    if (shell.parentElement === row && input.parentElement === shell) row.insertBefore(input, shell);
    shell.remove();
    style.remove();
    row.removeAttribute("data-tbv-code-cells");
    for (const [name, value] of original) {
      if (value === null) input.removeAttribute(name);
      else input.setAttribute(name, value);
    }
    if (keepFocus) {
      input.focus({ preventScroll: true });
      input.setSelectionRange(...selection);
    }
  }
  try {
    input.setAttribute("aria-label", "Six-digit verification code");
    input.setAttribute("aria-describedby", [...new Set(`${original.get("aria-describedby") || ""} avrp-msg`.trim().split(/\s+/))].join(" "));
    input.setAttribute("placeholder", "");
    input.setAttribute("dir", "ltr");
    row.setAttribute("data-tbv-code-cells", "");
    root.appendChild(style);
    row.insertBefore(shell, input);
    shell.appendChild(display);
    shell.appendChild(input);
    for (const [event, handler] of Object.entries(handlers)) input.addEventListener(event, handler, capture);
    doc.addEventListener("selectionchange", render);
    if (wasFocused) {
      input.focus({ preventScroll: true });
      input.setSelectionRange(...originalSelection);
    }
    render();
  } catch {
    dispose();
    return null;
  }
  return dispose;
}

export function observeMeritCodeCells({ document: doc = globalThis.document, signal } = {}) {
  const Observer = doc?.defaultView?.MutationObserver;
  if (!doc?.body || !Observer || signal?.aborted) return () => {};
  let disposeCells;
  let observedRoot;
  let stopped = false;
  let observer;
  let deadline;
  function disconnect() {
    observer?.disconnect();
    clearTimeout(deadline);
  }
  function stop() {
    if (stopped) return;
    stopped = true;
    disconnect();
    disposeCells?.();
    signal?.removeEventListener("abort", stop);
  }
  function scan() {
    if (stopped || disposeCells) return;
    try {
      const host = doc.getElementById("attestly-vrp-host");
      const root = host?.shadowRoot || host;
      if (!root) return;
      // Host can be inserted before its shadow children. Observe that one root
      // until ready, then disconnect for the remainder of verification.
      if (root !== observedRoot) {
        observedRoot = root;
        observer.observe(root, { childList: true, subtree: true });
      }
      disposeCells = attachMeritCodeCells(root);
      if (disposeCells || root.querySelector("#avrp-code")) disconnect();
    } catch { stop(); }
  }
  try {
    observer = new Observer(scan);
    observer.observe(doc.body, { childList: true, subtree: true });
    // Delayed/unrecognized SDK UIs keep the original field. Never watch the
    // entire document indefinitely while a provider promise stays unresolved.
    deadline = setTimeout(disconnect, 10000);
    signal?.addEventListener("abort", stop, { once: true });
    scan();
  } catch { stop(); }
  return stop;
}
