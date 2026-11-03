# 10BottleValue WordPress theme

Native PHP theme for an isolated WordPress + WooCommerce preview. The catalog,
cart, account, variable products, attribute validation and prices come from
WooCommerce. Product cards submit native WooCommerce add-to-cart forms. No Merit
SDK, Merit identity gate, remote checkout endpoint or payment provider is included.

Visual source: upstream `5672c65ca153ec565256cd1d805f8a4a34fdb718`, extracted
October 22, 2026. `HomePage.css` and `BpcCatalogCard.css` retain the first-party
approved styles; source hero, header, laboratory and vial artwork are reused.
The preview stripe, shipping configuration message and disabled unavailable pack
sizes are deliberate evidence boundaries. No conversion or inventory claim is
inferred from these source assets.

## Product contract

Use native `WC_Product_Variable` parents grouped by canonical compound. Children
carry custom attributes `dosage`, `pack-size`, `warehouse`, and, where applicable,
`formulation`. Formulation is necessary to preserve the separate CJC-1295 with/d
and no/d offers. Each child retains its own price and stock status.

Optional private product metadata read by the theme:

- `_tbv_warehouse`: `worldwide` or `us`.
- `_tbv_dose`: source dosage text.
- `_tbv_pack_size`: number of vials, not units of a substance.
- `_tbv_note_label`: source formulation label.
- `_tbv_vial_image`: relative path below theme `assets/`.
- `_tbv_aliases`: parent search aliases as a string.

The importer and runtime isolation MU plugin live outside this theme. Native
WooCommerce checkout must remain disabled in the public preview by that plugin.
Financial records, orders, credentials and customers are not imported. Stock is
the dated source boolean, not a physical count or live inventory integration.

## Remaining migration work

Visual parity has not been accepted. The actual theme requires browser review at
desktop and mobile widths. The current storefront content is English; the source
Russian, Ukrainian, German and Spanish dictionaries have not been migrated. Some
information/policy pages deliberately identify their content as pending. The
source export establishes only ten-vial kits; one- and five-vial card choices are
disabled rather than assigned invented prices.

The 22 Semaglutide, Tirzepatide, Retatrutide and Cagrilintide + Semaglutide vial
assets were restored byte for byte from their approved original v19 files. The
homepage hero still has its baked-in GLP-3 RT label; a genuine prior hero original
was not located. The source Tesamorelin 20 mg artwork identifies a different
compound, so that exact offer deliberately uses a neutral image-pending SVG in
variation views and cart thumbnails. Another dosage's artwork is not substituted.

Production hosting, payment gateway activation, shipment rules, source customer
and historical-order migration, store-credit balances, referral accounting,
transactional email, redirects and legal/CPA acceptance need separate verification
before a live cutover. This theme does not claim to complete those systems.
