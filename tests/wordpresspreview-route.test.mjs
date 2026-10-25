import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {test} from 'node:test';
import server from '../wordpress-preview-server/server.cjs';
const config=JSON.parse(readFileSync(new URL('../vercel.json',import.meta.url),'utf8'));
test('anonymous preview routes execute server WordPress before SPA fallback',()=>{
 const routes=config.rewrites.filter(r=>r.source.startsWith('/wordpresspreview'));
 assert.deepEqual(routes.map(r=>r.destination),['/api/wordpress-preview?path=/','/api/wordpress-preview?path=/','/api/wordpress-preview?path=/:path*']);
 assert.ok(config.rewrites.indexOf(routes[0])<config.rewrites.findIndex(r=>r.destination==='/index.html'));
});
test('only isolated runtime files are explicitly included for preview function',()=>{
 assert.equal(config.functions['api/wordpress-preview.js'].includeFiles,'wordpress-preview-server/**');
 assert.ok(config.rewrites.some(r=>r.source==='/api/:path*'&&r.destination==='/api/:path*'));
});
test('private PHP/database files cannot be requested as preview pages',()=>{
 for(const p of ['/wp-admin/','/wp-login.php','/wp-content/database/db-path.php','/wp-config.php','/wp-json/wc/store/v1/checkout'])assert.equal(server.allowedPath(p),false,p);
 for(const p of ['/','/shop/','/product/retatrutide/','/cart/'])assert.equal(server.allowedPath(p),true,p);
});
test('old browser launcher is absent; visible banner is native PHP',()=>{
 assert.equal(existsSync(new URL('../artifacts/10-bottle-value/public/wordpresspreview/index.html',import.meta.url)),false);
 const plugin=readFileSync(new URL('../wordpress-preview-server/site/wp-content/mu-plugins/tbv-server-preview.php',import.meta.url),'utf8');
 assert.match(plugin,/Preview — WordPress version/);
 assert.match(plugin,/ordering disabled/);
});
