import {test} from 'node:test';
import assert from 'node:assert/strict';
import {toCents,sumLineAmounts,discountAmount,addAmounts} from '../shared/checkout-money.js';
test('shared discount rounding agrees with integer basis-point arithmetic on cent and shipping boundaries',()=>{
 for(const bps of [250,500,1000,1500,2000]) for(let cents=1;cents<=100000;cents++){
  const expected=Number((BigInt(cents)*BigInt(bps)+5000n)/10000n);
  assert.equal(toCents(discountAmount(cents/100,bps/10000)),expected,`${cents} cents at ${bps} bps`);
 }
});
test('line totals preserve exact cents, quantity and shipping thresholds',()=>{
 const cart=[{price:33.33,quantity:2},{price:33.34,qty:1}];
 assert.equal(sumLineAmounts(cart),100);assert.equal(addAmounts(sumLineAmounts(cart),200),300);
 assert.equal(addAmounts(sumLineAmounts(cart),450),550);
 assert.equal(sumLineAmounts([{price:9.99,quantity:11}]),109.89);
 assert.equal(discountAmount(100.05,.1),10.01);assert.equal(discountAmount(100.1,.05),5.01);assert.equal(discountAmount(100.2,.025),2.51);
 assert.equal(addAmounts(347,-17.35,-8.24),321.41);
});
