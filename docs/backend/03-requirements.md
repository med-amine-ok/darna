# 03. Requirements: what the backend must do

> **In plain words**
> This is the list of everything the Django backend must do, one line per need, each with an ID like `BKG-03`.
> Each line says who needs it, how important it is, in which release, and how we will know it works ("accepted when").
> It also says what the apps do today, so you can see the size of the gap.
> The same list is in [requirements.csv](requirements.csv) for spreadsheets. The rules behind the lines are in [04-business-rules.md](04-business-rules.md).
> The product decisions you approved on 2026-11-04 are written first, because many lines depend on them.

**Terms used here** (see [glossary.md](glossary.md)):
- **MoSCoW priority**: **Must** (no launch without it), **Should** (important, can slip a little), **Could** (nice to have).
- **Release**: **MVP** (first public launch), **R2** (the next release after launch), **Later** (needs a legal or business decision first).
- **Acceptance criterion** ("accepted when"): a sentence a tester can check with yes or no.
- **Non-functional requirement (NFR)**: a quality the system must have (speed, safety, backups) rather than a feature.

---

## 1. How to read the IDs

| Prefix in "Source" | Meaning | Where to find it |
|---|---|---|
| R1 to R69 | A requirement from the original spec | [_work/spec-vs-code.md](_work/spec-vs-code.md) section 1 |
| D-1 to D-22 | A disagreement between spec, website and admin | same file, section 2 |
| U1 to U16 | A usability finding | same file, section 4 |
| O1 to O11 | Something seen while clicking through | [01-system-inventory.md](01-system-inventory.md) section 6 |
| INV-F / INV-A | Website / admin inventory section | Appendices A and B |
| RES | Research section | [02-research.md](02-research.md) |
| DEC-001 to DEC-013 | A product decision (section 2 below) | here |
| BR-xxx | A business rule | [04-business-rules.md](04-business-rules.md) |

---

## 2. Product decisions (approved 2026-11-04)

The product owner accepted the proposed defaults for all open product questions (DEC-001 to DEC-013) and later asked for two more rules, already built in the apps (DEC-014, DEC-015).

| ID | Question | Decision | Consequence for the design |
|---|---|---|---|
| DEC-001 | Money model | **M1: prepaid commission.** Guests pay the host directly (cash, transfer, or the host's own means). The host keeps a commission deposit with BLADUS, which deducts its commission on each confirmed booking. The ledger is designed so models M2 to M4 can be switched on later. | No guest payment or payout in MVP; double-entry ledger with accounts ready for them |
| DEC-002 | Commission base | **Accommodation subtotal**: nights x nightly price (after length-of-stay discount), excluding cleaning fee and taxes. For trips and experiences: seats x price per person. | One base, stored on each booking |
| DEC-003 | Review before publishing | **Yes.** New listings and trips go to `pending_review`; edits of key fields return them to review. | Moderation queue drives publication |
| DEC-004 | One person, many host roles | **Yes**, with an active-organisation switcher. | Host account = user or organisation; memberships |
| DEC-005 | Hotel vertical | **Own vertical in search**, rolled into the home family in analytics. | `vertical` enum includes `hotel` |
| DEC-006 | Trips | **Own tables with departures** (dates, seats, price, status). | `trip`, `trip_departure` tables |
| DEC-007 | Individual onboarding length | **Keep 12 steps**; drop the admin's 2-step cap. | Config schema without that rule |
| DEC-008 | Request reply window | **24 hours**, as a platform setting. | Scheduled expiry job |
| DEC-009 | Who may answer requests in an organisation | **Owner, admin, manager.** | Permission `bookings.respond` |
| DEC-010 | When earnings count | **At completion** (after check-out). | Reporting rule |
| DEC-011 | Cancellation policies | **Flexible, moderate, strict**, stored as time windows. | `cancellation_policy` table |
| DEC-012 | Guest phone verification | **Required before the first booking.** | Phone OTP in MVP |
| DEC-014 | What each host type may publish (2026-11-04) | **Individual: homes and vehicles. Agency: experiences and trips. Hotel and hostel: their property.** | `HST-07`, `BR-HST-05`; demo data moved accordingly |
| DEC-015 | Experience and trip types (2026-11-04) | **8 experience types and 8 trip types, one shared list** used everywhere | `LST-12`, `TRP-07`, `BR-LST-05`; enums in the schema |
| DEC-016 | Staff roles (2026-11-11) | **One role: admin**, with every permission | `BR-STF-01`; `staff_role_code` enum has one value; the permission tables stay for later |
| DEC-017 | Hotel onboarding (2026-11-11) | **Connect directly to the hotel's own system** to import rooms, availability, prices and services | `HST-08`, `BR-HST-06`; tables `property_integration`, `integration_sync_log`, `property_service` |
| DEC-018 | Commission on cancellation (2026-11-11) | **The host always recovers the full commission** when a confirmed booking is cancelled | `BR-PAY-05`, examples 8a and 9a |
| DEC-019 | Online payment (2026-11-11) | **No online payment in the first release**; it comes later | Payment, payout and gateway tables stay unused |
| DEC-013 | Wilaya count shown | **69** (codes 59 to 69 to be confirmed against the official journal). | Geography seed |

Legal and accounting questions (L1 to L7, F1 to F4 in [14-open-questions.md](14-open-questions.md)) are still open. Every requirement that depends on them carries "VERIFY" in its source.

---

## 3. Actors

| Actor | Who | App |
|---|---|---|
| Visitor | Anyone not signed in | Website |
| Guest | Signed-in traveller | Website |
| Host | Individual host, or a member of an organisation acting for it | Website (host mode) |
| Org owner / admin / manager / agent / guide | Roles inside an agency, hotel or hostel | Website (host mode) |
| Admin | BLADUS staff (one role, DEC-016) | Admin |
| System | Scheduled jobs and automatic checks | Backend |

---

## 4. Summary and full list

The tables below are generated from [_tools/requirements_data.py](_tools/requirements_data.py) by `python _tools/build_requirements.py`, which also writes [requirements.csv](requirements.csv). Edit the data file, not the tables.

<!-- BEGIN GENERATED REQUIREMENTS -->
| Priority | MVP | R2 | Later | Total |
|---|---|---|---|---|
| Must | 110 | 0 | 0 | 110 |
| Should | 17 | 12 | 0 | 29 |
| Could | 0 | 7 | 2 | 9 |
| **Total** | 127 | 19 | 2 | **148** |

### ACC: Accounts and sign-in (9)

| ID | Requirement | Actor | Pri. | Release | Accepted when | Today in code | Source | Rules |
|---|---|---|---|---|---|---|---|---|
| ACC-01 | Sign up with email or Algerian phone number | Visitor | Must | MVP | A visitor can create an account with email+password or phone (+213[5-7]XXXXXXXX) and must verify it by code before booking | Email+password only, no verification | INV-F 1.1, RES B.3 | BR-ACC-01 |
| ACC-02 | Sign in with password or one-time phone code | Guest, Host | Must | MVP | Login works with email+password or phone OTP (6 digits, 10 min, 5 tries); same generic error for every failure | Email+password only | RES B.3, O1 | BR-ACC-02 |
| ACC-03 | Session for both Next.js apps | All | Must | MVP | Website and admin hold an httpOnly cookie on the Next.js server; Django session tokens can be revoked server-side; logout revokes the token | Signed cookie; admin JWT cannot be revoked | RES B.3 | BR-ACC-03 |
| ACC-04 | Password reset and change | Guest, Host, Staff | Must | MVP | Reset by email or phone code; change requires current password; all other sessions revoked after change | Change only (website); none for staff | INV-A 4.15 |  |
| ACC-05 | Two-factor login | Staff, Host with payouts | Must | MVP | Staff must enrol TOTP or passkey before first use; hosts must enrol before editing payout details | Flag only, never enforced | RES B.3, D.1 | BR-ACC-04 |
| ACC-06 | Profile management | Guest, Host | Must | MVP | User edits name (Arabic and Latin), avatar, language, phone; changing phone or email requires re-verification | Built (no re-verification) | INV-F 3.2 |  |
| ACC-07 | Login rate limiting shared across servers | All | Must | MVP | 5 failures in 15 min lock 60 s per account and per IP, stored in Redis | In-process memory | INV-A 4.15, gap 6.1-4 | BR-ACC-05 |
| ACC-08 | One user, many roles | Guest, Host | Must | MVP | One user may be a guest, an individual host and a member of several organisations at once | Single hostType per user | DEC-004, D-1 | BR-ORG-01 |
| ACC-09 | Favourites | Guest | Should | MVP | Guest adds or removes a listing or trip from favourites; list endpoint paginated | Built | INV-F 3.2 |  |

### ORG: Organisations and teams (7)

| ID | Requirement | Actor | Pri. | Release | Accepted when | Today in code | Source | Rules |
|---|---|---|---|---|---|---|---|---|
| ORG-01 | Create an organisation (agency, hotel, hostel) | Host | Must | MVP | Creating an organisation makes the creator its owner; status starts pending_verification | Built (frontend) | R3, R7-R9 | BR-ORG-02 |
| ORG-02 | Active-organisation switcher | Host | Must | MVP | A user with several memberships picks the active one; every host request carries it and is checked | Built in website 2026-11-04 (host menu, membership checked server-side) | DEC-004, INV-F gaps | BR-ORG-01 |
| ORG-03 | Invite a team member | Org owner/admin | Must | MVP | Invite by email or phone with a role; invite token expires in 7 days; invitee accepts after signing in | Invites cannot be accepted | INV-F 3.8, gap | BR-ORG-03 |
| ORG-04 | Change role, remove member, transfer ownership | Org owner/admin | Must | MVP | Only owner transfers ownership; an organisation always has exactly one owner; audited | Built | INV-F 3.8 | BR-ORG-04 |
| ORG-05 | Per-role permissions inside an organisation | Org members | Must | MVP | Permissions per role (owner, admin, manager, agent, guide) incl. bookings.respond for owner/admin/manager only | Any member can do anything operational | DEC-009, D-7 | BR-ORG-05 |
| ORG-06 | Re-verification on legal field change | Org owner | Should | MVP | Changing legal name, RC, NIF or licence number moves verification back to pending and notifies staff | Field list exists | INV-F 3.8 | BR-ORG-06 |
| ORG-07 | Public organisation profile | Visitor | Must | MVP | Public page shows name, logo, verified badge, listings, trips, rating; never legal numbers or staff phones | Built | INV-F 1.1 |  |

### HST: Becoming a host and verification (8)

| ID | Requirement | Actor | Pri. | Release | Accepted when | Today in code | Source | Rules |
|---|---|---|---|---|---|---|---|---|
| HST-01 | Guided onboarding per host type | Host | Must | MVP | Individual 12 steps, agency 5, hotel 7, hostel 7, all served from the published config; every flow asks the booking approval mode | Hardcoded; agency misses approval step | R6-R9, R17, D-14 | BR-HST-01 |
| HST-02 | Save onboarding drafts on the server | Host | Must | MVP | Draft saved per user and host type with the config version it started from; resumable on any device | Browser localStorage | O9, R49 | BR-HST-02 |
| HST-03 | Upload verification documents | Host | Must | MVP | Required document list depends on host type; files go to a private bucket; each document has its own review status | Placeholder images only | RES C3.5 | BR-HST-03 |
| HST-04 | Host verification lifecycle | Host, Moderator | Must | MVP | Statuses applied, under_review, approved, changes_requested, rejected, suspended, banned; moves only along the allowed transitions with reasons | Admin only, not linked to website | INV-A 4.6 | BR-HST-04 |
| HST-05 | Payout or refund account details | Host | Should | MVP | Host stores CCP (RIP) or bank RIB in own name; changing it needs 2FA and holds payouts 72 h | Missing | RES C1, D4 | BR-PAY-09 |
| HST-08 | Connect a hotel's own system | Hotel, Hostel | Must | MVP | A hotel or hostel connects its channel manager, PMS, iCal feed or CSV file; room types, availability, prices and services (restaurants, spa, parking) are imported and kept in sync; manual entry stays possible | Missing (rooms hardcoded at onboarding) | DEC-017 | BR-HST-06 |
| HST-07 | What each host type may publish | Host | Must | MVP | Individual: homes and vehicles; agency: experiences and trips; hotel and hostel: their property with room types; enforced by API and database, create-listing flow offers only allowed choices | Built in website 2026-11-04 (UI + server actions) | DEC-014 | BR-HST-05 |
| HST-06 | Default approval mode per host or organisation | Host | Must | MVP | Owner default applies to new listings; a listing may override; platform switch can force request mode | Stored in 3 places, not applied | R20, D-6 | BR-BKG-02 |

### LST: Listings and catalogue (12)

| ID | Requirement | Actor | Pri. | Release | Accepted when | Today in code | Source | Rules |
|---|---|---|---|---|---|---|---|---|
| LST-01 | Create and edit a listing (home, hotel, hostel, experience, vehicle) | Host | Must | MVP | Host creates a draft, fills vertical-specific fields, submits; server validates every field | Built (no review) | INV-F 3.3 | BR-LST-01 |
| LST-02 | Listing review before publication | Host, Moderator | Must | MVP | Submitted listing goes to pending_review; published only after staff approval; edits of key fields go back to review | Live at once | DEC-003, D-10 | BR-LST-02 |
| LST-03 | Listing status lifecycle | Host, Moderator | Must | MVP | Statuses draft, pending_review, changes_requested, published, paused, rejected, suspended, archived, deleted (soft); allowed moves enforced | Two different sets | INV-A 4.7 | BR-LST-03 |
| LST-04 | Room types for hotels and hostels | Host | Must | MVP | A property has room types with price, capacity, unit (room or bed), inventory count, amenities, photos | Built | R4, R5, R14 | BR-AVL-03 |
| LST-05 | Amenities and categories from a shared list | Host, Staff | Must | MVP | Amenities and property types are reference rows with en/fr/ar names; listings link to them | Three vocabularies, free text | INV-A 6.3 | BR-LST-04 |
| LST-06 | Location: wilaya, commune, exact and public point | Host | Must | MVP | Listing references a commune; exact point hidden until booking confirmed; public point fuzzed by about 500 m | Free text city, exact coordinates public | RES C.5, B.1 | BR-SRC-03 |
| LST-07 | House rules, stay rules and cancellation policy | Host | Must | MVP | Min/max nights, check-in/out times, rules list, policy chosen from templates | Built (website only) | INV-F 4.5, 4.8 | BR-CAN-01 |
| LST-08 | Pause and soft delete | Host | Must | MVP | Host can pause or delete; delete is soft and keeps bookings; staff can restore | Hard delete on website | U7 | BR-LST-03 |
| LST-09 | Featured listings | Staff | Could | R2 | Staff feature a published listing with optional start and end dates and position | Boolean only | INV-A 4.7 |  |
| LST-10 | Vehicle listing specifics | Host | Should | MVP | Make, model, year, seats, gearbox, fuel, pickup points, driver age and licence rules | Built (website) | INV-F 2.2 |  |
| LST-12 | Canonical experience types | Agency, Guest | Must | MVP | Every experience has one of 8 types (excursion, guided tour, nature and adventure, desert, sport, workshops and culture, gastronomy, wellness); search filters, cards, creation forms and admin use the same list | Built in both apps 2026-11-04 (frontend/lib/catalog-types.ts) | DEC-015 | BR-LST-05 |
| LST-11 | Experience listing specifics | Host | Should | MVP | Duration, languages, meeting point, time slots with seats | Built partly | INV-F 2.2 |  |

### TRP: Agency trips and departures (7)

| ID | Requirement | Actor | Pri. | Release | Accepted when | Today in code | Source | Rules |
|---|---|---|---|---|---|---|---|---|
| TRP-01 | Agency-only trips | Agency | Must | MVP | Only verified agencies create trips; hotels and hostels never see the option | Built | R29, R30, DEC-006 | BR-TRP-01 |
| TRP-02 | Trip itinerary and inclusions | Agency | Must | MVP | Day-by-day itinerary, inclusions, exclusions, meeting point, group limits, cancellation policy step | 5 steps, no policy step | R29, R31 |  |
| TRP-03 | Departures with seats and price | Agency | Must | MVP | Each departure has dates, seats total, price per person, minimum group, status (scheduled, guaranteed, cancelled, completed) | Array of dates | R36, DEC-006 | BR-TRP-02 |
| TRP-04 | Trips go through review | Agency, Moderator | Must | MVP | Same review flow as listings | Live at once | DEC-003 | BR-LST-02 |
| TRP-05 | Search trips by date | Guest | Should | MVP | Trip search filters departures overlapping the searched dates | Missing | R43 |  |
| TRP-07 | Canonical trip types | Agency, Guest | Must | MVP | Every trip has one of 8 types (group tour, private trip, adventure, Saharan expedition, cultural, hiking, relaxation, religious); used by trip creation, search filters, cards and admin | Built in both apps 2026-11-04 | DEC-015 | BR-LST-05 |
| TRP-06 | Cancel a departure under minimum group | Agency | Should | R2 | Agency cancels a departure; all its bookings are cancelled with full refund and notifications | Missing | RES A.4 | BR-TRP-03 |

### AVL: Availability and calendar (6)

| ID | Requirement | Actor | Pri. | Release | Accepted when | Today in code | Source | Rules |
|---|---|---|---|---|---|---|---|---|
| AVL-01 | No double booking for single units | System | Must | MVP | Database refuses two active bookings on the same unit with overlapping half-open ranges, even under concurrent requests | App-level check only | O4, RES A.5 | BR-AVL-01 |
| AVL-02 | Pooled inventory for rooms, beds, seats | System | Must | MVP | Per day or slot: held + booked never exceeds total, enforced by a database check | In-process count | R4, RES A.5 | BR-AVL-02 |
| AVL-03 | Host calendar: block days and set prices | Host | Must | MVP | Block or unblock days and set per-day price, per listing or per room type | Per listing only | INV-F 3.5, R15 | BR-AVL-04 |
| AVL-04 | Availability window and partial matches | Guest | Must | MVP | Search shows listings overlapping the dates with a 'available X to Y' hint; booking only inside free nights | Built | R38-R40 | BR-AVL-05 |
| AVL-05 | Temporary holds during payment | System | Should | MVP | A hold blocks inventory for 15 min while a guest pays; expires automatically | Missing | RES A.5 | BR-AVL-06 |
| AVL-06 | External calendar sync (iCal) | Host | Could | Later | Import and export iCal feeds with SSRF protection | Missing | RES D.1 API7 |  |

### PRC: Pricing and quotes (5)

| ID | Requirement | Actor | Pri. | Release | Accepted when | Today in code | Source | Rules |
|---|---|---|---|---|---|---|---|---|
| PRC-01 | Server-side price quote | Guest | Must | MVP | Quote lists nights x per-day price, cleaning fee, taxes, discounts, total; has an ID and expires in 30 min | Client and server compute separately | RES A.5 | BR-PRC-01 |
| PRC-02 | No guest service fee | Guest | Must | MVP | Guests never pay a BLADUS fee; quote shows 'No BLADUS fees' | Built | Policy 2026-10 | BR-PRC-02 |
| PRC-03 | Length-of-stay discounts | Host | Should | MVP | Weekly and monthly discount percentages applied in the quote | Display only | INV-A 4.1 | BR-PRC-03 |
| PRC-04 | Tourist tax and VAT lines | System | Should | R2 | Quote shows taxe de séjour by star rating and VAT where applicable; rates from settings | Free 'taxes' number | RES C.4 | BR-PRC-04 |
| PRC-05 | Whole dinars to guests, centimes inside | System | Must | MVP | Prices shown in whole DZD; stored in centimes; rounding rule documented and tested | Integer DZD | RES B.17 | BR-PAY-01 |

### BKG: Bookings (11)

| ID | Requirement | Actor | Pri. | Release | Accepted when | Today in code | Source | Rules |
|---|---|---|---|---|---|---|---|---|
| BKG-01 | Instant booking | Guest | Must | MVP | Instant mode: booking confirmed once the commission deposit check passes (model M1) | Confirmed at once | R18, O2 | BR-BKG-01 |
| BKG-02 | Request to book | Guest, Host | Must | MVP | Request mode creates pending; host accepts or declines within 24 h (setting) | Built | R22, O6 | BR-BKG-03 |
| BKG-03 | Automatic expiry of requests | System | Must | MVP | A scheduled job expires pending requests at the deadline and notifies both sides | Lazy on read | D-8 | BR-BKG-04 |
| BKG-04 | Automatic completion after check-out | System | Must | MVP | Job marks confirmed bookings completed after check-out; opens the review window | Lazy on read | INV-F 4.7 | BR-BKG-05 |
| BKG-05 | Unified booking state machine | System | Must | MVP | Statuses: pending, confirmed, declined, expired, cancelled, completed, disputed; payment status is separate | Two sets | D-9 | BR-BKG-06 |
| BKG-06 | Booking snapshot | System | Must | MVP | At confirmation store price lines, commission rate and amount, cancellation policy, listing title and address | Partly | INV-A 4.1 | BR-BKG-07 |
| BKG-07 | Guest and host booking lists | Guest, Host | Must | MVP | Paginated lists filtered by status and dates; host list scoped to active organisation | Built | INV-F 3.4 |  |
| BKG-08 | Booking reference | All | Must | MVP | Human reference BLD-YYYY-XXXXXX unique, shown everywhere | Admin only | INV-A 2.1 |  |
| BKG-09 | Trip departure booking | Guest | Must | MVP | Books seats on a departure; per-person price; respects agency approval mode | Built (string dates) | R35 | BR-TRP-02 |
| BKG-10 | Idempotent booking creation | System | Must | MVP | POST with the same Idempotency-Key returns the same booking | Missing | RES B.12 | BR-SYS-01 |
| BKG-11 | Disputes | Guest, Host, Support | Should | R2 | Either party opens a dispute within 14 days after check-out with statement and files; support resolves | Admin only | U8, D-9 | BR-CAN-05 |

### CAN: Cancellations and refunds (4)

| ID | Requirement | Actor | Pri. | Release | Accepted when | Today in code | Source | Rules |
|---|---|---|---|---|---|---|---|---|
| CAN-01 | Guest cancellation by policy | Guest | Must | MVP | Refund percentage computed from the snapshot policy and time before check-in | Built | INV-F 4.8 | BR-CAN-02 |
| CAN-02 | Host cancellation | Host | Must | MVP | Host cancels with reason; guest gets full refund of anything paid; host commission returned; host cancellation counted | Built partly | D-4 | BR-CAN-03 |
| CAN-03 | Staff cancellation and refund | Support, Finance | Must | MVP | Staff cancel or refund with reason; partial refunds add up and never exceed amount paid | Built (admin) | INV-A 4.5 | BR-CAN-04 |
| CAN-04 | Commission reversal rules | System | Must | MVP | Decline and host cancel: full reversal; guest cancel: commission on the non-refunded part kept | Built (website) | D-4 | BR-PAY-05 |

### PAY: Payments, wallet and ledger (12)

| ID | Requirement | Actor | Pri. | Release | Accepted when | Today in code | Source | Rules |
|---|---|---|---|---|---|---|---|---|
| PAY-01 | Double-entry ledger | System | Must | MVP | Every money movement is a transaction whose entries sum to zero; entries never updated or deleted | Single-sided lists | RES A.5, D-16 | BR-PAY-02 |
| PAY-02 | Prepaid commission wallet (model M1) | Host | Must | MVP | Each host account (user or organisation) has a commission wallet; balance derived from the ledger | Built (website) | DEC-001 | BR-PAY-03 |
| PAY-03 | Commission deduction on confirmation | System | Must | MVP | On confirm: commission = rate x accommodation subtotal (excl. cleaning, taxes), posted once per booking | Built (website) | R63, DEC-002 | BR-PAY-04 |
| PAY-04 | Commission rate resolution | System | Must | MVP | Host override if set, else host-type default from settings; rate snapshot on booking | Two sources | D-5 | BR-PAY-06 |
| PAY-05 | Manual wallet top-up by staff | Finance | Must | MVP | Amount 1 to 10,000,000 DZD, method, receipt reference unique per method, optional four-eyes above a threshold | No duplicate check | R60, D-17 | BR-PAY-07 |
| PAY-06 | Online wallet top-up via gateway | Host | Should | R2 | Host tops up with CIB/Edahabia through Chargily; credited only after a verified webhook | Missing | RES C.1 | BR-PAY-08 |
| PAY-07 | Negative balance handling | Host, Finance | Must | MVP | Negative balance shows host banner, admin flag and dashboard item; below a threshold new instant bookings switch to request | Banner only | R65 | BR-PAY-10 |
| PAY-08 | Wallet history for hosts | Host | Must | MVP | Host sees balance and paginated entries with booking links | Built | R64 |  |
| PAY-09 | Gateway webhooks | System | Should | R2 | Webhook payloads stored raw, signature verified, deduplicated by event id, processed once | Missing | RES D.1 API10 | BR-SYS-02 |
| PAY-10 | Payouts and guest payments (model M4) | Finance | Could | Later | Schema supports guest payments, escrow and host payouts; disabled until legal approval | Admin mock | DEC-001 | BR-PAY-11 |
| PAY-11 | Commission invoices to hosts | Finance | Should | R2 | Monthly invoice per host with sequential number, NIF/NIS of both sides, HT, VAT, TTC; PDF kept 10 years | Missing | RES C.4 | BR-PAY-12 |
| PAY-12 | Money as centimes with currency | System | Must | MVP | All amounts BIGINT centimes + currency code DZD | Integer DZD | RES B.17 | BR-PAY-01 |

### REV: Reviews (5)

| ID | Requirement | Actor | Pri. | Release | Accepted when | Today in code | Source | Rules |
|---|---|---|---|---|---|---|---|---|
| REV-01 | Write a review after a stay | Guest | Must | MVP | Only for a completed booking, within 14 days, one per booking; 5 sub-ratings + comment | Missing (read only) | INV-F gaps | BR-REV-01 |
| REV-02 | Host reviews guest | Host | Should | R2 | Host reviews guest under the same window; double-blind reveal | Missing | RES A.1 | BR-REV-02 |
| REV-03 | Host reply | Host | Should | MVP | One public reply per review, editable for 48 h | Display only | INV-A 4.8 |  |
| REV-04 | Report and moderate reviews | Guest, Host, Moderator | Must | MVP | Anyone reports with a reason; moderator hides, restores or deletes with reason; allowed moves enforced | No state machine | INV-A 4.8 | BR-REV-03 |
| REV-05 | Ratings derived from reviews | System | Must | MVP | Listing, host and organisation ratings and counts recomputed from published reviews | Stored numbers | O10 | BR-REV-04 |

### MSG: Messaging (6)

| ID | Requirement | Actor | Pri. | Release | Accepted when | Today in code | Source | Rules |
|---|---|---|---|---|---|---|---|---|
| MSG-01 | Conversations between guest and host | Guest, Host | Must | MVP | Thread per listing inquiry or booking; org members with access see org threads | Built | O8 |  |
| MSG-02 | Incremental sync | Guest, Host | Must | MVP | Endpoint returns messages changed since a cursor; clients poll every 5 to 15 s while open | Full fetch | RES B.6 |  |
| MSG-03 | Read state and unread counts | Guest, Host | Must | MVP | Per participant last-read pointer; unread counts per thread and total | Built | O8 |  |
| MSG-04 | Contact detail masking before confirmation | System | Should | MVP | Phone numbers, emails, RIP/CCP numbers and WhatsApp links masked until a booking is confirmed | Missing | RES D.2 | BR-MSG-01 |
| MSG-05 | Attachments | Guest, Host | Could | R2 | Images and PDFs up to 10 MB, scanned | Missing |  |  |
| MSG-06 | Staff messages and broadcast | Support | Should | R2 | Staff message a user or segment with permission and audit | Mocked, no permission | INV-A 6.2 |  |

### NTF: Notifications (4)

| ID | Requirement | Actor | Pri. | Release | Accepted when | Today in code | Source | Rules |
|---|---|---|---|---|---|---|---|---|
| NTF-01 | In-app notifications | All | Must | MVP | Events (request, accept, decline, expiry, cancel, review, verification) create notifications; mark read, read all | Seeds only | INV-F 3.7 | BR-NTF-01 |
| NTF-02 | Email and SMS notifications | All | Must | MVP | Critical events also by email or SMS in the user's language; provider behind an interface | Missing | RES C.2 | BR-NTF-02 |
| NTF-03 | Notification preferences | All | Should | R2 | User opts in or out per channel for non-critical events; marketing needs explicit opt-in | Missing | INV-A 6.2 | BR-PRV-03 |
| NTF-04 | Outbox pattern | System | Must | MVP | Events written in the same transaction as the change, then sent by workers with retries | Missing | U5 | BR-SYS-03 |

### SRC: Search and geography (6)

| ID | Requirement | Actor | Pri. | Release | Accepted when | Today in code | Source | Rules |
|---|---|---|---|---|---|---|---|---|
| SRC-01 | Search with filters and facets | Visitor | Must | MVP | Filters: vertical, wilaya, commune, dates, guests, price, property type, amenities, rating, instant; facet counts returned | Built (in memory) | INV-F 1.1, U4 | BR-SRC-01 |
| SRC-02 | Map search | Visitor | Must | MVP | Bounding box filter and up to 500 pins; public points only | Built | INV-F 1.1 |  |
| SRC-03 | Text search in three languages | Visitor | Should | MVP | Title and place search tolerant to accents and transliteration (trigram) | Static list of 10 cities | RES B.7 |  |
| SRC-04 | 69 wilayas and 1,541 communes | System | Must | MVP | Reference tables seeded from el-amin (CC0) + ihahachi (MIT) with source and valid_from | 58 or 68 | RES C.5 | BR-SRC-02 |
| SRC-05 | Sorting and pagination | Visitor | Must | MVP | Sort by relevance, price, rating, newest; cursor or page pagination capped at 50 | Built partly |  |  |
| SRC-06 | Hotels as their own vertical | Visitor | Must | MVP | Vertical filter includes hotel; analytics roll hotel into the home family | Inconsistent | DEC-005 | BR-SRC-04 |

### MED: Photos and documents (3)

| ID | Requirement | Actor | Pri. | Release | Accepted when | Today in code | Source | Rules |
|---|---|---|---|---|---|---|---|---|
| MED-01 | Photo upload with direct-to-storage | Host | Must | MVP | Presigned upload to quarantine, validation, re-encode, EXIF stripped, renditions, perceptual hash | Placeholders | RES B.8 | BR-MED-01 |
| MED-02 | Private documents | Host, Moderator | Must | MVP | KYC files in a private bucket, virus scanned, short-lived signed URLs, every view logged | Placeholders | RES C3.5 | BR-MED-02 |
| MED-03 | Photo ordering and cover | Host | Must | MVP | Host orders photos and picks a cover; minimum 5 photos for homes | Built partly |  |  |

### MOD: Moderation and trust (8)

| ID | Requirement | Actor | Pri. | Release | Accepted when | Today in code | Source | Rules |
|---|---|---|---|---|---|---|---|---|
| MOD-01 | Moderation queues with waiting time | Moderator | Must | MVP | Queues for hosts, listings, trips, documents, reviews, disputes with count, oldest submitted_at, priority | Partly hardcoded | U1, INV-A 4.10 | BR-MOD-01 |
| MOD-02 | Change requests to hosts | Moderator, Host | Must | MVP | Moderator sends checklist items and a note; host sees them and resubmits | Admin only, mocked | U6 | BR-MOD-02 |
| MOD-03 | Reason catalogue | Moderator | Should | MVP | Preset reasons per action with localized host-facing text; free note allowed | Free text | U5 |  |
| MOD-04 | Bulk actions with per-item results | Moderator | Should | R2 | Bulk approve returns success or error per item; one audit entry per item | Client loop | U3 |  |
| MOD-05 | Undo window | Moderator | Could | R2 | Approve and hide can be reversed within 8 s via the inverse transition, audited | Toast only | U2 |  |
| MOD-06 | Cascade on host suspension | System | Must | MVP | Suspending or banning a host pauses its listings and trips; future bookings flagged for support | No cascade | INV-A 4.6 | BR-MOD-03 |
| MOD-07 | Risk flags | System | Should | R2 | Rules flag new account + high value, duplicate photos, contact info in messages; flags create review cases | Missing | RES A.5, D.2 | BR-MOD-04 |
| MOD-08 | Document-level review | Moderator | Must | MVP | Approve or reject each document separately; host approval requires all required documents approved | Approves whole host | INV-A 6.4-7 | BR-HST-03 |

### STF: Staff, roles and audit (6)

| ID | Requirement | Actor | Pri. | Release | Accepted when | Today in code | Source | Rules |
|---|---|---|---|---|---|---|---|---|
| STF-01 | Staff roles and permissions in the database | Super admin | Must | MVP | One staff role (admin) with every permission, stored and enforced by the API, deny by default (DEC-016) | Code constants | U16, INV-A 1.1 | BR-STF-01 |
| STF-02 | Staff invitation and activation | Super admin | Must | MVP | Invite sends a one-time link; staff sets password and MFA; deactivation revokes sessions immediately | No acceptance | INV-A 4.15 |  |
| STF-03 | Append-only audit log | System | Must | MVP | Every staff mutation, every host money or team action, logins and KYC views logged with actor id, IP, before/after; no update or delete | Admin memory only | U13 | BR-STF-02 |
| STF-04 | Actors by id, not name | System | Must | MVP | Ledger, payouts, disputes, config publishes reference staff user ids | Names | INV-A 6.1-6 | BR-STF-03 |
| STF-05 | Separate admin API surface | System | Must | MVP | /api/v1/admin/* only for staff tokens; never reachable with a guest or host session | n/a | RES D.1 API5 |  |
| STF-06 | Audited CSV exports | Analyst, Finance | Must | MVP | Exports cover full filtered set, formula-injection safe, audited with filters and row count; large exports run as jobs | Built (admin) | INV-A 4.16 | BR-STF-04 |

### CFG: Platform settings and onboarding config (5)

| ID | Requirement | Actor | Pri. | Release | Accepted when | Today in code | Source | Rules |
|---|---|---|---|---|---|---|---|---|
| CFG-01 | Platform settings | Super admin | Must | MVP | One settings record: commission defaults, request TTL, instant-book switch, maintenance mode, session timeout, locales | Field mismatches | D-2, INV-A 6.4-1 | BR-CFG-01 |
| CFG-02 | Versioned onboarding config | Super admin | Must | MVP | Draft and published versions per host type; publish creates an immutable version; rollback = republish older | Global counter, no history | D-13, D-15 | BR-CFG-02 |
| CFG-03 | Onboarding field editor | Super admin | Should | R2 | Add, edit, reorder fields with canonical types; core steps and fields cannot be removed | Steps only | R48 | BR-CFG-03 |
| CFG-04 | Serve published config to the website | Host | Must | MVP | GET returns the published flow; answers to custom fields stored as JSON and validated against that version | Not read | R49 | BR-HST-02 |
| CFG-05 | Taxonomy management | Moderator | Must | MVP | Categories, amenities, property types with en/fr/ar, order, active flag; soft delete only when unused | Hard delete | INV-A 4.12 | BR-LST-04 |

### PRM: Promotions (2)

| ID | Requirement | Actor | Pri. | Release | Accepted when | Today in code | Source | Rules |
|---|---|---|---|---|---|---|---|---|
| PRM-01 | Coupons | Moderator, Guest | Could | R2 | Code, type, value, dates, usage limits, scope; redemption at quote time with per-user limit | Not consumed | INV-A 4.11 | BR-PRM-01 |
| PRM-02 | Who pays the discount | Finance | Could | R2 | A coupon is funded by BLADUS (reduces commission) or by the host; recorded in the ledger | n/a | Policy | BR-PRM-02 |

### RPT: Reports and analytics (3)

| ID | Requirement | Actor | Pri. | Release | Accepted when | Today in code | Source | Rules |
|---|---|---|---|---|---|---|---|---|
| RPT-01 | KPIs by period, host type, vertical, wilaya | Analyst | Should | MVP | Bookings, gross booking value, commission, active listings, hosts; period over period from real dates | Hardcoded | R52-R55, U12 | BR-RPT-01 |
| RPT-02 | Host-type by vertical cross-tab | Analyst | Could | R2 | Impossible cells shown as not applicable, not zero | Missing | R54 |  |
| RPT-03 | Host earnings dashboard | Host | Should | MVP | Earnings recognised at completion; shows upcoming, completed, commission paid | Shows 0 | O11, DEC-010 | BR-RPT-02 |

### PRV: Privacy and legal (6)

| ID | Requirement | Actor | Pri. | Release | Accepted when | Today in code | Source | Rules |
|---|---|---|---|---|---|---|---|---|
| PRV-01 | Consent records | Visitor | Must | MVP | Terms version, privacy notice version, marketing opt-in stored with timestamp | Missing | RES C.3 18-05 art 26, 31 | BR-PRV-01 |
| PRV-02 | Data subject requests | User, Staff | Must | MVP | Access export (JSON), correction, deletion by anonymisation keeping legal records; tracked with deadlines | Missing | RES D.3 | BR-PRV-02 |
| PRV-03 | Data residency | System | Must | MVP | Personal data and backups stored in Algeria unless an ANPDP authorisation exists | n/a | RES C.3 (VERIFY) | BR-PRV-04 |
| PRV-04 | Retention schedule | System | Should | MVP | Jobs delete or redact KYC images after the retention window; accounting records kept 10 years | Missing | RES C3.5 (VERIFY) | BR-PRV-05 |
| PRV-05 | Breach response | Staff | Must | MVP | Runbook with a 5-day ANPDP notification clock and incident register | Missing | RES C3.1 |  |
| PRV-06 | Foreign guest declaration support | Host | Could | R2 | Guest nationality and ID type captured when required; host reminded of the declaration duty | Missing | RES C3.3 (VERIFY) |  |

### NFR: Quality (non-functional) (13)

| ID | Requirement | Actor | Pri. | Release | Accepted when | Today in code | Source | Rules |
|---|---|---|---|---|---|---|---|---|
| NFR-01 | API response time | System | Must | MVP | p95 under 300 ms for reads and 600 ms for booking create at 50 requests/s on one app node | n/a | RES A.5 |  |
| NFR-02 | Search response time | System | Must | MVP | p95 under 500 ms with 20,000 listings and dates | n/a |  |  |
| NFR-03 | Availability | System | Should | MVP | 99.5% monthly for the public API; planned maintenance announced | n/a |  |  |
| NFR-04 | Backups and restore | System | Must | MVP | Point-in-time recovery 7 days, nightly encrypted dump in a second Algerian location, monthly restore drill; RPO 15 min, RTO 4 h | n/a | RES D.3 |  |
| NFR-05 | Security baseline | System | Must | MVP | OWASP API Top 10 controls, TLS everywhere, secrets outside code, dependency scanning in CI | Partly | RES D.1 |  |
| NFR-06 | Three languages and right-to-left | All | Must | MVP | Every API error and notification has en/fr/ar text; Latin digits in Arabic | Partly | R68 | BR-SYS-04 |
| NFR-07 | Time and dates | System | Must | MVP | Timestamps stored in UTC; business dates in Africa/Algiers; week starts Sunday; weekend Friday-Saturday | Partly | U15 | BR-SYS-05 |
| NFR-08 | API contract | System | Must | MVP | OpenAPI generated in CI; typed client shared by both apps; breaking changes need a new version | n/a | RES B.13 |  |
| NFR-09 | Observability | System | Must | MVP | JSON logs with request, user and org ids; error tracking; metrics and health checks | n/a | RES B.16 |  |
| NFR-10 | Test coverage | System | Must | MVP | Services 90% line coverage; property tests for money and dates; concurrency tests on real PostgreSQL | n/a | RES B.14 |  |
| NFR-11 | Rate limits | System | Must | MVP | Per user and per IP throttles per endpoint group; SMS budget alarms | Login only (admin) | RES B.12 |  |
| NFR-12 | Unique identifiers | System | Must | MVP | UUIDv7 primary keys plus human references; no time or random based ids | Date.now/Math.random | INV-A 6.1-3 |  |
| NFR-13 | Accessibility of messages | All | Should | MVP | Errors have stable codes the apps map to localized text | Built (ActionResult codes) |  |  |

<!-- END GENERATED REQUIREMENTS -->

---

## 5. What is deliberately out of the MVP

| Item | Why | When |
|---|---|---|
| BLADUS collecting guest payments and paying hosts (models M2 to M4) | Needs legal approval (payment licence) | Later, behind a decision gate |
| Online wallet top-up by card | Needs a gateway contract | R2 |
| Host reviews of guests, disputes, coupons, iCal sync | Not needed to launch | R2 or Later |
| Realtime messaging (WebSockets) | Polling is enough at launch | R2 |
| Commission invoices as PDFs | Needs an accountant's answer on VAT (F1) | R2 |

---

## Check yourself

- [ ] What is the difference between "Must / MVP" and "Should / R2"?
- [ ] Which decision explains why there is no guest payment in the MVP?
- [ ] Find the requirement that prevents double booking. What is its acceptance criterion?
- [ ] Which requirements change what the website does today (live listings, invites, ratings)?
- [ ] Where do you edit a requirement so the CSV and this page stay identical?
