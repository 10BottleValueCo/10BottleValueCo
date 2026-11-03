// Synthetic-only reconciliation rehearsal. No adapters, I/O, hooks or payout execution.
import { createHash } from 'node:crypto';

const KINDS = ['credits', 'creditLedger', 'creditAdjustments', 'affiliates', 'attributions', 'payouts'];
const id = v => typeof v === 'string' && /^sample-[a-z0-9][a-z0-9-]{0,59}$/.test(v);
const email = v => typeof v === 'string' && /^sample-[a-z0-9-]+@example\.invalid$/.test(v);
const code = v => typeof v === 'string' && /^SAMPLE-[A-Z0-9-]+$/.test(v);
const date = v => typeof v === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(v) && Number.isFinite(Date.parse(v)) && new Date(v).toISOString() === v;
const text = v => typeof v === 'string' && v.length > 0 && v.length <= 80;
const money = v => {
  if (typeof v !== 'string' || !/^(0|[1-9]\d{0,12})\.\d{2}$/.test(v)) throw Error('invalid decimal amount');
  return BigInt(v.replace('.', ''));
};
function normalized(v) {
  if (Array.isArray(v)) return v.map(normalized);
  if (v && typeof v === 'object' && Object.getPrototypeOf(v) === Object.prototype)
    return Object.fromEntries(Object.keys(v).sort().map(k => [k, normalized(v[k])]));
  if (v === null || typeof v === 'string' || typeof v === 'boolean') return v;
  throw Error('fixture contains unsupported value');
}
const clone = x => JSON.parse(JSON.stringify(x));
const hash = x => createHash('sha256').update(JSON.stringify(normalized(x))).digest('hex');
function exact(o, fields) {
  if (!o || typeof o !== 'object' || Array.isArray(o) || Object.getPrototypeOf(o) !== Object.prototype || Object.keys(o).sort().join(',') !== fields.slice().sort().join(',')) throw Error('invalid fixture fields');
}
function indexRows(rows, name) {
  if (!Array.isArray(rows)) throw Error(`missing ${name}`);
  const result = new Map();
  for (const row of rows) {
    if (!id(row.sourceId) || result.has(row.sourceId)) throw Error(`duplicate or invalid ${name} ID`);
    result.set(row.sourceId, row);
  }
  return result;
}
function totals(rows, field) { return rows.reduce((n, r) => n + money(r[field]), 0n).toString(); }

// externalMappings are explicit, independently verified synthetic migration mappings;
// no identity is inferred from an email or displayed affiliate code.
export function plan(input, externalMappings, priorState = {version: 1, entries: {}}) {
  exact(input, ['synthetic','currency','credits','creditLedger','creditAdjustments','affiliates','attributions','payouts']);
  exact(externalMappings, ['customers','orders']);
  if (input.synthetic !== true || typeof input.currency !== 'string' || !/^[A-Z]{3}$/.test(input.currency)) throw Error('synthetic fixture and explicit currency required');
  for (const key of ['customers','orders']) {
    const m = externalMappings[key];
    if (!m || Array.isArray(m) || Object.getPrototypeOf(m) !== Object.prototype) throw Error('invalid mapping');
    const values = new Set();
    for (const [source, dest] of Object.entries(m)) {
      if (!id(source) || !id(dest) || values.has(dest)) throw Error('invalid or ambiguous mapping');
      values.add(dest);
    }
  }
  const existing = priorState;
  exact(existing, ['version','entries']);
  if (existing.version !== 1 || !existing.entries || Object.getPrototypeOf(existing.entries) !== Object.prototype) throw Error('invalid prior state');
  for (const [key, entry] of Object.entries(existing.entries)) {
    exact(entry, ['snapshot','digest']);
    exact(entry.snapshot, ['synthetic','currency','kind','record','links']);
    if (!entry.snapshot.record || typeof entry.snapshot.record !== 'object' || !entry.snapshot.links || Object.getPrototypeOf(entry.snapshot.links) !== Object.prototype || !KINDS.some(k => key.startsWith(k + ':')) || !id(key.split(':')[1]) || entry.snapshot.synthetic !== true || key !== entry.snapshot.kind + ':' + entry.snapshot.record.sourceId || entry.digest !== hash(entry.snapshot)) throw Error('untrusted prior state');
    if (entry.snapshot.currency !== input.currency) throw Error('prior currency differs');
  }
  const maps = Object.fromEntries(KINDS.map(k => [k, indexRows(input[k], k)]));
  // Recheck retained historical entries together with the incoming batch, so an
  // omitted prior record cannot be recreated under a different source ID.
  for (const entry of Object.values(existing.entries)) {
    const {kind, record} = entry.snapshot;
    if (!maps[kind].has(record.sourceId)) maps[kind].set(record.sourceId, record);
  }
  const seenEmails = new Set(), seenCustomers = new Set(), seenCodes = new Set(), seenAffiliateEmails = new Set(), seenLedgerOrders = new Set(), seenAttributions = new Set();
  const mapped = (kind, source) => { if (!id(source) || !externalMappings[kind][source]) throw Error(`unmapped ${kind} reference`); };
  for (const row of maps.credits.values()) {
    exact(row, ['sourceId','customerId','email','amount','updatedAt']);
    if (!email(row.email) || seenEmails.has(row.email) || seenCustomers.has(row.customerId)) throw Error('duplicate or invalid credit account');
    seenEmails.add(row.email); seenCustomers.add(row.customerId); mapped('customers',row.customerId); money(row.amount);
    if (!date(row.updatedAt)) throw Error('invalid credit timestamp');
  }
  for (const row of maps.creditLedger.values()) {
    exact(row, ['sourceId','creditId','orderId','amount','provider','state','createdAt','consumedAt']);
    if (!maps.credits.has(row.creditId)) throw Error('missing credit account');
    mapped('orders',row.orderId);
    if (seenLedgerOrders.has(row.orderId)) throw Error('duplicate credit ledger order');
    seenLedgerOrders.add(row.orderId); if (money(row.amount) === 0n || !text(row.provider)) throw Error('invalid credit history');
    if (!['held','consumed'].includes(row.state) || !date(row.createdAt) || !(row.consumedAt === null || date(row.consumedAt))) throw Error('invalid credit history');
    if ((row.state === 'held' && row.consumedAt !== null) || (row.state === 'consumed' && row.consumedAt === null)) throw Error('invalid consumed timestamp');
  }
  for (const row of maps.creditAdjustments.values()) {
    exact(row, ['sourceId','creditId','mode','amount','before','after','note','createdAt']);
    if (!maps.credits.has(row.creditId) || !['set','increase','decrease'].includes(row.mode) || !(row.note === null || (typeof row.note === 'string' && /^sample-[a-z0-9-]+$/.test(row.note))) || !date(row.createdAt)) throw Error('invalid credit adjustment');
    // Preserve observed source values, never infer the change formula from a mode name.
    money(row.amount); money(row.before); money(row.after);
  }
  for (const row of maps.affiliates.values()) {
    exact(row, ['sourceId','customerId','email','affiliateCode','active','createdAt']);
    if (!email(row.email) || seenAffiliateEmails.has(row.email) || !code(row.affiliateCode) || seenCodes.has(row.affiliateCode) || typeof row.active !== 'boolean' || !date(row.createdAt)) throw Error('duplicate or invalid affiliate');
    seenCodes.add(row.affiliateCode); seenAffiliateEmails.add(row.email); mapped('customers',row.customerId);
  }
  for (const row of maps.attributions.values()) {
    exact(row, ['sourceId','affiliateId','orderId','commissionAmount','shippingType','createdAt']);
    if (!maps.affiliates.has(row.affiliateId)) throw Error('missing affiliate');
    mapped('orders',row.orderId); money(row.commissionAmount);
    if (!text(row.shippingType) || !date(row.createdAt)) throw Error('invalid attribution');
    let unique=row.affiliateId+':'+row.orderId; if (seenAttributions.has(unique)) throw Error('duplicate attribution'); seenAttributions.add(unique);
  }
  for (const row of maps.payouts.values()) {
    exact(row, ['sourceId','affiliateId','amount','note','createdAt']);
    if (!maps.affiliates.has(row.affiliateId) || !(row.note === null || (typeof row.note === 'string' && /^sample-[a-z0-9-]+$/.test(row.note))) || !date(row.createdAt)) throw Error('invalid historical payout');
    if (money(row.amount) === 0n) throw Error('invalid historical payout');
  }
  const entries = clone(existing.entries), changes = [], unchanged = [];
  for (const kind of KINDS) for (const row of maps[kind].values()) {
    const snapshot = {synthetic:true, currency:input.currency, kind, record: clone(row), links: {}};
    if (row.customerId) snapshot.links.customer = externalMappings.customers[row.customerId];
    if (row.orderId) snapshot.links.order = externalMappings.orders[row.orderId];
    const key = `${kind}:${row.sourceId}`, digest = hash(snapshot);
    if (entries[key]) {
      if (entries[key].digest !== digest) throw Error(`conflict: ${key}`);
      unchanged.push(key);
    } else { entries[key] = {snapshot, digest}; changes.push(key); }
  }
  return {
    // This is an inactive proposed snapshot; no credit or affiliate functionality is enabled.
    proposedState: {version:1, entries}, changes, unchanged,
    reconciliation: {currency:input.currency, scope:'accumulated synthetic fixture, including retained missing rows',
      creditBalanceCents:totals([...maps.credits.values()],'amount'),
      heldCents:totals([...maps.creditLedger.values()].filter(r=>r.state==='held'),'amount'),
      consumedCents:totals([...maps.creditLedger.values()].filter(r=>r.state==='consumed'),'amount'),
      historicalPayoutCents:totals([...maps.payouts.values()],'amount'),
      creditBalancesAreNotAdjustedByLedger:true, creditsActivated:false, payoutsInitiated:false}
  };
}
