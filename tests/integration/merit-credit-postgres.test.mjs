import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { test } from 'node:test';
const modulePath=process.env.MERIT_SQL_TEST_PGLITE;
test('Credit + Merit atomic reservation, replay and balance ownership', {skip:!modulePath}, async t=>{
 const {PGlite}=await import(pathToFileURL(modulePath).href); const db=new PGlite(); t.after(()=>db.close());
 await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
 CREATE SCHEMA auth;
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb->>'sub','')::uuid $$;
 CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,email_confirmed_at timestamptz);
 CREATE TABLE public.orders(id text PRIMARY KEY,email text,status text,total numeric,metadata jsonb,created_at timestamptz DEFAULT now(),items jsonb,payment_provider text,payment_id text,paid_at timestamptz,affiliate_commission_adjustment numeric);
 CREATE TABLE public.user_promos(id text PRIMARY KEY,email text,code text,rate numeric,used boolean);
 CREATE TABLE public.user_credits(email text PRIMARY KEY,amount numeric,note text,updated_at timestamptz DEFAULT now());
 GRANT USAGE ON SCHEMA public TO anon,authenticated,service_role;
 GRANT ALL ON public.orders,public.user_promos,public.user_credits TO anon,authenticated,service_role;
 ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
 CREATE POLICY all_orders ON public.orders FOR ALL TO PUBLIC USING(true) WITH CHECK(true);`);
 for(const file of ['20261008180000_merit_checkout.sql','20261008220000_merit_store_credit.sql']) await db.exec(await readFile(new URL('../../supabase/migrations/'+file,import.meta.url),'utf8'));
 const customer='a0000000-0000-4000-8000-000000000001',support='a0000000-0000-4000-8000-000000000002';
 await db.query('INSERT INTO auth.users VALUES($1,$2,now()),($3,$4,now())',[customer,'buyer@example.test',support,'support@10bottlevalue.co']);
 const run=(fn,role='service_role',sub=customer)=>db.transaction(async tx=>{await tx.exec(`SET LOCAL ROLE ${role}`);await tx.query("SELECT set_config('request.jwt.claims',$1,true)",[JSON.stringify({sub,role,email:'support@10bottlevalue.co'})]);return fn(tx);});
 const rpc=(name,args,role='service_role',sub=customer)=>run(async tx=>(await tx.query(`SELECT public.${name}(${args.map((_,i)=>'$'+(i+1)).join(',')}) r`,args)).rows[0].r,role,sub);
 const balance=async(email='buyer@example.test')=>Number((await db.query('SELECT amount FROM user_credits WHERE email=$1',[email])).rows[0]?.amount);
 const setBalance=amount=>db.query("INSERT INTO user_credits(email,amount) VALUES('buyer@example.test',$1) ON CONFLICT(email) DO UPDATE SET amount=excluded.amount",[amount]);
 const seedLegacy=(id,email,status,credit)=>db.transaction(async tx=>{
  await tx.exec('ALTER TABLE orders DISABLE TRIGGER store_credit_order_write_guard');
  await tx.query('INSERT INTO orders(id,email,status,total,metadata) VALUES($1,$2,$3,100,$4)',[id,email,status,{storeCreditUsed:credit}]);
  await tx.exec('ALTER TABLE orders ENABLE TRIGGER store_credit_order_write_guard');
 });
 const reconcileLegacyFixture=(id,cents,provider)=>db.transaction(async tx=>{
  // Synthetic already-verified historical reconciliation, never an application RPC.
  await tx.query("UPDATE user_credits SET amount=amount-$1/100.0 WHERE email='buyer@example.test'",[cents]);
  await tx.query("INSERT INTO store_credit_ledger(order_id,email,credit_cents,provider,state,snapshot,consumed_at) SELECT id,email,$2,$3,'consumed',metadata,now() FROM orders WHERE id=$1",[id,cents,provider]);
 });
 const quote=(base=17899)=>{const fee=Math.round(base*.03); return [randomUUID(),'buyer@example.test',customer,'a'.repeat(64),base+fee,'usd',{email:'buyer@example.test',total:(base+fee)/100,subtotal:139,shipping:39.99,customerCardSurcharge:fee/100,customerCardSurchargeBps:300,storeCreditUsed:0,paymentRules:{customerCardSurcharge:{rate:300}},costSnapshot:null,items:[{name:'Fixture',dose:'10 mg',price:139,quantity:1}]},'acct_fixture',false,null];};
 const reserve=q=>rpc('reserve_merit_checkout_with_credit',q);
 const bind=a=>rpc('bind_merit_checkout',[a.id,'pi_'+a.id.replaceAll('-',''),a.expected_account,false,'pi_'+a.id.replaceAll('-','')+'_secret_fixture','pk_test_fixture']);
 const finalize=a=>rpc('finalize_merit_checkout',[a.id,a.intent_id,a.amount_cents,a.currency,a.email,a.order_id,a.expected_account,false]);
 const full=(amount=120)=>{const id='INV-'+randomUUID().replaceAll('-','').toUpperCase();return ['buyer@example.test',{id,email:'buyer@example.test',status:'paid',paymentProvider:'StoreCredit',checkoutFingerprint:'b'.repeat(64),storeCreditUsed:amount,total:0,items:[{name:'Fixture'}]},amount,null,customer];};
 let q,a,ready;
 await t.test('$178.99 base minus $178 credit charges $1.02 including 3 cents surcharge',async()=>{
  await setBalance(178);q=quote();const r=await reserve(q);assert.equal(r.ok,true);assert.equal(r.created,true);a=r.attempt;
  assert.equal(a.amount_cents,102);assert.equal(a.credit_reserved_cents,17800);assert.equal(a.snapshot.storeCreditUsed,178);assert.equal(a.snapshot.cardBaseAmountCents,99);assert.equal(a.snapshot.customerCardSurcharge,.03);assert.equal(a.snapshot.total,1.02);assert.deepEqual(a.credit_request_snapshot,q[6]);assert.equal(await balance(),0);
  const row=(await db.query('SELECT * FROM orders WHERE id=$1',[a.order_id])).rows[0];assert.equal(Number(row.total),1.02);assert.equal(row.metadata.paymentRules,undefined);
 });
 await t.test('same key retains held amount with zero current balance and does not debit twice',async()=>{
  for(let i=0;i<3;i++){const r=await reserve(q);assert.equal(r.created,false);assert.equal(r.attempt.id,a.id);assert.equal(await balance(),0);}
  const changed=structuredClone(q);changed[6].shipping=1;assert.equal((await reserve(changed)).error,'MERIT_CHECKOUT_KEY_REUSED');
 });
 await t.test('a different checkout cannot reuse the held credit, and unknown attempts keep it held',async()=>{
  assert.equal((await reserve(quote())).error,'MERIT_CREDIT_BALANCE_UNAVAILABLE');assert.equal((await db.query('SELECT state FROM store_credit_ledger WHERE order_id=$1',[a.order_id])).rows[0].state,'held');assert.equal(await balance(),0);
 });
 await t.test('service raw balance writes, browser RPC access and forged support identities fail',async()=>{
  await assert.rejects(run(tx=>tx.query("UPDATE user_credits SET amount=178 WHERE email='buyer@example.test'")),e=>e.code==='42501');
  for(const role of ['anon','authenticated']) await assert.rejects(rpc('reserve_merit_checkout_with_credit',quote(),role),e=>e.code==='42501');
  await assert.rejects(run(tx=>tx.query("UPDATE user_credits SET amount=178 WHERE email='buyer@example.test' RETURNING email"),'authenticated',customer),e=>e.code==='42501');
  await assert.rejects(run(tx=>tx.query("UPDATE user_credits SET amount=178 WHERE email='buyer@example.test'"),'authenticated',support),e=>e.code==='42501');
  assert.equal((await rpc('adjust_store_credit',[randomUUID(),'buyer@example.test','add',100,'fixture'],'authenticated',support)).error,'STORE_CREDIT_RESERVATION_PENDING');
 });
 await t.test('verified paid transition consumes the hold exactly once',async()=>{
  ready=(await bind(a)).attempt;assert.equal((await finalize(ready)).ok,true);assert.equal((await finalize(ready)).alreadyPaid,true);assert.equal(await balance(),0);assert.equal((await db.query('SELECT state FROM store_credit_ledger WHERE order_id=$1',[a.order_id])).rows[0].state,'consumed');
 });
 await t.test('full coverage points to full-credit checkout before any reservation',async()=>{
  await setBalance(178.99);const fullQuote=quote();assert.equal((await reserve(fullQuote)).error,'MERIT_FULL_CREDIT_AVAILABLE');assert.equal(await balance(),178.99);assert.equal((await db.query('SELECT count(*)::int n FROM merit_payment_attempts WHERE checkout_key=$1',[fullQuote[0]])).rows[0].n,0);
 });
 await t.test('null, negative, fractional cents and normalized duplicate balances fail closed',async()=>{
  for(const amount of [null,-1,.001]){await setBalance(amount);assert.equal((await reserve(quote())).error,'MERIT_CREDIT_BALANCE_UNAVAILABLE');}
  await setBalance(100);await db.exec("INSERT INTO user_credits(email,amount) VALUES('BUYER@example.test',100)");assert.equal((await reserve(quote())).error,'MERIT_CREDIT_BALANCE_UNAVAILABLE');await db.exec("DELETE FROM user_credits WHERE email='BUYER@example.test'");
 });
 await t.test('existing pending legacy credit blocks a new hold until atomic legacy debit is recorded',async()=>{
  await setBalance(178);await seedLegacy('legacy-one','buyer@example.test','pending',20);
  assert.equal((await reserve(quote())).error,'MERIT_CREDIT_PENDING');assert.equal(await balance(),178);
  const args=['legacy-one','buyer@example.test',2000,'stripe'];assert.equal((await rpc('debit_legacy_order_credit',args)).error,'CREDIT_LEGACY_IDENTITY_UNVERIFIED');assert.equal(await balance(),178);await reconcileLegacyFixture('legacy-one',2000,'stripe');const first=await rpc('debit_legacy_order_credit',args);assert.deepEqual(first,{ok:true,orderId:'legacy-one',email:'buyer@example.test',creditCents:2000,provider:'stripe',alreadyDebited:true,balanceCents:15800});assert.equal(await balance(),158);
  assert.equal((await rpc('debit_legacy_order_credit',args)).alreadyDebited,true);assert.equal(await balance(),158);assert.equal((await rpc('debit_legacy_order_credit',['legacy-one','buyer@example.test',1900,'stripe'])).ok,false);
  const r=await reserve(quote());assert.equal(r.attempt.credit_reserved_cents,15800);assert.equal(await balance(),0);
 });
 await t.test('full-credit completion has a private canonical replay and no public-row-only replay',async()=>{
  await setBalance(300);const f=full();const r=await rpc('checkout_store_credit',f);assert.equal(r.ok,true);assert.equal(r.replayed,false);assert.equal(await balance(),180);
  await run(tx=>tx.query("UPDATE orders SET metadata=metadata||'{\"firstName\":\"support edit\"}' WHERE id=$1",[f[1].id]),'authenticated',support);
  const retry=await rpc('checkout_store_credit',f);assert.equal(retry.replayed,true);assert.deepEqual(retry.order,r.order);assert.equal(await balance(),180);
  const forged=full(50);await db.query("INSERT INTO orders(id,email,status,total,metadata) VALUES($1,$2,'pending',0,$3)",[forged[1].id,forged[0],{storeCreditUsed:0}]);assert.equal((await rpc('checkout_store_credit',forged)).error,'ORDER_ID_CONFLICT');assert.equal(await balance(),180);
 });
 await t.test('credit debit suppression rolls the new order and attempt back',async()=>{
  await setBalance(100);const fresh=quote();await db.exec(`CREATE FUNCTION credit_fault() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RETURN NULL; END $$;CREATE TRIGGER zz_credit_fault BEFORE UPDATE ON user_credits FOR EACH ROW EXECUTE FUNCTION credit_fault();`);
  await assert.rejects(reserve(fresh),/STORE_CREDIT_DEBIT_NOT_ACKNOWLEDGED/);assert.equal(await balance(),100);assert.equal((await db.query('SELECT count(*)::int n FROM merit_payment_attempts WHERE checkout_key=$1',[fresh[0]])).rows[0].n,0);await db.exec('DROP TRIGGER zz_credit_fault ON user_credits;DROP FUNCTION credit_fault()');
 });
 await t.test('cash-only original RPC remains available and never touches credit',async()=>{const c=quote();const before=await balance();const r=await rpc('reserve_merit_checkout',c);assert.equal(r.ok,true);assert.equal(r.attempt.credit_reserved_cents,0);assert.equal(await balance(),before);});
 await t.test('full-credit UUID owner privacy and immutable financial fields',async()=>{
  await setBalance(100);const f=full(30);const result=await rpc('checkout_store_credit',f);assert.equal(result.ok,true);
  for(const role of ['anon','authenticated']) {
    const id=role==='authenticated'?randomUUID():customer;
    assert.equal((await run(tx=>tx.query('SELECT id FROM orders WHERE id=$1',[f[1].id]),role,id)).rows.length,0);
  }
  assert.equal((await run(tx=>tx.query('SELECT id FROM orders WHERE id=$1',[f[1].id]),'authenticated',customer)).rows.length,1);
  await assert.rejects(run(tx=>tx.query('UPDATE orders SET total=1 WHERE id=$1',[f[1].id])),/STORE_CREDIT_ORDER_PROTECTED/);
  await assert.rejects(run(tx=>tx.query('UPDATE orders SET total=1 WHERE id=$1',[f[1].id]),'authenticated',support),/STORE_CREDIT_ORDER_FINANCIAL_FIELDS_PROTECTED/);
  assert.equal((await db.query("SELECT count(*)::int n FROM pg_proc WHERE oid=to_regprocedure('public.checkout_store_credit(text,jsonb,numeric,text)')")).rows[0].n,0);
 });
 await t.test('admin adjustment uses locked deltas, private idempotency and exact acknowledgement',async()=>{
  const email='fresh@example.test';const key=randomUUID();const args=[key,email,'add',5000,'example'];
  assert.equal((await rpc('adjust_store_credit',args,'authenticated',support)).balanceCents,5000);
  assert.equal((await rpc('adjust_store_credit',args,'authenticated',support)).replayed,true);
  assert.equal(await balance(email),50);
  assert.equal((await rpc('adjust_store_credit',[key,email,'add',6000,'example'],'authenticated',support)).error,'CREDIT_ADJUSTMENT_KEY_REUSED');
  assert.equal((await rpc('adjust_store_credit',[randomUUID(),email,'subtract',7500,null],'authenticated',support)).balanceCents,0);
  assert.equal((await rpc('adjust_store_credit',[randomUUID(),email,'set',101,null],'authenticated',support)).balanceCents,101);
  await assert.rejects(rpc('adjust_store_credit',[randomUUID(),email,'add',5000,null],'authenticated',customer),e=>e.code==='42501');
 });

 await t.test('legacy positive credit cannot be erased or marked paid before matching private debit',async()=>{
  const id='legacy-gate';await setBalance(100);await seedLegacy(id,'buyer@example.test','pending',10);
  await assert.rejects(run(tx=>tx.query("UPDATE orders SET metadata='{\"storeCreditUsed\":0}' WHERE id=$1",[id])),/LEGACY_CREDIT_CLAIM_PROTECTED/);
  await assert.rejects(run(tx=>tx.query("UPDATE orders SET status='paid',payment_provider='Stripe',paid_at=now() WHERE id=$1",[id])),/LEGACY_CREDIT_DEBIT_REQUIRED_BEFORE_PAID/);
  assert.equal((await rpc('debit_legacy_order_credit',[id,'buyer@example.test',1000,'stripe'])).error,'CREDIT_LEGACY_IDENTITY_UNVERIFIED');assert.equal(await balance(),100);await reconcileLegacyFixture(id,1000,'stripe');assert.equal((await rpc('debit_legacy_order_credit',[id,'buyer@example.test',1000,'stripe'])).alreadyDebited,true);
  await run(tx=>tx.query("UPDATE orders SET status='paid',payment_provider='Stripe',paid_at=now() WHERE id=$1",[id]));assert.equal(await balance(),90);
 });
 await t.test('pending legacy detection retains draft and canceled claims while historical done is terminal',async()=>{
  const email='states@example.test';await db.query('INSERT INTO user_credits(email,amount) VALUES($1,100)',[email]);
  for(const status of ['draft','pending','cancelled','canceled']){
   const id='state-'+status;await seedLegacy(id,email,status,10);
   assert.equal((await db.query('SELECT public.has_pending_legacy_credit($1) b',[email])).rows[0].b,true);
   // Synthetic historical fixture cleanup only; browser/service DELETE is protected.
   await db.exec('ALTER TABLE orders DISABLE TRIGGER store_credit_order_write_guard');await db.query('DELETE FROM orders WHERE id=$1',[id]);await db.exec('ALTER TABLE orders ENABLE TRIGGER store_credit_order_write_guard');
  }
  await db.exec('ALTER TABLE orders DISABLE TRIGGER store_credit_order_write_guard');await db.query("INSERT INTO orders(id,email,status,metadata) VALUES('historical-done',$1,'done','{\"storeCreditUsed\":10}')",[email]);await db.exec('ALTER TABLE orders ENABLE TRIGGER store_credit_order_write_guard');
  assert.equal((await db.query('SELECT public.has_pending_legacy_credit($1) b',[email])).rows[0].b,false);
 });
 await t.test('suppressed private receipt rolls back every balance/order mutation',async()=>{
  await db.exec(`CREATE FUNCTION suppress_credit_receipt() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RETURN NULL; END $$; CREATE TRIGGER zz_suppress_receipt BEFORE INSERT ON store_credit_ledger FOR EACH ROW EXECUTE FUNCTION suppress_credit_receipt();`);
  await setBalance(100);const mixed=quote();
  // Remove the deliberately forged pending fullcredit-id conflict fixture above.
  await db.exec('ALTER TABLE orders DISABLE TRIGGER store_credit_order_write_guard');await db.exec("DELETE FROM orders WHERE status='pending' AND id LIKE 'INV-%' AND NOT EXISTS(SELECT 1 FROM store_credit_ledger WHERE order_id=orders.id) AND NOT EXISTS(SELECT 1 FROM merit_payment_attempts WHERE order_id=orders.id)");await db.exec('ALTER TABLE orders ENABLE TRIGGER store_credit_order_write_guard');
  await assert.rejects(reserve(mixed),/STORE_CREDIT_RECEIPT_NOT_ACKNOWLEDGED/);assert.equal(await balance(),100);
  const f=full(50);await assert.rejects(rpc('checkout_store_credit',f),/STORE_CREDIT_RECEIPT_NOT_ACKNOWLEDGED/);assert.equal(await balance(),100);
  assert.equal((await db.query('SELECT count(*)::int n FROM orders WHERE id=$1',[f[1].id])).rows[0].n,0);
  await db.exec('DROP TRIGGER zz_suppress_receipt ON store_credit_ledger;DROP FUNCTION suppress_credit_receipt()');
 });
 await t.test('suppressed admin receipt rolls back the adjustment rather than acknowledging an unsafe retry',async()=>{
  await db.exec(`CREATE FUNCTION suppress_adjustment_receipt() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RETURN NULL; END $$; CREATE TRIGGER zz_suppress_adjustment BEFORE INSERT ON store_credit_adjustments FOR EACH ROW EXECUTE FUNCTION suppress_adjustment_receipt();`);
  const before=await balance('fresh@example.test');await assert.rejects(rpc('adjust_store_credit',[randomUUID(),'fresh@example.test','add',100,null],'authenticated',support),/CREDIT_ADJUSTMENT_RECEIPT_NOT_ACKNOWLEDGED/);assert.equal(await balance('fresh@example.test'),before);
  await db.exec('DROP TRIGGER zz_suppress_adjustment ON store_credit_adjustments;DROP FUNCTION suppress_adjustment_receipt()');
 });

 await t.test('postflight metadata identifies the exact isolated credit functions and privilege boundary',async()=>{
  const catalog=(await db.query(await readFile(new URL('../../supabase/review/merit_credit_postflight.sql',import.meta.url),'utf8'))).rows[0].merit_credit_postflight;
  for(const name of ['store_credit_ledger','store_credit_adjustments','user_credits']) {
   const table=catalog.tables.find(t=>t.name===name);assert.equal(table.rls,true);
   for(const role of table.rolePrivileges){assert.equal(role.insert,false);assert.equal(role.update,false);assert.equal(role.delete,false);assert.equal(role.truncate,false);}
  }
  assert.ok(catalog.creditFunctions.some(f=>f.signature==='checkout_store_credit(text,jsonb,numeric,text,uuid)'));
  assert.equal(catalog.creditFunctions.some(f=>f.signature==='checkout_store_credit(text,jsonb,numeric,text)'),false);
 });

 await t.test('public positive-credit inserts and zero-to-positive claims cannot block another owner',async()=>{
  for(const claim of [10,'10','1e1']) {
   for(const role of ['anon','authenticated','service_role']) await assert.rejects(run(tx=>tx.query("INSERT INTO orders(id,email,status,metadata) VALUES($1,'victim@example.test','pending',$2)",[randomUUID(),{storeCreditUsed:claim}]),role),/STORE_CREDIT_CLAIM_REQUIRES_PRIVATE_RESERVATION/);
  }
  const id='public-zero';await run(tx=>tx.query("INSERT INTO orders(id,email,status,metadata) VALUES($1,'victim@example.test','pending','{\"storeCreditUsed\":0}')",[id]),'anon');
  await assert.rejects(run(tx=>tx.query("UPDATE orders SET metadata='{\"storeCreditUsed\":10}' WHERE id=$1",[id]),'anon'),/STORE_CREDIT_CLAIM_REQUIRES_PRIVATE_RESERVATION/);
 });

});
