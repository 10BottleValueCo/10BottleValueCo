// Historical display details describe ten-vial source kits. Do not attach their
// totals and kit notes to a different WooCommerce pack size.
export function mergeWooDisplayMetadata(legacy, offer) {
  const original = legacy && typeof legacy === 'object' ? legacy : {};
  const tenPack = offer.pack === 10 && (original.vials === undefined || original.vials === 10);
  const fallbackNote = `${offer.pack} vial kit (${offer.pack} ${offer.pack === 1 ? 'vial' : 'vials'} included)`;
  return {
    ...original,
    ...offer,
    total: tenPack ? (original.total || '') : '',
    note: tenPack ? (original.note || fallbackNote) : fallbackNote,
  };
}
