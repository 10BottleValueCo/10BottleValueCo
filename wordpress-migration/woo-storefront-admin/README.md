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
| Tools out-of-stock switches | WooCommerce stock status of that variation, shared by everyone (live keeps these in one browser) |
| Charts, Analytics | computed in the browser from the orders above, as on live |
| Charts per-order supplier costs | order meta `_tbv_line_cost_overrides` / `_tbv_supplier_shipping_override` through `tbv-admin/v1/order-costs`, with live's validation (0–1,000,000, two decimals). The live hook is reused (`use-admin-order-costs.js` overlay) |
| Funnel | live's anonymous storefront events (random browser session id; no IP, account or email stored) posted to `POST /wp-json/tbv-analytics/v1/events`: live's nine event types only, 300 per session and 1,200 per visitor address per 10 minutes, admins not counted, kept 90 days. The tab reads `GET tbv-admin/v1/analytics?days=1|7|30|90` |
| Inbox and the customer's support chat (Contact → New message) | table `wp_tbv_contact_messages` with live's columns. The app's `contact_messages` queries go to `POST /wp-json/tbv-messages/v1/query`: visitors can only send (under their account email when signed in); a customer reads only their own thread and can only mark replies read; shop managers read, reply, edit and delete. Contact sends are limited per 10 minutes to 10 per visitor address (the tunnel's last X-Forwarded-For entry) or 30 per signed-in account |

Not connected yet:
- **Inbox attachments:** live uploads to signed storage URLs; not on WordPress yet.
- **Typing indicator:** live uses Supabase Realtime; it is a no-op here.
- **"+ Test order":** stays browser-local, as on live.

Tests (staging, 2026-10-29):
- E2E: the admin API refuses customers and guests.
- Browser QA:
  - logs in as the staging admin and opens the panel (no WordPress toolbar on the storefront);
  - finds a fresh WooCommerce order and changes its status (WooCommerce becomes completed);
  - saves a tracking number, with the "not sent on staging" message;
  - shows the Affiliates tab, creates/lists/deletes a promo coupon, looks up store credit, with no JS errors;
  - support chat: a customer writes from Contact, the admin sees it in Inbox and replies, and the customer sees the reply.
- E2E: funnel events are validated, and reading them is admin-only.
- Browser QA: storefront page views and add-to-cart reach the Funnel tab; the stock switch sets and clears WooCommerce stock status; a chart line cost saves and reloads.
- E2E: guests can send but not read; a customer's message uses the account email; customers read only their own thread and cannot write replies.
