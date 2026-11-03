#!/usr/bin/env python3
"""Extract local staging ZIPs and create a test-only, localhost checkout fixture."""
import os
import stat
import sys
import tempfile
from pathlib import Path, PurePosixPath
from zipfile import ZipFile

if len(sys.argv) != 5:
    raise SystemExit('Usage: prepare.py NEW_TEMP_DIR THEME_ZIP HOMEPAGE_ZIP CATALOG_ZIP')
root = Path(sys.argv[1]).absolute()
temp_root = Path(tempfile.gettempdir()).resolve()
if root.exists() or root.parent.resolve() != temp_root:
    raise SystemExit('Fixture must be a new direct child of the operating system temporary directory')

def unpack(archive, folder, expected):
    with ZipFile(archive) as z:
        entries = z.infolist()
        if not entries or len(entries) > 5000 or sum(i.file_size for i in entries) > 300_000_000:
            raise ValueError('Unexpected ZIP size')
        seen = set()
        for item in entries:
            name = PurePosixPath(item.filename)
            mode = item.external_attr >> 16
            if name.is_absolute() or not name.parts or name.parts[0] != expected or '..' in name.parts or '\\' in item.filename or stat.S_ISLNK(mode) or item.filename in seen:
                raise ValueError('Unsafe ZIP member')
            seen.add(item.filename)
        z.extractall(folder)

root.mkdir()
unpack(sys.argv[2], root / 'theme', '10bottlevalue-react-proof')
unpack(sys.argv[3], root / 'plugins', 'tbv-local-homepage-proof')
unpack(sys.argv[4], root / 'plugins', 'tbv-public-woo-catalog')
functions = root / 'theme/10bottlevalue-react-proof/functions.php'
source = functions.read_text()
start_marker = '// Store API dispatch does not run template_redirect.'
end_marker = "add_action('after_setup_theme', function () { add_theme_support('woocommerce');"
if source.count(start_marker) != 1 or source.count(end_marker) != 1:
    raise ValueError('Unexpected staging theme guard; refusing to create fixture')
start, end = source.index(start_marker), source.index(end_marker)
if start >= end:
    raise ValueError('Unexpected staging guard order')
lab_guard = r'''// TEST-ONLY LOCAL CHECKOUT. Never package, deploy or connect real data.
if (!defined('TBV_DISPOSABLE_CHECKOUT') || TBV_DISPOSABLE_CHECKOUT !== true || wp_get_environment_type() !== 'local' || wp_parse_url(home_url(), PHP_URL_HOST) !== '127.0.0.1' || !defined('WP_HTTP_BLOCK_EXTERNAL') || WP_HTTP_BLOCK_EXTERNAL !== true || !defined('DISABLE_WP_CRON') || DISABLE_WP_CRON !== true) wp_die('Disposable checkout lab required', '', ['response'=>503]);
add_filter('rest_pre_dispatch', function ($result, $server, $request) {
  $route=rtrim($request->get_route(),'/'); $method=strtoupper($request->get_method());
  $read=$method==='GET' && in_array($route,['/wc/store/v1/cart','/tbv-catalog/v1/products'],true);
  $write=$method==='POST' && in_array($route,['/wc/store/v1/cart/add-item','/wc/store/v1/cart/update-customer','/wc/store/v1/checkout'],true);
  return ($read || $write) ? $result : new WP_Error('lab_blocked','Local synthetic checkout only',['status'=>403]);
},0,3);
add_action('template_redirect', function () { header("Content-Security-Policy: default-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; frame-src 'none'; worker-src 'none'; object-src 'none'; form-action 'self'; base-uri 'self'");header('X-Robots-Tag: noindex, nofollow');header('Cache-Control: no-store'); },0);
'''
functions.write_text(source[:start] + lab_guard + source[end:])
(root / '.tbv-synthetic-checkout-lab').write_text('disposable checkout fixture; never deploy\n')
print('Prepared local-only test fixture:', root)
