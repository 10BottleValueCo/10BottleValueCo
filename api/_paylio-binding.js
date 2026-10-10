import { createHash, randomUUID } from "node:crypto";
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ID=/^[A-Za-z0-9_-]{1,160}$/;
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
export class PaylioError extends Error {
  constructor(code,status=503){super('Payment verification is pending. Please contact support before retrying payment.');this.code=code;this.status=status;}
}
export function paylioCents(value){
  if(!['string','number'].includes(typeof value)||String(value).trim()==='')return null;
  const amount=Number(value),cents=Math.round(amount*100);
  return Number.isFinite(amount)&&amount>0&&Number.isSafeInteger(cents)&&cents<=10000000&&Math.abs(amount*100-cents)<1e-7?cents:null;
}
export function paylioAccount(env=process.env){
  const key=env.PAYLIO_API_KEY,payout=env.PAYLIO_PAYOUT_ADDRESS;
  if(typeof key!=='string'||!key||typeof payout!=='string'||!/^0x[0-9a-f]{40}$/i.test(payout))throw new PaylioError('PAYLIO_CONFIGURATION_REQUIRED');
  return {key,payout:payout.toLowerCase(),fingerprint:createHash('sha256').update(`paylio.org\n${key}\n${payout.toLowerCase()}`).digest('hex')};
}
export async function paylioStorage(path,{method='GET',body}={}, {env=process.env,fetcher=globalThis.fetch}={}){
  const base=String(env.SUPABASE_URL||env.VITE_SUPABASE_URL||'').replace(/\/+$/,'');
  if(!base||!env.SUPABASE_SERVICE_ROLE_KEY)throw new PaylioError('PAYLIO_STORAGE_UNAVAILABLE');
  try{
    const res=await fetcher(`${base}/rest/v1/${path}`,{method,redirect:'error',signal:AbortSignal.timeout(8000),headers:{apikey:env.SUPABASE_SERVICE_ROLE_KEY,Authorization:`Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,'Content-Type':'application/json',...(method==='GET'?{}:{Prefer:'return=representation'})},...(body===undefined?{}:{body:JSON.stringify(body)})});
    const text=await res.text();
    if(!res.ok||Buffer.byteLength(text)>200000)throw new Error('Unavailable');
    return JSON.parse(text);
  }catch{throw new PaylioError('PAYLIO_STORAGE_UNAVAILABLE');}
}
export async function reservePaylio(access,quote,provider='',deps={}){
  const account=paylioAccount(deps.env);
  const amountCents=paylioCents(quote.total);
  if(amountCents===null||quote.storeCreditUsed!==0)throw new PaylioError('PAYLIO_QUOTE_INVALID',400);
  const fingerprint=createHash('sha256').update(JSON.stringify({quote,provider,account:account.fingerprint})).digest('hex');
  const result=await paylioStorage('rpc/reserve_paylio_checkout',{method:'POST',body:{p_id:randomUUID(),p_order_id:access.order.id,p_customer_id:access.identity.id,p_email:access.identity.email,p_fingerprint:fingerprint,p_account_fingerprint:account.fingerprint,p_payout_address:account.payout,p_amount_cents:amountCents,p_quote:quote}},deps);
  const a=result?.attempt;
  if(typeof result?.created!=='boolean'||!object(a)||!UUID.test(a.id)||a.order_id!==access.order.id||a.customer_id!==access.identity.id||a.email!==access.identity.email||a.fingerprint!==fingerprint||a.account_fingerprint!==account.fingerprint||a.amount_cents!==amountCents||a.currency!=='USD')throw new PaylioError('PAYLIO_RESERVATION_UNACKNOWLEDGED');
  return {created:result.created,attempt:a,account};
}
export function paylioCheckoutUrl(value){
  if(typeof value!=='string')throw new PaylioError('PAYLIO_INVALID_CHECKOUT_RESPONSE');
  let url;try{url=new URL(value)}catch{throw new PaylioError('PAYLIO_INVALID_CHECKOUT_RESPONSE')}
  if(url.origin!=='https://paylio.org'||url.username||url.password||!/^\/(pay|p)\/[A-Za-z0-9_-]+$/.test(url.pathname))throw new PaylioError('PAYLIO_INVALID_CHECKOUT_RESPONSE');
  // PayLio documents email prefill and auto=1 on direct-provider links. Persist
  // only the canonical URL accepted by the private binding contract; do not
  // forward provider-supplied query strings or callback tokens to the customer.
  if(url.hash)throw new PaylioError('PAYLIO_INVALID_CHECKOUT_RESPONSE');
  const seen=new Set();
  for(const [key,value] of url.searchParams){
    if(seen.has(key)||(key==='auto'?value!=='1':key==='email'?(value.length>320||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)):true))
      throw new PaylioError('PAYLIO_INVALID_CHECKOUT_RESPONSE');
    seen.add(key);
  }
  url.search='';
  return url.href;
}
export function paylioCustomerUrl(value,email,provider=''){
  const url=new URL(paylioCheckoutUrl(value));
  // Rebuild the documented direct-provider shortcut from verified request
  // context, so create and retry return the same safe customer-facing URL.
  if(provider&&provider!=='multi'){
    if(typeof email!=='string'||email.length>320||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new PaylioError('PAYLIO_INVALID_CHECKOUT_RESPONSE');
    url.searchParams.set('email',email);url.searchParams.set('auto','1');
  }
  return url.href;
}
export async function bindPaylio(attempt,data,deps={}){
  const url=paylioCheckoutUrl(data?.checkout_url||data?.short_url);
  const checks=[
    ['payment_id',object(data)&&ID.test(data.payment_id||'')],
    ['callback_token',typeof data?.ipn_token==='string'&&data.ipn_token.length>=8&&data.ipn_token.length<=512],
    ['status',data?.status==='unpaid'],['amount',paylioCents(data?.amount)===attempt.amount_cents],
    ['currency',data?.currency===undefined||String(data.currency).toUpperCase()==='USD'],
    ['fee_mode',data?.pass_fee_to_customer===undefined||data.pass_fee_to_customer===false],
    ['original_amount',data?.original_amount==null||paylioCents(data.original_amount)===attempt.amount_cents],
  ];
  const failed=checks.find(([,valid])=>!valid);
  if(failed){const error=new PaylioError('PAYLIO_CREATION_MISMATCH');error.reason=failed[0];throw error;}
  const bound=await paylioStorage('rpc/bind_paylio_checkout',{method:'POST',body:{p_id:attempt.id,p_payment_id:data.payment_id,p_ipn_token:data.ipn_token,p_checkout_url:url,p_amount_cents:attempt.amount_cents}},deps);
  if(bound?.id!==attempt.id||bound.state!=='ready'||bound.payment_id!==data.payment_id||bound.checkout_url!==url||bound.amount_cents!==attempt.amount_cents||bound.account_fingerprint!==attempt.account_fingerprint)throw new PaylioError('PAYLIO_BINDING_UNACKNOWLEDGED');
  return {payment_url:url,verifiedAmount:attempt.amount_cents/100};
}
export async function verifyPaylioAttempt(id,deps={}){
  if(!UUID.test(id||''))throw new PaylioError('PAYLIO_LEGACY_RECONCILIATION_REQUIRED',409);
  const rows=await paylioStorage(`paylio_payment_attempts?${new URLSearchParams({id:`eq.${id}`,select:'*',limit:'2'})}`,{},deps);
  const a=Array.isArray(rows)&&rows.length===1?rows[0]:null;
  if(!object(a)||a.id!==id||!['ready','paid'].includes(a.state)||!ID.test(a.payment_id||''))throw new PaylioError('PAYLIO_BINDING_NOT_READY',409);
  const account=paylioAccount(deps.env);
  if(a.account_fingerprint!==account.fingerprint||a.payout_address!==account.payout)throw new PaylioError('PAYLIO_ACCOUNT_CHANGED');
  let status;
  try{
    const response=await (deps.fetcher||globalThis.fetch)(`https://paylio.org/api/v1/payment-status?${new URLSearchParams({payment_id:a.payment_id})}`,{headers:{Authorization:`Bearer ${account.key}`},redirect:'error',signal:AbortSignal.timeout(8000)});
    if(!response.ok)throw new Error('Unavailable');
    const text=await response.text();if(Buffer.byteLength(text)>50000)throw new Error('Oversized');status=JSON.parse(text);
  }catch{throw new PaylioError('PAYLIO_STATUS_UNAVAILABLE');}
  if(!object(status)||status.payment_id!==a.payment_id||paylioCents(status.amount)!==a.amount_cents||String(status.currency).toUpperCase()!==a.currency
    ||(status.pass_fee_to_customer!==undefined&&status.pass_fee_to_customer!==false)||(status.original_amount!=null&&paylioCents(status.original_amount)!==a.amount_cents))throw new PaylioError('PAYLIO_PAYMENT_MISMATCH');
  if(status.status!=='paid'||status.forward_status!=='completed')throw new PaylioError('PAYLIO_PAYMENT_PENDING',409);
  const time=Date.parse(status.paid_at);
  if(!Number.isFinite(time)||time>Date.now()+300000||time<Date.parse(a.created_at)-300000)throw new PaylioError('PAYLIO_PAID_TIME_INVALID');
  const result=await paylioStorage('rpc/finalize_paylio_checkout',{method:'POST',body:{p_id:a.id,p_payment_id:a.payment_id,p_amount_cents:a.amount_cents,p_currency:a.currency,p_account_fingerprint:account.fingerprint,p_paid_at:new Date(time).toISOString()}},deps);
  if(result?.ok!==true||typeof result.transitioned!=='boolean'||result.orderId!==a.order_id||result.paymentId!==a.payment_id||!['paid','done','processing','shipped','delivered'].includes(result.status)||!object(result.quote))throw new PaylioError('PAYLIO_PAID_UNACKNOWLEDGED');
  return result;
}

// Explicit no-write checkout resume. A frozen order must never silently absorb
// a changed cart, amount, discount, recipient or delivery destination.
export function paylioResumeMatchesOrder(attempt, identity, order) {
  const q=attempt?.quote,m=order?.metadata;
  if(!object(q)||!object(m)||!['reserved','ready'].includes(attempt.state)||attempt.order_id!==order.id
    ||attempt.customer_id!==identity.id||attempt.email!==identity.email||order.email!==identity.email
    ||paylioCents(order.total)!==attempt.amount_cents)return false;
  const zeroCents=value=>{if(!['number','string'].includes(typeof value)||String(value).trim()==='')return null;const n=Number(value),c=Math.round(n*100);return Number.isFinite(n)&&n>=0&&Number.isSafeInteger(c)&&Math.abs(n*100-c)<1e-7?c:null};
  for(const key of ['subtotal','shipping','automaticDiscount','promoDiscount','affiliateDiscount','storeCreditUsed']){
    const left=zeroCents(m[key]),right=zeroCents(q[key]);if(left===null||right===null||left!==right)return false;
  }
  if(zeroCents(m.storeCreditUsed)!==0)return false;
  for(const key of ['shippingType','promoCode','affiliateCode'])if(String(m[key]||'')!==String(q[key]||''))return false;
  for(const key of ['firstName','lastName','address','address2','city','state','postalCode','country','phone','taxId','orderNotes'])if(String(m[key]||'')!==String(q[key]||''))return false;
  const lines=items=>{
    if(!Array.isArray(items)||!items.length||items.length>100)return null;
    const result=[];
    for(const item of items){
      if(!object(item)||typeof item.name!=='string'||!Number.isInteger(Number(item.quantity))||Number(item.quantity)<1||zeroCents(item.price)===null)return null;
      result.push(JSON.stringify([item.name,String(item.dose||''),String(item.noteLabel||''),String(item.fromWarehouse||''),Number(item.quantity),zeroCents(item.price)]));
    }
    return JSON.stringify(result.sort());
  };
  const left=lines(m.items),right=lines(q.items);
  return left!==null&&right!==null&&left===right;
}
