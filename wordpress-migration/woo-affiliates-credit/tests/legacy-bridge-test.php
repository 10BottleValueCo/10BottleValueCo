<?php
/**
 * Legacy bridge test on the DISPOSABLE migration database only.
 *
 *   TBV_MIGRATION_TEST_WP=/path/to/migration-test-site php tests/legacy-bridge-test.php
 *
 * Clones tbv_staging (read-only dump) into tbv_migration_test, imports the
 * synthetic tbv-legacy-migration fixture, empties the live affiliate/credit
 * tables, then checks wp tbv-affiliates import-legacy: dry run writes nothing,
 * the real run creates exactly the expected rows, a rerun changes nothing, and
 * a changed live value is reported instead of overwritten.
 */

$wp_path = (string)getenv('TBV_MIGRATION_TEST_WP');
if ($wp_path === '' || !is_file($wp_path . '/wp-config.php')) { fwrite(STDERR, "Set TBV_MIGRATION_TEST_WP to the disposable migration-test WordPress path.\n"); exit(2); }
$lab = realpath(__DIR__ . '/..');
$legacy = realpath($lab . '/../woo-legacy-migration');
$tmp = sys_get_temp_dir() . '/tbv-ac-bridge-' . getmypid();
@mkdir($tmp, 0700, true);
$pass = 0; $fail = 0;
if (trim(wp(['eval', 'echo DB_NAME;'])[1]) !== 'tbv_migration_test') { fwrite(STDERR, "Refusing: that site is not on tbv_migration_test.\n"); exit(2); }

function check($name, $ok, $detail = '') {
    global $pass, $fail;
    $ok ? $pass++ : $fail++;
    echo ($ok ? 'ok   ' : 'FAIL ') . $name . ($ok ? '' : '  ' . substr(is_string($detail) ? $detail : json_encode($detail), 0, 400)) . "\n";
}
function run(array $argv) {
    $p = proc_open($argv, [1 => ['pipe', 'w'], 2 => ['pipe', 'w']], $pipes);
    $out = stream_get_contents($pipes[1]); $err = stream_get_contents($pipes[2]);
    return [proc_close($p), $out, $err];
}
function wp(array $args) { global $wp_path; return run(array_merge(['wp', '--path=' . $wp_path], $args)); }
function sql($q) { [$c, $out] = run(['mariadb', '-N', '-B', 'tbv_migration_test', '-e', $q]); return trim($out); }
function bridge(array $extra = []) {
    [$code, $out] = wp(array_merge(['tbv-affiliates', 'import-legacy'], $extra));
    $lines = array_values(array_filter(explode("\n", trim($out)), fn($l) => str_starts_with($l, '{')));
    return [$code, json_decode((string)end($lines), true)];
}
const AC_TABLES = 'wp_tbv_ac_affiliates, wp_tbv_ac_customers, wp_tbv_ac_commissions, wp_tbv_ac_payouts, wp_tbv_ac_credit_balances, wp_tbv_ac_credit_ledger';

// Fresh disposable copy, legacy import of the synthetic fixture.
[$c, , $e] = run(['bash', '-c', 'set -o pipefail; mariadb-dump --single-transaction tbv_staging | mariadb tbv_migration_test']);
if ($c !== 0) { fwrite(STDERR, "Reset failed: $e\n"); exit(1); }
sql("DROP TABLE IF EXISTS wp_tbv_legacy_map, wp_tbv_legacy_records, wp_tbv_legacy_runs; DELETE FROM wp_options WHERE option_name = 'tbv_lm_schema_version'");
foreach (['tbv-legacy-migration' => $legacy . '/tbv-legacy-migration', 'tbv-affiliates-credit' => $lab . '/tbv-affiliates-credit'] as $slug => $src) {
    $link = $wp_path . '/wp-content/plugins/' . $slug;
    if (is_link($link) && realpath($link) !== realpath($src)) { fwrite(STDERR, "Refusing: $slug link points elsewhere\n"); exit(1); }
    if (!file_exists($link)) symlink($src, $link);
}
wp(['plugin', 'activate', 'tbv-legacy-migration', 'tbv-affiliates-credit']);
sql("DROP TABLE IF EXISTS wp_tbv_legacy_map, wp_tbv_legacy_records, wp_tbv_legacy_runs; DELETE FROM wp_options WHERE option_name = 'tbv_lm_schema_version'");
foreach (explode(', ', AC_TABLES) as $t) sql("TRUNCATE TABLE {$t}");
wp(['eval-file', $legacy . '/tests/setup.php']);
run(['php', $legacy . '/bin/generate-fixture.php', '--variant=base', '--out=' . $tmp . '/base.json']);
[$c, $out, $err] = wp(['tbv-migrate', 'import', $tmp . '/base.json', '--report=' . $tmp . '/import.json']);
check('legacy fixture imported', in_array($c, [0, 2], true) && is_file($tmp . '/import.json'), $err);

$checksum = fn() => sql('CHECKSUM TABLE ' . AC_TABLES);
$before = $checksum();
[$c, $dry] = bridge(['--dry-run']);
check('dry run writes nothing', $c === 0 && $checksum() === $before, $dry);
check('dry run reports the planned rows', ($dry['counts']['affiliates']['created'] ?? 0) === 2 && ($dry['counts']['affiliate_payouts']['created'] ?? 0) === 4, $dry['counts'] ?? null);

[$c, $r] = bridge();
check('bridge runs', $c === 0 && is_array($r), $r);
// INV-COLLIDE1's commission never reaches the bridge: the importer already
// held it back (order_not_imported) and preserved no record for it.
$expected_issues = [
    'affiliate_payouts|4|unknown_affiliate_code_imported',
    'affiliates|OLDPARTNER|affiliate_email_has_no_account',
    'credit_balances|orphan.credit@example.test|no_account_for_email',
    'credit_balances|test.customer1@example.test|email_owner_unverified',
];
check('issues are exactly the unsafe or unlinked rows', ($r['issues'] ?? null) === $expected_issues, $r['issues'] ?? null);
check('affiliates keep code, owner and status', sql("SELECT GROUP_CONCAT(CONCAT(code, ':', email, ':', active) ORDER BY code) FROM wp_tbv_ac_affiliates") === 'CORA10:cora.reyes@example.test:1,OLDPARTNER:old.partner@example.test:0');
check('customer locks preserved', sql("SELECT GROUP_CONCAT(CONCAT(email, ':', affiliate_code) ORDER BY email) FROM wp_tbv_ac_customers") === 'ada.lovelace@example.test:CORA10,dev.patel@example.test:CORA10');
check('commissions keep historical cents and order state', sql("SELECT GROUP_CONCAT(CONCAT(order_number, ':', commission_cents, ':', status, ':', shipping_type) ORDER BY order_number) FROM wp_tbv_ac_commissions") === 'INV-0A44D3562ECFB43E0CC5C838DF59EF1A:1490:active:standard,INV-DEV00001:990:reversed:standard');
check('payouts preserved to the cent', sql("SELECT GROUP_CONCAT(CONCAT(affiliate_code, ':', amount_cents) ORDER BY source_key) FROM wp_tbv_ac_payouts") === 'CORA10:1000,CORA10:250,OLDPARTNER:2000,GHOSTCODE:100');
check('balances only on migrated accounts', sql("SELECT GROUP_CONCAT(CONCAT(email, ':', balance_cents) ORDER BY email) FROM wp_tbv_ac_credit_balances") === 'ada.lovelace@example.test:1000,ben.okafor@example.test:7100,eve.nakamura@example.test:4000');
[, $totals] = wp(['tbv-affiliates', 'totals', 'CORA10']);
check('affiliate totals: released 14.90 minus 12.50 paid out', json_decode(trim($totals), true) === ['orders' => 1, 'pending' => 0, 'available' => 240, 'paid' => 1250], $totals);

$after = $checksum();
[$c, $again] = bridge();
$created = array_sum(array_map(fn($c) => $c['created'] ?? 0, $again['counts'] ?? []));
check('rerun creates nothing and changes nothing', $c === 0 && $created === 0 && $checksum() === $after, $again['counts'] ?? null);

// A live value that differs from the source is reported, never overwritten.
sql("UPDATE wp_tbv_ac_payouts SET amount_cents = 999 WHERE source_key = '1'");
[$c, $conflict] = bridge();
check('changed payout reported as conflict', in_array('affiliate_payouts|1|conflict_amount_differs', $conflict['issues'] ?? [], true), $conflict['issues'] ?? null);
check('conflicting payout left as found', sql("SELECT amount_cents FROM wp_tbv_ac_payouts WHERE source_key = '1'") === '999');

echo "\n{$pass} passed, {$fail} failed\n";
exit($fail ? 1 : 0);
