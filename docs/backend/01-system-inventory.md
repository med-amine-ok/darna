# 01. System inventory: what BLADUS does today

> **In plain words**
> BLADUS has two web apps and no real backend yet. Everything is kept in memory and resets when the server restarts.
> This document lists what each kind of user can do, what data exists, and which functions the future Django API must replace.
> It also lists the rules hidden in the code and every place where the two apps, or the original spec, disagree.
> The disagreements matter most: a few of them (money model, statuses, who is a host) must be decided before any table is designed.
> Raw, line-by-line notes are kept in the appendices so nothing is lost.

Date: 2026-11-04. Scope: `frontend/` (guest and host website) and `admin/` (back office). Method: reading the code, comparing it with the recovered spec (`_sources/darna_spec.md`), and clicking through the main flows on a local dev server.

**Terms used in this document** (all also in [glossary.md](glossary.md)):
- **Mock store**: data kept in a JavaScript object in server memory (`globalThis`). It disappears on restart and is not shared between servers.
- **`lib/data` seam**: the folder of functions every page calls to read or write data. It is the bridge: each function there becomes one API call later.
- **Server action**: a Next.js function that runs on the server when a form or button is used. It returns `ActionResult` (success, or an error code).
- **Host type**: `individual`, `agency`, `hotel` or `hostel`.
- **Vertical**: a product family: homes, hotels, experiences, vehicles, trips.
- **Ledger**: a list of money movements that is only ever added to; a balance is the sum of its lines.

---

## 1. The system at a glance

| Part | What it is | Users | Session |
|---|---|---|---|
| Website (`frontend/`) | Next.js 14 App Router, next-intl (en, fr, ar with right-to-left), Tailwind | Visitors, guests, hosts (individual and organisation teams) | Signed cookie `darna_session` (HMAC) |
| Admin (`admin/`) | Same stack, separate app | Staff with 5 roles: super_admin, moderator, support, finance, analyst | JWT cookie `darna_admin_session`, 8 hours, HS256 |
| Backend | **None.** Each app has its own in-memory mock store with its own seed data | | |

The two apps do **not** share data. A booking made on the website never appears in the admin, and an approval in the admin never reaches the website. The Django backend will become the one shared source of truth.

---

## 2. Features per actor

Status: **built** (works end to end on mock data), **partial** (some parts real, some hardcoded), **mocked** (screen only, nothing saved), **missing**.

### 2.1 Visitor (not signed in)

| Feature | Status | Backend need |
|---|---|---|
| Home feed: homes, experiences, trips, hotels and hostels, vehicles, featured, wilaya tiles | built | Public listing and trip queries, featured flag |
| Search bar (where, when, who) and results page with left filter sidebar, facet counts, map (Leaflet + OpenFreeMap), vertical tabs | built | Search endpoint with filters, facets, map bounds |
| Listing detail (home, vehicle, experience): gallery, amenities, rules, policies, reviews, map, booking card | built | Listing detail, availability, price quote |
| Hotel and hostel detail with room-type cards (per room or per bed) | built | Room types and per-night inventory |
| Trip detail (itinerary, agency card, per-person price) | built | Trips and departures |
| Organisation profile pages (agency, hotel, hostel) and individual host profile | built | Public organisation and host projections |
| Sign up, sign in | built (email + password only) | Accounts, phone OTP, verification |

### 2.2 Guest (signed-in traveller)

| Feature | Status | Backend need |
|---|---|---|
| Book instantly | built, **no payment step** | Payment before confirmation |
| Request to book (24 h host reply window) | built, expiry applied only when data is read | Scheduled expiry job |
| My reservations ("Trips" page), cancel with policy refund | built, shows fake "Total paid by CIB/Edahabia" | Payments, refunds |
| Favourites | built | Favourites table |
| Messages with hosts (threads, read state, unread count) | built | Conversations, messages |
| Notifications | built (seeded only, nothing produces new ones) | Notification producers |
| Write a review | **missing** (reviews are read-only seeds) | Review write path tied to a completed stay |
| Profile, change password | built | Account endpoints |

### 2.3 Host, individual

| Feature | Status | Backend need |
|---|---|---|
| Become a host: 12-step guided flow with draft and preview | built, draft in browser only | Persisted onboarding drafts |
| "My listings" (2-page solo interface) and edit modal | partial | Listing CRUD |
| Bookings list with Accept / Decline, mini calendar | built | Respond to requests |
| Calendar: block dates, set nightly prices | built (not hidden from solo hosts) | Availability overrides |
| Prepaid commission wallet widget | built | Ledger |
| Settings: default approval mode | partial: does not affect existing or new listings | Approval-mode resolution rule |

### 2.4 Host organisation (agency, hotel, hostel team member)

| Feature | Status | Backend need |
|---|---|---|
| Onboarding: agency 5 steps, hotel 7, hostel 7 | built (agency never asks the approval mode) | Organisation creation, verification |
| Today page (command centre), bookings, calendar per room type, listings with room-type manager | built / partial | Org-scoped queries |
| Trips (agency only): 5-step creation, list, pause, delete | built | Trips and departures |
| Team: invite, change role, transfer ownership, remove | partial: **invites can never be accepted** | Invitations with tokens |
| Organisation settings, legal fields | built | Re-verification when legal fields change |
| Switch between own organisations | **missing** (active org is fixed per session) | Organisation switcher |

### 2.5 Staff (admin app)

| Area | Status | Roles that can act |
|---|---|---|
| Sign in / out, login rate limit | built (no MFA, no password reset, invites cannot sign in) | all |
| Dashboard KPIs and "needs attention" | partial (trends and charts hardcoded) | all view |
| Approvals inbox: hosts, listings, documents, reviews, disputes | partial (document approve approves the whole host; undo is a toast) | SA, MO |
| Provider (host) validation | partial ("request changes" not saved) | SA, MO |
| Hosts directory, commission override, wallet recharge | built | SA, MO, FI |
| Users (guests) suspend, ban, delete, restore | built (reset password mocked) | SA, MO, SU |
| Listings across verticals: approve, request changes, feature, suspend, delete, restore, bulk approve, CSV | built | SA, MO |
| Listing create wizards, change requests, featured placements | **mocked** | |
| Bookings: cancel, refund, resolve dispute, CSV | built | SA, SU, FI (refund) |
| Finance: wallets, ledger, payouts approve/reject, default commission rates | built | SA, FI |
| Reviews: hide, restore, dismiss flag, delete | built | SA, MO |
| Coupons create, toggle, delete | built (no checkout uses them) | SA, MO |
| Messages, notifications, templates, broadcast | **mocked**, and no permission check at all | anyone signed in |
| Stats | partial (mostly hardcoded) | SA, MO, FI, AN |
| Settings, team and roles, audit log, onboarding configurator | built / partial | SA (audit: all view) |

Roles: SA super_admin (34 permissions), MO moderator (17), SU support (10), FI finance (10), AN analyst (8). The full permission matrix is in [Appendix B section 1.1](_work/admin-inventory.md).

---

## 3. Data inventory

### 3.1 Entities that exist today

| Entity | Website | Admin | Notes for the backend |
|---|---|---|---|
| User | `User` with `role guest/host/admin`, one `hostType`, `organizationId` | `GuestUser` and `Host` are **separate, unlinked tables** | One `users` table plus host profile and memberships |
| Organisation | `Organization` with `businessCategory`, verification `pending/verified/rejected`, hotel and hostel policy fields | `Organization` type never seeded; flattened into `Host` + metadata blobs | Real table; verification as a state machine |
| Membership | owner, admin, manager, guide, agent (6 seeds) | type only | Role per organisation |
| Listing | `Listing` with `ownerType`, `latlng`, `commune`, `cleaningFee`, `cancellationPolicy`, `minNights/maxNights`, vehicle and experience fields | `Listing` with `wilayaCode`, `coordinates`, `propertyType` free text, 8 statuses | Admin cannot see cleaning fee, policy or stay rules today |
| RoomType | `bookingUnit room/bed`, `totalInventory`, price, capacity | same idea | One inventory column; availability computed |
| Reservation / Booking | `Reservation` (`res_*`), statuses incl. `declined`, `expired` | `Booking` (`BLD-2026-NNNN`), statuses incl. `disputed`, `refunded` | Union state machine needed |
| Trip | Separate `Trip` with itinerary and `departureDates: string[]` | A `Listing` with `category: trip` | Decide: own tables with departures |
| Conversation, Message | built | mocked | |
| Notification | built (4 seeds) | mocked | |
| Review | 5 sub-ratings, no status, read-only module constant | single rating, status, flags, host reply | Merge both shapes |
| Calendar override | blocked days and price per day per listing | none | Per listing and per room type |
| Wallet, Transaction | **prepaid commission** wallet per user or org | wallet per host mixing guest money and payouts | Fundamental decision (D-16) |
| Payout request | none | built | |
| Coupon | `Coupon` | `PromotionCoupon` (different field names) | One shape |
| Category, Amenity | i18n keys | `{en,fr,ar}` names; amenities stored as free strings | Reference tables |
| Onboarding config | 4 flows in code plus browser `localStorage` | in-memory versioned config, different schema | One versioned schema served by the API |
| Audit entry | own `AuditLogEntry` type | append-only, 53 logged actions | Append-only table |
| Platform settings | commission rates store | `PlatformSettings` (field-name mismatches) | One settings row |
| **Payment, Refund, Invoice, Payout to bank** | **none** | refund is a number on the booking | Must be designed from scratch |

### 3.2 Enums that disagree

| Concept | Website | Admin |
|---|---|---|
| Booking status | pending, confirmed, cancelled, completed, declined, expired | pending, confirmed, cancelled, completed, disputed, refunded |
| Listing status | active, pending, suspended, draft | draft, pending_review, approved, changes_requested, rejected, suspended, archived, deleted (+ 3 legacy aliases) |
| Payment status | paid, pending, refunded, partially_refunded, voided | paid, partially_refunded, refunded, pending, failed |
| Transaction type | recharge, commission_deduction, payout, adjustment | wallet_recharge, booking_payment, commission_deduction, host_payout, booking_refund, adjustment |
| Onboarding field type | text, number, textarea, select, multi-select, image-upload, toggle | text, textarea, number, select, multiselect, radio, file, location, amenities, boolean |
| Wilayas | 58, numeric codes | 68, string codes "01".."68" (UI text says 69) |
| Verticals | 5 (hotel created as `home` + business category) | 5 with `hotel` a real vertical |

Algeria today has **69 wilayas and 1,541 communes** (see [02-research.md](02-research.md) section C.4). Neither app is correct yet.

Full field lists: website in [Appendix A section 2](_work/frontend-inventory.md), admin in [Appendix B section 2](_work/admin-inventory.md).

---

## 4. The `lib/data` function inventory (the bridge to the API)

Every page calls these functions. When the backend exists, each function body becomes one HTTP call and the page code stays the same. This is the most useful part of this inventory for the build: it is the list of endpoints the apps already need.

### 4.1 Website (`frontend/lib/data/*` and `app/actions/*`)

| Module | Functions | Proposed endpoint family |
|---|---|---|
| `auth.ts` | `verifyCredentials`, `registerUser`, `changePassword`, `getUserById`, `updateUserProfile`, `updateUserHostStatus`, `setUserFavorite` | `/api/v1/auth/*`, `/api/v1/me`, `/api/v1/me/favorites/{id}` |
| `listings.ts` | `getListings` (search + availability overlap), `getPublicListingById`, `getFeaturedListings`, `getHostListings`, `createListing`, `updateListing`, `deleteListing` | `GET /listings`, `GET /listings/{id}`, `/host/listings` CRUD |
| `reservations.ts` | `getReservations`, `getReservationById`, `getListingAvailability`, `createListingReservation`, `createTripReservation`, `cancelReservation`, `respondToRequest`, `seatsSoldByDeparture` | `POST /reservations`, `/reservations/{id}/cancel`, `/host/reservations/{id}/accept|decline`, `/listings/{id}/availability` |
| `calendar.ts` | `getAvailabilityOverrides`, `setDatesBlocked`, `setDatePrice` | `/host/listings/{id}/calendar/*` |
| `conversations.ts` | `getConversations`, `getMessages`, `sendMessage`, `markConversationAsRead`, `findOrCreateConversation` | `/conversations/*` |
| `notifications.ts`, `favorites.ts`, `reviews.ts`, `experiences.ts`, `vehicles.ts` | list and mark-read; favourites list; reviews by listing or user; vertical lists | `/me/notifications/*`, `/me/favorites`, `/listings/{id}/reviews` |
| `organizations.ts` | `createOrganization`, `updateOrganization`, `deleteOrganization`, `getOrganizationMembers`, `addOrganizationMember`, `updateOrganizationMemberRole`, `transferOrganizationOwnership`, `removeOrganizationMember`, `updateOrganizationVerification` | `/organizations`, `/host/organization/*`, admin verification |
| `trips.ts` | `getTrips`, `getPublicTripById`, `createTrip`, `updateTrip`, `deleteTrip` | `/trips`, `/host/trips` |
| `wallet.ts` | `getWalletByOwner`, `rechargeWallet`, `deductBookingCommission`, `reverseBookingCommission`, `getCommissionRates`, `saveCommissionRates` | `/host/wallet`, admin wallets; deduction as an internal service |
| Server actions (29) | thin wrappers over the above, each with session and ownership checks | same endpoints |

### 4.2 Admin (`admin/lib/data/*` and `lib/actions/*`)

| Module | Main functions | Proposed endpoint family |
|---|---|---|
| `hosts.ts` | list, get, approve, reject, suspend, unsuspend, ban, delete, restore, overrideCommission, export | `/api/v1/admin/hosts/*` |
| `listings.ts` | list with facets, get, approve, reject, requestChanges, updateStatus, feature, delete, restore, export | `/api/v1/admin/listings/*` |
| `bookings.ts` | list, cancel, refund, resolveDispute, export | `/api/v1/admin/bookings/*` |
| `finance.ts`, `ledger.ts` | summary, wallets, transactions, recharge, payouts approve/reject, refunds, commission rates, exports | `/api/v1/admin/finance/*` |
| `users.ts` | list, suspend, unsuspend, ban, delete, restore, updateStatus | `/api/v1/admin/users/*` |
| `reviews.ts` | list, hide, restore, dismissFlag, delete | `/api/v1/admin/reviews/*` |
| `approvals.ts` | inbox of 5 queues with waiting time and priority | `/api/v1/admin/moderation/queues` |
| `categories.ts`, `promotions.ts`, `onboarding.ts`, `settings.ts`, `team.ts`, `audit.ts`, `analytics.ts`, `search.ts` | CRUD, publish, settings, staff, audit list/export, KPIs, global search | `/api/v1/admin/...` |

Seven admin actions have no caller in the UI, and many features are missing entirely (document approve/reject, amenity CRUD, coupon edit, payout "processed", staff password reset and MFA). The complete table with file and line for every function is in [Appendix A section 3](_work/frontend-inventory.md) and [Appendix B section 3](_work/admin-inventory.md).

---

## 5. Business rules found in the code

These rules are real today, even though no one wrote them down. The backend must keep them or change them on purpose.

### 5.1 Money

1. All amounts are **whole Algerian dinars (DZD)** in the apps. The backend will store centimes (see [02-research.md](02-research.md) B.10).
2. **Guests pay no platform fee.** Both apps set the guest service fee to 0. BLADUS earns only the host commission. (`admin/docs/DATA-MODEL.md` still says 7%: stale.)
3. Default commission by host type: **individual 12%, agency 15%, hotel 18%, hostel 10%**. The admin also allows a per-host override.
4. Commission base differs: website uses the **accommodation subtotal** (no cleaning fee, no taxes); admin uses the **base price**. Spec says "booking total".
5. The commission rate is copied onto the booking when it is created (snapshot), so later rate changes do not reprice old bookings.
6. Website price = nights x nightly price (with per-day overrides) + cleaning fee + taxes; weekly 10% and monthly discounts exist for display.
7. Website wallet: the host **pre-pays** a commission deposit; BLADUS deducts the commission on every confirmed booking and gives it back on decline or cancel. The balance may go negative; the host then sees a warning banner.
8. Admin wallet recharge needs a receipt reference and an amount between 1 and 10,000,000 DZD. The same receipt can be credited twice (no duplicate check).
9. Payout approval debits the wallet and refuses when the balance is too low. There is no "money actually sent" step.
10. Refunds: partial refunds add up; a refund takes back the host share proportionally; the platform keeps its commission on refunds.

### 5.2 Bookings and availability

11. Date ranges are **half-open**: check-in day is booked, check-out day is free. Back-to-back stays are allowed (confirmed in the click-through, O5).
12. Overlapping stays on the same single unit are refused (O4). For hotels and hostels, the room type's inventory is counted per night; a hostel bed counts one per guest.
13. Search keeps a listing when its availability **overlaps** the searched dates and shows "Available X to Y within your dates" for partial matches.
14. Stay rules: minimum and maximum nights per listing; guest count up to capacity.
15. Approval mode per listing: `instant` confirms at once; `request` creates a pending booking that expires after **24 hours**.
16. Website booking statuses move: pending to confirmed, declined, expired or cancelled; confirmed to completed or cancelled. Completion and expiry are applied **when the data is read**, not by a timer.
17. Cancellation policies (flexible, moderate, strict) decide the refund by days before check-in.

### 5.3 Moderation and accounts

18. Host lifecycle (admin): applied, under review, approved, rejected, suspended, banned, deleted (with restore). Suspending a host does **not** pause its listings or bookings.
19. Listing lifecycle (admin): 8 statuses; a reason of at least 3 characters is required to reject, suspend or request changes. On the website, new listings and trips go **live at once** without review.
20. Moderation waiting time and priority: hosts high after 3 days, listings after 4, documents after 3; flagged reviews and disputes always high.
21. Organisation roles: owner, admin, manager, guide, agent. Any active member may accept or decline a booking request.
22. Changing an organisation's legal fields should trigger re-verification.
23. Admin login: 5 failures in 15 minutes lock for 60 seconds, per email and per IP; same error for every failure; scrypt password hashing.
24. Admin audit log is append-only and records 53 kinds of action with actor, IP, before and after.
25. CSV exports protect against spreadsheet formula injection and are themselves audited.

The full numbered rule lists with file and line are in [Appendix A section 4](_work/frontend-inventory.md) and [Appendix B section 4](_work/admin-inventory.md). They are rewritten as testable rules in `04-business-rules.md` (Phase 3).

---

## 6. What we saw when clicking through (website, 2026-11-04)

| # | Flow | Observation | What the backend must do |
|---|---|---|---|
| O1 | Guest sign-in | Email and password only, no verification | Add phone OTP and email verification |
| O2 | Instant booking, 3 nights | Confirmed at once: 55,500 + 4,000 cleaning = 59,500 DZD, "No BLADUS fees" | Take payment (or a decision on payment) before confirming |
| O3 | Link with `guestCount=2` | Booking card showed 1 guest | One parameter name in the API contract |
| O4 | Overlapping dates | Correctly blocked | Move the guarantee into the database |
| O5 | Back-to-back dates | Allowed | Half-open ranges confirmed |
| O6 | Request to book | Pending, "reply within 24 hours" | Real expiry job |
| O7 | Trips page | Every card says "Total paid by CIB / Edahabia", even unpaid requests | Payment records and honest payment status |
| O8 | Messages | Threads, read receipts, unread count | Conversations API |
| O9 | Become a host | 4 host types with guided flows | Persisted drafts, published flow config |
| O10 | Host mode as an agency owner who also owns 2 hotels | Rating 4.96 from 159 reviews next to "No guest reviews yet"; prepaid wallet 145,000 DZD at 15% | Ratings derived from reviews; active-organisation context |
| O11 | Host earnings | 0 DZD while a confirmed booking exists | Define when earnings are recognised |

Source: [Appendix D](_work/click-through.md).

---

## 7. Gaps and inconsistencies

### 7.1 The decisions that block the data model

These come from comparing the spec, the website and the admin ([Appendix C](_work/spec-vs-code.md), items D-1 to D-22). The most important:

| ID | Topic | The conflict | Why it blocks |
|---|---|---|---|
| D-16 | **Money model** | Spec section 9 and the website: host pre-pays commission, guest pays the host directly. Admin seed: BLADUS collects guest money and pays hosts out. Spec section 3 says "the moment a guest completes payment". | Decides payment integration, ledger accounts, payouts and legal licensing |
| D-1 | Who is a host | Website: user plus organisations, one person can be both. Admin: one flat `Host` row | Decides the keys for wallets, listings, commission, moderation |
| D-3, D-5 | Commission base and override | subtotal vs base vs total; override only in admin | Ledger posting rules |
| D-9 | Booking statuses | two different sets of six | State machine and payments |
| D-10 | Publish requires approval? | website: live at once; admin: review queue | Listing status flow |
| D-11 | Trips | own table vs listing subtype; departures as strings | Booking target model |
| D-12 | Is "hotel" a vertical? | yes in admin, no in spec | Search filters and analytics |
| D-14, D-15 | Onboarding | 12 steps vs admin cap of 2; schemas differ; config in browser storage | Config tables |
| D-6, D-7, D-8 | Approval mode and request expiry | stored in 3 places; any member may respond; expiry lazy | Settings and scheduler |

### 7.2 Mock shortcuts that will not survive production

1. Safety against double booking and double debit relies on JavaScript running one thing at a time. A real server needs database transactions, row locks and constraints.
2. No idempotency keys (a protection that makes a retried request harmless) on recharge, refund, payout or booking.
3. IDs from `Date.now()` and `Math.random()`; collisions are possible.
4. Rate limits live in process memory.
5. Admin logout only deletes the cookie; the token stays valid until it expires.
6. Staff are recorded by **name**, not ID, in the ledger, payouts, onboarding and disputes.
7. Names, ratings and counters are copied into many rows and will drift.
8. Expiry and completion happen only when someone reads the data.
9. All images are two placeholder files; there is no upload, storage or virus scan.
10. The demo password ships in the website's code.
11. No payments, refunds as records, invoices, tax lines or payouts to banks.
12. No review writing, no notification producers, no invitation acceptance, no organisation switcher.
13. Three amenity vocabularies, free-text property types and cities where references are needed.
14. Messages and broadcast in the admin need no permission.

### 7.3 Things that are fine and should be kept

Server-side permission checks in both apps, signed sessions, half-open date logic, commission snapshot on booking, append-only audit with before/after, CSV formula protection, generic login errors with constant-time comparison, soft delete with restore in the admin.

---

## Appendices (raw notes, kept unchanged)

| | File | Lines | Content |
|---|---|---|---|
| A | [_work/frontend-inventory.md](_work/frontend-inventory.md) | 913 | Website: features, every enum and entity, every function with proposed endpoint, rules 4.1 to 4.18, gaps, 34 routes |
| B | [_work/admin-inventory.md](_work/admin-inventory.md) | 830 | Admin: permission matrix, 35 features, types, functions, rules, onboarding contract, gaps, 80 routes |
| C | [_work/spec-vs-code.md](_work/spec-vs-code.md) | 235 | Requirements R1 to R69 with status, disagreements D-1 to D-22, usability findings U1 to U16 |
| D | [_work/click-through.md](_work/click-through.md) | 17 | Observations O1 to O11 |
| E | [_sources/](_sources/) | | Recovered original spec and usability reports |

---

## Check yourself

- [ ] Can you name the two apps and say why they do not share data today?
- [ ] Which four host types exist, and what is each one's default commission?
- [ ] Does a guest pay any BLADUS fee? Who pays BLADUS?
- [ ] What does "half-open date range" mean for a check-out day?
- [ ] Why is D-16 (money model) the first decision to make?
- [ ] Name three mock shortcuts that would cause real bugs with two servers running.
- [ ] Where would you look to find the endpoint that replaces `createListingReservation`?
