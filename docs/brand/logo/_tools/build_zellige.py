"""Zellige concepts for BLADUS, based on Algerian-attested motifs.

Design tooling only. Run: python docs/brand/logo/_tools/build_zellige.py [version]
Writes concepts/z*-<v>.svg (colour) and z*-<v>-mono.svg (one colour: #000 ink, #fff grout),
then a test sheet concepts/sheet-zellige-<v>.png via headless Chrome.

Motifs:
- Qal'at Bani Hammad (Algeria, 11th c.): interlocking eight-pointed star (khatam) and cross tiles.
- Tlemcen (14th c.): white strips in a 45 degree lattice with small coloured stars at crossings;
  colours placed alternately (quinconce).
"""
import math
import pathlib
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "concepts"
V = sys.argv[1] if len(sys.argv) > 1 else "v1"
NAVY, BLUE, SKY, GROUT = "#152C52", "#0B57D0", "#3FA5E2", "#fff"
CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"


def pts(p):
    return " ".join(f"{x:.2f},{y:.2f}" for x, y in p)


def polar(cx, cy, r, deg):
    a = math.radians(deg)
    return (cx + r * math.cos(a), cy + r * math.sin(a))


def khatam(cx, cy, R, rot=0):
    """Regular 8-pointed star {8/2} (two overlapping squares) as a 16-point outline."""
    r_in = R * math.cos(math.radians(45)) / math.cos(math.radians(22.5))
    out = []
    for k in range(8):
        out.append(polar(cx, cy, R, rot + k * 45 - 90))
        out.append(polar(cx, cy, r_in, rot + k * 45 - 90 + 22.5))
    return out, r_in


def octagon(cx, cy, r, rot=22.5):
    return [polar(cx, cy, r, rot + k * 45 - 90) for k in range(8)]


def poly(p, fill, grout=0):
    s = f' stroke="{GROUT}" stroke-width="{grout}" stroke-linejoin="miter"' if grout else ""
    return f'<polygon fill="{fill}" points="{pts(p)}"{s}/>'


def svg(body, title):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" role="img">'
            f'<title>{title}</title>{body}</svg>\n')


# ------------------------------------------------------------ Z1 Mosaic khatam
# Centre octagon ring (navy) with a small sky khatam inside; 8 points alternating blue / navy.
def z1():
    C, R, G = 128, 120, 6
    star, r_in = khatam(C, C, R)
    b = []
    for k in range(8):  # the 8 triangular points
        tip = star[2 * k]
        left = star[(2 * k - 1) % 16]
        right = star[2 * k + 1]
        b.append(poly([left, tip, right], BLUE if k % 2 == 0 else SKY, G))
    b.append(poly(octagon(C, C, r_in * 0.98), NAVY, G))
    small, _ = khatam(C, C, r_in * 0.62)
    b.append(poly(small, GROUT))
    small2, _ = khatam(C, C, r_in * 0.62 - 9)
    b.append(poly(small2, SKY))
    return "".join(b)


# ------------------------------------------------------------ Z2 Hammadid star and cross tile
def z2():
    x0, size, rad, G = 20, 216, 30, 6
    c = x0 + size / 2
    clip = f'<clipPath id="z2c"><rect x="{x0}" y="{x0}" width="{size}" height="{size}" rx="{rad}"/></clipPath>'
    b = [clip, f'<rect x="{x0}" y="{x0}" width="{size}" height="{size}" rx="{rad}" fill="{NAVY}"/>',
         '<g clip-path="url(#z2c)">']
    R = size / 2 * math.sqrt(2) / 2  # stars at centre and corners touch on the diagonals
    for (sx, sy), col in (((c, c), BLUE), ((x0, x0), SKY), ((x0 + size, x0), SKY),
                          ((x0, x0 + size), SKY), ((x0 + size, x0 + size), SKY)):
        st, _ = khatam(sx, sy, R, rot=0)
        b.append(poly(st, col, G))
    b.append("</g>")
    return "".join(b)


# ------------------------------------------------------------ Z3 Tlemcen lattice B
def z3():
    x0, top, bot = 58, 30, 226
    mid = (top + bot) / 2
    rt, rb = (mid - top) / 2, (bot - mid) / 2
    S = 34
    B_OUT = f"M{x0},{top} H132 A{rt},{rt} 0 0 1 132,{mid} H146 A{rb},{rb} 0 0 1 146,{bot} H{x0} Z"
    holes = (f"M{x0 + S},{top + S} H132 A{rt - S},{rt - S} 0 0 1 132,{mid - S} H{x0 + S} Z "
             f"M{x0 + S},{mid + S} H146 A{rb - S},{rb - S} 0 0 1 146,{bot - S} H{x0 + S} Z")
    b = [f'<clipPath id="z3c"><path fill-rule="evenodd" clip-rule="evenodd" d="{B_OUT} {holes}"/></clipPath>',
         f'<path fill="{NAVY}" fill-rule="evenodd" d="{B_OUT} {holes}"/>', '<g clip-path="url(#z3c)">']
    step, w = 52, 7
    for k in range(-10, 12):
        o = k * step
        b.append(f'<line x1="{o}" y1="0" x2="{o + 256}" y2="256" stroke="{GROUT}" stroke-width="{w}"/>')
        b.append(f'<line x1="{o}" y1="256" x2="{o + 256}" y2="0" stroke="{GROUT}" stroke-width="{w}"/>')
    # small coloured stars at the lattice crossings (alternating colours)
    for i in range(-2, 12):
        for j in range(-2, 12):
            x = i * step / 2 + (j % 2) * 0
            px, py = (i + j) * step / 2, (j - i) * step / 2 + 128
            if 40 < px < 210 and 20 < py < 236:
                st, _ = khatam(px, py, 10)
                b.append(poly(st, SKY if (i + j) % 2 == 0 else BLUE))
    b.append("</g>")
    return "".join(b)


# ------------------------------------------------------------ Z4 Khatam B
def z4():
    C, R = 128, 122
    star, r_in = khatam(C, C, R)
    sq1 = [polar(C, C, R, a) for a in (-45, 45, 135, 225)]     # upright square (corners on diagonals)
    sq2 = [polar(C, C, R, a) for a in (-90, 0, 90, 180)]       # square on its point
    b = [poly(star, NAVY)]
    # grout lines: the inner edges of both squares, as in a cut zellige khatam
    b.append(f'<polygon fill="none" stroke="{GROUT}" stroke-width="6" points="{pts([polar(C, C, R - 22, a) for a in (-90, 0, 90, 180)])}"/>')
    b.append(f'<polygon fill="none" stroke="{GROUT}" stroke-width="6" points="{pts([polar(C, C, R - 22, a) for a in (-45, 45, 135, 225)])}"/>')
    b.append(poly(octagon(C, C, r_in - 22), BLUE))
    # geometric B inside the centre octagon, as white with two sky counters
    h = 78
    top, bot, x0 = C - h / 2, C + h / 2, C - 26
    mid = C
    S = 15
    rt, rb = (mid - top) / 2, (bot - mid) / 2
    xt, xb = x0 + 28, x0 + 33
    B_OUT = f"M{x0},{top} H{xt} A{rt},{rt} 0 0 1 {xt},{mid} H{xb} A{rb},{rb} 0 0 1 {xb},{bot} H{x0} Z"
    holes = (f"M{x0 + S},{top + S} H{xt} A{rt - S},{rt - S} 0 0 1 {xt},{mid - S + 2} H{x0 + S} Z "
             f"M{x0 + S},{mid + S - 2} H{xb} A{rb - S},{rb - S} 0 0 1 {xb},{bot - S} H{x0 + S} Z")
    b.append(f'<path fill="{GROUT}" fill-rule="evenodd" d="{B_OUT} {holes}"/>')
    return "".join(b)


CONCEPTS = [
    ("z1-mosaic-khatam", z1, "Mosaic khatam", "The eight-pointed zellige star, cut into tile pieces with white grout."),
    ("z2-hammadid-tile", z2, "Hammadid tile", "One tile of the star-and-cross zellige of Qal'at Bani Hammad (Algeria, 11th c.)."),
    ("z3-tlemcen-b", z3, "Tlemcen B", "The letter B laid in Tlemcen lattice: white strips, small stars at the crossings."),
    ("z4-khatam-b", z4, "Khatam B", "The B of BLADUS at the heart of a zellige star."),
]


def mono(s):
    for c in (NAVY, BLUE, SKY):
        s = s.replace(f'fill="{c}"', 'fill="#000"')
    return s


for key, fn, name, note in CONCEPTS:
    s = svg(fn(), f"BLADUS concept: {name}")
    (OUT / f"{key}-{V}.svg").write_text(s, encoding="utf-8")
    (OUT / f"{key}-{V}-mono.svg").write_text(mono(s), encoding="utf-8")


def inline(key, px, variant="colour", ink="#000", bg="#fff"):
    s = (OUT / f"{key}-{V}{'' if variant == 'colour' else '-mono'}.svg").read_text(encoding="utf-8")
    if variant != "colour":
        s = s.replace('fill="#fff"', f'fill="{bg}"').replace('stroke="#fff"', f'stroke="{bg}"')
        s = s.replace('fill="#000"', f'fill="{ink}"')
    s = s.replace('id="', f'id="{px}{variant}').replace('url(#', f'url(#{px}{variant}')
    return f'<div style="width:{px}px;height:{px}px;display:inline-block;vertical-align:middle;margin-right:14px">{s}</div>'


rows = []
for key, _fn, name, note in CONCEPTS:
    rows.append(f"""<section><div class="big">{inline(key, 200)}</div><div class="info">
<h2>{name}</h2><p>{note}</p>
<div>{inline(key, 64)}{inline(key, 32)}{inline(key, 24)}{inline(key, 16)}
<span class="lbl">one colour</span>{inline(key, 48, 'mono', NAVY)}{inline(key, 16, 'mono', NAVY)}</div>
<div class="row"><div class="dark">{inline(key, 48, 'mono', '#fff', NAVY)}<span class="wm" style="color:#fff">BLADUS</span></div>
<div class="light">{inline(key, 48)}<span class="wm" style="color:{NAVY}">BLADUS</span></div></div></div></section>""")
html = f"""<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600&family=Plus+Jakarta+Sans:wght@400;600&display=swap" rel="stylesheet">
<style>body{{margin:0;padding:28px;background:#fff;font-family:'Plus Jakarta Sans',sans-serif;color:{NAVY};width:1340px}}
section{{display:flex;gap:36px;align-items:center;padding:20px 0;border-bottom:1px solid #E4EAF2}}
.big{{width:220px;height:220px;display:flex;align-items:center;justify-content:center;background:#F8FAFC;border-radius:16px}}
svg{{width:100%;height:100%;display:block}} h2{{font-family:Fraunces,serif;font-weight:600;margin:0 0 4px;font-size:24px}}
p{{margin:0 0 12px;color:#475569}} .lbl{{font-size:12px;color:#64748B;margin:0 10px 0 16px}}
.row{{display:flex;gap:18px;margin-top:14px}} .dark,.light{{display:flex;align-items:center;padding:12px 22px;border-radius:12px}}
.dark{{background:{NAVY}}} .light{{background:#fff;border:1px solid #E4EAF2}}
.wm{{font-family:Fraunces,serif;font-weight:600;font-size:34px;letter-spacing:3px}}</style></head>
<body>{''.join(rows)}</body></html>"""
page = OUT / f"sheet-zellige-{V}.html"
page.write_text(html, encoding="utf-8")
png = page.with_suffix(".png")
subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars", f"--screenshot={png}",
                "--window-size=1400,1220", "--virtual-time-budget=4000", page.as_uri()], capture_output=True, timeout=120)
print(png, png.exists())
