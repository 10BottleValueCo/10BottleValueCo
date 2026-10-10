import { test } from 'node:test';
import assert from 'node:assert/strict';
import { settlementAffiliate, signSettlementAffiliate } from '../api/_settlement-affiliate.js';
Object.assign(process.env,{SUPABASE_URL:'https://settlement.test',SUPABASE_SERVICE_ROLE_KEY:'synthetic-secret',MERIT_AFFILIATE_RULES_JSON:JSON.stringify({version:'v2',source:'fixture',status:'operator_report',currency:'USD',unit:'basis_points',effectiveFrom:'2026-01-01',firstOrderDiscountBps:500,commissionBps:1000,approvalMode:'active_registry'})});
const metadata={affiliateQuoteVersion:'server-referral-v1',affiliateAttributionCode:'PARTNER',affiliateOwnerEmail:'owner@example.test',affiliateCommission:10,affiliateRuleVersion:'v2'};
const email='buyer@example.test',orderId='INV-SIGNED',subtotal=100;
test('signed commission survives later registry changes without exposing a signing key',async t=>{
 const signed={...metadata,affiliateQuoteProof:signSettlementAffiliate(metadata,email,subtotal,orderId)};
 t.mock.method(globalThis,'fetch',()=>assert.fail('Frozen server commission does not consult a changed registry'));
 assert.deepEqual(await settlementAffiliate(signed,email,subtotal,orderId),{code:'PARTNER',ownerEmail:'owner@example.test',commission:10});
 assert.equal(signed.affiliateQuoteProof.includes('synthetic-secret'),false);
});
test('old browser-writable marker and copied or tampered proof cannot authorize commission',async t=>{
 t.mock.method(console,'error',()=>{});
 t.mock.method(globalThis,'fetch',async()=>new Response('[]'));
 const signed={...metadata,affiliateQuoteProof:signSettlementAffiliate(metadata,email,subtotal,orderId)};
 for(const altered of [metadata,{...signed,affiliateAttributionCode:'OTHER'},{...signed,affiliateOwnerEmail:'attacker@example.test'},{...signed,affiliateCommission:9},{...signed,affiliateRuleVersion:'v1'}])
  assert.deepEqual(await settlementAffiliate(altered,email,subtotal,orderId),{code:'',ownerEmail:'',commission:0});
 for(const [owner,amount,id] of [['another@example.test',100,orderId],[email,99,orderId],[email,100,'INV-OTHER']])
  assert.deepEqual(await settlementAffiliate(signed,owner,amount,id),{code:'',ownerEmail:'',commission:0});
});

test('historical mutable orders cannot turn a fake subtotal into commission; protected invoices retain verified attribution',async t=>{
 t.mock.method(console,'error',()=>{});let reads=0;
 t.mock.method(globalThis,'fetch',async input=>{reads++;return new Response(JSON.stringify(new URL(input).pathname.endsWith('/affiliates')?[{code:'PARTNER',email:'owner@example.test',active:true}]:[]));});
 for (const status of ['pending','checkout','wire_pending'])
  assert.deepEqual(await settlementAffiliate({affiliateCode:'PARTNER'},email,100000,orderId,status),{code:'',ownerEmail:'',commission:0});
 assert.equal(reads,0);
 assert.deepEqual(await settlementAffiliate({affiliateCode:'PARTNER'},email,100,orderId,'checkout (clicked pay)'),{code:'PARTNER',ownerEmail:'owner@example.test',commission:10});
});
