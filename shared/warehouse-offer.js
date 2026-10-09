// Catalog identity only. Prices, stock policy and shipping remain with callers.
export function normalizeWarehouse(value) {
  if (value === undefined || value === "" || value === "worldwide") return "worldwide";
  return value === "us" ? "us" : null;
}

export function normalizePackCount(value) {
  if (value === undefined) return 10;
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0 ? value : null;
}

const text = value => typeof value === "string" ? value.trim().toLowerCase() : "";
const doseKey = value => text(value).replace(/(\d)\s+([a-z])/g, "$1$2");
const warehouseOf = value => value.warehouse !== undefined ? value.warehouse : value.fromWarehouse;

export function resolveWarehouseOffer(catalog, selection) {
  if (!Array.isArray(catalog) || !selection || typeof selection !== "object") return null;
  const name = text(selection.name);
  const dose = doseKey(selection.dose);
  const warehouse = normalizeWarehouse(warehouseOf(selection));
  const vials = normalizePackCount(selection.vials);
  if (!name || !dose || warehouse === null || vials === null) return null;

  return catalog.find(product => product &&
    text(product.name) === name &&
    doseKey(product.dose) === dose &&
    text(product.noteLabel) === text(selection.noteLabel) &&
    normalizeWarehouse(warehouseOf(product)) === warehouse &&
    normalizePackCount(product.vials) === vials
  ) || null;
}
