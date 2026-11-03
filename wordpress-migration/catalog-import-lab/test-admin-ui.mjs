import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const plugin=process.env.TBV_CATALOG_IMPORT_DIRECTORY;
if(!plugin || !plugin.startsWith('/')) throw Error('Set absolute TBV_CATALOG_IMPORT_DIRECTORY');
const source=fs.readFileSync(plugin+'/admin-batch.js','utf8');
const checks=[];
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function element(){return {textContent:'',disabled:false,events:{},addEventListener(name,fn){this.events[name]=fn;}};}
function setup(status,fetchFn){const items=Object.fromEntries(['tbvi-progress','tbvi-message','tbvi-resume','tbvi-cancel'].map(k=>[k,element()]));const context={window:{tbviJob:{url:'/wp-admin/admin-ajax.php',id:'job',nonce:'nonce',status}},document:{getElementById:id=>items[id]},URLSearchParams,fetch:fetchFn,Error};vm.runInNewContext(source,context);return {items,context};}
const ok=state=>({ok:true,json:async()=>({success:true,data:state})});
let calls=[];let a=setup('ready',async(url,options)=>{calls.push({url,options});return ok(calls.length===1?{cursor:2,total:4,status:'running'}:{cursor:4,total:4,status:'complete'});});await tick();await tick();
assert.equal(calls.length,2);assert.equal(a.items['tbvi-progress'].textContent,'4 / 4 offers — complete');assert.equal(a.items['tbvi-resume'].disabled,true);assert.equal(a.items['tbvi-cancel'].disabled,true);assert.equal(calls[0].options.credentials,'same-origin');assert.equal(calls[0].options.body.get('action'),'tbvi_batch');checks.push('automatic_bounded_steps_complete');
calls=[];let b=setup('ready',async()=>{calls.push(1);return {ok:false,json:async()=>({success:false,data:{message:'review needed'}})};});await tick();await tick();assert.equal(calls.length,1);assert.match(b.items['tbvi-message'].textContent,/review needed.*No automatic retry/);assert.equal(b.items['tbvi-resume'].disabled,false);checks.push('failure_stops_without_retry');
calls=[];let c=setup('needs_review',async()=>{calls.push(1);return ok({cursor:4,total:4,status:'complete'});});await tick();assert.equal(calls.length,0);await c.items['tbvi-resume'].events.click();assert.equal(calls.length,1);assert.equal(c.items['tbvi-progress'].textContent,'4 / 4 offers — complete');checks.push('manual_resume_after_review');
let resolveFirst;calls=[];const pending=new Promise(resolve=>{resolveFirst=resolve});let d=setup('ready',async(url,options)=>{const action=options.body.get('action');calls.push(action);if(action==='tbvi_batch')return pending;return ok({cursor:2,total:4,status:'cancelled',last_error:'Cancelled; drafts remain.'});});await tick();await d.items['tbvi-cancel'].events.click();assert.deepEqual(calls,['tbvi_batch']);resolveFirst(ok({cursor:2,total:4,status:'running'}));await tick();await tick();assert.deepEqual(calls,['tbvi_batch','tbvi_cancel']);assert.match(d.items['tbvi-progress'].textContent,/cancelled/);checks.push('cancel_waits_for_inflight_batch');
console.log(JSON.stringify({passed:checks.length,total:4,checks}));
