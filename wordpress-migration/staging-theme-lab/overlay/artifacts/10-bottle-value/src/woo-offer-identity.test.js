import test from 'node:test';
import assert from 'node:assert/strict';
import { uniqueWooOffers } from './woo-offer-identity.js';

const offer = (name, id, overrides = {}) => ({name, wooVariationId:id, dose:'5 mg', noteLabel:'', warehouse:'worldwide', pack:10, ...overrides});
test('canonical and historical aliases that represent the same offer are both withheld', () => {
  assert.deepEqual(uniqueWooOffers([offer('Semaglutide', 1), offer('GLP SG-1', 2)]), []);
  assert.deepEqual(uniqueWooOffers([offer('Tirzepatide', 1), offer('GLP TZ-2', 2)]), []);
  assert.deepEqual(uniqueWooOffers([offer('Retatrutide', 1), offer('GLP-3-R', 2)]), []);
  assert.deepEqual(uniqueWooOffers([offer('Cagrilintide + Semaglutide', 1), offer('Cagrilintide + GLP-1-S', 2)]), []);
});
test('same raw name and normalized dose also collide', () => {
  assert.deepEqual(uniqueWooOffers([offer('Semaglutide', 1), offer('semaglutide', 2, {dose:'5mg'})]), []);
});
test('different warehouse, pack, formulation or dose stays independently selectable', () => {
  const rows = [offer('GLP SG-1', 1), offer('Semaglutide', 2, {warehouse:'us'}), offer('GLP-1-S', 3, {pack:5}), offer('Semaglutide', 4, {noteLabel:'with/d'}), offer('Semaglutide', 5, {dose:'10 mg'})];
  assert.deepEqual(uniqueWooOffers(rows).map(r => r.wooVariationId), [1,2,3,4,5]);
  assert.equal(uniqueWooOffers(rows)[2].vials, 5);
});
test('duplicate offers are withheld without removing other dimensions or mutating input', () => {
  const rows=[offer('Semaglutide',1),offer('GLP SG-1',2),offer('GLP SG-1',3,{warehouse:'us'})];
  const original=structuredClone(rows);
  assert.deepEqual(uniqueWooOffers(rows).map(r=>r.wooVariationId),[3]);assert.deepEqual(rows,original);
});
test('unsupported packs and malformed rows do not become offers', () => {
  assert.deepEqual(uniqueWooOffers(null),[]);
  assert.deepEqual(uniqueWooOffers([null,offer('Semaglutide',1,{pack:2})]),[]);
});
