// Display/reference only. Never use this label for payment binding or lookup.
export function formatInvoiceLabel(value) {
  const id = String(value || "").trim();
  const canonical = /^INV-([A-F0-9]{32})$/i.exec(id);
  return canonical ? `INV-${canonical[1].slice(0, 8).toUpperCase()}` : id;
}
