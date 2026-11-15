# Backend blueprint changelog

All notable changes to the backend documentation package. Newest first.

## 2026-11-13

External review of the plan. All decisions are in `_work/review-2026-11-13-decisions.md` (R1 to R16) and recorded as DEC-018 (revised) and DEC-020 to DEC-031 in `03-requirements.md` section 2 and `13-decisions-needed.md` section 1.

- **DEC-018 revised (R1): commission follows the refund.** Guest cancels: the host gets back apply_bp(commission, refund_bp); host cancels: all of it; admin refund R: round_half_up(commission x clamp(R - cleaning - taxes, 0, base) / base); decline or expiry: nothing was taken. Example 8a: the host gets 3,330 DZD back, BLADUS keeps 3,330 DZD (BR-PAY-05, BR-CAN-04, example 9a).
- **Double booking claim corrected (R2, DEC-020).** Exclusion constraint for single units only, CHECK counters for pools, slots and departures, new triggers so blocked days and bookings never clash (BR-AVL-01, BR-AVL-02, new BR-AVL-07, AVL-07).
- **Hotel sync never oversells (R3, DEC-021):** clamp to held + booked, `inventory_conflict`, immediate `inventory.push` through the outbox, admin conflict and dead-outbox queues (BR-HST-07, HST-09, NTF-05).
- **Money controls (R6, R7, R8, R11, R14):** four-eyes on the rolling 24-hour top-up total, approver always different; `wallet_adjustment` with a second admin and a 1,000,000 DZD cap (BR-PAY-07, BR-PAY-13, PAY-13); wallet row locked first, revenue as a SUM (BR-PAY-14); refund obligations with a due date and overdue blocking (BR-CAN-06, BR-CAN-07, CAN-05); role split `bladus_migrator` / `bladus_app`, insert-only triggers, nightly `reconcile_balances` (BR-PAY-02, BR-PAY-15, BR-STF-02, PAY-14); rounding, idempotency storage and outbox retries defined (BR-PAY-01, BR-SYS-01, BR-SYS-03).
- **Security (R9, DEC-025):** SSRF guard, SMS and code limits with a daily budget, HMAC with `HASH_PEPPER`, key management with `INTEGRATION_KEYS`, CSRF in the BFF, upload quarantine, audit protection (BR-SYS-06, BR-SYS-07, BR-ACC-02, NFR-14; `08-security-privacy.md` section 15).
- **Operations (R12, DEC-027):** new page `09b-operations.md`, a gate before M0; RPO 5 minutes, RTO 1 hour (NFR-04).
- **Booking abuse (R13, DEC-028):** 3 pending requests and 6 upcoming bookings per guest; check-in code and stay confirmation before a review (BR-BKG-08, BR-BKG-09, BR-REV-01, BKG-12, BKG-13).
- **Framework and search (R15, DEC-030):** Django 5.2 LTS instead of 6.1; search with `pg_trgm` trigram similarity, no Arabic full-text (BR-SRC-05; closes T7).
- **Contradictions (R16, DEC-031):** the online top-up endpoint is removed (no online top-up in v1); one id scheme (UUIDv7 keys everywhere the app writes, references only for display; the old `bigint` counters became UUIDv7); the four flow diagrams with wrong paths fixed (`20` to `23`); one operation count, computed from `openapi.yaml`: **286 operations on 238 paths** (the old texts said 264, 266 or 272).
- **Schema:** 83 tables (new `refund_obligation`, `wallet_adjustment`, `inventory_conflict`; `outbox_event` renamed `outbox_message`), booking columns `check_in_code`, `stay_confirmed_at`, `stay_confirmed_via`, ledger account kinds `host_refund_payable`, `guest_refund_clearing`, transaction kinds `refund_due`, `refund_settled`, 39 enums. `schema.sql` now ends with the extra SQL of `05-database-schema.md` section 6 (triggers, roles, trigram indexes).
- **API:** 16 new operations (confirm-stay, refunds for guest, host and admin, wallet adjustments, inventory conflicts, outbox), `POST /host/wallet/topups` and `POST /admin/ledger/adjustments` removed; booking, listing and trip path ids are UUIDs only.
- **Requirements:** 157 (136 MVP, 19 R2, 2 Later): new AVL-07, HST-09, BKG-12, BKG-13, CAN-05, PAY-13, PAY-14, NTF-05, NFR-14. Risks: 41 (new K-33 to K-41).
- **Rule ids in the backend code:** the code written in parallel uses BR-CAN-05, BR-PAY-11, BR-PAY-12, BR-SYS-04 and BR-HST-06 for some of the new rules; plan ids were kept and a cross-reference table is at the top of `04-business-rules.md`.
- **Tools:** new `_tools/check_contract_refs.py` (every "METHOD /path" in `diagrams/*.mmd` must exist in `openapi.yaml`; every stated operation count must equal the computed one; passes) and `_tools/build_schema_sql.py`. New diagram `26-seq-cancel-refund`; `20` to `25`, `30` and `40` redrawn. Rebuilt: ERDs, data dictionary, rendered diagrams, traceability, compact document and the `dist/` package.
- Not done: Redocly lint was not re-run (only `$ref` resolution was checked); see `06-api-design.md`.

## 2026-11-11

- New product decisions: DEC-016 (one staff role: admin), DEC-017 (connect directly to a hotel's own system: `property_integration`, `integration_sync_log`, `property_service`, requirement HST-08, rule BR-HST-06, 6 new API operations), DEC-018 (host always recovers the full commission on cancellation: BR-PAY-05, examples 8a and 9a), DEC-019 (no online payment in the first release).
- Schema now 80 tables; `openapi.yaml` now 272 operations (lint: valid); requirements 148; diagrams relabelled to "admin", new `25-seq-hotel-sync`, money flow redrawn without online payment.
- New short version: `compact/BLADUS-backend-compact.pdf` (47 pages, about 3 MB), built by `_tools/build_compact.py` and `_tools/build_compact.mjs`. The full `dist/` package was not rebuilt and still shows the rules as of 2026-11-09.
- Not yet aligned with DEC-016 to DEC-018: the role matrix in `08-security-privacy.md`, staff permission labels in `06-api-design.md`, and role wording in `01`, `07`, `11` to `13`.

## 2026-11-09

- Product rules added since the schema pause: DEC-014 (what each host type may publish) and DEC-015 (8 experience types, 8 trip types). Requirements now 147 (LST-12, TRP-07, HST-07), rules BR-LST-05 and BR-HST-05, enums `experience_type` and `trip_type` in the schema.
- Schema now 77 tables: `incident_record`, `calendar_feed`, `otp_send_log` (closes decision T5); profile fields on `user` (bio, spoken languages, home commune, private address) and `trip.slug` (gaps found while writing the API). `schema.sql` added (PostgreSQL rendering of `schema.dbml`).
- OpenAPI generator copied into `_tools/openapi_gen/`; permission name aligned to `privacy.handle_requests`; trip slug and profile fields added; lint still 0 errors, 0 warnings.
- `traceability.csv` now takes its API column from `openapi.yaml` (`x-requirements`); 127 requirements map to operations, 20 are jobs, quality targets or R2 items without endpoints.
- Decisions: L13 to L16 (from 08) and T11 (new staff permissions) added to `13-decisions-needed.md`; total 49, 48 open.
- `diagrams/03-django-apps` redrawn in layers L0 to L6 with `search` and `core`, matching 07.
- Plain-language layer: `00-START-HERE.md`, `explain-like-im-new.md`, `README.md`, glossary extended to 63 terms.
- `15-readiness-and-first-build-prompt.md`: verdict GO for M0, gates before live data, and the first build prompt.
- `dist/`: browsable HTML site and one PDF with everything, built by `_tools/build_dist.mjs`.
- Phase 8 done: `11-roadmap.md` (assumptions, mock-to-API switch method, milestones M0 to M7 plus buffer to launch, R2-A, R2-B and LATER, each with scope by requirement ID, exit criteria, dependencies, weeks, `lib/data` switches and legal/accounting gates; Mermaid gantt chart).
- Phase 8: `12-risks.md` (32 risks K-01 to K-32 with likelihood, impact, score, owner role, mitigation, early signal and links; heat map).
- Phase 8: `13-decisions-needed.md` (DEC-001 to DEC-015 for reference; 44 open decisions: product owner Q14 to Q28, lawyer L1 to L12, accountant/bank F1 to F7, tech lead T1 to T10, each with options, recommendation, blocking milestone and default).
- Phase 8: `14-open-questions.md` status note; Q14 to Q20, L1 to L7, F1 to F4 marked as moved to `13-decisions-needed.md`; new questions Q21 to Q28, L8 to L12, F5 to F7.
- Phase 8: `traceability.csv` and `traceability.md` (all 147 requirements linked to rules, tables, API area, test file area, milestone and `lib/data` module), generated by `_tools/build_traceability.py`, which also checks that every cited rule exists and that each milestone matches the requirement's release.
- Phase 7: `07-architecture.md` (modular monolith with 17 apps + `core` kernel owning all 77 tables, layered dependencies checked by import-linter, services/selectors, transaction and lock order rules, outbox, 31 Celery jobs with schedules and rule IDs, caching, search, upload pipeline, i18n, BFF and typed client, module-by-module migration from mock `lib/data` behind server-only flags, future repo tree, ADR-015 to ADR-026).
- Phase 7: `08-security-privacy.md` (assets, actors, STRIDE table, OWASP API Top 10 mapped to endpoints, sessions and cookie flags, OTP and lockout, staff MFA, staff and organisation permission matrices, secrets and key inventory, field encryption and ID hashing, file security, rate limits incl. `otp_send_log`, hash-chained audit, fraud controls, Law 18-07/25-11 register of processing, DPIA outline, retention table, 5-day breach runbook on `incident_record`, data residency, pre-launch checklist, lawyer items incl. new L13 to L16).
- Phase 7: `09-devops-hosting.md` (dev/ci/staging/production, Algeria-first hosting with a second Algerian site, Docker Compose container layout, `.com.dz` domains, TLS, CDN policy, GitHub Actions pipelines incl. test-mode build guard, migrations policy, pgBackRest PITR, RPO 15 min / RTO 4 h, monthly restore drill, observability and alerts, rough cost in DZD and EUR, deploy/rollback/incident/restore runbooks, env var list).
- Phase 7: `10-testing-quality.md` (test pyramid, tests per app, hypothesis properties for money, refunds and date ranges, concurrency tests on real PostgreSQL, schemathesis and OpenAPI diff contract tests, migration tests, k6 scenarios against NFR-01/02, i18n checks for API messages, factories, Definition of Done, coverage targets, CI quality gates, BR rule traceability with `test_br_<area>_<nn>_...` naming).
- Phase 6: `openapi.yaml` (OpenAPI 3.1 contract: 266 operations on 220 paths under `/api/v1`, tags for auth, public, me, host, admin and webhooks; Money, Problem, cursor and page schemas; enums copied from `schema.dbml`; every operation has `x-requirements`, `x-rules`, `x-release`; 8 dormant M2 to M4 operations with `x-dormant`; Redocly lint: 0 errors, 0 warnings).
- Phase 6: `06-api-design.md` (conventions, BFF and allauth session model, staff MFA, active host account and permissions, error code catalogue, rate limits, idempotency and booking race, webhooks, versioning, Next.js consumption with openapi-typescript and openapi-fetch, every website and admin `lib/data` function and server action mapped to an endpoint or marked removed, five worked examples).

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
