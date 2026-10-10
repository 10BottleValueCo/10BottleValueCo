import { fromCents, lineAmountCents, addAmounts } from "../shared/checkout-money.js";
import { normalizePackCount, resolveWarehouseOffer } from "../shared/warehouse-offer.js";

// Server-side price and stock snapshot. Keep this aligned with PRODUCTS_BASE
// in artifacts/10-bottle-value/src/App.jsx; catalog-sync.test.mjs enforces it.
// Tuples: name, dose, worldwide price, US base price, warehouse, note label, out of stock.
const PRODUCT_ROWS = [
  ["BPC-157","10 mg",139,null,"","",false],
  ["BPC-157","10 mg",179,174,"us","",false],
  ["BPC-157","5 mg",79,null,"","",false],
  ["TB-500","10 mg",219,null,"","",false],
  ["TB-500","5 mg",149,null,"","",false],
  ["TB-500 + BPC-157","10 mg",169,null,"","",false],
  ["TB-500 + BPC-157","10 mg",169,204,"us","",false],
  ["TB-500 + BPC-157","20 mg",299,null,"","",false],
  ["TB-500 + BPC-157","20 mg",299,314,"us","",true],
  ["Ipamorelin","10 mg",159,null,"","",false],
  ["Tirzepatide / GLP-2","5 mg",79,null,"","",false],
  ["Tirzepatide / GLP-2","10 mg",99,null,"","",false],
  ["Tirzepatide / GLP-2","10 mg",99,144,"us","",false],
  ["Tirzepatide / GLP-2","15 mg",129,null,"","",false],
  ["Tirzepatide / GLP-2","20 mg",149,null,"","",false],
  ["Tirzepatide / GLP-2","30 mg",189,null,"","",false],
  ["Tirzepatide / GLP-2","60 mg",339,null,"","",false],
  ["Sermorelin","10 mg",239,null,"","",true],
  ["Sermorelin","5 mg",139,null,"","",true],
  ["Tesamorelin","5 mg",219,null,"","",false],
  ["Tesamorelin","10 mg",339,null,"","",false],
  ["Tesamorelin","10 mg",339,334,"us","",false],
  ["IGF-1 LR3","1 mg",375,null,"","",false],
  ["IGF-1 LR3","0.1 mg",79,null,"","",false],
  ["Retatrutide / GLP-3","5 mg",109,null,"","",false],
  ["Retatrutide / GLP-3","5 mg",109,154,"us","",true],
  ["Retatrutide / GLP-3","10 mg",159,null,"","",false],
  ["Retatrutide / GLP-3","10 mg",159,194,"us","",false],
  ["Retatrutide / GLP-3","15 mg",209,null,"","",false],
  ["Retatrutide / GLP-3","20 mg",259,null,"","",false],
  ["Retatrutide / GLP-3","30 mg",339,null,"","",false],
  ["Retatrutide / GLP-3","20 mg",259,280,"us","",false],
  ["Retatrutide / GLP-3","30 mg",339,364,"us","",false],
  ["Retatrutide / GLP-3","40 mg",419,null,"","",false],
  ["Retatrutide / GLP-3","40 mg",419,444,"us","",true],
  ["Retatrutide / GLP-3","50 mg",509,null,"","",false],
  ["Retatrutide / GLP-3","50 mg",509,514,"us","",true],
  ["Retatrutide / GLP-3","60 mg",579,null,"","",false],
  ["Retatrutide / GLP-3","60 mg",579,544,"us","",true],
  ["Eloralintide","5 mg",329,null,"","",true],
  ["Eloralintide","10 mg",469,null,"","",true],
  ["Mazdutide","10 mg",389,null,"","",false],
  ["Tirzepatide / GLP-2","30 mg",189,224,"us","",false],
  ["Tirzepatide / GLP-2","40 mg",229,null,"","",false],
  ["Tirzepatide / GLP-2","40 mg",229,260,"us","",true],
  ["Tirzepatide / GLP-2","50 mg",289,null,"","",false],
  ["Tirzepatide / GLP-2","60 mg",339,344,"us","",false],
  ["Semax","10 mg",109,null,"","",false],
  ["Semax","10 mg",99,144,"us","",true],
  ["Semax","5 mg",79,null,"","",false],
  ["Selank","5 mg",79,null,"","",false],
  ["Selank","10 mg",109,null,"","",false],
  ["Selank","10 mg",99,144,"us","",false],
  ["DSIP","15 mg",169,null,"","",false],
  ["DSIP","5 mg",89,null,"","",false],
  ["DSIP","10 mg",175,170,"us","",false],
  ["GHK-CU","100 mg",109,null,"","",false],
  ["GHK-CU","50 mg",89,null,"","",false],
  ["GHK-CU","50 mg",89,114,"us","",false],
  ["GHK-CU","100 mg",155,150,"us","",false],
  ["Glutathione","600 mg",139,null,"","",false],
  ["Glutathione","1500 mg",179,null,"","",false],
  ["NAD+","1000 mg",259,null,"","",false],
  ["NAD+","500 mg",159,null,"","",false],
  ["NAD+","500 mg",159,194,"us","",false],
  ["SS-31","50 mg",569,null,"","",false],
  ["SS-31","10 mg",169,null,"","",false],
  ["SS-31","10 mg",209,204,"us","",false],
  ["KPV","10 mg",119,null,"","",false],
  ["KPV","10 mg",119,164,"us","",true],
  ["MOTS-C","40 mg",369,null,"","",false],
  ["MOTS-C","40 mg",369,364,"us","",true],
  ["MOTS-C","10 mg",129,null,"","",false],
  ["MOTS-C","10 mg",129,174,"us","",false],
  ["Thymosin Alpha-1","10 mg",289,null,"","",false],
  ["Melanotan-2","10 mg",89,null,"","",false],
  ["SNAP-8","10 mg",79,null,"","",false],
  ["KLOW80","80 mg",379,null,"","",false],
  ["KLOW80","80 mg",389,384,"us","",true],
  ["BAC Water","10 ml",29,null,"","",true],
  ["BAC Water","3 ml",19,null,"","",false],
  ["Semaglutide","5 mg",69,null,"","",false],
  ["Semaglutide","10 mg",89,null,"","",false],
  ["Semaglutide","15 mg",119,null,"","",false],
  ["Semaglutide","20 mg",139,null,"","",false],
  ["Semaglutide","30 mg",179,null,"","",false],
  ["PT-141","10 mg",119,null,"","",false],
  ["Cagrilintide","5 mg",209,null,"","",true],
  ["Cagrilintide","10 mg",369,null,"","",true],
  ["Cagrilintide + Semaglutide","10 mg each",379,null,"","",true],
  ["CJC-1295","5 mg",319,null,"","with/d",false],
  ["CJC-1295","5 mg",169,null,"","no/d",false],
  ["CJC-1295","10 mg",299,null,"","no/d",false],
  ["CJC-1295 + Ipamorelin","10 mg each",189,null,"","no/d",false],
  ["CJC-1295 + Ipamorelin","10 mg each",239,234,"us","no/d",false],
  ["Survodutide","10 mg",539,null,"","",false],
  ["AHK-CU","100 mg",89,null,"","",false],
  ["Ipamorelin","5 mg",89,null,"","",false],
  ["Ipamorelin","5 mg",89,140,"us","",true],
  ["AOD","5 mg",209,null,"","",false],
  ["AOD","5 mg",209,244,"us","",true],
  ["IGF-DES","2 mg",109,null,"","",true],
  ["GHRP-2","5 mg",89,null,"","",false],
  ["GHRP-2","10 mg",139,null,"","",false],
  ["GHRP-6","5 mg",139,null,"","",false],
  ["GHRP-6","10 mg",187,null,"","",false],
  ["10-GH","10 IU",109,null,"","",false],
  ["10-GH","15 IU",159,null,"","",true],
  ["10-GH","24 IU",259,null,"","",true],
  ["10-GH","36 IU",359,null,"","",true],
  ["HCG","5000 iu",169,null,"","",false],
  ["HCG","5000 iu",169,204,"us","",false],
  ["HCG","10000 iu",319,null,"","",false],
  ["HCG","10000 iu",335,330,"us","",false],
  ["HMG","75 iu",119,null,"","",false],
  ["Oxytocin","2 mg",49,null,"","",false],
  ["Epitalon","10 mg",95,null,"","",false],
  ["Epitalon","10 mg",95,144,"us","",false],
  ["Epitalon","50 mg",299,null,"","",false],
  ["Cartalax","20 mg",199,null,"","",false],
  ["AICAR","50 mg",123,null,"","",false],
  ["ARA290 (Cibinetide)","10 mg",159,null,"","",false],
  ["Adipotide","2 mg",139,null,"","",false],
  ["Adipotide","5 mg",299,null,"","",false],
  ["KissPeptin-10","5 mg",99,null,"","",false],
  ["KissPeptin-10","10 mg",169,null,"","",false],
  ["Thymosin Alpha-1","5 mg",159,null,"","",false],
  ["LL37","5 mg",189,null,"","",false],
  ["Melatonin","10 mg",109,null,"","",false],
  ["NAD+","100 mg",79,null,"","",false],
  ["5-Amino-1MQ","5 mg",89,null,"","",false],
  ["5-Amino-1MQ","5 mg",89,140,"us","",true],
  ["5-Amino-1MQ","50 mg",219,null,"","",false],
  ["Lipo-C (with B12)","10 ml",149,null,"","",false],
  ["L-Carnitine (600mg/ml)","10 ml",159,null,"","",false],
  ["Pinealon","5 mg",109,null,"","",true],
  ["Pinealon","10 mg",139,null,"","",false],
  ["Pinealon","20 mg",199,null,"","",false],
  ["Lemon Bottle","10 ml",199,null,"","",false],
  ["SLU-PP-332","5 mg",199,null,"","",false],
  ["Triptorelin","2 mg",99,null,"","",false],
  ["PEG-MGF","2 mg",159,null,"","",false],
  ["MGF","2 mg",99,null,"","",false],
  ["GDF-8","1 mg",339,null,"","",false],
  ["FOXO4-DRI","10 mg",559,null,"","",false],
  ["VIP","5 mg",165,null,"","",false],
  ["VIP","10 mg",329,null,"","",false],
  ["ACE-031","1 mg",379,null,"","",false],
  ["Gonadorelin","2 mg",65,null,"","",false],
  ["Hexarelin Acetate","2 mg",119,null,"","",false],
  ["Hexarelin Acetate","5 mg",219,null,"","",false],
  ["PNC-27","5 mg",239,null,"","",false],
  ["PNC-27","10 mg",399,null,"","",false],
];

export const PRODUCTS = PRODUCT_ROWS.map(
  ([name, dose, price, usPriceBase, warehouse, noteLabel, outOfStock]) => ({
    name,
    dose,
    price,
    ...(usPriceBase !== null ? { usPriceBase } : {}),
    ...(warehouse ? { warehouse } : {}),
    ...(noteLabel ? { noteLabel } : {}),
    ...(outOfStock ? { outOfStock: true } : {}),
  }),
);

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function namesMatch(catalogName, clientName) {
  const catalog = normalize(catalogName);
  const client = normalize(clientName);
  return catalog === client || catalog.split(" / ")[0].trim() === client;
}

export function findCatalogProduct({
  name,
  dose,
  noteLabel,
  fromWarehouse,
  vials,
}) {
  if (fromWarehouse !== undefined && fromWarehouse !== "" && fromWarehouse !== "us") return null;
  const matches = PRODUCTS.filter(product => namesMatch(product.name, name));
  return resolveWarehouseOffer(matches, {
    name: matches[0]?.name ?? name,
    dose,
    noteLabel,
    warehouse: fromWarehouse,
    vials,
  });
}

export function getUnitPrice(product, fromWarehouse) {
  return fromWarehouse === "us"
    ? (product.usPriceBase ?? product.price) + 5
    : product.price;
}

export function getShippingPrice(subtotal, type) {
  if (type === "express") {
    if (subtotal >= 550) return 0;
    if (subtotal >= 300) return 19.99;
    return 99.99;
  }
  if (subtotal >= 300) return 0;
  if (subtotal >= 100) return 39.99;
  return 59.99;
}

export function getAutomaticDiscountRate(subtotal) {
  if (subtotal >= 4000) return 0.2;
  if (subtotal >= 2000) return 0.15;
  if (subtotal >= 1000) return 0.1;
  return 0;
}

export function validateAndPriceItems(items) {
  if (!Array.isArray(items) || items.length === 0 || items.length > 100) {
    throw new Error("Cart is empty or invalid.");
  }

  const pricedItems = [];
  let regularSubtotal = 0;
  let usSubtotal = 0;

  for (const rawItem of items) {
    const quantity = Number(rawItem?.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 50) {
      throw new Error("Invalid item quantity.");
    }
    if (rawItem?.fromWarehouse !== undefined && rawItem.fromWarehouse !== "" && rawItem.fromWarehouse !== "us") {
      throw new Error("Invalid product warehouse.");
    }
    if (normalizePackCount(rawItem?.vials) === null) {
      throw new Error("Invalid product pack size.");
    }

    const fromWarehouse = rawItem?.fromWarehouse === "us" ? "us" : undefined;
    const product = findCatalogProduct({
      name: rawItem?.name,
      dose: rawItem?.dose,
      noteLabel: rawItem?.noteLabel,
      fromWarehouse,
      vials: rawItem?.vials,
    });
    if (!product) throw new Error("An item in this cart is no longer available.");
    if (product.outOfStock) {
      throw new Error(`${product.name} ${product.dose} is out of stock.`);
    }

    const unitPrice = getUnitPrice(product, fromWarehouse);
    const lineTotal = fromCents(lineAmountCents(unitPrice, quantity));
    if (fromWarehouse === "us") usSubtotal = addAmounts(usSubtotal, lineTotal);
    else regularSubtotal = addAmounts(regularSubtotal, lineTotal);

    // Current offers are ten-vial packs. Validate that selector above but keep
    // the established snapshot shape so open payment resumes remain unchanged.
    pricedItems.push({
      name: product.name,
      dose: product.dose,
      quantity,
      price: unitPrice,
      ...(product.noteLabel ? { noteLabel: product.noteLabel } : {}),
      ...(fromWarehouse ? { fromWarehouse } : {}),
    });
  }

  regularSubtotal = Math.round(regularSubtotal * 100) / 100;
  usSubtotal = Math.round(usSubtotal * 100) / 100;
  const subtotal = Math.round((regularSubtotal + usSubtotal) * 100) / 100;
  return { pricedItems, subtotal, regularSubtotal, usSubtotal };
}
