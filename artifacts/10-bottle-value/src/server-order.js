// Database columns control financial state; browser drafts and metadata cannot
// turn an unconfirmed order into a paid order.
export function serverOrder(record) {
  if (!record || typeof record.id !== "string") return null;
  const meta = record.metadata && typeof record.metadata === "object" && !Array.isArray(record.metadata) ? record.metadata : {};
  const columnItems = Array.isArray(record.items) ? record.items : [];
  const metaItems = Array.isArray(meta.items) ? meta.items : [];
  return {
    ...meta,
    id: record.id,
    email: record.email || "",
    status: record.status || "pending",
    total: record.total ?? null,
    createdAt: record.created_at || meta.createdAt || "",
    paidAt: record.paid_at || "",
    paymentProvider: record.payment_provider || meta.paymentProvider || "",
    paymentId: record.payment_id || meta.paymentId || "",
    items: columnItems.length ? columnItems : metaItems,
  };
}

export function isConfirmedPaidOrder(order) {
  return order && ["paid", "done"].includes(String(order.status || "").toLowerCase());
}
