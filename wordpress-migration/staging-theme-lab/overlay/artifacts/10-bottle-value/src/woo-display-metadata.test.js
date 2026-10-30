import test from 'node:test';
import assert from 'node:assert/strict';
import {mergeWooDisplayMetadata} from './woo-display-metadata.js';
const legacy={total:'100 mg total',note:'10 vial kit (10 vials included)',name:'Synthetic',dose:'10 mg'};
const offer=(pack)=>({name:'Synthetic',dose:'10 mg',pack,price:pack*10,wooVariationId:100+pack});
test('ten-pack keeps matching historical display metadata',()=>{const p=mergeWooDisplayMetadata(legacy,offer(10));assert.equal(p.total,'100 mg total');assert.equal(p.note,'10 vial kit (10 vials included)');});
test('smaller packs never inherit ten-pack totals or notes',()=>{for(const pack of [1,5]){const p=mergeWooDisplayMetadata(legacy,offer(pack));assert.equal(p.total,'');assert.equal(p.note,`${pack} vial kit (${pack} ${pack===1?'vial':'vials'} included)`);assert.equal(p.wooVariationId,100+pack);}});
test('missing legacy totals remain unknown',()=>{assert.equal(mergeWooDisplayMetadata({},offer(10)).total,'');});
test('a known non-ten legacy record is not treated as a ten pack',()=>{assert.equal(mergeWooDisplayMetadata({...legacy,vials:5},offer(10)).total,'');});
