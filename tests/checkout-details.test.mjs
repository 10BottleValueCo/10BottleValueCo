import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkoutDraftKey, loadCheckoutDetails, saveCheckoutDetails, clearCheckoutDetails, saveCheckoutProfile } from '../artifacts/10-bottle-value/src/checkout-details.js';
const user = { id: 'account-a', email: 'a@example.test', address: 'Saved address', firstName: 'Saved' };
const other = { id: 'account-b', email: 'b@example.test' };
const storage = () => { const entries = new Map(); return { getItem: key => entries.get(key), setItem: (key, value) => entries.set(key, value), removeItem: key => entries.delete(key) }; };
test('reload restores partial contact details and explicit erasures without needing a payment', () => {
  const store = storage();
  saveCheckoutDetails(store, user, { firstName: '', address: 'New street', address2: 'Unit 2', state: 'CA', phone: '1234567890' });
  const restored = loadCheckoutDetails(store, user);
  assert.equal(restored.firstName, ''); assert.equal(restored.address, 'New street'); assert.equal(restored.address2, 'Unit 2'); assert.equal(restored.state, 'CA');
});
test('draft cannot change identity, restore payment authority, or leak into another account', () => {
  const store = storage();
  saveCheckoutDetails(store, user, { email: 'wrong@example.test', address: 'Private', password: 'secret', paid: true, researchAccepted: true, token: 'secret' });
  const restored = loadCheckoutDetails(store, user);
  assert.equal(restored.email, user.email); assert.equal(loadCheckoutDetails(store, other).address, '');
  assert.doesNotMatch(store.getItem(checkoutDraftKey(user)), /wrong@example|secret|researchAccepted|paid/);
  clearCheckoutDetails(store, user); assert.equal(loadCheckoutDetails(store, user).address, 'Saved address');
});
test('expired, wrong-owner, future and corrupt drafts fall back to account profile', () => {
  const store = storage();
  for (const raw of ['broken', JSON.stringify({version:1,owner:other.id,savedAt:100,form:{address:'Wrong'}}), JSON.stringify({version:1,owner:user.id,savedAt:Date.now()+5000,form:{address:'Future'}})]) {
    store.setItem(checkoutDraftKey(user),raw); assert.equal(loadCheckoutDetails(store,user).address,'Saved address');
  }
  saveCheckoutDetails(store,user,{address:'Old'},1); assert.equal(loadCheckoutDetails(store,user).address,'Saved address');
});
test('storage failure does not break checkout', () => {
  const store = { getItem(){throw Error()},setItem(){throw Error()},removeItem(){throw Error()} };
  assert.equal(loadCheckoutDetails(store,user).address,'Saved address'); assert.equal(saveCheckoutDetails(store,user,{}),false);
});
test('profile write uses captured account token and only contact fields, regardless of payment failure', async () => {
  let request;
  const auth={getSession:async()=>({data:{session:{user,access_token:'account-a-token'}}})};
  assert.equal(await saveCheckoutProfile({auth,url:'https://example.test',anonKey:'public',user,form:{firstName:' Buyer ',address:'New',email:other.email,password:'secret',taxId:'sensitive',orderNotes:'once'},fetcher:async(url,options)=>{request={url,options};return{ok:true}}}),true);
  assert.equal(request.options.headers.Authorization,'Bearer account-a-token');
  const body=JSON.parse(request.options.body); assert.equal(body.data.firstName,'Buyer'); assert.equal(body.data.address,'New');
  assert.deepEqual(Object.keys(body),['data']); for(const field of ['email','password','taxId','orderNotes']) assert.equal(body.data[field],undefined);
});
test('account switch, signed-out session, network and session failures cannot save as another customer', async () => {
  let calls=0;
  for(const auth of [{getSession:async()=>({data:{session:{user:other,access_token:'b'}}})},{getSession:async()=>({data:{session:null}})},{getSession:async()=>{throw Error()}}]) {
    assert.equal(await saveCheckoutProfile({auth,user,form:{},fetcher:async()=>{calls++;return{ok:true}}}),false);
  }
  assert.equal(calls,0);
  assert.equal(await saveCheckoutProfile({auth:{getSession:async()=>({data:{session:{user,access_token:'a'}}})},user,form:{},fetcher:async()=>{throw Error()}}),false);
});
