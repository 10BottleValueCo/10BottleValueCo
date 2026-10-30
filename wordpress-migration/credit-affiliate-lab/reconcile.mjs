// Synthetic-only, in-memory comparison. No database, write, payout, or activation.
import { plan } from './planner.mjs';

const kinds = ['credits','creditLedger','creditAdjustments','affiliates','attributions','payouts'];
const own = (o, fields) => o && Object.getPrototypeOf(o) === Object.prototype &&
  Object.keys(o).sort().join(',') === fields.slice().sort().join(',');

function validateCapture(capture) {
  if (!own(capture, ['fixture','mappings','synthetic','checkpoint','complete']) ||
      capture.synthetic !== true || typeof capture.checkpoint !== 'string' ||
      !/^sample-[a-z0-9-]{1,55}$/.test(capture.checkpoint) ||
      typeof capture.complete !== 'boolean') throw Error('invalid synthetic capture');
  return plan(capture.fixture, capture.mappings);
}

// The checkpoint is a caller-supplied label, NOT proof that either capture is
// consistent. Only independently validated full captures with the same label
// can pass. Report identity differences even when aggregate amounts match.
export function reconcile(sourceCapture, destinationCapture) {
  const source = validateCapture(sourceCapture);
  const destination = validateCapture(destinationCapture);
  if (sourceCapture.fixture.currency !== destinationCapture.fixture.currency)
    throw Error('capture currency differs');
  const left = source.proposedState.entries;
  const right = destination.proposedState.entries;
  const result = {};
  for (const kind of kinds) {
    const sourceKeys = Object.keys(left).filter(k => k.startsWith(kind + ':')).sort();
    const destKeys = Object.keys(right).filter(k => k.startsWith(kind + ':')).sort();
    const missing = sourceKeys.filter(k => !Object.hasOwn(right, k));
    const extra = destKeys.filter(k => !Object.hasOwn(left, k));
    const changed = sourceKeys.filter(k => Object.hasOwn(right, k) && left[k].digest !== right[k].digest);
    result[kind] = {sourceCount:sourceKeys.length, destinationCount:destKeys.length, missing, extra, changed};
  }
  const comparable = sourceCapture.complete && destinationCapture.complete &&
    sourceCapture.checkpoint === destinationCapture.checkpoint;
  return {
    comparable,
    matched: comparable && Object.values(result).every(r => !r.missing.length && !r.extra.length && !r.changed.length),
    checkpoint: sourceCapture.checkpoint === destinationCapture.checkpoint ? sourceCapture.checkpoint : null,
    records: result,
    sourceTotals: source.reconciliation,
    destinationTotals: destination.reconciliation,
    scope:'synthetic fixtures only; caller-supplied completeness and checkpoint are not evidence of a consistent database snapshot'
  };
}
