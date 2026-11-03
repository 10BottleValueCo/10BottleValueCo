<?php
/**
 * Deterministic SYNTHETIC export in the normalized "tbv-supabase-export" v1 shape.
 * Every person is fictional (@example.test), every amount is invented. Column
 * names follow supabase/migrations/*.sql and the storefront code that writes
 * those tables; see README "Source schema evidence".
 *
 * Usage: php generate-fixture.php [--variant=base|changed|secret|missing] [--out=path]
 *
 *  base     edge cases: guest orders, multi-line, unmapped product, unknown status,
 *           email collisions, StoreCredit + Merit partial credit + hold, adjustments,
 *           refunded/cancelled orders, affiliate with commissions and payouts.
 *  changed  base with edited financial rows + one new order (conflict tests).
 *  secret   base plus a credential column (must abort the run).
 *  missing  base without one previously imported order (must be reported, not deleted).
 */

$opts = getopt('', ['variant::', 'out::']);
$variant = $opts['variant'] ?? 'base';
if (!in_array($variant, ['base', 'changed', 'secret', 'missing'], true)) {
    fwrite(STDERR, "Unknown variant\n");
    exit(1);
}

function u(string $label): string
{
    $h = hash('sha256', 'tbv-synthetic-fixture:' . $label);
    return sprintf('%s-%s-4%s-a%s-%s', substr($h, 0, 8), substr($h, 8, 4), substr($h, 13, 3), substr($h, 17, 3), substr($h, 20, 12));
}

function hex64(string $label): string
{
    return hash('sha256', 'tbv-synthetic-hex:' . $label);
}

function addr(string $first, string $last, string $street, string $city, string $state, string $zip, string $country, string $phone): array
{
    return ['firstName' => $first, 'lastName' => $last, 'address' => $street, 'address2' => '', 'city' => $city,
        'state' => $state, 'postalCode' => $zip, 'country' => $country, 'phone' => $phone];
}

$people = [
    'ada'  => ['ada.lovelace@example.test', addr('Ada', 'Lovelace', '12 Analytical Way', 'Springfield', 'California', '90001', 'United States', '555-0101'), '2025-11-02T10:15:00.123456+00:00'],
    'ben'  => ['ben.okafor@example.test', addr('Ben', 'Okafor', '4 Maple Row', 'Toronto', 'Ontario', 'M5V 2T6', 'Canada', '555-0102'), '2025-11-05 08:00:00+00'],
    'cora' => ['cora.reyes@example.test', addr('Cora', 'Reyes', '77 Referral Rd', 'Austin', 'TX', '73301', 'United States', '555-0103'), '2025-10-20T12:00:00Z'],
    'dev'  => ['dev.patel@example.test', addr('Dev', 'Patel', '9 Harbour St', 'Sydney', 'New South Wales', '2000', 'Australia', '555-0104'), '2025-12-01T00:00:00+00:00'],
    'eve'  => ['eve.nakamura@example.test', null, '2026-01-03T16:45:10+00:00'],
    'finn' => ['finn.berg@example.test', addr('Finn', 'Berg', '3 Fjord Ln', 'Bergen', '', '5003', 'Norway', '555-0106'), '2025-12-15T09:09:09+00:00'],
    'gia'  => ['gia.romano@example.test', addr('Gia', 'Romano', '1 Wardrobe Ct', 'Cair Paravel', '', '00000', 'Narnia', '555-0107'), '2026-02-01T11:11:11+00:00'],
    'hal'  => ['hal.jordan@example.test', addr('Hal', 'Jordan', '2814 Sector Ave', 'Coast City', 'CA', '90210', 'US', '555-0108'), '2026-02-10T10:00:00+00:00'],
    // Collides with a pre-existing WordPress user that has no source ID (seeded staging customer).
    'collide-existing' => ['test.customer1@example.test', addr('Colliding', 'Existing', '1 Test St', 'Testville', '', '00001', 'United States', '555-0109'), '2026-01-20T10:00:00+00:00'],
    // Collides with a WordPress user that the test creates carrying a different source ID.
    'collide-other' => ['other.source@example.test', addr('Colliding', 'Other', '2 Test St', 'Testville', '', '00002', 'United States', '555-0110'), '2026-01-21T10:00:00+00:00'],
];

$auth_users = [];
foreach ($people as $label => [$email, $meta, $created]) {
    $auth_users[] = [
        'id' => u($label),
        'email' => $email,
        'created_at' => $created,
        'email_confirmed_at' => $label === 'eve' ? null : $created,
        'last_sign_in_at' => null,
        'raw_user_meta_data' => $meta,
    ];
}

$catalog = [
    'bpc10'  => ['name' => 'BPC-157', 'dose' => '10 mg'],
    'bpc5'   => ['name' => 'BPC-157', 'dose' => '5 mg'],
    'tb5'    => ['name' => 'TB-500', 'dose' => '5 mg'],
    'tb10'   => ['name' => 'TB-500', 'dose' => '10 mg'],
    'ipa10'  => ['name' => 'Ipamorelin', 'dose' => '10 mg'],
    'ipa5'   => ['name' => 'Ipamorelin', 'dose' => '5 mg'],
    'blend'  => ['name' => 'TB-500 + BPC-157', 'dose' => '10 mg'],
    'cjc'    => ['name' => 'CJC-1295', 'dose' => '5 mg', 'noteLabel' => 'no/d'],
];

function item(array $catalog, string $k, int $qty, $price, array $extra = []): array
{
    return array_merge($catalog[$k], ['quantity' => $qty, 'price' => $price], $extra);
}

function order(string $id, ?string $user, string $email, string $status, $total, string $created, ?string $paid, array $items, array $meta, array $cols = []): array
{
    global $people;
    $person = null;
    foreach ($people as $label => $p) {
        if ($p[0] === $email) {
            $person = $p[1];
        }
    }
    $metadata = array_merge($person ?? [], ['id' => $id, 'email' => $email, 'items' => $items, 'createdAt' => $created], $meta);
    return array_merge([
        'id' => $id,
        'user_id' => $user === null ? null : u($user),
        'email' => $email,
        'status' => $status,
        'total' => $total,
        'created_at' => $created,
        'updated_at' => $paid ?? $created,
        'paid_at' => $paid,
        'payment_provider' => $meta['paymentProvider'] ?? null,
        'payment_id' => $meta['paymentId'] ?? null,
        'items' => $items,
        'metadata' => $metadata,
        'admin_note' => null,
        'tracking_number' => null,
        'tracking_number_2' => null,
        'tracking_number_sent_at' => null,
        'affiliate_commission_adjustment' => null,
    ], $cols);
}

$old_style_id = 'INV-' . strtoupper(substr(hex64('o2'), 0, 32));
$orders = [
    // Merit card, multi-line incl. US warehouse, surcharge, historical price != current price.
    order('INV-A1B2C3D4', 'ada', 'ada.lovelace@example.test', 'paid', 475.86, '2026-01-10T14:00:00+00:00', '2026-01-10T14:05:12+00:00',
        [item($catalog, 'bpc10', 2, 129.00), item($catalog, 'bpc10', 1, 179.00, ['fromWarehouse' => 'us'])],
        ['subtotal' => 437, 'shipping' => 25, 'shippingType' => 'standard', 'automaticDiscount' => 0, 'promoDiscount' => 0, 'affiliateDiscount' => 0,
         'customerCardSurcharge' => 13.86, 'customerCardSurchargeBps' => 300, 'customerCardSurchargeBasis' => 'order_before_credit',
         'cryptoDiscount' => 0, 'storeCreditUsed' => 0, 'total' => 475.86, 'paymentProvider' => 'Merit', 'paymentId' => 'pi_synthetic0001']),
    // Old 32-hex invoice format, Stripe, promo + referral discount, affiliate commission, tracking.
    order($old_style_id, 'ada', 'ada.lovelace@example.test', 'done', 141.65, '2025-12-01T09:30:00+00:00', '2025-12-01T09:31:00+00:00',
        [item($catalog, 'tb5', 1, 149.00)],
        ['subtotal' => 149, 'shipping' => 15, 'shippingType' => 'standard', 'promoCode' => 'WELCOME10', 'promoDiscount' => 14.90,
         'affiliateCode' => 'CORA10', 'affiliateDiscount' => 7.45, 'affiliateCommission' => 14.90, 'total' => 141.65,
         'paymentProvider' => 'stripe', 'paymentId' => 'pi_synthetic0002', 'trackingNumber' => 'SYN-TRACK-0002'],
        ['tracking_number' => 'SYN-TRACK-0002', 'tracking_number_sent_at' => '2025-12-03T10:00:00+00:00']),
    // Guest, crypto discount.
    order('INV-GUEST001', null, 'guest.buyer@example.test', 'shipped', '169.65', '2026-01-15T18:00:00+00:00', '2026-01-15T18:20:00+00:00',
        [item($catalog, 'ipa10', 1, 159.00)],
        ['subtotal' => 159, 'shipping' => 15, 'shippingType' => 'express', 'cryptoDiscount' => 4.35, 'total' => 169.65,
         'paymentProvider' => 'nowpayments · USDT', 'paymentId' => 'np_synthetic_0003', 'firstName' => 'Gus', 'lastName' => 'Guest',
         'address' => '5 Visitor Pl', 'city' => 'Portland', 'state' => 'OR', 'postalCode' => '97201', 'country' => 'United States']),
    // Null user_id with an email that belongs to Ben: must stay unlinked. Mixed-case status.
    order('INV-GUEST002', null, 'ben.okafor@example.test', 'Shipped', 94.00, '2026-01-20T07:00:00+00:00', '2026-01-20T07:10:00+00:00',
        [item($catalog, 'bpc5', 1, 79.00)],
        ['subtotal' => 79, 'shipping' => 15, 'shippingType' => 'standard', 'total' => 94, 'paymentProvider' => 'catalystpay', 'paymentId' => 'cp_synthetic_0004']),
    // Full StoreCredit order (total 0).
    order('INV-BENCRED1', 'ben', 'ben.okafor@example.test', 'paid', 0, '2026-02-02T12:00:00+00:00', '2026-02-02T12:00:01+00:00',
        [item($catalog, 'tb10', 1, 219.00)],
        ['subtotal' => 219, 'shipping' => 0, 'shippingType' => 'standard', 'storeCreditUsed' => 219.00, 'total' => 0,
         'paymentProvider' => 'StoreCredit', 'checkoutFingerprint' => hex64('o5')]),
    // Merit with partial store credit (consumed).
    order('INV-FINN0001', 'finn', 'finn.berg@example.test', 'paid', 138.79, '2026-02-10T15:00:00+00:00', '2026-02-10T15:03:00+00:00',
        [item($catalog, 'ipa5', 2, 89.00)],
        ['subtotal' => 178, 'shipping' => 15, 'shippingType' => 'standard', 'storeCreditUsed' => 60, 'storeCreditUsedCents' => 6000,
         'customerCardSurcharge' => 5.79, 'customerCardSurchargeBps' => 300, 'customerCardSurchargeBasis' => 'order_before_credit',
         'orderBaseAmountCents' => 19300, 'cardBaseAmountCents' => 13300, 'total' => 138.79, 'paymentProvider' => 'Merit', 'paymentId' => 'pi_synthetic0006']),
    // Unpaid Merit checkout with a credit HOLD.
    order('INV-FINN0002', 'finn', 'finn.berg@example.test', 'checkout', 76.82, '2026-03-01T10:00:00+00:00', null,
        [item($catalog, 'bpc5', 1, 79.00)],
        ['subtotal' => 79, 'shipping' => 15, 'shippingType' => 'standard', 'storeCreditUsed' => 20, 'storeCreditUsedCents' => 2000,
         'customerCardSurcharge' => 2.82, 'customerCardSurchargeBps' => 300, 'total' => 76.82]),
    // Refunded, with affiliate attribution and commission deduction (no refund amount exists in the schema).
    order('INV-DEV00001', 'dev', 'dev.patel@example.test', 'refunded', 114.00, '2026-01-05T05:00:00+00:00', '2026-01-05T05:02:00+00:00',
        [item($catalog, 'cjc', 1, 99.00)],
        ['subtotal' => 99, 'shipping' => 15, 'shippingType' => 'standard', 'affiliateCode' => 'cora10', 'affiliateCommission' => 9.90,
         'refundCommissionDeduction' => 9.90, 'total' => 114, 'paymentProvider' => 'stripe', 'paymentId' => 'pi_synthetic0008'],
        ['affiliate_commission_adjustment' => -9.90]),
    // Cancelled, recorded total edited by admin: components do not sum (warning, total preserved).
    order('INV-DEV00002', 'dev', 'dev.patel@example.test', 'cancelled', 160.00, '2026-01-06T05:00:00+00:00', null,
        [item($catalog, 'tb5', 1, 149.00)],
        ['subtotal' => 149, 'shipping' => 15, 'shippingType' => 'standard', 'total' => 160, 'adminNote' => 'Synthetic manual adjustment'],
        ['admin_note' => 'Synthetic manual adjustment']),
    // One mapped + one unmapped (discontinued) line; unmapped country.
    order('INV-GIA00001', 'gia', 'gia.romano@example.test', 'delivered', 290.50, '2026-02-20T20:00:00+00:00', '2026-02-20T20:05:00+00:00',
        [item($catalog, 'bpc10', 1, 139.00), ['name' => 'Discontinued Synthetic Peptide', 'dose' => '2 mg', 'quantity' => 3, 'price' => 45.50]],
        ['subtotal' => 275.50, 'shipping' => 15, 'shippingType' => 'standard', 'total' => 290.50, 'paymentProvider' => 'cashapp', 'paymentId' => 'ca_synthetic_0010']),
    // Unknown status: must fail closed.
    order('INV-UNKNOWN1', 'hal', 'hal.jordan@example.test', 'awaiting_wire_review', 50.00, '2026-03-05T10:00:00+00:00', null,
        [['name' => 'Discontinued Synthetic Peptide', 'dose' => '2 mg', 'quantity' => 1, 'price' => 35.00]],
        ['subtotal' => 35, 'shipping' => 15, 'shippingType' => 'standard', 'total' => 50]),
    // Owned by the colliding customer: must be blocked, not attached elsewhere.
    order('INV-COLLIDE1', 'collide-existing', 'test.customer1@example.test', 'paid', 94.00, '2026-03-06T10:00:00+00:00', '2026-03-06T10:01:00+00:00',
        [item($catalog, 'bpc5', 1, 79.00)],
        ['subtotal' => 79, 'shipping' => 15, 'shippingType' => 'standard', 'total' => 94, 'paymentProvider' => 'stripe', 'paymentId' => 'pi_synthetic0012', 'affiliateCode' => 'CORA10']),
    // Paylio.
    order('INV-CORA0001', 'cora', 'cora.reyes@example.test', 'paid', 184.00, '2026-03-02T09:00:00+00:00', '2026-03-02T09:10:00+00:00',
        [item($catalog, 'blend', 1, 169.00)],
        ['subtotal' => 169, 'shipping' => 15, 'shippingType' => 'standard', 'total' => 184, 'paymentProvider' => 'paylio', 'paymentId' => 'paylio_syn_0001']),
    // Guest wire transfer awaiting payment.
    order('INV-WIRE0001', null, 'wire.guest@example.test', 'wire_pending', 477.00, '2026-03-08T08:00:00+00:00', null,
        [item($catalog, 'ipa10', 3, 159.00)],
        ['subtotal' => 477, 'shipping' => 0, 'shippingType' => 'express', 'total' => 477, 'firstName' => 'Wanda', 'lastName' => 'Wire', 'country' => 'Germany']),
    order('INV-HAL00001', 'hal', 'hal.jordan@example.test', 'checkout (clicked pay)', 154.00, '2026-03-09T08:00:00+00:00', null,
        [item($catalog, 'bpc10', 1, 139.00)],
        ['subtotal' => 139, 'shipping' => 15, 'shippingType' => 'standard', 'total' => 154]),
];

$merit = function (string $label, string $order, string $user, int $cents, string $state, int $credit, string $created, ?string $paid) use ($people) {
    $ready = $state !== 'reserved';
    return [
        'id' => u($label), 'checkout_key' => u('ck-' . $label), 'email' => $people[$user][0], 'customer_id' => u($user),
        'order_id' => $order, 'quote_fingerprint' => hex64('q-' . $label), 'amount_cents' => $cents, 'currency' => 'usd',
        'snapshot' => ['total' => $cents / 100, 'items' => [], 'paymentRules' => ['customerCardSurchargeBps' => 300], 'costSnapshot' => null],
        'expected_account' => 'acct_synthetic', 'expected_live' => false, 'user_promo_id' => null, 'state' => $state,
        'intent_id' => $ready ? 'pi_' . str_replace('-', '', substr(u('pi-' . $label), 0, 18)) : null,
        'stripe_account' => $ready ? 'acct_synthetic' : null, 'livemode' => $ready ? false : null,
        'created_at' => $created, 'updated_at' => $paid ?? $created, 'bound_at' => $ready ? $created : null, 'paid_at' => $paid,
        'credit_reserved_cents' => $credit, 'credit_request_snapshot' => $credit ? ['storeCreditUsedCents' => $credit] : null,
    ];
};
$merit_attempts = [
    $merit('m1', 'INV-A1B2C3D4', 'ada', 47586, 'paid', 0, '2026-01-10T14:00:00+00:00', '2026-01-10T14:05:12+00:00'),
    $merit('m2', 'INV-FINN0001', 'finn', 13879, 'paid', 6000, '2026-02-10T15:00:00+00:00', '2026-02-10T15:03:00+00:00'),
    $merit('m3', 'INV-FINN0002', 'finn', 7682, 'reserved', 2000, '2026-03-01T10:00:00+00:00', null),
];
$paylio_attempts = [[
    'id' => u('p1'), 'order_id' => 'INV-CORA0001', 'customer_id' => u('cora'), 'email' => 'cora.reyes@example.test',
    'fingerprint' => hex64('p1f'), 'account_fingerprint' => hex64('p1a'), 'payout_address' => 'synthetic-payout-address',
    'amount_cents' => 18400, 'currency' => 'USD', 'quote' => ['total' => 184], 'state' => 'paid', 'payment_id' => 'paylio_syn_0001',
    'created_at' => '2026-03-02T09:00:00+00:00', 'paid_at' => '2026-03-02T09:10:00+00:00', 'effects_applied_at' => '2026-03-02T09:10:05+00:00', 'effects_error' => null,
]];

$user_credits = [
    ['email' => 'ben.okafor@example.test', 'amount' => 71.00, 'updated_at' => '2026-02-15T00:00:00+00:00', 'note' => 'Synthetic'],
    ['email' => 'finn.berg@example.test', 'amount' => 0, 'updated_at' => '2026-03-01T10:00:00+00:00', 'note' => null],
    ['email' => 'eve.nakamura@example.test', 'amount' => '40.00', 'updated_at' => '2026-01-04T00:00:00+00:00', 'note' => 'Synthetic goodwill'],
    ['email' => 'ada.lovelace@example.test', 'amount' => 10, 'updated_at' => '2025-12-02T00:00:00+00:00', 'note' => 'Legacy credit, no adjustment row'],
    ['email' => 'orphan.credit@example.test', 'amount' => 12.34, 'updated_at' => '2025-11-11T00:00:00+00:00', 'note' => 'No matching account'],
    ['email' => 'test.customer1@example.test', 'amount' => 5.00, 'updated_at' => '2026-01-21T00:00:00+00:00', 'note' => 'Owner is a collision'],
];
$ledger = [
    ['order_id' => 'INV-BENCRED1', 'customer_id' => u('ben'), 'email' => 'ben.okafor@example.test', 'credit_cents' => 21900, 'provider' => 'storecredit',
     'state' => 'consumed', 'fingerprint' => hex64('o5'), 'snapshot' => ['total' => 0, 'storeCreditUsed' => 219], 'created_at' => '2026-02-02T12:00:00+00:00', 'consumed_at' => '2026-02-02T12:00:01+00:00'],
    ['order_id' => 'INV-FINN0001', 'customer_id' => u('finn'), 'email' => 'finn.berg@example.test', 'credit_cents' => 6000, 'provider' => 'merit',
     'state' => 'consumed', 'fingerprint' => hex64('q-m2'), 'snapshot' => ['storeCreditUsedCents' => 6000], 'created_at' => '2026-02-10T15:00:00+00:00', 'consumed_at' => '2026-02-10T15:03:00+00:00'],
    ['order_id' => 'INV-FINN0002', 'customer_id' => u('finn'), 'email' => 'finn.berg@example.test', 'credit_cents' => 2000, 'provider' => 'merit',
     'state' => 'held', 'fingerprint' => hex64('q-m3'), 'snapshot' => ['storeCreditUsedCents' => 2000], 'created_at' => '2026-03-01T10:00:00+00:00', 'consumed_at' => null],
];
$adjust = fn ($label, $email, $mode, $amount, $before, $balance, $at, $note) => [
    'request_id' => u($label), 'email' => $email, 'admin_id' => u('support-admin'), 'mode' => $mode, 'amount_cents' => $amount,
    'note' => $note, 'before_cents' => $before, 'balance_cents' => $balance, 'created_at' => $at,
];
$adjustments = [
    $adjust('a1', 'ben.okafor@example.test', 'set', 25000, 0, 25000, '2026-01-25T00:00:00+00:00', 'Synthetic opening balance'),
    $adjust('a2', 'ben.okafor@example.test', 'add', 4000, 3100, 7100, '2026-02-15T00:00:00+00:00', 'Synthetic goodwill'),
    $adjust('a3', 'finn.berg@example.test', 'add', 8000, 0, 8000, '2026-02-01T00:00:00+00:00', 'Synthetic referral reward'),
    $adjust('a4', 'eve.nakamura@example.test', 'add', 4000, 0, 4000, '2026-01-04T00:00:00+00:00', null),
];

$affiliates = [
    ['code' => 'CORA10', 'email' => 'cora.reyes@example.test', 'active' => true, 'created_at' => '2025-10-21T00:00:00+00:00'],
    ['code' => 'OLDPARTNER', 'email' => 'old.partner@example.test', 'active' => false, 'created_at' => '2025-06-01T00:00:00+00:00'],
];
$affiliate_customers = [
    ['email' => 'ada.lovelace@example.test', 'affiliate_code' => 'CORA10', 'created_at' => '2025-11-30T00:00:00+00:00'],
    ['email' => 'dev.patel@example.test', 'affiliate_code' => 'CORA10', 'created_at' => '2026-01-04T00:00:00+00:00'],
];
$affiliate_orders = [
    ['id' => 1, 'order_id' => $old_style_id, 'affiliate_code' => 'CORA10', 'commission_amount' => 14.90, 'shipping_type' => 'standard', 'created_at' => '2025-12-01T09:31:00+00:00'],
    ['id' => 2, 'order_id' => 'INV-DEV00001', 'affiliate_code' => 'CORA10', 'commission_amount' => 9.90, 'shipping_type' => 'standard', 'created_at' => '2026-01-05T05:02:00+00:00'],
    ['id' => 3, 'order_id' => 'INV-COLLIDE1', 'affiliate_code' => 'CORA10', 'commission_amount' => 5.00, 'shipping_type' => 'standard', 'created_at' => '2026-03-06T10:01:00+00:00'],
];
$affiliate_payouts = [
    ['id' => 1, 'affiliate_code' => 'CORA10', 'amount' => 10.00, 'note' => 'Synthetic payout 1', 'created_at' => '2026-01-31T00:00:00+00:00'],
    ['id' => 2, 'affiliate_code' => 'CORA10', 'amount' => '2.50', 'note' => 'Synthetic payout 2', 'created_at' => '2026-02-28T00:00:00+00:00'],
    ['id' => 3, 'affiliate_code' => 'OLDPARTNER', 'amount' => 20.00, 'note' => null, 'created_at' => '2025-07-01T00:00:00+00:00'],
    ['id' => 4, 'affiliate_code' => 'GHOSTCODE', 'amount' => 1.00, 'note' => 'Code not in affiliates table', 'created_at' => '2025-08-01T00:00:00+00:00'],
];

if ($variant === 'changed') {
    $orders[0]['total'] = 470.00;                       // financial change to an imported order
    $orders[0]['metadata']['total'] = 470.00;
    $affiliate_payouts[0]['amount'] = 11.00;           // payout amount edited
    $ledger[2]['state'] = 'consumed';                  // hold became consumed
    $ledger[2]['consumed_at'] = '2026-03-02T00:00:00+00:00';
    $auth_users[0]['raw_user_meta_data']['lastName'] = 'King';  // profile change
    $orders[] = order('INV-NEWORDER', 'hal', 'hal.jordan@example.test', 'paid', 94.00, '2026-03-20T08:00:00+00:00', '2026-03-20T08:01:00+00:00',
        [item($catalog, 'bpc5', 1, 79.00)],
        ['subtotal' => 79, 'shipping' => 15, 'shippingType' => 'standard', 'total' => 94, 'paymentProvider' => 'stripe', 'paymentId' => 'pi_synthetic0099']);
}
if ($variant === 'secret') {
    $orders[0]['checkout_access_hash'] = hex64('do-not-import');
}
if ($variant === 'missing') {
    $orders = array_values(array_filter($orders, fn ($o) => $o['id'] !== 'INV-HAL00001'));
}

$export = [
    'format' => 'tbv-supabase-export',
    'format_version' => 1,
    'source' => [
        'synthetic' => true,
        'project_ref' => 'synthetic-fixture-not-a-real-project',
        'exported_at' => '2026-10-27T00:00:00+00:00',
        'generator' => 'wordpress-migration/woo-legacy-migration/bin/generate-fixture.php',
        'variant' => $variant,
    ],
    'tables' => [
        'auth_users' => $auth_users,
        'orders' => $orders,
        'merit_payment_attempts' => $merit_attempts,
        'paylio_payment_attempts' => $paylio_attempts,
        'user_credits' => $user_credits,
        'store_credit_ledger' => $ledger,
        'store_credit_adjustments' => $adjustments,
        'affiliates' => $affiliates,
        'affiliate_customers' => $affiliate_customers,
        'affiliate_orders' => $affiliate_orders,
        'affiliate_payouts' => $affiliate_payouts,
    ],
];

$json = json_encode($export, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_PRESERVE_ZERO_FRACTION) . "\n";
if (!empty($opts['out'])) {
    file_put_contents($opts['out'], $json);
} else {
    echo $json;
}
