"""Render every docs/backend/diagrams/*.mmd to SVG and PNG with mermaid-cli and the local Chrome.

Documentation tooling only. Setup once, OUTSIDE the repo (nothing is installed into it):
    mkdir %TEMP%/bladus-tools ; cd %TEMP%/bladus-tools
    npm init -y ; PUPPETEER_SKIP_DOWNLOAD=1 npm i @mermaid-js/mermaid-cli
Then from docs/backend:  python _tools/render_diagrams.py [diagram-stem ...]
"""
import json
import os
import pathlib
import subprocess
import sys

TOOLS = pathlib.Path(os.environ.get("BLADUS_TOOLS", pathlib.Path(os.environ.get("TEMP", ".")) / "bladus-tools"))
CHROME = os.environ.get("CHROME_PATH", r"C:\Program Files\Google\Chrome\Application\chrome.exe")
D = pathlib.Path(__file__).resolve().parent.parent / "diagrams"
OUT = D / "rendered"
OUT.mkdir(exist_ok=True)

pcfg = TOOLS / "puppeteer.json"
pcfg.write_text(json.dumps({"executablePath": CHROME, "args": ["--no-sandbox"]}), encoding="utf-8")
mcfg = TOOLS / "mermaid.json"
mcfg.write_text(json.dumps({"theme": "neutral", "er": {"layoutDirection": "LR"},
                            "themeVariables": {"fontFamily": "Arial, sans-serif"}}), encoding="utf-8")
mmdc = TOOLS / "node_modules" / ".bin" / ("mmdc.cmd" if os.name == "nt" else "mmdc")

only = set(sys.argv[1:])
fails = []
for src in sorted(D.glob("*.mmd")):
    if only and src.stem not in only:
        continue
    for ext in ("svg", "png"):
        args = [str(mmdc), "-i", str(src), "-o", str(OUT / f"{src.stem}.{ext}"),
                "-p", str(pcfg), "-c", str(mcfg), "-b", "white", "-q"]
        if ext == "png":
            args += ["-s", "2"]
        r = subprocess.run(args, capture_output=True, text=True)
        if r.returncode != 0:
            fails.append((src.name, ext, (r.stderr or r.stdout)[-400:]))
            break
print("failed:", len(fails))
for f in fails:
    print(*f)
