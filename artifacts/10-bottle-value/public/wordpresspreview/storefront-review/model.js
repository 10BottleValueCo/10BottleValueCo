export const CART_KEY = 'tbv-portable-review-cart-v1';
export const warehouses = ['worldwide','us'];
export const homeOrder = {
 worldwide:['Retatrutide','GHK-CU','TB-500 + BPC-157','MOTS-C','Tirzepatide','10-GH','KLOW80','CJC-1295 + Ipamorelin','NAD+','BPC-157','Tesamorelin','Semax','Selank','SS-31','KPV','HCG','5-Amino-1MQ','Epitalon','DSIP','BAC Water'],
 us:['Retatrutide','BAC Water','GHK-CU','TB-500 + BPC-157','BPC-157','MOTS-C','Tirzepatide','10-GH','KLOW80','CJC-1295 + Ipamorelin','NAD+','Tesamorelin','Semax','Selank','TB-500','SS-31','KPV','Epitalon','CJC-1295','HCG','5-Amino-1MQ']
};
export const slug = value => String(value).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
export const money = value => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:Number.isInteger(value)?0:2}).format(value);
export function groups(rows,warehouse) {
 const result=new Map();
 for(const offer of rows) {
  if(warehouse && offer.warehouse!==warehouse)continue;
  if(!result.has(offer.name))result.set(offer.name,{name:offer.name,slug:slug(offer.name),offers:[]});
  result.get(offer.name).offers.push(offer);
 }
 return [...result.values()];
}
export function homeGroups(rows,warehouse) {
 const order=homeOrder[warehouse];const rank=new Map(order.map((name,index)=>[name,index]));
 return groups(rows,warehouse).filter(group=>(warehouse==='us'||rank.has(group.name))&&group.offers.some(offer=>offer.stockStatus==='instock'))
  .sort((a,b)=>(rank.get(a.name)??Infinity)-(rank.get(b.name)??Infinity)||a.name.localeCompare(b.name));
}
export function defaultOffer(offers) {
 const sorted=[...offers].sort((a,b)=>parseFloat(a.dose)-parseFloat(b.dose));
 return sorted.find(offer=>offer.stockStatus==='instock')||sorted[0];
}
export function selectOffer(offers,{dose,formulation,pack=10}={}) {
 return offers.find(offer=>(!dose||offer.dose===dose)&&(!formulation||(offer.noteLabel||'Standard')===formulation)&&offer.packCount===Number(pack));
}
export function cleanCart(saved,rows) {
 const offers=new Map(rows.map(row=>[row.migrationKey,row]));const items=new Map();
 if(!Array.isArray(saved))return [];
 for(const item of saved) {
  if(!item||typeof item.key!=='string'||!offers.has(item.key)||offers.get(item.key).stockStatus!=='instock')continue;
  const quantity=Number(item.quantity);
  if(!Number.isSafeInteger(quantity)||quantity<1||quantity>99)continue;
  items.set(item.key,Math.min(99,(items.get(item.key)||0)+quantity));
 }
 return [...items].map(([key,quantity])=>({key,quantity}));
}
export function subtotal(cart,rows) {
 const prices=new Map(rows.map(row=>[row.migrationKey,row.price]));
 return cart.reduce((sum,item)=>sum+Math.round((prices.get(item.key)||0)*100)*item.quantity,0)/100;
}
