// Compare a WordPress store's catalog with the live storefront's own price and
// stock table (api/_catalog.js in the production source), offer by offer.
//   node catalog-parity.mjs <production-source-checkout> [store-origin]
// Exits 1 if any offer is missing, extra, or differs in price or stock.
const prodRoot = process.argv[2];
const wp = (process.argv[3] || 'http://127.0.0.1:8088').replace(/\/+$/, '');
if (!prodRoot) { console.error('usage: node catalog-parity.mjs <production-source-checkout> [store-origin]'); process.exit(2); }
const { PRODUCTS, getUnitPrice } = await import(prodRoot + '/api/_catalog.js');
const offers = [];
for (let page = 1; ; page++) {
  const r = await (await fetch(`${wp}/wp-json/tbv-catalog/v1/products?page=${page}&per_page=50`, {headers: {'ngrok-skip-browser-warning': '1'}})).json();
  for (const p of r.products) for (const o of p.offers) offers.push({ product: p.name, ...o });
  if (!r.has_more) break;
}
const norm = s => String(s || '').trim().toLowerCase();
const doseKey = s => norm(s).replace(/\s+/g, '');
const first = n => norm(n).split(' / ')[0].trim();
const used = new Set(); const issues = [];
for (const p of PRODUCTS) {
  const wh = p.warehouse === 'us' ? 'us' : 'worldwide';
  const m = offers.filter(o => (first(o.product) === first(p.name) || norm(o.product) === norm(p.name)) && doseKey(o.dose) === doseKey(p.dose) && o.warehouse === wh && (o.formulation || '') === (p.noteLabel || '') );
  const label = `${p.name} ${p.dose}${p.noteLabel ? ' ' + p.noteLabel : ''} ${wh}`;
  if (!m.length) { issues.push(['missing_on_wp', label]); continue; }
  for (const o of m) used.add(o.variation_id);
  const o = m.find(x => x.pack === 10) || m[0];
  const price = getUnitPrice(p, p.warehouse === 'us' ? 'us' : '');
  if (Math.abs(Number(o.price) - price) > 0.001) issues.push(['price', label, `live ${price} wp ${o.price}`]);
  const liveOos = !!p.outOfStock, wpOos = o.stock_status !== 'instock';
  if (liveOos !== wpOos) issues.push(['stock', label, `live ${liveOos ? 'out' : 'in'} wp ${o.stock_status}`]);
  if (m.length > 1) issues.push(['multi_pack', label, m.map(x => x.pack + ':' + x.price).join(',')]);
}
for (const o of offers) if (!used.has(o.variation_id)) issues.push(['extra_on_wp', `${o.product} ${o.dose} ${o.formulation} ${o.warehouse} pack${o.pack}`, o.price]);
console.log('live offers', PRODUCTS.length, 'wp offers', offers.length);
const by = {}; for (const i of issues) (by[i[0]] ||= []).push(i.slice(1).join(' | '));
for (const [k, v] of Object.entries(by)) { console.log(`\n## ${k} (${v.length})`); for (const l of v) console.log('  ' + l); }
console.log(JSON.stringify({liveOffers: PRODUCTS.length, storeOffers: offers.length, issues: issues.length}));
process.exit(issues.length ? 1 : 0);
