"""Check that the diagrams and the documents cannot drift from openapi.yaml (DEC-031).

Documentation tooling only. Run from docs/backend:  python _tools/check_contract_refs.py [--list]

1. Reads openapi.yaml and computes the one operation count (and the path count).
2. Every "METHOD /path" written in diagrams/*.mmd must be an operation of openapi.yaml.
   Paths in diagrams may omit the /api/v1 prefix; a query string is ignored; a {placeholder}
   matches any {placeholder} in the same place.
3. Every "<number> operations" or "<number> API operations" stated in the Markdown documents
   (except CHANGELOG.md, which keeps history, and _work/, _sources/, dist/) must equal the
   computed operation count; "<number> paths" next to it must equal the path count.
Exits 1 on any failure, so it can run in CI. --list prints the computed operation list.
"""
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
METHODS = ("get", "post", "put", "patch", "delete")
PREFIX = "/api/v1"


def load_operations():
    """Operations from openapi.yaml as (METHOD, path). Uses PyYAML when present, else a line reader."""
    text = (ROOT / "openapi.yaml").read_text(encoding="utf-8")
    try:
        import yaml
        spec = yaml.safe_load(text)
        return sorted((m.upper(), p) for p, item in spec["paths"].items() for m in item if m in METHODS)
    except ImportError:
        ops, path = [], None
        for line in text.splitlines():
            if line.startswith("components:"):
                break
            if line.startswith("  /") and line.rstrip().endswith(":"):
                path = line.strip()[:-1]
            elif path and re.match(r"^    (get|post|put|patch|delete):\s*$", line):
                ops.append((line.strip()[:-1].upper(), path))
        return sorted(ops)


def norm(path):
    path = path.split("?")[0].rstrip(".,;:)")
    if not path.startswith(PREFIX):
        path = PREFIX + path
    return re.sub(r"\{[^}]*\}", "{}", path)


def main():
    ops = load_operations()
    n_ops, n_paths = len(ops), len({p for _, p in ops})
    known = {(m, norm(p)) for m, p in ops}
    errors = []

    # 2. diagrams
    checked = 0
    for mmd in sorted((ROOT / "diagrams").glob("*.mmd")):
        for i, line in enumerate(mmd.read_text(encoding="utf-8").splitlines(), 1):
            for m, p in re.findall(r"\b(GET|POST|PUT|PATCH|DELETE) (/[^\s]*)", line):
                checked += 1
                if (m, norm(p)) not in known:
                    errors.append(f"diagrams/{mmd.name}:{i}: {m} {p} is not an operation of openapi.yaml")

    # 3. stated counts in the documents
    counted = 0
    skip_dirs = {"_work", "_sources", "dist", "node_modules"}
    for md in sorted(ROOT.rglob("*.md")):
        rel = md.relative_to(ROOT)
        if rel.parts[0] in skip_dirs or md.name == "CHANGELOG.md":
            continue
        for i, line in enumerate(md.read_text(encoding="utf-8").splitlines(), 1):
            for num, paths in re.findall(r"\b(\d{3})(?: API)? operations(?: on (\d{3}) paths)?", line):
                counted += 1
                if int(num) != n_ops:
                    errors.append(f"{rel}:{i}: says {num} operations, openapi.yaml has {n_ops}")
                if paths and int(paths) != n_paths:
                    errors.append(f"{rel}:{i}: says {paths} paths, openapi.yaml has {n_paths}")

    if "--list" in sys.argv:
        for m, p in ops:
            print(m, p)
    print(f"openapi.yaml: {n_ops} operations on {n_paths} paths")
    print(f"diagram endpoint labels checked: {checked}; stated counts checked: {counted}")
    if errors:
        print(f"FAILED: {len(errors)} problem(s)")
        print("\n".join(errors))
        sys.exit(1)
    print("OK: every diagram endpoint exists in openapi.yaml and every stated count matches")


if __name__ == "__main__":
    main()
