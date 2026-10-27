#!/usr/bin/env python3
"""Create a portable UTF-8 ZIP from one generated package directory."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import sys

if len(sys.argv) != 4:
    raise SystemExit('Usage: zip-portable.py PARENT PACKAGE OUTPUT_ZIP')
parent, package, output = Path(sys.argv[1]), sys.argv[2], Path(sys.argv[3])
if not package or Path(package).name != package or output.exists():
    raise SystemExit('Invalid package name or existing output')
root = parent / package
if not root.is_dir() or root.is_symlink():
    raise SystemExit('Package directory required')
with ZipFile(output, 'x', compression=ZIP_DEFLATED, compresslevel=6, allowZip64=True) as archive:
    for entry in sorted(root.rglob('*')):
        if entry.is_symlink():
            raise SystemExit('Symbolic links are not supported in staging packages')
        if entry.is_file() and entry.name != '.DS_Store':
            archive.write(entry, entry.relative_to(parent).as_posix())
