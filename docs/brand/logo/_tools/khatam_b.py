"""Khatam B: the BLADUS symbol (zellige eight-pointed star with a B), final-direction builder.

Design tooling only. Run from docs/brand/logo:
    python _tools/khatam_b.py options   -> concepts/kb-option-*.svg + sheet-kb-options.png
Fonts: decoded TTFs in $TEMP/bladus-tools/fonts (Fraunces variable, Plus Jakarta Sans variable).
"""
import json
import math
import os
import pathlib
import subprocess
import sys

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent
OUT = ROOT / "concepts"
FONTS = pathlib.Path(os.environ.get("TEMP", ".")) / "bladus-tools" / "fonts"
FRAUNCES = FONTS / "6e8c7cb283336a9d-s.p.ttf"
JAKARTA = FONTS / "636a5ac981f94f8b-s.p.ttf"
CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
NAVY, BLUE, SKY, WHITE = "#152C52", "#0B57D0", "#3FA5E2", "#fff"
sys.path.insert(0, str(HERE))
from glyphs import outline  # noqa: E402


def polar(cx, cy, r, deg):
    a = math.radians(deg)
    return (cx + r * math.cos(a), cy + r * math.sin(a))


def pts(p):
    return " ".join(f"{x:.2f},{y:.2f}" for x, y in p)


def khatam(cx, cy, R):
    r_in = R * math.cos(math.radians(45)) / math.cos(math.radians(22.5))
    out = []
    for k in range(8):
        out.append(polar(cx, cy, R, k * 45 - 90))
        out.append(polar(cx, cy, r_in, k * 45 - 90 + 22.5))
    return out, r_in


def octagon(cx, cy, r):
    return [polar(cx, cy, r, 22.5 + k * 45 - 90) for k in range(8)]


def glyph_path(font, axes, ch, cx, cy, height, nudge_x=0.0):
    o = outline(str(font), axes, ch)
    g = o["glyphs"][0]
    s = height / (g["yMax"] - g["yMin"])
    w = (g["xMax"] - g["xMin"]) * s
    tx = cx - w / 2 - g["xMin"] * s + nudge_x
    ty = cy - height / 2 - g["yMin"] * s
    return f'<path fill="{WHITE}" transform="translate({tx:.2f} {ty:.2f}) scale({s:.5f})" d="{g["d"]}"/>'


def symbol(b_markup, C=128, R=122, grout=6, inset=22):
    star, r_in = khatam(C, C, R)
    sq_a = [polar(C, C, R - inset, a) for a in (-90, 0, 90, 180)]
    sq_b = [polar(C, C, R - inset, a) for a in (-45, 45, 135, 225)]
    return (f'<polygon fill="{NAVY}" points="{pts(star)}"/>'
            f'<polygon fill="none" stroke="{WHITE}" stroke-width="{grout}" stroke-linejoin="miter" points="{pts(sq_a)}"/>'
            f'<polygon fill="none" stroke="{WHITE}" stroke-width="{grout}" stroke-linejoin="miter" points="{pts(sq_b)}"/>'
            f'<polygon fill="{BLUE}" points="{pts(octagon(C, C, r_in - inset))}"/>' + b_markup)


def svg(body, title, vb="0 0 256 256"):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" role="img"><title>{title}</title>{body}</svg>\n'


def geometric_b(cx=128, cy=128, h=80):
    top, bot, x0, mid, S = cy - h / 2, cy + h / 2, cx - 27, cy, 15
    rt, rb = (mid - top) / 2, (bot - mid) / 2
    xt, xb = x0 + 29, x0 + 34
    return (f'<path fill="{WHITE}" fill-rule="evenodd" d="M{x0},{top} H{xt} A{rt},{rt} 0 0 1 {xt},{mid} H{xb} '
            f'A{rb},{rb} 0 0 1 {xb},{bot} H{x0} Z M{x0 + S},{top + S} H{xt} A{rt - S},{rt - S} 0 0 1 {xt},{mid - S + 2} '
            f'H{x0 + S} Z M{x0 + S},{mid + S - 2} H{xb} A{rb - S},{rb - S} 0 0 1 {xb},{bot - S} H{x0 + S} Z"/>')


def render_sheet(items, name, sizes=(64, 32, 24, 16)):
    def inl(f, px):
        s = f.read_text(encoding="utf-8")
        return f'<div style="width:{px}px;height:{px}px;display:inline-block;vertical-align:middle;margin-right:14px">{s}</div>'
    rows = "".join(
        f'<section><div class="big">{inl(f, 220)}</div><div><h2>{t}</h2><p>{n}</p>'
        f'<div>{"".join(inl(f, px) for px in sizes)}</div>'
        f'<div class="row"><div class="dark">{inl(f, 52)}</div><div class="tab">{inl(f, 16)}<span>BLADUS | Stays in Algeria</span></div></div></div></section>'
        for f, t, n in items)
    html = f"""<!doctype html><html><head><meta charset="utf-8"><link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600&family=Plus+Jakarta+Sans:wght@400;600&display=swap" rel="stylesheet">
<style>body{{margin:0;padding:28px;background:#fff;font-family:'Plus Jakarta Sans',sans-serif;color:{NAVY};width:1100px}}
section{{display:flex;gap:36px;align-items:center;padding:18px 0;border-bottom:1px solid #E4EAF2}}
.big{{width:240px;height:240px;display:flex;align-items:center;justify-content:center;background:#F8FAFC;border-radius:16px}}
svg{{width:100%;height:100%;display:block}} h2{{font-family:Fraunces,serif;font-weight:600;margin:0 0 4px;font-size:24px}} p{{margin:0 0 12px;color:#475569}}
.row{{display:flex;gap:16px;margin-top:14px;align-items:center}} .dark{{background:{NAVY};padding:12px;border-radius:12px}}
.tab{{display:flex;align-items:center;gap:8px;background:#E4EAF2;padding:8px 14px;border-radius:10px 10px 0 0;font-size:13px}}</style></head><body>{rows}</body></html>"""
    page = OUT / f"{name}.html"
    page.write_text(html, encoding="utf-8")
    png = page.with_suffix(".png")
    h = 80 + 290 * len(items)
    subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars", f"--screenshot={png}",
                    f"--window-size=1160,{h}", "--virtual-time-budget=4000", page.as_uri()], capture_output=True, timeout=120)
    return png


if __name__ == "__main__" and sys.argv[1:2] == ["options"]:
    opts = [
        ("kb-option-1-fraunces", glyph_path(FRAUNCES, {"wght": 800, "opsz": 144}, "B", 128, 128, 82, 1.5),
         "1. Fraunces B", "The serif B of the BLADUS wordmark (Fraunces ExtraBold)."),
        ("kb-option-2-jakarta", glyph_path(JAKARTA, {"wght": 800}, "B", 128, 128, 78, 1.5),
         "2. Jakarta B", "The heavy sans B of the website interface (Plus Jakarta Sans ExtraBold)."),
        ("kb-option-3-geometric", geometric_b(), "3. Geometric B", "The earlier constructed B, for comparison."),
    ]
    items = []
    for key, b, t, n in opts:
        f = OUT / f"{key}.svg"
        f.write_text(svg(symbol(b), f"BLADUS symbol, {t}"), encoding="utf-8")
        items.append((f, t, n))
    print(render_sheet(items, "sheet-kb-options"))
