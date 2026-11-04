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

Sources: website code ([Appendix A section 4](_work/frontend-inventory.md)), admin code ([Appendix B section 4](_work/admin-inventory.md)), decisions DEC-001 to DEC-013 ([03-requirements.md](03-requirements.md) section 2). "Today" says what the apps do now.

---

## 1. Accounts (ACC)

| ID | Rule | Enforced by | Today | Test |
|---|---|---|---|---|
| BR-ACC-01 | Email is unique case-insensitively; phone is unique in E.164 form and must match `^\+213[5-7]\d{8}$` for Algerian mobiles (foreign numbers allowed for diaspora, flagged). A guest must have a verified phone before the first booking (DEC-012). | DB unique on `lower(email)` and `phone_e164`; service | email only | sign up twice with `A@x.dz` / `a@x.dz` fails |
| BR-ACC-02 | One-time codes: 6 digits, valid 10 minutes, 5 wrong attempts invalidate the code, max 3 sends per phone per hour and 10 per IP per hour. Every failure returns the same error. | service + Redis | none | 6th attempt with right code fails |
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
| BR-AVL-01 | For a single unit (home, vehicle), two bookings in a blocking state (`pending`, `confirmed`, `completed`, `disputed`) cannot have overlapping half-open ranges. Back-to-back is allowed (check-out day = next check-in). | **DB exclusion constraint** `(unit WITH =, stay WITH &&) WHERE status IN (...)` | app check | 50 parallel requests for the same nights: exactly 1 succeeds |
| BR-AVL-02 | For pooled units (room types, hostel beds, experience slots, trip departures), each night or slot has `total`, `held`, `booked`, with `held + booked <= total` and all values `>= 0`. Reserving is one atomic `UPDATE ... WHERE held + booked + n <= total`. | **DB check** + service | in process | inventory never negative |
| BR-AVL-03 | A hostel bed room type books one unit per guest; a hotel room type books one unit per room requested. Capacity per unit limits guests per unit. | service | built | 3 guests in a dorm use 3 units |
| BR-AVL-04 | A night is unavailable if blocked by the host, booked, outside the listing's availability window, inside the advance notice period, or the listing is not published. Blocks may be per listing or per room type. | service + DB | per listing only | blocked night not bookable |
| BR-AVL-05 | Search keeps a listing whose availability overlaps the searched dates and returns the largest free sub-range; booking is allowed only on fully free nights with stay length between min and max nights (defaults 1 and 90). | service | built | partial match shows sub-range |
| BR-AVL-06 | A hold lasts 15 minutes. Expired holds are released by a job every minute and ignored on read. | job + service | none | hold released after 15 min |

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
| BR-BKG-01 | Instant booking confirms immediately if the listing resolves to instant mode, the guest has a verified phone, the dates are free, and the host's wallet is above its credit floor (BR-PAY-10). Otherwise it becomes a request. | service | confirmed at once | host below floor: becomes pending |
| BR-BKG-02 | Approval mode resolution: if the platform switch forces request mode, request; else the listing's own mode if set; else the host account default; else `request`. | service | listing only | org default applied to new listing |
| BR-BKG-03 | A request blocks the dates (BR-AVL-01) until accepted, declined, cancelled or expired. Only users with `bookings.respond` may accept or decline. Decline needs a reason code. | service + DB | any member | agent cannot accept |
| BR-BKG-04 | A pending request expires `request_ttl_hours` (default 24, DEC-008) after creation, or at check-in time if sooner. A job runs every 5 minutes. | job | lazy | expired after 24 h without any read |
| BR-BKG-05 | A confirmed booking becomes completed at check-out time + 2 hours (Africa/Algiers) by a job; this opens the review window and counts host earnings (DEC-010). | job | lazy | completion without page view |
| BR-BKG-06 | Booking state machine: table 7a. Payment state is a separate field (M1: `not_collected`). | DB enum + service | two sets | confirmed to pending refused |
| BR-BKG-07 | At creation the booking stores a snapshot: price lines, nights, guests, cancellation policy windows, commission rate (bp) and base, listing title, host account, address (revealed to the guest only once confirmed). Later edits to the listing never change it. | service | partial | listing price change keeps booking total |

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
| BR-CAN-03 | Host cancellation of a confirmed booking: full refund owed to the guest, full commission reversal, host cancellation counter +1; 3 in 12 months open a moderation case. | service | partly | example 8a |
| BR-CAN-04 | Staff refunds: amount between 1 centime and (total minus already refunded); partial refunds add up; reason required; audited. | DB check `refunded <= total` + service | admin built | over-refund refused |
| BR-CAN-05 | Disputes (R2): opened until 14 days after check-out by guest or host; resolution `refund_full`, `refund_partial` or `declined`; resolution note required. | service | admin only | dispute after 15 days refused |

**Example 8a** (Tipaza villa from the click-through, individual host, 12%):
- 3 nights x 18,500 = **55,500 DZD** subtotal; cleaning 4,000; total **59,500 DZD**.
- Commission at confirmation: 12% x 55,500 = **6,660 DZD** deducted from the host's wallet.
- Guest cancels 3 days before, moderate policy: 50% of 55,500 = 27,750 + cleaning 4,000 = **31,750 DZD** owed back to the guest.
- BLADUS keeps commission only on the part the host keeps: 12% x 27,750 = 3,330, so **3,330 DZD** goes back to the wallet.
- If the host cancels instead: the guest is owed 59,500 and all 6,660 goes back to the wallet.

## 9. Money, wallet and ledger (PAY)

| ID | Rule | Enforced by | Today | Test |
|---|---|---|---|---|
| BR-PAY-01 | Amounts are stored as whole centimes (`BIGINT`) with a currency code (`DZD`). Prices shown to people are whole dinars. Rates are basis points. Rounding: half up at each line; a total is always the sum of its rounded lines. | DB types + Money type | integer DZD | property test: sum of lines == total |
| BR-PAY-02 | Ledger: every posting is one `ledger_transaction` with 2+ entries; entries of a transaction sum to 0 per currency; entries are never updated or deleted (corrections are new reversing transactions). | DB deferred constraint trigger + no UPDATE/DELETE grant | single-sided | unbalanced insert fails at commit |
| BR-PAY-03 | Each host account has one commission wallet account in the ledger. Balance = sum of its entries (cached in a balance row updated in the same transaction). | DB + service | built (website) | cache equals sum |
| BR-PAY-04 | Commission = round_half_up(commission_base x rate_bp / 10,000); base per DEC-002 (subtotal after discount; trips and experiences: seats x price). Posted once per booking at confirmation (unique key booking + kind). | DB unique + service | built (website) | confirm twice posts once |
| BR-PAY-05 | Commission reversal: decline and expiry (nothing was posted); host cancel and staff cancel without guest fault: full; guest cancel: reverse the commission on the refunded subtotal share. | service | built (website) | example 8a |
| BR-PAY-06 | Rate resolution: host account override (if set) else host-type default from settings (individual 1,200 bp, agency 1,500, hotel 1,800, hostel 1,000). Changing defaults affects new bookings only. Overrides can be cleared. | service | two sources | clearing an override returns to the default |
| BR-PAY-07 | Manual top-up: amount 1 to 10,000,000 DZD; method in `ccp_transfer`, `bank_transfer`, `baridimob`, `cash_office`; receipt reference unique per method; top-ups over 500,000 DZD need a second finance user to approve (four-eyes). | DB unique + service | duplicates allowed | same receipt twice fails |
| BR-PAY-08 | Online top-up (R2): credited only from a verified gateway webhook, once per gateway event id. | DB unique `(provider, event_id)` | none | replayed webhook ignored |
| BR-PAY-09 | Changing payout or refund account details requires 2FA, notifies the old email and phone, and blocks payouts for 72 hours. | service | none | payout during hold refused |
| BR-PAY-10 | Credit floor: a host wallet may go below zero down to `-credit_limit` (setting per host type, default 20,000 DZD). Below 0: banner and admin flag. Below the floor: instant bookings become requests and the host cannot accept new requests until topped up. | service | banner only | accept refused below floor |
| BR-PAY-11 | Models M2 to M4 (guest payments, escrow, payouts) are switched off by a setting until legal approval; their ledger accounts exist from day one. | settings | admin mock | endpoints return 404 when off |
| BR-PAY-12 | Commission invoices (R2): monthly per host account, sequential numbers without gaps per year, never deleted (cancelled by a credit note). VERIFY WITH A PROFESSIONAL. | DB sequence + service | none | numbers continuous |

**Ledger accounts**

| Account | Type | Used by |
|---|---|---|
| `host_wallet:{host_account}` | liability (BLADUS holds the host's deposit) | M1 |
| `platform_cash:{method}` | asset (money received by BLADUS) | top-ups |
| `platform_commission_revenue` | revenue | commission |
| `vat_payable` | liability | R2 |
| `guest_receivable`, `escrow`, `host_payable`, `payout_clearing` | various | M2 to M4 (switched off) |

**Example 9a: postings**

| Event | Debit | Credit | Amount (DZD) |
|---|---|---|---|
| Finance records a CCP top-up | platform_cash:ccp | host_wallet:H | 50,000 |
| Booking confirmed | host_wallet:H | platform_commission_revenue | 6,660 |
| Guest cancels (example 8a) | platform_commission_revenue | host_wallet:H | 3,330 |

Wallet balance after: 50,000 - 6,660 + 3,330 = **46,670 DZD**.

## 10. Reviews (REV)

| ID | Rule | Enforced by | Today | Test |
|---|---|---|---|---|
| BR-REV-01 | A guest review needs a `completed` booking of that guest, within 14 days after check-out, one per booking. Ratings 1 to 5: overall plus cleanliness, accuracy, communication, location, value. | DB unique `(booking, author_role)` + check + service | read only | second review refused |
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
| BR-STF-01 | Staff permissions come from the role (5 roles, matrix in Appendix B section 1.1) stored in the database; checked on every admin endpoint; deny by default. | service | code constants | analyst refund gets 403 |
| BR-STF-02 | Audit log is insert-only (no UPDATE or DELETE grant for the app's database role); each row stores actor id, actor role, action, object type and id, before/after (personal data minimised), IP, request id, and a hash of the previous row. | DB grants + trigger | memory | update fails |
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
| BR-SYS-01 | Every create or money endpoint accepts an `Idempotency-Key`; same key and same body returns the stored response; same key with a different body returns 422; a concurrent request with the same key returns 409. Keys kept 24 h. | DB unique + service | none | retry returns the same booking |
| BR-SYS-02 | Incoming webhooks are stored raw before processing, signature checked, processed once. | DB unique | none | |
| BR-SYS-03 | Side effects (notifications, emails, search refresh) are written to an outbox in the same transaction and sent after commit with retries and backoff. | DB + job | none | a rolled-back change sends nothing |
| BR-SYS-04 | API errors have a stable code, a field (if any) and a message in the requested language (en, fr, ar). | service | ActionResult codes | |
| BR-SYS-05 | Timestamps in UTC (`timestamptz`); stay dates as `date` in Africa/Algiers; week starts Sunday; Friday and Saturday are the weekend for pricing rules. | DB types | mixed | |

---

## Check yourself

- [ ] Which rules are guaranteed by the database itself, and why does that matter for BR-AVL-01?
- [ ] Recompute example 8a for a strict-policy guest who cancels 10 days before check-in.
- [ ] What happens to a host's instant bookings when the wallet is below the credit floor?
- [ ] Which organisation roles can accept a booking request?
- [ ] Why is the exact address hidden until a booking is confirmed?
- [ ] Why does a correction in the ledger add a new transaction instead of editing the old one?
