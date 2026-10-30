// Synthetic rehearsal only. Never connects to a database, filesystem or WooCommerce.
import { createHash } from 'node:crypto';

const object = x => x !== null && typeof x === 'object' && !Array.isArray(x) && Object.getPrototypeOf(x) === Object.prototype;
const sampleId = x => typeof x === 'string' && /^sample-[a-z0-9-]{1,70}$/.test(x);
const email = x => typeof x === 'string' && /^sample-[a-z0-9-]{1,50}@example\.invalid$/.test(x);
const money = x => typeof x === 'string' && /^(0|[1-9][0-9]{0,11})(\.[0-9]{1,2})?$/.test(x);
const time = x => typeof x === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/.test(x) && !Number.isNaN(Date.parse(x)) && new Date(x).toISOString() === x.replace('Z', '.000Z');
const canonical = x => Array.isArray(x) ? x.map(canonical) : object(x) ? Object.fromEntries(Object.keys(x).sort().map(k => [k, canonical(x[k])])) : x;
const digest = x => createHash('sha256').update(JSON.stringify(canonical(x))).digest('hex');
const clone = x => structuredClone(x);
const exact = (o, keys) => object(o) && Object.keys(o).length === keys.length && keys.every(k => Object.hasOwn(o, k));
const customerKeys = ['id','email','created_at'];
const orderKeys = ['id','user_id','email','total','status','created_at','affiliate_commission_adjustment','metadata','items','payment_provider','payment_id','paid_at'];
const itemKeys = ['name','dose','quantity','price'];
const metadataKeys = ['subtotal','shipping','storeCreditUsed','total','shippingType'];
const statuses = new Set(['pending','checkout (clicked pay)','paid','refunded']);

function checkCustomer(row, at, issues) {
  if (!exact(row, customerKeys)) { issues.push({at, code:'CUSTOMER_PROJECTION_REQUIRED'}); return; }
  if (!sampleId(row.id) || !email(row.email)) issues.push({at, code:'SYNTHETIC_IDENTITY_REQUIRED'});
  if (!time(row.created_at)) issues.push({at, code:'INVALID_TIMESTAMP'});
}
function checkOrder(row, at, issues) {
  if (!exact(row, orderKeys)) { issues.push({at, code:'ORDER_PROJECTION_REQUIRED'}); return; }
  if (!sampleId(row.id)) issues.push({at, code:'SYNTHETIC_ID_REQUIRED'});
  // Only the fictional contract treats explicit null as unlinked; the real
  // source meaning of null has not been established. Never match by email.
  if (row.user_id !== null && !sampleId(row.user_id)) issues.push({at, code:'OWNER_LINK_UNRESOLVED'});
  if (!email(row.email)) issues.push({at, code:'SYNTHETIC_EMAIL_REQUIRED'});
  if (!money(row.total) || (row.affiliate_commission_adjustment !== null && !money(row.affiliate_commission_adjustment))) issues.push({at, code:'INVALID_AMOUNT'});
  if (!statuses.has(row.status)) issues.push({at, code:'UNSUPPORTED_SOURCE_STATUS'});
  if (!time(row.created_at) || (row.paid_at !== null && !time(row.paid_at))) issues.push({at, code:'INVALID_TIMESTAMP'});
  if ((row.payment_provider !== null && !sampleId(row.payment_provider)) || (row.payment_id !== null && !sampleId(row.payment_id))) issues.push({at, code:'SYNTHETIC_PAYMENT_EVIDENCE_REQUIRED'});
  if (!Array.isArray(row.items) || !row.items.length || row.items.some(i => !exact(i,itemKeys) || typeof i.name !== 'string' || !/^Synthetic [A-Za-z0-9 -]{1,50}$/.test(i.name) || !sampleId(i.dose) || !Number.isSafeInteger(i.quantity) || i.quantity < 1 || i.quantity > 10000 || !money(i.price))) issues.push({at, code:'UNSUPPORTED_ITEM_SHAPE'});
  const m=row.metadata;
  if (!exact(m,metadataKeys) || !money(m.subtotal) || !money(m.shipping) || !money(m.storeCreditUsed) || !money(m.total) || !sampleId(m.shippingType)) issues.push({at, code:'UNSUPPORTED_METADATA_SHAPE'});
}
function validate(rows, issues, prefix='') {
  const ids={customers:new Set(),orders:new Set()}, emails=new Set();
  for (const kind of ['customers','orders']) for (const [i,row] of rows[kind].entries()) {
    const at=`${prefix}${kind}[${i}]`;
    (kind === 'customers' ? checkCustomer : checkOrder)(row,at,issues);
    if (!object(row)) continue;
    if (ids[kind].has(row.id)) issues.push({at,code:'DUPLICATE_SOURCE_ID'});
    ids[kind].add(row.id);
    if (kind === 'customers') {
      if (emails.has(row.email)) issues.push({at,code:'DUPLICATE_CUSTOMER_EMAIL'});
      emails.add(row.email);
    }
  }
  const byId=new Map(rows.customers.filter(object).map(c=>[c.id,c]));
  for (const [i,row] of rows.orders.entries()) {
    if (!object(row) || !sampleId(row.user_id)) continue;
    const customer=byId.get(row.user_id);
    if (!customer) issues.push({at:`${prefix}orders[${i}]`,code:'OWNER_LINK_UNRESOLVED'});
    else if (customer.email !== row.email) issues.push({at:`${prefix}orders[${i}]`,code:'CUSTOMER_EMAIL_MISMATCH'});
  }
}
function destination(kind,row,currency) {
  if (kind === 'customers') return {kind:'customer',sourceId:row.id,email:row.email,createdAt:row.created_at,accountActivation:'unresolved'};
  return {kind:'order',sourceId:row.id,sourceCustomerId:row.user_id,sourceOwnerState:row.user_id===null?'unlinked':'linked',sourceEmail:row.email,sourceCreatedAt:row.created_at,sourceStatus:row.status,sourceTotal:row.total,currency,items:clone(row.items),sourceMetadata:clone(row.metadata),sourceAffiliateCommissionAdjustment:row.affiliate_commission_adjustment,paymentEvidence:{provider:row.payment_provider,paymentId:row.payment_id,paidAt:row.paid_at},wooStatus:'unresolved',paymentVerification:'unverified',amountReconciliation:'unresolved'};
}
/** Pure, atomic planning simulation: no target IDs are assigned and no writes occur. */
export function plan(batch, previous=null) {
  if (!exact(batch,['synthetic','currency','customers','orders']) || batch.synthetic !== true || typeof batch.currency !== 'string' || !/^[A-Z]{3}$/.test(batch.currency) || !Array.isArray(batch.customers) || !Array.isArray(batch.orders)) throw Error('SYNTHETIC_BATCH_REQUIRED');
  const issues=[];
  if (previous !== null && (!exact(previous,['synthetic','currency','customers','orders']) || previous.synthetic !== true || previous.currency !== batch.currency || !Array.isArray(previous.customers) || !Array.isArray(previous.orders))) throw Error('INVALID_SIMULATED_STATE');
  const old=previous ?? {synthetic:true,currency:batch.currency,customers:[],orders:[]};
  if (previous) {
    const priorIssues=[]; validate(old,priorIssues,'previous.');
    if (priorIssues.length) throw Error('INVALID_SIMULATED_STATE');
  }
  // Do not allow duplicate input even if identical; no silent first-wins selection.
  for (const kind of ['customers','orders']) {
    const seen=new Set();
    for (const [i,row] of batch[kind].entries()) {
      if (object(row) && seen.has(row.id)) issues.push({at:`${kind}[${i}]`,code:'DUPLICATE_SOURCE_ID'});
      if (object(row)) seen.add(row.id);
    }
  }
  const combined={customers:clone(old.customers),orders:clone(old.orders)};
  for (const kind of ['customers','orders']) {
    const oldById=new Map(old[kind].map(r=>[r.id,r]));
    for (const [i,row] of batch[kind].entries()) {
      const found=object(row) ? oldById.get(row.id) : undefined;
      if (found && digest(found)!==digest(row)) issues.push({at:`${kind}[${i}]`,code:'SOURCE_CHANGED_REVIEW_REQUIRED'});
      else if (!found) combined[kind].push(clone(row));
    }
  }
  validate(combined,issues);
  if (issues.length) return {ok:false,issues,operations:[],state:clone(old)};
  const actions=[];
  for (const kind of ['customers','orders']) {
    const previousIds=new Set(old[kind].map(row=>row.id));
    for (const row of batch[kind]) actions.push({action:previousIds.has(row.id) ? 'unchanged' : 'propose',...destination(kind,row,batch.currency)});
  }
  return {ok:true,issues:[],operations:actions,state:{synthetic:true,currency:batch.currency,...combined}};
}
