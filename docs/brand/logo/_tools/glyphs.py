"""Outline glyphs from the site's own fonts (Fraunces, Plus Jakarta Sans; both SIL OFL, logo use allowed).

Design tooling only. Needs fontTools and decoded TTFs (see README in this folder).
    python glyphs.py <font.ttf> <axes like wght=700,opsz=144> <text> [--kern]
Prints JSON: {"unitsPerEm", "ascender", "capHeight", "glyphs": [{"char","d","advance","xMin","xMax","yMin","yMax"}]}
Paths are in font units with y flipped (SVG down).
"""
import json
import sys

from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer


def outline(font_path, axes, text):
    f = TTFont(font_path)
    if "fvar" in f and axes:
        f = instancer.instantiateVariableFont(f, axes)
    gs = f.getGlyphSet()
    cmap = f.getBestCmap()
    upm = f["head"].unitsPerEm
    os2 = f["OS/2"]
    out = {"unitsPerEm": upm, "ascender": f["hhea"].ascent,
           "capHeight": getattr(os2, "sCapHeight", 0), "glyphs": []}
    for ch in text:
        name = cmap[ord(ch)]
        g = gs[name]
        pen = SVGPathPen(gs)
        g.draw(TransformPen(pen, (1, 0, 0, -1, 0, 0)))
        bp = BoundsPen(gs)
        g.draw(bp)
        xmin, ymin, xmax, ymax = bp.bounds or (0, 0, 0, 0)
        out["glyphs"].append({"char": ch, "name": name, "d": pen.getCommands(), "advance": g.width,
                              "xMin": xmin, "xMax": xmax, "yMin": -ymax, "yMax": -ymin})
    return out


if __name__ == "__main__":
    font, axes_s, text = sys.argv[1], sys.argv[2], sys.argv[3]
    axes = {k: float(v) for k, v in (p.split("=") for p in axes_s.split(",") if p)} if axes_s != "-" else {}
    print(json.dumps(outline(font, axes, text)))
