"""Build the named blue-label vials for the WordPress staging catalog.

Usage: python build_named_vials.py <vials-c source dir> <output dir>
Needs Pillow and macOS's DIN Condensed Bold. Source images are never modified;
each output gets a new file name so the live artwork stays untouched.
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from vials import Image, clear_band, draw_lines, transplant_band

ONE_LINE = lambda text: [(text, 52, 262, 0)]
CAGRI_SEMA = [("CAGRILINTIDE", 40, 262, 6), ("+", 26, 60, 4), ("SEMAGLUTIDE", 40, 262, 0)]

TIRZEPATIDE = ["84e49425ce26", "aafffcbf297c", "5d39f0523600", "3c2452bfd7b4",
               "11796ce22eec", "791fbae89191", "203ab6738d29", "9e57f09b5ac2"]
RETATRUTIDE = ["581fed53b55a", "5301f2306d38", "3fc5c7886c6f", "324919e582b2",
               "0efb04b0071d", "2b6f699e07d0", "88749677fc76", "6a5a20d096c3"]
SEMAGLUTIDE = ["a0ad40c24744", "f03fb2929a4d", "a631cd8a44ce", "d3e2c8f74cfa", "b0f3ad271fa7"]

def jobs():
    for h in TIRZEPATIDE:
        yield f"tirzepatide-glp-2-{h}.webp", f"tirzepatide-label-{h}.webp", ONE_LINE("TIRZEPATIDE"), None
    for h in RETATRUTIDE:
        yield f"retatrutide-glp-3-{h}.webp", f"retatrutide-label-{h}.webp", ONE_LINE("RETATRUTIDE"), None
    for h in SEMAGLUTIDE:
        yield f"semaglutide-{h}.webp", f"semaglutide-label-{h}.webp", ONE_LINE("SEMAGLUTIDE"), None
    yield "cagrilintide-semaglutide-ee9e1cd7aef4.webp", "cagrilintide-semaglutide-label-ee9e1cd7aef4.webp", CAGRI_SEMA, None
    # The live manifest shows the GLP TZ-2 20 mg vial for these two offers;
    # keep that 20 mg dose band and use each product's own name band.
    yield "tirzepatide-glp-2-3c2452bfd7b4.webp", "mots-c-20mg-label-3c2452bfd7b4.webp", None, "mots-c-844dea5d38ec.webp"
    yield "tirzepatide-glp-2-3c2452bfd7b4.webp", "tesamorelin-20mg-label-3c2452bfd7b4.webp", None, "tesamorelin-7cd62d9a87c1.webp"

def main(src, out):
    os.makedirs(out, exist_ok=True)
    for source, target, lines, donor in jobs():
        im = Image.open(os.path.join(src, source)).convert("RGBA")
        if donor:
            im = transplant_band(im, Image.open(os.path.join(src, donor)).convert("RGBA"))
        else:
            im = draw_lines(clear_band(im), lines, 500)
        im.save(os.path.join(out, target), "WEBP", quality=90, method=6)
        print(target)

if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
