<?php
// Staging-only shipping fixture. Prices copied from the current storefront's displayed
// tiers and explicitly UNVERIFIED; destinations are a synthetic placeholder list.
// Idempotent: replaces only this script's method instances in the default zone.
$cfg = ['currency' => 'USD', 'metadata' => ['source' => 'current storefront display - staging fixture', 'status' => 'unverified staging test data', 'version' => 'staging-fixture-2026-10-27'],
    'us_warehouse_countries' => ['US'], 'express_countries' => ['US', 'CA'],
    'tiers' => ['standard' => [['min_subtotal' => '0', 'price' => '59.99'], ['min_subtotal' => '100', 'price' => '39.99'], ['min_subtotal' => '300', 'price' => '0']],
                'express' => [['min_subtotal' => '0', 'price' => '99.99'], ['min_subtotal' => '300', 'price' => '19.99'], ['min_subtotal' => '550', 'price' => '0']]]];
$zone = new WC_Shipping_Zone(0);
foreach ($zone->get_shipping_methods() as $instance_id => $m) if ($m->id === 'tbv_warehouse_shipping') $zone->delete_shipping_method($instance_id);
foreach (['standard' => 'Standard shipping (staging test rates — unverified)', 'express' => 'Express shipping (staging test rates — unverified)'] as $service => $title) {
    $id = $zone->add_shipping_method('tbv_warehouse_shipping');
    update_option("woocommerce_tbv_warehouse_shipping_{$id}_settings", ['title' => $title, 'service' => $service, 'tax_status' => 'none', 'configuration' => wp_json_encode($cfg)]);
}
update_option('woocommerce_ship_to_countries', '');
update_option('woocommerce_calc_taxes', 'no');
echo json_encode(array_map(fn($m) => [$m->id, $m->get_option('service')], $zone->get_shipping_methods(true))), "\n";
