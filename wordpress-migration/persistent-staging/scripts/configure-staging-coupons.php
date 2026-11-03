<?php
// Staging-only promo code fixture. REVIEW10 mirrors the public 10% code in the
// live storefront's promoCatalog (App.jsx). Affiliate codes and customer promo
// codes are not migrated or connected. Idempotent: updates the coupon in place.
$code = 'review10';
$id = wc_get_coupon_id_by_code($code);
$coupon = new WC_Coupon($id ?: 0);
$coupon->set_code($code);
$coupon->set_description('Staging fixture: live public REVIEW10 (10% review discount).');
$coupon->set_discount_type('percent');
$coupon->set_amount(10);
$coupon->set_individual_use(true);
$coupon->set_usage_limit_per_user(0);
$coupon->update_meta_data('_tbv_staging_fixture', 'promo-2026-10-28');
$coupon->save();
// Sign-up affiliate code fixture: the live sign-up card accepts an active
// affiliate code and locks the account to it. Records attribution only; no
// discount or commission is connected without tbv-affiliates-credit.
update_option('tbv_affiliate_codes', ['REVIEWAFF'], false);
// With tbv-affiliates-credit active, REVIEWAFF is a real synthetic affiliate
// owned by seeded test customer 3, so the referral flow can be tried end to end.
$affiliate = function_exists('tbv_ac_issue_affiliate') ? tbv_ac_issue_affiliate('test.customer3@example.test', 'REVIEWAFF') : null;
echo json_encode(['coupon' => $coupon->get_code(), 'id' => $coupon->get_id(), 'type' => $coupon->get_discount_type(), 'amount' => $coupon->get_amount(), 'affiliateCodes' => get_option('tbv_affiliate_codes'), 'affiliate' => is_wp_error($affiliate) ? $affiliate->get_error_message() : $affiliate]), "\n";
