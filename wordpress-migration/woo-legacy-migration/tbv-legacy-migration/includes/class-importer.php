<?php
defined('ABSPATH') || exit;

class TBV_LM_Fatal extends RuntimeException
{
}

/**
 * Idempotent importer.
 *
 * Every source row is written in its own InnoDB transaction together with its
 * mapping row, so an interrupted process leaves each record either fully
 * written and mapped, or absent. Re-running resumes: mapped rows with an
 * identical source hash are "unchanged"; mapped rows whose source changed are
 * "conflict" (never overwritten) unless --accept-changes names the entity.
 * Rows that are absent from a later export are reported, never deleted.
 *
 * Outcomes: created | unchanged | updated | conflict | blocked | rejected | failed
 *           (dry run: would_create | would_update instead of created/updated).
 */
final class TBV_LM_Importer
{
    private TBV_LM_Export $export;
    private bool $dry;
    private array $accept;
    private int $run_id = 0;
    private ?TBV_LM_Catalog $catalog = null;

    /** entity => key => map row */
    private array $map = [];
    /** source user id => wp user id (-1 = planned in dry run) */
    private array $customer_wp = [];
    /** source order id => wc order id (-1 = planned) */
    private array $order_wc = [];
    /** normalized email => wp user id for imported/planned customers */
    private array $email_wp = [];
    /** affiliate codes present in export or destination */
    private array $affiliate_codes = [];
    /** order id => list of attempt refs */
    private array $attempts_by_order = [];
    /** source keys in the export per entity (any validity) */
    private array $export_customers = [];
    private array $export_orders = [];

    /** existing destination identities, for orphan detection */
    private array $dest_users_by_source = [];
    private array $dest_orders_by_source = [];
    private array $dest_records = [];

    private array $report = [];
    private int $mail_blocked = 0;
    private array $countries = [];
    private array $states = [];

    public function __construct(TBV_LM_Export $export, array $opts = [])
    {
        $this->export = $export;
        $this->dry = !empty($opts['dry_run']);
        $accept = $opts['accept_changes'] ?? [];
        if ($accept === ['all']) {
            $accept = TBV_LM_Export::ENTITIES;
        }
        foreach ($accept as $e) {
            if (!in_array($e, TBV_LM_Export::ENTITIES, true)) {
                throw new TBV_LM_Fatal('Unknown entity in --accept-changes: ' . $e);
            }
        }
        $this->accept = $accept;
    }

    public static function assert_environment(): void
    {
        if (wp_get_environment_type() === 'production' && !(defined('TBV_LM_ALLOW_PRODUCTION') && TBV_LM_ALLOW_PRODUCTION === true)) {
            throw new TBV_LM_Fatal('Refusing to run in a production environment without TBV_LM_ALLOW_PRODUCTION (owner-approved cutover only).');
        }
        if (!function_exists('WC') || !class_exists('WC_Order')) {
            throw new TBV_LM_Fatal('WooCommerce is not active.');
        }
        if (!class_exists('\Automattic\WooCommerce\Utilities\OrderUtil') || !\Automattic\WooCommerce\Utilities\OrderUtil::custom_orders_table_usage_is_enabled()) {
            throw new TBV_LM_Fatal('HPOS (custom order tables) must be the authoritative order storage.');
        }
        if (get_option('woocommerce_currency') !== 'USD') {
            throw new TBV_LM_Fatal('Store currency must be USD; the source records are USD.');
        }
        if ((int) get_option('woocommerce_price_num_decimals', 2) !== 2) {
            throw new TBV_LM_Fatal('Store price decimals must be 2 or historical cents would be rounded.');
        }
    }

    public static function lock(): void
    {
        global $wpdb;
        if ((string) $wpdb->get_var("SELECT GET_LOCK('tbv_legacy_migration', 0)") !== '1') {
            throw new TBV_LM_Fatal('Another tbv-migrate process holds the migration lock.');
        }
    }

    public static function unlock(): void
    {
        global $wpdb;
        $wpdb->get_var("SELECT RELEASE_LOCK('tbv_legacy_migration')");
    }

    public function run(): array
    {
        global $wpdb;
        self::assert_environment();
        self::lock();
        try {
            $this->report = [
                'mode' => $this->dry ? 'dry-run' : 'import',
                'run_id' => null,
                'export_sha256' => $this->export->sha256,
                'started_at' => gmdate('c'),
                'accept_changes' => $this->accept,
                'resumed_after_interrupted_runs' => [],
                'entities' => [],
                'issues' => [],
                'warnings' => [],
                'missing_from_source' => [],
                'relinked' => 0,
                'side_effects' => [],
            ];
            foreach (TBV_LM_Export::ENTITIES as $e) {
                $this->report['entities'][$e] = [];
            }
            $have_tables = TBV_LM_Schema::exists();
            if (!$this->dry) {
                TBV_LM_Schema::ensure();
                $have_tables = true;
                $interrupted = $wpdb->get_col("SELECT id FROM " . TBV_LM_Schema::table('runs') . " WHERE status = 'running'");
                foreach ($interrupted as $rid) {
                    $wpdb->update(TBV_LM_Schema::table('runs'), ['status' => 'interrupted'], ['id' => (int) $rid]);
                    $this->report['resumed_after_interrupted_runs'][] = (int) $rid;
                }
                $wpdb->insert(TBV_LM_Schema::table('runs'), [
                    'status' => 'running', 'export_sha256' => $this->export->sha256,
                    'options' => wp_json_encode(['accept_changes' => $this->accept]),
                    'started_at' => current_time('mysql', true),
                ]);
                $this->run_id = (int) $wpdb->insert_id;
                if ($this->run_id < 1) {
                    throw new TBV_LM_Fatal('Could not record the run: ' . $wpdb->last_error);
                }
                $this->report['run_id'] = $this->run_id;
            }
            $this->install_run_guards();
            $this->catalog = TBV_LM_Catalog::load();
            $this->load_state($have_tables);
            $this->index_export();

            foreach (TBV_LM_Export::ENTITIES as $entity) {
                foreach ($this->export->records[$entity] as $rec) {
                    $this->process($entity, $rec);
                }
            }
            if (!$this->dry) {
                $this->relink();
            }
            $this->find_missing();
            $this->report['side_effects'] = ['mail_attempts_blocked' => $this->mail_blocked];
            $this->report['finished_at'] = gmdate('c');
            $this->report['totals'] = $this->totals();
            if (!$this->dry) {
                $wpdb->update(TBV_LM_Schema::table('runs'), [
                    'status' => 'completed', 'finished_at' => current_time('mysql', true),
                    'summary' => wp_json_encode(['totals' => $this->report['totals'], 'entities' => $this->report['entities']]),
                ], ['id' => $this->run_id]);
            }
            return $this->report;
        } finally {
            self::unlock();
        }
    }

    /* ------------------------------------------------------------------ setup */

    private function install_run_guards(): void
    {
        add_filter('pre_wp_mail', function () {
            $this->mail_blocked++;
            return false;
        }, 1);
        add_filter('send_email_change_email', '__return_false', PHP_INT_MAX);
        add_filter('send_password_change_email', '__return_false', PHP_INT_MAX);
        add_filter('woocommerce_can_reduce_order_stock', '__return_false', PHP_INT_MAX);
        add_filter('woocommerce_payment_complete_reduce_order_stock', '__return_false', PHP_INT_MAX);
        add_filter('woocommerce_can_restore_order_stock', '__return_false', PHP_INT_MAX);
        add_filter('woocommerce_new_order_email_allows_resend', '__return_false', PHP_INT_MAX);
    }

    private function load_state(bool $have_tables): void
    {
        global $wpdb;
        foreach (TBV_LM_Export::ENTITIES as $e) {
            $this->map[$e] = [];
        }
        if ($have_tables) {
            foreach ($wpdb->get_results('SELECT * FROM ' . TBV_LM_Schema::table('map'), ARRAY_A) as $row) {
                $this->map[$row['entity']][$row['source_key']] = $row;
            }
            foreach ($wpdb->get_results('SELECT id, entity, source_key FROM ' . TBV_LM_Schema::table('records'), ARRAY_A) as $row) {
                $this->dest_records[$row['entity']][$row['source_key']] = (int) $row['id'];
            }
        }
        foreach ($wpdb->get_results("SELECT um.user_id, um.meta_value FROM {$wpdb->usermeta} um JOIN {$wpdb->users} u ON u.ID = um.user_id WHERE um.meta_key = '_tbv_source_user_id'", ARRAY_A) as $row) {
            $this->dest_users_by_source[strtolower($row['meta_value'])][] = (int) $row['user_id'];
        }
        foreach (self::orders_by_source_meta() as $source => $ids) {
            $this->dest_orders_by_source[$source] = $ids;
        }
        // Resolutions from earlier runs.
        foreach ($this->map['customers'] as $key => $row) {
            $this->customer_wp[$key] = (int) $row['dest_id'];
        }
        foreach ($this->map['orders'] as $key => $row) {
            $this->order_wc[$key] = (int) $row['dest_id'];
        }
        foreach ($this->map['affiliates'] as $key => $row) {
            $this->affiliate_codes[$key] = true;
        }
        $wc_countries = WC()->countries;
        foreach ($wc_countries->get_countries() as $code => $name) {
            $plain = strtolower(trim(html_entity_decode(wp_strip_all_tags($name), ENT_QUOTES)));
            $this->countries[$plain] = $code;
            $this->countries[trim(preg_replace('/\s*\([a-z]{2,3}\)$/', '', $plain))] = $code;
            $this->countries[strtolower($code)] = $code;
        }
        $this->countries['usa'] = 'US';
        $this->countries['united states of america'] = 'US';
        foreach ($wc_countries->get_states() as $country => $states) {
            if (is_array($states)) {
                foreach ($states as $code => $name) {
                    $this->states[$country][strtolower(html_entity_decode($name, ENT_QUOTES))] = $code;
                    $this->states[$country][strtolower($code)] = $code;
                }
            }
        }
    }

    /** @return array<string, int[]> source order id => Woo order ids carrying that source meta */
    public static function orders_by_source_meta(): array
    {
        global $wpdb;
        $out = [];
        if (class_exists('\Automattic\WooCommerce\Utilities\OrderUtil') && \Automattic\WooCommerce\Utilities\OrderUtil::custom_orders_table_usage_is_enabled()) {
            $rows = $wpdb->get_results("SELECT m.order_id AS id, m.meta_value AS v FROM {$wpdb->prefix}wc_orders_meta m JOIN {$wpdb->prefix}wc_orders o ON o.id = m.order_id WHERE m.meta_key = '_tbv_source_order_id' AND o.type = 'shop_order'", ARRAY_A);
        } else {
            $rows = $wpdb->get_results("SELECT m.post_id AS id, m.meta_value AS v FROM {$wpdb->postmeta} m JOIN {$wpdb->posts} p ON p.ID = m.post_id WHERE m.meta_key = '_tbv_source_order_id' AND p.post_type = 'shop_order'", ARRAY_A);
        }
        foreach ($rows as $r) {
            $out[$r['v']][] = (int) $r['id'];
        }
        return $out;
    }

    private function index_export(): void
    {
        $emails = [];
        foreach ($this->export->records['customers'] as $r) {
            $this->export_customers[$r['key']] = true;
            if (!$r['errors']) {
                $emails[$r['f']['email']][] = $r['key'];
            }
        }
        foreach ($this->export->records['customers'] as &$r) {
            if (!$r['errors'] && count($emails[$r['f']['email']]) > 1) {
                $r['errors'][] = ['duplicate_email_in_export', 'Several source users share this email; none is imported until resolved.'];
            }
        }
        unset($r);
        foreach ($this->export->records['orders'] as $r) {
            $this->export_orders[$r['key']] = true;
        }
        foreach ($this->export->records['payment_attempts'] as $r) {
            if (!$r['errors']) {
                $this->attempts_by_order[$r['f']['order_id']][] = [
                    'ref' => $r['key'], 'customer_id' => $r['f']['customer_id'],
                    'state' => $r['f']['state'], 'amount_cents' => $r['f']['amount_cents'],
                ];
            }
        }
        foreach ($this->export->records['affiliates'] as $r) {
            if (!$r['errors']) {
                $this->affiliate_codes[$r['key']] = true;
            }
        }
    }

    /* --------------------------------------------------------------- dispatch */

    private function process(string $entity, array $rec): void
    {
        $key = $rec['key'];
        foreach ($rec['warnings'] as [$code, $msg]) {
            $this->report['warnings'][] = ['entity' => $entity, 'key' => $key, 'code' => $code, 'message' => $msg];
        }
        if ($rec['errors']) {
            $this->outcome($entity, $key, 'rejected', $rec['errors'][0][0], implode(' ', array_column($rec['errors'], 1)));
            return;
        }
        $existing = $this->map[$entity][$key] ?? null;
        if ($existing) {
            $dest_ok = $this->destination_exists($entity, $key, (int) $existing['dest_id']);
            if (!$dest_ok) {
                $this->outcome($entity, $key, 'conflict', 'destination_missing', 'Mapped destination #' . $existing['dest_id'] . ' no longer exists; not recreated automatically.');
                return;
            }
            $this->resolve($entity, $rec, (int) $existing['dest_id']);
            if (hash_equals($existing['source_hash'], $rec['hash'])) {
                $this->outcome($entity, $key, 'unchanged');
                return;
            }
            if (!in_array($entity, $this->accept, true)) {
                $this->outcome($entity, $key, 'conflict', 'source_changed', 'Source row changed since it was imported (revision ' . $existing['revision'] . '); destination left untouched. Re-run with --accept-changes=' . $entity . ' after review.');
                return;
            }
            $problem = $this->preflight($entity, $rec, true);
            if ($problem) {
                $this->outcome($entity, $key, $problem[0], $problem[1], $problem[2]);
                return;
            }
            if ($this->dry) {
                $this->outcome($entity, $key, 'would_update');
                return;
            }
            try {
                $this->txn(function () use ($entity, $rec, $existing) {
                    $this->write($entity, $rec, (int) $existing['dest_id']);
                    $this->map_update($entity, $rec, $existing);
                });
                $this->outcome($entity, $key, 'updated');
            } catch (Throwable $e) {
                $this->outcome($entity, $key, 'failed', 'write_failed', $e->getMessage());
            }
            return;
        }
        $problem = $this->preflight($entity, $rec, false);
        if ($problem) {
            $this->outcome($entity, $key, $problem[0], $problem[1], $problem[2]);
            return;
        }
        if ($this->dry) {
            $this->resolve($entity, $rec, -1);
            $this->outcome($entity, $key, 'would_create');
            return;
        }
        try {
            $dest_id = $this->txn(function () use ($entity, $rec) {
                $id = $this->write($entity, $rec, 0);
                $this->map_insert($entity, $rec, $id);
                TBV_LM_Util::fault($this->fault_point($entity) . ':before_commit', $rec['key']);
                return $id;
            });
            TBV_LM_Util::fault($this->fault_point($entity) . ':after_commit', $rec['key']);
            $this->resolve($entity, $rec, $dest_id);
            $this->outcome($entity, $key, 'created');
        } catch (Throwable $e) {
            $this->outcome($entity, $key, 'failed', 'write_failed', $e->getMessage());
        }
    }

    private function fault_point(string $entity): string
    {
        return $entity === 'customers' ? 'customer' : ($entity === 'orders' ? 'order' : 'record');
    }

    private function txn(callable $fn)
    {
        global $wpdb;
        $wpdb->query('START TRANSACTION');
        try {
            $result = $fn();
            if ($wpdb->query('COMMIT') === false) {
                throw new RuntimeException('COMMIT failed: ' . $wpdb->last_error);
            }
            return $result;
        } catch (Throwable $e) {
            $wpdb->query('ROLLBACK');
            wp_cache_flush();
            throw $e;
        }
    }

    private function outcome(string $entity, string $key, string $outcome, ?string $code = null, ?string $message = null): void
    {
        $this->report['entities'][$entity][$outcome] = ($this->report['entities'][$entity][$outcome] ?? 0) + 1;
        if ($code !== null) {
            $this->report['issues'][] = ['entity' => $entity, 'key' => $key, 'outcome' => $outcome, 'code' => $code, 'message' => $message];
        }
    }

    private function totals(): array
    {
        $t = [];
        foreach ($this->report['entities'] as $counts) {
            foreach ($counts as $k => $n) {
                $t[$k] = ($t[$k] ?? 0) + $n;
            }
        }
        ksort($t);
        return $t;
    }

    private function destination_exists(string $entity, string $key, int $dest_id): bool
    {
        if ($entity === 'customers') {
            return in_array($dest_id, $this->dest_users_by_source[$key] ?? [], true);
        }
        if ($entity === 'orders') {
            return in_array($dest_id, $this->dest_orders_by_source[$key] ?? [], true);
        }
        return ($this->dest_records[$entity][$key] ?? 0) === $dest_id;
    }

    private function resolve(string $entity, array $rec, int $dest_id): void
    {
        if ($entity === 'customers') {
            $this->customer_wp[$rec['key']] = $dest_id;
            $this->email_wp[$rec['f']['email']] = $dest_id;
        } elseif ($entity === 'orders') {
            $this->order_wc[$rec['key']] = $dest_id;
        }
    }

    /** @return array{0:string,1:string,2:string}|null [outcome, code, message] */
    private function preflight(string $entity, array $rec, bool $is_update): ?array
    {
        $f = $rec['f'];
        $key = $rec['key'];
        switch ($entity) {
            case 'customers':
                $by_email = get_user_by('email', $f['email']);
                if ($by_email) {
                    $their_source = strtolower((string) get_user_meta($by_email->ID, '_tbv_source_user_id', true));
                    if ($their_source === '') {
                        return ['conflict', 'email_collision_existing_user', 'Email already belongs to WordPress user #' . $by_email->ID . ' that has no source user ID; not merged (no identity is inferred from email).'];
                    }
                    if ($their_source !== $key) {
                        return ['conflict', 'email_collision_different_source_id', 'Email already belongs to WordPress user #' . $by_email->ID . ' imported from a different source user.'];
                    }
                    if (!$is_update) {
                        return ['conflict', 'unmapped_destination_exists', 'WordPress user #' . $by_email->ID . ' already carries this source ID without a mapping row; manual review required.'];
                    }
                }
                if (!$is_update && !empty($this->dest_users_by_source[$key])) {
                    return ['conflict', 'unmapped_destination_exists', 'A WordPress user already carries this source ID without a mapping row; manual review required.'];
                }
                return null;

            case 'orders':
                if (!$is_update && !empty($this->dest_orders_by_source[$key])) {
                    return ['conflict', 'unmapped_destination_exists', 'A WooCommerce order already carries this source order ID without a mapping row; manual review required.'];
                }
                if ($f['user_id'] !== null) {
                    if (!isset($this->customer_wp[$f['user_id']])) {
                        return isset($this->export_customers[$f['user_id']])
                            ? ['blocked', 'customer_not_imported', 'Owning source user was not imported (see its issue).']
                            : ['blocked', 'customer_not_in_export', 'Owning source user_id is not present in auth_users.'];
                    }
                    foreach ($this->attempts_by_order[$key] ?? [] as $a) {
                        if ($a['customer_id'] !== null && $a['customer_id'] !== $f['user_id']) {
                            return ['conflict', 'attempt_customer_mismatch', 'A payment attempt for this order names a different customer than orders.user_id.'];
                        }
                    }
                }
                return null;

            case 'payment_attempts':
            case 'credit_ledger':
            case 'affiliate_orders':
                if (!isset($this->order_wc[$f['order_id']])) {
                    return isset($this->export_orders[$f['order_id']])
                        ? ['blocked', 'order_not_imported', 'Referenced order was not imported (see its issue).']
                        : ['blocked', 'order_not_in_export', 'Referenced order is not present in the export.'];
                }
                if (!$is_update && isset($this->dest_records[$entity][$key])) {
                    return ['conflict', 'unmapped_destination_exists', 'A preserved record already exists for this key without a mapping row.'];
                }
                if ($entity === 'affiliate_orders' && !isset($this->affiliate_codes[$f['code']])) {
                    $this->report['warnings'][] = ['entity' => $entity, 'key' => $key, 'code' => 'unknown_affiliate_code', 'message' => 'Commission references an affiliate code that is not in the affiliates table.'];
                }
                return null;

            default:
                if (!$is_update && isset($this->dest_records[$entity][$key])) {
                    return ['conflict', 'unmapped_destination_exists', 'A preserved record already exists for this key without a mapping row.'];
                }
                if ($entity === 'affiliate_payouts' && !isset($this->affiliate_codes[$f['code']])) {
                    $this->report['warnings'][] = ['entity' => $entity, 'key' => $key, 'code' => 'unknown_affiliate_code', 'message' => 'Payout references an affiliate code that is not in the affiliates table.'];
                }
                return null;
        }
    }

    /* ----------------------------------------------------------------- writes */

    private function write(string $entity, array $rec, int $dest_id): int
    {
        if ($entity === 'customers') {
            return $this->write_customer($rec, $dest_id);
        }
        if ($entity === 'orders') {
            return $this->write_order($rec, $dest_id);
        }
        return $this->write_record($entity, $rec, $dest_id);
    }

    private function map_insert(string $entity, array $rec, int $dest_id): void
    {
        global $wpdb;
        $now = current_time('mysql', true);
        $ok = $wpdb->insert(TBV_LM_Schema::table('map'), [
            'entity' => $entity, 'source_key' => $rec['key'], 'source_hash' => $rec['hash'],
            'dest_type' => $entity === 'customers' ? 'user' : ($entity === 'orders' ? 'order' : 'record'),
            'dest_id' => $dest_id, 'revision' => 1, 'run_id' => $this->run_id,
            'created_at' => $now, 'updated_at' => $now,
        ]);
        if ($ok !== 1) {
            throw new RuntimeException('Mapping insert failed: ' . $wpdb->last_error);
        }
    }

    private function map_update(string $entity, array $rec, array $existing): void
    {
        global $wpdb;
        $ok = $wpdb->update(TBV_LM_Schema::table('map'), [
            'source_hash' => $rec['hash'], 'revision' => (int) $existing['revision'] + 1,
            'run_id' => $this->run_id, 'updated_at' => current_time('mysql', true),
        ], ['id' => (int) $existing['id'], 'source_hash' => $existing['source_hash']]);
        if ($ok !== 1) {
            throw new RuntimeException('Mapping update failed (concurrent change?): ' . $wpdb->last_error);
        }
    }

    private function str($v): string
    {
        return is_scalar($v) ? trim((string) $v) : '';
    }

    private function address(array $meta): array
    {
        $country_raw = $this->str($meta['country'] ?? '');
        $country = $country_raw === '' ? '' : ($this->countries[strtolower($country_raw)] ?? '');
        $state_raw = $this->str($meta['state'] ?? '');
        $state = $state_raw;
        if ($country !== '' && $state_raw !== '' && isset($this->states[$country])) {
            $state = $this->states[$country][strtolower($state_raw)] ?? $state_raw;
        }
        return [
            'first_name' => $this->str($meta['firstName'] ?? ''),
            'last_name'  => $this->str($meta['lastName'] ?? ''),
            'address_1'  => $this->str($meta['address'] ?? ''),
            'address_2'  => $this->str($meta['address2'] ?? ''),
            'city'       => $this->str($meta['city'] ?? ''),
            'state'      => $state,
            'postcode'   => $this->str($meta['postalCode'] ?? ''),
            'country'    => $country,
            'phone'      => $this->str($meta['phone'] ?? ''),
            '_country_unmapped' => ($country_raw !== '' && $country === '') ? $country_raw : '',
        ];
    }

    private function write_customer(array $rec, int $dest_id): int
    {
        $f = $rec['f'];
        $addr = $this->address($f['meta']);
        $display = trim($addr['first_name'] . ' ' . $addr['last_name']);
        if ($dest_id === 0) {
            $login = 'tbv_' . substr(str_replace('-', '', $rec['key']), 0, 16);
            $id = wp_insert_user([
                'user_login' => $login,
                'user_email' => $f['email'],
                'user_pass' => wp_generate_password(64, true, true), // never the source hash
                'role' => 'customer',
                'first_name' => $addr['first_name'],
                'last_name' => $addr['last_name'],
                'display_name' => $display !== '' ? $display : $login,
                'user_registered' => TBV_LM_Util::gmt_mysql($f['created_ts']),
            ]);
            if (is_wp_error($id)) {
                throw new RuntimeException('wp_insert_user: ' . $id->get_error_code());
            }
        } else {
            $id = $dest_id;
            $r = wp_update_user([
                'ID' => $id, 'user_email' => $f['email'], 'first_name' => $addr['first_name'],
                'last_name' => $addr['last_name'], 'display_name' => $display !== '' ? $display : get_userdata($id)->user_login,
            ]);
            if (is_wp_error($r)) {
                throw new RuntimeException('wp_update_user: ' . $r->get_error_code());
            }
            $prev = get_user_meta($id, '_tbv_source_hash', true);
            $revs = json_decode((string) get_user_meta($id, '_tbv_source_revisions', true), true) ?: [];
            $revs[] = ['hash' => $prev, 'row' => json_decode((string) get_user_meta($id, '_tbv_source_row', true), true), 'replaced_at' => gmdate('c'), 'run_id' => $this->run_id];
            update_user_meta($id, '_tbv_source_revisions', wp_slash(wp_json_encode($revs)));
        }
        foreach (['first_name', 'last_name', 'address_1', 'address_2', 'city', 'state', 'postcode', 'country', 'phone'] as $k) {
            update_user_meta($id, 'billing_' . $k, $addr[$k]);
            if ($k !== 'phone') {
                update_user_meta($id, 'shipping_' . $k, $addr[$k]);
            }
        }
        update_user_meta($id, 'billing_email', $f['email']);
        $meta = [
            '_tbv_source_user_id' => $rec['key'],
            '_tbv_source_hash' => $rec['hash'],
            '_tbv_source_row' => TBV_LM_Util::canonical_json($rec['row']),
            '_tbv_source_created_at' => (string) ($rec['row']['created_at'] ?? ''),
            '_tbv_source_email_confirmed_at' => (string) ($rec['row']['email_confirmed_at'] ?? ''),
            '_tbv_source_country' => $addr['_country_unmapped'],
            '_tbv_auth_state' => 'imported_without_password', // account claim / reset handled separately
            '_tbv_import_run_id' => $this->run_id,
        ];
        foreach ($meta as $k => $v) {
            update_user_meta($id, $k, wp_slash($v));
        }
        $check = get_user_meta($id, '_tbv_source_user_id', true);
        if ($check !== $rec['key']) {
            throw new RuntimeException('Customer verification failed after write.');
        }
        TBV_LM_Util::fault('customer:after_write', $rec['key']);
        return (int) $id;
    }

    private function write_order(array $rec, int $dest_id): int
    {
        global $wpdb;
        $f = $rec['f'];
        $m = $f['meta'];
        $key = $rec['key'];
        $customer_id = $f['user_id'] !== null ? (int) $this->customer_wp[$f['user_id']] : 0;

        if ($dest_id === 0) {
            $order = new WC_Order();
        } else {
            $order = wc_get_order($dest_id);
            if (!$order instanceof WC_Order) {
                throw new RuntimeException('Order #' . $dest_id . ' could not be loaded.');
            }
            foreach ($order->get_items(['line_item', 'fee', 'shipping', 'tax', 'coupon']) as $item_id => $item) {
                $order->remove_item($item_id);
            }
            $revs = json_decode((string) $order->get_meta('_tbv_source_revisions'), true) ?: [];
            $revs[] = ['hash' => $order->get_meta('_tbv_source_hash'), 'row' => json_decode((string) $order->get_meta('_tbv_source_row'), true), 'replaced_at' => gmdate('c'), 'run_id' => $this->run_id];
            $order->update_meta_data('_tbv_source_revisions', wp_json_encode($revs));
        }

        $order->set_created_via(TBV_LM_CREATED_VIA);
        $order->set_currency('USD');
        $order->set_prices_include_tax(false);
        $order->set_customer_id($customer_id);
        $addr = $this->address($m);
        foreach (['first_name', 'last_name', 'address_1', 'address_2', 'city', 'state', 'postcode', 'country', 'phone'] as $k) {
            $order->{'set_billing_' . $k}($addr[$k]);
            if ($k !== 'phone') {
                $order->{'set_shipping_' . $k}($addr[$k]);
            }
        }
        $order->set_billing_email($f['email']);
        $order->set_customer_note($this->str($m['orderNotes'] ?? ''));
        $order->set_date_created($f['created_ts']);
        $order->set_payment_method('tbv_legacy_import');
        $order->set_payment_method_title('Imported order'); // customer-visible; processor identity stays in internal meta

        $unmapped = 0;
        foreach ($f['items'] as $it) {
            $match = $this->catalog->match($it['raw']);
            $item = new WC_Order_Item_Product();
            $item->set_name($it['name']);
            $item->set_quantity($it['qty']);
            if ($match['variation_id'] > 0) {
                $item->set_product_id($match['product_id']);
                $item->set_variation_id($match['variation_id']);
            } else {
                $unmapped++;
                $item->add_meta_data('_tbv_unmapped_line', 'yes', true);
            }
            $line = TBV_LM_Util::money($it['line_cents']);
            $item->set_subtotal($line);
            $item->set_total($line);
            $item->set_subtotal_tax('0');
            $item->set_total_tax('0');
            $item->set_taxes(false);
            if (isset($it['raw']['dose']) && is_scalar($it['raw']['dose']) && $it['raw']['dose'] !== '') {
                $item->add_meta_data('Dose', (string) $it['raw']['dose'], true);
            }
            $item->add_meta_data('_tbv_source_line_index', (string) $it['index'], true);
            $item->add_meta_data('_tbv_unit_price_cents', (string) $it['unit_cents'], true);
            $item->add_meta_data('_tbv_line_cents', (string) $it['line_cents'], true);
            $item->add_meta_data('_tbv_catalog_match', $match['status'], true);
            $item->add_meta_data('_tbv_source_item', TBV_LM_Util::canonical_json($it['raw']), true);
            $order->add_item($item);
        }

        $shipping_type = $this->str($m['shippingType'] ?? '');
        if ($f['shipping_cents'] !== 0 || $shipping_type !== '') {
            $ship = new WC_Order_Item_Shipping();
            $ship->set_method_title('Shipping' . ($shipping_type !== '' ? ' (' . $shipping_type . ')' : ''));
            $ship->set_method_id('tbv_legacy_shipping');
            $ship->set_total(TBV_LM_Util::money($f['shipping_cents']));
            $ship->set_taxes(false);
            $ship->add_meta_data('_tbv_shipping_cents', (string) $f['shipping_cents'], true);
            $order->add_item($ship);
        }

        foreach ($f['components'] as $component => $cents) {
            $def = TBV_LM_Export::COMPONENTS[$component];
            $label = $def['label'];
            if ($component === 'promoDiscount' && $this->str($m['promoCode'] ?? '') !== '') {
                $label .= ' (' . $this->str($m['promoCode']) . ')';
            }
            if ($component === 'affiliateDiscount' && $this->str($m['affiliateCode'] ?? '') !== '') {
                $label .= ' (' . $this->str($m['affiliateCode']) . ')';
            }
            $signed = $def['sign'] * $cents;
            $fee = new WC_Order_Item_Fee();
            $fee->set_name($label);
            $fee->set_amount(TBV_LM_Util::money($signed));
            $fee->set_total(TBV_LM_Util::money($signed));
            $fee->set_tax_status('none');
            $fee->set_total_tax('0');
            $fee->set_taxes(false);
            $fee->add_meta_data('_tbv_component', $component, true);
            $fee->add_meta_data('_tbv_component_cents', (string) $signed, true);
            $order->add_item($fee);
        }

        $order->set_shipping_total(TBV_LM_Util::money($f['shipping_cents']));
        $order->set_shipping_tax('0');
        $order->set_discount_total('0');
        $order->set_discount_tax('0');
        $order->set_cart_tax('0');
        $order->set_total(TBV_LM_Util::money($f['total_cents']));

        // Historical status without a status transition: no woocommerce_order_status_* hooks,
        // so no emails, stock changes, payment-complete or refund automation.
        $order->set_status($f['woo_status']);
        \Closure::bind(function () {
            $this->status_transition = false;
        }, $order, WC_Order::class)();
        $order->set_date_paid($f['paid_ts'] ?: null);
        $order->set_date_completed(null);
        // Make later admin status edits inert for stock/sales/new-order email on historical records.
        $order->set_order_stock_reduced(true);
        $order->set_recorded_sales(true);
        $order->set_recorded_coupon_usage_counts(true);
        $order->set_new_order_email_sent(true);
        $order->set_download_permissions_granted(true);

        $attempt_refs = array_column($this->attempts_by_order[$key] ?? [], 'ref');
        sort($attempt_refs);
        $meta = [
            '_tbv_legacy_import' => 'yes',
            '_tbv_source_order_id' => $key,
            '_tbv_invoice_number' => preg_match('/^INV-([A-Za-z0-9]{8}|[A-Fa-f0-9]{32})$/', $key) ? $key : '',
            '_tbv_source_invoice_id' => $this->str($m['invoiceId'] ?? ''),
            '_tbv_source_status' => (string) $f['status'],
            '_tbv_source_user_id' => (string) $f['user_id'],
            '_tbv_source_email' => $f['email'],
            '_tbv_source_created_at' => (string) ($rec['row']['created_at'] ?? ''),
            '_tbv_source_paid_at' => (string) ($rec['row']['paid_at'] ?? ''),
            '_tbv_source_updated_at' => (string) ($rec['row']['updated_at'] ?? ''),
            '_tbv_payment_provider' => $f['provider'],
            '_tbv_payment_id' => $f['payment_id'],
            '_tbv_payment_attempt_refs' => wp_json_encode($attempt_refs),
            '_tbv_source_total_cents' => (string) $f['total_cents'],
            '_tbv_component_sum_cents' => (string) $f['computed_cents'],
            '_tbv_total_mismatch_cents' => (string) ($f['total_cents'] - $f['computed_cents']),
            '_tbv_lines_cents' => (string) $f['lines_cents'],
            '_tbv_store_credit_used_cents' => (string) ($f['components']['storeCreditUsed'] ?? 0),
            '_tbv_affiliate_code' => TBV_LM_Util::norm_code($m['affiliateCode'] ?? ''),
            '_tbv_affiliate_commission' => $this->str($m['affiliateCommission'] ?? ''),
            '_tbv_affiliate_commission_adjustment' => $this->str($rec['row']['affiliate_commission_adjustment'] ?? ''),
            '_tbv_tracking_number' => $this->str($rec['row']['tracking_number'] ?? ($m['trackingNumber'] ?? '')),
            '_tbv_tracking_number_2' => $this->str($rec['row']['tracking_number_2'] ?? ($m['trackingNumber2'] ?? '')),
            '_tbv_tracking_number_sent_at' => $this->str($rec['row']['tracking_number_sent_at'] ?? ($m['trackingNumberSentAt'] ?? '')),
            '_tbv_admin_note' => $this->str($rec['row']['admin_note'] ?? ($m['adminNote'] ?? '')),
            '_tbv_source_country' => $addr['_country_unmapped'],
            '_tbv_unmapped_lines' => (string) $unmapped,
            '_tbv_source_row' => TBV_LM_Util::canonical_json($rec['row']),
            '_tbv_source_hash' => $rec['hash'],
            '_tbv_import_run_id' => (string) $this->run_id,
        ];
        foreach ($meta as $k => $v) {
            $order->update_meta_data($k, $v);
        }
        $id = (int) $order->save();
        if ($id < 1) {
            throw new RuntimeException('Order save returned no ID.');
        }
        TBV_LM_Util::fault('order:after_save', $key);

        // Independent read-back of the persisted row before commit.
        $orders_table = $wpdb->prefix . 'wc_orders';
        $row = $wpdb->get_row($wpdb->prepare("SELECT status, total_amount, customer_id, currency FROM {$orders_table} WHERE id = %d", $id), ARRAY_A);
        if (!$row || $row['status'] !== 'wc-' . $f['woo_status'] || TBV_LM_Util::cents($row['total_amount']) !== $f['total_cents']
            || (int) $row['customer_id'] !== $customer_id || $row['currency'] !== 'USD') {
            throw new RuntimeException('Order verification failed after save.');
        }
        return $id;
    }

    private function write_record(string $entity, array $rec, int $dest_id): int
    {
        global $wpdb;
        $f = $rec['f'];
        $email = $f['email'] ?? '';
        $customer = $f['customer_id'] ?? null;
        $wp_user = null;
        if ($customer !== null && ($this->customer_wp[$customer] ?? 0) > 0) {
            $wp_user = $this->customer_wp[$customer];
        } elseif ($email !== '' && ($this->email_wp[$email] ?? 0) > 0) {
            $wp_user = $this->email_wp[$email];
        }
        $order_id = $f['order_id'] ?? null;
        $wc_order = ($order_id !== null && ($this->order_wc[$order_id] ?? 0) > 0) ? $this->order_wc[$order_id] : null;
        $occurred = $f['occurred_ts'] ?? ($f['created_ts'] ?? null);
        $cols = [
            'entity' => $entity,
            'source_key' => $rec['key'],
            'source_customer_id' => $customer,
            'email' => $email !== '' ? $email : null,
            'wp_user_id' => $wp_user,
            'source_order_id' => $order_id,
            'wc_order_id' => $wc_order,
            'affiliate_code' => ($f['code'] ?? '') !== '' ? $f['code'] : null,
            'amount_cents' => $f['amount_cents'] ?? null,
            'before_cents' => $f['before_cents'] ?? null,
            'balance_cents' => $f['balance_cents'] ?? null,
            'kind' => $entity === 'credit_adjustments' ? $f['mode'] : (($f['kind'] ?? '') !== '' ? $f['kind'] : null),
            'state' => ($f['state'] ?? '') !== '' ? $f['state'] : null,
            'provider' => ($f['provider'] ?? '') !== '' ? $f['provider'] : null,
            'occurred_at' => $occurred ? TBV_LM_Util::gmt_mysql($occurred) : null,
            'payload' => TBV_LM_Util::canonical_json($rec['row']),
            'payload_hash' => $rec['hash'],
            'run_id' => $this->run_id,
            'updated_at' => current_time('mysql', true),
        ];
        $table = TBV_LM_Schema::table('records');
        if ($dest_id === 0) {
            $cols['created_at'] = $cols['updated_at'];
            if ($wpdb->insert($table, $cols) !== 1) {
                throw new RuntimeException('Record insert failed: ' . $wpdb->last_error);
            }
            $id = (int) $wpdb->insert_id;
        } else {
            $prev = $wpdb->get_row($wpdb->prepare("SELECT payload, payload_hash, revisions FROM {$table} WHERE id = %d", $dest_id), ARRAY_A);
            $revs = json_decode((string) ($prev['revisions'] ?? ''), true) ?: [];
            $revs[] = ['hash' => $prev['payload_hash'], 'row' => json_decode($prev['payload'], true), 'replaced_at' => gmdate('c'), 'run_id' => $this->run_id];
            $cols['revisions'] = wp_json_encode($revs);
            if ($wpdb->update($table, $cols, ['id' => $dest_id]) !== 1) {
                throw new RuntimeException('Record update failed: ' . $wpdb->last_error);
            }
            $id = $dest_id;
        }
        TBV_LM_Util::fault('record:after_write', $rec['key']);
        return $id;
    }

    /** Fill customer links for preserved records whose customer was imported later. */
    private function relink(): void
    {
        global $wpdb;
        $table = TBV_LM_Schema::table('records');
        $rows = $wpdb->get_results("SELECT id, email, source_customer_id FROM {$table} WHERE wp_user_id IS NULL AND (email IS NOT NULL OR source_customer_id IS NOT NULL)", ARRAY_A);
        foreach ($rows as $r) {
            $uid = 0;
            if ($r['source_customer_id'] && ($this->customer_wp[$r['source_customer_id']] ?? 0) > 0) {
                $uid = $this->customer_wp[$r['source_customer_id']];
            } elseif ($r['email'] && ($this->email_wp[$r['email']] ?? 0) > 0) {
                $uid = $this->email_wp[$r['email']];
            }
            if ($uid > 0) {
                $wpdb->update($table, ['wp_user_id' => $uid], ['id' => (int) $r['id']]);
                $this->report['relinked']++;
            }
        }
    }

    private function find_missing(): void
    {
        foreach (TBV_LM_Export::ENTITIES as $entity) {
            $present = [];
            foreach ($this->export->records[$entity] as $r) {
                $present[$r['key']] = true;
            }
            foreach ($this->map[$entity] as $key => $row) {
                if (!isset($present[$key])) {
                    $this->report['missing_from_source'][] = ['entity' => $entity, 'key' => (string) $key, 'dest_id' => (int) $row['dest_id']];
                }
            }
        }
    }
}
