"""Make an HTML test sheet for concept SVGs and screenshot it with headless Chrome.

Usage: python sheet.py <version> [--color] -> concepts/sheet-<version>.png
Shows each mark large, at 64/32/24/16 px (real pixels), reversed on navy, and in a lockup.
The lockup wordmark uses live text in Fraunces (exploration only; final files will be outlined).
"""
import pathlib
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
C = ROOT / "concepts"
V = sys.argv[1]
COLOR = "--color" in sys.argv
CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
NAMES = [("a-country", "A. The country is the mark", "Algeria's outline as one solid tile: the whole country, one place to book it."),
         ("b-horizon", "B. Horizon B", "A B cut by one wave line: where the sea meets the land, coast to Sahara."),
         ("c-compass", "C. Amazigh compass", "Kabyle rhombus chevrons around a centre: four ways to travel, one place.")]

def mark(key, fill):
    s = (C / f"{key}-{V}.svg").read_text(encoding="utf-8")
    s = s.replace('fill="#000"', f'fill="{fill}"').replace('stroke="#000"', f'stroke="{fill}"')
    return s

def sized(key, px, fill, bg="#fff"):
    s = (C / f"{key}-{V}.svg").read_text(encoding="utf-8").replace('fill="#fff"', f'fill="{bg}"')
    s = s.replace('fill="#000"', f'fill="{fill}"').replace('stroke="#000"', f'stroke="{fill}"')
    return f'<div style="width:{px}px;height:{px}px;display:inline-block;vertical-align:middle;margin-right:14px">{s}</div>'

if "--mixes" in sys.argv:
    NAMES = [("m1-compass-country", "Mix 1. Compass around Algeria", "C's chevrons point inward to a small Algeria (A)."),
             ("m2-country-window", "Mix 2. Algeria with an Amazigh window", "A's outline with C's rhombus at its heart."),
             ("m3-rhombus-b", "Mix 3. B with Amazigh counters", "B's letter with C's rhombuses as its two holes."),
             ("m4-compass-wave", "Mix 4. Compass with a sea-and-land wave", "C's compass split by B's wave line.")]
ink = "#152C52" if COLOR else "#111"
rows = []
for key, name, note in NAMES:
    rows.append(f"""
<section>
  <div class="big">{sized(key, 200, ink)}</div>
  <div class="info">
    <h2>{name}</h2><p>{note}</p>
    <div class="ladder">{sized(key, 64, ink)}{sized(key, 32, ink)}{sized(key, 24, ink)}{sized(key, 16, ink)}</div>
    <div class="row">
      <div class="dark">{sized(key, 48, '#fff', '#152C52')}<span class="wm" style="color:#fff">BLADUS</span></div>
      <div class="light">{sized(key, 48, ink)}<span class="wm" style="color:{ink}">BLADUS</span></div>
    </div>
  </div>
</section>""")

html = f"""<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600&family=Plus+Jakarta+Sans:wght@400;600&display=swap" rel="stylesheet">
<style>
body{{margin:0;padding:28px;background:#fff;font-family:'Plus Jakarta Sans',sans-serif;color:#152C52;width:1340px}}
section{{display:flex;gap:36px;align-items:center;padding:22px 0;border-bottom:1px solid #E4EAF2}}
.big{{width:220px;height:220px;display:flex;align-items:center;justify-content:center;background:#F8FAFC;border-radius:16px}}
.big svg,.ladder svg,.row svg{{width:100%;height:100%;display:block}}
h2{{font-family:Fraunces,serif;font-weight:600;margin:0 0 4px;font-size:24px}} p{{margin:0 0 14px;color:#475569}}
.row{{display:flex;gap:18px;margin-top:16px}} .dark,.light{{display:flex;align-items:center;padding:14px 22px;border-radius:12px}}
.dark{{background:#152C52}} .light{{background:#fff;border:1px solid #E4EAF2}}
.wm{{font-family:Fraunces,serif;font-weight:600;font-size:34px;letter-spacing:3px}}
</style></head><body>{''.join(rows)}</body></html>"""
out_html = C / f"sheet-{'mix-' if '--mixes' in sys.argv else ''}{V}{'-color' if COLOR else ''}.html"
out_html.write_text(html, encoding="utf-8")
png = out_html.with_suffix(".png")
subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars", f"--screenshot={png}",
                "--window-size=1400,1250", "--virtual-time-budget=4000", out_html.as_uri()],
               capture_output=True, timeout=120)
print(png, png.exists())
