import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { once } from "node:events";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));

test("built Replit server exposes the shared card handler and its security boundaries", { timeout: 30000 }, async t => {
  // Build the real entry point; source-only imports miss the relocated import.meta.url.
  // Explicit environment prevents workstation payment credentials entering this test.
  const env = { PATH: process.env.PATH, NODE_ENV: "production", PORT: "1", LOG_LEVEL: "info" };
  const buildEnv = { ...env, ...(process.env.ESBUILD_BINARY_PATH ? { ESBUILD_BINARY_PATH: process.env.ESBUILD_BINARY_PATH } : {}) };
  execFileSync(process.execPath, ["artifacts/api-server/build.mjs"], { cwd: root, env: buildEnv, stdio: "pipe", timeout: 20000 });
  const bootstrap = `
    import { Server } from 'node:net';
    const originalListen = Server.prototype.listen;
    Server.prototype.listen = function (_port, ...args) {
      this.once('listening', () => console.log('TEST_PORT=' + this.address().port));
      return originalListen.call(this, 0, ...args);
    };
    globalThis.fetch = async () => {
      console.error('UNEXPECTED_EXTERNAL_FETCH');
      throw new Error('External network is disabled in this test');
    };
    await import('./artifacts/api-server/dist/index.mjs');
  `;
  const child = spawn(process.execPath, ["--input-type=module", "-e", bootstrap], { cwd: root, env, stdio: ["ignore", "pipe", "pipe"] });
  let output = "";
  const exited = once(child, "exit");
  t.after(async () => {
    if (child.exitCode === null && child.signalCode === null) child.kill();
    await exited;
  });
  const port = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Server did not start: " + output)), 5000);
    for (const stream of [child.stdout, child.stderr]) stream.on("data", data => {
      output += data.toString();
      const match = /TEST_PORT=(\d+)/.exec(output);
      if (match) { clearTimeout(timer); resolve(Number(match[1])); }
    });
    child.once("error", error => { clearTimeout(timer); reject(error); });
    child.once("exit", code => { clearTimeout(timer); reject(new Error(`Server exited ${code}: ${output}`)); });
  });
  const endpoint = `http://127.0.0.1:${port}/api/merit-checkout`;
  const get = await fetch(endpoint);
  assert.equal(get.status, 200);
  assert.equal(get.headers.get("cache-control"), "private, no-store");
  assert.equal(get.headers.get("vary"), "Authorization");
  assert.equal(get.headers.get("x-content-type-options"), "nosniff");
  assert.deepEqual(await get.json(), { ok: true, enabled: false });

  const unauthorized = await fetch(endpoint, {
    method: "POST", headers: { "Content-Type": "application/json", Origin: "https://10bottlevalue.co" }, body: JSON.stringify({ action: "create" }),
  });
  assert.equal(unauthorized.status, 401);
  assert.equal((await unauthorized.json()).ok, false);

  const unsupported = await fetch(endpoint, { method: "DELETE" });
  assert.equal(unsupported.status, 405);
  assert.equal(unsupported.headers.get("allow"), "GET, POST");
  assert.deepEqual(await unsupported.json(), { ok: false, error: "Method not allowed." });

  const rejectedOrigin = await fetch(endpoint, {
    method: "POST", headers: { "Content-Type": "application/json", Origin: "https://untrusted.example" }, body: JSON.stringify({ action: "create" }),
  });
  assert.equal(rejectedOrigin.status, 403);
  assert.equal((await rejectedOrigin.json()).code, "MERIT_ORIGIN_REJECTED");
  assert.doesNotMatch(output, /UNEXPECTED_EXTERNAL_FETCH/);
});
