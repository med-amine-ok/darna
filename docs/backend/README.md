# docs/backend: BLADUS backend blueprint

> **In plain words**
> This folder is the complete plan for the BLADUS backend (Django + PostgreSQL), written before any backend code.
> Start with [00-START-HERE.md](00-START-HERE.md). For one file with everything, open `dist/BLADUS-backend-blueprint.pdf`.
> Nothing here is code that runs in production: only documents, diagrams, a database schema description and an API contract.

## What is in this folder

| Path | What it is |
|---|---|
| `00-START-HERE.md` | Reading order, summary, readiness verdict, first build prompt |
| `explain-like-im-new.md`, `glossary.md` | Plain-language introduction and every term explained |
| `01` to `14` `*.md` | The blueprint, one document per topic (see 00-START-HERE) |
| `requirements.csv`, `traceability.csv` | Spreadsheet versions of the requirements and the traceability matrix |
| `schema.dbml`, `schema.sql`, `05b-data-dictionary.md` | Database schema (source, PostgreSQL rendering, column dictionary) |
| `openapi.yaml` | API contract (OpenAPI 3.1) |
| `diagrams/` | Mermaid sources (`*.mmd`), rendered SVG/PNG in `rendered/`, captions and legends in `README.md` |
| `dist/` | Built package: `site/index.html` (browsable), `BLADUS-backend-blueprint.pdf` (everything), raw files |
| `_sources/` | Original spec and usability reports recovered from git history |
| `_work/` | Raw working notes from the inventories and research (appendices) |
| `_tools/` | Small scripts that generate tables, the dictionary, diagrams and the package |
| `CHANGELOG.md` | What changed in the blueprint and when |

## Rebuilding generated files

Run from `docs/backend`. The scripts only write inside this folder.

| Command | Regenerates |
|---|---|
| `python _tools/build_requirements.py` | `requirements.csv` and the tables in `03-requirements.md` (edit `_tools/requirements_data.py`) |
| `python _tools/build_schema_docs.py` | `05b-data-dictionary.md` and `diagrams/erd-*.mmd` from `schema.dbml` |
| `python _tools/build_traceability.py` | `traceability.csv` and `traceability.md` |
| `python _tools/render_diagrams.py` | `diagrams/rendered/*.svg` and `*.png` |
| `node _tools/build_dist.mjs` | `dist/` (HTML site and PDF) |

The Node tools (Mermaid CLI, marked, js-yaml) are installed in a temporary folder outside the repository; the setup lines are at the top of `render_diagrams.py` and `build_dist.mjs`. A local Google Chrome is used for rendering.

## Rules followed in every document

- Each document starts with an "In plain words" box (8 lines or fewer), explains each technical term at first use, and ends with "Check yourself".
- Legal, tax and financial points are research, marked **VERIFY WITH A PROFESSIONAL**.
- Brand is BLADUS; some internal identifiers still say `darna` on purpose.

## Check yourself

- [ ] Which file do you open first?
- [ ] Which command rebuilds the HTML site and the PDF?
- [ ] Why should you edit `_tools/requirements_data.py` instead of `requirements.csv`?
