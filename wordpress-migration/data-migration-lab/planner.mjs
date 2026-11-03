// Synthetic rehearsal only: no network, filesystem, WordPress or Supabase calls.
// This is not a production migration adapter and intentionally rejects real IDs.
import {createHash} from 'node:crypto';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const sampleId = value => typeof value === 'string' && /^sample-[a-z0-9-]{1,80}$/.test(value);
const cleanEmail = value => typeof value === 'string' && /^[a-z0-9][a-z0-9._+-]*@example\.invalid$/.test(value);
const hash = value => createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (object(value)) return Object.fromEntries(Object.keys(value).sort().map(k => [k, canonical(value[k])]));
  return value;
}
function cents(value) {
  // Monetary input is a decimal string; never round an approximation.
  if (typeof value !== 'string' || !/^(0|[1-9]\d{0,11})(\.\d{1,2})?$/.test(value)) return null;
  const [units, fraction = ''] = value.split('.');
  return BigInt(units) * 100n + BigInt(fraction.padEnd(2, '0'));
}
const emptyState = () => ({customers: {}, orders: {}});
export function makePlan(source, previous = emptyState()) {
  if (!object(source) || source.synthetic !== true || !Array.isArray(source.customers) || !Array.isArray(source.orders)) throw Error('SYNTHETIC_SCHEMA_REQUIRED');
  if (!object(previous) || !object(previous.customers) || !object(previous.orders)) throw Error('INVALID_SIMULATED_STATE');
  const next = structuredClone(previous), operations = [], issues = [];
  const seenIds = {customers: new Set(), orders: new Set()}, emails = new Set();
  const priorEmails = new Map();
  for (const [id, entry] of Object.entries(previous.customers)) {
    if (!sampleId(id) || !object(entry) || !object(entry.snapshot) || entry.snapshot.id !== id || !cleanEmail(entry.snapshot.email) || entry.fingerprint !== hash(entry.snapshot)) throw Error('INVALID_SIMULATED_STATE');
    if (priorEmails.has(entry.snapshot.email)) throw Error('INVALID_SIMULATED_STATE');
    priorEmails.set(entry.snapshot.email, id);
  }
  for (const [id, entry] of Object.entries(previous.orders)) {
    if (!sampleId(id) || !object(entry) || !object(entry.snapshot) || entry.snapshot.id !== id || entry.fingerprint !== hash(entry.snapshot)) throw Error('INVALID_SIMULATED_STATE');
  }
  // Validate the whole batch before planning; duplicate source identifiers must
  // never cause the first of two records to be silently selected.
  for (const [kind, rows] of [['customers', source.customers], ['orders', source.orders]]) {
    rows.forEach((row, index) => {
      const at = `${kind}[${index}]`;
      if (!object(row) || !sampleId(row.id)) { issues.push({at, code: 'SAMPLE_ID_REQUIRED'}); return; }
      if (seenIds[kind].has(row.id)) issues.push({at, code: 'DUPLICATE_SOURCE_ID'});
      seenIds[kind].add(row.id);
      if (kind === 'customers') {
        if (!cleanEmail(row.email)) issues.push({at, code: 'SAMPLE_EMAIL_REQUIRED'});
        else if (emails.has(row.email)) issues.push({at, code: 'DUPLICATE_EMAIL'});
        else emails.add(row.email);
        if (priorEmails.has(row.email) && priorEmails.get(row.email) !== row.id) issues.push({at, code: 'DESTINATION_EMAIL_CONFLICT'});
        if (typeof row.emailVerified !== 'boolean') issues.push({at, code: 'EMAIL_VERIFICATION_UNKNOWN'});
      } else {
        if (!sampleId(row.customerId) || !seenIds.customers.has(row.customerId)) issues.push({at, code: 'OWNER_LINK_UNRESOLVED'});
        if (typeof row.createdAt !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/.test(row.createdAt) || Number.isNaN(Date.parse(row.createdAt)) || new Date(row.createdAt).toISOString() !== row.createdAt.replace('Z','.000Z')) issues.push({at, code: 'INVALID_TIMESTAMP'});
        if (typeof row.historicalStatus !== 'string' || row.historicalStatus.length < 1 || row.historicalStatus.length > 80) issues.push({at, code: 'STATUS_REQUIRED'});
        if (row.currency !== 'USD') issues.push({at, code: 'UNSUPPORTED_CURRENCY'});
        if (!object(row.money)) { issues.push({at, code: 'MONEY_REQUIRED'}); return; }
        const fields = ['subtotal','shipping','tax','discount','credit','total'];
        const amounts = Object.fromEntries(fields.map(k => [k, cents(row.money[k])]));
        if (fields.some(k => amounts[k] === null)) issues.push({at, code: 'MONEY_INVALID'});
        else if (amounts.subtotal + amounts.shipping + amounts.tax - amounts.discount - amounts.credit !== amounts.total) issues.push({at, code: 'TOTAL_MISMATCH'});
        if (!Array.isArray(row.items) || !row.items.length || row.items.some(item => !object(item) || typeof item.name !== 'string' || !item.name || !Number.isSafeInteger(item.quantity) || item.quantity < 1 || cents(item.lineTotal) === null)) issues.push({at, code: 'ITEMS_INVALID'});
        else if (row.items.reduce((sum, item) => sum + cents(item.lineTotal), 0n) !== amounts.subtotal) issues.push({at, code: 'ITEM_SUBTOTAL_MISMATCH'});
      }
    });
  }
  if (issues.length) return {ok: false, operations: [], issues, state: structuredClone(previous)};
  for (const [kind, rows] of [['customers', source.customers], ['orders', source.orders]]) {
    for (const row of rows) {
      const fingerprint = hash(row), existing = next[kind][row.id];
      if (existing && (!object(existing) || existing.fingerprint !== fingerprint)) {
        issues.push({at: kind, code: 'DESTINATION_CONFLICT'});
      } else if (existing) {
        operations.push({kind, action: 'unchanged', sourceId: row.id});
      } else {
        // A simulator record, NOT a WordPress/WooCommerce object. Preserve raw
        // normalized historical snapshot verbatim; no charge or side effects.
        next[kind][row.id] = {fingerprint, snapshot: structuredClone(row)};
        operations.push({kind, action: 'create', sourceId: row.id});
      }
    }
  }
  // Atomic failure: no proposed partial writes if any existing record conflicts.
  return issues.length ? {ok: false, operations: [], issues, state: structuredClone(previous)} : {ok: true, operations, issues, state: next};
}
