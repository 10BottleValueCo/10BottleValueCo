const __tbv_import_meta_url = require('node:url').pathToFileURL(__filename).href;
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// ../wordpress-preview-2026-10-22/runtime/tooling/node_modules/@php-wasm/logger/index.cjs
var require_logger = __commonJS({
  "../wordpress-preview-2026-10-22/runtime/tooling/node_modules/@php-wasm/logger/index.cjs"(exports2) {
    "use strict";
    Object.defineProperty(exports2, Symbol.toStringTag, { value: "Module" });
    var h3 = "playground-log";
    var d2 = (e, ...r) => {
      L3.dispatchEvent(new CustomEvent(h3, { detail: { log: e, args: r } }));
    };
    var p2 = (e, ...r) => {
      switch (typeof e.message == "string" ? Reflect.set(e, "message", l(e.message)) : e.message.message && typeof e.message.message == "string" && Reflect.set(e.message, "message", l(e.message.message)), e.severity) {
        case o.Debug:
          console.debug(e.message, ...r);
          break;
        case o.Info:
          console.info(e.message, ...r);
          break;
        case o.Warn:
          console.warn(e.message, ...r);
          break;
        case o.Error:
          console.error(e.message, ...r);
          break;
        case o.Fatal:
          console.error(e.message, ...r);
          break;
        default:
          console.log(e.message, ...r);
      }
    };
    var M2 = (e) => e instanceof Error ? [e.message, e.stack].join(`
`) : JSON.stringify(e, null, 2);
    var g2 = [];
    var m3 = (e) => {
      g2.push(e);
    };
    var i = (e) => {
      if (e.raw === true) m3(e.message);
      else {
        const r = E5(typeof e.message == "object" ? M2(e.message) : e.message, e.severity, e.prefix ?? n.JS);
        m3(r);
      }
    };
    var P4 = () => {
      g2.length = 0;
    };
    var f = "/wordpress/wp-content/debug.log";
    var T2 = async (e) => await e.fileExists(f) ? await e.readFileAsText(f) : "";
    var S3 = (e, r) => {
      let t = "";
      r.addEventListener("request.end", async () => {
        const s = await T2(r), a2 = s.startsWith(t) ? s.substring(t.length) : s;
        t = s, a2 && e.logMessage({ message: a2, severity: o.Log, raw: true });
      }), r.addEventListener("request.error", (s) => {
        s = s, s.error && (e.logMessage({ message: `${s.error.message} ${s.error.stack}`, severity: o.Fatal, prefix: s.source === "request" ? n.PHP : n.WASM }), e.dispatchEvent(new CustomEvent(e.fatalErrorEvent, { detail: { logs: e.getLogs(), source: s.source } })));
      });
    };
    var o = { Fatal: { name: "fatal", level: 0 }, Error: { name: "error", level: 1 }, Warn: { name: "warn", level: 2 }, Log: { name: "log", level: 3 }, Info: { name: "info", level: 4 }, Debug: { name: "debug", level: 5 } };
    var n = { WASM: "Wasm Crash", PHP: "PHP", JS: "JavaScript" };
    var v3 = class extends EventTarget {
      constructor(r = []) {
        super(), this.fatalErrorEvent = "playground-fatal-error", this.severity = o.Info, this.handlers = r;
      }
      getLogs() {
        return this.handlers.includes(i) ? [...g2] : (this.error(`Logs aren't stored because the logToMemory handler isn't registered.
				If you're using a custom logger instance, make sure to register logToMemory handler.
			`), []);
      }
      logMessage(r, ...t) {
        const s = { ...r, severity: r.severity ?? o.Log };
        for (const a2 of this.handlers) s.severity.level <= this.severity.level && a2(s, ...t);
      }
      setSeverityFilterLevel(r) {
        this.severity = r;
      }
      log(r, ...t) {
        this.logMessage({ message: r, severity: o.Log, prefix: n.JS, raw: false }, ...t);
      }
      debug(r, ...t) {
        this.logMessage({ message: r, severity: o.Debug, prefix: n.JS, raw: false }, ...t);
      }
      info(r, ...t) {
        this.logMessage({ message: r, severity: o.Info, prefix: n.JS, raw: false }, ...t);
      }
      warn(r, ...t) {
        this.logMessage({ message: r, severity: o.Warn, prefix: n.JS, raw: false }, ...t);
      }
      error(r, ...t) {
        this.logMessage({ message: r, severity: o.Error, prefix: n.JS, raw: false }, ...t);
      }
    };
    var W4 = () => {
      try {
        if (process.env.NODE_ENV === "test") return [i, d2];
      } catch {
      }
      return [i, p2, d2];
    };
    var L3 = new v3(W4());
    var l = (e) => e.replace(/\t/g, "");
    var E5 = (e, r, t) => {
      const s = /* @__PURE__ */ new Date(), a2 = new Intl.DateTimeFormat("en-GB", { year: "numeric", month: "short", day: "2-digit", timeZone: "UTC" }).format(s).replace(/ /g, "-"), w4 = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false, timeZone: "UTC", timeZoneName: "short" }).format(s), b3 = a2 + " " + w4;
      return e = l(e), `[${b3}] ${t} ${r.name}: ${e}`;
    };
    var O3 = (e, r) => {
      e.addEventListener(e.fatalErrorEvent, r);
    };
    var k2 = (e, r) => {
      e.logMessage({ message: `${r.message} in ${r.filename} on line ${r.lineno}:${r.colno}`, severity: o.Error });
    };
    var u2 = (e, r) => {
      if (!(r != null && r.reason)) return;
      const t = (r == null ? void 0 : r.reason.stack) ?? r.reason;
      e.logMessage({ message: t, severity: o.Error });
    };
    var c3 = 0;
    var x3 = (e) => {
      navigator.serviceWorker.addEventListener("message", (r) => {
        var t, s, a2;
        ((t = r.data) == null ? void 0 : t.numberOfOpenPlaygroundTabs) !== void 0 && c3 !== ((s = r.data) == null ? void 0 : s.numberOfOpenPlaygroundTabs) && (c3 = (a2 = r.data) == null ? void 0 : a2.numberOfOpenPlaygroundTabs, e.debug(`Number of open Playground tabs is: ${c3}`));
      });
    };
    var y4 = false;
    var $2 = (e) => {
      y4 || (x3(e), !(typeof window > "u") && (window.addEventListener("error", (r) => k2(e, r)), window.addEventListener("unhandledrejection", (r) => u2(e, r)), window.addEventListener("rejectionhandled", (r) => u2(e, r)), y4 = true));
    };
    var C3 = (e) => {
      e.addEventListener("activate", () => {
        e.clients.matchAll().then((r) => {
          const t = { numberOfOpenPlaygroundTabs: r.filter((s) => s.frameType === "top-level").length };
          for (const s of r) s.postMessage(t);
        });
      });
    };
    exports2.LogPrefix = n;
    exports2.LogSeverity = o;
    exports2.Logger = v3;
    exports2.addCrashListener = O3;
    exports2.clearMemoryLogs = P4;
    exports2.collectPhpLogs = S3;
    exports2.collectWindowErrors = $2;
    exports2.errorLogPath = f;
    exports2.formatLogEntry = E5;
    exports2.logEvent = d2;
    exports2.logEventType = h3;
    exports2.logToConsole = p2;
    exports2.logToMemory = i;
    exports2.logger = L3;
    exports2.logs = g2;
    exports2.prepareLogMessage = l;
    exports2.reportServiceWorkerMetrics = C3;
  }
});

// ../wordpress-preview-2026-10-22/runtime/tooling/node_modules/ini/lib/ini.js
var require_ini = __commonJS({
  "../wordpress-preview-2026-10-22/runtime/tooling/node_modules/ini/lib/ini.js"(exports2, module2) {
    var { hasOwnProperty } = Object.prototype;
    var encode = (obj, opt = {}) => {
      if (typeof opt === "string") {
        opt = { section: opt };
      }
      opt.align = opt.align === true;
      opt.newline = opt.newline === true;
      opt.sort = opt.sort === true;
      opt.whitespace = opt.whitespace === true || opt.align === true;
      opt.platform = opt.platform || typeof process !== "undefined" && process.platform;
      opt.bracketedArray = opt.bracketedArray !== false;
      const eol2 = opt.platform === "win32" ? "\r\n" : "\n";
      const separator = opt.whitespace ? " = " : "=";
      const children = [];
      const keys = opt.sort ? Object.keys(obj).sort() : Object.keys(obj);
      let padToChars = 0;
      if (opt.align) {
        padToChars = safe(
          keys.filter((k2) => obj[k2] === null || Array.isArray(obj[k2]) || typeof obj[k2] !== "object").map((k2) => Array.isArray(obj[k2]) ? `${k2}[]` : k2).concat([""]).reduce((a2, b3) => safe(a2).length >= safe(b3).length ? a2 : b3)
        ).length;
      }
      let out = "";
      const arraySuffix = opt.bracketedArray ? "[]" : "";
      for (const k2 of keys) {
        const val = obj[k2];
        if (val && Array.isArray(val)) {
          for (const item of val) {
            out += safe(`${k2}${arraySuffix}`).padEnd(padToChars, " ") + separator + safe(item) + eol2;
          }
        } else if (val && typeof val === "object") {
          children.push(k2);
        } else {
          out += safe(k2).padEnd(padToChars, " ") + separator + safe(val) + eol2;
        }
      }
      if (opt.section && out.length) {
        out = "[" + safe(opt.section) + "]" + (opt.newline ? eol2 + eol2 : eol2) + out;
      }
      for (const k2 of children) {
        const nk = splitSections(k2, ".").join("\\.");
        const section = (opt.section ? opt.section + "." : "") + nk;
        const child = encode(obj[k2], {
          ...opt,
          section
        });
        if (out.length && child.length) {
          out += eol2;
        }
        out += child;
      }
      return out;
    };
    function splitSections(str, separator) {
      var lastMatchIndex = 0;
      var lastSeparatorIndex = 0;
      var nextIndex = 0;
      var sections = [];
      do {
        nextIndex = str.indexOf(separator, lastMatchIndex);
        if (nextIndex !== -1) {
          lastMatchIndex = nextIndex + separator.length;
          if (nextIndex > 0 && str[nextIndex - 1] === "\\") {
            continue;
          }
          sections.push(str.slice(lastSeparatorIndex, nextIndex));
          lastSeparatorIndex = nextIndex + separator.length;
        }
      } while (nextIndex !== -1);
      sections.push(str.slice(lastSeparatorIndex));
      return sections;
    }
    var decode = (str, opt = {}) => {
      opt.bracketedArray = opt.bracketedArray !== false;
      const out = /* @__PURE__ */ Object.create(null);
      let p2 = out;
      let section = null;
      const re3 = /^\[([^\]]*)\]\s*$|^([^=]+)(=(.*))?$/i;
      const lines = str.split(/[\r\n]+/g);
      const duplicates = {};
      for (const line of lines) {
        if (!line || line.match(/^\s*[;#]/) || line.match(/^\s*$/)) {
          continue;
        }
        const match = line.match(re3);
        if (!match) {
          continue;
        }
        if (match[1] !== void 0) {
          section = unsafe(match[1]);
          if (section === "__proto__") {
            p2 = /* @__PURE__ */ Object.create(null);
            continue;
          }
          p2 = out[section] = out[section] || /* @__PURE__ */ Object.create(null);
          continue;
        }
        const keyRaw = unsafe(match[2]);
        let isArray;
        if (opt.bracketedArray) {
          isArray = keyRaw.length > 2 && keyRaw.slice(-2) === "[]";
        } else {
          duplicates[keyRaw] = (duplicates?.[keyRaw] || 0) + 1;
          isArray = duplicates[keyRaw] > 1;
        }
        const key = isArray ? keyRaw.slice(0, -2) : keyRaw;
        if (key === "__proto__") {
          continue;
        }
        const valueRaw = match[3] ? unsafe(match[4]) : true;
        const value = valueRaw === "true" || valueRaw === "false" || valueRaw === "null" ? JSON.parse(valueRaw) : valueRaw;
        if (isArray) {
          if (!hasOwnProperty.call(p2, key)) {
            p2[key] = [];
          } else if (!Array.isArray(p2[key])) {
            p2[key] = [p2[key]];
          }
        }
        if (Array.isArray(p2[key])) {
          p2[key].push(value);
        } else {
          p2[key] = value;
        }
      }
      const remove = [];
      for (const k2 of Object.keys(out)) {
        if (!hasOwnProperty.call(out, k2) || typeof out[k2] !== "object" || Array.isArray(out[k2])) {
          continue;
        }
        const parts = splitSections(k2, ".");
        p2 = out;
        const l = parts.pop();
        const nl = l.replace(/\\\./g, ".");
        for (const part of parts) {
          if (part === "__proto__") {
            continue;
          }
          if (!hasOwnProperty.call(p2, part) || typeof p2[part] !== "object") {
            p2[part] = /* @__PURE__ */ Object.create(null);
          }
          p2 = p2[part];
        }
        if (p2 === out && nl === l) {
          continue;
        }
        p2[nl] = out[k2];
        remove.push(k2);
      }
      for (const del of remove) {
        delete out[del];
      }
      return out;
    };
    var isQuoted = (val) => {
      return val.startsWith('"') && val.endsWith('"') || val.startsWith("'") && val.endsWith("'");
    };
    var safe = (val) => {
      if (typeof val !== "string" || val.match(/[=\r\n]/) || val.match(/^\[/) || val.length > 1 && isQuoted(val) || val !== val.trim()) {
        return JSON.stringify(val);
      }
      return val.split(";").join("\\;").split("#").join("\\#");
    };
    var unsafe = (val) => {
      val = (val || "").trim();
      if (isQuoted(val)) {
        if (val.charAt(0) === "'") {
          val = val.slice(1, -1);
        }
        try {
          val = JSON.parse(val);
        } catch {
        }
      } else {
        let esc = false;
        let unesc = "";
        for (let i = 0, l = val.length; i < l; i++) {
          const c3 = val.charAt(i);
          if (esc) {
            if ("\\;#".indexOf(c3) !== -1) {
              unesc += c3;
            } else {
              unesc += "\\" + c3;
            }
            esc = false;
          } else if (";#".indexOf(c3) !== -1) {
            break;
          } else if (c3 === "\\") {
            esc = true;
          } else {
            unesc += c3;
          }
        }
        if (esc) {
          unesc += "\\";
        }
        return unesc.trim();
      }
      return val;
    };
    module2.exports = {
      parse: decode,
      decode,
      stringify: encode,
      encode,
      safe,
      unsafe
    };
  }
});

// ../wordpress-preview-2026-10-22/runtime/tooling/node_modules/ws/lib/constants.js
var require_constants = __commonJS({
  "../wordpress-preview-2026-10-22/runtime/tooling/node_modules/ws/lib/constants.js"(exports2, module2) {
    "use strict";
    var BINARY_TYPES = ["nodebuffer", "arraybuffer", "fragments"];
    var hasBlob = typeof Blob !== "undefined";
    if (hasBlob) BINARY_TYPES.push("blob");
    module2.exports = {
      BINARY_TYPES,
      CLOSE_TIMEOUT: 3e4,
      EMPTY_BUFFER: Buffer.alloc(0),
      GUID: "258EAFA5-E914-47DA-95CA-C5AB0DC85B11",
      hasBlob,
      kForOnEventAttribute: Symbol("kIsForOnEventAttribute"),
      kListener: Symbol("kListener"),
      kStatusCode: Symbol("status-code"),
      kWebSocket: Symbol("websocket"),
      NOOP: () => {
      }
    };
  }
});

// ../wordpress-preview-2026-10-22/runtime/tooling/node_modules/ws/lib/buffer-util.js
var require_buffer_util = __commonJS({
  "../wordpress-preview-2026-10-22/runtime/tooling/node_modules/ws/lib/buffer-util.js"(exports2, module2) {
    "use strict";
    var { EMPTY_BUFFER } = require_constants();
    var FastBuffer = Buffer[Symbol.species];
    function concat(list2, totalLength) {
      if (list2.length === 0) return EMPTY_BUFFER;
      if (list2.length === 1) return list2[0];
      const target = Buffer.allocUnsafe(totalLength);
      let offset = 0;
      for (let i = 0; i < list2.length; i++) {
        const buf = list2[i];
        target.set(buf, offset);
        offset += buf.length;
      }
      if (offset < totalLength) {
        return new FastBuffer(target.buffer, target.byteOffset, offset);
      }
      return target;
    }
    function _mask(source, mask, output, offset, length) {
      for (let i = 0; i < length; i++) {
        output[offset + i] = source[i] ^ mask[i & 3];
      }
    }
    function _unmask(buffer, mask) {
      for (let i = 0; i < buffer.length; i++) {
        buffer[i] ^= mask[i & 3];
      }
    }
    function toArrayBuffer(buf) {
      if (buf.length === buf.buffer.byteLength) {
        return buf.buffer;
      }
      return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length);
    }
    function toBuffer(data2) {
      toBuffer.readOnly = true;
      if (Buffer.isBuffer(data2)) return data2;
      let buf;
      if (data2 instanceof ArrayBuffer) {
        buf = new FastBuffer(data2);
      } else if (ArrayBuffer.isView(data2)) {
        buf = new FastBuffer(data2.buffer, data2.byteOffset, data2.byteLength);
      } else {
        buf = Buffer.from(data2);
        toBuffer.readOnly = false;
      }
      return buf;
    }
    module2.exports = {
      concat,
      mask: _mask,
      toArrayBuffer,
      toBuffer,
      unmask: _unmask
    };
    if (!process.env.WS_NO_BUFFER_UTIL) {
      try {
        const bufferUtil = require("bufferutil");
        module2.exports.mask = function(source, mask, output, offset, length) {
          if (length < 48) _mask(source, mask, output, offset, length);
          else bufferUtil.mask(source, mask, output, offset, length);
        };
        module2.exports.unmask = function(buffer, mask) {
          if (buffer.length < 32) _unmask(buffer, mask);
          else bufferUtil.unmask(buffer, mask);
        };
      } catch (e) {
      }
    }
  }
});

// ../wordpress-preview-2026-10-22/runtime/tooling/node_modules/ws/lib/limiter.js
var require_limiter = __commonJS({
  "../wordpress-preview-2026-10-22/runtime/tooling/node_modules/ws/lib/limiter.js"(exports2, module2) {
    "use strict";
    var kDone = Symbol("kDone");
    var kRun = Symbol("kRun");
    var Limiter = class {
      /**
       * Creates a new `Limiter`.
       *
       * @param {Number} [concurrency=Infinity] The maximum number of jobs allowed
       *     to run concurrently
       */
      constructor(concurrency) {
        this[kDone] = () => {
          this.pending--;
          this[kRun]();
        };
        this.concurrency = concurrency || Infinity;
        this.jobs = [];
        this.pending = 0;
      }
      /**
       * Adds a job to the queue.
       *
       * @param {Function} job The job to run
       * @public
       */
      add(job) {
        this.jobs.push(job);
        this[kRun]();
      }
      /**
       * Removes a job from the queue and runs it if possible.
       *
       * @private
       */
      [kRun]() {
        if (this.pending === this.concurrency) return;
        if (this.jobs.length) {
          const job = this.jobs.shift();
          this.pending++;
          job(this[kDone]);
        }
      }
    };
    module2.exports = Limiter;
  }
});

// ../wordpress-preview-2026-10-22/runtime/tooling/node_modules/ws/lib/permessage-deflate.js
var require_permessage_deflate = __commonJS({
  "../wordpress-preview-2026-10-22/runtime/tooling/node_modules/ws/lib/permessage-deflate.js"(exports2, module2) {
    "use strict";
    var zlib = require("zlib");
    var bufferUtil = require_buffer_util();
    var Limiter = require_limiter();
    var { kStatusCode } = require_constants();
    var FastBuffer = Buffer[Symbol.species];
    var TRAILER = Buffer.from([0, 0, 255, 255]);
    var kPerMessageDeflate = Symbol("permessage-deflate");
    var kTotalLength = Symbol("total-length");
    var kCallback = Symbol("callback");
    var kBuffers = Symbol("buffers");
    var kError2 = Symbol("error");
    var zlibLimiter;
    var PerMessageDeflate2 = class {
      /**
       * Creates a PerMessageDeflate instance.
       *
       * @param {Object} [options] Configuration options
       * @param {(Boolean|Number)} [options.clientMaxWindowBits] Advertise support
       *     for, or request, a custom client window size
       * @param {Boolean} [options.clientNoContextTakeover=false] Advertise/
       *     acknowledge disabling of client context takeover
       * @param {Number} [options.concurrencyLimit=10] The number of concurrent
       *     calls to zlib
       * @param {Boolean} [options.isServer=false] Create the instance in either
       *     server or client mode
       * @param {Number} [options.maxPayload=0] The maximum allowed message length
       * @param {(Boolean|Number)} [options.serverMaxWindowBits] Request/confirm the
       *     use of a custom server window size
       * @param {Boolean} [options.serverNoContextTakeover=false] Request/accept
       *     disabling of server context takeover
       * @param {Number} [options.threshold=1024] Size (in bytes) below which
       *     messages should not be compressed if context takeover is disabled
       * @param {Object} [options.zlibDeflateOptions] Options to pass to zlib on
       *     deflate
       * @param {Object} [options.zlibInflateOptions] Options to pass to zlib on
       *     inflate
       */
      constructor(options) {
        this._options = options || {};
        this._threshold = this._options.threshold !== void 0 ? this._options.threshold : 1024;
        this._maxPayload = this._options.maxPayload | 0;
        this._isServer = !!this._options.isServer;
        this._deflate = null;
        this._inflate = null;
        this.params = null;
        if (!zlibLimiter) {
          const concurrency = this._options.concurrencyLimit !== void 0 ? this._options.concurrencyLimit : 10;
          zlibLimiter = new Limiter(concurrency);
        }
      }
      /**
       * @type {String}
       */
      static get extensionName() {
        return "permessage-deflate";
      }
      /**
       * Create an extension negotiation offer.
       *
       * @return {Object} Extension parameters
       * @public
       */
      offer() {
        const params = {};
        if (this._options.serverNoContextTakeover) {
          params.server_no_context_takeover = true;
        }
        if (this._options.clientNoContextTakeover) {
          params.client_no_context_takeover = true;
        }
        if (this._options.serverMaxWindowBits) {
          params.server_max_window_bits = this._options.serverMaxWindowBits;
        }
        if (this._options.clientMaxWindowBits) {
          params.client_max_window_bits = this._options.clientMaxWindowBits;
        } else if (this._options.clientMaxWindowBits == null) {
          params.client_max_window_bits = true;
        }
        return params;
      }
      /**
       * Accept an extension negotiation offer/response.
       *
       * @param {Array} configurations The extension negotiation offers/reponse
       * @return {Object} Accepted configuration
       * @public
       */
      accept(configurations) {
        configurations = this.normalizeParams(configurations);
        this.params = this._isServer ? this.acceptAsServer(configurations) : this.acceptAsClient(configurations);
        return this.params;
      }
      /**
       * Releases all resources used by the extension.
       *
       * @public
       */
      cleanup() {
        if (this._inflate) {
          this._inflate.close();
          this._inflate = null;
        }
        if (this._deflate) {
          const callback = this._deflate[kCallback];
          this._deflate.close();
          this._deflate = null;
          if (callback) {
            callback(
              new Error(
                "The deflate stream was closed while data was being processed"
              )
            );
          }
        }
      }
      /**
       *  Accept an extension negotiation offer.
       *
       * @param {Array} offers The extension negotiation offers
       * @return {Object} Accepted configuration
       * @private
       */
      acceptAsServer(offers) {
        const opts = this._options;
        const accepted = offers.find((params) => {
          if (opts.serverNoContextTakeover === false && params.server_no_context_takeover || params.server_max_window_bits && (opts.serverMaxWindowBits === false || typeof opts.serverMaxWindowBits === "number" && opts.serverMaxWindowBits > params.server_max_window_bits) || typeof opts.clientMaxWindowBits === "number" && !params.client_max_window_bits) {
            return false;
          }
          return true;
        });
        if (!accepted) {
          throw new Error("None of the extension offers can be accepted");
        }
        if (opts.serverNoContextTakeover) {
          accepted.server_no_context_takeover = true;
        }
        if (opts.clientNoContextTakeover) {
          accepted.client_no_context_takeover = true;
        }
        if (typeof opts.serverMaxWindowBits === "number") {
          accepted.server_max_window_bits = opts.serverMaxWindowBits;
        }
        if (typeof opts.clientMaxWindowBits === "number") {
          accepted.client_max_window_bits = opts.clientMaxWindowBits;
        } else if (accepted.client_max_window_bits === true || opts.clientMaxWindowBits === false) {
          delete accepted.client_max_window_bits;
        }
        return accepted;
      }
      /**
       * Accept the extension negotiation response.
       *
       * @param {Array} response The extension negotiation response
       * @return {Object} Accepted configuration
       * @private
       */
      acceptAsClient(response) {
        const params = response[0];
        if (this._options.clientNoContextTakeover === false && params.client_no_context_takeover) {
          throw new Error('Unexpected parameter "client_no_context_takeover"');
        }
        if (!params.client_max_window_bits) {
          if (typeof this._options.clientMaxWindowBits === "number") {
            params.client_max_window_bits = this._options.clientMaxWindowBits;
          }
        } else if (this._options.clientMaxWindowBits === false || typeof this._options.clientMaxWindowBits === "number" && params.client_max_window_bits > this._options.clientMaxWindowBits) {
          throw new Error(
            'Unexpected or invalid parameter "client_max_window_bits"'
          );
        }
        return params;
      }
      /**
       * Normalize parameters.
       *
       * @param {Array} configurations The extension negotiation offers/reponse
       * @return {Array} The offers/response with normalized parameters
       * @private
       */
      normalizeParams(configurations) {
        configurations.forEach((params) => {
          Object.keys(params).forEach((key) => {
            let value = params[key];
            if (value.length > 1) {
              throw new Error(`Parameter "${key}" must have only a single value`);
            }
            value = value[0];
            if (key === "client_max_window_bits") {
              if (value !== true) {
                const num = +value;
                if (!Number.isInteger(num) || num < 8 || num > 15) {
                  throw new TypeError(
                    `Invalid value for parameter "${key}": ${value}`
                  );
                }
                value = num;
              } else if (!this._isServer) {
                throw new TypeError(
                  `Invalid value for parameter "${key}": ${value}`
                );
              }
            } else if (key === "server_max_window_bits") {
              const num = +value;
              if (!Number.isInteger(num) || num < 8 || num > 15) {
                throw new TypeError(
                  `Invalid value for parameter "${key}": ${value}`
                );
              }
              value = num;
            } else if (key === "client_no_context_takeover" || key === "server_no_context_takeover") {
              if (value !== true) {
                throw new TypeError(
                  `Invalid value for parameter "${key}": ${value}`
                );
              }
            } else {
              throw new Error(`Unknown parameter "${key}"`);
            }
            params[key] = value;
          });
        });
        return configurations;
      }
      /**
       * Decompress data. Concurrency limited.
       *
       * @param {Buffer} data Compressed data
       * @param {Boolean} fin Specifies whether or not this is the last fragment
       * @param {Function} callback Callback
       * @public
       */
      decompress(data2, fin, callback) {
        zlibLimiter.add((done) => {
          this._decompress(data2, fin, (err, result) => {
            done();
            callback(err, result);
          });
        });
      }
      /**
       * Compress data. Concurrency limited.
       *
       * @param {(Buffer|String)} data Data to compress
       * @param {Boolean} fin Specifies whether or not this is the last fragment
       * @param {Function} callback Callback
       * @public
       */
      compress(data2, fin, callback) {
        zlibLimiter.add((done) => {
          this._compress(data2, fin, (err, result) => {
            done();
            callback(err, result);
          });
        });
      }
      /**
       * Decompress data.
       *
       * @param {Buffer} data Compressed data
       * @param {Boolean} fin Specifies whether or not this is the last fragment
       * @param {Function} callback Callback
       * @private
       */
      _decompress(data2, fin, callback) {
        const endpoint = this._isServer ? "client" : "server";
        if (!this._inflate) {
          const key = `${endpoint}_max_window_bits`;
          const windowBits = typeof this.params[key] !== "number" ? zlib.Z_DEFAULT_WINDOWBITS : this.params[key];
          this._inflate = zlib.createInflateRaw({
            ...this._options.zlibInflateOptions,
            windowBits
          });
          this._inflate[kPerMessageDeflate] = this;
          this._inflate[kTotalLength] = 0;
          this._inflate[kBuffers] = [];
          this._inflate.on("error", inflateOnError);
          this._inflate.on("data", inflateOnData);
        }
        this._inflate[kCallback] = callback;
        this._inflate.write(data2);
        if (fin) this._inflate.write(TRAILER);
        this._inflate.flush(() => {
          const err = this._inflate[kError2];
          if (err) {
            this._inflate.close();
            this._inflate = null;
            callback(err);
            return;
          }
          const data3 = bufferUtil.concat(
            this._inflate[kBuffers],
            this._inflate[kTotalLength]
          );
          if (this._inflate._readableState.endEmitted) {
            this._inflate.close();
            this._inflate = null;
          } else {
            this._inflate[kTotalLength] = 0;
            this._inflate[kBuffers] = [];
            if (fin && this.params[`${endpoint}_no_context_takeover`]) {
              this._inflate.reset();
            }
          }
          callback(null, data3);
        });
      }
      /**
       * Compress data.
       *
       * @param {(Buffer|String)} data Data to compress
       * @param {Boolean} fin Specifies whether or not this is the last fragment
       * @param {Function} callback Callback
       * @private
       */
      _compress(data2, fin, callback) {
        const endpoint = this._isServer ? "server" : "client";
        if (!this._deflate) {
          const key = `${endpoint}_max_window_bits`;
          const windowBits = typeof this.params[key] !== "number" ? zlib.Z_DEFAULT_WINDOWBITS : this.params[key];
          this._deflate = zlib.createDeflateRaw({
            ...this._options.zlibDeflateOptions,
            windowBits
          });
          this._deflate[kTotalLength] = 0;
          this._deflate[kBuffers] = [];
          this._deflate.on("data", deflateOnData);
        }
        this._deflate[kCallback] = callback;
        this._deflate.write(data2);
        this._deflate.flush(zlib.Z_SYNC_FLUSH, () => {
          if (!this._deflate) {
            return;
          }
          let data3 = bufferUtil.concat(
            this._deflate[kBuffers],
            this._deflate[kTotalLength]
          );
          if (fin) {
            data3 = new FastBuffer(data3.buffer, data3.byteOffset, data3.length - 4);
          }
          this._deflate[kCallback] = null;
          this._deflate[kTotalLength] = 0;
          this._deflate[kBuffers] = [];
          if (fin && this.params[`${endpoint}_no_context_takeover`]) {
            this._deflate.reset();
          }
          callback(null, data3);
        });
      }
    };
    module2.exports = PerMessageDeflate2;
    function deflateOnData(chunk) {
      this[kBuffers].push(chunk);
      this[kTotalLength] += chunk.length;
    }
    function inflateOnData(chunk) {
      this[kTotalLength] += chunk.length;
      if (this[kPerMessageDeflate]._maxPayload < 1 || this[kTotalLength] <= this[kPerMessageDeflate]._maxPayload) {
        this[kBuffers].push(chunk);
        return;
      }
      this[kError2] = new RangeError("Max payload size exceeded");
      this[kError2].code = "WS_ERR_UNSUPPORTED_MESSAGE_LENGTH";
      this[kError2][kStatusCode] = 1009;
      this.removeListener("data", inflateOnData);
      this.reset();
    }
    function inflateOnError(err) {
      this[kPerMessageDeflate]._inflate = null;
      if (this[kError2]) {
        this[kCallback](this[kError2]);
        return;
      }
      err[kStatusCode] = 1007;
      this[kCallback](err);
    }
  }
});

// ../wordpress-preview-2026-10-22/runtime/tooling/node_modules/ws/lib/validation.js
var require_validation = __commonJS({
  "../wordpress-preview-2026-10-22/runtime/tooling/node_modules/ws/lib/validation.js"(exports2, module2) {
    "use strict";
    var { isUtf8 } = require("buffer");
    var { hasBlob } = require_constants();
    var tokenChars = [
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      // 0 - 15
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      // 16 - 31
      0,
      1,
      0,
      1,
      1,
      1,
      1,
      1,
      0,
      0,
      1,
      1,
      0,
      1,
      1,
      0,
      // 32 - 47
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      0,
      0,
      0,
      0,
      0,
      0,
      // 48 - 63
      0,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      // 64 - 79
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      0,
      0,
      0,
      1,
      1,
      // 80 - 95
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      // 96 - 111
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      0,
      1,
      0,
      1,
      0
      // 112 - 127
    ];
    function isValidStatusCode(code) {
      return code >= 1e3 && code <= 1014 && code !== 1004 && code !== 1005 && code !== 1006 || code >= 3e3 && code <= 4999;
    }
    function _isValidUTF8(buf) {
      const len = buf.length;
      let i = 0;
      while (i < len) {
        if ((buf[i] & 128) === 0) {
          i++;
        } else if ((buf[i] & 224) === 192) {
          if (i + 1 === len || (buf[i + 1] & 192) !== 128 || (buf[i] & 254) === 192) {
            return false;
          }
          i += 2;
        } else if ((buf[i] & 240) === 224) {
          if (i + 2 >= len || (buf[i + 1] & 192) !== 128 || (buf[i + 2] & 192) !== 128 || buf[i] === 224 && (buf[i + 1] & 224) === 128 || // Overlong
          buf[i] === 237 && (buf[i + 1] & 224) === 160) {
            return false;
          }
          i += 3;
        } else if ((buf[i] & 248) === 240) {
          if (i + 3 >= len || (buf[i + 1] & 192) !== 128 || (buf[i + 2] & 192) !== 128 || (buf[i + 3] & 192) !== 128 || buf[i] === 240 && (buf[i + 1] & 240) === 128 || // Overlong
          buf[i] === 244 && buf[i + 1] > 143 || buf[i] > 244) {
            return false;
          }
          i += 4;
        } else {
          return false;
        }
      }
      return true;
    }
    function isBlob(value) {
      return hasBlob && typeof value === "object" && typeof value.arrayBuffer === "function" && typeof value.type === "string" && typeof value.stream === "function" && (value[Symbol.toStringTag] === "Blob" || value[Symbol.toStringTag] === "File");
    }
    module2.exports = {
      isBlob,
      isValidStatusCode,
      isValidUTF8: _isValidUTF8,
      tokenChars
    };
    if (isUtf8) {
      module2.exports.isValidUTF8 = function(buf) {
        return buf.length < 24 ? _isValidUTF8(buf) : isUtf8(buf);
      };
    } else if (!process.env.WS_NO_UTF_8_VALIDATE) {
      try {
        const isValidUTF8 = require("utf-8-validate");
        module2.exports.isValidUTF8 = function(buf) {
          return buf.length < 32 ? _isValidUTF8(buf) : isValidUTF8(buf);
        };
      } catch (e) {
      }
    }
  }
});

// ../wordpress-preview-2026-10-22/runtime/tooling/node_modules/ws/lib/receiver.js
var require_receiver = __commonJS({
  "../wordpress-preview-2026-10-22/runtime/tooling/node_modules/ws/lib/receiver.js"(exports2, module2) {
    "use strict";
    var { Writable } = require("stream");
    var PerMessageDeflate2 = require_permessage_deflate();
    var {
      BINARY_TYPES,
      EMPTY_BUFFER,
      kStatusCode,
      kWebSocket
    } = require_constants();
    var { concat, toArrayBuffer, unmask } = require_buffer_util();
    var { isValidStatusCode, isValidUTF8 } = require_validation();
    var FastBuffer = Buffer[Symbol.species];
    var GET_INFO = 0;
    var GET_PAYLOAD_LENGTH_16 = 1;
    var GET_PAYLOAD_LENGTH_64 = 2;
    var GET_MASK = 3;
    var GET_DATA = 4;
    var INFLATING = 5;
    var DEFER_EVENT = 6;
    var Receiver2 = class extends Writable {
      /**
       * Creates a Receiver instance.
       *
       * @param {Object} [options] Options object
       * @param {Boolean} [options.allowSynchronousEvents=true] Specifies whether
       *     any of the `'message'`, `'ping'`, and `'pong'` events can be emitted
       *     multiple times in the same tick
       * @param {String} [options.binaryType=nodebuffer] The type for binary data
       * @param {Object} [options.extensions] An object containing the negotiated
       *     extensions
       * @param {Boolean} [options.isServer=false] Specifies whether to operate in
       *     client or server mode
       * @param {Number} [options.maxBufferedChunks=0] The maximum number of
       *     buffered data chunks
       * @param {Number} [options.maxFragments=0] The maximum number of message
       *     fragments
       * @param {Number} [options.maxPayload=0] The maximum allowed message length
       * @param {Boolean} [options.skipUTF8Validation=false] Specifies whether or
       *     not to skip UTF-8 validation for text and close messages
       */
      constructor(options = {}) {
        super();
        this._allowSynchronousEvents = options.allowSynchronousEvents !== void 0 ? options.allowSynchronousEvents : true;
        this._binaryType = options.binaryType || BINARY_TYPES[0];
        this._extensions = options.extensions || {};
        this._isServer = !!options.isServer;
        this._maxBufferedChunks = options.maxBufferedChunks | 0;
        this._maxFragments = options.maxFragments | 0;
        this._maxPayload = options.maxPayload | 0;
        this._skipUTF8Validation = !!options.skipUTF8Validation;
        this[kWebSocket] = void 0;
        this._bufferedBytes = 0;
        this._buffers = [];
        this._compressed = false;
        this._payloadLength = 0;
        this._mask = void 0;
        this._fragmented = 0;
        this._masked = false;
        this._fin = false;
        this._opcode = 0;
        this._totalPayloadLength = 0;
        this._messageLength = 0;
        this._fragments = [];
        this._errored = false;
        this._loop = false;
        this._state = GET_INFO;
      }
      /**
       * Implements `Writable.prototype._write()`.
       *
       * @param {Buffer} chunk The chunk of data to write
       * @param {String} encoding The character encoding of `chunk`
       * @param {Function} cb Callback
       * @private
       */
      _write(chunk, encoding, cb) {
        if (this._opcode === 8 && this._state == GET_INFO) return cb();
        if (this._maxBufferedChunks > 0 && this._buffers.length >= this._maxBufferedChunks) {
          cb(
            this.createError(
              RangeError,
              "Too many buffered chunks",
              false,
              1008,
              "WS_ERR_TOO_MANY_BUFFERED_PARTS"
            )
          );
          return;
        }
        this._bufferedBytes += chunk.length;
        this._buffers.push(chunk);
        this.startLoop(cb);
      }
      /**
       * Consumes `n` bytes from the buffered data.
       *
       * @param {Number} n The number of bytes to consume
       * @return {Buffer} The consumed bytes
       * @private
       */
      consume(n) {
        this._bufferedBytes -= n;
        if (n === this._buffers[0].length) return this._buffers.shift();
        if (n < this._buffers[0].length) {
          const buf = this._buffers[0];
          this._buffers[0] = new FastBuffer(
            buf.buffer,
            buf.byteOffset + n,
            buf.length - n
          );
          return new FastBuffer(buf.buffer, buf.byteOffset, n);
        }
        const dst = Buffer.allocUnsafe(n);
        do {
          const buf = this._buffers[0];
          const offset = dst.length - n;
          if (n >= buf.length) {
            dst.set(this._buffers.shift(), offset);
          } else {
            dst.set(new Uint8Array(buf.buffer, buf.byteOffset, n), offset);
            this._buffers[0] = new FastBuffer(
              buf.buffer,
              buf.byteOffset + n,
              buf.length - n
            );
          }
          n -= buf.length;
        } while (n > 0);
        return dst;
      }
      /**
       * Starts the parsing loop.
       *
       * @param {Function} cb Callback
       * @private
       */
      startLoop(cb) {
        this._loop = true;
        do {
          switch (this._state) {
            case GET_INFO:
              this.getInfo(cb);
              break;
            case GET_PAYLOAD_LENGTH_16:
              this.getPayloadLength16(cb);
              break;
            case GET_PAYLOAD_LENGTH_64:
              this.getPayloadLength64(cb);
              break;
            case GET_MASK:
              this.getMask();
              break;
            case GET_DATA:
              this.getData(cb);
              break;
            case INFLATING:
            case DEFER_EVENT:
              this._loop = false;
              return;
          }
        } while (this._loop);
        if (!this._errored) cb();
      }
      /**
       * Reads the first two bytes of a frame.
       *
       * @param {Function} cb Callback
       * @private
       */
      getInfo(cb) {
        if (this._bufferedBytes < 2) {
          this._loop = false;
          return;
        }
        const buf = this.consume(2);
        if ((buf[0] & 48) !== 0) {
          const error = this.createError(
            RangeError,
            "RSV2 and RSV3 must be clear",
            true,
            1002,
            "WS_ERR_UNEXPECTED_RSV_2_3"
          );
          cb(error);
          return;
        }
        const compressed = (buf[0] & 64) === 64;
        if (compressed && !this._extensions[PerMessageDeflate2.extensionName]) {
          const error = this.createError(
            RangeError,
            "RSV1 must be clear",
            true,
            1002,
            "WS_ERR_UNEXPECTED_RSV_1"
          );
          cb(error);
          return;
        }
        this._fin = (buf[0] & 128) === 128;
        this._opcode = buf[0] & 15;
        this._payloadLength = buf[1] & 127;
        if (this._opcode === 0) {
          if (compressed) {
            const error = this.createError(
              RangeError,
              "RSV1 must be clear",
              true,
              1002,
              "WS_ERR_UNEXPECTED_RSV_1"
            );
            cb(error);
            return;
          }
          if (!this._fragmented) {
            const error = this.createError(
              RangeError,
              "invalid opcode 0",
              true,
              1002,
              "WS_ERR_INVALID_OPCODE"
            );
            cb(error);
            return;
          }
          this._opcode = this._fragmented;
        } else if (this._opcode === 1 || this._opcode === 2) {
          if (this._fragmented) {
            const error = this.createError(
              RangeError,
              `invalid opcode ${this._opcode}`,
              true,
              1002,
              "WS_ERR_INVALID_OPCODE"
            );
            cb(error);
            return;
          }
          this._compressed = compressed;
        } else if (this._opcode > 7 && this._opcode < 11) {
          if (!this._fin) {
            const error = this.createError(
              RangeError,
              "FIN must be set",
              true,
              1002,
              "WS_ERR_EXPECTED_FIN"
            );
            cb(error);
            return;
          }
          if (compressed) {
            const error = this.createError(
              RangeError,
              "RSV1 must be clear",
              true,
              1002,
              "WS_ERR_UNEXPECTED_RSV_1"
            );
            cb(error);
            return;
          }
          if (this._payloadLength > 125 || this._opcode === 8 && this._payloadLength === 1) {
            const error = this.createError(
              RangeError,
              `invalid payload length ${this._payloadLength}`,
              true,
              1002,
              "WS_ERR_INVALID_CONTROL_PAYLOAD_LENGTH"
            );
            cb(error);
            return;
          }
        } else {
          const error = this.createError(
            RangeError,
            `invalid opcode ${this._opcode}`,
            true,
            1002,
            "WS_ERR_INVALID_OPCODE"
          );
          cb(error);
          return;
        }
        if (!this._fin && !this._fragmented) this._fragmented = this._opcode;
        this._masked = (buf[1] & 128) === 128;
        if (this._isServer) {
          if (!this._masked) {
            const error = this.createError(
              RangeError,
              "MASK must be set",
              true,
              1002,
              "WS_ERR_EXPECTED_MASK"
            );
            cb(error);
            return;
          }
        } else if (this._masked) {
          const error = this.createError(
            RangeError,
            "MASK must be clear",
            true,
            1002,
            "WS_ERR_UNEXPECTED_MASK"
          );
          cb(error);
          return;
        }
        if (this._payloadLength === 126) this._state = GET_PAYLOAD_LENGTH_16;
        else if (this._payloadLength === 127) this._state = GET_PAYLOAD_LENGTH_64;
        else this.haveLength(cb);
      }
      /**
       * Gets extended payload length (7+16).
       *
       * @param {Function} cb Callback
       * @private
       */
      getPayloadLength16(cb) {
        if (this._bufferedBytes < 2) {
          this._loop = false;
          return;
        }
        this._payloadLength = this.consume(2).readUInt16BE(0);
        this.haveLength(cb);
      }
      /**
       * Gets extended payload length (7+64).
       *
       * @param {Function} cb Callback
       * @private
       */
      getPayloadLength64(cb) {
        if (this._bufferedBytes < 8) {
          this._loop = false;
          return;
        }
        const buf = this.consume(8);
        const num = buf.readUInt32BE(0);
        if (num > Math.pow(2, 53 - 32) - 1) {
          const error = this.createError(
            RangeError,
            "Unsupported WebSocket frame: payload length > 2^53 - 1",
            false,
            1009,
            "WS_ERR_UNSUPPORTED_DATA_PAYLOAD_LENGTH"
          );
          cb(error);
          return;
        }
        this._payloadLength = num * Math.pow(2, 32) + buf.readUInt32BE(4);
        this.haveLength(cb);
      }
      /**
       * Payload length has been read.
       *
       * @param {Function} cb Callback
       * @private
       */
      haveLength(cb) {
        if (this._payloadLength && this._opcode < 8) {
          this._totalPayloadLength += this._payloadLength;
          if (this._totalPayloadLength > this._maxPayload && this._maxPayload > 0) {
            const error = this.createError(
              RangeError,
              "Max payload size exceeded",
              false,
              1009,
              "WS_ERR_UNSUPPORTED_MESSAGE_LENGTH"
            );
            cb(error);
            return;
          }
        }
        if (this._masked) this._state = GET_MASK;
        else this._state = GET_DATA;
      }
      /**
       * Reads mask bytes.
       *
       * @private
       */
      getMask() {
        if (this._bufferedBytes < 4) {
          this._loop = false;
          return;
        }
        this._mask = this.consume(4);
        this._state = GET_DATA;
      }
      /**
       * Reads data bytes.
       *
       * @param {Function} cb Callback
       * @private
       */
      getData(cb) {
        let data2 = EMPTY_BUFFER;
        if (this._payloadLength) {
          if (this._bufferedBytes < this._payloadLength) {
            this._loop = false;
            return;
          }
          data2 = this.consume(this._payloadLength);
          if (this._masked && (this._mask[0] | this._mask[1] | this._mask[2] | this._mask[3]) !== 0) {
            unmask(data2, this._mask);
          }
        }
        if (this._opcode > 7) {
          this.controlMessage(data2, cb);
          return;
        }
        if (this._compressed) {
          this._state = INFLATING;
          this.decompress(data2, cb);
          return;
        }
        if (data2.length) {
          if (this._maxFragments > 0 && this._fragments.length >= this._maxFragments) {
            const error = this.createError(
              RangeError,
              "Too many message fragments",
              false,
              1008,
              "WS_ERR_TOO_MANY_BUFFERED_PARTS"
            );
            cb(error);
            return;
          }
          this._messageLength = this._totalPayloadLength;
          this._fragments.push(data2);
        }
        this.dataMessage(cb);
      }
      /**
       * Decompresses data.
       *
       * @param {Buffer} data Compressed data
       * @param {Function} cb Callback
       * @private
       */
      decompress(data2, cb) {
        const perMessageDeflate = this._extensions[PerMessageDeflate2.extensionName];
        perMessageDeflate.decompress(data2, this._fin, (err, buf) => {
          if (err) return cb(err);
          if (buf.length) {
            this._messageLength += buf.length;
            if (this._messageLength > this._maxPayload && this._maxPayload > 0) {
              const error = this.createError(
                RangeError,
                "Max payload size exceeded",
                false,
                1009,
                "WS_ERR_UNSUPPORTED_MESSAGE_LENGTH"
              );
              cb(error);
              return;
            }
            if (this._maxFragments > 0 && this._fragments.length >= this._maxFragments) {
              const error = this.createError(
                RangeError,
                "Too many message fragments",
                false,
                1008,
                "WS_ERR_TOO_MANY_BUFFERED_PARTS"
              );
              cb(error);
              return;
            }
            this._fragments.push(buf);
          }
          this.dataMessage(cb);
          if (this._state === GET_INFO) this.startLoop(cb);
        });
      }
      /**
       * Handles a data message.
       *
       * @param {Function} cb Callback
       * @private
       */
      dataMessage(cb) {
        if (!this._fin) {
          this._state = GET_INFO;
          return;
        }
        const messageLength = this._messageLength;
        const fragments = this._fragments;
        this._totalPayloadLength = 0;
        this._messageLength = 0;
        this._fragmented = 0;
        this._fragments = [];
        if (this._opcode === 2) {
          let data2;
          if (this._binaryType === "nodebuffer") {
            data2 = concat(fragments, messageLength);
          } else if (this._binaryType === "arraybuffer") {
            data2 = toArrayBuffer(concat(fragments, messageLength));
          } else if (this._binaryType === "blob") {
            data2 = new Blob(fragments);
          } else {
            data2 = fragments;
          }
          if (this._allowSynchronousEvents) {
            this.emit("message", data2, true);
            this._state = GET_INFO;
          } else {
            this._state = DEFER_EVENT;
            setImmediate(() => {
              this.emit("message", data2, true);
              this._state = GET_INFO;
              this.startLoop(cb);
            });
          }
        } else {
          const buf = concat(fragments, messageLength);
          if (!this._skipUTF8Validation && !isValidUTF8(buf)) {
            const error = this.createError(
              Error,
              "invalid UTF-8 sequence",
              true,
              1007,
              "WS_ERR_INVALID_UTF8"
            );
            cb(error);
            return;
          }
          if (this._state === INFLATING || this._allowSynchronousEvents) {
            this.emit("message", buf, false);
            this._state = GET_INFO;
          } else {
            this._state = DEFER_EVENT;
            setImmediate(() => {
              this.emit("message", buf, false);
              this._state = GET_INFO;
              this.startLoop(cb);
            });
          }
        }
      }
      /**
       * Handles a control message.
       *
       * @param {Buffer} data Data to handle
       * @return {(Error|RangeError|undefined)} A possible error
       * @private
       */
      controlMessage(data2, cb) {
        if (this._opcode === 8) {
          if (data2.length === 0) {
            this._loop = false;
            this.emit("conclude", 1005, EMPTY_BUFFER);
            this.end();
          } else {
            const code = data2.readUInt16BE(0);
            if (!isValidStatusCode(code)) {
              const error = this.createError(
                RangeError,
                `invalid status code ${code}`,
                true,
                1002,
                "WS_ERR_INVALID_CLOSE_CODE"
              );
              cb(error);
              return;
            }
            const buf = new FastBuffer(
              data2.buffer,
              data2.byteOffset + 2,
              data2.length - 2
            );
            if (!this._skipUTF8Validation && !isValidUTF8(buf)) {
              const error = this.createError(
                Error,
                "invalid UTF-8 sequence",
                true,
                1007,
                "WS_ERR_INVALID_UTF8"
              );
              cb(error);
              return;
            }
            this._loop = false;
            this.emit("conclude", code, buf);
            this.end();
          }
          this._state = GET_INFO;
          return;
        }
        if (this._allowSynchronousEvents) {
          this.emit(this._opcode === 9 ? "ping" : "pong", data2);
          this._state = GET_INFO;
        } else {
          this._state = DEFER_EVENT;
          setImmediate(() => {
            this.emit(this._opcode === 9 ? "ping" : "pong", data2);
            this._state = GET_INFO;
            this.startLoop(cb);
          });
        }
      }
      /**
       * Builds an error object.
       *
       * @param {function(new:Error|RangeError)} ErrorCtor The error constructor
       * @param {String} message The error message
       * @param {Boolean} prefix Specifies whether or not to add a default prefix to
       *     `message`
       * @param {Number} statusCode The status code
       * @param {String} errorCode The exposed error code
       * @return {(Error|RangeError)} The error
       * @private
       */
      createError(ErrorCtor, message, prefix, statusCode, errorCode) {
        this._loop = false;
        this._errored = true;
        const err = new ErrorCtor(
          prefix ? `Invalid WebSocket frame: ${message}` : message
        );
        Error.captureStackTrace(err, this.createError);
        err.code = errorCode;
        err[kStatusCode] = statusCode;
        return err;
      }
    };
    module2.exports = Receiver2;
  }
});

// ../wordpress-preview-2026-10-22/runtime/tooling/node_modules/ws/lib/sender.js
var require_sender = __commonJS({
  "../wordpress-preview-2026-10-22/runtime/tooling/node_modules/ws/lib/sender.js"(exports2, module2) {
    "use strict";
    var { Duplex } = require("stream");
    var { randomFillSync } = require("crypto");
    var {
      types: { isUint8Array }
    } = require("util");
    var PerMessageDeflate2 = require_permessage_deflate();
    var { EMPTY_BUFFER, kWebSocket, NOOP } = require_constants();
    var { isBlob, isValidStatusCode } = require_validation();
    var { mask: applyMask, toBuffer } = require_buffer_util();
    var kByteLength = Symbol("kByteLength");
    var maskBuffer = Buffer.alloc(4);
    var RANDOM_POOL_SIZE = 8 * 1024;
    var randomPool;
    var randomPoolPointer = RANDOM_POOL_SIZE;
    var DEFAULT = 0;
    var DEFLATING = 1;
    var GET_BLOB_DATA = 2;
    var Sender2 = class _Sender {
      /**
       * Creates a Sender instance.
       *
       * @param {Duplex} socket The connection socket
       * @param {Object} [extensions] An object containing the negotiated extensions
       * @param {Function} [generateMask] The function used to generate the masking
       *     key
       */
      constructor(socket, extensions, generateMask) {
        this._extensions = extensions || {};
        if (generateMask) {
          this._generateMask = generateMask;
          this._maskBuffer = Buffer.alloc(4);
        }
        this._socket = socket;
        this._firstFragment = true;
        this._compress = false;
        this._bufferedBytes = 0;
        this._queue = [];
        this._state = DEFAULT;
        this.onerror = NOOP;
        this[kWebSocket] = void 0;
      }
      /**
       * Frames a piece of data according to the HyBi WebSocket protocol.
       *
       * @param {(Buffer|String)} data The data to frame
       * @param {Object} options Options object
       * @param {Boolean} [options.fin=false] Specifies whether or not to set the
       *     FIN bit
       * @param {Function} [options.generateMask] The function used to generate the
       *     masking key
       * @param {Boolean} [options.mask=false] Specifies whether or not to mask
       *     `data`
       * @param {Buffer} [options.maskBuffer] The buffer used to store the masking
       *     key
       * @param {Number} options.opcode The opcode
       * @param {Boolean} [options.readOnly=false] Specifies whether `data` can be
       *     modified
       * @param {Boolean} [options.rsv1=false] Specifies whether or not to set the
       *     RSV1 bit
       * @return {(Buffer|String)[]} The framed data
       * @public
       */
      static frame(data2, options) {
        let mask;
        let merge = false;
        let offset = 2;
        let skipMasking = false;
        if (options.mask) {
          mask = options.maskBuffer || maskBuffer;
          if (options.generateMask) {
            options.generateMask(mask);
          } else {
            if (randomPoolPointer === RANDOM_POOL_SIZE) {
              if (randomPool === void 0) {
                randomPool = Buffer.alloc(RANDOM_POOL_SIZE);
              }
              randomFillSync(randomPool, 0, RANDOM_POOL_SIZE);
              randomPoolPointer = 0;
            }
            mask[0] = randomPool[randomPoolPointer++];
            mask[1] = randomPool[randomPoolPointer++];
            mask[2] = randomPool[randomPoolPointer++];
            mask[3] = randomPool[randomPoolPointer++];
          }
          skipMasking = (mask[0] | mask[1] | mask[2] | mask[3]) === 0;
          offset = 6;
        }
        let dataLength;
        if (typeof data2 === "string") {
          if ((!options.mask || skipMasking) && options[kByteLength] !== void 0) {
            dataLength = options[kByteLength];
          } else {
            data2 = Buffer.from(data2);
            dataLength = data2.length;
          }
        } else {
          dataLength = data2.length;
          merge = options.mask && options.readOnly && !skipMasking;
        }
        let payloadLength = dataLength;
        if (dataLength >= 65536) {
          offset += 8;
          payloadLength = 127;
        } else if (dataLength > 125) {
          offset += 2;
          payloadLength = 126;
        }
        const target = Buffer.allocUnsafe(merge ? dataLength + offset : offset);
        target[0] = options.fin ? options.opcode | 128 : options.opcode;
        if (options.rsv1) target[0] |= 64;
        target[1] = payloadLength;
        if (payloadLength === 126) {
          target.writeUInt16BE(dataLength, 2);
        } else if (payloadLength === 127) {
          target[2] = target[3] = 0;
          target.writeUIntBE(dataLength, 4, 6);
        }
        if (!options.mask) return [target, data2];
        target[1] |= 128;
        target[offset - 4] = mask[0];
        target[offset - 3] = mask[1];
        target[offset - 2] = mask[2];
        target[offset - 1] = mask[3];
        if (skipMasking) return [target, data2];
        if (merge) {
          applyMask(data2, mask, target, offset, dataLength);
          return [target];
        }
        applyMask(data2, mask, data2, 0, dataLength);
        return [target, data2];
      }
      /**
       * Sends a close message to the other peer.
       *
       * @param {Number} [code] The status code component of the body
       * @param {(String|Buffer)} [data] The message component of the body
       * @param {Boolean} [mask=false] Specifies whether or not to mask the message
       * @param {Function} [cb] Callback
       * @public
       */
      close(code, data2, mask, cb) {
        let buf;
        if (code === void 0) {
          buf = EMPTY_BUFFER;
        } else if (typeof code !== "number" || !isValidStatusCode(code)) {
          throw new TypeError("First argument must be a valid error code number");
        } else if (data2 === void 0 || !data2.length) {
          buf = Buffer.allocUnsafe(2);
          buf.writeUInt16BE(code, 0);
        } else {
          const length = Buffer.byteLength(data2);
          if (length > 123) {
            throw new RangeError("The message must not be greater than 123 bytes");
          }
          buf = Buffer.allocUnsafe(2 + length);
          buf.writeUInt16BE(code, 0);
          if (typeof data2 === "string") {
            buf.write(data2, 2);
          } else if (isUint8Array(data2)) {
            buf.set(data2, 2);
          } else {
            throw new TypeError("Second argument must be a string or a Uint8Array");
          }
        }
        const options = {
          [kByteLength]: buf.length,
          fin: true,
          generateMask: this._generateMask,
          mask,
          maskBuffer: this._maskBuffer,
          opcode: 8,
          readOnly: false,
          rsv1: false
        };
        if (this._state !== DEFAULT) {
          this.enqueue([this.dispatch, buf, false, options, cb]);
        } else {
          this.sendFrame(_Sender.frame(buf, options), cb);
        }
      }
      /**
       * Sends a ping message to the other peer.
       *
       * @param {*} data The message to send
       * @param {Boolean} [mask=false] Specifies whether or not to mask `data`
       * @param {Function} [cb] Callback
       * @public
       */
      ping(data2, mask, cb) {
        let byteLength;
        let readOnly;
        if (typeof data2 === "string") {
          byteLength = Buffer.byteLength(data2);
          readOnly = false;
        } else if (isBlob(data2)) {
          byteLength = data2.size;
          readOnly = false;
        } else {
          data2 = toBuffer(data2);
          byteLength = data2.length;
          readOnly = toBuffer.readOnly;
        }
        if (byteLength > 125) {
          throw new RangeError("The data size must not be greater than 125 bytes");
        }
        const options = {
          [kByteLength]: byteLength,
          fin: true,
          generateMask: this._generateMask,
          mask,
          maskBuffer: this._maskBuffer,
          opcode: 9,
          readOnly,
          rsv1: false
        };
        if (isBlob(data2)) {
          if (this._state !== DEFAULT) {
            this.enqueue([this.getBlobData, data2, false, options, cb]);
          } else {
            this.getBlobData(data2, false, options, cb);
          }
        } else if (this._state !== DEFAULT) {
          this.enqueue([this.dispatch, data2, false, options, cb]);
        } else {
          this.sendFrame(_Sender.frame(data2, options), cb);
        }
      }
      /**
       * Sends a pong message to the other peer.
       *
       * @param {*} data The message to send
       * @param {Boolean} [mask=false] Specifies whether or not to mask `data`
       * @param {Function} [cb] Callback
       * @public
       */
      pong(data2, mask, cb) {
        let byteLength;
        let readOnly;
        if (typeof data2 === "string") {
          byteLength = Buffer.byteLength(data2);
          readOnly = false;
        } else if (isBlob(data2)) {
          byteLength = data2.size;
          readOnly = false;
        } else {
          data2 = toBuffer(data2);
          byteLength = data2.length;
          readOnly = toBuffer.readOnly;
        }
        if (byteLength > 125) {
          throw new RangeError("The data size must not be greater than 125 bytes");
        }
        const options = {
          [kByteLength]: byteLength,
          fin: true,
          generateMask: this._generateMask,
          mask,
          maskBuffer: this._maskBuffer,
          opcode: 10,
          readOnly,
          rsv1: false
        };
        if (isBlob(data2)) {
          if (this._state !== DEFAULT) {
            this.enqueue([this.getBlobData, data2, false, options, cb]);
          } else {
            this.getBlobData(data2, false, options, cb);
          }
        } else if (this._state !== DEFAULT) {
          this.enqueue([this.dispatch, data2, false, options, cb]);
        } else {
          this.sendFrame(_Sender.frame(data2, options), cb);
        }
      }
      /**
       * Sends a data message to the other peer.
       *
       * @param {*} data The message to send
       * @param {Object} options Options object
       * @param {Boolean} [options.binary=false] Specifies whether `data` is binary
       *     or text
       * @param {Boolean} [options.compress=false] Specifies whether or not to
       *     compress `data`
       * @param {Boolean} [options.fin=false] Specifies whether the fragment is the
       *     last one
       * @param {Boolean} [options.mask=false] Specifies whether or not to mask
       *     `data`
       * @param {Function} [cb] Callback
       * @public
       */
      send(data2, options, cb) {
        const perMessageDeflate = this._extensions[PerMessageDeflate2.extensionName];
        let opcode = options.binary ? 2 : 1;
        let rsv1 = options.compress;
        let byteLength;
        let readOnly;
        if (typeof data2 === "string") {
          byteLength = Buffer.byteLength(data2);
          readOnly = false;
        } else if (isBlob(data2)) {
          byteLength = data2.size;
          readOnly = false;
        } else {
          data2 = toBuffer(data2);
          byteLength = data2.length;
          readOnly = toBuffer.readOnly;
        }
        if (this._firstFragment) {
          this._firstFragment = false;
          if (rsv1 && perMessageDeflate && perMessageDeflate.params[perMessageDeflate._isServer ? "server_no_context_takeover" : "client_no_context_takeover"]) {
            rsv1 = byteLength >= perMessageDeflate._threshold;
          }
          this._compress = rsv1;
        } else {
          rsv1 = false;
          opcode = 0;
        }
        if (options.fin) this._firstFragment = true;
        const opts = {
          [kByteLength]: byteLength,
          fin: options.fin,
          generateMask: this._generateMask,
          mask: options.mask,
          maskBuffer: this._maskBuffer,
          opcode,
          readOnly,
          rsv1
        };
        if (isBlob(data2)) {
          if (this._state !== DEFAULT) {
            this.enqueue([this.getBlobData, data2, this._compress, opts, cb]);
          } else {
            this.getBlobData(data2, this._compress, opts, cb);
          }
        } else if (this._state !== DEFAULT) {
          this.enqueue([this.dispatch, data2, this._compress, opts, cb]);
        } else {
          this.dispatch(data2, this._compress, opts, cb);
        }
      }
      /**
       * Gets the contents of a blob as binary data.
       *
       * @param {Blob} blob The blob
       * @param {Boolean} [compress=false] Specifies whether or not to compress
       *     the data
       * @param {Object} options Options object
       * @param {Boolean} [options.fin=false] Specifies whether or not to set the
       *     FIN bit
       * @param {Function} [options.generateMask] The function used to generate the
       *     masking key
       * @param {Boolean} [options.mask=false] Specifies whether or not to mask
       *     `data`
       * @param {Buffer} [options.maskBuffer] The buffer used to store the masking
       *     key
       * @param {Number} options.opcode The opcode
       * @param {Boolean} [options.readOnly=false] Specifies whether `data` can be
       *     modified
       * @param {Boolean} [options.rsv1=false] Specifies whether or not to set the
       *     RSV1 bit
       * @param {Function} [cb] Callback
       * @private
       */
      getBlobData(blob, compress, options, cb) {
        this._bufferedBytes += options[kByteLength];
        this._state = GET_BLOB_DATA;
        blob.arrayBuffer().then((arrayBuffer) => {
          if (this._socket.destroyed) {
            const err = new Error(
              "The socket was closed while the blob was being read"
            );
            process.nextTick(callCallbacks, this, err, cb);
            return;
          }
          this._bufferedBytes -= options[kByteLength];
          const data2 = toBuffer(arrayBuffer);
          if (!compress) {
            this._state = DEFAULT;
            this.sendFrame(_Sender.frame(data2, options), cb);
            this.dequeue();
          } else {
            this.dispatch(data2, compress, options, cb);
          }
        }).catch((err) => {
          process.nextTick(onError, this, err, cb);
        });
      }
      /**
       * Dispatches a message.
       *
       * @param {(Buffer|String)} data The message to send
       * @param {Boolean} [compress=false] Specifies whether or not to compress
       *     `data`
       * @param {Object} options Options object
       * @param {Boolean} [options.fin=false] Specifies whether or not to set the
       *     FIN bit
       * @param {Function} [options.generateMask] The function used to generate the
       *     masking key
       * @param {Boolean} [options.mask=false] Specifies whether or not to mask
       *     `data`
       * @param {Buffer} [options.maskBuffer] The buffer used to store the masking
       *     key
       * @param {Number} options.opcode The opcode
       * @param {Boolean} [options.readOnly=false] Specifies whether `data` can be
       *     modified
       * @param {Boolean} [options.rsv1=false] Specifies whether or not to set the
       *     RSV1 bit
       * @param {Function} [cb] Callback
       * @private
       */
      dispatch(data2, compress, options, cb) {
        if (!compress) {
          this.sendFrame(_Sender.frame(data2, options), cb);
          return;
        }
        const perMessageDeflate = this._extensions[PerMessageDeflate2.extensionName];
        this._bufferedBytes += options[kByteLength];
        this._state = DEFLATING;
        perMessageDeflate.compress(data2, options.fin, (_4, buf) => {
          if (this._socket.destroyed) {
            const err = new Error(
              "The socket was closed while data was being compressed"
            );
            callCallbacks(this, err, cb);
            return;
          }
          this._bufferedBytes -= options[kByteLength];
          this._state = DEFAULT;
          options.readOnly = false;
          this.sendFrame(_Sender.frame(buf, options), cb);
          this.dequeue();
        });
      }
      /**
       * Executes queued send operations.
       *
       * @private
       */
      dequeue() {
        while (this._state === DEFAULT && this._queue.length) {
          const params = this._queue.shift();
          this._bufferedBytes -= params[3][kByteLength];
          Reflect.apply(params[0], this, params.slice(1));
        }
      }
      /**
       * Enqueues a send operation.
       *
       * @param {Array} params Send operation parameters.
       * @private
       */
      enqueue(params) {
        this._bufferedBytes += params[3][kByteLength];
        this._queue.push(params);
      }
      /**
       * Sends a frame.
       *
       * @param {(Buffer | String)[]} list The frame to send
       * @param {Function} [cb] Callback
       * @private
       */
      sendFrame(list2, cb) {
        if (list2.length === 2) {
          this._socket.cork();
          this._socket.write(list2[0]);
          this._socket.write(list2[1], cb);
          this._socket.uncork();
        } else {
          this._socket.write(list2[0], cb);
        }
      }
    };
    module2.exports = Sender2;
    function callCallbacks(sender, err, cb) {
      if (typeof cb === "function") cb(err);
      for (let i = 0; i < sender._queue.length; i++) {
        const params = sender._queue[i];
        const callback = params[params.length - 1];
        if (typeof callback === "function") callback(err);
      }
    }
    function onError(sender, err, cb) {
      callCallbacks(sender, err, cb);
      sender.onerror(err);
    }
  }
});

// ../wordpress-preview-2026-10-22/runtime/tooling/node_modules/ws/lib/event-target.js
var require_event_target = __commonJS({
  "../wordpress-preview-2026-10-22/runtime/tooling/node_modules/ws/lib/event-target.js"(exports2, module2) {
    "use strict";
    var { kForOnEventAttribute, kListener } = require_constants();
    var kCode = Symbol("kCode");
    var kData = Symbol("kData");
    var kError2 = Symbol("kError");
    var kMessage2 = Symbol("kMessage");
    var kReason = Symbol("kReason");
    var kTarget = Symbol("kTarget");
    var kType = Symbol("kType");
    var kWasClean = Symbol("kWasClean");
    var Event2 = class {
      /**
       * Create a new `Event`.
       *
       * @param {String} type The name of the event
       * @throws {TypeError} If the `type` argument is not specified
       */
      constructor(type) {
        this[kTarget] = null;
        this[kType] = type;
      }
      /**
       * @type {*}
       */
      get target() {
        return this[kTarget];
      }
      /**
       * @type {String}
       */
      get type() {
        return this[kType];
      }
    };
    Object.defineProperty(Event2.prototype, "target", { enumerable: true });
    Object.defineProperty(Event2.prototype, "type", { enumerable: true });
    var CloseEvent = class extends Event2 {
      /**
       * Create a new `CloseEvent`.
       *
       * @param {String} type The name of the event
       * @param {Object} [options] A dictionary object that allows for setting
       *     attributes via object members of the same name
       * @param {Number} [options.code=0] The status code explaining why the
       *     connection was closed
       * @param {String} [options.reason=''] A human-readable string explaining why
       *     the connection was closed
       * @param {Boolean} [options.wasClean=false] Indicates whether or not the
       *     connection was cleanly closed
       */
      constructor(type, options = {}) {
        super(type);
        this[kCode] = options.code === void 0 ? 0 : options.code;
        this[kReason] = options.reason === void 0 ? "" : options.reason;
        this[kWasClean] = options.wasClean === void 0 ? false : options.wasClean;
      }
      /**
       * @type {Number}
       */
      get code() {
        return this[kCode];
      }
      /**
       * @type {String}
       */
      get reason() {
        return this[kReason];
      }
      /**
       * @type {Boolean}
       */
      get wasClean() {
        return this[kWasClean];
      }
    };
    Object.defineProperty(CloseEvent.prototype, "code", { enumerable: true });
    Object.defineProperty(CloseEvent.prototype, "reason", { enumerable: true });
    Object.defineProperty(CloseEvent.prototype, "wasClean", { enumerable: true });
    var ErrorEvent3 = class extends Event2 {
      /**
       * Create a new `ErrorEvent`.
       *
       * @param {String} type The name of the event
       * @param {Object} [options] A dictionary object that allows for setting
       *     attributes via object members of the same name
       * @param {*} [options.error=null] The error that generated this event
       * @param {String} [options.message=''] The error message
       */
      constructor(type, options = {}) {
        super(type);
        this[kError2] = options.error === void 0 ? null : options.error;
        this[kMessage2] = options.message === void 0 ? "" : options.message;
      }
      /**
       * @type {*}
       */
      get error() {
        return this[kError2];
      }
      /**
       * @type {String}
       */
      get message() {
        return this[kMessage2];
      }
    };
    Object.defineProperty(ErrorEvent3.prototype, "error", { enumerable: true });
    Object.defineProperty(ErrorEvent3.prototype, "message", { enumerable: true });
    var MessageEvent = class extends Event2 {
      /**
       * Create a new `MessageEvent`.
       *
       * @param {String} type The name of the event
       * @param {Object} [options] A dictionary object that allows for setting
       *     attributes via object members of the same name
       * @param {*} [options.data=null] The message content
       */
      constructor(type, options = {}) {
        super(type);
        this[kData] = options.data === void 0 ? null : options.data;
      }
      /**
       * @type {*}
       */
      get data() {
        return this[kData];
      }
    };
    Object.defineProperty(MessageEvent.prototype, "data", { enumerable: true });
    var EventTarget2 = {
      /**
       * Register an event listener.
       *
       * @param {String} type A string representing the event type to listen for
       * @param {(Function|Object)} handler The listener to add
       * @param {Object} [options] An options object specifies characteristics about
       *     the event listener
       * @param {Boolean} [options.once=false] A `Boolean` indicating that the
       *     listener should be invoked at most once after being added. If `true`,
       *     the listener would be automatically removed when invoked.
       * @public
       */
      addEventListener(type, handler2, options = {}) {
        for (const listener of this.listeners(type)) {
          if (!options[kForOnEventAttribute] && listener[kListener] === handler2 && !listener[kForOnEventAttribute]) {
            return;
          }
        }
        let wrapper;
        if (type === "message") {
          wrapper = function onMessage(data2, isBinary) {
            const event = new MessageEvent("message", {
              data: isBinary ? data2 : data2.toString()
            });
            event[kTarget] = this;
            callListener(handler2, this, event);
          };
        } else if (type === "close") {
          wrapper = function onClose(code, message) {
            const event = new CloseEvent("close", {
              code,
              reason: message.toString(),
              wasClean: this._closeFrameReceived && this._closeFrameSent
            });
            event[kTarget] = this;
            callListener(handler2, this, event);
          };
        } else if (type === "error") {
          wrapper = function onError(error) {
            const event = new ErrorEvent3("error", {
              error,
              message: error.message
            });
            event[kTarget] = this;
            callListener(handler2, this, event);
          };
        } else if (type === "open") {
          wrapper = function onOpen() {
            const event = new Event2("open");
            event[kTarget] = this;
            callListener(handler2, this, event);
          };
        } else {
          return;
        }
        wrapper[kForOnEventAttribute] = !!options[kForOnEventAttribute];
        wrapper[kListener] = handler2;
        if (options.once) {
          this.once(type, wrapper);
        } else {
          this.on(type, wrapper);
        }
      },
      /**
       * Remove an event listener.
       *
       * @param {String} type A string representing the event type to remove
       * @param {(Function|Object)} handler The listener to remove
       * @public
       */
      removeEventListener(type, handler2) {
        for (const listener of this.listeners(type)) {
          if (listener[kListener] === handler2 && !listener[kForOnEventAttribute]) {
            this.removeListener(type, listener);
            break;
          }
        }
      }
    };
    module2.exports = {
      CloseEvent,
      ErrorEvent: ErrorEvent3,
      Event: Event2,
      EventTarget: EventTarget2,
      MessageEvent
    };
    function callListener(listener, thisArg, event) {
      if (typeof listener === "object" && listener.handleEvent) {
        listener.handleEvent.call(listener, event);
      } else {
        listener.call(thisArg, event);
      }
    }
  }
});

// ../wordpress-preview-2026-10-22/runtime/tooling/node_modules/ws/lib/extension.js
var require_extension = __commonJS({
  "../wordpress-preview-2026-10-22/runtime/tooling/node_modules/ws/lib/extension.js"(exports2, module2) {
    "use strict";
    var { tokenChars } = require_validation();
    function push(dest, name, elem) {
      if (dest[name] === void 0) dest[name] = [elem];
      else dest[name].push(elem);
    }
    function parse2(header) {
      const offers = /* @__PURE__ */ Object.create(null);
      let params = /* @__PURE__ */ Object.create(null);
      let mustUnescape = false;
      let isEscaping = false;
      let inQuotes = false;
      let extensionName;
      let paramName;
      let start = -1;
      let code = -1;
      let end = -1;
      let i = 0;
      for (; i < header.length; i++) {
        code = header.charCodeAt(i);
        if (extensionName === void 0) {
          if (end === -1 && tokenChars[code] === 1) {
            if (start === -1) start = i;
          } else if (i !== 0 && (code === 32 || code === 9)) {
            if (end === -1 && start !== -1) end = i;
          } else if (code === 59 || code === 44) {
            if (start === -1) {
              throw new SyntaxError(`Unexpected character at index ${i}`);
            }
            if (end === -1) end = i;
            const name = header.slice(start, end);
            if (code === 44) {
              push(offers, name, params);
              params = /* @__PURE__ */ Object.create(null);
            } else {
              extensionName = name;
            }
            start = end = -1;
          } else {
            throw new SyntaxError(`Unexpected character at index ${i}`);
          }
        } else if (paramName === void 0) {
          if (end === -1 && tokenChars[code] === 1) {
            if (start === -1) start = i;
          } else if (code === 32 || code === 9) {
            if (end === -1 && start !== -1) end = i;
          } else if (code === 59 || code === 44) {
            if (start === -1) {
              throw new SyntaxError(`Unexpected character at index ${i}`);
            }
            if (end === -1) end = i;
            push(params, header.slice(start, end), true);
            if (code === 44) {
              push(offers, extensionName, params);
              params = /* @__PURE__ */ Object.create(null);
              extensionName = void 0;
            }
            start = end = -1;
          } else if (code === 61 && start !== -1 && end === -1) {
            paramName = header.slice(start, i);
            start = end = -1;
          } else {
            throw new SyntaxError(`Unexpected character at index ${i}`);
          }
        } else {
          if (isEscaping) {
            if (tokenChars[code] !== 1) {
              throw new SyntaxError(`Unexpected character at index ${i}`);
            }
            if (start === -1) start = i;
            else if (!mustUnescape) mustUnescape = true;
            isEscaping = false;
          } else if (inQuotes) {
            if (tokenChars[code] === 1) {
              if (start === -1) start = i;
            } else if (code === 34 && start !== -1) {
              inQuotes = false;
              end = i;
            } else if (code === 92) {
              isEscaping = true;
            } else {
              throw new SyntaxError(`Unexpected character at index ${i}`);
            }
          } else if (code === 34 && header.charCodeAt(i - 1) === 61) {
            inQuotes = true;
          } else if (end === -1 && tokenChars[code] === 1) {
            if (start === -1) start = i;
          } else if (start !== -1 && (code === 32 || code === 9)) {
            if (end === -1) end = i;
          } else if (code === 59 || code === 44) {
            if (start === -1) {
              throw new SyntaxError(`Unexpected character at index ${i}`);
            }
            if (end === -1) end = i;
            let value = header.slice(start, end);
            if (mustUnescape) {
              value = value.replace(/\\/g, "");
              mustUnescape = false;
            }
            push(params, paramName, value);
            if (code === 44) {
              push(offers, extensionName, params);
              params = /* @__PURE__ */ Object.create(null);
              extensionName = void 0;
            }
            paramName = void 0;
            start = end = -1;
          } else {
            throw new SyntaxError(`Unexpected character at index ${i}`);
          }
        }
      }
      if (start === -1 || inQuotes || code === 32 || code === 9) {
        throw new SyntaxError("Unexpected end of input");
      }
      if (end === -1) end = i;
      const token = header.slice(start, end);
      if (extensionName === void 0) {
        push(offers, token, params);
      } else {
        if (paramName === void 0) {
          push(params, token, true);
        } else if (mustUnescape) {
          push(params, paramName, token.replace(/\\/g, ""));
        } else {
          push(params, paramName, token);
        }
        push(offers, extensionName, params);
      }
      return offers;
    }
    function format(extensions) {
      return Object.keys(extensions).map((extension2) => {
        let configurations = extensions[extension2];
        if (!Array.isArray(configurations)) configurations = [configurations];
        return configurations.map((params) => {
          return [extension2].concat(
            Object.keys(params).map((k2) => {
              let values = params[k2];
              if (!Array.isArray(values)) values = [values];
              return values.map((v3) => v3 === true ? k2 : `${k2}=${v3}`).join("; ");
            })
          ).join("; ");
        }).join(", ");
      }).join(", ");
    }
    module2.exports = { format, parse: parse2 };
  }
});

// ../wordpress-preview-2026-10-22/runtime/tooling/node_modules/ws/lib/websocket.js
var require_websocket = __commonJS({
  "../wordpress-preview-2026-10-22/runtime/tooling/node_modules/ws/lib/websocket.js"(exports2, module2) {
    "use strict";
    var EventEmitter = require("events");
    var https = require("https");
    var http2 = require("http");
    var net2 = require("net");
    var tls = require("tls");
    var { randomBytes: randomBytes2, createHash } = require("crypto");
    var { Duplex, Readable } = require("stream");
    var { URL: URL2 } = require("url");
    var PerMessageDeflate2 = require_permessage_deflate();
    var Receiver2 = require_receiver();
    var Sender2 = require_sender();
    var { isBlob } = require_validation();
    var {
      BINARY_TYPES,
      CLOSE_TIMEOUT,
      EMPTY_BUFFER,
      GUID,
      kForOnEventAttribute,
      kListener,
      kStatusCode,
      kWebSocket,
      NOOP
    } = require_constants();
    var {
      EventTarget: { addEventListener, removeEventListener }
    } = require_event_target();
    var { format, parse: parse2 } = require_extension();
    var { toBuffer } = require_buffer_util();
    var kAborted = Symbol("kAborted");
    var protocolVersions = [8, 13];
    var readyStates = ["CONNECTING", "OPEN", "CLOSING", "CLOSED"];
    var subprotocolRegex = /^[!#$%&'*+\-.0-9A-Z^_`|a-z~]+$/;
    var WebSocket2 = class _WebSocket extends EventEmitter {
      /**
       * Create a new `WebSocket`.
       *
       * @param {(String|URL)} address The URL to which to connect
       * @param {(String|String[])} [protocols] The subprotocols
       * @param {Object} [options] Connection options
       */
      constructor(address, protocols, options) {
        super();
        this._binaryType = BINARY_TYPES[0];
        this._closeCode = 1006;
        this._closeFrameReceived = false;
        this._closeFrameSent = false;
        this._closeMessage = EMPTY_BUFFER;
        this._closeTimer = null;
        this._errorEmitted = false;
        this._extensions = {};
        this._paused = false;
        this._protocol = "";
        this._readyState = _WebSocket.CONNECTING;
        this._receiver = null;
        this._sender = null;
        this._socket = null;
        if (address !== null) {
          this._bufferedAmount = 0;
          this._isServer = false;
          this._redirects = 0;
          if (protocols === void 0) {
            protocols = [];
          } else if (!Array.isArray(protocols)) {
            if (typeof protocols === "object" && protocols !== null) {
              options = protocols;
              protocols = [];
            } else {
              protocols = [protocols];
            }
          }
          initAsClient(this, address, protocols, options);
        } else {
          this._autoPong = options.autoPong;
          this._closeTimeout = options.closeTimeout;
          this._isServer = true;
        }
      }
      /**
       * For historical reasons, the custom "nodebuffer" type is used by the default
       * instead of "blob".
       *
       * @type {String}
       */
      get binaryType() {
        return this._binaryType;
      }
      set binaryType(type) {
        if (!BINARY_TYPES.includes(type)) return;
        this._binaryType = type;
        if (this._receiver) this._receiver._binaryType = type;
      }
      /**
       * @type {Number}
       */
      get bufferedAmount() {
        if (!this._socket) return this._bufferedAmount;
        return this._socket._writableState.length + this._sender._bufferedBytes;
      }
      /**
       * @type {String}
       */
      get extensions() {
        return Object.keys(this._extensions).join();
      }
      /**
       * @type {Boolean}
       */
      get isPaused() {
        return this._paused;
      }
      /**
       * @type {Function}
       */
      /* istanbul ignore next */
      get onclose() {
        return null;
      }
      /**
       * @type {Function}
       */
      /* istanbul ignore next */
      get onerror() {
        return null;
      }
      /**
       * @type {Function}
       */
      /* istanbul ignore next */
      get onopen() {
        return null;
      }
      /**
       * @type {Function}
       */
      /* istanbul ignore next */
      get onmessage() {
        return null;
      }
      /**
       * @type {String}
       */
      get protocol() {
        return this._protocol;
      }
      /**
       * @type {Number}
       */
      get readyState() {
        return this._readyState;
      }
      /**
       * @type {String}
       */
      get url() {
        return this._url;
      }
      /**
       * Set up the socket and the internal resources.
       *
       * @param {Duplex} socket The network socket between the server and client
       * @param {Buffer} head The first packet of the upgraded stream
       * @param {Object} options Options object
       * @param {Boolean} [options.allowSynchronousEvents=false] Specifies whether
       *     any of the `'message'`, `'ping'`, and `'pong'` events can be emitted
       *     multiple times in the same tick
       * @param {Function} [options.generateMask] The function used to generate the
       *     masking key
       * @param {Number} [options.maxBufferedChunks=0] The maximum number of
       *     buffered data chunks
       * @param {Number} [options.maxFragments=0] The maximum number of message
       *     fragments
       * @param {Number} [options.maxPayload=0] The maximum allowed message size
       * @param {Boolean} [options.skipUTF8Validation=false] Specifies whether or
       *     not to skip UTF-8 validation for text and close messages
       * @private
       */
      setSocket(socket, head, options) {
        const receiver = new Receiver2({
          allowSynchronousEvents: options.allowSynchronousEvents,
          binaryType: this.binaryType,
          extensions: this._extensions,
          isServer: this._isServer,
          maxBufferedChunks: options.maxBufferedChunks,
          maxFragments: options.maxFragments,
          maxPayload: options.maxPayload,
          skipUTF8Validation: options.skipUTF8Validation
        });
        const sender = new Sender2(socket, this._extensions, options.generateMask);
        this._receiver = receiver;
        this._sender = sender;
        this._socket = socket;
        receiver[kWebSocket] = this;
        sender[kWebSocket] = this;
        socket[kWebSocket] = this;
        receiver.on("conclude", receiverOnConclude);
        receiver.on("drain", receiverOnDrain);
        receiver.on("error", receiverOnError);
        receiver.on("message", receiverOnMessage);
        receiver.on("ping", receiverOnPing);
        receiver.on("pong", receiverOnPong);
        sender.onerror = senderOnError;
        if (socket.setTimeout) socket.setTimeout(0);
        if (socket.setNoDelay) socket.setNoDelay();
        if (head.length > 0) socket.unshift(head);
        socket.on("close", socketOnClose);
        socket.on("data", socketOnData);
        socket.on("end", socketOnEnd);
        socket.on("error", socketOnError);
        this._readyState = _WebSocket.OPEN;
        this.emit("open");
      }
      /**
       * Emit the `'close'` event.
       *
       * @private
       */
      emitClose() {
        if (!this._socket) {
          this._readyState = _WebSocket.CLOSED;
          this.emit("close", this._closeCode, this._closeMessage);
          return;
        }
        if (this._extensions[PerMessageDeflate2.extensionName]) {
          this._extensions[PerMessageDeflate2.extensionName].cleanup();
        }
        this._receiver.removeAllListeners();
        this._readyState = _WebSocket.CLOSED;
        this.emit("close", this._closeCode, this._closeMessage);
      }
      /**
       * Start a closing handshake.
       *
       *          +----------+   +-----------+   +----------+
       *     - - -|ws.close()|-->|close frame|-->|ws.close()|- - -
       *    |     +----------+   +-----------+   +----------+     |
       *          +----------+   +-----------+         |
       * CLOSING  |ws.close()|<--|close frame|<--+-----+       CLOSING
       *          +----------+   +-----------+   |
       *    |           |                        |   +---+        |
       *                +------------------------+-->|fin| - - - -
       *    |         +---+                      |   +---+
       *     - - - - -|fin|<---------------------+
       *              +---+
       *
       * @param {Number} [code] Status code explaining why the connection is closing
       * @param {(String|Buffer)} [data] The reason why the connection is
       *     closing
       * @public
       */
      close(code, data2) {
        if (this.readyState === _WebSocket.CLOSED) return;
        if (this.readyState === _WebSocket.CONNECTING) {
          const msg = "WebSocket was closed before the connection was established";
          abortHandshake(this, this._req, msg);
          return;
        }
        if (this.readyState === _WebSocket.CLOSING) {
          if (this._closeFrameSent && (this._closeFrameReceived || this._receiver._writableState.errorEmitted)) {
            this._socket.end();
          }
          return;
        }
        this._readyState = _WebSocket.CLOSING;
        this._sender.close(code, data2, !this._isServer, (err) => {
          if (err) return;
          this._closeFrameSent = true;
          if (this._closeFrameReceived || this._receiver._writableState.errorEmitted) {
            this._socket.end();
          }
        });
        setCloseTimer(this);
      }
      /**
       * Pause the socket.
       *
       * @public
       */
      pause() {
        if (this.readyState === _WebSocket.CONNECTING || this.readyState === _WebSocket.CLOSED) {
          return;
        }
        this._paused = true;
        this._socket.pause();
      }
      /**
       * Send a ping.
       *
       * @param {*} [data] The data to send
       * @param {Boolean} [mask] Indicates whether or not to mask `data`
       * @param {Function} [cb] Callback which is executed when the ping is sent
       * @public
       */
      ping(data2, mask, cb) {
        if (this.readyState === _WebSocket.CONNECTING) {
          throw new Error("WebSocket is not open: readyState 0 (CONNECTING)");
        }
        if (typeof data2 === "function") {
          cb = data2;
          data2 = mask = void 0;
        } else if (typeof mask === "function") {
          cb = mask;
          mask = void 0;
        }
        if (typeof data2 === "number") data2 = data2.toString();
        if (this.readyState !== _WebSocket.OPEN) {
          sendAfterClose(this, data2, cb);
          return;
        }
        if (mask === void 0) mask = !this._isServer;
        this._sender.ping(data2 || EMPTY_BUFFER, mask, cb);
      }
      /**
       * Send a pong.
       *
       * @param {*} [data] The data to send
       * @param {Boolean} [mask] Indicates whether or not to mask `data`
       * @param {Function} [cb] Callback which is executed when the pong is sent
       * @public
       */
      pong(data2, mask, cb) {
        if (this.readyState === _WebSocket.CONNECTING) {
          throw new Error("WebSocket is not open: readyState 0 (CONNECTING)");
        }
        if (typeof data2 === "function") {
          cb = data2;
          data2 = mask = void 0;
        } else if (typeof mask === "function") {
          cb = mask;
          mask = void 0;
        }
        if (typeof data2 === "number") data2 = data2.toString();
        if (this.readyState !== _WebSocket.OPEN) {
          sendAfterClose(this, data2, cb);
          return;
        }
        if (mask === void 0) mask = !this._isServer;
        this._sender.pong(data2 || EMPTY_BUFFER, mask, cb);
      }
      /**
       * Resume the socket.
       *
       * @public
       */
      resume() {
        if (this.readyState === _WebSocket.CONNECTING || this.readyState === _WebSocket.CLOSED) {
          return;
        }
        this._paused = false;
        if (!this._receiver._writableState.needDrain) this._socket.resume();
      }
      /**
       * Send a data message.
       *
       * @param {*} data The message to send
       * @param {Object} [options] Options object
       * @param {Boolean} [options.binary] Specifies whether `data` is binary or
       *     text
       * @param {Boolean} [options.compress] Specifies whether or not to compress
       *     `data`
       * @param {Boolean} [options.fin=true] Specifies whether the fragment is the
       *     last one
       * @param {Boolean} [options.mask] Specifies whether or not to mask `data`
       * @param {Function} [cb] Callback which is executed when data is written out
       * @public
       */
      send(data2, options, cb) {
        if (this.readyState === _WebSocket.CONNECTING) {
          throw new Error("WebSocket is not open: readyState 0 (CONNECTING)");
        }
        if (typeof options === "function") {
          cb = options;
          options = {};
        }
        if (typeof data2 === "number") data2 = data2.toString();
        if (this.readyState !== _WebSocket.OPEN) {
          sendAfterClose(this, data2, cb);
          return;
        }
        const opts = {
          binary: typeof data2 !== "string",
          mask: !this._isServer,
          compress: true,
          fin: true,
          ...options
        };
        if (!this._extensions[PerMessageDeflate2.extensionName]) {
          opts.compress = false;
        }
        this._sender.send(data2 || EMPTY_BUFFER, opts, cb);
      }
      /**
       * Forcibly close the connection.
       *
       * @public
       */
      terminate() {
        if (this.readyState === _WebSocket.CLOSED) return;
        if (this.readyState === _WebSocket.CONNECTING) {
          const msg = "WebSocket was closed before the connection was established";
          abortHandshake(this, this._req, msg);
          return;
        }
        if (this._socket) {
          this._readyState = _WebSocket.CLOSING;
          this._socket.destroy();
        }
      }
    };
    Object.defineProperty(WebSocket2, "CONNECTING", {
      enumerable: true,
      value: readyStates.indexOf("CONNECTING")
    });
    Object.defineProperty(WebSocket2.prototype, "CONNECTING", {
      enumerable: true,
      value: readyStates.indexOf("CONNECTING")
    });
    Object.defineProperty(WebSocket2, "OPEN", {
      enumerable: true,
      value: readyStates.indexOf("OPEN")
    });
    Object.defineProperty(WebSocket2.prototype, "OPEN", {
      enumerable: true,
      value: readyStates.indexOf("OPEN")
    });
    Object.defineProperty(WebSocket2, "CLOSING", {
      enumerable: true,
      value: readyStates.indexOf("CLOSING")
    });
    Object.defineProperty(WebSocket2.prototype, "CLOSING", {
      enumerable: true,
      value: readyStates.indexOf("CLOSING")
    });
    Object.defineProperty(WebSocket2, "CLOSED", {
      enumerable: true,
      value: readyStates.indexOf("CLOSED")
    });
    Object.defineProperty(WebSocket2.prototype, "CLOSED", {
      enumerable: true,
      value: readyStates.indexOf("CLOSED")
    });
    [
      "binaryType",
      "bufferedAmount",
      "extensions",
      "isPaused",
      "protocol",
      "readyState",
      "url"
    ].forEach((property) => {
      Object.defineProperty(WebSocket2.prototype, property, { enumerable: true });
    });
    ["open", "error", "close", "message"].forEach((method) => {
      Object.defineProperty(WebSocket2.prototype, `on${method}`, {
        enumerable: true,
        get() {
          for (const listener of this.listeners(method)) {
            if (listener[kForOnEventAttribute]) return listener[kListener];
          }
          return null;
        },
        set(handler2) {
          for (const listener of this.listeners(method)) {
            if (listener[kForOnEventAttribute]) {
              this.removeListener(method, listener);
              break;
            }
          }
          if (typeof handler2 !== "function") return;
          this.addEventListener(method, handler2, {
            [kForOnEventAttribute]: true
          });
        }
      });
    });
    WebSocket2.prototype.addEventListener = addEventListener;
    WebSocket2.prototype.removeEventListener = removeEventListener;
    module2.exports = WebSocket2;
    function initAsClient(websocket, address, protocols, options) {
      const opts = {
        allowSynchronousEvents: true,
        autoPong: true,
        closeTimeout: CLOSE_TIMEOUT,
        protocolVersion: protocolVersions[1],
        maxBufferedChunks: 1024 * 1024,
        maxFragments: 128 * 1024,
        maxPayload: 100 * 1024 * 1024,
        skipUTF8Validation: false,
        perMessageDeflate: true,
        followRedirects: false,
        maxRedirects: 10,
        ...options,
        socketPath: void 0,
        hostname: void 0,
        protocol: void 0,
        timeout: void 0,
        method: "GET",
        host: void 0,
        path: void 0,
        port: void 0
      };
      websocket._autoPong = opts.autoPong;
      websocket._closeTimeout = opts.closeTimeout;
      if (!protocolVersions.includes(opts.protocolVersion)) {
        throw new RangeError(
          `Unsupported protocol version: ${opts.protocolVersion} (supported versions: ${protocolVersions.join(", ")})`
        );
      }
      let parsedUrl;
      if (address instanceof URL2) {
        parsedUrl = address;
      } else {
        try {
          parsedUrl = new URL2(address);
        } catch {
          throw new SyntaxError(`Invalid URL: ${address}`);
        }
      }
      if (parsedUrl.protocol === "http:") {
        parsedUrl.protocol = "ws:";
      } else if (parsedUrl.protocol === "https:") {
        parsedUrl.protocol = "wss:";
      }
      websocket._url = parsedUrl.href;
      const isSecure = parsedUrl.protocol === "wss:";
      const isIpcUrl = parsedUrl.protocol === "ws+unix:";
      let invalidUrlMessage;
      if (parsedUrl.protocol !== "ws:" && !isSecure && !isIpcUrl) {
        invalidUrlMessage = `The URL's protocol must be one of "ws:", "wss:", "http:", "https:", or "ws+unix:"`;
      } else if (isIpcUrl && !parsedUrl.pathname) {
        invalidUrlMessage = "The URL's pathname is empty";
      } else if (parsedUrl.hash) {
        invalidUrlMessage = "The URL contains a fragment identifier";
      }
      if (invalidUrlMessage) {
        const err = new SyntaxError(invalidUrlMessage);
        if (websocket._redirects === 0) {
          throw err;
        } else {
          emitErrorAndClose(websocket, err);
          return;
        }
      }
      const defaultPort = isSecure ? 443 : 80;
      const key = randomBytes2(16).toString("base64");
      const request = isSecure ? https.request : http2.request;
      const protocolSet = /* @__PURE__ */ new Set();
      let perMessageDeflate;
      opts.createConnection = opts.createConnection || (isSecure ? tlsConnect : netConnect);
      opts.defaultPort = opts.defaultPort || defaultPort;
      opts.port = parsedUrl.port || defaultPort;
      opts.host = parsedUrl.hostname.startsWith("[") ? parsedUrl.hostname.slice(1, -1) : parsedUrl.hostname;
      opts.headers = {
        ...opts.headers,
        "Sec-WebSocket-Version": opts.protocolVersion,
        "Sec-WebSocket-Key": key,
        Connection: "Upgrade",
        Upgrade: "websocket"
      };
      opts.path = parsedUrl.pathname + parsedUrl.search;
      opts.timeout = opts.handshakeTimeout;
      if (opts.perMessageDeflate) {
        perMessageDeflate = new PerMessageDeflate2({
          ...opts.perMessageDeflate,
          isServer: false,
          maxPayload: opts.maxPayload
        });
        opts.headers["Sec-WebSocket-Extensions"] = format({
          [PerMessageDeflate2.extensionName]: perMessageDeflate.offer()
        });
      }
      if (protocols.length) {
        for (const protocol of protocols) {
          if (typeof protocol !== "string" || !subprotocolRegex.test(protocol) || protocolSet.has(protocol)) {
            throw new SyntaxError(
              "An invalid or duplicated subprotocol was specified"
            );
          }
          protocolSet.add(protocol);
        }
        opts.headers["Sec-WebSocket-Protocol"] = protocols.join(",");
      }
      if (opts.origin) {
        if (opts.protocolVersion < 13) {
          opts.headers["Sec-WebSocket-Origin"] = opts.origin;
        } else {
          opts.headers.Origin = opts.origin;
        }
      }
      if (parsedUrl.username || parsedUrl.password) {
        opts.auth = `${parsedUrl.username}:${parsedUrl.password}`;
      }
      if (isIpcUrl) {
        const parts = opts.path.split(":");
        opts.socketPath = parts[0];
        opts.path = parts[1];
      }
      let req;
      if (opts.followRedirects) {
        if (websocket._redirects === 0) {
          websocket._originalIpc = isIpcUrl;
          websocket._originalSecure = isSecure;
          websocket._originalHostOrSocketPath = isIpcUrl ? opts.socketPath : parsedUrl.host;
          const headers = options && options.headers;
          options = { ...options, headers: {} };
          if (headers) {
            for (const [key2, value] of Object.entries(headers)) {
              options.headers[key2.toLowerCase()] = value;
            }
          }
        } else if (websocket.listenerCount("redirect") === 0) {
          const isSameHost = isIpcUrl ? websocket._originalIpc ? opts.socketPath === websocket._originalHostOrSocketPath : false : websocket._originalIpc ? false : parsedUrl.host === websocket._originalHostOrSocketPath;
          if (!isSameHost || websocket._originalSecure && !isSecure) {
            delete opts.headers.authorization;
            delete opts.headers.cookie;
            if (!isSameHost) delete opts.headers.host;
            opts.auth = void 0;
          }
        }
        if (opts.auth && !options.headers.authorization) {
          options.headers.authorization = "Basic " + Buffer.from(opts.auth).toString("base64");
        }
        req = websocket._req = request(opts);
        if (websocket._redirects) {
          websocket.emit("redirect", websocket.url, req);
        }
      } else {
        req = websocket._req = request(opts);
      }
      if (opts.timeout) {
        req.on("timeout", () => {
          abortHandshake(websocket, req, "Opening handshake has timed out");
        });
      }
      req.on("error", (err) => {
        if (req === null || req[kAborted]) return;
        req = websocket._req = null;
        emitErrorAndClose(websocket, err);
      });
      req.on("response", (res) => {
        const location2 = res.headers.location;
        const statusCode = res.statusCode;
        if (location2 && opts.followRedirects && statusCode >= 300 && statusCode < 400) {
          if (++websocket._redirects > opts.maxRedirects) {
            abortHandshake(websocket, req, "Maximum redirects exceeded");
            return;
          }
          req.abort();
          let addr;
          try {
            addr = new URL2(location2, address);
          } catch (e) {
            const err = new SyntaxError(`Invalid URL: ${location2}`);
            emitErrorAndClose(websocket, err);
            return;
          }
          initAsClient(websocket, addr, protocols, options);
        } else if (!websocket.emit("unexpected-response", req, res)) {
          abortHandshake(
            websocket,
            req,
            `Unexpected server response: ${res.statusCode}`
          );
        }
      });
      req.on("upgrade", (res, socket, head) => {
        websocket.emit("upgrade", res);
        if (websocket.readyState !== WebSocket2.CONNECTING) return;
        req = websocket._req = null;
        const upgrade = res.headers.upgrade;
        if (upgrade === void 0 || upgrade.toLowerCase() !== "websocket") {
          abortHandshake(websocket, socket, "Invalid Upgrade header");
          return;
        }
        const digest = createHash("sha1").update(key + GUID).digest("base64");
        if (res.headers["sec-websocket-accept"] !== digest) {
          abortHandshake(websocket, socket, "Invalid Sec-WebSocket-Accept header");
          return;
        }
        const serverProt = res.headers["sec-websocket-protocol"];
        let protError;
        if (serverProt !== void 0) {
          if (!protocolSet.size) {
            protError = "Server sent a subprotocol but none was requested";
          } else if (!protocolSet.has(serverProt)) {
            protError = "Server sent an invalid subprotocol";
          }
        } else if (protocolSet.size) {
          protError = "Server sent no subprotocol";
        }
        if (protError) {
          abortHandshake(websocket, socket, protError);
          return;
        }
        if (serverProt) websocket._protocol = serverProt;
        const secWebSocketExtensions = res.headers["sec-websocket-extensions"];
        if (secWebSocketExtensions !== void 0) {
          if (!perMessageDeflate) {
            const message = "Server sent a Sec-WebSocket-Extensions header but no extension was requested";
            abortHandshake(websocket, socket, message);
            return;
          }
          let extensions;
          try {
            extensions = parse2(secWebSocketExtensions);
          } catch (err) {
            const message = "Invalid Sec-WebSocket-Extensions header";
            abortHandshake(websocket, socket, message);
            return;
          }
          const extensionNames = Object.keys(extensions);
          if (extensionNames.length !== 1 || extensionNames[0] !== PerMessageDeflate2.extensionName) {
            const message = "Server indicated an extension that was not requested";
            abortHandshake(websocket, socket, message);
            return;
          }
          try {
            perMessageDeflate.accept(extensions[PerMessageDeflate2.extensionName]);
          } catch (err) {
            const message = "Invalid Sec-WebSocket-Extensions header";
            abortHandshake(websocket, socket, message);
            return;
          }
          websocket._extensions[PerMessageDeflate2.extensionName] = perMessageDeflate;
        }
        websocket.setSocket(socket, head, {
          allowSynchronousEvents: opts.allowSynchronousEvents,
          generateMask: opts.generateMask,
          maxBufferedChunks: opts.maxBufferedChunks,
          maxFragments: opts.maxFragments,
          maxPayload: opts.maxPayload,
          skipUTF8Validation: opts.skipUTF8Validation
        });
      });
      if (opts.finishRequest) {
        opts.finishRequest(req, websocket);
      } else {
        req.end();
      }
    }
    function emitErrorAndClose(websocket, err) {
      websocket._readyState = WebSocket2.CLOSING;
      websocket._errorEmitted = true;
      websocket.emit("error", err);
      websocket.emitClose();
    }
    function netConnect(options) {
      options.path = options.socketPath;
      return net2.connect(options);
    }
    function tlsConnect(options) {
      options.path = void 0;
      if (!options.servername && options.servername !== "") {
        options.servername = net2.isIP(options.host) ? "" : options.host;
      }
      return tls.connect(options);
    }
    function abortHandshake(websocket, stream, message) {
      websocket._readyState = WebSocket2.CLOSING;
      const err = new Error(message);
      Error.captureStackTrace(err, abortHandshake);
      if (stream.setHeader) {
        stream[kAborted] = true;
        stream.abort();
        if (stream.socket && !stream.socket.destroyed) {
          stream.socket.destroy();
        }
        process.nextTick(emitErrorAndClose, websocket, err);
      } else {
        stream.destroy(err);
        stream.once("error", websocket.emit.bind(websocket, "error"));
        stream.once("close", websocket.emitClose.bind(websocket));
      }
    }
    function sendAfterClose(websocket, data2, cb) {
      if (data2) {
        const length = isBlob(data2) ? data2.size : toBuffer(data2).length;
        if (websocket._socket) websocket._sender._bufferedBytes += length;
        else websocket._bufferedAmount += length;
      }
      if (cb) {
        const err = new Error(
          `WebSocket is not open: readyState ${websocket.readyState} (${readyStates[websocket.readyState]})`
        );
        process.nextTick(cb, err);
      }
    }
    function receiverOnConclude(code, reason) {
      const websocket = this[kWebSocket];
      websocket._closeFrameReceived = true;
      websocket._closeMessage = reason;
      websocket._closeCode = code;
      if (websocket._socket[kWebSocket] === void 0) return;
      websocket._socket.removeListener("data", socketOnData);
      process.nextTick(resume, websocket._socket);
      if (code === 1005) websocket.close();
      else websocket.close(code, reason);
    }
    function receiverOnDrain() {
      const websocket = this[kWebSocket];
      if (!websocket.isPaused) websocket._socket.resume();
    }
    function receiverOnError(err) {
      const websocket = this[kWebSocket];
      if (websocket._socket[kWebSocket] !== void 0) {
        websocket._socket.removeListener("data", socketOnData);
        process.nextTick(resume, websocket._socket);
        websocket.close(err[kStatusCode]);
      }
      if (!websocket._errorEmitted) {
        websocket._errorEmitted = true;
        websocket.emit("error", err);
      }
    }
    function receiverOnFinish() {
      this[kWebSocket].emitClose();
    }
    function receiverOnMessage(data2, isBinary) {
      this[kWebSocket].emit("message", data2, isBinary);
    }
    function receiverOnPing(data2) {
      const websocket = this[kWebSocket];
      if (websocket._autoPong) websocket.pong(data2, !this._isServer, NOOP);
      websocket.emit("ping", data2);
    }
    function receiverOnPong(data2) {
      this[kWebSocket].emit("pong", data2);
    }
    function resume(stream) {
      stream.resume();
    }
    function senderOnError(err) {
      const websocket = this[kWebSocket];
      if (websocket.readyState === WebSocket2.CLOSED) return;
      if (websocket.readyState === WebSocket2.OPEN) {
        websocket._readyState = WebSocket2.CLOSING;
        setCloseTimer(websocket);
      }
      this._socket.end();
      if (!websocket._errorEmitted) {
        websocket._errorEmitted = true;
        websocket.emit("error", err);
      }
    }
    function setCloseTimer(websocket) {
      websocket._closeTimer = setTimeout(
        websocket._socket.destroy.bind(websocket._socket),
        websocket._closeTimeout
      );
    }
    function socketOnClose() {
      const websocket = this[kWebSocket];
      this.removeListener("close", socketOnClose);
      this.removeListener("data", socketOnData);
      this.removeListener("end", socketOnEnd);
      websocket._readyState = WebSocket2.CLOSING;
      if (!this._readableState.endEmitted && !websocket._closeFrameReceived && !websocket._receiver._writableState.errorEmitted && this._readableState.length !== 0) {
        const chunk = this.read(this._readableState.length);
        websocket._receiver.write(chunk);
      }
      websocket._receiver.end();
      this[kWebSocket] = void 0;
      clearTimeout(websocket._closeTimer);
      if (websocket._receiver._writableState.finished || websocket._receiver._writableState.errorEmitted) {
        websocket.emitClose();
      } else {
        websocket._receiver.on("error", receiverOnFinish);
        websocket._receiver.on("finish", receiverOnFinish);
      }
    }
    function socketOnData(chunk) {
      if (!this[kWebSocket]._receiver.write(chunk)) {
        this.pause();
      }
    }
    function socketOnEnd() {
      const websocket = this[kWebSocket];
      websocket._readyState = WebSocket2.CLOSING;
      websocket._receiver.end();
      this.end();
    }
    function socketOnError() {
      const websocket = this[kWebSocket];
      this.removeListener("error", socketOnError);
      this.on("error", NOOP);
      if (websocket) {
        websocket._readyState = WebSocket2.CLOSING;
        this.destroy();
      }
    }
  }
});

// ../wordpress-preview-2026-10-22/runtime/tooling/node_modules/ws/lib/stream.js
var require_stream = __commonJS({
  "../wordpress-preview-2026-10-22/runtime/tooling/node_modules/ws/lib/stream.js"(exports2, module2) {
    "use strict";
    var WebSocket2 = require_websocket();
    var { Duplex } = require("stream");
    function emitClose(stream) {
      stream.emit("close");
    }
    function duplexOnEnd() {
      if (!this.destroyed && this._writableState.finished) {
        this.destroy();
      }
    }
    function duplexOnError(err) {
      this.removeListener("error", duplexOnError);
      this.destroy();
      if (this.listenerCount("error") === 0) {
        this.emit("error", err);
      }
    }
    function createWebSocketStream2(ws, options) {
      let terminateOnDestroy = true;
      const duplex = new Duplex({
        ...options,
        autoDestroy: false,
        emitClose: false,
        objectMode: false,
        writableObjectMode: false
      });
      ws.on("message", function message(msg, isBinary) {
        const data2 = !isBinary && duplex._readableState.objectMode ? msg.toString() : msg;
        if (!duplex.push(data2)) ws.pause();
      });
      ws.once("error", function error(err) {
        if (duplex.destroyed) return;
        terminateOnDestroy = false;
        duplex.destroy(err);
      });
      ws.once("close", function close() {
        if (duplex.destroyed) return;
        duplex.push(null);
      });
      duplex._destroy = function(err, callback) {
        if (ws.readyState === ws.CLOSED) {
          callback(err);
          process.nextTick(emitClose, duplex);
          return;
        }
        let called = false;
        ws.once("error", function error(err2) {
          called = true;
          callback(err2);
        });
        ws.once("close", function close() {
          if (!called) callback(err);
          process.nextTick(emitClose, duplex);
        });
        if (terminateOnDestroy) ws.terminate();
      };
      duplex._final = function(callback) {
        if (ws.readyState === ws.CONNECTING) {
          ws.once("open", function open() {
            duplex._final(callback);
          });
          return;
        }
        if (ws._socket === null) return;
        if (ws._socket._writableState.finished) {
          callback();
          if (duplex._readableState.endEmitted) duplex.destroy();
        } else {
          ws._socket.once("finish", function finish() {
            callback();
          });
          ws.close();
        }
      };
      duplex._read = function() {
        if (ws.isPaused) ws.resume();
      };
      duplex._write = function(chunk, encoding, callback) {
        if (ws.readyState === ws.CONNECTING) {
          ws.once("open", function open() {
            duplex._write(chunk, encoding, callback);
          });
          return;
        }
        ws.send(chunk, callback);
      };
      duplex.on("end", duplexOnEnd);
      duplex.on("error", duplexOnError);
      return duplex;
    }
    module2.exports = createWebSocketStream2;
  }
});

// ../wordpress-preview-2026-10-22/runtime/tooling/node_modules/ws/lib/subprotocol.js
var require_subprotocol = __commonJS({
  "../wordpress-preview-2026-10-22/runtime/tooling/node_modules/ws/lib/subprotocol.js"(exports2, module2) {
    "use strict";
    var { tokenChars } = require_validation();
    function parse2(header) {
      const protocols = /* @__PURE__ */ new Set();
      let start = -1;
      let end = -1;
      let i = 0;
      for (i; i < header.length; i++) {
        const code = header.charCodeAt(i);
        if (end === -1 && tokenChars[code] === 1) {
          if (start === -1) start = i;
        } else if (i !== 0 && (code === 32 || code === 9)) {
          if (end === -1 && start !== -1) end = i;
        } else if (code === 44) {
          if (start === -1) {
            throw new SyntaxError(`Unexpected character at index ${i}`);
          }
          if (end === -1) end = i;
          const protocol2 = header.slice(start, end);
          if (protocols.has(protocol2)) {
            throw new SyntaxError(`The "${protocol2}" subprotocol is duplicated`);
          }
          protocols.add(protocol2);
          start = end = -1;
        } else {
          throw new SyntaxError(`Unexpected character at index ${i}`);
        }
      }
      if (start === -1 || end !== -1) {
        throw new SyntaxError("Unexpected end of input");
      }
      const protocol = header.slice(start, i);
      if (protocols.has(protocol)) {
        throw new SyntaxError(`The "${protocol}" subprotocol is duplicated`);
      }
      protocols.add(protocol);
      return protocols;
    }
    module2.exports = { parse: parse2 };
  }
});

// ../wordpress-preview-2026-10-22/runtime/tooling/node_modules/ws/lib/websocket-server.js
var require_websocket_server = __commonJS({
  "../wordpress-preview-2026-10-22/runtime/tooling/node_modules/ws/lib/websocket-server.js"(exports2, module2) {
    "use strict";
    var EventEmitter = require("events");
    var http2 = require("http");
    var { Duplex } = require("stream");
    var { createHash } = require("crypto");
    var extension2 = require_extension();
    var PerMessageDeflate2 = require_permessage_deflate();
    var subprotocol2 = require_subprotocol();
    var WebSocket2 = require_websocket();
    var { CLOSE_TIMEOUT, GUID, kWebSocket } = require_constants();
    var keyRegex = /^[+/0-9A-Za-z]{22}==$/;
    var RUNNING = 0;
    var CLOSING = 1;
    var CLOSED = 2;
    var WebSocketServer2 = class extends EventEmitter {
      /**
       * Create a `WebSocketServer` instance.
       *
       * @param {Object} options Configuration options
       * @param {Boolean} [options.allowSynchronousEvents=true] Specifies whether
       *     any of the `'message'`, `'ping'`, and `'pong'` events can be emitted
       *     multiple times in the same tick
       * @param {Boolean} [options.autoPong=true] Specifies whether or not to
       *     automatically send a pong in response to a ping
       * @param {Number} [options.backlog=511] The maximum length of the queue of
       *     pending connections
       * @param {Boolean} [options.clientTracking=true] Specifies whether or not to
       *     track clients
       * @param {Number} [options.closeTimeout=30000] Duration in milliseconds to
       *     wait for the closing handshake to finish after `websocket.close()` is
       *     called
       * @param {Function} [options.handleProtocols] A hook to handle protocols
       * @param {String} [options.host] The hostname where to bind the server
       * @param {Number} [options.maxBufferedChunks=1048576] The maximum number of
       *     buffered data chunks
       * @param {Number} [options.maxFragments=131072] The maximum number of message
       *     fragments
       * @param {Number} [options.maxPayload=104857600] The maximum allowed message
       *     size
       * @param {Boolean} [options.noServer=false] Enable no server mode
       * @param {String} [options.path] Accept only connections matching this path
       * @param {(Boolean|Object)} [options.perMessageDeflate=false] Enable/disable
       *     permessage-deflate
       * @param {Number} [options.port] The port where to bind the server
       * @param {(http.Server|https.Server)} [options.server] A pre-created HTTP/S
       *     server to use
       * @param {Boolean} [options.skipUTF8Validation=false] Specifies whether or
       *     not to skip UTF-8 validation for text and close messages
       * @param {Function} [options.verifyClient] A hook to reject connections
       * @param {Function} [options.WebSocket=WebSocket] Specifies the `WebSocket`
       *     class to use. It must be the `WebSocket` class or class that extends it
       * @param {Function} [callback] A listener for the `listening` event
       */
      constructor(options, callback) {
        super();
        options = {
          allowSynchronousEvents: true,
          autoPong: true,
          maxBufferedChunks: 1024 * 1024,
          maxFragments: 128 * 1024,
          maxPayload: 100 * 1024 * 1024,
          skipUTF8Validation: false,
          perMessageDeflate: false,
          handleProtocols: null,
          clientTracking: true,
          closeTimeout: CLOSE_TIMEOUT,
          verifyClient: null,
          noServer: false,
          backlog: null,
          // use default (511 as implemented in net.js)
          server: null,
          host: null,
          path: null,
          port: null,
          WebSocket: WebSocket2,
          ...options
        };
        if (options.port == null && !options.server && !options.noServer || options.port != null && (options.server || options.noServer) || options.server && options.noServer) {
          throw new TypeError(
            'One and only one of the "port", "server", or "noServer" options must be specified'
          );
        }
        if (options.port != null) {
          this._server = http2.createServer((req, res) => {
            const body = http2.STATUS_CODES[426];
            res.writeHead(426, {
              "Content-Length": body.length,
              "Content-Type": "text/plain"
            });
            res.end(body);
          });
          this._server.listen(
            options.port,
            options.host,
            options.backlog,
            callback
          );
        } else if (options.server) {
          this._server = options.server;
        }
        if (this._server) {
          const emitConnection = this.emit.bind(this, "connection");
          this._removeListeners = addListeners(this._server, {
            listening: this.emit.bind(this, "listening"),
            error: this.emit.bind(this, "error"),
            upgrade: (req, socket, head) => {
              this.handleUpgrade(req, socket, head, emitConnection);
            }
          });
        }
        if (options.perMessageDeflate === true) options.perMessageDeflate = {};
        if (options.clientTracking) {
          this.clients = /* @__PURE__ */ new Set();
          this._shouldEmitClose = false;
        }
        this.options = options;
        this._state = RUNNING;
      }
      /**
       * Returns the bound address, the address family name, and port of the server
       * as reported by the operating system if listening on an IP socket.
       * If the server is listening on a pipe or UNIX domain socket, the name is
       * returned as a string.
       *
       * @return {(Object|String|null)} The address of the server
       * @public
       */
      address() {
        if (this.options.noServer) {
          throw new Error('The server is operating in "noServer" mode');
        }
        if (!this._server) return null;
        return this._server.address();
      }
      /**
       * Stop the server from accepting new connections and emit the `'close'` event
       * when all existing connections are closed.
       *
       * @param {Function} [cb] A one-time listener for the `'close'` event
       * @public
       */
      close(cb) {
        if (this._state === CLOSED) {
          if (cb) {
            this.once("close", () => {
              cb(new Error("The server is not running"));
            });
          }
          process.nextTick(emitClose, this);
          return;
        }
        if (cb) this.once("close", cb);
        if (this._state === CLOSING) return;
        this._state = CLOSING;
        if (this.options.noServer || this.options.server) {
          if (this._server) {
            this._removeListeners();
            this._removeListeners = this._server = null;
          }
          if (this.clients) {
            if (!this.clients.size) {
              process.nextTick(emitClose, this);
            } else {
              this._shouldEmitClose = true;
            }
          } else {
            process.nextTick(emitClose, this);
          }
        } else {
          const server = this._server;
          this._removeListeners();
          this._removeListeners = this._server = null;
          server.close(() => {
            emitClose(this);
          });
        }
      }
      /**
       * See if a given request should be handled by this server instance.
       *
       * @param {http.IncomingMessage} req Request object to inspect
       * @return {Boolean} `true` if the request is valid, else `false`
       * @public
       */
      shouldHandle(req) {
        if (this.options.path) {
          const index = req.url.indexOf("?");
          const pathname = index !== -1 ? req.url.slice(0, index) : req.url;
          if (pathname !== this.options.path) return false;
        }
        return true;
      }
      /**
       * Handle a HTTP Upgrade request.
       *
       * @param {http.IncomingMessage} req The request object
       * @param {Duplex} socket The network socket between the server and client
       * @param {Buffer} head The first packet of the upgraded stream
       * @param {Function} cb Callback
       * @public
       */
      handleUpgrade(req, socket, head, cb) {
        socket.on("error", socketOnError);
        const key = req.headers["sec-websocket-key"];
        const upgrade = req.headers.upgrade;
        const version = +req.headers["sec-websocket-version"];
        if (req.method !== "GET") {
          const message = "Invalid HTTP method";
          abortHandshakeOrEmitwsClientError(this, req, socket, 405, message);
          return;
        }
        if (upgrade === void 0 || upgrade.toLowerCase() !== "websocket") {
          const message = "Invalid Upgrade header";
          abortHandshakeOrEmitwsClientError(this, req, socket, 400, message);
          return;
        }
        if (key === void 0 || !keyRegex.test(key)) {
          const message = "Missing or invalid Sec-WebSocket-Key header";
          abortHandshakeOrEmitwsClientError(this, req, socket, 400, message);
          return;
        }
        if (version !== 13 && version !== 8) {
          const message = "Missing or invalid Sec-WebSocket-Version header";
          abortHandshakeOrEmitwsClientError(this, req, socket, 400, message, {
            "Sec-WebSocket-Version": "13, 8"
          });
          return;
        }
        if (!this.shouldHandle(req)) {
          abortHandshake(socket, 400);
          return;
        }
        const secWebSocketProtocol = req.headers["sec-websocket-protocol"];
        let protocols = /* @__PURE__ */ new Set();
        if (secWebSocketProtocol !== void 0) {
          try {
            protocols = subprotocol2.parse(secWebSocketProtocol);
          } catch (err) {
            const message = "Invalid Sec-WebSocket-Protocol header";
            abortHandshakeOrEmitwsClientError(this, req, socket, 400, message);
            return;
          }
        }
        const secWebSocketExtensions = req.headers["sec-websocket-extensions"];
        const extensions = {};
        if (this.options.perMessageDeflate && secWebSocketExtensions !== void 0) {
          const perMessageDeflate = new PerMessageDeflate2({
            ...this.options.perMessageDeflate,
            isServer: true,
            maxPayload: this.options.maxPayload
          });
          try {
            const offers = extension2.parse(secWebSocketExtensions);
            if (offers[PerMessageDeflate2.extensionName]) {
              perMessageDeflate.accept(offers[PerMessageDeflate2.extensionName]);
              extensions[PerMessageDeflate2.extensionName] = perMessageDeflate;
            }
          } catch (err) {
            const message = "Invalid or unacceptable Sec-WebSocket-Extensions header";
            abortHandshakeOrEmitwsClientError(this, req, socket, 400, message);
            return;
          }
        }
        if (this.options.verifyClient) {
          const info = {
            origin: req.headers[`${version === 8 ? "sec-websocket-origin" : "origin"}`],
            secure: !!(req.socket.authorized || req.socket.encrypted),
            req
          };
          if (this.options.verifyClient.length === 2) {
            this.options.verifyClient(info, (verified, code, message, headers) => {
              if (!verified) {
                return abortHandshake(socket, code || 401, message, headers);
              }
              this.completeUpgrade(
                extensions,
                key,
                protocols,
                req,
                socket,
                head,
                cb
              );
            });
            return;
          }
          if (!this.options.verifyClient(info)) return abortHandshake(socket, 401);
        }
        this.completeUpgrade(extensions, key, protocols, req, socket, head, cb);
      }
      /**
       * Upgrade the connection to WebSocket.
       *
       * @param {Object} extensions The accepted extensions
       * @param {String} key The value of the `Sec-WebSocket-Key` header
       * @param {Set} protocols The subprotocols
       * @param {http.IncomingMessage} req The request object
       * @param {Duplex} socket The network socket between the server and client
       * @param {Buffer} head The first packet of the upgraded stream
       * @param {Function} cb Callback
       * @throws {Error} If called more than once with the same socket
       * @private
       */
      completeUpgrade(extensions, key, protocols, req, socket, head, cb) {
        if (!socket.readable || !socket.writable) return socket.destroy();
        if (socket[kWebSocket]) {
          throw new Error(
            "server.handleUpgrade() was called more than once with the same socket, possibly due to a misconfiguration"
          );
        }
        if (this._state > RUNNING) return abortHandshake(socket, 503);
        const digest = createHash("sha1").update(key + GUID).digest("base64");
        const headers = [
          "HTTP/1.1 101 Switching Protocols",
          "Upgrade: websocket",
          "Connection: Upgrade",
          `Sec-WebSocket-Accept: ${digest}`
        ];
        const ws = new this.options.WebSocket(null, void 0, this.options);
        if (protocols.size) {
          const protocol = this.options.handleProtocols ? this.options.handleProtocols(protocols, req) : protocols.values().next().value;
          if (protocol) {
            headers.push(`Sec-WebSocket-Protocol: ${protocol}`);
            ws._protocol = protocol;
          }
        }
        if (extensions[PerMessageDeflate2.extensionName]) {
          const params = extensions[PerMessageDeflate2.extensionName].params;
          const value = extension2.format({
            [PerMessageDeflate2.extensionName]: [params]
          });
          headers.push(`Sec-WebSocket-Extensions: ${value}`);
          ws._extensions = extensions;
        }
        this.emit("headers", headers, req);
        socket.write(headers.concat("\r\n").join("\r\n"));
        socket.removeListener("error", socketOnError);
        ws.setSocket(socket, head, {
          allowSynchronousEvents: this.options.allowSynchronousEvents,
          maxBufferedChunks: this.options.maxBufferedChunks,
          maxFragments: this.options.maxFragments,
          maxPayload: this.options.maxPayload,
          skipUTF8Validation: this.options.skipUTF8Validation
        });
        if (this.clients) {
          this.clients.add(ws);
          ws.on("close", () => {
            this.clients.delete(ws);
            if (this._shouldEmitClose && !this.clients.size) {
              process.nextTick(emitClose, this);
            }
          });
        }
        cb(ws, req);
      }
    };
    module2.exports = WebSocketServer2;
    function addListeners(server, map) {
      for (const event of Object.keys(map)) server.on(event, map[event]);
      return function removeListeners() {
        for (const event of Object.keys(map)) {
          server.removeListener(event, map[event]);
        }
      };
    }
    function emitClose(server) {
      server._state = CLOSED;
      server.emit("close");
    }
    function socketOnError() {
      this.destroy();
    }
    function abortHandshake(socket, code, message, headers) {
      message = message || http2.STATUS_CODES[code];
      headers = {
        Connection: "close",
        "Content-Type": "text/html",
        "Content-Length": Buffer.byteLength(message),
        ...headers
      };
      socket.once("finish", socket.destroy);
      socket.end(
        `HTTP/1.1 ${code} ${http2.STATUS_CODES[code]}\r
` + Object.keys(headers).map((h3) => `${h3}: ${headers[h3]}`).join("\r\n") + "\r\n\r\n" + message
      );
    }
    function abortHandshakeOrEmitwsClientError(server, req, socket, code, message, headers) {
      if (server.listenerCount("wsClientError")) {
        const err = new Error(message);
        Error.captureStackTrace(err, abortHandshakeOrEmitwsClientError);
        server.emit("wsClientError", err, socket, req);
      } else {
        abortHandshake(socket, code, message, headers);
      }
    }
  }
});

// ../wordpress-preview-2026-10-22/runtime/tooling/node_modules/@wp-playground/wordpress/zstddec-stream.modern-C2FJ34ZP.js
var zstddec_stream_modern_C2FJ34ZP_exports = {};
__export(zstddec_stream_modern_C2FJ34ZP_exports, {
  ZSTDDecoder: () => a
});
var y3, A4, w3, Q2, L2, a, R3;
var init_zstddec_stream_modern_C2FJ34ZP = __esm({
  "../wordpress-preview-2026-10-22/runtime/tooling/node_modules/@wp-playground/wordpress/zstddec-stream.modern-C2FJ34ZP.js"() {
    L2 = {
      env: {
        emscripten_notify_memory_growth: (Y3) => {
          w3 = new Uint8Array(A4.exports.memory.buffer), Q2 = new DataView(w3.buffer);
        }
      }
    };
    a = class {
      init() {
        return y3 || (typeof fetch < "u" ? y3 = fetch(`data:application/wasm;base64,${R3}`).then((g2) => g2.arrayBuffer()).then((g2) => WebAssembly.instantiate(g2, L2)).then(this._init) : y3 = WebAssembly.instantiate(Buffer.from(R3, "base64"), L2).then(this._init), y3);
      }
      _init(g2) {
        A4 = g2.instance, L2.env.emscripten_notify_memory_growth(0);
      }
      decode(g2, G2 = 0) {
        if (!A4) throw new Error("ZSTDDecoder: Await .init() before decoding.");
        const N2 = g2.byteLength, o = A4.exports.malloc(N2);
        if (w3.set(g2, o), G2 === 0 && (G2 = Number(A4.exports.ZSTD_findDecompressedSize(o, N2))), G2 === -1) {
          A4.exports.free(o);
          const I4 = [];
          for (const C3 of this.decodeStreaming([g2]))
            I4.push(C3);
          if (I4.length === 1)
            return I4[0];
          const i = I4.reduce((C3, S3) => C3 + S3.byteLength, 0), D2 = new Uint8Array(i);
          let s = 0;
          for (const C3 of I4)
            D2.set(C3, s), s += C3.byteLength;
          return D2;
        }
        const E5 = A4.exports.malloc(G2), F2 = A4.exports.ZSTD_decompress(E5, G2, o, N2), B = w3.slice(E5, E5 + F2);
        return A4.exports.free(o), A4.exports.free(E5), B;
      }
      *decodeStreaming(g2) {
        if (!A4) throw new Error("ZSTDDecoder: Await .init() before decoding.");
        const G2 = A4.exports.ZSTD_DStreamInSize(), N2 = A4.exports.malloc(G2), o = A4.exports.ZSTD_DStreamOutSize(), E5 = A4.exports.malloc(o), F2 = A4.exports.ZSTD_createDCtx(), B = 4, I4 = 4, i = A4.exports.malloc(B + I4 * 2), D2 = A4.exports.malloc(B + I4 * 2);
        let s = 0;
        for (const C3 of g2) {
          const S3 = A4.exports.malloc(C3.byteLength);
          for (w3.set(C3, S3), Q2.setInt32(i, S3, true), Q2.setInt32(i + B, C3.byteLength, true), Q2.setInt32(i + B + I4, 0, true); Q2.getUint32(i + B + I4, true) < Q2.getUint32(i + B, true); ) {
            Q2.setInt32(D2, E5, true), Q2.setInt32(D2 + B, o, true), Q2.setInt32(D2 + B + I4, 0, true), s = A4.exports.ZSTD_decompressStream(F2, D2, i);
            const h3 = Q2.getUint32(D2 + B + I4, true);
            yield w3.slice(E5, E5 + h3);
          }
          A4.exports.free(S3);
        }
        if (A4.exports.ZSTD_freeDCtx(F2), A4.exports.free(N2), A4.exports.free(E5), A4.exports.free(i), A4.exports.free(D2), s !== 0)
          throw new Error("Incomplete stream, more data expected.");
      }
    };
    R3 = "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QQhyIQBBACEDA0AgACADTQ0DIANBQGshAwwACwALQWwhCiAOIA5B/ABqIA5B+ABqIAUgBhAGIgJBiH9LDQEgDigCeCIDIARLDQEgACAOIA4oAnwgByAIIAMgDRAlIAEgADYCACACIQoMAQtBbCEKCyAOQYABaiQAIAoLcAEEfyAAQgA3AgAgAgRAIAFBCmohBiABKAIEIQRBACECQQAhAQNAIAEgBHZFBEAgAiAGIAFBA3RqLQAAIgUgAiAFSxshAiABQQFqIQEgAyAFQRZLaiEDDAELCyAAIAI2AgQgACADQQggBGt0NgIACwuuAQEEfyABIAIoAgQiAyABKAIEaiIENgIEIAAgA0ECdEGwGWooAgAgASgCAEEAIARrdnE2AgACQCAEQSFPBEAgAUGwGjYCCAwBCyABKAIIIgMgASgCEE8EQCABEAwMAQsgAyABKAIMIgVGDQAgASADIAMgBWsgBEEDdiIGIAMgBmsgBUkbIgNrIgU2AgggASAEIANBA3RrNgIEIAEgBSgAADYCAAsgACACQQhqNgIEC40CAgN/AX4gACACaiEEAkACQCACQQhOBEAgACABayICQXlIDQELA0AgACAETw0CIAAgAS0AADoAACAAQQFqIQAgAUEBaiEBDAALAAsCQAJAIAJBb0sNACAAIARBIGsiAksNACABKQAAIQYgACABKQAINwAIIAAgBjcAACACIABrIgVBEU4EQCAAQRBqIQAgASEDA0AgAykAECEGIAAgAykAGDcACCAAIAY3AAAgAykAICEGIAAgAykAKDcAGCAAIAY3ABAgA0EgaiEDIABBIGoiACACSQ0ACwsgASAFaiEBDAELIAAhAgsDQCACIARPDQEgAiABLQAAOgAAIAJBAWohAiABQQFqIQEMAAsACwvfAQEGf0G6fyEKAkAgAigCBCIIIAIoAgAiCWoiDSABIABrSw0AQWwhCiAJIAQgAygCACILa0sNACAAIAlqIgQgAigCCCIMayECIAAgAUEgayIBIAsgCUEAEDMgAyAJIAtqNgIAAkACQCAEIAVrIAxPBEAgAiEFDAELIAwgBCAGa0sNAiAHIAcgAiAFayIDaiICIAhqTwRAIAhFDQIgBCACIAj8CgAADAILQQAgA2siAARAIAQgAiAA/AoAAAsgAyAIaiEIIAQgA2shBAsgBCABIAUgCEEBEDML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";
  }
});

// server-source.mjs
var server_source_exports = {};
__export(server_source_exports, {
  allowedPath: () => allowedPath,
  default: () => preview
});
module.exports = __toCommonJS(server_source_exports);
var import_node_fs2 = __toESM(require("node:fs"), 1);
var import_node_path = __toESM(require("node:path"), 1);
var import_node_os2 = __toESM(require("node:os"), 1);
var import_node_crypto = require("node:crypto");

// ../wordpress-preview-2026-10-22/runtime/tooling/node_modules/@php-wasm/universal/index.js
var import_logger = __toESM(require_logger(), 1);

// ../wordpress-preview-2026-10-22/runtime/tooling/node_modules/@php-wasm/util/index.js
var w = Symbol("SleepFinished");
function p(i) {
  return new Promise((e) => {
    setTimeout(() => e(w), i);
  });
}
var b = class extends Error {
  constructor() {
    super("Acquiring lock timed out");
  }
};
var v = class {
  constructor({ concurrency: e, timeout: t }) {
    this._running = 0, this.concurrency = e, this.timeout = t, this.queue = [];
  }
  get remaining() {
    return this.concurrency - this.running;
  }
  get running() {
    return this._running;
  }
  async acquire() {
    if (this._running >= this.concurrency) {
      const t = new Promise((r) => {
        this.queue.push(r);
      });
      if (this.timeout !== void 0) {
        const r = this.queue.at(-1);
        if (await Promise.race([
          t,
          p(this.timeout)
        ]) === w)
          throw this.queue.splice(this.queue.indexOf(r), 1), new b();
      } else
        await t;
    }
    this._running++;
    let e = false;
    return () => {
      e || (e = true, this._running--, this.queue.length > 0 && this.queue.shift()());
    };
  }
  async run(e) {
    const t = await this.acquire();
    try {
      return await e();
    } finally {
      t();
    }
  }
};
function m(...i) {
  function e(o) {
    return o.substring(o.length - 1) === "/";
  }
  let t = i.join("/");
  const r = t[0] === "/", s = e(t);
  return t = c(t), !t && !r && (t = "."), t && s && !e(t) && (t += "/"), t;
}
function I(i, e) {
  if (i.includes("\0") || e.includes("\0"))
    return;
  const t = c(e);
  if (!t)
    return;
  const r = c(
    i.startsWith("/") ? i : m(t, i)
  );
  if (!(r === t || !P(t, r)))
    return r;
}
function W(i) {
  if (i === "/")
    return "/";
  i = c(i);
  const e = i.lastIndexOf("/");
  return e === -1 ? "" : e === 0 ? "/" : i.substr(0, e);
}
function j(i) {
  if (i === "/")
    return "/";
  i = c(i);
  const e = i.lastIndexOf("/");
  return e === -1 ? i : i.substr(e + 1);
}
function c(i) {
  const e = i[0] === "/";
  return i = E(
    i.split("/").filter((t) => !!t),
    !e
  ).join("/"), (e ? "/" : "") + i.replace(/\/$/, "");
}
function E(i, e) {
  let t = 0;
  for (let r = i.length - 1; r >= 0; r--) {
    const s = i[r];
    s === "." ? i.splice(r, 1) : s === ".." ? (i.splice(r, 1), t++) : t && (i.splice(r, 1), t--);
  }
  if (e)
    for (; t; t--)
      i.unshift("..");
  return i;
}
function P(i, e) {
  return i === "/" ? true : (i = c(i), e = c(e), e.startsWith(i + "/") || e === i);
}
function H(i) {
  let e = i.replaceAll("\\", "/");
  const t = e.match(/^([A-Za-z]):\//);
  return t && (e = "/" + t[1] + e.slice(2)), e;
}
var g = class {
  constructor() {
    this.listeners = {};
  }
  emit(e, t) {
    this.listeners[e] && this.listeners[e].forEach(function(r) {
      r(t);
    });
  }
  on(e, t) {
    this.listeners[e] || (this.listeners[e] = []), this.listeners[e].push(t);
  }
  once(e, t) {
    const r = (...s) => {
      this.off(e, r), t(...s);
    };
    this.on(e, r);
  }
  off(e, t) {
    this.listeners[e] && (this.listeners[e] = this.listeners[e].filter(
      (r) => r !== t
    ));
  }
};
function x(i) {
  let r = 0, s = "";
  const o = [];
  let n = "";
  for (let l = 0; l < i.length; l++) {
    const u2 = i[l];
    u2 === "\\" ? ((i[l + 1] === '"' || i[l + 1] === "'") && l++, n += i[l]) : r === 0 ? u2 === '"' || u2 === "'" ? (r = 1, s = u2) : u2.match(/\s/) ? (n.trim().length && o.push(n.trim()), n = u2) : o.length && !n ? n = o.pop() + u2 : n += u2 : r === 1 && (u2 === s ? (r = 0, s = "") : n += u2);
  }
  return n && o.push(n.trim()), o;
}
var h = class extends g {
  constructor(e) {
    if (super(), this.buffer = [], this.writing = false, this.ended = false, this.length = 0, !e.write)
      throw new Error("WritablePolyfill requires write option");
    this._write = e.write, this.highWaterMark = e.highWaterMark ?? 16 * 1024, this.decodeStrings = e.decodeStrings ?? true, this.defaultEncoding = e.defaultEncoding ?? "utf8", this.defer = typeof queueMicrotask == "function" ? queueMicrotask : (t) => setTimeout(t, 0);
  }
  write(e, t = this.defaultEncoding, r = () => {
  }) {
    if (typeof t == "function" && (r = t, t = this.defaultEncoding), this.ended) {
      const o = new Error("write after end"), n = this.defer;
      return n(() => r(o)), this.emit("error", o), false;
    }
    if (this.decodeStrings && typeof e == "string") {
      if (typeof Buffer < "u" && typeof Buffer.from == "function")
        e = Buffer.from(e, t);
      else if (typeof TextEncoder < "u")
        e = new TextEncoder().encode(e);
      else
        throw new Error(
          "String chunks are not supported in this environment: Buffer and TextEncoder are unavailable."
        );
      t = "buffer";
    }
    this.length += e.length ?? 1;
    const s = this.length >= this.highWaterMark;
    return this.buffer.push({ chunk: e, encoding: t, cb: r }), this.writing || this._clearBuffer(), !s;
  }
  end(e, t, r) {
    typeof e == "function" ? (r = e, e = void 0) : typeof t == "function" && (r = t, t = void 0), e !== void 0 && this.write(e, t, () => {
    }), this.ended = true, this.writing || this._clearBuffer(), r && this.defer(r);
  }
  // Stubs kept for API parity; add logic if you depend on corking.
  cork() {
  }
  uncork() {
  }
  setDefaultEncoding(e) {
    return this.defaultEncoding = e, this;
  }
  _clearBuffer() {
    const e = this.buffer.shift();
    if (!e) {
      this.ended && this.emit("finish");
      return;
    }
    this.writing = true, this._write(e.chunk, e.encoding, (t) => {
      this.writing = false, this.length -= e.chunk.length ?? 1, t && this.emit("error", t), e.cb(t), this.buffer.length ? this._clearBuffer() : (this.length < this.highWaterMark && this.emit("drain"), this.ended && this.emit("finish"));
    });
  }
};
function S(i) {
  return function(e, t = [], r = {}) {
    const s = new T(), o = new _(s);
    return setTimeout(async () => {
      let n = [];
      if (t.length)
        n = [e, ...t];
      else if (typeof e == "string")
        n = x(e);
      else if (Array.isArray(e))
        n = e;
      else
        throw new Error("Invalid command ", e);
      try {
        const l = i(n, o, r);
        if (typeof l != "object" || l === null || !("then" in l))
          throw new Error(
            `The program callback passed to createSpawnHandler() did not return a promise. It indicates there's a bug in your code. The callback must return a promise. PHP cannot interact with program that synchronously exists at the end of the proc_open() call. All the streams would be closed already. Make sure to put an "await new Promise(resolve => setTimeout(resolve, 1))before calling processApi.exit(0) in your callback to let PHP catch up with the stdout data.`
          );
        if (o.exited)
          throw new Error(
            `The program callback passed to createSpawnHandler() exited synchronously. It indicates there's a bug in your code. The callback must return a promise. PHP cannot interact with program that synchronously exists at the end of the proc_open() call. All the streams would be closed already. Make sure to put an "await new Promise(resolve => setTimeout(resolve, 1))before calling processApi.exit(0) in your callback to let PHP catch up with the stdout data.`
          );
        s.emit("spawn", true), await l;
      } catch (l) {
        s.emit("error", l), typeof l == "object" && l !== null && "message" in l && typeof l.message == "string" && o.stderr(l.message), o.exit(1);
      }
    }), s;
  };
}
var _ = class extends g {
  constructor(e) {
    super(), this.exited = false, this.stdinBuffer = [], this.childProcess = e, e.on("stdin", (t) => {
      this.stdinBuffer ? this.stdinBuffer.push(t.slice()) : this.emit("stdin", t);
    });
  }
  stdinEnd() {
    this.childProcess.stdin.ended || this.childProcess.stdin.end();
  }
  stdout(e) {
    this.childProcess.stdout.write(e);
  }
  stdoutEnd() {
    this.childProcess.stdout.ended || this.childProcess.stdout.end();
  }
  stderr(e) {
    this.childProcess.stderr.write(e);
  }
  stderrEnd() {
    this.childProcess.stderr.ended || this.childProcess.stderr.end();
  }
  notifySpawn() {
    this.childProcess.emit("spawn", true);
  }
  exit(e) {
    this.exited || (this.exited = true, this.stdinEnd(), this.stdoutEnd(), this.stderrEnd(), this.childProcess.emit("exit", e));
  }
  on(e, t) {
    if (super.on(e, t), e === "stdin" && this.stdinBuffer) {
      for (let r = 0; r < this.stdinBuffer.length; r++)
        this.emit("stdin", this.stdinBuffer[r]);
      this.stdinBuffer = null;
    }
  }
};
var M = 9743;
var T = class extends g {
  constructor(e = M++) {
    super(), this.pid = e;
    const t = this;
    this.stdout = new h({
      write(r, s, o) {
        t.stdout.emit("data", r), o();
      }
    }), this.stderr = new h({
      write: (r, s, o) => {
        t.stderr.emit("data", r), o();
      }
    }), this.stdin = new h({
      write: (r, s, o) => {
        t.emit("stdin", r), o();
      }
    });
  }
};
var A = Symbol.for(
  "@php-wasm/php-event-stdin-transfer"
);
var d = 20 * 1024 * 1024;
function O(i) {
  return U(new TextEncoder().encode(i));
}
function U(i) {
  const t = [];
  for (let r = 0; r < i.length; r += 65536)
    t.push(String.fromCharCode(...i.subarray(r, r + 65536)));
  return btoa(t.join(""));
}
function q(i) {
  return `json_decode(base64_decode('${O(
    JSON.stringify(i)
  )}'), true)`;
}
function L(i) {
  const e = {};
  for (const t in i)
    e[t] = q(i[t]);
  return e;
}

// ../wordpress-preview-2026-10-22/runtime/tooling/node_modules/@php-wasm/universal/index.js
var import_ini = __toESM(require_ini(), 1);

// ../wordpress-preview-2026-10-22/runtime/tooling/node_modules/@php-wasm/stream-compression/index.js
function U2(...e) {
  const r = new Uint8Array(
    e.reduce((n, a2) => n + a2.length, 0)
  );
  let t = 0;
  for (const n of e)
    r.set(n, t), t += n.length;
  return r;
}
function S2(e) {
  if (e === void 0) {
    let r = new Uint8Array();
    return new TransformStream({
      transform(t) {
        r = U2(r, t);
      },
      flush(t) {
        t.enqueue(r);
      }
    });
  } else {
    const r = new ArrayBuffer(e || 0);
    let t = 0;
    return new TransformStream({
      transform(n) {
        new Uint8Array(r).set(n, t), t += n.byteLength;
      },
      flush(n) {
        n.enqueue(new Uint8Array(r));
      }
    });
  }
}
function A2(e, r) {
  if (r === 0)
    return new ReadableStream({
      start(a2) {
        a2.close();
      }
    });
  const t = e.getReader({ mode: "byob" });
  let n = 0;
  return new ReadableStream({
    async pull(a2) {
      const { value: i, done: s } = await t.read(
        new Uint8Array(r - n)
      );
      if (s) {
        t.releaseLock(), a2.close();
        return;
      }
      n += i.length, a2.enqueue(i), n >= r && (t.releaseLock(), a2.close());
    },
    cancel() {
      t.cancel();
    }
  });
}
async function c2(e, r) {
  return r !== void 0 && (e = A2(e, r)), await e.pipeThrough(S2(r)).getReader().read().then(({ value: t }) => t);
}
var E2 = class _E extends File {
  static fromArrayBuffer(r, t, n) {
    return new _E(
      new ReadableStream({
        start(a2) {
          a2.enqueue(new Uint8Array(r)), a2.close();
        }
      }),
      t,
      n
    );
  }
  /**
   * Creates a new StreamedFile instance.
   *
   * @param readableStream The readable stream containing the file data.
   * @param name The name of the file.
   * @param options An object containing options such as the MIME type and file size.
   */
  constructor(r, t, n) {
    super([], t, { type: n == null ? void 0 : n.type }), this.readableStream = r, this.filesize = n == null ? void 0 : n.filesize;
  }
  /**
   * Overrides the slice() method of the File class.
   *
   * @returns A Blob representing a portion of the file.
   */
  slice() {
    throw new Error("slice() is not possible on a StreamedFile");
  }
  /**
   * Returns the readable stream associated with the file.
   *
   * @returns The readable stream.
   */
  stream() {
    return this.readableStream;
  }
  /**
   * Loads the file data into memory and then returns it as a string.
   *
   * @returns File data as text.
   */
  async text() {
    return new TextDecoder().decode(await this.arrayBuffer());
  }
  /**
   * Loads the file data into memory and then returns it as an ArrayBuffer.
   *
   * @returns File data as an ArrayBuffer.
   */
  async arrayBuffer() {
    return await c2(this.stream());
  }
};
ReadableStream.prototype[Symbol.asyncIterator] || (ReadableStream.prototype[Symbol.asyncIterator] = async function* () {
  const e = this.getReader();
  try {
    for (; ; ) {
      const { done: r, value: t } = await e.read();
      if (r)
        return;
      yield t;
    }
  } finally {
    e.releaseLock();
  }
}, ReadableStream.prototype.iterate = // @ts-ignore
ReadableStream.prototype[Symbol.asyncIterator]);
var I2 = 110 * 1024;
var z = 10 * 1024;
var V = 1024 * 1024 * 1;
var H2 = new v({ concurrency: 10 });

// ../wordpress-preview-2026-10-22/runtime/tooling/node_modules/@php-wasm/universal/index.js
var ve = (t) => {
  throw TypeError(t);
};
var me = (t, e, r) => e.has(t) || ve("Cannot " + r);
var u = (t, e, r) => (me(t, e, "read from private field"), r ? r.call(t) : e.get(t));
var _2 = (t, e, r) => e.has(t) ? ve("Cannot add the same private member more than once") : e instanceof WeakSet ? e.add(t) : e.set(t, r);
var x2 = (t, e, r, n) => (me(t, e, "write to private field"), n ? n.call(t, r) : e.set(t, r), r);
var v2 = (t, e, r) => (me(t, e, "access private method"), r);
var ErrnoError = class extends Error {
  constructor(e, r, n) {
    super(r, n), this.name = "ErrnoError", this.errno = e;
  }
};
var FileErrorCodes = {
  0: "No error occurred. System call completed successfully.",
  1: "Argument list too long.",
  2: "Permission denied.",
  3: "Address in use.",
  4: "Address not available.",
  5: "Address family not supported.",
  6: "Resource unavailable, or operation would block.",
  7: "Connection already in progress.",
  8: "Bad file descriptor.",
  9: "Bad message.",
  10: "Device or resource busy.",
  11: "Operation canceled.",
  12: "No child processes.",
  13: "Connection aborted.",
  14: "Connection refused.",
  15: "Connection reset.",
  16: "Resource deadlock would occur.",
  17: "Destination address required.",
  18: "Mathematics argument out of domain of function.",
  19: "Reserved.",
  20: "File exists.",
  21: "Bad address.",
  22: "File too large.",
  23: "Host is unreachable.",
  24: "Identifier removed.",
  25: "Illegal byte sequence.",
  26: "Operation in progress.",
  27: "Interrupted function.",
  28: "Invalid argument.",
  29: "I/O error.",
  30: "Socket is connected.",
  31: "There is a directory under that path.",
  32: "Too many levels of symbolic links.",
  33: "File descriptor value too large.",
  34: "Too many links.",
  35: "Message too large.",
  36: "Reserved.",
  37: "Filename too long.",
  38: "Network is down.",
  39: "Connection aborted by network.",
  40: "Network unreachable.",
  41: "Too many files open in system.",
  42: "No buffer space available.",
  43: "No such device.",
  44: "There is no such file or directory OR the parent directory does not exist.",
  45: "Executable file format error.",
  46: "No locks available.",
  47: "Reserved.",
  48: "Not enough space.",
  49: "No message of the desired type.",
  50: "Protocol not available.",
  51: "No space left on device.",
  52: "Function not supported.",
  53: "The socket is not connected.",
  54: "Not a directory or a symbolic link to a directory.",
  55: "Directory not empty.",
  56: "State not recoverable.",
  57: "Not a socket.",
  58: "Not supported, or operation not supported on socket.",
  59: "Inappropriate I/O control operation.",
  60: "No such device or address.",
  61: "Value too large to be stored in data type.",
  62: "Previous owner died.",
  63: "Operation not permitted.",
  64: "Broken pipe.",
  65: "Protocol error.",
  66: "Protocol not supported.",
  67: "Protocol wrong type for socket.",
  68: "Result too large.",
  69: "Read-only file system.",
  70: "Invalid seek.",
  71: "No such process.",
  72: "Reserved.",
  73: "Connection timed out.",
  74: "Text file busy.",
  75: "Cross-device link.",
  76: "Extension: Capabilities insufficient."
};
function getEmscriptenFsError(t) {
  const e = typeof t == "object" ? t == null ? void 0 : t.errno : null;
  if (e in FileErrorCodes)
    return FileErrorCodes[e];
}
function rethrowFileSystemError(t = "") {
  return function(r) {
    return function(...n) {
      try {
        return r.apply(this, n);
      } catch (s) {
        const i = typeof s == "object" ? s == null ? void 0 : s.errno : null;
        if (i in FileErrorCodes) {
          const o = FileErrorCodes[i], a2 = typeof n[1] == "string" ? n[1] : null, c3 = a2 !== null ? t.replaceAll("{path}", a2) : t;
          throw new ErrnoError(
            i,
            `${c3}: ${o}`,
            {
              cause: s
            }
          );
        }
        throw s;
      }
    };
  };
}
var FSHelpers = class _FSHelpers {
  /**
   * Reads a file from the PHP filesystem and returns it as a string.
   *
   * @throws {@link @php-wasm/universal:ErrnoError} – If the file doesn't exist.
   * @param FS
   * @param  path - The file path to read.
   * @returns The file contents.
   */
  static readFileAsText(e, r) {
    return new TextDecoder().decode(_FSHelpers.readFileAsBuffer(e, r));
  }
  /**
   * Reads a file from the PHP filesystem and returns it as an array buffer.
   *
   * @throws {@link @php-wasm/universal:ErrnoError} – If the file doesn't exist.
   * @param FS
   * @param  path - The file path to read.
   * @returns The file contents.
   */
  static readFileAsBuffer(e, r) {
    return e.readFile(r);
  }
  /**
   * Overwrites data in a file in the PHP filesystem.
   * Creates a new file if one doesn't exist yet.
   *
   * @param FS
   * @param  path - The file path to write to.
   * @param  data - The data to write to the file.
   */
  static writeFile(e, r, n) {
    e.writeFile(r, n);
  }
  /**
   * Removes a file from the PHP filesystem.
   *
   * @throws {@link @php-wasm/universal:ErrnoError} – If the file doesn't exist.
   * @param FS
   * @param  path - The file path to remove.
   */
  static unlink(e, r) {
    e.unlink(r);
  }
  /**
   * Moves a file or directory in the PHP filesystem to a
   * new location.
   *
   * @param FS
   * @param fromPath The path to rename.
   * @param toPath The new path.
   */
  static mv(e, r, n) {
    try {
      const s = e.lookupPath(r).node.mount, i = _FSHelpers.fileExists(e, n) ? e.lookupPath(n).node.mount : e.lookupPath(W(n)).node.mount;
      s.mountpoint !== i.mountpoint ? (_FSHelpers.copyRecursive(e, r, n), _FSHelpers.isDir(e, r) ? _FSHelpers.rmdir(e, r, { recursive: true }) : e.unlink(r)) : e.rename(r, n);
    } catch (s) {
      const i = getEmscriptenFsError(s);
      throw i ? new Error(
        `Could not move ${r} to ${n}: ${i}`,
        {
          cause: s
        }
      ) : s;
    }
  }
  /**
   * Removes a directory from the PHP filesystem.
   *
   * @param FS
   * @param path The directory path to remove.
   * @param options Options for the removal.
   */
  static rmdir(e, r, n = { recursive: true }) {
    const s = e.lookupPath(r, { follow: false });
    if ((s == null ? void 0 : s.node.mount.mountpoint) === r)
      throw new ErrnoError(10);
    n != null && n.recursive && _FSHelpers.listFiles(e, r).forEach((i) => {
      const o = `${r}/${i}`;
      _FSHelpers.isDir(e, o) ? _FSHelpers.rmdir(e, o, n) : _FSHelpers.unlink(e, o);
    }), e.getPath(e.lookupPath(r).node) === e.cwd() && e.chdir(m(e.cwd(), "..")), e.rmdir(r);
  }
  /**
   * Lists the files and directories in the given directory.
   *
   * @param FS
   * @param  path - The directory path to list.
   * @param  options - Options for the listing.
   * @returns The list of files and directories in the given directory.
   */
  static listFiles(e, r, n = { prependPath: false }) {
    if (!_FSHelpers.fileExists(e, r))
      return [];
    try {
      const s = e.readdir(r).filter(
        (i) => i !== "." && i !== ".."
      );
      if (n.prependPath) {
        const i = r.replace(/\/$/, "");
        return s.map((o) => `${i}/${o}`);
      }
      return s;
    } catch (s) {
      return import_logger.logger.error(s, { path: r }), [];
    }
  }
  /**
   * Checks if a directory exists in the PHP filesystem.
   *
   * @param FS
   * @param  path – The path to check.
   * @returns True if the path is a directory, false otherwise.
   */
  static isDir(e, r) {
    return _FSHelpers.fileExists(e, r) ? e.isDir(e.lookupPath(r, { follow: true }).node.mode) : false;
  }
  /**
   * Checks if a file exists in the PHP filesystem.
   *
   * @param FS
   * @param  path – The path to check.
   * @returns True if the path is a file, false otherwise.
   */
  static isFile(e, r) {
    return _FSHelpers.fileExists(e, r) ? e.isFile(e.lookupPath(r, { follow: true }).node.mode) : false;
  }
  /**
   * Creates a symlink in the PHP filesystem.
   *
   * @param FS
   * @param target
   * @param link
   */
  static symlink(e, r, n) {
    return e.symlink(r, n);
  }
  /**
   * Checks if a path is a symlink in the PHP filesystem.
   *
   * @param FS
   * @param path
   * @returns True if the path is a symlink, false otherwise.
   */
  static isSymlink(e, r) {
    return _FSHelpers.fileExists(e, r) ? e.isLink(e.lookupPath(r).node.mode) : false;
  }
  /**
   * Reads the target of a symlink in the PHP filesystem.
   * @param FS
   * @param path
   * @returns The target of the symlink.
   * @throws {@link @php-wasm/universal:ErrnoError} – If the path is not a symlink.
   */
  static readlink(e, r) {
    return e.readlink(r);
  }
  /**
   * Gets the real path of a file in the PHP filesystem.
   * @param FS
   * @param path
   *
   * @returns The real path of the file.
   */
  static realpath(e, r) {
    return e.lookupPath(r, { follow: true }).path;
  }
  /**
   * Checks if a file (or a directory) exists in the PHP filesystem.
   *
   * @param FS
   * @param  path - The file path to check.
   * @returns True if the file exists, false otherwise.
   */
  static fileExists(e, r) {
    try {
      return e.lookupPath(r), true;
    } catch {
      return false;
    }
  }
  /**
   * Recursively creates a directory with the given path in the PHP filesystem.
   * For example, if the path is `/root/php/data`, and `/root` already exists,
   * it will create the directories `/root/php` and `/root/php/data`.
   *
   * @param FS
   * @param  path - The directory path to create.
   */
  static mkdir(e, r) {
    e.mkdirTree(r);
  }
  static copyRecursive(e, r, n) {
    try {
      const s = e.lookupPath(r).node;
      if (e.isDir(s.mode)) {
        if (r === n || n.startsWith(`${r}/`))
          throw new ErrnoError(28);
        e.mkdirTree(n);
        const i = e.readdir(r).filter(
          (o) => o !== "." && o !== ".."
        );
        for (const o of i)
          _FSHelpers.copyRecursive(
            e,
            m(r, o),
            m(n, o)
          );
      } else e.isLink(s.mode) ? e.symlink(e.readlink(r), n) : e.writeFile(n, e.readFile(r));
    } catch (s) {
      const i = getEmscriptenFsError(s);
      throw i ? new Error(
        `Could not copy ${r} to ${n}: ${i}`,
        {
          cause: s
        }
      ) : s;
    }
  }
};
FSHelpers.readFileAsText = rethrowFileSystemError('Could not read "{path}"')(
  FSHelpers.readFileAsText
);
FSHelpers.readFileAsBuffer = rethrowFileSystemError('Could not read "{path}"')(
  FSHelpers.readFileAsBuffer
);
FSHelpers.writeFile = rethrowFileSystemError('Could not write to "{path}"')(
  FSHelpers.writeFile
);
FSHelpers.unlink = rethrowFileSystemError('Could not unlink "{path}"')(
  FSHelpers.unlink
);
FSHelpers.rmdir = rethrowFileSystemError('Could not remove directory "{path}"')(
  FSHelpers.rmdir
);
FSHelpers.listFiles = rethrowFileSystemError(
  'Could not list files in "{path}"'
)(FSHelpers.listFiles);
FSHelpers.isDir = rethrowFileSystemError('Could not stat "{path}"')(
  FSHelpers.isDir
);
FSHelpers.isFile = rethrowFileSystemError('Could not stat "{path}"')(
  FSHelpers.isFile
);
FSHelpers.realpath = rethrowFileSystemError('Could not stat "{path}"')(
  FSHelpers.realpath
);
FSHelpers.fileExists = rethrowFileSystemError('Could not stat "{path}"')(
  FSHelpers.fileExists
);
FSHelpers.mkdir = rethrowFileSystemError('Could not create directory "{path}"')(
  FSHelpers.mkdir
);
var _private = /* @__PURE__ */ new WeakMap();
var D;
var Y;
var PHPWorker = class {
  /** @inheritDoc */
  constructor(e, r) {
    _2(this, D);
    _2(this, Y);
    this.absoluteUrl = "", this.documentRoot = "", this.chroot = null, x2(this, D, /* @__PURE__ */ new Map()), x2(this, Y, /* @__PURE__ */ new WeakSet()), this.onMessageListeners = [], _private.set(this, {
      monitor: r
    }), e && this.__internal_setRequestHandler(e);
  }
  __internal_setRequestHandler(e) {
    this.absoluteUrl = e.absoluteUrl, this.documentRoot = e.documentRoot, this.chroot = this.documentRoot, _private.set(this, {
      ..._private.get(this),
      requestHandler: e
    });
  }
  /**
   * @internal
   * @deprecated
   * Do not use this method directly in the code consuming
   * the web API. It will change or even be removed without
   * a warning.
   */
  __internal_getPHP() {
    return _private.get(this).php;
  }
  /**
   * @internal
   * @deprecated
   * Do not use this method directly in the code consuming
   * the web API. It will change or even be removed without
   * a warning.
   */
  __internal_getRequestHandler() {
    return this.getRequestHandler();
  }
  async setPrimaryPHP(e) {
    _private.set(this, {
      ..._private.get(this),
      php: e
    });
  }
  /** @inheritDoc @php-wasm/universal!PHPRequestHandler.pathToInternalUrl  */
  pathToInternalUrl(e) {
    return this.getRequestHandler().pathToInternalUrl(e);
  }
  /** @inheritDoc @php-wasm/universal!PHPRequestHandler.internalUrlToPath  */
  internalUrlToPath(e) {
    return this.getRequestHandler().internalUrlToPath(e);
  }
  /**
   * The onDownloadProgress event listener.
   */
  async onDownloadProgress(e) {
    var r;
    return (r = _private.get(this).monitor) == null ? void 0 : r.addEventListener("progress", e);
  }
  /** @inheritDoc @php-wasm/universal!PHP.mv  */
  async mv(e, r) {
    return _private.get(this).php.mv(e, r);
  }
  /** @inheritDoc @php-wasm/universal!PHP.cp  */
  async cp(e, r) {
    return _private.get(this).php.cp(e, r);
  }
  /** @inheritDoc @php-wasm/universal!PHP.rmdir  */
  async rmdir(e, r) {
    return _private.get(this).php.rmdir(e, r);
  }
  /** @inheritDoc @php-wasm/universal!PHPRequestHandler.request */
  async request(e) {
    return await this.getRequestHandler().request(e);
  }
  /**
   * Handles a request with streaming support for large responses.
   * Returns a StreamedPHPResponse that allows processing the response
   * body incrementally without buffering the entire response in memory.
   *
   * This is useful for large file downloads (>2GB) that would otherwise
   * exceed JavaScript's Uint8Array size limits.
   *
   * @param request - PHP Request data.
   */
  async requestStreamed(e) {
    return await this.getRequestHandler().requestStreamed(e);
  }
  /** @inheritDoc @php-wasm/universal!/PHP.run */
  async run(e) {
    const r = _private.get(this), n = r.php;
    if (n && (e.usePrimaryPhp || !r.requestHandler && !n.requestHandler))
      return this.registerWorkerListeners(n), await n.run(e);
    const { php: s, reap: i } = await this.acquirePHPInstance();
    try {
      return await s.run(e);
    } finally {
      i();
    }
  }
  /**
   * Starts a PHP request and returns its output streams before PHP exits.
   *
   * A pooled PHP instance remains checked out until `response.finished`
   * settles. If the request fails before returning a response, the instance
   * is released immediately. A non-zero PHP exit is exposed through
   * `response.exitCode` instead of making this method reject.
   *
   * @param request - PHP code or script path, request metadata, and environment.
   * @returns A streamed response whose output can be consumed incrementally.
   * @throws When a PHP instance cannot be acquired or the request cannot start.
   */
  async runStream(e) {
    const r = _private.get(this), n = r.php;
    if (n && (e.usePrimaryPhp || !r.requestHandler && !n.requestHandler))
      return this.registerWorkerListeners(n), await n.runStream(e);
    const { php: s, reap: i } = await this.acquirePHPInstance();
    let o;
    try {
      o = await s.runStream(e);
    } catch (a2) {
      throw i(), a2;
    }
    return o.finished.finally(i), o;
  }
  /** @inheritDoc @php-wasm/universal!/PHP.cli */
  async cli(e, r) {
    const n = _private.get(this), s = n.php;
    if (!n.requestHandler && !(s != null && s.requestHandler) && s)
      return await s.cli(e, r);
    const { php: i, reap: o } = await this.acquirePHPInstance();
    let a2;
    try {
      a2 = await i.cli(e, r);
    } catch (c3) {
      throw o(), c3;
    }
    return a2.finished.finally(o), a2;
  }
  /** @inheritDoc @php-wasm/universal!/PHP.chdir */
  chdir(e) {
    return this.chroot = e, _private.get(this).php.chdir(e);
  }
  /** @inheritDoc @php-wasm/universal!/PHP.chdir */
  cwd() {
    return _private.get(this).php.cwd();
  }
  /**
   * @returns A PHP instance with a consistent chroot.
   */
  async acquirePHPInstance() {
    const { php: e, reap: r } = await this.getRequestHandler().instanceManager.acquirePHPInstance();
    return this.chroot !== null && e.chdir(this.chroot), this.registerWorkerListeners(e), { php: e, reap: r };
  }
  /** @inheritDoc @php-wasm/universal!/PHP.setSapiName */
  setSapiName(e) {
    _private.get(this).php.setSapiName(e);
  }
  /** @inheritDoc @php-wasm/universal!/PHP.mkdir */
  mkdir(e) {
    return _private.get(this).php.mkdir(e);
  }
  /** @inheritDoc @php-wasm/universal!/PHP.mkdirTree */
  mkdirTree(e) {
    return _private.get(this).php.mkdirTree(e);
  }
  /** @inheritDoc @php-wasm/universal!/PHP.readFileAsText */
  readFileAsText(e) {
    return _private.get(this).php.readFileAsText(e);
  }
  /** @inheritDoc @php-wasm/universal!/PHP.readFileAsBuffer */
  readFileAsBuffer(e) {
    return _private.get(this).php.readFileAsBuffer(e);
  }
  /** @inheritDoc @php-wasm/universal!/PHP.writeFile */
  writeFile(e, r) {
    return _private.get(this).php.writeFile(e, r);
  }
  /** @inheritDoc @php-wasm/universal!/PHP.unlink */
  unlink(e) {
    return _private.get(this).php.unlink(e);
  }
  /** @inheritDoc @php-wasm/universal!/PHP.listFiles */
  listFiles(e, r) {
    return _private.get(this).php.listFiles(e, r);
  }
  /** @inheritDoc @php-wasm/universal!/PHP.isDir */
  isDir(e) {
    return _private.get(this).php.isDir(e);
  }
  /** @inheritDoc @php-wasm/universal!/PHP.isFile */
  isFile(e) {
    return _private.get(this).php.isFile(e);
  }
  /** @inheritDoc @php-wasm/universal!/PHP.fileExists */
  fileExists(e) {
    return _private.get(this).php.fileExists(e);
  }
  /** @inheritDoc @php-wasm/universal!/PHP.onMessage */
  onMessage(e) {
    return this.onMessageListeners.push(e), async () => {
      this.onMessageListeners = this.onMessageListeners.filter(
        (r) => r !== e
      );
    };
  }
  /** @inheritDoc @php-wasm/universal!/PHP.defineConstant */
  defineConstant(e, r) {
    _private.get(this).php.defineConstant(e, r);
  }
  /** @inheritDoc @php-wasm/universal!/PHP.addEventListener */
  addEventListener(e, r) {
    u(this, D).has(e) || u(this, D).set(e, /* @__PURE__ */ new Set()), u(this, D).get(e).add(r);
  }
  /**
   * Removes an event listener for a PHP event.
   * @param eventType - The type of event to remove the listener from.
   * @param listener - The listener function to be removed.
   */
  removeEventListener(e, r) {
    var n;
    (n = u(this, D).get(e)) == null || n.delete(r);
  }
  dispatchEvent(e) {
    const r = u(this, D).get(e.type);
    if (!r)
      return;
    const n = [...r], s = A in e && e[A] === true && "stdin" in e && typeof ReadableStream < "u" && e.stdin instanceof ReadableStream;
    if (n.length > 1 && s) {
      let i = e.stdin;
      for (let o = 0; o < n.length - 1; o++) {
        const [a2, c3] = i.tee();
        i = c3, n[o]({ ...e, stdin: a2 });
      }
      n[n.length - 1]({
        ...e,
        stdin: i
      });
      return;
    }
    for (const i of n)
      i(e);
  }
  registerWorkerListeners(e) {
    u(this, Y).has(e) || (u(this, Y).add(e), e.addEventListener("*", async (r) => {
      this.dispatchEvent(r);
    }), e.onMessage(async (r) => {
      for (const n of this.onMessageListeners) {
        const s = await n(r);
        if (s)
          return s;
      }
      return "";
    }));
  }
  async [Symbol.asyncDispose]() {
    var e;
    await ((e = this.getRequestHandler(false)) == null ? void 0 : e[Symbol.asyncDispose]());
  }
  getRequestHandler(e = true) {
    var n;
    const r = _private.get(this);
    if (r.requestHandler)
      return r.requestHandler;
    if ((n = r.php) != null && n.requestHandler)
      return this.__internal_setRequestHandler(r.php.requestHandler), r.php.requestHandler;
    if (e)
      throw new Error("PHPWorker is not connected to a request handler.");
  }
};
D = /* @__PURE__ */ new WeakMap(), Y = /* @__PURE__ */ new WeakMap();
function isExitCode(t) {
  return t instanceof Error ? (t == null ? void 0 : t.name) === "ExitStatus" && "status" in t : false;
}
var RuntimeId = Symbol("RuntimeId");
var loadedRuntimes = /* @__PURE__ */ new Map();
var lastRuntimeId = 0;
async function loadPHPRuntime(t, ...e) {
  const r = Object.assign({}, ...e), [n, s, i] = makePromise(), o = t.init(currentJsRuntime, {
    onAbort(l) {
      i(l), import_logger.logger.error(l);
    },
    ENV: {},
    // Emscripten sometimes prepends a '/' to the path, which
    // breaks vite dev mode. An identity `locateFile` function
    // fixes it.
    locateFile: (l) => l,
    ...r,
    noInitialRun: true,
    onRuntimeInitialized() {
      r.onRuntimeInitialized && r.onRuntimeInitialized(o), s();
    }
  });
  await n;
  const a2 = r.phpWasmAsyncMode ?? t.phpWasmAsyncMode;
  a2 && (o.phpWasmAsyncMode = a2);
  const c3 = ++lastRuntimeId;
  return o.FS, o.id = c3, o.originalExit = o._exit, o._exit = function(l) {
    return o.outboundNetworkProxyServer && (o.outboundNetworkProxyServer.close(), o.outboundNetworkProxyServer.closeAllConnections()), loadedRuntimes.delete(c3), o.originalExit(l);
  }, o[RuntimeId] = c3, loadedRuntimes.set(c3, o), c3;
}
function popLoadedRuntime(t, {
  dangerouslyKeepTheRuntimeInTheMap: e = false
} = {}) {
  var n;
  const r = loadedRuntimes.get(t);
  if (!r)
    throw new Error(`Runtime with id ${t} not found`);
  if (e) {
    if (!((n = process == null ? void 0 : process.env) != null && n.TEST))
      throw new Error("Cannot pop runtime in non-test environment");
    return r;
  }
  return loadedRuntimes.delete(t), r;
}
var currentJsRuntime = (function() {
  var t;
  return typeof process < "u" && ((t = process.release) == null ? void 0 : t.name) === "node" ? "NODE" : typeof window < "u" ? "WEB" : typeof WorkerGlobalScope < "u" && self instanceof WorkerGlobalScope ? "WORKER" : "NODE";
})();
var makePromise = () => {
  const t = [], e = new Promise((r, n) => {
    t.push(r, n);
  });
  return t.unshift(e), t;
};
var responseTexts = {
  500: "Internal Server Error",
  502: "Bad Gateway",
  404: "Not Found",
  403: "Forbidden",
  401: "Unauthorized",
  400: "Bad Request",
  301: "Moved Permanently",
  302: "Found",
  307: "Temporary Redirect",
  308: "Permanent Redirect",
  204: "No Content",
  201: "Created",
  200: "OK"
};
var re;
var se;
var de = class de2 {
  constructor(e, r, n, s) {
    _2(this, re);
    _2(this, se);
    this.cachedParsedHeaders = null, this.cachedStdoutBytes = null, this.cachedStderrText = null;
    const [i, o] = e.tee();
    x2(this, re, i), x2(this, se, o), this.stdout = r, this.stderr = n, this.exitCode = s;
  }
  /**
   * Creates a StreamedPHPResponse from a buffered PHPResponse.
   * Useful for unifying response handling when both types may be returned.
   */
  static fromPHPResponse(e) {
    const r = new ReadableStream({
      start(a2) {
        a2.enqueue(e.bytes), a2.close();
      }
    }), n = [];
    for (const [a2, c3] of Object.entries(e.headers))
      for (const l of c3)
        n.push(`${a2}: ${l}`);
    const s = JSON.stringify({
      status: e.httpStatusCode,
      headers: n
    }), i = new ReadableStream({
      start(a2) {
        a2.enqueue(new TextEncoder().encode(s)), a2.close();
      }
    }), o = new ReadableStream({
      start(a2) {
        e.errors.length > 0 && a2.enqueue(
          new TextEncoder().encode(e.errors)
        ), a2.close();
      }
    });
    return new de2(
      i,
      r,
      o,
      Promise.resolve(e.exitCode)
    );
  }
  /**
   * Creates a StreamedPHPResponse for a given HTTP status code.
   * Shorthand for `StreamedPHPResponse.fromPHPResponse(PHPResponse.forHttpCode(...))`.
   */
  static forHttpCode(e, r = "") {
    return de2.fromPHPResponse(
      PHPResponse.forHttpCode(e, r)
    );
  }
  /**
   * Returns the raw headers stream for serialization purposes.
   * For parsed headers, use the `headers` property instead.
   */
  getHeadersStream() {
    return u(this, re);
  }
  /**
   * True if the response is successful (HTTP status code 200-399),
   * false otherwise.
   */
  async ok() {
    try {
      const e = await this.httpStatusCode;
      return e >= 200 && e < 400;
    } catch {
      return false;
    }
  }
  /**
   * Resolves when the response has finished processing – either successfully or not.
   */
  get finished() {
    return Promise.allSettled([this.exitCode.finally(() => {
    })]).then(
      () => {
      }
    );
  }
  /**
   * Resolves once HTTP headers are available.
   */
  get headers() {
    return this.getParsedHeaders().then((e) => e.headers);
  }
  /**
   * Resolves once HTTP status code is available.
   */
  get httpStatusCode() {
    return this.getParsedHeaders().then((e) => e.httpStatusCode).then((e) => e !== void 0 ? e : this.getParsedHeaders().then(
      (r) => r.httpStatusCode,
      () => 200
    )).catch(() => 500);
  }
  /**
   * Exposes the stdout bytes as they're produced by the PHP instance
   */
  get stdoutText() {
    return this.stdoutBytes.then(
      (e) => new TextDecoder().decode(e)
    );
  }
  /**
   * Exposes the stdout bytes as they're produced by the PHP instance
   */
  get stdoutBytes() {
    return this.cachedStdoutBytes || (this.cachedStdoutBytes = streamToBytes(this.stdout)), this.cachedStdoutBytes;
  }
  /**
   * Exposes the stderr bytes as they're produced by the PHP instance
   */
  get stderrText() {
    return this.cachedStderrText || (this.cachedStderrText = streamToText(this.stderr)), this.cachedStderrText;
  }
  async getParsedHeaders() {
    return this.cachedParsedHeaders || (this.cachedParsedHeaders = parseHeadersStream(
      u(this, se)
    )), await this.cachedParsedHeaders;
  }
};
re = /* @__PURE__ */ new WeakMap(), se = /* @__PURE__ */ new WeakMap();
var StreamedPHPResponse = de;
async function parseHeadersStream(t) {
  const e = await streamToText(t);
  let r;
  try {
    r = JSON.parse(e);
  } catch {
    return { headers: {}, httpStatusCode: 200 };
  }
  const n = {};
  for (const s of r.headers) {
    if (!s.includes(": "))
      continue;
    const i = s.indexOf(": "), o = s.substring(0, i).toLowerCase(), a2 = s.substring(i + 2);
    o in n || (n[o] = []), n[o].push(a2);
  }
  return {
    headers: n,
    httpStatusCode: r.status
  };
}
async function streamToText(t) {
  const e = t.pipeThrough(new TextDecoderStream()).getReader(), r = [];
  for (; ; ) {
    const { done: n, value: s } = await e.read();
    if (n)
      return r.join("");
    s && r.push(s);
  }
}
async function streamToBytes(t) {
  const e = t.getReader(), r = [];
  for (; ; ) {
    const { done: n, value: s } = await e.read();
    if (n) {
      const i = r.reduce(
        (c3, l) => c3 + l.byteLength,
        0
      ), o = new Uint8Array(i);
      let a2 = 0;
      for (const c3 of r)
        o.set(c3, a2), a2 += c3.byteLength;
      return o;
    }
    s && r.push(s);
  }
}
var PHPResponse = class _PHPResponse {
  constructor(e, r, n, s = "", i = 0) {
    this.httpStatusCode = e, this.headers = r, this.bytes = n, this.exitCode = i, this.errors = s;
  }
  static forHttpCode(e, r = "") {
    return new _PHPResponse(
      e,
      {},
      new TextEncoder().encode(
        r || responseTexts[e] || ""
      )
    );
  }
  static fromRawData(e) {
    return new _PHPResponse(
      e.httpStatusCode,
      e.headers,
      e.bytes,
      e.errors,
      e.exitCode
    );
  }
  static async fromStreamedResponse(e) {
    return await e.finished, new _PHPResponse(
      await e.httpStatusCode,
      await e.headers,
      await e.stdoutBytes,
      await e.stderrText,
      await e.exitCode
    );
  }
  /**
   * True if the response is successful (HTTP status code 200-399),
   * false otherwise.
   */
  ok() {
    return this.httpStatusCode >= 200 && this.httpStatusCode < 400;
  }
  toRawData() {
    return {
      headers: this.headers,
      bytes: this.bytes,
      errors: this.errors,
      exitCode: this.exitCode,
      httpStatusCode: this.httpStatusCode
    };
  }
  /**
   * Response body as JSON.
   */
  get json() {
    return JSON.parse(this.text);
  }
  /**
   * Response body as text.
   */
  get text() {
    return new TextDecoder().decode(this.bytes);
  }
};
var _a;
var kError = Symbol("error");
var kMessage = Symbol("message");
var ErrorEvent2 = class extends (_a = Event, _a) {
  /**
   * Create a new `ErrorEvent`.
   *
   * @param type The name of the event
   * @param options A dictionary object that allows for setting
   *                  attributes via object members of the same name.
   */
  constructor(e, r = {}) {
    super(e), this[kError] = r.error === void 0 ? null : r.error, this[kMessage] = r.message === void 0 ? "" : r.message;
  }
  get error() {
    return this[kError];
  }
  get message() {
    return this[kMessage];
  }
};
Object.defineProperty(ErrorEvent2.prototype, "error", { enumerable: true });
Object.defineProperty(ErrorEvent2.prototype, "message", { enumerable: true });
var ErrorEvent = typeof globalThis.ErrorEvent == "function" ? globalThis.ErrorEvent : ErrorEvent2;
var UnhandledRejectionsTarget = class extends EventTarget {
  constructor() {
    super(...arguments), this.listenersCount = 0;
  }
  addEventListener(e, r, n) {
    ++this.listenersCount, super.addEventListener(
      e,
      r,
      n
    );
  }
  removeEventListener(e, r, n) {
    --this.listenersCount, super.removeEventListener(
      e,
      r,
      n
    );
  }
  hasListeners() {
    return this.listenersCount > 0;
  }
};
function improveWASMErrorReporting(t) {
  const e = new UnhandledRejectionsTarget();
  for (const r in t.wasmExports)
    if (typeof t.wasmExports[r] == "function") {
      const n = t.wasmExports[r];
      t.wasmExports[r] = function(...s) {
        var i;
        try {
          return n(...s);
        } catch (o) {
          if (!(o instanceof Error))
            throw o;
          t.lastAsyncifyStackSource && (o.cause = t.lastAsyncifyStackSource);
          const a2 = clarifyErrorMessage(
            o,
            (i = t.lastAsyncifyStackSource) == null ? void 0 : i.stack
          );
          if (e.hasListeners()) {
            o.message = a2;
            const c3 = new ErrorEvent("error", { error: o });
            throw e.dispatchEvent(c3), o;
          }
          throw (!isExitCode(o) || o.status !== 0) && showCriticalErrorBox(a2), o;
        }
      };
    }
  return e;
}
var functionsMaybeMissingFromAsyncify = [];
function getFunctionsMaybeMissingFromAsyncify() {
  return functionsMaybeMissingFromAsyncify;
}
function clarifyErrorMessage(t, e) {
  if (t.message === "unreachable") {
    let r = UNREACHABLE_ERROR;
    e || (r += `

This stack trace is lacking. For a better one initialize 
the PHP runtime with debug: true, e.g. loadNodeRuntime('8.1', { emscriptenOptions: { debug: true } }).

`);
    const n = new Set(
      extractPHPFunctionsFromStack(e || "")
    );
    let s = t;
    do {
      for (const i of extractPHPFunctionsFromStack(
        s.stack || ""
      ))
        n.add(i);
      s = s.cause;
    } while (s);
    functionsMaybeMissingFromAsyncify = Array.from(n);
    for (const i of n)
      r += `    * ${i}
`;
    return r += `Original error message: ${t.message}
`, r;
  }
  return t.message;
}
var UNREACHABLE_ERROR = `
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

`;
var redBg = "\x1B[41m";
var bold = "\x1B[1m";
var reset = "\x1B[0m";
var eol = "\x1B[K";
var logged = false;
function showCriticalErrorBox(t) {
  if (!logged && (logged = true, !(t != null && t.trim().startsWith("Program terminated with exit")))) {
    import_logger.logger.log(`${redBg}
${eol}
${bold}  WASM ERROR${reset}${redBg}`);
    for (const e of t.split(`
`))
      import_logger.logger.log(`${eol}  ${e} `);
    import_logger.logger.log(`${reset}`);
  }
}
function extractPHPFunctionsFromStack(t) {
  try {
    const e = t.split(`
`).slice(1).map((r) => {
      const n = r.trim().substring(3).split(" ");
      return {
        fn: n.length >= 2 ? n[0] : "<unknown>",
        isWasm: r.includes("wasm:/")
      };
    }).filter(
      ({ fn: r, isWasm: n }) => n && !r.startsWith("dynCall_") && !r.startsWith("invoke_")
    ).map(({ fn: r }) => r);
    return Array.from(new Set(e));
  } catch {
    return [];
  }
}
var STRING = "string";
var NUMBER = "number";
var __private__dont__use = Symbol("__private__dont__use");
var PHPExecutionFailureError = class extends Error {
  constructor(e, r, n) {
    super(e), this.response = r, this.source = n;
  }
};
var MountStillActiveError = class extends Error {
  constructor(e) {
    super("The filesystem could not be flushed and remains mounted.", {
      cause: e
    }), this.name = "MountStillActiveError";
  }
};
var PHP_INI_PATH = "/internal/shared/php.ini";
var AUTO_PREPEND_SCRIPT = "/internal/shared/auto_prepend_file.php";
var OPCACHE_FILE_FOLDER = "/internal/shared/opcache";
var Q;
var z2;
var G;
var j2;
var J;
var W2;
var K;
var ne;
var k;
var y;
var ye;
var Ee;
var xe;
var Se;
var ke;
var Fe;
var be;
var Re;
var He;
var ge;
var Te;
var Pe;
var we;
var PHP = class {
  /**
   * Initializes a PHP runtime.
   *
   * @internal
   * @param  PHPRuntime - Optional. PHP Runtime ID as initialized by loadPHPRuntime.
   * @param  requestHandlerOptions - Optional. Options for the PHPRequestHandler. If undefined, no request handler will be initialized.
   */
  constructor(t) {
    _2(this, y);
    _2(this, Q);
    _2(this, z2, false);
    _2(this, G, null);
    _2(this, j2, /* @__PURE__ */ new Map([
      // Listen to all events
      ["*", /* @__PURE__ */ new Set()]
    ]));
    _2(this, J, []);
    _2(this, W2, {});
    _2(this, K);
    _2(this, ne, /* @__PURE__ */ new Map());
    _2(this, k, {
      enabled: false,
      recreateRuntime: () => 0,
      needsRotating: false,
      maxRequests: 400,
      requestsMade: 0
    });
    this.semaphore = new v({ concurrency: 1 }), t !== void 0 && this.initializeRuntime(t), this.addEventListener("request.error", (e) => {
      e.source === "php-wasm" && (u(this, k).needsRotating = true);
    });
  }
  /**
   * Adds an event listener for a PHP event.
   * @param eventType - The type of event to listen for.
   * @param listener - The listener function to be called when the event is triggered.
   */
  addEventListener(t, e) {
    u(this, j2).has(t) || u(this, j2).set(t, /* @__PURE__ */ new Set()), u(this, j2).get(t).add(e);
  }
  /**
   * Removes an event listener for a PHP event.
   * @param eventType - The type of event to remove the listener from.
   * @param listener - The listener function to be removed.
   */
  removeEventListener(t, e) {
    var r;
    (r = u(this, j2).get(t)) == null || r.delete(e);
  }
  dispatchEvent(t) {
    const e = [
      ...u(this, j2).get(t.type) || [],
      ...u(this, j2).get("*") || []
    ];
    if (e.length === 0)
      return;
    const r = A in t && t[A] === true && "stdin" in t && typeof ReadableStream < "u" && t.stdin instanceof ReadableStream;
    if (e.length > 1 && r) {
      let n = t.stdin;
      for (let s = 0; s < e.length - 1; s++) {
        const [i, o] = n.tee();
        n = o, e[s]({ ...t, stdin: i });
      }
      e[e.length - 1]({
        ...t,
        stdin: n
      });
      return;
    }
    for (const n of e)
      n(t);
  }
  /**
   * Listens to message sent by the PHP code.
   *
   * To dispatch messages, call:
   *
   *     post_message_to_js(string $data)
   *
   *     Arguments:
   *         $data (string) – Data to pass to JavaScript.
   *
   * @example
   *
   * ```ts
   * const php = await PHP.load('8.0');
   *
   * php.onMessage(
   *     // The data is always passed as a string
   *     function (data: string) {
   *         // Let's decode and log the data:
   *         console.log(JSON.parse(data));
   *     }
   * );
   *
   * // Now that we have a listener in place, let's
   * // dispatch a message:
   * await php.run({
   *     code: `<?php
   *         post_message_to_js(
   *             json_encode([
   *                 'post_id' => '15',
   *                 'post_title' => 'This is a blog post!'
   *             ])
   *         ));
   *     `,
   * });
   * ```
   *
   * @param listener Callback function to handle the message.
   */
  onMessage(t) {
    return u(this, J).push(t), async () => {
      x2(this, J, u(this, J).filter(
        (e) => e !== t
      ));
    };
  }
  async setSpawnHandler(handler) {
    typeof handler == "string" && (handler = S(eval(handler))), x2(this, K, handler);
  }
  /**
   * Overrides spawning of a specific binary, e.g. `sendmail`. The override
   * applies to any argv[0] whose basename matches `command` and takes
   * precedence over the handler installed via setSpawnHandler().
   */
  setCommandSpawnHandler(t, e) {
    u(this, ne).set(t, e);
  }
  /** @deprecated Use PHPRequestHandler instead. */
  get absoluteUrl() {
    return this.requestHandler.absoluteUrl;
  }
  /** @deprecated Use PHPRequestHandler instead. */
  get documentRoot() {
    return this.requestHandler.documentRoot;
  }
  /** @deprecated Use PHPRequestHandler instead. */
  pathToInternalUrl(t) {
    return this.requestHandler.pathToInternalUrl(t);
  }
  /** @deprecated Use PHPRequestHandler instead. */
  internalUrlToPath(t) {
    return this.requestHandler.internalUrlToPath(t);
  }
  initializeRuntime(t) {
    if (this[__private__dont__use])
      throw new Error("PHP runtime already initialized.");
    const e = popLoadedRuntime(t);
    if (!e)
      throw new Error("Invalid PHP runtime id.");
    if (this[__private__dont__use] = e, e.spawnProcess = (r, n, s) => v2(this, y, ye).call(this, r, n, s), this[__private__dont__use].ccall(
      "wasm_set_phpini_path",
      null,
      ["string"],
      [PHP_INI_PATH]
    ), !this.fileExists(PHP_INI_PATH)) {
      const r = [
        // OPCache
        "opcache.enable = 1",
        "opcache.enable_cli = 1",
        "opcache.jit = 0",
        "opcache.interned_strings_buffer = 8",
        "opcache.max_accelerated_files = 1000",
        "opcache.memory_consumption = 64",
        "opcache.max_wasted_percentage = 5",
        "opcache.file_cache = " + OPCACHE_FILE_FOLDER,
        // Always enable the file cache.
        "opcache.file_cache_only = 1",
        "opcache.file_cache_consistency_checks = 1"
      ];
      this.fileExists(OPCACHE_FILE_FOLDER) || this.mkdir(OPCACHE_FILE_FOLDER), this.writeFile(
        PHP_INI_PATH,
        [
          "auto_prepend_file=" + AUTO_PREPEND_SCRIPT,
          "memory_limit=256M",
          "ignore_repeated_errors = 1",
          "error_reporting = E_ALL",
          "display_errors = 1",
          "html_errors = 1",
          "display_startup_errors = On",
          "log_errors = 1",
          "always_populate_raw_post_data = -1",
          "upload_max_filesize = 2000M",
          "post_max_size = 2000M",
          "allow_url_fopen = On",
          "allow_url_include = Off",
          "session.save_path = /home/web_user",
          "implicit_flush = 1",
          "output_buffering = 0",
          "max_execution_time = 0",
          "max_input_time = -1",
          ...r
        ].join(`
`)
      );
    }
    this.fileExists(AUTO_PREPEND_SCRIPT) || this.writeFile(
      AUTO_PREPEND_SCRIPT,
      `<?php
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
				`
    ), e.onMessage = async (r) => {
      for (const n of u(this, J)) {
        const s = await n(r);
        if (s)
          return s;
      }
      return "";
    }, x2(this, G, improveWASMErrorReporting(e)), this.dispatchEvent({
      type: "runtime.initialized"
    });
  }
  /** @inheritDoc */
  async setSapiName(t) {
    if (this[__private__dont__use].ccall(
      "wasm_set_sapi_name",
      NUMBER,
      [STRING],
      [t]
    ) !== 0)
      throw new Error(
        "Could not set SAPI name. This can only be done before the PHP WASM module is initialized.Did you already dispatch any requests?"
      );
    x2(this, Q, t);
  }
  /**
   * Changes the current working directory in the PHP filesystem.
   * This is the directory that will be used as the base for relative paths.
   * For example, if the current working directory is `/root/php`, and the
   * path is `data`, the absolute path will be `/root/php/data`.
   *
   * @param  path - The new working directory.
   */
  chdir(t) {
    this[__private__dont__use].FS.chdir(t);
  }
  /**
   * Gets the current working directory in the PHP filesystem.
   *
   * @returns The current working directory.
   */
  cwd() {
    return this[__private__dont__use].FS.cwd();
  }
  /**
   * Changes the permissions of a file or directory.
   * @param path - The path to the file or directory.
   * @param mode - The new permissions.
   */
  chmod(t, e) {
    this[__private__dont__use].FS.chmod(t, e);
  }
  /**
   * Do not use. Use new PHPRequestHandler() instead.
   * @deprecated
   */
  async request(t) {
    if (import_logger.logger.debug(
      "PHP.request() is deprecated. Please use new PHPRequestHandler() instead."
    ), !this.requestHandler)
      throw new Error("No request handler available.");
    return this.requestHandler.request(t);
  }
  /**
   * Runs PHP code.
   *
   * This low-level method directly interacts with the WebAssembly
   * PHP interpreter.
   *
   * Every time you call run(), it prepares the PHP
   * environment and:
   *
   * * Resets the internal PHP state
   * * Populates superglobals ($_SERVER, $_GET, etc.)
   * * Handles file uploads
   * * Populates input streams (stdin, argv, etc.)
   * * Sets the current working directory
   *
   * You can use run() in two primary modes:
   *
   * ### Code snippet mode
   *
   * In this mode, you pass a string containing PHP code to run.
   *
   * ```ts
   * const result = await php.run({
   * 	code: `<?php echo "Hello world!";`
   * });
   * // result.text === "Hello world!"
   * ```
   *
   * In this mode, information like `__DIR__` or `__FILE__` isn't very
   * useful because the code is not associated with any file.
   *
   * Under the hood, the PHP snippet is passed to the `zend_eval_string`
   * C function.
   *
   * ### File mode
   *
   * In the file mode, you pass a scriptPath and PHP executes a file
   * found at a that path:
   *
   * ```ts
   * await php.writeFile(
   * 	"/www/index.php",
   * 	`<?php echo "Hello world!";`
   * );
   * const result = await php.run({
   * 	scriptPath: "/www/index.php"
   * });
   * // result.text === "Hello world!"
   * ```
   *
   * In this mode, you can rely on path-related information like `__DIR__`
   * or `__FILE__`.
   *
   * Under the hood, the PHP file is executed with the `php_execute_script`
   * C function.
   *
   * The `run()` method cannot be used in conjunction with `cli()`.
   *
   * @example
   * ```js
   * const result = await php.run({
   * 	code: `<?php
   * 		$fp = fopen('php://stderr', 'w');
   * 		fwrite($fp, "Hello, world!");
   * 	`
   * });
   * // result.errors === "Hello, world!"
   * ```
   *
   * @deprecated Use stream() instead.
   * @param  request - PHP runtime options.
   */
  async run(t) {
    const e = await this.runStream(t), r = await PHPResponse.fromStreamedResponse(e);
    if (r.exitCode !== 0)
      throw new PHPExecutionFailureError(
        `PHP.run() failed with exit code ${r.exitCode}. 

=== Stdout ===
 ${r.text}

=== Stderr ===
 ${r.errors}`,
        r,
        "request"
      );
    return r;
  }
  /**
   * Runs PHP code and returns a StreamedPHPResponse object that can be used to
   * process the output incrementally.
   *
   * This low-level method directly interacts with the WebAssembly
   * PHP interpreter and provides streaming capabilities for processing
   * PHP output as it becomes available.
   *
   * Every time you call stream(), it prepares the PHP
   * environment and:
   *
   * * Resets the internal PHP state
   * * Populates superglobals ($_SERVER, $_GET, etc.)
   * * Handles file uploads
   * * Populates input streams (stdin, argv, etc.)
   * * Sets the current working directory
   *
   * You can use stream() in two primary modes:
   *
   * ### Code snippet mode
   *
   * In this mode, you pass a string containing PHP code to run.
   *
   * ```ts
   * const streamedResponse = await php.stream({
   * 	code: `<?php echo "Hello world!";`
   * });
   * // Process output incrementally
   * for await (const chunk of streamedResponse.text) {
   * 	console.log(chunk);
   * }
   * ```
   *
   * In this mode, information like `__DIR__` or `__FILE__` isn't very
   * useful because the code is not associated with any file.
   *
   * Under the hood, the PHP snippet is passed to the `zend_eval_string`
   * C function.
   *
   * ### File mode
   *
   * In the file mode, you pass a scriptPath and PHP executes a file
   * found at that path:
   *
   * ```ts
   * php.writeFile(
   * 	"/www/index.php",
   * 	`<?php echo "Hello world!";"`
   * );
   * const streamedResponse = await php.stream({
   * 	scriptPath: "/www/index.php"
   * });
   * // Process output incrementally
   * for await (const chunk of streamedResponse.text) {
   * 	console.log(chunk);
   * }
   * ```
   *
   * In this mode, you can rely on path-related information like `__DIR__`
   * or `__FILE__`.
   *
   * Under the hood, the PHP file is executed with the `php_execute_script`
   * C function.
   *
   * The `stream()` method cannot be used in conjunction with `cli()`.
   *
   * @example
   * ```js
   * const streamedResponse = await php.stream({
   * 	code: `<?php
   * 		for ($i = 0; $i < 5; $i++) {
   * 			echo "Line $i\n";
   * 			flush();
   * 		}
   * 	`
   * });
   *
   * // Process output as it becomes available
   * for await (const chunk of streamedResponse.text) {
   * 	console.log('Received:', chunk);
   * }
   *
   * // Get the final exit code
   * const exitCode = await streamedResponse.exitCode;
   * console.log('Exit code:', exitCode);
   * ```
   *
   * @see run() – a synchronous version of this method.
   * @param request - PHP runtime options.
   * @returns A StreamedPHPResponse object.
   */
  async runStream(t) {
    const e = await this.semaphore.acquire();
    let r;
    const n = v2(this, y, we).call(this, async () => {
      if (u(this, z2) || (await this[__private__dont__use].ccall(
        "php_wasm_init",
        null,
        [],
        [],
        {
          isAsync: true
        }
      ), x2(this, z2, true)), t.scriptPath && !this.fileExists(t.scriptPath))
        throw new Error(
          `The script path "${t.scriptPath}" does not exist.`
        );
      v2(this, y, xe).call(this, t.relativeUri || ""), v2(this, y, be).call(this, t.method || "GET");
      const i = normalizeHeaders(t.headers || {}), o = i.host || "example.com:443", a2 = v2(this, y, Fe).call(this, o, t.protocol || "http");
      if (v2(this, y, Se).call(this, o), v2(this, y, ke).call(this, a2), v2(this, y, Re).call(this, i), t.body && (r = v2(this, y, He).call(this, t.body)), typeof t.code == "string")
        this.writeFile("/internal/eval.php", t.code), v2(this, y, ge).call(this, "/internal/eval.php");
      else if (typeof t.scriptPath == "string")
        v2(this, y, ge).call(this, t.scriptPath || "");
      else
        throw new TypeError(
          "The request object must have either a `code` or a `scriptPath` property."
        );
      const c3 = v2(this, y, Ee).call(this, t.$_SERVER, i, a2);
      for (const d2 in c3)
        v2(this, y, Te).call(this, d2, c3[d2]);
      const l = t.env || {};
      for (const d2 in l)
        v2(this, y, Pe).call(this, d2, l[d2]);
      return await this[__private__dont__use].ccall(
        "wasm_sapi_handle_request",
        NUMBER,
        [],
        [],
        { async: true }
      );
    }), s = () => {
      if (r)
        try {
          this[__private__dont__use].free(r);
        } catch (i) {
          import_logger.logger.error(i);
        }
      e(), this.dispatchEvent({
        type: "request.end"
      });
    };
    return n.then(
      (i) => (i.finished.finally(s), i),
      (i) => {
        try {
          s();
        } catch {
        } finally {
          throw i;
        }
      }
    );
  }
  /**
   * Defines a constant in the PHP runtime.
   * @param key - The name of the constant.
   * @param value - The value of the constant.
   */
  defineConstant(t, e) {
    let r = {};
    try {
      r = JSON.parse(
        this.fileExists("/internal/shared/consts.json") && this.readFileAsText("/internal/shared/consts.json") || "{}"
      );
    } catch {
    }
    this.writeFile(
      "/internal/shared/consts.json",
      JSON.stringify({
        ...r,
        [t]: e
      })
    );
  }
  /**
   * Recursively creates a directory with the given path in the PHP filesystem.
   * For example, if the path is `/root/php/data`, and `/root` already exists,
   * it will create the directories `/root/php` and `/root/php/data`.
   *
   * @param  path - The directory path to create.
   */
  mkdir(t) {
    const e = FSHelpers.mkdir(this[__private__dont__use].FS, t);
    return this.dispatchEvent({ type: "filesystem.write" }), e;
  }
  /**
   * @deprecated Use mkdir instead.
   */
  mkdirTree(t) {
    return FSHelpers.mkdir(this[__private__dont__use].FS, t);
  }
  /**
   * Reads a file from the PHP filesystem and returns it as a string.
   *
   * @throws {@link @php-wasm/universal:ErrnoError} – If the file doesn't exist.
   * @param  path - The file path to read.
   * @returns The file contents.
   */
  readFileAsText(t) {
    return FSHelpers.readFileAsText(this[__private__dont__use].FS, t);
  }
  /**
   * Reads a file from the PHP filesystem and returns it as an array buffer.
   *
   * @throws {@link @php-wasm/universal:ErrnoError} – If the file doesn't exist.
   * @param  path - The file path to read.
   * @returns The file contents.
   */
  readFileAsBuffer(t) {
    return FSHelpers.readFileAsBuffer(this[__private__dont__use].FS, t);
  }
  /**
   * Overwrites data in a file in the PHP filesystem.
   * Creates a new file if one doesn't exist yet.
   *
   * @param  path - The file path to write to.
   * @param  data - The data to write to the file.
   */
  writeFile(t, e) {
    const r = FSHelpers.writeFile(
      this[__private__dont__use].FS,
      t,
      e
    );
    return this.dispatchEvent({ type: "filesystem.write" }), r;
  }
  /**
   * Removes a file from the PHP filesystem.
   *
   * @throws {@link @php-wasm/universal:ErrnoError} – If the file doesn't exist.
   * @param  path - The file path to remove.
   */
  unlink(t) {
    const e = FSHelpers.unlink(this[__private__dont__use].FS, t);
    return this.dispatchEvent({ type: "filesystem.write" }), e;
  }
  /**
   * Moves a file or directory in the PHP filesystem to a
   * new location.
   *
   * @param fromPath The path to rename.
   * @param toPath The new path.
   */
  mv(t, e) {
    const r = FSHelpers.mv(
      this[__private__dont__use].FS,
      t,
      e
    );
    return this.dispatchEvent({ type: "filesystem.write" }), r;
  }
  /**
   * Copies a file or directory in the PHP filesystem to a
   * new location.
   *
   * @param fromPath The source path.
   * @param toPath The target path.
   */
  cp(t, e) {
    const r = FSHelpers.copyRecursive(
      this[__private__dont__use].FS,
      t,
      e
    );
    return this.dispatchEvent({ type: "filesystem.write" }), r;
  }
  /**
   * Removes a directory from the PHP filesystem.
   *
   * @param path The directory path to remove.
   * @param options Options for the removal.
   */
  rmdir(t, e = { recursive: true }) {
    const r = FSHelpers.rmdir(
      this[__private__dont__use].FS,
      t,
      e
    );
    return this.dispatchEvent({ type: "filesystem.write" }), r;
  }
  /**
   * Lists the files and directories in the given directory.
   *
   * @param  path - The directory path to list.
   * @param  options - Options for the listing.
   * @returns The list of files and directories in the given directory.
   */
  listFiles(t, e = { prependPath: false }) {
    return FSHelpers.listFiles(
      this[__private__dont__use].FS,
      t,
      e
    );
  }
  /**
   * Checks if a directory exists in the PHP filesystem.
   *
   * @param  path – The path to check.
   * @returns True if the path is a directory, false otherwise.
   */
  isDir(t) {
    return FSHelpers.isDir(this[__private__dont__use].FS, t);
  }
  /**
   * Checks if a file exists in the PHP filesystem.
   *
   * @param  path – The path to check.
   * @returns True if the path is a file, false otherwise.
   */
  isFile(t) {
    return FSHelpers.isFile(this[__private__dont__use].FS, t);
  }
  /**
   * Creates a symlink in the PHP filesystem.
   * @param target
   * @param path
   */
  symlink(t, e) {
    return FSHelpers.symlink(this[__private__dont__use].FS, t, e);
  }
  /**
   * Checks if a path is a symlink in the PHP filesystem.
   *
   * @param path
   * @returns True if the path is a symlink, false otherwise.
   */
  isSymlink(t) {
    return FSHelpers.isSymlink(this[__private__dont__use].FS, t);
  }
  /**
   * Reads the target of a symlink in the PHP filesystem.
   *
   * @param path
   * @returns The target of the symlink.
   */
  readlink(t) {
    return FSHelpers.readlink(this[__private__dont__use].FS, t);
  }
  /**
   * Resolves the real path of a file in the PHP filesystem.
   * @param path
   * @returns The real path of the file.
   */
  realpath(t) {
    return FSHelpers.realpath(this[__private__dont__use].FS, t);
  }
  /**
   * Checks if a file (or a directory) exists in the PHP filesystem.
   *
   * @param  path - The file path to check.
   * @returns True if the file exists, false otherwise.
   */
  fileExists(t) {
    return FSHelpers.fileExists(this[__private__dont__use].FS, t);
  }
  /**
   * Enables inline PHP runtime rotation after a certain number of requests
   * or an internal crash.
   */
  enableRuntimeRotation(t) {
    x2(this, k, {
      ...u(this, k),
      enabled: true,
      recreateRuntime: t.recreateRuntime,
      maxRequests: t.maxRequests ?? 400
    });
  }
  async rotateRuntime() {
    if (!u(this, k).enabled)
      throw new Error(
        "Runtime rotation is not enabled. Call enableRuntimeRotation() first."
      );
    await this.hotSwapPHPRuntime(
      await u(this, k).recreateRuntime()
    ), u(this, k).requestsMade = 0, u(this, k).needsRotating = false;
  }
  /**
   * Hot-swaps the PHP runtime for a new one without
   * interrupting the operations of this PHP instance.
   *
   * @param runtime
   */
  async hotSwapPHPRuntime(t) {
    const e = this[__private__dont__use].FS, r = this.listFiles("/").map((a2) => `/${a2}`), n = e.cwd();
    e.chdir("/");
    const s = Object.entries(u(this, W2)).map(
      ([a2, c3]) => ({
        mountHandler: c3.mountHandler,
        mountPointSnapshot: snapshotMountPoint(e, a2),
        vfsPath: a2
      })
    ), i = Object.values(
      u(this, W2)
    ).reverse();
    for (const a2 of i)
      await a2.unmount();
    try {
      this.exit();
    } catch {
    }
    this.initializeRuntime(t), u(this, Q) && this.setSapiName(u(this, Q));
    const o = this[__private__dont__use].FS;
    for (const a2 of r)
      a2 && a2 !== "/request" && copyMEMFSNodes(e, o, a2);
    for (const {
      mountHandler: a2,
      mountPointSnapshot: c3,
      vfsPath: l
    } of s)
      try {
        await this.mount(l, a2);
      } catch (d2) {
        if (isMissingMountSourceError(d2)) {
          restoreMountPointSnapshot(
            o,
            l,
            c3
          );
          continue;
        }
        if (!isMissingMountTargetPathError(d2))
          throw d2;
        this.mkdir(l), await this.mount(l, a2);
      }
    try {
      o.chdir(n);
    } catch (a2) {
      throw new Error(
        `Failed to restore CWD to ${n} after PHP runtime rotation.`,
        {
          cause: a2
        }
      );
    }
  }
  /**
   * Mounts a filesystem to a given path in the PHP filesystem.
   *
   * The returned unmount function removes the mount from runtime-rotation
   * tracking on success or ordinary failure. `MountStillActiveError` leaves it
   * tracked because the handler guarantees the mount remains live and retryable.
   *
   * @param  virtualFSPath - Where to mount it in the PHP virtual filesystem.
   * @param  mountHandler - The mount handler to use.
   * @return Unmount function to unmount the filesystem.
   */
  async mount(t, e) {
    const r = await e(
      this,
      this[__private__dont__use].FS,
      t
    ), n = {
      mountHandler: e,
      unmount: async () => {
        try {
          await r();
        } catch (s) {
          throw s instanceof MountStillActiveError || delete u(this, W2)[t], s;
        }
        delete u(this, W2)[t];
      }
    };
    return u(this, W2)[t] = n, async () => {
      const s = u(this, W2)[t];
      (s == null ? void 0 : s.mountHandler) === e && await s.unmount();
    };
  }
  /**
   * Starts a PHP CLI session with given arguments.
   *
   * This method can only be used when PHP was compiled with the CLI SAPI
   * and it cannot be used in conjunction with `run()`.
   *
   * Once this method finishes running, the PHP instance is no
   * longer usable and should be discarded. This is because PHP
   * internally cleans up all the resources and calls exit().
   *
   * @param  argv - The arguments to pass to the CLI.
   * @returns The exit code of the CLI session.
   */
  async cli(t, e = {}) {
    if (j(t[0] ?? "") !== "php")
      return this.subProcess(t, e);
    u(this, z2) && (u(this, k).needsRotating = true);
    const r = await this.semaphore.acquire();
    return await v2(this, y, we).call(this, () => {
      const n = e.env || {};
      for (const [s, i] of Object.entries(n))
        v2(this, y, Pe).call(this, s, i);
      t = [t[0], "-c", PHP_INI_PATH, ...t.slice(1)];
      for (const s of t)
        this[__private__dont__use].ccall(
          "wasm_add_cli_arg",
          null,
          [STRING],
          [s]
        );
      return this[__private__dont__use].ccall("run_cli", null, [], [], {
        async: true
      });
    }).then((n) => (n.exitCode.finally(r), n)).finally(() => {
      u(this, k).needsRotating = true;
    });
  }
  /**
   * Runs an arbitrary CLI command using the spawn handler associated
   * with this PHP instance.
   *
   * @param argv
   * @param options
   * @returns StreamedPHPResponse.
   */
  async subProcess(t, e = {}) {
    const r = v2(this, y, ye).call(this, t[0], t.slice(1), {
      env: e.env,
      cwd: e.cwd ?? this.cwd()
    }), n = await createInvertedReadableStream();
    r.on("error", (a2) => {
      safeStreamError$1(n.controller, a2);
    });
    const s = (a2) => {
      try {
        n.controller.enqueue(a2);
      } catch {
        r.stderr.off("data", s);
      }
    };
    r.stderr.on("data", s);
    const i = await createInvertedReadableStream(), o = (a2) => {
      try {
        i.controller.enqueue(a2);
      } catch {
        r.stdout.off("data", o);
      }
    };
    return r.stdout.on("data", o), r.on("exit", () => {
      setTimeout(() => {
        try {
          n.controller.close();
        } catch {
        }
        try {
          i.controller.close();
        } catch {
        }
      }, 0);
    }), new StreamedPHPResponse(
      // Headers stream
      new ReadableStream({
        start(a2) {
          a2.close();
        }
      }),
      i.stream,
      n.stream,
      // Exit code
      new Promise((a2) => {
        r.on("exit", (c3) => {
          a2(c3);
        });
      })
    );
  }
  setSkipShebang(t) {
    this[__private__dont__use].ccall(
      "wasm_set_skip_shebang",
      null,
      [NUMBER],
      [t ? 1 : 0]
    );
  }
  exit(t = 0) {
    this.dispatchEvent({
      type: "runtime.beforeExit"
    });
    try {
      this[__private__dont__use]._exit(t);
    } catch {
    }
    x2(this, z2, false), x2(this, G, null), this[__private__dont__use] && (delete this[__private__dont__use].onMessage, delete this[__private__dont__use]);
  }
  [Symbol.dispose]() {
    this.exit(0);
  }
};
Q = /* @__PURE__ */ new WeakMap(), z2 = /* @__PURE__ */ new WeakMap(), G = /* @__PURE__ */ new WeakMap(), j2 = /* @__PURE__ */ new WeakMap(), J = /* @__PURE__ */ new WeakMap(), W2 = /* @__PURE__ */ new WeakMap(), K = /* @__PURE__ */ new WeakMap(), ne = /* @__PURE__ */ new WeakMap(), k = /* @__PURE__ */ new WeakMap(), y = /* @__PURE__ */ new WeakSet(), /**
* Routes every process spawn requested by the PHP runtime.
*
* Commands registered via setCommandSpawnHandler() are dispatched to
* their dedicated handlers; setSpawnHandler() cannot displace them.
* Every other command is delegated to the handler installed via
* setSpawnHandler().
*/
ye = function(t, e = [], r = {}) {
  const n = Array.isArray(t) ? t : e.length ? [t, ...e] : x(t), s = n[0] && u(this, ne).get(j(n[0]));
  if (s)
    return s(
      n[0],
      n.slice(1),
      r
    );
  if (u(this, K))
    return u(this, K).call(this, t, e, r);
  const i = new Error(
    `popen(), proc_open() are unsupported on this PHP instance. Call php.setSpawnHandler()
			and provide a callback to handle spawning processes, or disable popen(), proc_open() via php.ini.`
  );
  throw i.code = "SPAWN_UNSUPPORTED", i;
}, /**
* Prepares the $_SERVER entries for the PHP runtime.
*
* @param defaults Default entries to include in $_SERVER.
* @param headers HTTP headers to include in $_SERVER (as HTTP_ prefixed entries).
* @param port HTTP port, used to determine infer $_SERVER['HTTPS'] value if none
*             was provided.
* @returns Computed $_SERVER entries.
*/
Ee = function(t, e, r) {
  const n = {
    ...t || {}
  };
  n.HTTPS = n.HTTPS || r === 443 ? "on" : "off";
  for (const s in e) {
    let i = "HTTP_";
    ["content-type", "content-length"].includes(s.toLowerCase()) && (i = ""), n[`${i}${s.toUpperCase().replace(/-/g, "_")}`] = e[s];
  }
  return n;
}, xe = function(t) {
  this[__private__dont__use].ccall(
    "wasm_set_request_uri",
    null,
    [STRING],
    [t]
  );
  let e = "";
  t.includes("?") && (e = t.substring(t.indexOf("?") + 1)), this[__private__dont__use].ccall(
    "wasm_set_query_string",
    null,
    [STRING],
    [e]
  );
}, Se = function(t) {
  this[__private__dont__use].ccall(
    "wasm_set_request_host",
    null,
    [STRING],
    [t]
  );
}, ke = function(t) {
  this[__private__dont__use].ccall(
    "wasm_set_request_port",
    null,
    [NUMBER],
    [t]
  );
}, Fe = function(t, e) {
  let r;
  try {
    r = parseInt(new URL(t).port, 10);
  } catch {
  }
  return (!r || isNaN(r) || r === 80) && (r = e === "https" ? 443 : 80), r;
}, be = function(t) {
  this[__private__dont__use].ccall(
    "wasm_set_request_method",
    null,
    [STRING],
    [t]
  );
}, Re = function(t) {
  t.cookie && this[__private__dont__use].ccall(
    "wasm_set_cookies",
    null,
    [STRING],
    [t.cookie]
  ), t["content-type"] && this[__private__dont__use].ccall(
    "wasm_set_content_type",
    null,
    [STRING],
    [t["content-type"]]
  ), t["content-length"] && this[__private__dont__use].ccall(
    "wasm_set_content_length",
    null,
    [NUMBER],
    [parseInt(t["content-length"], 10)]
  );
}, He = function(t) {
  let e, r;
  typeof t == "string" ? (import_logger.logger.warn(
    "Passing a string as the request body is deprecated. Please use a Uint8Array instead. See https://github.com/WordPress/wordpress-playground/issues/997 for more details"
  ), r = this[__private__dont__use].lengthBytesUTF8(t), e = r + 1) : (r = t.byteLength, e = t.byteLength);
  const n = this[__private__dont__use].malloc(e);
  if (!n)
    throw new Error("Could not allocate memory for the request body.");
  return typeof t == "string" ? this[__private__dont__use].stringToUTF8(
    t,
    n,
    e + 1
  ) : this[__private__dont__use].HEAPU8.set(t, n), this[__private__dont__use].ccall(
    "wasm_set_request_body",
    null,
    [NUMBER],
    [n]
  ), this[__private__dont__use].ccall(
    "wasm_set_content_length",
    null,
    [NUMBER],
    [r]
  ), n;
}, ge = function(t) {
  this[__private__dont__use].ccall(
    "wasm_set_path_translated",
    null,
    [STRING],
    [t]
  );
}, Te = function(t, e) {
  this[__private__dont__use].ccall(
    "wasm_add_SERVER_entry",
    null,
    [STRING, STRING],
    [t, e]
  );
}, Pe = function(t, e) {
  this[__private__dont__use].ccall(
    "wasm_add_ENV_entry",
    null,
    [STRING, STRING],
    [t, e]
  );
}, we = async function(t) {
  u(this, k).enabled && u(this, k).needsRotating && await this.rotateRuntime(), ++u(this, k).requestsMade, u(this, k).requestsMade >= u(this, k).maxRequests && (u(this, k).needsRotating = true);
  const e = this[__private__dont__use], r = await createInvertedReadableStream();
  e.onHeaders = (p2) => {
    a2 || n || r.controller.enqueue(p2.slice());
  };
  let n = false;
  const s = () => {
    n || (n = true, r.controller.close());
  }, i = await createInvertedReadableStream();
  e.onStdout = (p2) => {
    s(), !a2 && i.controller.enqueue(p2.slice());
  };
  const o = await createInvertedReadableStream();
  e.onStderr = (p2) => {
    a2 || o.controller.enqueue(p2.slice());
  };
  let a2 = false, c3;
  const d2 = (async () => {
    var p2;
    try {
      return await Promise.race([
        t(),
        new Promise((P4, S3) => {
          var N2;
          c3 = (B) => {
            isExitCode(B.error) || S3(B.error);
          }, (N2 = u(this, G)) == null || N2.addEventListener(
            "error",
            c3,
            { once: true }
          );
        })
      ]);
    } catch (h3) {
      if (isExitCode(h3))
        return h3.status;
      safeStreamError$1(i.controller, h3), safeStreamError$1(o.controller, h3), safeStreamError$1(r.controller, h3), a2 = true;
      for (const P4 in this)
        typeof this[P4] == "function" && (this[P4] = () => {
          throw new Error(
            "PHP runtime has crashed \u2013 see the earlier error for details."
          );
        });
      throw this.functionsMaybeMissingFromAsyncify = getFunctionsMaybeMissingFromAsyncify(), h3;
    } finally {
      a2 || (safeStreamClose$1(i.controller), safeStreamClose$1(o.controller), s(), a2 = true), (p2 = u(this, G)) == null || p2.removeEventListener(
        "error",
        c3
      );
    }
  })().then(
    (p2) => (p2 !== 0 && this.dispatchEvent({
      type: "request.error",
      error: new Error(
        `PHP.run() failed with exit code ${p2}.`
      ),
      // Distinguish between PHP request and PHP-wasm errors
      source: "php-wasm"
    }), p2),
    (p2) => {
      const h3 = p2.source ?? "php-wasm";
      throw this.dispatchEvent({
        type: "request.error",
        error: p2,
        source: h3
      }), p2;
    }
  );
  return new StreamedPHPResponse(
    r.stream,
    i.stream,
    o.stream,
    d2
  );
};
function normalizeHeaders(t) {
  const e = {};
  for (const r in t)
    e[r.toLowerCase()] = t[r];
  return e;
}
function copyMEMFSNodes(t, e, r) {
  if (getNodeType(t, r) !== "memfs" || !["memfs", "missing"].includes(getNodeType(e, r)))
    return;
  const n = t.lookupPath(r, { follow: false });
  if (t.isLink(n.node.mode)) {
    const i = t.readlink(r);
    e.symlink(i, r);
    return;
  }
  if (!t.isDir(n.node.mode)) {
    e.writeFile(r, t.readFile(r));
    return;
  }
  e.mkdirTree(r);
  const s = t.readdir(r).filter((i) => i !== "." && i !== "..");
  for (const i of s)
    copyMEMFSNodes(t, e, m(r, i));
}
function snapshotMountPoint(t, e) {
  try {
    const r = t.lookupPath(e, { follow: false });
    return t.isLink(r.node.mode) ? { kind: "symlink", target: t.readlink(e) } : t.isDir(r.node.mode) ? { kind: "directory" } : { kind: "file" };
  } catch {
    return;
  }
}
function restoreMountPointSnapshot(t, e, r) {
  if (!(!r || getNodeType(t, e) !== "missing")) {
    if (r.kind === "directory") {
      t.mkdirTree(e);
      return;
    }
    t.mkdirTree(W(e)), r.kind === "symlink" ? t.symlink(r.target, e) : t.writeFile(e, new Uint8Array());
  }
}
function isMissingMountSourceError(t) {
  return t.phpWasmMountSourceMissing === true;
}
function isMissingMountTargetPathError(t) {
  return t.errno === 44;
}
async function createInvertedReadableStream(t = {}) {
  let e;
  const r = new Promise(
    (i) => {
      e = i;
    }
  ), n = new ReadableStream({
    ...t,
    start(i) {
      if (e(i), t.start)
        return t.start(i);
    }
  }), s = await r;
  return {
    stream: n,
    controller: s
  };
}
function safeStreamError$1(t, e) {
  try {
    t.error(e);
  } catch {
  }
}
function safeStreamClose$1(t) {
  try {
    t.close();
  } catch {
  }
}
var getNodeType = (t, e) => {
  try {
    return "contents" in t.lookupPath(e, { follow: true }).node ? "memfs" : (
      /**
      * Could be NODEFS, PROXYFS, etc.
      */
      "not-memfs"
    );
  } catch {
    return "missing";
  }
};
async function getPhpIniEntries(t, e) {
  const r = (0, import_ini.parse)(await t.readFileAsText(PHP_INI_PATH));
  if (e === void 0)
    return r;
  const n = {};
  for (const s of e)
    n[s] = r[s];
  return n;
}
async function setPhpIniEntries(t, e) {
  const r = (0, import_ini.parse)(await t.readFileAsText(PHP_INI_PATH));
  for (const [n, s] of Object.entries(e))
    s == null ? delete r[n] : r[n] = s;
  await t.writeFile(PHP_INI_PATH, (0, import_ini.stringify)(r));
}
async function withPHPIniValues(t, e, r) {
  const n = await t.readFileAsText(PHP_INI_PATH);
  try {
    return await setPhpIniEntries(t, e), await r();
  } finally {
    await t.writeFile(PHP_INI_PATH, n);
  }
}
async function printDebugDetails(t, e) {
  e && printResponseDebugDetails(
    await PHPResponse.fromStreamedResponse(e)
  ), await prettyPrintFullStackTrace(t);
}
async function prettyPrintFullStackTrace(t) {
  let e = t, r = true;
  for (; e; )
    r || process.stderr.write(`
Caused by:

`), process.stderr.write(e.originalErrorClassName ?? e.name), process.stderr.write(": " + e.message + `
`), process.stderr.write(
      (e.stack + "").split(`
`).slice(1).join(`
`)
    ), process.stderr.write(`
`), e.response && printResponseDebugDetails(e.response), e.phpLogs && (process.stderr.write(`

==== PHP error log ====

`), process.stderr.write(e.phpLogs)), e = e.cause, r = false;
  process.stderr.write(`
`);
}
function describeError(t, e = /* @__PURE__ */ new WeakSet(), r = 0, n = {}) {
  return r > 10 ? "[Max error cause depth exceeded]" : t instanceof Error ? t.message ? t.message : describeErrorObject(t, e, r, {
    ...n,
    suppressGenericErrorName: true
  }) : t && typeof t == "object" ? describeErrorObject(t, e, r, n) : String(t);
}
function describeErrorObject(t, e, r, n = {}) {
  if (e.has(t))
    return "[Circular error cause]";
  e.add(t);
  const s = [];
  if (t.name && !(n.suppressGenericErrorName && t.name === "Error") && s.push(String(t.name)), t.message && s.push(String(t.message)), t.errno !== void 0 && s.push(`errno: ${t.errno}`), t.code !== void 0 && s.push(`code: ${t.code}`), t.cause && s.push(
    `caused by: ${describeError(
      t.cause,
      e,
      r + 1,
      n
    )}`
  ), s.length > 0)
    return s.join(" \u2014 ");
  if (typeof t.stack == "string")
    return t.stack;
  try {
    return JSON.stringify(t);
  } catch {
    return String(t);
  }
}
function printResponseDebugDetails(t) {
  process.stderr.write(
    `
    exitCode=${t.exitCode} httpStatusCode=${t.httpStatusCode} `
  );
  const e = t.headers && Object.keys(t.headers).length > 0;
  e || process.stderr.write("responseHeaders=(empty) "), t.text || process.stderr.write("stdout=(empty) "), t.errors || process.stderr.write("stderr=(empty) "), process.stderr.write(`
`), e && process.stderr.write(
    `
==== PHP response headers ====

${JSON.stringify(
      t.headers,
      null,
      2
    )}

`
  ), t.text && (process.stderr.write(`
==== PHP stdout ====

`), process.stderr.write(t.text)), t.errors && (process.stderr.write(`
==== PHP stderr ====

`), process.stderr.write(t.errors)), process.stderr.write(`
`);
}
var HttpCookieStore = class {
  constructor() {
    this.cookies = {};
  }
  rememberCookiesFromResponseHeaders(e) {
    if (e != null && e["set-cookie"])
      for (const r of e["set-cookie"])
        try {
          if (!r.includes("="))
            continue;
          const n = r.indexOf("="), s = r.substring(0, n), i = r.substring(n + 1).split(";")[0];
          this.cookies[s] = i;
        } catch (n) {
          import_logger.logger.error(n);
        }
  }
  getCookieRequestHeader() {
    const e = [];
    for (const r in this.cookies)
      e.push(`${r}=${this.cookies[r]}`);
    return e.join("; ");
  }
};
function streamReadFileFromPHP(t, e) {
  return new ReadableStream({
    async pull(r) {
      const n = await t.readFileAsBuffer(e);
      r.enqueue(n), r.close();
    }
  });
}
async function* iteratePhpFiles(t, e, {
  relativePaths: r = true,
  pathPrefix: n,
  exceptPaths: s = []
} = {}) {
  e = c(e);
  const i = [e];
  for (; i.length; ) {
    const o = i.pop();
    if (!o)
      return;
    const a2 = await t.listFiles(o);
    for (const c3 of a2) {
      const l = `${o}/${c3}`;
      if (s.includes(l.substring(e.length + 1)))
        continue;
      await t.isDir(l) ? i.push(l) : yield new E2(
        streamReadFileFromPHP(t, l),
        r ? m(
          n || "",
          l.substring(e.length + 1)
        ) : l
      );
    }
  }
}
function writeFilesStreamToPhp(t, e) {
  return new WritableStream({
    async write(r) {
      const n = m(e, r.name);
      r.type === "directory" ? await t.mkdir(n) : (await t.mkdir(W(n)), await t.writeFile(
        n,
        new Uint8Array(await r.arrayBuffer())
      ));
    }
  });
}
var SinglePHPInstanceManager = class {
  constructor(e) {
    if (this.isAcquired = false, !e.php && !e.phpFactory)
      throw new Error(
        "SinglePHPInstanceManager requires either php or phpFactory"
      );
    this.php = e.php, this.phpFactory = e.phpFactory;
  }
  async getPrimaryPhp() {
    return this.php ? this.php : (this.phpPromise || (this.phpPromise = this.phpFactory().then((e) => (this.php = e, this.phpPromise = void 0, e))), this.phpPromise);
  }
  async acquirePHPInstance() {
    if (this.isAcquired)
      throw new Error(
        "The PHP instance already acquired. SinglePHPInstanceManager cannot spawn another PHP instance since, by definition, it only manages a single PHP instance."
      );
    const e = await this.getPrimaryPhp();
    return this.isAcquired = true, {
      php: e,
      reap: () => {
        this.isAcquired = false;
      }
    };
  }
  async [Symbol.asyncDispose]() {
    this.php && this.php.exit();
  }
};
var MaxPhpInstancesError = class extends Error {
  constructor(e) {
    super(
      `Requested more concurrent PHP instances than the limit (${e}).`
    ), this.name = this.constructor.name;
  }
};
var PHPProcessManager = class {
  constructor(e) {
    this.instances = [], this.idleInstances = [], this.maxPhpInstances = (e == null ? void 0 : e.maxPhpInstances) ?? 2, this.phpFactory = e == null ? void 0 : e.phpFactory, this.semaphore = new v({
      concurrency: this.maxPhpInstances,
      timeout: (e == null ? void 0 : e.timeout) || 3e4
    });
  }
  /**
   * Get the primary PHP instance (the first one spawned).
   * If no instance exists yet, one will be spawned and marked as idle.
   */
  async getPrimaryPhp() {
    if (this.instances.length > 0)
      return this.instances[0];
    this.primaryPhpPromise || (this.primaryPhpPromise = this.spawnInstance(true));
    try {
      return await this.primaryPhpPromise;
    } finally {
      this.primaryPhpPromise = void 0;
    }
  }
  /**
   * Acquire a PHP instance for processing a request.
   *
   * Returns an idle instance from the pool, or spawns a new one if
   * the pool isn't at capacity. If all instances are busy, waits
   * until one becomes available.
   *
   * @throws {MaxPhpInstancesError} when the timeout is reached waiting
   *                                for an available instance.
   */
  async acquirePHPInstance() {
    let e;
    try {
      e = await this.semaphore.acquire();
    } catch (n) {
      throw n instanceof b ? new MaxPhpInstancesError(this.maxPhpInstances) : n;
    }
    const r = await this.getOrSpawnInstance();
    return {
      php: r,
      reap: () => {
        this.idleInstances.push(r), e();
      }
    };
  }
  /**
   * Get an idle instance or spawn a new one.
   */
  async getOrSpawnInstance() {
    return this.instances.length === 0 && await this.getPrimaryPhp(), this.idleInstances.length === 0 && await this.spawnInstance(false), this.idleInstances.pop();
  }
  /**
   * Spawn a new PHP instance.
   */
  async spawnInstance(e) {
    if (!this.phpFactory)
      throw new Error(
        "phpFactory must be set before spawning instances."
      );
    const r = await this.phpFactory({ isPrimary: e });
    return this.instances.push(r), this.idleInstances.push(r), r;
  }
  async [Symbol.asyncDispose]() {
    for (const e of this.instances)
      e.exit();
    this.instances = [], this.idleInstances = [];
  }
};
var PHPNextVersion = "next";
var SupportedPHPVersions = [
  "8.5",
  "8.4",
  "8.3",
  "8.2",
  "8.1",
  "8.0",
  "7.4"
];
var LatestSupportedPHPVersion = SupportedPHPVersions[0];
var SupportedPHPVersionsList = SupportedPHPVersions;
var LegacyPHPVersions = ["5.2"];
function isPHPNextVersion(t) {
  return t === PHPNextVersion;
}
function isLegacyPHPVersion(t) {
  return LegacyPHPVersions.includes(t ?? "");
}
var AllPHPVersions = [
  PHPNextVersion,
  ...SupportedPHPVersions,
  ...LegacyPHPVersions
];
var LEGACY_PHP_INI_PATH = "/internal/shared/php.ini";
var LEGACY_PHP_INI_CONTENT = [
  "auto_prepend_file=/internal/shared/auto_prepend_file.php",
  "memory_limit=256M",
  "ignore_repeated_errors = 1",
  "error_reporting = E_ALL",
  "display_errors = 1",
  "html_errors = 1",
  "display_startup_errors = On",
  "log_errors = 1",
  "always_populate_raw_post_data = -1",
  "upload_max_filesize = 2000M",
  "post_max_size = 2000M",
  "allow_url_fopen = On",
  "allow_url_include = Off",
  "session.save_path = /home/web_user",
  "implicit_flush = 1",
  "output_buffering = 0",
  "max_execution_time = 0",
  "max_input_time = -1",
  "disable_functions = ini_get_all",
  "opcache.enable = 0",
  "opcache.enable_cli = 0"
].join(`
`);
function createLegacyPhpIniPreRunStep() {
  return (t) => {
    t.FS.mkdirTree("/internal/shared"), t.FS.writeFile(LEGACY_PHP_INI_PATH, LEGACY_PHP_INI_CONTENT);
  };
}
var DEFAULT_BASE_URL = "http://example.com";
function toRelativeUrl(t) {
  return t.origin === "null" ? t.toString() : t.toString().substring(t.origin.length);
}
function removePathPrefix(t, e) {
  return !e || !t.startsWith(e) ? t : t.substring(e.length);
}
function ensurePathPrefix(t, e) {
  return !e || t.startsWith(e) ? t : e + t;
}
async function encodeAsMultipart(t) {
  const e = `----${Math.random().toString(36).slice(2)}`, r = `multipart/form-data; boundary=${e}`, n = new TextEncoder(), s = [];
  for (const [c3, l] of Object.entries(t))
    s.push(`--${e}\r
`), s.push(`Content-Disposition: form-data; name="${c3}"`), l instanceof File && s.push(`; filename="${l.name}"`), s.push(`\r
`), l instanceof File && (s.push("Content-Type: application/octet-stream"), s.push(`\r
`)), s.push(`\r
`), l instanceof File ? s.push(await fileToUint8Array(l)) : s.push(l), s.push(`\r
`);
  s.push(`--${e}--\r
`);
  const i = s.reduce((c3, l) => c3 + l.length, 0), o = new Uint8Array(i);
  let a2 = 0;
  for (const c3 of s)
    o.set(
      typeof c3 == "string" ? n.encode(c3) : c3,
      a2
    ), a2 += c3.length;
  return { bytes: o, contentType: r };
}
function fileToUint8Array(t) {
  return t.arrayBuffer().then((e) => new Uint8Array(e));
}
var _default = "application/octet-stream";
var asx = "video/x-ms-asf";
var atom = "application/atom+xml";
var avi = "video/x-msvideo";
var avif = "image/avif";
var bin = "application/octet-stream";
var bmp = "image/x-ms-bmp";
var cco = "application/x-cocoa";
var cjs = "application/javascript";
var css = "text/css";
var data = "application/octet-stream";
var deb = "application/octet-stream";
var der = "application/x-x509-ca-cert";
var dmg = "application/octet-stream";
var doc = "application/msword";
var docx = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
var eot = "application/vnd.ms-fontobject";
var flv = "video/x-flv";
var gif = "image/gif";
var gz = "application/gzip";
var hqx = "application/mac-binhex40";
var htc = "text/x-component";
var html = "text/html";
var ico = "image/x-icon";
var iso = "application/octet-stream";
var jad = "text/vnd.sun.j2me.app-descriptor";
var jar = "application/java-archive";
var jardiff = "application/x-java-archive-diff";
var jng = "image/x-jng";
var jnlp = "application/x-java-jnlp-file";
var jpg = "image/jpeg";
var jpeg = "image/jpeg";
var js = "application/javascript";
var json = "application/json";
var kml = "application/vnd.google-earth.kml+xml";
var kmz = "application/vnd.google-earth.kmz";
var m3u8 = "application/vnd.apple.mpegurl";
var m4a = "audio/x-m4a";
var m4v = "video/x-m4v";
var md = "text/plain";
var mid = "audio/midi";
var mjs = "application/javascript";
var mml = "text/mathml";
var mng = "video/x-mng";
var mov = "video/quicktime";
var mp3 = "audio/mpeg";
var mp4 = "video/mp4";
var mpeg = "video/mpeg";
var msi = "application/octet-stream";
var odg = "application/vnd.oasis.opendocument.graphics";
var odp = "application/vnd.oasis.opendocument.presentation";
var ods = "application/vnd.oasis.opendocument.spreadsheet";
var odt = "application/vnd.oasis.opendocument.text";
var ogg = "audio/ogg";
var otf = "font/otf";
var pdf = "application/pdf";
var pl = "application/x-perl";
var png = "image/png";
var ppt = "application/vnd.ms-powerpoint";
var pptx = "application/vnd.openxmlformats-officedocument.presentationml.presentation";
var prc = "application/x-pilot";
var ps = "application/postscript";
var ra = "audio/x-realaudio";
var rar = "application/x-rar-compressed";
var rpm = "application/x-redhat-package-manager";
var rss = "application/rss+xml";
var rtf = "application/rtf";
var run = "application/x-makeself";
var sea = "application/x-sea";
var sit = "application/x-stuffit";
var svg = "image/svg+xml";
var swf = "application/x-shockwave-flash";
var tcl = "application/x-tcl";
var tar = "application/x-tar";
var tif = "image/tiff";
var ts = "video/mp2t";
var ttf = "font/ttf";
var txt = "text/plain";
var wasm = "application/wasm";
var wbmp = "image/vnd.wap.wbmp";
var webm = "video/webm";
var webp = "image/webp";
var wml = "text/vnd.wap.wml";
var wmlc = "application/vnd.wap.wmlc";
var wmv = "video/x-ms-wmv";
var woff = "font/woff";
var woff2 = "font/woff2";
var xhtml = "application/xhtml+xml";
var xls = "application/vnd.ms-excel";
var xlsx = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
var xml = "text/xml";
var xpi = "application/x-xpinstall";
var xspf = "application/xspf+xml";
var zip = "application/zip";
var mimeTypes = {
  _default,
  "3gpp": "video/3gpp",
  "7z": "application/x-7z-compressed",
  asx,
  atom,
  avi,
  avif,
  bin,
  bmp,
  cco,
  cjs,
  css,
  data,
  deb,
  der,
  dmg,
  doc,
  docx,
  eot,
  flv,
  gif,
  gz,
  hqx,
  htc,
  html,
  ico,
  iso,
  jad,
  jar,
  jardiff,
  jng,
  jnlp,
  jpg,
  jpeg,
  js,
  json,
  kml,
  kmz,
  m3u8,
  m4a,
  m4v,
  md,
  mid,
  mjs,
  mml,
  mng,
  mov,
  mp3,
  mp4,
  mpeg,
  msi,
  odg,
  odp,
  ods,
  odt,
  ogg,
  otf,
  pdf,
  pl,
  png,
  ppt,
  pptx,
  prc,
  ps,
  ra,
  rar,
  rpm,
  rss,
  rtf,
  run,
  sea,
  sit,
  svg,
  swf,
  tcl,
  tar,
  tif,
  ts,
  ttf,
  txt,
  wasm,
  wbmp,
  webm,
  webp,
  wml,
  wmlc,
  wmv,
  woff,
  woff2,
  xhtml,
  xls,
  xlsx,
  xml,
  xpi,
  xspf,
  zip
};
var C;
var Z;
var ie;
var X;
var ee;
var I3;
var te;
var V2;
var oe;
var R;
var Me;
var le;
var Le;
var Ie;
var Ae;
var PHPRequestHandler = class {
  /**
   * The request handler needs to decide whether to serve a static asset or
   * run the PHP interpreter. For static assets it should just reuse the primary
   * PHP even if there's 50 concurrent requests to serve. However, for
   * dynamic PHP requests, it needs to grab an available interpreter.
   * Therefore, it cannot just accept PHP as an argument as serving requests
   * requires access to ProcessManager.
   *
   * @param  php    - The PHP instance.
   * @param  config - Request Handler configuration.
   */
  constructor(e) {
    _2(this, R);
    _2(this, C);
    _2(this, Z);
    _2(this, ie);
    _2(this, X);
    _2(this, ee);
    _2(this, I3);
    _2(this, te);
    _2(this, V2);
    _2(this, oe);
    const {
      documentRoot: r = "/www/",
      absoluteUrl: n = typeof location == "object" ? location.href : DEFAULT_BASE_URL,
      rewriteRules: s = [],
      pathAliases: i = [],
      getFileNotFoundAction: o = () => ({ type: "404" })
    } = e, a2 = (d2) => {
      d2.isDir(r) || d2.mkdir(r), d2.chdir(r), d2.requestHandler = this;
    };
    if (e.php)
      a2(e.php), this.instanceManager = new SinglePHPInstanceManager({
        php: e.php
      });
    else if (e.phpFactory)
      this.instanceManager = new PHPProcessManager({
        phpFactory: async (d2) => {
          const p2 = await e.phpFactory({
            ...d2,
            requestHandler: this
          });
          return a2(p2), p2;
        },
        maxPhpInstances: e.maxPhpInstances
      });
    else
      throw new Error(
        "Either php or phpFactory must be provided in the configuration."
      );
    x2(this, V2, e.cookieStore === void 0 ? new HttpCookieStore() : e.cookieStore), x2(this, C, r);
    const c3 = new URL(n);
    x2(this, ie, c3.hostname), x2(this, X, c3.port ? Number(c3.port) : c3.protocol === "https:" ? 443 : 80), x2(this, Z, (c3.protocol || "").replace(":", ""));
    const l = u(this, X) !== 443 && u(this, X) !== 80;
    x2(this, ee, [
      u(this, ie),
      l ? `:${u(this, X)}` : ""
    ].join("")), x2(this, I3, c3.pathname.replace(/\/+$/, "")), x2(this, te, [
      `${u(this, Z)}://`,
      u(this, ee),
      u(this, I3)
    ].join("")), this.rewriteRules = s, x2(this, oe, i), this.getFileNotFoundAction = o;
  }
  async getPrimaryPhp() {
    return await this.instanceManager.getPrimaryPhp();
  }
  /**
   * Converts a path to an absolute URL based at the PHPRequestHandler
   * root.
   *
   * @param  path The server path to convert to an absolute URL.
   * @returns The absolute URL.
   */
  pathToInternalUrl(e) {
    return e.startsWith("/") || (e = `/${e}`), `${this.absoluteUrl}${e}`;
  }
  /**
   * Converts an absolute URL based at the PHPRequestHandler to a relative path
   * without the server pathname and scope.
   *
   * @param  internalUrl An absolute URL based at the PHPRequestHandler root.
   * @returns The relative path.
   */
  internalUrlToPath(e) {
    const r = new URL(e, "https://playground.internal");
    return r.pathname.startsWith(u(this, I3)) && (r.pathname = r.pathname.slice(u(this, I3).length)), toRelativeUrl(r);
  }
  /**
   * The absolute URL of this PHPRequestHandler instance.
   */
  get absoluteUrl() {
    return u(this, te);
  }
  /**
   * The directory in the PHP filesystem where the server will look
   * for the files to serve. Default: `/var/www`.
   */
  get documentRoot() {
    return u(this, C);
  }
  /**
   * Serves the request – either by serving a static file, or by
   * dispatching it to the PHP runtime.
   *
   * The request() method mode behaves like a web server and only works if
   * the PHP was initialized with a `requestHandler` option (which the online
   * version of WordPress Playground does by default).
   *
   * In the request mode, you pass an object containing the request information
   * (method, headers, body, etc.) and the URL to request:
   *
   * ```ts
   * await client.writeFile(
   * 	'/index.php',
   * 	`<?php echo file_get_contents('php://input');`
   * );
   * const result = await client.request({
   * 	url: '/index.php',
   * 	method: 'POST',
   * 	headers: {
   * 		'Content-Type': 'text/plain',
   * 	},
   * 	body: 'Hello world!',
   * });
   * // result.text === 'Hello world!'
   * ```
   *
   * The `request()` method cannot be used in conjunction with `cli()`.
   *
   * @example
   * ```js
   * const output = await php.request({
   * 	method: 'GET',
   * 	url: '/index.php',
   * 	headers: {
   * 		'X-foo': 'bar',
   * 	},
   * 	body: {
   * 		foo: 'bar',
   * 	},
   * });
   * console.log(output.stdout); // "Hello world!"
   * ```
   *
   * @param  request - PHP Request data.
   */
  async request(e) {
    const r = await this.requestStreamed(e), n = await PHPResponse.fromStreamedResponse(r);
    return n.ok() && n.exitCode !== 0 ? new PHPResponse(
      500,
      n.headers,
      n.bytes,
      n.errors,
      n.exitCode
    ) : n;
  }
  /**
   * Serves the request with streaming support – returns a StreamedPHPResponse
   * that allows processing the response body incrementally without buffering
   * the entire response in memory.
   *
   * This is useful for large file downloads (>2GB) that would otherwise
   * exceed JavaScript's Uint8Array size limits.
   *
   * @param request - PHP Request data.
   * @returns A StreamedPHPResponse.
   */
  async requestStreamed(e) {
    const r = looksLikeAbsoluteUrl(e.url), n = new URL(
      // Remove the hash part of the URL as it's not meant for the server.
      e.url.split("#")[0],
      r ? void 0 : DEFAULT_BASE_URL
    ), s = v2(this, R, Me).call(this, n), i = await this.getPrimaryPhp(), o = removePathPrefix(
      /**
       * URL.pathname returns a URL-encoded path. We need to decode it
       * before using it as a filesystem path.
       */
      decodeURIComponent(s.pathname),
      u(this, I3)
    );
    let a2 = v2(this, R, le).call(this, o);
    if (i.isDir(a2)) {
      if (!o.endsWith("/"))
        return StreamedPHPResponse.fromPHPResponse(
          new PHPResponse(
            301,
            { location: [`${s.pathname}/`] },
            new Uint8Array(0)
          )
        );
      for (const c3 of ["index.php", "index.html"]) {
        const l = m(a2, c3);
        if (i.isFile(l)) {
          a2 = l, s.pathname = m(
            s.pathname,
            c3
          );
          break;
        }
      }
    }
    if (!i.isFile(a2)) {
      let c3 = o;
      for (; c3.startsWith("/") && c3 !== W(c3); ) {
        c3 = W(c3);
        const l = v2(this, R, le).call(this, c3);
        if (i.isFile(l) && // Only run partial path resolution for PHP files.
        l.endsWith(".php")) {
          a2 = v2(this, R, le).call(this, c3);
          break;
        }
      }
    }
    if (!i.isFile(a2)) {
      const c3 = this.getFileNotFoundAction(
        s.pathname
      );
      switch (c3.type) {
        case "response":
          return StreamedPHPResponse.fromPHPResponse(
            c3.response
          );
        case "internal-redirect":
          a2 = m(u(this, C), c3.uri);
          break;
        case "404":
          return StreamedPHPResponse.forHttpCode(404);
        default:
          throw new Error(
            `Unsupported file-not-found action type: '${c3.type}'`
          );
      }
    }
    return i.isFile(a2) ? a2.endsWith(".php") ? await v2(this, R, Ie).call(this, e, n, s, a2) : StreamedPHPResponse.fromPHPResponse(
      v2(this, R, Le).call(this, i, a2)
    ) : StreamedPHPResponse.forHttpCode(404);
  }
  /**
   * Computes the essential $_SERVER entries for a request.
   *
   * php_wasm.c sets some defaults, assuming it runs as a CLI script.
   * This function overrides them with the values correct in the request
   * context.
   *
   * @TODO: Consolidate the $_SERVER setting logic into a single place instead
   *        of splitting it between the C SAPI and the TypeScript code. The PHP
   *        class has a `.cli()` method that could take care of the CLI-specific
   *        $_SERVER values.
   *
   * Path and URL-related $_SERVER entries are theoretically documented
   * at https://www.php.net/manual/en/reserved.variables.server.php,
   * but that page is not very helpful in practice. Here are tables derived
   * by interacting with PHP servers:
   *
   * ## PHP Dev Server
   *
   * Setup:
   *   – `/home/adam/subdir/script.php` file contains `<?php phpinfo(); ?>`
   *   – `php -S 127.0.0.1:8041` running in `/home/adam` directory
   *   – A request is sent to `http://127.0.0.1:8041/subdir/script.php/b.php/c.php`
   *
   * Results:
   *
   * $_SERVER['REQUEST_URI']    | `/subdir/script.php/b.php/c.php`
   * $_SERVER['SCRIPT_NAME']    | `/subdir/script.php`
   * $_SERVER['SCRIPT_FILENAME']| `/home/adam/subdir/script.php`
   * $_SERVER['PATH_INFO']      | `/b.php/c.php`
   * $_SERVER['PHP_SELF']       | `/subdir/script.php/b.php/c.php`
   *
   * ## Apache – rewriting rules
   *
   * Setup:
   *   – `/var/www/html/subdir/script.php` file contains `<?php phpinfo(); ?>`
   *   – Apache is listening on port 8041
   *   – The document root is `/var/www/html`
   *   – A request is sent to `http://127.0.0.1:8041/api/v1/user/123`
   *
   * .htaccess file:
   *
   * ```apache
   * RewriteEngine On
   * RewriteRule ^api/v1/user/([0-9]+)$ /subdir/script.php?endpoint=user&id=$1 [L,QSA]
   * ```
   *
   * Results:
   *
   * ```
   * $_SERVER['REQUEST_URI']             | /api/v1/user/123
   * $_SERVER['SCRIPT_NAME']             | /subdir/script.php
   * $_SERVER['SCRIPT_FILENAME']         | /var/www/html/subdir/script.php
   * $_SERVER['PATH_INFO']               | (key not set)
   * $_SERVER['PHP_SELF']                | /subdir/script.php
   * $_SERVER['QUERY_STRING']            | endpoint=user&id=123
   * $_SERVER['REDIRECT_STATUS']         | 200
   * $_SERVER['REDIRECT_URL']            | /api/v1/user/123
   * $_SERVER['REDIRECT_QUERY_STRING']   | endpoint=user&id=123
   * === $_GET Variables ===
   * $_GET['endpoint']                   | user
   * $_GET['id']                         | 123
   * ```
   *
   * ## Apache – vanilla request
   *
   * Setup:
   *    – The same as above.
   *    – A request sent http://localhost:8041/subdir/script.php?param=value
   *
   * Results:
   *
   * ```
   * $_SERVER['REQUEST_URI']     | /subdir/script.php?param=value
   * $_SERVER['SCRIPT_NAME']     | /subdir/script.php
   * $_SERVER['SCRIPT_FILENAME'] | /var/www/html/subdir/script.php
   * $_SERVER['PATH_INFO']       | (key not set)
   * $_SERVER['PHP_SELF']        | /subdir/script.php
   * $_SERVER['REDIRECT_URL']    | (key not set)
   * $_SERVER['REDIRECT_STATUS'] | (key not set)
   * $_SERVER['QUERY_STRING']    | param=value
   * $_SERVER['REQUEST_METHOD']  | GET
   * $_SERVER['DOCUMENT_ROOT']   | /var/www/html
   *
   * === $_GET Variables ===
   * $_GET['param']              | value
   * ```
   */
  prepare_$_SERVER_superglobal(e, r, n) {
    const s = {
      REMOTE_ADDR: "127.0.0.1",
      DOCUMENT_ROOT: u(this, C),
      HTTPS: u(this, te).startsWith("https://") ? "on" : ""
    };
    return s.REQUEST_URI = e.pathname + e.search, n.startsWith(u(this, C)) && (s.SCRIPT_NAME = n.substring(
      u(this, C).length
    ), s.PHP_SELF = r.pathname, s.REQUEST_URI.startsWith(s.SCRIPT_NAME) && (s.PATH_INFO = s.REQUEST_URI.substring(
      s.SCRIPT_NAME.length
    ), s.PATH_INFO.includes("?") && (s.PATH_INFO = s.PATH_INFO.substring(
      0,
      s.PATH_INFO.indexOf("?")
    )))), s.QUERY_STRING = r.search.substring(1), s;
  }
  async [Symbol.asyncDispose]() {
    await this.instanceManager[Symbol.asyncDispose]();
  }
};
C = /* @__PURE__ */ new WeakMap(), Z = /* @__PURE__ */ new WeakMap(), ie = /* @__PURE__ */ new WeakMap(), X = /* @__PURE__ */ new WeakMap(), ee = /* @__PURE__ */ new WeakMap(), I3 = /* @__PURE__ */ new WeakMap(), te = /* @__PURE__ */ new WeakMap(), V2 = /* @__PURE__ */ new WeakMap(), oe = /* @__PURE__ */ new WeakMap(), R = /* @__PURE__ */ new WeakSet(), /**
* Apply the rewrite rules to the original request URL.
*
* @param originalRequestUrl - The original request URL.
* @returns The rewritten request URL.
*/
Me = function(e) {
  const r = removePathPrefix(
    decodeURIComponent(e.pathname),
    u(this, I3)
  ), n = applyRewriteRules(
    r,
    this.rewriteRules
  ), s = new URL(
    m(u(this, I3), n),
    e.toString()
  );
  for (const [i, o] of e.searchParams.entries())
    s.searchParams.append(i, o);
  return s;
}, /**
* Resolves a URL path to a filesystem path, checking path aliases first.
*
* If the URL path matches a configured alias prefix, the alias's
* filesystem path is used instead of the document root.
*
* @param urlPath - The URL path to resolve (e.g., '/phpmyadmin/index.php')
* @returns The resolved filesystem path
*/
le = function(e) {
  for (const r of u(this, oe))
    if (e === r.urlPrefix || e.startsWith(r.urlPrefix + "/")) {
      const n = e.slice(r.urlPrefix.length);
      return m(r.fsPath, n);
    }
  return m(u(this, C), e);
}, /**
* Serves a static file from the PHP filesystem.
*
* @param  fsPath - Absolute path of the static file to serve.
* @returns The response.
*/
Le = function(e, r) {
  const n = e.readFileAsBuffer(r);
  return new PHPResponse(
    200,
    {
      "content-length": [`${n.byteLength}`],
      // @TODO: Infer the content-type from the arrayBuffer instead of the
      // file path. The code below won't return the correct mime-type if the
      // extension was tampered with.
      "content-type": [inferMimeType(r)],
      "accept-ranges": ["bytes"],
      "cache-control": ["public, max-age=0"]
    },
    n
  );
}, Ie = async function(e, r, n, s) {
  let i;
  try {
    i = await this.instanceManager.acquirePHPInstance();
  } catch (a2) {
    return a2 instanceof MaxPhpInstancesError ? StreamedPHPResponse.forHttpCode(502) : StreamedPHPResponse.forHttpCode(500);
  }
  let o;
  try {
    o = await v2(this, R, Ae).call(this, i.php, e, r, n, s);
  } catch (a2) {
    throw i.reap(), a2;
  }
  return o.finished.finally(() => {
    i == null || i.reap();
  }), o;
}, Ae = async function(e, r, n, s, i) {
  let o = "GET";
  const a2 = {
    host: u(this, ee),
    ...normalizeHeaders(r.headers || {})
  };
  u(this, V2) && (a2.cookie = u(this, V2).getCookieRequestHeader());
  let c3 = r.body;
  if (typeof c3 == "object" && !(c3 instanceof Uint8Array)) {
    o = "POST";
    const { bytes: d2, contentType: p2 } = await encodeAsMultipart(c3);
    c3 = d2, a2["content-type"] = p2;
  }
  const l = await e.runStream({
    relativeUri: ensurePathPrefix(
      toRelativeUrl(new URL(s.toString())),
      u(this, I3)
    ),
    protocol: u(this, Z),
    method: r.method || o,
    $_SERVER: this.prepare_$_SERVER_superglobal(
      n,
      s,
      i
    ),
    body: c3,
    scriptPath: i,
    headers: a2
  });
  if (u(this, V2)) {
    const d2 = await l.headers;
    u(this, V2).rememberCookiesFromResponseHeaders(
      d2
    );
  }
  return l;
};
function inferMimeType(t) {
  const e = t.split(".").pop();
  return mimeTypes[e] || mimeTypes._default;
}
function applyRewriteRules(t, e) {
  for (const r of e)
    if (new RegExp(r.match).test(t)) {
      t = t.replace(r.match, r.replacement);
      break;
    }
  return t;
}
function looksLikeAbsoluteUrl(t) {
  try {
    return new URL(t), true;
  } catch {
    return false;
  }
}
function rotatePHPRuntime({
  php: t,
  recreateRuntime: e,
  maxRequests: r = 400
}) {
  return t.enableRuntimeRotation({
    recreateRuntime: e,
    maxRequests: r
  });
}
async function writeFiles(t, e, r, { rmRoot: n = false } = {}) {
  const s = resolveFileTree(e, r);
  n && await t.isDir(e) && await t.rmdir(e, { recursive: true });
  for (const [i, o] of s)
    await t.fileExists(W(i)) || await t.mkdir(W(i)), await t.writeFile(i, o);
}
function resolveFileTree(t, e) {
  return Object.entries(e).flatMap(([r, n]) => {
    const s = I(r, t);
    if (!s)
      throw new Error(
        `Invalid file tree path ${JSON.stringify(
          r
        )}: it must resolve inside ${JSON.stringify(t)}.`
      );
    return n instanceof Uint8Array || typeof n == "string" ? [[s, n]] : resolveFileTree(s, n);
  });
}
var schema12 = {
  properties: {
    name: { type: "string" },
    version: { type: "string" },
    mode: { type: "string", const: "php-extension" },
    loadWithIniDirective: {
      $ref: "#/definitions/PHPExtensionLoadDirective",
      description: "The first directive of the generated startup `.ini` file. Defaults to `extension`; use `zend_extension` for Zend extensions like Xdebug. Use `false` to stage the `.so` without registering it in php.ini."
    },
    iniEntries: {
      type: "object",
      additionalProperties: { type: "string" },
      description: "Additional `key=value` lines for the generated startup `.ini` file."
    },
    env: {
      type: "object",
      additionalProperties: { type: "string" },
      description: "Environment variables added before the extension is loaded."
    },
    extensionDir: {
      type: "string",
      description: "VFS directory where PHP.wasm writes the extension `.so` file and its per-extension ini file. Defaults to `PHP_EXTENSIONS_DIR`."
    },
    artifacts: {
      type: "array",
      items: {
        type: "object",
        properties: {
          phpVersion: {
            type: "string",
            description: "PHP major/minor version, e.g. `8.4`."
          },
          sourcePath: {
            type: "string",
            description: "Relative to the manifest URL/base URL, or an absolute URL."
          },
          extraFiles: {
            $ref: "#/definitions/PHPExtensionManifestExtraFiles",
            description: "URL-backed files needed only by this artifact."
          }
        },
        required: ["phpVersion", "sourcePath"],
        additionalProperties: false
      }
    },
    extraFiles: {
      $ref: "#/definitions/PHPExtensionManifestExtraFiles",
      description: "URL-backed files shared by every artifact in this manifest."
    }
  }
};
var schema15 = {
  properties: {
    nodes: {
      items: {
        properties: {
          type: {
            enum: ["file", "directory"]
          }
        }
      }
    }
  }
};
var func2 = Object.prototype.hasOwnProperty;
var schema14 = {
  enum: ["extension", "zend_extension"]
};
function validate12(t, { instancePath: e = "", parentData: r, parentDataProperty: n, rootData: s = t } = {}) {
  let i = null, o = 0;
  const a2 = o;
  let c3 = false;
  const l = o;
  if (typeof t != "string") {
    const p2 = {
      instancePath: e,
      schemaPath: "#/definitions/PHPExtensionIniDirective/type",
      keyword: "type",
      params: { type: "string" },
      message: "must be string"
    };
    i === null ? i = [p2] : i.push(p2), o++;
  }
  if (!(t === "extension" || t === "zend_extension")) {
    const p2 = {
      instancePath: e,
      schemaPath: "#/definitions/PHPExtensionIniDirective/enum",
      keyword: "enum",
      params: { allowedValues: schema14.enum },
      message: "must be equal to one of the allowed values"
    };
    i === null ? i = [p2] : i.push(p2), o++;
  }
  var d2 = l === o;
  if (c3 = c3 || d2, !c3) {
    const p2 = o;
    if (typeof t != "boolean") {
      const P4 = {
        instancePath: e,
        schemaPath: "#/anyOf/1/type",
        keyword: "type",
        params: { type: "boolean" },
        message: "must be boolean"
      };
      i === null ? i = [P4] : i.push(P4), o++;
    }
    if (t !== false) {
      const P4 = {
        instancePath: e,
        schemaPath: "#/anyOf/1/const",
        keyword: "const",
        params: { allowedValue: false },
        message: "must be equal to constant"
      };
      i === null ? i = [P4] : i.push(P4), o++;
    }
    var d2 = p2 === o;
    c3 = c3 || d2;
  }
  if (c3)
    o = a2, i !== null && (a2 ? i.length = a2 : i = null);
  else {
    const p2 = {
      instancePath: e,
      schemaPath: "#/anyOf",
      keyword: "anyOf",
      params: {},
      message: "must match a schema in anyOf"
    };
    return i === null ? i = [p2] : i.push(p2), o++, validate12.errors = i, false;
  }
  return validate12.errors = i, o === 0;
}
function validate11(t, { instancePath: e = "", parentData: r, parentDataProperty: n, rootData: s = t } = {}) {
  let i = null, o = 0;
  if (o === 0)
    if (t && typeof t == "object" && !Array.isArray(t)) {
      let M2;
      if (t.name === void 0 && (M2 = "name") || t.artifacts === void 0 && (M2 = "artifacts"))
        return validate11.errors = [
          {
            instancePath: e,
            schemaPath: "#/required",
            keyword: "required",
            params: { missingProperty: M2 },
            message: "must have required property '" + M2 + "'"
          }
        ], false;
      {
        const O3 = o;
        for (const f in t)
          if (!func2.call(schema12.properties, f))
            return validate11.errors = [
              {
                instancePath: e,
                schemaPath: "#/additionalProperties",
                keyword: "additionalProperties",
                params: { additionalProperty: f },
                message: "must NOT have additional properties"
              }
            ], false;
        if (O3 === o) {
          if (t.name !== void 0) {
            const f = o;
            if (typeof t.name != "string")
              return validate11.errors = [
                {
                  instancePath: e + "/name",
                  schemaPath: "#/properties/name/type",
                  keyword: "type",
                  params: { type: "string" },
                  message: "must be string"
                }
              ], false;
            var a2 = f === o;
          } else
            var a2 = true;
          if (a2) {
            if (t.version !== void 0) {
              const f = o;
              if (typeof t.version != "string")
                return validate11.errors = [
                  {
                    instancePath: e + "/version",
                    schemaPath: "#/properties/version/type",
                    keyword: "type",
                    params: { type: "string" },
                    message: "must be string"
                  }
                ], false;
              var a2 = f === o;
            } else
              var a2 = true;
            if (a2) {
              if (t.mode !== void 0) {
                let f = t.mode;
                const b3 = o;
                if (typeof f != "string")
                  return validate11.errors = [
                    {
                      instancePath: e + "/mode",
                      schemaPath: "#/properties/mode/type",
                      keyword: "type",
                      params: { type: "string" },
                      message: "must be string"
                    }
                  ], false;
                if (f !== "php-extension")
                  return validate11.errors = [
                    {
                      instancePath: e + "/mode",
                      schemaPath: "#/properties/mode/const",
                      keyword: "const",
                      params: {
                        allowedValue: "php-extension"
                      },
                      message: "must be equal to constant"
                    }
                  ], false;
                var a2 = b3 === o;
              } else
                var a2 = true;
              if (a2) {
                if (t.loadWithIniDirective !== void 0) {
                  const f = o;
                  validate12(t.loadWithIniDirective, {
                    instancePath: e + "/loadWithIniDirective",
                    parentData: t,
                    parentDataProperty: "loadWithIniDirective",
                    rootData: s
                  }) || (i = i === null ? validate12.errors : i.concat(
                    validate12.errors
                  ), o = i.length);
                  var a2 = f === o;
                } else
                  var a2 = true;
                if (a2) {
                  if (t.iniEntries !== void 0) {
                    let f = t.iniEntries;
                    const b3 = o;
                    if (o === b3)
                      if (f && typeof f == "object" && !Array.isArray(f))
                        for (const U4 in f) {
                          const m3 = o;
                          if (typeof f[U4] != "string")
                            return validate11.errors = [
                              {
                                instancePath: e + "/iniEntries/" + U4.replace(
                                  /~/g,
                                  "~0"
                                ).replace(
                                  /\//g,
                                  "~1"
                                ),
                                schemaPath: "#/properties/iniEntries/additionalProperties/type",
                                keyword: "type",
                                params: {
                                  type: "string"
                                },
                                message: "must be string"
                              }
                            ], false;
                          var c3 = m3 === o;
                          if (!c3)
                            break;
                        }
                      else
                        return validate11.errors = [
                          {
                            instancePath: e + "/iniEntries",
                            schemaPath: "#/properties/iniEntries/type",
                            keyword: "type",
                            params: {
                              type: "object"
                            },
                            message: "must be object"
                          }
                        ], false;
                    var a2 = b3 === o;
                  } else
                    var a2 = true;
                  if (a2) {
                    if (t.env !== void 0) {
                      let f = t.env;
                      const b3 = o;
                      if (o === b3)
                        if (f && typeof f == "object" && !Array.isArray(f))
                          for (const U4 in f) {
                            const m3 = o;
                            if (typeof f[U4] != "string")
                              return validate11.errors = [
                                {
                                  instancePath: e + "/env/" + U4.replace(
                                    /~/g,
                                    "~0"
                                  ).replace(
                                    /\//g,
                                    "~1"
                                  ),
                                  schemaPath: "#/properties/env/additionalProperties/type",
                                  keyword: "type",
                                  params: {
                                    type: "string"
                                  },
                                  message: "must be string"
                                }
                              ], false;
                            var l = m3 === o;
                            if (!l)
                              break;
                          }
                        else
                          return validate11.errors = [
                            {
                              instancePath: e + "/env",
                              schemaPath: "#/properties/env/type",
                              keyword: "type",
                              params: {
                                type: "object"
                              },
                              message: "must be object"
                            }
                          ], false;
                      var a2 = b3 === o;
                    } else
                      var a2 = true;
                    if (a2) {
                      if (t.extensionDir !== void 0) {
                        const f = o;
                        if (typeof t.extensionDir != "string")
                          return validate11.errors = [
                            {
                              instancePath: e + "/extensionDir",
                              schemaPath: "#/properties/extensionDir/type",
                              keyword: "type",
                              params: {
                                type: "string"
                              },
                              message: "must be string"
                            }
                          ], false;
                        var a2 = f === o;
                      } else
                        var a2 = true;
                      if (a2) {
                        if (t.artifacts !== void 0) {
                          let f = t.artifacts;
                          const b3 = o;
                          if (o === b3)
                            if (Array.isArray(f)) {
                              var d2 = true;
                              const U4 = f.length;
                              for (let m3 = 0; m3 < U4; m3++) {
                                let w4 = f[m3];
                                const q3 = o;
                                if (o === q3)
                                  if (w4 && typeof w4 == "object" && !Array.isArray(
                                    w4
                                  )) {
                                    let $2;
                                    if (w4.phpVersion === void 0 && ($2 = "phpVersion") || w4.sourcePath === void 0 && ($2 = "sourcePath"))
                                      return validate11.errors = [
                                        {
                                          instancePath: e + "/artifacts/" + m3,
                                          schemaPath: "#/properties/artifacts/items/required",
                                          keyword: "required",
                                          params: {
                                            missingProperty: $2
                                          },
                                          message: "must have required property '" + $2 + "'"
                                        }
                                      ], false;
                                    {
                                      const H3 = o;
                                      for (const g2 in w4)
                                        if (!(g2 === "phpVersion" || g2 === "sourcePath" || g2 === "extraFiles"))
                                          return validate11.errors = [
                                            {
                                              instancePath: e + "/artifacts/" + m3,
                                              schemaPath: "#/properties/artifacts/items/additionalProperties",
                                              keyword: "additionalProperties",
                                              params: {
                                                additionalProperty: g2
                                              },
                                              message: "must NOT have additional properties"
                                            }
                                          ], false;
                                      if (H3 === o) {
                                        if (w4.phpVersion !== void 0) {
                                          const g2 = o;
                                          if (typeof w4.phpVersion != "string")
                                            return validate11.errors = [
                                              {
                                                instancePath: e + "/artifacts/" + m3 + "/phpVersion",
                                                schemaPath: "#/properties/artifacts/items/properties/phpVersion/type",
                                                keyword: "type",
                                                params: {
                                                  type: "string"
                                                },
                                                message: "must be string"
                                              }
                                            ], false;
                                          var p2 = g2 === o;
                                        } else
                                          var p2 = true;
                                        if (p2) {
                                          if (w4.sourcePath !== void 0) {
                                            const g2 = o;
                                            if (typeof w4.sourcePath != "string")
                                              return validate11.errors = [
                                                {
                                                  instancePath: e + "/artifacts/" + m3 + "/sourcePath",
                                                  schemaPath: "#/properties/artifacts/items/properties/sourcePath/type",
                                                  keyword: "type",
                                                  params: {
                                                    type: "string"
                                                  },
                                                  message: "must be string"
                                                }
                                              ], false;
                                            var p2 = g2 === o;
                                          } else
                                            var p2 = true;
                                          if (p2)
                                            if (w4.extraFiles !== void 0) {
                                              let g2 = w4.extraFiles;
                                              const ae = o;
                                              if (o === o)
                                                if (g2 && typeof g2 == "object" && !Array.isArray(
                                                  g2
                                                )) {
                                                  const fe2 = o;
                                                  for (const E5 in g2)
                                                    if (!(E5 === "vfsRoot" || E5 === "nodes"))
                                                      return validate11.errors = [
                                                        {
                                                          instancePath: e + "/artifacts/" + m3 + "/extraFiles",
                                                          schemaPath: "#/definitions/PHPExtensionManifestExtraFiles/additionalProperties",
                                                          keyword: "additionalProperties",
                                                          params: {
                                                            additionalProperty: E5
                                                          },
                                                          message: "must NOT have additional properties"
                                                        }
                                                      ], false;
                                                  if (fe2 === o) {
                                                    if (g2.vfsRoot !== void 0) {
                                                      const E5 = o;
                                                      if (typeof g2.vfsRoot != "string")
                                                        return validate11.errors = [
                                                          {
                                                            instancePath: e + "/artifacts/" + m3 + "/extraFiles/vfsRoot",
                                                            schemaPath: "#/definitions/PHPExtensionManifestExtraFiles/properties/vfsRoot/type",
                                                            keyword: "type",
                                                            params: {
                                                              type: "string"
                                                            },
                                                            message: "must be string"
                                                          }
                                                        ], false;
                                                      var h3 = E5 === o;
                                                    } else
                                                      var h3 = true;
                                                    if (h3)
                                                      if (g2.nodes !== void 0) {
                                                        let E5 = g2.nodes;
                                                        const ce = o;
                                                        if (o === ce)
                                                          if (Array.isArray(
                                                            E5
                                                          )) {
                                                            var P4 = true;
                                                            const Ne2 = E5.length;
                                                            for (let A6 = 0; A6 < Ne2; A6++) {
                                                              let L3 = E5[A6];
                                                              const _e = o;
                                                              if (o === _e)
                                                                if (L3 && typeof L3 == "object" && !Array.isArray(
                                                                  L3
                                                                )) {
                                                                  let he2;
                                                                  if (L3.vfsPath === void 0 && (he2 = "vfsPath"))
                                                                    return validate11.errors = [
                                                                      {
                                                                        instancePath: e + "/artifacts/" + m3 + "/extraFiles/nodes/" + A6,
                                                                        schemaPath: "#/definitions/PHPExtensionManifestExtraFiles/properties/nodes/items/required",
                                                                        keyword: "required",
                                                                        params: {
                                                                          missingProperty: he2
                                                                        },
                                                                        message: "must have required property '" + he2 + "'"
                                                                      }
                                                                    ], false;
                                                                  {
                                                                    const Oe2 = o;
                                                                    for (const T2 in L3)
                                                                      if (!(T2 === "vfsPath" || T2 === "type" || T2 === "sourcePath"))
                                                                        return validate11.errors = [
                                                                          {
                                                                            instancePath: e + "/artifacts/" + m3 + "/extraFiles/nodes/" + A6,
                                                                            schemaPath: "#/definitions/PHPExtensionManifestExtraFiles/properties/nodes/items/additionalProperties",
                                                                            keyword: "additionalProperties",
                                                                            params: {
                                                                              additionalProperty: T2
                                                                            },
                                                                            message: "must NOT have additional properties"
                                                                          }
                                                                        ], false;
                                                                    if (Oe2 === o) {
                                                                      if (L3.vfsPath !== void 0) {
                                                                        const T2 = o;
                                                                        if (typeof L3.vfsPath != "string")
                                                                          return validate11.errors = [
                                                                            {
                                                                              instancePath: e + "/artifacts/" + m3 + "/extraFiles/nodes/" + A6 + "/vfsPath",
                                                                              schemaPath: "#/definitions/PHPExtensionManifestExtraFiles/properties/nodes/items/properties/vfsPath/type",
                                                                              keyword: "type",
                                                                              params: {
                                                                                type: "string"
                                                                              },
                                                                              message: "must be string"
                                                                            }
                                                                          ], false;
                                                                        var S3 = T2 === o;
                                                                      } else
                                                                        var S3 = true;
                                                                      if (S3) {
                                                                        if (L3.type !== void 0) {
                                                                          let T2 = L3.type;
                                                                          const Ue2 = o;
                                                                          if (typeof T2 != "string")
                                                                            return validate11.errors = [
                                                                              {
                                                                                instancePath: e + "/artifacts/" + m3 + "/extraFiles/nodes/" + A6 + "/type",
                                                                                schemaPath: "#/definitions/PHPExtensionManifestExtraFiles/properties/nodes/items/properties/type/type",
                                                                                keyword: "type",
                                                                                params: {
                                                                                  type: "string"
                                                                                },
                                                                                message: "must be string"
                                                                              }
                                                                            ], false;
                                                                          if (!(T2 === "file" || T2 === "directory"))
                                                                            return validate11.errors = [
                                                                              {
                                                                                instancePath: e + "/artifacts/" + m3 + "/extraFiles/nodes/" + A6 + "/type",
                                                                                schemaPath: "#/definitions/PHPExtensionManifestExtraFiles/properties/nodes/items/properties/type/enum",
                                                                                keyword: "enum",
                                                                                params: {
                                                                                  allowedValues: schema15.properties.nodes.items.properties.type.enum
                                                                                },
                                                                                message: "must be equal to one of the allowed values"
                                                                              }
                                                                            ], false;
                                                                          var S3 = Ue2 === o;
                                                                        } else
                                                                          var S3 = true;
                                                                        if (S3)
                                                                          if (L3.sourcePath !== void 0) {
                                                                            const T2 = o;
                                                                            if (typeof L3.sourcePath != "string")
                                                                              return validate11.errors = [
                                                                                {
                                                                                  instancePath: e + "/artifacts/" + m3 + "/extraFiles/nodes/" + A6 + "/sourcePath",
                                                                                  schemaPath: "#/definitions/PHPExtensionManifestExtraFiles/properties/nodes/items/properties/sourcePath/type",
                                                                                  keyword: "type",
                                                                                  params: {
                                                                                    type: "string"
                                                                                  },
                                                                                  message: "must be string"
                                                                                }
                                                                              ], false;
                                                                            var S3 = T2 === o;
                                                                          } else
                                                                            var S3 = true;
                                                                      }
                                                                    }
                                                                  }
                                                                } else
                                                                  return validate11.errors = [
                                                                    {
                                                                      instancePath: e + "/artifacts/" + m3 + "/extraFiles/nodes/" + A6,
                                                                      schemaPath: "#/definitions/PHPExtensionManifestExtraFiles/properties/nodes/items/type",
                                                                      keyword: "type",
                                                                      params: {
                                                                        type: "object"
                                                                      },
                                                                      message: "must be object"
                                                                    }
                                                                  ], false;
                                                              var P4 = _e === o;
                                                              if (!P4)
                                                                break;
                                                            }
                                                          } else
                                                            return validate11.errors = [
                                                              {
                                                                instancePath: e + "/artifacts/" + m3 + "/extraFiles/nodes",
                                                                schemaPath: "#/definitions/PHPExtensionManifestExtraFiles/properties/nodes/type",
                                                                keyword: "type",
                                                                params: {
                                                                  type: "array"
                                                                },
                                                                message: "must be array"
                                                              }
                                                            ], false;
                                                        var h3 = ce === o;
                                                      } else
                                                        var h3 = true;
                                                  }
                                                } else
                                                  return validate11.errors = [
                                                    {
                                                      instancePath: e + "/artifacts/" + m3 + "/extraFiles",
                                                      schemaPath: "#/definitions/PHPExtensionManifestExtraFiles/type",
                                                      keyword: "type",
                                                      params: {
                                                        type: "object"
                                                      },
                                                      message: "must be object"
                                                    }
                                                  ], false;
                                              var p2 = ae === o;
                                            } else
                                              var p2 = true;
                                        }
                                      }
                                    }
                                  } else
                                    return validate11.errors = [
                                      {
                                        instancePath: e + "/artifacts/" + m3,
                                        schemaPath: "#/properties/artifacts/items/type",
                                        keyword: "type",
                                        params: {
                                          type: "object"
                                        },
                                        message: "must be object"
                                      }
                                    ], false;
                                var d2 = q3 === o;
                                if (!d2)
                                  break;
                              }
                            } else
                              return validate11.errors = [
                                {
                                  instancePath: e + "/artifacts",
                                  schemaPath: "#/properties/artifacts/type",
                                  keyword: "type",
                                  params: {
                                    type: "array"
                                  },
                                  message: "must be array"
                                }
                              ], false;
                          var a2 = b3 === o;
                        } else
                          var a2 = true;
                        if (a2)
                          if (t.extraFiles !== void 0) {
                            let f = t.extraFiles;
                            const b3 = o;
                            if (o === o)
                              if (f && typeof f == "object" && !Array.isArray(
                                f
                              )) {
                                const m3 = o;
                                for (const w4 in f)
                                  if (!(w4 === "vfsRoot" || w4 === "nodes"))
                                    return validate11.errors = [
                                      {
                                        instancePath: e + "/extraFiles",
                                        schemaPath: "#/definitions/PHPExtensionManifestExtraFiles/additionalProperties",
                                        keyword: "additionalProperties",
                                        params: {
                                          additionalProperty: w4
                                        },
                                        message: "must NOT have additional properties"
                                      }
                                    ], false;
                                if (m3 === o) {
                                  if (f.vfsRoot !== void 0) {
                                    const w4 = o;
                                    if (typeof f.vfsRoot != "string")
                                      return validate11.errors = [
                                        {
                                          instancePath: e + "/extraFiles/vfsRoot",
                                          schemaPath: "#/definitions/PHPExtensionManifestExtraFiles/properties/vfsRoot/type",
                                          keyword: "type",
                                          params: {
                                            type: "string"
                                          },
                                          message: "must be string"
                                        }
                                      ], false;
                                    var N2 = w4 === o;
                                  } else
                                    var N2 = true;
                                  if (N2)
                                    if (f.nodes !== void 0) {
                                      let w4 = f.nodes;
                                      const q3 = o;
                                      if (o === q3)
                                        if (Array.isArray(
                                          w4
                                        )) {
                                          var B = true;
                                          const $2 = w4.length;
                                          for (let H3 = 0; H3 < $2; H3++) {
                                            let g2 = w4[H3];
                                            const ae = o;
                                            if (o === ae)
                                              if (g2 && typeof g2 == "object" && !Array.isArray(
                                                g2
                                              )) {
                                                let pe2;
                                                if (g2.vfsPath === void 0 && (pe2 = "vfsPath"))
                                                  return validate11.errors = [
                                                    {
                                                      instancePath: e + "/extraFiles/nodes/" + H3,
                                                      schemaPath: "#/definitions/PHPExtensionManifestExtraFiles/properties/nodes/items/required",
                                                      keyword: "required",
                                                      params: {
                                                        missingProperty: pe2
                                                      },
                                                      message: "must have required property '" + pe2 + "'"
                                                    }
                                                  ], false;
                                                {
                                                  const fe2 = o;
                                                  for (const E5 in g2)
                                                    if (!(E5 === "vfsPath" || E5 === "type" || E5 === "sourcePath"))
                                                      return validate11.errors = [
                                                        {
                                                          instancePath: e + "/extraFiles/nodes/" + H3,
                                                          schemaPath: "#/definitions/PHPExtensionManifestExtraFiles/properties/nodes/items/additionalProperties",
                                                          keyword: "additionalProperties",
                                                          params: {
                                                            additionalProperty: E5
                                                          },
                                                          message: "must NOT have additional properties"
                                                        }
                                                      ], false;
                                                  if (fe2 === o) {
                                                    if (g2.vfsPath !== void 0) {
                                                      const E5 = o;
                                                      if (typeof g2.vfsPath != "string")
                                                        return validate11.errors = [
                                                          {
                                                            instancePath: e + "/extraFiles/nodes/" + H3 + "/vfsPath",
                                                            schemaPath: "#/definitions/PHPExtensionManifestExtraFiles/properties/nodes/items/properties/vfsPath/type",
                                                            keyword: "type",
                                                            params: {
                                                              type: "string"
                                                            },
                                                            message: "must be string"
                                                          }
                                                        ], false;
                                                      var F2 = E5 === o;
                                                    } else
                                                      var F2 = true;
                                                    if (F2) {
                                                      if (g2.type !== void 0) {
                                                        let E5 = g2.type;
                                                        const ce = o;
                                                        if (typeof E5 != "string")
                                                          return validate11.errors = [
                                                            {
                                                              instancePath: e + "/extraFiles/nodes/" + H3 + "/type",
                                                              schemaPath: "#/definitions/PHPExtensionManifestExtraFiles/properties/nodes/items/properties/type/type",
                                                              keyword: "type",
                                                              params: {
                                                                type: "string"
                                                              },
                                                              message: "must be string"
                                                            }
                                                          ], false;
                                                        if (!(E5 === "file" || E5 === "directory"))
                                                          return validate11.errors = [
                                                            {
                                                              instancePath: e + "/extraFiles/nodes/" + H3 + "/type",
                                                              schemaPath: "#/definitions/PHPExtensionManifestExtraFiles/properties/nodes/items/properties/type/enum",
                                                              keyword: "enum",
                                                              params: {
                                                                allowedValues: schema15.properties.nodes.items.properties.type.enum
                                                              },
                                                              message: "must be equal to one of the allowed values"
                                                            }
                                                          ], false;
                                                        var F2 = ce === o;
                                                      } else
                                                        var F2 = true;
                                                      if (F2)
                                                        if (g2.sourcePath !== void 0) {
                                                          const E5 = o;
                                                          if (typeof g2.sourcePath != "string")
                                                            return validate11.errors = [
                                                              {
                                                                instancePath: e + "/extraFiles/nodes/" + H3 + "/sourcePath",
                                                                schemaPath: "#/definitions/PHPExtensionManifestExtraFiles/properties/nodes/items/properties/sourcePath/type",
                                                                keyword: "type",
                                                                params: {
                                                                  type: "string"
                                                                },
                                                                message: "must be string"
                                                              }
                                                            ], false;
                                                          var F2 = E5 === o;
                                                        } else
                                                          var F2 = true;
                                                    }
                                                  }
                                                }
                                              } else
                                                return validate11.errors = [
                                                  {
                                                    instancePath: e + "/extraFiles/nodes/" + H3,
                                                    schemaPath: "#/definitions/PHPExtensionManifestExtraFiles/properties/nodes/items/type",
                                                    keyword: "type",
                                                    params: {
                                                      type: "object"
                                                    },
                                                    message: "must be object"
                                                  }
                                                ], false;
                                            var B = ae === o;
                                            if (!B)
                                              break;
                                          }
                                        } else
                                          return validate11.errors = [
                                            {
                                              instancePath: e + "/extraFiles/nodes",
                                              schemaPath: "#/definitions/PHPExtensionManifestExtraFiles/properties/nodes/type",
                                              keyword: "type",
                                              params: {
                                                type: "array"
                                              },
                                              message: "must be array"
                                            }
                                          ], false;
                                      var N2 = q3 === o;
                                    } else
                                      var N2 = true;
                                }
                              } else
                                return validate11.errors = [
                                  {
                                    instancePath: e + "/extraFiles",
                                    schemaPath: "#/definitions/PHPExtensionManifestExtraFiles/type",
                                    keyword: "type",
                                    params: {
                                      type: "object"
                                    },
                                    message: "must be object"
                                  }
                                ], false;
                            var a2 = b3 === o;
                          } else
                            var a2 = true;
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    } else
      return validate11.errors = [
        {
          instancePath: e,
          schemaPath: "#/type",
          keyword: "type",
          params: { type: "object" },
          message: "must be object"
        }
      ], false;
  return validate11.errors = i, o === 0;
}
function validate10(t, { instancePath: e = "", parentData: r, parentDataProperty: n, rootData: s = t } = {}) {
  let i = null, o = 0;
  return validate11(t, {
    instancePath: e,
    parentData: r,
    parentDataProperty: n,
    rootData: s
  }) || (i = i === null ? validate11.errors : i.concat(validate11.errors), o = i.length), validate10.errors = i, o === 0;
}
var PHP_EXTENSIONS_DIR = "/internal/shared/extensions";
var MAX_EXTENSION_SIDECAR_FILE_REQUESTS = 5;
async function resolvePHPExtension(t) {
  const e = t.fetch ?? globalThis.fetch, r = t.source;
  let n = t.name, s;
  const i = {}, o = [];
  let a2, c3, l, d2;
  if (r.format === "so") {
    if (n || (n = r.name), !n)
      throw new Error(
        "name is required when loading an extension from direct bytes."
      );
    s = toUint8Array(r.bytes);
  } else if (r.format === "url") {
    let F2;
    try {
      F2 = new URL(String(r.url));
    } catch {
      throw new Error(
        `source.url must be an absolute URL when loading a PHP extension from a direct URL. Received: ${String(
          r.url
        )}`
      );
    }
    if (n || (n = r.name), !n && F2.pathname.endsWith(".so") && (n = j(F2.pathname).slice(0, -3)), !n)
      throw new Error(
        "name is required when loading an extension from a direct URL."
      );
    s = await fetchBytes(e, F2);
  } else {
    let F2, M2;
    if ("manifest" in r ? (F2 = r.manifest, r.baseUrl && (M2 = new URL(String(r.baseUrl)))) : (M2 = new URL(String(r.manifestUrl)), F2 = await (await e(M2)).json()), !validate10(F2))
      throw new Error(
        `Invalid PHP extension manifest: ${JSON.stringify(
          validate10.errors
        )}`
      );
    const O3 = F2;
    if (!M2)
      throw new Error(
        "Manifest artifacts require a manifest URL or baseUrl so relative files can be resolved."
      );
    const f = O3.artifacts.find(
      (m3) => m3.phpVersion === t.phpVersion
    );
    if (!f)
      throw new Error(
        `No extension artifact found for PHP ${t.phpVersion}.`
      );
    n ?? (n = O3.name), a2 = O3.loadWithIniDirective, c3 = O3.iniEntries, l = O3.env, d2 = O3.extensionDir;
    const b3 = new v({
      concurrency: MAX_EXTENSION_SIDECAR_FILE_REQUESTS
    }), ue2 = [];
    for (const m3 of [O3.extraFiles, f.extraFiles])
      for (const w4 of (m3 == null ? void 0 : m3.nodes) ?? []) {
        const q3 = m(m3.vfsRoot ?? "", w4.vfsPath);
        if (w4.type === "directory") {
          o.push(q3);
          continue;
        }
        if (!w4.sourcePath) continue;
        const Ce2 = new URL(w4.sourcePath, M2);
        ue2.push(
          b3.run(() => fetchBytes(e, Ce2)).then(($2) => {
            i[q3] = $2;
          })
        );
      }
    const [U4] = await Promise.all([
      fetchBytes(e, new URL(f.sourcePath, M2)),
      ...ue2
    ]);
    s = U4;
  }
  const p2 = c(
    t.extensionDir ?? d2 ?? PHP_EXTENSIONS_DIR
  );
  t.extraFiles && (Object.assign(i, t.extraFiles.files), o.push(...t.extraFiles.directories ?? []));
  const h3 = t.loadWithIniDirective ?? a2 ?? "extension", P4 = {
    ...c3,
    ...t.iniEntries
  }, S3 = m(p2, `${n}.so`), N2 = createPHPExtensionIniFile({
    directive: h3,
    extensionDir: p2,
    name: n,
    soPath: S3,
    iniEntries: P4
  }), B = {
    ...l,
    ...t.env
  };
  return {
    soPath: S3,
    soBytes: s,
    ...N2,
    extraFiles: {
      files: i,
      directories: o
    },
    env: Object.keys(B).length ? B : void 0,
    extensionDir: p2
  };
}
function withResolvedPHPExtensions(t, e) {
  var s;
  if (!e.length)
    return t;
  const r = { ...t.ENV };
  for (const i of e) {
    if (Object.assign(r, i.env), !i.iniPath)
      continue;
    const o = ((s = r.PHP_INI_SCAN_DIR) == null ? void 0 : s.split(":")) ?? [];
    o.includes(i.extensionDir) || (o.push(i.extensionDir), r.PHP_INI_SCAN_DIR = o.join(":"));
  }
  const n = t.preRun ?? [];
  return {
    ...t,
    ENV: r,
    preRun: [
      ...n,
      (i) => {
        for (const o of e)
          installPHPExtensionFilesSync(i.FS, o);
      }
    ]
  };
}
function installPHPExtensionFilesSync(t, e) {
  let r;
  if ("soPath" in e)
    r = e;
  else {
    const n = e.extensionDir ?? PHP_EXTENSIONS_DIR, s = e.loadWithIniDirective ?? "extension", i = m(n, `${e.name}.so`), o = createPHPExtensionIniFile({
      directive: s,
      extensionDir: n,
      name: e.name,
      soPath: i,
      iniEntries: e.iniEntries
    });
    r = {
      soPath: i,
      soBytes: toUint8Array(e.soBytes),
      ...o,
      extraFiles: e.extraFiles,
      env: e.env,
      extensionDir: n
    };
  }
  if (mkdirIfMissing(t, r.extensionDir), t.writeFile(r.soPath, r.soBytes), r.iniPath && r.iniContent !== void 0 && t.writeFile(r.iniPath, r.iniContent), r.extraFiles) {
    const { directories: n = [], files: s } = r.extraFiles;
    for (const i of n)
      mkdirIfMissing(t, i);
    for (const [i, o] of Object.entries(s))
      mkdirIfMissing(t, W(i)), t.writeFile(i, o);
  }
  return r;
}
function createPHPExtensionIniFile(t) {
  if (t.directive === false)
    return {};
  const e = [
    `${t.directive}=${t.soPath}`,
    ...Object.entries(t.iniEntries ?? {}).map(
      ([r, n]) => `${r}=${n}`
    )
  ];
  return {
    iniPath: m(t.extensionDir, `${t.name}.ini`),
    iniContent: e.join(`
`)
  };
}
function mkdirIfMissing(t, e) {
  FSHelpers.fileExists(t, e) || t.mkdirTree(e);
}
async function fetchBytes(t, e) {
  const r = await t(e);
  if (!r.ok)
    throw new Error(`Failed to fetch ${String(e)}: ${r.status}`);
  return new Uint8Array(await r.arrayBuffer());
}
function toUint8Array(t) {
  return t instanceof Uint8Array ? t : new Uint8Array(t);
}
function isLegacyPhpInstance(t) {
  var s;
  const e = Object.getOwnPropertySymbols(t)[0], r = t[e], n = (s = r == null ? void 0 : r.phpVersion) == null ? void 0 : s.major;
  return typeof n == "number" && n < 7;
}
function ensureProxyFSHasMmapSupport(t) {
  const e = Object.getOwnPropertySymbols(t)[0], r = t[e], n = r.PROXYFS, s = r.FS;
  n.stream_ops.mmap || (n.stream_ops.mmap = function(i, o, a2, c3, l) {
    if (!s.isFile(i.node.mode))
      throw new s.ErrnoError(19);
    if (a2 !== 0)
      throw new s.ErrnoError(22);
    const d2 = r.malloc(o);
    if (!d2)
      throw new s.ErrnoError(48);
    const p2 = r.HEAPU8.subarray(d2, d2 + o);
    let h3 = 0;
    for (; h3 < o; ) {
      const P4 = i.stream_ops.read(
        i,
        p2,
        h3,
        o - h3,
        h3
      );
      if (P4 <= 0) break;
      h3 += P4;
    }
    if (h3 !== o)
      throw r.free(d2), new s.ErrnoError(5);
    return { ptr: d2, allocated: true };
  }, n.stream_ops.msync = function(i, o, a2, c3, l) {
    return l & 2 || i.stream_ops.write(
      i,
      o,
      a2,
      c3,
      a2,
      false
    ), 0;
  });
}
async function proxyFileSystem(t, e, r) {
  const n = isLegacyPhpInstance(e), s = Object.getOwnPropertySymbols(t)[0];
  for (const i of r)
    t.fileExists(i) || t.mkdir(i), e.mkdir(i), await e.mount(i, (o) => {
      n || ensureProxyFSHasMmapSupport(o);
      const a2 = Object.getOwnPropertySymbols(o)[0];
      return o[a2].FS.mount(
        // @ts-ignore
        o[a2].PROXYFS,
        {
          root: i,
          // @ts-ignore
          fs: t[s].FS
        },
        i
      ), () => {
        try {
          o[a2].FS.unmount(i);
        } catch {
        }
      };
    });
  e.addEventListener("request.end", () => {
    t.dispatchEvent({ type: "proxyfs.request.end" });
  });
}
function isPathToSharedFS(t, e) {
  var i;
  const r = Object.getOwnPropertySymbols(t)[0], s = t[r].FS.lookupPath(e, { noent_okay: true });
  return ((i = s == null ? void 0 : s.node) == null ? void 0 : i.isSharedFS) ?? false;
}
function sandboxedSpawnHandlerFactory(t) {
  return S(async function(e, r, n) {
    r.notifySpawn(), (e == null ? void 0 : e[0]) === "/bin/sh" && (e == null ? void 0 : e[1]) === "-c" && typeof e[2] == "string" && (e = x(e[2])), e[0] === "exec" && e.shift(), (e[0].endsWith(".php") || e[0].endsWith(".phar")) && e.unshift("php");
    const s = e[0].split("/").pop();
    if (e[0] === "/usr/bin/env" && e[1] === "stty" && e[2] === "size")
      r.stdout("18 140"), r.exit(0);
    else if (s === "tput" && e[1] === "cols")
      r.stdout("140"), r.exit(0);
    else if (s === "less") {
      r.on("stdin", (a2) => {
        r.stdout(a2);
      }), await new Promise((a2) => {
        r.childProcess.stdin.on("finish", () => {
          a2(true);
        });
      }), r.exit(0);
      return;
    }
    if (!["php", "ls", "pwd"].includes(s ?? "")) {
      r.exit(127);
      return;
    }
    if (!t) {
      import_logger.logger.warn(
        "Tried to spawn a PHP subprocess, but the sandboxed spawn handler was created without a getPHPInstance function."
      ), r.exit(127);
      return;
    }
    const { php: i, reap: o } = await t();
    try {
      n.cwd && await i.chdir(n.cwd);
      const a2 = await i.cwd();
      switch (s) {
        case "php": {
          const c3 = await i.cli(e, {
            env: {
              ...n.env,
              SCRIPT_PATH: e[1],
              // Set SHELL_PIPE to 0 to ensure WP-CLI formats
              // the output as ASCII tables.
              // @see https://github.com/wp-cli/wp-cli/issues/1102
              SHELL_PIPE: "0"
            }
          });
          c3.stdout.pipeTo(
            new WritableStream({
              write(l) {
                r.stdout(l);
              }
            })
          ), c3.stderr.pipeTo(
            new WritableStream({
              write(l) {
                r.stderr(l);
              }
            })
          ), r.exit(await c3.exitCode);
          break;
        }
        case "ls": {
          const c3 = await i.listFiles(e[1] ?? a2);
          for (const l of c3)
            r.stdout(l + `
`);
          await new Promise((l) => setTimeout(l, 10)), r.exit(0);
          break;
        }
        case "pwd": {
          r.stdout(a2 + `
`), await new Promise((c3) => setTimeout(c3, 10)), r.exit(0);
          break;
        }
      }
    } catch (a2) {
      const c3 = a2 instanceof Error ? a2.message + `
` + a2.stack : typeof a2 == "object" && a2 !== null ? JSON.stringify(a2, Object.getOwnPropertyNames(a2)) : String(a2);
      throw r.stderr(`[spawn error] ${c3}`), r.exit(1), a2;
    } finally {
      o();
    }
  });
}
function exposeSync(t, e, r, n = ["*"]) {
  return expose(t, e, n, r.afterResponseSent);
}
function createSyncProxy(t, e = [], r) {
  return new Proxy(() => {
  }, {
    get(n, s) {
      return s === "then" && !e.length ? {
        then: (i, o) => o(createSyncProxy(t, [], r))
      } : createSyncProxy(t, [...e, s], r);
    },
    set(n, s, i) {
      const [o, a2] = toWireValue(i);
      return r.send(
        t,
        {
          type: MessageType.SET,
          path: [...e, s].map(String),
          value: o
        },
        a2
      ), true;
    },
    apply(n, s, i) {
      if (e.at(-1) === "bind")
        return createSyncProxy(t, e.slice(0, -1), r);
      const [a2, c3] = processArguments(i), l = r.send(
        t,
        {
          type: MessageType.APPLY,
          path: e.map(String),
          argumentList: a2
        },
        c3
      );
      return fromWireValue(l);
    },
    construct(n, s) {
      const [i, o] = processArguments(s), a2 = r.send(
        t,
        {
          type: MessageType.CONSTRUCT,
          path: e.map(String),
          argumentList: i
        },
        o
      );
      return fromWireValue(a2);
    }
  });
}
function wrapSync(t, e) {
  return createSyncProxy(t, [], e);
}
var NodeSABSyncReceiveMessageTransport = class _NodeSABSyncReceiveMessageTransport {
  static async create() {
    if (!_NodeSABSyncReceiveMessageTransport.receiveMessageOnPort)
      try {
        _NodeSABSyncReceiveMessageTransport.receiveMessageOnPort = require("worker_threads").receiveMessageOnPort;
      } catch {
        _NodeSABSyncReceiveMessageTransport.receiveMessageOnPort = await import("worker_threads").then(
          (e) => e.receiveMessageOnPort
        );
      }
    return new _NodeSABSyncReceiveMessageTransport();
  }
  constructor() {
  }
  afterResponseSent(e) {
    const { notifyBuffer: r } = e.data;
    if (r) {
      const n = new Int32Array(r);
      n[0] = 1, Atomics.notify(n, 0);
    }
  }
  send(e, r, n) {
    var l;
    const s = new SharedArrayBuffer(4), i = new Int32Array(s);
    i[0] = 0;
    const o = generateUUID();
    if (e.postMessage(
      { ...r, id: o, notifyBuffer: s },
      n
    ), Atomics.wait(i, 0, 0, 5e3) === "timed-out")
      throw new Error("Timeout waiting for response");
    for (; ; ) {
      const d2 = _NodeSABSyncReceiveMessageTransport.receiveMessageOnPort(e);
      if (((l = d2.message) == null ? void 0 : l.id) === o)
        return d2.message;
      if (!d2)
        throw new Error("No response received");
    }
  }
};
var proxyMarker = Symbol("Comlink.proxy");
var createEndpoint = Symbol("Comlink.endpoint");
var releaseProxy = Symbol("Comlink.releaseProxy");
var finalizer = Symbol("Comlink.finalizer");
var throwMarker = Symbol("Comlink.thrown");
var WireValueType = {
  RAW: "RAW",
  HANDLER: "HANDLER"
};
var MessageType = {
  GET: "GET",
  SET: "SET",
  APPLY: "APPLY",
  CONSTRUCT: "CONSTRUCT",
  ENDPOINT: "ENDPOINT",
  RELEASE: "RELEASE"
};
var isObject = (t) => typeof t == "object" && t !== null || typeof t == "function";
var proxyTransferHandler = {
  canHandle: (t) => isObject(t) && t[proxyMarker],
  serialize(t) {
    const { port1: e, port2: r } = new MessageChannel();
    return expose(t, e), [r, [r]];
  },
  deserialize(t) {
    return t.start(), wrap(t);
  }
};
var throwTransferHandler$1 = {
  canHandle: (t) => isObject(t) && throwMarker in t,
  serialize({ value: t }) {
    let e;
    return t instanceof Error ? e = {
      isError: true,
      value: {
        message: t.message,
        name: t.name,
        stack: t.stack
      }
    } : e = { isError: false, value: t }, [e, []];
  },
  deserialize(t) {
    throw t.isError ? Object.assign(
      new Error(t.value.message),
      t.value
    ) : t.value;
  }
};
var transferHandlers = /* @__PURE__ */ new Map([
  ["proxy", proxyTransferHandler],
  ["throw", throwTransferHandler$1]
]);
function isAllowedOrigin(t, e) {
  for (const r of t)
    if (e === r || r === "*" || r instanceof RegExp && r.test(e))
      return true;
  return false;
}
function expose(t, e = globalThis, r = ["*"], n) {
  e.addEventListener("message", function s(i) {
    if (!i || !i.data)
      return;
    if (!isAllowedOrigin(r, i.origin)) {
      console.warn(`Invalid origin '${i.origin}' for comlink proxy`);
      return;
    }
    const { id: o, type: a2, path: c3 } = {
      path: [],
      ...i.data
    }, l = (i.data.argumentList || []).map(fromWireValue);
    let d2;
    try {
      const p2 = c3.slice(0, -1).reduce((P4, S3) => P4[S3], t), h3 = c3.reduce((P4, S3) => P4[S3], t);
      switch (a2) {
        case MessageType.GET:
          d2 = h3;
          break;
        case MessageType.SET:
          p2[c3.slice(-1)[0]] = fromWireValue(
            i.data.value
          ), d2 = true;
          break;
        case MessageType.APPLY:
          d2 = h3.apply(p2, l);
          break;
        case MessageType.CONSTRUCT:
          {
            const P4 = new h3(...l);
            d2 = proxy(P4);
          }
          break;
        case MessageType.ENDPOINT:
          {
            const { port1: P4, port2: S3 } = new MessageChannel();
            expose(t, S3), d2 = transfer(P4, [P4]);
          }
          break;
        case MessageType.RELEASE:
          d2 = void 0;
          break;
        default:
          return;
      }
    } catch (p2) {
      d2 = { value: p2, [throwMarker]: 0 };
    }
    Promise.resolve(d2).catch((p2) => ({ value: p2, [throwMarker]: 0 })).then((p2) => {
      const [h3, P4] = toWireValue(p2);
      e.postMessage({ ...h3, id: o }, P4), a2 === MessageType.RELEASE && (e.removeEventListener("message", s), closeEndPoint(e), finalizer in t && typeof t[finalizer] == "function" && t[finalizer]());
    }).catch(() => {
      const [p2, h3] = toWireValue({
        value: new TypeError("Unserializable return value"),
        [throwMarker]: 0
      });
      e.postMessage({ ...p2, id: o }, h3);
    }).finally(() => {
      n == null || n(i);
    });
  }), e.start && e.start();
}
function isMessagePort(t) {
  return t.constructor.name === "MessagePort";
}
function closeEndPoint(t) {
  isMessagePort(t) && t.close();
}
function wrap(t, e) {
  const r = /* @__PURE__ */ new Map();
  return t.addEventListener("message", function(s) {
    const { data: i } = s;
    if (!i || !i.id)
      return;
    const o = r.get(i.id);
    if (o)
      try {
        o(i);
      } finally {
        r.delete(i.id);
      }
  }), createProxy(t, r, [], e);
}
function throwIfProxyReleased(t) {
  if (t)
    throw new Error("Proxy has been released and is not useable");
}
function releaseEndpoint(t) {
  return requestResponseMessage(t, /* @__PURE__ */ new Map(), {
    type: MessageType.RELEASE
  }).then(() => {
    closeEndPoint(t);
  });
}
var proxyCounter = /* @__PURE__ */ new WeakMap();
var proxyFinalizers = "FinalizationRegistry" in globalThis && new FinalizationRegistry((t) => {
  const e = (proxyCounter.get(t) || 0) - 1;
  proxyCounter.set(t, e), e === 0 && releaseEndpoint(t);
});
function registerProxy(t, e) {
  const r = (proxyCounter.get(e) || 0) + 1;
  proxyCounter.set(e, r), proxyFinalizers && proxyFinalizers.register(t, e, t);
}
function unregisterProxy(t) {
  proxyFinalizers && proxyFinalizers.unregister(t);
}
function createProxy(t, e, r = [], n = function() {
}) {
  let s = false;
  const i = new Proxy(n, {
    get(o, a2) {
      if (throwIfProxyReleased(s), a2 === releaseProxy)
        return () => {
          unregisterProxy(i), releaseEndpoint(t), e.clear(), s = true;
        };
      if (a2 === "then") {
        if (r.length === 0)
          return { then: () => i };
        const c3 = requestResponseMessage(t, e, {
          type: MessageType.GET,
          path: r.map((l) => l.toString())
        }).then(fromWireValue);
        return c3.then.bind(c3);
      }
      return createProxy(t, e, [...r, a2]);
    },
    set(o, a2, c3) {
      throwIfProxyReleased(s);
      const [l, d2] = toWireValue(c3);
      return requestResponseMessage(
        t,
        e,
        {
          type: MessageType.SET,
          path: [...r, a2].map((p2) => p2.toString()),
          value: l
        },
        d2
      ).then(fromWireValue);
    },
    apply(o, a2, c3) {
      throwIfProxyReleased(s);
      const l = r[r.length - 1];
      if (l === createEndpoint)
        return requestResponseMessage(t, e, {
          type: MessageType.ENDPOINT
        }).then(fromWireValue);
      if (l === "bind")
        return createProxy(t, e, r.slice(0, -1));
      const [d2, p2] = processArguments(c3);
      return requestResponseMessage(
        t,
        e,
        {
          type: MessageType.APPLY,
          path: r.map((h3) => h3.toString()),
          argumentList: d2
        },
        p2
      ).then(fromWireValue);
    },
    construct(o, a2) {
      throwIfProxyReleased(s);
      const [c3, l] = processArguments(a2);
      return requestResponseMessage(
        t,
        e,
        {
          type: MessageType.CONSTRUCT,
          path: r.map((d2) => d2.toString()),
          argumentList: c3
        },
        l
      ).then(fromWireValue);
    }
  });
  return registerProxy(i, t), i;
}
function myFlat(t) {
  return Array.prototype.concat.apply([], t);
}
function processArguments(t) {
  const e = t.map(toWireValue);
  return [e.map((r) => r[0]), myFlat(e.map((r) => r[1]))];
}
var transferCache = /* @__PURE__ */ new WeakMap();
function transfer(t, e) {
  return transferCache.set(t, e), t;
}
function proxy(t) {
  return Object.assign(t, { [proxyMarker]: true });
}
function windowEndpoint(t, e = globalThis, r = "*") {
  return {
    postMessage: (n, s) => t.postMessage(n, r, s),
    addEventListener: e.addEventListener.bind(e),
    removeEventListener: e.removeEventListener.bind(e)
  };
}
function toWireValue(t) {
  for (const [e, r] of transferHandlers)
    if (r.canHandle(t)) {
      const [n, s] = r.serialize(t);
      return [
        {
          type: WireValueType.HANDLER,
          name: e,
          value: n
        },
        s
      ];
    }
  return [
    {
      type: WireValueType.RAW,
      value: t
    },
    transferCache.get(t) || []
  ];
}
function fromWireValue(t) {
  switch (t.type) {
    case WireValueType.HANDLER:
      return transferHandlers.get(t.name).deserialize(t.value);
    case WireValueType.RAW:
      return t.value;
  }
}
function requestResponseMessage(t, e, r, n) {
  return new Promise((s) => {
    const i = generateUUID();
    e.set(i, s), t.start && t.start(), t.postMessage({ id: i, ...r }, n);
  });
}
function generateUUID() {
  return new Array(4).fill(0).map(
    () => Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString(16)
  ).join("-");
}
function nodeEndpoint(t) {
  const e = /* @__PURE__ */ new WeakMap();
  return {
    postMessage: t.postMessage.bind(t),
    addEventListener: (r, n) => {
      const s = (i) => {
        "handleEvent" in n ? n.handleEvent({ data: i }) : n({ data: i });
      };
      t.on("message", s), e.set(n, s);
    },
    removeEventListener: (r, n) => {
      const s = e.get(n);
      s && (t.off("message", s), e.delete(n));
    },
    start: t.start && t.start.bind(t)
  };
}
var proxyByListener = /* @__PURE__ */ new WeakMap();
function nodeProcessEndpoint(t) {
  const e = t || process;
  if (typeof e.send != "function")
    throw new Error(
      "IPC channel is not available. Did you forget to fork the process?"
    );
  const r = e;
  return {
    postMessage(n, s) {
      var i;
      if (s && s.length > 0)
        throw new Error(
          "Transferable objects are not supported for nodeProcessEndpoint"
        );
      (i = r.send) == null || i.call(r, n);
    },
    addEventListener(n, s) {
      const i = typeof s == "function" ? (o) => s({ data: o }) : (o) => s.handleEvent({ data: o });
      proxyByListener.set(s, i), r.addListener(n, i);
    },
    removeEventListener(n, s) {
      const i = proxyByListener.get(s);
      i && (proxyByListener.delete(s), r.removeListener(n, i));
    },
    start() {
    }
  };
}
var list = [
  // Native ES errors https://262.ecma-international.org/12.0/#sec-well-known-intrinsic-objects
  Error,
  EvalError,
  RangeError,
  ReferenceError,
  SyntaxError,
  TypeError,
  URIError,
  AggregateError,
  // Built-in errors
  globalThis.DOMException,
  // Node-specific errors
  // https://nodejs.org/api/errors.html
  globalThis.AssertionError,
  globalThis.SystemError
].filter(Boolean).map((t) => [t.name, t]);
var errorConstructors = new Map(list);
var NonError = class _NonError extends Error {
  constructor(e) {
    super(_NonError._prepareSuperMessage(e)), this.name = "NonError";
  }
  static _prepareSuperMessage(e) {
    try {
      return JSON.stringify(e);
    } catch {
      return String(e);
    }
  }
};
var errorProperties = [
  {
    property: "name",
    enumerable: false
  },
  {
    property: "message",
    enumerable: false
  },
  {
    property: "stack",
    enumerable: false
  },
  {
    property: "code",
    enumerable: true
  },
  {
    property: "cause",
    enumerable: false
  },
  {
    property: "errors",
    enumerable: false
  }
];
var toJsonWasCalled = /* @__PURE__ */ new WeakSet();
var toJSON = (t) => {
  toJsonWasCalled.add(t);
  const e = t.toJSON();
  return toJsonWasCalled.delete(t), e;
};
var newError = (t) => {
  const e = errorConstructors.get(t) ?? Error;
  return e === AggregateError ? new e([]) : new e();
};
var destroyCircular = ({
  from: t,
  seen: e,
  to: r,
  forceEnumerable: n,
  maxDepth: s,
  depth: i,
  useToJSON: o,
  serialize: a2
}) => {
  if (r || (Array.isArray(t) ? r = [] : !a2 && isErrorLike(t) ? r = newError(t.name) : r = {}), e.push(t), i >= s)
    return r;
  if (o && typeof t.toJSON == "function" && !toJsonWasCalled.has(t))
    return toJSON(t);
  const c3 = (l) => destroyCircular({
    from: l,
    seen: [...e],
    forceEnumerable: n,
    maxDepth: s,
    depth: i,
    useToJSON: o,
    serialize: a2
  });
  for (const [l, d2] of Object.entries(t)) {
    if (d2 && d2 instanceof Uint8Array && d2.constructor.name === "Buffer") {
      r[l] = "[object Buffer]";
      continue;
    }
    if (d2 !== null && typeof d2 == "object" && typeof d2.pipe == "function") {
      r[l] = "[object Stream]";
      continue;
    }
    if (typeof d2 != "function") {
      if (!d2 || typeof d2 != "object") {
        try {
          r[l] = d2;
        } catch {
        }
        continue;
      }
      if (!e.includes(t[l])) {
        i++, r[l] = c3(t[l]);
        continue;
      }
      r[l] = "[Circular]";
    }
  }
  if (a2 || r instanceof Error)
    for (const { property: l, enumerable: d2 } of errorProperties)
      t[l] !== void 0 && t[l] !== null && Object.defineProperty(r, l, {
        value: isErrorLike(t[l]) || Array.isArray(t[l]) ? c3(t[l]) : t[l],
        enumerable: n ? true : d2,
        configurable: true,
        writable: true
      });
  return r;
};
function serializeError(t, e = {}) {
  const { maxDepth: r = Number.POSITIVE_INFINITY, useToJSON: n = true } = e;
  return typeof t == "object" && t !== null ? destroyCircular({
    from: t,
    seen: [],
    forceEnumerable: true,
    maxDepth: r,
    depth: 0,
    useToJSON: n,
    serialize: true
  }) : typeof t == "function" ? `[Function: ${t.name || "anonymous"}]` : t;
}
function deserializeError(t, e = {}) {
  const { maxDepth: r = Number.POSITIVE_INFINITY } = e;
  return t instanceof Error ? t : isMinimumViableSerializedError(t) ? destroyCircular({
    from: t,
    seen: [],
    to: newError(t.name),
    maxDepth: r,
    depth: 0,
    serialize: false
  }) : new NonError(t);
}
function isErrorLike(t) {
  return !!t && typeof t == "object" && typeof t.name == "string" && typeof t.message == "string" && typeof t.stack == "string";
}
function isMinimumViableSerializedError(t) {
  return !!t && typeof t == "object" && typeof t.message == "string" && !Array.isArray(t);
}
var releaseApiProxy = releaseProxy;
async function consumeAPISync(t) {
  setupTransferHandlers();
  const e = await NodeSABSyncReceiveMessageTransport.create();
  return wrapSync(t, e);
}
function consumeAPI(t, e = void 0) {
  setupTransferHandlers();
  let r;
  if (typeof process < "u" && typeof process.versions < "u" && typeof process.versions.node < "u")
    if ("postMessage" in t)
      r = nodeEndpoint(t);
    else if ("send" in t && "addListener" in t)
      r = nodeProcessEndpoint(t);
    else
      throw new Error(
        "consumeAPI: remote does not look like a Worker, MessagePort, or Process"
      );
  else if (t instanceof Worker)
    r = t;
  else {
    const o = windowEndpoint(
      t,
      e
    ), a2 = wrap(o);
    r = deferredEndpoint(
      connectWindowApiThroughMessagePort(a2)
    );
  }
  const s = wrap(r), i = proxyClone(s);
  return new Proxy(i, {
    get: (o, a2) => a2 === "isConnected" ? async () => {
      for (; ; )
        try {
          await runWithTimeout(s.isConnected(), 200);
          break;
        } catch {
        }
    } : s[a2]
  });
}
async function connectWindowApiThroughMessagePort(t) {
  for (; ; )
    try {
      return await runWithTimeout(t.isConnected(), 200), await t[createEndpoint]();
    } catch {
    }
}
function deferredEndpoint(t) {
  let e, r = false;
  const n = [], s = [];
  return t.then((i) => {
    e = i;
    for (const { type: o, listener: a2, options: c3 } of n)
      e.addEventListener(o, a2, c3);
    r && e.start();
    for (const { message: o, transfer: a2 } of s)
      a2 ? e.postMessage(o, a2) : e.postMessage(o);
    s.length = 0;
  }), {
    postMessage(i, o) {
      e ? o ? e.postMessage(i, o) : e.postMessage(i) : s.push({ message: i, transfer: o });
    },
    addEventListener(i, o, a2) {
      e ? e.addEventListener(i, o, a2) : n.push({ type: i, listener: o, options: a2 });
    },
    removeEventListener(i, o, a2) {
      if (e) {
        e.removeEventListener(i, o, a2);
        return;
      }
      const c3 = n.findIndex(
        (l) => l.type === i && l.listener === o && l.options === a2
      );
      c3 !== -1 && n.splice(c3, 1);
    },
    start() {
      e ? e.start() : r = true;
    }
  };
}
async function runWithTimeout(t, e) {
  return new Promise((r, n) => {
    const s = setTimeout(n, e);
    t.then(
      (i) => {
        clearTimeout(s), r(i);
      },
      (i) => {
        clearTimeout(s), n(i);
      }
    );
  });
}
function exposeAPI(t, e, r) {
  const { setReady: n, setFailed: s, exposedApi: i } = prepareForExpose(
    t,
    e
  );
  let o;
  if (r)
    if ("addEventListener" in r)
      o = r;
    else if ("postMessage" in r)
      o = nodeEndpoint(r);
    else if ("send" in r && "addListener" in r)
      o = nodeProcessEndpoint(r);
    else
      throw new Error(
        "exposeAPI: targetWorker does not look like a Worker, MessagePort, or Process"
      );
  else
    o = typeof window < "u" ? windowEndpoint(self.parent) : void 0;
  return expose(i, o), [n, s, i];
}
async function exposeSyncAPI(t, e) {
  const { setReady: r, setFailed: n, exposedApi: s } = prepareForExpose(t), i = await NodeSABSyncReceiveMessageTransport.create(), o = nodeEndpoint(e);
  return exposeSync(s, o, i), [r, n, s];
}
function prepareForExpose(t, e) {
  setupTransferHandlers();
  const r = Promise.resolve();
  let n, s;
  const i = new Promise((c3, l) => {
    n = c3, s = l;
  }), o = proxyClone(t), a2 = new Proxy(o, {
    get: (c3, l) => l === "isConnected" ? () => r : l === "isReady" ? () => i : l in c3 ? c3[l] : e == null ? void 0 : e[l]
  });
  return { setReady: n, setFailed: s, exposedApi: a2 };
}
var isTransferHandlersSetup = false;
function setupTransferHandlers() {
  if (isTransferHandlersSetup)
    return;
  isTransferHandlersSetup = true, transferHandlers.set("EVENT", {
    canHandle: (s) => s instanceof CustomEvent,
    serialize: (s) => [
      {
        detail: s.detail
      },
      []
    ],
    deserialize: (s) => s
  }), transferHandlers.set("FUNCTION", {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    canHandle: (s) => typeof s == "function",
    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    serialize(s) {
      const { port1: i, port2: o } = new MessageChannel();
      return expose(s, i), [o, [o]];
    },
    deserialize(s) {
      return s.start(), wrap(s);
    }
  }), transferHandlers.set("MESSAGE_PORT", {
    canHandle: (s) => s instanceof MessagePort,
    serialize(s) {
      return [s, [s]];
    },
    deserialize(s) {
      return s;
    }
  });
  const t = {
    canHandle: (s) => typeof ReadableStream < "u" && s instanceof ReadableStream,
    serialize(s) {
      if (supportsTransferableStreams())
        return [{ stream: s }, [s]];
      const i = streamToPort(s);
      return [{ port: i }, [i]];
    },
    deserialize(s) {
      return s.stream || portToStream(s.port);
    }
  };
  transferHandlers.set(
    "READABLE_STREAM",
    t
  );
  const e = {
    canHandle: (s) => typeof s == "object" && s !== null && A in s && s[A] === true && "type" in s && typeof s.type == "string" && "stdin" in s && t.canHandle(s.stdin),
    serialize(s) {
      const [i, o] = t.serialize(s.stdin);
      return [{ ...s, stdin: i }, o];
    },
    deserialize(s) {
      return {
        ...s,
        stdin: t.deserialize(s.stdin),
        [A]: true
      };
    }
  };
  transferHandlers.set(
    "EVENT_WITH_READABLE_STDIN",
    e
  ), transferHandlers.set("PHPResponse", {
    canHandle: (s) => typeof s == "object" && s !== null && "headers" in s && "bytes" in s && "errors" in s && "exitCode" in s && "httpStatusCode" in s,
    serialize(s) {
      const i = s.toRawData(), o = [];
      return i.bytes.buffer.byteLength > 0 && o.push(i.bytes.buffer), [i, o];
    },
    deserialize(s) {
      return PHPResponse.fromRawData(s);
    }
  });
  const r = transferHandlers.get("throw"), n = r == null ? void 0 : r.serialize;
  r.serialize = ({ value: s }) => {
    const i = n({ value: s });
    return s.response && (i[0].value.response = s.response), s.source && (i[0].value.source = s.source), i;
  }, transferHandlers.set("StreamedPHPResponse", {
    canHandle: (s) => s instanceof StreamedPHPResponse,
    serialize(s) {
      const i = supportsTransferableStreams(), o = promiseToPort(s.exitCode), a2 = s.getHeadersStream();
      if (i)
        return [
          {
            __type: "StreamedPHPResponse",
            headers: a2,
            stdout: s.stdout,
            stderr: s.stderr,
            exitCodePort: o
          },
          [
            a2,
            s.stdout,
            s.stderr,
            o
          ]
        ];
      const c3 = streamToPort(a2), l = streamToPort(s.stdout), d2 = streamToPort(s.stderr);
      return [
        {
          __type: "StreamedPHPResponse",
          headersPort: c3,
          stdoutPort: l,
          stderrPort: d2,
          exitCodePort: o
        },
        [c3, l, d2, o]
      ];
    },
    deserialize(s) {
      if (s.headers && s.stdout && s.stderr) {
        const l = portToPromise(
          s.exitCodePort
        );
        return new StreamedPHPResponse(
          s.headers,
          s.stdout,
          s.stderr,
          l
        );
      }
      const i = portToStream(s.headersPort), o = portToStream(s.stdoutPort), a2 = portToStream(s.stderrPort), c3 = portToPromise(s.exitCodePort);
      return new StreamedPHPResponse(i, o, a2, c3);
    }
  });
}
var _cachedSupportsTransferableStreams;
function supportsTransferableStreams() {
  if (typeof ReadableStream > "u" && (_cachedSupportsTransferableStreams = false), _cachedSupportsTransferableStreams === void 0)
    try {
      const { port1: t } = new MessageChannel(), e = new ReadableStream();
      t.postMessage(e, [e]);
      try {
        t.close();
      } catch {
      }
      _cachedSupportsTransferableStreams = true;
    } catch {
      _cachedSupportsTransferableStreams = false;
    }
  return _cachedSupportsTransferableStreams;
}
function streamToPort(t) {
  const { port1: e, port2: r } = new MessageChannel(), n = t.getReader(), s = (i) => {
    var o;
    ((o = i.data) == null ? void 0 : o.t) === "cancel" && n.cancel().catch(() => {
    });
  };
  return e.addEventListener("message", s), e.start(), (async () => {
    try {
      for (; ; ) {
        const { done: i, value: o } = await n.read();
        if (i) {
          try {
            e.postMessage({ t: "close" });
          } catch {
          }
          try {
            e.close();
          } catch {
          }
          break;
        }
        if (o) {
          const a2 = o.slice(), c3 = a2.buffer;
          try {
            e.postMessage({ t: "chunk", b: c3 }, [
              c3
            ]);
          } catch {
            e.postMessage({
              t: "chunk",
              b: a2.buffer.slice(0)
            });
          }
        }
      }
    } catch (i) {
      try {
        e.postMessage({ t: "error", m: (i == null ? void 0 : i.message) || String(i) });
      } catch {
      }
    } finally {
      e.removeEventListener("message", s);
      try {
        e.close();
      } catch {
      }
    }
  })(), r;
}
function portToStream(t) {
  return new ReadableStream({
    start(e) {
      const r = (s) => {
        const i = s.data;
        if (i)
          switch (i.t) {
            case "chunk":
              try {
                e.enqueue(new Uint8Array(i.b));
              } catch {
                n();
              }
              break;
            case "close":
              safeStreamClose(e), n();
              break;
            case "error":
              safeStreamError(
                e,
                new Error(i.m || "Stream error")
              ), n();
              break;
          }
      }, n = () => {
        var s;
        try {
          (s = t.removeEventListener) == null || s.call(t, "message", r);
        } catch {
        }
        try {
          t.onmessage = null;
        } catch {
        }
        try {
          t.close();
        } catch {
        }
      };
      t.addEventListener ? t.addEventListener("message", r) : t.on ? t.on(
        "message",
        (s) => r({ data: s })
      ) : t.onmessage = r, typeof t.start == "function" && t.start();
    },
    cancel() {
      try {
        t.postMessage({ t: "cancel" });
      } catch {
      }
      try {
        t.close();
      } catch {
      }
    }
  });
}
function promiseToPort(t) {
  const { port1: e, port2: r } = new MessageChannel();
  return t.then((n) => {
    try {
      e.postMessage({ t: "resolve", v: n });
    } catch {
    }
  }).catch((n) => {
    try {
      e.postMessage({
        t: "reject",
        m: (n == null ? void 0 : n.message) || String(n)
      });
    } catch {
    }
  }).finally(() => {
    try {
      e.close();
    } catch {
    }
  }), r;
}
function portToPromise(t) {
  return new Promise((e, r) => {
    const n = (i) => {
      const o = i.data;
      o && (o.t === "resolve" ? (s(), e(o.v)) : o.t === "reject" && (s(), r(new Error(o.m || ""))));
    }, s = () => {
      var i;
      try {
        (i = t.removeEventListener) == null || i.call(t, "message", n);
      } catch {
      }
      try {
        t.onmessage = null;
      } catch {
      }
      try {
        t.close();
      } catch {
      }
    };
    t.addEventListener ? t.addEventListener("message", n) : t.on ? t.on(
      "message",
      (i) => n({ data: i })
    ) : t.onmessage = n, typeof t.start == "function" && t.start();
  });
}
var throwTransferHandler = transferHandlers.get(
  "throw"
);
var throwTransferHandlerCustom = {
  canHandle: throwTransferHandler.canHandle,
  serialize: ({ value: t }) => {
    let e;
    return t instanceof Error ? (e = {
      isError: true,
      value: serializeError(t)
    }, e.value.originalErrorClassName = t.constructor.name) : e = { isError: false, value: t }, [e, []];
  },
  deserialize: (t) => {
    if (t.isError) {
      const e = deserializeError(t.value), r = new Error("Comlink method call failed");
      let n = e;
      for (; n.cause; )
        n = n.cause;
      throw n.cause = r, e;
    }
    throw t.value;
  }
};
transferHandlers.set("throw", throwTransferHandlerCustom);
function proxyClone(t) {
  return new Proxy(t, {
    get(e, r) {
      switch (typeof e[r]) {
        case "function":
          return (...n) => e[r](...n);
        case "object":
          return e[r] === null ? e[r] : proxyClone(e[r]);
        case "undefined":
        case "number":
        case "string":
          return e[r];
        default:
          return proxy(e[r]);
      }
    }
  });
}
function safeStreamError(t, e) {
  try {
    t.error(e);
  } catch {
  }
}
function safeStreamClose(t) {
  try {
    t.close();
  } catch {
  }
}
var MAX_ADDRESSABLE_FILE_OFFSET = BigInt(Number.MAX_SAFE_INTEGER);
var IntervalNode = class {
  constructor(e) {
    this.left = null, this.right = null, this.range = e, this.max = e.end;
  }
};
var FileLockIntervalTree = class {
  constructor() {
    this.root = null;
  }
  isEmpty() {
    return this.root === null;
  }
  /**
   * Insert a new locked range into the tree
   */
  insert(e) {
    this.root = this.insertNode(this.root, e);
  }
  /**
   * Find all ranges that overlap with the given range
   */
  findOverlapping(e) {
    const r = [];
    return this.findOverlappingRanges(this.root, e, r), r;
  }
  /**
   * Remove a lock range from the tree
   */
  remove(e) {
    this.root = this.removeNode(this.root, e);
  }
  /**
   * Find all ranges locked by the given process.
   *
   * @param pid The process ID to find locks for.
   * @returns All locked ranges for the given process.
   */
  findLocksForProcess(e) {
    const r = [];
    return this.findLocksForProcessInNode(this.root, e, r), r;
  }
  /**
   * Find the strictest existing lock type in the range lock tree.
   *
   * @returns The strictest existing lock type, or 'unlocked' if no locks exist.
   */
  findStrictestExistingLockType() {
    let e = "unlocked";
    const r = (n) => {
      if (n) {
        if (n.range.type === "exclusive") {
          e = "exclusive";
          return;
        }
        n.range.type === "shared" && (e = "shared"), r(n.left), r(n.right);
      }
    };
    return r(this.root), e;
  }
  insertNode(e, r) {
    return e ? (r.start < e.range.start ? e.left = this.insertNode(e.left, r) : e.right = this.insertNode(e.right, r), e.max = this.bigintMax(e.max, r.end), e) : new IntervalNode(r);
  }
  bigintMax(...e) {
    return e.reduce((r, n) => n > r ? n : r, e[0]);
  }
  findOverlappingRanges(e, r, n) {
    e && (this.doRangesOverlap(e.range, r) && n.push(e.range), e.left && e.left.max >= r.start && this.findOverlappingRanges(e.left, r, n), e.right && e.range.start <= r.end && this.findOverlappingRanges(e.right, r, n));
  }
  doRangesOverlap(e, r) {
    return e.start < r.end && r.start < e.end;
  }
  removeNode(e, r) {
    if (!e)
      return null;
    if (this.areRangesEqual(e.range, r)) {
      if (!e.left)
        return e.right;
      if (!e.right)
        return e.left;
      const n = this.findMin(e.right);
      e.range = n.range, e.right = this.removeNode(e.right, n.range);
    } else r.start < e.range.start ? e.left = this.removeNode(e.left, r) : e.right = this.removeNode(e.right, r);
    return e.max = e.range.end, e.left && (e.max = this.bigintMax(e.max, e.left.max)), e.right && (e.max = this.bigintMax(e.max, e.right.max)), e;
  }
  findMin(e) {
    let r = e;
    for (; r.left; )
      r = r.left;
    return r;
  }
  areRangesEqual(e, r) {
    return e.start === r.start && e.end === r.end && e.pid === r.pid && e.fd === r.fd;
  }
  findLocksForProcessInNode(e, r, n) {
    e && (e.range.pid === r && n.push(e.range), this.findLocksForProcessInNode(e.left, r, n), this.findLocksForProcessInNode(e.right, r, n));
  }
};
var FileLockManagerInMemory = class {
  /**
   * Create a new FileLockManagerInMemory instance.
   *
   * @param nativeFlockSync A synchronous flock() function to lock files via the host OS.
   */
  constructor() {
    this.locks = /* @__PURE__ */ new Map();
  }
  /**
   * Lock the whole file.
   *
   * @param path The path to the file to lock. This should be the path
   *             of the file in the native filesystem.
   * @param op The whole file lock operation to perform.
   * @returns True if the lock was granted, false otherwise.
   */
  lockWholeFile(e, r) {
    if (this.locks.get(e) === void 0) {
      if (r.type === "unlock")
        return true;
      this.locks.set(e, new FileLock());
    }
    const s = this.locks.get(e).lockWholeFile(r);
    return this.forgetPathIfUnlocked(e), s;
  }
  /**
   * Lock a byte range.
   *
   * @param path The path to the file to lock. This should be the path
   *             of the file in the native filesystem.
   * @param requestedLock The byte range lock to perform.
   * @returns True if the lock was granted, false otherwise.
   */
  lockFileByteRange(e, r) {
    if (!this.locks.has(e)) {
      if (r.type === "unlocked")
        return true;
      this.locks.set(e, new FileLock());
    }
    return this.locks.get(e).lockFileByteRange(r);
  }
  /**
   * Find the first conflicting byte range lock.
   *
   * @param path The path to the file to find the conflicting lock for.
   * @param desiredLock The desired byte range lock.
   * @returns The first conflicting byte range lock, or undefined if no conflicting lock exists.
   */
  findFirstConflictingByteRangeLock(e, r) {
    const n = this.locks.get(e);
    if (n !== void 0)
      return n.findFirstConflictingByteRangeLock(r);
  }
  /**
   * Release all locks for the given process.
   *
   * @param pid The process ID to release locks for.
   */
  releaseLocksForProcess(e) {
    for (const [r, n] of this.locks.entries())
      n.releaseLocksForProcess(e), this.forgetPathIfUnlocked(r);
  }
  /**
   * Release all locks for the given process and file descriptor.
   *
   * @param pid The process ID to release locks for.
   * @param fd The file descriptor to release locks for.
   * @param path The path to the file to release locks for.
   */
  releaseLocksOnFdClose(e, r, n) {
    const s = this.locks.get(n);
    s && (s.releaseLocksOnFdClose(e, r), this.forgetPathIfUnlocked(n));
  }
  /**
   * Forget the path if it is unlocked.
   *
   * @param path The path to the file to forget.
   */
  forgetPathIfUnlocked(e) {
    const r = this.locks.get(e);
    r && r.isUnlocked() && this.locks.delete(e);
  }
};
var FileLock = class {
  constructor() {
    this.rangeLocks = new FileLockIntervalTree(), this.wholeFileLock = { type: "unlocked" };
  }
  /**
   * Lock the whole file.
   *
   * This method corresponds to the flock() function.
   *
   * @param op The whole file lock operation to perform.
   * @returns True if the lock was granted, false otherwise.
   */
  lockWholeFile(e) {
    if (e.type === "unlock")
      return this.wholeFileLock.type === "unlocked" || (this.wholeFileLock.type === "exclusive" && this.wholeFileLock.pid === e.pid && this.wholeFileLock.fd === e.fd ? this.wholeFileLock = { type: "unlocked" } : this.wholeFileLock.type === "shared" && this.wholeFileLock.pidFds.has(e.pid) && this.wholeFileLock.pidFds.get(e.pid).has(e.fd) && (this.wholeFileLock.pidFds.get(e.pid).delete(e.fd), this.wholeFileLock.pidFds.get(e.pid).size === 0 && this.wholeFileLock.pidFds.delete(e.pid), this.wholeFileLock.pidFds.size === 0 && (this.wholeFileLock = { type: "unlocked" }))), true;
    if (this.isThereAConflictWithRequestedWholeFileLock(e))
      return false;
    if (e.type === "exclusive")
      return this.wholeFileLock = {
        type: "exclusive",
        pid: e.pid,
        fd: e.fd
      }, true;
    if (e.type === "shared") {
      this.wholeFileLock.type !== "shared" && (this.wholeFileLock = {
        type: "shared",
        pidFds: /* @__PURE__ */ new Map()
      });
      const r = this.wholeFileLock;
      return r.pidFds.has(e.pid) || r.pidFds.set(e.pid, /* @__PURE__ */ new Set()), r.pidFds.get(e.pid).add(e.fd), true;
    }
    throw new Error(`Unexpected wholeFileLock() op: '${e.type}'`);
  }
  /**
   * Lock a byte range.
   *
   * This method corresponds to the fcntl() F_SETLK command.
   *
   * @param requestedLock The byte range lock to perform.
   * @returns True if the lock was granted, false otherwise.
   */
  lockFileByteRange(e) {
    if (e.start === e.end && (e = {
      ...e,
      end: MAX_ADDRESSABLE_FILE_OFFSET
    }), e.type === "unlocked") {
      const o = this.rangeLocks.findOverlapping(e).filter((a2) => a2.pid === e.pid);
      for (const a2 of o)
        this.rangeLocks.remove(a2), a2.start < e.start && this.rangeLocks.insert({
          ...a2,
          end: e.start
        }), a2.end > e.end && this.rangeLocks.insert({
          ...a2,
          start: e.end
        });
      return true;
    }
    if (this.isThereAConflictWithRequestedRangeLock(e))
      return false;
    const r = this.rangeLocks.findOverlapping(e).filter((o) => o.pid === e.pid);
    let n = e.start, s = e.end;
    for (const o of r)
      this.rangeLocks.remove(o), o.start < n && (n = o.start), o.end > s && (s = o.end);
    const i = {
      ...e,
      start: n,
      end: s
    };
    return this.rangeLocks.insert(i), true;
  }
  /**
   * Find the first conflicting byte range lock.
   *
   * This method corresponds to the fcntl() F_GETLK command.
   *
   * @param desiredLock The desired byte range lock.
   * @returns The first conflicting byte range lock, or undefined if no conflicting lock exists.
   */
  findFirstConflictingByteRangeLock(e) {
    e.start === e.end && (e = {
      ...e,
      end: MAX_ADDRESSABLE_FILE_OFFSET
    });
    const n = this.rangeLocks.findOverlapping(e).find(
      (i) => i.pid !== e.pid && (e.type === "exclusive" || i.type === "exclusive")
    );
    if (n)
      return n;
    if (this.wholeFileLock.type === "unlocked")
      return;
    if (this.wholeFileLock.type === "exclusive" || e.type === "exclusive")
      return {
        type: this.wholeFileLock.type,
        start: 0n,
        end: 0n,
        pid: -1
      };
  }
  /**
   * Release all locks for the given process.
   *
   * @param pid The process ID to release locks for.
   */
  releaseLocksForProcess(e) {
    for (const r of this.rangeLocks.findLocksForProcess(e))
      this.lockFileByteRange({
        ...r,
        type: "unlocked"
      });
    if (this.wholeFileLock.type === "exclusive" && this.wholeFileLock.pid === e)
      this.lockWholeFile({
        pid: e,
        fd: this.wholeFileLock.fd,
        type: "unlock"
      });
    else if (this.wholeFileLock.type === "shared" && this.wholeFileLock.pidFds.has(e))
      for (const r of this.wholeFileLock.pidFds.get(e))
        this.lockWholeFile({
          pid: e,
          fd: r,
          type: "unlock"
        });
  }
  /**
   * Release all locks for the given process and file descriptor.
   *
   * @param pid The process ID to release locks for.
   * @param fd The file descriptor to release locks for.
   */
  releaseLocksOnFdClose(e, r) {
    for (const n of this.rangeLocks.findLocksForProcess(e))
      this.lockFileByteRange({
        ...n,
        type: "unlocked"
      });
    this.lockWholeFile({
      pid: e,
      fd: r,
      type: "unlock"
    });
  }
  /**
   * Check if the file lock is unlocked.
   *
   * @returns True if the file lock is unlocked, false otherwise.
   */
  isUnlocked() {
    return this.wholeFileLock.type === "unlocked" && this.rangeLocks.isEmpty();
  }
  /**
   * Check if a lock exists that conflicts with the requested range lock.
   *
   * @param requestedLock The desired byte range lock.
   * @returns True if a conflicting lock exists, false otherwise.
   */
  isThereAConflictWithRequestedRangeLock(e) {
    return this.findFirstConflictingByteRangeLock(e) !== void 0;
  }
  /**
   * Check if a lock exists that conflicts with the requested whole-file lock.
   *
   * @param requestedLock The desired whole-file lock.
   * @returns True if a conflicting lock exists, false otherwise.
   */
  isThereAConflictWithRequestedWholeFileLock(e) {
    return e.type === "exclusive" ? !!(this.wholeFileLock.type === "exclusive" && (this.wholeFileLock.fd !== e.fd || this.wholeFileLock.pid !== e.pid) || this.wholeFileLock.type === "shared" && Array.from(this.wholeFileLock.pidFds).some(
      ([n, s]) => n !== e.pid || Array.from(s).some((i) => i !== e.fd)
    ) || this.rangeLocks.findOverlapping({
      start: 0n,
      end: MAX_ADDRESSABLE_FILE_OFFSET
    }).length > 0) : e.type === "shared" ? this.wholeFileLock.type === "exclusive" && (this.wholeFileLock.pid !== e.pid || this.wholeFileLock.fd !== e.fd) || this.rangeLocks.findOverlapping({
      start: 0n,
      end: MAX_ADDRESSABLE_FILE_OFFSET
    }).filter(
      (s) => s.type === "exclusive"
    ).length > 0 : false;
  }
};
var FileLockManagerComposite = class {
  constructor({
    nativeLockManager: e,
    wasmLockManager: r
  }) {
    this.nativeLockManager = e, this.wasmLockManager = r;
  }
  lockWholeFile(e, r) {
    if (r.type !== "unlock") {
      let n, s;
      try {
        if (n = this.nativeLockManager.lockWholeFile(e, r), !n)
          return false;
        s = this.wasmLockManager.lockWholeFile(e, r);
      } catch (i) {
        import_logger.logger.error("Unexpected error in lockWholeFile()", i);
      } finally {
        n && !s && this.nativeLockManager.lockWholeFile(e, {
          ...r,
          type: "unlock"
        });
      }
      return !!n && !!s;
    }
    try {
      this.wasmLockManager.lockWholeFile(e, r);
    } catch (n) {
      import_logger.logger.error(
        "Unexpected error unlocking whole file with in-memory lock manager",
        n
      );
    }
    try {
      this.nativeLockManager.lockWholeFile(e, r);
    } catch (n) {
      import_logger.logger.error(
        "Unexpected error unlocking whole file with native lock manager",
        n
      );
    }
    return true;
  }
  lockFileByteRange(e, r, n) {
    if (r.type !== "unlocked") {
      let s, i;
      try {
        if (s = this.nativeLockManager.lockFileByteRange(
          e,
          r,
          n
        ), !s)
          return false;
        i = this.wasmLockManager.lockFileByteRange(
          e,
          r,
          n
        );
      } catch (o) {
        import_logger.logger.error("Unexpected error in lockFileByteRange()", o);
      } finally {
        s && !i && this.nativeLockManager.lockFileByteRange(
          e,
          {
            ...r,
            type: "unlocked"
          },
          false
        );
      }
      return !!s && !!i;
    }
    try {
      this.wasmLockManager.lockFileByteRange(
        e,
        r,
        n
      );
    } catch (s) {
      import_logger.logger.error(
        "Unexpected error unlocking byte range with in-memory lock manager",
        s
      );
    }
    try {
      this.nativeLockManager.lockFileByteRange(
        e,
        r,
        n
      );
    } catch (s) {
      import_logger.logger.error(
        "Unexpected error unlocking byte range with native lock manager",
        s
      );
    }
    return true;
  }
  findFirstConflictingByteRangeLock(e, r) {
    try {
      const n = this.nativeLockManager.findFirstConflictingByteRangeLock(
        e,
        r
      );
      return n || this.wasmLockManager.findFirstConflictingByteRangeLock(
        e,
        r
      );
    } catch (n) {
      import_logger.logger.error(
        "Unexpected error in findFirstConflictingByteRangeLock()",
        n
      );
      return;
    }
  }
  releaseLocksForProcess(e) {
    try {
      this.wasmLockManager.releaseLocksForProcess(e);
    } catch (r) {
      import_logger.logger.error(
        "Unexpected error in wasmLockManager.releaseLocksForProcess()",
        r
      );
    }
    try {
      this.nativeLockManager.releaseLocksForProcess(e);
    } catch (r) {
      import_logger.logger.error(
        "Unexpected error in nativeLockManager.releaseLocksForProcess()",
        r
      );
    }
  }
  releaseLocksOnFdClose(e, r, n) {
    try {
      this.wasmLockManager.releaseLocksOnFdClose(e, r, n);
    } catch (s) {
      import_logger.logger.error(
        "Unexpected error in wasmLockManager.releaseLocksOnFdClose()",
        s
      );
    }
    try {
      this.nativeLockManager.releaseLocksOnFdClose(e, r, n);
    } catch (s) {
      import_logger.logger.error(
        "Unexpected error in nativeLockManager.releaseLocksOnFdClose()",
        s
      );
    }
  }
};
function createObjectPoolProxy(t) {
  if (t.length === 0)
    throw new Error("At least one instance is required");
  const e = [...t], r = [];
  function n() {
    const o = e.shift();
    return o !== void 0 ? Promise.resolve(o) : new Promise((a2) => {
      r.push(a2);
    });
  }
  function s(o) {
    const a2 = r.shift();
    a2 ? a2(o) : e.push(o);
  }
  function i(o) {
    return n().then((a2) => {
      const c3 = (d2) => {
        const p2 = d2 == null ? void 0 : d2.finished;
        return p2 && typeof p2.then == "function" ? Promise.resolve(p2).then(
          () => s(a2),
          () => s(a2)
        ) : s(a2), d2;
      };
      let l;
      try {
        l = o(a2);
      } catch (d2) {
        throw s(a2), d2;
      }
      return l != null && typeof l.then == "function" ? l.then(
        (d2) => c3(d2),
        (d2) => {
          throw s(a2), d2;
        }
      ) : c3(l);
    });
  }
  return new Proxy({}, {
    get(o, a2) {
      if (a2 in o)
        return o[a2];
      if (a2 !== "then")
        return new Proxy(function() {
        }, {
          apply(c3, l, d2) {
            return i((p2) => p2[a2](...d2));
          },
          get(c3, l) {
            if (l === "then")
              return (d2, p2) => i((h3) => h3[a2]).then(
                d2,
                p2
              );
          }
        });
    }
  });
}
var maxValueForSigned32BitInteger = 2 ** 31 - 1;
var ProcessIdAllocator = class {
  constructor(e = 1, r = maxValueForSigned32BitInteger) {
    this.claimed = /* @__PURE__ */ new Set(), this.initialId = e, this.maxId = r, this.nextId = e;
  }
  claim() {
    const e = this.maxId - this.initialId + 1;
    for (let r = 0; r < e; r++)
      if (this.claimed.has(this.nextId))
        this.nextId++, this.nextId > this.maxId && (this.nextId = this.initialId);
      else
        return this.claimed.add(this.nextId), this.nextId;
    throw new Error(
      `Unable to find free process ID after ${e} tries.`
    );
  }
  release(e) {
    return this.claimed.has(e) ? (this.claimed.delete(e), true) : false;
  }
};

// ../wordpress-preview-2026-10-22/runtime/tooling/node_modules/@php-wasm/node/index.js
var dns = __toESM(require("dns"), 1);
var http = __toESM(require("http"), 1);
var net = __toESM(require("net"), 1);

// ../wordpress-preview-2026-10-22/runtime/tooling/node_modules/ws/wrapper.mjs
var import_stream = __toESM(require_stream(), 1);
var import_extension = __toESM(require_extension(), 1);
var import_permessage_deflate = __toESM(require_permessage_deflate(), 1);
var import_receiver = __toESM(require_receiver(), 1);
var import_sender = __toESM(require_sender(), 1);
var import_subprotocol = __toESM(require_subprotocol(), 1);
var import_websocket = __toESM(require_websocket(), 1);
var import_websocket_server = __toESM(require_websocket_server(), 1);

// ../wordpress-preview-2026-10-22/runtime/tooling/node_modules/@php-wasm/node/index.js
var import_logger2 = __toESM(require_logger(), 1);
var import_net = require("net");
var import_promises = require("dns/promises");
var import_fs = __toESM(require("fs"), 1);
var import_logger3 = __toESM(require_logger(), 1);
var import_node_fs = require("node:fs");
var import_node_os = require("node:os");
var import_node_module = require("node:module");
var import_logger4 = __toESM(require_logger(), 1);
var import_logger5 = __toESM(require_logger(), 1);

// ../wordpress-preview-2026-10-22/runtime/tooling/node_modules/@php-wasm/cli-util/index.js
var w2 = __toESM(require("./vendor/jsonc-parser/lib/umd/main.js"), 1);
var A3 = "PHPWASMCLI";
var E3 = {
  ignoreAttributes: false,
  attributeNamePrefix: "",
  preserveOrder: true,
  cdataPropName: "__cdata",
  commentPropName: "__xmlComment",
  allowBooleanAttributes: true,
  trimValues: true
};
var b2 = {
  ignoreAttributes: E3.ignoreAttributes,
  attributeNamePrefix: E3.attributeNamePrefix,
  preserveOrder: E3.preserveOrder,
  cdataPropName: E3.cdataPropName,
  commentPropName: E3.commentPropName,
  suppressBooleanAttributes: !E3.allowBooleanAttributes,
  format: true,
  indentBy: "	"
};

// ../wordpress-preview-2026-10-22/runtime/tooling/node_modules/@php-wasm/node/index.js
var import_fs2 = __toESM(require("fs"), 1);
var import_path = __toESM(require("path"), 1);
var import_promises2 = require("fs/promises");
var import_path2 = __toESM(require("path"), 1);
var import_url = require("url");

// ../wordpress-preview-2026-10-22/runtime/tooling/node_modules/wasm-feature-detect/dist/esm/index.js
var jspi = () => (async () => "Suspending" in WebAssembly)();

// ../wordpress-preview-2026-10-22/runtime/tooling/node_modules/@php-wasm/node/index.js
var import_fs3 = require("fs");
var import_path3 = require("path");
var import_meta = {};
async function getPHPLoaderModule(version = LatestSupportedPHPVersion) {
  if (isPHPNextVersion(version)) {
    throw new Error(
      "PHP next is only available in the web runtime for now."
    );
  }
  try {
    switch (version) {
      case "8.5":
        return (await import("./vendor/unsupported.cjs")).getPHPLoaderModule();
      case "8.4":
        return (await import("./vendor/unsupported.cjs")).getPHPLoaderModule();
      case "8.3":
        return (await import("./vendor/php-8-3/index.js")).getPHPLoaderModule();
      case "8.2":
        return (await import("./vendor/unsupported.cjs")).getPHPLoaderModule();
      case "8.1":
        return (await import("./vendor/unsupported.cjs")).getPHPLoaderModule();
      case "8.0":
        return (await import("./vendor/unsupported.cjs")).getPHPLoaderModule();
      case "7.4":
        return (await import("./vendor/unsupported.cjs")).getPHPLoaderModule();
      case "5.2":
        return (await import("./vendor/unsupported.cjs")).getPHPLoaderModule();
    }
    throw new Error(`Unsupported PHP version ${version}`);
  } catch (errorCandidate) {
    if (!errorCandidate || typeof errorCandidate !== "object") {
      throw errorCandidate;
    }
    const error = errorCandidate;
    if (error.message?.includes(
      `SyntaxError: Cannot use 'import.meta' outside a module`
    )) {
      throw new Error(
        `Node.js crashed on a 'import.meta' statement. This happens when running in a node:vm context. Some testing libraries like Jest use heavily customized runtime contexts, involving node:vm, jest-runtime, and custom require() implementations. These contexts do not support 'import.meta' statements and, by extension, cannot run the @php-wasm/node package. Consider using the --experimental-vm-modules flag or switching to a different test runner such as vitest.`,
        {
          cause: error
        }
      );
    } else if (error?.code === `ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING` || error?.code === `ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING_FLAG` || error?.message?.includes(
      `A dynamic import callback was invoked without --experimental-vm-modules`
    ) || error?.message?.includes(
      `A dynamic import callback was not specified`
    ) || error?.message?.includes(`Must use import to load ES Module`)) {
      throw new Error(
        `Node.js crashed on a 'import()' statement. This happens when running in a node:vm context. Some testing libraries like Jest use runtime contexts, involving node:vm, jest-runtime, or other custom require() implementations. These contexts do not support import() statements and, by extension, cannot run the @php-wasm/node package. Consider using the --experimental-vm-modules flag or switching to a different test runner such as vitest.`,
        {
          cause: error
        }
      );
    }
    throw error;
  }
}
function debugLog(message, ...args) {
  if (process.env["DEV"] && !process.env["TEST"]) {
    import_logger2.logger.log(message, ...args);
  }
}
function getServerPort(server) {
  const address = server.address();
  if (address === null || typeof address === "string") {
    throw new Error("Server address is not available");
  }
  return address.port;
}
function log(...args) {
  debugLog("[WS Server]", ...args);
}
function lookupIPv4(hostname) {
  return new Promise((resolve, reject) => {
    dns.lookup(hostname, { family: 4 }, (err, address) => {
      if (err) {
        reject(err);
      } else {
        resolve(address);
      }
    });
  });
}
function prependByte(chunk, byte) {
  if (typeof chunk === "string") {
    chunk = String.fromCharCode(byte) + chunk;
  } else if (chunk instanceof ArrayBuffer || "byteLength" in chunk) {
    const buffer = new Uint8Array(chunk.byteLength + 1);
    buffer[0] = byte;
    buffer.set(new Uint8Array(chunk), 1);
    chunk = buffer.buffer;
  } else {
    log({ chunk });
    throw new Error("Unsupported chunk type: " + typeof chunk);
  }
  return chunk;
}
var COMMAND_CHUNK = 1;
var COMMAND_SET_SOCKETOPT = 2;
function addSocketOptionsSupportToWebSocketClass(WebSocketConstructor) {
  return class PHPWasmWebSocketConstructor extends WebSocketConstructor {
    // @ts-ignore
    send(chunk, callback) {
      return this.sendCommand(COMMAND_CHUNK, chunk, callback);
    }
    setSocketOpt(optionClass, optionName, optionValue) {
      return this.sendCommand(
        COMMAND_SET_SOCKETOPT,
        new Uint8Array([optionClass, optionName, optionValue]).buffer,
        () => void 0
      );
    }
    sendCommand(commandType, chunk, callback) {
      return WebSocketConstructor.prototype.send.call(
        this,
        prependByte(chunk, commandType),
        callback
      );
    }
  };
}
function initOutboundWebsocketProxyServer(listenPort, listenHost = "127.0.0.1") {
  log(`Binding the WebSockets server to ${listenHost}:${listenPort}...`);
  const webServer = http.createServer((request, response) => {
    response.writeHead(403, { "Content-Type": "text/plain" });
    response.write(
      "403 Permission Denied\nOnly websockets are allowed here.\n"
    );
    response.end();
  });
  return new Promise((resolve, reject) => {
    webServer.once("error", reject);
    webServer.listen(listenPort, listenHost, function() {
      webServer.off("error", reject);
      const wsServer = new import_websocket_server.default({ server: webServer });
      wsServer.on("connection", onWsConnect);
      resolve(webServer);
    });
  });
}
async function onWsConnect(client, request) {
  const clientAddr = client?._socket?.remoteAddress || client.url;
  const clientLog = function(...args) {
    log(" " + clientAddr + ": ", ...args);
  };
  clientLog(
    "WebSocket connection from : " + clientAddr + " at URL " + (request ? request.url : client.upgradeReq.url)
  );
  clientLog(
    "Version " + client.protocolVersion + ", subprotocol: " + client.protocol
  );
  const reqUrl = new URL(`ws://0.0.0.0` + request.url);
  const reqTargetPort = Number(reqUrl.searchParams.get("port"));
  const reqTargetHost = reqUrl.searchParams.get("host");
  if (!reqTargetPort || !reqTargetHost) {
    clientLog("Missing host or port information");
    client.close(3e3);
    return;
  }
  if (reqTargetPort < 0 || reqTargetPort > 65535) {
    clientLog("Invalid port number: " + reqTargetPort);
    client.send([]);
    client.close(3e3);
    return;
  }
  let target;
  const recvQueue = [];
  function flushMessagesQueue() {
    while (recvQueue.length > 0) {
      const msg = recvQueue.pop();
      const commandType = msg[0];
      clientLog("flushing", { commandType }, msg);
      if (commandType === COMMAND_CHUNK) {
        target.write(msg.slice(1));
      } else if (commandType === COMMAND_SET_SOCKETOPT) {
        const SOL_SOCKET = 1;
        const SO_KEEPALIVE = 9;
        const IPPROTO_TCP = 6;
        const TCP_NODELAY = 1;
        if (msg[1] === SOL_SOCKET && msg[2] === SO_KEEPALIVE) {
          target.setKeepAlive(msg[3]);
        } else if (msg[1] === IPPROTO_TCP && msg[2] === TCP_NODELAY) {
          target.setNoDelay(msg[3]);
        }
      } else {
        clientLog("Unknown command type: " + commandType);
        process.exit();
      }
    }
  }
  client.on("message", function(msg) {
    recvQueue.unshift(msg);
    if (target) {
      flushMessagesQueue();
    }
  });
  client.on("close", function(code, reason) {
    clientLog(
      "WebSocket client disconnected: " + code + " [" + reason + "]"
    );
    if (target) {
      target.end();
    }
  });
  client.on("error", function(a2) {
    clientLog("WebSocket client error: " + a2);
    target.end();
  });
  let reqTargetIp;
  if (net.isIP(reqTargetHost) === 0) {
    clientLog("resolving " + reqTargetHost + "... ");
    try {
      reqTargetIp = await lookupIPv4(reqTargetHost);
      clientLog("resolved " + reqTargetHost + " -> " + reqTargetIp);
    } catch (e) {
      clientLog("can't resolve " + reqTargetHost + " due to:", e);
      client.send([]);
      setTimeout(() => {
        client.close(3e3);
      });
      return;
    }
  } else {
    reqTargetIp = reqTargetHost;
  }
  clientLog(
    "Opening a socket connection to " + reqTargetIp + ":" + reqTargetPort
  );
  target = net.createConnection(reqTargetPort, reqTargetIp, function() {
    clientLog("Connected to target");
    flushMessagesQueue();
  });
  target.on("data", function(data2) {
    try {
      client.send(data2);
    } catch {
      clientLog("Client closed, cleaning up target");
      target.end();
    }
  });
  target.on("end", function() {
    clientLog("target disconnected");
    client.close();
  });
  target.on("error", function(e) {
    clientLog("target connection error", e);
    client.send([]);
    setTimeout(() => {
      client.close(3e3);
      try {
        target.end();
      } catch {
      }
    });
  });
}
function log2(...args) {
  debugLog("[TCP Server]", ...args);
}
function addTCPServerToWebSocketServerClass(WSServer) {
  return class PHPWasmWebSocketServer extends WSServer {
    constructor(options, callback) {
      const requestedPort = options.port;
      options.port = 0;
      super(options, void 0);
      this.once("listening", () => {
        this.tcpToWsProxyServer = listenTCPToWSProxy(
          {
            tcpListenPort: requestedPort,
            wsConnectPort: getServerPort(this)
          },
          () => callback?.call(this)
        );
      });
    }
    close(callback) {
      const tcpToWsProxyServer = this.tcpToWsProxyServer;
      this.tcpToWsProxyServer = void 0;
      tcpToWsProxyServer?.close(
        (error) => {
          if (error?.code !== "ERR_SERVER_NOT_RUNNING") {
            log2("TCP server close error", error);
          }
        }
      );
      return super.close(callback);
    }
  };
}
function listenTCPToWSProxy(options, onListening) {
  options = {
    wsConnectHost: "127.0.0.1",
    ...options
  };
  const { tcpListenPort, wsConnectHost, wsConnectPort } = options;
  const server = (0, import_net.createServer)();
  server.on("connection", function handleConnection(tcpSource) {
    const inBuffer = [];
    const wsTarget = new import_websocket.default(
      `ws://${wsConnectHost}:${wsConnectPort}/`
    );
    wsTarget.binaryType = "arraybuffer";
    function wsSend(data2) {
      wsTarget.send(new Uint8Array(data2));
    }
    wsTarget.addEventListener("open", function() {
      log2("Outbound WebSocket connection established");
      while (inBuffer.length > 0) {
        wsSend(inBuffer.shift());
      }
    });
    wsTarget.addEventListener("message", (e) => {
      log2(
        "WS->TCP message:",
        new TextDecoder().decode(e.data)
      );
      tcpSource.write(Buffer.from(e.data));
    });
    wsTarget.addEventListener("close", () => {
      log2("WebSocket connection closed");
      tcpSource.end();
    });
    tcpSource.on("data", function(data2) {
      log2("TCP->WS message:", data2);
      if (wsTarget.readyState === import_websocket.default.OPEN) {
        while (inBuffer.length > 0) {
          wsSend(inBuffer.shift());
        }
        wsSend(data2);
      } else {
        inBuffer.push(data2);
      }
    });
    tcpSource.once("close", function() {
      log2("TCP connection closed");
      wsTarget.close();
    });
    tcpSource.on("error", function() {
      log2("TCP connection error");
      wsTarget.close();
    });
  });
  server.listen(tcpListenPort, function() {
    log2("TCP server listening");
    onListening?.();
  });
  return server;
}
async function withNetworking(phpModuleArgs = {}) {
  const outboundNetworkProxyServer = await initOutboundWebsocketProxyServer(0);
  const outboundProxyWsServerPort = getServerPort(outboundNetworkProxyServer);
  return {
    ...phpModuleArgs,
    outboundNetworkProxyServer,
    websocket: {
      ...phpModuleArgs["websocket"] || {},
      url: (_4, host, port) => {
        const query = new URLSearchParams({
          host,
          port
        }).toString();
        return `ws://127.0.0.1:${outboundProxyWsServerPort}/?${query}`;
      },
      subprotocol: "binary",
      decorator: addSocketOptionsSupportToWebSocketClass,
      serverDecorator: addTCPServerToWebSocketServerClass
    }
  };
}
function bindUserSpace({ fileLockManager }, {
  pid,
  memory,
  constants: {
    F_RDLCK,
    F_WRLCK,
    F_UNLCK,
    F_GETFL,
    O_ACCMODE,
    O_RDONLY,
    O_WRONLY,
    O_APPEND,
    O_NONBLOCK,
    F_SETFL,
    F_GETLK,
    F_SETLK,
    F_SETLKW,
    SEEK_SET,
    SEEK_CUR,
    SEEK_END,
    LOCK_SH,
    LOCK_EX,
    LOCK_NB,
    LOCK_UN
  },
  errnoCodes: { EBADF, EINVAL, EAGAIN, EWOULDBLOCK },
  wasmImports: { builtin_fcntl64, builtin_fd_close, js_wasm_trace },
  wasmExports: { wasm_get_end_offset },
  syscalls: { getStreamFromFD },
  FS,
  PROXYFS,
  NODEFS
}) {
  class VarArgsAccessor {
    constructor(argsAddr) {
      this.argsAddr = argsAddr;
    }
    getNextAsPointer() {
      return this.getNextAsInt();
    }
    getNextAsInt() {
      const fourByteOffset = this.argsAddr >> 2;
      const value = memory.HEAP32.get(fourByteOffset);
      this.argsAddr += 4;
      return value;
    }
  }
  const locking = {
    /*
     * Possibly locked file descriptors and their last known native paths.
     * The path must be captured when the lock succeeds because close-time
     * cleanup may run after the file is unlinked.
     *
     * WARNING: This fixes cleanup when a known path disappears before
     * close, but it does not make path-keyed lock bookkeeping rename-safe.
     * If a locked file is renamed, later lock operations may address the
     * same underlying file through a different path than the one stored
     * here. Correctly handling that requires stable file identity tracking,
     * such as device/inode keys or rename-aware lock manager updates.
     */
    maybeLockedFdPaths: /* @__PURE__ */ new Map(),
    lockStateToFcntl: {
      shared: F_RDLCK,
      exclusive: F_WRLCK,
      unlocked: F_UNLCK
    },
    fcntlToLockState: {
      [F_RDLCK]: "shared",
      [F_WRLCK]: "exclusive",
      [F_UNLCK]: "unlocked"
    },
    is_path_to_shared_fs(path32) {
      const { node } = FS.lookupPath(path32, { noent_okay: true });
      if (!node) {
        return false;
      }
      if (node.mount.type !== PROXYFS) {
        return !!node.isSharedFS;
      }
      const nodePath = PROXYFS.realPath(node);
      const backingFs = node?.mount?.opts?.["fs"];
      if (backingFs) {
        const { node: backingNode } = backingFs.lookupPath(nodePath, {
          noent_okay: true
        });
        return !!backingNode?.isSharedFS;
      }
      return false;
    },
    get_fd_access_mode(fd) {
      return builtin_fcntl64(fd, F_GETFL) & O_ACCMODE;
    },
    get_vfs_path_from_fd(fd) {
      try {
        return [FS.readlink(`/proc/self/fd/${fd}`), 0];
      } catch {
        return [null, EBADF];
      }
    },
    get_native_path_from_vfs_path(vfsPath) {
      const { node } = FS.lookupPath(vfsPath, {
        noent_okay: true
      });
      if (!node) {
        throw new Error(`No node found for VFS path ${vfsPath}`);
      }
      if (node.mount.type === NODEFS) {
        return NODEFS.realPath(node);
      } else if (node.mount.type === PROXYFS) {
        const { node: backingNode, path: backingPath } = node.mount.opts["fs"].lookupPath(vfsPath);
        js_wasm_trace(
          "backingNode for %s: %s",
          vfsPath,
          backingPath,
          backingNode
        );
        return backingNode.mount.type.realPath(backingNode);
      } else {
        throw new Error(
          `Unsupported filesystem type for path ${vfsPath}`
        );
      }
    },
    get_native_fd_from_emscripten_fd(fd) {
      try {
        const stream = getStreamFromFD(fd);
        if (stream.nfd === void 0) {
          return [null, EBADF];
        }
        return [stream.nfd, 0];
      } catch {
        return [null, EBADF];
      }
    },
    check_lock_params(fd, l_type) {
      const accessMode = locking.get_fd_access_mode(fd);
      if (l_type === F_WRLCK && accessMode === O_RDONLY || l_type === F_RDLCK && accessMode === O_WRONLY) {
        js_wasm_trace(
          "check_lock_params(%d, %d, %d) EBADF",
          fd,
          l_type,
          accessMode
        );
        return EBADF;
      }
      return 0;
    }
  };
  const emscripten_flock_l_type_offset = 0;
  const emscripten_flock_l_whence_offset = 2;
  const emscripten_flock_l_start_offset = 8;
  const emscripten_flock_l_len_offset = 16;
  const emscripten_flock_l_pid_offset = 24;
  function readFlockStruct(flockStructAddress) {
    return {
      l_type: memory.HEAP16.get(
        // Shift right by 1 to divide by 2^1.
        flockStructAddress + emscripten_flock_l_type_offset >> 1
      ),
      l_whence: memory.HEAP16.get(
        // Shift right by 1 to divide by 2^1.
        flockStructAddress + emscripten_flock_l_whence_offset >> 1
      ),
      l_start: memory.HEAP64.get(
        // Shift right by 3 to divide by 2^3.
        flockStructAddress + emscripten_flock_l_start_offset >> 3
      ),
      l_len: memory.HEAP64.get(
        // Shift right by 3 to divide by 2^3.
        flockStructAddress + emscripten_flock_l_len_offset >> 3
      ),
      l_pid: memory.HEAP32.get(
        // Shift right by 2 to divide by 2^2.
        flockStructAddress + emscripten_flock_l_pid_offset >> 2
      )
    };
  }
  function updateFlockStruct(flockStructAddress, fields) {
    if (fields.l_type !== void 0) {
      memory.HEAP16.set(
        // Shift right by 1 to divide by 2^1.
        flockStructAddress + emscripten_flock_l_type_offset >> 1,
        fields.l_type
      );
    }
    if (fields.l_whence !== void 0) {
      memory.HEAP16.set(
        // Shift right by 1 to divide by 2^1.
        flockStructAddress + emscripten_flock_l_whence_offset >> 1,
        fields.l_whence
      );
    }
    if (fields.l_start !== void 0) {
      memory.HEAP64.set(
        // Shift right by 3 to divide by 2^3.
        flockStructAddress + emscripten_flock_l_start_offset >> 3,
        fields.l_start
      );
    }
    if (fields.l_len !== void 0) {
      memory.HEAP64.set(
        // Shift right by 3 to divide by 2^3.
        flockStructAddress + emscripten_flock_l_len_offset >> 3,
        fields.l_len
      );
    }
    if (fields.l_pid !== void 0) {
      memory.HEAP32.set(
        // Shift right by 2 to divide by 2^2.
        flockStructAddress + emscripten_flock_l_pid_offset >> 2,
        fields.l_pid
      );
    }
  }
  function getBaseAddress(fd, whence, startOffset) {
    let baseAddress;
    switch (whence) {
      case SEEK_SET:
        baseAddress = 0n;
        break;
      case SEEK_CUR:
        try {
          const stream = getStreamFromFD(fd);
          baseAddress = FS.llseek(stream, 0, whence);
        } catch (e) {
          js_wasm_trace(
            "get_base_address(%d, %d, %d) getStreamFromFD error %s",
            fd,
            whence,
            startOffset,
            e
          );
          return [null, EINVAL];
        }
        break;
      case SEEK_END:
        baseAddress = wasm_get_end_offset(fd);
        break;
      default:
        return [null, EINVAL];
    }
    if (baseAddress == -1) {
      return [null, EBADF];
    }
    const resolvedOffset = baseAddress + startOffset;
    if (resolvedOffset < 0) {
      return [null, EINVAL];
    }
    return [resolvedOffset, 0];
  }
  function fcntl64(fd, cmd, varargs) {
    js_wasm_trace("fcntl64(%d, %d)", fd, cmd);
    if (!fileLockManager) {
      js_wasm_trace(
        "fcntl64(%d, %d) file lock manager is not available. delegate to Emscripten builtin fcntl64.",
        fd,
        cmd
      );
      return builtin_fcntl64(fd, cmd, varargs);
    }
    switch (cmd) {
      case F_GETLK: {
        const reportUnlockedFileByDefault = function reportUnlockedFileByDefault2() {
          updateFlockStruct(flockStructAddr, {
            l_type: F_UNLCK
          });
          return 0;
        };
        js_wasm_trace("fcntl(%d, F_GETLK)", fd);
        const [vfsPath, vfsPathErrno] = locking.get_vfs_path_from_fd(fd);
        if (vfsPathErrno !== 0) {
          js_wasm_trace(
            "fcntl(%d, F_GETLK) %s get_vfs_path_from_fd errno %d",
            fd,
            vfsPath,
            vfsPathErrno
          );
          return -EBADF;
        }
        const varArgsAccessor = new VarArgsAccessor(varargs);
        const flockStructAddr = varArgsAccessor.getNextAsPointer();
        if (!locking.is_path_to_shared_fs(vfsPath) || fileLockManager === void 0) {
          js_wasm_trace(
            "fcntl(%d, F_GETLK) locking is not implemented for non-NodeFS path '%s'",
            fd,
            vfsPath
          );
          return reportUnlockedFileByDefault();
        }
        const flockStruct = readFlockStruct(flockStructAddr);
        if (!(flockStruct.l_type in locking.fcntlToLockState)) {
          return -EINVAL;
        }
        const paramsCheckErrno = locking.check_lock_params(
          fd,
          flockStruct.l_type
        );
        if (paramsCheckErrno !== 0) {
          js_wasm_trace(
            "fcntl(%d, F_GETLK) %s check_lock_params errno %d",
            fd,
            vfsPath,
            paramsCheckErrno
          );
          return -EINVAL;
        }
        const requestedLockType = locking.fcntlToLockState[flockStruct.l_type];
        const [absoluteStartOffset, baseAddressErrno] = getBaseAddress(
          fd,
          flockStruct.l_whence,
          flockStruct.l_start
        );
        if (baseAddressErrno !== 0) {
          js_wasm_trace(
            "fcntl(%d, F_GETLK) %s get_base_address errno %d",
            fd,
            vfsPath,
            baseAddressErrno
          );
          return -EINVAL;
        }
        const [nativeFd, nativeFdErrno] = locking.get_native_fd_from_emscripten_fd(fd);
        if (nativeFdErrno !== 0) {
          js_wasm_trace(
            "fcntl(%d, F_GETLK) get_native_fd_from_emscripten_fd errno %d",
            fd,
            nativeFdErrno
          );
          return -nativeFdErrno;
        }
        try {
          const nativeFilePath = locking.get_native_path_from_vfs_path(vfsPath);
          const conflictingLock = fileLockManager.findFirstConflictingByteRangeLock(
            nativeFilePath,
            {
              type: requestedLockType,
              start: absoluteStartOffset,
              end: absoluteStartOffset + flockStruct.l_len,
              pid,
              fd: nativeFd
            }
          );
          if (conflictingLock === void 0) {
            js_wasm_trace(
              "fcntl(%d, F_GETLK) %s findFirstConflictingByteRangeLock type=unlocked start=0x%x end=0x%x",
              fd,
              vfsPath,
              absoluteStartOffset,
              absoluteStartOffset + flockStruct.l_len
            );
            updateFlockStruct(flockStructAddr, {
              l_type: F_UNLCK
            });
            return 0;
          }
          js_wasm_trace(
            "fcntl(%d, F_GETLK) %s findFirstConflictingByteRangeLock type=%s start=0x%x end=0x%x conflictingLock %d",
            fd,
            vfsPath,
            conflictingLock.type,
            conflictingLock.start,
            conflictingLock.end,
            conflictingLock.pid
          );
          const fcntlLockState = locking.lockStateToFcntl[conflictingLock.type];
          updateFlockStruct(flockStructAddr, {
            l_type: fcntlLockState,
            l_whence: SEEK_SET,
            l_start: conflictingLock.start,
            l_len: BigInt(
              conflictingLock.end - conflictingLock.start
            ),
            l_pid: conflictingLock.pid
          });
          return 0;
        } catch (e) {
          js_wasm_trace(
            "fcntl(%d, F_GETLK) %s findFirstConflictingByteRangeLock error %s",
            fd,
            vfsPath,
            e
          );
          return -EINVAL;
        }
      }
      case F_SETLKW:
      case F_SETLK: {
        js_wasm_trace("fcntl(%d, F_SETLK)", fd);
        const [vfsPath, vfsPathErrno] = locking.get_vfs_path_from_fd(fd);
        if (vfsPathErrno !== 0) {
          js_wasm_trace(
            "fcntl(%d, F_SETLK) %s get_vfs_path_from_fd errno %d",
            fd,
            vfsPath,
            vfsPathErrno
          );
          return -vfsPathErrno;
        }
        if (!locking.is_path_to_shared_fs(vfsPath)) {
          js_wasm_trace(
            "fcntl(%d, F_SETLK) locking is not implemented for non-NodeFS path %s",
            fd,
            vfsPath
          );
          return 0;
        }
        const varArgsAccessor = new VarArgsAccessor(varargs);
        const flockStructAddr = varArgsAccessor.getNextAsPointer();
        const flockStruct = readFlockStruct(flockStructAddr);
        const [absoluteStartOffset, baseAddressErrno] = getBaseAddress(
          fd,
          flockStruct.l_whence,
          flockStruct.l_start
        );
        if (baseAddressErrno !== 0) {
          js_wasm_trace(
            "fcntl(%d, F_SETLK) %s get_base_address errno %d",
            fd,
            vfsPath,
            baseAddressErrno
          );
          return -EINVAL;
        }
        if (!(flockStruct.l_type in locking.fcntlToLockState)) {
          js_wasm_trace(
            "fcntl(%d, F_SETLK) %s invalid lock type %d",
            fd,
            vfsPath,
            flockStruct.l_type
          );
          return -EINVAL;
        }
        const paramsCheckErrno = locking.check_lock_params(
          fd,
          flockStruct.l_type
        );
        if (paramsCheckErrno !== 0) {
          js_wasm_trace(
            "fcntl(%d, F_SETLK) %s check_lock_params errno %d",
            fd,
            vfsPath,
            paramsCheckErrno
          );
          return -paramsCheckErrno;
        }
        const [nativeFd, nativeFdErrno] = locking.get_native_fd_from_emscripten_fd(fd);
        if (nativeFdErrno !== 0) {
          js_wasm_trace(
            "fcntl(%d, F_SETLK) get_native_fd_from_emscripten_fd errno %d",
            fd,
            nativeFdErrno
          );
          return -nativeFdErrno;
        }
        const requestedLockType = locking.fcntlToLockState[flockStruct.l_type];
        const rangeLock = {
          type: requestedLockType,
          start: absoluteStartOffset,
          end: absoluteStartOffset + flockStruct.l_len,
          pid,
          fd: nativeFd
        };
        try {
          const nativeFilePath = locking.get_native_path_from_vfs_path(vfsPath);
          js_wasm_trace(
            "fcntl(%d, F_SETLK) %s calling lockFileByteRange for range lock %s",
            fd,
            vfsPath,
            rangeLock
          );
          const waitForLock = cmd === F_SETLKW;
          const succeeded = fileLockManager.lockFileByteRange(
            nativeFilePath,
            rangeLock,
            waitForLock
          );
          if (succeeded) {
            locking.maybeLockedFdPaths.set(
              nativeFd,
              nativeFilePath
            );
          }
          js_wasm_trace(
            "fcntl(%d, F_SETLK) %s lockFileByteRange returned %d for range lock %s",
            fd,
            vfsPath,
            succeeded,
            rangeLock
          );
          return succeeded ? 0 : -EAGAIN;
        } catch (e) {
          js_wasm_trace(
            "fcntl(%d, F_SETLK) %s lockFileByteRange error %s for range lock %s",
            fd,
            vfsPath,
            e,
            rangeLock
          );
          return -EINVAL;
        }
      }
      case F_SETFL: {
        let arg = 0;
        if (varargs !== void 0) {
          const varArgsAccessor = new VarArgsAccessor(varargs);
          arg = varArgsAccessor.getNextAsInt();
        }
        const stream = getStreamFromFD(fd);
        const SETFL_MASK = O_APPEND | O_NONBLOCK;
        stream.flags = arg & SETFL_MASK | stream.flags & ~SETFL_MASK;
        return 0;
      }
      default:
        return builtin_fcntl64(fd, cmd, varargs);
    }
  }
  function flock(fd, op) {
    js_wasm_trace("flock(%d, %d)", fd, op);
    if (!fileLockManager) {
      js_wasm_trace(
        "flock(%d, %d) file lock manager is not available. succeed by default as Emscripten does.",
        fd,
        op
      );
      return 0;
    }
    const flockToLockOpType = {
      [LOCK_SH]: "shared",
      [LOCK_EX]: "exclusive",
      [LOCK_UN]: "unlock"
    };
    const [vfsPath, vfsPathErrno] = locking.get_vfs_path_from_fd(fd);
    if (vfsPathErrno !== 0) {
      js_wasm_trace(
        "flock(%d, %d) get_vfs_path_from_fd errno %d",
        fd,
        op,
        vfsPath,
        vfsPathErrno
      );
      return -vfsPathErrno;
    }
    if (!locking.is_path_to_shared_fs(vfsPath)) {
      js_wasm_trace(
        "flock(%d, %d) locking is not implemented for non-NodeFS path %s",
        fd,
        op,
        vfsPath
      );
      return 0;
    }
    const paramsCheckErrno = locking.check_lock_params(fd, op);
    if (paramsCheckErrno !== 0) {
      js_wasm_trace(
        "flock(%d, %d) %s check_lock_params errno %d",
        fd,
        op,
        vfsPath,
        paramsCheckErrno
      );
      return -paramsCheckErrno;
    }
    const maskedOp = op & (LOCK_SH | LOCK_EX | LOCK_UN);
    const waitForLock = (op & LOCK_NB) === 0;
    if (maskedOp === 0) {
      js_wasm_trace("flock(%d, %d) invalid flock() operation", fd, op);
      return -EINVAL;
    }
    const lockOpType = flockToLockOpType[maskedOp];
    if (lockOpType === void 0) {
      js_wasm_trace("flock(%d, %d) invalid flock() operation", fd, op);
      return -EINVAL;
    }
    const [nativeFd, nativeFdErrno] = locking.get_native_fd_from_emscripten_fd(fd);
    if (nativeFdErrno !== 0) {
      js_wasm_trace(
        "js_flock(%d, %d) get_native_fd_from_emscripten_fd errno %d",
        fd,
        op,
        nativeFdErrno
      );
      return -nativeFdErrno;
    }
    try {
      const nativeFilePath = locking.get_native_path_from_vfs_path(vfsPath);
      const succeeded = fileLockManager.lockWholeFile(nativeFilePath, {
        type: lockOpType,
        pid,
        fd: nativeFd,
        waitForLock
      });
      js_wasm_trace(
        "flock(%d, %d) lockWholeFile %s returned %d",
        fd,
        op,
        vfsPath,
        succeeded
      );
      if (succeeded) {
        locking.maybeLockedFdPaths.set(nativeFd, nativeFilePath);
      }
      return succeeded ? 0 : -EWOULDBLOCK;
    } catch (e) {
      js_wasm_trace("flock(%d, %d) lockWholeFile error %s", fd, op, e);
      return -EINVAL;
    }
  }
  function fd_close(fd) {
    if (!fileLockManager) {
      js_wasm_trace(
        "fd_close(%d) file lock manager is not available. delegate to Emscripten builtin fd_close.",
        fd
      );
      return builtin_fd_close(fd);
    }
    const [vfsPath, vfsPathResolutionErrno] = locking.get_vfs_path_from_fd(fd);
    const [nativeFd, nativeFdErrno] = locking.get_native_fd_from_emscripten_fd(fd);
    const nativeFilePath = nativeFdErrno === 0 ? locking.maybeLockedFdPaths.get(nativeFd) : void 0;
    const fdCloseResult = builtin_fd_close(fd);
    if (fdCloseResult !== 0) {
      js_wasm_trace(
        "fd_close(%d) %s result %d",
        fd,
        vfsPath,
        fdCloseResult
      );
      return fdCloseResult;
    }
    if (nativeFdErrno !== 0) {
      js_wasm_trace(
        "fd_close(%d) %s get_native_fd_from_emscripten_fd error %d",
        fd,
        vfsPath,
        nativeFdErrno
      );
      return fdCloseResult;
    }
    if (nativeFilePath === void 0) {
      js_wasm_trace(
        "fd_close(%d) not in maybe-locked-list %s result %d",
        fd,
        vfsPath,
        fdCloseResult
      );
      return fdCloseResult;
    }
    if (vfsPathResolutionErrno !== 0) {
      js_wasm_trace(
        "fd_close(%d) get_vfs_path_from_fd error %d",
        fd,
        vfsPathResolutionErrno
      );
    }
    try {
      js_wasm_trace("fd_close(%d) %s release locks", fd, vfsPath);
      fileLockManager.releaseLocksOnFdClose(
        pid,
        nativeFd,
        nativeFilePath
      );
      js_wasm_trace("fd_close(%d) %s release locks success", fd, vfsPath);
    } catch (e) {
      js_wasm_trace("fd_close(%d) %s error '%s'", fd, vfsPath, e);
    } finally {
      locking.maybeLockedFdPaths.delete(nativeFd);
    }
    return fdCloseResult;
  }
  function js_release_file_locks() {
    js_wasm_trace("js_release_file_locks()");
    if (pid === void 0) {
      js_wasm_trace("js_release_file_locks pid is undefined");
      return;
    }
    if (fileLockManager === void 0) {
      js_wasm_trace(
        "js_release_file_locks file lock manager is undefined"
      );
      return;
    }
    try {
      fileLockManager.releaseLocksForProcess(pid);
      locking.maybeLockedFdPaths.clear();
      js_wasm_trace("js_release_file_locks succeeded");
    } catch (e) {
      js_wasm_trace("js_release_file_locks error %s", e);
    }
  }
  async function gethostbyname(hostname) {
    const { address } = await (0, import_promises.lookup)(hostname, {
      family: 4,
      verbatim: false
    });
    return address;
  }
  return {
    fcntl64,
    flock,
    fd_close,
    js_release_file_locks,
    gethostbyname
  };
}
var require2 = (0, import_node_module.createRequire)(
  typeof __filename === "string" ? __filename : __tbv_import_meta_url
);
var binding;
function loadFsExt() {
  return binding ??= require2("fs-ext-extra-prebuilt");
}
function isLockDenialError(e) {
  if (e && typeof e === "object" && "code" in e) {
    const code = e.code;
    return code === "EWOULDBLOCK" || code === "EAGAIN" || code === "EACCES";
  }
  return false;
}
var FileLockManagerForPosix = class {
  constructor() {
    this.fsExt = loadFsExt();
    this.wholeFileLockMap = /* @__PURE__ */ new Map();
    this.rangeLockedFds = /* @__PURE__ */ new Map();
  }
  lockWholeFile(path32, op) {
    const opType = op.type === "unlock" ? "un" : op.waitForLock ? op.type === "exclusive" ? "ex" : "sh" : op.type === "exclusive" ? "exnb" : "shnb";
    try {
      this.fsExt.flockSync(op.fd, opType);
      if (op.type === "unlock") {
        this.wholeFileLockMap.get(op.pid)?.delete(op.fd);
      } else {
        if (!this.wholeFileLockMap.has(op.pid)) {
          this.wholeFileLockMap.set(op.pid, /* @__PURE__ */ new Map());
        }
        this.wholeFileLockMap.get(op.pid).set(op.fd, {
          ...op,
          path: path32
        });
      }
      return true;
    } catch (e) {
      if (!isLockDenialError(e)) {
        import_logger4.logger.warn("flock(): unexpected error", e);
      }
      return false;
    }
  }
  lockFileByteRange(path32, op, waitForLock) {
    if (op.start === op.end) {
      op = {
        ...op,
        end: MAX_ADDRESSABLE_FILE_OFFSET
      };
    }
    const fcntlCmd = waitForLock ? "setlkw" : "setlk";
    const fcntlOp = op.type === "unlocked" ? this.fsExt.constants.F_UNLCK : op.type === "exclusive" ? this.fsExt.constants.F_WRLCK : this.fsExt.constants.F_RDLCK;
    try {
      this.fsExt.fcntlSync(
        op.fd,
        fcntlCmd,
        fcntlOp,
        Number(op.start),
        Number(op.end - op.start)
      );
      if (!this.rangeLockedFds.has(op.pid)) {
        this.rangeLockedFds.set(op.pid, /* @__PURE__ */ new Map());
      }
      const pidMap = this.rangeLockedFds.get(op.pid);
      if (!pidMap.has(path32)) {
        pidMap.set(path32, /* @__PURE__ */ new Set());
      }
      pidMap.get(path32).add(op.fd);
      return true;
    } catch (e) {
      if (!isLockDenialError(e)) {
        import_logger4.logger.warn("fcntl(): unexpected error", e);
      }
      return false;
    }
  }
  findFirstConflictingByteRangeLock(path32, op) {
    if (op.type === "unlocked") {
      return void 0;
    }
    const obtainedLock = this.lockFileByteRange(path32, op, false);
    if (obtainedLock) {
      this.lockFileByteRange(path32, { ...op, type: "unlocked" }, true);
      return void 0;
    }
    return {
      type: "exclusive",
      start: 0n,
      end: 0xffffffffffffffffn,
      pid: -1
    };
  }
  releaseLocksForProcess(targetPid) {
    const fdMap = this.wholeFileLockMap.get(targetPid);
    if (fdMap) {
      for (const storedLock of fdMap.values()) {
        try {
          this.lockWholeFile(storedLock.path, {
            ...storedLock,
            type: "unlock"
          });
        } catch (e) {
          import_logger4.logger.error(
            `releaseLocksForProcess: failed to unlock whole-file lock for pid=${targetPid} fd=${storedLock.fd}`,
            e
          );
        }
      }
      this.wholeFileLockMap.delete(targetPid);
    }
    for (const [path32, fdSet] of this.rangeLockedFds.get(targetPid) ?? []) {
      for (const fd of fdSet) {
        try {
          this.lockFileByteRange(
            path32,
            {
              pid: targetPid,
              fd,
              type: "unlocked",
              start: 0n,
              end: MAX_ADDRESSABLE_FILE_OFFSET
            },
            false
          );
        } catch (e) {
          import_logger4.logger.error(
            `releaseLocksForProcess: failed to unlock byte range for pid=${targetPid} fd=${fd} path=${path32}`,
            e
          );
        }
      }
    }
    this.rangeLockedFds.delete(targetPid);
  }
  releaseLocksOnFdClose(targetPid, targetFd, targetPath) {
    this.wholeFileLockMap.get(targetPid)?.delete(targetFd);
    this.rangeLockedFds.get(targetPid)?.delete(targetPath);
  }
};
function toLowAndHigh32BitNumbers(num) {
  const low = Number(num & 0xffffffffn);
  const high = Number(num >> 32n & 0xffffffffn);
  return [low, high];
}
function isErrnoError(e) {
  return e !== null && typeof e === "object" && ("errno" in e || "code" in e || "syscall" in e);
}
function tryLockFileExSync(fd, flags, start, end) {
  const [offsetLow, offsetHigh] = toLowAndHigh32BitNumbers(start);
  const [lengthLow, lengthHigh] = toLowAndHigh32BitNumbers(end - start);
  try {
    loadFsExt().lockFileExSync(
      fd,
      flags,
      offsetLow,
      offsetHigh,
      lengthLow,
      lengthHigh
    );
    return true;
  } catch (e) {
    if (!isErrnoError(e)) {
      throw e;
    }
    return false;
  }
}
function tryUnlockFileExSync(fd, start, end) {
  const [offsetLow, offsetHigh] = toLowAndHigh32BitNumbers(start);
  const [lengthLow, lengthHigh] = toLowAndHigh32BitNumbers(end - start);
  try {
    loadFsExt().unlockFileExSync(
      fd,
      offsetLow,
      offsetHigh,
      lengthLow,
      lengthHigh
    );
    return true;
  } catch (e) {
    if (!isErrnoError(e)) {
      throw e;
    }
    return false;
  }
}
var FileLockManagerForWindows = class {
  constructor() {
    this.fsExt = loadFsExt();
    this.wholeFileLockMap = /* @__PURE__ */ new Map();
    this.rangeLockedFds = /* @__PURE__ */ new Map();
  }
  lockWholeFile(path32, op) {
    const start = 0n;
    const end = 2n ** 64n - 1n;
    if (op.type === "unlock") {
      const success2 = tryUnlockFileExSync(op.fd, start, end);
      if (success2) {
        this.wholeFileLockMap.get(op.pid)?.delete(op.fd);
        if (this.wholeFileLockMap.get(op.pid)?.size === 0) {
          this.wholeFileLockMap.delete(op.pid);
        }
      } else {
        import_logger5.logger.warn(
          `lockWholeFile: unlock failed for pid=${op.pid} fd=${op.fd} path=${path32}`
        );
      }
      return success2;
    }
    const preexistingLock = this.wholeFileLockMap.get(op.pid)?.get(op.fd);
    if (op.type === preexistingLock?.type) {
      return true;
    }
    let flags = 0;
    if (!op.waitForLock) {
      flags |= this.fsExt.constants.LOCKFILE_FAIL_IMMEDIATELY;
    }
    let success = false;
    if (op.type === "shared") {
      success = tryLockFileExSync(op.fd, flags, start, end);
      if (success && preexistingLock?.type === "exclusive") {
        const exclusiveUnlockSuccess = tryUnlockFileExSync(
          op.fd,
          start,
          end
        );
        if (!exclusiveUnlockSuccess) {
          const message = "Failed to unlock preexisting exclusive lock after failing to obtain shared lock";
          import_logger5.logger.error(message);
          throw new Error(message);
        }
      }
    } else if (op.type === "exclusive") {
      flags |= this.fsExt.constants.LOCKFILE_EXCLUSIVE_LOCK;
      let sharedUnlockSuccess;
      if (preexistingLock?.type === "shared") {
        sharedUnlockSuccess = tryUnlockFileExSync(op.fd, start, end);
        if (!sharedUnlockSuccess) {
          import_logger5.logger.warn(
            `lockWholeFile: failed to release shared lock before exclusive upgrade for pid=${op.pid} fd=${op.fd}`
          );
        }
      }
      success = tryLockFileExSync(op.fd, flags, start, end);
      if (!success) {
        import_logger5.logger.debug(
          `lockWholeFile: failed to obtain exclusive lock for pid=${op.pid} fd=${op.fd}`
        );
      }
      if (!success && sharedUnlockSuccess) {
        const sharedReLockResult = tryLockFileExSync(
          op.fd,
          // Wait to restore the shared lock.
          0,
          start,
          end
        );
        if (!sharedReLockResult) {
          const message = "Failed to re-lock preexisting shared lock after failing to obtain exclusive lock";
          import_logger5.logger.error(message);
          throw new Error(message);
        }
      }
    } else {
      throw new Error(`Unexpected wholeFileLock() op: '${op.type}'`);
    }
    if (success) {
      if (!this.wholeFileLockMap.has(op.pid)) {
        this.wholeFileLockMap.set(op.pid, /* @__PURE__ */ new Map());
      }
      this.wholeFileLockMap.get(op.pid).set(op.fd, {
        ...op,
        path: path32
      });
    }
    return success;
  }
  lockFileByteRange(path32, op, waitForLock) {
    if (op.start === op.end) {
      op = {
        ...op,
        end: MAX_ADDRESSABLE_FILE_OFFSET
      };
    }
    if (!this.rangeLockedFds.has(path32)) {
      this.rangeLockedFds.set(path32, new FileLockIntervalTree());
    }
    const lockedRangeTree = this.rangeLockedFds.get(path32);
    const overlappingLocks = lockedRangeTree.findOverlapping(op);
    let preexistingLock;
    if (overlappingLocks.length === 1 && overlappingLocks[0].pid === op.pid && // NOTE: FD shouldn't matter for fcntl() F_SETLK because it is a process-level lock,
    // but it matters for Windows where locks are fd-specific.
    overlappingLocks[0].fd === op.fd && overlappingLocks[0].start === op.start && overlappingLocks[0].end === op.end) {
      preexistingLock = overlappingLocks[0];
    }
    if (op.type === preexistingLock?.type) {
      return true;
    }
    let flags = 0;
    if (!waitForLock) {
      flags |= this.fsExt.constants.LOCKFILE_FAIL_IMMEDIATELY;
    }
    if (op.type === "shared") {
      const success = tryLockFileExSync(op.fd, flags, op.start, op.end);
      if (!success) {
        return false;
      }
      if (preexistingLock?.type === "exclusive") {
        const releasedPreexistingExclusiveLock = tryUnlockFileExSync(
          preexistingLock.fd,
          preexistingLock.start,
          preexistingLock.end
        );
        if (!releasedPreexistingExclusiveLock) {
          const message = "Failed to unlock preexisting exclusive lock after obtaining a shared lock";
          import_logger5.logger.error(message);
          throw new Error(message);
        }
        lockedRangeTree.remove(preexistingLock);
      }
      lockedRangeTree.insert(op);
      return true;
    } else if (op.type === "exclusive") {
      let sharedUnlockSuccess;
      if (preexistingLock?.type === "shared") {
        sharedUnlockSuccess = tryUnlockFileExSync(
          op.fd,
          op.start,
          op.end
        );
      }
      if (op.type === "exclusive") {
        flags |= this.fsExt.constants.LOCKFILE_EXCLUSIVE_LOCK;
      }
      const success = tryLockFileExSync(op.fd, flags, op.start, op.end);
      if (!success) {
        if (preexistingLock && sharedUnlockSuccess) {
          const sharedRelockSuccess = tryLockFileExSync(
            op.fd,
            0,
            op.start,
            op.end
          );
          if (!sharedRelockSuccess) {
            const message = "Failed to re-lock preexisting shared lock after failing to obtain exclusive lock";
            import_logger5.logger.error(message);
            throw new Error(message);
          }
        }
        return false;
      }
      lockedRangeTree.insert(op);
      return true;
    } else {
      const intersectingLocksForThisProcess = overlappingLocks.filter((lock) => lock.pid === op.pid).filter((lock) => lock.start >= op.start && lock.end <= op.end);
      for (const lock of intersectingLocksForThisProcess) {
        const success = tryUnlockFileExSync(
          lock.fd,
          lock.start,
          lock.end
        );
        if (!success) {
          import_logger5.logger.warn(
            `lockFileByteRange: unlock failed for pid=${op.pid} fd=${lock.fd} range=[${lock.start},${lock.end}]`
          );
          return false;
        }
        lockedRangeTree.remove(lock);
      }
      return true;
    }
  }
  findFirstConflictingByteRangeLock(path32, op) {
    if (op.type === "unlocked") {
      return void 0;
    }
    const obtainedLock = !!this.lockFileByteRange(path32, op, false);
    this.lockFileByteRange(path32, { ...op, type: "unlocked" }, false);
    if (obtainedLock) {
      return void 0;
    }
    return {
      type: "exclusive",
      start: 0n,
      end: 0xffffffffffffffffn,
      pid: -1
    };
  }
  releaseLocksForProcess(targetPid) {
    const fdMap = this.wholeFileLockMap.get(targetPid);
    if (fdMap) {
      for (const storedLock of fdMap.values()) {
        try {
          this.lockWholeFile(storedLock.path, {
            ...storedLock,
            type: "unlock"
          });
        } catch (e) {
          import_logger5.logger.error(
            `releaseLocksForProcess: failed to unlock whole-file lock for pid=${targetPid} fd=${storedLock.fd}`,
            e
          );
        }
      }
      this.wholeFileLockMap.delete(targetPid);
    }
    for (const [path32, lockedRangeTree] of this.rangeLockedFds.entries()) {
      const rangesLockedByTargetPid = lockedRangeTree.findLocksForProcess(targetPid);
      for (const op of rangesLockedByTargetPid) {
        try {
          this.lockFileByteRange(
            path32,
            { ...op, type: "unlocked" },
            false
          );
        } catch (e) {
          import_logger5.logger.error(
            `releaseLocksForProcess: failed to unlock byte range for pid=${targetPid} fd=${op.fd} path=${path32}`,
            e
          );
        }
        lockedRangeTree.remove(op);
      }
    }
  }
  releaseLocksOnFdClose(targetPid, targetFd, targetPath) {
    const storedLock = this.wholeFileLockMap.get(targetPid)?.get(targetFd);
    if (storedLock) {
      this.lockWholeFile(storedLock.path, {
        ...storedLock,
        type: "unlock"
      });
    }
    this.wholeFileLockMap.get(targetPid)?.delete(targetFd);
    const lockedRangeTree = this.rangeLockedFds.get(targetPath);
    for (const op of lockedRangeTree?.findLocksForProcess(targetPid) ?? []) {
      this.lockFileByteRange(
        targetPath,
        {
          ...op,
          type: "unlocked",
          // Use a dummy FD because we're releasing locks for
          // all FDs on this file (POSIX semantics), not just
          // the one being closed.
          fd: -1
        },
        false
      );
      lockedRangeTree.remove(op);
    }
  }
};
var localLocks = new FileLockManagerInMemory();
var loggedNativeLockFallback = false;
function createFileLockManager(sharedLocks) {
  try {
    const nativeLocks = (0, import_node_os.platform)() === "win32" ? new FileLockManagerForWindows() : new FileLockManagerForPosix();
    return sharedLocks ? new FileLockManagerComposite({
      nativeLockManager: nativeLocks,
      wasmLockManager: sharedLocks
    }) : nativeLocks;
  } catch (error) {
    if (!error || typeof error !== "object") {
      throw error;
    }
    const { code, message } = error;
    if (code !== "ERR_DLOPEN_FAILED" && !(code === "MODULE_NOT_FOUND" && message?.includes("fs-ext-extra-prebuilt")) && !message?.startsWith("Failed to load fs-ext native module.")) {
      throw error;
    }
    if (!loggedNativeLockFallback) {
      loggedNativeLockFallback = true;
      import_logger3.logger.debug(
        "Native file locking is unavailable. Using JavaScript locks for participating Playground runtimes only. Do not share their database or writable files with other programs or separate CLI runs.",
        error
      );
    }
  }
  const locks = sharedLocks ?? localLocks;
  const sleep = new Int32Array(new SharedArrayBuffer(4));
  const fileIds = /* @__PURE__ */ new Map();
  return {
    lockWholeFile(_path, op) {
      const fileId = getFileId(op.pid, op.fd);
      if (op.type === "unlock") {
        return locks.lockWholeFile(fileId, op);
      }
      const nonblockingOp = { ...op, waitForLock: false };
      if (locks.lockWholeFile(fileId, nonblockingOp)) {
        return true;
      }
      if (!op.waitForLock) {
        return false;
      }
      if (op.type === "exclusive") {
        locks.lockWholeFile(fileId, {
          pid: op.pid,
          fd: op.fd,
          type: "unlock"
        });
      }
      while (!locks.lockWholeFile(fileId, nonblockingOp)) {
        Atomics.wait(sleep, 0, 0, 10);
      }
      return true;
    },
    lockFileByteRange(_path, op, waitForLock) {
      const fileId = getFileId(op.pid, op.fd);
      while (!locks.lockFileByteRange(fileId, op, false)) {
        if (!waitForLock) {
          return false;
        }
        Atomics.wait(sleep, 0, 0, 10);
      }
      return true;
    },
    findFirstConflictingByteRangeLock: (_path, op) => locks.findFirstConflictingByteRangeLock(
      getFileId(op.pid, op.fd),
      op
    ),
    releaseLocksOnFdClose(pid, fd) {
      const files = fileIds.get(pid);
      const fileId = files?.get(fd);
      if (files && fileId !== void 0) {
        locks.releaseLocksOnFdClose(pid, fd, fileId);
        files.delete(fd);
        if (!files.size) {
          fileIds.delete(pid);
        }
      }
    },
    releaseLocksForProcess(pid) {
      locks.releaseLocksForProcess(pid);
      fileIds.delete(pid);
    }
  };
  function getFileId(pid, fd) {
    const { dev, ino } = (0, import_node_fs.fstatSync)(fd, { bigint: true });
    const fileId = `inode:${dev}:${ino}`;
    if (!fileIds.has(pid)) {
      fileIds.set(pid, /* @__PURE__ */ new Map());
    }
    fileIds.get(pid).set(fd, fileId);
    return fileId;
  }
}
async function getIntlExtensionModule(version = LatestSupportedPHPVersion) {
  switch (version) {
    case "8.5":
      return (await import("./vendor/unsupported.cjs")).getIntlExtensionPath();
    case "8.4":
      return (await import("./vendor/unsupported.cjs")).getIntlExtensionPath();
    case "8.3":
      return (await import("./vendor/php-8-3/index.js")).getIntlExtensionPath();
    case "8.2":
      return (await import("./vendor/unsupported.cjs")).getIntlExtensionPath();
    case "8.1":
      return (await import("./vendor/unsupported.cjs")).getIntlExtensionPath();
    case "8.0":
      return (await import("./vendor/unsupported.cjs")).getIntlExtensionPath();
    case "7.4":
      return (await import("./vendor/unsupported.cjs")).getIntlExtensionPath();
  }
  throw new Error(`Unsupported PHP version ${version}`);
}
async function getMemcachedExtensionModule(version = LatestSupportedPHPVersion) {
  switch (version) {
    case "8.5":
      return (await import("./vendor/unsupported.cjs")).getMemcachedExtensionPath();
    case "8.4":
      return (await import("./vendor/unsupported.cjs")).getMemcachedExtensionPath();
    case "8.3":
      return (await import("./vendor/php-8-3/index.js")).getMemcachedExtensionPath();
    case "8.2":
      return (await import("./vendor/unsupported.cjs")).getMemcachedExtensionPath();
    case "8.1":
      return (await import("./vendor/unsupported.cjs")).getMemcachedExtensionPath();
    case "8.0":
      return (await import("./vendor/unsupported.cjs")).getMemcachedExtensionPath();
    case "7.4":
      return (await import("./vendor/unsupported.cjs")).getMemcachedExtensionPath();
  }
  throw new Error(`Unsupported PHP version ${version}`);
}
async function getRedisExtensionModule(version = LatestSupportedPHPVersion) {
  switch (version) {
    case "8.5":
      return (await import("./vendor/unsupported.cjs")).getRedisExtensionPath();
    case "8.4":
      return (await import("./vendor/unsupported.cjs")).getRedisExtensionPath();
    case "8.3":
      return (await import("./vendor/php-8-3/index.js")).getRedisExtensionPath();
    case "8.2":
      return (await import("./vendor/unsupported.cjs")).getRedisExtensionPath();
    case "8.1":
      return (await import("./vendor/unsupported.cjs")).getRedisExtensionPath();
    case "8.0":
      return (await import("./vendor/unsupported.cjs")).getRedisExtensionPath();
    case "7.4":
      return (await import("./vendor/unsupported.cjs")).getRedisExtensionPath();
  }
  throw new Error(`Unsupported PHP version ${version}`);
}
async function getXdebugExtensionModule(version = LatestSupportedPHPVersion) {
  switch (version) {
    case "8.5":
      return (await import("./vendor/unsupported.cjs")).getXdebugExtensionPath();
    case "8.4":
      return (await import("./vendor/unsupported.cjs")).getXdebugExtensionPath();
    case "8.3":
      return (await import("./vendor/php-8-3/index.js")).getXdebugExtensionPath();
    case "8.2":
      return (await import("./vendor/unsupported.cjs")).getXdebugExtensionPath();
    case "8.1":
      return (await import("./vendor/unsupported.cjs")).getXdebugExtensionPath();
    case "8.0":
      return (await import("./vendor/unsupported.cjs")).getXdebugExtensionPath();
    case "7.4":
      return (await import("./vendor/unsupported.cjs")).getXdebugExtensionPath();
  }
  throw new Error(`Unsupported PHP version ${version}`);
}
function normalizeNodeExtensionSource(source) {
  if (source.format === "url") {
    return {
      ...source,
      url: toNodeResourceUrl(source.url)
    };
  }
  if (source.format !== "manifest") {
    return source;
  }
  if ("manifest" in source) {
    return source.baseUrl ? {
      ...source,
      baseUrl: toNodeResourceUrl(source.baseUrl)
    } : source;
  }
  return {
    ...source,
    manifestUrl: toNodeResourceUrl(source.manifestUrl)
  };
}
async function fetchNodeExtensionResource(input) {
  const url = input instanceof Request ? new URL(input.url) : input instanceof URL ? input : toNodeResourceUrl(String(input));
  if (url.protocol === "file:") {
    try {
      return new Response(await (0, import_promises2.readFile)((0, import_url.fileURLToPath)(url)));
    } catch (error) {
      return new Response(String(error), {
        status: 404,
        statusText: "Not Found"
      });
    }
  }
  return fetch(input);
}
function toNodeResourceUrl(urlOrPath) {
  if (urlOrPath instanceof URL) {
    return urlOrPath;
  }
  try {
    const url = new URL(urlOrPath);
    if (url.protocol === "http:" || url.protocol === "https:" || url.protocol === "file:") {
      return url;
    }
  } catch {
  }
  return (0, import_url.pathToFileURL)(import_path2.default.resolve(urlOrPath));
}
async function withPHPExtensions(version, asyncMode, options, extensions = []) {
  if (!extensions.length) {
    return options;
  }
  const resolvedExtensions = await Promise.all(
    extensions.map(
      (extension2) => resolveRuntimePHPExtension(version, asyncMode, extension2)
    )
  );
  return withResolvedPHPExtensions(options, resolvedExtensions);
}
async function resolveRuntimePHPExtension(version, asyncMode, extension2) {
  if (typeof extension2 === "object" && "source" in extension2) {
    if (asyncMode === "asyncify") {
      throw new Error(
        "External PHP extensions require JSPI. Asyncify is only supported for PHP.wasm bundled extensions."
      );
    }
    return await resolvePHPExtension({
      ...extension2,
      source: normalizeNodeExtensionSource(extension2.source),
      phpVersion: version,
      fetch: extension2.fetch ?? fetchNodeExtensionResource
    });
  }
  const builtIn = typeof extension2 === "string" ? { name: extension2 } : extension2;
  switch (builtIn.name) {
    case "intl": {
      const extensionPath = await getIntlExtensionModule(version);
      const soBytes = new Uint8Array(import_fs2.default.readFileSync(extensionPath));
      const dataName = "icu.dat";
      const moduleDir = typeof __dirname !== "undefined" ? __dirname : import_meta.dirname;
      const ICUData = import_fs2.default.readFileSync(
        resolveIntlDataPath(moduleDir, dataName)
      );
      return await resolvePHPExtension({
        source: {
          format: "so",
          name: "intl",
          bytes: soBytes
        },
        phpVersion: version,
        env: {
          ICU_DATA: "/internal/shared"
        },
        extraFiles: {
          files: {
            // The Intl extension looks for the hard-coded ICU data name.
            "/internal/shared/icudt74l.dat": new Uint8Array(
              ICUData
            )
          }
        }
      });
    }
    case "redis": {
      const extensionPath = await getRedisExtensionModule(version);
      return await resolvePHPExtension({
        source: {
          format: "so",
          name: "redis",
          bytes: new Uint8Array(import_fs2.default.readFileSync(extensionPath))
        },
        phpVersion: version
      });
    }
    case "memcached": {
      const extensionPath = await getMemcachedExtensionModule(version);
      return await resolvePHPExtension({
        source: {
          format: "so",
          name: "memcached",
          bytes: new Uint8Array(import_fs2.default.readFileSync(extensionPath))
        },
        phpVersion: version
      });
    }
    case "xdebug": {
      const xdebugOptions = builtIn.options ?? {};
      const filePath = await getXdebugExtensionModule(version);
      const ideKey = xdebugOptions.ideKey || A3;
      return await resolvePHPExtension({
        source: {
          format: "so",
          name: "xdebug",
          bytes: new Uint8Array(import_fs2.default.readFileSync(filePath))
        },
        phpVersion: version,
        loadWithIniDirective: "zend_extension",
        iniEntries: {
          "xdebug.mode": "debug,develop",
          "xdebug.start_with_request": "yes",
          "xdebug.idekey": `"${ideKey}"`,
          // Path mapping is only available starting from Xdebug 3.5,
          // which is used by PHP 8.5+. Previous versions ignore it.
          "xdebug.path_mapping": "yes"
        },
        extraFiles: resolveXdebugExtraFiles(version, xdebugOptions)
      });
    }
    default:
      throw new Error(
        `Unknown bundled PHP extension: ${String(builtIn.name)}.`
      );
  }
}
function resolveIntlDataPath(moduleDir, dataName) {
  const candidatePaths = [
    // Built package layout: dist/packages/php-wasm/node/shared/icu.dat.
    import_path.default.join(moduleDir, "shared", dataName),
    // Source/test layout: src/lib/extensions/intl/shared/icu.dat.
    import_path.default.join(moduleDir, "intl", "shared", dataName)
  ];
  const dataPath = candidatePaths.find(
    (candidate) => import_fs2.default.existsSync(candidate)
  );
  if (!dataPath) {
    throw new Error(
      `Could not find ${dataName}. Checked: ${candidatePaths.join(", ")}`
    );
  }
  return dataPath;
}
function resolveXdebugExtraFiles(version, xdebugOptions) {
  const isPHP85orHigher = SupportedPHPVersions.indexOf(version) <= SupportedPHPVersions.indexOf("8.5");
  if (!isPHP85orHigher) {
    return void 0;
  }
  const { pathMappings, pathSkippings } = xdebugOptions;
  if (!pathMappings && !pathSkippings) {
    return void 0;
  }
  const files = {};
  if (pathMappings) {
    files["/.xdebug/path.map"] = pathMappings.map((map) => `${map.vfsPath} = ${map.hostPath}`).join("\n");
  }
  if (pathSkippings) {
    files["/.xdebug/skip.map"] = pathSkippings.map((path32) => `${path32} = SKIP`).join("\n");
  }
  return { files };
}
var dangerousDefaultProcessIdAllocator = process.env.VITEST ? new ProcessIdAllocator() : void 0;
async function loadNodeRuntime(phpVersion, options = {}) {
  const processId = options.emscriptenOptions?.processId ?? // !! Only assign a default process ID during test.
  // Otherwise, multiple workers with duplicate process IDs
  // could break file locking and lead to database corruption.
  (process.env.VITEST ? dangerousDefaultProcessIdAllocator.claim() : void 0);
  const isLegacy = isLegacyPHPVersion(phpVersion);
  const phpWasmAsyncMode = await jspi() ? "jspi" : "asyncify";
  const requestedExtensions = [...options.extensions ?? []];
  if (options.withIntl && !hasBuiltInExtension(requestedExtensions, "intl")) {
    requestedExtensions.push("intl");
  }
  if (options.withRedis && !hasBuiltInExtension(requestedExtensions, "redis")) {
    requestedExtensions.push("redis");
  }
  if (options.withMemcached && !hasBuiltInExtension(requestedExtensions, "memcached")) {
    requestedExtensions.push("memcached");
  }
  if (options.withXdebug && !hasBuiltInExtension(requestedExtensions, "xdebug")) {
    requestedExtensions.push(
      typeof options.withXdebug === "object" ? { name: "xdebug", options: options.withXdebug } : "xdebug"
    );
  }
  let emscriptenOptions = {
    /**
     * Emscripten default behavior is to kill the process when
     * the WASM program calls `exit()`. We want to throw an
     * exception instead.
     */
    quit: function(code, error) {
      throw error;
    },
    bindUserSpace: (userSpaceContext) => {
      const fileLockManager = createFileLockManager(
        options.fileLockManager
      );
      return bindUserSpace({ fileLockManager }, userSpaceContext);
    },
    ...options.emscriptenOptions || {},
    phpWasmAsyncMode,
    processId,
    // For legacy PHP: pre-create php.ini via a preRun step. See
    // createLegacyPhpIniPreRunStep for why this must run before
    // the PHP SAPI starts. Merge with any caller-provided preRun
    // hooks (the spread above may have set them).
    ...isLegacy ? {
      preRun: [
        createLegacyPhpIniPreRunStep(),
        ...options.emscriptenOptions?.preRun ?? []
      ]
    } : {},
    onRuntimeInitialized: (phpRuntime) => {
      const nodeFs = phpRuntime.FS.filesystems.NODEFS;
      const originalNodeFsReaddir = nodeFs.node_ops.readdir;
      nodeFs.node_ops.readdir = (node) => {
        const entries = originalNodeFsReaddir.call(
          nodeFs.node_ops,
          node
        );
        return entries.includes(".") ? entries : [".", "..", ...entries];
      };
      if (options?.followSymlinks === true) {
        phpRuntime.FS.filesystems.NODEFS.node_ops.readlink = (node) => {
          const absoluteSourcePath = phpRuntime.FS.filesystems.NODEFS.tryFSOperation(
            () => import_fs.default.realpathSync(
              phpRuntime.FS.filesystems.NODEFS.realPath(node)
            )
          );
          const normalizedPath = H(absoluteSourcePath);
          const symlinkMountPath = m(
            `/internal/symlinks`,
            normalizedPath
          );
          if (import_fs.default.existsSync(absoluteSourcePath)) {
            const sourceStat = import_fs.default.statSync(absoluteSourcePath);
            if (!FSHelpers.fileExists(
              phpRuntime.FS,
              symlinkMountPath
            )) {
              if (sourceStat.isDirectory()) {
                phpRuntime.FS.mkdirTree(symlinkMountPath);
              } else if (sourceStat.isFile()) {
                phpRuntime.FS.mkdirTree(
                  W(symlinkMountPath)
                );
                phpRuntime.FS.writeFile(symlinkMountPath, "");
              } else {
                throw new Error(
                  "Unsupported file type. PHP-wasm supports only symlinks that link to files, directories, or symlinks."
                );
              }
            }
            const mountPath = sourceStat.isFile() ? W(symlinkMountPath) : symlinkMountPath;
            const mountRoot = sourceStat.isFile() ? W(normalizedPath) : absoluteSourcePath;
            const mountNode = phpRuntime.FS.lookupPath(mountPath).node;
            const isMounted = mountNode.mount.mountpoint === mountPath;
            if (!isMounted) {
              phpRuntime.FS.mount(
                phpRuntime.FS.filesystems.NODEFS,
                { root: mountRoot },
                mountPath
              );
            }
          }
          return symlinkMountPath;
        };
      }
      phpRuntime.FS.root.node_ops = {
        ...phpRuntime.FS.root.node_ops,
        statfs: phpRuntime.FS.filesystems.NODEFS.node_ops.statfs
      };
      phpRuntime.FS.root.mount.opts.root = ".";
    }
  };
  if (isLegacy && requestedExtensions.length) {
    throw new Error(
      `Extensions (xdebug, intl, redis, memcached) are not available for legacy PHP ${phpVersion}.`
    );
  }
  if (!isLegacy) {
    const modernVersion = phpVersion;
    emscriptenOptions = await withPHPExtensions(
      modernVersion,
      phpWasmAsyncMode,
      emscriptenOptions,
      requestedExtensions
    );
  }
  emscriptenOptions = await withNetworking(emscriptenOptions);
  const phpLoaderModule = await getPHPLoaderModule(phpVersion);
  const runtimeId = await loadPHPRuntime(phpLoaderModule, emscriptenOptions);
  return runtimeId;
}
function hasBuiltInExtension(extensions, name) {
  return extensions.some((extension2) => {
    if (typeof extension2 === "string") {
      return extension2 === name;
    }
    return !("source" in extension2) && extension2.name === name;
  });
}
function createNodeFsMountHandler(localPath) {
  return function(php, FS, vfsMountPoint) {
    let removeVfsNode = false;
    let mountRoot;
    try {
      mountRoot = (0, import_fs3.realpathSync)(localPath);
    } catch (e) {
      throw markMissingMountSource(e, localPath);
    }
    if (!FSHelpers.fileExists(FS, vfsMountPoint)) {
      let stat;
      try {
        stat = (0, import_fs3.statSync)(mountRoot);
      } catch (e) {
        throw markMissingMountSource(e, localPath);
      }
      if (stat.isFile()) {
        FS.mkdirTree((0, import_path3.dirname)(vfsMountPoint));
        FS.writeFile(vfsMountPoint, "");
      } else if (stat.isDirectory()) {
        FS.mkdirTree(vfsMountPoint);
      } else {
        throw new Error(
          "Unsupported file type. PHP-wasm supports mounting only files and directories, including symlinks that resolve to files or directories."
        );
      }
      removeVfsNode = true;
    }
    let lookup3;
    try {
      lookup3 = FS.lookupPath(vfsMountPoint);
    } catch (e) {
      const error = e;
      if (error.errno === 44) {
        throw new Error(
          `Unable to access the mount point ${vfsMountPoint} in VFS after attempting to create it.`
        );
      }
      throw e;
    }
    FS.mount(FS.filesystems["NODEFS"], { root: mountRoot }, vfsMountPoint);
    return () => {
      FS.unmount(vfsMountPoint);
      if (removeVfsNode) {
        if (FS.isDir(lookup3.node.mode)) {
          if (P(vfsMountPoint, FS.cwd())) {
            throw new Error(
              `Cannot remove the VFS directory "${vfsMountPoint}" on umount cleanup \u2013 it is a parent of the CWD "${FS.cwd()}". Change CWD before unmounting or explicitly disable post-unmount node cleanup with createNodeFsMountHandler(path, {cleanupNodesOnUnmount: false}).`
            );
          }
          FS.rmdir(vfsMountPoint);
        } else {
          FS.unlink(vfsMountPoint);
        }
      }
    };
  };
}
function markMissingMountSource(error, localPath) {
  const errnoError = error;
  if (errnoError.code === "ENOENT") {
    const missingSourceError = new Error(
      `Unable to mount ${localPath}: source path does not exist.`,
      { cause: error }
    );
    missingSourceError.code = "ENOENT";
    missingSourceError.path = localPath;
    missingSourceError.phpWasmMountSourceMissing = true;
    return missingSourceError;
  }
  return error;
}

// ../wordpress-preview-2026-10-22/runtime/tooling/node_modules/@wp-playground/common/index.js
function R2(s = fetch) {
  const e = {};
  return async function(t, c3) {
    if (!e[t]) {
      e[t] = {
        responsePromise: s(t, c3),
        async nextResponse() {
          const n = await e[t].responsePromise, [r, a2] = e[t].unlockedBodyStream.tee();
          return e[t].unlockedBodyStream = r, new Response(a2, {
            status: n.status,
            statusText: n.statusText,
            headers: n.headers
          });
        }
      };
      const o = await e[t].responsePromise;
      e[t].unlockedBodyStream = o.body;
    }
    return e[t].nextResponse();
  };
}
var y2 = 100;
var h2 = 400 * 1024;
var P2 = "PLAYGROUND_UNZIP_PROGRESS:";
var U3 = async (s, e, i, t = true, c3) => {
  const o = `/tmp/file-${Math.random()}.zip`;
  let n = false;
  try {
    if (e instanceof File) {
      const $2 = e;
      e = o, n = true, await s.writeFile(
        e,
        new Uint8Array(await $2.arrayBuffer())
      );
    }
    const a2 = {
      code: `<?php
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
		`,
      env: {
        PLAYGROUND_UNZIP_ZIP_PATH: e,
        PLAYGROUND_UNZIP_EXTRACT_TO_PATH: i,
        PLAYGROUND_UNZIP_OVERWRITE_FILES: t ? "1" : "0",
        PLAYGROUND_UNZIP_REPORT_PROGRESS: c3 ? "1" : "0",
        PLAYGROUND_UNZIP_FILES_INTERVAL: String(
          y2
        ),
        PLAYGROUND_UNZIP_UNCOMPRESSED_BYTES_INTERVAL: String(
          h2
        ),
        PLAYGROUND_UNZIP_LINE_PREFIX: P2
      }
    };
    c3 ? await _3(s, a2, c3) : await s.run(a2);
  } finally {
    if (n)
      try {
        await s.fileExists(o) && await s.unlink(o);
      } catch {
      }
  }
};
async function _3(s, e, i) {
  const t = await s.runStream(e), c3 = t.stderrText, o = t.stdout.getReader(), n = new TextDecoder();
  let r = "", a2;
  const $2 = (l) => {
    if (l.startsWith(P2))
      try {
        i(
          JSON.parse(
            l.slice(P2.length)
          )
        );
      } catch (p2) {
        a2 ?? (a2 = p2);
      }
  };
  try {
    for (; ; ) {
      const { done: l, value: p2 } = await o.read();
      r += n.decode(p2, { stream: !l });
      let d2 = r.indexOf(`
`);
      for (; d2 !== -1; )
        $2(r.slice(0, d2)), r = r.slice(d2 + 1), d2 = r.indexOf(`
`);
      if (l)
        break;
    }
  } finally {
    o.releaseLock();
  }
  r && $2(r);
  const [f, u2] = await Promise.all([
    t.exitCode,
    c3
  ]);
  if (f !== 0)
    throw new Error(
      u2.trim() || `Could not unzip file. PHP exited with code ${f}.`
    );
  if (a2)
    throw a2;
}

// ../wordpress-preview-2026-10-22/runtime/tooling/node_modules/@wp-playground/wordpress/index.js
var import_logger6 = __toESM(require_logger(), 1);
async function V3(e) {
  await e.writeFile(
    "/internal/shared/preload/save-wp-env.php",
    `<?php

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
		`
  ), await e.writeFile(
    "/internal/shared/mu-plugins/0-playground.php",
    `<?php

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
		 * isn't fully bootstrapped \u2014 post types and taxonomies haven't
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
        ?>`
  ), await e.writeFile(
    "/internal/shared/mu-plugins/sitemap-redirect.php",
    `<?php
		/**
		 * Redirect sitemap.xml to wp-sitemap.xml for non-root installations.
		 *
		 * WordPress seems to only generate the sitemap.xml \u2192 wp-sitemap.xml rewrite
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
		`
  ), await e.writeFile(
    "/internal/shared/mu-plugins/inline-tinymce-content-css.php",
    `<?php
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
		`
  );
}
function Y2(e) {
  return `
/**
 * Loads the SQLite integration plugin before WordPress is loaded
 * and without creating a drop-in "db.php" file.
 *
 * Technically, it creates a global $wpdb object whose only two
 * purposes are to:
 *
 * * Exist \u2013 because the require_wp_db() WordPress function won't
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
			throw new Exception('Infinite loop detected in $wpdb \u2013 SQLite integration plugin could not be loaded');
		}
		return call_user_func_array(
			array($GLOBALS['wpdb'], $name),
			$arguments
		);
	}
	public function __get($name) {
		$this->load_sqlite_integration();
		if($GLOBALS['wpdb'] === $this) {
			throw new Exception('Infinite loop detected in $wpdb \u2013 SQLite integration plugin could not be loaded');
		}
		return $GLOBALS['wpdb']->$name;
	}
	public function __set($name, $value) {
		$this->load_sqlite_integration();
		if($GLOBALS['wpdb'] === $this) {
			throw new Exception('Infinite loop detected in $wpdb \u2013 SQLite integration plugin could not be loaded');
		}
		$GLOBALS['wpdb']->$name = $value;
	}
    protected function load_sqlite_integration() {
        ${e}
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
`;
}
var ue = `
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

			// WP 1.5\u20132.4
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

			// WP 1.0\u20131.2: cookies are usually already set by
			// playground_legacy_set_auth_cookies_early() in env.php,
			// but WP 1.0\u20131.2 reads its user state from globals (no
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
`;
async function pe(e) {
  await e.mkdir("/internal/shared/mu-plugins"), await e.writeFile(
    "/internal/shared/auto_prepend_file.php",
    `<?php
// Polyfill the PHP 4 superglobals WP 1.0\u20132.5 still reads (removed
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
// request (e.g. php.run() during boot/fixups) \u2014 legacy WP reads
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
// to call wp_set_auth_cookie() / setcookie() on the init hook \u2014
// otherwise nonce validation breaks on POST requests. PHP flushes
// the buffer at script end so output still reaches the browser.
ob_start();
`
  ), await e.writeFile(
    "/internal/shared/preload/env.php",
    `<?php
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
// disk \u2014 the three $wp_filter shapes apply_filters() understands.
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

// Set WP 1.0\u20132.4 auth cookies before WordPress loads \u2014 by the time
// the init hook fires (and on WP 1.0\u20131.2 it may not fire at all on
// the front page) WordPress has already read $_COOKIE. setcookie()
// also persists them across requests via HttpCookieStore.
// WP 2.5+ uses the HMAC auth cookie scheme and doesn't read these
// wordpressuser_/wordpresspass_ cookies at all \u2014 bail there so we
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
	// WP 1.0\u20132.4 derives from get_settings('siteurl').
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

// Load mu-plugins last so customer mu-plugins win \u2014 and so they
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
`
  ), await e.writeFile(
    "/internal/shared/mu-plugins/1-auto-login.php",
    `<?php
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
			${ue}
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
		`
  ), await V3(e), await e.writeFile(
    "/internal/shared/preload/error-handler.php",
    `<?php
$GLOBALS['_playground_consts'] = array();
if (file_exists('/internal/shared/consts.json')) {
	$GLOBALS['_playground_consts'] = @json_decode(file_get_contents('/internal/shared/consts.json'), true);
	if (!is_array($GLOBALS['_playground_consts'])) { $GLOBALS['_playground_consts'] = array(); }
	$GLOBALS['_playground_consts'] = array_keys($GLOBALS['_playground_consts']);
}
function _playground_error_handler($severity, $message, $file, $line) {
	$playground_consts = $GLOBALS['_playground_consts'];
${fe}
	return false;
}
set_error_handler('_playground_error_handler');`
  );
}
var fe = `
		// http_api_transports is deprecated since 6.4.0 but Playground's
		// networking layer still registers it for wp_http_supports().
		// @see https://core.trac.wordpress.org/ticket/37708
		if (
			strpos($message, "http_api_transports") !== false &&
			strpos($message, "since version 6.4.0 with no alternative available") !== false
		) {
			return;
		}
		// Playground predefines constants (SITE_URL, WP_DEBUG, \u2026) that
		// wp-config.php is allowed to redefine; ours take precedence.
		if (strpos($message, "already defined") !== false) {
			foreach($playground_consts as $const) {
				if(strpos($message, "Constant $const already defined") !== false) {
					return;
				}
			}
		}
		// Legacy WP (2.0\u20133.5) assigns props on uninitialised vars,
		// valid in PHP 4 but E_WARNING since 5.x. Unfixable in core \u2014
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
`;
function K2(e) {
  return [
    // Parenthesized forms.
    /(^|[^\w$])((?:require|include)(?:_once)?)\s*\(\s*(['"])(\.\.\/[^'"]+)\3\s*\)/g,
    /(^|[^\w$])((?:require|include)(?:_once)?)\s*\(\s*(['"])(\.\/[^'"]+)\3\s*\)/g,
    // Bare filename (e.g. 'admin-header.php'). Restrict to .php to
    // avoid false positives.
    /(^|[^\w$])((?:require|include)(?:_once)?)\s*\(\s*(['"])([a-z][\w-]*\.php)\3\s*\)/g,
    // Statement forms without parentheses (WP 2.0 uses this).
    /(^|[^\w$])((?:require|include)(?:_once)?)\s+(['"])(\.\.\/[^'"]+)\3/g,
    /(^|[^\w$])((?:require|include)(?:_once)?)\s+(['"])(\.\/[^'"]+)\3/g,
    /(^|[^\w$])((?:require|include)(?:_once)?)\s+(['"])([a-z][\w-]*\.php)\3/g
  ].reduce(
    (i, n) => i.replace(
      n,
      (s, r, a2, o, _4) => `${r}${a2}(${he(_4)})`
    ),
    e
  );
}
function he(e) {
  let t = e, i = 0;
  for (; t.startsWith("../"); )
    i++, t = t.slice(3);
  for (; t.startsWith("./"); )
    t = t.slice(2);
  let n = "dirname(__FILE__)";
  for (let s = 0; s < i; s++)
    n = `dirname(${n})`;
  return `${n} . '/${t}'`;
}
async function $e(e, t) {
  return Q3(e, t) ? (await me2(e, t), await Te2(e, t), await Ee2(e, t), await we2(e, t), await Le2(e, t), await be2(e, t), await Oe(e, t), true) : false;
}
async function ge2(e) {
  return Q3(e, e.documentRoot) ? (await e.run({
    code: `<?php
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
		`,
    env: {
      DOCUMENT_ROOT: e.documentRoot
    }
  }), true) : false;
}
function Q3(e, t) {
  const i = m(t, "b2config.php"), n = m(t, "b2-include/b2vars.php");
  return !e.fileExists(i) || !e.fileExists(n) ? false : e.readFileAsText(n).includes("$b2_version = '0.71'");
}
async function me2(e, t) {
  for (const i of [
    m(t, "wp-includes"),
    m(t, "wp-content"),
    m(t, "wp-content/database")
  ])
    e.isDir(i) || await e.mkdir(i);
}
async function Te2(e, t) {
  const i = m(t, "wp-includes/version.php");
  await e.writeFile(
    i,
    `<?php
$wp_version = '0.71';
$wp_db_version = 71;
`
  );
  const n = m(t, "wp-config.php");
  e.fileExists(n) || await e.writeFile(
    n,
    "<?php require_once dirname(__FILE__) . '/b2config.php';"
  );
  const s = m(t, "wp-load.php");
  e.fileExists(s) || await e.writeFile(
    s,
    `<?php
if (!defined('ABSPATH')) {
	define('ABSPATH', dirname(__FILE__) . '/');
}
require_once ABSPATH . 'b2config.php';
`
  );
  const r = m(t, "wp-admin/post.php");
  e.fileExists(r) || await e.writeFile(
    r,
    "<?php require_once dirname(__FILE__) . '/b2edit.php';"
  );
}
async function Ee2(e, t) {
  const i = m(t, "b2config.php");
  let n = e.readFileAsText(i);
  const s = n;
  n.includes("pg_wp07_bootstrap") || (n = n.replace(
    "<?php",
    `<?php
if (!defined('ABSPATH')) define('ABSPATH', dirname(__FILE__) . '/'); /* pg_wp07_bootstrap */
if (!defined('WPINC')) define('WPINC', 'b2-include');
if (!defined('WP_CONTENT_DIR')) define('WP_CONTENT_DIR', ABSPATH . 'wp-content');
if (!defined('DB_ENGINE')) define('DB_ENGINE', 'sqlite');
if (!isset($table_prefix)) $table_prefix = 'b2';
error_reporting(E_ALL & ~E_NOTICE & ~8192 & ~2048);
`
  )), n = n.replace(
    /\$siteurl\s*=\s*'http:\/\/example\.com';[^\n]*/,
    "$siteurl = defined('WP_SITEURL') ? WP_SITEURL : 'http://localhost'; // pg_wp07_siteurl"
  ).replace(
    '$blogname = "my weblog";',
    '$blogname = "My WordPress Website";'
  ).replace(
    '$blogdescription = "babblings !";',
    '$blogdescription = "Just another WordPress weblog";'
  ).replace(
    "$admin_email = 'you@example.com';",
    "$admin_email = 'admin@localhost.com';"
  ).replace(
    "$abspath =  getenv('DOCUMENT_ROOT') . $relpath . '/';",
    "$abspath = dirname(__FILE__) . '/';"
  ), n !== s && await e.writeFile(i, n);
}
async function we2(e, t) {
  const i = m(t, "blog.header.php");
  let n = e.readFileAsText(i);
  const s = n;
  n = n.replace(
    `$where .= ' AND (post_status = "publish"';`,
    `$where .= " AND (post_status = 'publish'";`
  ), n !== s && await e.writeFile(i, n);
}
async function Le2(e, t) {
  const i = m(t, "b2-include/wp-db.php");
  let n = e.readFileAsText(i);
  const s = n;
  n = ye2(n), n = n.replace(
    "$wpdb = new wpdb(DB_USER, DB_PASSWORD, DB_NAME, DB_HOST);",
    `if (!isset($GLOBALS['wpdb'])) {
	$GLOBALS['wpdb'] = new wpdb(DB_USER, DB_PASSWORD, DB_NAME, DB_HOST);
}
$wpdb = $GLOBALS['wpdb']; /* pg_wp07_preserve_sqlite_loader */`
  ), n !== s && await e.writeFile(i, n);
}
function ye2(e) {
  const t = [];
  if (e.includes("function set_prefix") || t.push(`
	function set_prefix($prefix) {
		$this->prefix = $prefix;
		$tables = array('posts', 'users', 'categories', 'comments', 'links', 'linkcategories', 'settings', 'options', 'postmeta', 'usermeta', 'terms', 'term_taxonomy', 'term_relationships');
		foreach ($tables as $table) {
			$this->$table = $prefix . $table;
		}
		return $prefix;
	}`), e.includes("function timer_start") || t.push(`
	function timer_start() {
		$this->time_start = microtime(true);
		return true;
	}`), e.includes("function timer_stop") || t.push(`
	function timer_stop() {
		return microtime(true) - $this->time_start;
	}`), e.includes("function init_charset") || t.push(`
	function init_charset() {
		if (defined('DB_CHARSET')) $this->charset = DB_CHARSET;
		if (defined('DB_COLLATE')) $this->collate = DB_COLLATE;
	}`), e.includes("function bail") || t.push(`
	function bail($message, $error_code = '500') {
		die($message);
	}`), e.includes("function check_connection") || t.push(`
	function check_connection($allow_bail = true) {
		return true;
	}`), t.length === 0) return e;
  const i = e.match(
    /^(\s*})\s*\n+(\$wpdb|if\s*\(\s*!\s*isset\(\s*\$GLOBALS\['wpdb'\]\s*\))/m
  );
  if (!i || i.index === void 0)
    throw new Error(
      "WP 0.7 wpdb polyfill anchor not found; b2-include/wp-db.php layout changed"
    );
  const n = `
	// Polyfills added by WordPress Playground for WP 0.7.
` + t.join(`
`) + `

`;
  return e.substring(0, i.index) + n + e.substring(i.index);
}
async function be2(e, t) {
  const i = m(
    t,
    "b2-include/b2template.functions.php"
  );
  let n = e.readFileAsText(i);
  const s = n;
  n.includes("pg_wp07_apply_filters") || (n = n.replace(
    `function apply_filters($tag, $string) {
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
}`,
    `function apply_filters($tag, $string) { /* pg_wp07_apply_filters */
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
}`
  ), n !== s && await e.writeFile(i, n));
}
async function Oe(e, t) {
  await Ne(e, t), await Ae2(e, t), await Pe2(e, t), await Ue(e, t);
}
async function Ne(e, t) {
  const i = m(t, "b2login.php");
  let n = e.readFileAsText(i);
  const s = n;
  n.includes("pg_wp07_login_auto_login") || (n = n.replace(
    "switch($action) {",
    `${z3("pg_wp07_login_auto_login")}
switch($action) {`
  )), n.includes("pg_wp07_logout_guard") || (n = n.replace(
    `	setcookie('wordpressuser');
	setcookie('wordpresspass');`,
    `	setcookie('wordpressuser', '', time() - 31536000);
	setcookie('wordpresspass', '', time() - 31536000);
	setcookie('wordpressblogid', '', time() - 31536000);
	setcookie('wordpressuser', '', time() - 31536000, '/');
	setcookie('wordpresspass', '', time() - 31536000, '/');
	setcookie('wordpressblogid', '', time() - 31536000, '/');
	setcookie('playground_auto_login_already_logged_out', '1', time() + 172800, '/'); /* pg_wp07_logout_guard */`
  ), n = n.replace(
    "header('Refresh: 0;url=b2login.php');",
    "header('Refresh: 0;url=b2login.php?loggedout=1');"
  ).replace(
    "header('Location: b2login.php');",
    "header('Location: b2login.php?loggedout=1');"
  )), n !== s && await e.writeFile(i, n);
}
async function Ae2(e, t) {
  const i = m(t, "wp-admin");
  if (e.isDir(i))
    for (const n of e.listFiles(i)) {
      if (!n.endsWith(".php")) continue;
      const s = m(i, n), r = e.readFileAsText(s), a2 = K2(r);
      a2 !== r && await e.writeFile(s, a2);
    }
}
async function Pe2(e, t) {
  const i = m(t, "wp-admin/b2menutop.php");
  let n = e.readFileAsText(i);
  const s = n;
  n = n.replace(
    'file("./b2menutop.txt")',
    "file(dirname(__FILE__) . '/b2menutop.txt')"
  ).replace(
    '<a href="http://wordpress.org" rel="external"><span>WordPress</span></a>',
    '<a href="#" rel="external"><span>WordPress</span></a>'
  ), n !== s && await e.writeFile(i, n);
}
async function Ue(e, t) {
  const i = m(t, "wp-admin/b2verifauth.php");
  let n = e.readFileAsText(i);
  const s = n;
  n.includes("pg_wp07_auto_login") || (n = n.replace(
    "require_once('../b2config.php');",
    `require_once('../b2config.php');
${z3("pg_wp07_auto_login")}`
  ), n !== s && await e.writeFile(i, n));
}
function z3(e) {
  return `
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
} /* ${e} */
`;
}
async function Se2(e, t) {
  const i = N(e, t);
  if (i === null) return;
  const n = parseFloat(i);
  if (!Number.isFinite(n) || n < 5 || n >= 6.2)
    return;
  const s = m(t, "wp-includes/load.php");
  if (!e.fileExists(s)) return;
  const r = e.readFileAsText(s), a2 = r.replace(
    "extension_loaded( 'mysqli' )",
    "function_exists( 'mysqli_connect' )"
  );
  a2 !== r && await e.writeFile(s, a2);
}
function N(e, t) {
  const i = m(t, "wp-includes/version.php");
  if (!e.fileExists(i)) return null;
  const s = e.readFileAsText(i).match(/\$wp_version\s*=\s*['"]([^'"]+)['"]/);
  return s ? s[1] : null;
}
var Re2 = 22527;
var A5 = "E_ALL & ~8192 & ~2048";
async function xe2(e, t) {
  if (await $e(e, t)) return;
  await Me2(e, t), await He2(e, t), await Xe(e, t), await Qe(e, t), await ze(e, t), await at(e, t), await Ze(e, t), await it(e, t), await De(e, t), await ke2(e, t);
  const i = N(e, t);
  if (i === null) return;
  const n = parseFloat(i);
  Number.isFinite(n) && (n < 1.2 && (await Be(e, t), await Ge(e, t)), n < 1.5 && await Fe2(e, t), 1.5 <= n && n < 2 && await tt(e, t), n < 2 && (await Ce(e, t), await Ke(e, t)), 2.1 <= n && n < 2.3 && await We(e, t), n < 2.5 && await Je(e, t), n < 2.8 && (await st(e, t), await rt(e, t)), 2.9 <= n && n < 3.6 && await Ie2(e, t), 3.3 <= n && n < 3.4 && await qe(e, t), n >= 4.7 && await ve2(e, t));
}
async function ve2(e, t) {
  const i = m(t, "wp-content/themes");
  if (e.isDir(i))
    for (const n of e.listFiles(i)) {
      const s = m(i, n, "searchform.php");
      e.fileExists(s) && e.unlink(s);
    }
}
async function Ie2(e, t) {
  const i = m(t, "wp-admin/includes/dashboard.php");
  if (e.fileExists(i)) {
    let r = e.readFileAsText(i);
    if (r.includes("function wp_dashboard_primary()") && !r.includes("/* pg_no_rss */")) {
      for (const a2 of [
        "wp_dashboard_primary",
        "wp_dashboard_secondary",
        "wp_dashboard_plugins"
      ])
        r = r.replace(
          new RegExp(`function ${a2}\\(\\)\\s*\\{`),
          `function ${a2}() { /* pg_no_rss */ return;`
        );
      await e.writeFile(i, r);
    }
  }
  const n = m(t, "wp-admin/admin.php");
  if (e.fileExists(n)) {
    let r = e.readFileAsText(n);
    r.includes("do_action('admin_init');") && !r.includes("/* pg_admin_init_cleanup */") && (r = r.replace(
      "do_action('admin_init');",
      `/* pg_admin_init_cleanup */
if (function_exists('remove_action')) {
	@remove_action('admin_init', '_maybe_update_plugins');
	@remove_action('admin_init', '_maybe_update_themes');
	@remove_action('admin_init', '_maybe_update_core');
	@remove_action('admin_init', 'wp_version_check');
	@remove_action('admin_init', 'wp_update_plugins');
	@remove_action('admin_init', 'wp_update_themes');
}
do_action('admin_init');`
    ), await e.writeFile(n, r));
  }
  const s = m(
    t,
    "wp-admin/includes/update.php"
  );
  if (e.fileExists(s)) {
    let r = e.readFileAsText(s);
    if (!r.includes("/* pg_admin_no_updates */")) {
      for (const a2 of [
        "wp_plugin_update_rows",
        "wp_plugin_update_row",
        "wp_theme_update_rows",
        "wp_theme_update_row",
        "wp_update_plugins",
        "wp_update_themes"
      ]) {
        const o = new RegExp(
          `function ${a2}\\s*\\([^)]*\\)\\s*\\{`
        );
        o.test(r) && (r = r.replace(
          o,
          (_4) => _4 + " /* pg_admin_no_updates */ return;"
        ));
      }
      await e.writeFile(s, r);
    }
  }
  for (const r of [
    m(t, "wp-includes/SimplePie/File.php"),
    m(t, "wp-includes/class-simplepie.php")
  ]) {
    if (!e.fileExists(r)) continue;
    let a2 = e.readFileAsText(r);
    a2.includes("function SimplePie_File(") && !a2.includes("/* pg_no_fetch */") && (a2 = a2.replace(
      /function SimplePie_File\([^)]*\)\s*\{/,
      (o) => o + `
		/* pg_no_fetch */
		$this->error = 'Network requests disabled in Playground';
		$this->success = false;
		return;`
    ), await e.writeFile(r, a2));
  }
}
async function ke2(e, t) {
  const i = [
    ["function wp_new_blog_notification", "pg_no_blog_notification"],
    [
      "function wp_install_maybe_enable_pretty_permalinks",
      "pg_no_permalink_check"
    ]
  ], n = [
    m(t, "wp-admin/includes/upgrade.php"),
    m(t, "wp-admin/upgrade-functions.php")
  ];
  for (const s of n) {
    if (!e.fileExists(s)) continue;
    let r = e.readFileAsText(s), a2 = false;
    for (const [o, _4] of i) {
      if (r.includes(`/* ${_4} */`)) continue;
      const c3 = r.indexOf(o);
      if (c3 === -1) continue;
      const u2 = r.indexOf("{", c3);
      u2 !== -1 && (r = r.substring(0, u2 + 1) + ` /* ${_4} */ return;` + r.substring(u2 + 1), a2 = true);
    }
    a2 && await e.writeFile(s, r);
  }
}
async function De(e, t) {
  const i = m(t, "wp-load.php");
  if (!e.fileExists(i)) return;
  const n = e.readFileAsText(i);
  if (!n.includes("error_reporting(") || n.includes("~8192") && n.includes("~2048")) return;
  const s = n.replace(
    /error_reporting\(([^)]+)\)/g,
    (r, a2) => `error_reporting((${a2}) & ~8192 & ~2048)`
  );
  await e.writeFile(i, s);
}
async function Fe2(e, t) {
  const i = m(t, "wp-admin/menu.php");
  if (e.fileExists(i)) {
    const r = e.readFileAsText(i);
    if (!r.includes("/* pg_wp10_logo_link */")) {
      const a2 = '<h1 id="wphead"><a href="http://wordpress.org" rel="external">WordPress</a></h1>';
      if (r.includes(a2)) {
        const o = r.replace(
          a2,
          '<h1 id="wphead"><a href="#" rel="external">WordPress</a></h1> <!-- pg_wp10_logo_link -->'
        );
        o !== r && await e.writeFile(i, o);
      }
    }
  }
  const n = m(
    t,
    "wp-admin/admin-header.php"
  );
  if (e.fileExists(n)) {
    const r = e.readFileAsText(n);
    if (!r.includes("/* pg_wp12_logo_link */")) {
      const a2 = '<a href="http://wordpress.org" rel="external"', o = "</a>", _4 = r.indexOf(a2);
      if (_4 !== -1) {
        const c3 = r.indexOf(o, _4);
        if (c3 !== -1) {
          const u2 = r.substring(0, _4) + '<a href="#">WordPress</a><!-- pg_wp12_logo_link -->' + r.substring(c3 + o.length);
          u2 !== r && await e.writeFile(n, u2);
        }
      }
    }
  }
  const s = m(
    t,
    "wp-admin/admin-footer.php"
  );
  if (e.fileExists(s)) {
    const r = e.readFileAsText(s);
    if (!r.includes("/* pg_wp10_footer_link */")) {
      const a2 = r.replace(
        '<a href="http://wordpress.org">WordPress</a>',
        "WordPress<!-- pg_wp10_footer_link -->"
      ).replace(
        '<a href="http://wordpress.org/">WordPress</a>',
        "WordPress<!-- pg_wp10_footer_link -->"
      );
      a2 !== r && await e.writeFile(s, a2);
    }
  }
}
async function Ce(e, t) {
  const i = m(t, "wp-admin/edit.php");
  if (!e.fileExists(i)) return;
  const n = e.readFileAsText(i);
  if (n.includes("/* pg_wp10_post_title_edit */")) return;
  let s = n;
  const r = '<strong><a href="<?php permalink_link(); ?>" rel="permalink"><?php the_title() ?></a></strong>';
  s.includes(r) && (s = s.replace(
    r,
    '<strong><a href="post.php?action=edit&amp;post=<?php echo $id /* pg_wp10_post_title_edit */ ?>"><?php the_title() ?></a></strong>'
  ));
  const a2 = '<td><a href="<?php the_permalink(); ?>" rel="permalink">';
  s.includes(a2) && (s = s.replace(
    a2,
    '<td><a href="post.php?action=edit&amp;post=<?php echo $id /* pg_wp10_post_title_edit */ ?>">'
  ));
  const o = `<td><?php the_title() ?>
		<?php if ('private' == $post->post_status) _e(' - <strong>Private</strong>'); ?></td>`;
  s.includes(o) && (s = s.replace(
    o,
    `<td><a href="post.php?action=edit&amp;post=<?php echo $id /* pg_wp10_post_title_edit */ ?>"><?php the_title() ?></a>
		<?php if ('private' == $post->post_status) _e(' - <strong>Private</strong>'); ?></td>`
  )), s !== n && await e.writeFile(i, s);
}
async function qe(e, t) {
  const i = m(t, "wp-admin/includes/screen.php");
  if (!e.fileExists(i)) return;
  const n = e.readFileAsText(i);
  if (!n.includes("self::$this->_help_sidebar")) return;
  const s = n.replace(
    /self::\$this->_help_sidebar/g,
    "$this->_help_sidebar"
  );
  s !== n && await e.writeFile(i, s);
}
async function We(e, t) {
  const i = m(t, "wp-admin/plugins.php");
  if (!e.fileExists(i)) return;
  const n = e.readFileAsText(i);
  if (n.includes("/* pg_wp21_active_plugins_array */")) return;
  const s = "$current = get_option('active_plugins');";
  if (!n.includes(s)) return;
  const r = n.replace(
    s,
    s + `
	if (!is_array($current)) $current = array(); /* pg_wp21_active_plugins_array */`
  );
  r !== n && await e.writeFile(i, r);
}
async function Ge(e, t) {
  const i = m(t, "wp-login.php");
  if (!e.fileExists(i)) return;
  const n = e.readFileAsText(i), s = "AND user_pass = '$password'";
  if (!n.includes(s) || n.includes("pg_wp10_plain_or_md5")) return;
  let r = n.replace(
    s,
    "AND (user_pass = '$password' OR user_pass = MD5('$password')) /* pg_wp10_plain_or_md5 */"
  );
  r = r.replace(
    "$login->user_pass == $password",
    "($login->user_pass == $password || $login->user_pass == md5($password))"
  ), r !== n && await e.writeFile(i, r);
}
async function Me2(e, t) {
  const i = m(t, "wp-includes");
  if (!e.isDir(i)) return;
  const n = m(i, "version.php");
  e.fileExists(n) || await e.writeFile(n, "<?php $wp_version = '1.0';");
}
async function Be(e, t) {
  const i = m(t, "wp-blog-header.php");
  if (e.fileExists(i)) {
    const s = e.readFileAsText(i), r = `$where .= ' AND (post_status = "publish"';`;
    s.includes(r) && await e.writeFile(
      i,
      s.replace(
        r,
        `$where .= " AND (post_status = 'publish'";`
      )
    );
  }
  const n = m(t, "wp-includes/vars.php");
  if (e.fileExists(n)) {
    const s = e.readFileAsText(n), r = "add_filter('all', 'wptexturize');";
    s.includes(r) && await e.writeFile(
      n,
      s.replace(
        r,
        `// ${r} // Disabled by Playground: mangles SQL literals.`
      )
    );
  }
}
async function He2(e, t) {
  const i = m(t, "wp-load.php");
  e.fileExists(i) || await e.writeFile(
    i,
    `<?php
if ( !defined('ABSPATH') ) {
	define('ABSPATH', dirname(__FILE__) . '/');
}
require_once(ABSPATH . 'wp-config.php');
`
  );
}
async function Xe(e, t) {
  const i = m(t, "wp-settings.php");
  if (!e.fileExists(i)) return;
  const n = e.readFileAsText(i);
  let s = n;
  s = s.replace(
    /if\s*\(\s*!extension_loaded\('mysql'\)\s*\)\s*\n\s*die/,
    `if ( false ) // Patched for SQLite
	die`
  ), s = s.replace(
    /error_reporting\(([^)]+)\)/g,
    (r, a2) => a2.includes("~8192") && a2.includes("~2048") ? r : `error_reporting((${a2}) & ~8192 & ~2048)`
  ), s = s.replace(
    /set_magic_quotes_runtime\(\s*0\s*\)\s*;/g,
    "// set_magic_quotes_runtime(0); // Removed"
  ), s.includes("function_exists('get_magic_quotes_gpc')") || (s = s.replace(
    /get_magic_quotes_gpc\(\)/g,
    "(function_exists('get_magic_quotes_gpc') && get_magic_quotes_gpc())"
  )), s = s.replace(/=\s*&\s*new\b/g, "= new"), s = s.replace(/\$HTTP_SERVER_VARS/g, "$_SERVER"), !s.includes("WP_CONTENT_DIR") && s.includes("define('WPINC'") && (s = s.replace(
    /define\('WPINC',\s*'wp-includes'\);/,
    `define('WPINC', 'wp-includes');
if (!defined('WP_CONTENT_DIR')) define('WP_CONTENT_DIR', ABSPATH . 'wp-content');`
  )), s = s.replace(/unset\(\s*\$wp_filter\s*,/, "unset("), s = Ve(s), s = Ye(s), s !== n && await e.writeFile(i, s);
}
function Ve(e) {
  const t = e.indexOf("installed WP");
  if (t === -1) return e;
  const i = e.lastIndexOf("die(", t);
  if (i === -1) return e;
  let n = 0;
  for (let s = i + 3; s < e.length; s++)
    if (e[s] === "(") n++;
    else if (e[s] === ")" && (n--, n === 0)) {
      let r = s + 1;
      return e[r] === ";" && r++, e.substring(0, i) + "true; /* die removed by Playground */" + e.substring(r);
    }
  return e;
}
function Ye(e) {
  return e.replace(
    "do_action('init');",
    `// Remove hooks that make outbound HTTP requests (crash WASM).
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
do_action('init');`
  );
}
async function Ke(e, t) {
  const i = m(
    t,
    "wp-includes/functions.php"
  );
  if (!e.fileExists(i)) return;
  let n = e.readFileAsText(i), s = false;
  n.includes("$all_options->{$option->option_name}") && !n.includes("$all_options = new stdClass") && (n = n.replace(
    "foreach ($options as $option) {",
    `$all_options = new stdClass;
	foreach ($options as $option) {`
  ), s = true), s && await e.writeFile(i, n);
}
async function Qe(e, t) {
  const i = m(t, "wp-admin/install.php");
  if (!e.fileExists(i)) return;
  const n = e.readFileAsText(i);
  let s = n;
  const r = m(t, "wp-admin");
  s = s.replace(/'\.\.\/(wp-config\.php)'/g, `'${t}/$1'`).replace(/'\.\.\/(wp-load\.php)'/g, `'${t}/$1'`).replace(/'\.\/(upgrade-functions\.php)'/g, `'${r}/$1'`).replace(/'(upgrade-functions\.php)'/g, `'${r}/$1'`).replace(/'\.\/(includes\/upgrade\.php)'/g, `'${r}/$1'`).replace(/'\.\.\/(wp-includes\/[^']+)'/g, `'${t}/$1'`), s = s.replace(/\$HTTP_GET_VARS/g, "$_GET").replace(/\$HTTP_POST_VARS/g, "$_POST"), s !== n && await e.writeFile(i, s);
}
async function ze(e, t) {
  const i = m(t, "wp-includes/wp-db.php");
  if (!e.fileExists(i)) return;
  const n = e.readFileAsText(i);
  let s = n;
  s.includes("isset($wpdb)") || (s = s.replace(
    "$wpdb = new wpdb(DB_USER, DB_PASSWORD, DB_NAME, DB_HOST);",
    "if ( !isset($wpdb) ) { $wpdb = new wpdb(DB_USER, DB_PASSWORD, DB_NAME, DB_HOST); }"
  )), s.includes("db_connect") || (s = s.replace(
    /\$this->dbh\s*=\s*@mysql_connect\(\$dbhost\s*,\s*\$dbuser\s*,\s*\$dbpassword(?:\s*,\s*true)?\);/,
    'if (method_exists($this, "db_connect")) { $this->dbname = $dbname; $this->db_connect(); } else { $this->dbh = @mysql_connect($dbhost, $dbuser, $dbpassword); }'
  )), s = je(s), s !== n && await e.writeFile(i, s);
}
function je(e) {
  const t = [];
  if (e.includes("function set_prefix") || t.push(`
	function set_prefix($prefix) {
		$this->prefix = $prefix;
		$tables = array('posts', 'users', 'categories', 'post2cat', 'comments', 'link2cat', 'links', 'options', 'postmeta', 'usermeta', 'terms', 'term_taxonomy', 'term_relationships');
		foreach ($tables as $t) {
			$this->$t = $prefix . $t;
		}
		return $prefix;
	}`), e.includes("function timer_start") || t.push(`
	function timer_start() {
		$this->time_start = microtime(true);
		return true;
	}`), e.includes("function timer_stop") || t.push(`
	function timer_stop() {
		return microtime(true) - $this->time_start;
	}`), e.includes("function init_charset") || t.push(`
	function init_charset() {
		if (defined('DB_CHARSET')) $this->charset = DB_CHARSET;
		if (defined('DB_COLLATE')) $this->collate = DB_COLLATE;
	}`), e.includes("function bail") || t.push(`
	function bail($message, $error_code = '500') {
		die($message);
	}`), e.includes("function check_connection") || t.push(`
	function check_connection($allow_bail = true) {
		return true;
	}`), t.length === 0) return e;
  const i = e.match(
    /^(\s*})\s*\n+(\$wpdb|\?>\s*$|if\s*\(\s*!\s*isset\(\s*\$wpdb\s*\))/m
  );
  if (!i || i.index === void 0) return e;
  const n = `
	// Polyfills added by WordPress Playground.
` + t.join(`
`) + `

`;
  return e.substring(0, i.index) + n + e.substring(i.index);
}
async function Ze(e, t) {
  const i = m(t, "wp-admin");
  if (e.isDir(i))
    for (const r of e.listFiles(i)) {
      if (!r.endsWith(".php")) continue;
      const a2 = m(i, r), o = e.readFileAsText(a2), _4 = K2(o).replace(/ABSPATH\s*\.\s*'\/wp-/g, "ABSPATH . 'wp-");
      _4 !== o && await e.writeFile(a2, _4);
    }
  const n = m(t, "wp-admin/index.php");
  if (e.fileExists(n)) {
    let r = e.readFileAsText(n);
    r.includes("get_settings('siteurl')") && (r = r.replace(
      /get_settings\('siteurl'\)\s*\.\s*'\/wp-admin\//g,
      "'"
    ), await e.writeFile(n, r));
  }
  const s = m(t, "wp-admin/menu.php");
  if (e.fileExists(s)) {
    const r = e.readFileAsText(s), a2 = "file('./menu.txt')";
    r.includes(a2) && await e.writeFile(
      s,
      r.replace(a2, "file(dirname(__FILE__) . '/menu.txt')")
    );
  }
}
async function Je(e, t) {
  const i = m(
    t,
    "wp-admin/admin-functions.php"
  );
  if (!e.fileExists(i)) return;
  const n = e.readFileAsText(i);
  if (!n.includes("function check_admin_referer()") || !n.includes("$_SERVER['HTTP_REFERER']"))
    return;
  const s = et(
    n,
    "check_admin_referer",
    `
	do_action('check_admin_referer', '');
`
  );
  s !== n && await e.writeFile(i, s);
}
function et(e, t, i) {
  const n = `function ${t}()`, s = e.indexOf(n);
  if (s === -1) return e;
  const r = e.indexOf("{", s + n.length);
  if (r === -1) return e;
  let a2 = 1;
  for (let o = r + 1; o < e.length; o++) {
    const _4 = e[o];
    if (_4 === "{") a2++;
    else if (_4 === "}" && (a2--, a2 === 0))
      return e.substring(0, r + 1) + i + e.substring(o);
  }
  return e;
}
async function tt(e, t) {
  const i = m(t, "wp-admin/index.php");
  if (e.fileExists(i)) {
    const n = e.readFileAsText(i), s = n.replace(/AND post_date_gmt < '\$today'/, "");
    s !== n && await e.writeFile(i, s);
  }
  await nt(e, t);
}
async function nt(e, t) {
  const i = m(t, "wp-includes/rss-functions.php");
  if (!e.fileExists(i)) return;
  let n = e.readFileAsText(i);
  !/^\s*error\s*\(/m.test(n) || /^function\s+error\s*\(/m.test(n) || (n = n.replace(
    /^(<\?php\s*)/,
    `$1
if (!function_exists('error')) {
	function error($msg = '', $lvl = E_USER_WARNING) {
		if (defined('MAGPIE_DEBUG') && MAGPIE_DEBUG) {
			trigger_error($msg, $lvl);
		}
	}
}
`
  ), await e.writeFile(i, n));
}
async function it(e, t) {
  const i = m(t, "wp-login.php");
  if (!e.fileExists(i)) return;
  let n = e.readFileAsText(i), s = false;
  for (const r of ["log", "pwd"]) {
    const a2 = new RegExp(
      `(\\bname=(['"])${r}\\2)(?![^>]*data-1p-ignore)`
    );
    a2.test(n) && (n = n.replace(a2, "$1 data-1p-ignore"), s = true);
  }
  s && await e.writeFile(i, n);
}
async function st(e, t) {
  const i = m(t, "wp-admin/admin.php");
  if (e.fileExists(i)) {
    const s = e.readFileAsText(i);
    if (s.includes("auth_redirect()")) {
      const r = `
// Playground: populate auth cookies and force admin user before auth_redirect.
if (defined('PLAYGROUND_AUTO_LOGIN_AS_USER')) {
	if (function_exists('is_user_logged_in') && is_user_logged_in()) {
		// On WP < 4.0, wp_set_auth_cookie() does not update $_COOKIE
		// in-process \u2014 auth_redirect() reads $_COOKIE, so re-emit.
		if (function_exists('wp_generate_auth_cookie') && defined('LOGGED_IN_COOKIE') && empty($_COOKIE[LOGGED_IN_COOKIE])) {
			$_pg_uid = wp_get_current_user()->ID;
			$_pg_exp = time() + 172800;
			$_COOKIE[AUTH_COOKIE] = wp_generate_auth_cookie($_pg_uid, $_pg_exp, 'auth');
			if (defined('SECURE_AUTH_COOKIE'))
				$_COOKIE[SECURE_AUTH_COOKIE] = wp_generate_auth_cookie($_pg_uid, $_pg_exp, 'secure_auth');
			$_COOKIE[LOGGED_IN_COOKIE] = wp_generate_auth_cookie($_pg_uid, $_pg_exp, 'logged_in');
		}
	} else {
		${j3("PLAYGROUND_AUTO_LOGIN_AS_USER")}
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
`, a2 = s.replace(
        "auth_redirect();",
        r + "auth_redirect();"
      );
      a2 !== s && await e.writeFile(i, a2);
    }
  }
  const n = m(t, "wp-admin/auth.php");
  if (e.fileExists(n)) {
    const s = e.readFileAsText(n);
    if (s.includes("$cookiehash") && !s.includes("Playground: bypass auth")) {
      const r = `<?php
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
?>`;
      r !== s && await e.writeFile(n, r);
    }
  }
}
async function rt(e, t) {
  const i = m(t, "wp-admin/admin-ajax.php");
  if (!e.fileExists(i)) return;
  let n = e.readFileAsText(i);
  if (!n.includes("is_user_logged_in")) return;
  const s = `
// Playground: authenticate admin user for AJAX requests on WP < 2.8.
if (defined('PLAYGROUND_AUTO_LOGIN_AS_USER')) {
	${j3("PLAYGROUND_AUTO_LOGIN_AS_USER")}
}
`;
  n = n.replace(
    /if\s*\(\s*!\s*is_user_logged_in\(\)\s*\)/,
    s + "if ( !is_user_logged_in() )"
  ), await e.writeFile(i, n);
}
function j3(e) {
  return `
$_pg_user = null;
if (function_exists('wp_generate_auth_cookie')) {
	$_pg_user = function_exists('get_user_by')
		? get_user_by('login', ${e})
		: (function_exists('get_userdatabylogin')
			? get_userdatabylogin(${e}) : null);
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
`;
}
async function at(e, t) {
  const i = N(e, t);
  if (i === null) return;
  const n = parseFloat(i);
  if (!Number.isFinite(n) || n >= 3.3) return;
  const s = m(
    t,
    "wp-admin/includes/schema.php"
  );
  if (!e.fileExists(s)) return;
  const r = e.readFileAsText(s);
  /\$wp_queries\s*=\s*"CREATE TABLE/.test(r) && !r.includes("function wp_get_db_schema") && await ot(e, t, s, r);
}
async function ot(e, t, i, n) {
  const s = n.match(/\$wp_queries\s*=\s*"CREATE TABLE/);
  if (!s || s.index === void 0)
    return;
  const r = s.index, a2 = '";', o = n.indexOf(a2, r);
  if (o === -1)
    return;
  const _4 = o + a2.length, u2 = `function wp_get_db_schema( $scope = 'all', $blog_id = null ) {
	global $wpdb, $wp_queries, $charset_collate;
	$charset_collate = '';
	if ( ! empty($wpdb->charset) )
		$charset_collate = "DEFAULT CHARACTER SET $wpdb->charset";
	if ( ! empty($wpdb->collate) )
		$charset_collate .= " COLLATE $wpdb->collate";
	${n.substring(r, _4)}
	return $wp_queries;
}`, p2 = n.substring(0, r) + u2 + n.substring(_4);
  await e.writeFile(i, p2);
  const d2 = m(
    t,
    "wp-admin/includes/upgrade.php"
  );
  if (e.fileExists(d2)) {
    const f = e.readFileAsText(d2), T2 = f.replace(
      /(\$alterations\s*=\s*dbDelta\(\s*\$wp_queries\s*\))/g,
      "if ( function_exists('wp_get_db_schema') ) { $wp_queries = wp_get_db_schema(); } $1"
    );
    T2 !== f && await e.writeFile(d2, T2);
  }
}
var Z2 = "@playground-managed";
function lt() {
  return `<?php
// ${Z2} \u2014 Playground-generated db.php.
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
`;
}
async function _t(e, t) {
  if (await ge2(e)) return;
  let i = null;
  const n = m(e.documentRoot, "wp-includes/version.php");
  if (e.fileExists(n)) {
    const r = e.readFileAsText(n).match(/\$wp_version\s*=\s*['"]([^'"]+)['"]/);
    r && (i = r[1]);
  }
  const s = i !== null && parseFloat(i) < 3.5;
  try {
    await e.run({
      code: `<?php
				// WP_INSTALLING bypasses WP 1.x's "not installed" die() in wp-settings.php.
				define('WP_INSTALLING', true);
				error_reporting(${A5});
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
			`,
      env: {
        DOCUMENT_ROOT: e.documentRoot,
        PLAYGROUND_SITE_URL: t || ""
      }
    });
  } catch (r) {
    import_logger6.logger.warn("Legacy WP post-install fixups failed (non-fatal):", r);
  }
  if (s)
    try {
      await e.run({
        code: `<?php
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
			`,
        env: {
          DOCUMENT_ROOT: e.documentRoot,
          PLAYGROUND_SITE_URL: t || ""
        }
      });
    } catch (r) {
      import_logger6.logger.warn("Legacy WP PDO fallback failed (non-fatal):", r);
    }
}
var ct = `
// Connection stubs \u2014 wpdb::__construct bails on a falsy return.
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
}`;
async function dt(e, t, i = {}) {
  await e.isDir("/tmp/sqlite-database-integration") && await e.rmdir("/tmp/sqlite-database-integration", {
    recursive: true
  }), await e.mkdir("/tmp/sqlite-database-integration"), await U3(e, t, "/tmp/sqlite-database-integration");
  const n = "/internal/shared/sqlite-database-integration", s = `/tmp/sqlite-database-integration/${(await e.listFiles("/tmp/sqlite-database-integration"))[0]}`;
  await e.mv(s, n), await ut(e, n), await e.defineConstant("SQLITE_MAIN_FILE", "1");
  let a2 = (await e.readFileAsText(
    m(n, "db.copy")
  )).replace(
    "'{SQLITE_IMPLEMENTATION_FOLDER_PATH}'",
    q(n)
  ).replace(
    "'{SQLITE_PLUGIN}'",
    q(m(n, "load.php"))
  );
  a2 = a2.replace(
    /^add_action\(/gm,
    'function_exists("add_action") && add_action('
  );
  const o = m(await e.documentRoot, "wp-content/db.php"), _4 = "/internal/shared/mu-plugins/sqlite-database-integration.php", c3 = `
if(file_exists(${q(o)})) {
	$_pg_db_php = @file_get_contents(${q(o)});
	if (strpos($_pg_db_php, ${q(Z2)}) === false) {
		return;
	}
	unset($_pg_db_php);
}
`;
  await e.writeFile(_4, `<?php
${c3}?>` + a2), await e.writeFile(
    "/internal/shared/preload/0-sqlite.php",
    pt(c3, _4)
  ), await e.writeFile(
    "/internal/shared/mu-plugins/sqlite-test.php",
    `<?php
		global $wpdb;
		if(!($wpdb instanceof WP_SQLite_DB)) {
			var_dump(isset($wpdb));
			die("SQLite integration not loaded " . get_class($wpdb));
		}
		`
  );
}
async function ut(e, t) {
  const i = m(
    t,
    "wp-includes/database/sqlite/class-wp-pdo-mysql-on-sqlite.php"
  );
  if (!await e.fileExists(i)) return;
  const n = await e.readFileAsText(i), s = n.replace(
    /\$active_sql_modes\s*=\s*array\s*\([^)]*\)\s*;/,
    "$active_sql_modes = array();"
  );
  s !== n && await e.writeFile(i, s);
}
function pt(e, t) {
  return `<?php
${e}?>
<?php
// Shim __() etc. only for WP < 1.2 (no l10n layer; the SQLite
// plugin calls __() from print_error()). WP 1.2\u20131.4 ship
// wp-l10n.php and WP 1.5+ ships l10n.php \u2014 defining the shims
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
${Y2(
    // WP < 3.0's wpdb does mysql_connect() inline so the SQLite
    // plugin's db_connect() never runs; reinitialize_sqlite()
    // swaps the dbh in place after the integration is loaded.
    `require_once ${q(t)};
        if (
            isset($GLOBALS['wpdb']) &&
            method_exists($GLOBALS['wpdb'], 'reinitialize_sqlite')
        ) {
            $GLOBALS['wpdb']->reinitialize_sqlite();
        }`
  )}
${ct}
if (PHP_MAJOR_VERSION < 7) {
	// E_DEPRECATED (8192) / E_STRICT (2048) are PHP 5.3+ symbols;
	// LEGACY_WP_ERROR_REPORTING_PHP_EXPR uses numeric literals.
	$level = ${A5};
	error_reporting($level);
	ini_set('error_reporting', $level);
}

		`;
}
var m2 = 512;
var F = "/__tar-root__";
var ft = [40, 181, 47, 253];
var P3 = new TextDecoder();
function $t(e) {
  return ft.every((t, i) => e[i] === t);
}
function gt(e) {
  const t = String(e);
  if (t.includes("\\"))
    throw new Error(`Unsafe tar entry (backslash path): ${e}`);
  if (t.startsWith("/"))
    throw new Error(`Unsafe tar entry (absolute path): ${e}`);
  const i = c(t);
  if (!i)
    return "";
  const n = I(i, F);
  if (!n)
    throw new Error(`Unsafe tar entry (path traversal): ${e}`);
  return n.slice(F.length + 1);
}
function J2(e, t, i) {
  const n = e.subarray(t, t + i);
  let s = "";
  for (const r of n) {
    if (r === 0 || r === 32) {
      if (s) break;
      continue;
    }
    s += String.fromCharCode(r);
  }
  return s ? Number.parseInt(s, 8) : 0;
}
function C2(e, t, i) {
  let n = t;
  const s = t + i;
  for (; n < s && e[n] !== 0; ) n += 1;
  return P3.decode(e.subarray(t, n));
}
function q2(e) {
  for (let t = 0; t < e.length; t += 1)
    if (e[t] !== 0) return false;
  return true;
}
function mt(e, t) {
  const i = J2(e, 148, 8);
  let n = 0;
  for (let s = 0; s < m2; s += 1)
    n += s >= 148 && s < 156 ? 32 : e[s];
  if (i !== n)
    throw new Error(
      `Malformed tar stream: invalid header checksum for ${t || "unknown"}`
    );
}
var Tt = class {
  constructor({ onEntry: t } = {}) {
    this.leftover = new Uint8Array(0), this.state = "header", this.entry = null, this.dataChunks = [], this.dataFilled = 0, this.padRemaining = 0, this.pendingLongName = null, this.pendingPax = null, this.zeroBlocks = 0, this.maxBuffered = 0, this.fileCount = 0, this.dirCount = 0, this.phpCount = 0, this.bytesWritten = 0, this.onEntry = t ?? (() => {
    });
  }
  push(t) {
    if (t != null && t.length)
      if (this.leftover.length === 0)
        this.leftover = t;
      else {
        const i = new Uint8Array(
          this.leftover.length + t.length
        );
        i.set(this.leftover, 0), i.set(t, this.leftover.length), this.leftover = i;
      }
    this.track(), this.drain();
  }
  end() {
    var t, i, n, s;
    if (this.state === "data" && this.dataFilled < (((t = this.entry) == null ? void 0 : t.size) ?? 0))
      throw new Error(
        `Truncated tar stream: entry ${(i = this.entry) == null ? void 0 : i.name} expected ${(n = this.entry) == null ? void 0 : n.size} bytes, got ${this.dataFilled}`
      );
    if (this.state === "pad" && this.padRemaining > 0)
      throw new Error(
        `Truncated tar stream: entry ${((s = this.entry) == null ? void 0 : s.name) ?? "unknown"} missing ${this.padRemaining} padding bytes`
      );
    if (this.state === "header" && this.leftover.length > 0)
      throw new Error(
        `Truncated tar stream: incomplete header (${this.leftover.length} bytes)`
      );
    if (this.pendingLongName !== null)
      throw new Error(
        "Malformed tar stream: GNU longlink entry was not followed by a file entry"
      );
    if (this.pendingPax !== null)
      throw new Error(
        "Malformed tar stream: PAX header was not followed by a file entry"
      );
    if (this.zeroBlocks < 2)
      throw new Error(
        "Truncated tar stream: missing end-of-archive marker"
      );
    return this.stats();
  }
  stats() {
    return {
      fileCount: this.fileCount,
      dirCount: this.dirCount,
      phpCount: this.phpCount,
      bytesWritten: this.bytesWritten,
      maxBuffered: this.maxBuffered
    };
  }
  track(t = 0) {
    const i = this.leftover.length + this.dataFilled + t;
    i > this.maxBuffered && (this.maxBuffered = i);
  }
  drain() {
    let t = true;
    for (; t; ) {
      if (t = false, this.state === "header") {
        if (this.leftover.length < m2) break;
        const i = this.leftover.subarray(0, m2);
        if (this.leftover = this.leftover.subarray(m2), q2(i)) {
          this.zeroBlocks += 1, this.zeroBlocks >= 2 && (this.state = "done"), t = true;
          continue;
        }
        this.zeroBlocks = 0;
        const n = J2(i, 124, 12), s = String.fromCharCode(i[156]) || "0", r = C2(i, 0, 100), a2 = C2(i, 345, 155);
        if (mt(i, r), !Number.isFinite(n) || n < 0)
          throw new Error(
            `Malformed tar stream: invalid size for ${r}`
          );
        this.entry = {
          name: r,
          prefix: a2,
          size: n,
          typeflag: s,
          isLongLink: s === "L",
          isPaxHeader: s === "x"
        }, this.dataChunks = [], this.dataFilled = 0, n > 0 ? this.state = "data" : this.finishEntry(), t = true;
        continue;
      }
      if (this.state === "data") {
        const i = this.entry.size - this.dataFilled;
        if (i <= 0) {
          this.finishEntry();
          continue;
        }
        if (this.leftover.length === 0) break;
        const n = Math.min(i, this.leftover.length);
        this.dataChunks.push(this.leftover.subarray(0, n)), this.dataFilled += n, this.leftover = this.leftover.subarray(n), this.track(), this.dataFilled === this.entry.size && this.finishEntry(), t = true;
        continue;
      }
      if (this.state === "pad") {
        if (this.padRemaining === 0) {
          this.state = "header", t = true;
          continue;
        }
        if (this.leftover.length === 0) break;
        const i = Math.min(this.padRemaining, this.leftover.length);
        this.leftover = this.leftover.subarray(i), this.padRemaining -= i, t = true;
        continue;
      }
      if (this.state === "done") {
        if (this.leftover.length === 0) break;
        if (!q2(this.leftover))
          throw new Error(
            "Malformed tar stream: non-zero data after end-of-archive marker"
          );
        this.leftover = new Uint8Array(0), t = true;
      }
    }
  }
  concatData() {
    const t = new Uint8Array(this.dataFilled);
    let i = 0;
    for (const n of this.dataChunks)
      t.set(n, i), i += n.length;
    return t;
  }
  finishEntry() {
    var o;
    const t = this.entry, i = this.concatData();
    this.dataChunks = [];
    const n = t.size % m2;
    if (this.padRemaining = n === 0 ? 0 : m2 - n, this.state = this.padRemaining > 0 ? "pad" : "header", this.dataFilled = 0, this.entry = null, t.isLongLink) {
      this.pendingLongName = P3.decode(i).replace(/\0.*$/, "");
      return;
    }
    if (t.isPaxHeader) {
      this.pendingPax = bt(i);
      return;
    }
    const s = ((o = this.pendingPax) == null ? void 0 : o.path) ?? this.pendingLongName ?? (t.prefix ? `${t.prefix}/${t.name}` : t.name);
    this.pendingLongName = null, this.pendingPax = null;
    const r = t.typeflag === "5" || s.endsWith("/"), a2 = gt(s);
    if (a2) {
      if (r) {
        this.dirCount += 1, this.onEntry({ type: "dir", path: a2 });
        return;
      }
      if (t.typeflag !== "0" && t.typeflag !== "\0")
        throw new Error(
          `Unsupported tar entry type "${t.typeflag}" for ${s}`
        );
      this.fileCount += 1, this.bytesWritten += i.length, a2.endsWith(".php") && (this.phpCount += 1), this.onEntry({ type: "file", path: a2, data: i });
    }
  }
};
async function Et(e, t) {
  const i = Lt(e);
  if (typeof DecompressionStream < "u")
    try {
      const n = new DecompressionStream(t);
      return i.pipeThrough(n);
    } catch {
    }
  if (t === "zstd") {
    const { ZSTDDecoder: n } = await Promise.resolve().then(() => (init_zstddec_stream_modern_C2FJ34ZP(), zstddec_stream_modern_C2FJ34ZP_exports)), s = new n();
    await s.init();
    const r = await yt(e), a2 = s.decodeStreaming(r);
    let o = false;
    return new ReadableStream({
      pull(_4) {
        if (o) {
          _4.close();
          return;
        }
        try {
          for (; ; ) {
            const { value: c3, done: u2 } = a2.next();
            if (u2) {
              o = true, _4.close();
              return;
            }
            if (c3.length !== 0) {
              _4.enqueue(c3);
              return;
            }
          }
        } catch (c3) {
          o = true, _4.error(c3);
        }
      },
      cancel() {
        var _4;
        o = true, (_4 = a2.return) == null || _4.call(a2, void 0);
      }
    });
  }
  throw new Error(`No streaming decoder available for codec "${t}".`);
}
async function wt(e, t, i, n = {}) {
  const { onProgress: s = () => {
  }, overwriteFiles: r = true } = n, a2 = String(i).replace(/\/+$/, "") || "/", o = /* @__PURE__ */ new Set(), _4 = (p2) => {
    if (!p2 || o.has(p2)) return;
    t.mkdirTree(p2);
    let d2 = p2;
    for (; d2 && !o.has(d2); ) {
      o.add(d2);
      const f = W(d2);
      d2 = f && f !== d2 ? f : null;
    }
  }, c3 = new Tt({
    onEntry: (p2) => {
      var f;
      const d2 = m(a2, p2.path);
      if (p2.type === "dir") {
        _4(d2);
        return;
      }
      _4(W(d2)), !(!r && ((f = t.fileExists) != null && f.call(t, d2))) && (t.writeFile(d2, p2.data), c3.fileCount % 1e3 === 0 && s({
        fileCount: c3.fileCount,
        bytes: c3.bytesWritten
      }));
    }
  });
  _4(a2);
  const u2 = e.getReader();
  for (; ; ) {
    const { done: p2, value: d2 } = await u2.read();
    if (p2) break;
    d2 && c3.push(d2);
  }
  return c3.end();
}
function Lt(e) {
  return ee2(e) ? e : new Blob([e]).stream();
}
async function yt(e) {
  if (!ee2(e))
    return [e];
  const t = e.getReader(), i = [];
  try {
    for (; ; ) {
      const { done: n, value: s } = await t.read();
      if (n) break;
      i.push(s);
    }
    return i;
  } catch (n) {
    throw await t.cancel(n).catch(() => {
    }), n;
  } finally {
    t.releaseLock();
  }
}
function ee2(e) {
  return typeof ReadableStream < "u" && e instanceof ReadableStream;
}
function bt(e) {
  const t = P3.decode(e), i = {};
  let n = 0;
  for (; n < t.length; ) {
    const s = t.indexOf(" ", n);
    if (s === -1)
      throw new Error("Malformed tar stream: invalid PAX record length");
    const r = Number.parseInt(t.slice(n, s), 10);
    if (!Number.isFinite(r) || r <= 0)
      throw new Error("Malformed tar stream: invalid PAX record length");
    const a2 = n + r;
    if (a2 > t.length || t[a2 - 1] !== `
`)
      throw new Error("Malformed tar stream: truncated PAX record");
    const o = t.slice(s + 1, a2 - 1), _4 = o.indexOf("=");
    if (_4 === -1)
      throw new Error("Malformed tar stream: invalid PAX record");
    i[o.slice(0, _4)] = o.slice(_4 + 1), n = a2;
  }
  return i;
}
var te2 = `<?php

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
`;
async function Ot(e, t) {
  const i = m(t, "wp-config.php");
  !e.fileExists(i) && e.fileExists(m(t, "wp-config-sample.php")) && await e.writeFile(
    i,
    await e.readFileAsBuffer(
      m(t, "wp-config-sample.php")
    )
  ), e.fileExists(i) && await Nt(e, i, {
    DB_NAME: "wordpress"
  });
}
async function Nt(e, t, i) {
  const n = Object.keys(i), s = L({ wpConfigPath: t, constantNames: n }), r = await e.run({
    code: `${te2}
		$transformer = WP_Config_Transformer::from_file(${s.wpConfigPath});
		$missing = [];
		foreach (${s.constantNames} as $name) {
			if (!$transformer->constant_exists($name)) {
				$missing[] = $name;
			}
		}
		echo json_encode($missing);
		`
  });
  if (r.errors.length > 0)
    throw new Error("Failed to check wp-config.php for constants.");
  let a2;
  try {
    a2 = JSON.parse(r.text);
  } catch {
    throw new Error(
      `Failed to parse wp-config.php constant check output: ${r.text}`
    );
  }
  for (const o of a2)
    await e.defineConstant(o, i[o]);
}
async function O2(e, {
  usesSqlite: t,
  hasCustomDatabasePath: i
}) {
  const n = await e.getPrimaryPhp();
  if (n.isFile("/internal/shared/preload/0-sqlite.php"))
    return;
  const s = m(
    e.documentRoot,
    "wp-content/mu-plugins/sqlite-database-integration"
  );
  if (!n.isDir(s) && !t && !i && !At(n))
    throw new Error("Error connecting to the MySQL database.");
}
function At(e) {
  const t = m(e.documentRoot, "wp-config.php");
  if (!e.isFile(t)) return false;
  const i = e.readFileAsText(t), n = i.match(
    /define\s*\(\s*['"]DB_NAME['"]\s*,\s*['"]([^'"]*)['"]/
  ), s = i.match(
    /define\s*\(\s*['"]DB_USER['"]\s*,\s*['"]([^'"]*)['"]/
  );
  return !n || !s ? false : n[1] !== "database_name_here" && s[1] !== "username_here";
}
var ne2 = [
  "fsockopen",
  "pfsockopen",
  "curl_init",
  "curl_exec",
  "curl_multi_exec",
  "mail"
];
async function Pt(e, t) {
  var r, a2;
  if (!isLegacyPHPVersion(t.phpVersion)) return;
  const i = (((r = t.phpIniEntries) == null ? void 0 : r.disable_functions) ?? "").split(",").map((o) => o.trim()).filter((o) => o), s = {
    disable_functions: Array.from(
      /* @__PURE__ */ new Set([...i, ...ne2])
    ).join(","),
    allow_url_fopen: "0"
  };
  (a2 = t.phpIniEntries) != null && a2["date.timezone"] || (s["date.timezone"] = "UTC"), await setPhpIniEntries(e, s);
}
async function Ut(e, t) {
  var a2, o;
  const i = await e.getPrimaryPhp();
  if ((a2 = t.hooks) != null && a2.beforeWordPressFiles && await t.hooks.beforeWordPressFiles(i), t.wordPressZip && await re2(i, await t.wordPressZip, {
    expectedFileCount: t.wordPressBundleFileCount
  }), t.constants)
    for (const _4 in t.constants)
      i.defineConstant(_4, t.constants[_4]);
  i.defineConstant("WP_HOME", t.siteUrl), i.defineConstant("WP_SITEURL", t.siteUrl), await St(i, e.documentRoot), await xe2(i, e.documentRoot), (o = t.hooks) != null && o.beforeDatabaseSetup && await t.hooks.beforeDatabaseSetup(i);
  let n = false;
  t.sqliteIntegrationPluginZip && (n = true, await se2(
    i,
    await t.sqliteIntegrationPluginZip,
    { phpVersion: t.phpVersion }
  ), await Rt(i, e.documentRoot));
  const s = t.wordpressInstallMode ?? "download-and-install", r = !!t.dataSqlPath;
  return (s === "download-and-install" || s === "install-from-existing-files" || // Legacy PHP: isWordPressInstalled() can trigger a WASM trap
  // (not a PHP exception) on old WordPress (< 3.0) and corrupt
  // the runtime beyond recovery. Always run the installer; it
  // is idempotent and its post-install fixups short-circuit
  // cheaply when the schema already exists.
  s === "install-from-existing-files-if-needed") && (await O2(e, {
    usesSqlite: n,
    hasCustomDatabasePath: r
  }), await xt(i, e)), e;
}
async function St(e, t) {
  const i = m(t, "wp-config.php"), n = m(t, "wp-config-sample.php");
  !e.fileExists(i) && e.fileExists(n) && await e.writeFile(
    i,
    await e.readFileAsBuffer(n)
  );
}
async function Rt(e, t) {
  const i = m(t, "wp-content"), n = m(i, "db.php");
  e.isDir(i) && !e.fileExists(n) && await e.writeFile(n, lt());
}
async function xt(e, t) {
  try {
    await vt(e);
  } catch (i) {
    import_logger6.logger.warn("Legacy PHP WordPress installation error:", i);
  }
  await _t(e, t.absoluteUrl);
}
async function vt(e) {
  var r, a2, o, _4, c3, u2;
  const t = Dt(e, e.documentRoot);
  if (t !== null) {
    const p2 = parseFloat(t);
    if (p2 < 2.1)
      return;
    if (p2 <= 3) {
      await kt(e);
      return;
    }
  }
  const i = {
    disable_functions: ne2.join(","),
    allow_url_fopen: "0",
    error_reporting: String(Re2)
  }, n = await withPHPIniValues(
    e,
    i,
    async () => await e.request({
      url: "/wp-admin/install.php?step=2",
      method: "POST",
      body: {
        language: "en",
        prefix: "wp_",
        weblog_title: "My WordPress Website",
        user_name: "admin",
        admin_password: "password",
        admin_password2: "password",
        Submit: "Install WordPress",
        pw_weak: "1",
        admin_email: "admin@localhost.com"
      }
    })
  );
  if (!(((r = n.text) == null ? void 0 : r.includes("Success")) || ((a2 = n.text) == null ? void 0 : a2.includes("successful")) || ((o = n.text) == null ? void 0 : o.includes("Finished")) || ((_4 = n.text) == null ? void 0 : _4.includes("Already Installed")) || ((c3 = n.text) == null ? void 0 : c3.includes("already have WordPress installed")) || false))
    throw new Error(
      `Failed to install WordPress \u2013 installer responded with "${(u2 = n.text) == null ? void 0 : u2.substring(
        0,
        100
      )}"`
    );
  await It(e);
}
async function It(e) {
  try {
    (await e.run({
      code: `<?php
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
			`,
      env: { DOCUMENT_ROOT: e.documentRoot }
    })).text !== "1" && import_logger6.logger.warn(
      "Failed to default to pretty permalinks after WP install."
    );
  } catch {
    import_logger6.logger.warn(
      "Failed to set pretty permalinks after WP install (non-fatal)."
    );
  }
}
async function kt(e) {
  try {
    await e.run({
      code: `<?php
				define('WP_INSTALLING', true);
				error_reporting(${A5});
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
			`,
      env: { DOCUMENT_ROOT: e.documentRoot }
    });
  } catch (t) {
    import_logger6.logger.warn("runDbDeltaOnly failed (non-fatal):", t);
  }
}
function Dt(e, t) {
  const i = m(t, "wp-includes/version.php");
  if (!e.fileExists(i)) return null;
  const s = e.readFileAsText(i).match(/\$wp_version\s*=\s*['"]([^'"]+)['"]/);
  return s ? s[1] : null;
}
async function sn(e) {
  const t = await Ct(e);
  return await Ft(t, e), t;
}
async function Ft(e, t) {
  var a2, o, _4, c3, u2, p2, d2, f, y4, T2, U4, S3, R4, x3, v3, I4, k2;
  if (isLegacyPHPVersion(t.phpVersion))
    return Ut(e, t);
  (a2 = t.onProgress) == null || a2.call(t, "Creating PHP runtime");
  const i = await e.getPrimaryPhp();
  if ((o = t.hooks) != null && o.beforeWordPressFiles && ((_4 = t.onProgress) == null || _4.call(t, "Mounting WordPress files"), await t.hooks.beforeWordPressFiles(i)), t.wordPressZip && ((c3 = t.onProgress) == null || c3.call(t, "Extracting WordPress files"), await re2(i, await t.wordPressZip, {
    expectedFileCount: t.wordPressBundleFileCount
  })), t.constants) {
    (u2 = t.onProgress) == null || u2.call(t, "Defining WordPress constants");
    for (const g2 in t.constants)
      i.defineConstant(g2, t.constants[g2]);
  }
  t.dataSqlPath && (i.defineConstant("DB_PATH", t.dataSqlPath), i.defineConstant("DB_DIR", W(t.dataSqlPath)), i.defineConstant("DB_FILE", j(t.dataSqlPath))), i.defineConstant("WP_HOME", t.siteUrl), i.defineConstant("WP_SITEURL", t.siteUrl), (p2 = t.onProgress) == null || p2.call(t, "Starting PHP"), await Ot(i, e.documentRoot), (d2 = t.hooks) != null && d2.beforeDatabaseSetup && ((f = t.onProgress) == null || f.call(t, "Preparing database files"), await t.hooks.beforeDatabaseSetup(i));
  let n = false;
  t.sqliteIntegrationPluginZip && (n = true, (y4 = t.onProgress) == null || y4.call(t, "Installing SQLite integration"), await se2(
    i,
    await t.sqliteIntegrationPluginZip,
    { phpVersion: t.phpVersion }
  ), await Se2(i, e.documentRoot));
  const s = t.wordpressInstallMode ?? "download-and-install", r = !!t.dataSqlPath;
  if (["download-and-install", "install-from-existing-files"].includes(
    s
  )) {
    (T2 = t.onProgress) == null || T2.call(t, "Checking database prerequisites"), await O2(e, {
      usesSqlite: n,
      hasCustomDatabasePath: r
    });
    try {
      (U4 = t.onProgress) == null || U4.call(t, "Running WordPress installer"), await W3(i);
    } catch (g2) {
      throw r || await E4(e), g2;
    }
    r || ((S3 = t.onProgress) == null || S3.call(t, "Validating database connection"), await E4(e));
  } else if (s === "install-from-existing-files-if-needed") {
    if ((R4 = t.onProgress) == null || R4.call(t, "Checking database prerequisites"), await O2(e, {
      usesSqlite: n,
      hasCustomDatabasePath: r
    }), (x3 = t.onProgress) == null || x3.call(t, "Checking existing WordPress installation"), !await ie2(i))
      try {
        (v3 = t.onProgress) == null || v3.call(t, "Running WordPress installer"), await W3(i);
      } catch (g2) {
        throw r || await E4(e), g2;
      }
    r || ((I4 = t.onProgress) == null || I4.call(t, "Validating database connection"), await E4(e));
  }
  return (k2 = t.onProgress) == null || k2.call(t, "WordPress boot complete"), e;
}
async function E4(e) {
  const t = await e.getPrimaryPhp();
  if (await Gt(t))
    return;
  if (t.isFile("/internal/shared/preload/0-sqlite.php"))
    throw new Error("Error connecting to the SQLite database.");
  const n = m(
    e.documentRoot,
    "wp-content/mu-plugins/sqlite-database-integration"
  );
  throw t.isDir(n) ? new Error("Error connecting to the SQLite database.") : new Error("Error connecting to the MySQL database.");
}
async function Ct(e) {
  qt(e);
  const t = e.spawnHandler ?? sandboxedSpawnHandlerFactory;
  async function i(s, r = false) {
    const a2 = await e.createPhpRuntime(r), o = new PHP(a2);
    if (e.sapiName && o.setSapiName(e.sapiName), s && (o.requestHandler = s), e.phpIniEntries && await setPhpIniEntries(o, e.phpIniEntries), await Pt(o, {
      phpVersion: e.phpVersion,
      phpIniEntries: e.phpIniEntries
    }), o.defineConstant("WP_SQLITE_AST_DRIVER", true), e.constants)
      for (const _4 in e.constants)
        o.defineConstant(_4, e.constants[_4]);
    return r && /**
    * Only the first PHP instance of the first worker created
    * during WordPress boot writes these files – otherwise we'll keep
    * overwriting them with concurrent writers living in other worker
    * threads.
    *
    * The `.boot-files-written` file is our primitive synchronization
    * mechanism. It works, because secondary workers are only booted
    * once the primary worker has fully booted.
    */
    !o.isFile("/internal/.boot-files-written") && (await Xt(o, {
      phpVersion: e.phpVersion
    }), await writeFiles(o, "/", e.createFiles || {}), await Vt(
      o,
      m(new URL(e.siteUrl).pathname, "phpinfo.php")
    ), await writeFiles(o, "/internal", {
      ".boot-files-written": ""
    })), t && await o.setSpawnHandler(
      t(
        s ? () => s.instanceManager.acquirePHPInstance() : void 0
      )
    ), o.enableRuntimeRotation({
      recreateRuntime: e.createPhpRuntime,
      maxRequests: 400
    }), e.onPHPInstanceCreated && await e.onPHPInstanceCreated(o, { isPrimary: r }), o;
  }
  const n = new PHPRequestHandler({
    documentRoot: e.documentRoot || "/wordpress",
    absoluteUrl: e.siteUrl,
    rewriteRules: Ht,
    pathAliases: e.pathAliases,
    getFileNotFoundAction: e.getFileNotFoundAction ?? Wt,
    cookieStore: e.cookieStore,
    /**
     * If maxPhpInstances is 1, the PHPRequestHandler constructor needs
     * a PHP instance. Internally, it creates a SinglePHPInstanceManager
     * and uses the same PHP instance to handle all requests.
     */
    php: e.maxPhpInstances === 1 ? await i(void 0, true) : void 0,
    /**
     * If maxPhpInstances is not 1, the PHPRequestHandler constructor needs
     * a PHP factory function. Internally, it creates a PHPProcessManager that
     * maintains a pool of reusable PHP instances.
     */
    phpFactory: e.maxPhpInstances !== 1 ? async ({ isPrimary: s }) => i(n, s) : void 0,
    maxPhpInstances: e.maxPhpInstances
  });
  return n;
}
function qt(e) {
  "SQLITE_JOURNAL_MODE" in (e.constants ?? {}) || (e.constants = {
    ...e.constants,
    SQLITE_JOURNAL_MODE: "DELETE"
  });
}
async function ie2(e) {
  return (await e.run({
    code: `<?php
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
		`,
    env: {
      DOCUMENT_ROOT: e.documentRoot
    }
  })).text === "1";
}
async function W3(e) {
  var n;
  const t = await withPHPIniValues(
    e,
    {
      disable_functions: "fsockopen",
      allow_url_fopen: "0"
    },
    async () => await e.request({
      url: "/wp-admin/install.php?step=2",
      method: "POST",
      body: {
        language: "en",
        prefix: "wp_",
        weblog_title: "My WordPress Website",
        user_name: "admin",
        admin_password: "password",
        // The installation wizard demands typing the same password twice
        admin_password2: "password",
        Submit: "Install WordPress",
        pw_weak: "1",
        admin_email: "admin@localhost.com"
      }
    })
  );
  if (!await ie2(e))
    throw new Error(
      `Failed to install WordPress \u2013 installer responded with "${(n = t.text) == null ? void 0 : n.substring(
        0,
        100
      )}"`
    );
  (await e.run({
    code: `<?php
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
		`,
    env: {
      DOCUMENT_ROOT: e.documentRoot
    }
  })).text !== "1" && import_logger6.logger.warn("Failed to default to pretty permalinks after WP install.");
}
function Wt(e) {
  return {
    type: "internal-redirect",
    uri: "/index.php"
  };
}
async function Gt(e) {
  return (await e.run({
    code: `<?php
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
		`,
    env: {
      DOCUMENT_ROOT: e.documentRoot
    }
  })).text === "1";
}
var Ht = [
  /**
   * Substitutes the multisite WordPress rewrite rule:
   *
   * RewriteBase /
   * RewriteRule ^([_0-9a-zA-Z-]+/)?(wp-(content|admin|includes).*) $2 [L]
   */
  {
    match: new RegExp(
      /* The .htaccess rule does not have an explicit initial slash,
      	but it's still implied by `RewriteBase /` */
      "^(/[_0-9a-zA-Z-]+)?(/wp-(content|admin|includes)/.*)"
    ),
    replacement: "$2"
  }
];
async function Xt(e, t = {}) {
  if (isLegacyPHPVersion(t.phpVersion))
    return pe(e);
  await e.mkdir("/internal/shared/mu-plugins"), await e.writeFile(
    "/internal/shared/preload/env.php",
    `<?php

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
    `
  ), await e.writeFile(
    "/internal/shared/mu-plugins/1-auto-login.php",
    `<?php
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
			 * However, if they have been sent already \u2013 e.g. there a PHP
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
		`
  ), await V3(e), await e.writeFile(
    "/internal/shared/preload/error-handler.php",
    `<?php
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
		})();`
  );
}
async function Vt(e, t = "/phpinfo.php") {
  await e.writeFile(
    "/internal/shared/preload/phpinfo.php",
    `<?php
    // Render PHPInfo if the requested page is /phpinfo.php
    if ( isset($_SERVER['REQUEST_URI']) && ${q(
      t
    )} === $_SERVER['REQUEST_URI'] ) {
        phpinfo();
        exit;
    }
    `
  );
}
async function se2(e, t, i = {}) {
  if (isLegacyPHPVersion(i.phpVersion))
    return dt(e, t, i);
  await e.isDir("/tmp/sqlite-database-integration") && await e.rmdir("/tmp/sqlite-database-integration", {
    recursive: true
  }), await e.mkdir("/tmp/sqlite-database-integration"), await U3(e, t, "/tmp/sqlite-database-integration");
  const n = "/internal/shared/sqlite-database-integration", s = `/tmp/sqlite-database-integration/${(await e.listFiles("/tmp/sqlite-database-integration"))[0]}`;
  await e.mv(s, n);
  const r = m(
    n,
    "wp-includes/sqlite/class-wp-sqlite-db.php"
  );
  if (await e.fileExists(r)) {
    const p2 = await e.readFileAsText(r), d2 = p2.replace(
      "private $allow_unsafe_unquoted_parameters",
      "protected $allow_unsafe_unquoted_parameters"
    );
    d2 !== p2 && await e.writeFile(r, d2);
  }
  await e.defineConstant("SQLITE_MAIN_FILE", "1");
  const o = (await e.readFileAsText(
    m(n, "db.copy")
  )).replace(
    "'{SQLITE_IMPLEMENTATION_FOLDER_PATH}'",
    q(n)
  ).replace(
    "'{SQLITE_PLUGIN}'",
    q(m(n, "load.php"))
  ), _4 = m(await e.documentRoot, "wp-content/db.php"), c3 = `
		// Do not preload this if WordPress comes with a custom db.php file.
		if(file_exists(${q(_4)})) {
			return;
		}
		`, u2 = "/internal/shared/mu-plugins/sqlite-database-integration.php";
  await e.writeFile(
    u2,
    `<?php${c3}?>` + o
  ), await e.writeFile(
    "/internal/shared/preload/0-sqlite.php",
    Yt(c3, u2)
  ), await e.writeFile(
    "/internal/shared/mu-plugins/sqlite-test.php",
    `<?php
		global $wpdb;
		if(!($wpdb instanceof WP_SQLite_DB)) {
			var_dump(isset($wpdb));
			die("SQLite integration not loaded " . get_class($wpdb));
		}
		`
  );
}
function Yt(e, t) {
  return `<?php
	if(!function_exists('mysqli_connect')) {
		function mysqli_connect() {}
	}

	${e}

	${Y2(`require_once ${q(t)};`)}

		`;
}
async function re2(e, t, i = {}) {
  e.mkdir("/tmp/unzipped-wordpress");
  const n = new Uint8Array(await t.slice(0, 4).arrayBuffer());
  if ($t(n)) {
    const a2 = await Et(t.stream(), "zstd"), o = await wt(
      a2,
      e,
      "/tmp/unzipped-wordpress"
    );
    if (i.expectedFileCount != null && o.fileCount !== i.expectedFileCount)
      throw new Kt(
        o.fileCount,
        i.expectedFileCount
      );
  } else
    await U3(e, t, "/tmp/unzipped-wordpress");
  e.fileExists("/tmp/unzipped-wordpress/wordpress.zip") && await U3(
    e,
    "/tmp/unzipped-wordpress/wordpress.zip",
    "/tmp/unzipped-wordpress"
  );
  let s = e.fileExists("/tmp/unzipped-wordpress/wordpress") ? "/tmp/unzipped-wordpress/wordpress" : e.fileExists("/tmp/unzipped-wordpress/build") ? "/tmp/unzipped-wordpress/build" : "/tmp/unzipped-wordpress";
  if (!e.fileExists(m(s, "wp-config-sample.php"))) {
    const a2 = e.listFiles(s);
    if (a2.length) {
      const o = a2[0];
      e.fileExists(
        m(s, o, "wp-config-sample.php")
      ) && (s = m(s, o));
    }
  }
  const r = (a2, o, _4) => {
    if (_4.isDir(a2) && _4.isDir(o))
      for (const c3 of _4.listFiles(a2)) {
        const u2 = m(a2, c3), p2 = m(o, c3);
        r(u2, p2, _4);
      }
    else {
      if (_4.fileExists(o)) {
        const c3 = a2.replace(
          /^\/tmp\/unzipped-wordpress\//,
          "/"
        );
        import_logger6.logger.warn(
          `Cannot unzip WordPress files at ${o}: ${c3} already exists.`
        );
        return;
      }
      _4.mv(a2, o);
    }
  };
  r(s, e.documentRoot, e), e.fileExists(s) && e.rmdir(s, { recursive: true }), !e.fileExists(m(e.documentRoot, "wp-config.php")) && e.fileExists(m(e.documentRoot, "wp-config-sample.php")) && e.writeFile(
    m(e.documentRoot, "wp-config.php"),
    e.readFileAsText(
      m(e.documentRoot, "/wp-config-sample.php")
    )
  );
}
var Kt = class extends Error {
  constructor(t, i) {
    super(
      `WordPress core bundle file-count parity check failed: extracted ${t} files, expected ${i}. The download may be truncated or corrupt.`
    ), this.name = "WordPressBundleFileCountMismatchError";
  }
};
var Qt = R2(fetch);

// server-source.mjs
var PREFIX = "/wordpresspreview";
var here = typeof __dirname === "string" ? __dirname : import_node_path.default.dirname(new URL(__tbv_import_meta_url).pathname);
var instance;
var queued = 0;
var tail = Promise.resolve();
function allowedPath(p2) {
  return /^\/(?:|shop\/?|product\/[a-z0-9-]+\/?|cart\/?|about\/?|contact\/?|faq\/?|shipping-policy\/?|refund-policy\/?|privacy-policy\/?|terms-and-conditions\/?|shipping-prices\/?)$/.test(p2);
}
var queryKeys = /* @__PURE__ */ new Set(["warehouse", "s", "post_type", "paged", "product-page", "attribute_dosage", "attribute_pack-size", "attribute_warehouse", "attribute_formulation", "variation_id", "product_id", "add-to-cart", "quantity", "remove_item", "undo_item", "_wpnonce", "wc-ajax"]);
var cartCookie = /^(?:wp_woocommerce_session_[a-z0-9]+|woocommerce_items_in_cart|woocommerce_cart_hash)$/i;
function safeCookies(input = "") {
  return input.split(";").map((x3) => x3.trim()).filter((x3) => cartCookie.test(x3.split("=")[0])).join("; ").slice(0, 6e3);
}
function reply(res, status, body, type = "text/plain; charset=utf-8") {
  res.statusCode = status;
  res.setHeader("Content-Type", type);
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  res.end(body);
}
async function boot(origin) {
  if (instance?.origin === origin) return instance;
  if (instance) {
    await instance.handler[Symbol.asyncDispose]();
    import_node_fs2.default.rmSync(instance.tmp, { recursive: true, force: true });
    instance = null;
  }
  const tmp = import_node_fs2.default.mkdtempSync(import_node_path.default.join(import_node_os2.default.tmpdir(), "tbv-wp-preview-"));
  import_node_fs2.default.cpSync(import_node_path.default.join(here, "site/wp-content/database"), import_node_path.default.join(tmp, "database"), { recursive: true });
  const salts = Object.fromEntries(["AUTH_KEY", "SECURE_AUTH_KEY", "LOGGED_IN_KEY", "NONCE_KEY", "AUTH_SALT", "SECURE_AUTH_SALT", "LOGGED_IN_SALT", "NONCE_SALT"].map((key) => [key, (0, import_node_crypto.randomBytes)(32).toString("hex")]));
  const handler2 = await sn({
    createPhpRuntime: () => loadNodeRuntime("8.3", { extensions: [], emscriptenOptions: { processId: process.pid } }),
    phpVersion: "8.3",
    maxPhpInstances: 1,
    siteUrl: origin + PREFIX,
    cookieStore: false,
    wordpressInstallMode: "do-not-attempt-installing",
    sqliteIntegrationPluginZip: new File([import_node_fs2.default.readFileSync(import_node_path.default.join(here, "sqlite.zip"))], "sqlite.zip"),
    constants: { ...salts, WP_MEMORY_LIMIT: "512M", WP_MAX_MEMORY_LIMIT: "512M", DISABLE_WP_CRON: true, AUTOMATIC_UPDATER_DISABLED: true, WP_HTTP_BLOCK_EXTERNAL: true, WP_DEBUG: false, WP_DEBUG_DISPLAY: false, DISALLOW_FILE_MODS: true, DISALLOW_FILE_EDIT: true },
    phpIniEntries: { memory_limit: "512M", display_errors: "0", log_errors: "1", allow_url_fopen: "0", allow_url_include: "0" },
    hooks: { beforeWordPressFiles: async (php2) => {
      await php2.mount("/wordpress", createNodeFsMountHandler(import_node_path.default.join(here, "site")));
      await php2.mount("/wordpress/wp-content/database", createNodeFsMountHandler(import_node_path.default.join(tmp, "database")));
    } }
  });
  const php = await handler2.getPrimaryPhp();
  const check = await php.run({ code: "<?php require '/wordpress/wp-load.php'; echo json_encode(['wp'=>$GLOBALS['wp_version'],'woo'=>defined('WC_VERSION')?WC_VERSION:null,'preview'=>defined('TBV_MIGRATION_PREVIEW'),'products'=>(int)wp_count_posts('product')->publish]);" });
  const facts = JSON.parse(check.text);
  if (check.exitCode !== 0 || facts.wp !== "7.1.3" || facts.woo !== "11.2.1" || !facts.preview || facts.products !== 66) throw Error("Preview snapshot check failed");
  instance = { origin, handler: handler2, tmp, facts };
  return instance;
}
async function bodyParams(req) {
  let raw = req.body;
  if (raw === void 0) {
    const chunks = [];
    let size = 0;
    for await (const chunk of req) {
      size += chunk.length;
      if (size > 16384) throw Error("Request too large");
      chunks.push(chunk);
    }
    raw = Buffer.concat(chunks);
  }
  if (Buffer.isBuffer(raw)) raw = raw.toString("utf8");
  if (raw && typeof raw === "object") return new URLSearchParams(Object.entries(raw).map(([k2, v3]) => [k2, String(v3)]));
  if (String(raw || "").length > 16384) throw Error("Request too large");
  return new URLSearchParams(raw || "");
}
async function preview(req, res) {
  const host = String(req.headers.host || "").toLowerCase();
  const local = !process.env.VERCEL && /^127\.0\.0\.1:\d+$/.test(host);
  if (!local && !/^(?:10bottlevalue\.co|www\.10bottlevalue\.co|10-bottle-value-[a-z0-9]+-10bottlevaluecos-projects\.vercel\.app)$/.test(host)) return reply(res, 400, "Invalid preview host");
  const origin = (local ? "http://" : "https://") + host;
  let input;
  try {
    input = new URL(req.url, origin);
  } catch {
    return reply(res, 400, "Invalid request");
  }
  const routed = input.pathname === PREFIX || input.pathname.startsWith(PREFIX + "/");
  const route = routed ? input.pathname.slice(PREFIX.length) || "/" : input.searchParams.get("path") || "/";
  input.searchParams.delete("path");
  if (["/my-account", "/my-account/", "/account", "/account/"].includes(route)) {
    res.statusCode = 302;
    res.setHeader("Location", PREFIX + "/shop/");
    res.setHeader("Cache-Control", "no-store");
    res.end();
    return;
  }
  if (!allowedPath(route)) return reply(res, 404, "Preview page not found");
  for (const [k2, v3] of input.searchParams) {
    if (!queryKeys.has(k2) || v3.length > 160) return reply(res, 400, "Unsupported preview query");
  }
  if (input.searchParams.has("wc-ajax") && !["get_variation", "get_refreshed_fragments"].includes(input.searchParams.get("wc-ajax"))) return reply(res, 403, "Ordering is disabled in this preview");
  if (input.searchParams.has("quantity") && (!/^\d+$/.test(input.searchParams.get("quantity")) || Number(input.searchParams.get("quantity")) > 20)) return reply(res, 400, "Preview quantity is limited to 20 kits");
  if (input.searchParams.has("post_type") && input.searchParams.get("post_type") !== "product") return reply(res, 400, "Unsupported preview search");
  if (!["GET", "HEAD", "POST"].includes(req.method)) return reply(res, 405, "Method not allowed");
  let params;
  if (req.method === "POST") {
    if (req.headers.origin && req.headers.origin !== origin) return reply(res, 403, "Preview origin rejected");
    if (!String(req.headers["content-type"] || "").startsWith("application/x-www-form-urlencoded")) return reply(res, 415, "Form requests only");
    try {
      params = await bodyParams(req);
    } catch {
      return reply(res, 413, "Preview request too large");
    }
    const ajax = input.searchParams.get("wc-ajax");
    const safeAjax = ["get_variation", "get_refreshed_fragments"].includes(ajax);
    const adding = /^\d{1,8}$/.test(params.get("add-to-cart") || "");
    const updating = route.replace(/\/$/, "") === "/cart" && params.has("update_cart");
    if (!safeAjax && !adding && !updating) return reply(res, 403, "Ordering and account changes are disabled in this preview");
    for (const [k2, v3] of params) {
      if (v3.length > 250 || !/^(?:add-to-cart|product_id|variation_id|quantity|attribute_(?:dosage|pack-size|warehouse|formulation)|update_cart|woocommerce-cart-nonce|_wp_http_referer|cart\[[a-f0-9]{32}\]\[qty\])$/.test(k2)) return reply(res, 400, "Unsupported preview form");
      if ((k2 === "quantity" || k2.endsWith("[qty]")) && (!/^\d+$/.test(v3) || Number(v3) > 20)) return reply(res, 400, "Preview quantity is limited to 20 kits");
    }
  }
  if (queued >= 8) return reply(res, 429, "Preview busy. Please retry shortly.");
  queued++;
  const before = tail;
  let done;
  tail = new Promise((resolve) => done = resolve);
  await before;
  try {
    const runtime = await boot(origin);
    const target = origin + PREFIX + route + (input.search ? "?" + input.searchParams.toString() : "");
    const result = await runtime.handler.request({ url: target, method: req.method === "HEAD" ? "GET" : req.method, headers: { "host": host, "cookie": safeCookies(req.headers.cookie), "content-type": "application/x-www-form-urlencoded", "user-agent": "10BottleValue anonymous WordPress preview" }, ...params ? { body: new TextEncoder().encode(params.toString()) } : {} });
    if (result.exitCode !== 0) throw Error("WordPress preview render failed");
    res.statusCode = result.httpStatusCode || 200;
    for (const [name, values] of Object.entries(result.headers)) {
      const key = name.toLowerCase();
      if (key === "set-cookie") {
        const safe = values.filter((v3) => cartCookie.test(v3.split("=")[0])).map((v3) => v3.replace(/;\s*Domain=[^;]*/ig, "").replace(/;\s*Path=[^;]*/ig, "") + "; Path=" + PREFIX + "/");
        if (safe.length) res.setHeader("Set-Cookie", safe);
      } else if (["content-type", "location", "link", "vary"].includes(key)) res.setHeader(name, values);
    }
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Robots-Tag", "noindex, nofollow");
    res.setHeader("X-TBV-Preview-Engine", "WordPress " + runtime.facts.wp + "; WooCommerce " + runtime.facts.woo);
    res.end(req.method === "HEAD" ? void 0 : Buffer.from(result.bytes));
  } catch (error) {
    console.error("WordPress preview render error:", error.message);
    reply(res, 503, "The WordPress preview is temporarily unavailable. Please reload.");
  } finally {
    queued--;
    done();
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  allowedPath
});
