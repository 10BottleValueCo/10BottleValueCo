<?php
// Staging-only shipping fixture. Tiers and express destinations copied from the live
// storefront's own rules (getShippingPrice / EXPRESS_ALLOWED_COUNTRIES in App.jsx);
// not verified against carrier or supplier terms.
// Idempotent: replaces only this script's method instances in the default zone.
$cfg = ['currency' => 'USD', 'metadata' => ['source' => 'live storefront App.jsx getShippingPrice + EXPRESS_ALLOWED_COUNTRIES', 'status' => 'copied from live storefront; unverified against carrier/supplier terms', 'version' => 'staging-fixture-2026-10-28'],
    'us_warehouse_countries' => ['US'], 'express_countries' => ['US', 'PR', 'AU', 'CO'],
    'tiers' => ['standard' => [['min_subtotal' => '0', 'price' => '59.99'], ['min_subtotal' => '100', 'price' => '39.99'], ['min_subtotal' => '300', 'price' => '0']],
                'express' => [['min_subtotal' => '0', 'price' => '99.99'], ['min_subtotal' => '300', 'price' => '19.99'], ['min_subtotal' => '550', 'price' => '0']]]];
$zone = new WC_Shipping_Zone(0);
foreach ($zone->get_shipping_methods() as $instance_id => $m) if ($m->id === 'tbv_warehouse_shipping') $zone->delete_shipping_method($instance_id);
foreach (['standard' => 'Standard', 'express' => 'Express'] as $service => $title) {
    $id = $zone->add_shipping_method('tbv_warehouse_shipping');
    update_option("woocommerce_tbv_warehouse_shipping_{$id}_settings", ['title' => $title, 'service' => $service, 'tax_status' => 'none', 'configuration' => wp_json_encode($cfg)]);
}
update_option('woocommerce_ship_to_countries', '');
update_option('woocommerce_calc_taxes', 'no');
// The storefront quotes before an address is entered; start customers in the US.
update_option('woocommerce_default_customer_address', 'base');
update_option('woocommerce_default_country', 'US');
echo json_encode(array_map(fn($m) => [$m->id, $m->get_option('service')], $zone->get_shipping_methods(true))), "\n";
