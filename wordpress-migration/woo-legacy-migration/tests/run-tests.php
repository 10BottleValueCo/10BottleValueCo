<?php
/**
 * Integration tests for tbv-legacy-migration against the DISPOSABLE MariaDB
 * database tbv_migration_test through the disposable WordPress copy.
 *
 *   php tests/run-tests.php [--only=<scenario>[,<scenario>...]]
 *
 * Each scenario that needs a clean destination re-clones tbv_migration_test from
 * tbv_staging (read-only dump of staging) and drops the migration tables.
 * Runs the real `wp tbv-migrate` CLI as subprocesses, so interruption tests use
 * a genuine SIGKILL of the importer process.
 */

define('WP_PATH', (string)getenv('TBV_MIGRATION_TEST_WP'));
if (WP_PATH === '' || !is_file(WP_PATH . '/wp-config.php')) { fwrite(STDERR, "Set TBV_MIGRATION_TEST_WP to the disposable migration-test WordPress path.\n"); exit(2); }
const TEST_DB = 'tbv_migration_test';
const SOURCE_DB = 'tbv_staging'; // read-only: only ever passed to mariadb-dump

$LAB = realpath(__DIR__ . '/..');
$PLUGIN = $LAB . '/tbv-legacy-migration';
$TMP = sys_get_temp_dir() . '/tbv-lm-tests-' . getmypid();
@mkdir($TMP, 0700, true);
$opts = getopt('', ['only::']);
$ONLY = isset($opts['only']) ? explode(',', $opts['only']) : null;

$PASS = 0;
$FAIL = 0;
$FAILURES = [];
$CURRENT = '';

function check(string $name, bool $cond, $detail = null): void
{
    global $PASS, $FAIL, $FAILURES, $CURRENT;
    if ($cond) {
        $PASS++;
        echo "  ok   {$name}\n";
    } else {
        $FAIL++;
        $d = $detail === null ? '' : ' :: ' . (is_scalar($detail) ? $detail : json_encode($detail, JSON_UNESCAPED_SLASHES));
        $FAILURES[] = "[{$CURRENT}] {$name}{$d}";
        echo "  FAIL {$name}{$d}\n";
    }
}

function sh(array $argv, array $env = []): array
{
    global $TMP;
    static $n = 0;
    $n++;
    $out = "{$TMP}/cmd{$n}.out";
    $err = "{$TMP}/cmd{$n}.err";
    $cmd = implode(' ', array_map('escapeshellarg', $argv)) . ' >' . escapeshellarg($out) . ' 2>' . escapeshellarg($err) . '; exit $?';
    $p = proc_open(['bash', '-c', $cmd], [], $pipes, null, array_merge(getenv(), $env));
    $code = proc_close($p);
    return [$code, (string) file_get_contents($out), (string) file_get_contents($err)];
}

function wp(array $args, array $env = [], bool $probe = false): array
{
    global $LAB;
    $argv = ['wp', '--path=' . WP_PATH];
    if ($probe) {
        $argv[] = '--require=' . $LAB . '/tests/side-effect-probe.php';
    }
    return sh(array_merge($argv, $args), $env);
}

function sql(string $q): string
{
    [$code, $out, $err] = sh(['mariadb', '-N', '-B', '-u', get_current_user(), TEST_DB, '-e', $q]);
    if ($code !== 0) {
        throw new RuntimeException("SQL failed: {$err}");
    }
    return trim($out);
}

function inspect(): array
{
    global $LAB, $TMP;
    $path = $TMP . '/inspect-' . uniqid() . '.json';
    [$code, , $err] = wp(['eval-file', $LAB . '/tests/inspect.php', $path]);
    if ($code !== 0 || !is_file($path)) {
        throw new RuntimeException('inspect failed: ' . $err);
    }
    return json_decode(file_get_contents($path), true);
}

/** Run an import with the side-effect probe; returns [exit, report|null, probe|null, stderr]. */
function import(string $fixture, array $extra = [], array $env = []): array
{
    global $TMP;
    $report = $TMP . '/report-' . uniqid() . '.json';
    $probe = $TMP . '/probe-' . uniqid() . '.json';
    [$code, $out, $err] = wp(array_merge(['tbv-migrate', 'import', $fixture, '--report=' . $report], $extra), array_merge(['TBV_PROBE_OUT' => $probe], $env), true);
    return [$code, is_file($report) ? json_decode(file_get_contents($report), true) : null, is_file($probe) ? json_decode(file_get_contents($probe), true) : null, $out . $err];
}

function reconcile(string $fixture): array
{
    global $TMP;
    $report = $TMP . '/reconcile-' . uniqid() . '.json';
    [$code, , $err] = wp(['tbv-migrate', 'reconcile', $fixture, '--report=' . $report]);
    return [$code, is_file($report) ? json_decode(file_get_contents($report), true) : null, $err];
}

function reset_db(): void
{
    global $LAB;
    if (TEST_DB !== 'tbv_migration_test' || SOURCE_DB !== 'tbv_staging') {
        throw new RuntimeException('Refusing to reset: unexpected database names.');
    }
    $user = escapeshellarg(get_current_user());
    [$code, , $err] = sh(['bash', '-c', 'set -o pipefail; mariadb-dump -u ' . $user . ' --single-transaction ' . SOURCE_DB . ' | mariadb -u ' . $user . ' ' . TEST_DB]);
    if ($code !== 0) {
        throw new RuntimeException('Reset failed: ' . $err);
    }
    sql("DROP TABLE IF EXISTS wp_tbv_legacy_map, wp_tbv_legacy_records, wp_tbv_legacy_runs; DELETE FROM wp_options WHERE option_name = 'tbv_lm_schema_version'");
    [$code, , $err] = wp(['plugin', 'activate', 'tbv-legacy-migration']);
    if ($code !== 0) {
        throw new RuntimeException('Activation failed: ' . $err);
    }
    sql("DROP TABLE IF EXISTS wp_tbv_legacy_map, wp_tbv_legacy_records, wp_tbv_legacy_runs; DELETE FROM wp_options WHERE option_name = 'tbv_lm_schema_version'");
    [$code, $out, $err] = wp(['eval-file', $LAB . '/tests/setup.php']);
    $setup = json_decode(trim(preg_replace('/^.*?(\{.*\})\s*$/s', '$1', $out)), true);
    if ($code !== 0 || empty($setup['collision_user'])) {
        throw new RuntimeException('Setup failed or seeded collision user test.customer1@example.test missing: ' . $out . $err);
    }
}

function checksum(array $tables): string
{
    return sql('CHECKSUM TABLE ' . implode(', ', $tables));
}

function u(string $label): string
{
    $h = hash('sha256', 'tbv-synthetic-fixture:' . $label);
    return sprintf('%s-%s-4%s-a%s-%s', substr($h, 0, 8), substr($h, 8, 4), substr($h, 13, 3), substr($h, 17, 3), substr($h, 20, 12));
}

function issue_set(array $report): array
{
    $s = array_map(fn ($i) => $i['entity'] . '|' . $i['key'] . '|' . $i['code'], $report['issues'] ?? []);
    sort($s);
    return $s;
}

function mismatch_set(array $rec, bool $aggregate = false): array
{
    $s = [];
    foreach ($rec['mismatches'] as $m) {
        if (($m['reason'] === 'aggregate') === $aggregate) {
            $s[] = $m['entity'] . '|' . $m['key'] . '|' . $m['field'];
        }
    }
    sort($s);
    return $s;
}

function forbidden_hooks(?array $probe): array
{
    if (!$probe) {
        return ['<probe missing>'];
    }
    $bad = [];
    foreach ($probe['hooks'] as $tag => $n) {
        if (!in_array($tag, ['woocommerce_new_order', 'woocommerce_update_order', 'user_register', 'profile_update', 'woocommerce_payment_complete_order_status'], true)) {
            $bad[$tag] = $n;
        }
    }
    if ($probe['mail'] !== 0) {
        $bad['wp_mail'] = $probe['mail'];
    }
    if ($probe['http'] !== 0) {
        $bad['http'] = $probe['http'];
    }
    return $bad;
}

function cents($v): int
{
    return (int) round(((float) $v) * 100);
}

function reconcile_fingerprint(array $rec): string
{
    $m = array_map(fn ($x) => [$x['entity'], $x['key'], $x['field'], $x['source'], $x['destination']], $rec['mismatches']);
    sort($m);
    return hash('sha256', json_encode([$rec['entities'], $rec['customer_credit'], $rec['affiliate_totals'], $m]));
}

function scenario(string $name, callable $fn): void
{
    global $ONLY, $CURRENT, $FAIL, $FAILURES;
    if ($ONLY && !in_array($name, $ONLY, true)) {
        return;
    }
    $CURRENT = $name;
    echo "\n== {$name}\n";
    try {
        $fn();
    } catch (Throwable $e) {
        $FAIL++;
        $FAILURES[] = "[{$name}] exception: " . $e->getMessage();
        echo "  FAIL exception: " . $e->getMessage() . "\n";
    }
}

/* ------------------------------------------------------------------ preflight */

[$code, $out] = wp(['config', 'get', 'DB_NAME']);
if (trim($out) !== TEST_DB) {
    fwrite(STDERR, "Refusing to run: WordPress at " . WP_PATH . " is not configured for " . TEST_DB . "\n");
    exit(1);
}
$link = WP_PATH . '/wp-content/plugins/tbv-legacy-migration';
if (is_link($link) && realpath($link) !== $PLUGIN) {
    fwrite(STDERR, "Refusing to run: plugin link points elsewhere\n");
    exit(1);
}
if (!file_exists($link)) {
    symlink($PLUGIN, $link);
}
foreach (['base', 'changed', 'secret', 'missing'] as $variant) {
    [$code, , $err] = sh(['php', $LAB . '/bin/generate-fixture.php', '--variant=' . $variant, '--out=' . "{$TMP}/{$variant}.json"]);
    if ($code !== 0) {
        fwrite(STDERR, "Fixture generation failed: {$err}\n");
        exit(1);
    }
}
$BASE = "{$TMP}/base.json";
$FIX = json_decode(file_get_contents($BASE), true)['tables'];

$EXPECTED_CREATED = ['customers' => 8, 'orders' => 13, 'payment_attempts' => 4, 'credit_balances' => 6, 'credit_ledger' => 3,
    'credit_adjustments' => 4, 'affiliates' => 2, 'affiliate_customers' => 2, 'affiliate_orders' => 2, 'affiliate_payouts' => 4];
$EXPECTED_ISSUES = [
    'affiliate_orders|INV-COLLIDE1|order_not_imported',
    'customers|' . u('collide-existing') . '|email_collision_existing_user',
    'customers|' . u('collide-other') . '|email_collision_different_source_id',
    'orders|INV-COLLIDE1|customer_not_imported',
    'orders|INV-UNKNOWN1|unknown_status',
];
sort($EXPECTED_ISSUES);
$WOO_TABLES = ['wp_users', 'wp_usermeta', 'wp_wc_orders', 'wp_wc_orders_meta', 'wp_wc_order_addresses', 'wp_wc_order_operational_data',
    'wp_woocommerce_order_items', 'wp_woocommerce_order_itemmeta', 'wp_posts', 'wp_postmeta', 'wp_wc_product_meta_lookup'];
$MIG_TABLES = ['wp_tbv_legacy_map', 'wp_tbv_legacy_records'];
$REFERENCE_RECONCILE = null;

/* ------------------------------------------------------------------ scenarios */

scenario('validation', function () use ($TMP) {
    reset_db();
    $before = inspect();
    [$code, $report, , $output] = import("{$TMP}/secret.json");
    check('credential column aborts with exit 1', $code === 1, $code);
    check('error names the forbidden field', str_contains($output, 'checkout_access_hash'), substr($output, -300));
    check('no report produced', $report === null);
    $after = inspect();
    check('no migration tables created', $after['tables_exist'] === false);
    check('users unchanged', $after['counts']['users'] === $before['counts']['users']);
    check('orders unchanged', $after['counts']['orders'] === $before['counts']['orders']);
});

scenario('dry-run', function () use ($BASE, $EXPECTED_CREATED, $EXPECTED_ISSUES, $WOO_TABLES) {
    reset_db();
    $before = inspect();
    $sum = checksum($WOO_TABLES);
    [$code, $report, $probe] = import($BASE, ['--dry-run']);
    check('exit 2 (issues present)', $code === 2, $code);
    check('mode is dry-run', ($report['mode'] ?? null) === 'dry-run');
    $would = [];
    foreach ($report['entities'] as $e => $c) {
        $would[$e] = $c['would_create'] ?? 0;
    }
    check('would_create per entity', $would === $EXPECTED_CREATED, $would);
    check('nothing marked created', ($report['totals']['created'] ?? 0) === 0);
    check('issues identical to a real import', issue_set($report) === $EXPECTED_ISSUES, issue_set($report));
    $after = inspect();
    check('no migration tables created', $after['tables_exist'] === false);
    check('WordPress/Woo tables byte-identical (CHECKSUM)', checksum($WOO_TABLES) === $sum);
    check('no forbidden hooks / mail / http', forbidden_hooks($probe) === [], forbidden_hooks($probe));
    check('no orders created', ($probe['hooks']['woocommerce_new_order'] ?? 0) === 0);
});

scenario('first-import', function () use ($BASE, $FIX, $EXPECTED_CREATED, $EXPECTED_ISSUES) {
    reset_db();
    $before = inspect();
    [$code, $report, $probe] = import($BASE);
    check('exit 2 (issues present)', $code === 2, $code);
    $created = [];
    foreach ($report['entities'] as $e => $c) {
        $created[$e] = $c['created'] ?? 0;
    }
    check('created per entity', $created === $EXPECTED_CREATED, $created);
    check('no failed rows', ($report['totals']['failed'] ?? 0) === 0, $report['issues']);
    check('exact issue set (collisions, unknown status, dependents blocked)', issue_set($report) === $EXPECTED_ISSUES, issue_set($report));
    $warn = array_map(fn ($w) => $w['entity'] . '|' . $w['key'] . '|' . $w['code'], $report['warnings']);
    check('component-mismatch warning for edited order', in_array('orders|INV-DEV00002|total_component_mismatch', $warn, true), $warn);
    check('unknown affiliate code warning for payout', in_array('affiliate_payouts|4|unknown_affiliate_code', $warn, true), $warn);

    // Side effects.
    check('zero wp_mail attempts', ($probe['mail'] ?? -1) === 0, $probe);
    check('zero outbound HTTP', ($probe['http'] ?? -1) === 0, $probe);
    check('no status-transition/payment/stock/refund/email hooks fired', forbidden_hooks($probe) === [], forbidden_hooks($probe));
    check('probe live: woocommerce_new_order fired once per created order', ($probe['hooks']['woocommerce_new_order'] ?? 0) === 13, $probe['hooks'] ?? null);
    check('probe live: user_register fired once per created customer', ($probe['hooks']['user_register'] ?? 0) === 8, $probe['hooks'] ?? null);
    check('importer blocked 0 mails (none attempted)', ($report['side_effects']['mail_attempts_blocked'] ?? -1) === 0);

    $s = inspect();
    check('stock unchanged (postmeta)', $s['counts']['stock_sum'] === $before['counts']['stock_sum'], [$before['counts']['stock_sum'], $s['counts']['stock_sum']]);
    check('stock unchanged (lookup table)', $s['counts']['lookup_stock_sum'] === $before['counts']['lookup_stock_sum']);
    check('total_sales unchanged', $s['counts']['total_sales_sum'] === $before['counts']['total_sales_sum']);
    check('no refund objects created', $s['counts']['refunds'] === $before['counts']['refunds']);
    check('exactly 13 new Woo orders (no orphans)', $s['counts']['orders'] - $before['counts']['orders'] === 13);
    check('exactly 8 new users', $s['counts']['users'] - $before['counts']['users'] === 8);

    $o = $s['orders'];
    $U = $s['users'];
    $uid = fn ($label) => $U[u($label)]['id'] ?? null;
    $o1 = $o['INV-A1B2C3D4'] ?? null;
    check('O1 exists', $o1 !== null);
    check('O1 status paid -> processing', $o1['status'] === 'processing');
    check('O1 linked to source customer', $o1['customer_id'] === $uid('ada'));
    check('O1 original created date (UTC)', $o1['created_gmt'] === '2026-01-10 14:00:00', $o1['created_gmt']);
    check('O1 original paid date (UTC)', $o1['paid_gmt'] === '2026-01-10 14:05:12', $o1['paid_gmt']);
    check('O1 total exact', $o1['total'] === '475.86', $o1['total']);
    check('O1 order number shows source invoice', $o1['number'] === 'INV-A1B2C3D4', $o1['number']);
    check('O1 invoice meta', $o1['meta']['_tbv_invoice_number'] === 'INV-A1B2C3D4');
    check('O1 processor kept in internal meta', $o1['meta']['_tbv_payment_provider'] === 'Merit' && $o1['meta']['_tbv_payment_id'] === 'pi_synthetic0001');
    check('O1 customer-visible payment title has no processor', $o1['payment_method_title'] === 'Imported order');
    check('O1 attempt reference kept', json_decode($o1['meta']['_tbv_payment_attempt_refs'], true) === ['merit:' . u('m1')]);
    check('O1 created_via', $o1['created_via'] === 'tbv-legacy-migration');
    check('O1 completed-order email disabled for legacy order', $o1['completed_email_enabled'] === false);
    check('O1 stock flagged as already handled', $o1['stock_reduced'] === true);
    $lines = array_values(array_filter($o1['items'], fn ($i) => $i['type'] === 'line_item'));
    check('O1 two lines', count($lines) === 2);
    check('O1 line 1 historical subtotal and qty', $lines[0]['subtotal'] === '258' || $lines[0]['subtotal'] === '258.00' ? $lines[0]['qty'] === 2 : false, $lines[0]);
    check('O1 line 1 mapped to worldwide BPC-157 10 mg', $lines[0]['variation_id'] > 0 && ($lines[0]['mapped'] ?? null) === ['BPC-157', '10 mg', 'worldwide', '10', ''], $lines[0]);
    check('O1 line 2 mapped to US-warehouse variation', ($lines[1]['mapped'] ?? null) === ['BPC-157', '10 mg', 'us', '10', ''], $lines[1]);
    $fees = array_column(array_filter($o1['items'], fn ($i) => $i['type'] === 'fee'), 'total', 'component');
    check('O1 surcharge fee exact', ($fees['customerCardSurcharge'] ?? null) === '13.86', $fees);
    $ship = array_values(array_filter($o1['items'], fn ($i) => $i['type'] === 'shipping'));
    check('O1 shipping exact', ($ship[0]['total'] ?? null) === '25.00' || ($ship[0]['total'] ?? null) === '25', $ship);
    check('O1 admin box shows source ID and processor', str_contains($s['metabox_o1'] ?? '', 'INV-A1B2C3D4') && str_contains($s['metabox_o1'], 'merit:' . u('m1')));

    $old = $FIX['orders'][1]['id'];
    $o2 = $o[$old];
    check('O2 old 32-hex invoice preserved as number', $o2['number'] === $old && $o2['meta']['_tbv_invoice_number'] === $old);
    check('O2 done -> completed', $o2['status'] === 'completed');
    $fees = array_column(array_filter($o2['items'], fn ($i) => $i['type'] === 'fee'), 'total', 'component');
    check('O2 promo and referral discounts as exact negative fees', ($fees['promoDiscount'] ?? null) === '-14.90' && ($fees['affiliateDiscount'] ?? null) === '-7.45', $fees);
    check('O2 tracking and affiliate kept', $o2['meta']['_tbv_tracking_number'] === 'SYN-TRACK-0002' && $o2['meta']['_tbv_affiliate_code'] === 'CORA10');
    check('O3 guest stays unlinked', $o['INV-GUEST001']['customer_id'] === 0);
    check('O3 crypto discount exact', array_column(array_filter($o['INV-GUEST001']['items'], fn ($i) => $i['type'] === 'fee'), 'total', 'component') === ['cryptoDiscount' => '-4.35']);
    check('O4 null user_id stays unlinked even though email matches a customer', $o['INV-GUEST002']['customer_id'] === 0 && $o['INV-GUEST002']['billing_email'] === 'ben.okafor@example.test');
    check('O4 mixed-case "Shipped" -> completed, original kept', $o['INV-GUEST002']['status'] === 'completed' && $o['INV-GUEST002']['meta']['_tbv_source_status'] === 'Shipped');
    $o5 = $o['INV-BENCRED1'];
    check('O5 full store-credit order total 0.00 with -219.00 credit line', in_array($o5['total'], ['0', '0.00'], true)
        && array_column(array_filter($o5['items'], fn ($i) => $i['type'] === 'fee'), 'total', 'component') === ['storeCreditUsed' => '-219.00'], $o5['items']);
    check('O6 partial credit + surcharge exact', $o['INV-FINN0001']['total'] === '138.79');
    check('O7 checkout -> pending, unpaid', $o['INV-FINN0002']['status'] === 'pending' && $o['INV-FINN0002']['paid_gmt'] === null);
    check('O8 refunded without fabricated refund objects', $o['INV-DEV00001']['status'] === 'refunded' && $o['INV-DEV00001']['refunds'] === 0);
    check('O8 commission adjustment preserved', $o['INV-DEV00001']['meta']['_tbv_affiliate_commission_adjustment'] === '-9.9');
    check('O8 noteLabel variation mapped', (array_values(array_filter($o['INV-DEV00001']['items'], fn ($i) => $i['type'] === 'line_item'))[0]['mapped'] ?? null) === ['CJC-1295', '5 mg', 'worldwide', '10', 'no/d']);
    check('O9 cancelled, recorded total preserved, delta recorded', $o['INV-DEV00002']['status'] === 'cancelled' && $o['INV-DEV00002']['total'] === '160.00' && $o['INV-DEV00002']['meta']['_tbv_total_mismatch_cents'] === '-400');
    $gl = array_values(array_filter($o['INV-GIA00001']['items'], fn ($i) => $i['type'] === 'line_item'));
    check('O10 unmapped line kept by name with original price and flagged', $gl[1]['variation_id'] === 0 && $gl[1]['name'] === 'Discontinued Synthetic Peptide'
        && in_array($gl[1]['subtotal'], ['136.5', '136.50'], true) && $gl[1]['unmapped'] === 'yes' && $gl[1]['match'] === 'unmapped', $gl[1] ?? null);
    check('O10 unmapped count meta', $o['INV-GIA00001']['meta']['_tbv_unmapped_lines'] === '1');
    check('O10 unknown country kept in meta, not guessed', $o['INV-GIA00001']['billing_country'] === '' && $o['INV-GIA00001']['meta']['_tbv_source_country'] === 'Narnia');
    check('O13 Paylio attempt reference', json_decode($o['INV-CORA0001']['meta']['_tbv_payment_attempt_refs'], true) === ['paylio:' . u('p1')]);
    check('O14 wire_pending guest -> pending, country mapped', $o['INV-WIRE0001']['status'] === 'pending' && $o['INV-WIRE0001']['customer_id'] === 0 && $o['INV-WIRE0001']['billing_country'] === 'DE');
    check('O15 "checkout (clicked pay)" -> pending', $o['INV-HAL00001']['status'] === 'pending');
    check('unknown-status order not imported', !isset($o['INV-UNKNOWN1']));
    check('collision-owned order not imported', !isset($o['INV-COLLIDE1']));

    check('customer: role customer', $U[u('ada')]['roles'] === ['customer']);
    check('customer: original registration date', $U[u('ada')]['registered'] === '2025-11-02 10:15:00', $U[u('ada')]['registered']);
    check('customer: country/state mapped to Woo codes', $U[u('ada')]['billing_country'] === 'US' && $U[u('ada')]['billing_state'] === 'CA' && $U[u('ben')]['billing_country'] === 'CA' && $U[u('ben')]['billing_state'] === 'ON');
    check('customer: random password set, auth handoff flagged', $U[u('ada')]['pass_set'] === true && $U[u('ada')]['auth_state'] === 'imported_without_password');
    check('customer: non-PII login', $U[u('ada')]['login'] === 'tbv_' . substr(str_replace('-', '', u('ada')), 0, 16));
    check('collision: existing user left untouched (no source ID added)', $s['collision_users']['test.customer1@example.test']['source'] === '');
    check('collision: other-source user untouched', $s['collision_users']['other.source@example.test']['source'] === 'f0000000-0000-4000-a000-000000000001'
        && $s['collision_users']['other.source@example.test']['first_name'] === 'PreExisting');

    $r = $s['records'];
    check('credit balance exact + linked', $r['credit_balances']['ben.okafor@example.test']['amount_cents'] === '7100' && (int) $r['credit_balances']['ben.okafor@example.test']['wp_user_id'] === $uid('ben'));
    check('credit balance from string amount', $r['credit_balances']['eve.nakamura@example.test']['amount_cents'] === '4000');
    check('credit balance without account stays unlinked', $r['credit_balances']['orphan.credit@example.test']['wp_user_id'] === null);
    check('credit balance of collision email stays unlinked', $r['credit_balances']['test.customer1@example.test']['wp_user_id'] === null);
    check('hold preserved as held, linked to order and customer', $r['credit_ledger']['INV-FINN0002']['state'] === 'held' && $r['credit_ledger']['INV-FINN0002']['amount_cents'] === '2000'
        && (int) $r['credit_ledger']['INV-FINN0002']['wc_order_id'] === $o['INV-FINN0002']['id'] && (int) $r['credit_ledger']['INV-FINN0002']['wp_user_id'] === $uid('finn'));
    check('adjustment preserved (mode/before/balance)', $r['credit_adjustments'][u('a1')]['kind'] === 'set' && $r['credit_adjustments'][u('a1')]['before_cents'] === '0' && $r['credit_adjustments'][u('a1')]['balance_cents'] === '25000');
    check('affiliate profile linked, active', $r['affiliates']['CORA10']['state'] === 'active' && (int) $r['affiliates']['CORA10']['wp_user_id'] === $uid('cora'));
    check('inactive affiliate preserved', $r['affiliates']['OLDPARTNER']['state'] === 'inactive');
    check('commission linked to order', (int) $r['affiliate_orders']['INV-DEV00001']['wc_order_id'] === $o['INV-DEV00001']['id'] && $r['affiliate_orders']['INV-DEV00001']['amount_cents'] === '990');
    check('payout preserved exactly (string amount)', $r['affiliate_payouts']['2']['amount_cents'] === '250');
    check('reserved Merit attempt preserved', $r['payment_attempts']['merit:' . u('m3')]['state'] === 'reserved' && $r['payment_attempts']['merit:' . u('m3')]['amount_cents'] === '7682');
    check('run recorded as completed', ($s['runs'][0]['status'] ?? null) === 'completed');
    check('lock released', $s['lock_free'] === true);
});

scenario('reconcile', function () use ($BASE, $FIX, &$REFERENCE_RECONCILE) {
    [$code, $rec] = reconcile($BASE);
    check('exit 2 (expected mismatches)', $code === 2, $code);
    $expected = [
        'affiliate_orders|INV-COLLIDE1|presence',
        'affiliate_totals|CORA10|affiliate_summary',
        'customers|' . u('collide-existing') . '|presence',
        'customers|' . u('collide-other') . '|presence',
        'customers|f0000000-0000-4000-a000-000000000001|presence',
        'orders|INV-COLLIDE1|presence',
        'orders|INV-UNKNOWN1|presence',
    ];
    sort($expected);
    $expected = array_values(array_filter($expected, fn ($x) => !str_starts_with($x, 'affiliate_totals')));
    check('row-level mismatches are exactly the un-imported/extra rows', mismatch_set($rec) === $expected, mismatch_set($rec));
    $agg = mismatch_set($rec, true);
    $expected_agg = ['affiliate_orders|*|count', 'affiliate_orders|*|total_cents.amount', 'affiliate_totals|CORA10|affiliate_summary', 'customers|*|count',
        'orders|*|count', 'orders|*|total_cents.lines', 'orders|*|total_cents.shipping', 'orders|*|total_cents.total'];
    check('aggregate mismatches only where rows were not imported', $agg === $expected_agg, $agg);

    // Independent source sums from the fixture JSON.
    $sum = fn ($rows, $col, $int = false) => array_sum(array_map(fn ($r) => $int ? (int) $r[$col] : cents($r[$col]), $rows));
    $E = $rec['entities'];
    $src_total = $sum($FIX['orders'], 'total');
    $skip = array_sum(array_map(fn ($r) => in_array($r['id'], ['INV-UNKNOWN1', 'INV-COLLIDE1'], true) ? cents($r['total']) : 0, $FIX['orders']));
    check('orders source total cents = fixture', $E['orders']['cents']['total']['source'] === $src_total, [$E['orders']['cents']['total'], $src_total]);
    check('orders destination total = source minus the 2 un-imported orders, to the cent', $E['orders']['cents']['total']['destination'] === $src_total - $skip);
    foreach (['promoDiscount', 'affiliateDiscount', 'cryptoDiscount', 'storeCreditUsed', 'customerCardSurcharge'] as $c) {
        check("orders {$c} cents equal", $E['orders']['cents'][$c]['source'] === $E['orders']['cents'][$c]['destination'] && $E['orders']['cents'][$c]['source'] > 0, $E['orders']['cents'][$c]);
    }
    check('13 orders match field-by-field', $E['orders']['matched'] === 13 && $E['orders']['mismatched'] === 0);
    $merit = $sum($FIX['merit_payment_attempts'], 'amount_cents', true) + $sum($FIX['paylio_payment_attempts'], 'amount_cents', true);
    check('payment attempt cents exact', $E['payment_attempts']['cents']['amount'] === ['source' => $merit, 'destination' => $merit]);
    $bal = $sum($FIX['user_credits'], 'amount');
    check('credit balance cents exact', $E['credit_balances']['cents']['amount'] === ['source' => $bal, 'destination' => $bal] && $bal === 13834);
    $held = array_sum(array_map(fn ($r) => $r['state'] === 'held' ? $r['credit_cents'] : 0, $FIX['store_credit_ledger']));
    check('ledger held cents exact', $E['credit_ledger']['cents']['held'] === ['source' => $held, 'destination' => $held] && $held === 2000);
    check('ledger consumed cents exact', $E['credit_ledger']['cents']['consumed']['source'] === 27900 && $E['credit_ledger']['cents']['consumed']['destination'] === 27900);
    check('adjustment cents exact', $E['credit_adjustments']['cents']['add'] === ['source' => 16000, 'destination' => 16000] && $E['credit_adjustments']['cents']['set'] === ['source' => 25000, 'destination' => 25000]);
    $pay = $sum($FIX['affiliate_payouts'], 'amount');
    check('payout cents exact', $E['affiliate_payouts']['cents']['amount'] === ['source' => $pay, 'destination' => $pay] && $pay === 3350);
    check('per-customer credit summaries all match', count($rec['customer_credit']) === 6 && !array_filter($rec['customer_credit'], fn ($c) => !$c['match']));
    $ben = array_values(array_filter($rec['customer_credit'], fn ($c) => $c['email'] === 'ben.okafor@example.test'))[0];
    check('ben credit picture', $ben['destination'] === ['balance_cents' => 7100, 'held_cents' => 0, 'consumed_cents' => 21900, 'adjustments_net_cents' => 29000], $ben);
    $finn = array_values(array_filter($rec['customer_credit'], fn ($c) => $c['email'] === 'finn.berg@example.test'))[0];
    check('finn credit picture (hold separate, not subtracted again)', $finn['destination'] === ['balance_cents' => 0, 'held_cents' => 2000, 'consumed_cents' => 6000, 'adjustments_net_cents' => 8000], $finn);
    $cora = array_values(array_filter($rec['affiliate_totals'], fn ($c) => $c['code'] === 'CORA10'))[0];
    check('affiliate totals: destination commission/payouts exact', $cora['destination'] === ['attributed_orders' => 2, 'commission_cents' => 2480, 'payouts' => 2, 'payout_cents' => 1250], $cora);
    $REFERENCE_RECONCILE = reconcile_fingerprint($rec);
});

scenario('reimport-noop', function () use ($BASE, $EXPECTED_ISSUES, $WOO_TABLES, $MIG_TABLES) {
    $tables = array_merge($WOO_TABLES, $MIG_TABLES);
    $sum = checksum($tables);
    [$code, $report, $probe] = import($BASE);
    check('exit 2 (same unresolved issues)', $code === 2, $code);
    check('nothing created/updated', ($report['totals']['created'] ?? 0) === 0 && ($report['totals']['updated'] ?? 0) === 0, $report['totals']);
    check('48 rows unchanged', ($report['totals']['unchanged'] ?? 0) === 48, $report['totals']);
    check('same issue set, nothing new', issue_set($report) === $EXPECTED_ISSUES, issue_set($report));
    check('Woo/WP + mapping/record tables byte-identical (CHECKSUM)', checksum($tables) === $sum);
    check('no hooks/mail/http and no new objects', forbidden_hooks($probe) === [] && !isset($probe['hooks']['woocommerce_new_order']) && !isset($probe['hooks']['user_register']), $probe);
    $sum2 = checksum(array_merge($tables, ['wp_tbv_legacy_runs']));
    [$code, $report] = import($BASE, ['--dry-run']);
    check('dry-run after import: all unchanged, exit 2', $code === 2 && ($report['totals']['unchanged'] ?? 0) === 48 && !isset($report['totals']['would_create']));
    check('dry-run writes nothing, not even a run row', checksum(array_merge($tables, ['wp_tbv_legacy_runs'])) === $sum2);
});

scenario('changed-conflict', function () use ($TMP, $EXPECTED_ISSUES) {
    $before = inspect();
    [$code, $report, $probe] = import("{$TMP}/changed.json");
    $expected = array_merge($EXPECTED_ISSUES, [
        'affiliate_payouts|1|source_changed',
        'credit_ledger|INV-FINN0002|source_changed',
        'customers|' . u('ada') . '|source_changed',
        'orders|INV-A1B2C3D4|source_changed',
    ]);
    sort($expected);
    check('exit 2', $code === 2, $code);
    check('changed financial/profile rows reported as conflicts', issue_set($report) === $expected, issue_set($report));
    check('new order in the same export still imported', ($report['entities']['orders']['created'] ?? 0) === 1);
    check('no updates without the flag', ($report['totals']['updated'] ?? 0) === 0);
    $s = inspect();
    check('conflicted order NOT overwritten', $s['orders']['INV-A1B2C3D4']['total'] === '475.86' && $s['orders']['INV-A1B2C3D4']['id'] === $before['orders']['INV-A1B2C3D4']['id']);
    check('conflicted payout NOT overwritten', $s['records']['affiliate_payouts']['1']['amount_cents'] === '1000');
    check('conflicted hold NOT overwritten', $s['records']['credit_ledger']['INV-FINN0002']['state'] === 'held');
    check('conflicted customer NOT overwritten', $s['users'][u('ada')]['last_name'] === 'Lovelace');
    check('mapping revision unchanged', $s['map']['orders']['INV-A1B2C3D4']['revision'] === 1);
    check('no side effects', forbidden_hooks($probe) === [], forbidden_hooks($probe));

    [$code, $report, $probe] = import("{$TMP}/changed.json", ['--accept-changes=orders,credit_ledger']);
    check('accept-changes updates exactly the named entities', ($report['entities']['orders']['updated'] ?? 0) === 1 && ($report['entities']['credit_ledger']['updated'] ?? 0) === 1 && ($report['totals']['updated'] ?? 0) === 2, $report['totals']);
    $left = array_values(array_filter(issue_set($report), fn ($i) => str_contains($i, 'source_changed')));
    check('other entities still conflict', $left === ['affiliate_payouts|1|source_changed', 'customers|' . u('ada') . '|source_changed'], $left);
    $s = inspect();
    $o1 = $s['orders']['INV-A1B2C3D4'];
    check('order updated in place (same Woo ID), new total exact', $o1['id'] === $before['orders']['INV-A1B2C3D4']['id'] && $o1['total'] === '470.00');
    check('order keeps status and lines', $o1['status'] === 'processing' && count(array_filter($o1['items'], fn ($i) => $i['type'] === 'line_item')) === 2);
    check('previous source version kept as revision', count(json_decode($o1['meta']['_tbv_source_revisions'] ?? '[]', true)) === 1);
    check('mapping revision 2', $s['map']['orders']['INV-A1B2C3D4']['revision'] === 2);
    check('ledger updated with revision history', $s['records']['credit_ledger']['INV-FINN0002']['state'] === 'consumed' && count(json_decode($s['records']['credit_ledger']['INV-FINN0002']['revisions'], true)) === 1);
    check('update fired no status/payment/stock/email hooks', forbidden_hooks($probe) === [], forbidden_hooks($probe));
    [$code, $report] = import("{$TMP}/changed.json", ['--accept-changes=orders,credit_ledger']);
    check('repeat after accept: accepted rows now unchanged', ($report['totals']['updated'] ?? 0) === 0 && ($report['totals']['created'] ?? 0) === 0);
});

scenario('missing-rows', function () use ($TMP) {
    [$code, $report] = import("{$TMP}/missing.json");
    $missing = array_map(fn ($m) => $m['entity'] . '|' . $m['key'], $report['missing_from_source'] ?? []);
    check('previously imported row absent from export is reported', in_array('orders|INV-HAL00001', $missing, true), $missing);
    check('and not deleted', isset(inspect()['orders']['INV-HAL00001']));
});

scenario('interrupted-resume', function () use ($BASE, &$REFERENCE_RECONCILE) {
    $cases = [
        ['order:after_save:INV-FINN0001', 'mid-order (saved, uncommitted)', 'orders', 5],
        ['order:after_commit:INV-FINN0001', 'between orders (committed)', 'orders', 6],
        ['customer:after_write:' . u('ben'), 'mid-customer', 'customers', 1],
        ['record:before_commit:INV-FINN0002', 'mid-ledger-record (mapped, uncommitted)', 'credit_ledger', 2],
    ];
    foreach ($cases as [$fault, $label, $entity, $expect_count]) {
        reset_db();
        $before = inspect();
        [$code] = import($BASE, [], ['TBV_LM_FAULT' => $fault, 'TBV_LM_ALLOW_FAULTS' => '1']);
        check("{$label}: process killed (SIGKILL)", $code === 137, $code);
        $s = inspect();
        $mapped = count($s['map'][$entity] ?? []);
        $dest = $entity === 'orders' ? $s['counts']['orders_with_source_meta'] : ($entity === 'customers' ? count($s['users']) - 1 : count($s['records'][$entity] ?? []));
        check("{$label}: {$expect_count} {$entity} committed and mapped", $mapped === $expect_count && $dest === $expect_count, [$mapped, $dest]);
        if ($entity === 'orders') {
            check("{$label}: no orphan Woo order rows", $s['counts']['orders'] - $before['counts']['orders'] === $expect_count);
        }
        if ($entity === 'customers') {
            check("{$label}: no orphan user rows", $s['counts']['users'] - $before['counts']['users'] === $expect_count);
        }
        check("{$label}: run left as running", ($s['runs'][0]['status'] ?? null) === 'running');
        check("{$label}: DB lock auto-released", $s['lock_free'] === true);
        [$code, $report, $probe] = import($BASE);
        check("{$label}: resume completes (exit 2 for the known issues)", $code === 2, $code);
        check("{$label}: resume reports interrupted run", ($report['resumed_after_interrupted_runs'] ?? null) === [1]);
        check("{$label}: no failures, all 48 rows present", ($report['totals']['failed'] ?? 0) === 0 && ($report['totals']['created'] ?? 0) + ($report['totals']['unchanged'] ?? 0) === 48, $report['totals']);
        check("{$label}: resume side-effect free", forbidden_hooks($probe) === [], forbidden_hooks($probe));
        $s = inspect();
        check("{$label}: final counts exact (13 orders / 8 customers, no duplicates)", $s['counts']['orders_with_source_meta'] === 13 && count($s['map']['orders']) === 13
            && $s['counts']['orders'] - $before['counts']['orders'] === 13 && count($s['users']) === 9);
        [, $rec] = reconcile($BASE);
        check("{$label}: reconciliation identical to an uninterrupted import", $REFERENCE_RECONCILE !== null && reconcile_fingerprint($rec) === $REFERENCE_RECONCILE);
    }
});

scenario('tamper-detect', function () use ($BASE, $FIX) {
    reset_db();
    import($BASE);
    $s = inspect();
    $old = $FIX['orders'][1]['id'];
    sql('UPDATE wp_wc_orders SET total_amount = total_amount + 0.01 WHERE id = ' . (int) $s['orders'][$old]['id']);
    sql("UPDATE wp_tbv_legacy_records SET amount_cents = amount_cents + 5 WHERE entity = 'affiliate_payouts' AND source_key = '3'");
    [$code, $rec] = reconcile($BASE);
    $found = array_values(array_filter($rec['mismatches'], fn ($m) => ($m['key'] === $old && $m['field'] === 'total_cents') || ($m['entity'] === 'affiliate_payouts' && $m['key'] === '3')));
    check('edited Woo order total detected to the cent', in_array([$old, 14165, 14166], array_map(fn ($m) => [$m['key'], $m['source'], $m['destination']], $found), true), $found);
    check('edited preserved payout detected', in_array(['3', 2000, 2005], array_map(fn ($m) => [$m['key'], $m['source'], $m['destination']], $found), true), $found);
    check('aggregate payout cents differ by 5', $rec['entities']['affiliate_payouts']['cents']['amount']['destination'] - $rec['entities']['affiliate_payouts']['cents']['amount']['source'] === 5);
    wp(['eval', '$o = wc_get_order(' . (int) $s['orders']['INV-HAL00001']['id'] . '); $o->delete(true);']);
    [$code, $report] = import($BASE);
    check('deleted destination reported as conflict, not silently recreated', in_array('orders|INV-HAL00001|destination_missing', issue_set($report), true) && !isset(inspect()['orders']['INV-HAL00001']), issue_set($report));
});

scenario('lock', function () use ($BASE) {
    $user = escapeshellarg(get_current_user());
    $holder = proc_open(['bash', '-c', 'mariadb -u ' . $user . ' ' . TEST_DB . " -e \"SELECT GET_LOCK('tbv_legacy_migration', 0); SELECT SLEEP(6);\" >/dev/null 2>&1"], [], $pipes);
    usleep(1500000);
    $runs = sql('SELECT COUNT(*) FROM wp_tbv_legacy_runs');
    [$code, $report, , $output] = import($BASE);
    check('second process refused while lock held (exit 1)', $code === 1 && str_contains($output, 'lock'), [$code, substr($output, -200)]);
    check('refused run wrote nothing', sql('SELECT COUNT(*) FROM wp_tbv_legacy_runs') === $runs);
    proc_close($holder); // waits for the short-lived holder so later runs never see a held lock
    check('lock free again after holder exits', sql("SELECT IS_FREE_LOCK('tbv_legacy_migration')") === '1');
});

echo "\n{$PASS} passed, {$FAIL} failed\n";
foreach ($FAILURES as $f) {
    echo "  - {$f}\n";
}
exit($FAIL ? 1 : 0);
