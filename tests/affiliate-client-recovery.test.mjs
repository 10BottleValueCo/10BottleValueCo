import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import {formatInvoiceLabel} from '../artifacts/10-bottle-value/src/invoice-display.js';
const appRequire=createRequire(new URL('../artifacts/10-bottle-value/package.json',import.meta.url));
const pluginRequire=createRequire(appRequire.resolve('@vitejs/plugin-react'));
const babelRequire=createRequire(pluginRequire.resolve('@babel/core'));
const {parse}=babelRequire('@babel/parser');
const source=await readFile(new URL('../artifacts/10-bottle-value/src/App.jsx',import.meta.url),'utf8');
const ast=parse(source,{sourceType:'module',plugins:['jsx']});
const body=ast.program.body.find(n=>n.type==='ExportDefaultDeclaration'&&n.declaration.id?.name==='App').declaration.body.body;
function handler(name,context){const n=body.find(n=>n.type==='FunctionDeclaration'&&n.id.name===name);return vm.runInNewContext(`(${source.slice(n.start,n.end)})`,context);}
function fixture(){
 const calls=[];
 const context={currentUser:{id:'fixture-id',email:'buyer@example.test'},normalizeEmail:v=>String(v||'').trim().toLowerCase(),
 affiliateProfileRequestRef:{current:0},affiliateProfileIdentityRef:{current:'buyer@example.test'},isAdminUser:()=>false,
 supabase:{auth:{getSession:async()=>({data:{session:{access_token:'fixture-token'}}})}},AbortSignal,
 console:{error:()=>{}},fetch:async()=>({ok:true,json:async()=>({ok:true,affiliate:{email:'buyer@example.test',code:'PARTNER',active:true}})}),
 };
 for(const name of ['setAffiliateProfiles','setAffiliateProfilesLoaded','setAffiliateProfileError','setCurrentUser','setRegisteredUsers'])context[name]=value=>calls.push([name,value]);
 context.normalizeAffiliateRows=handler('normalizeAffiliateRows',context);
 return {context,calls};
}
test('affiliate profile uses the authenticated account API and preserves an active profile',async()=>{
 const {context,calls}=fixture();let requests=0;
 const response=context.fetch;context.fetch=async(url,options)=>{requests++;assert.equal(url,'/api/affiliate-account');assert.equal(options.headers.Authorization,'Bearer fixture-token');assert.ok(options.signal);return response();};
 await handler('loadAffiliateProfilesFromSupabase',context)();
 assert.equal(requests,1);assert.equal(calls.find(([name,value])=>name==='setAffiliateProfiles'&&value.length)?.[1][0].code,'PARTNER');
 assert.equal(calls.some(([name,value])=>name==='setAffiliateProfileError'&&value),false);
});
test('affiliate network failure is exposed as retryable unavailable, not lost membership',async()=>{
 const {context,calls}=fixture();context.fetch=async()=>{throw new Error('offline');};
 await handler('loadAffiliateProfilesFromSupabase',context)();
 assert.ok(calls.some(([name,value])=>name==='setAffiliateProfileError'&&value==='unavailable'));
 assert.ok(calls.some(([name,value])=>name==='setAffiliateProfilesLoaded'&&value===true));
});
test('an old account response cannot install affiliate profile after identity changes',async()=>{
 const {context,calls}=fixture();let resolve;context.fetch=()=>new Promise(r=>{resolve=r;});
 const pending=handler('loadAffiliateProfilesFromSupabase',context)();await new Promise(r=>setImmediate(r));
 context.affiliateProfileIdentityRef.current='different@example.test';
 resolve({ok:true,json:async()=>({ok:true,affiliate:{email:'buyer@example.test',code:'PARTNER',active:true}})});await pending;
 assert.equal(calls.some(([name,value])=>name==='setAffiliateProfiles'&&value.length),false);
 assert.equal(calls.some(([name])=>name==='setCurrentUser'),false);
});
test('invoice shortening is display-only and preserves noncanonical legacy identifiers',()=>{
 const id='INV-0123456789ABCDEF0123456789ABCDEF';assert.equal(formatInvoiceLabel(id),'INV-01234567');assert.equal(id.length,36);
 for(const value of ['INV-LEGACY123','INV-AB12','custom-id'])assert.equal(formatInvoiceLabel(value),value);
});
function promoFixture(){
 const calls=[];const context={promoInput:'PARTNER',promoApplyRequestRef:{current:0},promoCatalog:{},appliedPromo:null,affiliateProfiles:[],userPromos:[],usedPromoCodes:[],subtotal:100,currentUser:null,
 affiliateSelectionVersionRef:{current:0},sessionStorage:{setItem:()=>{},removeItem:()=>{}},lookupPublicPromoCode:async()=>null,lookupPublicAffiliateCode:async()=>({code:'PARTNER',active:true}),tx:x=>x,isFirstTimeAffiliateBuyer:true,localStorage:{setItem:()=>{},removeItem:()=>{}},
 };
 for(const name of ['setPromoMessage','setAppliedPromo','setAffiliateDiscountDisabled','setAffiliateManuallyApplied','setActiveAffiliateCode','setPromoInput','setAffiliateCodeRemoved'])context[name]=value=>calls.push([name,value]);
 context.selectAffiliateCode=handler('selectAffiliateCode',context);
 context.clearSelectedAffiliateCode=handler('clearSelectedAffiliateCode',context);
 return {calls,context};
}
test('valid affiliate remains applicable when the separate promo API is unavailable',async()=>{
 const {context,calls}=promoFixture();context.lookupPublicPromoCode=async()=>{throw new Error('offline');};
 await handler('applyPromoCode',context)();assert.ok(calls.some(([name,value])=>name==='setActiveAffiliateCode'&&value==='PARTNER'));
});
test('failed lookups never become invalid-code evidence or apply an unverified code',async()=>{
 const {context,calls}=promoFixture();context.lookupPublicPromoCode=async()=>{throw new Error('offline');};context.lookupPublicAffiliateCode=async()=>null;
 await handler('applyPromoCode',context)();assert.equal(calls.some(([name])=>name==='setActiveAffiliateCode'),false);assert.match(calls.find(([name])=>name==='setPromoMessage')[1],/Could not verify/);
});
test('a newer promo action invalidates an older lookup response',async()=>{
 const {context,calls}=promoFixture();let resolve;context.lookupPublicPromoCode=()=>new Promise(r=>{resolve=r;});
 const pending=handler('applyPromoCode',context)();context.promoApplyRequestRef.current++;resolve(null);await pending;
 assert.equal(calls.length,0);
});


test('removing a referral changes the actual checkout code and survives signup/url fallback', () => {
  const local = new Map([['tbv-active-affiliate','PARTNER']]), session = new Map();
  const context = { activeAffiliateCode:'PARTNER', affiliateCodeRemoved:false, affiliateSelectionVersionRef:{current:0},
    currentUser:{affiliateCode:'SIGNUP'},window:{location:{search:'?ref=URLCODE'}},
    setAffiliateCodeRemoved:v=>{context.affiliateCodeRemoved=v;},setActiveAffiliateCode:v=>{context.activeAffiliateCode=v;},
    setAffiliateDiscountDisabled:()=>{},setAffiliateManuallyApplied:()=>{},
    localStorage:{removeItem:k=>local.delete(k),setItem:(k,v)=>local.set(k,v)},
    sessionStorage:{removeItem:k=>session.delete(k),setItem:(k,v)=>session.set(k,v)},
  };
  const resolve=handler('getResolvedAffiliateCode',context);
  assert.equal(resolve(),'PARTNER');handler('clearSelectedAffiliateCode',context)();
  assert.equal(resolve(),'');assert.equal(session.get('tbv-affiliate-removed'),'true');assert.equal(local.has('tbv-active-affiliate'),false);
  context.activeAffiliateCode='STALE_RESPONSE';assert.equal(resolve(),'');
  handler('selectAffiliateCode',context)('REAPPLIED');assert.equal(resolve(),'REAPPLIED');assert.equal(session.has('tbv-affiliate-removed'),false);
});
test('a referral URL is validated before selection and stale validation cannot undo removal', async () => {
  const effect=body.find(n=>n.type==='ExpressionStatement'&&n.expression.callee?.name==='useEffect'
    &&source.slice(n.start,n.end).includes('lookupPublicAffiliateCode(code).then'));
  const callback=effect.expression.arguments[0];let finish;
  const {context,calls}=promoFixture();Object.assign(context,{affiliateCodeRemoved:false,currentUser:null,
    readAffiliateCodeFromBrowser:()=> 'UNVERIFIED',lookupPublicAffiliateCode:()=>new Promise(r=>{finish=r;})});
  const run=vm.runInNewContext(`(${source.slice(callback.start,callback.end)})`,context);run();
  assert.equal(calls.some(([name])=>name==='setActiveAffiliateCode'),false);
  context.clearSelectedAffiliateCode();finish({code:'UNVERIFIED',active:true});await new Promise(r=>setImmediate(r));
  assert.equal(calls.some(([name,value])=>name==='setActiveAffiliateCode'&&value==='UNVERIFIED'),false);
});
