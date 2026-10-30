<?php
// Staging safety audit: wp --path=wordpress eval-file scripts/audit-staging.php
$log = (string)@file_get_contents(dirname(__DIR__) . '/logs/wp-debug.log');
$orders = wc_get_orders(['limit' => -1]);
$bad = [];
foreach ($orders as $o) {
    if ($o->get_meta('_tbv_staging_test_order') !== '1') $bad[] = $o->get_id() . ':unmarked';
    // Paid only with synthetic store credit (debited in the credit ledger) or when an
    // admin test marked it paid to exercise affiliate commission.
    $credit = $o->get_payment_method() === 'tbv_store_credit';
    if (($o->is_paid() || $o->get_date_paid()) && !$credit && $o->get_meta('_tbv_staging_admin_marked_paid') !== '1') $bad[] = $o->get_id() . ':paid';
    if (!in_array($o->get_payment_method(), ['tbv_staging_test', 'tbv_store_credit'], true)) $bad[] = $o->get_id() . ':gateway=' . $o->get_payment_method();
    if ($credit && $o->is_paid() && function_exists('tbv_ac_table') && -(int)$GLOBALS['wpdb']->get_var($GLOBALS['wpdb']->prepare('SELECT COALESCE(SUM(delta_cents), 0) FROM ' . tbv_ac_table('credit_ledger') . " WHERE order_id = %d AND kind = 'order_payment'", $o->get_id())) !== (int)round($o->get_total() * 100)) $bad[] = $o->get_id() . ':credit_ledger_mismatch';
    if ($o->get_meta('_order_stock_reduced') || $o->get_data_store()->get_stock_reduced($o->get_id())) $bad[] = $o->get_id() . ':stock_reduced';
}
$gateways = array_keys(WC()->payment_gateways()->payment_gateways());
sort($gateways);
$report = [
    'orders' => count($orders),
    'orderProblems' => $bad,
    'gateways' => $gateways,
    'unexpectedPaymentComplete' => substr_count($log, 'UNEXPECTED payment_complete'),
    'suppressedEmails' => substr_count($log, 'suppressed email'),
    'externalHttpBlocked' => defined('WP_HTTP_BLOCK_EXTERNAL') && WP_HTTP_BLOCK_EXTERNAL && !defined('WP_ACCESSIBLE_HOSTS'),
    'cronDisabled' => defined('DISABLE_WP_CRON') && DISABLE_WP_CRON,
    'environment' => wp_get_environment_type(),
    'webhooks' => (int)$GLOBALS['wpdb']->get_var("SELECT COUNT(*) FROM {$GLOBALS['wpdb']->prefix}wc_webhooks"),
    'apiKeys' => (int)$GLOBALS['wpdb']->get_var("SELECT COUNT(*) FROM {$GLOBALS['wpdb']->prefix}woocommerce_api_keys"),
];
$report['pass'] = !$bad && $gateways === ['tbv_staging_test', 'tbv_store_credit'] && !$report['unexpectedPaymentComplete'] && $report['externalHttpBlocked'] && $report['cronDisabled'] && $report['environment'] === 'staging' && !$report['webhooks'] && !$report['apiKeys'];
echo json_encode($report, JSON_PRETTY_PRINT), "\n";
