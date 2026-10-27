<?php
// Staging safety audit: wp --path=wordpress eval-file scripts/audit-staging.php
$log = (string)@file_get_contents(dirname(__DIR__) . '/logs/wp-debug.log');
$orders = wc_get_orders(['limit' => -1]);
$bad = [];
foreach ($orders as $o) {
    if ($o->get_meta('_tbv_staging_test_order') !== '1') $bad[] = $o->get_id() . ':unmarked';
    if ($o->is_paid() || $o->get_date_paid()) $bad[] = $o->get_id() . ':paid';
    if ($o->get_payment_method() !== 'tbv_staging_test') $bad[] = $o->get_id() . ':gateway=' . $o->get_payment_method();
    if ($o->get_meta('_order_stock_reduced') || $o->get_data_store()->get_stock_reduced($o->get_id())) $bad[] = $o->get_id() . ':stock_reduced';
}
$gateways = array_keys(WC()->payment_gateways()->payment_gateways());
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
$report['pass'] = !$bad && $gateways === ['tbv_staging_test'] && !$report['unexpectedPaymentComplete'] && $report['externalHttpBlocked'] && $report['cronDisabled'] && $report['environment'] === 'staging' && !$report['webhooks'] && !$report['apiKeys'];
echo json_encode($report, JSON_PRETTY_PRINT), "\n";
