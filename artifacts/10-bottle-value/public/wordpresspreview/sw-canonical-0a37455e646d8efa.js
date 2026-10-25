function be(e){return e.pathname.startsWith("/scope:")}function et(e){return be(e)?e.pathname.split("/")[1].split(":")[1]:null}function tt(e,n){let t=new URL(e);if(be(t))if(n){const r=t.pathname.split("/");r[1]=`scope:${n}`,t.pathname=r.join("/")}else t=vt(t);else if(n){const r=t.pathname==="/"?"":t.pathname;t.pathname=`/scope:${n}${r}`}return t}function vt(e){if(!be(e))return e;const n=new URL(e),t=n.pathname.split("/");return n.pathname="/"+t.slice(2).join("/"),n}const Hi="playground-log",Bi=(e,...n)=>{Q.dispatchEvent(new CustomEvent(Hi,{detail:{log:e,args:n}}))},Gi=(e,...n)=>{switch(typeof e.message=="string"?Reflect.set(e,"message",tn(e.message)):e.message.message&&typeof e.message.message=="string"&&Reflect.set(e.message,"message",tn(e.message.message)),e.severity){case fe.Debug:console.debug(e.message,...n);break;case fe.Info:console.info(e.message,...n);break;case fe.Warn:console.warn(e.message,...n);break;case fe.Error:console.error(e.message,...n);break;case fe.Fatal:console.error(e.message,...n);break;default:console.log(e.message,...n)}},Yi=e=>e instanceof Error?[e.message,e.stack].join(`
`):JSON.stringify(e,null,2),Rr=[],Dn=e=>{Rr.push(e)},Ar=e=>{if(e.raw===!0)Dn(e.message);else{const n=Ki(typeof e.message=="object"?Yi(e.message):e.message,e.severity,e.prefix??Fe.JS);Dn(n)}},fe={Fatal:{},Error:{name:"error",level:1},Warn:{name:"warn",level:2},Log:{name:"log",level:3},Info:{name:"info",level:4},Debug:{name:"debug",level:5}},Fe={JS:"JavaScript"};class Vi extends EventTarget{constructor(n=[]){super(),this.fatalErrorEvent="playground-fatal-error",this.severity=fe.Info,this.handlers=n}getLogs(){return this.handlers.includes(Ar)?[...Rr]:(this.error(`Logs aren't stored because the logToMemory handler isn't registered.
				If you're using a custom logger instance, make sure to register logToMemory handler.
			`),[])}logMessage(n,...t){const r={...n,severity:n.severity??fe.Log};for(const i of this.handlers)r.severity.level<=this.severity.level&&i(r,...t)}setSeverityFilterLevel(n){this.severity=n}log(n,...t){this.logMessage({message:n,severity:fe.Log,prefix:Fe.JS,raw:!1},...t)}debug(n,...t){this.logMessage({message:n,severity:fe.Debug,prefix:Fe.JS,raw:!1},...t)}info(n,...t){this.logMessage({message:n,severity:fe.Info,prefix:Fe.JS,raw:!1},...t)}warn(n,...t){this.logMessage({message:n,severity:fe.Warn,prefix:Fe.JS,raw:!1},...t)}error(n,...t){this.logMessage({message:n,severity:fe.Error,prefix:Fe.JS,raw:!1},...t)}}const Zi=()=>{try{}catch{}return[Ar,Gi,Bi]},Q=new Vi(Zi()),tn=e=>e.replace(/\t/g,""),Ki=(e,n,t)=>{const r=new Date,i=new Intl.DateTimeFormat("en-GB",{year:"numeric",month:"short",day:"2-digit",timeZone:"UTC"}).format(r).replace(/ /g,"-"),s=new Intl.DateTimeFormat("en-GB",{hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:!1,timeZone:"UTC",timeZoneName:"short"}).format(r),a=i+" "+s;return e=tn(e),`[${a}] ${t} ${n.name}: ${e}`},Qi=e=>{e.addEventListener("activate",()=>{e.clients.matchAll().then(n=>{const t={numberOfOpenPlaygroundTabs:n.filter(r=>r.frameType==="top-level").length};for(const r of n)r.postMessage(t)})})},Cr=Symbol("SleepFinished");function Ji(e){return new Promise(n=>{setTimeout(()=>n(Cr),e)})}class Xi extends Error{constructor(){super("Acquiring lock timed out")}}class It{constructor({concurrency:n,timeout:t}){this._running=0,this.concurrency=n,this.timeout=t,this.queue=[]}get remaining(){return this.concurrency-this.running}get running(){return this._running}async acquire(){if(this._running>=this.concurrency){const t=new Promise(r=>{this.queue.push(r)});if(this.timeout!==void 0){const r=this.queue.at(-1);if(await Promise.race([t,Ji(this.timeout)])===Cr)throw this.queue.splice(this.queue.indexOf(r),1),new Xi}else await t}this._running++;let n=!1;return()=>{n||(n=!0,this._running--,this.queue.length>0&&this.queue.shift()())}}async run(n){const t=await this.acquire();try{return await n()}finally{t()}}}function D(...e){function n(s){return s.substring(s.length-1)==="/"}let t=e.join("/");const r=t[0]==="/",i=n(t);return t=Ue(t),!t&&!r&&(t="."),t&&i&&!n(t)&&(t+="/"),t}function zi(e,n){if(e.includes("\0")||n.includes("\0"))return;const t=Ue(n);if(!t)return;const r=Ue(e.startsWith("/")?e:D(t,e));if(!(r===t||!ns(t,r)))return r}function $t(e){if(e==="/")return"/";e=Ue(e);const n=e.lastIndexOf("/");return n===-1?"":n===0?"/":e.substr(0,n)}function es(e){if(e==="/")return"/";e=Ue(e);const n=e.lastIndexOf("/");return n===-1?e:e.substr(n+1)}function Ue(e){const n=e[0]==="/";return e=ts(e.split("/").filter(t=>!!t),!n).join("/"),(n?"/":"")+e.replace(/\/$/,"")}function ts(e,n){let t=0;for(let r=e.length-1;r>=0;r--){const i=e[r];i==="."?e.splice(r,1):i===".."?(e.splice(r,1),t++):t&&(e.splice(r,1),t--)}if(n)for(;t;t--)e.unshift("..");return e}function ns(e,n){return e==="/"?!0:(e=Ue(e),n=Ue(n),n.startsWith(e+"/")||n===e)}function Ir(e=36,n="!@#$%^&*()_+=-[]/.,<>?"){const t="0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"+n;let r="";for(let i=e;i>0;--i)r+=t[Math.floor(Math.random()*t.length)];return r}function kt(){return Ir(36,"-_")}function rs(e){return is(new TextEncoder().encode(e))}function is(e){const t=[];for(let r=0;r<e.length;r+=65536)t.push(String.fromCharCode(...e.subarray(r,r+65536)));return btoa(t.join(""))}function X(e){return`json_decode(base64_decode('${rs(JSON.stringify(e))}'), true)`}function at(e){const n={};for(const t in e)n[t]=X(e[t]);return n}(function(){return typeof process<"u"&&process.release?.name==="node"?"NODE":typeof window<"u"?"WEB":typeof WorkerGlobalScope<"u"&&self instanceof WorkerGlobalScope?"WORKER":"NODE"})();ReadableStream.prototype[Symbol.asyncIterator]||(ReadableStream.prototype[Symbol.asyncIterator]=async function*(){const e=this.getReader();try{for(;;){const{done:n,value:t}=await e.read();if(n)return;yield t}}finally{e.releaseLock()}},ReadableStream.prototype.iterate=ReadableStream.prototype[Symbol.asyncIterator]);new It({concurrency:10});function ss(e,n){for(const t of n)if(new RegExp(t.match).test(e)){e=e.replace(t.match,t.replacement);break}return e}async function hn(e,n,t,{rmRoot:r=!1}={}){const i=Or(n,t);r&&await e.isDir(n)&&await e.rmdir(n,{recursive:!0});for(const[s,a]of i)await e.fileExists($t(s))||await e.mkdir($t(s)),await e.writeFile(s,a)}function Or(e,n){return Object.entries(n).flatMap(([t,r])=>{const i=zi(t,e);if(!i)throw new Error(`Invalid file tree path ${JSON.stringify(t)}: it must resolve inside ${JSON.stringify(e)}.`);return r instanceof Uint8Array||typeof r=="string"?[[i,r]]:Or(i,r)})}/**
 * Original, unmodified Comlink library from Google:
 *
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */const Lr=Symbol("Comlink.proxy"),as=Symbol("Comlink.endpoint"),os=Symbol("Comlink.releaseProxy"),Ft=Symbol("Comlink.finalizer"),xt=Symbol("Comlink.thrown");/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */const St={RAW:"RAW",HANDLER:"HANDLER"},oe={GET:"GET",SET:"SET",APPLY:"APPLY",CONSTRUCT:"CONSTRUCT",ENDPOINT:"ENDPOINT",RELEASE:"RELEASE"},Ur=e=>typeof e=="object"&&e!==null||typeof e=="function",cs={canHandle:e=>Ur(e)&&e[Lr],serialize(e){const{port1:n,port2:t}=new MessageChannel;return Nr(e,n),[t,[t]]},deserialize(e){return e.start(),us(e)}},ls={canHandle:e=>Ur(e)&&xt in e,serialize({value:e}){let n;return e instanceof Error?n={isError:!0,value:{message:e.message,name:e.name,stack:e.stack}}:n={isError:!1,value:e},[n,[]]},deserialize(e){throw e.isError?Object.assign(new Error(e.value.message),e.value):e.value}},Ot=new Map([["proxy",cs],["throw",ls]]);function fs(e,n){for(const t of e)if(n===t||t==="*"||t instanceof RegExp&&t.test(n))return!0;return!1}function Nr(e,n=globalThis,t=["*"],r){n.addEventListener("message",function i(s){if(!s||!s.data)return;if(!fs(t,s.origin)){console.warn(`Invalid origin '${s.origin}' for comlink proxy`);return}const{id:a,type:c,path:o}={path:[],...s.data},f=(s.data.argumentList||[]).map(Le);let d;try{const h=o.slice(0,-1).reduce((_,k)=>_[k],e),m=o.reduce((_,k)=>_[k],e);switch(c){case oe.GET:d=m;break;case oe.SET:h[o.slice(-1)[0]]=Le(s.data.value),d=!0;break;case oe.APPLY:d=m.apply(h,f);break;case oe.CONSTRUCT:{const _=new m(...f);d=ws(_)}break;case oe.ENDPOINT:{const{port1:_,port2:k}=new MessageChannel;Nr(e,k),d=_s(_,[_])}break;case oe.RELEASE:d=void 0;break;default:return}}catch(h){d={value:h,[xt]:0}}Promise.resolve(d).catch(h=>({value:h,[xt]:0})).then(h=>{const[m,_]=Pt(h);n.postMessage({...m,id:a},_),c===oe.RELEASE&&(n.removeEventListener("message",i),Wr(n),Ft in e&&typeof e[Ft]=="function"&&e[Ft]())}).catch(()=>{const[h,m]=Pt({value:new TypeError("Unserializable return value"),[xt]:0});n.postMessage({...h,id:a},m)}).finally(()=>{})}),n.start&&n.start()}function ds(e){return e.constructor.name==="MessagePort"}function Wr(e){ds(e)&&e.close()}function us(e,n){const t=new Map;return e.addEventListener("message",function(i){const{data:s}=i;if(!s||!s.id)return;const a=t.get(s.id);if(a)try{a(s)}finally{t.delete(s.id)}}),nn(e,t,[],n)}function ct(e){if(e)throw new Error("Proxy has been released and is not useable")}function qr(e){return je(e,new Map,{type:oe.RELEASE}).then(()=>{Wr(e)})}const Et=new WeakMap,Tt="FinalizationRegistry"in globalThis&&new FinalizationRegistry(e=>{const n=(Et.get(e)||0)-1;Et.set(e,n),n===0&&qr(e)});function ps(e,n){const t=(Et.get(n)||0)+1;Et.set(n,t),Tt&&Tt.register(e,n,e)}function ms(e){Tt&&Tt.unregister(e)}function nn(e,n,t=[],r=function(){}){let i=!1;const s=new Proxy(r,{get(a,c){if(ct(i),c===os)return()=>{ms(s),qr(e),n.clear(),i=!0};if(c==="then"){if(t.length===0)return{then:()=>s};const o=je(e,n,{type:oe.GET,path:t.map(f=>f.toString())}).then(Le);return o.then.bind(o)}return nn(e,n,[...t,c])},set(a,c,o){ct(i);const[f,d]=Pt(o);return je(e,n,{type:oe.SET,path:[...t,c].map(h=>h.toString()),value:f},d).then(Le)},apply(a,c,o){ct(i);const f=t[t.length-1];if(f===as)return je(e,n,{type:oe.ENDPOINT}).then(Le);if(f==="bind")return nn(e,n,t.slice(0,-1));const[d,h]=Mn(o);return je(e,n,{type:oe.APPLY,path:t.map(m=>m.toString()),argumentList:d},h).then(Le)},construct(a,c){ct(i);const[o,f]=Mn(c);return je(e,n,{type:oe.CONSTRUCT,path:t.map(d=>d.toString()),argumentList:o},f).then(Le)}});return ps(s,e),s}function hs(e){return Array.prototype.concat.apply([],e)}function Mn(e){const n=e.map(Pt);return[n.map(t=>t[0]),hs(n.map(t=>t[1]))]}const Dr=new WeakMap;function _s(e,n){return Dr.set(e,n),e}function ws(e){return Object.assign(e,{[Lr]:!0})}function Pt(e){for(const[n,t]of Ot)if(t.canHandle(e)){const[r,i]=t.serialize(e);return[{type:St.HANDLER,name:n,value:r},i]}return[{type:St.RAW,value:e},Dr.get(e)||[]]}function Le(e){switch(e.type){case St.HANDLER:return Ot.get(e.name).deserialize(e.value);case St.RAW:return e.value}}function je(e,n,t,r){return new Promise(i=>{const s=gs();n.set(s,i),e.start&&e.start(),e.postMessage({id:s,...t},r)})}function gs(){return new Array(4).fill(0).map(()=>Math.floor(Math.random()*Number.MAX_SAFE_INTEGER).toString(16)).join("-")}const xs=[Error,EvalError,RangeError,ReferenceError,SyntaxError,TypeError,URIError,AggregateError,globalThis.DOMException,globalThis.AssertionError,globalThis.SystemError].filter(Boolean).map(e=>[e.name,e]),ys=new Map(xs);class _n extends Error{constructor(n){super(_n._prepareSuperMessage(n)),this.name="NonError"}static _prepareSuperMessage(n){try{return JSON.stringify(n)}catch{return String(n)}}}const bs=[{property:"name",enumerable:!1},{property:"message",enumerable:!1},{property:"stack",enumerable:!1},{property:"code",enumerable:!0},{property:"cause",enumerable:!1},{property:"errors",enumerable:!1}],rn=new WeakSet,vs=e=>{rn.add(e);const n=e.toJSON();return rn.delete(e),n},Mr=e=>{const n=ys.get(e)??Error;return n===AggregateError?new n([]):new n},wn=({from:e,seen:n,to:t,forceEnumerable:r,maxDepth:i,depth:s,useToJSON:a,serialize:c})=>{if(t||(Array.isArray(e)?t=[]:!c&&Fn(e)?t=Mr(e.name):t={}),n.push(e),s>=i)return t;if(a&&typeof e.toJSON=="function"&&!rn.has(e))return vs(e);const o=f=>wn({from:f,seen:[...n],forceEnumerable:r,maxDepth:i,depth:s,useToJSON:a,serialize:c});for(const[f,d]of Object.entries(e)){if(d&&d instanceof Uint8Array&&d.constructor.name==="Buffer"){t[f]="[object Buffer]";continue}if(d!==null&&typeof d=="object"&&typeof d.pipe=="function"){t[f]="[object Stream]";continue}if(typeof d!="function"){if(!d||typeof d!="object"){try{t[f]=d}catch{}continue}if(!n.includes(e[f])){s++,t[f]=o(e[f]);continue}t[f]="[Circular]"}}if(c||t instanceof Error)for(const{property:f,enumerable:d}of bs)e[f]!==void 0&&e[f]!==null&&Object.defineProperty(t,f,{value:Fn(e[f])||Array.isArray(e[f])?o(e[f]):e[f],enumerable:r?!0:d,configurable:!0,writable:!0});return t};function $s(e,n={}){const{maxDepth:t=Number.POSITIVE_INFINITY,useToJSON:r=!0}=n;return typeof e=="object"&&e!==null?wn({from:e,seen:[],forceEnumerable:!0,maxDepth:t,depth:0,useToJSON:r,serialize:!0}):typeof e=="function"?`[Function: ${e.name||"anonymous"}]`:e}function ks(e,n={}){const{maxDepth:t=Number.POSITIVE_INFINITY}=n;return e instanceof Error?e:Ss(e)?wn({from:e,seen:[],to:Mr(e.name),maxDepth:t,depth:0,serialize:!1}):new _n(e)}function Fn(e){return!!e&&typeof e=="object"&&typeof e.name=="string"&&typeof e.message=="string"&&typeof e.stack=="string"}function Ss(e){return!!e&&typeof e=="object"&&typeof e.message=="string"&&!Array.isArray(e)}function Es(e){return new ReadableStream({start(n){const t=i=>{const s=i.data;if(s)switch(s.t){case"chunk":try{n.enqueue(new Uint8Array(s.b))}catch{r()}break;case"close":As(n),r();break;case"error":Rs(n,new Error(s.m||"Stream error")),r();break}},r=()=>{try{e.removeEventListener?.("message",t)}catch{}try{e.onmessage=null}catch{}try{e.close()}catch{}};e.addEventListener?e.addEventListener("message",t):e.on?e.on("message",i=>t({data:i})):e.onmessage=t,typeof e.start=="function"&&e.start()},cancel(){try{e.postMessage({t:"cancel"})}catch{}try{e.close()}catch{}}})}const Ts=Ot.get("throw"),Ps={canHandle:Ts.canHandle,serialize:({value:e})=>{let n;return e instanceof Error?(n={isError:!0,value:$s(e)},n.value.originalErrorClassName=e.constructor.name):n={isError:!1,value:e},[n,[]]},deserialize:e=>{if(e.isError){const n=ks(e.value),t=new Error("Comlink method call failed");let r=n;for(;r.cause;)r=r.cause;throw r.cause=t,n}throw e.value}};Ot.set("throw",Ps);function Rs(e,n){try{e.error(n)}catch{}}function As(e){try{e.close()}catch{}}BigInt(Number.MAX_SAFE_INTEGER);const Cs=25e3;let Is=0;function Os(){return++Is}function Fr(e,n,t=Cs){return new Promise((r,i)=>{const s=c=>{c.data.type==="response"&&c.data.requestId===n&&(e.removeEventListener("message",s),clearTimeout(a),r(c.data.response))},a=setTimeout(()=>{i(new Error("Request timed out")),e.removeEventListener("message",s)},t);e.addEventListener("message",s)})}async function Ls(e){let n=new URL(e.request.url);if(!be(n))try{const o=new URL(e.request.referrer);n=tt(n,et(o))}catch{}const t=e.request.headers.get("content-type"),r=e.request.method==="POST"?new Uint8Array(await e.request.clone().arrayBuffer()):void 0,i={};for(const o of e.request.headers.entries())i[o[0]]=o[1];let s;try{const o={method:"request",args:[{body:r,url:n.toString(),method:e.request.method,headers:{...i,Host:n.host,"User-agent":self.navigator.userAgent,"Content-type":t}}]},f=et(n);if(f===null)throw new Error(`The URL ${n.toString()} is not scoped. This should not happen.`);const d=await jr(o,f);if(s=await Fr(self,d),delete s.headers["x-frame-options"],s.headers["content-security-policy"]){const h=s.headers["content-security-policy"].map(m=>Ns("frame-ancestors",m)).filter(m=>m.trim().length>0);h.length>0?s.headers["content-security-policy"]=h:delete s.headers["content-security-policy"]}}catch(o){throw console.error(o,{url:n.toString()}),o}if(s.httpStatusCode>=300&&s.httpStatusCode<=399&&s.headers.location){const o=et(n);let f=new URL(s.headers.location[0],n.toString());return o&&!be(f)&&(f=tt(f,o)),Response.redirect(f.toString(),s.httpStatusCode)}const a=[101,103,204,205,304].includes(s.httpStatusCode);let c=null;return a||(s.bodyPort?c=Es(s.bodyPort):c=s.bytes),new Response(c,{headers:s.headers,status:s.httpStatusCode})}async function jr(e,n){const t=Os();for(const r of await self.clients.matchAll({includeUncontrolled:!0}))r.postMessage({...e,scope:n,requestId:t});return t}async function Us(e,n){let t;return["GET","HEAD"].includes(e.method)?t=void 0:"body"in n?t=n.body:!e.bodyUsed&&e.body?t=e.body:t=await e.arrayBuffer(),new Request(n.url||e.url,{signal:e.signal,body:t,method:e.method,headers:e.headers,referrer:e.referrer,referrerPolicy:e.referrerPolicy,mode:e.mode==="navigate"?"same-origin":e.mode,credentials:e.credentials,cache:e.cache,redirect:e.redirect,integrity:e.integrity,...t instanceof ReadableStream&&{duplex:"half"},...n})}function Ns(e,n){const t=/^[\u{9}\u{A}\u{C}\u{D}\u{20}]+/u,r=/[\u{9}\u{A}\u{C}\u{D}\u{20}]+$/u,i=/[\u{9}\u{A}\u{C}\u{D}\u{20}]/u;return n.split(";").filter(s=>{const a=s.replace(t,"").replace(r,""),[c]=a.split(i,1);return c.toLowerCase()!==e.toLowerCase()}).join(";")}const Ws=100,qs=400*1024,sn="PLAYGROUND_UNZIP_PROGRESS:",gn=async(e,n,t,r=!0,i)=>{const s=`/tmp/file-${Math.random()}.zip`;let a=!1;try{if(n instanceof File){const f=n;n=s,a=!0,await e.writeFile(n,new Uint8Array(await f.arrayBuffer()))}const o={code:`<?php
		$zipPath = getenv('PLAYGROUND_UNZIP_ZIP_PATH');
		$extractTo = getenv('PLAYGROUND_UNZIP_EXTRACT_TO_PATH');
		$overwriteFiles =
			getenv('PLAYGROUND_UNZIP_OVERWRITE_FILES') === '1';
		$reportProgress =
			getenv('PLAYGROUND_UNZIP_REPORT_PROGRESS') === '1';
		$filesInterval =
			intval(getenv('PLAYGROUND_UNZIP_FILES_INTERVAL'));
		$uncompressedBytesInterval = intval(
			getenv('PLAYGROUND_UNZIP_UNCOMPRESSED_BYTES_INTERVAL')
		);
		$linePrefix = getenv('PLAYGROUND_UNZIP_LINE_PREFIX');

		if (!is_dir($extractTo)) {
			mkdir($extractTo, 0777, true);
		}
		$zip = new ZipArchive;
		$res = $zip->open($zipPath);
		if ($res !== TRUE) {
			$fileSize = file_exists($zipPath) ? filesize($zipPath) : 'unknown';
			throw new Exception(
				"Could not unzip file. Error code: " . $res .
				". File size: " . $fileSize . " bytes."
			);
		}

		try {
			$totalFiles = 0;
			$totalUncompressedBytes = 0;
			if ($reportProgress) {
				for ($i = 0; $i < $zip->numFiles; $i++) {
					$stat = $zip->statIndex($i);
					if ($stat === false) {
						throw new Exception(
							"Could not inspect ZIP entry " . $i . "."
						);
					}
					if (substr($stat['name'], -1) !== '/') {
						$totalFiles++;
						$totalUncompressedBytes += $stat['size'];
					}
				}
			}

			// Keep one extraction path for all callers. Progress reporting only
			// adds the totals scan above and emits an update between batches.
			$filesProcessed = 0;
			$uncompressedBytesProcessed = 0;
			$filesSinceUpdate = 0;
			$uncompressedBytesSinceUpdate = 0;
			$lastProgressYieldAt = 0;
			$entriesToExtract = array();
			for ($i = 0; $i < $zip->numFiles; $i++) {
				$stat = $zip->statIndex($i);
				if ($stat === false) {
					throw new Exception(
						"Could not inspect ZIP entry " . $i . "."
					);
				}
				$filename = $stat['name'];
				$isDirectory = substr($filename, -1) === '/';
				$extractFilePath =
					rtrim($extractTo, '/') . '/' . $filename;
				// Leave existing paths out when $overwriteFiles is false.
				if ($overwriteFiles || !file_exists($extractFilePath)) {
					$entriesToExtract[] = $filename;
				}
				if ($isDirectory) {
					continue;
				}

				$filesProcessed++;
				$uncompressedBytesProcessed += $stat['size'];
				$filesSinceUpdate++;
				$uncompressedBytesSinceUpdate += $stat['size'];
				if (
					$filesSinceUpdate >= $filesInterval ||
					$uncompressedBytesSinceUpdate >=
						$uncompressedBytesInterval
				) {
					extractZipBatch($zip, $extractTo, $entriesToExtract);
					if ($reportProgress) {
						reportUnzipProgress(
							$linePrefix,
							$filesProcessed,
							$totalFiles,
							$uncompressedBytesProcessed,
							$totalUncompressedBytes,
							$lastProgressYieldAt
						);
					}
					$filesSinceUpdate = 0;
					$uncompressedBytesSinceUpdate = 0;
				}
			}
			extractZipBatch($zip, $extractTo, $entriesToExtract);
			if (
				$reportProgress &&
				($filesSinceUpdate > 0 ||
					$uncompressedBytesSinceUpdate > 0 ||
					$totalFiles === 0)
			) {
				reportUnzipProgress(
					$linePrefix,
					$filesProcessed,
					$totalFiles,
					$uncompressedBytesProcessed,
					$totalUncompressedBytes,
					$lastProgressYieldAt
				);
			}
		} catch (Exception $e) {
			// PHP 5.2 does not support finally.
			$zip->close();
			throw $e;
		}
		$zip->close();
		chmod($extractTo, 0777);

		/**
		 * Extracts and clears the queued ZIP entries.
		 *
		 * @param ZipArchive $zip       Open archive containing the entries.
		 * @param string     $extractTo Destination directory.
		 * @param array      $entries   Entry names to extract.
		 * @return void
		 * @throws Exception When ZipArchive cannot extract the queued entries.
		 */
		function extractZipBatch($zip, $extractTo, &$entries)
		{
			if (count($entries) === 0) {
				return;
			}
			if (!$zip->extractTo($extractTo, $entries)) {
				throw new Exception("Could not extract ZIP entries.");
			}
			$entries = array();
		}

		/**
		 * Writes and flushes one prefixed JSON progress record.
		 *
		 * @param string $linePrefix                Progress record prefix.
		 * @param int    $filesProcessed             Files processed so far.
		 * @param int    $totalFiles                 Total files in the archive.
		 * @param int    $uncompressedBytesProcessed Bytes processed so far.
		 * @param int    $totalUncompressedBytes     Total uncompressed bytes.
		 * @param float  $lastProgressYieldAt        Last event-loop yield time.
		 * @return void
		 */
		function reportUnzipProgress(
			$linePrefix,
			$filesProcessed,
			$totalFiles,
			$uncompressedBytesProcessed,
			$totalUncompressedBytes,
			&$lastProgressYieldAt
		) {
			$now = microtime(true);
			// Limit event-loop yields to keep large imports fast.
			$shouldYield =
				$lastProgressYieldAt === 0 ||
				$filesProcessed === $totalFiles ||
				$now - $lastProgressYieldAt >= 0.05;
			echo $linePrefix . json_encode(array(
				'filesProcessed' => $filesProcessed,
				'totalFiles' => $totalFiles,
				'uncompressedBytesProcessed' => $uncompressedBytesProcessed,
				'totalUncompressedBytes' => $totalUncompressedBytes,
			)) . "\\n";
			flush();
			// PHP 5.2's Asyncify build cannot suspend from a nested function call.
			if ($shouldYield && PHP_MAJOR_VERSION >= 7) {
				// PHP runs synchronously inside the worker. Yield so stdout can cross
				// the worker boundary before extraction finishes.
				usleep(0);
				$lastProgressYieldAt = microtime(true);
			}
		}
		`,env:{PLAYGROUND_UNZIP_ZIP_PATH:n,PLAYGROUND_UNZIP_EXTRACT_TO_PATH:t,PLAYGROUND_UNZIP_OVERWRITE_FILES:r?"1":"0",PLAYGROUND_UNZIP_REPORT_PROGRESS:i?"1":"0",PLAYGROUND_UNZIP_FILES_INTERVAL:String(Ws),PLAYGROUND_UNZIP_UNCOMPRESSED_BYTES_INTERVAL:String(qs),PLAYGROUND_UNZIP_LINE_PREFIX:sn}};i?await Ds(e,o,i):await e.run(o)}finally{if(a)try{await e.fileExists(s)&&await e.unlink(s)}catch{}}};async function Ds(e,n,t){const r=await e.runStream(n),i=r.stderrText,s=r.stdout.getReader(),a=new TextDecoder;let c="",o;const f=m=>{if(m.startsWith(sn))try{t(JSON.parse(m.slice(sn.length)))}catch(_){o??=_}};try{for(;;){const{done:m,value:_}=await s.read();c+=a.decode(_,{stream:!m});let k=c.indexOf(`
`);for(;k!==-1;)f(c.slice(0,k)),c=c.slice(k+1),k=c.indexOf(`
`);if(m)break}}finally{s.releaseLock()}c&&f(c);const[d,h]=await Promise.all([r.exitCode,i]);if(d!==0)throw new Error(h.trim()||`Could not unzip file. PHP exited with code ${d}.`);if(o)throw o}const Ms="@playground-managed";new TextDecoder;var Hr=`<?php

/**
 * Transforms the "wp-config.php" file.
 *
 * This parses the "wp-config.php" file contents into a token array and provides
 * methods to modify it and serialize it back to a string with the modifications.
 */
class WP_Config_Transformer {
	/**
	 * The tokens of the wp-config.php file.
	 *
	 * @var array<array|string>
	 */
	private $tokens;

	/**
	 * Constructor.
	 *
	 * @param string $content The contents of the wp-config.php file.
	 */
	public function __construct( string $content ) {
		$this->tokens = token_get_all( $content );

		// Check if the file is a valid PHP file.
		$is_valid_php_file = false;
		foreach ( $this->tokens as $token ) {
			if ( is_array( $token ) && T_OPEN_TAG === $token[0] ) {
				$is_valid_php_file = true;
				break;
			}
		}
		if ( ! $is_valid_php_file ) {
			throw new Exception( "The 'wp-config.php' file is not a valid PHP file." );
		}
	}

	/**
	 * Create a new config transformer instance from a file.
	 *
	 * @param string $path The path to the wp-config.php file.
	 * @return self        The new config transformer instance.
	 */
	public static function from_file( string $path ): self {
		if ( ! is_file( $path ) ) {
			throw new Exception( sprintf( "The '%s' file does not exist.", $path ) );
		}
		return new self( file_get_contents( $path ) );
	}

	/**
	 * Get the transformed wp-config.php file contents.
	 *
	 * @return string The transformed wp-config.php file contents.
	 */
	public function to_string(): string {
		$output = '';
		foreach ( $this->tokens as $token ) {
			$output .= is_array( $token ) ? $token[1] : $token;
		}
		return $output;
	}

	/**
	 * Save the transformed wp-config.php file contents to a file.
	 *
	 * @param string $path The path to the wp-config.php file.
	 */
	public function to_file( string $path ): void {
		$result = file_put_contents( $path, $this->to_string() );
		if ( false === $result ) {
			throw new Exception( sprintf( "Failed to write to the '%s' file.", $path ) );
		}
	}

	/**
	 * Check if a constant is defined in the wp-config.php file.
	 *
	 * @param  string $name The name of the constant.
	 * @return bool         True if the constant is defined, false otherwise.
	 */
	public function constant_exists( string $name ): bool {
		foreach ( $this->tokens as $i => $token ) {
			$is_string_token = is_array( $token ) && T_STRING === $token[0];
			if ( $is_string_token && 'define' === strtolower( $token[1] ) ) {
				$args       = $this->collect_function_call_argument_locations( $i );
				$const_name = $this->evaluate_constant_name(
					array_slice( $this->tokens, $args[0][0], $args[0][1] )
				);
				if ( $name === $const_name ) {
					return true;
				}
			}
		}
		return false;
	}

	/**
	 * Define a constant in the wp-config.php file.
	 *
	 * @param string $name  The name of the constant.
	 * @param mixed  $value The value of the constant.
	 */
	public function define_constant( string $name, $value ): void {
		// Tokenize the new constant value for insertion in the tokens array.
		$definition_tokens = token_get_all(
			sprintf(
				"<?php define( %s, %s );\\n",
				var_export( $name, true ),
				var_export( $value, true )
			)
		);

		// Full constant definition statement, e.g.: define( 'WP_DEBUG', true );\\n
		$define_tokens = array_slice( $definition_tokens, 1 );

		// The value of the constant, e.g.: "my-database-name"
		$value_tokens = array_slice( $definition_tokens, 7, -4 );

		// Collect all locations where the constant value needs to be updated.
		$updates = array();
		foreach ( $this->tokens as $i => $token ) {
			$is_string_token = is_array( $token ) && T_STRING === $token[0];
			if ( $is_string_token && 'define' === strtolower( $token[1] ) ) {
				$args       = $this->collect_function_call_argument_locations( $i );
				$const_name = $this->evaluate_constant_name(
					array_slice( $this->tokens, $args[0][0], $args[0][1] )
				);

				if ( $name === $const_name ) {
					$updates[] = $args[1];
				}
			}
		}

		// Modify the token array to define the constant. Apply updates in reverse
		// order, so splices at earlier positions don't shift indices after them.
		for ( $i = count( $updates ) - 1; $i >= 0; $i -= 1 ) {
			list ( $value_start, $value_length ) = $updates[ $i ];
			array_splice( $this->tokens, $value_start, $value_length, $value_tokens );
		}

		// If it's a new constant, inject it at the anchor location.
		if ( 0 === count( $updates ) ) {
			$anchor = $this->get_new_constant_location();
			array_splice( $this->tokens, $anchor, 0, $define_tokens );

			/*
			 * Ensure at least one newline (one "\\n") before the new constant.
			 * This must be done after inserting the constant definition in order
			 * to avoid shifting the anchor location when a new token is inserted.
			 */
			$this->ensure_newlines( $anchor - 1, 1 );
		}
	}

	/**
	 * Define multiple constants in the wp-config.php file.
	 *
	 * @param array<string, mixed> $constants An array of name-value pairs of constants to define.
	 */
	public function define_constants( array $constants ): void {
		foreach ( $constants as $name => $value ) {
			$this->define_constant( $name, $value );
		}
	}

	/**
	 * Inject code block into the wp-config.php file.
	 *
	 * @param string $code The code to inject.
	 */
	public function inject_code_block( string $code ): void {
		// Tokenize the injected code for insertion in the token array.
		$tokens      = token_get_all( sprintf( '<?php %s', trim( $code ) ) );
		$code_tokens = array_slice( $tokens, 1 );

		// Inject the code at the anchor location.
		$anchor = $this->get_injected_code_location();
		array_splice( $this->tokens, $anchor, 0, $code_tokens );

		/*
		 * Ensure empty line before and after the code block (at least two "\\n").
		 * This must be done after inserting the injected code, and the location
		 * AFTER must be updated prior to the location BEFORE, in order to avoid
		 * shifting the anchor location when a new token is inserted.
		 */
		$this->ensure_newlines( $anchor + count( $code_tokens ), 2 );
		$this->ensure_newlines( $anchor - 1, 2 );
	}

	/**
	 * Remove code block defined by two comment fragments from the wp-config.php file.
	 *
	 * @param string $from_comment_fragment A comment fragment from which to remove the code.
	 * @param string $to_comment_fragment   A comment fragment to which to remove the code.
	 */
	public function remove_code_block( string $from_comment_fragment, string $to_comment_fragment ): void {
		$start = $this->find_first_token_location( T_COMMENT, $from_comment_fragment );
		$end   = $this->find_first_token_location( T_COMMENT, $to_comment_fragment );
		if ( null === $start || null === $end ) {
			return;
		}

		// Remove the code, including the comment fragments.
		array_splice( $this->tokens, $start, $end - $start + 1 );

		// If previous and next tokens are whitespace, merge them.
		$prev = $this->tokens[ $start - 1 ];
		$next = $this->tokens[ $start ] ?? null;
		if (
			is_array( $prev ) && T_WHITESPACE === $prev[0]
			&& is_array( $next ) && T_WHITESPACE === $next[0]
		) {
			$this->tokens[ $start - 1 ][1] = $prev[1] . $next[1];
			array_splice( $this->tokens, $start, 1 );
		}

		// Remove up to two empty lines (before & after), keeping at least one.
		$token = $this->tokens[ $start - 1 ];
		if ( is_array( $token ) && T_WHITESPACE === $token[0] ) {
			$newlines = substr_count( $token[1], "\\n" );
			if ( $newlines > 2 ) {
				$limit = min( $newlines - 2, 4 );
				$value = $token[1];
				for ( $i = 0; $limit > 0; $i += 1 ) {
					if ( "\\n" === $value[ $i ] ) {
						$value  = substr_replace( $value, '', $i, 1 );
						$limit -= 1;
					}
				}
				$this->tokens[ $start - 1 ][1] = $value;
			}
		}
	}

	/**
	 * Parse arguments of a function call and collect their locations.
	 *
	 * @param  int $start             The location of the first token of the function call.
	 * @return array<array<int, int>> The arguments of the function call.
	 */
	private function collect_function_call_argument_locations( int $start ): array {
		// Find location of the opening parenthesis after the function name.
		$i = $start;
		while ( '(' !== $this->tokens[ $i ] ) {
			$i += 1;
		}
		$i += 1;

		// Collect all function call argument locations.
		$args         = array();
		$arg_start    = $this->skip_whitespace_and_comments( $i );
		$parens_level = 0;
		for ( $i = $arg_start; $i < count( $this->tokens ); $i += 1 ) {
			// Skip whitespace and comments, but preserve the index of the last
			// non-whitespace token to calculate the exact argument boundaries.
			$prev_i = $i;
			$i      = $this->skip_whitespace_and_comments( $i );
			$token  = $this->tokens[ $i ];

			if ( 0 === $parens_level && ( ',' === $token || ')' === $token ) ) {
				$args[] = array( $arg_start, $prev_i - $arg_start );
				if ( ',' === $token ) {
					// Start of the next argument.
					$arg_start = $this->skip_whitespace_and_comments( $i + 1 );
					$i         = $arg_start;
				} else {
					// End of the argument list.
					break;
				}
			} elseif ( '(' === $token || '[' === $token || '{' === $token ) {
				$parens_level += 1;
			} elseif ( ')' === $token || ']' === $token || '}' === $token ) {
				$parens_level -= 1;
			}
		}
		return $args;
	}

	/**
	 * Evaluate the constant name value from its tokens.
	 *
	 * @param  array $name_tokens The tokens containing the constant name.
	 * @return string|null        The evaluated constant name.
	 */
	private function evaluate_constant_name( array $name_tokens ): ?string {
		// Decide whether the array represents a constant name or an expression.
		$name_token = null;
		foreach ( $name_tokens as $token ) {
			if ( $this->is_whitespace( $token ) ) {
				continue;
			}
			if ( is_array( $token ) ) {
				if ( T_STRING === $token[0] || T_CONSTANT_ENCAPSED_STRING === $token[0] ) {
					$name_token = $token;
				} else {
					return null;
				}
			} elseif ( '(' !== $token && ')' !== $token ) {
				return null;
			}
		}

		if ( null === $name_token ) {
			return null;
		}

		// Get the constant name value.
		return eval( 'return ' . $name_token[1] . ';' );
	}

	/**
	 * Skip whitespace and comment tokens and return the location of the first
	 * non-whitespace and non-comment token after the specified start location.
	 *
	 * @param  int $start The start location in the token array.
	 * @return int        The location of the first non-whitespace and non-comment token.
	 */
	private function skip_whitespace_and_comments( int $start ): int {
		for ( $i = $start; $i < count( $this->tokens ); $i += 1 ) {
			if ( $this->is_whitespace( $this->tokens[ $i ] ) ) {
				continue;
			}
			break;
		}
		return $i;
	}

	/**
	 * Ensure minimum number of newlines are present at the given index.
	 *
	 * @param int $index The index of the token to ensure newlines.
	 * @param int $count The number of newlines that should be present.
	 */
	private function ensure_newlines( int $index, int $count ): void {
		$token = $this->tokens[ $index ] ?? null;
		if ( is_array( $token ) && ( T_WHITESPACE === $token[0] || T_OPEN_TAG === $token[0] ) ) {
			$newlines = substr_count( $token[1], "\\n" );
			if ( $newlines < $count ) {
				$this->tokens[ $index ][1] .= str_repeat( "\\n", $count - $newlines );
			}
		} else {
			$new_token = array( T_WHITESPACE, str_repeat( "\\n", $count ) );
			array_splice( $this->tokens, $index, 0, array( $new_token ) );
		}
	}

	/**
	 * Get the location to inject new constant definitions in the token array.
	 *
	 * @return int The location for new constant definitions in the token array.
	 */
	private function get_new_constant_location(): int {
		// First try to find the "That's all, stop editing!" comment.
		$anchor = $this->find_first_token_location( T_COMMENT, "That's all, stop editing!" );
		if ( null !== $anchor ) {
			return $anchor;
		}

		// If not found, try the "Absolute path to the WordPress directory." doc comment.
		$anchor = $this->find_first_token_location( T_DOC_COMMENT, 'Absolute path to the WordPress directory.' );
		if ( null !== $anchor ) {
			return $anchor;
		}

		// If not found, try the "Sets up WordPress vars and included files." doc comment.
		$anchor = $this->find_first_token_location( T_DOC_COMMENT, 'Sets up WordPress vars and included files.' );
		if ( null !== $anchor ) {
			return $anchor;
		}

		// If not found, try "require_once ABSPATH . 'wp-settings.php';".
		$anchor = $this->find_first_token_location( T_REQUIRE_ONCE );
		if ( null !== $anchor ) {
			return $anchor;
		}

		// If not found, fall back to the PHP opening tag.
		$open_tag_anchor = $this->find_first_token_location( T_OPEN_TAG );
		if ( null !== $open_tag_anchor ) {
			return $open_tag_anchor + 1;
		}

		// If we still don't have an anchor, the file is not a valid PHP file.
		throw new Exception( "The 'wp-config.php' file is not a valid PHP file." );
	}

	/**
	 * Get the location to inject new code in the token array.
	 *
	 * @return int The location for injected code in the token array.
	 */
	private function get_injected_code_location(): int {
		// First try to find the "/** Sets up WordPress vars and included files. */" comment.
		$anchor = $this->find_first_token_location( T_DOC_COMMENT, 'Sets up WordPress vars and included files.' );
		if ( null !== $anchor ) {
			return $anchor;
		}

		// If not found, try "require_once ABSPATH . 'wp-settings.php';".
		$anchor = $this->find_require_wp_settings_location();
		if ( null !== $anchor ) {
			return $anchor;
		}

		// If not found, fall back to the PHP opening tag.
		$open_tag_anchor = $this->find_first_token_location( T_OPEN_TAG );
		if ( null !== $open_tag_anchor ) {
			return $open_tag_anchor + 1;
		}

		// If we still don't have an anchor, the file is not a valid PHP file.
		throw new Exception( "The 'wp-config.php' file is not a valid PHP file." );
	}

	/**
	 * Find location of the "wp-settings.php" require statement in the token array.
	 *
	 * This method searches for the following statement:
	 *
	 *   require_once ABSPATH . 'wp-settings.php';
	 *
	 * @return int|null The location of the require statement.
	 */
	private function find_require_wp_settings_location(): ?int {
		$require_anchor = $this->find_first_token_location( T_REQUIRE_ONCE );
		if ( null === $require_anchor ) {
			return null;
		}

		$abspath = $this->tokens[ $require_anchor + 2 ] ?? null;
		$path    = $this->tokens[ $require_anchor + 6 ] ?? null;
		if (
			( is_array( $abspath ) && 'ABSPATH' === $abspath[1] )
			&& ( is_array( $path ) && "'wp-settings.php'" === $path[1] )
		) {
			return $require_anchor;
		}
		return null;
	}

	/**
	 * Find location of the first token of a given type in the token array.
	 *
	 * @param  int    $type   The type of the token.
	 * @param  string $search Optional. A search string to match against the token content.
	 * @return int|null       The location of the first token.
	 */
	private function find_first_token_location( int $type, ?string $search = null ): ?int {
		foreach ( $this->tokens as $i => $token ) {
			if ( is_array( $token ) && $type === $token[0] ) {
				if ( null === $search || false !== strpos( $token[1], $search ) ) {
					return $i;
				}
			}
		}
		return null;
	}

	/**
	 * Check if a token is whitespace or a comment.
	 *
	 * @param  array|string $token The token to check.
	 * @return bool                True if the token is whitespace or a comment.
	 */
	private function is_whitespace( $token ): bool {
		return is_array( $token )
			&& ( T_WHITESPACE === $token[0] || T_COMMENT === $token[0] || T_DOC_COMMENT === $token[0] );
	}
}
`;async function Fs(e,n){const t=D(n,"wp-config.php");!e.fileExists(t)&&e.fileExists(D(n,"wp-config-sample.php"))&&await e.writeFile(t,await e.readFileAsBuffer(D(n,"wp-config-sample.php"))),e.fileExists(t)&&await Hs(e,t,{DB_NAME:"wordpress"})}async function js(e,n,t){const r=at({wpConfigPath:n,constants:t});if((await e.run({code:`${Hr}
		$wp_config_path = ${r.wpConfigPath};
		$transformer = WP_Config_Transformer::from_file($wp_config_path);
		$transformer->define_constants(${r.constants});
		$transformer->to_file($wp_config_path);
		`})).errors.length>0)throw new Error("Failed to rewrite constants in wp-config.php.")}async function Hs(e,n,t){const r=Object.keys(t),i=at({wpConfigPath:n,constantNames:r}),s=await e.run({code:`${Hr}
		$transformer = WP_Config_Transformer::from_file(${i.wpConfigPath});
		$missing = [];
		foreach (${i.constantNames} as $name) {
			if (!$transformer->constant_exists($name)) {
				$missing[] = $name;
			}
		}
		echo json_encode($missing);
		`});if(s.errors.length>0)throw new Error("Failed to check wp-config.php for constants.");let a;try{a=JSON.parse(s.text)}catch{throw new Error(`Failed to parse wp-config.php constant check output: ${s.text}`)}for(const c of a)await e.defineConstant(c,t[c])}const Bs=[{match:new RegExp("^(/[_0-9a-zA-Z-]+)?(/wp-(content|admin|includes)/.*)"),replacement:"$2"}],Gs=new Set(["http://127.0.0.1:5400","http://localhost:5400","http://127.0.0.1:5401","http://localhost:5401","https://playground.test"]);function Ys(e){return Gs.has(e.origin)||e.pathname.startsWith("/website-server/")}const Vs="16a098b0e927b8fb3525ced104f0157344894802",jt="https://raw.githubusercontent.com/WordPress/blueprints/trunk/index.json",Br="tbv-playground-canonical-v1",Gr=`${Br}-${Vs}`,Lt=caches.open(Gr);async function jn(e){const n=await Lt,t=await n.match(e,{ignoreSearch:!0});if(t)return t;const r=Xs(e),i=await xn(r);return i.ok&&Yr()&&["GET","HEAD"].includes(e.method)&&n.put(r,i.clone()),i}async function Zs(e){const n=await Lt,t=await n.match(e,{ignoreSearch:!0});let r;try{r=await fetch(e,{cache:"no-store"})}catch(i){if(t)return t;throw i}return r.ok?(n.put(e,r.clone()),r):t||r}async function Ks(){const e=await Lt;let n;try{const t=await xn(jt,{credentials:"omit"});if(!t.ok)throw new Error("Unable to fetch the Blueprints directory index.");n=Response.json(await t.json(),{headers:{"X-Content-Type-Options":"nosniff"}})}catch{return await e.match(jt)??new Response("Blueprints directory index unavailable.",{status:502})}return await e.put(jt,n.clone()).catch(()=>{}),n}async function Qs(){const r=["/",...await(await xn("/assets-required-for-offline-mode.json")).json()].map(s=>new Request(s,{cache:"no-store"}));await(await Lt).addAll(r)}async function Js(){const n=(await caches.keys()).filter(t=>t.startsWith(Br)&&t!==Gr);return Promise.all(n.map(t=>caches.delete(t)))}function an(e){return e.href.includes("wordpress-static.zip")?!0:Ys(e)||be(e)||e.pathname.endsWith(".php")?!1:self.location.origin===e.origin}function Xs(e){if(!e.headers.has("range"))return e;const n=new Headers(e.headers);return n.delete("range"),new Request(e,{headers:n})}function xn(e,n){return fetch(e,{...n,cache:"no-store"})}function Yr(){return!("serviceWorker"in self)||!("state"in self.serviceWorker)?!0:self.serviceWorker.state==="activated"}new It({concurrency:15});new It({concurrency:10});const nt=15,on=30,cn=19,zs=29,Rt=256,yn=Rt+1+zs,Hn=2*yn+1,Ke=256,ea=7,Bn=16,Gn=17,Yn=18,Ht=8*2,At=-1,ta=1,lt=2,na=0,He=0,Vn=1,ra=3,re=4,_e=0,Vr=1,ft=2,we=-2,ia=-3,De=-5;function Ut(e){return Nt(e.map(([n,t])=>new Array(n).fill(t,0,n)))}function Nt(e){return e.reduce((n,t)=>n.concat(Array.isArray(t)?Nt(t):t),[])}const Zn=[0,1,2,3].concat(...Ut([[2,4],[2,5],[4,6],[4,7],[8,8],[8,9],[16,10],[16,11],[32,12],[32,13],[64,14],[64,15],[2,0],[1,16],[1,17],[2,18],[2,19],[4,20],[4,21],[8,22],[8,23],[16,24],[16,25],[32,26],[32,27],[64,28],[64,29]]));function V(){const e=this;function n(i){const s=e.dyn_tree,a=e.stat_desc.static_tree,c=e.stat_desc.extra_bits,o=e.stat_desc.extra_base,f=e.stat_desc.max_length;let d,h,m,_,k,u,l=0;for(_=0;_<=nt;_++)i.bl_count[_]=0;for(s[i.heap[i.heap_max]*2+1]=0,d=i.heap_max+1;d<Hn;d++)h=i.heap[d],_=s[s[h*2+1]*2+1]+1,_>f&&(_=f,l++),s[h*2+1]=_,!(h>e.max_code)&&(i.bl_count[_]++,k=0,h>=o&&(k=c[h-o]),u=s[h*2],i.opt_len+=u*(_+k),a&&(i.static_len+=u*(a[h*2+1]+k)));if(l!==0){do{for(_=f-1;i.bl_count[_]===0;)_--;i.bl_count[_]--,i.bl_count[_+1]+=2,i.bl_count[f]--,l-=2}while(l>0);for(_=f;_!==0;_--)for(h=i.bl_count[_];h!==0;)m=i.heap[--d],!(m>e.max_code)&&(s[m*2+1]!=_&&(i.opt_len+=(_-s[m*2+1])*s[m*2],s[m*2+1]=_),h--)}}function t(i,s){let a=0;do a|=i&1,i>>>=1,a<<=1;while(--s>0);return a>>>1}function r(i,s,a){const c=[];let o=0,f,d,h;for(f=1;f<=nt;f++)c[f]=o=o+a[f-1]<<1;for(d=0;d<=s;d++)h=i[d*2+1],h!==0&&(i[d*2]=t(c[h]++,h))}e.build_tree=function(i){const s=e.dyn_tree,a=e.stat_desc.static_tree,c=e.stat_desc.elems;let o,f,d=-1,h;for(i.heap_len=0,i.heap_max=Hn,o=0;o<c;o++)s[o*2]!==0?(i.heap[++i.heap_len]=d=o,i.depth[o]=0):s[o*2+1]=0;for(;i.heap_len<2;)h=i.heap[++i.heap_len]=d<2?++d:0,s[h*2]=1,i.depth[h]=0,i.opt_len--,a&&(i.static_len-=a[h*2+1]);for(e.max_code=d,o=Math.floor(i.heap_len/2);o>=1;o--)i.pqdownheap(s,o);h=c;do o=i.heap[1],i.heap[1]=i.heap[i.heap_len--],i.pqdownheap(s,1),f=i.heap[1],i.heap[--i.heap_max]=o,i.heap[--i.heap_max]=f,s[h*2]=s[o*2]+s[f*2],i.depth[h]=Math.max(i.depth[o],i.depth[f])+1,s[o*2+1]=s[f*2+1]=h,i.heap[1]=h++,i.pqdownheap(s,1);while(i.heap_len>=2);i.heap[--i.heap_max]=i.heap[1],n(i),r(s,e.max_code,i.bl_count)}}V._length_code=[0,1,2,3,4,5,6,7].concat(...Ut([[2,8],[2,9],[2,10],[2,11],[4,12],[4,13],[4,14],[4,15],[8,16],[8,17],[8,18],[8,19],[16,20],[16,21],[16,22],[16,23],[32,24],[32,25],[32,26],[31,27],[1,28]]));V.base_length=[0,1,2,3,4,5,6,7,8,10,12,14,16,20,24,28,32,40,48,56,64,80,96,112,128,160,192,224,0];V.base_dist=[0,1,2,3,4,6,8,12,16,24,32,48,64,96,128,192,256,384,512,768,1024,1536,2048,3072,4096,6144,8192,12288,16384,24576];V.d_code=function(e){return e<256?Zn[e]:Zn[256+(e>>>7)]};V.extra_lbits=[0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0];V.extra_dbits=[0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13];V.extra_blbits=[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,3,7];V.bl_order=[16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15];function J(e,n,t,r,i){const s=this;s.static_tree=e,s.extra_bits=n,s.extra_base=t,s.elems=r,s.max_length=i}const sa=[12,140,76,204,44,172,108,236,28,156,92,220,60,188,124,252,2,130,66,194,34,162,98,226,18,146,82,210,50,178,114,242,10,138,74,202,42,170,106,234,26,154,90,218,58,186,122,250,6,134,70,198,38,166,102,230,22,150,86,214,54,182,118,246,14,142,78,206,46,174,110,238,30,158,94,222,62,190,126,254,1,129,65,193,33,161,97,225,17,145,81,209,49,177,113,241,9,137,73,201,41,169,105,233,25,153,89,217,57,185,121,249,5,133,69,197,37,165,101,229,21,149,85,213,53,181,117,245,13,141,77,205,45,173,109,237,29,157,93,221,61,189,125,253,19,275,147,403,83,339,211,467,51,307,179,435,115,371,243,499,11,267,139,395,75,331,203,459,43,299,171,427,107,363,235,491,27,283,155,411,91,347,219,475,59,315,187,443,123,379,251,507,7,263,135,391,71,327,199,455,39,295,167,423,103,359,231,487,23,279,151,407,87,343,215,471,55,311,183,439,119,375,247,503,15,271,143,399,79,335,207,463,47,303,175,431,111,367,239,495,31,287,159,415,95,351,223,479,63,319,191,447,127,383,255,511,0,64,32,96,16,80,48,112,8,72,40,104,24,88,56,120,4,68,36,100,20,84,52,116,3,131,67,195,35,163,99,227],aa=Ut([[144,8],[112,9],[24,7],[8,8]]);J.static_ltree=Nt(sa.map((e,n)=>[e,aa[n]]));const oa=[0,16,8,24,4,20,12,28,2,18,10,26,6,22,14,30,1,17,9,25,5,21,13,29,3,19,11,27,7,23],ca=Ut([[30,5]]);J.static_dtree=Nt(oa.map((e,n)=>[e,ca[n]]));J.static_l_desc=new J(J.static_ltree,V.extra_lbits,Rt+1,yn,nt);J.static_d_desc=new J(J.static_dtree,V.extra_dbits,0,on,nt);J.static_bl_desc=new J(null,V.extra_blbits,0,cn,ea);const la=9,fa=8;function ge(e,n,t,r,i){const s=this;s.good_length=e,s.max_lazy=n,s.nice_length=t,s.max_chain=r,s.func=i}const Zr=0,yt=1,Ie=2,he=[new ge(0,0,0,0,Zr),new ge(4,4,8,4,yt),new ge(4,5,16,8,yt),new ge(4,6,32,32,yt),new ge(4,4,16,16,Ie),new ge(8,16,32,32,Ie),new ge(8,16,128,128,Ie),new ge(8,32,128,256,Ie),new ge(32,128,258,1024,Ie),new ge(32,258,258,4096,Ie)],dt=["need dictionary","stream end","","","stream error","data error","","buffer error","",""],le=0,ut=1,Qe=2,pt=3,da=32,Bt=42,mt=113,Je=666,Gt=8,ua=0,Yt=1,pa=2,K=3,bt=258,se=bt+K+1;function Kn(e,n,t,r){const i=e[n*2],s=e[t*2];return i<s||i==s&&r[n]<=r[t]}function ma(){const e=this;let n,t,r,i,s,a,c,o,f,d,h,m,_,k,u,l,p,w,v,T,x,g,y,S,R,A,C,q,O,B,N,L,j;const G=new V,Se=new V,W=new V;e.depth=[];let ue,M,Y,Ye,ce,z;e.bl_count=[],e.heap=[],N=[],L=[],j=[];function Ci(){f=2*s,h[_-1]=0;for(let b=0;b<_-1;b++)h[b]=0;A=he[C].max_lazy,O=he[C].good_length,B=he[C].nice_length,R=he[C].max_chain,x=0,p=0,y=0,w=S=K-1,T=0,m=0}function Rn(){let b;for(b=0;b<yn;b++)N[b*2]=0;for(b=0;b<on;b++)L[b*2]=0;for(b=0;b<cn;b++)j[b*2]=0;N[Ke*2]=1,e.opt_len=e.static_len=0,M=Y=0}function Ii(){G.dyn_tree=N,G.stat_desc=J.static_l_desc,Se.dyn_tree=L,Se.stat_desc=J.static_d_desc,W.dyn_tree=j,W.stat_desc=J.static_bl_desc,ce=0,z=0,Ye=8,Rn()}e.pqdownheap=function(b,E){const $=e.heap,P=$[E];let I=E<<1;for(;I<=e.heap_len&&(I<e.heap_len&&Kn(b,$[I+1],$[I],e.depth)&&I++,!Kn(b,P,$[I],e.depth));)$[E]=$[I],E=I,I<<=1;$[E]=P};function An(b,E){let $=-1,P,I=b[0*2+1],U=0,F=7,te=4;I===0&&(F=138,te=3),b[(E+1)*2+1]=65535;for(let me=0;me<=E;me++)P=I,I=b[(me+1)*2+1],!(++U<F&&P==I)&&(U<te?j[P*2]+=U:P!==0?(P!=$&&j[P*2]++,j[Bn*2]++):U<=10?j[Gn*2]++:j[Yn*2]++,U=0,$=P,I===0?(F=138,te=3):P==I?(F=6,te=3):(F=7,te=4))}function Oi(){let b;for(An(N,G.max_code),An(L,Se.max_code),W.build_tree(e),b=cn-1;b>=3&&j[V.bl_order[b]*2+1]===0;b--);return e.opt_len+=3*(b+1)+5+5+4,b}function qe(b){e.pending_buf[e.pending++]=b}function Ve(b){qe(b&255),qe(b>>>8&255)}function Li(b){qe(b>>8&255),qe(b&255&255)}function ee(b,E){let $;const P=E;z>Ht-P?($=b,ce|=$<<z&65535,Ve(ce),ce=$>>>Ht-z,z+=P-Ht):(ce|=b<<z&65535,z+=P)}function pe(b,E){const $=b*2;ee(E[$]&65535,E[$+1]&65535)}function Cn(b,E){let $,P=-1,I,U=b[0*2+1],F=0,te=7,me=4;for(U===0&&(te=138,me=3),$=0;$<=E;$++)if(I=U,U=b[($+1)*2+1],!(++F<te&&I==U)){if(F<me)do pe(I,j);while(--F!==0);else I!==0?(I!=P&&(pe(I,j),F--),pe(Bn,j),ee(F-3,2)):F<=10?(pe(Gn,j),ee(F-3,3)):(pe(Yn,j),ee(F-11,7));F=0,P=I,U===0?(te=138,me=3):I==U?(te=6,me=3):(te=7,me=4)}}function Ui(b,E,$){let P;for(ee(b-257,5),ee(E-1,5),ee($-4,4),P=0;P<$;P++)ee(j[V.bl_order[P]*2+1],3);Cn(N,b-1),Cn(L,E-1)}function In(){z==16?(Ve(ce),ce=0,z=0):z>=8&&(qe(ce&255),ce>>>=8,z-=8)}function Ni(){ee(Yt<<1,3),pe(Ke,J.static_ltree),In(),1+Ye+10-z<9&&(ee(Yt<<1,3),pe(Ke,J.static_ltree),In()),Ye=7}function Ze(b,E){let $,P,I;if(e.dist_buf[M]=b,e.lc_buf[M]=E&255,M++,b===0?N[E*2]++:(Y++,b--,N[(V._length_code[E]+Rt+1)*2]++,L[V.d_code(b)*2]++),!(M&8191)&&C>2){for($=M*8,P=x-p,I=0;I<on;I++)$+=L[I*2]*(5+V.extra_dbits[I]);if($>>>=3,Y<Math.floor(M/2)&&$<Math.floor(P/2))return!0}return M==ue-1}function On(b,E){let $,P,I=0,U,F;if(M!==0)do $=e.dist_buf[I],P=e.lc_buf[I],I++,$===0?pe(P,b):(U=V._length_code[P],pe(U+Rt+1,b),F=V.extra_lbits[U],F!==0&&(P-=V.base_length[U],ee(P,F)),$--,U=V.d_code($),pe(U,E),F=V.extra_dbits[U],F!==0&&($-=V.base_dist[U],ee($,F)));while(I<M);pe(Ke,b),Ye=b[Ke*2+1]}function Ln(){z>8?Ve(ce):z>0&&qe(ce&255),ce=0,z=0}function Wi(b,E,$){Ln(),Ye=8,Ve(E),Ve(~E),e.pending_buf.set(o.subarray(b,b+E),e.pending),e.pending+=E}function Un(b,E,$){ee((ua<<1)+($?1:0),3),Wi(b,E)}function qi(b,E,$){let P,I,U=0;C>0?(G.build_tree(e),Se.build_tree(e),U=Oi(),P=e.opt_len+3+7>>>3,I=e.static_len+3+7>>>3,I<=P&&(P=I)):P=I=E+5,E+4<=P&&b!=-1?Un(b,E,$):I==P?(ee((Yt<<1)+($?1:0),3),On(J.static_ltree,J.static_dtree)):(ee((pa<<1)+($?1:0),3),Ui(G.max_code+1,Se.max_code+1,U+1),On(N,L)),Rn(),$&&Ln()}function Ee(b){qi(p>=0?p:-1,x-p,b),p=x,n.flush_pending()}function Dt(){let b,E,$,P;do{if(P=f-y-x,P===0&&x===0&&y===0)P=s;else if(P==-1)P--;else if(x>=s+s-se){o.set(o.subarray(s,s+s),0),g-=s,x-=s,p-=s,b=_,$=b;do E=h[--$]&65535,h[$]=E>=s?E-s:0;while(--b!==0);b=s,$=b;do E=d[--$]&65535,d[$]=E>=s?E-s:0;while(--b!==0);P+=s}if(n.avail_in===0)return;b=n.read_buf(o,x+y,P),y+=b,y>=K&&(m=o[x]&255,m=(m<<l^o[x+1]&255)&u)}while(y<se&&n.avail_in!==0)}function Di(b){let E=65535,$;for(E>r-5&&(E=r-5);;){if(y<=1){if(Dt(),y===0&&b==He)return le;if(y===0)break}if(x+=y,y=0,$=p+E,(x===0||x>=$)&&(y=x-$,x=$,Ee(!1),n.avail_out===0)||x-p>=s-se&&(Ee(!1),n.avail_out===0))return le}return Ee(b==re),n.avail_out===0?b==re?Qe:le:b==re?pt:ut}function Nn(b){let E=R,$=x,P,I,U=S;const F=x>s-se?x-(s-se):0;let te=B;const me=c,Mt=x+bt;let Wn=o[$+U-1],qn=o[$+U];S>=O&&(E>>=2),te>y&&(te=y);do if(P=b,!(o[P+U]!=qn||o[P+U-1]!=Wn||o[P]!=o[$]||o[++P]!=o[$+1])){$+=2,P++;do;while(o[++$]==o[++P]&&o[++$]==o[++P]&&o[++$]==o[++P]&&o[++$]==o[++P]&&o[++$]==o[++P]&&o[++$]==o[++P]&&o[++$]==o[++P]&&o[++$]==o[++P]&&$<Mt);if(I=bt-(Mt-$),$=Mt-bt,I>U){if(g=b,U=I,I>=te)break;Wn=o[$+U-1],qn=o[$+U]}}while((b=d[b&me]&65535)>F&&--E!==0);return U<=y?U:y}function Mi(b){let E=0,$;for(;;){if(y<se){if(Dt(),y<se&&b==He)return le;if(y===0)break}if(y>=K&&(m=(m<<l^o[x+(K-1)]&255)&u,E=h[m]&65535,d[x&c]=h[m],h[m]=x),E!==0&&(x-E&65535)<=s-se&&q!=lt&&(w=Nn(E)),w>=K)if($=Ze(x-g,w-K),y-=w,w<=A&&y>=K){w--;do x++,m=(m<<l^o[x+(K-1)]&255)&u,E=h[m]&65535,d[x&c]=h[m],h[m]=x;while(--w!==0);x++}else x+=w,w=0,m=o[x]&255,m=(m<<l^o[x+1]&255)&u;else $=Ze(0,o[x]&255),y--,x++;if($&&(Ee(!1),n.avail_out===0))return le}return Ee(b==re),n.avail_out===0?b==re?Qe:le:b==re?pt:ut}function Fi(b){let E=0,$,P;for(;;){if(y<se){if(Dt(),y<se&&b==He)return le;if(y===0)break}if(y>=K&&(m=(m<<l^o[x+(K-1)]&255)&u,E=h[m]&65535,d[x&c]=h[m],h[m]=x),S=w,v=g,w=K-1,E!==0&&S<A&&(x-E&65535)<=s-se&&(q!=lt&&(w=Nn(E)),w<=5&&(q==ta||w==K&&x-g>4096)&&(w=K-1)),S>=K&&w<=S){P=x+y-K,$=Ze(x-1-v,S-K),y-=S-1,S-=2;do++x<=P&&(m=(m<<l^o[x+(K-1)]&255)&u,E=h[m]&65535,d[x&c]=h[m],h[m]=x);while(--S!==0);if(T=0,w=K-1,x++,$&&(Ee(!1),n.avail_out===0))return le}else if(T!==0){if($=Ze(0,o[x-1]&255),$&&Ee(!1),x++,y--,n.avail_out===0)return le}else T=1,x++,y--}return T!==0&&($=Ze(0,o[x-1]&255),T=0),Ee(b==re),n.avail_out===0?b==re?Qe:le:b==re?pt:ut}function ji(b){return b.total_in=b.total_out=0,b.msg=null,e.pending=0,e.pending_out=0,t=mt,i=He,Ii(),Ci(),_e}e.deflateInit=function(b,E,$,P,I,U){return P||(P=Gt),I||(I=fa),U||(U=na),b.msg=null,E==At&&(E=6),I<1||I>la||P!=Gt||$<9||$>15||E<0||E>9||U<0||U>lt?we:(b.dstate=e,a=$,s=1<<a,c=s-1,k=I+7,_=1<<k,u=_-1,l=Math.floor((k+K-1)/K),o=new Uint8Array(s*2),d=[],h=[],ue=1<<I+6,e.pending_buf=new Uint8Array(ue*4),r=ue*4,e.dist_buf=new Uint16Array(ue),e.lc_buf=new Uint8Array(ue),C=E,q=U,ji(b))},e.deflateEnd=function(){return t!=Bt&&t!=mt&&t!=Je?we:(e.lc_buf=null,e.dist_buf=null,e.pending_buf=null,h=null,d=null,o=null,e.dstate=null,t==mt?ia:_e)},e.deflateParams=function(b,E,$){let P=_e;return E==At&&(E=6),E<0||E>9||$<0||$>lt?we:(he[C].func!=he[E].func&&b.total_in!==0&&(P=b.deflate(Vn)),C!=E&&(C=E,A=he[C].max_lazy,O=he[C].good_length,B=he[C].nice_length,R=he[C].max_chain),q=$,P)},e.deflateSetDictionary=function(b,E,$){let P=$,I,U=0;if(!E||t!=Bt)return we;if(P<K)return _e;for(P>s-se&&(P=s-se,U=$-P),o.set(E.subarray(U,U+P),0),x=P,p=P,m=o[0]&255,m=(m<<l^o[1]&255)&u,I=0;I<=P-K;I++)m=(m<<l^o[I+(K-1)]&255)&u,d[I&c]=h[m],h[m]=I;return _e},e.deflate=function(b,E){let $,P,I,U,F;if(E>re||E<0)return we;if(!b.next_out||!b.next_in&&b.avail_in!==0||t==Je&&E!=re)return b.msg=dt[ft-we],we;if(b.avail_out===0)return b.msg=dt[ft-De],De;if(n=b,U=i,i=E,t==Bt&&(P=Gt+(a-8<<4)<<8,I=(C-1&255)>>1,I>3&&(I=3),P|=I<<6,x!==0&&(P|=da),P+=31-P%31,t=mt,Li(P)),e.pending!==0){if(n.flush_pending(),n.avail_out===0)return i=-1,_e}else if(n.avail_in===0&&E<=U&&E!=re)return n.msg=dt[ft-De],De;if(t==Je&&n.avail_in!==0)return b.msg=dt[ft-De],De;if(n.avail_in!==0||y!==0||E!=He&&t!=Je){switch(F=-1,he[C].func){case Zr:F=Di(E);break;case yt:F=Mi(E);break;case Ie:F=Fi(E);break}if((F==Qe||F==pt)&&(t=Je),F==le||F==Qe)return n.avail_out===0&&(i=-1),_e;if(F==ut){if(E==Vn)Ni();else if(Un(0,0,!1),E==ra)for($=0;$<_;$++)h[$]=0;if(n.flush_pending(),n.avail_out===0)return i=-1,_e}}return E!=re?_e:Vr}}function Kr(){const e=this;e.next_in_index=0,e.next_out_index=0,e.avail_in=0,e.total_in=0,e.avail_out=0,e.total_out=0}Kr.prototype={deflateInit(e,n){const t=this;return t.dstate=new ma,n||(n=nt),t.dstate.deflateInit(t,e,n)},deflate(e){const n=this;return n.dstate?n.dstate.deflate(n,e):we},deflateEnd(){const e=this;if(!e.dstate)return we;const n=e.dstate.deflateEnd();return e.dstate=null,n},deflateParams(e,n){const t=this;return t.dstate?t.dstate.deflateParams(t,e,n):we},deflateSetDictionary(e,n){const t=this;return t.dstate?t.dstate.deflateSetDictionary(t,e,n):we},read_buf(e,n,t){const r=this;let i=r.avail_in;return i>t&&(i=t),i===0?0:(r.avail_in-=i,e.set(r.next_in.subarray(r.next_in_index,r.next_in_index+i),n),r.next_in_index+=i,r.total_in+=i,i)},flush_pending(){const e=this;let n=e.dstate.pending;n>e.avail_out&&(n=e.avail_out),n!==0&&(e.next_out.set(e.dstate.pending_buf.subarray(e.dstate.pending_out,e.dstate.pending_out+n),e.next_out_index),e.next_out_index+=n,e.dstate.pending_out+=n,e.total_out+=n,e.avail_out-=n,e.dstate.pending-=n,e.dstate.pending===0&&(e.dstate.pending_out=0))}};function ha(e){const n=this,t=new Kr,r=_a(e&&e.chunkSize?e.chunkSize:64*1024),i=He,s=new Uint8Array(r);let a=e?e.level:At;typeof a>"u"&&(a=At),t.deflateInit(a),t.next_out=s,n.append=function(c,o){let f,d,h=0,m=0,_=0;const k=[];if(c.length){t.next_in_index=0,t.next_in=c,t.avail_in=c.length;do{if(t.next_out_index=0,t.avail_out=r,f=t.deflate(i),f!=_e)throw new Error("deflating: "+t.msg);t.next_out_index&&(t.next_out_index==r?k.push(new Uint8Array(s)):k.push(s.subarray(0,t.next_out_index))),_+=t.next_out_index,o&&t.next_in_index>0&&t.next_in_index!=h&&(o(t.next_in_index),h=t.next_in_index)}while(t.avail_in>0||t.avail_out===0);return k.length>1?(d=new Uint8Array(_),k.forEach(function(u){d.set(u,m),m+=u.length})):d=k[0]?new Uint8Array(k[0]):new Uint8Array,d}},n.flush=function(){let c,o,f=0,d=0;const h=[];do{if(t.next_out_index=0,t.avail_out=r,c=t.deflate(re),c!=Vr&&c!=_e)throw new Error("deflating: "+t.msg);r-t.avail_out>0&&h.push(s.slice(0,t.next_out_index)),d+=t.next_out_index}while(t.avail_in>0||t.avail_out===0);return t.deflateEnd(),o=new Uint8Array(d),h.forEach(function(m){o.set(m,f),f+=m.length}),o}}function _a(e){return e+5*(Math.floor(e/16383)+1)}const wa=15,H=0,$e=1,ga=2,ie=-2,Z=-3,Qn=-4,ke=-5,ae=[0,1,3,7,15,31,63,127,255,511,1023,2047,4095,8191,16383,32767,65535],Qr=1440,xa=0,ya=4,ba=9,va=5,$a=[96,7,256,0,8,80,0,8,16,84,8,115,82,7,31,0,8,112,0,8,48,0,9,192,80,7,10,0,8,96,0,8,32,0,9,160,0,8,0,0,8,128,0,8,64,0,9,224,80,7,6,0,8,88,0,8,24,0,9,144,83,7,59,0,8,120,0,8,56,0,9,208,81,7,17,0,8,104,0,8,40,0,9,176,0,8,8,0,8,136,0,8,72,0,9,240,80,7,4,0,8,84,0,8,20,85,8,227,83,7,43,0,8,116,0,8,52,0,9,200,81,7,13,0,8,100,0,8,36,0,9,168,0,8,4,0,8,132,0,8,68,0,9,232,80,7,8,0,8,92,0,8,28,0,9,152,84,7,83,0,8,124,0,8,60,0,9,216,82,7,23,0,8,108,0,8,44,0,9,184,0,8,12,0,8,140,0,8,76,0,9,248,80,7,3,0,8,82,0,8,18,85,8,163,83,7,35,0,8,114,0,8,50,0,9,196,81,7,11,0,8,98,0,8,34,0,9,164,0,8,2,0,8,130,0,8,66,0,9,228,80,7,7,0,8,90,0,8,26,0,9,148,84,7,67,0,8,122,0,8,58,0,9,212,82,7,19,0,8,106,0,8,42,0,9,180,0,8,10,0,8,138,0,8,74,0,9,244,80,7,5,0,8,86,0,8,22,192,8,0,83,7,51,0,8,118,0,8,54,0,9,204,81,7,15,0,8,102,0,8,38,0,9,172,0,8,6,0,8,134,0,8,70,0,9,236,80,7,9,0,8,94,0,8,30,0,9,156,84,7,99,0,8,126,0,8,62,0,9,220,82,7,27,0,8,110,0,8,46,0,9,188,0,8,14,0,8,142,0,8,78,0,9,252,96,7,256,0,8,81,0,8,17,85,8,131,82,7,31,0,8,113,0,8,49,0,9,194,80,7,10,0,8,97,0,8,33,0,9,162,0,8,1,0,8,129,0,8,65,0,9,226,80,7,6,0,8,89,0,8,25,0,9,146,83,7,59,0,8,121,0,8,57,0,9,210,81,7,17,0,8,105,0,8,41,0,9,178,0,8,9,0,8,137,0,8,73,0,9,242,80,7,4,0,8,85,0,8,21,80,8,258,83,7,43,0,8,117,0,8,53,0,9,202,81,7,13,0,8,101,0,8,37,0,9,170,0,8,5,0,8,133,0,8,69,0,9,234,80,7,8,0,8,93,0,8,29,0,9,154,84,7,83,0,8,125,0,8,61,0,9,218,82,7,23,0,8,109,0,8,45,0,9,186,0,8,13,0,8,141,0,8,77,0,9,250,80,7,3,0,8,83,0,8,19,85,8,195,83,7,35,0,8,115,0,8,51,0,9,198,81,7,11,0,8,99,0,8,35,0,9,166,0,8,3,0,8,131,0,8,67,0,9,230,80,7,7,0,8,91,0,8,27,0,9,150,84,7,67,0,8,123,0,8,59,0,9,214,82,7,19,0,8,107,0,8,43,0,9,182,0,8,11,0,8,139,0,8,75,0,9,246,80,7,5,0,8,87,0,8,23,192,8,0,83,7,51,0,8,119,0,8,55,0,9,206,81,7,15,0,8,103,0,8,39,0,9,174,0,8,7,0,8,135,0,8,71,0,9,238,80,7,9,0,8,95,0,8,31,0,9,158,84,7,99,0,8,127,0,8,63,0,9,222,82,7,27,0,8,111,0,8,47,0,9,190,0,8,15,0,8,143,0,8,79,0,9,254,96,7,256,0,8,80,0,8,16,84,8,115,82,7,31,0,8,112,0,8,48,0,9,193,80,7,10,0,8,96,0,8,32,0,9,161,0,8,0,0,8,128,0,8,64,0,9,225,80,7,6,0,8,88,0,8,24,0,9,145,83,7,59,0,8,120,0,8,56,0,9,209,81,7,17,0,8,104,0,8,40,0,9,177,0,8,8,0,8,136,0,8,72,0,9,241,80,7,4,0,8,84,0,8,20,85,8,227,83,7,43,0,8,116,0,8,52,0,9,201,81,7,13,0,8,100,0,8,36,0,9,169,0,8,4,0,8,132,0,8,68,0,9,233,80,7,8,0,8,92,0,8,28,0,9,153,84,7,83,0,8,124,0,8,60,0,9,217,82,7,23,0,8,108,0,8,44,0,9,185,0,8,12,0,8,140,0,8,76,0,9,249,80,7,3,0,8,82,0,8,18,85,8,163,83,7,35,0,8,114,0,8,50,0,9,197,81,7,11,0,8,98,0,8,34,0,9,165,0,8,2,0,8,130,0,8,66,0,9,229,80,7,7,0,8,90,0,8,26,0,9,149,84,7,67,0,8,122,0,8,58,0,9,213,82,7,19,0,8,106,0,8,42,0,9,181,0,8,10,0,8,138,0,8,74,0,9,245,80,7,5,0,8,86,0,8,22,192,8,0,83,7,51,0,8,118,0,8,54,0,9,205,81,7,15,0,8,102,0,8,38,0,9,173,0,8,6,0,8,134,0,8,70,0,9,237,80,7,9,0,8,94,0,8,30,0,9,157,84,7,99,0,8,126,0,8,62,0,9,221,82,7,27,0,8,110,0,8,46,0,9,189,0,8,14,0,8,142,0,8,78,0,9,253,96,7,256,0,8,81,0,8,17,85,8,131,82,7,31,0,8,113,0,8,49,0,9,195,80,7,10,0,8,97,0,8,33,0,9,163,0,8,1,0,8,129,0,8,65,0,9,227,80,7,6,0,8,89,0,8,25,0,9,147,83,7,59,0,8,121,0,8,57,0,9,211,81,7,17,0,8,105,0,8,41,0,9,179,0,8,9,0,8,137,0,8,73,0,9,243,80,7,4,0,8,85,0,8,21,80,8,258,83,7,43,0,8,117,0,8,53,0,9,203,81,7,13,0,8,101,0,8,37,0,9,171,0,8,5,0,8,133,0,8,69,0,9,235,80,7,8,0,8,93,0,8,29,0,9,155,84,7,83,0,8,125,0,8,61,0,9,219,82,7,23,0,8,109,0,8,45,0,9,187,0,8,13,0,8,141,0,8,77,0,9,251,80,7,3,0,8,83,0,8,19,85,8,195,83,7,35,0,8,115,0,8,51,0,9,199,81,7,11,0,8,99,0,8,35,0,9,167,0,8,3,0,8,131,0,8,67,0,9,231,80,7,7,0,8,91,0,8,27,0,9,151,84,7,67,0,8,123,0,8,59,0,9,215,82,7,19,0,8,107,0,8,43,0,9,183,0,8,11,0,8,139,0,8,75,0,9,247,80,7,5,0,8,87,0,8,23,192,8,0,83,7,51,0,8,119,0,8,55,0,9,207,81,7,15,0,8,103,0,8,39,0,9,175,0,8,7,0,8,135,0,8,71,0,9,239,80,7,9,0,8,95,0,8,31,0,9,159,84,7,99,0,8,127,0,8,63,0,9,223,82,7,27,0,8,111,0,8,47,0,9,191,0,8,15,0,8,143,0,8,79,0,9,255],ka=[80,5,1,87,5,257,83,5,17,91,5,4097,81,5,5,89,5,1025,85,5,65,93,5,16385,80,5,3,88,5,513,84,5,33,92,5,8193,82,5,9,90,5,2049,86,5,129,192,5,24577,80,5,2,87,5,385,83,5,25,91,5,6145,81,5,7,89,5,1537,85,5,97,93,5,24577,80,5,4,88,5,769,84,5,49,92,5,12289,82,5,13,90,5,3073,86,5,193,192,5,24577],Sa=[3,4,5,6,7,8,9,10,11,13,15,17,19,23,27,31,35,43,51,59,67,83,99,115,131,163,195,227,258,0,0],Ea=[0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0,112,112],Ta=[1,2,3,4,5,7,9,13,17,25,33,49,65,97,129,193,257,385,513,769,1025,1537,2049,3073,4097,6145,8193,12289,16385,24577],Pa=[0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13],Te=15;function ln(){const e=this;let n,t,r,i,s,a;function c(f,d,h,m,_,k,u,l,p,w,v){let T,x,g,y,S,R,A,C,q,O,B,N,L,j,G;O=0,S=h;do r[f[d+O]]++,O++,S--;while(S!==0);if(r[0]==h)return u[0]=-1,l[0]=0,H;for(C=l[0],R=1;R<=Te&&r[R]===0;R++);for(A=R,C<R&&(C=R),S=Te;S!==0&&r[S]===0;S--);for(g=S,C>S&&(C=S),l[0]=C,j=1<<R;R<S;R++,j<<=1)if((j-=r[R])<0)return Z;if((j-=r[S])<0)return Z;for(r[S]+=j,a[1]=R=0,O=1,L=2;--S!==0;)a[L]=R+=r[O],L++,O++;S=0,O=0;do(R=f[d+O])!==0&&(v[a[R]++]=S),O++;while(++S<h);for(h=a[g],a[0]=S=0,O=0,y=-1,N=-C,s[0]=0,B=0,G=0;A<=g;A++)for(T=r[A];T--!==0;){for(;A>N+C;){if(y++,N+=C,G=g-N,G=G>C?C:G,(x=1<<(R=A-N))>T+1&&(x-=T+1,L=A,R<G))for(;++R<G&&!((x<<=1)<=r[++L]);)x-=r[L];if(G=1<<R,w[0]+G>Qr)return Z;s[y]=B=w[0],w[0]+=G,y!==0?(a[y]=S,i[0]=R,i[1]=C,R=S>>>N-C,i[2]=B-s[y-1]-R,p.set(i,(s[y-1]+R)*3)):u[0]=B}for(i[1]=A-N,O>=h?i[0]=192:v[O]<m?(i[0]=v[O]<256?0:96,i[2]=v[O++]):(i[0]=k[v[O]-m]+16+64,i[2]=_[v[O++]-m]),x=1<<A-N,R=S>>>N;R<G;R+=x)p.set(i,(B+R)*3);for(R=1<<A-1;S&R;R>>>=1)S^=R;for(S^=R,q=(1<<N)-1;(S&q)!=a[y];)y--,N-=C,q=(1<<N)-1}return j!==0&&g!=1?ke:H}function o(f){let d;for(n||(n=[],t=[],r=new Int32Array(Te+1),i=[],s=new Int32Array(Te),a=new Int32Array(Te+1)),t.length<f&&(t=[]),d=0;d<f;d++)t[d]=0;for(d=0;d<Te+1;d++)r[d]=0;for(d=0;d<3;d++)i[d]=0;s.set(r.subarray(0,Te),0),a.set(r.subarray(0,Te+1),0)}e.inflate_trees_bits=function(f,d,h,m,_){let k;return o(19),n[0]=0,k=c(f,0,19,19,null,null,h,d,m,n,t),k==Z?_.msg="oversubscribed dynamic bit lengths tree":(k==ke||d[0]===0)&&(_.msg="incomplete dynamic bit lengths tree",k=Z),k},e.inflate_trees_dynamic=function(f,d,h,m,_,k,u,l,p){let w;return o(288),n[0]=0,w=c(h,0,f,257,Sa,Ea,k,m,l,n,t),w!=H||m[0]===0?(w==Z?p.msg="oversubscribed literal/length tree":w!=Qn&&(p.msg="incomplete literal/length tree",w=Z),w):(o(288),w=c(h,f,d,0,Ta,Pa,u,_,l,n,t),w!=H||_[0]===0&&f>257?(w==Z?p.msg="oversubscribed distance tree":w==ke?(p.msg="incomplete distance tree",w=Z):w!=Qn&&(p.msg="empty distance tree with lengths",w=Z),w):H)}}ln.inflate_trees_fixed=function(e,n,t,r){return e[0]=ba,n[0]=va,t[0]=$a,r[0]=ka,H};const ht=0,Jn=1,Xn=2,zn=3,er=4,tr=5,nr=6,Vt=7,rr=8,_t=9;function Ra(){const e=this;let n,t=0,r,i=0,s=0,a=0,c=0,o=0,f=0,d=0,h,m=0,_,k=0;function u(l,p,w,v,T,x,g,y){let S,R,A,C,q,O,B,N,L,j,G,Se,W,ue,M,Y;B=y.next_in_index,N=y.avail_in,q=g.bitb,O=g.bitk,L=g.write,j=L<g.read?g.read-L-1:g.end-L,G=ae[l],Se=ae[p];do{for(;O<20;)N--,q|=(y.read_byte(B++)&255)<<O,O+=8;if(S=q&G,R=w,A=v,Y=(A+S)*3,(C=R[Y])===0){q>>=R[Y+1],O-=R[Y+1],g.win[L++]=R[Y+2],j--;continue}do{if(q>>=R[Y+1],O-=R[Y+1],C&16){for(C&=15,W=R[Y+2]+(q&ae[C]),q>>=C,O-=C;O<15;)N--,q|=(y.read_byte(B++)&255)<<O,O+=8;S=q&Se,R=T,A=x,Y=(A+S)*3,C=R[Y];do if(q>>=R[Y+1],O-=R[Y+1],C&16){for(C&=15;O<C;)N--,q|=(y.read_byte(B++)&255)<<O,O+=8;if(ue=R[Y+2]+(q&ae[C]),q>>=C,O-=C,j-=W,L>=ue)M=L-ue,L-M>0&&2>L-M?(g.win[L++]=g.win[M++],g.win[L++]=g.win[M++],W-=2):(g.win.set(g.win.subarray(M,M+2),L),L+=2,M+=2,W-=2);else{M=L-ue;do M+=g.end;while(M<0);if(C=g.end-M,W>C){if(W-=C,L-M>0&&C>L-M)do g.win[L++]=g.win[M++];while(--C!==0);else g.win.set(g.win.subarray(M,M+C),L),L+=C,M+=C,C=0;M=0}}if(L-M>0&&W>L-M)do g.win[L++]=g.win[M++];while(--W!==0);else g.win.set(g.win.subarray(M,M+W),L),L+=W,M+=W,W=0;break}else if(!(C&64))S+=R[Y+2],S+=q&ae[C],Y=(A+S)*3,C=R[Y];else return y.msg="invalid distance code",W=y.avail_in-N,W=O>>3<W?O>>3:W,N+=W,B-=W,O-=W<<3,g.bitb=q,g.bitk=O,y.avail_in=N,y.total_in+=B-y.next_in_index,y.next_in_index=B,g.write=L,Z;while(!0);break}if(C&64)return C&32?(W=y.avail_in-N,W=O>>3<W?O>>3:W,N+=W,B-=W,O-=W<<3,g.bitb=q,g.bitk=O,y.avail_in=N,y.total_in+=B-y.next_in_index,y.next_in_index=B,g.write=L,$e):(y.msg="invalid literal/length code",W=y.avail_in-N,W=O>>3<W?O>>3:W,N+=W,B-=W,O-=W<<3,g.bitb=q,g.bitk=O,y.avail_in=N,y.total_in+=B-y.next_in_index,y.next_in_index=B,g.write=L,Z);if(S+=R[Y+2],S+=q&ae[C],Y=(A+S)*3,(C=R[Y])===0){q>>=R[Y+1],O-=R[Y+1],g.win[L++]=R[Y+2],j--;break}}while(!0)}while(j>=258&&N>=10);return W=y.avail_in-N,W=O>>3<W?O>>3:W,N+=W,B-=W,O-=W<<3,g.bitb=q,g.bitk=O,y.avail_in=N,y.total_in+=B-y.next_in_index,y.next_in_index=B,g.write=L,H}e.init=function(l,p,w,v,T,x){n=ht,f=l,d=p,h=w,m=v,_=T,k=x,r=null},e.proc=function(l,p,w){let v,T,x,g=0,y=0,S=0,R,A,C,q;for(S=p.next_in_index,R=p.avail_in,g=l.bitb,y=l.bitk,A=l.write,C=A<l.read?l.read-A-1:l.end-A;;)switch(n){case ht:if(C>=258&&R>=10&&(l.bitb=g,l.bitk=y,p.avail_in=R,p.total_in+=S-p.next_in_index,p.next_in_index=S,l.write=A,w=u(f,d,h,m,_,k,l,p),S=p.next_in_index,R=p.avail_in,g=l.bitb,y=l.bitk,A=l.write,C=A<l.read?l.read-A-1:l.end-A,w!=H)){n=w==$e?Vt:_t;break}s=f,r=h,i=m,n=Jn;case Jn:for(v=s;y<v;){if(R!==0)w=H;else return l.bitb=g,l.bitk=y,p.avail_in=R,p.total_in+=S-p.next_in_index,p.next_in_index=S,l.write=A,l.inflate_flush(p,w);R--,g|=(p.read_byte(S++)&255)<<y,y+=8}if(T=(i+(g&ae[v]))*3,g>>>=r[T+1],y-=r[T+1],x=r[T],x===0){a=r[T+2],n=nr;break}if(x&16){c=x&15,t=r[T+2],n=Xn;break}if(!(x&64)){s=x,i=T/3+r[T+2];break}if(x&32){n=Vt;break}return n=_t,p.msg="invalid literal/length code",w=Z,l.bitb=g,l.bitk=y,p.avail_in=R,p.total_in+=S-p.next_in_index,p.next_in_index=S,l.write=A,l.inflate_flush(p,w);case Xn:for(v=c;y<v;){if(R!==0)w=H;else return l.bitb=g,l.bitk=y,p.avail_in=R,p.total_in+=S-p.next_in_index,p.next_in_index=S,l.write=A,l.inflate_flush(p,w);R--,g|=(p.read_byte(S++)&255)<<y,y+=8}t+=g&ae[v],g>>=v,y-=v,s=d,r=_,i=k,n=zn;case zn:for(v=s;y<v;){if(R!==0)w=H;else return l.bitb=g,l.bitk=y,p.avail_in=R,p.total_in+=S-p.next_in_index,p.next_in_index=S,l.write=A,l.inflate_flush(p,w);R--,g|=(p.read_byte(S++)&255)<<y,y+=8}if(T=(i+(g&ae[v]))*3,g>>=r[T+1],y-=r[T+1],x=r[T],x&16){c=x&15,o=r[T+2],n=er;break}if(!(x&64)){s=x,i=T/3+r[T+2];break}return n=_t,p.msg="invalid distance code",w=Z,l.bitb=g,l.bitk=y,p.avail_in=R,p.total_in+=S-p.next_in_index,p.next_in_index=S,l.write=A,l.inflate_flush(p,w);case er:for(v=c;y<v;){if(R!==0)w=H;else return l.bitb=g,l.bitk=y,p.avail_in=R,p.total_in+=S-p.next_in_index,p.next_in_index=S,l.write=A,l.inflate_flush(p,w);R--,g|=(p.read_byte(S++)&255)<<y,y+=8}o+=g&ae[v],g>>=v,y-=v,n=tr;case tr:for(q=A-o;q<0;)q+=l.end;for(;t!==0;){if(C===0&&(A==l.end&&l.read!==0&&(A=0,C=A<l.read?l.read-A-1:l.end-A),C===0&&(l.write=A,w=l.inflate_flush(p,w),A=l.write,C=A<l.read?l.read-A-1:l.end-A,A==l.end&&l.read!==0&&(A=0,C=A<l.read?l.read-A-1:l.end-A),C===0)))return l.bitb=g,l.bitk=y,p.avail_in=R,p.total_in+=S-p.next_in_index,p.next_in_index=S,l.write=A,l.inflate_flush(p,w);l.win[A++]=l.win[q++],C--,q==l.end&&(q=0),t--}n=ht;break;case nr:if(C===0&&(A==l.end&&l.read!==0&&(A=0,C=A<l.read?l.read-A-1:l.end-A),C===0&&(l.write=A,w=l.inflate_flush(p,w),A=l.write,C=A<l.read?l.read-A-1:l.end-A,A==l.end&&l.read!==0&&(A=0,C=A<l.read?l.read-A-1:l.end-A),C===0)))return l.bitb=g,l.bitk=y,p.avail_in=R,p.total_in+=S-p.next_in_index,p.next_in_index=S,l.write=A,l.inflate_flush(p,w);w=H,l.win[A++]=a,C--,n=ht;break;case Vt:if(y>7&&(y-=8,R++,S--),l.write=A,w=l.inflate_flush(p,w),A=l.write,C=A<l.read?l.read-A-1:l.end-A,l.read!=l.write)return l.bitb=g,l.bitk=y,p.avail_in=R,p.total_in+=S-p.next_in_index,p.next_in_index=S,l.write=A,l.inflate_flush(p,w);n=rr;case rr:return w=$e,l.bitb=g,l.bitk=y,p.avail_in=R,p.total_in+=S-p.next_in_index,p.next_in_index=S,l.write=A,l.inflate_flush(p,w);case _t:return w=Z,l.bitb=g,l.bitk=y,p.avail_in=R,p.total_in+=S-p.next_in_index,p.next_in_index=S,l.write=A,l.inflate_flush(p,w);default:return w=ie,l.bitb=g,l.bitk=y,p.avail_in=R,p.total_in+=S-p.next_in_index,p.next_in_index=S,l.write=A,l.inflate_flush(p,w)}},e.free=function(){}}const ir=[16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15],Me=0,Zt=1,sr=2,ar=3,or=4,cr=5,wt=6,gt=7,lr=8,Ce=9;function Aa(e,n){const t=this;let r=Me,i=0,s=0,a=0,c;const o=[0],f=[0],d=new Ra;let h=0,m=new Int32Array(Qr*3);const _=0,k=new ln;t.bitk=0,t.bitb=0,t.win=new Uint8Array(n),t.end=n,t.read=0,t.write=0,t.reset=function(u,l){l&&(l[0]=_),r==wt&&d.free(u),r=Me,t.bitk=0,t.bitb=0,t.read=t.write=0},t.reset(e,null),t.inflate_flush=function(u,l){let p,w,v;return w=u.next_out_index,v=t.read,p=(v<=t.write?t.write:t.end)-v,p>u.avail_out&&(p=u.avail_out),p!==0&&l==ke&&(l=H),u.avail_out-=p,u.total_out+=p,u.next_out.set(t.win.subarray(v,v+p),w),w+=p,v+=p,v==t.end&&(v=0,t.write==t.end&&(t.write=0),p=t.write-v,p>u.avail_out&&(p=u.avail_out),p!==0&&l==ke&&(l=H),u.avail_out-=p,u.total_out+=p,u.next_out.set(t.win.subarray(v,v+p),w),w+=p,v+=p),u.next_out_index=w,t.read=v,l},t.proc=function(u,l){let p,w,v,T,x,g,y,S;for(T=u.next_in_index,x=u.avail_in,w=t.bitb,v=t.bitk,g=t.write,y=g<t.read?t.read-g-1:t.end-g;;){let R,A,C,q,O,B,N,L;switch(r){case Me:for(;v<3;){if(x!==0)l=H;else return t.bitb=w,t.bitk=v,u.avail_in=x,u.total_in+=T-u.next_in_index,u.next_in_index=T,t.write=g,t.inflate_flush(u,l);x--,w|=(u.read_byte(T++)&255)<<v,v+=8}switch(p=w&7,h=p&1,p>>>1){case 0:w>>>=3,v-=3,p=v&7,w>>>=p,v-=p,r=Zt;break;case 1:R=[],A=[],C=[[]],q=[[]],ln.inflate_trees_fixed(R,A,C,q),d.init(R[0],A[0],C[0],0,q[0],0),w>>>=3,v-=3,r=wt;break;case 2:w>>>=3,v-=3,r=ar;break;case 3:return w>>>=3,v-=3,r=Ce,u.msg="invalid block type",l=Z,t.bitb=w,t.bitk=v,u.avail_in=x,u.total_in+=T-u.next_in_index,u.next_in_index=T,t.write=g,t.inflate_flush(u,l)}break;case Zt:for(;v<32;){if(x!==0)l=H;else return t.bitb=w,t.bitk=v,u.avail_in=x,u.total_in+=T-u.next_in_index,u.next_in_index=T,t.write=g,t.inflate_flush(u,l);x--,w|=(u.read_byte(T++)&255)<<v,v+=8}if((~w>>>16&65535)!=(w&65535))return r=Ce,u.msg="invalid stored block lengths",l=Z,t.bitb=w,t.bitk=v,u.avail_in=x,u.total_in+=T-u.next_in_index,u.next_in_index=T,t.write=g,t.inflate_flush(u,l);i=w&65535,w=v=0,r=i!==0?sr:h!==0?gt:Me;break;case sr:if(x===0||y===0&&(g==t.end&&t.read!==0&&(g=0,y=g<t.read?t.read-g-1:t.end-g),y===0&&(t.write=g,l=t.inflate_flush(u,l),g=t.write,y=g<t.read?t.read-g-1:t.end-g,g==t.end&&t.read!==0&&(g=0,y=g<t.read?t.read-g-1:t.end-g),y===0)))return t.bitb=w,t.bitk=v,u.avail_in=x,u.total_in+=T-u.next_in_index,u.next_in_index=T,t.write=g,t.inflate_flush(u,l);if(l=H,p=i,p>x&&(p=x),p>y&&(p=y),t.win.set(u.read_buf(T,p),g),T+=p,x-=p,g+=p,y-=p,(i-=p)!==0)break;r=h!==0?gt:Me;break;case ar:for(;v<14;){if(x!==0)l=H;else return t.bitb=w,t.bitk=v,u.avail_in=x,u.total_in+=T-u.next_in_index,u.next_in_index=T,t.write=g,t.inflate_flush(u,l);x--,w|=(u.read_byte(T++)&255)<<v,v+=8}if(s=p=w&16383,(p&31)>29||(p>>5&31)>29)return r=Ce,u.msg="too many length or distance symbols",l=Z,t.bitb=w,t.bitk=v,u.avail_in=x,u.total_in+=T-u.next_in_index,u.next_in_index=T,t.write=g,t.inflate_flush(u,l);if(p=258+(p&31)+(p>>5&31),!c||c.length<p)c=[];else for(S=0;S<p;S++)c[S]=0;w>>>=14,v-=14,a=0,r=or;case or:for(;a<4+(s>>>10);){for(;v<3;){if(x!==0)l=H;else return t.bitb=w,t.bitk=v,u.avail_in=x,u.total_in+=T-u.next_in_index,u.next_in_index=T,t.write=g,t.inflate_flush(u,l);x--,w|=(u.read_byte(T++)&255)<<v,v+=8}c[ir[a++]]=w&7,w>>>=3,v-=3}for(;a<19;)c[ir[a++]]=0;if(o[0]=7,p=k.inflate_trees_bits(c,o,f,m,u),p!=H)return l=p,l==Z&&(c=null,r=Ce),t.bitb=w,t.bitk=v,u.avail_in=x,u.total_in+=T-u.next_in_index,u.next_in_index=T,t.write=g,t.inflate_flush(u,l);a=0,r=cr;case cr:for(;p=s,!(a>=258+(p&31)+(p>>5&31));){let j,G;for(p=o[0];v<p;){if(x!==0)l=H;else return t.bitb=w,t.bitk=v,u.avail_in=x,u.total_in+=T-u.next_in_index,u.next_in_index=T,t.write=g,t.inflate_flush(u,l);x--,w|=(u.read_byte(T++)&255)<<v,v+=8}if(p=m[(f[0]+(w&ae[p]))*3+1],G=m[(f[0]+(w&ae[p]))*3+2],G<16)w>>>=p,v-=p,c[a++]=G;else{for(S=G==18?7:G-14,j=G==18?11:3;v<p+S;){if(x!==0)l=H;else return t.bitb=w,t.bitk=v,u.avail_in=x,u.total_in+=T-u.next_in_index,u.next_in_index=T,t.write=g,t.inflate_flush(u,l);x--,w|=(u.read_byte(T++)&255)<<v,v+=8}if(w>>>=p,v-=p,j+=w&ae[S],w>>>=S,v-=S,S=a,p=s,S+j>258+(p&31)+(p>>5&31)||G==16&&S<1)return c=null,r=Ce,u.msg="invalid bit length repeat",l=Z,t.bitb=w,t.bitk=v,u.avail_in=x,u.total_in+=T-u.next_in_index,u.next_in_index=T,t.write=g,t.inflate_flush(u,l);G=G==16?c[S-1]:0;do c[S++]=G;while(--j!==0);a=S}}if(f[0]=-1,O=[],B=[],N=[],L=[],O[0]=9,B[0]=6,p=s,p=k.inflate_trees_dynamic(257+(p&31),1+(p>>5&31),c,O,B,N,L,m,u),p!=H)return p==Z&&(c=null,r=Ce),l=p,t.bitb=w,t.bitk=v,u.avail_in=x,u.total_in+=T-u.next_in_index,u.next_in_index=T,t.write=g,t.inflate_flush(u,l);d.init(O[0],B[0],m,N[0],m,L[0]),r=wt;case wt:if(t.bitb=w,t.bitk=v,u.avail_in=x,u.total_in+=T-u.next_in_index,u.next_in_index=T,t.write=g,(l=d.proc(t,u,l))!=$e)return t.inflate_flush(u,l);if(l=H,d.free(u),T=u.next_in_index,x=u.avail_in,w=t.bitb,v=t.bitk,g=t.write,y=g<t.read?t.read-g-1:t.end-g,h===0){r=Me;break}r=gt;case gt:if(t.write=g,l=t.inflate_flush(u,l),g=t.write,y=g<t.read?t.read-g-1:t.end-g,t.read!=t.write)return t.bitb=w,t.bitk=v,u.avail_in=x,u.total_in+=T-u.next_in_index,u.next_in_index=T,t.write=g,t.inflate_flush(u,l);r=lr;case lr:return l=$e,t.bitb=w,t.bitk=v,u.avail_in=x,u.total_in+=T-u.next_in_index,u.next_in_index=T,t.write=g,t.inflate_flush(u,l);case Ce:return l=Z,t.bitb=w,t.bitk=v,u.avail_in=x,u.total_in+=T-u.next_in_index,u.next_in_index=T,t.write=g,t.inflate_flush(u,l);default:return l=ie,t.bitb=w,t.bitk=v,u.avail_in=x,u.total_in+=T-u.next_in_index,u.next_in_index=T,t.write=g,t.inflate_flush(u,l)}}},t.free=function(u){t.reset(u,null),t.win=null,m=null},t.set_dictionary=function(u,l,p){t.win.set(u.subarray(l,l+p),0),t.read=t.write=p},t.sync_point=function(){return r==Zt?1:0}}const Ca=32,Ia=8,Oa=0,fr=1,dr=2,ur=3,pr=4,mr=5,Kt=6,Xe=7,hr=12,Pe=13,La=[0,0,255,255];function Ua(){const e=this;e.mode=0,e.method=0,e.was=[0],e.need=0,e.marker=0,e.wbits=0;function n(t){return!t||!t.istate?ie:(t.total_in=t.total_out=0,t.msg=null,t.istate.mode=Xe,t.istate.blocks.reset(t,null),H)}e.inflateEnd=function(t){return e.blocks&&e.blocks.free(t),e.blocks=null,H},e.inflateInit=function(t,r){return t.msg=null,e.blocks=null,r<8||r>15?(e.inflateEnd(t),ie):(e.wbits=r,t.istate.blocks=new Aa(t,1<<r),n(t),H)},e.inflate=function(t,r){let i,s;if(!t||!t.istate||!t.next_in)return ie;const a=t.istate;for(r=r==ya?ke:H,i=ke;;)switch(a.mode){case Oa:if(t.avail_in===0)return i;if(i=r,t.avail_in--,t.total_in++,((a.method=t.read_byte(t.next_in_index++))&15)!=Ia){a.mode=Pe,t.msg="unknown compression method",a.marker=5;break}if((a.method>>4)+8>a.wbits){a.mode=Pe,t.msg="invalid win size",a.marker=5;break}a.mode=fr;case fr:if(t.avail_in===0)return i;if(i=r,t.avail_in--,t.total_in++,s=t.read_byte(t.next_in_index++)&255,((a.method<<8)+s)%31!==0){a.mode=Pe,t.msg="incorrect header check",a.marker=5;break}if(!(s&Ca)){a.mode=Xe;break}a.mode=dr;case dr:if(t.avail_in===0)return i;i=r,t.avail_in--,t.total_in++,a.need=(t.read_byte(t.next_in_index++)&255)<<24&4278190080,a.mode=ur;case ur:if(t.avail_in===0)return i;i=r,t.avail_in--,t.total_in++,a.need+=(t.read_byte(t.next_in_index++)&255)<<16&16711680,a.mode=pr;case pr:if(t.avail_in===0)return i;i=r,t.avail_in--,t.total_in++,a.need+=(t.read_byte(t.next_in_index++)&255)<<8&65280,a.mode=mr;case mr:return t.avail_in===0?i:(i=r,t.avail_in--,t.total_in++,a.need+=t.read_byte(t.next_in_index++)&255,a.mode=Kt,ga);case Kt:return a.mode=Pe,t.msg="need dictionary",a.marker=0,ie;case Xe:if(i=a.blocks.proc(t,i),i==Z){a.mode=Pe,a.marker=0;break}if(i==H&&(i=r),i!=$e)return i;i=r,a.blocks.reset(t,a.was),a.mode=hr;case hr:return t.avail_in=0,$e;case Pe:return Z;default:return ie}},e.inflateSetDictionary=function(t,r,i){let s=0,a=i;if(!t||!t.istate||t.istate.mode!=Kt)return ie;const c=t.istate;return a>=1<<c.wbits&&(a=(1<<c.wbits)-1,s=i-a),c.blocks.set_dictionary(r,s,a),c.mode=Xe,H},e.inflateSync=function(t){let r,i,s,a,c;if(!t||!t.istate)return ie;const o=t.istate;if(o.mode!=Pe&&(o.mode=Pe,o.marker=0),(r=t.avail_in)===0)return ke;for(i=t.next_in_index,s=o.marker;r!==0&&s<4;)t.read_byte(i)==La[s]?s++:t.read_byte(i)!==0?s=0:s=4-s,i++,r--;return t.total_in+=i-t.next_in_index,t.next_in_index=i,t.avail_in=r,o.marker=s,s!=4?Z:(a=t.total_in,c=t.total_out,n(t),t.total_in=a,t.total_out=c,o.mode=Xe,H)},e.inflateSyncPoint=function(t){return!t||!t.istate||!t.istate.blocks?ie:t.istate.blocks.sync_point()}}function Jr(){}Jr.prototype={inflateInit(e){const n=this;return n.istate=new Ua,e||(e=wa),n.istate.inflateInit(n,e)},inflate(e){const n=this;return n.istate?n.istate.inflate(n,e):ie},inflateEnd(){const e=this;if(!e.istate)return ie;const n=e.istate.inflateEnd(e);return e.istate=null,n},inflateSync(){const e=this;return e.istate?e.istate.inflateSync(e):ie},inflateSetDictionary(e,n){const t=this;return t.istate?t.istate.inflateSetDictionary(t,e,n):ie},read_byte(e){return this.next_in[e]},read_buf(e,n){return this.next_in.subarray(e,e+n)}};function Na(e){const n=this,t=new Jr,r=e&&e.chunkSize?Math.floor(e.chunkSize*2):128*1024,i=xa,s=new Uint8Array(r);let a=!1;t.inflateInit(),t.next_out=s,n.append=function(c,o){const f=[];let d,h,m=0,_=0,k=0;if(c.length!==0){t.next_in_index=0,t.next_in=c,t.avail_in=c.length;do{if(t.next_out_index=0,t.avail_out=r,t.avail_in===0&&!a&&(t.next_in_index=0,a=!0),d=t.inflate(i),a&&d===ke){if(t.avail_in!==0)throw new Error("inflating: bad input")}else if(d!==H&&d!==$e)throw new Error("inflating: "+t.msg);if((a||d===$e)&&t.avail_in===c.length)throw new Error("inflating: bad input");t.next_out_index&&(t.next_out_index===r?f.push(new Uint8Array(s)):f.push(s.subarray(0,t.next_out_index))),k+=t.next_out_index,o&&t.next_in_index>0&&t.next_in_index!=m&&(o(t.next_in_index),m=t.next_in_index)}while(t.avail_in>0||t.avail_out===0);return f.length>1?(h=new Uint8Array(k),f.forEach(function(u){h.set(u,_),_+=u.length})):h=f[0]?new Uint8Array(f[0]):new Uint8Array,h}},n.flush=function(){t.inflateEnd()}}const Wt=void 0,Ne="undefined",bn="function";class _r{constructor(n){return class extends TransformStream{constructor(t,r){const i=new n(r);super({transform(s,a){a.enqueue(i.append(s))},flush(s){const a=i.flush();a&&s.enqueue(a)}})}}}}let Xr=2;try{typeof navigator!=Ne&&navigator.hardwareConcurrency&&(Xr=navigator.hardwareConcurrency)}catch{}const Wa={chunkSize:512*1024,maxWorkers:Xr,terminateWorkerTimeout:5e3,useWebWorkers:!0,useCompressionStream:!0,workerScripts:Wt,CompressionStreamNative:typeof CompressionStream!=Ne&&CompressionStream,DecompressionStreamNative:typeof DecompressionStream!=Ne&&DecompressionStream},Oe=Object.assign({},Wa);function vn(e){const{baseURL:n,chunkSize:t,maxWorkers:r,terminateWorkerTimeout:i,useCompressionStream:s,useWebWorkers:a,Deflate:c,Inflate:o,CompressionStream:f,DecompressionStream:d,workerScripts:h}=e;if(Re("baseURL",n),Re("chunkSize",t),Re("maxWorkers",r),Re("terminateWorkerTimeout",i),Re("useCompressionStream",s),Re("useWebWorkers",a),c&&(Oe.CompressionStream=new _r(c)),o&&(Oe.DecompressionStream=new _r(o)),Re("CompressionStream",f),Re("DecompressionStream",d),h!==Wt){const{deflate:m,inflate:_}=h;if((m||_)&&(Oe.workerScripts||(Oe.workerScripts={})),m){if(!Array.isArray(m))throw new Error("workerScripts.deflate must be an array");Oe.workerScripts.deflate=m}if(_){if(!Array.isArray(_))throw new Error("workerScripts.inflate must be an array");Oe.workerScripts.inflate=_}}}function Re(e,n){n!==Wt&&(Oe[e]=n)}const Qt={application:{"andrew-inset":"ez",annodex:"anx","atom+xml":"atom","atomcat+xml":"atomcat","atomserv+xml":"atomsrv",bbolin:"lin","cu-seeme":"cu","davmount+xml":"davmount",dsptype:"tsp",ecmascript:["es","ecma"],futuresplash:"spl",hta:"hta","java-archive":"jar","java-serialized-object":"ser","java-vm":"class",m3g:"m3g","mac-binhex40":"hqx",mathematica:["nb","ma","mb"],msaccess:"mdb",msword:["doc","dot","wiz"],mxf:"mxf",oda:"oda",ogg:"ogx",pdf:"pdf","pgp-keys":"key","pgp-signature":["asc","sig"],"pics-rules":"prf",postscript:["ps","ai","eps","epsi","epsf","eps2","eps3"],rar:"rar","rdf+xml":"rdf","rss+xml":"rss",rtf:"rtf","xhtml+xml":["xhtml","xht"],xml:["xml","xsl","xsd","xpdl"],"xspf+xml":"xspf",zip:"zip","vnd.android.package-archive":"apk","vnd.cinderella":"cdy","vnd.google-earth.kml+xml":"kml","vnd.google-earth.kmz":"kmz","vnd.mozilla.xul+xml":"xul","vnd.ms-excel":["xls","xlb","xlt","xlm","xla","xlc","xlw"],"vnd.ms-pki.seccat":"cat","vnd.ms-pki.stl":"stl","vnd.ms-powerpoint":["ppt","pps","pot","ppa","pwz"],"vnd.oasis.opendocument.chart":"odc","vnd.oasis.opendocument.database":"odb","vnd.oasis.opendocument.formula":"odf","vnd.oasis.opendocument.graphics":"odg","vnd.oasis.opendocument.graphics-template":"otg","vnd.oasis.opendocument.image":"odi","vnd.oasis.opendocument.presentation":"odp","vnd.oasis.opendocument.presentation-template":"otp","vnd.oasis.opendocument.spreadsheet":"ods","vnd.oasis.opendocument.spreadsheet-template":"ots","vnd.oasis.opendocument.text":"odt","vnd.oasis.opendocument.text-master":["odm","otm"],"vnd.oasis.opendocument.text-template":"ott","vnd.oasis.opendocument.text-web":"oth","vnd.openxmlformats-officedocument.spreadsheetml.sheet":"xlsx","vnd.openxmlformats-officedocument.spreadsheetml.template":"xltx","vnd.openxmlformats-officedocument.presentationml.presentation":"pptx","vnd.openxmlformats-officedocument.presentationml.slideshow":"ppsx","vnd.openxmlformats-officedocument.presentationml.template":"potx","vnd.openxmlformats-officedocument.wordprocessingml.document":"docx","vnd.openxmlformats-officedocument.wordprocessingml.template":"dotx","vnd.smaf":"mmf","vnd.stardivision.calc":"sdc","vnd.stardivision.chart":"sds","vnd.stardivision.draw":"sda","vnd.stardivision.impress":"sdd","vnd.stardivision.math":["sdf","smf"],"vnd.stardivision.writer":["sdw","vor"],"vnd.stardivision.writer-global":"sgl","vnd.sun.xml.calc":"sxc","vnd.sun.xml.calc.template":"stc","vnd.sun.xml.draw":"sxd","vnd.sun.xml.draw.template":"std","vnd.sun.xml.impress":"sxi","vnd.sun.xml.impress.template":"sti","vnd.sun.xml.math":"sxm","vnd.sun.xml.writer":"sxw","vnd.sun.xml.writer.global":"sxg","vnd.sun.xml.writer.template":"stw","vnd.symbian.install":["sis","sisx"],"vnd.visio":["vsd","vst","vss","vsw","vsdx","vssx","vstx","vssm","vstm"],"vnd.wap.wbxml":"wbxml","vnd.wap.wmlc":"wmlc","vnd.wap.wmlscriptc":"wmlsc","vnd.wordperfect":"wpd","vnd.wordperfect5.1":"wp5","x-123":"wk","x-7z-compressed":"7z","x-abiword":"abw","x-apple-diskimage":"dmg","x-bcpio":"bcpio","x-bittorrent":"torrent","x-cbr":["cbr","cba","cbt","cb7"],"x-cbz":"cbz","x-cdf":["cdf","cda"],"x-cdlink":"vcd","x-chess-pgn":"pgn","x-cpio":"cpio","x-csh":"csh","x-director":["dir","dxr","cst","cct","cxt","w3d","fgd","swa"],"x-dms":"dms","x-doom":"wad","x-dvi":"dvi","x-httpd-eruby":"rhtml","x-font":"pcf.Z","x-freemind":"mm","x-gnumeric":"gnumeric","x-go-sgf":"sgf","x-graphing-calculator":"gcf","x-gtar":["gtar","taz"],"x-hdf":"hdf","x-httpd-php":["phtml","pht","php"],"x-httpd-php-source":"phps","x-httpd-php3":"php3","x-httpd-php3-preprocessed":"php3p","x-httpd-php4":"php4","x-httpd-php5":"php5","x-ica":"ica","x-info":"info","x-internet-signup":["ins","isp"],"x-iphone":"iii","x-iso9660-image":"iso","x-java-jnlp-file":"jnlp","x-jmol":"jmz","x-killustrator":"kil","x-latex":"latex","x-lyx":"lyx","x-lzx":"lzx","x-maker":["frm","fb","fbdoc"],"x-ms-wmd":"wmd","x-msdos-program":["com","exe","bat","dll"],"x-netcdf":["nc"],"x-ns-proxy-autoconfig":["pac","dat"],"x-nwc":"nwc","x-object":"o","x-oz-application":"oza","x-pkcs7-certreqresp":"p7r","x-python-code":["pyc","pyo"],"x-qgis":["qgs","shp","shx"],"x-quicktimeplayer":"qtl","x-redhat-package-manager":["rpm","rpa"],"x-ruby":"rb","x-sh":"sh","x-shar":"shar","x-shockwave-flash":["swf","swfl"],"x-silverlight":"scr","x-stuffit":"sit","x-sv4cpio":"sv4cpio","x-sv4crc":"sv4crc","x-tar":"tar","x-tex-gf":"gf","x-tex-pk":"pk","x-texinfo":["texinfo","texi"],"x-trash":["~","%","bak","old","sik"],"x-ustar":"ustar","x-wais-source":"src","x-wingz":"wz","x-x509-ca-cert":["crt","der","cer"],"x-xcf":"xcf","x-xfig":"fig","x-xpinstall":"xpi",applixware:"aw","atomsvc+xml":"atomsvc","ccxml+xml":"ccxml","cdmi-capability":"cdmia","cdmi-container":"cdmic","cdmi-domain":"cdmid","cdmi-object":"cdmio","cdmi-queue":"cdmiq","docbook+xml":"dbk","dssc+der":"dssc","dssc+xml":"xdssc","emma+xml":"emma","epub+zip":"epub",exi:"exi","font-tdpfr":"pfr","gml+xml":"gml","gpx+xml":"gpx",gxf:"gxf",hyperstudio:"stk","inkml+xml":["ink","inkml"],ipfix:"ipfix","jsonml+json":"jsonml","lost+xml":"lostxml","mads+xml":"mads",marc:"mrc","marcxml+xml":"mrcx","mathml+xml":["mathml","mml"],mbox:"mbox","mediaservercontrol+xml":"mscml","metalink+xml":"metalink","metalink4+xml":"meta4","mets+xml":"mets","mods+xml":"mods",mp21:["m21","mp21"],mp4:"mp4s","oebps-package+xml":"opf","omdoc+xml":"omdoc",onenote:["onetoc","onetoc2","onetmp","onepkg"],oxps:"oxps","patch-ops-error+xml":"xer","pgp-encrypted":"pgp",pkcs10:"p10","pkcs7-mime":["p7m","p7c"],"pkcs7-signature":"p7s",pkcs8:"p8","pkix-attr-cert":"ac","pkix-crl":"crl","pkix-pkipath":"pkipath",pkixcmp:"pki","pls+xml":"pls","prs.cww":"cww","pskc+xml":"pskcxml","reginfo+xml":"rif","relax-ng-compact-syntax":"rnc","resource-lists+xml":"rl","resource-lists-diff+xml":"rld","rls-services+xml":"rs","rpki-ghostbusters":"gbr","rpki-manifest":"mft","rpki-roa":"roa","rsd+xml":"rsd","sbml+xml":"sbml","scvp-cv-request":"scq","scvp-cv-response":"scs","scvp-vp-request":"spq","scvp-vp-response":"spp",sdp:"sdp","set-payment-initiation":"setpay","set-registration-initiation":"setreg","shf+xml":"shf","sparql-query":"rq","sparql-results+xml":"srx",srgs:"gram","srgs+xml":"grxml","sru+xml":"sru","ssdl+xml":"ssdl","ssml+xml":"ssml","tei+xml":["tei","teicorpus"],"thraud+xml":"tfi","timestamped-data":"tsd","vnd.3gpp.pic-bw-large":"plb","vnd.3gpp.pic-bw-small":"psb","vnd.3gpp.pic-bw-var":"pvb","vnd.3gpp2.tcap":"tcap","vnd.3m.post-it-notes":"pwn","vnd.accpac.simply.aso":"aso","vnd.accpac.simply.imp":"imp","vnd.acucobol":"acu","vnd.acucorp":["atc","acutc"],"vnd.adobe.air-application-installer-package+zip":"air","vnd.adobe.formscentral.fcdt":"fcdt","vnd.adobe.fxp":["fxp","fxpl"],"vnd.adobe.xdp+xml":"xdp","vnd.adobe.xfdf":"xfdf","vnd.ahead.space":"ahead","vnd.airzip.filesecure.azf":"azf","vnd.airzip.filesecure.azs":"azs","vnd.amazon.ebook":"azw","vnd.americandynamics.acc":"acc","vnd.amiga.ami":"ami","vnd.anser-web-certificate-issue-initiation":"cii","vnd.anser-web-funds-transfer-initiation":"fti","vnd.antix.game-component":"atx","vnd.apple.installer+xml":"mpkg","vnd.apple.mpegurl":"m3u8","vnd.aristanetworks.swi":"swi","vnd.astraea-software.iota":"iota","vnd.audiograph":"aep","vnd.blueice.multipass":"mpm","vnd.bmi":"bmi","vnd.businessobjects":"rep","vnd.chemdraw+xml":"cdxml","vnd.chipnuts.karaoke-mmd":"mmd","vnd.claymore":"cla","vnd.cloanto.rp9":"rp9","vnd.clonk.c4group":["c4g","c4d","c4f","c4p","c4u"],"vnd.cluetrust.cartomobile-config":"c11amc","vnd.cluetrust.cartomobile-config-pkg":"c11amz","vnd.commonspace":"csp","vnd.contact.cmsg":"cdbcmsg","vnd.cosmocaller":"cmc","vnd.crick.clicker":"clkx","vnd.crick.clicker.keyboard":"clkk","vnd.crick.clicker.palette":"clkp","vnd.crick.clicker.template":"clkt","vnd.crick.clicker.wordbank":"clkw","vnd.criticaltools.wbs+xml":"wbs","vnd.ctc-posml":"pml","vnd.cups-ppd":"ppd","vnd.curl.car":"car","vnd.curl.pcurl":"pcurl","vnd.dart":"dart","vnd.data-vision.rdz":"rdz","vnd.dece.data":["uvf","uvvf","uvd","uvvd"],"vnd.dece.ttml+xml":["uvt","uvvt"],"vnd.dece.unspecified":["uvx","uvvx"],"vnd.dece.zip":["uvz","uvvz"],"vnd.denovo.fcselayout-link":"fe_launch","vnd.dna":"dna","vnd.dolby.mlp":"mlp","vnd.dpgraph":"dpg","vnd.dreamfactory":"dfac","vnd.ds-keypoint":"kpxx","vnd.dvb.ait":"ait","vnd.dvb.service":"svc","vnd.dynageo":"geo","vnd.ecowin.chart":"mag","vnd.enliven":"nml","vnd.epson.esf":"esf","vnd.epson.msf":"msf","vnd.epson.quickanime":"qam","vnd.epson.salt":"slt","vnd.epson.ssf":"ssf","vnd.eszigno3+xml":["es3","et3"],"vnd.ezpix-album":"ez2","vnd.ezpix-package":"ez3","vnd.fdf":"fdf","vnd.fdsn.mseed":"mseed","vnd.fdsn.seed":["seed","dataless"],"vnd.flographit":"gph","vnd.fluxtime.clip":"ftc","vnd.framemaker":["fm","frame","maker","book"],"vnd.frogans.fnc":"fnc","vnd.frogans.ltf":"ltf","vnd.fsc.weblaunch":"fsc","vnd.fujitsu.oasys":"oas","vnd.fujitsu.oasys2":"oa2","vnd.fujitsu.oasys3":"oa3","vnd.fujitsu.oasysgp":"fg5","vnd.fujitsu.oasysprs":"bh2","vnd.fujixerox.ddd":"ddd","vnd.fujixerox.docuworks":"xdw","vnd.fujixerox.docuworks.binder":"xbd","vnd.fuzzysheet":"fzs","vnd.genomatix.tuxedo":"txd","vnd.geogebra.file":"ggb","vnd.geogebra.tool":"ggt","vnd.geometry-explorer":["gex","gre"],"vnd.geonext":"gxt","vnd.geoplan":"g2w","vnd.geospace":"g3w","vnd.gmx":"gmx","vnd.grafeq":["gqf","gqs"],"vnd.groove-account":"gac","vnd.groove-help":"ghf","vnd.groove-identity-message":"gim","vnd.groove-injector":"grv","vnd.groove-tool-message":"gtm","vnd.groove-tool-template":"tpl","vnd.groove-vcard":"vcg","vnd.hal+xml":"hal","vnd.handheld-entertainment+xml":"zmm","vnd.hbci":"hbci","vnd.hhe.lesson-player":"les","vnd.hp-hpgl":"hpgl","vnd.hp-hpid":"hpid","vnd.hp-hps":"hps","vnd.hp-jlyt":"jlt","vnd.hp-pcl":"pcl","vnd.hp-pclxl":"pclxl","vnd.hydrostatix.sof-data":"sfd-hdstx","vnd.ibm.minipay":"mpy","vnd.ibm.modcap":["afp","listafp","list3820"],"vnd.ibm.rights-management":"irm","vnd.ibm.secure-container":"sc","vnd.iccprofile":["icc","icm"],"vnd.igloader":"igl","vnd.immervision-ivp":"ivp","vnd.immervision-ivu":"ivu","vnd.insors.igm":"igm","vnd.intercon.formnet":["xpw","xpx"],"vnd.intergeo":"i2g","vnd.intu.qbo":"qbo","vnd.intu.qfx":"qfx","vnd.ipunplugged.rcprofile":"rcprofile","vnd.irepository.package+xml":"irp","vnd.is-xpr":"xpr","vnd.isac.fcs":"fcs","vnd.jam":"jam","vnd.jcp.javame.midlet-rms":"rms","vnd.jisp":"jisp","vnd.joost.joda-archive":"joda","vnd.kahootz":["ktz","ktr"],"vnd.kde.karbon":"karbon","vnd.kde.kchart":"chrt","vnd.kde.kformula":"kfo","vnd.kde.kivio":"flw","vnd.kde.kontour":"kon","vnd.kde.kpresenter":["kpr","kpt"],"vnd.kde.kspread":"ksp","vnd.kde.kword":["kwd","kwt"],"vnd.kenameaapp":"htke","vnd.kidspiration":"kia","vnd.kinar":["kne","knp"],"vnd.koan":["skp","skd","skt","skm"],"vnd.kodak-descriptor":"sse","vnd.las.las+xml":"lasxml","vnd.llamagraphics.life-balance.desktop":"lbd","vnd.llamagraphics.life-balance.exchange+xml":"lbe","vnd.lotus-1-2-3":"123","vnd.lotus-approach":"apr","vnd.lotus-freelance":"pre","vnd.lotus-notes":"nsf","vnd.lotus-organizer":"org","vnd.lotus-screencam":"scm","vnd.lotus-wordpro":"lwp","vnd.macports.portpkg":"portpkg","vnd.mcd":"mcd","vnd.medcalcdata":"mc1","vnd.mediastation.cdkey":"cdkey","vnd.mfer":"mwf","vnd.mfmp":"mfm","vnd.micrografx.flo":"flo","vnd.micrografx.igx":"igx","vnd.mif":"mif","vnd.mobius.daf":"daf","vnd.mobius.dis":"dis","vnd.mobius.mbk":"mbk","vnd.mobius.mqy":"mqy","vnd.mobius.msl":"msl","vnd.mobius.plc":"plc","vnd.mobius.txf":"txf","vnd.mophun.application":"mpn","vnd.mophun.certificate":"mpc","vnd.ms-artgalry":"cil","vnd.ms-cab-compressed":"cab","vnd.ms-excel.addin.macroenabled.12":"xlam","vnd.ms-excel.sheet.binary.macroenabled.12":"xlsb","vnd.ms-excel.sheet.macroenabled.12":"xlsm","vnd.ms-excel.template.macroenabled.12":"xltm","vnd.ms-fontobject":"eot","vnd.ms-htmlhelp":"chm","vnd.ms-ims":"ims","vnd.ms-lrm":"lrm","vnd.ms-officetheme":"thmx","vnd.ms-powerpoint.addin.macroenabled.12":"ppam","vnd.ms-powerpoint.presentation.macroenabled.12":"pptm","vnd.ms-powerpoint.slide.macroenabled.12":"sldm","vnd.ms-powerpoint.slideshow.macroenabled.12":"ppsm","vnd.ms-powerpoint.template.macroenabled.12":"potm","vnd.ms-project":["mpp","mpt"],"vnd.ms-word.document.macroenabled.12":"docm","vnd.ms-word.template.macroenabled.12":"dotm","vnd.ms-works":["wps","wks","wcm","wdb"],"vnd.ms-wpl":"wpl","vnd.ms-xpsdocument":"xps","vnd.mseq":"mseq","vnd.musician":"mus","vnd.muvee.style":"msty","vnd.mynfc":"taglet","vnd.neurolanguage.nlu":"nlu","vnd.nitf":["ntf","nitf"],"vnd.noblenet-directory":"nnd","vnd.noblenet-sealer":"nns","vnd.noblenet-web":"nnw","vnd.nokia.n-gage.data":"ngdat","vnd.nokia.n-gage.symbian.install":"n-gage","vnd.nokia.radio-preset":"rpst","vnd.nokia.radio-presets":"rpss","vnd.novadigm.edm":"edm","vnd.novadigm.edx":"edx","vnd.novadigm.ext":"ext","vnd.oasis.opendocument.chart-template":"otc","vnd.oasis.opendocument.formula-template":"odft","vnd.oasis.opendocument.image-template":"oti","vnd.olpc-sugar":"xo","vnd.oma.dd2+xml":"dd2","vnd.openofficeorg.extension":"oxt","vnd.openxmlformats-officedocument.presentationml.slide":"sldx","vnd.osgeo.mapguide.package":"mgp","vnd.osgi.dp":"dp","vnd.osgi.subsystem":"esa","vnd.palm":["pdb","pqa","oprc"],"vnd.pawaafile":"paw","vnd.pg.format":"str","vnd.pg.osasli":"ei6","vnd.picsel":"efif","vnd.pmi.widget":"wg","vnd.pocketlearn":"plf","vnd.powerbuilder6":"pbd","vnd.previewsystems.box":"box","vnd.proteus.magazine":"mgz","vnd.publishare-delta-tree":"qps","vnd.pvi.ptid1":"ptid","vnd.quark.quarkxpress":["qxd","qxt","qwd","qwt","qxl","qxb"],"vnd.realvnc.bed":"bed","vnd.recordare.musicxml":"mxl","vnd.recordare.musicxml+xml":"musicxml","vnd.rig.cryptonote":"cryptonote","vnd.rn-realmedia":"rm","vnd.rn-realmedia-vbr":"rmvb","vnd.route66.link66+xml":"link66","vnd.sailingtracker.track":"st","vnd.seemail":"see","vnd.sema":"sema","vnd.semd":"semd","vnd.semf":"semf","vnd.shana.informed.formdata":"ifm","vnd.shana.informed.formtemplate":"itp","vnd.shana.informed.interchange":"iif","vnd.shana.informed.package":"ipk","vnd.simtech-mindmapper":["twd","twds"],"vnd.smart.teacher":"teacher","vnd.solent.sdkm+xml":["sdkm","sdkd"],"vnd.spotfire.dxp":"dxp","vnd.spotfire.sfs":"sfs","vnd.stepmania.package":"smzip","vnd.stepmania.stepchart":"sm","vnd.sus-calendar":["sus","susp"],"vnd.svd":"svd","vnd.syncml+xml":"xsm","vnd.syncml.dm+wbxml":"bdm","vnd.syncml.dm+xml":"xdm","vnd.tao.intent-module-archive":"tao","vnd.tcpdump.pcap":["pcap","cap","dmp"],"vnd.tmobile-livetv":"tmo","vnd.trid.tpt":"tpt","vnd.triscape.mxs":"mxs","vnd.trueapp":"tra","vnd.ufdl":["ufd","ufdl"],"vnd.uiq.theme":"utz","vnd.umajin":"umj","vnd.unity":"unityweb","vnd.uoml+xml":"uoml","vnd.vcx":"vcx","vnd.visionary":"vis","vnd.vsf":"vsf","vnd.webturbo":"wtb","vnd.wolfram.player":"nbp","vnd.wqd":"wqd","vnd.wt.stf":"stf","vnd.xara":"xar","vnd.xfdl":"xfdl","vnd.yamaha.hv-dic":"hvd","vnd.yamaha.hv-script":"hvs","vnd.yamaha.hv-voice":"hvp","vnd.yamaha.openscoreformat":"osf","vnd.yamaha.openscoreformat.osfpvg+xml":"osfpvg","vnd.yamaha.smaf-audio":"saf","vnd.yamaha.smaf-phrase":"spf","vnd.yellowriver-custom-menu":"cmp","vnd.zul":["zir","zirz"],"vnd.zzazz.deck+xml":"zaz","voicexml+xml":"vxml",widget:"wgt",winhlp:"hlp","wsdl+xml":"wsdl","wspolicy+xml":"wspolicy","x-ace-compressed":"ace","x-authorware-bin":["aab","x32","u32","vox"],"x-authorware-map":"aam","x-authorware-seg":"aas","x-blorb":["blb","blorb"],"x-bzip":"bz","x-bzip2":["bz2","boz"],"x-cfs-compressed":"cfs","x-chat":"chat","x-conference":"nsc","x-dgc-compressed":"dgc","x-dtbncx+xml":"ncx","x-dtbook+xml":"dtb","x-dtbresource+xml":"res","x-eva":"eva","x-font-bdf":"bdf","x-font-ghostscript":"gsf","x-font-linux-psf":"psf","x-font-pcf":"pcf","x-font-snf":"snf","x-font-ttf":["ttf","ttc"],"x-font-type1":["pfa","pfb","pfm","afm"],"x-freearc":"arc","x-gca-compressed":"gca","x-glulx":"ulx","x-gramps-xml":"gramps","x-install-instructions":"install","x-lzh-compressed":["lzh","lha"],"x-mie":"mie","x-mobipocket-ebook":["prc","mobi"],"x-ms-application":"application","x-ms-shortcut":"lnk","x-ms-xbap":"xbap","x-msbinder":"obd","x-mscardfile":"crd","x-msclip":"clp","application/x-ms-installer":"msi","x-msmediaview":["mvb","m13","m14"],"x-msmetafile":["wmf","wmz","emf","emz"],"x-msmoney":"mny","x-mspublisher":"pub","x-msschedule":"scd","x-msterminal":"trm","x-mswrite":"wri","x-nzb":"nzb","x-pkcs12":["p12","pfx"],"x-pkcs7-certificates":["p7b","spc"],"x-research-info-systems":"ris","x-silverlight-app":"xap","x-sql":"sql","x-stuffitx":"sitx","x-subrip":"srt","x-t3vm-image":"t3","x-tex-tfm":"tfm","x-tgif":"obj","x-xliff+xml":"xlf","x-xz":"xz","x-zmachine":["z1","z2","z3","z4","z5","z6","z7","z8"],"xaml+xml":"xaml","xcap-diff+xml":"xdf","xenc+xml":"xenc","xml-dtd":"dtd","xop+xml":"xop","xproc+xml":"xpl","xslt+xml":"xslt","xv+xml":["mxml","xhvml","xvml","xvm"],yang:"yang","yin+xml":"yin",envoy:"evy",fractals:"fif","internet-property-stream":"acx",olescript:"axs","vnd.ms-outlook":"msg","vnd.ms-pkicertstore":"sst","x-compress":"z","x-perfmon":["pma","pmc","pmr","pmw"],"ynd.ms-pkipko":"pko",gzip:["gz","tgz"],"smil+xml":["smi","smil"],"vnd.debian.binary-package":["deb","udeb"],"vnd.hzn-3d-crossword":"x3d","vnd.sqlite3":["db","sqlite","sqlite3","db-wal","sqlite-wal","db-shm","sqlite-shm"],"vnd.wap.sic":"sic","vnd.wap.slc":"slc","x-krita":["kra","krz"],"x-perl":["pm","pl"],yaml:["yaml","yml"]},audio:{amr:"amr","amr-wb":"awb",annodex:"axa",basic:["au","snd"],flac:"flac",midi:["mid","midi","kar","rmi"],mpeg:["mpga","mpega","mp3","m4a","mp2a","m2a","m3a"],mpegurl:"m3u",ogg:["oga","ogg","spx"],"prs.sid":"sid","x-aiff":"aifc","x-gsm":"gsm","x-ms-wma":"wma","x-ms-wax":"wax","x-pn-realaudio":"ram","x-realaudio":"ra","x-sd2":"sd2",adpcm:"adp",mp4:"mp4a",s3m:"s3m",silk:"sil","vnd.dece.audio":["uva","uvva"],"vnd.digital-winds":"eol","vnd.dra":"dra","vnd.dts":"dts","vnd.dts.hd":"dtshd","vnd.lucent.voice":"lvp","vnd.ms-playready.media.pya":"pya","vnd.nuera.ecelp4800":"ecelp4800","vnd.nuera.ecelp7470":"ecelp7470","vnd.nuera.ecelp9600":"ecelp9600","vnd.rip":"rip",webm:"weba","x-caf":"caf","x-matroska":"mka","x-pn-realaudio-plugin":"rmp",xm:"xm",aac:"aac",aiff:["aiff","aif","aff"],opus:"opus",wav:"wav"},chemical:{"x-alchemy":"alc","x-cache":["cac","cache"],"x-cache-csf":"csf","x-cactvs-binary":["cbin","cascii","ctab"],"x-cdx":"cdx","x-chem3d":"c3d","x-cif":"cif","x-cmdf":"cmdf","x-cml":"cml","x-compass":"cpa","x-crossfire":"bsd","x-csml":["csml","csm"],"x-ctx":"ctx","x-cxf":["cxf","cef"],"x-embl-dl-nucleotide":["emb","embl"],"x-gamess-input":["inp","gam","gamin"],"x-gaussian-checkpoint":["fch","fchk"],"x-gaussian-cube":"cub","x-gaussian-input":["gau","gjc","gjf"],"x-gaussian-log":"gal","x-gcg8-sequence":"gcg","x-genbank":"gen","x-hin":"hin","x-isostar":["istr","ist"],"x-jcamp-dx":["jdx","dx"],"x-kinemage":"kin","x-macmolecule":"mcm","x-macromodel-input":"mmod","x-mdl-molfile":"mol","x-mdl-rdfile":"rd","x-mdl-rxnfile":"rxn","x-mdl-sdfile":"sd","x-mdl-tgf":"tgf","x-mmcif":"mcif","x-mol2":"mol2","x-molconn-Z":"b","x-mopac-graph":"gpt","x-mopac-input":["mop","mopcrt","zmt"],"x-mopac-out":"moo","x-ncbi-asn1":"asn","x-ncbi-asn1-ascii":["prt","ent"],"x-ncbi-asn1-binary":"val","x-rosdal":"ros","x-swissprot":"sw","x-vamas-iso14976":"vms","x-vmd":"vmd","x-xtel":"xtel","x-xyz":"xyz"},font:{otf:"otf",woff:"woff",woff2:"woff2"},image:{gif:"gif",ief:"ief",jpeg:["jpeg","jpg","jpe","jfif","jfif-tbnl","jif"],pcx:"pcx",png:"png","svg+xml":["svg","svgz"],tiff:["tiff","tif"],"vnd.djvu":["djvu","djv"],"vnd.wap.wbmp":"wbmp","x-canon-cr2":"cr2","x-canon-crw":"crw","x-cmu-raster":"ras","x-coreldraw":"cdr","x-coreldrawpattern":"pat","x-coreldrawtemplate":"cdt","x-corelphotopaint":"cpt","x-epson-erf":"erf","x-icon":"ico","x-jg":"art","x-jng":"jng","x-nikon-nef":"nef","x-olympus-orf":"orf","x-portable-anymap":"pnm","x-portable-bitmap":"pbm","x-portable-graymap":"pgm","x-portable-pixmap":"ppm","x-rgb":"rgb","x-xbitmap":"xbm","x-xpixmap":"xpm","x-xwindowdump":"xwd",bmp:"bmp",cgm:"cgm",g3fax:"g3",ktx:"ktx","prs.btif":"btif",sgi:"sgi","vnd.dece.graphic":["uvi","uvvi","uvg","uvvg"],"vnd.dwg":"dwg","vnd.dxf":"dxf","vnd.fastbidsheet":"fbs","vnd.fpx":"fpx","vnd.fst":"fst","vnd.fujixerox.edmics-mmr":"mmr","vnd.fujixerox.edmics-rlc":"rlc","vnd.ms-modi":"mdi","vnd.ms-photo":"wdp","vnd.net-fpx":"npx","vnd.xiff":"xif",webp:"webp","x-3ds":"3ds","x-cmx":"cmx","x-freehand":["fh","fhc","fh4","fh5","fh7"],"x-pict":["pic","pct"],"x-tga":"tga","cis-cod":"cod",avif:"avifs",heic:["heif","heic"],pjpeg:["pjpg"],"vnd.adobe.photoshop":"psd","x-adobe-dng":"dng","x-fuji-raf":"raf","x-icns":"icns","x-kodak-dcr":"dcr","x-kodak-k25":"k25","x-kodak-kdc":"kdc","x-minolta-mrw":"mrw","x-panasonic-raw":["raw","rw2","rwl"],"x-pentax-pef":["pef","ptx"],"x-sigma-x3f":"x3f","x-sony-arw":"arw","x-sony-sr2":"sr2","x-sony-srf":"srf"},message:{rfc822:["eml","mime","mht","mhtml","nws"]},model:{iges:["igs","iges"],mesh:["msh","mesh","silo"],vrml:["wrl","vrml"],"x3d+vrml":["x3dv","x3dvz"],"x3d+xml":"x3dz","x3d+binary":["x3db","x3dbz"],"vnd.collada+xml":"dae","vnd.dwf":"dwf","vnd.gdl":"gdl","vnd.gtw":"gtw","vnd.mts":"mts","vnd.usdz+zip":"usdz","vnd.vtu":"vtu"},text:{"cache-manifest":["manifest","appcache"],calendar:["ics","icz","ifb"],css:"css",csv:"csv",h323:"323",html:["html","htm","shtml","stm"],iuls:"uls",plain:["txt","text","brf","conf","def","list","log","in","bas","diff","ksh"],richtext:"rtx",scriptlet:["sct","wsc"],texmacs:"tm","tab-separated-values":"tsv","vnd.sun.j2me.app-descriptor":"jad","vnd.wap.wml":"wml","vnd.wap.wmlscript":"wmls","x-bibtex":"bib","x-boo":"boo","x-c++hdr":["h++","hpp","hxx","hh"],"x-c++src":["c++","cpp","cxx","cc"],"x-component":"htc","x-dsrc":"d","x-diff":"patch","x-haskell":"hs","x-java":"java","x-literate-haskell":"lhs","x-moc":"moc","x-pascal":["p","pas","pp","inc"],"x-pcs-gcd":"gcd","x-python":"py","x-scala":"scala","x-setext":"etx","x-tcl":["tcl","tk"],"x-tex":["tex","ltx","sty","cls"],"x-vcalendar":"vcs","x-vcard":"vcf",n3:"n3","prs.lines.tag":"dsc",sgml:["sgml","sgm"],troff:["t","tr","roff","man","me","ms"],turtle:"ttl","uri-list":["uri","uris","urls"],vcard:"vcard","vnd.curl":"curl","vnd.curl.dcurl":"dcurl","vnd.curl.scurl":"scurl","vnd.curl.mcurl":"mcurl","vnd.dvb.subtitle":"sub","vnd.fly":"fly","vnd.fmi.flexstor":"flx","vnd.graphviz":"gv","vnd.in3d.3dml":"3dml","vnd.in3d.spot":"spot","x-asm":["s","asm"],"x-c":["c","h","dic"],"x-fortran":["f","for","f77","f90"],"x-opml":"opml","x-nfo":"nfo","x-sfv":"sfv","x-uuencode":"uu",webviewhtml:"htt",javascript:"js",json:"json",markdown:["md","markdown","mdown","markdn"],"vnd.wap.si":"si","vnd.wap.sl":"sl"},video:{avif:"avif","3gpp":"3gp",annodex:"axv",dl:"dl",dv:["dif","dv"],fli:"fli",gl:"gl",mpeg:["mpeg","mpg","mpe","m1v","m2v","mp2","mpa","mpv2"],mp4:["mp4","mp4v","mpg4"],quicktime:["qt","mov"],ogg:"ogv","vnd.mpegurl":["mxu","m4u"],"x-flv":"flv","x-la-asf":["lsf","lsx"],"x-mng":"mng","x-ms-asf":["asf","asx","asr"],"x-ms-wm":"wm","x-ms-wmv":"wmv","x-ms-wmx":"wmx","x-ms-wvx":"wvx","x-msvideo":"avi","x-sgi-movie":"movie","x-matroska":["mpv","mkv","mk3d","mks"],"3gpp2":"3g2",h261:"h261",h263:"h263",h264:"h264",jpeg:"jpgv",jpm:["jpm","jpgm"],mj2:["mj2","mjp2"],"vnd.dece.hd":["uvh","uvvh"],"vnd.dece.mobile":["uvm","uvvm"],"vnd.dece.pd":["uvp","uvvp"],"vnd.dece.sd":["uvs","uvvs"],"vnd.dece.video":["uvv","uvvv"],"vnd.dvb.file":"dvb","vnd.fvt":"fvt","vnd.ms-playready.media.pyv":"pyv","vnd.uvvu.mp4":["uvu","uvvu"],"vnd.vivo":"viv",webm:"webm","x-f4v":"f4v","x-m4v":"m4v","x-ms-vob":"vob","x-smv":"smv",mp2t:"ts"},"x-conference":{"x-cooltalk":"ice"},"x-world":{"x-vrml":["vrm","flr","wrz","xaf","xof"]}};(()=>{const e={};for(const n of Object.keys(Qt))for(const t of Object.keys(Qt[n])){const r=Qt[n][t];if(typeof r=="string")e[r]=n+"/"+t;else for(let i=0;i<r.length;i++)e[r[i]]=n+"/"+t}return e})();const zr=[];for(let e=0;e<256;e++){let n=e;for(let t=0;t<8;t++)n&1?n=n>>>1^3988292384:n=n>>>1;zr[e]=n}class fn{constructor(n){this.crc=n||-1}append(n){let t=this.crc|0;for(let r=0,i=n.length|0;r<i;r++)t=t>>>8^zr[(t^n[r])&255];this.crc=t}get(){return~this.crc}}class ei extends TransformStream{constructor(){let n;const t=new fn;super({transform(r,i){t.append(r),i.enqueue(r)},flush(){const r=new Uint8Array(4);new DataView(r.buffer).setUint32(0,t.get()),n.value=r}}),n=this}}function qa(e){if(typeof TextEncoder==Ne){e=unescape(encodeURIComponent(e));const n=new Uint8Array(e.length);for(let t=0;t<n.length;t++)n[t]=e.charCodeAt(t);return n}else return new TextEncoder().encode(e)}const ne={concat(e,n){if(e.length===0||n.length===0)return e.concat(n);const t=e[e.length-1],r=ne.getPartial(t);return r===32?e.concat(n):ne._shiftRight(n,r,t|0,e.slice(0,e.length-1))},bitLength(e){const n=e.length;if(n===0)return 0;const t=e[n-1];return(n-1)*32+ne.getPartial(t)},clamp(e,n){if(e.length*32<n)return e;e=e.slice(0,Math.ceil(n/32));const t=e.length;return n=n&31,t>0&&n&&(e[t-1]=ne.partial(n,e[t-1]&2147483648>>n-1,1)),e},partial(e,n,t){return e===32?n:(t?n|0:n<<32-e)+e*1099511627776},getPartial(e){return Math.round(e/1099511627776)||32},_shiftRight(e,n,t,r){for(r===void 0&&(r=[]);n>=32;n-=32)r.push(t),t=0;if(n===0)return r.concat(e);for(let a=0;a<e.length;a++)r.push(t|e[a]>>>n),t=e[a]<<32-n;const i=e.length?e[e.length-1]:0,s=ne.getPartial(i);return r.push(ne.partial(n+s&31,n+s>32?t:r.pop(),1)),r}},Ct={bytes:{fromBits(e){const t=ne.bitLength(e)/8,r=new Uint8Array(t);let i;for(let s=0;s<t;s++)s&3||(i=e[s/4]),r[s]=i>>>24,i<<=8;return r},toBits(e){const n=[];let t,r=0;for(t=0;t<e.length;t++)r=r<<8|e[t],(t&3)===3&&(n.push(r),r=0);return t&3&&n.push(ne.partial(8*(t&3),r)),n}}},ti={};ti.sha1=class{constructor(e){const n=this;n.blockSize=512,n._init=[1732584193,4023233417,2562383102,271733878,3285377520],n._key=[1518500249,1859775393,2400959708,3395469782],e?(n._h=e._h.slice(0),n._buffer=e._buffer.slice(0),n._length=e._length):n.reset()}reset(){const e=this;return e._h=e._init.slice(0),e._buffer=[],e._length=0,e}update(e){const n=this;typeof e=="string"&&(e=Ct.utf8String.toBits(e));const t=n._buffer=ne.concat(n._buffer,e),r=n._length,i=n._length=r+ne.bitLength(e);if(i>9007199254740991)throw new Error("Cannot hash more than 2^53 - 1 bits");const s=new Uint32Array(t);let a=0;for(let c=n.blockSize+r-(n.blockSize+r&n.blockSize-1);c<=i;c+=n.blockSize)n._block(s.subarray(16*a,16*(a+1))),a+=1;return t.splice(0,16*a),n}finalize(){const e=this;let n=e._buffer;const t=e._h;n=ne.concat(n,[ne.partial(1,1)]);for(let r=n.length+2;r&15;r++)n.push(0);for(n.push(Math.floor(e._length/4294967296)),n.push(e._length|0);n.length;)e._block(n.splice(0,16));return e.reset(),t}_f(e,n,t,r){if(e<=19)return n&t|~n&r;if(e<=39)return n^t^r;if(e<=59)return n&t|n&r|t&r;if(e<=79)return n^t^r}_S(e,n){return n<<e|n>>>32-e}_block(e){const n=this,t=n._h,r=Array(80);for(let f=0;f<16;f++)r[f]=e[f];let i=t[0],s=t[1],a=t[2],c=t[3],o=t[4];for(let f=0;f<=79;f++){f>=16&&(r[f]=n._S(1,r[f-3]^r[f-8]^r[f-14]^r[f-16]));const d=n._S(5,i)+n._f(f,s,a,c)+o+r[f]+n._key[Math.floor(f/20)]|0;o=c,c=a,a=n._S(30,s),s=i,i=d}t[0]=t[0]+i|0,t[1]=t[1]+s|0,t[2]=t[2]+a|0,t[3]=t[3]+c|0,t[4]=t[4]+o|0}};const ni={};ni.aes=class{constructor(e){const n=this;n._tables=[[[],[],[],[],[]],[[],[],[],[],[]]],n._tables[0][0][0]||n._precompute();const t=n._tables[0][4],r=n._tables[1],i=e.length;let s,a,c,o=1;if(i!==4&&i!==6&&i!==8)throw new Error("invalid aes key size");for(n._key=[a=e.slice(0),c=[]],s=i;s<4*i+28;s++){let f=a[s-1];(s%i===0||i===8&&s%i===4)&&(f=t[f>>>24]<<24^t[f>>16&255]<<16^t[f>>8&255]<<8^t[f&255],s%i===0&&(f=f<<8^f>>>24^o<<24,o=o<<1^(o>>7)*283)),a[s]=a[s-i]^f}for(let f=0;s;f++,s--){const d=a[f&3?s:s-4];s<=4||f<4?c[f]=d:c[f]=r[0][t[d>>>24]]^r[1][t[d>>16&255]]^r[2][t[d>>8&255]]^r[3][t[d&255]]}}encrypt(e){return this._crypt(e,0)}decrypt(e){return this._crypt(e,1)}_precompute(){const e=this._tables[0],n=this._tables[1],t=e[4],r=n[4],i=[],s=[];let a,c,o,f;for(let d=0;d<256;d++)s[(i[d]=d<<1^(d>>7)*283)^d]=d;for(let d=a=0;!t[d];d^=c||1,a=s[a]||1){let h=a^a<<1^a<<2^a<<3^a<<4;h=h>>8^h&255^99,t[d]=h,r[h]=d,f=i[o=i[c=i[d]]];let m=f*16843009^o*65537^c*257^d*16843008,_=i[h]*257^h*16843008;for(let k=0;k<4;k++)e[k][d]=_=_<<24^_>>>8,n[k][h]=m=m<<24^m>>>8}for(let d=0;d<5;d++)e[d]=e[d].slice(0),n[d]=n[d].slice(0)}_crypt(e,n){if(e.length!==4)throw new Error("invalid aes block size");const t=this._key[n],r=t.length/4-2,i=[0,0,0,0],s=this._tables[n],a=s[0],c=s[1],o=s[2],f=s[3],d=s[4];let h=e[0]^t[0],m=e[n?3:1]^t[1],_=e[2]^t[2],k=e[n?1:3]^t[3],u=4,l,p,w;for(let v=0;v<r;v++)l=a[h>>>24]^c[m>>16&255]^o[_>>8&255]^f[k&255]^t[u],p=a[m>>>24]^c[_>>16&255]^o[k>>8&255]^f[h&255]^t[u+1],w=a[_>>>24]^c[k>>16&255]^o[h>>8&255]^f[m&255]^t[u+2],k=a[k>>>24]^c[h>>16&255]^o[m>>8&255]^f[_&255]^t[u+3],u+=4,h=l,m=p,_=w;for(let v=0;v<4;v++)i[n?3&-v:v]=d[h>>>24]<<24^d[m>>16&255]<<16^d[_>>8&255]<<8^d[k&255]^t[u++],l=h,h=m,m=_,_=k,k=l;return i}};const Da={getRandomValues(e){const n=new Uint32Array(e.buffer),t=r=>{let i=987654321;const s=4294967295;return function(){return i=36969*(i&65535)+(i>>16)&s,r=18e3*(r&65535)+(r>>16)&s,(((i<<16)+r&s)/4294967296+.5)*(Math.random()>.5?1:-1)}};for(let r=0,i;r<e.length;r+=4){const s=t((i||Math.random())*4294967296);i=s()*987654071,n[r/4]=s()*4294967296|0}return e}},ri={};ri.ctrGladman=class{constructor(e,n){this._prf=e,this._initIv=n,this._iv=n}reset(){this._iv=this._initIv}update(e){return this.calculate(this._prf,e,this._iv)}incWord(e){if((e>>24&255)===255){let n=e>>16&255,t=e>>8&255,r=e&255;n===255?(n=0,t===255?(t=0,r===255?r=0:++r):++t):++n,e=0,e+=n<<16,e+=t<<8,e+=r}else e+=1<<24;return e}incCounter(e){(e[0]=this.incWord(e[0]))===0&&(e[1]=this.incWord(e[1]))}calculate(e,n,t){let r;if(!(r=n.length))return[];const i=ne.bitLength(n);for(let s=0;s<r;s+=4){this.incCounter(t);const a=e.encrypt(t);n[s]^=a[0],n[s+1]^=a[1],n[s+2]^=a[2],n[s+3]^=a[3]}return ne.clamp(n,i)}};const We={importKey(e){return new We.hmacSha1(Ct.bytes.toBits(e))},pbkdf2(e,n,t,r){if(t=t||1e4,r<0||t<0)throw new Error("invalid params to pbkdf2");const i=(r>>5)+1<<2;let s,a,c,o,f;const d=new ArrayBuffer(i),h=new DataView(d);let m=0;const _=ne;for(n=Ct.bytes.toBits(n),f=1;m<(i||1);f++){for(s=a=e.encrypt(_.concat(n,[f])),c=1;c<t;c++)for(a=e.encrypt(a),o=0;o<a.length;o++)s[o]^=a[o];for(c=0;m<(i||1)&&c<s.length;c++)h.setInt32(m,s[c]),m+=4}return d.slice(0,r/8)}};We.hmacSha1=class{constructor(e){const n=this,t=n._hash=ti.sha1,r=[[],[]];n._baseHash=[new t,new t];const i=n._baseHash[0].blockSize/32;e.length>i&&(e=new t().update(e).finalize());for(let s=0;s<i;s++)r[0][s]=e[s]^909522486,r[1][s]=e[s]^1549556828;n._baseHash[0].update(r[0]),n._baseHash[1].update(r[1]),n._resultHash=new t(n._baseHash[0])}reset(){const e=this;e._resultHash=new e._hash(e._baseHash[0]),e._updated=!1}update(e){const n=this;n._updated=!0,n._resultHash.update(e)}digest(){const e=this,n=e._resultHash.finalize(),t=new e._hash(e._baseHash[1]).update(n).finalize();return e.reset(),t}encrypt(e){if(this._updated)throw new Error("encrypt on already updated hmac called!");return this.update(e),this.digest(e)}};const Ma=typeof crypto!=Ne&&typeof crypto.getRandomValues==bn,ii="Invalid password",si="Invalid signature",ai="zipjs-abort-check-password";function oi(e){return Ma?crypto.getRandomValues(e):Da.getRandomValues(e)}const Be=16,Fa="raw",ci={name:"PBKDF2"},ja={name:"HMAC"},Ha="SHA-1",Ba=Object.assign({hash:ja},ci),dn=Object.assign({iterations:1e3,hash:{name:Ha}},ci),Ga=["deriveBits"],rt=[8,12,16],ze=[16,24,32],Ae=10,Ya=[0,0,0,0],qt=typeof crypto!=Ne,ot=qt&&crypto.subtle,li=qt&&typeof ot!=Ne,xe=Ct.bytes,Va=ni.aes,Za=ri.ctrGladman,Ka=We.hmacSha1;let wr=qt&&li&&typeof ot.importKey==bn,gr=qt&&li&&typeof ot.deriveBits==bn;class Qa extends TransformStream{constructor({password:n,rawPassword:t,signed:r,encryptionStrength:i,checkPasswordOnly:s}){super({start(){Object.assign(this,{ready:new Promise(a=>this.resolveReady=a),password:ui(n,t),signed:r,strength:i-1,pending:new Uint8Array})},async transform(a,c){const o=this,{password:f,strength:d,resolveReady:h,ready:m}=o;f?(await Xa(o,d,f,de(a,0,rt[d]+2)),a=de(a,rt[d]+2),s?c.error(new Error(ai)):h()):await m;const _=new Uint8Array(a.length-Ae-(a.length-Ae)%Be);c.enqueue(fi(o,a,_,0,Ae,!0))},async flush(a){const{signed:c,ctr:o,hmac:f,pending:d,ready:h}=this;if(f&&o){await h;const m=de(d,0,d.length-Ae),_=de(d,d.length-Ae);let k=new Uint8Array;if(m.length){const u=st(xe,m);f.update(u);const l=o.update(u);k=it(xe,l)}if(c){const u=de(it(xe,f.digest()),0,Ae);for(let l=0;l<Ae;l++)if(u[l]!=_[l])throw new Error(si)}a.enqueue(k)}}})}}class Ja extends TransformStream{constructor({password:n,rawPassword:t,encryptionStrength:r}){let i;super({start(){Object.assign(this,{ready:new Promise(s=>this.resolveReady=s),password:ui(n,t),strength:r-1,pending:new Uint8Array})},async transform(s,a){const c=this,{password:o,strength:f,resolveReady:d,ready:h}=c;let m=new Uint8Array;o?(m=await za(c,f,o),d()):await h;const _=new Uint8Array(m.length+s.length-s.length%Be);_.set(m,0),a.enqueue(fi(c,s,_,m.length,0))},async flush(s){const{ctr:a,hmac:c,pending:o,ready:f}=this;if(c&&a){await f;let d=new Uint8Array;if(o.length){const h=a.update(st(xe,o));c.update(h),d=it(xe,h)}i.signature=it(xe,c.digest()).slice(0,Ae),s.enqueue($n(d,i.signature))}}}),i=this}}function fi(e,n,t,r,i,s){const{ctr:a,hmac:c,pending:o}=e,f=n.length-i;o.length&&(n=$n(o,n),t=no(t,f-f%Be));let d;for(d=0;d<=f-Be;d+=Be){const h=st(xe,de(n,d,d+Be));s&&c.update(h);const m=a.update(h);s||c.update(m),t.set(it(xe,m),d+r)}return e.pending=de(n,d),t}async function Xa(e,n,t,r){const i=await di(e,n,t,de(r,0,rt[n])),s=de(r,rt[n]);if(i[0]!=s[0]||i[1]!=s[1])throw new Error(ii)}async function za(e,n,t){const r=oi(new Uint8Array(rt[n])),i=await di(e,n,t,r);return $n(r,i)}async function di(e,n,t,r){e.password=null;const i=await eo(Fa,t,Ba,!1,Ga),s=await to(Object.assign({salt:r},dn),i,8*(ze[n]*2+2)),a=new Uint8Array(s),c=st(xe,de(a,0,ze[n])),o=st(xe,de(a,ze[n],ze[n]*2)),f=de(a,ze[n]*2);return Object.assign(e,{keys:{key:c,authentication:o,passwordVerification:f},ctr:new Za(new Va(c),Array.from(Ya)),hmac:new Ka(o)}),f}async function eo(e,n,t,r,i){if(wr)try{return await ot.importKey(e,n,t,r,i)}catch{return wr=!1,We.importKey(n)}else return We.importKey(n)}async function to(e,n,t){if(gr)try{return await ot.deriveBits(e,n,t)}catch{return gr=!1,We.pbkdf2(n,e.salt,dn.iterations,t)}else return We.pbkdf2(n,e.salt,dn.iterations,t)}function ui(e,n){return n===Wt?qa(e):n}function $n(e,n){let t=e;return e.length+n.length&&(t=new Uint8Array(e.length+n.length),t.set(e,0),t.set(n,e.length)),t}function no(e,n){if(n&&n>e.length){const t=e;e=new Uint8Array(n),e.set(t,0)}return e}function de(e,n,t){return e.subarray(n,t)}function it(e,n){return e.fromBits(n)}function st(e,n){return e.toBits(n)}const Ge=12;class ro extends TransformStream{constructor({password:n,passwordVerification:t,checkPasswordOnly:r}){super({start(){Object.assign(this,{password:n,passwordVerification:t}),pi(this,n)},transform(i,s){const a=this;if(a.password){const c=xr(a,i.subarray(0,Ge));if(a.password=null,c[Ge-1]!=a.passwordVerification)throw new Error(ii);i=i.subarray(Ge)}r?s.error(new Error(ai)):s.enqueue(xr(a,i))}})}}class io extends TransformStream{constructor({password:n,passwordVerification:t}){super({start(){Object.assign(this,{password:n,passwordVerification:t}),pi(this,n)},transform(r,i){const s=this;let a,c;if(s.password){s.password=null;const o=oi(new Uint8Array(Ge));o[Ge-1]=s.passwordVerification,a=new Uint8Array(r.length+o.length),a.set(yr(s,o),0),c=Ge}else a=new Uint8Array(r.length),c=0;a.set(yr(s,r),c),i.enqueue(a)}})}}function xr(e,n){const t=new Uint8Array(n.length);for(let r=0;r<n.length;r++)t[r]=mi(e)^n[r],kn(e,t[r]);return t}function yr(e,n){const t=new Uint8Array(n.length);for(let r=0;r<n.length;r++)t[r]=mi(e)^n[r],kn(e,n[r]);return t}function pi(e,n){const t=[305419896,591751049,878082192];Object.assign(e,{keys:t,crcKey0:new fn(t[0]),crcKey2:new fn(t[2])});for(let r=0;r<n.length;r++)kn(e,n.charCodeAt(r))}function kn(e,n){let[t,r,i]=e.keys;e.crcKey0.append([n]),t=~e.crcKey0.get(),r=br(Math.imul(br(r+hi(t)),134775813)+1),e.crcKey2.append([r>>>24]),i=~e.crcKey2.get(),e.keys=[t,r,i]}function mi(e){const n=e.keys[2]|2;return hi(Math.imul(n,n^1)>>>8)}function hi(e){return e&255}function br(e){return e&4294967295}const vr="deflate-raw";class so extends TransformStream{constructor(n,{chunkSize:t,CompressionStream:r,CompressionStreamNative:i}){super({});const{compressed:s,encrypted:a,useCompressionStream:c,zipCrypto:o,signed:f,level:d}=n,h=this;let m,_,k=_i(super.readable);(!a||o)&&f&&(m=new ei,k=ye(k,m)),s&&(k=gi(k,c,{level:d,chunkSize:t},i,r)),a&&(o?k=ye(k,new io(n)):(_=new Ja(n),k=ye(k,_))),wi(h,k,()=>{let u;a&&!o&&(u=_.signature),(!a||o)&&f&&(u=new DataView(m.value.buffer).getUint32(0)),h.signature=u})}}class ao extends TransformStream{constructor(n,{chunkSize:t,DecompressionStream:r,DecompressionStreamNative:i}){super({});const{zipCrypto:s,encrypted:a,signed:c,signature:o,compressed:f,useCompressionStream:d}=n;let h,m,_=_i(super.readable);a&&(s?_=ye(_,new ro(n)):(m=new Qa(n),_=ye(_,m))),f&&(_=gi(_,d,{chunkSize:t},i,r)),(!a||s)&&c&&(h=new ei,_=ye(_,h)),wi(this,_,()=>{if((!a||s)&&c){const k=new DataView(h.value.buffer);if(o!=k.getUint32(0,!1))throw new Error(si)}})}}function _i(e){return ye(e,new TransformStream({transform(n,t){n&&n.length&&t.enqueue(n)}}))}function wi(e,n,t){n=ye(n,new TransformStream({flush:t})),Object.defineProperty(e,"readable",{get(){return n}})}function gi(e,n,t,r,i){try{const s=n&&r?r:i;e=ye(e,new s(vr,t))}catch{if(n)try{e=ye(e,new i(vr,t))}catch{return e}else return e}return e}function ye(e,n){return e.pipeThrough(n)}const oo="deflate",co="inflate";class Rc extends TransformStream{constructor(n,t){super({});const r=this,{codecType:i}=n;let s;i.startsWith(oo)?s=so:i.startsWith(co)&&(s=ao);let a=0,c=0;const o=new s(n,t),f=super.readable,d=new TransformStream({transform(m,_){m&&m.length&&(c+=m.length,_.enqueue(m))},flush(){Object.assign(r,{inputSize:c})}}),h=new TransformStream({transform(m,_){m&&m.length&&(a+=m.length,_.enqueue(m))},flush(){const{signature:m}=o;Object.assign(r,{signature:m,outputSize:a,inputSize:c})}});Object.defineProperty(r,"readable",{get(){return f.pipeThrough(d).pipeThrough(o).pipeThrough(h)}})}}class Ac extends TransformStream{constructor(n){let t;super({transform:r,flush(i){t&&t.length&&i.enqueue(t)}});function r(i,s){if(t){const a=new Uint8Array(t.length+i.length);a.set(t),a.set(i,t.length),i=a,t=null}i.length>n?(s.enqueue(i.slice(0,n)),r(i.slice(n),s)):t=i}}}class Cc extends TransformStream{constructor(n,{onstart:t,onprogress:r,size:i,onend:s}){let a=0;super({async start(){t&&await Jt(t,i)},async transform(c,o){a+=c.length,r&&await Jt(r,a,i),o.enqueue(c)},async flush(){n.size=a,s&&await Jt(s,a)}})}}async function Jt(e,...n){try{await e(...n)}catch{}}function lo(e,n={}){const t=`const{Array:e,Object:t,Number:n,Math:r,Error:s,Uint8Array:i,Uint16Array:o,Uint32Array:c,Int32Array:f,Map:a,DataView:l,Promise:u,TextEncoder:w,crypto:h,postMessage:d,TransformStream:p,ReadableStream:y,WritableStream:m,CompressionStream:b,DecompressionStream:g}=self,k=void 0,v="undefined",S="function";class z{constructor(e){return class extends p{constructor(t,n){const r=new e(n);super({transform(e,t){t.enqueue(r.append(e))},flush(e){const t=r.flush();t&&e.enqueue(t)}})}}}}const C=[];for(let e=0;256>e;e++){let t=e;for(let e=0;8>e;e++)1&t?t=t>>>1^3988292384:t>>>=1;C[e]=t}class x{constructor(e){this.t=e||-1}append(e){let t=0|this.t;for(let n=0,r=0|e.length;r>n;n++)t=t>>>8^C[255&(t^e[n])];this.t=t}get(){return~this.t}}class A extends p{constructor(){let e;const t=new x;super({transform(e,n){t.append(e),n.enqueue(e)},flush(){const n=new i(4);new l(n.buffer).setUint32(0,t.get()),e.value=n}}),e=this}}const _={concat(e,t){if(0===e.length||0===t.length)return e.concat(t);const n=e[e.length-1],r=_.i(n);return 32===r?e.concat(t):_.o(t,r,0|n,e.slice(0,e.length-1))},l(e){const t=e.length;if(0===t)return 0;const n=e[t-1];return 32*(t-1)+_.i(n)},u(e,t){if(32*e.length<t)return e;const n=(e=e.slice(0,r.ceil(t/32))).length;return t&=31,n>0&&t&&(e[n-1]=_.h(t,e[n-1]&2147483648>>t-1,1)),e},h:(e,t,n)=>32===e?t:(n?0|t:t<<32-e)+1099511627776*e,i:e=>r.round(e/1099511627776)||32,o(e,t,n,r){for(void 0===r&&(r=[]);t>=32;t-=32)r.push(n),n=0;if(0===t)return r.concat(e);for(let s=0;s<e.length;s++)r.push(n|e[s]>>>t),n=e[s]<<32-t;const s=e.length?e[e.length-1]:0,i=_.i(s);return r.push(_.h(t+i&31,t+i>32?n:r.pop(),1)),r}},I={bytes:{p(e){const t=_.l(e)/8,n=new i(t);let r;for(let s=0;t>s;s++)3&s||(r=e[s/4]),n[s]=r>>>24,r<<=8;return n},m(e){const t=[];let n,r=0;for(n=0;n<e.length;n++)r=r<<8|e[n],3&~n||(t.push(r),r=0);return 3&n&&t.push(_.h(8*(3&n),r)),t}}},P=class{constructor(e){const t=this;t.blockSize=512,t.k=[1732584193,4023233417,2562383102,271733878,3285377520],t.v=[1518500249,1859775393,2400959708,3395469782],e?(t.S=e.S.slice(0),t.C=e.C.slice(0),t.A=e.A):t.reset()}reset(){const e=this;return e.S=e.k.slice(0),e.C=[],e.A=0,e}update(e){const t=this;"string"==typeof e&&(e=I._.m(e));const n=t.C=_.concat(t.C,e),r=t.A,i=t.A=r+_.l(e);if(i>9007199254740991)throw new s("Cannot hash more than 2^53 - 1 bits");const o=new c(n);let f=0;for(let e=t.blockSize+r-(t.blockSize+r&t.blockSize-1);i>=e;e+=t.blockSize)t.I(o.subarray(16*f,16*(f+1))),f+=1;return n.splice(0,16*f),t}P(){const e=this;let t=e.C;const n=e.S;t=_.concat(t,[_.h(1,1)]);for(let e=t.length+2;15&e;e++)t.push(0);for(t.push(r.floor(e.A/4294967296)),t.push(0|e.A);t.length;)e.I(t.splice(0,16));return e.reset(),n}D(e,t,n,r){return e>19?e>39?e>59?e>79?void 0:t^n^r:t&n|t&r|n&r:t^n^r:t&n|~t&r}V(e,t){return t<<e|t>>>32-e}I(t){const n=this,s=n.S,i=e(80);for(let e=0;16>e;e++)i[e]=t[e];let o=s[0],c=s[1],f=s[2],a=s[3],l=s[4];for(let e=0;79>=e;e++){16>e||(i[e]=n.V(1,i[e-3]^i[e-8]^i[e-14]^i[e-16]));const t=n.V(5,o)+n.D(e,c,f,a)+l+i[e]+n.v[r.floor(e/20)]|0;l=a,a=f,f=n.V(30,c),c=o,o=t}s[0]=s[0]+o|0,s[1]=s[1]+c|0,s[2]=s[2]+f|0,s[3]=s[3]+a|0,s[4]=s[4]+l|0}},D={getRandomValues(e){const t=new c(e.buffer),n=e=>{let t=987654321;const n=4294967295;return()=>(t=36969*(65535&t)+(t>>16)&n,(((t<<16)+(e=18e3*(65535&e)+(e>>16)&n)&n)/4294967296+.5)*(r.random()>.5?1:-1))};for(let s,i=0;i<e.length;i+=4){const e=n(4294967296*(s||r.random()));s=987654071*e(),t[i/4]=4294967296*e()|0}return e}},V={importKey:e=>new V.R(I.bytes.m(e)),B(e,t,n,r){if(n=n||1e4,0>r||0>n)throw new s("invalid params to pbkdf2");const i=1+(r>>5)<<2;let o,c,f,a,u;const w=new ArrayBuffer(i),h=new l(w);let d=0;const p=_;for(t=I.bytes.m(t),u=1;(i||1)>d;u++){for(o=c=e.encrypt(p.concat(t,[u])),f=1;n>f;f++)for(c=e.encrypt(c),a=0;a<c.length;a++)o[a]^=c[a];for(f=0;(i||1)>d&&f<o.length;f++)h.setInt32(d,o[f]),d+=4}return w.slice(0,r/8)},R:class{constructor(e){const t=this,n=t.M=P,r=[[],[]];t.U=[new n,new n];const s=t.U[0].blockSize/32;e.length>s&&(e=(new n).update(e).P());for(let t=0;s>t;t++)r[0][t]=909522486^e[t],r[1][t]=1549556828^e[t];t.U[0].update(r[0]),t.U[1].update(r[1]),t.K=new n(t.U[0])}reset(){const e=this;e.K=new e.M(e.U[0]),e.N=!1}update(e){this.N=!0,this.K.update(e)}digest(){const e=this,t=e.K.P(),n=new e.M(e.U[1]).update(t).P();return e.reset(),n}encrypt(e){if(this.N)throw new s("encrypt on already updated hmac called!");return this.update(e),this.digest(e)}}},R=typeof h!=v&&typeof h.getRandomValues==S,B="Invalid password",E="Invalid signature",M="zipjs-abort-check-password";function U(e){return R?h.getRandomValues(e):D.getRandomValues(e)}const K=16,N={name:"PBKDF2"},O=t.assign({hash:{name:"HMAC"}},N),T=t.assign({iterations:1e3,hash:{name:"SHA-1"}},N),W=["deriveBits"],j=[8,12,16],H=[16,24,32],L=10,F=[0,0,0,0],q=typeof h!=v,G=q&&h.subtle,J=q&&typeof G!=v,Q=I.bytes,X=class{constructor(e){const t=this;t.O=[[[],[],[],[],[]],[[],[],[],[],[]]],t.O[0][0][0]||t.T();const n=t.O[0][4],r=t.O[1],i=e.length;let o,c,f,a=1;if(4!==i&&6!==i&&8!==i)throw new s("invalid aes key size");for(t.v=[c=e.slice(0),f=[]],o=i;4*i+28>o;o++){let e=c[o-1];(o%i==0||8===i&&o%i==4)&&(e=n[e>>>24]<<24^n[e>>16&255]<<16^n[e>>8&255]<<8^n[255&e],o%i==0&&(e=e<<8^e>>>24^a<<24,a=a<<1^283*(a>>7))),c[o]=c[o-i]^e}for(let e=0;o;e++,o--){const t=c[3&e?o:o-4];f[e]=4>=o||4>e?t:r[0][n[t>>>24]]^r[1][n[t>>16&255]]^r[2][n[t>>8&255]]^r[3][n[255&t]]}}encrypt(e){return this.W(e,0)}decrypt(e){return this.W(e,1)}T(){const e=this.O[0],t=this.O[1],n=e[4],r=t[4],s=[],i=[];let o,c,f,a;for(let e=0;256>e;e++)i[(s[e]=e<<1^283*(e>>7))^e]=e;for(let l=o=0;!n[l];l^=c||1,o=i[o]||1){let i=o^o<<1^o<<2^o<<3^o<<4;i=i>>8^255&i^99,n[l]=i,r[i]=l,a=s[f=s[c=s[l]]];let u=16843009*a^65537*f^257*c^16843008*l,w=257*s[i]^16843008*i;for(let n=0;4>n;n++)e[n][l]=w=w<<24^w>>>8,t[n][i]=u=u<<24^u>>>8}for(let n=0;5>n;n++)e[n]=e[n].slice(0),t[n]=t[n].slice(0)}W(e,t){if(4!==e.length)throw new s("invalid aes block size");const n=this.v[t],r=n.length/4-2,i=[0,0,0,0],o=this.O[t],c=o[0],f=o[1],a=o[2],l=o[3],u=o[4];let w,h,d,p=e[0]^n[0],y=e[t?3:1]^n[1],m=e[2]^n[2],b=e[t?1:3]^n[3],g=4;for(let e=0;r>e;e++)w=c[p>>>24]^f[y>>16&255]^a[m>>8&255]^l[255&b]^n[g],h=c[y>>>24]^f[m>>16&255]^a[b>>8&255]^l[255&p]^n[g+1],d=c[m>>>24]^f[b>>16&255]^a[p>>8&255]^l[255&y]^n[g+2],b=c[b>>>24]^f[p>>16&255]^a[y>>8&255]^l[255&m]^n[g+3],g+=4,p=w,y=h,m=d;for(let e=0;4>e;e++)i[t?3&-e:e]=u[p>>>24]<<24^u[y>>16&255]<<16^u[m>>8&255]<<8^u[255&b]^n[g++],w=p,p=y,y=m,m=b,b=w;return i}},Y=class{constructor(e,t){this.j=e,this.H=t,this.L=t}reset(){this.L=this.H}update(e){return this.F(this.j,e,this.L)}q(e){if(255&~(e>>24))e+=1<<24;else{let t=e>>16&255,n=e>>8&255,r=255&e;255===t?(t=0,255===n?(n=0,255===r?r=0:++r):++n):++t,e=0,e+=t<<16,e+=n<<8,e+=r}return e}G(e){0===(e[0]=this.q(e[0]))&&(e[1]=this.q(e[1]))}F(e,t,n){let r;if(!(r=t.length))return[];const s=_.l(t);for(let s=0;r>s;s+=4){this.G(n);const r=e.encrypt(n);t[s]^=r[0],t[s+1]^=r[1],t[s+2]^=r[2],t[s+3]^=r[3]}return _.u(t,s)}},Z=V.R;let $=q&&J&&typeof G.importKey==S,ee=q&&J&&typeof G.deriveBits==S;class te extends p{constructor({password:e,rawPassword:n,signed:r,encryptionStrength:o,checkPasswordOnly:c}){super({start(){t.assign(this,{ready:new u((e=>this.J=e)),password:ie(e,n),signed:r,X:o-1,pending:new i})},async transform(e,t){const n=this,{password:r,X:o,J:f,ready:a}=n;r?(await(async(e,t,n,r)=>{const i=await se(e,t,n,ce(r,0,j[t])),o=ce(r,j[t]);if(i[0]!=o[0]||i[1]!=o[1])throw new s(B)})(n,o,r,ce(e,0,j[o]+2)),e=ce(e,j[o]+2),c?t.error(new s(M)):f()):await a;const l=new i(e.length-L-(e.length-L)%K);t.enqueue(re(n,e,l,0,L,!0))},async flush(e){const{signed:t,Y:n,Z:r,pending:o,ready:c}=this;if(r&&n){await c;const f=ce(o,0,o.length-L),a=ce(o,o.length-L);let l=new i;if(f.length){const e=ae(Q,f);r.update(e);const t=n.update(e);l=fe(Q,t)}if(t){const e=ce(fe(Q,r.digest()),0,L);for(let t=0;L>t;t++)if(e[t]!=a[t])throw new s(E)}e.enqueue(l)}}})}}class ne extends p{constructor({password:e,rawPassword:n,encryptionStrength:r}){let s;super({start(){t.assign(this,{ready:new u((e=>this.J=e)),password:ie(e,n),X:r-1,pending:new i})},async transform(e,t){const n=this,{password:r,X:s,J:o,ready:c}=n;let f=new i;r?(f=await(async(e,t,n)=>{const r=U(new i(j[t]));return oe(r,await se(e,t,n,r))})(n,s,r),o()):await c;const a=new i(f.length+e.length-e.length%K);a.set(f,0),t.enqueue(re(n,e,a,f.length,0))},async flush(e){const{Y:t,Z:n,pending:r,ready:o}=this;if(n&&t){await o;let c=new i;if(r.length){const e=t.update(ae(Q,r));n.update(e),c=fe(Q,e)}s.signature=fe(Q,n.digest()).slice(0,L),e.enqueue(oe(c,s.signature))}}}),s=this}}function re(e,t,n,r,s,o){const{Y:c,Z:f,pending:a}=e,l=t.length-s;let u;for(a.length&&(t=oe(a,t),n=((e,t)=>{if(t&&t>e.length){const n=e;(e=new i(t)).set(n,0)}return e})(n,l-l%K)),u=0;l-K>=u;u+=K){const e=ae(Q,ce(t,u,u+K));o&&f.update(e);const s=c.update(e);o||f.update(s),n.set(fe(Q,s),u+r)}return e.pending=ce(t,u),n}async function se(n,r,s,o){n.password=null;const c=await(async(e,t,n,r,s)=>{if(!$)return V.importKey(t);try{return await G.importKey("raw",t,n,!1,s)}catch(e){return $=!1,V.importKey(t)}})(0,s,O,0,W),f=await(async(e,t,n)=>{if(!ee)return V.B(t,e.salt,T.iterations,n);try{return await G.deriveBits(e,t,n)}catch(r){return ee=!1,V.B(t,e.salt,T.iterations,n)}})(t.assign({salt:o},T),c,8*(2*H[r]+2)),a=new i(f),l=ae(Q,ce(a,0,H[r])),u=ae(Q,ce(a,H[r],2*H[r])),w=ce(a,2*H[r]);return t.assign(n,{keys:{key:l,$:u,passwordVerification:w},Y:new Y(new X(l),e.from(F)),Z:new Z(u)}),w}function ie(e,t){return t===k?(e=>{if(typeof w==v){const t=new i((e=unescape(encodeURIComponent(e))).length);for(let n=0;n<t.length;n++)t[n]=e.charCodeAt(n);return t}return(new w).encode(e)})(e):t}function oe(e,t){let n=e;return e.length+t.length&&(n=new i(e.length+t.length),n.set(e,0),n.set(t,e.length)),n}function ce(e,t,n){return e.subarray(t,n)}function fe(e,t){return e.p(t)}function ae(e,t){return e.m(t)}class le extends p{constructor({password:e,passwordVerification:n,checkPasswordOnly:r}){super({start(){t.assign(this,{password:e,passwordVerification:n}),de(this,e)},transform(e,t){const n=this;if(n.password){const t=we(n,e.subarray(0,12));if(n.password=null,t[11]!=n.passwordVerification)throw new s(B);e=e.subarray(12)}r?t.error(new s(M)):t.enqueue(we(n,e))}})}}class ue extends p{constructor({password:e,passwordVerification:n}){super({start(){t.assign(this,{password:e,passwordVerification:n}),de(this,e)},transform(e,t){const n=this;let r,s;if(n.password){n.password=null;const t=U(new i(12));t[11]=n.passwordVerification,r=new i(e.length+t.length),r.set(he(n,t),0),s=12}else r=new i(e.length),s=0;r.set(he(n,e),s),t.enqueue(r)}})}}function we(e,t){const n=new i(t.length);for(let r=0;r<t.length;r++)n[r]=ye(e)^t[r],pe(e,n[r]);return n}function he(e,t){const n=new i(t.length);for(let r=0;r<t.length;r++)n[r]=ye(e)^t[r],pe(e,t[r]);return n}function de(e,n){const r=[305419896,591751049,878082192];t.assign(e,{keys:r,ee:new x(r[0]),te:new x(r[2])});for(let t=0;t<n.length;t++)pe(e,n.charCodeAt(t))}function pe(e,t){let[n,s,i]=e.keys;e.ee.append([t]),n=~e.ee.get(),s=be(r.imul(be(s+me(n)),134775813)+1),e.te.append([s>>>24]),i=~e.te.get(),e.keys=[n,s,i]}function ye(e){const t=2|e.keys[2];return me(r.imul(t,1^t)>>>8)}function me(e){return 255&e}function be(e){return 4294967295&e}const ge="deflate-raw";class ke extends p{constructor(e,{chunkSize:t,CompressionStream:n,CompressionStreamNative:r}){super({});const{compressed:s,encrypted:i,useCompressionStream:o,zipCrypto:c,signed:f,level:a}=e,u=this;let w,h,d=Se(super.readable);i&&!c||!f||(w=new A,d=xe(d,w)),s&&(d=Ce(d,o,{level:a,chunkSize:t},r,n)),i&&(c?d=xe(d,new ue(e)):(h=new ne(e),d=xe(d,h))),ze(u,d,(()=>{let e;i&&!c&&(e=h.signature),i&&!c||!f||(e=new l(w.value.buffer).getUint32(0)),u.signature=e}))}}class ve extends p{constructor(e,{chunkSize:t,DecompressionStream:n,DecompressionStreamNative:r}){super({});const{zipCrypto:i,encrypted:o,signed:c,signature:f,compressed:a,useCompressionStream:u}=e;let w,h,d=Se(super.readable);o&&(i?d=xe(d,new le(e)):(h=new te(e),d=xe(d,h))),a&&(d=Ce(d,u,{chunkSize:t},r,n)),o&&!i||!c||(w=new A,d=xe(d,w)),ze(this,d,(()=>{if((!o||i)&&c){const e=new l(w.value.buffer);if(f!=e.getUint32(0,!1))throw new s(E)}}))}}function Se(e){return xe(e,new p({transform(e,t){e&&e.length&&t.enqueue(e)}}))}function ze(e,n,r){n=xe(n,new p({flush:r})),t.defineProperty(e,"readable",{get:()=>n})}function Ce(e,t,n,r,s){try{e=xe(e,new(t&&r?r:s)(ge,n))}catch(r){if(!t)return e;try{e=xe(e,new s(ge,n))}catch(t){return e}}return e}function xe(e,t){return e.pipeThrough(t)}const Ae="data",_e="close";class Ie extends p{constructor(e,n){super({});const r=this,{codecType:s}=e;let i;s.startsWith("deflate")?i=ke:s.startsWith("inflate")&&(i=ve);let o=0,c=0;const f=new i(e,n),a=super.readable,l=new p({transform(e,t){e&&e.length&&(c+=e.length,t.enqueue(e))},flush(){t.assign(r,{inputSize:c})}}),u=new p({transform(e,t){e&&e.length&&(o+=e.length,t.enqueue(e))},flush(){const{signature:e}=f;t.assign(r,{signature:e,outputSize:o,inputSize:c})}});t.defineProperty(r,"readable",{get:()=>a.pipeThrough(l).pipeThrough(f).pipeThrough(u)})}}class Pe extends p{constructor(e){let t;super({transform:function n(r,s){if(t){const e=new i(t.length+r.length);e.set(t),e.set(r,t.length),r=e,t=null}r.length>e?(s.enqueue(r.slice(0,e)),n(r.slice(e),s)):t=r},flush(e){t&&t.length&&e.enqueue(t)}})}}const De=new a,Ve=new a;let Re,Be=0,Ee=!0;async function Me(e){try{const{options:t,scripts:r,config:s}=e;if(r&&r.length)try{Ee?importScripts.apply(k,r):await Ue(r)}catch(e){Ee=!1,await Ue(r)}self.initCodec&&self.initCodec(),s.CompressionStreamNative=self.CompressionStream,s.DecompressionStreamNative=self.DecompressionStream,self.Deflate&&(s.CompressionStream=new z(self.Deflate)),self.Inflate&&(s.DecompressionStream=new z(self.Inflate));const i={highWaterMark:1},o=e.readable||new y({async pull(e){const t=new u((e=>De.set(Be,e)));Ke({type:"pull",messageId:Be}),Be=(Be+1)%n.MAX_SAFE_INTEGER;const{value:r,done:s}=await t;e.enqueue(r),s&&e.close()}},i),c=e.writable||new m({async write(e){let t;const r=new u((e=>t=e));Ve.set(Be,t),Ke({type:Ae,value:e,messageId:Be}),Be=(Be+1)%n.MAX_SAFE_INTEGER,await r}},i),f=new Ie(t,s);Re=new AbortController;const{signal:a}=Re;await o.pipeThrough(f).pipeThrough(new Pe(s.chunkSize)).pipeTo(c,{signal:a,preventClose:!0,preventAbort:!0}),await c.getWriter().close();const{signature:l,inputSize:w,outputSize:h}=f;Ke({type:_e,result:{signature:l,inputSize:w,outputSize:h}})}catch(e){Ne(e)}}async function Ue(e){for(const t of e)await import(t)}function Ke(e){let{value:t}=e;if(t)if(t.length)try{t=new i(t),e.value=t.buffer,d(e,[e.value])}catch(t){d(e)}else d(e);else d(e)}function Ne(e=new s("Unknown error")){const{message:t,stack:n,code:r,name:i}=e;d({error:{message:t,stack:n,code:r,name:i}})}addEventListener("message",(({data:e})=>{const{type:t,messageId:n,value:r,done:s}=e;try{if("start"==t&&Me(e),t==Ae){const e=De.get(n);De.delete(n),e({value:new i(r),done:s})}if("ack"==t){const e=Ve.get(n);Ve.delete(n),e()}t==_e&&Re.abort()}catch(e){Ne(e)}}));const Oe=-2;function Te(t){return We(t.map((([t,n])=>new e(t).fill(n,0,t))))}function We(t){return t.reduce(((t,n)=>t.concat(e.isArray(n)?We(n):n)),[])}const je=[0,1,2,3].concat(...Te([[2,4],[2,5],[4,6],[4,7],[8,8],[8,9],[16,10],[16,11],[32,12],[32,13],[64,14],[64,15],[2,0],[1,16],[1,17],[2,18],[2,19],[4,20],[4,21],[8,22],[8,23],[16,24],[16,25],[32,26],[32,27],[64,28],[64,29]]));function He(){const e=this;function t(e,t){let n=0;do{n|=1&e,e>>>=1,n<<=1}while(--t>0);return n>>>1}e.ne=n=>{const s=e.re,i=e.ie.se,o=e.ie.oe;let c,f,a,l=-1;for(n.ce=0,n.fe=573,c=0;o>c;c++)0!==s[2*c]?(n.ae[++n.ce]=l=c,n.le[c]=0):s[2*c+1]=0;for(;2>n.ce;)a=n.ae[++n.ce]=2>l?++l:0,s[2*a]=1,n.le[a]=0,n.ue--,i&&(n.we-=i[2*a+1]);for(e.he=l,c=r.floor(n.ce/2);c>=1;c--)n.de(s,c);a=o;do{c=n.ae[1],n.ae[1]=n.ae[n.ce--],n.de(s,1),f=n.ae[1],n.ae[--n.fe]=c,n.ae[--n.fe]=f,s[2*a]=s[2*c]+s[2*f],n.le[a]=r.max(n.le[c],n.le[f])+1,s[2*c+1]=s[2*f+1]=a,n.ae[1]=a++,n.de(s,1)}while(n.ce>=2);n.ae[--n.fe]=n.ae[1],(t=>{const n=e.re,r=e.ie.se,s=e.ie.pe,i=e.ie.ye,o=e.ie.me;let c,f,a,l,u,w,h=0;for(l=0;15>=l;l++)t.be[l]=0;for(n[2*t.ae[t.fe]+1]=0,c=t.fe+1;573>c;c++)f=t.ae[c],l=n[2*n[2*f+1]+1]+1,l>o&&(l=o,h++),n[2*f+1]=l,f>e.he||(t.be[l]++,u=0,i>f||(u=s[f-i]),w=n[2*f],t.ue+=w*(l+u),r&&(t.we+=w*(r[2*f+1]+u)));if(0!==h){do{for(l=o-1;0===t.be[l];)l--;t.be[l]--,t.be[l+1]+=2,t.be[o]--,h-=2}while(h>0);for(l=o;0!==l;l--)for(f=t.be[l];0!==f;)a=t.ae[--c],a>e.he||(n[2*a+1]!=l&&(t.ue+=(l-n[2*a+1])*n[2*a],n[2*a+1]=l),f--)}})(n),((e,n,r)=>{const s=[];let i,o,c,f=0;for(i=1;15>=i;i++)s[i]=f=f+r[i-1]<<1;for(o=0;n>=o;o++)c=e[2*o+1],0!==c&&(e[2*o]=t(s[c]++,c))})(s,e.he,n.be)}}function Le(e,t,n,r,s){const i=this;i.se=e,i.pe=t,i.ye=n,i.oe=r,i.me=s}He.ge=[0,1,2,3,4,5,6,7].concat(...Te([[2,8],[2,9],[2,10],[2,11],[4,12],[4,13],[4,14],[4,15],[8,16],[8,17],[8,18],[8,19],[16,20],[16,21],[16,22],[16,23],[32,24],[32,25],[32,26],[31,27],[1,28]])),He.ke=[0,1,2,3,4,5,6,7,8,10,12,14,16,20,24,28,32,40,48,56,64,80,96,112,128,160,192,224,0],He.ve=[0,1,2,3,4,6,8,12,16,24,32,48,64,96,128,192,256,384,512,768,1024,1536,2048,3072,4096,6144,8192,12288,16384,24576],He.Se=e=>256>e?je[e]:je[256+(e>>>7)],He.ze=[0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0],He.Ce=[0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13],He.xe=[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,3,7],He.Ae=[16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15];const Fe=Te([[144,8],[112,9],[24,7],[8,8]]);Le._e=We([12,140,76,204,44,172,108,236,28,156,92,220,60,188,124,252,2,130,66,194,34,162,98,226,18,146,82,210,50,178,114,242,10,138,74,202,42,170,106,234,26,154,90,218,58,186,122,250,6,134,70,198,38,166,102,230,22,150,86,214,54,182,118,246,14,142,78,206,46,174,110,238,30,158,94,222,62,190,126,254,1,129,65,193,33,161,97,225,17,145,81,209,49,177,113,241,9,137,73,201,41,169,105,233,25,153,89,217,57,185,121,249,5,133,69,197,37,165,101,229,21,149,85,213,53,181,117,245,13,141,77,205,45,173,109,237,29,157,93,221,61,189,125,253,19,275,147,403,83,339,211,467,51,307,179,435,115,371,243,499,11,267,139,395,75,331,203,459,43,299,171,427,107,363,235,491,27,283,155,411,91,347,219,475,59,315,187,443,123,379,251,507,7,263,135,391,71,327,199,455,39,295,167,423,103,359,231,487,23,279,151,407,87,343,215,471,55,311,183,439,119,375,247,503,15,271,143,399,79,335,207,463,47,303,175,431,111,367,239,495,31,287,159,415,95,351,223,479,63,319,191,447,127,383,255,511,0,64,32,96,16,80,48,112,8,72,40,104,24,88,56,120,4,68,36,100,20,84,52,116,3,131,67,195,35,163,99,227].map(((e,t)=>[e,Fe[t]])));const qe=Te([[30,5]]);function Ge(e,t,n,r,s){const i=this;i.Ie=e,i.Pe=t,i.De=n,i.Ve=r,i.Re=s}Le.Be=We([0,16,8,24,4,20,12,28,2,18,10,26,6,22,14,30,1,17,9,25,5,21,13,29,3,19,11,27,7,23].map(((e,t)=>[e,qe[t]]))),Le.Ee=new Le(Le._e,He.ze,257,286,15),Le.Me=new Le(Le.Be,He.Ce,0,30,15),Le.Ue=new Le(null,He.xe,0,19,7);const Je=[new Ge(0,0,0,0,0),new Ge(4,4,8,4,1),new Ge(4,5,16,8,1),new Ge(4,6,32,32,1),new Ge(4,4,16,16,2),new Ge(8,16,32,32,2),new Ge(8,16,128,128,2),new Ge(8,32,128,256,2),new Ge(32,128,258,1024,2),new Ge(32,258,258,4096,2)],Qe=["need dictionary","stream end","","","stream error","data error","","buffer error","",""],Xe=113,Ye=666,Ze=262;function $e(e,t,n,r){const s=e[2*t],i=e[2*n];return i>s||s==i&&r[t]<=r[n]}function et(){const e=this;let t,n,s,c,f,a,l,u,w,h,d,p,y,m,b,g,k,v,S,z,C,x,A,_,I,P,D,V,R,B,E,M,U;const K=new He,N=new He,O=new He;let T,W,j,H,L,F;function q(){let t;for(t=0;286>t;t++)E[2*t]=0;for(t=0;30>t;t++)M[2*t]=0;for(t=0;19>t;t++)U[2*t]=0;E[512]=1,e.ue=e.we=0,W=j=0}function G(e,t){let n,r=-1,s=e[1],i=0,o=7,c=4;0===s&&(o=138,c=3),e[2*(t+1)+1]=65535;for(let f=0;t>=f;f++)n=s,s=e[2*(f+1)+1],++i<o&&n==s||(c>i?U[2*n]+=i:0!==n?(n!=r&&U[2*n]++,U[32]++):i>10?U[36]++:U[34]++,i=0,r=n,0===s?(o=138,c=3):n==s?(o=6,c=3):(o=7,c=4))}function J(t){e.Ke[e.pending++]=t}function Q(e){J(255&e),J(e>>>8&255)}function X(e,t){let n;const r=t;F>16-r?(n=e,L|=n<<F&65535,Q(L),L=n>>>16-F,F+=r-16):(L|=e<<F&65535,F+=r)}function Y(e,t){const n=2*e;X(65535&t[n],65535&t[n+1])}function Z(e,t){let n,r,s=-1,i=e[1],o=0,c=7,f=4;for(0===i&&(c=138,f=3),n=0;t>=n;n++)if(r=i,i=e[2*(n+1)+1],++o>=c||r!=i){if(f>o)do{Y(r,U)}while(0!=--o);else 0!==r?(r!=s&&(Y(r,U),o--),Y(16,U),X(o-3,2)):o>10?(Y(18,U),X(o-11,7)):(Y(17,U),X(o-3,3));o=0,s=r,0===i?(c=138,f=3):r==i?(c=6,f=3):(c=7,f=4)}}function $(){16==F?(Q(L),L=0,F=0):8>F||(J(255&L),L>>>=8,F-=8)}function ee(t,n){let s,i,o;if(e.Ne[W]=t,e.Oe[W]=255&n,W++,0===t?E[2*n]++:(j++,t--,E[2*(He.ge[n]+256+1)]++,M[2*He.Se(t)]++),!(8191&W)&&D>2){for(s=8*W,i=C-k,o=0;30>o;o++)s+=M[2*o]*(5+He.Ce[o]);if(s>>>=3,j<r.floor(W/2)&&s<r.floor(i/2))return!0}return W==T-1}function te(t,n){let r,s,i,o,c=0;if(0!==W)do{r=e.Ne[c],s=e.Oe[c],c++,0===r?Y(s,t):(i=He.ge[s],Y(i+256+1,t),o=He.ze[i],0!==o&&(s-=He.ke[i],X(s,o)),r--,i=He.Se(r),Y(i,n),o=He.Ce[i],0!==o&&(r-=He.ve[i],X(r,o)))}while(W>c);Y(256,t),H=t[513]}function ne(){F>8?Q(L):F>0&&J(255&L),L=0,F=0}function re(t,n,r){X(0+(r?1:0),3),((t,n)=>{ne(),H=8,Q(n),Q(~n),e.Ke.set(u.subarray(t,t+n),e.pending),e.pending+=n})(t,n)}function se(n){((t,n,r)=>{let s,i,o=0;D>0?(K.ne(e),N.ne(e),o=(()=>{let t;for(G(E,K.he),G(M,N.he),O.ne(e),t=18;t>=3&&0===U[2*He.Ae[t]+1];t--);return e.ue+=14+3*(t+1),t})(),s=e.ue+3+7>>>3,i=e.we+3+7>>>3,i>s||(s=i)):s=i=n+5,n+4>s||-1==t?i==s?(X(2+(r?1:0),3),te(Le._e,Le.Be)):(X(4+(r?1:0),3),((e,t,n)=>{let r;for(X(e-257,5),X(t-1,5),X(n-4,4),r=0;n>r;r++)X(U[2*He.Ae[r]+1],3);Z(E,e-1),Z(M,t-1)})(K.he+1,N.he+1,o+1),te(E,M)):re(t,n,r),q(),r&&ne()})(0>k?-1:k,C-k,n),k=C,t.Te()}function ie(){let e,n,r,s;do{if(s=w-A-C,0===s&&0===C&&0===A)s=f;else if(-1==s)s--;else if(C>=f+f-Ze){u.set(u.subarray(f,f+f),0),x-=f,C-=f,k-=f,e=y,r=e;do{n=65535&d[--r],d[r]=f>n?0:n-f}while(0!=--e);e=f,r=e;do{n=65535&h[--r],h[r]=f>n?0:n-f}while(0!=--e);s+=f}if(0===t.We)return;e=t.je(u,C+A,s),A+=e,3>A||(p=255&u[C],p=(p<<g^255&u[C+1])&b)}while(Ze>A&&0!==t.We)}function oe(e){let t,n,r=I,s=C,i=_;const o=C>f-Ze?C-(f-Ze):0;let c=B;const a=l,w=C+258;let d=u[s+i-1],p=u[s+i];R>_||(r>>=2),c>A&&(c=A);do{if(t=e,u[t+i]==p&&u[t+i-1]==d&&u[t]==u[s]&&u[++t]==u[s+1]){s+=2,t++;do{}while(u[++s]==u[++t]&&u[++s]==u[++t]&&u[++s]==u[++t]&&u[++s]==u[++t]&&u[++s]==u[++t]&&u[++s]==u[++t]&&u[++s]==u[++t]&&u[++s]==u[++t]&&w>s);if(n=258-(w-s),s=w-258,n>i){if(x=e,i=n,n>=c)break;d=u[s+i-1],p=u[s+i]}}}while((e=65535&h[e&a])>o&&0!=--r);return i>A?A:i}e.le=[],e.be=[],e.ae=[],E=[],M=[],U=[],e.de=(t,n)=>{const r=e.ae,s=r[n];let i=n<<1;for(;i<=e.ce&&(i<e.ce&&$e(t,r[i+1],r[i],e.le)&&i++,!$e(t,s,r[i],e.le));)r[n]=r[i],n=i,i<<=1;r[n]=s},e.He=(t,S,x,W,j,G)=>(W||(W=8),j||(j=8),G||(G=0),t.Le=null,-1==S&&(S=6),1>j||j>9||8!=W||9>x||x>15||0>S||S>9||0>G||G>2?Oe:(t.Fe=e,a=x,f=1<<a,l=f-1,m=j+7,y=1<<m,b=y-1,g=r.floor((m+3-1)/3),u=new i(2*f),h=[],d=[],T=1<<j+6,e.Ke=new i(4*T),s=4*T,e.Ne=new o(T),e.Oe=new i(T),D=S,V=G,(t=>(t.qe=t.Ge=0,t.Le=null,e.pending=0,e.Je=0,n=Xe,c=0,K.re=E,K.ie=Le.Ee,N.re=M,N.ie=Le.Me,O.re=U,O.ie=Le.Ue,L=0,F=0,H=8,q(),(()=>{w=2*f,d[y-1]=0;for(let e=0;y-1>e;e++)d[e]=0;P=Je[D].Pe,R=Je[D].Ie,B=Je[D].De,I=Je[D].Ve,C=0,k=0,A=0,v=_=2,z=0,p=0})(),0))(t))),e.Qe=()=>42!=n&&n!=Xe&&n!=Ye?Oe:(e.Oe=null,e.Ne=null,e.Ke=null,d=null,h=null,u=null,e.Fe=null,n==Xe?-3:0),e.Xe=(e,t,n)=>{let r=0;return-1==t&&(t=6),0>t||t>9||0>n||n>2?Oe:(Je[D].Re!=Je[t].Re&&0!==e.qe&&(r=e.Ye(1)),D!=t&&(D=t,P=Je[D].Pe,R=Je[D].Ie,B=Je[D].De,I=Je[D].Ve),V=n,r)},e.Ze=(e,t,r)=>{let s,i=r,o=0;if(!t||42!=n)return Oe;if(3>i)return 0;for(i>f-Ze&&(i=f-Ze,o=r-i),u.set(t.subarray(o,o+i),0),C=i,k=i,p=255&u[0],p=(p<<g^255&u[1])&b,s=0;i-3>=s;s++)p=(p<<g^255&u[s+2])&b,h[s&l]=d[p],d[p]=s;return 0},e.Ye=(r,i)=>{let o,w,m,I,R;if(i>4||0>i)return Oe;if(!r.$e||!r.et&&0!==r.We||n==Ye&&4!=i)return r.Le=Qe[4],Oe;if(0===r.tt)return r.Le=Qe[7],-5;var B;if(t=r,I=c,c=i,42==n&&(w=8+(a-8<<4)<<8,m=(D-1&255)>>1,m>3&&(m=3),w|=m<<6,0!==C&&(w|=32),w+=31-w%31,n=Xe,J((B=w)>>8&255),J(255&B)),0!==e.pending){if(t.Te(),0===t.tt)return c=-1,0}else if(0===t.We&&I>=i&&4!=i)return t.Le=Qe[7],-5;if(n==Ye&&0!==t.We)return r.Le=Qe[7],-5;if(0!==t.We||0!==A||0!=i&&n!=Ye){switch(R=-1,Je[D].Re){case 0:R=(e=>{let n,r=65535;for(r>s-5&&(r=s-5);;){if(1>=A){if(ie(),0===A&&0==e)return 0;if(0===A)break}if(C+=A,A=0,n=k+r,(0===C||C>=n)&&(A=C-n,C=n,se(!1),0===t.tt))return 0;if(C-k>=f-Ze&&(se(!1),0===t.tt))return 0}return se(4==e),0===t.tt?4==e?2:0:4==e?3:1})(i);break;case 1:R=(e=>{let n,r=0;for(;;){if(Ze>A){if(ie(),Ze>A&&0==e)return 0;if(0===A)break}if(3>A||(p=(p<<g^255&u[C+2])&b,r=65535&d[p],h[C&l]=d[p],d[p]=C),0===r||(C-r&65535)>f-Ze||2!=V&&(v=oe(r)),3>v)n=ee(0,255&u[C]),A--,C++;else if(n=ee(C-x,v-3),A-=v,v>P||3>A)C+=v,v=0,p=255&u[C],p=(p<<g^255&u[C+1])&b;else{v--;do{C++,p=(p<<g^255&u[C+2])&b,r=65535&d[p],h[C&l]=d[p],d[p]=C}while(0!=--v);C++}if(n&&(se(!1),0===t.tt))return 0}return se(4==e),0===t.tt?4==e?2:0:4==e?3:1})(i);break;case 2:R=(e=>{let n,r,s=0;for(;;){if(Ze>A){if(ie(),Ze>A&&0==e)return 0;if(0===A)break}if(3>A||(p=(p<<g^255&u[C+2])&b,s=65535&d[p],h[C&l]=d[p],d[p]=C),_=v,S=x,v=2,0!==s&&P>_&&f-Ze>=(C-s&65535)&&(2!=V&&(v=oe(s)),5>=v&&(1==V||3==v&&C-x>4096)&&(v=2)),3>_||v>_)if(0!==z){if(n=ee(0,255&u[C-1]),n&&se(!1),C++,A--,0===t.tt)return 0}else z=1,C++,A--;else{r=C+A-3,n=ee(C-1-S,_-3),A-=_-1,_-=2;do{++C>r||(p=(p<<g^255&u[C+2])&b,s=65535&d[p],h[C&l]=d[p],d[p]=C)}while(0!=--_);if(z=0,v=2,C++,n&&(se(!1),0===t.tt))return 0}}return 0!==z&&(n=ee(0,255&u[C-1]),z=0),se(4==e),0===t.tt?4==e?2:0:4==e?3:1})(i)}if(2!=R&&3!=R||(n=Ye),0==R||2==R)return 0===t.tt&&(c=-1),0;if(1==R){if(1==i)X(2,3),Y(256,Le._e),$(),9>1+H+10-F&&(X(2,3),Y(256,Le._e),$()),H=7;else if(re(0,0,!1),3==i)for(o=0;y>o;o++)d[o]=0;if(t.Te(),0===t.tt)return c=-1,0}}return 4!=i?0:1}}function tt(){const e=this;e.nt=0,e.rt=0,e.We=0,e.qe=0,e.tt=0,e.Ge=0}function nt(e){const t=new tt,n=(o=e&&e.chunkSize?e.chunkSize:65536)+5*(r.floor(o/16383)+1);var o;const c=new i(n);let f=e?e.level:-1;void 0===f&&(f=-1),t.He(f),t.$e=c,this.append=(e,r)=>{let o,f,a=0,l=0,u=0;const w=[];if(e.length){t.nt=0,t.et=e,t.We=e.length;do{if(t.rt=0,t.tt=n,o=t.Ye(0),0!=o)throw new s("deflating: "+t.Le);t.rt&&(t.rt==n?w.push(new i(c)):w.push(c.subarray(0,t.rt))),u+=t.rt,r&&t.nt>0&&t.nt!=a&&(r(t.nt),a=t.nt)}while(t.We>0||0===t.tt);return w.length>1?(f=new i(u),w.forEach((e=>{f.set(e,l),l+=e.length}))):f=w[0]?new i(w[0]):new i,f}},this.flush=()=>{let e,r,o=0,f=0;const a=[];do{if(t.rt=0,t.tt=n,e=t.Ye(4),1!=e&&0!=e)throw new s("deflating: "+t.Le);n-t.tt>0&&a.push(c.slice(0,t.rt)),f+=t.rt}while(t.We>0||0===t.tt);return t.Qe(),r=new i(f),a.forEach((e=>{r.set(e,o),o+=e.length})),r}}tt.prototype={He(e,t){const n=this;return n.Fe=new et,t||(t=15),n.Fe.He(n,e,t)},Ye(e){const t=this;return t.Fe?t.Fe.Ye(t,e):Oe},Qe(){const e=this;if(!e.Fe)return Oe;const t=e.Fe.Qe();return e.Fe=null,t},Xe(e,t){const n=this;return n.Fe?n.Fe.Xe(n,e,t):Oe},Ze(e,t){const n=this;return n.Fe?n.Fe.Ze(n,e,t):Oe},je(e,t,n){const r=this;let s=r.We;return s>n&&(s=n),0===s?0:(r.We-=s,e.set(r.et.subarray(r.nt,r.nt+s),t),r.nt+=s,r.qe+=s,s)},Te(){const e=this;let t=e.Fe.pending;t>e.tt&&(t=e.tt),0!==t&&(e.$e.set(e.Fe.Ke.subarray(e.Fe.Je,e.Fe.Je+t),e.rt),e.rt+=t,e.Fe.Je+=t,e.Ge+=t,e.tt-=t,e.Fe.pending-=t,0===e.Fe.pending&&(e.Fe.Je=0))}};const rt=-2,st=-3,it=-5,ot=[0,1,3,7,15,31,63,127,255,511,1023,2047,4095,8191,16383,32767,65535],ct=[96,7,256,0,8,80,0,8,16,84,8,115,82,7,31,0,8,112,0,8,48,0,9,192,80,7,10,0,8,96,0,8,32,0,9,160,0,8,0,0,8,128,0,8,64,0,9,224,80,7,6,0,8,88,0,8,24,0,9,144,83,7,59,0,8,120,0,8,56,0,9,208,81,7,17,0,8,104,0,8,40,0,9,176,0,8,8,0,8,136,0,8,72,0,9,240,80,7,4,0,8,84,0,8,20,85,8,227,83,7,43,0,8,116,0,8,52,0,9,200,81,7,13,0,8,100,0,8,36,0,9,168,0,8,4,0,8,132,0,8,68,0,9,232,80,7,8,0,8,92,0,8,28,0,9,152,84,7,83,0,8,124,0,8,60,0,9,216,82,7,23,0,8,108,0,8,44,0,9,184,0,8,12,0,8,140,0,8,76,0,9,248,80,7,3,0,8,82,0,8,18,85,8,163,83,7,35,0,8,114,0,8,50,0,9,196,81,7,11,0,8,98,0,8,34,0,9,164,0,8,2,0,8,130,0,8,66,0,9,228,80,7,7,0,8,90,0,8,26,0,9,148,84,7,67,0,8,122,0,8,58,0,9,212,82,7,19,0,8,106,0,8,42,0,9,180,0,8,10,0,8,138,0,8,74,0,9,244,80,7,5,0,8,86,0,8,22,192,8,0,83,7,51,0,8,118,0,8,54,0,9,204,81,7,15,0,8,102,0,8,38,0,9,172,0,8,6,0,8,134,0,8,70,0,9,236,80,7,9,0,8,94,0,8,30,0,9,156,84,7,99,0,8,126,0,8,62,0,9,220,82,7,27,0,8,110,0,8,46,0,9,188,0,8,14,0,8,142,0,8,78,0,9,252,96,7,256,0,8,81,0,8,17,85,8,131,82,7,31,0,8,113,0,8,49,0,9,194,80,7,10,0,8,97,0,8,33,0,9,162,0,8,1,0,8,129,0,8,65,0,9,226,80,7,6,0,8,89,0,8,25,0,9,146,83,7,59,0,8,121,0,8,57,0,9,210,81,7,17,0,8,105,0,8,41,0,9,178,0,8,9,0,8,137,0,8,73,0,9,242,80,7,4,0,8,85,0,8,21,80,8,258,83,7,43,0,8,117,0,8,53,0,9,202,81,7,13,0,8,101,0,8,37,0,9,170,0,8,5,0,8,133,0,8,69,0,9,234,80,7,8,0,8,93,0,8,29,0,9,154,84,7,83,0,8,125,0,8,61,0,9,218,82,7,23,0,8,109,0,8,45,0,9,186,0,8,13,0,8,141,0,8,77,0,9,250,80,7,3,0,8,83,0,8,19,85,8,195,83,7,35,0,8,115,0,8,51,0,9,198,81,7,11,0,8,99,0,8,35,0,9,166,0,8,3,0,8,131,0,8,67,0,9,230,80,7,7,0,8,91,0,8,27,0,9,150,84,7,67,0,8,123,0,8,59,0,9,214,82,7,19,0,8,107,0,8,43,0,9,182,0,8,11,0,8,139,0,8,75,0,9,246,80,7,5,0,8,87,0,8,23,192,8,0,83,7,51,0,8,119,0,8,55,0,9,206,81,7,15,0,8,103,0,8,39,0,9,174,0,8,7,0,8,135,0,8,71,0,9,238,80,7,9,0,8,95,0,8,31,0,9,158,84,7,99,0,8,127,0,8,63,0,9,222,82,7,27,0,8,111,0,8,47,0,9,190,0,8,15,0,8,143,0,8,79,0,9,254,96,7,256,0,8,80,0,8,16,84,8,115,82,7,31,0,8,112,0,8,48,0,9,193,80,7,10,0,8,96,0,8,32,0,9,161,0,8,0,0,8,128,0,8,64,0,9,225,80,7,6,0,8,88,0,8,24,0,9,145,83,7,59,0,8,120,0,8,56,0,9,209,81,7,17,0,8,104,0,8,40,0,9,177,0,8,8,0,8,136,0,8,72,0,9,241,80,7,4,0,8,84,0,8,20,85,8,227,83,7,43,0,8,116,0,8,52,0,9,201,81,7,13,0,8,100,0,8,36,0,9,169,0,8,4,0,8,132,0,8,68,0,9,233,80,7,8,0,8,92,0,8,28,0,9,153,84,7,83,0,8,124,0,8,60,0,9,217,82,7,23,0,8,108,0,8,44,0,9,185,0,8,12,0,8,140,0,8,76,0,9,249,80,7,3,0,8,82,0,8,18,85,8,163,83,7,35,0,8,114,0,8,50,0,9,197,81,7,11,0,8,98,0,8,34,0,9,165,0,8,2,0,8,130,0,8,66,0,9,229,80,7,7,0,8,90,0,8,26,0,9,149,84,7,67,0,8,122,0,8,58,0,9,213,82,7,19,0,8,106,0,8,42,0,9,181,0,8,10,0,8,138,0,8,74,0,9,245,80,7,5,0,8,86,0,8,22,192,8,0,83,7,51,0,8,118,0,8,54,0,9,205,81,7,15,0,8,102,0,8,38,0,9,173,0,8,6,0,8,134,0,8,70,0,9,237,80,7,9,0,8,94,0,8,30,0,9,157,84,7,99,0,8,126,0,8,62,0,9,221,82,7,27,0,8,110,0,8,46,0,9,189,0,8,14,0,8,142,0,8,78,0,9,253,96,7,256,0,8,81,0,8,17,85,8,131,82,7,31,0,8,113,0,8,49,0,9,195,80,7,10,0,8,97,0,8,33,0,9,163,0,8,1,0,8,129,0,8,65,0,9,227,80,7,6,0,8,89,0,8,25,0,9,147,83,7,59,0,8,121,0,8,57,0,9,211,81,7,17,0,8,105,0,8,41,0,9,179,0,8,9,0,8,137,0,8,73,0,9,243,80,7,4,0,8,85,0,8,21,80,8,258,83,7,43,0,8,117,0,8,53,0,9,203,81,7,13,0,8,101,0,8,37,0,9,171,0,8,5,0,8,133,0,8,69,0,9,235,80,7,8,0,8,93,0,8,29,0,9,155,84,7,83,0,8,125,0,8,61,0,9,219,82,7,23,0,8,109,0,8,45,0,9,187,0,8,13,0,8,141,0,8,77,0,9,251,80,7,3,0,8,83,0,8,19,85,8,195,83,7,35,0,8,115,0,8,51,0,9,199,81,7,11,0,8,99,0,8,35,0,9,167,0,8,3,0,8,131,0,8,67,0,9,231,80,7,7,0,8,91,0,8,27,0,9,151,84,7,67,0,8,123,0,8,59,0,9,215,82,7,19,0,8,107,0,8,43,0,9,183,0,8,11,0,8,139,0,8,75,0,9,247,80,7,5,0,8,87,0,8,23,192,8,0,83,7,51,0,8,119,0,8,55,0,9,207,81,7,15,0,8,103,0,8,39,0,9,175,0,8,7,0,8,135,0,8,71,0,9,239,80,7,9,0,8,95,0,8,31,0,9,159,84,7,99,0,8,127,0,8,63,0,9,223,82,7,27,0,8,111,0,8,47,0,9,191,0,8,15,0,8,143,0,8,79,0,9,255],ft=[80,5,1,87,5,257,83,5,17,91,5,4097,81,5,5,89,5,1025,85,5,65,93,5,16385,80,5,3,88,5,513,84,5,33,92,5,8193,82,5,9,90,5,2049,86,5,129,192,5,24577,80,5,2,87,5,385,83,5,25,91,5,6145,81,5,7,89,5,1537,85,5,97,93,5,24577,80,5,4,88,5,769,84,5,49,92,5,12289,82,5,13,90,5,3073,86,5,193,192,5,24577],at=[3,4,5,6,7,8,9,10,11,13,15,17,19,23,27,31,35,43,51,59,67,83,99,115,131,163,195,227,258,0,0],lt=[0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0,112,112],ut=[1,2,3,4,5,7,9,13,17,25,33,49,65,97,129,193,257,385,513,769,1025,1537,2049,3073,4097,6145,8193,12289,16385,24577],wt=[0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13];function ht(){let e,t,n,r,s,i;function o(e,t,o,c,f,a,l,u,w,h,d){let p,y,m,b,g,k,v,S,z,C,x,A,_,I,P;C=0,g=o;do{n[e[t+C]]++,C++,g--}while(0!==g);if(n[0]==o)return l[0]=-1,u[0]=0,0;for(S=u[0],k=1;15>=k&&0===n[k];k++);for(v=k,k>S&&(S=k),g=15;0!==g&&0===n[g];g--);for(m=g,S>g&&(S=g),u[0]=S,I=1<<k;g>k;k++,I<<=1)if(0>(I-=n[k]))return st;if(0>(I-=n[g]))return st;for(n[g]+=I,i[1]=k=0,C=1,_=2;0!=--g;)i[_]=k+=n[C],_++,C++;g=0,C=0;do{0!==(k=e[t+C])&&(d[i[k]++]=g),C++}while(++g<o);for(o=i[m],i[0]=g=0,C=0,b=-1,A=-S,s[0]=0,x=0,P=0;m>=v;v++)for(p=n[v];0!=p--;){for(;v>A+S;){if(b++,A+=S,P=m-A,P=P>S?S:P,(y=1<<(k=v-A))>p+1&&(y-=p+1,_=v,P>k))for(;++k<P&&(y<<=1)>n[++_];)y-=n[_];if(P=1<<k,h[0]+P>1440)return st;s[b]=x=h[0],h[0]+=P,0!==b?(i[b]=g,r[0]=k,r[1]=S,k=g>>>A-S,r[2]=x-s[b-1]-k,w.set(r,3*(s[b-1]+k))):l[0]=x}for(r[1]=v-A,o>C?d[C]<c?(r[0]=256>d[C]?0:96,r[2]=d[C++]):(r[0]=a[d[C]-c]+16+64,r[2]=f[d[C++]-c]):r[0]=192,y=1<<v-A,k=g>>>A;P>k;k+=y)w.set(r,3*(x+k));for(k=1<<v-1;g&k;k>>>=1)g^=k;for(g^=k,z=(1<<A)-1;(g&z)!=i[b];)b--,A-=S,z=(1<<A)-1}return 0!==I&&1!=m?it:0}function c(o){let c;for(e||(e=[],t=[],n=new f(16),r=[],s=new f(15),i=new f(16)),t.length<o&&(t=[]),c=0;o>c;c++)t[c]=0;for(c=0;16>c;c++)n[c]=0;for(c=0;3>c;c++)r[c]=0;s.set(n.subarray(0,15),0),i.set(n.subarray(0,16),0)}this.st=(n,r,s,i,f)=>{let a;return c(19),e[0]=0,a=o(n,0,19,19,null,null,s,r,i,e,t),a==st?f.Le="oversubscribed dynamic bit lengths tree":a!=it&&0!==r[0]||(f.Le="incomplete dynamic bit lengths tree",a=st),a},this.it=(n,r,s,i,f,a,l,u,w)=>{let h;return c(288),e[0]=0,h=o(s,0,n,257,at,lt,a,i,u,e,t),0!=h||0===i[0]?(h==st?w.Le="oversubscribed literal/length tree":-4!=h&&(w.Le="incomplete literal/length tree",h=st),h):(c(288),h=o(s,n,r,0,ut,wt,l,f,u,e,t),0!=h||0===f[0]&&n>257?(h==st?w.Le="oversubscribed distance tree":h==it?(w.Le="incomplete distance tree",h=st):-4!=h&&(w.Le="empty distance tree with lengths",h=st),h):0)}}function dt(){const e=this;let t,n,r,s,i=0,o=0,c=0,f=0,a=0,l=0,u=0,w=0,h=0,d=0;function p(e,t,n,r,s,i,o,c){let f,a,l,u,w,h,d,p,y,m,b,g,k,v,S,z;d=c.nt,p=c.We,w=o.ot,h=o.ct,y=o.write,m=y<o.read?o.read-y-1:o.end-y,b=ot[e],g=ot[t];do{for(;20>h;)p--,w|=(255&c.ft(d++))<<h,h+=8;if(f=w&b,a=n,l=r,z=3*(l+f),0!==(u=a[z]))for(;;){if(w>>=a[z+1],h-=a[z+1],16&u){for(u&=15,k=a[z+2]+(w&ot[u]),w>>=u,h-=u;15>h;)p--,w|=(255&c.ft(d++))<<h,h+=8;for(f=w&g,a=s,l=i,z=3*(l+f),u=a[z];;){if(w>>=a[z+1],h-=a[z+1],16&u){for(u&=15;u>h;)p--,w|=(255&c.ft(d++))<<h,h+=8;if(v=a[z+2]+(w&ot[u]),w>>=u,h-=u,m-=k,v>y){S=y-v;do{S+=o.end}while(0>S);if(u=o.end-S,k>u){if(k-=u,y-S>0&&u>y-S)do{o.lt[y++]=o.lt[S++]}while(0!=--u);else o.lt.set(o.lt.subarray(S,S+u),y),y+=u,S+=u,u=0;S=0}}else S=y-v,y-S>0&&2>y-S?(o.lt[y++]=o.lt[S++],o.lt[y++]=o.lt[S++],k-=2):(o.lt.set(o.lt.subarray(S,S+2),y),y+=2,S+=2,k-=2);if(y-S>0&&k>y-S)do{o.lt[y++]=o.lt[S++]}while(0!=--k);else o.lt.set(o.lt.subarray(S,S+k),y),y+=k,S+=k,k=0;break}if(64&u)return c.Le="invalid distance code",k=c.We-p,k=k>h>>3?h>>3:k,p+=k,d-=k,h-=k<<3,o.ot=w,o.ct=h,c.We=p,c.qe+=d-c.nt,c.nt=d,o.write=y,st;f+=a[z+2],f+=w&ot[u],z=3*(l+f),u=a[z]}break}if(64&u)return 32&u?(k=c.We-p,k=k>h>>3?h>>3:k,p+=k,d-=k,h-=k<<3,o.ot=w,o.ct=h,c.We=p,c.qe+=d-c.nt,c.nt=d,o.write=y,1):(c.Le="invalid literal/length code",k=c.We-p,k=k>h>>3?h>>3:k,p+=k,d-=k,h-=k<<3,o.ot=w,o.ct=h,c.We=p,c.qe+=d-c.nt,c.nt=d,o.write=y,st);if(f+=a[z+2],f+=w&ot[u],z=3*(l+f),0===(u=a[z])){w>>=a[z+1],h-=a[z+1],o.lt[y++]=a[z+2],m--;break}}else w>>=a[z+1],h-=a[z+1],o.lt[y++]=a[z+2],m--}while(m>=258&&p>=10);return k=c.We-p,k=k>h>>3?h>>3:k,p+=k,d-=k,h-=k<<3,o.ot=w,o.ct=h,c.We=p,c.qe+=d-c.nt,c.nt=d,o.write=y,0}e.init=(e,i,o,c,f,a)=>{t=0,u=e,w=i,r=o,h=c,s=f,d=a,n=null},e.ut=(e,y,m)=>{let b,g,k,v,S,z,C,x=0,A=0,_=0;for(_=y.nt,v=y.We,x=e.ot,A=e.ct,S=e.write,z=S<e.read?e.read-S-1:e.end-S;;)switch(t){case 0:if(z>=258&&v>=10&&(e.ot=x,e.ct=A,y.We=v,y.qe+=_-y.nt,y.nt=_,e.write=S,m=p(u,w,r,h,s,d,e,y),_=y.nt,v=y.We,x=e.ot,A=e.ct,S=e.write,z=S<e.read?e.read-S-1:e.end-S,0!=m)){t=1==m?7:9;break}c=u,n=r,o=h,t=1;case 1:for(b=c;b>A;){if(0===v)return e.ot=x,e.ct=A,y.We=v,y.qe+=_-y.nt,y.nt=_,e.write=S,e.wt(y,m);m=0,v--,x|=(255&y.ft(_++))<<A,A+=8}if(g=3*(o+(x&ot[b])),x>>>=n[g+1],A-=n[g+1],k=n[g],0===k){f=n[g+2],t=6;break}if(16&k){a=15&k,i=n[g+2],t=2;break}if(!(64&k)){c=k,o=g/3+n[g+2];break}if(32&k){t=7;break}return t=9,y.Le="invalid literal/length code",m=st,e.ot=x,e.ct=A,y.We=v,y.qe+=_-y.nt,y.nt=_,e.write=S,e.wt(y,m);case 2:for(b=a;b>A;){if(0===v)return e.ot=x,e.ct=A,y.We=v,y.qe+=_-y.nt,y.nt=_,e.write=S,e.wt(y,m);m=0,v--,x|=(255&y.ft(_++))<<A,A+=8}i+=x&ot[b],x>>=b,A-=b,c=w,n=s,o=d,t=3;case 3:for(b=c;b>A;){if(0===v)return e.ot=x,e.ct=A,y.We=v,y.qe+=_-y.nt,y.nt=_,e.write=S,e.wt(y,m);m=0,v--,x|=(255&y.ft(_++))<<A,A+=8}if(g=3*(o+(x&ot[b])),x>>=n[g+1],A-=n[g+1],k=n[g],16&k){a=15&k,l=n[g+2],t=4;break}if(!(64&k)){c=k,o=g/3+n[g+2];break}return t=9,y.Le="invalid distance code",m=st,e.ot=x,e.ct=A,y.We=v,y.qe+=_-y.nt,y.nt=_,e.write=S,e.wt(y,m);case 4:for(b=a;b>A;){if(0===v)return e.ot=x,e.ct=A,y.We=v,y.qe+=_-y.nt,y.nt=_,e.write=S,e.wt(y,m);m=0,v--,x|=(255&y.ft(_++))<<A,A+=8}l+=x&ot[b],x>>=b,A-=b,t=5;case 5:for(C=S-l;0>C;)C+=e.end;for(;0!==i;){if(0===z&&(S==e.end&&0!==e.read&&(S=0,z=S<e.read?e.read-S-1:e.end-S),0===z&&(e.write=S,m=e.wt(y,m),S=e.write,z=S<e.read?e.read-S-1:e.end-S,S==e.end&&0!==e.read&&(S=0,z=S<e.read?e.read-S-1:e.end-S),0===z)))return e.ot=x,e.ct=A,y.We=v,y.qe+=_-y.nt,y.nt=_,e.write=S,e.wt(y,m);e.lt[S++]=e.lt[C++],z--,C==e.end&&(C=0),i--}t=0;break;case 6:if(0===z&&(S==e.end&&0!==e.read&&(S=0,z=S<e.read?e.read-S-1:e.end-S),0===z&&(e.write=S,m=e.wt(y,m),S=e.write,z=S<e.read?e.read-S-1:e.end-S,S==e.end&&0!==e.read&&(S=0,z=S<e.read?e.read-S-1:e.end-S),0===z)))return e.ot=x,e.ct=A,y.We=v,y.qe+=_-y.nt,y.nt=_,e.write=S,e.wt(y,m);m=0,e.lt[S++]=f,z--,t=0;break;case 7:if(A>7&&(A-=8,v++,_--),e.write=S,m=e.wt(y,m),S=e.write,z=S<e.read?e.read-S-1:e.end-S,e.read!=e.write)return e.ot=x,e.ct=A,y.We=v,y.qe+=_-y.nt,y.nt=_,e.write=S,e.wt(y,m);t=8;case 8:return m=1,e.ot=x,e.ct=A,y.We=v,y.qe+=_-y.nt,y.nt=_,e.write=S,e.wt(y,m);case 9:return m=st,e.ot=x,e.ct=A,y.We=v,y.qe+=_-y.nt,y.nt=_,e.write=S,e.wt(y,m);default:return m=rt,e.ot=x,e.ct=A,y.We=v,y.qe+=_-y.nt,y.nt=_,e.write=S,e.wt(y,m)}},e.ht=()=>{}}ht.dt=(e,t,n,r)=>(e[0]=9,t[0]=5,n[0]=ct,r[0]=ft,0);const pt=[16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15];function yt(e,t){const n=this;let r,s=0,o=0,c=0,a=0;const l=[0],u=[0],w=new dt;let h=0,d=new f(4320);const p=new ht;n.ct=0,n.ot=0,n.lt=new i(t),n.end=t,n.read=0,n.write=0,n.reset=(e,t)=>{t&&(t[0]=0),6==s&&w.ht(e),s=0,n.ct=0,n.ot=0,n.read=n.write=0},n.reset(e,null),n.wt=(e,t)=>{let r,s,i;return s=e.rt,i=n.read,r=(i>n.write?n.end:n.write)-i,r>e.tt&&(r=e.tt),0!==r&&t==it&&(t=0),e.tt-=r,e.Ge+=r,e.$e.set(n.lt.subarray(i,i+r),s),s+=r,i+=r,i==n.end&&(i=0,n.write==n.end&&(n.write=0),r=n.write-i,r>e.tt&&(r=e.tt),0!==r&&t==it&&(t=0),e.tt-=r,e.Ge+=r,e.$e.set(n.lt.subarray(i,i+r),s),s+=r,i+=r),e.rt=s,n.read=i,t},n.ut=(e,t)=>{let i,f,y,m,b,g,k,v;for(m=e.nt,b=e.We,f=n.ot,y=n.ct,g=n.write,k=g<n.read?n.read-g-1:n.end-g;;){let S,z,C,x,A,_,I,P;switch(s){case 0:for(;3>y;){if(0===b)return n.ot=f,n.ct=y,e.We=b,e.qe+=m-e.nt,e.nt=m,n.write=g,n.wt(e,t);t=0,b--,f|=(255&e.ft(m++))<<y,y+=8}switch(i=7&f,h=1&i,i>>>1){case 0:f>>>=3,y-=3,i=7&y,f>>>=i,y-=i,s=1;break;case 1:S=[],z=[],C=[[]],x=[[]],ht.dt(S,z,C,x),w.init(S[0],z[0],C[0],0,x[0],0),f>>>=3,y-=3,s=6;break;case 2:f>>>=3,y-=3,s=3;break;case 3:return f>>>=3,y-=3,s=9,e.Le="invalid block type",t=st,n.ot=f,n.ct=y,e.We=b,e.qe+=m-e.nt,e.nt=m,n.write=g,n.wt(e,t)}break;case 1:for(;32>y;){if(0===b)return n.ot=f,n.ct=y,e.We=b,e.qe+=m-e.nt,e.nt=m,n.write=g,n.wt(e,t);t=0,b--,f|=(255&e.ft(m++))<<y,y+=8}if((~f>>>16&65535)!=(65535&f))return s=9,e.Le="invalid stored block lengths",t=st,n.ot=f,n.ct=y,e.We=b,e.qe+=m-e.nt,e.nt=m,n.write=g,n.wt(e,t);o=65535&f,f=y=0,s=0!==o?2:0!==h?7:0;break;case 2:if(0===b)return n.ot=f,n.ct=y,e.We=b,e.qe+=m-e.nt,e.nt=m,n.write=g,n.wt(e,t);if(0===k&&(g==n.end&&0!==n.read&&(g=0,k=g<n.read?n.read-g-1:n.end-g),0===k&&(n.write=g,t=n.wt(e,t),g=n.write,k=g<n.read?n.read-g-1:n.end-g,g==n.end&&0!==n.read&&(g=0,k=g<n.read?n.read-g-1:n.end-g),0===k)))return n.ot=f,n.ct=y,e.We=b,e.qe+=m-e.nt,e.nt=m,n.write=g,n.wt(e,t);if(t=0,i=o,i>b&&(i=b),i>k&&(i=k),n.lt.set(e.je(m,i),g),m+=i,b-=i,g+=i,k-=i,0!=(o-=i))break;s=0!==h?7:0;break;case 3:for(;14>y;){if(0===b)return n.ot=f,n.ct=y,e.We=b,e.qe+=m-e.nt,e.nt=m,n.write=g,n.wt(e,t);t=0,b--,f|=(255&e.ft(m++))<<y,y+=8}if(c=i=16383&f,(31&i)>29||(i>>5&31)>29)return s=9,e.Le="too many length or distance symbols",t=st,n.ot=f,n.ct=y,e.We=b,e.qe+=m-e.nt,e.nt=m,n.write=g,n.wt(e,t);if(i=258+(31&i)+(i>>5&31),!r||r.length<i)r=[];else for(v=0;i>v;v++)r[v]=0;f>>>=14,y-=14,a=0,s=4;case 4:for(;4+(c>>>10)>a;){for(;3>y;){if(0===b)return n.ot=f,n.ct=y,e.We=b,e.qe+=m-e.nt,e.nt=m,n.write=g,n.wt(e,t);t=0,b--,f|=(255&e.ft(m++))<<y,y+=8}r[pt[a++]]=7&f,f>>>=3,y-=3}for(;19>a;)r[pt[a++]]=0;if(l[0]=7,i=p.st(r,l,u,d,e),0!=i)return(t=i)==st&&(r=null,s=9),n.ot=f,n.ct=y,e.We=b,e.qe+=m-e.nt,e.nt=m,n.write=g,n.wt(e,t);a=0,s=5;case 5:for(;i=c,258+(31&i)+(i>>5&31)>a;){let o,w;for(i=l[0];i>y;){if(0===b)return n.ot=f,n.ct=y,e.We=b,e.qe+=m-e.nt,e.nt=m,n.write=g,n.wt(e,t);t=0,b--,f|=(255&e.ft(m++))<<y,y+=8}if(i=d[3*(u[0]+(f&ot[i]))+1],w=d[3*(u[0]+(f&ot[i]))+2],16>w)f>>>=i,y-=i,r[a++]=w;else{for(v=18==w?7:w-14,o=18==w?11:3;i+v>y;){if(0===b)return n.ot=f,n.ct=y,e.We=b,e.qe+=m-e.nt,e.nt=m,n.write=g,n.wt(e,t);t=0,b--,f|=(255&e.ft(m++))<<y,y+=8}if(f>>>=i,y-=i,o+=f&ot[v],f>>>=v,y-=v,v=a,i=c,v+o>258+(31&i)+(i>>5&31)||16==w&&1>v)return r=null,s=9,e.Le="invalid bit length repeat",t=st,n.ot=f,n.ct=y,e.We=b,e.qe+=m-e.nt,e.nt=m,n.write=g,n.wt(e,t);w=16==w?r[v-1]:0;do{r[v++]=w}while(0!=--o);a=v}}if(u[0]=-1,A=[],_=[],I=[],P=[],A[0]=9,_[0]=6,i=c,i=p.it(257+(31&i),1+(i>>5&31),r,A,_,I,P,d,e),0!=i)return i==st&&(r=null,s=9),t=i,n.ot=f,n.ct=y,e.We=b,e.qe+=m-e.nt,e.nt=m,n.write=g,n.wt(e,t);w.init(A[0],_[0],d,I[0],d,P[0]),s=6;case 6:if(n.ot=f,n.ct=y,e.We=b,e.qe+=m-e.nt,e.nt=m,n.write=g,1!=(t=w.ut(n,e,t)))return n.wt(e,t);if(t=0,w.ht(e),m=e.nt,b=e.We,f=n.ot,y=n.ct,g=n.write,k=g<n.read?n.read-g-1:n.end-g,0===h){s=0;break}s=7;case 7:if(n.write=g,t=n.wt(e,t),g=n.write,k=g<n.read?n.read-g-1:n.end-g,n.read!=n.write)return n.ot=f,n.ct=y,e.We=b,e.qe+=m-e.nt,e.nt=m,n.write=g,n.wt(e,t);s=8;case 8:return t=1,n.ot=f,n.ct=y,e.We=b,e.qe+=m-e.nt,e.nt=m,n.write=g,n.wt(e,t);case 9:return t=st,n.ot=f,n.ct=y,e.We=b,e.qe+=m-e.nt,e.nt=m,n.write=g,n.wt(e,t);default:return t=rt,n.ot=f,n.ct=y,e.We=b,e.qe+=m-e.nt,e.nt=m,n.write=g,n.wt(e,t)}}},n.ht=e=>{n.reset(e,null),n.lt=null,d=null},n.yt=(e,t,r)=>{n.lt.set(e.subarray(t,t+r),0),n.read=n.write=r},n.bt=()=>1==s?1:0}const mt=13,bt=[0,0,255,255];function gt(){const e=this;function t(e){return e&&e.gt?(e.qe=e.Ge=0,e.Le=null,e.gt.mode=7,e.gt.kt.reset(e,null),0):rt}e.mode=0,e.method=0,e.vt=[0],e.St=0,e.marker=0,e.zt=0,e.Ct=t=>(e.kt&&e.kt.ht(t),e.kt=null,0),e.xt=(n,r)=>(n.Le=null,e.kt=null,8>r||r>15?(e.Ct(n),rt):(e.zt=r,n.gt.kt=new yt(n,1<<r),t(n),0)),e.At=(e,t)=>{let n,r;if(!e||!e.gt||!e.et)return rt;const s=e.gt;for(t=4==t?it:0,n=it;;)switch(s.mode){case 0:if(0===e.We)return n;if(n=t,e.We--,e.qe++,8!=(15&(s.method=e.ft(e.nt++)))){s.mode=mt,e.Le="unknown compression method",s.marker=5;break}if(8+(s.method>>4)>s.zt){s.mode=mt,e.Le="invalid win size",s.marker=5;break}s.mode=1;case 1:if(0===e.We)return n;if(n=t,e.We--,e.qe++,r=255&e.ft(e.nt++),((s.method<<8)+r)%31!=0){s.mode=mt,e.Le="incorrect header check",s.marker=5;break}if(!(32&r)){s.mode=7;break}s.mode=2;case 2:if(0===e.We)return n;n=t,e.We--,e.qe++,s.St=(255&e.ft(e.nt++))<<24&4278190080,s.mode=3;case 3:if(0===e.We)return n;n=t,e.We--,e.qe++,s.St+=(255&e.ft(e.nt++))<<16&16711680,s.mode=4;case 4:if(0===e.We)return n;n=t,e.We--,e.qe++,s.St+=(255&e.ft(e.nt++))<<8&65280,s.mode=5;case 5:return 0===e.We?n:(n=t,e.We--,e.qe++,s.St+=255&e.ft(e.nt++),s.mode=6,2);case 6:return s.mode=mt,e.Le="need dictionary",s.marker=0,rt;case 7:if(n=s.kt.ut(e,n),n==st){s.mode=mt,s.marker=0;break}if(0==n&&(n=t),1!=n)return n;n=t,s.kt.reset(e,s.vt),s.mode=12;case 12:return e.We=0,1;case mt:return st;default:return rt}},e._t=(e,t,n)=>{let r=0,s=n;if(!e||!e.gt||6!=e.gt.mode)return rt;const i=e.gt;return s<1<<i.zt||(s=(1<<i.zt)-1,r=n-s),i.kt.yt(t,r,s),i.mode=7,0},e.It=e=>{let n,r,s,i,o;if(!e||!e.gt)return rt;const c=e.gt;if(c.mode!=mt&&(c.mode=mt,c.marker=0),0===(n=e.We))return it;for(r=e.nt,s=c.marker;0!==n&&4>s;)e.ft(r)==bt[s]?s++:s=0!==e.ft(r)?0:4-s,r++,n--;return e.qe+=r-e.nt,e.nt=r,e.We=n,c.marker=s,4!=s?st:(i=e.qe,o=e.Ge,t(e),e.qe=i,e.Ge=o,c.mode=7,0)},e.Pt=e=>e&&e.gt&&e.gt.kt?e.gt.kt.bt():rt}function kt(){}function vt(e){const t=new kt,n=e&&e.chunkSize?r.floor(2*e.chunkSize):131072,o=new i(n);let c=!1;t.xt(),t.$e=o,this.append=(e,r)=>{const f=[];let a,l,u=0,w=0,h=0;if(0!==e.length){t.nt=0,t.et=e,t.We=e.length;do{if(t.rt=0,t.tt=n,0!==t.We||c||(t.nt=0,c=!0),a=t.At(0),c&&a===it){if(0!==t.We)throw new s("inflating: bad input")}else if(0!==a&&1!==a)throw new s("inflating: "+t.Le);if((c||1===a)&&t.We===e.length)throw new s("inflating: bad input");t.rt&&(t.rt===n?f.push(new i(o)):f.push(o.subarray(0,t.rt))),h+=t.rt,r&&t.nt>0&&t.nt!=u&&(r(t.nt),u=t.nt)}while(t.We>0||0===t.tt);return f.length>1?(l=new i(h),f.forEach((e=>{l.set(e,w),w+=e.length}))):l=f[0]?new i(f[0]):new i,l}},this.flush=()=>{t.Ct()}}kt.prototype={xt(e){const t=this;return t.gt=new gt,e||(e=15),t.gt.xt(t,e)},At(e){const t=this;return t.gt?t.gt.At(t,e):rt},Ct(){const e=this;if(!e.gt)return rt;const t=e.gt.Ct(e);return e.gt=null,t},It(){const e=this;return e.gt?e.gt.It(e):rt},_t(e,t){const n=this;return n.gt?n.gt._t(n,e,t):rt},ft(e){return this.et[e]},je(e,t){return this.et.subarray(e,e+t)}},self.initCodec=()=>{self.Deflate=nt,self.Inflate=vt};
`,r=()=>n.useDataURI?"data:text/javascript,"+encodeURIComponent(t):URL.createObjectURL(new Blob([t],{type:"text/javascript"}));e({workerScripts:{inflate:[r],deflate:[r]}})}const fo="\0☺☻♥♦♣♠•◘○◙♂♀♪♫☼►◄↕‼¶§▬↨↑↓→←∟↔▲▼ !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~⌂ÇüéâäàåçêëèïîìÄÅÉæÆôöòûùÿÖÜ¢£¥₧ƒáíóúñÑªº¿⌐¬½¼¡«»░▒▓│┤╡╢╖╕╣║╗╝╜╛┐└┴┬├─┼╞╟╚╔╩╦╠═╬╧╨╤╥╙╘╒╓╫╪┘┌█▄▌▐▀αßΓπΣσµτΦΘΩδ∞φε∩≡±≥≤⌠⌡÷≈°∙·√ⁿ²■ ".split("");fo.length==256;let xi;try{xi=import.meta.url}catch{}vn({baseURL:xi});lo(vn);vn({Deflate:ha,Inflate:Na});function yi(e){const n=e.split(".").shift().replace(/-/g," ");return n.charAt(0).toUpperCase()+n.slice(1).toLowerCase()}const bi=async(e,{pluginPath:n,pluginName:t},r)=>{r?.tracker.setCaption(`Activating ${t||n}`);const i=await e.documentRoot,s=D("/tmp",`playground-activate-plugin-${Ir(20,"")}.log`);let a="";const o=await e.run({code:`<?php
			define( 'WP_ADMIN', true );
			require_once( getenv('DOCROOT') . "/wp-load.php" );
			require_once( getenv('DOCROOT') . "/wp-admin/includes/plugin.php" );

			// Force PHP errors to our scratch log for this request so the
			// JS caller can surface them when activation fails. This wins
			// over whatever WP_DEBUG_LOG resolved to during bootstrap.
			ini_set('log_errors', '1');
			ini_set('error_log', getenv('ACTIVATION_LOG'));

			// Set current user to admin
			wp_set_current_user( get_users(array('role' => 'Administrator') )[0]->ID );

			$plugin_path = getenv('PLUGIN_PATH');
			$response = false;
			if ( ! is_dir( $plugin_path)) {
				$response = activate_plugin($plugin_path);
			}

			// Activate plugin by name if activation by path wasn't successful
			if ( null !== $response ) {
				foreach ( ( glob( $plugin_path . '/*.php' ) ?: array() ) as $file ) {
					$info = get_plugin_data( $file, false, false );
					if ( ! empty( $info['Name'] ) ) {
						$response = activate_plugin( $file );
						break;
					}
				}
			}

			if ( is_wp_error($response) ) {
				die( $response->get_error_message() );
			} else if ( false === $response ) {
				die( "The activatePlugin step wasn't able to find the plugin $plugin_path." );
			}
		`,env:{PLUGIN_PATH:n,DOCROOT:i,ACTIVATION_LOG:s}}).finally(async()=>{try{await e.fileExists(s)&&(a=(await e.readFileAsText(s)).trim(),await e.unlink(s))}catch(_){if(!po(_))throw _}});o.text&&Q.warn(`Plugin ${n} activation printed the following bytes: ${o.text}`);const d=((await e.run({code:`<?php
			ob_start();
			require_once( getenv( 'DOCROOT' ) . "/wp-load.php" );

			$plugin_directory = rtrim( WP_PLUGIN_DIR, '/' ) . '/';
			$relative_plugin_path = getenv( 'PLUGIN_PATH' );
			if (strpos($relative_plugin_path, $plugin_directory) === 0) {
				$relative_plugin_path = substr($relative_plugin_path, strlen($plugin_directory));
			}

			if ( is_dir( $plugin_directory . $relative_plugin_path ) ) {
				$relative_plugin_path = rtrim( $relative_plugin_path, '/' ) . '/';
			}

			$active_plugins = get_option( 'active_plugins' );
			if ( ! is_array( $active_plugins ) ) {
				$active_plugins = array();
			}
			ob_end_clean();

			/**
			 * Use a shutdown function to ensure the activation-related output comes
			 * last in stdout.
			 */
			register_shutdown_function( function() use ( $relative_plugin_path, $active_plugins ) {
				foreach ( $active_plugins as $plugin ) {
					if ( substr( $plugin, 0, strlen( $relative_plugin_path ) ) === $relative_plugin_path ) {
						die('{"success": true}');
						break;
					}
				}
				die('{"success": false}');
			});
		`,env:{DOCROOT:i,PLUGIN_PATH:n}})).text??"").trim();if(d.endsWith('{"success": true}'))return;d!=='{"success": false}'&&Q.debug(d);const h=[],m=(o.text??"").trim();throw m&&h.push(`WordPress said: ${m}`),a&&h.push(`PHP error log:
${a}`),h.push(`Response headers: ${JSON.stringify(o.headers,null,2)}`),h.push("If you need more context, check the Playground console (browser DevTools) or the CLI output where this Blueprint was run."),new Error(`Plugin ${n} could not be activated.

${h.join(`

`)}`)},uo=44;function po(e){const n=e;return n.code==="ENOENT"||n.errno===uo}const vi=async(e,{themeFolderName:n},t)=>{t?.tracker.setCaption(`Activating ${n}`);const r=await e.documentRoot,i=`${r}/wp-content/themes/${n}`;if(!await e.fileExists(i))throw new Error(`
			Couldn't activate theme ${n}.
			Theme not found at the provided theme path: ${i}.
			Check the theme path to ensure it's correct.
			If the theme is not installed, you can install it using the installTheme step.
			More info can be found in the Blueprint documentation: https://wordpress.github.io/wordpress-playground/blueprints/steps/#ActivateThemeStep
		`);const s=await e.run({code:`<?php
			define( 'WP_ADMIN', true );
			require_once( getenv('docroot') . "/wp-load.php" );

			// Set current user to admin
			wp_set_current_user( get_users(array('role' => 'Administrator') )[0]->ID );

			switch_theme( getenv('themeFolderName') );

			if( wp_get_theme()->get_stylesheet() !== getenv('themeFolderName') ) {
				throw new Exception( 'Theme ' . getenv('themeFolderName') . ' could not be activated.' );				
			}
			die('Theme activated successfully');
		`,env:{docroot:r,themeFolderName:n}});if(s.text!=="Theme activated successfully")throw Q.debug(s),new Error(`Theme ${n} could not be activated - WordPress exited with exit code ${s.exitCode}. Inspect the "debug" logs in the console for more details. Output headers: ${JSON.stringify(s.headers,null,2)}`)},mo=async(e,{code:n})=>{let t=typeof n=="string"?n:n.content;return(t.includes('"wordpress/wp-load.php"')||t.includes("'wordpress/wp-load.php'"))&&(Q.error(`
It looks like you're trying to load WordPress using a relative path 'wordpress/wp-load.php'.

Playground recently changed the working directory from '/' to '/wordpress' to better mimic
how real web servers work. This means relative paths that used to work may no longer
point to the correct location.

Playground automatically updated the path for you, but at one point path rewriting will be removed. Please
update your code to use an absolute path instead:

Instead of:  require_once 'wordpress/wp-load.php';
Use:         require_once '/wordpress/wp-load.php';

This will ensure your code works reliably regardless of the current working directory.
		`.trim()),t=t.replace("'wordpress/wp-load.php'","'/wordpress/wp-load.php'"),t=t.replace('"wordpress/wp-load.php"','"/wordpress/wp-load.php"')),await e.run({code:t})},ho=async(e,{options:n})=>await e.run(n),un=async(e,{path:n})=>{n.startsWith("/")||(Q.error(`
The rm() step in your Blueprint refers to a relative path.

Playground recently changed the working directory from '/' to '/wordpress' to better mimic 
how real web servers work. This means relative paths that used to work may no longer 
point to the correct location.

Playground automatically updated the path for you, but at one point path rewriting will be removed. Please
update your code to use an absolute path instead:

Instead of:  rm({ path: 'wordpress/wp-load.php' });
Use:         rm({ path: '/wordpress/wp-load.php' });

This will ensure your code works reliably regardless of the current working directory.
		`.trim()),n=`/${n}`),await e.unlink(n)};var _o=`<?php

/**
 * Naively splits an SQL string into a sequence of queries. It
 * streams the data so you can process very large chunks of SQL
 * without running out of memory.
 * 
 * This class is **naive** because it doesn't understand what a
 * valid query is. The lexer does not provide a way to distinguish
 * between a syntax error and an incomplete input yet. Lacking this
 * information, we assume that no SQL query is larger than 2MB and,
 * failing to extract a query from a 2MB buffer, we fail. This heuristic
 * is often sufficient, but may fail in pathological cases.
 * 
 * Usage:
 * 
 *     $stream = new WP_MySQL_Naive_Query_Stream();
 *     $stream->append_sql( 'SELECT id FROM users; SELECT * FROM posts;' );
 *     while ( $stream->next_query() ) {
 *         $sql_string = $stream->get_query();
 *         // Process the query.
 *     }
 *     $stream->append_sql( 'CREATE TABLE users (id INT, name VARCHAR(255));' );
 *     while ( $stream->next_query() ) {
 *         $sql_string = $stream->get_query();
 *         // Process the query.
 *     }
 *     $stream->mark_input_complete();
 *     $stream->next_query(); // returns false
 */
class WP_MySQL_Naive_Query_Stream {

	private $sql_buffer = '';
	private $input_complete = false;
	private $state = true;
	private $last_query = false;

	const STATE_QUERY = 'valid';
	const STATE_SYNTAX_ERROR = 'syntax_error';
	const STATE_PAUSED_ON_INCOMPLETE_INPUT = 'paused_on_incomplete_input';
	const STATE_FINISHED = 'finished';

	/**
	 * The maximum size of the buffer to store the SQL input. We don't
	 * have enough information from the lexer to distinguish between
	 * an incomplete input and a syntax error so we use a heuristic –
	 * if we've accumulated more than this amount of SQL input, we assume
	 * it's a syntax error. That's why this class is called a "naive" query
	 * stream.
	 */
	const MAX_SQL_BUFFER_SIZE = 1024 * 1024 * 15;

	public function __construct() {}

	public function append_sql( string $sql ) {
		if($this->input_complete) {
			return false;
		}
		$this->sql_buffer .= $sql;
		$this->state = self::STATE_QUERY;
		return true;
	}

	public function is_paused_on_incomplete_input(): bool {
		return $this->state === self::STATE_PAUSED_ON_INCOMPLETE_INPUT;
	}

	public function mark_input_complete() {
		$this->input_complete = true;
	}

	public function next_query() {
		$this->last_query = false;
		if($this->state === self::STATE_PAUSED_ON_INCOMPLETE_INPUT) {
			return false;
		}

		$result = $this->do_next_query();
		if(!$result && strlen($this->sql_buffer) > self::MAX_SQL_BUFFER_SIZE) {
			$this->state = self::STATE_SYNTAX_ERROR;
			return false;
		}
		return $result;
	}

	private function do_next_query() {
		$query = [];
		$lexer = new WP_MySQL_Lexer( $this->sql_buffer );
		while ( $lexer->next_token() ) {
			$token = $lexer->get_token();
			$query[] = $token;
			if ( $token->id === WP_MySQL_Lexer::SEMICOLON_SYMBOL ) {
				// Got a complete query!
				break;
			}
		}

		// @TODO: expose this method from the lexer
		// if($lexer->get_state() === WP_MySQL_Lexer::STATE_SYNTAX_ERROR) {
		// 	return false;
		// }

		if(!count($query)) {
			if ( $this->input_complete ) {
				$this->state = self::STATE_FINISHED;
			} else {
				$this->state = self::STATE_PAUSED_ON_INCOMPLETE_INPUT;
			}
			return false;
		}

		// The last token either needs to end with a semicolon, or be the
		// last token in the input.
		$last_token = $query[count($query) - 1];
		if ( 
			$last_token->id !== WP_MySQL_Lexer::SEMICOLON_SYMBOL &&
			! $this->input_complete
		) {
			$this->state = self::STATE_PAUSED_ON_INCOMPLETE_INPUT;
			return false;
		}

		// See if the query has any meaningful tokens. We don't want to return
		// to give the caller a comment disguised as a query.
		$has_meaningful_tokens = false;
		foreach($query as $token) {
			if ( 
				$token->id !== WP_MySQL_Lexer::WHITESPACE && 
				$token->id !== WP_MySQL_Lexer::COMMENT &&
				$token->id !== WP_MySQL_Lexer::MYSQL_COMMENT_START &&
				$token->id !== WP_MySQL_Lexer::MYSQL_COMMENT_END &&
				$token->id !== WP_MySQL_Lexer::EOF
			) {
				$has_meaningful_tokens = true;
				break;
			}
		}
		if(!$has_meaningful_tokens) {
			if ( $this->input_complete ) {
				$this->state = self::STATE_FINISHED;
			} else {
				$this->state = self::STATE_PAUSED_ON_INCOMPLETE_INPUT;
			}
			return false;
		}

		// Remove the query from the input buffer and return it.
		$last_byte = $last_token->start + $last_token->length;
		$query = substr($this->sql_buffer, 0, $last_byte);
		$this->sql_buffer = substr($this->sql_buffer, $last_byte);
		$this->last_query = $query;
		$this->state = self::STATE_QUERY;
		return true;
	}

	public function get_query() {
		return $this->last_query;
	}

	public function get_state() {
		return $this->state;
	}

}`;const wo=async(e,{sql:n},t)=>{t?.tracker.setCaption("Executing SQL Queries");const r=`/tmp/${kt()}.sql`,i=`/tmp/${kt()}.php`;await e.writeFile(r,new Uint8Array(await n.arrayBuffer())),await e.writeFile(i,new TextEncoder().encode(_o));const s=await e.documentRoot,a=at({docroot:s,sqlFilename:r,streamClassFilename:i}),c=await e.run({code:`<?php
		define('WP_SQLITE_AST_DRIVER', true);
		require_once ${a.docroot} . '/wp-load.php';

		// Load WP_MySQL_Naive_Query_Stream from the bundled file
		require_once ${a.streamClassFilename};

		global $wpdb;

		do_action('run_sql_step');

		$stream = new WP_MySQL_Naive_Query_Stream();

		// Open the SQL file for streaming
		$handle = fopen(${a.sqlFilename}, 'r');
		if (!$handle) {
			throw new Exception('Failed to open SQL file');
		}

		// Read and process the file in 8KB chunks
		$chunk_size = 8192;
		while (!feof($handle)) {
			$chunk = fread($handle, $chunk_size);
			if ($chunk === false) {
				break;
			}

			$stream->append_sql($chunk);

			// Process any complete queries in the stream
			while ($stream->next_query()) {
				$query = $stream->get_query();
				$wpdb->query($query);
			}
		}

		fclose($handle);

		// Mark input as complete and process any remaining queries
		$stream->mark_input_complete();
		while ($stream->next_query()) {
			$query = $stream->get_query();
			$wpdb->query($query);
		}
	`});return await un(e,{path:r}),await un(e,{path:i}),c},go=async(e,{request:n})=>{Q.warn('Deprecated: The Blueprint step "request" is deprecated and will be removed in a future release.');const t=await e.request(n);if(t.httpStatusCode>399||t.httpStatusCode<200)throw Q.warn("WordPress response was",{response:t}),new Error(`Request failed with status ${t.httpStatusCode}`);return t},Sn=async(e,{consts:n,method:t="define-before-run"})=>{switch(t){case"define-before-run":await xo(e,n);break;case"rewrite-wp-config":{const r=await e.documentRoot,i=D(r,"/wp-config.php");await js(e,i,n);break}default:throw new Error(`Invalid method: ${t}`)}};async function xo(e,n){for(const t in n)await e.defineConstant(t,n[t])}const $i=async(e,{options:n})=>{const t=await e.documentRoot;await e.run({code:`<?php
		include ${X(t)} . '/wp-load.php';
		$site_options = ${X(n)};
		$flush_rewrite_rules = (
			is_array($site_options) &&
			array_key_exists('permalink_structure', $site_options)
		) || (
			is_object($site_options) &&
			property_exists($site_options, 'permalink_structure')
		);
		foreach($site_options as $name => $value) {
			update_option($name, $value);
		}
		if ($flush_rewrite_rules) {
			flush_rewrite_rules(false);
		}
		echo "Success";
		`})},yo=async(e,{meta:n,userId:t})=>{const r=await e.documentRoot;await e.run({code:`<?php
		include ${X(r)} . '/wp-load.php';
		$meta = ${X(n)};
		foreach($meta as $name => $value) {
			update_user_meta(${X(t)}, $name, $value);
		}
		`})},En="/tmp/wp-cli.phar",bo={resource:"url",url:"https://playground.wordpress.net/wp-cli.phar"},Xt="This WP-CLI command tried to read from STDIN, but the wp-cli Blueprint step does not support interactive input. Provide all required arguments.",$r="/tmp/playground-wp-cli-overrides.php",vo=`<?php
if ( ! class_exists( 'WP_CLI' ) ) {
	return;
}

WP_CLI::add_command(
	'db query',
	function ( $args, $assoc_args ) {
		global $wpdb;

		$sql = isset( $args[0] ) ? trim( $args[0] ) : '';
		if ( '' === $sql ) {
			WP_CLI::error(
				'Pass the SQL query as an argument. Reading it from STDIN ' .
				'is not supported in Playground.'
			);
		}

		$suppressed = $wpdb->suppress_errors( true );
		$rows       = $wpdb->get_results( $sql, ARRAY_A );
		$wpdb->suppress_errors( $suppressed );
		if ( '' !== $wpdb->last_error ) {
			// The SQLite driver reports errors as an HTML debug dump. Surface
			// only the underlying database error message.
			$error = $wpdb->last_error;
			if ( preg_match( '/class="error_message"[^>]*>(.*?)<\\/div>/s', $error, $m ) ) {
				$error = $m[1];
			}
			WP_CLI::error( trim( wp_strip_all_tags( $error ) ) );
		}

		if ( ! empty( $rows ) ) {
			WP_CLI\\Utils\\format_items( 'table', $rows, array_keys( $rows[0] ) );
		} elseif ( ! preg_match( '/^(SELECT|SHOW|DESCRIBE|DESC|EXPLAIN|PRAGMA)\\b/i', $sql ) ) {
			WP_CLI::success(
				sprintf( 'Query OK, %d rows affected.', $wpdb->rows_affected )
			);
		}
	},
	array(
		'shortdesc' => 'Executes a query against the database.',
		'synopsis'  => array(
			array(
				'type'     => 'positional',
				'name'     => 'sql',
				'optional' => false,
			),
		),
		'when'      => 'after_wp_load',
	)
);
`,Tn=async(e,n=En)=>{if(!await e.fileExists(n))throw new Error(`wp-cli.phar not found at ${n}.
			You can enable wp-cli support by adding "wp-cli" to the list of extra libraries in your blueprint as follows:
			{
				"extraLibraries": [ "wp-cli" ]
			}
			Read more about it in the documentation.
			https://wordpress.github.io/wordpress-playground/blueprints/data-format#extra-libraries`)},ki=async(e,{command:n,wpCliPath:t=En})=>{await Tn(e,t);let r;if(typeof n=="string"?(n=n.trim(),r=$o(n)):r=n,r.shift()!=="wp")throw new Error('The first argument must be "wp".');let s=!1;const a=r.map(f=>f.startsWith("wordpress/")?(s=!0,`/${f}`):f);s&&Q.error(`
The wp-cli step in your Blueprint refers to a relative path.

Playground recently changed the working directory from '/' to '/wordpress' to better mimic 
how real web servers work. This means relative paths that used to work may no longer 
point to the correct location.

Playground automatically updated the path for you, but at one point path rewriting will be removed. Please
update your code to use an absolute path instead:

Instead of:

        {
            "step": "wp-cli",
            "command": "wp media import wordpress/wp-content/Select-storage-method.png --post_id=4 --title='Select your storage method' --featured_image"
        }

Use:

        {
            "step": "wp-cli",
            "command": "wp media import /wordpress/wp-content/Select-storage-method.png --post_id=4 --title='Select your storage method' --featured_image"
        }

This will ensure your code works reliably regardless of the current working directory.
        `.trim());const c=await e.documentRoot;await e.writeFile("/tmp/stdout",""),await e.writeFile("/tmp/stderr",""),await e.writeFile($r,vo),await e.writeFile(D(c,"run-cli.php"),`<?php
		// Set up the environment to emulate a shell script
		// call.

		// Set SHELL_PIPE to 0 to ensure WP-CLI formats
		// the output as ASCII tables.
		// @see https://github.com/wp-cli/wp-cli/issues/1102
		putenv( 'SHELL_PIPE=0' );

		// Set the argv global.
		$GLOBALS['argv'] = array_merge([
		  "/tmp/wp-cli.phar",
		  "--path=${c}",
		  "--require=${$r}"
		], ${X(a)});

		// Fail before a command can treat missing interactive input as an empty
		// value. The Blueprint step has no way to provide STDIN.
		class Playground_No_Stdin_Stream {
			public $context;

			public function stream_open($path, $mode, $options, &$opened_path) {
				return true;
			}

			public function stream_eof() {
				throw new RuntimeException(
					${X(Xt)}
				);
			}

			public function stream_read($count) {
				return $this->stream_eof();
			}

			public function stream_stat() {
				return [];
			}
		}

		$playground_no_stdin_scheme =
			'playground-no-stdin-' . str_replace('.', '-', uniqid('', true));
		if (
			!stream_wrapper_register(
				$playground_no_stdin_scheme,
				Playground_No_Stdin_Stream::class
			)
		) {
			throw new RuntimeException(${X(Xt)});
		}
		$playground_no_stdin = fopen(
			$playground_no_stdin_scheme . '://input',
			'rb'
		);
		if (!is_resource($playground_no_stdin)) {
			throw new RuntimeException(${X(Xt)});
		}
		define('STDIN', $playground_no_stdin);

		// Provide stdout and stderr streams outside of the CLI SAPI.
		define('STDOUT', fopen('php://stdout', 'wb'));
		define('STDERR', fopen('php://stderr', 'wb'));

		require( ${X(t)} );
		`);const o=await e.run({scriptPath:D(c,"run-cli.php")});if(o.exitCode!==0)throw new Error(o.errors);return o};function $o(e){let r=0,i="";const s=[];let a="";for(let c=0;c<e.length;c++){const o=e[c];r===0?o==='"'||o==="'"?(r=1,i=o):o.match(/\s/)?(a&&s.push(a),a=""):a+=o:r===1&&(o==="\\"?(c++,a+=e[c]):o===i?(r=0,i=""):a+=o)}return a&&s.push(a),s}const ko=async(e,{wpCliPath:n})=>{await Tn(e,n),await Sn(e,{consts:{WP_ALLOW_MULTISITE:1}});const t=new URL(await e.absoluteUrl);if(t.port!==""){let f=`The current host is ${t.host}, but WordPress multisites do not support custom ports.`;throw t.hostname==="localhost"&&(f+=" For development, you can set up a playground.test domain using the instructions at https://wordpress.github.io/wordpress-playground/contributing/code."),new Error(f)}const r=t.pathname.replace(/\/$/,"")+"/",i=`${t.protocol}//${t.hostname}${r}`;await $i(e,{options:{siteurl:i,home:i}}),await ki(e,{command:`wp core multisite-convert --base="${r}"`});const a=`${await e.documentRoot}/wp-config.php`,c=await e.readFileAsText(a);let o=c;c.includes("$_SERVER['HTTP_HOST']")||(o=c.replace(/^<\?php\s*/i,`<?php
$_SERVER['HTTP_HOST'] = ${X(t.hostname)};
`)),await e.writeFile(a,o)},So=async(e,{fromPath:n,toPath:t})=>{(!n.startsWith("/")||!t.startsWith("/"))&&Q.error(`
The cp() step in your Blueprint refers to a relative path.

Playground recently changed the working directory from '/' to '/wordpress' to better mimic 
how real web servers work. This means relative paths that used to work may no longer 
point to the correct location.

Playground automatically updated the path for you, but at one point path rewriting will be removed. Please
update your code to use an absolute path instead:

Instead of:  cp({ fromPath: 'wordpress/wp-load.php', toPath: 'wordpress/wp-load.php' });
Use:         cp({ fromPath: '/wordpress/wp-load.php', toPath: '/wordpress/wp-load.php' });

This will ensure your code works reliably regardless of the current working directory.
		`.trim()),n.startsWith("/")||(n=`/${n}`),t.startsWith("/")||(t=`/${t}`),await e.writeFile(t,await e.readFileAsBuffer(n))},Eo=async(e,{fromPath:n,toPath:t})=>{(!n.startsWith("/")||!t.startsWith("/"))&&Q.error(`
The mv() step in your Blueprint refers to a relative path.

Playground recently changed the working directory from '/' to '/wordpress' to better mimic 
how real web servers work. This means relative paths that used to work may no longer 
point to the correct location.

Playground automatically updated the path for you, but at one point path rewriting will be removed. Please
update your code to use an absolute path instead:

Instead of:  mv({ fromPath: 'wordpress/wp-load.php', toPath: 'wordpress/wp-load.php' });
Use:         mv({ fromPath: '/wordpress/wp-load.php', toPath: '/wordpress/wp-load.php' });

This will ensure your code works reliably regardless of the current working directory.
		`.trim()),n.startsWith("/")||(n=`/${n}`),t.startsWith("/")||(t=`/${t}`),await e.mv(n,t)},To=async(e,{path:n})=>{n.startsWith("/")||Q.error(`
The mkdir() step in your Blueprint refers to a relative path.

Playground recently changed the working directory from '/' to '/wordpress' to better mimic 
how real web servers work. This means relative paths that used to work may no longer 
point to the correct location.

Playground automatically updated the path for you, but at one point path rewriting will be removed. Please
update your code to use an absolute path instead:

Instead of:  mkdir({ path: 'wordpress/my-new-folder' });
Use:         mkdir({ path: '/wordpress/my-new-folder' });

This will ensure your code works reliably regardless of the current working directory.
		`.trim()),await e.mkdir(n)},Po=async(e,{path:n})=>{n.startsWith("/")||(Q.error(`
The rmdir() step in your Blueprint refers to a relative path.

Playground recently changed the working directory from '/' to '/wordpress' to better mimic 
how real web servers work. This means relative paths that used to work may no longer 
point to the correct location.

Playground automatically updated the path for you, but at one point path rewriting will be removed. Please
update your code to use an absolute path instead:

Instead of:  rmdir({ path: 'wordpress/wp-load.php' });
Use:         rmdir({ path: '/wordpress/wp-load.php' });

This will ensure your code works reliably regardless of the current working directory.
		`.trim()),n=`/${n}`),await e.rmdir(n)},Pn=async(e,{path:n,data:t})=>{t instanceof File&&(t=new Uint8Array(await t.arrayBuffer())),n.startsWith("/")||(Q.error(`
The writeFile() step in your Blueprint refers to a relative path.

Playground recently changed the working directory from '/' to '/wordpress' to better mimic 
how real web servers work. This means relative paths that used to work may no longer 
point to the correct location.

Playground automatically updated the path for you, but at one point path rewriting will be removed. Please
update your code to use an absolute path instead:

Instead of:  writeFile({ path: 'wordpress/wp-load.php', data: '<?php echo "Hello World!"; ?>' });
Use:         writeFile({ path: '/wordpress/wp-load.php', data: '<?php echo "Hello World!"; ?>' });

This will ensure your code works reliably regardless of the current working directory.
		`.trim()),n=`/${n}`),n.startsWith("/wordpress/wp-content/mu-plugins")&&!await e.fileExists("/wordpress/wp-content/mu-plugins")&&await e.mkdir("/wordpress/wp-content/mu-plugins"),await e.writeFile(n,t)},Ro=async(e,{writeToPath:n,filesTree:t})=>{n.startsWith("/")||(Q.error(`
The writeFiles() step in your Blueprint refers to a relative path.

Playground recently changed the working directory from '/' to '/wordpress' to better mimic 
how real web servers work. This means relative paths that used to work may no longer
point to the correct location.

Playground automatically updated the path for you, but at one point path rewriting will be removed. Please
update your code to use an absolute path instead:

Instead of:  writeFiles({ writeToPath: 'wordpress/wp-content/plugins/my-plugin', filesTree: { name: 'style.css': 'a { color: red; }' });
Use:         writeFiles({ writeToPath: '/wordpress/wp-content/plugins/my-plugin', filesTree: { name: 'style.css': 'a { color: red; }' });

This will ensure your code works reliably regardless of the current working directory.
		`.trim()),n=`/${n}`),await hn(e,n,t.files)},Si=async(e,{siteUrl:n})=>{await Sn(e,{consts:{WP_HOME:n,WP_SITEURL:n}})},Ao=async(e,{file:n,fetchAttachments:t=!0,rewriteUrls:r=!0,urlMapping:i={},importComments:s=!0,defaultAuthorUsername:a="admin",authorsMode:c="default-author",authorsMap:o={},importUsers:f=!1},d)=>{const h=a.trim()||"admin";await Co(e,n,d,{fetchAttachments:t,rewriteUrls:r,urlMapping:i,importComments:s,fallbackAuthorUsername:h,authorsMode:c,authorsMap:o,importUsers:f})};async function Co(e,n,t,r){t?.tracker?.setCaption("Importing content"),await Pn(e,{path:"/tmp/import.wxr",data:n}),await e.run({$_SERVER:{HTTPS:(await e.absoluteUrl).startsWith("https://")?"on":""},code:`<?php
	define('WP_LOAD_IMPORTERS', true);
	require 'wp-load.php';
	require 'wp-admin/includes/admin.php';

	/**
	 * Disable all kses filters to prevent content sanitization during import.
	 * It messes up Playground URL scheme by mangling transforming code such as:
	 *
	 *     <a href="/scope:kind-quiet-lake/index.php">Test</a>
	 *
	 * into:
	 *
	 *     <a href="kind-quiet-lake/index.php">Test</a>
	 */
	kses_remove_filters();

	// The WordPress importer assigns unmapped imported authors to the current
	// user, so set it to the requested fallback author before importing.
	$fallback_author_username = getenv('FALLBACK_AUTHOR_USERNAME');
	$fallback_author          = get_user_by('login', $fallback_author_username);
	if (!$fallback_author) {
		throw new Exception(
			sprintf('Could not find fallback WXR import author "%s".', $fallback_author_username)
		);
	}
	wp_set_current_user( $fallback_author->ID );

	$wp_import                  = new WP_Import();
	$import_data                = $wp_import->parse( getenv('IMPORT_FILE') );
	$authors_map                = json_decode(getenv('AUTHORS_MAP') ?: '{}', true);
	if (!is_array($authors_map)) {
		throw new Exception('Invalid WXR authors map payload.');
	}

	// Prepare the data to be used in process_author_mapping();
	$wp_import->get_authors_from_import( $import_data );
	$author_mapping_form = blueprint_prepare_wxr_author_mapping(
		$wp_import->authors,
		getenv('AUTHORS_MODE') ?: 'default-author',
		$authors_map,
		getenv('IMPORT_USERS') === 'true',
		(int) $fallback_author->ID
	);

	$url_mapping_payload = getenv('URL_MAPPING') ?: '{}';
	$url_mapping         = json_decode($url_mapping_payload, true);
	if (!is_array($url_mapping)) {
		throw new Exception(
			sprintf(
				'Invalid WXR URL mapping payload (%d bytes): %s.',
				strlen($url_mapping_payload),
				json_last_error_msg()
			)
		);
	}
	if (!empty($url_mapping) && getenv('REWRITE_URLS') === 'true') {
		add_filter('wp_import_post_data_raw', function($post) use ($url_mapping) {
			return blueprint_apply_wxr_url_mapping($post, $url_mapping);
		});
	}

	if (getenv('IMPORT_COMMENTS') === 'false') {
		add_filter('wp_import_post_comments', '__return_empty_array');
	}

	// We no longer need the original data, so unset to avoid using excess
	// memory.
	unset( $import_data );

	// Drive the import
	$wp_import->fetch_attachments = getenv('FETCH_ATTACHMENTS') === 'true';

	$_GET  = array(
		'import' => 'wordpress',
		'step'   => 2,
	);
	$_POST = array(
		'imported_authors'  => $author_mapping_form['imported_authors'],
		'user_map'          => $author_mapping_form['user_map'],
		'user_new'          => $author_mapping_form['user_new'],
		'fetch_attachments' => $wp_import->fetch_attachments,
	);

	$GLOBALS['wpcli_import_current_file'] = basename( $file );
	$wp_import->import( getenv('IMPORT_FILE'), [
		'rewrite_urls' => getenv('REWRITE_URLS') === 'true',
	] );

	/**
	 * Builds the importer form payload for WXR author assignment.
	 */
	function blueprint_prepare_wxr_author_mapping(
		array $authors,
		string $authors_mode,
		array $authors_map,
		bool $import_users,
		int $fallback_author_id
	): array {
		$imported_authors = array();
		$user_map         = array();
		$user_new         = array();

		foreach ($authors as $index => $author) {
			$remote_username = $author['author_login'] ?? '';
			if (!is_string($remote_username) || $remote_username === '') {
				continue;
			}

			$imported_authors[$index] = $remote_username;
			if (array_key_exists($remote_username, $authors_map)) {
				$user_map[$index] = blueprint_wxr_author_id_for_username(
					$authors_map[$remote_username],
					$remote_username
				);
				continue;
			}

			if ($authors_mode === 'map') {
				throw new Exception(
					sprintf('Missing local user mapping for WXR author "%s".', $remote_username)
				);
			}

			if ($authors_mode === 'create' && $import_users) {
				$user_new[$index] = $remote_username;
				continue;
			}

			$user_map[$index] = $fallback_author_id;
		}

		return array(
			'imported_authors' => $imported_authors,
			'user_map'         => $user_map,
			'user_new'         => $user_new,
		);
	}

	/**
	 * Finds the local user ID for an explicit WXR author map entry.
	 */
	function blueprint_wxr_author_id_for_username(string $local_username, string $remote_username): int {
		if ($local_username === '') {
			throw new Exception(
				sprintf('Invalid local user mapping for WXR author "%s".', $remote_username)
			);
		}

		$local_user = get_user_by('login', $local_username);
		if (!$local_user) {
			throw new Exception(
				sprintf(
					'Could not find local user "%s" mapped from WXR author "%s".',
					$local_username,
					$remote_username
				)
			);
		}
		return (int) $local_user->ID;
	}

	/**
	 * Applies explicit Blueprint URL replacements to parsed WXR data.
	 */
	function blueprint_apply_wxr_url_mapping($value, array $url_mapping) {
		if (is_string($value)) {
			return strtr($value, $url_mapping);
		}
		if (is_array($value)) {
			foreach ($value as $key => $item) {
				$value[$key] = blueprint_apply_wxr_url_mapping($item, $url_mapping);
			}
		}
		return $value;
	}
	`,env:{IMPORT_FILE:"/tmp/import.wxr",FETCH_ATTACHMENTS:r.fetchAttachments?"true":"false",REWRITE_URLS:r.rewriteUrls?"true":"false",URL_MAPPING:JSON.stringify(r.urlMapping),IMPORT_COMMENTS:r.importComments?"true":"false",FALLBACK_AUTHOR_USERNAME:r.fallbackAuthorUsername,AUTHORS_MODE:r.authorsMode,AUTHORS_MAP:JSON.stringify(r.authorsMap),IMPORT_USERS:r.importUsers?"true":"false"}})}const Ei=async(e,{themeSlug:n=""},t)=>{t?.tracker?.setCaption("Importing theme starter content");const r=await e.documentRoot;await e.run({code:`<?php

		/**
		 * Ensure that the customizer loads as an admin user.
		 *
		 * For compatibility with themes, this MUST be run prior to theme inclusion, which is why this is a plugins_loaded filter instead
		 * of running _wp_customize_include() manually after load.
		 */
		function importThemeStarterContent_plugins_loaded() {
			// Set as the admin user, this ensures we can customize the site.
			wp_set_current_user(
				get_users( [ 'role' => 'Administrator' ] )[0]
			);

			// Force the site to be fresh, although it should already be.
			add_filter( 'pre_option_fresh_site', '__return_true' );

			/*
			 * Simulate this request as the customizer loading with the current theme in preview mode.
			 *
			 * See _wp_customize_include()
			 */
			$_REQUEST['wp_customize']    = 'on';
			$_REQUEST['customize_theme'] = ${X(n)} ?: get_stylesheet();

			/*
			 * Claim this is a ajax request saving settings, to avoid the preview filters being applied.
			 */
			$_REQUEST['action'] = 'customize_save';
			add_filter( 'wp_doing_ajax', '__return_true' );

			$_GET = $_REQUEST;
		}
		playground_add_filter( 'plugins_loaded', 'importThemeStarterContent_plugins_loaded', 0 );

		require ${X(r)} . '/wp-load.php';

		// Return early if there's no starter content.
		if ( ! get_theme_starter_content() ) {
			return;
		}

		// Import the Starter Content.
		$wp_customize->import_theme_starter_content();

		// Publish the changeset, which publishes the starter content.
		wp_publish_post( $wp_customize->changeset_post_id() );
		`})},Io=["mu-plugins/sqlite-database-integration","mu-plugins/playground-includes","mu-plugins/0-playground.php","mu-plugins/0-sqlite.php"];async function pn(e,n){const t=[...Io],r=D(n,"db.php");return await e.fileExists(r)&&!await e.isDir(r)&&(await e.readFileAsText(r)).includes(Ms)&&t.push("db.php"),t}const Oo=["plugins/akismet","plugins/hello.php","plugins/wordpress-importer","themes/twentytwenty","themes/twentytwentyone","themes/twentytwentytwo","themes/twentytwentythree","themes/twentytwentyfour","themes/twentytwentyfive","themes/twentytwentysix"],Lo=async(e,{wordPressFilesZip:n,pathInZip:t=""},r)=>{const i=await e.documentRoot;r?.tracker.setCaption("Unpacking archive");const s=D("/tmp",`import-wordpress-files-${kt()}`);let a=!1,c=null;try{await e.mkdir(s);let d;r&&(d=({filesProcessed:l,totalFiles:p,uncompressedBytesProcessed:w,totalUncompressedBytes:v})=>{r.tracker.setCaption(`Extracting ${l}/${p}`);let T=l/Math.max(p,1);v>0&&(T=w/v),r.tracker.set(T*30)}),await gn(e,n,s,!0,d);let h=D(s,t);h=await qo(e,h)||h,r?.tracker.setCaption("Installing WordPress files"),r?.tracker.set(30);const m=D(h,"playground-export.json");let _=null;if(await e.fileExists(m))try{const l=await e.readFileAsText(m),p=JSON.parse(l);typeof p.siteUrl=="string"&&(c=p.siteUrl),typeof p.formatVersion=="number"&&(_=p.formatVersion),await e.unlink(m)}catch{}const k=D(h,"wp-content");if(await e.fileExists(k)){const l=D(i,"wp-content"),p=await pn(e,k),w=await pn(e,l);for(const v of p)await zt(e,D(k,v));for(const v of w){const T=D(k,v),x=D(l,v);!await e.fileExists(T)&&await e.fileExists(x)&&(await e.mkdir($t(T)),await e.cp(x,T))}if(_===null||_<2){for(const x of Oo){const g=D(k,x),y=D(l,x);!await e.fileExists(g)&&await e.fileExists(y)&&(await e.mkdir($t(g)),await e.cp(y,g))}const v=D(k,"database"),T=D(l,"database");!await e.fileExists(v)&&await e.fileExists(T)&&await e.cp(T,v)}}const u=await e.listFiles(h);a=u.length>0;for(const l of u)await zt(e,D(i,l)),await e.mv(D(h,l),D(i,l));a=!1}finally{a?Q.warn(`WordPress file import failed while replacing live files. The remaining staged files were preserved for recovery at ${s}.`):await zt(e,s)}r?.tracker.setCaption("Updating WordPress configuration"),r?.tracker.set(60),await Fs(e,i);const o=await e.absoluteUrl;c||(c=await No(e,i)),await Si(e,{siteUrl:o}),r?.tracker.setCaption("Upgrading the WordPress database"),r?.tracker.set(75);const f=X(D(i,"wp-admin","upgrade.php"));await e.run({code:`<?php
            $_GET['step'] = 'upgrade_db';
            require ${f};
            `}),c&&c!==o&&(r?.tracker.setCaption("Updating site URLs"),r?.tracker.set(90),await Uo(e,i,c,o)),r?.tracker.setCaption("WordPress files imported"),r?.tracker.finish()};function kr(e){const n=e.match(/\/scope:[^/]+\/?/);return n?n[0].replace(/\/?$/,"/"):null}async function Uo(e,n,t,r){const i=kr(t),s=kr(r);!i||!s||i!==s&&await e.run({code:`<?php
		require_once getenv('DOCUMENT_ROOT') . '/wp-load.php';
		global $wpdb;

		$old_scope = getenv('OLD_SCOPE');
		$new_scope = getenv('NEW_SCOPE');

		// Update URLs in posts content, excerpts, and GUIDs
		$wpdb->query($wpdb->prepare(
			"UPDATE {$wpdb->posts} SET post_content = REPLACE(post_content, %s, %s)",
			$old_scope, $new_scope
		));
		$wpdb->query($wpdb->prepare(
			"UPDATE {$wpdb->posts} SET post_excerpt = REPLACE(post_excerpt, %s, %s)",
			$old_scope, $new_scope
		));
		$wpdb->query($wpdb->prepare(
			"UPDATE {$wpdb->posts} SET guid = REPLACE(guid, %s, %s)",
			$old_scope, $new_scope
		));

		// Update URLs in post meta
		$wpdb->query($wpdb->prepare(
			"UPDATE {$wpdb->postmeta} SET meta_value = REPLACE(meta_value, %s, %s) WHERE meta_value LIKE %s",
			$old_scope, $new_scope, '%' . $wpdb->esc_like($old_scope) . '%'
		));

		// Update URLs in options (handles both regular and serialized data)
		$wpdb->query($wpdb->prepare(
			"UPDATE {$wpdb->options} SET option_value = REPLACE(option_value, %s, %s) WHERE option_value LIKE %s",
			$old_scope, $new_scope, '%' . $wpdb->esc_like($old_scope) . '%'
		));

		// Update URLs in user meta
		$wpdb->query($wpdb->prepare(
			"UPDATE {$wpdb->usermeta} SET meta_value = REPLACE(meta_value, %s, %s) WHERE meta_value LIKE %s",
			$old_scope, $new_scope, '%' . $wpdb->esc_like($old_scope) . '%'
		));

		// Update URLs in term meta
		$wpdb->query($wpdb->prepare(
			"UPDATE {$wpdb->termmeta} SET meta_value = REPLACE(meta_value, %s, %s) WHERE meta_value LIKE %s",
			$old_scope, $new_scope, '%' . $wpdb->esc_like($old_scope) . '%'
		));

		// Update URLs in comments
		$wpdb->query($wpdb->prepare(
			"UPDATE {$wpdb->comments} SET comment_content = REPLACE(comment_content, %s, %s) WHERE comment_content LIKE %s",
			$old_scope, $new_scope, '%' . $wpdb->esc_like($old_scope) . '%'
		));
		$wpdb->query($wpdb->prepare(
			"UPDATE {$wpdb->comments} SET comment_author_url = REPLACE(comment_author_url, %s, %s) WHERE comment_author_url LIKE %s",
			$old_scope, $new_scope, '%' . $wpdb->esc_like($old_scope) . '%'
		));
		`,env:{DOCUMENT_ROOT:n,OLD_SCOPE:i,NEW_SCOPE:s}})}async function No(e,n){const t=at({documentRoot:n});return(await e.run({code:`<?php
		require_once ${t.documentRoot} . '/wp-load.php';
		global $wpdb;
		$row = $wpdb->get_row("SELECT option_value FROM {$wpdb->options} WHERE option_name = 'siteurl'");
		echo $row ? $row->option_value : '';
		`})).text.trim()||null}const Wo=["wp-content","wp-admin","wp-includes","wp-config.php","wp-config-sample.php"];async function qo(e,n){if(await Sr(e,n))return n;const t=await e.listFiles(n);if(t.length!==1)return null;const r=D(n,t[0]);return await e.isDir(r)&&await Sr(e,r)?r:null}async function Sr(e,n){for(const t of Wo)if(await e.fileExists(D(n,t)))return!0;return!1}async function zt(e,n){await e.fileExists(n)&&(await e.isDir(n)?await e.rmdir(n):await e.unlink(n))}async function Do(e){const n=await e.request({url:"/wp-admin/export.php?download=true&content=all"});return new File([n.bytes],"export.xml")}const Ti=async(e,{zipFile:n,zipPath:t,extractToPath:r})=>{if(t)Q.warn('The "zipPath" option of the unzip() Blueprint step is deprecated and will be removed. Use "zipFile" instead.');else if(!n)throw new Error("Either zipPath or zipFile must be provided");await gn(e,n||t,r)};async function Pi(e,{targetPath:n,zipFile:t,ifAlreadyInstalled:r="overwrite",targetFolderName:i=""}){const a=t.name.replace(/\.zip$/,""),c=D(await e.documentRoot,"wp-content"),o=D(c,kt()),f=D(o,"assets",a);await e.fileExists(f)&&await e.rmdir(o,{recursive:!0}),await e.mkdir(o);try{await Ti(e,{zipFile:t,extractToPath:f});let d=await e.listFiles(f,{prependPath:!0});d=d.filter(u=>!u.endsWith("/__MACOSX"));const h=d.length===1&&await e.isDir(d[0]);let m,_="";h?(_=d[0],m=d[0].split("/").pop()):(_=f,m=a),i&&i.length&&(m=i);const k=`${n}/${m}`;if(await e.fileExists(k)){if(!await e.isDir(k))throw new Error(`Cannot install asset ${m} to ${k} because a file with the same name already exists. Note it's a file, not a directory! Is this by mistake?`);if(r==="overwrite")await e.rmdir(k,{recursive:!0});else{if(r==="skip")return{assetFolderPath:k,assetFolderName:m,installationStatus:"skipped-already-existed"};throw new Error(`Cannot install asset ${m} to ${n} because it already exists and the ifAlreadyInstalled option was set to ${r}`)}}return await e.mv(_,k),{assetFolderPath:k,assetFolderName:m,installationStatus:"installed"}}finally{await e.rmdir(o,{recursive:!0})}}const mn="PLAYGROUND_ACTIVATION_OPTIONS:",Mo=async(e,{pluginData:n,pluginZipFile:t,ifAlreadyInstalled:r,options:i={}},s)=>{t&&(n=t,Q.warn('The "pluginZipFile" option is deprecated. Use "pluginData" instead.'));let a="",c="",o="installed",f=!1;const d=()=>i.humanReadableName||c,h=async m=>{if(m.name.toLowerCase().endsWith(".zip"))return!0;const _=new Uint8Array(await m.arrayBuffer(),0,4);return _[0]===80&&_[1]===75&&_[2]===3&&_[3]===4};try{const m=D(await e.documentRoot,"wp-content","plugins"),_="targetFolderName"in i?i.targetFolderName:"";if(n instanceof File)if(await h(n)){const u=n.name.split("/").pop()||"plugin.zip";c=yi(u),s?.tracker.setCaption(`Installing the ${d()} plugin`);const l=await Pi(e,{ifAlreadyInstalled:r,zipFile:n,targetPath:`${await e.documentRoot}/wp-content/plugins`,targetFolderName:_});a=l.assetFolderPath,c=l.assetFolderName,o=l.installationStatus}else if(n.name.endsWith(".php")){const u=D(m,n.name);await Pn(e,{path:u,data:n}),a=u,c=n.name}else throw new Error("pluginData looks like a file but does not look like a .zip or .php file.");else if(n){c=n.name,s?.tracker.setCaption(`Installing the ${d()} plugin`);const u=D(m,_||n.name);a=u;let l=!0;if(await e.fileExists(u)){if(!await e.isDir(u))throw new Error(`Cannot install plugin ${c} to ${u} because a file with the same name already exists. Note it's a file, not a directory! Is this by mistake?`);if((r??"overwrite")==="skip")l=!1,o="skipped-already-existed";else if(r==="error")throw new Error(`Cannot install plugin ${c} to ${u} because it already exists and the ifAlreadyInstalled option was set to ${r}`)}l&&await hn(e,u,n.files,{rmRoot:!0})}if(f=!!a,"activate"in i?i.activate:!0){let u;i.activationOptions!==void 0&&(u=await Fo(e,a,i.activationOptions));try{await bi(e,{pluginPath:a,pluginName:d()},s)}finally{u&&await jo(e,u)}}return{assetPath:a,installationStatus:o}}catch(m){if(i.onError==="skip-plugin"){const _=d()||"unknown plugin";return Q.warn(`Skipping plugin installation for ${_} after failure: ${m instanceof Error?m.message:String(m)}`),f?{assetPath:a,installationStatus:o}:void 0}throw m}};async function Fo(e,n,t){const r=await e.documentRoot,i=await e.run({code:`<?php
ob_start();
define('WP_ADMIN', true);
require_once getenv('DOCROOT') . "/wp-load.php";
require_once getenv('DOCROOT') . "/wp-admin/includes/plugin.php";

$payload_prefix = getenv('ACTIVATION_OPTIONS_PAYLOAD_PREFIX');
$plugin_path = getenv('PLUGIN_PATH');
$plugin_file = '';
if (is_dir($plugin_path)) {
	foreach ((glob(rtrim($plugin_path, '/') . '/*.php') ?: array()) as $file) {
		$info = get_plugin_data($file, false, false);
		if (!empty($info['Name'])) {
			$plugin_file = $file;
			break;
		}
	}
} else {
	$plugin_dir = rtrim(WP_PLUGIN_DIR, '/');
	$plugin_file = $plugin_path;
	if (strpos($plugin_file, $plugin_dir . '/') !== 0 && file_exists($plugin_dir . '/' . $plugin_file)) {
		$plugin_file = $plugin_dir . '/' . $plugin_file;
	}
}

if (!$plugin_file || !file_exists($plugin_file)) {
	ob_end_clean();
	// Prefix the JSON payload so JS can find it even if plugin bootstrap
	// code prints notices or other output during this request.
	echo $payload_prefix . json_encode(array('error' => 'Could not find plugin file for activation options.'));
	exit;
}

$options_json = getenv('ACTIVATION_OPTIONS_JSON');
$options = json_decode($options_json ?: '', true);
if (!is_array($options)) {
	ob_end_clean();
	// Prefix the JSON payload so JS can find it even if plugin bootstrap
	// code prints notices or other output during this request.
	echo $payload_prefix . json_encode(array('error' => 'Could not decode plugin activation options.'));
	exit;
}
$option_name = 'blueprint_activation_' . plugin_basename($plugin_file);
update_option($option_name, $options);
ob_end_clean();
// Prefix the JSON payload so JS can find it even if plugin bootstrap
// code prints notices or other output during this request.
echo $payload_prefix . json_encode(array('optionName' => $option_name));
`,env:{DOCROOT:r,PLUGIN_PATH:n,ACTIVATION_OPTIONS_JSON:JSON.stringify(t),ACTIVATION_OPTIONS_PAYLOAD_PREFIX:mn}}),s=Ho(i.text);if(s?.error)throw new Error(String(s.error));if(!s?.optionName||typeof s.optionName!="string")throw new Error("Could not determine plugin activation options name.");return s.optionName}async function jo(e,n){await e.run({code:`<?php
require_once getenv('DOCROOT') . "/wp-load.php";
delete_option(getenv('OPTION_NAME'));
`,env:{DOCROOT:await e.documentRoot,OPTION_NAME:n}})}function Ho(e){const n=e||"",t=n.lastIndexOf(mn);if(t===-1)return;const r=n.slice(t+mn.length).trimStart().split(/\r?\n/,1)[0].trim();if(r)try{return JSON.parse(r)}catch{throw new Error("Could not parse plugin activation options payload.")}}const Bo=async(e,{themeData:n,themeZipFile:t,ifAlreadyInstalled:r,options:i={}},s)=>{t&&(n=t,Q.warn('The "themeZipFile" option is deprecated. Use "themeData" instead.'));const a=i.onError??"throw";let c="",o="",f="installed",d=!1;const h=()=>i.humanReadableName||o;try{const m="targetFolderName"in i?i.targetFolderName:"";let _="";if(n instanceof File){const l=n.name.split("/").pop()||"theme.zip";o=yi(l),s?.tracker.setCaption(`Installing the ${h()} theme`);const p=await Pi(e,{ifAlreadyInstalled:r,zipFile:n,targetPath:`${await e.documentRoot}/wp-content/themes`,targetFolderName:m});_=p.assetFolderName,c=p.assetFolderPath,f=p.installationStatus}else{if(o=n.name,_=m||o,!_||es(_)!==_)throw new Error("Theme folder name must be a single directory name.");s?.tracker.setCaption(`Installing the ${h()} theme`);const l=D(await e.documentRoot,"wp-content","themes",_);c=l;let p=!0;if(await e.fileExists(l)){if(!await e.isDir(l))throw new Error(`Cannot install theme ${_} to ${l} because a file with the same name already exists. Note it's a file, not a directory! Is this by mistake?`);if((r??"overwrite")==="skip")p=!1,f="skipped-already-existed";else if(r==="error")throw new Error(`Cannot install theme ${_} to ${l} because it already exists and the ifAlreadyInstalled option was set to ${r}`)}p&&await hn(e,l,n.files,{rmRoot:!0})}return d=!!c,("activate"in i?i.activate:!0)&&await vi(e,{themeFolderName:_},s),("importStarterContent"in i?i.importStarterContent:!1)&&await Ei(e,{themeSlug:_},s),{assetPath:c,installationStatus:f}}catch(m){if(a==="skip-theme"){const _=h()||"unknown theme";return Q.warn(`Skipping theme installation for ${_} after failure: ${m instanceof Error?m.message:String(m)}`),d?{assetPath:c,installationStatus:f}:void 0}throw m}},Go=async(e,{username:n="admin"}={},t)=>{t?.tracker.setCaption(t?.initialCaption||"Logging in"),e.defineConstant("PLAYGROUND_AUTO_LOGIN_AS_USER",n)},Yo=async(e,n,t)=>{t?.tracker?.setCaption("Resetting WordPress data");const r=await e.documentRoot,i=new Set(n.contentTypes??[]),s=n.contentTypes===void 0,a=[i.has("posts")?"post":void 0,i.has("pages")?"page":void 0].filter(f=>f!==void 0),c=s||i.has("posts"),o=i.has("comments");await e.run({env:{DOCROOT:r,PLAYGROUND_RESET_ALL_POST_TYPES:s?"1":"0",PLAYGROUND_RESET_POST_TYPES:JSON.stringify(a),PLAYGROUND_RESET_POSTS:c?"1":"0",PLAYGROUND_RESET_COMMENTS:s||o?"1":"0"},code:`<?php
		require getenv('DOCROOT') . '/wp-load.php';

		$remove_all_post_types = getenv('PLAYGROUND_RESET_ALL_POST_TYPES') === '1';
		$post_types = json_decode(getenv('PLAYGROUND_RESET_POST_TYPES'), true);
		if (!is_array($post_types)) {
			throw new RuntimeException('Invalid post types passed to resetData.');
		}

		if ($remove_all_post_types) {
			$post_ids = $wpdb->get_col(
				"SELECT ID FROM {$wpdb->posts} ORDER BY ID DESC"
			);
		} elseif (count($post_types) > 0) {
			$placeholders = implode(', ', array_fill(0, count($post_types), '%s'));
			$post_ids = $wpdb->get_col($wpdb->prepare(
				"SELECT ID FROM {$wpdb->posts} " .
				"WHERE post_type IN ($placeholders) ORDER BY ID DESC",
				...$post_types
			));
		} else {
			$post_ids = [];
		}

		foreach ($post_ids as $post_id) {
			wp_delete_post((int) $post_id, true);
		}

		// WordPress refreshes this cache before deleting the post row, so removing
		// the last published post leaves the cache set to true.
		if (getenv('PLAYGROUND_RESET_POSTS') === '1') {
			delete_option('wp_calendar_block_has_published_posts');
		}

		$remove_comments = getenv('PLAYGROUND_RESET_COMMENTS') === '1';
		if ($remove_comments) {
			$comment_ids = $wpdb->get_col(
				"SELECT comment_ID FROM {$wpdb->comments}"
			);
			foreach ($comment_ids as $comment_id) {
				wp_delete_comment((int) $comment_id, true);
			}
		}

		$reset_sequence_if_empty = static function($table_name) use ($wpdb) {
			$count = $wpdb->get_var("SELECT COUNT(*) FROM {$table_name}");
			if ((int) $count !== 0) {
				return;
			}
			if (isset($GLOBALS['@pdo'])) {
				$statement = $GLOBALS['@pdo']->prepare(
					'DELETE FROM SQLITE_SEQUENCE WHERE NAME = :table_name'
				);
				$statement->execute([':table_name' => $table_name]);
				return;
			}
			$wpdb->query("ALTER TABLE {$table_name} AUTO_INCREMENT = 1");
		};

		if ($remove_all_post_types || count($post_types) > 0) {
			$reset_sequence_if_empty($wpdb->posts);
			$reset_sequence_if_empty($wpdb->postmeta);
		}
		if ($remove_comments || $remove_all_post_types || count($post_types) > 0) {
			$reset_sequence_if_empty($wpdb->comments);
			$reset_sequence_if_empty($wpdb->commentmeta);
		}
		`})},Vo=async(e,{options:n})=>{await e.request({url:"/wp-admin/install.php?step=2",method:"POST",body:{language:"en",prefix:"wp_",weblog_title:"My WordPress Website",user_name:n.adminPassword||"admin",admin_password:n.adminPassword||"password",admin_password2:n.adminPassword||"password",Submit:"Install WordPress",pw_weak:"1",admin_email:"admin@localhost.com"}})},Zo=async e=>{const n="/tmp/wordpress-playground.zip",t="/tmp/playground-export.json",r=await e.documentRoot,i=D(r,"wp-content"),s=await e.absoluteUrl;await e.writeFile(t,new TextEncoder().encode(JSON.stringify({formatVersion:2,siteUrl:s})));const a={[t]:"playground-export.json",[D(r,"wp-config.php")]:"wp-config.php"},c=(await pn(e,i)).map(d=>D(i,d)),o=at({zipPath:n,wpContentPath:i,documentRoot:r,excludedPaths:c,additionalPaths:a});await Qo(e,`zipDir(${o.wpContentPath}, ${o.zipPath}, array(
			'exclude_paths' => ${o.excludedPaths},
			'zip_root'      => ${o.documentRoot},
			'additional_paths' => ${o.additionalPaths}
		));`);const f=await e.readFileAsBuffer(n);return e.unlink(n),e.unlink(t),f},Ko=`<?php

function zipDir($root, $output, $options = array())
{
    $root = rtrim($root, '/');
    $additionalPaths = array_key_exists('additional_paths', $options) ? $options['additional_paths'] : array();
    $excludePaths = array_key_exists('exclude_paths', $options) ? $options['exclude_paths'] : array();
    $zip_root = array_key_exists('zip_root', $options) ? $options['zip_root'] : $root;

    $zip = new ZipArchive;
    $res = $zip->open($output, ZipArchive::CREATE);
    if ($res === TRUE) {
        $directories = array(
            $root . '/'
        );
        while (sizeof($directories)) {
            $current_dir = array_pop($directories);

            if ($handle = opendir($current_dir)) {
                while (false !== ($entry = readdir($handle))) {
                    if ($entry == '.' || $entry == '..') {
                        continue;
                    }

                    $entry = join_paths($current_dir, $entry);
                    if (in_array($entry, $excludePaths)) {
                        continue;
                    }
                    if (is_dir($entry)) {
                        $directory_path = $entry . '/';
                        array_push($directories, $directory_path);
                    } else if (is_file($entry)) {
                        // ensure compliance with zip spec by only using relative paths for files
                        $zip->addFile($entry, ltrim(substr($entry, strlen($zip_root)), '/'));
                    }
                }
                closedir($handle);
            }
        }
        foreach ($additionalPaths as $disk_path => $zip_path) {
            $zip->addFile($disk_path, $zip_path);
        }
        $zip->close();
        chmod($output, 0777);
    }
}

function join_paths()
{
    $paths = array();

    foreach (func_get_args() as $arg) {
        if ($arg !== '') {
            $paths[] = $arg;
        }
    }

    return preg_replace('#/+#', '/', join('/', $paths));
}
`;async function Qo(e,n){return await e.run({code:Ko+n})}const Jo=async(e,n)=>{const i=(await(await fetch(`https://api.wordpress.org/translations/core/1.0/?version=${e}`)).json()).translations.find(s=>s.language.toLowerCase()===n.toLowerCase());if(!i)throw new Error(`Failed to get ${n} translation package for WordPress ${e}.`);return i.package},Xo=async(e,{language:n},t)=>{t?.tracker.setCaption(t?.initialCaption||"Translating");const r=await e.documentRoot;await e.defineConstant("WPLANG",n),await e.run({code:`<?php
		require_once ${X(r)} . '/wp-load.php';
		update_option('WPLANG', ${X(n)});
		`});const i=(await e.run({code:`<?php
			require '${r}/wp-includes/version.php';
			echo $wp_version;
		`})).text,s=[{url:await Jo(i,n),type:"core"}],c=(await e.run({code:`<?php
		require_once('${r}/wp-load.php');
		require_once('${r}/wp-admin/includes/plugin.php');
		echo json_encode(
			array_values(
				array_map(
					function($plugin) {
						return [
							'slug'    => $plugin['TextDomain'],
							'version' => $plugin['Version']
						];
					},
					array_filter(
						get_plugins(),
						function($plugin) {
							return !empty($plugin['TextDomain']);
						}
					)
				)
			)
		);`})).json;for(const{slug:m,version:_}of c)s.push({url:`https://downloads.wordpress.org/translation/plugin/${m}/${_}/${n}.zip`,type:"plugin"});const f=(await e.run({code:`<?php
		require_once('${r}/wp-load.php');
		require_once('${r}/wp-admin/includes/theme.php');
		echo json_encode(
			array_values(
				array_map(
					function($theme) {
						return [
							'slug'    => $theme->get('TextDomain'),
							'version' => $theme->get('Version')
						];
					},
					wp_get_themes()
				)
			)
		);`})).json;for(const{slug:m,version:_}of f)s.push({url:`https://downloads.wordpress.org/translation/theme/${m}/${_}/${n}.zip`,type:"theme"});await e.isDir(`${r}/wp-content/languages/plugins`)||await e.mkdir(`${r}/wp-content/languages/plugins`),await e.isDir(`${r}/wp-content/languages/themes`)||await e.mkdir(`${r}/wp-content/languages/themes`);const d=new It({concurrency:5}),h=s.map(({url:m,type:_})=>d.run(async()=>{try{const k=await fetch(m);if(!k.ok)throw new Error(`Failed to download translations for ${_}: ${k.statusText}`);let u=`${r}/wp-content/languages`;_==="plugin"?u+="/plugins":_==="theme"&&(u+="/themes"),await gn(e,new File([await k.arrayBuffer()],`${n}-${_}.zip`),u)}catch(k){if(_==="core")throw new Error(`Failed to download translations for WordPress. Please check if the language code ${n} is correct. You can find all available languages and translations on https://translate.wordpress.org/.`);Q.warn(`Error downloading translations for ${_}: ${k}`)}}));await Promise.all(h)};var zo=Object.freeze({__proto__:null,activatePlugin:bi,activateTheme:vi,assertWpCli:Tn,cp:So,defaultWpCliPath:En,defaultWpCliResource:bo,defineSiteUrl:Si,defineWpConfigConsts:Sn,enableMultisite:ko,exportWXR:Do,importThemeStarterContent:Ei,importWordPressFiles:Lo,importWxr:Ao,installPlugin:Mo,installTheme:Bo,login:Go,mkdir:To,mv:Eo,request:go,resetData:Yo,rm:un,rmdir:Po,runPHP:mo,runPHPWithOptions:ho,runSql:wo,runWpInstallationWizard:Vo,setSiteLanguage:Xo,setSiteOptions:$i,unzip:Ti,updateUserMeta:yo,wpCLI:ki,writeFile:Pn,writeFiles:Ro,zipWpContent:Zo});const{wpCLI:Ic,...Er}=zo;({...Er,importFile:Er.importWxr});const ve={},Ri=5*60*1e3,ec=5*60*1e3;function tc(e){const n=e.data;if(typeof n!="object"||n===null||!("type"in n))return!1;if(n.type==="remote-access-relay-map"){const{scope:t,sessionId:r,ttl:i}=n;if(typeof t!="string"||typeof r!="string")return!0;const s=ve[t],a=nc(i);return ve[t]={scope:t,sessionId:r,clientId:rc(e),cookies:s?.cookies,interceptedRequests:s?.interceptedRequests??0,lastInterceptedPath:s?.lastInterceptedPath,expiresAt:Date.now()+a},e.ports[0]?.postMessage({type:"remote-access-relay-map-result",ok:!0,clientId:ve[t].clientId}),!0}if(n.type==="remote-access-relay-clear"){const{scope:t}=n;return typeof t=="string"&&delete ve[t],!0}return!1}function nc(e){return typeof e!="number"||!Number.isFinite(e)?Ri:Math.min(Math.max(e,1),ec)}function rc(e){const n=e.source;if(n&&"id"in n&&typeof n.id=="string")return n.id}function Ai(e){const n=ve[e];if(n){if(n.expiresAt<=Date.now()){delete ve[e];return}return n}}function ic(e,n){const t=n.searchParams.get("remote-access-view");if(!t)return;const r=ve[e];return ve[e]={scope:e,sessionId:t,clientId:r?.clientId,cookies:r?.cookies,interceptedRequests:r?.interceptedRequests??0,lastInterceptedPath:r?.lastInterceptedPath,expiresAt:Date.now()+Ri},ve[e]}function sc(e,n){const t=Ai(e);return!t||t.sessionId!==n?new Response(JSON.stringify({ok:!1,scope:e,hasMapping:!1,clientId:null,interceptedRequests:0,lastInterceptedPath:null}),{status:404,headers:{"Content-Type":"application/json","X-Remote-Access-Service-Worker":"1"}}):new Response(JSON.stringify({ok:!0,scope:e,hasMapping:!0,clientId:t.clientId,interceptedRequests:t.interceptedRequests,lastInterceptedPath:t.lastInterceptedPath??null}),{headers:{"Content-Type":"application/json","X-Remote-Access-Service-Worker":"1"}})}async function ac(e,n){const t=crypto.randomUUID(),r=vt(new URL(e.request.url)),i=`${r.pathname}${r.search}`;n.interceptedRequests+=1,n.lastInterceptedPath=`${e.request.method} ${i}`;const s=await yc(e.request),a=bc(e.request.headers);hc(n,a);const c=await vc(n,{type:"remote-access-relay-request",sessionId:n.sessionId,requestId:t,method:e.request.method,path:i,headers:a,body:s});return _c(n,c.cookies),oc(e.request.url,n,c)}function oc(e,n,t){const r=new Headers(t.headers);cc(r);const i=r.get("location");if(gc(t.status)&&i){let a=new URL(i,e);return be(a)||(a=tt(a,n.scope)),Response.redirect(a.toString(),t.status)}const s=xc(t.status)?null:lc(e,n,r,t.body);return new Response(s,{status:t.status,headers:r})}function cc(e){for(const n of["connection","content-length","keep-alive","transfer-encoding"])e.delete(n)}function lc(e,n,t,r){if(!r)return new Uint8Array;if(!fc(t))return r;const i=new TextDecoder().decode(r);return new TextEncoder().encode(dc(e,n,i))}function fc(e){return e.get("content-type")?.toLowerCase().includes("text/html")??!1}function dc(e,n,t){return t.replace(/\b(href|src|action)=("|')([^"']*)\2/gi,(r,i,s,a)=>{const c=uc(e,n,a);return c?`${i}=${s}${c}${s}`:r})}function uc(e,n,t){if(t===""||t.startsWith("#")||t.startsWith("mailto:")||t.startsWith("tel:")||t.startsWith("javascript:"))return null;const r=new URL(e),i=new URL(t,r);return i.origin!==r.origin?null:be(i)?pc(t)||mc(t)?null:i.toString():tt(i,n.scope).toString()}function pc(e){return e.startsWith("/")}function mc(e){return/^[a-z][a-z\d+.-]*:/i.test(e)||e.startsWith("//")}function hc(e,n){const t=Object.entries(e.cookies||{});if(t.length===0)return;const r=t.map(([i,s])=>`${i}=${s}`).join("; ");n.cookie=n.cookie?`${n.cookie}; ${r}`:r}function _c(e,n){if(n?.length){e.cookies??={};for(const t of n){const r=wc(t);r&&(r.expires?delete e.cookies[r.name]:e.cookies[r.name]=r.value)}}}function wc(e){const[n,...t]=e.split(";"),r=n.indexOf("=");if(r<=0)return null;const i=n.slice(0,r).trim(),s=n.slice(r+1).trim();if(!i)return null;const a=t.some(c=>{const o=c.trim().toLowerCase();if(o==="max-age=0")return!0;if(!o.startsWith("expires="))return!1;const f=Date.parse(c.slice(c.indexOf("=")+1));return Number.isFinite(f)&&f<=Date.now()});return{name:i,value:s,expires:a}}function gc(e){return[301,302,303,307,308].includes(e)}function xc(e){return[101,103,204,205,304].includes(e)}async function yc(e){if(e.method==="GET"||e.method==="HEAD")return;const n=await e.clone().arrayBuffer();if(n.byteLength!==0)return new Uint8Array(n)}function bc(e){const n={};return e.forEach((t,r)=>{n[r]=t}),n}async function vc(e,n){const t=self,r=e.clientId?await t.clients.get(e.clientId):void 0;if(r)return Tr(r,n);const s=(await t.clients.matchAll({type:"window",includeUncontrolled:!0})).find(a=>{try{const c=new URL(a.url);return c.searchParams.get("share")===e.sessionId||c.pathname.startsWith("/connect")&&!c.pathname.startsWith("/scope:")}catch{return!1}});if(!s)throw new Error("Remote access page is not available");return Tr(s,n)}function Tr(e,n){const t=new MessageChannel,r=new Promise((i,s)=>{const a=setTimeout(()=>{s(new Error("Remote access relay request timed out"))},3e4);t.port1.onmessage=c=>{clearTimeout(a);const o=c.data;if(o?.type==="remote-access-relay-response"){i(o.response);return}s(new Error(o?.error||"Remote access relay request failed"))}});return e.postMessage(n,[t.port2]),r}self.document||(self.document={});self.addEventListener("message",e=>{tc(e)});self.addEventListener("install",e=>{e.waitUntil(self.skipWaiting())});self.addEventListener("activate",function(e){async function n(){await self.clients.claim(),an(new URL(location.href))&&(await Js(),Qs())}e.waitUntil(n())});function $c(e){return/^bytes=[1-9]\d*-$/.test(e.headers.get("range")??"")}self.addEventListener("fetch",e=>{if(!Yr())return;const n=new URL(e.request.url);if(n.pathname.startsWith(self.location.pathname)||n.pathname.startsWith("/plugin-proxy")||n.pathname.startsWith("/client/index.js")||n.pathname.startsWith("/relay/")||n.pathname.startsWith("/@fs/"))return;const r=n.searchParams.has("playground-site-thumbnail-module")&&(n.pathname==="/src/lib/capture-site-thumbnail.ts"||/^\/capture-site-thumbnail-[A-Za-z0-9_-]+\.js$/.test(n.pathname)),i=e.request.destination==="worker"&&n.searchParams.has("playground-site-thumbnail-worker");if(r||i)return e.respondWith(an(n)?jn(e.request):fetch(e.request));if(be(n)){const a=et(n);if(n.searchParams.has("remote-access-probe"))return e.respondWith(sc(a,n.searchParams.get("remote-access-probe")));const c=Ai(a)||ic(a,n);return c?e.respondWith(ac(e,c).then(Pr)):e.respondWith(kc(e,a).then(Pr))}let s;try{s=new URL(e.request.referrer)}catch{}if(s&&be(s)){if(n.origin!==s.origin)return;const a=et(s),c=tt(e.request.url,a);return e.respondWith(Response.redirect(c))}if(n.origin===self.location.origin){if(n.pathname==="/blueprints-index.json")return e.respondWith(Ks());if(n.pathname.startsWith("/proxy/"))return e.respondWith(new Response("Not found",{status:404}))}if(an(new URL(e.request.url))){if(n.pathname==="/remote.html"||n.pathname==="/remote"||n.pathname==="/api.html"||n.pathname==="/"){e.respondWith(Zs(e.request));return}if($c(e.request)){e.respondWith(fetch(e.request));return}return e.respondWith(jn(e.request))}});async function kc(e,n){const t=new URL(e.request.url),r=vt(t);if(t.pathname.endsWith("/wp-includes/empty.html"))return Tc(t.searchParams.get("cross-origin-isolated")==="1");const i=await Ls(e);if(i.status===404&&i.headers.get("x-backfill-from")==="remote-host"){const{staticAssetsDirectory:s}=await Pc(n);if(!s){const f=i.clone();return f.headers.delete("x-backfill-from"),f}const a=new URL(e.request.url),c=vt(a);c.pathname=ss(c.pathname,Bs),!c.pathname.startsWith("/@fs")&&!c.pathname.startsWith("/assets")&&(c.pathname=`/${s}${c.pathname}`);const o=await Us(e.request,{url:c,credentials:"omit"});return fetch(o).catch(f=>{if(f?.name==="TypeError")return new Promise(d=>{setTimeout(()=>d(fetch(o)),Math.random()*1500)});throw f})}if(r.pathname.endsWith("/block-editor.js")||r.pathname.endsWith("/block-editor.min.js")||r.pathname.endsWith("/block-editor/index.js")||r.pathname.endsWith("/block-editor/index.min.js")){const s=await i.text(),a=`${Sc} ${s.replace(/\(\s*"iframe",/,"(__playground_ControlledIframe,")}`;return new Response(a,{status:i.status,statusText:i.statusText,headers:i.headers})}return i}Qi(self);const Sc=`
window.__playground_ControlledIframe = window.wp.element.forwardRef(function (props, ref) {
	const source = window.wp.element.useMemo(function () {
		// The editor can only access the preview's DOM when both use the same
		// isolation. The URL tells empty.html whether the editor is isolated, so
		// the service worker doesn't need to remember it across restarts.
		const emptyHtmlUrl =
			'/wp-includes/empty.html' +
			(window.crossOriginIsolated ? '?cross-origin-isolated=1' : '');
		if (props.srcDoc) {
			// WordPress <= 6.2 uses a srcDoc that only contains a doctype.
			return emptyHtmlUrl;
		} else if (props.src && props.src.startsWith('blob:')) {
			// WordPress 6.3+ uses a blob URL with doctype and a list of static assets.
			// Pass the blob URL – never the document content – to empty.html, which
			// fetches and renders it itself. Only same-origin blob: URLs are honored.
			return emptyHtmlUrl + '#' + encodeURIComponent(props.src);
		} else {
			// Other URLs need no correction.
			return props.src;
		}
	}, [props.src, props.srcDoc]);
	const iframeRef = window.wp.compose.useMergeRefs([
		ref,
		source === props.src ? null : __playground_skipCredentialless,
	]);
	return (
		window.wp.element.createElement('iframe', {
			...props,
			ref: iframeRef,
			src: source,
			// Make sure there's no srcDoc, as it would interfere with the src.
			srcDoc: undefined
		})
	)
});

// Gutenberg 22.4–22.7 adds the "credentialless" attribute to every iframe in a
// cross-origin isolated editor, except the editor's own iframes, like the canvas.
// It recognizes those because their src starts with "blob:". Playground changes
// that src to /wp-includes/empty.html, so Gutenberg adds the attribute to them too.
// Chromium doesn't let the service worker control a credentialless iframe, so
// the canvas would stay blank.
//
// To prevent that, the iframe claims it already has the attribute. Gutenberg
// then leaves it alone. The attribute isn't really there, so the browser still
// loads the iframe through the service worker.
function __playground_skipCredentialless(iframe) {
	if (iframe) {
		iframe.hasAttribute = function (name) {
			return (
				name === 'credentialless' ||
				Element.prototype.hasAttribute.call(this, name)
			);
		};
	}
}`,Ec=`
	const hash = window.location.hash.substring(1);
	if (hash) {
		let url;
		try {
			url = new URL(decodeURIComponent(hash));
		} catch (e) {}
		if (
			url &&
			url.protocol === 'blob:' &&
			url.origin === window.location.origin
		) {
			try {
				const xhr = new XMLHttpRequest();
				xhr.open('GET', url.href, false);
				xhr.overrideMimeType('text/plain;charset=utf-8');
				xhr.send();
				document.write(xhr.responseText);
			} catch (e) {}
		}
	}
`;function Tc(e){const n={"content-type":"text/html"};return e&&(n["Document-Isolation-Policy"]="isolate-and-credentialless"),new Response("<!doctype html><script>"+Ec+"<\/script>",{status:200,headers:n})}const en={};async function Pc(e){if(!en[e]){const n=await jr({method:"getWordPressModuleDetails"},e);en[e]=await Fr(self,n)}return en[e]}function Pr(e){if(e.headers.has("document-isolation-policy"))return e;const n=e.headers.get("cross-origin-embedder-policy");if(n!=="require-corp"&&n!=="credentialless")return e;const t=n==="require-corp"?"isolate-and-require-corp":"isolate-and-credentialless",r=new Headers(e.headers);return r.delete("cross-origin-embedder-policy"),r.delete("cross-origin-opener-policy"),r.set("document-isolation-policy",t),new Response(e.body,{status:e.status,statusText:e.statusText,headers:r})}
//# sourceMappingURL=sw.js.map
