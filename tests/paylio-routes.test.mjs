import {test,mock} from 'node:test';
import assert from 'node:assert/strict';
import {paylioAccount} from '../api/_paylio-binding.js';
Object.assign(process.env,{SUPABASE_URL:'https://fixture.test',SUPABASE_SERVICE_ROLE_KEY:'fixture-service',PAYLIO_API_KEY:'fixture-provider-key',PAYLIO_PAYOUT_ADDRESS:'0x'+'1'.repeat(40),RESEND_API_KEY:'fixture-receipt'});
mock.module('../api/_catalog.js',{namedExports:{validateAndPriceItems:()=>({pricedItems:[{name:'Fixture',dose:'1 mg',quantity:1,price:100}],subtotal:100,regularSubtotal:100}),getShippingPrice:()=>10,getAutomaticDiscountRate:()=>0}});
const create=(await import('../api/create-paylio-payment.js')).default;
const callback=(await import('../api/paylio-callback.js')).default;
const orderId='INV-PAYLIO123',customerId='11111111-1111-4111-8111-111111111111',email='buyer@example.test';
const row={id:orderId,user_id:customerId,email,status:'checkout',total:110,metadata:{firstName:'Buyer',address:'Fixture address',storeCreditUsed:0},payment_provider:null};
const res=()=>({statusCode:200,setHeader(){},status(code){this.statusCode=code;return this},json(body){this.body=body;return this}});
const json=(body,status=200)=>new Response(JSON.stringify(body),{status});
function fixture(t,{bindingFails=false,providerFails=false,pending=false,terminal=false,effectsFailOnce=false,emptyEffectsAck=false,existingAffiliate=''}={}){
 const calls=[];let attempt,effectsCalls=0;
 t.mock.method(globalThis,'fetch',async(input,options={})=>{
  const url=new URL(input),body=options.body?JSON.parse(options.body):null;
  calls.push({url,options,body});
  if(url.pathname==='/auth/v1/user')return json({id:customerId,email,email_confirmed_at:'2026-10-08T00:00:00Z'});
  if(url.pathname==='/rest/v1/orders')return json(url.searchParams.has('status')?[]:[row]);
  if(url.pathname==='/rest/v1/affiliate_customers')return json(existingAffiliate?[{affiliate_code:existingAffiliate}]:[]);
  if(url.pathname==='/rest/v1/user_promos')return json(url.searchParams.has('email')?[]:[{email:'another@example.test',rate:0.1,used:false}]);
  if(url.pathname==='/rest/v1/paylio_payment_attempts')return json(attempt?[attempt]:[]);
  if(url.pathname==='/rest/v1/rpc/reserve_paylio_checkout'){
   if(attempt)return json({created:false,attempt});
   attempt={id:body.p_id,order_id:orderId,customer_id:customerId,email,fingerprint:body.p_fingerprint,account_fingerprint:body.p_account_fingerprint,payout_address:body.p_payout_address,amount_cents:body.p_amount_cents,currency:'USD',state:'reserved',quote:body.p_quote,created_at:new Date().toISOString()};
   return json({created:true,attempt});
  }
  if(url.pathname==='/api/v1/wallet'){
   assert.equal(body.currency,'USD');assert.equal(body.passFeeToCustomer,false);
   assert.equal(body.callback,`https://10bottlevalue.co/api/paylio-callback?attempt=${attempt.id}`);
   assert.ok(!body.callback.includes(email));
   return providerFails?json({secret:'never-expose'},500):json({payment_id:'provider_fixture',ipn_token:'provider-secret-token',checkout_url:'https://paylio.org/pay/provider_fixture',amount:'110.00',status:'unpaid'});
  }
  if(url.pathname==='/rest/v1/rpc/bind_paylio_checkout'){
   if(bindingFails)return json({},500);
   Object.assign(attempt,{state:'ready',payment_id:body.p_payment_id,ipn_token:body.p_ipn_token,checkout_url:body.p_checkout_url});return json(attempt);
  }
  if(url.pathname==='/api/v1/payment-status'){
   assert.equal(url.searchParams.get('payment_id'),'provider_fixture');
   return json({payment_id:'provider_fixture',status:pending?'unpaid':'paid',forward_status:'completed',amount:'110.00',currency:'USD',paid_at:new Date().toISOString()});
  }
  if(url.pathname==='/rest/v1/rpc/finalize_paylio_checkout'){
   if(terminal)return json({},409);
   const transitioned=attempt.state!=='paid';attempt.state='paid';return json({ok:true,transitioned,orderId,paymentId:attempt.payment_id,status:'paid',quote:attempt.quote,paidAt:new Date().toISOString()});
  }
  if(url.pathname==='/rest/v1/rpc/apply_paylio_order_effects'){
   effectsCalls++;assert.equal(body.p_id,attempt.id);
   return json(emptyEffectsAck?[]:{ok:!(effectsFailOnce&&effectsCalls===1),applied:effectsCalls===1,orderId});
  }
  if(url.hostname==='api.resend.com')return json({id:'receipt_fixture'});
  assert.fail('Unexpected network '+url.href);
 });
 return {calls,attempt:()=>attempt};
}
const request=()=>({method:'POST',headers:{authorization:'Bearer fixture'},body:{order_id:orderId,email,items:[{name:'Fixture'}],storeCreditUsed:0}});
test('checkout URL is exposed only after private binding; retry reuses it without a second provider create',async t=>{
 const f=fixture(t),first=res();await create(request(),first);assert.equal(first.statusCode,200);assert.deepEqual(first.body,{payment_url:'https://paylio.org/pay/provider_fixture',verifiedAmount:110});
 const second=res();await create(request(),second);assert.equal(second.statusCode,200);assert.deepEqual(second.body,first.body);
 assert.equal(f.calls.filter(c=>c.url.pathname==='/api/v1/wallet').length,1);
 assert.equal(JSON.stringify(first.body).includes('token'),false);
});
test('known customer referral is frozen separately from browser discount code',async t=>{
 const f=fixture(t,{existingAffiliate:'ORIGINAL'}),response=res();await create({...request(),body:{...request().body,affiliateCode:'NEWCODE'}},response);
 assert.equal(response.statusCode,200);assert.equal(f.attempt().quote.affiliateAttributionCode,'ORIGINAL');assert.equal(f.attempt().quote.affiliateCode,'NEWCODE');
});
test('personal promo belonging to another email cannot reserve or initiate Paylio payment',async t=>{
 const f=fixture(t),response=res();await create({...request(),body:{...request().body,promoCode:'SOMEONEELSE'}},response);
 assert.equal(response.statusCode,400);assert.equal(response.body.code,'PAYLIO_PROMO_UNAVAILABLE');
 assert.equal(f.calls.filter(c=>c.url.pathname==='/rest/v1/user_promos').length,1);
 assert.equal(f.calls.some(c=>c.url.pathname==='/api/v1/wallet'||c.url.pathname==='/rest/v1/rpc/reserve_paylio_checkout'),false);
});
test('failed database effects retry after paid acknowledgement without another receipt; empty acknowledgement is rejected',async t=>{
 const f=fixture(t,{effectsFailOnce:true});await create(request(),res());const req={method:'POST',query:{attempt:f.attempt().id}};
 const first=res();await callback(req,first);assert.equal(first.statusCode,503);assert.equal(first.body.paymentRecorded,true);assert.equal(first.body.effectsRecorded,false);
 const second=res();await callback(req,second);assert.equal(second.statusCode,200);assert.equal(second.body.alreadyRecorded,true);assert.equal(second.body.effectsRecorded,true);
 assert.equal(f.calls.filter(c=>c.url.hostname==='api.resend.com').length,1);
 const broken=fixture(t,{emptyEffectsAck:true});await create(request(),res());const third=res();await callback({method:'POST',query:{attempt:broken.attempt().id}},third);assert.equal(third.statusCode,503);assert.equal(third.body.effectsRecorded,false);
});
test('uncertain provider or failed binding leaks no provider response or URL and never automatically creates twice',async t=>{
 for(const options of [{providerFails:true},{bindingFails:true}]){
  const f=fixture(t,options),first=res();await create(request(),first);assert.equal(first.statusCode,503);assert.doesNotMatch(JSON.stringify(first.body),/paylio\.org\/pay|provider-secret-token|never-expose/);
  const second=res();await create(request(),second);assert.equal(second.statusCode,409);assert.equal(f.calls.filter(c=>c.url.pathname==='/api/v1/wallet').length,1);
 }
});
test('callback ignores forged public claims and performs server verification before one paid transition and one receipt',async t=>{
 const f=fixture(t);await create(request(),res());const id=f.attempt().id;
 const forged={method:'POST',url:`/api/paylio-callback?attempt=${id}&order_id=INV-FOREIGN&total=1`,body:{status:'paid',payment_id:'foreign',email:'foreign@example.test',metadata:{order_id:'INV-FOREIGN',storeCreditUsed:999}}};
 const first=res();await callback(forged,first);assert.equal(first.body.paymentRecorded,true);assert.equal(first.body.receiptAccepted,true);
 const second=res();await callback(forged,second);assert.equal(second.body.alreadyRecorded,true);
 const emails=f.calls.filter(c=>c.url.hostname==='api.resend.com');assert.equal(emails.length,1);assert.equal(emails[0].body.to,email);assert.ok(emails[0].body.html.includes('$110.00'));
});
test('unbound old callback cannot mutate, email, debit or query a provider using attacker payment ID',async t=>{
 const f=fixture(t),response=res();await callback({method:'POST',query:{order_id:orderId},body:{status:'paid',payment_id:'provider_fixture',email}},response);
 assert.equal(response.statusCode,409);assert.equal(response.body.code,'PAYLIO_LEGACY_RECONCILIATION_REQUIRED');assert.equal(f.calls.length,0);
});
test('unpaid provider result or refused terminal-state transaction cannot cause paid side effects',async t=>{
 for(const options of [{pending:true},{terminal:true}]){
  const f=fixture(t,options);await create(request(),res());const response=res();await callback({method:'GET',url:`/api/paylio-callback?attempt=${f.attempt().id}`},response);
  assert.ok(response.statusCode>=400);assert.equal(f.calls.filter(c=>c.url.hostname==='api.resend.com').length,0);
 }
});
