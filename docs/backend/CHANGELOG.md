# Backend blueprint changelog

All notable changes to the backend documentation package. Newest first.

## 2026-11-04

- Started the BLADUS (formerly DARNA) backend discovery and blueprint. Target stack: Django + PostgreSQL. Documentation only, no backend code.
- Recovered the original specification documents from git history into `_sources/`: `darna_spec.md`, `clean_user_spec.md`, `usability-report.md`, `admin-usability-report.md` (they were deleted from the working tree in earlier commits).
- Phase 1 started: inventory of the website and admin apps, spec-versus-code comparison, live click-through of the main guest and host flows (`_work/click-through.md`).
- Phase 2 started: research on comparable platforms, the Django ecosystem, Algeria (payments, messaging, legal, geography, hosting, culture) and security.
- Phase 1 done: `01-system-inventory.md` (features per actor, data, `lib/data` bridge, 25 business rules, click-through, gaps), with raw appendices A to E.
- Phase 2 done: `02-research.md` (sections A to E, decisions R-1 to R-11, verification flags).
- Added `glossary.md` and `14-open-questions.md` (13 product questions, 7 legal, 4 finance).
- Paused for product-owner feedback before Phase 3, as agreed.
- Product owner accepted all defaults (Q1 to Q13), recorded as DEC-001 to DEC-013.
- Phase 3 done: `03-requirements.md` + `requirements.csv` (144 requirements: 123 MVP, 19 R2, 2 Later; generated from `_tools/requirements_data.py`), `04-business-rules.md` (rules by area, 4 state machines, worked money examples, ledger postings). Every rule ID cited by a requirement exists.
- Phase 4 done: 29 diagrams in `diagrams/` (context, containers, Django apps, 4 state machines, 5 sequences, money flow, document map, 15 ERDs), each with caption and legend in `diagrams/README.md`; rendered to SVG and PNG in `diagrams/rendered/`.
- Phase 5 done: `schema.dbml` (74 tables, 33 enums, 152 foreign keys; validated with the official DBML CLI), `05-database-schema.md` (14 ADRs, SQL constraints, query plan, mapping, seed plan), `05b-data-dictionary.md` (generated). Added questions Q14 to Q20.
- Paused for product-owner feedback on the schema, as agreed.
