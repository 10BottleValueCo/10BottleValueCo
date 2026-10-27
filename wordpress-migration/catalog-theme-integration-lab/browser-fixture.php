<?php
// Invoked only by the localhost test server with a disposable fixture database.
if (!defined('TBV_DISPOSABLE_FIXTURE') || TBV_DISPOSABLE_FIXTURE !== true || wp_get_environment_type() !== 'local') throw new RuntimeException('Disposable local fixture required');
require_once '/wordpress/wp-content/plugins/tbv-catalog-import/tbv-catalog-import.php';
$src=json_decode(file_get_contents('/wordpress/wp-content/plugins/tbv-catalog-import/public-catalog.json'),true);
$base=$src['rows'][0];$rows=[];$n=0;
foreach(['worldwide','us'] as $warehouse)foreach(['with/d',''] as $form)foreach([1,5,10] as $pack){
    $row=$base;$row['catalogName']='SYNTHETIC IMPORT FIXTURE - DO NOT SELL';$row['name']=$row['catalogName'];$row['dose']='5 mg';
    $row['warehouse']=$warehouse;$row['packCount']=$pack;$row['noteLabel']=$form;$row['sourceIndex']=$n;
    $row['migrationKey']='tbv-'.substr(hash('sha256','browser-import-fixture-'.$n),0,16);
    $row['price']=$pack*10+($warehouse==='us'?3:0)+($form==='with/d'?1:0);$row['stockStatus']='instock';$row['stockEvidence']='Synthetic local fixture';
    $rows[]=$row;$n++;
}
$src['rows']=$rows;$result=tbvi_apply($src);
if(is_wp_error($result)||$result['processed_offers']!==12)throw new RuntimeException('Synthetic import failed');
$parents=tbvi_product_ids('_tbvi_parent_key',tbvi_parent_key('SYNTHETIC IMPORT FIXTURE - DO NOT SELL'));
if(count($parents)!==1)throw new RuntimeException('Synthetic parent not unique');
$parent=wc_get_product($parents[0]);if(!$parent||$parent->get_status('edit')!=='draft')throw new RuntimeException('Synthetic draft unavailable');
// Deliberate publication happens only inside the copied fixture database.
$parent->set_status('publish');$parent->save();wc_delete_product_transients($parent->get_id());
$offers=[];foreach($rows as $row){$ids=tbvi_product_ids('_tbv_migration_key',$row['migrationKey']);if(count($ids)!==1)throw new RuntimeException('Synthetic variation not unique');$offers[]=['id'=>(int)$ids[0],'warehouse'=>$row['warehouse'],'pack'=>$row['packCount'],'formulation'=>$row['noteLabel'],'price'=>(int)$row['price']];}
$synthetic_fixture=['parent'=>(int)$parent->get_id(),'offers'=>$offers];
