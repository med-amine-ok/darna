"""Seamless zellige background tiles (star-and-cross of Qal'at Bani Hammad), matching the Khatam B logo.

Design tooling only. Run: python docs/brand/logo/_tools/build_pattern.py
Writes frontend/public/brand/zellige-light.svg (navy lines) and zellige-dark.svg (white lines),
plus the same files in admin/public/brand. Opacity is set in CSS, not here.
"""
import math
import pathlib

ROOT = pathlib.Path(__file__).resolve().parents[4]
T = 112.0                      # tile size (px at 1x)
R = T * math.sqrt(2) / 4       # star radius: centre and corner stars touch on the diagonals
W = 1.6                        # line width
OP = {"#152C52": 0.16, "#FFFFFF": 0.2}  # baked-in line opacity; sections fade it further with CSS


def khatam(cx, cy, r):
    r_in = r * math.cos(math.radians(45)) / math.cos(math.radians(22.5))
    p = []
    for k in range(8):
        for rr, off in ((r, 0), (r_in, 22.5)):
            a = math.radians(k * 45 - 90 + off)
            p.append((cx + rr * math.cos(a), cy + rr * math.sin(a)))
    return "M" + " L".join(f"{x:.2f},{y:.2f}" for x, y in p) + " Z"


def tile(stroke):
    shapes = []
    for cx, cy in ((T / 2, T / 2), (0, 0), (T, 0), (0, T), (T, T)):
        shapes.append(khatam(cx, cy, R))          # outer star (its gaps form the crosses)
        shapes.append(khatam(cx, cy, R * 0.46))   # inner rosette, like a cut centre tile
    d = " ".join(shapes)
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{T:.0f}" height="{T:.0f}" viewBox="0 0 {T:.0f} {T:.0f}">'
            f'<path d="{d}" fill="none" stroke="{stroke}" stroke-width="{W}" stroke-opacity="{OP[stroke]}" stroke-linejoin="round"/></svg>\n')


for app in ("frontend", "admin"):
    out = ROOT / app / "public" / "brand"
    out.mkdir(parents=True, exist_ok=True)
    (out / "zellige-light.svg").write_text(tile("#152C52"), encoding="utf-8")
    (out / "zellige-dark.svg").write_text(tile("#FFFFFF"), encoding="utf-8")
print("pattern tiles written, tile", T, "px")
