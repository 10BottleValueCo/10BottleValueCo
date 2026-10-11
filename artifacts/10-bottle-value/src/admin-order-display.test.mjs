import assert from "node:assert/strict";
import test from "node:test";
import { getAdminInvoiceLabel } from "./admin-order-display.js";

test("shortens Paylio invoice labels to eight characters without changing stored IDs", () => {
  const order = {
    id: "INV-CAF25AEDC21438782CCF8430D9F8F",
    paymentProvider: "Paylio Card",
  };

  assert.equal(getAdminInvoiceLabel(order), "INV-CAF25AED");
  assert.equal(order.id, "INV-CAF25AEDC21438782CCF8430D9F8F");
});

test("shortens NOWPayments invoice labels without changing stored IDs", () => {
  const id = "INV-CAF25AEDC21438782CCF8430D9F8F";

  for (const paymentProvider of ["NOWPayments", "NOWPayments BTC"]) {
    const order = { id, paymentProvider };
    assert.equal(getAdminInvoiceLabel(order), "INV-CAF25AED");
    assert.equal(order.id, id);
  }
});

test("keeps full invoice IDs for other payment providers", () => {
  const id = "INV-CAF25AEDC21438782CCF8430D9F8F";

  assert.equal(getAdminInvoiceLabel({ id, paymentProvider: "Stripe" }), id);
});
