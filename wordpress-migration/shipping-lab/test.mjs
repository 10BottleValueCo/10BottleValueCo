import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
const dir=path.dirname(fileURLToPath(import.meta.url));
const runtime=process.env.TBV_WP_TEST_RUNTIME;
if (!runtime) throw new Error('Set TBV_WP_TEST_RUNTIME to an isolated WordPress test runtime.');
const req=createRequire(path.join(runtime,'probe.mjs'));
const {loadNodeRuntime,createNodeFsMountHandler}=await import(pathToFileURL(req.resolve('@php-wasm/node')));
const {bootWordPressAndRequestHandler}=await import(pathToFileURL(req.resolve('@wp-playground/wordpress')));
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'tbv-shipping-test-'));
fs.cpSync(path.join(runtime,'package/site/wp-content/database'),path.join(temp,'database'),{recursive:true});
let handler;
try {
 handler=await bootWordPressAndRequestHandler({createPhpRuntime:()=>loadNodeRuntime('8.3',{extensions:[],emscriptenOptions:{processId:process.pid}}),phpVersion:'8.3',maxPhpInstances:1,siteUrl:'http://127.0.0.1:9472',cookieStore:false,wordpressInstallMode:'do-not-attempt-installing',sqliteIntegrationPluginZip:new File([fs.readFileSync(path.join(runtime,'package/sqlite.zip'))],'sqlite.zip'),constants:{DISABLE_WP_CRON:true,WP_HTTP_BLOCK_EXTERNAL:true,WP_DEBUG:false,WP_DEBUG_DISPLAY:false,DISALLOW_FILE_MODS:true},hooks:{beforeWordPressFiles:async php=>{await php.mount('/wordpress',createNodeFsMountHandler(path.join(runtime,'package/site')));await php.mount('/wordpress/wp-content/database',createNodeFsMountHandler(path.join(temp,'database')));await php.mount('/wordpress/wp-content/plugins/tbv-warehouse-shipping',createNodeFsMountHandler(path.join(dir,'tbv-warehouse-shipping')));}}});
 const php=await handler.getPrimaryPhp();
 const result=await php.run({code:`<?php
 require '/wordpress/wp-load.php'; require '/wordpress/wp-content/plugins/tbv-warehouse-shipping/tbv-warehouse-shipping.php';
 $cfg=['currency'=>'USD','metadata'=>['source'=>'existing storefront source - test fixture','status'=>'unverified test data','version'=>'fixture-1'],'us_warehouse_countries'=>['US'],'express_countries'=>['US','CA'],'tiers'=>['standard'=>[['min_subtotal'=>'0','price'=>'59.99'],['min_subtotal'=>'100','price'=>'39.99'],['min_subtotal'=>'300','price'=>'0']],'express'=>[['min_subtotal'=>'0','price'=>'99.99'],['min_subtotal'=>'300','price'=>'19.99'],['min_subtotal'=>'550','price'=>'0']]]];
 $t=[];function check($k,$v){global $t;$t[$k]=(bool)$v;}function q($cfg,$items,$country='US',$service='standard',$currency='USD'){return tbv_shipping_quote($cfg,$items,$country,$service,$currency);}
 function item($w,$n){return ['warehouse'=>$w,'line_subtotal'=>$n];}
 check('minor_decimal',tbv_shipping_minor('19.99')===1999&&tbv_shipping_minor('0')===0&&tbv_shipping_minor('1.1')===110);
 check('invalid_money_rejected',tbv_shipping_minor('-1')===null&&tbv_shipping_minor('1.001')===null&&tbv_shipping_minor('1e3')===null);
 check('standard_below_100',q($cfg,[item('worldwide','99.99')])['minor']===5999);
 check('standard_at_100',q($cfg,[item('worldwide','100.00')])['minor']===3999);
 check('standard_below_300',q($cfg,[item('worldwide','299.99')])['minor']===3999);
 check('standard_at_300',q($cfg,[item('worldwide','300')])['minor']===0);
 check('express_below_300',q($cfg,[item('worldwide','299.99')],'US','express')['minor']===9999);
 check('express_at_300',q($cfg,[item('worldwide','300')],'US','express')['minor']===1999);
 check('express_at_550',q($cfg,[item('worldwide','550')],'US','express')['minor']===0);
 check('mixed_warehouse_threshold',q($cfg,[item('worldwide','99.99'),item('us','900')])['minor']===5999);
 check('us_only_free',q($cfg,[item('us','200')])['minor']===0);
 check('us_only_has_no_express',q($cfg,[item('us','200')],'US','express')===null);
 check('us_destination_rejected',q($cfg,[item('us','200')],'CA')===null);
 check('express_destination_rejected',q($cfg,[item('worldwide','10')],'GB','express')===null);
 check('unknown_warehouse_rejected',q($cfg,[item('other','100')])===null);
 check('wrong_currency_rejected',q($cfg,[item('worldwide','100')],'US','standard','CAD')===null);
 $bad=$cfg;$bad['tiers']['standard'][1]['min_subtotal']='0';check('invalid_tiers_rejected',q($bad,[item('worldwide','100')])===null);
 $bad=$cfg;unset($bad['metadata']['source']);check('unsourced_config_rejected',q($bad,[item('worldwide','100')])===null);
 $bad=$cfg;$bad['metadata']['version']=['bad'];check('invalid_version_rejected',q($bad,[item('worldwide','100')])===null);
 check('rule_version_recorded',q($cfg,[item('worldwide','100')])['version']==='fixture-1');
 do_action('woocommerce_shipping_init'); $method=new TBV_Warehouse_Shipping_Method(1);$method->instance_settings=['title'=>'Test shipping','service'=>'standard','tax_status'=>'none','configuration'=>wp_json_encode($cfg)];$method->title='Test shipping';$method->tax_status='none';$p=wc_get_product(77);$p->update_meta_data('_tbv_warehouse','worldwide');
 $pkg=['contents'=>[['data'=>$p,'quantity'=>1,'line_subtotal'=>'100.00']],'destination'=>['country'=>'US']]; $method->calculate_shipping($pkg);$rates=$method->rates;$rate=reset($rates);check('woocommerce_rate_integration',$rate && $rate->get_cost()==='39.99' && $rate->get_meta_data()['tbv_rule_version']==='fixture-1');
 echo wp_json_encode(['passed'=>count(array_filter($t)),'total'=>count($t),'tests'=>$t]);
 `});
 if(result.exitCode!==0)throw Error(result.errors+' '+result.text);
 const answer=JSON.parse(result.text);console.log(JSON.stringify(answer));if(answer.passed!==answer.total)process.exitCode=1;
}finally{if(handler)await handler[Symbol.asyncDispose]();fs.rmSync(temp,{recursive:true,force:true});}
