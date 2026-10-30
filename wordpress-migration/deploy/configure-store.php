<?php
/**
 * Store settings every install gets (staging and production), run with
 *   wp eval-file configure-store.php
 * Idempotent. The two promo codes are the ones hard-coded in the live
 * storefront's promoCatalog (App.jsx); promos created in the live admin are
 * data and arrive with the migration.
 */
defined('ABSPATH') || exit;

$coupon = function ($code, callable $configure) {
    $c = new WC_Coupon(wc_get_coupon_id_by_code($code) ?: 0);
    $c->set_code($code);
    $configure($c);
    $c->update_meta_data('_tbv_public_promo', '1');
    $c->save();
    return ['code' => $c->get_code(), 'id' => $c->get_id()];
};
$out = [];
// REVIEW10: 10% off, never combined with the automatic discount (tbv-storefront-rules).
$out[] = $coupon('review10', function ($c) {
    $c->set_description('10% Trustpilot review discount (live REVIEW10).');
    $c->set_discount_type('percent');
    $c->set_amount(10);
    $c->set_individual_use(true);
});
// OWNERFREESHIP: free shipping, only for the store's own address.
$out[] = $coupon('ownerfreeship', function ($c) {
    $c->set_description('Free shipping (owner), live OWNERFREESHIP.');
    $c->set_discount_type('fixed_cart');
    $c->set_amount(0);
    $c->set_free_shipping(true);
    $c->set_email_restrictions(['support@10bottlevalue.co']);
});
// Checkout needs an account, as on live; customers register from My Account.
update_option('woocommerce_enable_guest_checkout', 'no');
update_option('woocommerce_enable_myaccount_registration', 'yes');
update_option('woocommerce_registration_generate_password', 'no');
update_option('woocommerce_currency', 'USD');
update_option('woocommerce_calc_taxes', 'no');
update_option('permalink_structure', '/%postname%/');
flush_rewrite_rules(false);
echo wp_json_encode(['coupons' => $out, 'guestCheckout' => get_option('woocommerce_enable_guest_checkout')]), "\n";
