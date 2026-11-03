import { catalogProductName } from './productNames.js';

const text = value => String(value ?? '').trim().toLowerCase();
const identity = offer => JSON.stringify([
  text(catalogProductName(offer.name)),
  text(offer.dose).replace(/(\d)\s+([a-z])/g, '$1$2'),
  text(offer.noteLabel), text(offer.warehouse), offer.pack,
]);

// Do not guess which Woo variation represents an indistinguishable offer.
// Canonicalize old names before comparing, since the UI groups those names.
export function uniqueWooOffers(snapshot) {
  const rows = Array.isArray(snapshot) ? snapshot.filter(p => p && typeof p === 'object') : [];
  const counts = new Map();
  for (const row of rows) counts.set(identity(row), (counts.get(identity(row)) || 0) + 1);
  return rows.filter(row => [1, 5, 10].includes(row.pack) && counts.get(identity(row)) === 1)
    .map(row => ({ ...row, vials: row.pack }));
}
