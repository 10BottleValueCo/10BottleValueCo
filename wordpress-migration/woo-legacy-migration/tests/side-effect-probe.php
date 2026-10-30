<?php
/**
 * Loaded with `wp --require=...` around real `wp tbv-migrate` runs. Counts mail,
 * HTTP and every WooCommerce/WordPress hook that would mean an email, payment,
 * refund, stock or status side effect. Also counts benign creation hooks so a
 * run of zeros proves the probe was wired up. Writes JSON to $TBV_PROBE_OUT.
 */
WP_CLI::add_hook('after_wp_load', function () {
    $GLOBALS['tbv_probe'] = ['mail' => 0, 'http' => 0, 'hooks' => []];
    add_filter('wp_mail', function ($atts) {
        $GLOBALS['tbv_probe']['mail']++;
        return $atts;
    }, -PHP_INT_MAX);
    add_filter('pre_http_request', function ($pre) {
        $GLOBALS['tbv_probe']['http']++;
        return $pre;
    }, -PHP_INT_MAX);
    add_action('all', function ($tag) {
        if (preg_match('/^(woocommerce_order_status_|woocommerce_pre_payment_complete$|woocommerce_payment_complete$|woocommerce_payment_complete_order_status$|woocommerce_reduce_order_stock$|woocommerce_reduce_order_item_stock$|woocommerce_restore_order_stock$|woocommerce_product_set_stock$|woocommerce_variation_set_stock$|woocommerce_can_reduce_order_stock$|woocommerce_can_restore_order_stock$|woocommerce_order_(fully_|partially_)?refunded$|woocommerce_refund_created$|woocommerce_create_refund$|woocommerce_email_sent$|woocommerce_new_customer_note$|woocommerce_created_customer$|woocommerce_order_edit_status$|woocommerce_checkout_order_processed$|woocommerce_thankyou$|woocommerce_new_order$|woocommerce_update_order$|user_register$|profile_update$|wp_new_user_notification_email$)/', $tag)) {
            $GLOBALS['tbv_probe']['hooks'][$tag] = ($GLOBALS['tbv_probe']['hooks'][$tag] ?? 0) + 1;
        }
    });
    register_shutdown_function(function () {
        $out = getenv('TBV_PROBE_OUT');
        if ($out) {
            file_put_contents($out, json_encode($GLOBALS['tbv_probe']));
        }
    });
});
