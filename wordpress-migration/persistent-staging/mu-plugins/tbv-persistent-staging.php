<?php
/**
 * Plugin Name: 10BottleValue persistent staging guard
 * Description: STAGING ONLY. Synthetic data, test accounts and a no-payment test checkout. Never install on production.
 */
defined('ABSPATH') || exit;

// Refuse to do anything unless the install explicitly opted into staging.
if (!defined('TBV_STAGING_COMMERCE_TEST') || TBV_STAGING_COMMERCE_TEST !== true
    || !function_exists('wp_get_environment_type') || wp_get_environment_type() !== 'staging') {
    return;
}

define('TBV_MIGRATION_PREVIEW', true);
define('TBV_STAGING_TEST_GATEWAY_ID', 'tbv_staging_test');

/* ---------- No payment-provider callbacks or order-pay links on staging. ---------- */
add_action('init', function () {
    if (isset($_GET['wc-api']) || isset($_GET['order-pay']) || preg_match('#/wc-api/#', (string)($_SERVER['REQUEST_URI'] ?? ''))) {
        wp_die('Payment callbacks are disabled on this staging site.', 'Staging', ['response' => 403]);
    }
}, 0);

/* ---------- No outgoing mail, ever. Log the attempt without the message body. ---------- */
add_filter('pre_wp_mail', function ($return, $atts) {
    $to = is_array($atts['to'] ?? null) ? implode(',', $atts['to']) : (string)($atts['to'] ?? '');
    error_log('[tbv-staging] suppressed email to=' . substr($to, 0, 120) . ' subject=' . substr((string)($atts['subject'] ?? ''), 0, 120));
    return false;
}, PHP_INT_MAX, 2);

/* ---------- Visible staging banner on every storefront page. ---------- */
add_action('wp_head', function () {
    echo '<style>.tbv-wp-preview-banner{position:relative;z-index:2147483647;padding:6px 10px;background:#ffe486;color:#111;display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:4px 12px;font:600 11px/1.4 Arial,sans-serif;text-align:center}.tbv-wp-preview-banner small{font-size:10px;font-weight:400;color:#222}</style>';
}, 99);
add_action('wp_body_open', function () {
    echo '<div class="tbv-wp-preview-banner" role="note"><span>WordPress preview — staging</span><small>Test data only · No real orders, payments, shipping or emails</small></div>';
}, 0);

/* ---------- Search engines and tracking off. ---------- */
add_filter('wp_robots', function ($robots) { $robots['noindex'] = true; $robots['nofollow'] = true; return $robots; });
add_filter('pre_option_blog_public', function () { return '0'; });
add_filter('woocommerce_allow_tracking', '__return_false');
add_filter('woocommerce_coupons_enabled', '__return_false');
add_filter('show_admin_bar', function ($show) { return $show && current_user_can('manage_options'); });
add_action('send_headers', function () { header('X-Robots-Tag: noindex, nofollow'); });

/* ---------- Test checkout: one offline gateway that never takes money. ----------
 * Orders stay "pending payment" (no stock reduction, no payment-complete hooks,
 * no fulfillment, no customer/admin notification emails) and are marked as
 * synthetic. This is the integration point the payment team replaces. */
add_action('plugins_loaded', function () {
    if (!class_exists('WC_Payment_Gateway')) return;
    class TBV_Staging_Test_Gateway extends WC_Payment_Gateway {
        public function __construct() {
            $this->id = TBV_STAGING_TEST_GATEWAY_ID;
            $this->method_title = 'Staging test order (no payment)';
            $this->method_description = 'Staging only. Creates an unpaid test order. No processor, no charge.';
            $this->title = 'Test order — no payment (staging)';
            $this->description = 'This is a staging site. Your order is saved as an unpaid test order. No card is charged and nothing ships.';
            $this->has_fields = false;
            $this->supports = ['products'];
            $this->enabled = 'yes';
        }
        public function is_available() { return true; }
        public function process_payment($order_id) {
            $order = wc_get_order($order_id);
            if (!$order) return ['result' => 'failure'];
            $order->update_meta_data('_tbv_staging_test_order', '1');
            $order->update_meta_data('_tbv_payment_integration_point', 'pending_payment_team');
            $order->set_status('pending', 'Staging test order: no payment taken, not for fulfillment.');
            $order->save();
            WC()->cart->empty_cart();
            return ['result' => 'success', 'redirect' => $this->get_return_url($order)];
        }
    }
}, 11);
add_filter('woocommerce_payment_gateways', function ($gateways) {
    return class_exists('TBV_Staging_Test_Gateway') ? ['TBV_Staging_Test_Gateway'] : [];
}, PHP_INT_MAX - 1);
// Belt and braces: no automatic transition can mark a staging order paid.
// Orders must still "need payment" so checkout routes them through the test
// gateway above; order-pay links are blocked at init and hidden in My Account.
add_filter('woocommerce_valid_order_statuses_for_payment_complete', '__return_empty_array', PHP_INT_MAX);
add_filter('woocommerce_can_reduce_order_stock', '__return_false', PHP_INT_MAX);
add_filter('woocommerce_my_account_my_orders_actions', function ($actions) { unset($actions['pay']); return $actions; }, PHP_INT_MAX);
add_action('woocommerce_pre_payment_complete', function ($order_id) {
    error_log('[tbv-staging] UNEXPECTED payment_complete call on order ' . (int)$order_id);
});
add_action('woocommerce_before_checkout_form', function () {
    wc_print_notice('Staging test checkout: orders are saved unpaid for testing. No card is charged, nothing ships and no email is sent.', 'notice');
});

/* ---------- Mark self-registered test customers. ---------- */
add_action('woocommerce_created_customer', function ($customer_id) {
    update_user_meta($customer_id, '_tbv_staging_synthetic', '1');
});
// Past-order linking works by email verification, which cannot be sent here.
add_filter('woocommerce_customer_email_verification_should_show_prompt', '__return_false', PHP_INT_MAX);
// Password reset needs email, which is disabled here.
add_action('woocommerce_before_customer_login_form', function () {
    wc_print_notice('Staging site: create a test account below with any made-up email (e.g. name@example.test). Password reset emails are disabled — remember your test password.', 'notice');
});

/* ---------- Preserve old offer links (generated from the source catalog). ---------- */
add_action('template_redirect', function () {
    if (!is_404()) return;
    $path = trim((string)wp_parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH), '/');
    $map = get_option('tbv_preview_legacy_routes', []);
    if (!isset($map[$path])) return;
    $target = $map[$path];
    $url = get_permalink((int)$target['productId']);
    if (!$url) return;
    $query = ['attribute_dosage' => $target['dose'], 'attribute_pack-size' => (string)$target['packCount'], 'warehouse' => $target['warehouse'], 'attribute_warehouse' => $target['warehouse']];
    if (!empty($target['formulation'])) $query['attribute_formulation'] = $target['formulation'];
    wp_safe_redirect(add_query_arg($query, $url), 302);
    exit;
});

/* ---------- Send the storefront's account icon to native WooCommerce My Account. ---------- */
add_action('wp_footer', function () {
    if (!function_exists('wc_get_page_permalink')) return;
    $account = wc_get_page_permalink('myaccount');
    $path = (string)wp_parse_url(home_url('/account'), PHP_URL_PATH);
    echo '<script>(function(){var t=' . wp_json_encode($account) . ',p=' . wp_json_encode($path) . ';document.addEventListener("click",function(e){var a=e.target&&e.target.closest?e.target.closest("a[href]"):null;if(!a)return;var u;try{u=new URL(a.href,location.href)}catch(_){return}if(u.origin===location.origin&&u.pathname.replace(/\/+$/,"")===p){e.preventDefault();e.stopImmediatePropagation();location.assign(t)}},true);var push=history.pushState;history.pushState=function(st,ti,url){try{if(url&&new URL(url,location.href).pathname.replace(/\/+$/,"")===p){location.assign(t);return}}catch(_){}return push.apply(this,arguments)}})();</script>';
}, 99);
