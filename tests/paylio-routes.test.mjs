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
function fixture(t,{bindingFails=false,providerFails=false,providerUrlSuffix='',pending=false,terminal=false,effectsFailOnce=false,emptyEffectsAck=false,existingAffiliate='',affiliateResponse,affiliateLookupFails=false,priorPurchases=[],historyFails=false}={}){
 const calls=[];let attempt,effectsCalls=0;
 t.mock.method(globalThis,'fetch',async(input,options={})=>{
  const url=new URL(input),body=options.body?JSON.parse(options.body):null;
  calls.push({url,options,body});
  if(url.pathname==='/auth/v1/user')return json({id:customerId,email,email_confirmed_at:'2026-10-08T00:00:00Z'});
  if(url.pathname==='/rest/v1/orders'){
   if(!url.searchParams.has('status'))return json([row]);
   if(historyFails==='network')throw new Error('fixture history unavailable');
   if(historyFails)return json({},503);
   if(!Array.isArray(priorPurchases))return json(priorPurchases);
   const statuses=url.searchParams.get('status').slice(4,-1).split(',');
   return json(priorPurchases.filter(p=>!p.status||statuses.includes(p.status)).slice(0,1));
  }
  if(url.pathname==='/rest/v1/affiliate_customers')return json(existingAffiliate?[{affiliate_code:existingAffiliate}]:[]);
  if(url.pathname==='/rest/v1/affiliates')return json(affiliateResponse===undefined?[{code:url.searchParams.get('code').slice(3),email:'affiliate@example.test',active:true}]:affiliateResponse,affiliateLookupFails?503:200);
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
   return providerFails?json({secret:'never-expose'},500):json({payment_id:'provider_fixture',ipn_token:'provider-secret-token',checkout_url:'https://paylio.org/pay/provider_fixture'+providerUrlSuffix,amount:body.amount,status:'unpaid'});
  }
  if(url.pathname==='/rest/v1/rpc/bind_paylio_checkout'){
   if(bindingFails)return json({},500);
   Object.assign(attempt,{state:'ready',payment_id:body.p_payment_id,ipn_token:body.p_ipn_token,checkout_url:body.p_checkout_url});return json(attempt);
  }
  if(url.pathname==='/api/v1/payment-status'){
   assert.equal(url.searchParams.get('payment_id'),'provider_fixture');
   return json({payment_id:'provider_fixture',status:pending?'unpaid':'paid',forward_status:'completed',amount:(attempt.amount_cents/100).toFixed(2),currency:'USD',paid_at:new Date().toISOString()});
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
const referralRequest=(body={})=>({...request(),body:{...request().body,affiliateCode:'VALIDCODE',affiliateDiscount:5,...body}});
const noReservation=f=>assert.equal(f.calls.some(c=>c.url.pathname==='/api/v1/wallet'||c.url.pathname==='/rest/v1/rpc/reserve_paylio_checkout'),false);
test('checkout URL is exposed only after private binding; retry reuses it without a second provider create',async t=>{
 const f=fixture(t),first=res();await create(request(),first);assert.equal(first.statusCode,200);assert.deepEqual(first.body,{payment_url:'https://paylio.org/pay/provider_fixture',verifiedAmount:110});
 const second=res();await create(request(),second);assert.equal(second.statusCode,200);assert.deepEqual(second.body,first.body);
 assert.equal(f.calls.filter(c=>c.url.pathname==='/api/v1/wallet').length,1);
 assert.equal(JSON.stringify(first.body).includes('token'),false);
});
test('documented PayPal direct link binds canonical URL and resumes the identical safe redirect',async t=>{
 const f=fixture(t,{providerUrlSuffix:'?email=buyer%40example.test&auto=1'}),req={...request(),body:{...request().body,provider:'paypal'}},first=res();
 await create(req,first);assert.equal(first.statusCode,200);
 assert.equal(first.body.payment_url,'https://paylio.org/pay/provider_fixture?email=buyer%40example.test&auto=1');
 assert.equal(f.attempt().checkout_url,'https://paylio.org/pay/provider_fixture');
 const second=res();await create(req,second);assert.equal(second.statusCode,200);assert.deepEqual(second.body,first.body);
 assert.equal(f.calls.filter(c=>c.url.pathname==='/api/v1/wallet').length,1);
 assert.equal(JSON.stringify(first.body).includes('provider-secret-token'),false);
});
test('unknown provider URL query remains contained without exposing a link or creating a second payment',async t=>{
 const f=fixture(t,{providerUrlSuffix:'?ipn_token=provider-secret-token'}),first=res();await create(request(),first);
 assert.equal(first.statusCode,503);assert.equal(first.body.code,'PAYLIO_INVALID_CHECKOUT_RESPONSE');
 assert.equal(f.calls.some(c=>c.url.pathname==='/rest/v1/rpc/bind_paylio_checkout'),false);
 assert.doesNotMatch(JSON.stringify(first.body),/provider-secret-token|paylio\.org\/pay/);
 const second=res();await create(request(),second);assert.equal(second.statusCode,409);assert.equal(f.calls.filter(c=>c.url.pathname==='/api/v1/wallet').length,1);
});
test('known customer referral is frozen separately from browser discount code',async t=>{
 const f=fixture(t,{existingAffiliate:'ORIGINAL'}),response=res();await create({...request(),body:{...request().body,affiliateCode:'NEWCODE'}},response);
 assert.equal(response.statusCode,200);assert.equal(f.attempt().quote.affiliateAttributionCode,'ORIGINAL');assert.equal(f.attempt().quote.affiliateCode,'NEWCODE');
 assert.equal(f.calls.some(c=>c.url.pathname==='/rest/v1/affiliates'),false);
});
test('enabled referral preserves the first-purchase cap, lower requested discount and frozen retry',async t=>{
 for(const [discount,expected] of [[5,105],[999,105],[2,108]]){
  const f=fixture(t),response=res();await create(referralRequest({affiliateDiscount:discount}),response);
  assert.equal(response.statusCode,200);assert.equal(response.body.verifiedAmount,expected);
  assert.equal(f.attempt().quote.affiliateAttributionCode,'VALIDCODE');assert.equal(f.attempt().quote.affiliateCommission,10);
  const lookup=f.calls.find(c=>c.url.pathname==='/rest/v1/affiliates');assert.equal(lookup.url.searchParams.get('select'),'code,email,active');assert.equal(lookup.options.headers.apikey,'fixture-service');
  const again=res();await create(referralRequest({affiliateDiscount:discount}),again);assert.equal(again.statusCode,200);assert.deepEqual(again.body,response.body);
  assert.equal(f.calls.filter(c=>c.url.pathname==='/api/v1/wallet').length,1);
 }
});
test('unknown, inactive and self-referral codes cannot reserve a discount or a new referral',async t=>{
 for(const affiliateResponse of [[],[{code:'VALIDCODE',email:'affiliate@example.test',active:false}],[{code:'VALIDCODE',email:' BUYER@EXAMPLE.TEST ',active:true}]]){
  for(const affiliateDiscount of [0,5]){
   const f=fixture(t,{affiliateResponse}),response=res();await create(referralRequest({affiliateDiscount}),response);
   assert.equal(response.statusCode,400);assert.equal(response.body.code,'PAYLIO_AFFILIATE_UNAVAILABLE');noReservation(f);
  }
 }
 const f=fixture(t),response=res();await create(referralRequest({affiliateCode:'INVALID.CODE'}),response);assert.equal(response.statusCode,400);noReservation(f);
 assert.equal(f.calls.some(c=>c.url.pathname==='/rest/v1/affiliates'),false);
});
test('ambiguous, malformed or failed affiliate lookups cannot initiate Paylio',async t=>{
 const valid={code:'VALIDCODE',email:'affiliate@example.test',active:true};
 for(const options of [{affiliateLookupFails:true},...[[valid,valid],{error:'bad'},[null],[{...valid,code:'OTHER'}],[{...valid,email:''}],[{...valid,active:'true'}]].map(affiliateResponse=>({affiliateResponse}))]){
  const f=fixture(t,options),response=res();await create(referralRequest(),response);assert.equal(response.statusCode,503);noReservation(f);
 }
});
test('failed or malformed purchase history never grants a first-purchase discount',async t=>{
 for(const options of [{historyFails:true},{historyFails:'network'},{priorPurchases:{error:'bad'}},{priorPurchases:[{id:null}]}]){
  const f=fixture(t,options),response=res();await create(referralRequest(),response);assert.equal(response.statusCode,503);noReservation(f);
 }
});
test('paid and fulfilled purchases exclude the first-purchase discount; pending orders do not',async t=>{
 for(const status of ['paid','done','processing','shipped','delivered','pending']){
  const f=fixture(t,{priorPurchases:[{id:'INV-EARLIER',status}]}),response=res();await create(referralRequest(),response);
  assert.equal(response.statusCode,200);assert.equal(response.body.verifiedAmount,status==='pending'?105:110);
  assert.equal(f.attempt().quote.affiliateAttributionCode,'VALIDCODE');assert.equal(f.attempt().quote.affiliateCommission,10);
 }
});
test('ordinary checkout and promo precedence avoid irrelevant affiliate eligibility lookups',async t=>{
 const ordinary=fixture(t,{historyFails:true,affiliateLookupFails:true}),response=res();await create(request(),response);assert.equal(response.statusCode,200);
 assert.equal(ordinary.calls.some(c=>c.url.pathname==='/rest/v1/affiliates'||c.url.searchParams.has('status')),false);
 const promo=fixture(t,{existingAffiliate:'ORIGINAL',historyFails:true,affiliateLookupFails:true}),discounted=res();await create(referralRequest({promoCode:'REVIEW10'}),discounted);
 assert.equal(discounted.statusCode,200);assert.equal(discounted.body.verifiedAmount,100);assert.equal(promo.attempt().quote.promoDiscount,10);assert.equal(promo.attempt().quote.affiliateDiscount,0);
 assert.equal(promo.attempt().quote.affiliateAttributionCode,'ORIGINAL');assert.equal(promo.calls.some(c=>c.url.pathname==='/rest/v1/affiliates'||c.url.searchParams.has('status')),false);
});
test('nullable active matches existing affiliate convention without changing saved attribution',async t=>{
 const f=fixture(t,{existingAffiliate:'ORIGINAL',affiliateResponse:[{code:'VALIDCODE',email:'affiliate@example.test',active:null}]}),response=res();await create(referralRequest(),response);
 assert.equal(response.statusCode,200);assert.equal(response.body.verifiedAmount,105);assert.equal(f.attempt().quote.affiliateAttributionCode,'ORIGINAL');
});
test('promo checkout validates a new attribution without checking first-purchase discount eligibility',async t=>{
 const f=fixture(t,{historyFails:true}),response=res();await create(referralRequest({promoCode:'REVIEW10'}),response);
 assert.equal(response.statusCode,200);assert.equal(response.body.verifiedAmount,100);assert.equal(f.attempt().quote.affiliateAttributionCode,'VALIDCODE');
 assert.equal(f.calls.filter(c=>c.url.pathname==='/rest/v1/affiliates').length,1);assert.equal(f.calls.some(c=>c.url.searchParams.has('status')),false);
});
test('affiliate deactivation after private binding does not reprice or block verified settlement',async t=>{
 const affiliateResponse=[{code:'VALIDCODE',email:'affiliate@example.test',active:true}],f=fixture(t,{affiliateResponse}),response=res();await create(referralRequest(),response);
 assert.equal(response.statusCode,200);const quote=JSON.stringify(f.attempt().quote);affiliateResponse[0].active=false;
 const settled=res();await callback({method:'POST',query:{attempt:f.attempt().id}},settled);
 assert.equal(settled.statusCode,200);assert.equal(settled.body.paymentRecorded,true);assert.equal(JSON.stringify(f.attempt().quote),quote);assert.equal(f.attempt().amount_cents,10500);
 assert.equal(f.calls.filter(c=>c.url.pathname==='/rest/v1/affiliates').length,1);assert.equal(f.calls.filter(c=>c.url.pathname==='/api/v1/wallet').length,1);
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
