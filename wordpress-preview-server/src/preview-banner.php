<?php
/** Anonymous server-rendered preview: no accounts, orders, email or provider traffic. */
defined('ABSPATH') || exit;
add_action('wp_head', function () {
    echo '<style>.tbv-wp-preview-banner{padding:6px 10px;background:#142631;color:#edf5fa;border-bottom:1px solid #ffffff25;display:flex;align-items:center;justify-content:center;gap:12px;font:600 11px/1.4 Arial,sans-serif;text-align:center}.tbv-wp-preview-banner small{font-size:10px;font-weight:400;color:#bacbd6}.tbv-account{display:none!important}</style>';
}, 99);
add_action('wp_body_open', function () {
    echo '<div class="tbv-wp-preview-banner" role="note"><span>Preview — WordPress version</span><small>Ordering disabled</small></div>';
}, 0);
add_filter('woocommerce_coupons_enabled', '__return_false');
add_filter('woocommerce_cart_ready_to_calc_shipping', '__return_false');
add_action('wp', function () {
    remove_action('woocommerce_proceed_to_checkout', 'woocommerce_button_proceed_to_checkout', 20);
    add_action('woocommerce_proceed_to_checkout', function () {
        echo '<button class="checkout-button button alt wc-forward" disabled>Preview — ordering disabled</button>';
    });
});
