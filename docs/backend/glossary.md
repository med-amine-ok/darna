# Glossary

> **In plain words**
> Every technical or business word used in the blueprint, explained in one or two sentences.
> If a document uses a word you do not know, look here first. The list grows with each phase.

| Term | Meaning |
|---|---|
| `ActionResult` | What a Next.js server action returns today: success with data, or an error code. |
| ADR | Architecture Decision Record: a short note saying what was decided, why, and what else was considered. |
| Allauth (headless) | A Django library for sign-up, login, phone codes and two-factor login, used through an API. |
| ANPDP | Algeria's personal data protection authority (Autorité nationale de protection des données à caractère personnel). |
| API | The set of web addresses (endpoints) the apps call to read and change data. |
| `apply_bp` | The one rounding rule for money: amount x basis points / 10,000, rounded half up to a whole centime. Every computed line uses it; totals are sums of rounded lines. |
| Audit log | A list of who did what and when; never edited, only added to. |
| BFF | Backend for frontend: the Next.js server keeps the login cookie and calls Django on the browser's behalf. |
| Booking / Reservation | One guest's purchase of a unit for a time. The admin calls it Booking, the website Reservation. |
| Celery | A Python tool that runs background jobs (expire requests, send SMS) outside the web request. |
| Centimes | Hundredths of a dinar. We store money as whole centimes to avoid rounding errors. |
| Check-in code / stay confirmation | A 6-digit code shown only to the guest once a booking is confirmed. The host types it on arrival, or the guest confirms after check-in time; this "stay confirmation" is needed before a review can be written. |
| CI/CD | Continuous integration and delivery: every code change is automatically checked (tests, lint) and, if green, deployed to staging. |
| CIB / Edahabia | Algeria's bank card and postal card, accepted online through SATIM. |
| Commission | The percentage BLADUS earns on a booking, paid by the host from its deposit when the booking is confirmed. Guests pay no BLADUS fee. Base: the accommodation subtotal after discounts, without cleaning fee and taxes. |
| Commission follows the refund | The rule for cancellations (DEC-018, revised 2026-11-13): the host gets back the same share of the commission as the share of the subtotal refunded to the guest. Villa example: 50% refunded, so 3,330 of 6,660 DZD comes back and BLADUS keeps 3,330 DZD. Host cancellation returns all of it. |
| Cursor (pagination) | A bookmark returned by the API (for example the last message id) so the next request asks only for what came after it. |
| Database role | A login inside PostgreSQL with its own rights. BLADUS uses two: `bladus_migrator` owns the tables and runs migrations; `bladus_app` runs the app and may only read and add rows in the ledger and audit tables. |
| Double-entry ledger | Money records where each movement has lines that add up to zero, so money is never created or lost by mistake. |
| DPIA | Data protection impact assessment: a written analysis of the risks of a sensitive processing (here: host ID documents). |
| DRF | Django REST Framework, the library that turns Django into an API. |
| Endpoint | One API address with one method, for example `POST /api/v1/me/bookings` (create a booking). |
| ETag / If-Match | A version tag returned with a record; sending it back with a change makes the API refuse the change if someone else edited the record meanwhile. |
| Exclusion constraint | A PostgreSQL rule that refuses overlapping date ranges for the same unit. BLADUS uses it for homes and vehicles; rooms, beds and seats use counters instead. |
| Feature flag | A setting that turns a feature on or off without changing code (for example the dormant payment endpoints). |
| Four-eyes (rolling total) | A money action that needs a second admin. For top-ups it applies when the host's total of top-ups in the last 24 hours passes 500,000 DZD, so splitting a deposit into small ones does not avoid it. |
| Gantt chart | A timeline chart showing each milestone as a bar between its start and end dates. |
| Gate | A decision or legal answer that must exist before a milestone can finish. |
| Half-open range | A date range that includes the first day and excludes the last: `[check-in, check-out)`. Check-out day is free for the next guest. |
| HMAC hash / pepper | A one-way fingerprint made with a secret key; used to compare codes, tokens, ID or phone numbers without storing them in clear. The secret key is the **pepper** (`HASH_PEPPER`), kept outside the database; a plain SHA-256 of a short value is never used. |
| Hold | A short reservation of inventory while a guest pays; it expires automatically. |
| Host type | individual, agency, hotel or hostel. |
| Idempotency key | A unique request ID; repeating the request with the same key does not repeat its effect. |
| import-linter | A tool that fails the build if one Django app imports another it is not allowed to use. |
| Inventory conflict | A record opened when a hotel's own system says it has fewer rooms than BLADUS already holds or sold for a night. BLADUS keeps the sold rooms and the admin decides what to do. |
| k6 | A load-testing tool that simulates many users to check response times. |
| KYC | Know your customer: checking identity and business documents. |
| `lib/data` seam | The folder of data functions both apps call; each becomes an API call. |
| MFA / TOTP / passkey | Two-step login. TOTP is a 6-digit code from an authenticator app; a passkey uses the phone or computer's fingerprint or PIN. |
| Milestone | A block of work of 3 to 5 weeks with clear done criteria (M0 to M7, then R2). |
| Mock store | Data kept in server memory for demos; lost on restart. |
| Modular monolith | One application split internally into separate parts with clear rules about who talks to whom. |
| On-call | The person who answers alerts outside office hours, with a short written procedure (runbook) for each common problem. See [09b-operations.md](09b-operations.md). |
| OpenAPI | A standard file (`openapi.yaml`) describing every endpoint, from which typed client code is generated. |
| Orchestrator | The tool that starts the server programs and restarts them when they stop. BLADUS uses Docker Compose with systemd on one server for M0 to M2. |
| Organisation | An agency, hotel or hostel business with team members. |
| Outbox / outbox message | A table (`outbox_message`) where the backend writes 'send this email' or 'push this booking to the hotel' in the same save as the change; workers send them afterwards and retry, so nothing is lost. A message that failed 8 times becomes **dead** and shows in the admin queue, where it can be retried. |
| OWASP API Top 10 | The ten most common security mistakes in APIs, published by the OWASP foundation; used as a checklist. |
| PITR | Point-in-time recovery: restoring the database to any minute in the past from continuous backups. |
| PostGIS | The map and geography extension for PostgreSQL. |
| Presigned URL | A temporary, signed web address that lets a browser upload or download one file directly from storage. |
| Property-based test | A test that checks a rule on thousands of random inputs (for example: lines of a price always add up to the total). |
| PSP | Payment service provider: a licensed company that holds and moves other people's money. |
| RBAC | Role-based access control: rights come from a role (owner, manager, moderator...). |
| Reconciliation | The nightly job `reconcile_balances` that recomputes every balance from the ledger lines and alerts the admins if a stored balance differs. |
| Refund obligation | Money a host owes a guest after a cancellation, with a due date (7 days by default). The host declares it paid, the guest confirms or disputes. While one is overdue, the host loses instant booking and cannot accept requests. |
| REST | A common style of API where each address names a thing (`/bookings`) and the method says what to do (GET read, POST create, PATCH change, DELETE remove). |
| Risk score | Likelihood x impact (each 1 to 5); used to sort the risk register. |
| Room type | A kind of room or bed in a hotel or hostel, with a count of identical units. |
| RPO / RTO | Recovery point objective (how much data we may lose, here 5 minutes) and recovery time objective (how long until service is back, here 1 hour). See [09b-operations.md](09b-operations.md). |
| SATIM | The interbank company that runs card payments in Algeria. |
| Schemathesis | A tool that reads the OpenAPI file and sends many generated requests to check the API keeps its contract. |
| Server action | A Next.js function that runs on the server when a form is submitted. |
| Snapshot | A copy of a value (price, rate, policy) saved on a booking so later changes do not affect it. |
| Soft delete | Marking a row as deleted instead of removing it, so it can be restored. |
| SSRF | Server-side request forgery: tricking a server into calling an internal address. BLADUS checks every URL a host gives (hotel system, iCal link): https only, public addresses only, checked again at each fetch. |
| State machine | The allowed list of statuses and the allowed moves between them. |
| STRIDE | A checklist of six threat kinds: spoofing, tampering, repudiation, information disclosure, denial of service, elevation of privilege. |
| Taxe de séjour | Tourist tax per person per night, depending on the hotel's star rating. |
| Traceability matrix | A table linking each requirement to its rules, tables, endpoints, tests and milestone, so nothing is forgotten. |
| Trigger | A small function PostgreSQL runs automatically before or after a write; it can refuse the write. Used for blocked days and for the insert-only ledger and audit tables. |
| Trigram search (`pg_trgm`) | A way to compare texts by their 3-letter pieces, so `tizi wezou` still finds `Tizi Ouzou`. Used instead of full-text search because PostgreSQL has no Arabic stemmer. |
| UUIDv7 / display reference | Every record id is a UUIDv7: a long, random-looking but time-ordered id. People see short **display references** instead (`BLD-2026-7K2M9Q` for a booking, `LST-...` for a listing); those are only for display and search. |
| VPS | Virtual private server: a rented virtual machine in a data centre. |
| Vertical | A product family: homes, hotels, experiences, vehicles, trips. |
| Wallet adjustment | A manual correction of a host's deposit by an admin, with a reason, at most 1,000,000 DZD, posted only after a second admin approves. |
| Webhook | A call that another service (for example a payment gateway) makes to our API to tell us something happened. |
| Wilaya / commune | Algerian province / municipality. Today 69 wilayas and 1,541 communes. |
| Workspace (host) | The host account a user is acting for right now: themselves as a solo host, or one of their organisations. |

---

## Check yourself

- [ ] What is the difference between an endpoint and an API?
- [ ] What do RPO and RTO mean for BLADUS (5 minutes, 1 hour)?
- [ ] In the villa example, how much commission comes back to the host when the guest gets half the nights refunded?
- [ ] Why does the outbox exist?
- [ ] What is a gate in the roadmap?
- [ ] What is a half-open date range, and why does it allow back-to-back stays?
