"""Build schema.sql: the PostgreSQL rendering of schema.dbml plus the extra SQL of 05-database-schema.md.

Documentation tooling only. Run from docs/backend:  python _tools/build_schema_sql.py
Needs the official DBML CLI in the temporary tools folder (outside the repo):
    cd %TEMP%/bladus-tools ; npm i @dbml/cli
schema.sql = header + `dbml2sql --postgres schema.dbml` + the SQL block of 05-database-schema.md
section 6 (exclusion constraint, checks, triggers, role split, trigram indexes), after a marker line.
"""
import os
import pathlib
import re
import subprocess
import tempfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
TOOLS = pathlib.Path(os.environ.get("BLADUS_TOOLS", pathlib.Path(os.environ.get("TEMP", tempfile.gettempdir())) / "bladus-tools"))
CLI = TOOLS / "node_modules" / ".bin" / ("dbml2sql.cmd" if os.name == "nt" else "dbml2sql")
MARKER = "-- ==== EXTRA SQL FROM 05-database-schema.md SECTION 6 (not expressible in DBML) ===="

out = pathlib.Path(tempfile.gettempdir()) / "bladus-schema-gen.sql"
subprocess.run([str(CLI), str(ROOT / "schema.dbml"), "--postgres", "-o", str(out)], check=True, capture_output=True, shell=os.name == "nt", cwd=tempfile.gettempdir())
gen = out.read_text(encoding="utf-8")
gen = re.sub(r"^-- Generated at: .*\n", "", gen, flags=re.M)
doc = (ROOT / "05-database-schema.md").read_text(encoding="utf-8")
extra = re.search(r"```sql\n(.*?)```", doc, re.S).group(1).strip()
header = ("-- Generated from schema.dbml with @dbml/cli (dbml2sql --postgres) by _tools/build_schema_sql.py.\n"
          "-- Documentation artifact, not a migration. The extra SQL (exclusion constraint, checks, triggers,\n"
          "-- role split, trigram indexes) from 05-database-schema.md section 6 is appended after the marker line.\n")
text = header + gen.rstrip() + "\n\n" + MARKER + "\n\n" + extra + "\n"
assert chr(0x2014) not in text, "em dash"
(ROOT / "schema.sql").write_text(text, encoding="utf-8", newline="\n")
print(f"schema.sql: {text.count(chr(10))} lines, {len(re.findall(r'^CREATE TABLE', text, re.M))} tables, "
      f"{len(re.findall(r'^CREATE TRIGGER', text, re.M))} triggers")
