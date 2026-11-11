# 15. Readiness verdict and first build prompt

> **In plain words**
> This page answers one question: can the team start building the Django backend now?
> Short answer: **yes, start the first milestone (M0, foundations) now**, with three conditions.
> Real customer data must wait for the lawyer's answers on hosting and data transfer (before the end of M5).
> Collecting guests' money must wait for a payment licence decision (not in the first release).
> At the end you will find the exact prompt to give a developer or an AI coding assistant to start M0.

**Terms used here** (see [glossary.md](glossary.md)):
- **Milestone (M0 to M7)**: a block of work of 3 to 5 weeks with clear "done" criteria ([11-roadmap.md](11-roadmap.md)).
- **Gate**: a decision or legal answer that must exist before a milestone can finish.
- **Readiness verdict**: our judgement of whether the plan is complete enough to start coding.

Date: 2026-11-09.

---

## 1. Verdict

| Area | Status | Evidence |
|---|---|---|
| What exists today is understood | **Ready** | [01-system-inventory.md](01-system-inventory.md): every feature, entity and `lib/data` function of both apps, 22 spec disagreements resolved by decisions |
| Product scope | **Ready** | 147 requirements, 126 in the first release ([03-requirements.md](03-requirements.md)); 15 product decisions taken (DEC-001 to DEC-015) |
| Business rules | **Ready** | Testable rules with state machines and worked money examples ([04-business-rules.md](04-business-rules.md)) |
| Database design | **Ready** | 77 tables, 35 enumerations, 156 foreign keys, database-level guarantees against double booking and unbalanced money ([05-database-schema.md](05-database-schema.md), [schema.dbml](schema.dbml), [schema.sql](schema.sql)) |
| API contract | **Ready** | 266 operations, valid OpenAPI 3.1 (lint: 0 errors, 0 warnings), every website and admin data function mapped ([06-api-design.md](06-api-design.md), [openapi.yaml](openapi.yaml)) |
| Architecture, security, hosting, testing | **Ready** | [07](07-architecture.md), [08](08-security-privacy.md), [09](09-devops-hosting.md), [10](10-testing-quality.md) |
| Plan, risks, decisions | **Ready** | 11 milestones, 32 risks, 49 decisions listed with owners and deadlines ([11](11-roadmap.md), [12](12-risks.md), [13](13-decisions-needed.md)); traceability for all 147 requirements ([traceability.md](traceability.md)) |
| Legal and tax answers | **Not ready (not needed to start)** | L1 to L16 and F1 to F7 open; they gate production data (end of M5), payments (R2) and the licence question (later) |

**Verdict: GO for M0 now. GO for production launch only after the gates in section 3.**

## 2. Conditions to start M0 (answer in the first week)

| # | Decision | Recommended answer | Who |
|---|---|---|---|
| 1 | T2: where the backend code lives | `backend/` folder in this repository | Tech lead |
| 2 | T3 and T9: how the apps switch from demo data to the API, and the typed client | One flag per `lib/data` module, API seeded with the same demo cast; `openapi-typescript` + `openapi-fetch` | Tech lead |
| 3 | T4: how the Next.js servers hold the session | allauth headless session token in an httpOnly cookie on the Next.js server | Tech lead |
| 4 | Q22: guests without an Algerian mobile number | Email code for non-Algerian numbers, with stricter booking limits | Product owner |
| 5 | T1 (staging only) and T8 (third-party processors) | Staging anywhere with demo data only; prefer Algerian or self-hosted services for anything with personal data | Tech lead, then lawyer (L10) |

And one action that cannot wait: **engage a lawyer now** for L1, L2, L4, L5, L9 and L11. Their answers take months and block production (M5 to M7).

## 3. Gates before going live

| Gate | Blocks | Source |
|---|---|---|
| L1, L2: hosting in Algeria and personal data transfer abroad | Signing production hosting (end of M5); any real personal data | [02-research.md](02-research.md) C.3, risks K-01 and K-02 |
| L4, L5, L9, L11: host documents, short-term rental rules, platform licence, company formalities | Real hosts joining (M7) | [13-decisions-needed.md](13-decisions-needed.md) |
| F1 to F4: VAT on commission, tourist tax, gateway contract, invoices | Online wallet top-up and invoices (R2-A) | [13-decisions-needed.md](13-decisions-needed.md) |
| L3 and a payment licence or bank partner | Collecting guests' money (models M2 to M4) | DEC-001, BR-PAY-11 |
| `NEXT_PUBLIC_BLADUS_TEST_MODE=0` in production builds | Public launch | [09-devops-hosting.md](09-devops-hosting.md) |

## 4. Known gaps carried into the build

These are small and tracked; none blocks M0.

- Two R2 features have no endpoint yet: staff broadcast messages (MSG-06) and the foreign-guest declaration (PRV-06). Design them when R2-B starts.
- 18 requirements are jobs or quality targets and have no endpoint by nature (for example BKG-04 automatic completion, NFR-01 response times); they are covered by jobs ([07-architecture.md](07-architecture.md)) and tests ([10-testing-quality.md](10-testing-quality.md)). See the "no endpoint" rows in [traceability.csv](traceability.csv).
- Someone who is both a solo host and an organisation member cannot yet reach their solo workspace from the website's workspace switcher (the API supports it: `GET /api/v1/me/workspaces` lists every host account, including the solo one).
- Dates, costs and SMS prices are estimates; legal and tax points are research, not advice (VERIFY WITH A PROFESSIONAL).

## 5. First build prompt (M0)

Give this prompt, unchanged, to the developer or AI coding assistant who starts the backend. It is self-contained but expects the `docs/backend` folder to be in the repository.

```text
You are starting the BLADUS backend (Algerian travel marketplace: homes, hotels,
hostels, experiences, vehicles, agency trips). The full blueprint is in
docs/backend/ of this repository. Read, in this order, before writing code:
00-START-HERE.md, 03-requirements.md, 04-business-rules.md,
05-database-schema.md, 06-api-design.md, 07-architecture.md,
08-security-privacy.md, 09-devops-hosting.md, 10-testing-quality.md,
11-roadmap.md (section M0), 13-decisions-needed.md (T1 to T4, T8, T9, Q22).

Goal: deliver milestone M0 "Foundations" exactly as defined in 11-roadmap.md:
requirements ACC-01, ACC-02, ACC-03, ACC-04, ACC-07, PAY-12, SRC-04, CFG-01,
PRV-01, NFR-05 to NFR-13. Nothing from later milestones.

Build:
1. A Django 6.1 project in backend/ (Python 3.13) with the folder layout of
   07-architecture.md. Create only the apps M0 needs: core, accounts, geo,
   config, audit, notifications (outbox only). Use the services/selectors
   pattern and import-linter layers from 07-architecture.md.
2. PostgreSQL 17 + PostGIS, Redis, Celery worker and beat, all in Docker
   Compose for local development (09-devops-hosting.md). Settings with
   pydantic-settings; no secrets in code.
3. Tables for M0 only, matching docs/backend/schema.dbml exactly (names,
   types, enums, constraints): user, consent_record, staff_profile,
   staff_permission, staff_role_permission, wilaya, daira, commune,
   platform_settings, audit_event, outbox_event, delivery_log, otp_send_log,
   idempotency_record. Money is BIGINT centimes + currency; IDs are UUIDv7.
4. Accounts with django-allauth headless (session tokens, email and phone
   one-time codes, rate limits of BR-ACC-01, BR-ACC-02, BR-ACC-05) and the
   /api/v1/auth/* and /api/v1/me endpoints exactly as in
   docs/backend/openapi.yaml (same paths, schemas, error codes).
5. Geography seed: 69 wilayas and 1,541 communes from
   el-amin-dev/algeria-wilayas-communes (CC0) with coordinates from
   ihahachi/Algeria-Cities (MIT), keeping source and valid_from columns
   (BR-SRC-02), plus the read endpoints in openapi.yaml.
6. platform_settings v1 with the defaults of 05-database-schema.md section 9
   (commission bp 1200/1500/1800/1000, request TTL 24 h) and the error
   envelope of 06-api-design.md (stable codes, en/fr/ar messages).
7. drf-spectacular generates the schema in CI; CI fails if the generated
   schema differs from docs/backend/openapi.yaml for the M0 paths.
8. Tests (10-testing-quality.md): pytest-django, factory_boy, hypothesis for
   the Money and UUIDv7 helpers, one test per business rule named
   test_br_<area>_<nn>_..., a test that counts 69 wilayas and 1,541 communes,
   and the auth flow end to end. Coverage gate as in 10-testing-quality.md.
9. GitHub Actions: ruff, mypy with django-stubs, pytest with a PostGIS
   service, dependency scan, OpenAPI check.
10. Website integration for M0 only: behind the flag DATA_SOURCE_AUTH
    (default mock), make frontend/lib/data/auth.ts call the API through a
    typed client generated with openapi-typescript + openapi-fetch, using the
    BFF pattern (allauth session token in an httpOnly cookie on the Next.js
    server). Do not change any other frontend module.

Rules: follow the decisions DEC-001 to DEC-015; do not invent endpoints or
columns that are not in openapi.yaml or schema.dbml (if something is missing,
stop and write it in docs/backend/14-open-questions.md); no personal data
outside demo fixtures; never use the em dash character in code comments or
docs; keep internal "darna" identifiers that already exist. Finish with: the
M0 exit criteria of 11-roadmap.md checked one by one, test results, and a
CHANGELOG entry in docs/backend/CHANGELOG.md.
```

---

## Check yourself

- [ ] Can the team start coding today? Which milestone, and what must be decided in the first week?
- [ ] Which two legal answers must arrive before production hosting can be signed, and by when?
- [ ] Why is collecting guests' money not part of the first release?
- [ ] Which two R2 features still have no API endpoint?
- [ ] In the first build prompt, what must the developer do if a column or endpoint they need is missing from the blueprint?
