# Named blue-label vials (staging)

Owner decision 2026-10-28: keep the blue-label vial art but print the product
names instead of the GLP codes (GLP TZ-2 → Tirzepatide, GLP RT-3 → Retatrutide,
GLP SG-1 → Semaglutide, Cagrilintide + GLP SG-1 → Cagrilintide + Semaglutide).

`build_named_vials.py` reads the existing `vials-c` art, clears the white name
band and draws the new name warped to the vial's curve (DIN Condensed Bold, ink
#0D1F6A). The dose band and glass are untouched. It also fixes two live-manifest
mistakes: MOTS-C 20 mg and Tesamorelin 20 mg pointed at the GLP TZ-2 20 mg vial;
they now get their own name band on that 20 mg body. Melanotan-2 uses the
existing `melanotan-2-0e2065c9b893.webp` artwork; Melanotan-1 (shown as "MT1"
live) gets a MELANOTAN-1 name band on its own vial (owner decision, same day).

    python3 -m venv .venv && .venv/bin/pip install pillow
    .venv/bin/python build_named_vials.py <theme>/public/vials-c \
      ../staging-theme-lab/overlay/artifacts/10-bottle-value/public/vials-c

Outputs use new file names (`*-label-<hash>.webp`), so the live artwork is never
overwritten. The overlay `vialCManifest.json` and
`persistent-staging/scripts/apply-owner-label-decisions.php` point the
storefront and the WooCommerce catalog at them.
