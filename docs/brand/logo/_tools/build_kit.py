"""BLADUS logo kit: Khatam B (zellige eight-pointed star with the Fraunces B).

Design tooling only. Needs a Python with shapely, fontTools and Pillow, plus headless Chrome:
    %TEMP%/bladus-tools/venv/Scripts/python docs/brand/logo/_tools/build_kit.py
Writes docs/brand/logo/kit/ (SVG masters + PNG/ICO exports) and a test sheet.

Construction (256 unit canvas, centre C = 128):
- Star: regular {8/2} khatam, point radius R = 124 (two squares of half-diagonal R).
- Grout: the two squares again at radius R - INSET, drawn as gaps of width GROUT (true holes).
- Centre: the octagon where the two inner squares overlap, in action blue.
- Letter: Fraunces B (wght 800, opsz 144), cap height B_H, optically nudged right and up.
- Small cut (16 to 32 px): star + larger B only, no grout, no octagon.
"""
import io
import json
import math
import os
import pathlib
import subprocess
import sys

from PIL import Image
from shapely import affinity
from shapely.geometry import LinearRing, Polygon
from shapely.ops import unary_union

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent
KIT = ROOT / "kit"
KIT.mkdir(exist_ok=True)
sys.path.insert(0, str(HERE))
from glyphs import outline  # noqa: E402

FONTS = pathlib.Path(os.environ.get("TEMP", ".")) / "bladus-tools" / "fonts"
FRAUNCES = FONTS / "6e8c7cb283336a9d-s.p.ttf"
CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"

NAVY, BLUE, SKY, WHITE, BLACK = "#152C52", "#0B57D0", "#3FA5E2", "#FFFFFF", "#000000"
C, R, INSET, GROUT = 128.0, 124.0, 18.0, 6.0
B_H, B_NUDGE = 100.0, (2.0, -1.0)
B_H_SMALL = 132.0
WORD_AXES = {"wght": 700, "opsz": 144}
B_AXES = {"wght": 800, "opsz": 144}


def polar(r, deg, c=C):
    a = math.radians(deg)
    return (c + r * math.cos(a), c + r * math.sin(a))


def star(r):
    r_in = r * math.cos(math.radians(45)) / math.cos(math.radians(22.5))
    p = []
    for k in range(8):
        p.append(polar(r, k * 45 - 90))
        p.append(polar(r_in, k * 45 - 90 + 22.5))
    return Polygon(p)


def square(r, offset):
    return Polygon([polar(r, offset + k * 90) for k in range(4)])


def geom_to_d(g, nd=2):
    """Shapely (Multi)Polygon to an SVG path (evenodd-safe: exteriors and holes as subpaths)."""
    polys = getattr(g, "geoms", [g])
    out = []
    for p in polys:
        for ring in [p.exterior, *p.interiors]:
            cs = list(ring.coords)[:-1]
            out.append("M" + " L".join(f"{round(x, nd)},{round(y, nd)}" for x, y in cs) + " Z")
    return " ".join(out)


# ------------------------------------------------------------------ geometry
STAR = star(R)
SQ_A, SQ_B = square(R - INSET, -90), square(R - INSET, -45)
LINES = unary_union([LinearRing(SQ_A.exterior.coords).buffer(GROUT / 2, join_style=2, mitre_limit=10),
                     LinearRing(SQ_B.exterior.coords).buffer(GROUT / 2, join_style=2, mitre_limit=10)])
CORE = SQ_A.intersection(SQ_B)
FRAME = STAR.difference(LINES).difference(CORE)          # navy pieces
CENTRE = CORE.difference(LINES)                           # blue octagon


def b_glyph(height, cx=C, cy=C, nudge=(0.0, 0.0)):
    g = outline(str(FRAUNCES), B_AXES, "B")["glyphs"][0]
    s = height / (g["yMax"] - g["yMin"])
    w = (g["xMax"] - g["xMin"]) * s
    tx = cx - w / 2 - g["xMin"] * s + nudge[0]
    ty = cy - height / 2 - g["yMin"] * s + nudge[1]
    return f'<g transform="translate({tx:.2f} {ty:.2f}) scale({s:.6f})"><path d="{g["d"]}"/></g>', g["d"], (tx, ty, s)


B_FULL, B_D, B_T = b_glyph(B_H, nudge=B_NUDGE)
B_SMALL, B_D_S, B_T_S = b_glyph(B_H_SMALL, nudge=(2.0, 0.0))


def b_path_abs(d, t, fill, extra=""):
    tx, ty, s = t
    return f'<path fill="{fill}" fill-rule="nonzero" transform="translate({tx:.2f} {ty:.2f}) scale({s:.6f})" d="{d}"{extra}/>'


def symbol_body(frame, centre, letter, small=False):
    """frame/centre/letter colours; letter=None makes the B a hole (one-colour versions)."""
    if small:
        if letter is None:  # one-colour small: star with the B knocked out via an evenodd compound
            return (f'<path fill="{frame}" fill-rule="evenodd" d="{geom_to_d(STAR)}"/>'
                    + f'<g fill="{frame}">{_knockout(B_D_S, B_T_S, STAR)}</g>')
        return f'<path fill="{frame}" d="{geom_to_d(STAR)}"/>' + b_path_abs(B_D_S, B_T_S, letter)
    parts = [f'<path fill="{frame}" fill-rule="evenodd" d="{geom_to_d(FRAME)}"/>']
    if letter is None:
        parts.append(f'<g fill="{centre}">{_knockout(B_D, B_T, CENTRE)}</g>')
    else:
        parts.append(f'<path fill="{centre}" fill-rule="evenodd" d="{geom_to_d(CENTRE)}"/>')
        parts.append(b_path_abs(B_D, B_T, letter))
    return "".join(parts)


def _knockout(d, t, shape):
    """Shape with the B as a real hole: draw shape, then B with the same transform as a separate evenodd compound.

    The B contours are fully inside `shape`, so one evenodd path holding shape (in glyph space) + B contours
    produces exact holes and keeps the B as true curves.
    """
    tx, ty, s = t
    inv = affinity.affine_transform(shape, [1 / s, 0, 0, 1 / s, -tx / s, -ty / s])
    return (f'<path fill-rule="evenodd" transform="translate({tx:.2f} {ty:.2f}) scale({s:.6f})" '
            f'd="{geom_to_d(inv, 1)} {d}"/>')


def svg(body, w=256, h=256, title="BLADUS"):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w:.0f} {h:.0f}" width="{w:.0f}" height="{h:.0f}" '
            f'role="img" aria-label="{title}"><title>{title}</title>{body}</svg>\n')


# ------------------------------------------------------------------ wordmark (outlined Fraunces)
def wordmark(cap_h, fill, tracking=0.11, kern=None):
    kern = kern or {("L", "A"): -0.10, ("A", "D"): 0.01, ("D", "U"): 0.0}
    o = outline(str(FRAUNCES), WORD_AXES, "BLADUS")
    cap = o["capHeight"]
    s = cap_h / cap
    x, parts, prev = 0.0, [], None
    for g in o["glyphs"]:
        if prev is not None:
            x += (tracking + kern.get((prev, g["char"]), 0.0)) * cap_h
        parts.append(f'<path transform="translate({x:.2f} 0) scale({s:.6f})" d="{g["d"]}"/>')
        x += g["advance"] * s
        prev = g["char"]
    width = x - (o["glyphs"][-1]["advance"] - o["glyphs"][-1]["xMax"]) * s
    # baseline at y = 0, caps go up to -cap_h
    return f'<g fill="{fill}">{"".join(parts)}</g>', width


def lockup_h(frame, centre, letter, word_fill):
    H = 256.0
    cap = 0.36 * H
    gap = 0.20 * H
    word, ww = wordmark(cap, word_fill)
    w = H + gap + ww
    body = (symbol_body(frame, centre, letter)
            + f'<g transform="translate({H + gap:.2f} {C + cap / 2:.2f})">{word}</g>')
    return body, w, H


def lockup_v(frame, centre, letter, word_fill):
    H = 256.0
    cap = 0.27 * H
    gap = 0.16 * H
    word, ww = wordmark(cap, word_fill, tracking=0.13)
    w = max(H, ww)
    total_h = H + gap + cap
    body = (f'<g transform="translate({(w - H) / 2:.2f} 0)">{symbol_body(frame, centre, letter)}</g>'
            + f'<g transform="translate({(w - ww) / 2:.2f} {total_h:.2f})">{word}</g>')
    return body, w, total_h


# ------------------------------------------------------------------ masters
masters = {
    "bladus-symbol.svg": svg(symbol_body(NAVY, BLUE, WHITE)),
    "bladus-symbol-small.svg": svg(symbol_body(NAVY, None, WHITE, small=True)),
    "bladus-symbol-reversed.svg": svg(symbol_body(WHITE, BLUE, WHITE)),
    "bladus-symbol-navy.svg": svg(symbol_body(NAVY, NAVY, None)),
    "bladus-symbol-black.svg": svg(symbol_body(BLACK, BLACK, None)),
    "bladus-symbol-white.svg": svg(symbol_body(WHITE, WHITE, None)),
    "bladus-symbol-small-white.svg": svg(symbol_body(WHITE, None, None, small=True)),
}
for name, args in (("bladus-horizontal", (NAVY, BLUE, WHITE, NAVY)), ("bladus-horizontal-reversed", (WHITE, BLUE, WHITE, WHITE)),
                   ("bladus-horizontal-black", (BLACK, BLACK, None, BLACK)), ("bladus-horizontal-white", (WHITE, WHITE, None, WHITE))):
    b, w, h = lockup_h(*args)
    masters[f"{name}.svg"] = svg(b, w, h)
for name, args in (("bladus-vertical", (NAVY, BLUE, WHITE, NAVY)), ("bladus-vertical-reversed", (WHITE, BLUE, WHITE, WHITE)),
                   ("bladus-vertical-black", (BLACK, BLACK, None, BLACK))):
    b, w, h = lockup_v(*args)
    masters[f"{name}.svg"] = svg(b, w, h)
w_word = wordmark(100, NAVY)
masters["bladus-wordmark.svg"] = svg(f'<g transform="translate(0 100)">{w_word[0]}</g>', w_word[1], 100)

(KIT / "svg").mkdir(exist_ok=True)
for name, s in masters.items():
    (KIT / "svg" / name).write_text(s, encoding="utf-8")


# ------------------------------------------------------------------ rendering (Chrome, transparent)
def render(svg_text, w, h, bg=None):
    """Render SVG at w x h px (supersampled 4x by Chrome device scale, then downscaled)."""
    tmp = KIT / "_render.html"
    scale = 4 if max(w, h) <= 256 else 2
    style = f"background:{bg};" if bg else "background:transparent;"
    tmp.write_text(f'<!doctype html><html><body style="margin:0;{style}">'
                   f'<div style="width:{w}px;height:{h}px">{svg_text.replace("<svg ", f"<svg style=\"width:{w}px;height:{h}px;display:block\" ", 1)}</div>'
                   f'</body></html>', encoding="utf-8")
    png = KIT / "_render.png"
    subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars", "--default-background-color=00000000",
                    f"--force-device-scale-factor={scale}", f"--window-size={max(w, 64)},{max(h, 64)}",
                    f"--screenshot={png}", tmp.as_uri()], capture_output=True, timeout=120)
    im = Image.open(png).convert("RGBA").crop((0, 0, w * scale, h * scale)).resize((w, h), Image.LANCZOS)
    tmp.unlink()
    png.unlink()
    return im


def fit(svg_text, vw, vh, cw, ch, pad=0.0, bg=None):
    """Render an SVG of viewBox vw x vh centred inside a cw x ch canvas with padding ratio."""
    k = min((cw * (1 - 2 * pad)) / vw, (ch * (1 - 2 * pad)) / vh)
    w, h = max(1, round(vw * k)), max(1, round(vh * k))
    im = render(svg_text, w, h)
    canvas = Image.new("RGBA", (cw, ch), bg or (0, 0, 0, 0))
    canvas.alpha_composite(im, ((cw - w) // 2, (ch - h) // 2))
    return canvas


def dims(name):
    import re
    m = re.search(r'viewBox="0 0 ([\d.]+) ([\d.]+)"', masters[name])
    return float(m.group(1)), float(m.group(2))


png = KIT / "png"
png.mkdir(exist_ok=True)
exports = {
    "logo.png": ("bladus-symbol.svg", 512, 512, 0.0, None),
    "logo-horizontal.png": ("bladus-horizontal.svg", 1124, 340, 0.04, None),
    "logo-vertical.png": ("bladus-vertical.svg", 1024, 1024, 0.12, None),
    "logo-horizontal-white.png": ("bladus-horizontal-white.svg", 1124, 340, 0.04, None),
    "logo-white.png": ("bladus-symbol-white.svg", 512, 512, 0.0, None),
    "icon-32.png": ("bladus-symbol-small.svg", 32, 32, 0.0, None),
    "icon-16.png": ("bladus-symbol-small.svg", 16, 16, 0.0, None),
    "icon-48.png": ("bladus-symbol-small.svg", 48, 48, 0.0, None),
    "apple-icon.png": ("bladus-symbol.svg", 180, 180, 0.12, (255, 255, 255, 255)),
    "icon-192.png": ("bladus-symbol.svg", 192, 192, 0.06, None),
    "icon-512.png": ("bladus-symbol.svg", 512, 512, 0.06, None),
    "icon-maskable-512.png": ("bladus-symbol-reversed.svg", 512, 512, 0.22, (21, 44, 82, 255)),
    "og-logo.png": ("bladus-vertical.svg", 1200, 630, 0.16, (255, 255, 255, 255)),
}
for out, (src, cw, ch, pad, bg) in exports.items():
    vw, vh = dims(src)
    fit(masters[src], vw, vh, cw, ch, pad, bg).save(png / out)
ico = [Image.open(png / f"icon-{n}.png") for n in (16, 32, 48)]
ico[2].save(png / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)], append_images=ico[:2])
print("kit written:", len(masters), "svg,", len(exports) + 1, "raster")
