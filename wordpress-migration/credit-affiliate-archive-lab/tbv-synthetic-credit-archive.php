<?php
/** Plugin Name: TBV Synthetic Credit History Lab. Never use real data. */
defined('ABSPATH') || exit;
// This laboratory registers no routes, hooks, cron, gateways, email or payout actions.
function tbvca_guard() {
    if (!defined('TBV_SYNTHETIC_ARCHIVE_TEST') || TBV_SYNTHETIC_ARCHIVE_TEST !== true ||
        !defined('DISABLE_WP_CRON') || DISABLE_WP_CRON !== true ||
        !defined('WP_HTTP_BLOCK_EXTERNAL') || WP_HTTP_BLOCK_EXTERNAL !== true ||
        wp_get_environment_type() !== 'local' || wp_parse_url(home_url(), PHP_URL_HOST) !== '127.0.0.1') return new WP_Error('test_runtime_required');
    return true;
}
function tbvca_id($v) { return is_string($v) && preg_match('/^sample-[a-z0-9][a-z0-9-]{0,59}$/D', $v) === 1; }
function tbvca_money($v) { return is_string($v) && preg_match('/^(0|[1-9][0-9]{0,12})\.[0-9]{2}$/D', $v) === 1; }
function tbvca_date($v) { if (!is_string($v) || !preg_match('/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/D',$v)) return false; $d=DateTimeImmutable::createFromFormat('!Y-m-d\TH:i:s.v\Z',$v,new DateTimeZone('UTC')); return $d && $d->format('Y-m-d\TH:i:s.v\Z')===$v; }
function tbvca_keys($v,$keys) { if (!is_array($v)) return false; $actual=array_keys($v);sort($actual);sort($keys);return $actual===$keys; }
function tbvca_normalize($v) { if (!is_array($v)) return $v; if (array_is_list($v) && count($v)) return array_map('tbvca_normalize',$v);ksort($v);foreach($v as $k=>$x)$v[$k]=tbvca_normalize($x);return $v; }
function tbvca_key($kind,$id) { return '_tbvca_' . hash('sha256',$kind . ':' . $id); }
function tbvca_fields($kind) {
    return [
      'credits'=>['sourceId','customerId','email','amount','updatedAt'],
      'creditLedger'=>['sourceId','creditId','orderId','amount','provider','state','createdAt','consumedAt'],
      'creditAdjustments'=>['sourceId','creditId','mode','amount','before','after','note','createdAt'],
      'affiliates'=>['sourceId','customerId','email','affiliateCode','active','createdAt'],
      'attributions'=>['sourceId','affiliateId','orderId','commissionAmount','shippingType','createdAt'],
      'payouts'=>['sourceId','affiliateId','amount','note','createdAt'],
    ][$kind] ?? null;
}
function tbvca_validate($snapshot) {
    if (!tbvca_keys($snapshot,['synthetic','currency','kind','record','links']) || $snapshot['synthetic']!==true || !is_string($snapshot['currency']) || !preg_match('/^[A-Z]{3}$/D',$snapshot['currency']) || !is_string($snapshot['kind'])) return false;
    $kind=$snapshot['kind'];$fields=tbvca_fields($kind);$r=$snapshot['record'];$links=$snapshot['links'];
    if (!$fields || !tbvca_keys($r,$fields) || !tbvca_id($r['sourceId'])) return false;
    foreach(['customerId','creditId','affiliateId','orderId'] as $k) if (array_key_exists($k,$r) && !tbvca_id($r[$k])) return false;
    foreach(['amount','before','after','commissionAmount'] as $k) if (array_key_exists($k,$r) && !tbvca_money($r[$k])) return false;
    foreach(['updatedAt','createdAt'] as $k) if (array_key_exists($k,$r) && !tbvca_date($r[$k])) return false;
    if (array_key_exists('email',$r) && (!is_string($r['email']) || !preg_match('/^sample-[a-z0-9-]+@example\.invalid$/D',$r['email']))) return false;
    if (array_key_exists('affiliateCode',$r) && (!is_string($r['affiliateCode']) || !preg_match('/^SAMPLE-[A-Z0-9-]+$/D',$r['affiliateCode']))) return false;
    if (array_key_exists('active',$r) && !is_bool($r['active'])) return false;
    if (array_key_exists('note',$r) && $r['note']!==null && !tbvca_id($r['note'])) return false;
    if (array_key_exists('provider',$r) && !tbvca_id($r['provider'])) return false;
    if (array_key_exists('shippingType',$r) && !tbvca_id($r['shippingType'])) return false;
    if (array_key_exists('mode',$r) && !in_array($r['mode'],['increase','decrease'],true)) return false;
    if (array_key_exists('state',$r) && (!in_array($r['state'],['held','consumed'],true) || ($r['state']==='held' && $r['consumedAt']!==null) || ($r['state']==='consumed' && !tbvca_date($r['consumedAt'])))) return false;
    $expected=[];if(isset($r['customerId']))$expected[]='customer';if(isset($r['orderId']))$expected[]='order';
    if (!tbvca_keys($links,$expected)) return false;foreach($links as $v) if(!tbvca_id($v)) return false;
    return true;
}
function tbvca_plan($snapshots) {
    $guard=tbvca_guard();if(is_wp_error($guard))return $guard;
    if (!is_array($snapshots) || !array_is_list($snapshots) || count($snapshots)>100) return new WP_Error('invalid_batch');
    $planned=[];$writes=[];$unchanged=[];$currency=null;
    foreach($snapshots as $snapshot) {
        if (!tbvca_validate($snapshot)) return new WP_Error('invalid_synthetic_snapshot');
        if ($currency!==null && $currency!==$snapshot['currency']) return new WP_Error('currency_conflict');$currency=$snapshot['currency'];
        $id=$snapshot['record']['sourceId'];$kind=$snapshot['kind'];$key=tbvca_key($kind,$id);
        if(isset($planned[$key]))return new WP_Error('duplicate_source');
        $json=wp_json_encode(tbvca_normalize($snapshot),JSON_UNESCAPED_SLASHES);if(!is_string($json))return new WP_Error('encode_error');
        $planned[$key]=['kind'=>$kind,'id'=>$id,'snapshot'=>$snapshot,'json'=>$json];
        $old=get_option($key,false);if($old!==false && (!is_string($old) || !hash_equals($old,$json))) return new WP_Error('snapshot_conflict');
        if($old===false)$writes[]=$key;else $unchanged[]=$key;
    }
    foreach($planned as $entry) {
        $r=$entry['snapshot']['record'];$dependencies=[];
        if(isset($r['creditId']))$dependencies[]=['credits',$r['creditId']];if(isset($r['affiliateId']))$dependencies[]=['affiliates',$r['affiliateId']];
        foreach($dependencies as [$kind,$id]) { $key=tbvca_key($kind,$id);$parent=$planned[$key]['snapshot']??null;
          if($parent===null){$raw=get_option($key,false);$parent=is_string($raw)?json_decode($raw,true):null;}
          if(!tbvca_validate($parent) || (!isset($planned[$key]) && (!is_string($raw) || !hash_equals($raw,wp_json_encode(tbvca_normalize($parent),JSON_UNESCAPED_SLASHES)))) || $parent['kind']!==$kind || $parent['record']['sourceId']!==$id || $parent['currency']!==$currency)return new WP_Error('missing_or_invalid_parent');
        }
    }
    // Save parent records before dependent history so a partial batch cannot
    // leave a child without the parent selected by this batch.
    $rank=['credits'=>0,'affiliates'=>0,'creditLedger'=>1,'creditAdjustments'=>1,'attributions'=>1,'payouts'=>1];
    usort($writes,fn($a,$b)=>($rank[$planned[$a]['kind']] <=> $rank[$planned[$b]['kind']]) ?: strcmp($a,$b));
    return ['planned'=>$planned,'writes'=>$writes,'unchanged'=>$unchanged];
}
function tbvca_apply($snapshots) {
    $guard=tbvca_guard();if(is_wp_error($guard))return $guard;
    $token=wp_generate_uuid4();if (!add_option('_tbvca_lab_lock',$token,'',false))return new WP_Error('archive_locked');
    try { $plan=tbvca_plan($snapshots);if(is_wp_error($plan))return $plan;$done=0;
      foreach($plan['writes'] as $key){if(!add_option($key,$plan['planned'][$key]['json'],'',false))return new WP_Error('partial_write','Write stopped; inspect retained records.',['committed'=>$done]);$done++;if (isset($GLOBALS['tbvca_test_exit_after']) && $done >= $GLOBALS['tbvca_test_exit_after']) {echo 'TEST_INTERRUPTION';exit(0);}if (isset($GLOBALS['tbvca_test_stop_after']) && $done >= $GLOBALS['tbvca_test_stop_after']) return new WP_Error('test_interruption','Synthetic interruption',['committed'=>$done]);}
      return ['created'=>$done,'unchanged'=>count($plan['unchanged']),'financial_actions'=>0];
    } finally {if(get_option('_tbvca_lab_lock',false)===$token)delete_option('_tbvca_lab_lock');}
}

// Recovery requires the caller to establish that the previous worker is stopped;
// no automatic timeout or expiration. This only deletes the matching test lock.
function tbvca_clear_stale_lock($token,$worker_stopped) {
    $guard=tbvca_guard();if(is_wp_error($guard))return $guard;
    if($worker_stopped!==true || !is_string($token) || !preg_match('/^[a-f0-9-]{36}$/D',$token))return new WP_Error('unsafe_recovery');
    global $wpdb; $deleted=$wpdb->query($wpdb->prepare("DELETE FROM {$wpdb->options} WHERE option_name=%s AND option_value=%s",'_tbvca_lab_lock',$token));
    if($deleted!==1)return new WP_Error('lock_mismatch'); wp_cache_delete('_tbvca_lab_lock','options');return true;
}
