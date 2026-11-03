import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
const runtime=process.env.TBV_WP_TEST_RUNTIME;
if (!runtime || !path.isAbsolute(runtime)) throw Error('Set an absolute TBV_WP_TEST_RUNTIME');
const sourceDb=path.join(runtime,'package/site/wp-content/database/.ht.6d4c7d4750440d58559d3fd26ac1a1b1/.ht.sqlite');
if (createHash('sha256').update(fs.readFileSync(sourceDb)).digest('hex')!=='48fef91efa8b84088b7688eff319e924b7b1efd25e4819c0ff3078d6fb7144a9') throw Error('Unrecognized sanitized fixture database');
const here=path.dirname(fileURLToPath(import.meta.url));const repo=path.resolve(here,'../..');
const importer=process.env.TBV_IMPORTER_DIRECTORY;
if (!importer || !path.isAbsolute(importer)) throw Error('Set absolute TBV_IMPORTER_DIRECTORY');
const theme=process.env.TBV_THEME_DIRECTORY || path.join(repo,'wordpress-migration/staging-theme-lab/theme/10bottlevalue-react-proof');
const catalog=process.env.TBV_CATALOG_DIRECTORY || path.join(repo,'wordpress-preview-server/site/wp-content/plugins/tbv-public-woo-catalog');
if (!path.isAbsolute(theme) || !path.isAbsolute(catalog)) throw Error('Theme and catalog paths must be absolute');
const req=createRequire(path.join(runtime,'probe.mjs'));
const {loadNodeRuntime,createNodeFsMountHandler}=await import(pathToFileURL(req.resolve('@php-wasm/node')));
const {bootWordPressAndRequestHandler}=await import(pathToFileURL(req.resolve('@wp-playground/wordpress')));
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'tbv-catalog-integration-'));
fs.cpSync(path.join(runtime,'package/site/wp-content/database'),path.join(temp,'database'),{recursive:true});fs.mkdirSync(path.join(temp,'uploads'));let handler;
try {
 handler=await bootWordPressAndRequestHandler({createPhpRuntime:()=>loadNodeRuntime('8.3',{extensions:[],emscriptenOptions:{processId:process.pid}}),phpVersion:'8.3',maxPhpInstances:1,siteUrl:'http://127.0.0.1:9472',cookieStore:false,wordpressInstallMode:'do-not-attempt-installing',sqliteIntegrationPluginZip:new File([fs.readFileSync(path.join(runtime,'package/sqlite.zip'))],'sqlite.zip'),constants:{WP_ENVIRONMENT_TYPE:'local',TBV_STAGING_PREVIEW:true,TBV_CATALOG_IMPORT_STAGING:true,DISABLE_WP_CRON:true,WP_HTTP_BLOCK_EXTERNAL:true,DISALLOW_FILE_MODS:true,WP_DEBUG:false,WP_DEBUG_DISPLAY:false},hooks:{beforeWordPressFiles:async php=>{
  await php.mount('/wordpress',createNodeFsMountHandler(path.join(runtime,'package/site')));
  await php.mount('/wordpress/wp-content/database',createNodeFsMountHandler(path.join(temp,'database')));
  await php.mount('/wordpress/wp-content/uploads',createNodeFsMountHandler(path.join(temp,'uploads')));
  await php.mount('/wordpress/wp-content/plugins/tbv-catalog-import',createNodeFsMountHandler(importer));
  await php.mount('/wordpress/wp-content/themes/10bottlevalue-react-proof',createNodeFsMountHandler(theme));
  await php.mount('/wordpress/wp-content/plugins/tbv-public-woo-catalog',createNodeFsMountHandler(catalog));
 }}});
 const php=await handler.getPrimaryPhp();const result=await php.run({code:`<?php
 require '/wordpress/wp-load.php';require '/wordpress/wp-content/plugins/tbv-catalog-import/tbv-catalog-import.php';require '/wordpress/wp-content/plugins/tbv-public-woo-catalog/tbv-public-woo-catalog.php';require '/wordpress/wp-content/themes/10bottlevalue-react-proof/functions.php';
 $checks=[];function ck($key,$value){global $checks;$checks[$key]=(bool)$value;}
 // This database is a disposable, hash-checked copy of the sanitized fixture.
 global $wpdb;$ids=$wpdb->get_col("SELECT ID FROM {$wpdb->posts} WHERE post_type IN ('product','product_variation')");foreach($ids as $id){$wpdb->delete($wpdb->postmeta,['post_id'=>$id]);$wpdb->delete($wpdb->posts,['ID'=>$id]);}wp_cache_flush();wc_delete_product_transients();
 update_option('woocommerce_currency','USD');update_option('woocommerce_price_num_decimals',2);
 $src=json_decode(file_get_contents('/wordpress/wp-content/plugins/tbv-catalog-import/public-catalog.json'),true);$base=$src['rows'][0];$rows=[];$n=0;
 foreach(['worldwide','us'] as $warehouse)foreach([1,5,10] as $pack)foreach(['','Synthetic special'] as $note){$row=$base;$row['catalogName']='Synthetic Imported Item';$row['name']='Synthetic Imported Item';$row['dose']='5 mg';$row['warehouse']=$warehouse;$row['packCount']=$pack;$row['noteLabel']=$note;$row['sourceIndex']=$n;$row['migrationKey']='tbv-'.substr(hash('sha256','synthetic-integration-'.$n),0,16);$row['price']=11+$n;$row['stockStatus']='instock';$row['stockEvidence']='Synthetic fixture';$rows[]=$row;$n++;}$src['rows']=$rows;
 $plan=tbvi_plan($src);ck('dry_run_offers',!is_wp_error($plan)&&$plan['counts']['products']===1&&$plan['counts']['offers']===12);
 $import=tbvi_apply($src);ck('import_created_12',!is_wp_error($import)&&$import['processed_offers']===12);
 $repeat=tbvi_plan($src);ck('repeat_is_idempotent',!is_wp_error($repeat)&&$repeat['counts']['new_variations']===0&&$repeat['counts']['existing_variations']===12);
 $parentIds=tbvi_product_ids('_tbvi_parent_key',tbvi_parent_key('Synthetic Imported Item'));$parent=count($parentIds)===1?wc_get_product($parentIds[0]):null;
 ck('import_parent_stays_draft',$parent&&$parent->get_status('edit')==='draft');ck('draft_not_public',count(tbv_react_proof_woo_catalog()??[])===0);
 // Publishing is test-only and occurs in the copied fixture, not in the importer.
 if($parent){$parent->set_status('publish');$parent->save();wc_delete_product_transients($parent->get_id());}
 $sampleIds=tbvi_product_ids('_tbv_migration_key',$rows[0]['migrationKey']);$sample=count($sampleIds)===1?wc_get_product($sampleIds[0]):null;
 if($sample){$sample->delete_meta_data('_tbvi_managed');$sample->save();$unmanaged=tbv_public_catalog_offer(wc_get_product($sample->get_id()),$parent);ck('unmanaged_attribute_fallback_kept',$unmanaged && $unmanaged['formulation']==='Standard');$sample->update_meta_data('_tbvi_managed','yes');$sample->save();}else ck('unmanaged_attribute_fallback_kept',false);
 $catalog=tbv_react_proof_woo_catalog();ck('published_catalog_count',is_array($catalog)&&count($catalog)===12);
 $matches=0;$noExtras=0;$mismatches=[];
 foreach($rows as $row){$ids=tbvi_product_ids('_tbv_migration_key',$row['migrationKey']);$var=count($ids)===1?wc_get_product($ids[0]):null;if(!$var)continue;$hits=array_values(array_filter($catalog??[],fn($o)=>$o['wooVariationId']===$var->get_id()));if(count($hits)===1){$o=$hits[0];if($o['wooProductId']===$parent->get_id() && $o['name']==='Synthetic Imported Item' && $o['dose']===$row['dose'] && $o['warehouse']===$row['warehouse'] && $o['pack']===$row['packCount'] && $o['noteLabel']===$row['noteLabel'] && $o['price']===(float)$row['price'] && !$o['outOfStock'])$matches++;else $mismatches[]=['expected'=>['dose'=>$row['dose'],'warehouse'=>$row['warehouse'],'pack'=>$row['packCount'],'note'=>$row['noteLabel'],'price'=>$row['price']],'actual'=>['dose'=>$o['dose'],'warehouse'=>$o['warehouse'],'pack'=>$o['pack'],'note'=>$o['noteLabel'],'price'=>$o['price'],'outOfStock'=>$o['outOfStock']]];$noExtras++;}}
 ck('all_12_offers_match_source_selections',$matches===12);ck('all_12_ids_resolve_uniquely',$noExtras===12);
 wc_load_cart();$cart=WC()->cart;$cartMatches=0;
 foreach($rows as $row){$cart->empty_cart();$ids=tbvi_product_ids('_tbv_migration_key',$row['migrationKey']);$var=count($ids)===1?wc_get_product($ids[0]):null;if(!$var)continue;$key=$cart->add_to_cart($parent->get_id(),1,$var->get_id(),$var->get_variation_attributes());$items=$cart->get_cart();$item=$key!==false?($items[$key]??null):null;if($item && (int)$item['variation_id']===$var->get_id() && (float)$item['data']->get_price()===(float)$row['price'])$cartMatches++;}
 ck('all_12_variations_add_to_woo_cart',$cartMatches===12);
 echo wp_json_encode(['passed'=>count(array_filter($checks)),'total'=>count($checks),'checks'=>$checks,'mismatches'=>$mismatches]);`});
 if(result.exitCode!==0)throw Error(result.errors+' '+result.text);const report=JSON.parse(result.text);console.log(JSON.stringify(report));if(report.passed!==report.total)process.exitCode=1;
} finally {if(handler)await handler[Symbol.asyncDispose]();fs.rmSync(temp,{recursive:true,force:true});}
