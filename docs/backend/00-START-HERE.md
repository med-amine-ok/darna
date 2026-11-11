# 00. Start here: BLADUS backend blueprint

> **In plain words**
> BLADUS has a finished-looking website and admin, but no real backend: data lives in memory and the two apps do not share it.
> This folder is the complete plan for that backend, built with Django and PostgreSQL, designed for Algeria.
> It was written before any backend code: what exists, what to build, the rules, the database, the API, security, hosting, tests and the plan.
> Verdict: **ready to start the first milestone now**; real customer data waits for two legal answers on hosting.
> New to these topics? Read [explain-like-im-new.md](explain-like-im-new.md) first. Everything in one file: `dist/BLADUS-backend-blueprint.pdf`.

**Terms used here** (all in [glossary.md](glossary.md)): **backend** (the server program that stores data and applies rules), **API** (the list of addresses the apps call), **schema** (the design of the database tables), **milestone** (a 3 to 5 week block of work).

Prepared 2026-11-04 to 2026-11-09. Documentation only: no backend code exists yet.

---

## 1. The plan in ten lines

1. **Stack**: Django 6.1, Django REST Framework, PostgreSQL with PostGIS, Redis and Celery, django-allauth (email and phone codes, two-factor login). The two Next.js apps stay and call the API through their server ([02-research.md](02-research.md) B, [07-architecture.md](07-architecture.md)).
2. **Money (DEC-001)**: guests pay hosts directly; hosts keep a prepaid deposit; BLADUS deducts its commission (12% individual, 15% agency, 18% hotel, 10% hostel) on each confirmed booking. Guests pay no BLADUS fee. Everything is recorded in a double-entry ledger.
3. **No double booking**: the database itself refuses overlapping stays and over-selling of rooms, beds and seats ([05-database-schema.md](05-database-schema.md)).
4. **Who publishes what (DEC-014)**: solo hosts publish homes and vehicles, agencies publish experiences and trips, hotels and hostels publish their property.
5. **Types (DEC-015)**: 8 experience types and 8 trip types, one shared list.
6. **Moderation (DEC-003)**: new listings and trips are reviewed by staff before going live.
7. **Algeria**: hosting in Algeria and a `.com.dz` domain are likely required; personal data should not leave the country without authorisation (VERIFY WITH A PROFESSIONAL).
8. **Size**: 147 requirements (126 in the first release), 77 tables, 266 API operations.
9. **Plan**: 8 milestones (M0 to M7, about 29 weeks plus a 2-week buffer) for a team of 2 backend developers and 1 part-time frontend developer, then R2 ([11-roadmap.md](11-roadmap.md)).
10. **Open**: 48 decisions remain, most of them for the lawyer and accountant ([13-decisions-needed.md](13-decisions-needed.md)).

## 2. Reading order

| # | Document | Read it to learn | Time |
|---|---|---|---|
| 0 | [explain-like-im-new.md](explain-like-im-new.md) | The whole system as a simple story | 10 min |
| 1 | [01-system-inventory.md](01-system-inventory.md) | What the website and admin do today, and what is broken or missing | 25 min |
| 2 | [02-research.md](02-research.md) | Other platforms, Django tool choices, Algerian payments, law, geography, hosting, security | 30 min |
| 3 | [03-requirements.md](03-requirements.md) + [requirements.csv](requirements.csv) | Every requirement, the 15 product decisions | 30 min |
| 4 | [04-business-rules.md](04-business-rules.md) | Exact rules: prices, refunds, statuses, money postings | 30 min |
| 5 | [diagrams/README.md](diagrams/README.md) | 29 diagrams with captions and legends | 15 min |
| 6 | [05-database-schema.md](05-database-schema.md) + [05b-data-dictionary.md](05b-data-dictionary.md) + [schema.dbml](schema.dbml) / [schema.sql](schema.sql) | The database, design decisions, constraints, query plan | 40 min |
| 7 | [06-api-design.md](06-api-design.md) + [openapi.yaml](openapi.yaml) | API conventions and every endpoint | 40 min |
| 8 | [07-architecture.md](07-architecture.md) | Django apps, jobs, transactions, how the apps switch from demo data | 30 min |
| 9 | [08-security-privacy.md](08-security-privacy.md) | Threats, login, permissions, privacy under Algerian law | 30 min |
| 10 | [09-devops-hosting.md](09-devops-hosting.md) | Environments, hosting in Algeria, CI/CD, backups, monitoring, costs | 25 min |
| 11 | [10-testing-quality.md](10-testing-quality.md) | Test strategy and quality gates | 20 min |
| 12 | [11-roadmap.md](11-roadmap.md) | Milestones, dates, gates | 20 min |
| 13 | [12-risks.md](12-risks.md) | 32 risks with mitigations | 15 min |
| 14 | [13-decisions-needed.md](13-decisions-needed.md) + [14-open-questions.md](14-open-questions.md) | What is still to decide, by whom, by when | 20 min |
| 15 | [traceability.md](traceability.md) + [traceability.csv](traceability.csv) | Each requirement linked to rules, tables, endpoints, tests, milestone | reference |
| 16 | [15-readiness-and-first-build-prompt.md](15-readiness-and-first-build-prompt.md) | The verdict and the prompt to start building | 10 min |
| | [glossary.md](glossary.md) | Every term explained | reference |

## 3. Deliverables checklist

| Asked for | Delivered |
|---|---|
| Phase 1: inventory (features per actor, data, `lib/data` bridge, rules, gaps, click-through) | [01-system-inventory.md](01-system-inventory.md) with appendices in `_work/` |
| Phase 2: research A to D with URLs, dates, decisions, verify flags | [02-research.md](02-research.md) (full source lists in `_work/research-*.md`) |
| Phase 3: requirements, CSV, business rules | [03-requirements.md](03-requirements.md), [requirements.csv](requirements.csv), [04-business-rules.md](04-business-rules.md) |
| Phase 4: rendered diagrams with captions and legends | `diagrams/*.mmd`, `diagrams/rendered/` (SVG and PNG), [diagrams/README.md](diagrams/README.md) |
| Phase 5: schema, data dictionary, DBML, ADRs, seed plan, mapping, query plan | [05-database-schema.md](05-database-schema.md), [05b-data-dictionary.md](05b-data-dictionary.md), [schema.dbml](schema.dbml), [schema.sql](schema.sql) |
| Phase 6: API design and OpenAPI | [06-api-design.md](06-api-design.md), [openapi.yaml](openapi.yaml) (lint: 0 errors, 0 warnings) |
| Phase 7: architecture, security and privacy, DevOps and hosting, testing | [07](07-architecture.md), [08](08-security-privacy.md), [09](09-devops-hosting.md), [10](10-testing-quality.md) |
| Phase 8: roadmap, risks, decisions, open questions | [11](11-roadmap.md), [12](12-risks.md), [13](13-decisions-needed.md), [14](14-open-questions.md) |
| Plain-language layer | this page, [explain-like-im-new.md](explain-like-im-new.md), [glossary.md](glossary.md), [README.md](README.md), an "In plain words" box and "Check yourself" in every document |
| Traceability matrix | [traceability.md](traceability.md), [traceability.csv](traceability.csv) |
| Rendered HTML package and one PDF with everything | `dist/site/index.html`, `dist/BLADUS-backend-blueprint.pdf` |
| Change log and question list | [CHANGELOG.md](CHANGELOG.md), [14-open-questions.md](14-open-questions.md) |
| Readiness verdict and first build prompt | [15-readiness-and-first-build-prompt.md](15-readiness-and-first-build-prompt.md) |

## 4. Verdict

**GO for milestone M0 (foundations) now**, once five small technical and product choices are confirmed in the first week (T2, T3, T4, T9, Q22). **Not yet GO for real customer data**: the lawyer must answer L1 and L2 (hosting in Algeria, data transfer) before production hosting is signed at the end of M5. Collecting guests' money stays out of the first release until a payment licence question (L3) is settled. Details and the first build prompt: [15-readiness-and-first-build-prompt.md](15-readiness-and-first-build-prompt.md).

---

## Check yourself

- [ ] In one sentence, what is missing from BLADUS today?
- [ ] Who pays BLADUS, and how?
- [ ] Which document do you open to find the endpoint for creating a booking?
- [ ] Which milestone can start now, and which two legal answers block real customer data?
- [ ] Where is the single PDF with everything?
