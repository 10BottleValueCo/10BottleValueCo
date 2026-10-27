<?php
require '/wordpress/wp-load.php';
if (defined('TBV_TEST_CLASSIC') && TBV_TEST_CLASSIC) update_option('woocommerce_custom_orders_table_enabled','no');
require '/wordpress/wp-content/plugins/tbv-synthetic-migration/tbv-synthetic-migration.php';
$c=['id'=>'sample-'.$case.'-customer','email'=>'tbvsm-'.$case.'@example.invalid'];
$o=['id'=>'sample-'.$case.'-order','customerId'=>$c['id'],'createdAt'=>'2026-01-02T03:04:05Z','historicalStatus'=>'paid','paymentReference'=>'sample-'.$case.'-payment','itemName'=>'Synthetic item','quantity'=>2,'subtotal'=>'20.00','shipping'=>'4.00','total'=>'24.00'];
if (defined('TBV_TEST_MULTILINE') && TBV_TEST_MULTILINE) $o=['id'=>$o['id'],'customerId'=>$c['id'],'createdAt'=>$o['createdAt'],'historicalStatus'=>'paid','paymentReference'=>$o['paymentReference'],'items'=>[
 ['id'=>'sample-'.$case.'-line-a','name'=>'Synthetic first item','quantity'=>2,'subtotal'=>'20.00','total'=>'20.00'],
 ['id'=>'sample-'.$case.'-line-b','name'=>'Synthetic second item','quantity'=>1,'subtotal'=>'7.50','total'=>'7.50'],
 ],'shipping'=>'4.00','total'=>'31.50'];
if (defined('TBV_TEST_ADDRESSES') && TBV_TEST_ADDRESSES) $o['addresses']=[
 'billing'=>['first_name'=>'Synthetic Billing','last_name'=>'Synthetic Tester','company'=>'','address_1'=>'Synthetic 1 Example Street','address_2'=>'','city'=>'Synthetic City','state'=>'WA','postcode'=>'00000','country'=>'US','email'=>'billing@example.invalid','phone'=>'0000000000'],
 'shipping'=>['first_name'=>'Synthetic Shipping','last_name'=>'Synthetic Tester','company'=>'','address_1'=>'Synthetic 2 Example Street','address_2'=>'','city'=>'Synthetic City','state'=>'WA','postcode'=>'00000','country'=>'US','phone'=>'0000000000'],
];
$fixture=['synthetic'=>true,'customers'=>[$c],'orders'=>[$o]];
if ($phase==='crash') { $GLOBALS['tbvsm_test_fault']=$fault;tbvsm_apply($fixture);echo 'FAULT_NOT_REACHED';exit; }
function cerr($r,$c){return is_wp_error($r)&&$r->get_error_code()===$c;}
$checks=[];$lock=get_option('_tbvsm_lab_lock',false);$checks['process_exit_left_lock']=is_string($lock) && $lock!=='';
$checks['old_lock_blocks_apply']=cerr(tbvsm_apply($fixture),'locked');$checks['pending_reservation_blocks_plan']=cerr(tbvsm_plan($fixture),'journal_needs_review');
$checks['recovery_requires_stopped_worker']=cerr(tbvsm_clear_stale_lock($lock,false),'unsafe_lock_recovery') && get_option('_tbvsm_lab_lock')===$lock;
$checks['wrong_token_cannot_clear']=cerr(tbvsm_clear_stale_lock('00000000-0000-0000-0000-000000000000',true),'lock_token_mismatch') && get_option('_tbvsm_lab_lock')===$lock;
$checks['verified_stopped_worker_can_clear']=tbvsm_clear_stale_lock($lock,true)===true && get_option('_tbvsm_lab_lock',false)===false;
$uid=email_exists($c['email']);$isCustomer=str_starts_with($fault,'customer_');$kind=$isCustomer?'customer':'order';$row=$isCustomer?$c:$o;
$changed=$row;if($isCustomer) $changed['email']='changed@example.invalid';else $changed['total']='25.00';
$checks['changed_record_rejected']=cerr(tbvsm_reconcile($kind,$changed,$uid),'journal_conflict');
$checks['wrong_target_rejected']=cerr(tbvsm_finish($kind,$row,999999),'recovery_ambiguous');
$ordersBefore=wc_get_orders(['limit'=>-1,'return'=>'ids','status'=>array_keys(wc_get_order_statuses())]);
if(str_ends_with($fault,'_saved')) {
 if(!$isCustomer) $checks['wrong_order_owner_never_adopted']=cerr(tbvsm_reconcile($kind,$row,999999),'invalid_recovery_owner');
 if(!$isCustomer && isset($o['addresses'])) {$ids=tbvsm_orders_for($o['id']);$order=count($ids)===1?wc_get_order($ids[0]):null;if($order){$order->set_shipping_city('Synthetic Changed City');$order->save();}$checks['changed_address_never_adopted']=$order&&cerr(tbvsm_reconcile($kind,$row,$uid),'recovery_ambiguous');if($order){$order->set_shipping_city('Synthetic City');$order->save();}}
 if(!$isCustomer && isset($o['items'])) {$ids=tbvsm_orders_for($o['id']);$order=count($ids)===1?wc_get_order($ids[0]):null;$lines=$order?array_values($order->get_items()):[];$line=$lines[0]??null;if($line){$line->set_quantity(9);$line->save();}$checks['changed_line_never_adopted']=$line&&cerr(tbvsm_reconcile($kind,$row,$uid),'recovery_ambiguous');if($line){$line->set_quantity(2);$line->save();}}


 $recovery=tbvsm_reconcile($kind,$row,$uid);$checks['exact_object_adopted']=$recovery===true;
 $result=tbvsm_apply($fixture);$checks['retry_after_reconciliation']=!is_wp_error($result) && count(tbvsm_users_for($c['id']))===1 && count(tbvsm_orders_for($o['id']))===1;
 $checks['repeated_retry_no_duplicates']=!is_wp_error(tbvsm_apply($fixture)) && count(tbvsm_orders_for($o['id']))===1;
} else {
 $checks['ambiguous_object_not_adopted']=cerr(tbvsm_reconcile($kind,$row,$uid),'recovery_ambiguous');
 $checks['retry_remains_blocked']=cerr(tbvsm_apply($fixture),'journal_needs_review');
 $ordersAfter=wc_get_orders(['limit'=>-1,'return'=>'ids','status'=>array_keys(wc_get_order_statuses())]);
 $checks['no_new_order_created_on_retry']=count($ordersBefore)===count($ordersAfter);
 if($fault==='customer_inserted') $checks['partially_created_customer_not_duplicated']=email_exists($c['email'])===$uid && !empty($uid);
 if($fault==='order_inserted') $checks['untagged_orphan_remains_unadopted']=count(tbvsm_orders_for($o['id']))===0;
}
echo wp_json_encode(['passed'=>count(array_filter($checks)),'total'=>count($checks),'checks'=>$checks]);
