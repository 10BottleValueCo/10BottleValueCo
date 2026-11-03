<?php
/**
 * `wp eval-file inspect.php <out.json>`: dumps destination state (read-only) for assertions.
 */
global $wpdb;
$out_path = $args[0] ?? null;
$state = ['orders' => [], 'users' => [], 'records' => [], 'map' => [], 'runs' => []];

$ids = wc_get_orders(['type' => 'shop_order', 'limit' => -1, 'return' => 'ids', 'status' => array_keys(wc_get_order_statuses()),
    'meta_query' => [['key' => '_tbv_legacy_import', 'value' => 'yes']]]);
$mailer = WC()->mailer();
foreach ($ids as $id) {
    $o = wc_get_order($id);
    $items = [];
    foreach ($o->get_items(['line_item', 'shipping', 'fee']) as $item) {
        $row = ['type' => $item->get_type(), 'name' => $item->get_name(), 'total' => $item->get_total()];
        if ($item instanceof WC_Order_Item_Product) {
            $row += ['qty' => $item->get_quantity(), 'product_id' => $item->get_product_id(), 'variation_id' => $item->get_variation_id(),
                'subtotal' => $item->get_subtotal(), 'match' => $item->get_meta('_tbv_catalog_match'), 'unmapped' => $item->get_meta('_tbv_unmapped_line'),
                'dose' => $item->get_meta('Dose')];
            if ($item->get_variation_id() > 0) {
                $v = $item->get_variation_id();
                $row['mapped'] = [get_the_title($item->get_product_id()), (string) get_post_meta($v, '_tbv_dose', true),
                    (string) get_post_meta($v, '_tbv_warehouse', true), (string) get_post_meta($v, '_tbv_pack_size', true), (string) get_post_meta($v, '_tbv_note_label', true)];
            }
        }
        if ($item instanceof WC_Order_Item_Fee) {
            $row['component'] = $item->get_meta('_tbv_component');
        }
        $items[] = $row;
    }
    $meta = [];
    foreach ($o->get_meta_data() as $md) {
        $d = $md->get_data();
        if (str_starts_with($d['key'], '_tbv_') && $d['key'] !== '_tbv_source_row') {
            $meta[$d['key']] = $d['value'];
        }
    }
    $email = $mailer->emails['WC_Email_Customer_Completed_Order'];
    $email->object = $o;
    $paid = $o->get_date_paid();
    $state['orders'][$o->get_meta('_tbv_source_order_id')] = [
        'id' => $o->get_id(), 'number' => $o->get_order_number(), 'status' => $o->get_status(), 'customer_id' => $o->get_customer_id(),
        'total' => $o->get_total(), 'created_gmt' => $o->get_date_created()->date('Y-m-d H:i:s'),
        'paid_gmt' => $paid ? gmdate('Y-m-d H:i:s', $paid->getTimestamp()) : null,
        'payment_method' => $o->get_payment_method(), 'payment_method_title' => $o->get_payment_method_title(),
        'billing_email' => $o->get_billing_email(), 'billing_country' => $o->get_billing_country(), 'billing_state' => $o->get_billing_state(),
        'created_via' => $o->get_created_via(), 'refunds' => count($o->get_refunds()), 'stock_reduced' => (bool) $o->get_order_stock_reduced(),
        'completed_email_enabled' => $email->is_enabled(), 'items' => $items, 'meta' => $meta,
    ];
}
foreach ($wpdb->get_col("SELECT user_id FROM {$wpdb->usermeta} WHERE meta_key = '_tbv_source_user_id'") as $uid) {
    $u = get_userdata((int) $uid);
    $state['users'][get_user_meta($uid, '_tbv_source_user_id', true)] = [
        'id' => $u->ID, 'login' => $u->user_login, 'email' => $u->user_email, 'roles' => $u->roles, 'registered' => $u->user_registered,
        'first_name' => $u->first_name, 'last_name' => $u->last_name,
        'billing_country' => get_user_meta($uid, 'billing_country', true), 'billing_state' => get_user_meta($uid, 'billing_state', true),
        'auth_state' => get_user_meta($uid, '_tbv_auth_state', true), 'pass_set' => strlen($u->user_pass) > 20,
        'revisions' => get_user_meta($uid, '_tbv_source_revisions', true),
    ];
}
foreach (['test.customer1@example.test', 'other.source@example.test'] as $e) {
    $u = get_user_by('email', $e);
    $state['collision_users'][$e] = $u ? ['id' => $u->ID, 'source' => get_user_meta($u->ID, '_tbv_source_user_id', true), 'first_name' => $u->first_name] : null;
}
if (TBV_LM_Schema::exists()) {
    foreach ($wpdb->get_results('SELECT entity, source_key, email, wp_user_id, source_order_id, wc_order_id, affiliate_code, amount_cents, before_cents, balance_cents, kind, state, provider, occurred_at, revisions FROM ' . TBV_LM_Schema::table('records'), ARRAY_A) as $r) {
        $state['records'][$r['entity']][$r['source_key']] = $r;
    }
    foreach ($wpdb->get_results('SELECT entity, source_key, dest_id, revision FROM ' . TBV_LM_Schema::table('map'), ARRAY_A) as $r) {
        $state['map'][$r['entity']][$r['source_key']] = ['dest_id' => (int) $r['dest_id'], 'revision' => (int) $r['revision']];
    }
    $state['runs'] = $wpdb->get_results('SELECT id, status FROM ' . TBV_LM_Schema::table('runs') . ' ORDER BY id', ARRAY_A);
}
$state['tables_exist'] = TBV_LM_Schema::exists();
$state['counts'] = [
    'users' => (int) $wpdb->get_var("SELECT COUNT(*) FROM {$wpdb->users}"),
    'orders' => (int) $wpdb->get_var("SELECT COUNT(*) FROM {$wpdb->prefix}wc_orders WHERE type = 'shop_order'"),
    'refunds' => (int) $wpdb->get_var("SELECT COUNT(*) FROM {$wpdb->prefix}wc_orders WHERE type = 'shop_order_refund'"),
    'orders_with_source_meta' => (int) $wpdb->get_var("SELECT COUNT(*) FROM {$wpdb->prefix}wc_orders_meta WHERE meta_key = '_tbv_source_order_id'"),
    'stock_sum' => (int) $wpdb->get_var("SELECT COALESCE(SUM(meta_value),0) FROM {$wpdb->postmeta} WHERE meta_key = '_stock'"),
    'total_sales_sum' => (int) $wpdb->get_var("SELECT COALESCE(SUM(meta_value),0) FROM {$wpdb->postmeta} WHERE meta_key = 'total_sales'"),
    'lookup_stock_sum' => (int) $wpdb->get_var("SELECT COALESCE(SUM(stock_quantity),0) FROM {$wpdb->prefix}wc_product_meta_lookup"),
];
$state['lock_free'] = (string) $wpdb->get_var("SELECT IS_FREE_LOCK('tbv_legacy_migration')") === '1';
if (isset($state['orders']['INV-A1B2C3D4'])) {
    ob_start();
    TBV_LM_Guards::render(wc_get_order($state['orders']['INV-A1B2C3D4']['id']));
    $state['metabox_o1'] = ob_get_clean();
}
file_put_contents($out_path, json_encode($state, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
