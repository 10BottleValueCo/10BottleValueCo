# Storefront checkout rules (WooCommerce)

`tbv-storefront-rules` carries rules from the live storefront checkout into WooCommerce. Values live in the `tbv_storefront_rules` option (defaults in the plugin, each with source/status/version metadata), so they can change without code edits.

- Automatic discount: highest tier reached by the items subtotal (all warehouses) — 10% at $1,000, 15% at $2,000, 20% at $4,000 — added as a negative fee `Automatic discount (N%)`, rounded to the cent. Not combined with a coupon.
- Purchaser attestation: the three confirmations are required server-side at checkout and stored as `_tbv_purchaser_attestation` with the time.
- Carrier preference (FedEx/USPS/UPS), Mexico tax ID, and the order-bonus marker (worldwide subtotal ≥ $350) are stored as order meta and summarized in an order note.

Values were copied from the live storefront's code and display on 2026-10-28; confirm them before production use. Tested on the persistent staging site through `persistent-staging/scripts/e2e-staging.mjs` and `browser-qa.mjs`.
