<?php
// Public product names are used only to test display joins with fictional offers.
if (!defined('TBV_DISPOSABLE_FIXTURE') || TBV_DISPOSABLE_FIXTURE !== true || wp_get_environment_type() !== 'local') throw new RuntimeException('Disposable local fixture required');
require_once '/wordpress/wp-content/plugins/tbv-catalog-import/tbv-catalog-import.php';
$names=['BPC-157','TB-500 + BPC-157'];
// Only a hash-checked copied fixture database is mounted by the test server.
foreach(wc_get_products(['status'=>['publish','draft','pending','private'],'limit'=>-1]) as $product){
 if(!in_array($product->get_name('edit'),$names,true))continue;
 foreach($product->get_children() as $child)wp_delete_post($child,true);
 wp_delete_post($product->get_id(),true);
}
wp_cache_flush();wc_delete_product_transients();
$src=json_decode(file_get_contents('/wordpress/wp-content/plugins/tbv-catalog-import/public-catalog.json'),true);$original=$src['rows'];$rows=[];$n=0;
foreach($names as $name){$base=null;foreach($original as $candidate){if($candidate['name']===$name&&$candidate['dose']==='10 mg'&&$candidate['warehouse']==='worldwide'){$base=$candidate;break;}}if(!$base)throw new RuntimeException('Public fixture template missing');
 foreach(['worldwide','us'] as $warehouse)foreach([1,5,10] as $pack){
  $row=$base;$row['catalogName']=$name;$row['name']=$name;$row['warehouse']=$warehouse;$row['packCount']=$pack;$row['sourceIndex']=$n;
  $row['migrationKey']='tbv-'.substr(hash('sha256','browser-pack-display-'.$n),0,16);$row['price']=10+$pack+($warehouse==='us'?3:0);$row['stockStatus']='instock';$row['stockEvidence']='Synthetic local fixture';$rows[]=$row;$n++;
 }
}
$src['rows']=$rows;$result=tbvi_apply($src);if(is_wp_error($result)||$result['processed_offers']!==12)throw new RuntimeException('Synthetic import failed');
foreach($names as $name){$parents=tbvi_product_ids('_tbvi_parent_key',tbvi_parent_key($name));if(count($parents)!==1)throw new RuntimeException('Synthetic parent not unique');$parent=wc_get_product($parents[0]);if(!$parent||$parent->get_status('edit')!=='draft')throw new RuntimeException('Synthetic parent is not draft');$parent->set_status('publish');$parent->save();wc_delete_product_transients($parent->get_id());}
$offers=[];foreach($rows as $row){$ids=tbvi_product_ids('_tbv_migration_key',$row['migrationKey']);if(count($ids)!==1)throw new RuntimeException('Synthetic variation not unique');$offers[]=['id'=>(int)$ids[0],'name'=>$row['name'],'warehouse'=>$row['warehouse'],'pack'=>$row['packCount'],'formulation'=>$row['noteLabel'],'price'=>(int)$row['price']];}
$synthetic_fixture=['offers'=>$offers];
