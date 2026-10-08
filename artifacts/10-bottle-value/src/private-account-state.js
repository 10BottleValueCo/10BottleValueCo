// Sensitive operational data stays in tab memory, never browser storage.
export const LEGACY_PRIVATE_KEYS = [
  "tbv-orders", "tbv-affiliates", "tbv-aff-paid", "tbv_guest_email",
  "tbv_read_thread_ts", "tbv-deleted-order-ids", "tbv-admin-inbox-seen",
  "tbv-applied-promo",
];

export function purgeLegacyPrivateState(storage) {
  if (!storage) return;
  for (const key of LEGACY_PRIVATE_KEYS) {
    try { storage.removeItem(key); } catch { /* Storage can be denied. */ }
  }
}

export function createPrivateAccountState() {
  let owner = "";
  let generation = 0;
  const values = new Map();
  return {
    getItem(key) { return values.get(key) ?? null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); },
    clear() { values.clear(); generation += 1; },
    switchAccount(nextOwner = "") {
      const normalized = String(nextOwner).trim().toLowerCase();
      if (normalized === owner) return false;
      owner = normalized;
      this.clear();
      return true;
    },
    capture() { return generation; },
    isCurrent(snapshot) { return snapshot === generation; },
  };
}

export const privateAccountState = createPrivateAccountState();
if (typeof window !== "undefined") {
  try { purgeLegacyPrivateState(window.localStorage); } catch { /* Storage can be denied. */ }
}
