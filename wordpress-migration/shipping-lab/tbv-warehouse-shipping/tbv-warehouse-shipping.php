<?php
/**
 * Plugin Name: 10BottleValue Warehouse Shipping (Development)
 * Description: Configurable WooCommerce warehouse shipping quote foundation. Staging only until business rules are verified.
 * Version: 0.1.0
 * Requires Plugins: woocommerce
 * Requires PHP: 8.1
 */
defined('ABSPATH') || exit;

/** Convert a nonnegative decimal value to minor units without float arithmetic. */
function tbv_shipping_minor($value) {
    $s = trim((string)$value);
    if (!preg_match('/^(0|[1-9][0-9]{0,8})(?:\.([0-9]{1,2}))?$/D', $s, $m)) return null;
    return ((int)$m[1] * 100) + (int)str_pad($m[2] ?? '', 2, '0');
}

/** A quote uses explicitly supplied settings; rates and eligibility are not baked into code. */
function tbv_shipping_quote($config, $items, $country, $service, $currency) {
    if (!is_array($config) || !is_array($items) || !$items || !in_array($service, ['standard', 'express'], true)) return null;
    if (($config['currency'] ?? '') !== $currency || $currency !== 'USD') return null;
    if (!preg_match('/^[A-Z]{2}$/D', (string)$country)) return null;
    $metadata = $config['metadata'] ?? [];
    foreach (['source', 'version', 'status'] as $field) {
        if (!isset($metadata[$field]) || !is_string($metadata[$field]) || trim($metadata[$field]) === '' || strlen($metadata[$field]) > 160) return null;
    }
    $usCountries = $config['us_warehouse_countries'] ?? null;
    $expressCountries = $config['express_countries'] ?? null;
    if (!is_array($usCountries) || !is_array($expressCountries)) return null;
    $worldwide = 0;
    $hasWorldwide = false;
    foreach ($items as $item) {
        $warehouse = $item['warehouse'] ?? null;
        $amount = tbv_shipping_minor($item['line_subtotal'] ?? '');
        if (!in_array($warehouse, ['us', 'worldwide'], true) || $amount === null) return null;
        if ($warehouse === 'us' && !in_array($country, $usCountries, true)) return null;
        if ($warehouse === 'worldwide') {
            $hasWorldwide = true;
            $worldwide += $amount;
        }
    }
    if (!$hasWorldwide) return $service === 'standard' ? ['minor' => 0, 'version' => (string)$metadata['version']] : null;
    if ($service === 'express' && !in_array($country, $expressCountries, true)) return null;
    $tiers = $config['tiers'][$service] ?? null;
    if (!is_array($tiers) || !$tiers) return null;
    $previous = -1; $chosen = null;
    foreach ($tiers as $tier) {
        if (!is_array($tier)) return null;
        $min = tbv_shipping_minor($tier['min_subtotal'] ?? '');
        $price = tbv_shipping_minor($tier['price'] ?? '');
        if ($min === null || $price === null || $min <= $previous) return null;
        $previous = $min;
        if ($worldwide >= $min) $chosen = $price;
    }
    return $chosen === null ? null : ['minor' => $chosen, 'version' => (string)$metadata['version']];
}

/** Follow WooCommerce's own valid free-shipping coupon check. */
function tbv_shipping_has_free_coupon($cart) {
    if (!is_object($cart) || !method_exists($cart, 'get_coupons')) return false;
    foreach ($cart->get_coupons() as $coupon) {
        if (is_a($coupon, 'WC_Coupon') && $coupon->is_valid() && $coupon->get_free_shipping()) return true;
    }
    return false;
}

add_action('woocommerce_shipping_init', function () {
    if (!class_exists('WC_Shipping_Method') || class_exists('TBV_Warehouse_Shipping_Method')) return;
    class TBV_Warehouse_Shipping_Method extends WC_Shipping_Method {
        public function __construct($instance_id = 0) {
            $this->id = 'tbv_warehouse_shipping';
            $this->instance_id = absint($instance_id);
            $this->method_title = 'Warehouse shipping';
            $this->method_description = 'Warehouse-aware rates using editable, sourced settings.';
            $this->supports = ['shipping-zones', 'instance-settings'];
            $this->instance_form_fields = [
                'title' => ['title' => 'Title', 'type' => 'text', 'default' => 'Shipping'],
                'service' => ['title' => 'Service', 'type' => 'select', 'default' => 'standard', 'options' => ['standard' => 'Standard', 'express' => 'Express']],
                'tax_status' => ['title' => 'Tax status', 'type' => 'select', 'default' => 'taxable', 'options' => ['taxable' => 'Taxable', 'none' => 'None']],
                'configuration' => ['title' => 'Rate configuration (JSON)', 'type' => 'textarea', 'default' => '', 'description' => 'Include source, status, version, currency, destination eligibility and tiers.'],
            ];
            $this->title = $this->get_option('title', 'Shipping');
            $this->tax_status = $this->get_option('tax_status', 'taxable');
            add_action('woocommerce_update_options_shipping_' . $this->id, [$this, 'process_admin_options']);
        }
        public function calculate_shipping($package = []) {
            // This implementation quotes a single combined cart. Multiple independently
            // rated packages need an explicit allocation design to avoid double charges.
            $packages = WC()->shipping() ? WC()->shipping()->get_packages() : [];
            if (count($packages) > 1) return;
            $config = json_decode((string)$this->get_option('configuration', ''), true);
            $items = [];
            foreach (($package['contents'] ?? []) as $line) {
                $product = $line['data'] ?? null;
                if (!$product || !is_a($product, 'WC_Product')) return;
                $warehouse = (string)$product->get_meta('_tbv_warehouse');
                if ($warehouse === '' && $product->get_parent_id()) {
                    $parent = wc_get_product($product->get_parent_id());
                    $warehouse = $parent ? (string)$parent->get_meta('_tbv_warehouse') : '';
                }
                $aliases = ['us' => 'us', 'usa' => 'us', 'us-warehouse' => 'us', 'us warehouse' => 'us', 'worldwide' => 'worldwide'];
                $warehouse = $aliases[strtolower(trim($warehouse))] ?? '';
                $items[] = ['warehouse' => $warehouse, 'line_subtotal' => (string)($line['line_subtotal'] ?? '')];
            }
            $quote = tbv_shipping_quote($config, $items, strtoupper((string)($package['destination']['country'] ?? '')), $this->get_option('service', 'standard'), get_woocommerce_currency());
            if ($quote === null) return;
            if (tbv_shipping_has_free_coupon(WC()->cart)) $quote['minor'] = 0;
            $amount = sprintf('%d.%02d', intdiv($quote['minor'], 100), $quote['minor'] % 100);
            $this->add_rate(['id' => $this->get_rate_id(), 'label' => $this->title, 'cost' => $amount, 'package' => $package, 'meta_data' => ['tbv_rule_version' => $quote['version'], 'tbv_service' => $this->get_option('service', 'standard')]]);
        }
    }
});
add_filter('woocommerce_shipping_methods', function ($methods) { $methods['tbv_warehouse_shipping'] = 'TBV_Warehouse_Shipping_Method'; return $methods; });
