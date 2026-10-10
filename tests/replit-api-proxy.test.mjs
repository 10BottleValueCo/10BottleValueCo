import { test } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

test("actual Vite config opts into a loopback API proxy without changing request identity", { timeout: 30000 }, async () => {
  // Run configuration evaluation in a child so no workstation business secrets
  // or project .env files can influence it. Only local synthetic HTTP is used.
  const script = `
    import assert from 'node:assert/strict';
    import { createRequire } from 'node:module';
    import { pathToFileURL } from 'node:url';
    import { createServer as createHttpServer } from 'node:http';
    import { mkdtemp, rm } from 'node:fs/promises';
    import { tmpdir } from 'node:os';
    import path from 'node:path';
    const require = createRequire(new URL('./artifacts/10-bottle-value/package.json', import.meta.url));
    const { loadConfigFromFile, createServer } = await import(pathToFileURL(require.resolve('vite')));
    const configFile = path.resolve('artifacts/10-bottle-value/vite.config.ts');
    const load = async () => (await loadConfigFromFile({ command: 'serve', mode: 'test' }, configFile)).config;
    const temp = await mkdtemp(path.join(tmpdir(), 'replit-proxy-test-'));
    let vite, received;
    const api = createHttpServer(async (req, res) => {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      received = { method: req.method, path: req.url, origin: req.headers.origin, host: req.headers.host, body: Buffer.concat(chunks).toString() };
      res.writeHead(202, { 'Content-Type': 'application/json', 'Cache-Control': 'private, no-store' });
      res.end(JSON.stringify({ synthetic: true }));
    });
    try {
      delete process.env.API_PROXY_PORT;
      const plain = await load();
      assert.equal(plain.server.proxy, undefined);
      assert.equal(plain.preview.proxy, undefined);
      for (const value of ['0', '65536', 'invalid', '3100']) {
        process.env.API_PROXY_PORT = value;
        await assert.rejects(load, /API_PROXY_PORT must be a valid local port different from PORT/);
      }
      await new Promise(resolve => api.listen(0, '127.0.0.1', resolve));
      process.env.API_PROXY_PORT = String(api.address().port);
      const configured = await load();
      assert.equal(configured.server.proxy['/api'].target, 'http://127.0.0.1:' + api.address().port);
      assert.equal(configured.server.proxy['/api'].changeOrigin, false);
      assert.deepEqual(configured.preview.proxy, configured.server.proxy);
      vite = await createServer({ ...configured, configFile: false, envDir: temp, cacheDir: path.join(temp, 'cache'),
        logLevel: 'silent', optimizeDeps: { noDiscovery: true, include: [], entries: [] },
        server: { ...configured.server, host: '127.0.0.1', port: 0, watch: null },
      });
      await vite.listen();
      const frontendPort = vite.httpServer.address().port;
      const origin = 'https://synthetic-preview.replit.app';
      const body = JSON.stringify({ action: 'synthetic-no-payment', fixture: 42 });
      const response = await fetch('http://127.0.0.1:' + frontendPort + '/api/merit-checkout?fixture=1', {
        method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body,
      });
      assert.equal(response.status, 202);
      assert.equal(response.headers.get('cache-control'), 'private, no-store');
      assert.deepEqual(await response.json(), { synthetic: true });
      assert.deepEqual(received, { method: 'POST', path: '/api/merit-checkout?fixture=1', origin, host: '127.0.0.1:' + frontendPort, body });
      console.log('PROXY_CHECKS_PASSED');
    } finally {
      if (vite) await vite.close();
      await new Promise(resolve => api.close(resolve));
      await rm(temp, { recursive: true, force: true });
    }
  `;
  const env = {
    PATH: process.env.PATH, NODE_ENV: "production", PORT: "3100", BASE_PATH: "/",
    ...(process.env.ESBUILD_BINARY_PATH ? { ESBUILD_BINARY_PATH: process.env.ESBUILD_BINARY_PATH } : {}),
    ...(process.env.NODE_PATH ? { NODE_PATH: process.env.NODE_PATH } : {}),
  };
  const { stdout } = await promisify(execFile)(process.execPath, ["--input-type=module", "-e", script], {
    cwd: fileURLToPath(new URL("../", import.meta.url)), env, timeout: 25000,
  });
  assert.match(stdout, /PROXY_CHECKS_PASSED/);
});
