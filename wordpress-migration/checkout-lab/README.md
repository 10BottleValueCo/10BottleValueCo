# Synthetic WooCommerce checkout lab

**Disposable test only. Never install the test gateway on a live store.** This is a local integration experiment, not a payment gateway for customers, a Stripe integration, or a finished storefront checkout. The test gateway registers only if a purpose-built disposable flag, disabled outbound WordPress HTTP, disabled cron, the local WordPress environment, and localhost site URL all agree. It additionally refuses to process any order unless its email ends `@example.invalid` and every product name starts `Synthetic `. It never contacts a payment provider or calls `payment_complete`. The gateway returns a Woo API success response only to complete this controlled flow; the order remains pending and unpaid. That response is not evidence of a successful payment.

The test copies the entire sanitized WordPress site into a temporary folder, removes that copy's preview mu-plugins, loads only the lab gateway and a copy of the development warehouse-shipping plugin, and deletes the disposable folder when finished. It does not listen on a network port. The PHP WASM test runtime is separate from production, customer records, and real payment credentials. The sample product, shipping zone/rate, address and order are synthetic. WordPress outgoing HTTP and cron are disabled; `pre_wp_mail` is intercepted and logged; the fixture uses no other merchant integrations. These controls do not prove arbitrary third-party plugin hooks are safe.

Run against the existing local runtime and shipping plugin:

```sh
TBV_WP_TEST_RUNTIME=/path/to/wordpress-server-preview-2026-10-25 \
TBV_SHIPPING_PLUGIN=/path/to/tbv-warehouse-shipping.php node test.mjs
TBV_WP_TEST_RUNTIME=/path/to/wordpress-server-preview-2026-10-25 \
TBV_SHIPPING_PLUGIN=/path/to/tbv-warehouse-shipping.php TBV_TEST_GUARD=1 node test.mjs
```

The real WooCommerce Store API adds two synthetic physical items to a guest cart, verifies a second guest's cart is empty, rejects an invalid checkout nonce, applies the synthetic $3 warehouse rate to a $25 item subtotal, creates one pending unpaid order, persists its shipping-rule version, empties the first cart, and rejects replay on an empty cart. Checks establish that the order total is $28, the order has the original item quantity and shipping line, the product stock remains unchanged, and no payment-complete or stock-reduction hook and no mail attempt fired. A separate guard test confirms that the gateway and mail hook do not register when the disposable flag is absent. All values and the selected US destination are fixtures, not confirmed merchant prices, routes, stock or tax rules.

WordPress Playground here uses SQLite. WooCommerce's normal stock-reservation query contains MySQL-specific locking syntax that this SQLite adapter does not support; the fixture sets `woocommerce_hold_stock_minutes` to `0`. **Stock holds and contention must be tested on the eventual MySQL/MariaDB host.** This test does not exercise the React storefront UI, customer accounts, cards, Stripe, callbacks/webhooks, payment confirmation or settlement, real rates, coupons, taxes, coupons combined with shipping, refunds, address edge cases, arbitrary plugin hooks, fulfillment, or the final host. It also does not establish 1:1 visual or checkout behavior parity. No live deployment or production database change was made.
