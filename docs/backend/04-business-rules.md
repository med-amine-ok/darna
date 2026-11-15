# 04. Business rules

> **In plain words**
> A business rule is a sentence like "a guest cannot book nights that are already booked" or "BLADUS takes 12% from an individual host".
> Each rule has an ID (`BR-PAY-04`), says **where** it is enforced (the database, the backend code, or a scheduled job) and how to test it.
> Rules enforced by the database are the strongest: even a bug in the code cannot break them.
> The statuses each object can have, and the allowed moves between them, are written as tables (state machines).
> Money examples are worked out in full so anyone can check the arithmetic.

**Terms used here** (see [glossary.md](glossary.md)):
- **Enforced by DB**: a constraint inside PostgreSQL (unique, check, exclusion, foreign key). Cannot be bypassed.
- **Enforced by service**: a check in the Django service function that performs the action, inside a database transaction.
- **Enforced by job**: a scheduled background task (Celery) that applies the rule at a given time.
- **Basis points (bp)**: hundredths of a percent. 12% = 1,200 bp. Used to store rates without decimals.
- **Half-open range** `[a, b)`: includes `a`, excludes `b`.

Sources: website code ([Appendix A section 4](_work/frontend-inventory.md)), admin code ([Appendix B section 4](_work/admin-inventory.md)), decisions DEC-001 to DEC-031 ([03-requirements.md](03-requirements.md) section 2, [13-decisions-needed.md](13-decisions-needed.md) section 1). "Today" says what the apps do now.

**Rule ids used in the backend code.** The backend code written in parallel (2026-11-13) used some rule ids that already mean something else in this plan. Plan ids are kept stable; read the code ids through this table until the code tests are renamed:

| Id in code and tests | Meaning in code | Plan rule | What that id means in the plan |
|---|---|---|---|
| BR-CAN-05 | Refund debt with a deadline; overdue blocks the host | BR-CAN-06, BR-CAN-07 | Disputes (R2) |
| BR-PAY-11 | Manual adjustments (two admins, 1,000,000 DZD cap) | BR-PAY-13 | Payment models M2 to M4 switched off |
| BR-PAY-12 | Nightly `reconcile_balances` | BR-PAY-15 | Commission invoices (R2) |
| BR-SYS-04 | Transactional outbox with retries | BR-SYS-03 | Stable error codes in three languages |
| BR-HST-06 | Hotel sync never below sold, inventory conflicts | BR-HST-07 (clamp); BR-HST-06 is the hotel connection itself | Hotel system connection |
| BR-BKG-08, BR-BKG-09, BR-PAY-05 | Same as the plan | same ids | same |

**Review of 2026-11-13.** An external review changed several rules (DEC-018 revised, DEC-020 to DEC-031). Changed or new rules: BR-ACC-02, BR-AVL-01, BR-AVL-02, BR-AVL-07, BR-HST-06, BR-HST-07, BR-BKG-01, BR-BKG-03, BR-BKG-08, BR-BKG-09, BR-CAN-03, BR-CAN-04, BR-CAN-06, BR-CAN-07, BR-PAY-01, BR-PAY-02, BR-PAY-05, BR-PAY-07, BR-PAY-08, BR-PAY-13 to BR-PAY-15, BR-REV-01, BR-SRC-05, BR-STF-02, BR-SYS-01, BR-SYS-03, BR-SYS-06, BR-SYS-07.

---

## 1. Accounts (ACC)

| ID | Rule | Enforced by | Today | Test |
|---|---|---|---|---|
| BR-ACC-01 | Email is unique case-insensitively; phone is unique in E.164 form and must match `^\+213[5-7]\d{8}$` for Algerian mobiles (foreign numbers allowed for diaspora, flagged). A guest must have a verified phone before the first booking (DEC-012). | DB unique on `lower(email)` and `phone_e164`; service | email only | sign up twice with `A@x.dz` / `a@x.dz` fails |
| BR-ACC-02 | One-time codes: 6 digits, valid 10 minutes, 5 wrong attempts invalidate the code. Send limits (DEC-025): per destination (phone or email) 3 per hour and 10 per day; per IP 10 per hour; a global SMS budget of 5,000 per day (setting `sms_daily_budget`), after which SMS sends answer `sms_budget_exceeded` and the admins are alerted. Codes are stored only as an HMAC (BR-SYS-07). Every failure returns the same error. | service + Redis + `otp_send_log` | none | 6th attempt with right code fails; 4th SMS to the same phone in one hour refused |
| BR-ACC-03 | Sessions: website session 30 days sliding; staff session 8 hours absolute and 30 minutes idle (setting). Logout, password change and deactivation revoke server-side immediately. | service | admin token not revocable | token rejected right after logout |
| BR-ACC-04 | Staff must have two-factor enabled before any admin endpoint works. Hosts must have it before changing payout or refund account details. | service (permission class) | flag only | staff without MFA gets 403 `mfa_required` |
| BR-ACC-05 | Login lock: 5 failures in 15 minutes lock 60 seconds, counted per account and per IP, shared by all servers. | Redis | in-process | two servers share the counter |

## 2. Organisations (ORG)

| ID | Rule | Enforced by | Today | Test |
|---|---|---|---|---|
| BR-ORG-01 | A **host account** is either a user (individual host) or an organisation. One user can be an individual host and a member of several organisations (DEC-004). Each host request names the active host account and the user must hold it. | service + permission | single hostType | request with someone else's org id gets 404 |
| BR-ORG-02 | Organisation `business_category` is `agency`, `hotel` or `hostel` and never changes after creation. | DB check + service | same | update category refused |
| BR-ORG-03 | An invitation is for one email or phone, one role, expires after 7 days, can be accepted once by a signed-in user whose verified email or phone matches. | DB unique (org, invitee, pending) + service | not acceptable | accept twice fails |
| BR-ORG-04 | Exactly one active `owner` per organisation. Only the owner can transfer ownership, which demotes them to `admin`. The owner cannot be removed. | DB partial unique index `(org) WHERE role='owner' AND active` + service | built | two owners impossible |
| BR-ORG-05 | Organisation role permissions: see table 2a. Agents and guides never see money. | service (django-rules) | any member does anything | agent accept request gets 403 |
| BR-ORG-06 | Changing legal name, RC, NIF, NIS or tourism licence number sets verification back to `pending` and creates a moderation case. Listings stay published meanwhile. | service | field list exists | change NIF, status becomes pending |

**Table 2a: organisation permissions**

| Permission | owner | admin | manager | agent | guide |
|---|---|---|---|---|---|
| org.edit, org.delete, members.manage | X | X (no delete, no ownership) | | | |
| listings.manage, trips.manage, calendar.manage | X | X | X | | |
| bookings.view | X | X | X | X | X (own departures) |
| bookings.respond (accept, decline) DEC-009 | X | X | X | | |
| bookings.cancel_as_host | X | X | | | |
| messages.reply | X | X | X | X | X |
| wallet.view, invoices.view | X | X | | | |
| payout_details.edit | X | | | | |

## 3. Becoming a host (HST)

| ID | Rule | Enforced by | Today | Test |
|---|---|---|---|---|
| BR-HST-01 | Onboarding steps come from the published config for the host type: individual 12, agency 5, hotel 7, hostel 7 (DEC-007). Every flow contains the approval-mode step. | service (config) | hardcoded; agency missing step | agency draft without approval mode cannot submit |
| BR-HST-02 | A draft records the config version it started from. Submitted answers are validated against that version; custom answers are stored as JSON keyed by field id. | service | browser storage | answer with unknown field id rejected |
| BR-HST-03 | Required documents per host type (table 3a). A host is approved only when every required document is `approved`. Each document is reviewed on its own. | service | whole host approved | approve with a pending document fails |
| BR-HST-05 | What each host account may publish (DEC-014): individual: home, vehicle; agency: experience, trip; hotel and hostel: their property (hotel or hostel vertical with room types). Checked when creating or changing the vertical of a listing and when creating a trip. | service + DB trigger | built in website | individual creating an experience gets 403 `host_offer_not_allowed` |
| BR-HST-06 | Hotel system connection (DEC-017): a hotel or hostel may connect its own system (channel manager, PMS, iCal feed or CSV file). Room types, availability per night, prices and services are imported and refreshed on a schedule; imported fields are read-only on BLADUS while the connection is active; a failed sync never deletes data, it flags the connection. Hotels without a system type the same data by hand. The hotel system address (`base_url`, iCal link) must pass the outgoing URL check (BR-SYS-06). | job + service | none | sync failure keeps last good data |
| BR-HST-07 | Hotel sync never oversells (DEC-021). A sync can never set a room-night `total` below `held + booked`: the total is clamped to `held + booked` and an `inventory_conflict` row is opened for the admin (resolve: accept the clamp, or cancel or move the BLADUS booking with the guest). Every BLADUS booking change (create, accept, cancel, expire) on a room-pool listing of a connected hotel writes an outbox message `inventory.push` in the same transaction, sent at once (not only every 15 minutes) with the outbox retries (BR-SYS-03); a message that reaches `dead` shows in the admin outbox queue. The 15-minute pull stays as a reconciliation pass. | DB check + job + service | none | sync with total 2 while 3 rooms booked: total stays 3, conflict opened |
| BR-HST-04 | Host verification state machine: table 3b. Reasons of at least 10 characters for reject, request changes, suspend, ban. | service | admin only | approved to applied refused |

**Table 3a: required documents (proposal, VERIFY WITH A PROFESSIONAL)**

| Host type | Required | Optional |
|---|---|---|
| Individual | National ID or passport, proof of ownership or lease with owner's permission | APC declaration ("chez l'habitant"), insurance, auto-entrepreneur card |
| Agency | Representative ID, RC, NIF, NIS, Ministry of Tourism licence | |
| Hotel | Manager ID, RC, NIF, NIS, classification decision or operating authorisation | |
| Hostel | Manager ID, RC or association status, operating authorisation | |
| Vehicle rental (agency) | Representative ID, RC with rental activity, NIF, NIS; per vehicle: carte grise, insurance, contrôle technique | |

**Table 3b: host (user or organisation) verification states**

| From | Allowed next | Who |
|---|---|---|
| applied | under_review | host submits |
| under_review | approved, changes_requested, rejected | staff |
| changes_requested | under_review (resubmit) or rejected | host / staff |
| approved | under_review (legal change, BR-ORG-06), suspended | system / staff |
| rejected | applied (after 30 days) | host |
| suspended | approved (unsuspend) | staff |
| any of the above | banned | staff with `hosts.ban` |
| banned | (final) | |

Soft delete is separate: any state can be soft-deleted by a super admin and restored to the previous state.

## 4. Listings and trips (LST, TRP)

| ID | Rule | Enforced by | Today | Test |
|---|---|---|---|---|
| BR-LST-01 | A listing belongs to exactly one host account. It has one vertical: `home`, `hotel`, `hostel`, `experience`, `vehicle` (trips are separate, DEC-006). Hotels and hostels must have at least one room type to be submitted. | DB FK + service | built | hotel without room type cannot submit |
| BR-LST-02 | Publishing needs staff approval (DEC-003). Editing title, description, photos, location, vertical, capacity or room types of a published listing creates a revision that goes to review while the published version stays visible. Price, calendar and rules changes do not need review. | service | live at once | edit title, public page unchanged until approved |
| BR-LST-03 | Listing state machine: table 4a. Only published listings appear in search or accept bookings. Paused, suspended and archived listings keep existing bookings. | service + DB check on enum | two sets | booking on paused listing refused |
| BR-LST-04 | Amenities, property types and categories are reference rows. A reference row in use cannot be hard-deleted; it is deactivated. | DB FK `ON DELETE RESTRICT` | free text | delete used amenity fails |
| BR-LST-05 | Experience and trip types come from one fixed list each (DEC-015): 8 experience types and 8 trip types with en/fr/ar labels. An experience listing must have exactly one experience type; a trip exactly one trip type. Changing the lists is a product change made in one place (backend enum, served to both apps). | DB enum + check + service | built in both apps (shared list file) | experience without type refused |
| BR-TRP-01 | Only an organisation with `business_category = agency` and verification `approved` can create trips. | service | built | hotel creates trip, 403 |
| BR-TRP-02 | A departure has `seats_total`; held + booked seats never exceed it. Price is per person and snapshot on the booking. | DB check on departure counters | per date by maxGroupSize | concurrent last-seat bookings: one wins |
| BR-TRP-03 | Cancelling a departure cancels every booking on it with a full refund obligation and commission reversal, and notifies guests. | service | missing | all bookings cancelled |

**Table 4a: listing states** (same for trips)

| From | Allowed next | Who |
|---|---|---|
| draft | pending_review, deleted | host |
| pending_review | published, changes_requested, rejected (staff); draft (host withdraws) | |
| changes_requested | pending_review | host |
| published | paused, archived (host); suspended, changes_requested (staff) | |
| paused | published (host, no review unless key fields changed) | |
| rejected | draft | host |
| suspended | published, rejected | staff |
| archived | draft | host |
| any except deleted | deleted (soft); staff restore to previous state | |

## 5. Availability (AVL)

| ID | Rule | Enforced by | Today | Test |
|---|---|---|---|---|
| BR-AVL-01 | For a single unit (home, vehicle), two bookings in a blocking state (`pending`, `confirmed`, `completed`, `disputed`) cannot have overlapping half-open ranges. Back-to-back is allowed (check-out day = next check-in). The service also locks the listing row (`SELECT ... FOR UPDATE`) before checking, so blocked days and bookings are checked in order. | **DB exclusion constraint** `(listing_id WITH =, stay WITH &&) WHERE inventory_kind = 'single' AND status IN (...)` + service lock on the listing row | app check | 50 parallel requests for the same nights: exactly 1 succeeds |
| BR-AVL-02 | For pooled units (room types, hostel beds, experience slots, trip departures), each night or slot has `total`, `held`, `booked`, with `held + booked <= total` and all values `>= 0`. Reserving is one conditional `UPDATE ... WHERE held + booked + n <= total`. There is **no exclusion constraint** on pools: the counters and their CHECK are the guarantee. | **DB CHECK on counters** + one conditional UPDATE | in process | inventory never negative |
| BR-AVL-03 | A hostel bed room type books one unit per guest; a hotel room type books one unit per room requested. Capacity per unit limits guests per unit. | service | built | 3 guests in a dorm use 3 units |
| BR-AVL-04 | A night is unavailable if blocked by the host, booked, outside the listing's availability window, inside the advance notice period, or the listing is not published. Blocks may be per listing or per room type. | service + DB | per listing only | blocked night not bookable |
| BR-AVL-05 | Search keeps a listing whose availability overlaps the searched dates and returns the largest free sub-range; booking is allowed only on fully free nights with stay length between min and max nights (defaults 1 and 90). | service | built | partial match shows sub-range |
| BR-AVL-06 | A hold lasts 15 minutes. Expired holds are released by a job every minute and ignored on read. | job + service | none | hold released after 15 min |
| BR-AVL-07 | Blocked days and bookings never clash on a single-unit listing (DEC-020). Two PostgreSQL triggers: (a) on `listing_day`, refuse setting `is_blocked = true` on a day covered by a booking in a blocking status; (b) on `booking`, refuse inserting a single-unit booking in a blocking status, or moving one into a blocking status or new dates, when a day of its range is blocked. The services apply the same rule first, with clear errors: `inventory.set_days_blocked` answers `dates_booked`, booking creation answers `dates_unavailable`. Both run after the lock on the listing row, so they are serialized. | **DB triggers** + service + listing row lock | none | block a booked day: refused; book a blocked day: refused, also with two parallel requests |

**What the database really guarantees against double booking** (DEC-020, corrects the earlier claim that "the database refuses every overlap"):

| Inventory | Guarantee in PostgreSQL | Also in the service |
|---|---|---|
| Single unit (home, vehicle) | Exclusion constraint on `booking` (daterange overlap, blocking statuses) | Lock on the listing row |
| Room pool (hotel rooms, hostel beds) | CHECK `held + booked <= total`, never negative, on `room_type_night`; one conditional UPDATE | Hotel sync clamp (BR-HST-07) |
| Experience slot, trip departure | CHECK on the seat counters; one conditional UPDATE | none needed |
| Blocked days (`listing_day.is_blocked`) | Triggers (a) and (b) of BR-AVL-07 | Same rule with `dates_booked` / `dates_unavailable`, after the listing row lock |

There is no exclusion constraint on pools, slots or departures, and none between bookings and blocked days: those cases rely on the counters and on the triggers above.

## 6. Pricing (PRC)

| ID | Rule | Enforced by | Today | Test |
|---|---|---|---|---|
| BR-PRC-01 | The server computes every price. A quote lists per-night prices (base or day override), length-of-stay discount, subtotal, cleaning fee, taxes, total. A quote expires after 30 minutes and is re-validated at booking; if anything changed the guest sees the new price. | service | client and server both | tampered price ignored |
| BR-PRC-02 | Guests pay no BLADUS fee. Guest total = subtotal + cleaning fee + taxes. | service | built | quote has no fee line |
| BR-PRC-03 | Discount: weekly (7+ nights) and monthly (28+ nights) percentages set by the host, 0 to 90%; only the larger applies; applied to the subtotal before commission. | service + DB check | display only | 30 nights uses monthly only |
| BR-PRC-04 | Taxes (R2): taxe de séjour per person per night by star rating from settings; VAT shown only if the host is VAT-registered. Rates live in settings with validity dates. VERIFY WITH A PROFESSIONAL. | service | free number | rate change does not alter old quotes |

## 7. Bookings (BKG)

| ID | Rule | Enforced by | Today | Test |
|---|---|---|---|---|
| BR-BKG-01 | Instant booking confirms immediately if the listing resolves to instant mode, the guest has a verified phone, the dates are free, the host's wallet is above its credit floor (BR-PAY-10) and the host has no overdue refund (BR-CAN-07). Otherwise it becomes a request. Order inside the transaction (BR-PAY-14): lock the host wallet balance row, check the floor, take the stock, post the commission. | service | confirmed at once | host below floor or with an overdue refund: becomes pending |
| BR-BKG-02 | Approval mode resolution: if the platform switch forces request mode, request; else the listing's own mode if set; else the host account default; else `request`. | service | listing only | org default applied to new listing |
| BR-BKG-03 | A request blocks the dates (BR-AVL-01) until accepted, declined, cancelled or expired. Only users with `bookings.respond` may accept or decline. Decline needs a reason code. Accept is refused below the credit floor (`wallet_below_floor`) and while the host has an overdue refund (`refund_overdue`, BR-CAN-07); it uses the same lock order as BR-BKG-01. | service + DB | any member | agent cannot accept; host with an overdue refund gets 409 `refund_overdue` |
| BR-BKG-04 | A pending request expires `request_ttl_hours` (default 24, DEC-008) after creation, or at check-in time if sooner. A job runs every 5 minutes. | job | lazy | expired after 24 h without any read |
| BR-BKG-05 | A confirmed booking becomes completed at check-out time + 2 hours (Africa/Algiers) by a job; this opens the review window and counts host earnings (DEC-010). | job | lazy | completion without page view |
| BR-BKG-06 | Booking state machine: table 7a. Payment state is a separate field (M1: `not_collected`). | DB enum + service | two sets | confirmed to pending refused |
| BR-BKG-07 | At creation the booking stores a snapshot: price lines, nights, guests, cancellation policy windows, commission rate (bp) and base, listing title, host account, address (revealed to the guest only once confirmed). Later edits to the listing never change it. | service | partial | listing price change keeps booking total |
| BR-BKG-08 | Open booking limits per guest (DEC-028): at most 3 `pending` requests (setting `max_pending_requests_per_guest`) and 6 upcoming bookings (`pending` + `confirmed` with check-out in the future, setting `max_upcoming_bookings_per_guest`) at a time. Over the limit: 409 `too_many_open_bookings`. | service | none | 4th pending request refused |
| BR-BKG-09 | Stay confirmation (DEC-028). When a booking is confirmed it gets a 6-digit `check_in_code`, shown only to the guest. The host enters it on arrival (`POST host/bookings/{id}/confirm-stay`), or the guest confirms after check-in time (`POST me/bookings/{id}/confirm-stay`); this sets `stay_confirmed_at` and `stay_confirmed_via` (`host_code` or `guest`). 5 wrong codes lock host entry for that booking for 1 hour. Errors: wrong code 400 `invalid_code`; guest before check-in time 409 `stay_not_started`; booking not confirmed 409 `booking_not_confirmed`. Auto-completion (BR-BKG-05) still completes the booking without it, but then no review is possible (BR-REV-01). | service | none | wrong code refused; review refused without confirmation |

**Table 7a: booking states**

| From | To | Trigger |
|---|---|---|
| (new) | pending | request mode |
| (new) | confirmed | instant mode (BR-BKG-01) |
| pending | confirmed | host accepts |
| pending | declined | host declines |
| pending | expired | job (BR-BKG-04) |
| pending | cancelled | guest withdraws |
| confirmed | cancelled | guest, host or staff cancels (section 8) |
| confirmed | completed | job (BR-BKG-05) |
| confirmed, completed | disputed | guest or host opens a dispute (R2), until 14 days after check-out |
| disputed | completed or cancelled | support resolves |

Final states: declined, expired, cancelled, completed (once the dispute window has passed).

## 8. Cancellations and refunds (CAN)

Under DEC-001 the guest paid the host directly, so a "refund" is an amount the **host owes the guest**. BLADUS records it, shows it to both sides, and adjusts its commission. When BLADUS collects payments later (M2 to M4), the same amounts drive real refunds.

| ID | Rule | Enforced by | Today | Test |
|---|---|---|---|---|
| BR-CAN-01 | Policy templates (DEC-011); "days before" = calendar days in Algeria between today and check-in: **flexible** 100% if 1+ days before, 50% on arrival day; **moderate** 100% if 5+ days, 50% from 4 to 1 day, 0% on arrival day; **strict** 100% if 14+ days, 50% from 13 to 7, 0% within 6 days. Percentages apply to the accommodation subtotal; cleaning fee and its taxes are always refunded before check-in. Guests cannot cancel after check-in time on arrival day (support can). | service (pure function, property tests) | built (same values) | table-driven tests per day |
| BR-CAN-02 | Guest cancellation: refund = policy % x subtotal + cleaning fee + matching taxes. | service | built | example 8a |
| BR-CAN-03 | Host cancellation of a confirmed booking: full total owed back to the guest, full commission returned to the host (BR-PAY-05), host cancellation counter +1; 3 in 12 months open a moderation case. | service | partly | example 8a |
| BR-CAN-04 | Admin cancellation or refund with amount R: R between 1 centime and (total minus already refunded); partial refunds add up; reason required; audited. Commission returned (BR-PAY-05): refund_of_base = clamp(R - cleaning fee - taxes, 0, base); returned = round_half_up(commission x refund_of_base / base). R = total gives the full commission back. | DB check `refund_due_minor <= total_minor` + service | admin built | over-refund refused; R = cleaning fee only returns 0 commission |
| BR-CAN-05 | Disputes (R2): opened until 14 days after check-out by guest or host; resolution `refund_full`, `refund_partial` or `declined`; resolution note required. | service | admin only | dispute after 15 days refused |
| BR-CAN-06 | Host refunds are tracked as a debt (DEC-024). Any cancellation with refund due > 0 opens a `refund_obligation` (booking, host account, guest, amount, `due_at` = cancelled_at + `refund_due_days`, default 7 days) with status `open`. Ledger memo: transaction `refund_due` (Dr `host_refund_payable:<host>`, Cr `guest_refund_clearing`). The host declares it paid with a reference (`declared`); the guest confirms (`settled`, ledger `refund_settled`, the reverse posting) or disputes (`disputed`, then back to `open` for a new declaration); the admin can settle with proof. One obligation per refund line. | service + DB unique `(refund_id)` | none | guest confirms: status settled and memo balance 0 |
| BR-CAN-07 | Overdue refund: status `open` or `disputed` and `due_at` passed. While a host account has an overdue refund, instant booking is off (requests only, BR-BKG-01) and the host cannot accept requests (`refund_overdue`, BR-BKG-03). The admin list `GET admin/refunds?overdue=true` shows them; a daily job notifies host, guest and admins. VERIFY WITH A PROFESSIONAL (consumer law on refund delays). | job + service | none | overdue refund: instant booking becomes request |

**Example 8a** (Tipaza villa from the click-through, individual host, 12%; DEC-018 revised 2026-11-13):
- 3 nights x 18,500 = **55,500 DZD** subtotal; cleaning 4,000; total **59,500 DZD**.
- Commission at confirmation: 12% x 55,500 = **6,660 DZD** deducted from the host's wallet.
- Guest cancels 3 days before, moderate policy (refund window 50%, 5,000 bp): 50% of 55,500 = 27,750 + cleaning 4,000 = **31,750 DZD** owed back to the guest. A `refund_obligation` of 31,750 DZD opens, due 7 days later (BR-CAN-06).
- Commission follows the refund (BR-PAY-05): returned = apply_bp(6,660, 5,000) = **3,330 DZD** back to the host's wallet; **BLADUS keeps 3,330 DZD**. The cleaning fee is outside the commission base, so it changes nothing.
- If the host cancels instead: the guest is owed 59,500 and all 6,660 goes back to the wallet.
- If the admin cancels with a refund of 31,750: refund_of_base = clamp(31,750 - 4,000 - 0, 0, 55,500) = 27,750; returned = round_half_up(6,660 x 27,750 / 55,500) = 3,330 DZD (same result).

## 9. Money, wallet and ledger (PAY)

| ID | Rule | Enforced by | Today | Test |
|---|---|---|---|---|
| BR-PAY-01 | Amounts are stored as whole centimes (`BIGINT`) with a currency code (`DZD`). Prices shown to people are whole dinars. Rates are basis points. Rounding (DEC-029): every computed line uses `apply_bp(amount, bp) = round_half_up(amount x bp / 10,000)` in integer centimes; a total is always the sum of its rounded lines, never a rounded sum. | DB types + Money type | integer DZD | property test: sum of lines == total |
| BR-PAY-02 | Ledger: every posting is one `ledger_transaction` with 2+ entries; entries of a transaction sum to 0 per currency; entries are never updated or deleted (corrections are new reversing transactions or a `wallet_adjustment`). Protection (DEC-026): the tables are owned by the migration role `bladus_migrator`; the app connects as `bladus_app` with only SELECT and INSERT on `ledger_transaction`, `ledger_entry` and `audit_event`; PostgreSQL triggers refuse UPDATE and DELETE on these three tables for every role. | DB deferred constraint trigger + insert-only triggers + role grants | single-sided | unbalanced insert fails at commit; UPDATE as `bladus_app` refused |
| BR-PAY-03 | Each host account has one commission wallet account in the ledger. Balance = sum of its entries (cached in a balance row updated in the same transaction). | DB + service | built (website) | cache equals sum |
| BR-PAY-04 | Commission = round_half_up(commission_base x rate_bp / 10,000); base per DEC-002 (subtotal after discount; trips and experiences: seats x price). Posted once per booking at confirmation (unique key booking + kind). | DB unique + service | built (website) | confirm twice posts once |
| BR-PAY-05 | Commission follows the refund (DEC-018, revised 2026-11-13). Commission is taken at confirmation (BR-PAY-04). **Guest cancels** a confirmed booking: the host gets back the same share of the commission as the share of the accommodation subtotal refunded to the guest: returned = apply_bp(commission, refund_bp of the policy window). Cleaning fee and taxes are outside the commission base and do not change it. **Host cancels**: the guest is owed the full total and the full commission is returned. **Admin cancels** with refund R: refund_of_base = clamp(R - cleaning - taxes, 0, base); returned = round_half_up(commission x refund_of_base / base). **Decline or expiry**: no commission was taken, nothing to return. Posted as one `commission_reversal` transaction per cancellation (amount 0: no posting). Why: with a full return on every cancellation, a host could keep the guest's non-refundable money and pay no commission. | service (pure function, property tests) | partial reversal on guest cancel | example 8a: 3,330 back, 3,330 kept |
| BR-PAY-06 | Rate resolution: host account override (if set) else host-type default from settings (individual 1,200 bp, agency 1,500, hotel 1,800, hostel 1,000). Changing defaults affects new bookings only. Overrides can be cleared. | service | two sources | clearing an override returns to the default |
| BR-PAY-07 | Manual top-up: amount 1 to 10,000,000 DZD; method in `ccp_transfer`, `bank_transfer`, `baridimob`, `cash_office`; receipt reference unique per method. Four-eyes (DEC-022): the 500,000 DZD threshold applies to the host's **rolling 24-hour total** of top-ups (pending + approved, including the new one), so splitting a deposit does not avoid it; above it the top-up stays `pending_approval` until a second admin approves. The approver must always differ from the requester (403 `four_eyes_same_user`). | DB unique + service | duplicates allowed | same receipt twice fails; two 300,000 top-ups in one day: the second waits for approval |
| BR-PAY-08 | Online top-up: **not in v1** (DEC-019, DEC-031). There is no online top-up endpoint while online payment is off. When it is added later: credited only from a verified gateway webhook, once per gateway event id. | DB unique `(provider, event_id)` (later) | none | no top-up endpoint in the v1 contract |
| BR-PAY-09 | Changing payout or refund account details requires 2FA, notifies the old email and phone, and blocks payouts for 72 hours. | service | none | payout during hold refused |
| BR-PAY-10 | Credit floor: a host wallet may go below zero down to `-credit_limit` (setting per host type, default 20,000 DZD). Below 0: banner and admin flag. Below the floor: instant bookings become requests and the host cannot accept new requests until topped up. | service | banner only | accept refused below floor |
| BR-PAY-11 | Models M2 to M4 (guest payments, escrow, payouts) are switched off by a setting until legal approval; their ledger accounts exist from day one. | settings | admin mock | endpoints return 404 when off |
| BR-PAY-12 | Commission invoices (R2): monthly per host account, sequential numbers without gaps per year, never deleted (cancelled by a credit note). VERIFY WITH A PROFESSIONAL. | DB sequence + service | none | numbers continuous |
| BR-PAY-13 | Manual ledger adjustments (DEC-022): a `wallet_adjustment` has a signed amount (credit or debit of the host wallet against the `adjustments` account), a required reason, and at most 1,000,000 DZD in absolute value. It is posted only after a **second admin** approves (never the requester: 403 `four_eyes_required`; DB check approver <> requester); reject needs a reason. Cap from setting `adjustment_max_minor` (default 100,000,000 centimes). Every step is audited. | DB check + service | none | adjustment of 1,000,001 DZD refused; same admin approving refused |
| BR-PAY-14 | Lock order and no hot rows (DEC-023). Booking creation and acceptance lock the host wallet balance row first (`SELECT ... FOR UPDATE` on `account_balance` of `host_wallet`), then check the floor, then take stock (listing row or pool counters), then post the commission. Everywhere the order is: wallet balance, then listing or stock rows. No platform balance row is updated on the booking path: commission revenue is computed from ledger entries (SUM), never read from a shared row. | service | none | concurrent bookings of one host near the floor: the floor is never crossed; no deadlock in the concurrency test |
| BR-PAY-15 | Nightly reconciliation (DEC-026): the job `reconcile_balances` recomputes every `account_balance` from its ledger entries, reports differences to the admins and the audit log, and exits non-zero when one differs. `--fix` rewrites a balance only after a human check, and is audited. | job | none | a hand-edited balance is reported the next night |

**Ledger accounts**

| Account | Type | Used by |
|---|---|---|
| `host_wallet:{host_account}` | liability (BLADUS holds the host's deposit) | M1 |
| `platform_cash:{method}` | asset (money received by BLADUS) | top-ups |
| `platform_commission_revenue` | revenue | commission |
| `vat_payable` | liability | R2 |
| `adjustments` | equity or expense (manual corrections) | wallet adjustments (BR-PAY-13) |
| `host_refund_payable:{host_account}` | memo (BLADUS never holds this money) | refund obligations (BR-CAN-06) |
| `guest_refund_clearing` | memo, counterpart of the line above | refund obligations |
| `guest_receivable`, `escrow`, `host_payable`, `payout_clearing` | various | M2 to M4 (switched off) |

The two memo accounts record that the host owes the guest money; they are not BLADUS money and are excluded from revenue and cash reports. Only host wallet balances have an `account_balance` row that the booking path locks; platform revenue is a SUM over entries (BR-PAY-14).

**Example 9a: postings**

| Event | Debit | Credit | Amount (DZD) |
|---|---|---|---|
| Admin records a CCP top-up | platform_cash:ccp | host_wallet:H | 50,000 |
| Booking confirmed (`commission`) | host_wallet:H | platform_commission_revenue | 6,660 |
| Guest cancels, 50% window (`commission_reversal`, example 8a) | platform_commission_revenue | host_wallet:H | 3,330 |
| Same cancellation (`refund_due`, memo) | host_refund_payable:H | guest_refund_clearing | 31,750 |
| Guest confirms the refund was received (`refund_settled`, memo) | guest_refund_clearing | host_refund_payable:H | 31,750 |

Wallet balance after: 50,000 - 6,660 + 3,330 = **46,670 DZD**. BLADUS keeps 3,330 DZD of commission. The memo accounts are back to 0 once the refund is settled.

## 10. Reviews (REV)

| ID | Rule | Enforced by | Today | Test |
|---|---|---|---|---|
| BR-REV-01 | A guest review needs a `completed` booking of that guest **whose stay was confirmed** (`stay_confirmed_at` set, BR-BKG-09), within 14 days after check-out, one per booking. Ratings 1 to 5: overall plus cleanliness, accuracy, communication, location, value. A completed booking also cost the host its commission, which makes fake reviews expensive. | DB unique `(booking, author_role)` + check + service | read only | second review refused; review without stay confirmation gets 409 `stay_not_confirmed` |
| BR-REV-02 | Double-blind (R2): both reviews published when both are submitted or when the 14 days end. No edits after publication. | job + service | none | hidden until both |
| BR-REV-03 | Review states: `submitted` (waiting), `published`, `flagged`, `hidden`, `removed`. Moderator moves need a reason; `removed` only by super admin. | service | no state machine | restoring a removed review refused |
| BR-REV-04 | Ratings and counts on listing, host account and organisation are computed from published reviews by a job after each change; never typed in. | job | stored numbers | rating equals average |

## 11. Messaging and notifications (MSG, NTF)

| ID | Rule | Enforced by | Today | Test |
|---|---|---|---|---|
| BR-MSG-01 | Before a booking is confirmed, phone numbers, emails, CCP/RIP numbers and messaging-app links in messages are masked for the other side; repeated attempts flag the thread for trust review. | service | none | `0555 12 34 56` shown masked |
| BR-NTF-01 | Every booking state change, verification decision, review publication and wallet going below 0 creates an in-app notification for the people concerned. | service via outbox | seeds | decline notifies guest |
| BR-NTF-02 | Critical events (booking confirmed, declined, expired, cancelled; one-time codes; verification result) also go by email or SMS in the user's language. Non-critical events respect preferences. | job | none | SMS sent once per event |

## 12. Search and geography (SRC)

| ID | Rule | Enforced by | Today | Test |
|---|---|---|---|---|
| BR-SRC-01 | Search returns only published listings of approved, non-suspended host accounts. Facet counts are computed on the filtered set without the facet's own filter. | service | in memory | suspended host hidden |
| BR-SRC-02 | Geography: 69 wilayas, 1,541 communes (DEC-013). Every listing references a commune; the wilaya derives from it. Legacy 58-wilaya codes kept for mapping. | DB FK | 58 / 68 | listing without commune refused |
| BR-SRC-03 | The exact point is shown only to the guest of a confirmed booking and to the host; everyone else gets the public point (random offset up to 500 m, fixed per listing). | service | exact point public | anonymous response has no exact point |
| BR-SRC-04 | `hotel` is a search vertical; analytics group `home`, `hotel`, `hostel` as "stays" (DEC-005). | service | inconsistent | counts add up |
| BR-SRC-05 | Text search (DEC-030): PostgreSQL has no Arabic stemmer, so search uses `pg_trgm` trigram similarity (GIN trigram indexes on listing titles and commune names) plus `unaccent` for French, with light Arabic normalisation (alef forms, ta marbuta, diacritics removed). No PostgreSQL full-text (`tsvector`) search. Tested with a fixed list of real Arabic, French and Darija queries. | service + DB indexes | static list | query list: expected listing in the first 5 results |

## 13. Files (MED)

| ID | Rule | Enforced by | Today | Test |
|---|---|---|---|---|
| BR-MED-01 | Photos: JPEG, PNG, WebP, HEIC; max 15 MB; re-encoded; metadata (incl. GPS) stripped; min 5 photos for homes and 3 per room type; duplicates detected by perceptual hash. | job | placeholders | GPS removed |
| BR-MED-02 | Documents: PDF, JPEG, PNG; max 10 MB; virus scanned; private; signed URL valid 5 minutes; each view audited. | job + service | placeholders | URL fails after 5 min |

## 14. Moderation (MOD)

| ID | Rule | Enforced by | Today | Test |
|---|---|---|---|---|
| BR-MOD-01 | Queue priority: hosts high after 3 days waiting, listings and trips after 2 days, documents after 3 days; flagged reviews and disputes always high. Waiting time counts from the last submission, not creation. | service | creation time used | resubmission resets the clock |
| BR-MOD-02 | A change request lists items (from a checklist) and a note; the host sees exactly those; the resubmission links to the request. | service | mocked | items visible to host |
| BR-MOD-03 | Suspending or banning a host account pauses all its listings and trips, blocks new bookings, and opens a support case for future confirmed bookings. Unsuspending does not republish automatically. | service | no cascade | listings paused |
| BR-MOD-04 | Risk flags (R2) open a case; they never silently block a user. | service | none | flag creates case |

## 15. Staff and audit (STF)

| ID | Rule | Enforced by | Today | Test |
|---|---|---|---|---|
| BR-STF-01 | One staff role: **admin**, with every permission (DEC-016). The permission list stays in the database so roles can be split later. Checked on every admin endpoint; deny by default. Four-eyes actions need a second admin user. | service | 5 roles in code | non-staff calling an admin endpoint gets 403 |
| BR-STF-02 | Audit log is insert-only: a PostgreSQL trigger refuses UPDATE and DELETE, and the app role `bladus_app` has only SELECT and INSERT (tables owned by `bladus_migrator`, DEC-026). Each row stores actor id, actor role, action, object type and id, before/after (personal data minimised), IP, request id, and a hash of the previous row. A daily job exports the previous day to write-once object storage. | DB roles + trigger + job | memory | update fails, also as table owner |
| BR-STF-03 | Every record of who did something stores a user id (foreign key), never a display name. | DB FK | names | |
| BR-STF-04 | Exports: values starting with `= + - @ TAB CR` are prefixed with `'`; need `reports.export` plus the view permission of the dataset; audited with filters and row count. | service | built | formula neutralised |

## 16. Settings and config (CFG)

| ID | Rule | Enforced by | Today | Test |
|---|---|---|---|---|
| BR-CFG-01 | Settings are one versioned record; each change creates a new version with author and time; only whitelisted keys with validated values. | service | shallow merge | unknown key refused |
| BR-CFG-02 | Onboarding config: one draft and many immutable published versions per host type; publishing copies the draft into the next version number for that host type. | DB unique `(host_type, version)` | global counter | old version still readable |
| BR-CFG-03 | Field types are canonical: `text, textarea, number, select, multi_select, image_upload, file_upload, toggle, location, amenities`. Core steps and fields cannot be removed or have their type changed. | service | two schemas | removing a core step refused |

## 17. Promotions (PRM), reports (RPT), privacy (PRV), system (SYS)

| ID | Rule | Enforced by | Today | Test |
|---|---|---|---|---|
| BR-PRM-01 | Coupon (R2): unique code (case-insensitive), valid dates, total and per-user limits; redemption counted when the booking is confirmed, released if cancelled before check-in. | DB unique + service | not used | limit reached refused |
| BR-PRM-02 | Coupon funding: BLADUS-funded reduces the commission (never below 0); host-funded reduces the subtotal. Recorded in the ledger. | service | n/a | |
| BR-RPT-01 | KPIs use real date windows in Africa/Algiers; gross booking value = sum of totals of confirmed and completed bookings by check-in date; revenue = net commission. | service | hardcoded | |
| BR-RPT-02 | Host earnings = subtotal + cleaning fee - commission - refunds owed, counted when completed (DEC-010). | service | shows 0 | |
| BR-PRV-01 | Store the accepted terms and privacy versions with time and IP; marketing only with explicit opt-in, withdrawable any time. | DB | none | |
| BR-PRV-02 | Deletion request: anonymise the profile (name, contacts, photos, ID files) within 30 days; keep bookings, ledger and invoices with a pseudonymous id for the legal period. VERIFY WITH A PROFESSIONAL. | job | none | |
| BR-PRV-03 | Notification preferences cannot switch off critical messages (BR-NTF-02). | service | none | |
| BR-PRV-04 | Personal data and its backups stay in Algerian data centres unless an ANPDP authorisation is recorded. VERIFY WITH A PROFESSIONAL. | operations | n/a | |
| BR-PRV-05 | Retention: ID images deleted 90 days after the verification decision (keep the decision, document type and a hash of the number); messages 3 years after last activity; accounting 10 years. VERIFY WITH A PROFESSIONAL. | job | none | |
| BR-SYS-01 | Every create or money endpoint accepts an `Idempotency-Key`. Stored in `idempotency_record` (user, endpoint, key unique, SHA-256 of the body, stored status and body, 24 hours, DEC-029). Same key and same body returns the stored response; same key with a different body returns 422 `idempotency_key_reused`; a concurrent request with the same key returns 409 `idempotency_in_progress`. | DB unique + service | none | retry returns the same booking |
| BR-SYS-02 | Incoming webhooks are stored raw before processing, signature checked, processed once. | DB unique | none | |
| BR-SYS-03 | Side effects (notifications, emails, SMS, search refresh, hotel `inventory.push`) are written to `outbox_message` (topic, payload, status `pending`/`sent`/`dead`, attempts, next_attempt_at, last_error) in the same transaction as the change (DEC-029). A worker sends after commit and retries at 1 min, 5 min, 15 min, 1 h, 6 h and 24 h; after 8 attempts the message is `dead`, the admins are alerted and it shows in `GET admin/outbox?status=dead` (retry by `POST admin/outbox/{id}/retry`). Handlers must be idempotent. | DB + job | none | a rolled-back change sends nothing; 8 failures make it dead |
| BR-SYS-04 | API errors have a stable code, a field (if any) and a message in the requested language (en, fr, ar). | service | ActionResult codes | |
| BR-SYS-05 | Timestamps in UTC (`timestamptz`); stay dates as `date` in Africa/Algiers; week starts Sunday; Friday and Saturday are the weekend for pricing rules. | DB types | mixed | |
| BR-SYS-06 | Outgoing URL check (SSRF, DEC-025): any URL a host gives (hotel system `base_url`, iCal link) must be `https`, and its host must resolve only to public IP addresses (no loopback, private, link-local, CGNAT 100.64.0.0/10, multicast, reserved, or the metadata address 169.254.169.254). Checked at save time and again at fetch time (DNS can change); no redirect to another host; 10 s timeout; 5 MB response cap. Code: `apps/core/netguard.py`. | service | none | `https://169.254.169.254/` refused; redirect to another host refused |
| BR-SYS-07 | Hashes of secrets (DEC-025): one-time codes, session tokens and lookup hashes (phone, email, ID number) use HMAC-SHA256 with a server secret `HASH_PEPPER` from the environment, never a plain SHA-256 of a short value. Pepper rotation: a dual-check window where the old and the new pepper are both accepted. | service | none | the stored hash of a code differs from SHA-256 of the code |

---

## Check yourself

- [ ] Which rules are guaranteed by the database itself, and why does that matter for BR-AVL-01?
- [ ] Which inventory types have no exclusion constraint, and what protects them instead?
- [ ] Recompute example 8a for a strict-policy guest who cancels 10 days before check-in (how much commission comes back?).
- [ ] When does a host with an unpaid refund lose instant booking?
- [ ] What happens to a host's instant bookings when the wallet is below the credit floor?
- [ ] Which organisation roles can accept a booking request?
- [ ] Why is the exact address hidden until a booking is confirmed?
- [ ] Why does a correction in the ledger add a new transaction instead of editing the old one?
