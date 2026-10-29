# tbv-storefront-admin: the live admin panel on WooCommerce

The staging storefront shows the live site's own admin panel (ORDERS, CHARTS, INBOX, PROMO, TOOLS, AFFILIATES, ANALYTICS, FUNNEL) to WooCommerce shop managers. The React panel is live's code. In WooCommerce mode each data function (`loadOrdersFromSupabase`, `persistOrderAdminFieldToSupabase`, `updateOrderItemsAdmin`, deletes, the tracking email, affiliates, payouts, promo codes and store credit) calls this plugin's REST API (`/wp-json/tbv-admin/v1`, `manage_woocommerce` only) instead of Supabase.

| Panel | WordPress source |
|---|---|
| Orders list | WooCommerce orders in live's admin order shape. Statuses: paid = processing, done = completed; "checkout" is pending plus a marker. Migrated orders show their INV- number |
| Status, tracking numbers, customer fields, payment provider/ID, invoice label, admin note, shipping type, totals | order fields and `_tbv_*` meta. A status change goes through WooCommerce, so commissions follow |
| Item edits | lines replaced with the matching catalog variation (name, dose, warehouse, 10-pack); WooCommerce recalculates while keeping fees, shipping and coupons |
| Delete | moves the order to the WooCommerce trash (recoverable) |
| Tracking email | `wp_mail` in production. Staging returns "mail is off, not sent" |
| Affiliates, payouts, issue/revoke | `tbv-affiliates-credit` |
| Public promo codes / one-time account codes | WooCommerce percent coupons (public marker / email restriction + one use) |
| Store credit lookup and adjust | `tbv-affiliates-credit` (existing accounts only) |
| Charts, Analytics | computed in the browser from the orders above, as on live |

Not connected yet:
- **Inbox:** live `contact_messages`, attachments and typing indicator.
- **Funnel:** live `analytics_events`.
- **Charts per-order cost overrides:** live `order_cost_overrides`.
- **Tools out-of-stock toggles:** live keeps these in browser storage; on WordPress they should become product stock status.
- **"+ Test order":** stays browser-local, as on live.

Tests (staging, 2026-10-29):
- E2E: the admin API refuses customers and guests.
- Browser QA:
  - logs in as the staging admin and opens the panel (no WordPress toolbar on the storefront);
  - finds a fresh WooCommerce order and changes its status (WooCommerce becomes completed);
  - saves a tracking number, with the "not sent on staging" message;
  - shows the Affiliates tab, creates/lists/deletes a promo coupon, looks up store credit, with no JS errors.
