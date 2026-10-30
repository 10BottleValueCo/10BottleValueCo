import assert from 'node:assert/strict';
import fs from 'node:fs';
const origin=process.env.PREVIEW_TEST_ORIGIN||'http://127.0.0.1:9440';
const base=origin+'/wordpresspreview';
const jar=new Map();let checks=0;
function ok(value,message){assert.ok(value,message);checks++;}
function cookies(){return [...jar].map(([k,v])=>k+'='+v).join('; ');}
function remember(r){for(const c of r.headers.getSetCookie()){ok(/; Path=\/wordpresspreview\//i.test(c),'cookie scoped to preview');const pair=c.split(';')[0],at=pair.indexOf('=');jar.set(pair.slice(0,at),pair.slice(at+1));}}
let r=await fetch(base),html=await r.text();
ok(r.status===200,'anonymous home');
ok(r.headers.get('x-tbv-preview-engine')==='WordPress 7.1.3; WooCommerce 11.2.1','actual runtime versions');
ok(html.includes('Preview — WordPress version'),'small banner');
ok(!/Running blueprint|Open WordPress demo|id="wordpress-preview"|wp-login\.php/.test(html),'no browser runner or login');
ok(html.includes('Retatrutide'),'native product catalog');
const form=html.match(/<form class="bpc-catalog-card__cart-action"[^>]*action="([^"]+)"[^>]*>([\s\S]*?)<\/form>/);
assert.ok(form);
const payload=new URLSearchParams();
for(const x of form[2].matchAll(/<input[^>]+name="([^"]+)"[^>]+value="([^"]*)"/g))payload.set(x[1],x[2]);
payload.set('attribute_dosage','5 mg');payload.set('attribute_pack-size','10');payload.set('attribute_warehouse','worldwide');
r=await fetch(form[1].replaceAll('&amp;','&'),{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded',Origin:origin},body:payload.toString(),redirect:'manual'});
ok([200,302,303].includes(r.status),'native add-to-cart');remember(r);
r=await fetch(base+'/cart/',{headers:{cookie:cookies()}});html=await r.text();
ok(r.status===200&&html.includes('Retatrutide')&&html.includes('109.00'),'actor A native cart $109');
ok(/<button[^>]+disabled[^>]*>Preview — ordering disabled/.test(html),'checkout disabled');
r=await fetch(base+'/cart/');html=await r.text();
ok(html.includes('Your cart is currently empty'),'actor B cannot see actor A cart');
for(const p of ['/wp-admin/','/wp-login.php','/wp-config.php','/wp-json/wc/store/v1/checkout','/wp-content/database/db-path.php','/checkout/']){
 r=await fetch(base+p,{redirect:'manual'});ok(r.status===404,'deny '+p);
}
r=await fetch(base+'/?rest_route=/wp/v2/users');ok(r.status===400,'REST route query cannot bypass gate');
r=await fetch(base+'/?wc-ajax=checkout');ok(r.status===403,'GET checkout AJAX denied');
r=await fetch(base+'/cart/',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:'billing_email=preview%40example.invalid'});ok(r.status===403,'customer/order fields denied');
r=await fetch(base+'/shop/?quantity=99999');ok(r.status===400,'bounded preview quantity');
for(const p of ['/shop/?warehouse=us','/product/bpc-157/']){
 r=await fetch(base+p);html=await r.text();ok(r.status===200&&html.includes('Preview — WordPress version'),'native '+p);
}
r=await fetch(base+'/faq/');html=await r.text();
ok(r.status===200&&html.includes('Common Questions')&&(html.match(/data-faq-item/g)||[]).length===17,'live-source FAQ sections and questions');
ok(html.includes('What if my package tracking stops updating?')&&!html.includes('Are the listed stock amounts live?'),'original FAQ wording replaces placeholder');
r=await fetch(base+'/track-order/');html=await r.text();
ok(r.status===200&&['17TRACK','FedEx','USPS','UPS'].every(x=>html.includes(x)),'carrier tracking page');
ok(html.includes('Order lookup will be available after customer accounts and order history are connected.'),'real account order lookup remains unavailable in preview');
const receipt={passed:true,checks,origin,nativeWordPress:true,anonymous:true,cartIsolated:true,cartUSD:109,realOrderPerformed:false,customerEmailSent:false,browserBlueprintUsed:false};
fs.writeFileSync(new URL('../.vercel/wordpress-native-http-test.json',import.meta.url),JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt));
