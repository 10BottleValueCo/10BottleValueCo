import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import test from 'node:test';
import { adjustStoreCredit } from '../artifacts/10-bottle-value/src/store-credit-admin-client.js';
const fixture = () => {
  const values = new Map(); const calls = [];
  const input = { email: ' ADMIN-CUSTOMER@example.test ', mode: 'add', amount: '12.50', note: ' Test note ', cryptoApi: webcrypto,
    storage: { getItem: k => values.get(k), setItem: (k,v) => values.set(k,v), removeItem: k => values.delete(k) },
    supabase: { rpc: async (name, p) => { calls.push({ name, p }); return { data: { ok: true, requestId: p.p_request_id, email: p.p_email, mode: p.p_mode,
      amountCents: p.p_amount_cents, balanceCents: 2250, note: p.p_note || null, replayed: false } }; } } };
  return { input, values, calls };
};
test('admin adjustment sends a delta intent and accepts only the canonical acknowledged balance', async () => {
  const f=fixture(); const result=await adjustStoreCredit(f.input);
  assert.equal(f.calls[0].name, 'adjust_store_credit'); assert.equal(f.calls[0].p.p_amount_cents, 1250);
  assert.equal(f.calls[0].p.p_email, 'admin-customer@example.test'); assert.equal(result.balance, 22.5);
  assert.equal(f.values.size, 0); assert.equal(f.calls[0].p.balance, undefined);
});
test('uncertain admin response retains the same request ID and blocks different inputs', async () => {
  const f=fixture(); const rpc=f.input.supabase.rpc; let first=true;
  f.input.supabase.rpc=async (...args)=>{ const r=await rpc(...args); if(first){first=false;throw Error('lost response');}r.data.replayed=true;return r; };
  await assert.rejects(adjustStoreCredit(f.input));
  const stored=JSON.stringify([...f.values.values()]); assert.doesNotMatch(stored,/admin-customer|Test note|1250|2250/);
  await assert.rejects(adjustStoreCredit({...f.input,amount:'15'})); assert.equal(f.calls.length,1);
  assert.equal((await adjustStoreCredit(f.input)).replayed,true);
  assert.equal(f.calls[0].p.p_request_id,f.calls[1].p.p_request_id);
});
test('tampered adjustment acknowledgements never clear the recovery key', async () => {
  for(const change of [{balanceCents:-1},{balanceCents:1.5},{requestId:'other'},{email:'other@example.test'},{mode:'set'},{amountCents:1},{note:'other'},{replayed:'yes'}]){
    const f=fixture();const rpc=f.input.supabase.rpc;
    f.input.supabase.rpc=async(...args)=>{const result=await rpc(...args);Object.assign(result.data,change);return result;};
    await assert.rejects(adjustStoreCredit(f.input));assert.equal(f.values.size,1);
  }
});
test('only explicit pre-mutation business rejection clears the adjustment key', async () => {
  const f=fixture();f.input.supabase.rpc=async()=>({data:{ok:false,error:'STORE_CREDIT_RESERVATION_PENDING'}});
  await assert.rejects(adjustStoreCredit(f.input),/pending payment reservation/);assert.equal(f.values.size,0);
  f.input.supabase.rpc=async()=>({error:{message:'transport'}});
  await assert.rejects(adjustStoreCredit(f.input));assert.equal(f.values.size,1);
});
test('set, add and subtract preserve entered semantics without allowing subcent or negative set amounts', async () => {
  for(const mode of ['set','add','subtract']){
    const f=fixture();await adjustStoreCredit({...f.input,mode,amount:mode==='set'?'0':mode==='subtract'?'-12.50':'12.50'});
    assert.equal(f.calls[0].p.p_mode,mode);assert.equal(f.calls[0].p.p_amount_cents,mode==='set'?0:1250);
  }
  for(const amount of ['','NaN','1.001','-1']){
    const f=fixture();await assert.rejects(adjustStoreCredit({...f.input,mode:'set',amount}));assert.equal(f.calls.length,0);
  }
});
test('negative Add cannot reverse a requested deduction into an increase', async () => {
  for (const mode of ['add','set']) {
    const f=fixture(); await assert.rejects(adjustStoreCredit({...f.input,mode,amount:'-10'}),/Choose Subtract/);
    assert.equal(f.calls.length,0); assert.equal(f.values.size,0);
  }
});
test('an empty note accepts only the canonical null receipt and clears recovery after success', async () => {
  const f=fixture(); const result=await adjustStoreCredit({...f.input,note:'   '});
  assert.equal(result.note,''); assert.equal(f.values.size,0);
  const rejected=fixture(); rejected.input.supabase.rpc=async()=>({data:{ok:false,error:'CREDIT_ADJUSTMENT_INVALID'}});
  await assert.rejects(adjustStoreCredit(rejected.input),/Check the credit adjustment/); assert.equal(rejected.values.size,0);
});
