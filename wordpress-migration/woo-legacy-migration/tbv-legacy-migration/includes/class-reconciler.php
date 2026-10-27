<?php
defined('ABSPATH') || exit;

/**
 * Read-only source-vs-destination reconciliation.
 *
 * Source side: every row in the export (totals include rows that could not be
 * imported, so un-imported money shows up as a difference rather than vanishing).
 * Destination side: read back from WordPress users, WooCommerce order objects and
 * the preserved-records table, not from the importer's mapping hashes. Per-row
 * field comparisons list every mismatch; all money is integer cents.
 */
final class TBV_LM_Reconciler
{
    private TBV_LM_Export $export;
    private array $mismatches = [];
    private array $entities = [];

    public function __construct(TBV_LM_Export $export)
    {
        $this->export = $export;
    }

    public function run(): array
    {
        TBV_LM_Importer::assert_environment();
        $users = $this->dest_users();
        $orders = $this->dest_orders();
        $records = $this->dest_records();

        $this->customers($users);
        $this->orders($orders, $users);
        $this->records($records, $orders);
        $credit = $this->customer_credit($records);
        $affiliate = $this->affiliate_totals($records);

        return [
            'export_sha256' => $this->export->sha256,
            'generated_at' => gmdate('c'),
            'ok' => !$this->mismatches,
            'entities' => $this->entities,
            'customer_credit' => $credit,
            'affiliate_totals' => $affiliate,
            'mismatches' => $this->mismatches,
        ];
    }

    private function mismatch(string $entity, string $key, string $field, $source, $destination, string $reason = ''): void
    {
        $this->mismatches[] = compact('entity', 'key', 'field', 'source', 'destination', 'reason');
    }

    private function cmp(string $entity, string $key, string $field, $source, $destination): bool
    {
        if ($source !== $destination) {
            $this->mismatch($entity, $key, $field, $source, $destination);
            return false;
        }
        return true;
    }

    private static function first_error(array $rec): string
    {
        return $rec['errors'] ? 'invalid source row: ' . $rec['errors'][0][0] : 'not imported (see import report issues)';
    }

    /* ------------------------------------------------------- destination reads */

    private function dest_users(): array
    {
        global $wpdb;
        $out = [];
        $rows = $wpdb->get_results("SELECT u.ID, u.user_email, u.user_registered, um.meta_value AS source_id, sh.meta_value AS source_hash
            FROM {$wpdb->users} u
            JOIN {$wpdb->usermeta} um ON um.user_id = u.ID AND um.meta_key = '_tbv_source_user_id'
            LEFT JOIN {$wpdb->usermeta} sh ON sh.user_id = u.ID AND sh.meta_key = '_tbv_source_hash'", ARRAY_A);
        foreach ($rows as $r) {
            $out[strtolower($r['source_id'])][] = $r;
        }
        return $out;
    }

    private function dest_orders(): array
    {
        $ids = wc_get_orders([
            'type' => 'shop_order', 'limit' => -1, 'return' => 'ids',
            'status' => array_keys(wc_get_order_statuses()),
            'meta_query' => [['key' => '_tbv_legacy_import', 'value' => 'yes']],
        ]);
        $out = [];
        foreach ($ids as $id) {
            $o = wc_get_order($id);
            if (!$o) {
                continue;
            }
            $lines = 0;
            $line_count = 0;
            $unmapped = 0;
            foreach ($o->get_items('line_item') as $item) {
                $lines += TBV_LM_Util::cents($item->get_total()) ?? PHP_INT_MIN;
                $line_count++;
                if ($item->get_variation_id() === 0) {
                    $unmapped++;
                }
            }
            $shipping = 0;
            foreach ($o->get_items('shipping') as $item) {
                $shipping += TBV_LM_Util::cents($item->get_total()) ?? PHP_INT_MIN;
            }
            $components = [];
            foreach ($o->get_items('fee') as $item) {
                $c = (string) $item->get_meta('_tbv_component');
                $components[$c] = ($components[$c] ?? 0) + abs(TBV_LM_Util::cents($item->get_total()) ?? PHP_INT_MIN);
            }
            ksort($components);
            $created = $o->get_date_created();
            $out[(string) $o->get_meta('_tbv_source_order_id')][] = [
                'id' => $o->get_id(),
                'total' => TBV_LM_Util::cents($o->get_total()),
                'lines' => $lines, 'line_count' => $line_count, 'unmapped' => $unmapped,
                'shipping' => $shipping, 'components' => $components,
                'status' => $o->get_status(),
                'customer_id' => $o->get_customer_id(),
                'created_ts' => $created ? $created->getTimestamp() : null,
                'email' => $o->get_billing_email(),
                'source_hash' => (string) $o->get_meta('_tbv_source_hash'),
            ];
        }
        return $out;
    }

    private function dest_records(): array
    {
        global $wpdb;
        $out = [];
        if (!TBV_LM_Schema::exists()) {
            return $out;
        }
        foreach ($wpdb->get_results('SELECT * FROM ' . TBV_LM_Schema::table('records'), ARRAY_A) as $r) {
            $out[$r['entity']][$r['source_key']] = $r;
        }
        return $out;
    }

    private function init_entity(string $entity, array $cents_fields): array
    {
        $e = ['source_count' => 0, 'destination_count' => 0, 'matched' => 0, 'mismatched' => 0,
            'missing_in_destination' => 0, 'extra_in_destination' => 0, 'cents' => []];
        foreach ($cents_fields as $f) {
            $e['cents'][$f] = ['source' => 0, 'destination' => 0];
        }
        return $e;
    }

    private function finish_entity(string $entity, array $e): void
    {
        foreach ($e['cents'] as $field => $pair) {
            if ($pair['source'] !== $pair['destination']) {
                $this->mismatch($entity, '*', 'total_cents.' . $field, $pair['source'], $pair['destination'], 'aggregate');
            }
        }
        if ($e['source_count'] !== $e['destination_count']) {
            $this->mismatch($entity, '*', 'count', $e['source_count'], $e['destination_count'], 'aggregate');
        }
        $this->entities[$entity] = $e;
    }

    /* ---------------------------------------------------------------- entities */

    private function customers(array $users): void
    {
        $e = $this->init_entity('customers', []);
        $seen = [];
        foreach ($this->export->records['customers'] as $rec) {
            $e['source_count']++;
            $key = (string) $rec['key'];
            $seen[$key] = true;
            $dest = $users[$key] ?? [];
            if (!$dest) {
                $e['missing_in_destination']++;
                $this->mismatch('customers', $key, 'presence', 'present', 'missing', self::first_error($rec));
                continue;
            }
            if (count($dest) > 1) {
                $this->mismatch('customers', $key, 'duplicates', 1, count($dest), 'several WordPress users carry this source ID');
            }
            $d = $dest[0];
            $ok = $this->cmp('customers', $key, 'email', $rec['f']['email'] ?? null, strtolower($d['user_email']))
                & $this->cmp('customers', $key, 'registered', isset($rec['f']['created_ts']) ? TBV_LM_Util::gmt_mysql($rec['f']['created_ts']) : null, $d['user_registered'])
                & $this->cmp('customers', $key, 'source_hash', $rec['hash'], (string) $d['source_hash']);
            $e[$ok && count($dest) === 1 ? 'matched' : 'mismatched']++;
        }
        foreach ($users as $key => $list) {
            $e['destination_count'] += count($list);
            if (!isset($seen[(string) $key])) {
                $e['extra_in_destination']++;
                $this->mismatch('customers', (string) $key, 'presence', 'missing', 'present', 'not in this export');
            }
        }
        $this->finish_entity('customers', $e);
    }

    private function orders(array $orders, array $users): void
    {
        $fields = array_merge(['total', 'lines', 'shipping'], array_keys(TBV_LM_Export::COMPONENTS));
        $e = $this->init_entity('orders', $fields);
        $seen = [];
        foreach ($this->export->records['orders'] as $rec) {
            $e['source_count']++;
            $key = (string) $rec['key'];
            $seen[$key] = true;
            $f = $rec['f'];
            if (isset($f['total_cents'])) {
                $e['cents']['total']['source'] += (int) $f['total_cents'];
                $e['cents']['lines']['source'] += (int) $f['lines_cents'];
                $e['cents']['shipping']['source'] += (int) $f['shipping_cents'];
                foreach ($f['components'] as $c => $v) {
                    $e['cents'][$c]['source'] += $v;
                }
            }
            $dest = $orders[$key] ?? [];
            if (!$dest) {
                $e['missing_in_destination']++;
                $this->mismatch('orders', $key, 'presence', 'present', 'missing', self::first_error($rec));
                continue;
            }
            if (count($dest) > 1) {
                $this->mismatch('orders', $key, 'duplicates', 1, count($dest), 'several Woo orders carry this source order ID');
            }
            $d = $dest[0];
            $expected_customer = 0;
            if (($f['user_id'] ?? null) !== null) {
                $expected_customer = isset($users[$f['user_id']]) ? (int) $users[$f['user_id']][0]['ID'] : -1;
            }
            $components = $f['components'] ?? [];
            ksort($components);
            $ok = $this->cmp('orders', $key, 'total_cents', $f['total_cents'] ?? null, $d['total'])
                & $this->cmp('orders', $key, 'lines_cents', $f['lines_cents'] ?? null, $d['lines'])
                & $this->cmp('orders', $key, 'line_count', count($f['items'] ?? []), $d['line_count'])
                & $this->cmp('orders', $key, 'shipping_cents', $f['shipping_cents'] ?? null, $d['shipping'])
                & $this->cmp('orders', $key, 'components_cents', $components, $d['components'])
                & $this->cmp('orders', $key, 'status', $f['woo_status'] ?? null, $d['status'])
                & $this->cmp('orders', $key, 'customer_id', $expected_customer, $d['customer_id'])
                & $this->cmp('orders', $key, 'created_ts', $f['created_ts'] ?? null, $d['created_ts'])
                & $this->cmp('orders', $key, 'email', $f['email'] ?? null, strtolower($d['email']))
                & $this->cmp('orders', $key, 'source_hash', $rec['hash'], $d['source_hash']);
            $e[$ok && count($dest) === 1 ? 'matched' : 'mismatched']++;
        }
        foreach ($orders as $key => $list) {
            foreach ($list as $d) {
                $e['destination_count']++;
                $e['cents']['total']['destination'] += (int) $d['total'];
                $e['cents']['lines']['destination'] += $d['lines'];
                $e['cents']['shipping']['destination'] += $d['shipping'];
                foreach ($d['components'] as $c => $v) {
                    if (isset($e['cents'][$c])) {
                        $e['cents'][$c]['destination'] += $v;
                    }
                }
            }
            if (!isset($seen[(string) $key])) {
                $e['extra_in_destination']++;
                $this->mismatch('orders', (string) $key, 'presence', 'missing', 'present', 'not in this export');
            }
        }
        $this->finish_entity('orders', $e);
    }

    private function records(array $records, array $orders): void
    {
        $cents_fields = [
            'payment_attempts' => ['amount'],
            'credit_balances' => ['amount'],
            'credit_ledger' => ['amount', 'held', 'consumed'],
            'credit_adjustments' => ['add', 'subtract', 'set'],
            'affiliates' => [],
            'affiliate_customers' => [],
            'affiliate_orders' => ['amount'],
            'affiliate_payouts' => ['amount'],
        ];
        foreach ($cents_fields as $entity => $fields) {
            $e = $this->init_entity($entity, $fields);
            $seen = [];
            $bucket = function (array $f) use ($entity, $fields): array {
                $amount = $f['amount_cents'] ?? null;
                if ($amount === null) {
                    return [];
                }
                if ($entity === 'credit_ledger') {
                    return ['amount' => $amount, ($f['state'] === 'held' ? 'held' : 'consumed') => $amount];
                }
                if ($entity === 'credit_adjustments') {
                    return [$f['mode'] => $amount];
                }
                return in_array('amount', $fields, true) ? ['amount' => $amount] : [];
            };
            foreach ($this->export->records[$entity] as $rec) {
                $e['source_count']++;
                $key = (string) $rec['key'];
                $seen[$key] = true;
                $f = $rec['f'];
                foreach ($bucket($f) as $field => $v) {
                    if (isset($e['cents'][$field])) {
                        $e['cents'][$field]['source'] += $v;
                    }
                }
                $d = $records[$entity][$key] ?? null;
                if (!$d) {
                    $e['missing_in_destination']++;
                    $this->mismatch($entity, $key, 'presence', 'present', 'missing', self::first_error($rec));
                    continue;
                }
                $ok = $this->cmp($entity, $key, 'amount_cents', $f['amount_cents'] ?? null, $d['amount_cents'] === null ? null : (int) $d['amount_cents'])
                    & $this->cmp($entity, $key, 'payload_hash', $rec['hash'], $d['payload_hash']);
                if (array_key_exists('state', $f)) {
                    $ok &= $this->cmp($entity, $key, 'state', $f['state'] !== '' ? $f['state'] : null, $d['state']);
                }
                if ($entity === 'credit_adjustments') {
                    $ok &= $this->cmp($entity, $key, 'mode', $f['mode'], $d['kind'])
                        & $this->cmp($entity, $key, 'before_cents', $f['before_cents'], (int) $d['before_cents'])
                        & $this->cmp($entity, $key, 'balance_cents', $f['balance_cents'], (int) $d['balance_cents']);
                }
                if (isset($f['code'])) {
                    $ok &= $this->cmp($entity, $key, 'affiliate_code', $f['code'], (string) $d['affiliate_code']);
                }
                if (isset($f['order_id'])) {
                    $expected = isset($orders[$f['order_id']]) ? (int) $orders[$f['order_id']][0]['id'] : null;
                    $ok &= $this->cmp($entity, $key, 'wc_order_id', $expected, $d['wc_order_id'] === null ? null : (int) $d['wc_order_id']);
                }
                $e[$ok ? 'matched' : 'mismatched']++;
            }
            foreach ($records[$entity] ?? [] as $key => $d) {
                $e['destination_count']++;
                $f = [
                    'amount_cents' => $d['amount_cents'] === null ? null : (int) $d['amount_cents'],
                    'state' => $d['state'], 'mode' => $d['kind'],
                ];
                foreach ($bucket($f) as $field => $v) {
                    if (isset($e['cents'][$field])) {
                        $e['cents'][$field]['destination'] += $v;
                    }
                }
                if (!isset($seen[(string) $key])) {
                    $e['extra_in_destination']++;
                    $this->mismatch($entity, (string) $key, 'presence', 'missing', 'present', 'not in this export');
                }
            }
            $this->finish_entity($entity, $e);
        }
    }

    /** Per-email credit picture. Informational components; no spendable balance is derived. */
    private function customer_credit(array $records): array
    {
        $src = [];
        $dst = [];
        $blank = ['balance_cents' => null, 'held_cents' => 0, 'consumed_cents' => 0, 'adjustments_net_cents' => 0];
        $add = function (array &$t, string $entity, string $email, ?int $amount, ?string $state, ?string $mode, ?int $before, ?int $balance) use ($blank) {
            if ($email === '' || $amount === null) {
                return;
            }
            $t[$email] = $t[$email] ?? $blank;
            if ($entity === 'credit_balances') {
                $t[$email]['balance_cents'] = ($t[$email]['balance_cents'] ?? 0) + $amount;
            } elseif ($entity === 'credit_ledger') {
                $t[$email][$state === 'held' ? 'held_cents' : 'consumed_cents'] += $amount;
            } elseif ($entity === 'credit_adjustments') {
                $delta = $mode === 'add' ? $amount : ($mode === 'subtract' ? -$amount : ((int) $balance - (int) $before));
                $t[$email]['adjustments_net_cents'] += $delta;
            }
        };
        foreach (['credit_balances', 'credit_ledger', 'credit_adjustments'] as $entity) {
            foreach ($this->export->records[$entity] as $rec) {
                $f = $rec['f'];
                $add($src, $entity, $f['email'] ?? '', $f['amount_cents'] ?? null, $f['state'] ?? null, $f['mode'] ?? null, $f['before_cents'] ?? null, $f['balance_cents'] ?? null);
            }
            foreach ($records[$entity] ?? [] as $d) {
                $add($dst, $entity, (string) $d['email'], $d['amount_cents'] === null ? null : (int) $d['amount_cents'], $d['state'], $d['kind'],
                    $d['before_cents'] === null ? null : (int) $d['before_cents'], $d['balance_cents'] === null ? null : (int) $d['balance_cents']);
            }
        }
        $out = [];
        $emails = array_unique(array_merge(array_keys($src), array_keys($dst)));
        sort($emails);
        foreach ($emails as $email) {
            $s = $src[$email] ?? $blank;
            $d = $dst[$email] ?? $blank;
            $match = $s === $d;
            if (!$match) {
                $this->mismatch('customer_credit', $email, 'credit_summary', $s, $d, 'aggregate');
            }
            $out[] = ['email' => $email, 'source' => $s, 'destination' => $d, 'match' => $match];
        }
        return $out;
    }

    private function affiliate_totals(array $records): array
    {
        $src = [];
        $dst = [];
        $blank = ['attributed_orders' => 0, 'commission_cents' => 0, 'payouts' => 0, 'payout_cents' => 0];
        foreach ($this->export->records['affiliate_orders'] as $rec) {
            if (($rec['f']['code'] ?? '') !== '' && isset($rec['f']['amount_cents'])) {
                $src[$rec['f']['code']] = $src[$rec['f']['code']] ?? $blank;
                $src[$rec['f']['code']]['attributed_orders']++;
                $src[$rec['f']['code']]['commission_cents'] += $rec['f']['amount_cents'];
            }
        }
        foreach ($this->export->records['affiliate_payouts'] as $rec) {
            if (($rec['f']['code'] ?? '') !== '' && isset($rec['f']['amount_cents'])) {
                $src[$rec['f']['code']] = $src[$rec['f']['code']] ?? $blank;
                $src[$rec['f']['code']]['payouts']++;
                $src[$rec['f']['code']]['payout_cents'] += $rec['f']['amount_cents'];
            }
        }
        foreach ($records['affiliate_orders'] ?? [] as $d) {
            $dst[$d['affiliate_code']] = $dst[$d['affiliate_code']] ?? $blank;
            $dst[$d['affiliate_code']]['attributed_orders']++;
            $dst[$d['affiliate_code']]['commission_cents'] += (int) $d['amount_cents'];
        }
        foreach ($records['affiliate_payouts'] ?? [] as $d) {
            $dst[$d['affiliate_code']] = $dst[$d['affiliate_code']] ?? $blank;
            $dst[$d['affiliate_code']]['payouts']++;
            $dst[$d['affiliate_code']]['payout_cents'] += (int) $d['amount_cents'];
        }
        $out = [];
        $codes = array_unique(array_merge(array_keys($src), array_keys($dst)));
        sort($codes);
        foreach ($codes as $code) {
            $s = $src[$code] ?? $blank;
            $d = $dst[$code] ?? $blank;
            if ($s !== $d) {
                $this->mismatch('affiliate_totals', $code, 'affiliate_summary', $s, $d, 'aggregate');
            }
            $out[] = ['code' => $code, 'source' => $s, 'destination' => $d, 'match' => $s === $d];
        }
        return $out;
    }
}
