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

/**
 * Visitor address for rate limits. Behind the local tunnel/proxy, the address the
 * tunnel appended last; earlier X-Forwarded-For entries come from the client.
 */
function tbv_sa_client_ip() {
    $remote = (string)($_SERVER['REMOTE_ADDR'] ?? '');
    if (in_array($remote, ['127.0.0.1', '::1'], true) && !empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
        $parts = array_map('trim', explode(',', (string)$_SERVER['HTTP_X_FORWARDED_FOR']));
        $last = end($parts);
        if (filter_var($last, FILTER_VALIDATE_IP)) return $last;
    }
    return $remote;
}

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

/* ---------- Support inbox (live contact_messages) ---------- */

const TBV_SA_MESSAGES_SCHEMA = '1';
const TBV_SA_MESSAGE_COLUMNS = ['id', 'name', 'email', 'message', 'admin_reply', 'replied_at', 'user_read_at', 'created_at'];

function tbv_sa_messages_table() { global $wpdb; return $wpdb->prefix . 'tbv_contact_messages'; }
add_action('plugins_loaded', function () {
    if (get_option('tbv_sa_messages_schema') === TBV_SA_MESSAGES_SCHEMA) return;
    global $wpdb;
    require_once ABSPATH . 'wp-admin/includes/upgrade.php';
    dbDelta('CREATE TABLE ' . tbv_sa_messages_table() . " (
  id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  name varchar(200) NOT NULL DEFAULT '',
  email varchar(254) NOT NULL,
  message longtext NOT NULL,
  admin_reply longtext DEFAULT NULL,
  replied_at datetime DEFAULT NULL,
  user_read_at datetime DEFAULT NULL,
  created_at datetime NOT NULL,
  PRIMARY KEY  (id),
  KEY email (email(100)),
  KEY created_at (created_at)
) ENGINE=InnoDB " . $wpdb->get_charset_collate() . ';');
    update_option('tbv_sa_messages_schema', TBV_SA_MESSAGES_SCHEMA, false);
});

function tbv_sa_message_row($row) {
    foreach (['replied_at', 'user_read_at', 'created_at'] as $key) $row[$key] = $row[$key] ? gmdate('c', strtotime($row[$key] . ' UTC')) : null;
    $row['id'] = (int)$row['id'];
    return $row;
}
/** Column value from the panel (ISO dates to UTC datetime). */
function tbv_sa_message_value($column, $value) {
    if ($value === null) return null;
    if (in_array($column, ['replied_at', 'user_read_at', 'created_at'], true)) return gmdate('Y-m-d H:i:s', strtotime((string)$value) ?: time());
    if ($column === 'email') return strtolower(trim(sanitize_email((string)$value)));
    return in_array($column, ['message', 'admin_reply'], true) ? sanitize_textarea_field(mb_substr((string)$value, 0, 20000)) : sanitize_text_field(mb_substr((string)$value, 0, 200));
}
/** SQL WHERE for the panel's filters; false if a filter is not allowed. */
function tbv_sa_message_where(array $filters) {
    global $wpdb;
    $sql = [];
    foreach ($filters as $f) {
        [$type, $column] = [$f[0] ?? '', $f[1] ?? ''];
        if (!in_array($column, TBV_SA_MESSAGE_COLUMNS, true)) return false;
        if ($type === 'eq') $sql[] = $wpdb->prepare("`{$column}` = %s", (string)$f[2]);
        elseif ($type === 'in' && is_array($f[2]) && $f[2]) $sql[] = "`{$column}` IN (" . implode(',', array_map(fn($v) => $wpdb->prepare('%s', (string)$v), $f[2])) . ')';
        elseif ($type === 'is' && ($f[2] ?? null) === null) $sql[] = "`{$column}` IS NULL";
        elseif ($type === 'not' && ($f[2] ?? '') === 'is' && ($f[3] ?? null) === null) $sql[] = "`{$column}` IS NOT NULL";
        else return false;
    }
    return $sql ? ' WHERE ' . implode(' AND ', $sql) : '';
}

add_action('rest_api_init', function () {
    register_rest_route('tbv-messages/v1', '/query', ['methods' => 'POST', 'permission_callback' => '__return_true', 'callback' => function ($request) {
        global $wpdb;
        $q = (array)($request->get_json_params() ?: []);
        $table = tbv_sa_messages_table();
        $op = $q['op'] ?? 'select';
        $filters = is_array($q['filters'] ?? null) ? $q['filters'] : [];
        $user = wp_get_current_user();
        $admin = tbv_sa_can();
        $deny = new WP_Error('tbv_sa_messages_forbidden', 'Not allowed.', ['status' => 403]);
        if (($q['table'] ?? '') !== 'contact_messages') return $deny;
        if (!$admin) {
            // Visitors send messages; signed-in customers also read and mark their own thread.
            if ($op === 'insert') {
                $email = $user->exists() ? strtolower($user->user_email) : tbv_sa_message_value('email', $q['values']['email'] ?? '');
                $text = trim((string)($q['values']['message'] ?? ''));
                if (!is_email($email) || $text === '') return new WP_Error('tbv_sa_message_invalid', 'Enter your email and a message.', ['status' => 400]);
                // Guests: 10 per address; signed-in customers: 30 per account (per 10 minutes).
                $key = $user->exists() ? 'tbv_msg_u' . $user->ID : 'tbv_msg_' . md5(tbv_sa_client_ip());
                $sent = (int)get_transient($key);
                if ($sent >= ($user->exists() ? 30 : 10)) return new WP_Error('tbv_sa_message_rate', 'Too many messages. Please try again later.', ['status' => 429]);
                set_transient($key, $sent + 1, 10 * MINUTE_IN_SECONDS);
                $q['values'] = ['name' => $q['values']['name'] ?? '', 'email' => $email, 'message' => $text];
            } elseif ($user->exists() && in_array($op, ['select', 'update'], true)) {
                $filters[] = ['eq', 'email', strtolower($user->user_email)];
                if ($op === 'update' && array_keys((array)$q['values']) !== ['user_read_at']) return $deny;
            } else {
                return $deny;
            }
        }
        $where = tbv_sa_message_where($filters);
        if ($where === false) return new WP_Error('tbv_sa_messages_filter', 'Unsupported filter.', ['status' => 400]);
        if ($op === 'select') {
            [$column, $asc] = is_array($q['order'] ?? null) ? $q['order'] : ['created_at', false];
            if (!in_array($column, TBV_SA_MESSAGE_COLUMNS, true)) $column = 'created_at';
            $limit = isset($q['limit']) ? ' LIMIT ' . max(1, min(5000, (int)$q['limit'])) : '';
            $rows = $wpdb->get_results("SELECT * FROM {$table}{$where} ORDER BY `{$column}` " . ($asc ? 'ASC' : 'DESC') . $limit, ARRAY_A);
            return ['data' => array_map('tbv_sa_message_row', $rows)];
        }
        if ($op === 'insert') {
            $row = ['created_at' => gmdate('Y-m-d H:i:s')];
            foreach ((array)$q['values'] as $column => $value) if (in_array($column, TBV_SA_MESSAGE_COLUMNS, true) && $column !== 'id') $row[$column] = tbv_sa_message_value($column, $value);
            if (empty($row['email']) || !isset($row['message'])) return new WP_Error('tbv_sa_message_invalid', 'Enter your email and a message.', ['status' => 400]);
            $wpdb->insert($table, $row);
            return ['data' => [tbv_sa_message_row($wpdb->get_row($wpdb->prepare("SELECT * FROM {$table} WHERE id = %d", $wpdb->insert_id), ARRAY_A))]];
        }
        if ($where === '') return new WP_Error('tbv_sa_messages_filter', 'A filter is required.', ['status' => 400]);
        $ids = $wpdb->get_col("SELECT id FROM {$table}{$where}");
        if ($op === 'update') {
            $set = [];
            foreach ((array)$q['values'] as $column => $value) if (in_array($column, TBV_SA_MESSAGE_COLUMNS, true) && !in_array($column, ['id', 'created_at'], true)) $set[$column] = tbv_sa_message_value($column, $value);
            foreach ($ids as $id) $wpdb->update($table, $set, ['id' => (int)$id]);
        } elseif ($op === 'delete') {
            foreach ($ids as $id) $wpdb->delete($table, ['id' => (int)$id]);
            return ['data' => []];
        } else {
            return $deny;
        }
        $rows = $ids ? $wpdb->get_results("SELECT * FROM {$table} WHERE id IN (" . implode(',', array_map('intval', $ids)) . ')', ARRAY_A) : [];
        return ['data' => array_map('tbv_sa_message_row', $rows)];
    }]);
});

/* ---------- Visitor funnel (live analytics_events) ---------- */

const TBV_SA_EVENTS_SCHEMA = '1';
// Live api/analytics.js allows exactly these event types.
const TBV_SA_EVENT_TYPES = ['page_view', 'page_exit', 'product_view', 'add_to_cart', 'checkout_started', 'checkout_step', 'order_placed', 'ui_click', 'form_submit'];

function tbv_sa_events_table() { global $wpdb; return $wpdb->prefix . 'tbv_analytics_events'; }
add_action('plugins_loaded', function () {
    if (get_option('tbv_sa_events_schema') === TBV_SA_EVENTS_SCHEMA) return;
    global $wpdb;
    require_once ABSPATH . 'wp-admin/includes/upgrade.php';
    dbDelta('CREATE TABLE ' . tbv_sa_events_table() . " (
  id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  session_id char(36) NOT NULL,
  event_type varchar(32) NOT NULL,
  page varchar(100) DEFAULT NULL,
  referrer varchar(500) DEFAULT NULL,
  properties text DEFAULT NULL,
  created_at datetime NOT NULL,
  PRIMARY KEY  (id),
  KEY created_at (created_at),
  KEY session_id (session_id)
) ENGINE=InnoDB " . $wpdb->get_charset_collate() . ';');
    update_option('tbv_sa_events_schema', TBV_SA_EVENTS_SCHEMA, false);
});

add_action('rest_api_init', function () {
    // Anonymous: a random browser session id, no IP, account or email is stored.
    register_rest_route('tbv-analytics/v1', '/events', ['methods' => 'POST', 'permission_callback' => '__return_true', 'callback' => function ($request) {
        global $wpdb;
        $e = json_decode($request->get_body(), true);
        $session = is_array($e) ? (string)($e['session_id'] ?? '') : '';
        $type = is_array($e) ? (string)($e['event_type'] ?? '') : '';
        if (!preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i', $session) || !in_array($type, TBV_SA_EVENT_TYPES, true)) return new WP_REST_Response(['ok' => false], 400);
        if (tbv_sa_can()) return new WP_REST_Response(['ok' => true, 'skipped' => 'admin'], 202);
        foreach (['tbv_ev_s_' . md5($session) => 300, 'tbv_ev_i_' . md5(tbv_sa_client_ip()) => 6000] as $key => $max) {
            $count = (int)get_transient($key);
            if ($count >= $max) return new WP_REST_Response(['ok' => false], 429);
            set_transient($key, $count + 1, 10 * MINUTE_IN_SECONDS);
        }
        $properties = is_array($e['properties'] ?? null) ? wp_json_encode($e['properties']) : null;
        if ($properties !== null && strlen($properties) > 4000) $properties = null;
        $wpdb->insert(tbv_sa_events_table(), [
            'session_id' => strtolower($session), 'event_type' => $type,
            'page' => is_string($e['page'] ?? null) ? substr(sanitize_text_field($e['page']), 0, 100) : null,
            'referrer' => is_string($e['referrer'] ?? null) ? substr(esc_url_raw($e['referrer']), 0, 500) : null,
            'properties' => $properties, 'created_at' => gmdate('Y-m-d H:i:s'),
        ]);
        if (wp_rand(1, 200) === 1) $wpdb->query($wpdb->prepare('DELETE FROM ' . tbv_sa_events_table() . ' WHERE created_at < %s', gmdate('Y-m-d H:i:s', time() - 90 * DAY_IN_SECONDS)));
        return new WP_REST_Response(['ok' => true], 202);
    }]);
    register_rest_route(TBV_SA_NAMESPACE, '/analytics', ['methods' => 'GET', 'permission_callback' => 'tbv_sa_can', 'callback' => function ($request) {
        global $wpdb;
        $days = in_array((int)$request->get_param('days'), [1, 7, 30, 90], true) ? (int)$request->get_param('days') : 7;
        $rows = $wpdb->get_results($wpdb->prepare('SELECT id, session_id, event_type, page, properties, created_at FROM ' . tbv_sa_events_table() . ' WHERE created_at >= %s ORDER BY created_at DESC LIMIT 20000', gmdate('Y-m-d H:i:s', time() - $days * DAY_IN_SECONDS)), ARRAY_A);
        return ['events' => array_map(fn($r) => ['id' => (int)$r['id'], 'session_id' => $r['session_id'], 'event_type' => $r['event_type'], 'page' => $r['page'], 'properties' => $r['properties'] ? json_decode($r['properties'], true) : null, 'created_at' => gmdate('c', strtotime($r['created_at'] . ' UTC'))], $rows)];
    }]);
});

/* ---------- Tools: out-of-stock switches ---------- */

add_action('rest_api_init', function () {
    // Live keeps these switches in one browser; WooCommerce stock status is shared.
    register_rest_route(TBV_SA_NAMESPACE, '/stock', ['methods' => 'POST', 'permission_callback' => 'tbv_sa_can', 'callback' => function ($request) {
        $data = (array)($request->get_json_params() ?: []);
        $variation = wc_get_product((int)($data['variationId'] ?? 0));
        if (!$variation || !$variation->is_type('variation')) return new WP_Error('tbv_sa_stock_missing', 'Unknown product.', ['status' => 404]);
        $variation->set_stock_status(!empty($data['outOfStock']) ? 'outofstock' : 'instock');
        $variation->save();
        return ['variationId' => $variation->get_id(), 'stockStatus' => $variation->get_stock_status()];
    }]);
});

/* ---------- Shop order: best sellers (live /api/catalog-ranking) ---------- */

const TBV_SA_RANKING_FROM = '2026-04-01';
const TBV_SA_RANKING_ALIASES = ['bac water' => 'Reconstitution Solution', 'hgh' => '10-GH', 'ara290 (cibinetide)' => 'ARA290'];

// Units sold per product on paid/done orders since FROM (paid date, else
// created), top 40 overall and top 40 from the US warehouse, as on live.
function tbv_sa_ranking() {
    $through = (new DateTime('now', new DateTimeZone('Europe/Riga')))->format('Y-m-d');
    $cached = get_transient('tbv_sa_ranking');
    if (is_array($cached) && ($cached['through'] ?? '') === $through) return $cached;
    $units = $us_units = [];
    for ($page = 1; ; $page++) {
        $orders = wc_get_orders(['status' => ['processing', 'completed'], 'date_created' => '>=' . gmdate('Y-m-d', strtotime(TBV_SA_RANKING_FROM . ' -60 days')), 'limit' => 500, 'page' => $page, 'orderby' => 'ID', 'order' => 'ASC']);
        foreach ($orders as $order) {
            $date = $order->get_date_paid() ?: $order->get_date_created();
            $day = $date ? $date->date('Y-m-d') : '';
            if ($day < TBV_SA_RANKING_FROM || $day > $through) continue;
            foreach (tbv_sa_order($order)['items'] as $item) {
                $name = trim((string)$item['name']);
                $name = TBV_SA_RANKING_ALIASES[strtolower($name)] ?? $name;
                if ($name === '') continue;
                $units[$name] = ($units[$name] ?? 0) + $item['quantity'];
                if (($item['fromWarehouse'] ?? '') === 'us') $us_units[$name] = ($us_units[$name] ?? 0) + $item['quantity'];
            }
        }
        if (count($orders) < 500) break;
    }
    $top = function ($counts) { arsort($counts); return array_slice(array_map('strval', array_keys($counts)), 0, 40); };
    $ranking = ['from' => TBV_SA_RANKING_FROM, 'through' => $through, 'names' => $top($units), 'usNames' => $top($us_units)];
    set_transient('tbv_sa_ranking', $ranking, 5 * MINUTE_IN_SECONDS);
    return $ranking;
}

add_action('rest_api_init', function () {
    register_rest_route('tbv-storefront/v1', '/ranking', ['methods' => 'GET', 'permission_callback' => '__return_true', 'callback' => function () {
        $response = new WP_REST_Response(tbv_sa_ranking());
        $response->header('Cache-Control', 'public, max-age=60');
        return $response;
    }]);
});

/* ---------- Charts: per-order supplier cost overrides ---------- */

function tbv_sa_cost_metadata($order) {
    $lines = json_decode((string)$order->get_meta('_tbv_line_cost_overrides'), true);
    $metadata = ['lineCostOverrides' => is_array($lines) ? (object)$lines : new stdClass()];
    if ($order->get_meta('_tbv_supplier_shipping_override') !== '') $metadata['supplierShippingOverride'] = round((float)$order->get_meta('_tbv_supplier_shipping_override'), 2);
    return $metadata;
}
add_action('rest_api_init', function () {
    register_rest_route(TBV_SA_NAMESPACE, '/order-costs', ['methods' => 'GET', 'permission_callback' => 'tbv_sa_can', 'callback' => function () {
        $orders = wc_get_orders(['limit' => 2000, 'type' => 'shop_order', 'meta_query' => ['relation' => 'OR', ['key' => '_tbv_line_cost_overrides', 'compare' => 'EXISTS'], ['key' => '_tbv_supplier_shipping_override', 'compare' => 'EXISTS']]]);
        return ['ok' => true, 'orders' => array_map(fn($o) => ['id' => tbv_sa_order($o)['id'], 'metadata' => tbv_sa_cost_metadata($o)], $orders), 'nextCursor' => null];
    }]);
    register_rest_route(TBV_SA_NAMESPACE, '/order-costs', ['methods' => 'POST', 'permission_callback' => 'tbv_sa_can', 'callback' => function ($request) {
        $data = (array)($request->get_json_params() ?: []);
        $order = tbv_sa_find((string)($data['orderId'] ?? ''));
        $amount = $data['amount'] ?? null;
        $kind = $data['kind'] ?? '';
        // Same rules as live api/_order-costs-core.js.
        if (!$order || !in_array($kind, ['line', 'shipping'], true) || !is_numeric($amount) || $amount < 0 || $amount > 1000000 || round((float)$amount, 2) != (float)$amount) return new WP_REST_Response(['ok' => false, 'error' => 'Invalid cost change.'], 400);
        if ($kind === 'line') {
            $index = $data['index'] ?? null;
            if (!is_int($index) || $index < 0 || $index > 9999) return new WP_REST_Response(['ok' => false, 'error' => 'Invalid order line.'], 400);
            $lines = json_decode((string)$order->get_meta('_tbv_line_cost_overrides'), true) ?: [];
            $lines[(string)$index] = round((float)$amount, 2);
            $order->update_meta_data('_tbv_line_cost_overrides', wp_json_encode($lines));
        } else {
            $order->update_meta_data('_tbv_supplier_shipping_override', (string)round((float)$amount, 2));
        }
        $order->save();
        return ['ok' => true, 'order' => ['id' => tbv_sa_order($order)['id'], 'metadata' => tbv_sa_cost_metadata($order)]];
    }]);
});

/* ---------- Support chat attachments (live support-attachments API) ---------- */

const TBV_SA_ATTACHMENT_MAX = 25 * 1024 * 1024; // live allows 100 MB; PHP holds uploads in memory here
// Live's media and document types, without SVG (scriptable when opened directly).
const TBV_SA_ATTACHMENT_TYPES = [
    'image/avif' => 'avif', 'image/bmp' => 'bmp', 'image/gif' => 'gif', 'image/heic' => 'heic', 'image/heif' => 'heif', 'image/jpeg' => 'jpg',
    'image/png' => 'png', 'image/tiff' => 'tif', 'image/webp' => 'webp', 'video/3gpp' => '3gp', 'video/mp4' => 'mp4', 'video/mpeg' => 'mpeg',
    'video/ogg' => 'ogv', 'video/quicktime' => 'mov', 'video/webm' => 'webm', 'video/x-m4v' => 'm4v', 'video/x-matroska' => 'mkv', 'video/x-msvideo' => 'avi',
    'application/pdf' => 'pdf', 'text/plain' => 'txt', 'text/csv' => 'csv', 'application/msword' => 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document' => 'docx', 'application/vnd.ms-excel' => 'xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' => 'xlsx', 'application/vnd.ms-powerpoint' => 'ppt',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation' => 'pptx', 'application/rtf' => 'rtf',
    'application/vnd.oasis.opendocument.text' => 'odt', 'application/vnd.oasis.opendocument.spreadsheet' => 'ods',
];

/** Outside the web root, so files are only reachable through signed links. */
function tbv_sa_attachment_dir() { return dirname(untrailingslashit(ABSPATH)) . '/support-attachments'; }
function tbv_sa_attachment_sig($op, $path, $exp, $type) { return hash_hmac('sha256', "{$op}|{$path}|{$exp}|{$type}", wp_salt('auth')); }
function tbv_sa_attachment_url($op, $path, $type, $ttl) {
    $exp = time() + $ttl;
    return add_query_arg(['op' => $op, 'path' => rawurlencode($path), 'exp' => $exp, 'type' => rawurlencode($type), 'sig' => tbv_sa_attachment_sig($op, $path, $exp, $type)], rest_url('tbv-messages/v1/attachments/object'));
}
function tbv_sa_attachment_path_ok($path) { return is_string($path) && preg_match('#^support/\d+/[A-Za-z0-9]{24}\.[a-z0-9]{2,5}$#', $path); }

add_action('rest_api_init', function () {
    register_rest_route('tbv-messages/v1', '/attachments/upload-url', ['methods' => 'POST', 'permission_callback' => 'is_user_logged_in', 'callback' => function ($request) {
        $data = (array)($request->get_json_params() ?: []);
        $type = strtolower(trim(explode(';', (string)($data['contentType'] ?? ''))[0]));
        $size = (int)($data['size'] ?? 0);
        if (!isset(TBV_SA_ATTACHMENT_TYPES[$type])) return new WP_REST_Response(['ok' => false, 'error' => 'This file type is not supported.'], 400);
        if ($size <= 0 || $size > TBV_SA_ATTACHMENT_MAX) return new WP_REST_Response(['ok' => false, 'error' => 'Attachment must be under 25 MB on this site.'], 400);
        $path = 'support/' . get_current_user_id() . '/' . wp_generate_password(24, false, false) . '.' . TBV_SA_ATTACHMENT_TYPES[$type];
        return ['ok' => true, 'path' => $path, 'uploadUrl' => tbv_sa_attachment_url('put', $path, $type, 15 * MINUTE_IN_SECONDS), 'contentType' => $type];
    }]);
    register_rest_route('tbv-messages/v1', '/attachments/object', ['methods' => ['PUT', 'GET'], 'permission_callback' => '__return_true', 'callback' => function ($request) {
        $op = (string)$request->get_param('op');
        $path = rawurldecode((string)$request->get_param('path'));
        $type = rawurldecode((string)$request->get_param('type'));
        $exp = (int)$request->get_param('exp');
        $valid = in_array($op, ['put', 'get'], true) && tbv_sa_attachment_path_ok($path) && isset(TBV_SA_ATTACHMENT_TYPES[$type]) && $exp >= time()
            && hash_equals(tbv_sa_attachment_sig($op, $path, $exp, $type), (string)$request->get_param('sig')) && ($op === 'put') === ($request->get_method() === 'PUT');
        if (!$valid) return new WP_REST_Response(['ok' => false, 'error' => 'This link is invalid or expired.'], 403);
        $file = tbv_sa_attachment_dir() . '/' . $path;
        if ($op === 'put') {
            $body = $request->get_body();
            if ($body === '' || strlen($body) > TBV_SA_ATTACHMENT_MAX) return new WP_REST_Response(['ok' => false, 'error' => 'Attachment must be under 25 MB on this site.'], 413);
            if (file_exists($file)) return new WP_REST_Response(['ok' => false, 'error' => 'Already uploaded.'], 409);
            wp_mkdir_p(dirname($file));
            file_put_contents($file, $body);
            return ['ok' => true];
        }
        if (!is_file($file)) return new WP_REST_Response(['ok' => false, 'error' => 'Not found.'], 404);
        $inline = str_starts_with($type, 'image/') || str_starts_with($type, 'video/') || $type === 'application/pdf';
        header('Content-Type: ' . $type);
        header('Content-Length: ' . filesize($file));
        header('X-Content-Type-Options: nosniff');
        header('Cache-Control: private, max-age=3600');
        header('Content-Disposition: ' . ($inline ? 'inline' : 'attachment') . '; filename="' . basename($file) . '"');
        readfile($file);
        exit;
    }]);
    register_rest_route('tbv-messages/v1', '/attachments/access', ['methods' => 'POST', 'permission_callback' => 'is_user_logged_in', 'callback' => function ($request) {
        global $wpdb;
        $items = (array)(($request->get_json_params() ?: [])['attachments'] ?? []);
        $user = wp_get_current_user();
        $out = [];
        foreach (array_slice($items, 0, 100) as $item) {
            $path = (string)($item['path'] ?? '');
            $field = (string)($item['field'] ?? '');
            if (!tbv_sa_attachment_path_ok($path) || !in_array($field, ['message', 'admin_reply'], true)) continue;
            // Same rule as live: the message must be the visitor's (or any, for a shop manager) and must contain the file.
            $row = $wpdb->get_row($wpdb->prepare('SELECT email, ' . $field . ' AS body FROM ' . tbv_sa_messages_table() . ' WHERE id = %d', (int)($item['messageId'] ?? 0)), ARRAY_A);
            if (!$row || (!tbv_sa_can() && strtolower($row['email']) !== strtolower($user->user_email)) || !str_contains((string)$row['body'], $path)) continue;
            $type = array_search(pathinfo($path, PATHINFO_EXTENSION), TBV_SA_ATTACHMENT_TYPES, true);
            if ($type) $out[] = ['reference' => $path, 'url' => tbv_sa_attachment_url('get', $path, $type, HOUR_IN_SECONDS)];
        }
        return ['ok' => true, 'attachments' => $out];
    }]);
});
