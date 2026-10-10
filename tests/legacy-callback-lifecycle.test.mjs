process.env.RESEND_API_KEY = 'synthetic-mail-key';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
process.env.SUPABASE_URL='https://fixture.test';
process.env.SUPABASE_SERVICE_ROLE_KEY='synthetic-service';
process.env.CATALYSTPAY_WEBHOOK_SECRET='synthetic-callback';
const {processNowPaymentsStatus}=await import('../api/_nowpayments-shared.js');
const catalyst=(await import('../api/catalystpay-webhook.js')).default;
const id='INV-LIFECYCLE2',email='buyer@example.test';
const json=(body,status=200)=>new Response(JSON.stringify(body),{status});
const response=()=>({statusCode:200,setHeader(){},status(n){this.statusCode=n;return this},json(body){this.body=body;return this}});
function fixture(t,{provider,status='checkout',patchMode='ok',emailStatus=200,paymentId=null,providerName=null,metadata={}}={}){
 const expectedId=provider==='nowpayments'?'1234':'invoice_fixture';
 const expectedProvider=provider==='nowpayments'?'NOWPayments BTC':'CatalystPay BTC';
 const row={id,email,status,total:100,payment_id:paymentId,payment_provider:providerName,metadata:{total:100,subtotal:100,storeCreditUsed:0,affiliateCode:'FIXTURE',promoCode:'TEST',...(provider==='catalystpay'?{catalystpay_invoice_id:expectedId}:{}),...metadata},items:[]};
 const calls=[];
 t.mock.method(console,'error',()=>{});
 t.mock.method(globalThis,'fetch',async(input,options={})=>{
  const url=new URL(input),method=options.method||'GET',body=options.body?JSON.parse(options.body):null;calls.push({url,method,body});
  if(url.pathname==='/rest/v1/orders'&&method==='GET')return json([row]);
  if(url.pathname==='/rest/v1/orders'&&method==='PATCH'&&body?.status==='paid'){
   assert.equal(url.searchParams.get('status'),`eq.${status}`);assert.equal(url.searchParams.get('email'),`eq.${email}`);
   assert.equal(url.searchParams.get('payment_id'),paymentId===null?'is.null':`eq.${paymentId}`);
   if(patchMode==='empty')return json([]);
   if(patchMode==='http')return json({},503);
   if(patchMode==='wrong')return json([{...row,...body,id:'INV-OTHER'}]);
   Object.assign(row,body);return json([row]);
  }
  if(url.pathname==='/emails')return json({ok:emailStatus===200},emailStatus);
  if(method==='GET')return json([]);
  return json({ok:true});
 });
 const invoke=async(overrides={})=>{
  if(provider==='nowpayments')return processNowPaymentsStatus({payment_status:'finished',order_id:id,payment_id:expectedId,price_amount:100,price_currency:'usd',pay_currency:'btc',...overrides},{providerVerified:true});
  const body=JSON.stringify({type:'settled',invoiceId:expectedId,metadata:{OrderId:id}}),res=response();
  await catalyst({method:'POST',headers:{'x-signature':createHmac('sha256','synthetic-callback').update(body).digest('hex')},body},res);
  if(res.statusCode>=400)throw Object.assign(new Error(res.body.code),{status:res.statusCode});return res.body;
 };
 return {row,calls,invoke,expectedId,expectedProvider};
}
for(const provider of ['nowpayments','catalystpay']){
 for(const status of ['refunded','cancelled','canceled','unknown'])test(`${provider}: terminal ${status} is preserved without any write`,async t=>{
  const f=fixture(t,{provider,status});await assert.rejects(f.invoke());assert.equal(f.row.status,status);assert.equal(f.calls.some(c=>c.method!=='GET'),false);
 });
 for(const patchMode of ['empty','http','wrong'])test(`${provider}: failed ${patchMode} acknowledgement blocks receipts and affiliate/promo writes with zero credit`,async t=>{
  const f=fixture(t,{provider,patchMode});await assert.rejects(f.invoke());assert.equal(f.calls.some(c=>c.url.pathname==='/emails'||(c.method!=='GET'&&!c.url.pathname.endsWith('/orders'))),false);
 });
 test(`${provider}: paid state is acknowledged before any receipt or ancillary write`,async t=>{
  const f=fixture(t,{provider});const result=await f.invoke();assert.equal(result.dbMarkedPaid,true);const paid=f.calls.findIndex(c=>c.body?.status==='paid');const receipt=f.calls.findIndex(c=>c.url.pathname==='/emails');assert.ok(paid>=0&&receipt>paid);
 });
 test(`${provider}: rejected receipt is not marked as sent`,async t=>{
  const f=fixture(t,{provider,emailStatus:503});await f.invoke();assert.equal(f.calls.some(c=>c.body?.metadata?.confirmationEmailSentAt),false);
 });
 for(const status of ['paid','done','shipped','delivered'])test(`${provider}: bound ${status} replay preserves state and creates no effects`,async t=>{
  const expectedId=provider==='nowpayments'?'1234':'invoice_fixture',expectedProvider=provider==='nowpayments'?'NOWPayments BTC':'CatalystPay BTC';
  const f=fixture(t,{provider,status,paymentId:expectedId,providerName:expectedProvider});assert.equal((await f.invoke()).dbMarkedPaid,true);assert.equal(f.row.status,status);assert.equal(f.calls.some(c=>c.method!=='GET'),false);
 });
 test(`${provider}: mismatched stored provider binding is rejected`,async t=>{
  const f=fixture(t,{provider,paymentId:'another-payment'});await assert.rejects(f.invoke());assert.equal(f.calls.some(c=>c.method!=='GET'),false);
 });
}
for(const overrides of [{price_amount:99},{price_currency:'eur'},{order_description:'{"order_id":"INV-OTHER"}'}])test(`NOWPayments exact order/quote mismatch blocks paid transition ${JSON.stringify(overrides)}`,async t=>{
 const f=fixture(t,{provider:'nowpayments'});await assert.rejects(f.invoke(overrides));assert.equal(f.calls.some(c=>c.method!=='GET'),false);
});

test('Catalyst: signed callback must match saved invoice metadata',async t=>{
 const f=fixture(t,{provider:'catalystpay',metadata:{catalystpay_invoice_id:'newer-invoice'}});
 await assert.rejects(f.invoke());assert.equal(f.calls.some(c=>c.method!=='GET'),false);
});
