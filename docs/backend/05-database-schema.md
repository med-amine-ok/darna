# 05. Database schema

> **In plain words**
> This is the plan for the database: which tables exist, how they link, and which rules the database itself enforces.
> It has 77 tables in 14 groups. The full column list is in [05b-data-dictionary.md](05b-data-dictionary.md) and the machine-readable version in [schema.dbml](schema.dbml).
> The most important ideas: one "host account" for every kind of host; the database refuses double bookings; money is kept in a ledger that is never edited.
> Each big choice is written as a short decision record (ADR) with the options we rejected.
> At the end: how today's demo data maps onto the new tables, what to seed first, and how the busiest queries will run.

**Terms used here** (see [glossary.md](glossary.md)):
- **Table / row / column**: a table is like a spreadsheet tab; a row is one record; a column is one field.
- **Primary key (PK)**: the column that identifies a row. **Foreign key (FK)**: a column pointing to a row in another table.
- **Constraint**: a rule the database checks on every write (unique, check, exclusion, foreign key).
- **Index**: a lookup structure that makes searches fast, like the index at the back of a book.
- **Partial index**: an index (often unique) that applies only to rows matching a condition, e.g. "only active owners".
- **GiST / GIN**: PostgreSQL index types for ranges, map points, arrays and text search.
- **Migration**: a versioned script that creates or changes tables. Not written yet (no backend code in this phase).

Inputs: [01-system-inventory.md](01-system-inventory.md), [03-requirements.md](03-requirements.md), [04-business-rules.md](04-business-rules.md), research [02-research.md](02-research.md) section B.

---

## 1. Shape of the database

| Group (Django app) | Tables | Purpose |
|---|---|---|
| accounts | user, staff_profile, staff_permission, staff_role_permission, consent_record, favorite | People, staff roles, consents |
| geo | wilaya, daira, commune | 69 wilayas, 1,541 communes |
| hosts | host_account, organization, membership, invitation, host_document, payout_account | Who hosts, teams, verification |
| catalog | category, property_type, amenity, cancellation_policy, listing, listing_revision, vehicle_detail, experience_detail, room_type, listing_amenity, room_type_amenity, listing_photo, featured_placement | What is offered |
| inventory | listing_day, room_type_night, experience_slot | What is free, and at what price, per day or slot |
| trips | trip, trip_itinerary_day, trip_departure | Agency multi-day products |
| pricing | quote, tax_rate | Server-computed prices |
| bookings | booking, booking_event, refund, dispute | Reservations and their history |
| ledger | ledger_account, ledger_transaction, ledger_entry, account_balance, wallet_topup, gateway_event, payment\*, payout\*, invoice | Money (\* dormant until the money model changes) |
| reviews | review, review_reply, review_report | Reviews after stays |
| messaging, notifications | conversation, conversation_participant, message, notification, notification_preference, outbox_event, delivery_log | Messages, alerts, reliable sending |
| media | media_asset | Photos and private documents |
| trust, config, audit, privacy, core | incident_record, otp_send_log, calendar_feed (inventory), reason_code, moderation_case, moderation_decision, change_request_item, platform_settings, onboarding_flow_version, onboarding_draft, coupon, coupon_redemption, audit_event, export_job, data_subject_request, idempotency_record, listing_search_doc | Staff work, settings, history, legal requests, system safety |

Diagrams: [diagrams/erd-00-overview](diagrams/README.md) shows the 26 core tables; one diagram per group follows (Phase 4).

---

## 2. Conventions

| Topic | Convention | Why |
|---|---|---|
| IDs | UUIDv7 (time-ordered) made by the app; human references for people (`BLD-2026-7K2M9Q`, `LST-...`) | Not guessable (BR security API1), sortable, no `Date.now()` collisions |
| Money | `BIGINT` centimes in columns ending `_minor`, plus `currency char(3)` | Exact sums (ADR-006) |
| Rates | integer basis points `_bp` (1,200 = 12%) | No float rounding |
| Time | `timestamptz` in UTC; stay nights as `date` / `daterange` in Africa/Algiers | BR-SYS-05 |
| Names in 3 languages | `name_en`, `name_fr`, `name_ar` columns on platform lists (django-modeltranslation) | Research B.9 |
| User text | original text + `source_language` | Hosts write once |
| Soft delete | `deleted_at` (+ `status_before_delete` where restore exists) | Admin restore (U7) |
| Who did it | always an FK to `user.id`, never a name | BR-STF-03 |
| Cached numbers | ratings, counts, balances are caches recomputed by jobs; never edited by hand | BR-REV-04, BR-PAY-03 |
| Table names | Django will prefix with the app (`bookings_booking`); this document uses short names | Readability |

---

## 3. Architecture decision records (ADRs)

Each ADR: the context, the decision, the options rejected, the consequences.

### ADR-001: One `host_account` for every kind of host
- **Context**: the website has users with organisations; the admin has a flat `Host` row; one person may host alone and also run an agency (DEC-004, disagreement D-1).
- **Decision**: `host_account` is either one user (`kind = individual`) or one organisation (`kind = organization`). Listings, trips, wallets, commission overrides, verification and reviews point to the host account.
- **Rejected**: (a) host fields on `user` (cannot represent organisations); (b) only organisations, with a "solo organisation" per individual (confusing for individuals, more rows, forces team concepts on solo hosts).
- **Consequences**: one wallet per host account; Karim's individual hosting and his agency have separate wallets and commission rates; the API carries an "active host account" header.

### ADR-002: Database-enforced availability, two mechanisms
- **Context**: double booking must be impossible (AVL-01, AVL-02); today it relies on single-threaded JavaScript.
- **Decision**: single units (homes, vehicles) use a `daterange` on `booking` with an **exclusion constraint**; pooled units (hotel room types, hostel beds, experience slots, trip departures) use **counter rows** (`room_type_night`, `experience_slot`, `trip_departure`) with `CHECK (held + booked <= total)` and an atomic conditional `UPDATE`.
- **Rejected**: (a) application locks only (lost under multiple servers); (b) one row per physical room for hotels (heavier; hosts do not assign rooms at booking time); (c) Redis counters (not transactional with the booking).
- **Consequences**: concurrent requests for the last unit: exactly one succeeds, the other gets `409 dates_unavailable`. Counter rows are created 18 months ahead by a job.

### ADR-003: One booking table with typed targets
- **Context**: bookings target a listing, a room type, an experience slot or a trip departure.
- **Decision**: `booking` has `inventory_kind` and four nullable target columns; a check constraint requires exactly the right ones. MVP: one room type per booking (multi-room bookings = several bookings in one checkout later).
- **Rejected**: generic foreign keys (no database integrity); one table per kind (four copies of the money and status columns).
- **Consequences**: every booking report reads one table.

### ADR-004: Trips are their own tables (DEC-006)
- **Decision**: `trip`, `trip_itinerary_day`, `trip_departure`. Trips share the `listing_status` enum and moderation flow but not the `listing` table.
- **Rejected**: listing subtype (admin today): itinerary and departures do not fit listing columns.
- **Consequences**: search runs on listings and trips separately; the website's guest "Trips" page should be renamed "My bookings" in the API (`/me/bookings`) to avoid the name clash (D-11).

### ADR-005: Verticals
- **Decision**: `vertical` = `home, hotel, hostel, experience, vehicle` (DEC-005 plus hostel split out because its unit is a bed). The search tab "Hotels" filters `hotel, hostel`; analytics group `home, hotel, hostel` as "stays".
- **Rejected**: hotel as a business category of home (spec): breaks search filters and analytics (D-12).

### ADR-006: Money in centimes with a double-entry ledger
- **Context**: DEC-001 (prepaid commission now, maybe collected payments later); research B.17 and A.5.
- **Decision**: `ledger_account`, `ledger_transaction`, `ledger_entry` (insert-only, sum to zero per transaction, enforced by a deferred trigger) and `account_balance` cache. Amounts in centimes.
- **Rejected**: single-sided wallet rows (both apps today: cannot prove that money balances); `DECIMAL` with django-money (repository archived 2026).
- **Consequences**: M2 to M4 only add accounts and transaction kinds; no schema rewrite. Corrections are reversing transactions.

### ADR-007: Snapshots on the booking
- **Decision**: prices, commission base, rate and amount, cancellation windows, listing title and address are copied onto the booking at creation (BR-BKG-07).
- **Rejected**: read live values (old bookings would change when hosts edit).
- **Consequences**: some duplication by design; editing a listing never alters a booking.

### ADR-008: Statuses as PostgreSQL enums with transition checks in services
- **Decision**: enum types for statuses; allowed transitions in service code with a `booking_event` row per change; the database rejects unknown values.
- **Rejected**: transition triggers in SQL (hard to test and translate errors); free text statuses (today's three conflicting sets).
- **Consequences**: adding a status is a migration (rare, deliberate).

### ADR-009: Listing revisions for edits under review
- **Decision**: edits to reviewed fields of a published listing go to `listing_revision` (JSON payload) while the live listing stays visible (BR-LST-02).
- **Rejected**: unpublishing on every edit (hosts lose bookings); no review of edits (fraud path: approved listing turned into a fake one).

### ADR-010: Versioned config as JSON validated by the app
- **Decision**: `platform_settings` and `onboarding_flow_version` store a validated JSON document per version; old versions stay readable.
- **Rejected**: one column per setting (migration per setting); key-value rows (no validation, no atomic versions).

### ADR-011: Search table, PostgreSQL only
- **Decision**: `listing_search_doc` holds one denormalised row per published listing, refreshed through the outbox; queries combine it with live availability (research B.7).
- **Rejected**: external search engine at launch.

### ADR-012: Audit as a hash-chained, insert-only table plus automatic row history
- **Decision**: `audit_event` (human "who did what") with `prev_hash`/`hash`, monthly partitions, no UPDATE/DELETE grant; django-pghistory tables for automatic row history of bookings, listings, memberships, settings (research B.11).
- **Rejected**: signal-based history only (misses bulk updates).

### ADR-013: Geography as reference tables with provenance
- **Decision**: `wilaya` (code PK 1 to 69), `daira`, `commune` with `source` and `valid_from`; listings store `commune_id`; the wilaya is derived. `legacy_code_58` keeps old data mappable.
- **Rejected**: free text city (today).

### ADR-014: Personal data minimisation in the schema
- **Decision**: document numbers stored only as HMAC hashes; payout account numbers encrypted with a key outside the database; exact listing location separate from public location; message `body_masked`.
- **Consequences**: support cannot read raw ID numbers from the database; a key management step exists in operations ([08-security-privacy.md](08-security-privacy.md), Phase 7).

---

## 4. The key tables in plain words

| Table | One sentence |
|---|---|
| `user` | A person; may be a guest, a host, an organisation member and staff at the same time. |
| `host_account` | "The one who hosts": either one person or one organisation. Owns listings, trips and a wallet. |
| `organization` / `membership` | An agency, hotel or hostel and who works in it with which role. |
| `listing` | Something to book: a home, hotel, hostel, experience or vehicle. |
| `room_type` | A kind of room or bed in a hotel or hostel, with a count of identical units. |
| `room_type_night` | For one room type and one night: how many units exist, are held, are booked. |
| `listing_day` | For a home or vehicle: a day the host blocked or priced differently. |
| `trip` / `trip_departure` | An agency trip and its dated departures with seats. |
| `booking` | One reservation with its frozen prices, commission and policy. |
| `booking_event` | Every status change of a booking, in order. |
| `ledger_*` | Money movements written as balanced entries; balances are sums. |
| `wallet_topup` | A host's deposit recorded by finance staff, with its receipt reference. |
| `review` | A rating and comment after a completed booking. |
| `conversation` / `message` | Message threads between guest and host. |
| `moderation_case` | One item in a staff queue (a host to verify, a listing to review, a report). |
| `audit_event` | A tamper-evident record of who did what. |
| `outbox_event` | A message to send after a change is saved (notification, email, search refresh). |

---

## 5. Booking lifecycle in the schema

1. Guest asks for a price: a `quote` row (30 minutes).
2. Guest books with an `Idempotency-Key`: `idempotency_record` locks the key.
3. In one transaction: insert `booking` (status `pending` or `confirmed`), reserve inventory (exclusion constraint or counter `UPDATE`), insert `booking_event`, and if confirmed post the commission `ledger_transaction` (2 entries) and update `account_balance`; insert `outbox_event` rows (notify host and guest, refresh search).
4. Commit. Workers send notifications from the outbox.
5. Jobs later: expire pending (`expired`, release counters), complete after check-out (`completed`), open review window.

---

## 6. Constraints the database enforces (SQL sketch)

These are written as SQL for clarity; they will become Django `Meta.constraints` or migration operations in the build phase.

```sql
-- Extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS btree_gist;   -- equality inside exclusion constraints
CREATE EXTENSION IF NOT EXISTS pg_trgm;      -- fuzzy text search
CREATE EXTENSION IF NOT EXISTS unaccent;

-- BR-AVL-01: no overlapping stays on a single unit
ALTER TABLE booking ADD CONSTRAINT booking_no_overlap
  EXCLUDE USING gist (listing_id WITH =, stay WITH &&)
  WHERE (inventory_kind = 'single'
         AND status IN ('awaiting_payment','pending','confirmed','completed','disputed'));

-- ADR-003: targets match the inventory kind
ALTER TABLE booking ADD CONSTRAINT booking_target_matches_kind CHECK (
  (inventory_kind = 'single'    AND listing_id IS NOT NULL AND room_type_id IS NULL AND experience_slot_id IS NULL AND trip_departure_id IS NULL) OR
  (inventory_kind = 'room_pool' AND listing_id IS NOT NULL AND room_type_id IS NOT NULL AND experience_slot_id IS NULL AND trip_departure_id IS NULL) OR
  (inventory_kind = 'slot'      AND listing_id IS NOT NULL AND experience_slot_id IS NOT NULL AND room_type_id IS NULL AND trip_departure_id IS NULL) OR
  (inventory_kind = 'departure' AND trip_departure_id IS NOT NULL AND listing_id IS NULL AND room_type_id IS NULL AND experience_slot_id IS NULL));

ALTER TABLE booking ADD CONSTRAINT booking_money_ok CHECK (
  subtotal_minor >= 0 AND discount_minor >= 0 AND cleaning_fee_minor >= 0 AND taxes_minor >= 0
  AND total_minor = subtotal_minor - discount_minor + cleaning_fee_minor + taxes_minor
  AND refund_due_minor BETWEEN 0 AND total_minor
  AND commission_rate_bp BETWEEN 0 AND 10000 AND commission_minor >= 0
  AND NOT isempty(stay) AND lower_inc(stay) AND NOT upper_inc(stay));

-- BR-AVL-02: pooled inventory never oversold
ALTER TABLE room_type_night ADD CONSTRAINT rtn_capacity
  CHECK (held >= 0 AND booked >= 0 AND total >= 0 AND held + booked <= total);
ALTER TABLE trip_departure ADD CONSTRAINT dep_capacity
  CHECK (seats_held >= 0 AND seats_booked >= 0 AND seats_held + seats_booked <= seats_total AND ends_on >= starts_on);
ALTER TABLE experience_slot ADD CONSTRAINT slot_capacity
  CHECK (seats_held >= 0 AND seats_booked >= 0 AND seats_held + seats_booked <= seats_total AND ends_at > starts_at);

-- Reserving 2 rooms for nights [2026-12-10, 2026-12-13): one statement, all nights or nothing
UPDATE room_type_night SET booked = booked + 2
 WHERE room_type_id = :rt AND night >= '2026-12-10' AND night < '2026-12-13'
   AND held + booked + 2 <= total;
-- the service checks that the updated row count = number of nights, else rolls back (409)

-- ADR-001: host account is exactly one of user or organisation
ALTER TABLE host_account ADD CONSTRAINT host_account_one_owner CHECK (
  (kind = 'individual'   AND user_id IS NOT NULL AND organization_id IS NULL) OR
  (kind = 'organization' AND organization_id IS NOT NULL AND user_id IS NULL));

-- BR-ORG-04: exactly one active owner
CREATE UNIQUE INDEX membership_one_owner ON membership (organization_id)
  WHERE role = 'owner' AND is_active;
CREATE UNIQUE INDEX membership_active_unique ON membership (organization_id, user_id) WHERE is_active;

-- BR-ACC-01
CREATE UNIQUE INDEX user_email_ci ON "user" (lower(email)) WHERE email IS NOT NULL;
CREATE UNIQUE INDEX user_phone ON "user" (phone_e164) WHERE phone_e164 IS NOT NULL;

-- BR-PAY-02: balanced, insert-only ledger
CREATE FUNCTION ledger_tx_balanced() RETURNS trigger AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM ledger_entry WHERE transaction_id = NEW.transaction_id
             GROUP BY currency HAVING sum(amount_minor) <> 0) THEN
    RAISE EXCEPTION 'ledger transaction % is not balanced', NEW.transaction_id;
  END IF;
  RETURN NULL;
END $$ LANGUAGE plpgsql;
CREATE CONSTRAINT TRIGGER ledger_entry_balanced AFTER INSERT ON ledger_entry
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ledger_tx_balanced();
ALTER TABLE ledger_entry ADD CONSTRAINT ledger_entry_nonzero CHECK (amount_minor <> 0);
REVOKE UPDATE, DELETE ON ledger_entry, ledger_transaction, audit_event, booking_event FROM bladus_app;

-- BR-PAY-04: commission posted once per booking
CREATE UNIQUE INDEX ledger_one_commission ON ledger_transaction (booking_id) WHERE kind = 'commission';

-- BR-LST-02, BR-CFG-02, BR-MOD: one open item at a time
CREATE UNIQUE INDEX listing_one_pending_revision ON listing_revision (listing_id) WHERE status = 'pending_review';
CREATE UNIQUE INDEX flow_one_draft ON onboarding_flow_version (host_type) WHERE status = 'draft';
CREATE UNIQUE INDEX flow_one_published ON onboarding_flow_version (host_type) WHERE status = 'published';
CREATE UNIQUE INDEX case_one_open ON moderation_case (kind, subject_id) WHERE status <> 'resolved';
CREATE UNIQUE INDEX settings_one_current ON platform_settings (is_current) WHERE is_current;
```

Other checks (listed in each table's note in the dictionary): ratings 1 to 5, discounts 0 to 9,000 bp, `min_nights <= max_nights`, `listing.inventory_kind` consistent with `vertical`, favourites and photos pointing to exactly one parent.

---

## 7. Indexes and query plan for the busiest queries

Targets from NFR-01 and NFR-02. "Plan" is the expected PostgreSQL strategy; it will be confirmed with `EXPLAIN ANALYZE` on seeded data (20,000 listings, 1 million booking rows) in the build phase.

| # | Query | Frequency | Indexes | Expected plan | Target p95 |
|---|---|---|---|---|---|
| Q1 | Search: vertical + wilaya + guests + price + amenities + map box, page of 24 | very high | `listing_search_doc`: B-tree `(vertical, wilaya_code, price_from_minor)`, GiST `location_public`, GIN `amenity_ids` | Bitmap AND of B-tree and GIN, GiST for map box; then availability anti-join (Q2) on at most a few hundred candidates | 500 ms |
| Q2 | Availability for candidates and dates | very high | `booking` GiST from the exclusion constraint `(listing_id, stay)`; `room_type_night` PK `(room_type_id, night)`; `listing_day` PK | `NOT EXISTS` probe on the exclusion index per candidate; range scan on night PK for pools | inside Q1 |
| Q3 | Listing detail + calendar 90 days | high | PKs; `room_type (listing_id)`; `listing_photo (listing_id, sort_order)` | index scans | 150 ms |
| Q4 | Create booking (transaction) | medium | constraint indexes, `idempotency_record` unique | row locks on counters only | 600 ms |
| Q5 | Host bookings list by host account + status + dates | high | `booking (host_account_id, status, check_in_at)` | index range scan | 200 ms |
| Q6 | Guest bookings | high | `booking (guest_id, created_at DESC)` | index scan | 150 ms |
| Q7 | Message sync since cursor | very high (polling) | `message (conversation_id, id)`; `conversation_participant (user_id)` | index range `id > cursor` | 100 ms |
| Q8 | Unread notifications | very high | `notification (user_id, read_at, id)` | index only | 50 ms |
| Q9 | Moderation queue by kind, oldest first | medium | `moderation_case (status, kind, submitted_at)` | index scan | 200 ms |
| Q10 | Wallet balance and last entries | medium | `account_balance` PK; `ledger_entry (account_id, id DESC)` | PK + index scan | 100 ms |
| Q11 | Expire pending requests (job, every 5 min) | job | partial `booking (request_expires_at) WHERE status = 'pending'` | index range | 1 s |
| Q12 | Complete stays (job) | job | partial `booking (check_out_at) WHERE status = 'confirmed'` | index range | 1 s |
| Q13 | Outbox dispatch | constant | `outbox_event (status, next_attempt_at)` with `FOR UPDATE SKIP LOCKED` | index range | 50 ms |
| Q14 | Admin lists with facets (listings, hosts, bookings) | medium | B-tree on filter columns; counts via `GROUP BY` on the filtered set | bitmap scans | 400 ms |
| Q15 | Commune autocomplete | high | GIN trigram on `unaccent(name_fr)`, `name_ar` | GIN | 50 ms |
| Q16 | Audit by object | low | `audit_event (object_type, object_id, occurred_at)` on monthly partitions | partition pruning | 300 ms |

Growth estimate for capacity planning (first two years, assumption): 20,000 listings, 500,000 bookings, 5 million `room_type_night` rows (18 months x 10,000 room types x ~30 nights per month), 10 million messages, 20 million ledger entries. All fit comfortably on one PostgreSQL primary with 8 vCPU / 32 GB; partition `audit_event` and `message` by month when they pass 50 million rows.

---

## 8. Mapping today's data to the new schema

### 8.1 Entities

| Website (frontend) | Admin | New table(s) | Notes |
|---|---|---|---|
| `User` (role, hostType, organizationId) | `GuestUser`, `Host` (separate) | `user` + `host_account(kind=individual)` + `membership` | admin `Host` of type individual becomes a host account of its owner user |
| `Organization` (businessCategory) | `Host` with hostType agency/hotel/hostel + metadata | `organization` + `host_account(kind=organization)` | admin `agencyMetadata`, `hotelMetadata`, `hostelMetadata` become columns or `policies` |
| `Membership` | `OrganizationMember` (unused) | `membership` | |
| `Listing` (+ vehicle, experience fields) | `Listing` | `listing` + `vehicle_detail` / `experience_detail` | `instantBook` and `bookingApprovalMode` merge into `approval_mode` (D-6) |
| `RoomType` | `RoomType` | `room_type` | `totalInventory` becomes `unit_count`; `availableInventory` dropped (computed) |
| `Trip` (departureDates[]) | `Listing` with category trip | `trip`, `trip_itinerary_day`, `trip_departure` | each date string becomes a departure with `seats_total = maxGroupSize` |
| `Reservation` | `Booking` | `booking` + `booking_event` | ids re-generated; old ids kept in a migration map |
| `DateAvailabilityOverride` | none | `listing_day` or `room_type_night` | |
| `Wallet`, `Transaction` (prepaid) | `HostWallet`, `WalletTransaction` | `ledger_*`, `account_balance`, `wallet_topup` | each old transaction becomes a balanced transaction against `platform_cash` or `commission_revenue` |
| none | `PayoutRequest` | `payout` (dormant) | M1 has no payouts |
| `Review` (5 sub-ratings) | `ReviewItem` (status, flags, reply) | `review`, `review_reply`, `review_report` | |
| `Conversation`, `Message` | mocked | `conversation`, `conversation_participant`, `message` | |
| `Notification` | mocked | `notification` | |
| `Coupon` | `PromotionCoupon` | `coupon` | |
| amenities (keys), categories (keys) | names {en,fr,ar}, free strings | `amenity`, `category`, `property_type` | free strings mapped by a lookup table |
| onboarding config in code / localStorage | `OnboardingConfig` | `onboarding_flow_version` (v1 per host type from the website's 12/5/7/7 steps) | |
| none | `AuditEntry` | `audit_event` | |
| none | `PlatformSettings` | `platform_settings` | |

### 8.2 Enum mapping

| Concept | Website value | Admin value | New value |
|---|---|---|---|
| Listing status | active | approved, published (legacy) | published |
| | pending | pending_review, pending (legacy) | pending_review |
| | draft | draft | draft |
| | suspended | suspended | suspended (staff) or paused (host) |
| | n/a | changes_requested, rejected, refused (legacy), archived, deleted | same names (refused becomes rejected) |
| Booking status | pending, confirmed, cancelled, completed, declined, expired | pending, confirmed, cancelled, completed, disputed | same names |
| | n/a | refunded | booking stays in its status; `payment_status` and `refund_due_minor` carry the refund |
| Payment status | paid, pending, refunded, partially_refunded, voided | paid, partially_refunded, refunded, pending, failed | M1: `not_collected` for all demo bookings (the "paid" labels were never true, O7) |
| Transaction type | recharge | wallet_recharge | `wallet_topup` |
| | commission_deduction | commission_deduction | `commission` |
| | adjustment (reversal) | booking_refund (host share) | `commission_reversal` |
| | payout | host_payout | `payout` (dormant) |
| | n/a | booking_payment | `guest_payment` (dormant) |
| Onboarding field type | multi-select, image-upload, toggle | multiselect, file, boolean, radio | multi_select, image_upload / file_upload, toggle, select (radio becomes select with a display hint) |
| Wilaya code | number 1 to 58 | string "01" to "68" | smallint 1 to 69 via `legacy_code_58` and a name match |

### 8.3 Data that is not migrated

The apps run on demo data only. Nothing real is migrated: the demo seeds are re-created by the seed plan below. The mapping above is still needed so the two apps' screens can switch to the API without surprises.

---

## 9. Seed plan

| Order | Data | Source | Size |
|---|---|---|---|
| 1 | Extensions, enums | migrations | |
| 2 | `wilaya`, `daira`, `commune` | el-amin-dev/algeria-wilayas-communes (CC0) names + ihahachi/Algeria-Cities (MIT) coordinates; keep `source` | 69 / ~591 / 1,541 |
| 3 | `staff_permission`, `staff_role_permission` | admin `lib/permissions.ts` matrix | 34 permissions x 5 roles |
| 4 | `amenity`, `category`, `property_type` | merge of the three vocabularies, translated | ~80 / ~20 / ~25 |
| 5 | `cancellation_policy` v1 | BR-CAN-01 | 3 |
| 6 | `reason_code` | admin reasons + new catalogue | ~60 |
| 7 | `platform_settings` v1 | defaults: 1,200 / 1,500 / 1,800 / 1,000 bp; request TTL 24; credit limit 20,000 DZD | 1 |
| 8 | `onboarding_flow_version` v1 per host type | website `lib/onboarding-config.ts` converted to canonical types | 4 |
| 9 | Demo fixtures (dev and staging only) | website demo users (Yacine, Amina, Karim...), admin staff (Nadia...), 18 listings, 4 trips, reservations, wallets | factory_boy factories; never in production |
| 10 | `room_type_night` rows | job generating 18 months ahead | computed |

Production seeds are only steps 1 to 8. Demo passwords exist only in dev fixtures, never in the website bundle (fixes the current leak).

---

## Additions on 2026-11-09

- `experience_type` and `trip_type` enums with `listing.experience_type` and `trip.trip_type` (DEC-015, BR-LST-05).
- Host offer rule (DEC-014, BR-HST-05) documented on `listing`: a trigger checks the vertical against the host account kind and organisation category.
- `incident_record` (breach register and 5-day clock, PRV-05), `calendar_feed` (iCal, AVL-06), `otp_send_log` (one-time code sends, ACC-02). These closed decision T5.
- [schema.sql](schema.sql): the PostgreSQL rendering of `schema.dbml` produced by the official DBML tool.

## Check yourself

- [ ] What does `host_account` replace, and which disagreement does it solve?
- [ ] Two guests click "Reserve" on the last hotel room at the same second. Which constraint decides, and what does the loser see?
- [ ] Why does the ledger refuse `UPDATE`? How is a mistake corrected?
- [ ] Which tables are dormant until the money model changes?
- [ ] Which index makes message polling cheap?
- [ ] Map the admin status `refunded` to the new model.
