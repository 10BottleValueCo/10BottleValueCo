<?php
/**
 * Plugin Name: 10BottleValue affiliates and store credit
 * Description: The live storefront's referral program and store credit on WooCommerce. 5% off a referred customer's first paid order, 10% commission on every paid order from that customer, held 6/10/15 days before it is available, admin-recorded payouts, and admin-issued store credit that pays only when it covers the whole order.
 * Version: 0.1.0
 * Requires Plugins: woocommerce
 * Requires PHP: 8.1
 */
defined('ABSPATH') || exit;

const TBV_AC_SCHEMA_VERSION = '1';
// Fixed on live: api/_affiliate-quote.js rejects any other rule.
const TBV_AC_DISCOUNT_BPS = 500;
const TBV_AC_COMMISSION_BPS = 1000;
const TBV_AC_RULE_VERSION = 'live-2026-10-29';
const TBV_AC_GATEWAY_ID = 'tbv_store_credit';
const TBV_AC_COOKIE = 'tbv_affiliate';
const TBV_AC_PAID_STATUSES = ['processing', 'completed'];
const TBV_AC_REVERSED_STATUSES = ['cancelled', 'refunded', 'failed'];
const TBV_AC_HOLD_DAYS = ['us-warehouse' => 6, 'express' => 10, 'standard' => 15];

function tbv_ac_table($name) {
    global $wpdb;
    return $wpdb->prefix . 'tbv_ac_' . $name;
}

/* ---------- Schema ---------- */

function tbv_ac_install() {
    global $wpdb;
    require_once ABSPATH . 'wp-admin/includes/upgrade.php';
    $c = $wpdb->get_charset_collate();
    dbDelta("CREATE TABLE " . tbv_ac_table('affiliates') . " (
  id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  code varchar(64) NOT NULL,
  email varchar(254) NOT NULL,
  active tinyint(1) NOT NULL DEFAULT 1,
  source_key varchar(191) DEFAULT NULL,
  created_at datetime NOT NULL,
  updated_at datetime NOT NULL,
  PRIMARY KEY  (id),
  UNIQUE KEY code (code),
  KEY email (email(100))
) ENGINE=InnoDB {$c};");
    // A customer's affiliate, fixed by their first paid referred order.
    dbDelta("CREATE TABLE " . tbv_ac_table('customers') . " (
  email varchar(254) NOT NULL,
  affiliate_code varchar(64) NOT NULL,
  order_id bigint(20) unsigned DEFAULT NULL,
  locked_at datetime NOT NULL,
  PRIMARY KEY  (email(191))
) ENGINE=InnoDB {$c};");
    dbDelta("CREATE TABLE " . tbv_ac_table('commissions') . " (
  order_id bigint(20) unsigned NOT NULL,
  order_number varchar(64) NOT NULL,
  affiliate_code varchar(64) NOT NULL,
  customer_email varchar(254) NOT NULL,
  subtotal_cents bigint(20) NOT NULL,
  commission_cents bigint(20) NOT NULL,
  shipping_type varchar(20) NOT NULL,
  status varchar(20) NOT NULL,
  paid_at datetime NOT NULL,
  updated_at datetime NOT NULL,
  PRIMARY KEY  (order_id),
  KEY affiliate_code (affiliate_code)
) ENGINE=InnoDB {$c};");
    dbDelta("CREATE TABLE " . tbv_ac_table('payouts') . " (
  id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  affiliate_code varchar(64) NOT NULL,
  amount_cents bigint(20) NOT NULL,
  note varchar(500) NOT NULL DEFAULT '',
  source_key varchar(191) DEFAULT NULL,
  created_by bigint(20) unsigned NOT NULL DEFAULT 0,
  created_at datetime NOT NULL,
  PRIMARY KEY  (id),
  KEY affiliate_code (affiliate_code)
) ENGINE=InnoDB {$c};");
    dbDelta("CREATE TABLE " . tbv_ac_table('credit_balances') . " (
  email varchar(254) NOT NULL,
  balance_cents bigint(20) NOT NULL DEFAULT 0,
  updated_at datetime NOT NULL,
  PRIMARY KEY  (email(191))
) ENGINE=InnoDB {$c};");
    // Every balance change, with the balance it produced.
    dbDelta("CREATE TABLE " . tbv_ac_table('credit_ledger') . " (
  id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  email varchar(254) NOT NULL,
  kind varchar(30) NOT NULL,
  delta_cents bigint(20) NOT NULL,
  balance_after_cents bigint(20) NOT NULL,
  order_id bigint(20) unsigned DEFAULT NULL,
  note varchar(500) NOT NULL DEFAULT '',
  idempotency_key varchar(100) DEFAULT NULL,
  actor_id bigint(20) unsigned NOT NULL DEFAULT 0,
  created_at datetime NOT NULL,
  PRIMARY KEY  (id),
  UNIQUE KEY idempotency_key (idempotency_key),
  KEY email (email(100)),
  KEY order_id (order_id)
) ENGINE=InnoDB {$c};");
    update_option('tbv_ac_schema_version', TBV_AC_SCHEMA_VERSION, false);
}
register_activation_hook(__FILE__, 'tbv_ac_install');
add_action('plugins_loaded', function () {
    if (get_option('tbv_ac_schema_version') !== TBV_AC_SCHEMA_VERSION) tbv_ac_install();
});

/* ---------- Helpers ---------- */

function tbv_ac_now() { return gmdate('Y-m-d H:i:s'); }
function tbv_ac_code($value) {
    $code = strtoupper(trim((string)$value));
    return preg_match('/^[A-Z0-9_-]{1,64}$/', $code) ? $code : '';
}
function tbv_ac_email($value) { return strtolower(trim(sanitize_email((string)$value))); }
function tbv_ac_cents($value) { return (int)round(((float)$value) * 100); }
/** Exact two-decimal money string to cents, or null. */
function tbv_ac_parse_money($value) {
    $text = trim((string)$value);
    if (!preg_match('/^\d{1,9}(\.\d{1,2})?$/', $text)) return null;
    [$whole, $fraction] = array_pad(explode('.', $text), 2, '');
    return (int)$whole * 100 + (int)str_pad($fraction, 2, '0');
}
function tbv_ac_money($cents) { return number_format($cents / 100, 2, '.', ''); }

function tbv_ac_affiliate($code) {
    global $wpdb;
    $code = tbv_ac_code($code);
    if ($code === '') return null;
    return $wpdb->get_row($wpdb->prepare('SELECT * FROM ' . tbv_ac_table('affiliates') . ' WHERE code = %s', $code), ARRAY_A) ?: null;
}
function tbv_ac_affiliate_for_email($email) {
    global $wpdb;
    $email = tbv_ac_email($email);
    if ($email === '') return null;
    return $wpdb->get_row($wpdb->prepare('SELECT * FROM ' . tbv_ac_table('affiliates') . ' WHERE email = %s ORDER BY id LIMIT 1', $email), ARRAY_A) ?: null;
}
function tbv_ac_active_affiliate($code) {
    $affiliate = tbv_ac_affiliate($code);
    return $affiliate && (int)$affiliate['active'] === 1 ? $affiliate : null;
}

/** True when this customer already has a paid order. */
function tbv_ac_customer_has_paid_order($user_id, $email) {
    $query = ['status' => TBV_AC_PAID_STATUSES, 'limit' => 1, 'return' => 'ids'];
    if ($user_id && wc_get_orders($query + ['customer_id' => $user_id])) return true;
    return $email !== '' && (bool)wc_get_orders($query + ['billing_email' => $email]);
}
function tbv_ac_locked_code($email) {
    global $wpdb;
    $email = tbv_ac_email($email);
    if ($email === '') return '';
    return (string)$wpdb->get_var($wpdb->prepare('SELECT affiliate_code FROM ' . tbv_ac_table('customers') . ' WHERE email = %s', $email));
}

/* ---------- Attribution ---------- */

function tbv_ac_session_get($key) {
    return function_exists('WC') && WC()->session ? WC()->session->get($key) : null;
}
function tbv_ac_session_set($key, $value) {
    if (function_exists('WC') && WC()->session) WC()->session->set($key, $value);
}

/** Code the browser brought: typed at the cart, then referral link, then sign-up. */
function tbv_ac_candidate_code($user_id) {
    foreach ([tbv_ac_session_get('tbv_affiliate_code'), $_COOKIE[TBV_AC_COOKIE] ?? '', $user_id ? get_user_meta($user_id, 'tbv_affiliate_code', true) : ''] as $value) {
        $code = tbv_ac_code(is_string($value) ? wp_unslash($value) : '');
        if ($code !== '') return $code;
    }
    return '';
}

/**
 * The affiliate for a signed-in customer's next order, as on live: a locked
 * affiliate always wins; otherwise an active code that is not the customer's
 * own, and only before their first paid order. Null when none applies.
 */
function tbv_ac_attribution($user_id, $email) {
    $email = tbv_ac_email($email);
    if (!$user_id || $email === '') return null;
    $locked = tbv_ac_locked_code($email);
    if ($locked !== '') {
        $affiliate = tbv_ac_active_affiliate($locked);
        return $affiliate ? ['code' => $affiliate['code'], 'owner' => $affiliate['email'], 'locked' => true, 'discount' => false] : null;
    }
    $affiliate = tbv_ac_active_affiliate(tbv_ac_candidate_code($user_id));
    if (!$affiliate || tbv_ac_email($affiliate['email']) === $email) return null;
    if (tbv_ac_customer_has_paid_order($user_id, $email)) return null;
    return ['code' => $affiliate['code'], 'owner' => $affiliate['email'], 'locked' => false, 'discount' => !tbv_ac_session_get('tbv_affiliate_discount_removed')];
}
function tbv_ac_current_attribution() {
    $user = wp_get_current_user();
    return $user->exists() ? tbv_ac_attribution($user->ID, $user->user_email) : null;
}

// Referral links: ?c=, ?via=, ?ref=, ?affiliate= or base64 ?s=, like live.
add_action('template_redirect', function () {
    $raw = '';
    if (isset($_GET['s']) && is_string($_GET['s'])) {
        $decoded = base64_decode(wp_unslash($_GET['s']), true);
        if (is_string($decoded)) $raw = $decoded;
    }
    foreach (['c', 'via', 'ref', 'affiliate'] as $key) {
        if ($raw === '' && isset($_GET[$key]) && is_string($_GET[$key])) $raw = wp_unslash($_GET[$key]);
    }
    $affiliate = tbv_ac_active_affiliate($raw);
    if (!$affiliate) return;
    setcookie(TBV_AC_COOKIE, $affiliate['code'], ['expires' => time() + YEAR_IN_SECONDS, 'path' => COOKIEPATH ?: '/', 'secure' => is_ssl(), 'httponly' => true, 'samesite' => 'Lax']);
    $_COOKIE[TBV_AC_COOKIE] = $affiliate['code'];
    tbv_ac_session_set('tbv_affiliate_code', null);
    tbv_ac_session_set('tbv_affiliate_discount_removed', null);
}, 5);

// The larger of the automatic and the affiliate discount applies (live rule);
// tbv-storefront-rules adds the fee and skips both when a promo code is used.
add_filter('tbv_storefront_affiliate_discount', function ($none, $subtotal_cents) {
    $attribution = tbv_ac_current_attribution();
    if (!$attribution || !$attribution['discount']) return $none;
    return ['code' => $attribution['code'], 'cents' => (int)round($subtotal_cents * TBV_AC_DISCOUNT_BPS / 10000)];
}, 10, 2);

/** Shipping type the hold period depends on: US warehouse, express or standard. */
function tbv_ac_order_shipping_type($order) {
    $items = $order->get_items();
    $all_us = $items && function_exists('tbv_storefront_warehouse');
    foreach ($items as $item) {
        if (!$all_us || tbv_storefront_warehouse($item->get_product()) !== 'us') { $all_us = false; break; }
    }
    if ($all_us) return 'us-warehouse';
    foreach ($order->get_shipping_methods() as $method) {
        if ($method->get_meta('tbv_service') === 'express') return 'express';
    }
    return 'standard';
}
function tbv_ac_items_subtotal_cents($order) {
    $cents = 0;
    foreach ($order->get_items() as $item) $cents += tbv_ac_cents($item->get_subtotal());
    return $cents;
}

add_action('woocommerce_checkout_create_order', function ($order) {
    $order->update_meta_data('_tbv_shipping_type', tbv_ac_order_shipping_type($order));
    $attribution = tbv_ac_attribution($order->get_customer_id(), $order->get_billing_email());
    if (!$attribution) return;
    $order->update_meta_data('_tbv_affiliate_code', $attribution['code']);
    $order->update_meta_data('_tbv_affiliate_owner_email', $attribution['owner']);
    $order->update_meta_data('_tbv_affiliate_commission', tbv_ac_money((int)round(tbv_ac_items_subtotal_cents($order) * TBV_AC_COMMISSION_BPS / 10000)));
    $order->update_meta_data('_tbv_affiliate_rule_version', TBV_AC_RULE_VERSION);
    if (!$attribution['discount'] && !$attribution['locked']) $order->update_meta_data('_tbv_affiliate_discount_disabled', '1');
}, 20);

/* ---------- Commission ledger ---------- */

/** Commission is earned when the order is paid and withdrawn if it is cancelled or refunded. */
function tbv_ac_sync_commission($order) {
    global $wpdb;
    $code = tbv_ac_code($order->get_meta('_tbv_affiliate_code'));
    if ($code === '') return;
    $table = tbv_ac_table('commissions');
    $status = $order->get_status();
    if (in_array($status, TBV_AC_PAID_STATUSES, true)) {
        $subtotal = tbv_ac_items_subtotal_cents($order);
        $paid = $order->get_date_paid() ?: $order->get_date_created();
        $wpdb->query($wpdb->prepare(
            "INSERT INTO {$table} (order_id, order_number, affiliate_code, customer_email, subtotal_cents, commission_cents, shipping_type, status, paid_at, updated_at)
             VALUES (%d, %s, %s, %s, %d, %d, %s, 'active', %s, %s)
             ON DUPLICATE KEY UPDATE status = 'active', updated_at = VALUES(updated_at)",
            $order->get_id(), $order->get_order_number(), $code, tbv_ac_email($order->get_billing_email()), $subtotal,
            (int)round($subtotal * TBV_AC_COMMISSION_BPS / 10000), (string)($order->get_meta('_tbv_shipping_type') ?: 'standard'),
            $paid ? $paid->date('Y-m-d H:i:s') : tbv_ac_now(), tbv_ac_now()
        ));
        // The first paid referred order fixes the customer's affiliate.
        $email = tbv_ac_email($order->get_billing_email());
        if ($email !== '') {
            $wpdb->query($wpdb->prepare('INSERT IGNORE INTO ' . tbv_ac_table('customers') . ' (email, affiliate_code, order_id, locked_at) VALUES (%s, %s, %d, %s)', $email, $code, $order->get_id(), tbv_ac_now()));
        }
    } elseif (in_array($status, TBV_AC_REVERSED_STATUSES, true)) {
        $wpdb->update($table, ['status' => 'reversed', 'updated_at' => tbv_ac_now()], ['order_id' => $order->get_id()]);
    }
}
add_action('woocommerce_order_status_changed', function ($order_id, $from, $to, $order) {
    tbv_ac_sync_commission($order instanceof WC_Order ? $order : wc_get_order($order_id));
}, 10, 4);

/** Hold days for a commission row: US warehouse 6, express 10, standard 15. */
function tbv_ac_hold_days($shipping_type) {
    return TBV_AC_HOLD_DAYS[$shipping_type] ?? TBV_AC_HOLD_DAYS['standard'];
}

/** Totals for one affiliate in cents: orders, pending, available (after payouts), paid out. */
function tbv_ac_affiliate_totals($code) {
    global $wpdb;
    $rows = $wpdb->get_results($wpdb->prepare('SELECT commission_cents, shipping_type, paid_at FROM ' . tbv_ac_table('commissions') . " WHERE affiliate_code = %s AND status = 'active'", $code), ARRAY_A);
    $pending = $released = 0;
    $now = time();
    foreach ($rows as $row) {
        $release = strtotime($row['paid_at'] . ' UTC') + tbv_ac_hold_days($row['shipping_type']) * DAY_IN_SECONDS;
        if ($now >= $release) $released += (int)$row['commission_cents']; else $pending += (int)$row['commission_cents'];
    }
    $paid = (int)$wpdb->get_var($wpdb->prepare('SELECT COALESCE(SUM(amount_cents), 0) FROM ' . tbv_ac_table('payouts') . ' WHERE affiliate_code = %s', $code));
    return ['orders' => count($rows), 'pending' => $pending, 'available' => max(0, $released - $paid), 'paid' => $paid];
}

/* ---------- Affiliate administration ---------- */

/** Issue or restore a code for an email, with live's rules. Returns the code or WP_Error. */
function tbv_ac_issue_affiliate($email, $code) {
    global $wpdb;
    $email = tbv_ac_email($email);
    $code = tbv_ac_code($code);
    if (!is_email($email)) return new WP_Error('tbv_ac_email', 'Enter a valid email.');
    if ($code === '') return new WP_Error('tbv_ac_code', 'Codes use letters, numbers, - and _ (up to 64).');
    $owned = tbv_ac_affiliate_for_email($email);
    if ($owned && $owned['code'] !== $code) return new WP_Error('tbv_ac_one_code', sprintf('This email already has affiliate code %s.', $owned['code']));
    $existing = tbv_ac_affiliate($code);
    if ($existing && tbv_ac_email($existing['email']) !== $email) return new WP_Error('tbv_ac_taken', 'That code belongs to another affiliate.');
    if ($existing) {
        $wpdb->update(tbv_ac_table('affiliates'), ['active' => 1, 'updated_at' => tbv_ac_now()], ['id' => $existing['id']]);
    } else {
        $wpdb->insert(tbv_ac_table('affiliates'), ['code' => $code, 'email' => $email, 'active' => 1, 'created_at' => tbv_ac_now(), 'updated_at' => tbv_ac_now()]);
    }
    return $code;
}
function tbv_ac_set_affiliate_active($code, $active) {
    global $wpdb;
    $affiliate = tbv_ac_affiliate($code);
    if (!$affiliate) return new WP_Error('tbv_ac_missing', 'Unknown affiliate code.');
    $wpdb->update(tbv_ac_table('affiliates'), ['active' => $active ? 1 : 0, 'updated_at' => tbv_ac_now()], ['id' => $affiliate['id']]);
    return true;
}
function tbv_ac_record_payout($code, $amount, $note = '') {
    global $wpdb;
    $affiliate = tbv_ac_affiliate($code);
    $cents = tbv_ac_parse_money($amount);
    if (!$affiliate) return new WP_Error('tbv_ac_missing', 'Unknown affiliate code.');
    if (!$cents) return new WP_Error('tbv_ac_amount', 'Enter an amount above zero with up to two decimals.');
    $wpdb->insert(tbv_ac_table('payouts'), [
        'affiliate_code' => $affiliate['code'], 'amount_cents' => $cents,
        'note' => sanitize_text_field($note ?: 'Admin payout ' . gmdate('Y-m-d')),
        'created_by' => get_current_user_id(), 'created_at' => tbv_ac_now(),
    ]);
    return $cents;
}

/* ---------- Store credit ---------- */

function tbv_ac_credit_balance($email) {
    global $wpdb;
    $email = tbv_ac_email($email);
    return $email === '' ? 0 : (int)$wpdb->get_var($wpdb->prepare('SELECT balance_cents FROM ' . tbv_ac_table('credit_balances') . ' WHERE email = %s', $email));
}

/**
 * Change a balance under a row lock and log it. $kind: add, subtract, set or
 * order_payment (a debit). Repeating an idempotency key returns the first
 * result without changing anything. Returns the new balance or WP_Error.
 */
function tbv_ac_credit_change($email, $kind, $cents, $note = '', $order_id = null, $idempotency_key = null) {
    global $wpdb;
    $email = tbv_ac_email($email);
    if (!is_email($email)) return new WP_Error('tbv_ac_email', 'Enter a valid email.');
    if (!in_array($kind, ['add', 'subtract', 'set', 'order_payment'], true) || $cents < 0 || ($kind !== 'set' && $cents === 0)) return new WP_Error('tbv_ac_amount', 'Invalid amount.');
    $balances = tbv_ac_table('credit_balances');
    $ledger = tbv_ac_table('credit_ledger');
    $wpdb->query('START TRANSACTION');
    if ($idempotency_key !== null) {
        $prior = $wpdb->get_var($wpdb->prepare("SELECT balance_after_cents FROM {$ledger} WHERE idempotency_key = %s", $idempotency_key));
        if ($prior !== null) { $wpdb->query('COMMIT'); return (int)$prior; }
    }
    $wpdb->query($wpdb->prepare("INSERT IGNORE INTO {$balances} (email, balance_cents, updated_at) VALUES (%s, 0, %s)", $email, tbv_ac_now()));
    $before = (int)$wpdb->get_var($wpdb->prepare("SELECT balance_cents FROM {$balances} WHERE email = %s FOR UPDATE", $email));
    $after = match ($kind) {
        'add' => $before + $cents,
        'set' => $cents,
        default => $before - $cents,
    };
    if ($after < 0) {
        $wpdb->query('ROLLBACK');
        return new WP_Error('tbv_ac_insufficient', $kind === 'order_payment' ? 'Store credit does not cover this order.' : 'Balance cannot go below zero.');
    }
    $ok = $wpdb->update($balances, ['balance_cents' => $after, 'updated_at' => tbv_ac_now()], ['email' => $email]) !== false
        && $wpdb->insert($ledger, [
            'email' => $email, 'kind' => $kind, 'delta_cents' => $after - $before, 'balance_after_cents' => $after,
            'order_id' => $order_id, 'note' => sanitize_text_field($note), 'idempotency_key' => $idempotency_key,
            'actor_id' => get_current_user_id(), 'created_at' => tbv_ac_now(),
        ]);
    if (!$ok) { $wpdb->query('ROLLBACK'); return new WP_Error('tbv_ac_write', 'Store credit could not be saved.'); }
    $wpdb->query('COMMIT');
    return $after;
}

/**
 * Admin balance change. WooCommerce sign-up does not prove email ownership, so
 * credit only goes to an existing account; otherwise whoever registered the
 * email first would receive it.
 */
function tbv_ac_admin_credit_change($email, $kind, $cents, $note) {
    if (!get_user_by('email', tbv_ac_email($email))) return new WP_Error('tbv_ac_no_account', 'No customer account uses this email yet.');
    return tbv_ac_credit_change($email, $kind, $cents, $note);
}

/* ---------- Email ownership ----------
 * Credit balances and affiliate panels are keyed by email, and WooCommerce
 * sign-up does not prove the address. On the real store a new account must
 * confirm its email before either applies. Accounts the legacy migration
 * created (their owners sign in through a password-reset email) and shop
 * managers count as confirmed. Staging (synthetic accounts, no email) skips it.
 */
function tbv_ac_require_verified_email() {
    $production = function_exists('tbv_store_mode') ? tbv_store_mode() === 'production' : wp_get_environment_type() === 'production';
    return (bool)apply_filters('tbv_ac_require_verified_email', $production);
}
function tbv_ac_email_verified($user) {
    if (!$user || !$user->exists()) return false;
    if (!tbv_ac_require_verified_email() || user_can($user, 'manage_woocommerce')) return true;
    if (get_user_meta($user->ID, '_tbv_email_verified', true) === '1') return true;
    global $wpdb;
    $map = $wpdb->prefix . 'tbv_legacy_map';
    return $wpdb->get_var($wpdb->prepare('SHOW TABLES LIKE %s', $map)) === $map
        && (bool)$wpdb->get_var($wpdb->prepare("SELECT 1 FROM {$map} WHERE entity = 'user' AND wp_id = %d LIMIT 1", $user->ID));
}
/** The signed-in user's email for credit and affiliate access, or '' until confirmed. */
function tbv_ac_owned_email($user = null) {
    $user = $user ?: wp_get_current_user();
    return tbv_ac_email_verified($user) ? tbv_ac_email($user->user_email) : '';
}
function tbv_ac_verify_link($user_id) {
    $exp = time() + 7 * DAY_IN_SECONDS;
    $sig = hash_hmac('sha256', "verify|{$user_id}|{$exp}", wp_salt('auth'));
    return add_query_arg('tbv_verify', "{$user_id}.{$exp}.{$sig}", wc_get_page_permalink('myaccount'));
}
function tbv_ac_send_verification($user_id) {
    $user = get_userdata($user_id);
    if (!$user || get_transient('tbv_ac_verify_sent_' . $user_id)) return false;
    set_transient('tbv_ac_verify_sent_' . $user_id, 1, 5 * MINUTE_IN_SECONDS);
    return wp_mail($user->user_email, 'Confirm your email for 10BottleValueCo', "Hi,\n\nPlease confirm this email address to use store credit and the affiliate dashboard on your 10BottleValueCo account:\n\n" . tbv_ac_verify_link($user_id) . "\n\nThe link works for 7 days. If you did not create an account, ignore this email.\n\n10BottleValueCo");
}
add_action('woocommerce_created_customer', function ($customer_id) {
    if (!tbv_ac_require_verified_email()) return;
    update_user_meta($customer_id, '_tbv_email_verified', '0');
    tbv_ac_send_verification($customer_id);
});
add_action('template_redirect', function () {
    if (isset($_GET['tbv_verify'])) {
        $parts = explode('.', (string)wp_unslash($_GET['tbv_verify']));
        $ok = count($parts) === 3 && ctype_digit($parts[0]) && ctype_digit($parts[1]) && (int)$parts[1] >= time()
            && hash_equals(hash_hmac('sha256', "verify|{$parts[0]}|{$parts[1]}", wp_salt('auth')), $parts[2]) && get_userdata((int)$parts[0]);
        if ($ok) update_user_meta((int)$parts[0], '_tbv_email_verified', '1');
        if (function_exists('wc_add_notice')) wc_add_notice($ok ? 'Your email is confirmed.' : 'That confirmation link is invalid or has expired. Sign in to get a new one.', $ok ? 'success' : 'error');
        wp_safe_redirect(wc_get_page_permalink('myaccount'));
        exit;
    }
    if (isset($_GET['tbv_verify_resend']) && is_user_logged_in() && wp_verify_nonce((string)($_GET['_wpnonce'] ?? ''), 'tbv_verify_resend')) {
        $sent = tbv_ac_send_verification(get_current_user_id());
        if (function_exists('wc_add_notice')) wc_add_notice($sent ? 'We sent a new confirmation link.' : 'A confirmation link was sent a few minutes ago; please check your inbox.', 'notice');
        wp_safe_redirect(wc_get_page_permalink('myaccount'));
        exit;
    }
});
add_action('woocommerce_account_content', function () {
    $user = wp_get_current_user();
    if (!$user->exists() || tbv_ac_email_verified($user)) return;
    printf('<p class="woocommerce-info">Please confirm your email to use store credit and the affiliate dashboard. <a href="%s">Send the link again</a></p>', esc_url(wp_nonce_url(add_query_arg('tbv_verify_resend', '1', wc_get_page_permalink('myaccount')), 'tbv_verify_resend')));
}, 1);

/** Live applies credit only when it covers the whole total. */
function tbv_ac_credit_covers_cart() {
    $email = tbv_ac_owned_email();
    if ($email === '' || !WC()->cart || WC()->cart->is_empty()) return false;
    $total = tbv_ac_cents(WC()->cart->get_total('edit'));
    return $total > 0 && tbv_ac_credit_balance($email) >= $total;
}

add_action('plugins_loaded', function () {
    if (!class_exists('WC_Payment_Gateway')) return;
    class TBV_Store_Credit_Gateway extends WC_Payment_Gateway {
        public function __construct() {
            $this->id = TBV_AC_GATEWAY_ID;
            $this->method_title = 'Store credit';
            $this->method_description = 'Pays the whole order from the customer\'s store credit balance.';
            $this->title = 'Store credit';
            $this->has_fields = false;
            $this->supports = ['products'];
            $this->enabled = 'yes';
        }
        public function is_available() {
            return is_admin() && !wp_doing_ajax() ? true : tbv_ac_credit_covers_cart();
        }
        public function process_payment($order_id) {
            $order = wc_get_order($order_id);
            if (!$order || $order->get_customer_id() !== get_current_user_id()) return ['result' => 'failure'];
            // The balance belongs to the signed-in account, never to the billing email typed at checkout.
            $email = tbv_ac_owned_email();
            if ($email === '') { wc_add_notice('Confirm your email to pay with store credit.', 'error'); return ['result' => 'failure']; }
            $cents = tbv_ac_cents($order->get_total());
            $result = tbv_ac_credit_change($email, 'order_payment', $cents, 'Order ' . $order->get_order_number(), $order->get_id(), 'order-' . $order->get_id());
            if (is_wp_error($result)) {
                wc_add_notice($result->get_error_message(), 'error');
                return ['result' => 'failure'];
            }
            $order->update_meta_data('_tbv_store_credit_used', tbv_ac_money($cents));
            $order->save();
            $order->payment_complete('store-credit-' . $order->get_id());
            WC()->cart->empty_cart();
            return ['result' => 'success', 'redirect' => $this->get_return_url($order)];
        }
    }
}, 11);
add_filter('woocommerce_payment_gateways', function ($gateways) {
    if (class_exists('TBV_Store_Credit_Gateway')) $gateways[] = 'TBV_Store_Credit_Gateway';
    return $gateways;
});

/* ---------- Store API: cart data and the cart code box ---------- */

add_action('woocommerce_blocks_loaded', function () {
    if (!function_exists('woocommerce_store_api_register_endpoint_data')) return;
    woocommerce_store_api_register_endpoint_data([
        'endpoint' => \Automattic\WooCommerce\StoreApi\Schemas\V1\CartSchema::IDENTIFIER,
        'namespace' => 'tbv-affiliate',
        'schema_callback' => fn() => [],
        'schema_type' => ARRAY_A,
        'data_callback' => function () {
            $attribution = tbv_ac_current_attribution();
            $user = wp_get_current_user();
            return [
                'affiliateCode' => $attribution['code'] ?? '',
                'affiliateLocked' => (bool)($attribution['locked'] ?? false),
                'storeCredit' => tbv_ac_owned_email($user) !== '' ? tbv_ac_credit_balance(tbv_ac_owned_email($user)) : 0,
                'storeCreditCovers' => tbv_ac_credit_covers_cart(),
                'creditGatewayId' => TBV_AC_GATEWAY_ID,
            ];
        },
    ]);
    woocommerce_store_api_register_update_callback([
        'namespace' => 'tbv-affiliate',
        'callback' => function ($data) {
            $fail = fn($message) => throw new \Automattic\WooCommerce\StoreApi\Exceptions\RouteException('tbv_affiliate_code', $message, 400);
            if (($data['action'] ?? '') === 'remove') {
                // Like live: the buyer declines the discount, attribution stays.
                tbv_ac_session_set('tbv_affiliate_discount_removed', true);
                return;
            }
            $user = wp_get_current_user();
            if (!$user->exists()) $fail('Sign in to use an affiliate code.');
            $affiliate = tbv_ac_active_affiliate($data['code'] ?? '');
            if (!$affiliate) $fail('Invalid promo code.');
            if (tbv_ac_email($affiliate['email']) === tbv_ac_email($user->user_email)) $fail('You cannot use your own affiliate code.');
            $locked = tbv_ac_locked_code($user->user_email);
            if ($locked !== '' && $locked !== $affiliate['code']) $fail('Your account is already linked to another affiliate.');
            if ($locked === '' && tbv_ac_customer_has_paid_order($user->ID, tbv_ac_email($user->user_email))) $fail('Affiliate codes apply to a first order only.');
            tbv_ac_session_set('tbv_affiliate_code', $affiliate['code']);
            tbv_ac_session_set('tbv_affiliate_discount_removed', null);
        },
    ]);
});

/* ---------- REST: the account affiliate panel (same shape as live /api/affiliate-account) ---------- */

add_action('rest_api_init', function () {
    register_rest_route('tbv-affiliates/v1', '/account', [
        'methods' => 'GET',
        'permission_callback' => fn($request) => $request->get_param('code') !== null || is_user_logged_in(),
        'callback' => 'tbv_ac_rest_account',
    ]);
});
function tbv_ac_rest_account($request) {
    global $wpdb;
    if ($request->get_param('code') !== null) {
        $code = tbv_ac_code($request->get_param('code'));
        if ($code === '') return new WP_REST_Response(['ok' => false, 'error' => 'Invalid affiliate code.'], 400);
        $affiliate = tbv_ac_affiliate($code);
        return ['ok' => true, 'affiliate' => $affiliate ? ['code' => $affiliate['code'], 'active' => (int)$affiliate['active'] === 1] : null];
    }
    $user = wp_get_current_user();
    $affiliate = tbv_ac_owned_email($user) !== '' ? tbv_ac_affiliate_for_email($user->user_email) : null;
    $empty = ['ledgerRows' => [], 'codeColumnOrders' => [], 'codeMetadataOrders' => [], 'payoutsTotal' => 0, 'hasMore' => false];
    if (!$affiliate) return ['ok' => true, 'affiliate' => null] + $empty;
    $page = $empty;
    if ($request->get_param('orders') === '1') {
        $offset = max(0, min(100000, (int)$request->get_param('offset')));
        $rows = $wpdb->get_results($wpdb->prepare('SELECT * FROM ' . tbv_ac_table('commissions') . ' WHERE affiliate_code = %s ORDER BY paid_at DESC LIMIT 100 OFFSET %d', $affiliate['code'], $offset), ARRAY_A);
        foreach ($rows as $row) {
            $paid = gmdate('c', strtotime($row['paid_at'] . ' UTC'));
            $active = $row['status'] === 'active';
            $page['ledgerRows'][] = ['order_id' => $row['order_number'], 'affiliate_code' => $row['affiliate_code'], 'commission_amount' => $active ? tbv_ac_money((int)$row['commission_cents']) : '0.00', 'shipping_type' => $row['shipping_type'], 'created_at' => $paid];
            $page['codeMetadataOrders'][] = ['id' => $row['order_number'], 'status' => $active ? 'paid' : 'refunded', 'created_at' => $paid, 'total' => null, 'affiliate_code' => '', 'metadata' => [
                'affiliateCode' => $row['affiliate_code'], 'subtotal' => (float)tbv_ac_money((int)$row['subtotal_cents']), 'paidAt' => $paid,
                'shippingType' => $row['shipping_type'], 'allItemsUs' => $row['shipping_type'] === 'us-warehouse', 'affiliateCommission' => (float)tbv_ac_money($active ? (int)$row['commission_cents'] : 0),
            ]];
        }
        $page['hasMore'] = count($rows) === 100;
        if ($offset === 0) $page['payoutsTotal'] = (float)tbv_ac_money(tbv_ac_affiliate_totals($affiliate['code'])['paid']);
    }
    return ['ok' => true, 'affiliate' => ['code' => $affiliate['code'], 'email' => tbv_ac_email($user->user_email), 'active' => (int)$affiliate['active'] === 1, 'created_at' => gmdate('c', strtotime($affiliate['created_at'] . ' UTC'))]] + $page;
}

/* ---------- Admin pages ---------- */

add_action('admin_menu', function () {
    add_submenu_page('woocommerce', 'Affiliates', 'Affiliates', 'manage_woocommerce', 'tbv-affiliates', 'tbv_ac_affiliates_page');
    add_submenu_page('woocommerce', 'Store credit', 'Store credit', 'manage_woocommerce', 'tbv-store-credit', 'tbv_ac_credit_page');
});

function tbv_ac_admin_redirect($page, $args) {
    wp_safe_redirect(add_query_arg($args, admin_url('admin.php?page=' . $page)));
    exit;
}
function tbv_ac_admin_notice() {
    foreach (['tbv_ok' => 'notice-success', 'tbv_error' => 'notice-error'] as $key => $class) {
        if (!empty($_GET[$key])) printf('<div class="notice %s"><p>%s</p></div>', $class, esc_html(wp_unslash($_GET[$key])));
    }
}
add_action('admin_post_tbv_ac_affiliate', function () {
    if (!current_user_can('manage_woocommerce')) wp_die('Not allowed.');
    check_admin_referer('tbv_ac_affiliate');
    $action = sanitize_key($_POST['tbv_action'] ?? '');
    $code = wp_unslash($_POST['code'] ?? '');
    $result = match ($action) {
        'issue' => tbv_ac_issue_affiliate(wp_unslash($_POST['email'] ?? ''), $code),
        'revoke' => tbv_ac_set_affiliate_active($code, false),
        'restore' => tbv_ac_set_affiliate_active($code, true),
        'payout' => tbv_ac_record_payout($code, wp_unslash($_POST['amount'] ?? ''), wp_unslash($_POST['note'] ?? '')),
        default => new WP_Error('tbv_ac_action', 'Unknown action.'),
    };
    tbv_ac_admin_redirect('tbv-affiliates', is_wp_error($result) ? ['tbv_error' => $result->get_error_message()] : ['tbv_ok' => 'Saved.']);
});
function tbv_ac_affiliates_page() {
    global $wpdb;
    $rows = $wpdb->get_results('SELECT * FROM ' . tbv_ac_table('affiliates') . ' ORDER BY created_at DESC', ARRAY_A);
    $form = fn($fields, $label, $class = 'button') => sprintf('<form method="post" action="%s" style="display:inline-block;margin:0 4px 4px 0">%s%s<button class="%s">%s</button></form>',
        esc_url(admin_url('admin-post.php')), wp_nonce_field('tbv_ac_affiliate', '_wpnonce', true, false) . '<input type="hidden" name="action" value="tbv_ac_affiliate">', $fields, esc_attr($class), esc_html($label));
    echo '<div class="wrap"><h1>Affiliates</h1>';
    tbv_ac_admin_notice();
    echo '<p>Referred customers get 5% off their first paid order. Affiliates earn 10% of the item subtotal on every paid order from customers they referred. Earnings are pending for 6 days (US warehouse), 10 days (express) or 15 days (standard) after payment, then available until a payout is recorded.</p>';
    echo '<h2>Issue affiliate access</h2>';
    echo $form('<input type="hidden" name="tbv_action" value="issue"><input type="email" name="email" placeholder="email" required> <input name="code" placeholder="CODE" required> ', 'Issue code', 'button button-primary');
    echo '<h2>Affiliates</h2><table class="widefat striped"><thead><tr><th>Code</th><th>Email</th><th>Status</th><th>Orders</th><th>Pending</th><th>Unpaid balance</th><th>Paid to date</th><th>Actions</th></tr></thead><tbody>';
    if (!$rows) echo '<tr><td colspan="8">No affiliates yet.</td></tr>';
    foreach ($rows as $row) {
        $t = tbv_ac_affiliate_totals($row['code']);
        $code = '<input type="hidden" name="code" value="' . esc_attr($row['code']) . '">';
        $toggle = (int)$row['active'] === 1
            ? $form($code . '<input type="hidden" name="tbv_action" value="revoke">', 'Revoke')
            : $form($code . '<input type="hidden" name="tbv_action" value="restore">', 'Restore');
        $payout = $form($code . '<input type="hidden" name="tbv_action" value="payout"><input name="amount" placeholder="0.00" size="8" required> <input name="note" placeholder="note (optional)" size="16"> ', 'Record payout');
        printf('<tr><td><strong>%s</strong></td><td>%s</td><td>%s</td><td>%d</td><td>$%s</td><td>$%s</td><td>$%s</td><td>%s%s</td></tr>',
            esc_html($row['code']), esc_html($row['email']), (int)$row['active'] === 1 ? 'Active' : 'Revoked', $t['orders'],
            tbv_ac_money($t['pending']), tbv_ac_money($t['available']), tbv_ac_money($t['paid']), $toggle, $payout);
    }
    echo '</tbody></table></div>';
}

add_action('admin_post_tbv_ac_credit', function () {
    if (!current_user_can('manage_woocommerce')) wp_die('Not allowed.');
    check_admin_referer('tbv_ac_credit');
    $email = tbv_ac_email(wp_unslash($_POST['email'] ?? ''));
    $cents = tbv_ac_parse_money(wp_unslash($_POST['amount'] ?? ''));
    $kind = sanitize_key($_POST['kind'] ?? '');
    $result = $cents === null || !in_array($kind, ['add', 'subtract', 'set'], true)
        ? new WP_Error('tbv_ac_amount', 'Enter an amount with up to two decimals.')
        : tbv_ac_admin_credit_change($email, $kind, $cents, wp_unslash($_POST['note'] ?? ''));
    tbv_ac_admin_redirect('tbv-store-credit', ['email' => rawurlencode($email)] + (is_wp_error($result) ? ['tbv_error' => $result->get_error_message()] : ['tbv_ok' => 'Balance is now $' . tbv_ac_money($result) . '.']));
});
function tbv_ac_credit_page() {
    global $wpdb;
    $email = tbv_ac_email(wp_unslash($_GET['email'] ?? ''));
    echo '<div class="wrap"><h1>Store credit</h1>';
    tbv_ac_admin_notice();
    echo '<p>Store credit pays for an order only when it covers the whole total, as on the live store.</p>';
    printf('<form method="get"><input type="hidden" name="page" value="tbv-store-credit"><input type="email" name="email" value="%s" placeholder="customer email" required> <button class="button">Look up</button></form>', esc_attr($email));
    if ($email !== '') {
        printf('<h2>%s — balance $%s</h2>', esc_html($email), tbv_ac_money(tbv_ac_credit_balance($email)));
        printf('<form method="post" action="%s">%s<input type="hidden" name="action" value="tbv_ac_credit"><input type="hidden" name="email" value="%s"><select name="kind"><option value="add">Add</option><option value="subtract">Subtract</option><option value="set">Set balance to</option></select> <input name="amount" placeholder="0.00" size="8" required> <input name="note" placeholder="note" size="30"> <button class="button button-primary">Save</button></form>',
            esc_url(admin_url('admin-post.php')), wp_nonce_field('tbv_ac_credit', '_wpnonce', true, false), esc_attr($email));
        $history = $wpdb->get_results($wpdb->prepare('SELECT * FROM ' . tbv_ac_table('credit_ledger') . ' WHERE email = %s ORDER BY id DESC LIMIT 100', $email), ARRAY_A);
        echo '<h3>History</h3><table class="widefat striped"><thead><tr><th>Date (UTC)</th><th>Change</th><th>Balance after</th><th>Type</th><th>Order</th><th>Note</th></tr></thead><tbody>';
        if (!$history) echo '<tr><td colspan="6">No changes yet.</td></tr>';
        foreach ($history as $row) {
            printf('<tr><td>%s</td><td>%s$%s</td><td>$%s</td><td>%s</td><td>%s</td><td>%s</td></tr>', esc_html($row['created_at']), (int)$row['delta_cents'] < 0 ? '−' : '+',
                tbv_ac_money(abs((int)$row['delta_cents'])), tbv_ac_money((int)$row['balance_after_cents']), esc_html($row['kind']), $row['order_id'] ? (int)$row['order_id'] : '', esc_html($row['note']));
        }
        echo '</tbody></table>';
    }
    echo '</div>';
}

/* ---------- Legacy bridge: migrated history into the live tables ---------- */

/**
 * Seed affiliates, customer locks, commissions, payouts and store credit
 * balances from rows the tbv-legacy-migration importer preserved (that
 * importer writes orders without status hooks, so nothing here ran for them).
 * Idempotent: each source row is linked by its source key and is never
 * applied twice; anything that would overwrite a different live value is
 * reported as a conflict and left alone. $dry_run writes nothing.
 */
function tbv_ac_import_legacy($dry_run = false) {
    global $wpdb;
    $records = $wpdb->prefix . 'tbv_legacy_records';
    if ($wpdb->get_var($wpdb->prepare('SHOW TABLES LIKE %s', $records)) !== $records) return new WP_Error('tbv_ac_no_legacy', 'No migrated records (run wp tbv-migrate import first).');
    $report = ['dry_run' => (bool)$dry_run, 'counts' => [], 'issues' => []];
    $count = function ($entity, $outcome) use (&$report) { $report['counts'][$entity][$outcome] = ($report['counts'][$entity][$outcome] ?? 0) + 1; };
    $issue = function ($entity, $key, $code) use (&$report, $count) { $count($entity, 'skipped'); $report['issues'][] = "{$entity}|{$key}|{$code}"; };
    $rows = fn($entity) => $wpdb->get_results($wpdb->prepare("SELECT * FROM {$records} WHERE entity = %s ORDER BY source_key", $entity), ARRAY_A);
    $when = fn($row) => $row['occurred_at'] ?: tbv_ac_now();
    $write = fn($table, $data) => $dry_run || $wpdb->insert(tbv_ac_table($table), $data);

    foreach ($rows('affiliates') as $row) {
        $code = tbv_ac_code($row['affiliate_code']);
        $email = tbv_ac_email($row['email']);
        if ($code === '' || !is_email($email)) { $issue('affiliates', $row['source_key'], 'invalid_code_or_email'); continue; }
        $existing = tbv_ac_affiliate($code);
        if ($existing && $existing['source_key'] === $row['source_key']) { $count('affiliates', 'unchanged'); continue; }
        if ($existing || tbv_ac_affiliate_for_email($email)) { $issue('affiliates', $row['source_key'], 'conflict_existing_affiliate'); continue; }
        $write('affiliates', ['code' => $code, 'email' => $email, 'active' => $row['state'] === 'active' ? 1 : 0, 'source_key' => $row['source_key'], 'created_at' => $when($row), 'updated_at' => tbv_ac_now()]);
        $count('affiliates', 'created');
        // Commissions accrue by code; the account panel needs a login with this email.
        if (!get_user_by('email', $email)) $report['issues'][] = "affiliates|{$row['source_key']}|affiliate_email_has_no_account";
    }

    foreach ($rows('affiliate_customers') as $row) {
        $code = tbv_ac_code($row['affiliate_code']);
        $email = tbv_ac_email($row['email']);
        if ($code === '' || $email === '') { $issue('affiliate_customers', $row['source_key'], 'invalid_code_or_email'); continue; }
        $locked = tbv_ac_locked_code($email);
        if ($locked === $code) { $count('affiliate_customers', 'unchanged'); continue; }
        if ($locked !== '') { $issue('affiliate_customers', $row['source_key'], 'conflict_locked_to_other_affiliate'); continue; }
        $write('customers', ['email' => $email, 'affiliate_code' => $code, 'order_id' => null, 'locked_at' => $when($row)]);
        $count('affiliate_customers', 'created');
    }

    // Commissions: the affiliate_orders ledger first, then imported orders whose
    // metadata names an affiliate (live's own fallback), never both for one order.
    $commission = function ($entity, $key, $order, $code, $cents, $shipping, $paid_at) use ($wpdb, $dry_run, $count, $issue) {
        $status = $order->get_status();
        if (!in_array($status, array_merge(TBV_AC_PAID_STATUSES, TBV_AC_REVERSED_STATUSES), true)) { $issue($entity, $key, 'order_not_paid'); return; }
        $existing = $wpdb->get_row($wpdb->prepare('SELECT * FROM ' . tbv_ac_table('commissions') . ' WHERE order_id = %d', $order->get_id()), ARRAY_A);
        if ($existing) {
            $same = $existing['affiliate_code'] === $code && (int)$existing['commission_cents'] === $cents;
            $same ? $count($entity, 'unchanged') : $issue($entity, $key, 'conflict_commission_differs');
            return;
        }
        $shipping = strtolower((string)$shipping);
        if (!$dry_run) $wpdb->insert(tbv_ac_table('commissions'), [
            'order_id' => $order->get_id(), 'order_number' => (string)($order->get_meta('_tbv_source_order_id') ?: $order->get_order_number()), 'affiliate_code' => $code,
            'customer_email' => tbv_ac_email($order->get_billing_email() ?: $order->get_meta('_tbv_source_email')), 'subtotal_cents' => tbv_ac_items_subtotal_cents($order), 'commission_cents' => $cents,
            'shipping_type' => str_contains($shipping, 'us') ? 'us-warehouse' : (str_contains($shipping, 'express') ? 'express' : 'standard'),
            'status' => in_array($status, TBV_AC_PAID_STATUSES, true) ? 'active' : 'reversed', 'paid_at' => $paid_at, 'updated_at' => tbv_ac_now(),
        ]);
        $count($entity, 'created');
    };
    $ledger_orders = [];
    foreach ($rows('affiliate_orders') as $row) {
        $order = $row['wc_order_id'] ? wc_get_order((int)$row['wc_order_id']) : null;
        $code = tbv_ac_code($row['affiliate_code']);
        if (!$order) { $issue('affiliate_orders', $row['source_key'], 'order_not_imported'); continue; }
        if ($code === '' || $row['amount_cents'] === null) { $issue('affiliate_orders', $row['source_key'], 'invalid_row'); continue; }
        $ledger_orders[$order->get_id()] = true;
        $commission('affiliate_orders', $row['source_key'], $order, $code, (int)$row['amount_cents'], $row['kind'], $when($row));
    }
    foreach (wc_get_orders(['limit' => -1, 'meta_key' => '_tbv_legacy_import', 'meta_value' => 'yes']) as $order) {
        $code = tbv_ac_code($order->get_meta('_tbv_affiliate_code'));
        if ($code === '' || isset($ledger_orders[$order->get_id()])) continue;
        $key = (string)$order->get_meta('_tbv_source_order_id');
        $meta = $order->get_meta('_tbv_affiliate_commission');
        $cents = $meta !== '' ? tbv_ac_parse_money($meta) : (int)round(tbv_ac_items_subtotal_cents($order) * TBV_AC_COMMISSION_BPS / 10000);
        if ($cents === null) { $issue('order_metadata', $key, 'invalid_commission'); continue; }
        $source = json_decode((string)$order->get_meta('_tbv_source_row'), true);
        $paid = $order->get_meta('_tbv_source_paid_at') ?: ($order->get_date_paid() ? $order->get_date_paid()->date('c') : $order->get_date_created()->date('c'));
        $commission('order_metadata', $key, $order, $code, $cents, $source['metadata']['shippingType'] ?? 'standard', gmdate('Y-m-d H:i:s', strtotime($paid)));
        if ($order->get_meta('_tbv_affiliate_commission_adjustment') !== '') $report['issues'][] = "order_metadata|{$key}|commission_adjustment_needs_review";
    }

    foreach ($rows('affiliate_payouts') as $row) {
        $code = tbv_ac_code($row['affiliate_code']);
        if ($code === '' || (int)$row['amount_cents'] <= 0) { $issue('affiliate_payouts', $row['source_key'], 'invalid_row'); continue; }
        $existing = $wpdb->get_row($wpdb->prepare('SELECT * FROM ' . tbv_ac_table('payouts') . ' WHERE source_key = %s', $row['source_key']), ARRAY_A);
        if ($existing) { (int)$existing['amount_cents'] === (int)$row['amount_cents'] ? $count('affiliate_payouts', 'unchanged') : $issue('affiliate_payouts', $row['source_key'], 'conflict_amount_differs'); continue; }
        $payload = json_decode($row['payload'], true) ?: [];
        $write('payouts', ['affiliate_code' => $code, 'amount_cents' => (int)$row['amount_cents'], 'note' => sanitize_text_field((string)($payload['note'] ?? 'Migrated payout')), 'source_key' => $row['source_key'], 'created_by' => 0, 'created_at' => $when($row)]);
        $count('affiliate_payouts', 'created');
        // History is kept even when the code is missing from the affiliates table.
        if (!tbv_ac_affiliate($code)) $report['issues'][] = "affiliate_payouts|{$row['source_key']}|unknown_affiliate_code_imported";
    }

    // Balances: the migrated amount becomes the opening balance, once per source row.
    foreach ($rows('credit_balances') as $row) {
        $email = tbv_ac_email($row['email']);
        $cents = (int)$row['amount_cents'];
        $key = 'legacy-balance:' . $row['source_key'];
        if (!is_email($email)) { $issue('credit_balances', $row['source_key'], 'invalid_email'); continue; }
        // WooCommerce sign-up does not prove email ownership, so a balance only lands
        // on the account the migration itself created for that customer.
        $owner = get_user_by('email', $email);
        if ($cents > 0 && !$owner) { $issue('credit_balances', $row['source_key'], 'no_account_for_email'); continue; }
        if ($cents > 0 && (int)$row['wp_user_id'] !== $owner->ID) { $issue('credit_balances', $row['source_key'], 'email_owner_unverified'); continue; }
        $applied = $wpdb->get_row($wpdb->prepare('SELECT note FROM ' . tbv_ac_table('credit_ledger') . ' WHERE idempotency_key = %s', $key), ARRAY_A);
        if ($applied) { str_contains($applied['note'], $row['payload_hash']) ? $count('credit_balances', 'unchanged') : $issue('credit_balances', $row['source_key'], 'conflict_source_changed_after_import'); continue; }
        if ($cents === 0) { $count('credit_balances', 'zero'); continue; }
        if ($wpdb->get_var($wpdb->prepare('SELECT COUNT(*) FROM ' . tbv_ac_table('credit_ledger') . ' WHERE email = %s', $email))) { $issue('credit_balances', $row['source_key'], 'conflict_live_balance_exists'); continue; }
        if (!$dry_run) {
            $result = tbv_ac_credit_change($email, 'set', $cents, 'Migrated balance ' . $row['payload_hash'], null, $key);
            if (is_wp_error($result)) { $issue('credit_balances', $row['source_key'], 'write_failed'); continue; }
        }
        $count('credit_balances', 'created');
    }
    sort($report['issues']);
    return $report;
}

/* ---------- WP-CLI ---------- */

if (defined('WP_CLI') && WP_CLI) {
    WP_CLI::add_command('tbv-affiliates', new class {
        /** Issue or restore a code. ## OPTIONS <email> <code> */
        public function issue($args) { $r = tbv_ac_issue_affiliate($args[0], $args[1]); is_wp_error($r) ? WP_CLI::error($r->get_error_message()) : WP_CLI::success("Issued {$r}."); }
        /** ## OPTIONS <code> */
        public function revoke($args) { $r = tbv_ac_set_affiliate_active($args[0], false); is_wp_error($r) ? WP_CLI::error($r->get_error_message()) : WP_CLI::success('Revoked.'); }
        /** ## OPTIONS <code> <amount> [<note>] */
        public function payout($args) { $r = tbv_ac_record_payout($args[0], $args[1], $args[2] ?? ''); is_wp_error($r) ? WP_CLI::error($r->get_error_message()) : WP_CLI::success('Recorded $' . tbv_ac_money($r) . '.'); }
        /** ## OPTIONS <code> */
        public function totals($args) { WP_CLI::line(wp_json_encode(tbv_ac_affiliate_totals(tbv_ac_code($args[0])))); }
        /**
         * Seed the live tables from tbv-legacy-migration records.
         * ## OPTIONS [--dry-run] [--report=<path>]
         * @subcommand import-legacy
         */
        public function import_legacy($args, $assoc) {
            $r = tbv_ac_import_legacy(!empty($assoc['dry-run']));
            if (is_wp_error($r)) WP_CLI::error($r->get_error_message());
            if (!empty($assoc['report'])) file_put_contents($assoc['report'], wp_json_encode($r, JSON_PRETTY_PRINT));
            WP_CLI::line(wp_json_encode($r));
        }
    });
    WP_CLI::add_command('tbv-credit', new class {
        /** ## OPTIONS <email> <add|subtract|set> <amount> [<note>] */
        public function adjust($args) {
            $cents = tbv_ac_parse_money($args[2]);
            $r = $cents === null ? new WP_Error('amount', 'Invalid amount.') : tbv_ac_admin_credit_change($args[0], $args[1], $cents, $args[3] ?? 'WP-CLI');
            is_wp_error($r) ? WP_CLI::error($r->get_error_message()) : WP_CLI::success('Balance $' . tbv_ac_money($r));
        }
        /** ## OPTIONS <email> */
        public function balance($args) { WP_CLI::line(tbv_ac_money(tbv_ac_credit_balance($args[0]))); }
    });
}
