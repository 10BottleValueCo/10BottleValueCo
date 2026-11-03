#!/usr/bin/env python3
"""Build a deterministic catalog-import development ZIP from pinned public assets."""
import hashlib, json, os, subprocess, sys, tempfile, zipfile
from pathlib import Path, PurePosixPath

here = Path(__file__).resolve().parent
repo = Path(subprocess.check_output(['git', 'rev-parse', '--show-toplevel'], cwd=here, text=True).strip())
if len(sys.argv) != 2 or not Path(sys.argv[1]).is_absolute():
    raise SystemExit('Provide one absolute output ZIP path; existing files are never replaced.')
out = Path(sys.argv[1])
if not out.parent.is_dir(): raise SystemExit('Output parent must exist.')
if out.exists() or out.is_symlink(): raise SystemExit('Output already exists.')
manifest = json.loads((here / 'public-assets.json').read_text())
revision = manifest['assetSourceCommit']
if len(revision) != 40 or any(c not in '0123456789abcdef' for c in revision): raise SystemExit('Invalid asset source commit.')
assets = manifest['assets']
entries = {}
for entry in assets:
    target = PurePosixPath(entry['destination']); source = PurePosixPath(entry['source'])
    if target.is_absolute() or source.is_absolute() or '..' in target.parts or '..' in source.parts or not target.parts or not source.parts: raise SystemExit('Invalid manifest path.')
    name = 'tbv-catalog-import/assets/' + target.as_posix()
    if name in entries: raise SystemExit('Duplicate asset destination.')
    blob = subprocess.check_output(['git', 'show', revision + ':' + source.as_posix()], cwd=repo)
    if hashlib.sha256(blob).hexdigest() != entry['sha256']: raise SystemExit('Asset hash mismatch: ' + str(target))
    entries[name] = blob
for name in ('README.md', 'admin-batch.js', 'public-catalog.json', 'tbv-catalog-import.php'):
    entries['tbv-catalog-import/' + name] = (here / 'tbv-catalog-import' / name).read_bytes()
# Write to a temporary file first; create the destination without overwriting an existing artifact.
with tempfile.TemporaryDirectory(prefix='tbv-catalog-zip-') as temp:
    built = Path(temp) / 'catalog.zip'
    with zipfile.ZipFile(built, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=6) as z:
        for name, blob in sorted(entries.items()):
            info = zipfile.ZipInfo(name, (2020, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o100644 << 16
            z.writestr(info, blob)
    with open(out, 'xb') as dest, open(built, 'rb') as src:
        while chunk := src.read(1024 * 1024): dest.write(chunk)
print(json.dumps({'path':str(out), 'sha256':hashlib.sha256(out.read_bytes()).hexdigest(), 'assets':len(assets), 'assetSourceCommit':revision, 'scope':'development draft catalog; not live sync'}))
