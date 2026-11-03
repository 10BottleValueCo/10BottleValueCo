#!/usr/bin/env bash
# Build the clean seed database for a new install from the tested staging DB:
# catalog, pages, media, WooCommerce settings and shipping only. Every order,
# account, session, message, analytics event, affiliate/credit row, coupon,
# log and transient is removed; URLs become a placeholder the installer replaces.
#
#   deploy/make-seed.sh <source-db> <out.sql>
# Needs local mariadb/mysql client access that can create a scratch database.
set -euo pipefail
src="${1:?source database}"; out="${2:?output .sql}"
[[ -e "$out" ]] && { echo "Refusing: $out exists" >&2; exit 1; }
scratch="tbv_seed_build_$$"
seed_origin="https://seed.tbv.invalid"
sql() { mariadb -N -B "$scratch" -e "$1"; }
cleanup() { mariadb -e "DROP DATABASE IF EXISTS \`$scratch\`"; }
trap cleanup EXIT
mariadb -e "CREATE DATABASE \`$scratch\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
mariadb-dump --single-transaction --skip-comments "$src" | mariadb "$scratch"

# Orders (HPOS and legacy), customers and everything that hangs off them.
for t in wc_orders wc_orders_meta wc_order_addresses wc_order_operational_data woocommerce_order_items woocommerce_order_itemmeta \
         wc_order_stats wc_order_product_lookup wc_order_tax_lookup wc_order_coupon_lookup wc_customer_lookup wc_reserved_stock \
         woocommerce_sessions woocommerce_downloadable_product_permissions wc_download_log woocommerce_payment_tokens woocommerce_payment_tokenmeta \
         woocommerce_api_keys wc_webhooks wc_rate_limits wc_product_download_directories woocommerce_log wc_admin_notes wc_admin_note_actions \
         wc_stock_notifications wc_stock_notificationmeta comments commentmeta actionscheduler_actions actionscheduler_logs actionscheduler_claims \
         users usermeta tbv_analytics_events tbv_contact_messages tbv_ac_affiliates tbv_ac_customers tbv_ac_commissions tbv_ac_payouts \
         tbv_ac_credit_balances tbv_ac_credit_ledger; do
  if [[ -n "$(sql "SHOW TABLES LIKE 'wp_$t'")" ]]; then sql "TRUNCATE TABLE wp_$t"; fi
done
# Posts: keep products, variations, media and the storefront pages.
sql "DELETE FROM wp_posts WHERE post_type NOT IN ('product','product_variation','attachment','page','nav_menu_item','wp_global_styles') OR post_status IN ('trash','auto-draft') OR post_name IN ('sample-page','refund_returns')"
sql "DELETE pm FROM wp_postmeta pm LEFT JOIN wp_posts p ON p.ID = pm.post_id WHERE p.ID IS NULL"
sql "DELETE tr FROM wp_term_relationships tr LEFT JOIN wp_posts p ON p.ID = tr.object_id WHERE p.ID IS NULL"
sql "UPDATE wp_posts SET post_author = 0"
# Synthetic sales counts and staging edit locks.
sql "UPDATE wp_postmeta SET meta_value = '0' WHERE meta_key = 'total_sales'"
sql "UPDATE wp_wc_product_meta_lookup SET total_sales = 0"
sql "DELETE FROM wp_postmeta WHERE meta_key IN ('_edit_lock','_edit_last')"
# Options: transients, staging leftovers and anything identifying the old host.
sql "DELETE FROM wp_options WHERE option_name LIKE '\\_transient\\_%' OR option_name LIKE '\\_site\\_transient\\_%' OR option_name LIKE 'wc\\_session\\_%'"
sql "DELETE FROM wp_options WHERE option_name IN ('tbv_preview_environment','tbv_preview_import_report','tbv_preview_ambiguous_legacy_routes','tbv_proposed_legal_entity','tbv_affiliate_codes','recovery_keys','recently_activated','woocommerce_tbv_staging_test_settings','auto_core_update_notified','admin_email_lifespan','new_admin_email')"
sql "UPDATE wp_options SET option_value = 'admin@seed.tbv.invalid' WHERE option_name IN ('admin_email','woocommerce_email_from_address','woocommerce_stock_email_recipient')"
old_origin="$(sql "SELECT option_value FROM wp_options WHERE option_name = 'siteurl'")"
sql "UPDATE wp_options SET option_value = '$seed_origin' WHERE option_name IN ('siteurl','home')"
# Absolute links in content and metadata (e.g. media GUIDs) use the placeholder origin.
for origin in "$old_origin" http://127.0.0.1:8088 https://violet-dormitory-ground.ngrok-free.dev; do
  sql "UPDATE wp_posts SET guid = REPLACE(guid, '$origin', '$seed_origin'), post_content = REPLACE(post_content, '$origin', '$seed_origin')"
done
remaining="$(sql "SELECT (SELECT COUNT(*) FROM wp_users) + (SELECT COUNT(*) FROM wp_usermeta) + (SELECT COUNT(*) FROM wp_wc_orders) + (SELECT COUNT(*) FROM wp_posts WHERE post_type LIKE 'shop\_%') + (SELECT COUNT(*) FROM wp_comments) + (SELECT COUNT(*) FROM wp_tbv_contact_messages) + (SELECT COUNT(*) FROM wp_tbv_analytics_events) + (SELECT COUNT(*) FROM wp_tbv_ac_credit_balances) + (SELECT COUNT(*) FROM wp_tbv_ac_affiliates) + (SELECT COUNT(*) FROM wp_woocommerce_sessions)")"
[[ "$remaining" == 0 ]] || { echo "Seed still holds $remaining customer, order, message or session rows" >&2; exit 1; }
mariadb-dump --single-transaction --skip-comments --skip-dump-date "$scratch" > "$out.partial"
leaks="$(grep -o -E '127\.0\.0\.1:(8088|9400)|ngrok-free[a-z.-]*|[A-Za-z0-9._%+-]+@example\.test' "$out.partial" | sort | uniq -c || true)"
if [[ -n "$leaks" ]]; then
  echo "$leaks" | head -20
  echo "Seed still references the staging host or test accounts (above); see $out.partial" >&2; exit 1
fi
mv "$out.partial" "$out"
echo "{\"seed\":\"$out\",\"products\":$(sql "SELECT COUNT(*) FROM wp_posts WHERE post_type='product'"),\"variations\":$(sql "SELECT COUNT(*) FROM wp_posts WHERE post_type='product_variation'"),\"pages\":$(sql "SELECT COUNT(*) FROM wp_posts WHERE post_type='page'"),\"sha256\":\"$(shasum -a 256 "$out" | cut -d' ' -f1)\"}"
