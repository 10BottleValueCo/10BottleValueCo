<?php
/**
 * Plugin Name: 10BottleValue storefront admin API
 * Description: Feeds the live storefront's admin panel (Orders, Charts, Analytics, Affiliates, Promo, Tools) from WooCommerce. Orders come back in the live admin's order shape and accept its edits; affiliates, payouts and store credit use tbv-affiliates-credit; promo codes are WooCommerce coupons. Shop managers only.
 * Version: 0.1.0
 * Requires Plugins: woocommerce
 * Requires PHP: 8.1
 */
defined('ABSPATH') || exit;

const TBV_SA_NAMESPACE = 'tbv-admin/v1';
// Live admin status ↔ WooCommerce status. "checkout" (customer reached payment)
// has no WooCommerce equivalent, so it is pending plus a marker.
const TBV_SA_TO_WOO = ['pending' => 'pending', 'checkout' => 'pending', 'paid' => 'processing', 'done' => 'completed', 'refunded' => 'refunded', 'cancelled' => 'cancelled'];

function tbv_sa_can() { return current_user_can('manage_woocommerce'); }

function tbv_sa_live_status($order) {
    return match ($order->get_status()) {
        'processing' => 'paid',
        'completed' => 'done',
        'refunded' => 'refunded',
        'cancelled', 'failed' => 'cancelled',
        default => $order->get_meta('_tbv_admin_status') === 'checkout' || str_starts_with((string)$order->get_meta('_tbv_source_status'), 'checkout') ? 'checkout' : 'pending',
    };
}
function tbv_sa_iso($date) { return $date ? $date->date('c') : ''; }
function tbv_sa_money($value) { return round((float)$value, 2); }
function tbv_sa_dose_key($dose) { return strtolower(preg_replace('/\s+/', '', (string)$dose)); }
/** Country name as the storefront shows it, without WooCommerce's " (US)" suffix. */
function tbv_sa_country_name($label) { return trim(preg_replace('/\s*\([^)]*\)\s*$/', '', html_entity_decode((string)$label, ENT_QUOTES, 'UTF-8'))); }

/** One order in the live admin panel's shape. */
function tbv_sa_order($order) {
    $items = [];
    $subtotal = 0.0;
    foreach ($order->get_items() as $item) {
        $product = $item->get_product();
        $parent = $product && $product->get_parent_id() ? wc_get_product($product->get_parent_id()) : $product;
        $qty = max(1, (int)$item->get_quantity());
        $row = [
            'name' => $parent ? $parent->get_name() : $item->get_name(),
            'dose' => $product ? (string)($product->get_meta('_tbv_dose') ?: $product->get_attribute('dosage')) : (string)$item->get_meta('_tbv_dose'),
            'quantity' => $qty,
            'price' => tbv_sa_money((float)$item->get_subtotal() / $qty),
        ];
        if (($product && function_exists('tbv_storefront_warehouse') && tbv_storefront_warehouse($product) === 'us') || $item->get_meta('_tbv_from_warehouse') === 'us') $row['fromWarehouse'] = 'us';
        $items[] = $row;
        $subtotal += (float)$item->get_subtotal();
    }
    $automatic = $affiliate = 0.0;
    foreach ($order->get_fees() as $fee) {
        $amount = -(float)$fee->get_total();
        if (str_starts_with($fee->get_name(), 'Affiliate discount')) $affiliate += $amount;
        elseif (str_starts_with($fee->get_name(), 'Automatic discount')) $automatic += $amount;
    }
    $credit = (float)($order->get_meta('_tbv_store_credit_used') ?: ((int)$order->get_meta('_tbv_store_credit_used_cents') / 100));
    $countries = WC()->countries->get_countries();
    $country = $order->get_billing_country();
    $override = $order->get_meta('_tbv_admin_subtotal');
    $notes = trim((string)$order->get_customer_note());
    if ($carrier = $order->get_meta('_tbv_carrier_preference')) $notes = trim($notes . "\nCarrier preference: " . $carrier);
    $payment_provider = (string)($order->get_meta('_tbv_payment_provider') ?: ($order->get_payment_method() === 'tbv_store_credit' ? 'StoreCredit' : $order->get_payment_method_title()));
    return [
        'id' => (string)($order->get_meta('_tbv_source_order_id') ?: $order->get_order_number()),
        'wooId' => $order->get_id(),
        'invoiceId' => (string)$order->get_meta('_tbv_invoice_number'),
        'email' => strtolower($order->get_billing_email()),
        'status' => tbv_sa_live_status($order),
        'createdAt' => tbv_sa_iso($order->get_date_created()),
        'paidAt' => tbv_sa_iso($order->get_date_paid()),
        'paymentProvider' => $payment_provider,
        'paymentId' => (string)($order->get_transaction_id() ?: $order->get_meta('_tbv_payment_id')),
        'firstName' => $order->get_billing_first_name(), 'lastName' => $order->get_billing_last_name(),
        'address' => $order->get_billing_address_1(), 'address2' => $order->get_billing_address_2(),
        'city' => $order->get_billing_city(), 'state' => $order->get_billing_state(), 'postalCode' => $order->get_billing_postcode(),
        'country' => $country ? tbv_sa_country_name($countries[$country] ?? $country) : (string)$order->get_meta('_tbv_source_country'),
        'phone' => $order->get_billing_phone(), 'taxId' => (string)$order->get_meta('_tbv_tax_id'),
        'orderNotes' => $notes,
        'shippingType' => (string)($order->get_meta('_tbv_shipping_type') ?: 'standard'),
        'items' => $items,
        'subtotal' => $override !== '' ? tbv_sa_money($override) : tbv_sa_money($subtotal),
        'shipping' => tbv_sa_money($order->get_shipping_total()),
        'automaticDiscount' => tbv_sa_money($automatic),
        'promoCode' => strtoupper(implode(', ', $order->get_coupon_codes())),
        'promoDiscount' => tbv_sa_money($order->get_discount_total()),
        'affiliateCode' => (string)$order->get_meta('_tbv_affiliate_code'),
        'affiliateOwnerEmail' => (string)$order->get_meta('_tbv_affiliate_owner_email'),
        'affiliateDiscount' => tbv_sa_money($affiliate),
        'affiliateCommission' => tbv_sa_money($order->get_meta('_tbv_affiliate_commission')),
        'affiliateCommissionAdjustment' => tbv_sa_money($order->get_meta('_tbv_affiliate_commission_adjustment')),
        'storeCreditUsed' => tbv_sa_money($credit),
        'cryptoDiscount' => 0, 'paypalFee' => 0,
        // Live records the cash total; credit-paid value is in storeCreditUsed.
        'total' => tbv_sa_money(max(0, (float)$order->get_total() - ($order->get_payment_method() === 'tbv_store_credit' ? $credit : 0))),
        'trackingNumber' => (string)$order->get_meta('_tbv_tracking_number'),
        'trackingNumber2' => (string)$order->get_meta('_tbv_tracking_number_2'),
        'trackingNumberSentAt' => (string)$order->get_meta('_tbv_tracking_number_sent_at'),
        'adminNote' => (string)$order->get_meta('_tbv_admin_note'),
    ];
}

/** An order by the id the panel shows: WooCommerce number or migrated INV- number. */
function tbv_sa_find($id) {
    $id = trim((string)$id);
    $order = ctype_digit($id) ? wc_get_order((int)$id) : null;
    if (!$order && preg_match('/^[A-Za-z0-9_-]{1,80}$/', $id)) $order = wc_get_orders(['limit' => 1, 'type' => 'shop_order', 'meta_key' => '_tbv_source_order_id', 'meta_value' => $id])[0] ?? null;
    return $order instanceof WC_Order && $order->get_type() === 'shop_order' ? $order : null;
}

/** Apply the live panel's field payload (its Supabase column names). */
function tbv_sa_apply_fields($order, array $payload) {
    $text = fn($v) => sanitize_text_field((string)$v);
    $meta = ['affiliate_commission_adjustment' => '_tbv_affiliate_commission_adjustment', 'tracking_number' => '_tbv_tracking_number', 'tracking_number_2' => '_tbv_tracking_number_2',
        'tracking_number_sent_at' => '_tbv_tracking_number_sent_at', 'invoice_id' => '_tbv_invoice_number', 'payment_provider' => '_tbv_payment_provider', 'taxId' => '_tbv_tax_id',
        'shipping_type' => '_tbv_shipping_type', 'admin_note' => '_tbv_admin_note', 'store_credit_used' => '_tbv_store_credit_used', 'subtotal' => '_tbv_admin_subtotal'];
    $billing = ['firstName' => 'first_name', 'lastName' => 'last_name', 'address' => 'address_1', 'address2' => 'address_2', 'city' => 'city', 'postalCode' => 'postcode', 'state' => 'state', 'phone' => 'phone'];
    $status = null;
    foreach ($payload as $key => $value) {
        if ($key === 'status') {
            $status = strtolower((string)$value);
            if (!isset(TBV_SA_TO_WOO[$status])) return new WP_Error('tbv_sa_status', 'Unknown status.', ['status' => 400]);
        } elseif (isset($meta[$key])) {
            $order->update_meta_data($meta[$key], $key === 'admin_note' ? sanitize_textarea_field((string)$value) : $text($value));
        } elseif (isset($billing[$key])) {
            $order->{'set_billing_' . $billing[$key]}($text($value));
            $order->{'set_shipping_' . ($billing[$key] === 'phone' ? 'phone' : $billing[$key])}($text($value));
        } elseif ($key === 'country') {
            $code = array_search(strtolower($text($value)), array_map(fn($n) => strtolower(tbv_sa_country_name($n)), WC()->countries->get_countries()), true);
            if ($code) { $order->set_billing_country($code); $order->set_shipping_country($code); }
        } elseif ($key === 'created_at') {
            $order->set_date_created(strtotime((string)$value) ?: time());
        } elseif ($key === 'payment_id') {
            $order->set_transaction_id($text($value));
        } elseif ($key === 'shipping') {
            foreach ($order->get_shipping_methods() as $line) { $line->set_total(max(0, (float)$value)); $line->save(); break; }
            $order->calculate_totals(false);
        } elseif ($key === 'total') {
            $order->set_total(max(0, (float)$value));
        }
    }
    $order->save();
    if ($status !== null) {
        $status === 'checkout' ? $order->update_meta_data('_tbv_admin_status', 'checkout') : $order->delete_meta_data('_tbv_admin_status');
        // Staging audit: payment was marked by an admin, not taken by a processor.
        if (in_array($status, ['paid', 'done'], true) && wp_get_environment_type() === 'staging') $order->update_meta_data('_tbv_staging_admin_marked_paid', '1');
        $order->save();
        if ($order->get_status() !== TBV_SA_TO_WOO[$status]) $order->update_status(TBV_SA_TO_WOO[$status], 'Status changed in the admin panel.');
    }
    return $order;
}

/** The catalog variation for a panel item, or null. */
function tbv_sa_variation($name, $dose, $us) {
    foreach (wc_get_products(['limit' => -1, 'type' => 'variable', 'name' => $name]) ?: [] as $parent) {
        foreach ($parent->get_children() as $child) {
            $variation = wc_get_product($child);
            if (!$variation || tbv_sa_dose_key($variation->get_meta('_tbv_dose') ?: $variation->get_attribute('dosage')) !== tbv_sa_dose_key($dose)) continue;
            if (($variation->get_attribute('warehouse') === 'us') !== $us) continue;
            if ((string)$variation->get_attribute('pack-size') !== '' && (string)$variation->get_attribute('pack-size') !== '10') continue;
            return $variation;
        }
    }
    return null;
}

/** Replace the order's lines with the panel's items, keeping fees, shipping and coupons. */
function tbv_sa_replace_items($order, array $items) {
    foreach ($order->get_items() as $id => $item) $order->remove_item($id);
    foreach ($items as $row) {
        $qty = max(1, (int)($row['quantity'] ?? $row['qty'] ?? 1));
        $line = round(max(0, (float)($row['price'] ?? 0)) * $qty, 2);
        $us = ($row['fromWarehouse'] ?? '') === 'us';
        $variation = tbv_sa_variation(sanitize_text_field((string)($row['name'] ?? '')), (string)($row['dose'] ?? ''), $us);
        $item = new WC_Order_Item_Product();
        if ($variation) $item->set_product($variation);
        else $item->set_name(trim(sanitize_text_field((string)($row['name'] ?? 'Item')) . ' ' . sanitize_text_field((string)($row['dose'] ?? ''))));
        $item->set_quantity($qty);
        $item->set_subtotal($line);
        $item->set_total($line);
        if (!$variation) { $item->add_meta_data('_tbv_dose', sanitize_text_field((string)($row['dose'] ?? '')), true); if ($us) $item->add_meta_data('_tbv_from_warehouse', 'us', true); }
        $order->add_item($item);
    }
    $order->delete_meta_data('_tbv_admin_subtotal');
    $order->calculate_totals(false);
    $order->save();
    return $order;
}

/** Public promo codes are WooCommerce percent coupons marked as public. */
function tbv_sa_public_promos() {
    $rows = [];
    foreach (get_posts(['post_type' => 'shop_coupon', 'post_status' => 'publish', 'numberposts' => -1, 'meta_key' => '_tbv_public_promo', 'meta_value' => '1', 'orderby' => 'date', 'order' => 'DESC']) as $post) {
        $coupon = new WC_Coupon($post->ID);
        $rows[] = ['id' => $post->ID, 'code' => strtoupper($coupon->get_code()), 'rate' => round((float)$coupon->get_amount() / 100, 4), 'created_at' => get_post_time('c', true, $post)];
    }
    return $rows;
}
function tbv_sa_create_coupon($code, $rate_percent, $email = '') {
    $code = strtoupper(preg_replace('/[^A-Za-z0-9_-]/', '', (string)$code));
    $rate = (float)$rate_percent;
    if ($code === '' || $rate <= 0 || $rate > 100) return new WP_Error('tbv_sa_promo', 'Fill all fields correctly. Rate: 1–100.', ['status' => 400]);
    if (wc_get_coupon_id_by_code($code)) return new WP_Error('tbv_sa_promo_exists', 'That code already exists.', ['status' => 409]);
    if (function_exists('tbv_ac_affiliate') && tbv_ac_affiliate($code)) return new WP_Error('tbv_sa_promo_affiliate', 'That code is an affiliate code.', ['status' => 409]);
    $coupon = new WC_Coupon();
    $coupon->set_code(strtolower($code));
    $coupon->set_discount_type('percent');
    $coupon->set_amount($rate);
    $coupon->set_individual_use(true);
    if ($email !== '') {
        // One-time code for one account, like live user_promos.
        $coupon->set_email_restrictions([$email]);
        $coupon->set_usage_limit(1);
        $coupon->set_description('Issued in the admin panel to ' . $email);
    } else {
        $coupon->update_meta_data('_tbv_public_promo', '1');
        $coupon->set_description('Public promo code from the admin panel');
    }
    $coupon->save();
    return $coupon;
}

add_action('rest_api_init', function () {
    $route = fn($path, $methods, $callback) => register_rest_route(TBV_SA_NAMESPACE, $path, ['methods' => $methods, 'permission_callback' => 'tbv_sa_can', 'callback' => $callback]);
    $body = fn($request) => (array)($request->get_json_params() ?: []);
    $missing = new WP_Error('tbv_sa_missing', 'Order not found.', ['status' => 404]);

    $route('/orders', 'GET', fn() => array_map('tbv_sa_order', wc_get_orders(['limit' => 2000, 'type' => 'shop_order', 'orderby' => 'date', 'order' => 'DESC', 'status' => array_keys(wc_get_order_statuses())])));
    $route('/orders/(?P<id>[A-Za-z0-9_-]+)', 'POST', function ($request) use ($body, $missing) {
        $order = tbv_sa_find($request['id']);
        if (!$order) return $missing;
        $result = tbv_sa_apply_fields($order, $body($request));
        return is_wp_error($result) ? $result : tbv_sa_order(wc_get_order($order->get_id()));
    });
    $route('/orders/(?P<id>[A-Za-z0-9_-]+)', 'DELETE', function ($request) use ($missing) {
        $order = tbv_sa_find($request['id']);
        if (!$order) return $missing;
        $order->delete(false); // to the trash, recoverable from WooCommerce → Orders
        return ['ok' => true];
    });
    $route('/orders/(?P<id>[A-Za-z0-9_-]+)/items', 'POST', function ($request) use ($body, $missing) {
        $order = tbv_sa_find($request['id']);
        $items = $body($request)['items'] ?? null;
        if (!$order) return $missing;
        if (!is_array($items) || !$items) return new WP_Error('tbv_sa_items', 'An order needs at least one item.', ['status' => 400]);
        return tbv_sa_order(tbv_sa_replace_items($order, $items));
    });
    $route('/orders/(?P<id>[A-Za-z0-9_-]+)/tracking-email', 'POST', function ($request) use ($body, $missing) {
        $order = tbv_sa_find($request['id']);
        $tracking = sanitize_text_field((string)($body($request)['trackingNumber'] ?? ''));
        if (!$order) return $missing;
        if ($tracking === '') return new WP_Error('tbv_sa_tracking', 'Enter a tracking number.', ['status' => 400]);
        if (wp_get_environment_type() === 'staging') return new WP_Error('tbv_sa_mail_off', 'Staging: mail is off, the tracking email was not sent.', ['status' => 409]);
        $sent = wp_mail($order->get_billing_email(), 'Your 10BottleValueCo order has shipped', sprintf("Hi %s,\n\nYour order %s has shipped. Tracking number: %s\nTrack it at https://t.17track.net/en#nums=%s\n\n10BottleValueCo", $order->get_billing_first_name(), tbv_sa_order($order)['id'], $tracking, rawurlencode($tracking)));
        return $sent ? ['ok' => true] : new WP_Error('tbv_sa_mail_failed', 'The tracking email could not be sent.', ['status' => 502]);
    });

    $route('/affiliates', 'GET', function () {
        global $wpdb;
        if (!function_exists('tbv_ac_table')) return [];
        return array_map(fn($r) => ['code' => $r['code'], 'email' => $r['email'], 'active' => (int)$r['active'] === 1, 'created_at' => gmdate('c', strtotime($r['created_at'] . ' UTC'))],
            $wpdb->get_results('SELECT code, email, active, created_at FROM ' . tbv_ac_table('affiliates') . ' ORDER BY created_at DESC', ARRAY_A));
    });
    $route('/affiliates', 'POST', function ($request) use ($body) {
        $data = $body($request);
        $email = strtolower(trim((string)($data['email'] ?? '')));
        $existing = function_exists('tbv_ac_affiliate') ? tbv_ac_affiliate($data['code'] ?? '') : null;
        $result = function_exists('tbv_ac_issue_affiliate') ? tbv_ac_issue_affiliate($email, $data['code'] ?? '') : new WP_Error('tbv_sa_plugin', 'Affiliates plugin is not active.');
        if (is_wp_error($result)) return new WP_Error($result->get_error_code(), $result->get_error_message(), ['status' => 400]);
        return ['code' => $result, 'email' => $email, 'restored' => (bool)$existing];
    });
    $route('/affiliates/revoke', 'POST', function ($request) use ($body) {
        $affiliate = function_exists('tbv_ac_affiliate_for_email') ? tbv_ac_affiliate_for_email($body($request)['email'] ?? '') : null;
        if (!$affiliate) return new WP_Error('tbv_sa_no_affiliate', 'No affiliate found for that email.', ['status' => 404]);
        tbv_ac_set_affiliate_active($affiliate['code'], false);
        return ['code' => $affiliate['code']];
    });
    $route('/payouts', 'GET', function () {
        global $wpdb;
        if (!function_exists('tbv_ac_table')) return ['payouts' => []];
        return ['payouts' => array_map(fn($r) => ['affiliate_code' => $r['affiliate_code'], 'amount' => round((int)$r['amount_cents'] / 100, 2)],
            $wpdb->get_results('SELECT affiliate_code, amount_cents FROM ' . tbv_ac_table('payouts') . ' ORDER BY created_at', ARRAY_A))];
    });
    $route('/payouts', 'POST', function ($request) use ($body) {
        $data = $body($request);
        $amount = number_format((float)($data['amount'] ?? 0), 2, '.', '');
        $result = function_exists('tbv_ac_record_payout') ? tbv_ac_record_payout($data['affiliate_code'] ?? '', $amount) : new WP_Error('tbv_sa_plugin', 'Affiliates plugin is not active.');
        return is_wp_error($result) ? new WP_Error($result->get_error_code(), $result->get_error_message(), ['status' => 400]) : new WP_REST_Response(['ok' => true], 201);
    });

    $route('/promos', 'GET', fn() => tbv_sa_public_promos());
    $route('/promos', 'POST', function ($request) use ($body) {
        $data = $body($request);
        $coupon = tbv_sa_create_coupon($data['code'] ?? '', $data['rate'] ?? 0);
        return is_wp_error($coupon) ? $coupon : ['id' => $coupon->get_id(), 'code' => strtoupper($coupon->get_code())];
    });
    $route('/promos/(?P<id>\d+)', 'DELETE', function ($request) {
        $post = get_post((int)$request['id']);
        if (!$post || $post->post_type !== 'shop_coupon' || get_post_meta($post->ID, '_tbv_public_promo', true) !== '1') return new WP_Error('tbv_sa_promo_missing', 'Promo code not found.', ['status' => 404]);
        wp_trash_post($post->ID);
        return ['ok' => true];
    });
    $route('/user-promos', 'POST', function ($request) use ($body) {
        $data = $body($request);
        $email = strtolower(trim(sanitize_email((string)($data['email'] ?? ''))));
        if (!is_email($email)) return new WP_Error('tbv_sa_email', 'Enter a valid email.', ['status' => 400]);
        $coupon = tbv_sa_create_coupon($data['code'] ?? '', $data['rate'] ?? 0, $email);
        return is_wp_error($coupon) ? $coupon : ['id' => $coupon->get_id(), 'code' => strtoupper($coupon->get_code()), 'email' => $email];
    });

    $route('/credit', 'GET', function ($request) {
        global $wpdb;
        $email = strtolower(trim(sanitize_email((string)$request->get_param('email'))));
        if (!function_exists('tbv_ac_credit_balance') || $email === '') return ['email' => $email, 'amount' => 0];
        $last = $wpdb->get_row($wpdb->prepare('SELECT note, created_at FROM ' . tbv_ac_table('credit_ledger') . ' WHERE email = %s ORDER BY id DESC LIMIT 1', $email), ARRAY_A);
        return ['email' => $email, 'amount' => tbv_ac_credit_balance($email) / 100, 'updated_at' => $last ? gmdate('c', strtotime($last['created_at'] . ' UTC')) : null, 'note' => $last['note'] ?? null];
    });
    $route('/credit', 'POST', function ($request) use ($body) {
        $data = $body($request);
        $cents = function_exists('tbv_ac_parse_money') ? tbv_ac_parse_money(number_format((float)($data['amount'] ?? -1), 2, '.', '')) : null;
        if ($cents === null || !in_array($data['mode'] ?? '', ['add', 'subtract', 'set'], true)) return new WP_Error('tbv_sa_credit', 'Enter a valid amount.', ['status' => 400]);
        $result = tbv_ac_admin_credit_change($data['email'] ?? '', $data['mode'], $cents, (string)($data['note'] ?? 'Admin panel'));
        return is_wp_error($result) ? new WP_Error($result->get_error_code(), $result->get_error_message(), ['status' => 400]) : ['email' => strtolower(trim((string)$data['email'])), 'balance' => $result / 100];
    });
});
