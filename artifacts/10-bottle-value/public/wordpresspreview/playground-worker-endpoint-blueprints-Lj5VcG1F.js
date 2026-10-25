import{j as jspi}from"./assets/wasm-feature-detect-DUYnTGBd.js";const logEventType="playground-log",logEvent=(n,...t)=>{logger.dispatchEvent(new CustomEvent(logEventType,{detail:{log:n,args:t}}))},logToConsole=(n,...t)=>{switch(typeof n.message=="string"?Reflect.set(n,"message",prepareLogMessage(n.message)):n.message.message&&typeof n.message.message=="string"&&Reflect.set(n.message,"message",prepareLogMessage(n.message.message)),n.severity){case LogSeverity.Debug:console.debug(n.message,...t);break;case LogSeverity.Info:console.info(n.message,...t);break;case LogSeverity.Warn:console.warn(n.message,...t);break;case LogSeverity.Error:console.error(n.message,...t);break;case LogSeverity.Fatal:console.error(n.message,...t);break;default:console.log(n.message,...t)}},prepareLogMessage$1=n=>n instanceof Error?[n.message,n.stack].join(`
`):JSON.stringify(n,null,2),logs=[],addToLogArray=n=>{logs.push(n)},logToMemory=n=>{if(n.raw===!0)addToLogArray(n.message);else{const t=formatLogEntry(typeof n.message=="object"?prepareLogMessage$1(n.message):n.message,n.severity,n.prefix??LogPrefix.JS);addToLogArray(t)}},LogSeverity={Fatal:{},Error:{name:"error",level:1},Warn:{name:"warn",level:2},Log:{name:"log",level:3},Info:{name:"info",level:4},Debug:{name:"debug",level:5}},LogPrefix={JS:"JavaScript"};class Logger extends EventTarget{constructor(t=[]){super(),this.fatalErrorEvent="playground-fatal-error",this.severity=LogSeverity.Info,this.handlers=t}getLogs(){return this.handlers.includes(logToMemory)?[...logs]:(this.error(`Logs aren't stored because the logToMemory handler isn't registered.
				If you're using a custom logger instance, make sure to register logToMemory handler.
			`),[])}logMessage(t,...r){const s={...t,severity:t.severity??LogSeverity.Log};for(const i of this.handlers)s.severity.level<=this.severity.level&&i(s,...r)}setSeverityFilterLevel(t){this.severity=t}log(t,...r){this.logMessage({message:t,severity:LogSeverity.Log,prefix:LogPrefix.JS,raw:!1},...r)}debug(t,...r){this.logMessage({message:t,severity:LogSeverity.Debug,prefix:LogPrefix.JS,raw:!1},...r)}info(t,...r){this.logMessage({message:t,severity:LogSeverity.Info,prefix:LogPrefix.JS,raw:!1},...r)}warn(t,...r){this.logMessage({message:t,severity:LogSeverity.Warn,prefix:LogPrefix.JS,raw:!1},...r)}error(t,...r){this.logMessage({message:t,severity:LogSeverity.Error,prefix:LogPrefix.JS,raw:!1},...r)}}const getDefaultHandlers=()=>{try{}catch{}return[logToMemory,logToConsole,logEvent]},logger=new Logger(getDefaultHandlers()),prepareLogMessage=n=>n.replace(/\t/g,""),formatLogEntry=(n,t,r)=>{const s=new Date,i=new Intl.DateTimeFormat("en-GB",{year:"numeric",month:"short",day:"2-digit",timeZone:"UTC"}).format(s).replace(/ /g,"-"),a=new Intl.DateTimeFormat("en-GB",{hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:!1,timeZone:"UTC",timeZoneName:"short"}).format(s),o=i+" "+a;return n=prepareLogMessage(n),`[${o}] ${r} ${t.name}: ${n}`},FALLBACK_FILE_SIZE=5*1024*1024;class EmscriptenDownloadMonitor extends EventTarget{#e={};#t={};expectAssets(t){for(const[r,s]of Object.entries(t)){const i="http://example.com/",o=new URL(r,i).pathname.split("/").pop();o in this.#e||(this.#e[o]=s),o in this.#t||(this.#t[o]=0)}}async monitorFetch(t){const r=await t;return cloneResponseMonitorProgress(r,i=>{this.#s(r.url,i.detail.loaded,i.detail.total)})}#s(t,r,s){const i=new URL(t,"http://example.com").pathname.split("/").pop();s?i in this.#e||(this.#e[i]=s,this.#t[i]=r):s=this.#e[i],i in this.#t||logger.warn(`Registered a download #progress of an unregistered file "${i}". This may cause a sudden **decrease** in the #progress percentage as the length number of bytes increases during the download.`),this.#t[i]=r,this.dispatchEvent(new CustomEvent("progress",{detail:{loaded:sumValues(this.#t),total:sumValues(this.#e),fileName:i,fileLoaded:r,fileTotal:s}}))}}function sumValues(n){return Object.values(n).reduce((t,r)=>t+r,0)}function cloneResponseMonitorProgress(n,t){const r=n.headers.get("content-length")||"",s=parseInt(r,10)||FALLBACK_FILE_SIZE;return new Response(cloneStreamMonitorProgress(n.body,s,t),{status:n.status,statusText:n.statusText,headers:n.headers})}function cloneStreamMonitorProgress(n,t,r){let s=0;function i(a,o,l){const u=performance.now();!l&&u-s<500||(s=u,r(new CustomEvent("progress",{detail:{loaded:a,total:o}})))}return new ReadableStream({async start(a){if(!n){a.close();return}const o=n.getReader();let l=0;for(;;)try{const{done:u,value:c}=await o.read();if(c&&(l+=c.byteLength),u){i(l,l,u),a.close();break}else i(l,t,u),a.enqueue(c)}catch(u){logger.error({e:u}),a.error(u);break}}})}class ErrnoError extends Error{constructor(t,r,s){super(r,s),this.name="ErrnoError",this.errno=t}}const FileErrorCodes={0:"No error occurred. System call completed successfully.",1:"Argument list too long.",2:"Permission denied.",3:"Address in use.",4:"Address not available.",5:"Address family not supported.",6:"Resource unavailable, or operation would block.",7:"Connection already in progress.",8:"Bad file descriptor.",9:"Bad message.",10:"Device or resource busy.",11:"Operation canceled.",12:"No child processes.",13:"Connection aborted.",14:"Connection refused.",15:"Connection reset.",16:"Resource deadlock would occur.",17:"Destination address required.",18:"Mathematics argument out of domain of function.",19:"Reserved.",20:"File exists.",21:"Bad address.",22:"File too large.",23:"Host is unreachable.",24:"Identifier removed.",25:"Illegal byte sequence.",26:"Operation in progress.",27:"Interrupted function.",28:"Invalid argument.",29:"I/O error.",30:"Socket is connected.",31:"There is a directory under that path.",32:"Too many levels of symbolic links.",33:"File descriptor value too large.",34:"Too many links.",35:"Message too large.",36:"Reserved.",37:"Filename too long.",38:"Network is down.",39:"Connection aborted by network.",40:"Network unreachable.",41:"Too many files open in system.",42:"No buffer space available.",43:"No such device.",44:"There is no such file or directory OR the parent directory does not exist.",45:"Executable file format error.",46:"No locks available.",47:"Reserved.",48:"Not enough space.",49:"No message of the desired type.",50:"Protocol not available.",51:"No space left on device.",52:"Function not supported.",53:"The socket is not connected.",54:"Not a directory or a symbolic link to a directory.",55:"Directory not empty.",56:"State not recoverable.",57:"Not a socket.",58:"Not supported, or operation not supported on socket.",59:"Inappropriate I/O control operation.",60:"No such device or address.",61:"Value too large to be stored in data type.",62:"Previous owner died.",63:"Operation not permitted.",64:"Broken pipe.",65:"Protocol error.",66:"Protocol not supported.",67:"Protocol wrong type for socket.",68:"Result too large.",69:"Read-only file system.",70:"Invalid seek.",71:"No such process.",72:"Reserved.",73:"Connection timed out.",74:"Text file busy.",75:"Cross-device link.",76:"Extension: Capabilities insufficient."};function getEmscriptenFsError(n){const t=typeof n=="object"?n?.errno:null;if(t in FileErrorCodes)return FileErrorCodes[t]}function rethrowFileSystemError(n=""){return function(r){return function(...s){try{return r.apply(this,s)}catch(i){const a=typeof i=="object"?i?.errno:null;if(a in FileErrorCodes){const o=FileErrorCodes[a],l=typeof s[1]=="string"?s[1]:null,u=l!==null?n.replaceAll("{path}",l):n;throw new ErrnoError(a,`${u}: ${o}`,{cause:i})}throw i}}}}const SleepFinished=Symbol("SleepFinished");function sleep(n){return new Promise(t=>{setTimeout(()=>t(SleepFinished),n)})}class AcquireTimeoutError extends Error{constructor(){super("Acquiring lock timed out")}}class Semaphore{constructor({concurrency:t,timeout:r}){this._running=0,this.concurrency=t,this.timeout=r,this.queue=[]}get remaining(){return this.concurrency-this.running}get running(){return this._running}async acquire(){if(this._running>=this.concurrency){const r=new Promise(s=>{this.queue.push(s)});if(this.timeout!==void 0){const s=this.queue.at(-1);if(await Promise.race([r,sleep(this.timeout)])===SleepFinished)throw this.queue.splice(this.queue.indexOf(s),1),new AcquireTimeoutError}else await r}this._running++;let t=!1;return()=>{t||(t=!0,this._running--,this.queue.length>0&&this.queue.shift()())}}async run(t){const r=await this.acquire();try{return await t()}finally{r()}}}function joinPaths(...n){function t(a){return a.substring(a.length-1)==="/"}let r=n.join("/");const s=r[0]==="/",i=t(r);return r=normalizePath$1(r),!r&&!s&&(r="."),r&&i&&!t(r)&&(r+="/"),r}function resolvePathUnder(n,t){if(n.includes("\0")||t.includes("\0"))return;const r=normalizePath$1(t);if(!r)return;const s=normalizePath$1(n.startsWith("/")?n:joinPaths(r,n));if(!(s===r||!isParentOf(r,s)))return s}function dirname(n){if(n==="/")return"/";n=normalizePath$1(n);const t=n.lastIndexOf("/");return t===-1?"":t===0?"/":n.substr(0,t)}function basename(n){if(n==="/")return"/";n=normalizePath$1(n);const t=n.lastIndexOf("/");return t===-1?n:n.substr(t+1)}function normalizePath$1(n){const t=n[0]==="/";return n=normalizePathsArray(n.split("/").filter(r=>!!r),!t).join("/"),(t?"/":"")+n.replace(/\/$/,"")}function normalizePathsArray(n,t){let r=0;for(let s=n.length-1;s>=0;s--){const i=n[s];i==="."?n.splice(s,1):i===".."?(n.splice(s,1),r++):r&&(n.splice(s,1),r--)}if(t)for(;r;r--)n.unshift("..");return n}function isParentOf(n,t){return n==="/"?!0:(n=normalizePath$1(n),t=normalizePath$1(t),t.startsWith(n+"/")||t===n)}class EventEmitterPolyfill{constructor(){this.listeners={}}emit(t,r){this.listeners[t]&&this.listeners[t].forEach(function(s){s(r)})}on(t,r){this.listeners[t]||(this.listeners[t]=[]),this.listeners[t].push(r)}once(t,r){const s=(...i)=>{this.off(t,s),r(...i)};this.on(t,s)}off(t,r){this.listeners[t]&&(this.listeners[t]=this.listeners[t].filter(s=>s!==r))}}function splitShellCommand$1(n){let s=0,i="";const a=[];let o="";for(let l=0;l<n.length;l++){const u=n[l];u==="\\"?((n[l+1]==='"'||n[l+1]==="'")&&l++,o+=n[l]):s===0?u==='"'||u==="'"?(s=1,i=u):u.match(/\s/)?(o.trim().length&&a.push(o.trim()),o=u):a.length&&!o?o=a.pop()+u:o+=u:s===1&&(u===i?(s=0,i=""):o+=u)}return o&&a.push(o.trim()),a}class WritablePolyfill extends EventEmitterPolyfill{constructor(t){if(super(),this.buffer=[],this.writing=!1,this.ended=!1,this.length=0,!t.write)throw new Error("WritablePolyfill requires write option");this._write=t.write,this.highWaterMark=t.highWaterMark??16*1024,this.decodeStrings=t.decodeStrings??!0,this.defaultEncoding=t.defaultEncoding??"utf8",this.defer=typeof queueMicrotask=="function"?queueMicrotask:r=>setTimeout(r,0)}write(t,r=this.defaultEncoding,s=()=>{}){if(typeof r=="function"&&(s=r,r=this.defaultEncoding),this.ended){const a=new Error("write after end"),o=this.defer;return o(()=>s(a)),this.emit("error",a),!1}if(this.decodeStrings&&typeof t=="string"){if(typeof Buffer<"u"&&typeof Buffer.from=="function")t=Buffer.from(t,r);else if(typeof TextEncoder<"u")t=new TextEncoder().encode(t);else throw new Error("String chunks are not supported in this environment: Buffer and TextEncoder are unavailable.");r="buffer"}this.length+=t.length??1;const i=this.length>=this.highWaterMark;return this.buffer.push({chunk:t,encoding:r,cb:s}),this.writing||this._clearBuffer(),!i}end(t,r,s){typeof t=="function"?(s=t,t=void 0):typeof r=="function"&&(s=r,r=void 0),t!==void 0&&this.write(t,r,()=>{}),this.ended=!0,this.writing||this._clearBuffer(),s&&this.defer(s)}cork(){}uncork(){}setDefaultEncoding(t){return this.defaultEncoding=t,this}_clearBuffer(){const t=this.buffer.shift();if(!t){this.ended&&this.emit("finish");return}this.writing=!0,this._write(t.chunk,t.encoding,r=>{this.writing=!1,this.length-=t.chunk.length??1,r&&this.emit("error",r),t.cb(r),this.buffer.length?this._clearBuffer():(this.length<this.highWaterMark&&this.emit("drain"),this.ended&&this.emit("finish"))})}}function createSpawnHandler(n){return function(t,r=[],s={}){const i=new ChildProcess,a=new ProcessApi(i);return setTimeout(async()=>{let o=[];if(r.length)o=[t,...r];else if(typeof t=="string")o=splitShellCommand$1(t);else if(Array.isArray(t))o=t;else throw new Error("Invalid command ",t);try{const l=n(o,a,s);if(typeof l!="object"||l===null||!("then"in l))throw new Error(`The program callback passed to createSpawnHandler() did not return a promise. It indicates there's a bug in your code. The callback must return a promise. PHP cannot interact with program that synchronously exists at the end of the proc_open() call. All the streams would be closed already. Make sure to put an "await new Promise(resolve => setTimeout(resolve, 1))before calling processApi.exit(0) in your callback to let PHP catch up with the stdout data.`);if(a.exited)throw new Error(`The program callback passed to createSpawnHandler() exited synchronously. It indicates there's a bug in your code. The callback must return a promise. PHP cannot interact with program that synchronously exists at the end of the proc_open() call. All the streams would be closed already. Make sure to put an "await new Promise(resolve => setTimeout(resolve, 1))before calling processApi.exit(0) in your callback to let PHP catch up with the stdout data.`);i.emit("spawn",!0),await l}catch(l){i.emit("error",l),typeof l=="object"&&l!==null&&"message"in l&&typeof l.message=="string"&&a.stderr(l.message),a.exit(1)}}),i}}class ProcessApi extends EventEmitterPolyfill{constructor(t){super(),this.exited=!1,this.stdinBuffer=[],this.childProcess=t,t.on("stdin",r=>{this.stdinBuffer?this.stdinBuffer.push(r.slice()):this.emit("stdin",r)})}stdinEnd(){this.childProcess.stdin.ended||this.childProcess.stdin.end()}stdout(t){this.childProcess.stdout.write(t)}stdoutEnd(){this.childProcess.stdout.ended||this.childProcess.stdout.end()}stderr(t){this.childProcess.stderr.write(t)}stderrEnd(){this.childProcess.stderr.ended||this.childProcess.stderr.end()}notifySpawn(){this.childProcess.emit("spawn",!0)}exit(t){this.exited||(this.exited=!0,this.stdinEnd(),this.stdoutEnd(),this.stderrEnd(),this.childProcess.emit("exit",t))}on(t,r){if(super.on(t,r),t==="stdin"&&this.stdinBuffer){for(let s=0;s<this.stdinBuffer.length;s++)this.emit("stdin",this.stdinBuffer[s]);this.stdinBuffer=null}}}let lastPid=9743;class ChildProcess extends EventEmitterPolyfill{constructor(t=lastPid++){super(),this.pid=t;const r=this;this.stdout=new WritablePolyfill({write(s,i,a){r.stdout.emit("data",s),a()}}),this.stderr=new WritablePolyfill({write:(s,i,a)=>{r.stderr.emit("data",s),a()}}),this.stdin=new WritablePolyfill({write:(s,i,a)=>{r.emit("stdin",s),a()}})}}const phpEventStdinTransfer=Symbol.for("@php-wasm/php-event-stdin-transfer"),SENDMAIL_CAPTURE_MAX_SIZE=20*1024*1024;function sendmailSpawnHandler(n){return createSpawnHandler(async function(t,r){let s=0,i=!1,a=!1,o=!1,l;const u=new ReadableStream({start(d){l=d},cancel(){o=!0}});r.on("stdin",d=>{if(i||(i=!0,n.dispatchEvent({type:"sendmail.spawned",stdin:u,[phpEventStdinTransfer]:!0})),s+=d.length,s>SENDMAIL_CAPTURE_MAX_SIZE){a=!0;try{l.error(new Error(`sendmail: Message size exceeds fixed maximum message size (${SENDMAIL_CAPTURE_MAX_SIZE})`))}catch{}return}o||l.enqueue(d.slice())});const c=r.childProcess.stdin;if(c.ended||c.writableEnded||c.writableFinished||await new Promise(d=>{if(c.ended||c.writableEnded||c.writableFinished){d();return}const p=()=>{d()};c.once("finish",p)}),a){r.stderr(`sendmail: Message size exceeds fixed maximum message size (${SENDMAIL_CAPTURE_MAX_SIZE})
`),r.exit(1);return}if(s===0){r.stderr(`sendmail: fatal: No message bytes received over stdin
`),r.exit(75);return}try{l.close()}catch{}r.exit(0)})}function randomString(n=36,t="!@#$%^&*()_+=-[]/.,<>?"){const r="0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"+t;let s="";for(let i=n;i>0;--i)s+=r[Math.floor(Math.random()*r.length)];return s}function formatBytes(n){if(n<1024)return`${n} B`;const t=n/1024/1024;return t>=1?`${t.toFixed(1)} MB`:`${(n/1024).toFixed(0)} KB`}function randomFilename(){return randomString(36,"-_")}function encodeStringAsBase64(n){return encodeUint8ArrayAsBase64(new TextEncoder().encode(n))}function encodeUint8ArrayAsBase64(n){const r=[];for(let s=0;s<n.length;s+=65536)r.push(String.fromCharCode(...n.subarray(s,s+65536)));return btoa(r.join(""))}function phpVar(n){return`json_decode(base64_decode('${encodeStringAsBase64(JSON.stringify(n))}'), true)`}function phpVars(n){const t={};for(const r in n)t[r]=phpVar(n[r]);return t}function concatUint8Arrays(n){let t=0;n.forEach(i=>t+=i.length);const r=new Uint8Array(t);let s=0;return n.forEach(i=>{r.set(i,s),s+=i.length}),r}function concatArrayBuffers(n){return concatUint8Arrays(n.map(t=>new Uint8Array(t))).buffer}class FSHelpers{static readFileAsText(t,r){return new TextDecoder().decode(FSHelpers.readFileAsBuffer(t,r))}static readFileAsBuffer(t,r){return t.readFile(r)}static writeFile(t,r,s){t.writeFile(r,s)}static unlink(t,r){t.unlink(r)}static mv(t,r,s){try{const i=t.lookupPath(r).node.mount,a=FSHelpers.fileExists(t,s)?t.lookupPath(s).node.mount:t.lookupPath(dirname(s)).node.mount;i.mountpoint!==a.mountpoint?(FSHelpers.copyRecursive(t,r,s),FSHelpers.isDir(t,r)?FSHelpers.rmdir(t,r,{recursive:!0}):t.unlink(r)):t.rename(r,s)}catch(i){const a=getEmscriptenFsError(i);throw a?new Error(`Could not move ${r} to ${s}: ${a}`,{cause:i}):i}}static rmdir(t,r,s={recursive:!0}){if(t.lookupPath(r,{follow:!1})?.node.mount.mountpoint===r)throw new ErrnoError(10);s?.recursive&&FSHelpers.listFiles(t,r).forEach(a=>{const o=`${r}/${a}`;FSHelpers.isDir(t,o)?FSHelpers.rmdir(t,o,s):FSHelpers.unlink(t,o)}),t.getPath(t.lookupPath(r).node)===t.cwd()&&t.chdir(joinPaths(t.cwd(),"..")),t.rmdir(r)}static listFiles(t,r,s={prependPath:!1}){if(!FSHelpers.fileExists(t,r))return[];try{const i=t.readdir(r).filter(a=>a!=="."&&a!=="..");if(s.prependPath){const a=r.replace(/\/$/,"");return i.map(o=>`${a}/${o}`)}return i}catch(i){return logger.error(i,{path:r}),[]}}static isDir(t,r){return FSHelpers.fileExists(t,r)?t.isDir(t.lookupPath(r,{follow:!0}).node.mode):!1}static isFile(t,r){return FSHelpers.fileExists(t,r)?t.isFile(t.lookupPath(r,{follow:!0}).node.mode):!1}static symlink(t,r,s){return t.symlink(r,s)}static isSymlink(t,r){return FSHelpers.fileExists(t,r)?t.isLink(t.lookupPath(r).node.mode):!1}static readlink(t,r){return t.readlink(r)}static realpath(t,r){return t.lookupPath(r,{follow:!0}).path}static fileExists(t,r){try{return t.lookupPath(r),!0}catch{return!1}}static mkdir(t,r){t.mkdirTree(r)}static copyRecursive(t,r,s){try{const i=t.lookupPath(r).node;if(t.isDir(i.mode)){if(r===s||s.startsWith(`${r}/`))throw new ErrnoError(28);t.mkdirTree(s);const a=t.readdir(r).filter(o=>o!=="."&&o!=="..");for(const o of a)FSHelpers.copyRecursive(t,joinPaths(r,o),joinPaths(s,o))}else t.isLink(i.mode)?t.symlink(t.readlink(r),s):t.writeFile(s,t.readFile(r))}catch(i){const a=getEmscriptenFsError(i);throw a?new Error(`Could not copy ${r} to ${s}: ${a}`,{cause:i}):i}}}FSHelpers.readFileAsText=rethrowFileSystemError('Could not read "{path}"')(FSHelpers.readFileAsText);FSHelpers.readFileAsBuffer=rethrowFileSystemError('Could not read "{path}"')(FSHelpers.readFileAsBuffer);FSHelpers.writeFile=rethrowFileSystemError('Could not write to "{path}"')(FSHelpers.writeFile);FSHelpers.unlink=rethrowFileSystemError('Could not unlink "{path}"')(FSHelpers.unlink);FSHelpers.rmdir=rethrowFileSystemError('Could not remove directory "{path}"')(FSHelpers.rmdir);FSHelpers.listFiles=rethrowFileSystemError('Could not list files in "{path}"')(FSHelpers.listFiles);FSHelpers.isDir=rethrowFileSystemError('Could not stat "{path}"')(FSHelpers.isDir);FSHelpers.isFile=rethrowFileSystemError('Could not stat "{path}"')(FSHelpers.isFile);FSHelpers.realpath=rethrowFileSystemError('Could not stat "{path}"')(FSHelpers.realpath);FSHelpers.fileExists=rethrowFileSystemError('Could not stat "{path}"')(FSHelpers.fileExists);FSHelpers.mkdir=rethrowFileSystemError('Could not create directory "{path}"')(FSHelpers.mkdir);const _private=new WeakMap;class PHPWorker{constructor(t,r){this.absoluteUrl="",this.documentRoot="",this.chroot=null,this.#e=new Map,this.#t=new WeakSet,this.onMessageListeners=[],_private.set(this,{monitor:r}),t&&this.__internal_setRequestHandler(t)}#e;#t;__internal_setRequestHandler(t){this.absoluteUrl=t.absoluteUrl,this.documentRoot=t.documentRoot,this.chroot=this.documentRoot,_private.set(this,{..._private.get(this),requestHandler:t})}__internal_getPHP(){return _private.get(this).php}__internal_getRequestHandler(){return this.getRequestHandler()}async setPrimaryPHP(t){_private.set(this,{..._private.get(this),php:t})}pathToInternalUrl(t){return this.getRequestHandler().pathToInternalUrl(t)}internalUrlToPath(t){return this.getRequestHandler().internalUrlToPath(t)}async onDownloadProgress(t){return _private.get(this).monitor?.addEventListener("progress",t)}async mv(t,r){return _private.get(this).php.mv(t,r)}async cp(t,r){return _private.get(this).php.cp(t,r)}async rmdir(t,r){return _private.get(this).php.rmdir(t,r)}async request(t){return await this.getRequestHandler().request(t)}async requestStreamed(t){return await this.getRequestHandler().requestStreamed(t)}async run(t){const r=_private.get(this),s=r.php;if(s&&(t.usePrimaryPhp||!r.requestHandler&&!s.requestHandler))return this.registerWorkerListeners(s),await s.run(t);const{php:i,reap:a}=await this.acquirePHPInstance();try{return await i.run(t)}finally{a()}}async runStream(t){const r=_private.get(this),s=r.php;if(s&&(t.usePrimaryPhp||!r.requestHandler&&!s.requestHandler))return this.registerWorkerListeners(s),await s.runStream(t);const{php:i,reap:a}=await this.acquirePHPInstance();let o;try{o=await i.runStream(t)}catch(l){throw a(),l}return o.finished.finally(a),o}async cli(t,r){const s=_private.get(this),i=s.php;if(!s.requestHandler&&!i?.requestHandler&&i)return await i.cli(t,r);const{php:a,reap:o}=await this.acquirePHPInstance();let l;try{l=await a.cli(t,r)}catch(u){throw o(),u}return l.finished.finally(o),l}chdir(t){return this.chroot=t,_private.get(this).php.chdir(t)}cwd(){return _private.get(this).php.cwd()}async acquirePHPInstance(){const{php:t,reap:r}=await this.getRequestHandler().instanceManager.acquirePHPInstance();return this.chroot!==null&&t.chdir(this.chroot),this.registerWorkerListeners(t),{php:t,reap:r}}setSapiName(t){_private.get(this).php.setSapiName(t)}mkdir(t){return _private.get(this).php.mkdir(t)}mkdirTree(t){return _private.get(this).php.mkdirTree(t)}readFileAsText(t){return _private.get(this).php.readFileAsText(t)}readFileAsBuffer(t){return _private.get(this).php.readFileAsBuffer(t)}writeFile(t,r){return _private.get(this).php.writeFile(t,r)}unlink(t){return _private.get(this).php.unlink(t)}listFiles(t,r){return _private.get(this).php.listFiles(t,r)}isDir(t){return _private.get(this).php.isDir(t)}isFile(t){return _private.get(this).php.isFile(t)}fileExists(t){return _private.get(this).php.fileExists(t)}onMessage(t){return this.onMessageListeners.push(t),async()=>{this.onMessageListeners=this.onMessageListeners.filter(r=>r!==t)}}defineConstant(t,r){_private.get(this).php.defineConstant(t,r)}addEventListener(t,r){this.#e.has(t)||this.#e.set(t,new Set),this.#e.get(t).add(r)}removeEventListener(t,r){this.#e.get(t)?.delete(r)}dispatchEvent(t){const r=this.#e.get(t.type);if(!r)return;const s=[...r],i=phpEventStdinTransfer in t&&t[phpEventStdinTransfer]===!0&&"stdin"in t&&typeof ReadableStream<"u"&&t.stdin instanceof ReadableStream;if(s.length>1&&i){let a=t.stdin;for(let o=0;o<s.length-1;o++){const[l,u]=a.tee();a=u,s[o]({...t,stdin:l})}s[s.length-1]({...t,stdin:a});return}for(const a of s)a(t)}registerWorkerListeners(t){this.#t.has(t)||(this.#t.add(t),t.addEventListener("*",async r=>{this.dispatchEvent(r)}),t.onMessage(async r=>{for(const s of this.onMessageListeners){const i=await s(r);if(i)return i}return""}))}async[Symbol.asyncDispose](){await this.getRequestHandler(!1)?.[Symbol.asyncDispose]()}getRequestHandler(t=!0){const r=_private.get(this);if(r.requestHandler)return r.requestHandler;if(r.php?.requestHandler)return this.__internal_setRequestHandler(r.php.requestHandler),r.php.requestHandler;if(t)throw new Error("PHPWorker is not connected to a request handler.")}}function isExitCode(n){return n instanceof Error?n?.name==="ExitStatus"&&"status"in n:!1}const RuntimeId=Symbol("RuntimeId"),loadedRuntimes=new Map;let lastRuntimeId=0;async function loadPHPRuntime(n,...t){const r=Object.assign({},...t),[s,i,a]=makePromise(),o=n.init(currentJsRuntime,{onAbort(c){a(c),logger.error(c)},ENV:{},locateFile:c=>c,...r,noInitialRun:!0,onRuntimeInitialized(){r.onRuntimeInitialized&&r.onRuntimeInitialized(o),i()}});await s;const l=r.phpWasmAsyncMode??n.phpWasmAsyncMode;l&&(o.phpWasmAsyncMode=l);const u=++lastRuntimeId;return o.FS,o.id=u,o.originalExit=o._exit,o._exit=function(c){return o.outboundNetworkProxyServer&&(o.outboundNetworkProxyServer.close(),o.outboundNetworkProxyServer.closeAllConnections()),loadedRuntimes.delete(u),o.originalExit(c)},o[RuntimeId]=u,loadedRuntimes.set(u,o),u}function popLoadedRuntime(n,{dangerouslyKeepTheRuntimeInTheMap:t=!1}={}){const r=loadedRuntimes.get(n);if(!r)throw new Error(`Runtime with id ${n} not found`);if(t){if(!process?.env?.TEST)throw new Error("Cannot pop runtime in non-test environment");return r}return loadedRuntimes.delete(n),r}const currentJsRuntime=function(){return typeof process<"u"&&process.release?.name==="node"?"NODE":typeof window<"u"?"WEB":typeof WorkerGlobalScope<"u"&&self instanceof WorkerGlobalScope?"WORKER":"NODE"}(),makePromise=()=>{const n=[],t=new Promise((r,s)=>{n.push(r,s)});return n.unshift(t),n},responseTexts={500:"Internal Server Error",502:"Bad Gateway",404:"Not Found",403:"Forbidden",401:"Unauthorized",400:"Bad Request",301:"Moved Permanently",302:"Found",307:"Temporary Redirect",308:"Permanent Redirect",204:"No Content",201:"Created",200:"OK"};class StreamedPHPResponse{constructor(t,r,s,i){this.cachedParsedHeaders=null,this.cachedStdoutBytes=null,this.cachedStderrText=null;const[a,o]=t.tee();this.#e=a,this.#t=o,this.stdout=r,this.stderr=s,this.exitCode=i}#e;#t;static fromPHPResponse(t){const r=new ReadableStream({start(l){l.enqueue(t.bytes),l.close()}}),s=[];for(const[l,u]of Object.entries(t.headers))for(const c of u)s.push(`${l}: ${c}`);const i=JSON.stringify({status:t.httpStatusCode,headers:s}),a=new ReadableStream({start(l){l.enqueue(new TextEncoder().encode(i)),l.close()}}),o=new ReadableStream({start(l){t.errors.length>0&&l.enqueue(new TextEncoder().encode(t.errors)),l.close()}});return new StreamedPHPResponse(a,r,o,Promise.resolve(t.exitCode))}static forHttpCode(t,r=""){return StreamedPHPResponse.fromPHPResponse(PHPResponse.forHttpCode(t,r))}getHeadersStream(){return this.#e}async ok(){try{const t=await this.httpStatusCode;return t>=200&&t<400}catch{return!1}}get finished(){return Promise.allSettled([this.exitCode.finally(()=>{})]).then(()=>{})}get headers(){return this.getParsedHeaders().then(t=>t.headers)}get httpStatusCode(){return this.getParsedHeaders().then(t=>t.httpStatusCode).then(t=>t!==void 0?t:this.getParsedHeaders().then(r=>r.httpStatusCode,()=>200)).catch(()=>500)}get stdoutText(){return this.stdoutBytes.then(t=>new TextDecoder().decode(t))}get stdoutBytes(){return this.cachedStdoutBytes||(this.cachedStdoutBytes=streamToBytes(this.stdout)),this.cachedStdoutBytes}get stderrText(){return this.cachedStderrText||(this.cachedStderrText=streamToText(this.stderr)),this.cachedStderrText}async getParsedHeaders(){return this.cachedParsedHeaders||(this.cachedParsedHeaders=parseHeadersStream(this.#t)),await this.cachedParsedHeaders}}async function parseHeadersStream(n){const t=await streamToText(n);let r;try{r=JSON.parse(t)}catch{return{headers:{},httpStatusCode:200}}const s={};for(const i of r.headers){if(!i.includes(": "))continue;const a=i.indexOf(": "),o=i.substring(0,a).toLowerCase(),l=i.substring(a+2);o in s||(s[o]=[]),s[o].push(l)}return{headers:s,httpStatusCode:r.status}}async function streamToText(n){const t=n.pipeThrough(new TextDecoderStream).getReader(),r=[];for(;;){const{done:s,value:i}=await t.read();if(s)return r.join("");i&&r.push(i)}}async function streamToBytes(n){const t=n.getReader(),r=[];for(;;){const{done:s,value:i}=await t.read();if(s){const a=r.reduce((u,c)=>u+c.byteLength,0),o=new Uint8Array(a);let l=0;for(const u of r)o.set(u,l),l+=u.byteLength;return o}i&&r.push(i)}}class PHPResponse{constructor(t,r,s,i="",a=0){this.httpStatusCode=t,this.headers=r,this.bytes=s,this.exitCode=a,this.errors=i}static forHttpCode(t,r=""){return new PHPResponse(t,{},new TextEncoder().encode(r||responseTexts[t]||""))}static fromRawData(t){return new PHPResponse(t.httpStatusCode,t.headers,t.bytes,t.errors,t.exitCode)}static async fromStreamedResponse(t){return await t.finished,new PHPResponse(await t.httpStatusCode,await t.headers,await t.stdoutBytes,await t.stderrText,await t.exitCode)}ok(){return this.httpStatusCode>=200&&this.httpStatusCode<400}toRawData(){return{headers:this.headers,bytes:this.bytes,errors:this.errors,exitCode:this.exitCode,httpStatusCode:this.httpStatusCode}}get json(){return JSON.parse(this.text)}get text(){return new TextDecoder().decode(this.bytes)}}var _a;const kError=Symbol("error"),kMessage=Symbol("message");class ErrorEvent2 extends(_a=Event,_a){constructor(t,r={}){super(t),this[kError]=r.error===void 0?null:r.error,this[kMessage]=r.message===void 0?"":r.message}get error(){return this[kError]}get message(){return this[kMessage]}}Object.defineProperty(ErrorEvent2.prototype,"error",{enumerable:!0});Object.defineProperty(ErrorEvent2.prototype,"message",{enumerable:!0});const ErrorEvent=typeof globalThis.ErrorEvent=="function"?globalThis.ErrorEvent:ErrorEvent2;class UnhandledRejectionsTarget extends EventTarget{constructor(){super(...arguments),this.listenersCount=0}addEventListener(t,r,s){++this.listenersCount,super.addEventListener(t,r,s)}removeEventListener(t,r,s){--this.listenersCount,super.removeEventListener(t,r,s)}hasListeners(){return this.listenersCount>0}}function improveWASMErrorReporting(n){const t=new UnhandledRejectionsTarget;for(const r in n.wasmExports)if(typeof n.wasmExports[r]=="function"){const s=n.wasmExports[r];n.wasmExports[r]=function(...i){try{return s(...i)}catch(a){if(!(a instanceof Error))throw a;n.lastAsyncifyStackSource&&(a.cause=n.lastAsyncifyStackSource);const o=clarifyErrorMessage(a,n.lastAsyncifyStackSource?.stack);if(t.hasListeners()){a.message=o;const l=new ErrorEvent("error",{error:a});throw t.dispatchEvent(l),a}throw(!isExitCode(a)||a.status!==0)&&showCriticalErrorBox(o),a}}}return t}let functionsMaybeMissingFromAsyncify=[];function getFunctionsMaybeMissingFromAsyncify(){return functionsMaybeMissingFromAsyncify}function clarifyErrorMessage(n,t){if(n.message==="unreachable"){let r=UNREACHABLE_ERROR;t||(r+=`

This stack trace is lacking. For a better one initialize 
the PHP runtime with debug: true, e.g. loadNodeRuntime('8.1', { emscriptenOptions: { debug: true } }).

`);const s=new Set(extractPHPFunctionsFromStack(t||""));let i=n;do{for(const a of extractPHPFunctionsFromStack(i.stack||""))s.add(a);i=i.cause}while(i);functionsMaybeMissingFromAsyncify=Array.from(s);for(const a of s)r+=`    * ${a}
`;return r+=`Original error message: ${n.message}
`,r}return n.message}const UNREACHABLE_ERROR=`
"unreachable" WASM instruction executed.

The typical reason is a PHP function missing from the ASYNCIFY_ONLY
list when building PHP.wasm.

You will need to file a new issue in the WordPress Playground repository
and paste this error message there:

https://github.com/WordPress/wordpress-playground/issues/new

If you're a core developer, the typical fix is to:

* Isolate a minimal reproduction of the error
* Add a reproduction of the error to php-asyncify.spec.ts in the WordPress Playground repository
* Run 'npm run fix-asyncify'
* Commit the changes, push to the repo, release updated NPM packages

Below is a list of all the PHP functions found in the stack trace to
help with the minimal reproduction. If they're all already listed in
the Dockerfile, you'll need to trigger this error again with long stack
traces enabled. In node.js, you can do it using the --stack-trace-limit=100
CLI option: 

`,redBg="\x1B[41m",bold="\x1B[1m",reset="\x1B[0m",eol="\x1B[K";let logged=!1;function showCriticalErrorBox(n){if(!logged&&(logged=!0,!n?.trim().startsWith("Program terminated with exit"))){logger.log(`${redBg}
${eol}
${bold}  WASM ERROR${reset}${redBg}`);for(const t of n.split(`
`))logger.log(`${eol}  ${t} `);logger.log(`${reset}`)}}function extractPHPFunctionsFromStack(n){try{const t=n.split(`
`).slice(1).map(r=>{const s=r.trim().substring(3).split(" ");return{fn:s.length>=2?s[0]:"<unknown>",isWasm:r.includes("wasm:/")}}).filter(({fn:r,isWasm:s})=>s&&!r.startsWith("dynCall_")&&!r.startsWith("invoke_")).map(({fn:r})=>r);return Array.from(new Set(t))}catch{return[]}}const STRING="string",NUMBER="number",__private__dont__use=Symbol("__private__dont__use");class PHPExecutionFailureError extends Error{constructor(t,r,s){super(t),this.response=r,this.source=s}}class MountStillActiveError extends Error{constructor(t){super("The filesystem could not be flushed and remains mounted.",{cause:t}),this.name="MountStillActiveError"}}const PHP_INI_PATH="/internal/shared/php.ini",AUTO_PREPEND_SCRIPT="/internal/shared/auto_prepend_file.php",OPCACHE_FILE_FOLDER="/internal/shared/opcache";class PHP{#sapiName;#phpWasmInitCalled=!1;#wasmErrorsTarget=null;#eventListeners=new Map([["*",new Set]]);#messageListeners=[];#mounts={};#spawnHandler;#commandSpawnHandlers=new Map;#rotationOptions={enabled:!1,recreateRuntime:()=>0,needsRotating:!1,maxRequests:400,requestsMade:0};constructor(n){this.semaphore=new Semaphore({concurrency:1}),n!==void 0&&this.initializeRuntime(n),this.addEventListener("request.error",t=>{t.source==="php-wasm"&&(this.#rotationOptions.needsRotating=!0)})}addEventListener(n,t){this.#eventListeners.has(n)||this.#eventListeners.set(n,new Set),this.#eventListeners.get(n).add(t)}removeEventListener(n,t){this.#eventListeners.get(n)?.delete(t)}dispatchEvent(n){const t=[...this.#eventListeners.get(n.type)||[],...this.#eventListeners.get("*")||[]];if(t.length===0)return;const r=phpEventStdinTransfer in n&&n[phpEventStdinTransfer]===!0&&"stdin"in n&&typeof ReadableStream<"u"&&n.stdin instanceof ReadableStream;if(t.length>1&&r){let s=n.stdin;for(let i=0;i<t.length-1;i++){const[a,o]=s.tee();s=o,t[i]({...n,stdin:a})}t[t.length-1]({...n,stdin:s});return}for(const s of t)s(n)}onMessage(n){return this.#messageListeners.push(n),async()=>{this.#messageListeners=this.#messageListeners.filter(t=>t!==n)}}async setSpawnHandler(handler){typeof handler=="string"&&(handler=createSpawnHandler(eval(handler))),this.#spawnHandler=handler}setCommandSpawnHandler(n,t){this.#commandSpawnHandlers.set(n,t)}#dispatchSpawn(n,t=[],r={}){const s=Array.isArray(n)?n:t.length?[n,...t]:splitShellCommand$1(n),i=s[0]&&this.#commandSpawnHandlers.get(basename(s[0]));if(i)return i(s[0],s.slice(1),r);if(this.#spawnHandler)return this.#spawnHandler(n,t,r);const a=new Error(`popen(), proc_open() are unsupported on this PHP instance. Call php.setSpawnHandler()
			and provide a callback to handle spawning processes, or disable popen(), proc_open() via php.ini.`);throw a.code="SPAWN_UNSUPPORTED",a}get absoluteUrl(){return this.requestHandler.absoluteUrl}get documentRoot(){return this.requestHandler.documentRoot}pathToInternalUrl(n){return this.requestHandler.pathToInternalUrl(n)}internalUrlToPath(n){return this.requestHandler.internalUrlToPath(n)}initializeRuntime(n){if(this[__private__dont__use])throw new Error("PHP runtime already initialized.");const t=popLoadedRuntime(n);if(!t)throw new Error("Invalid PHP runtime id.");if(this[__private__dont__use]=t,t.spawnProcess=(r,s,i)=>this.#dispatchSpawn(r,s,i),this[__private__dont__use].ccall("wasm_set_phpini_path",null,["string"],[PHP_INI_PATH]),!this.fileExists(PHP_INI_PATH)){const r=["opcache.enable = 1","opcache.enable_cli = 1","opcache.jit = 0","opcache.interned_strings_buffer = 8","opcache.max_accelerated_files = 1000","opcache.memory_consumption = 64","opcache.max_wasted_percentage = 5","opcache.file_cache = "+OPCACHE_FILE_FOLDER,"opcache.file_cache_only = 1","opcache.file_cache_consistency_checks = 1"];this.fileExists(OPCACHE_FILE_FOLDER)||this.mkdir(OPCACHE_FILE_FOLDER),this.writeFile(PHP_INI_PATH,["auto_prepend_file="+AUTO_PREPEND_SCRIPT,"memory_limit=256M","ignore_repeated_errors = 1","error_reporting = E_ALL","display_errors = 1","html_errors = 1","display_startup_errors = On","log_errors = 1","always_populate_raw_post_data = -1","upload_max_filesize = 2000M","post_max_size = 2000M","allow_url_fopen = On","allow_url_include = Off","session.save_path = /home/web_user","implicit_flush = 1","output_buffering = 0","max_execution_time = 0","max_input_time = -1",...r].join(`
`))}this.fileExists(AUTO_PREPEND_SCRIPT)||this.writeFile(AUTO_PREPEND_SCRIPT,`<?php
				// Define constants set via defineConstant() calls
				if(file_exists('/internal/shared/consts.json')) {
					$consts = json_decode(file_get_contents('/internal/shared/consts.json'), true);
					foreach ($consts as $const => $value) {
						if (!defined($const) && is_scalar($value)) {
							define($const, $value);
						}
					}
				}
				// Preload all the files from /internal/shared/preload
				foreach (glob('/internal/shared/preload/*.php') as $file) {
					require_once $file;
				}
				`),t.onMessage=async r=>{for(const s of this.#messageListeners){const i=await s(r);if(i)return i}return""},this.#wasmErrorsTarget=improveWASMErrorReporting(t),this.dispatchEvent({type:"runtime.initialized"})}async setSapiName(n){if(this[__private__dont__use].ccall("wasm_set_sapi_name",NUMBER,[STRING],[n])!==0)throw new Error("Could not set SAPI name. This can only be done before the PHP WASM module is initialized.Did you already dispatch any requests?");this.#sapiName=n}chdir(n){this[__private__dont__use].FS.chdir(n)}cwd(){return this[__private__dont__use].FS.cwd()}chmod(n,t){this[__private__dont__use].FS.chmod(n,t)}async request(n){if(logger.debug("PHP.request() is deprecated. Please use new PHPRequestHandler() instead."),!this.requestHandler)throw new Error("No request handler available.");return this.requestHandler.request(n)}async run(n){const t=await this.runStream(n),r=await PHPResponse.fromStreamedResponse(t);if(r.exitCode!==0)throw new PHPExecutionFailureError(`PHP.run() failed with exit code ${r.exitCode}. 

=== Stdout ===
 ${r.text}

=== Stderr ===
 ${r.errors}`,r,"request");return r}async runStream(n){const t=await this.semaphore.acquire();let r;const s=this.#executeWithErrorHandling(async()=>{if(this.#phpWasmInitCalled||(await this[__private__dont__use].ccall("php_wasm_init",null,[],[],{isAsync:!0}),this.#phpWasmInitCalled=!0),n.scriptPath&&!this.fileExists(n.scriptPath))throw new Error(`The script path "${n.scriptPath}" does not exist.`);this.#setRelativeRequestUri(n.relativeUri||""),this.#setRequestMethod(n.method||"GET");const a=normalizeHeaders(n.headers||{}),o=a.host||"example.com:443",l=this.#inferPortFromHostAndProtocol(o,n.protocol||"http");if(this.#setRequestHost(o),this.#setRequestPort(l),this.#setRequestHeaders(a),n.body&&(r=this.#setRequestBody(n.body)),typeof n.code=="string")this.writeFile("/internal/eval.php",n.code),this.#setScriptPath("/internal/eval.php");else if(typeof n.scriptPath=="string")this.#setScriptPath(n.scriptPath||"");else throw new TypeError("The request object must have either a `code` or a `scriptPath` property.");const u=this.#prepareServerEntries(n.$_SERVER,a,l);for(const d in u)this.#setServerGlobalEntry(d,u[d]);const c=n.env||{};for(const d in c)this.#setEnv(d,c[d]);return await this[__private__dont__use].ccall("wasm_sapi_handle_request",NUMBER,[],[],{async:!0})}),i=()=>{if(r)try{this[__private__dont__use].free(r)}catch(a){logger.error(a)}t(),this.dispatchEvent({type:"request.end"})};return s.then(a=>(a.finished.finally(i),a),a=>{try{i()}catch{}finally{throw a}})}#prepareServerEntries(n,t,r){const s={...n||{}};s.HTTPS=s.HTTPS||r===443?"on":"off";for(const i in t){let a="HTTP_";["content-type","content-length"].includes(i.toLowerCase())&&(a=""),s[`${a}${i.toUpperCase().replace(/-/g,"_")}`]=t[i]}return s}#setRelativeRequestUri(n){this[__private__dont__use].ccall("wasm_set_request_uri",null,[STRING],[n]);let t="";n.includes("?")&&(t=n.substring(n.indexOf("?")+1)),this[__private__dont__use].ccall("wasm_set_query_string",null,[STRING],[t])}#setRequestHost(n){this[__private__dont__use].ccall("wasm_set_request_host",null,[STRING],[n])}#setRequestPort(n){this[__private__dont__use].ccall("wasm_set_request_port",null,[NUMBER],[n])}#inferPortFromHostAndProtocol(n,t){let r;try{r=parseInt(new URL(n).port,10)}catch{}return(!r||isNaN(r)||r===80)&&(r=t==="https"?443:80),r}#setRequestMethod(n){this[__private__dont__use].ccall("wasm_set_request_method",null,[STRING],[n])}#setRequestHeaders(n){n.cookie&&this[__private__dont__use].ccall("wasm_set_cookies",null,[STRING],[n.cookie]),n["content-type"]&&this[__private__dont__use].ccall("wasm_set_content_type",null,[STRING],[n["content-type"]]),n["content-length"]&&this[__private__dont__use].ccall("wasm_set_content_length",null,[NUMBER],[parseInt(n["content-length"],10)])}#setRequestBody(n){let t,r;typeof n=="string"?(logger.warn("Passing a string as the request body is deprecated. Please use a Uint8Array instead. See https://github.com/WordPress/wordpress-playground/issues/997 for more details"),r=this[__private__dont__use].lengthBytesUTF8(n),t=r+1):(r=n.byteLength,t=n.byteLength);const s=this[__private__dont__use].malloc(t);if(!s)throw new Error("Could not allocate memory for the request body.");return typeof n=="string"?this[__private__dont__use].stringToUTF8(n,s,t+1):this[__private__dont__use].HEAPU8.set(n,s),this[__private__dont__use].ccall("wasm_set_request_body",null,[NUMBER],[s]),this[__private__dont__use].ccall("wasm_set_content_length",null,[NUMBER],[r]),s}#setScriptPath(n){this[__private__dont__use].ccall("wasm_set_path_translated",null,[STRING],[n])}#setServerGlobalEntry(n,t){this[__private__dont__use].ccall("wasm_add_SERVER_entry",null,[STRING,STRING],[n,t])}#setEnv(n,t){this[__private__dont__use].ccall("wasm_add_ENV_entry",null,[STRING,STRING],[n,t])}defineConstant(n,t){let r={};try{r=JSON.parse(this.fileExists("/internal/shared/consts.json")&&this.readFileAsText("/internal/shared/consts.json")||"{}")}catch{}this.writeFile("/internal/shared/consts.json",JSON.stringify({...r,[n]:t}))}async#executeWithErrorHandling(n){this.#rotationOptions.enabled&&this.#rotationOptions.needsRotating&&await this.rotateRuntime(),++this.#rotationOptions.requestsMade,this.#rotationOptions.requestsMade>=this.#rotationOptions.maxRequests&&(this.#rotationOptions.needsRotating=!0);const t=this[__private__dont__use],r=await createInvertedReadableStream();t.onHeaders=p=>{l||s||r.controller.enqueue(p.slice())};let s=!1;const i=()=>{s||(s=!0,r.controller.close())},a=await createInvertedReadableStream();t.onStdout=p=>{i(),!l&&a.controller.enqueue(p.slice())};const o=await createInvertedReadableStream();t.onStderr=p=>{l||o.controller.enqueue(p.slice())};let l=!1,u;const d=(async()=>{try{return await Promise.race([n(),new Promise((f,g)=>{u=y=>{isExitCode(y.error)||g(y.error)},this.#wasmErrorsTarget?.addEventListener("error",u,{once:!0})})])}catch(p){if(isExitCode(p))return p.status;safeStreamError$1(a.controller,p),safeStreamError$1(o.controller,p),safeStreamError$1(r.controller,p),l=!0;for(const f in this)typeof this[f]=="function"&&(this[f]=()=>{throw new Error("PHP runtime has crashed – see the earlier error for details.")});throw this.functionsMaybeMissingFromAsyncify=getFunctionsMaybeMissingFromAsyncify(),p}finally{l||(safeStreamClose$1(a.controller),safeStreamClose$1(o.controller),i(),l=!0),this.#wasmErrorsTarget?.removeEventListener("error",u)}})().then(p=>(p!==0&&this.dispatchEvent({type:"request.error",error:new Error(`PHP.run() failed with exit code ${p}.`),source:"php-wasm"}),p),p=>{const f=p.source??"php-wasm";throw this.dispatchEvent({type:"request.error",error:p,source:f}),p});return new StreamedPHPResponse(r.stream,a.stream,o.stream,d)}mkdir(n){const t=FSHelpers.mkdir(this[__private__dont__use].FS,n);return this.dispatchEvent({type:"filesystem.write"}),t}mkdirTree(n){return FSHelpers.mkdir(this[__private__dont__use].FS,n)}readFileAsText(n){return FSHelpers.readFileAsText(this[__private__dont__use].FS,n)}readFileAsBuffer(n){return FSHelpers.readFileAsBuffer(this[__private__dont__use].FS,n)}writeFile(n,t){const r=FSHelpers.writeFile(this[__private__dont__use].FS,n,t);return this.dispatchEvent({type:"filesystem.write"}),r}unlink(n){const t=FSHelpers.unlink(this[__private__dont__use].FS,n);return this.dispatchEvent({type:"filesystem.write"}),t}mv(n,t){const r=FSHelpers.mv(this[__private__dont__use].FS,n,t);return this.dispatchEvent({type:"filesystem.write"}),r}cp(n,t){const r=FSHelpers.copyRecursive(this[__private__dont__use].FS,n,t);return this.dispatchEvent({type:"filesystem.write"}),r}rmdir(n,t={recursive:!0}){const r=FSHelpers.rmdir(this[__private__dont__use].FS,n,t);return this.dispatchEvent({type:"filesystem.write"}),r}listFiles(n,t={prependPath:!1}){return FSHelpers.listFiles(this[__private__dont__use].FS,n,t)}isDir(n){return FSHelpers.isDir(this[__private__dont__use].FS,n)}isFile(n){return FSHelpers.isFile(this[__private__dont__use].FS,n)}symlink(n,t){return FSHelpers.symlink(this[__private__dont__use].FS,n,t)}isSymlink(n){return FSHelpers.isSymlink(this[__private__dont__use].FS,n)}readlink(n){return FSHelpers.readlink(this[__private__dont__use].FS,n)}realpath(n){return FSHelpers.realpath(this[__private__dont__use].FS,n)}fileExists(n){return FSHelpers.fileExists(this[__private__dont__use].FS,n)}enableRuntimeRotation(n){this.#rotationOptions={...this.#rotationOptions,enabled:!0,recreateRuntime:n.recreateRuntime,maxRequests:n.maxRequests??400}}async rotateRuntime(){if(!this.#rotationOptions.enabled)throw new Error("Runtime rotation is not enabled. Call enableRuntimeRotation() first.");await this.hotSwapPHPRuntime(await this.#rotationOptions.recreateRuntime()),this.#rotationOptions.requestsMade=0,this.#rotationOptions.needsRotating=!1}async hotSwapPHPRuntime(n){const t=this[__private__dont__use].FS,r=this.listFiles("/").map(l=>`/${l}`),s=t.cwd();t.chdir("/");const i=Object.entries(this.#mounts).map(([l,u])=>({mountHandler:u.mountHandler,mountPointSnapshot:snapshotMountPoint(t,l),vfsPath:l})),a=Object.values(this.#mounts).reverse();for(const l of a)await l.unmount();try{this.exit()}catch{}this.initializeRuntime(n),this.#sapiName&&this.setSapiName(this.#sapiName);const o=this[__private__dont__use].FS;for(const l of r)l&&l!=="/request"&&copyMEMFSNodes(t,o,l);for(const{mountHandler:l,mountPointSnapshot:u,vfsPath:c}of i)try{await this.mount(c,l)}catch(d){if(isMissingMountSourceError(d)){restoreMountPointSnapshot(o,c,u);continue}if(!isMissingMountTargetPathError(d))throw d;this.mkdir(c),await this.mount(c,l)}try{o.chdir(s)}catch(l){throw new Error(`Failed to restore CWD to ${s} after PHP runtime rotation.`,{cause:l})}}async mount(n,t){const r=await t(this,this[__private__dont__use].FS,n),s={mountHandler:t,unmount:async()=>{try{await r()}catch(i){throw i instanceof MountStillActiveError||delete this.#mounts[n],i}delete this.#mounts[n]}};return this.#mounts[n]=s,async()=>{const i=this.#mounts[n];i?.mountHandler===t&&await i.unmount()}}async cli(n,t={}){if(basename(n[0]??"")!=="php")return this.subProcess(n,t);this.#phpWasmInitCalled&&(this.#rotationOptions.needsRotating=!0);const r=await this.semaphore.acquire();return await this.#executeWithErrorHandling(()=>{const s=t.env||{};for(const[i,a]of Object.entries(s))this.#setEnv(i,a);n=[n[0],"-c",PHP_INI_PATH,...n.slice(1)];for(const i of n)this[__private__dont__use].ccall("wasm_add_cli_arg",null,[STRING],[i]);return this[__private__dont__use].ccall("run_cli",null,[],[],{async:!0})}).then(s=>(s.exitCode.finally(r),s)).finally(()=>{this.#rotationOptions.needsRotating=!0})}async subProcess(n,t={}){const r=this.#dispatchSpawn(n[0],n.slice(1),{env:t.env,cwd:t.cwd??this.cwd()}),s=await createInvertedReadableStream();r.on("error",l=>{safeStreamError$1(s.controller,l)});const i=l=>{try{s.controller.enqueue(l)}catch{r.stderr.off("data",i)}};r.stderr.on("data",i);const a=await createInvertedReadableStream(),o=l=>{try{a.controller.enqueue(l)}catch{r.stdout.off("data",o)}};return r.stdout.on("data",o),r.on("exit",()=>{setTimeout(()=>{try{s.controller.close()}catch{}try{a.controller.close()}catch{}},0)}),new StreamedPHPResponse(new ReadableStream({start(l){l.close()}}),a.stream,s.stream,new Promise(l=>{r.on("exit",u=>{l(u)})}))}setSkipShebang(n){this[__private__dont__use].ccall("wasm_set_skip_shebang",null,[NUMBER],[n?1:0])}exit(n=0){this.dispatchEvent({type:"runtime.beforeExit"});try{this[__private__dont__use]._exit(n)}catch{}this.#phpWasmInitCalled=!1,this.#wasmErrorsTarget=null,this[__private__dont__use]&&(delete this[__private__dont__use].onMessage,delete this[__private__dont__use])}[Symbol.dispose](){this.exit(0)}}function normalizeHeaders(n){const t={};for(const r in n)t[r.toLowerCase()]=n[r];return t}function copyMEMFSNodes(n,t,r){if(getNodeType(n,r)!=="memfs"||!["memfs","missing"].includes(getNodeType(t,r)))return;const s=n.lookupPath(r,{follow:!1});if(n.isLink(s.node.mode)){const a=n.readlink(r);t.symlink(a,r);return}if(!n.isDir(s.node.mode)){t.writeFile(r,n.readFile(r));return}t.mkdirTree(r);const i=n.readdir(r).filter(a=>a!=="."&&a!=="..");for(const a of i)copyMEMFSNodes(n,t,joinPaths(r,a))}function snapshotMountPoint(n,t){try{const r=n.lookupPath(t,{follow:!1});return n.isLink(r.node.mode)?{kind:"symlink",target:n.readlink(t)}:n.isDir(r.node.mode)?{kind:"directory"}:{kind:"file"}}catch{return}}function restoreMountPointSnapshot(n,t,r){if(!(!r||getNodeType(n,t)!=="missing")){if(r.kind==="directory"){n.mkdirTree(t);return}n.mkdirTree(dirname(t)),r.kind==="symlink"?n.symlink(r.target,t):n.writeFile(t,new Uint8Array)}}function isMissingMountSourceError(n){return n.phpWasmMountSourceMissing===!0}function isMissingMountTargetPathError(n){return n.errno===44}async function createInvertedReadableStream(n={}){let t;const r=new Promise(a=>{t=a}),s=new ReadableStream({...n,start(a){if(t(a),n.start)return n.start(a)}}),i=await r;return{stream:s,controller:i}}function safeStreamError$1(n,t){try{n.error(t)}catch{}}function safeStreamClose$1(n){try{n.close()}catch{}}const getNodeType=(n,t)=>{try{return"contents"in n.lookupPath(t,{follow:!0}).node?"memfs":"not-memfs"}catch{return"missing"}},{hasOwnProperty:hasOwnProperty$1}=Object.prototype,encode=(n,t={})=>{typeof t=="string"&&(t={section:t}),t.align=t.align===!0,t.newline=t.newline===!0,t.sort=t.sort===!0,t.whitespace=t.whitespace===!0||t.align===!0,t.platform=t.platform||typeof process<"u"&&process.platform,t.bracketedArray=t.bracketedArray!==!1;const r=t.platform==="win32"?`\r
`:`
`,s=t.whitespace?" = ":"=",i=[],a=t.sort?Object.keys(n).sort():Object.keys(n);let o=0;t.align&&(o=safe(a.filter(c=>n[c]===null||Array.isArray(n[c])||typeof n[c]!="object").map(c=>Array.isArray(n[c])?`${c}[]`:c).concat([""]).reduce((c,d)=>safe(c).length>=safe(d).length?c:d)).length);let l="";const u=t.bracketedArray?"[]":"";for(const c of a){const d=n[c];if(d&&Array.isArray(d))for(const p of d)l+=safe(`${c}${u}`).padEnd(o," ")+s+safe(p)+r;else d&&typeof d=="object"?i.push(c):l+=safe(c).padEnd(o," ")+s+safe(d)+r}t.section&&l.length&&(l="["+safe(t.section)+"]"+(t.newline?r+r:r)+l);for(const c of i){const d=splitSections(c,".").join("\\."),p=(t.section?t.section+".":"")+d,f=encode(n[c],{...t,section:p});l.length&&f.length&&(l+=r),l+=f}return l};function splitSections(n,t){var r=0,s=0,i=0,a=[];do if(i=n.indexOf(t,r),i!==-1){if(r=i+t.length,i>0&&n[i-1]==="\\")continue;a.push(n.slice(s,i)),s=i+t.length}while(i!==-1);return a.push(n.slice(s)),a}const decode=(n,t={})=>{t.bracketedArray=t.bracketedArray!==!1;const r=Object.create(null);let s=r,i=null;const a=/^\[([^\]]*)\]\s*$|^([^=]+)(=(.*))?$/i,o=n.split(/[\r\n]+/g),l={};for(const c of o){if(!c||c.match(/^\s*[;#]/)||c.match(/^\s*$/))continue;const d=c.match(a);if(!d)continue;if(d[1]!==void 0){if(i=unsafe(d[1]),i==="__proto__"){s=Object.create(null);continue}s=r[i]=r[i]||Object.create(null);continue}const p=unsafe(d[2]);let f;t.bracketedArray?f=p.length>2&&p.slice(-2)==="[]":(l[p]=(l?.[p]||0)+1,f=l[p]>1);const g=f?p.slice(0,-2):p;if(g==="__proto__")continue;const y=d[3]?unsafe(d[4]):!0,_=y==="true"||y==="false"||y==="null"?JSON.parse(y):y;f&&(hasOwnProperty$1.call(s,g)?Array.isArray(s[g])||(s[g]=[s[g]]):s[g]=[]),Array.isArray(s[g])?s[g].push(_):s[g]=_}const u=[];for(const c of Object.keys(r)){if(!hasOwnProperty$1.call(r,c)||typeof r[c]!="object"||Array.isArray(r[c]))continue;const d=splitSections(c,".");s=r;const p=d.pop(),f=p.replace(/\\\./g,".");for(const g of d)g!=="__proto__"&&((!hasOwnProperty$1.call(s,g)||typeof s[g]!="object")&&(s[g]=Object.create(null)),s=s[g]);s===r&&f===p||(s[f]=r[c],u.push(c))}for(const c of u)delete r[c];return r},isQuoted=n=>n.startsWith('"')&&n.endsWith('"')||n.startsWith("'")&&n.endsWith("'"),safe=n=>typeof n!="string"||n.match(/[=\r\n]/)||n.match(/^\[/)||n.length>1&&isQuoted(n)||n!==n.trim()?JSON.stringify(n):n.split(";").join("\\;").split("#").join("\\#"),unsafe=n=>{if(n=(n||"").trim(),isQuoted(n)){n.charAt(0)==="'"&&(n=n.slice(1,-1));try{n=JSON.parse(n)}catch{}}else{let t=!1,r="";for(let s=0,i=n.length;s<i;s++){const a=n.charAt(s);if(t)"\\;#".indexOf(a)!==-1?r+=a:r+="\\"+a,t=!1;else{if(";#".indexOf(a)!==-1)break;a==="\\"?t=!0:r+=a}}return t&&(r+="\\"),r.trim()}return n};var ini={parse:decode,stringify:encode};async function setPhpIniEntries(n,t){const r=ini.parse(await n.readFileAsText(PHP_INI_PATH));for(const[s,i]of Object.entries(t))i==null?delete r[s]:r[s]=i;await n.writeFile(PHP_INI_PATH,ini.stringify(r))}async function withPHPIniValues(n,t,r){const s=await n.readFileAsText(PHP_INI_PATH);try{return await setPhpIniEntries(n,t),await r()}finally{await n.writeFile(PHP_INI_PATH,s)}}class HttpCookieStore{constructor(){this.cookies={}}rememberCookiesFromResponseHeaders(t){if(t?.["set-cookie"])for(const r of t["set-cookie"])try{if(!r.includes("="))continue;const s=r.indexOf("="),i=r.substring(0,s),a=r.substring(s+1).split(";")[0];this.cookies[i]=a}catch(s){logger.error(s)}}getCookieRequestHeader(){const t=[];for(const r in this.cookies)t.push(`${r}=${this.cookies[r]}`);return t.join("; ")}}ReadableStream.prototype[Symbol.asyncIterator]||(ReadableStream.prototype[Symbol.asyncIterator]=async function*(){const n=this.getReader();try{for(;;){const{done:t,value:r}=await n.read();if(t)return;yield r}}finally{n.releaseLock()}},ReadableStream.prototype.iterate=ReadableStream.prototype[Symbol.asyncIterator]);new Semaphore({concurrency:10});class SinglePHPInstanceManager{constructor(t){if(this.isAcquired=!1,!t.php&&!t.phpFactory)throw new Error("SinglePHPInstanceManager requires either php or phpFactory");this.php=t.php,this.phpFactory=t.phpFactory}async getPrimaryPhp(){return this.php?this.php:(this.phpPromise||(this.phpPromise=this.phpFactory().then(t=>(this.php=t,this.phpPromise=void 0,t))),this.phpPromise)}async acquirePHPInstance(){if(this.isAcquired)throw new Error("The PHP instance already acquired. SinglePHPInstanceManager cannot spawn another PHP instance since, by definition, it only manages a single PHP instance.");const t=await this.getPrimaryPhp();return this.isAcquired=!0,{php:t,reap:()=>{this.isAcquired=!1}}}async[Symbol.asyncDispose](){this.php&&this.php.exit()}}class MaxPhpInstancesError extends Error{constructor(t){super(`Requested more concurrent PHP instances than the limit (${t}).`),this.name=this.constructor.name}}class PHPProcessManager{constructor(t){this.instances=[],this.idleInstances=[],this.maxPhpInstances=t?.maxPhpInstances??2,this.phpFactory=t?.phpFactory,this.semaphore=new Semaphore({concurrency:this.maxPhpInstances,timeout:t?.timeout||3e4})}async getPrimaryPhp(){if(this.instances.length>0)return this.instances[0];this.primaryPhpPromise||(this.primaryPhpPromise=this.spawnInstance(!0));try{return await this.primaryPhpPromise}finally{this.primaryPhpPromise=void 0}}async acquirePHPInstance(){let t;try{t=await this.semaphore.acquire()}catch(s){throw s instanceof AcquireTimeoutError?new MaxPhpInstancesError(this.maxPhpInstances):s}const r=await this.getOrSpawnInstance();return{php:r,reap:()=>{this.idleInstances.push(r),t()}}}async getOrSpawnInstance(){return this.instances.length===0&&await this.getPrimaryPhp(),this.idleInstances.length===0&&await this.spawnInstance(!1),this.idleInstances.pop()}async spawnInstance(t){if(!this.phpFactory)throw new Error("phpFactory must be set before spawning instances.");const r=await this.phpFactory({isPrimary:t});return this.instances.push(r),this.idleInstances.push(r),r}async[Symbol.asyncDispose](){for(const t of this.instances)t.exit();this.instances=[],this.idleInstances=[]}}const PHPNextVersion="next",SupportedPHPVersions=["8.5","8.4","8.3","8.2","8.1","8.0","7.4"],LatestSupportedPHPVersion=SupportedPHPVersions[0],LegacyPHPVersions=["5.2"];function isPHPNextVersion(n){return n===PHPNextVersion}function isLegacyPHPVersion(n){return LegacyPHPVersions.includes(n??"")}const LEGACY_PHP_INI_PATH="/internal/shared/php.ini",LEGACY_PHP_INI_CONTENT=["auto_prepend_file=/internal/shared/auto_prepend_file.php","memory_limit=256M","ignore_repeated_errors = 1","error_reporting = E_ALL","display_errors = 1","html_errors = 1","display_startup_errors = On","log_errors = 1","always_populate_raw_post_data = -1","upload_max_filesize = 2000M","post_max_size = 2000M","allow_url_fopen = On","allow_url_include = Off","session.save_path = /home/web_user","implicit_flush = 1","output_buffering = 0","max_execution_time = 0","max_input_time = -1","disable_functions = ini_get_all","opcache.enable = 0","opcache.enable_cli = 0"].join(`
`);function createLegacyPhpIniPreRunStep(){return n=>{n.FS.mkdirTree("/internal/shared"),n.FS.writeFile(LEGACY_PHP_INI_PATH,LEGACY_PHP_INI_CONTENT)}}const DEFAULT_BASE_URL="http://example.com";function toRelativeUrl(n){return n.origin==="null"?n.toString():n.toString().substring(n.origin.length)}function removePathPrefix(n,t){return!t||!n.startsWith(t)?n:n.substring(t.length)}function ensurePathPrefix(n,t){return!t||n.startsWith(t)?n:t+n}async function encodeAsMultipart(n){const t=`----${Math.random().toString(36).slice(2)}`,r=`multipart/form-data; boundary=${t}`,s=new TextEncoder,i=[];for(const[u,c]of Object.entries(n))i.push(`--${t}\r
`),i.push(`Content-Disposition: form-data; name="${u}"`),c instanceof File&&i.push(`; filename="${c.name}"`),i.push(`\r
`),c instanceof File&&(i.push("Content-Type: application/octet-stream"),i.push(`\r
`)),i.push(`\r
`),c instanceof File?i.push(await fileToUint8Array(c)):i.push(c),i.push(`\r
`);i.push(`--${t}--\r
`);const a=i.reduce((u,c)=>u+c.length,0),o=new Uint8Array(a);let l=0;for(const u of i)o.set(typeof u=="string"?s.encode(u):u,l),l+=u.length;return{bytes:o,contentType:r}}function fileToUint8Array(n){return n.arrayBuffer().then(t=>new Uint8Array(t))}const _default="application/octet-stream",asx="video/x-ms-asf",atom="application/atom+xml",avi="video/x-msvideo",avif="image/avif",bin="application/octet-stream",bmp="image/x-ms-bmp",cco="application/x-cocoa",cjs="application/javascript",css="text/css",data="application/octet-stream",deb="application/octet-stream",der="application/x-x509-ca-cert",dmg="application/octet-stream",doc="application/msword",docx="application/vnd.openxmlformats-officedocument.wordprocessingml.document",eot="application/vnd.ms-fontobject",flv="video/x-flv",gif="image/gif",gz="application/gzip",hqx="application/mac-binhex40",htc="text/x-component",html="text/html",ico="image/x-icon",iso="application/octet-stream",jad="text/vnd.sun.j2me.app-descriptor",jar="application/java-archive",jardiff="application/x-java-archive-diff",jng="image/x-jng",jnlp="application/x-java-jnlp-file",jpg="image/jpeg",jpeg="image/jpeg",js="application/javascript",json="application/json",kml="application/vnd.google-earth.kml+xml",kmz="application/vnd.google-earth.kmz",m3u8="application/vnd.apple.mpegurl",m4a="audio/x-m4a",m4v="video/x-m4v",md="text/plain",mid="audio/midi",mjs="application/javascript",mml="text/mathml",mng="video/x-mng",mov="video/quicktime",mp3="audio/mpeg",mp4="video/mp4",mpeg="video/mpeg",msi="application/octet-stream",odg="application/vnd.oasis.opendocument.graphics",odp="application/vnd.oasis.opendocument.presentation",ods="application/vnd.oasis.opendocument.spreadsheet",odt="application/vnd.oasis.opendocument.text",ogg="audio/ogg",otf="font/otf",pdf="application/pdf",pl="application/x-perl",png="image/png",ppt="application/vnd.ms-powerpoint",pptx="application/vnd.openxmlformats-officedocument.presentationml.presentation",prc="application/x-pilot",ps="application/postscript",ra="audio/x-realaudio",rar="application/x-rar-compressed",rpm="application/x-redhat-package-manager",rss="application/rss+xml",rtf="application/rtf",run="application/x-makeself",sea="application/x-sea",sit="application/x-stuffit",svg="image/svg+xml",swf="application/x-shockwave-flash",tcl="application/x-tcl",tar="application/x-tar",tif="image/tiff",ts="video/mp2t",ttf="font/ttf",txt="text/plain",wasm="application/wasm",wbmp="image/vnd.wap.wbmp",webm="video/webm",webp="image/webp",wml="text/vnd.wap.wml",wmlc="application/vnd.wap.wmlc",wmv="video/x-ms-wmv",woff="font/woff",woff2="font/woff2",xhtml="application/xhtml+xml",xls="application/vnd.ms-excel",xlsx="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",xml="text/xml",xpi="application/x-xpinstall",xspf="application/xspf+xml",zip="application/zip";var mimeTypes={_default,"3gpp":"video/3gpp","7z":"application/x-7z-compressed",asx,atom,avi,avif,bin,bmp,cco,cjs,css,data,deb,der,dmg,doc,docx,eot,flv,gif,gz,hqx,htc,html,ico,iso,jad,jar,jardiff,jng,jnlp,jpg,jpeg,js,json,kml,kmz,m3u8,m4a,m4v,md,mid,mjs,mml,mng,mov,mp3,mp4,mpeg,msi,odg,odp,ods,odt,ogg,otf,pdf,pl,png,ppt,pptx,prc,ps,ra,rar,rpm,rss,rtf,run,sea,sit,svg,swf,tcl,tar,tif,ts,ttf,txt,wasm,wbmp,webm,webp,wml,wmlc,wmv,woff,woff2,xhtml,xls,xlsx,xml,xpi,xspf,zip};class PHPRequestHandler{#e;#t;#s;#i;#a;#n;#o;#r;#u;constructor(t){const{documentRoot:r="/www/",absoluteUrl:s=typeof location=="object"?location.href:DEFAULT_BASE_URL,rewriteRules:i=[],pathAliases:a=[],getFileNotFoundAction:o=()=>({type:"404"})}=t,l=d=>{d.isDir(r)||d.mkdir(r),d.chdir(r),d.requestHandler=this};if(t.php)l(t.php),this.instanceManager=new SinglePHPInstanceManager({php:t.php});else if(t.phpFactory)this.instanceManager=new PHPProcessManager({phpFactory:async d=>{const p=await t.phpFactory({...d,requestHandler:this});return l(p),p},maxPhpInstances:t.maxPhpInstances});else throw new Error("Either php or phpFactory must be provided in the configuration.");this.#r=t.cookieStore===void 0?new HttpCookieStore:t.cookieStore,this.#e=r;const u=new URL(s);this.#s=u.hostname,this.#i=u.port?Number(u.port):u.protocol==="https:"?443:80,this.#t=(u.protocol||"").replace(":","");const c=this.#i!==443&&this.#i!==80;this.#a=[this.#s,c?`:${this.#i}`:""].join(""),this.#n=u.pathname.replace(/\/+$/,""),this.#o=[`${this.#t}://`,this.#a,this.#n].join(""),this.rewriteRules=i,this.#u=a,this.getFileNotFoundAction=o}async getPrimaryPhp(){return await this.instanceManager.getPrimaryPhp()}pathToInternalUrl(t){return t.startsWith("/")||(t=`/${t}`),`${this.absoluteUrl}${t}`}internalUrlToPath(t){const r=new URL(t,"https://playground.internal");return r.pathname.startsWith(this.#n)&&(r.pathname=r.pathname.slice(this.#n.length)),toRelativeUrl(r)}get absoluteUrl(){return this.#o}get documentRoot(){return this.#e}async request(t){const r=await this.requestStreamed(t),s=await PHPResponse.fromStreamedResponse(r);return s.ok()&&s.exitCode!==0?new PHPResponse(500,s.headers,s.bytes,s.errors,s.exitCode):s}async requestStreamed(t){const r=looksLikeAbsoluteUrl(t.url),s=new URL(t.url.split("#")[0],r?void 0:DEFAULT_BASE_URL),i=this.#c(s),a=await this.getPrimaryPhp(),o=removePathPrefix(decodeURIComponent(i.pathname),this.#n);let l=this.#l(o);if(a.isDir(l)){if(!o.endsWith("/"))return StreamedPHPResponse.fromPHPResponse(new PHPResponse(301,{location:[`${i.pathname}/`]},new Uint8Array(0)));for(const u of["index.php","index.html"]){const c=joinPaths(l,u);if(a.isFile(c)){l=c,i.pathname=joinPaths(i.pathname,u);break}}}if(!a.isFile(l)){let u=o;for(;u.startsWith("/")&&u!==dirname(u);){u=dirname(u);const c=this.#l(u);if(a.isFile(c)&&c.endsWith(".php")){l=this.#l(u);break}}}if(!a.isFile(l)){const u=this.getFileNotFoundAction(i.pathname);switch(u.type){case"response":return StreamedPHPResponse.fromPHPResponse(u.response);case"internal-redirect":l=joinPaths(this.#e,u.uri);break;case"404":return StreamedPHPResponse.forHttpCode(404);default:throw new Error(`Unsupported file-not-found action type: '${u.type}'`)}}return a.isFile(l)?l.endsWith(".php")?await this.#p(t,s,i,l):StreamedPHPResponse.fromPHPResponse(this.#d(a,l)):StreamedPHPResponse.forHttpCode(404)}#c(t){const r=removePathPrefix(decodeURIComponent(t.pathname),this.#n),s=applyRewriteRules(r,this.rewriteRules),i=new URL(joinPaths(this.#n,s),t.toString());for(const[a,o]of t.searchParams.entries())i.searchParams.append(a,o);return i}#l(t){for(const r of this.#u)if(t===r.urlPrefix||t.startsWith(r.urlPrefix+"/")){const s=t.slice(r.urlPrefix.length);return joinPaths(r.fsPath,s)}return joinPaths(this.#e,t)}#d(t,r){const s=t.readFileAsBuffer(r);return new PHPResponse(200,{"content-length":[`${s.byteLength}`],"content-type":[inferMimeType(r)],"accept-ranges":["bytes"],"cache-control":["public, max-age=0"]},s)}async#p(t,r,s,i){let a;try{a=await this.instanceManager.acquirePHPInstance()}catch(l){return l instanceof MaxPhpInstancesError?StreamedPHPResponse.forHttpCode(502):StreamedPHPResponse.forHttpCode(500)}let o;try{o=await this.#f(a.php,t,r,s,i)}catch(l){throw a.reap(),l}return o.finished.finally(()=>{a?.reap()}),o}async#f(t,r,s,i,a){let o="GET";const l={host:this.#a,...normalizeHeaders(r.headers||{})};this.#r&&(l.cookie=this.#r.getCookieRequestHeader());let u=r.body;if(typeof u=="object"&&!(u instanceof Uint8Array)){o="POST";const{bytes:d,contentType:p}=await encodeAsMultipart(u);u=d,l["content-type"]=p}const c=await t.runStream({relativeUri:ensurePathPrefix(toRelativeUrl(new URL(i.toString())),this.#n),protocol:this.#t,method:r.method||o,$_SERVER:this.prepare_$_SERVER_superglobal(s,i,a),body:u,scriptPath:a,headers:l});if(this.#r){const d=await c.headers;this.#r.rememberCookiesFromResponseHeaders(d)}return c}prepare_$_SERVER_superglobal(t,r,s){const i={REMOTE_ADDR:"127.0.0.1",DOCUMENT_ROOT:this.#e,HTTPS:this.#o.startsWith("https://")?"on":""};return i.REQUEST_URI=t.pathname+t.search,s.startsWith(this.#e)&&(i.SCRIPT_NAME=s.substring(this.#e.length),i.PHP_SELF=r.pathname,i.REQUEST_URI.startsWith(i.SCRIPT_NAME)&&(i.PATH_INFO=i.REQUEST_URI.substring(i.SCRIPT_NAME.length),i.PATH_INFO.includes("?")&&(i.PATH_INFO=i.PATH_INFO.substring(0,i.PATH_INFO.indexOf("?"))))),i.QUERY_STRING=r.search.substring(1),i}async[Symbol.asyncDispose](){await this.instanceManager[Symbol.asyncDispose]()}}function inferMimeType(n){const t=n.split(".").pop();return mimeTypes[t]||mimeTypes._default}function applyRewriteRules(n,t){for(const r of t)if(new RegExp(r.match).test(n)){n=n.replace(r.match,r.replacement);break}return n}function looksLikeAbsoluteUrl(n){try{return new URL(n),!0}catch{return!1}}async function writeFiles$1(n,t,r,{rmRoot:s=!1}={}){const i=resolveFileTree(t,r);s&&await n.isDir(t)&&await n.rmdir(t,{recursive:!0});for(const[a,o]of i)await n.fileExists(dirname(a))||await n.mkdir(dirname(a)),await n.writeFile(a,o)}function resolveFileTree(n,t){return Object.entries(t).flatMap(([r,s])=>{const i=resolvePathUnder(r,n);if(!i)throw new Error(`Invalid file tree path ${JSON.stringify(r)}: it must resolve inside ${JSON.stringify(n)}.`);return s instanceof Uint8Array||typeof s=="string"?[[i,s]]:resolveFileTree(i,s)})}const schema12={properties:{name:{type:"string"},version:{type:"string"},mode:{type:"string",const:"php-extension"},loadWithIniDirective:{$ref:"#/definitions/PHPExtensionLoadDirective",description:"The first directive of the generated startup `.ini` file. Defaults to `extension`; use `zend_extension` for Zend extensions like Xdebug. Use `false` to stage the `.so` without registering it in php.ini."},iniEntries:{type:"object",additionalProperties:{type:"string"},description:"Additional `key=value` lines for the generated startup `.ini` file."},env:{type:"object",additionalProperties:{type:"string"},description:"Environment variables added before the extension is loaded."},extensionDir:{type:"string",description:"VFS directory where PHP.wasm writes the extension `.so` file and its per-extension ini file. Defaults to `PHP_EXTENSIONS_DIR`."},artifacts:{type:"array",items:{type:"object",properties:{phpVersion:{type:"string",description:"PHP major/minor version, e.g. `8.4`."},sourcePath:{type:"string",description:"Relative to the manifest URL/base URL, or an absolute URL."},extraFiles:{$ref:"#/definitions/PHPExtensionManifestExtraFiles",description:"URL-backed files needed only by this artifact."}},required:["phpVersion","sourcePath"],additionalProperties:!1}},extraFiles:{$ref:"#/definitions/PHPExtensionManifestExtraFiles",description:"URL-backed files shared by every artifact in this manifest."}}},schema15={properties:{nodes:{items:{properties:{type:{enum:["file","directory"]}}}}}},func2=Object.prototype.hasOwnProperty,schema14={enum:["extension","zend_extension"]};function validate12(n,{instancePath:t="",parentData:r,parentDataProperty:s,rootData:i=n}={}){let a=null,o=0;const l=o;let u=!1;const c=o;if(typeof n!="string"){const p={instancePath:t,schemaPath:"#/definitions/PHPExtensionIniDirective/type",keyword:"type",params:{type:"string"},message:"must be string"};a===null?a=[p]:a.push(p),o++}if(!(n==="extension"||n==="zend_extension")){const p={instancePath:t,schemaPath:"#/definitions/PHPExtensionIniDirective/enum",keyword:"enum",params:{allowedValues:schema14.enum},message:"must be equal to one of the allowed values"};a===null?a=[p]:a.push(p),o++}var d=c===o;if(u=u||d,!u){const p=o;if(typeof n!="boolean"){const g={instancePath:t,schemaPath:"#/anyOf/1/type",keyword:"type",params:{type:"boolean"},message:"must be boolean"};a===null?a=[g]:a.push(g),o++}if(n!==!1){const g={instancePath:t,schemaPath:"#/anyOf/1/const",keyword:"const",params:{allowedValue:!1},message:"must be equal to constant"};a===null?a=[g]:a.push(g),o++}var d=p===o;u=u||d}if(u)o=l,a!==null&&(l?a.length=l:a=null);else{const p={instancePath:t,schemaPath:"#/anyOf",keyword:"anyOf",params:{},message:"must match a schema in anyOf"};return a===null?a=[p]:a.push(p),o++,validate12.errors=a,!1}return validate12.errors=a,o===0}function validate11(n,{instancePath:t="",parentData:r,parentDataProperty:s,rootData:i=n}={}){let a=null,o=0;if(o===0)if(n&&typeof n=="object"&&!Array.isArray(n)){let w;if(n.name===void 0&&(w="name")||n.artifacts===void 0&&(w="artifacts"))return validate11.errors=[{instancePath:t,schemaPath:"#/required",keyword:"required",params:{missingProperty:w},message:"must have required property '"+w+"'"}],!1;{const T=o;for(const E in n)if(!func2.call(schema12.properties,E))return validate11.errors=[{instancePath:t,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty:E},message:"must NOT have additional properties"}],!1;if(T===o){if(n.name!==void 0){const E=o;if(typeof n.name!="string")return validate11.errors=[{instancePath:t+"/name",schemaPath:"#/properties/name/type",keyword:"type",params:{type:"string"},message:"must be string"}],!1;var l=E===o}else var l=!0;if(l){if(n.version!==void 0){const E=o;if(typeof n.version!="string")return validate11.errors=[{instancePath:t+"/version",schemaPath:"#/properties/version/type",keyword:"type",params:{type:"string"},message:"must be string"}],!1;var l=E===o}else var l=!0;if(l){if(n.mode!==void 0){let E=n.mode;const b=o;if(typeof E!="string")return validate11.errors=[{instancePath:t+"/mode",schemaPath:"#/properties/mode/type",keyword:"type",params:{type:"string"},message:"must be string"}],!1;if(E!=="php-extension")return validate11.errors=[{instancePath:t+"/mode",schemaPath:"#/properties/mode/const",keyword:"const",params:{allowedValue:"php-extension"},message:"must be equal to constant"}],!1;var l=b===o}else var l=!0;if(l){if(n.loadWithIniDirective!==void 0){const E=o;validate12(n.loadWithIniDirective,{instancePath:t+"/loadWithIniDirective",parentData:n,parentDataProperty:"loadWithIniDirective",rootData:i})||(a=a===null?validate12.errors:a.concat(validate12.errors),o=a.length);var l=E===o}else var l=!0;if(l){if(n.iniEntries!==void 0){let E=n.iniEntries;const b=o;if(o===b)if(E&&typeof E=="object"&&!Array.isArray(E))for(const A in E){const v=o;if(typeof E[A]!="string")return validate11.errors=[{instancePath:t+"/iniEntries/"+A.replace(/~/g,"~0").replace(/\//g,"~1"),schemaPath:"#/properties/iniEntries/additionalProperties/type",keyword:"type",params:{type:"string"},message:"must be string"}],!1;var u=v===o;if(!u)break}else return validate11.errors=[{instancePath:t+"/iniEntries",schemaPath:"#/properties/iniEntries/type",keyword:"type",params:{type:"object"},message:"must be object"}],!1;var l=b===o}else var l=!0;if(l){if(n.env!==void 0){let E=n.env;const b=o;if(o===b)if(E&&typeof E=="object"&&!Array.isArray(E))for(const A in E){const v=o;if(typeof E[A]!="string")return validate11.errors=[{instancePath:t+"/env/"+A.replace(/~/g,"~0").replace(/\//g,"~1"),schemaPath:"#/properties/env/additionalProperties/type",keyword:"type",params:{type:"string"},message:"must be string"}],!1;var c=v===o;if(!c)break}else return validate11.errors=[{instancePath:t+"/env",schemaPath:"#/properties/env/type",keyword:"type",params:{type:"object"},message:"must be object"}],!1;var l=b===o}else var l=!0;if(l){if(n.extensionDir!==void 0){const E=o;if(typeof n.extensionDir!="string")return validate11.errors=[{instancePath:t+"/extensionDir",schemaPath:"#/properties/extensionDir/type",keyword:"type",params:{type:"string"},message:"must be string"}],!1;var l=E===o}else var l=!0;if(l){if(n.artifacts!==void 0){let E=n.artifacts;const b=o;if(o===b)if(Array.isArray(E)){var d=!0;const A=E.length;for(let v=0;v<A;v++){let x=E[v];const L=o;if(o===L)if(x&&typeof x=="object"&&!Array.isArray(x)){let H;if(x.phpVersion===void 0&&(H="phpVersion")||x.sourcePath===void 0&&(H="sourcePath"))return validate11.errors=[{instancePath:t+"/artifacts/"+v,schemaPath:"#/properties/artifacts/items/required",keyword:"required",params:{missingProperty:H},message:"must have required property '"+H+"'"}],!1;{const C=o;for(const O in x)if(!(O==="phpVersion"||O==="sourcePath"||O==="extraFiles"))return validate11.errors=[{instancePath:t+"/artifacts/"+v,schemaPath:"#/properties/artifacts/items/additionalProperties",keyword:"additionalProperties",params:{additionalProperty:O},message:"must NOT have additional properties"}],!1;if(C===o){if(x.phpVersion!==void 0){const O=o;if(typeof x.phpVersion!="string")return validate11.errors=[{instancePath:t+"/artifacts/"+v+"/phpVersion",schemaPath:"#/properties/artifacts/items/properties/phpVersion/type",keyword:"type",params:{type:"string"},message:"must be string"}],!1;var p=O===o}else var p=!0;if(p){if(x.sourcePath!==void 0){const O=o;if(typeof x.sourcePath!="string")return validate11.errors=[{instancePath:t+"/artifacts/"+v+"/sourcePath",schemaPath:"#/properties/artifacts/items/properties/sourcePath/type",keyword:"type",params:{type:"string"},message:"must be string"}],!1;var p=O===o}else var p=!0;if(p)if(x.extraFiles!==void 0){let O=x.extraFiles;const F=o;if(o===o)if(O&&typeof O=="object"&&!Array.isArray(O)){const j=o;for(const G in O)if(!(G==="vfsRoot"||G==="nodes"))return validate11.errors=[{instancePath:t+"/artifacts/"+v+"/extraFiles",schemaPath:"#/definitions/PHPExtensionManifestExtraFiles/additionalProperties",keyword:"additionalProperties",params:{additionalProperty:G},message:"must NOT have additional properties"}],!1;if(j===o){if(O.vfsRoot!==void 0){const G=o;if(typeof O.vfsRoot!="string")return validate11.errors=[{instancePath:t+"/artifacts/"+v+"/extraFiles/vfsRoot",schemaPath:"#/definitions/PHPExtensionManifestExtraFiles/properties/vfsRoot/type",keyword:"type",params:{type:"string"},message:"must be string"}],!1;var f=G===o}else var f=!0;if(f)if(O.nodes!==void 0){let G=O.nodes;const U=o;if(o===U)if(Array.isArray(G)){var g=!0;const W=G.length;for(let M=0;M<W;M++){let V=G[M];const z=o;if(o===z)if(V&&typeof V=="object"&&!Array.isArray(V)){let se;if(V.vfsPath===void 0&&(se="vfsPath"))return validate11.errors=[{instancePath:t+"/artifacts/"+v+"/extraFiles/nodes/"+M,schemaPath:"#/definitions/PHPExtensionManifestExtraFiles/properties/nodes/items/required",keyword:"required",params:{missingProperty:se},message:"must have required property '"+se+"'"}],!1;{const oe=o;for(const Q in V)if(!(Q==="vfsPath"||Q==="type"||Q==="sourcePath"))return validate11.errors=[{instancePath:t+"/artifacts/"+v+"/extraFiles/nodes/"+M,schemaPath:"#/definitions/PHPExtensionManifestExtraFiles/properties/nodes/items/additionalProperties",keyword:"additionalProperties",params:{additionalProperty:Q},message:"must NOT have additional properties"}],!1;if(oe===o){if(V.vfsPath!==void 0){const Q=o;if(typeof V.vfsPath!="string")return validate11.errors=[{instancePath:t+"/artifacts/"+v+"/extraFiles/nodes/"+M+"/vfsPath",schemaPath:"#/definitions/PHPExtensionManifestExtraFiles/properties/nodes/items/properties/vfsPath/type",keyword:"type",params:{type:"string"},message:"must be string"}],!1;var y=Q===o}else var y=!0;if(y){if(V.type!==void 0){let Q=V.type;const le=o;if(typeof Q!="string")return validate11.errors=[{instancePath:t+"/artifacts/"+v+"/extraFiles/nodes/"+M+"/type",schemaPath:"#/definitions/PHPExtensionManifestExtraFiles/properties/nodes/items/properties/type/type",keyword:"type",params:{type:"string"},message:"must be string"}],!1;if(!(Q==="file"||Q==="directory"))return validate11.errors=[{instancePath:t+"/artifacts/"+v+"/extraFiles/nodes/"+M+"/type",schemaPath:"#/definitions/PHPExtensionManifestExtraFiles/properties/nodes/items/properties/type/enum",keyword:"enum",params:{allowedValues:schema15.properties.nodes.items.properties.type.enum},message:"must be equal to one of the allowed values"}],!1;var y=le===o}else var y=!0;if(y)if(V.sourcePath!==void 0){const Q=o;if(typeof V.sourcePath!="string")return validate11.errors=[{instancePath:t+"/artifacts/"+v+"/extraFiles/nodes/"+M+"/sourcePath",schemaPath:"#/definitions/PHPExtensionManifestExtraFiles/properties/nodes/items/properties/sourcePath/type",keyword:"type",params:{type:"string"},message:"must be string"}],!1;var y=Q===o}else var y=!0}}}}else return validate11.errors=[{instancePath:t+"/artifacts/"+v+"/extraFiles/nodes/"+M,schemaPath:"#/definitions/PHPExtensionManifestExtraFiles/properties/nodes/items/type",keyword:"type",params:{type:"object"},message:"must be object"}],!1;var g=z===o;if(!g)break}}else return validate11.errors=[{instancePath:t+"/artifacts/"+v+"/extraFiles/nodes",schemaPath:"#/definitions/PHPExtensionManifestExtraFiles/properties/nodes/type",keyword:"type",params:{type:"array"},message:"must be array"}],!1;var f=U===o}else var f=!0}}else return validate11.errors=[{instancePath:t+"/artifacts/"+v+"/extraFiles",schemaPath:"#/definitions/PHPExtensionManifestExtraFiles/type",keyword:"type",params:{type:"object"},message:"must be object"}],!1;var p=F===o}else var p=!0}}}}else return validate11.errors=[{instancePath:t+"/artifacts/"+v,schemaPath:"#/properties/artifacts/items/type",keyword:"type",params:{type:"object"},message:"must be object"}],!1;var d=L===o;if(!d)break}}else return validate11.errors=[{instancePath:t+"/artifacts",schemaPath:"#/properties/artifacts/type",keyword:"type",params:{type:"array"},message:"must be array"}],!1;var l=b===o}else var l=!0;if(l)if(n.extraFiles!==void 0){let E=n.extraFiles;const b=o;if(o===o)if(E&&typeof E=="object"&&!Array.isArray(E)){const v=o;for(const x in E)if(!(x==="vfsRoot"||x==="nodes"))return validate11.errors=[{instancePath:t+"/extraFiles",schemaPath:"#/definitions/PHPExtensionManifestExtraFiles/additionalProperties",keyword:"additionalProperties",params:{additionalProperty:x},message:"must NOT have additional properties"}],!1;if(v===o){if(E.vfsRoot!==void 0){const x=o;if(typeof E.vfsRoot!="string")return validate11.errors=[{instancePath:t+"/extraFiles/vfsRoot",schemaPath:"#/definitions/PHPExtensionManifestExtraFiles/properties/vfsRoot/type",keyword:"type",params:{type:"string"},message:"must be string"}],!1;var _=x===o}else var _=!0;if(_)if(E.nodes!==void 0){let x=E.nodes;const L=o;if(o===L)if(Array.isArray(x)){var h=!0;const H=x.length;for(let C=0;C<H;C++){let O=x[C];const F=o;if(o===F)if(O&&typeof O=="object"&&!Array.isArray(O)){let q;if(O.vfsPath===void 0&&(q="vfsPath"))return validate11.errors=[{instancePath:t+"/extraFiles/nodes/"+C,schemaPath:"#/definitions/PHPExtensionManifestExtraFiles/properties/nodes/items/required",keyword:"required",params:{missingProperty:q},message:"must have required property '"+q+"'"}],!1;{const j=o;for(const G in O)if(!(G==="vfsPath"||G==="type"||G==="sourcePath"))return validate11.errors=[{instancePath:t+"/extraFiles/nodes/"+C,schemaPath:"#/definitions/PHPExtensionManifestExtraFiles/properties/nodes/items/additionalProperties",keyword:"additionalProperties",params:{additionalProperty:G},message:"must NOT have additional properties"}],!1;if(j===o){if(O.vfsPath!==void 0){const G=o;if(typeof O.vfsPath!="string")return validate11.errors=[{instancePath:t+"/extraFiles/nodes/"+C+"/vfsPath",schemaPath:"#/definitions/PHPExtensionManifestExtraFiles/properties/nodes/items/properties/vfsPath/type",keyword:"type",params:{type:"string"},message:"must be string"}],!1;var m=G===o}else var m=!0;if(m){if(O.type!==void 0){let G=O.type;const U=o;if(typeof G!="string")return validate11.errors=[{instancePath:t+"/extraFiles/nodes/"+C+"/type",schemaPath:"#/definitions/PHPExtensionManifestExtraFiles/properties/nodes/items/properties/type/type",keyword:"type",params:{type:"string"},message:"must be string"}],!1;if(!(G==="file"||G==="directory"))return validate11.errors=[{instancePath:t+"/extraFiles/nodes/"+C+"/type",schemaPath:"#/definitions/PHPExtensionManifestExtraFiles/properties/nodes/items/properties/type/enum",keyword:"enum",params:{allowedValues:schema15.properties.nodes.items.properties.type.enum},message:"must be equal to one of the allowed values"}],!1;var m=U===o}else var m=!0;if(m)if(O.sourcePath!==void 0){const G=o;if(typeof O.sourcePath!="string")return validate11.errors=[{instancePath:t+"/extraFiles/nodes/"+C+"/sourcePath",schemaPath:"#/definitions/PHPExtensionManifestExtraFiles/properties/nodes/items/properties/sourcePath/type",keyword:"type",params:{type:"string"},message:"must be string"}],!1;var m=G===o}else var m=!0}}}}else return validate11.errors=[{instancePath:t+"/extraFiles/nodes/"+C,schemaPath:"#/definitions/PHPExtensionManifestExtraFiles/properties/nodes/items/type",keyword:"type",params:{type:"object"},message:"must be object"}],!1;var h=F===o;if(!h)break}}else return validate11.errors=[{instancePath:t+"/extraFiles/nodes",schemaPath:"#/definitions/PHPExtensionManifestExtraFiles/properties/nodes/type",keyword:"type",params:{type:"array"},message:"must be array"}],!1;var _=L===o}else var _=!0}}else return validate11.errors=[{instancePath:t+"/extraFiles",schemaPath:"#/definitions/PHPExtensionManifestExtraFiles/type",keyword:"type",params:{type:"object"},message:"must be object"}],!1;var l=b===o}else var l=!0}}}}}}}}}}else return validate11.errors=[{instancePath:t,schemaPath:"#/type",keyword:"type",params:{type:"object"},message:"must be object"}],!1;return validate11.errors=a,o===0}function validate10(n,{instancePath:t="",parentData:r,parentDataProperty:s,rootData:i=n}={}){let a=null,o=0;return validate11(n,{instancePath:t,parentData:r,parentDataProperty:s,rootData:i})||(a=a===null?validate11.errors:a.concat(validate11.errors),o=a.length),validate10.errors=a,o===0}const PHP_EXTENSIONS_DIR="/internal/shared/extensions",MAX_EXTENSION_SIDECAR_FILE_REQUESTS=5;async function resolvePHPExtension(n){const t=n.fetch??globalThis.fetch,r=n.source;let s=n.name,i;const a={},o=[];let l,u,c,d;if(r.format==="so"){if(s||(s=r.name),!s)throw new Error("name is required when loading an extension from direct bytes.");i=toUint8Array(r.bytes)}else if(r.format==="url"){let m;try{m=new URL(String(r.url))}catch{throw new Error(`source.url must be an absolute URL when loading a PHP extension from a direct URL. Received: ${String(r.url)}`)}if(s||(s=r.name),!s&&m.pathname.endsWith(".so")&&(s=basename(m.pathname).slice(0,-3)),!s)throw new Error("name is required when loading an extension from a direct URL.");i=await fetchBytes(t,m)}else{let m,w;if("manifest"in r?(m=r.manifest,r.baseUrl&&(w=new URL(String(r.baseUrl)))):(w=new URL(String(r.manifestUrl)),m=await(await t(w)).json()),!validate10(m))throw new Error(`Invalid PHP extension manifest: ${JSON.stringify(validate10.errors)}`);const T=m;if(!w)throw new Error("Manifest artifacts require a manifest URL or baseUrl so relative files can be resolved.");const E=T.artifacts.find(v=>v.phpVersion===n.phpVersion);if(!E)throw new Error(`No extension artifact found for PHP ${n.phpVersion}.`);s??=T.name,l=T.loadWithIniDirective,u=T.iniEntries,c=T.env,d=T.extensionDir;const b=new Semaphore({concurrency:MAX_EXTENSION_SIDECAR_FILE_REQUESTS}),S=[];for(const v of[T.extraFiles,E.extraFiles])for(const x of v?.nodes??[]){const L=joinPaths(v.vfsRoot??"",x.vfsPath);if(x.type==="directory"){o.push(L);continue}if(!x.sourcePath)continue;const D=new URL(x.sourcePath,w);S.push(b.run(()=>fetchBytes(t,D)).then(H=>{a[L]=H}))}const[A]=await Promise.all([fetchBytes(t,new URL(E.sourcePath,w)),...S]);i=A}const p=normalizePath$1(n.extensionDir??d??PHP_EXTENSIONS_DIR);n.extraFiles&&(Object.assign(a,n.extraFiles.files),o.push(...n.extraFiles.directories??[]));const f=n.loadWithIniDirective??l??"extension",g={...u,...n.iniEntries},y=joinPaths(p,`${s}.so`),_=createPHPExtensionIniFile({directive:f,extensionDir:p,name:s,soPath:y,iniEntries:g}),h={...c,...n.env};return{soPath:y,soBytes:i,..._,extraFiles:{files:a,directories:o},env:Object.keys(h).length?h:void 0,extensionDir:p}}function withResolvedPHPExtensions(n,t){if(!t.length)return n;const r={...n.ENV};for(const i of t){if(Object.assign(r,i.env),!i.iniPath)continue;const a=r.PHP_INI_SCAN_DIR?.split(":")??[];a.includes(i.extensionDir)||(a.push(i.extensionDir),r.PHP_INI_SCAN_DIR=a.join(":"))}const s=n.preRun??[];return{...n,ENV:r,preRun:[...s,i=>{for(const a of t)installPHPExtensionFilesSync(i.FS,a)}]}}function installPHPExtensionFilesSync(n,t){let r;if("soPath"in t)r=t;else{const s=t.extensionDir??PHP_EXTENSIONS_DIR,i=t.loadWithIniDirective??"extension",a=joinPaths(s,`${t.name}.so`),o=createPHPExtensionIniFile({directive:i,extensionDir:s,name:t.name,soPath:a,iniEntries:t.iniEntries});r={soPath:a,soBytes:toUint8Array(t.soBytes),...o,extraFiles:t.extraFiles,env:t.env,extensionDir:s}}if(mkdirIfMissing(n,r.extensionDir),n.writeFile(r.soPath,r.soBytes),r.iniPath&&r.iniContent!==void 0&&n.writeFile(r.iniPath,r.iniContent),r.extraFiles){const{directories:s=[],files:i}=r.extraFiles;for(const a of s)mkdirIfMissing(n,a);for(const[a,o]of Object.entries(i))mkdirIfMissing(n,dirname(a)),n.writeFile(a,o)}return r}function createPHPExtensionIniFile(n){if(n.directive===!1)return{};const t=[`${n.directive}=${n.soPath}`,...Object.entries(n.iniEntries??{}).map(([r,s])=>`${r}=${s}`)];return{iniPath:joinPaths(n.extensionDir,`${n.name}.ini`),iniContent:t.join(`
`)}}function mkdirIfMissing(n,t){FSHelpers.fileExists(n,t)||n.mkdirTree(t)}async function fetchBytes(n,t){const r=await n(t);if(!r.ok)throw new Error(`Failed to fetch ${String(t)}: ${r.status}`);return new Uint8Array(await r.arrayBuffer())}function toUint8Array(n){return n instanceof Uint8Array?n:new Uint8Array(n)}function isLegacyPhpInstance(n){const t=Object.getOwnPropertySymbols(n)[0],s=n[t]?.phpVersion?.major;return typeof s=="number"&&s<7}function ensureProxyFSHasMmapSupport(n){const t=Object.getOwnPropertySymbols(n)[0],r=n[t],s=r.PROXYFS,i=r.FS;s.stream_ops.mmap||(s.stream_ops.mmap=function(a,o,l,u,c){if(!i.isFile(a.node.mode))throw new i.ErrnoError(19);if(l!==0)throw new i.ErrnoError(22);const d=r.malloc(o);if(!d)throw new i.ErrnoError(48);const p=r.HEAPU8.subarray(d,d+o);let f=0;for(;f<o;){const g=a.stream_ops.read(a,p,f,o-f,f);if(g<=0)break;f+=g}if(f!==o)throw r.free(d),new i.ErrnoError(5);return{ptr:d,allocated:!0}},s.stream_ops.msync=function(a,o,l,u,c){return c&2||a.stream_ops.write(a,o,l,u,l,!1),0})}async function proxyFileSystem(n,t,r){const s=isLegacyPhpInstance(t),i=Object.getOwnPropertySymbols(n)[0];for(const a of r)n.fileExists(a)||n.mkdir(a),t.mkdir(a),await t.mount(a,o=>{s||ensureProxyFSHasMmapSupport(o);const l=Object.getOwnPropertySymbols(o)[0];return o[l].FS.mount(o[l].PROXYFS,{root:a,fs:n[i].FS},a),()=>{try{o[l].FS.unmount(a)}catch{}}});t.addEventListener("request.end",()=>{n.dispatchEvent({type:"proxyfs.request.end"})})}function isPathToSharedFS(n,t){const r=Object.getOwnPropertySymbols(n)[0];return n[r].FS.lookupPath(t,{noent_okay:!0})?.node?.isSharedFS??!1}function sandboxedSpawnHandlerFactory(n){return createSpawnHandler(async function(t,r,s){r.notifySpawn(),t?.[0]==="/bin/sh"&&t?.[1]==="-c"&&typeof t[2]=="string"&&(t=splitShellCommand$1(t[2])),t[0]==="exec"&&t.shift(),(t[0].endsWith(".php")||t[0].endsWith(".phar"))&&t.unshift("php");const i=t[0].split("/").pop();if(t[0]==="/usr/bin/env"&&t[1]==="stty"&&t[2]==="size")r.stdout("18 140"),r.exit(0);else if(i==="tput"&&t[1]==="cols")r.stdout("140"),r.exit(0);else if(i==="less"){r.on("stdin",l=>{r.stdout(l)}),await new Promise(l=>{r.childProcess.stdin.on("finish",()=>{l(!0)})}),r.exit(0);return}if(!["php","ls","pwd"].includes(i??"")){r.exit(127);return}if(!n){logger.warn("Tried to spawn a PHP subprocess, but the sandboxed spawn handler was created without a getPHPInstance function."),r.exit(127);return}const{php:a,reap:o}=await n();try{s.cwd&&await a.chdir(s.cwd);const l=await a.cwd();switch(i){case"php":{const u=await a.cli(t,{env:{...s.env,SCRIPT_PATH:t[1],SHELL_PIPE:"0"}});u.stdout.pipeTo(new WritableStream({write(c){r.stdout(c)}})),u.stderr.pipeTo(new WritableStream({write(c){r.stderr(c)}})),r.exit(await u.exitCode);break}case"ls":{const u=await a.listFiles(t[1]??l);for(const c of u)r.stdout(c+`
`);await new Promise(c=>setTimeout(c,10)),r.exit(0);break}case"pwd":{r.stdout(l+`
`),await new Promise(u=>setTimeout(u,10)),r.exit(0);break}}}catch(l){const u=l instanceof Error?l.message+`
`+l.stack:typeof l=="object"&&l!==null?JSON.stringify(l,Object.getOwnPropertyNames(l)):String(l);throw r.stderr(`[spawn error] ${u}`),r.exit(1),l}finally{o()}})}/**
 * Original, unmodified Comlink library from Google:
 *
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */const proxyMarker=Symbol("Comlink.proxy"),createEndpoint=Symbol("Comlink.endpoint"),releaseProxy=Symbol("Comlink.releaseProxy"),finalizer=Symbol("Comlink.finalizer"),throwMarker=Symbol("Comlink.thrown");/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */const WireValueType={RAW:"RAW",HANDLER:"HANDLER"},MessageType={GET:"GET",SET:"SET",APPLY:"APPLY",CONSTRUCT:"CONSTRUCT",ENDPOINT:"ENDPOINT",RELEASE:"RELEASE"},isObject=n=>typeof n=="object"&&n!==null||typeof n=="function",proxyTransferHandler={canHandle:n=>isObject(n)&&n[proxyMarker],serialize(n){const{port1:t,port2:r}=new MessageChannel;return expose(n,t),[r,[r]]},deserialize(n){return n.start(),wrap(n)}},throwTransferHandler$1={canHandle:n=>isObject(n)&&throwMarker in n,serialize({value:n}){let t;return n instanceof Error?t={isError:!0,value:{message:n.message,name:n.name,stack:n.stack}}:t={isError:!1,value:n},[t,[]]},deserialize(n){throw n.isError?Object.assign(new Error(n.value.message),n.value):n.value}},transferHandlers=new Map([["proxy",proxyTransferHandler],["throw",throwTransferHandler$1]]);function isAllowedOrigin(n,t){for(const r of n)if(t===r||r==="*"||r instanceof RegExp&&r.test(t))return!0;return!1}function expose(n,t=globalThis,r=["*"],s){t.addEventListener("message",function i(a){if(!a||!a.data)return;if(!isAllowedOrigin(r,a.origin)){console.warn(`Invalid origin '${a.origin}' for comlink proxy`);return}const{id:o,type:l,path:u}={path:[],...a.data},c=(a.data.argumentList||[]).map(fromWireValue);let d;try{const p=u.slice(0,-1).reduce((g,y)=>g[y],n),f=u.reduce((g,y)=>g[y],n);switch(l){case MessageType.GET:d=f;break;case MessageType.SET:p[u.slice(-1)[0]]=fromWireValue(a.data.value),d=!0;break;case MessageType.APPLY:d=f.apply(p,c);break;case MessageType.CONSTRUCT:{const g=new f(...c);d=proxy(g)}break;case MessageType.ENDPOINT:{const{port1:g,port2:y}=new MessageChannel;expose(n,y),d=transfer(g,[g])}break;case MessageType.RELEASE:d=void 0;break;default:return}}catch(p){d={value:p,[throwMarker]:0}}Promise.resolve(d).catch(p=>({value:p,[throwMarker]:0})).then(p=>{const[f,g]=toWireValue(p);t.postMessage({...f,id:o},g),l===MessageType.RELEASE&&(t.removeEventListener("message",i),closeEndPoint(t),finalizer in n&&typeof n[finalizer]=="function"&&n[finalizer]())}).catch(()=>{const[p,f]=toWireValue({value:new TypeError("Unserializable return value"),[throwMarker]:0});t.postMessage({...p,id:o},f)}).finally(()=>{})}),t.start&&t.start()}function isMessagePort(n){return n.constructor.name==="MessagePort"}function closeEndPoint(n){isMessagePort(n)&&n.close()}function wrap(n,t){const r=new Map;return n.addEventListener("message",function(i){const{data:a}=i;if(!a||!a.id)return;const o=r.get(a.id);if(o)try{o(a)}finally{r.delete(a.id)}}),createProxy(n,r,[],t)}function throwIfProxyReleased(n){if(n)throw new Error("Proxy has been released and is not useable")}function releaseEndpoint(n){return requestResponseMessage(n,new Map,{type:MessageType.RELEASE}).then(()=>{closeEndPoint(n)})}const proxyCounter=new WeakMap,proxyFinalizers="FinalizationRegistry"in globalThis&&new FinalizationRegistry(n=>{const t=(proxyCounter.get(n)||0)-1;proxyCounter.set(n,t),t===0&&releaseEndpoint(n)});function registerProxy(n,t){const r=(proxyCounter.get(t)||0)+1;proxyCounter.set(t,r),proxyFinalizers&&proxyFinalizers.register(n,t,n)}function unregisterProxy(n){proxyFinalizers&&proxyFinalizers.unregister(n)}function createProxy(n,t,r=[],s=function(){}){let i=!1;const a=new Proxy(s,{get(o,l){if(throwIfProxyReleased(i),l===releaseProxy)return()=>{unregisterProxy(a),releaseEndpoint(n),t.clear(),i=!0};if(l==="then"){if(r.length===0)return{then:()=>a};const u=requestResponseMessage(n,t,{type:MessageType.GET,path:r.map(c=>c.toString())}).then(fromWireValue);return u.then.bind(u)}return createProxy(n,t,[...r,l])},set(o,l,u){throwIfProxyReleased(i);const[c,d]=toWireValue(u);return requestResponseMessage(n,t,{type:MessageType.SET,path:[...r,l].map(p=>p.toString()),value:c},d).then(fromWireValue)},apply(o,l,u){throwIfProxyReleased(i);const c=r[r.length-1];if(c===createEndpoint)return requestResponseMessage(n,t,{type:MessageType.ENDPOINT}).then(fromWireValue);if(c==="bind")return createProxy(n,t,r.slice(0,-1));const[d,p]=processArguments(u);return requestResponseMessage(n,t,{type:MessageType.APPLY,path:r.map(f=>f.toString()),argumentList:d},p).then(fromWireValue)},construct(o,l){throwIfProxyReleased(i);const[u,c]=processArguments(l);return requestResponseMessage(n,t,{type:MessageType.CONSTRUCT,path:r.map(d=>d.toString()),argumentList:u},c).then(fromWireValue)}});return registerProxy(a,n),a}function myFlat(n){return Array.prototype.concat.apply([],n)}function processArguments(n){const t=n.map(toWireValue);return[t.map(r=>r[0]),myFlat(t.map(r=>r[1]))]}const transferCache=new WeakMap;function transfer(n,t){return transferCache.set(n,t),n}function proxy(n){return Object.assign(n,{[proxyMarker]:!0})}function windowEndpoint(n,t=globalThis,r="*"){return{postMessage:(s,i)=>n.postMessage(s,r,i),addEventListener:t.addEventListener.bind(t),removeEventListener:t.removeEventListener.bind(t)}}function toWireValue(n){for(const[t,r]of transferHandlers)if(r.canHandle(n)){const[s,i]=r.serialize(n);return[{type:WireValueType.HANDLER,name:t,value:s},i]}return[{type:WireValueType.RAW,value:n},transferCache.get(n)||[]]}function fromWireValue(n){switch(n.type){case WireValueType.HANDLER:return transferHandlers.get(n.name).deserialize(n.value);case WireValueType.RAW:return n.value}}function requestResponseMessage(n,t,r,s){return new Promise(i=>{const a=generateUUID();t.set(a,i),n.start&&n.start(),n.postMessage({id:a,...r},s)})}function generateUUID(){return new Array(4).fill(0).map(()=>Math.floor(Math.random()*Number.MAX_SAFE_INTEGER).toString(16)).join("-")}const list=[Error,EvalError,RangeError,ReferenceError,SyntaxError,TypeError,URIError,AggregateError,globalThis.DOMException,globalThis.AssertionError,globalThis.SystemError].filter(Boolean).map(n=>[n.name,n]),errorConstructors=new Map(list);class NonError extends Error{constructor(t){super(NonError._prepareSuperMessage(t)),this.name="NonError"}static _prepareSuperMessage(t){try{return JSON.stringify(t)}catch{return String(t)}}}const errorProperties=[{property:"name",enumerable:!1},{property:"message",enumerable:!1},{property:"stack",enumerable:!1},{property:"code",enumerable:!0},{property:"cause",enumerable:!1},{property:"errors",enumerable:!1}],toJsonWasCalled=new WeakSet,toJSON=n=>{toJsonWasCalled.add(n);const t=n.toJSON();return toJsonWasCalled.delete(n),t},newError=n=>{const t=errorConstructors.get(n)??Error;return t===AggregateError?new t([]):new t},destroyCircular=({from:n,seen:t,to:r,forceEnumerable:s,maxDepth:i,depth:a,useToJSON:o,serialize:l})=>{if(r||(Array.isArray(n)?r=[]:!l&&isErrorLike(n)?r=newError(n.name):r={}),t.push(n),a>=i)return r;if(o&&typeof n.toJSON=="function"&&!toJsonWasCalled.has(n))return toJSON(n);const u=c=>destroyCircular({from:c,seen:[...t],forceEnumerable:s,maxDepth:i,depth:a,useToJSON:o,serialize:l});for(const[c,d]of Object.entries(n)){if(d&&d instanceof Uint8Array&&d.constructor.name==="Buffer"){r[c]="[object Buffer]";continue}if(d!==null&&typeof d=="object"&&typeof d.pipe=="function"){r[c]="[object Stream]";continue}if(typeof d!="function"){if(!d||typeof d!="object"){try{r[c]=d}catch{}continue}if(!t.includes(n[c])){a++,r[c]=u(n[c]);continue}r[c]="[Circular]"}}if(l||r instanceof Error)for(const{property:c,enumerable:d}of errorProperties)n[c]!==void 0&&n[c]!==null&&Object.defineProperty(r,c,{value:isErrorLike(n[c])||Array.isArray(n[c])?u(n[c]):n[c],enumerable:s?!0:d,configurable:!0,writable:!0});return r};function serializeError(n,t={}){const{maxDepth:r=Number.POSITIVE_INFINITY,useToJSON:s=!0}=t;return typeof n=="object"&&n!==null?destroyCircular({from:n,seen:[],forceEnumerable:!0,maxDepth:r,depth:0,useToJSON:s,serialize:!0}):typeof n=="function"?`[Function: ${n.name||"anonymous"}]`:n}function deserializeError(n,t={}){const{maxDepth:r=Number.POSITIVE_INFINITY}=t;return n instanceof Error?n:isMinimumViableSerializedError(n)?destroyCircular({from:n,seen:[],to:newError(n.name),maxDepth:r,depth:0,serialize:!1}):new NonError(n)}function isErrorLike(n){return!!n&&typeof n=="object"&&typeof n.name=="string"&&typeof n.message=="string"&&typeof n.stack=="string"}function isMinimumViableSerializedError(n){return!!n&&typeof n=="object"&&typeof n.message=="string"&&!Array.isArray(n)}function exposeAPI(n,t,r){const{setReady:s,setFailed:i,exposedApi:a}=prepareForExpose(n,t);let o;return o=typeof window<"u"?windowEndpoint(self.parent):void 0,expose(a,o),[s,i,a]}function prepareForExpose(n,t){setupTransferHandlers();const r=Promise.resolve();let s,i;const a=new Promise((u,c)=>{s=u,i=c}),o=proxyClone(n),l=new Proxy(o,{get:(u,c)=>c==="isConnected"?()=>r:c==="isReady"?()=>a:c in u?u[c]:t?.[c]});return{setReady:s,setFailed:i,exposedApi:l}}let isTransferHandlersSetup=!1;function setupTransferHandlers(){if(isTransferHandlersSetup)return;isTransferHandlersSetup=!0,transferHandlers.set("EVENT",{canHandle:i=>i instanceof CustomEvent,serialize:i=>[{detail:i.detail},[]],deserialize:i=>i}),transferHandlers.set("FUNCTION",{canHandle:i=>typeof i=="function",serialize(i){const{port1:a,port2:o}=new MessageChannel;return expose(i,a),[o,[o]]},deserialize(i){return i.start(),wrap(i)}}),transferHandlers.set("MESSAGE_PORT",{canHandle:i=>i instanceof MessagePort,serialize(i){return[i,[i]]},deserialize(i){return i}});const n={canHandle:i=>typeof ReadableStream<"u"&&i instanceof ReadableStream,serialize(i){if(supportsTransferableStreams())return[{stream:i},[i]];const a=streamToPort(i);return[{port:a},[a]]},deserialize(i){return i.stream||portToStream(i.port)}};transferHandlers.set("READABLE_STREAM",n);const t={canHandle:i=>typeof i=="object"&&i!==null&&phpEventStdinTransfer in i&&i[phpEventStdinTransfer]===!0&&"type"in i&&typeof i.type=="string"&&"stdin"in i&&n.canHandle(i.stdin),serialize(i){const[a,o]=n.serialize(i.stdin);return[{...i,stdin:a},o]},deserialize(i){return{...i,stdin:n.deserialize(i.stdin),[phpEventStdinTransfer]:!0}}};transferHandlers.set("EVENT_WITH_READABLE_STDIN",t),transferHandlers.set("PHPResponse",{canHandle:i=>typeof i=="object"&&i!==null&&"headers"in i&&"bytes"in i&&"errors"in i&&"exitCode"in i&&"httpStatusCode"in i,serialize(i){const a=i.toRawData(),o=[];return a.bytes.buffer.byteLength>0&&o.push(a.bytes.buffer),[a,o]},deserialize(i){return PHPResponse.fromRawData(i)}});const r=transferHandlers.get("throw"),s=r?.serialize;r.serialize=({value:i})=>{const a=s({value:i});return i.response&&(a[0].value.response=i.response),i.source&&(a[0].value.source=i.source),a},transferHandlers.set("StreamedPHPResponse",{canHandle:i=>i instanceof StreamedPHPResponse,serialize(i){const a=supportsTransferableStreams(),o=promiseToPort(i.exitCode),l=i.getHeadersStream();if(a)return[{__type:"StreamedPHPResponse",headers:l,stdout:i.stdout,stderr:i.stderr,exitCodePort:o},[l,i.stdout,i.stderr,o]];const u=streamToPort(l),c=streamToPort(i.stdout),d=streamToPort(i.stderr);return[{__type:"StreamedPHPResponse",headersPort:u,stdoutPort:c,stderrPort:d,exitCodePort:o},[u,c,d,o]]},deserialize(i){if(i.headers&&i.stdout&&i.stderr){const c=portToPromise(i.exitCodePort);return new StreamedPHPResponse(i.headers,i.stdout,i.stderr,c)}const a=portToStream(i.headersPort),o=portToStream(i.stdoutPort),l=portToStream(i.stderrPort),u=portToPromise(i.exitCodePort);return new StreamedPHPResponse(a,o,l,u)}})}let _cachedSupportsTransferableStreams;function supportsTransferableStreams(){if(typeof ReadableStream>"u"&&(_cachedSupportsTransferableStreams=!1),_cachedSupportsTransferableStreams===void 0)try{const{port1:n}=new MessageChannel,t=new ReadableStream;n.postMessage(t,[t]);try{n.close()}catch{}_cachedSupportsTransferableStreams=!0}catch{_cachedSupportsTransferableStreams=!1}return _cachedSupportsTransferableStreams}function streamToPort(n){const{port1:t,port2:r}=new MessageChannel,s=n.getReader(),i=a=>{a.data?.t==="cancel"&&s.cancel().catch(()=>{})};return t.addEventListener("message",i),t.start(),(async()=>{try{for(;;){const{done:a,value:o}=await s.read();if(a){try{t.postMessage({t:"close"})}catch{}try{t.close()}catch{}break}if(o){const l=o.slice(),u=l.buffer;try{t.postMessage({t:"chunk",b:u},[u])}catch{t.postMessage({t:"chunk",b:l.buffer.slice(0)})}}}}catch(a){try{t.postMessage({t:"error",m:a?.message||String(a)})}catch{}}finally{t.removeEventListener("message",i);try{t.close()}catch{}}})(),r}function portToStream(n){return new ReadableStream({start(t){const r=i=>{const a=i.data;if(a)switch(a.t){case"chunk":try{t.enqueue(new Uint8Array(a.b))}catch{s()}break;case"close":safeStreamClose(t),s();break;case"error":safeStreamError(t,new Error(a.m||"Stream error")),s();break}},s=()=>{try{n.removeEventListener?.("message",r)}catch{}try{n.onmessage=null}catch{}try{n.close()}catch{}};n.addEventListener?n.addEventListener("message",r):n.on?n.on("message",i=>r({data:i})):n.onmessage=r,typeof n.start=="function"&&n.start()},cancel(){try{n.postMessage({t:"cancel"})}catch{}try{n.close()}catch{}}})}function promiseToPort(n){const{port1:t,port2:r}=new MessageChannel;return n.then(s=>{try{t.postMessage({t:"resolve",v:s})}catch{}}).catch(s=>{try{t.postMessage({t:"reject",m:s?.message||String(s)})}catch{}}).finally(()=>{try{t.close()}catch{}}),r}function portToPromise(n){return new Promise((t,r)=>{const s=a=>{const o=a.data;o&&(o.t==="resolve"?(i(),t(o.v)):o.t==="reject"&&(i(),r(new Error(o.m||""))))},i=()=>{try{n.removeEventListener?.("message",s)}catch{}try{n.onmessage=null}catch{}try{n.close()}catch{}};n.addEventListener?n.addEventListener("message",s):n.on?n.on("message",a=>s({data:a})):n.onmessage=s,typeof n.start=="function"&&n.start()})}const throwTransferHandler=transferHandlers.get("throw"),throwTransferHandlerCustom={canHandle:throwTransferHandler.canHandle,serialize:({value:n})=>{let t;return n instanceof Error?(t={isError:!0,value:serializeError(n)},t.value.originalErrorClassName=n.constructor.name):t={isError:!1,value:n},[t,[]]},deserialize:n=>{if(n.isError){const t=deserializeError(n.value),r=new Error("Comlink method call failed");let s=t;for(;s.cause;)s=s.cause;throw s.cause=r,t}throw n.value}};transferHandlers.set("throw",throwTransferHandlerCustom);function proxyClone(n){return new Proxy(n,{get(t,r){switch(typeof t[r]){case"function":return(...s)=>t[r](...s);case"object":return t[r]===null?t[r]:proxyClone(t[r]);case"undefined":case"number":case"string":return t[r];default:return proxy(t[r])}}})}function safeStreamError(n,t){try{n.error(t)}catch{}}function safeStreamClose(n){try{n.close()}catch{}}BigInt(Number.MAX_SAFE_INTEGER);async function getPHPNextModule(){const n=getPHPNextModuleUrls();let t;for(const r of n)try{return await import(r)}catch(s){t=s}throw new Error("PHP next assets are missing. Run `npm run sync:php-next` before using PHP next locally.",{cause:t})}function getPHPNextModuleUrls(){const n=globalThis.location?.origin||"",r=(globalThis.location?.pathname||"/").startsWith("/website-server/")?"/website-server/":"/";return Array.from(new Set([`${n}${r}php-next/index.js`,`${n}/website-server/php-next/index.js`,`${n}/php-next/index.js`]))}async function getPHPLoaderModule(n=LatestSupportedPHPVersion,t="asyncify"){switch(n){case"next":return(await getPHPNextModule()).getPHPLoaderModule(t);case"8.5":return(await import("./assets/index-wAAn1M-S.js")).getPHPLoaderModule();case"8.4":return(await import("./assets/index-8NJWW2tm.js")).getPHPLoaderModule();case"8.3":return(await import("./assets/index-BIt9aH0c.js")).getPHPLoaderModule();case"8.2":return(await import("./assets/index-BqoIUqOm.js")).getPHPLoaderModule();case"8.1":return(await import("./assets/index-C4LHx7Zj.js")).getPHPLoaderModule();case"8.0":return(await import("./assets/index-CfkiXX1S.js")).getPHPLoaderModule();case"7.4":return(await import("./assets/index-Bb-5f4q6.js")).getPHPLoaderModule();case"5.2":return(await import("./assets/index-Bwk8wweB.js")).getPHPLoaderModule()}throw new Error(`Unsupported PHP version ${n}`)}function flipObject(n){return Object.fromEntries(Object.entries(n).map(([t,r])=>[r,t]))}function as2Bytes(n){return new Uint8Array([n>>8&255,n&255])}function as3Bytes(n){return new Uint8Array([n>>16&255,n>>8&255,n&255])}function as8Bytes(n){const t=new ArrayBuffer(8);return new DataView(t).setBigUint64(0,BigInt(n),!1),new Uint8Array(t)}class ArrayBufferReader{constructor(t){this.offset=0,this.buffer=t,this.view=new DataView(t)}readUint8(){const t=this.view.getUint8(this.offset);return this.offset+=1,t}readUint16(){const t=this.view.getUint16(this.offset);return this.offset+=2,t}readUint32(){const t=this.view.getUint32(this.offset);return this.offset+=4,t}readUint8Array(t){const r=this.buffer.slice(this.offset,this.offset+t);return this.offset+=t,new Uint8Array(r)}isFinished(){return this.offset>=this.buffer.byteLength}}class ArrayBufferWriter{constructor(t){this.offset=0,this.buffer=new ArrayBuffer(t),this.uint8Array=new Uint8Array(this.buffer),this.view=new DataView(this.buffer)}writeUint8(t){this.view.setUint8(this.offset,t),this.offset+=1}writeUint16(t){this.view.setUint16(this.offset,t),this.offset+=2}writeUint32(t){this.view.setUint32(this.offset,t),this.offset+=4}writeUint8Array(t){this.uint8Array.set(t,this.offset),this.offset+=t.length}}const ExtensionTypes={server_name:0,max_fragment_length:1,client_certificate_url:2,trusted_ca_keys:3,truncated_hmac:4,status_request:5,user_mapping:6,client_authz:7,server_authz:8,cert_type:9,supported_groups:10,ec_point_formats:11,srp:12,signature_algorithms:13,use_srtp:14,heartbeat:15,application_layer_protocol_negotiation:16,status_request_v2:17,signed_certificate_timestamp:18,client_certificate_type:19,server_certificate_type:20,padding:21,encrypt_then_mac:22,extended_master_secret:23,token_binding:24,cached_info:25,tls_its:26,compress_certificate:27,record_size_limit:28,pwd_protect:29,pwo_clear:30,password_salt:31,ticket_pinning:32,tls_cert_with_extern_psk:33,delegated_credential:34,session_ticket:35,TLMSP:36,TLMSP_proxying:37,TLMSP_delegate:38,supported_ekt_ciphers:39,pre_shared_key:41,early_data:42,supported_versions:43,cookie:44,psk_key_exchange_modes:45,reserved:46,certificate_authorities:47,oid_filters:48,post_handshake_auth:49,signature_algorithms_cert:50,key_share:51,transparency_info:52,connection_id:54,renegotiation_info:65281},ExtensionNames=flipObject(ExtensionTypes),ServerNameTypes={host_name:0},ServerNameNames=flipObject(ServerNameTypes);class ServerNameExtension{static decodeFromClient(t){const r=new DataView(t.buffer);let s=0;const i=r.getUint16(s);s+=2;const a=[];for(;s<i+2;){const o=t[s];s+=1;const l=r.getUint16(s);s+=2;const u=t.slice(s,s+l);switch(s+=l,o){case ServerNameTypes.host_name:a.push({name_type:ServerNameNames[o],name:{host_name:new TextDecoder().decode(u)}});break;default:throw new Error(`Unsupported name type ${o}`)}}return{server_name_list:a}}static encodeForClient(t){if(t?.server_name_list.length)throw new Error("Encoding non-empty lists for ClientHello is not supported yet. Only empty lists meant for ServerHello are supported today.");const r=new ArrayBufferWriter(4);return r.writeUint16(ExtensionTypes.server_name),r.writeUint16(0),r.uint8Array}}const ECPointFormats={uncompressed:0,ansiX962_compressed_prime:1,ansiX962_compressed_char2:2},ECPointFormatNames=flipObject(ECPointFormats);class ECPointFormatsExtension{static decodeFromClient(t){const r=new ArrayBufferReader(t.buffer),s=r.readUint8(),i=[];for(let a=0;a<s;a++){const o=r.readUint8();o in ECPointFormatNames&&i.push(ECPointFormatNames[o])}return i}static encodeForClient(t){const r=new ArrayBufferWriter(6);return r.writeUint16(ExtensionTypes.ec_point_formats),r.writeUint16(2),r.writeUint8(1),r.writeUint8(ECPointFormats[t]),r.uint8Array}}const RenegotiationInfoExtension={decodeFromClient(n){const t=n[0]??0;return{renegotiatedConnection:n.slice(1,1+t)}},encodeForClient(){const n=ExtensionTypes.renegotiation_info,t=new Uint8Array([0]);return new Uint8Array([n>>8&255,n&255,0,t.length,...t])}},CipherSuites={TLS1_CK_PSK_WITH_RC4_128_SHA:138,TLS1_CK_PSK_WITH_3DES_EDE_CBC_SHA:139,TLS1_CK_PSK_WITH_AES_128_CBC_SHA:140,TLS1_CK_PSK_WITH_AES_256_CBC_SHA:141,TLS1_CK_DHE_PSK_WITH_RC4_128_SHA:142,TLS1_CK_DHE_PSK_WITH_3DES_EDE_CBC_SHA:143,TLS1_CK_DHE_PSK_WITH_AES_128_CBC_SHA:144,TLS1_CK_DHE_PSK_WITH_AES_256_CBC_SHA:145,TLS1_CK_RSA_PSK_WITH_RC4_128_SHA:146,TLS1_CK_RSA_PSK_WITH_3DES_EDE_CBC_SHA:147,TLS1_CK_RSA_PSK_WITH_AES_128_CBC_SHA:148,TLS1_CK_RSA_PSK_WITH_AES_256_CBC_SHA:149,TLS1_CK_PSK_WITH_AES_128_GCM_SHA256:168,TLS1_CK_PSK_WITH_AES_256_GCM_SHA384:169,TLS1_CK_DHE_PSK_WITH_AES_128_GCM_SHA256:170,TLS1_CK_DHE_PSK_WITH_AES_256_GCM_SHA384:171,TLS1_CK_RSA_PSK_WITH_AES_128_GCM_SHA256:172,TLS1_CK_RSA_PSK_WITH_AES_256_GCM_SHA384:173,TLS1_CK_PSK_WITH_AES_128_CBC_SHA256:174,TLS1_CK_PSK_WITH_AES_256_CBC_SHA384:175,TLS1_CK_PSK_WITH_NULL_SHA256:176,TLS1_CK_PSK_WITH_NULL_SHA384:177,TLS1_CK_DHE_PSK_WITH_AES_128_CBC_SHA256:178,TLS1_CK_DHE_PSK_WITH_AES_256_CBC_SHA384:179,TLS1_CK_DHE_PSK_WITH_NULL_SHA256:180,TLS1_CK_DHE_PSK_WITH_NULL_SHA384:181,TLS1_CK_RSA_PSK_WITH_AES_128_CBC_SHA256:182,TLS1_CK_RSA_PSK_WITH_AES_256_CBC_SHA384:183,TLS1_CK_RSA_PSK_WITH_NULL_SHA256:184,TLS1_CK_RSA_PSK_WITH_NULL_SHA384:185,TLS1_CK_PSK_WITH_NULL_SHA:44,TLS1_CK_DHE_PSK_WITH_NULL_SHA:45,TLS1_CK_RSA_PSK_WITH_NULL_SHA:46,TLS1_CK_RSA_WITH_AES_128_SHA:47,TLS1_CK_DH_DSS_WITH_AES_128_SHA:48,TLS1_CK_DH_RSA_WITH_AES_128_SHA:49,TLS1_CK_DHE_DSS_WITH_AES_128_SHA:50,TLS1_CK_DHE_RSA_WITH_AES_128_SHA:51,TLS1_CK_ADH_WITH_AES_128_SHA:52,TLS1_CK_RSA_WITH_AES_256_SHA:53,TLS1_CK_DH_DSS_WITH_AES_256_SHA:54,TLS1_CK_DH_RSA_WITH_AES_256_SHA:55,TLS1_CK_DHE_DSS_WITH_AES_256_SHA:56,TLS1_CK_DHE_RSA_WITH_AES_256_SHA:57,TLS1_CK_ADH_WITH_AES_256_SHA:58,TLS1_CK_RSA_WITH_NULL_SHA256:59,TLS1_CK_RSA_WITH_AES_128_SHA256:60,TLS1_CK_RSA_WITH_AES_256_SHA256:61,TLS1_CK_DH_DSS_WITH_AES_128_SHA256:62,TLS1_CK_DH_RSA_WITH_AES_128_SHA256:63,TLS1_CK_DHE_DSS_WITH_AES_128_SHA256:64,TLS1_CK_RSA_WITH_CAMELLIA_128_CBC_SHA:65,TLS1_CK_DH_DSS_WITH_CAMELLIA_128_CBC_SHA:66,TLS1_CK_DH_RSA_WITH_CAMELLIA_128_CBC_SHA:67,TLS1_CK_DHE_DSS_WITH_CAMELLIA_128_CBC_SHA:68,TLS1_CK_DHE_RSA_WITH_CAMELLIA_128_CBC_SHA:69,TLS1_CK_ADH_WITH_CAMELLIA_128_CBC_SHA:70,TLS1_CK_DHE_RSA_WITH_AES_128_SHA256:103,TLS1_CK_DH_DSS_WITH_AES_256_SHA256:104,TLS1_CK_DH_RSA_WITH_AES_256_SHA256:105,TLS1_CK_DHE_DSS_WITH_AES_256_SHA256:106,TLS1_CK_DHE_RSA_WITH_AES_256_SHA256:107,TLS1_CK_ADH_WITH_AES_128_SHA256:108,TLS1_CK_ADH_WITH_AES_256_SHA256:109,TLS1_CK_RSA_WITH_CAMELLIA_256_CBC_SHA:132,TLS1_CK_DH_DSS_WITH_CAMELLIA_256_CBC_SHA:133,TLS1_CK_DH_RSA_WITH_CAMELLIA_256_CBC_SHA:134,TLS1_CK_DHE_DSS_WITH_CAMELLIA_256_CBC_SHA:135,TLS1_CK_DHE_RSA_WITH_CAMELLIA_256_CBC_SHA:136,TLS1_CK_ADH_WITH_CAMELLIA_256_CBC_SHA:137,TLS1_CK_RSA_WITH_SEED_SHA:150,TLS1_CK_DH_DSS_WITH_SEED_SHA:151,TLS1_CK_DH_RSA_WITH_SEED_SHA:152,TLS1_CK_DHE_DSS_WITH_SEED_SHA:153,TLS1_CK_DHE_RSA_WITH_SEED_SHA:154,TLS1_CK_ADH_WITH_SEED_SHA:155,TLS1_CK_RSA_WITH_AES_128_GCM_SHA256:156,TLS1_CK_RSA_WITH_AES_256_GCM_SHA384:157,TLS1_CK_DHE_RSA_WITH_AES_128_GCM_SHA256:158,TLS1_CK_DHE_RSA_WITH_AES_256_GCM_SHA384:159,TLS1_CK_DH_RSA_WITH_AES_128_GCM_SHA256:160,TLS1_CK_DH_RSA_WITH_AES_256_GCM_SHA384:161,TLS1_CK_DHE_DSS_WITH_AES_128_GCM_SHA256:162,TLS1_CK_DHE_DSS_WITH_AES_256_GCM_SHA384:163,TLS1_CK_DH_DSS_WITH_AES_128_GCM_SHA256:164,TLS1_CK_DH_DSS_WITH_AES_256_GCM_SHA384:165,TLS1_CK_ADH_WITH_AES_128_GCM_SHA256:166,TLS1_CK_ADH_WITH_AES_256_GCM_SHA384:167,TLS1_CK_RSA_WITH_AES_128_CCM:49308,TLS1_CK_RSA_WITH_AES_256_CCM:49309,TLS1_CK_DHE_RSA_WITH_AES_128_CCM:49310,TLS1_CK_DHE_RSA_WITH_AES_256_CCM:49311,TLS1_CK_RSA_WITH_AES_128_CCM_8:49312,TLS1_CK_RSA_WITH_AES_256_CCM_8:49313,TLS1_CK_DHE_RSA_WITH_AES_128_CCM_8:49314,TLS1_CK_DHE_RSA_WITH_AES_256_CCM_8:49315,TLS1_CK_PSK_WITH_AES_128_CCM:49316,TLS1_CK_PSK_WITH_AES_256_CCM:49317,TLS1_CK_DHE_PSK_WITH_AES_128_CCM:49318,TLS1_CK_DHE_PSK_WITH_AES_256_CCM:49319,TLS1_CK_PSK_WITH_AES_128_CCM_8:49320,TLS1_CK_PSK_WITH_AES_256_CCM_8:49321,TLS1_CK_DHE_PSK_WITH_AES_128_CCM_8:49322,TLS1_CK_DHE_PSK_WITH_AES_256_CCM_8:49323,TLS1_CK_ECDHE_ECDSA_WITH_AES_128_CCM:49324,TLS1_CK_ECDHE_ECDSA_WITH_AES_256_CCM:49325,TLS1_CK_ECDHE_ECDSA_WITH_AES_128_CCM_8:49326,TLS1_CK_ECDHE_ECDSA_WITH_AES_256_CCM_8:49327,TLS1_CK_RSA_WITH_CAMELLIA_128_CBC_SHA256:186,TLS1_CK_DH_DSS_WITH_CAMELLIA_128_CBC_SHA256:187,TLS1_CK_DH_RSA_WITH_CAMELLIA_128_CBC_SHA256:188,TLS1_CK_DHE_DSS_WITH_CAMELLIA_128_CBC_SHA256:189,TLS1_CK_DHE_RSA_WITH_CAMELLIA_128_CBC_SHA256:190,TLS1_CK_ADH_WITH_CAMELLIA_128_CBC_SHA256:191,TLS1_CK_RSA_WITH_CAMELLIA_256_CBC_SHA256:192,TLS1_CK_DH_DSS_WITH_CAMELLIA_256_CBC_SHA256:193,TLS1_CK_DH_RSA_WITH_CAMELLIA_256_CBC_SHA256:194,TLS1_CK_DHE_DSS_WITH_CAMELLIA_256_CBC_SHA256:195,TLS1_CK_DHE_RSA_WITH_CAMELLIA_256_CBC_SHA256:196,TLS1_CK_ADH_WITH_CAMELLIA_256_CBC_SHA256:197,TLS1_CK_ECDH_ECDSA_WITH_NULL_SHA:49153,TLS1_CK_ECDH_ECDSA_WITH_RC4_128_SHA:49154,TLS1_CK_ECDH_ECDSA_WITH_DES_192_CBC3_SHA:49155,TLS1_CK_ECDH_ECDSA_WITH_AES_128_CBC_SHA:49156,TLS1_CK_ECDH_ECDSA_WITH_AES_256_CBC_SHA:49157,TLS1_CK_ECDHE_ECDSA_WITH_NULL_SHA:49158,TLS1_CK_ECDHE_ECDSA_WITH_RC4_128_SHA:49159,TLS1_CK_ECDHE_ECDSA_WITH_DES_192_CBC3_SHA:49160,TLS1_CK_ECDHE_ECDSA_WITH_AES_128_CBC_SHA:49161,TLS1_CK_ECDHE_ECDSA_WITH_AES_256_CBC_SHA:49162,TLS1_CK_ECDH_RSA_WITH_NULL_SHA:49163,TLS1_CK_ECDH_RSA_WITH_RC4_128_SHA:49164,TLS1_CK_ECDH_RSA_WITH_DES_192_CBC3_SHA:49165,TLS1_CK_ECDH_RSA_WITH_AES_128_CBC_SHA:49166,TLS1_CK_ECDH_RSA_WITH_AES_256_CBC_SHA:49167,TLS1_CK_ECDHE_RSA_WITH_NULL_SHA:49168,TLS1_CK_ECDHE_RSA_WITH_RC4_128_SHA:49169,TLS1_CK_ECDHE_RSA_WITH_DES_192_CBC3_SHA:49170,TLS1_CK_ECDHE_RSA_WITH_AES_128_CBC_SHA:49171,TLS1_CK_ECDHE_RSA_WITH_AES_256_CBC_SHA:49172,TLS1_CK_ECDH_anon_WITH_NULL_SHA:49173,TLS1_CK_ECDH_anon_WITH_RC4_128_SHA:49174,TLS1_CK_ECDH_anon_WITH_DES_192_CBC3_SHA:49175,TLS1_CK_ECDH_anon_WITH_AES_128_CBC_SHA:49176,TLS1_CK_ECDH_anon_WITH_AES_256_CBC_SHA:49177,TLS1_CK_SRP_SHA_WITH_3DES_EDE_CBC_SHA:49178,TLS1_CK_SRP_SHA_RSA_WITH_3DES_EDE_CBC_SHA:49179,TLS1_CK_SRP_SHA_DSS_WITH_3DES_EDE_CBC_SHA:49180,TLS1_CK_SRP_SHA_WITH_AES_128_CBC_SHA:49181,TLS1_CK_SRP_SHA_RSA_WITH_AES_128_CBC_SHA:49182,TLS1_CK_SRP_SHA_DSS_WITH_AES_128_CBC_SHA:49183,TLS1_CK_SRP_SHA_WITH_AES_256_CBC_SHA:49184,TLS1_CK_SRP_SHA_RSA_WITH_AES_256_CBC_SHA:49185,TLS1_CK_SRP_SHA_DSS_WITH_AES_256_CBC_SHA:49186,TLS1_CK_ECDHE_ECDSA_WITH_AES_128_SHA256:49187,TLS1_CK_ECDHE_ECDSA_WITH_AES_256_SHA384:49188,TLS1_CK_ECDH_ECDSA_WITH_AES_128_SHA256:49189,TLS1_CK_ECDH_ECDSA_WITH_AES_256_SHA384:49190,TLS1_CK_ECDHE_RSA_WITH_AES_128_SHA256:49191,TLS1_CK_ECDHE_RSA_WITH_AES_256_SHA384:49192,TLS1_CK_ECDH_RSA_WITH_AES_128_SHA256:49193,TLS1_CK_ECDH_RSA_WITH_AES_256_SHA384:49194,TLS1_CK_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256:49195,TLS1_CK_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384:49196,TLS1_CK_ECDH_ECDSA_WITH_AES_128_GCM_SHA256:49197,TLS1_CK_ECDH_ECDSA_WITH_AES_256_GCM_SHA384:49198,TLS1_CK_ECDHE_RSA_WITH_AES_128_GCM_SHA256:49199,TLS1_CK_ECDHE_RSA_WITH_AES_256_GCM_SHA384:49200,TLS1_CK_ECDH_RSA_WITH_AES_128_GCM_SHA256:49201,TLS1_CK_ECDH_RSA_WITH_AES_256_GCM_SHA384:49202,TLS1_CK_ECDHE_PSK_WITH_RC4_128_SHA:49203,TLS1_CK_ECDHE_PSK_WITH_3DES_EDE_CBC_SHA:49204,TLS1_CK_ECDHE_PSK_WITH_AES_128_CBC_SHA:49205,TLS1_CK_ECDHE_PSK_WITH_AES_256_CBC_SHA:49206,TLS1_CK_ECDHE_PSK_WITH_AES_128_CBC_SHA256:49207,TLS1_CK_ECDHE_PSK_WITH_AES_256_CBC_SHA384:49208,TLS1_CK_ECDHE_PSK_WITH_NULL_SHA:49209,TLS1_CK_ECDHE_PSK_WITH_NULL_SHA256:49210,TLS1_CK_ECDHE_PSK_WITH_NULL_SHA384:49211,TLS1_CK_ECDHE_ECDSA_WITH_CAMELLIA_128_CBC_SHA256:49266,TLS1_CK_ECDHE_ECDSA_WITH_CAMELLIA_256_CBC_SHA384:49267,TLS1_CK_ECDH_ECDSA_WITH_CAMELLIA_128_CBC_SHA256:49268,TLS1_CK_ECDH_ECDSA_WITH_CAMELLIA_256_CBC_SHA384:49269,TLS1_CK_ECDHE_RSA_WITH_CAMELLIA_128_CBC_SHA256:49270,TLS1_CK_ECDHE_RSA_WITH_CAMELLIA_256_CBC_SHA384:49271,TLS1_CK_ECDH_RSA_WITH_CAMELLIA_128_CBC_SHA256:49272,TLS1_CK_ECDH_RSA_WITH_CAMELLIA_256_CBC_SHA384:49273,TLS1_CK_PSK_WITH_CAMELLIA_128_CBC_SHA256:49300,TLS1_CK_PSK_WITH_CAMELLIA_256_CBC_SHA384:49301,TLS1_CK_DHE_PSK_WITH_CAMELLIA_128_CBC_SHA256:49302,TLS1_CK_DHE_PSK_WITH_CAMELLIA_256_CBC_SHA384:49303,TLS1_CK_RSA_PSK_WITH_CAMELLIA_128_CBC_SHA256:49304,TLS1_CK_RSA_PSK_WITH_CAMELLIA_256_CBC_SHA384:49305,TLS1_CK_ECDHE_PSK_WITH_CAMELLIA_128_CBC_SHA256:49306,TLS1_CK_ECDHE_PSK_WITH_CAMELLIA_256_CBC_SHA384:49307,TLS1_CK_ECDHE_RSA_WITH_CHACHA20_POLY1305:52392,TLS1_CK_ECDHE_ECDSA_WITH_CHACHA20_POLY1305:52393,TLS1_CK_DHE_RSA_WITH_CHACHA20_POLY1305:52394,TLS1_CK_PSK_WITH_CHACHA20_POLY1305:52395,TLS1_CK_ECDHE_PSK_WITH_CHACHA20_POLY1305:52396,TLS1_CK_DHE_PSK_WITH_CHACHA20_POLY1305:52397,TLS1_CK_RSA_PSK_WITH_CHACHA20_POLY1305:52398},CipherSuitesNames=flipObject(CipherSuites),SupportedGroups={secp256r1:23,secp384r1:24,secp521r1:25,x25519:29,x448:30},SupportedGroupsNames=flipObject(SupportedGroups);class SupportedGroupsExtension{static decodeFromClient(t){const r=new ArrayBufferReader(t.buffer);r.readUint16();const s=[];for(;!r.isFinished();){const i=r.readUint16();i in SupportedGroupsNames&&s.push(SupportedGroupsNames[i])}return s}static encodeForClient(t){const r=new ArrayBufferWriter(6);return r.writeUint16(ExtensionTypes.supported_groups),r.writeUint16(2),r.writeUint16(SupportedGroups[t]),r.uint8Array}}const SignatureAlgorithms={anonymous:0,rsa:1,dsa:2,ecdsa:3},SignatureAlgorithmsNames=flipObject(SignatureAlgorithms),HashAlgorithms={none:0,md5:1,sha1:2,sha224:3,sha256:4,sha384:5,sha512:6},HashAlgorithmsNames=flipObject(HashAlgorithms);class SignatureAlgorithmsExtension{static decodeFromClient(t){const r=new ArrayBufferReader(t.buffer);r.readUint16();const s=[];for(;!r.isFinished();){const i=r.readUint8(),a=r.readUint8();if(SignatureAlgorithmsNames[a]){if(!HashAlgorithmsNames[i]){logger.warn(`Unknown hash algorithm: ${i}`);continue}s.push({algorithm:SignatureAlgorithmsNames[a],hash:HashAlgorithmsNames[i]})}}return s}static encodeforClient(t,r){const s=new ArrayBufferWriter(6);return s.writeUint16(ExtensionTypes.signature_algorithms),s.writeUint16(2),s.writeUint8(HashAlgorithms[t]),s.writeUint8(SignatureAlgorithms[r]),s.uint8Array}}const TLSExtensionsHandlers={server_name:ServerNameExtension,signature_algorithms:SignatureAlgorithmsExtension,supported_groups:SupportedGroupsExtension,ec_point_formats:ECPointFormatsExtension,renegotiation_info:RenegotiationInfoExtension};function parseClientHelloExtensions(n){const t=new ArrayBufferReader(n.buffer),r=[];for(;!t.isFinished();){const s=t.offset,i=t.readUint16(),a=ExtensionNames[i],o=t.readUint16(),l=t.readUint8Array(o);if(!(a in TLSExtensionsHandlers))continue;const u=TLSExtensionsHandlers[a];r.push({type:a,data:u.decodeFromClient(l),raw:n.slice(s,s+4+o)})}return r}async function tls12Prf(n,t,r,s){const i=concatArrayBuffers([t,r]),a=await crypto.subtle.importKey("raw",n,{name:"HMAC",hash:{name:"SHA-256"}},!1,["sign"]);let o=i;const l=[];for(;concatArrayBuffers(l).byteLength<s;){o=await hmacSha256(a,o);const c=concatArrayBuffers([o,i]),d=await hmacSha256(a,c);l.push(d)}return concatArrayBuffers(l).slice(0,s)}async function hmacSha256(n,t){return await crypto.subtle.sign({name:"HMAC",hash:"SHA-256"},n,t)}const CompressionMethod={Null:0},AlertLevels={Warning:1,Fatal:2},AlertLevelNames=flipObject(AlertLevels),AlertDescriptions={CloseNotify:0,UnexpectedMessage:10,BadRecordMac:20,DecryptionFailed:21,RecordOverflow:22,DecompressionFailure:30,HandshakeFailure:40,NoCertificate:41,BadCertificate:42,UnsupportedCertificate:43,CertificateRevoked:44,CertificateExpired:45,CertificateUnknown:46,IllegalParameter:47,UnknownCa:48,AccessDenied:49,DecodeError:50,DecryptError:51,ExportRestriction:60,ProtocolVersion:70,InsufficientSecurity:71,InternalError:80,UserCanceled:90,NoRenegotiation:100,UnsupportedExtension:110},AlertDescriptionNames=flipObject(AlertDescriptions),ContentTypes={ChangeCipherSpec:20,Alert:21,Handshake:22,ApplicationData:23},HandshakeType={HelloRequest:0,ClientHello:1,ServerHello:2,Certificate:11,ServerKeyExchange:12,ServerHelloDone:14,ClientKeyExchange:16,Finished:20},ECCurveTypes={NamedCurve:3},ECNamedCurves={secp256r1:23};class TLSConnectionClosed extends Error{}const TLS_Version_1_2=new Uint8Array([3,3]),generalEcdheKeyPair=crypto.subtle.generateKey({name:"ECDH",namedCurve:"P-256"},!0,["deriveKey","deriveBits"]);class TLS_1_2_Connection{constructor(){this.receivedRecordSequenceNumber=0,this.sentRecordSequenceNumber=0,this.closed=!1,this.receivedBytesBuffer=new Uint8Array,this.receivedTLSRecords=[],this.partialTLSMessages={},this.handshakeMessages=[],this.MAX_CHUNK_SIZE=1024*16,this.clientEnd={upstream:new TransformStream,downstream:new TransformStream},this.clientDownstreamWriter=this.clientEnd.downstream.writable.getWriter(),this.clientUpstreamReader=this.clientEnd.upstream.readable.getReader(),this.serverEnd={upstream:new TransformStream,downstream:chunkStream(this.MAX_CHUNK_SIZE)},this.serverUpstreamWriter=this.serverEnd.upstream.writable.getWriter();const t=this;this.serverEnd.downstream.readable.pipeTo(new WritableStream({async write(r){await t.writeTLSRecord(ContentTypes.ApplicationData,r)},async abort(r){t.clientDownstreamWriter.releaseLock(),t.clientEnd.downstream.writable.abort(r),t.close()},close(){t.close()}})).catch(()=>{})}async close(){if(!this.closed){this.closed=!0;try{await this.clientDownstreamWriter.close()}catch{}try{await this.clientUpstreamReader.cancel()}catch{}try{await this.serverUpstreamWriter.close()}catch{}try{await this.clientEnd.upstream.readable.cancel()}catch{}try{await this.clientEnd.downstream.writable.close()}catch{}}}async TLSHandshake(t,r){const s=await this.readNextHandshakeMessage(HandshakeType.ClientHello);if(!s.body.cipher_suites.length)throw new Error("Client did not propose any supported cipher suites.");const i=crypto.getRandomValues(new Uint8Array(32));await this.writeTLSRecord(ContentTypes.Handshake,MessageEncoder.serverHello(s.body,i,CompressionMethod.Null)),await this.writeTLSRecord(ContentTypes.Handshake,MessageEncoder.certificate(r));const a=await generalEcdheKeyPair,o=s.body.random,l=await MessageEncoder.ECDHEServerKeyExchange(o,i,a,t);await this.writeTLSRecord(ContentTypes.Handshake,l),await this.writeTLSRecord(ContentTypes.Handshake,MessageEncoder.serverHelloDone());const u=await this.readNextHandshakeMessage(HandshakeType.ClientKeyExchange);await this.readNextMessage(ContentTypes.ChangeCipherSpec),this.sessionKeys=await this.deriveSessionKeys({clientRandom:o,serverRandom:i,serverPrivateKey:a.privateKey,clientPublicKey:await crypto.subtle.importKey("raw",u.body.exchange_keys,{name:"ECDH",namedCurve:"P-256"},!1,[])}),await this.readNextHandshakeMessage(HandshakeType.Finished),await this.writeTLSRecord(ContentTypes.ChangeCipherSpec,MessageEncoder.changeCipherSpec()),await this.writeTLSRecord(ContentTypes.Handshake,await MessageEncoder.createFinishedMessage(this.handshakeMessages,this.sessionKeys.masterSecret)),this.handshakeMessages=[],this.pollForClientMessages()}async deriveSessionKeys({clientRandom:t,serverRandom:r,serverPrivateKey:s,clientPublicKey:i}){const a=await crypto.subtle.deriveBits({name:"ECDH",public:i},s,256),o=new Uint8Array(await tls12Prf(a,new TextEncoder().encode("master secret"),concatUint8Arrays([t,r]),48)),l=await tls12Prf(o,new TextEncoder().encode("key expansion"),concatUint8Arrays([r,t]),40),u=new ArrayBufferReader(l),c=u.readUint8Array(16),d=u.readUint8Array(16),p=u.readUint8Array(4),f=u.readUint8Array(4);return{masterSecret:o,clientWriteKey:await crypto.subtle.importKey("raw",c,{name:"AES-GCM"},!1,["encrypt","decrypt"]),serverWriteKey:await crypto.subtle.importKey("raw",d,{name:"AES-GCM"},!1,["encrypt","decrypt"]),clientIV:p,serverIV:f}}async readNextHandshakeMessage(t){const r=await this.readNextMessage(ContentTypes.Handshake);if(r.msg_type!==t)throw new Error(`Expected ${t} message`);return r}async readNextMessage(t){let r,s=!1;do r=await this.readNextTLSRecord(t),s=await this.accumulateUntilMessageIsComplete(r);while(s===!1);const i=TLSDecoder.TLSMessage(r.type,s);return r.type===ContentTypes.Handshake&&this.handshakeMessages.push(r.fragment),i}async readNextTLSRecord(t){for(;;){for(let l=0;l<this.receivedTLSRecords.length;l++){const u=this.receivedTLSRecords[l];if(u.type===t)return this.receivedTLSRecords.splice(l,1),u}const r=await this.pollBytes(5),s=r[3]<<8|r[4],i=r[0],a=await this.pollBytes(s),o={type:i,version:{major:r[1],minor:r[2]},length:s,fragment:this.sessionKeys&&i!==ContentTypes.ChangeCipherSpec?await this.decryptData(i,a):a};if(o.type===ContentTypes.Alert){const l=o.fragment[0],u=o.fragment[1],c=AlertLevelNames[l],d=AlertDescriptionNames[u];throw l===AlertLevels.Warning&&u===AlertDescriptions.CloseNotify?new TLSConnectionClosed("TLS connection closed by peer (CloseNotify)"):new Error(`TLS alert received: ${c} ${d}`)}this.receivedTLSRecords.push(o)}}async pollBytes(t){for(;this.receivedBytesBuffer.length<t;){const{value:s,done:i}=await this.clientUpstreamReader.read();if(i)throw await this.close(),new TLSConnectionClosed("TLS connection closed");if(this.receivedBytesBuffer=concatUint8Arrays([this.receivedBytesBuffer,s]),this.receivedBytesBuffer.length>=t)break;await new Promise(a=>setTimeout(a,100))}const r=this.receivedBytesBuffer.slice(0,t);return this.receivedBytesBuffer=this.receivedBytesBuffer.slice(t),r}async pollForClientMessages(){try{for(;;){const t=await this.readNextMessage(ContentTypes.ApplicationData);this.serverUpstreamWriter.write(t.body)}}catch(t){if(t instanceof TLSConnectionClosed)return;throw t}}async decryptData(t,r){const s=this.sessionKeys.clientIV,i=r.slice(0,8),a=new Uint8Array([...s,...i]),o=await crypto.subtle.decrypt({name:"AES-GCM",iv:a,additionalData:new Uint8Array([...as8Bytes(this.receivedRecordSequenceNumber),t,...TLS_Version_1_2,...as2Bytes(r.length-8-16)]),tagLength:128},this.sessionKeys.clientWriteKey,r.slice(8));return++this.receivedRecordSequenceNumber,new Uint8Array(o)}async accumulateUntilMessageIsComplete(t){this.partialTLSMessages[t.type]=concatUint8Arrays([this.partialTLSMessages[t.type]||new Uint8Array,t.fragment]);const r=this.partialTLSMessages[t.type];switch(t.type){case ContentTypes.Handshake:{if(r.length<4)return!1;const s=r[1]<<8|r[2];if(r.length<3+s)return!1;break}case ContentTypes.Alert:{if(r.length<2)return!1;break}case ContentTypes.ChangeCipherSpec:case ContentTypes.ApplicationData:break;default:throw new Error(`TLS: Unsupported record type ${t.type}`)}return delete this.partialTLSMessages[t.type],r}async writeTLSRecord(t,r){t===ContentTypes.Handshake&&this.handshakeMessages.push(r),this.sessionKeys&&t!==ContentTypes.ChangeCipherSpec&&(r=await this.encryptData(t,r));const s=TLS_Version_1_2,i=r.length,a=new Uint8Array(5);a[0]=t,a[1]=s[0],a[2]=s[1],a[3]=i>>8&255,a[4]=i&255;const o=concatUint8Arrays([a,r]);this.clientDownstreamWriter.write(o)}async encryptData(t,r){const s=this.sessionKeys.serverIV,i=crypto.getRandomValues(new Uint8Array(8)),a=new Uint8Array([...s,...i]),o=new Uint8Array([...as8Bytes(this.sentRecordSequenceNumber),t,...TLS_Version_1_2,...as2Bytes(r.length)]),l=await crypto.subtle.encrypt({name:"AES-GCM",iv:a,additionalData:o,tagLength:128},this.sessionKeys.serverWriteKey,r);return++this.sentRecordSequenceNumber,concatUint8Arrays([i,new Uint8Array(l)])}}class TLSDecoder{static TLSMessage(t,r){switch(t){case ContentTypes.Handshake:return TLSDecoder.clientHandshake(r);case ContentTypes.Alert:return TLSDecoder.alert(r);case ContentTypes.ChangeCipherSpec:return TLSDecoder.changeCipherSpec();case ContentTypes.ApplicationData:return TLSDecoder.applicationData(r);default:throw new Error(`TLS: Unsupported TLS record type ${t}`)}}static parseCipherSuites(t){const r=new ArrayBufferReader(t);r.readUint16();const s=[];for(;!r.isFinished();){const i=r.readUint16();i in CipherSuitesNames&&s.push(CipherSuitesNames[i])}return s}static applicationData(t){return{type:ContentTypes.ApplicationData,body:t}}static changeCipherSpec(){return{type:ContentTypes.ChangeCipherSpec,body:new Uint8Array}}static alert(t){return{type:ContentTypes.Alert,level:AlertLevelNames[t[0]],description:AlertDescriptionNames[t[1]]}}static clientHandshake(t){const r=t[0],s=t[1]<<16|t[2]<<8|t[3],i=t.slice(4);let a;switch(r){case HandshakeType.HelloRequest:a=TLSDecoder.clientHelloRequestPayload();break;case HandshakeType.ClientHello:a=TLSDecoder.clientHelloPayload(i);break;case HandshakeType.ClientKeyExchange:a=TLSDecoder.clientKeyExchangePayload(i);break;case HandshakeType.Finished:a=TLSDecoder.clientFinishedPayload(i);break;default:throw new Error(`Invalid handshake type ${r}`)}return{type:ContentTypes.Handshake,msg_type:r,length:s,body:a}}static clientHelloRequestPayload(){return{}}static clientHelloPayload(t){const r=new ArrayBufferReader(t.buffer),s={client_version:r.readUint8Array(2),random:r.readUint8Array(32)},i=r.readUint8();s.session_id=r.readUint8Array(i);const a=r.readUint16();s.cipher_suites=TLSDecoder.parseCipherSuites(r.readUint8Array(a).buffer);const o=r.readUint8();s.compression_methods=r.readUint8Array(o);const l=r.readUint16();return s.extensions=parseClientHelloExtensions(r.readUint8Array(l)),s}static clientKeyExchangePayload(t){return{exchange_keys:t.slice(1,t.length)}}static clientFinishedPayload(t){return{verify_data:t}}}function chunkStream(n){return new TransformStream({transform(t,r){for(;t.length>0;)r.enqueue(t.slice(0,n)),t=t.slice(n)}})}class MessageEncoder{static certificate(t){const r=[];for(const a of t)r.push(as3Bytes(a.byteLength)),r.push(new Uint8Array(a));const s=concatUint8Arrays(r),i=new Uint8Array([...as3Bytes(s.byteLength),...s]);return new Uint8Array([HandshakeType.Certificate,...as3Bytes(i.length),...i])}static async ECDHEServerKeyExchange(t,r,s,i){const a=new Uint8Array(await crypto.subtle.exportKey("raw",s.publicKey)),o=new Uint8Array([ECCurveTypes.NamedCurve,...as2Bytes(ECNamedCurves.secp256r1),a.byteLength,...a]),l=await crypto.subtle.sign({name:"RSASSA-PKCS1-v1_5",hash:"SHA-256"},i,new Uint8Array([...t,...r,...o])),u=new Uint8Array(l),c=new Uint8Array([HashAlgorithms.sha256,SignatureAlgorithms.rsa]),d=new Uint8Array([...o,...c,...as2Bytes(u.length),...u]);return new Uint8Array([HandshakeType.ServerKeyExchange,...as3Bytes(d.length),...d])}static serverHello(t,r,s){const i=t.extensions.map(u=>{switch(u.type){case"server_name":return ServerNameExtension.encodeForClient();case"ec_point_formats":return ECPointFormatsExtension.encodeForClient("uncompressed");case"renegotiation_info":return RenegotiationInfoExtension.encodeForClient()}}).filter(u=>u!==void 0),a=concatUint8Arrays(i),o=new Uint8Array,l=new Uint8Array([...TLS_Version_1_2,...r,o.length,...o,...as2Bytes(CipherSuites.TLS1_CK_ECDHE_RSA_WITH_AES_128_GCM_SHA256),s,...as2Bytes(a.length),...a]);return new Uint8Array([HandshakeType.ServerHello,...as3Bytes(l.length),...l])}static serverHelloDone(){return new Uint8Array([HandshakeType.ServerHelloDone,...as3Bytes(0)])}static async createFinishedMessage(t,r){const s=await crypto.subtle.digest("SHA-256",concatUint8Arrays(t)),i=new Uint8Array(await tls12Prf(r,new TextEncoder().encode("server finished"),s,12));return new Uint8Array([HandshakeType.Finished,...as3Bytes(i.length),...i])}static changeCipherSpec(){return new Uint8Array([1])}}function generateCertificate(n,t){return CertificateGenerator.generateCertificate(n,t)}function certificateToPEM(n){return`-----BEGIN CERTIFICATE-----
${formatPEM(encodeUint8ArrayAsBase64(n))}
-----END CERTIFICATE-----`}class CertificateGenerator{static async generateCertificate(t,r){const s=await crypto.subtle.generateKey({name:"RSASSA-PKCS1-v1_5",hash:"SHA-256",modulusLength:2048,publicExponent:new Uint8Array([1,0,1])},!0,["sign","verify"]),i=await this.signingRequest(t,s.publicKey),a=await this.sign(i,r?.privateKey??s.privateKey);return{keyPair:s,certificate:a,tbsCertificate:i,tbsDescription:t}}static async sign(t,r){const s=await crypto.subtle.sign({name:"RSASSA-PKCS1-v1_5",hash:"SHA-256"},r,t.buffer);return ASN1Encoder.sequence([new Uint8Array(t.buffer),this.signatureAlgorithm("sha256WithRSAEncryption"),ASN1Encoder.bitString(new Uint8Array(s))])}static async signingRequest(t,r){const s=[];return t.keyUsage&&s.push(this.keyUsage(t.keyUsage)),t.extKeyUsage&&s.push(this.extKeyUsage(t.extKeyUsage)),t.subjectAltNames&&s.push(this.subjectAltName(t.subjectAltNames)),t.nsCertType&&s.push(this.nsCertType(t.nsCertType)),t.basicConstraints&&s.push(this.basicConstraints(t.basicConstraints)),ASN1Encoder.sequence([this.version(t.version),this.serialNumber(t.serialNumber),this.signatureAlgorithm(t.signatureAlgorithm),this.distinguishedName(t.issuer??t.subject),this.validity(t.validity),this.distinguishedName(t.subject),await this.subjectPublicKeyInfo(r),this.extensions(s)])}static version(t=2){return ASN1Encoder.ASN1(160,ASN1Encoder.integer(new Uint8Array([t])))}static serialNumber(t=crypto.getRandomValues(new Uint8Array(4))){return ASN1Encoder.integer(t)}static signatureAlgorithm(t="sha256WithRSAEncryption"){return ASN1Encoder.sequence([ASN1Encoder.objectIdentifier(oidByName(t)),ASN1Encoder.null()])}static async subjectPublicKeyInfo(t){return new Uint8Array(await crypto.subtle.exportKey("spki",t))}static extensions(t){return ASN1Encoder.ASN1(163,ASN1Encoder.sequence(t))}static distinguishedName(t){const r=[];for(const[s,i]of Object.entries(t)){const a=[ASN1Encoder.objectIdentifier(oidByName(s))];switch(s){case"countryName":a.push(ASN1Encoder.printableString(i));break;default:a.push(ASN1Encoder.utf8String(i))}r.push(ASN1Encoder.set([ASN1Encoder.sequence(a)]))}return ASN1Encoder.sequence(r)}static validity(t){return ASN1Encoder.sequence([ASN1Encoder.ASN1(ASN1Tags.UTCTime,new TextEncoder().encode(formatDateASN1(t?.notBefore??new Date))),ASN1Encoder.ASN1(ASN1Tags.UTCTime,new TextEncoder().encode(formatDateASN1(t?.notAfter??addYears(new Date,10))))])}static basicConstraints({ca:t=!0,pathLenConstraint:r=void 0}){const s=[ASN1Encoder.boolean(t)];return r!==void 0&&s.push(ASN1Encoder.integer(new Uint8Array([r]))),ASN1Encoder.sequence([ASN1Encoder.objectIdentifier(oidByName("basicConstraints")),ASN1Encoder.octetString(ASN1Encoder.sequence(s))])}static keyUsage(t){const r=new Uint8Array([0]);return t?.digitalSignature&&(r[0]|=1),t?.nonRepudiation&&(r[0]|=2),t?.keyEncipherment&&(r[0]|=4),t?.dataEncipherment&&(r[0]|=8),t?.keyAgreement&&(r[0]|=16),t?.keyCertSign&&(r[0]|=32),t?.cRLSign&&(r[0]|=64),t?.encipherOnly&&(r[0]|=128),t?.decipherOnly&&(r[0]|=64),ASN1Encoder.sequence([ASN1Encoder.objectIdentifier(oidByName("keyUsage")),ASN1Encoder.boolean(!0),ASN1Encoder.octetString(ASN1Encoder.bitString(r))])}static extKeyUsage(t={}){return ASN1Encoder.sequence([ASN1Encoder.objectIdentifier(oidByName("extKeyUsage")),ASN1Encoder.boolean(!0),ASN1Encoder.octetString(ASN1Encoder.sequence(Object.entries(t).map(([r,s])=>s?ASN1Encoder.objectIdentifier(oidByName(r)):ASN1Encoder.null())))])}static nsCertType(t){const r=new Uint8Array([0]);return t.client&&(r[0]|=1),t.server&&(r[0]|=2),t.email&&(r[0]|=4),t.objsign&&(r[0]|=8),t.sslCA&&(r[0]|=16),t.emailCA&&(r[0]|=32),t.objCA&&(r[0]|=64),ASN1Encoder.sequence([ASN1Encoder.objectIdentifier(oidByName("nsCertType")),ASN1Encoder.octetString(r)])}static subjectAltName(t){const r=t.dnsNames?.map(a=>{const o=ASN1Encoder.ia5String(a);return ASN1Encoder.contextSpecific(2,o)})||[],s=t.ipAddresses?.map(a=>{const o=ASN1Encoder.ia5String(a);return ASN1Encoder.contextSpecific(7,o)})||[],i=ASN1Encoder.octetString(ASN1Encoder.sequence([...r,...s]));return ASN1Encoder.sequence([ASN1Encoder.objectIdentifier(oidByName("subjectAltName")),ASN1Encoder.boolean(!0),i])}}const oids={"1.2.840.113549.1.1.1":"rsaEncryption","1.2.840.113549.1.1.4":"md5WithRSAEncryption","1.2.840.113549.1.1.5":"sha1WithRSAEncryption","1.2.840.113549.1.1.7":"RSAES-OAEP","1.2.840.113549.1.1.8":"mgf1","1.2.840.113549.1.1.9":"pSpecified","1.2.840.113549.1.1.10":"RSASSA-PSS","1.2.840.113549.1.1.11":"sha256WithRSAEncryption","1.2.840.113549.1.1.12":"sha384WithRSAEncryption","1.2.840.113549.1.1.13":"sha512WithRSAEncryption","1.3.101.112":"EdDSA25519","1.2.840.10040.4.3":"dsa-with-sha1","1.3.14.3.2.7":"desCBC","1.3.14.3.2.26":"sha1","1.3.14.3.2.29":"sha1WithRSASignature","2.16.840.1.101.3.4.2.1":"sha256","2.16.840.1.101.3.4.2.2":"sha384","2.16.840.1.101.3.4.2.3":"sha512","2.16.840.1.101.3.4.2.4":"sha224","2.16.840.1.101.3.4.2.5":"sha512-224","2.16.840.1.101.3.4.2.6":"sha512-256","1.2.840.113549.2.2":"md2","1.2.840.113549.2.5":"md5","1.2.840.113549.1.7.1":"data","1.2.840.113549.1.7.2":"signedData","1.2.840.113549.1.7.3":"envelopedData","1.2.840.113549.1.7.4":"signedAndEnvelopedData","1.2.840.113549.1.7.5":"digestedData","1.2.840.113549.1.7.6":"encryptedData","1.2.840.113549.1.9.1":"emailAddress","1.2.840.113549.1.9.2":"unstructuredName","1.2.840.113549.1.9.3":"contentType","1.2.840.113549.1.9.4":"messageDigest","1.2.840.113549.1.9.5":"signingTime","1.2.840.113549.1.9.6":"counterSignature","1.2.840.113549.1.9.7":"challengePassword","1.2.840.113549.1.9.8":"unstructuredAddress","1.2.840.113549.1.9.14":"extensionRequest","1.2.840.113549.1.9.20":"friendlyName","1.2.840.113549.1.9.21":"localKeyId","1.2.840.113549.1.9.22.1":"x509Certificate","1.2.840.113549.1.12.10.1.1":"keyBag","1.2.840.113549.1.12.10.1.2":"pkcs8ShroudedKeyBag","1.2.840.113549.1.12.10.1.3":"certBag","1.2.840.113549.1.12.10.1.4":"crlBag","1.2.840.113549.1.12.10.1.5":"secretBag","1.2.840.113549.1.12.10.1.6":"safeContentsBag","1.2.840.113549.1.5.13":"pkcs5PBES2","1.2.840.113549.1.5.12":"pkcs5PBKDF2","1.2.840.113549.1.12.1.1":"pbeWithSHAAnd128BitRC4","1.2.840.113549.1.12.1.2":"pbeWithSHAAnd40BitRC4","1.2.840.113549.1.12.1.3":"pbeWithSHAAnd3-KeyTripleDES-CBC","1.2.840.113549.1.12.1.4":"pbeWithSHAAnd2-KeyTripleDES-CBC","1.2.840.113549.1.12.1.5":"pbeWithSHAAnd128BitRC2-CBC","1.2.840.113549.1.12.1.6":"pbewithSHAAnd40BitRC2-CBC","1.2.840.113549.2.7":"hmacWithSHA1","1.2.840.113549.2.8":"hmacWithSHA224","1.2.840.113549.2.9":"hmacWithSHA256","1.2.840.113549.2.10":"hmacWithSHA384","1.2.840.113549.2.11":"hmacWithSHA512","1.2.840.113549.3.7":"des-EDE3-CBC","2.16.840.1.101.3.4.1.2":"aes128-CBC","2.16.840.1.101.3.4.1.22":"aes192-CBC","2.16.840.1.101.3.4.1.42":"aes256-CBC","2.5.4.3":"commonName","2.5.4.4":"surname","2.5.4.5":"serialNumber","2.5.4.6":"countryName","2.5.4.7":"localityName","2.5.4.8":"stateOrProvinceName","2.5.4.9":"streetAddress","2.5.4.10":"organizationName","2.5.4.11":"organizationalUnitName","2.5.4.12":"title","2.5.4.13":"description","2.5.4.15":"businessCategory","2.5.4.17":"postalCode","2.5.4.42":"givenName","1.3.6.1.4.1.311.60.2.1.2":"jurisdictionOfIncorporationStateOrProvinceName","1.3.6.1.4.1.311.60.2.1.3":"jurisdictionOfIncorporationCountryName","2.16.840.1.113730.1.1":"nsCertType","2.16.840.1.113730.1.13":"nsComment","2.5.29.14":"subjectKeyIdentifier","2.5.29.15":"keyUsage","2.5.29.17":"subjectAltName","2.5.29.18":"issuerAltName","2.5.29.19":"basicConstraints","2.5.29.31":"cRLDistributionPoints","2.5.29.32":"certificatePolicies","2.5.29.35":"authorityKeyIdentifier","2.5.29.37":"extKeyUsage","1.3.6.1.4.1.11129.2.4.2":"timestampList","1.3.6.1.5.5.7.1.1":"authorityInfoAccess","1.3.6.1.5.5.7.3.1":"serverAuth","1.3.6.1.5.5.7.3.2":"clientAuth","1.3.6.1.5.5.7.3.3":"codeSigning","1.3.6.1.5.5.7.3.4":"emailProtection","1.3.6.1.5.5.7.3.8":"timeStamping"};function oidByName(n){for(const[t,r]of Object.entries(oids))if(r===n)return t;throw new Error(`OID not found for name: ${n}`)}const constructedBit=32,ASN1Tags={Boolean:1,Integer:2,BitString:3,OctetString:4,Null:5,OID:6,Utf8String:12,Sequence:16|constructedBit,Set:17|constructedBit,PrintableString:19,IA5String:22,UTCTime:23};class ASN1Encoder{static length_(t){if(t<128)return new Uint8Array([t]);{let r=t;const s=[];for(;r>0;)s.unshift(r&255),r>>=8;const i=s.length,a=new Uint8Array(1+i);a[0]=128|i;for(let o=0;o<i;o++)a[o+1]=s[o];return a}}static ASN1(t,r){const s=ASN1Encoder.length_(r.length),i=new Uint8Array(1+s.length+r.length);return i[0]=t,i.set(s,1),i.set(r,1+s.length),i}static integer(t){let r=0;for(;r<t.length-1&&t[r]===0&&t[r+1]<128;)r++;if(r>0&&(t=t.subarray(r)),t[0]>127){const s=new Uint8Array(t.length+1);s[0]=0,s.set(t,1),t=s}return ASN1Encoder.ASN1(ASN1Tags.Integer,t)}static bitString(t){const r=new Uint8Array([0]),s=new Uint8Array(r.length+t.length);return s.set(r),s.set(t,r.length),ASN1Encoder.ASN1(ASN1Tags.BitString,s)}static octetString(t){return ASN1Encoder.ASN1(ASN1Tags.OctetString,t)}static null(){return ASN1Encoder.ASN1(ASN1Tags.Null,new Uint8Array(0))}static objectIdentifier(t){const r=t.split(".").map(Number),i=[r[0]*40+r[1]];for(let a=2;a<r.length;a++){let o=r[a];const l=[];do l.unshift(o&127),o>>=7;while(o>0);for(let u=0;u<l.length-1;u++)l[u]|=128;i.push(...l)}return ASN1Encoder.ASN1(ASN1Tags.OID,new Uint8Array(i))}static utf8String(t){const r=new TextEncoder().encode(t);return ASN1Encoder.ASN1(ASN1Tags.Utf8String,r)}static printableString(t){const r=new TextEncoder().encode(t);return ASN1Encoder.ASN1(ASN1Tags.PrintableString,r)}static sequence(t){return ASN1Encoder.ASN1(ASN1Tags.Sequence,concatUint8Arrays(t))}static set(t){return ASN1Encoder.ASN1(ASN1Tags.Set,concatUint8Arrays(t))}static ia5String(t){const r=new TextEncoder().encode(t);return ASN1Encoder.ASN1(ASN1Tags.IA5String,r)}static contextSpecific(t,r,s=!1){const i=(s?160:128)|t;return ASN1Encoder.ASN1(i,r)}static boolean(t){return ASN1Encoder.ASN1(ASN1Tags.Boolean,new Uint8Array([t?255:0]))}}function formatPEM(n){return n.match(/.{1,64}/g)?.join(`
`)||n}function formatDateASN1(n){const t=n.getUTCFullYear().toString().substr(2),r=padNumber(n.getUTCMonth()+1),s=padNumber(n.getUTCDate()),i=padNumber(n.getUTCHours()),a=padNumber(n.getUTCMinutes()),o=padNumber(n.getUTCSeconds());return`${t}${r}${s}${i}${a}${o}Z`}function padNumber(n){return n.toString().padStart(2,"0")}function addYears(n,t){const r=new Date(n);return r.setUTCFullYear(r.getUTCFullYear()+t),r}function isURLScoped(n){return n.pathname.startsWith("/scope:")}function setURLScope(n,t){let r=new URL(n);if(isURLScoped(r))if(t){const s=r.pathname.split("/");s[1]=`scope:${t}`,r.pathname=s.join("/")}else r=removeURLScope(r);else if(t){const s=r.pathname==="/"?"":r.pathname;r.pathname=`/scope:${t}${s}`}return r}function removeURLScope(n){if(!isURLScoped(n))return n;const t=new URL(n),r=t.pathname.split("/");return t.pathname="/"+r.slice(2).join("/"),t}async function cloneRequest(n,t){let r;return["GET","HEAD"].includes(n.method)?r=void 0:"body"in t?r=t.body:!n.bodyUsed&&n.body?r=n.body:r=await n.arrayBuffer(),new Request(t.url||n.url,{signal:n.signal,body:r,method:n.method,headers:n.headers,referrer:n.referrer,referrerPolicy:n.referrerPolicy,mode:n.mode==="navigate"?"same-origin":n.mode,credentials:n.credentials,cache:n.cache,redirect:n.redirect,integrity:n.integrity,...r instanceof ReadableStream&&{duplex:"half"},...t})}let streamBodySupported;async function supportsReadableStreamBody(){if(streamBodySupported!==void 0)return streamBodySupported;try{const n=new ReadableStream({start(t){t.close()}});await fetch("data:,",{method:"POST",body:n,duplex:"half"}),streamBodySupported=!0}catch{streamBodySupported=!1}return streamBodySupported}class FirewallInterferenceError extends Error{constructor(t,r,s){super(`Could not fetch ${t} – your network appears to be blocking this request (HTTP ${r}). This often happens on school, university, or corporate networks. Try switching to a different network or using a VPN.`),this.name="FirewallInterferenceError",this.url=t,this.status=r,this.statusText=s}}const CORS_PROXY_HEADER="X-Playground-Cors-Proxy",CORS_ENABLED_HOST_REQUEST_HEADERS=new Map([["api.anthropic.com",{"anthropic-dangerous-direct-browser-access":"true"}],["api.openai.com",{}],["generativelanguage.googleapis.com",{}]]);async function fetchWithCorsProxy(n,t,r,s){let i=typeof n=="string"?new Request(n,t):n;const a=s?new URL(s):null;let o=a?new URL(i.url,a):new URL(i.url);if(isLocalhost(o))return o.protocol==="http:"&&i.body&&(i=await cloneRequest(i,{body:await readBodyUntilAborted(i),keepalive:i.keepalive})),await fetch(i);if(isKnownCorsEnabledHost(o))return i=await addCorsEnabledHostRequestHeaders(i,o),await fetch(i);if(o.protocol==="http:"){o.protocol="https:";const u=o.toString();i=await cloneRequest(i,{url:u}),o=new URL(u)}if(!r)return await fetch(i);if(a&&o.protocol===a.protocol&&o.hostname===a.hostname&&o.port===a.port&&o.pathname.startsWith(a.pathname))return await fetch(i);const l=i.clone();try{return await fetch(i)}catch{const u=new Headers(i.headers),c=u.get("x-cors-proxy-allowed-request-headers")?.split(",")||[],d=c.includes("authorization")||c.includes("cookie"),p=u.get("content-type");p&&p.toLowerCase().includes("multipart/form-data")&&(u.set("x-cors-proxy-content-type",p),u.set("content-type","application/octet-stream"));let f=null;const g=i.method.toUpperCase();g!=="GET"&&g!=="HEAD"&&(await supportsReadableStreamBody()?f=l.body:f=await l.arrayBuffer()),f instanceof ReadableStream&&new URL(r,import.meta.url).protocol==="http:"&&(f=await new Response(f).arrayBuffer());const y=await cloneRequest(i,{url:`${r}${i.url}`,headers:u,body:f,...d&&{credentials:"include"}}),_=await fetch(y);if(!_.headers.has(CORS_PROXY_HEADER))throw new FirewallInterferenceError(i.url,_.status,_.statusText);return _}}async function readBodyUntilAborted(n){const{signal:t}=n,r=()=>t.reason??new DOMException("The request was aborted.","AbortError");if(t.aborted)throw r();const s=n.body.getReader(),i=()=>{s.cancel(t.reason).catch(()=>{})};t.addEventListener("abort",i,{once:!0});const a=[];let o=0;try{for(;;){const{value:c,done:d}=await s.read();if(d)break;a.push(c.slice()),o+=c.byteLength}}finally{t.removeEventListener("abort",i)}if(t.aborted)throw r();const l=new Uint8Array(o);let u=0;for(const c of a)l.set(c,u),u+=c.byteLength;return l.buffer}function isLocalhost(n){return n.hostname==="localhost"||n.hostname==="127.0.0.1"||n.hostname==="[::1]"||n.hostname==="::1"}function isKnownCorsEnabledHost(n){return n.protocol==="https:"&&CORS_ENABLED_HOST_REQUEST_HEADERS.has(n.hostname)}async function addCorsEnabledHostRequestHeaders(n,t){const r=CORS_ENABLED_HOST_REQUEST_HEADERS.get(t.hostname);if(!r)return n;const s=new Headers(n.headers);for(const[i,a]of Object.entries(r))s.has(i)||s.set(i,a);return await cloneRequest(n,{headers:s})}class ChunkedDecoderStream extends TransformStream{constructor(){let t=new Uint8Array(0),r="SCAN_CHUNK_SIZE",s=0;super({transform(i,a){for(t=concatUint8Arrays([t,i]);t.length>0;)if(r==="SCAN_CHUNK_SIZE"){if(t.length<3)return;let o=0;for(;o<t.length;){const c=t[o];if(!(c>=48&&c<=57||c>=97&&c<=102||c>=65&&c<=70))break;o++}if(o===0)throw new Error("Invalid chunk size format");if(t.length<o+2)return;if(t[o]!==13||t[o+1]!==10)throw new Error("Invalid chunk size format. Expected CRLF after chunk size");const l=new TextDecoder().decode(t.slice(0,o)),u=parseInt(l,16);if(t=t.slice(o+2),u===0){r="SCAN_FINAL_CHUNK",a.terminate();return}s=u,r="SCAN_CHUNK_DATA"}else if(r==="SCAN_CHUNK_DATA"){const o=Math.min(s,t.length),l=t.slice(0,o);t=t.slice(o),s-=o,a.enqueue(l),s===0&&(r="SCAN_CHUNK_TRAILER")}else if(r==="SCAN_CHUNK_TRAILER"){if(t.length<2)return;if(t[0]!==13||t[1]!==10)throw new Error("Invalid chunk trailer format. Expected CRLF after chunk data");t=t.slice(2),r="SCAN_CHUNK_SIZE"}}})}}const tcpOverFetchWebsocket=(n,t)=>({...n,websocket:{url:(r,s,i)=>`ws://playground.internal/?${new URLSearchParams({host:s,port:i}).toString()}`,subprotocol:"binary",decorator:()=>class extends TCPOverFetchWebsocket{constructor(r,s){super(r,s,{CAroot:t.CAroot,corsProxyUrl:t.corsProxyUrl})}}}});class TCPOverFetchWebsocket{constructor(t,r,{CAroot:s,corsProxyUrl:i,outputType:a="messages"}={}){this.CONNECTING=0,this.OPEN=1,this.CLOSING=2,this.CLOSED=3,this.readyState=this.CONNECTING,this.binaryType="blob",this.bufferedAmount=0,this.extensions="",this.protocol="ws",this.host="",this.port=0,this.listeners=new Map,this.clientUpstream=new TransformStream,this.clientUpstreamWriter=this.clientUpstream.writable.getWriter(),this.clientDownstream=new TransformStream,this.fetchInitiated=!1,this.bufferedBytesFromClient=new Uint8Array(0),this.url=t,this.options=r;const o=new URL(t);this.host=o.searchParams.get("host"),this.port=parseInt(o.searchParams.get("port"),10),this.binaryType="arraybuffer",this.corsProxyUrl=i,this.CAroot=s,a==="messages"&&this.clientDownstream.readable.pipeTo(new WritableStream({write:l=>{this.emit("message",{data:l})},abort:()=>{this.emit("error",new Error("ECONNREFUSED")),this.close()},close:()=>{this.close()}})).catch(()=>{}),this.readyState=this.OPEN,this.emit("open")}on(t,r){this.addEventListener(t,r)}once(t,r){const s=i=>{r(i),this.removeEventListener(t,s)};this.addEventListener(t,s)}addEventListener(t,r){this.listeners.has(t)||this.listeners.set(t,new Set),this.listeners.get(t).add(r)}removeListener(t,r){this.removeEventListener(t,r)}removeEventListener(t,r){const s=this.listeners.get(t);s&&s.delete(r)}emit(t,r={}){t==="message"?this.onmessage(r):t==="close"?this.onclose(r):t==="error"?this.onerror(r):t==="open"&&this.onopen(r);const s=this.listeners.get(t);if(s)for(const i of s)i(r)}onclose(t){}onerror(t){}onmessage(t){}onopen(t){}send(t){if(!(this.readyState===this.CLOSING||this.readyState===this.CLOSED)&&(this.clientUpstreamWriter.write(new Uint8Array(t)),!this.fetchInitiated))switch(this.bufferedBytesFromClient=concatUint8Arrays([this.bufferedBytesFromClient,new Uint8Array(t)]),guessProtocol(this.port,this.bufferedBytesFromClient)){case!1:return;case"other":this.emit("error",new Error("Unsupported protocol")),this.close();break;case"tls":this.fetchOverTLS(),this.fetchInitiated=!0;break;case"http":this.fetchOverHTTP(),this.fetchInitiated=!0;break}}async fetchOverTLS(){if(!this.CAroot)throw new Error("TLS protocol is only supported when the TCPOverFetchWebsocket is instantiated with a CAroot");const t=await generateCertificate({subject:{commonName:this.host,organizationName:this.host,countryName:"US"},issuer:this.CAroot.tbsDescription.subject},this.CAroot.keyPair),r=new TLS_1_2_Connection;this.clientUpstream.readable.pipeTo(r.clientEnd.upstream.writable).catch(()=>{}),r.clientEnd.downstream.readable.pipeTo(this.clientDownstream.writable).catch(()=>{}),await r.TLSHandshake(t.keyPair.privateKey,[t.certificate,this.CAroot.certificate]);const{request:s,expectsContinue:i}=await RawBytesFetch.parseHttpRequest(r.serverEnd.upstream.readable,this.host,"https");if(i){const a=r.serverEnd.downstream.writable.getWriter();await a.write(new TextEncoder().encode(`HTTP/1.1 100 Continue\r
\r
`)),a.releaseLock()}try{await RawBytesFetch.fetchRawResponseBytes(s,this.corsProxyUrl).pipeTo(r.serverEnd.downstream.writable)}catch{}}async fetchOverHTTP(){const{request:t,expectsContinue:r}=await RawBytesFetch.parseHttpRequest(this.clientUpstream.readable,this.host,"http");if(r){const s=this.clientDownstream.writable.getWriter();await s.write(new TextEncoder().encode(`HTTP/1.1 100 Continue\r
\r
`)),s.releaseLock()}try{await RawBytesFetch.fetchRawResponseBytes(t,this.corsProxyUrl).pipeTo(this.clientDownstream.writable)}catch{}}close(){this.emit("message",{data:new Uint8Array(0)}),this.readyState=this.CLOSING,this.emit("close"),this.readyState=this.CLOSED}}const HTTP_METHODS=["GET","POST","HEAD","PATCH","OPTIONS","DELETE","PUT","TRACE"];function guessProtocol(n,t){if(t.length<8)return!1;if(n===443&&t[0]===ContentTypes.Handshake&&t[1]===3&&t[2]>=1&&t[2]<=3)return"tls";const s=new TextDecoder("latin1",{fatal:!0}).decode(t);return HTTP_METHODS.some(a=>s.startsWith(a+" "))?"http":"other"}class RawBytesFetch{static fetchRawResponseBytes(t,r){return new ReadableStream({async start(s){let i;try{i=await fetchWithCorsProxy(t,void 0,r)}catch(l){s.enqueue(new TextEncoder().encode(`HTTP/1.1 400 Bad Request\r
Content-Length: 0\r
\r
`)),s.error(l);return}s.enqueue(RawBytesFetch.headersAsBytes(i));const a=i.body?.getReader();if(!a){s.close();return}const o=new TextEncoder;for(;;){const{done:l,value:u}=await a.read();if(u&&(s.enqueue(o.encode(`${u.length.toString(16)}\r
`)),s.enqueue(u),s.enqueue(o.encode(`\r
`))),l){s.enqueue(o.encode(`0\r
\r
`)),s.close();return}}}})}static headersAsBytes(t){const r=`HTTP/1.1 ${t.status} ${t.statusText}`,s={};t.headers.forEach((o,l)=>{s[l.toLowerCase()]=o}),delete s["content-length"],delete s["content-encoding"],s["transfer-encoding"]="chunked";const i=[];for(const[o,l]of Object.entries(s))i.push(`${o}: ${l}`);const a=[r,...i].join(`\r
`)+`\r
\r
`;return new TextEncoder().encode(a)}static async parseHttpRequest(t,r,s){let i=new Uint8Array(0),a=!1,o=-1;const l=t.getReader();for(;o===-1;){const{done:T,value:E}=await l.read();if(T){a=!0;break}i=concatUint8Arrays([i,E]),o=findSequenceInBuffer(i,new Uint8Array([13,10,13,10]))}l.releaseLock();const u=i.slice(0,o),c=RawBytesFetch.parseRequestHeaders(u),d=RawBytesFetch.expectsContinue(c.headers),p=c.headers.get("Transfer-Encoding")!==null?"chunked":"content-length",f=c.headers.get("Content-Length")!==null?parseInt(c.headers.get("Content-Length"),10):void 0,g=i.slice(o+4);let y;if(c.method!=="GET"&&c.method!=="HEAD"){const T=t.getReader();let E=g.length,b=g.slice(-6);const S=new TextEncoder().encode(`0\r
\r
`);y=new ReadableStream({async start(A){g.length>0&&A.enqueue(g);const v=p==="content-length"&&f!==void 0&&E>=f;(a||v)&&A.close()},async pull(A){const{done:v,value:x}=await T.read();if(E+=x?.length||0,x&&(A.enqueue(x),b=concatUint8Arrays([b,x||new Uint8Array]).slice(-5)),v||p==="content-length"&&f!==void 0&&E>=f||p==="chunked"&&b.every((D,H)=>D===S[H])){A.close();return}}}),p==="chunked"&&(y=y.pipeThrough(new ChunkedDecoderStream))}const _=c.headers.get("Host")??r,h=new URL(c.path,s+"://"+_),m=RawBytesFetch.normalizeRequestHeadersForFetch(c.headers);return{request:new Request(h.toString(),{method:c.method,headers:m,body:y,duplex:y?"half":void 0}),expectsContinue:d}}static parseRequestHeaders(t){const r=new TextDecoder().decode(t),s=r.split(`
`)[0],[i,a]=s.split(" "),o=new Headers;for(const l of r.split(`\r
`).slice(1)){if(l==="")break;const u=l.indexOf(":");if(u===-1)continue;const c=l.slice(0,u).trim(),d=l.slice(u+1).trimStart();c!==""&&o.set(c,d)}return{method:i,path:a,headers:o}}static expectsContinue(t){return t.get("Expect")?.toLowerCase()==="100-continue"}static normalizeRequestHeadersForFetch(t){const r=new Headers(t);for(const s of["Connection","Content-Length","Expect","Host","Keep-Alive","Proxy-Authenticate","Proxy-Authorization","TE","Trailer","Transfer-Encoding","Upgrade"])r.delete(s);return r}}function findSequenceInBuffer(n,t){const r=n.length,s=t.length,i=r-s;for(let a=0;a<=i;a++){let o=!0;for(let l=0;l<s;l++)if(n[a+l]!==t[l]){o=!1;break}if(o)return a}return-1}function createMemoizedFetch(n=fetch){const t={};return async function(s,i){if(!t[s]){t[s]={responsePromise:n(s,i),async nextResponse(){const o=await t[s].responsePromise,[l,u]=t[s].unlockedBodyStream.tee();return t[s].unlockedBodyStream=l,new Response(u,{status:o.status,statusText:o.statusText,headers:o.headers})}};const a=await t[s].responsePromise;t[s].unlockedBodyStream=a.body}return t[s].nextResponse()}}const UNZIP_PROGRESS_FILES_INTERVAL=100,UNZIP_PROGRESS_UNCOMPRESSED_BYTES_INTERVAL=400*1024,UNZIP_PROGRESS_LINE_PREFIX="PLAYGROUND_UNZIP_PROGRESS:",unzipFile=async(n,t,r,s=!0,i)=>{const a=`/tmp/file-${Math.random()}.zip`;let o=!1;try{if(t instanceof File){const c=t;t=a,o=!0,await n.writeFile(t,new Uint8Array(await c.arrayBuffer()))}const u={code:`<?php
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
		`,env:{PLAYGROUND_UNZIP_ZIP_PATH:t,PLAYGROUND_UNZIP_EXTRACT_TO_PATH:r,PLAYGROUND_UNZIP_OVERWRITE_FILES:s?"1":"0",PLAYGROUND_UNZIP_REPORT_PROGRESS:i?"1":"0",PLAYGROUND_UNZIP_FILES_INTERVAL:String(UNZIP_PROGRESS_FILES_INTERVAL),PLAYGROUND_UNZIP_UNCOMPRESSED_BYTES_INTERVAL:String(UNZIP_PROGRESS_UNCOMPRESSED_BYTES_INTERVAL),PLAYGROUND_UNZIP_LINE_PREFIX:UNZIP_PROGRESS_LINE_PREFIX}};i?await runUnzipFileWithProgress(n,u,i):await n.run(u)}finally{if(o)try{await n.fileExists(a)&&await n.unlink(a)}catch{}}};async function runUnzipFileWithProgress(n,t,r){const s=await n.runStream(t),i=s.stderrText,a=s.stdout.getReader(),o=new TextDecoder;let l="",u;const c=f=>{if(f.startsWith(UNZIP_PROGRESS_LINE_PREFIX))try{r(JSON.parse(f.slice(UNZIP_PROGRESS_LINE_PREFIX.length)))}catch(g){u??=g}};try{for(;;){const{done:f,value:g}=await a.read();l+=o.decode(g,{stream:!f});let y=l.indexOf(`
`);for(;y!==-1;)c(l.slice(0,y)),l=l.slice(y+1),y=l.indexOf(`
`);if(f)break}}finally{a.releaseLock()}l&&c(l);const[d,p]=await Promise.all([s.exitCode,i]);if(d!==0)throw new Error(p.trim()||`Could not unzip file. PHP exited with code ${d}.`);if(u)throw u}async function getIntlExtensionModule(n=LatestSupportedPHPVersion){switch(n){case"8.5":return(await import("./assets/index-wAAn1M-S.js")).getIntlExtensionPath();case"8.4":return(await import("./assets/index-8NJWW2tm.js")).getIntlExtensionPath();case"8.3":return(await import("./assets/index-BIt9aH0c.js")).getIntlExtensionPath();case"8.2":return(await import("./assets/index-BqoIUqOm.js")).getIntlExtensionPath();case"8.1":return(await import("./assets/index-C4LHx7Zj.js")).getIntlExtensionPath();case"8.0":return(await import("./assets/index-CfkiXX1S.js")).getIntlExtensionPath();case"7.4":return(await import("./assets/index-Bb-5f4q6.js")).getIntlExtensionPath()}throw new Error(`Unsupported PHP version ${n}`)}async function withPHPExtensions(n,t,r,s=[]){if(!s.length)return r;const i=await Promise.all(s.map(a=>resolveRuntimePHPWebExtension(n,t,a)));return withResolvedPHPExtensions(r,i)}async function resolveRuntimePHPWebExtension(n,t,r){if(isLegacyPHPVersion(n))throw new Error(`Extensions are not available for legacy PHP ${n}.`);if(isPHPNextVersion(n))throw new Error("Extensions are not available for PHP next.");if(typeof r=="object"&&"source"in r){if(t==="asyncify")throw new Error("External PHP extensions require JSPI. Asyncify is only supported for PHP.wasm bundled extensions.");return await resolvePHPExtension({...r,phpVersion:n})}const s=typeof r=="string"?r:r.name;if(s!=="intl")throw new Error(`Unknown bundled PHP web extension: ${String(s)}.`);const i=createMemoizedFetch(fetch),a=await getIntlExtensionModule(n),o=(await import("./assets/extensions/icu-BRfHVWa3.js")).default,[l,u]=await Promise.all([a,o].map(async c=>{const d=await i(c);if(!d.ok)throw new Error(`Failed to fetch bundled PHP web extension asset: ${d.url||c} (${d.status} ${d.statusText}).`);return await d.arrayBuffer()}));return await resolvePHPExtension({source:{format:"so",name:"intl",bytes:new Uint8Array(l)},phpVersion:n,env:{ICU_DATA:"/internal/shared"},extraFiles:{files:{"/internal/shared/icudt74l.dat":new Uint8Array(u)}}})}const fakeWebsocket=()=>({websocket:{decorator:n=>class extends n{constructor(){try{super()}catch{}}send(){return null}}}});async function loadWebRuntime(n,t={}){"setImmediate"in globalThis||(globalThis.setImmediate=u=>setTimeout(u,0));const r=await jspi()?"jspi":"asyncify";let s={...fakeWebsocket(),...t.emscriptenOptions||{},phpWasmAsyncMode:r};t.tcpOverFetch&&(s=tcpOverFetchWebsocket(s,t.tcpOverFetch));const i=isLegacyPHPVersion(n),a=[...t.extensions??[]];if(t.withIntl&&!hasBuiltInExtension(a,"intl")&&a.push("intl"),i){const u=await s,c=u.preRun||[];s={...u,preRun:[...c,createLegacyPhpIniPreRunStep()]}}if(i&&a.length)throw new Error(`Extensions are not available for legacy PHP ${n}.`);i||(s=withPHPExtensions(n,r,await s,a));const[o,l]=await Promise.all([getPHPLoaderModule(n,r),s]);return t.onPhpLoaderModuleLoaded?.(o),await loadPHPRuntime(o,l)}function hasBuiltInExtension(n,t){return n.some(r=>typeof r=="string"?r===t:!("source"in r)&&r.name===t)}function journalFSEvents(n,t,r=()=>{}){function s(){t=normalizePath(t);const a=n[__private__dont__use].FS,o=createFSHooks(a,d=>{if(d.path.startsWith(t))r(d);else if(d.operation==="RENAME"&&d.toPath.startsWith(t))for(const p of recordExistingPath(n,d.path,d.toPath))r(p)}),l={};for(const[d]of Object.entries(o))l[d]=a[d];function u(){for(const[d,p]of Object.entries(o))a[d]=function(...f){return p(...f),l[d].apply(this,f)}}function c(){for(const[d,p]of Object.entries(l))n[__private__dont__use].FS[d]=p}n[__private__dont__use].journal={bind:u,unbind:c},u()}n.addEventListener("runtime.initialized",s),n[__private__dont__use]&&s();function i(){n[__private__dont__use].journal.unbind(),delete n[__private__dont__use].journal}return n.addEventListener("runtime.beforeExit",i),function(){return n.removeEventListener("runtime.initialized",s),n.removeEventListener("runtime.beforeExit",i),n[__private__dont__use].journal.unbind()}}const createFSHooks=(n,t=()=>{})=>({write(r){t({operation:"WRITE",path:r.path,nodeType:"file"})},truncate(r){let s;typeof r=="string"?s=n.lookupPath(r,{follow:!0}).node:s=r,t({operation:"WRITE",path:n.getPath(s),nodeType:"file"})},unlink(r){t({operation:"DELETE",path:r,nodeType:"file"})},mknod(r,s){n.isFile(s)&&t({operation:"CREATE",path:r,nodeType:"file"})},mkdir(r){t({operation:"CREATE",path:r,nodeType:"directory"})},rmdir(r){t({operation:"DELETE",path:r,nodeType:"directory"})},rename(r,s){try{const i=n.lookupPath(r,{follow:!0}),a=n.lookupPath(s,{parent:!0}).path;t({operation:"RENAME",nodeType:n.isDir(i.node.mode)?"directory":"file",path:i.path,toPath:joinPaths(a,basename(s))})}catch{}}});function replayFSJournal(n,t){n[__private__dont__use].journal.unbind();try{for(const r of t)r.operation==="CREATE"?r.nodeType==="file"?n.writeFile(r.path," "):n.mkdir(r.path):r.operation==="DELETE"?r.nodeType==="file"?n.unlink(r.path):n.rmdir(r.path):r.operation==="WRITE"?n.writeFile(r.path,r.data):r.operation==="RENAME"&&n.mv(r.path,r.toPath)}finally{n[__private__dont__use].journal.bind()}}function*recordExistingPath(n,t,r){if(n.isDir(t)){yield{operation:"CREATE",path:r,nodeType:"directory"};for(const s of n.listFiles(t))yield*recordExistingPath(n,joinPaths(t,s),joinPaths(r,s))}else yield{operation:"CREATE",path:r,nodeType:"file"},yield{operation:"WRITE",nodeType:"file",path:r}}function normalizePath(n){return n.replace(/\/$/,"").replace(/\/\/+/g,"/")}function normalizeFilesystemOperations(n){let t=n;for(;;){const r={},s=new Map,i=[];for(let a=0;a<t.length;a++){const o=t[a],l=o.operation==="RENAME"?o.toPath:o.path;s.has(l)||s.set(l,[]),s.get(l).push(a),o.operation==="RENAME"&&o.nodeType==="directory"&&i.push(a)}for(let a=t.length-1;a>=0;a--){const o=t[a];let l;if(o.operation==="RENAME"&&o.nodeType==="directory")l=function*(){for(let u=a-1;u>=0;u--)yield u}();else{let u=s.get(o.path)??[];o.operation==="RENAME"&&(u=[...new Set([...u,...i])]),l=[...u].sort((c,d)=>d-c)}for(const u of l){if(u>=a)continue;const c=checkRelationship(t[a],t[u]);if(c==="none")continue;const d=t[a],p=t[u];if(d.operation==="RENAME"&&p.operation==="RENAME"){logger.warn("[FS Journal] Normalizing a double rename is not yet supported:",{current:d,last:p});continue}(p.operation==="CREATE"||p.operation==="WRITE")&&(d.operation==="RENAME"?c==="same_node"?(r[u]=[],r[a]=[{...p,path:d.toPath},...r[a]||[]]):c==="descendant"&&(r[u]=[],r[a]=[{...p,path:joinPaths(d.toPath,p.path.substring(d.path.length))},...r[a]||[]]):d.operation==="WRITE"&&c==="same_node"?r[u]=[]:d.operation==="DELETE"&&c==="same_node"&&(r[u]=[],p.operation==="CREATE"&&(r[a]=[])))}}if(Object.keys(r).length===0)return t;t=t.flatMap((a,o)=>o in r?r[o]:[a])}}function checkRelationship(n,t){const r=n.path,s=n.operation!=="WRITE"&&n.nodeType==="directory",i=t.operation!=="WRITE"&&t.nodeType==="directory",a=t.operation==="RENAME"?t.toPath:t.path;return a===r?"same_node":i&&r.startsWith(a+"/")?"ancestor":s&&a.startsWith(r+"/")?"descendant":"none"}new Semaphore({concurrency:15});const DEFAULT_MAX_OPFS_FLUSH_PASSES=1e3;function createDirectoryHandleMountHandler(n,t={initialSync:{}}){return t={...t,initialSync:{...t.initialSync,direction:t.initialSync.direction??"opfs-to-memfs"}},async function(r,s,i){if(t.initialSync.direction==="opfs-to-memfs"){FSHelpers.fileExists(s,i)&&FSHelpers.rmdir(s,i),FSHelpers.mkdir(s,i),await copyOpfsToMemfs(s,n,i);const a=journalFSEventsToOpfs(r,n,i);return t.onMount?.(a),a.unmount}else{const a=journalFSEventsToOpfs(r,n,i);t.onMount?.(a);let o;try{await copyMemfsToOpfs(s,n,i,async l=>{o={...l,phase:"copying"},await t.initialSync.onProgress?.(o)}),await t.initialSync.onProgress?.({files:o?.files??0,total:o?.total??0,phase:"flushing"}),a.flush().catch(l=>{logger.error("OPFS flush failed after initial sync",{error:l,vfsMountPoint:i})})}catch(l){throw await a.discard(),l}return a.unmount}}}async function copyOpfsToMemfs(n,t,r){FSHelpers.mkdir(n,r);const s=new Semaphore({concurrency:40}),i=[];let a;const o=[[t,r]];try{for(;o.length>0;){const[l,u]=o.pop();for await(const c of l.values()){const d=await s.acquire();if(a!==void 0)throw d(),a;const p=(async()=>{const f=joinPaths(u,c.name);if(c.kind==="directory"){try{n.mkdir(f)}catch(g){if(g?.errno!==20)throw logger.error(g),g}o.push([c,f])}else if(c.kind==="file"){const g=await c.getFile(),y=new Uint8Array(await g.arrayBuffer());n.createDataFile(u,c.name,y,!0,!0,!0)}})().catch(f=>{a??=f}).finally(()=>{i.splice(i.indexOf(p),1),d()});i.push(p)}for(;o.length===0&&i.length>0;)await Promise.any(i)}}finally{await Promise.all(i)}if(a!==void 0)throw a}async function copyMemfsToOpfs(n,t,r,s){n.mkdirTree(r);const i=[];async function a(p,f){await Promise.all(n.readdir(p).filter(g=>g!=="."&&g!=="..").map(async g=>{const y=joinPaths(p,g);if(!isMemfsDir(n,y)){i.push([f,y,g]);return}const _=await f.getDirectoryHandle(g,{create:!0});return await a(y,_)}))}await a(r,t);let o=0;await s?.({files:o,total:i.length});const l=s&&throttle(s,100),u=100,c=new Set,d=[];try{for(const[p,f,g]of i){const y=overwriteOpfsFile(p,g,n,f).then(()=>{o++,l?.({files:o,total:i.length})},_=>{d.push({memfsPath:f,error:_})}).finally(()=>{c.delete(y)});c.add(y),c.size>=u&&(await Promise.race(c),l?.({files:o,total:i.length}))}}finally{await Promise.allSettled(c)}if(l?.cancel(),d.length>0){const p=d.map(({memfsPath:f})=>f).join(", ");throw new Error(`Failed to copy ${d.length} of ${i.length} file(s) to OPFS (${p}). The save is incomplete.`,{cause:d[0].error})}await s?.({files:i.length,total:i.length})}function isMemfsDir(n,t){return n.isDir(n.lookupPath(t,{follow:!0}).node.mode)}async function overwriteOpfsFile(n,t,r,s){let i;try{i=r.readFile(s,{encoding:"binary"})}catch{return}const a=await n.getFileHandle(t,{create:!0}),o=a.createWritable!==void 0?await a.createWritable():await a.createSyncAccessHandle();try{await o.truncate(0),await o.write(i)}catch(l){try{"abort"in o?await o.abort():await o.close()}catch{}throw l}await o.close()}function journalFSEventsToOpfs(n,t,r,s={}){const i=[],a=journalFSEvents(n,r,y=>{i.push(y)}),o=new OpfsRewriter(n,t,r);let l;function u(){return l===void 0&&(l=f().finally(()=>{l=void 0})),l}async function c(){try{for(;;)if(await u(),i.length===0){await d();return}}catch(y){throw new MountStillActiveError(y)}}async function d(){const y=l;a(),n.removeEventListener("request.end",p),n.removeEventListener("proxyfs.request.end",p),n.removeEventListener("filesystem.write",p);try{await y}catch(_){logger.error("OPFS flush failed while discarding a mount",_)}}function p(){u().catch(y=>{logger.error(y)})}async function f(){const y=s.maxFlushPasses??DEFAULT_MAX_OPFS_FLUSH_PASSES;for(let _=0;i.length>0;_++){if(_>=y){const h=i.length,m=h===1?`${h} journal entry remains`:`${h} journal entries remain`;throw new Error(`OPFS flush for "${r}" did not settle after ${y} journal batches; ${m}. This can happen when filesystem writes are continuously enqueued while flushing.`)}await g()}}async function g(){if(i.length===0)return;const y=await n.semaphore.acquire(),_=[...i];i.splice(0,_.length);const h=normalizeFilesystemOperations(_);let m=0;try{for(const w of h)await o.processEntry(w),m++}catch(w){throw i.unshift(...h.slice(m)),w}finally{y()}}return n.addEventListener("request.end",p),n.addEventListener("proxyfs.request.end",p),n.addEventListener("filesystem.write",p),{flush:u,unmount:c,discard:d}}class OpfsRewriter{constructor(t,r,s){this.php=t,this.opfs=r,this.memfsRoot=normalizeMemfsPath(s)}toOpfsPath(t){return normalizeMemfsPath(t.substring(this.memfsRoot.length))}async processEntry(t){if(!t.path.startsWith(this.memfsRoot)||t.path===this.memfsRoot)return;const r=this.toOpfsPath(t.path),s=await resolveParent(this.opfs,r),i=getFilename(r);if(i)try{if(t.operation==="DELETE")try{await s.removeEntry(i,{recursive:!0})}catch{}else if(t.operation==="CREATE")t.nodeType==="directory"?await s.getDirectoryHandle(i,{create:!0}):await s.getFileHandle(i,{create:!0});else if(t.operation==="WRITE")await overwriteOpfsFile(s,i,this.php[__private__dont__use].FS,t.path);else if(t.operation==="RENAME"&&t.toPath.startsWith(this.memfsRoot)){const a=this.toOpfsPath(t.toPath),o=await resolveParent(this.opfs,a);if(t.nodeType==="directory"){const l=await o.getDirectoryHandle(i,{create:!0});await copyMemfsToOpfs(this.php[__private__dont__use].FS,l,t.toPath);try{await s.removeEntry(i,{recursive:!0})}catch(u){if(u.name!=="NotFoundError")throw u}}else{try{await s.removeEntry(i)}catch{}await overwriteOpfsFile(o,basename(a),this.php[__private__dont__use].FS,t.toPath)}}}catch(a){throw logger.log({entry:t,name:i}),logger.error(a),a}}}function normalizeMemfsPath(n){return n.replace(/\/$/,"").replace(/\/\/+/g,"/")}function getFilename(n){return n.substring(n.lastIndexOf("/")+1)}async function resolveParent(n,t){const r=t.replace(/^\/+|\/+$/g,"").replace(/\/+/,"/");if(!r)return n;const s=r.split("/");let i=n;for(let a=0;a<s.length-1;a++){const o=s[a];i=await i.getDirectoryHandle(o,{create:!0})}return i}function throttle(n,t){let r=0,s,i;const a=function(...l){i=l;const u=Date.now()-r;if(s===void 0){const c=Math.max(0,t-u);s=setTimeout(()=>{s=void 0,r=Date.now();const d=i;i=void 0;try{Promise.resolve(n(...d)).catch(logThrottledProgressCallbackError)}catch(p){logThrottledProgressCallbackError(p)}},c)}};return a.cancel=()=>{s!==void 0&&clearTimeout(s),s=void 0,i=void 0},a}function logThrottledProgressCallbackError(n){logger.error("Throttled progress callback failed",{error:n})}const textEncoder=new TextEncoder,base64Chars="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",base64Lookup=new Uint8Array(256);for(let n=0;n<base64Chars.length;n++)base64Lookup[base64Chars.charCodeAt(n)]=n;function decodeBase64(n){let t=Math.ceil(n.length/4)*3;const r=n.length;let s=0;n.length%4===3?t--:n.length%4===2?t-=2:n[n.length-1]==="="&&(t--,n[n.length-2]==="="&&t--);const i=new ArrayBuffer(t),a=new Uint8Array(i);for(let o=0;o<r;o+=4){let l=base64Lookup[n.charCodeAt(o)],u=base64Lookup[n.charCodeAt(o+1)],c=base64Lookup[n.charCodeAt(o+2)],d=base64Lookup[n.charCodeAt(o+3)];a[s++]=l<<2|u>>4,a[s++]=(u&15)<<4|c>>2,a[s++]=(c&3)<<6|d&63}return i}const charsetAliases=new Map([["iso-8859-8-i","iso-8859-8"],["iso-8859-8-e","iso-8859-8"]]);function getDecoder(n){n=(n||"utf8").trim().toLowerCase(),n=charsetAliases.get(n)||n;let t;try{t=new TextDecoder(n)}catch{t=new TextDecoder("windows-1252")}return t}async function blobToArrayBuffer(n){if("arrayBuffer"in n)return await n.arrayBuffer();const t=new FileReader;return new Promise((r,s)=>{t.onload=function(i){r(i.target.result)},t.onerror=function(i){s(t.error)},t.readAsArrayBuffer(n)})}function getHex(n){return n>=48&&n<=57||n>=97&&n<=102||n>=65&&n<=70?String.fromCharCode(n):!1}function decodeWord(n,t,r){let s=n.indexOf("*");s>=0&&(n=n.substr(0,s)),t=t.toUpperCase();let i;if(t==="Q"){r=r.replace(/=\s+([0-9a-fA-F])/g,"=$1").replace(/[_\s]/g," ");let a=textEncoder.encode(r),o=[];for(let u=0,c=a.length;u<c;u++){let d=a[u];if(u<=c-2&&d===61){let p=getHex(a[u+1]),f=getHex(a[u+2]);if(p&&f){let g=parseInt(p+f,16);o.push(g),u+=2;continue}}o.push(d)}i=new ArrayBuffer(o.length);let l=new DataView(i);for(let u=0,c=o.length;u<c;u++)l.setUint8(u,o[u])}else t==="B"?i=decodeBase64(r.replace(/[^a-zA-Z0-9\+\/=]+/g,"")):i=textEncoder.encode(r);return getDecoder(n).decode(i)}function decodeWords(n){let t=!0;for(;;){let r=(n||"").toString().replace(/(=\?([^?]+)\?[Bb]\?([^?]*)\?=)\s*(?==\?([^?]+)\?[Bb]\?[^?]*\?=)/g,(s,i,a,o,l)=>t&&a===l&&o.length%4===0&&!/=$/.test(o)?i+"__\0JOIN\0__":s).replace(/(=\?([^?]+)\?[Qq]\?[^?]*\?=)\s*(?==\?([^?]+)\?[Qq]\?[^?]*\?=)/g,(s,i,a,o)=>t&&a===o?i+"__\0JOIN\0__":s).replace(/(\?=)?__\x00JOIN\x00__(=\?([^?]+)\?[QqBb]\?)?/g,"").replace(/(=\?[^?]+\?[QqBb]\?[^?]*\?=)\s+(?==\?[^?]+\?[QqBb]\?[^?]*\?=)/g,"$1").replace(/=\?([\w_\-*]+)\?([QqBb])\?([^?]*)\?=/g,(s,i,a,o)=>decodeWord(i,a,o));if(t&&r.indexOf("�")>=0)t=!1;else return r}}function decodeURIComponentWithCharset(n,t){t=t||"utf-8";let r=[];for(let a=0;a<n.length;a++){let o=n.charAt(a);if(o==="%"&&/^[a-f0-9]{2}/i.test(n.substr(a+1,2))){let l=n.substr(a+1,2);a+=2,r.push(parseInt(l,16))}else if(o.charCodeAt(0)>126){o=textEncoder.encode(o);for(let l=0;l<o.length;l++)r.push(o[l])}else r.push(o.charCodeAt(0))}const s=new ArrayBuffer(r.length),i=new DataView(s);for(let a=0,o=r.length;a<o;a++)i.setUint8(a,r[a]);return getDecoder(t).decode(s)}function decodeParameterValueContinuations(n){let t=new Map;Object.keys(n.params).forEach(r=>{let s=r.match(/\*((\d+)\*?)?$/);if(!s)return;let i=r.substr(0,s.index).toLowerCase(),a=Number(s[2])||0,o;t.has(i)?o=t.get(i):(o={charset:!1,values:[]},t.set(i,o));let l=n.params[r];a===0&&s[0].charAt(s[0].length-1)==="*"&&(s=l.match(/^([^']*)'[^']*'(.*)$/))&&(o.charset=s[1]||"utf-8",l=s[2]),o.values.push({nr:a,value:l}),delete n.params[r]}),t.forEach((r,s)=>{n.params[s]=decodeURIComponentWithCharset(r.values.sort((i,a)=>i.nr-a.nr).map(i=>i.value).join(""),r.charset)})}class PassThroughDecoder{constructor(){this.chunks=[]}update(t){this.chunks.push(t),this.chunks.push(`
`)}finalize(){return blobToArrayBuffer(new Blob(this.chunks,{type:"application/octet-stream"}))}}class Base64Decoder{constructor(t){t=t||{},this.decoder=t.decoder||new TextDecoder,this.maxChunkSize=100*1024,this.chunks=[],this.remainder=""}update(t){let r=this.decoder.decode(t);if(r=r.replace(/[^a-zA-Z0-9+\/]+/g,""),this.remainder+=r,this.remainder.length>=this.maxChunkSize){let s=Math.floor(this.remainder.length/4)*4,i;s===this.remainder.length?(i=this.remainder,this.remainder=""):(i=this.remainder.substr(0,s),this.remainder=this.remainder.substr(s)),i.length&&this.chunks.push(decodeBase64(i))}}finalize(){return this.remainder&&!/^=+$/.test(this.remainder)&&this.chunks.push(decodeBase64(this.remainder)),blobToArrayBuffer(new Blob(this.chunks,{type:"application/octet-stream"}))}}const VALID_QP_REGEX=/^=[a-f0-9]{2}$/i,QP_SPLIT_REGEX=/(?==[a-f0-9]{2})/i,SOFT_LINE_BREAK_REGEX=/=\r?\n/g,PARTIAL_QP_ENDING_REGEX=/=[a-fA-F0-9]?$/;class QPDecoder{constructor(t){t=t||{},this.decoder=t.decoder||new TextDecoder,this.maxChunkSize=100*1024,this.remainder="",this.chunks=[]}decodeQPBytes(t){let r=new ArrayBuffer(t.length),s=new DataView(r);for(let i=0,a=t.length;i<a;i++)s.setUint8(i,parseInt(t[i],16));return r}decodeChunks(t){t=t.replace(SOFT_LINE_BREAK_REGEX,"");let r=t.split(QP_SPLIT_REGEX),s=[];for(let i of r){if(i.charAt(0)!=="="){s.length&&(this.chunks.push(this.decodeQPBytes(s)),s=[]),this.chunks.push(i);continue}if(i.length===3){VALID_QP_REGEX.test(i)?s.push(i.substr(1)):(s.length&&(this.chunks.push(this.decodeQPBytes(s)),s=[]),this.chunks.push(i));continue}if(i.length>3){const a=i.substr(0,3);VALID_QP_REGEX.test(a)?(s.push(i.substr(1,2)),this.chunks.push(this.decodeQPBytes(s)),s=[],i=i.substr(3),this.chunks.push(i)):(s.length&&(this.chunks.push(this.decodeQPBytes(s)),s=[]),this.chunks.push(i))}}s.length&&this.chunks.push(this.decodeQPBytes(s))}update(t){let r=this.decoder.decode(t)+`
`;if(r=this.remainder+r,r.length<this.maxChunkSize){this.remainder=r;return}this.remainder="";let s=r.match(PARTIAL_QP_ENDING_REGEX);if(s){if(s.index===0){this.remainder=r;return}this.remainder=r.substr(s.index),r=r.substr(0,s.index)}this.decodeChunks(r)}finalize(){return this.remainder.length&&(this.decodeChunks(this.remainder),this.remainder=""),blobToArrayBuffer(new Blob(this.chunks,{type:"application/octet-stream"}))}}const defaultDecoder=getDecoder();class MimeNode{constructor(t){if(this.options=t||{},this.postalMime=this.options.postalMime,this.root=!!this.options.parentNode,this.childNodes=[],this.options.parentNode){if(this.parentNode=this.options.parentNode,this.depth=this.parentNode.depth+1,this.depth>this.options.maxNestingDepth)throw new Error(`Maximum MIME nesting depth of ${this.options.maxNestingDepth} levels exceeded`);this.options.parentNode.childNodes.push(this)}else this.depth=0;this.state="header",this.headerLines=[],this.headerSize=0;const s=(this.options.parentMultipartType||null)==="digest"?"message/rfc822":"text/plain";this.contentType={value:s,default:!0},this.contentTransferEncoding={value:"8bit"},this.contentDisposition={value:""},this.headers=[],this.contentDecoder=!1}setupContentDecoder(t){/base64/i.test(t)?this.contentDecoder=new Base64Decoder:/quoted-printable/i.test(t)?this.contentDecoder=new QPDecoder({decoder:getDecoder(this.contentType.parsed.params.charset)}):this.contentDecoder=new PassThroughDecoder}async finalize(){if(this.state==="finished")return;this.state==="header"&&this.processHeaders();let t=this.postalMime.boundaries;for(let r=t.length-1;r>=0;r--)if(t[r].node===this){t.splice(r,1);break}await this.finalizeChildNodes(),this.content=this.contentDecoder?await this.contentDecoder.finalize():null,this.state="finished"}async finalizeChildNodes(){for(let t of this.childNodes)await t.finalize()}stripComments(t){let r="",s=0,i=!1,a=!1;for(let o=0;o<t.length;o++){const l=t.charAt(o);if(i){s===0&&(r+=l),i=!1;continue}if(l==="\\"){i=!0,s===0&&(r+=l);continue}if(l==='"'&&s===0){a=!a,r+=l;continue}if(!a){if(l==="("){s++;continue}if(l===")"&&s>0){s--;continue}}s===0&&(r+=l)}return r}parseStructuredHeader(t){t=this.stripComments(t);let r={value:!1,params:{}},s=!1,i="",a="value",o=!1,l=!1,u;for(let c=0,d=t.length;c<d;c++)switch(u=t.charAt(c),a){case"key":if(u==="="){s=i.trim().toLowerCase(),a="value",i="";break}i+=u;break;case"value":if(l)i+=u;else if(u==="\\"){l=!0;continue}else o&&u===o?o=!1:!o&&u==='"'?o=u:!o&&u===";"?(s===!1?r.value=i.trim():r.params[s]=i.trim(),a="key",i=""):i+=u;l=!1;break}return i=i.trim(),a==="value"?s===!1?r.value=i:r.params[s]=i:i&&(r.params[i.toLowerCase()]=""),r.value&&(r.value=r.value.toLowerCase()),decodeParameterValueContinuations(r),r}decodeFlowedText(t,r){return t.split(/\r?\n/).reduce((s,i)=>s.endsWith(" ")&&s!=="-- "&&!s.endsWith(`
-- `)?r?s.slice(0,-1)+i:s+i:s+`
`+i).replace(/^ /gm,"")}getTextContent(){if(!this.content)return"";let t=getDecoder(this.contentType.parsed.params.charset).decode(this.content);return/^flowed$/i.test(this.contentType.parsed.params.format)&&(t=this.decodeFlowedText(t,/^yes$/i.test(this.contentType.parsed.params.delsp))),t}processHeaders(){for(let t=this.headerLines.length-1;t>=0;t--){let r=this.headerLines[t];t&&/^\s/.test(r)&&(this.headerLines[t-1]+=`
`+r,this.headerLines.splice(t,1))}this.rawHeaderLines=[];for(let t=this.headerLines.length-1;t>=0;t--){let r=this.headerLines[t],s=r.indexOf(":"),i=s<0?r.trim():r.substr(0,s).trim();this.rawHeaderLines.push({key:i.toLowerCase(),line:r});let a=r.replace(/\s+/g," ");s=a.indexOf(":");let o=s<0?a.trim():a.substr(0,s).trim(),l=s<0?"":a.substr(s+1).trim();switch(this.headers.push({key:o.toLowerCase(),originalKey:o,value:l}),o.toLowerCase()){case"content-type":this.contentType.default&&(this.contentType={value:l,parsed:{}});break;case"content-transfer-encoding":this.contentTransferEncoding={value:l,parsed:{}};break;case"content-disposition":this.contentDisposition={value:l,parsed:{}};break;case"content-id":this.contentId=l;break;case"content-description":this.contentDescription=l;break}}this.contentType.parsed=this.parseStructuredHeader(this.contentType.value),this.contentType.multipart=/^multipart\//i.test(this.contentType.parsed.value)?this.contentType.parsed.value.substr(this.contentType.parsed.value.indexOf("/")+1):!1,this.contentType.multipart&&this.contentType.parsed.params.boundary&&this.postalMime.boundaries.push({value:textEncoder.encode(this.contentType.parsed.params.boundary),node:this}),this.contentDisposition.parsed=this.parseStructuredHeader(this.contentDisposition.value),this.contentTransferEncoding.encoding=this.contentTransferEncoding.value.toLowerCase().split(/[^\w-]/).shift(),this.setupContentDecoder(this.contentTransferEncoding.encoding)}feed(t){switch(this.state){case"header":if(!t.length)return this.state="body",this.processHeaders();if(this.headerSize+=t.length,this.headerSize>this.options.maxHeadersSize)throw new Error(`Maximum header size of ${this.options.maxHeadersSize} bytes exceeded`);this.headerLines.push(defaultDecoder.decode(t));break;case"body":this.contentDecoder.update(t)}}}const htmlEntities={"&AElig":"Æ","&AElig;":"Æ","&AMP":"&","&AMP;":"&","&Aacute":"Á","&Aacute;":"Á","&Abreve;":"Ă","&Acirc":"Â","&Acirc;":"Â","&Acy;":"А","&Afr;":"𝔄","&Agrave":"À","&Agrave;":"À","&Alpha;":"Α","&Amacr;":"Ā","&And;":"⩓","&Aogon;":"Ą","&Aopf;":"𝔸","&ApplyFunction;":"⁡","&Aring":"Å","&Aring;":"Å","&Ascr;":"𝒜","&Assign;":"≔","&Atilde":"Ã","&Atilde;":"Ã","&Auml":"Ä","&Auml;":"Ä","&Backslash;":"∖","&Barv;":"⫧","&Barwed;":"⌆","&Bcy;":"Б","&Because;":"∵","&Bernoullis;":"ℬ","&Beta;":"Β","&Bfr;":"𝔅","&Bopf;":"𝔹","&Breve;":"˘","&Bscr;":"ℬ","&Bumpeq;":"≎","&CHcy;":"Ч","&COPY":"©","&COPY;":"©","&Cacute;":"Ć","&Cap;":"⋒","&CapitalDifferentialD;":"ⅅ","&Cayleys;":"ℭ","&Ccaron;":"Č","&Ccedil":"Ç","&Ccedil;":"Ç","&Ccirc;":"Ĉ","&Cconint;":"∰","&Cdot;":"Ċ","&Cedilla;":"¸","&CenterDot;":"·","&Cfr;":"ℭ","&Chi;":"Χ","&CircleDot;":"⊙","&CircleMinus;":"⊖","&CirclePlus;":"⊕","&CircleTimes;":"⊗","&ClockwiseContourIntegral;":"∲","&CloseCurlyDoubleQuote;":"”","&CloseCurlyQuote;":"’","&Colon;":"∷","&Colone;":"⩴","&Congruent;":"≡","&Conint;":"∯","&ContourIntegral;":"∮","&Copf;":"ℂ","&Coproduct;":"∐","&CounterClockwiseContourIntegral;":"∳","&Cross;":"⨯","&Cscr;":"𝒞","&Cup;":"⋓","&CupCap;":"≍","&DD;":"ⅅ","&DDotrahd;":"⤑","&DJcy;":"Ђ","&DScy;":"Ѕ","&DZcy;":"Џ","&Dagger;":"‡","&Darr;":"↡","&Dashv;":"⫤","&Dcaron;":"Ď","&Dcy;":"Д","&Del;":"∇","&Delta;":"Δ","&Dfr;":"𝔇","&DiacriticalAcute;":"´","&DiacriticalDot;":"˙","&DiacriticalDoubleAcute;":"˝","&DiacriticalGrave;":"`","&DiacriticalTilde;":"˜","&Diamond;":"⋄","&DifferentialD;":"ⅆ","&Dopf;":"𝔻","&Dot;":"¨","&DotDot;":"⃜","&DotEqual;":"≐","&DoubleContourIntegral;":"∯","&DoubleDot;":"¨","&DoubleDownArrow;":"⇓","&DoubleLeftArrow;":"⇐","&DoubleLeftRightArrow;":"⇔","&DoubleLeftTee;":"⫤","&DoubleLongLeftArrow;":"⟸","&DoubleLongLeftRightArrow;":"⟺","&DoubleLongRightArrow;":"⟹","&DoubleRightArrow;":"⇒","&DoubleRightTee;":"⊨","&DoubleUpArrow;":"⇑","&DoubleUpDownArrow;":"⇕","&DoubleVerticalBar;":"∥","&DownArrow;":"↓","&DownArrowBar;":"⤓","&DownArrowUpArrow;":"⇵","&DownBreve;":"̑","&DownLeftRightVector;":"⥐","&DownLeftTeeVector;":"⥞","&DownLeftVector;":"↽","&DownLeftVectorBar;":"⥖","&DownRightTeeVector;":"⥟","&DownRightVector;":"⇁","&DownRightVectorBar;":"⥗","&DownTee;":"⊤","&DownTeeArrow;":"↧","&Downarrow;":"⇓","&Dscr;":"𝒟","&Dstrok;":"Đ","&ENG;":"Ŋ","&ETH":"Ð","&ETH;":"Ð","&Eacute":"É","&Eacute;":"É","&Ecaron;":"Ě","&Ecirc":"Ê","&Ecirc;":"Ê","&Ecy;":"Э","&Edot;":"Ė","&Efr;":"𝔈","&Egrave":"È","&Egrave;":"È","&Element;":"∈","&Emacr;":"Ē","&EmptySmallSquare;":"◻","&EmptyVerySmallSquare;":"▫","&Eogon;":"Ę","&Eopf;":"𝔼","&Epsilon;":"Ε","&Equal;":"⩵","&EqualTilde;":"≂","&Equilibrium;":"⇌","&Escr;":"ℰ","&Esim;":"⩳","&Eta;":"Η","&Euml":"Ë","&Euml;":"Ë","&Exists;":"∃","&ExponentialE;":"ⅇ","&Fcy;":"Ф","&Ffr;":"𝔉","&FilledSmallSquare;":"◼","&FilledVerySmallSquare;":"▪","&Fopf;":"𝔽","&ForAll;":"∀","&Fouriertrf;":"ℱ","&Fscr;":"ℱ","&GJcy;":"Ѓ","&GT":">","&GT;":">","&Gamma;":"Γ","&Gammad;":"Ϝ","&Gbreve;":"Ğ","&Gcedil;":"Ģ","&Gcirc;":"Ĝ","&Gcy;":"Г","&Gdot;":"Ġ","&Gfr;":"𝔊","&Gg;":"⋙","&Gopf;":"𝔾","&GreaterEqual;":"≥","&GreaterEqualLess;":"⋛","&GreaterFullEqual;":"≧","&GreaterGreater;":"⪢","&GreaterLess;":"≷","&GreaterSlantEqual;":"⩾","&GreaterTilde;":"≳","&Gscr;":"𝒢","&Gt;":"≫","&HARDcy;":"Ъ","&Hacek;":"ˇ","&Hat;":"^","&Hcirc;":"Ĥ","&Hfr;":"ℌ","&HilbertSpace;":"ℋ","&Hopf;":"ℍ","&HorizontalLine;":"─","&Hscr;":"ℋ","&Hstrok;":"Ħ","&HumpDownHump;":"≎","&HumpEqual;":"≏","&IEcy;":"Е","&IJlig;":"Ĳ","&IOcy;":"Ё","&Iacute":"Í","&Iacute;":"Í","&Icirc":"Î","&Icirc;":"Î","&Icy;":"И","&Idot;":"İ","&Ifr;":"ℑ","&Igrave":"Ì","&Igrave;":"Ì","&Im;":"ℑ","&Imacr;":"Ī","&ImaginaryI;":"ⅈ","&Implies;":"⇒","&Int;":"∬","&Integral;":"∫","&Intersection;":"⋂","&InvisibleComma;":"⁣","&InvisibleTimes;":"⁢","&Iogon;":"Į","&Iopf;":"𝕀","&Iota;":"Ι","&Iscr;":"ℐ","&Itilde;":"Ĩ","&Iukcy;":"І","&Iuml":"Ï","&Iuml;":"Ï","&Jcirc;":"Ĵ","&Jcy;":"Й","&Jfr;":"𝔍","&Jopf;":"𝕁","&Jscr;":"𝒥","&Jsercy;":"Ј","&Jukcy;":"Є","&KHcy;":"Х","&KJcy;":"Ќ","&Kappa;":"Κ","&Kcedil;":"Ķ","&Kcy;":"К","&Kfr;":"𝔎","&Kopf;":"𝕂","&Kscr;":"𝒦","&LJcy;":"Љ","&LT":"<","&LT;":"<","&Lacute;":"Ĺ","&Lambda;":"Λ","&Lang;":"⟪","&Laplacetrf;":"ℒ","&Larr;":"↞","&Lcaron;":"Ľ","&Lcedil;":"Ļ","&Lcy;":"Л","&LeftAngleBracket;":"⟨","&LeftArrow;":"←","&LeftArrowBar;":"⇤","&LeftArrowRightArrow;":"⇆","&LeftCeiling;":"⌈","&LeftDoubleBracket;":"⟦","&LeftDownTeeVector;":"⥡","&LeftDownVector;":"⇃","&LeftDownVectorBar;":"⥙","&LeftFloor;":"⌊","&LeftRightArrow;":"↔","&LeftRightVector;":"⥎","&LeftTee;":"⊣","&LeftTeeArrow;":"↤","&LeftTeeVector;":"⥚","&LeftTriangle;":"⊲","&LeftTriangleBar;":"⧏","&LeftTriangleEqual;":"⊴","&LeftUpDownVector;":"⥑","&LeftUpTeeVector;":"⥠","&LeftUpVector;":"↿","&LeftUpVectorBar;":"⥘","&LeftVector;":"↼","&LeftVectorBar;":"⥒","&Leftarrow;":"⇐","&Leftrightarrow;":"⇔","&LessEqualGreater;":"⋚","&LessFullEqual;":"≦","&LessGreater;":"≶","&LessLess;":"⪡","&LessSlantEqual;":"⩽","&LessTilde;":"≲","&Lfr;":"𝔏","&Ll;":"⋘","&Lleftarrow;":"⇚","&Lmidot;":"Ŀ","&LongLeftArrow;":"⟵","&LongLeftRightArrow;":"⟷","&LongRightArrow;":"⟶","&Longleftarrow;":"⟸","&Longleftrightarrow;":"⟺","&Longrightarrow;":"⟹","&Lopf;":"𝕃","&LowerLeftArrow;":"↙","&LowerRightArrow;":"↘","&Lscr;":"ℒ","&Lsh;":"↰","&Lstrok;":"Ł","&Lt;":"≪","&Map;":"⤅","&Mcy;":"М","&MediumSpace;":" ","&Mellintrf;":"ℳ","&Mfr;":"𝔐","&MinusPlus;":"∓","&Mopf;":"𝕄","&Mscr;":"ℳ","&Mu;":"Μ","&NJcy;":"Њ","&Nacute;":"Ń","&Ncaron;":"Ň","&Ncedil;":"Ņ","&Ncy;":"Н","&NegativeMediumSpace;":"​","&NegativeThickSpace;":"​","&NegativeThinSpace;":"​","&NegativeVeryThinSpace;":"​","&NestedGreaterGreater;":"≫","&NestedLessLess;":"≪","&NewLine;":`
`,"&Nfr;":"𝔑","&NoBreak;":"⁠","&NonBreakingSpace;":" ","&Nopf;":"ℕ","&Not;":"⫬","&NotCongruent;":"≢","&NotCupCap;":"≭","&NotDoubleVerticalBar;":"∦","&NotElement;":"∉","&NotEqual;":"≠","&NotEqualTilde;":"≂̸","&NotExists;":"∄","&NotGreater;":"≯","&NotGreaterEqual;":"≱","&NotGreaterFullEqual;":"≧̸","&NotGreaterGreater;":"≫̸","&NotGreaterLess;":"≹","&NotGreaterSlantEqual;":"⩾̸","&NotGreaterTilde;":"≵","&NotHumpDownHump;":"≎̸","&NotHumpEqual;":"≏̸","&NotLeftTriangle;":"⋪","&NotLeftTriangleBar;":"⧏̸","&NotLeftTriangleEqual;":"⋬","&NotLess;":"≮","&NotLessEqual;":"≰","&NotLessGreater;":"≸","&NotLessLess;":"≪̸","&NotLessSlantEqual;":"⩽̸","&NotLessTilde;":"≴","&NotNestedGreaterGreater;":"⪢̸","&NotNestedLessLess;":"⪡̸","&NotPrecedes;":"⊀","&NotPrecedesEqual;":"⪯̸","&NotPrecedesSlantEqual;":"⋠","&NotReverseElement;":"∌","&NotRightTriangle;":"⋫","&NotRightTriangleBar;":"⧐̸","&NotRightTriangleEqual;":"⋭","&NotSquareSubset;":"⊏̸","&NotSquareSubsetEqual;":"⋢","&NotSquareSuperset;":"⊐̸","&NotSquareSupersetEqual;":"⋣","&NotSubset;":"⊂⃒","&NotSubsetEqual;":"⊈","&NotSucceeds;":"⊁","&NotSucceedsEqual;":"⪰̸","&NotSucceedsSlantEqual;":"⋡","&NotSucceedsTilde;":"≿̸","&NotSuperset;":"⊃⃒","&NotSupersetEqual;":"⊉","&NotTilde;":"≁","&NotTildeEqual;":"≄","&NotTildeFullEqual;":"≇","&NotTildeTilde;":"≉","&NotVerticalBar;":"∤","&Nscr;":"𝒩","&Ntilde":"Ñ","&Ntilde;":"Ñ","&Nu;":"Ν","&OElig;":"Œ","&Oacute":"Ó","&Oacute;":"Ó","&Ocirc":"Ô","&Ocirc;":"Ô","&Ocy;":"О","&Odblac;":"Ő","&Ofr;":"𝔒","&Ograve":"Ò","&Ograve;":"Ò","&Omacr;":"Ō","&Omega;":"Ω","&Omicron;":"Ο","&Oopf;":"𝕆","&OpenCurlyDoubleQuote;":"“","&OpenCurlyQuote;":"‘","&Or;":"⩔","&Oscr;":"𝒪","&Oslash":"Ø","&Oslash;":"Ø","&Otilde":"Õ","&Otilde;":"Õ","&Otimes;":"⨷","&Ouml":"Ö","&Ouml;":"Ö","&OverBar;":"‾","&OverBrace;":"⏞","&OverBracket;":"⎴","&OverParenthesis;":"⏜","&PartialD;":"∂","&Pcy;":"П","&Pfr;":"𝔓","&Phi;":"Φ","&Pi;":"Π","&PlusMinus;":"±","&Poincareplane;":"ℌ","&Popf;":"ℙ","&Pr;":"⪻","&Precedes;":"≺","&PrecedesEqual;":"⪯","&PrecedesSlantEqual;":"≼","&PrecedesTilde;":"≾","&Prime;":"″","&Product;":"∏","&Proportion;":"∷","&Proportional;":"∝","&Pscr;":"𝒫","&Psi;":"Ψ","&QUOT":'"',"&QUOT;":'"',"&Qfr;":"𝔔","&Qopf;":"ℚ","&Qscr;":"𝒬","&RBarr;":"⤐","&REG":"®","&REG;":"®","&Racute;":"Ŕ","&Rang;":"⟫","&Rarr;":"↠","&Rarrtl;":"⤖","&Rcaron;":"Ř","&Rcedil;":"Ŗ","&Rcy;":"Р","&Re;":"ℜ","&ReverseElement;":"∋","&ReverseEquilibrium;":"⇋","&ReverseUpEquilibrium;":"⥯","&Rfr;":"ℜ","&Rho;":"Ρ","&RightAngleBracket;":"⟩","&RightArrow;":"→","&RightArrowBar;":"⇥","&RightArrowLeftArrow;":"⇄","&RightCeiling;":"⌉","&RightDoubleBracket;":"⟧","&RightDownTeeVector;":"⥝","&RightDownVector;":"⇂","&RightDownVectorBar;":"⥕","&RightFloor;":"⌋","&RightTee;":"⊢","&RightTeeArrow;":"↦","&RightTeeVector;":"⥛","&RightTriangle;":"⊳","&RightTriangleBar;":"⧐","&RightTriangleEqual;":"⊵","&RightUpDownVector;":"⥏","&RightUpTeeVector;":"⥜","&RightUpVector;":"↾","&RightUpVectorBar;":"⥔","&RightVector;":"⇀","&RightVectorBar;":"⥓","&Rightarrow;":"⇒","&Ropf;":"ℝ","&RoundImplies;":"⥰","&Rrightarrow;":"⇛","&Rscr;":"ℛ","&Rsh;":"↱","&RuleDelayed;":"⧴","&SHCHcy;":"Щ","&SHcy;":"Ш","&SOFTcy;":"Ь","&Sacute;":"Ś","&Sc;":"⪼","&Scaron;":"Š","&Scedil;":"Ş","&Scirc;":"Ŝ","&Scy;":"С","&Sfr;":"𝔖","&ShortDownArrow;":"↓","&ShortLeftArrow;":"←","&ShortRightArrow;":"→","&ShortUpArrow;":"↑","&Sigma;":"Σ","&SmallCircle;":"∘","&Sopf;":"𝕊","&Sqrt;":"√","&Square;":"□","&SquareIntersection;":"⊓","&SquareSubset;":"⊏","&SquareSubsetEqual;":"⊑","&SquareSuperset;":"⊐","&SquareSupersetEqual;":"⊒","&SquareUnion;":"⊔","&Sscr;":"𝒮","&Star;":"⋆","&Sub;":"⋐","&Subset;":"⋐","&SubsetEqual;":"⊆","&Succeeds;":"≻","&SucceedsEqual;":"⪰","&SucceedsSlantEqual;":"≽","&SucceedsTilde;":"≿","&SuchThat;":"∋","&Sum;":"∑","&Sup;":"⋑","&Superset;":"⊃","&SupersetEqual;":"⊇","&Supset;":"⋑","&THORN":"Þ","&THORN;":"Þ","&TRADE;":"™","&TSHcy;":"Ћ","&TScy;":"Ц","&Tab;":"	","&Tau;":"Τ","&Tcaron;":"Ť","&Tcedil;":"Ţ","&Tcy;":"Т","&Tfr;":"𝔗","&Therefore;":"∴","&Theta;":"Θ","&ThickSpace;":"  ","&ThinSpace;":" ","&Tilde;":"∼","&TildeEqual;":"≃","&TildeFullEqual;":"≅","&TildeTilde;":"≈","&Topf;":"𝕋","&TripleDot;":"⃛","&Tscr;":"𝒯","&Tstrok;":"Ŧ","&Uacute":"Ú","&Uacute;":"Ú","&Uarr;":"↟","&Uarrocir;":"⥉","&Ubrcy;":"Ў","&Ubreve;":"Ŭ","&Ucirc":"Û","&Ucirc;":"Û","&Ucy;":"У","&Udblac;":"Ű","&Ufr;":"𝔘","&Ugrave":"Ù","&Ugrave;":"Ù","&Umacr;":"Ū","&UnderBar;":"_","&UnderBrace;":"⏟","&UnderBracket;":"⎵","&UnderParenthesis;":"⏝","&Union;":"⋃","&UnionPlus;":"⊎","&Uogon;":"Ų","&Uopf;":"𝕌","&UpArrow;":"↑","&UpArrowBar;":"⤒","&UpArrowDownArrow;":"⇅","&UpDownArrow;":"↕","&UpEquilibrium;":"⥮","&UpTee;":"⊥","&UpTeeArrow;":"↥","&Uparrow;":"⇑","&Updownarrow;":"⇕","&UpperLeftArrow;":"↖","&UpperRightArrow;":"↗","&Upsi;":"ϒ","&Upsilon;":"Υ","&Uring;":"Ů","&Uscr;":"𝒰","&Utilde;":"Ũ","&Uuml":"Ü","&Uuml;":"Ü","&VDash;":"⊫","&Vbar;":"⫫","&Vcy;":"В","&Vdash;":"⊩","&Vdashl;":"⫦","&Vee;":"⋁","&Verbar;":"‖","&Vert;":"‖","&VerticalBar;":"∣","&VerticalLine;":"|","&VerticalSeparator;":"❘","&VerticalTilde;":"≀","&VeryThinSpace;":" ","&Vfr;":"𝔙","&Vopf;":"𝕍","&Vscr;":"𝒱","&Vvdash;":"⊪","&Wcirc;":"Ŵ","&Wedge;":"⋀","&Wfr;":"𝔚","&Wopf;":"𝕎","&Wscr;":"𝒲","&Xfr;":"𝔛","&Xi;":"Ξ","&Xopf;":"𝕏","&Xscr;":"𝒳","&YAcy;":"Я","&YIcy;":"Ї","&YUcy;":"Ю","&Yacute":"Ý","&Yacute;":"Ý","&Ycirc;":"Ŷ","&Ycy;":"Ы","&Yfr;":"𝔜","&Yopf;":"𝕐","&Yscr;":"𝒴","&Yuml;":"Ÿ","&ZHcy;":"Ж","&Zacute;":"Ź","&Zcaron;":"Ž","&Zcy;":"З","&Zdot;":"Ż","&ZeroWidthSpace;":"​","&Zeta;":"Ζ","&Zfr;":"ℨ","&Zopf;":"ℤ","&Zscr;":"𝒵","&aacute":"á","&aacute;":"á","&abreve;":"ă","&ac;":"∾","&acE;":"∾̳","&acd;":"∿","&acirc":"â","&acirc;":"â","&acute":"´","&acute;":"´","&acy;":"а","&aelig":"æ","&aelig;":"æ","&af;":"⁡","&afr;":"𝔞","&agrave":"à","&agrave;":"à","&alefsym;":"ℵ","&aleph;":"ℵ","&alpha;":"α","&amacr;":"ā","&amalg;":"⨿","&amp":"&","&amp;":"&","&and;":"∧","&andand;":"⩕","&andd;":"⩜","&andslope;":"⩘","&andv;":"⩚","&ang;":"∠","&ange;":"⦤","&angle;":"∠","&angmsd;":"∡","&angmsdaa;":"⦨","&angmsdab;":"⦩","&angmsdac;":"⦪","&angmsdad;":"⦫","&angmsdae;":"⦬","&angmsdaf;":"⦭","&angmsdag;":"⦮","&angmsdah;":"⦯","&angrt;":"∟","&angrtvb;":"⊾","&angrtvbd;":"⦝","&angsph;":"∢","&angst;":"Å","&angzarr;":"⍼","&aogon;":"ą","&aopf;":"𝕒","&ap;":"≈","&apE;":"⩰","&apacir;":"⩯","&ape;":"≊","&apid;":"≋","&apos;":"'","&approx;":"≈","&approxeq;":"≊","&aring":"å","&aring;":"å","&ascr;":"𝒶","&ast;":"*","&asymp;":"≈","&asympeq;":"≍","&atilde":"ã","&atilde;":"ã","&auml":"ä","&auml;":"ä","&awconint;":"∳","&awint;":"⨑","&bNot;":"⫭","&backcong;":"≌","&backepsilon;":"϶","&backprime;":"‵","&backsim;":"∽","&backsimeq;":"⋍","&barvee;":"⊽","&barwed;":"⌅","&barwedge;":"⌅","&bbrk;":"⎵","&bbrktbrk;":"⎶","&bcong;":"≌","&bcy;":"б","&bdquo;":"„","&becaus;":"∵","&because;":"∵","&bemptyv;":"⦰","&bepsi;":"϶","&bernou;":"ℬ","&beta;":"β","&beth;":"ℶ","&between;":"≬","&bfr;":"𝔟","&bigcap;":"⋂","&bigcirc;":"◯","&bigcup;":"⋃","&bigodot;":"⨀","&bigoplus;":"⨁","&bigotimes;":"⨂","&bigsqcup;":"⨆","&bigstar;":"★","&bigtriangledown;":"▽","&bigtriangleup;":"△","&biguplus;":"⨄","&bigvee;":"⋁","&bigwedge;":"⋀","&bkarow;":"⤍","&blacklozenge;":"⧫","&blacksquare;":"▪","&blacktriangle;":"▴","&blacktriangledown;":"▾","&blacktriangleleft;":"◂","&blacktriangleright;":"▸","&blank;":"␣","&blk12;":"▒","&blk14;":"░","&blk34;":"▓","&block;":"█","&bne;":"=⃥","&bnequiv;":"≡⃥","&bnot;":"⌐","&bopf;":"𝕓","&bot;":"⊥","&bottom;":"⊥","&bowtie;":"⋈","&boxDL;":"╗","&boxDR;":"╔","&boxDl;":"╖","&boxDr;":"╓","&boxH;":"═","&boxHD;":"╦","&boxHU;":"╩","&boxHd;":"╤","&boxHu;":"╧","&boxUL;":"╝","&boxUR;":"╚","&boxUl;":"╜","&boxUr;":"╙","&boxV;":"║","&boxVH;":"╬","&boxVL;":"╣","&boxVR;":"╠","&boxVh;":"╫","&boxVl;":"╢","&boxVr;":"╟","&boxbox;":"⧉","&boxdL;":"╕","&boxdR;":"╒","&boxdl;":"┐","&boxdr;":"┌","&boxh;":"─","&boxhD;":"╥","&boxhU;":"╨","&boxhd;":"┬","&boxhu;":"┴","&boxminus;":"⊟","&boxplus;":"⊞","&boxtimes;":"⊠","&boxuL;":"╛","&boxuR;":"╘","&boxul;":"┘","&boxur;":"└","&boxv;":"│","&boxvH;":"╪","&boxvL;":"╡","&boxvR;":"╞","&boxvh;":"┼","&boxvl;":"┤","&boxvr;":"├","&bprime;":"‵","&breve;":"˘","&brvbar":"¦","&brvbar;":"¦","&bscr;":"𝒷","&bsemi;":"⁏","&bsim;":"∽","&bsime;":"⋍","&bsol;":"\\","&bsolb;":"⧅","&bsolhsub;":"⟈","&bull;":"•","&bullet;":"•","&bump;":"≎","&bumpE;":"⪮","&bumpe;":"≏","&bumpeq;":"≏","&cacute;":"ć","&cap;":"∩","&capand;":"⩄","&capbrcup;":"⩉","&capcap;":"⩋","&capcup;":"⩇","&capdot;":"⩀","&caps;":"∩︀","&caret;":"⁁","&caron;":"ˇ","&ccaps;":"⩍","&ccaron;":"č","&ccedil":"ç","&ccedil;":"ç","&ccirc;":"ĉ","&ccups;":"⩌","&ccupssm;":"⩐","&cdot;":"ċ","&cedil":"¸","&cedil;":"¸","&cemptyv;":"⦲","&cent":"¢","&cent;":"¢","&centerdot;":"·","&cfr;":"𝔠","&chcy;":"ч","&check;":"✓","&checkmark;":"✓","&chi;":"χ","&cir;":"○","&cirE;":"⧃","&circ;":"ˆ","&circeq;":"≗","&circlearrowleft;":"↺","&circlearrowright;":"↻","&circledR;":"®","&circledS;":"Ⓢ","&circledast;":"⊛","&circledcirc;":"⊚","&circleddash;":"⊝","&cire;":"≗","&cirfnint;":"⨐","&cirmid;":"⫯","&cirscir;":"⧂","&clubs;":"♣","&clubsuit;":"♣","&colon;":":","&colone;":"≔","&coloneq;":"≔","&comma;":",","&commat;":"@","&comp;":"∁","&compfn;":"∘","&complement;":"∁","&complexes;":"ℂ","&cong;":"≅","&congdot;":"⩭","&conint;":"∮","&copf;":"𝕔","&coprod;":"∐","&copy":"©","&copy;":"©","&copysr;":"℗","&crarr;":"↵","&cross;":"✗","&cscr;":"𝒸","&csub;":"⫏","&csube;":"⫑","&csup;":"⫐","&csupe;":"⫒","&ctdot;":"⋯","&cudarrl;":"⤸","&cudarrr;":"⤵","&cuepr;":"⋞","&cuesc;":"⋟","&cularr;":"↶","&cularrp;":"⤽","&cup;":"∪","&cupbrcap;":"⩈","&cupcap;":"⩆","&cupcup;":"⩊","&cupdot;":"⊍","&cupor;":"⩅","&cups;":"∪︀","&curarr;":"↷","&curarrm;":"⤼","&curlyeqprec;":"⋞","&curlyeqsucc;":"⋟","&curlyvee;":"⋎","&curlywedge;":"⋏","&curren":"¤","&curren;":"¤","&curvearrowleft;":"↶","&curvearrowright;":"↷","&cuvee;":"⋎","&cuwed;":"⋏","&cwconint;":"∲","&cwint;":"∱","&cylcty;":"⌭","&dArr;":"⇓","&dHar;":"⥥","&dagger;":"†","&daleth;":"ℸ","&darr;":"↓","&dash;":"‐","&dashv;":"⊣","&dbkarow;":"⤏","&dblac;":"˝","&dcaron;":"ď","&dcy;":"д","&dd;":"ⅆ","&ddagger;":"‡","&ddarr;":"⇊","&ddotseq;":"⩷","&deg":"°","&deg;":"°","&delta;":"δ","&demptyv;":"⦱","&dfisht;":"⥿","&dfr;":"𝔡","&dharl;":"⇃","&dharr;":"⇂","&diam;":"⋄","&diamond;":"⋄","&diamondsuit;":"♦","&diams;":"♦","&die;":"¨","&digamma;":"ϝ","&disin;":"⋲","&div;":"÷","&divide":"÷","&divide;":"÷","&divideontimes;":"⋇","&divonx;":"⋇","&djcy;":"ђ","&dlcorn;":"⌞","&dlcrop;":"⌍","&dollar;":"$","&dopf;":"𝕕","&dot;":"˙","&doteq;":"≐","&doteqdot;":"≑","&dotminus;":"∸","&dotplus;":"∔","&dotsquare;":"⊡","&doublebarwedge;":"⌆","&downarrow;":"↓","&downdownarrows;":"⇊","&downharpoonleft;":"⇃","&downharpoonright;":"⇂","&drbkarow;":"⤐","&drcorn;":"⌟","&drcrop;":"⌌","&dscr;":"𝒹","&dscy;":"ѕ","&dsol;":"⧶","&dstrok;":"đ","&dtdot;":"⋱","&dtri;":"▿","&dtrif;":"▾","&duarr;":"⇵","&duhar;":"⥯","&dwangle;":"⦦","&dzcy;":"џ","&dzigrarr;":"⟿","&eDDot;":"⩷","&eDot;":"≑","&eacute":"é","&eacute;":"é","&easter;":"⩮","&ecaron;":"ě","&ecir;":"≖","&ecirc":"ê","&ecirc;":"ê","&ecolon;":"≕","&ecy;":"э","&edot;":"ė","&ee;":"ⅇ","&efDot;":"≒","&efr;":"𝔢","&eg;":"⪚","&egrave":"è","&egrave;":"è","&egs;":"⪖","&egsdot;":"⪘","&el;":"⪙","&elinters;":"⏧","&ell;":"ℓ","&els;":"⪕","&elsdot;":"⪗","&emacr;":"ē","&empty;":"∅","&emptyset;":"∅","&emptyv;":"∅","&emsp13;":" ","&emsp14;":" ","&emsp;":" ","&eng;":"ŋ","&ensp;":" ","&eogon;":"ę","&eopf;":"𝕖","&epar;":"⋕","&eparsl;":"⧣","&eplus;":"⩱","&epsi;":"ε","&epsilon;":"ε","&epsiv;":"ϵ","&eqcirc;":"≖","&eqcolon;":"≕","&eqsim;":"≂","&eqslantgtr;":"⪖","&eqslantless;":"⪕","&equals;":"=","&equest;":"≟","&equiv;":"≡","&equivDD;":"⩸","&eqvparsl;":"⧥","&erDot;":"≓","&erarr;":"⥱","&escr;":"ℯ","&esdot;":"≐","&esim;":"≂","&eta;":"η","&eth":"ð","&eth;":"ð","&euml":"ë","&euml;":"ë","&euro;":"€","&excl;":"!","&exist;":"∃","&expectation;":"ℰ","&exponentiale;":"ⅇ","&fallingdotseq;":"≒","&fcy;":"ф","&female;":"♀","&ffilig;":"ﬃ","&fflig;":"ﬀ","&ffllig;":"ﬄ","&ffr;":"𝔣","&filig;":"ﬁ","&fjlig;":"fj","&flat;":"♭","&fllig;":"ﬂ","&fltns;":"▱","&fnof;":"ƒ","&fopf;":"𝕗","&forall;":"∀","&fork;":"⋔","&forkv;":"⫙","&fpartint;":"⨍","&frac12":"½","&frac12;":"½","&frac13;":"⅓","&frac14":"¼","&frac14;":"¼","&frac15;":"⅕","&frac16;":"⅙","&frac18;":"⅛","&frac23;":"⅔","&frac25;":"⅖","&frac34":"¾","&frac34;":"¾","&frac35;":"⅗","&frac38;":"⅜","&frac45;":"⅘","&frac56;":"⅚","&frac58;":"⅝","&frac78;":"⅞","&frasl;":"⁄","&frown;":"⌢","&fscr;":"𝒻","&gE;":"≧","&gEl;":"⪌","&gacute;":"ǵ","&gamma;":"γ","&gammad;":"ϝ","&gap;":"⪆","&gbreve;":"ğ","&gcirc;":"ĝ","&gcy;":"г","&gdot;":"ġ","&ge;":"≥","&gel;":"⋛","&geq;":"≥","&geqq;":"≧","&geqslant;":"⩾","&ges;":"⩾","&gescc;":"⪩","&gesdot;":"⪀","&gesdoto;":"⪂","&gesdotol;":"⪄","&gesl;":"⋛︀","&gesles;":"⪔","&gfr;":"𝔤","&gg;":"≫","&ggg;":"⋙","&gimel;":"ℷ","&gjcy;":"ѓ","&gl;":"≷","&glE;":"⪒","&gla;":"⪥","&glj;":"⪤","&gnE;":"≩","&gnap;":"⪊","&gnapprox;":"⪊","&gne;":"⪈","&gneq;":"⪈","&gneqq;":"≩","&gnsim;":"⋧","&gopf;":"𝕘","&grave;":"`","&gscr;":"ℊ","&gsim;":"≳","&gsime;":"⪎","&gsiml;":"⪐","&gt":">","&gt;":">","&gtcc;":"⪧","&gtcir;":"⩺","&gtdot;":"⋗","&gtlPar;":"⦕","&gtquest;":"⩼","&gtrapprox;":"⪆","&gtrarr;":"⥸","&gtrdot;":"⋗","&gtreqless;":"⋛","&gtreqqless;":"⪌","&gtrless;":"≷","&gtrsim;":"≳","&gvertneqq;":"≩︀","&gvnE;":"≩︀","&hArr;":"⇔","&hairsp;":" ","&half;":"½","&hamilt;":"ℋ","&hardcy;":"ъ","&harr;":"↔","&harrcir;":"⥈","&harrw;":"↭","&hbar;":"ℏ","&hcirc;":"ĥ","&hearts;":"♥","&heartsuit;":"♥","&hellip;":"…","&hercon;":"⊹","&hfr;":"𝔥","&hksearow;":"⤥","&hkswarow;":"⤦","&hoarr;":"⇿","&homtht;":"∻","&hookleftarrow;":"↩","&hookrightarrow;":"↪","&hopf;":"𝕙","&horbar;":"―","&hscr;":"𝒽","&hslash;":"ℏ","&hstrok;":"ħ","&hybull;":"⁃","&hyphen;":"‐","&iacute":"í","&iacute;":"í","&ic;":"⁣","&icirc":"î","&icirc;":"î","&icy;":"и","&iecy;":"е","&iexcl":"¡","&iexcl;":"¡","&iff;":"⇔","&ifr;":"𝔦","&igrave":"ì","&igrave;":"ì","&ii;":"ⅈ","&iiiint;":"⨌","&iiint;":"∭","&iinfin;":"⧜","&iiota;":"℩","&ijlig;":"ĳ","&imacr;":"ī","&image;":"ℑ","&imagline;":"ℐ","&imagpart;":"ℑ","&imath;":"ı","&imof;":"⊷","&imped;":"Ƶ","&in;":"∈","&incare;":"℅","&infin;":"∞","&infintie;":"⧝","&inodot;":"ı","&int;":"∫","&intcal;":"⊺","&integers;":"ℤ","&intercal;":"⊺","&intlarhk;":"⨗","&intprod;":"⨼","&iocy;":"ё","&iogon;":"į","&iopf;":"𝕚","&iota;":"ι","&iprod;":"⨼","&iquest":"¿","&iquest;":"¿","&iscr;":"𝒾","&isin;":"∈","&isinE;":"⋹","&isindot;":"⋵","&isins;":"⋴","&isinsv;":"⋳","&isinv;":"∈","&it;":"⁢","&itilde;":"ĩ","&iukcy;":"і","&iuml":"ï","&iuml;":"ï","&jcirc;":"ĵ","&jcy;":"й","&jfr;":"𝔧","&jmath;":"ȷ","&jopf;":"𝕛","&jscr;":"𝒿","&jsercy;":"ј","&jukcy;":"є","&kappa;":"κ","&kappav;":"ϰ","&kcedil;":"ķ","&kcy;":"к","&kfr;":"𝔨","&kgreen;":"ĸ","&khcy;":"х","&kjcy;":"ќ","&kopf;":"𝕜","&kscr;":"𝓀","&lAarr;":"⇚","&lArr;":"⇐","&lAtail;":"⤛","&lBarr;":"⤎","&lE;":"≦","&lEg;":"⪋","&lHar;":"⥢","&lacute;":"ĺ","&laemptyv;":"⦴","&lagran;":"ℒ","&lambda;":"λ","&lang;":"⟨","&langd;":"⦑","&langle;":"⟨","&lap;":"⪅","&laquo":"«","&laquo;":"«","&larr;":"←","&larrb;":"⇤","&larrbfs;":"⤟","&larrfs;":"⤝","&larrhk;":"↩","&larrlp;":"↫","&larrpl;":"⤹","&larrsim;":"⥳","&larrtl;":"↢","&lat;":"⪫","&latail;":"⤙","&late;":"⪭","&lates;":"⪭︀","&lbarr;":"⤌","&lbbrk;":"❲","&lbrace;":"{","&lbrack;":"[","&lbrke;":"⦋","&lbrksld;":"⦏","&lbrkslu;":"⦍","&lcaron;":"ľ","&lcedil;":"ļ","&lceil;":"⌈","&lcub;":"{","&lcy;":"л","&ldca;":"⤶","&ldquo;":"“","&ldquor;":"„","&ldrdhar;":"⥧","&ldrushar;":"⥋","&ldsh;":"↲","&le;":"≤","&leftarrow;":"←","&leftarrowtail;":"↢","&leftharpoondown;":"↽","&leftharpoonup;":"↼","&leftleftarrows;":"⇇","&leftrightarrow;":"↔","&leftrightarrows;":"⇆","&leftrightharpoons;":"⇋","&leftrightsquigarrow;":"↭","&leftthreetimes;":"⋋","&leg;":"⋚","&leq;":"≤","&leqq;":"≦","&leqslant;":"⩽","&les;":"⩽","&lescc;":"⪨","&lesdot;":"⩿","&lesdoto;":"⪁","&lesdotor;":"⪃","&lesg;":"⋚︀","&lesges;":"⪓","&lessapprox;":"⪅","&lessdot;":"⋖","&lesseqgtr;":"⋚","&lesseqqgtr;":"⪋","&lessgtr;":"≶","&lesssim;":"≲","&lfisht;":"⥼","&lfloor;":"⌊","&lfr;":"𝔩","&lg;":"≶","&lgE;":"⪑","&lhard;":"↽","&lharu;":"↼","&lharul;":"⥪","&lhblk;":"▄","&ljcy;":"љ","&ll;":"≪","&llarr;":"⇇","&llcorner;":"⌞","&llhard;":"⥫","&lltri;":"◺","&lmidot;":"ŀ","&lmoust;":"⎰","&lmoustache;":"⎰","&lnE;":"≨","&lnap;":"⪉","&lnapprox;":"⪉","&lne;":"⪇","&lneq;":"⪇","&lneqq;":"≨","&lnsim;":"⋦","&loang;":"⟬","&loarr;":"⇽","&lobrk;":"⟦","&longleftarrow;":"⟵","&longleftrightarrow;":"⟷","&longmapsto;":"⟼","&longrightarrow;":"⟶","&looparrowleft;":"↫","&looparrowright;":"↬","&lopar;":"⦅","&lopf;":"𝕝","&loplus;":"⨭","&lotimes;":"⨴","&lowast;":"∗","&lowbar;":"_","&loz;":"◊","&lozenge;":"◊","&lozf;":"⧫","&lpar;":"(","&lparlt;":"⦓","&lrarr;":"⇆","&lrcorner;":"⌟","&lrhar;":"⇋","&lrhard;":"⥭","&lrm;":"‎","&lrtri;":"⊿","&lsaquo;":"‹","&lscr;":"𝓁","&lsh;":"↰","&lsim;":"≲","&lsime;":"⪍","&lsimg;":"⪏","&lsqb;":"[","&lsquo;":"‘","&lsquor;":"‚","&lstrok;":"ł","&lt":"<","&lt;":"<","&ltcc;":"⪦","&ltcir;":"⩹","&ltdot;":"⋖","&lthree;":"⋋","&ltimes;":"⋉","&ltlarr;":"⥶","&ltquest;":"⩻","&ltrPar;":"⦖","&ltri;":"◃","&ltrie;":"⊴","&ltrif;":"◂","&lurdshar;":"⥊","&luruhar;":"⥦","&lvertneqq;":"≨︀","&lvnE;":"≨︀","&mDDot;":"∺","&macr":"¯","&macr;":"¯","&male;":"♂","&malt;":"✠","&maltese;":"✠","&map;":"↦","&mapsto;":"↦","&mapstodown;":"↧","&mapstoleft;":"↤","&mapstoup;":"↥","&marker;":"▮","&mcomma;":"⨩","&mcy;":"м","&mdash;":"—","&measuredangle;":"∡","&mfr;":"𝔪","&mho;":"℧","&micro":"µ","&micro;":"µ","&mid;":"∣","&midast;":"*","&midcir;":"⫰","&middot":"·","&middot;":"·","&minus;":"−","&minusb;":"⊟","&minusd;":"∸","&minusdu;":"⨪","&mlcp;":"⫛","&mldr;":"…","&mnplus;":"∓","&models;":"⊧","&mopf;":"𝕞","&mp;":"∓","&mscr;":"𝓂","&mstpos;":"∾","&mu;":"μ","&multimap;":"⊸","&mumap;":"⊸","&nGg;":"⋙̸","&nGt;":"≫⃒","&nGtv;":"≫̸","&nLeftarrow;":"⇍","&nLeftrightarrow;":"⇎","&nLl;":"⋘̸","&nLt;":"≪⃒","&nLtv;":"≪̸","&nRightarrow;":"⇏","&nVDash;":"⊯","&nVdash;":"⊮","&nabla;":"∇","&nacute;":"ń","&nang;":"∠⃒","&nap;":"≉","&napE;":"⩰̸","&napid;":"≋̸","&napos;":"ŉ","&napprox;":"≉","&natur;":"♮","&natural;":"♮","&naturals;":"ℕ","&nbsp":" ","&nbsp;":" ","&nbump;":"≎̸","&nbumpe;":"≏̸","&ncap;":"⩃","&ncaron;":"ň","&ncedil;":"ņ","&ncong;":"≇","&ncongdot;":"⩭̸","&ncup;":"⩂","&ncy;":"н","&ndash;":"–","&ne;":"≠","&neArr;":"⇗","&nearhk;":"⤤","&nearr;":"↗","&nearrow;":"↗","&nedot;":"≐̸","&nequiv;":"≢","&nesear;":"⤨","&nesim;":"≂̸","&nexist;":"∄","&nexists;":"∄","&nfr;":"𝔫","&ngE;":"≧̸","&nge;":"≱","&ngeq;":"≱","&ngeqq;":"≧̸","&ngeqslant;":"⩾̸","&nges;":"⩾̸","&ngsim;":"≵","&ngt;":"≯","&ngtr;":"≯","&nhArr;":"⇎","&nharr;":"↮","&nhpar;":"⫲","&ni;":"∋","&nis;":"⋼","&nisd;":"⋺","&niv;":"∋","&njcy;":"њ","&nlArr;":"⇍","&nlE;":"≦̸","&nlarr;":"↚","&nldr;":"‥","&nle;":"≰","&nleftarrow;":"↚","&nleftrightarrow;":"↮","&nleq;":"≰","&nleqq;":"≦̸","&nleqslant;":"⩽̸","&nles;":"⩽̸","&nless;":"≮","&nlsim;":"≴","&nlt;":"≮","&nltri;":"⋪","&nltrie;":"⋬","&nmid;":"∤","&nopf;":"𝕟","&not":"¬","&not;":"¬","&notin;":"∉","&notinE;":"⋹̸","&notindot;":"⋵̸","&notinva;":"∉","&notinvb;":"⋷","&notinvc;":"⋶","&notni;":"∌","&notniva;":"∌","&notnivb;":"⋾","&notnivc;":"⋽","&npar;":"∦","&nparallel;":"∦","&nparsl;":"⫽⃥","&npart;":"∂̸","&npolint;":"⨔","&npr;":"⊀","&nprcue;":"⋠","&npre;":"⪯̸","&nprec;":"⊀","&npreceq;":"⪯̸","&nrArr;":"⇏","&nrarr;":"↛","&nrarrc;":"⤳̸","&nrarrw;":"↝̸","&nrightarrow;":"↛","&nrtri;":"⋫","&nrtrie;":"⋭","&nsc;":"⊁","&nsccue;":"⋡","&nsce;":"⪰̸","&nscr;":"𝓃","&nshortmid;":"∤","&nshortparallel;":"∦","&nsim;":"≁","&nsime;":"≄","&nsimeq;":"≄","&nsmid;":"∤","&nspar;":"∦","&nsqsube;":"⋢","&nsqsupe;":"⋣","&nsub;":"⊄","&nsubE;":"⫅̸","&nsube;":"⊈","&nsubset;":"⊂⃒","&nsubseteq;":"⊈","&nsubseteqq;":"⫅̸","&nsucc;":"⊁","&nsucceq;":"⪰̸","&nsup;":"⊅","&nsupE;":"⫆̸","&nsupe;":"⊉","&nsupset;":"⊃⃒","&nsupseteq;":"⊉","&nsupseteqq;":"⫆̸","&ntgl;":"≹","&ntilde":"ñ","&ntilde;":"ñ","&ntlg;":"≸","&ntriangleleft;":"⋪","&ntrianglelefteq;":"⋬","&ntriangleright;":"⋫","&ntrianglerighteq;":"⋭","&nu;":"ν","&num;":"#","&numero;":"№","&numsp;":" ","&nvDash;":"⊭","&nvHarr;":"⤄","&nvap;":"≍⃒","&nvdash;":"⊬","&nvge;":"≥⃒","&nvgt;":">⃒","&nvinfin;":"⧞","&nvlArr;":"⤂","&nvle;":"≤⃒","&nvlt;":"<⃒","&nvltrie;":"⊴⃒","&nvrArr;":"⤃","&nvrtrie;":"⊵⃒","&nvsim;":"∼⃒","&nwArr;":"⇖","&nwarhk;":"⤣","&nwarr;":"↖","&nwarrow;":"↖","&nwnear;":"⤧","&oS;":"Ⓢ","&oacute":"ó","&oacute;":"ó","&oast;":"⊛","&ocir;":"⊚","&ocirc":"ô","&ocirc;":"ô","&ocy;":"о","&odash;":"⊝","&odblac;":"ő","&odiv;":"⨸","&odot;":"⊙","&odsold;":"⦼","&oelig;":"œ","&ofcir;":"⦿","&ofr;":"𝔬","&ogon;":"˛","&ograve":"ò","&ograve;":"ò","&ogt;":"⧁","&ohbar;":"⦵","&ohm;":"Ω","&oint;":"∮","&olarr;":"↺","&olcir;":"⦾","&olcross;":"⦻","&oline;":"‾","&olt;":"⧀","&omacr;":"ō","&omega;":"ω","&omicron;":"ο","&omid;":"⦶","&ominus;":"⊖","&oopf;":"𝕠","&opar;":"⦷","&operp;":"⦹","&oplus;":"⊕","&or;":"∨","&orarr;":"↻","&ord;":"⩝","&order;":"ℴ","&orderof;":"ℴ","&ordf":"ª","&ordf;":"ª","&ordm":"º","&ordm;":"º","&origof;":"⊶","&oror;":"⩖","&orslope;":"⩗","&orv;":"⩛","&oscr;":"ℴ","&oslash":"ø","&oslash;":"ø","&osol;":"⊘","&otilde":"õ","&otilde;":"õ","&otimes;":"⊗","&otimesas;":"⨶","&ouml":"ö","&ouml;":"ö","&ovbar;":"⌽","&par;":"∥","&para":"¶","&para;":"¶","&parallel;":"∥","&parsim;":"⫳","&parsl;":"⫽","&part;":"∂","&pcy;":"п","&percnt;":"%","&period;":".","&permil;":"‰","&perp;":"⊥","&pertenk;":"‱","&pfr;":"𝔭","&phi;":"φ","&phiv;":"ϕ","&phmmat;":"ℳ","&phone;":"☎","&pi;":"π","&pitchfork;":"⋔","&piv;":"ϖ","&planck;":"ℏ","&planckh;":"ℎ","&plankv;":"ℏ","&plus;":"+","&plusacir;":"⨣","&plusb;":"⊞","&pluscir;":"⨢","&plusdo;":"∔","&plusdu;":"⨥","&pluse;":"⩲","&plusmn":"±","&plusmn;":"±","&plussim;":"⨦","&plustwo;":"⨧","&pm;":"±","&pointint;":"⨕","&popf;":"𝕡","&pound":"£","&pound;":"£","&pr;":"≺","&prE;":"⪳","&prap;":"⪷","&prcue;":"≼","&pre;":"⪯","&prec;":"≺","&precapprox;":"⪷","&preccurlyeq;":"≼","&preceq;":"⪯","&precnapprox;":"⪹","&precneqq;":"⪵","&precnsim;":"⋨","&precsim;":"≾","&prime;":"′","&primes;":"ℙ","&prnE;":"⪵","&prnap;":"⪹","&prnsim;":"⋨","&prod;":"∏","&profalar;":"⌮","&profline;":"⌒","&profsurf;":"⌓","&prop;":"∝","&propto;":"∝","&prsim;":"≾","&prurel;":"⊰","&pscr;":"𝓅","&psi;":"ψ","&puncsp;":" ","&qfr;":"𝔮","&qint;":"⨌","&qopf;":"𝕢","&qprime;":"⁗","&qscr;":"𝓆","&quaternions;":"ℍ","&quatint;":"⨖","&quest;":"?","&questeq;":"≟","&quot":'"',"&quot;":'"',"&rAarr;":"⇛","&rArr;":"⇒","&rAtail;":"⤜","&rBarr;":"⤏","&rHar;":"⥤","&race;":"∽̱","&racute;":"ŕ","&radic;":"√","&raemptyv;":"⦳","&rang;":"⟩","&rangd;":"⦒","&range;":"⦥","&rangle;":"⟩","&raquo":"»","&raquo;":"»","&rarr;":"→","&rarrap;":"⥵","&rarrb;":"⇥","&rarrbfs;":"⤠","&rarrc;":"⤳","&rarrfs;":"⤞","&rarrhk;":"↪","&rarrlp;":"↬","&rarrpl;":"⥅","&rarrsim;":"⥴","&rarrtl;":"↣","&rarrw;":"↝","&ratail;":"⤚","&ratio;":"∶","&rationals;":"ℚ","&rbarr;":"⤍","&rbbrk;":"❳","&rbrace;":"}","&rbrack;":"]","&rbrke;":"⦌","&rbrksld;":"⦎","&rbrkslu;":"⦐","&rcaron;":"ř","&rcedil;":"ŗ","&rceil;":"⌉","&rcub;":"}","&rcy;":"р","&rdca;":"⤷","&rdldhar;":"⥩","&rdquo;":"”","&rdquor;":"”","&rdsh;":"↳","&real;":"ℜ","&realine;":"ℛ","&realpart;":"ℜ","&reals;":"ℝ","&rect;":"▭","&reg":"®","&reg;":"®","&rfisht;":"⥽","&rfloor;":"⌋","&rfr;":"𝔯","&rhard;":"⇁","&rharu;":"⇀","&rharul;":"⥬","&rho;":"ρ","&rhov;":"ϱ","&rightarrow;":"→","&rightarrowtail;":"↣","&rightharpoondown;":"⇁","&rightharpoonup;":"⇀","&rightleftarrows;":"⇄","&rightleftharpoons;":"⇌","&rightrightarrows;":"⇉","&rightsquigarrow;":"↝","&rightthreetimes;":"⋌","&ring;":"˚","&risingdotseq;":"≓","&rlarr;":"⇄","&rlhar;":"⇌","&rlm;":"‏","&rmoust;":"⎱","&rmoustache;":"⎱","&rnmid;":"⫮","&roang;":"⟭","&roarr;":"⇾","&robrk;":"⟧","&ropar;":"⦆","&ropf;":"𝕣","&roplus;":"⨮","&rotimes;":"⨵","&rpar;":")","&rpargt;":"⦔","&rppolint;":"⨒","&rrarr;":"⇉","&rsaquo;":"›","&rscr;":"𝓇","&rsh;":"↱","&rsqb;":"]","&rsquo;":"’","&rsquor;":"’","&rthree;":"⋌","&rtimes;":"⋊","&rtri;":"▹","&rtrie;":"⊵","&rtrif;":"▸","&rtriltri;":"⧎","&ruluhar;":"⥨","&rx;":"℞","&sacute;":"ś","&sbquo;":"‚","&sc;":"≻","&scE;":"⪴","&scap;":"⪸","&scaron;":"š","&sccue;":"≽","&sce;":"⪰","&scedil;":"ş","&scirc;":"ŝ","&scnE;":"⪶","&scnap;":"⪺","&scnsim;":"⋩","&scpolint;":"⨓","&scsim;":"≿","&scy;":"с","&sdot;":"⋅","&sdotb;":"⊡","&sdote;":"⩦","&seArr;":"⇘","&searhk;":"⤥","&searr;":"↘","&searrow;":"↘","&sect":"§","&sect;":"§","&semi;":";","&seswar;":"⤩","&setminus;":"∖","&setmn;":"∖","&sext;":"✶","&sfr;":"𝔰","&sfrown;":"⌢","&sharp;":"♯","&shchcy;":"щ","&shcy;":"ш","&shortmid;":"∣","&shortparallel;":"∥","&shy":"­","&shy;":"­","&sigma;":"σ","&sigmaf;":"ς","&sigmav;":"ς","&sim;":"∼","&simdot;":"⩪","&sime;":"≃","&simeq;":"≃","&simg;":"⪞","&simgE;":"⪠","&siml;":"⪝","&simlE;":"⪟","&simne;":"≆","&simplus;":"⨤","&simrarr;":"⥲","&slarr;":"←","&smallsetminus;":"∖","&smashp;":"⨳","&smeparsl;":"⧤","&smid;":"∣","&smile;":"⌣","&smt;":"⪪","&smte;":"⪬","&smtes;":"⪬︀","&softcy;":"ь","&sol;":"/","&solb;":"⧄","&solbar;":"⌿","&sopf;":"𝕤","&spades;":"♠","&spadesuit;":"♠","&spar;":"∥","&sqcap;":"⊓","&sqcaps;":"⊓︀","&sqcup;":"⊔","&sqcups;":"⊔︀","&sqsub;":"⊏","&sqsube;":"⊑","&sqsubset;":"⊏","&sqsubseteq;":"⊑","&sqsup;":"⊐","&sqsupe;":"⊒","&sqsupset;":"⊐","&sqsupseteq;":"⊒","&squ;":"□","&square;":"□","&squarf;":"▪","&squf;":"▪","&srarr;":"→","&sscr;":"𝓈","&ssetmn;":"∖","&ssmile;":"⌣","&sstarf;":"⋆","&star;":"☆","&starf;":"★","&straightepsilon;":"ϵ","&straightphi;":"ϕ","&strns;":"¯","&sub;":"⊂","&subE;":"⫅","&subdot;":"⪽","&sube;":"⊆","&subedot;":"⫃","&submult;":"⫁","&subnE;":"⫋","&subne;":"⊊","&subplus;":"⪿","&subrarr;":"⥹","&subset;":"⊂","&subseteq;":"⊆","&subseteqq;":"⫅","&subsetneq;":"⊊","&subsetneqq;":"⫋","&subsim;":"⫇","&subsub;":"⫕","&subsup;":"⫓","&succ;":"≻","&succapprox;":"⪸","&succcurlyeq;":"≽","&succeq;":"⪰","&succnapprox;":"⪺","&succneqq;":"⪶","&succnsim;":"⋩","&succsim;":"≿","&sum;":"∑","&sung;":"♪","&sup1":"¹","&sup1;":"¹","&sup2":"²","&sup2;":"²","&sup3":"³","&sup3;":"³","&sup;":"⊃","&supE;":"⫆","&supdot;":"⪾","&supdsub;":"⫘","&supe;":"⊇","&supedot;":"⫄","&suphsol;":"⟉","&suphsub;":"⫗","&suplarr;":"⥻","&supmult;":"⫂","&supnE;":"⫌","&supne;":"⊋","&supplus;":"⫀","&supset;":"⊃","&supseteq;":"⊇","&supseteqq;":"⫆","&supsetneq;":"⊋","&supsetneqq;":"⫌","&supsim;":"⫈","&supsub;":"⫔","&supsup;":"⫖","&swArr;":"⇙","&swarhk;":"⤦","&swarr;":"↙","&swarrow;":"↙","&swnwar;":"⤪","&szlig":"ß","&szlig;":"ß","&target;":"⌖","&tau;":"τ","&tbrk;":"⎴","&tcaron;":"ť","&tcedil;":"ţ","&tcy;":"т","&tdot;":"⃛","&telrec;":"⌕","&tfr;":"𝔱","&there4;":"∴","&therefore;":"∴","&theta;":"θ","&thetasym;":"ϑ","&thetav;":"ϑ","&thickapprox;":"≈","&thicksim;":"∼","&thinsp;":" ","&thkap;":"≈","&thksim;":"∼","&thorn":"þ","&thorn;":"þ","&tilde;":"˜","&times":"×","&times;":"×","&timesb;":"⊠","&timesbar;":"⨱","&timesd;":"⨰","&tint;":"∭","&toea;":"⤨","&top;":"⊤","&topbot;":"⌶","&topcir;":"⫱","&topf;":"𝕥","&topfork;":"⫚","&tosa;":"⤩","&tprime;":"‴","&trade;":"™","&triangle;":"▵","&triangledown;":"▿","&triangleleft;":"◃","&trianglelefteq;":"⊴","&triangleq;":"≜","&triangleright;":"▹","&trianglerighteq;":"⊵","&tridot;":"◬","&trie;":"≜","&triminus;":"⨺","&triplus;":"⨹","&trisb;":"⧍","&tritime;":"⨻","&trpezium;":"⏢","&tscr;":"𝓉","&tscy;":"ц","&tshcy;":"ћ","&tstrok;":"ŧ","&twixt;":"≬","&twoheadleftarrow;":"↞","&twoheadrightarrow;":"↠","&uArr;":"⇑","&uHar;":"⥣","&uacute":"ú","&uacute;":"ú","&uarr;":"↑","&ubrcy;":"ў","&ubreve;":"ŭ","&ucirc":"û","&ucirc;":"û","&ucy;":"у","&udarr;":"⇅","&udblac;":"ű","&udhar;":"⥮","&ufisht;":"⥾","&ufr;":"𝔲","&ugrave":"ù","&ugrave;":"ù","&uharl;":"↿","&uharr;":"↾","&uhblk;":"▀","&ulcorn;":"⌜","&ulcorner;":"⌜","&ulcrop;":"⌏","&ultri;":"◸","&umacr;":"ū","&uml":"¨","&uml;":"¨","&uogon;":"ų","&uopf;":"𝕦","&uparrow;":"↑","&updownarrow;":"↕","&upharpoonleft;":"↿","&upharpoonright;":"↾","&uplus;":"⊎","&upsi;":"υ","&upsih;":"ϒ","&upsilon;":"υ","&upuparrows;":"⇈","&urcorn;":"⌝","&urcorner;":"⌝","&urcrop;":"⌎","&uring;":"ů","&urtri;":"◹","&uscr;":"𝓊","&utdot;":"⋰","&utilde;":"ũ","&utri;":"▵","&utrif;":"▴","&uuarr;":"⇈","&uuml":"ü","&uuml;":"ü","&uwangle;":"⦧","&vArr;":"⇕","&vBar;":"⫨","&vBarv;":"⫩","&vDash;":"⊨","&vangrt;":"⦜","&varepsilon;":"ϵ","&varkappa;":"ϰ","&varnothing;":"∅","&varphi;":"ϕ","&varpi;":"ϖ","&varpropto;":"∝","&varr;":"↕","&varrho;":"ϱ","&varsigma;":"ς","&varsubsetneq;":"⊊︀","&varsubsetneqq;":"⫋︀","&varsupsetneq;":"⊋︀","&varsupsetneqq;":"⫌︀","&vartheta;":"ϑ","&vartriangleleft;":"⊲","&vartriangleright;":"⊳","&vcy;":"в","&vdash;":"⊢","&vee;":"∨","&veebar;":"⊻","&veeeq;":"≚","&vellip;":"⋮","&verbar;":"|","&vert;":"|","&vfr;":"𝔳","&vltri;":"⊲","&vnsub;":"⊂⃒","&vnsup;":"⊃⃒","&vopf;":"𝕧","&vprop;":"∝","&vrtri;":"⊳","&vscr;":"𝓋","&vsubnE;":"⫋︀","&vsubne;":"⊊︀","&vsupnE;":"⫌︀","&vsupne;":"⊋︀","&vzigzag;":"⦚","&wcirc;":"ŵ","&wedbar;":"⩟","&wedge;":"∧","&wedgeq;":"≙","&weierp;":"℘","&wfr;":"𝔴","&wopf;":"𝕨","&wp;":"℘","&wr;":"≀","&wreath;":"≀","&wscr;":"𝓌","&xcap;":"⋂","&xcirc;":"◯","&xcup;":"⋃","&xdtri;":"▽","&xfr;":"𝔵","&xhArr;":"⟺","&xharr;":"⟷","&xi;":"ξ","&xlArr;":"⟸","&xlarr;":"⟵","&xmap;":"⟼","&xnis;":"⋻","&xodot;":"⨀","&xopf;":"𝕩","&xoplus;":"⨁","&xotime;":"⨂","&xrArr;":"⟹","&xrarr;":"⟶","&xscr;":"𝓍","&xsqcup;":"⨆","&xuplus;":"⨄","&xutri;":"△","&xvee;":"⋁","&xwedge;":"⋀","&yacute":"ý","&yacute;":"ý","&yacy;":"я","&ycirc;":"ŷ","&ycy;":"ы","&yen":"¥","&yen;":"¥","&yfr;":"𝔶","&yicy;":"ї","&yopf;":"𝕪","&yscr;":"𝓎","&yucy;":"ю","&yuml":"ÿ","&yuml;":"ÿ","&zacute;":"ź","&zcaron;":"ž","&zcy;":"з","&zdot;":"ż","&zeetrf;":"ℨ","&zeta;":"ζ","&zfr;":"𝔷","&zhcy;":"ж","&zigrarr;":"⇝","&zopf;":"𝕫","&zscr;":"𝓏","&zwj;":"‍","&zwnj;":"‌"};function decodeHTMLEntities(n){return n.replace(/&(#\d+|#x[a-f0-9]+|[a-z]+\d*);?/gi,(t,r)=>{if(typeof htmlEntities[t]=="string")return htmlEntities[t];if(r.charAt(0)!=="#"||t.charAt(t.length-1)!==";")return t;let s;r.charAt(1)==="x"?s=parseInt(r.substr(2),16):s=parseInt(r.substr(1),10);let i="";return s>=55296&&s<=57343||s>1114111?"�":(s>65535&&(s-=65536,i+=String.fromCharCode(s>>>10&1023|55296),s=56320|s&1023),i+=String.fromCharCode(s),i)})}function escapeHtml(n){return n.trim().replace(/[<>"'?&]/g,t=>{let r=t.charCodeAt(0).toString(16);return r.length<2&&(r="0"+r),"&#x"+r.toUpperCase()+";"})}function textToHtml(n){return"<div>"+escapeHtml(n).replace(/\n/g,"<br />")+"</div>"}function htmlToText(n){return n=n.replace(/\r?\n/g,"").replace(/<\!\-\-.*?\-\->/gi," ").replace(/<br\b[^>]*>/gi,`
`).replace(/<\/?(p|div|table|tr|td|th)\b[^>]*>/gi,`

`).replace(/<script\b[^>]*>.*?<\/script\b[^>]*>/gi," ").replace(/^.*<body\b[^>]*>/i,"").replace(/^.*<\/head\b[^>]*>/i,"").replace(/^.*<\!doctype\b[^>]*>/i,"").replace(/<\/body\b[^>]*>.*$/i,"").replace(/<\/html\b[^>]*>.*$/i,"").replace(/<a\b[^>]*href\s*=\s*["']?([^\s"']+)[^>]*>/gi," ($1) ").replace(/<\/?(span|em|i|strong|b|u|a)\b[^>]*>/gi,"").replace(/<li\b[^>]*>[\n\u0001\s]*/gi,"* ").replace(/<hr\b[^>]*>/g,`
-------------
`).replace(/<[^>]*>/g," ").replace(/\u0001/g,`
`).replace(/[ \t]+/g," ").replace(/^\s+$/gm,"").replace(/\n\n+/g,`

`).replace(/^\n+/,`
`).replace(/\n+$/,`
`),n=decodeHTMLEntities(n),n}function formatTextAddress(n){return[].concat(n.name||[]).concat(n.name?`<${n.address}>`:n.address).join(" ")}function formatTextAddresses(n){let t=[],r=(s,i)=>{if(i&&t.push(", "),s.group){let a=`${s.name}:`,o=";";t.push(a),s.group.forEach(r),t.push(o)}else t.push(formatTextAddress(s))};return n.forEach(r),t.join("")}function formatHtmlAddress(n){return`<a href="mailto:${escapeHtml(n.address)}" class="postal-email-address">${escapeHtml(n.name||`<${n.address}>`)}</a>`}function formatHtmlAddresses(n){let t=[],r=(s,i)=>{if(i&&t.push('<span class="postal-email-address-separator">, </span>'),s.group){let a=`<span class="postal-email-address-group">${escapeHtml(s.name)}:</span>`,o='<span class="postal-email-address-group">;</span>';t.push(a),s.group.forEach(r),t.push(o)}else t.push(formatHtmlAddress(s))};return n.forEach(r),t.join(" ")}function foldLines(n,t,r){n=(n||"").toString(),t=t||76;let s=0,i=n.length,a="",o,l;for(;s<i;){if(o=n.substr(s,t),o.length<t){a+=o;break}if(l=o.match(/^[^\n\r]*(\r?\n|\r)/)){o=l[0],a+=o,s+=o.length;continue}else(l=o.match(/(\s+)[^\s]*$/))&&l[0].length-(l[1]||"").length<o.length?o=o.substr(0,o.length-(l[0].length-(l[1]||"").length)):(l=n.substr(s+o.length).match(/^[^\s]+(\s*)/))&&(o=o+l[0].substr(0,l[0].length-0));a+=o,s+=o.length,s<i&&(a+=`\r
`)}return a}function formatTextHeader(n){let t=[];if(n.from&&t.push({key:"From",val:formatTextAddress(n.from)}),n.subject&&t.push({key:"Subject",val:n.subject}),n.date){let o={year:"numeric",month:"numeric",day:"numeric",hour:"numeric",minute:"numeric",second:"numeric",hour12:!1},l=typeof Intl>"u"?n.date:new Intl.DateTimeFormat("default",o).format(new Date(n.date));t.push({key:"Date",val:l})}n.to&&n.to.length&&t.push({key:"To",val:formatTextAddresses(n.to)}),n.cc&&n.cc.length&&t.push({key:"Cc",val:formatTextAddresses(n.cc)}),n.bcc&&n.bcc.length&&t.push({key:"Bcc",val:formatTextAddresses(n.bcc)});let r=t.map(o=>o.key.length).reduce((o,l)=>l>o?l:o,0);t=t.flatMap(o=>{let l=r-o.key.length,u=`${o.key}: ${" ".repeat(l)}`,c=`${" ".repeat(o.key.length+1)} ${" ".repeat(l)}`;return foldLines(o.val,80).split(/\r?\n/).map(p=>p.trim()).map((p,f)=>`${f?c:u}${p}`)});let s=t.map(o=>o.length).reduce((o,l)=>l>o?l:o,0),i="-".repeat(s);return`
${i}
${t.join(`
`)}
${i}
`}function formatHtmlHeader(n){let t=[];if(n.from&&t.push(`<div class="postal-email-header-key">From</div><div class="postal-email-header-value">${formatHtmlAddress(n.from)}</div>`),n.subject&&t.push(`<div class="postal-email-header-key">Subject</div><div class="postal-email-header-value postal-email-header-subject">${escapeHtml(n.subject)}</div>`),n.date){let s={year:"numeric",month:"numeric",day:"numeric",hour:"numeric",minute:"numeric",second:"numeric",hour12:!1},i=typeof Intl>"u"?n.date:new Intl.DateTimeFormat("default",s).format(new Date(n.date));t.push(`<div class="postal-email-header-key">Date</div><div class="postal-email-header-value postal-email-header-date" data-date="${escapeHtml(n.date)}">${escapeHtml(i)}</div>`)}return n.to&&n.to.length&&t.push(`<div class="postal-email-header-key">To</div><div class="postal-email-header-value">${formatHtmlAddresses(n.to)}</div>`),n.cc&&n.cc.length&&t.push(`<div class="postal-email-header-key">Cc</div><div class="postal-email-header-value">${formatHtmlAddresses(n.cc)}</div>`),n.bcc&&n.bcc.length&&t.push(`<div class="postal-email-header-key">Bcc</div><div class="postal-email-header-value">${formatHtmlAddresses(n.bcc)}</div>`),`<div class="postal-email-header">${t.length?'<div class="postal-email-header-row">':""}${t.join(`</div>
<div class="postal-email-header-row">`)}${t.length?"</div>":""}</div>`}function _handleAddress(n,t){let r=!1,s="text",i,a=[],o={address:[],comment:[],group:[],text:[],textWasQuoted:[]},l,u,c=!1;for(l=0,u=n.length;l<u;l++){let d=n[l],p=l?n[l-1]:null;if(d.type==="operator")switch(d.value){case"<":s="address",c=!1;break;case"(":s="comment",c=!1;break;case":":s="group",r=!0,c=!1;break;case'"':c=!c,s="text";break;default:s="text",c=!1;break}else d.value&&(s==="address"&&(d.value=d.value.replace(/^[^<]*<\s*/,"")),p&&p.noBreak&&o[s].length?(o[s][o[s].length-1]+=d.value,s==="text"&&c&&(o.textWasQuoted[o.textWasQuoted.length-1]=!0)):(o[s].push(d.value),s==="text"&&o.textWasQuoted.push(c)))}if(!o.text.length&&o.comment.length&&(o.text=o.comment,o.comment=[]),r){o.text=o.text.join(" ");let d=[];o.group.length&&addressParser(o.group.join(","),{_depth:t+1}).forEach(f=>{f.group?d=d.concat(f.group):d.push(f)}),a.push({name:decodeWords(o.text||i&&i.name),group:d})}else{if(!o.address.length&&o.text.length){for(l=o.text.length-1;l>=0;l--)if(!o.textWasQuoted[l]&&o.text[l].match(/^[^@\s]+@[^@\s]+$/)){o.address=o.text.splice(l,1),o.textWasQuoted.splice(l,1);break}let d=function(p){return o.address.length?p:(o.address=[p.trim()]," ")};if(!o.address.length)for(l=o.text.length-1;l>=0&&!(!o.textWasQuoted[l]&&(o.text[l]=o.text[l].replace(/\s*\b[^@\s]+@[^\s]+\b\s*/,d).trim(),o.address.length));l--);}if(!o.text.length&&o.comment.length&&(o.text=o.comment,o.comment=[]),o.address.length>1&&(o.text=o.text.concat(o.address.splice(1))),o.text=o.text.join(" "),o.address=o.address.join(" "),!o.address&&/^=\?[^=]+?=$/.test(o.text.trim())){const d=decodeWords(o.text);if(/<[^<>]+@[^<>]+>/.test(d)){const p=addressParser(d);if(p&&p.length)return p}return[{address:"",name:d}]}i={address:o.address||o.text||"",name:decodeWords(o.text||o.address||"")},i.address===i.name&&((i.address||"").match(/@/)?i.name="":i.address=""),a.push(i)}return a}class Tokenizer{constructor(t){this.str=(t||"").toString(),this.operatorCurrent="",this.operatorExpecting="",this.node=null,this.escaped=!1,this.list=[],this.operators={'"':'"',"(":")","<":">",",":"",":":";",";":""}}tokenize(){let t=[];for(let r=0,s=this.str.length;r<s;r++){let i=this.str.charAt(r),a=r<s-1?this.str.charAt(r+1):null;this.checkChar(i,a)}return this.list.forEach(r=>{r.value=(r.value||"").toString().trim(),r.value&&t.push(r)}),t}checkChar(t,r){if(!this.escaped){if(t===this.operatorExpecting){this.node={type:"operator",value:t},r&&![" ","	","\r",`
`,",",";"].includes(r)&&(this.node.noBreak=!0),this.list.push(this.node),this.node=null,this.operatorExpecting="",this.escaped=!1;return}else if(!this.operatorExpecting&&t in this.operators){this.node={type:"operator",value:t},this.list.push(this.node),this.node=null,this.operatorExpecting=this.operators[t],this.escaped=!1;return}else if(this.operatorExpecting==='"'&&t==="\\"){this.escaped=!0;return}}this.node||(this.node={type:"text",value:""},this.list.push(this.node)),t===`
`&&(t=" "),(t.charCodeAt(0)>=33||[" ","	"].includes(t))&&(this.node.value+=t),this.escaped=!1}}const MAX_NESTED_GROUP_DEPTH=50;function addressParser(n,t){t=t||{};let r=t._depth||0;if(r>MAX_NESTED_GROUP_DEPTH)return[];let i=new Tokenizer(n).tokenize(),a=[],o=[],l=[];if(i.forEach(u=>{u.type==="operator"&&(u.value===","||u.value===";")?(o.length&&a.push(o),o=[]):o.push(u)}),o.length&&a.push(o),a.forEach(u=>{u=_handleAddress(u,r),u.length&&(l=l.concat(u))}),t.flatten){let u=[],c=d=>{d.forEach(p=>{if(p.group)return c(p.group);u.push(p)})};return c(l),u}return l}function base64ArrayBuffer(n){for(var t="",r="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",s=new Uint8Array(n),i=s.byteLength,a=i%3,o=i-a,l,u,c,d,p,f=0;f<o;f=f+3)p=s[f]<<16|s[f+1]<<8|s[f+2],l=(p&16515072)>>18,u=(p&258048)>>12,c=(p&4032)>>6,d=p&63,t+=r[l]+r[u]+r[c]+r[d];return a==1?(p=s[o],l=(p&252)>>2,u=(p&3)<<4,t+=r[l]+r[u]+"=="):a==2&&(p=s[o]<<8|s[o+1],l=(p&64512)>>10,u=(p&1008)>>4,c=(p&15)<<2,t+=r[l]+r[u]+r[c]+"="),t}const MAX_NESTING_DEPTH=256,MAX_HEADERS_SIZE=2*1024*1024;function toCamelCase(n){return n.replace(/-(.)/g,(t,r)=>r.toUpperCase())}class PostalMime{static parse(t,r){return new PostalMime(r).parse(t)}constructor(t){this.options=t||{},this.mimeOptions={maxNestingDepth:this.options.maxNestingDepth||MAX_NESTING_DEPTH,maxHeadersSize:this.options.maxHeadersSize||MAX_HEADERS_SIZE},this.root=this.currentNode=new MimeNode({postalMime:this,...this.mimeOptions}),this.boundaries=[],this.textContent={},this.attachments=[],this.attachmentEncoding=(this.options.attachmentEncoding||"").toString().replace(/[-_\s]/g,"").trim().toLowerCase()||"arraybuffer",this.started=!1}async finalize(){await this.root.finalize()}async processLine(t,r){let s=this.boundaries;if(s.length&&t.length>2&&t[0]===45&&t[1]===45)for(let i=s.length-1;i>=0;i--){let a=s[i];if(t.length<a.value.length+2)continue;let o=!0;for(let d=0;d<a.value.length;d++)if(t[d+2]!==a.value[d]){o=!1;break}if(!o)continue;let l=a.value.length+2,u=!1;t.length>=a.value.length+4&&t[a.value.length+2]===45&&t[a.value.length+3]===45&&(u=!0,l=a.value.length+4);let c=!0;for(let d=l;d<t.length;d++)if(t[d]!==32&&t[d]!==9){c=!1;break}if(c)return u?(await a.node.finalize(),this.currentNode=a.node.parentNode||this.root):(await a.node.finalizeChildNodes(),this.currentNode=new MimeNode({postalMime:this,parentNode:a.node,parentMultipartType:a.node.contentType.multipart,...this.mimeOptions})),r?this.finalize():void 0}if(this.currentNode.feed(t),r)return this.finalize()}readLine(){let t=this.readPos,r=this.readPos;for(;this.readPos<this.av.length;){const s=this.av[this.readPos++];if(s!==13&&s!==10&&(r=this.readPos),s===10)return{bytes:new Uint8Array(this.buf,t,r-t),done:this.readPos>=this.av.length}}return{bytes:new Uint8Array(this.buf,t,r-t),done:this.readPos>=this.av.length}}async processNodeTree(){let t={},r=new Set,s=this.textMap=new Map,i=this.forceRfc822Attachments(),a=async(o,l,u)=>{if(l=l||!1,u=u||!1,o.contentType.multipart)o.contentType.multipart==="alternative"?l=o:o.contentType.multipart==="related"&&(u=o);else if(this.isInlineMessageRfc822(o)&&!i){const c=new PostalMime;o.subMessage=await c.parse(o.content),s.has(o)||s.set(o,{});let d=s.get(o);(o.subMessage.text||!o.subMessage.html)&&(d.plain=d.plain||[],d.plain.push({type:"subMessage",value:o.subMessage}),r.add("plain")),o.subMessage.html&&(d.html=d.html||[],d.html.push({type:"subMessage",value:o.subMessage}),r.add("html")),c.textMap&&c.textMap.forEach((p,f)=>{s.set(f,p)});for(let p of o.subMessage.attachments||[])this.attachments.push(p)}else if(this.isInlineTextNode(o)){let c=o.contentType.parsed.value.substr(o.contentType.parsed.value.indexOf("/")+1),d=l||o;s.has(d)||s.set(d,{});let p=s.get(d);p[c]=p[c]||[],p[c].push({type:"text",value:o.getTextContent()}),r.add(c)}else if(o.content){const c=o.contentDisposition?.parsed?.params?.filename||o.contentType.parsed.params.name||null,d={filename:c?decodeWords(c):null,mimeType:o.contentType.parsed.value,disposition:o.contentDisposition?.parsed?.value||null};switch(u&&o.contentId&&(d.related=!0),o.contentDescription&&(d.description=o.contentDescription),o.contentId&&(d.contentId=o.contentId),o.contentType.parsed.value){case"text/calendar":case"application/ics":{o.contentType.parsed.params.method&&(d.method=o.contentType.parsed.params.method.toString().toUpperCase().trim());const p=o.getTextContent().replace(/\r?\n/g,`
`).replace(/\n*$/,`
`);d.content=textEncoder.encode(p);break}default:d.content=o.content}this.attachments.push(d)}for(let c of o.childNodes)await a(c,l,u)};await a(this.root,!1,!1),s.forEach(o=>{r.forEach(l=>{if(t[l]||(t[l]=[]),o[l])o[l].forEach(u=>{switch(u.type){case"text":t[l].push(u.value);break;case"subMessage":switch(l){case"html":t[l].push(formatHtmlHeader(u.value));break;case"plain":t[l].push(formatTextHeader(u.value));break}break}});else{let u;switch(l){case"html":u="plain";break;case"plain":u="html";break}(o[u]||[]).forEach(c=>{switch(c.type){case"text":switch(l){case"html":t[l].push(textToHtml(c.value));break;case"plain":t[l].push(htmlToText(c.value));break}break;case"subMessage":switch(l){case"html":t[l].push(formatHtmlHeader(c.value));break;case"plain":t[l].push(formatTextHeader(c.value));break}break}})}})}),Object.keys(t).forEach(o=>{t[o]=t[o].join(`
`)}),this.textContent=t}isInlineTextNode(t){if(t.contentDisposition?.parsed?.value==="attachment")return!1;switch(t.contentType.parsed?.value){case"text/html":case"text/plain":return!0;case"text/calendar":case"text/csv":default:return!1}}isInlineMessageRfc822(t){return t.contentType.parsed?.value!=="message/rfc822"?!1:(t.contentDisposition?.parsed?.value||(this.options.rfc822Attachments?"attachment":"inline"))==="inline"}forceRfc822Attachments(){if(this.options.forceRfc822Attachments)return!0;let t=!1,r=s=>{s.contentType.multipart||s.contentType.parsed&&["message/delivery-status","message/feedback-report"].includes(s.contentType.parsed.value)&&(t=!0);for(let i of s.childNodes)r(i)};return r(this.root),t}async resolveStream(t){let r=0,s=[];const i=t.getReader();for(;;){const{done:l,value:u}=await i.read();if(l)break;s.push(u),r+=u.length}const a=new Uint8Array(r);let o=0;for(let l of s)a.set(l,o),o+=l.length;return a}async parse(t){if(this.started)throw new Error("Can not reuse parser, create a new PostalMime object");for(this.started=!0,t&&typeof t.getReader=="function"&&(t=await this.resolveStream(t)),t=t||new ArrayBuffer(0),typeof t=="string"&&(t=textEncoder.encode(t)),(t instanceof Blob||Object.prototype.toString.call(t)==="[object Blob]")&&(t=await blobToArrayBuffer(t)),t.buffer instanceof ArrayBuffer&&(t=new Uint8Array(t).buffer),this.buf=t,this.av=new Uint8Array(t),this.readPos=0;this.readPos<this.av.length;){const i=this.readLine();await this.processLine(i.bytes,i.done)}await this.processNodeTree();const r={headers:this.root.headers.map(i=>({key:i.key,originalKey:i.originalKey,value:i.value})).reverse()};for(const i of["from","sender"]){const a=this.root.headers.find(o=>o.key===i);if(a&&a.value){const o=addressParser(a.value);o&&o.length&&(r[i]=o[0])}}for(const i of["delivered-to","return-path"]){const a=this.root.headers.find(o=>o.key===i);if(a&&a.value){const o=addressParser(a.value);if(o&&o.length&&o[0].address){const l=toCamelCase(i);r[l]=o[0].address}}}for(const i of["to","cc","bcc","reply-to"]){const a=this.root.headers.filter(l=>l.key===i);let o=[];if(a.filter(l=>l&&l.value).map(l=>addressParser(l.value)).forEach(l=>o=o.concat(l||[])),o&&o.length){const l=toCamelCase(i);r[l]=o}}for(const i of["subject","message-id","in-reply-to","references"]){const a=this.root.headers.find(o=>o.key===i);if(a&&a.value){const o=toCamelCase(i);r[o]=decodeWords(a.value)}}let s=this.root.headers.find(i=>i.key==="date");if(s){let i=new Date(s.value);i.toString()==="Invalid Date"?i=s.value:i=i.toISOString(),r.date=i}switch(this.textContent?.html&&(r.html=this.textContent.html),this.textContent?.plain&&(r.text=this.textContent.plain),r.attachments=this.attachments,r.headerLines=(this.root.rawHeaderLines||[]).slice().reverse(),this.attachmentEncoding){case"arraybuffer":break;case"base64":for(let a of r.attachments||[])a?.content&&(a.content=base64ArrayBuffer(a.content),a.encoding="base64");break;case"utf8":let i=new TextDecoder("utf8");for(let a of r.attachments||[])a?.content&&(a.content=i.decode(a.content),a.encoding="utf8");break;default:throw new Error("Unknown attachment encoding")}return r}}new Semaphore({concurrency:15});new Semaphore({concurrency:10});async function directoryHandleFromMountDevice(n){return n.type==="local-fs"?n.handle:opfsPathToDirectoryHandle(n.path)}async function opfsPathToDirectoryHandle(n){const t=n.split("/").filter(s=>s.length>0);let r=await navigator.storage.getDirectory();for(const s of t)r=await r.getDirectoryHandle(s,{create:!0});return r}const MAX_BITS$1=15,D_CODES=30,BL_CODES=19,LENGTH_CODES=29,LITERALS=256,L_CODES=LITERALS+1+LENGTH_CODES,HEAP_SIZE=2*L_CODES+1,END_BLOCK=256,MAX_BL_BITS=7,REP_3_6=16,REPZ_3_10=17,REPZ_11_138=18,Buf_size=8*2,Z_DEFAULT_COMPRESSION=-1,Z_FILTERED=1,Z_HUFFMAN_ONLY=2,Z_DEFAULT_STRATEGY=0,Z_NO_FLUSH$1=0,Z_PARTIAL_FLUSH=1,Z_FULL_FLUSH=3,Z_FINISH$1=4,Z_OK$1=0,Z_STREAM_END$1=1,Z_NEED_DICT$1=2,Z_STREAM_ERROR$1=-2,Z_DATA_ERROR$1=-3,Z_BUF_ERROR$1=-5;function extractArray(n){return flatArray(n.map(([t,r])=>new Array(t).fill(r,0,t)))}function flatArray(n){return n.reduce((t,r)=>t.concat(Array.isArray(r)?flatArray(r):r),[])}const _dist_code=[0,1,2,3].concat(...extractArray([[2,4],[2,5],[4,6],[4,7],[8,8],[8,9],[16,10],[16,11],[32,12],[32,13],[64,14],[64,15],[2,0],[1,16],[1,17],[2,18],[2,19],[4,20],[4,21],[8,22],[8,23],[16,24],[16,25],[32,26],[32,27],[64,28],[64,29]]));function Tree(){const n=this;function t(i){const a=n.dyn_tree,o=n.stat_desc.static_tree,l=n.stat_desc.extra_bits,u=n.stat_desc.extra_base,c=n.stat_desc.max_length;let d,p,f,g,y,_,h=0;for(g=0;g<=MAX_BITS$1;g++)i.bl_count[g]=0;for(a[i.heap[i.heap_max]*2+1]=0,d=i.heap_max+1;d<HEAP_SIZE;d++)p=i.heap[d],g=a[a[p*2+1]*2+1]+1,g>c&&(g=c,h++),a[p*2+1]=g,!(p>n.max_code)&&(i.bl_count[g]++,y=0,p>=u&&(y=l[p-u]),_=a[p*2],i.opt_len+=_*(g+y),o&&(i.static_len+=_*(o[p*2+1]+y)));if(h!==0){do{for(g=c-1;i.bl_count[g]===0;)g--;i.bl_count[g]--,i.bl_count[g+1]+=2,i.bl_count[c]--,h-=2}while(h>0);for(g=c;g!==0;g--)for(p=i.bl_count[g];p!==0;)f=i.heap[--d],!(f>n.max_code)&&(a[f*2+1]!=g&&(i.opt_len+=(g-a[f*2+1])*a[f*2],a[f*2+1]=g),p--)}}function r(i,a){let o=0;do o|=i&1,i>>>=1,o<<=1;while(--a>0);return o>>>1}function s(i,a,o){const l=[];let u=0,c,d,p;for(c=1;c<=MAX_BITS$1;c++)l[c]=u=u+o[c-1]<<1;for(d=0;d<=a;d++)p=i[d*2+1],p!==0&&(i[d*2]=r(l[p]++,p))}n.build_tree=function(i){const a=n.dyn_tree,o=n.stat_desc.static_tree,l=n.stat_desc.elems;let u,c,d=-1,p;for(i.heap_len=0,i.heap_max=HEAP_SIZE,u=0;u<l;u++)a[u*2]!==0?(i.heap[++i.heap_len]=d=u,i.depth[u]=0):a[u*2+1]=0;for(;i.heap_len<2;)p=i.heap[++i.heap_len]=d<2?++d:0,a[p*2]=1,i.depth[p]=0,i.opt_len--,o&&(i.static_len-=o[p*2+1]);for(n.max_code=d,u=Math.floor(i.heap_len/2);u>=1;u--)i.pqdownheap(a,u);p=l;do u=i.heap[1],i.heap[1]=i.heap[i.heap_len--],i.pqdownheap(a,1),c=i.heap[1],i.heap[--i.heap_max]=u,i.heap[--i.heap_max]=c,a[p*2]=a[u*2]+a[c*2],i.depth[p]=Math.max(i.depth[u],i.depth[c])+1,a[u*2+1]=a[c*2+1]=p,i.heap[1]=p++,i.pqdownheap(a,1);while(i.heap_len>=2);i.heap[--i.heap_max]=i.heap[1],t(i),s(a,n.max_code,i.bl_count)}}Tree._length_code=[0,1,2,3,4,5,6,7].concat(...extractArray([[2,8],[2,9],[2,10],[2,11],[4,12],[4,13],[4,14],[4,15],[8,16],[8,17],[8,18],[8,19],[16,20],[16,21],[16,22],[16,23],[32,24],[32,25],[32,26],[31,27],[1,28]]));Tree.base_length=[0,1,2,3,4,5,6,7,8,10,12,14,16,20,24,28,32,40,48,56,64,80,96,112,128,160,192,224,0];Tree.base_dist=[0,1,2,3,4,6,8,12,16,24,32,48,64,96,128,192,256,384,512,768,1024,1536,2048,3072,4096,6144,8192,12288,16384,24576];Tree.d_code=function(n){return n<256?_dist_code[n]:_dist_code[256+(n>>>7)]};Tree.extra_lbits=[0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0];Tree.extra_dbits=[0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13];Tree.extra_blbits=[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,3,7];Tree.bl_order=[16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15];function StaticTree(n,t,r,s,i){const a=this;a.static_tree=n,a.extra_bits=t,a.extra_base=r,a.elems=s,a.max_length=i}const static_ltree2_first_part=[12,140,76,204,44,172,108,236,28,156,92,220,60,188,124,252,2,130,66,194,34,162,98,226,18,146,82,210,50,178,114,242,10,138,74,202,42,170,106,234,26,154,90,218,58,186,122,250,6,134,70,198,38,166,102,230,22,150,86,214,54,182,118,246,14,142,78,206,46,174,110,238,30,158,94,222,62,190,126,254,1,129,65,193,33,161,97,225,17,145,81,209,49,177,113,241,9,137,73,201,41,169,105,233,25,153,89,217,57,185,121,249,5,133,69,197,37,165,101,229,21,149,85,213,53,181,117,245,13,141,77,205,45,173,109,237,29,157,93,221,61,189,125,253,19,275,147,403,83,339,211,467,51,307,179,435,115,371,243,499,11,267,139,395,75,331,203,459,43,299,171,427,107,363,235,491,27,283,155,411,91,347,219,475,59,315,187,443,123,379,251,507,7,263,135,391,71,327,199,455,39,295,167,423,103,359,231,487,23,279,151,407,87,343,215,471,55,311,183,439,119,375,247,503,15,271,143,399,79,335,207,463,47,303,175,431,111,367,239,495,31,287,159,415,95,351,223,479,63,319,191,447,127,383,255,511,0,64,32,96,16,80,48,112,8,72,40,104,24,88,56,120,4,68,36,100,20,84,52,116,3,131,67,195,35,163,99,227],static_ltree2_second_part=extractArray([[144,8],[112,9],[24,7],[8,8]]);StaticTree.static_ltree=flatArray(static_ltree2_first_part.map((n,t)=>[n,static_ltree2_second_part[t]]));const static_dtree_first_part=[0,16,8,24,4,20,12,28,2,18,10,26,6,22,14,30,1,17,9,25,5,21,13,29,3,19,11,27,7,23],static_dtree_second_part=extractArray([[30,5]]);StaticTree.static_dtree=flatArray(static_dtree_first_part.map((n,t)=>[n,static_dtree_second_part[t]]));StaticTree.static_l_desc=new StaticTree(StaticTree.static_ltree,Tree.extra_lbits,LITERALS+1,L_CODES,MAX_BITS$1);StaticTree.static_d_desc=new StaticTree(StaticTree.static_dtree,Tree.extra_dbits,0,D_CODES,MAX_BITS$1);StaticTree.static_bl_desc=new StaticTree(null,Tree.extra_blbits,0,BL_CODES,MAX_BL_BITS);const MAX_MEM_LEVEL=9,DEF_MEM_LEVEL=8;function Config(n,t,r,s,i){const a=this;a.good_length=n,a.max_lazy=t,a.nice_length=r,a.max_chain=s,a.func=i}const STORED$1=0,FAST=1,SLOW=2,config_table=[new Config(0,0,0,0,STORED$1),new Config(4,4,8,4,FAST),new Config(4,5,16,8,FAST),new Config(4,6,32,32,FAST),new Config(4,4,16,16,SLOW),new Config(8,16,32,32,SLOW),new Config(8,16,128,128,SLOW),new Config(8,32,128,256,SLOW),new Config(32,128,258,1024,SLOW),new Config(32,258,258,4096,SLOW)],z_errmsg=["need dictionary","stream end","","","stream error","data error","","buffer error","",""],NeedMore=0,BlockDone=1,FinishStarted=2,FinishDone=3,PRESET_DICT$1=32,INIT_STATE=42,BUSY_STATE=113,FINISH_STATE=666,Z_DEFLATED$1=8,STORED_BLOCK=0,STATIC_TREES=1,DYN_TREES=2,MIN_MATCH=3,MAX_MATCH=258,MIN_LOOKAHEAD=MAX_MATCH+MIN_MATCH+1;function smaller(n,t,r,s){const i=n[t*2],a=n[r*2];return i<a||i==a&&s[t]<=s[r]}function Deflate(){const n=this;let t,r,s,i,a,o,l,u,c,d,p,f,g,y,_,h,m,w,T,E,b,S,A,v,x,L,D,H,C,O,F,I,q;const j=new Tree,G=new Tree,U=new Tree;n.depth=[];let J,W,M,V,z,Z;n.bl_count=[],n.heap=[],F=[],I=[],q=[];function se(){c=2*a,p[g-1]=0;for(let P=0;P<g-1;P++)p[P]=0;L=config_table[D].max_lazy,C=config_table[D].good_length,O=config_table[D].nice_length,x=config_table[D].max_chain,b=0,m=0,A=0,w=v=MIN_MATCH-1,E=0,f=0}function oe(){let P;for(P=0;P<L_CODES;P++)F[P*2]=0;for(P=0;P<D_CODES;P++)I[P*2]=0;for(P=0;P<BL_CODES;P++)q[P*2]=0;F[END_BLOCK*2]=1,n.opt_len=n.static_len=0,W=M=0}function Q(){j.dyn_tree=F,j.stat_desc=StaticTree.static_l_desc,G.dyn_tree=I,G.stat_desc=StaticTree.static_d_desc,U.dyn_tree=q,U.stat_desc=StaticTree.static_bl_desc,z=0,Z=0,V=8,oe()}n.pqdownheap=function(P,R){const $=n.heap,k=$[R];let N=R<<1;for(;N<=n.heap_len&&(N<n.heap_len&&smaller(P,$[N+1],$[N],n.depth)&&N++,!smaller(P,k,$[N],n.depth));)$[R]=$[N],R=N,N<<=1;$[R]=k};function le(P,R){let $=-1,k,N=P[0*2+1],B=0,K=7,X=4;N===0&&(K=138,X=3),P[(R+1)*2+1]=65535;for(let te=0;te<=R;te++)k=N,N=P[(te+1)*2+1],!(++B<K&&k==N)&&(B<X?q[k*2]+=B:k!==0?(k!=$&&q[k*2]++,q[REP_3_6*2]++):B<=10?q[REPZ_3_10*2]++:q[REPZ_11_138*2]++,B=0,$=k,N===0?(K=138,X=3):k==N?(K=6,X=3):(K=7,X=4))}function ye(){let P;for(le(F,j.max_code),le(I,G.max_code),U.build_tree(n),P=BL_CODES-1;P>=3&&q[Tree.bl_order[P]*2+1]===0;P--);return n.opt_len+=3*(P+1)+5+5+4,P}function re(P){n.pending_buf[n.pending++]=P}function ie(P){re(P&255),re(P>>>8&255)}function Ee(P){re(P>>8&255),re(P&255&255)}function Y(P,R){let $;const k=R;Z>Buf_size-k?($=P,z|=$<<Z&65535,ie(z),z=$>>>Buf_size-Z,Z+=k-Buf_size):(z|=P<<Z&65535,Z+=k)}function ee(P,R){const $=P*2;Y(R[$]&65535,R[$+1]&65535)}function de(P,R){let $,k=-1,N,B=P[0*2+1],K=0,X=7,te=4;for(B===0&&(X=138,te=3),$=0;$<=R;$++)if(N=B,B=P[($+1)*2+1],!(++K<X&&N==B)){if(K<te)do ee(N,q);while(--K!==0);else N!==0?(N!=k&&(ee(N,q),K--),ee(REP_3_6,q),Y(K-3,2)):K<=10?(ee(REPZ_3_10,q),Y(K-3,3)):(ee(REPZ_11_138,q),Y(K-11,7));K=0,k=N,B===0?(X=138,te=3):N==B?(X=6,te=3):(X=7,te=4)}}function be(P,R,$){let k;for(Y(P-257,5),Y(R-1,5),Y($-4,4),k=0;k<$;k++)Y(q[Tree.bl_order[k]*2+1],3);de(F,P-1),de(I,R-1)}function pe(){Z==16?(ie(z),z=0,Z=0):Z>=8&&(re(z&255),z>>>=8,Z-=8)}function Te(){Y(STATIC_TREES<<1,3),ee(END_BLOCK,StaticTree.static_ltree),pe(),1+V+10-Z<9&&(Y(STATIC_TREES<<1,3),ee(END_BLOCK,StaticTree.static_ltree),pe()),V=7}function ae(P,R){let $,k,N;if(n.dist_buf[W]=P,n.lc_buf[W]=R&255,W++,P===0?F[R*2]++:(M++,P--,F[(Tree._length_code[R]+LITERALS+1)*2]++,I[Tree.d_code(P)*2]++),!(W&8191)&&D>2){for($=W*8,k=b-m,N=0;N<D_CODES;N++)$+=I[N*2]*(5+Tree.extra_dbits[N]);if($>>>=3,M<Math.floor(W/2)&&$<Math.floor(k/2))return!0}return W==J-1}function fe(P,R){let $,k,N=0,B,K;if(W!==0)do $=n.dist_buf[N],k=n.lc_buf[N],N++,$===0?ee(k,P):(B=Tree._length_code[k],ee(B+LITERALS+1,P),K=Tree.extra_lbits[B],K!==0&&(k-=Tree.base_length[B],Y(k,K)),$--,B=Tree.d_code($),ee(B,R),K=Tree.extra_dbits[B],K!==0&&($-=Tree.base_dist[B],Y($,K)));while(N<W);ee(END_BLOCK,P),V=P[END_BLOCK*2+1]}function _e(){Z>8?ie(z):Z>0&&re(z&255),z=0,Z=0}function Se(P,R,$){_e(),V=8,ie(R),ie(~R),n.pending_buf.set(u.subarray(P,P+R),n.pending),n.pending+=R}function he(P,R,$){Y((STORED_BLOCK<<1)+($?1:0),3),Se(P,R)}function Ae(P,R,$){let k,N,B=0;D>0?(j.build_tree(n),G.build_tree(n),B=ye(),k=n.opt_len+3+7>>>3,N=n.static_len+3+7>>>3,N<=k&&(k=N)):k=N=R+5,R+4<=k&&P!=-1?he(P,R,$):N==k?(Y((STATIC_TREES<<1)+($?1:0),3),fe(StaticTree.static_ltree,StaticTree.static_dtree)):(Y((DYN_TREES<<1)+($?1:0),3),be(j.max_code+1,G.max_code+1,B+1),fe(F,I)),oe(),$&&_e()}function ne(P){Ae(m>=0?m:-1,b-m,P),m=b,t.flush_pending()}function ue(){let P,R,$,k;do{if(k=c-A-b,k===0&&b===0&&A===0)k=a;else if(k==-1)k--;else if(b>=a+a-MIN_LOOKAHEAD){u.set(u.subarray(a,a+a),0),S-=a,b-=a,m-=a,P=g,$=P;do R=p[--$]&65535,p[$]=R>=a?R-a:0;while(--P!==0);P=a,$=P;do R=d[--$]&65535,d[$]=R>=a?R-a:0;while(--P!==0);k+=a}if(t.avail_in===0)return;P=t.read_buf(u,b+A,k),A+=P,A>=MIN_MATCH&&(f=u[b]&255,f=(f<<h^u[b+1]&255)&_)}while(A<MIN_LOOKAHEAD&&t.avail_in!==0)}function ve(P){let R=65535,$;for(R>s-5&&(R=s-5);;){if(A<=1){if(ue(),A===0&&P==Z_NO_FLUSH$1)return NeedMore;if(A===0)break}if(b+=A,A=0,$=m+R,(b===0||b>=$)&&(A=b-$,b=$,ne(!1),t.avail_out===0)||b-m>=a-MIN_LOOKAHEAD&&(ne(!1),t.avail_out===0))return NeedMore}return ne(P==Z_FINISH$1),t.avail_out===0?P==Z_FINISH$1?FinishStarted:NeedMore:P==Z_FINISH$1?FinishDone:BlockDone}function me(P){let R=x,$=b,k,N,B=v;const K=b>a-MIN_LOOKAHEAD?b-(a-MIN_LOOKAHEAD):0;let X=O;const te=l,ce=b+MAX_MATCH;let ge=u[$+B-1],we=u[$+B];v>=C&&(R>>=2),X>A&&(X=A);do if(k=P,!(u[k+B]!=we||u[k+B-1]!=ge||u[k]!=u[$]||u[++k]!=u[$+1])){$+=2,k++;do;while(u[++$]==u[++k]&&u[++$]==u[++k]&&u[++$]==u[++k]&&u[++$]==u[++k]&&u[++$]==u[++k]&&u[++$]==u[++k]&&u[++$]==u[++k]&&u[++$]==u[++k]&&$<ce);if(N=MAX_MATCH-(ce-$),$=ce-MAX_MATCH,N>B){if(S=P,B=N,N>=X)break;ge=u[$+B-1],we=u[$+B]}}while((P=d[P&te]&65535)>K&&--R!==0);return B<=A?B:A}function xe(P){let R=0,$;for(;;){if(A<MIN_LOOKAHEAD){if(ue(),A<MIN_LOOKAHEAD&&P==Z_NO_FLUSH$1)return NeedMore;if(A===0)break}if(A>=MIN_MATCH&&(f=(f<<h^u[b+(MIN_MATCH-1)]&255)&_,R=p[f]&65535,d[b&l]=p[f],p[f]=b),R!==0&&(b-R&65535)<=a-MIN_LOOKAHEAD&&H!=Z_HUFFMAN_ONLY&&(w=me(R)),w>=MIN_MATCH)if($=ae(b-S,w-MIN_MATCH),A-=w,w<=L&&A>=MIN_MATCH){w--;do b++,f=(f<<h^u[b+(MIN_MATCH-1)]&255)&_,R=p[f]&65535,d[b&l]=p[f],p[f]=b;while(--w!==0);b++}else b+=w,w=0,f=u[b]&255,f=(f<<h^u[b+1]&255)&_;else $=ae(0,u[b]&255),A--,b++;if($&&(ne(!1),t.avail_out===0))return NeedMore}return ne(P==Z_FINISH$1),t.avail_out===0?P==Z_FINISH$1?FinishStarted:NeedMore:P==Z_FINISH$1?FinishDone:BlockDone}function Pe(P){let R=0,$,k;for(;;){if(A<MIN_LOOKAHEAD){if(ue(),A<MIN_LOOKAHEAD&&P==Z_NO_FLUSH$1)return NeedMore;if(A===0)break}if(A>=MIN_MATCH&&(f=(f<<h^u[b+(MIN_MATCH-1)]&255)&_,R=p[f]&65535,d[b&l]=p[f],p[f]=b),v=w,T=S,w=MIN_MATCH-1,R!==0&&v<L&&(b-R&65535)<=a-MIN_LOOKAHEAD&&(H!=Z_HUFFMAN_ONLY&&(w=me(R)),w<=5&&(H==Z_FILTERED||w==MIN_MATCH&&b-S>4096)&&(w=MIN_MATCH-1)),v>=MIN_MATCH&&w<=v){k=b+A-MIN_MATCH,$=ae(b-1-T,v-MIN_MATCH),A-=v-1,v-=2;do++b<=k&&(f=(f<<h^u[b+(MIN_MATCH-1)]&255)&_,R=p[f]&65535,d[b&l]=p[f],p[f]=b);while(--v!==0);if(E=0,w=MIN_MATCH-1,b++,$&&(ne(!1),t.avail_out===0))return NeedMore}else if(E!==0){if($=ae(0,u[b-1]&255),$&&ne(!1),b++,A--,t.avail_out===0)return NeedMore}else E=1,b++,A--}return E!==0&&($=ae(0,u[b-1]&255),E=0),ne(P==Z_FINISH$1),t.avail_out===0?P==Z_FINISH$1?FinishStarted:NeedMore:P==Z_FINISH$1?FinishDone:BlockDone}function $e(P){return P.total_in=P.total_out=0,P.msg=null,n.pending=0,n.pending_out=0,r=BUSY_STATE,i=Z_NO_FLUSH$1,Q(),se(),Z_OK$1}n.deflateInit=function(P,R,$,k,N,B){return k||(k=Z_DEFLATED$1),N||(N=DEF_MEM_LEVEL),B||(B=Z_DEFAULT_STRATEGY),P.msg=null,R==Z_DEFAULT_COMPRESSION&&(R=6),N<1||N>MAX_MEM_LEVEL||k!=Z_DEFLATED$1||$<9||$>15||R<0||R>9||B<0||B>Z_HUFFMAN_ONLY?Z_STREAM_ERROR$1:(P.dstate=n,o=$,a=1<<o,l=a-1,y=N+7,g=1<<y,_=g-1,h=Math.floor((y+MIN_MATCH-1)/MIN_MATCH),u=new Uint8Array(a*2),d=[],p=[],J=1<<N+6,n.pending_buf=new Uint8Array(J*4),s=J*4,n.dist_buf=new Uint16Array(J),n.lc_buf=new Uint8Array(J),D=R,H=B,$e(P))},n.deflateEnd=function(){return r!=INIT_STATE&&r!=BUSY_STATE&&r!=FINISH_STATE?Z_STREAM_ERROR$1:(n.lc_buf=null,n.dist_buf=null,n.pending_buf=null,p=null,d=null,u=null,n.dstate=null,r==BUSY_STATE?Z_DATA_ERROR$1:Z_OK$1)},n.deflateParams=function(P,R,$){let k=Z_OK$1;return R==Z_DEFAULT_COMPRESSION&&(R=6),R<0||R>9||$<0||$>Z_HUFFMAN_ONLY?Z_STREAM_ERROR$1:(config_table[D].func!=config_table[R].func&&P.total_in!==0&&(k=P.deflate(Z_PARTIAL_FLUSH)),D!=R&&(D=R,L=config_table[D].max_lazy,C=config_table[D].good_length,O=config_table[D].nice_length,x=config_table[D].max_chain),H=$,k)},n.deflateSetDictionary=function(P,R,$){let k=$,N,B=0;if(!R||r!=INIT_STATE)return Z_STREAM_ERROR$1;if(k<MIN_MATCH)return Z_OK$1;for(k>a-MIN_LOOKAHEAD&&(k=a-MIN_LOOKAHEAD,B=$-k),u.set(R.subarray(B,B+k),0),b=k,m=k,f=u[0]&255,f=(f<<h^u[1]&255)&_,N=0;N<=k-MIN_MATCH;N++)f=(f<<h^u[N+(MIN_MATCH-1)]&255)&_,d[N&l]=p[f],p[f]=N;return Z_OK$1},n.deflate=function(P,R){let $,k,N,B,K;if(R>Z_FINISH$1||R<0)return Z_STREAM_ERROR$1;if(!P.next_out||!P.next_in&&P.avail_in!==0||r==FINISH_STATE&&R!=Z_FINISH$1)return P.msg=z_errmsg[Z_NEED_DICT$1-Z_STREAM_ERROR$1],Z_STREAM_ERROR$1;if(P.avail_out===0)return P.msg=z_errmsg[Z_NEED_DICT$1-Z_BUF_ERROR$1],Z_BUF_ERROR$1;if(t=P,B=i,i=R,r==INIT_STATE&&(k=Z_DEFLATED$1+(o-8<<4)<<8,N=(D-1&255)>>1,N>3&&(N=3),k|=N<<6,b!==0&&(k|=PRESET_DICT$1),k+=31-k%31,r=BUSY_STATE,Ee(k)),n.pending!==0){if(t.flush_pending(),t.avail_out===0)return i=-1,Z_OK$1}else if(t.avail_in===0&&R<=B&&R!=Z_FINISH$1)return t.msg=z_errmsg[Z_NEED_DICT$1-Z_BUF_ERROR$1],Z_BUF_ERROR$1;if(r==FINISH_STATE&&t.avail_in!==0)return P.msg=z_errmsg[Z_NEED_DICT$1-Z_BUF_ERROR$1],Z_BUF_ERROR$1;if(t.avail_in!==0||A!==0||R!=Z_NO_FLUSH$1&&r!=FINISH_STATE){switch(K=-1,config_table[D].func){case STORED$1:K=ve(R);break;case FAST:K=xe(R);break;case SLOW:K=Pe(R);break}if((K==FinishStarted||K==FinishDone)&&(r=FINISH_STATE),K==NeedMore||K==FinishStarted)return t.avail_out===0&&(i=-1),Z_OK$1;if(K==BlockDone){if(R==Z_PARTIAL_FLUSH)Te();else if(he(0,0,!1),R==Z_FULL_FLUSH)for($=0;$<g;$++)p[$]=0;if(t.flush_pending(),t.avail_out===0)return i=-1,Z_OK$1}}return R!=Z_FINISH$1?Z_OK$1:Z_STREAM_END$1}}function ZStream$1(){const n=this;n.next_in_index=0,n.next_out_index=0,n.avail_in=0,n.total_in=0,n.avail_out=0,n.total_out=0}ZStream$1.prototype={deflateInit(n,t){const r=this;return r.dstate=new Deflate,t||(t=MAX_BITS$1),r.dstate.deflateInit(r,n,t)},deflate(n){const t=this;return t.dstate?t.dstate.deflate(t,n):Z_STREAM_ERROR$1},deflateEnd(){const n=this;if(!n.dstate)return Z_STREAM_ERROR$1;const t=n.dstate.deflateEnd();return n.dstate=null,t},deflateParams(n,t){const r=this;return r.dstate?r.dstate.deflateParams(r,n,t):Z_STREAM_ERROR$1},deflateSetDictionary(n,t){const r=this;return r.dstate?r.dstate.deflateSetDictionary(r,n,t):Z_STREAM_ERROR$1},read_buf(n,t,r){const s=this;let i=s.avail_in;return i>r&&(i=r),i===0?0:(s.avail_in-=i,n.set(s.next_in.subarray(s.next_in_index,s.next_in_index+i),t),s.next_in_index+=i,s.total_in+=i,i)},flush_pending(){const n=this;let t=n.dstate.pending;t>n.avail_out&&(t=n.avail_out),t!==0&&(n.next_out.set(n.dstate.pending_buf.subarray(n.dstate.pending_out,n.dstate.pending_out+t),n.next_out_index),n.next_out_index+=t,n.dstate.pending_out+=t,n.total_out+=t,n.avail_out-=t,n.dstate.pending-=t,n.dstate.pending===0&&(n.dstate.pending_out=0))}};function ZipDeflate(n){const t=this,r=new ZStream$1,s=getMaximumCompressedSize(n&&n.chunkSize?n.chunkSize:64*1024),i=Z_NO_FLUSH$1,a=new Uint8Array(s);let o=n?n.level:Z_DEFAULT_COMPRESSION;typeof o>"u"&&(o=Z_DEFAULT_COMPRESSION),r.deflateInit(o),r.next_out=a,t.append=function(l,u){let c,d,p=0,f=0,g=0;const y=[];if(l.length){r.next_in_index=0,r.next_in=l,r.avail_in=l.length;do{if(r.next_out_index=0,r.avail_out=s,c=r.deflate(i),c!=Z_OK$1)throw new Error("deflating: "+r.msg);r.next_out_index&&(r.next_out_index==s?y.push(new Uint8Array(a)):y.push(a.subarray(0,r.next_out_index))),g+=r.next_out_index,u&&r.next_in_index>0&&r.next_in_index!=p&&(u(r.next_in_index),p=r.next_in_index)}while(r.avail_in>0||r.avail_out===0);return y.length>1?(d=new Uint8Array(g),y.forEach(function(_){d.set(_,f),f+=_.length})):d=y[0]?new Uint8Array(y[0]):new Uint8Array,d}},t.flush=function(){let l,u,c=0,d=0;const p=[];do{if(r.next_out_index=0,r.avail_out=s,l=r.deflate(Z_FINISH$1),l!=Z_STREAM_END$1&&l!=Z_OK$1)throw new Error("deflating: "+r.msg);s-r.avail_out>0&&p.push(a.slice(0,r.next_out_index)),d+=r.next_out_index}while(r.avail_in>0||r.avail_out===0);return r.deflateEnd(),u=new Uint8Array(d),p.forEach(function(f){u.set(f,c),c+=f.length}),u}}function getMaximumCompressedSize(n){return n+5*(Math.floor(n/16383)+1)}const MAX_BITS=15,Z_OK=0,Z_STREAM_END=1,Z_NEED_DICT=2,Z_STREAM_ERROR=-2,Z_DATA_ERROR=-3,Z_MEM_ERROR=-4,Z_BUF_ERROR=-5,inflate_mask=[0,1,3,7,15,31,63,127,255,511,1023,2047,4095,8191,16383,32767,65535],MANY=1440,Z_NO_FLUSH=0,Z_FINISH=4,fixed_bl=9,fixed_bd=5,fixed_tl=[96,7,256,0,8,80,0,8,16,84,8,115,82,7,31,0,8,112,0,8,48,0,9,192,80,7,10,0,8,96,0,8,32,0,9,160,0,8,0,0,8,128,0,8,64,0,9,224,80,7,6,0,8,88,0,8,24,0,9,144,83,7,59,0,8,120,0,8,56,0,9,208,81,7,17,0,8,104,0,8,40,0,9,176,0,8,8,0,8,136,0,8,72,0,9,240,80,7,4,0,8,84,0,8,20,85,8,227,83,7,43,0,8,116,0,8,52,0,9,200,81,7,13,0,8,100,0,8,36,0,9,168,0,8,4,0,8,132,0,8,68,0,9,232,80,7,8,0,8,92,0,8,28,0,9,152,84,7,83,0,8,124,0,8,60,0,9,216,82,7,23,0,8,108,0,8,44,0,9,184,0,8,12,0,8,140,0,8,76,0,9,248,80,7,3,0,8,82,0,8,18,85,8,163,83,7,35,0,8,114,0,8,50,0,9,196,81,7,11,0,8,98,0,8,34,0,9,164,0,8,2,0,8,130,0,8,66,0,9,228,80,7,7,0,8,90,0,8,26,0,9,148,84,7,67,0,8,122,0,8,58,0,9,212,82,7,19,0,8,106,0,8,42,0,9,180,0,8,10,0,8,138,0,8,74,0,9,244,80,7,5,0,8,86,0,8,22,192,8,0,83,7,51,0,8,118,0,8,54,0,9,204,81,7,15,0,8,102,0,8,38,0,9,172,0,8,6,0,8,134,0,8,70,0,9,236,80,7,9,0,8,94,0,8,30,0,9,156,84,7,99,0,8,126,0,8,62,0,9,220,82,7,27,0,8,110,0,8,46,0,9,188,0,8,14,0,8,142,0,8,78,0,9,252,96,7,256,0,8,81,0,8,17,85,8,131,82,7,31,0,8,113,0,8,49,0,9,194,80,7,10,0,8,97,0,8,33,0,9,162,0,8,1,0,8,129,0,8,65,0,9,226,80,7,6,0,8,89,0,8,25,0,9,146,83,7,59,0,8,121,0,8,57,0,9,210,81,7,17,0,8,105,0,8,41,0,9,178,0,8,9,0,8,137,0,8,73,0,9,242,80,7,4,0,8,85,0,8,21,80,8,258,83,7,43,0,8,117,0,8,53,0,9,202,81,7,13,0,8,101,0,8,37,0,9,170,0,8,5,0,8,133,0,8,69,0,9,234,80,7,8,0,8,93,0,8,29,0,9,154,84,7,83,0,8,125,0,8,61,0,9,218,82,7,23,0,8,109,0,8,45,0,9,186,0,8,13,0,8,141,0,8,77,0,9,250,80,7,3,0,8,83,0,8,19,85,8,195,83,7,35,0,8,115,0,8,51,0,9,198,81,7,11,0,8,99,0,8,35,0,9,166,0,8,3,0,8,131,0,8,67,0,9,230,80,7,7,0,8,91,0,8,27,0,9,150,84,7,67,0,8,123,0,8,59,0,9,214,82,7,19,0,8,107,0,8,43,0,9,182,0,8,11,0,8,139,0,8,75,0,9,246,80,7,5,0,8,87,0,8,23,192,8,0,83,7,51,0,8,119,0,8,55,0,9,206,81,7,15,0,8,103,0,8,39,0,9,174,0,8,7,0,8,135,0,8,71,0,9,238,80,7,9,0,8,95,0,8,31,0,9,158,84,7,99,0,8,127,0,8,63,0,9,222,82,7,27,0,8,111,0,8,47,0,9,190,0,8,15,0,8,143,0,8,79,0,9,254,96,7,256,0,8,80,0,8,16,84,8,115,82,7,31,0,8,112,0,8,48,0,9,193,80,7,10,0,8,96,0,8,32,0,9,161,0,8,0,0,8,128,0,8,64,0,9,225,80,7,6,0,8,88,0,8,24,0,9,145,83,7,59,0,8,120,0,8,56,0,9,209,81,7,17,0,8,104,0,8,40,0,9,177,0,8,8,0,8,136,0,8,72,0,9,241,80,7,4,0,8,84,0,8,20,85,8,227,83,7,43,0,8,116,0,8,52,0,9,201,81,7,13,0,8,100,0,8,36,0,9,169,0,8,4,0,8,132,0,8,68,0,9,233,80,7,8,0,8,92,0,8,28,0,9,153,84,7,83,0,8,124,0,8,60,0,9,217,82,7,23,0,8,108,0,8,44,0,9,185,0,8,12,0,8,140,0,8,76,0,9,249,80,7,3,0,8,82,0,8,18,85,8,163,83,7,35,0,8,114,0,8,50,0,9,197,81,7,11,0,8,98,0,8,34,0,9,165,0,8,2,0,8,130,0,8,66,0,9,229,80,7,7,0,8,90,0,8,26,0,9,149,84,7,67,0,8,122,0,8,58,0,9,213,82,7,19,0,8,106,0,8,42,0,9,181,0,8,10,0,8,138,0,8,74,0,9,245,80,7,5,0,8,86,0,8,22,192,8,0,83,7,51,0,8,118,0,8,54,0,9,205,81,7,15,0,8,102,0,8,38,0,9,173,0,8,6,0,8,134,0,8,70,0,9,237,80,7,9,0,8,94,0,8,30,0,9,157,84,7,99,0,8,126,0,8,62,0,9,221,82,7,27,0,8,110,0,8,46,0,9,189,0,8,14,0,8,142,0,8,78,0,9,253,96,7,256,0,8,81,0,8,17,85,8,131,82,7,31,0,8,113,0,8,49,0,9,195,80,7,10,0,8,97,0,8,33,0,9,163,0,8,1,0,8,129,0,8,65,0,9,227,80,7,6,0,8,89,0,8,25,0,9,147,83,7,59,0,8,121,0,8,57,0,9,211,81,7,17,0,8,105,0,8,41,0,9,179,0,8,9,0,8,137,0,8,73,0,9,243,80,7,4,0,8,85,0,8,21,80,8,258,83,7,43,0,8,117,0,8,53,0,9,203,81,7,13,0,8,101,0,8,37,0,9,171,0,8,5,0,8,133,0,8,69,0,9,235,80,7,8,0,8,93,0,8,29,0,9,155,84,7,83,0,8,125,0,8,61,0,9,219,82,7,23,0,8,109,0,8,45,0,9,187,0,8,13,0,8,141,0,8,77,0,9,251,80,7,3,0,8,83,0,8,19,85,8,195,83,7,35,0,8,115,0,8,51,0,9,199,81,7,11,0,8,99,0,8,35,0,9,167,0,8,3,0,8,131,0,8,67,0,9,231,80,7,7,0,8,91,0,8,27,0,9,151,84,7,67,0,8,123,0,8,59,0,9,215,82,7,19,0,8,107,0,8,43,0,9,183,0,8,11,0,8,139,0,8,75,0,9,247,80,7,5,0,8,87,0,8,23,192,8,0,83,7,51,0,8,119,0,8,55,0,9,207,81,7,15,0,8,103,0,8,39,0,9,175,0,8,7,0,8,135,0,8,71,0,9,239,80,7,9,0,8,95,0,8,31,0,9,159,84,7,99,0,8,127,0,8,63,0,9,223,82,7,27,0,8,111,0,8,47,0,9,191,0,8,15,0,8,143,0,8,79,0,9,255],fixed_td=[80,5,1,87,5,257,83,5,17,91,5,4097,81,5,5,89,5,1025,85,5,65,93,5,16385,80,5,3,88,5,513,84,5,33,92,5,8193,82,5,9,90,5,2049,86,5,129,192,5,24577,80,5,2,87,5,385,83,5,25,91,5,6145,81,5,7,89,5,1537,85,5,97,93,5,24577,80,5,4,88,5,769,84,5,49,92,5,12289,82,5,13,90,5,3073,86,5,193,192,5,24577],cplens=[3,4,5,6,7,8,9,10,11,13,15,17,19,23,27,31,35,43,51,59,67,83,99,115,131,163,195,227,258,0,0],cplext=[0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0,112,112],cpdist=[1,2,3,4,5,7,9,13,17,25,33,49,65,97,129,193,257,385,513,769,1025,1537,2049,3073,4097,6145,8193,12289,16385,24577],cpdext=[0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13],BMAX=15;function InfTree(){const n=this;let t,r,s,i,a,o;function l(c,d,p,f,g,y,_,h,m,w,T){let E,b,S,A,v,x,L,D,H,C,O,F,I,q,j;C=0,v=p;do s[c[d+C]]++,C++,v--;while(v!==0);if(s[0]==p)return _[0]=-1,h[0]=0,Z_OK;for(D=h[0],x=1;x<=BMAX&&s[x]===0;x++);for(L=x,D<x&&(D=x),v=BMAX;v!==0&&s[v]===0;v--);for(S=v,D>v&&(D=v),h[0]=D,q=1<<x;x<v;x++,q<<=1)if((q-=s[x])<0)return Z_DATA_ERROR;if((q-=s[v])<0)return Z_DATA_ERROR;for(s[v]+=q,o[1]=x=0,C=1,I=2;--v!==0;)o[I]=x+=s[C],I++,C++;v=0,C=0;do(x=c[d+C])!==0&&(T[o[x]++]=v),C++;while(++v<p);for(p=o[S],o[0]=v=0,C=0,A=-1,F=-D,a[0]=0,O=0,j=0;L<=S;L++)for(E=s[L];E--!==0;){for(;L>F+D;){if(A++,F+=D,j=S-F,j=j>D?D:j,(b=1<<(x=L-F))>E+1&&(b-=E+1,I=L,x<j))for(;++x<j&&!((b<<=1)<=s[++I]);)b-=s[I];if(j=1<<x,w[0]+j>MANY)return Z_DATA_ERROR;a[A]=O=w[0],w[0]+=j,A!==0?(o[A]=v,i[0]=x,i[1]=D,x=v>>>F-D,i[2]=O-a[A-1]-x,m.set(i,(a[A-1]+x)*3)):_[0]=O}for(i[1]=L-F,C>=p?i[0]=192:T[C]<f?(i[0]=T[C]<256?0:96,i[2]=T[C++]):(i[0]=y[T[C]-f]+16+64,i[2]=g[T[C++]-f]),b=1<<L-F,x=v>>>F;x<j;x+=b)m.set(i,(O+x)*3);for(x=1<<L-1;v&x;x>>>=1)v^=x;for(v^=x,H=(1<<F)-1;(v&H)!=o[A];)A--,F-=D,H=(1<<F)-1}return q!==0&&S!=1?Z_BUF_ERROR:Z_OK}function u(c){let d;for(t||(t=[],r=[],s=new Int32Array(BMAX+1),i=[],a=new Int32Array(BMAX),o=new Int32Array(BMAX+1)),r.length<c&&(r=[]),d=0;d<c;d++)r[d]=0;for(d=0;d<BMAX+1;d++)s[d]=0;for(d=0;d<3;d++)i[d]=0;a.set(s.subarray(0,BMAX),0),o.set(s.subarray(0,BMAX+1),0)}n.inflate_trees_bits=function(c,d,p,f,g){let y;return u(19),t[0]=0,y=l(c,0,19,19,null,null,p,d,f,t,r),y==Z_DATA_ERROR?g.msg="oversubscribed dynamic bit lengths tree":(y==Z_BUF_ERROR||d[0]===0)&&(g.msg="incomplete dynamic bit lengths tree",y=Z_DATA_ERROR),y},n.inflate_trees_dynamic=function(c,d,p,f,g,y,_,h,m){let w;return u(288),t[0]=0,w=l(p,0,c,257,cplens,cplext,y,f,h,t,r),w!=Z_OK||f[0]===0?(w==Z_DATA_ERROR?m.msg="oversubscribed literal/length tree":w!=Z_MEM_ERROR&&(m.msg="incomplete literal/length tree",w=Z_DATA_ERROR),w):(u(288),w=l(p,c,d,0,cpdist,cpdext,_,g,h,t,r),w!=Z_OK||g[0]===0&&c>257?(w==Z_DATA_ERROR?m.msg="oversubscribed distance tree":w==Z_BUF_ERROR?(m.msg="incomplete distance tree",w=Z_DATA_ERROR):w!=Z_MEM_ERROR&&(m.msg="empty distance tree with lengths",w=Z_DATA_ERROR),w):Z_OK)}}InfTree.inflate_trees_fixed=function(n,t,r,s){return n[0]=fixed_bl,t[0]=fixed_bd,r[0]=fixed_tl,s[0]=fixed_td,Z_OK};const START=0,LEN=1,LENEXT=2,DIST=3,DISTEXT=4,COPY=5,LIT=6,WASH=7,END=8,BADCODE=9;function InfCodes(){const n=this;let t,r=0,s,i=0,a=0,o=0,l=0,u=0,c=0,d=0,p,f=0,g,y=0;function _(h,m,w,T,E,b,S,A){let v,x,L,D,H,C,O,F,I,q,j,G,U,J,W,M;O=A.next_in_index,F=A.avail_in,H=S.bitb,C=S.bitk,I=S.write,q=I<S.read?S.read-I-1:S.end-I,j=inflate_mask[h],G=inflate_mask[m];do{for(;C<20;)F--,H|=(A.read_byte(O++)&255)<<C,C+=8;if(v=H&j,x=w,L=T,M=(L+v)*3,(D=x[M])===0){H>>=x[M+1],C-=x[M+1],S.win[I++]=x[M+2],q--;continue}do{if(H>>=x[M+1],C-=x[M+1],D&16){for(D&=15,U=x[M+2]+(H&inflate_mask[D]),H>>=D,C-=D;C<15;)F--,H|=(A.read_byte(O++)&255)<<C,C+=8;v=H&G,x=E,L=b,M=(L+v)*3,D=x[M];do if(H>>=x[M+1],C-=x[M+1],D&16){for(D&=15;C<D;)F--,H|=(A.read_byte(O++)&255)<<C,C+=8;if(J=x[M+2]+(H&inflate_mask[D]),H>>=D,C-=D,q-=U,I>=J)W=I-J,I-W>0&&2>I-W?(S.win[I++]=S.win[W++],S.win[I++]=S.win[W++],U-=2):(S.win.set(S.win.subarray(W,W+2),I),I+=2,W+=2,U-=2);else{W=I-J;do W+=S.end;while(W<0);if(D=S.end-W,U>D){if(U-=D,I-W>0&&D>I-W)do S.win[I++]=S.win[W++];while(--D!==0);else S.win.set(S.win.subarray(W,W+D),I),I+=D,W+=D,D=0;W=0}}if(I-W>0&&U>I-W)do S.win[I++]=S.win[W++];while(--U!==0);else S.win.set(S.win.subarray(W,W+U),I),I+=U,W+=U,U=0;break}else if(!(D&64))v+=x[M+2],v+=H&inflate_mask[D],M=(L+v)*3,D=x[M];else return A.msg="invalid distance code",U=A.avail_in-F,U=C>>3<U?C>>3:U,F+=U,O-=U,C-=U<<3,S.bitb=H,S.bitk=C,A.avail_in=F,A.total_in+=O-A.next_in_index,A.next_in_index=O,S.write=I,Z_DATA_ERROR;while(!0);break}if(D&64)return D&32?(U=A.avail_in-F,U=C>>3<U?C>>3:U,F+=U,O-=U,C-=U<<3,S.bitb=H,S.bitk=C,A.avail_in=F,A.total_in+=O-A.next_in_index,A.next_in_index=O,S.write=I,Z_STREAM_END):(A.msg="invalid literal/length code",U=A.avail_in-F,U=C>>3<U?C>>3:U,F+=U,O-=U,C-=U<<3,S.bitb=H,S.bitk=C,A.avail_in=F,A.total_in+=O-A.next_in_index,A.next_in_index=O,S.write=I,Z_DATA_ERROR);if(v+=x[M+2],v+=H&inflate_mask[D],M=(L+v)*3,(D=x[M])===0){H>>=x[M+1],C-=x[M+1],S.win[I++]=x[M+2],q--;break}}while(!0)}while(q>=258&&F>=10);return U=A.avail_in-F,U=C>>3<U?C>>3:U,F+=U,O-=U,C-=U<<3,S.bitb=H,S.bitk=C,A.avail_in=F,A.total_in+=O-A.next_in_index,A.next_in_index=O,S.write=I,Z_OK}n.init=function(h,m,w,T,E,b){t=START,c=h,d=m,p=w,f=T,g=E,y=b,s=null},n.proc=function(h,m,w){let T,E,b,S=0,A=0,v=0,x,L,D,H;for(v=m.next_in_index,x=m.avail_in,S=h.bitb,A=h.bitk,L=h.write,D=L<h.read?h.read-L-1:h.end-L;;)switch(t){case START:if(D>=258&&x>=10&&(h.bitb=S,h.bitk=A,m.avail_in=x,m.total_in+=v-m.next_in_index,m.next_in_index=v,h.write=L,w=_(c,d,p,f,g,y,h,m),v=m.next_in_index,x=m.avail_in,S=h.bitb,A=h.bitk,L=h.write,D=L<h.read?h.read-L-1:h.end-L,w!=Z_OK)){t=w==Z_STREAM_END?WASH:BADCODE;break}a=c,s=p,i=f,t=LEN;case LEN:for(T=a;A<T;){if(x!==0)w=Z_OK;else return h.bitb=S,h.bitk=A,m.avail_in=x,m.total_in+=v-m.next_in_index,m.next_in_index=v,h.write=L,h.inflate_flush(m,w);x--,S|=(m.read_byte(v++)&255)<<A,A+=8}if(E=(i+(S&inflate_mask[T]))*3,S>>>=s[E+1],A-=s[E+1],b=s[E],b===0){o=s[E+2],t=LIT;break}if(b&16){l=b&15,r=s[E+2],t=LENEXT;break}if(!(b&64)){a=b,i=E/3+s[E+2];break}if(b&32){t=WASH;break}return t=BADCODE,m.msg="invalid literal/length code",w=Z_DATA_ERROR,h.bitb=S,h.bitk=A,m.avail_in=x,m.total_in+=v-m.next_in_index,m.next_in_index=v,h.write=L,h.inflate_flush(m,w);case LENEXT:for(T=l;A<T;){if(x!==0)w=Z_OK;else return h.bitb=S,h.bitk=A,m.avail_in=x,m.total_in+=v-m.next_in_index,m.next_in_index=v,h.write=L,h.inflate_flush(m,w);x--,S|=(m.read_byte(v++)&255)<<A,A+=8}r+=S&inflate_mask[T],S>>=T,A-=T,a=d,s=g,i=y,t=DIST;case DIST:for(T=a;A<T;){if(x!==0)w=Z_OK;else return h.bitb=S,h.bitk=A,m.avail_in=x,m.total_in+=v-m.next_in_index,m.next_in_index=v,h.write=L,h.inflate_flush(m,w);x--,S|=(m.read_byte(v++)&255)<<A,A+=8}if(E=(i+(S&inflate_mask[T]))*3,S>>=s[E+1],A-=s[E+1],b=s[E],b&16){l=b&15,u=s[E+2],t=DISTEXT;break}if(!(b&64)){a=b,i=E/3+s[E+2];break}return t=BADCODE,m.msg="invalid distance code",w=Z_DATA_ERROR,h.bitb=S,h.bitk=A,m.avail_in=x,m.total_in+=v-m.next_in_index,m.next_in_index=v,h.write=L,h.inflate_flush(m,w);case DISTEXT:for(T=l;A<T;){if(x!==0)w=Z_OK;else return h.bitb=S,h.bitk=A,m.avail_in=x,m.total_in+=v-m.next_in_index,m.next_in_index=v,h.write=L,h.inflate_flush(m,w);x--,S|=(m.read_byte(v++)&255)<<A,A+=8}u+=S&inflate_mask[T],S>>=T,A-=T,t=COPY;case COPY:for(H=L-u;H<0;)H+=h.end;for(;r!==0;){if(D===0&&(L==h.end&&h.read!==0&&(L=0,D=L<h.read?h.read-L-1:h.end-L),D===0&&(h.write=L,w=h.inflate_flush(m,w),L=h.write,D=L<h.read?h.read-L-1:h.end-L,L==h.end&&h.read!==0&&(L=0,D=L<h.read?h.read-L-1:h.end-L),D===0)))return h.bitb=S,h.bitk=A,m.avail_in=x,m.total_in+=v-m.next_in_index,m.next_in_index=v,h.write=L,h.inflate_flush(m,w);h.win[L++]=h.win[H++],D--,H==h.end&&(H=0),r--}t=START;break;case LIT:if(D===0&&(L==h.end&&h.read!==0&&(L=0,D=L<h.read?h.read-L-1:h.end-L),D===0&&(h.write=L,w=h.inflate_flush(m,w),L=h.write,D=L<h.read?h.read-L-1:h.end-L,L==h.end&&h.read!==0&&(L=0,D=L<h.read?h.read-L-1:h.end-L),D===0)))return h.bitb=S,h.bitk=A,m.avail_in=x,m.total_in+=v-m.next_in_index,m.next_in_index=v,h.write=L,h.inflate_flush(m,w);w=Z_OK,h.win[L++]=o,D--,t=START;break;case WASH:if(A>7&&(A-=8,x++,v--),h.write=L,w=h.inflate_flush(m,w),L=h.write,D=L<h.read?h.read-L-1:h.end-L,h.read!=h.write)return h.bitb=S,h.bitk=A,m.avail_in=x,m.total_in+=v-m.next_in_index,m.next_in_index=v,h.write=L,h.inflate_flush(m,w);t=END;case END:return w=Z_STREAM_END,h.bitb=S,h.bitk=A,m.avail_in=x,m.total_in+=v-m.next_in_index,m.next_in_index=v,h.write=L,h.inflate_flush(m,w);case BADCODE:return w=Z_DATA_ERROR,h.bitb=S,h.bitk=A,m.avail_in=x,m.total_in+=v-m.next_in_index,m.next_in_index=v,h.write=L,h.inflate_flush(m,w);default:return w=Z_STREAM_ERROR,h.bitb=S,h.bitk=A,m.avail_in=x,m.total_in+=v-m.next_in_index,m.next_in_index=v,h.write=L,h.inflate_flush(m,w)}},n.free=function(){}}const border=[16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15],TYPE=0,LENS=1,STORED=2,TABLE=3,BTREE=4,DTREE=5,CODES=6,DRY=7,DONELOCKS=8,BADBLOCKS=9;function InfBlocks(n,t){const r=this;let s=TYPE,i=0,a=0,o=0,l;const u=[0],c=[0],d=new InfCodes;let p=0,f=new Int32Array(MANY*3);const g=0,y=new InfTree;r.bitk=0,r.bitb=0,r.win=new Uint8Array(t),r.end=t,r.read=0,r.write=0,r.reset=function(_,h){h&&(h[0]=g),s==CODES&&d.free(_),s=TYPE,r.bitk=0,r.bitb=0,r.read=r.write=0},r.reset(n,null),r.inflate_flush=function(_,h){let m,w,T;return w=_.next_out_index,T=r.read,m=(T<=r.write?r.write:r.end)-T,m>_.avail_out&&(m=_.avail_out),m!==0&&h==Z_BUF_ERROR&&(h=Z_OK),_.avail_out-=m,_.total_out+=m,_.next_out.set(r.win.subarray(T,T+m),w),w+=m,T+=m,T==r.end&&(T=0,r.write==r.end&&(r.write=0),m=r.write-T,m>_.avail_out&&(m=_.avail_out),m!==0&&h==Z_BUF_ERROR&&(h=Z_OK),_.avail_out-=m,_.total_out+=m,_.next_out.set(r.win.subarray(T,T+m),w),w+=m,T+=m),_.next_out_index=w,r.read=T,h},r.proc=function(_,h){let m,w,T,E,b,S,A,v;for(E=_.next_in_index,b=_.avail_in,w=r.bitb,T=r.bitk,S=r.write,A=S<r.read?r.read-S-1:r.end-S;;){let x,L,D,H,C,O,F,I;switch(s){case TYPE:for(;T<3;){if(b!==0)h=Z_OK;else return r.bitb=w,r.bitk=T,_.avail_in=b,_.total_in+=E-_.next_in_index,_.next_in_index=E,r.write=S,r.inflate_flush(_,h);b--,w|=(_.read_byte(E++)&255)<<T,T+=8}switch(m=w&7,p=m&1,m>>>1){case 0:w>>>=3,T-=3,m=T&7,w>>>=m,T-=m,s=LENS;break;case 1:x=[],L=[],D=[[]],H=[[]],InfTree.inflate_trees_fixed(x,L,D,H),d.init(x[0],L[0],D[0],0,H[0],0),w>>>=3,T-=3,s=CODES;break;case 2:w>>>=3,T-=3,s=TABLE;break;case 3:return w>>>=3,T-=3,s=BADBLOCKS,_.msg="invalid block type",h=Z_DATA_ERROR,r.bitb=w,r.bitk=T,_.avail_in=b,_.total_in+=E-_.next_in_index,_.next_in_index=E,r.write=S,r.inflate_flush(_,h)}break;case LENS:for(;T<32;){if(b!==0)h=Z_OK;else return r.bitb=w,r.bitk=T,_.avail_in=b,_.total_in+=E-_.next_in_index,_.next_in_index=E,r.write=S,r.inflate_flush(_,h);b--,w|=(_.read_byte(E++)&255)<<T,T+=8}if((~w>>>16&65535)!=(w&65535))return s=BADBLOCKS,_.msg="invalid stored block lengths",h=Z_DATA_ERROR,r.bitb=w,r.bitk=T,_.avail_in=b,_.total_in+=E-_.next_in_index,_.next_in_index=E,r.write=S,r.inflate_flush(_,h);i=w&65535,w=T=0,s=i!==0?STORED:p!==0?DRY:TYPE;break;case STORED:if(b===0||A===0&&(S==r.end&&r.read!==0&&(S=0,A=S<r.read?r.read-S-1:r.end-S),A===0&&(r.write=S,h=r.inflate_flush(_,h),S=r.write,A=S<r.read?r.read-S-1:r.end-S,S==r.end&&r.read!==0&&(S=0,A=S<r.read?r.read-S-1:r.end-S),A===0)))return r.bitb=w,r.bitk=T,_.avail_in=b,_.total_in+=E-_.next_in_index,_.next_in_index=E,r.write=S,r.inflate_flush(_,h);if(h=Z_OK,m=i,m>b&&(m=b),m>A&&(m=A),r.win.set(_.read_buf(E,m),S),E+=m,b-=m,S+=m,A-=m,(i-=m)!==0)break;s=p!==0?DRY:TYPE;break;case TABLE:for(;T<14;){if(b!==0)h=Z_OK;else return r.bitb=w,r.bitk=T,_.avail_in=b,_.total_in+=E-_.next_in_index,_.next_in_index=E,r.write=S,r.inflate_flush(_,h);b--,w|=(_.read_byte(E++)&255)<<T,T+=8}if(a=m=w&16383,(m&31)>29||(m>>5&31)>29)return s=BADBLOCKS,_.msg="too many length or distance symbols",h=Z_DATA_ERROR,r.bitb=w,r.bitk=T,_.avail_in=b,_.total_in+=E-_.next_in_index,_.next_in_index=E,r.write=S,r.inflate_flush(_,h);if(m=258+(m&31)+(m>>5&31),!l||l.length<m)l=[];else for(v=0;v<m;v++)l[v]=0;w>>>=14,T-=14,o=0,s=BTREE;case BTREE:for(;o<4+(a>>>10);){for(;T<3;){if(b!==0)h=Z_OK;else return r.bitb=w,r.bitk=T,_.avail_in=b,_.total_in+=E-_.next_in_index,_.next_in_index=E,r.write=S,r.inflate_flush(_,h);b--,w|=(_.read_byte(E++)&255)<<T,T+=8}l[border[o++]]=w&7,w>>>=3,T-=3}for(;o<19;)l[border[o++]]=0;if(u[0]=7,m=y.inflate_trees_bits(l,u,c,f,_),m!=Z_OK)return h=m,h==Z_DATA_ERROR&&(l=null,s=BADBLOCKS),r.bitb=w,r.bitk=T,_.avail_in=b,_.total_in+=E-_.next_in_index,_.next_in_index=E,r.write=S,r.inflate_flush(_,h);o=0,s=DTREE;case DTREE:for(;m=a,!(o>=258+(m&31)+(m>>5&31));){let q,j;for(m=u[0];T<m;){if(b!==0)h=Z_OK;else return r.bitb=w,r.bitk=T,_.avail_in=b,_.total_in+=E-_.next_in_index,_.next_in_index=E,r.write=S,r.inflate_flush(_,h);b--,w|=(_.read_byte(E++)&255)<<T,T+=8}if(m=f[(c[0]+(w&inflate_mask[m]))*3+1],j=f[(c[0]+(w&inflate_mask[m]))*3+2],j<16)w>>>=m,T-=m,l[o++]=j;else{for(v=j==18?7:j-14,q=j==18?11:3;T<m+v;){if(b!==0)h=Z_OK;else return r.bitb=w,r.bitk=T,_.avail_in=b,_.total_in+=E-_.next_in_index,_.next_in_index=E,r.write=S,r.inflate_flush(_,h);b--,w|=(_.read_byte(E++)&255)<<T,T+=8}if(w>>>=m,T-=m,q+=w&inflate_mask[v],w>>>=v,T-=v,v=o,m=a,v+q>258+(m&31)+(m>>5&31)||j==16&&v<1)return l=null,s=BADBLOCKS,_.msg="invalid bit length repeat",h=Z_DATA_ERROR,r.bitb=w,r.bitk=T,_.avail_in=b,_.total_in+=E-_.next_in_index,_.next_in_index=E,r.write=S,r.inflate_flush(_,h);j=j==16?l[v-1]:0;do l[v++]=j;while(--q!==0);o=v}}if(c[0]=-1,C=[],O=[],F=[],I=[],C[0]=9,O[0]=6,m=a,m=y.inflate_trees_dynamic(257+(m&31),1+(m>>5&31),l,C,O,F,I,f,_),m!=Z_OK)return m==Z_DATA_ERROR&&(l=null,s=BADBLOCKS),h=m,r.bitb=w,r.bitk=T,_.avail_in=b,_.total_in+=E-_.next_in_index,_.next_in_index=E,r.write=S,r.inflate_flush(_,h);d.init(C[0],O[0],f,F[0],f,I[0]),s=CODES;case CODES:if(r.bitb=w,r.bitk=T,_.avail_in=b,_.total_in+=E-_.next_in_index,_.next_in_index=E,r.write=S,(h=d.proc(r,_,h))!=Z_STREAM_END)return r.inflate_flush(_,h);if(h=Z_OK,d.free(_),E=_.next_in_index,b=_.avail_in,w=r.bitb,T=r.bitk,S=r.write,A=S<r.read?r.read-S-1:r.end-S,p===0){s=TYPE;break}s=DRY;case DRY:if(r.write=S,h=r.inflate_flush(_,h),S=r.write,A=S<r.read?r.read-S-1:r.end-S,r.read!=r.write)return r.bitb=w,r.bitk=T,_.avail_in=b,_.total_in+=E-_.next_in_index,_.next_in_index=E,r.write=S,r.inflate_flush(_,h);s=DONELOCKS;case DONELOCKS:return h=Z_STREAM_END,r.bitb=w,r.bitk=T,_.avail_in=b,_.total_in+=E-_.next_in_index,_.next_in_index=E,r.write=S,r.inflate_flush(_,h);case BADBLOCKS:return h=Z_DATA_ERROR,r.bitb=w,r.bitk=T,_.avail_in=b,_.total_in+=E-_.next_in_index,_.next_in_index=E,r.write=S,r.inflate_flush(_,h);default:return h=Z_STREAM_ERROR,r.bitb=w,r.bitk=T,_.avail_in=b,_.total_in+=E-_.next_in_index,_.next_in_index=E,r.write=S,r.inflate_flush(_,h)}}},r.free=function(_){r.reset(_,null),r.win=null,f=null},r.set_dictionary=function(_,h,m){r.win.set(_.subarray(h,h+m),0),r.read=r.write=m},r.sync_point=function(){return s==LENS?1:0}}const PRESET_DICT=32,Z_DEFLATED=8,METHOD=0,FLAG=1,DICT4=2,DICT3=3,DICT2=4,DICT1=5,DICT0=6,BLOCKS=7,DONE=12,BAD=13,mark=[0,0,255,255];function Inflate(){const n=this;n.mode=0,n.method=0,n.was=[0],n.need=0,n.marker=0,n.wbits=0;function t(r){return!r||!r.istate?Z_STREAM_ERROR:(r.total_in=r.total_out=0,r.msg=null,r.istate.mode=BLOCKS,r.istate.blocks.reset(r,null),Z_OK)}n.inflateEnd=function(r){return n.blocks&&n.blocks.free(r),n.blocks=null,Z_OK},n.inflateInit=function(r,s){return r.msg=null,n.blocks=null,s<8||s>15?(n.inflateEnd(r),Z_STREAM_ERROR):(n.wbits=s,r.istate.blocks=new InfBlocks(r,1<<s),t(r),Z_OK)},n.inflate=function(r,s){let i,a;if(!r||!r.istate||!r.next_in)return Z_STREAM_ERROR;const o=r.istate;for(s=s==Z_FINISH?Z_BUF_ERROR:Z_OK,i=Z_BUF_ERROR;;)switch(o.mode){case METHOD:if(r.avail_in===0)return i;if(i=s,r.avail_in--,r.total_in++,((o.method=r.read_byte(r.next_in_index++))&15)!=Z_DEFLATED){o.mode=BAD,r.msg="unknown compression method",o.marker=5;break}if((o.method>>4)+8>o.wbits){o.mode=BAD,r.msg="invalid win size",o.marker=5;break}o.mode=FLAG;case FLAG:if(r.avail_in===0)return i;if(i=s,r.avail_in--,r.total_in++,a=r.read_byte(r.next_in_index++)&255,((o.method<<8)+a)%31!==0){o.mode=BAD,r.msg="incorrect header check",o.marker=5;break}if(!(a&PRESET_DICT)){o.mode=BLOCKS;break}o.mode=DICT4;case DICT4:if(r.avail_in===0)return i;i=s,r.avail_in--,r.total_in++,o.need=(r.read_byte(r.next_in_index++)&255)<<24&4278190080,o.mode=DICT3;case DICT3:if(r.avail_in===0)return i;i=s,r.avail_in--,r.total_in++,o.need+=(r.read_byte(r.next_in_index++)&255)<<16&16711680,o.mode=DICT2;case DICT2:if(r.avail_in===0)return i;i=s,r.avail_in--,r.total_in++,o.need+=(r.read_byte(r.next_in_index++)&255)<<8&65280,o.mode=DICT1;case DICT1:return r.avail_in===0?i:(i=s,r.avail_in--,r.total_in++,o.need+=r.read_byte(r.next_in_index++)&255,o.mode=DICT0,Z_NEED_DICT);case DICT0:return o.mode=BAD,r.msg="need dictionary",o.marker=0,Z_STREAM_ERROR;case BLOCKS:if(i=o.blocks.proc(r,i),i==Z_DATA_ERROR){o.mode=BAD,o.marker=0;break}if(i==Z_OK&&(i=s),i!=Z_STREAM_END)return i;i=s,o.blocks.reset(r,o.was),o.mode=DONE;case DONE:return r.avail_in=0,Z_STREAM_END;case BAD:return Z_DATA_ERROR;default:return Z_STREAM_ERROR}},n.inflateSetDictionary=function(r,s,i){let a=0,o=i;if(!r||!r.istate||r.istate.mode!=DICT0)return Z_STREAM_ERROR;const l=r.istate;return o>=1<<l.wbits&&(o=(1<<l.wbits)-1,a=i-o),l.blocks.set_dictionary(s,a,o),l.mode=BLOCKS,Z_OK},n.inflateSync=function(r){let s,i,a,o,l;if(!r||!r.istate)return Z_STREAM_ERROR;const u=r.istate;if(u.mode!=BAD&&(u.mode=BAD,u.marker=0),(s=r.avail_in)===0)return Z_BUF_ERROR;for(i=r.next_in_index,a=u.marker;s!==0&&a<4;)r.read_byte(i)==mark[a]?a++:r.read_byte(i)!==0?a=0:a=4-a,i++,s--;return r.total_in+=i-r.next_in_index,r.next_in_index=i,r.avail_in=s,u.marker=a,a!=4?Z_DATA_ERROR:(o=r.total_in,l=r.total_out,t(r),r.total_in=o,r.total_out=l,u.mode=BLOCKS,Z_OK)},n.inflateSyncPoint=function(r){return!r||!r.istate||!r.istate.blocks?Z_STREAM_ERROR:r.istate.blocks.sync_point()}}function ZStream(){}ZStream.prototype={inflateInit(n){const t=this;return t.istate=new Inflate,n||(n=MAX_BITS),t.istate.inflateInit(t,n)},inflate(n){const t=this;return t.istate?t.istate.inflate(t,n):Z_STREAM_ERROR},inflateEnd(){const n=this;if(!n.istate)return Z_STREAM_ERROR;const t=n.istate.inflateEnd(n);return n.istate=null,t},inflateSync(){const n=this;return n.istate?n.istate.inflateSync(n):Z_STREAM_ERROR},inflateSetDictionary(n,t){const r=this;return r.istate?r.istate.inflateSetDictionary(r,n,t):Z_STREAM_ERROR},read_byte(n){return this.next_in[n]},read_buf(n,t){return this.next_in.subarray(n,n+t)}};function ZipInflate(n){const t=this,r=new ZStream,s=n&&n.chunkSize?Math.floor(n.chunkSize*2):128*1024,i=Z_NO_FLUSH,a=new Uint8Array(s);let o=!1;r.inflateInit(),r.next_out=a,t.append=function(l,u){const c=[];let d,p,f=0,g=0,y=0;if(l.length!==0){r.next_in_index=0,r.next_in=l,r.avail_in=l.length;do{if(r.next_out_index=0,r.avail_out=s,r.avail_in===0&&!o&&(r.next_in_index=0,o=!0),d=r.inflate(i),o&&d===Z_BUF_ERROR){if(r.avail_in!==0)throw new Error("inflating: bad input")}else if(d!==Z_OK&&d!==Z_STREAM_END)throw new Error("inflating: "+r.msg);if((o||d===Z_STREAM_END)&&r.avail_in===l.length)throw new Error("inflating: bad input");r.next_out_index&&(r.next_out_index===s?c.push(new Uint8Array(a)):c.push(a.subarray(0,r.next_out_index))),y+=r.next_out_index,u&&r.next_in_index>0&&r.next_in_index!=f&&(u(r.next_in_index),f=r.next_in_index)}while(r.avail_in>0||r.avail_out===0);return c.length>1?(p=new Uint8Array(y),c.forEach(function(_){p.set(_,g),g+=_.length})):p=c[0]?new Uint8Array(c[0]):new Uint8Array,p}},t.flush=function(){r.inflateEnd()}}const UNDEFINED_VALUE=void 0,UNDEFINED_TYPE="undefined",FUNCTION_TYPE="function";class StreamAdapter{constructor(t){return class extends TransformStream{constructor(r,s){const i=new t(s);super({transform(a,o){o.enqueue(i.append(a))},flush(a){const o=i.flush();o&&a.enqueue(o)}})}}}}let maxWorkers=2;try{typeof navigator!=UNDEFINED_TYPE&&navigator.hardwareConcurrency&&(maxWorkers=navigator.hardwareConcurrency)}catch(n){}const DEFAULT_CONFIGURATION={chunkSize:512*1024,maxWorkers,terminateWorkerTimeout:5e3,useWebWorkers:!0,useCompressionStream:!0,workerScripts:UNDEFINED_VALUE,CompressionStreamNative:typeof CompressionStream!=UNDEFINED_TYPE&&CompressionStream,DecompressionStreamNative:typeof DecompressionStream!=UNDEFINED_TYPE&&DecompressionStream},config=Object.assign({},DEFAULT_CONFIGURATION);function configure(n){const{baseURL:t,chunkSize:r,maxWorkers:s,terminateWorkerTimeout:i,useCompressionStream:a,useWebWorkers:o,Deflate:l,Inflate:u,CompressionStream:c,DecompressionStream:d,workerScripts:p}=n;if(setIfDefined("baseURL",t),setIfDefined("chunkSize",r),setIfDefined("maxWorkers",s),setIfDefined("terminateWorkerTimeout",i),setIfDefined("useCompressionStream",a),setIfDefined("useWebWorkers",o),l&&(config.CompressionStream=new StreamAdapter(l)),u&&(config.DecompressionStream=new StreamAdapter(u)),setIfDefined("CompressionStream",c),setIfDefined("DecompressionStream",d),p!==UNDEFINED_VALUE){const{deflate:f,inflate:g}=p;if((f||g)&&(config.workerScripts||(config.workerScripts={})),f){if(!Array.isArray(f))throw new Error("workerScripts.deflate must be an array");config.workerScripts.deflate=f}if(g){if(!Array.isArray(g))throw new Error("workerScripts.inflate must be an array");config.workerScripts.inflate=g}}}function setIfDefined(n,t){t!==UNDEFINED_VALUE&&(config[n]=t)}const table$1={application:{"andrew-inset":"ez",annodex:"anx","atom+xml":"atom","atomcat+xml":"atomcat","atomserv+xml":"atomsrv",bbolin:"lin","cu-seeme":"cu","davmount+xml":"davmount",dsptype:"tsp",ecmascript:["es","ecma"],futuresplash:"spl",hta:"hta","java-archive":"jar","java-serialized-object":"ser","java-vm":"class",m3g:"m3g","mac-binhex40":"hqx",mathematica:["nb","ma","mb"],msaccess:"mdb",msword:["doc","dot","wiz"],mxf:"mxf",oda:"oda",ogg:"ogx",pdf:"pdf","pgp-keys":"key","pgp-signature":["asc","sig"],"pics-rules":"prf",postscript:["ps","ai","eps","epsi","epsf","eps2","eps3"],rar:"rar","rdf+xml":"rdf","rss+xml":"rss",rtf:"rtf","xhtml+xml":["xhtml","xht"],xml:["xml","xsl","xsd","xpdl"],"xspf+xml":"xspf",zip:"zip","vnd.android.package-archive":"apk","vnd.cinderella":"cdy","vnd.google-earth.kml+xml":"kml","vnd.google-earth.kmz":"kmz","vnd.mozilla.xul+xml":"xul","vnd.ms-excel":["xls","xlb","xlt","xlm","xla","xlc","xlw"],"vnd.ms-pki.seccat":"cat","vnd.ms-pki.stl":"stl","vnd.ms-powerpoint":["ppt","pps","pot","ppa","pwz"],"vnd.oasis.opendocument.chart":"odc","vnd.oasis.opendocument.database":"odb","vnd.oasis.opendocument.formula":"odf","vnd.oasis.opendocument.graphics":"odg","vnd.oasis.opendocument.graphics-template":"otg","vnd.oasis.opendocument.image":"odi","vnd.oasis.opendocument.presentation":"odp","vnd.oasis.opendocument.presentation-template":"otp","vnd.oasis.opendocument.spreadsheet":"ods","vnd.oasis.opendocument.spreadsheet-template":"ots","vnd.oasis.opendocument.text":"odt","vnd.oasis.opendocument.text-master":["odm","otm"],"vnd.oasis.opendocument.text-template":"ott","vnd.oasis.opendocument.text-web":"oth","vnd.openxmlformats-officedocument.spreadsheetml.sheet":"xlsx","vnd.openxmlformats-officedocument.spreadsheetml.template":"xltx","vnd.openxmlformats-officedocument.presentationml.presentation":"pptx","vnd.openxmlformats-officedocument.presentationml.slideshow":"ppsx","vnd.openxmlformats-officedocument.presentationml.template":"potx","vnd.openxmlformats-officedocument.wordprocessingml.document":"docx","vnd.openxmlformats-officedocument.wordprocessingml.template":"dotx","vnd.smaf":"mmf","vnd.stardivision.calc":"sdc","vnd.stardivision.chart":"sds","vnd.stardivision.draw":"sda","vnd.stardivision.impress":"sdd","vnd.stardivision.math":["sdf","smf"],"vnd.stardivision.writer":["sdw","vor"],"vnd.stardivision.writer-global":"sgl","vnd.sun.xml.calc":"sxc","vnd.sun.xml.calc.template":"stc","vnd.sun.xml.draw":"sxd","vnd.sun.xml.draw.template":"std","vnd.sun.xml.impress":"sxi","vnd.sun.xml.impress.template":"sti","vnd.sun.xml.math":"sxm","vnd.sun.xml.writer":"sxw","vnd.sun.xml.writer.global":"sxg","vnd.sun.xml.writer.template":"stw","vnd.symbian.install":["sis","sisx"],"vnd.visio":["vsd","vst","vss","vsw","vsdx","vssx","vstx","vssm","vstm"],"vnd.wap.wbxml":"wbxml","vnd.wap.wmlc":"wmlc","vnd.wap.wmlscriptc":"wmlsc","vnd.wordperfect":"wpd","vnd.wordperfect5.1":"wp5","x-123":"wk","x-7z-compressed":"7z","x-abiword":"abw","x-apple-diskimage":"dmg","x-bcpio":"bcpio","x-bittorrent":"torrent","x-cbr":["cbr","cba","cbt","cb7"],"x-cbz":"cbz","x-cdf":["cdf","cda"],"x-cdlink":"vcd","x-chess-pgn":"pgn","x-cpio":"cpio","x-csh":"csh","x-director":["dir","dxr","cst","cct","cxt","w3d","fgd","swa"],"x-dms":"dms","x-doom":"wad","x-dvi":"dvi","x-httpd-eruby":"rhtml","x-font":"pcf.Z","x-freemind":"mm","x-gnumeric":"gnumeric","x-go-sgf":"sgf","x-graphing-calculator":"gcf","x-gtar":["gtar","taz"],"x-hdf":"hdf","x-httpd-php":["phtml","pht","php"],"x-httpd-php-source":"phps","x-httpd-php3":"php3","x-httpd-php3-preprocessed":"php3p","x-httpd-php4":"php4","x-httpd-php5":"php5","x-ica":"ica","x-info":"info","x-internet-signup":["ins","isp"],"x-iphone":"iii","x-iso9660-image":"iso","x-java-jnlp-file":"jnlp","x-jmol":"jmz","x-killustrator":"kil","x-latex":"latex","x-lyx":"lyx","x-lzx":"lzx","x-maker":["frm","fb","fbdoc"],"x-ms-wmd":"wmd","x-msdos-program":["com","exe","bat","dll"],"x-netcdf":["nc"],"x-ns-proxy-autoconfig":["pac","dat"],"x-nwc":"nwc","x-object":"o","x-oz-application":"oza","x-pkcs7-certreqresp":"p7r","x-python-code":["pyc","pyo"],"x-qgis":["qgs","shp","shx"],"x-quicktimeplayer":"qtl","x-redhat-package-manager":["rpm","rpa"],"x-ruby":"rb","x-sh":"sh","x-shar":"shar","x-shockwave-flash":["swf","swfl"],"x-silverlight":"scr","x-stuffit":"sit","x-sv4cpio":"sv4cpio","x-sv4crc":"sv4crc","x-tar":"tar","x-tex-gf":"gf","x-tex-pk":"pk","x-texinfo":["texinfo","texi"],"x-trash":["~","%","bak","old","sik"],"x-ustar":"ustar","x-wais-source":"src","x-wingz":"wz","x-x509-ca-cert":["crt","der","cer"],"x-xcf":"xcf","x-xfig":"fig","x-xpinstall":"xpi",applixware:"aw","atomsvc+xml":"atomsvc","ccxml+xml":"ccxml","cdmi-capability":"cdmia","cdmi-container":"cdmic","cdmi-domain":"cdmid","cdmi-object":"cdmio","cdmi-queue":"cdmiq","docbook+xml":"dbk","dssc+der":"dssc","dssc+xml":"xdssc","emma+xml":"emma","epub+zip":"epub",exi:"exi","font-tdpfr":"pfr","gml+xml":"gml","gpx+xml":"gpx",gxf:"gxf",hyperstudio:"stk","inkml+xml":["ink","inkml"],ipfix:"ipfix","jsonml+json":"jsonml","lost+xml":"lostxml","mads+xml":"mads",marc:"mrc","marcxml+xml":"mrcx","mathml+xml":["mathml","mml"],mbox:"mbox","mediaservercontrol+xml":"mscml","metalink+xml":"metalink","metalink4+xml":"meta4","mets+xml":"mets","mods+xml":"mods",mp21:["m21","mp21"],mp4:"mp4s","oebps-package+xml":"opf","omdoc+xml":"omdoc",onenote:["onetoc","onetoc2","onetmp","onepkg"],oxps:"oxps","patch-ops-error+xml":"xer","pgp-encrypted":"pgp",pkcs10:"p10","pkcs7-mime":["p7m","p7c"],"pkcs7-signature":"p7s",pkcs8:"p8","pkix-attr-cert":"ac","pkix-crl":"crl","pkix-pkipath":"pkipath",pkixcmp:"pki","pls+xml":"pls","prs.cww":"cww","pskc+xml":"pskcxml","reginfo+xml":"rif","relax-ng-compact-syntax":"rnc","resource-lists+xml":"rl","resource-lists-diff+xml":"rld","rls-services+xml":"rs","rpki-ghostbusters":"gbr","rpki-manifest":"mft","rpki-roa":"roa","rsd+xml":"rsd","sbml+xml":"sbml","scvp-cv-request":"scq","scvp-cv-response":"scs","scvp-vp-request":"spq","scvp-vp-response":"spp",sdp:"sdp","set-payment-initiation":"setpay","set-registration-initiation":"setreg","shf+xml":"shf","sparql-query":"rq","sparql-results+xml":"srx",srgs:"gram","srgs+xml":"grxml","sru+xml":"sru","ssdl+xml":"ssdl","ssml+xml":"ssml","tei+xml":["tei","teicorpus"],"thraud+xml":"tfi","timestamped-data":"tsd","vnd.3gpp.pic-bw-large":"plb","vnd.3gpp.pic-bw-small":"psb","vnd.3gpp.pic-bw-var":"pvb","vnd.3gpp2.tcap":"tcap","vnd.3m.post-it-notes":"pwn","vnd.accpac.simply.aso":"aso","vnd.accpac.simply.imp":"imp","vnd.acucobol":"acu","vnd.acucorp":["atc","acutc"],"vnd.adobe.air-application-installer-package+zip":"air","vnd.adobe.formscentral.fcdt":"fcdt","vnd.adobe.fxp":["fxp","fxpl"],"vnd.adobe.xdp+xml":"xdp","vnd.adobe.xfdf":"xfdf","vnd.ahead.space":"ahead","vnd.airzip.filesecure.azf":"azf","vnd.airzip.filesecure.azs":"azs","vnd.amazon.ebook":"azw","vnd.americandynamics.acc":"acc","vnd.amiga.ami":"ami","vnd.anser-web-certificate-issue-initiation":"cii","vnd.anser-web-funds-transfer-initiation":"fti","vnd.antix.game-component":"atx","vnd.apple.installer+xml":"mpkg","vnd.apple.mpegurl":"m3u8","vnd.aristanetworks.swi":"swi","vnd.astraea-software.iota":"iota","vnd.audiograph":"aep","vnd.blueice.multipass":"mpm","vnd.bmi":"bmi","vnd.businessobjects":"rep","vnd.chemdraw+xml":"cdxml","vnd.chipnuts.karaoke-mmd":"mmd","vnd.claymore":"cla","vnd.cloanto.rp9":"rp9","vnd.clonk.c4group":["c4g","c4d","c4f","c4p","c4u"],"vnd.cluetrust.cartomobile-config":"c11amc","vnd.cluetrust.cartomobile-config-pkg":"c11amz","vnd.commonspace":"csp","vnd.contact.cmsg":"cdbcmsg","vnd.cosmocaller":"cmc","vnd.crick.clicker":"clkx","vnd.crick.clicker.keyboard":"clkk","vnd.crick.clicker.palette":"clkp","vnd.crick.clicker.template":"clkt","vnd.crick.clicker.wordbank":"clkw","vnd.criticaltools.wbs+xml":"wbs","vnd.ctc-posml":"pml","vnd.cups-ppd":"ppd","vnd.curl.car":"car","vnd.curl.pcurl":"pcurl","vnd.dart":"dart","vnd.data-vision.rdz":"rdz","vnd.dece.data":["uvf","uvvf","uvd","uvvd"],"vnd.dece.ttml+xml":["uvt","uvvt"],"vnd.dece.unspecified":["uvx","uvvx"],"vnd.dece.zip":["uvz","uvvz"],"vnd.denovo.fcselayout-link":"fe_launch","vnd.dna":"dna","vnd.dolby.mlp":"mlp","vnd.dpgraph":"dpg","vnd.dreamfactory":"dfac","vnd.ds-keypoint":"kpxx","vnd.dvb.ait":"ait","vnd.dvb.service":"svc","vnd.dynageo":"geo","vnd.ecowin.chart":"mag","vnd.enliven":"nml","vnd.epson.esf":"esf","vnd.epson.msf":"msf","vnd.epson.quickanime":"qam","vnd.epson.salt":"slt","vnd.epson.ssf":"ssf","vnd.eszigno3+xml":["es3","et3"],"vnd.ezpix-album":"ez2","vnd.ezpix-package":"ez3","vnd.fdf":"fdf","vnd.fdsn.mseed":"mseed","vnd.fdsn.seed":["seed","dataless"],"vnd.flographit":"gph","vnd.fluxtime.clip":"ftc","vnd.framemaker":["fm","frame","maker","book"],"vnd.frogans.fnc":"fnc","vnd.frogans.ltf":"ltf","vnd.fsc.weblaunch":"fsc","vnd.fujitsu.oasys":"oas","vnd.fujitsu.oasys2":"oa2","vnd.fujitsu.oasys3":"oa3","vnd.fujitsu.oasysgp":"fg5","vnd.fujitsu.oasysprs":"bh2","vnd.fujixerox.ddd":"ddd","vnd.fujixerox.docuworks":"xdw","vnd.fujixerox.docuworks.binder":"xbd","vnd.fuzzysheet":"fzs","vnd.genomatix.tuxedo":"txd","vnd.geogebra.file":"ggb","vnd.geogebra.tool":"ggt","vnd.geometry-explorer":["gex","gre"],"vnd.geonext":"gxt","vnd.geoplan":"g2w","vnd.geospace":"g3w","vnd.gmx":"gmx","vnd.grafeq":["gqf","gqs"],"vnd.groove-account":"gac","vnd.groove-help":"ghf","vnd.groove-identity-message":"gim","vnd.groove-injector":"grv","vnd.groove-tool-message":"gtm","vnd.groove-tool-template":"tpl","vnd.groove-vcard":"vcg","vnd.hal+xml":"hal","vnd.handheld-entertainment+xml":"zmm","vnd.hbci":"hbci","vnd.hhe.lesson-player":"les","vnd.hp-hpgl":"hpgl","vnd.hp-hpid":"hpid","vnd.hp-hps":"hps","vnd.hp-jlyt":"jlt","vnd.hp-pcl":"pcl","vnd.hp-pclxl":"pclxl","vnd.hydrostatix.sof-data":"sfd-hdstx","vnd.ibm.minipay":"mpy","vnd.ibm.modcap":["afp","listafp","list3820"],"vnd.ibm.rights-management":"irm","vnd.ibm.secure-container":"sc","vnd.iccprofile":["icc","icm"],"vnd.igloader":"igl","vnd.immervision-ivp":"ivp","vnd.immervision-ivu":"ivu","vnd.insors.igm":"igm","vnd.intercon.formnet":["xpw","xpx"],"vnd.intergeo":"i2g","vnd.intu.qbo":"qbo","vnd.intu.qfx":"qfx","vnd.ipunplugged.rcprofile":"rcprofile","vnd.irepository.package+xml":"irp","vnd.is-xpr":"xpr","vnd.isac.fcs":"fcs","vnd.jam":"jam","vnd.jcp.javame.midlet-rms":"rms","vnd.jisp":"jisp","vnd.joost.joda-archive":"joda","vnd.kahootz":["ktz","ktr"],"vnd.kde.karbon":"karbon","vnd.kde.kchart":"chrt","vnd.kde.kformula":"kfo","vnd.kde.kivio":"flw","vnd.kde.kontour":"kon","vnd.kde.kpresenter":["kpr","kpt"],"vnd.kde.kspread":"ksp","vnd.kde.kword":["kwd","kwt"],"vnd.kenameaapp":"htke","vnd.kidspiration":"kia","vnd.kinar":["kne","knp"],"vnd.koan":["skp","skd","skt","skm"],"vnd.kodak-descriptor":"sse","vnd.las.las+xml":"lasxml","vnd.llamagraphics.life-balance.desktop":"lbd","vnd.llamagraphics.life-balance.exchange+xml":"lbe","vnd.lotus-1-2-3":"123","vnd.lotus-approach":"apr","vnd.lotus-freelance":"pre","vnd.lotus-notes":"nsf","vnd.lotus-organizer":"org","vnd.lotus-screencam":"scm","vnd.lotus-wordpro":"lwp","vnd.macports.portpkg":"portpkg","vnd.mcd":"mcd","vnd.medcalcdata":"mc1","vnd.mediastation.cdkey":"cdkey","vnd.mfer":"mwf","vnd.mfmp":"mfm","vnd.micrografx.flo":"flo","vnd.micrografx.igx":"igx","vnd.mif":"mif","vnd.mobius.daf":"daf","vnd.mobius.dis":"dis","vnd.mobius.mbk":"mbk","vnd.mobius.mqy":"mqy","vnd.mobius.msl":"msl","vnd.mobius.plc":"plc","vnd.mobius.txf":"txf","vnd.mophun.application":"mpn","vnd.mophun.certificate":"mpc","vnd.ms-artgalry":"cil","vnd.ms-cab-compressed":"cab","vnd.ms-excel.addin.macroenabled.12":"xlam","vnd.ms-excel.sheet.binary.macroenabled.12":"xlsb","vnd.ms-excel.sheet.macroenabled.12":"xlsm","vnd.ms-excel.template.macroenabled.12":"xltm","vnd.ms-fontobject":"eot","vnd.ms-htmlhelp":"chm","vnd.ms-ims":"ims","vnd.ms-lrm":"lrm","vnd.ms-officetheme":"thmx","vnd.ms-powerpoint.addin.macroenabled.12":"ppam","vnd.ms-powerpoint.presentation.macroenabled.12":"pptm","vnd.ms-powerpoint.slide.macroenabled.12":"sldm","vnd.ms-powerpoint.slideshow.macroenabled.12":"ppsm","vnd.ms-powerpoint.template.macroenabled.12":"potm","vnd.ms-project":["mpp","mpt"],"vnd.ms-word.document.macroenabled.12":"docm","vnd.ms-word.template.macroenabled.12":"dotm","vnd.ms-works":["wps","wks","wcm","wdb"],"vnd.ms-wpl":"wpl","vnd.ms-xpsdocument":"xps","vnd.mseq":"mseq","vnd.musician":"mus","vnd.muvee.style":"msty","vnd.mynfc":"taglet","vnd.neurolanguage.nlu":"nlu","vnd.nitf":["ntf","nitf"],"vnd.noblenet-directory":"nnd","vnd.noblenet-sealer":"nns","vnd.noblenet-web":"nnw","vnd.nokia.n-gage.data":"ngdat","vnd.nokia.n-gage.symbian.install":"n-gage","vnd.nokia.radio-preset":"rpst","vnd.nokia.radio-presets":"rpss","vnd.novadigm.edm":"edm","vnd.novadigm.edx":"edx","vnd.novadigm.ext":"ext","vnd.oasis.opendocument.chart-template":"otc","vnd.oasis.opendocument.formula-template":"odft","vnd.oasis.opendocument.image-template":"oti","vnd.olpc-sugar":"xo","vnd.oma.dd2+xml":"dd2","vnd.openofficeorg.extension":"oxt","vnd.openxmlformats-officedocument.presentationml.slide":"sldx","vnd.osgeo.mapguide.package":"mgp","vnd.osgi.dp":"dp","vnd.osgi.subsystem":"esa","vnd.palm":["pdb","pqa","oprc"],"vnd.pawaafile":"paw","vnd.pg.format":"str","vnd.pg.osasli":"ei6","vnd.picsel":"efif","vnd.pmi.widget":"wg","vnd.pocketlearn":"plf","vnd.powerbuilder6":"pbd","vnd.previewsystems.box":"box","vnd.proteus.magazine":"mgz","vnd.publishare-delta-tree":"qps","vnd.pvi.ptid1":"ptid","vnd.quark.quarkxpress":["qxd","qxt","qwd","qwt","qxl","qxb"],"vnd.realvnc.bed":"bed","vnd.recordare.musicxml":"mxl","vnd.recordare.musicxml+xml":"musicxml","vnd.rig.cryptonote":"cryptonote","vnd.rn-realmedia":"rm","vnd.rn-realmedia-vbr":"rmvb","vnd.route66.link66+xml":"link66","vnd.sailingtracker.track":"st","vnd.seemail":"see","vnd.sema":"sema","vnd.semd":"semd","vnd.semf":"semf","vnd.shana.informed.formdata":"ifm","vnd.shana.informed.formtemplate":"itp","vnd.shana.informed.interchange":"iif","vnd.shana.informed.package":"ipk","vnd.simtech-mindmapper":["twd","twds"],"vnd.smart.teacher":"teacher","vnd.solent.sdkm+xml":["sdkm","sdkd"],"vnd.spotfire.dxp":"dxp","vnd.spotfire.sfs":"sfs","vnd.stepmania.package":"smzip","vnd.stepmania.stepchart":"sm","vnd.sus-calendar":["sus","susp"],"vnd.svd":"svd","vnd.syncml+xml":"xsm","vnd.syncml.dm+wbxml":"bdm","vnd.syncml.dm+xml":"xdm","vnd.tao.intent-module-archive":"tao","vnd.tcpdump.pcap":["pcap","cap","dmp"],"vnd.tmobile-livetv":"tmo","vnd.trid.tpt":"tpt","vnd.triscape.mxs":"mxs","vnd.trueapp":"tra","vnd.ufdl":["ufd","ufdl"],"vnd.uiq.theme":"utz","vnd.umajin":"umj","vnd.unity":"unityweb","vnd.uoml+xml":"uoml","vnd.vcx":"vcx","vnd.visionary":"vis","vnd.vsf":"vsf","vnd.webturbo":"wtb","vnd.wolfram.player":"nbp","vnd.wqd":"wqd","vnd.wt.stf":"stf","vnd.xara":"xar","vnd.xfdl":"xfdl","vnd.yamaha.hv-dic":"hvd","vnd.yamaha.hv-script":"hvs","vnd.yamaha.hv-voice":"hvp","vnd.yamaha.openscoreformat":"osf","vnd.yamaha.openscoreformat.osfpvg+xml":"osfpvg","vnd.yamaha.smaf-audio":"saf","vnd.yamaha.smaf-phrase":"spf","vnd.yellowriver-custom-menu":"cmp","vnd.zul":["zir","zirz"],"vnd.zzazz.deck+xml":"zaz","voicexml+xml":"vxml",widget:"wgt",winhlp:"hlp","wsdl+xml":"wsdl","wspolicy+xml":"wspolicy","x-ace-compressed":"ace","x-authorware-bin":["aab","x32","u32","vox"],"x-authorware-map":"aam","x-authorware-seg":"aas","x-blorb":["blb","blorb"],"x-bzip":"bz","x-bzip2":["bz2","boz"],"x-cfs-compressed":"cfs","x-chat":"chat","x-conference":"nsc","x-dgc-compressed":"dgc","x-dtbncx+xml":"ncx","x-dtbook+xml":"dtb","x-dtbresource+xml":"res","x-eva":"eva","x-font-bdf":"bdf","x-font-ghostscript":"gsf","x-font-linux-psf":"psf","x-font-pcf":"pcf","x-font-snf":"snf","x-font-ttf":["ttf","ttc"],"x-font-type1":["pfa","pfb","pfm","afm"],"x-freearc":"arc","x-gca-compressed":"gca","x-glulx":"ulx","x-gramps-xml":"gramps","x-install-instructions":"install","x-lzh-compressed":["lzh","lha"],"x-mie":"mie","x-mobipocket-ebook":["prc","mobi"],"x-ms-application":"application","x-ms-shortcut":"lnk","x-ms-xbap":"xbap","x-msbinder":"obd","x-mscardfile":"crd","x-msclip":"clp","application/x-ms-installer":"msi","x-msmediaview":["mvb","m13","m14"],"x-msmetafile":["wmf","wmz","emf","emz"],"x-msmoney":"mny","x-mspublisher":"pub","x-msschedule":"scd","x-msterminal":"trm","x-mswrite":"wri","x-nzb":"nzb","x-pkcs12":["p12","pfx"],"x-pkcs7-certificates":["p7b","spc"],"x-research-info-systems":"ris","x-silverlight-app":"xap","x-sql":"sql","x-stuffitx":"sitx","x-subrip":"srt","x-t3vm-image":"t3","x-tex-tfm":"tfm","x-tgif":"obj","x-xliff+xml":"xlf","x-xz":"xz","x-zmachine":["z1","z2","z3","z4","z5","z6","z7","z8"],"xaml+xml":"xaml","xcap-diff+xml":"xdf","xenc+xml":"xenc","xml-dtd":"dtd","xop+xml":"xop","xproc+xml":"xpl","xslt+xml":"xslt","xv+xml":["mxml","xhvml","xvml","xvm"],yang:"yang","yin+xml":"yin",envoy:"evy",fractals:"fif","internet-property-stream":"acx",olescript:"axs","vnd.ms-outlook":"msg","vnd.ms-pkicertstore":"sst","x-compress":"z","x-perfmon":["pma","pmc","pmr","pmw"],"ynd.ms-pkipko":"pko",gzip:["gz","tgz"],"smil+xml":["smi","smil"],"vnd.debian.binary-package":["deb","udeb"],"vnd.hzn-3d-crossword":"x3d","vnd.sqlite3":["db","sqlite","sqlite3","db-wal","sqlite-wal","db-shm","sqlite-shm"],"vnd.wap.sic":"sic","vnd.wap.slc":"slc","x-krita":["kra","krz"],"x-perl":["pm","pl"],yaml:["yaml","yml"]},audio:{amr:"amr","amr-wb":"awb",annodex:"axa",basic:["au","snd"],flac:"flac",midi:["mid","midi","kar","rmi"],mpeg:["mpga","mpega","mp3","m4a","mp2a","m2a","m3a"],mpegurl:"m3u",ogg:["oga","ogg","spx"],"prs.sid":"sid","x-aiff":"aifc","x-gsm":"gsm","x-ms-wma":"wma","x-ms-wax":"wax","x-pn-realaudio":"ram","x-realaudio":"ra","x-sd2":"sd2",adpcm:"adp",mp4:"mp4a",s3m:"s3m",silk:"sil","vnd.dece.audio":["uva","uvva"],"vnd.digital-winds":"eol","vnd.dra":"dra","vnd.dts":"dts","vnd.dts.hd":"dtshd","vnd.lucent.voice":"lvp","vnd.ms-playready.media.pya":"pya","vnd.nuera.ecelp4800":"ecelp4800","vnd.nuera.ecelp7470":"ecelp7470","vnd.nuera.ecelp9600":"ecelp9600","vnd.rip":"rip",webm:"weba","x-caf":"caf","x-matroska":"mka","x-pn-realaudio-plugin":"rmp",xm:"xm",aac:"aac",aiff:["aiff","aif","aff"],opus:"opus",wav:"wav"},chemical:{"x-alchemy":"alc","x-cache":["cac","cache"],"x-cache-csf":"csf","x-cactvs-binary":["cbin","cascii","ctab"],"x-cdx":"cdx","x-chem3d":"c3d","x-cif":"cif","x-cmdf":"cmdf","x-cml":"cml","x-compass":"cpa","x-crossfire":"bsd","x-csml":["csml","csm"],"x-ctx":"ctx","x-cxf":["cxf","cef"],"x-embl-dl-nucleotide":["emb","embl"],"x-gamess-input":["inp","gam","gamin"],"x-gaussian-checkpoint":["fch","fchk"],"x-gaussian-cube":"cub","x-gaussian-input":["gau","gjc","gjf"],"x-gaussian-log":"gal","x-gcg8-sequence":"gcg","x-genbank":"gen","x-hin":"hin","x-isostar":["istr","ist"],"x-jcamp-dx":["jdx","dx"],"x-kinemage":"kin","x-macmolecule":"mcm","x-macromodel-input":"mmod","x-mdl-molfile":"mol","x-mdl-rdfile":"rd","x-mdl-rxnfile":"rxn","x-mdl-sdfile":"sd","x-mdl-tgf":"tgf","x-mmcif":"mcif","x-mol2":"mol2","x-molconn-Z":"b","x-mopac-graph":"gpt","x-mopac-input":["mop","mopcrt","zmt"],"x-mopac-out":"moo","x-ncbi-asn1":"asn","x-ncbi-asn1-ascii":["prt","ent"],"x-ncbi-asn1-binary":"val","x-rosdal":"ros","x-swissprot":"sw","x-vamas-iso14976":"vms","x-vmd":"vmd","x-xtel":"xtel","x-xyz":"xyz"},font:{otf:"otf",woff:"woff",woff2:"woff2"},image:{gif:"gif",ief:"ief",jpeg:["jpeg","jpg","jpe","jfif","jfif-tbnl","jif"],pcx:"pcx",png:"png","svg+xml":["svg","svgz"],tiff:["tiff","tif"],"vnd.djvu":["djvu","djv"],"vnd.wap.wbmp":"wbmp","x-canon-cr2":"cr2","x-canon-crw":"crw","x-cmu-raster":"ras","x-coreldraw":"cdr","x-coreldrawpattern":"pat","x-coreldrawtemplate":"cdt","x-corelphotopaint":"cpt","x-epson-erf":"erf","x-icon":"ico","x-jg":"art","x-jng":"jng","x-nikon-nef":"nef","x-olympus-orf":"orf","x-portable-anymap":"pnm","x-portable-bitmap":"pbm","x-portable-graymap":"pgm","x-portable-pixmap":"ppm","x-rgb":"rgb","x-xbitmap":"xbm","x-xpixmap":"xpm","x-xwindowdump":"xwd",bmp:"bmp",cgm:"cgm",g3fax:"g3",ktx:"ktx","prs.btif":"btif",sgi:"sgi","vnd.dece.graphic":["uvi","uvvi","uvg","uvvg"],"vnd.dwg":"dwg","vnd.dxf":"dxf","vnd.fastbidsheet":"fbs","vnd.fpx":"fpx","vnd.fst":"fst","vnd.fujixerox.edmics-mmr":"mmr","vnd.fujixerox.edmics-rlc":"rlc","vnd.ms-modi":"mdi","vnd.ms-photo":"wdp","vnd.net-fpx":"npx","vnd.xiff":"xif",webp:"webp","x-3ds":"3ds","x-cmx":"cmx","x-freehand":["fh","fhc","fh4","fh5","fh7"],"x-pict":["pic","pct"],"x-tga":"tga","cis-cod":"cod",avif:"avifs",heic:["heif","heic"],pjpeg:["pjpg"],"vnd.adobe.photoshop":"psd","x-adobe-dng":"dng","x-fuji-raf":"raf","x-icns":"icns","x-kodak-dcr":"dcr","x-kodak-k25":"k25","x-kodak-kdc":"kdc","x-minolta-mrw":"mrw","x-panasonic-raw":["raw","rw2","rwl"],"x-pentax-pef":["pef","ptx"],"x-sigma-x3f":"x3f","x-sony-arw":"arw","x-sony-sr2":"sr2","x-sony-srf":"srf"},message:{rfc822:["eml","mime","mht","mhtml","nws"]},model:{iges:["igs","iges"],mesh:["msh","mesh","silo"],vrml:["wrl","vrml"],"x3d+vrml":["x3dv","x3dvz"],"x3d+xml":"x3dz","x3d+binary":["x3db","x3dbz"],"vnd.collada+xml":"dae","vnd.dwf":"dwf","vnd.gdl":"gdl","vnd.gtw":"gtw","vnd.mts":"mts","vnd.usdz+zip":"usdz","vnd.vtu":"vtu"},text:{"cache-manifest":["manifest","appcache"],calendar:["ics","icz","ifb"],css:"css",csv:"csv",h323:"323",html:["html","htm","shtml","stm"],iuls:"uls",plain:["txt","text","brf","conf","def","list","log","in","bas","diff","ksh"],richtext:"rtx",scriptlet:["sct","wsc"],texmacs:"tm","tab-separated-values":"tsv","vnd.sun.j2me.app-descriptor":"jad","vnd.wap.wml":"wml","vnd.wap.wmlscript":"wmls","x-bibtex":"bib","x-boo":"boo","x-c++hdr":["h++","hpp","hxx","hh"],"x-c++src":["c++","cpp","cxx","cc"],"x-component":"htc","x-dsrc":"d","x-diff":"patch","x-haskell":"hs","x-java":"java","x-literate-haskell":"lhs","x-moc":"moc","x-pascal":["p","pas","pp","inc"],"x-pcs-gcd":"gcd","x-python":"py","x-scala":"scala","x-setext":"etx","x-tcl":["tcl","tk"],"x-tex":["tex","ltx","sty","cls"],"x-vcalendar":"vcs","x-vcard":"vcf",n3:"n3","prs.lines.tag":"dsc",sgml:["sgml","sgm"],troff:["t","tr","roff","man","me","ms"],turtle:"ttl","uri-list":["uri","uris","urls"],vcard:"vcard","vnd.curl":"curl","vnd.curl.dcurl":"dcurl","vnd.curl.scurl":"scurl","vnd.curl.mcurl":"mcurl","vnd.dvb.subtitle":"sub","vnd.fly":"fly","vnd.fmi.flexstor":"flx","vnd.graphviz":"gv","vnd.in3d.3dml":"3dml","vnd.in3d.spot":"spot","x-asm":["s","asm"],"x-c":["c","h","dic"],"x-fortran":["f","for","f77","f90"],"x-opml":"opml","x-nfo":"nfo","x-sfv":"sfv","x-uuencode":"uu",webviewhtml:"htt",javascript:"js",json:"json",markdown:["md","markdown","mdown","markdn"],"vnd.wap.si":"si","vnd.wap.sl":"sl"},video:{avif:"avif","3gpp":"3gp",annodex:"axv",dl:"dl",dv:["dif","dv"],fli:"fli",gl:"gl",mpeg:["mpeg","mpg","mpe","m1v","m2v","mp2","mpa","mpv2"],mp4:["mp4","mp4v","mpg4"],quicktime:["qt","mov"],ogg:"ogv","vnd.mpegurl":["mxu","m4u"],"x-flv":"flv","x-la-asf":["lsf","lsx"],"x-mng":"mng","x-ms-asf":["asf","asx","asr"],"x-ms-wm":"wm","x-ms-wmv":"wmv","x-ms-wmx":"wmx","x-ms-wvx":"wvx","x-msvideo":"avi","x-sgi-movie":"movie","x-matroska":["mpv","mkv","mk3d","mks"],"3gpp2":"3g2",h261:"h261",h263:"h263",h264:"h264",jpeg:"jpgv",jpm:["jpm","jpgm"],mj2:["mj2","mjp2"],"vnd.dece.hd":["uvh","uvvh"],"vnd.dece.mobile":["uvm","uvvm"],"vnd.dece.pd":["uvp","uvvp"],"vnd.dece.sd":["uvs","uvvs"],"vnd.dece.video":["uvv","uvvv"],"vnd.dvb.file":"dvb","vnd.fvt":"fvt","vnd.ms-playready.media.pyv":"pyv","vnd.uvvu.mp4":["uvu","uvvu"],"vnd.vivo":"viv",webm:"webm","x-f4v":"f4v","x-m4v":"m4v","x-ms-vob":"vob","x-smv":"smv",mp2t:"ts"},"x-conference":{"x-cooltalk":"ice"},"x-world":{"x-vrml":["vrm","flr","wrz","xaf","xof"]}};(()=>{const n={};for(const t of Object.keys(table$1))for(const r of Object.keys(table$1[t])){const s=table$1[t][r];if(typeof s=="string")n[s]=t+"/"+r;else for(let i=0;i<s.length;i++)n[s[i]]=t+"/"+r}return n})();const table=[];for(let n=0;n<256;n++){let t=n;for(let r=0;r<8;r++)t&1?t=t>>>1^3988292384:t=t>>>1;table[n]=t}class Crc32{constructor(t){this.crc=t||-1}append(t){let r=this.crc|0;for(let s=0,i=t.length|0;s<i;s++)r=r>>>8^table[(r^t[s])&255];this.crc=r}get(){return~this.crc}}class Crc32Stream extends TransformStream{constructor(){let t;const r=new Crc32;super({transform(s,i){r.append(s),i.enqueue(s)},flush(){const s=new Uint8Array(4);new DataView(s.buffer).setUint32(0,r.get()),t.value=s}}),t=this}}function encodeText(n){if(typeof TextEncoder==UNDEFINED_TYPE){n=unescape(encodeURIComponent(n));const t=new Uint8Array(n.length);for(let r=0;r<t.length;r++)t[r]=n.charCodeAt(r);return t}else return new TextEncoder().encode(n)}const bitArray={concat(n,t){if(n.length===0||t.length===0)return n.concat(t);const r=n[n.length-1],s=bitArray.getPartial(r);return s===32?n.concat(t):bitArray._shiftRight(t,s,r|0,n.slice(0,n.length-1))},bitLength(n){const t=n.length;if(t===0)return 0;const r=n[t-1];return(t-1)*32+bitArray.getPartial(r)},clamp(n,t){if(n.length*32<t)return n;n=n.slice(0,Math.ceil(t/32));const r=n.length;return t=t&31,r>0&&t&&(n[r-1]=bitArray.partial(t,n[r-1]&2147483648>>t-1,1)),n},partial(n,t,r){return n===32?t:(r?t|0:t<<32-n)+n*1099511627776},getPartial(n){return Math.round(n/1099511627776)||32},_shiftRight(n,t,r,s){for(s===void 0&&(s=[]);t>=32;t-=32)s.push(r),r=0;if(t===0)return s.concat(n);for(let o=0;o<n.length;o++)s.push(r|n[o]>>>t),r=n[o]<<32-t;const i=n.length?n[n.length-1]:0,a=bitArray.getPartial(i);return s.push(bitArray.partial(t+a&31,t+a>32?r:s.pop(),1)),s}},codec={bytes:{fromBits(n){const r=bitArray.bitLength(n)/8,s=new Uint8Array(r);let i;for(let a=0;a<r;a++)a&3||(i=n[a/4]),s[a]=i>>>24,i<<=8;return s},toBits(n){const t=[];let r,s=0;for(r=0;r<n.length;r++)s=s<<8|n[r],(r&3)===3&&(t.push(s),s=0);return r&3&&t.push(bitArray.partial(8*(r&3),s)),t}}},hash={};hash.sha1=class{constructor(n){const t=this;t.blockSize=512,t._init=[1732584193,4023233417,2562383102,271733878,3285377520],t._key=[1518500249,1859775393,2400959708,3395469782],n?(t._h=n._h.slice(0),t._buffer=n._buffer.slice(0),t._length=n._length):t.reset()}reset(){const n=this;return n._h=n._init.slice(0),n._buffer=[],n._length=0,n}update(n){const t=this;typeof n=="string"&&(n=codec.utf8String.toBits(n));const r=t._buffer=bitArray.concat(t._buffer,n),s=t._length,i=t._length=s+bitArray.bitLength(n);if(i>9007199254740991)throw new Error("Cannot hash more than 2^53 - 1 bits");const a=new Uint32Array(r);let o=0;for(let l=t.blockSize+s-(t.blockSize+s&t.blockSize-1);l<=i;l+=t.blockSize)t._block(a.subarray(16*o,16*(o+1))),o+=1;return r.splice(0,16*o),t}finalize(){const n=this;let t=n._buffer;const r=n._h;t=bitArray.concat(t,[bitArray.partial(1,1)]);for(let s=t.length+2;s&15;s++)t.push(0);for(t.push(Math.floor(n._length/4294967296)),t.push(n._length|0);t.length;)n._block(t.splice(0,16));return n.reset(),r}_f(n,t,r,s){if(n<=19)return t&r|~t&s;if(n<=39)return t^r^s;if(n<=59)return t&r|t&s|r&s;if(n<=79)return t^r^s}_S(n,t){return t<<n|t>>>32-n}_block(n){const t=this,r=t._h,s=Array(80);for(let c=0;c<16;c++)s[c]=n[c];let i=r[0],a=r[1],o=r[2],l=r[3],u=r[4];for(let c=0;c<=79;c++){c>=16&&(s[c]=t._S(1,s[c-3]^s[c-8]^s[c-14]^s[c-16]));const d=t._S(5,i)+t._f(c,a,o,l)+u+s[c]+t._key[Math.floor(c/20)]|0;u=l,l=o,o=t._S(30,a),a=i,i=d}r[0]=r[0]+i|0,r[1]=r[1]+a|0,r[2]=r[2]+o|0,r[3]=r[3]+l|0,r[4]=r[4]+u|0}};const cipher={};cipher.aes=class{constructor(n){const t=this;t._tables=[[[],[],[],[],[]],[[],[],[],[],[]]],t._tables[0][0][0]||t._precompute();const r=t._tables[0][4],s=t._tables[1],i=n.length;let a,o,l,u=1;if(i!==4&&i!==6&&i!==8)throw new Error("invalid aes key size");for(t._key=[o=n.slice(0),l=[]],a=i;a<4*i+28;a++){let c=o[a-1];(a%i===0||i===8&&a%i===4)&&(c=r[c>>>24]<<24^r[c>>16&255]<<16^r[c>>8&255]<<8^r[c&255],a%i===0&&(c=c<<8^c>>>24^u<<24,u=u<<1^(u>>7)*283)),o[a]=o[a-i]^c}for(let c=0;a;c++,a--){const d=o[c&3?a:a-4];a<=4||c<4?l[c]=d:l[c]=s[0][r[d>>>24]]^s[1][r[d>>16&255]]^s[2][r[d>>8&255]]^s[3][r[d&255]]}}encrypt(n){return this._crypt(n,0)}decrypt(n){return this._crypt(n,1)}_precompute(){const n=this._tables[0],t=this._tables[1],r=n[4],s=t[4],i=[],a=[];let o,l,u,c;for(let d=0;d<256;d++)a[(i[d]=d<<1^(d>>7)*283)^d]=d;for(let d=o=0;!r[d];d^=l||1,o=a[o]||1){let p=o^o<<1^o<<2^o<<3^o<<4;p=p>>8^p&255^99,r[d]=p,s[p]=d,c=i[u=i[l=i[d]]];let f=c*16843009^u*65537^l*257^d*16843008,g=i[p]*257^p*16843008;for(let y=0;y<4;y++)n[y][d]=g=g<<24^g>>>8,t[y][p]=f=f<<24^f>>>8}for(let d=0;d<5;d++)n[d]=n[d].slice(0),t[d]=t[d].slice(0)}_crypt(n,t){if(n.length!==4)throw new Error("invalid aes block size");const r=this._key[t],s=r.length/4-2,i=[0,0,0,0],a=this._tables[t],o=a[0],l=a[1],u=a[2],c=a[3],d=a[4];let p=n[0]^r[0],f=n[t?3:1]^r[1],g=n[2]^r[2],y=n[t?1:3]^r[3],_=4,h,m,w;for(let T=0;T<s;T++)h=o[p>>>24]^l[f>>16&255]^u[g>>8&255]^c[y&255]^r[_],m=o[f>>>24]^l[g>>16&255]^u[y>>8&255]^c[p&255]^r[_+1],w=o[g>>>24]^l[y>>16&255]^u[p>>8&255]^c[f&255]^r[_+2],y=o[y>>>24]^l[p>>16&255]^u[f>>8&255]^c[g&255]^r[_+3],_+=4,p=h,f=m,g=w;for(let T=0;T<4;T++)i[t?3&-T:T]=d[p>>>24]<<24^d[f>>16&255]<<16^d[g>>8&255]<<8^d[y&255]^r[_++],h=p,p=f,f=g,g=y,y=h;return i}};const random={getRandomValues(n){const t=new Uint32Array(n.buffer),r=s=>{let i=987654321;const a=4294967295;return function(){return i=36969*(i&65535)+(i>>16)&a,s=18e3*(s&65535)+(s>>16)&a,(((i<<16)+s&a)/4294967296+.5)*(Math.random()>.5?1:-1)}};for(let s=0,i;s<n.length;s+=4){const a=r((i||Math.random())*4294967296);i=a()*987654071,t[s/4]=a()*4294967296|0}return n}},mode={};mode.ctrGladman=class{constructor(n,t){this._prf=n,this._initIv=t,this._iv=t}reset(){this._iv=this._initIv}update(n){return this.calculate(this._prf,n,this._iv)}incWord(n){if((n>>24&255)===255){let t=n>>16&255,r=n>>8&255,s=n&255;t===255?(t=0,r===255?(r=0,s===255?s=0:++s):++r):++t,n=0,n+=t<<16,n+=r<<8,n+=s}else n+=1<<24;return n}incCounter(n){(n[0]=this.incWord(n[0]))===0&&(n[1]=this.incWord(n[1]))}calculate(n,t,r){let s;if(!(s=t.length))return[];const i=bitArray.bitLength(t);for(let a=0;a<s;a+=4){this.incCounter(r);const o=n.encrypt(r);t[a]^=o[0],t[a+1]^=o[1],t[a+2]^=o[2],t[a+3]^=o[3]}return bitArray.clamp(t,i)}};const misc={importKey(n){return new misc.hmacSha1(codec.bytes.toBits(n))},pbkdf2(n,t,r,s){if(r=r||1e4,s<0||r<0)throw new Error("invalid params to pbkdf2");const i=(s>>5)+1<<2;let a,o,l,u,c;const d=new ArrayBuffer(i),p=new DataView(d);let f=0;const g=bitArray;for(t=codec.bytes.toBits(t),c=1;f<(i||1);c++){for(a=o=n.encrypt(g.concat(t,[c])),l=1;l<r;l++)for(o=n.encrypt(o),u=0;u<o.length;u++)a[u]^=o[u];for(l=0;f<(i||1)&&l<a.length;l++)p.setInt32(f,a[l]),f+=4}return d.slice(0,s/8)}};misc.hmacSha1=class{constructor(n){const t=this,r=t._hash=hash.sha1,s=[[],[]];t._baseHash=[new r,new r];const i=t._baseHash[0].blockSize/32;n.length>i&&(n=new r().update(n).finalize());for(let a=0;a<i;a++)s[0][a]=n[a]^909522486,s[1][a]=n[a]^1549556828;t._baseHash[0].update(s[0]),t._baseHash[1].update(s[1]),t._resultHash=new r(t._baseHash[0])}reset(){const n=this;n._resultHash=new n._hash(n._baseHash[0]),n._updated=!1}update(n){const t=this;t._updated=!0,t._resultHash.update(n)}digest(){const n=this,t=n._resultHash.finalize(),r=new n._hash(n._baseHash[1]).update(t).finalize();return n.reset(),r}encrypt(n){if(this._updated)throw new Error("encrypt on already updated hmac called!");return this.update(n),this.digest(n)}};const GET_RANDOM_VALUES_SUPPORTED=typeof crypto!=UNDEFINED_TYPE&&typeof crypto.getRandomValues==FUNCTION_TYPE,ERR_INVALID_PASSWORD="Invalid password",ERR_INVALID_SIGNATURE="Invalid signature",ERR_ABORT_CHECK_PASSWORD="zipjs-abort-check-password";function getRandomValues(n){return GET_RANDOM_VALUES_SUPPORTED?crypto.getRandomValues(n):random.getRandomValues(n)}const BLOCK_LENGTH=16,RAW_FORMAT="raw",PBKDF2_ALGORITHM={name:"PBKDF2"},HASH_ALGORITHM={name:"HMAC"},HASH_FUNCTION="SHA-1",BASE_KEY_ALGORITHM=Object.assign({hash:HASH_ALGORITHM},PBKDF2_ALGORITHM),DERIVED_BITS_ALGORITHM=Object.assign({iterations:1e3,hash:{name:HASH_FUNCTION}},PBKDF2_ALGORITHM),DERIVED_BITS_USAGE=["deriveBits"],SALT_LENGTH=[8,12,16],KEY_LENGTH=[16,24,32],SIGNATURE_LENGTH=10,COUNTER_DEFAULT_VALUE=[0,0,0,0],CRYPTO_API_SUPPORTED=typeof crypto!=UNDEFINED_TYPE,subtle=CRYPTO_API_SUPPORTED&&crypto.subtle,SUBTLE_API_SUPPORTED=CRYPTO_API_SUPPORTED&&typeof subtle!=UNDEFINED_TYPE,codecBytes=codec.bytes,Aes=cipher.aes,CtrGladman=mode.ctrGladman,HmacSha1=misc.hmacSha1;let IMPORT_KEY_SUPPORTED=CRYPTO_API_SUPPORTED&&SUBTLE_API_SUPPORTED&&typeof subtle.importKey==FUNCTION_TYPE,DERIVE_BITS_SUPPORTED=CRYPTO_API_SUPPORTED&&SUBTLE_API_SUPPORTED&&typeof subtle.deriveBits==FUNCTION_TYPE;class AESDecryptionStream extends TransformStream{constructor({password:t,rawPassword:r,signed:s,encryptionStrength:i,checkPasswordOnly:a}){super({start(){Object.assign(this,{ready:new Promise(o=>this.resolveReady=o),password:encodePassword(t,r),signed:s,strength:i-1,pending:new Uint8Array})},async transform(o,l){const u=this,{password:c,strength:d,resolveReady:p,ready:f}=u;c?(await createDecryptionKeys(u,d,c,subarray(o,0,SALT_LENGTH[d]+2)),o=subarray(o,SALT_LENGTH[d]+2),a?l.error(new Error(ERR_ABORT_CHECK_PASSWORD)):p()):await f;const g=new Uint8Array(o.length-SIGNATURE_LENGTH-(o.length-SIGNATURE_LENGTH)%BLOCK_LENGTH);l.enqueue(append(u,o,g,0,SIGNATURE_LENGTH,!0))},async flush(o){const{signed:l,ctr:u,hmac:c,pending:d,ready:p}=this;if(c&&u){await p;const f=subarray(d,0,d.length-SIGNATURE_LENGTH),g=subarray(d,d.length-SIGNATURE_LENGTH);let y=new Uint8Array;if(f.length){const _=toBits(codecBytes,f);c.update(_);const h=u.update(_);y=fromBits(codecBytes,h)}if(l){const _=subarray(fromBits(codecBytes,c.digest()),0,SIGNATURE_LENGTH);for(let h=0;h<SIGNATURE_LENGTH;h++)if(_[h]!=g[h])throw new Error(ERR_INVALID_SIGNATURE)}o.enqueue(y)}}})}}class AESEncryptionStream extends TransformStream{constructor({password:t,rawPassword:r,encryptionStrength:s}){let i;super({start(){Object.assign(this,{ready:new Promise(a=>this.resolveReady=a),password:encodePassword(t,r),strength:s-1,pending:new Uint8Array})},async transform(a,o){const l=this,{password:u,strength:c,resolveReady:d,ready:p}=l;let f=new Uint8Array;u?(f=await createEncryptionKeys(l,c,u),d()):await p;const g=new Uint8Array(f.length+a.length-a.length%BLOCK_LENGTH);g.set(f,0),o.enqueue(append(l,a,g,f.length,0))},async flush(a){const{ctr:o,hmac:l,pending:u,ready:c}=this;if(l&&o){await c;let d=new Uint8Array;if(u.length){const p=o.update(toBits(codecBytes,u));l.update(p),d=fromBits(codecBytes,p)}i.signature=fromBits(codecBytes,l.digest()).slice(0,SIGNATURE_LENGTH),a.enqueue(concat(d,i.signature))}}}),i=this}}function append(n,t,r,s,i,a){const{ctr:o,hmac:l,pending:u}=n,c=t.length-i;u.length&&(t=concat(u,t),r=expand(r,c-c%BLOCK_LENGTH));let d;for(d=0;d<=c-BLOCK_LENGTH;d+=BLOCK_LENGTH){const p=toBits(codecBytes,subarray(t,d,d+BLOCK_LENGTH));a&&l.update(p);const f=o.update(p);a||l.update(f),r.set(fromBits(codecBytes,f),d+s)}return n.pending=subarray(t,d),r}async function createDecryptionKeys(n,t,r,s){const i=await createKeys$1(n,t,r,subarray(s,0,SALT_LENGTH[t])),a=subarray(s,SALT_LENGTH[t]);if(i[0]!=a[0]||i[1]!=a[1])throw new Error(ERR_INVALID_PASSWORD)}async function createEncryptionKeys(n,t,r){const s=getRandomValues(new Uint8Array(SALT_LENGTH[t])),i=await createKeys$1(n,t,r,s);return concat(s,i)}async function createKeys$1(n,t,r,s){n.password=null;const i=await importKey(RAW_FORMAT,r,BASE_KEY_ALGORITHM,!1,DERIVED_BITS_USAGE),a=await deriveBits(Object.assign({salt:s},DERIVED_BITS_ALGORITHM),i,8*(KEY_LENGTH[t]*2+2)),o=new Uint8Array(a),l=toBits(codecBytes,subarray(o,0,KEY_LENGTH[t])),u=toBits(codecBytes,subarray(o,KEY_LENGTH[t],KEY_LENGTH[t]*2)),c=subarray(o,KEY_LENGTH[t]*2);return Object.assign(n,{keys:{key:l,authentication:u,passwordVerification:c},ctr:new CtrGladman(new Aes(l),Array.from(COUNTER_DEFAULT_VALUE)),hmac:new HmacSha1(u)}),c}async function importKey(n,t,r,s,i){if(IMPORT_KEY_SUPPORTED)try{return await subtle.importKey(n,t,r,s,i)}catch{return IMPORT_KEY_SUPPORTED=!1,misc.importKey(t)}else return misc.importKey(t)}async function deriveBits(n,t,r){if(DERIVE_BITS_SUPPORTED)try{return await subtle.deriveBits(n,t,r)}catch{return DERIVE_BITS_SUPPORTED=!1,misc.pbkdf2(t,n.salt,DERIVED_BITS_ALGORITHM.iterations,r)}else return misc.pbkdf2(t,n.salt,DERIVED_BITS_ALGORITHM.iterations,r)}function encodePassword(n,t){return t===UNDEFINED_VALUE?encodeText(n):t}function concat(n,t){let r=n;return n.length+t.length&&(r=new Uint8Array(n.length+t.length),r.set(n,0),r.set(t,n.length)),r}function expand(n,t){if(t&&t>n.length){const r=n;n=new Uint8Array(t),n.set(r,0)}return n}function subarray(n,t,r){return n.subarray(t,r)}function fromBits(n,t){return n.fromBits(t)}function toBits(n,t){return n.toBits(t)}const HEADER_LENGTH=12;class ZipCryptoDecryptionStream extends TransformStream{constructor({password:t,passwordVerification:r,checkPasswordOnly:s}){super({start(){Object.assign(this,{password:t,passwordVerification:r}),createKeys(this,t)},transform(i,a){const o=this;if(o.password){const l=decrypt(o,i.subarray(0,HEADER_LENGTH));if(o.password=null,l[HEADER_LENGTH-1]!=o.passwordVerification)throw new Error(ERR_INVALID_PASSWORD);i=i.subarray(HEADER_LENGTH)}s?a.error(new Error(ERR_ABORT_CHECK_PASSWORD)):a.enqueue(decrypt(o,i))}})}}class ZipCryptoEncryptionStream extends TransformStream{constructor({password:t,passwordVerification:r}){super({start(){Object.assign(this,{password:t,passwordVerification:r}),createKeys(this,t)},transform(s,i){const a=this;let o,l;if(a.password){a.password=null;const u=getRandomValues(new Uint8Array(HEADER_LENGTH));u[HEADER_LENGTH-1]=a.passwordVerification,o=new Uint8Array(s.length+u.length),o.set(encrypt(a,u),0),l=HEADER_LENGTH}else o=new Uint8Array(s.length),l=0;o.set(encrypt(a,s),l),i.enqueue(o)}})}}function decrypt(n,t){const r=new Uint8Array(t.length);for(let s=0;s<t.length;s++)r[s]=getByte(n)^t[s],updateKeys(n,r[s]);return r}function encrypt(n,t){const r=new Uint8Array(t.length);for(let s=0;s<t.length;s++)r[s]=getByte(n)^t[s],updateKeys(n,t[s]);return r}function createKeys(n,t){const r=[305419896,591751049,878082192];Object.assign(n,{keys:r,crcKey0:new Crc32(r[0]),crcKey2:new Crc32(r[2])});for(let s=0;s<t.length;s++)updateKeys(n,t.charCodeAt(s))}function updateKeys(n,t){let[r,s,i]=n.keys;n.crcKey0.append([t]),r=~n.crcKey0.get(),s=getInt32(Math.imul(getInt32(s+getInt8(r)),134775813)+1),n.crcKey2.append([s>>>24]),i=~n.crcKey2.get(),n.keys=[r,s,i]}function getByte(n){const t=n.keys[2]|2;return getInt8(Math.imul(t,t^1)>>>8)}function getInt8(n){return n&255}function getInt32(n){return n&4294967295}const COMPRESSION_FORMAT="deflate-raw";class DeflateStream extends TransformStream{constructor(t,{chunkSize:r,CompressionStream:s,CompressionStreamNative:i}){super({});const{compressed:a,encrypted:o,useCompressionStream:l,zipCrypto:u,signed:c,level:d}=t,p=this;let f,g,y=filterEmptyChunks(super.readable);(!o||u)&&c&&(f=new Crc32Stream,y=pipeThrough(y,f)),a&&(y=pipeThroughCommpressionStream(y,l,{level:d,chunkSize:r},i,s)),o&&(u?y=pipeThrough(y,new ZipCryptoEncryptionStream(t)):(g=new AESEncryptionStream(t),y=pipeThrough(y,g))),setReadable(p,y,()=>{let _;o&&!u&&(_=g.signature),(!o||u)&&c&&(_=new DataView(f.value.buffer).getUint32(0)),p.signature=_})}}class InflateStream extends TransformStream{constructor(t,{chunkSize:r,DecompressionStream:s,DecompressionStreamNative:i}){super({});const{zipCrypto:a,encrypted:o,signed:l,signature:u,compressed:c,useCompressionStream:d}=t;let p,f,g=filterEmptyChunks(super.readable);o&&(a?g=pipeThrough(g,new ZipCryptoDecryptionStream(t)):(f=new AESDecryptionStream(t),g=pipeThrough(g,f))),c&&(g=pipeThroughCommpressionStream(g,d,{chunkSize:r},i,s)),(!o||a)&&l&&(p=new Crc32Stream,g=pipeThrough(g,p)),setReadable(this,g,()=>{if((!o||a)&&l){const y=new DataView(p.value.buffer);if(u!=y.getUint32(0,!1))throw new Error(ERR_INVALID_SIGNATURE)}})}}function filterEmptyChunks(n){return pipeThrough(n,new TransformStream({transform(t,r){t&&t.length&&r.enqueue(t)}}))}function setReadable(n,t,r){t=pipeThrough(t,new TransformStream({flush:r})),Object.defineProperty(n,"readable",{get(){return t}})}function pipeThroughCommpressionStream(n,t,r,s,i){try{const a=t&&s?s:i;n=pipeThrough(n,new a(COMPRESSION_FORMAT,r))}catch{if(t)try{n=pipeThrough(n,new i(COMPRESSION_FORMAT,r))}catch{return n}else return n}return n}function pipeThrough(n,t){return n.pipeThrough(t)}const CODEC_DEFLATE="deflate",CODEC_INFLATE="inflate";class CodecStream extends TransformStream{constructor(t,r){super({});const s=this,{codecType:i}=t;let a;i.startsWith(CODEC_DEFLATE)?a=DeflateStream:i.startsWith(CODEC_INFLATE)&&(a=InflateStream);let o=0,l=0;const u=new a(t,r),c=super.readable,d=new TransformStream({transform(f,g){f&&f.length&&(l+=f.length,g.enqueue(f))},flush(){Object.assign(s,{inputSize:l})}}),p=new TransformStream({transform(f,g){f&&f.length&&(o+=f.length,g.enqueue(f))},flush(){const{signature:f}=u;Object.assign(s,{signature:f,outputSize:o,inputSize:l})}});Object.defineProperty(s,"readable",{get(){return c.pipeThrough(d).pipeThrough(u).pipeThrough(p)}})}}class ChunkStream extends TransformStream{constructor(t){let r;super({transform:s,flush(i){r&&r.length&&i.enqueue(r)}});function s(i,a){if(r){const o=new Uint8Array(r.length+i.length);o.set(r),o.set(i,r.length),i=o,r=null}i.length>t?(a.enqueue(i.slice(0,t)),s(i.slice(t),a)):r=i}}}class ProgressWatcherStream extends TransformStream{constructor(t,{onstart:r,onprogress:s,size:i,onend:a}){let o=0;super({async start(){r&&await callHandler(r,i)},async transform(l,u){o+=l.length,s&&await callHandler(s,o,i),u.enqueue(l)},async flush(){t.size=o,a&&await callHandler(a,o)}})}}async function callHandler(n,...t){try{await n(...t)}catch{}}function e(n,t={}){const r=`const{Array:e,Object:t,Number:n,Math:r,Error:s,Uint8Array:i,Uint16Array:o,Uint32Array:c,Int32Array:f,Map:a,DataView:l,Promise:u,TextEncoder:w,crypto:h,postMessage:d,TransformStream:p,ReadableStream:y,WritableStream:m,CompressionStream:b,DecompressionStream:g}=self,k=void 0,v="undefined",S="function";class z{constructor(e){return class extends p{constructor(t,n){const r=new e(n);super({transform(e,t){t.enqueue(r.append(e))},flush(e){const t=r.flush();t&&e.enqueue(t)}})}}}}const C=[];for(let e=0;256>e;e++){let t=e;for(let e=0;8>e;e++)1&t?t=t>>>1^3988292384:t>>>=1;C[e]=t}class x{constructor(e){this.t=e||-1}append(e){let t=0|this.t;for(let n=0,r=0|e.length;r>n;n++)t=t>>>8^C[255&(t^e[n])];this.t=t}get(){return~this.t}}class A extends p{constructor(){let e;const t=new x;super({transform(e,n){t.append(e),n.enqueue(e)},flush(){const n=new i(4);new l(n.buffer).setUint32(0,t.get()),e.value=n}}),e=this}}const _={concat(e,t){if(0===e.length||0===t.length)return e.concat(t);const n=e[e.length-1],r=_.i(n);return 32===r?e.concat(t):_.o(t,r,0|n,e.slice(0,e.length-1))},l(e){const t=e.length;if(0===t)return 0;const n=e[t-1];return 32*(t-1)+_.i(n)},u(e,t){if(32*e.length<t)return e;const n=(e=e.slice(0,r.ceil(t/32))).length;return t&=31,n>0&&t&&(e[n-1]=_.h(t,e[n-1]&2147483648>>t-1,1)),e},h:(e,t,n)=>32===e?t:(n?0|t:t<<32-e)+1099511627776*e,i:e=>r.round(e/1099511627776)||32,o(e,t,n,r){for(void 0===r&&(r=[]);t>=32;t-=32)r.push(n),n=0;if(0===t)return r.concat(e);for(let s=0;s<e.length;s++)r.push(n|e[s]>>>t),n=e[s]<<32-t;const s=e.length?e[e.length-1]:0,i=_.i(s);return r.push(_.h(t+i&31,t+i>32?n:r.pop(),1)),r}},I={bytes:{p(e){const t=_.l(e)/8,n=new i(t);let r;for(let s=0;t>s;s++)3&s||(r=e[s/4]),n[s]=r>>>24,r<<=8;return n},m(e){const t=[];let n,r=0;for(n=0;n<e.length;n++)r=r<<8|e[n],3&~n||(t.push(r),r=0);return 3&n&&t.push(_.h(8*(3&n),r)),t}}},P=class{constructor(e){const t=this;t.blockSize=512,t.k=[1732584193,4023233417,2562383102,271733878,3285377520],t.v=[1518500249,1859775393,2400959708,3395469782],e?(t.S=e.S.slice(0),t.C=e.C.slice(0),t.A=e.A):t.reset()}reset(){const e=this;return e.S=e.k.slice(0),e.C=[],e.A=0,e}update(e){const t=this;"string"==typeof e&&(e=I._.m(e));const n=t.C=_.concat(t.C,e),r=t.A,i=t.A=r+_.l(e);if(i>9007199254740991)throw new s("Cannot hash more than 2^53 - 1 bits");const o=new c(n);let f=0;for(let e=t.blockSize+r-(t.blockSize+r&t.blockSize-1);i>=e;e+=t.blockSize)t.I(o.subarray(16*f,16*(f+1))),f+=1;return n.splice(0,16*f),t}P(){const e=this;let t=e.C;const n=e.S;t=_.concat(t,[_.h(1,1)]);for(let e=t.length+2;15&e;e++)t.push(0);for(t.push(r.floor(e.A/4294967296)),t.push(0|e.A);t.length;)e.I(t.splice(0,16));return e.reset(),n}D(e,t,n,r){return e>19?e>39?e>59?e>79?void 0:t^n^r:t&n|t&r|n&r:t^n^r:t&n|~t&r}V(e,t){return t<<e|t>>>32-e}I(t){const n=this,s=n.S,i=e(80);for(let e=0;16>e;e++)i[e]=t[e];let o=s[0],c=s[1],f=s[2],a=s[3],l=s[4];for(let e=0;79>=e;e++){16>e||(i[e]=n.V(1,i[e-3]^i[e-8]^i[e-14]^i[e-16]));const t=n.V(5,o)+n.D(e,c,f,a)+l+i[e]+n.v[r.floor(e/20)]|0;l=a,a=f,f=n.V(30,c),c=o,o=t}s[0]=s[0]+o|0,s[1]=s[1]+c|0,s[2]=s[2]+f|0,s[3]=s[3]+a|0,s[4]=s[4]+l|0}},D={getRandomValues(e){const t=new c(e.buffer),n=e=>{let t=987654321;const n=4294967295;return()=>(t=36969*(65535&t)+(t>>16)&n,(((t<<16)+(e=18e3*(65535&e)+(e>>16)&n)&n)/4294967296+.5)*(r.random()>.5?1:-1))};for(let s,i=0;i<e.length;i+=4){const e=n(4294967296*(s||r.random()));s=987654071*e(),t[i/4]=4294967296*e()|0}return e}},V={importKey:e=>new V.R(I.bytes.m(e)),B(e,t,n,r){if(n=n||1e4,0>r||0>n)throw new s("invalid params to pbkdf2");const i=1+(r>>5)<<2;let o,c,f,a,u;const w=new ArrayBuffer(i),h=new l(w);let d=0;const p=_;for(t=I.bytes.m(t),u=1;(i||1)>d;u++){for(o=c=e.encrypt(p.concat(t,[u])),f=1;n>f;f++)for(c=e.encrypt(c),a=0;a<c.length;a++)o[a]^=c[a];for(f=0;(i||1)>d&&f<o.length;f++)h.setInt32(d,o[f]),d+=4}return w.slice(0,r/8)},R:class{constructor(e){const t=this,n=t.M=P,r=[[],[]];t.U=[new n,new n];const s=t.U[0].blockSize/32;e.length>s&&(e=(new n).update(e).P());for(let t=0;s>t;t++)r[0][t]=909522486^e[t],r[1][t]=1549556828^e[t];t.U[0].update(r[0]),t.U[1].update(r[1]),t.K=new n(t.U[0])}reset(){const e=this;e.K=new e.M(e.U[0]),e.N=!1}update(e){this.N=!0,this.K.update(e)}digest(){const e=this,t=e.K.P(),n=new e.M(e.U[1]).update(t).P();return e.reset(),n}encrypt(e){if(this.N)throw new s("encrypt on already updated hmac called!");return this.update(e),this.digest(e)}}},R=typeof h!=v&&typeof h.getRandomValues==S,B="Invalid password",E="Invalid signature",M="zipjs-abort-check-password";function U(e){return R?h.getRandomValues(e):D.getRandomValues(e)}const K=16,N={name:"PBKDF2"},O=t.assign({hash:{name:"HMAC"}},N),T=t.assign({iterations:1e3,hash:{name:"SHA-1"}},N),W=["deriveBits"],j=[8,12,16],H=[16,24,32],L=10,F=[0,0,0,0],q=typeof h!=v,G=q&&h.subtle,J=q&&typeof G!=v,Q=I.bytes,X=class{constructor(e){const t=this;t.O=[[[],[],[],[],[]],[[],[],[],[],[]]],t.O[0][0][0]||t.T();const n=t.O[0][4],r=t.O[1],i=e.length;let o,c,f,a=1;if(4!==i&&6!==i&&8!==i)throw new s("invalid aes key size");for(t.v=[c=e.slice(0),f=[]],o=i;4*i+28>o;o++){let e=c[o-1];(o%i==0||8===i&&o%i==4)&&(e=n[e>>>24]<<24^n[e>>16&255]<<16^n[e>>8&255]<<8^n[255&e],o%i==0&&(e=e<<8^e>>>24^a<<24,a=a<<1^283*(a>>7))),c[o]=c[o-i]^e}for(let e=0;o;e++,o--){const t=c[3&e?o:o-4];f[e]=4>=o||4>e?t:r[0][n[t>>>24]]^r[1][n[t>>16&255]]^r[2][n[t>>8&255]]^r[3][n[255&t]]}}encrypt(e){return this.W(e,0)}decrypt(e){return this.W(e,1)}T(){const e=this.O[0],t=this.O[1],n=e[4],r=t[4],s=[],i=[];let o,c,f,a;for(let e=0;256>e;e++)i[(s[e]=e<<1^283*(e>>7))^e]=e;for(let l=o=0;!n[l];l^=c||1,o=i[o]||1){let i=o^o<<1^o<<2^o<<3^o<<4;i=i>>8^255&i^99,n[l]=i,r[i]=l,a=s[f=s[c=s[l]]];let u=16843009*a^65537*f^257*c^16843008*l,w=257*s[i]^16843008*i;for(let n=0;4>n;n++)e[n][l]=w=w<<24^w>>>8,t[n][i]=u=u<<24^u>>>8}for(let n=0;5>n;n++)e[n]=e[n].slice(0),t[n]=t[n].slice(0)}W(e,t){if(4!==e.length)throw new s("invalid aes block size");const n=this.v[t],r=n.length/4-2,i=[0,0,0,0],o=this.O[t],c=o[0],f=o[1],a=o[2],l=o[3],u=o[4];let w,h,d,p=e[0]^n[0],y=e[t?3:1]^n[1],m=e[2]^n[2],b=e[t?1:3]^n[3],g=4;for(let e=0;r>e;e++)w=c[p>>>24]^f[y>>16&255]^a[m>>8&255]^l[255&b]^n[g],h=c[y>>>24]^f[m>>16&255]^a[b>>8&255]^l[255&p]^n[g+1],d=c[m>>>24]^f[b>>16&255]^a[p>>8&255]^l[255&y]^n[g+2],b=c[b>>>24]^f[p>>16&255]^a[y>>8&255]^l[255&m]^n[g+3],g+=4,p=w,y=h,m=d;for(let e=0;4>e;e++)i[t?3&-e:e]=u[p>>>24]<<24^u[y>>16&255]<<16^u[m>>8&255]<<8^u[255&b]^n[g++],w=p,p=y,y=m,m=b,b=w;return i}},Y=class{constructor(e,t){this.j=e,this.H=t,this.L=t}reset(){this.L=this.H}update(e){return this.F(this.j,e,this.L)}q(e){if(255&~(e>>24))e+=1<<24;else{let t=e>>16&255,n=e>>8&255,r=255&e;255===t?(t=0,255===n?(n=0,255===r?r=0:++r):++n):++t,e=0,e+=t<<16,e+=n<<8,e+=r}return e}G(e){0===(e[0]=this.q(e[0]))&&(e[1]=this.q(e[1]))}F(e,t,n){let r;if(!(r=t.length))return[];const s=_.l(t);for(let s=0;r>s;s+=4){this.G(n);const r=e.encrypt(n);t[s]^=r[0],t[s+1]^=r[1],t[s+2]^=r[2],t[s+3]^=r[3]}return _.u(t,s)}},Z=V.R;let $=q&&J&&typeof G.importKey==S,ee=q&&J&&typeof G.deriveBits==S;class te extends p{constructor({password:e,rawPassword:n,signed:r,encryptionStrength:o,checkPasswordOnly:c}){super({start(){t.assign(this,{ready:new u((e=>this.J=e)),password:ie(e,n),signed:r,X:o-1,pending:new i})},async transform(e,t){const n=this,{password:r,X:o,J:f,ready:a}=n;r?(await(async(e,t,n,r)=>{const i=await se(e,t,n,ce(r,0,j[t])),o=ce(r,j[t]);if(i[0]!=o[0]||i[1]!=o[1])throw new s(B)})(n,o,r,ce(e,0,j[o]+2)),e=ce(e,j[o]+2),c?t.error(new s(M)):f()):await a;const l=new i(e.length-L-(e.length-L)%K);t.enqueue(re(n,e,l,0,L,!0))},async flush(e){const{signed:t,Y:n,Z:r,pending:o,ready:c}=this;if(r&&n){await c;const f=ce(o,0,o.length-L),a=ce(o,o.length-L);let l=new i;if(f.length){const e=ae(Q,f);r.update(e);const t=n.update(e);l=fe(Q,t)}if(t){const e=ce(fe(Q,r.digest()),0,L);for(let t=0;L>t;t++)if(e[t]!=a[t])throw new s(E)}e.enqueue(l)}}})}}class ne extends p{constructor({password:e,rawPassword:n,encryptionStrength:r}){let s;super({start(){t.assign(this,{ready:new u((e=>this.J=e)),password:ie(e,n),X:r-1,pending:new i})},async transform(e,t){const n=this,{password:r,X:s,J:o,ready:c}=n;let f=new i;r?(f=await(async(e,t,n)=>{const r=U(new i(j[t]));return oe(r,await se(e,t,n,r))})(n,s,r),o()):await c;const a=new i(f.length+e.length-e.length%K);a.set(f,0),t.enqueue(re(n,e,a,f.length,0))},async flush(e){const{Y:t,Z:n,pending:r,ready:o}=this;if(n&&t){await o;let c=new i;if(r.length){const e=t.update(ae(Q,r));n.update(e),c=fe(Q,e)}s.signature=fe(Q,n.digest()).slice(0,L),e.enqueue(oe(c,s.signature))}}}),s=this}}function re(e,t,n,r,s,o){const{Y:c,Z:f,pending:a}=e,l=t.length-s;let u;for(a.length&&(t=oe(a,t),n=((e,t)=>{if(t&&t>e.length){const n=e;(e=new i(t)).set(n,0)}return e})(n,l-l%K)),u=0;l-K>=u;u+=K){const e=ae(Q,ce(t,u,u+K));o&&f.update(e);const s=c.update(e);o||f.update(s),n.set(fe(Q,s),u+r)}return e.pending=ce(t,u),n}async function se(n,r,s,o){n.password=null;const c=await(async(e,t,n,r,s)=>{if(!$)return V.importKey(t);try{return await G.importKey("raw",t,n,!1,s)}catch(e){return $=!1,V.importKey(t)}})(0,s,O,0,W),f=await(async(e,t,n)=>{if(!ee)return V.B(t,e.salt,T.iterations,n);try{return await G.deriveBits(e,t,n)}catch(r){return ee=!1,V.B(t,e.salt,T.iterations,n)}})(t.assign({salt:o},T),c,8*(2*H[r]+2)),a=new i(f),l=ae(Q,ce(a,0,H[r])),u=ae(Q,ce(a,H[r],2*H[r])),w=ce(a,2*H[r]);return t.assign(n,{keys:{key:l,$:u,passwordVerification:w},Y:new Y(new X(l),e.from(F)),Z:new Z(u)}),w}function ie(e,t){return t===k?(e=>{if(typeof w==v){const t=new i((e=unescape(encodeURIComponent(e))).length);for(let n=0;n<t.length;n++)t[n]=e.charCodeAt(n);return t}return(new w).encode(e)})(e):t}function oe(e,t){let n=e;return e.length+t.length&&(n=new i(e.length+t.length),n.set(e,0),n.set(t,e.length)),n}function ce(e,t,n){return e.subarray(t,n)}function fe(e,t){return e.p(t)}function ae(e,t){return e.m(t)}class le extends p{constructor({password:e,passwordVerification:n,checkPasswordOnly:r}){super({start(){t.assign(this,{password:e,passwordVerification:n}),de(this,e)},transform(e,t){const n=this;if(n.password){const t=we(n,e.subarray(0,12));if(n.password=null,t[11]!=n.passwordVerification)throw new s(B);e=e.subarray(12)}r?t.error(new s(M)):t.enqueue(we(n,e))}})}}class ue extends p{constructor({password:e,passwordVerification:n}){super({start(){t.assign(this,{password:e,passwordVerification:n}),de(this,e)},transform(e,t){const n=this;let r,s;if(n.password){n.password=null;const t=U(new i(12));t[11]=n.passwordVerification,r=new i(e.length+t.length),r.set(he(n,t),0),s=12}else r=new i(e.length),s=0;r.set(he(n,e),s),t.enqueue(r)}})}}function we(e,t){const n=new i(t.length);for(let r=0;r<t.length;r++)n[r]=ye(e)^t[r],pe(e,n[r]);return n}function he(e,t){const n=new i(t.length);for(let r=0;r<t.length;r++)n[r]=ye(e)^t[r],pe(e,t[r]);return n}function de(e,n){const r=[305419896,591751049,878082192];t.assign(e,{keys:r,ee:new x(r[0]),te:new x(r[2])});for(let t=0;t<n.length;t++)pe(e,n.charCodeAt(t))}function pe(e,t){let[n,s,i]=e.keys;e.ee.append([t]),n=~e.ee.get(),s=be(r.imul(be(s+me(n)),134775813)+1),e.te.append([s>>>24]),i=~e.te.get(),e.keys=[n,s,i]}function ye(e){const t=2|e.keys[2];return me(r.imul(t,1^t)>>>8)}function me(e){return 255&e}function be(e){return 4294967295&e}const ge="deflate-raw";class ke extends p{constructor(e,{chunkSize:t,CompressionStream:n,CompressionStreamNative:r}){super({});const{compressed:s,encrypted:i,useCompressionStream:o,zipCrypto:c,signed:f,level:a}=e,u=this;let w,h,d=Se(super.readable);i&&!c||!f||(w=new A,d=xe(d,w)),s&&(d=Ce(d,o,{level:a,chunkSize:t},r,n)),i&&(c?d=xe(d,new ue(e)):(h=new ne(e),d=xe(d,h))),ze(u,d,(()=>{let e;i&&!c&&(e=h.signature),i&&!c||!f||(e=new l(w.value.buffer).getUint32(0)),u.signature=e}))}}class ve extends p{constructor(e,{chunkSize:t,DecompressionStream:n,DecompressionStreamNative:r}){super({});const{zipCrypto:i,encrypted:o,signed:c,signature:f,compressed:a,useCompressionStream:u}=e;let w,h,d=Se(super.readable);o&&(i?d=xe(d,new le(e)):(h=new te(e),d=xe(d,h))),a&&(d=Ce(d,u,{chunkSize:t},r,n)),o&&!i||!c||(w=new A,d=xe(d,w)),ze(this,d,(()=>{if((!o||i)&&c){const e=new l(w.value.buffer);if(f!=e.getUint32(0,!1))throw new s(E)}}))}}function Se(e){return xe(e,new p({transform(e,t){e&&e.length&&t.enqueue(e)}}))}function ze(e,n,r){n=xe(n,new p({flush:r})),t.defineProperty(e,"readable",{get:()=>n})}function Ce(e,t,n,r,s){try{e=xe(e,new(t&&r?r:s)(ge,n))}catch(r){if(!t)return e;try{e=xe(e,new s(ge,n))}catch(t){return e}}return e}function xe(e,t){return e.pipeThrough(t)}const Ae="data",_e="close";class Ie extends p{constructor(e,n){super({});const r=this,{codecType:s}=e;let i;s.startsWith("deflate")?i=ke:s.startsWith("inflate")&&(i=ve);let o=0,c=0;const f=new i(e,n),a=super.readable,l=new p({transform(e,t){e&&e.length&&(c+=e.length,t.enqueue(e))},flush(){t.assign(r,{inputSize:c})}}),u=new p({transform(e,t){e&&e.length&&(o+=e.length,t.enqueue(e))},flush(){const{signature:e}=f;t.assign(r,{signature:e,outputSize:o,inputSize:c})}});t.defineProperty(r,"readable",{get:()=>a.pipeThrough(l).pipeThrough(f).pipeThrough(u)})}}class Pe extends p{constructor(e){let t;super({transform:function n(r,s){if(t){const e=new i(t.length+r.length);e.set(t),e.set(r,t.length),r=e,t=null}r.length>e?(s.enqueue(r.slice(0,e)),n(r.slice(e),s)):t=r},flush(e){t&&t.length&&e.enqueue(t)}})}}const De=new a,Ve=new a;let Re,Be=0,Ee=!0;async function Me(e){try{const{options:t,scripts:r,config:s}=e;if(r&&r.length)try{Ee?importScripts.apply(k,r):await Ue(r)}catch(e){Ee=!1,await Ue(r)}self.initCodec&&self.initCodec(),s.CompressionStreamNative=self.CompressionStream,s.DecompressionStreamNative=self.DecompressionStream,self.Deflate&&(s.CompressionStream=new z(self.Deflate)),self.Inflate&&(s.DecompressionStream=new z(self.Inflate));const i={highWaterMark:1},o=e.readable||new y({async pull(e){const t=new u((e=>De.set(Be,e)));Ke({type:"pull",messageId:Be}),Be=(Be+1)%n.MAX_SAFE_INTEGER;const{value:r,done:s}=await t;e.enqueue(r),s&&e.close()}},i),c=e.writable||new m({async write(e){let t;const r=new u((e=>t=e));Ve.set(Be,t),Ke({type:Ae,value:e,messageId:Be}),Be=(Be+1)%n.MAX_SAFE_INTEGER,await r}},i),f=new Ie(t,s);Re=new AbortController;const{signal:a}=Re;await o.pipeThrough(f).pipeThrough(new Pe(s.chunkSize)).pipeTo(c,{signal:a,preventClose:!0,preventAbort:!0}),await c.getWriter().close();const{signature:l,inputSize:w,outputSize:h}=f;Ke({type:_e,result:{signature:l,inputSize:w,outputSize:h}})}catch(e){Ne(e)}}async function Ue(e){for(const t of e)await import(t)}function Ke(e){let{value:t}=e;if(t)if(t.length)try{t=new i(t),e.value=t.buffer,d(e,[e.value])}catch(t){d(e)}else d(e);else d(e)}function Ne(e=new s("Unknown error")){const{message:t,stack:n,code:r,name:i}=e;d({error:{message:t,stack:n,code:r,name:i}})}addEventListener("message",(({data:e})=>{const{type:t,messageId:n,value:r,done:s}=e;try{if("start"==t&&Me(e),t==Ae){const e=De.get(n);De.delete(n),e({value:new i(r),done:s})}if("ack"==t){const e=Ve.get(n);Ve.delete(n),e()}t==_e&&Re.abort()}catch(e){Ne(e)}}));const Oe=-2;function Te(t){return We(t.map((([t,n])=>new e(t).fill(n,0,t))))}function We(t){return t.reduce(((t,n)=>t.concat(e.isArray(n)?We(n):n)),[])}const je=[0,1,2,3].concat(...Te([[2,4],[2,5],[4,6],[4,7],[8,8],[8,9],[16,10],[16,11],[32,12],[32,13],[64,14],[64,15],[2,0],[1,16],[1,17],[2,18],[2,19],[4,20],[4,21],[8,22],[8,23],[16,24],[16,25],[32,26],[32,27],[64,28],[64,29]]));function He(){const e=this;function t(e,t){let n=0;do{n|=1&e,e>>>=1,n<<=1}while(--t>0);return n>>>1}e.ne=n=>{const s=e.re,i=e.ie.se,o=e.ie.oe;let c,f,a,l=-1;for(n.ce=0,n.fe=573,c=0;o>c;c++)0!==s[2*c]?(n.ae[++n.ce]=l=c,n.le[c]=0):s[2*c+1]=0;for(;2>n.ce;)a=n.ae[++n.ce]=2>l?++l:0,s[2*a]=1,n.le[a]=0,n.ue--,i&&(n.we-=i[2*a+1]);for(e.he=l,c=r.floor(n.ce/2);c>=1;c--)n.de(s,c);a=o;do{c=n.ae[1],n.ae[1]=n.ae[n.ce--],n.de(s,1),f=n.ae[1],n.ae[--n.fe]=c,n.ae[--n.fe]=f,s[2*a]=s[2*c]+s[2*f],n.le[a]=r.max(n.le[c],n.le[f])+1,s[2*c+1]=s[2*f+1]=a,n.ae[1]=a++,n.de(s,1)}while(n.ce>=2);n.ae[--n.fe]=n.ae[1],(t=>{const n=e.re,r=e.ie.se,s=e.ie.pe,i=e.ie.ye,o=e.ie.me;let c,f,a,l,u,w,h=0;for(l=0;15>=l;l++)t.be[l]=0;for(n[2*t.ae[t.fe]+1]=0,c=t.fe+1;573>c;c++)f=t.ae[c],l=n[2*n[2*f+1]+1]+1,l>o&&(l=o,h++),n[2*f+1]=l,f>e.he||(t.be[l]++,u=0,i>f||(u=s[f-i]),w=n[2*f],t.ue+=w*(l+u),r&&(t.we+=w*(r[2*f+1]+u)));if(0!==h){do{for(l=o-1;0===t.be[l];)l--;t.be[l]--,t.be[l+1]+=2,t.be[o]--,h-=2}while(h>0);for(l=o;0!==l;l--)for(f=t.be[l];0!==f;)a=t.ae[--c],a>e.he||(n[2*a+1]!=l&&(t.ue+=(l-n[2*a+1])*n[2*a],n[2*a+1]=l),f--)}})(n),((e,n,r)=>{const s=[];let i,o,c,f=0;for(i=1;15>=i;i++)s[i]=f=f+r[i-1]<<1;for(o=0;n>=o;o++)c=e[2*o+1],0!==c&&(e[2*o]=t(s[c]++,c))})(s,e.he,n.be)}}function Le(e,t,n,r,s){const i=this;i.se=e,i.pe=t,i.ye=n,i.oe=r,i.me=s}He.ge=[0,1,2,3,4,5,6,7].concat(...Te([[2,8],[2,9],[2,10],[2,11],[4,12],[4,13],[4,14],[4,15],[8,16],[8,17],[8,18],[8,19],[16,20],[16,21],[16,22],[16,23],[32,24],[32,25],[32,26],[31,27],[1,28]])),He.ke=[0,1,2,3,4,5,6,7,8,10,12,14,16,20,24,28,32,40,48,56,64,80,96,112,128,160,192,224,0],He.ve=[0,1,2,3,4,6,8,12,16,24,32,48,64,96,128,192,256,384,512,768,1024,1536,2048,3072,4096,6144,8192,12288,16384,24576],He.Se=e=>256>e?je[e]:je[256+(e>>>7)],He.ze=[0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0],He.Ce=[0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13],He.xe=[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,3,7],He.Ae=[16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15];const Fe=Te([[144,8],[112,9],[24,7],[8,8]]);Le._e=We([12,140,76,204,44,172,108,236,28,156,92,220,60,188,124,252,2,130,66,194,34,162,98,226,18,146,82,210,50,178,114,242,10,138,74,202,42,170,106,234,26,154,90,218,58,186,122,250,6,134,70,198,38,166,102,230,22,150,86,214,54,182,118,246,14,142,78,206,46,174,110,238,30,158,94,222,62,190,126,254,1,129,65,193,33,161,97,225,17,145,81,209,49,177,113,241,9,137,73,201,41,169,105,233,25,153,89,217,57,185,121,249,5,133,69,197,37,165,101,229,21,149,85,213,53,181,117,245,13,141,77,205,45,173,109,237,29,157,93,221,61,189,125,253,19,275,147,403,83,339,211,467,51,307,179,435,115,371,243,499,11,267,139,395,75,331,203,459,43,299,171,427,107,363,235,491,27,283,155,411,91,347,219,475,59,315,187,443,123,379,251,507,7,263,135,391,71,327,199,455,39,295,167,423,103,359,231,487,23,279,151,407,87,343,215,471,55,311,183,439,119,375,247,503,15,271,143,399,79,335,207,463,47,303,175,431,111,367,239,495,31,287,159,415,95,351,223,479,63,319,191,447,127,383,255,511,0,64,32,96,16,80,48,112,8,72,40,104,24,88,56,120,4,68,36,100,20,84,52,116,3,131,67,195,35,163,99,227].map(((e,t)=>[e,Fe[t]])));const qe=Te([[30,5]]);function Ge(e,t,n,r,s){const i=this;i.Ie=e,i.Pe=t,i.De=n,i.Ve=r,i.Re=s}Le.Be=We([0,16,8,24,4,20,12,28,2,18,10,26,6,22,14,30,1,17,9,25,5,21,13,29,3,19,11,27,7,23].map(((e,t)=>[e,qe[t]]))),Le.Ee=new Le(Le._e,He.ze,257,286,15),Le.Me=new Le(Le.Be,He.Ce,0,30,15),Le.Ue=new Le(null,He.xe,0,19,7);const Je=[new Ge(0,0,0,0,0),new Ge(4,4,8,4,1),new Ge(4,5,16,8,1),new Ge(4,6,32,32,1),new Ge(4,4,16,16,2),new Ge(8,16,32,32,2),new Ge(8,16,128,128,2),new Ge(8,32,128,256,2),new Ge(32,128,258,1024,2),new Ge(32,258,258,4096,2)],Qe=["need dictionary","stream end","","","stream error","data error","","buffer error","",""],Xe=113,Ye=666,Ze=262;function $e(e,t,n,r){const s=e[2*t],i=e[2*n];return i>s||s==i&&r[t]<=r[n]}function et(){const e=this;let t,n,s,c,f,a,l,u,w,h,d,p,y,m,b,g,k,v,S,z,C,x,A,_,I,P,D,V,R,B,E,M,U;const K=new He,N=new He,O=new He;let T,W,j,H,L,F;function q(){let t;for(t=0;286>t;t++)E[2*t]=0;for(t=0;30>t;t++)M[2*t]=0;for(t=0;19>t;t++)U[2*t]=0;E[512]=1,e.ue=e.we=0,W=j=0}function G(e,t){let n,r=-1,s=e[1],i=0,o=7,c=4;0===s&&(o=138,c=3),e[2*(t+1)+1]=65535;for(let f=0;t>=f;f++)n=s,s=e[2*(f+1)+1],++i<o&&n==s||(c>i?U[2*n]+=i:0!==n?(n!=r&&U[2*n]++,U[32]++):i>10?U[36]++:U[34]++,i=0,r=n,0===s?(o=138,c=3):n==s?(o=6,c=3):(o=7,c=4))}function J(t){e.Ke[e.pending++]=t}function Q(e){J(255&e),J(e>>>8&255)}function X(e,t){let n;const r=t;F>16-r?(n=e,L|=n<<F&65535,Q(L),L=n>>>16-F,F+=r-16):(L|=e<<F&65535,F+=r)}function Y(e,t){const n=2*e;X(65535&t[n],65535&t[n+1])}function Z(e,t){let n,r,s=-1,i=e[1],o=0,c=7,f=4;for(0===i&&(c=138,f=3),n=0;t>=n;n++)if(r=i,i=e[2*(n+1)+1],++o>=c||r!=i){if(f>o)do{Y(r,U)}while(0!=--o);else 0!==r?(r!=s&&(Y(r,U),o--),Y(16,U),X(o-3,2)):o>10?(Y(18,U),X(o-11,7)):(Y(17,U),X(o-3,3));o=0,s=r,0===i?(c=138,f=3):r==i?(c=6,f=3):(c=7,f=4)}}function $(){16==F?(Q(L),L=0,F=0):8>F||(J(255&L),L>>>=8,F-=8)}function ee(t,n){let s,i,o;if(e.Ne[W]=t,e.Oe[W]=255&n,W++,0===t?E[2*n]++:(j++,t--,E[2*(He.ge[n]+256+1)]++,M[2*He.Se(t)]++),!(8191&W)&&D>2){for(s=8*W,i=C-k,o=0;30>o;o++)s+=M[2*o]*(5+He.Ce[o]);if(s>>>=3,j<r.floor(W/2)&&s<r.floor(i/2))return!0}return W==T-1}function te(t,n){let r,s,i,o,c=0;if(0!==W)do{r=e.Ne[c],s=e.Oe[c],c++,0===r?Y(s,t):(i=He.ge[s],Y(i+256+1,t),o=He.ze[i],0!==o&&(s-=He.ke[i],X(s,o)),r--,i=He.Se(r),Y(i,n),o=He.Ce[i],0!==o&&(r-=He.ve[i],X(r,o)))}while(W>c);Y(256,t),H=t[513]}function ne(){F>8?Q(L):F>0&&J(255&L),L=0,F=0}function re(t,n,r){X(0+(r?1:0),3),((t,n)=>{ne(),H=8,Q(n),Q(~n),e.Ke.set(u.subarray(t,t+n),e.pending),e.pending+=n})(t,n)}function se(n){((t,n,r)=>{let s,i,o=0;D>0?(K.ne(e),N.ne(e),o=(()=>{let t;for(G(E,K.he),G(M,N.he),O.ne(e),t=18;t>=3&&0===U[2*He.Ae[t]+1];t--);return e.ue+=14+3*(t+1),t})(),s=e.ue+3+7>>>3,i=e.we+3+7>>>3,i>s||(s=i)):s=i=n+5,n+4>s||-1==t?i==s?(X(2+(r?1:0),3),te(Le._e,Le.Be)):(X(4+(r?1:0),3),((e,t,n)=>{let r;for(X(e-257,5),X(t-1,5),X(n-4,4),r=0;n>r;r++)X(U[2*He.Ae[r]+1],3);Z(E,e-1),Z(M,t-1)})(K.he+1,N.he+1,o+1),te(E,M)):re(t,n,r),q(),r&&ne()})(0>k?-1:k,C-k,n),k=C,t.Te()}function ie(){let e,n,r,s;do{if(s=w-A-C,0===s&&0===C&&0===A)s=f;else if(-1==s)s--;else if(C>=f+f-Ze){u.set(u.subarray(f,f+f),0),x-=f,C-=f,k-=f,e=y,r=e;do{n=65535&d[--r],d[r]=f>n?0:n-f}while(0!=--e);e=f,r=e;do{n=65535&h[--r],h[r]=f>n?0:n-f}while(0!=--e);s+=f}if(0===t.We)return;e=t.je(u,C+A,s),A+=e,3>A||(p=255&u[C],p=(p<<g^255&u[C+1])&b)}while(Ze>A&&0!==t.We)}function oe(e){let t,n,r=I,s=C,i=_;const o=C>f-Ze?C-(f-Ze):0;let c=B;const a=l,w=C+258;let d=u[s+i-1],p=u[s+i];R>_||(r>>=2),c>A&&(c=A);do{if(t=e,u[t+i]==p&&u[t+i-1]==d&&u[t]==u[s]&&u[++t]==u[s+1]){s+=2,t++;do{}while(u[++s]==u[++t]&&u[++s]==u[++t]&&u[++s]==u[++t]&&u[++s]==u[++t]&&u[++s]==u[++t]&&u[++s]==u[++t]&&u[++s]==u[++t]&&u[++s]==u[++t]&&w>s);if(n=258-(w-s),s=w-258,n>i){if(x=e,i=n,n>=c)break;d=u[s+i-1],p=u[s+i]}}}while((e=65535&h[e&a])>o&&0!=--r);return i>A?A:i}e.le=[],e.be=[],e.ae=[],E=[],M=[],U=[],e.de=(t,n)=>{const r=e.ae,s=r[n];let i=n<<1;for(;i<=e.ce&&(i<e.ce&&$e(t,r[i+1],r[i],e.le)&&i++,!$e(t,s,r[i],e.le));)r[n]=r[i],n=i,i<<=1;r[n]=s},e.He=(t,S,x,W,j,G)=>(W||(W=8),j||(j=8),G||(G=0),t.Le=null,-1==S&&(S=6),1>j||j>9||8!=W||9>x||x>15||0>S||S>9||0>G||G>2?Oe:(t.Fe=e,a=x,f=1<<a,l=f-1,m=j+7,y=1<<m,b=y-1,g=r.floor((m+3-1)/3),u=new i(2*f),h=[],d=[],T=1<<j+6,e.Ke=new i(4*T),s=4*T,e.Ne=new o(T),e.Oe=new i(T),D=S,V=G,(t=>(t.qe=t.Ge=0,t.Le=null,e.pending=0,e.Je=0,n=Xe,c=0,K.re=E,K.ie=Le.Ee,N.re=M,N.ie=Le.Me,O.re=U,O.ie=Le.Ue,L=0,F=0,H=8,q(),(()=>{w=2*f,d[y-1]=0;for(let e=0;y-1>e;e++)d[e]=0;P=Je[D].Pe,R=Je[D].Ie,B=Je[D].De,I=Je[D].Ve,C=0,k=0,A=0,v=_=2,z=0,p=0})(),0))(t))),e.Qe=()=>42!=n&&n!=Xe&&n!=Ye?Oe:(e.Oe=null,e.Ne=null,e.Ke=null,d=null,h=null,u=null,e.Fe=null,n==Xe?-3:0),e.Xe=(e,t,n)=>{let r=0;return-1==t&&(t=6),0>t||t>9||0>n||n>2?Oe:(Je[D].Re!=Je[t].Re&&0!==e.qe&&(r=e.Ye(1)),D!=t&&(D=t,P=Je[D].Pe,R=Je[D].Ie,B=Je[D].De,I=Je[D].Ve),V=n,r)},e.Ze=(e,t,r)=>{let s,i=r,o=0;if(!t||42!=n)return Oe;if(3>i)return 0;for(i>f-Ze&&(i=f-Ze,o=r-i),u.set(t.subarray(o,o+i),0),C=i,k=i,p=255&u[0],p=(p<<g^255&u[1])&b,s=0;i-3>=s;s++)p=(p<<g^255&u[s+2])&b,h[s&l]=d[p],d[p]=s;return 0},e.Ye=(r,i)=>{let o,w,m,I,R;if(i>4||0>i)return Oe;if(!r.$e||!r.et&&0!==r.We||n==Ye&&4!=i)return r.Le=Qe[4],Oe;if(0===r.tt)return r.Le=Qe[7],-5;var B;if(t=r,I=c,c=i,42==n&&(w=8+(a-8<<4)<<8,m=(D-1&255)>>1,m>3&&(m=3),w|=m<<6,0!==C&&(w|=32),w+=31-w%31,n=Xe,J((B=w)>>8&255),J(255&B)),0!==e.pending){if(t.Te(),0===t.tt)return c=-1,0}else if(0===t.We&&I>=i&&4!=i)return t.Le=Qe[7],-5;if(n==Ye&&0!==t.We)return r.Le=Qe[7],-5;if(0!==t.We||0!==A||0!=i&&n!=Ye){switch(R=-1,Je[D].Re){case 0:R=(e=>{let n,r=65535;for(r>s-5&&(r=s-5);;){if(1>=A){if(ie(),0===A&&0==e)return 0;if(0===A)break}if(C+=A,A=0,n=k+r,(0===C||C>=n)&&(A=C-n,C=n,se(!1),0===t.tt))return 0;if(C-k>=f-Ze&&(se(!1),0===t.tt))return 0}return se(4==e),0===t.tt?4==e?2:0:4==e?3:1})(i);break;case 1:R=(e=>{let n,r=0;for(;;){if(Ze>A){if(ie(),Ze>A&&0==e)return 0;if(0===A)break}if(3>A||(p=(p<<g^255&u[C+2])&b,r=65535&d[p],h[C&l]=d[p],d[p]=C),0===r||(C-r&65535)>f-Ze||2!=V&&(v=oe(r)),3>v)n=ee(0,255&u[C]),A--,C++;else if(n=ee(C-x,v-3),A-=v,v>P||3>A)C+=v,v=0,p=255&u[C],p=(p<<g^255&u[C+1])&b;else{v--;do{C++,p=(p<<g^255&u[C+2])&b,r=65535&d[p],h[C&l]=d[p],d[p]=C}while(0!=--v);C++}if(n&&(se(!1),0===t.tt))return 0}return se(4==e),0===t.tt?4==e?2:0:4==e?3:1})(i);break;case 2:R=(e=>{let n,r,s=0;for(;;){if(Ze>A){if(ie(),Ze>A&&0==e)return 0;if(0===A)break}if(3>A||(p=(p<<g^255&u[C+2])&b,s=65535&d[p],h[C&l]=d[p],d[p]=C),_=v,S=x,v=2,0!==s&&P>_&&f-Ze>=(C-s&65535)&&(2!=V&&(v=oe(s)),5>=v&&(1==V||3==v&&C-x>4096)&&(v=2)),3>_||v>_)if(0!==z){if(n=ee(0,255&u[C-1]),n&&se(!1),C++,A--,0===t.tt)return 0}else z=1,C++,A--;else{r=C+A-3,n=ee(C-1-S,_-3),A-=_-1,_-=2;do{++C>r||(p=(p<<g^255&u[C+2])&b,s=65535&d[p],h[C&l]=d[p],d[p]=C)}while(0!=--_);if(z=0,v=2,C++,n&&(se(!1),0===t.tt))return 0}}return 0!==z&&(n=ee(0,255&u[C-1]),z=0),se(4==e),0===t.tt?4==e?2:0:4==e?3:1})(i)}if(2!=R&&3!=R||(n=Ye),0==R||2==R)return 0===t.tt&&(c=-1),0;if(1==R){if(1==i)X(2,3),Y(256,Le._e),$(),9>1+H+10-F&&(X(2,3),Y(256,Le._e),$()),H=7;else if(re(0,0,!1),3==i)for(o=0;y>o;o++)d[o]=0;if(t.Te(),0===t.tt)return c=-1,0}}return 4!=i?0:1}}function tt(){const e=this;e.nt=0,e.rt=0,e.We=0,e.qe=0,e.tt=0,e.Ge=0}function nt(e){const t=new tt,n=(o=e&&e.chunkSize?e.chunkSize:65536)+5*(r.floor(o/16383)+1);var o;const c=new i(n);let f=e?e.level:-1;void 0===f&&(f=-1),t.He(f),t.$e=c,this.append=(e,r)=>{let o,f,a=0,l=0,u=0;const w=[];if(e.length){t.nt=0,t.et=e,t.We=e.length;do{if(t.rt=0,t.tt=n,o=t.Ye(0),0!=o)throw new s("deflating: "+t.Le);t.rt&&(t.rt==n?w.push(new i(c)):w.push(c.subarray(0,t.rt))),u+=t.rt,r&&t.nt>0&&t.nt!=a&&(r(t.nt),a=t.nt)}while(t.We>0||0===t.tt);return w.length>1?(f=new i(u),w.forEach((e=>{f.set(e,l),l+=e.length}))):f=w[0]?new i(w[0]):new i,f}},this.flush=()=>{let e,r,o=0,f=0;const a=[];do{if(t.rt=0,t.tt=n,e=t.Ye(4),1!=e&&0!=e)throw new s("deflating: "+t.Le);n-t.tt>0&&a.push(c.slice(0,t.rt)),f+=t.rt}while(t.We>0||0===t.tt);return t.Qe(),r=new i(f),a.forEach((e=>{r.set(e,o),o+=e.length})),r}}tt.prototype={He(e,t){const n=this;return n.Fe=new et,t||(t=15),n.Fe.He(n,e,t)},Ye(e){const t=this;return t.Fe?t.Fe.Ye(t,e):Oe},Qe(){const e=this;if(!e.Fe)return Oe;const t=e.Fe.Qe();return e.Fe=null,t},Xe(e,t){const n=this;return n.Fe?n.Fe.Xe(n,e,t):Oe},Ze(e,t){const n=this;return n.Fe?n.Fe.Ze(n,e,t):Oe},je(e,t,n){const r=this;let s=r.We;return s>n&&(s=n),0===s?0:(r.We-=s,e.set(r.et.subarray(r.nt,r.nt+s),t),r.nt+=s,r.qe+=s,s)},Te(){const e=this;let t=e.Fe.pending;t>e.tt&&(t=e.tt),0!==t&&(e.$e.set(e.Fe.Ke.subarray(e.Fe.Je,e.Fe.Je+t),e.rt),e.rt+=t,e.Fe.Je+=t,e.Ge+=t,e.tt-=t,e.Fe.pending-=t,0===e.Fe.pending&&(e.Fe.Je=0))}};const rt=-2,st=-3,it=-5,ot=[0,1,3,7,15,31,63,127,255,511,1023,2047,4095,8191,16383,32767,65535],ct=[96,7,256,0,8,80,0,8,16,84,8,115,82,7,31,0,8,112,0,8,48,0,9,192,80,7,10,0,8,96,0,8,32,0,9,160,0,8,0,0,8,128,0,8,64,0,9,224,80,7,6,0,8,88,0,8,24,0,9,144,83,7,59,0,8,120,0,8,56,0,9,208,81,7,17,0,8,104,0,8,40,0,9,176,0,8,8,0,8,136,0,8,72,0,9,240,80,7,4,0,8,84,0,8,20,85,8,227,83,7,43,0,8,116,0,8,52,0,9,200,81,7,13,0,8,100,0,8,36,0,9,168,0,8,4,0,8,132,0,8,68,0,9,232,80,7,8,0,8,92,0,8,28,0,9,152,84,7,83,0,8,124,0,8,60,0,9,216,82,7,23,0,8,108,0,8,44,0,9,184,0,8,12,0,8,140,0,8,76,0,9,248,80,7,3,0,8,82,0,8,18,85,8,163,83,7,35,0,8,114,0,8,50,0,9,196,81,7,11,0,8,98,0,8,34,0,9,164,0,8,2,0,8,130,0,8,66,0,9,228,80,7,7,0,8,90,0,8,26,0,9,148,84,7,67,0,8,122,0,8,58,0,9,212,82,7,19,0,8,106,0,8,42,0,9,180,0,8,10,0,8,138,0,8,74,0,9,244,80,7,5,0,8,86,0,8,22,192,8,0,83,7,51,0,8,118,0,8,54,0,9,204,81,7,15,0,8,102,0,8,38,0,9,172,0,8,6,0,8,134,0,8,70,0,9,236,80,7,9,0,8,94,0,8,30,0,9,156,84,7,99,0,8,126,0,8,62,0,9,220,82,7,27,0,8,110,0,8,46,0,9,188,0,8,14,0,8,142,0,8,78,0,9,252,96,7,256,0,8,81,0,8,17,85,8,131,82,7,31,0,8,113,0,8,49,0,9,194,80,7,10,0,8,97,0,8,33,0,9,162,0,8,1,0,8,129,0,8,65,0,9,226,80,7,6,0,8,89,0,8,25,0,9,146,83,7,59,0,8,121,0,8,57,0,9,210,81,7,17,0,8,105,0,8,41,0,9,178,0,8,9,0,8,137,0,8,73,0,9,242,80,7,4,0,8,85,0,8,21,80,8,258,83,7,43,0,8,117,0,8,53,0,9,202,81,7,13,0,8,101,0,8,37,0,9,170,0,8,5,0,8,133,0,8,69,0,9,234,80,7,8,0,8,93,0,8,29,0,9,154,84,7,83,0,8,125,0,8,61,0,9,218,82,7,23,0,8,109,0,8,45,0,9,186,0,8,13,0,8,141,0,8,77,0,9,250,80,7,3,0,8,83,0,8,19,85,8,195,83,7,35,0,8,115,0,8,51,0,9,198,81,7,11,0,8,99,0,8,35,0,9,166,0,8,3,0,8,131,0,8,67,0,9,230,80,7,7,0,8,91,0,8,27,0,9,150,84,7,67,0,8,123,0,8,59,0,9,214,82,7,19,0,8,107,0,8,43,0,9,182,0,8,11,0,8,139,0,8,75,0,9,246,80,7,5,0,8,87,0,8,23,192,8,0,83,7,51,0,8,119,0,8,55,0,9,206,81,7,15,0,8,103,0,8,39,0,9,174,0,8,7,0,8,135,0,8,71,0,9,238,80,7,9,0,8,95,0,8,31,0,9,158,84,7,99,0,8,127,0,8,63,0,9,222,82,7,27,0,8,111,0,8,47,0,9,190,0,8,15,0,8,143,0,8,79,0,9,254,96,7,256,0,8,80,0,8,16,84,8,115,82,7,31,0,8,112,0,8,48,0,9,193,80,7,10,0,8,96,0,8,32,0,9,161,0,8,0,0,8,128,0,8,64,0,9,225,80,7,6,0,8,88,0,8,24,0,9,145,83,7,59,0,8,120,0,8,56,0,9,209,81,7,17,0,8,104,0,8,40,0,9,177,0,8,8,0,8,136,0,8,72,0,9,241,80,7,4,0,8,84,0,8,20,85,8,227,83,7,43,0,8,116,0,8,52,0,9,201,81,7,13,0,8,100,0,8,36,0,9,169,0,8,4,0,8,132,0,8,68,0,9,233,80,7,8,0,8,92,0,8,28,0,9,153,84,7,83,0,8,124,0,8,60,0,9,217,82,7,23,0,8,108,0,8,44,0,9,185,0,8,12,0,8,140,0,8,76,0,9,249,80,7,3,0,8,82,0,8,18,85,8,163,83,7,35,0,8,114,0,8,50,0,9,197,81,7,11,0,8,98,0,8,34,0,9,165,0,8,2,0,8,130,0,8,66,0,9,229,80,7,7,0,8,90,0,8,26,0,9,149,84,7,67,0,8,122,0,8,58,0,9,213,82,7,19,0,8,106,0,8,42,0,9,181,0,8,10,0,8,138,0,8,74,0,9,245,80,7,5,0,8,86,0,8,22,192,8,0,83,7,51,0,8,118,0,8,54,0,9,205,81,7,15,0,8,102,0,8,38,0,9,173,0,8,6,0,8,134,0,8,70,0,9,237,80,7,9,0,8,94,0,8,30,0,9,157,84,7,99,0,8,126,0,8,62,0,9,221,82,7,27,0,8,110,0,8,46,0,9,189,0,8,14,0,8,142,0,8,78,0,9,253,96,7,256,0,8,81,0,8,17,85,8,131,82,7,31,0,8,113,0,8,49,0,9,195,80,7,10,0,8,97,0,8,33,0,9,163,0,8,1,0,8,129,0,8,65,0,9,227,80,7,6,0,8,89,0,8,25,0,9,147,83,7,59,0,8,121,0,8,57,0,9,211,81,7,17,0,8,105,0,8,41,0,9,179,0,8,9,0,8,137,0,8,73,0,9,243,80,7,4,0,8,85,0,8,21,80,8,258,83,7,43,0,8,117,0,8,53,0,9,203,81,7,13,0,8,101,0,8,37,0,9,171,0,8,5,0,8,133,0,8,69,0,9,235,80,7,8,0,8,93,0,8,29,0,9,155,84,7,83,0,8,125,0,8,61,0,9,219,82,7,23,0,8,109,0,8,45,0,9,187,0,8,13,0,8,141,0,8,77,0,9,251,80,7,3,0,8,83,0,8,19,85,8,195,83,7,35,0,8,115,0,8,51,0,9,199,81,7,11,0,8,99,0,8,35,0,9,167,0,8,3,0,8,131,0,8,67,0,9,231,80,7,7,0,8,91,0,8,27,0,9,151,84,7,67,0,8,123,0,8,59,0,9,215,82,7,19,0,8,107,0,8,43,0,9,183,0,8,11,0,8,139,0,8,75,0,9,247,80,7,5,0,8,87,0,8,23,192,8,0,83,7,51,0,8,119,0,8,55,0,9,207,81,7,15,0,8,103,0,8,39,0,9,175,0,8,7,0,8,135,0,8,71,0,9,239,80,7,9,0,8,95,0,8,31,0,9,159,84,7,99,0,8,127,0,8,63,0,9,223,82,7,27,0,8,111,0,8,47,0,9,191,0,8,15,0,8,143,0,8,79,0,9,255],ft=[80,5,1,87,5,257,83,5,17,91,5,4097,81,5,5,89,5,1025,85,5,65,93,5,16385,80,5,3,88,5,513,84,5,33,92,5,8193,82,5,9,90,5,2049,86,5,129,192,5,24577,80,5,2,87,5,385,83,5,25,91,5,6145,81,5,7,89,5,1537,85,5,97,93,5,24577,80,5,4,88,5,769,84,5,49,92,5,12289,82,5,13,90,5,3073,86,5,193,192,5,24577],at=[3,4,5,6,7,8,9,10,11,13,15,17,19,23,27,31,35,43,51,59,67,83,99,115,131,163,195,227,258,0,0],lt=[0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0,112,112],ut=[1,2,3,4,5,7,9,13,17,25,33,49,65,97,129,193,257,385,513,769,1025,1537,2049,3073,4097,6145,8193,12289,16385,24577],wt=[0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13];function ht(){let e,t,n,r,s,i;function o(e,t,o,c,f,a,l,u,w,h,d){let p,y,m,b,g,k,v,S,z,C,x,A,_,I,P;C=0,g=o;do{n[e[t+C]]++,C++,g--}while(0!==g);if(n[0]==o)return l[0]=-1,u[0]=0,0;for(S=u[0],k=1;15>=k&&0===n[k];k++);for(v=k,k>S&&(S=k),g=15;0!==g&&0===n[g];g--);for(m=g,S>g&&(S=g),u[0]=S,I=1<<k;g>k;k++,I<<=1)if(0>(I-=n[k]))return st;if(0>(I-=n[g]))return st;for(n[g]+=I,i[1]=k=0,C=1,_=2;0!=--g;)i[_]=k+=n[C],_++,C++;g=0,C=0;do{0!==(k=e[t+C])&&(d[i[k]++]=g),C++}while(++g<o);for(o=i[m],i[0]=g=0,C=0,b=-1,A=-S,s[0]=0,x=0,P=0;m>=v;v++)for(p=n[v];0!=p--;){for(;v>A+S;){if(b++,A+=S,P=m-A,P=P>S?S:P,(y=1<<(k=v-A))>p+1&&(y-=p+1,_=v,P>k))for(;++k<P&&(y<<=1)>n[++_];)y-=n[_];if(P=1<<k,h[0]+P>1440)return st;s[b]=x=h[0],h[0]+=P,0!==b?(i[b]=g,r[0]=k,r[1]=S,k=g>>>A-S,r[2]=x-s[b-1]-k,w.set(r,3*(s[b-1]+k))):l[0]=x}for(r[1]=v-A,o>C?d[C]<c?(r[0]=256>d[C]?0:96,r[2]=d[C++]):(r[0]=a[d[C]-c]+16+64,r[2]=f[d[C++]-c]):r[0]=192,y=1<<v-A,k=g>>>A;P>k;k+=y)w.set(r,3*(x+k));for(k=1<<v-1;g&k;k>>>=1)g^=k;for(g^=k,z=(1<<A)-1;(g&z)!=i[b];)b--,A-=S,z=(1<<A)-1}return 0!==I&&1!=m?it:0}function c(o){let c;for(e||(e=[],t=[],n=new f(16),r=[],s=new f(15),i=new f(16)),t.length<o&&(t=[]),c=0;o>c;c++)t[c]=0;for(c=0;16>c;c++)n[c]=0;for(c=0;3>c;c++)r[c]=0;s.set(n.subarray(0,15),0),i.set(n.subarray(0,16),0)}this.st=(n,r,s,i,f)=>{let a;return c(19),e[0]=0,a=o(n,0,19,19,null,null,s,r,i,e,t),a==st?f.Le="oversubscribed dynamic bit lengths tree":a!=it&&0!==r[0]||(f.Le="incomplete dynamic bit lengths tree",a=st),a},this.it=(n,r,s,i,f,a,l,u,w)=>{let h;return c(288),e[0]=0,h=o(s,0,n,257,at,lt,a,i,u,e,t),0!=h||0===i[0]?(h==st?w.Le="oversubscribed literal/length tree":-4!=h&&(w.Le="incomplete literal/length tree",h=st),h):(c(288),h=o(s,n,r,0,ut,wt,l,f,u,e,t),0!=h||0===f[0]&&n>257?(h==st?w.Le="oversubscribed distance tree":h==it?(w.Le="incomplete distance tree",h=st):-4!=h&&(w.Le="empty distance tree with lengths",h=st),h):0)}}function dt(){const e=this;let t,n,r,s,i=0,o=0,c=0,f=0,a=0,l=0,u=0,w=0,h=0,d=0;function p(e,t,n,r,s,i,o,c){let f,a,l,u,w,h,d,p,y,m,b,g,k,v,S,z;d=c.nt,p=c.We,w=o.ot,h=o.ct,y=o.write,m=y<o.read?o.read-y-1:o.end-y,b=ot[e],g=ot[t];do{for(;20>h;)p--,w|=(255&c.ft(d++))<<h,h+=8;if(f=w&b,a=n,l=r,z=3*(l+f),0!==(u=a[z]))for(;;){if(w>>=a[z+1],h-=a[z+1],16&u){for(u&=15,k=a[z+2]+(w&ot[u]),w>>=u,h-=u;15>h;)p--,w|=(255&c.ft(d++))<<h,h+=8;for(f=w&g,a=s,l=i,z=3*(l+f),u=a[z];;){if(w>>=a[z+1],h-=a[z+1],16&u){for(u&=15;u>h;)p--,w|=(255&c.ft(d++))<<h,h+=8;if(v=a[z+2]+(w&ot[u]),w>>=u,h-=u,m-=k,v>y){S=y-v;do{S+=o.end}while(0>S);if(u=o.end-S,k>u){if(k-=u,y-S>0&&u>y-S)do{o.lt[y++]=o.lt[S++]}while(0!=--u);else o.lt.set(o.lt.subarray(S,S+u),y),y+=u,S+=u,u=0;S=0}}else S=y-v,y-S>0&&2>y-S?(o.lt[y++]=o.lt[S++],o.lt[y++]=o.lt[S++],k-=2):(o.lt.set(o.lt.subarray(S,S+2),y),y+=2,S+=2,k-=2);if(y-S>0&&k>y-S)do{o.lt[y++]=o.lt[S++]}while(0!=--k);else o.lt.set(o.lt.subarray(S,S+k),y),y+=k,S+=k,k=0;break}if(64&u)return c.Le="invalid distance code",k=c.We-p,k=k>h>>3?h>>3:k,p+=k,d-=k,h-=k<<3,o.ot=w,o.ct=h,c.We=p,c.qe+=d-c.nt,c.nt=d,o.write=y,st;f+=a[z+2],f+=w&ot[u],z=3*(l+f),u=a[z]}break}if(64&u)return 32&u?(k=c.We-p,k=k>h>>3?h>>3:k,p+=k,d-=k,h-=k<<3,o.ot=w,o.ct=h,c.We=p,c.qe+=d-c.nt,c.nt=d,o.write=y,1):(c.Le="invalid literal/length code",k=c.We-p,k=k>h>>3?h>>3:k,p+=k,d-=k,h-=k<<3,o.ot=w,o.ct=h,c.We=p,c.qe+=d-c.nt,c.nt=d,o.write=y,st);if(f+=a[z+2],f+=w&ot[u],z=3*(l+f),0===(u=a[z])){w>>=a[z+1],h-=a[z+1],o.lt[y++]=a[z+2],m--;break}}else w>>=a[z+1],h-=a[z+1],o.lt[y++]=a[z+2],m--}while(m>=258&&p>=10);return k=c.We-p,k=k>h>>3?h>>3:k,p+=k,d-=k,h-=k<<3,o.ot=w,o.ct=h,c.We=p,c.qe+=d-c.nt,c.nt=d,o.write=y,0}e.init=(e,i,o,c,f,a)=>{t=0,u=e,w=i,r=o,h=c,s=f,d=a,n=null},e.ut=(e,y,m)=>{let b,g,k,v,S,z,C,x=0,A=0,_=0;for(_=y.nt,v=y.We,x=e.ot,A=e.ct,S=e.write,z=S<e.read?e.read-S-1:e.end-S;;)switch(t){case 0:if(z>=258&&v>=10&&(e.ot=x,e.ct=A,y.We=v,y.qe+=_-y.nt,y.nt=_,e.write=S,m=p(u,w,r,h,s,d,e,y),_=y.nt,v=y.We,x=e.ot,A=e.ct,S=e.write,z=S<e.read?e.read-S-1:e.end-S,0!=m)){t=1==m?7:9;break}c=u,n=r,o=h,t=1;case 1:for(b=c;b>A;){if(0===v)return e.ot=x,e.ct=A,y.We=v,y.qe+=_-y.nt,y.nt=_,e.write=S,e.wt(y,m);m=0,v--,x|=(255&y.ft(_++))<<A,A+=8}if(g=3*(o+(x&ot[b])),x>>>=n[g+1],A-=n[g+1],k=n[g],0===k){f=n[g+2],t=6;break}if(16&k){a=15&k,i=n[g+2],t=2;break}if(!(64&k)){c=k,o=g/3+n[g+2];break}if(32&k){t=7;break}return t=9,y.Le="invalid literal/length code",m=st,e.ot=x,e.ct=A,y.We=v,y.qe+=_-y.nt,y.nt=_,e.write=S,e.wt(y,m);case 2:for(b=a;b>A;){if(0===v)return e.ot=x,e.ct=A,y.We=v,y.qe+=_-y.nt,y.nt=_,e.write=S,e.wt(y,m);m=0,v--,x|=(255&y.ft(_++))<<A,A+=8}i+=x&ot[b],x>>=b,A-=b,c=w,n=s,o=d,t=3;case 3:for(b=c;b>A;){if(0===v)return e.ot=x,e.ct=A,y.We=v,y.qe+=_-y.nt,y.nt=_,e.write=S,e.wt(y,m);m=0,v--,x|=(255&y.ft(_++))<<A,A+=8}if(g=3*(o+(x&ot[b])),x>>=n[g+1],A-=n[g+1],k=n[g],16&k){a=15&k,l=n[g+2],t=4;break}if(!(64&k)){c=k,o=g/3+n[g+2];break}return t=9,y.Le="invalid distance code",m=st,e.ot=x,e.ct=A,y.We=v,y.qe+=_-y.nt,y.nt=_,e.write=S,e.wt(y,m);case 4:for(b=a;b>A;){if(0===v)return e.ot=x,e.ct=A,y.We=v,y.qe+=_-y.nt,y.nt=_,e.write=S,e.wt(y,m);m=0,v--,x|=(255&y.ft(_++))<<A,A+=8}l+=x&ot[b],x>>=b,A-=b,t=5;case 5:for(C=S-l;0>C;)C+=e.end;for(;0!==i;){if(0===z&&(S==e.end&&0!==e.read&&(S=0,z=S<e.read?e.read-S-1:e.end-S),0===z&&(e.write=S,m=e.wt(y,m),S=e.write,z=S<e.read?e.read-S-1:e.end-S,S==e.end&&0!==e.read&&(S=0,z=S<e.read?e.read-S-1:e.end-S),0===z)))return e.ot=x,e.ct=A,y.We=v,y.qe+=_-y.nt,y.nt=_,e.write=S,e.wt(y,m);e.lt[S++]=e.lt[C++],z--,C==e.end&&(C=0),i--}t=0;break;case 6:if(0===z&&(S==e.end&&0!==e.read&&(S=0,z=S<e.read?e.read-S-1:e.end-S),0===z&&(e.write=S,m=e.wt(y,m),S=e.write,z=S<e.read?e.read-S-1:e.end-S,S==e.end&&0!==e.read&&(S=0,z=S<e.read?e.read-S-1:e.end-S),0===z)))return e.ot=x,e.ct=A,y.We=v,y.qe+=_-y.nt,y.nt=_,e.write=S,e.wt(y,m);m=0,e.lt[S++]=f,z--,t=0;break;case 7:if(A>7&&(A-=8,v++,_--),e.write=S,m=e.wt(y,m),S=e.write,z=S<e.read?e.read-S-1:e.end-S,e.read!=e.write)return e.ot=x,e.ct=A,y.We=v,y.qe+=_-y.nt,y.nt=_,e.write=S,e.wt(y,m);t=8;case 8:return m=1,e.ot=x,e.ct=A,y.We=v,y.qe+=_-y.nt,y.nt=_,e.write=S,e.wt(y,m);case 9:return m=st,e.ot=x,e.ct=A,y.We=v,y.qe+=_-y.nt,y.nt=_,e.write=S,e.wt(y,m);default:return m=rt,e.ot=x,e.ct=A,y.We=v,y.qe+=_-y.nt,y.nt=_,e.write=S,e.wt(y,m)}},e.ht=()=>{}}ht.dt=(e,t,n,r)=>(e[0]=9,t[0]=5,n[0]=ct,r[0]=ft,0);const pt=[16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15];function yt(e,t){const n=this;let r,s=0,o=0,c=0,a=0;const l=[0],u=[0],w=new dt;let h=0,d=new f(4320);const p=new ht;n.ct=0,n.ot=0,n.lt=new i(t),n.end=t,n.read=0,n.write=0,n.reset=(e,t)=>{t&&(t[0]=0),6==s&&w.ht(e),s=0,n.ct=0,n.ot=0,n.read=n.write=0},n.reset(e,null),n.wt=(e,t)=>{let r,s,i;return s=e.rt,i=n.read,r=(i>n.write?n.end:n.write)-i,r>e.tt&&(r=e.tt),0!==r&&t==it&&(t=0),e.tt-=r,e.Ge+=r,e.$e.set(n.lt.subarray(i,i+r),s),s+=r,i+=r,i==n.end&&(i=0,n.write==n.end&&(n.write=0),r=n.write-i,r>e.tt&&(r=e.tt),0!==r&&t==it&&(t=0),e.tt-=r,e.Ge+=r,e.$e.set(n.lt.subarray(i,i+r),s),s+=r,i+=r),e.rt=s,n.read=i,t},n.ut=(e,t)=>{let i,f,y,m,b,g,k,v;for(m=e.nt,b=e.We,f=n.ot,y=n.ct,g=n.write,k=g<n.read?n.read-g-1:n.end-g;;){let S,z,C,x,A,_,I,P;switch(s){case 0:for(;3>y;){if(0===b)return n.ot=f,n.ct=y,e.We=b,e.qe+=m-e.nt,e.nt=m,n.write=g,n.wt(e,t);t=0,b--,f|=(255&e.ft(m++))<<y,y+=8}switch(i=7&f,h=1&i,i>>>1){case 0:f>>>=3,y-=3,i=7&y,f>>>=i,y-=i,s=1;break;case 1:S=[],z=[],C=[[]],x=[[]],ht.dt(S,z,C,x),w.init(S[0],z[0],C[0],0,x[0],0),f>>>=3,y-=3,s=6;break;case 2:f>>>=3,y-=3,s=3;break;case 3:return f>>>=3,y-=3,s=9,e.Le="invalid block type",t=st,n.ot=f,n.ct=y,e.We=b,e.qe+=m-e.nt,e.nt=m,n.write=g,n.wt(e,t)}break;case 1:for(;32>y;){if(0===b)return n.ot=f,n.ct=y,e.We=b,e.qe+=m-e.nt,e.nt=m,n.write=g,n.wt(e,t);t=0,b--,f|=(255&e.ft(m++))<<y,y+=8}if((~f>>>16&65535)!=(65535&f))return s=9,e.Le="invalid stored block lengths",t=st,n.ot=f,n.ct=y,e.We=b,e.qe+=m-e.nt,e.nt=m,n.write=g,n.wt(e,t);o=65535&f,f=y=0,s=0!==o?2:0!==h?7:0;break;case 2:if(0===b)return n.ot=f,n.ct=y,e.We=b,e.qe+=m-e.nt,e.nt=m,n.write=g,n.wt(e,t);if(0===k&&(g==n.end&&0!==n.read&&(g=0,k=g<n.read?n.read-g-1:n.end-g),0===k&&(n.write=g,t=n.wt(e,t),g=n.write,k=g<n.read?n.read-g-1:n.end-g,g==n.end&&0!==n.read&&(g=0,k=g<n.read?n.read-g-1:n.end-g),0===k)))return n.ot=f,n.ct=y,e.We=b,e.qe+=m-e.nt,e.nt=m,n.write=g,n.wt(e,t);if(t=0,i=o,i>b&&(i=b),i>k&&(i=k),n.lt.set(e.je(m,i),g),m+=i,b-=i,g+=i,k-=i,0!=(o-=i))break;s=0!==h?7:0;break;case 3:for(;14>y;){if(0===b)return n.ot=f,n.ct=y,e.We=b,e.qe+=m-e.nt,e.nt=m,n.write=g,n.wt(e,t);t=0,b--,f|=(255&e.ft(m++))<<y,y+=8}if(c=i=16383&f,(31&i)>29||(i>>5&31)>29)return s=9,e.Le="too many length or distance symbols",t=st,n.ot=f,n.ct=y,e.We=b,e.qe+=m-e.nt,e.nt=m,n.write=g,n.wt(e,t);if(i=258+(31&i)+(i>>5&31),!r||r.length<i)r=[];else for(v=0;i>v;v++)r[v]=0;f>>>=14,y-=14,a=0,s=4;case 4:for(;4+(c>>>10)>a;){for(;3>y;){if(0===b)return n.ot=f,n.ct=y,e.We=b,e.qe+=m-e.nt,e.nt=m,n.write=g,n.wt(e,t);t=0,b--,f|=(255&e.ft(m++))<<y,y+=8}r[pt[a++]]=7&f,f>>>=3,y-=3}for(;19>a;)r[pt[a++]]=0;if(l[0]=7,i=p.st(r,l,u,d,e),0!=i)return(t=i)==st&&(r=null,s=9),n.ot=f,n.ct=y,e.We=b,e.qe+=m-e.nt,e.nt=m,n.write=g,n.wt(e,t);a=0,s=5;case 5:for(;i=c,258+(31&i)+(i>>5&31)>a;){let o,w;for(i=l[0];i>y;){if(0===b)return n.ot=f,n.ct=y,e.We=b,e.qe+=m-e.nt,e.nt=m,n.write=g,n.wt(e,t);t=0,b--,f|=(255&e.ft(m++))<<y,y+=8}if(i=d[3*(u[0]+(f&ot[i]))+1],w=d[3*(u[0]+(f&ot[i]))+2],16>w)f>>>=i,y-=i,r[a++]=w;else{for(v=18==w?7:w-14,o=18==w?11:3;i+v>y;){if(0===b)return n.ot=f,n.ct=y,e.We=b,e.qe+=m-e.nt,e.nt=m,n.write=g,n.wt(e,t);t=0,b--,f|=(255&e.ft(m++))<<y,y+=8}if(f>>>=i,y-=i,o+=f&ot[v],f>>>=v,y-=v,v=a,i=c,v+o>258+(31&i)+(i>>5&31)||16==w&&1>v)return r=null,s=9,e.Le="invalid bit length repeat",t=st,n.ot=f,n.ct=y,e.We=b,e.qe+=m-e.nt,e.nt=m,n.write=g,n.wt(e,t);w=16==w?r[v-1]:0;do{r[v++]=w}while(0!=--o);a=v}}if(u[0]=-1,A=[],_=[],I=[],P=[],A[0]=9,_[0]=6,i=c,i=p.it(257+(31&i),1+(i>>5&31),r,A,_,I,P,d,e),0!=i)return i==st&&(r=null,s=9),t=i,n.ot=f,n.ct=y,e.We=b,e.qe+=m-e.nt,e.nt=m,n.write=g,n.wt(e,t);w.init(A[0],_[0],d,I[0],d,P[0]),s=6;case 6:if(n.ot=f,n.ct=y,e.We=b,e.qe+=m-e.nt,e.nt=m,n.write=g,1!=(t=w.ut(n,e,t)))return n.wt(e,t);if(t=0,w.ht(e),m=e.nt,b=e.We,f=n.ot,y=n.ct,g=n.write,k=g<n.read?n.read-g-1:n.end-g,0===h){s=0;break}s=7;case 7:if(n.write=g,t=n.wt(e,t),g=n.write,k=g<n.read?n.read-g-1:n.end-g,n.read!=n.write)return n.ot=f,n.ct=y,e.We=b,e.qe+=m-e.nt,e.nt=m,n.write=g,n.wt(e,t);s=8;case 8:return t=1,n.ot=f,n.ct=y,e.We=b,e.qe+=m-e.nt,e.nt=m,n.write=g,n.wt(e,t);case 9:return t=st,n.ot=f,n.ct=y,e.We=b,e.qe+=m-e.nt,e.nt=m,n.write=g,n.wt(e,t);default:return t=rt,n.ot=f,n.ct=y,e.We=b,e.qe+=m-e.nt,e.nt=m,n.write=g,n.wt(e,t)}}},n.ht=e=>{n.reset(e,null),n.lt=null,d=null},n.yt=(e,t,r)=>{n.lt.set(e.subarray(t,t+r),0),n.read=n.write=r},n.bt=()=>1==s?1:0}const mt=13,bt=[0,0,255,255];function gt(){const e=this;function t(e){return e&&e.gt?(e.qe=e.Ge=0,e.Le=null,e.gt.mode=7,e.gt.kt.reset(e,null),0):rt}e.mode=0,e.method=0,e.vt=[0],e.St=0,e.marker=0,e.zt=0,e.Ct=t=>(e.kt&&e.kt.ht(t),e.kt=null,0),e.xt=(n,r)=>(n.Le=null,e.kt=null,8>r||r>15?(e.Ct(n),rt):(e.zt=r,n.gt.kt=new yt(n,1<<r),t(n),0)),e.At=(e,t)=>{let n,r;if(!e||!e.gt||!e.et)return rt;const s=e.gt;for(t=4==t?it:0,n=it;;)switch(s.mode){case 0:if(0===e.We)return n;if(n=t,e.We--,e.qe++,8!=(15&(s.method=e.ft(e.nt++)))){s.mode=mt,e.Le="unknown compression method",s.marker=5;break}if(8+(s.method>>4)>s.zt){s.mode=mt,e.Le="invalid win size",s.marker=5;break}s.mode=1;case 1:if(0===e.We)return n;if(n=t,e.We--,e.qe++,r=255&e.ft(e.nt++),((s.method<<8)+r)%31!=0){s.mode=mt,e.Le="incorrect header check",s.marker=5;break}if(!(32&r)){s.mode=7;break}s.mode=2;case 2:if(0===e.We)return n;n=t,e.We--,e.qe++,s.St=(255&e.ft(e.nt++))<<24&4278190080,s.mode=3;case 3:if(0===e.We)return n;n=t,e.We--,e.qe++,s.St+=(255&e.ft(e.nt++))<<16&16711680,s.mode=4;case 4:if(0===e.We)return n;n=t,e.We--,e.qe++,s.St+=(255&e.ft(e.nt++))<<8&65280,s.mode=5;case 5:return 0===e.We?n:(n=t,e.We--,e.qe++,s.St+=255&e.ft(e.nt++),s.mode=6,2);case 6:return s.mode=mt,e.Le="need dictionary",s.marker=0,rt;case 7:if(n=s.kt.ut(e,n),n==st){s.mode=mt,s.marker=0;break}if(0==n&&(n=t),1!=n)return n;n=t,s.kt.reset(e,s.vt),s.mode=12;case 12:return e.We=0,1;case mt:return st;default:return rt}},e._t=(e,t,n)=>{let r=0,s=n;if(!e||!e.gt||6!=e.gt.mode)return rt;const i=e.gt;return s<1<<i.zt||(s=(1<<i.zt)-1,r=n-s),i.kt.yt(t,r,s),i.mode=7,0},e.It=e=>{let n,r,s,i,o;if(!e||!e.gt)return rt;const c=e.gt;if(c.mode!=mt&&(c.mode=mt,c.marker=0),0===(n=e.We))return it;for(r=e.nt,s=c.marker;0!==n&&4>s;)e.ft(r)==bt[s]?s++:s=0!==e.ft(r)?0:4-s,r++,n--;return e.qe+=r-e.nt,e.nt=r,e.We=n,c.marker=s,4!=s?st:(i=e.qe,o=e.Ge,t(e),e.qe=i,e.Ge=o,c.mode=7,0)},e.Pt=e=>e&&e.gt&&e.gt.kt?e.gt.kt.bt():rt}function kt(){}function vt(e){const t=new kt,n=e&&e.chunkSize?r.floor(2*e.chunkSize):131072,o=new i(n);let c=!1;t.xt(),t.$e=o,this.append=(e,r)=>{const f=[];let a,l,u=0,w=0,h=0;if(0!==e.length){t.nt=0,t.et=e,t.We=e.length;do{if(t.rt=0,t.tt=n,0!==t.We||c||(t.nt=0,c=!0),a=t.At(0),c&&a===it){if(0!==t.We)throw new s("inflating: bad input")}else if(0!==a&&1!==a)throw new s("inflating: "+t.Le);if((c||1===a)&&t.We===e.length)throw new s("inflating: bad input");t.rt&&(t.rt===n?f.push(new i(o)):f.push(o.subarray(0,t.rt))),h+=t.rt,r&&t.nt>0&&t.nt!=u&&(r(t.nt),u=t.nt)}while(t.We>0||0===t.tt);return f.length>1?(l=new i(h),f.forEach((e=>{l.set(e,w),w+=e.length}))):l=f[0]?new i(f[0]):new i,l}},this.flush=()=>{t.Ct()}}kt.prototype={xt(e){const t=this;return t.gt=new gt,e||(e=15),t.gt.xt(t,e)},At(e){const t=this;return t.gt?t.gt.At(t,e):rt},Ct(){const e=this;if(!e.gt)return rt;const t=e.gt.Ct(e);return e.gt=null,t},It(){const e=this;return e.gt?e.gt.It(e):rt},_t(e,t){const n=this;return n.gt?n.gt._t(n,e,t):rt},ft(e){return this.et[e]},je(e,t){return this.et.subarray(e,e+t)}},self.initCodec=()=>{self.Deflate=nt,self.Inflate=vt};
`,s=()=>t.useDataURI?"data:text/javascript,"+encodeURIComponent(r):URL.createObjectURL(new Blob([r],{type:"text/javascript"}));n({workerScripts:{inflate:[s],deflate:[s]}})}const CP437="\0☺☻♥♦♣♠•◘○◙♂♀♪♫☼►◄↕‼¶§▬↨↑↓→←∟↔▲▼ !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~⌂ÇüéâäàåçêëèïîìÄÅÉæÆôöòûùÿÖÜ¢£¥₧ƒáíóúñÑªº¿⌐¬½¼¡«»░▒▓│┤╡╢╖╕╣║╗╝╜╛┐└┴┬├─┼╞╟╚╔╩╦╠═╬╧╨╤╥╙╘╒╓╫╪┘┌█▄▌▐▀αßΓπΣσµτΦΘΩδ∞φε∩≡±≥≤⌠⌡÷≈°∙·√ⁿ²■ ".split("");CP437.length==256;let baseURL;try{baseURL=import.meta.url}catch(n){}configure({baseURL});e(configure);configure({Deflate:ZipDeflate,Inflate:ZipInflate});var url_beta="/assets/wp-beta.tar-gQGIa9xg.zst",url_7_1="/assets/wp-7.1.tar-RI9cQ5f-.zst",url_7_0="/assets/wp-7.0.tar-GWF4dt1x.zst",url_6_9="/assets/wp-6.9.tar-ChVSPsAP.zst",url_6_8="/assets/wp-6.8.tar-DOI7GCpa.zst",url_6_7="/assets/wp-6.7.tar-CMtCv0KH.zst",url_6_6="/assets/wp-6.6.tar-BLEPEyWP.zst",url_6_5="/assets/wp-6.5.tar-Bf73-wzM.zst",url_6_4="/assets/wp-6.4.tar-DTICh01r.zst",url_6_3="/assets/wp-6.3.tar-BexpyKYU.zst";function getWordPressModuleDetails(n="7.1"){switch(n){case"trunk":return{format:"zip",container:"zip",codec:"deflate",size:0,url:"https://github.com/WordPress/WordPress/archive/refs/heads/master.zip"};case"beta":return{format:"tar.zst",container:"tar",codec:"zstd",size:5043275,sha256:"6d4d4720368146aa5619b4c34aa7070ed38ce39655b46aa0de25ce77cc4a90fd",fileCount:2071,url:url_beta};case"7.1":return{format:"tar.zst",container:"tar",codec:"zstd",size:4680269,sha256:"a7629d18bd3d9d2b810c790fc292a913ed99ee7af23e182f25a9c0672b5cad39",fileCount:1935,url:url_7_1};case"7.0":return{format:"tar.zst",container:"tar",codec:"zstd",size:4715778,sha256:"6574b8579180181abaa56f3ad0571ad5ba0a7bf9cc07ba654fccf429268bb4f0",fileCount:2146,url:url_7_0};case"6.9":return{format:"tar.zst",container:"tar",codec:"zstd",size:4292827,sha256:"b5ff72c5192fcd3415a6b3731abaedafe4cac456875f4e26d5175021e503f443",fileCount:1600,url:url_6_9};case"6.8":return{format:"tar.zst",container:"tar",codec:"zstd",size:4332044,sha256:"0a7d0ffd7bdb66d99ba8d4951b177a9ce5a3524d8c42ff42eec04885f8ccf3cc",fileCount:1540,url:url_6_8};case"6.7":return{format:"tar.zst",container:"tar",codec:"zstd",size:4301555,sha256:"eee1e6b00b3886a6b387229323ee311960ff61502aebdb3ef03e06eb78b4fc87",fileCount:1531,url:url_6_7};case"6.6":return{format:"tar.zst",container:"tar",codec:"zstd",size:3440587,sha256:"e168601409ee2e9c8a6ee23dd02b8d6909d7c3fa558d1a2c515e544676bfdd27",fileCount:1367,url:url_6_6};case"6.5":return{format:"tar.zst",container:"tar",codec:"zstd",size:3384145,sha256:"aeba52ae7ef500210e1bdfd449b9a8f14d2f287940b69498b17ca59f78e5e303",fileCount:1359,url:url_6_5};case"6.4":return{format:"tar.zst",container:"tar",codec:"zstd",size:3302964,sha256:"6e42beec88143447a2f459e803f186a6f05be271af9b927e1a177431292d6356",fileCount:1331,url:url_6_4};case"6.3":return{format:"tar.zst",container:"tar",codec:"zstd",size:2172108,sha256:"f7b36859f3a6668ea46c9a78e48dc014a0ebfa25cc458bfab4a63615c4654f3b",fileCount:1253,url:url_6_3};case"nightly":return{format:"zip",container:"zip",codec:"deflate",size:0,url:"https://github.com/WordPress/WordPress/archive/refs/heads/master.zip"}}throw new Error("Unsupported WordPress module: "+n)}var url_trunk="/assets/sqlite-database-integration-trunk-DFPE_4Qg.zip",url_v2_1_16="/assets/sqlite-database-integration-v2.1.16-DPxvF9Ga.zip",url_v3_0_0_rc_3_php52="/assets/sqlite-database-integration-v3.0.0-rc.3-php52-T_ESopk0.zip";const LatestSqliteDriverVersion="trunk";function getSqliteDriverModuleDetails(n=LatestSqliteDriverVersion){switch(n){case"trunk":return{size:238899,url:url_trunk};case"v2.1.16":return{size:84250,url:url_v2_1_16};case"v3.0.0-rc.3-php52":return{size:210820,url:url_v3_0_0_rc_3_php52}}throw new Error("Unsupported SQLite integration plugin version: "+n)}const trunk="trunk",beta="7.2-beta1";var MinifiedWordPressVersions={trunk,beta,"7.1":"7.1.3","7.0":"7.0.7","6.9":"6.9.10","6.8":"6.8.11","6.7":"6.7.7","6.6":"6.6.5","6.5":"6.5.7","6.4":"6.4.5","6.3":"6.3.5"};const MinifiedWordPressVersionsList=Object.keys(MinifiedWordPressVersions),LatestMinifiedWordPressVersion=MinifiedWordPressVersionsList.filter(n=>n.match(/^\d/))[0];function wpVersionToStaticAssetsDirectory(n){return n in MinifiedWordPressVersions?`wp-${n}`:void 0}const wordPressSiteUrl=new URL("/",(import.meta||{}).url).origin,buildVersion="16a098b0e927b8fb3525ced104f0157344894802",CACHE_NAME_PREFIX="playground-cache",LATEST_CACHE_NAME=`${CACHE_NAME_PREFIX}-${buildVersion}`,promisedOfflineModeCache=caches.open(LATEST_CACHE_NAME);async function hasCachedResponse(n,t={ignoreSearch:!0}){return!!await(await promisedOfflineModeCache).match(n,t)}async function putCachedResponse(n,t){await(await promisedOfflineModeCache).put(n,t)}async function writeCommonPlatformMuPlugins(n){await n.writeFile("/internal/shared/preload/save-wp-env.php",`<?php

		// Save metadata even when a plugin fails before WordPress finishes loading.
		register_shutdown_function('playground_save_wp_env_info');

		// Named function (not a closure) so this file parses on PHP 5.2.
		function playground_save_wp_env_info() {
			global $wpdb;
			if (!($wpdb instanceof wpdb)) {
				return;
			}
			if (defined('DB_ENGINE') && DB_ENGINE === 'sqlite') {
				if (!defined('DB_PATH') && !defined('FQDB')) {
					return;
				}
				if (!defined('WP_MYSQL_ON_SQLITE_LOADER_PATH') && !defined('SQLITE_MAIN_FILE')) {
					return;
				}
				$db_info = array(
					'type' => 'sqlite',
					'path' => defined('DB_PATH') ? DB_PATH : FQDB,
					'driver_path' => defined('WP_MYSQL_ON_SQLITE_LOADER_PATH')
						? WP_MYSQL_ON_SQLITE_LOADER_PATH
						: dirname(SQLITE_MAIN_FILE) . '/wp-pdo-mysql-on-sqlite.php',
				);
			} else {
				$db_info = array(
					'type' => 'mysql',
					// TODO: Save MySQL connection config.
				);
			}
			$wp_env = array('db' => $db_info);
			$wp_env_php = sprintf('<?php return %s;', var_export($wp_env, true));
			$wp_env_file = '/internal/shared/wp-env.php';
			if (!file_exists($wp_env_file) || file_get_contents($wp_env_file) !== $wp_env_php ) {
				file_put_contents($wp_env_file, $wp_env_php);
			}
		}
		`),await n.writeFile("/internal/shared/mu-plugins/0-playground.php",`<?php

        // Needed because gethostbyname( 'wordpress.org' ) returns
        // a private network IP address for some reason.
        function playground_allowed_redirect_hosts( $deprecated = '' ) {
            return array(
                'wordpress.org',
                'api.wordpress.org',
                'downloads.wordpress.org',
            );
        }
        add_filter( 'allowed_redirect_hosts', 'playground_allowed_redirect_hosts' );

		/**
		 * Prevents wp_http_validate_url() from universally failing.
		 *
		 * wp_http_validate_url() calls gethostbyname() to verify whether the host
		 * is external. If it is internal, the URL validation fails and WordPress
		 * refuses to make a request.
		 *
		 * However, in EMscripten, gethostbyname() returns a private network IP address.
		 * This causes wp_http_validate_url() to return false for all URLs.
		 *
		 * This filter ensures that all URLs are considered external. In production
		 * environments, this would be considered a security risk. However, Playground
		 * already provides multiple code execution vectors as features (e.g. Blueprints).
		 *
		 * If someone wants to poke around local IP addresses, they already have multiple
		 * tools at their disposal. Therefore, this is not a real security risk in context
		 * of WordPress Playground or Playground CLI.
		 */
		add_filter('http_request_host_is_external', '__return_true');

		// Support pretty permalinks
        add_filter( 'got_url_rewrite', '__return_true' );

		/**
		 * Flush rewrite rules on the first real WordPress request.
		 *
		 * During boot, we set permalink_structure in the database
		 * but can't flush rewrite rules at that point because WordPress
		 * isn't fully bootstrapped — post types and taxonomies haven't
		 * been registered yet, so the generated rules are incomplete.
		 *
		 * This hook fires on 'init' at a very late priority, after all
		 * post types and taxonomies are registered. It checks if the
		 * rewrite_rules option is empty (meaning rules were never
		 * flushed) and if permalink_structure is set, then flushes once.
		 * A flag file prevents repeated flushes on subsequent requests.
		 */
		function playground_maybe_flush_rewrite_rules() {
			$flag = '/internal/shared/.rewrite-rules-flushed';
			if (file_exists($flag)) {
				return;
			}
			if (!function_exists('get_option')) {
				return;
			}
			$structure = get_option('permalink_structure');
			if (empty($structure)) {
				return;
			}
			$rules = get_option('rewrite_rules');
			if (!empty($rules)) {
				@file_put_contents($flag, '1');
				return;
			}
			global $wp_rewrite;
			if (!isset($wp_rewrite) && class_exists('WP_Rewrite')) {
				$wp_rewrite = new WP_Rewrite();
			}
			if (isset($wp_rewrite) && method_exists($wp_rewrite, 'flush_rules')) {
				$wp_rewrite->flush_rules();
			}
			@file_put_contents($flag, '1');
		}
		add_action('init', 'playground_maybe_flush_rewrite_rules', 99999);

        // Create the fonts directory if missing
        if(!file_exists(WP_CONTENT_DIR . '/fonts')) {
            mkdir(WP_CONTENT_DIR . '/fonts');
        }

        $log_file = WP_CONTENT_DIR . '/debug.log';
        if ( defined( 'WP_DEBUG_LOG' ) && WP_DEBUG_LOG ) {
            if ( is_string( WP_DEBUG_LOG ) ) {
                $log_file = WP_DEBUG_LOG;
            }
            ini_set('error_log', $log_file);
        } else {
            ini_set('log_errors', '0');
        }
        define('ERROR_LOG_FILE', $log_file);
        ?>`),await n.writeFile("/internal/shared/mu-plugins/sitemap-redirect.php",`<?php
		/**
		 * Redirect sitemap.xml to wp-sitemap.xml for non-root installations.
		 *
		 * WordPress seems to only generate the sitemap.xml → wp-sitemap.xml rewrite
		 * rule when installed at the domain root. This mu-plugin handles the
		 * redirect for non-root installations.
		 */
		if (isset($_SERVER['REQUEST_URI'])) {
			$site_url = site_url();
			$parsed = parse_url($site_url);
			$base_path = isset($parsed['path']) ? rtrim($parsed['path'], '/') : '';

			$request_uri = $_SERVER['REQUEST_URI'];
			if (
				$request_uri === $base_path . '/sitemap.xml' ||
				strpos($request_uri, $base_path . '/sitemap.xml?') === 0 ||
				strpos($request_uri, $base_path . '/sitemap.xml/') === 0
			) {
				$query_string = strpos($request_uri, '?') !== false ? substr($request_uri, strpos($request_uri, '?')) : '';
				header('Location: ' . $base_path . '/wp-sitemap.xml' . $query_string, true, 301);
				exit;
			}
		}
		`),await n.writeFile("/internal/shared/mu-plugins/inline-tinymce-content-css.php",`<?php
		function playground_inline_tinymce_content_css($settings) {
			if (empty($settings['content_css'])) return $settings;
			$css_urls = explode(',', $settings['content_css']);
			$inline_css = '';
			$doc_root = isset($_SERVER['DOCUMENT_ROOT'])
				? $_SERVER['DOCUMENT_ROOT'] : '/wordpress';
			foreach ($css_urls as $url) {
				$url = trim($url);
				if (!$url) continue;
				$parsed = parse_url($url);
				if (!isset($parsed['path'])) continue;
				$path = preg_replace('#^/scope:[^/]+#', '', $parsed['path']);
				$file = $doc_root . $path;
				if (file_exists($file)) {
					$inline_css .= @file_get_contents($file) . "\\n";
				}
			}
			if ($inline_css !== '') {
				if (!empty($settings['content_style'])) {
					$inline_css = $settings['content_style'] . "\\n" . $inline_css;
				}
				$settings['content_style'] =
					playground_escape_tinymce_content_style_for_wp_editor_serializer($inline_css);
				$settings['content_css'] = '';
			}
			return $settings;
		}
		add_filter('tiny_mce_before_init', 'playground_inline_tinymce_content_css');

		// _WP_Editors::_parse_init() wraps strings in double quotes without escaping them.
		// Encode the CSS as a JavaScript string body before WordPress adds those quotes.
		function playground_escape_tinymce_content_style_for_wp_editor_serializer($css) {
			$encoded = json_encode($css);
			if (
				is_string($encoded) &&
				substr($encoded, 0, 1) === chr(34) &&
				substr($encoded, -1) === chr(34)
			) {
				$escaped = substr($encoded, 1, -1);
			} else {
				// Fallback: json_encode() can fail on non-UTF-8 CSS bytes.
				// Escape the bytes that would break _WP_Editors::_parse_init().
				$escaped = str_replace(
					array('\\\\', chr(34), "\\r", "\\n", "\\xe2\\x80\\xa8", "\\xe2\\x80\\xa9"),
					array('\\\\\\\\', '\\\\' . chr(34), '\\\\r', '\\\\n', '\\\\u2028', '\\\\u2029'),
					$css
				);
			}
			return str_replace('</', '<\\/', $escaped);
		}
		`)}function SQLITE_PRELOAD_LOADER_CLASS(n){return`
/**
 * Loads the SQLite integration plugin before WordPress is loaded
 * and without creating a drop-in "db.php" file.
 *
 * Technically, it creates a global $wpdb object whose only two
 * purposes are to:
 *
 * * Exist – because the require_wp_db() WordPress function won't
 *           connect to MySQL if $wpdb is already set.
 * * Load the SQLite integration plugin the first time it's used
 *   and replace the global $wpdb reference with the SQLite one.
 *
 * This lets Playground keep the WordPress installation clean and
 * solves dillemas like:
 *
 * * Should we include db.php in Playground exports?
 * * Should we remove db.php from Playground imports?
 * * How should we treat stale db.php from long-lived OPFS sites?
 *
 * @see https://github.com/WordPress/wordpress-playground/discussions/1379 for
 *      more context.
 */
class Playground_SQLite_Integration_Loader {
	public function __call($name, $arguments) {
		$this->load_sqlite_integration();
		if($GLOBALS['wpdb'] === $this) {
			throw new Exception('Infinite loop detected in $wpdb – SQLite integration plugin could not be loaded');
		}
		return call_user_func_array(
			array($GLOBALS['wpdb'], $name),
			$arguments
		);
	}
	public function __get($name) {
		$this->load_sqlite_integration();
		if($GLOBALS['wpdb'] === $this) {
			throw new Exception('Infinite loop detected in $wpdb – SQLite integration plugin could not be loaded');
		}
		return $GLOBALS['wpdb']->$name;
	}
	public function __set($name, $value) {
		$this->load_sqlite_integration();
		if($GLOBALS['wpdb'] === $this) {
			throw new Exception('Infinite loop detected in $wpdb – SQLite integration plugin could not be loaded');
		}
		$GLOBALS['wpdb']->$name = $value;
	}
    protected function load_sqlite_integration() {
        ${n}
    }
}
/**
 * The Query Monitor plugin short-circuits in the CLI SAPI. However, in Playground,
 * the SAPI is always "cli" at the moment. Let's set a constant to disable the CLI
 * detection.
 *
 * @see https://github.com/WordPress/sqlite-database-integration/pull/212
 * @see https://github.com/WordPress/sqlite-database-integration/pull/215
 */
define('QM_TESTS', true);
$wpdb = $GLOBALS['wpdb'] = new Playground_SQLite_Integration_Loader();

/**
 * WordPress is capable of using a preloaded global $wpdb. However, if
 * it cannot find the drop-in db.php plugin it still checks whether
 * the mysqli_connect() function exists even though it's not used.
 *
 * What WordPress demands, Playground shall provide.
 */
`}const LEGACY_AUTO_LOGIN_BODY=`
			if (function_exists('is_user_logged_in') && is_user_logged_in()) {
				return;
			}
			if (headers_sent()) {
				return;
			}

			// Legacy auto-login never redirects; it populates $_COOKIE
			// in-process for the current request and relies on
			// setcookie() / wp_set_auth_cookie() to persist across
			// requests via HttpCookieStore.

			// WP 2.5+
			if (function_exists('wp_set_current_user') && function_exists('wp_set_auth_cookie')) {
				$user = function_exists('get_user_by')
					? get_user_by('login', $user_name)
					: (function_exists('get_userdatabylogin')
						? get_userdatabylogin($user_name) : null);
				if (!$user) return;

				wp_set_current_user($user->ID, $user->user_login);
				// Populate $_COOKIE in-process so auth_redirect() and
				// wp_verify_nonce() see the session for the remainder
				// of this request; wp_set_auth_cookie() also emits
				// Set-Cookie for subsequent requests.
				wp_set_auth_cookie($user->ID);
				if (function_exists('wp_generate_auth_cookie')) {
					$_pg_exp = time() + 172800;
					if (defined('AUTH_COOKIE'))
						$_COOKIE[AUTH_COOKIE] = wp_generate_auth_cookie($user->ID, $_pg_exp, 'auth');
					if (defined('SECURE_AUTH_COOKIE'))
						$_COOKIE[SECURE_AUTH_COOKIE] = wp_generate_auth_cookie($user->ID, $_pg_exp, 'secure_auth');
					if (defined('LOGGED_IN_COOKIE'))
						$_COOKIE[LOGGED_IN_COOKIE] = wp_generate_auth_cookie($user->ID, $_pg_exp, 'logged_in');
				}
				return;
			}

			// WP 1.5–2.4
			if (defined('USER_COOKIE') && defined('PASS_COOKIE')) {
				$_pg_pass_cookie = md5(md5('password'));
				$_COOKIE[USER_COOKIE] = $user_name;
				$_COOKIE[PASS_COOKIE] = $_pg_pass_cookie;
				if (!headers_sent()) {
					$_pg_exp = time() + 172800;
					setcookie(USER_COOKIE, $user_name, $_pg_exp, '/');
					setcookie(PASS_COOKIE, $_pg_pass_cookie, $_pg_exp, '/');
				}
				$GLOBALS['current_user'] = null;
				if (function_exists('get_currentuserinfo')) {
					get_currentuserinfo();
				}
				return;
			}

			// WP 1.0–1.2: cookies are usually already set by
			// playground_legacy_set_auth_cookies_early() in env.php,
			// but WP 1.0–1.2 reads its user state from globals (no
			// WP_User), so populate those explicitly here.
			$cookiehash = defined('COOKIEHASH')
				? COOKIEHASH
				: (isset($GLOBALS['cookiehash']) && $GLOBALS['cookiehash']
					? $GLOBALS['cookiehash']
					: (function_exists('get_settings')
						? md5(get_settings('siteurl'))
						: ''));
			if ($cookiehash) {
				$_pg_user_cookie_name = 'wordpressuser_' . $cookiehash;
				$_pg_pass_cookie_name = 'wordpresspass_' . $cookiehash;
				$_pg_pass_cookie_value = md5(md5('password'));
				$_COOKIE[$_pg_user_cookie_name] = $user_name;
				$_COOKIE[$_pg_pass_cookie_name] = $_pg_pass_cookie_value;
				if (!headers_sent()) {
					$_pg_exp = time() + 172800;
					setcookie($_pg_user_cookie_name, $user_name, $_pg_exp, '/');
					setcookie($_pg_pass_cookie_name, $_pg_pass_cookie_value, $_pg_exp, '/');
				}
				if (function_exists('get_userdatabylogin')) {
					$userdata = get_userdatabylogin($user_name);
					if ($userdata) {
						$GLOBALS['user_login']    = $user_name;
						$GLOBALS['userdata']      = $userdata;
						$GLOBALS['user_level']    = isset($userdata->user_level) ? (int) $userdata->user_level : 10;
						$GLOBALS['user_ID']       = $userdata->ID;
						$GLOBALS['user_email']    = isset($userdata->user_email) ? $userdata->user_email : '';
						$GLOBALS['user_url']      = isset($userdata->user_url) ? $userdata->user_url : '';
						$GLOBALS['user_nickname'] = isset($userdata->user_nickname) ? $userdata->user_nickname : $user_name;
						$GLOBALS['user_pass_md5'] = md5(isset($userdata->user_pass) ? $userdata->user_pass : '');
					}
				}
				return;
			}
`;async function setupLegacyPlatformLevelMuPlugins(n){await n.mkdir("/internal/shared/mu-plugins"),await n.writeFile("/internal/shared/auto_prepend_file.php",`<?php
// Polyfill the PHP 4 superglobals WP 1.0–2.5 still reads (removed
// in PHP 5.4). Bind by reference so later writes to $_COOKIE
// reach $HTTP_COOKIE_VARS, which WP 1.0's get_currentuserinfo()
// consults.
$GLOBALS['HTTP_GET_VARS']     = &$_GET;
$GLOBALS['HTTP_POST_VARS']    = &$_POST;
$GLOBALS['HTTP_COOKIE_VARS']  = &$_COOKIE;
$GLOBALS['HTTP_SERVER_VARS']  = &$_SERVER;
if (isset($_FILES))   $GLOBALS['HTTP_POST_FILES']   = &$_FILES;
if (isset($_ENV))     $GLOBALS['HTTP_ENV_VARS']     = &$_ENV;
if (isset($_SESSION)) $GLOBALS['HTTP_SESSION_VARS'] = &$_SESSION;
// Top-level names register_globals=On used to expose. WP 1.0
// reads $PHP_SELF / $REMOTE_ADDR directly instead of $_SERVER.
if (isset($_SERVER['PHP_SELF'])) $GLOBALS['PHP_SELF'] = $_SERVER['PHP_SELF'];
if (isset($_SERVER['REMOTE_ADDR'])) $GLOBALS['REMOTE_ADDR'] = $_SERVER['REMOTE_ADDR'];
if (isset($_SERVER['REQUEST_URI'])) $GLOBALS['REQUEST_URI'] = $_SERVER['REQUEST_URI'];
// Default SERVER_PROTOCOL for scripts invoked outside an HTTP
// request (e.g. php.run() during boot/fixups) — legacy WP reads
// it unconditionally in places like wp_redirect().
if (!isset($_SERVER['SERVER_PROTOCOL'])) {
	$_SERVER['SERVER_PROTOCOL'] = 'HTTP/1.1';
}
if(file_exists('/internal/shared/consts.json')) {
	$consts = json_decode(file_get_contents('/internal/shared/consts.json'), true);
	if ($consts) {
		foreach ($consts as $const => $value) {
			if (!defined($const) && is_scalar($value)) {
				define($const, $value);
			}
		}
	}
}
foreach (glob('/internal/shared/preload/*.php') as $file) {
	require_once $file;
}
// Buffer early output so a stray PHP notice doesn't commit the
// response headers before the auto-login mu-plugin gets a chance
// to call wp_set_auth_cookie() / setcookie() on the init hook —
// otherwise nonce validation breaks on POST requests. PHP flushes
// the buffer at script end so output still reaches the browser.
ob_start();
`),await n.writeFile("/internal/shared/preload/env.php",`<?php
// Reads $wp_version from the WordPress install on disk. Falls back
// to '1.0' so callers can use version_compare() unconditionally.
function _playground_detect_wp_version() {
	static $version = null;
	if ($version !== null) return $version;
	$doc_root = isset($_SERVER['DOCUMENT_ROOT'])
		? $_SERVER['DOCUMENT_ROOT'] : '/wordpress';
	$version_path = $doc_root . '/wp-includes/version.php';
	$wp_version = '1.0';
	if (file_exists($version_path)) {
		include $version_path;
	}
	$version = $wp_version;
	return $version;
}

// Returns 'wp10', 'wp12', or 'wp15' based on the WP version on
// disk — the three $wp_filter shapes apply_filters() understands.
function _playground_detect_wp_hook_format() {
	static $format = null;
	if ($format !== null) return $format;
	$wp_version = _playground_detect_wp_version();
	if (version_compare($wp_version, '1.5', '>=')) {
		$format = 'wp15';
	} elseif (version_compare($wp_version, '1.2', '>=')) {
		$format = 'wp12';
	} else {
		$format = 'wp10';
	}
	return $format;
}

// Adds filters/actions before WordPress is loaded by writing the
// $wp_filter shape the target version expects. $function_to_add
// MUST be a string (no closures).
function playground_add_filter( $tag, $function_to_add, $priority = 10, $accepted_args = 1 ) {
	global $wp_filter;
	$fmt = _playground_detect_wp_hook_format();
	if ($fmt === 'wp10') {
		$wp_filter[$tag][] = $function_to_add;
	} elseif ($fmt === 'wp12') {
		$wp_filter[$tag][$priority][] = $function_to_add;
	} else {
		$wp_filter[$tag][$priority][$function_to_add] = array(
			'function' => $function_to_add,
			'accepted_args' => $accepted_args
		);
	}
}
function playground_add_action( $tag, $function_to_add, $priority = 10, $accepted_args = 1 ) {
	playground_add_filter( $tag, $function_to_add, $priority, $accepted_args );
}

// Set WP 1.0–2.4 auth cookies before WordPress loads — by the time
// the init hook fires (and on WP 1.0–1.2 it may not fire at all on
// the front page) WordPress has already read $_COOKIE. setcookie()
// also persists them across requests via HttpCookieStore.
// WP 2.5+ uses the HMAC auth cookie scheme and doesn't read these
// wordpressuser_/wordpresspass_ cookies at all — bail there so we
// don't write inert cookies the runtime would have to clean up.
function playground_legacy_set_auth_cookies_early() {
	if (!defined('PLAYGROUND_AUTO_LOGIN_AS_USER')) return;
	if (isset($_COOKIE['playground_auto_login_already_logged_out'])) return;
	if (version_compare(_playground_detect_wp_version(), '2.5', '>=')) return;

	foreach ($_COOKIE as $name => $_) {
		if (strncmp($name, 'wordpressuser_', 14) === 0) return;
	}

	$user_name = PLAYGROUND_AUTO_LOGIN_AS_USER;
	$pass_md5 = md5(md5('password'));

	// Read siteurl from SQLite so the cookie hash matches what
	// WP 1.0–2.4 derives from get_settings('siteurl').
	$siteurl = null;
	$db_path = defined('DB_DIR') ? DB_DIR . '.ht.sqlite' : '';
	if ($db_path && class_exists('PDO') && file_exists($db_path)) {
		try {
			$pdo = new PDO('sqlite:' . $db_path);
			$stmt = $pdo->query("SELECT option_value FROM wp_options WHERE option_name = 'siteurl' LIMIT 1");
			if ($stmt) $siteurl = $stmt->fetchColumn();
			$pdo = null;
		} catch (Exception $e) {}
	}
	if (!$siteurl && defined('WP_SITEURL')) $siteurl = WP_SITEURL;
	if (!$siteurl) return;

	$cookiehash = md5($siteurl);
	$user_cookie_name = 'wordpressuser_' . $cookiehash;
	$pass_cookie_name = 'wordpresspass_' . $cookiehash;
	$_COOKIE[$user_cookie_name] = $user_name;
	$_COOKIE[$pass_cookie_name] = $pass_md5;

	if (!headers_sent()) {
		$exp = time() + 172800;
		setcookie($user_cookie_name, $user_name, $exp, '/');
		setcookie($pass_cookie_name, $pass_md5, $exp, '/');
	}
}
playground_legacy_set_auth_cookies_early();

// WP < 4.0 emits YEAR(post_date)='2026' AND MONTH(post_date)='4'
// against MySQL's loose type coercion. The SQLite driver's UDFs
// return integers and SQLite is strictly typed (4 != '4'), so
// strip quotes around numeric RHS values to keep both sides ints.
function playground_fix_sqlite_date_comparisons($query) {
	if (
		stripos($query, 'YEAR') === false &&
		stripos($query, 'MONTH') === false &&
		stripos($query, 'DAY') === false
	) {
		return $query;
	}
	return preg_replace(
		'/\\b(YEAR|MONTH|DAYOFMONTH|DAY)\\s*\\(([^)]+)\\)\\s*=\\s*\\'(\\d+)\\'/i',
		'$1($2) = $3',
		$query
	);
}
playground_add_filter( 'query', 'playground_fix_sqlite_date_comparisons' );

// WP 2.2+ checks WP_SITEURL/WP_HOME inside get_option(); WP <2.2
// doesn't, so backfill the same behaviour via the option filters
// to keep admin links on the Playground-scoped URL.
function playground_override_siteurl($value) {
	if (defined('WP_SITEURL')) {
		return WP_SITEURL;
	}
	return $value;
}
function playground_override_home($value) {
	if (defined('WP_HOME')) {
		return WP_HOME;
	}
	return $value;
}
playground_add_filter( 'option_siteurl', 'playground_override_siteurl' );
playground_add_filter( 'option_home', 'playground_override_home' );

// Load mu-plugins last so customer mu-plugins win — and so they
// can't depend on muplugins_loaded. WP < 2.8 doesn't fire that
// action at all, so init -1000 acts as a fallback (the $loaded
// flag keeps it idempotent).
playground_add_action( 'muplugins_loaded', 'playground_load_mu_plugins', 0 );
playground_add_action( 'init', 'playground_load_mu_plugins', -1000 );
function playground_load_mu_plugins() {
	static $loaded = false;
	if ($loaded) return;
	$loaded = true;
	$mu_plugins_dir = '/internal/shared/mu-plugins';
	if(!is_dir($mu_plugins_dir)){
		return;
	}
	$mu_plugins = glob( $mu_plugins_dir . '/*.php' );
	sort( $mu_plugins );
	global $wp_version;
	$is_legacy_wp = isset($wp_version) && version_compare($wp_version, '2.8', '<');
	foreach ( $mu_plugins as $mu_plugin ) {
		// Loaded separately by the preload lazy loader or db.php.
		if (strpos($mu_plugin, 'sqlite-database-integration') !== false) {
			continue;
		}
		// WP < 2.8 crashes on closures in hooks and lacks
		// site_url() (added 2.6). 1-auto-login.php is written
		// without either, so it's the only mu-plugin we load
		// on legacy WP.
		if ($is_legacy_wp) {
			if (strpos($mu_plugin, '1-auto-login.php') === false) {
				continue;
			}
		}
		require_once $mu_plugin;
	}

	// PHP 5.x's foreach over $wp_filter['init'] iterates a copy,
	// so add_action() calls made by the mu-plugin we just loaded
	// won't fire on this same init run. Call them directly.
	if ($is_legacy_wp) {
		if (function_exists('playground_auto_login_redirect_target')) {
			playground_auto_login_redirect_target();
		}
		if (function_exists('playground_auto_login')) {
			playground_auto_login();
		}
	}
}
`),await n.writeFile("/internal/shared/mu-plugins/1-auto-login.php",`<?php
		/**
		 * Returns the username to auto-login as, if any.
		 * @return string|false
		 */
		function playground_get_username_for_auto_login() {
			if ( defined('PLAYGROUND_AUTO_LOGIN_AS_USER') && !isset($_COOKIE['playground_auto_login_already_happened']) ) {
				return PLAYGROUND_AUTO_LOGIN_AS_USER;
			}
			if ( defined('PLAYGROUND_FORCE_AUTO_LOGIN_ENABLED') && isset($_GET['playground_force_auto_login_as_user']) ) {
				return $_GET['playground_force_auto_login_as_user'];
			}
			return false;
		}

		function playground_auto_login() {
			if (empty($_SERVER['REQUEST_URI'])) {
				return;
			}
			$user_name = playground_get_username_for_auto_login();
			if ( false === $user_name ) {
				return;
			}
			if ((function_exists('wp_doing_ajax') && wp_doing_ajax()) || defined('REST_REQUEST')) {
				return;
			}
			${LEGACY_AUTO_LOGIN_BODY}
		}
		add_action('init', 'playground_auto_login', 1);

		function playground_auto_login_redirect_target() {
			if(strpos($_SERVER['REQUEST_URI'], '?playground-redirection-handler') !== false) {
				$next = $_GET['next'];
				header('Location: ' . $next, true, 302);
				exit;
			}
		}
		add_action('init', 'playground_auto_login_redirect_target', 1);

		/**
		 * Disable the Site Admin Email Verification Screen for any session started
		 * via autologin.
		 */
		if (function_exists('add_filter')) {
			add_filter('admin_email_check_interval', 'playground_disable_admin_email_check');
		}
		function playground_disable_admin_email_check($interval) {
			if(false === playground_get_username_for_auto_login()) {
				return 0;
			}
			return $interval;
		}
		`),await writeCommonPlatformMuPlugins(n),await n.writeFile("/internal/shared/preload/error-handler.php",`<?php
$GLOBALS['_playground_consts'] = array();
if (file_exists('/internal/shared/consts.json')) {
	$GLOBALS['_playground_consts'] = @json_decode(file_get_contents('/internal/shared/consts.json'), true);
	if (!is_array($GLOBALS['_playground_consts'])) { $GLOBALS['_playground_consts'] = array(); }
	$GLOBALS['_playground_consts'] = array_keys($GLOBALS['_playground_consts']);
}
function _playground_error_handler($severity, $message, $file, $line) {
	$playground_consts = $GLOBALS['_playground_consts'];
${ERROR_HANDLER_BODY}
	return false;
}
set_error_handler('_playground_error_handler');`)}const ERROR_HANDLER_BODY=`
		// http_api_transports is deprecated since 6.4.0 but Playground's
		// networking layer still registers it for wp_http_supports().
		// @see https://core.trac.wordpress.org/ticket/37708
		if (
			strpos($message, "http_api_transports") !== false &&
			strpos($message, "since version 6.4.0 with no alternative available") !== false
		) {
			return;
		}
		// Playground predefines constants (SITE_URL, WP_DEBUG, …) that
		// wp-config.php is allowed to redefine; ours take precedence.
		if (strpos($message, "already defined") !== false) {
			foreach($playground_consts as $const) {
				if(strpos($message, "Constant $const already defined") !== false) {
					return;
				}
			}
		}
		// Legacy WP (2.0–3.5) assigns props on uninitialised vars,
		// valid in PHP 4 but E_WARNING since 5.x. Unfixable in core —
		// Playground ships unmodified WordPress releases.
		if (strpos($message, "Creating default object from empty value") !== false) {
			return;
		}
		// WP 2.8's dashboard widget calls get_error_string() on a
		// null SimplePie when feed HTTP requests fail in WASM.
		if (strpos($message, "get_error_string() on null") !== false ||
			strpos($message, "get_error_string() on a non-object") !== false) {
			return;
		}
		// Don't complain about WordPress.org connection errors when
		// the runtime isn't using fetch().
		if (
			(
				! defined('USE_FETCH_FOR_REQUESTS') ||
				! USE_FETCH_FOR_REQUESTS
			) &&
			strpos($message, "WordPress could not establish a secure connection to WordPress.org") !== false)
		{
			return;
		}
`;function rewriteRelativePhpIncludes(n){return[/(^|[^\w$])((?:require|include)(?:_once)?)\s*\(\s*(['"])(\.\.\/[^'"]+)\3\s*\)/g,/(^|[^\w$])((?:require|include)(?:_once)?)\s*\(\s*(['"])(\.\/[^'"]+)\3\s*\)/g,/(^|[^\w$])((?:require|include)(?:_once)?)\s*\(\s*(['"])([a-z][\w-]*\.php)\3\s*\)/g,/(^|[^\w$])((?:require|include)(?:_once)?)\s+(['"])(\.\.\/[^'"]+)\3/g,/(^|[^\w$])((?:require|include)(?:_once)?)\s+(['"])(\.\/[^'"]+)\3/g,/(^|[^\w$])((?:require|include)(?:_once)?)\s+(['"])([a-z][\w-]*\.php)\3/g].reduce((r,s)=>r.replace(s,(i,a,o,l,u)=>`${a}${o}(${toDirnameExpr(u)})`),n)}function toDirnameExpr(n){let t=n,r=0;for(;t.startsWith("../");)r++,t=t.slice(3);for(;t.startsWith("./");)t=t.slice(2);let s="dirname(__FILE__)";for(let i=0;i<r;i++)s=`dirname(${s})`;return`${s} . '/${t}'`}async function prepareWp07SourceTree(n,t){return isWp07SourceTree(n,t)?(await ensureWp07CompatibilityDirectories(n,t),await writeWp07WordPressShims(n,t),await patchWp07Config(n,t),await patchWp07BlogHeader(n,t),await patchWp07WpDb(n,t),await patchWp07TemplateFunctions(n,t),await patchWp07AuthAndAdminFiles(n,t),!0):!1}async function runWp07PostInstallFixups(n){return isWp07SourceTree(n,n.documentRoot)?(await n.run({code:`<?php
			$db_dir = getenv('DOCUMENT_ROOT') . '/wp-content/database/';
			if (!is_dir($db_dir)) { @mkdir($db_dir, 0777, true); }
			$db_path = $db_dir . '.ht.sqlite';
			$pdo = new PDO('sqlite:' . $db_path);
			$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
			$now = date('Y-m-d H:i:s');

			$tables_sql = array(
				'b2posts' => "CREATE TABLE IF NOT EXISTS b2posts (
					ID INTEGER PRIMARY KEY AUTOINCREMENT,
					post_author INTEGER NOT NULL DEFAULT 0,
					post_date TEXT NOT NULL DEFAULT '0000-00-00 00:00:00',
					post_content TEXT NOT NULL DEFAULT '',
					post_title TEXT NOT NULL DEFAULT '',
					post_category INTEGER NOT NULL DEFAULT 0,
					post_excerpt TEXT NOT NULL DEFAULT '',
					post_status TEXT NOT NULL DEFAULT 'publish',
					comment_status TEXT NOT NULL DEFAULT 'open',
					ping_status TEXT NOT NULL DEFAULT 'open',
					post_password TEXT NOT NULL DEFAULT ''
				)",
				'b2categories' => "CREATE TABLE IF NOT EXISTS b2categories (
					cat_ID INTEGER PRIMARY KEY AUTOINCREMENT,
					cat_name TEXT NOT NULL DEFAULT ''
				)",
				'b2comments' => "CREATE TABLE IF NOT EXISTS b2comments (
					comment_ID INTEGER PRIMARY KEY AUTOINCREMENT,
					comment_post_ID INTEGER NOT NULL DEFAULT 0,
					comment_author TEXT NOT NULL DEFAULT '',
					comment_author_email TEXT NOT NULL DEFAULT '',
					comment_author_url TEXT NOT NULL DEFAULT '',
					comment_author_IP TEXT NOT NULL DEFAULT '',
					comment_date TEXT NOT NULL DEFAULT '0000-00-00 00:00:00',
					comment_content TEXT NOT NULL DEFAULT '',
					comment_karma INTEGER NOT NULL DEFAULT 0
				)",
				'b2settings' => "CREATE TABLE IF NOT EXISTS b2settings (
					ID INTEGER NOT NULL DEFAULT 1,
					posts_per_page INTEGER NOT NULL DEFAULT 20,
					what_to_show TEXT NOT NULL DEFAULT 'posts',
					archive_mode TEXT NOT NULL DEFAULT 'postbypost',
					time_difference INTEGER NOT NULL DEFAULT 0,
					AutoBR INTEGER NOT NULL DEFAULT 1,
					time_format TEXT NOT NULL DEFAULT 'g:i a',
					date_format TEXT NOT NULL DEFAULT 'n/j/Y',
					PRIMARY KEY (ID)
				)",
				'b2users' => "CREATE TABLE IF NOT EXISTS b2users (
					ID INTEGER PRIMARY KEY AUTOINCREMENT,
					user_login TEXT NOT NULL DEFAULT '',
					user_pass TEXT NOT NULL DEFAULT '',
					user_firstname TEXT NOT NULL DEFAULT '',
					user_lastname TEXT NOT NULL DEFAULT '',
					user_nickname TEXT NOT NULL DEFAULT '',
					user_icq INTEGER NOT NULL DEFAULT 0,
					user_email TEXT NOT NULL DEFAULT '',
					user_url TEXT NOT NULL DEFAULT '',
					user_ip TEXT NOT NULL DEFAULT '',
					user_domain TEXT NOT NULL DEFAULT '',
					user_browser TEXT NOT NULL DEFAULT '',
					dateYMDhour TEXT NOT NULL DEFAULT '0000-00-00 00:00:00',
					user_level INTEGER NOT NULL DEFAULT 0,
					user_aim TEXT NOT NULL DEFAULT '',
					user_msn TEXT NOT NULL DEFAULT '',
					user_yim TEXT NOT NULL DEFAULT '',
					user_idmode TEXT NOT NULL DEFAULT ''
				)",
				'b2links' => "CREATE TABLE IF NOT EXISTS b2links (
					link_id INTEGER PRIMARY KEY AUTOINCREMENT,
					link_url TEXT NOT NULL DEFAULT '',
					link_name TEXT NOT NULL DEFAULT '',
					link_image TEXT NOT NULL DEFAULT '',
					link_target TEXT NOT NULL DEFAULT '',
					link_category INTEGER NOT NULL DEFAULT 0,
					link_description TEXT NOT NULL DEFAULT '',
					link_visible TEXT NOT NULL DEFAULT 'Y',
					link_owner INTEGER NOT NULL DEFAULT 1,
					link_rating INTEGER NOT NULL DEFAULT 0,
					link_updated TEXT NOT NULL DEFAULT '0000-00-00 00:00:00',
					link_rel TEXT NOT NULL DEFAULT '',
					link_notes TEXT NOT NULL DEFAULT '',
					link_rss TEXT NOT NULL DEFAULT ''
				)",
				'b2linkcategories' => "CREATE TABLE IF NOT EXISTS b2linkcategories (
					cat_id INTEGER PRIMARY KEY AUTOINCREMENT,
					cat_name TEXT NOT NULL DEFAULT '',
					auto_toggle TEXT NOT NULL DEFAULT 'N',
					show_images TEXT NOT NULL DEFAULT 'Y',
					show_description TEXT NOT NULL DEFAULT 'N',
					show_rating TEXT NOT NULL DEFAULT 'Y',
					show_updated TEXT NOT NULL DEFAULT 'Y',
					sort_order TEXT NOT NULL DEFAULT 'name',
					sort_desc TEXT NOT NULL DEFAULT 'ASC',
					text_before_link TEXT NOT NULL DEFAULT '<li>',
					text_after_link TEXT NOT NULL DEFAULT '<br />',
					text_after_all TEXT NOT NULL DEFAULT '</li>',
					list_limit INTEGER NOT NULL DEFAULT -1
				)"
			);
			foreach ($tables_sql as $sql) {
				$pdo->exec($sql);
			}

			if (!$pdo->query("SELECT COUNT(*) FROM b2categories")->fetchColumn()) {
				$pdo->exec("INSERT INTO b2categories (cat_ID, cat_name) VALUES (1, 'General')");
			}
			if (!$pdo->query("SELECT COUNT(*) FROM b2settings")->fetchColumn()) {
				$pdo->exec("INSERT INTO b2settings (ID, posts_per_page, what_to_show, archive_mode, time_difference, AutoBR, time_format, date_format) VALUES (1, 20, 'posts', 'postbypost', 0, 1, 'g:i a', 'n/j/Y')");
			}
			if (!$pdo->query("SELECT COUNT(*) FROM b2users")->fetchColumn()) {
				$pass = md5('password');
				$pdo->exec("INSERT INTO b2users (ID, user_login, user_pass, user_nickname, user_email, user_level, dateYMDhour, user_idmode) VALUES (1, 'admin', '{$pass}', 'admin', 'admin@localhost.com', 10, '{$now}', 'nickname')");
			} else {
				$pass = md5('password');
				$pdo->exec("UPDATE b2users SET user_pass = '{$pass}', user_level = 10 WHERE user_login = 'admin'");
			}
			if (!$pdo->query("SELECT COUNT(*) FROM b2posts")->fetchColumn()) {
				$content = 'Welcome to WordPress. This is the first post. Edit or delete it, then start blogging!';
				$pdo->exec("INSERT INTO b2posts (ID, post_author, post_date, post_content, post_title, post_category, post_excerpt, post_status, comment_status, ping_status, post_password) VALUES (1, 1, '{$now}', '{$content}', 'Hello world!', 1, '', 'publish', 'open', 'open', '')");
			}
			if (!$pdo->query("SELECT COUNT(*) FROM b2comments")->fetchColumn()) {
				$pdo->exec("INSERT INTO b2comments (comment_post_ID, comment_author, comment_author_email, comment_author_url, comment_author_IP, comment_date, comment_content, comment_karma) VALUES (1, 'Mr WordPress', 'mr@wordpress.org', 'http://wordpress.org', '127.0.0.1', '{$now}', 'Hi, this is a comment. To delete a comment, just log in and view the comments for this post.', 0)");
			}
			if (!$pdo->query("SELECT COUNT(*) FROM b2linkcategories")->fetchColumn()) {
				$pdo->exec("INSERT INTO b2linkcategories (cat_id, cat_name) VALUES (1, 'General')");
			}
			if (!$pdo->query("SELECT COUNT(*) FROM b2links")->fetchColumn()) {
				$pdo->exec("INSERT INTO b2links (link_url, link_name, link_category, link_visible, link_owner) VALUES ('http://wordpress.org', 'WordPress', 1, 'Y', 1)");
			}
		`,env:{DOCUMENT_ROOT:n.documentRoot}}),!0):!1}function isWp07SourceTree(n,t){const r=joinPaths(t,"b2config.php"),s=joinPaths(t,"b2-include/b2vars.php");return!n.fileExists(r)||!n.fileExists(s)?!1:n.readFileAsText(s).includes("$b2_version = '0.71'")}async function ensureWp07CompatibilityDirectories(n,t){for(const r of[joinPaths(t,"wp-includes"),joinPaths(t,"wp-content"),joinPaths(t,"wp-content/database")])n.isDir(r)||await n.mkdir(r)}async function writeWp07WordPressShims(n,t){const r=joinPaths(t,"wp-includes/version.php");await n.writeFile(r,`<?php
$wp_version = '0.71';
$wp_db_version = 71;
`);const s=joinPaths(t,"wp-config.php");n.fileExists(s)||await n.writeFile(s,"<?php require_once dirname(__FILE__) . '/b2config.php';");const i=joinPaths(t,"wp-load.php");n.fileExists(i)||await n.writeFile(i,`<?php
if (!defined('ABSPATH')) {
	define('ABSPATH', dirname(__FILE__) . '/');
}
require_once ABSPATH . 'b2config.php';
`);const a=joinPaths(t,"wp-admin/post.php");n.fileExists(a)||await n.writeFile(a,"<?php require_once dirname(__FILE__) . '/b2edit.php';")}async function patchWp07Config(n,t){const r=joinPaths(t,"b2config.php");let s=n.readFileAsText(r);const i=s;s.includes("pg_wp07_bootstrap")||(s=s.replace("<?php",`<?php
if (!defined('ABSPATH')) define('ABSPATH', dirname(__FILE__) . '/'); /* pg_wp07_bootstrap */
if (!defined('WPINC')) define('WPINC', 'b2-include');
if (!defined('WP_CONTENT_DIR')) define('WP_CONTENT_DIR', ABSPATH . 'wp-content');
if (!defined('DB_ENGINE')) define('DB_ENGINE', 'sqlite');
if (!isset($table_prefix)) $table_prefix = 'b2';
error_reporting(E_ALL & ~E_NOTICE & ~8192 & ~2048);
`)),s=s.replace(/\$siteurl\s*=\s*'http:\/\/example\.com';[^\n]*/,"$siteurl = defined('WP_SITEURL') ? WP_SITEURL : 'http://localhost'; // pg_wp07_siteurl").replace('$blogname = "my weblog";','$blogname = "My WordPress Website";').replace('$blogdescription = "babblings !";','$blogdescription = "Just another WordPress weblog";').replace("$admin_email = 'you@example.com';","$admin_email = 'admin@localhost.com';").replace("$abspath =  getenv('DOCUMENT_ROOT') . $relpath . '/';","$abspath = dirname(__FILE__) . '/';"),s!==i&&await n.writeFile(r,s)}async function patchWp07BlogHeader(n,t){const r=joinPaths(t,"blog.header.php");let s=n.readFileAsText(r);const i=s;s=s.replace(`$where .= ' AND (post_status = "publish"';`,`$where .= " AND (post_status = 'publish'";`),s!==i&&await n.writeFile(r,s)}async function patchWp07WpDb(n,t){const r=joinPaths(t,"b2-include/wp-db.php");let s=n.readFileAsText(r);const i=s;s=injectWp07WpdbPolyfills(s),s=s.replace("$wpdb = new wpdb(DB_USER, DB_PASSWORD, DB_NAME, DB_HOST);",`if (!isset($GLOBALS['wpdb'])) {
	$GLOBALS['wpdb'] = new wpdb(DB_USER, DB_PASSWORD, DB_NAME, DB_HOST);
}
$wpdb = $GLOBALS['wpdb']; /* pg_wp07_preserve_sqlite_loader */`),s!==i&&await n.writeFile(r,s)}function injectWp07WpdbPolyfills(n){const t=[];if(n.includes("function set_prefix")||t.push(`
	function set_prefix($prefix) {
		$this->prefix = $prefix;
		$tables = array('posts', 'users', 'categories', 'comments', 'links', 'linkcategories', 'settings', 'options', 'postmeta', 'usermeta', 'terms', 'term_taxonomy', 'term_relationships');
		foreach ($tables as $table) {
			$this->$table = $prefix . $table;
		}
		return $prefix;
	}`),n.includes("function timer_start")||t.push(`
	function timer_start() {
		$this->time_start = microtime(true);
		return true;
	}`),n.includes("function timer_stop")||t.push(`
	function timer_stop() {
		return microtime(true) - $this->time_start;
	}`),n.includes("function init_charset")||t.push(`
	function init_charset() {
		if (defined('DB_CHARSET')) $this->charset = DB_CHARSET;
		if (defined('DB_COLLATE')) $this->collate = DB_COLLATE;
	}`),n.includes("function bail")||t.push(`
	function bail($message, $error_code = '500') {
		die($message);
	}`),n.includes("function check_connection")||t.push(`
	function check_connection($allow_bail = true) {
		return true;
	}`),t.length===0)return n;const r=n.match(/^(\s*})\s*\n+(\$wpdb|if\s*\(\s*!\s*isset\(\s*\$GLOBALS\['wpdb'\]\s*\))/m);if(!r||r.index===void 0)throw new Error("WP 0.7 wpdb polyfill anchor not found; b2-include/wp-db.php layout changed");const s=`
	// Polyfills added by WordPress Playground for WP 0.7.
`+t.join(`
`)+`

`;return n.substring(0,r.index)+s+n.substring(r.index)}async function patchWp07TemplateFunctions(n,t){const r=joinPaths(t,"b2-include/b2template.functions.php");let s=n.readFileAsText(r);const i=s;s.includes("pg_wp07_apply_filters")||(s=s.replace(`function apply_filters($tag, $string) {
	global $b2_filter;
	if (isset($b2_filter['all'])) {
		$b2_filter['all'] = (is_string($b2_filter['all'])) ? array($b2_filter['all']) : $b2_filter['all'];
		$b2_filter[$tag] = array_merge($b2_filter['all'], $b2_filter[$tag]);
		$b2_filter[$tag] = array_unique($b2_filter[$tag]);
	}
	if (isset($b2_filter[$tag])) {
		$b2_filter[$tags] = (is_string($b2_filter[$tag])) ? array($b2_filter[$tag]) : $b2_filter[$tag];
		$functions = $b2_filter[$tag];
		foreach($functions as $function) {
			$string = $function($string);
		}
	}
	return $string;
}`,`function apply_filters($tag, $string) { /* pg_wp07_apply_filters */
	global $b2_filter;
	$functions = array();
	// WP_SQLite_DB uses apply_filters('query'); b2's all filter texturizes SQL.
	if ($tag != 'query' && isset($b2_filter['all'])) {
		$all = is_array($b2_filter['all']) ? $b2_filter['all'] : array($b2_filter['all']);
		$functions = array_merge($functions, $all);
	}
	if (isset($b2_filter[$tag])) {
		$tag_functions = is_array($b2_filter[$tag]) ? $b2_filter[$tag] : array($b2_filter[$tag]);
		$functions = array_merge($functions, $tag_functions);
	}
	$functions = array_unique($functions);
	foreach($functions as $function) {
		if (function_exists($function)) {
			$string = $function($string);
		}
	}
	return $string;
}`),s!==i&&await n.writeFile(r,s))}async function patchWp07AuthAndAdminFiles(n,t){await patchWp07Login(n,t),await patchWp07AdminRelativePaths(n,t),await patchWp07AdminMenuTop(n,t),await patchWp07AdminAuth(n,t)}async function patchWp07Login(n,t){const r=joinPaths(t,"b2login.php");let s=n.readFileAsText(r);const i=s;s.includes("pg_wp07_login_auto_login")||(s=s.replace("switch($action) {",`${getWp07AutoLoginCookieBootstrap("pg_wp07_login_auto_login")}
switch($action) {`)),s.includes("pg_wp07_logout_guard")||(s=s.replace(`	setcookie('wordpressuser');
	setcookie('wordpresspass');`,`	setcookie('wordpressuser', '', time() - 31536000);
	setcookie('wordpresspass', '', time() - 31536000);
	setcookie('wordpressblogid', '', time() - 31536000);
	setcookie('wordpressuser', '', time() - 31536000, '/');
	setcookie('wordpresspass', '', time() - 31536000, '/');
	setcookie('wordpressblogid', '', time() - 31536000, '/');
	setcookie('playground_auto_login_already_logged_out', '1', time() + 172800, '/'); /* pg_wp07_logout_guard */`),s=s.replace("header('Refresh: 0;url=b2login.php');","header('Refresh: 0;url=b2login.php?loggedout=1');").replace("header('Location: b2login.php');","header('Location: b2login.php?loggedout=1');")),s!==i&&await n.writeFile(r,s)}async function patchWp07AdminRelativePaths(n,t){const r=joinPaths(t,"wp-admin");if(n.isDir(r))for(const s of n.listFiles(r)){if(!s.endsWith(".php"))continue;const i=joinPaths(r,s),a=n.readFileAsText(i),o=rewriteRelativePhpIncludes(a);o!==a&&await n.writeFile(i,o)}}async function patchWp07AdminMenuTop(n,t){const r=joinPaths(t,"wp-admin/b2menutop.php");let s=n.readFileAsText(r);const i=s;s=s.replace('file("./b2menutop.txt")',"file(dirname(__FILE__) . '/b2menutop.txt')").replace('<a href="http://wordpress.org" rel="external"><span>WordPress</span></a>','<a href="#" rel="external"><span>WordPress</span></a>'),s!==i&&await n.writeFile(r,s)}async function patchWp07AdminAuth(n,t){const r=joinPaths(t,"wp-admin/b2verifauth.php");let s=n.readFileAsText(r);const i=s;s.includes("pg_wp07_auto_login")||(s=s.replace("require_once('../b2config.php');",`require_once('../b2config.php');
${getWp07AutoLoginCookieBootstrap("pg_wp07_auto_login")}`),s!==i&&await n.writeFile(r,s))}function getWp07AutoLoginCookieBootstrap(n){return`
if (isset($_GET['loggedout']) || isset($HTTP_GET_VARS['loggedout'])) {
	$_COOKIE['playground_auto_login_already_logged_out'] = '1';
	unset($_COOKIE['wordpressuser']);
	unset($_COOKIE['wordpresspass']);
	unset($_COOKIE['wordpressblogid']);
	unset($HTTP_COOKIE_VARS['wordpressuser']);
	unset($HTTP_COOKIE_VARS['wordpresspass']);
	unset($HTTP_COOKIE_VARS['wordpressblogid']);
	if (!headers_sent()) {
		setcookie('playground_auto_login_already_logged_out', '1', time() + 172800, '/');
	}
}
if (
	defined('PLAYGROUND_AUTO_LOGIN_AS_USER') &&
	empty($_COOKIE['playground_auto_login_already_logged_out']) &&
	(!isset($action) || $action != 'logout')
) {
	$_pg_wp07_user = PLAYGROUND_AUTO_LOGIN_AS_USER;
	$_pg_wp07_pass = md5(md5('password'));
	$_COOKIE['wordpressuser'] = $_pg_wp07_user;
	$_COOKIE['wordpresspass'] = $_pg_wp07_pass;
	$_COOKIE['wordpressblogid'] = 1;
	$HTTP_COOKIE_VARS = $_COOKIE;
	$GLOBALS['HTTP_COOKIE_VARS'] = $HTTP_COOKIE_VARS;
	if (!headers_sent()) {
		$_pg_wp07_exp = time() + 172800;
		setcookie('wordpressuser', $_pg_wp07_user, $_pg_wp07_exp, '/');
		setcookie('wordpresspass', $_pg_wp07_pass, $_pg_wp07_exp, '/');
		setcookie('wordpressblogid', 1, $_pg_wp07_exp, '/');
	}
} /* ${n} */
`}async function backportWpPreV62MysqlCheck(n,t){const r=readOnDiskWpVersion$1(n,t);if(r===null)return;const s=parseFloat(r);if(!Number.isFinite(s)||s<5||s>=6.2)return;const i=joinPaths(t,"wp-includes/load.php");if(!n.fileExists(i))return;const a=n.readFileAsText(i),o=a.replace("extension_loaded( 'mysqli' )","function_exists( 'mysqli_connect' )");o!==a&&await n.writeFile(i,o)}function readOnDiskWpVersion$1(n,t){const r=joinPaths(t,"wp-includes/version.php");if(!n.fileExists(r))return null;const i=n.readFileAsText(r).match(/\$wp_version\s*=\s*['"]([^'"]+)['"]/);return i?i[1]:null}const LEGACY_WP_ERROR_REPORTING_VALUE=22527,LEGACY_WP_ERROR_REPORTING_PHP_EXPR="E_ALL & ~8192 & ~2048";async function patchWordPressSourceFiles(n,t){if(await prepareWp07SourceTree(n,t))return;await ensureVersionPhp(n,t),await ensureWpLoadPhp(n,t),await patchWpSettingsPhp(n,t),await patchWpInstallPhp(n,t),await patchWpDbPhp(n,t),await patchWpSchemaPhp(n,t),await patchWpAdminRelativePaths(n,t),await patchWpLoginDisable1Password(n,t),await patchErrorReportingInWpLoad(n,t),await patchWpInstallMailCrash(n,t);const r=readOnDiskWpVersion$1(n,t);if(r===null)return;const s=parseFloat(r);Number.isFinite(s)&&(s<1.2&&(await patchWp10DoubleQuotedSqlLiterals(n,t),await patchWp10LoginPlaintextCompare(n,t)),s<1.5&&await patchWp10AdminLogoLink(n,t),1.5<=s&&s<2&&await patchWpAdminDashboard(n,t),s<2&&(await patchWp10EditPhpPostTitleLinks(n,t),await patchWpFunctionsPhp(n,t)),2.1<=s&&s<2.3&&await patchWp21PluginsPhpInArray(n,t),s<2.5&&await patchCheckAdminReferer(n,t),s<2.8&&(await patchAdminAuthRedirect(n,t),await patchAdminAjaxAuth(n,t)),2.9<=s&&s<3.6&&await patchAdminNetworkCalls(n,t),3.3<=s&&s<3.4&&await patchWp33ScreenPhpSelfThis(n,t),s>=4.7&&await patchWp47ThemeSearchForms(n,t))}async function patchWp47ThemeSearchForms(n,t){const r=joinPaths(t,"wp-content/themes");if(n.isDir(r))for(const s of n.listFiles(r)){const i=joinPaths(r,s,"searchform.php");n.fileExists(i)&&n.unlink(i)}}async function patchAdminNetworkCalls(n,t){const r=joinPaths(t,"wp-admin/includes/dashboard.php");if(n.fileExists(r)){let a=n.readFileAsText(r);if(a.includes("function wp_dashboard_primary()")&&!a.includes("/* pg_no_rss */")){for(const o of["wp_dashboard_primary","wp_dashboard_secondary","wp_dashboard_plugins"])a=a.replace(new RegExp(`function ${o}\\(\\)\\s*\\{`),`function ${o}() { /* pg_no_rss */ return;`);await n.writeFile(r,a)}}const s=joinPaths(t,"wp-admin/admin.php");if(n.fileExists(s)){let a=n.readFileAsText(s);a.includes("do_action('admin_init');")&&!a.includes("/* pg_admin_init_cleanup */")&&(a=a.replace("do_action('admin_init');",`/* pg_admin_init_cleanup */
if (function_exists('remove_action')) {
	@remove_action('admin_init', '_maybe_update_plugins');
	@remove_action('admin_init', '_maybe_update_themes');
	@remove_action('admin_init', '_maybe_update_core');
	@remove_action('admin_init', 'wp_version_check');
	@remove_action('admin_init', 'wp_update_plugins');
	@remove_action('admin_init', 'wp_update_themes');
}
do_action('admin_init');`),await n.writeFile(s,a))}const i=joinPaths(t,"wp-admin/includes/update.php");if(n.fileExists(i)){let a=n.readFileAsText(i);if(!a.includes("/* pg_admin_no_updates */")){for(const o of["wp_plugin_update_rows","wp_plugin_update_row","wp_theme_update_rows","wp_theme_update_row","wp_update_plugins","wp_update_themes"]){const l=new RegExp(`function ${o}\\s*\\([^)]*\\)\\s*\\{`);l.test(a)&&(a=a.replace(l,u=>u+" /* pg_admin_no_updates */ return;"))}await n.writeFile(i,a)}}for(const a of[joinPaths(t,"wp-includes/SimplePie/File.php"),joinPaths(t,"wp-includes/class-simplepie.php")]){if(!n.fileExists(a))continue;let o=n.readFileAsText(a);o.includes("function SimplePie_File(")&&!o.includes("/* pg_no_fetch */")&&(o=o.replace(/function SimplePie_File\([^)]*\)\s*\{/,l=>l+`
		/* pg_no_fetch */
		$this->error = 'Network requests disabled in Playground';
		$this->success = false;
		return;`),await n.writeFile(a,o))}}async function patchWpInstallMailCrash(n,t){const r=[["function wp_new_blog_notification","pg_no_blog_notification"],["function wp_install_maybe_enable_pretty_permalinks","pg_no_permalink_check"]],s=[joinPaths(t,"wp-admin/includes/upgrade.php"),joinPaths(t,"wp-admin/upgrade-functions.php")];for(const i of s){if(!n.fileExists(i))continue;let a=n.readFileAsText(i),o=!1;for(const[l,u]of r){if(a.includes(`/* ${u} */`))continue;const c=a.indexOf(l);if(c===-1)continue;const d=a.indexOf("{",c);d!==-1&&(a=a.substring(0,d+1)+` /* ${u} */ return;`+a.substring(d+1),o=!0)}o&&await n.writeFile(i,a)}}async function patchErrorReportingInWpLoad(n,t){const r=joinPaths(t,"wp-load.php");if(!n.fileExists(r))return;const s=n.readFileAsText(r);if(!s.includes("error_reporting(")||s.includes("~8192")&&s.includes("~2048"))return;const i=s.replace(/error_reporting\(([^)]+)\)/g,(a,o)=>`error_reporting((${o}) & ~8192 & ~2048)`);await n.writeFile(r,i)}async function patchWp10AdminLogoLink(n,t){const r=joinPaths(t,"wp-admin/menu.php");if(n.fileExists(r)){const a=n.readFileAsText(r);if(!a.includes("/* pg_wp10_logo_link */")){const o='<h1 id="wphead"><a href="http://wordpress.org" rel="external">WordPress</a></h1>';if(a.includes(o)){const l=a.replace(o,'<h1 id="wphead"><a href="#" rel="external">WordPress</a></h1> <!-- pg_wp10_logo_link -->');l!==a&&await n.writeFile(r,l)}}}const s=joinPaths(t,"wp-admin/admin-header.php");if(n.fileExists(s)){const a=n.readFileAsText(s);if(!a.includes("/* pg_wp12_logo_link */")){const o='<a href="http://wordpress.org" rel="external"',l="</a>",u=a.indexOf(o);if(u!==-1){const c=a.indexOf(l,u);if(c!==-1){const d=a.substring(0,u)+'<a href="#">WordPress</a><!-- pg_wp12_logo_link -->'+a.substring(c+l.length);d!==a&&await n.writeFile(s,d)}}}}const i=joinPaths(t,"wp-admin/admin-footer.php");if(n.fileExists(i)){const a=n.readFileAsText(i);if(!a.includes("/* pg_wp10_footer_link */")){const o=a.replace('<a href="http://wordpress.org">WordPress</a>',"WordPress<!-- pg_wp10_footer_link -->").replace('<a href="http://wordpress.org/">WordPress</a>',"WordPress<!-- pg_wp10_footer_link -->");o!==a&&await n.writeFile(i,o)}}}async function patchWp10EditPhpPostTitleLinks(n,t){const r=joinPaths(t,"wp-admin/edit.php");if(!n.fileExists(r))return;const s=n.readFileAsText(r);if(s.includes("/* pg_wp10_post_title_edit */"))return;let i=s;const a='<strong><a href="<?php permalink_link(); ?>" rel="permalink"><?php the_title() ?></a></strong>';i.includes(a)&&(i=i.replace(a,'<strong><a href="post.php?action=edit&amp;post=<?php echo $id /* pg_wp10_post_title_edit */ ?>"><?php the_title() ?></a></strong>'));const o='<td><a href="<?php the_permalink(); ?>" rel="permalink">';i.includes(o)&&(i=i.replace(o,'<td><a href="post.php?action=edit&amp;post=<?php echo $id /* pg_wp10_post_title_edit */ ?>">'));const l=`<td><?php the_title() ?>
		<?php if ('private' == $post->post_status) _e(' - <strong>Private</strong>'); ?></td>`;i.includes(l)&&(i=i.replace(l,`<td><a href="post.php?action=edit&amp;post=<?php echo $id /* pg_wp10_post_title_edit */ ?>"><?php the_title() ?></a>
		<?php if ('private' == $post->post_status) _e(' - <strong>Private</strong>'); ?></td>`)),i!==s&&await n.writeFile(r,i)}async function patchWp33ScreenPhpSelfThis(n,t){const r=joinPaths(t,"wp-admin/includes/screen.php");if(!n.fileExists(r))return;const s=n.readFileAsText(r);if(!s.includes("self::$this->_help_sidebar"))return;const i=s.replace(/self::\$this->_help_sidebar/g,"$this->_help_sidebar");i!==s&&await n.writeFile(r,i)}async function patchWp21PluginsPhpInArray(n,t){const r=joinPaths(t,"wp-admin/plugins.php");if(!n.fileExists(r))return;const s=n.readFileAsText(r);if(s.includes("/* pg_wp21_active_plugins_array */"))return;const i="$current = get_option('active_plugins');";if(!s.includes(i))return;const a=s.replace(i,i+`
	if (!is_array($current)) $current = array(); /* pg_wp21_active_plugins_array */`);a!==s&&await n.writeFile(r,a)}async function patchWp10LoginPlaintextCompare(n,t){const r=joinPaths(t,"wp-login.php");if(!n.fileExists(r))return;const s=n.readFileAsText(r),i="AND user_pass = '$password'";if(!s.includes(i)||s.includes("pg_wp10_plain_or_md5"))return;let a=s.replace(i,"AND (user_pass = '$password' OR user_pass = MD5('$password')) /* pg_wp10_plain_or_md5 */");a=a.replace("$login->user_pass == $password","($login->user_pass == $password || $login->user_pass == md5($password))"),a!==s&&await n.writeFile(r,a)}async function ensureVersionPhp(n,t){const r=joinPaths(t,"wp-includes");if(!n.isDir(r))return;const s=joinPaths(r,"version.php");n.fileExists(s)||await n.writeFile(s,"<?php $wp_version = '1.0';")}async function patchWp10DoubleQuotedSqlLiterals(n,t){const r=joinPaths(t,"wp-blog-header.php");if(n.fileExists(r)){const i=n.readFileAsText(r),a=`$where .= ' AND (post_status = "publish"';`;i.includes(a)&&await n.writeFile(r,i.replace(a,`$where .= " AND (post_status = 'publish'";`))}const s=joinPaths(t,"wp-includes/vars.php");if(n.fileExists(s)){const i=n.readFileAsText(s),a="add_filter('all', 'wptexturize');";i.includes(a)&&await n.writeFile(s,i.replace(a,`// ${a} // Disabled by Playground: mangles SQL literals.`))}}async function ensureWpLoadPhp(n,t){const r=joinPaths(t,"wp-load.php");n.fileExists(r)||await n.writeFile(r,`<?php
if ( !defined('ABSPATH') ) {
	define('ABSPATH', dirname(__FILE__) . '/');
}
require_once(ABSPATH . 'wp-config.php');
`)}async function patchWpSettingsPhp(n,t){const r=joinPaths(t,"wp-settings.php");if(!n.fileExists(r))return;const s=n.readFileAsText(r);let i=s;i=i.replace(/if\s*\(\s*!extension_loaded\('mysql'\)\s*\)\s*\n\s*die/,`if ( false ) // Patched for SQLite
	die`),i=i.replace(/error_reporting\(([^)]+)\)/g,(a,o)=>o.includes("~8192")&&o.includes("~2048")?a:`error_reporting((${o}) & ~8192 & ~2048)`),i=i.replace(/set_magic_quotes_runtime\(\s*0\s*\)\s*;/g,"// set_magic_quotes_runtime(0); // Removed"),i.includes("function_exists('get_magic_quotes_gpc')")||(i=i.replace(/get_magic_quotes_gpc\(\)/g,"(function_exists('get_magic_quotes_gpc') && get_magic_quotes_gpc())")),i=i.replace(/=\s*&\s*new\b/g,"= new"),i=i.replace(/\$HTTP_SERVER_VARS/g,"$_SERVER"),!i.includes("WP_CONTENT_DIR")&&i.includes("define('WPINC'")&&(i=i.replace(/define\('WPINC',\s*'wp-includes'\);/,`define('WPINC', 'wp-includes');
if (!defined('WP_CONTENT_DIR')) define('WP_CONTENT_DIR', ABSPATH . 'wp-content');`)),i=i.replace(/unset\(\s*\$wp_filter\s*,/,"unset("),i=removeNotInstalledDie(i),i=injectInitHookCleanup(i),i!==s&&await n.writeFile(r,i)}function removeNotInstalledDie(n){const t=n.indexOf("installed WP");if(t===-1)return n;const r=n.lastIndexOf("die(",t);if(r===-1)return n;let s=0;for(let i=r+3;i<n.length;i++)if(n[i]==="(")s++;else if(n[i]===")"&&(s--,s===0)){let a=i+1;return n[a]===";"&&a++,n.substring(0,r)+"true; /* die removed by Playground */"+n.substring(a)}return n}function injectInitHookCleanup(n){return n.replace("do_action('init');",`// Remove hooks that make outbound HTTP requests (crash WASM).
if (function_exists('remove_action')) {
	@remove_action('init', 'wp_cron');
	@remove_action('init', 'wp_version_check');
	@remove_action('init', 'wp_update_plugins');
	@remove_action('init', 'wp_update_themes');
	@remove_action('admin_init', '_maybe_update_plugins');
	@remove_action('admin_init', '_maybe_update_themes');
	@remove_action('admin_init', 'wp_version_check');
	@remove_action('admin_init', 'wp_update_plugins');
	@remove_action('admin_init', 'wp_update_themes');
	@remove_action('load-plugins.php', 'wp_update_plugins');
	@remove_action('load-update.php', 'wp_update_plugins');
	@remove_action('load-update.php', 'wp_update_themes');
	@remove_action('load-themes.php', 'wp_update_themes');
	@remove_action('wp_update_plugins', 'wp_update_plugins');
	@remove_action('wp_version_check', 'wp_version_check');
}
if (function_exists('add_filter')) {
	function _pg_disable_curl() { return false; }
	function _pg_disable_streams() { return false; }
	@add_filter('use_curl_transport', '_pg_disable_curl');
	@add_filter('use_streams_transport', '_pg_disable_streams');
	@add_filter('use_ftp_transport', '_pg_disable_curl');
	@add_filter('use_fsockopen_transport', '_pg_disable_streams');
}
do_action('init');`)}async function patchWpFunctionsPhp(n,t){const r=joinPaths(t,"wp-includes/functions.php");if(!n.fileExists(r))return;let s=n.readFileAsText(r),i=!1;s.includes("$all_options->{$option->option_name}")&&!s.includes("$all_options = new stdClass")&&(s=s.replace("foreach ($options as $option) {",`$all_options = new stdClass;
	foreach ($options as $option) {`),i=!0),i&&await n.writeFile(r,s)}async function patchWpInstallPhp(n,t){const r=joinPaths(t,"wp-admin/install.php");if(!n.fileExists(r))return;const s=n.readFileAsText(r);let i=s;const a=joinPaths(t,"wp-admin");i=i.replace(/'\.\.\/(wp-config\.php)'/g,`'${t}/$1'`).replace(/'\.\.\/(wp-load\.php)'/g,`'${t}/$1'`).replace(/'\.\/(upgrade-functions\.php)'/g,`'${a}/$1'`).replace(/'(upgrade-functions\.php)'/g,`'${a}/$1'`).replace(/'\.\/(includes\/upgrade\.php)'/g,`'${a}/$1'`).replace(/'\.\.\/(wp-includes\/[^']+)'/g,`'${t}/$1'`),i=i.replace(/\$HTTP_GET_VARS/g,"$_GET").replace(/\$HTTP_POST_VARS/g,"$_POST"),i!==s&&await n.writeFile(r,i)}async function patchWpDbPhp(n,t){const r=joinPaths(t,"wp-includes/wp-db.php");if(!n.fileExists(r))return;const s=n.readFileAsText(r);let i=s;i.includes("isset($wpdb)")||(i=i.replace("$wpdb = new wpdb(DB_USER, DB_PASSWORD, DB_NAME, DB_HOST);","if ( !isset($wpdb) ) { $wpdb = new wpdb(DB_USER, DB_PASSWORD, DB_NAME, DB_HOST); }")),i.includes("db_connect")||(i=i.replace(/\$this->dbh\s*=\s*@mysql_connect\(\$dbhost\s*,\s*\$dbuser\s*,\s*\$dbpassword(?:\s*,\s*true)?\);/,'if (method_exists($this, "db_connect")) { $this->dbname = $dbname; $this->db_connect(); } else { $this->dbh = @mysql_connect($dbhost, $dbuser, $dbpassword); }')),i=injectWpdbPolyfills(i),i!==s&&await n.writeFile(r,i)}function injectWpdbPolyfills(n){const t=[];if(n.includes("function set_prefix")||t.push(`
	function set_prefix($prefix) {
		$this->prefix = $prefix;
		$tables = array('posts', 'users', 'categories', 'post2cat', 'comments', 'link2cat', 'links', 'options', 'postmeta', 'usermeta', 'terms', 'term_taxonomy', 'term_relationships');
		foreach ($tables as $t) {
			$this->$t = $prefix . $t;
		}
		return $prefix;
	}`),n.includes("function timer_start")||t.push(`
	function timer_start() {
		$this->time_start = microtime(true);
		return true;
	}`),n.includes("function timer_stop")||t.push(`
	function timer_stop() {
		return microtime(true) - $this->time_start;
	}`),n.includes("function init_charset")||t.push(`
	function init_charset() {
		if (defined('DB_CHARSET')) $this->charset = DB_CHARSET;
		if (defined('DB_COLLATE')) $this->collate = DB_COLLATE;
	}`),n.includes("function bail")||t.push(`
	function bail($message, $error_code = '500') {
		die($message);
	}`),n.includes("function check_connection")||t.push(`
	function check_connection($allow_bail = true) {
		return true;
	}`),t.length===0)return n;const r=n.match(/^(\s*})\s*\n+(\$wpdb|\?>\s*$|if\s*\(\s*!\s*isset\(\s*\$wpdb\s*\))/m);if(!r||r.index===void 0)return n;const s=`
	// Polyfills added by WordPress Playground.
`+t.join(`
`)+`

`;return n.substring(0,r.index)+s+n.substring(r.index)}async function patchWpAdminRelativePaths(n,t){const r=joinPaths(t,"wp-admin");if(n.isDir(r))for(const a of n.listFiles(r)){if(!a.endsWith(".php"))continue;const o=joinPaths(r,a),l=n.readFileAsText(o),u=rewriteRelativePhpIncludes(l).replace(/ABSPATH\s*\.\s*'\/wp-/g,"ABSPATH . 'wp-");u!==l&&await n.writeFile(o,u)}const s=joinPaths(t,"wp-admin/index.php");if(n.fileExists(s)){let a=n.readFileAsText(s);a.includes("get_settings('siteurl')")&&(a=a.replace(/get_settings\('siteurl'\)\s*\.\s*'\/wp-admin\//g,"'"),await n.writeFile(s,a))}const i=joinPaths(t,"wp-admin/menu.php");if(n.fileExists(i)){const a=n.readFileAsText(i),o="file('./menu.txt')";a.includes(o)&&await n.writeFile(i,a.replace(o,"file(dirname(__FILE__) . '/menu.txt')"))}}async function patchCheckAdminReferer(n,t){const r=joinPaths(t,"wp-admin/admin-functions.php");if(!n.fileExists(r))return;const s=n.readFileAsText(r);if(!s.includes("function check_admin_referer()")||!s.includes("$_SERVER['HTTP_REFERER']"))return;const i=replacePhpFunctionBody(s,"check_admin_referer",`
	do_action('check_admin_referer', '');
`);i!==s&&await n.writeFile(r,i)}function replacePhpFunctionBody(n,t,r){const s=`function ${t}()`,i=n.indexOf(s);if(i===-1)return n;const a=n.indexOf("{",i+s.length);if(a===-1)return n;let o=1;for(let l=a+1;l<n.length;l++){const u=n[l];if(u==="{")o++;else if(u==="}"&&(o--,o===0))return n.substring(0,a+1)+r+n.substring(l)}return n}async function patchWpAdminDashboard(n,t){const r=joinPaths(t,"wp-admin/index.php");if(n.fileExists(r)){const s=n.readFileAsText(r),i=s.replace(/AND post_date_gmt < '\$today'/,"");i!==s&&await n.writeFile(r,i)}await patchRssFunctionsErrorStub(n,t)}async function patchRssFunctionsErrorStub(n,t){const r=joinPaths(t,"wp-includes/rss-functions.php");if(!n.fileExists(r))return;let s=n.readFileAsText(r);!/^\s*error\s*\(/m.test(s)||/^function\s+error\s*\(/m.test(s)||(s=s.replace(/^(<\?php\s*)/,`$1
if (!function_exists('error')) {
	function error($msg = '', $lvl = E_USER_WARNING) {
		if (defined('MAGPIE_DEBUG') && MAGPIE_DEBUG) {
			trigger_error($msg, $lvl);
		}
	}
}
`),await n.writeFile(r,s))}async function patchWpLoginDisable1Password(n,t){const r=joinPaths(t,"wp-login.php");if(!n.fileExists(r))return;let s=n.readFileAsText(r),i=!1;for(const a of["log","pwd"]){const o=new RegExp(`(\\bname=(['"])${a}\\2)(?![^>]*data-1p-ignore)`);o.test(s)&&(s=s.replace(o,"$1 data-1p-ignore"),i=!0)}i&&await n.writeFile(r,s)}async function patchAdminAuthRedirect(n,t){const r=joinPaths(t,"wp-admin/admin.php");if(n.fileExists(r)){const i=n.readFileAsText(r);if(i.includes("auth_redirect()")){const a=`
// Playground: populate auth cookies and force admin user before auth_redirect.
if (defined('PLAYGROUND_AUTO_LOGIN_AS_USER')) {
	if (function_exists('is_user_logged_in') && is_user_logged_in()) {
		// On WP < 4.0, wp_set_auth_cookie() does not update $_COOKIE
		// in-process — auth_redirect() reads $_COOKIE, so re-emit.
		if (function_exists('wp_generate_auth_cookie') && defined('LOGGED_IN_COOKIE') && empty($_COOKIE[LOGGED_IN_COOKIE])) {
			$_pg_uid = wp_get_current_user()->ID;
			$_pg_exp = time() + 172800;
			$_COOKIE[AUTH_COOKIE] = wp_generate_auth_cookie($_pg_uid, $_pg_exp, 'auth');
			if (defined('SECURE_AUTH_COOKIE'))
				$_COOKIE[SECURE_AUTH_COOKIE] = wp_generate_auth_cookie($_pg_uid, $_pg_exp, 'secure_auth');
			$_COOKIE[LOGGED_IN_COOKIE] = wp_generate_auth_cookie($_pg_uid, $_pg_exp, 'logged_in');
		}
	} else {
		${legacyAuthCookieBlock("PLAYGROUND_AUTO_LOGIN_AS_USER")}
		// WP 2.0-2.4: kses_init() runs during do_action('init') inside
		// wp-settings.php and caches $current_user as WP_User(0) when
		// no cookies were set yet. Reset and re-evaluate so capability
		// checks see the user we just authenticated.
		if (!function_exists('wp_generate_auth_cookie')) {
			$GLOBALS['current_user'] = null;
			if (function_exists('get_currentuserinfo')) {
				get_currentuserinfo();
			}
		}
	}
	// Force admin caps in-memory: if populate_roles() never ran
	// (e.g. WP 2.0, or WP 2.5 installs that crashed before writing
	// roles), the user has no caps and every current_user_can() fails.
	$_pg_cu = isset($GLOBALS['current_user']) ? $GLOBALS['current_user'] : null;
	if ($_pg_cu && isset($_pg_cu->ID) && $_pg_cu->ID > 0 && empty($_pg_cu->allcaps['read'])) {
		// Respect a DB-stored user_level so a blueprint that auto-logs
		// in as a lower-privilege user doesn't silently get level 10.
		$_pg_db_level = isset($_pg_cu->user_level)
			? (int) $_pg_cu->user_level
			: null;
		if ($_pg_db_level === null && isset($_pg_user) && $_pg_user) {
			$_pg_db_level = isset($_pg_user->user_level)
				? (int) $_pg_user->user_level
				: null;
		}
		$_pg_cu->user_level = $_pg_db_level !== null ? $_pg_db_level : 10;
		$_pg_effective_level = $_pg_cu->user_level;
		$_pg_caps = array('read');
		for ($_pg_i = 0; $_pg_i <= $_pg_effective_level; $_pg_i++) {
			$_pg_caps[] = 'level_' . $_pg_i;
		}
		if ($_pg_effective_level >= 10) {
			$_pg_caps = array_merge($_pg_caps, array(
				'switch_themes','edit_themes','activate_plugins',
				'edit_plugins','edit_users','edit_files','manage_options',
				'moderate_comments','manage_categories','manage_links',
				'upload_files','import','unfiltered_html','edit_posts',
				'edit_others_posts','edit_published_posts','publish_posts',
				'edit_pages'));
		}
		foreach ($_pg_caps as $_pg_c) {
			$_pg_cu->allcaps[$_pg_c] = true;
		}
		if ($_pg_effective_level >= 10) {
			$_pg_cu->caps = array('administrator' => true);
		}
	}
}
`,o=i.replace("auth_redirect();",a+"auth_redirect();");o!==i&&await n.writeFile(r,o)}}const s=joinPaths(t,"wp-admin/auth.php");if(n.fileExists(s)){const i=n.readFileAsText(s);if(i.includes("$cookiehash")&&!i.includes("Playground: bypass auth")){const a=`<?php
require_once(ABSPATH . 'wp-config.php');
// Playground: bypass auth and manually populate user globals.
global $user_login, $userdata, $user_level, $user_ID,
	$user_nickname, $user_email, $user_url, $user_pass_md5, $cookiehash;
$__pg_user_login = defined('PLAYGROUND_AUTO_LOGIN_AS_USER')
	? PLAYGROUND_AUTO_LOGIN_AS_USER
	: 'admin';
$__pg_cookiehash = defined('COOKIEHASH')
	? COOKIEHASH
	: (isset($cookiehash) && $cookiehash
		? $cookiehash
		: md5(function_exists('get_settings') ? get_settings('siteurl') : ''));
if ($__pg_cookiehash) {
	$_COOKIE['wordpressuser_' . $__pg_cookiehash] = $__pg_user_login;
}
if (function_exists('get_userdatabylogin')) {
	$__pg_userdata = get_userdatabylogin($__pg_user_login);
	if ($__pg_userdata) {
		$user_login = $__pg_user_login;
		$userdata = $__pg_userdata;
		$user_level = isset($__pg_userdata->user_level)
			? (int) $__pg_userdata->user_level
			: 10;
		$user_ID = $__pg_userdata->ID;
		$user_nickname = isset($__pg_userdata->user_nickname)
			? $__pg_userdata->user_nickname
			: $__pg_user_login;
		$user_email = isset($__pg_userdata->user_email)
			? $__pg_userdata->user_email
			: '';
		$user_url = isset($__pg_userdata->user_url)
			? $__pg_userdata->user_url
			: '';
		$user_pass_md5 = md5(
			isset($__pg_userdata->user_pass) ? $__pg_userdata->user_pass : ''
		);
	}
}
?>`;a!==i&&await n.writeFile(s,a)}}}async function patchAdminAjaxAuth(n,t){const r=joinPaths(t,"wp-admin/admin-ajax.php");if(!n.fileExists(r))return;let s=n.readFileAsText(r);if(!s.includes("is_user_logged_in"))return;const i=`
// Playground: authenticate admin user for AJAX requests on WP < 2.8.
if (defined('PLAYGROUND_AUTO_LOGIN_AS_USER')) {
	${legacyAuthCookieBlock("PLAYGROUND_AUTO_LOGIN_AS_USER")}
}
`;s=s.replace(/if\s*\(\s*!\s*is_user_logged_in\(\)\s*\)/,i+"if ( !is_user_logged_in() )"),await n.writeFile(r,s)}function legacyAuthCookieBlock(n){return`
$_pg_user = null;
if (function_exists('wp_generate_auth_cookie')) {
	$_pg_user = function_exists('get_user_by')
		? get_user_by('login', ${n})
		: (function_exists('get_userdatabylogin')
			? get_userdatabylogin(${n}) : null);
	if ($_pg_user) {
		wp_set_current_user($_pg_user->ID, $_pg_user->user_login);
		$_pg_exp = time() + 172800;
		if (defined('AUTH_COOKIE'))
			$_COOKIE[AUTH_COOKIE] = wp_generate_auth_cookie($_pg_user->ID, $_pg_exp, 'auth');
		if (defined('SECURE_AUTH_COOKIE'))
			$_COOKIE[SECURE_AUTH_COOKIE] = wp_generate_auth_cookie($_pg_user->ID, $_pg_exp, 'secure_auth');
		if (defined('LOGGED_IN_COOKIE'))
			$_COOKIE[LOGGED_IN_COOKIE] = wp_generate_auth_cookie($_pg_user->ID, $_pg_exp, 'logged_in');
	}
}
`}async function patchWpSchemaPhp(n,t){const r=readOnDiskWpVersion$1(n,t);if(r===null)return;const s=parseFloat(r);if(!Number.isFinite(s)||s>=3.3)return;const i=joinPaths(t,"wp-admin/includes/schema.php");if(!n.fileExists(i))return;const a=n.readFileAsText(i);/\$wp_queries\s*=\s*"CREATE TABLE/.test(a)&&!a.includes("function wp_get_db_schema")&&await patchInlineSchemaPhp(n,t,i,a)}async function patchInlineSchemaPhp(n,t,r,s){const i=s.match(/\$wp_queries\s*=\s*"CREATE TABLE/);if(!i||i.index===void 0)return;const a=i.index,o='";',l=s.indexOf(o,a);if(l===-1)return;const u=l+o.length,d=`function wp_get_db_schema( $scope = 'all', $blog_id = null ) {
	global $wpdb, $wp_queries, $charset_collate;
	$charset_collate = '';
	if ( ! empty($wpdb->charset) )
		$charset_collate = "DEFAULT CHARACTER SET $wpdb->charset";
	if ( ! empty($wpdb->collate) )
		$charset_collate .= " COLLATE $wpdb->collate";
	${s.substring(a,u)}
	return $wp_queries;
}`,p=s.substring(0,a)+d+s.substring(u);await n.writeFile(r,p);const f=joinPaths(t,"wp-admin/includes/upgrade.php");if(n.fileExists(f)){const g=n.readFileAsText(f),_=g.replace(/(\$alterations\s*=\s*dbDelta\(\s*\$wp_queries\s*\))/g,"if ( function_exists('wp_get_db_schema') ) { $wp_queries = wp_get_db_schema(); } $1");_!==g&&await n.writeFile(f,_)}}const PLAYGROUND_MANAGED_DB_PHP_MARKER="@playground-managed";function generateDbPhpContent(){return`<?php
// ${PLAYGROUND_MANAGED_DB_PHP_MARKER} — Playground-generated db.php.
// WP < 3.0 loads only db.php and skips wp-db.php, so we pull
// in the wpdb class definition explicitly.
if (defined('ABSPATH') && defined('WPINC') && !class_exists('wpdb', false)) {
	require_once(ABSPATH . WPINC . '/wp-db.php');
}
// Old wpdb (WP < 3.0) has no db_connect() and calls mysql_connect()
// inline, so the SQLite driver never gets a chance to attach. Load
// the integration here and reinitialise to swap the dbh in place.
if (
	class_exists('wpdb', false) &&
	isset($GLOBALS['wpdb']) &&
	!($GLOBALS['wpdb'] instanceof wpdb) &&
	!method_exists('wpdb', 'db_connect') &&
	file_exists('/internal/shared/mu-plugins/sqlite-database-integration.php')
) {
	require_once '/internal/shared/mu-plugins/sqlite-database-integration.php';
	if (
		isset($GLOBALS['wpdb']) &&
		$GLOBALS['wpdb'] instanceof wpdb &&
		method_exists($GLOBALS['wpdb'], 'reinitialize_sqlite')
	) {
		$GLOBALS['wpdb']->reinitialize_sqlite();
	}
}
// Remaining mysqli_* stubs not covered by the 0-sqlite.php preload.
// WP 4.x's extension_loaded('mysqli') check expects these to exist.
if (!function_exists('mysqli_real_connect')) {
	function mysqli_real_connect() { return true; }
}
if (!function_exists('mysqli_error')) {
	function mysqli_error() { return ''; }
}
if (!function_exists('mysqli_errno')) {
	function mysqli_errno() { return 0; }
}
if (!function_exists('mysqli_query')) {
	function mysqli_query() { return false; }
}
if (!function_exists('mysqli_set_charset')) {
	function mysqli_set_charset() { return true; }
}
if (!function_exists('mysqli_select_db')) {
	function mysqli_select_db() { return true; }
}
if (!function_exists('mysqli_close')) {
	function mysqli_close() { return true; }
}
`}async function runPostInstallLegacyFixups(n,t){if(await runWp07PostInstallFixups(n))return;let r=null;const s=joinPaths(n.documentRoot,"wp-includes/version.php");if(n.fileExists(s)){const a=n.readFileAsText(s).match(/\$wp_version\s*=\s*['"]([^'"]+)['"]/);a&&(r=a[1])}const i=r!==null&&parseFloat(r)<3.5;try{await n.run({code:`<?php
				// WP_INSTALLING bypasses WP 1.x's "not installed" die() in wp-settings.php.
				define('WP_INSTALLING', true);
				error_reporting(${LEGACY_WP_ERROR_REPORTING_PHP_EXPR});
				ini_set('display_errors', '0');
				ob_start();
				$_pg_db_path = getenv('DOCUMENT_ROOT') . '/wp-content/database/.ht.sqlite';
				if (!file_exists($_pg_db_path)) { exit; }
				$_pg_pdo = new PDO('sqlite:' . $_pg_db_path);
				$_pg_check = $_pg_pdo->query("SELECT count(*) FROM sqlite_master WHERE type='table' AND name='wp_users'")->fetchColumn();
				$_pg_pdo = null;
				if (!$_pg_check) { exit; }
				$wp_load = getenv('DOCUMENT_ROOT') . '/wp-load.php';
				if (!file_exists($wp_load)) { exit; }
				require $wp_load;
				ob_clean();
				global $wpdb;
				if (!isset($wpdb) || !method_exists($wpdb, 'query')) { exit; }

				// Persist the scoped siteurl/home to the DB so parse_request()
				// strips the scope prefix from REQUEST_URI. Filters alone
				// (env.php) aren't enough on WP < 2.2.
				$_pg_opts = !empty($wpdb->options) ? $wpdb->options : $GLOBALS['table_prefix'] . 'options';
				try {
					$_pg_url = getenv('PLAYGROUND_SITE_URL');
					if ($_pg_url) {
						$_pg_current = $wpdb->get_var("SELECT option_value FROM {$_pg_opts} WHERE option_name = 'siteurl'");
						if ($_pg_current !== $_pg_url) {
							$wpdb->query("UPDATE {$_pg_opts} SET option_value = '{$_pg_url}' WHERE option_name = 'siteurl'");
							$wpdb->query("UPDATE {$_pg_opts} SET option_value = '{$_pg_url}' WHERE option_name = 'home'");
						}
					}
				} catch (Exception $e) {}

				// $wpdb->users exists on WP 1.5+; older WP needs the prefix.
				$users_table = !empty($wpdb->users) ? $wpdb->users : $GLOBALS['table_prefix'] . 'users';

				// WP 1.0/1.2 installers often leave the users table or admin row missing.
				$wpdb->query("CREATE TABLE IF NOT EXISTS {$users_table} (
					ID int(10) unsigned NOT NULL auto_increment,
					user_login varchar(20) NOT NULL default '',
					user_pass varchar(64) NOT NULL default '',
					user_firstname varchar(50) NOT NULL default '',
					user_lastname varchar(50) NOT NULL default '',
					user_nickname varchar(50) NOT NULL default '',
					user_icq int(10) unsigned NOT NULL default '0',
					user_email varchar(100) NOT NULL default '',
					user_url varchar(100) NOT NULL default '',
					user_ip varchar(15) NOT NULL default '',
					user_domain varchar(200) NOT NULL default '',
					user_browser varchar(200) NOT NULL default '',
					dateYMDhour datetime NOT NULL default '0000-00-00 00:00:00',
					user_level int(2) unsigned NOT NULL default '0',
					user_aim varchar(50) NOT NULL default '',
					user_msn varchar(100) NOT NULL default '',
					user_yim varchar(50) NOT NULL default '',
					user_idmode varchar(20) NOT NULL default '',
					PRIMARY KEY (ID),
					UNIQUE KEY user_login (user_login)
				)");
				if (!$wpdb->get_var("SELECT COUNT(*) FROM {$users_table}")) {
					$now = date('Y-m-d H:i:s');
					$wpdb->query(
						"INSERT INTO {$users_table} (ID, user_login, user_pass, user_email, user_level, dateYMDhour, user_nickname) " .
						"VALUES (1, 'admin', MD5('password'), 'admin@localhost.com', 10, '{$now}', 'admin')"
					);
				}
				$wpdb->query(
					"UPDATE {$users_table} SET user_pass = MD5('password') WHERE user_login = 'admin'"
				);

				// populate_roles() can fail on SQLite; seed the admin role and caps directly.
				$p = $GLOBALS['table_prefix'];
				$roles_key = $p . 'user_roles';
				try {
					$has_roles = $wpdb->get_var(
						"SELECT COUNT(*) FROM {$p}options WHERE option_name = '{$roles_key}'"
					);
				} catch (Exception $e) {
					$has_roles = 0;
				}
				if (!$has_roles) {
					$roles = array('administrator' => array(
						'name' => 'Administrator',
						'capabilities' => array(
							'switch_themes'=>true, 'edit_themes'=>true,
							'activate_plugins'=>true, 'edit_plugins'=>true,
							'edit_users'=>true, 'edit_files'=>true,
							'manage_options'=>true, 'moderate_comments'=>true,
							'manage_categories'=>true, 'manage_links'=>true,
							'upload_files'=>true, 'import'=>true,
							'unfiltered_html'=>true, 'edit_posts'=>true,
							'edit_others_posts'=>true, 'edit_published_posts'=>true,
							'publish_posts'=>true, 'edit_pages'=>true,
							'read'=>true, 'level_10'=>true, 'level_9'=>true,
							'level_8'=>true, 'level_7'=>true, 'level_6'=>true,
							'level_5'=>true, 'level_4'=>true, 'level_3'=>true,
							'level_2'=>true, 'level_1'=>true, 'level_0'=>true,
							'edit_others_pages'=>true, 'edit_published_pages'=>true,
							'publish_pages'=>true, 'delete_pages'=>true,
							'delete_others_pages'=>true, 'delete_published_pages'=>true,
							'delete_posts'=>true, 'delete_others_posts'=>true,
							'delete_published_posts'=>true, 'delete_private_posts'=>true,
							'edit_private_posts'=>true, 'read_private_posts'=>true,
							'delete_private_pages'=>true, 'edit_private_pages'=>true,
							'read_private_pages'=>true,
						)
					));
					$wpdb->query("INSERT INTO {$p}options (option_name, option_value, autoload) VALUES ('{$roles_key}', '" . addslashes(serialize($roles)) . "', 'yes')");
				}
				$um = isset($wpdb->usermeta) ? $wpdb->usermeta : $p . 'usermeta';
				try {
					$has_cap = $wpdb->get_var("SELECT COUNT(*) FROM {$um} WHERE user_id=1 AND meta_key='{$p}capabilities'");
					if (!$has_cap) {
						$cap_val = addslashes(serialize(array('administrator' => true)));
						$wpdb->query("INSERT INTO {$um} (user_id, meta_key, meta_value) VALUES (1, '{$p}capabilities', '{$cap_val}')");
					}
					$has_level = $wpdb->get_var("SELECT COUNT(*) FROM {$um} WHERE user_id=1 AND meta_key='{$p}user_level'");
					if (!$has_level) {
						$wpdb->query("INSERT INTO {$um} (user_id, meta_key, meta_value) VALUES (1, '{$p}user_level', '10')");
					}
				} catch (Exception $e) {}

				// Seed default content when the install left the posts table empty.
				$posts_table = !empty($wpdb->posts) ? $wpdb->posts : $GLOBALS['table_prefix'] . 'posts';
				$has_posts = false;
				try { $has_posts = (bool)$wpdb->get_var("SELECT COUNT(*) FROM {$posts_table}"); } catch (Exception $e) {}
				if (!$has_posts) {
					$now = date('Y-m-d H:i:s');
					$now_gmt = gmdate('Y-m-d H:i:s');
					if (isset($wpdb->categories)) {
						$wpdb->query("INSERT INTO {$wpdb->categories} (cat_ID, cat_name, category_nicename, category_description, category_parent) VALUES (1, 'Uncategorized', 'uncategorized', '', 0)");
					}
					// Columns common to WP 1.0+.
					$wpdb->query("INSERT INTO {$posts_table} (ID, post_author, post_date, post_date_gmt, post_content, post_title, post_excerpt, post_status, comment_status, ping_status, post_password, post_name, to_ping, pinged, post_modified, post_modified_gmt, post_content_filtered) VALUES (1, 1, '{$now}', '{$now_gmt}', 'Welcome to WordPress. This is your first post. Edit or delete it, then start blogging!', 'Hello world!', '', 'publish', 'open', 'open', '', 'hello-world', '', '', '{$now}', '{$now_gmt}', '')");
					if (isset($wpdb->comments)) {
						$wpdb->query("INSERT INTO {$wpdb->comments} (comment_post_ID, comment_author, comment_author_email, comment_author_url, comment_author_IP, comment_date, comment_date_gmt, comment_content, comment_karma, comment_approved, comment_agent, comment_type, comment_parent, user_id) VALUES (1, 'Mr WordPress', '', 'http://wordpress.org', '127.0.0.1', '{$now}', '{$now_gmt}', 'Hi, this is a comment. To delete a comment, just log in and view the post comments. There you will have the option to edit or delete them.', 0, '1', '', '', 0, 0)");
					}
					if (isset($wpdb->post2cat)) {
						$wpdb->query("INSERT INTO {$wpdb->post2cat} (rel_id, post_id, category_id) VALUES (1, 1, 1)");
					}
				}
			`,env:{DOCUMENT_ROOT:n.documentRoot,PLAYGROUND_SITE_URL:t||""}})}catch(a){logger.warn("Legacy WP post-install fixups failed (non-fatal):",a)}if(i)try{await n.run({code:`<?php
				$db_dir = getenv('DOCUMENT_ROOT') . '/wp-content/database/';
				if (!is_dir($db_dir)) { @mkdir($db_dir, 0777, true); }
				$db_path = $db_dir . '.ht.sqlite';
				$pdo = new PDO('sqlite:' . $db_path);
				$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

				$prefix = 'wp_';
				$table = $prefix . 'users';
				try {
					$count = $pdo->query("SELECT COUNT(*) FROM {$table}")->fetchColumn();
				} catch (Exception $e) {
					$pdo->exec("CREATE TABLE IF NOT EXISTS {$table} (
						ID INTEGER PRIMARY KEY AUTOINCREMENT,
						user_login TEXT NOT NULL DEFAULT '',
						user_pass TEXT NOT NULL DEFAULT '',
						user_nickname TEXT NOT NULL DEFAULT '',
						user_email TEXT NOT NULL DEFAULT '',
						user_url TEXT NOT NULL DEFAULT '',
						user_ip TEXT NOT NULL DEFAULT '',
						user_domain TEXT NOT NULL DEFAULT '',
						user_browser TEXT NOT NULL DEFAULT '',
						dateYMDhour TEXT NOT NULL DEFAULT '0000-00-00 00:00:00',
						user_level INTEGER NOT NULL DEFAULT 0,
						user_idmode TEXT NOT NULL DEFAULT '',
						user_firstname TEXT NOT NULL DEFAULT '',
						user_lastname TEXT NOT NULL DEFAULT '',
						user_icq INTEGER NOT NULL DEFAULT 0,
						user_aim TEXT NOT NULL DEFAULT '',
						user_msn TEXT NOT NULL DEFAULT '',
						user_yim TEXT NOT NULL DEFAULT ''
					)");
					$count = 0;
				}
				if ($count == 0) {
					$now = date('Y-m-d H:i:s');
					// SECURITY: md5('password') matches WP 1.0-1.2's single-md5
					// scheme so auto-login works without a blueprint password.
					// Safe only inside the Playground WASM sandbox.
					$pass = md5('password');
					try {
						$col_info = $pdo->query("PRAGMA table_info({$table})")->fetchAll(PDO::FETCH_ASSOC);
						$known = array(
							'ID' => '1', 'user_login' => "'admin'",
							'user_pass' => "'{$pass}'", 'user_email' => "'admin@localhost.com'",
							'user_level' => '10', 'dateYMDhour' => "'{$now}'",
							'user_nickname' => "'admin'", 'user_nicename' => "'admin'",
							'user_registered' => "'{$now}'", 'user_status' => '0',
						);
						$ins_cols = array(); $ins_vals = array();
						foreach ($col_info as $ci) {
							$cn = $ci['name'];
							$ins_cols[] = $cn;
							if (isset($known[$cn])) {
								$ins_vals[] = $known[$cn];
							} elseif ($ci['dflt_value'] !== null) {
								$ins_vals[] = $ci['dflt_value'];
							} elseif (stripos($ci['type'], 'int') !== false) {
								$ins_vals[] = '0';
							} else {
								$ins_vals[] = "''";
							}
						}
						$pdo->exec("INSERT INTO {$table} (" . implode(',', $ins_cols) . ") VALUES (" . implode(',', $ins_vals) . ")");
					} catch (Exception $e) {}
				} else {
					// See SECURITY note above.
					$pass = md5('password');
					try { $pdo->exec("UPDATE {$table} SET user_pass = '{$pass}' WHERE user_login = 'admin'"); } catch (Exception $e) {}
				}

				// WP 1.0-1.2 install often leaves these tables missing because
				// the SQLite driver can't translate the old-style CREATE TABLEs.
				$now = date('Y-m-d H:i:s');
				$now_gmt = gmdate('Y-m-d H:i:s');
				$tables_sql = array(
					'posts' => "CREATE TABLE IF NOT EXISTS {$prefix}posts (
						ID INTEGER PRIMARY KEY AUTOINCREMENT,
						post_author INTEGER NOT NULL DEFAULT 0,
						post_date TEXT NOT NULL DEFAULT '0000-00-00 00:00:00',
						post_date_gmt TEXT NOT NULL DEFAULT '0000-00-00 00:00:00',
						post_content TEXT NOT NULL DEFAULT '',
						post_title TEXT NOT NULL DEFAULT '',
						post_category INTEGER NOT NULL DEFAULT 0,
						post_excerpt TEXT NOT NULL DEFAULT '',
						post_status TEXT NOT NULL DEFAULT 'publish',
						comment_status TEXT NOT NULL DEFAULT 'open',
						ping_status TEXT NOT NULL DEFAULT 'open',
						post_password TEXT NOT NULL DEFAULT '',
						post_name TEXT NOT NULL DEFAULT '',
						to_ping TEXT NOT NULL DEFAULT '',
						pinged TEXT NOT NULL DEFAULT '',
						post_modified TEXT NOT NULL DEFAULT '0000-00-00 00:00:00',
						post_modified_gmt TEXT NOT NULL DEFAULT '0000-00-00 00:00:00',
						post_content_filtered TEXT NOT NULL DEFAULT '',
						post_parent INTEGER NOT NULL DEFAULT 0,
						menu_order INTEGER NOT NULL DEFAULT 0,
						post_mime_type TEXT NOT NULL DEFAULT ''
					)",
					'categories' => "CREATE TABLE IF NOT EXISTS {$prefix}categories (
						cat_ID INTEGER PRIMARY KEY AUTOINCREMENT,
						cat_name TEXT NOT NULL DEFAULT '',
						category_nicename TEXT NOT NULL DEFAULT '',
						category_description TEXT NOT NULL DEFAULT '',
						category_parent INTEGER NOT NULL DEFAULT 0
					)",
					'post2cat' => "CREATE TABLE IF NOT EXISTS {$prefix}post2cat (
						rel_id INTEGER PRIMARY KEY AUTOINCREMENT,
						post_id INTEGER NOT NULL DEFAULT 0,
						category_id INTEGER NOT NULL DEFAULT 0
					)",
					'comments' => "CREATE TABLE IF NOT EXISTS {$prefix}comments (
						comment_ID INTEGER PRIMARY KEY AUTOINCREMENT,
						comment_post_ID INTEGER NOT NULL DEFAULT 0,
						comment_author TEXT NOT NULL DEFAULT '',
						comment_author_email TEXT NOT NULL DEFAULT '',
						comment_author_url TEXT NOT NULL DEFAULT '',
						comment_author_IP TEXT NOT NULL DEFAULT '',
						comment_date TEXT NOT NULL DEFAULT '0000-00-00 00:00:00',
						comment_date_gmt TEXT NOT NULL DEFAULT '0000-00-00 00:00:00',
						comment_content TEXT NOT NULL DEFAULT '',
						comment_karma INTEGER NOT NULL DEFAULT 0,
						comment_approved TEXT NOT NULL DEFAULT '1',
						comment_agent TEXT NOT NULL DEFAULT '',
						comment_type TEXT NOT NULL DEFAULT '',
						comment_parent INTEGER NOT NULL DEFAULT 0,
						user_id INTEGER NOT NULL DEFAULT 0
					)",
					'options' => "CREATE TABLE IF NOT EXISTS {$prefix}options (
						option_id INTEGER PRIMARY KEY AUTOINCREMENT,
						blog_id INTEGER NOT NULL DEFAULT 0,
						option_name TEXT NOT NULL DEFAULT '',
						option_can_override TEXT NOT NULL DEFAULT 'Y',
						option_type INTEGER NOT NULL DEFAULT 1,
						option_value TEXT NOT NULL DEFAULT '',
						option_width INTEGER NOT NULL DEFAULT 20,
						option_height INTEGER NOT NULL DEFAULT 8,
						option_description TEXT NOT NULL DEFAULT '',
						option_admin_level INTEGER NOT NULL DEFAULT 1,
						autoload TEXT NOT NULL DEFAULT 'yes'
					)",
					'postmeta' => "CREATE TABLE IF NOT EXISTS {$prefix}postmeta (
						meta_id INTEGER PRIMARY KEY AUTOINCREMENT,
						post_id INTEGER NOT NULL DEFAULT 0,
						meta_key TEXT NOT NULL DEFAULT '',
						meta_value TEXT NOT NULL DEFAULT ''
					)",
					'links' => "CREATE TABLE IF NOT EXISTS {$prefix}links (
						link_id INTEGER PRIMARY KEY AUTOINCREMENT,
						link_url TEXT NOT NULL DEFAULT '',
						link_name TEXT NOT NULL DEFAULT '',
						link_image TEXT NOT NULL DEFAULT '',
						link_target TEXT NOT NULL DEFAULT '',
						link_category INTEGER NOT NULL DEFAULT 0,
						link_description TEXT NOT NULL DEFAULT '',
						link_visible TEXT NOT NULL DEFAULT 'Y',
						link_owner INTEGER NOT NULL DEFAULT 1,
						link_rating INTEGER NOT NULL DEFAULT 0,
						link_updated TEXT NOT NULL DEFAULT '0000-00-00 00:00:00',
						link_rel TEXT NOT NULL DEFAULT '',
						link_notes TEXT NOT NULL DEFAULT '',
						link_rss TEXT NOT NULL DEFAULT ''
					)",
					'linkcategories' => "CREATE TABLE IF NOT EXISTS {$prefix}linkcategories (
						cat_id INTEGER PRIMARY KEY AUTOINCREMENT,
						cat_name TEXT NOT NULL DEFAULT '',
						auto_toggle TEXT NOT NULL DEFAULT 'N',
						show_images TEXT NOT NULL DEFAULT 'Y',
						show_description TEXT NOT NULL DEFAULT 'N',
						show_rating TEXT NOT NULL DEFAULT 'Y',
						show_updated TEXT NOT NULL DEFAULT 'Y',
						sort_order TEXT NOT NULL DEFAULT 'name',
						sort_desc TEXT NOT NULL DEFAULT 'ASC',
						text_before_link TEXT NOT NULL DEFAULT '<li>',
						text_after_link TEXT NOT NULL DEFAULT '<br />',
						text_after_all TEXT NOT NULL DEFAULT '</li>',
						list_limit INTEGER NOT NULL DEFAULT -1
					)",
					'optiongroups' => "CREATE TABLE IF NOT EXISTS {$prefix}optiongroups (
						group_id INTEGER PRIMARY KEY AUTOINCREMENT,
						group_name TEXT NOT NULL DEFAULT '',
						group_desc TEXT DEFAULT '',
						group_longdesc TEXT DEFAULT ''
					)",
					'optiongroup_options' => "CREATE TABLE IF NOT EXISTS {$prefix}optiongroup_options (
						group_id INTEGER NOT NULL DEFAULT 0,
						option_id INTEGER NOT NULL DEFAULT 0,
						seq INTEGER NOT NULL DEFAULT 0,
						PRIMARY KEY (group_id, option_id)
					)"
				);
				foreach ($tables_sql as $t => $sql) {
					try { $pdo->exec($sql); } catch (Exception $e) {}
				}
				// Backfill columns that WP 1.0-1.2 installs leave off but later code paths read.
				$alter_cols = array(
					'categories' => array(
						'category_nicename' => "TEXT NOT NULL DEFAULT ''",
						'category_description' => "TEXT NOT NULL DEFAULT ''",
						'category_parent' => "INTEGER NOT NULL DEFAULT 0",
						'category_count' => "INTEGER NOT NULL DEFAULT 0",
					),
					// WP 1.5+ get_comments_number() reads comment_count off wp_posts.
					'posts' => array(
						'comment_count' => "INTEGER NOT NULL DEFAULT 0",
					),
				);
				foreach ($alter_cols as $t => $cols_to_add) {
					try {
						$existing = $pdo->query("PRAGMA table_info({$prefix}{$t})")->fetchAll(PDO::FETCH_COLUMN, 1);
						foreach ($cols_to_add as $col => $type) {
							if (!in_array($col, $existing)) {
								$pdo->exec("ALTER TABLE {$prefix}{$t} ADD COLUMN {$col} {$type}");
							}
						}
					} catch (Exception $e) {}
				}
				// Dynamic column detection because the schema differs across WP 1.x.
				try {
					if (!$pdo->query("SELECT COUNT(*) FROM {$prefix}posts")->fetchColumn()) {
						$post_cols = $pdo->query("PRAGMA table_info({$prefix}posts)")->fetchAll(PDO::FETCH_COLUMN, 1);
						$post_vals = array(
							'ID' => '1', 'post_author' => '1',
							'post_date' => "'{$now}'", 'post_date_gmt' => "'{$now_gmt}'",
							'post_content' => "'Welcome to WordPress. This is your first post. Edit or delete it, then start blogging!'",
							'post_title' => "'Hello world!'", 'post_excerpt' => "''",
							'post_status' => "'publish'", 'comment_status' => "'open'",
							'ping_status' => "'open'", 'post_password' => "''",
							'post_name' => "'hello-world'", 'to_ping' => "''", 'pinged' => "''",
							'post_modified' => "'{$now}'", 'post_modified_gmt' => "'{$now_gmt}'",
							'post_content_filtered' => "''",
						);
						$ins_c = array(); $ins_v = array();
						foreach ($post_vals as $c => $v) {
							if (in_array($c, $post_cols)) { $ins_c[] = $c; $ins_v[] = $v; }
						}
						if ($ins_c) $pdo->exec("INSERT INTO {$prefix}posts (" . implode(',', $ins_c) . ") VALUES (" . implode(',', $ins_v) . ")");
					}
				} catch (Exception $e) {}
				try {
					if (!$pdo->query("SELECT COUNT(*) FROM {$prefix}categories")->fetchColumn()) {
						$pdo->exec("INSERT INTO {$prefix}categories (cat_ID, cat_name, category_nicename, category_description, category_parent) VALUES (1, 'Uncategorized', 'uncategorized', '', 0)");
					}
				} catch (Exception $e) {}
				try {
					$env_site = getenv('PLAYGROUND_SITE_URL');
					$site = $env_site ? $env_site : 'http://localhost';
					if (!$pdo->query("SELECT COUNT(*) FROM {$prefix}options WHERE option_name='siteurl'")->fetchColumn()) {
						$pdo->exec("INSERT INTO {$prefix}options (option_name, option_value) VALUES ('siteurl', '{$site}')");
						$pdo->exec("INSERT INTO {$prefix}options (option_name, option_value) VALUES ('blogname', 'My WordPress Website')");
						$pdo->exec("INSERT INTO {$prefix}options (option_name, option_value) VALUES ('blogdescription', 'Just another WordPress weblog')");
						$pdo->exec("INSERT INTO {$prefix}options (option_name, option_value) VALUES ('home', '{$site}')");
					}
					// Overwrite the placeholder 'http://localhost' with the scoped URL.
					if ($env_site) {
						$pdo->exec("UPDATE {$prefix}options SET option_value = '{$env_site}' WHERE option_name = 'siteurl'");
						$pdo->exec("UPDATE {$prefix}options SET option_value = '{$env_site}' WHERE option_name = 'home'");
					}
					// populate_options() sets template/stylesheet; backfill if it crashed.
					if (!$pdo->query("SELECT COUNT(*) FROM {$prefix}options WHERE option_name='template'")->fetchColumn()) {
						$themes_dir = getenv('DOCUMENT_ROOT') . '/wp-content/themes/';
						$tpl = 'default';
						if (is_dir($themes_dir)) {
							$entries = glob($themes_dir . '*', GLOB_ONLYDIR);
							if ($entries) {
								foreach ($entries as $e) {
									$name = basename($e);
									if ($name === '.' || $name === '..') continue;
									if (file_exists($e . '/style.css')) {
										$tpl = $name;
										break;
									}
								}
							}
						}
						$pdo->exec("INSERT INTO {$prefix}options (option_name, option_value, autoload) VALUES ('template', '{$tpl}', 'yes')");
						$pdo->exec("INSERT INTO {$prefix}options (option_name, option_value, autoload) VALUES ('stylesheet', '{$tpl}', 'yes')");
					}
					// Without a correct db_version, WP 2.0-2.5 admin redirects to upgrade.php.
					$version_path = getenv('DOCUMENT_ROOT') . '/wp-includes/version.php';
					if (file_exists($version_path)) {
						$wp_db_version = 0;
						include $version_path;
						if ($wp_db_version > 0) {
							$has_dbv = $pdo->query("SELECT COUNT(*) FROM {$prefix}options WHERE option_name='db_version'")->fetchColumn();
							if (!$has_dbv) {
								$pdo->exec("INSERT INTO {$prefix}options (option_name, option_value, autoload) VALUES ('db_version', '{$wp_db_version}', 'yes')");
							} else {
								$pdo->exec("UPDATE {$prefix}options SET option_value = '{$wp_db_version}' WHERE option_name = 'db_version'");
							}
						}
					}
				} catch (Exception $e) {}
			`,env:{DOCUMENT_ROOT:n.documentRoot,PLAYGROUND_SITE_URL:t||""}})}catch(a){logger.warn("Legacy WP PDO fallback failed (non-fatal):",a)}}const MYSQL_SHIMS_PHP=`
// Connection stubs — wpdb::__construct bails on a falsy return.
if (!function_exists('mysqli_connect')) {
	function mysqli_connect() { return true; }
}
if (!function_exists('mysqli_init')) {
	function mysqli_init() { return true; }
}
if (!function_exists('mysql_connect')) {
	function mysql_connect() { return true; }
}
if (!function_exists('mysql_select_db')) {
	function mysql_select_db() { return true; }
}
// WordPress < 3.0 wpdb::__construct calls mysql_set_charset directly.
if (!function_exists('mysql_set_charset')) {
	function mysql_set_charset() { return true; }
}
if (!defined('MYSQL_ASSOC')) define('MYSQL_ASSOC', 1);
if (!defined('MYSQL_NUM')) define('MYSQL_NUM', 2);
if (!defined('MYSQL_BOTH')) define('MYSQL_BOTH', 3);
// Functional mysql_* stubs that delegate to $wpdb (SQLite driver).
$GLOBALS['_mysql_results'] = array();
$GLOBALS['_mysql_result_id'] = 0;
if (!function_exists('mysql_query')) {
	function mysql_query($query, $link = null) {
		global $wpdb;
		if (isset($wpdb) && method_exists($wpdb, 'query')) {
			$wpdb->query($query);
			if (preg_match('/^\\s*(SELECT|SHOW|DESCRIBE|EXPLAIN)/i', $query)) {
				$rows = isset($wpdb->last_result) ? $wpdb->last_result : array();
				$id = ++$GLOBALS['_mysql_result_id'];
				$GLOBALS['_mysql_results'][$id] = array(
					'rows' => $rows,
					'index' => 0,
				);
				return $id;
			}
			return true;
		}
		return false;
	}
}
if (!function_exists('mysql_error')) {
	function mysql_error($link = null) {
		global $wpdb;
		if (isset($wpdb) && isset($wpdb->last_error)) {
			return $wpdb->last_error;
		}
		return '';
	}
}
if (!function_exists('mysql_list_tables')) {
	function mysql_list_tables($db = '', $link = null) {
		global $wpdb;
		if (isset($wpdb) && method_exists($wpdb, 'get_results')) {
			$tables = $wpdb->get_results(
				"SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
			);
			$rows = array();
			if ($tables) {
				foreach ($tables as $t) {
					$obj = new stdClass();
					$obj->name = is_object($t) ? $t->name : $t['name'];
					$rows[] = $obj;
				}
			}
			$id = ++$GLOBALS['_mysql_result_id'];
			$GLOBALS['_mysql_results'][$id] = array(
				'rows' => $rows,
				'index' => 0,
			);
			return $id;
		}
		return false;
	}
}
if (!function_exists('mysql_fetch_row')) {
	function mysql_fetch_row($result) {
		if (!isset($GLOBALS['_mysql_results'][$result])) return null;
		$r = &$GLOBALS['_mysql_results'][$result];
		if ($r['index'] >= count($r['rows'])) return null;
		$row = $r['rows'][$r['index']++];
		return array_values((array)$row);
	}
}
if (!function_exists('mysql_fetch_assoc')) {
	function mysql_fetch_assoc($result) {
		if (!isset($GLOBALS['_mysql_results'][$result])) return null;
		$r = &$GLOBALS['_mysql_results'][$result];
		if ($r['index'] >= count($r['rows'])) return null;
		return (array)$r['rows'][$r['index']++];
	}
}
if (!function_exists('mysql_fetch_array')) {
	function mysql_fetch_array($result, $result_type = null) {
		$row = mysql_fetch_assoc($result);
		if ($row === null) return null;
		if ($result_type === MYSQL_ASSOC) return $row;
		if ($result_type === MYSQL_NUM) return array_values($row);
		return array_merge(array_values($row), $row);
	}
}
if (!function_exists('mysql_fetch_object')) {
	function mysql_fetch_object($result) {
		if (!isset($GLOBALS['_mysql_results'][$result])) return null;
		$r = &$GLOBALS['_mysql_results'][$result];
		if ($r['index'] >= count($r['rows'])) return null;
		return (object)(array)$r['rows'][$r['index']++];
	}
}
if (!function_exists('mysql_num_rows')) {
	function mysql_num_rows($result) {
		if (isset($GLOBALS['_mysql_results'][$result])) {
			return count($GLOBALS['_mysql_results'][$result]['rows']);
		}
		return 0;
	}
}
if (!function_exists('mysql_get_server_info')) {
	function mysql_get_server_info() { return '8.0.0'; }
}
if (!function_exists('mysql_affected_rows')) {
	function mysql_affected_rows() {
		global $wpdb;
		if (isset($wpdb) && isset($wpdb->rows_affected)) {
			return $wpdb->rows_affected;
		}
		return 0;
	}
}
if (!function_exists('mysql_insert_id')) {
	function mysql_insert_id() {
		global $wpdb;
		if (isset($wpdb) && isset($wpdb->insert_id)) {
			return $wpdb->insert_id;
		}
		return 0;
	}
}
if (!function_exists('mysql_free_result')) {
	function mysql_free_result($result) {
		unset($GLOBALS['_mysql_results'][$result]);
		return true;
	}
}
if (!function_exists('mysql_num_fields')) {
	function mysql_num_fields($result) {
		if (isset($GLOBALS['_mysql_results'][$result])
			&& !empty($GLOBALS['_mysql_results'][$result]['rows'])) {
			return count((array)$GLOBALS['_mysql_results'][$result]['rows'][0]);
		}
		return 0;
	}
}
if (!function_exists('mysql_real_escape_string')) {
	function mysql_real_escape_string($s) { return addslashes($s); }
}
if (!function_exists('mysql_escape_string')) {
	function mysql_escape_string($s) { return addslashes($s); }
}`;async function preloadLegacySqliteIntegration(n,t,r={}){await n.isDir("/tmp/sqlite-database-integration")&&await n.rmdir("/tmp/sqlite-database-integration",{recursive:!0}),await n.mkdir("/tmp/sqlite-database-integration"),await unzipFile(n,t,"/tmp/sqlite-database-integration");const s="/internal/shared/sqlite-database-integration",i=`/tmp/sqlite-database-integration/${(await n.listFiles("/tmp/sqlite-database-integration"))[0]}`;await n.mv(i,s),await relaxSqliteDriverSqlModes(n,s),await n.defineConstant("SQLITE_MAIN_FILE","1");let o=(await n.readFileAsText(joinPaths(s,"db.copy"))).replace("'{SQLITE_IMPLEMENTATION_FOLDER_PATH}'",phpVar(s)).replace("'{SQLITE_PLUGIN}'",phpVar(joinPaths(s,"load.php")));o=o.replace(/^add_action\(/gm,'function_exists("add_action") && add_action(');const l=joinPaths(await n.documentRoot,"wp-content/db.php"),u="/internal/shared/mu-plugins/sqlite-database-integration.php",c=`
if(file_exists(${phpVar(l)})) {
	$_pg_db_php = @file_get_contents(${phpVar(l)});
	if (strpos($_pg_db_php, ${phpVar(PLAYGROUND_MANAGED_DB_PHP_MARKER)}) === false) {
		return;
	}
	unset($_pg_db_php);
}
`;await n.writeFile(u,`<?php
${c}?>`+o),await n.writeFile("/internal/shared/preload/0-sqlite.php",buildLegacySqlitePreload(c,u)),await n.writeFile("/internal/shared/mu-plugins/sqlite-test.php",`<?php
		global $wpdb;
		if(!($wpdb instanceof WP_SQLite_DB)) {
			var_dump(isset($wpdb));
			die("SQLite integration not loaded " . get_class($wpdb));
		}
		`)}async function relaxSqliteDriverSqlModes(n,t){const r=joinPaths(t,"wp-includes/database/sqlite/class-wp-pdo-mysql-on-sqlite.php");if(!await n.fileExists(r))return;const s=await n.readFileAsText(r),i=s.replace(/\$active_sql_modes\s*=\s*array\s*\([^)]*\)\s*;/,"$active_sql_modes = array();");i!==s&&await n.writeFile(r,i)}function buildLegacySqlitePreload(n,t){return`<?php
${n}?>
<?php
// Shim __() etc. only for WP < 1.2 (no l10n layer; the SQLite
// plugin calls __() from print_error()). WP 1.2–1.4 ship
// wp-l10n.php and WP 1.5+ ships l10n.php — defining the shims
// then would fatal on redeclare.
$_pg_doc_root = isset($_SERVER['DOCUMENT_ROOT'])
	? $_SERVER['DOCUMENT_ROOT'] : '/wordpress';
if (
	!file_exists($_pg_doc_root . '/wp-includes/l10n.php')
	&& !file_exists($_pg_doc_root . '/wp-includes/wp-l10n.php')
) {
	if (!function_exists('__')) {
		function __($text, $domain = null) { return $text; }
	}
	if (!function_exists('_e')) {
		function _e($text, $domain = null) { echo $text; }
	}
	if (!function_exists('esc_html__')) {
		function esc_html__($text, $domain = null) {
			return htmlspecialchars($text, ENT_QUOTES);
		}
	}
	if (!function_exists('esc_html_e')) {
		function esc_html_e($text, $domain = null) {
			echo htmlspecialchars($text, ENT_QUOTES);
		}
	}
}
?>
<?php
${SQLITE_PRELOAD_LOADER_CLASS(`require_once ${phpVar(t)};
        if (
            isset($GLOBALS['wpdb']) &&
            method_exists($GLOBALS['wpdb'], 'reinitialize_sqlite')
        ) {
            $GLOBALS['wpdb']->reinitialize_sqlite();
        }`)}
${MYSQL_SHIMS_PHP}
if (PHP_MAJOR_VERSION < 7) {
	// E_DEPRECATED (8192) / E_STRICT (2048) are PHP 5.3+ symbols;
	// LEGACY_WP_ERROR_REPORTING_PHP_EXPR uses numeric literals.
	$level = ${LEGACY_WP_ERROR_REPORTING_PHP_EXPR};
	error_reporting($level);
	ini_set('error_reporting', $level);
}

		`}const BLOCK=512,TAR_ROOT="/__tar-root__",ZSTD_MAGIC=[40,181,47,253],textDecoder=new TextDecoder;function isZstdBundle(n){return ZSTD_MAGIC.every((t,r)=>n[r]===t)}function sanitizeTarPath(n){const t=String(n);if(t.includes("\\"))throw new Error(`Unsafe tar entry (backslash path): ${n}`);if(t.startsWith("/"))throw new Error(`Unsafe tar entry (absolute path): ${n}`);const r=normalizePath$1(t);if(!r)return"";const s=resolvePathUnder(r,TAR_ROOT);if(!s)throw new Error(`Unsafe tar entry (path traversal): ${n}`);return s.slice(TAR_ROOT.length+1)}function readOctal(n,t,r){const s=n.subarray(t,t+r);let i="";for(const a of s){if(a===0||a===32){if(i)break;continue}i+=String.fromCharCode(a)}return i?Number.parseInt(i,8):0}function readCString(n,t,r){let s=t;const i=t+r;for(;s<i&&n[s]!==0;)s+=1;return textDecoder.decode(n.subarray(t,s))}function isZeroBlock(n){for(let t=0;t<n.length;t+=1)if(n[t]!==0)return!1;return!0}function validateHeaderChecksum(n,t){const r=readOctal(n,148,8);let s=0;for(let i=0;i<BLOCK;i+=1)s+=i>=148&&i<156?32:n[i];if(r!==s)throw new Error(`Malformed tar stream: invalid header checksum for ${t||"unknown"}`)}class StreamingTarParser{constructor({onEntry:t}={}){this.leftover=new Uint8Array(0),this.state="header",this.entry=null,this.dataChunks=[],this.dataFilled=0,this.padRemaining=0,this.pendingLongName=null,this.pendingPax=null,this.zeroBlocks=0,this.maxBuffered=0,this.fileCount=0,this.dirCount=0,this.phpCount=0,this.bytesWritten=0,this.onEntry=t??(()=>{})}push(t){if(t?.length)if(this.leftover.length===0)this.leftover=t;else{const r=new Uint8Array(this.leftover.length+t.length);r.set(this.leftover,0),r.set(t,this.leftover.length),this.leftover=r}this.track(),this.drain()}end(){if(this.state==="data"&&this.dataFilled<(this.entry?.size??0))throw new Error(`Truncated tar stream: entry ${this.entry?.name} expected ${this.entry?.size} bytes, got ${this.dataFilled}`);if(this.state==="pad"&&this.padRemaining>0)throw new Error(`Truncated tar stream: entry ${this.entry?.name??"unknown"} missing ${this.padRemaining} padding bytes`);if(this.state==="header"&&this.leftover.length>0)throw new Error(`Truncated tar stream: incomplete header (${this.leftover.length} bytes)`);if(this.pendingLongName!==null)throw new Error("Malformed tar stream: GNU longlink entry was not followed by a file entry");if(this.pendingPax!==null)throw new Error("Malformed tar stream: PAX header was not followed by a file entry");if(this.zeroBlocks<2)throw new Error("Truncated tar stream: missing end-of-archive marker");return this.stats()}stats(){return{fileCount:this.fileCount,dirCount:this.dirCount,phpCount:this.phpCount,bytesWritten:this.bytesWritten,maxBuffered:this.maxBuffered}}track(t=0){const r=this.leftover.length+this.dataFilled+t;r>this.maxBuffered&&(this.maxBuffered=r)}drain(){let t=!0;for(;t;){if(t=!1,this.state==="header"){if(this.leftover.length<BLOCK)break;const r=this.leftover.subarray(0,BLOCK);if(this.leftover=this.leftover.subarray(BLOCK),isZeroBlock(r)){this.zeroBlocks+=1,this.zeroBlocks>=2&&(this.state="done"),t=!0;continue}this.zeroBlocks=0;const s=readOctal(r,124,12),i=String.fromCharCode(r[156])||"0",a=readCString(r,0,100),o=readCString(r,345,155);if(validateHeaderChecksum(r,a),!Number.isFinite(s)||s<0)throw new Error(`Malformed tar stream: invalid size for ${a}`);this.entry={name:a,prefix:o,size:s,typeflag:i,isLongLink:i==="L",isPaxHeader:i==="x"},this.dataChunks=[],this.dataFilled=0,s>0?this.state="data":this.finishEntry(),t=!0;continue}if(this.state==="data"){const r=this.entry.size-this.dataFilled;if(r<=0){this.finishEntry();continue}if(this.leftover.length===0)break;const s=Math.min(r,this.leftover.length);this.dataChunks.push(this.leftover.subarray(0,s)),this.dataFilled+=s,this.leftover=this.leftover.subarray(s),this.track(),this.dataFilled===this.entry.size&&this.finishEntry(),t=!0;continue}if(this.state==="pad"){if(this.padRemaining===0){this.state="header",t=!0;continue}if(this.leftover.length===0)break;const r=Math.min(this.padRemaining,this.leftover.length);this.leftover=this.leftover.subarray(r),this.padRemaining-=r,t=!0;continue}if(this.state==="done"){if(this.leftover.length===0)break;if(!isZeroBlock(this.leftover))throw new Error("Malformed tar stream: non-zero data after end-of-archive marker");this.leftover=new Uint8Array(0),t=!0}}}concatData(){const t=new Uint8Array(this.dataFilled);let r=0;for(const s of this.dataChunks)t.set(s,r),r+=s.length;return t}finishEntry(){const t=this.entry,r=this.concatData();this.dataChunks=[];const s=t.size%BLOCK;if(this.padRemaining=s===0?0:BLOCK-s,this.state=this.padRemaining>0?"pad":"header",this.dataFilled=0,this.entry=null,t.isLongLink){this.pendingLongName=textDecoder.decode(r).replace(/\0.*$/,"");return}if(t.isPaxHeader){this.pendingPax=parsePaxRecords(r);return}const i=this.pendingPax?.path??this.pendingLongName??(t.prefix?`${t.prefix}/${t.name}`:t.name);this.pendingLongName=null,this.pendingPax=null;const a=t.typeflag==="5"||i.endsWith("/"),o=sanitizeTarPath(i);if(o){if(a){this.dirCount+=1,this.onEntry({type:"dir",path:o});return}if(t.typeflag!=="0"&&t.typeflag!=="\0")throw new Error(`Unsupported tar entry type "${t.typeflag}" for ${i}`);this.fileCount+=1,this.bytesWritten+=r.length,o.endsWith(".php")&&(this.phpCount+=1),this.onEntry({type:"file",path:o,data:r})}}}async function createDecodedTarStream(n,t){const r=toReadableStream(n);if(typeof DecompressionStream<"u")try{const s=new DecompressionStream(t);return r.pipeThrough(s)}catch{}{const{ZSTDDecoder:s}=await import("./assets/zstddec-stream.modern-DR1JNyqv.js"),i=new s;await i.init();const a=await toChunkIterable(n),o=i.decodeStreaming(a);let l=!1;return new ReadableStream({pull(u){if(l){u.close();return}try{for(;;){const{value:c,done:d}=o.next();if(d){l=!0,u.close();return}if(c.length!==0){u.enqueue(c);return}}}catch(c){l=!0,u.error(c)}},cancel(){l=!0,o.return?.(void 0)}})}}async function extractTarStreamToPhp(n,t,r,s={}){const{onProgress:i=()=>{},overwriteFiles:a=!0}=s,o=String(r).replace(/\/+$/,"")||"/",l=new Set,u=p=>{if(!p||l.has(p))return;t.mkdirTree(p);let f=p;for(;f&&!l.has(f);){l.add(f);const g=dirname(f);f=g&&g!==f?g:null}},c=new StreamingTarParser({onEntry:p=>{const f=joinPaths(o,p.path);if(p.type==="dir"){u(f);return}u(dirname(f)),!(!a&&t.fileExists?.(f))&&(t.writeFile(f,p.data),c.fileCount%1e3===0&&i({fileCount:c.fileCount,bytes:c.bytesWritten}))}});u(o);const d=n.getReader();for(;;){const{done:p,value:f}=await d.read();if(p)break;f&&c.push(f)}return c.end()}function toReadableStream(n){return isReadableStream(n)?n:new Blob([n]).stream()}async function toChunkIterable(n){if(!isReadableStream(n))return[n];const t=n.getReader(),r=[];try{for(;;){const{done:s,value:i}=await t.read();if(s)break;r.push(i)}return r}catch(s){throw await t.cancel(s).catch(()=>{}),s}finally{t.releaseLock()}}function isReadableStream(n){return typeof ReadableStream<"u"&&n instanceof ReadableStream}function parsePaxRecords(n){const t=textDecoder.decode(n),r={};let s=0;for(;s<t.length;){const i=t.indexOf(" ",s);if(i===-1)throw new Error("Malformed tar stream: invalid PAX record length");const a=Number.parseInt(t.slice(s,i),10);if(!Number.isFinite(a)||a<=0)throw new Error("Malformed tar stream: invalid PAX record length");const o=s+a;if(o>t.length||t[o-1]!==`
`)throw new Error("Malformed tar stream: truncated PAX record");const l=t.slice(i+1,o-1),u=l.indexOf("=");if(u===-1)throw new Error("Malformed tar stream: invalid PAX record");r[l.slice(0,u)]=l.slice(u+1),s=o}return r}var wpConfigTransformer=`<?php

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
`;async function ensureWpConfig(n,t){const r=joinPaths(t,"wp-config.php");!n.fileExists(r)&&n.fileExists(joinPaths(t,"wp-config-sample.php"))&&await n.writeFile(r,await n.readFileAsBuffer(joinPaths(t,"wp-config-sample.php"))),n.fileExists(r)&&await defineWpConfigConstantFallbacks(n,r,{DB_NAME:"wordpress"})}async function defineWpConfigConstants(n,t,r){const s=phpVars({wpConfigPath:t,constants:r});if((await n.run({code:`${wpConfigTransformer}
		$wp_config_path = ${s.wpConfigPath};
		$transformer = WP_Config_Transformer::from_file($wp_config_path);
		$transformer->define_constants(${s.constants});
		$transformer->to_file($wp_config_path);
		`})).errors.length>0)throw new Error("Failed to rewrite constants in wp-config.php.")}async function defineWpConfigConstantFallbacks(n,t,r){const s=Object.keys(r),i=phpVars({wpConfigPath:t,constantNames:s}),a=await n.run({code:`${wpConfigTransformer}
		$transformer = WP_Config_Transformer::from_file(${i.wpConfigPath});
		$missing = [];
		foreach (${i.constantNames} as $name) {
			if (!$transformer->constant_exists($name)) {
				$missing[] = $name;
			}
		}
		echo json_encode($missing);
		`});if(a.errors.length>0)throw new Error("Failed to check wp-config.php for constants.");let o;try{o=JSON.parse(a.text)}catch{throw new Error(`Failed to parse wp-config.php constant check output: ${a.text}`)}for(const l of o)await n.defineConstant(l,r[l])}async function assertDatabasePrerequisites(n,{usesSqlite:t,hasCustomDatabasePath:r}){const s=await n.getPrimaryPhp();if(s.isFile("/internal/shared/preload/0-sqlite.php"))return;const i=joinPaths(n.documentRoot,"wp-content/mu-plugins/sqlite-database-integration");if(!s.isDir(i)&&!t&&!r&&!hasValidMySQLCredentials(s))throw new Error("Error connecting to the MySQL database.")}function hasValidMySQLCredentials(n){const t=joinPaths(n.documentRoot,"wp-config.php");if(!n.isFile(t))return!1;const r=n.readFileAsText(t),s=r.match(/define\s*\(\s*['"]DB_NAME['"]\s*,\s*['"]([^'"]*)['"]/),i=r.match(/define\s*\(\s*['"]DB_USER['"]\s*,\s*['"]([^'"]*)['"]/);return!s||!i?!1:s[1]!=="database_name_here"&&i[1]!=="username_here"}const LEGACY_PHP_DISABLED_NETWORK_FUNCTIONS=["fsockopen","pfsockopen","curl_init","curl_exec","curl_multi_exec","mail"];async function applyLegacyPhpIniOverrides(n,t){if(!isLegacyPHPVersion(t.phpVersion))return;const r=(t.phpIniEntries?.disable_functions??"").split(",").map(a=>a.trim()).filter(a=>a),i={disable_functions:Array.from(new Set([...r,...LEGACY_PHP_DISABLED_NETWORK_FUNCTIONS])).join(","),allow_url_fopen:"0"};t.phpIniEntries?.["date.timezone"]||(i["date.timezone"]="UTC"),await setPhpIniEntries(n,i)}async function bootLegacyWordPress(n,t){const r=await n.getPrimaryPhp();if(t.hooks?.beforeWordPressFiles&&await t.hooks.beforeWordPressFiles(r),t.wordPressZip&&await unzipWordPress(r,await t.wordPressZip,{expectedFileCount:t.wordPressBundleFileCount}),t.constants)for(const o in t.constants)r.defineConstant(o,t.constants[o]);r.defineConstant("WP_HOME",t.siteUrl),r.defineConstant("WP_SITEURL",t.siteUrl),await copyWpConfigFromSample(r,n.documentRoot),await patchWordPressSourceFiles(r,n.documentRoot),t.hooks?.beforeDatabaseSetup&&await t.hooks.beforeDatabaseSetup(r);let s=!1;t.sqliteIntegrationPluginZip&&(s=!0,await preloadSqliteIntegration(r,await t.sqliteIntegrationPluginZip,{phpVersion:t.phpVersion}),await writeLegacyDbPhp(r,n.documentRoot));const i=t.wordpressInstallMode??"download-and-install",a=!!t.dataSqlPath;return(i==="download-and-install"||i==="install-from-existing-files"||i==="install-from-existing-files-if-needed")&&(await assertDatabasePrerequisites(n,{usesSqlite:s,hasCustomDatabasePath:a}),await installLegacyWordPress(r,n)),n}async function copyWpConfigFromSample(n,t){const r=joinPaths(t,"wp-config.php"),s=joinPaths(t,"wp-config-sample.php");!n.fileExists(r)&&n.fileExists(s)&&await n.writeFile(r,await n.readFileAsBuffer(s))}async function writeLegacyDbPhp(n,t){const r=joinPaths(t,"wp-content"),s=joinPaths(r,"db.php");n.isDir(r)&&!n.fileExists(s)&&await n.writeFile(s,generateDbPhpContent())}async function installLegacyWordPress(n,t){try{await runLegacyInstaller(n)}catch(r){logger.warn("Legacy PHP WordPress installation error:",r)}await runPostInstallLegacyFixups(n,t.absoluteUrl)}async function runLegacyInstaller(n){const t=readOnDiskWpVersion(n,n.documentRoot);if(t!==null){const a=parseFloat(t);if(a<2.1)return;if(a<=3){await runDbDeltaOnly(n);return}}const r={disable_functions:LEGACY_PHP_DISABLED_NETWORK_FUNCTIONS.join(","),allow_url_fopen:"0",error_reporting:String(LEGACY_WP_ERROR_REPORTING_VALUE)},s=await withPHPIniValues(n,r,async()=>await n.request({url:"/wp-admin/install.php?step=2",method:"POST",body:{language:"en",prefix:"wp_",weblog_title:"My WordPress Website",user_name:"admin",admin_password:"password",admin_password2:"password",Submit:"Install WordPress",pw_weak:"1",admin_email:"admin@localhost.com"}}));if(!(s.text?.includes("Success")||s.text?.includes("successful")||s.text?.includes("Finished")||s.text?.includes("Already Installed")||s.text?.includes("already have WordPress installed")||!1))throw new Error(`Failed to install WordPress – installer responded with "${s.text?.substring(0,100)}"`);await setLegacyPermalinkStructureViaPdo(n)}async function setLegacyPermalinkStructureViaPdo(n){try{(await n.run({code:`<?php
				$db_dir = getenv('DOCUMENT_ROOT') . '/wp-content/database/';
				$db_path = $db_dir . '.ht.sqlite';
				if (!file_exists($db_path)) { echo '0'; exit; }
				$pdo = new PDO('sqlite:' . $db_path);
				$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
				$nice_permalinks = '/%year%/%monthnum%/%day%/%postname%/';
				$stmt = $pdo->prepare(
					"UPDATE wp_options SET option_value = :val WHERE option_name = 'permalink_structure'"
				);
				$stmt->execute(array(':val' => $nice_permalinks));
				if ($stmt->rowCount() === 0) {
					$stmt = $pdo->prepare(
						"INSERT INTO wp_options (option_name, option_value, autoload) VALUES ('permalink_structure', :val, 'yes')"
					);
					$stmt->execute(array(':val' => $nice_permalinks));
				}
				$check = $pdo->query(
					"SELECT option_value FROM wp_options WHERE option_name = 'permalink_structure'"
				)->fetchColumn();
				echo $check === $nice_permalinks ? '1' : '0';
			`,env:{DOCUMENT_ROOT:n.documentRoot}})).text!=="1"&&logger.warn("Failed to default to pretty permalinks after WP install.")}catch{logger.warn("Failed to set pretty permalinks after WP install (non-fatal).")}}async function runDbDeltaOnly(n){try{await n.run({code:`<?php
				define('WP_INSTALLING', true);
				error_reporting(${LEGACY_WP_ERROR_REPORTING_PHP_EXPR});
				ini_set('display_errors', '0');
				ob_start();
				require getenv('DOCUMENT_ROOT') . '/wp-load.php';
				ob_clean();
				if (file_exists(ABSPATH . 'wp-admin/includes/upgrade.php')) {
					require_once ABSPATH . 'wp-admin/includes/upgrade.php';
				} elseif (file_exists(ABSPATH . 'wp-admin/upgrade-functions.php')) {
					require_once ABSPATH . 'wp-admin/upgrade-functions.php';
				}
				if (function_exists('make_db_current_silent')) {
					make_db_current_silent();
				}
				// Seed essential options/roles when the loader exposes
				// them. The PDO fallback in runPostInstallLegacyFixups
				// backfills anything missing if either call dies.
				if (function_exists('populate_options')) populate_options();
				if (function_exists('populate_roles')) populate_roles();
				echo 'OK';
			`,env:{DOCUMENT_ROOT:n.documentRoot}})}catch(t){logger.warn("runDbDeltaOnly failed (non-fatal):",t)}}function readOnDiskWpVersion(n,t){const r=joinPaths(t,"wp-includes/version.php");if(!n.fileExists(r))return null;const i=n.readFileAsText(r).match(/\$wp_version\s*=\s*['"]([^'"]+)['"]/);return i?i[1]:null}async function bootWordPress(n,t){if(isLegacyPHPVersion(t.phpVersion))return bootLegacyWordPress(n,t);t.onProgress?.("Creating PHP runtime");const r=await n.getPrimaryPhp();if(t.hooks?.beforeWordPressFiles&&(t.onProgress?.("Mounting WordPress files"),await t.hooks.beforeWordPressFiles(r)),t.wordPressZip&&(t.onProgress?.("Extracting WordPress files"),await unzipWordPress(r,await t.wordPressZip,{expectedFileCount:t.wordPressBundleFileCount})),t.constants){t.onProgress?.("Defining WordPress constants");for(const o in t.constants)r.defineConstant(o,t.constants[o])}t.dataSqlPath&&(r.defineConstant("DB_PATH",t.dataSqlPath),r.defineConstant("DB_DIR",dirname(t.dataSqlPath)),r.defineConstant("DB_FILE",basename(t.dataSqlPath))),r.defineConstant("WP_HOME",t.siteUrl),r.defineConstant("WP_SITEURL",t.siteUrl),t.onProgress?.("Starting PHP"),await ensureWpConfig(r,n.documentRoot),t.hooks?.beforeDatabaseSetup&&(t.onProgress?.("Preparing database files"),await t.hooks.beforeDatabaseSetup(r));let s=!1;t.sqliteIntegrationPluginZip&&(s=!0,t.onProgress?.("Installing SQLite integration"),await preloadSqliteIntegration(r,await t.sqliteIntegrationPluginZip,{phpVersion:t.phpVersion}),await backportWpPreV62MysqlCheck(r,n.documentRoot));const i=t.wordpressInstallMode??"download-and-install",a=!!t.dataSqlPath;if(["download-and-install","install-from-existing-files"].includes(i)){t.onProgress?.("Checking database prerequisites"),await assertDatabasePrerequisites(n,{usesSqlite:s,hasCustomDatabasePath:a});try{t.onProgress?.("Running WordPress installer"),await installWordPress(r)}catch(o){throw a||await assertValidDatabaseConnection(n),o}a||(t.onProgress?.("Validating database connection"),await assertValidDatabaseConnection(n))}else if(i==="install-from-existing-files-if-needed"){if(t.onProgress?.("Checking database prerequisites"),await assertDatabasePrerequisites(n,{usesSqlite:s,hasCustomDatabasePath:a}),t.onProgress?.("Checking existing WordPress installation"),!await isWordPressInstalled(r))try{t.onProgress?.("Running WordPress installer"),await installWordPress(r)}catch(o){throw a||await assertValidDatabaseConnection(n),o}a||(t.onProgress?.("Validating database connection"),await assertValidDatabaseConnection(n))}return t.onProgress?.("WordPress boot complete"),n}async function assertValidDatabaseConnection(n){const t=await n.getPrimaryPhp();if(await isDatabaseConnectionValid(t))return;if(t.isFile("/internal/shared/preload/0-sqlite.php"))throw new Error("Error connecting to the SQLite database.");const s=joinPaths(n.documentRoot,"wp-content/mu-plugins/sqlite-database-integration");throw t.isDir(s)?new Error("Error connecting to the SQLite database."):new Error("Error connecting to the MySQL database.")}async function bootRequestHandler(n){defaultSqliteJournalMode(n);const t=n.spawnHandler??sandboxedSpawnHandlerFactory;async function r(i,a=!1){const o=await n.createPhpRuntime(a),l=new PHP(o);if(n.sapiName&&l.setSapiName(n.sapiName),i&&(l.requestHandler=i),n.phpIniEntries&&await setPhpIniEntries(l,n.phpIniEntries),await applyLegacyPhpIniOverrides(l,{phpVersion:n.phpVersion,phpIniEntries:n.phpIniEntries}),l.defineConstant("WP_SQLITE_AST_DRIVER",!0),n.constants)for(const u in n.constants)l.defineConstant(u,n.constants[u]);return a&&!l.isFile("/internal/.boot-files-written")&&(await setupPlatformLevelMuPlugins(l,{phpVersion:n.phpVersion}),await writeFiles$1(l,"/",n.createFiles||{}),await preloadPhpInfoRoute(l,joinPaths(new URL(n.siteUrl).pathname,"phpinfo.php")),await writeFiles$1(l,"/internal",{".boot-files-written":""})),t&&await l.setSpawnHandler(t(i?()=>i.instanceManager.acquirePHPInstance():void 0)),l.enableRuntimeRotation({recreateRuntime:n.createPhpRuntime,maxRequests:400}),n.onPHPInstanceCreated&&await n.onPHPInstanceCreated(l,{isPrimary:a}),l}const s=new PHPRequestHandler({documentRoot:n.documentRoot||"/wordpress",absoluteUrl:n.siteUrl,rewriteRules:wordPressRewriteRules,pathAliases:n.pathAliases,getFileNotFoundAction:n.getFileNotFoundAction??getFileNotFoundActionForWordPress,cookieStore:n.cookieStore,php:n.maxPhpInstances===1?await r(void 0,!0):void 0,phpFactory:n.maxPhpInstances!==1?async({isPrimary:i})=>r(s,i):void 0,maxPhpInstances:n.maxPhpInstances});return s}function defaultSqliteJournalMode(n){"SQLITE_JOURNAL_MODE"in(n.constants??{})||(n.constants={...n.constants,SQLITE_JOURNAL_MODE:"DELETE"})}async function isWordPressInstalled(n){return(await n.run({code:`<?php
			ob_start();
			$wp_load = getenv('DOCUMENT_ROOT') . '/wp-load.php';
			if (!file_exists($wp_load)) {
				echo '-1';
				exit;
			}
			require $wp_load;
			ob_clean();
			echo is_blog_installed() ? '1' : '0';
			ob_end_flush();
		`,env:{DOCUMENT_ROOT:n.documentRoot}})).text==="1"}async function installWordPress(n){const t=await withPHPIniValues(n,{disable_functions:"fsockopen",allow_url_fopen:"0"},async()=>await n.request({url:"/wp-admin/install.php?step=2",method:"POST",body:{language:"en",prefix:"wp_",weblog_title:"My WordPress Website",user_name:"admin",admin_password:"password",admin_password2:"password",Submit:"Install WordPress",pw_weak:"1",admin_email:"admin@localhost.com"}}));if(!await isWordPressInstalled(n))throw new Error(`Failed to install WordPress – installer responded with "${t.text?.substring(0,100)}"`);(await n.run({code:`<?php
			ob_start();
			$wp_load = getenv('DOCUMENT_ROOT') . '/wp-load.php';
			if (!file_exists($wp_load)) {
				echo '0';
				exit;
			}
			require $wp_load;
			$nice_permalinks = '/%year%/%monthnum%/%day%/%postname%/';
			$option_result = update_option(
				'permalink_structure',
				$nice_permalinks
			);
			ob_clean();
			if ( get_option( 'permalink_structure' ) === $nice_permalinks ) {
				echo '1';
			} else {
				echo '0';
			}
			ob_end_flush();
		`,env:{DOCUMENT_ROOT:n.documentRoot}})).text!=="1"&&logger.warn("Failed to default to pretty permalinks after WP install.")}function getFileNotFoundActionForWordPress(n){return{type:"internal-redirect",uri:"/index.php"}}async function isDatabaseConnectionValid(n){return(await n.run({code:`<?php
			ob_start();
			$wp_load = getenv('DOCUMENT_ROOT') . '/wp-load.php';
			if (!file_exists($wp_load)) {
				echo '-1';
				exit;
			}
			require $wp_load;
			ob_clean();
			echo $wpdb->check_connection( false ) ? '1' : '0';
			ob_end_flush();
		`,env:{DOCUMENT_ROOT:n.documentRoot}})).text==="1"}async function getLoadedWordPressVersion(n){const{php:t,reap:r}=await n.instanceManager.acquirePHPInstance();try{const i=(await t.run({code:`<?php
				require '${n.documentRoot}/wp-includes/version.php';
				echo $wp_version;
			`})).text;if(!i)throw new Error("Unable to read loaded WordPress version.");return versionStringToLoadedWordPressVersion(i)}finally{r()}}function versionStringToLoadedWordPressVersion(n){if(/-(alpha|beta|RC)\d*-\d+$/.test(n))return"trunk";if(/-(beta|RC)\d*$/.test(n))return"beta";const s=n.match(/^(\d+\.\d+)(?:\.\d+)?$/);return s!==null?s[1]:n}const wordPressRewriteRules=[{match:new RegExp("^(/[_0-9a-zA-Z-]+)?(/wp-(content|admin|includes)/.*)"),replacement:"$2"}];async function setupPlatformLevelMuPlugins(n,t={}){if(isLegacyPHPVersion(t.phpVersion))return setupLegacyPlatformLevelMuPlugins(n);await n.mkdir("/internal/shared/mu-plugins"),await n.writeFile("/internal/shared/preload/env.php",`<?php

        // Allow adding filters/actions prior to loading WordPress.
        // $function_to_add MUST be a string.
        function playground_add_filter( $tag, $function_to_add, $priority = 10, $accepted_args = 1 ) {
            global $wp_filter;
            $wp_filter[$tag][$priority][$function_to_add] = array('function' => $function_to_add, 'accepted_args' => $accepted_args);
        }
        function playground_add_action( $tag, $function_to_add, $priority = 10, $accepted_args = 1 ) {
            playground_add_filter( $tag, $function_to_add, $priority, $accepted_args );
        }

        // Load our mu-plugins after customer mu-plugins
        // NOTE: this means our mu-plugins can't use the muplugins_loaded action!
        playground_add_action( 'muplugins_loaded', 'playground_load_mu_plugins', 0 );
        function playground_load_mu_plugins() {
            // Load all PHP files from /internal/shared/mu-plugins, sorted by filename
            $mu_plugins_dir = '/internal/shared/mu-plugins';
            if(!is_dir($mu_plugins_dir)){
                return;
            }
            $mu_plugins = glob( $mu_plugins_dir . '/*.php' );
            sort( $mu_plugins );
            foreach ( $mu_plugins as $mu_plugin ) {
                require_once $mu_plugin;
            }
        }
    `),await n.writeFile("/internal/shared/mu-plugins/1-auto-login.php",`<?php
		/**
		 * Returns the username to auto-login as, if any.
		 * @return string|false
		 */
		function playground_get_username_for_auto_login() {
			/**
			 * Allow users to auto-login as a specific user on their first visit.
			 *
			 * Prevent the auto-login if it already happened by checking for the
			 * playground_auto_login_already_happened cookie.
			 * This is used to allow the user to logout.
			 */
			if ( defined('PLAYGROUND_AUTO_LOGIN_AS_USER') && !isset($_COOKIE['playground_auto_login_already_happened']) ) {
				return PLAYGROUND_AUTO_LOGIN_AS_USER;
			}
			/**
			 * Allow users to auto-login as a specific user by passing the
			 * playground_force_auto_login_as_user GET parameter.
			 */
			if ( defined('PLAYGROUND_FORCE_AUTO_LOGIN_ENABLED') && isset($_GET['playground_force_auto_login_as_user']) ) {
				return $_GET['playground_force_auto_login_as_user'];
			}
			return false;
		}

		/**
		 * Logs the user in on their first visit if the Playground runtime told us to.
		 */
		function playground_auto_login() {
			/**
			 * The redirect should only run if the current PHP request is
			 * a HTTP request. If it's a PHP CLI run, we can't login the user
			 * because logins require cookies which aren't available in the CLI.
			 *
			 * Currently all Playground requests use the "cli" SAPI name
			 * to ensure support for WP-CLI, so the best way to distinguish
			 * between a CLI run and an HTTP request is by checking if the
			 * $_SERVER['REQUEST_URI'] global is set.
			 *
			 * If $_SERVER['REQUEST_URI'] is not set, we assume it's a CLI run.
			 */
			if (empty($_SERVER['REQUEST_URI'])) {
				return;
			}
			$user_name = playground_get_username_for_auto_login();
			if ( false === $user_name ) {
				return;
			}
			if (wp_doing_ajax() || defined('REST_REQUEST')) {
				return;
			}
			if ( is_user_logged_in() ) {
				return;
			}
			$user = get_user_by('login', $user_name);
			if (!$user) {
				return;
			}

			/**
			 * We're about to set cookies and redirect. It will log the user in
			 * if the headers haven't been sent yet.
			 *
			 * However, if they have been sent already – e.g. there a PHP
			 * notice was printed, we'll exit the script with a bunch of errors
			 * on the screen and without the user being logged in. This
			 * will happen on every page load and will effectively make Playground
			 * unusable.
			 *
			 * Therefore, we just won't auto-login if headers have been sent. Maybe
			 * we'll be able to finish the operation in one of the future requests
			 * or maybe not, but at least we won't end up with a permanent white screen.
			 */
			if (headers_sent()) {
				_doing_it_wrong('playground_auto_login', 'Headers already sent, the Playground runtime will not auto-login the user', '1.0.0');
				return;
			}

			/**
			 * This approach is described in a comment on
			 * https://developer.wordpress.org/reference/functions/wp_set_current_user/
			 */
			wp_set_current_user( $user->ID, $user->user_login );
			wp_set_auth_cookie( $user->ID );
			do_action( 'wp_login', $user->user_login, $user );

			setcookie('playground_auto_login_already_happened', '1');

			/**
			 * Confirm that nothing in WordPress, plugins, or filters have finalized
			 * the headers sending phase. See the comment above for more context.
			 */
			if (headers_sent()) {
				_doing_it_wrong('playground_auto_login', 'Headers already sent, the Playground runtime will not auto-login the user', '1.0.0');
				return;
			}

			/**
			 * Reload page to ensure the user is logged in correctly.
			 * WordPress uses cookies to determine if the user is logged in,
			 * so we need to reload the page to ensure the cookies are set.
			 */
			$redirect_url = $_SERVER['REQUEST_URI'];

			/**
			 * Intentionally do not use wp_redirect() here. It removes
			 * %0A and %0D sequences from the URL, which we don't want.
			 * There are valid use-cases for encoded newlines in the query string,
			 * for example html-api-debugger accepts markup with newlines
			 * encoded as %0A via the query string.
			 */
			header( "Location: $redirect_url", true, 302 );
			exit;
		}
		/**
		 * Autologin users from the wp-login.php page.
		 *
		 * The wp hook isn't triggered on
		 **/
		add_action('init', 'playground_auto_login', 1);

		/**
		 * Use an intermediate redirection step to ensure the login cookies
		 * are set before we redirecting to the landing page.
		 *
		 * /wp-admin/customize.php, and potentially other pages in WordPress,
		 * run authorization checks before running the init hook. If they're
		 * set as the landing page of the Blueprint, the user will be redirected
		 * to wp-login.php?reauth=1 before we have a chance to set the
		 * authorization cookie.
		 *
		 * To avoid this, we redirect to an intermediate page that will
		 * redirect the user to the landing page.
		 */
		function playground_auto_login_redirect_target() {
			if(strpos($_SERVER['REQUEST_URI'], '?playground-redirection-handler') !== false) {
				$next = $_GET['next'];
				header('Location: ' . $next, true, 302);
				exit;
			}
		}
		add_action('init', 'playground_auto_login_redirect_target', 1);

		/**
		 * Disable the Site Admin Email Verification Screen for any session started
		 * via autologin.
		 */
		add_filter('admin_email_check_interval', function($interval) {
			if(false === playground_get_username_for_auto_login()) {
				return 0;
			}
			return $interval;
		});
		`),await writeCommonPlatformMuPlugins(n),await n.writeFile("/internal/shared/preload/error-handler.php",`<?php
		(function() {
			$playground_consts = [];
			if(file_exists('/internal/shared/consts.json')) {
				$playground_consts = @json_decode(file_get_contents('/internal/shared/consts.json'), true) ?: [];
				$playground_consts = array_keys($playground_consts);
			}
			set_error_handler(function($severity, $message, $file, $line) use($playground_consts) {
				/**
				 * Networking support in Playground registers a http_api_transports filter.
				 *
				 * This filter is deprecated, and no longer actively used, but is needed for wp_http_supports().
				 * @see https://core.trac.wordpress.org/ticket/37708
				 */
				if (
					strpos($message, "http_api_transports") !== false &&
					strpos($message, "since version 6.4.0 with no alternative available") !== false
				) {
					return;
				}
				/**
				 * Playground defines some constants upfront, and some of them may be redefined
				 * in wp-config.php. For example, SITE_URL or WP_DEBUG. This is expected and
				 * we want Playground constants to take priority without showing warnings like:
				 *
				 * Warning: Constant SITE_URL already defined in
				 */
				if (strpos($message, "already defined") !== false) {
					foreach($playground_consts as $const) {
						if(strpos($message, "Constant $const already defined") !== false) {
							return;
						}
					}
				}
				/**
				 * Don't complain about network errors when not connected to the network.
				 */
				if (
					(
						! defined('USE_FETCH_FOR_REQUESTS') ||
						! USE_FETCH_FOR_REQUESTS
					) &&
					strpos($message, "WordPress could not establish a secure connection to WordPress.org") !== false)
				{
					return;
				}
				return false;
			});
		})();`)}async function preloadPhpInfoRoute(n,t="/phpinfo.php"){await n.writeFile("/internal/shared/preload/phpinfo.php",`<?php
    // Render PHPInfo if the requested page is /phpinfo.php
    if ( isset($_SERVER['REQUEST_URI']) && ${phpVar(t)} === $_SERVER['REQUEST_URI'] ) {
        phpinfo();
        exit;
    }
    `)}async function preloadSqliteIntegration(n,t,r={}){if(isLegacyPHPVersion(r.phpVersion))return preloadLegacySqliteIntegration(n,t,r);await n.isDir("/tmp/sqlite-database-integration")&&await n.rmdir("/tmp/sqlite-database-integration",{recursive:!0}),await n.mkdir("/tmp/sqlite-database-integration"),await unzipFile(n,t,"/tmp/sqlite-database-integration");const s="/internal/shared/sqlite-database-integration",i=`/tmp/sqlite-database-integration/${(await n.listFiles("/tmp/sqlite-database-integration"))[0]}`;await n.mv(i,s);const a=joinPaths(s,"wp-includes/sqlite/class-wp-sqlite-db.php");if(await n.fileExists(a)){const p=await n.readFileAsText(a),f=p.replace("private $allow_unsafe_unquoted_parameters","protected $allow_unsafe_unquoted_parameters");f!==p&&await n.writeFile(a,f)}await n.defineConstant("SQLITE_MAIN_FILE","1");const l=(await n.readFileAsText(joinPaths(s,"db.copy"))).replace("'{SQLITE_IMPLEMENTATION_FOLDER_PATH}'",phpVar(s)).replace("'{SQLITE_PLUGIN}'",phpVar(joinPaths(s,"load.php"))),u=joinPaths(await n.documentRoot,"wp-content/db.php"),c=`
		// Do not preload this if WordPress comes with a custom db.php file.
		if(file_exists(${phpVar(u)})) {
			return;
		}
		`,d="/internal/shared/mu-plugins/sqlite-database-integration.php";await n.writeFile(d,`<?php${c}?>`+l),await n.writeFile("/internal/shared/preload/0-sqlite.php",buildModernSqlitePreload(c,d)),await n.writeFile("/internal/shared/mu-plugins/sqlite-test.php",`<?php
		global $wpdb;
		if(!($wpdb instanceof WP_SQLite_DB)) {
			var_dump(isset($wpdb));
			die("SQLite integration not loaded " . get_class($wpdb));
		}
		`)}function buildModernSqlitePreload(n,t){return`<?php
	if(!function_exists('mysqli_connect')) {
		function mysqli_connect() {}
	}

	${n}

	${SQLITE_PRELOAD_LOADER_CLASS(`require_once ${phpVar(t)};`)}

		`}async function unzipWordPress(n,t,r={}){n.mkdir("/tmp/unzipped-wordpress");const s=new Uint8Array(await t.slice(0,4).arrayBuffer());if(isZstdBundle(s)){const o=await createDecodedTarStream(t.stream(),"zstd"),l=await extractTarStreamToPhp(o,n,"/tmp/unzipped-wordpress");if(r.expectedFileCount!=null&&l.fileCount!==r.expectedFileCount)throw new WordPressBundleFileCountMismatchError(l.fileCount,r.expectedFileCount)}else await unzipFile(n,t,"/tmp/unzipped-wordpress");n.fileExists("/tmp/unzipped-wordpress/wordpress.zip")&&await unzipFile(n,"/tmp/unzipped-wordpress/wordpress.zip","/tmp/unzipped-wordpress");let i=n.fileExists("/tmp/unzipped-wordpress/wordpress")?"/tmp/unzipped-wordpress/wordpress":n.fileExists("/tmp/unzipped-wordpress/build")?"/tmp/unzipped-wordpress/build":"/tmp/unzipped-wordpress";if(!n.fileExists(joinPaths(i,"wp-config-sample.php"))){const o=n.listFiles(i);if(o.length){const l=o[0];n.fileExists(joinPaths(i,l,"wp-config-sample.php"))&&(i=joinPaths(i,l))}}const a=(o,l,u)=>{if(u.isDir(o)&&u.isDir(l))for(const c of u.listFiles(o)){const d=joinPaths(o,c),p=joinPaths(l,c);a(d,p,u)}else{if(u.fileExists(l)){const c=o.replace(/^\/tmp\/unzipped-wordpress\//,"/");logger.warn(`Cannot unzip WordPress files at ${l}: ${c} already exists.`);return}u.mv(o,l)}};a(i,n.documentRoot,n),n.fileExists(i)&&n.rmdir(i,{recursive:!0}),!n.fileExists(joinPaths(n.documentRoot,"wp-config.php"))&&n.fileExists(joinPaths(n.documentRoot,"wp-config-sample.php"))&&n.writeFile(joinPaths(n.documentRoot,"wp-config.php"),n.readFileAsText(joinPaths(n.documentRoot,"/wp-config-sample.php")))}class WordPressBundleFileCountMismatchError extends Error{constructor(t,r){super(`WordPress core bundle file-count parity check failed: extracted ${t} files, expected ${r}. The download may be truncated or corrupt.`),this.name="WordPressBundleFileCountMismatchError"}}async function backfillStaticFilesRemovedFromMinifiedBuild(n){if(!n?.requestHandler){logger.warn("No PHP request handler available");return}try{const t=joinPaths(n.requestHandler.documentRoot,"wordpress-remote-asset-paths");if(!n.fileExists(t)||n.readFileAsText(t)==="")return;const r=await getWordPressStaticZipUrl(n);if(!r)return;const s=await fetch(r);if(!s?.ok)throw new Error(`Failed to fetch WordPress static assets: ${s.status} ${s.statusText}`);await unzipFile(n,new File([await s.arrayBuffer()],"wordpress-static.zip"),n.requestHandler.documentRoot,!1),n.writeFile(t,"")}catch(t){logger.warn("Failed to download WordPress assets",t)}}async function hasCachedStaticFilesRemovedFromMinifiedBuild(n){if(!n?.requestHandler)return logger.warn("No PHP request handler available"),!1;const t=await getWordPressStaticZipUrl(n);return t?await hasCachedResponse(t):!1}async function getWordPressStaticZipUrl(n){if(!n.requestHandler)return logger.warn("No PHP request handler available"),!1;const t=joinPaths(n.requestHandler.documentRoot,"wp-includes/version.php");if(!n.isFile(t))return!1;const r=await getLoadedWordPressVersion(n.requestHandler),s=wpVersionToStaticAssetsDirectory(r);return s?joinPaths("/",s,"wordpress-static.zip"):!1}var transportFetch=`<?php

/**
 * This transport delegates PHP HTTP requests to JavaScript synchronous XHR.
 *
 * This file isn't actually used. It's just here for reference and development. The actual
 * PHP code used in WordPress is hardcoded copy residing in wordpress.mjs in the _patchWordPressCode
 * function.
 *
 * The reason for calling it Wp_Http_Fetch and not something more natural like
 * Requests_Transport_Fetch is the _get_first_available_transport(). It checks for
 * a class named "Wp_Http_" . $transport_name – which means we must adhere to this
 * hardcoded pattern.
 */
class Wp_Http_Fetch_Base
{
	public $headers = '';

	public function __construct()
	{
	}

	public function __destruct()
	{
	}

	/**
	 * Delegates PHP HTTP requests to JavaScript synchronous XHR.
	 *
	 * @TODO Implement handling for more $options such as cookies, filename, auth, etc.
	 *
	 * @param $url
	 * @param $headers
	 * @param $data
	 * @param $options
	 *
	 * @return false|string
	 */
	public function request($url, $headers = array(), $data = array(), $options = array())
	{
		if (!empty($data)) {
			$data_format = $options['data_format'];
			if ($data_format === 'query') {
				$url = self::format_get($url, $data);
				$data = '';
			} elseif (!is_string($data)) {
				$data = http_build_query($data, '', '&');
			}
		}

		$request = json_encode(
			array(
				'type' => 'request',
				'data' => [
					'headers' => $headers,
					'data' => $data,
					'url' => $url,
					'method' => $options['type'],
					'blocking' => isset($options['blocking']) ? $options['blocking'] : true,
				]
			)
		);

		$this->headers = post_message_to_js($request);

		// Store a file if the request specifies it.
		// Are we sure that \`$this->headers\` includes the body of the response?
		$before_response_body = strpos($this->headers, "\\r\\n\\r\\n");
		if (isset($options['filename']) && $options['filename'] && false !== $before_response_body) {
			$response_body = substr($this->headers, $before_response_body + 4);
			$this->headers = substr($this->headers, 0, $before_response_body);
			file_put_contents($options['filename'], $response_body);
		}

		return $this->headers;
	}

	public function request_multiple($requests, $options)
	{
		$responses = array();
		$class = get_class($this);
		foreach ($requests as $id => $request) {
			try {
				$handler = new $class();
				$responses[$id] = $handler->request($request['url'], $request['headers'], $request['data'], $request['options']);
				$request['options']['hooks']->dispatch('transport.internal.parse_response', array(&$responses[$id], $request));
			} catch (Requests_Exception $e) {
				$responses[$id] = $e;
			}
			if (!is_string($responses[$id])) {
				$request['options']['hooks']->dispatch('multiple.request.complete', array(&$responses[$id], $id));
			}
		}

		return $responses;
	}

	protected static function format_get($url, $data)
	{
		if (!empty($data)) {
			$query = '';
			$url_parts = parse_url($url);
			if (empty($url_parts['query'])) {
				$url_parts['query'] = '';
			} else {
				$query = $url_parts['query'];
			}
			$query .= '&' . http_build_query($data, '', '&');
			$query = trim($query, '&');
			if (empty($url_parts['query'])) {
				$url .= '?' . $query;
			} else {
				$url = str_replace($url_parts['query'], $query, $url);
			}
		}

		return $url;
	}

	public static function test($capabilities = array())
	{
		if (!function_exists('post_message_to_js')) {
			return false;
		}

		return true;
	}
}

if (class_exists('\\WpOrg\\Requests\\Requests')) {
	class Wp_Http_Fetch extends Wp_Http_Fetch_Base implements \\WpOrg\\Requests\\Transport
	{

	}
} else {
	class Wp_Http_Fetch extends Wp_Http_Fetch_Base implements Requests_Transport
	{

	}
}
`,transportDummy=`<?php

/**
 * This transport does not perform any HTTP requests and only exists
 * to prevent the Requests class from complaining about not having any
 * transports.
 * 
 * The reason for calling it Wp_Http_Dummy and not something more natural like
 * Requests_Transport_Dummy is the _get_first_available_transport(). It checks for
 * a class named "Wp_Http_" . $transport_name – which means we must adhere to this
 * hardcoded pattern.
 */
class Wp_Http_Dummy_Base
{
	public $headers = '';

	public function __construct()
	{
	}

	public function __destruct()
	{
	}

	public function request($url, $headers = array(), $data = array(), $options = array())
	{
		return false;
	}

	public function request_multiple($requests, $options)
	{
		$responses = array();
		foreach ($requests as $id => $request) {
			$responses[] = false;
		}
		return $responses;
	}

	protected static function format_get($url, $data)
	{
		return $url;
	}

	public static function test($capabilities = array())
	{
		return true;
	}
}

if (class_exists('\\WpOrg\\Requests\\Requests')) {
	class Wp_Http_Dummy extends Wp_Http_Dummy_Base implements \\WpOrg\\Requests\\Transport
	{

	}
} else {
	class Wp_Http_Dummy extends Wp_Http_Dummy_Base implements Requests_Transport
	{

	}
}
`;const networkingDisabledFunctions=["curl_exec","curl_multi_exec"];var playgroundWebMuPlugin=`<?php
// PHP < 5.3 doesn't support anonymous functions (closures) at all,
// and WordPress < 3.0 can't handle them as hook callbacks. Skip this
// mu-plugin entirely for either.
if (version_compare(PHP_VERSION, '5.3', '<')
	|| (isset($GLOBALS['wp_version']) && version_compare($GLOBALS['wp_version'], '3.0', '<'))) {
	return;
}

/**
 * Add a notice to wp-login.php offering the username and password.
 */
add_filter(
	'login_message',
	function ( $message ) {
		return $message . <<<EOT
<div class="message info">
	<strong>username:</strong> <code>admin</code><br><strong>password</strong>: <code>password</code>
</div>
EOT;
	}
);

/**
 * Because the in-browser Playground doesn't have access to the internet,
 * network-dependent features like directories don't work. Normally, you'll
 * see a confusing message like "An unexpected error occurred." This mu-plugin
 * makes it more clear that the feature is not yet supported.
 *
 * https://github.com/WordPress/wordpress-playground/issues/498
 *
 * Added styling to hide the Popular tags section of the Plugins page
 * and the nonfunctional Try Again button (both Plugins and Themes) that's
 * appended when the message is displayed.
 *
 * https://github.com/WordPress/wordpress-playground/issues/927
 *
 */
add_action('admin_head', function () {
	echo '<style>
				:is(.plugins-popular-tags-wrapper:has(div.networking_err_msg),
				button.button.try-again) {
						display: none;
				}
		</style>';
});

/**
 * Opt Playground pages into browser-native cross-document View Transitions.
 *
 * This lets the browser keep the outgoing page visible until the incoming page
 * is ready, without intercepting clicks or emulating navigation.
 * The rules are intentionally low-specificity and printed early, so themes,
 * plugins, and user code can override them with ordinary CSS.
 */
function playground_enable_view_transitions() {
	if ( playground_has_wordpress_view_transitions() ) {
		return;
	}

	?>
	<style>
		@media (prefers-reduced-motion: no-preference) {
			@view-transition {
				navigation: auto;
			}

			::view-transition-group(root),
			::view-transition-old(root),
			::view-transition-new(root) {
				animation-delay: 0s;
				animation-duration: 0s;
			}

			::view-transition-old(root),
			::view-transition-new(root) {
				mix-blend-mode: normal;
			}
		}
	</style>
	<?php
}

/**
 * Checks whether WordPress already owns View Transitions for this request.
 *
 * The Playground fallback avoids named transitions, but it should still step
 * aside when Core or the feature plugin can define its own root transition.
 */
function playground_has_wordpress_view_transitions() {
	// The standalone View Transitions feature plugin defines these globally.
	if ( defined( 'VIEW_TRANSITIONS_VERSION' )
		|| function_exists( 'plvt_load_view_transitions' ) ) {
		return true;
	}

	if ( ! function_exists( 'is_admin' ) || ! is_admin() ) {
		return false;
	}

	// Core exposes these helpers while its admin View Transitions are available.
	if ( function_exists( 'wp_get_view_transitions_admin_css' )
		|| function_exists( 'wp_enqueue_view_transitions_admin_css' ) ) {
		return true;
	}

	return function_exists( 'wp_style_is' )
		&& (
			wp_style_is( 'wp-view-transitions-admin', 'enqueued' )
			|| wp_style_is( 'wp-view-transitions-admin', 'done' )
		);
}
add_action( 'wp_head', 'playground_enable_view_transitions', 0 );
add_action( 'admin_print_styles', 'playground_enable_view_transitions', 0 );
add_action( 'login_head', 'playground_enable_view_transitions', 0 );

add_action('init', 'networking_disabled');
function networking_disabled() {
	$networking_err_msg = '<div class="networking_err_msg">Network access is an <a href="https://github.com/WordPress/wordpress-playground/issues/85" target="_blank">experimental, opt-in feature</a>, which means you need to enable it to allow Playground to access the Plugins/Themes directories.
	<p>There are two alternative methods to enable global networking support:</p>
	<ol>
	<li>Using the <a href="https://wordpress.github.io/wordpress-playground/developers/apis/query-api/">Query API</a>: for example, https://playground.wordpress.net/<em>?networking=yes</em> <strong>or</strong>
	<li> Using the <a href="https://wordpress.github.io/wordpress-playground/blueprints/data-format/#features">Blueprint API</a>: add <code>"features": { "networking": true }</code> to the JSON file.
	</li></ol>
	<p>
	When browsing Playground as a standalone instance, you can enable networking via the settings panel: select the option "Network access (e.g. for browsing plugins)" and hit the "Apply changes" button.<p>
	<strong>Please note:</strong> This option is hidden when browsing Playground as an embedded iframe.</p></div>';
	return $networking_err_msg;
}

add_filter('plugins_api_result', function ($res) {
	if ($res instanceof WP_Error) {
		$res = new WP_Error(
			'plugins_api_failed',
			networking_disabled()
		);
	}
	return $res;
});

add_filter('gettext', function ($translation) {
	if( $GLOBALS['pagenow'] === 'theme-install.php') {
		if ($translation === 'An unexpected error occurred. Something may be wrong with WordPress.org or this server&#8217;s configuration. If you continue to have problems, please try the <a href="%s">support forums</a>.') {
			return networking_disabled();
		}
	}
	return $translation;
});

/**
 * Links with target="top" don't work in the playground iframe because of
 * the sandbox attribute. What they really should be targeting is the
 * playground iframe itself (name="playground"). This mu-plugin rewrites
 * all target="_top" links to target="playground" instead.
 *
 * https://github.com/WordPress/wordpress-playground/issues/266
 */
add_action('admin_print_scripts', function () {
	?>
	<script>
		document.addEventListener('click', function (event) {
			if (event.target.tagName === 'A' && ['_parent', '_top'].includes(event.target.target)) {
				event.target.target = 'wordpress-playground';
			}
		});
	<\/script>
	<?php
});

/**
 * Adds target="_blank" to external links when clicked to open them in a new tab.
 * This prevents users from loading non-Playground pages inside the Playground iframe.
 */
function playground_add_target_blank_to_external_links() {
	// Only run on frontend and admin pages, not during AJAX requests or CLI
	if (empty($_SERVER['REQUEST_URI']) || (function_exists('wp_doing_ajax') && wp_doing_ajax()) || (function_exists('wp_doing_cron') && wp_doing_cron())) {
		return;
	}

	?>
	<script>
		function addTargetBlankToExternalLinks() {
			function addTargetBlank(a) {
				const url = new URL(a.href, location);
				if (url.origin !== location.origin) {
					a.target = '_blank';
				}
			}

			// Set target="_blank" for existing external links – this
			// covers keyboard navigation.
			document.querySelectorAll('a[href]').forEach(a => {
				addTargetBlank(a);
			});

			// Set target="_blank" for external links when clicked.
			// This covers links that are added after the page has loaded.
			document.addEventListener('click', e => {
				// window, document, SVG Text nodes etc. don't have the \`closest\` method
				if ( !e.target?.closest ) {
					return;
				}
				const a = e.target.closest('a[href]');
				if (!a) return;
				addTargetBlank(a);
			});

			// Also handle focus events to cover keyboard navigation on
			// links that are added after the page has loaded.
			document.addEventListener('focus', e => {
				// window, document, SVG Text nodes etc. don't have the \`closest\` method
				if ( !e.target?.closest ) {
					return;
				}
				const a = e.target?.closest('a[href]');
				if (!a) return;
				addTargetBlank(a);
			}, true);
		}

		if (document.readyState === 'loading') {
			document.addEventListener('DOMContentLoaded', addTargetBlankToExternalLinks);
		} else {
			addTargetBlankToExternalLinks();
		}
	<\/script>

	<?php
}
add_action('wp_head', 'playground_add_target_blank_to_external_links');
add_action('admin_head', 'playground_add_target_blank_to_external_links');

/**
 * Reports the current URL to the parent frame.
 *
 * When Document-Isolation-Policy is enabled, the parent frame can't access
 * the iframe's location.href due to cross-origin restrictions. This script
 * posts a message to the parent frame with the current URL so the address
 * bar can be updated.
 *
 * @see https://github.com/WordPress/wordpress-playground/issues/2954
 */
function playground_report_url_to_parent() {
	?>
	<script>
		if (window.parent !== window) {
			window.parent.postMessage(
				JSON.stringify({
					type: 'playground-url-change',
					url: window.location.href
				}),
				'*'
			);
		}
	<\/script>
	<?php
}
add_action('wp_head', 'playground_report_url_to_parent');
add_action('admin_head', 'playground_report_url_to_parent');

/**
 * Captures this document when the trusted Playground parent requests a site
 * thumbnail. The renderer is loaded only for a capture, so normal WordPress
 * page loads do not pay its download or execution cost.
 *
 * This must run inside the WordPress document rather than reading the iframe
 * DOM from the remote frame. For example, a plugin may send
 * \`Cross-Origin-Embedder-Policy: require-corp\` and
 * \`Cross-Origin-Opener-Policy: same-origin\` on the front page. Playground's
 * service worker rewrites those headers to
 * \`Document-Isolation-Policy: isolate-and-require-corp\`. The remote frame does
 * not have a matching policy, so browsers that support it block the remote
 * frame's synchronous access to \`iframe.contentDocument\`, even though both
 * frames are same-origin. The listener below therefore captures in the
 * WordPress document and returns the thumbnail with \`postMessage()\`.
 */
function playground_enable_site_thumbnail_capture() {
	?>
	<script>
		(function () {
			if (window.__playgroundSiteThumbnailCaptureEnabled) {
				return;
			}
			window.__playgroundSiteThumbnailCaptureEnabled = true;

			window.addEventListener('message', async function (event) {
				// The origin protects the trust boundary. Checking source as well
				// prevents another same-origin frame from requesting code execution.
				if (
					event.source !== window.parent ||
					event.origin !== window.location.origin ||
					event.data?.type !== 'playground-capture-site-thumbnail'
				) {
					return;
				}

				const request = event.data;
				try {
					if (
						typeof request.moduleUrl !== 'string' ||
						!request.moduleUrl
					) {
						throw new Error('Missing site thumbnail module URL.');
					}
					// Dynamic import executes inside the WordPress document. Accept only
					// the same-origin renderer asset marked by the trusted parent.
					const moduleUrl = new URL(request.moduleUrl);
					const isRendererModule =
						moduleUrl.pathname ===
							'/src/lib/capture-site-thumbnail.ts' ||
						/^\\/capture-site-thumbnail-[A-Za-z0-9_-]+\\.js$/.test(
							moduleUrl.pathname
						);
					if (
						moduleUrl.origin !== event.origin ||
						!isRendererModule ||
						moduleUrl.searchParams.get(
							'playground-site-thumbnail-module'
						) !== '1'
					) {
						throw new Error('Invalid site thumbnail module URL.');
					}
					await import(moduleUrl.href);
					if (typeof window.__playgroundCaptureSiteThumbnail !== 'function') {
						throw new Error('Site thumbnail renderer did not load.');
					}
					const thumbnail = await window.__playgroundCaptureSiteThumbnail();
					window.parent.postMessage(
						{
							type: 'playground-site-thumbnail-result',
							requestId: request.requestId,
							thumbnail,
						},
						event.origin
					);
				} catch (error) {
					window.parent.postMessage(
						{
							type: 'playground-site-thumbnail-result',
							requestId: request.requestId,
							error:
								error instanceof Error
									? error.message
									: String(error),
						},
						event.origin
					);
				}
			});
		})();
	<\/script>
	<?php
}
add_action('wp_head', 'playground_enable_site_thumbnail_capture');
add_action('admin_head', 'playground_enable_site_thumbnail_capture');

/**
 * Exposes a WebMCP \`modelContext\` inside the WordPress document and proxies it
 * to the Playground frame.
 *
 * WordPress runs in a nested, service-worker-served iframe. A browser agent
 * driving the top-level Playground page cannot see tools a plugin registers in
 * that inner document, and the remote frame cannot read the inner document
 * either — under Document-Isolation-Policy synchronous cross-frame DOM access
 * is blocked even between same-origin frames.
 *
 * This script therefore implements the tool registry on the WordPress side and
 * mirrors it over \`postMessage()\`:
 *
 * * every registration change announces the full tool list to the parent;
 * * the parent asks this document to run a tool and receives the JSON result.
 *
 * The registry is installed as an own property on \`document\`, shadowing a
 * native implementation if the browser has one. Playground owns the proxy that
 * surfaces these tools to the agent, so the inner document must not register
 * them with the browser behind Playground's back.
 *
 * @see packages/playground/remote/src/lib/webmcp-frame-bridge.ts
 */
function playground_enable_webmcp_bridge() {
	?>
	<script>
		(function () {
			if (window.__playgroundWebmcpBridgeEnabled || window.parent === window) {
				return;
			}
			window.__playgroundWebmcpBridgeEnabled = true;

			var TOOLS_CHANGED = 'playground-webmcp-tools-changed';
			var LIST_TOOLS = 'playground-webmcp-list-tools';
			var CALL_TOOL = 'playground-webmcp-call-tool';
			var CALL_RESULT = 'playground-webmcp-call-result';

			// The remote frame is same-origin with this document.
			var parentOrigin = window.location.origin;
			var tools = new Map();
			var announceScheduled = false;

			/**
			 * Announces the current tool list to the parent frame.
			 *
			 * Batched on a microtask so a plugin registering ten tools in a
			 * row produces one message rather than ten.
			 */
			function announce() {
				if (announceScheduled) {
					return;
				}
				announceScheduled = true;
				Promise.resolve().then(function () {
					announceScheduled = false;
					var described = [];
					tools.forEach(function (tool) {
						described.push({
							name: tool.name,
							description:
								typeof tool.description === 'string'
									? tool.description
									: '',
							inputSchema: toPlainObject(tool.inputSchema),
							annotations: toPlainObject(tool.annotations)
						});
					});
					window.parent.postMessage(
						{ type: TOOLS_CHANGED, tools: described },
						parentOrigin
					);
				});
			}

			/**
			 * Drops anything a structured clone would reject, such as the
			 * functions and class instances a schema builder may leave behind.
			 */
			function toPlainObject(value) {
				if (!value || typeof value !== 'object') {
					return undefined;
				}
				try {
					return JSON.parse(JSON.stringify(value));
				} catch (e) {
					return undefined;
				}
			}

			function addTool(tool, options) {
				if (
					!tool ||
					typeof tool.name !== 'string' ||
					!tool.name ||
					typeof tool.execute !== 'function'
				) {
					throw new TypeError(
						'A WebMCP tool needs a name and an execute() function.'
					);
				}
				tools.set(tool.name, tool);
				var signal = options && options.signal;
				if (signal) {
					if (signal.aborted) {
						tools.delete(tool.name);
					} else {
						signal.addEventListener('abort', function () {
							if (tools.get(tool.name) === tool) {
								tools.delete(tool.name);
								announce();
							}
						});
					}
				}
				announce();
			}

			var modelContext = {
				get tools() {
					return Array.from(tools.values());
				},
				registerTool: function (tool, options) {
					addTool(tool, options);
					return Promise.resolve();
				},
				provideContext: function (context) {
					tools.clear();
					var provided = (context && context.tools) || [];
					for (var i = 0; i < provided.length; i++) {
						addTool(provided[i]);
					}
					announce();
				},
				clearContext: function () {
					tools.clear();
					announce();
				}
			};

			Object.defineProperty(document, 'modelContext', {
				configurable: true,
				value: modelContext
			});

			// Chrome 150 deprecated \`navigator.modelContext\` in favour of
			// \`document.modelContext\` but still serves it, so a plugin that
			// has not migrated works there and would break only here. Mirror
			// the platform, warning once, and drop this when Chrome does.
			var warnedAboutNavigator = false;
			Object.defineProperty(navigator, 'modelContext', {
				configurable: true,
				get: function () {
					if (!warnedAboutNavigator) {
						warnedAboutNavigator = true;
						console.warn(
							'navigator.modelContext is deprecated and will be ' +
							'removed. Use document.modelContext instead.'
						);
					}
					return modelContext;
				}
			});

			// A minimal WebMCP client. The agent lives in the top-level page,
			// so this document cannot prompt the user itself.
			var toolClient = {
				requestUserInteraction: function (callback) {
					return Promise.resolve().then(callback);
				}
			};

			function respond(callId, result, error) {
				var message = { type: CALL_RESULT, callId: callId };
				if (error) {
					message.error = error;
				} else {
					try {
						message.resultJson = JSON.stringify(
							result === undefined ? null : result
						);
					} catch (e) {
						message.error =
							'The tool returned a value that cannot be serialized to JSON.';
					}
				}
				window.parent.postMessage(message, parentOrigin);
			}

			window.addEventListener('message', function (event) {
				// The origin marks the trust boundary; checking the source as
				// well keeps another same-origin frame from invoking tools.
				if (
					event.source !== window.parent ||
					event.origin !== parentOrigin ||
					!event.data
				) {
					return;
				}
				if (event.data.type === LIST_TOOLS) {
					announce();
					return;
				}
				if (event.data.type !== CALL_TOOL) {
					return;
				}
				var callId = event.data.callId;
				var tool = tools.get(event.data.name);
				if (!tool) {
					respond(
						callId,
						null,
						'Unknown WebMCP tool: ' + event.data.name
					);
					return;
				}
				Promise.resolve()
					.then(function () {
						return tool.execute(
							event.data.arguments || {},
							toolClient
						);
					})
					.then(
						function (result) {
							respond(callId, result, null);
						},
						function (error) {
							respond(
								callId,
								null,
								error && error.message
									? error.message
									: String(error)
							);
						}
					);
			});

			// Announce right away so the parent replaces the previous
			// document's tools on every navigation, even when this page
			// registers none.
			announce();
		})();
	<\/script>
	<?php
}
add_action('wp_head', 'playground_enable_webmcp_bridge');
add_action('admin_head', 'playground_enable_webmcp_bridge');

/**
 * The default WordPress requests transports have been disabled
 * at this point. However, the Requests class requires at least
 * one working transport or else it throws warnings and acts up.
 *
 * This mu-plugin provides that transport. It's one of the two:
 *
 * * WP_Http_Fetch – Sends requests using browser's fetch() function.
 * * WP_Http_Dummy – Does not send any requests and only exists to keep
 * 								the Requests class happy.
 */
$__requests_class = class_exists( '\\WpOrg\\Requests\\Requests' ) ? '\\WpOrg\\Requests\\Requests' : ( class_exists( 'Requests' ) ? 'Requests' : null );
if (defined('USE_FETCH_FOR_REQUESTS') && USE_FETCH_FOR_REQUESTS) {
	require(__DIR__ . '/playground-includes/wp_http_fetch.php');
	/**
	 * Force the Fetch transport to be used in Requests.
	 */
	add_action( 'requests-requests.before_request', function( $url, $headers, $data, $type, &$options ) {
		$options['transport'] = 'Wp_Http_Fetch';
	}, 10, 5 );

	/**
	 * Force wp_http_supports() to work, which uses deprecated WP_HTTP methods.
	 * This filter is deprecated, and no longer actively used, but is needed for wp_http_supports().
	 * @see https://core.trac.wordpress.org/ticket/37708
	 */
	add_filter('http_api_transports', function() {
		return array( 'Fetch' );
	});

	/**
	 * Disable signature verification as it doesn't seem to work with
	 * fetch requests:
	 *
	 * https://downloads.wordpress.org/plugin/classic-editor.zip returns no signature header.
	 * https://downloads.wordpress.org/plugin/classic-editor.zip.sig returns 404.
	 *
	 * @TODO Investigate why.
	 */
	add_filter('wp_signature_hosts', function ($hosts) {
		return array();
	});
} else {
	require(__DIR__ . '/playground-includes/wp_http_dummy.php');
	if ( $__requests_class ) {
		$__requests_class::add_transport('Wp_Http_Dummy');
	}

	add_action( 'requests-requests.before_request', function( $url, $headers, $data, $type, &$options ) {
		$options['transport'] = 'Wp_Http_Dummy';
	}, 10, 5 );

	add_filter('http_api_transports', function() {
		return array( 'Dummy' );
	});
}

/**
 * Disable the pattern picker modal to prevent iOS Safari memory crashes.
 * @see https://github.com/WordPress/gutenberg/issues/75019
 */
add_action('init', function() {
	if (defined('PLAYGROUND_ALLOW_PATTERN_PICKER') && PLAYGROUND_ALLOW_PATTERN_PICKER) return;
	if (!function_exists('get_current_user_id')) return;
	$user_id = get_current_user_id();
	if (!$user_id) return;

	$prefs = get_user_meta($user_id, 'wp_persisted_preferences', true) ?: array();
	if (!isset($prefs['core'])) $prefs['core'] = array();
	$prefs['core']['enableChoosePatternModal'] = false;
	update_user_meta($user_id, 'wp_persisted_preferences', $prefs);
});

/**
 * Disable the WP Cron.
 * 
 * Around WordPress 7.0 beta 1, many wp-cron requests in the Playground started
 * taking the full 30 seconds to complete. Since we're running PHP on a single
 * worker, that blocks every other request from running until WP Cron completes.
 */
define('DISABLE_WP_CRON', true);
if(str_ends_with($_SERVER['PHP_SELF'], '/wp-cron.php')) {
	http_response_code(503);
	header('Content-Type: text/plain');
	echo 'WP Cron is temporarily disabled in the Playground.';
	exit;
}
`,playgroundWebMuPluginPhp52=`<?php
/**
 * PHP 5.2-compatible minimal version of 0-playground.php.
 *
 * PHP 5.2 does not support anonymous functions (closures), so this
 * file replaces the full 0-playground.php for PHP 5.2 only. It
 * provides the essential HTTP transport setup and WP Cron disable
 * using named functions throughout.
 */

// WordPress < 3.0 can't handle hook callbacks via add_action/add_filter
// without an initialized $wp_filter. Check it's safe to register hooks.
if (!function_exists('add_action') || !function_exists('add_filter')) {
	return;
}

/**
 * Set up the HTTP transport. On PHP 5.2 we still need to register a
 * Fetch or Dummy transport so that wp_remote_*() calls don't crash.
 */
// PHP 5.2 always uses the Dummy transport. wp_http_dummy.php and
// wp_http_fetch.php both use PHP 5.3+ namespace syntax that causes
// parse errors on PHP 5.2, so define the transport class inline here.
//
// The class is named Wp_Http_Dummy because WP_Http::_dispatch_request()
// prepends "WP_Http_" to entries from the http_api_transports filter.
// Returning array('Dummy') makes WP look for WP_Http_Dummy, which
// matches this class (PHP class names are case-insensitive).
//
// The class does not implement the Requests_Transport interface
// because the Requests library may not be loaded yet at mu-plugin
// time. The before_request action below sets the transport directly,
// bypassing the library's interface check.
if (!class_exists('Wp_Http_Dummy')) {
	/**
	 * Minimal dummy HTTP transport for PHP 5.2.
	 * Does not perform any HTTP requests; just satisfies WP_Http.
	 */
	class Wp_Http_Dummy {
		public $headers = '';
		public function __construct() {}
		public function request($url, $headers = array(), $data = array(), $options = array()) {
			return false;
		}
		public function request_multiple($requests, $options) {
			$responses = array();
			foreach ($requests as $id => $request) {
				$responses[$id] = false;
			}
			return $responses;
		}
		public static function test($capabilities = array()) {
			return true;
		}
	}
}
$__requests_class = class_exists('Requests') ? 'Requests' : null;
if ($__requests_class) {
	call_user_func(array($__requests_class, 'add_transport'), 'Wp_Http_Dummy');
}
add_action('requests-requests.before_request', '_pg52_set_dummy_transport', 10, 5);
add_filter('http_api_transports', '_pg52_dummy_transports');

function _pg52_set_dummy_transport($url, $headers, $data, $type, &$options) {
	$options['transport'] = 'Wp_Http_Dummy';
}

function _pg52_dummy_transports() {
	return array('Dummy');
}

// Disable WP Cron on legacy WordPress only. On PHP 5.2 the HTTP API
// is stubbed with Wp_Http_Dummy (see above), so every spawn-cron
// request would return false and WordPress would quietly retry
// forever. Short-circuit the /wp-cron.php endpoint so nothing loops.
//
// Modern 0-playground.php intentionally does NOT define this: on PHP
// 7+ the Fetch transport works, so WP Cron can run for real. Keep
// this block legacy-only.
define('DISABLE_WP_CRON', true);
if (substr($_SERVER['PHP_SELF'], -12) === '/wp-cron.php') {
	header('HTTP/1.1 503 Service Unavailable');
	header('Content-Type: text/plain');
	echo 'WP Cron is temporarily disabled in the Playground.';
	exit;
}
`;function zipNameToHumanName(n){const t=n.split(".").shift().replace(/-/g," ");return t.charAt(0).toUpperCase()+t.slice(1).toLowerCase()}const activatePlugin=async(n,{pluginPath:t,pluginName:r},s)=>{s?.tracker.setCaption(`Activating ${r||t}`);const i=await n.documentRoot,a=joinPaths("/tmp",`playground-activate-plugin-${randomString(20,"")}.log`);let o="";const u=await n.run({code:`<?php
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
		`,env:{PLUGIN_PATH:t,DOCROOT:i,ACTIVATION_LOG:a}}).finally(async()=>{try{await n.fileExists(a)&&(o=(await n.readFileAsText(a)).trim(),await n.unlink(a))}catch(g){if(!isFileNotFoundError(g))throw g}});u.text&&logger.warn(`Plugin ${t} activation printed the following bytes: ${u.text}`);const d=((await n.run({code:`<?php
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
		`,env:{DOCROOT:i,PLUGIN_PATH:t}})).text??"").trim();if(d.endsWith('{"success": true}'))return;d!=='{"success": false}'&&logger.debug(d);const p=[],f=(u.text??"").trim();throw f&&p.push(`WordPress said: ${f}`),o&&p.push(`PHP error log:
${o}`),p.push(`Response headers: ${JSON.stringify(u.headers,null,2)}`),p.push("If you need more context, check the Playground console (browser DevTools) or the CLI output where this Blueprint was run."),new Error(`Plugin ${t} could not be activated.

${p.join(`

`)}`)},EMSCRIPTEN_ENOENT=44;function isFileNotFoundError(n){const t=n;return t.code==="ENOENT"||t.errno===EMSCRIPTEN_ENOENT}const activateTheme=async(n,{themeFolderName:t},r)=>{r?.tracker.setCaption(`Activating ${t}`);const s=await n.documentRoot,i=`${s}/wp-content/themes/${t}`;if(!await n.fileExists(i))throw new Error(`
			Couldn't activate theme ${t}.
			Theme not found at the provided theme path: ${i}.
			Check the theme path to ensure it's correct.
			If the theme is not installed, you can install it using the installTheme step.
			More info can be found in the Blueprint documentation: https://wordpress.github.io/wordpress-playground/blueprints/steps/#ActivateThemeStep
		`);const a=await n.run({code:`<?php
			define( 'WP_ADMIN', true );
			require_once( getenv('docroot') . "/wp-load.php" );

			// Set current user to admin
			wp_set_current_user( get_users(array('role' => 'Administrator') )[0]->ID );

			switch_theme( getenv('themeFolderName') );

			if( wp_get_theme()->get_stylesheet() !== getenv('themeFolderName') ) {
				throw new Exception( 'Theme ' . getenv('themeFolderName') . ' could not be activated.' );				
			}
			die('Theme activated successfully');
		`,env:{docroot:s,themeFolderName:t}});if(a.text!=="Theme activated successfully")throw logger.debug(a),new Error(`Theme ${t} could not be activated - WordPress exited with exit code ${a.exitCode}. Inspect the "debug" logs in the console for more details. Output headers: ${JSON.stringify(a.headers,null,2)}`)},runPHP=async(n,{code:t})=>{let r=typeof t=="string"?t:t.content;return(r.includes('"wordpress/wp-load.php"')||r.includes("'wordpress/wp-load.php'"))&&(logger.error(`
It looks like you're trying to load WordPress using a relative path 'wordpress/wp-load.php'.

Playground recently changed the working directory from '/' to '/wordpress' to better mimic
how real web servers work. This means relative paths that used to work may no longer
point to the correct location.

Playground automatically updated the path for you, but at one point path rewriting will be removed. Please
update your code to use an absolute path instead:

Instead of:  require_once 'wordpress/wp-load.php';
Use:         require_once '/wordpress/wp-load.php';

This will ensure your code works reliably regardless of the current working directory.
		`.trim()),r=r.replace("'wordpress/wp-load.php'","'/wordpress/wp-load.php'"),r=r.replace('"wordpress/wp-load.php"','"/wordpress/wp-load.php"')),await n.run({code:r})},runPHPWithOptions=async(n,{options:t})=>await n.run(t),rm=async(n,{path:t})=>{t.startsWith("/")||(logger.error(`
The rm() step in your Blueprint refers to a relative path.

Playground recently changed the working directory from '/' to '/wordpress' to better mimic 
how real web servers work. This means relative paths that used to work may no longer 
point to the correct location.

Playground automatically updated the path for you, but at one point path rewriting will be removed. Please
update your code to use an absolute path instead:

Instead of:  rm({ path: 'wordpress/wp-load.php' });
Use:         rm({ path: '/wordpress/wp-load.php' });

This will ensure your code works reliably regardless of the current working directory.
		`.trim()),t=`/${t}`),await n.unlink(t)};var streamClassContent=`<?php

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

}`;const runSql=async(n,{sql:t},r)=>{r?.tracker.setCaption("Executing SQL Queries");const s=`/tmp/${randomFilename()}.sql`,i=`/tmp/${randomFilename()}.php`;await n.writeFile(s,new Uint8Array(await t.arrayBuffer())),await n.writeFile(i,new TextEncoder().encode(streamClassContent));const a=await n.documentRoot,o=phpVars({docroot:a,sqlFilename:s,streamClassFilename:i}),l=await n.run({code:`<?php
		define('WP_SQLITE_AST_DRIVER', true);
		require_once ${o.docroot} . '/wp-load.php';

		// Load WP_MySQL_Naive_Query_Stream from the bundled file
		require_once ${o.streamClassFilename};

		global $wpdb;

		do_action('run_sql_step');

		$stream = new WP_MySQL_Naive_Query_Stream();

		// Open the SQL file for streaming
		$handle = fopen(${o.sqlFilename}, 'r');
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
	`});return await rm(n,{path:s}),await rm(n,{path:i}),l},request=async(n,{request:t})=>{logger.warn('Deprecated: The Blueprint step "request" is deprecated and will be removed in a future release.');const r=await n.request(t);if(r.httpStatusCode>399||r.httpStatusCode<200)throw logger.warn("WordPress response was",{response:r}),new Error(`Request failed with status ${r.httpStatusCode}`);return r},defineWpConfigConsts=async(n,{consts:t,method:r="define-before-run"})=>{switch(r){case"define-before-run":await defineBeforeRun(n,t);break;case"rewrite-wp-config":{const s=await n.documentRoot,i=joinPaths(s,"/wp-config.php");await defineWpConfigConstants(n,i,t);break}default:throw new Error(`Invalid method: ${r}`)}};async function defineBeforeRun(n,t){for(const r in t)await n.defineConstant(r,t[r])}const setSiteOptions=async(n,{options:t})=>{const r=await n.documentRoot;await n.run({code:`<?php
		include ${phpVar(r)} . '/wp-load.php';
		$site_options = ${phpVar(t)};
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
		`})},updateUserMeta=async(n,{meta:t,userId:r})=>{const s=await n.documentRoot;await n.run({code:`<?php
		include ${phpVar(s)} . '/wp-load.php';
		$meta = ${phpVar(t)};
		foreach($meta as $name => $value) {
			update_user_meta(${phpVar(r)}, $name, $value);
		}
		`})},defaultWpCliPath="/tmp/wp-cli.phar",defaultWpCliResource={resource:"url",url:"https://playground.wordpress.net/wp-cli.phar"},stdinUnsupportedMessage="This WP-CLI command tried to read from STDIN, but the wp-cli Blueprint step does not support interactive input. Provide all required arguments.",wpCliOverridesPath="/tmp/playground-wp-cli-overrides.php",wpCliOverrides=`<?php
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
`,assertWpCli=async(n,t=defaultWpCliPath)=>{if(!await n.fileExists(t))throw new Error(`wp-cli.phar not found at ${t}.
			You can enable wp-cli support by adding "wp-cli" to the list of extra libraries in your blueprint as follows:
			{
				"extraLibraries": [ "wp-cli" ]
			}
			Read more about it in the documentation.
			https://wordpress.github.io/wordpress-playground/blueprints/data-format#extra-libraries`)},wpCLI$1=async(n,{command:t,wpCliPath:r=defaultWpCliPath})=>{await assertWpCli(n,r);let s;if(typeof t=="string"?(t=t.trim(),s=splitShellCommand(t)):s=t,s.shift()!=="wp")throw new Error('The first argument must be "wp".');let a=!1;const o=s.map(c=>c.startsWith("wordpress/")?(a=!0,`/${c}`):c);a&&logger.error(`
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
        `.trim());const l=await n.documentRoot;await n.writeFile("/tmp/stdout",""),await n.writeFile("/tmp/stderr",""),await n.writeFile(wpCliOverridesPath,wpCliOverrides),await n.writeFile(joinPaths(l,"run-cli.php"),`<?php
		// Set up the environment to emulate a shell script
		// call.

		// Set SHELL_PIPE to 0 to ensure WP-CLI formats
		// the output as ASCII tables.
		// @see https://github.com/wp-cli/wp-cli/issues/1102
		putenv( 'SHELL_PIPE=0' );

		// Set the argv global.
		$GLOBALS['argv'] = array_merge([
		  "/tmp/wp-cli.phar",
		  "--path=${l}",
		  "--require=${wpCliOverridesPath}"
		], ${phpVar(o)});

		// Fail before a command can treat missing interactive input as an empty
		// value. The Blueprint step has no way to provide STDIN.
		class Playground_No_Stdin_Stream {
			public $context;

			public function stream_open($path, $mode, $options, &$opened_path) {
				return true;
			}

			public function stream_eof() {
				throw new RuntimeException(
					${phpVar(stdinUnsupportedMessage)}
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
			throw new RuntimeException(${phpVar(stdinUnsupportedMessage)});
		}
		$playground_no_stdin = fopen(
			$playground_no_stdin_scheme . '://input',
			'rb'
		);
		if (!is_resource($playground_no_stdin)) {
			throw new RuntimeException(${phpVar(stdinUnsupportedMessage)});
		}
		define('STDIN', $playground_no_stdin);

		// Provide stdout and stderr streams outside of the CLI SAPI.
		define('STDOUT', fopen('php://stdout', 'wb'));
		define('STDERR', fopen('php://stderr', 'wb'));

		require( ${phpVar(r)} );
		`);const u=await n.run({scriptPath:joinPaths(l,"run-cli.php")});if(u.exitCode!==0)throw new Error(u.errors);return u};function splitShellCommand(n){let s=0,i="";const a=[];let o="";for(let l=0;l<n.length;l++){const u=n[l];s===0?u==='"'||u==="'"?(s=1,i=u):u.match(/\s/)?(o&&a.push(o),o=""):o+=u:s===1&&(u==="\\"?(l++,o+=n[l]):u===i?(s=0,i=""):o+=u)}return o&&a.push(o),a}const enableMultisite=async(n,{wpCliPath:t})=>{await assertWpCli(n,t),await defineWpConfigConsts(n,{consts:{WP_ALLOW_MULTISITE:1}});const r=new URL(await n.absoluteUrl);if(r.port!==""){let c=`The current host is ${r.host}, but WordPress multisites do not support custom ports.`;throw r.hostname==="localhost"&&(c+=" For development, you can set up a playground.test domain using the instructions at https://wordpress.github.io/wordpress-playground/contributing/code."),new Error(c)}const s=r.pathname.replace(/\/$/,"")+"/",i=`${r.protocol}//${r.hostname}${s}`;await setSiteOptions(n,{options:{siteurl:i,home:i}}),await wpCLI$1(n,{command:`wp core multisite-convert --base="${s}"`});const o=`${await n.documentRoot}/wp-config.php`,l=await n.readFileAsText(o);let u=l;l.includes("$_SERVER['HTTP_HOST']")||(u=l.replace(/^<\?php\s*/i,`<?php
$_SERVER['HTTP_HOST'] = ${phpVar(r.hostname)};
`)),await n.writeFile(o,u)},cp=async(n,{fromPath:t,toPath:r})=>{(!t.startsWith("/")||!r.startsWith("/"))&&logger.error(`
The cp() step in your Blueprint refers to a relative path.

Playground recently changed the working directory from '/' to '/wordpress' to better mimic 
how real web servers work. This means relative paths that used to work may no longer 
point to the correct location.

Playground automatically updated the path for you, but at one point path rewriting will be removed. Please
update your code to use an absolute path instead:

Instead of:  cp({ fromPath: 'wordpress/wp-load.php', toPath: 'wordpress/wp-load.php' });
Use:         cp({ fromPath: '/wordpress/wp-load.php', toPath: '/wordpress/wp-load.php' });

This will ensure your code works reliably regardless of the current working directory.
		`.trim()),t.startsWith("/")||(t=`/${t}`),r.startsWith("/")||(r=`/${r}`),await n.writeFile(r,await n.readFileAsBuffer(t))},mv=async(n,{fromPath:t,toPath:r})=>{(!t.startsWith("/")||!r.startsWith("/"))&&logger.error(`
The mv() step in your Blueprint refers to a relative path.

Playground recently changed the working directory from '/' to '/wordpress' to better mimic 
how real web servers work. This means relative paths that used to work may no longer 
point to the correct location.

Playground automatically updated the path for you, but at one point path rewriting will be removed. Please
update your code to use an absolute path instead:

Instead of:  mv({ fromPath: 'wordpress/wp-load.php', toPath: 'wordpress/wp-load.php' });
Use:         mv({ fromPath: '/wordpress/wp-load.php', toPath: '/wordpress/wp-load.php' });

This will ensure your code works reliably regardless of the current working directory.
		`.trim()),t.startsWith("/")||(t=`/${t}`),r.startsWith("/")||(r=`/${r}`),await n.mv(t,r)},mkdir=async(n,{path:t})=>{t.startsWith("/")||logger.error(`
The mkdir() step in your Blueprint refers to a relative path.

Playground recently changed the working directory from '/' to '/wordpress' to better mimic 
how real web servers work. This means relative paths that used to work may no longer 
point to the correct location.

Playground automatically updated the path for you, but at one point path rewriting will be removed. Please
update your code to use an absolute path instead:

Instead of:  mkdir({ path: 'wordpress/my-new-folder' });
Use:         mkdir({ path: '/wordpress/my-new-folder' });

This will ensure your code works reliably regardless of the current working directory.
		`.trim()),await n.mkdir(t)},rmdir=async(n,{path:t})=>{t.startsWith("/")||(logger.error(`
The rmdir() step in your Blueprint refers to a relative path.

Playground recently changed the working directory from '/' to '/wordpress' to better mimic 
how real web servers work. This means relative paths that used to work may no longer 
point to the correct location.

Playground automatically updated the path for you, but at one point path rewriting will be removed. Please
update your code to use an absolute path instead:

Instead of:  rmdir({ path: 'wordpress/wp-load.php' });
Use:         rmdir({ path: '/wordpress/wp-load.php' });

This will ensure your code works reliably regardless of the current working directory.
		`.trim()),t=`/${t}`),await n.rmdir(t)},writeFile=async(n,{path:t,data:r})=>{r instanceof File&&(r=new Uint8Array(await r.arrayBuffer())),t.startsWith("/")||(logger.error(`
The writeFile() step in your Blueprint refers to a relative path.

Playground recently changed the working directory from '/' to '/wordpress' to better mimic 
how real web servers work. This means relative paths that used to work may no longer 
point to the correct location.

Playground automatically updated the path for you, but at one point path rewriting will be removed. Please
update your code to use an absolute path instead:

Instead of:  writeFile({ path: 'wordpress/wp-load.php', data: '<?php echo "Hello World!"; ?>' });
Use:         writeFile({ path: '/wordpress/wp-load.php', data: '<?php echo "Hello World!"; ?>' });

This will ensure your code works reliably regardless of the current working directory.
		`.trim()),t=`/${t}`),t.startsWith("/wordpress/wp-content/mu-plugins")&&!await n.fileExists("/wordpress/wp-content/mu-plugins")&&await n.mkdir("/wordpress/wp-content/mu-plugins"),await n.writeFile(t,r)},writeFiles=async(n,{writeToPath:t,filesTree:r})=>{t.startsWith("/")||(logger.error(`
The writeFiles() step in your Blueprint refers to a relative path.

Playground recently changed the working directory from '/' to '/wordpress' to better mimic 
how real web servers work. This means relative paths that used to work may no longer
point to the correct location.

Playground automatically updated the path for you, but at one point path rewriting will be removed. Please
update your code to use an absolute path instead:

Instead of:  writeFiles({ writeToPath: 'wordpress/wp-content/plugins/my-plugin', filesTree: { name: 'style.css': 'a { color: red; }' });
Use:         writeFiles({ writeToPath: '/wordpress/wp-content/plugins/my-plugin', filesTree: { name: 'style.css': 'a { color: red; }' });

This will ensure your code works reliably regardless of the current working directory.
		`.trim()),t=`/${t}`),await writeFiles$1(n,t,r.files)},defineSiteUrl=async(n,{siteUrl:t})=>{await defineWpConfigConsts(n,{consts:{WP_HOME:t,WP_SITEURL:t}})},importWxr=async(n,{file:t,fetchAttachments:r=!0,rewriteUrls:s=!0,urlMapping:i={},importComments:a=!0,defaultAuthorUsername:o="admin",authorsMode:l="default-author",authorsMap:u={},importUsers:c=!1},d)=>{const p=o.trim()||"admin";await importWithDefaultImporter(n,t,d,{fetchAttachments:r,rewriteUrls:s,urlMapping:i,importComments:a,fallbackAuthorUsername:p,authorsMode:l,authorsMap:u,importUsers:c})};async function importWithDefaultImporter(n,t,r,s){r?.tracker?.setCaption("Importing content"),await writeFile(n,{path:"/tmp/import.wxr",data:t}),await n.run({$_SERVER:{HTTPS:(await n.absoluteUrl).startsWith("https://")?"on":""},code:`<?php
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
	`,env:{IMPORT_FILE:"/tmp/import.wxr",FETCH_ATTACHMENTS:s.fetchAttachments?"true":"false",REWRITE_URLS:s.rewriteUrls?"true":"false",URL_MAPPING:JSON.stringify(s.urlMapping),IMPORT_COMMENTS:s.importComments?"true":"false",FALLBACK_AUTHOR_USERNAME:s.fallbackAuthorUsername,AUTHORS_MODE:s.authorsMode,AUTHORS_MAP:JSON.stringify(s.authorsMap),IMPORT_USERS:s.importUsers?"true":"false"}})}const importThemeStarterContent=async(n,{themeSlug:t=""},r)=>{r?.tracker?.setCaption("Importing theme starter content");const s=await n.documentRoot;await n.run({code:`<?php

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
			$_REQUEST['customize_theme'] = ${phpVar(t)} ?: get_stylesheet();

			/*
			 * Claim this is a ajax request saving settings, to avoid the preview filters being applied.
			 */
			$_REQUEST['action'] = 'customize_save';
			add_filter( 'wp_doing_ajax', '__return_true' );

			$_GET = $_REQUEST;
		}
		playground_add_filter( 'plugins_loaded', 'importThemeStarterContent_plugins_loaded', 0 );

		require ${phpVar(s)} . '/wp-load.php';

		// Return early if there's no starter content.
		if ( ! get_theme_starter_content() ) {
			return;
		}

		// Import the Starter Content.
		$wp_customize->import_theme_starter_content();

		// Publish the changeset, which publishes the starter content.
		wp_publish_post( $wp_customize->changeset_post_id() );
		`})},legacyPlaygroundRuntimeWpContentPaths=["mu-plugins/sqlite-database-integration","mu-plugins/playground-includes","mu-plugins/0-playground.php","mu-plugins/0-sqlite.php"];async function getLegacyPlaygroundRuntimeWpContentPaths(n,t){const r=[...legacyPlaygroundRuntimeWpContentPaths],s=joinPaths(t,"db.php");return await n.fileExists(s)&&!await n.isDir(s)&&(await n.readFileAsText(s)).includes(PLAYGROUND_MANAGED_DB_PHP_MARKER)&&r.push("db.php"),r}const wpContentPathsExcludedFromLegacyExports=["plugins/akismet","plugins/hello.php","plugins/wordpress-importer","themes/twentytwenty","themes/twentytwentyone","themes/twentytwentytwo","themes/twentytwentythree","themes/twentytwentyfour","themes/twentytwentyfive","themes/twentytwentysix"],importWordPressFiles=async(n,{wordPressFilesZip:t,pathInZip:r=""},s)=>{const i=await n.documentRoot;s?.tracker.setCaption("Unpacking archive");const a=joinPaths("/tmp",`import-wordpress-files-${randomFilename()}`);let o=!1,l=null;try{await n.mkdir(a);let d;s&&(d=({filesProcessed:h,totalFiles:m,uncompressedBytesProcessed:w,totalUncompressedBytes:T})=>{s.tracker.setCaption(`Extracting ${h}/${m}`);let E=h/Math.max(m,1);T>0&&(E=w/T),s.tracker.set(E*30)}),await unzipFile(n,t,a,!0,d);let p=joinPaths(a,r);p=await findWordPressFilesRoot(n,p)||p,s?.tracker.setCaption("Installing WordPress files"),s?.tracker.set(30);const f=joinPaths(p,"playground-export.json");let g=null;if(await n.fileExists(f))try{const h=await n.readFileAsText(f),m=JSON.parse(h);typeof m.siteUrl=="string"&&(l=m.siteUrl),typeof m.formatVersion=="number"&&(g=m.formatVersion),await n.unlink(f)}catch{}const y=joinPaths(p,"wp-content");if(await n.fileExists(y)){const h=joinPaths(i,"wp-content"),m=await getLegacyPlaygroundRuntimeWpContentPaths(n,y),w=await getLegacyPlaygroundRuntimeWpContentPaths(n,h);for(const T of m)await removePath(n,joinPaths(y,T));for(const T of w){const E=joinPaths(y,T),b=joinPaths(h,T);!await n.fileExists(E)&&await n.fileExists(b)&&(await n.mkdir(dirname(E)),await n.cp(b,E))}if(g===null||g<2){for(const b of wpContentPathsExcludedFromLegacyExports){const S=joinPaths(y,b),A=joinPaths(h,b);!await n.fileExists(S)&&await n.fileExists(A)&&(await n.mkdir(dirname(S)),await n.cp(A,S))}const T=joinPaths(y,"database"),E=joinPaths(h,"database");!await n.fileExists(T)&&await n.fileExists(E)&&await n.cp(E,T)}}const _=await n.listFiles(p);o=_.length>0;for(const h of _)await removePath(n,joinPaths(i,h)),await n.mv(joinPaths(p,h),joinPaths(i,h));o=!1}finally{o?logger.warn(`WordPress file import failed while replacing live files. The remaining staged files were preserved for recovery at ${a}.`):await removePath(n,a)}s?.tracker.setCaption("Updating WordPress configuration"),s?.tracker.set(60),await ensureWpConfig(n,i);const u=await n.absoluteUrl;l||(l=await inferSiteUrlFromDatabase(n,i)),await defineSiteUrl(n,{siteUrl:u}),s?.tracker.setCaption("Upgrading the WordPress database"),s?.tracker.set(75);const c=phpVar(joinPaths(i,"wp-admin","upgrade.php"));await n.run({code:`<?php
            $_GET['step'] = 'upgrade_db';
            require ${c};
            `}),l&&l!==u&&(s?.tracker.setCaption("Updating site URLs"),s?.tracker.set(90),await replaceSiteUrl(n,i,l,u)),s?.tracker.setCaption("WordPress files imported"),s?.tracker.finish()};function extractScopePath(n){const t=n.match(/\/scope:[^/]+\/?/);return t?t[0].replace(/\/?$/,"/"):null}async function replaceSiteUrl(n,t,r,s){const i=extractScopePath(r),a=extractScopePath(s);!i||!a||i!==a&&await n.run({code:`<?php
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
		`,env:{DOCUMENT_ROOT:t,OLD_SCOPE:i,NEW_SCOPE:a}})}async function inferSiteUrlFromDatabase(n,t){const r=phpVars({documentRoot:t});return(await n.run({code:`<?php
		require_once ${r.documentRoot} . '/wp-load.php';
		global $wpdb;
		$row = $wpdb->get_row("SELECT option_value FROM {$wpdb->options} WHERE option_name = 'siteurl'");
		echo $row ? $row->option_value : '';
		`})).text.trim()||null}const WORDPRESS_ROOT_MARKERS=["wp-content","wp-admin","wp-includes","wp-config.php","wp-config-sample.php"];async function findWordPressFilesRoot(n,t){if(await hasWordPressRootMarker(n,t))return t;const r=await n.listFiles(t);if(r.length!==1)return null;const s=joinPaths(t,r[0]);return await n.isDir(s)&&await hasWordPressRootMarker(n,s)?s:null}async function hasWordPressRootMarker(n,t){for(const r of WORDPRESS_ROOT_MARKERS)if(await n.fileExists(joinPaths(t,r)))return!0;return!1}async function removePath(n,t){await n.fileExists(t)&&(await n.isDir(t)?await n.rmdir(t):await n.unlink(t))}async function exportWXR(n){const t=await n.request({url:"/wp-admin/export.php?download=true&content=all"});return new File([t.bytes],"export.xml")}const unzip=async(n,{zipFile:t,zipPath:r,extractToPath:s})=>{if(r)logger.warn('The "zipPath" option of the unzip() Blueprint step is deprecated and will be removed. Use "zipFile" instead.');else if(!t)throw new Error("Either zipPath or zipFile must be provided");await unzipFile(n,t||r,s)};async function installAsset(n,{targetPath:t,zipFile:r,ifAlreadyInstalled:s="overwrite",targetFolderName:i=""}){const o=r.name.replace(/\.zip$/,""),l=joinPaths(await n.documentRoot,"wp-content"),u=joinPaths(l,randomFilename()),c=joinPaths(u,"assets",o);await n.fileExists(c)&&await n.rmdir(u,{recursive:!0}),await n.mkdir(u);try{await unzip(n,{zipFile:r,extractToPath:c});let d=await n.listFiles(c,{prependPath:!0});d=d.filter(_=>!_.endsWith("/__MACOSX"));const p=d.length===1&&await n.isDir(d[0]);let f,g="";p?(g=d[0],f=d[0].split("/").pop()):(g=c,f=o),i&&i.length&&(f=i);const y=`${t}/${f}`;if(await n.fileExists(y)){if(!await n.isDir(y))throw new Error(`Cannot install asset ${f} to ${y} because a file with the same name already exists. Note it's a file, not a directory! Is this by mistake?`);if(s==="overwrite")await n.rmdir(y,{recursive:!0});else{if(s==="skip")return{assetFolderPath:y,assetFolderName:f,installationStatus:"skipped-already-existed"};throw new Error(`Cannot install asset ${f} to ${t} because it already exists and the ifAlreadyInstalled option was set to ${s}`)}}return await n.mv(g,y),{assetFolderPath:y,assetFolderName:f,installationStatus:"installed"}}finally{await n.rmdir(u,{recursive:!0})}}const ACTIVATION_OPTIONS_PAYLOAD_PREFIX="PLAYGROUND_ACTIVATION_OPTIONS:",installPlugin=async(n,{pluginData:t,pluginZipFile:r,ifAlreadyInstalled:s,options:i={}},a)=>{r&&(t=r,logger.warn('The "pluginZipFile" option is deprecated. Use "pluginData" instead.'));let o="",l="",u="installed",c=!1;const d=()=>i.humanReadableName||l,p=async f=>{if(f.name.toLowerCase().endsWith(".zip"))return!0;const g=new Uint8Array(await f.arrayBuffer(),0,4);return g[0]===80&&g[1]===75&&g[2]===3&&g[3]===4};try{const f=joinPaths(await n.documentRoot,"wp-content","plugins"),g="targetFolderName"in i?i.targetFolderName:"";if(t instanceof File)if(await p(t)){const _=t.name.split("/").pop()||"plugin.zip";l=zipNameToHumanName(_),a?.tracker.setCaption(`Installing the ${d()} plugin`);const h=await installAsset(n,{ifAlreadyInstalled:s,zipFile:t,targetPath:`${await n.documentRoot}/wp-content/plugins`,targetFolderName:g});o=h.assetFolderPath,l=h.assetFolderName,u=h.installationStatus}else if(t.name.endsWith(".php")){const _=joinPaths(f,t.name);await writeFile(n,{path:_,data:t}),o=_,l=t.name}else throw new Error("pluginData looks like a file but does not look like a .zip or .php file.");else if(t){l=t.name,a?.tracker.setCaption(`Installing the ${d()} plugin`);const _=joinPaths(f,g||t.name);o=_;let h=!0;if(await n.fileExists(_)){if(!await n.isDir(_))throw new Error(`Cannot install plugin ${l} to ${_} because a file with the same name already exists. Note it's a file, not a directory! Is this by mistake?`);if((s??"overwrite")==="skip")h=!1,u="skipped-already-existed";else if(s==="error")throw new Error(`Cannot install plugin ${l} to ${_} because it already exists and the ifAlreadyInstalled option was set to ${s}`)}h&&await writeFiles$1(n,_,t.files,{rmRoot:!0})}if(c=!!o,"activate"in i?i.activate:!0){let _;i.activationOptions!==void 0&&(_=await setPluginActivationOptions(n,o,i.activationOptions));try{await activatePlugin(n,{pluginPath:o,pluginName:d()},a)}finally{_&&await deletePluginActivationOptions(n,_)}}return{assetPath:o,installationStatus:u}}catch(f){if(i.onError==="skip-plugin"){const g=d()||"unknown plugin";return logger.warn(`Skipping plugin installation for ${g} after failure: ${f instanceof Error?f.message:String(f)}`),c?{assetPath:o,installationStatus:u}:void 0}throw f}};async function setPluginActivationOptions(n,t,r){const s=await n.documentRoot,i=await n.run({code:`<?php
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
`,env:{DOCROOT:s,PLUGIN_PATH:t,ACTIVATION_OPTIONS_JSON:JSON.stringify(r),ACTIVATION_OPTIONS_PAYLOAD_PREFIX}}),a=parseActivationOptionsPayload(i.text);if(a?.error)throw new Error(String(a.error));if(!a?.optionName||typeof a.optionName!="string")throw new Error("Could not determine plugin activation options name.");return a.optionName}async function deletePluginActivationOptions(n,t){await n.run({code:`<?php
require_once getenv('DOCROOT') . "/wp-load.php";
delete_option(getenv('OPTION_NAME'));
`,env:{DOCROOT:await n.documentRoot,OPTION_NAME:t}})}function parseActivationOptionsPayload(n){const t=n||"",r=t.lastIndexOf(ACTIVATION_OPTIONS_PAYLOAD_PREFIX);if(r===-1)return;const s=t.slice(r+ACTIVATION_OPTIONS_PAYLOAD_PREFIX.length).trimStart().split(/\r?\n/,1)[0].trim();if(s)try{return JSON.parse(s)}catch{throw new Error("Could not parse plugin activation options payload.")}}const installTheme=async(n,{themeData:t,themeZipFile:r,ifAlreadyInstalled:s,options:i={}},a)=>{r&&(t=r,logger.warn('The "themeZipFile" option is deprecated. Use "themeData" instead.'));const o=i.onError??"throw";let l="",u="",c="installed",d=!1;const p=()=>i.humanReadableName||u;try{const f="targetFolderName"in i?i.targetFolderName:"";let g="";if(t instanceof File){const h=t.name.split("/").pop()||"theme.zip";u=zipNameToHumanName(h),a?.tracker.setCaption(`Installing the ${p()} theme`);const m=await installAsset(n,{ifAlreadyInstalled:s,zipFile:t,targetPath:`${await n.documentRoot}/wp-content/themes`,targetFolderName:f});g=m.assetFolderName,l=m.assetFolderPath,c=m.installationStatus}else{if(u=t.name,g=f||u,!g||basename(g)!==g)throw new Error("Theme folder name must be a single directory name.");a?.tracker.setCaption(`Installing the ${p()} theme`);const h=joinPaths(await n.documentRoot,"wp-content","themes",g);l=h;let m=!0;if(await n.fileExists(h)){if(!await n.isDir(h))throw new Error(`Cannot install theme ${g} to ${h} because a file with the same name already exists. Note it's a file, not a directory! Is this by mistake?`);if((s??"overwrite")==="skip")m=!1,c="skipped-already-existed";else if(s==="error")throw new Error(`Cannot install theme ${g} to ${h} because it already exists and the ifAlreadyInstalled option was set to ${s}`)}m&&await writeFiles$1(n,h,t.files,{rmRoot:!0})}return d=!!l,("activate"in i?i.activate:!0)&&await activateTheme(n,{themeFolderName:g},a),("importStarterContent"in i?i.importStarterContent:!1)&&await importThemeStarterContent(n,{themeSlug:g},a),{assetPath:l,installationStatus:c}}catch(f){if(o==="skip-theme"){const g=p()||"unknown theme";return logger.warn(`Skipping theme installation for ${g} after failure: ${f instanceof Error?f.message:String(f)}`),d?{assetPath:l,installationStatus:c}:void 0}throw f}},login=async(n,{username:t="admin"}={},r)=>{r?.tracker.setCaption(r?.initialCaption||"Logging in"),n.defineConstant("PLAYGROUND_AUTO_LOGIN_AS_USER",t)},resetData=async(n,t,r)=>{r?.tracker?.setCaption("Resetting WordPress data");const s=await n.documentRoot,i=new Set(t.contentTypes??[]),a=t.contentTypes===void 0,o=[i.has("posts")?"post":void 0,i.has("pages")?"page":void 0].filter(c=>c!==void 0),l=a||i.has("posts"),u=i.has("comments");await n.run({env:{DOCROOT:s,PLAYGROUND_RESET_ALL_POST_TYPES:a?"1":"0",PLAYGROUND_RESET_POST_TYPES:JSON.stringify(o),PLAYGROUND_RESET_POSTS:l?"1":"0",PLAYGROUND_RESET_COMMENTS:a||u?"1":"0"},code:`<?php
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
		`})},runWpInstallationWizard=async(n,{options:t})=>{await n.request({url:"/wp-admin/install.php?step=2",method:"POST",body:{language:"en",prefix:"wp_",weblog_title:"My WordPress Website",user_name:t.adminPassword||"admin",admin_password:t.adminPassword||"password",admin_password2:t.adminPassword||"password",Submit:"Install WordPress",pw_weak:"1",admin_email:"admin@localhost.com"}})},zipWpContent=async n=>{const t="/tmp/wordpress-playground.zip",r="/tmp/playground-export.json",s=await n.documentRoot,i=joinPaths(s,"wp-content"),a=await n.absoluteUrl;await n.writeFile(r,new TextEncoder().encode(JSON.stringify({formatVersion:2,siteUrl:a})));const o={[r]:"playground-export.json",[joinPaths(s,"wp-config.php")]:"wp-config.php"},l=(await getLegacyPlaygroundRuntimeWpContentPaths(n,i)).map(d=>joinPaths(i,d)),u=phpVars({zipPath:t,wpContentPath:i,documentRoot:s,excludedPaths:l,additionalPaths:o});await runPhpWithZipFunctions(n,`zipDir(${u.wpContentPath}, ${u.zipPath}, array(
			'exclude_paths' => ${u.excludedPaths},
			'zip_root'      => ${u.documentRoot},
			'additional_paths' => ${u.additionalPaths}
		));`);const c=await n.readFileAsBuffer(t);return n.unlink(t),n.unlink(r),c},zipFunctions=`<?php

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
`;async function runPhpWithZipFunctions(n,t){return await n.run({code:zipFunctions+t})}const getWordPressTranslationUrl=async(n,t)=>{const i=(await(await fetch(`https://api.wordpress.org/translations/core/1.0/?version=${n}`)).json()).translations.find(a=>a.language.toLowerCase()===t.toLowerCase());if(!i)throw new Error(`Failed to get ${t} translation package for WordPress ${n}.`);return i.package},setSiteLanguage=async(n,{language:t},r)=>{r?.tracker.setCaption(r?.initialCaption||"Translating");const s=await n.documentRoot;await n.defineConstant("WPLANG",t),await n.run({code:`<?php
		require_once ${phpVar(s)} . '/wp-load.php';
		update_option('WPLANG', ${phpVar(t)});
		`});const i=(await n.run({code:`<?php
			require '${s}/wp-includes/version.php';
			echo $wp_version;
		`})).text,a=[{url:await getWordPressTranslationUrl(i,t),type:"core"}],l=(await n.run({code:`<?php
		require_once('${s}/wp-load.php');
		require_once('${s}/wp-admin/includes/plugin.php');
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
		);`})).json;for(const{slug:f,version:g}of l)a.push({url:`https://downloads.wordpress.org/translation/plugin/${f}/${g}/${t}.zip`,type:"plugin"});const c=(await n.run({code:`<?php
		require_once('${s}/wp-load.php');
		require_once('${s}/wp-admin/includes/theme.php');
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
		);`})).json;for(const{slug:f,version:g}of c)a.push({url:`https://downloads.wordpress.org/translation/theme/${f}/${g}/${t}.zip`,type:"theme"});await n.isDir(`${s}/wp-content/languages/plugins`)||await n.mkdir(`${s}/wp-content/languages/plugins`),await n.isDir(`${s}/wp-content/languages/themes`)||await n.mkdir(`${s}/wp-content/languages/themes`);const d=new Semaphore({concurrency:5}),p=a.map(({url:f,type:g})=>d.run(async()=>{try{const y=await fetch(f);if(!y.ok)throw new Error(`Failed to download translations for ${g}: ${y.statusText}`);let _=`${s}/wp-content/languages`;g==="plugin"?_+="/plugins":g==="theme"&&(_+="/themes"),await unzipFile(n,new File([await y.arrayBuffer()],`${t}-${g}.zip`),_)}catch(y){if(g==="core")throw new Error(`Failed to download translations for WordPress. Please check if the language code ${t} is correct. You can find all available languages and translations on https://translate.wordpress.org/.`);logger.warn(`Error downloading translations for ${g}: ${y}`)}}));await Promise.all(p)};var allStepHandlers=Object.freeze({__proto__:null,activatePlugin,activateTheme,assertWpCli,cp,defaultWpCliPath,defaultWpCliResource,defineSiteUrl,defineWpConfigConsts,enableMultisite,exportWXR,importThemeStarterContent,importWordPressFiles,importWxr,installPlugin,installTheme,login,mkdir,mv,request,resetData,rm,rmdir,runPHP,runPHPWithOptions,runSql,runWpInstallationWizard,setSiteLanguage,setSiteOptions,unzip,updateUserMeta,wpCLI:wpCLI$1,writeFile,writeFiles,zipWpContent});const{wpCLI,...otherStepHandlers}=allStepHandlers;({...otherStepHandlers,importFile:otherStepHandlers.importWxr});async function assertBlueprintV2WordPressVersionCompatibility(n,t){const r=n.wordpressVersion;isV2WordPressVersionConstraint(r)&&(assertV2WordPressVersionConstraintSemantics(r),!isV2WordPressVersionWithinConstraints(t,r)&&throwV2WordPressVersionCompatibilityError(t,r))}function isV2WordPressVersionConstraint(n){return!n||typeof n!="object"?!1:"min"in n}function assertV2WordPressVersionConstraintSemantics(n){assertV2WordPressVersionConstraint(n),assertV2ComparableWordPressConstraintVersion("wordpressVersion.min",n.min),n.max&&assertV2ComparableWordPressConstraintVersion("wordpressVersion.max",n.max);const t=n.preferred;if(t&&t!=="latest"&&(assertV2ComparableWordPressConstraintVersion("wordpressVersion.preferred",t),!doesV2WordPressVersionExpressionSatisfyConstraints(t,n)))throw new Error(`Blueprint v2 preferred WordPress version "${t}" does not satisfy constraints ${JSON.stringify(n)}.`);if(!isV2WordPressVersionWithinConstraints(n.min,n))throw new Error(`Unsatisfiable Blueprint v2 WordPress version constraints ${JSON.stringify(n)}. The minimum version exceeds the maximum version.`)}function doesV2WordPressVersionExpressionSatisfyConstraints(n,t){const r=parseComparableWordPressVersion(n);if(!r)return!1;if(r.patchSpecified||r.suffix)return isV2WordPressVersionWithinConstraints(n,t);const s=parseComparableWordPressVersion(t.min),i=r.parts.slice(0,2),a=s.parts.slice(0,2);if(compareV2WordPressVersionBranches(i,a)<0)return!1;if(!t.max)return!0;const o=parseComparableWordPressVersion(t.max),l=o.parts.slice(0,2),u=compareV2WordPressVersionBranches(i,l);return u<0||u===0&&!o.suffix}function compareV2WordPressVersionBranches(n,t){for(let r=0;r<2;r++){const s=n[r]-t[r];if(s!==0)return s}return 0}function throwV2WordPressVersionCompatibilityError(n,t){throw new Error(`Installed WordPress version "${n}" does not satisfy Blueprint v2 wordpressVersion ${JSON.stringify(t)}.`)}function assertV2WordPressVersionConstraint(n){assertV2StringWordPressConstraintVersion("wordpressVersion.min",n.min),n.max!==void 0&&assertV2StringWordPressConstraintVersion("wordpressVersion.max",n.max),n.preferred!==void 0&&assertV2StringWordPressConstraintVersion("wordpressVersion.preferred",n.preferred)}function assertV2StringWordPressConstraintVersion(n,t){if(typeof t!="string")throw new Error(`Unsupported Blueprint v2 WordPress version constraint ${n} ${JSON.stringify(t)}. Use a version like 6.8, 6.8.1, 6.8-beta1, or 6.8-rc1.`)}function assertV2ComparableWordPressConstraintVersion(n,t){if(!isComparableWordPressVersion(t))throw new Error(`Unsupported Blueprint v2 WordPress version constraint ${n} "${t}". Use a version like 6.8, 6.8.1, 6.8-beta1, or 6.8-rc1.`)}function isV2WordPressVersionWithinConstraints(n,t){const r=parseComparableWordPressVersion(n),s=parseComparableWordPressVersion(t.min);if(!r||!s||compareWordPressVersions(n,t.min)<0)return!1;if(!t.max)return!0;const i=parseComparableWordPressVersion(t.max);return i?!i.patchSpecified&&!i.suffix&&r.parts[0]===i.parts[0]&&r.parts[1]===i.parts[1]?!0:compareWordPressVersions(n,t.max)<=0:!1}function compareWordPressVersions(n,t){const r=parseComparableWordPressVersion(n),s=parseComparableWordPressVersion(t);if(!r||!s)throw new Error(`Cannot compare WordPress versions "${n}" and "${t}".`);for(let i=0;i<r.parts.length;i++){const a=r.parts[i]-s.parts[i];if(a!==0)return a}return 0}function isComparableWordPressVersion(n){return parseComparableWordPressVersion(n)!==null}function parseComparableWordPressVersion(n){const t=n.match(/^(\d+)\.(\d+)(?:\.(\d+))?(?:-(beta|rc)(\d+))?$/i);if(!t)return null;const[,r,s,i,a,o="0"]=t,l=a?.toLowerCase(),u=l?l==="beta"?0:1:2;return{parts:[Number(r),Number(s),Number(i??"0"),u,Number(o)],patchSpecified:i!==void 0,suffix:l}}class WordPressFetchNetworkTransport{constructor(t){this.preloadedResponseCache=new Map,this.options=t||{}}async setEnabled(t,r){await defineWpConfigConsts(t,{consts:{USE_FETCH_FOR_REQUESTS:r}})}async setupMessageHandler(t){return await t.onMessage(async r=>{let s;try{s=JSON.parse(r)}catch{return""}const{type:i,data:a}=s;if(i!=="request")return"";const o=this.preloadedResponseCache.get(a.url);if(o){logger.info("Using cached response for:",a.url);const c=[];Object.entries(o.headers).forEach(([y,_])=>{c.push(y+": "+_)});const d=["HTTP/1.1 "+o.status+" "+o.statusText,...c].join(`\r
`)+`\r
\r
`,p=new TextEncoder().encode(d),f=new TextEncoder().encode(o.data),g=new Uint8Array(p.byteLength+f.byteLength);return g.set(p),g.set(f,p.byteLength),this.preloadedResponseCache.delete(a.url),g}a.headers?Array.isArray(a.headers)&&(a.headers=Object.fromEntries(a.headers)):a.headers={};const l=this.options?.corsProxyUrl,u=await t.absoluteUrl;return handleRequest(a,(c,d)=>fetchWithCorsProxy(c,d,l,u))})}async prefetchUpdateChecks(t){const r={},s=await t.onMessage(a=>{const o=JSON.parse(a);if(o.type==="parallelize_request"){const l=new URL(o.url);l.protocol="https:",r[l.toString()]={url:l.toString(),...o.request}}});return await t.run({code:`<?php
				require_once '/wordpress/wp-load.php';
				require_once '/wordpress/wp-admin/includes/misc.php';
				require_once '/wordpress/wp-admin/includes/dashboard.php';

				function _wppg_is_loopback_request( $url ) {
					$parsed_url_req  = wp_parse_url( $url );
					$parsed_site_url = wp_parse_url( site_url() );
					if ( ! is_array( $parsed_url_req ) || ! is_array( $parsed_site_url ) ) {
						return false;
					}

					if (
						! isset(
							$parsed_site_url['host'],
							$parsed_url_req['host'],
							$parsed_site_url['path'],
							$parsed_url_req['path']
						)
					) {
						return false;
					}

					$site_port =
						$parsed_site_url['port'] ??
						( ( $parsed_site_url['scheme'] ?? 'http' ) === 'https' ? 443 : 80 );
					$req_port =
						$parsed_url_req['port'] ??
						( ( $parsed_url_req['scheme'] ?? 'http' ) === 'https' ? 443 : 80 );

					return
						$parsed_site_url['host'] === $parsed_url_req['host'] &&
						$site_port === $req_port &&
						strpos( $parsed_url_req['path'], $parsed_site_url['path'] ) === 0;
				}

				add_filter('pre_http_request', function($pre, $r, $url) {
					/**
					 * Prevent self-loopback requests to avoid
					 * PHP workers being occupied by internal
					 * requests rather than user-initiated ones.
					 *
					 * The most common cause is WordPress cron
					 * spawning loopback requests, though rare
					 * cases can include self-invoked REST API
					 * calls or dynamic asset rendering.
					 *
					 * Plugins may schedule cron jobs aggressively
					 * i.e. in the past or for immediate execution,
					 * causing such loopback requests at this
					 * stage in the lifecycle.
					 *
					 * To ensure user interactions are prioritized,
					 * we block loopback requests that could
					 * otherwise consume available PHP workers.
					 */
					if ( _wppg_is_loopback_request( $url ) ) {
						return new WP_Error(
							'http_request_block',
							'Loopback requests are not to be pre-fetched'
						);
					}

					post_message_to_js(json_encode([
						'type' => 'parallelize_request',
						'url' => $url,
						'request' => $r
					]));
					return new WP_Error( 'http_request_block', __( "This request is not allowed", "textdomain" ) );
				}, 10, 3);

				// Set the user agent header required by wp_check_browser_version()
				$_SERVER['HTTP_USER_AGENT'] = getenv('HTTP_USER_AGENT');

				// Store which transients existed before we start
				$browser_transient_key = 'browser_' . md5(getenv('HTTP_USER_AGENT'));
				$php_transient_key = 'php_check_' . md5(PHP_VERSION);
				$existing_transients = [
					'browser' => get_site_transient($browser_transient_key) !== false,
					'php_check' => get_site_transient($php_transient_key) !== false,
					'update_plugins' => get_site_transient('update_plugins') !== false,
					'update_themes' => get_site_transient('update_themes') !== false,
					'update_core' => get_site_transient('update_core') !== false,
				];

				if (!$existing_transients['browser']) {
					wp_check_browser_version();
					delete_site_transient($browser_transient_key);
				}

				if (!$existing_transients['php_check']) {
					wp_check_php_version();
					delete_site_transient($php_transient_key);
				}

				// Set up custom error handler to suppress specific WordPress.org connection warnings:
				// * wp_update_plugins(): An unexpected error occurred. Something may be wrong with WordPress.org or this server&#8217;s configuration. If you continue to have problems, please try the <a href="https://wordpress.org/support/forums/">support forums</a>. (WordPress could not establish a secure connection to WordPress.org. Please contact your server administrator.) in /wordpress/wp-includes/functions.php on line 135
				// * wp_update_themes(): An unexpected error occurred. Something may be wrong with WordPress.org or this server&#8217;s configuration. If you continue to have problems, please try the <a href="https://wordpress.org/support/forums/">support forums</a>. (WordPress could not establish a secure connection to WordPress.org. Please contact your server administrator.) in /wordpress/wp-includes/functions.php on line 135
				// * wp_version_check(): An unexpected error occurred. Something may be wrong with WordPress.org or this server&#8217;s configuration. If you continue to have problems, please try the <a href="https://wordpress.org/support/forums/">support forums</a>. (WordPress could not establish a secure connection to WordPress.org. Please contact your server administrator.) in /wordpress/wp-includes/functions.php on line 135
				$previous_error_handler = set_error_handler(function($errno, $errstr, $errfile, $errline) {
					global $previous_error_handler;
					if (
						strpos($errstr, 'WordPress could not establish a secure connection to WordPress.org') !== false ||
						strpos($errstr, 'An unexpected error occurred. Something may be wrong with WordPress.org') !== false
					) {
						return true;
					}
					// For all other errors, use the previous error handler or default behavior
					if ($previous_error_handler) {
						return call_user_func($previous_error_handler, $errno, $errstr, $errfile, $errline);
					}
					return false; // Use default error handling
				});

				if (!$existing_transients['update_plugins']) {
					wp_update_plugins();
					delete_site_transient('update_plugins');
				}

				if (!$existing_transients['update_themes']) {
					wp_update_themes();
					delete_site_transient('update_themes');
				}

				if (!$existing_transients['update_core']) {
					wp_version_check();
					delete_site_transient('update_core');
				}
			`,env:{HTTP_USER_AGENT:navigator.userAgent}}),await s(),logger.info(`Intercepted ${Object.keys(r).length} admin requests for pre-fetching`),Object.values(r).map(async a=>{const o=a?.method||"GET";let l,u=!1;o!=="GET"&&a?.body&&(typeof a.body=="object"&&!(a.body instanceof FormData)?(l=new URLSearchParams(a.body).toString(),u=!0):l=a.body);const d={...Array.isArray(a?.headers)?Object.fromEntries(a.headers):a?.headers||{}};u&&(d["Content-Type"]="application/x-www-form-urlencoded;charset=UTF-8");const p={method:o,headers:d,body:l};try{const f=await fetch(a.url,p),g=await f.text(),y={};f.headers.forEach((h,m)=>{y[m]=h});const _={url:a.url,status:f.status,statusText:f.statusText,headers:y,data:g};return this.preloadedResponseCache.set(a.url,_),_}catch(f){return logger.warn(`Failed to pre-fetch admin request: ${a.url}`,f),null}})}}async function handleRequest(n,t=fetch){const r=n.method||"GET",s=n.headers||{},i=Object.keys(s).some(f=>f.toLowerCase()==="content-type");r=="POST"&&!i&&(s["Content-Type"]="application/x-www-form-urlencoded");const a=t(n.url,{method:r,headers:s,body:r==="GET"?void 0:n.data,credentials:"omit"});if(n.blocking===!1)return a.catch(f=>{logger.warn("Non-blocking request failed:",f)}),new TextEncoder().encode(`HTTP/1.1 200 OK\r
\r
`);let o;try{o=await a}catch{return new TextEncoder().encode(`HTTP/1.1 400 Invalid Request\r
content-type: text/plain\r
\r
Playground could not serve the request.`)}const l=[];o.headers.forEach((f,g)=>{l.push(g+": "+f)});const u=["HTTP/1.1 "+o.status+" "+o.statusText,...l].join(`\r
`)+`\r
\r
`,c=new TextEncoder().encode(u),d=new Uint8Array(await o.arrayBuffer()),p=new Uint8Array(c.byteLength+d.byteLength);return p.set(c),p.set(d,c.byteLength),p}let activeRequestHandler;const WITH_ADMIN_TRANSITIONS_PARAM="with-admin-transitions";class PlaygroundWorkerEndpoint extends PHPWorker{constructor(t){super(void 0,t),this.booted=!1,this.unmounts=createNullPrototypeRecord(),this.opfsMounts=createNullPrototypeRecord(),this.emails=[],this.emailParsingQueue=Promise.resolve(),this.downloadMonitor=t,this.addEventListener("sendmail.spawned",r=>{const{stdin:s}=r;this.emailParsingQueue=this.emailParsingQueue.then(async()=>{try{this.emails.push(await PostalMime.parse(s))}catch(i){logger.error("Failed to parse captured email",i)}})})}computeSiteUrl(t){return setURLScope(wordPressSiteUrl,t).toString()}async createRequestHandler({siteUrl:t,sapiName:r,corsProxyUrl:s,knownRemoteAssetPaths:i,extensions:a,withNetworking:o,phpVersion:l,pathAliases:u,onProgress:c}){const d={"openssl.cafile":"/internal/shared/ca-bundle.crt","curl.cainfo":"/internal/shared/ca-bundle.crt"};let p,f="";if(o){c?.("Preparing network transport"),this.networkTransport=new WordPressFetchNetworkTransport({corsProxyUrl:s}),c?.("Generating networking certificate");const m=await generateCertificate({subject:{commonName:"WordPressPlaygroundCA",organizationName:"WordPressPlaygroundCA",countryName:"US"},basicConstraints:{ca:!0}});f=certificateToPEM(m.certificate),p={CAroot:m,corsProxyUrl:s}}else c?.("Disabling network transport"),d.allow_url_fopen="0",d.disable_functions=(d.disable_functions??"").split(",").concat(networkingDisabledFunctions).filter(m=>m).join(",");const g=new URL(t),y=isLegacyPHPVersion(l);c?.("Creating PHP request handler");const _=await bootRequestHandler({siteUrl:t,phpVersion:l,createPhpRuntime:async()=>{let m="",w=0;return c?.("Loading PHP runtime module"),await loadWebRuntime(l,{extensions:a,tcpOverFetch:p,onPhpLoaderModuleLoaded:T=>{m=T.dependencyFilename,w=T.dependenciesTotalSize,c?.("Preparing PHP runtime download"),this.downloadMonitor.expectAssets({[m]:w})},emscriptenOptions:{instantiateWasm:async(T,E)=>{c?.(await hasCachedResponse(m)?"Loading cached PHP runtime":"Downloading PHP runtime");const b=await this.downloadMonitor.monitorFetch(fetchWithInMemoryResume(m,{credentials:"same-origin"},{expectedTotal:w,onResume:A=>c?.(`Resuming PHP runtime download at ${formatBytes(A)}`)}));c?.("Streaming and compiling PHP runtime");const S=await WebAssembly.instantiateStreaming(b,T);return c?.("Attaching PHP runtime"),E(S.instance,S.module),{}}}})},onPHPInstanceCreated:async(m,{isPrimary:w})=>{if(m.setCommandSpawnHandler("sendmail",sendmailSpawnHandler(m)),this.registerWorkerListeners(m),c?.(w?"Creating primary PHP instance":"Creating secondary PHP instance"),!w){const E=["/tmp",_.documentRoot,"/internal/shared","/internal/symlinks","/tools"].filter(b=>!isPathToSharedFS(m,b));await proxyFileSystem(await _.getPrimaryPhp(),m,E)}o&&(c?.("Setting up PHP network transport"),await this.networkTransport.setupMessageHandler(m))},spawnHandler:sandboxedSpawnHandlerFactory,sapiName:r,phpIniEntries:d,pathAliases:u,createFiles:{"/internal/shared/ca-bundle.crt":f,"/internal/shared/mu-plugins":{...viewTransitionsWorkaroundMuPlugin(),"1-playground-web.php":y?playgroundWebMuPluginPhp52:playgroundWebMuPlugin,"playground-includes":{"wp_http_dummy.php":transportDummy,"wp_http_fetch.php":transportFetch}}},getFileNotFoundAction(m){const w=g.pathname.length>0&&m.startsWith(g.pathname)?m.substring(g.pathname.length):m;return i.has(w)?{type:"response",response:new PHPResponse(404,{"x-backfill-from":["remote-host"],"x-file-type":["static"]},new TextEncoder().encode("404 File not found"))}:getFileNotFoundActionForWordPress()}});c?.("Connecting primary PHP runtime");const h=await _.getPrimaryPhp();return h.requestHandler??=_,await this.setPrimaryPHP(h),this.__internal_setRequestHandler(_),this.requestHandler=_,activeRequestHandler=_,_}async finalizeAfterBoot(t,r,s){const i=await t.getPrimaryPhp();i.requestHandler??=t,this.requestHandler=t,activeRequestHandler=t,r&&await this.networkTransport.setEnabled(i,!0),this.loadedWordPressVersion=await getLoadedWordPressVersion(t),this.requestedWordPressVersion!==this.loadedWordPressVersion&&logger.warn(`Loaded WordPress version (${this.loadedWordPressVersion}) differs from requested version (${this.requestedWordPressVersion}).`);const a=wpVersionToStaticAssetsDirectory(this.loadedWordPressVersion),o=joinPaths(t.documentRoot,"wordpress-remote-asset-paths");if(a!==void 0&&!i.fileExists(o)){const l=new URL(joinPaths(a,"wordpress-remote-asset-paths"),wordPressSiteUrl);try{const u=await fetch(l).then(c=>c.text());i.writeFile(o,u)}catch{logger.warn(`Failed to fetch remote asset paths from ${l}`)}}i.isFile(o)&&i.readFileAsText(o).split(`
`).forEach(u=>s.add(joinPaths("/",u))),this.__internal_setRequestHandler(t)}getRequestHandler(t=!0){const r=super.getRequestHandler(!1)??this.requestHandler??activeRequestHandler;if(r||!t)return r;throw new Error("Playground worker is not connected to a request handler.")}async getWordPressModuleDetails(){return{majorVersion:this.loadedWordPressVersion||this.requestedWordPressVersion,staticAssetsDirectory:this.loadedWordPressVersion?wpVersionToStaticAssetsDirectory(this.loadedWordPressVersion):void 0}}async getMinifiedWordPressVersions(){return{all:MinifiedWordPressVersions,latest:LatestMinifiedWordPressVersion}}async email(){return await this.emailParsingQueue,this.emails}async hasOpfsMount(t){return hasOwnProperty(this.opfsMounts,t)}async mountOpfs(t,r){const s=this.__internal_getPHP();await this.mountOpfsIntoPhp(s,t,r)}async flushOpfs(t){const r=this.opfsMounts[t];if(r===void 0)throw new Error(`No OPFS mount found at "${t}".`);await r.flush()}async unmountOpfs(t){const r=this.unmounts[t];if(this.opfsMounts[t]===void 0||r===void 0)throw new Error(`No OPFS mount found at "${t}".`);let s=!1;try{await r()}catch(i){throw i instanceof MountStillActiveError?(s=!0,i.cause):i}finally{s||(delete this.unmounts[t],delete this.opfsMounts[t])}}async backfillStaticFilesRemovedFromMinifiedBuild(){await backfillStaticFilesRemovedFromMinifiedBuild(this.__internal_getPHP())}async hasCachedStaticFilesRemovedFromMinifiedBuild(){return await hasCachedStaticFilesRemovedFromMinifiedBuild(this.__internal_getPHP())}async prefetchUpdateChecks(){const t=this.__internal_getPHP();await this.networkTransport.prefetchUpdateChecks(t)}async journalFSEvents(t,r){return journalFSEvents(this.__internal_getPHP(),t,r)}async replayFSJournal(t){return replayFSJournal(this.__internal_getPHP(),t)}async mountOpfsIntoPhp(t,r,s){if(hasOwnProperty(this.opfsMounts,r.mountpoint)||hasOwnProperty(this.unmounts,r.mountpoint))throw new Error(`OPFS mount already exists at "${r.mountpoint}".`);const i=await directoryHandleFromMountDevice(r.device);let a;const o=createDirectoryHandleMountHandler(i,{initialSync:{onProgress:s,direction:r.initialSyncDirection},onMount:u=>{a=u}}),l=await t.mount(r.mountpoint,async(...u)=>{delete this.opfsMounts[r.mountpoint],a=void 0;try{const c=await o(...u);return a!==void 0&&(this.opfsMounts[r.mountpoint]=a),c}catch(c){throw delete this.unmounts[r.mountpoint],c}});if(a===void 0){try{await l()}catch(u){logger.error(u)}throw new Error(`Could not create an OPFS mount at "${r.mountpoint}".`)}this.unmounts[r.mountpoint]=l}}function viewTransitionsWorkaroundMuPlugin(){const n=new URL(globalThis.location.href).searchParams.has(WITH_ADMIN_TRANSITIONS_PARAM),t=globalThis.navigator,r=t?t.userAgentData?.brands:void 0,s=r?r.some(({brand:i})=>["Chromium","Google Chrome","Microsoft Edge","Opera"].includes(i)):/\b(?:Chrome|Chromium|Edg|OPR)\//.test(t?.userAgent||"");return n||!s?{}:{"0-playground-chrome-view-transitions-workaround.php":`<?php
/**
 * Disable view transitions in Google Chrome until
 * https://issues.chromium.org/issues/530704642 is resolved.
 *
 * @see https://github.com/WordPress/wordpress-playground/issues/3845.
 */
function playground_remove_admin_view_transitions_for_chrome_crash() {
	remove_action( 'admin_print_styles', 'playground_enable_view_transitions', 0 );
}
add_action( 'admin_print_styles', 'playground_remove_admin_view_transitions_for_chrome_crash', -1 );

function playground_dequeue_admin_view_transitions_for_chrome_crash() {
	if ( ! function_exists( 'wp_dequeue_style' ) || ! function_exists( 'wp_deregister_style' ) ) {
		return;
	}

	wp_dequeue_style( 'wp-view-transitions-admin' );
	wp_deregister_style( 'wp-view-transitions-admin' );
}
add_action( 'admin_enqueue_scripts', 'playground_dequeue_admin_view_transitions_for_chrome_crash', PHP_INT_MAX );
`}}async function fetchWithInMemoryResume(n,t,r){const s=r.stallTimeoutMs??15e3,i=r.maxRetries??10,a=await fetchRuntimeChunk(n,t,0),o=new Headers(a.response.headers);o.set("content-length",`${r.expectedTotal}`);const l={status:a.response.status,statusText:a.response.statusText,headers:o},u=new ReadableStream({async start(f){let g=0,y=0,_=a;for(;g<r.expectedTotal;){const h=_.response.body?.getReader();if(!h){f.error(new Error("PHP runtime response has no body"));return}try{for(;;){const{done:m,value:w}=await readWithTimeout(h,s,_.abort);if(m)break;w&&(g+=w.byteLength,y=0,f.enqueue(w))}}catch(m){if(g>=r.expectedTotal)break;if(++y>i){f.error(m);return}r.onResume?.(g),_=await fetchRuntimeChunk(n,t,g);continue}if(g>=r.expectedTotal)break;if(++y>i){f.error(new Error(`PHP runtime download ended early at ${g} bytes`));return}r.onResume?.(g),_=await fetchRuntimeChunk(n,t,g)}f.close()}}),[c,d]=u.tee(),p=new Response(c,l);return putCachedResponse(new Request(n,t),new Response(d,l)).catch(f=>logger.warn("Failed to cache PHP runtime response",f)),Object.defineProperty(p,"url",{value:n}),p}async function fetchRuntimeChunk(n,t,r){const s=new AbortController,i=new Headers(t.headers);r>0&&i.set("range",`bytes=${r}-`);const a=await fetch(n,{...t,headers:i,signal:s.signal});if(r>0&&a.status!==206)throw new Error(`Cannot resume PHP runtime download because the server returned HTTP ${a.status}`);if(r===0&&!a.ok)throw new Error(`Failed to download PHP runtime: HTTP ${a.status}`);return{response:a,abort:()=>s.abort()}}function readWithTimeout(n,t,r){let s;return Promise.race([n.read(),new Promise((i,a)=>{s=setTimeout(()=>{r(),a(new Error("PHP runtime download stalled"))},t)})]).finally(()=>{s&&clearTimeout(s)})}function createNullPrototypeRecord(){return Object.create(null)}function hasOwnProperty(n,t){return Object.prototype.hasOwnProperty.call(n,t)}const corsProxyUrl="https://wordpress-playground-cors-proxy.net/?";self.postMessage("worker-script-started");const downloadMonitor=new EmscriptenDownloadMonitor;class ArtifactExpiredError extends Error{constructor(t="GitHub artifact expired"){super(t),this.name="ArtifactExpiredError"}}class ResourceUnavailableError extends Error{constructor(t){super(t),this.name="ResourceUnavailableError"}}class PlaygroundWorkerEndpointBlueprints extends PlaygroundWorkerEndpoint{async boot({scope:t,mounts:r=[],wpVersion:s=LatestMinifiedWordPressVersion,wordPressZip:i,sqliteDriverVersion:a=LatestSqliteDriverVersion,phpVersion:o,sapiName:l="cli",extensions:u=[],withNetworking:c=!0,shouldInstallWordPress:d,wordpressInstallMode:p,blueprint:f,corsProxyUrl:g,pathAliases:y}){if(this.booted)throw new Error("Playground already booted");g===void 0&&(g=corsProxyUrl),this.booted=!0,this.scope=t;try{const _=this,h=new Set,m=p??(d===!1?"install-from-existing-files-if-needed":"download-and-install"),w=this.computeSiteUrl(t),T=C=>{this.dispatchEvent({type:"boot.progress",caption:C})};T("Creating Playground request handler");const E=await this.createRequestHandler({siteUrl:w,sapiName:l,corsProxyUrl:g,knownRemoteAssetPaths:h,extensions:u,withNetworking:c,phpVersion:o,pathAliases:y,onProgress:T});this.requestedWordPressVersion=s==="nightly"?"trunk":s;const b=MinifiedWordPressVersionsList.includes(this.requestedWordPressVersion);s=b?this.requestedWordPressVersion:LatestMinifiedWordPressVersion;const S=getWordPressModuleDetails(s);let A=null,v;if(m==="download-and-install"&&!i)if(T("Preparing WordPress download"),this.requestedWordPressVersion.startsWith("http"))A=this.downloadMonitor.monitorFetch(fetch(this.requestedWordPressVersion)).then(C=>{if(C.ok)return C;let O=null;return C.json().then(F=>{throw O=F,O&&O.error==="artifact_expired"?new ArtifactExpiredError:new Error(`Failed to download WordPress ZIP (HTTP ${C.status})`)},()=>{throw new Error(`Failed to download WordPress ZIP (HTTP ${C.status})`)})});else if(!b&&/^\d+\.\d+(?:\.\d+)?(?:-(?:beta|rc)\d+)?$/i.test(this.requestedWordPressVersion)){const C=normalizeWordPressVersion(this.requestedWordPressVersion),O=`https://wordpress.org/wordpress-${C}.zip`,F=g?`${g}${O}`:O;A=this.downloadMonitor.monitorFetch(fetch(F)).then(I=>{if(!I.ok)throw I.status===404?new ResourceUnavailableError(`WordPress ${C} is not available for download.`):new Error(`Failed to download WordPress ${C} (HTTP ${I.status})`);return I})}else{const C=maybeProxyUrl(S.url,g);this.downloadMonitor.expectAssets({[C]:S.size}),v=S.format==="tar.zst"?S.fileCount:void 0,A=this.downloadMonitor.monitorFetch(fetch(C))}if(m==="do-not-attempt-installing"){T("Creating PHP runtime");const C=await E.getPrimaryPhp();for(const O of r)T("Mounting WordPress files"),await _.mountOpfsIntoPhp(C,O);this.__internal_setRequestHandler(E),T("PHP runtime ready"),setApiReady();return}const x=isLegacyPHPVersion(o),D=getSqliteDriverModuleDetails(x?"v3.0.0-rc.3-php52":a);this.downloadMonitor.expectAssets({[D.url]:D.size}),T("Preparing SQLite integration download");const H=this.downloadMonitor.monitorFetch(fetch(D.url));T("Booting WordPress"),await bootWordPress(E,{siteUrl:w,phpVersion:o,constants:m==="download-and-install"?{WP_DEBUG:!x,WP_DEBUG_LOG:!0,WP_DEBUG_DISPLAY:!1,AUTH_KEY:randomString(40),SECURE_AUTH_KEY:randomString(40),LOGGED_IN_KEY:randomString(40),NONCE_KEY:randomString(40),AUTH_SALT:randomString(40),SECURE_AUTH_SALT:randomString(40),LOGGED_IN_SALT:randomString(40),NONCE_SALT:randomString(40)}:{},wordpressInstallMode:m,wordPressZip:i??A?.then(C=>C.arrayBuffer()).then(C=>new File([C],"wp.bundle")),wordPressBundleFileCount:v,sqliteIntegrationPluginZip:H.then(C=>C.arrayBuffer()).then(C=>new File([C],"sqlite.zip")),hooks:{async beforeWordPressFiles(C){for(const O of r)await _.mountOpfsIntoPhp(C,O);if(f?.version===2&&(m==="install-from-existing-files"||m==="install-from-existing-files-if-needed")&&C.fileExists("/wordpress/wp-includes/version.php")){const O=await C.run({code:`<?php
									require '/wordpress/wp-includes/version.php';
									echo $wp_version;
								`});await assertBlueprintV2WordPressVersionCompatibility(f,O.text.trim())}}},onProgress:T}),T("Finalizing WordPress runtime"),await this.finalizeAfterBoot(E,c,h),T("WordPress runtime ready"),setApiReady()}catch(_){throw setAPIError(_),_}}}const workerGlobal=self,alreadyExposedComlinkEndpoint=workerGlobal.__playgroundWorkerEndpointBlueprints;if(alreadyExposedComlinkEndpoint)throw new Error("The Blueprints Playground worker tried to expose its Comlink endpoint more than once in the same worker global. This usually means the worker entrypoint was imported as a dependency. Worker entrypoints must not be imported; move shared code into a side-effect-free module instead.");workerGlobal.__playgroundWorkerEndpointBlueprints=!0;const[setApiReady,setAPIError]=exposeAPI(new PlaygroundWorkerEndpointBlueprints(downloadMonitor));function normalizeWordPressVersion(n){const t={"0.7":"0.71-gold","0.71":"0.71-gold","1.0":"1.0.2","1.2":"1.2.2","1.5":"1.5.2"},r=n.replace(/^(\d+\.\d+)\.0$/,"$1").replace(/-rc(\d+)$/i,"-RC$1");return t[r]??r}function maybeProxyUrl(n,t){return!t||!n.startsWith("https://github.com/WordPress/WordPress/archive/")?n:`${t}${n}`}
//# sourceMappingURL=playground-worker-endpoint-blueprints-Lj5VcG1F.js.map
