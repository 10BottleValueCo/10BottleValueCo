<?php
defined('ABSPATH') || exit;

class TBV_LM_Export_Exception extends RuntimeException
{
}

/**
 * Loads and validates the normalized export ("tbv-supabase-export" v1).
 *
 * File-level problems (bad JSON, wrong format, unknown table, any credential
 * column anywhere) abort the whole run before any write. Row-level problems
 * reject only that row (and anything that depends on it); they are reported.
 * Unknown columns inside a known table are NOT dropped: the full source row is
 * preserved verbatim in destination metadata and participates in the hash.
 */
final class TBV_LM_Export
{
    public const FORMAT = 'tbv-supabase-export';
    public const FORMAT_VERSION = 1;

    /** export table => importer entity */
    public const TABLES = [
        'auth_users'               => 'customers',
        'orders'                   => 'orders',
        'merit_payment_attempts'   => 'payment_attempts',
        'paylio_payment_attempts'  => 'payment_attempts',
        'user_credits'             => 'credit_balances',
        'store_credit_ledger'      => 'credit_ledger',
        'store_credit_adjustments' => 'credit_adjustments',
        'affiliates'               => 'affiliates',
        'affiliate_customers'      => 'affiliate_customers',
        'affiliate_orders'         => 'affiliate_orders',
        'affiliate_payouts'        => 'affiliate_payouts',
    ];

    /** Import order: parents before dependents. */
    public const ENTITIES = [
        'customers', 'orders', 'payment_attempts', 'credit_balances', 'credit_ledger',
        'credit_adjustments', 'affiliates', 'affiliate_customers', 'affiliate_orders', 'affiliate_payouts',
    ];

    public const LEDGER_PROVIDERS = ['merit', 'storecredit', 'stripe', 'nowpayments', 'catalystpay', 'paylio'];

    private const FORBIDDEN_EXACT = ['publishable_key', 'ipn_token', 'checkout_url', 'checkout_access_hash', 'encrypted_password'];
    private const FORBIDDEN_PATTERN = '/(password|secret|token|access_hash|api_?key)/i';

    /** Order metadata amounts that make up the total. sign: +1 adds, -1 subtracts. */
    public const COMPONENTS = [
        'automaticDiscount'     => ['sign' => -1, 'label' => 'Automatic discount'],
        'promoDiscount'         => ['sign' => -1, 'label' => 'Promo discount'],
        'affiliateDiscount'     => ['sign' => -1, 'label' => 'Referral discount'],
        'cryptoDiscount'        => ['sign' => -1, 'label' => 'Payment-method discount'],
        'storeCreditUsed'       => ['sign' => -1, 'label' => 'Store credit applied'],
        'customerCardSurcharge' => ['sign' => 1, 'label' => 'Card surcharge'],
        'paypalFee'             => ['sign' => 1, 'label' => 'Payment fee'],
    ];

    public string $sha256;
    public array $source = [];
    /** @var array<string, array<int, array>> entity => records */
    public array $records = [];

    public static function load(string $path): self
    {
        if (!is_file($path) || !is_readable($path)) {
            throw new TBV_LM_Export_Exception('Export file is not readable.');
        }
        $raw = file_get_contents($path);
        if ($raw === false) {
            throw new TBV_LM_Export_Exception('Export file could not be read.');
        }
        try {
            $data = json_decode($raw, true, 512, JSON_THROW_ON_ERROR | JSON_BIGINT_AS_STRING);
        } catch (JsonException $e) {
            throw new TBV_LM_Export_Exception('Export is not valid JSON: ' . $e->getMessage());
        }
        $export = new self();
        $export->sha256 = hash('sha256', $raw);
        $export->parse($data);
        return $export;
    }

    private function parse($data): void
    {
        if (!is_array($data) || ($data['format'] ?? null) !== self::FORMAT || ($data['format_version'] ?? null) !== self::FORMAT_VERSION) {
            throw new TBV_LM_Export_Exception('Unsupported export: expected format "' . self::FORMAT . '" version ' . self::FORMAT_VERSION . '.');
        }
        if (!isset($data['tables']) || !is_array($data['tables']) || array_is_list($data['tables'])) {
            throw new TBV_LM_Export_Exception('Export has no "tables" object.');
        }
        foreach (array_keys($data['tables']) as $table) {
            if (!isset(self::TABLES[$table])) {
                throw new TBV_LM_Export_Exception('Unrecognized table "' . $table . '": refusing to run rather than silently skip data.');
            }
            if (!TBV_LM_Util::is_list($data['tables'][$table])) {
                throw new TBV_LM_Export_Exception('Table "' . $table . '" must be a JSON array of rows.');
            }
        }
        foreach (['auth_users', 'orders'] as $required) {
            if (!array_key_exists($required, $data['tables'])) {
                throw new TBV_LM_Export_Exception('Required table "' . $required . '" is missing.');
            }
        }
        $found = [];
        self::scan_forbidden($data['tables'], '', $found);
        if ($found) {
            throw new TBV_LM_Export_Exception('Export contains credential-like fields that must never be imported: ' . implode(', ', array_slice(array_unique($found), 0, 10)) . '. Remove them from the export query.');
        }
        $this->source = is_array($data['source'] ?? null) ? $data['source'] : [];

        foreach (self::ENTITIES as $entity) {
            $this->records[$entity] = [];
        }
        foreach (self::TABLES as $table => $entity) {
            foreach ($data['tables'][$table] ?? [] as $i => $row) {
                $this->records[$entity][] = $this->parse_row($table, $entity, $row, $i);
            }
        }
        foreach ($this->records as $entity => &$records) {
            $counts = [];
            foreach ($records as $r) {
                if ($r['key'] !== null) {
                    $counts[$r['key']] = ($counts[$r['key']] ?? 0) + 1;
                }
            }
            foreach ($records as &$r) {
                if ($r['key'] !== null && $counts[$r['key']] > 1) {
                    $r['errors'][] = ['duplicate_source_key', 'The same source key appears ' . $counts[$r['key']] . ' times in the export; no copy is imported.'];
                }
            }
            unset($r);
        }
        unset($records);
    }

    private static function scan_forbidden($value, string $path, array &$found): void
    {
        if (!is_array($value)) {
            return;
        }
        foreach ($value as $k => $v) {
            if (is_string($k) && (in_array(strtolower($k), self::FORBIDDEN_EXACT, true) || preg_match(self::FORBIDDEN_PATTERN, $k))) {
                $found[] = ($path === '' ? '' : preg_replace('/\.\d+/', '[]', $path) . '.') . $k;
            }
            self::scan_forbidden($v, $path === '' ? (string) $k : $path . '.' . $k, $found);
        }
    }

    private function parse_row(string $table, string $entity, $row, int $index): array
    {
        $rec = [
            'entity' => $entity, 'table' => $table, 'index' => $index, 'key' => null,
            'row' => $row, 'hash' => '', 'f' => [], 'errors' => [], 'warnings' => [],
        ];
        if (!is_array($row) || array_is_list($row)) {
            $rec['errors'][] = ['malformed_row', 'Row is not a JSON object.'];
            $rec['key'] = $table . '#' . $index;
            return $rec;
        }
        $rec['hash'] = TBV_LM_Util::hash(['table' => $table, 'row' => $row]);
        $method = 'parse_' . $table;
        $this->$method($rec, $row);
        if ($rec['key'] === null) {
            $rec['key'] = $table . '#' . $index;
            $rec['errors'][] = ['missing_source_key', 'Row has no usable source identifier.'];
        }
        return $rec;
    }

    private static function err(array &$rec, string $code, string $msg): void
    {
        $rec['errors'][] = [$code, $msg];
    }

    private static function ts(array &$rec, array $row, string $col, bool $required): ?int
    {
        if (!array_key_exists($col, $row) || $row[$col] === null) {
            if ($required) {
                self::err($rec, 'invalid_' . $col, $col . ' is required.');
            }
            return null;
        }
        $ts = TBV_LM_Util::timestamp($row[$col]);
        if ($ts === null) {
            self::err($rec, 'invalid_' . $col, $col . ' is not a parseable timestamp.');
        }
        return $ts;
    }

    private static function money(array &$rec, $value, string $label, bool $required, bool $allow_negative = false): ?int
    {
        if ($value === null) {
            if ($required) {
                self::err($rec, 'invalid_' . $label, $label . ' is required.');
            }
            return null;
        }
        $c = TBV_LM_Util::cents($value);
        if ($c === null) {
            self::err($rec, 'invalid_' . $label, $label . ' is not an exact cent amount.');
            return null;
        }
        if ($c < 0 && !$allow_negative) {
            self::err($rec, 'invalid_' . $label, $label . ' is negative.');
            return null;
        }
        return $c;
    }

    private static function int_cents(array &$rec, $value, string $label, bool $required, int $min = PHP_INT_MIN): ?int
    {
        if ($value === null) {
            if ($required) {
                self::err($rec, 'invalid_' . $label, $label . ' is required.');
            }
            return null;
        }
        $c = TBV_LM_Util::int_cents($value);
        if ($c === null || $c < $min) {
            self::err($rec, 'invalid_' . $label, $label . ' must be an integer' . ($min > PHP_INT_MIN ? ' >= ' . $min : '') . '.');
            return null;
        }
        return $c;
    }

    private static function email(array &$rec, $value, bool $required): string
    {
        $e = TBV_LM_Util::norm_email($value);
        if ($e === '' && !$required) {
            return '';
        }
        if ($e === '' || !is_email($e)) {
            self::err($rec, 'invalid_email', 'Email is missing or malformed.');
        }
        return $e;
    }

    private static function str($value): string
    {
        return is_scalar($value) ? (string) $value : '';
    }

    private function parse_auth_users(array &$rec, array $row): void
    {
        if (!TBV_LM_Util::is_uuid($row['id'] ?? null)) {
            self::err($rec, 'invalid_id', 'auth user id must be a UUID.');
        } else {
            $rec['key'] = strtolower($row['id']);
        }
        $meta = $row['raw_user_meta_data'] ?? null;
        if ($meta !== null && (!is_array($meta) || (array_is_list($meta) && $meta !== []))) {
            self::err($rec, 'invalid_raw_user_meta_data', 'raw_user_meta_data must be an object.');
            $meta = null;
        }
        $rec['f'] = [
            'email'        => self::email($rec, $row['email'] ?? null, true),
            'created_ts'   => self::ts($rec, $row, 'created_at', true),
            'confirmed_ts' => self::ts($rec, $row, 'email_confirmed_at', false),
            'meta'         => is_array($meta) ? $meta : [],
        ];
    }

    private function parse_orders(array &$rec, array $row): void
    {
        $id = $row['id'] ?? null;
        if (!is_string($id) || trim($id) === '' || strlen($id) > 191 || $id !== trim($id)) {
            self::err($rec, 'invalid_id', 'order id must be a non-empty trimmed string.');
        } else {
            $rec['key'] = $id;
        }
        $meta = $row['metadata'] ?? null;
        if ($meta !== null && (!is_array($meta) || (array_is_list($meta) && $meta !== []))) {
            self::err($rec, 'invalid_metadata', 'metadata must be an object or null.');
            $meta = null;
        }
        $meta = is_array($meta) ? $meta : [];
        $user_id = $row['user_id'] ?? null;
        if ($user_id !== null && !TBV_LM_Util::is_uuid($user_id)) {
            self::err($rec, 'invalid_user_id', 'user_id must be a UUID or null.');
            $user_id = null;
        }
        $status = $row['status'] ?? null;
        $woo_status = TBV_LM_Status_Map::map($status);
        if ($woo_status === null) {
            self::err($rec, 'unknown_status', 'Source status ' . (is_string($status) ? '"' . $status . '"' : 'null') . ' has no approved WooCommerce mapping.');
        }
        $total = self::money($rec, $row['total'] ?? null, 'total', true);

        $items_src = null;
        if (array_key_exists('items', $row) && $row['items'] !== null) {
            $items_src = $row['items'];
            if (isset($meta['items']) && TBV_LM_Util::canonical($meta['items']) !== TBV_LM_Util::canonical($row['items'])) {
                $rec['warnings'][] = ['items_differ_from_metadata', 'orders.items and metadata.items differ; orders.items was used, metadata kept verbatim.'];
            }
        } elseif (array_key_exists('items', $meta)) {
            $items_src = $meta['items'];
        }
        $items = [];
        $lines_cents = 0;
        if ($items_src === null || $items_src === []) {
            $rec['warnings'][] = ['no_line_items', 'Order has no line items.'];
        } elseif (!TBV_LM_Util::is_list($items_src)) {
            self::err($rec, 'invalid_items', 'items must be an array.');
        } else {
            foreach ($items_src as $n => $item) {
                if (!is_array($item) || array_is_list($item)) {
                    self::err($rec, 'invalid_item', 'Line ' . $n . ' is not an object.');
                    continue;
                }
                $name = $item['name'] ?? null;
                $qty_raw = $item['quantity'] ?? ($item['qty'] ?? 1);
                $qty = TBV_LM_Util::int_cents($qty_raw);
                $price = TBV_LM_Util::cents($item['price'] ?? null);
                if (!is_string($name) || trim($name) === '') {
                    self::err($rec, 'invalid_item', 'Line ' . $n . ' has no name.');
                }
                if ($qty === null || $qty < 1) {
                    self::err($rec, 'invalid_item', 'Line ' . $n . ' quantity must be a positive integer.');
                }
                if ($price === null || $price < 0) {
                    self::err($rec, 'invalid_item', 'Line ' . $n . ' price is not an exact non-negative cent amount.');
                }
                if (is_string($name) && $qty !== null && $qty > 0 && $price !== null && $price >= 0) {
                    $items[] = [
                        'index' => $n, 'name' => $name, 'qty' => $qty, 'unit_cents' => $price,
                        'line_cents' => $price * $qty, 'raw' => $item,
                    ];
                    $lines_cents += $price * $qty;
                }
            }
        }

        $components = [];
        foreach (self::COMPONENTS as $k => $def) {
            if (array_key_exists($k, $meta) && $meta[$k] !== null) {
                $c = self::money($rec, $meta[$k], 'metadata.' . $k, false);
                if ($c !== null && $c !== 0) {
                    $components[$k] = $c;
                }
            }
        }
        $shipping = array_key_exists('shipping', $meta) ? self::money($rec, $meta['shipping'], 'metadata.shipping', false) : null;
        $subtotal = array_key_exists('subtotal', $meta) ? self::money($rec, $meta['subtotal'], 'metadata.subtotal', false) : null;
        $meta_total = array_key_exists('total', $meta) ? TBV_LM_Util::cents($meta['total']) : null;

        $computed = $lines_cents + (int) $shipping;
        foreach ($components as $k => $c) {
            $computed += self::COMPONENTS[$k]['sign'] * $c;
        }
        if ($subtotal !== null && $subtotal !== $lines_cents && !$rec['errors']) {
            $rec['warnings'][] = ['subtotal_mismatch', 'metadata.subtotal differs from the sum of line amounts by ' . TBV_LM_Util::money($subtotal - $lines_cents) . '.'];
        }
        if ($total !== null && $meta_total !== null && $meta_total !== $total) {
            $rec['warnings'][] = ['metadata_total_differs', 'metadata.total differs from orders.total by ' . TBV_LM_Util::money($meta_total - $total) . '; orders.total is used.'];
        }
        if ($total !== null && !$rec['errors'] && $computed !== $total) {
            $rec['warnings'][] = ['total_component_mismatch', 'Line, shipping, discount, credit and fee amounts sum to ' . TBV_LM_Util::money($computed) . ' but orders.total is ' . TBV_LM_Util::money($total) . '; the recorded total is preserved.'];
        }

        $rec['f'] = [
            'email'          => self::email($rec, $row['email'] ?? null, false),
            'user_id'        => $user_id === null ? null : strtolower($user_id),
            'status'         => $status,
            'woo_status'     => $woo_status,
            'total_cents'    => $total,
            'created_ts'     => self::ts($rec, $row, 'created_at', true),
            'paid_ts'        => self::ts($rec, $row, 'paid_at', false),
            'items'          => $items,
            'lines_cents'    => $lines_cents,
            'shipping_cents' => (int) $shipping,
            'components'     => $components,
            'computed_cents' => $computed,
            'meta'           => $meta,
            'provider'       => self::str($row['payment_provider'] ?? ($meta['paymentProvider'] ?? '')),
            'payment_id'     => self::str($row['payment_id'] ?? ($meta['paymentId'] ?? '')),
        ];
    }

    private function parse_attempt_common(array &$rec, array $row, string $prefix, array $states): void
    {
        if (!TBV_LM_Util::is_uuid($row['id'] ?? null)) {
            self::err($rec, 'invalid_id', 'attempt id must be a UUID.');
        } else {
            $rec['key'] = $prefix . ':' . strtolower($row['id']);
        }
        $order_id = $row['order_id'] ?? null;
        if (!is_string($order_id) || $order_id === '') {
            self::err($rec, 'invalid_order_id', 'order_id is required.');
        }
        $state = $row['state'] ?? null;
        if (!in_array($state, $states, true)) {
            self::err($rec, 'invalid_state', 'Unknown attempt state.');
        }
        $customer = $row['customer_id'] ?? null;
        if ($customer !== null && !TBV_LM_Util::is_uuid($customer)) {
            self::err($rec, 'invalid_customer_id', 'customer_id must be a UUID.');
            $customer = null;
        }
        $rec['f'] = [
            'provider'     => $prefix,
            'order_id'     => is_string($order_id) ? $order_id : '',
            'customer_id'  => $customer === null ? null : strtolower($customer),
            'email'        => self::email($rec, $row['email'] ?? null, false),
            'amount_cents' => self::int_cents($rec, $row['amount_cents'] ?? null, 'amount_cents', true, 1),
            'state'        => is_string($state) ? $state : '',
            'created_ts'   => self::ts($rec, $row, 'created_at', true),
            'paid_ts'      => self::ts($rec, $row, 'paid_at', false),
            'reference'    => self::str($prefix === 'merit' ? ($row['intent_id'] ?? '') : ($row['payment_id'] ?? '')),
            'credit_reserved_cents' => isset($row['credit_reserved_cents']) ? self::int_cents($rec, $row['credit_reserved_cents'], 'credit_reserved_cents', false, 0) : null,
        ];
    }

    private function parse_merit_payment_attempts(array &$rec, array $row): void
    {
        $this->parse_attempt_common($rec, $row, 'merit', ['reserved', 'ready', 'paid']);
    }

    private function parse_paylio_payment_attempts(array &$rec, array $row): void
    {
        $this->parse_attempt_common($rec, $row, 'paylio', ['reserved', 'ready', 'paid']);
    }

    private function parse_user_credits(array &$rec, array $row): void
    {
        $email = self::email($rec, $row['email'] ?? null, true);
        if ($email !== '') {
            $rec['key'] = $email;
        }
        $amount = self::money($rec, $row['amount'] ?? null, 'amount', true, true);
        if ($amount !== null && $amount < 0) {
            $rec['warnings'][] = ['negative_balance', 'Source balance is negative.'];
        }
        $rec['f'] = ['email' => $email, 'amount_cents' => $amount, 'occurred_ts' => self::ts($rec, $row, 'updated_at', false)];
    }

    private function parse_store_credit_ledger(array &$rec, array $row): void
    {
        $order_id = $row['order_id'] ?? null;
        if (!is_string($order_id) || $order_id === '') {
            self::err($rec, 'invalid_order_id', 'order_id is required.');
        } else {
            $rec['key'] = $order_id;
        }
        $customer = $row['customer_id'] ?? null;
        if ($customer !== null && !TBV_LM_Util::is_uuid($customer)) {
            self::err($rec, 'invalid_customer_id', 'customer_id must be a UUID or null.');
            $customer = null;
        }
        $provider = $row['provider'] ?? null;
        if (!in_array($provider, self::LEDGER_PROVIDERS, true)) {
            self::err($rec, 'invalid_provider', 'Unknown ledger provider.');
        }
        $state = $row['state'] ?? null;
        if (!in_array($state, ['held', 'consumed'], true)) {
            self::err($rec, 'invalid_state', 'Ledger state must be held or consumed.');
        }
        $rec['f'] = [
            'order_id'     => is_string($order_id) ? $order_id : '',
            'customer_id'  => $customer === null ? null : strtolower($customer),
            'email'        => self::email($rec, $row['email'] ?? null, true),
            'amount_cents' => self::int_cents($rec, $row['credit_cents'] ?? null, 'credit_cents', true, 1),
            'provider'     => is_string($provider) ? $provider : '',
            'state'        => is_string($state) ? $state : '',
            'occurred_ts'  => self::ts($rec, $row, 'created_at', true),
            'consumed_ts'  => self::ts($rec, $row, 'consumed_at', false),
        ];
    }

    private function parse_store_credit_adjustments(array &$rec, array $row): void
    {
        if (!TBV_LM_Util::is_uuid($row['request_id'] ?? null)) {
            self::err($rec, 'invalid_request_id', 'request_id must be a UUID.');
        } else {
            $rec['key'] = strtolower($row['request_id']);
        }
        $mode = $row['mode'] ?? null;
        if (!in_array($mode, ['set', 'add', 'subtract'], true)) {
            self::err($rec, 'invalid_mode', 'Adjustment mode must be set, add or subtract.');
        }
        $rec['f'] = [
            'email'         => self::email($rec, $row['email'] ?? null, true),
            'mode'          => is_string($mode) ? $mode : '',
            'amount_cents'  => self::int_cents($rec, $row['amount_cents'] ?? null, 'amount_cents', true, 0),
            'before_cents'  => self::int_cents($rec, $row['before_cents'] ?? null, 'before_cents', true),
            'balance_cents' => self::int_cents($rec, $row['balance_cents'] ?? null, 'balance_cents', true, 0),
            'occurred_ts'   => self::ts($rec, $row, 'created_at', true),
        ];
    }

    private function parse_affiliates(array &$rec, array $row): void
    {
        $code = TBV_LM_Util::norm_code($row['code'] ?? null);
        if ($code === '') {
            self::err($rec, 'invalid_code', 'Affiliate code is required.');
        } else {
            $rec['key'] = $code;
        }
        $active = $row['active'] ?? null;
        if ($active !== null && !is_bool($active)) {
            self::err($rec, 'invalid_active', 'active must be boolean or null.');
        }
        $rec['f'] = [
            'code' => $code, 'email' => self::email($rec, $row['email'] ?? null, false),
            'state' => $active === true ? 'active' : ($active === false ? 'inactive' : 'unknown'),
            'occurred_ts' => self::ts($rec, $row, 'created_at', false),
        ];
    }

    private function parse_affiliate_customers(array &$rec, array $row): void
    {
        $email = self::email($rec, $row['email'] ?? null, true);
        $code = TBV_LM_Util::norm_code($row['affiliate_code'] ?? null);
        if ($code === '') {
            self::err($rec, 'invalid_code', 'affiliate_code is required.');
        }
        if ($email !== '' && $code !== '') {
            $rec['key'] = $email . '|' . $code;
        }
        $rec['f'] = ['email' => $email, 'code' => $code, 'occurred_ts' => self::ts($rec, $row, 'created_at', false)];
    }

    private function parse_affiliate_orders(array &$rec, array $row): void
    {
        $order_id = $row['order_id'] ?? null;
        if (!is_string($order_id) || $order_id === '') {
            self::err($rec, 'invalid_order_id', 'order_id is required.');
        } else {
            $rec['key'] = $order_id;
        }
        $code = TBV_LM_Util::norm_code($row['affiliate_code'] ?? null);
        if ($code === '') {
            self::err($rec, 'invalid_code', 'affiliate_code is required.');
        }
        $rec['f'] = [
            'order_id' => is_string($order_id) ? $order_id : '', 'code' => $code,
            'amount_cents' => self::money($rec, $row['commission_amount'] ?? null, 'commission_amount', true, true),
            'kind' => self::str($row['shipping_type'] ?? ''),
            'occurred_ts' => self::ts($rec, $row, 'created_at', false),
        ];
    }

    private function parse_affiliate_payouts(array &$rec, array $row): void
    {
        $id = $row['id'] ?? null;
        if ((!is_int($id) && !(is_string($id) && $id !== '')) || (is_int($id) && $id < 1)) {
            self::err($rec, 'invalid_id', 'payout id is required.');
        } else {
            $rec['key'] = (string) $id;
        }
        $code = TBV_LM_Util::norm_code($row['affiliate_code'] ?? null);
        if ($code === '') {
            self::err($rec, 'invalid_code', 'affiliate_code is required.');
        }
        $rec['f'] = [
            'code' => $code,
            'amount_cents' => self::money($rec, $row['amount'] ?? null, 'amount', true, true),
            'occurred_ts' => self::ts($rec, $row, 'created_at', true),
        ];
    }
}
