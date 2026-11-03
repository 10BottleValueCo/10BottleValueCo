<?php
/**
 * `wp eval-file setup.php`: seeds preconditions in the disposable test database only.
 *  - a WordPress user that already carries a DIFFERENT source user ID (collision case)
 *  - stock management ON with 50 units for every catalog variation, so any stock
 *    reduction by an import would be visible
 */
global $wpdb;
if (DB_NAME !== 'tbv_migration_test') {
    fwrite(STDERR, "Refusing: not the disposable test database\n");
    exit(1);
}
if (!get_user_by('email', 'other.source@example.test')) {
    $id = wp_insert_user(['user_login' => 'other-source-fixture', 'user_email' => 'other.source@example.test',
        'user_pass' => wp_generate_password(32), 'role' => 'customer', 'first_name' => 'PreExisting']);
    update_user_meta($id, '_tbv_source_user_id', 'f0000000-0000-4000-a000-000000000001');
}
$vars = $wpdb->get_col("SELECT ID FROM {$wpdb->posts} WHERE post_type = 'product_variation'");
$in = implode(',', array_map('intval', $vars));
$wpdb->query("DELETE FROM {$wpdb->postmeta} WHERE meta_key IN ('_manage_stock','_stock') AND post_id IN ($in)");
foreach ($vars as $v) {
    $wpdb->insert($wpdb->postmeta, ['post_id' => $v, 'meta_key' => '_manage_stock', 'meta_value' => 'yes']);
    $wpdb->insert($wpdb->postmeta, ['post_id' => $v, 'meta_key' => '_stock', 'meta_value' => '50']);
}
$wpdb->query("UPDATE {$wpdb->prefix}wc_product_meta_lookup SET stock_quantity = 50 WHERE product_id IN ($in)");
update_option('woocommerce_manage_stock', 'yes');
echo json_encode(['variations' => count($vars), 'collision_user' => (bool) get_user_by('email', 'test.customer1@example.test')]);
