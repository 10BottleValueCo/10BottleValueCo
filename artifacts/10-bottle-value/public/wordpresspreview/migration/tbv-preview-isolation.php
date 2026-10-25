<?php
/**
 * Plugin Name: 10BottleValue isolated migration preview
 * Description: Preview-only isolation. Never install this file on the production store.
 */
defined('ABSPATH') || exit;
define('TBV_MIGRATION_PREVIEW', true);
if (!defined('DISABLE_WP_CRON')) define('DISABLE_WP_CRON', true);
if (!defined('AUTOMATIC_UPDATER_DISABLED')) define('AUTOMATIC_UPDATER_DISABLED', true);

// This demo has no connection to a merchant, customer mailbox, or payment provider.
add_filter('pre_wp_mail', '__return_true', PHP_INT_MAX);
add_filter('woocommerce_payment_gateways', '__return_empty_array', PHP_INT_MAX);
add_filter('woocommerce_available_payment_gateways', '__return_empty_array', PHP_INT_MAX);
add_filter('woocommerce_valid_order_statuses_for_payment', '__return_empty_array', PHP_INT_MAX);
add_action('woocommerce_checkout_process', function () {
    wc_add_notice('Review preview: payments and order submission are disabled.', 'error');
});
add_action('woocommerce_before_pay_action', function () {
    wp_die('Payments are disabled in this review preview.', 'Review preview', ['response' => 403]);
});
add_filter('rest_pre_dispatch', function ($result, $server, $request) {
    if (preg_match('#^/wc/store/v\d+/checkout(?:/|$)#', $request->get_route()) && !in_array($request->get_method(), ['GET', 'HEAD', 'OPTIONS'], true)) {
        return new WP_Error('tbv_preview_checkout_disabled', 'Order submission is disabled in this review preview.', ['status' => 403]);
    }
    return $result;
}, PHP_INT_MAX, 3);
add_action('woocommerce_before_checkout_form', function () {
    wc_print_notice('Review preview: explore the checkout form. No payment or real order can be submitted. Shipping and tax calculations are awaiting the confirmed setup.', 'notice');
});
add_filter('wp_robots', function ($robots) { $robots['noindex'] = true; $robots['nofollow'] = true; return $robots; });
add_filter('blog_public', '__return_zero');
add_filter('woocommerce_allow_tracking', '__return_false');
add_filter('show_admin_bar', '__return_false');

// Preserve old offer links in the isolated preview. The map is generated from the
// source catalog; it does not rewrite historical orders or provider item IDs.
add_action('template_redirect', function () {
    if (!is_404()) return;
    $path = trim((string) wp_parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH), '/');
    $map = get_option('tbv_preview_legacy_routes', []);
    if (!isset($map[$path])) return;
    $target = $map[$path];
    $url = get_permalink((int) $target['productId']);
    if (!$url) return;
    $query = ['attribute_dosage' => $target['dose'], 'attribute_pack-size' => (string) $target['packCount'], 'warehouse' => $target['warehouse'], 'attribute_warehouse' => $target['warehouse']];
    if (!empty($target['formulation'])) $query['attribute_formulation'] = $target['formulation'];
    wp_safe_redirect(add_query_arg($query, $url), 302);
    exit;
});
