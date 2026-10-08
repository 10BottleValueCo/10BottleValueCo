#!/usr/bin/env node
// Routine release to the owner's existing project. Vercel builds the source;
// a candidate must pass before promotion, then both domains are checked.
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const scope = "10bottlevaluecos-projects";
const project = "prj_GIYi5bA2bsdmBYeDHRs199wvDpeW";
const domains = ["10bottlevalue.co", "www.10bottlevalue.co"];
const args = process.argv.slice(2);
if (args.some(arg => arg !== "--dry-run")) throw new Error("Only --dry-run is supported.");
const cli = process.env.VERCEL_CLI;
const cliCommand = cli ? process.execPath : "vercel";
const cliPrefix = cli ? [cli] : [];
const deployArgs = ["deploy", "--prod", "--skip-domain", "--project", project, "--scope", scope, "--yes", "--non-interactive", "--no-color"];
if (args.includes("--dry-run")) {
  console.log(JSON.stringify({ project, scope, domains, steps: ["deploy candidate", "check candidate", "promote", "verify both domains"], command: [cliCommand, ...cliPrefix, ...deployArgs] }, null, 2));
  process.exit(0);
}
const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
if (git("status", "--porcelain", "--untracked-files=normal")) throw new Error("Commit the intended release before publishing; the checkout has changes.");
const commit = git("rev-parse", "HEAD");
const receiptDir = path.resolve(process.env.RELEASE_RECEIPT_DIR || path.join(root, "output", "releases"), new Date().toISOString().replace(/[:.]/g, "-"));
mkdirSync(receiptDir, { recursive: true });
const receipt = { commit, project, scope, startedAt: new Date().toISOString(), promoted: false, paymentPerformed: false, checks: [] };
const save = () => writeFileSync(path.join(receiptDir, "receipt.json"), JSON.stringify(receipt, null, 2) + "\n");
function vercel(args, name) {
  try {
    const output = execFileSync(cliCommand, [...cliPrefix, ...args], { cwd: root, encoding: "utf8", maxBuffer: 12 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] });
    writeFileSync(path.join(receiptDir, name + ".txt"), output);
    return output;
  } catch (error) {
    writeFileSync(path.join(receiptDir, name + ".txt"), String(error.stdout || "") + String(error.stderr || ""));
    throw new Error(`${name} failed. See ${receiptDir}/${name}.txt`);
  }
}
function get(url) {
  const response = execFileSync("curl", ["--silent", "--show-error", "--max-time", "25", "-w", "\n%{http_code}", url], { encoding: "utf8", maxBuffer: 12 * 1024 * 1024 });
  const at = response.lastIndexOf("\n");
  return { body: response.slice(0, at), status: Number(response.slice(at + 1)) };
}
function check(host, expectedConfig) {
  for (const [route, status] of [["/", 200], ["/api/merit-checkout", 200], ["/api/admin-operations-access", 401], ["/api/attestly-webhook", 405], ["/operations", 200]]) {
    const result = get(`https://${host}${route}`);
    if (result.status !== status) throw new Error(`${host}${route}: expected ${status}, received ${result.status}`);
    const item = { host, route, status };
    if (route === "/api/merit-checkout") {
      const config = JSON.parse(result.body);
      if (!config.ok || !config.enabled || config.currency !== "usd" || !Number.isSafeInteger(config.surchargeBps)) throw new Error("Public card configuration failed verification.");
      if (expectedConfig && JSON.stringify(config) !== JSON.stringify(expectedConfig)) throw new Error("Live payment configuration differs from the candidate.");
      receipt.configuration = config;
      item.configuration = config;
    }
    if (route === "/") {
      const bundle = result.body.match(/<script[^>]+src="([^"]+\.js)"/)?.[1];
      if (!bundle) throw new Error("Storefront JavaScript bundle is missing.");
      if (receipt.bundle && bundle !== receipt.bundle) throw new Error("Live storefront bundle differs from the candidate.");
      receipt.bundle = bundle;
    }
    receipt.checks.push(item);
  }
  save();
}
try {
  console.log(`Deploying ${commit.slice(0, 7)} to the existing 10BottleValueCo project…`);
  const output = vercel(deployArgs, "deployment");
  const jsonStart = output.lastIndexOf('\n{');
  const deployed = JSON.parse(output.slice(jsonStart < 0 ? output.indexOf("{") : jsonStart + 1));
  if (deployed.status !== "ok" || deployed.deployment?.readyState !== "READY") throw new Error("Vercel did not report a ready deployment.");
  const target = new URL(deployed.deployment.url);
  if (target.protocol !== "https:" || !/^10-bottle-value-[a-z0-9]+-10bottlevaluecos-projects\.vercel\.app$/.test(target.hostname)) throw new Error("Unexpected deployment destination.");
  receipt.deployment = deployed.deployment;
  check(target.hostname);
  const config = receipt.configuration;
  console.log("Candidate verified; promoting to the storefront domains…");
  vercel(["promote", target.href, "--scope", scope, "--yes", "--non-interactive", "--no-color"], "promotion");
  receipt.promoted = true;
  for (const host of domains) check(host, config);
  receipt.verifiedAt = new Date().toISOString();
  receipt.status = "live_verified";
  save();
  console.log(`Live on both domains. Receipt: ${receiptDir}/receipt.json`);
} catch (error) {
  receipt.status = receipt.promoted ? "promoted_verification_failed" : "not_promoted";
  receipt.error = error.message;
  save();
  console.error(error.message);
  process.exitCode = 1;
}
