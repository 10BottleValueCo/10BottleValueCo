<?php
/**
 * Plugin Name: 10BottleValue Synthetic Migration Lab
 * Description: Isolated customer/order migration rehearsal. Never use real records.
 * Version: 0.1.0
 */
if (!defined('ABSPATH')) exit;

// Development code only. This plugin registers no routes, forms, cron or hooks.
// An explicitly marked isolated WordPress test runtime must call these functions.
function tbvsm_guard() {
    if (!defined('TBV_SYNTHETIC_WOO_TEST') || TBV_SYNTHETIC_WOO_TEST !== true ||
        !function_exists('wp_get_environment_type') || !in_array(wp_get_environment_type(),['local','staging'],true) ||
        !defined('WP_HTTP_BLOCK_EXTERNAL') || WP_HTTP_BLOCK_EXTERNAL !== true ||
        !defined('DISABLE_WP_CRON') || DISABLE_WP_CRON !== true ||
        !function_exists('wc_create_order')) return new WP_Error('test_runtime_required');
    return true;
}
function tbvsm_id($s) { return is_string($s) && preg_match('/^sample-[a-z0-9-]{1,47}$/D', $s); }
function tbvsm_email($s) { return is_string($s) && preg_match('/^[a-z0-9][a-z0-9._+-]*@example\.invalid$/D', $s); }
function tbvsm_cents($s) {
    if (!is_string($s) || !preg_match('/^(0|[1-9][0-9]{0,8})(?:\.([0-9]{1,2}))?$/D', $s, $m)) return false;
    return ((int)$m[1])*100 + (int)str_pad($m[2] ?? '', 2, '0');
}
// This narrow address contract accepts fictional fixtures only. It is not a
// claim about the real source schema or an adapter for customer addresses.
function tbvsm_address_valid($address,$type) {
    $keys=['first_name','last_name','company','address_1','address_2','city','state','postcode','country'];
    if($type==='billing')$keys[]='email';
    $keys[]='phone';
    if(!is_array($address)||array_keys($address)!==$keys)return false;
    foreach(['first_name','last_name','address_1','city'] as $key)if(!is_string($address[$key])||!preg_match('/^Synthetic [A-Za-z0-9 .-]{1,50}$/D',$address[$key]))return false;
    foreach(['company','address_2'] as $key)if(!is_string($address[$key])||($address[$key]!==''&&!preg_match('/^Synthetic [A-Za-z0-9 .-]{1,50}$/D',$address[$key])))return false;
    if($address['state']!=='WA'||$address['postcode']!=='00000'||$address['country']!=='US'||$address['phone']!=='0000000000')return false;
    return $type!=='billing'||tbvsm_email($address['email']);
}
function tbvsm_addresses_match($order,$addresses) {
    foreach(['billing','shipping'] as $type)foreach($addresses[$type] as $field=>$expected){
        $getter='get_'.$type.'_'.$field;
        if(!is_callable([$order,$getter])||$order->$getter('edit')!==$expected)return false;
    }
    return true;
}
// Resolve explicitly tagged fictional products only; never infer a mapping from
// a product name, price, SKU, or numeric destination ID supplied by a caller.
function tbvsm_product_mapping($ref) {
    if(!is_array($ref)||array_keys($ref)!==['productId','variationId']||!tbvsm_id($ref['productId'])||!tbvsm_id($ref['variationId']))return new WP_Error('invalid_product_reference');
    $query=function($type,$key,$value){return get_posts(['post_type'=>$type,'post_status'=>['publish','draft','pending','private','future','trash','inherit'],'numberposts'=>3,'fields'=>'ids','meta_key'=>$key,'meta_value'=>$value]);};
    $parents=$query('product','_tbvsm_source_product_id',$ref['productId']);$variants=$query('product_variation','_tbvsm_source_variation_id',$ref['variationId']);
    if(count($parents)>1||count($variants)>1)return new WP_Error('product_mapping_ambiguous');
    if(count($parents)!==1||count($variants)!==1)return new WP_Error('product_mapping_unresolved');
    $parent=wc_get_product($parents[0]);$variant=wc_get_product($variants[0]);
    if(!$parent||!$variant||!$parent->is_type('variable')||!$variant->is_type('variation')||$variant->get_parent_id()!==(int)$parent->get_id()||
       $parent->get_status('edit')==='trash'||$variant->get_status('edit')==='trash'||$parent->get_meta('_tbvsm_synthetic',true,'edit')!=='yes'||
       $variant->get_meta('_tbvsm_synthetic',true,'edit')!=='yes'||!preg_match('/^Synthetic [A-Za-z0-9 -]{1,60}$/D',$parent->get_name('edit')))return new WP_Error('product_mapping_invalid');
    return ['product'=>(int)$parent->get_id(),'variation'=>(int)$variant->get_id()];
}
// Match synthetic source line identities without relying on Woo item order.
function tbvsm_lines_match($items,$row) {
    if(!isset($row['items'])) {
        if(count($items)!==1)return false;
        $item=reset($items);
        return $item->get_product_id()===0 && $item->get_variation_id()===0 && $item->get_name()===$row['itemName'] && $item->get_quantity()===$row['quantity'] &&
            tbvsm_cents(wc_format_decimal($item->get_subtotal(),2))===tbvsm_cents($row['subtotal']) &&
            tbvsm_cents(wc_format_decimal($item->get_total(),2))===tbvsm_cents($row['subtotal']) &&
            tbvsm_cents(wc_format_decimal($item->get_subtotal_tax(),2))===0 && tbvsm_cents(wc_format_decimal($item->get_total_tax(),2))===0;
    }
    if(count($items)!==count($row['items']))return false;
    $mapped=[];
    foreach($items as $item){$id=$item->get_meta('_tbvsm_source_line_id',true,'edit');if(!tbvsm_id($id)||isset($mapped[$id]))return false;$mapped[$id]=$item;}
    foreach($row['items'] as $line){
        $item=$mapped[$line['id']]??null;
        if(!$item||$item->get_name()!==$line['name']||$item->get_quantity()!==$line['quantity']||
           tbvsm_cents(wc_format_decimal($item->get_subtotal(),2))!==tbvsm_cents($line['subtotal'])||
           tbvsm_cents(wc_format_decimal($item->get_total(),2))!==tbvsm_cents($line['total'])||
           tbvsm_cents(wc_format_decimal($item->get_subtotal_tax(),2))!==0||tbvsm_cents(wc_format_decimal($item->get_total_tax(),2))!==0)return false;
        if(isset($line['productRef'])){
            $mapping=tbvsm_product_mapping($line['productRef']);
            if(is_wp_error($mapping)||$item->get_product_id()!==$mapping['product']||$item->get_variation_id()!==$mapping['variation']||
               $item->get_meta('_tbvsm_source_product_id',true,'edit')!==$line['productRef']['productId']||$item->get_meta('_tbvsm_source_variation_id',true,'edit')!==$line['productRef']['variationId'])return false;
        } elseif($item->get_product_id()!==0||$item->get_variation_id()!==0)return false;
    }
    return true;
}
function tbvsm_fingerprint($row) { return hash('sha256', wp_json_encode($row)); }
function tbvsm_users_for($id) {
    return get_users(['meta_key'=>'_tbvsm_source_id','meta_value'=>$id,'fields'=>'ids','number'=>3]);
}
// In this fictional fixture only, an explicit null customerId means no linked
// account. Never infer ownership from the billing email. Missing or malformed
// references remain errors; this is not a rule for real source records.
function tbvsm_recovery_owner($row) {
    if (!array_key_exists('customerId',$row)) return new WP_Error('invalid_recovery_owner');
    if ($row['customerId']===null) return 0;
    if (!tbvsm_id($row['customerId'])) return new WP_Error('invalid_recovery_owner');
    $ids=tbvsm_users_for($row['customerId']);
    return count($ids)===1 ? (int)$ids[0] : new WP_Error('invalid_recovery_owner');
}
function tbvsm_orders_for($id) {
    global $wpdb;
    if (class_exists('Automattic\\WooCommerce\\Utilities\\OrderUtil') && \Automattic\WooCommerce\Utilities\OrderUtil::custom_orders_table_usage_is_enabled()) {
        $orders=$wpdb->prefix.'wc_orders'; $meta=$wpdb->prefix.'wc_orders_meta';
        return $wpdb->get_col($wpdb->prepare("SELECT o.id FROM {$orders} o INNER JOIN {$meta} m ON m.order_id=o.id WHERE o.type='shop_order' AND m.meta_key='_tbvsm_source_id' AND m.meta_value=%s LIMIT 3",$id));
    }
    // Explicit postmeta lookup includes trash and unusual statuses; Woo's
    // default order queries can omit them and cause accidental re-creation.
    return $wpdb->get_col($wpdb->prepare("SELECT p.ID FROM {$wpdb->posts} p INNER JOIN {$wpdb->postmeta} m ON m.post_id=p.ID WHERE p.post_type='shop_order' AND m.meta_key='_tbvsm_source_id' AND m.meta_value=%s LIMIT 3",$id));
}
function tbvsm_customer_matches($uid,$row) {
    $u=get_userdata($uid);
    return $u && $u->user_email===$row['email'] && get_user_meta($uid,'_tbvsm_source_id',true)===$row['id'] && get_user_meta($uid,'_tbvsm_fingerprint',true)===tbvsm_fingerprint($row);
}
function tbvsm_order_matches($oid,$row,$uid) {
    $o=wc_get_order($oid); if (!$o || $o->get_customer_id()!==(int)$uid || $o->get_status()!=='pending' || $o->get_date_paid() || $o->get_currency()!=='USD') return false;
    if(isset($row['addresses'])&&!tbvsm_addresses_match($o,$row['addresses']))return false;
    $items=array_values($o->get_items()); $ship=array_values($o->get_items('shipping'));
    return tbvsm_lines_match($items,$row) && count($ship)===1 && count($o->get_items('fee'))===0 && count($o->get_items('coupon'))===0 && count($o->get_items('tax'))===0 && count($o->get_refunds())===0 &&
      tbvsm_cents(wc_format_decimal($ship[0]->get_total(),2))===tbvsm_cents($row['shipping']) &&
      tbvsm_cents(wc_format_decimal($ship[0]->get_total_tax(),2))===0 &&
      tbvsm_cents(wc_format_decimal($o->get_discount_total(),2))===0 && tbvsm_cents(wc_format_decimal($o->get_total_tax(),2))===0 &&
      tbvsm_cents(wc_format_decimal($o->get_shipping_total(),2))===tbvsm_cents($row['shipping']) &&
      tbvsm_cents(wc_format_decimal($o->get_total(),2))===tbvsm_cents($row['total']) &&
      $o->get_meta('_tbvsm_source_id')===$row['id'] && $o->get_meta('_tbvsm_fingerprint')===tbvsm_fingerprint($row) &&
      $o->get_meta('_tbvsm_historical_status')===$row['historicalStatus'] && $o->get_meta('_tbvsm_payment_reference')===$row['paymentReference'] &&
      $o->get_date_created() && $o->get_date_created()->getTimestamp()===strtotime($row['createdAt']);
}
// A write-ahead reservation is stored before each entity creation. A pending
// reservation never expires automatically: it blocks retries until investigated.
function tbvsm_journal_key($kind,$id) {
    return '_tbvsm_j_' . hash('sha256',$kind . ':' . $id);
}
function tbvsm_journal_check($kind,$row,$ids) {
    $entry=get_option(tbvsm_journal_key($kind,$row['id']),false);
    if ($entry===false) return true; // older lab objects may predate journaling
    if (!is_array($entry) || ($entry['kind']??null)!==$kind || ($entry['id']??null)!==$row['id'] || ($entry['fingerprint']??null)!==tbvsm_fingerprint($row)) return new WP_Error('journal_conflict');
    if (($entry['state']??null)==='pending') return new WP_Error('journal_needs_review');
    if (($entry['state']??null)!=='complete' || !isset($entry['target']) || count($ids)!==1 || (int)$ids[0]!==(int)$entry['target']) return new WP_Error('journal_target_conflict');
    return true;
}
function tbvsm_reserve($kind,$row) {
    $guard=tbvsm_guard();if(is_wp_error($guard)) return $guard;
    if(!in_array($kind,['customer','order'],true) || !is_array($row) || !tbvsm_id($row['id']??null)) return new WP_Error('invalid_reservation');
    $entry=['kind'=>$kind,'id'=>$row['id'],'fingerprint'=>tbvsm_fingerprint($row),'state'=>'pending'];
    if (!add_option(tbvsm_journal_key($kind,$row['id']),$entry,'','no')) return new WP_Error('journal_needs_review');
    return true;
}
function tbvsm_finish($kind,$row,$target) {
    $guard=tbvsm_guard();if(is_wp_error($guard)) return $guard;
    if(!in_array($kind,['customer','order'],true) || !is_array($row) || !tbvsm_id($row['id']??null)) return new WP_Error('invalid_reservation');
    $key=tbvsm_journal_key($kind,$row['id']);$entry=get_option($key,false);
    if (!is_array($entry) || ($entry['state']??null)!=='pending' || ($entry['kind']??null)!==$kind || ($entry['id']??null)!==$row['id'] || ($entry['fingerprint']??null)!==tbvsm_fingerprint($row) || (int)$target<=0) return new WP_Error('journal_conflict');
    if($kind==='customer') {
        $ids=tbvsm_users_for($row['id']);$valid=count($ids)===1 && (int)$ids[0]===(int)$target && tbvsm_customer_matches($target,$row);
    } else {
        $owner=tbvsm_recovery_owner($row);
        $ids=tbvsm_orders_for($row['id']);$valid=!is_wp_error($owner) && count($ids)===1 && (int)$ids[0]===(int)$target && tbvsm_order_matches($target,$row,$owner);
    }
    if(!$valid) return new WP_Error('recovery_ambiguous');
    $entry['state']='complete';$entry['target']=(int)$target;
    if (!update_option($key,$entry,false)) return new WP_Error('journal_write_failed');
    return true;
}
// Test-only fault injection deliberately uses process exit so that no PHP finally
// handlers run; never exposed through a URL or UI.
function tbvsm_fault($point) {
    if (tbvsm_guard()===true && ($GLOBALS['tbvsm_test_fault']??'')===$point) { echo 'TEST_INTERRUPTION';exit(0); }
}
// Operator must first positively establish that the old worker cannot run again.
// Exact token is required; this does not clear reservations or remove any data.
function tbvsm_clear_stale_lock($expected,$worker_stopped) {
    $guard=tbvsm_guard();if(is_wp_error($guard)) return $guard;
    if ($worker_stopped!==true || !is_string($expected) || !preg_match('/^[a-f0-9-]{36}$/D',$expected)) return new WP_Error('unsafe_lock_recovery');
    if (get_option('_tbvsm_lab_lock',false)!==$expected) return new WP_Error('lock_token_mismatch');
    global $wpdb;
    $deleted=$wpdb->query($wpdb->prepare("DELETE FROM {$wpdb->options} WHERE option_name=%s AND option_value=%s",'_tbvsm_lab_lock',$expected));
    if ($deleted!==1) return new WP_Error('lock_token_mismatch');
    wp_cache_delete('_tbvsm_lab_lock','options');return true;
}
// Recovery does not guess an orphan. It may only adopt a *fully matching*
// object with exactly one source ID, after the worker lock is absent.
function tbvsm_reconcile($kind,$row,$uid=0) {
    $guard=tbvsm_guard();if(is_wp_error($guard)) return $guard;
    if (get_option('_tbvsm_lab_lock',false)!==false) return new WP_Error('locked');
    if (!in_array($kind,['customer','order'],true) || !is_array($row) || !tbvsm_id($row['id']??null)) return new WP_Error('invalid_recovery');
    $entry=get_option(tbvsm_journal_key($kind,$row['id']),false);
    if (!is_array($entry) || ($entry['state']??null)!=='pending' || ($entry['kind']??null)!==$kind || ($entry['id']??null)!==$row['id'] || ($entry['fingerprint']??null)!==tbvsm_fingerprint($row)) return new WP_Error('journal_conflict');
    if($kind==='order') {
        $owner=tbvsm_recovery_owner($row);
        if(is_wp_error($owner) || $owner !== (int)$uid) return new WP_Error('invalid_recovery_owner');
    }
    $ids=$kind==='customer'?tbvsm_users_for($row['id']):tbvsm_orders_for($row['id']);
    if (count($ids)!==1) return new WP_Error('recovery_ambiguous');
    $valid=$kind==='customer'?tbvsm_customer_matches((int)$ids[0],$row):tbvsm_order_matches((int)$ids[0],$row,(int)$uid);
    if (!$valid) return new WP_Error('recovery_ambiguous');
    return tbvsm_finish($kind,$row,(int)$ids[0]);
}
function tbvsm_plan($data) {
    $guard=tbvsm_guard(); if (is_wp_error($guard)) return $guard;
    if (!is_array($data) || array_keys($data)!==['synthetic','customers','orders'] || $data['synthetic']!==true || !is_array($data['customers']) || !is_array($data['orders']) || count($data['customers'])>25 || count($data['orders'])>25) return new WP_Error('invalid_fixture');
    $seen=[];$emails=[];$resolved=[];$ops=[];
    foreach ($data['customers'] as $c) {
        if (!is_array($c) || array_keys($c)!==['id','email'] || !tbvsm_id($c['id']) || !tbvsm_email($c['email']) || isset($seen['c'.$c['id']]) || isset($emails[$c['email']])) return new WP_Error('invalid_customer');
        $seen['c'.$c['id']]=true; $emails[$c['email']]=true; $ids=tbvsm_users_for($c['id']); $journal=tbvsm_journal_check('customer',$c,$ids);if(is_wp_error($journal)) return $journal; $byemail=email_exists($c['email']); $bylogin=username_exists('tbvsm-'.$c['id']);
        if ($bylogin && (count($ids)!==1 || (int)$ids[0]!== (int)$bylogin)) return new WP_Error('customer_identity_conflict');
        if (count($ids)>1 || ($byemail && (count($ids)!==1 || (int)$ids[0]!== (int)$byemail))) return new WP_Error('customer_identity_conflict');
        if ($ids && !tbvsm_customer_matches($ids[0],$c)) return new WP_Error('customer_edited');
        $resolved[$c['id']]=$ids ? (int)$ids[0] : null; $ops[]=['kind'=>'customer','id'=>$c['id'],'action'=>$ids?'unchanged':'create'];
    }
    foreach ($data['orders'] as $o) {
        $orderKeys=['id','customerId','createdAt','historicalStatus','paymentReference','itemName','quantity','subtotal','shipping','total'];
        $multiKeys=['id','customerId','createdAt','historicalStatus','paymentReference','items','shipping','total'];
        if (!is_array($o) || !in_array(array_keys($o),[$orderKeys,array_merge($orderKeys,['addresses']),$multiKeys,array_merge($multiKeys,['addresses'])],true) || !tbvsm_id($o['id']) || isset($seen['o'.$o['id']]) || ($o['customerId']!==null && (!tbvsm_id($o['customerId']) || !array_key_exists($o['customerId'],$resolved))) || !tbvsm_id($o['paymentReference']) || !in_array($o['historicalStatus'],['pending','paid','cancelled','refunded'],true)) return new WP_Error('invalid_order');
        if(array_key_exists('items',$o)) {
            if(!is_array($o['items'])||!array_is_list($o['items'])||count($o['items'])<1||count($o['items'])>20)return new WP_Error('invalid_lines');
            $lineIds=[];$sub=0;
            foreach($o['items'] as $line){
                $lineKeys=['id','name','quantity','subtotal','total'];
                if(!is_array($line)||(array_keys($line)!==$lineKeys&&array_keys($line)!==array_merge($lineKeys,['productRef']))||!tbvsm_id($line['id'])||isset($lineIds[$line['id']])||!is_string($line['name'])||!preg_match('/^Synthetic [A-Za-z0-9 -]{1,60}$/D',$line['name'])||!is_int($line['quantity'])||$line['quantity']<1||$line['quantity']>100)return new WP_Error('invalid_lines');
                if(array_key_exists('productRef',$line)){$mapping=tbvsm_product_mapping($line['productRef']);if(is_wp_error($mapping))return $mapping;}
                $lineIds[$line['id']]=true;$lineSub=tbvsm_cents($line['subtotal']);$lineTotal=tbvsm_cents($line['total']);
                if($lineSub===false||$lineTotal===false||$lineSub!==$lineTotal)return new WP_Error('invalid_total');
                $sub+=$lineTotal;
            }
        } else {
            if(!is_string($o['itemName'])||!preg_match('/^Synthetic [A-Za-z0-9 -]{1,60}$/D',$o['itemName'])||!is_int($o['quantity'])||$o['quantity']<1||$o['quantity']>100)return new WP_Error('invalid_order');
            $sub=tbvsm_cents($o['subtotal']);
        }
        if(array_key_exists('addresses',$o) && (!is_array($o['addresses'])||array_keys($o['addresses'])!==['billing','shipping']||!tbvsm_address_valid($o['addresses']['billing'],'billing')||!tbvsm_address_valid($o['addresses']['shipping'],'shipping')))return new WP_Error('invalid_synthetic_address');
        if (!is_string($o['createdAt'])) return new WP_Error('invalid_timestamp');
        $seen['o'.$o['id']]=true; $time=DateTimeImmutable::createFromFormat('!Y-m-d\TH:i:s\Z',$o['createdAt']);
        if (!$time || $time->format('Y-m-d\TH:i:s\Z')!==$o['createdAt']) return new WP_Error('invalid_timestamp');
        $shipping=tbvsm_cents($o['shipping']);$total=tbvsm_cents($o['total']);
        if ($sub===false || $shipping===false || $total===false || $sub+$shipping!==$total) return new WP_Error('invalid_total');
        $ids=tbvsm_orders_for($o['id']); $journal=tbvsm_journal_check('order',$o,$ids);if(is_wp_error($journal)) return $journal; if(count($ids)>1) return new WP_Error('order_identity_conflict');
        $expectedOwner=$o['customerId']===null ? 0 : $resolved[$o['customerId']];
        if ($ids && ($expectedOwner===null || !tbvsm_order_matches($ids[0],$o,$expectedOwner))) return new WP_Error('order_edited');
        $ops[]=['kind'=>'order','id'=>$o['id'],'action'=>$ids?'unchanged':'create'];
    }
    return ['operations'=>$ops,'customers'=>$resolved];
}
function tbvsm_apply($data) {
    $guard=tbvsm_guard(); if(is_wp_error($guard)) return $guard;
    $lock=wp_generate_uuid4();if(!add_option('_tbvsm_lab_lock',$lock,'','no')) return new WP_Error('locked');
    try {
        $plan=tbvsm_plan($data); if(is_wp_error($plan)) return $plan;
        // Explicitly suppress wp_mail for this local test only; external HTTP and
        // cron are already blocked by the runtime guard. No payment_complete.
        $suppress=function(){return true;}; add_filter('pre_wp_mail',$suppress,PHP_INT_MAX);
        try {
            $ids=$plan['customers'];
            foreach($data['customers'] as $c) if(!$ids[$c['id']]) {
                $reservation=tbvsm_reserve('customer',$c);if(is_wp_error($reservation)) return $reservation;tbvsm_fault('customer_reserved');
                $uid=wp_insert_user(['user_login'=>'tbvsm-'.$c['id'],'user_email'=>$c['email'],'user_pass'=>wp_generate_password(40,true,true),'role'=>'customer']);
                if(is_wp_error($uid)) return $uid;tbvsm_fault('customer_inserted');
                update_user_meta($uid,'_tbvsm_source_id',$c['id']); update_user_meta($uid,'_tbvsm_fingerprint',tbvsm_fingerprint($c)); $ids[$c['id']]=(int)$uid;tbvsm_fault('customer_saved');
                if(!tbvsm_customer_matches($uid,$c)) return new WP_Error('customer_write_mismatch');$finished=tbvsm_finish('customer',$c,$uid);if(is_wp_error($finished)) return $finished;
            }
            foreach($data['orders'] as $o) if(!tbvsm_orders_for($o['id'])) {
                $reservation=tbvsm_reserve('order',$o);if(is_wp_error($reservation)) return $reservation;tbvsm_fault('order_reserved');
                $owner=$o['customerId']===null ? 0 : $ids[$o['customerId']];
                $order=wc_create_order(['customer_id'=>$owner,'status'=>'pending','created_via'=>'tbv_synthetic_migration']);
                if(is_wp_error($order)) return $order;tbvsm_fault('order_inserted');
                $order->set_currency('USD'); $order->set_date_created($o['createdAt']);
                if(isset($o['addresses']))foreach(['billing','shipping'] as $type)foreach($o['addresses'][$type] as $field=>$value){$setter='set_'.$type.'_'.$field;$order->$setter($value);}
                if(isset($o['items']))foreach($o['items'] as $line){$item=new WC_Order_Item_Product();$item->set_name($line['name']);$item->set_quantity($line['quantity']);$item->set_subtotal($line['subtotal']);$item->set_total($line['total']);$item->add_meta_data('_tbvsm_source_line_id',$line['id'],true);
                    if(isset($line['productRef'])){$mapping=tbvsm_product_mapping($line['productRef']);if(is_wp_error($mapping))return $mapping;$item->set_product_id($mapping['product']);$item->set_variation_id($mapping['variation']);$item->add_meta_data('_tbvsm_source_product_id',$line['productRef']['productId'],true);$item->add_meta_data('_tbvsm_source_variation_id',$line['productRef']['variationId'],true);}
                    $order->add_item($item);}
                else {$item=new WC_Order_Item_Product();$item->set_name($o['itemName']);$item->set_quantity($o['quantity']);$item->set_subtotal($o['subtotal']);$item->set_total($o['subtotal']);$order->add_item($item);}
                $ship=new WC_Order_Item_Shipping(); $ship->set_method_title('Synthetic shipping'); $ship->set_total($o['shipping']); $order->add_item($ship);
                $order->set_shipping_total($o['shipping']); $order->set_total($o['total']);
                $order->update_meta_data('_tbvsm_source_id',$o['id']); $order->update_meta_data('_tbvsm_fingerprint',tbvsm_fingerprint($o));
                $order->update_meta_data('_tbvsm_historical_status',$o['historicalStatus']); $order->update_meta_data('_tbvsm_payment_reference',$o['paymentReference']);
                $order->save();tbvsm_fault('order_saved');
                if(!tbvsm_order_matches($order->get_id(),$o,$owner)) return new WP_Error('order_write_mismatch');$finished=tbvsm_finish('order',$o,$order->get_id());if(is_wp_error($finished)) return $finished;
            }
        } finally {remove_filter('pre_wp_mail',$suppress,PHP_INT_MAX);}
        return $plan['operations'];
    } finally {if(get_option('_tbvsm_lab_lock',false)===$lock) delete_option('_tbvsm_lab_lock');}
}
