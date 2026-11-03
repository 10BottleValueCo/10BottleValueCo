import fs from 'node:fs';
import {createHash} from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
const runtime=process.env.TBV_WP_TEST_RUNTIME;
const zip=process.env.TBV_CATALOG_IMPORT_ZIP;
if (!runtime || !path.isAbsolute(runtime) || !zip || !path.isAbsolute(zip)) throw Error('Set absolute TBV_WP_TEST_RUNTIME and TBV_CATALOG_IMPORT_ZIP');
const db=path.join(runtime,'package/site/wp-content/database/.ht.6d4c7d4750440d58559d3fd26ac1a1b1/.ht.sqlite');
if (createHash('sha256').update(fs.readFileSync(db)).digest('hex')!=='48fef91efa8b84088b7688eff319e924b7b1efd25e4819c0ff3078d6fb7144a9') throw Error('Unrecognized sanitized fixture database');
const req=createRequire(path.join(runtime,'probe.mjs'));
const {loadNodeRuntime,createNodeFsMountHandler}=await import(pathToFileURL(req.resolve('@php-wasm/node')));
const {bootWordPressAndRequestHandler}=await import(pathToFileURL(req.resolve('@wp-playground/wordpress')));
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'tbv-wp-installer-'));let handler;
try {
 const site=path.join(temp,'site');fs.cpSync(path.join(runtime,'package/site'),site,{recursive:true});
 fs.rmSync(path.join(site,'wp-content/plugins/tbv-catalog-import'),{recursive:true,force:true});

 handler=await bootWordPressAndRequestHandler({createPhpRuntime:()=>loadNodeRuntime('8.3',{extensions:[],emscriptenOptions:{processId:process.pid}}),phpVersion:'8.3',maxPhpInstances:1,siteUrl:'http://127.0.0.1:9483',cookieStore:false,wordpressInstallMode:'do-not-attempt-installing',sqliteIntegrationPluginZip:new File([fs.readFileSync(path.join(runtime,'package/sqlite.zip'))],'sqlite.zip'),constants:{DISABLE_WP_CRON:true,WP_HTTP_BLOCK_EXTERNAL:true,WP_DEBUG:true,WP_DEBUG_DISPLAY:true,FS_METHOD:'direct',AUTOMATIC_UPDATER_DISABLED:true},phpIniEntries:{memory_limit:'768M',display_errors:'1',upload_max_filesize:'100M',post_max_size:'110M'},hooks:{beforeWordPressFiles:async php=>{await php.mount('/wordpress',createNodeFsMountHandler(site));}}});
 const php=await handler.getPrimaryPhp();
 const code=`<?php
 require '/wordpress/wp-load.php';require_once ABSPATH.'wp-admin/includes/admin.php';
 add_filter('pre_wp_mail',function(){return true;});$uid=wp_insert_user(['user_login'=>'tbv-installer-lab','user_email'=>'tbv-installer@example.invalid','user_pass'=>wp_generate_password(40),'role'=>'administrator']);if(is_wp_error($uid))die($uid->get_error_code());
 $expires=time()+3600;$token=WP_Session_Tokens::get_instance($uid)->create($expires);
 echo wp_json_encode(['cookie'=>AUTH_COOKIE.'='.wp_generate_auth_cookie($uid,$expires,'auth',$token).'; '.LOGGED_IN_COOKIE.'='.wp_generate_auth_cookie($uid,$expires,'logged_in',$token)]);
 `;
 const auth=JSON.parse((await php.run({code})).text);const headers={'Cookie':auth.cookie};const form=await handler.request({url:'http://127.0.0.1:9483/wp-admin/plugin-install.php?tab=upload',headers});const html=form.text;const nonce=html.match(/name="_wpnonce" value="([a-z0-9]+)"/i)?.[1];
 console.log(JSON.stringify({formStatus:form.httpStatusCode,formHasFile:html.includes('name="pluginzip"'),hasNonce:!!nonce}));if(form.httpStatusCode!==200||!nonce||!html.includes('name="pluginzip"'))throw Error('Upload form unavailable');
 const post=await handler.request({url:'http://127.0.0.1:9483/wp-admin/update.php?action=upload-plugin',method:'POST',headers,body:{_wpnonce:nonce,_wp_http_referer:'/wp-admin/plugin-install.php?tab=upload',pluginzip:new File([fs.readFileSync(zip)],'tbv-catalog-import-dev.zip',{type:'application/zip'}),install_plugin:'Install Now'}});
 const installed=fs.existsSync(path.join(site,'wp-content/plugins/tbv-catalog-import/tbv-catalog-import.php'));console.log(JSON.stringify({uploadStatus:post.httpStatusCode,installed,containsSuccess:post.text.includes('Plugin installed successfully'),title:post.text.match(/<title>(.*?)<\/title>/)?.[1]||null,excerpt:post.text.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').slice(-600)}));if(post.httpStatusCode!==200||!installed||!post.text.includes('Plugin installed successfully'))process.exitCode=1;
}finally{if(handler)await handler[Symbol.asyncDispose]();fs.rmSync(temp,{recursive:true,force:true});}
