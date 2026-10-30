import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url)),repo=path.resolve(here,'../..');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'tbv-selection-test-'));
const app=path.join(temp,'artifacts/10-bottle-value/src'),shared=path.join(temp,'shared');
fs.mkdirSync(app,{recursive:true});fs.mkdirSync(shared,{recursive:true});
fs.writeFileSync(path.join(temp,'package.json'),'{"type":"module"}');
for(const name of ['product-selection.js','productNames.js'])fs.copyFileSync(path.join(here,'overlay/artifacts/10-bottle-value/src',name),path.join(app,name));
const builder=fs.readFileSync(path.join(here,'build-local.mjs'),'utf8');const commit=builder.match(/const baseCommit = '([a-f0-9]{40})'/)?.[1];if(!commit)throw Error('Pinned source commit unavailable');
fs.writeFileSync(path.join(shared,'warehouse-offer.js'),execFileSync('git',['show',commit+':shared/warehouse-offer.js'],{cwd:repo}));
try{
 const {readProductSelection,productSelectionUrl,resolveSelectedProduct}=await import(pathToFileURL(path.join(app,'product-selection.js')));
 const products=[{name:'Synthetic Item',dose:'5 mg',warehouse:'us',vials:5,noteLabel:'with/d',price:51,wooVariationId:101},{name:'Synthetic Item',dose:'5 mg',warehouse:'us',vials:5,noteLabel:'',price:50,wooVariationId:102}];
 const read=url=>readProductSelection(products,new URL(url,'http://example.invalid'));
 test('legacy absent and blank option preserve the historical first match',()=>{assert.equal(read('/synthetic-item-5mg').noteLabel,'with/d');assert.equal(read('/synthetic-item-5mg?option=').noteLabel,'with/d');});
 test('new empty selection survives a preceding named option and preserves attribution',()=>{const selected={name:'Synthetic Item',dose:'5 mg',warehouse:'us',vials:5,noteLabel:''};const url=productSelectionUrl(selected,'?utm_source=test&option=old');assert.match(url,/tbv_option=empty/);assert.match(url,/utm_source=test/);assert.equal(read(url).noteLabel,'');assert.equal(resolveSelectedProduct(products,read(url)).price,50);});
 test('named selection clears the empty marker and remains exact',()=>{const selected={name:'Synthetic Item',dose:'5 mg',warehouse:'us',vials:5,noteLabel:'with/d'};const url=productSelectionUrl(selected,'?tbv_option=empty');assert.doesNotMatch(url,/tbv_option/);assert.equal(read(url).noteLabel,'with/d');assert.equal(resolveSelectedProduct(products,read(url)).price,51);});
 test('explicit named option wins over a stale empty marker',()=>{assert.equal(read('/synthetic-item-5mg?warehouse=us&pack=5&option=with%2Fd&tbv_option=empty').noteLabel,'with/d');});
 test('with the catalog, plain products get clean links and ambiguous ones keep the marker',()=>{const plain=[{name:'Plain Item',dose:'10 mg',warehouse:'worldwide',vials:10,noteLabel:'',price:9,wooVariationId:201}];assert.equal(productSelectionUrl({name:'Plain Item',dose:'10 mg',warehouse:'worldwide',vials:10,noteLabel:''},'',plain),'/plain-item-10mg');assert.match(productSelectionUrl({name:'Synthetic Item',dose:'5 mg',warehouse:'us',vials:5,noteLabel:''},'',products),/tbv_option=empty/);});
 test('missing explicit empty option does not substitute a named offer',()=>{const missing=readProductSelection([products[0]],new URL('/synthetic-item-5mg?warehouse=us&pack=5&tbv_option=empty','http://example.invalid'));assert.equal(missing.noteLabel,'');assert.equal(resolveSelectedProduct([products[0]],missing).price,null);});
}finally{process.on('exit',()=>fs.rmSync(temp,{recursive:true,force:true}));}
