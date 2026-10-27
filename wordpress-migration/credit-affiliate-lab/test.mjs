import assert from 'node:assert/strict';
import {plan} from './planner.mjs';
const time='2026-10-26T15:12:00.000Z';
const fixture={synthetic:true,currency:'USD',
 credits:[{sourceId:'sample-credit-1',customerId:'sample-customer-1',email:'sample-person@example.invalid',amount:'41.00',updatedAt:time}],
 creditLedger:[{sourceId:'sample-ledger-1',creditId:'sample-credit-1',orderId:'sample-order-1',amount:'9.00',provider:'sample-provider',state:'held',createdAt:time,consumedAt:null},{sourceId:'sample-ledger-2',creditId:'sample-credit-1',orderId:'sample-order-2',amount:'2.50',provider:'sample-provider',state:'consumed',createdAt:time,consumedAt:time}],
 creditAdjustments:[{sourceId:'sample-adjust-1',creditId:'sample-credit-1',mode:'increase',amount:'5.00',before:'30.00',after:'35.00',note:'sample-note',createdAt:time}],
 affiliates:[{sourceId:'sample-affiliate-1',customerId:'sample-customer-1',email:'sample-person@example.invalid',affiliateCode:'SAMPLE-CODE',active:true,createdAt:time}],
 attributions:[{sourceId:'sample-attribution-1',affiliateId:'sample-affiliate-1',orderId:'sample-order-1',commissionAmount:'3.20',shippingType:'sample-warehouse',createdAt:time}],
 payouts:[{sourceId:'sample-payout-1',affiliateId:'sample-affiliate-1',amount:'2.10',note:'sample-old-payout',createdAt:time}]
};
const links={customers:{'sample-customer-1':'sample-wp-user-1'},orders:{'sample-order-1':'sample-wc-order-1','sample-order-2':'sample-wc-order-2'}};
const copy=x=>structuredClone(x);let count=0;
function test(name,fn){fn(); console.log(`ok ${++count} - ${name}`)}
function rejects(name,edit,ctx=fixture){test(name,()=>{const f=copy(ctx),l=copy(links);edit(f,l);assert.throws(()=>plan(f,l))})}
const first=plan(fixture,links);
test('dry run returns seven inactive historical snapshots',()=>{assert.equal(first.changes.length,7);assert.equal(first.reconciliation.creditsActivated,false);assert.equal(first.reconciliation.payoutsInitiated,false)});
test('separate balances and held history are not netted twice',()=>{assert.equal(first.reconciliation.creditBalanceCents,'4100');assert.equal(first.reconciliation.heldCents,'900');assert.equal(first.reconciliation.consumedCents,'250');assert.equal(first.reconciliation.creditBalancesAreNotAdjustedByLedger,true)});
test('historical payout ID and exact amount preserved without execution',()=>{assert.equal(first.proposedState.entries['payouts:sample-payout-1'].snapshot.record.amount,'2.10');assert.equal(first.reconciliation.historicalPayoutCents,'210')});
test('external customer and order relationships preserved',()=>{assert.equal(first.proposedState.entries['credits:sample-credit-1'].snapshot.links.customer,'sample-wp-user-1');assert.equal(first.proposedState.entries['attributions:sample-attribution-1'].snapshot.links.order,'sample-wc-order-1')});
test('repeat is idempotent with no creates',()=>{const again=plan(fixture,links,first.proposedState);assert.equal(again.changes.length,0);assert.equal(again.unchanged.length,7);assert.deepEqual(again.proposedState,first.proposedState)});
test('changed balance conflicts before proposed state is returned',()=>{const f=copy(fixture);f.credits[0].amount='42.00';assert.throws(()=>plan(f,links,first.proposedState),/conflict/);assert.equal(first.proposedState.entries['credits:sample-credit-1'].snapshot.record.amount,'41.00')});
test('changed historical payout amount conflicts',()=>{const f=copy(fixture);f.payouts[0].amount='2.11';assert.throws(()=>plan(f,links,first.proposedState),/conflict/)});
test('changed external customer mapping conflicts',()=>{const l=copy(links);l.customers['sample-customer-1']='sample-wp-user-2';assert.throws(()=>plan(fixture,l,first.proposedState),/conflict/)});
test('missing source rows never delete prior snapshots',()=>{const f=copy(fixture);f.payouts=[];const a=plan(f,links,first.proposedState);assert.ok(a.proposedState.entries['payouts:sample-payout-1'])});
test('retained account prevents duplicate recreation in a later batch',()=>{const f=copy(fixture);f.credits[0].sourceId='sample-new-credit';f.creditLedger=[];f.creditAdjustments=[];assert.throws(()=>plan(f,links,first.proposedState),/duplicate/)});
test('retained payout remains in accumulated reconciliation',()=>{const f=copy(fixture);f.payouts=[];assert.equal(plan(f,links,first.proposedState).reconciliation.historicalPayoutCents,'210')});
test('different prior currency refused',()=>{const f=copy(fixture);f.currency='EUR';assert.throws(()=>plan(f,links,first.proposedState),/currency/)});
test('tampered prior snapshots refused',()=>{const p=copy(first.proposedState);p.entries['payouts:sample-payout-1'].snapshot.record.amount='9.99';assert.throws(()=>plan(fixture,links,p),/untrusted prior state/)});
rejects('duplicate source IDs refused',f=>f.payouts.push(copy(f.payouts[0])));
rejects('same customer cannot receive two credit accounts',f=>f.credits.push({...copy(f.credits[0]),sourceId:'sample-credit-2',email:'sample-other@example.invalid'}));
rejects('same credit email cannot map twice',f=>f.credits.push({...copy(f.credits[0]),sourceId:'sample-credit-2'}));
rejects('duplicate affiliate code refused',f=>f.affiliates.push({...copy(f.affiliates[0]),sourceId:'sample-affiliate-2'}));
rejects('ledger without account refused',f=>f.creditLedger[0].creditId='sample-missing');
rejects('unmapped credit customer refused',(f,l)=>delete l.customers['sample-customer-1']);
rejects('unmapped ledger order refused',(f,l)=>delete l.orders['sample-order-1']);
rejects('unmapped attribution order refused',(f,l)=>{f.creditLedger=[];delete l.orders['sample-order-1']});
rejects('payout without affiliate refused',f=>f.payouts[0].affiliateId='sample-missing');
rejects('same order cannot reserve credit twice',f=>f.creditLedger[1].orderId='sample-order-1');
rejects('duplicate affiliate attribution refused',f=>f.attributions.push({...copy(f.attributions[0]),sourceId:'sample-attribution-2'}));
rejects('fractional cents refused',f=>f.credits[0].amount='1.001');
rejects('numeric floats refused',f=>f.payouts[0].amount=2.10);
rejects('negative amounts refused',f=>f.credits[0].amount='-1.00');
rejects('scientific notation refused',f=>f.credits[0].amount='1e3');
rejects('currency must be a string',f=>f.currency=['USD']);
rejects('currency must be explicit',f=>f.currency='');
rejects('unknown hold status not guessed',f=>f.creditLedger[0].state='pending');
rejects('held item cannot have consumption timestamp',f=>f.creditLedger[0].consumedAt=time);
rejects('consumed item requires timestamp',f=>f.creditLedger[1].consumedAt=null);
rejects('invalid timestamp refused',f=>f.payouts[0].createdAt='2026-02-31T00:00:00.000Z');
rejects('real looking email refused',f=>f.credits[0].email='real@domain.com');
rejects('real looking source ID refused',f=>f.payouts[0].sourceId='72');
rejects('nonsynthetic input refused',f=>f.synthetic=false);
rejects('unrecognized extra data refused',f=>f.payouts[0].unexpected='customer-data');
rejects('two sources cannot map to same destination',(f,l)=>l.customers['sample-customer-2']='sample-wp-user-1');
test('large monetary cents remain exact',()=>{const f=copy(fixture);f.credits[0].amount='9999999999999.99';assert.equal(plan(f,links).reconciliation.creditBalanceCents,'999999999999999')});
test('inputs and existing state not mutated',()=>{const f=copy(fixture), l=copy(links), p=copy(first.proposedState);plan(f,l,p);assert.deepEqual(f,fixture);assert.deepEqual(l,links);assert.deepEqual(p,first.proposedState)});
console.log(`${count} synthetic credit/affiliate checks passed`);
