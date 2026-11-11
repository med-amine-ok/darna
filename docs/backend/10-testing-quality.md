# 10. Testing and quality

> **In plain words**
> This page says how we prove the backend does what the rules say, before every deployment.
> Most tests are small and fast; fewer are big and slow (the "test pyramid"). Money, refunds and dates are tested with thousands of random examples, not only a few hand-picked ones.
> Double booking is tested by firing many requests at the same time against a real PostgreSQL database.
> The API contract is checked automatically so the website and admin never break silently; speed is measured against the targets in NFR-01 and NFR-02.
> Every business rule (`BR-...`) must have at least one test whose name contains the rule ID; the build fails if one is missing.

**Terms used here** (see also [glossary.md](glossary.md)):
- **Unit test**: tests one small function alone, in milliseconds, often without a database.
- **Service test / integration test**: tests a service function with a real database, inside a transaction that is rolled back afterwards.
- **API test**: sends an HTTP request to an endpoint and checks the response (status, body, permissions).
- **End-to-end (E2E) test**: drives a real browser through the website or admin (Playwright).
- **Test pyramid**: many unit tests, fewer service and API tests, very few E2E tests.
- **pytest / pytest-django**: the Python test runner and its Django plugin.
- **Factory (factory_boy)**: code that creates realistic test rows (a user, a listing, a booking) with one line.
- **Property-based test (hypothesis)**: instead of one example, you state a rule that must always hold ("refund never exceeds the total"), and the tool tries hundreds of random inputs, then shrinks any failure to the simplest example.
- **Concurrency test**: starts many requests at the same moment to check that locks and constraints hold.
- **Contract test (schemathesis)**: reads `openapi.yaml` and sends many generated requests to every endpoint, checking the answers match the contract and the server never crashes.
- **Load / performance test (k6)**: simulates many users to measure response times.
- **Coverage**: the share of code lines (or branches) executed by tests.
- **Mutation testing**: the tool makes small bugs in the code on purpose; good tests should fail. Measures test strength.
- **Quality gate**: a check in CI that must pass before code can be merged or deployed.
- **Definition of Done (DoD)**: the checklist a change must satisfy before it counts as finished.
- **Traceability**: being able to go from a rule to its test and back.

Inputs: [03-requirements.md](03-requirements.md) (NFR-01, 02, 06, 08, 10, 13), [04-business-rules.md](04-business-rules.md), [05-database-schema.md](05-database-schema.md) sections 6 and 7, [07-architecture.md](07-architecture.md), [08-security-privacy.md](08-security-privacy.md), [09-devops-hosting.md](09-devops-hosting.md) section 7, research B.14.

---

## 1. Test strategy (pyramid)

| Level | Share of tests | Tools | Database | Runs |
|---|---|---|---|---|
| Unit (pure functions: money, policies, date ranges, masking, transitions) | about 45% | pytest, hypothesis | none | every push, seconds |
| Service (one service or selector with real PostgreSQL + PostGIS) | about 35% | pytest-django, factory_boy, time-machine (frozen clock) | real PostgreSQL in a rolled-back transaction | every push |
| API (endpoint, permissions, serializers, error codes) | about 15% | pytest-django + DRF `APIClient` | real PostgreSQL | every push |
| Concurrency (parallel requests) | small set, critical | pytest with `transaction=True`, threads, barrier | real PostgreSQL, committed | every push (short) + nightly (repeated) |
| Contract | all endpoints | schemathesis, drf-spectacular, oasdiff, `tsc` in both apps | seeded API | every pull request |
| E2E (key journeys through the Next.js apps) | about 5% (around 20 journeys) | Playwright (admin already uses it) | staging-like stack | before deploy to production |
| Performance | scenarios in section 7 | k6 | staging with 20,000 listings | weekly and before major releases |

Principles:
- **Real PostgreSQL always.** No SQLite: exclusion constraints, `daterange`, PostGIS, partial indexes and triggers are part of the rules (BR-AVL-01, BR-PAY-02).
- **Test the rule where it is enforced.** A DB-enforced rule is tested by trying to break it with raw ORM writes (bypassing the service) and expecting the database to refuse.
- **Frozen time.** Services receive `now` from `core.clock`; tests freeze it in Africa/Algiers for date rules (BR-SYS-05).
- **No network.** SMS, email, storage and gateway calls go to fakes that record what was sent; one contract test per provider runs against recorded responses.

## 2. What to test per app

| App | Must test | Key rules |
|---|---|---|
| `core` | `Money` arithmetic and rounding; idempotency (same key same body, different body 422, concurrent 409, expiry 24 h); error format and translation; UUIDv7 ordering | BR-PAY-01, BR-SYS-01, BR-SYS-04, NFR-12 |
| `geo` | Seed completeness (69 wilayas, 1,541 communes, codes unique, `legacy_code_58` mapping); autocomplete with accents and Arabic | BR-SRC-02 |
| `config` | Unknown settings key refused; new version per change; publish creates immutable version; core steps not removable; old version readable | BR-CFG-01 to 03 |
| `audit` | Insert-only (UPDATE refused by DB); hash chain correct; chain break detected; export formula neutralisation; export audited with filters and count | BR-STF-02, BR-STF-04 |
| `media` | Presign limits; magic bytes; EXIF/GPS removed (fixture photo with GPS); decompression bomb refused; virus test file (EICAR) rejected; signed URL expiry; KYC view audited | BR-MED-01, 02 |
| `notifications` | Outbox written in the same transaction; rolled-back change sends nothing; retry and backoff; idempotent sending (one SMS per event); language of recipient; critical messages ignore opt-out | BR-SYS-03, BR-NTF-01, 02, BR-PRV-03 |
| `accounts` | Email unique case-insensitive; phone format; OTP limits and expiry; lockout shared via Redis; session revocation on logout and password change; staff MFA required; consent records; deletion anonymises and keeps legal records | BR-ACC-01 to 05, BR-PRV-01, 02 |
| `hosts` | Host account is user XOR organisation; one owner; invitations (7 days, once, matching contact); role permissions matrix; legal field change resets verification; verification transitions; documents all approved before host approval; publish rights per host type; payout change needs MFA and sets 72 h hold | BR-ORG-01 to 06, BR-HST-01 to 05, BR-PAY-09 |
| `catalog` | Listing state machine (every allowed and every forbidden move); revision under review keeps live version; hotel without room type cannot submit; reference rows cannot be hard-deleted; experience and trip types | BR-LST-01 to 05 |
| `inventory` | Counter check constraint; atomic multi-night reservation all-or-nothing; holds expire; host block vs booking race; horizon job creates 18 months | BR-AVL-02 to 06 |
| `trips` | Only approved agencies; seats never oversold; cancelling a departure cancels all bookings with refunds owed | BR-TRP-01 to 03 |
| `pricing` | Quote lines and totals; weekly vs monthly discount; no guest fee; quote expiry and re-validation; tampered price ignored; tax rates by validity date (R2) | BR-PRC-01 to 04 |
| `ledger` | Balanced transactions only (DB trigger); no UPDATE/DELETE; commission once per booking; reversal amounts; rate resolution; top-up limits, unique receipt, four-eyes; credit floor; balance cache equals sum; dormant models return 404 | BR-PAY-01 to 12 |
| `bookings` | Instant vs request resolution; snapshot frozen; state machine; expiry and completion jobs; cancellation by guest, host, staff with refunds; refunds never exceed total; disputes window (R2); references unique | BR-BKG-01 to 07, BR-CAN-01 to 05 |
| `reviews` | Eligibility (completed, 14 days, one per booking); states and reasons; ratings recomputed; double-blind (R2) | BR-REV-01 to 04 |
| `messaging` | Cursor sync returns only newer messages; unread counts; masking of phones, emails, CCP/RIP, WhatsApp links before confirmation and unmasked after; repeated attempts flag the thread | BR-MSG-01 |
| `trust` | Queue priority by waiting time since last submission; change request items visible to host; suspension cascade pauses listings and flags future bookings; risk flags open cases, never block | BR-MOD-01 to 04 |
| `search` | Only published listings of approved hosts; facet counts exclude own filter; public point only for anonymous users; partial availability sub-range; map pin cap; hotel and hostel under "Hotels"; search doc refreshed by outbox | BR-SRC-01 to 04, BR-AVL-05 |

Security tests (from [08-security-privacy.md](08-security-privacy.md) section 6) live in each app as `test_api1_*` to `test_api10_*`, plus one matrix test that calls every `/api/v1/admin` endpoint with each of the 5 staff roles and checks allow or deny against the permission table.

## 3. Property-based tests (hypothesis)

Pure functions for money, refunds and dates are written so they can be tested without a database. Example properties (the tests will name the rule they protect):

### 3.1 Money

| Property | Rule |
|---|---|
| For any list of price lines, `total == sum(rounded lines)`; never a float anywhere | BR-PAY-01 |
| `commission(base, rate_bp)` is between `floor(base x rate / 10,000)` and that value + 1 centime, and `0 <= commission <= base` | BR-PAY-04 |
| Commission is monotonic: a bigger base or rate never gives a smaller commission | BR-PAY-04 |
| Applying the discount: only the larger of weekly and monthly applies; result `>= 0`; 30 nights never uses the weekly rate | BR-PRC-03 |
| For any sequence of postings, every ledger transaction sums to zero per currency, and the wallet balance equals the sum of its entries | BR-PAY-02, 03 |
| Displayed whole dinars: `display(amount)` rounds half up and `display(a) + display(b)` may differ from `display(a + b)` by at most 1 DZD, which is why totals are summed from lines | BR-PAY-01 |

Example (illustration only, no code files are created in this phase):

```python
@given(base=st.integers(0, 10**12), rate_bp=st.integers(0, 10_000))
def test_br_pay_04_commission_bounds(base, rate_bp):
    c = commission_minor(base, rate_bp)
    exact_floor = base * rate_bp // 10_000
    assert exact_floor <= c <= exact_floor + 1
    assert 0 <= c <= base
```

### 3.2 Refunds and cancellations

| Property | Rule |
|---|---|
| `0 <= refund <= total - already_refunded` for any policy, any day, any amounts | BR-CAN-04 |
| Refund is non-decreasing with days before check-in (cancelling earlier never refunds less) | BR-CAN-01 |
| Before check-in, the cleaning fee and its taxes are always fully refunded | BR-CAN-01, 02 |
| Host cancellation: refund owed == total paid; commission reversal == commission posted | BR-CAN-03, BR-PAY-05 |
| Guest cancellation: commission kept == `round(rate x non-refunded subtotal)`; kept + reversed == posted | BR-PAY-05 |
| Several partial staff refunds in any order: their sum never exceeds the total; the last one that would exceed is refused | BR-CAN-04 |
| Worked example 8a reproduces exactly: 31,750 DZD owed, 3,330 DZD back to the wallet | BR-CAN-02 |

```python
@given(policy=st.sampled_from(POLICIES), b=bookings(), d1=st.integers(-2, 400), d2=st.integers(-2, 400))
def test_br_can_01_refund_never_decreases_when_cancelling_earlier(policy, b, d1, d2):
    early, late = max(d1, d2), min(d1, d2)
    assert refund_for(policy, b, days_before=early) >= refund_for(policy, b, days_before=late)
```

### 3.3 Date ranges

| Property | Rule |
|---|---|
| For `[a, b)`, nights == `b - a` in days; `a < b` always; an empty range is refused | BR-SYS-05, BR-AVL-01 |
| Overlap is symmetric: `overlaps(x, y) == overlaps(y, x)`; back-to-back ranges (`x.end == y.start`) never overlap | BR-AVL-01 |
| The Python overlap function agrees with PostgreSQL `&&` on `daterange` for any pair (tested against the database) | BR-AVL-01 |
| `largest_free_subrange(request, busy)` is inside the request, contains no busy night, and no longer free sub-range exists | BR-AVL-05 |
| Day counting for policies uses Africa/Algiers calendar days; around midnight UTC (00:00 to 01:00 Algiers) the day count is still correct | BR-CAN-01, BR-SYS-05 |
| Weekend detection: Friday and Saturday only; week starts on Sunday | BR-SYS-05 |
| Pool reservation of `n` units over `k` nights changes exactly `k` counter rows or none | BR-AVL-02 |

Hypothesis settings: `max_examples = 200` on every push, `2,000` in the nightly run; the example database is kept in CI cache so a found failure is replayed until fixed.

## 4. Concurrency tests on real PostgreSQL

How: `@pytest.mark.django_db(transaction=True)` (real commits), a `ThreadPoolExecutor` where each thread opens its own database connection, and a `threading.Barrier` so all threads call the service at the same instant. Each scenario runs 5 times on every push and 200 times in the nightly run. CI uses the same PostgreSQL and PostGIS versions as production.

| Scenario | Setup | Expected | Rule |
|---|---|---|---|
| Same nights, single unit | 50 guests book the same home for the same nights | Exactly 1 booking created; 49 get `409 dates_unavailable`; no 500 | BR-AVL-01 |
| Back-to-back | 2 guests book `[1, 4)` and `[4, 6)` at the same time | Both succeed | BR-AVL-01 |
| Last hotel room | Room type with 1 unit left; 20 parallel requests for 1 room | Exactly 1 success; counters `held + booked <= total` | BR-AVL-02 |
| Last seats on a departure | 3 seats left; 10 requests for 2 seats each | Exactly 1 success; seats booked = 2 | BR-TRP-02 |
| Host blocks while guest books | Host blocks night N while a guest books a stay including N | One wins; never both | BR-AVL-04 |
| Same idempotency key | 10 identical requests with one key | 1 booking; others get the same response or `409 request_in_progress` | BR-SYS-01 |
| Double confirmation | Host clicks accept twice; job tries to expire at the same time | One transition wins; commission posted once | BR-PAY-04, BR-BKG-06 |
| Credit floor race | Wallet just above the floor; 2 instant bookings at once whose commissions together cross the floor | Second one becomes `pending`, never both confirmed below the floor | BR-PAY-10 |
| Duplicate top-up receipt | 2 finance users record the same receipt at once | 1 succeeds, 1 refused | BR-PAY-07 |
| Outbox workers | 3 dispatchers on the same pending events | Each event handled once (`SKIP LOCKED`); one SMS per event | BR-SYS-03 |
| Expiry vs accept | Request accepted at the exact second the expiry job runs | Final status is either `confirmed` or `expired`, consistent with ledger and counters | BR-BKG-04 |
| Ownership transfer | Two owners-to-be at once | Exactly one active owner | BR-ORG-04 |

A scenario passes only if the database ends in a consistent state: a final check runs the ledger reconciliation and counter sums after each run.

## 5. Contract tests

| Check | How | Fails when |
|---|---|---|
| Schema is valid | `manage.py spectacular --validate --fail-on-warn` | An endpoint has no documented serializer, an enum is unnamed, a response is undocumented |
| No accidental breaking change | `oasdiff breaking main.yaml pr.yaml` | A field is removed or renamed, a type changes, a required parameter is added, an enum value disappears, without the `api-breaking` label and a version plan |
| API matches its contract | `schemathesis run openapi.yaml --checks all --stateful=links` against the API with seed data, authenticated as guest, host and each staff role | A response does not match the schema, a 500 occurs, an undocumented status code appears, a response is slower than 5 s |
| Error format | Custom schemathesis check | Any 4xx body without `code` and `message` (BR-SYS-04) |
| Frontend compile check | `openapi-typescript` generates `schema.d.ts`; `tsc --noEmit` in `frontend/` and `admin/` | A Next.js call uses a removed field or a wrong type |
| Adapter parity | For each migrated `lib/data` module, a test feeds the same fixture through the mock and the API adapter and compares DTO shapes | The website or admin would render different data after the switch ([07-architecture.md](07-architecture.md) section 10.4) |
| Provider contracts | Recorded responses (SMS, email, later Chargily) replayed against our client code | Our parser or signature check breaks |

## 6. Migration tests

| Check | When | Tool |
|---|---|---|
| No missing migrations | every push | `makemigrations --check --dry-run` |
| Migrate from zero | every push | fresh database, `migrate`, then load production seeds 1 to 8 ([05-database-schema.md](05-database-schema.md) section 9) |
| Dangerous operations | every push | migration linter: refuses column drops or renames in the same release as code changes, non-concurrent index creation on large tables, `NOT NULL` without default on existing tables |
| Data migrations | per data migration | `django-test-migrations`: build the old state, insert rows, migrate forward, assert the new state; run twice to prove it is safe to repeat |
| Old code on new schema | before release | run the previous release's API test suite against the new schema (expand-then-contract proof, [09-devops-hosting.md](09-devops-hosting.md) section 8.1) |
| Duration on realistic size | before release with a `risky` migration | apply on the performance dataset (section 7) and record the time and locks taken; above 10 s of locking needs a different plan |
| Constraints exist | every push | test queries `pg_constraint` and `pg_indexes` for the constraints in [05-database-schema.md](05-database-schema.md) section 6 (exclusion, partial unique, checks, triggers, grants) |

## 7. Performance tests

Tool: **k6** (scripts in `tests/performance/`). Locust is an acceptable alternative if the team prefers Python. Dataset: generated by factories at the scale in [05-database-schema.md](05-database-schema.md) section 7: 20,000 listings across 69 wilayas, 2,000 room types with 18 months of nights, 1 million booking rows, 5 million messages. Run against staging (same server size as production app node), never production.

| Scenario | Mix | Load | Pass criteria |
|---|---|---|---|
| S1 Browse and search | search with filters (60%), search with dates (25%), map box (15%) | ramp to 50 requests/s, hold 10 min | p95 < 500 ms, errors < 0.5% (NFR-02) |
| S2 Listing detail and calendar | detail + 90-day calendar | 50 requests/s | p95 < 300 ms (NFR-01) |
| S3 Booking create | quote then book on random free dates (some collisions on purpose) | 10 bookings/s for 5 min | p95 < 600 ms; zero double bookings; conflicts return 409 (NFR-01, BR-AVL-01) |
| S4 Message polling | 2,000 open conversations polling every 10 s | about 200 requests/s | p95 < 100 ms (query Q7) |
| S5 Notifications badge | 5,000 signed-in users polling every 30 s | about 170 requests/s | p95 < 50 ms (query Q8) |
| S6 Mixed day | 70% S1/S2, 20% S4/S5, 5% S3, 5% host and admin lists | 50 requests/s for 30 min | all targets above; no growth in outbox lag |
| S7 Abuse | OTP request flood, oversized page sizes, deep pagination | as fast as possible from 5 IPs | limits return 429; API latency for normal users unchanged |

Also: `EXPLAIN (ANALYZE, BUFFERS)` snapshots for queries Q1 to Q16 on the dataset, stored with the results and compared release to release; `django-assert-num-queries` style assertions in API tests to stop N+1 queries (each list endpoint has a fixed maximum number of queries).

## 8. Accessibility and i18n checks for API messages

| Check | How | Rule |
|---|---|---|
| Every error code has text in en, fr, ar | A test lists every `DomainError` code from a registry and checks a translation exists in each `.po` file | NFR-06, BR-SYS-04 |
| No missing translations | CI runs `makemessages` and fails on a diff; `compilemessages` with errors as failures; no empty `msgstr` | NFR-06 |
| Stable codes | Snapshot test of the error code list: removing or renaming a code is a breaking change (the apps map codes to text) | NFR-13 |
| Language selection | API tests with `Accept-Language: ar`, `fr`, `en`, unknown, and none: correct language or `fr` fallback | NFR-06 |
| Latin digits | Messages and notifications with numbers in Arabic contain digits 0 to 9, never Arabic-Indic digits | NFR-06, research C.7 |
| Arabic plurals | Messages with counts use plural forms (Arabic has 6); test values 0, 1, 2, 3, 11, 100 | NFR-06 |
| Templates render | Every notification template renders in the 3 languages with sample data, no missing variables, no raw HTML in SMS | BR-NTF-02 |
| SMS length | SMS texts measured: Arabic texts use UCS-2 (70 characters per segment); critical SMS must fit in 2 segments | cost, NFR-11 |
| Bidirectional text | Mixed Arabic text with Latin values (booking reference, amounts) wrapped with Unicode isolation marks in SMS and email | NFR-06 |
| Plain language | Host-facing reason texts (`reason_code.host_text_*`) reviewed by a native speaker per language before release | MOD-03 |
| Apps | The website and admin keep their Playwright + axe checks for screen readers and right-to-left layout; API messages are shown inside those flows | NFR-13 |

## 9. Test data and factories

- One `tests/factories.py` per app with factory_boy factories: `UserFactory`, `HostAccountFactory` (traits `individual`, `agency`, `hotel`, `hostel`, `approved`), `ListingFactory` (traits per vertical, `published`), `RoomTypeFactory` (with nights), `TripDepartureFactory`, `BookingFactory` (traits `pending`, `confirmed`, `completed`), `WalletFactory` (with a top-up posted through the ledger service, never by inserting balance rows).
- Factories that involve money or inventory call **services**, so test data always satisfies the rules (no impossible states created by shortcuts).
- Algerian realism: custom Faker providers for `+213` mobiles (`^\+213[5-7]\d{8}$`), wilaya and commune ids from the geo seed, Arabic and Latin names, DZD amounts in centimes.
- Determinism: fixed random seed per test run (printed in the output); time frozen with time-machine; UUIDv7 generated from the frozen clock.
- Demo data for staging (website demo users Yacine, Amina, Karim; admin staff Nadia; 18 listings, 4 trips) is a separate `seed_demo` command built on the same factories; it refuses to run when `BLADUS_ENV=production` ([05-database-schema.md](05-database-schema.md) section 9).
- Never production data in tests. Bugs found in production are reproduced with factories.

## 10. Definition of Done

A change is done when:
- [ ] The requirement ID (`BKG-03`) and rule IDs (`BR-BKG-04`) are in the pull request description.
- [ ] Logic is in services or selectors, not in views, serializers or signals; import-linter passes.
- [ ] Every new or changed business rule has a test named `test_br_<area>_<nn>_...` (section 13).
- [ ] Money, refund or date logic has property tests; booking, inventory or ledger changes have a concurrency test.
- [ ] Database rules are in constraints where possible, with a test that bypasses the service and expects the database to refuse.
- [ ] Permissions: tests for allowed and denied roles (guest, other guest, host, other host, each org role or staff role concerned).
- [ ] API: OpenAPI updated (generated), no unplanned breaking change, error codes translated in en, fr, ar.
- [ ] Migrations follow the expand-then-contract policy and pass the migration checks.
- [ ] Audit events and outbox events written where the rules require them.
- [ ] No personal data in logs; new personal data fields added to the register of processing and the retention table ([08-security-privacy.md](08-security-privacy.md) section 12).
- [ ] Coverage gates pass (section 11); CI fully green.
- [ ] Docs updated if behaviour changed (rules, requirements, this blueprint); no em dash characters in docs.
- [ ] Reviewed and approved by one other developer (two for ledger, security or migrations marked `risky`).
- [ ] Deployed to staging and checked there; flag state documented if behind a feature flag.

## 11. Coverage targets

| Scope | Line coverage | Branch coverage | Note |
|---|---|---|---|
| `services.py` in all apps | **90%** | 85% | NFR-10 |
| `ledger`, `pricing`, `bookings` (money and availability) | 95% | 90% | Plus mutation testing (mutmut) on `core.money`, `pricing`, cancellation policy functions each quarter: target 80% of mutants killed |
| `selectors.py` | 85% | | |
| `apis.py` and permissions | 85% | | Every endpoint has at least one allow and one deny test |
| Whole backend | 85% | | Trend must not go down more than 0.5 point per pull request |
| Migrations, settings, admin.py | excluded | | Covered by migration and smoke tests |

Coverage is a floor, not a goal: a test without meaningful assertions does not count in review.

## 12. Quality gates in CI

| Gate | Tool | Blocks merge | Blocks deploy |
|---|---|---|---|
| Lint and format | ruff | yes | yes |
| Types | mypy (strict on `core`, `ledger`, `pricing`, `bookings`) | yes | yes |
| App boundaries | import-linter | yes | yes |
| Migrations | `makemigrations --check`, migration linter, migrate from zero | yes | yes |
| Unit, service, API tests | pytest with PostGIS | yes | yes |
| Concurrency tests (short) | pytest | yes | yes |
| Coverage | coverage.py thresholds (section 11) | yes | yes |
| Rule traceability | `tests/traceability/check_rules.py` (section 13) | yes | yes |
| i18n completeness | makemessages diff, compilemessages, error code registry test | yes | yes |
| OpenAPI valid + no unplanned breaking change | spectacular, oasdiff | yes | yes |
| Contract fuzzing | schemathesis | yes | yes |
| Frontend compile against API types | `tsc --noEmit` in both apps | yes | yes |
| Dependency and secret scanning | pip-audit, npm audit, gitleaks, bandit | yes for high/critical | yes |
| Image scan | Trivy | | yes for critical |
| Test mode off in production build | build script check | | yes |
| Nightly: long concurrency, full hypothesis, full schemathesis | scheduled | opens an issue | blocks the next production deploy until fixed |
| Weekly / pre-release: k6 performance | scheduled on staging | | yes before a major release if a target is missed |

## 13. Traceability: every rule has a test

**Naming convention**: the test function name starts with the rule ID in lower case with underscores, then a short description:

```text
BR-PAY-04  ->  test_br_pay_04_commission_posted_once_per_booking
BR-AVL-01  ->  test_br_avl_01_parallel_same_nights_only_one_succeeds
BR-CAN-01  ->  test_br_can_01_moderate_policy_half_refund_from_4_to_1_days
BR-ACC-02  ->  test_br_acc_02_sixth_attempt_with_right_code_fails
```

A test that covers several rules carries extra markers: `@pytest.mark.rules("BR-PAY-05", "BR-CAN-03")`. Requirements can be tagged the same way (`@pytest.mark.req("BKG-10")`) for the NFR and requirement report.

**Checker** (`tests/traceability/check_rules.py`, run in CI):
1. Reads every rule ID from [04-business-rules.md](04-business-rules.md) (pattern `BR-[A-Z]+-\d{2}`).
2. Collects test names and `rules` markers with `pytest --collect-only`.
3. Fails if a rule has no test, unless the rule is marked R2 or Later and listed in an allowlist file with a target release.
4. Writes `traceability.csv` (rule, tests, files) as a CI artifact, so the product owner can see which tests protect which rule.

Example of the report:

| Rule | Tests | Kind |
|---|---|---|
| BR-AVL-01 | `test_br_avl_01_exclusion_constraint_refuses_overlap_in_raw_sql`, `test_br_avl_01_parallel_same_nights_only_one_succeeds`, `test_br_avl_01_back_to_back_allowed` | DB, concurrency |
| BR-PAY-02 | `test_br_pay_02_unbalanced_transaction_fails_at_commit`, `test_br_pay_02_app_role_cannot_update_entries`, `test_br_pay_02_any_posting_sequence_balances` | DB, property |
| BR-CAN-02 | `test_br_can_02_example_8a_moderate_three_days_before` | service |
| BR-SYS-01 | `test_br_sys_01_same_key_same_body_returns_same_booking`, `test_br_sys_01_same_key_other_body_422`, `test_br_sys_01_concurrent_same_key_409` | API, concurrency |

---

## Check yourself

- [ ] Why do we never use SQLite for backend tests?
- [ ] Give one property that must hold for every refund, whatever the policy and dates.
- [ ] In the "same nights" concurrency test, what exactly must happen to the 49 losing requests?
- [ ] What does schemathesis do that hand-written API tests do not?
- [ ] How does the frontend find out at build time that an API field was removed?
- [ ] What must a test for rule BR-REV-01 be called, at minimum?
- [ ] Which performance scenario checks NFR-02, and what is its pass criterion?
- [ ] Name three items from the Definition of Done that concern personal data or languages.
