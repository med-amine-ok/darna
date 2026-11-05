"""Mixes of concepts A (Algeria outline), B (horizon B) and C (Amazigh compass).

Design tooling only. Run: python docs/brand/logo/_tools/build_mixes.py [version]
Writes concepts/m1-..m4-<version>.svg in black (#000), white (#fff) = cut-outs at concept stage.
"""
import math
import pathlib
import sys

OUT = pathlib.Path(__file__).resolve().parent.parent / "concepts"
V = sys.argv[1] if len(sys.argv) > 1 else "v1"
INK = "#000"

LONLAT = [(-2.2, 35.1), (-1.0, 35.4), (0.2, 36.0), (1.6, 36.5), (3.0, 36.8), (5.0, 36.8),
          (6.4, 37.1), (8.6, 36.9), (8.3, 35.4), (7.6, 34.2), (8.9, 32.6), (9.5, 30.2),
          (9.8, 26.6), (10.6, 24.8), (12.0, 23.5), (5.8, 19.4), (3.3, 19.0), (1.2, 20.6),
          (-4.8, 25.0), (-8.7, 27.3), (-8.7, 28.7), (-5.8, 29.6), (-3.6, 30.6), (-1.2, 32.1),
          (-1.7, 33.6), (-1.8, 34.6)]


def algeria(cx, cy, width):
    xs = [lon for lon, _ in LONLAT]
    ys = [-lat for _, lat in LONLAT]
    k = width / (max(xs) - min(xs))
    mx, my = (max(xs) + min(xs)) / 2, (max(ys) + min(ys)) / 2
    return [(cx + (x - mx) * k, cy + (y - my) * k) for x, y in zip(xs, ys)]


def pts(p):
    return " ".join(f"{x:.1f},{y:.1f}" for x, y in p)


def poly_path(p):
    return "M" + " L".join(f"{x:.1f},{y:.1f}" for x, y in p) + " Z"


def svg(body, title):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" role="img">'
            f'<title>{title}</title>{body}</svg>\n')


def chevrons(c=128, r_out=106, w=34, gap=8):
    d = w * math.sqrt(2)
    o_top, o_right = (0, -r_out), (r_out, 0)
    i_top, i_right = (0, -(r_out - d)), (r_out - d, 0)
    def cx_(p, q, x):
        t = (x - p[0]) / (q[0] - p[0]); return (x, p[1] + t * (q[1] - p[1]))
    def cy_(p, q, y):
        t = (y - p[1]) / (q[1] - p[1]); return (p[0] + t * (q[0] - p[0]), y)
    base = [cx_(o_top, o_right, gap), cy_(o_top, o_right, -gap), cy_(i_top, i_right, -gap), cx_(i_top, i_right, gap)]
    return [[(c + sx * x, c + sy * y) for x, y in base] for sx, sy in ((1, 1), (-1, 1), (1, -1), (-1, -1))], r_out - d


# M1 = C frame + A centre: the compass points to Algeria
ch, inner = chevrons()
m1 = "".join(f'<polygon fill="{INK}" points="{pts(p)}"/>' for p in ch)
m1 += (f'<path fill="{INK}" stroke="{INK}" stroke-width="3" stroke-linejoin="round" '
       f'd="{poly_path(algeria(129, 127, 54))}"/>')

# M2 = A + C: Algeria with an Amazigh rhombus window at its heart
A = algeria(128, 124, 224)
cx, cy, r = 134, 136, 26
m2 = (f'<path fill="{INK}" fill-rule="evenodd" stroke="{INK}" stroke-width="5" stroke-linejoin="round" '
      f'd="{poly_path(A)}"/>'
      f'<polygon fill="#fff" points="{pts([(cx, cy - r - 8), (cx + r + 8, cy), (cx, cy + r + 8), (cx - r - 8, cy)])}"/>'
      f'<polygon fill="{INK}" points="{pts([(cx, cy - r + 6), (cx + r - 6, cy), (cx, cy + r - 6), (cx - r + 6, cy)])}"/>')

# M3 = B + C: a B whose two counters are Amazigh rhombuses
S, x0, top, bot = 34, 58, 30, 226
mid = (top + bot) / 2
def bowl(y1, y2, xc, rr):
    return f"M{x0},{y1} H{xc} A{rr},{rr} 0 0 1 {xc},{y2} H{x0} Z"
rt, rb = (mid - top) / 2, (bot - mid) / 2
def diamond(xc, yc, hw, hh):
    return f"M{xc},{yc - hh} L{xc + hw},{yc} L{xc},{yc + hh} L{xc - hw},{yc} Z"
B_OUT = f"M{x0},{top} H132 A{rt},{rt} 0 0 1 132,{mid} H146 A{rb},{rb} 0 0 1 146,{bot} H{x0} Z"
m3 = (f'<path fill="{INK}" fill-rule="evenodd" d="{B_OUT} '
      f'{diamond(122, (top + mid) / 2, 24, 22)} {diamond(130, (mid + bot) / 2, 28, 22)}"/>')

# M4 = C + B: the compass whose horizon gap becomes a wave (sea meets land)
ring_o = [(128, 22), (234, 128), (128, 234), (22, 128)]
ring_i = [(128, 128 - inner), (128 + inner, 128), (128, 128 + inner), (128 - inner, 128)]
m4 = (f'<clipPath id="m4c"><path d="{poly_path(ring_o)}"/></clipPath>'
      f'<path fill="{INK}" fill-rule="evenodd" d="{poly_path(ring_o)} {poly_path(ring_i)}"/>'
      f'<g clip-path="url(#m4c)" fill="#fff">'
      f'<rect x="120" y="0" width="16" height="256"/>'
      f'<path d="M0,134 C40,108 84,108 128,128 C172,148 216,148 256,122 L256,140 C216,166 172,166 128,146 C84,126 40,126 0,152 Z"/>'
      f'</g>'
      f'<polygon fill="{INK}" points="{pts([(128, 104), (152, 128), (128, 152), (104, 128)])}"/>')

for key, body, title in (("m1-compass-country", m1, "Mix 1: compass around Algeria"),
                         ("m2-country-window", m2, "Mix 2: Algeria with an Amazigh window"),
                         ("m3-rhombus-b", m3, "Mix 3: B with Amazigh counters"),
                         ("m4-compass-wave", m4, "Mix 4: compass with a sea-and-land wave")):
    (OUT / f"{key}-{V}.svg").write_text(svg(body, title), encoding="utf-8")
print("mixes", V)
