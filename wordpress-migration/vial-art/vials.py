"""Re-letter the white name band of the blue-label vial art.

All vials-c images share one 393x800 template: the white band sits between
two navy bands and curves with the glass. We clear the band interior by
per-column interpolation and draw new lettering warped onto the cylinder.
"""
import math
from PIL import Image, ImageDraw, ImageFont

FONT = "/System/Library/Fonts/Supplemental/DIN Condensed Bold.ttf"
INK = (13, 31, 106)
CX, R, SAG = 196.5, 175.0, 19.5   # cylinder centre, radius, band sag in px
X0, X1 = 30, 364                  # columns that may hold lettering
SS = 4                            # supersampling


def band_bounds(px, x):
    white = lambda y: min(px[x, y][:3]) > 225
    # require a run of white rows so the logo's white outline is not mistaken for the band
    top = next(y for y in range(395, 470) if all(white(y + k) for k in range(6)))
    bot = next(y for y in range(600, 520, -1) if all(white(y - k) for k in range(6)))
    return top, bot


def clear_band(im):
    im = im.copy(); px = im.load()
    for x in range(X0, X1):
        top, bot = band_bounds(px, x)
        a = [px[x, y] for y in range(top + 3, top + 11)]
        b = [px[x, y] for y in range(bot - 10, bot - 2)]
        ca = [sum(p[i] for p in a) / len(a) for i in range(4)]
        cb = [sum(p[i] for p in b) / len(b) for i in range(4)]
        y0, y1 = top + 7, bot - 6
        for y in range(top + 3, bot - 2):
            t = min(1, max(0, (y - y0) / (y1 - y0)))
            px[x, y] = tuple(round(ca[i] + (cb[i] - ca[i]) * t) for i in range(4))
    return im


def transplant_band(body, donor):
    """Copy the donor's white band (lettering included) onto body."""
    out = body.copy(); po = out.load(); pd = donor.load()
    for x in range(X0, X1):
        top, bot = band_bounds(po, x)
        for y in range(top + 2, bot - 1):
            po[x, y] = pd[x, y]
    return out


def cap_metrics(font):
    l, t, r, b = font.getbbox("H")
    return b - t, t


def flat_line(text, cap):
    """Render one line flat at SS scale; return L mask cropped to cap box."""
    size = 10
    while cap_metrics(ImageFont.truetype(FONT, size * SS))[0] < cap * SS:
        size += 1
    f = ImageFont.truetype(FONT, size * SS)
    h, t = cap_metrics(f)
    w = int(f.getlength(text)) + 4 * SS
    m = Image.new("L", (w, h + 2 * SS), 0)
    ImageDraw.Draw(m).text((2 * SS, -t + SS), text, font=f, fill=255)
    bbox = m.getbbox()
    return m.crop((bbox[0], 0, bbox[2], m.height))


def screen_width(flat_w):
    half = flat_w / 2
    return 2 * R * math.sin(min(half / R, math.pi / 2))


def fit_line(text, cap, max_w):
    while True:
        m = flat_line(text, cap)
        if screen_width(m.width / SS) <= max_w or cap <= 8:
            return m
        cap -= 1


def draw_lines(im, lines, centre_y):
    """lines: [(text, cap_px, max_screen_width, gap_after_px)]. centre_y is the
    vertical centre of the block at the middle column."""
    masks = [(fit_line(t, c, w), g) for t, c, w, g in lines]
    total = sum(m.height for m, _ in masks) + sum(g * SS for _, g in masks[:-1])
    W, H = im.size
    big = Image.new("L", (W * SS, H * SS), 0); pb = big.load()
    y = centre_y * SS - total / 2
    for m, g in masks:
        pm = m.load(); fw = m.width
        for sx in range(int((CX - R) * SS) + 1, int((CX + R) * SS)):
            xs = sx / SS
            s = (xs - CX) / R
            if abs(s) >= 1: continue
            u = R * math.asin(s) * SS + fw / 2
            if u < 0 or u >= fw - 1: continue
            dy = (SAG * math.sqrt(1 - s * s) - SAG) * SS
            ui = int(u)
            for my in range(m.height):
                v = pm[ui, my]
                if v:
                    ty = int(y + my + dy)
                    if 0 <= ty < H * SS: pb[sx, ty] = max(pb[sx, ty], v)
        y += m.height + g * SS
    mask = big.resize((W, H), Image.LANCZOS)
    ink = Image.new("RGBA", im.size, INK + (255,))
    out = im.copy()
    out.paste(ink, (0, 0), mask)
    # keep original alpha of the glass/label
    out.putalpha(im.getchannel("A"))
    return out
