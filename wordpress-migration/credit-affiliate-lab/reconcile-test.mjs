import assert from 'node:assert/strict';
import { reconcile } from './reconcile.mjs';

const time='2026-10-26T15:12:00.000Z';
const fixture={synthetic:true,currency:'USD',
  credits:[{sourceId:'sample-credit-1',customerId:'sample-customer-1',email:'sample-person@example.invalid',amount:'41.00',updatedAt:time}],
  creditLedger:[{sourceId:'sample-ledger-1',creditId:'sample-credit-1',orderId:'sample-order-1',amount:'9.00',provider:'sample-provider',state:'held',createdAt:time,consumedAt:null}],
  creditAdjustments:[{sourceId:'sample-adjustment-1',creditId:'sample-credit-1',mode:'increase',amount:'5.00',before:'30.00',after:'35.00',note:'sample-note',createdAt:time}],
  affiliates:[{sourceId:'sample-affiliate-1',customerId:'sample-customer-1',email:'sample-person@example.invalid',affiliateCode:'SAMPLE-CODE',active:true,createdAt:time}],
  attributions:[{sourceId:'sample-attribution-1',affiliateId:'sample-affiliate-1',orderId:'sample-order-1',commissionAmount:'3.20',shippingType:'sample-warehouse',createdAt:time}],
  payouts:[{sourceId:'sample-payout-1',affiliateId:'sample-affiliate-1',amount:'2.10',note:'sample-old-payout',createdAt:time},
    {sourceId:'sample-payout-2',affiliateId:'sample-affiliate-1',amount:'3.10',note:null,createdAt:time}]};
const mappings={customers:{'sample-customer-1':'sample-wp-user-1'},orders:{'sample-order-1':'sample-wc-order-1'}};
const capture={synthetic:true,checkpoint:'sample-checkpoint-1',complete:true,fixture,mappings};
const copy = x => structuredClone(x);
let count=0;
function test(name,fn){fn();console.log(`ok ${++count} - ${name}`)}
test('identical full captures match, with unadjusted held balance',()=>{const r=reconcile(copy(capture),copy(capture));assert.equal(r.matched,true);assert.equal(r.sourceTotals.creditBalanceCents,'4100');assert.equal(r.sourceTotals.heldCents,'900')});
test('missing historical payout detected',()=>{const d=copy(capture);d.fixture.payouts.pop();const r=reconcile(capture,d);assert.equal(r.matched,false);assert.deepEqual(r.records.payouts.missing,['payouts:sample-payout-2'])});
test('extra historical payout detected',()=>{const d=copy(capture);d.fixture.payouts.push({...d.fixture.payouts[0],sourceId:'sample-payout-3'});assert.deepEqual(reconcile(capture,d).records.payouts.extra,['payouts:sample-payout-3'])});
test('swapped amounts fail despite matching total',()=>{const d=copy(capture);d.fixture.payouts[0].amount='3.10';d.fixture.payouts[1].amount='2.10';const r=reconcile(capture,d);assert.equal(r.sourceTotals.historicalPayoutCents,r.destinationTotals.historicalPayoutCents);assert.equal(r.records.payouts.changed.length,2);assert.equal(r.matched,false)});
test('incorrect destination customer mapping changes affected records',()=>{const d=copy(capture);d.mappings.customers['sample-customer-1']='sample-wp-user-2';const r=reconcile(capture,d);assert.equal(r.matched,false);assert.equal(r.records.credits.changed.length,1);assert.equal(r.records.affiliates.changed.length,1)});
test('wrong held state is detected even at the same amount',()=>{const d=copy(capture);d.fixture.creditLedger[0].state='consumed';d.fixture.creditLedger[0].consumedAt=time;const r=reconcile(capture,d);assert.equal(r.matched,false);assert.equal(r.records.creditLedger.changed.length,1)});
test('incomplete capture cannot pass',()=>{const d=copy(capture);d.complete=false;const r=reconcile(capture,d);assert.equal(r.comparable,false);assert.equal(r.matched,false)});
test('different checkpoints cannot pass',()=>{const d=copy(capture);d.checkpoint='sample-checkpoint-2';assert.equal(reconcile(capture,d).matched,false)});
test('different currency rejected',()=>{const d=copy(capture);d.fixture.currency='EUR';assert.throws(()=>reconcile(capture,d),/currency/)});
test('unsupported fields and duplicate identities rejected',()=>{const d=copy(capture);d.fixture.payouts.push(copy(d.fixture.payouts[0]));assert.throws(()=>reconcile(capture,d),/duplicate/)});
test('broken relationships rejected instead of accepted',()=>{const d=copy(capture);d.fixture.affiliates=[];assert.throws(()=>reconcile(capture,d),/missing affiliate/)});
test('nonsynthetic data and arbitrary checkpoint rejected',()=>{const d=copy(capture);d.synthetic=false;assert.throws(()=>reconcile(capture,d),/synthetic/);d.synthetic=true;d.checkpoint='actual-id';assert.throws(()=>reconcile(capture,d),/synthetic/)});
test('repeated runs are identical and do not mutate either capture',()=>{const a=copy(capture),b=copy(capture);assert.deepEqual(reconcile(a,b),reconcile(a,b));assert.deepEqual(a,capture);assert.deepEqual(b,capture)});
console.log(`${count} reconciliation checks passed`);
