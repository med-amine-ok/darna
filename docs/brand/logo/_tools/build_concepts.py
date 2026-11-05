"""Build the three BLADUS logo concepts as black SVGs (viewBox 0 0 256 256).

Documentation/design tooling only. Run: python docs/brand/logo/_tools/build_concepts.py [version]
"""
import pathlib
import sys

OUT = pathlib.Path(__file__).resolve().parent.parent / "concepts"
OUT.mkdir(exist_ok=True)
V = sys.argv[1] if len(sys.argv) > 1 else "v1"
INK = "#000"


def svg(body, title):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" role="img">'
            f'<title>{title}</title>{body}</svg>\n')


def pts(p):
    return " ".join(f"{x:.1f},{y:.1f}" for x, y in p)


# ---------------------------------------------------------------- A: the country is the mark
# Algeria outline from real (lon, lat) border points, simplified to 16 straight segments.
LONLAT = [(-2.2, 35.1), (-1.0, 35.4), (0.2, 36.0), (1.6, 36.5), (3.0, 36.8), (5.0, 36.8),
          (6.4, 37.1), (8.6, 36.9), (8.3, 35.4), (7.6, 34.2), (8.9, 32.6), (9.5, 30.2),
          (9.8, 26.6), (10.6, 24.8), (12.0, 23.5), (5.8, 19.4), (3.3, 19.0), (1.2, 20.6),
          (-4.8, 25.0), (-8.7, 27.3), (-8.7, 28.7), (-5.8, 29.6), (-3.6, 30.6), (-1.2, 32.1),
          (-1.7, 33.6), (-1.8, 34.6)]


def project(k=10.6):
    xs = [(lon + 8.7) * k for lon, _ in LONLAT]
    ys = [(37.2 - lat) * k for _, lat in LONLAT]
    w, h = max(xs) - min(xs), max(ys) - min(ys)
    ox, oy = (256 - w) / 2 - min(xs), (256 - h) / 2 - min(ys) - 4  # optical: slightly above centre
    return [(x + ox, y + oy) for x, y in zip(xs, ys)]


A = project()
a_body = (f'<path fill="{INK}" stroke="{INK}" stroke-width="6" stroke-linejoin="round" '
          f'd="M{pts(A).replace(" ", " L")} Z"/>')

# ---------------------------------------------------------------- B: horizon B
S, G = 34, 18          # stroke weight, horizon gap
x0, top, bot = 58, 30, 226
mid = (top + bot) / 2
t_bottom, b_top = mid - G / 2, mid + G / 2
rt = (t_bottom - top) / 2      # top bowl outer radius
rb = (bot - b_top) / 2 + 2     # bottom bowl slightly larger (classic B)
rb = (bot - b_top) / 2
xt, xb = 132, 146              # bowl centres x
def bowl(y1, y2, xc, r):
    yc = (y1 + y2) / 2
    ri = r - S
    outer = f"M{x0},{y1} H{xc} A{r},{r} 0 0 1 {xc},{y2} H{x0} Z"
    inner = f"M{x0 + S},{y1 + S} H{xc} A{ri},{ri} 0 0 1 {xc},{y2 - S} H{x0 + S} Z"
    return outer + " " + inner
G = 0
t_bottom = b_top = mid
rt = (t_bottom - top) / 2
rb = (bot - b_top) / 2
B_SHAPE = f"{bowl(top, t_bottom + 1, xt, rt)} {bowl(b_top - 1, bot, xb, rb)}"
B_OUTER = (f"M{x0},{top} H{xt} A{rt},{rt} 0 0 1 {xt},{t_bottom + 1} H{x0} Z "
           f"M{x0},{b_top - 1} H{xb} A{rb},{rb} 0 0 1 {xb},{bot} H{x0} Z")
b_body = (f'<clipPath id="bclip"><path d="{B_OUTER}"/></clipPath>'
          f'<path fill="{INK}" fill-rule="evenodd" d="{B_SHAPE}"/>'
          f'<path clip-path="url(#bclip)" fill="#fff" d="M40,{mid + 4} C80,{mid - 22} 120,{mid - 22} 150,{mid - 4} '
          f'C176,{mid + 12} 200,{mid + 10} 216,{mid - 2} L216,{mid + 15} C200,{mid + 27} 176,{mid + 29} 150,{mid + 13} '
          f'C120,{mid - 5} 80,{mid - 5} 40,{mid + 21} Z"/>')

# ---------------------------------------------------------------- C: Amazigh compass
C0, R_OUT, W, GAP, R_C = 128, 106, 34, 8, 24
def chevron(sx, sy):
    # top-right quadrant chevron, then mirrored with signs (sx, sy)
    import math
    d = W * math.sqrt(2)
    o_top, o_right = (0, -R_OUT), (R_OUT, 0)
    i_top, i_right = (0, -(R_OUT - d)), (R_OUT - d, 0)
    def clip_x(p, q, x):  # point on segment p-q with given x
        t = (x - p[0]) / (q[0] - p[0]); return (x, p[1] + t * (q[1] - p[1]))
    def clip_y(p, q, y):
        t = (y - p[1]) / (q[1] - p[1]); return (p[0] + t * (q[0] - p[0]), y)
    poly = [clip_x(o_top, o_right, GAP), clip_y(o_top, o_right, -GAP),
            clip_y(i_top, i_right, -GAP), clip_x(i_top, i_right, GAP)]
    return [(C0 + sx * x, C0 + sy * y) for x, y in poly]
c_paths = "".join(f'<polygon fill="{INK}" points="{pts(chevron(sx, sy))}"/>'
                  for sx, sy in ((1, 1), (-1, 1), (1, -1), (-1, -1)))
c_body = c_paths + f'<polygon fill="{INK}" points="{pts([(C0, C0 - R_C), (C0 + R_C, C0), (C0, C0 + R_C), (C0 - R_C, C0)])}"/>'

for key, body, title in (("a-country", a_body, "Concept A: the country is the mark"),
                         ("b-horizon", b_body, "Concept B: horizon B"),
                         ("c-compass", c_body, "Concept C: Amazigh compass")):
    (OUT / f"{key}-{V}.svg").write_text(svg(body, title), encoding="utf-8")
print("written", V)
