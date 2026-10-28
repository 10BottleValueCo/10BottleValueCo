# Payment integration points (for the payment team)

The staging site deliberately has **no** payment processor. These are the seams where an approved processor plugs in. Nothing here activates a live processor; that requires the merchant's account setup and the owner's authorization.

## 1. Gateway slot
- Staging registers exactly one WooCommerce gateway, `tbv_staging_test` (`TBV_Staging_Test_Gateway` in `mu-plugins/tbv-persistent-staging.php`). Its `process_payment()` saves the order as `pending` and returns the order-received URL.
- The theme hard-allowlists gateways (`woocommerce_payment_gateways` and `woocommerce_available_payment_gateways` filters at `PHP_INT_MAX` in `functions.php`). An approved gateway ID must be added to that allowlist; any other gateway stays hidden. For production, replace the hardcoded staging ID with a configured allowlist.
- Use a standard `WC_Payment_Gateway` (official processor plugin or a custom gateway). The storefront cart page (`/cart`) collects shipping details and the purchaser attestation, then posts to the **classic** checkout (`?wc-ajax=checkout`) with `payment_method` set to the gateway ID from `window.TBV_COMMERCE.gatewayId`; the Store API checkout route is blocked by the theme. A processor that needs on-page fields or a hosted redirect plugs in at that step (today the live site shows its payment step after the attestation). If a processor requires block checkout, that block must be lifted deliberately.

## 2. Order state contract
- Created by checkout: `pending` (unpaid). The processor confirms payment server-side (webhook or verified redirect) and then calls `$order->payment_complete($transaction_id)` → `processing`.
- Staging blocks this transition (`woocommerce_valid_order_statuses_for_payment_complete` → empty) and stock reduction. Production must remove both staging filters.
- Do not mark orders paid from the browser redirect alone; verify with the processor.

## 3. Callbacks / webhooks
- Staging returns 403 for every `?wc-api=` / `/wc-api/` request and for order-pay links. Production should allow only the approved gateway's callback endpoint, with signature verification and idempotent handling (repeat events must not double-complete or double-credit).

## 4. Order metadata for reconciliation
- Keep processor identity, payment-attempt IDs, transaction IDs and fees in **internal** order meta for accounting and reconciliation. Customer-facing checkout, status pages, emails and receipts show customer-recognizable payment methods (owner requirement), not the routing processor name.
- Staging test orders carry `_tbv_staging_test_order=1` and `_tbv_payment_integration_point=pending_payment_team`.
- Every order carries `_tbv_purchaser_attestation` (JSON, with time), `_tbv_storefront_rules_version`, and when given `_tbv_carrier_preference`, `_tbv_tax_id` (Mexico) and `_tbv_order_bonus`. The automatic discount is a negative fee line named `Automatic discount (N%)`.
- Shipping rates carry `tbv_rule_version` meta from the warehouse shipping plugin, so later rate edits do not rewrite historical orders.

## 5. Store credit and affiliates
- Store-credit and affiliate history is being migrated into separate ledger records (see `../woo-legacy-migration/`), with balances reported but spending **not** activated. Applying credit to a payment (partial payment, fee line or coupon) needs an explicit design with the payment team; show credit guidance only when the customer has relevant available credit.

## 6. Email
- Staging suppresses all mail. Production needs a transactional mail provider and order/customer email templates reviewed before launch.

## Open items for the payment team
- Processor choice, merchant account and contracted fees (use the merchant's agreement, not public prices).
- Webhook secret storage and rotation (server environment, never the repository).
- Refund flow: staging has no refund-capable gateway; admin-created refunds are record-only.
- Tax configuration (currently off on staging).
