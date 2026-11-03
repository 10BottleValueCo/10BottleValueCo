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
const theme=process.env.TBV_THEME_DIRECTORY || path.join(here,'theme/10bottlevalue-react-proof');
const catalog=process.env.TBV_CATALOG_DIRECTORY || path.join(repo,'wordpress-preview-server/site/wp-content/plugins/tbv-public-woo-catalog');
if (!path.isAbsolute(theme) || !path.isAbsolute(catalog)) throw Error('Theme and catalog paths must be absolute');
const req=createRequire(path.join(runtime,'probe.mjs'));
const {loadNodeRuntime,createNodeFsMountHandler}=await import(pathToFileURL(req.resolve('@php-wasm/node')));
const {bootWordPressAndRequestHandler}=await import(pathToFileURL(req.resolve('@wp-playground/wordpress')));
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'tbv-currency-lab-'));
fs.cpSync(path.join(runtime,'package/site/wp-content/database'),path.join(temp,'database'),{recursive:true});let handler;
try {
 handler=await bootWordPressAndRequestHandler({createPhpRuntime:()=>loadNodeRuntime('8.3',{extensions:[],emscriptenOptions:{processId:process.pid}}),phpVersion:'8.3',maxPhpInstances:1,siteUrl:'http://127.0.0.1:9472',cookieStore:false,wordpressInstallMode:'do-not-attempt-installing',sqliteIntegrationPluginZip:new File([fs.readFileSync(path.join(runtime,'package/sqlite.zip'))],'sqlite.zip'),constants:{WP_ENVIRONMENT_TYPE:'local',TBV_STAGING_PREVIEW:true,DISABLE_WP_CRON:true,WP_HTTP_BLOCK_EXTERNAL:true,DISALLOW_FILE_MODS:true,WP_DEBUG:false,WP_DEBUG_DISPLAY:false},hooks:{beforeWordPressFiles:async php=>{
  await php.mount('/wordpress',createNodeFsMountHandler(path.join(runtime,'package/site')));
  await php.mount('/wordpress/wp-content/database',createNodeFsMountHandler(path.join(temp,'database')));
  await php.mount('/wordpress/wp-content/themes/10bottlevalue-react-proof',createNodeFsMountHandler(theme));
  await php.mount('/wordpress/wp-content/plugins/tbv-public-woo-catalog',createNodeFsMountHandler(catalog));
 }}});
 const php=await handler.getPrimaryPhp();const result=await php.run({code:`<?php
 require '/wordpress/wp-load.php';require '/wordpress/wp-content/plugins/tbv-public-woo-catalog/tbv-public-woo-catalog.php';require '/wordpress/wp-content/themes/10bottlevalue-react-proof/functions.php';
 $checks=[];function ck($key,$value){global $checks;$checks[$key]=(bool)$value;}
 update_option('woocommerce_currency','USD');update_option('woocommerce_price_num_decimals',2);$base=tbv_react_proof_woo_catalog();ck('usd_two_decimals_available',is_array($base)&&count($base)>0);
 update_option('woocommerce_currency','EUR');ck('wrong_currency_unavailable',tbv_react_proof_woo_catalog()===null);
 ob_start();include '/wordpress/wp-content/themes/10bottlevalue-react-proof/front-page.php';$markup=ob_get_clean();ck('unsupported_currency_alert',strpos($markup,'unsupported currency or precision')!==false);ck('unsupported_currency_no_product_payload',strpos($markup,'window.TBV_WOO_CATALOG = []')!==false);
 $r=new WP_REST_Request('GET','/tbv-catalog/v1/products');$r->set_param('page',1);$r->set_param('per_page',100);$raw=tbv_public_catalog_response($r);ck('public_adapter_preserves_configured_currency',$raw->get_data()['currency']==='EUR');
 update_option('woocommerce_currency','USD');update_option('woocommerce_price_num_decimals',3);ck('unsupported_precision_unavailable',tbv_react_proof_woo_catalog()===null);
 update_option('woocommerce_price_num_decimals',2);
 $product=new WC_Product_Simple();$product->set_name('Synthetic precision fixture');$product->set_status('publish');$product->set_regular_price('12.345');$product->set_catalog_visibility('visible');$product->update_meta_data('_tbv_warehouse','worldwide');$product->update_meta_data('_tbv_dose','5 mg');$product->update_meta_data('_tbv_pack_size','10');$product->save();
 ck('fractional_cent_unavailable',tbv_react_proof_woo_catalog()===null);$product->set_regular_price('12.34');$product->save();$restored=tbv_react_proof_woo_catalog();ck('valid_price_restores_catalog',is_array($restored)&&count(array_filter($restored,fn($o)=>$o['wooProductId']===$product->get_id() && $o['price']===12.34))===1);
 $product->set_regular_price('0');$product->save();$zero=tbv_react_proof_woo_catalog();ck('zero_price_retained',is_array($zero)&&count(array_filter($zero,fn($o)=>$o['wooProductId']===$product->get_id() && $o['price']===0.0))===1);
 $product->set_regular_price('99999999999999.99');$product->save();ck('unsafe_javascript_amount_unavailable',tbv_react_proof_woo_catalog()===null);
 echo wp_json_encode(['passed'=>count(array_filter($checks)),'total'=>count($checks),'checks'=>$checks]);`});
 if(result.exitCode!==0)throw Error(result.errors+' '+result.text);const report=JSON.parse(result.text);console.log(JSON.stringify(report));if(report.passed!==report.total)process.exitCode=1;
} finally {if(handler)await handler[Symbol.asyncDispose]();fs.rmSync(temp,{recursive:true,force:true});}
