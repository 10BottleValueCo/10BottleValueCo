import test, {mock} from 'node:test';
import assert from 'node:assert/strict';
import {requireCheckoutOrder,persistCheckoutPricing} from '../api/_checkout-order.js';
const identity={id:'11111111-1111-4111-8111-111111111111',email:'owner@example.invalid'};
const foreignId='22222222-2222-4222-8222-222222222222';
const row=(changes={})=>({id:'INV-FIXTURE',user_id:null,email:identity.email,status:'pending',metadata:{firstName:'Fixture'},...changes});
const response=()=>({statusCode:200,headers:{},setHeader(k,v){this.headers[k]=v;},status(n){this.statusCode=n;return this;},json(v){this.body=v;return this;}});
const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json'}});
const config={orderId:'INV-FIXTURE',identity,sbUrl:'https://database.invalid',sbKey:'synthetic-service-key'};
async function get(order=row(),status=200) {
 const calls=[];globalThis.fetch=async(url,options)=>{calls.push({url:String(url),...options});return json(order===null?[]:[order],status);};
 const res=response();const context=await requireCheckoutOrder(config,res);return {calls,res,context};
}
for(const [label,change,status] of [
 ['foreign UUID cannot use matching email',{user_id:foreignId},404],
 ['foreign legacy email',{email:'other@example.invalid'},404],
 ['blank owner cannot use legacy fallback',{user_id:''},404],
 ['missing owner column cannot use fallback',{user_id:undefined},404],
 ['wrong returned order identifier',{id:'INV-OTHER'},404],
 ['paid order',{status:'paid'},409],['refunded order',{status:'refunded'},409],
 ['done order',{status:'done'},409],['unknown status',{status:'unknown'},409],
 ['changed email needs fresh checkout',{user_id:identity.id,email:'previous@example.invalid'},409],
 ['malformed metadata',{metadata:[]},503],
]) test(label,async()=>{const f=await get(row(change));assert.equal(f.context,null);assert.equal(f.res.statusCode,status);assert.equal(f.calls.length,1);});
test('missing order is indistinguishable from another customer order',async()=>{
 const missing=await get(null);const foreign=await get(row({user_id:foreignId}));assert.deepEqual(missing.res.body,foreign.res.body);assert.equal(missing.res.statusCode,404);
});
for(const [label,change] of [['matching UUID',{user_id:identity.id}],['legacy exact email',{user_id:null}],['legacy mixed-case email',{email:'OWNER@EXAMPLE.INVALID'}]]) test(label,async()=>{
 const f=await get(row(change));assert.ok(f.context);assert.equal(f.res.statusCode,200);
 const url=new URL(f.calls[0].url);assert.equal(url.searchParams.get('id'),'eq.INV-FIXTURE');assert.equal(url.searchParams.get('limit'),'2');assert.equal(f.calls[0].headers.apikey,'synthetic-service-key');
});
for(const value of ['x&id=neq.INV-FIXTURE','../orders','',null,{},'x'.repeat(161)]) test(`invalid identifier ${String(value).slice(0,30)}`,async()=>{
 let calls=0;globalThis.fetch=async()=>{calls++;};const res=response();assert.equal(await requireCheckoutOrder({...config,orderId:value},res),null);assert.equal(res.statusCode,400);assert.equal(calls,0);
});
test('service role is required rather than falling back to public access',async()=>{
 let calls=0;globalThis.fetch=async()=>{calls++;};const res=response();assert.equal(await requireCheckoutOrder({...config,sbKey:''},res),null);assert.equal(res.statusCode,503);assert.equal(calls,0);
});
for(const [label,reply] of [
 ['database refusal',()=>json({error:'private detail'},403)],
 ['ambiguous rows',()=>json([row(),row()])],
 ['malformed response',()=>new Response('not json')],
 ['oversized response',()=>new Response(' '.repeat(250001))],
 ['network failure',()=>{throw new Error('private failure');}],
]) test(label,async()=>{
 globalThis.fetch=async()=>reply();const res=response();assert.equal(await requireCheckoutOrder(config,res),null);assert.equal(res.statusCode,503);assert.ok(!JSON.stringify(res.body).includes('private'));
});
const price={total:123.45,items:[{name:'Fixture',quantity:1,price:100}],metadata:{subtotal:100,shipping:23.45}};
test('price persistence pins legacy owner, status, total and canonical items',async()=>{
 const f=await get();let sent;
 globalThis.fetch=async(url,options)=>{sent={url:new URL(url),...options};const body=JSON.parse(options.body);return json([{...row(),...body}]);};
 assert.ok(await persistCheckoutPricing(f.context,price,f.res));
 const body=JSON.parse(sent.body);assert.equal(body.user_id,identity.id);assert.equal(body.status,'checkout (clicked pay)');assert.deepEqual(body.items,price.items);assert.equal(body.metadata.total,price.total);
 assert.equal(sent.url.searchParams.get('user_id'),'is.null');assert.equal(sent.url.searchParams.get('email'),'eq.owner@example.invalid');assert.equal(sent.url.searchParams.get('status'),'eq.pending');assert.equal(sent.headers.Prefer,'return=representation');
 assert.equal(f.context.order.user_id,identity.id);
});
test('existing UUID owner is included in write condition',async()=>{
 const f=await get(row({user_id:identity.id}));globalThis.fetch=async(url,options)=>{assert.equal(new URL(url).searchParams.get('user_id'),`eq.${identity.id}`);return json([{...row(),...JSON.parse(options.body)}]);};
 assert.ok(await persistCheckoutPricing(f.context,price,f.res));
});
for(const [label,reply,status] of [
 ['concurrent paid/reassigned order',()=>json([]),409],
 ['storage refusal',()=>json({},503),503],
 ['missing representation',()=>new Response(null,{status:204}),503],
 ['wrong saved total',()=>json([row({user_id:identity.id,status:'checkout (clicked pay)',total:1})]),503],
 ['malformed saved amount',()=>json([row({user_id:identity.id,status:'checkout (clicked pay)',total:true})]),503],
 ['write timeout',()=>{throw new Error('timed out');},503],
]) test(`persistence fails closed: ${label}`,async()=>{
 const f=await get();globalThis.fetch=async()=>reply();assert.equal(await persistCheckoutPricing(f.context,price,f.res),null);assert.equal(f.res.statusCode,status);
});
test('post-provider binding failure tells operator not to blindly retry',async()=>{
 const f=await get();globalThis.fetch=async()=>json([]);assert.equal(await persistCheckoutPricing(f.context,price,f.res,{providerCreated:true}),null);assert.equal(f.res.body.code,'CHECKOUT_INVOICE_BINDING_FAILED');assert.match(f.res.body.error,/created.*Contact support before retrying/);
});

// Route-level tests verify provider I/O happens only after the saved price.
const providerCalls=[];const events=[];
mock.module('stripe',{defaultExport:class{constructor(){
 this.paymentIntents={create:async payload=>{events.push('provider');providerCalls.push(payload);return {client_secret:'synthetic-secret'};}};
 this.checkout={sessions:{create:async payload=>{events.push('provider');providerCalls.push(payload);return {client_secret:'synthetic-secret',id:'session-fixture'};}}};
}}});
Object.assign(process.env,{SUPABASE_URL:config.sbUrl,VITE_SUPABASE_URL:config.sbUrl,SUPABASE_ANON_KEY:'synthetic-public-key',SUPABASE_SERVICE_ROLE_KEY:config.sbKey,STRIPE_SECRET_KEY:'sk_test_synthetic',NOWPAYMENTS_API_KEY:'synthetic-key',CATALYSTPAY_MERCHANT_ID:'fixture',CATALYSTPAY_API_TOKEN:'synthetic-key'});
const routes=['create-payment','create-catalystpay-session','create-payment-intent','create-stripe-session'];
const handlers=Object.fromEntries(await Promise.all(routes.map(async name=>[name,(await import(`../api/${name}.js`)).default])));
function routeNetwork({order=row(),persistFailure=false,afterProviderFailure=false}={}){
 providerCalls.length=0;events.length=0;const writes=[];
 globalThis.fetch=async(url,options={})=>{
  const u=String(url);
  if(u.endsWith('/auth/v1/user')){events.push('auth');return json({...identity,email_confirmed_at:'2026-10-01'});}
  if(u.includes('/rest/v1/orders')) {
   if(options.method==='PATCH') {
    events.push('save');writes.push(JSON.parse(options.body));
    if(persistFailure || (afterProviderFailure&&providerCalls.length))return json([]);
    order={...order,...JSON.parse(options.body)};return json([order]);
   }
   if(u.includes('select=id&limit=1'))return json([]);
   events.push('owner');return json(order?[order]:[]);
  }
  if(u.startsWith('https://api.nowpayments.io/')||u.startsWith('https://api-staging.paidlyinteractive.com/')) {
   events.push('provider');providerCalls.push(JSON.parse(options.body));return json({id:'invoice-fixture',checkoutLink:'https://provider.invalid/pay',invoice_url:'https://provider.invalid/pay'});
  }
  throw new Error('Unexpected destination');
 };
 return writes;
}
async function run(name){const res=response();await handlers[name]({method:'POST',headers:{authorization:'Bearer synthetic-session'},body:{orderId:'INV-FIXTURE',order_id:'INV-FIXTURE',total:0.01,status:'paid',items:[{name:'BPC-157',dose:'5 mg',quantity:1,price:0.01}]}},res);return res;}
for(const name of routes){
 for(const [label,order] of [['foreign',row({user_id:foreignId})],['missing',null],['terminal',row({status:'paid'})]])test(`${name}: ${label} order creates no invoice`,async()=>{
  routeNetwork({order});const res=await run(name);assert.ok([404,409].includes(res.statusCode));assert.equal(providerCalls.length,0);assert.equal(events.includes('save'),false);
 });
 test(`${name}: failed order save creates no invoice`,async()=>{
  routeNetwork({persistFailure:true});const res=await run(name);assert.equal(res.statusCode,409);assert.equal(providerCalls.length,0);
 });
 test(`${name}: saved server price and items precede provider creation`,async()=>{
  const writes=routeNetwork();const res=await run(name);assert.equal(res.statusCode,200,JSON.stringify(res.body));assert.equal(providerCalls.length,1);assert.ok(events.indexOf('save')<events.indexOf('provider'));
  assert.equal(writes[0].items[0].price,79);assert.equal(writes[0].user_id,identity.id);assert.equal(writes[0].status,'checkout (clicked pay)');
  const payload=providerCalls[0];const charged=name==='create-payment'?Number(payload.price_amount):name==='create-catalystpay-session'?Number(payload.amount):name==='create-payment-intent'?payload.amount/100:payload.line_items[0].price_data.unit_amount/100;
  assert.equal(writes[0].total,charged);assert.equal(writes[0].metadata.total,charged);
  if(name==='create-catalystpay-session'){assert.equal(writes[1].metadata.catalystpay_invoice_id,'invoice-fixture');assert.ok(events.lastIndexOf('save')>events.indexOf('provider'));}
 });
}
test('CatalystPay withholds checkout link if post-provider binding fails',async()=>{
 routeNetwork({afterProviderFailure:true});const res=await run('create-catalystpay-session');assert.equal(providerCalls.length,1);assert.equal(res.statusCode,503);assert.equal(res.body.code,'CHECKOUT_INVOICE_BINDING_FAILED');assert.equal(res.body.checkoutLink,undefined);assert.match(res.body.error,/Contact support before retrying/);
});
