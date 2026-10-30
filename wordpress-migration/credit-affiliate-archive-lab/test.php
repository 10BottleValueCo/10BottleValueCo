<?php
require '/wordpress/wp-load.php';require '/wordpress/wp-content/plugins/tbv-archive/tbv-synthetic-credit-archive.php';
$passed=0;$total=0;$tests=[];$GLOBALS['tbvca_mail_attempts']=0;add_filter('pre_wp_mail',function($value){$GLOBALS['tbvca_mail_attempts']++;return true;},PHP_INT_MAX);
function ck($name,$condition){global $passed,$total,$tests;$total++;$tests[$name]=(bool)$condition;if($condition)$passed++;}
function err($value,$code){return is_wp_error($value)&&$value->get_error_code()===$code;}
function snap($kind,$record,$links=[]){return ['synthetic'=>true,'currency'=>'USD','kind'=>$kind,'record'=>$record,'links'=>$links];}
$dt='2026-10-26T15:12:00.000Z';
$rows=[
 snap('credits',['sourceId'=>'sample-credit-1','customerId'=>'sample-customer-1','email'=>'sample-person@example.invalid','amount'=>'41.00','updatedAt'=>$dt],['customer'=>'sample-wp-user-1']),
 snap('creditLedger',['sourceId'=>'sample-ledger-1','creditId'=>'sample-credit-1','orderId'=>'sample-order-1','amount'=>'9.00','provider'=>'sample-provider','state'=>'held','createdAt'=>$dt,'consumedAt'=>null],['order'=>'sample-wc-order-1']),
 snap('creditAdjustments',['sourceId'=>'sample-adjustment-1','creditId'=>'sample-credit-1','mode'=>'increase','amount'=>'5.00','before'=>'30.00','after'=>'35.00','note'=>'sample-note','createdAt'=>$dt]),
 snap('affiliates',['sourceId'=>'sample-affiliate-1','customerId'=>'sample-customer-1','email'=>'sample-person@example.invalid','affiliateCode'=>'SAMPLE-CODE','active'=>true,'createdAt'=>$dt],['customer'=>'sample-wp-user-1']),
 snap('attributions',['sourceId'=>'sample-attribution-1','affiliateId'=>'sample-affiliate-1','orderId'=>'sample-order-1','commissionAmount'=>'3.20','shippingType'=>'sample-warehouse','createdAt'=>$dt],['order'=>'sample-wc-order-1']),
 snap('payouts',['sourceId'=>'sample-payout-1','affiliateId'=>'sample-affiliate-1','amount'=>'2.10','note'=>'sample-old-payout','createdAt'=>$dt]),
 snap('payouts',['sourceId'=>'sample-payout-2','affiliateId'=>'sample-affiliate-1','amount'=>'3.10','note'=>null,'createdAt'=>$dt]),
];
if (!defined('TBV_SYNTHETIC_ARCHIVE_TEST') || TBV_SYNTHETIC_ARCHIVE_TEST!==true) {ck('runtime_guard',err(tbvca_plan($rows),'test_runtime_required') && err(tbvca_apply($rows),'test_runtime_required'));echo wp_json_encode(compact('passed','total','tests'));return;}
$initial=tbvca_plan($rows);ck('dry_run_seven',is_array($initial)&&count($initial['writes'])===7);ck('dry_run_no_writes',get_option(tbvca_key('credits','sample-credit-1'),false)===false && get_option('_tbvca_lab_lock',false)===false && get_option('_tbvca_schema_version',false)===false && get_option(tbvca_index_key('credit-email','sample-person@example.invalid'),false)===false);
$invalid=$rows;$invalid[0]['record']['email']='person@example.com';ck('real_email_rejected',err(tbvca_plan($invalid),'invalid_synthetic_snapshot'));
$invalid=$rows;$invalid[0]['record']['sourceId']='customer-real-1';ck('nonsynthetic_id_rejected',err(tbvca_plan($invalid),'invalid_synthetic_snapshot'));
$invalid=$rows;$invalid[3]['record']['active']=null;ck('null_boolean_rejected',err(tbvca_plan($invalid),'invalid_synthetic_snapshot'));
$invalid=$rows;$invalid[1]['record']['amount']='9.001';ck('fractional_cent_rejected',err(tbvca_plan($invalid),'invalid_synthetic_snapshot'));
$invalid=$rows;$invalid[1]['record']['consumedAt']=$dt;ck('held_consumption_rejected',err(tbvca_plan($invalid),'invalid_synthetic_snapshot'));
$invalid=$rows;$invalid[0]['record']['updatedAt']='2026-02-30T15:12:00.000Z';ck('invalid_date_rejected',err(tbvca_plan($invalid),'invalid_synthetic_snapshot'));
$invalid=$rows;$invalid[0]['record']['password']='sample-secret';ck('extra_field_rejected',err(tbvca_plan($invalid),'invalid_synthetic_snapshot'));
$invalid=$rows;$invalid[]=$rows[0];ck('duplicate_id_rejected',err(tbvca_plan($invalid),'duplicate_source'));
$invalid=$rows;$invalid[0]['currency']='EUR';ck('currency_mismatch_rejected',err(tbvca_plan($invalid),'currency_conflict'));
$invalid=$rows;$invalid[1]['record']['creditId']='sample-credit-missing';ck('missing_parent_rejected',err(tbvca_plan($invalid),'missing_or_invalid_parent'));
$legacy=tbvca_key('credits','sample-legacy');add_option($legacy,'legacy-data','',false);ck('legacy_archive_not_implicitly_upgraded',err(tbvca_plan($rows),'legacy_archive_needs_rebuild'));delete_option($legacy);
$applied=tbvca_apply($rows);ck('first_apply_seven',is_array($applied)&&$applied['created']===7&&$applied['financial_actions']===0);
$account=json_decode(get_option(tbvca_key('credits','sample-credit-1')),true);$hold=json_decode(get_option(tbvca_key('creditLedger','sample-ledger-1')),true);ck('balance_and_hold_preserved_separately',$account['record']['amount']==='41.00' && $hold['record']['amount']==='9.00' && $hold['record']['state']==='held');
$repeat=tbvca_apply($rows);ck('repeat_idempotent',is_array($repeat)&&$repeat['created']===0&&$repeat['unchanged']===7);
$partial=tbvca_apply([$rows[5]]);ck('stored_parent_resolves',is_array($partial)&&$partial['created']===0&&$partial['unchanged']===1);
$conflict=$rows;$conflict[5]['record']['amount']='2.11';ck('changed_history_conflicts',err(tbvca_apply($conflict),'snapshot_conflict'));ck('conflict_does_not_mutate',json_decode(get_option(tbvca_key('payouts','sample-payout-1')),true)['record']['amount']==='2.10');
$dupe=$rows[0];$dupe['record']['sourceId']='sample-credit-other';ck('duplicate_credit_across_batches',err(tbvca_plan([$dupe]),'identity_conflict'));
$dupe=$rows[3];$dupe['record']['sourceId']='sample-affiliate-other';$dupe['record']['email']='sample-other@example.invalid';ck('duplicate_affiliate_code_across_batches',err(tbvca_plan([$dupe]),'identity_conflict'));
$dupe=$rows[1];$dupe['record']['sourceId']='sample-ledger-other';ck('duplicate_hold_order_across_batches',err(tbvca_plan([$dupe]),'identity_conflict'));
$dupe=$rows[4];$dupe['record']['sourceId']='sample-attribution-other';ck('duplicate_attribution_across_batches',err(tbvca_plan([$dupe]),'identity_conflict'));
$dupe=$rows[3];$dupe['record']['sourceId']='sample-affiliate-other';$dupe['record']['email']='sample-other@example.invalid';$dupe['record']['affiliateCode']='SAMPLE-OTHER';$dupe['links']['customer']='sample-wp-user-other';ck('source_mapping_change_rejected',err(tbvca_plan([$dupe]),'identity_conflict'));
$dupe['record']['customerId']='sample-customer-other';$dupe['links']['customer']='sample-wp-user-1';ck('destination_mapping_collision_rejected',err(tbvca_plan([$dupe]),'identity_conflict'));
$dupe=$rows[4];$dupe['record']['sourceId']='sample-attribution-other';$dupe['links']['order']='sample-wc-order-other';ck('order_source_mapping_change_rejected',err(tbvca_plan([$dupe]),'identity_conflict'));
$dupe['record']['orderId']='sample-order-other';$dupe['links']['order']='sample-wc-order-1';ck('order_destination_collision_rejected',err(tbvca_plan([$dupe]),'identity_conflict'));
update_option('_tbvca_schema_version','3',false);ck('unknown_schema_rejected',err(tbvca_plan($rows),'unsupported_archive_schema'));update_option('_tbvca_schema_version','2',false);
$new=$rows[5];$new['record']['sourceId']='sample-payout-new';$bad=$rows[0];$bad['record']['sourceId']='sample-credit-duplicate';ck('conflicting_batch_writes_nothing',err(tbvca_apply([$new,$bad]),'identity_conflict')&&get_option(tbvca_key('payouts','sample-payout-new'),false)===false);
$idx=tbvca_index_key('affiliate-code','SAMPLE-CODE');$savedIndex=get_option($idx);delete_option($idx);ck('missing_existing_index_blocks_all',err(tbvca_plan([$rows[5]]),'archive_identity_index_corrupt'));add_option($idx,$savedIndex,'',false);
$reverse=$rows; $reverse[0]=array_reverse($reverse[0],true);$reverse[0]['record']=array_reverse($reverse[0]['record'],true);ck('field_order_is_canonical',is_array(tbvca_apply($reverse)));
add_option('_tbvca_lab_lock','held','',false);ck('lock_blocks_writes',err(tbvca_apply($rows),'archive_locked'));ck('lock_blocks_dry_run',err(tbvca_plan($rows),'archive_locked'));delete_option('_tbvca_lab_lock');
$key=tbvca_key('affiliates','sample-affiliate-1');$saved=get_option($key);update_option($key,'invalid',false);$corrupted=tbvca_plan([$rows[5]]);ck('corrupted_parent_blocks',is_wp_error($corrupted)&&in_array($corrupted->get_error_code(),['archive_snapshot_corrupt','archive_parent_corrupt'],true));update_option($key,$saved,false);
$parent=snap('affiliates',['sourceId'=>'sample-affiliate-2','customerId'=>'sample-customer-2','email'=>'sample-other@example.invalid','affiliateCode'=>'SAMPLE-OTHER','active'=>true,'createdAt'=>$dt],['customer'=>'sample-wp-user-2']);
$child=snap('payouts',['sourceId'=>'sample-payout-3','affiliateId'=>'sample-affiliate-2','amount'=>'4.10','note'=>null,'createdAt'=>$dt]);
$GLOBALS['tbvca_test_stop_after']=1;$stopped=tbvca_apply([$child,$parent]);unset($GLOBALS['tbvca_test_stop_after']);ck('partial_saves_parent_before_child',err($stopped,'test_interruption') && get_option(tbvca_key('affiliates','sample-affiliate-2'),false)!==false && get_option(tbvca_key('payouts','sample-payout-3'),false)===false);
$retry=tbvca_apply([$child,$parent]);ck('partial_retry_idempotent',is_array($retry)&&$retry['created']===1&&$retry['unchanged']===1);
ck('no_wp_mail_attempt', $GLOBALS['tbvca_mail_attempts']===0);ck('no_checkout_or_payout_actions',did_action('woocommerce_payment_complete')===0 && did_action('tbv_affiliate_payout')===0);
echo wp_json_encode(compact('passed','total','tests'));
