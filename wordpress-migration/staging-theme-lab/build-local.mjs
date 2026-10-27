// Build only an isolated staging prototype from a pinned source baseline.
// This script never installs, activates, deploys or connects to a WordPress site.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const baseCommit = '83336ce3caceb54ace8944204eb6307bad818a07';
const here = path.dirname(fileURLToPath(import.meta.url));
const repository = execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd: here, encoding: 'utf8' }).trim();
if (process.argv.length !== 3) throw Error('Usage: node build-local.mjs /path/to/new-output-directory');
const output = path.resolve(process.argv[2]);
if (fs.existsSync(output)) throw Error('Provide a new output directory');
const artifact = 'artifacts/10-bottle-value';
const manifest = JSON.parse(fs.readFileSync(path.join(here, 'public-assets.json'), 'utf8'));
if (manifest.version !== 1 || !Array.isArray(manifest.files) || !manifest.files.length) throw Error('Invalid public asset manifest');
const assetPaths = manifest.files.map(item => {
  if (!item || typeof item.path !== 'string' || item.path.startsWith('/') || item.path.split('/').some(part => !part || part === '.' || part === '..') || !/^[a-f0-9]{64}$/.test(item.sha256)) throw Error('Invalid public asset entry');
  return `${artifact}/public/${item.path}`;
});
if (new Set(assetPaths).size !== assetPaths.length) throw Error('Duplicate public asset entry');
const rootModules = path.join(repository, 'node_modules');
const appModules = path.join(repository, artifact, 'node_modules');
if (!fs.existsSync(rootModules) || !fs.existsSync(appModules)) throw Error('Install this repository workspace dependencies first');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'tbv-staging-build-'));
function run(command, args, options = {}) { execFileSync(command, args, { stdio: 'inherit', ...options }); }
try {
  const archive = path.join(temp, 'source.tar');
  run('git', ['archive', '-o', archive, baseCommit, `${artifact}/src`, `${artifact}/index.html`, `${artifact}/vite.config.ts`, `${artifact}/tailwind.config.js`, `${artifact}/postcss.config.js`, `${artifact}/neutral-color-transform.js`, `${artifact}/package.json`, 'api', 'shared', 'attached_assets', 'wordpress-preview-server/site/wp-content/plugins/tbv-public-woo-catalog', ...assetPaths], { cwd: repository });
  run('tar', ['-xf', archive, '-C', temp]);
  for (const [index, item] of manifest.files.entries()) {
    const bytes = fs.readFileSync(path.join(temp, assetPaths[index]));
    if (createHash('sha256').update(bytes).digest('hex') !== item.sha256) throw Error(`Public asset hash mismatch: ${item.path}`);
  }
  fs.cpSync(path.join(here, 'overlay'), temp, { recursive: true });
  fs.symlinkSync(rootModules, path.join(temp, 'node_modules'), 'dir');
  fs.symlinkSync(appModules, path.join(temp, artifact, 'node_modules'), 'dir');
  // Vite automatically embeds VITE_* values. A review build must not inherit
  // a developer's customer-facing keys or other environment configuration.
  const buildEnv = Object.fromEntries(Object.entries(process.env).filter(([key]) => !/^VITE_/i.test(key) && key !== 'REPL_ID' && key !== 'PORT'));
  buildEnv.BASE_PATH = './';
  buildEnv.NODE_ENV = 'production';
  run(path.join(appModules, '.bin/vite'), ['build', '--config', 'vite.config.ts'], { cwd: path.join(temp, artifact), env: buildEnv });
  const dist = path.join(temp, artifact, 'dist/public');
  const html = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
  const script = html.match(/assets\/index-[A-Za-z0-9_-]+\.js/g) || [];
  const style = html.match(/assets\/index-[A-Za-z0-9_-]+\.css/g) || [];
  if (script.length !== 1 || style.length !== 1) throw Error('Unexpected build entry assets');
  const themeParent = path.join(temp, 'package-theme');
  const homeParent = path.join(temp, 'package-home');
  const catalogParent = path.join(temp, 'package-catalog');
  fs.cpSync(path.join(here, 'theme'), themeParent, { recursive: true });
  fs.cpSync(path.join(here, 'homepage'), homeParent, { recursive: true });
  fs.mkdirSync(catalogParent);
  fs.cpSync(path.join(temp, 'wordpress-preview-server/site/wp-content/plugins/tbv-public-woo-catalog'), path.join(catalogParent, 'tbv-public-woo-catalog'), { recursive: true });
  const theme = path.join(themeParent, '10bottlevalue-react-proof');
  fs.cpSync(dist, path.join(theme, 'public'), { recursive: true });
  const frontPath = path.join(theme, 'front-page.php');
  let front = fs.readFileSync(frontPath, 'utf8');
  const oldScript = front.match(/assets\/index-[A-Za-z0-9_-]+\.js/g) || [];
  const oldStyle = front.match(/assets\/index-[A-Za-z0-9_-]+\.css/g) || [];
  if (oldScript.length !== 1 || oldStyle.length !== 1) throw Error('Unexpected theme asset references');
  front = front.replace(oldScript[0], script[0]).replace(oldStyle[0], style[0]);
  fs.writeFileSync(frontPath, front);
  fs.writeFileSync(path.join(homeParent, 'tbv-local-homepage-proof/assets.json'), JSON.stringify({ script: script[0], style: style[0] }));
  fs.mkdirSync(output, { recursive: false });
  for (const [parent, dir, filename] of [[themeParent,'10bottlevalue-react-proof','10bottlevalue-woo-staging-review-0.2.0.zip'],[homeParent,'tbv-local-homepage-proof','tbv-homepage-staging-review-0.2.0.zip'],[catalogParent,'tbv-public-woo-catalog','tbv-public-woo-catalog-0.1.0.zip']]) {
    run('zip', ['-q', '-r', path.join(output, filename), dir, '-x', '*.DS_Store'], { cwd: parent });
  }
  console.log(JSON.stringify({ output, sourceBase: baseCommit, script: script[0], style: style[0], scope: 'local staging prototype only' }));
} finally { fs.rmSync(temp, { recursive: true, force: true }); }
