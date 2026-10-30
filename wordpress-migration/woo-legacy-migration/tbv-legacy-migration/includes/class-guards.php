<?php
defined('ABSPATH') || exit;

/**
 * Always-on protections for imported (historical) orders, plus admin-only display.
 *
 * - Stock: imported orders can never reduce or restore stock, even if an admin later
 *   changes their status (they never reduced Woo stock in the first place).
 * - Email: WooCommerce order emails are disabled for imported orders unless
 *   TBV_LM_ALLOW_LEGACY_ORDER_EMAILS is defined true (owner decision).
 * - Order number: imported orders display their historical source order ID / invoice
 *   number instead of the Woo post ID (disable with TBV_LM_SHOW_SOURCE_ORDER_NUMBER=false).
 * - Admin: a read-only "Legacy source record" box on the order screen and admin search
 *   by source order ID. Processor identity is shown only here (admin), never to customers.
 */
final class TBV_LM_Guards
{
    private const ORDER_EMAILS = [
        'new_order', 'cancelled_order', 'failed_order', 'customer_on_hold_order', 'customer_processing_order',
        'customer_completed_order', 'customer_refunded_order', 'customer_partially_refunded_order',
        'customer_invoice', 'customer_note', 'customer_failed_order', 'customer_cancelled_order',
    ];

    public static function register(): void
    {
        add_filter('woocommerce_can_reduce_order_stock', [self::class, 'deny_for_legacy'], PHP_INT_MAX, 2);
        add_filter('woocommerce_can_restore_order_stock', [self::class, 'deny_for_legacy'], PHP_INT_MAX, 2);
        if (!(defined('TBV_LM_ALLOW_LEGACY_ORDER_EMAILS') && TBV_LM_ALLOW_LEGACY_ORDER_EMAILS === true)) {
            foreach (self::ORDER_EMAILS as $id) {
                add_filter('woocommerce_email_enabled_' . $id, [self::class, 'deny_email_for_legacy'], PHP_INT_MAX, 2);
            }
        }
        if (!defined('TBV_LM_SHOW_SOURCE_ORDER_NUMBER') || TBV_LM_SHOW_SOURCE_ORDER_NUMBER !== false) {
            add_filter('woocommerce_order_number', [self::class, 'order_number'], 20, 2);
        }
        add_filter('woocommerce_order_table_search_query_meta_keys', [self::class, 'search_keys']);
        add_action('add_meta_boxes', [self::class, 'meta_box'], 30, 2);
    }

    public static function is_legacy($order): bool
    {
        return $order instanceof WC_Abstract_Order && $order->get_meta('_tbv_legacy_import') === 'yes';
    }

    public static function deny_for_legacy($allowed, $order)
    {
        return self::is_legacy($order) ? false : $allowed;
    }

    public static function deny_email_for_legacy($enabled, $object)
    {
        return self::is_legacy($object) ? false : $enabled;
    }

    public static function order_number($number, $order)
    {
        if (self::is_legacy($order)) {
            $source = (string) $order->get_meta('_tbv_source_order_id');
            return $source !== '' ? $source : $number;
        }
        return $number;
    }

    public static function search_keys($keys)
    {
        $keys = is_array($keys) ? $keys : [];
        $keys[] = '_tbv_source_order_id';
        return array_values(array_unique($keys));
    }

    public static function meta_box($post_type, $post_or_order = null): void
    {
        if (!function_exists('wc_get_page_screen_id')) {
            return;
        }
        $order = $post_or_order instanceof WC_Abstract_Order ? $post_or_order : (($post_or_order instanceof WP_Post) ? wc_get_order($post_or_order->ID) : null);
        if (!self::is_legacy($order) || !current_user_can('edit_shop_orders')) {
            return;
        }
        add_meta_box('tbv-legacy-source', 'Legacy source record (admin only)', [self::class, 'render'], wc_get_page_screen_id('shop-order'), 'side', 'high');
    }

    public static function render($post_or_order): void
    {
        global $wpdb;
        $order = $post_or_order instanceof WC_Abstract_Order ? $post_or_order : wc_get_order($post_or_order->ID);
        if (!$order) {
            return;
        }
        $rows = [
            'Source order ID' => $order->get_meta('_tbv_source_order_id'),
            'Invoice number' => $order->get_meta('_tbv_invoice_number'),
            'Source invoice field' => $order->get_meta('_tbv_source_invoice_id'),
            'Original status' => $order->get_meta('_tbv_source_status'),
            'Created (source)' => $order->get_meta('_tbv_source_created_at'),
            'Paid at (source)' => $order->get_meta('_tbv_source_paid_at'),
            'Payment provider' => $order->get_meta('_tbv_payment_provider'),
            'Payment reference' => $order->get_meta('_tbv_payment_id'),
            'Store credit applied' => TBV_LM_Util::money((int) $order->get_meta('_tbv_store_credit_used_cents')),
            'Affiliate code' => $order->get_meta('_tbv_affiliate_code'),
            'Tracking' => trim($order->get_meta('_tbv_tracking_number') . ' ' . $order->get_meta('_tbv_tracking_number_2')),
            'Unmapped lines' => $order->get_meta('_tbv_unmapped_lines'),
            'Total vs components' => TBV_LM_Util::money((int) $order->get_meta('_tbv_total_mismatch_cents')),
        ];
        echo '<table class="widefat striped" style="border:0"><tbody>';
        foreach ($rows as $label => $value) {
            if ($value === '' || $value === null) {
                continue;
            }
            echo '<tr><th style="padding:4px">' . esc_html($label) . '</th><td style="padding:4px;word-break:break-all">' . esc_html((string) $value) . '</td></tr>';
        }
        echo '</tbody></table>';
        if (TBV_LM_Schema::exists()) {
            $attempts = $wpdb->get_results($wpdb->prepare(
                'SELECT source_key, state, amount_cents, occurred_at FROM ' . TBV_LM_Schema::table('records') . " WHERE entity = 'payment_attempts' AND wc_order_id = %d ORDER BY occurred_at",
                $order->get_id()
            ), ARRAY_A);
            if ($attempts) {
                echo '<p><strong>Payment attempts</strong></p><ul>';
                foreach ($attempts as $a) {
                    echo '<li>' . esc_html($a['source_key'] . ' · ' . $a['state'] . ' · ' . TBV_LM_Util::money((int) $a['amount_cents']) . ' · ' . $a['occurred_at']) . '</li>';
                }
                echo '</ul>';
            }
        }
        echo '<p style="color:#646970">Imported history. Payment status was not re-verified; no emails, stock or payment actions run for this order.</p>';
    }
}
