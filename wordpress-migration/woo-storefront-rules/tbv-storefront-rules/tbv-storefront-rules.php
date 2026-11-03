<?php
/**
 * Plugin Name: 10BottleValue storefront checkout rules
 * Description: Checkout rules carried over from the live storefront: automatic order discounts, carrier preference and the order bonus, plus an optional purchaser attestation (off by default). Rule values are an editable option, not code constants.
 * Version: 0.2.0
 * Requires Plugins: woocommerce
 * Requires PHP: 8.1
 */
defined('ABSPATH') || exit;

const TBV_STOREFRONT_RULES_OPTION = 'tbv_storefront_rules';

/** Current rules. A saved option replaces individual top-level keys. */
function tbv_storefront_rules() {
    $defaults = [
        'metadata' => [
            'source' => 'live storefront App.jsx (automaticDiscountRate, order bonus)',
            'status' => 'copied from the live storefront; confirm before production',
            'version' => '2026-10-28',
        ],
        // Highest qualifying tier applies to the items subtotal (all warehouses).
        'automatic_discount_tiers' => [
            ['min_subtotal' => '1000', 'rate_bps' => 1000],
            ['min_subtotal' => '2000', 'rate_bps' => 1500],
            ['min_subtotal' => '4000', 'rate_bps' => 2000],
        ],
        // Owner decision 2026-10-28: no researcher verification or purchaser
        // attestation on the WordPress store. Kept as a switch, off.
        'require_attestation' => false,
        'carriers' => ['FedEx', 'USPS', 'UPS'],
        'order_bonus' => ['min_worldwide_subtotal' => '350', 'label' => 'Reconstitution Solution (10 vials × 3 ml)'],
    ];
    $saved = get_option(TBV_STOREFRONT_RULES_OPTION);
    return is_array($saved) ? array_replace($defaults, $saved) : $defaults;
}

/** Decimal string or number to cents without float drift for two-decimal prices. */
function tbv_storefront_cents($value) {
    return (int)round(((float)$value) * 100);
}

/** Basis points of the highest tier reached by $subtotal_cents, or 0. */
function tbv_storefront_discount_bps($subtotal_cents, $rules = null) {
    $rules = $rules ?? tbv_storefront_rules();
    $best = 0;
    foreach ((array)($rules['automatic_discount_tiers'] ?? []) as $tier) {
        $min = tbv_storefront_cents($tier['min_subtotal'] ?? 'x');
        $bps = (int)($tier['rate_bps'] ?? 0);
        if ($min > 0 && $bps > 0 && $bps < 10000 && $subtotal_cents >= $min && $bps > $best) $best = $bps;
    }
    return $best;
}

/** The warehouse of a cart/order product, from the product or its parent. */
function tbv_storefront_warehouse($product) {
    if (!is_a($product, 'WC_Product')) return '';
    $warehouse = (string)$product->get_meta('_tbv_warehouse');
    if ($warehouse === '' && $product->get_parent_id()) {
        $parent = wc_get_product($product->get_parent_id());
        $warehouse = $parent ? (string)$parent->get_meta('_tbv_warehouse') : '';
    }
    $warehouse = strtolower(trim($warehouse));
    return in_array($warehouse, ['us', 'usa', 'us-warehouse', 'us warehouse'], true) ? 'us' : ($warehouse === '' ? '' : 'worldwide');
}

/* Automatic discount as a negative fee. Like the live checkout, it does not
 * stack with a coupon (promo code), and a referred customer's first-order
 * affiliate discount replaces it when larger (tbv-affiliates-credit). */
add_action('woocommerce_cart_calculate_fees', function ($cart) {
    if (!is_a($cart, 'WC_Cart') || $cart->is_empty() || $cart->get_applied_coupons()) return;
    $subtotal = 0;
    foreach ($cart->get_cart() as $line) $subtotal += tbv_storefront_cents($line['line_subtotal'] ?? 0);
    $bps = tbv_storefront_discount_bps($subtotal);
    $discount = (int)round($subtotal * $bps / 10000);
    $affiliate = apply_filters('tbv_storefront_affiliate_discount', null, $subtotal, $cart);
    if (is_array($affiliate) && (int)($affiliate['cents'] ?? 0) > $discount) {
        $cart->add_fee(sprintf('Affiliate discount (%s)', $affiliate['code']), -((int)$affiliate['cents']) / 100, false);
        return;
    }
    if (!$bps) return;
    $cart->add_fee(sprintf('Automatic discount (%s%%)', rtrim(rtrim(number_format($bps / 100, 2, '.', ''), '0'), '.')), -$discount / 100, false);
});

/* Purchaser attestation, required server-side like the live checkout. */
function tbv_storefront_posted_attestation() {
    $flag = fn($key) => isset($_POST[$key]) && wp_unslash($_POST[$key]) === '1';
    return [
        'over21AndResearchUseOnly' => $flag('tbv_attestation_research'),
        'qualifiedResearcherOrLicensedProfessional' => $flag('tbv_attestation_qualified'),
        'noHumanOrAnimalUse' => $flag('tbv_attestation_qualified'),
        'policiesAccepted' => $flag('tbv_attestation_terms'),
    ];
}
add_action('woocommerce_after_checkout_validation', function ($data, $errors) {
    if (empty(tbv_storefront_rules()['require_attestation'])) return;
    if (in_array(false, tbv_storefront_posted_attestation(), true)) {
        $errors->add('tbv_attestation', 'Please confirm the purchaser attestation before checkout.');
    }
}, 10, 2);

add_action('woocommerce_checkout_create_order', function ($order) {
    $rules = tbv_storefront_rules();
    $order->update_meta_data('_tbv_storefront_rules_version', (string)($rules['metadata']['version'] ?? ''));
    if (!empty($rules['require_attestation'])) {
        $order->update_meta_data('_tbv_purchaser_attestation', wp_json_encode(tbv_storefront_posted_attestation() + ['acceptedAt' => gmdate('c')]));
    }
    $carrier = sanitize_text_field(wp_unslash($_POST['tbv_carrier_preference'] ?? ''));
    if (in_array($carrier, (array)($rules['carriers'] ?? []), true)) $order->update_meta_data('_tbv_carrier_preference', $carrier);
    $tax_id = preg_replace('/\s+/', '', sanitize_text_field(wp_unslash($_POST['tbv_tax_id'] ?? '')));
    if ($tax_id !== '' && $order->get_billing_country() === 'MX' && preg_match('/^[A-Za-z0-9&Ññ]{12,13}$/u', $tax_id)) $order->update_meta_data('_tbv_tax_id', $tax_id);
    $bonus = $rules['order_bonus'] ?? null;
    if (is_array($bonus) && !empty($bonus['label'])) {
        $worldwide = 0;
        foreach ($order->get_items() as $item) {
            if (tbv_storefront_warehouse($item->get_product()) === 'worldwide') $worldwide += tbv_storefront_cents($item->get_subtotal());
        }
        $min = tbv_storefront_cents($bonus['min_worldwide_subtotal'] ?? 'x');
        if ($min > 0 && $worldwide >= $min) $order->update_meta_data('_tbv_order_bonus', (string)$bonus['label']);
    }
});

add_action('woocommerce_checkout_order_created', function ($order) {
    $notes = [];
    if ($carrier = $order->get_meta('_tbv_carrier_preference')) $notes[] = 'Carrier preference: ' . $carrier;
    if ($bonus = $order->get_meta('_tbv_order_bonus')) $notes[] = 'Order bonus: ' . $bonus;
    if ($order->get_meta('_tbv_purchaser_attestation')) $notes[] = 'Purchaser attestation recorded.';
    if ($notes) $order->add_order_note(implode("\n", $notes));
});

/* Tracking numbers on the order screen (live orders carry tracking_number and
 * tracking_number_2); the storefront Track Order page and account show them. */
add_action('add_meta_boxes', function () {
    foreach (['woocommerce_page_wc-orders', 'shop_order'] as $screen) {
        add_meta_box('tbv-tracking', 'Tracking numbers', function ($post_or_order) {
            $order = $post_or_order instanceof WC_Order ? $post_or_order : wc_get_order($post_or_order->ID);
            if (!$order) return;
            wp_nonce_field('tbv_tracking', 'tbv_tracking_nonce');
            foreach (['_tbv_tracking_number' => 'Tracking number', '_tbv_tracking_number_2' => 'Second tracking number'] as $key => $label) {
                printf('<p><label for="%1$s">%2$s</label><br><input type="text" id="%1$s" name="%1$s" value="%3$s" style="width:100%%" maxlength="64"></p>', esc_attr($key), esc_html($label), esc_attr($order->get_meta($key)));
            }
        }, $screen, 'side');
    }
});
add_action('woocommerce_process_shop_order_meta', function ($order_id) {
    if (!isset($_POST['tbv_tracking_nonce']) || !wp_verify_nonce(sanitize_key($_POST['tbv_tracking_nonce']), 'tbv_tracking') || !current_user_can('edit_shop_orders')) return;
    $order = wc_get_order($order_id);
    if (!$order) return;
    foreach (['_tbv_tracking_number', '_tbv_tracking_number_2'] as $key) {
        $value = preg_replace('/[^A-Za-z0-9 -]/', '', sanitize_text_field(wp_unslash($_POST[$key] ?? '')));
        $order->update_meta_data($key, substr(trim($value), 0, 64));
    }
    $order->save();
});
