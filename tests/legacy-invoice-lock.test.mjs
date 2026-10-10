import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reserveLegacyInvoice, bindLegacyInvoice } from '../api/_legacy-invoice-lock.js';
Object.assign(process.env, { SUPABASE_URL: 'https://lock-fixture.test', SUPABASE_SERVICE_ROLE_KEY: 'fixture' });
const row = () => ({ id:'INV-LOCKTEST',email:'buyer@example.test',user_id:'buyer-fixture',status:'checkout',total:100,metadata:{},payment_id:null,payment_provider:null });
const items=[{name:'Fixture',price:100,quantity:1}],metadata={total:100,items};
const json = body => new Response(JSON.stringify(body));
test('concurrent invoice reservations allow only one provider create owner',async t=>{
 let stored=row(),writes=0;
 t.mock.method(globalThis,'fetch',async(input,options)=>{
  const url=new URL(input);assert.equal(url.searchParams.get('metadata->>legacyInvoiceAttempt'),'is.null');
  if(url.searchParams.get('status')!==`eq.${stored.status}`)return json([]);
  writes++;stored={...stored,...JSON.parse(options.body)};return json([stored]);
 });
 const results=await Promise.allSettled([reserveLegacyInvoice(row(),'nowpayments',100,metadata,items),reserveLegacyInvoice(row(),'catalystpay',100,metadata,items)]);
 assert.equal(writes,1);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(stored.metadata.legacyInvoiceAttempt.state,'reserved');
 await assert.rejects(reserveLegacyInvoice(stored,'nowpayments',100,metadata,items),{code:'PAYMENT_RECONCILIATION_REQUIRED'});
});
test('unknown acknowledgement cannot be treated as an available payment URL or released reservation',async t=>{
 let saved;
 t.mock.method(globalThis,'fetch',async(_,options)=>{saved={...row(),...JSON.parse(options.body)};throw new Error('response lost');});
 await assert.rejects(reserveLegacyInvoice(row(),'nowpayments',100,metadata,items),{code:'PAYMENT_RECONCILIATION_REQUIRED'});
 assert.equal(saved.status,'checkout (clicked pay)');
 await assert.rejects(reserveLegacyInvoice(saved,'nowpayments',100,metadata,items),{code:'PAYMENT_RECONCILIATION_REQUIRED'});
});
test('binding requires the same private attempt and acknowledged invoice details',async t=>{
 let stored=row();let mismatch=false;
 t.mock.method(globalThis,'fetch',async(input,options)=>{
  const url=new URL(input),body=JSON.parse(options.body);
  if(body.metadata?.legacyInvoiceAttempt?.state==='ready'){
   assert.equal(url.searchParams.get('metadata->legacyInvoiceAttempt->>id'),`eq.${stored.metadata.legacyInvoiceAttempt.id}`);
   assert.equal(url.searchParams.get('metadata->legacyInvoiceAttempt->>state'),'eq.reserved');
  }
  stored={...stored,...body};return json([{...stored,...(mismatch?{email:'different@example.test'}:{})}]);
 });
 const reserved=await reserveLegacyInvoice(stored,'nowpayments',100,metadata,items);
 mismatch=true;await assert.rejects(bindLegacyInvoice(reserved,'nowpayments','invoice','https://nowpayments.io/i'),{code:'PAYMENT_RECONCILIATION_REQUIRED'});
});
