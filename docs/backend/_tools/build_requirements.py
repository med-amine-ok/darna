"""Build requirements.csv and the tables inside 03-requirements.md from requirements_data.py.

Documentation tooling only. Run from docs/backend:  python _tools/build_requirements.py
"""
import csv
import collections
import pathlib
import sys

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent
sys.path.insert(0, str(HERE))
from requirements_data import MODULES, R  # noqa: E402

COLS = ["id", "module", "title", "actor", "priority", "release", "source", "acceptance", "code_today", "rules"]

ids = [r[0] for r in R]
dupes = [i for i, n in collections.Counter(ids).items() if n > 1]
assert not dupes, f"duplicate ids: {dupes}"
for r in R:
    assert len(r) == len(COLS), r[0]
    assert r[1] in MODULES, r[0]
    assert r[4] in ("Must", "Should", "Could"), r[0]
    assert r[5] in ("MVP", "R2", "Later"), r[0]
    assert chr(0x2014) not in "".join(r), f"em dash in {r[0]}"

with open(ROOT / "requirements.csv", "w", newline="", encoding="utf-8") as f:
    w = csv.writer(f)
    w.writerow(COLS)
    w.writerows(R)

out = []
counts = collections.Counter((r[4], r[5]) for r in R)
out.append("| Priority | MVP | R2 | Later | Total |")
out.append("|---|---|---|---|---|")
for p in ("Must", "Should", "Could"):
    row = [counts[(p, rel)] for rel in ("MVP", "R2", "Later")]
    out.append(f"| {p} | {row[0]} | {row[1]} | {row[2]} | {sum(row)} |")
out.append(f"| **Total** | {sum(1 for r in R if r[5]=='MVP')} | {sum(1 for r in R if r[5]=='R2')} | {sum(1 for r in R if r[5]=='Later')} | **{len(R)}** |")
out.append("")

for code, name in MODULES.items():
    rows = [r for r in R if r[1] == code]
    out.append(f"### {code}: {name} ({len(rows)})")
    out.append("")
    out.append("| ID | Requirement | Actor | Pri. | Release | Accepted when | Today in code | Source | Rules |")
    out.append("|---|---|---|---|---|---|---|---|---|")
    for r in rows:
        cells = [r[0], r[2], r[3], r[4], r[5], r[7], r[8], r[6], r[9]]
        out.append("| " + " | ".join(c.replace("|", "/") for c in cells) + " |")
    out.append("")

doc = ROOT / "03-requirements.md"
text = doc.read_text(encoding="utf-8")
start, end = "<!-- BEGIN GENERATED REQUIREMENTS -->", "<!-- END GENERATED REQUIREMENTS -->"
a, b = text.index(start) + len(start), text.index(end)
doc.write_text(text[:a] + "\n" + "\n".join(out) + "\n" + text[b:], encoding="utf-8")
print(f"{len(R)} requirements written")
