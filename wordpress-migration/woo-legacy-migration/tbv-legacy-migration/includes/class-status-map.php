<?php
defined('ABSPATH') || exit;

/**
 * Explicit source-status -> WooCommerce status table.
 *
 * Source values come from the storefront code and SQL guards in
 * supabase/migrations (merit_store_credit, paylio_payment_bindings) and the
 * admin status selector in App.jsx. Matching is case-insensitive because the
 * source SQL itself compares lower(coalesce(status,'')); surrounding
 * whitespace is NOT trimmed. Anything not listed fails closed: the order is
 * not imported and is reported.
 *
 * The mapping is a display/lifecycle mapping for historical records only. A
 * source 'paid' does not become a payment verification: the importer never
 * calls payment_complete() and keeps the original status string in
 * _tbv_source_status. The table is filterable for owner-approved changes.
 */
final class TBV_LM_Status_Map
{
    public const MAP = [
        'pending'                => 'pending',
        'checkout'               => 'pending',
        'checkout (clicked pay)' => 'pending',
        'wire_pending'           => 'pending',
        'paid'                   => 'processing',
        'processing'             => 'processing',
        'done'                   => 'completed',
        'shipped'                => 'completed',
        'delivered'              => 'completed',
        'completed'              => 'completed',
        'refunded'               => 'refunded',
        'cancelled'              => 'cancelled',
    ];

    public static function table(): array
    {
        $map = apply_filters('tbv_lm_status_map', self::MAP);
        return is_array($map) ? $map : self::MAP;
    }

    /** @return string|null Woo status without the wc- prefix, or null for unknown */
    public static function map($source_status): ?string
    {
        if (!is_string($source_status)) {
            return null;
        }
        $key = strtolower($source_status);
        $table = self::table();
        return isset($table[$key]) ? $table[$key] : null;
    }
}
