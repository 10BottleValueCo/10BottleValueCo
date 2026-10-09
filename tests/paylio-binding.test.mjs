import test from 'node:test';
import assert from 'node:assert/strict';
import {paylioAccount,paylioCents,paylioCheckoutUrl,paylioCustomerUrl,reservePaylio,bindPaylio,verifyPaylioAttempt} from '../api/_paylio-binding.js';
const id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',customer='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const env={SUPABASE_URL:'https://fixture.test',SUPABASE_SERVICE_ROLE_KEY:'fixture-private',PAYLIO_API_KEY:'fixture-paylio',PAYLIO_PAYOUT_ADDRESS:'0x'+'1'.repeat(40)};
const created=new Date(Date.now()-60000).toISOString(),paid=new Date().toISOString();
const quote={email:'buyer@example.test',orderId:'INV-PAYLIO123',total:100,subtotal:90,shipping:10,storeCreditUsed:0,items:[{name:'Fixture',price:90,quantity:1}]};
const base={id,order_id:quote.orderId,customer_id:customer,email:quote.email,amount_cents:10000,currency:'USD',state:'ready',payment_id:'payment_fixture',ipn_token:'secret_fixture',checkout_url:'https://paylio.org/pay/payment_fixture',created_at:created,account_fingerprint:paylioAccount(env).fingerprint,payout_address:env.PAYLIO_PAYOUT_ADDRESS,quote};
const provider={status:'paid',forward_status:'completed',payment_id:base.payment_id,amount:'100.00',currency:'USD',paid_at:paid,pass_fee_to_customer:false};
const json=data=>new Response(JSON.stringify(data),{status:200});
function fixture({attempt=base,status=provider,ack={ok:true,transitioned:true,orderId:base.order_id,paymentId:base.payment_id,status:'paid',quote,paidAt:paid}}={}){
 const calls=[];
 const fetcher=async(input,options={})=>{
  const url=new URL(input),body=options.body?JSON.parse(options.body):undefined;calls.push({url,options,body});
  if(url.pathname==='/rest/v1/paylio_payment_attempts')return json([attempt]);
  if(url.hostname==='paylio.org'){assert.equal(url.searchParams.get('payment_id'),base.payment_id);assert.equal(options.headers.Authorization,'Bearer fixture-paylio');return json(status)}
  if(url.pathname==='/rest/v1/rpc/finalize_paylio_checkout')return json(ack);
  assert.fail('Unexpected request '+url.pathname);
 };
 return {calls,deps:{env,fetcher}};
}
test('money and checkout URL validation reject malformed amounts, external URLs and callback secrets',()=>{
 for(const value of [null,true,'',0,-1,'1.001',Infinity,{},'100001'])assert.equal(paylioCents(value),null);
 assert.equal(paylioCents('100.00'),10000);
 for(const url of ['http://paylio.org/pay/p','https://evil.test/pay/p','https://paylio.org.evil.test/pay/p','https://u:p@paylio.org/pay/p','https://paylio.org/pay/p?ipn_token=secret','https://paylio.org/api/pay'])assert.throws(()=>paylioCheckoutUrl(url));
 assert.equal(paylioCheckoutUrl(base.checkout_url),base.checkout_url);
});
test('documented provider prefill and auto parameters canonicalize without relaxing token or redirect containment',()=>{
 for(const suffix of ['?email=buyer%40example.test','?email=buyer%40example.test&auto=1','?auto=1'])
  assert.equal(paylioCheckoutUrl(base.checkout_url+suffix),base.checkout_url);
 for(const suffix of ['?ipn_token=secret','?redirect=https://evil.test','?auto=0','?auto=1&auto=1','?email=bad','?email=a%40b.test&email=c%40d.test','#token','?email=buyer%40example.test&token=secret'])
  assert.throws(()=>paylioCheckoutUrl(base.checkout_url+suffix),undefined,suffix);
 assert.equal(paylioCustomerUrl(base.checkout_url,'buyer@example.test','paypal'),base.checkout_url+'?email=buyer%40example.test&auto=1');
 assert.equal(paylioCustomerUrl(base.checkout_url+'?email=foreign%40example.test&auto=1','buyer@example.test','paypal'),base.checkout_url+'?email=buyer%40example.test&auto=1');
 assert.equal(paylioCustomerUrl(base.checkout_url,'buyer@example.test','multi'),base.checkout_url);
});
test('callback lookup is fixed to privately bound ID, verifies exact amount and final provider state',async()=>{
 const {calls,deps}=fixture();const result=await verifyPaylioAttempt(id,deps);
 assert.equal(result.transitioned,true);assert.equal(calls.length,3);
 assert.equal(calls[2].body.p_amount_cents,10000);assert.equal(calls[2].body.p_payment_id,base.payment_id);
 assert.equal(calls[2].body.p_account_fingerprint,base.account_fingerprint);
});
test('unbound legacy callback and unfinished private reservation cannot query a provider or finalize',async()=>{
 const a=fixture();await assert.rejects(verifyPaylioAttempt('INV-OLD123',a.deps));assert.equal(a.calls.length,0);
 const b=fixture({attempt:{...base,state:'reserved',payment_id:null}});await assert.rejects(verifyPaylioAttempt(id,b.deps));assert.equal(b.calls.length,1);
});
test('changed account, wrong payment, currency, amount, fee pass-through, partial payout and invalid timestamp never finalize',async()=>{
 for(const patch of [{payment_id:'another'},{currency:'EUR'},{amount:'99.99'},{pass_fee_to_customer:true},{original_amount:'99'},{status:'unpaid'},{status:'canceled'},{forward_status:'pending'},{forward_status:'failed'},{paid_at:'invalid'},{paid_at:'2000-01-01'}]){
  const f=fixture({status:{...provider,...patch}});await assert.rejects(verifyPaylioAttempt(id,f.deps));assert.equal(f.calls.filter(c=>c.body?.p_id).length,0,JSON.stringify(patch));
 }
 const f=fixture({attempt:{...base,account_fingerprint:'f'.repeat(64)}});await assert.rejects(verifyPaylioAttempt(id,f.deps));assert.equal(f.calls.length,1);
});
test('failed and incorrect database paid acknowledgements cannot claim a recorded payment',async()=>{
 for(const ack of [{ok:false},{ok:true,transitioned:true,orderId:'OTHER',paymentId:base.payment_id,status:'paid',quote},{ok:true,transitioned:true,orderId:base.order_id,paymentId:base.payment_id,status:'refunded',quote}]){
  const f=fixture({ack});await assert.rejects(verifyPaylioAttempt(id,f.deps));
 }
});
test('binding requires durable exact provider response before exposing only the URL and amount',async()=>{
 const data={status:'unpaid',amount:'100.00',payment_id:base.payment_id,ipn_token:base.ipn_token,checkout_url:base.checkout_url};
 const calls=[];const deps={env,fetcher:async(input,options)=>{calls.push(JSON.parse(options.body));return json(base)}};
 const result=await bindPaylio(base,data,deps);assert.deepEqual(result,{payment_url:base.checkout_url,verifiedAmount:100});assert.equal(calls[0].p_ipn_token,'secret_fixture');assert.equal(JSON.stringify(result).includes('secret_fixture'),false);
 const documented=await bindPaylio(base,{...data,checkout_url:base.checkout_url+'?email=buyer%40example.test&auto=1'},deps);
 assert.deepEqual(documented,result);assert.equal(calls[1].p_checkout_url,base.checkout_url);
 for(const patch of [{amount:'99'},{status:'paid'},{payment_id:''},{ipn_token:''},{currency:'EUR'},{pass_fee_to_customer:true}])await assert.rejects(bindPaylio(base,{...data,...patch},deps));
 const failed={env,fetcher:async()=>new Response('{}',{status:500})};await assert.rejects(bindPaylio(base,data,failed));
});
test('reservation binds verified owner, server quote and merchant context and verifies its acknowledgement',async()=>{
 const access={identity:{id:customer,email:quote.email},order:{id:quote.orderId}};
 let body;const deps={env,fetcher:async(input,options)=>{body=JSON.parse(options.body);return json({created:true,attempt:{...base,id:body.p_id,state:'reserved',fingerprint:body.p_fingerprint}})}};
 const result=await reservePaylio(access,quote,'',deps);assert.equal(result.created,true);assert.equal(body.p_customer_id,customer);assert.equal(body.p_amount_cents,10000);assert.deepEqual(body.p_quote,quote);
 await assert.rejects(reservePaylio(access,{...quote,storeCreditUsed:1},'',deps));
});

test('locked checkout resume matches business fields exactly and never accepts changed delivery or financial context',async()=>{
 const {paylioResumeMatchesOrder}=await import('../api/_paylio-binding.js');
 const q={...quote,automaticDiscount:0,promoDiscount:0,affiliateDiscount:0,shippingType:'standard',promoCode:'',affiliateCode:'',address:'Fixture address'};
 const a={...base,quote:q},identity={id:customer,email:quote.email},order={id:base.order_id,email:quote.email,total:100,metadata:{...q}};
 assert.equal(paylioResumeMatchesOrder(a,identity,order),true);
 for(const patch of [{total:99},{email:'foreign@example.test'},{metadata:{...q,address:'Another'}},{metadata:{...q,items:[{...q.items[0],quantity:2}]}},{metadata:{...q,shipping:0}},{metadata:{...q,affiliateCode:'OTHER'}},{metadata:{...q,storeCreditUsed:1}}])assert.equal(paylioResumeMatchesOrder(a,identity,{...order,...patch}),false);
 assert.equal(paylioResumeMatchesOrder(a,{...identity,id:'another'},order),false);
});
