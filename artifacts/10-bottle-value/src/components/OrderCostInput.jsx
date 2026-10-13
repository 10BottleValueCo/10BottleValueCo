import { useEffect, useRef, useState } from "react";
import { parseCostAmount } from "../order-cost-overrides.js";

const format = value => value == null || !Number.isFinite(Number(value)) ? "" : Number(value).toFixed(2);

export default function OrderCostInput({ value, onSave, label, testId }) {
  const formatted = format(value);
  const [draft, setDraft] = useState(formatted);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const focused = useRef(false);
  const busy = useRef(false);
  const skipBlur = useRef(false);

  useEffect(() => {
    if (!focused.current && !busy.current) setDraft(formatted);
  }, [formatted]);

  async function save(raw) {
    if (busy.current) return;
    try {
      const amount = parseCostAmount(raw);
      if (formatted !== "" && amount === parseCostAmount(formatted)) {
        setDraft(formatted);
        setError("");
        setStatus("");
        return;
      }
      busy.current = true;
      setStatus("saving");
      setError("");
      await onSave(amount);
      setDraft(amount.toFixed(2));
      setStatus("saved");
    } catch (failure) {
      setError(failure?.message || "Could not save. Retry.");
      setStatus("error");
    } finally {
      busy.current = false;
    }
  }

  return (
    <span onClick={event => event.stopPropagation()} style={{ display: "inline-flex", flexDirection: "column", verticalAlign: "middle", gap: 2 }}>
      <input
        type="text"
        inputMode="decimal"
        aria-label={label}
        aria-invalid={Boolean(error)}
        aria-busy={status === "saving"}
        data-testid={testId}
        title="USD. Press Enter or click outside to save. Escape cancels."
        value={draft}
        placeholder="Unknown"
        disabled={status === "saving"}
        onFocus={() => { focused.current = true; }}
        onChange={event => { setDraft(event.target.value); setStatus(""); setError(""); }}
        onBlur={event => {
          focused.current = false;
          if (skipBlur.current) { skipBlur.current = false; return; }
          if (event.target.value !== formatted) void save(event.target.value);
        }}
        onKeyDown={event => {
          if (event.key === "Enter") { event.preventDefault(); event.currentTarget.blur(); }
          if (event.key === "Escape") {
            event.preventDefault();
            skipBlur.current = true;
            setDraft(formatted);
            setError("");
            setStatus("");
            event.currentTarget.blur();
          }
        }}
        style={{ width: 78, background: "#111827", border: "1px solid rgba(248,113,113,.5)", borderRadius: 4, color: "#f87171", padding: "3px 5px", fontSize: 11, fontWeight: 600, outline: "none", boxSizing: "border-box" }}
      />
      {status === "saving" && <span role="status" style={{ color: "#fbbf24", fontSize: 10 }}>Saving…</span>}
      {status === "saved" && <span role="status" style={{ color: "#16c784", fontSize: 10 }}>Saved ✓</span>}
      {error && (
        <span style={{ maxWidth: 180, whiteSpace: "normal", fontSize: 10, color: "#f87171" }}>
          <span role="alert">{error}</span>{" "}
          <button type="button" onMouseDown={event => event.preventDefault()} onClick={() => void save(draft)} style={{ color: "#fff", textDecoration: "underline", background: "transparent", border: 0, padding: 0, cursor: "pointer" }}>Retry</button>
        </span>
      )}
    </span>
  );
}
