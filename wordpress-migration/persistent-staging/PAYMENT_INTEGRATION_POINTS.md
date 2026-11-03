# Payment integration points (for the payment team)

The staging site deliberately has **no** payment processor. These are the seams where an approved processor plugs in. Nothing here activates a live processor; that requires the merchant's account setup and the owner's authorization.

## 1. Gateway slot
- Staging registers the test gateway `tbv_staging_test` (plus `tbv_store_credit` for synthetic store credit) (`TBV_Staging_Test_Gateway` in `mu-plugins/tbv-persistent-staging.php`). Its `process_payment()` saves the order as `pending` and returns the order-received URL.
- The theme allowlists gateways by ID (`woocommerce_available_payment_gateways` at `PHP_INT_MAX` in `functions.php`). On staging that is `tbv_staging_test` + `tbv_store_credit`. On a production install (`deploy/install.sh`, `TBV_STORE_MODE='production'`) it is the IDs in `TBV_PRODUCTION_GATEWAYS` in `wp-config.php` + `tbv_store_credit`. The list starts empty: the cart then tells customers online payment is not available yet, and nothing else changes. Connecting a processor = install its gateway plugin, add its ID to `TBV_PRODUCTION_GATEWAYS`. `window.TBV_COMMERCE.gatewayId` is the first listed ID.
- Use a standard `WC_Payment_Gateway` (official processor plugin or a custom gateway). The storefront cart page (`/cart`) collects shipping details, then posts to the **classic** checkout (`?wc-ajax=checkout`) with `payment_method` set to the gateway ID from `window.TBV_COMMERCE.gatewayId`; the Store API checkout route is blocked by the theme. A processor that needs on-page fields or a hosted redirect plugs in at that step (today the live site shows its payment step after shipping details). A hosted payment page works when its host is returned by the `tbv_store_payment_redirect_hosts` filter (production only; the cart refuses other off-site redirects). If a processor requires block checkout, that block must be lifted deliberately.
- Production-only filters for the integration, all closed by default:
  - `tbv_store_allow_rest_route` (`$allow, $route, $method, $request`): open a REST route the processor needs (e.g. its webhook);
  - `tbv_store_allowed_wc_ajax` (array): extra `?wc-ajax=` actions;
  - `tbv_store_csp_sources` (`['script-src' => [...], 'frame-src' => [...], 'connect-src' => [...], 'form-action' => [...]]`): hosted-field origins added to the storefront CSP;
  - `tbv_store_payment_redirect_hosts` (array of hostnames, https only).
- Multiple payment methods (live offers card, Cash App/Lightning and crypto) need a method chooser on the cart page; today it submits one gateway. That UI is part of the payment work.

## 2. Order state contract
- Created by checkout: `pending` (unpaid). The processor confirms payment server-side (webhook or verified redirect) and then calls `$order->payment_complete($transaction_id)` → `processing`.
- Staging blocks this transition (`woocommerce_valid_order_statuses_for_payment_complete` → empty) and stock reduction; both live in the staging guard mu-plugin, which a production install does not include.
- Rehearsed 2026-10-29 on a fresh production install with WooCommerce's built-in Check payments gateway as a stand-in: order placed, `on-hold`, order-received page, customer "order received" and admin "new order" emails generated (`deploy/verify-production.mjs --gateway=cheque`, 49/49).
- Do not mark orders paid from the browser redirect alone; verify with the processor.

## 3. Callbacks / webhooks
- Staging returns 403 for every `?wc-api=` / `/wc-api/` request and for order-pay links. Production mode lets `?wc-api=` and order-pay through to WooCommerce (the gateway's own handler must verify signatures and be idempotent: repeat events must not double-complete or double-credit). REST webhooks need `tbv_store_allow_rest_route`.

## 4. Order metadata for reconciliation
- Keep processor identity, payment-attempt IDs, transaction IDs and fees in **internal** order meta for accounting and reconciliation. Customer-facing checkout, status pages, emails and receipts show customer-recognizable payment methods (owner requirement), not the routing processor name.
- Staging test orders carry `_tbv_staging_test_order=1` and `_tbv_payment_integration_point=pending_payment_team`.
- Every order carries `_tbv_storefront_rules_version`, and when given `_tbv_carrier_preference`, `_tbv_tax_id` (Mexico) and `_tbv_order_bonus`. The automatic discount is a negative fee line named `Automatic discount (N%)`.
- Shipping rates carry `tbv_rule_version` meta from the warehouse shipping plugin, so later rate edits do not rewrite historical orders.

## 5. Store credit and affiliates
- `../woo-affiliates-credit/` (plugin `tbv-affiliates-credit`) implements the live rules: 5% first-order referral discount, 10% commission on paid orders, holds, admin payouts, and store credit that pays only when it covers the whole order (gateway `tbv_store_credit`, no processor involved).
- Commissions are recorded when an order reaches `processing`/`completed` and withdrawn on `cancelled`/`refunded`/`failed`. The approved processor only has to complete payment normally (`payment_complete()`); no extra call is needed.
- Credit cannot be combined with a processor payment (same as live). If the business later wants partial credit, that is a new rule to design with the payment team.
- Historical balances and affiliate history are migrated separately (`../woo-legacy-migration/`), then `wp tbv-affiliates import-legacy` seeds the tables (tested on synthetic data).
- The store-credit gateway debits the signed-in account's own balance, never the billing email typed at checkout. On a production install a new account must confirm its email (link sent at sign-up) before credit or the affiliate panel applies; migrated accounts and shop managers count as confirmed.

## 6. Email
- Staging suppresses all mail. A production install sends WordPress/WooCommerce mail through PHP `wp_mail()`; it needs an SMTP/transactional provider configured on the server (or an SMTP plugin) with SPF/DKIM for the sending domain. Emails generated in the rehearsal: account created, email confirmation, order received, admin new order, tracking (admin panel).

## Open items for the payment team
- Processor choice, merchant account and contracted fees (use the merchant's agreement, not public prices).
- Webhook secret storage and rotation (server environment, never the repository).
- Refund flow: staging has no refund-capable gateway; admin-created refunds are record-only.
- Tax configuration (currently off on staging).
