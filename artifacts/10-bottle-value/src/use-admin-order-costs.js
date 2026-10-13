import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createOrderCostSaver, loadOrderCostOverrides } from "./order-cost-overrides.js";

export default function useAdminOrderCosts(client, enabled, userKey) {
  const [state, setState] = useState({ key: null, costs: {}, loading: false, error: "" });
  const generation = useRef(0);
  const versions = useRef({});
  const refreshRef = useRef(null);
  const persist = useMemo(() => createOrderCostSaver(client), [client]);
  useEffect(() => {
    const current = ++generation.current;
    versions.current = {};
    setState({ key: enabled ? userKey : null, costs: {}, loading: enabled, error: "" });
    if (!enabled) { refreshRef.current = null; return undefined; }
    let busy = false;
    const refresh = async () => {
      if (busy) return;
      busy = true;
      const before = { ...versions.current };
      try {
        const costs = await loadOrderCostOverrides(client);
        if (generation.current !== current) return;
        setState(previous => {
          if (generation.current !== current) return previous;
          // A late reload cannot overwrite a save acknowledged after it started.
          for (const id of Object.keys(versions.current)) {
            if (before[id] !== versions.current[id] && previous.costs[id]) costs[id] = previous.costs[id];
          }
          return { key: userKey, costs, loading: false, error: "" };
        });
      } catch (error) {
        if (generation.current === current) setState(previous => ({ ...previous, loading: false, error: error.message }));
      } finally { busy = false; }
    };
    refreshRef.current = refresh;
    void refresh();
    const onFocus = () => { if (document.visibilityState === "visible") void refresh(); };
    const timer = window.setInterval(onFocus, 30000);
    window.addEventListener("focus", onFocus);
    return () => {
      generation.current++;
      refreshRef.current = null;
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [client, enabled, userKey]);
  const saveCost = useCallback(async (id, change) => {
    if (!enabled) throw new Error("Open the administrator Charts tab to save costs.");
    const current = generation.current;
    const saved = await persist(id, change);
    if (generation.current === current) {
      versions.current[id] = (versions.current[id] || 0) + 1;
      setState(previous => generation.current !== current ? previous :
        ({ ...previous, costs: { ...previous.costs, [id]: saved.metadata } }));
    }
    return saved;
  }, [persist, enabled]);
  return {
    costs: state.key === userKey ? state.costs : {},
    loading: enabled && (state.key !== userKey || state.loading),
    error: state.key === userKey ? state.error : "",
    saveCost,
    reload: () => refreshRef.current?.(),
  };
}
