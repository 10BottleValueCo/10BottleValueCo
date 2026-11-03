// Disposable, local WordPress/WooCommerce experiment; not a migration tool.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
const runtime = process.env.TBV_WP_TEST_RUNTIME;
if (!runtime) throw Error('Set TBV_WP_TEST_RUNTIME to an isolated WordPress test runtime');
const dir = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(runtime,'probe.mjs'));
const {loadNodeRuntime,createNodeFsMountHandler} = await import(pathToFileURL(require.resolve('@php-wasm/node')));
const {bootWordPressAndRequestHandler} = await import(pathToFileURL(require.resolve('@wp-playground/wordpress')));
const temp = fs.mkdtempSync(path.join(os.tmpdir(),'tbv-data-proof-'));
fs.cpSync(path.join(runtime,'package/site/wp-content/database'),path.join(temp,'database'),{recursive:true});
let handler;
try {
  handler = await bootWordPressAndRequestHandler({createPhpRuntime:()=>loadNodeRuntime('8.3',{extensions:[],emscriptenOptions:{processId:process.pid}}),phpVersion:'8.3',maxPhpInstances:1,siteUrl:'http://127.0.0.1:9473',cookieStore:false,wordpressInstallMode:'do-not-attempt-installing',sqliteIntegrationPluginZip:new File([fs.readFileSync(path.join(runtime,'package/sqlite.zip'))],'sqlite.zip'),constants:{TBV_SYNTHETIC_WOO_TEST:true,DISABLE_WP_CRON:true,WP_HTTP_BLOCK_EXTERNAL:true,WP_DEBUG:false,WP_DEBUG_DISPLAY:false,DISALLOW_FILE_MODS:true},hooks:{beforeWordPressFiles:async php=>{await php.mount('/wordpress',createNodeFsMountHandler(path.join(runtime,'package/site')));await php.mount('/wordpress/wp-content/database',createNodeFsMountHandler(path.join(temp,'database')));}}});
  const php = await handler.getPrimaryPhp();
  const r = await php.run({code:fs.readFileSync(path.join(dir,'woo-proof.php'),'utf8')});
  if (r.exitCode!==0) throw Error(r.errors+' '+r.text);
  const result=JSON.parse(r.text); console.log(JSON.stringify(result));
  if (result.passed!==result.total) process.exitCode=1;
} finally {if(handler)await handler[Symbol.asyncDispose]();fs.rmSync(temp,{recursive:true,force:true});}
