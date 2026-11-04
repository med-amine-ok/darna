# BLADUS backend research: comparable platforms and Django ecosystem

Status: working notes for the backend blueprint. Research date for every source: **2026-11-04** (all URLs accessed on that date).
Scope: Airbnb-style marketplace for Algeria (homes, hotels with room types, hostels with per-bed booking, experiences, vehicle rentals, multi-day agency trips with departures). Two Next.js frontends (customer app, admin/partner app), backend Django + PostgreSQL.

Conventions in this file:
- "Verified" means the fact was read from the cited page or from the package registry (PyPI, npm, GitHub API) on 2026-11-04.
- "Unverified" or "secondary" means the fact comes from a third-party summary, not a primary source. Treat those as hints.
- Version numbers come from the PyPI JSON API (`https://pypi.org/pypi/<name>/json`), the npm registry, or GitHub releases, queried on 2026-11-04.

---

## Part A. How comparable platforms are built

### A.1 Airbnb engineering

| Topic | What Airbnb published | Source |
|---|---|---|
| Monolith to SOA | Airbnb moved from a Rails monolith ("Monorail") to services starting around 2016. Services were defined in a Thrift-based IDL with generated clients; request context and deadlines are propagated; load shedding via request deadlines; schema-based mocks for tests to avoid a "hidden monolith". InfoQ coverage notes a design rule: services own both reads and writes of their data, and the migration compared outputs between monolith and services by replaying traffic. | Building Services at Airbnb, parts 1 to 4: https://medium.com/airbnb-engineering/building-services-at-airbnb-part-1-c4c1d8fa811b , https://medium.com/airbnb-engineering/building-services-at-airbnb-part-2-142be1c5d506 , https://medium.com/airbnb-engineering/building-services-at-airbnb-part-3-ac6d4972fc2d , https://medium.com/airbnb-engineering/building-services-at-airbnb-part-4-23c95e428064 ; InfoQ: https://www.infoq.com/news/2019/02/airbnb-monolith-migration-soa/ |
| Search and ranking | Ranking started with gradient boosted decision trees, then moved to neural networks when gains plateaued; later papers cover diversity in ranking and embedding-based retrieval (2026). | arXiv 1810.09591 https://arxiv.org/abs/1810.09591 ; blog https://medium.com/airbnb-engineering/applying-deep-learning-to-airbnb-search-7ebd7230891f ; follow-ups https://arxiv.org/pdf/2002.05515 , https://arxiv.org/pdf/2210.07774 , https://arxiv.org/pdf/2601.06873 |
| Pricing | Smart Pricing suggests a price for every check-in date from demand, supply and listing features, and models booking lead time per date and location. | https://medium.com/airbnb-engineering/learning-market-dynamics-for-optimal-pricing-97cffbcc53e3 |
| Availability / calendar | No primary Airbnb engineering post describing the calendar/availability service architecture was found. Unverified, so not used. | (none) |
| Payments idempotency | "Orpheus" idempotency library: client sends an idempotency key per new request and reuses it on retries; request split into pre-RPC, RPC, post-RPC phases with a row-level lock on the key; errors must be classified retryable vs non-retryable; idempotency data read and written on the primary DB (never replicas) to avoid duplicate payments. | https://medium.com/airbnb-engineering/avoiding-double-payments-in-a-distributed-payments-system-2981f6b070bb |
| Ledger / financial reporting | Financial data is modeled as accounting events producing a double-entry subledger (accounts such as receivables, payables/host liabilities, revenue, taxes). The old approach (reverse-engineering finance from audit trails and DB triggers) was error-prone. | https://medium.com/airbnb-engineering/tracking-the-money-scaling-financial-reporting-at-airbnb-6d742b80f040 ; https://medium.com/airbnb-engineering/scaling-airbnbs-payment-platform-43ebfc99b324 |
| Messaging | "Messaging sync": clients fetch only changed threads/messages since last sync instead of full refetch; messaging is tightly coupled to the booking flow (status changes appear in threads). | https://medium.com/airbnb-engineering/messaging-sync-scaling-mobile-messaging-at-airbnb-659142036f06 |
| Trust and safety | ML risk scores (e.g. chargeback model) drive *targeted friction*: only risky users get extra verification steps, so good users are not penalized; effect measured via experiments. | https://medium.com/airbnb-engineering/fighting-financial-fraud-with-targeted-friction-82d950d8900e |
| Reviews | Homes: both guest and host have 14 days after checkout; reviews are published when both submitted or when the 14 days end, whichever comes first (double-blind). | https://www.airbnb.com/help/article/13 ; https://airbnb.com/help/article/995 |
| Cancellation policies | Third-party (secondary) sources report Airbnb restructured standard policies on 2025-10-01 to Flexible / Moderate / Limited / Firm with a 24 h grace period and optional non-refundable rate. Not verified on an Airbnb primary page. | secondary: https://www.hostfully.com/blog/airbnb-cancellation-policy/ |

### A.2 Booking.com, Expedia, Vrbo, GetYourGuide

| Platform | Pattern | Source |
|---|---|---|
| Booking.com | Inventory model = **room type** x **rate plan** ("roomrate"). Rooms-to-sell is set per room type per date and shared across all rate plans of that room type; prices and most restrictions (min stay, closed to arrival, etc.) are per room-type + rate-plan + date. Child rate plans can derive from a parent. They recommend loading 12 months ahead. | https://developers.booking.com/connectivity/docs/ari.md ; https://developers.booking.com/connectivity/docs/b_xml-availability ; https://developers.booking.com/connectivity/docs/room-type-and-rate-plan-management/managing-roomrates ; https://developers.booking.com/connectivity/docs/room-type-and-rate-plan-management/managing-rate-plans |
| Booking.com reviews | Only people who booked through the platform can review (includes no-shows and bookers for others); written reviews are moderated; reviews remain visible 36 months; removal conditions are enumerated. | https://partner.booking.com/en-us/help/guest-reviews/general/guest-review-process-and-conditions ; https://www.booking.com/reviews_guidelines.html |
| Expedia Rapid | Cancellation policy is data, not text: each rate has `refundable` + `cancel_penalties[]` (time windows with amount/percent/nights) + `nonrefundable_date_ranges`; since Feb 2025 also `current_refundability` (refundable / non_refundable / partially_refundable). Booking page must show the policy before confirmation. | https://developers.expediagroup.com/rapid/lodging/shopping/constructing-cancellation-policies ; https://developers.expediagroup.com/rapid/setup/launch-requirements/lodging-launch-reqs |
| GetYourGuide | Activities inventory = time-slotted vacancies per product option; flow is availability then reserve (hold) then confirm; supplier systems push availability updates; they rebuilt inventory on Kafka Streams when DB tables and stale availability caused booking errors. | https://www.getyourguide.careers/posts/scaling-the-inventory-parts-of-our-system-using-kafka-streams ; https://github.com/getyourguide/partner-api-spec ; https://www.getyourguide.supply/connectivity/partners-faqs |
| Vrbo | No primary engineering or API documentation could be retrieved (developer portal did not respond). Unverified; not used. | (none) |

### A.3 Open-source projects and reference models worth studying

| Project | Stack | What is useful for BLADUS | Link |
|---|---|---|---|
| pretix | Django | Best Django reference for **quota-based inventory**: an item can belong to several quotas, all must be available; availability = limit minus paid orders, pending orders within payment period, unexpired cart holds, blocking vouchers, waiting list. Directly maps to experiences, trip departures and hostel beds. Active (pushed 2026-11-04). | https://github.com/pretix/pretix ; https://docs.pretix.eu/dev/development/concepts.html ; https://docs.pretix.eu/dev/development/implementation/models.html |
| Saleor | Django + GraphQL | Order/payment state machines, checkout, channels, multi-currency, webhooks, permission groups. BSD-3. | https://github.com/saleor/saleor |
| django-oscar | Django | Mature domain-driven e-commerce: baskets, offers, order/payment events, app overriding pattern. | https://github.com/django-oscar/django-oscar |
| QloApps | PHP (PrestaShop-based) | Open-source hotel booking + channel manager concepts: hotel, room type, room, booking per date, demand-based pricing. Data model reference only. OSL-3.0. | https://github.com/Qloapps/QloApps |
| django-hordak | Django | Double-entry accounting models (accounts, transactions, legs) enforced with DB constraints; good reference for the payouts ledger. Last push 2026-04-02, small project. | https://github.com/adamcharnock/django-hordak |
| TigerBeetle | Zig DB | Purpose-built double-entry ledger DB; worth reading its design docs on debits/credits and pending (two-phase) transfers even if we do not adopt it. | https://github.com/tigerbeetle/tigerbeetle |
| Modern Treasury "Accounting for developers" | Article series | Clear explanation of double-entry for engineers. | https://www.moderntreasury.com/journal/accounting-for-developers-part-i |
| Chargily Pay v2 | Algerian gateway | EDAHABIA (Algerie Poste) and CIB (SATIM) checkouts; HMAC `signature` header on webhooks; test and live modes; Python SDK exists. Likely the first local payment integration. | https://dev.chargily.com/pay-v2/introduction ; https://dev.chargily.com/pay-v2/webhooks |

### A.4 Domain model summary for BLADUS (derived)

Unifying idea: every bookable product reduces to **an inventory unit + a time shape + a capacity**.

| Vertical | Listing | Sellable unit | Time shape | Capacity per slot | Comparable model |
|---|---|---|---|---|---|
| Home | Property | the whole property | nightly date range | 1 | Airbnb |
| Hotel | Property | RoomType (pool of N physical Rooms) + RatePlan | nightly date range | N per date (rooms-to-sell) | Booking.com roomrate |
| Hostel | Property | BedType / Dorm (pool of beds), optionally specific Bed | nightly date range | beds per date | Booking.com room type with count |
| Experience | Activity | Option | time slot (start datetime) | seats per slot | GetYourGuide, pretix quota |
| Vehicle | Vehicle (or vehicle class pool) | Vehicle | datetime range (pickup/return) | 1 per vehicle, N per class | car rental |
| Agency trip | Trip | Departure (fixed dates) | fixed multi-day departure | seats per departure | pretix quota per departure |

Core entities: `Organization` (host or agency, with members and roles), `Listing` (polymorphic by vertical), `InventoryUnit`, `RatePlan`, `DailyRate`/`PriceRule`, `AvailabilityBlock`, `CancellationPolicy` (structured), `Booking` + `BookingLine` + state machine, `Hold` (short TTL), `Payment`, `Refund`, `Payout`, `LedgerAccount` + `LedgerEntry`, `Review` (bound to a completed booking), `Thread` + `Message`, `Report`/`ModerationCase`, `AuditEvent`.

### A.5 Hard problems and what we decide

| Hard problem | What the platforms show | BLADUS decision |
|---|---|---|
| **Double booking** | Airbnb publishes nothing primary on calendars; Django/PostgreSQL offer native exclusion constraints on ranges (`ExclusionConstraint` + `RangeOperators.OVERLAPS`, requires `btree_gist`). | For capacity-1 units (home, specific vehicle, specific room or bed when assigned): store `stay = DateRangeField` (half-open `[checkin, checkout)`) and add an `ExclusionConstraint(unit WITH =, stay WITH &&) WHERE status IN active states`. The DB is the last line of defense; the service layer catches `IntegrityError` and returns a 409. For pooled capacity (hotel room types, hostel beds, experience slots, trip departures): an `InventoryDay`/`SlotInventory` row per unit per date with `total`, `held`, `booked` and a `CHECK (held + booked <= total)`; reserve with `UPDATE ... SET held = held + n WHERE ... AND held + booked + n <= total` (atomic, row-locked) inside a transaction. Holds expire via a scheduled job (pretix cart-hold idea). |
| **Availability search at scale** | Booking.com precomputes ARI per date; GetYourGuide moved to streaming when DB-backed inventory became stale and slow. | Phase 1: query PostgreSQL directly (PostGIS bounding box + filters + `NOT EXISTS` overlapping bookings / `InventoryDay` min availability over the range), with GiST and B-tree indexes. Keep a denormalized `ListingSearchDoc` row per listing updated by signals/tasks. Only add an external engine when measured latency demands it (Algeria-scale catalog is small). Never trust search results for booking: re-check inside the booking transaction. |
| **Pricing** | Booking.com: price per room-type x rate-plan x date; Airbnb: per-date suggestions. | Store explicit nightly prices per unit/date (`DailyRate`) materialized from rules (base, weekend, season, length-of-stay discount). Price quote is computed server side, returned with a signed `quote_id` and expiry, and re-validated at booking. |
| **Payments, escrow, payouts** | Airbnb: idempotency keys with row lock on primary DB; double-entry subledger from accounting events. | Every money-moving endpoint requires an `Idempotency-Key` header (IETF draft https://datatracker.ietf.org/doc/draft-ietf-httpapi-idempotency-key-header/ , Stripe pattern https://stripe.com/docs/api/idempotent_requests ). Immutable double-entry ledger in PostgreSQL: `LedgerTransaction` with `LedgerEntry` legs whose sum is zero per currency (enforced by a deferred constraint trigger or by service + check). Accounts: guest_receivable, platform_escrow (funds held until check-in + N hours), host_payable, platform_revenue (fees), tax_payable, refunds. Balances derived from entries, never edited. Payouts are batch jobs that move host_payable to paid. Gateway webhooks (Chargily HMAC) are stored raw, verified, deduplicated by event id, then processed idempotently. |
| **Cancellation policies** | Expedia models policies as penalty windows; Airbnb has named tiers. | Store `CancellationPolicy` as named templates with structured `windows[] (hours_before_start, refund_percent, fee_nights)`; snapshot the policy onto the booking at confirmation (policy changes never affect existing bookings). Refund calculation is a pure function tested with hypothesis. |
| **Fraud and fake listings** | Airbnb: risk scores plus targeted friction; a single decision model applies to users, listings and reservations (secondary source https://dmitry.pt/2023/detecting-risk-in-real-time-technology ). | Listing goes `draft -> pending_review -> published`; admin moderation queue in the back-office. KYC for hosts and agencies (ID + registre de commerce for agencies) before payout enablement. Rule-based risk flags (new account + high value, many failed payments, duplicate photo hashes via perceptual hash, off-platform contact info in messages) that trigger friction (phone OTP, manual review) instead of blanket blocks. All decisions recorded as `ModerationCase` with audit trail. |
| **Review integrity** | Booking.com: only bookers can review, moderation, fixed visibility window. Airbnb: 14-day window, double-blind reveal. | Review requires a `Booking` in `completed` state, one review per booking per direction, window of 14 days after end, double-blind reveal (publish when both submitted or window closes), no edits after reveal, host may reply once, moderation for abuse with reasons logged. Aggregate ratings stored denormalized on the listing and recomputed by task. |
| **Messaging** | Airbnb sync model: only fetch changes. | Thread per booking/inquiry; cursor-based "changes since" endpoint so polling is cheap; realtime push is an optimization layered on top (see B.6). Mask phone numbers/emails before booking confirmation. |
| **Architecture** | Airbnb SOA was a response to hundreds of engineers on one codebase. | Start as a **modular monolith** (one Django project, bounded-context apps, services/selectors, no cross-app model writes). Services are a later option, not a starting point. |

---

## Part B. Django ecosystem decisions

Baseline versions (PyPI, 2026-11-04): **Django 6.1.3** (latest), 6.0.10, **5.2.19 LTS** (extended support until April 2028); next LTS 6.2 scheduled April 2027 (https://www.djangoproject.com/download/). Django 6.0 (released 2025-12-03) added built-in Tasks framework and CSP support (https://www.djangoproject.com/weblog/2025/dec/03/django-60-released/ , https://docs.djangoproject.com/en/6.0/releases/6.0/). psycopg 3.3.7.

**Recommendation for baseline:** Django 6.1 on Python 3.13, plan upgrade to 6.2 LTS in 2027. Rationale: 5.2 LTS lacks `django.tasks` and CSP; 6.1 is supported until December 2027, overlapping 6.2 LTS. Alternative if the team prefers fewer upgrades: 5.2 LTS + `django-tasks` backport. Note the user brief says the frontends are Next.js 14; npm `next` latest is 16.4.5, which matters for SSR auth patterns below.

### B.1 PostgreSQL + PostGIS, range types and exclusion constraints

| Option | Pros | Cons |
|---|---|---|
| PostGIS + GeoDjango (`django.contrib.gis`) | Real geography types, `ST_DWithin` distance queries with GiST index, bounding-box map search, polygon areas (wilayas, communes). First-class in Django ORM. | Needs GDAL/GEOS/PROJ system libs in containers; managed PG must offer PostGIS. |
| Plain lat/lng floats + Haversine or `earthdistance`/`cube` | No system libs. | No polygon support, weaker indexing, reinventing GIS. |

Range types + exclusion: `django.contrib.postgres.fields.DateRangeField` / `DateTimeRangeField`, `ExclusionConstraint` with `RangeOperators.OVERLAPS` and `RangeOperators.EQUAL`, optional `condition=Q(...)` (partial), `BtreeGistExtension` migration op required for the equality part (verified in docs: https://docs.djangoproject.com/en/6.0/ref/contrib/postgres/constraints/ , https://docs.djangoproject.com/en/6.0/ref/contrib/postgres/fields/ , https://www.postgresql.org/docs/current/rangetypes.html , https://www.postgresql.org/docs/current/btree-gist.html).

**Recommendation:** PostGIS + GeoDjango (https://docs.djangoproject.com/en/6.0/ref/contrib/gis/ , https://postgis.net/). Store `location = PointField(geography=True, srid=4326)` and public "fuzzed" point for homes (exact address revealed after booking). Use `DateRangeField` + `ExclusionConstraint` for capacity-1 units and `CHECK`-constrained inventory counters for pooled units (see A.5). Note: violation of an exclusion constraint surfaces as `IntegrityError` on save; `violation_error_code` only applies to model validation.

### B.2 API layer: DRF vs Django Ninja

| | Django REST Framework | Django Ninja |
|---|---|---|
| Latest | 3.18.3 (2026-10-06) | 1.7.3 (2026-10-29) |
| Activity | Very active releases in 2026; maintainers state it is "considered feature-complete" (https://www.django-rest-framework.org/community/release-notes/) | Active (pushed 2026-11-04), 9.2k stars |
| Pros | Largest ecosystem (drf-spectacular, guardian/rules integration, throttling, filters, SimpleJWT, standardized errors); every Django dev knows it; browsable API. | Pydantic schemas, type hints drive validation and OpenAPI automatically, fast, async-friendly, less boilerplate. |
| Cons | Serializer verbosity, OpenAPI via add-on, sync-first. | Smaller ecosystem: permissions, throttling, filtering patterns are thinner; fewer battle-tested auth/permission libs. |

**Recommendation:** **DRF**, used in the HackSoft style (thin APIView + input/output serializers + services). Reason: the permission, throttling, audit and OpenAPI tooling we need is mature around DRF, and the hiring pool in Algeria will know DRF. Ninja is a fine choice if the team values Pydantic typing more; allauth headless supports both.

### B.3 Auth

| | django-allauth (headless) | dj-rest-auth + SimpleJWT |
|---|---|---|
| Latest | 65.21.1 (2026-10-30), very active | dj-rest-auth 7.2.0 (2026-03-15); SimpleJWT 5.5.1 (2025-07-21) |
| Features | Headless API for SPA/mobile with session tokens or JWT strategies, OpenAPI spec, email + **phone login and SMS verification** (adapter implements `send_verification_code_sms`), social login, built-in **MFA** (TOTP, recovery codes, WebAuthn/passkeys), rate limits. | REST endpoints for login/registration/password reset, JWT or tokens; social via allauth underneath. |
| Cons | Opinionated flow model; headless docs are spread across pages. | Two libraries glued together, slower release cadence, no built-in MFA or phone OTP. |

Sources: https://docs.allauth.org/en/latest/headless/index.html , https://docs.allauth.org/en/latest/headless/token-strategies/index.html , https://docs.allauth.org/en/latest/account/phone.html , https://docs.allauth.org/en/latest/mfa/index.html , https://github.com/iMerica/dj-rest-auth , https://github.com/jazzband/djangorestframework-simplejwt

Phone OTP: allauth phone support needs us to provide phone storage and an SMS sender. SMS provider choice for Algeria (local aggregators vs Twilio/Vonage) was not researched here; unverified. Store numbers with `django-phonenumber-field` 9.0.0 (E.164).

Sessions vs JWT for Next.js SSR: server components run on the Next.js server, so they cannot read browser `localStorage`; they can forward cookies. Next.js docs describe cookie-based session management for the App Router (https://nextjs.org/docs/app/guides/authentication). Two workable patterns:
1. Same-site deployment (`app.bladus.dz` + `api.bladus.dz`): Django session cookie with `Domain=.bladus.dz`, `HttpOnly`, `Secure`, `SameSite=Lax`, CSRF token for mutations. Server components forward the incoming `cookie` header to the API.
2. Next.js as BFF: Next.js stores an encrypted httpOnly cookie containing the allauth session token (app client flow, `X-Session-Token`) and attaches it on server-side fetches.

**Recommendation:** **django-allauth headless** with session-token strategy, Next.js BFF pattern (2) for the customer app, short sessions plus mandatory MFA (allauth MFA TOTP/WebAuthn) for staff in the admin app. Avoid long-lived JWTs in the browser (revocation is hard). django-otp 1.7.5 is the alternative if we keep Django admin login separate; prefer one MFA system (allauth MFA) unless Django admin is exposed, in which case add `django-otp` on the admin site only.

### B.4 Permissions (object-level, org roles owner/admin/manager)

| | DRF permissions (custom classes) | django-guardian | django-rules |
|---|---|---|---|
| Latest | built into DRF 3.18.3 | 3.5.2 (2026-10-20), active | `rules` 3.5 (2024-09-02); repo pushed 2025-10 |
| Model | `has_permission` / `has_object_permission` per view | per-object permission rows in DB (user/group x perm x object) | predicates (Python functions) composed with `&`, `|`; no DB tables |
| Pros | Simple, no deps | Fine-grained grants, admin integration | Expressive, testable, zero storage, integrates with Django's perm API and DRF |
| Cons | Logic scattered per view | Row explosion (every listing x member x perm), sync burden when memberships change | Release cadence slow (stable, small codebase); queryset filtering must be written separately |

Sources: https://www.django-rest-framework.org/api-guide/permissions/ , https://django-guardian.readthedocs.io/ , https://github.com/dfunckt/django-rules

**Recommendation:** Org-scoped RBAC in our own tables (`Membership(user, organization, role)`), predicates in **django-rules** (`is_org_owner`, `is_org_manager_of(listing)`), exposed through thin DRF permission classes; plus selectors that always filter querysets by the caller's organizations (permissions alone do not protect list endpoints). Skip guardian: our grants derive from org membership, not per-object ACLs.

### B.5 Background jobs

| Option | Latest | Notes |
|---|---|---|
| Celery + Redis/RabbitMQ | celery 5.6.3 (2026-03-26) | De facto standard; beat scheduler, retries, chords, Flower monitoring. Heavier config, many knobs. https://docs.celeryq.dev/en/stable/ |
| Dramatiq | 2.2.1 (2026-09-02) | Simpler, reliable defaults (acks late), LGPL. https://dramatiq.io/ |
| Django-Q2 | 1.11.1 (2026-08-26) | Can use the DB as broker, admin integration; smaller community. https://django-q2.readthedocs.io/ |
| Huey | 3.5.4 (2026-11-01) | Lightweight, Redis or SQLite, periodic tasks. https://huey.readthedocs.io/ |
| Django `django.tasks` (Django 6.0+) | built-in | DEP 14 "Background workers" status **Accepted**, implemented in 6.0. Django provides definition, queuing and results only; built-in backends (`ImmediateBackend`, `DummyBackend`) are for dev/test; production needs a third-party backend with a worker, e.g. `django-tasks-db` 0.13.0 (2026-08-28) or `django-tasks-rq` 0.12.0. Arguments must be JSON-serializable; enqueue inside `transaction.on_commit`. https://docs.djangoproject.com/en/6.0/topics/tasks/ , https://raw.githubusercontent.com/django/deps/main/final/0014-background-workers.rst , https://github.com/RealOrangeOne/django-tasks |

**Recommendation:** **Celery 5.6 + Redis** for now (needs: hold expiry, payout batches, scheduled reminders, image processing, search doc refresh, webhooks retry with backoff). Write tasks as thin wrappers around services and enqueue via `transaction.on_commit`, so moving to `django.tasks` later is mechanical once its worker backends mature. Use `celery beat` with `django-celery-beat` (not version-checked here) or a code-defined schedule.

### B.6 Realtime messaging

| Option | Pros | Cons |
|---|---|---|
| Django Channels + channels-redis | Same codebase and auth; channels 4.3.2 (2025-11-20), channels-redis 4.3.0 (2025-07-22). https://channels.readthedocs.io/ | Needs ASGI servers and sticky long-lived connections managed by us; release cadence slowed in 2025. |
| Centrifugo (self-hosted, Go) | v6.10.2 (2026-10-23). Handles WebSocket/SSE/HTTP-streaming connections; Django only publishes over HTTP API and issues expiring JWT connection tokens; positions itself as a self-hosted alternative to Pusher/Ably. https://centrifugal.dev/docs/getting-started/comparisons | Another service to run. Some features only in paid PRO. |
| Pusher / Ably (managed) | Zero ops | Data leaves to foreign SaaS, per-message cost, not self-hostable. Pricing not researched here. |
| Polling / SSE | Simplest; works with "changes since cursor" endpoint (Airbnb messaging sync idea). | Latency and wasted requests at scale. |

**Recommendation:** Launch with **cursor-based polling** (every 5 to 15 s while a thread is open, slower in inbox) over a sync endpoint, plus push notifications/email. Add **Centrifugo** when realtime matters (keeps Django WSGI-only, simpler than running Channels). Channels is the fallback if we want everything in Python.

### B.7 Search

| Option | Latest | Pros | Cons |
|---|---|---|---|
| PostgreSQL FTS + pg_trgm + PostGIS | built in | One datastore, transactional consistency with availability, Django `SearchVector`, `TrigramSimilarity`, GiST/GIN indexes. https://docs.djangoproject.com/en/6.0/ref/contrib/postgres/search/ , https://www.postgresql.org/docs/current/pgtrgm.html | Arabic stemming support in PostgreSQL FTS is limited (no built-in Arabic snowball config verified here); relevance tuning is manual. |
| Meilisearch | server v1.56.1 (2026-11-02), py client 0.43.0 | Typo tolerance, facets, geosearch (`_geoRadius`, `_geoBoundingBox`), easy ops. https://www.meilisearch.com/docs/learn/filtering_and_sorting/geosearch | Separate index to keep in sync; availability must still be checked in PG. |
| Typesense | v30.2 (2026-04-19), py client 2.1.1 | Similar feature set, geo search, in-memory speed. https://typesense.org/docs/guide/ | Same sync burden; RAM-bound. |
| OpenSearch | 3.9.0 (2026-09-29) | Most powerful (analyzers incl. Arabic, aggregations). | Heavy to operate for our scale. |

**Recommendation:** **PostgreSQL first** (PostGIS distance/bbox + filters + `unaccent` + pg_trgm for place/title autocomplete, FTS for descriptions). Keep a `ListingSearchDoc` table that is engine-agnostic. Add **Meilisearch** later if multilingual typo-tolerant text search (especially Arabic and Latin transliterations like "Tizi Ouzou" vs "تيزي وزو") becomes a product need. Availability filtering always stays in PostgreSQL.

### B.8 Files and images

| | django-storages + S3-compatible | Cloudinary |
|---|---|---|
| Latest | django-storages 1.14.6 (2025-04-02; no release since, repo should be watched) | (SaaS; Python SDK not version-checked) |
| Pros | Vendor-neutral; Cloudflare R2 has no egress fees for S3 API / public access (https://developers.cloudflare.com/r2/pricing/), supports presigned URLs (https://developers.cloudflare.com/r2/api/s3/presigned-urls/); B2, Scaleway, OVH also S3-compatible. | On-the-fly transforms, CDN, moderation add-ons in one product. |
| Cons | We build the resize pipeline. | Cost scales with transformations and bandwidth; lock-in. |

Pipeline options: Pillow 13.0.0 in a Celery task (generate fixed renditions, strip EXIF/GPS), or **imgproxy** v4.0.21 (2026-11-02) / thumbor (active) as on-the-fly resizer behind the CDN with signed URLs (https://docs.imgproxy.net/ , https://github.com/thumbor/thumbor). Virus scanning: ClamAV 1.5.4 (2026-08-07) via clamd in a worker for documents (KYC PDFs); images are re-encoded by Pillow, which neutralizes most payloads (https://docs.clamav.net/).

**Recommendation:** **django-storages (S3 backend) + Cloudflare R2**, private bucket for KYC documents, public bucket behind CDN for listing photos. Uploads via **presigned PUT** from the browser to a `quarantine/` prefix, then a task validates MIME + size, re-encodes with Pillow to WebP/AVIF + JPEG fallback renditions, computes a perceptual hash (duplicate/fake listing detection), and moves to `public/`. Consider imgproxy later. Data residency for Algerian law on personal data (Law 18-07) was not researched here and must be checked before storing KYC abroad.

### B.9 Content translations fr/en/ar

| | django-modeltranslation | django-parler |
|---|---|---|
| Latest | 0.20.6 (2026-09-07), active | 2.4 (2026-05-14), active |
| Storage | Extra columns per language on the same table (`title_fr`, `title_en`, `title_ar`) | Separate translation table per model |
| Pros | Simple queries, easy indexing/FTS per language, no joins, works with admin. | Unlimited languages without migrations, clean schema. |
| Cons | Adding a language = migration; wide tables. | Joins/prefetch on every read, harder filtering and ordering. |

Sources: https://django-modeltranslation.readthedocs.io/ , https://django-parler.readthedocs.io/

**Recommendation:** **django-modeltranslation** for platform-owned taxonomy (amenities, categories, wilayas, policy names): fixed 3 languages, fast reads, per-language search columns. For user-generated text (listing titles/descriptions) store the host's original text + `source_language`, plus optional translated fields filled by humans or machine translation later; do not force hosts to write three versions.

### B.10 Back-office

| | Custom Next.js admin (existing) | Django admin + Unfold |
|---|---|---|
| Latest | existing app | django-unfold 0.110.1 (2026-11-01), very active (https://unfoldadmin.com/) |
| Pros | Product-quality UX for partners and ops, same design system, same API (dogfooding). | Free CRUD on every model, filters, actions, inline history; minutes to add a screen. |
| Cons | Every internal tool must be built through the API. | Not for partners/hosts; risk of bypassing service-layer rules if admins edit models directly. |

**Recommendation:** Both, with clear roles. The **Next.js admin** is the product (partner dashboards, moderation queue, payouts review, support). **Django admin + Unfold** is a staff-only, MFA-protected, IP-restricted engineering/support console, mostly read-only for financial models (ledger entries never editable), with admin actions calling services.

### B.11 Audit logging

| | django-simple-history | django-auditlog | django-pghistory |
|---|---|---|---|
| Latest | 3.13.0 (2026-07-22), django-commons | 3.4.1 (2025-12-18), jazzband | 3.9.2 (2026-02-17), AmbitionEng |
| Mechanism | Python signals, full historical table per model | Python signals, single LogEntry table with JSON diffs | **PostgreSQL triggers** (django-pgtrigger), event tables, context (user, request) attached |
| Pros | Point-in-time snapshots, admin integration | Simple, one table | Captures bulk updates, raw SQL and `queryset.update()` that signals miss; reliable |
| Cons | Misses `update()`/bulk ops | Same; diffs only | PostgreSQL only (fine for us), triggers in migrations |

Sources: https://django-simple-history.readthedocs.io/en/stable/ , https://django-auditlog.readthedocs.io/ , https://django-pghistory.readthedocs.io/

**Recommendation:** **django-pghistory** for bookings, payments, payouts, listings, memberships, policies (bulk updates in inventory and payouts would escape signal-based tools). Plus an explicit domain `AuditEvent`/activity log written by services for human-readable "who did what" in the back-office. The ledger is itself append-only and needs no history.

### B.12 Rate limiting, caching, idempotency

- **DRF throttling** (built in; scoped throttles per endpoint, Redis cache backend) https://www.django-rest-framework.org/api-guide/throttling/ . **django-ratelimit** 4.1.0 is from 2023-07-24 with repo last pushed 2024-07: stable but inactive. allauth has its own rate limits for auth endpoints. Recommendation: DRF scoped throttles for API, allauth limits for auth, plus edge limits at the reverse proxy/CDN.
- **Caching:** Redis via Django's built-in `RedisCache`. **django-cachalot** 2.9.1 (2026-08-10) auto-caches ORM queries and invalidates per table; on write-heavy tables (inventory, bookings) invalidation is constant, so value is low. Recommendation: explicit caching of computed results (search facets, listing detail, quote) with versioned keys; no cachalot.
- **Idempotency keys:** `django-idempotency-key` 1.3.0 last released 2023-05-02 (inactive). Recommendation: small in-house implementation following Airbnb Orpheus and the IETF draft: `IdempotencyRecord(key, user, endpoint, request_hash, status, response, locked_at, expires_at)` on the primary DB, `SELECT ... FOR UPDATE`, replay the stored response for repeats, 409 for concurrent in-flight, 422 for same key different body.

### B.13 API docs and typed TS client

- **drf-spectacular** 0.30.0 (2026-07-06), OpenAPI 3 generation for DRF, active (https://drf-spectacular.readthedocs.io/). Add **drf-standardized-errors** 0.16.0 for a uniform error schema.
- TS generators (npm, 2026-11-04):

| Tool | Latest | Output | Notes |
|---|---|---|---|
| openapi-typescript + openapi-fetch | 7.13.0 / 0.17.0 (2026-02-11) | Types only + tiny typed fetch | Minimal runtime, works in server components |
| orval | 8.46.0 (2026-10-30) | Clients + TanStack Query hooks + MSW mocks + Zod | Very active, heavier |
| @hey-api/openapi-ts | 0.99.0 (2026-06-22) | SDK, types, Zod, TanStack plugins | Pre-1.0 (breaking changes possible) |

**Recommendation:** drf-spectacular -> `openapi.json` committed in CI -> **openapi-typescript + openapi-fetch** shared package used by both Next.js apps (fits server components and route handlers; no hooks runtime required). Consider orval only if the apps standardize on TanStack Query in client components.

### B.14 Testing

| Tool | Latest | Role |
|---|---|---|
| pytest-django | 4.14.0 (2026-08-10) | test runner |
| factory_boy | 3.3.3 (2025-02-03) | explicit factories, traits, SubFactory |
| model_bakery | 1.24.2 (2026-10-06) | quick auto-filled instances |
| hypothesis | 6.170.14 (2026-10-30) | property tests: pricing, refunds, ledger balancing, overlap logic |
| schemathesis | 4.33.0 (2026-11-01) | contract/fuzz tests from the OpenAPI schema |

**Recommendation:** pytest-django + **factory_boy** (explicit, readable domain factories) + hypothesis for money and date-range logic + schemathesis in CI against the generated schema. Concurrency tests for double booking using real PostgreSQL (`transaction=True` tests with threads), never SQLite.

### B.15 Project structure

- **HackSoft Django Styleguide**: business logic in `services` (writes) and `selectors` (reads), thin APIs, models without heavy logic, explicit input/output serializers (https://github.com/HackSoftware/Django-Styleguide). Last pushed 2025-09.
- **cookiecutter-django**: production template (Docker, Celery, allauth, django-environ, Sentry, pytest), release 2026.11.3 on 2026-11-04, very active (https://github.com/cookiecutter/cookiecutter-django).
- Two Scoops of Django: book; no current edition for Django 6 was verified, so treat as general guidance only.

**Recommendation:** Bootstrap from cookiecutter-django ideas (not necessarily the generator), organize as a **modular monolith** with apps per bounded context: `accounts`, `organizations`, `catalog` (listings, units, media, amenities), `inventory` (availability, holds), `pricing`, `bookings`, `payments` (gateway, ledger, payouts), `reviews`, `messaging`, `trust` (moderation, risk, KYC), `notifications`, `geo`, `search`, `audit`. Follow HackSoft services/selectors; cross-app calls go through services, never through another app's models directly. Enforce boundaries with `import-linter` (not version-checked here).

### B.16 Settings, linting, CI/CD, observability

| Topic | Option A | Option B | Recommendation |
|---|---|---|---|
| Settings | django-environ 0.14.0 (2026-06-18) | pydantic-settings 2.16.2 (2026-10-28) | **pydantic-settings**: typed, validated at boot, fails fast. django-environ is fine and is what cookiecutter uses. |
| Lint/format | ruff 0.17.3 (2026-10-27) | (black + isort + flake8) | **ruff** for lint + format. |
| Typing | mypy 2.4.1 + django-stubs 6.1.2 + djangorestframework-stubs 3.18.2 | pyright | **mypy + django-stubs** (plugin understands the ORM). |
| CI/CD | GitHub Actions: ruff, mypy, pytest with PostGIS service container, schema diff, schemathesis, build image | | GitHub Actions. |
| Errors | sentry-sdk 2.73.0 | | Sentry (Django + Celery integrations) https://docs.sentry.io/platforms/python/integrations/django/ |
| Logs | django-structlog 11.0.0 / structlog 26.1.0 | std logging JSON formatter | **structlog** JSON logs with request_id, user_id, org_id. |
| Tracing | opentelemetry-instrumentation-django 0.66b2 (still beta versioning) | | Add OTel when we have >1 service; Sentry performance first. |
| Metrics | django-prometheus 2.5.0 (2026-05-26) | | Prometheus metrics endpoint; plus django-health-check 4.11.4 for probes. |

### B.17 Money handling

- ISO 4217 List One gives **DZD numeric 012, minor unit 2** (verified via copies of List One: SAP documentation https://help.sap.com/doc/saphelp_pos22/2.2/en-US/4f/efa63a9bb04d94a0ae4c32fd6cd827/content.htm?no_cache=true , Adyen currency table https://docs.adyen.com/development-resources/currency-codes ; ISO's own page returned HTTP 403 to automated fetch; the maintenance agency is SIX https://www.six-group.com/en/products-services/financial-information/data-standards.html). Wikipedia notes centimes rarely circulate (https://en.wikipedia.org/wiki/Algerian_dinar).
- Options:

| | Integer minor units (`BigIntegerField`, centimes) | `DecimalField(max_digits=14, decimal_places=2)` / django-money |
|---|---|---|
| Pros | Exact, fast, matches gateway APIs that use minor units, trivial sums in ledger, no rounding surprises. | Human-readable in DB; django-money 3.6.2 adds a `Money` type and currency field. |
| Cons | Must format at the edges. | Decimal context/rounding discipline required; **django-money's GitHub repo was archived and the project is migrating to Codeberg (notice dated 2026-06-07)**, https://codeberg.org/django-money/django-money , so its maintenance path is in transition. |

**Recommendation:** Store **integer minor units (centimes) in `BigIntegerField` + `currency CHAR(3)`** on every amount column, wrapped in a small in-house `Money` value object (amount_minor, currency) with explicit rounding rules. Business rule: prices shown and charged in whole dinars (amounts are multiples of 100 centimes), but fees, commissions and tax splits are computed in centimes and rounded with a documented rule (round half up at the line level, remainder assigned to platform), so the ledger always balances exactly. This keeps us ISO-correct (minor unit 2) while matching practical whole-dinar pricing. Chargily's amount unit (dinars vs centimes) must be confirmed against its API reference before integration; not verified here.

---

## Summary table of recommendations

| # | Topic | Choice |
|---|---|---|
| 0 | Framework | Django 6.1 (Python 3.13), upgrade to 6.2 LTS in 2027 |
| 1 | DB | PostgreSQL + PostGIS; DateRange + ExclusionConstraint for capacity-1, CHECKed counters for pools |
| 2 | API | DRF 3.18 + HackSoft style |
| 3 | Auth | allauth headless (session tokens, phone OTP, MFA), Next.js BFF cookie |
| 4 | Permissions | Own org RBAC + django-rules + queryset scoping |
| 5 | Jobs | Celery 5.6 + Redis, tasks as thin service wrappers |
| 6 | Realtime | Polling sync endpoint first, Centrifugo later |
| 7 | Search | PostgreSQL FTS + pg_trgm + PostGIS; Meilisearch only if needed |
| 8 | Files | django-storages + R2, presigned uploads, Pillow renditions, ClamAV for docs |
| 9 | i18n | modeltranslation for taxonomy; original + translations for UGC |
| 10 | Back-office | Next.js admin for product; Django admin + Unfold for staff console |
| 11 | Audit | django-pghistory + domain AuditEvent |
| 12 | Limits/cache/idempotency | DRF throttles, Redis explicit caching, in-house idempotency |
| 13 | API docs | drf-spectacular + openapi-typescript/openapi-fetch |
| 14 | Tests | pytest-django, factory_boy, hypothesis, schemathesis |
| 15 | Structure | Modular monolith, bounded-context apps |
| 16 | Ops | pydantic-settings, ruff, mypy+django-stubs, GitHub Actions, Sentry, structlog, Prometheus |
| 17 | Money | BigInteger centimes + currency code, in-house Money type, double-entry ledger |

## Not verified / open questions

- Airbnb calendar/availability architecture: no primary source found.
- Vrbo: no primary docs retrieved.
- Airbnb current cancellation tiers: only third-party sources.
- SMS OTP providers serving Algeria, pricing for Pusher/Ably, Cloudinary SDK version, django-celery-beat and import-linter versions: not checked.
- Algerian personal data law (Law 18-07) implications for hosting KYC files outside Algeria: needs legal review.
- Chargily amount units and payout (transfer to host) capabilities: confirm in their API reference.
- PostgreSQL FTS Arabic configuration availability: not verified.
