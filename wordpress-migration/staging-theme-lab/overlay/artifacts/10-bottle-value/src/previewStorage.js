// This module is exclusive to the local review build. Never override global Storage.
export const PREVIEW_STORAGE_PREFIX = 'tbv-wordpress-preview-v1:';
export function createPreviewStorage(storage, prefix = PREVIEW_STORAGE_PREFIX) {
  const namespaced = (key) => prefix + String(key);
  return {
    getItem(key) { return storage.getItem(namespaced(key)); },
    setItem(key, value) { storage.setItem(namespaced(key), String(value)); },
    removeItem(key) { storage.removeItem(namespaced(key)); },
    clear() {
      const keys = [];
      for (let i = 0; i < storage.length; i++) { const key = storage.key(i); if (key?.startsWith(prefix)) keys.push(key); }
      for (const key of keys) storage.removeItem(key);
    },
    key(index) {
      const keys = [];
      for (let i = 0; i < storage.length; i++) { const key = storage.key(i); if (key?.startsWith(prefix)) keys.push(key.slice(prefix.length)); }
      return keys[index] ?? null;
    },
    get length() {
      let count = 0; for (let i = 0; i < storage.length; i++) if (storage.key(i)?.startsWith(prefix)) count++;
      return count;
    },
  };
}
function browserStorage(type) {
  try { if (typeof window !== 'undefined' && window[type]) return createPreviewStorage(window[type]); } catch { /* Private mode may deny access. */ }
  const values = new Map();
  return createPreviewStorage({
    get length() { return values.size; }, key(index) { return [...values.keys()][index] ?? null; },
    getItem(key) { return values.has(String(key)) ? values.get(String(key)) : null; },
    setItem(key, value) { values.set(String(key), String(value)); }, removeItem(key) { values.delete(String(key)); },
  });
}
export const tbvLocal = browserStorage('localStorage');
export const tbvSession = browserStorage('sessionStorage');
