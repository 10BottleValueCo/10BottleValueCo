import {
  normalizePackCount,
  normalizeWarehouse,
  resolveWarehouseOffer,
} from "../../../shared/warehouse-offer.js";
import { productSlug } from "./productNames.js";

const normalizedText = (value) => String(value ?? "").trim().toLowerCase();
const normalizedDose = (value) => normalizedText(value).replace(/(\d)\s+([a-z])/g, "$1$2");
const warehouseOf = (product) => product.warehouse !== undefined ? product.warehouse : product.fromWarehouse;

// URL identity is separate from an available offer. A missing warehouse/dose/pack
// must remain selected and unavailable instead of falling back to another item.
export function productSelectionFromProduct(product, warehouse = warehouseOf(product)) {
  return {
    name: product.name,
    dose: product.dose,
    noteLabel: product.noteLabel ?? "",
    warehouse: normalizeWarehouse(warehouse) ?? warehouse,
    vials: product.vials === undefined ? 10 : product.vials,
  };
}

function readPack(params) {
  if (!params.has("pack")) return 10;
  const value = params.get("pack");
  if (!/^[1-9]\d*$/.test(value)) return value;
  const number = Number(value);
  return normalizePackCount(number) === null ? value : number;
}

function pathSlug(pathname) {
  const value = String(pathname ?? "").replace(/^\/+|\/+$/g, "");
  try {
    return decodeURIComponent(value).toLowerCase().trim();
  } catch {
    return value.toLowerCase().trim();
  }
}

export function readProductSelection(catalog, location) {
  if (!Array.isArray(catalog)) return null;
  const params = new URLSearchParams(location?.search ?? "");
  const slug = pathSlug(location?.pathname) || normalizedText(params.get("product"));
  if (!slug) return null;
  const candidates = catalog.filter((product) =>
    slug === productSlug(product) || slug === productSlug(product, true));
  if (!candidates.length) return null;

  const rawWarehouse = params.has("warehouse") ? normalizedText(params.get("warehouse")) : undefined;
  const warehouse = normalizeWarehouse(rawWarehouse) ?? rawWarehouse;
  const option = params.get("option");
  const hasOption = option !== null && option !== "";
  const matchingOption = hasOption
    ? candidates.filter((product) => normalizedText(product.noteLabel) === normalizedText(option))
    : candidates;
  // Old ambiguous links retain their first matching catalog option. New links
  // include option, so changing warehouse cannot switch with/d to no/d.
  const product = matchingOption.find((item) => normalizeWarehouse(warehouseOf(item)) === warehouse)
    ?? matchingOption[0]
    ?? candidates[0];
  return {
    ...productSelectionFromProduct(product, warehouse),
    noteLabel: hasOption ? option : product.noteLabel ?? "",
    vials: readPack(params),
  };
}

export function productSelectionUrl(selection, currentSearch = "") {
  const params = new URLSearchParams(currentSearch);
  for (const key of ["product", "warehouse", "pack", "option"]) params.delete(key);
  const rawWarehouse = selection.warehouse;
  const warehouse = normalizeWarehouse(rawWarehouse);
  if (warehouse === "us" || warehouse === null) params.set("warehouse", String(rawWarehouse));
  const vials = selection.vials === undefined ? 10 : selection.vials;
  if (vials !== 10) params.set("pack", String(vials));
  if (selection.noteLabel) params.set("option", selection.noteLabel);
  const query = params.toString();
  return `/${productSlug(selection)}${query ? `?${query}` : ""}`;
}

// This is the existing selling-price rule, shared by catalog cards and PDPs.
// Retaining the base makes normalization idempotent even without usPriceBase
// on an incoming raw catalog offer. No supplier-cost rule is introduced here.
export function toStorefrontOffer(product) {
  if (!product) return null;
  const warehouse = normalizeWarehouse(warehouseOf(product));
  if (warehouse === "us") {
    const usPriceBase = product.usPriceBase ?? product.price;
    const price = usPriceBase + 5;
    return { ...product, usPriceBase, price, originalPrice: price, fromWarehouse: "us" };
  }
  const { fromWarehouse, ...worldwide } = product;
  return worldwide;
}

export function resolveSelectedProduct(catalog, selection) {
  if (!selection) return null;
  const offer = resolveWarehouseOffer(catalog, selection);
  if (offer) {
    const product = toStorefrontOffer(offer);
    return { ...product, ...(offer.outOfStock ? { unavailableReason: "stock" } : {}) };
  }

  const template = catalog.find((product) =>
    normalizedText(product.name) === normalizedText(selection.name)
    && normalizedDose(product.dose) === normalizedDose(selection.dose)
    && normalizedText(product.noteLabel) === normalizedText(selection.noteLabel)) ?? {};
  const { fromWarehouse, ...artwork } = template;
  const warehouse = normalizeWarehouse(selection.warehouse) ?? selection.warehouse;
  return {
    ...artwork,
    ...selection,
    warehouse,
    ...(warehouse === "us" ? { fromWarehouse: "us" } : {}),
    price: null,
    originalPrice: null,
    outOfStock: true,
    unavailableReason: "configuration",
    // Another warehouse's certificate or kit total is not this missing offer.
    coaImages: [],
    coaPdf: undefined,
    total: "",
  };
}
