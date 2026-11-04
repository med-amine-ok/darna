# BLADUS: spec vs code (raw analysis for the backend blueprint)

Working note, 2026-11-04. Read-only comparison of the recovered specs with the current code in `frontend/` (guest + host app) and `admin/` (back-office). Paths are relative to the repo root `C:\Users\OASIS\Documents\darna\`. Line numbers were checked against the working tree on this date.

Status legend: **implemented** (behaviour present end to end on mock data), **partial** (present but incomplete or only in one app), **missing**, **different** (built, but with a rule that contradicts the spec).

## 0. Source notes (read first)

| Source | What it actually contains | Caveat |
| --- | --- | --- |
| `docs/backend/_sources/darna_spec.md` | The real spec: sections 0 to 10 plus Rules (lines 1-179). | Lines 180-692 are not spec: they are a pasted IDE context dump (an unrelated `senior-frontend` SKILL.md). Ignore them. |
| `docs/backend/_sources/clean_user_spec.md` | Same text as `darna_spec.md` lines 1-179, prefixed by "using this skill @[...]". | Not an independent source. Cited below only as "same as darna_spec". |
| `docs/backend/_sources/usability-report.md` and `admin-usability-report.md` | Byte-identical (`cmp` returns no difference). Both are the **admin** usability report; each file also repeats its own content twice (lines 1-127 and 128-254). | No guest/host usability report was recovered. |
| `frontend/DARNA-AUDIT-REPORT.md` (2026-10-28) | Security/correctness audit. | Many findings are now fixed (server actions, signed session, availability engine). Treat its line numbers as stale. |
| `frontend/AUDIT.md` (2026-10-16) | Older audit. | Mostly superseded; refers to an in-frontend `/admin` that no longer exists. |
| `admin/docs/DATA-MODEL.md` | Admin canonical enums, transitions, money rules. | Section 6 still says guest service fee 7 % and frontend 10 %/8 %; both apps now use 0 (see section 3 below). |
| `frontend/README.md`, `admin/README.md` | Current architecture notes. | `admin/README.md` section 6 describes an individual onboarding flow capped at 2 steps, which contradicts the spec (see D-14). |

Internal numbering bug in the spec: section 1 cross-references are off by one or two ("Section 8" = wallet, really 9; "Section 7" = analytics, really 8; "Section 6's step-editor", really 7; "Section 4 in my numbering" = search fix, really 6). This document uses the real headings.

---

## 1. Requirements extracted from the specs, with code status

Spec file is `darna_spec.md` (abbreviated **DS**) unless stated. `clean_user_spec.md` carries the same requirements at the same line numbers +0.

### 1.1 Host types and organizations (DS section 2.1, 2.2)

| # | Spec ref | Requirement | Status | Evidence in code |
| --- | --- | --- | --- | --- |
| R1 | DS 2 (l.28) | Host-type selection offers 4 single-select cards: Individual, Agency, Hotel, Hostel (icon, label, one-line description). | implemented | `frontend/components/host/onboarding/HostTypeStep.tsx:18,40-47` |
| R2 | DS 2.1 (l.31) | `hostType = "individual" \| "agency" \| "hotel" \| "hostel"`. | implemented | `frontend/types.ts:2`; `admin/lib/types/index.ts:235,258` |
| R3 | DS 2.1 (l.32) | Hotel and Hostel reuse `Organization`/`Membership`; `Organization.businessCategory = "agency" \| "hotel" \| "hostel"`. | implemented (frontend), different (admin) | `frontend/types.ts:297-326,361-376`; `frontend/lib/host-types.ts:5`. Admin models a single `Host` row (with optional `organizationId`) instead: `admin/lib/types/index.ts:255-280` |
| R4 | DS 2.1 (l.33) | `RoomType` child of a property `Listing`, with own price, capacity, amenities, photos, inventory count and availability; search shows one card per property. | implemented | `frontend/types.ts:92-108,149`; per-room inventory in `frontend/lib/data/reservations.ts:167-210`; search card `frontend/components/listing/ListingCard.tsx:165-194` |
| R5 | DS 2.1 (l.34) | `RoomType.bookingUnit = "room" \| "bed"` for per-bed hostel dorms. | implemented | `frontend/types.ts:90,99`; bed = one per guest `frontend/app/actions/bookings.ts:115-119`; pricing `frontend/lib/booking/pricing.ts:212-231` |
| R6 | DS 2.2 (l.37) | Individual goes straight into the listing-creation flow. | implemented | `frontend/app/actions/host.ts:74-100` |
| R7 | DS 2.2 (l.38) | Agency flow: basics, details, team size, invites, review (5 steps). | implemented | `frontend/components/host/BecomeHostFlow.tsx:103,1706-1862` |
| R8 | DS 2.2 (l.39) | Hotel flow: property name, optional star rating, room count, check-in/out policy, hotel amenities, business details, team invites; creates Org `businessCategory: "hotel"`, redirects to workspace. | implemented | `BecomeHostFlow.tsx:101,709-790,1864-2090`; server `frontend/app/actions/host.ts:102-168`; redirect `BecomeHostFlow.tsx:553,583` |
| R9 | DS 2.2 (l.40) | Hostel flow: dorm/private mix, shared facilities, optional age and curfew policy; Org `businessCategory: "hostel"`. | implemented | `BecomeHostFlow.tsx:102,854-872,2320-2340`; `frontend/types.ts:322-324` |
| R10 | DS 2.2 (implied) | New organizations go through verification before trust. | partial | Org starts `pending` (`frontend/app/actions/host.ts:60-64`), but its listings are created `status: "active"` immediately (`frontend/lib/data/listings.ts:309`). Admin has a full host lifecycle (`admin/docs/DATA-MODEL.md` section 2) that the frontend never reads. |
| R11 | DS 1 (l.17) | Remove every place that reads `hostType` as binary individual/agency. | partial | Fixed for commission owner (`frontend/lib/data/reservations.ts:370-371`) and host layout. Remaining binaries: trips only for `hostType === "agency"` (correct by spec, `frontend/app/actions/trips.ts:73`); org pages still live under `/host/agency/*` for hotels and hostels (`frontend/components/host/HostNavbar.tsx:84-85`). |
| R12 | (not in spec, but forced by data) | A user can hold several roles (Karim is individual host, agency owner and hotel owner per `frontend/README.md`). | different | `User.hostType` is a single value (`frontend/types.ts:10`); active org chosen per session (`frontend/lib/server/session.ts:68-75`, `frontend/lib/server/active-org.ts:15`). Karim also has an individual wallet `frontend/lib/data/wallet.ts` (`wal_karim`). See D-1. |

### 1.2 Hotel/Hostel workspace (DS 2.3)

| # | Spec ref | Requirement | Status | Evidence |
| --- | --- | --- | --- | --- |
| R13 | DS 2.3 (l.43) | Hotel/Hostel get the full Host Mode (Today, Bookings, Calendar, Listings, Messages, Team, Settings) with org identity. | implemented | `frontend/components/host/HostNavbar.tsx:59-62,82-97`; layout guard `frontend/app/[locale]/host/layout.tsx:25-28` |
| R14 | DS 2.3 (l.44) | Listings page is a property + room-type manager with per-room status/price/availability quick-edit. | partial | Room-type manager modal `frontend/components/host/HostListingsClient.tsx:103-118,207-209`. No per-room status field on `RoomType` (`frontend/types.ts:92-108`, only `isAvailable?`). |
| R15 | DS 2.3 (l.45) | Calendar drills into per-room-type (and per-bed) availability. | partial | Room-type selector `frontend/components/host/HostCalendarClient.tsx:139,1108-1120`. Blocks and price overrides are per listing, not per room type (`frontend/app/actions/calendar.ts:40,60`; `frontend/lib/data/reservations.ts:232-234`). |
| R16 | DS 2.3 (l.46) | Public card shows "multiple room types, from lowest price"; detail page booking widget is a room-type picker. | implemented | `ListingCard.tsx:165-166,188-194`; `frontend/components/listing/HotelHostelDetailClient.tsx:113-116` |

### 1.3 Booking approval mode (DS 3)

| # | Spec ref | Requirement | Status | Evidence |
| --- | --- | --- | --- | --- |
| R17 | DS 3 (l.52) | Explicit "How do you want to handle booking requests?" step in **all four** onboarding flows. | partial | Individual: `BecomeHostFlow.tsx:1600-1624` (toggle + `approval_mode` config step). Hotel: step 5 `BecomeHostFlow.tsx:2072-2080`. Hostel: step 5 `:2320-2328`. **Agency: missing in the UI**; the config defines `agency_approval` (`frontend/lib/onboarding-config.ts:559-575`) but the hardcoded agency flow never renders it and `handleRegisterAgency` sends no mode (`BecomeHostFlow.tsx:690-703`), so the server defaults to `"instant"` (`frontend/app/actions/host.ts:151`). |
| R18 | DS 3 (l.55) | Instant Book = auto-approved "the moment a guest completes payment". | different | No payment step exists; instant bookings are written `confirmed` + `paymentStatus: "paid"` directly (`frontend/lib/data/reservations.ts:273,291`). |
| R19 | DS 3 (l.56) | Request to Book: host, or for orgs "any team member with permission", approves/declines "within a reasonable window". | partial | Any active member of any role can approve (`frontend/lib/server/authz.ts:25-35`, `frontend/lib/host-types.ts:19` `canManageOperations` = any role). Window = 24 h (`frontend/lib/booking/config.ts:55`), enforced lazily on read (`frontend/lib/booking/lifecycle.ts:12-16,34`; `reservations.ts:51-62`). |
| R20 | DS 3 (l.57) | `bookingApprovalMode` stored on `User` (individual) or `Organization` (org) as the **default for new listings**. | different | Fields exist (`frontend/types.ts:12,325`). But the individual's User value is **derived from** the first listing (`frontend/app/actions/host.ts:92-95`), and neither User nor Org value is applied to listings created later (`frontend/lib/data/listings.ts:280-322` defaults `instantBook: true`). At booking time only the listing is read (`frontend/lib/booking/pricing.ts:276-282`, `frontend/app/actions/bookings.ts:155`). Trips read the org value (`bookings.ts:190-193`). |
| R21 | DS 3 (l.57) | Optional per-listing override ("state whether you did"). | implemented (de facto) | Per-listing `instantBook` toggle `frontend/components/host/HostListingsClient.tsx:171,191,670`; `Listing.bookingApprovalMode` + `instantBook` both exist (`frontend/types.ts:150` and `instantBook?`). Two fields encode one fact (see D-6). |
| R22 | DS 3 (l.58) | Request mode creates `pending` and surfaces on Today and Bookings with Accept/Decline. | implemented | `reservations.ts:273`; action `frontend/app/actions/bookings.ts:253-306`; UI `frontend/components/host/HostTodayClient.tsx`, `HostBookingsClient.tsx` |

### 1.4 Solo (individual) host interface (DS 4)

| # | Spec ref | Requirement | Status | Evidence |
| --- | --- | --- | --- | --- |
| R23 | DS 4.1 (l.67) | Page 1 "My listings" = landing page; thumbnail, title, Live/Paused, price, plain-language upcoming count; tap opens the creation form for edit; "+ Add a new place". | partial | Landing redirect `frontend/app/[locale]/host/page.tsx:20-21`. Edit opens a **modal**, not the creation step form (`HostListingsClient.tsx:171-191,670`). |
| R24 | DS 4.1 (l.68) | Page 2 "Bookings": chronological list, Accept/Decline on card; no Today, Calendar, KPI or analytics pages for solo. | partial | Solo nav = My listings + Bookings (`HostNavbar.tsx:54-56`). `/host/calendar` is not guarded for individuals (`frontend/app/[locale]/host/calendar/page.tsx:14-31`). Mobile bottom nav has 3 tabs incl. Messages (`HostBottomNav.tsx:48-51`). |
| R25 | DS 4.1 (l.69) | Optional read-only month mini-calendar at the top of Bookings. | implemented | `HostBookingsClient.tsx:98,110-111,413-429` |
| R26 | DS 4.1 (l.70) | Messages through the shared Messages system, not a third page. | implemented | `frontend/app/[locale]/host/messages/page.tsx` (shared component) |
| R27 | DS 4.2 (l.74) | Solo settings (payout method, approval toggle) in one simple section reachable from My listings. | partial | Wallet widget on listings page (`HostListingsClient.tsx:28`); approval toggle lives on a separate `/host/settings` page (`HostSettingsClient.tsx:99-100,158,373`) and does not change existing listings (see R20). |
| R28 | DS 4.3 (l.78) | "Switch to hosting" routes solo to 2-page UI, orgs to full UI, based on hostType/businessCategory. | implemented | `frontend/lib/server/host-context.ts:26-36,57`; `frontend/middleware.ts:79` |

### 1.5 Trips (agency-only multi-day product) and departures (DS 5)

| # | Spec ref | Requirement | Status | Evidence |
| --- | --- | --- | --- | --- |
| R29 | DS 5.1 (l.87) | `Trip`: title, cover + gallery, day-by-day itinerary, duration, group size limits, per-person price, inclusions/exclusions, meeting point, cancellation policy, `organizationId` of an Agency. | implemented | `frontend/types.ts:252-293` |
| R30 | DS 5.1 (l.87) | Enforce agency-only at creation; hotels/hostels do not see the option. | implemented | `frontend/app/actions/trips.ts:73-78,97,110`; nav `HostNavbar.tsx:82,94,117` |
| R31 | DS 5.2 (l.90) | 6-step creation: basics, itinerary, logistics, inclusions, **cancellation policy**, review & publish. | partial | 5 steps (`frontend/components/host/agency/TripCreationClient.tsx:56-58`); cancellation policy not a step of its own. |
| R32 | DS 5.2 (l.91) | Trips list with view/edit/pause/delete; publish = live immediately. | implemented | `frontend/components/host/agency/AgencyTripsClient.tsx:8,90,108`. "Pause" = `status: "draft"` (`frontend/types.ts:288`). No moderation (admin moderates trips as listings, see D-9). |
| R33 | DS 5.3 (l.94) | "Trips" as the **4th** segment of the hero switcher (Homes / Experiences / Vehicles / Trips). | different | 5 segments: Homes, Hotels, Experiences, Vehicles, Trips (`frontend/components/home/HomeHero.tsx:33-41`). |
| R34 | DS 5.3 (l.95-96) | Trips feed and detail page (itinerary, agency card, group size + per-person widget). | implemented | `frontend/app/[locale]/page.tsx:60-68,96`; `frontend/components/trips/TripDetailClient.tsx` |
| R35 | DS 5.3 (l.97) | Booking a Trip creates a reservation against the Trip, respects the agency approval mode, shows in guest reservations and agency Bookings. | implemented | `frontend/app/actions/bookings.ts:163-199`; `frontend/lib/data/reservations.ts:340-355`; owner scoping `:75-92` |
| R36 | (implied by "bookable" + group size) | Departures with seat capacity. | partial | `Trip.departureDates: string[]` only (`frontend/types.ts:286`); capacity = `maxGroupSize` per date (`reservations.ts:243-251,346-348`). No departure entity (no per-departure price, status, guide, min-group go/no-go). |
| R37 | (naming) | Guest "Trips" page. | different | `/trips` = guest's own reservations (`frontend/app/[locale]/trips/page.tsx:6,29`) while `/trips/[tripId]` = agency Trip product. Same word, two resources (D-11). |

### 1.6 Search and date overlap (DS 6)

| # | Spec ref | Requirement | Status | Evidence |
| --- | --- | --- | --- | --- |
| R38 | DS 6 (l.103) | Listing appears when its availability window **intersects** the searched window (not containment). | implemented | `frontend/lib/data/listings.ts:147-183` |
| R39 | DS 6 (l.105) | Partial matches show "Available X-Y within your dates" on card and detail. | implemented | Card `ListingCard.tsx:354-361`; detail `frontend/components/listing/ListingReservation.tsx:78-101` |
| R40 | DS 6 (l.105) | Booking widget only allows the true sub-range; server must not allow booking outside availability. | implemented | Client clamp `ListingReservation.tsx:71-106`; server `frontend/lib/booking/availability.ts:88-120` (`OUTSIDE_WINDOW`, `DATES_UNAVAILABLE`) |
| R41 | DS 6 (l.103) | Same logic for hotel/hostel room types. | partial | Property kept if at least one room type is free on every night of the overlap (`reservations.ts:226-241`); no per-room-type partial badge. |
| R42 | DS 6 (l.106) | Same logic for Vehicles and Experiences. | implemented | They are `Listing` rows and go through the same filter (`listings.ts:147-213`). Experiences are single-date; quote uses start only (`:200`). |
| R43 | DS 6 (l.106) | Same logic for **Trips**. | missing | `getTrips` has no date parameter (`frontend/lib/data/trips.ts:11-59`). |
| R44 | (audit) | Exclude booked/blocked nights, back-to-back allowed, timezone-safe date keys. | implemented | `listings.ts:186-192`; `frontend/lib/booking/dates.ts` |

### 1.7 Admin onboarding-step editor (DS 7)

| # | Spec ref | Requirement | Status | Evidence |
| --- | --- | --- | --- | --- |
| R45 | DS 7.1 (l.115) | `OnboardingStepConfig` per hostType: ordered steps, id, title, fields (id, label per locale, type text/number/select/multi-select/image-upload/toggle, required, options), active flag. | different | Two incompatible schemas: frontend `frontend/types.ts:507-572` (spec field names) vs admin `admin/lib/types/index.ts:602-650` (`multiselect`, `file`, `boolean`, `radio`, `location`, `amenities`; `name`/`title`, `order`/`stepNumber`, `key`/`id`). |
| R46 | DS 7.1 (l.116) | Seed from real flows: Individual 12 steps, Agency 5, Hotel and Hostel equivalents. | partial | Frontend seed matches (individual 12 ids, agency 5, hotel 7, hostel 7: `frontend/lib/onboarding-config.ts:7-1045`). Admin seed has **2** individual steps and a hard cap (`admin/lib/mock-data/store.ts:108-140`). |
| R47 | DS 7.2 (l.119) | Admin UI: tab per host type. | implemented | `admin/app/[locale]/(panel)/settings/onboarding/OnboardingClient.tsx` (canonical route; `/onboarding` redirects, `admin/app/[locale]/(panel)/onboarding/page.tsx`) |
| R48 | DS 7.2 (l.120) | Reorder steps; add/remove/reorder/edit **fields** (label, type, required); add/remove steps. | partial | Steps: move up/down, add, remove, toggle required (`OnboardingClient.tsx:95-154`). Fields: count only, no field editor (`:329`). |
| R49 | DS 7.2 (l.121) | Live onboarding flows **read** the admin config (config-driven renderer). | missing | Frontend reads its own defaults or `localStorage` key `darna_onboarding_config_*` (`frontend/lib/onboarding-config.ts:1064-1091`); admin publishes to its own in-memory store (`admin/lib/data/onboarding.ts:15-56`). Only non-core extra fields of the individual flow are rendered dynamically (`BecomeHostFlow.tsx:192-205`) and their values are **never submitted** (`customFieldsData` only goes to the local draft, `:175,423,506`). |
| R50 | DS 7.2 (l.122) | Guard removal of core steps/fields with confirmation; warn on zero steps or removing "price". | missing | `handleRemoveStep` removes with no dialog (`OnboardingClient.tsx:150-154`); server only checks the solo cap (`admin/lib/data/onboarding.ts:23-26`). `isCore` flags exist but are not enforced. |
| R51 | (admin) | Versioned publish with audit. | implemented | `admin/lib/data/onboarding.ts:28-53` |

### 1.8 Admin analytics (DS 8)

| # | Spec ref | Requirement | Status | Evidence |
| --- | --- | --- | --- | --- |
| R52 | DS 8 (l.130) | Every major KPI (revenue, bookings, active listings, avg booking value, growth) filterable by host type, plus 4-way comparison. | partial | Per-host-type table and revenue series `admin/lib/data/analytics.ts:69-120`. Growth rates are hardcoded strings (`:43-50`); headline KPIs are not filterable by type. |
| R53 | DS 8 (l.131) | Same KPIs by vertical (Homes / Vehicles / Experiences / Trips). | partial | "revenueByVertical" counts **listings**, not revenue (`analytics.ts:123-130`); 5 verticals incl. Hotels. |
| R54 | DS 8 (l.132) | Cross-tab host type x vertical, impossible cells shown as a placeholder, not 0. | missing | No matrix/heatmap in `admin/app` or `admin/lib` (grep). |
| R55 | DS 8 (l.134) | New KPIs: total commission, avg commission rate by type, host growth by type, Trips metrics (bookings, revenue, avg group size), Hotel/Hostel occupancy and avg nightly rate. | partial | Commission total and effective rate per type present (`analytics.ts:20-22,88-95`). Occupancy is a constant 78.4 (`:41`); no group size or nightly-rate metrics; period filter is a multiplier, not a date window (`:14`). |
| R56 | DS 8 (l.135) | Organised as Overview / By Host Type / By Vertical / Financial tabs. | different | Tabs are overview / providers / services / wilayas / revenue / reports (`admin/app/[locale]/(panel)/stats/StatsClient.tsx:36,130-160`). |

### 1.9 Wallet, commission, payouts, ledger (DS 9)

| # | Spec ref | Requirement | Status | Evidence |
| --- | --- | --- | --- | --- |
| R57 | DS 9.1 (l.144) | `Wallet` per User (individual) or Organization, DZD. | implemented (frontend), different (admin) | `frontend/types.ts:592-603`; admin wallets keyed by `hostId` (`admin/lib/types/index.ts:526-543`). |
| R58 | DS 9.1 (l.145) | `Transaction`: type recharge / commission_deduction / payout (+ others), signed amount, `relatedBookingId`, `adminUserId`, note, timestamp. | different | Frontend: `recharge`, `commission_deduction`, `payout`, `adjustment` (`frontend/types.ts:574-590`). Admin: `wallet_recharge`, `booking_payment`, `commission_deduction`, `host_payout`, `booking_refund`, `adjustment`, with `balanceAfter`, `reference`, `receiptReference`, `adminActor` name (`admin/lib/types/index.ts:499-520`). |
| R59 | DS 9.1 (l.145) | Append-only ledger; balance derived from the sum. | partial | Frontend recomputes on each append (`frontend/lib/data/wallet.ts:243-245,370-380`) but seed rows carry a literal `balance` (consistent today: e.g. `wal_amina` 50000-8400-9600 = 32000). Admin derives on every read (`admin/lib/data/ledger.ts:21-56`). Neither is a real append-only store. |
| R60 | DS 9.2 (l.148) | Admin "Recharge balance" on host/org detail: amount + optional note, confirm dialog, creates recharge. | different | `admin/lib/data/finance.ts:205-245`: receipt reference is **required**, amount integer 1..10,000,000 DZD, audited. UI `admin/app/[locale]/(panel)/hosts/HostsClient.tsx:160-163,397-410`. |
| R61 | DS 9.2 (l.149) | Balance and transaction history on the admin detail view. | implemented | `admin/lib/data/finance.ts:82-160`; Hosts drawer Money tab. |
| R62 | DS 9.3 (l.152) | Platform Settings: 4 commission rates, one per host type, editable. | implemented | `admin/lib/data/finance.ts:247-280` (validated, audited); defaults 12/15/18/10 in `admin/lib/pricing.ts:19` and `frontend/lib/booking/config.ts:15-20`. |
| R63 | DS 9.3 (l.153) | On every confirmed booking, auto `commission_deduction` = **booking total** x host-type rate. | different | Frontend charges on **subtotal** (no cleaning, fee, taxes) (`frontend/lib/data/reservations.ts:376-396`; `wallet.ts:405-439`), idempotent, reversed on decline/cancel (`reservations.ts:417-423,447`; `wallet.ts:446-476`). Admin never deducts on confirm; seed data only (`admin/lib/mock-data/generator.ts:494-501`). |
| R64 | DS 9.3 (l.154) | Host sees balance and recent transactions read-only. | implemented | `frontend/components/host/HostWalletWidget.tsx`; `frontend/app/actions/wallet.ts:12` |
| R65 | DS 9.3 (l.155) | Negative balance: banner for host, flag for admin incl. dashboard "action needed". | partial | Host banner `HostWalletWidget.tsx:94,127-129`. Admin: negative filter/count (`admin/lib/data/finance.ts:42,61,103,417`; `HostsClient.tsx:249-268`) but **not** in dashboard attention items (`admin/lib/data/analytics.ts:161-203`). |
| R66 | DS 9.1 (l.145) | `payout` transaction type. | partial | Admin payout requests: approve debits wallet, reject needs reason (`admin/lib/data/finance.ts:283-390`). Frontend has the type but no payout request flow (`frontend/app/actions/wallet.ts` has only `getMyWalletAction`). |
| R67 | (admin, beyond spec) | Per-host commission override. | different (extra) | `admin/lib/data/hosts.ts:332-364`; frontend ignores it (rate by type only, `frontend/lib/data/wallet.ts:262-266`). |

### 1.10 Cross-cutting rules (DS Rules)

| # | Spec ref | Requirement | Status | Evidence |
| --- | --- | --- | --- | --- |
| R68 | DS Rules (l.177) | Every string in en/fr/ar, RTL-correct. | partial | Audit: frontend largely unwired (`frontend/DARNA-AUDIT-REPORT.md` section 5). Backend impact: localized fields (onboarding labels) must be stored as `{en,fr,ar}`. |
| R69 | DS Rules (l.178) | Money formatted with DZD convention. | partial | Integer DZD rule `frontend/lib/booking/pricing.ts:55-58`; admin `formatDzd`. Seed notes still use `toLocaleString("fr-DZ")` (`frontend/lib/data/wallet.ts:434`). |

---

## 2. Disagreements (spec vs frontend vs admin)

No winner is picked. "Impact" = what the backend has to decide.

| ID | Topic | Spec says | Frontend does | Admin does | Impact on backend design |
| --- | --- | --- | --- | --- | --- |
| D-1 | Who is a host | `hostType` on User; org types use Organization (DS 2.1) | Single `User.hostType` + active org in session; same person can own an individual wallet and orgs (`frontend/types.ts:10`, `frontend/lib/server/session.ts:68-75`) | One `Host` row per provider with `hostType`, optional `organizationId` (`admin/lib/types/index.ts:255-280`) | Need a canonical "host account" (user-as-host vs organization) that both apps key wallets, listings, commission and moderation on. Decide whether one user can be individual host and org member at once. |
| D-2 | Commission default rates | Per type, values not given (DS 9.3) | 12 / 15 / 18 / 10 (`frontend/lib/booking/config.ts:15-20`) | Same values, duplicated (`admin/lib/pricing.ts:19`, plus hardcoded `defaultRate` in `admin/lib/data/analytics.ts:69-74`) | One `platform_settings` row; analytics must read it, not constants. |
| D-3 | Commission base | "booking total x rate" (DS 9.3 l.153) | Accommodation subtotal only, excl. cleaning and taxes (`frontend/lib/data/reservations.ts:376-379`) | `base x rate` where base = price before fees (`admin/lib/pricing.ts:76-90`); no cleaning fee concept | Pick one base; store `commissionBase`, `commissionRate`, `commissionAmount` on the booking at confirmation time. |
| D-4 | Commission timing and reversal | On every confirmed booking (DS 9.3) | On confirm; reversed fully on decline, pro-rata on guest cancel, fully on host cancel (`reservations.ts:417-447`, `wallet.ts:446-476`) | No automatic deduction; refunds write a proportional negative `booking_refund` (`admin/docs/DATA-MODEL.md` section 3) | Ledger posting rules per booking event (confirm, cancel, refund, dispute) must be specified once. |
| D-5 | Per-host commission override | Not specified (per type only) | Not supported | Supported, audited (`admin/lib/data/hosts.ts:332-364`) | Rate resolution order needed: host override, then type rate. Snapshot the rate on the booking. |
| D-6 | Approval-mode storage | Default on User/Org, optional per-listing override (DS 3) | Listing decides (`bookingApprovalMode` and legacy `instantBook`, `pricing.ts:276-282`); User value derived from first listing; Org value used only for Trips (`bookings.ts:190-193`) | `Host.bookingApprovalMode` (`admin/lib/types/index.ts:274`) plus a platform switch `instantBookingPlatformWide` (`admin/lib/mock-data/store.ts:102`) the frontend never reads | Define resolution: platform switch, then listing override, then owner default. Drop one of `instantBook` / `bookingApprovalMode`. |
| D-7 | Who can approve a request | Host, or org member "with permission" (DS 3) | Any active member, any role (`frontend/lib/host-types.ts:19`, `frontend/lib/server/authz.ts:25-35`) | Admin can move `pending -> confirmed` (`admin/lib/domain/transitions.ts:11`) | Need an explicit permission (e.g. `bookings.respond`) per org role, and whether staff may confirm on behalf of a host. |
| D-8 | Request expiry | "within a reasonable window" (DS 3) | 24 h TTL, lazy expiry on read, payment `voided` (`frontend/lib/booking/config.ts:55`, `lifecycle.ts:12-16`) | No `expired` status at all (`admin/lib/types/index.ts:413-419`) | Need a scheduled job (not lazy-on-read) so expiries also fire notifications and appear in admin. TTL should be a setting. |
| D-9 | Booking statuses | `pending`, `confirmed` (DS 3) | `pending, confirmed, cancelled, completed, declined, expired` (`frontend/types.ts:198-204`) | `pending, confirmed, cancelled, completed, disputed, refunded` (`admin/lib/types/index.ts:413-419`) | Union state machine needed: e.g. keep `declined`/`expired`, add `disputed`; model `refunded` as payment status, not booking status (the frontend already does). |
| D-10 | Listing statuses and moderation | Not specified; trips "live immediately" (DS 5.2) | `active, pending, suspended, draft`; new listings and trips go live at once (`frontend/lib/data/listings.ts:309`, `frontend/app/actions/trips.ts:67`) | 8 canonical statuses with review queue (`admin/docs/DATA-MODEL.md` section 1) | Decide if publish requires approval. If yes, frontend create must write `pending_review`. |
| D-11 | Trips model | Separate `Trip` type owned by an agency (DS 5.1) | Separate `Trip` table; reservation has `tripId` and reuses `listingId = trip.id` (`reservations.ts:349`); departures are a string array | Trips are `Listing` rows with `category: "trip"` moderated like listings (`admin/app/[locale]/(panel)/trips/TripsListClient.tsx:82,155`) | Choose: dedicated `trips` + `trip_departures` tables, or listings with a trip subtype. Reservation needs a proper polymorphic target (listing / room type / trip departure). Also rename the guest `/trips` page or the API resource to avoid the "Trips" collision. |
| D-12 | Verticals | 4: Homes, Experiences, Vehicles, Trips; hotels are "Homes-like" (DS 5.3, 8) | 5 including `hotel` in the type, but hotels are created as `category: "home"` with `businessCategory` (`frontend/types.ts:47-52`; `BecomeHostFlow.tsx:759,860`) | 5 with `hotel` as a real vertical (`admin/lib/types/index.ts:300`) | Analytics "by vertical" will double-count or miss hotels unless one rule is fixed. |
| D-13 | Onboarding field types and schema | `text, number, select, multi-select, image-upload, toggle` (DS 7.1) | Same as spec + `textarea` (`frontend/types.ts:507-514`) | `multiselect, file, boolean, radio, location, amenities` + others; different key names (`admin/lib/types/index.ts:603-650`) | One JSON schema for `onboarding_flows` with versioning; mapping table already in `admin/docs/DATA-MODEL.md` section 5. |
| D-14 | Individual onboarding length | 12 steps; "2 pages" applies to the **host interface**, not onboarding (DS 4.1, 7.1) | 12 steps (`frontend/lib/onboarding-config.ts`) | Capped at 2 steps, enforced on save (`admin/lib/data/onboarding.ts:23-26`, `admin/README.md` section 6) | Admin rule likely misreads DS 4. If kept, the frontend flow cannot be config-driven from admin without losing 10 steps. |
| D-15 | Onboarding config source of truth | Admin config drives live flows (DS 7.2) | Defaults + browser `localStorage` (`frontend/lib/onboarding-config.ts:1064-1091`) | In-memory store, versioned (`admin/lib/data/onboarding.ts`) | Backend must serve the published flow per host type; custom field answers need storage (e.g. JSONB on listing/org application). |
| D-16 | Wallet model | Prepaid: host pays platform offline, admin recharges, commission deducted (DS 9.2) | Prepaid commission wallet only (`frontend/lib/data/wallet.ts`) | Mixed: also `booking_payment` credits (host earnings) and `host_payout` debits (`admin/lib/mock-data/generator.ts:492-501`), i.e. an escrow/payout wallet | Fundamental: does BLADUS collect guest money (escrow, payouts) or not (prepaid commission)? Determines payment integration, ledger accounts and payout flow. The spec itself is mixed: DS 3 "guest completes payment" vs DS 9.2 offline recharge. |
| D-17 | Recharge input | Amount + optional note (DS 9.2) | `rechargeWallet` takes amount + note, any amount (`frontend/lib/data/wallet.ts:290-327`, admin-only, no caller) | Receipt reference required; integer 1..10,000,000; method field (`admin/lib/data/finance.ts:205-219`) | Adopt admin validation; keep `adminUserId` as an id, not a display name (admin stores `adminActor` name). |
| D-18 | Transaction type names | `recharge / commission_deduction / payout` (DS 9.1) | Same + `adjustment` | `wallet_recharge / host_payout / booking_payment / booking_refund` + `commission_deduction`, `adjustment` | Single enum; commission reversal is `adjustment` in frontend vs `booking_refund` share in admin. |
| D-19 | Room type fields | "inventory count and availability" (DS 2.1) | `totalInventory`, `inventoryCount`, `availableInventory`, `basePrice`, `price` (`frontend/types.ts:92-108`) | `totalInventory`, `availableInventory` (`admin/lib/types/index.ts:316-329`) | Keep one inventory column; availability is computed from bookings and blocks, not stored. |
| D-20 | Hero switcher | 4 segments (DS 5.3) | 5 (Hotels added) | n/a | Search API must support a `hotel` vertical filter or a `businessCategory` filter consistently. |
| D-21 | Trip creation steps | 6 incl. cancellation step (DS 5.2) | 5 (`TripCreationClient.tsx:56-58`) | Admin trip wizard separate | Minor; affects only validation order. |
| D-22 | Analytics tabs | Overview / By Host Type / By Vertical / Financial (DS 8) | n/a | overview / providers / services / wilayas / revenue / reports (`StatsClient.tsx:36`) | Reporting API should expose dimensions (host type, vertical, wilaya, period) rather than fixed pages. |

---

## 3. Policy change: no guest service fee, brand BLADUS

Current policy (confirmed in code): guests pay **no** platform fee; BLADUS earns only the host commission. Evidence: `frontend/lib/booking/config.ts:22-34` (`SERVICE_FEE_RATES` all 0), `frontend/lib/booking/pricing.ts:125-130` (per-listing override ignored), `admin/lib/pricing.ts:14-16` (`GUEST_SERVICE_FEE_PERCENT = 0`). Brand is BLADUS; internal `darna` identifiers are intentionally kept (cookies `darna_session`, env `DARNA_SESSION_SECRET`, storage key `darna_onboarding_config_`, global store keys `__darna_wallets__`).

### 3.1 Spec and doc items made obsolete or changed

| Item | Where | Why obsolete / what changes |
| --- | --- | --- |
| "Commission = booking total x rate" | DS 9.3 l.153 | With no guest fee, "total" = subtotal + cleaning + taxes. Code uses subtotal only. The spec wording no longer identifies a unique base (D-3). |
| Guest service fee 7 % (admin) and 10 % / 8 % (frontend) | `admin/docs/DATA-MODEL.md` section 6; `frontend/DARNA-AUDIT-REPORT.md` section 9 table | Both apps are 0 now; the doc is stale. |
| Audit "serviceFee: 0 becomes 10 %" and "commission charged on total incl. BLADUS service fee" | `frontend/DARNA-AUDIT-REPORT.md` section 4 | No longer applicable. |
| `platformSettings.guestServiceFeePercent` | `admin/lib/mock-data/store.ts:100`; `admin/lib/types/index.ts:690` | Dead setting; do not carry into the schema (or keep locked at 0). |
| "Net platform revenue = commission + service fees" | `admin/lib/data/analytics.ts:23-26` | Service-fee term is always 0; platform revenue = commission only. |
| `Listing.serviceFeeRate` admin override | `frontend/types.ts:164` | Ignored on purpose (`pricing.ts:125`). Drop from schema. |
| Reservation `serviceFee` / admin `serviceFeeDzd` columns and their UI lines | `frontend/types.ts:222`; `frontend/components/trips/TripsClient.tsx:458-472`; `admin/app/[locale]/(panel)/bookings/BookingsClient.tsx:581-584`; CSV export `admin/lib/data/bookings.ts:150` | Always 0; keep only if historic bookings need it. |
| Usability KPI "Money paid by guests" vs "DARNA earnings" | `usability-report.md` section 3 and 4.2 | Label must read "BLADUS earnings"; with no guest fee, earnings = commission only, and the "paid by guests" figure equals what hosts are owed before commission. |
| Audit "Total price incl. fees on cards" gap | `frontend/DARNA-AUDIT-REPORT.md` section 10 | Reduced to price + cleaning + taxes; no BLADUS fee line. |
| Brand strings "DARNA" in all spec documents and the usability report | all sources | Read as BLADUS. The usability report's language audit term "DARNA earnings" is now wrong UI copy. |
| Wallet model ambiguity | DS 3 vs DS 9.2 (D-16) | With no guest fee, a prepaid-commission wallet is coherent only if hosts collect guest money themselves; if BLADUS collects payments, commission can be netted from payouts instead and recharges become optional. Needs a product decision. |

---

## 4. Usability-report findings that imply backend requirements

Source: `docs/backend/_sources/usability-report.md` (identical to `admin-usability-report.md`). The report describes the admin console as tested; several claims are UI-only in the code, so each one becomes a backend requirement.

| # | Report claim (section) | Current code | Backend requirement |
| --- | --- | --- | --- |
| U1 | "Needs your attention" cards with counts and "oldest item has been waiting 2 days" (section 3) | Counts are real (`admin/lib/data/analytics.ts:161-203`); oldest-waiting values are hardcoded 3/2/1 days (`admin/app/[locale]/(panel)/DashboardClient.tsx:177-216`) | Queue endpoint returning count + `oldestCreatedAt` per queue (hosts, listings, flagged reviews, disputes, negative wallets, expiring requests). SLA timers need indexed `submittedAt` on each moderated entity. |
| U2 | 8-second Undo toast after approve / hide review (sections 2.1 task 7, 4.3) | Undo only shows a toast "undo requested" (`admin/app/[locale]/(panel)/approvals/ApprovalsClient.tsx:286-290`) | Reversible actions: either a delayed commit window or an inverse transition endpoint, both audited. Transition tables must allow the reverse move. |
| U3 | Bulk approvals with progress "Approving 4 of 12" (section 4.3) | Sequential client loop, no progress, partial failure leaves mixed state (`ApprovalsClient.tsx:342-358`) | Bulk endpoint with per-item results, idempotency keys, and one audit entry per item. |
| U4 | Live result counts "14 listings match in Oran"; hotels by wilaya (tasks 11, 12) | Admin list functions return `{rows,total,facets}` from in-memory filtering (`admin/lib/data/listings.ts:68-210`, `admin/README.md` section 4) | Server-side filtering, pagination and facet counts (wilaya, host type, status, price range) on indexed columns. Exports must cover the full filtered set (already the rule, `admin/docs/DATA-MODEL.md` section 8). |
| U5 | Reject host with pre-set reasons; host "notified politely" (task 2) | Reason required (>= 3 chars) per DATA-MODEL section 1-2; no notification is sent from admin to frontend (`admin/lib/data/hosts.ts` has no notify call) | Reason catalogue table, and a notification/outbox service shared by both apps (email/SMS/in-app). |
| U6 | Request changes on a listing with checkbox templates (task 4) | `changes_requested` exists only in admin; frontend shows it as `pending` (`admin/docs/DATA-MODEL.md` section 1) | Host-facing change-request object (items + notes) readable by the frontend, plus resubmission transition. |
| U7 | Restore a deleted item (task 6) | Soft delete with `statusBeforeDelete` in admin; frontend hard-deletes listings (`frontend/lib/data/listings.ts:343-347`) | Soft delete everywhere (`deletedAt`, `statusBeforeDelete`), since admin restore cannot work on hard-deleted rows. |
| U8 | Booking dispute with guest claim and host response side by side (task 8) | Admin `disputed` state and outcomes; frontend has no dispute state or way to file one (D-9) | Dispute entity with both parties' statements and attachments, created from the guest/host app. |
| U9 | Recharge modal shows current and new balance (task 9) | Admin computes from ledger (`admin/lib/data/finance.ts:221-244`) | Balance read must be consistent with the write (transactional ledger insert with `balanceAfter`), and the frontend wallet must be the same ledger. |
| U10 | Change commission rate in "Money > Commission tiers" (task 10) | Admin store only; frontend has its own rates store (`frontend/lib/data/wallet.ts:239-266`) | One shared settings table; rate snapshot on each booking. |
| U11 | Edit onboarding steps with toggles and drag handles (task 13) | Admin-only effect (R49) | Published onboarding flow served to the frontend; versioned (see D-15). |
| U12 | 4 KPI cards with % change vs last month (section 3) | Trends are hardcoded strings (`admin/lib/data/analytics.ts:43-50`) | Period-over-period aggregates over real date ranges (materialized views or nightly rollups). |
| U13 | "History of actions" (audit log) trusted (section 4.2) | Server-side actor and IP, frozen entries (`admin/docs/DATA-MODEL.md` section 8; `admin/lib/data/audit.ts`) | Persist the audit log append-only in the database (no update/delete grants); include host-side sensitive actions (org role changes, payouts) too. |
| U14 | Filter chip "Suspended/Deleted" (task 6) | Facets by status exist in admin | Status filters must include soft-deleted rows only for permitted roles. |
| U15 | Arabic with Latin digits; Sunday first day; Algerian weekend Fri-Sat (section 5.2) | Formatting rule in `admin/lib/utils/format.ts` | Store dates as date keys / UTC timestamps with Africa/Algiers business timezone; week-based reports start Sunday. |
| U16 | Novice moderator vs power users (Nadia, Karim, Samir) | RBAC roles in `admin/lib/permissions.ts` | Role/permission model in the database with server enforcement (already intended in `admin/README.md` section 3). |

---

## 5. Quick list of open questions for the blueprint

1. Wallet model: prepaid commission (DS 9) vs escrow with payouts (admin seed). Drives payments, ledger accounts and payout flow (D-16).
2. Commission base and rate resolution order, including per-host override (D-3, D-5).
3. Approval mode resolution and who may respond to requests; request TTL as a setting with a real scheduler (D-6, D-7, D-8).
4. Unified booking, listing and host status machines (D-9, D-10, admin `docs/DATA-MODEL.md`).
5. Trips as their own table with departures vs listings subtype, and the `/trips` naming collision (D-11).
6. Vertical taxonomy: is `hotel` a vertical or a business category of `home` (D-12, D-20)?
7. Onboarding config schema and whether the 2-step individual cap is intended (D-13, D-14, D-15).
8. Moderation before publish for listings and trips (D-10).
