# BLADUS frontend inventory (raw analysis notes for the backend blueprint)

Scope: `frontend/` only (guest and host website, Next.js 14 App Router, next-intl en/fr/ar). Admin app not covered.
All paths are relative to `frontend/` unless stated. `file:line` refers to the state of the tree on 2026-11-04 (branch `main`, commit `03fc50c`).
Persistence today: `lib/data/*` over in-memory `globalThis` arrays (`lib/data/_store.ts:14`, `lib/data/_tables.ts:31-62`) seeded from `lib/mock-data/*`; some tables are seeded inline inside `lib/data` (`calendar.ts:13`, `wallet.ts:16`, `reviews.ts:6`, credentials in `auth.ts:39`). Every `lib/data` file carries `// TODO: replace with Supabase query`: the comments predate the Django + PostgreSQL decision.

Legend for status: **built** = UI + server action/data function round trip works end to end on the mock store; **partial** = works but limited or inconsistent; **mocked-only** = UI exists, action is a toast, local state, hardcoded data or `localStorage`.

---

## 1. Feature inventory per actor

### 1.1 Visitor (not logged in)

| Feature | Route(s) / component(s) | Status | Notes |
|---|---|---|---|
| Home editorial feed (homes, experiences, agency trips, hotels/hostels, vehicles, "weekend" featured, wilaya tiles, trust band, host CTA) | `app/[locale]/page.tsx`, `components/home/*` | built | Uses `getListings`, `getVehicles`, `getExperiences`, `getFeaturedListings`, `getTrips`. Card DTO slimming in `lib/server/card-dto.ts`. Category chip filter (`?category=`) is hardcoded string matching on `type`, `amenities`, `city` (`app/[locale]/page.tsx:77-94`). Wilaya tile counts by normalized city (`page.tsx:99-103`). |
| Global search bar (where / when / who) | `components/navbar/Search.tsx`, `navbar/search/{Where,When,Who}Popover.tsx`, `models/SearchModal.tsx` | built | Destinations list is static (`components/search/destinations.ts:14-25`, 10 cities). |
| Search results with side filters, facet counts, map, "show total price" toggle | `app/[locale]/search/page.tsx`, `components/search/SearchResultsClient.tsx`, `SearchFilterSidebar.tsx`, `SearchMap.tsx`, `searchFacets.ts`, `models/FilterModal.tsx`, `hook/useShowTotalPrice.ts` | built | Base search server side (`getListings`), side filters applied server side with the same matchers as the client (`search/page.tsx:62-65`). Map is OpenFreeMap (`components/map/OpenFreeMapLayer.tsx`). Total price toggle stored in `localStorage` `darna_show_total_price`. No sort, no pagination. |
| Vertical tabs (all, home, hotel, vehicle, experience, trip) with counts | same | built | `categoryCounts` computed in `search/page.tsx:67-71`. |
| Listing detail (home, vehicle, experience): gallery, lightbox, info, amenities, house rules, policies, reviews summary, map, similar listings, booking widget preview | `app/[locale]/listings/[listingId]/page.tsx`, `components/listing/ListingClient.tsx`, `ListingHead.tsx`, `ListingInfo.tsx`, `ListingReservation.tsx`, `PhotoLightbox.tsx`, `detail/*` | built | Availability and price overrides built server side and passed as props (`listings/[listingId]/page.tsx:89-90`). "Similar listings" = first 4 of same vertical, not geo based (`page.tsx:93-96`). |
| Hotel / hostel detail with room-type cards and per-room or per-bed booking | `components/listing/HotelHostelDetailClient.tsx`, `listing/hotel/RoomCard.tsx` | built | Chosen when listing has `roomTypes`. |
| Report listing | `ListingReservation.tsx:439`, `HotelHostelDetailClient.tsx:767` | mocked-only | `toast.info(reportSuccess)`; no entity, no action. |
| Share listing / trip | `ListingHead.tsx:69`, `TripDetailClient.tsx:136` | built (client) | Web Share / clipboard only. |
| Trip (agency circuit) detail with departures and seats left | `app/[locale]/trips/[tripId]/page.tsx`, `components/trips/TripDetailClient.tsx` | built | Seats sold per departure server side (`seatsSoldByDeparture`). "Save trip" heart is a toast (`TripDetailClient.tsx:336`): trips cannot be favorited. No "message agency" button. |
| Public host profile (individual) | `app/[locale]/users/[userId]/page.tsx`, `components/profile/UserProfileClient.tsx`, `ProfileHero.tsx` | built | Public projection via `toPublicUser` (`lib/server/dto.ts:12`). Lists the user's individual listings and verified businesses they own. |
| Public organization profile (agency / hotel / hostel) | `app/[locale]/{agencies,hotels,hostels}/[organizationId]/page.tsx`, `components/agency/orgProfilePage.tsx`, `AgencyProfileClient.tsx` | partial | Shows org facts, active team members, active listings, agency trips. Shows unverified orgs too (only a "pending verification" label, `messages/en/agencyPublic.json`). Category mismatch redirects 308 to the right route (`orgProfilePage.tsx:59-61`). No contact form. |
| Help center (FAQ search, categories, helpful vote, contact form) | `app/[locale]/help/page.tsx`, `components/help/HelpClient.tsx` | mocked-only | 6 static articles in messages; feedback vote toast (`HelpClient.tsx:105`); contact form is a `setTimeout` + toast (`HelpClient.tsx:119-125`). |
| Register (email + password) | `components/models/LoginModal.tsx` (`AuthPanel`), `app/api/auth/register/route.ts` | built | Min password 8 (`lib/auth/password-rules.ts:2`). No email verification. |
| Login | `app/[locale]/login/page.tsx`, `LoginForm.tsx`, `LoginModal.tsx`, `app/api/auth/login/route.ts` | built | Demo quick-login buttons with hardcoded password `darna-demo-2026` (`LoginModal.tsx:46-51`). |
| Forgot password, social login, phone login | `LoginModal.tsx:330`, `:360`, `:374` | mocked-only | Toasts (`forgotPasswordSoon`, `socialSimulated`, `phoneSimulated`). |
| Language switch (en / fr / ar, RTL) | `components/navbar/LanguageSwitcher.tsx`, `middleware.ts`, `i18n.ts` | built | 36 namespaces, 3417 keys per locale, full parity en/fr/ar (checked by script). |
| Currency display (DZD + approximate EUR) | `hook/useCurrency.ts`, `lib/currency.ts:1`, `components/common/PriceDisplay.tsx` | partial | Fixed rate `DEFAULT_EUR_TO_DZD = 152.47` (`lib/currency.ts:1`); no live rate source. |
| SEO: sitemap, robots, OG metadata, hreflang | `app/sitemap.ts`, `app/robots.ts`, `lib/site.ts` | built | Sitemap lists active listings, active trips, verified orgs. |

### 1.2 Guest (logged in traveller)

| Feature | Route(s) / component(s) | Status | Notes |
|---|---|---|---|
| Book a home / vehicle / experience (instant or request-to-book, optional message to host) | `ListingReservation.tsx` -> `createBookingAction` | built | Server recomputes quote and validates rules (`app/actions/bookings.ts:78-161`). No payment step: reservation is immediately `paymentStatus: "paid"` for instant bookings with `paymentMethod` defaulted to `"CIB / Edahabia Card"` (`lib/data/reservations.ts:291-293`). |
| Book hotel rooms / hostel beds | `HotelHostelDetailClient.tsx` -> `createBookingAction` | built | Beds: `unitCount` forced to `guestCount` (`bookings.ts:115-118`). |
| Book an agency trip seat on a departure | `TripDetailClient.tsx` -> `createBookingAction({kind:"trip"})` | built | Approval mode from the organization (`bookings.ts:190-193`). |
| Booking success dialog | `components/listing/detail/BookingSuccessDialog.tsx` | built | |
| My trips (upcoming / past / cancelled tabs, receipt dialog, cancel with refund preview) | `app/[locale]/trips/page.tsx`, `components/trips/TripsClient.tsx`, `TripCard.tsx` | built | Refund preview computed client side with the same pure function (`TripsClient.tsx:70-75`), recomputed server side. Receipt "download" is `window.print` of a print area (`TripsClient.tsx:397-508`). "Message host" links to the generic inbox (`TripsClient.tsx:311`), not to a booking thread. |
| Favorites / wishlist (listings only) | `components/HeartButton.tsx`, `hook/useFavorite.ts`, `app/[locale]/favorites/page.tsx`, `components/favorites/FavoritesClient.tsx` | built | Stored as `User.favoriteIds: string[]` (`types.ts:15`). No named wishlists. Favoriting a draft listing id is allowed (`app/actions/favorites.ts:13` uses raw `getListingById`). |
| Messaging (inbox, thread, send, mark read, start thread from listing) | `app/[locale]/messages/page.tsx`, `messages/[conversationId]/page.tsx`, `components/messages/MessagesClient.tsx`, `ListingInfo.tsx:92` | partial | No realtime, no polling. Attachments (`MessagesClient.tsx:762`), conversation settings (`:395`) and options (`:638`) are toasts. Start thread exists only from listing pages (not trips, not bookings). |
| Notifications (dropdown + page, mark one / all read) | `components/navbar/NotificationsDropdown.tsx`, `app/[locale]/notifications/page.tsx`, `components/notifications/NotificationsClient.tsx` | partial | Read and mark-read are real; nothing in the code ever creates a notification (only 4 seeded rows for `usr_yacine`). |
| Own profile view + edit (name, bio, phone, address) | `app/[locale]/profile/page.tsx`, `UserProfileClient.tsx` -> `updateProfileAction` | built | Photo change is a toast (`UserProfileClient.tsx:186`). `profile.json` has unused keys for trips/favorites/security tabs, emergency contact, passport (copy implies features not built). |
| Account settings: personal info | `app/[locale]/settings/page.tsx`, `components/settings/SettingsClient.tsx`, `PersonalSection.tsx` | partial | Legal name, phone, address saved via `updateProfileAction`. Preferred name and mailing address are toasts only (`PersonalSection.tsx:199`, `:277`). Email change is a toast (`:215-218`). |
| Account settings: change password | `SecuritySection.tsx` -> `changePasswordAction` | built | Sessions list / other devices is "coming soon" (`SecuritySection.tsx:140`). |
| Account settings: deactivate account | `SettingsClient.tsx:212` | mocked-only | Toast `deactivateSoon`. |
| Account settings: notifications matrix, payments (saved cards, payout account), languages and currency, privacy (search indexing, data export), taxes (NIF), booking permissions, travel for work, pro hosting | `NotificationsSection.tsx`, `PaymentsSection.tsx`, `LanguagesSection.tsx`, `HostingSections.tsx` | mocked-only | All local `useState` + toasts. Saved cards are hardcoded (CIB `4242`, Edahabia `8890`, BNA RIP) in `PaymentsSection.tsx:21-102`. Currency preference not persisted (`LanguagesSection.tsx:24`). |
| Accessibility (reduced motion) | `AccessibilitySection.tsx`, `components/motion/MotionProvider.tsx` | built (device) | `localStorage` only. |
| Leave a review | none | missing | No UI, no action, no data function writes reviews. |
| Report a user, block a user | none | missing | |
| Become a host entry | `components/navbar/UserMenu.tsx`, `/become-a-host` | built | See 1.3 / 1.4. |

### 1.3 Host, individual

| Feature | Route(s) / component(s) | Status | Notes |
|---|---|---|---|
| Become a host: choose host type | `app/[locale]/become-a-host/page.tsx`, `components/host/BecomeHostFlow.tsx`, `onboarding/HostTypeStep.tsx` | built | 4 host types (`HostTypeStep.tsx`). |
| Individual listing wizard (vertical, category, placement, location, capacity, amenities, photos, title/description, approval mode, price, cancellation policy, review, publish) | `/become-a-host/[step]`, `BecomeHostFlow.tsx`, `DynamicStepFields.tsx`, `lib/onboarding-config.ts` | partial | Draft saved in `localStorage` keyed by user (`lib/client/user-storage.ts:7-41`). Photos are URLs typed by the host; fewer than 4 photos are silently replaced by 4 Unsplash stock photos (`BecomeHostFlow.tsx:628-637`). `city` sent as free text `"<city>, <wilaya>"` and no `commune` (`:659-660`). `placement`, `bedsCount` and admin-configured `customFieldsData` are collected but never sent (`:113-116`, `:175`, payload `:651-672`). Cleaning fee, min/max nights, advance notice, check-in/out times are not asked. Listing goes straight to `status: "active"` (no moderation, `lib/data/listings.ts:309`). |
| Host workspace guard | `app/[locale]/host/layout.tsx`, `lib/server/host-context.ts:47-60`, `middleware.ts:73-85` | built | Individual hosts with 0 listings are sent back to `/become-a-host/1` (`host/layout.tsx:25-30`). Individual hosts never see `/host` "Today": redirected to `/host/listings` (`host/page.tsx:20-22`). |
| My listings (grid / table, stats, search, filter, pause/activate, edit title/price/instant book, manage room types, delete) | `app/[locale]/host/listings/page.tsx`, `components/host/HostListingsClient.tsx` | partial | Edit modal only sends `title`, `price`, `instantBook` (`HostListingsClient.tsx:188-192`) although `updateListing` accepts ~45 fields. No editing of description, photos, location, fees, stay rules, cancellation policy. Delete is a hard delete. |
| Bookings (tabs all/pending/upcoming/current/past/cancelled, search, filter by listing, request timer, accept / decline with reason / cancel, net payout breakdown, mini calendar block/unblock) | `app/[locale]/host/bookings/page.tsx`, `components/host/HostBookingsClient.tsx` | built | Payout via `computeHostPayout` (`HostBookingsClient.tsx:589`, `:842`). "Message guest" links to `/host/messages` generic inbox (`:734`). |
| Calendar (month / week / day / year views, per listing, block / reopen dates and ranges, per-date custom price) | `app/[locale]/host/calendar/page.tsx`, `components/host/HostCalendarClient.tsx` | built | Price overrides refused for room-type listings (`app/actions/calendar.ts:74-76`). Blocking is per listing, not per room type. |
| Messages (host side) | `app/[locale]/host/messages/page.tsx`, `MessagesClient.tsx` | partial | Same component as guest inbox. |
| Prepaid wallet widget (balance, commission rate, ledger, negative balance alert, offline recharge instructions) | `components/host/HostWalletWidget.tsx` (in `HostListingsClient.tsx:378`, `HostTodayClient.tsx:515`, `AgencySettingsClient.tsx:185`) -> `getMyWalletAction` | built (read-only) | Recharge is offline, credited by admin (`messages/en/hostWallet.json`). |
| Host settings: payout methods (CCP / BNA / BEA), payout history | `app/[locale]/host/settings/page.tsx`, `components/host/HostSettingsClient.tsx` | mocked-only | Hardcoded payout methods (`HostSettingsClient.tsx:79-95`) and `PAYOUT_HISTORY` (`:63-66`); add / set default are toasts (`:141`, `:154`). |
| Host settings: identity / upgrade to agency | `HostSettingsClient.tsx:354` | mocked-only | Toast `agencyUpgradeRequested`. |
| Host settings: booking defaults (approval mode, advance notice, prep time, check-in/out, cancellation policy) | `HostSettingsClient.tsx:98-163` | partial | Only approval mode is saved (`setBookingApprovalModeAction`), onto `User.bookingApprovalMode`, which the booking engine never reads. Other defaults are local state. |
| Host settings: communication (SMS, email, auto welcome message) | `HostSettingsClient.tsx:109-111`, `:476` | mocked-only | Toast. |
| Host reservations page (account area variant) | `app/[locale]/reservations/page.tsx`, `components/reservations/ReservationsClient.tsx` | built | Duplicate of host bookings with KPIs (revenue, occupancy). Guests are redirected to `/trips`. |
| Legacy "properties" page | `app/[locale]/properties/page.tsx` | redirect | Redirects to `/host/listings`. |

### 1.4 Host, agency / hotel / hostel team member

| Feature | Route(s) / component(s) | Status | Notes |
|---|---|---|---|
| Agency registration (5 steps: basics, details, team invites, approval mode, review) | `/become-a-host/agency`, `BecomeHostFlow.tsx:676-708` | partial | Agency approval mode step exists in `onboarding-config.ts` (`agencyBookingMode`) but the payload omits `bookingApprovalMode` (`BecomeHostFlow.tsx:692-703`), so agencies always start `instant`. |
| Hotel registration (7 steps incl. star rating, total rooms, check-in/out, amenities, team, approval mode, rooms) | `/become-a-host/hotel`, `BecomeHostFlow.tsx:710-819` | partial | Creates org + one property listing. Room types are hardcoded ("Standard Deluxe Room" 24000 x20, "Executive Sea View Suite" 42000 x8) regardless of input (`:777-813`); property price hardcoded 24000. `hotelTaxId` collected, never sent. |
| Hostel registration (7 steps incl. beds, private rooms, facilities, curfew, age policy) | `/become-a-host/hostel`, `BecomeHostFlow.tsx:821-900` | partial | Same pattern: hardcoded dorm/private room types and price 3200. |
| Org pending verification banner | `components/host/HostLayoutShell.tsx:40-64` | built | Workspace usable while `pending`; `rejected` shows a red banner, nothing is blocked. |
| Today dashboard (KPIs: gross earnings, occupancy, active bookings, rating; pending requests; check-ins today; in-house; recent reviews; upcoming) | `app/[locale]/host/page.tsx`, `components/host/HostTodayClient.tsx`, `lib/host-kpis.ts` | partial | Reviews come from `getReviewsByUserId(ctx.user.id)` which matches `listing.hostUserId === userId` (`lib/data/reviews.ts:112`): seeded org listings have no `hostUserId`, so org reviews are always empty. |
| Listings / bookings / calendar / messages / wallet | same routes as 1.3 | built / partial | Scoped by `organizationId` (`lib/server/host-context.ts:63-67`). Org hosts add listings through the individual wizard; it publishes under the org (`app/actions/host.ts:78-89`). |
| Agency trips list (KPIs, search, filter, publish/pause, delete) | `app/[locale]/host/agency/trips/page.tsx`, `components/host/agency/AgencyTripsClient.tsx` | partial | No edit of an existing trip (no `updateTripAction` for content). |
| Create trip (basics, itinerary, logistics, inclusions, review; save draft or publish) | `app/[locale]/host/agency/trips/new/page.tsx`, `components/host/agency/TripCreationClient.tsx` | built | No `commune`, no coordinates input (derived from city text, `lib/data/trips.ts:85`). |
| Team (roster, invite by email with role, change role, remove, transfer ownership, resend invite, permission matrix) | `app/[locale]/host/agency/team/page.tsx`, `components/host/AgencyTeamClient.tsx` | partial | Invites create `status: "invited"` rows with `userId: null`; there is no accept-invite flow and no email sent, so invited members can never become active. Resend is a toast (`AgencyTeamClient.tsx:179-182`). |
| Organization settings (profile, legal fields, approval mode, delete org) | `app/[locale]/host/agency/settings/page.tsx`, `components/host/AgencySettingsClient.tsx` | built | Legal field change resets verification to `pending` (`lib/data/organizations.ts:269`). Settings form does not expose hotel/hostel operational fields (star rating, amenities, facilities) even though the patch sanitizer accepts check-in/out, curfew, age policy (`app/actions/organizations.ts:52-55`). Delete org is a hard delete plus listings/trips set to draft. |
| Switch between organizations | none | missing | A user can own several orgs (seed: Karim owns 3, Amina owns 2) but there is no switcher; active org = session org or first membership (`lib/server/active-org.ts:22-23`). |

---

## 2. Data inventory

Row counts are seed counts. "Store" = globalThis key.

### 2.1 Enums (all values)

| Enum | Values | Defined |
|---|---|---|
| UserRole | `guest`, `host`, `admin` | `types.ts:1` |
| HostType | `individual`, `agency`, `hotel`, `hostel` | `types.ts:2` |
| CancellationPolicy | `flexible`, `moderate`, `strict` | `types.ts:45` |
| ListingVertical (Listing.category) | `home`, `hotel`, `experience`, `vehicle`, `trip` | `types.ts:47-52` |
| ListingOwnerType | `individual`, `organization` | `types.ts:53` |
| ListingStatus | `active`, `pending`, `suspended`, `draft` (owner may set only `active`, `draft`: `lib/data/_sanitize.ts:124`) | `types.ts:54` |
| Amenity.category | `essentials`, `features`, `location`, `safety` | `types.ts:60` |
| BookingUnit | `room`, `bed` | `types.ts:90` |
| businessCategory (Listing, Organization) | `agency`, `hotel`, `hostel` | `types.ts:147`, `:300` |
| Listing.transmission | `automatic`, `manual` | `types.ts:182` |
| Listing.fuelType | `petrol`, `diesel`, `electric`, `hybrid` | `types.ts:184` |
| approval mode (User, Listing, Organization, Reservation) | `instant`, `request` | `types.ts:12`, `:150`, `:325`, `:240` |
| ReservationStatus | `confirmed`, `pending`, `cancelled`, `completed`, `declined`, `expired` | `types.ts:198-204` |
| PaymentStatus | `paid`, `pending`, `refunded`, `partially_refunded`, `voided` | `types.ts:206-211` |
| Reservation.cancelledBy | `guest`, `host`, `system` (`system` never set in code) | `types.ts:236` |
| Trip.status | `active`, `draft` | `types.ts:283` |
| OrganizationVerificationStatus | `pending`, `verified`, `rejected` | `types.ts:292-295` |
| Organization.teamSizeEstimate | `1`, `2-10`, `11-50`, `50+` | `types.ts:312` |
| MembershipRole | `owner`, `admin`, `manager` | `types.ts:361` |
| MembershipStatus | `active`, `invited`, `removed` (`removed` never set: removal is a hard delete) | `types.ts:362` |
| NotificationType | `booking`, `message`, `price`, `system`, `review` | `types.ts:488-493` |
| TransactionType | `recharge`, `commission_deduction`, `payout`, `adjustment` (`payout` never written) | `types.ts:574-578` |
| Wallet.ownerType | `user`, `organization` | `types.ts:594` |
| Wallet / Transaction currency | `DZD` only | `types.ts:585`, `:598` |
| OnboardingFieldType | `text`, `number`, `textarea`, `select`, `multi-select`, `image-upload`, `toggle` | `types.ts:507-514` |
| PricingModel (not in types.ts) | `per_night`, `per_room_night`, `per_bed_night`, `per_person`, `per_day`, `per_traveller` | `lib/booking/pricing.ts:27-33` |
| Coupon.discountType (admin type, unused here) | `percentage`, `fixed` | `types.ts:477` |
| AuditLogEntry.targetType (admin type, unused here) | `listing`, `booking`, `user`, `review`, `setting`, `organization` | `types.ts:462-468` |
| KpiPeriod | `month`, `30days`, `year` | `lib/host-kpis.ts:10` |
| Action error codes | 66 codes (generic, auth, booking, calendar, messages, orgs, trips) | `lib/action-result.ts:8-83` |

### 2.2 Entities

#### User (`types.ts:4-24`), store `__darna_users__`, seed `lib/mock-data/users.ts` (6 rows)

| Field | Type | Notes |
|---|---|---|
| id | string | `usr_<uuid>` for new users (`lib/data/auth.ts:104`) |
| name | string | max 80 |
| email | string | normalized lower case; unique (checked in `registerUser`) |
| image | string \| null | only local paths `/...` accepted on update (`auth.ts:177`); no upload |
| role | UserRole | `guest` -> `host` when onboarding (`auth.ts:152`) |
| hostType | HostType \| null | one host type per user (cannot be individual and org at once) |
| organizationId | string \| null | "preferred" org; real link is Membership |
| bookingApprovalMode | instant \| request | written by host settings; unused by booking engine |
| createdAt | ISO string | |
| emailVerified | string \| null | never written |
| favoriteIds | string[] | listing ids (wishlist) |
| bio, phone, address | string | max 1000 / 40 / 200 |
| languages | string[] | free text, max 10 |
| isIdentityVerified | boolean | no verification flow |
| yearsHosting, responseRate, responseTime | number, number, string | stored static, should be derived |

Seed rows: `usr_amina` (host individual, also owns 2 hostel orgs), `usr_karim` (host agency, owns agency + 2 hotels, also has 3 individual listings), `usr_yacine` (guest), `usr_admin` (admin), `usr_sofiane` (guest), `usr_leila` (guest). Credentials table (`auth.ts:39-44`, store `__darna_credentials__`): `userId -> "scrypt$salt$hash"`, all seeded users share `DEMO_PASSWORD = "darna-demo-2026"` (`auth.ts:14`).

PublicUser (`types.ts:30-43`) = projection without email, phone, address, favoriteIds, organizationId, bookingApprovalMode.

#### Listing (`types.ts:110-196`), store `__darna_listings__`, seed `lib/mock-data/listings.ts` (18 rows)

| Group | Fields (type) |
|---|---|
| Identity / ownership | id (string), ownerType (ListingOwnerType), hostUserId (string\|null), organizationId (string\|null), businessCategory (agency\|hotel\|hostel), status (ListingStatus), createdAt, updatedAt |
| Content | title, description, subtitle (string), category (ListingVertical), type (free text subtype, e.g. "Villa", "SUV / 4x4", "Boutique Hotel"), imageSrc (string[] URLs) |
| Location | locationValue (string, "City or country code"), city (free text), commune (free text matched to `lib/algeria.ts`), country (always "Algeria" on create), latlng ([lat,lng]) |
| Merchandising | featured, isGuestFavorite (boolean, manual flags), rating, reviewCount, bookingsCount (numbers stored, not derived) |
| Availability window | availableFrom, availableTo (date keys; `availableTo` = last checkout date) |
| Search-only computed | matchedAvailability (MatchedAvailability), quotedTotal (number) |
| Booking | instantBook (boolean), bookingApprovalMode (instant\|request), cancellationPolicy |
| Pricing | price (DZD int; per night / per day / per person by vertical), originalPrice, cleaningFee, serviceFeeRate (ignored), taxRate |
| Stay rules | minNights, maxNights, advanceNoticeDays, checkInTime, checkOutTime ("HH:mm") |
| Home | guestCount, roomCount, bathroomCount, bedroomCount, amenities (string[] snake_case keys), houseRules (string[] free text) |
| Hotel / hostel | hotelStarRating, roomTypes (RoomType[] embedded) |
| Vehicle | make, model, year, transmission, seats, fuelType, pickupLocation, mileagePolicy, insuranceNotes |
| Experience | activityName, durationHours, groupSize, perPersonPrice (unused by pricing), includedItems, experienceLanguages |

Seed composition: 7 homes (`lst_tipaza_villa`, `lst_algiers_casbah`, `lst_casbah_loft`, `lst_oran_seafront`, `lst_constantine_cliff` (request), `lst_tlemcen_andalusian`, `lst_ghardaia_ksar`), 4 vehicles (`lst_toyota_landcruiser`, `lst_nissan_patrol`, `lst_dacia_duster`, `lst_renault_clio`), 3 experiences (`lst_djanet_tassili`, `lst_taghit_dunes`, `lst_casbah_culinary`), 2 hotels (`lst_hotel_el_djazair`, `lst_hotel_royal_oran`), 2 hostels (`lst_casbah_hostel`, `lst_hostel_taghit_desert`). Hotels/hostels use `category: "home"` + `businessCategory`. All `status: "active"`. 10 owned by orgs (`org_atlas_escapes` 6: algiers_casbah, ghardaia_ksar, toyota_landcruiser, nissan_patrol, djanet_tassili, taghit_dunes; one each for the 2 hotels and 2 hostels), 8 by individuals (`usr_amina` 5: tipaza_villa, oran_seafront, tlemcen_andalusian, renault_clio, casbah_culinary; `usr_karim` 3: casbah_loft, constantine_cliff, dacia_duster).

#### RoomType (`types.ts:92-108`), embedded in `Listing.roomTypes` (10 rows across 4 listings)

| Field | Type | Notes |
|---|---|---|
| id | string | kept if `/^[\w-]{1,80}$/` else `rt_<uuid>` (`_sanitize.ts:100`) |
| propertyListingId | string | parent listing |
| name, description, bedsDescription | string | |
| price | number | nightly per room or per bed |
| basePrice | number | mirrors price; pricing reads `basePrice ?? price` (`pricing.ts:72-76`) |
| bookingUnit | room \| bed | |
| totalInventory | number | 1 to 10000 |
| inventoryCount | number | used first by `roomTypeInventory` (`pricing.ts:78-82`) |
| availableInventory | number | never written |
| capacity | number | max guests per unit |
| amenities | string[] | free English text ("King bed", "Privacy curtain"), different vocabulary than listing amenities |
| imageSrc | string[] | |
| isAvailable | boolean | never read by booking engine |

Seed: El Djazair hotel (deluxe x12 @18000, executive x4 @32000, family x3 @40000), Casbah hostel (6-bed mixed bed x18 @3500, 4-bed female bed x8 @4200, private double x4 @9500), Royal Oran (superior x18 @24000, presidential x2 @48000), Taghit hostel (8-bed dorm bed x24 @3200, adobe private x6 @7800).

#### Reservation (`types.ts:213-250`), store `__darna_reservations__`, seed `lib/mock-data/reservations.ts` (9 rows)

| Field | Type | Notes |
|---|---|---|
| id | string | `res_<uuid>` |
| userId | string | guest |
| listingId | string | for trips equals the trip id (`reservations.ts:349`) |
| tripId | string? | set for trip seat bookings |
| startDate, endDate | date key `yyyy-MM-dd` | half-open; experiences start = end; trips end = departure + duration - 1 |
| totalPrice, subtotal, nightlyPrice (average unit price), cleaningFee, serviceFee, taxes | number DZD | snapshot of the server quote |
| guestsCount | number | |
| unitCount | number? | rooms or beds |
| selectedRoomTypeId | string? | |
| status | ReservationStatus | |
| paymentStatus | PaymentStatus | |
| paymentMethod | string | free text, default "CIB / Edahabia Card" |
| approvalMode | instant \| request | |
| expiresAt | ISO | request + 24h |
| guestMessage, declineReason | string | max 2000 / 500 |
| respondedAt, cancelledAt | ISO | |
| cancelledBy | guest \| host \| system | |
| cancellationPolicy | snapshot | |
| refundAmount | number | |
| commissionAmount, commissionRate | number | written after wallet deduction |
| listing, trip, user | populated relations (not stored) | `user` = guest contact projection incl. email + phone (`reservations.ts:17-41`) |

Seed: 4 for `usr_yacine` + others; statuses: confirmed 3, completed 2, cancelled 1, pending 2, declined 1. No trip reservations seeded (wallet ledger references non-existent trip bookings).

#### Trip (`types.ts:261-290`, itinerary `:252-259`), store `__darna_trips__`, seed `lib/mock-data/trips.ts` (4 rows, all `org_atlas_escapes`, all active)

Fields: id, title, slug (unique, unicode-aware `lib/ids.ts:20-40`), description, coverPhoto, gallery[], itinerary[] {day, title, description, activities[], meals, accommodation}, durationDays, maxGroupSize, minGroupSize (not enforced), pricePerPerson, inclusions[], exclusions[], meetingPoint, city (free text, e.g. "Tipaza & Cherchell"), commune (never set by UI), locationValue, latlng (derived from city text), cancellationPolicy, organizationId (agency), status, rating, reviewsCount (stored static), departureDates (date keys[]), createdAt, organization (PublicOrganization, populated).

#### Organization (`types.ts:297-326`), store `__darna_orgs__`, seed `lib/mock-data/organizations.ts` (5 rows, all `verified`)

Fields: id, name, businessCategory, logo, description, businessRegistrationNumber (RC), businessType (free text), businessEmail, businessPhone, address, country, verificationStatus, createdAt, ownerUserId (denormalized from owner membership), teamSizeEstimate, rating, reviewCount (static), hotelStarRating, totalRoomCount, checkInTime, checkOutTime, hotelAmenities[], hostelFacilities[], curfewPolicy, agePolicy, bookingApprovalMode.

Seed: `org_atlas_escapes` (agency, owner karim), `org_el_djazair_hotel` (hotel, karim), `org_royal_oran` (hotel, karim), `org_casbah_hostel` (hostel, amina), `org_taghit_hostel` (hostel, amina). PublicOrganization (`types.ts:329-350`) drops RC, email, phone, address, ownerUserId; adds `isVerified`.

#### Membership (`types.ts:364-376`), store `__darna_memberships__`, seed (6 rows)

Fields: id, organizationId, userId (null while invited), name, email, role, status, invitedBy (userId or `"system"`), createdAt, joinedAt, avatar. Seed: 5 active owners + `mem_sarah_manager` (invited, Atlas). PublicMember (`types.ts:353-359`) drops email.

#### Conversation (`types.ts:378-393`) + Message (`types.ts:395-403`), stores `__darna_conversations__` (3 rows), `__darna_messages__` (6 rows), seed `lib/mock-data/conversations.ts`

Conversation: id, participants (string[2]), listingId (listing or trip id, used as "subject"), lastMessage, lastMessageAt (denormalized), unreadCount (Record<userId, number>), createdAt, populated `listing`, `otherUser`. Message: id, conversationId, senderId, receiverId, text (max 4000), createdAt, read.

#### Notification (`types.ts:495-505`), store `__darna_notifications__`, seed `lib/mock-data/notifications.ts` (4 rows, all `usr_yacine`)

Fields: id, userId, type, title, message (English text stored, not i18n keys), link (relative path), read, createdAt, timestamp (unused duplicate).

#### Review (`types.ts:71-88`), NOT in `_tables`: module const `mockReviews` in `lib/data/reviews.ts:6` (5 rows, read-only)

Fields: id, listingId, userId, rating, cleanliness, accuracy, communication, location, value (numbers), comment, createdAt, embedded `user {id,name,image}` snapshot. No reservationId, no host reply, no trip reviews.

#### DateAvailabilityOverride (`types.ts:405-412`), store `__darna_calendar_overrides__`, seed inline `lib/data/calendar.ts:13-17` (3 rows on `lst_tipaza_villa`)

Fields: id, listingId, date (date key), isBlocked, customPrice, note. Unique per (listingId, date) by convention (`calendar.ts:45-52`); rows with neither block nor price are pruned.

#### Wallet + Transaction (`types.ts:580-603`), store `__darna_wallets__`, seed inline `lib/data/wallet.ts:16-232` (5 wallets, 15 transactions)

Wallet: id (`wal_<ownerId>` for new), ownerType, ownerId, ownerName, hostType, currency, balance (stored, recomputed as sum), transactions (embedded array, newest first), createdAt, updatedAt. Transaction: id (`tx_rec_`, `tx_com_`, `tx_rev_` prefixes), walletId, type, amount (signed), currency, relatedBookingId, adminUserId, note (free text), timestamp. Seed wallets: `wal_amina` (32000), `wal_atlas_escapes` (145000), `wal_el_djazair` (310000), `wal_casbah_hostel` (-4200, intentionally negative), `wal_karim` (40000). No wallet for `org_royal_oran` / `org_taghit_hostel` (created lazily on first commission, `wallet.ts:331-367`).

#### Commission rates (`HostTypeCommissionRates`, `types.ts:605-610`), store `__darna_commission_rates__` (`wallet.ts:239-244`)

`{individual: 12, agency: 15, hotel: 18, hostel: 10}` percent, defaults in `lib/booking/config.ts:15-20`.

#### Session (not an entity in types.ts): `SessionPayload` (`lib/auth/session-token.ts:19-27`)

`{sid, userId, hostType, organizationId, exp}` HMAC-SHA256 signed cookie `darna_session`, 30 days. Revocation list store `__darna_revoked_sessions__` (`lib/server/session.ts:22-25`). Extra non-identity cookie `darna_mode` = `host` \| `traveler`.

#### Onboarding config (`types.ts:507-572`), `lib/onboarding-config.ts`

Per host type step/field definitions (trilingual labels, required, options, order, isCore). Stored in browser `localStorage` (`darna_onboarding_config_<hostType>`, `onboarding-config.ts:1064-1092`), editable from the admin app on the same browser only.

#### Static reference data

| Data | File | Count |
|---|---|---|
| Wilayas (code, name, nameEn, nameAr) | `lib/algeria.ts:14-73` | 58 |
| Communes (name, nameAr, wilaya) | `lib/algeria.ts:81-95` | 13 |
| City -> wilaya map | `lib/algeria.ts:98-111` | 12 |
| Popular destinations (key, name, wilaya, latlng) | `components/search/destinations.ts:14-25` | 10 |
| City coordinates for trips | `lib/trip-coordinates.ts:2-24` | 23 keys |
| Amenity filter groups | `components/search/searchFacets.ts:127-148` | 20 |
| Amenity labels | `messages/en/amenities.json` | 23 |
| Amenity icons | `components/listing/detail/amenityIcons.ts` | ~35 keys |
| Cancellation policy tiers | `lib/booking/cancellation.ts:45-72` | 3 |
| Help articles | `messages/*/help.json` | 6 |

Admin-only types present but unused in this app: `AdminKPI` (`types.ts:442`), `AuditLogEntry` (`:457`), `Coupon` (`:474`), `Amenity` and `Category` interfaces (`:56`, `:63`; type names collide only with local identifiers).

### 2.3 Relations as the UI uses them

| From | To | How | Where |
|---|---|---|---|
| Listing | User (host) | `hostUserId` | listing page host card (`listings/[listingId]/page.tsx:76-78`) |
| Listing | Organization | `organizationId` | host profile link (`:80-85`), ownership |
| Listing | RoomType | embedded array | hotel/hostel detail, booking |
| Listing | DateAvailabilityOverride | `listingId` | calendar, availability, pricing |
| Listing | Review | `listingId` | listing page |
| Reservation | User (guest) | `userId` | host booking views (with email + phone) |
| Reservation | Listing or Trip | `listingId` / `tripId` | both directions; trip bookings put trip id in `listingId` too |
| Reservation | RoomType | `selectedRoomTypeId` | availability per room type |
| Reservation | Wallet Transaction | `Transaction.relatedBookingId` | commission ledger |
| Trip | Organization (agency) | `organizationId` | trip page, org profile |
| Organization | User | `ownerUserId` + Membership rows | owner resolution (messages go to owner) |
| Membership | User | `userId` (null while invited), `email` | team page |
| Conversation | User x2 | `participants` | inbox |
| Conversation | Listing / Trip | `listingId` | thread header |
| User | Listing | `favoriteIds[]` | favorites |
| Wallet | User or Organization | `ownerType` + `ownerId` | wallet widget |

---

## 3. lib/data and server action function inventory

Conventions: "R" read, "W" write. "Auth" column describes checks performed inside the function itself; most `lib/data` functions perform none and rely on the caller. Proposed endpoints are REST under `/api/v1`.

### 3.1 `lib/data/_store.ts`, `_tables.ts`, `_sanitize.ts` (infrastructure)

| Function | Inputs | Output | R/W | Callers | Auth | Future backend |
|---|---|---|---|---|---|---|
| `globalStore<T>` (`_store.ts:14`) | key: string, init: () => T | T | W (init) | all stores, `lib/server/session.ts:22` | none | Django ORM / PostgreSQL tables |
| `removeWhere<T>` (`_store.ts:23`) | items: T[], predicate | number | W | calendar, listings, organizations, trips | none | ORM `delete()` |
| `clone<T>` (`_store.ts:38`) | value | T | R | all data modules | none | serializer |
| `delay` (`_store.ts:44`) | ms | Promise<void> | none | data modules (fake latency) | none | drop |
| table consts (`_tables.ts:31-62`) | n/a | arrays | n/a | lib/data only | none | models: User, Listing, Organization, Membership, Reservation, Trip, Conversation, Message, Notification |
| `ListingInputError` (`_sanitize.ts:9`) | code, params | Error | n/a | `actions/host.ts`, `actions/listings.ts` | n/a | DRF `ValidationError` with error code |
| `isAllowedImageUrl` (`_sanitize.ts:47`) | unknown | boolean | R | `_sanitize`, `actions/trips.ts` | allowlist of 6 hosts + local paths | media upload + storage URL validation |
| `OWNER_SETTABLE_LISTING_STATUSES` (`_sanitize.ts:124`) | n/a | `["active","draft"]` | n/a | `_sanitize` only | n/a | serializer choice restriction |
| `sanitizeListingInput` (`_sanitize.ts:130`) | input: unknown, listingId: string | Partial<Listing> | R | `createListing`, `updateListing`, `actions/host.ts:128` (pre-validation) | whitelist, price range, max>=min nights | DRF `ListingWriteSerializer` |

### 3.2 `lib/data/auth.ts`

| Function | Inputs | Output | R/W | Callers | Auth | Future backend |
|---|---|---|---|---|---|---|
| `DEMO_PASSWORD` (`:14`) | const | string | n/a | (duplicated literal in `components/models/LoginModal.tsx:47`) | n/a | remove; seed fixtures only |
| `getUserById` (`:53`) | userId: string | User \| null | R | `lib/server/session.ts:49`, `listings/[listingId]/page.tsx:76`, `users/[userId]/page.tsx:22` | none (full record incl. email) | `GET /api/v1/users/{id}` (public projection), `GET /api/v1/me` (private) |
| `getUsersByIds` (`:59`) | userIds: string[] | User[] | R | none | none | internal |
| `getUserByEmail` (`:63`) | email: string | User \| null | R | none | none | internal (invite linking) |
| `verifyCredentials` (`:70`) | email, password | User \| null | R | `app/api/auth/login/route.ts:23` | scrypt timing-safe, dummy hash for unknown emails | `POST /api/v1/auth/login` |
| `registerUser` (`:85`) | {name, email, password} | RegisterResult | W | `app/api/auth/register/route.ts:21` | email regex, min 8 chars, unique email | `POST /api/v1/auth/register` |
| `changePassword` (`:124`) | userId, currentPassword, newPassword | ChangePasswordResult | W | `actions/account.ts:28` | verifies current password | `POST /api/v1/me/password` |
| `updateUserHostStatus` (`:143`) | userId, {hostType?, organizationId?, bookingApprovalMode?} | User \| null | W | `actions/host.ts:92,164,182`, `actions/organizations.ts:84` | none | internal service (onboarding); `PATCH /api/v1/me/host-preferences` |
| `updateUserProfile` (`:162`) | userId, {name?, bio?, phone?, address?, languages?, image?} | User \| null | W | `actions/account.ts:54` | field whitelist and length caps | `PATCH /api/v1/me` |
| `setUserFavorite` (`:182`) | userId, listingId, favorite: boolean | string[] \| null | W | `actions/favorites.ts:15` | none | `PUT/DELETE /api/v1/me/favorites/{listingId}` |

### 3.3 `lib/data/listings.ts`

| Function | Inputs | Output | R/W | Callers | Auth | Future backend |
|---|---|---|---|---|---|---|
| `isPublicListing` (`:14`) | Pick<Listing,"status"> | boolean | R | `getListings`, `getFeaturedListings`, `getPublicListingById`, `actions/bookings.ts:97`, `actions/messages.ts:65` | n/a | queryset filter `status='active'` |
| `getListings` (`:18`) | SearchParams? (destination, checkIn/startDate, checkOut/endDate, guests, vertical, category, minPrice, maxPrice, propertyType, amenities, instantBook (ignored)) | Listing[] (with `matchedAvailability`, `quotedTotal` when dates) | R (also triggers reservation settle via availability) | `app/[locale]/page.tsx:64`, `search/page.tsx:57-58`, `listings/[listingId]/page.tsx:93`, `users/[userId]/page.tsx:90`, `app/sitemap.ts:24`, `experiences.ts`, `vehicles.ts` | active only | `GET /api/v1/listings?vertical=&destination=&check_in=&check_out=&guests=&min_price=&max_price=&property_type=&amenities=&wilaya=&commune=...` (+ facets endpoint) |
| `getListingById` (`:221`) | id | Listing \| null | R | `actions/bookings.ts:94`, `actions/calendar.ts:34`, `actions/favorites.ts:13`, `actions/listings.ts:27,51`, `actions/messages.ts:64`, `getPublicListingById` | none (any status) | internal; `GET /api/v1/host/listings/{id}` for owners |
| `getPublicListingById` (`:231`) | id, canSeeUnpublished?(listing) | Listing \| null | R | `listings/[listingId]/layout.tsx:19`, `listings/[listingId]/page.tsx:35,69` | active, or owner via callback | `GET /api/v1/listings/{id}` |
| `getFeaturedListings` (`:241`) | vertical? | Listing[] | R | `app/[locale]/page.tsx:67` | active + `featured` | `GET /api/v1/listings?featured=true` |
| `getHostListings` (`:256`) | {userId?, organizationId?} | Listing[] (all statuses) | R | `host/layout.tsx:26`, `host/listings/page.tsx:14`, `host/bookings/page.tsx:20`, `host/calendar/page.tsx:19`, `host/page.tsx:28`, `reservations/page.tsx:40`, `profile/page.tsx:29`, `components/agency/orgProfilePage.tsx:65` | none (caller scopes) | `GET /api/v1/host/listings` (owner scoped); public org listings `GET /api/v1/organizations/{id}/listings` |
| `createListing` (`:282`) | owner: ListingOwner {hostUserId, organizationId?, businessCategory?}, input: unknown | Listing | W | `actions/host.ts:79,91,157` | whitelist; server sets id/owner/stats; defaults `status:"active"` | `POST /api/v1/host/listings` |
| `updateListing` (`:332`) | id, input: unknown | Listing \| null | W | `actions/listings.ts:33` | whitelist only (no ownership) | `PATCH /api/v1/host/listings/{id}` |
| `deleteListing` (`:346`) | id | boolean | W (hard delete) | `actions/listings.ts:55` | none | `DELETE /api/v1/host/listings/{id}` (soft delete / archive) |

### 3.4 `lib/data/reservations.ts`

| Function | Inputs | Output | R/W | Callers | Auth | Future backend |
|---|---|---|---|---|---|---|
| `getReservations` (`:94`) | {userId?, listingId?, tripId?, hostId?, organizationId?, status?} | Reservation[] populated (guest email/phone included) | R + W (settles every row: expired / completed, `:105`) | `trips/page.tsx:29` (userId), `host/page.tsx:27`, `host/bookings/page.tsx:19`, `host/calendar/page.tsx:20`, `reservations/page.tsx:39` (hostId/orgId) | none | `GET /api/v1/me/reservations`, `GET /api/v1/host/reservations?status=&listing=` |
| `getReservationById` (`:125`) | id | Reservation \| null | R + W (settle) | `actions/bookings.ts:228,265` | none | `GET /api/v1/reservations/{id}` (guest or host scoped) |
| `getReservationOwner` (`:132`) | reservationId | {hostUserId, organizationId, guestUserId} \| null | R | `actions/bookings.ts:224`, `lib/server/authz.ts:28` | none | internal permission helper |
| `ReservationConflictError` (`:150`) | message | Error | n/a | `actions/bookings.ts:203,301` | n/a | HTTP 409 with code |
| `unavailableNights` (`:202`) | listing, roomTypeId?, now? | Set<DateKey> | R | `actions/bookings.ts:132`, `getListingAvailability`, `isListingFreeForRange` | none | internal availability service |
| `getListingAvailability` (`:213`) | listing | ListingAvailability {today, unavailable[], unavailableByRoomType} | R | `listings/[listingId]/page.tsx:89` | none | `GET /api/v1/listings/{id}/availability?from=&to=` |
| `isListingFreeForRange` (`:227`) | listing, start, end | boolean | R | `getListings` (`listings.ts:191`) | none | SQL availability filter in search |
| `seatsSoldByDeparture` (`:244`) | tripId, now? | Record<DateKey, number> | R | `actions/bookings.ts:177`, `trips/[tripId]/page.tsx:83` | none | `GET /api/v1/trips/{id}/departures` (seats left) |
| `createListingReservation` (`:310`) | listingId, CreateReservationInput & {selectedRoomTypeId?, unitCount?} | Reservation | W (+ wallet commission when confirmed) | `actions/bookings.ts:147` | capacity check atomic in-process | `POST /api/v1/reservations` (transaction + row locks / exclusion constraint) |
| `createTripReservation` (`:341`) | tripId, CreateReservationInput | Reservation | W (+ commission) | `actions/bookings.ts:184` | seat check | `POST /api/v1/reservations` (kind=trip) |
| `cancelReservation` (`:402`) | id, by: guest\|host, refund: RefundBreakdown | Reservation \| null | W (+ commission reversal) | `actions/bookings.ts:241,288` | none (trusts caller refund) | `POST /api/v1/reservations/{id}/cancel` |
| `respondToRequest` (`:428`) | id, decision: confirmed\|declined, {declineReason?} | Reservation \| null | W (+ commission charge or reversal) | `actions/bookings.ts:274` | must be pending after settle | `POST /api/v1/host/reservations/{id}/accept` / `/decline` |
| internal: `guestForHost` (`:17`), `tripFor` (`:43`), `settle` (`:51`), `populate` (`:64`), `ownedInventory` (`:76`), `activeListingReservations` (`:157`), `reservationRoomTypeId` (`:162`), `usageByNight` (`:171`), `capacityOf` (`:192`), `buildReservation` (`:269`), `commissionOwner` (`:357`), `commissionBase` (`:377`), `chargeCommission` (`:381`) | | | | | | domain services |

### 3.5 `lib/data/calendar.ts`

| Function | Inputs | Output | R/W | Callers | Auth | Future backend |
|---|---|---|---|---|---|---|
| `getAvailabilityOverrides` (`:23`) | listingId | DateAvailabilityOverride[] | R | `setDatesBlocked`, `setDatePrice` | none | `GET /api/v1/host/listings/{id}/calendar` |
| `getOverridesForListings` (`:27`) | listingIds[] | DateAvailabilityOverride[] | R | `host/bookings/page.tsx:24`, `host/calendar/page.tsx:23` | none | `GET /api/v1/host/calendar?listing_ids=&from=&to=` |
| `blockedDateKeys` (`:33`) | listingId | Set<DateKey> | R (sync) | `reservations.ts:204,233,320` | none | internal |
| `priceOverridesFor` (`:37`) | listingId | PriceOverrides | R (sync) | `actions/bookings.ts:143`, `listings/[listingId]/page.tsx:90`, `listings.ts:211` | none | internal pricing service |
| `setDatesBlocked` (`:58`) | listingId, dates[], blocked | overrides[] | W | `actions/calendar.ts:54` | none | `PUT /api/v1/host/listings/{id}/calendar/blocks` |
| `setDatePrice` (`:68`) | listingId, dates[], price \| null | overrides[] | W | `actions/calendar.ts:78` | none | `PUT /api/v1/host/listings/{id}/calendar/prices` |

### 3.6 `lib/data/conversations.ts`

| Function | Inputs | Output | R/W | Callers | Auth | Future backend |
|---|---|---|---|---|---|---|
| `getConversations` (`:27`) | userId | Conversation[] (with listing + otherUser public fields) | R | `messages/page.tsx:27`, `messages/[conversationId]/page.tsx:38`, `host/messages/page.tsx:14` | participant filter | `GET /api/v1/conversations` |
| `getConversationForParticipant` (`:37`) | id, viewerId | Conversation \| null | R | `messages/[conversationId]/page.tsx:32` | participant | `GET /api/v1/conversations/{id}` |
| `isConversationParticipant` (`:47`) | conversationId, userId | boolean | R | `actions/messages.ts:21,43` | n/a | permission class |
| `getMessages` (`:56`) | conversationId | Message[] | R | `actions/messages.ts:24`, `messages/page.tsx:31`, `messages/[conversationId]/page.tsx:39`, `host/messages/page.tsx:18` | none (caller checks) | `GET /api/v1/conversations/{id}/messages?cursor=` |
| `sendMessage` (`:63`) | {conversationId, senderId, text} | Message \| null | W | `actions/messages.ts:35` | sender must be participant | `POST /api/v1/conversations/{id}/messages` |
| `markConversationAsRead` (`:95`) | conversationId, userId | void | W | `actions/messages.ts:46` | none | `POST /api/v1/conversations/{id}/read` |
| `findOrCreateConversation` (`:112`) | {userId, otherUserId, listingId?} | Conversation | W | `actions/messages.ts:82` | none | `POST /api/v1/conversations` |

### 3.7 `lib/data/notifications.ts`, `favorites.ts`, `experiences.ts`, `vehicles.ts`, `reviews.ts`

| Function | Inputs | Output | R/W | Callers | Auth | Future backend |
|---|---|---|---|---|---|---|
| `getNotifications` (`notifications.ts:8`) | userId | Notification[] | R | `actions/notifications.ts:16`, `notifications/page.tsx:22` | user scoped | `GET /api/v1/me/notifications` |
| `markNotificationAsRead` (`notifications.ts:16`) | id, userId | boolean | W | `actions/notifications.ts:23` | owner | `POST /api/v1/me/notifications/{id}/read` |
| `markAllNotificationsAsRead` (`notifications.ts:29`) | userId | void | W | `actions/notifications.ts:30` | user scoped | `POST /api/v1/me/notifications/read-all` |
| `getFavoriteListings` (`favorites.ts:7`) | userId | Listing[] (any status) | R | `favorites/page.tsx:29` | none | `GET /api/v1/me/favorites` |
| `getExperiences` (`experiences.ts:6`) | none | Listing[] | R | `app/[locale]/page.tsx:66` | active | `GET /api/v1/listings?vertical=experience` |
| `getVehicles` (`vehicles.ts:6`) | none | Listing[] | R | `app/[locale]/page.tsx:65` | active | `GET /api/v1/listings?vertical=vehicle` |
| `mockReviews` (`reviews.ts:6`) | const | Review[] | n/a | module only | n/a | Review table |
| `getReviewsByListingId` (`reviews.ts:104`) | listingId | Review[] | R | `listings/[listingId]/page.tsx:86` | none | `GET /api/v1/listings/{id}/reviews` |
| `getReviewsByUserId` (`reviews.ts:109`) | userId | Review[] (written by the user + on listings they host individually) | R | `host/page.tsx:29`, `profile/page.tsx:30`, `users/[userId]/page.tsx:90` | none | `GET /api/v1/users/{id}/reviews?role=author\|host`, `GET /api/v1/host/reviews` |

### 3.8 `lib/data/organizations.ts`

| Function | Inputs | Output | R/W | Callers | Auth | Future backend |
|---|---|---|---|---|---|---|
| `ORGANIZATION_LEGAL_FIELDS` (`:14`) | const | name, businessRegistrationNumber, businessType, businessCategory, address, country | n/a | `updateOrganization` | n/a | serializer: re-verification trigger fields |
| `ORGANIZATION_EDITABLE_FIELDS` (`:24`) | const | legal + logo, description, businessEmail, businessPhone, teamSizeEstimate, hotelStarRating, totalRoomCount, checkInTime, checkOutTime, hotelAmenities, hostelFacilities, curfewPolicy, agePolicy, bookingApprovalMode | n/a | `updateOrganization` | n/a | serializer fields |
| `getOrganizationById` (`:44`) | id | Organization \| null (full, private) | R | `lib/server/active-org.ts:24`, `actions/messages.ts:68,74`, `listings/[listingId]/page.tsx:80`, `users/[userId]/page.tsx:94`, `orgProfilePage.tsx:26`, `trips.ts:55,65` | none | `GET /api/v1/organizations/{id}` (public), `GET /api/v1/host/organization` (private) |
| `getOrganizations` (`:50`) | none | Organization[] | R | `app/sitemap.ts:24` | none | `GET /api/v1/organizations?verified=true` |
| `getOrganizationMembers` (`:55`) | organizationId | Membership[] (with emails) | R | `actions/organizations.ts:109,178`, `host/agency/team/page.tsx:22`, `orgProfilePage.tsx:64` | none | `GET /api/v1/host/organization/members`; public `GET /api/v1/organizations/{id}/members` |
| `getMembershipsForUser` (`:61`) | userId | Membership[] active | R | `lib/server/active-org.ts:19`, `users/[userId]/page.tsx:90` | n/a | `GET /api/v1/me/memberships` |
| `getMembership` (`:65`) | organizationId, userId | Membership \| null | R | none | n/a | permission helper |
| `getMemberById` (`:72`) | memberId | Membership \| null | R | `actions/organizations.ts:135,152,169` | none | internal |
| `createOrganization` (`:77`) | {name, businessCategory, ..., owner {userId,name,email}, invitedMembers[]} | Organization | W (org + owner membership + invites) | `actions/host.ts:131` | forces `verificationStatus:"pending"` | `POST /api/v1/organizations` |
| `updateOrganizationVerification` (`:173`) | id, status | Organization \| null | W | none (admin) | none | admin: `POST /api/v1/admin/organizations/{id}/verification` |
| `addOrganizationMember` (`:184`) | {organizationId, name, email, role: admin\|manager, invitedBy} | Membership | W | `actions/organizations.ts:114` | none | `POST /api/v1/host/organization/invitations` |
| `updateOrganizationMemberRole` (`:208`) | memberId, role | Membership \| null | W | `actions/organizations.ts:141` | none | `PATCH /api/v1/host/organization/members/{id}` |
| `transferOrganizationOwnership` (`:220`) | organizationId, newOwnerMemberId | boolean | W (demotes all owners to admin) | `actions/organizations.ts:175` | target active with userId | `POST /api/v1/host/organization/transfer-ownership` |
| `removeOrganizationMember` (`:238`) | memberId | boolean | W (hard delete) | `actions/organizations.ts:158` | none | `DELETE /api/v1/host/organization/members/{id}` |
| `updateOrganization` (`:247`) | id, Partial<editable> | Organization \| null | W (legal change -> `pending`) | `actions/organizations.ts:65` | field whitelist | `PATCH /api/v1/host/organization` |
| `deleteOrganization` (`:274`) | id | boolean | W (hard delete org + memberships, listings/trips -> draft) | `actions/organizations.ts:81` | none | `DELETE /api/v1/host/organization` (soft) |

### 3.9 `lib/data/trips.ts`

| Function | Inputs | Output | R/W | Callers | Auth | Future backend |
|---|---|---|---|---|---|---|
| `getTrips` (`:20`) | TripSearchParams {organizationId?, destination?, city?, status? active\|draft\|all, maxPrice?, duration? (ignored)} | Trip[] + public org | R | `app/[locale]/page.tsx:68`, `search/page.tsx:59`, `host/agency/trips/page.tsx:22` (status all), `orgProfilePage.tsx:66`, `app/sitemap.ts:24` | default active only | `GET /api/v1/trips?destination=&max_price=`; `GET /api/v1/host/trips` |
| `getTripById` (`:61`) | idOrSlug | Trip \| null (any status) | R | `actions/bookings.ts:166`, `actions/messages.ts:71`, `actions/trips.ts:98,111`, `getPublicTripById` | none | internal |
| `getPublicTripById` (`:70`) | idOrSlug, canSeeUnpublished? | Trip \| null | R | `trips/[tripId]/layout.tsx:19`, `trips/[tripId]/page.tsx:27` | active or owner | `GET /api/v1/trips/{id_or_slug}` |
| `createTrip` (`:82`) | TripInput | Trip | W | `actions/trips.ts:90` | none (slug + coords derived) | `POST /api/v1/host/trips` |
| `updateTrip` (`:95`) | id, Partial<TripInput> | Trip \| null | W (`Object.assign` raw) | `actions/trips.ts:102` | none | `PATCH /api/v1/host/trips/{id}` |
| `deleteTrip` (`:102`) | id | boolean | W (hard delete) | `actions/trips.ts:114` | none | `DELETE /api/v1/host/trips/{id}` |

### 3.10 `lib/data/wallet.ts`

| Function | Inputs | Output | R/W | Callers | Auth | Future backend |
|---|---|---|---|---|---|---|
| `DEFAULT_COMMISSION_RATES` re-export (`:14`) | const | rates | n/a | n/a | n/a | PlatformSettings |
| `getCommissionRates` (`:250`) | none | HostTypeCommissionRates | R | none (admin) | none | `GET /api/v1/admin/settings/commission-rates` |
| `saveCommissionRates` (`:255`) | Partial<rates> | rates | W | none (admin) | none | `PATCH /api/v1/admin/settings/commission-rates` |
| `getRateForHostType` (`:262`) | hostType | number (fallback 12.0) | R | `actions/wallet.ts:21`, internal | n/a | internal |
| `getWallets` (`:268`) | none | Wallet[] | R | none (admin) | none | `GET /api/v1/admin/wallets` |
| `getWalletById` (`:272`) | id | Wallet \| null | R | none | none | admin |
| `getWalletByOwner` (`:277`) | ownerId, ownerType? | Wallet \| null | R | `actions/wallet.ts:18,20` | none (ownerType effectively ignored, `:281-285`) | `GET /api/v1/host/wallet` |
| `rechargeWallet` (`:290`) | {walletId, amount, note?, adminUserId?} | {wallet, transaction} | W | none (admin) | none; default adminUserId `"usr_admin"` | `POST /api/v1/admin/wallets/{id}/recharges` |
| `deductBookingCommission` (`:405`) | {bookingId, commissionBase, hostType, hostUserId?, organizationId?, ownerName?} | {transaction, rate, amount} | W (idempotent) | `reservations.ts:383` | none | domain service on booking confirmation |
| `reverseBookingCommission` (`:446`) | bookingId, keepShare (0..1) | Transaction \| null | W (idempotent) | `reservations.ts:419,447` | none | domain service on cancel / decline |
| `getBookingCommission` (`:478`) | bookingId | number \| null | R | `reservations.ts:68,420` | none | internal |
| internal: `computeBalance` (`:246`), `findOrCreateWallet` (`:331`), `appendTransaction` (`:369`), `netCommissionFor` (`:382`) | | | | | | ledger service |

### 3.11 Server actions (`app/actions/*`)

All return `ActionResult<T>` (`lib/action-result.ts:93-95`) with stable error codes.

| File:line | Action | Inputs | Output | R/W | Callers | Auth / ownership checks | Future backend |
|---|---|---|---|---|---|---|---|
| `account.ts:10` | `changePasswordAction` | {currentPassword, newPassword, confirmPassword} | null | W | `components/settings/SecuritySection.tsx:48` | session; confirm match; new != current | `POST /api/v1/me/password` |
| `account.ts:40` | `updateProfileAction` | {name?, bio?, phone?, address?, languages?} | User | W | `UserProfileClient.tsx:91`, `settings/PersonalSection.tsx:145` | session; non-empty name | `PATCH /api/v1/me` |
| `bookings.ts:78` | `createBookingAction` | CreateBookingInput: {kind:"listing", listingId, startDate, endDate, guestCount, unitCount?, selectedRoomTypeId?, guestMessage?} \| {kind:"trip", tripId, departureDate, guestCount, guestMessage?} | Reservation | W | `ListingReservation.tsx`, `HotelHostelDetailClient.tsx`, `TripDetailClient.tsx` | session; listing active; not own individual listing (`:99-101`, org members can book own org listings); trip active; full rule validation; server quote | `POST /api/v1/reservations` |
| `bookings.ts:216` | `cancelMyReservationAction` | reservationId | Reservation | W | `components/trips/TripsClient.tsx` | session; guest owns reservation; policy refund; must be allowed | `POST /api/v1/reservations/{id}/cancel` |
| `bookings.ts:253` | `respondToReservationAction` | reservationId, decision confirm\|decline\|cancel, declineReason? | Reservation | W | `HostBookingsClient.tsx:218,245,280`, `HostTodayClient.tsx`, `ReservationsClient.tsx` | host context owns inventory (any org role); confirm/decline only if pending and not expired; cancel only if confirmed | `POST /api/v1/host/reservations/{id}/accept\|decline\|cancel` |
| `calendar.ts:40` | `setListingDatesBlockedAction` | {listingId, dates? \| from+to (inclusive), blocked} | DateAvailabilityOverride[] | W | `HostCalendarClient.tsx`, `HostBookingsClient.tsx:127` | host owns listing; max 366 dates; no past dates | `PUT /api/v1/host/listings/{id}/calendar/blocks` |
| `calendar.ts:60` | `setListingDatePriceAction` | {listingId, dates? \| from+to, price \| null} | DateAvailabilityOverride[] | W | `HostCalendarClient.tsx` | host owns listing; price 100..10,000,000 int; not room-type listings (past dates allowed) | `PUT /api/v1/host/listings/{id}/calendar/prices` |
| `favorites.ts:9` | `setFavoriteAction` | listingId, favorite: boolean | string[] | W | `hook/useFavorite.ts` (HeartButton, cards) | session; listing exists (any status) | `PUT/DELETE /api/v1/me/favorites/{id}` |
| `host.ts:65` | `completeHostOnboardingAction` | {hostType:"individual", listing} \| {hostType: agency\|hotel\|hostel, organization: OrganizationOnboardingInput, property?} | {hostType, organizationId, listingId} | W (listing and/or org, user host status, session refresh) | `BecomeHostFlow.tsx:566` | session; org fields required; email regex; invites capped 20 and self excluded; price validation before creating anything | `POST /api/v1/host/onboarding` (or `POST /api/v1/organizations` + `POST /api/v1/host/listings`) |
| `host.ts:177` | `setBookingApprovalModeAction` | mode instant\|request | null | W | `HostSettingsClient.tsx:158` | session; user has hostType | `PATCH /api/v1/me/host-preferences` |
| `listings.ts:19` | `updateMyListingAction` | listingId, patch: unknown | Listing | W | `HostListingsClient.tsx:154,188,216` | host owns listing (any org role) | `PATCH /api/v1/host/listings/{id}` |
| `listings.ts:44` | `deleteMyListingAction` | listingId | {id} | W | `HostListingsClient.tsx:235` | host owns listing (any org role) | `DELETE /api/v1/host/listings/{id}` |
| `messages.ts:18` | `getConversationMessagesAction` | conversationId | Message[] | R | `MessagesClient.tsx:154` | participant | `GET /api/v1/conversations/{id}/messages` |
| `messages.ts:27` | `sendMessageAction` | conversationId, text | Message | W | `MessagesClient.tsx:227` | session; participant (in data layer); 1..4000 chars | `POST /api/v1/conversations/{id}/messages` |
| `messages.ts:40` | `markConversationReadAction` | conversationId | null | W | `MessagesClient.tsx:162` | participant | `POST /api/v1/conversations/{id}/read` |
| `messages.ts:54` | `startConversationAction` | {listingId?} \| {tripId?} | {conversationId} | W | `ListingInfo.tsx:92` (tripId path has no caller) | session; listing/trip public; recipient = listing host or org owner; not self | `POST /api/v1/conversations` |
| `notifications.ts:13` | `getMyNotificationsAction` | none | Notification[] | R | `NotificationsDropdown.tsx:48` | session | `GET /api/v1/me/notifications` |
| `notifications.ts:19` | `markNotificationReadAction` | notificationId | null | W | `NotificationsDropdown.tsx:89`, `NotificationsClient.tsx` | owner | `POST /api/v1/me/notifications/{id}/read` |
| `notifications.ts:27` | `markAllNotificationsReadAction` | none | null | W | `NotificationsDropdown.tsx:103`, `NotificationsClient.tsx:78` | session | `POST /api/v1/me/notifications/read-all` |
| `organizations.ts:60` | `updateOrganizationAction` | patch: unknown | Organization | W | `AgencySettingsClient.tsx` | owner or admin | `PATCH /api/v1/host/organization` |
| `organizations.ts:72` | `deleteOrganizationAction` | confirmName | {id} | W | `AgencySettingsClient.tsx:114` | owner; exact name match | `DELETE /api/v1/host/organization` |
| `organizations.ts:90` | `inviteMemberAction` | {name?, email, role admin\|manager} | Membership | W | `AgencyTeamClient.tsx:113` | owner or admin; only owner grants admin; no duplicate email | `POST /api/v1/host/organization/invitations` |
| `organizations.ts:126` | `changeMemberRoleAction` | memberId, role admin\|manager | Membership | W | `AgencyTeamClient.tsx:139` | owner; same org; owner role locked | `PATCH /api/v1/host/organization/members/{id}` |
| `organizations.ts:147` | `removeMemberAction` | memberId | {id} | W | `AgencyTeamClient.tsx:164` | owner removes non-owner; admin removes manager | `DELETE /api/v1/host/organization/members/{id}` |
| `organizations.ts:164` | `transferOwnershipAction` | memberId | Membership[] | W | `AgencyTeamClient.tsx:188` | owner; target active with userId | `POST /api/v1/host/organization/transfer-ownership` |
| `trips.ts:76` | `createTripAction` | input: unknown (trip fields) | Trip | W | `TripCreationClient.tsx:256` | org context with hostType agency (any role); min<=max group; price 100..10M | `POST /api/v1/host/trips` |
| `trips.ts:95` | `setTripStatusAction` | tripId, status active\|draft | Trip | W | `AgencyTripsClient.tsx` | agency org owns trip (any role) | `PATCH /api/v1/host/trips/{id}` |
| `trips.ts:108` | `deleteTripAction` | tripId | {id} | W | `AgencyTripsClient.tsx` | agency org owns trip (any role) | `DELETE /api/v1/host/trips/{id}` |
| `wallet.ts:12` | `getMyWalletAction` | none | {wallet, commissionRate} | R | `HostWalletWidget.tsx` | host context; org wallet for org hosts | `GET /api/v1/host/wallet` |

### 3.12 Route handlers (`app/api/*`)

| Route | Method | Body | Response | Checks | Future backend |
|---|---|---|---|---|---|
| `app/api/auth/login/route.ts:9` | POST | {email, password} JSON | `{success, user{id,name,hostType}}` + cookies `darna_session`, `darna_mode` | JSON content type + same Origin (`lib/server/request-guard.ts:9`); 401 on bad credentials | `POST /api/v1/auth/login` (session or JWT) |
| `app/api/auth/register/route.ts:10` | POST | {name, email, password} | same, 409 EMAIL_TAKEN | same | `POST /api/v1/auth/register` |
| `app/api/auth/logout/route.ts:7` | POST | none | `{success}`; clears cookies incl. legacy `darna_user_id`, `darna_host_type`, `darna_agency_id` | Origin match only | `POST /api/v1/auth/logout` |

### 3.13 Server helpers relevant to authorization (`lib/server/*`)

| Function | File:line | Purpose |
|---|---|---|
| `getSession` | `session.ts:35` | verify cookie + revocation list |
| `getSessionUser` | `session.ts:46` | load User from store by session userId |
| `startSession` / `refreshSession` / `endSession` | `session.ts:67`, `:84`, `:109` | issue, re-issue (same sid), revoke |
| `resolveActiveOrganization` | `active-org.ts:15` | org via active memberships only; preferred org honoured if member |
| `getHostContext` | `host-context.ts:24` | {user, hostType, isOrgHost, organization, membership} |
| `requireHostContext` | `host-context.ts:47` | redirects: login, `/become-a-host`, `/become-a-host/<type>` |
| `hostOwnerKey` | `host-context.ts:63` | `{organizationId}` for org hosts, `{userId}` for individuals |
| `hostOwnsListing` / `hostOwnsTrip` | `authz.ts:13`, `:20` | ownership predicates |
| `getHostContextForReservation` | `authz.ts:25` | host may act on reservation |
| `getOrgContext(check)` | `authz.ts:38` | org host with role predicate |
| `toPublicUser` / `toPublicOrganization` / `toPublicMembers` | `dto.ts:12`, `:29`, `:55` | projections |
| `toCardListing` / `toCardTrip` | `card-dto.ts:12`, `:30` | slim DTOs for cards |
| `isTrustedJsonRequest` | `request-guard.ts:9` | CSRF guard for JSON routes |
| `orgPermissions` | `lib/host-types.ts:18-27` | role matrix (see 4.13) |

---

## 4. Business rules found in code

### 4.1 Money and pricing (`lib/booking/pricing.ts`, `lib/booking/config.ts`)

| Rule | Value / formula | Ref |
|---|---|---|
| Currency | integer DZD; single rounding rule `Math.round` (`roundDzd`) | `pricing.ts:56-58` |
| Price bounds (listing, room type, trip, date override) | 100 to 10,000,000 DZD, integer | `config.ts:58-68`; `_sanitize.ts:20-25`; `actions/calendar.ts:71`; `actions/trips.ts:84` |
| Pricing model selection | room type -> `per_bed_night` if bookingUnit bed else `per_room_night`; experience -> `per_person`; vehicle -> `per_day`; trip -> `per_traveller`; else `per_night` | `pricing.ts:95-105` |
| Home (per night) | subtotal = sum over each night of (override[night] ?? listing.price) | `pricing.ts:233-253` |
| Vehicle (per day) | same loop as home, nights = days between pickup and return | `pricing.ts:233-253` |
| Experience (per person) | subtotal = (override[startDate] ?? listing.price) x guests; nights = 1 | `pricing.ts:193-208` |
| Hotel room | subtotal = roomTypePrice x rooms x nights; no per-date overrides | `pricing.ts:212-231` |
| Hostel bed | subtotal = bedPrice x beds x nights; beds default to guests | `pricing.ts:214-217`; server forces beds = guests (`actions/bookings.ts:115-118`) |
| Trip | subtotal = pricePerPerson x travellers; cleaning 0; tax 0 | `pricing.ts:256-274` |
| Room type price | `basePrice ?? price` | `pricing.ts:72-76` |
| Room type default selection | first room type when none or unknown id | `pricing.ts:85-93` |
| Cleaning fee | once per booking, `listing.cleaningFee ?? DEFAULT_CLEANING_FEES[vertical]` (all 0), 0 valid | `pricing.ts:183-186`; `config.ts:40-46` |
| Guest service fee | 0 for every vertical; per-listing `serviceFeeRate` override ignored on purpose | `config.ts:28-34`; `pricing.ts:125-130` |
| Taxes | `round((subtotal + cleaning) x taxRate)`, `taxRate = clamp(listing.taxRate ?? PLATFORM_TAX_RATE)`, platform rate 0 | `pricing.ts:148,188-191`; `config.ts:52` |
| Total | subtotal + cleaning + serviceFee + taxes | `pricing.ts:159` |
| Average unit price stored as `nightlyPrice` | round(subtotal / (nights x quantity)) | `pricing.ts:158`; `reservations.ts:284` |
| Search card quote | quoted on overlap range, cheapest room type, 1 unit, max(1, guests) | `lib/data/listings.ts:194-214` |
| Approval mode for listing bookings | request if `listing.bookingApprovalMode === "request"` OR `listing.instantBook === false` | `pricing.ts:276-282` |
| Approval mode for trips | `organization.bookingApprovalMode === "request"` | `actions/bookings.ts:190-193` |
| Client totals are display only; server recomputes | | `pricing.ts:1-5`; `actions/bookings.ts:136-145` |
| Zero total rejected | `quote.total <= 0` -> INVALID_DATES | `actions/bookings.ts:145` |

### 4.2 Commission by host type

| Rule | Value | Ref |
|---|---|---|
| Default rates (% of accommodation subtotal) | individual 12, agency 15, hotel 18, hostel 10 | `lib/booking/config.ts:15-20`; also documented in `types.ts:605-610` |
| Live rates | server store, admin editable, fallback to defaults then 12.0 | `lib/data/wallet.ts:239-244`, `:262-266` |
| Host type used | listing org's `businessCategory`; org without category -> agency; no org -> individual | `lib/data/reservations.ts:357-374` |
| Rate precedence | existing wallet's stored `hostType` wins over the booking's host type | `wallet.ts:423` |
| Commission base | `res.subtotal ?? max(0, total - cleaning - serviceFee - taxes)` | `reservations.ts:377-379` |
| Amount | `round(base x rate / 100)` | `wallet.ts:424` |
| When charged | on creation if instant (confirmed), on host accept for requests | `reservations.ts:336,353,443` |
| Idempotency | no second charge if net commission for booking > 0 | `wallet.ts:413-420` |
| Reversal | credit `net - round(original x keepShare)`; guest cancel keepShare = 1 - refundPercent/100; host cancel and decline keepShare = 0 | `reservations.ts:417-420,447`; `wallet.ts:446-475` |
| Where charged | host prepaid wallet (user wallet for individuals, org wallet for orgs), created lazily `wal_<ownerId>` with balance 0 | `wallet.ts:331-367` |

### 4.3 Host payout (display formula, `lib/booking/payout.ts:17-34`)

- subtotal = `res.subtotal ?? max(0, total - cleaning - serviceFee - taxes)`.
- declined / expired -> net 0, commission 0.
- refunded = `refund >= total ? subtotal + cleaning : min(subtotal + cleaning, refund)`.
- net = `max(0, subtotal + cleaning - refunded - commissionAmount)`.
- Taxes never go to the host in the formula (they are excluded from subtotal and not added back). Service fee never goes to the host.
- Used by `HostBookingsClient.tsx:589,842`. KPIs instead use gross `totalPrice` (`lib/host-kpis.ts:36-40`).

### 4.4 Dates and availability

| Rule | Detail | Ref |
|---|---|---|
| Date keys | `yyyy-MM-dd` strings, never timestamps; compared as strings | `lib/booking/dates.ts:1-9,24-30` |
| Business timezone | `Africa/Algiers` for "today" and legacy timestamps | `dates.ts:22,56-69` |
| Half-open stays | nights = [checkIn, checkOut); checkout day free for next guest (back-to-back allowed) | `dates.ts:80-96` |
| Night enumeration cap | 3660 nights | `dates.ts:84` |
| Inventory-holding statuses | `confirmed`, and `pending` not past `expiresAt` | `lib/booking/lifecycle.ts:40-43` |
| Whole listing capacity | 1 per night (homes, vehicles) | `reservations.ts:192-196` |
| Room type capacity | `inventoryCount ?? totalInventory` units per night; usage = `unitCount ?? (bed ? guests : 1)` | `reservations.ts:179-183`; `pricing.ts:78-82` |
| Experience capacity | `groupSize ?? guestCount ?? 10` guests per date | `reservations.ts:176-178,193`; `availability.ts:37` |
| Trip capacity | `maxGroupSize` seats per departure (sum of guestsCount) | `reservations.ts:244-251,347-348` |
| Host blocks | blocked override dates are unavailable for every unit of the listing (incl. all room types) | `reservations.ts:202-210`, `:233-234` |
| Legacy rows without room type | treated as first room type | `reservations.ts:162-165` |
| Atomic capacity check | check + insert in one synchronous block (single process only) | `reservations.ts:305-334` |
| Availability window | `availableFrom` = first check-in; `availableTo` = last checkout (homes, vehicles) or last date (experiences) | `availability.ts:88-106`; `listings.ts:164` |
| Partial availability in search | listing kept if window overlaps the searched range; `matchedAvailability.isPartial` with overlapStart/End; free check and quote use the overlap | `lib/data/listings.ts:147-215` |
| Property search with room types | listed if property not blocked and at least one room type is free every night | `reservations.ts:231-239` |
| Calendar shown to guests | from today forward only | `reservations.ts:216` |

### 4.5 Stay rules (`lib/booking/config.ts:71-117`, `lib/booking/availability.ts:57-123`)

| Rule | Default | Validation |
|---|---|---|
| minNights | 1 | `nights < min` -> MIN_NIGHTS / MIN_DAYS (vehicles); clamp >= 1 |
| maxNights | 90 | `nights > max` -> MAX_NIGHTS / MAX_DAYS; max >= min; owner input 1..365 and MAX_NIGHTS_BELOW_MIN (`_sanitize.ts:149-156`) |
| advanceNoticeDays | 0 | start < today + N -> ADVANCE_NOTICE; owner input 0..365 |
| checkInTime | "15:00" | used for cancellation cut-off |
| checkOutTime | "11:00" | used for auto-complete |
| Past start | n/a | start < today -> PAST_DATE (same-day booking allowed) |
| Min one night | n/a | nights < 1 -> MIN_ONE_NIGHT / MIN_ONE_DAY |
| Units | n/a | rooms/beds > inventory -> MAX_ROOMS / MAX_BEDS |
| Guests | n/a | integer >= 1; max = beds count (hostel), capacity x rooms (hotel), `seats ?? guestCount ?? 5` (vehicle), `groupSize ?? guestCount ?? 10` (experience), `guestCount ?? 16` (home) (`availability.ts:27-39`); server caps raw guests at 500 (`actions/bookings.ts:61-64`) |
| Trips | n/a | departure must be in `departureDates` and strictly after today; seats left; `minGroupSize` NOT enforced (`availability.ts:126-144`) |
| Trip end date | departure + max(1, durationDays) - 1 | `availability.ts:147-149` |

### 4.6 Approval modes and request expiry

- Request TTL: `REQUEST_TO_BOOK_TTL_HOURS = 24` (`config.ts:55`); `expiresAt = createdAt + 24h` (`reservations.ts:296-299`).
- Pending requests hold inventory until expiry (`lifecycle.ts:40-43`), payment status `pending`.
- Expiry is lazy: applied whenever reservations are read (`reservations.ts:51-62`, `:105`, `:128`); sets `status=expired`, `paymentStatus=voided`, `respondedAt=expiresAt`. No background job, no notification.
- Approval mode exists at three levels: `Listing.bookingApprovalMode` + `instantBook` (used for listings), `Organization.bookingApprovalMode` (used for trips only), `User.bookingApprovalMode` (written, never read by the engine).

### 4.7 Reservation status transitions

| From | To | Trigger | Who | Side effects | Ref |
|---|---|---|---|---|---|
| (new) | confirmed | create on instant listing / trip | guest | paymentStatus paid; commission charged | `reservations.ts:273,291,336` |
| (new) | pending | create on request listing / trip | guest | paymentStatus pending; expiresAt +24h | `reservations.ts:273,291,296` |
| pending | confirmed | accept | host or any org member | paymentStatus paid; respondedAt; commission charged | `reservations.ts:439-443`; `actions/bookings.ts:270-283` |
| pending | declined | decline (optional reason <= 500) | host or any org member | paymentStatus voided; respondedAt; commission reversal (none charged) | `reservations.ts:444-447` |
| pending | expired | clock passes expiresAt (lazy) | system | paymentStatus voided | `lifecycle.ts:12-16`; `reservations.ts:55-58` |
| pending | cancelled | guest cancels | guest | refund 0, paymentStatus voided, cancelledBy guest | `cancellation.ts:159-169`; `actions/bookings.ts:216-245` |
| confirmed | cancelled | guest cancels before check-in time on arrival day | guest | refund per policy; commission partly reversed | `cancellation.ts:181-213`; `reservations.ts:402-425` |
| confirmed | cancelled | host cancels | host or any org member | full refund `totalPrice`, paymentStatus refunded, full commission reversal | `cancellation.ts:217-239`; `actions/bookings.ts:284-292` |
| confirmed | completed | clock passes checkout time on endDate (trips: 23:59 on last day) (lazy) | system | none | `lifecycle.ts:19-37` |
| any | cancelled by system | never implemented | n/a | `cancelledBy: "system"` unused | `types.ts:236` |

Not allowed: host cancel of pending (RESERVATION_NOT_CANCELLABLE), accept/decline of non-pending (REQUEST_NOT_PENDING / REQUEST_EXPIRED), guest cancel of completed/declined/expired/cancelled (RESERVATION_NOT_CANCELLABLE), guest cancel after check-in time (CHECK_IN_PASSED; for trips the cut-off is `00:00` on departure day, `actions/bookings.ts:237`).

### 4.8 Cancellation policies and refunds (`lib/booking/cancellation.ts`)

| Policy | Tiers (days before check-in -> refund % of subtotal) | Ref |
|---|---|---|
| flexible | >= 1 day: 100%; arrival day before check-in time: 50% | `:49-55` |
| moderate | >= 5 days: 100%; 1 to 4 days: 50%; arrival day: 0% | `:56-63` |
| strict | >= 14 days: 100%; 7 to 13 days: 50%; 0 to 6 days: 0% | `:64-71` |

- Days before = calendar days between today in Algeria and startDate (`:154-157`).
- Guest refund = `min(total, round(subtotal x pct/100) + cleaningFee + round(taxes x pct/100) + (pct == 100 ? serviceFee : 0))` (`:199-205`). Cleaning fee always refunded in full. (The header comment at `:14-15` says the cleaning share of taxes is always refunded; code prorates all taxes: minor mismatch, irrelevant while tax rate is 0.)
- Payment status after refund: refund >= total -> refunded; > 0 -> partially_refunded; else paid (`:139-143`).
- Policy snapshot: `reservation.cancellationPolicy ?? listing ?? trip` (`actions/bookings.ts:233-236`); default `flexible` (`:74-81`).
- Host cancel / decline: always full refund (`:217-239`).
- Refund is only a number on the reservation: there is no refund transaction, no payment provider call.

### 4.9 Wallet / ledger behaviour (`lib/data/wallet.ts`)

- Prepaid commission deposit model: hosts top up offline (CCP, BaridiMob, bank wire); admin credits via `rechargeWallet` with a note and `adminUserId` (`:290-329`); messages `hostWallet.json` (`howItWorksBody`, `creditedManually`).
- Commission deductions are negative transactions, reversals are positive `adjustment` transactions; balance = sum of amounts, recomputed on each append (`:246-248`, `:369-379`).
- Balance may go negative (seed `wal_casbah_hostel` -4200, `:173`). UI warns that listings could be paused; no code pauses anything.
- Append-only in practice (no edit or delete functions).
- `payout` transaction type defined but never produced.

### 4.10 Ratings and reviews

- Reviews are read-only seed data (`lib/data/reviews.ts:6-102`), 5 rows.
- Summary: overall = mean of `rating`; categories = mean of positive values of cleanliness, accuracy, communication, location, value; null when no reviews (show "New") (`lib/reviews.ts:15-26`).
- Listing `rating` / `reviewCount`, org `rating` / `reviewCount`, trip `rating` / `reviewsCount` are stored numbers unrelated to the review rows (e.g. `lst_tipaza_villa` reviewCount 48 vs 2 rows).
- Hotel UI relabels categories (communication = staff, value = value for money) (`HotelHostelDetailClient.tsx:72`).
- No rule on who may review (no reservation link), no review window, no host response.
- Search `minRating` filter compares stored `rating` (`searchFacets.ts:374`).

### 4.11 Favorites

- Listing ids on `User.favoriteIds`; set semantics (`lib/data/auth.ts:182-194`).
- Adding requires the listing to exist (any status), removing does not (`actions/favorites.ts:13`).
- Optimistic UI with shared in-memory cache keyed by user (`hook/useFavorite.ts:16-27`).
- Trips cannot be favorited (toast only).

### 4.12 Messaging

- One conversation per (2 participants, subject) where subject = listing id or trip id or null (`conversations.ts:112-137`).
- Recipient for org listings and trips = organization `ownerUserId` (not the team, not the listing creator) (`actions/messages.ts:67-74`).
- Cannot message yourself (`OWN_LISTING_MESSAGE`); listing/trip must be public.
- Text trimmed, 1 to 4000 chars (`actions/messages.ts:30`).
- `unreadCount[receiver] += 1` on send (only if the map exists), reset to 0 on read; messages `read=true` for receiver (`conversations.ts:88-106`).
- `lastMessage` / `lastMessageAt` denormalized on the conversation.
- No link between a reservation and a conversation; booking `guestMessage` is stored on the reservation only, not posted to the inbox.

### 4.13 Notifications

- Per user, mark one (ownership checked) or all read (`lib/data/notifications.ts`).
- No producer: booking created/confirmed/declined/expired/cancelled, new message, org verification do not create notifications. Types `price` and `review` imply price-drop alerts and review prompts that do not exist.
- Stored English `title` / `message` text (not i18n keys).

### 4.14 Onboarding / become a host (4 types)

| Host type | Creates | Rules | Ref |
|---|---|---|---|
| individual | 1 listing (active), user role host + hostType individual + bookingApprovalMode from listing; session refreshed | if the user is already an org host with an org, the listing is created under the org instead | `actions/host.ts:74-100` |
| agency | Organization (pending verification) + owner Membership + invited Memberships | name, RC, phone, address required; valid business email; invites: valid emails, not self, max 20, role admin or manager (default manager) | `actions/host.ts:103-168`; `lib/data/organizations.ts:77-171` |
| hotel | Organization + owner membership + invites + optional property listing with room types | defaults: businessType "Commercial Luxury Hotel", check-in 14:00, check-out 12:00 | `organizations.ts:112-131`; `actions/host.ts:156-162` |
| hostel | same as hotel | defaults: businessType "Youth & Backpacker Hostel", check-in 13:00, check-out 11:00 | same |

- Org defaults: logo `/assets/logo-vertical.png`, country Algeria, teamSizeEstimate `2-10`, bookingApprovalMode `instant`, rating 0 (`organizations.ts:105-139`).
- Property is validated (prices) before anything is created (`actions/host.ts:128`), but org creation and listing creation are not transactional.
- Middleware / layout gates: no session -> login; no hostType -> `/become-a-host`; org host without org -> `/become-a-host/<type>`; individual host without listing -> `/become-a-host/1` (`middleware.ts:65-85`; `host/layout.tsx:25-30`).
- Verification: new orgs `pending`; workspace usable; public listing immediately active and bookable regardless of verification. Legal-field edits reset to `pending` (`organizations.ts:247-272`).

### 4.15 Organizations, memberships, roles (`lib/host-types.ts:12-27`)

| Permission | owner | admin | manager |
|---|---|---|---|
| canManageOperations (listings, bookings, calendar, trips) | yes | yes | yes |
| canEditSettings | yes | yes | no |
| canInviteMembers | yes | yes (manager role only) | no |
| canRemoveMember | any non-owner | managers only | no |
| canChangeRoles | yes | no | no |
| canTransferOwnership | yes | no | no |
| canDeleteOrganization | yes | no | no |

- Only the owner can grant admin on invite (`actions/organizations.ts:105-108`).
- Owner role cannot be changed through role change (`OWNER_ROLE_LOCKED`), owner cannot be removed.
- Transfer: target must be active with userId; all current owners demoted to admin; `org.ownerUserId` updated (`organizations.ts:220-236`).
- Duplicate invite check by email among non-removed members (`actions/organizations.ts:109-112`).
- Delete org: owner only, typed name must equal org name; memberships deleted; listings and trips set to draft; deleting user's `organizationId` cleared and session refreshed (`actions/organizations.ts:72-88`; `organizations.ts:274-282`). Other members keep `hostType` of an org type with no org and will be sent back to onboarding.
- Ops actions (`updateMyListingAction`, `deleteMyListingAction`, calendar, `respondToReservationAction`, trip status/delete) check ownership only, not role, consistent with `canManageOperations`.
- Trips are agency-only (`AGENCY_ONLY`, `actions/trips.ts:73-78`).

### 4.16 Search filters semantics

Base search (`lib/data/listings.ts:18-218`): active only; `vertical=hotel` matches businessCategory hotel/hostel, category hotel, or type containing "hotel"/"hostel"; `vertical=home` excludes hotels/hostels; `category` substring on type/amenities; `destination` substring on city, locationValue, country; `minPrice`/`maxPrice` on base `price` (not quoted total); guests filter only when > 1 and only on `guestCount` (listings without it pass); dates as in 4.4. `instantBook` in `SearchParams` is ignored by the data layer. Trips: destination substring on title/city/locationValue (`trips.ts:34-42`).

Side filters (`components/search/searchFacets.ts`), applied in-process on the base pool, same code client and server:

| Group | URL param | Semantics | Ref |
|---|---|---|---|
| wilayas | `wilayas` (codes 1..58, CSV) | any of; wilaya from commune, else first known city part | `:278`, `:355-359`; `lib/algeria.ts` `locatePlace` |
| communes | `communes` | any of; accent-insensitive equality | `:279`, `:357` |
| types | `propertyType` | any of; special values hotel, hostel, entire/entire home (no hotel/hostel, no bed units), private room (type contains room or has room units), riad (riad/ksar/heritage); else exact type or businessCategory | `:339-347` |
| subtypes | `subtype` | any of; equals host-typed `type` | `:366` |
| price | `minPrice`, `maxPrice` | inclusive on base price (per-night/day/person/traveller) | `:367-370` |
| amenities | `amenities` | ALL of; each key maps to alias substrings over listing + room-type amenities | `:127-165`, `:371` |
| bedrooms | `roomCount` | min, applied only when > 1; `bedroomCount ?? roomCount` | `:77`, `:372` |
| bathrooms | `bathroomCount` | min, only when > 1 | `:373` |
| rating | `minRating` | min stored rating | `:374`, `:409` |
| instant | `instantBook=true` | `instantBook` OR `bookingApprovalMode === "instant"` (differs from engine rule 4.1) | `:80`, `:375` |
| favorite | `isGuestFavorite=true` | manual flag | `:376` |
| freeCancel | `freeCancellation=true` | policy === flexible | `:377` |
| hosts | `host` | ownerType individual / organization | `:378` |
| stars | `stars` | min hotelStarRating | `:379` |
| transmissions | `transmission` | any of | `:380` |
| fuels | `fuel` | any of | `:381` |
| seats | `seats` | min seats | `:382` |
| expLengths | `expLength` | any of buckets upTo4h [0,4], halfDay (4,12], multiDay (12,inf) hours | `:174-178`, `:383-389` |
| languages | `lang` | any of experienceLanguages | `:390` |
| durations (trips) | `duration` | buckets 1-3, 4-7, 8-14, 15+ days | `:167-172`, `:401-407` |
| months (trips) | `months` (1..12) | any departure month | `:408` |
| group (trips) | `groupSize` | min maxGroupSize | `:410` |
| agencies (trips) | `agency` | org name equality | `:411` |

Facet counts use the same matchers with the group skipped (`matchesListing(f, filters, skip)`, `:361-392`). Category counts from the unfiltered pool across all verticals (`search/page.tsx:67-71`).

### 4.17 Algeria geography (`lib/algeria.ts`)

- 58 wilayas with official codes incl. 2019 reform (49 to 58), French/Latin name, optional English (`Alger` -> `Algiers`), Arabic name (`:14-73`).
- 13 communes with wilaya code (`:81-95`), "extend as hosts add places".
- `locatePlace`: explicit commune first, else split `city` on `&`, `,`, `/`, " et ", " and " and match commune or city->wilaya map (`:97-155`).
- Wilaya filter accepts 1..58 (`searchFacets.ts:278`).

### 4.18 Auth and session

- scrypt N default, 16-byte salt, 64-byte key, format `scrypt$salt$hash` (`lib/data/auth.ts:18-36`); timing-equalized unknown email (`:46-47,76`).
- Password min length 8, no other complexity (`lib/auth/password-rules.ts:2`).
- Cookie `darna_session`: HMAC-SHA256, httpOnly, SameSite lax, secure in production, 30 days, secret `DARNA_SESSION_SECRET` >= 32 chars (dev fallback secret) (`lib/auth/session-token.ts:15-49,159-168`).
- Logout revokes `sid` in an in-memory map (`lib/server/session.ts:22-32,109-116`).
- Open-redirect guard for `callbackUrl` (`lib/auth/callback-url.ts:11-23`).
- CSRF: JSON content type + Origin host match for auth routes; server actions rely on Next's origin check (`lib/server/request-guard.ts`).
- No rate limiting, no lockout, no email verification, no password reset.

---

## 5. Gaps and inconsistencies

### 5.1 Missing entities / flows the UI implies

| Gap | Evidence | Backend implication |
|---|---|---|
| Payments: no payment intent, charge, provider, capture, refund transaction, invoice | Reservation goes straight to `paid` with free-text `paymentMethod` default `"CIB / Edahabia Card"` (`lib/data/reservations.ts:291-293`); receipt is a print dialog (`TripsClient.tsx:397-508`); settings show fake saved cards (`components/settings/PaymentsSection.tsx`) | Need Payment / PaymentIntent (CIB / Edahabia via SATIM or similar), Refund, Invoice / Receipt numbering; `paymentStatus` must be driven by provider callbacks |
| Money flow contradiction | `lib/booking/payout.ts:1-5` and `NoGuestFees.tsx` say BLADUS deducts commission from the host payout (implies BLADUS collects guest money) while the wallet copy says commission is taken from an offline prepaid deposit "rather than from automated guest payouts" (`messages/en/hostWallet.json` `howItWorksBody`); host settings show payout methods and a payout history (`HostSettingsClient.tsx:63-95`) | Decide collection model (platform collects then pays out vs host collects and prepays commission). Need Payout, PayoutMethod (CCP / RIP with key), PayoutBatch if platform collects |
| Payout methods and history | hardcoded `PAYOUT_HISTORY` and `payoutMethods` (`HostSettingsClient.tsx:63-95`) | PayoutMethod table (CCP number + key, RIB), Payout table |
| Reviews write path | no action, no UI; reviews are a module constant (`lib/data/reviews.ts:6`); seed users `usr_meriem`, `usr_tarek` do not exist; names differ from users table (Sofiane Boudiaf vs Mebarki, Leila Zerrouki vs Hadj) | Review table linked to reservation, eligibility window, host reply, aggregate denormalization job |
| Notification producers | nothing creates notifications (`lib/data/notifications.ts` has no create) | Event -> notification service (booking lifecycle, messages, verification, wallet low balance), plus email / SMS channels; preferences matrix (`NotificationsSection.tsx`) needs a table |
| Invitation acceptance | invited memberships have `userId: null`, no token, no email, no accept route (`organizations.ts:155-168,184-206`; resend toast `AgencyTeamClient.tsx:179-182`) | Invitation table with token + expiry, email delivery, accept endpoint that links `userId` and sets user hostType |
| Organization switcher / multi-org | users own several orgs (Karim 3, Amina 2) but active org = session or first membership (`lib/server/active-org.ts:22-23`); `ctx.hostType` comes from `User.hostType`, not from the active org's category (`host-context.ts:28`) | Active org must be explicit (header or session) and host type derived from org `businessCategory`; User.hostType should not be a single value |
| Individual user also owning orgs | Amina is `hostType: individual` but owns 2 hostels she can never manage (`getHostContext` treats her as individual) | Separate "personal hosting profile" from org memberships |
| Agency owner with individual listings | Karim (`hostType: agency`) is `hostUserId` of 3 individual listings (`lst_casbah_loft`, `lst_constantine_cliff`, `lst_dacia_duster`) that `hostOwnsListing` will never let him manage (`authz.ts:13-18`) | Same as above |
| Listing moderation | `ListingStatus` has `pending`, `suspended` but new listings go `active` immediately (`lib/data/listings.ts:309`); org verification does not gate publishing | Listing review workflow, gating on org verification |
| Identity verification | `isIdentityVerified` static; notification seed mentions national ID verification; settings identity section | KYC / document upload entity |
| Media upload | images are URLs typed by hosts, allowlist of 6 hosts (`_sanitize.ts:38-45`); stock photos substituted (`BecomeHostFlow.tsx:628-637`); avatar change toast (`UserProfileClient.tsx:186`) | Media storage (S3-compatible), image entity with ordering, upload endpoints |
| Reports / trust and safety | report listing toast (`ListingReservation.tsx:439`) | Report entity + admin queue |
| Help / support tickets | help form is `setTimeout` (`HelpClient.tsx:119-125`) | SupportTicket entity, email |
| Password reset, email verification, email change, social and phone login, account deactivation, data export, sessions list | toasts (`LoginModal.tsx:330,360,374`; `PersonalSection.tsx:218`; `SettingsClient.tsx:212`; `HostingSections.tsx:103`; `SecuritySection.tsx:140`) | Auth endpoints and token tables; `emailVerified` is never set |
| User preferences | currency, notifications matrix, preferred name, mailing address, booking permissions, travel for work, tax NIF are local state | UserPreferences / TaxProfile tables |
| Host booking defaults | advance notice, prep time, check-in/out, cancellation policy defaults are local state (`HostSettingsClient.tsx:102-106`) | HostDefaults table applied to new listings |
| Trip content edit | only status and delete actions exist (`app/actions/trips.ts`) | `PATCH /host/trips/{id}` |
| Listing full edit | edit modal sends only title, price, instantBook (`HostListingsClient.tsx:188-192`) | full listing editor endpoints |
| Trip <-> conversation and booking <-> conversation | `startConversationAction({tripId})` has no caller; "message host/guest" buttons open the generic inbox (`TripsClient.tsx:311`, `HostBookingsClient.tsx:734`) | Conversation `reservation_id` FK, auto thread on booking with `guestMessage` as first message |
| Realtime messaging | no polling or websocket | Django Channels / SSE or polling endpoint |
| Coupons | `Coupon` type exists (`types.ts:474-486`), no UI | Coupon + redemption tables if admin feature ships |
| Wallet enforcement | negative balance has no effect besides a banner | Rule: pause listings or block confirmations under threshold (needs product decision) |
| Commission on trips | agency rate applies via org; seeded ledger references trip bookings `res_trip_*` and `res_tipaza_02`, `res_hotel_*`, `res_hostel_*` that do not exist in reservations seed (`wallet.ts:44-206`) | Seed consistency; FK from transaction to reservation |
| Price drop alerts | notification type `price` seeded | Saved-search / price watch feature not built |

### 5.2 Mock shortcuts that will not survive a real backend

| Shortcut | Where | Fix |
|---|---|---|
| globalThis arrays as DB; data lost on restart; not shared across instances | `lib/data/_store.ts:14-20`, `_tables.ts` | PostgreSQL |
| Reviews, calendar overrides, wallets, credentials seeded inline in data modules | `reviews.ts:6`, `calendar.ts:13`, `wallet.ts:16`, `auth.ts:39` | move to fixtures |
| Demo password shared by all seed users and duplicated in client bundle | `lib/data/auth.ts:14`; `components/models/LoginModal.tsx:46-51` | remove from client; fixtures only in dev |
| Dev fallback session secret | `lib/auth/session-token.ts:29` | env-only secret |
| In-memory session revocation list (lost on restart, per instance) | `lib/server/session.ts:22-32` | server-side session table or JWT denylist |
| No rate limiting anywhere (login, register, messages, bookings) | grep found none | DRF throttling / reverse-proxy limits |
| Capacity check "atomic" only within one Node process | `lib/data/reservations.ts:305-334` | DB transaction with `SELECT ... FOR UPDATE` per listing/room type, or PostgreSQL exclusion constraint on daterange for whole-listing stays |
| Write-on-read lifecycle (`settle` mutates every reservation on each `getReservations`) | `reservations.ts:51-62,105` | scheduled job (Celery beat) for expiry / completion + read-time computation |
| Commission charged in a try/catch that only logs failures | `reservations.ts:381-396,418-423` | same DB transaction as status change, outbox |
| Org creation + listing creation + user update not transactional | `actions/host.ts:131-166` | one transaction |
| Derived values stored as truth: `Listing.rating`, `reviewCount`, `bookingsCount`, `isGuestFavorite`, `featured`; `Organization.rating`, `reviewCount`; `Trip.rating`, `reviewsCount`; `User.yearsHosting`, `responseRate`, `responseTime`; `Wallet.balance`; `Conversation.lastMessage`, `unreadCount` | `types.ts` | compute or maintain via signals, mark read-only in API |
| Mock reservation totals inconsistent with the pricing engine and stored `taxes` while tax rate is 0 (e.g. `res_tipaza_01` 5 nights x 18500 + 4000 + 2500 = 99000 but `totalPrice` 86000; no `subtotal` stored) | `lib/mock-data/reservations.ts:5-21` | regenerate fixtures through the pricing service |
| Mock statuses contradicting rules: declined row with `paymentStatus: "refunded"` (code uses `voided`); request rows on `lst_tipaza_villa` which is instant; `res_constantine_pending` is Karim booking his own listing (blocked by OWN_LISTING) | `lib/mock-data/reservations.ts:75-127` | fix fixtures |
| Conversation seed: `unreadCount` keyed by non-participants (`usr_amina` in conv_02/03); `usr_sofiane` acts as a host but is a guest with no listings; `otherUser` snapshot names differ from users | `lib/mock-data/conversations.ts:20-49` | fixtures |
| Free text where references are needed: `Listing.city` ("Hydra, Algiers" from onboarding, `BecomeHostFlow.tsx:659`), `locationValue`, `commune` (string, not FK), `Trip.city` ("Tipaza & Cherchell"), `Listing.type` (free subtype), `Organization.businessType`, `paymentMethod`, `RoomType.amenities` (English sentences), `houseRules`, `languages`, `experienceLanguages`, `Notification.title/message` (English) | `types.ts`, onboarding | Wilaya / Commune tables (FK), ListingType / Subtype lookup, Amenity table (one vocabulary), Language codes (ISO), PaymentMethod enum, notification template keys |
| Three amenity vocabularies: listing snake_case keys (`sea_view`), filter keys camelCase (`seaView`, `messages/en/amenities.json`), room-type free text; search bridges them with substring aliases | `searchFacets.ts:127-165`; `amenityIcons.ts`; mock listings | single Amenity table with i18n labels and scope (listing / room / hotel / hostel facility) |
| `Listing.category` vs `businessCategory` vs `type` all used to infer "hotel" (`listings.ts:28-36`, `searchFacets.ts:55-61`); hotels stored as `category: "home"` | | explicit `vertical` enum + property kind |
| Trip bookings put the trip id in `Reservation.listingId` (`reservations.ts:349`) and `getReservations({listingId})` matches either (`:110-112`) | | separate nullable FKs `listing_id`, `trip_id`, `departure_id` with a check constraint |
| Trip departures are a string array; seats computed by summing reservations | `types.ts:286`; `reservations.ts:244-251` | TripDeparture table (date, capacity, status, price override) |
| Room types embedded in listing JSON; ids client-suppliable when they match `/^[\w-]{1,80}$/` (`_sanitize.ts:100`) | | RoomType table, server ids only |
| Calendar overrides per listing only, not per room type; price overrides refused for room types | `actions/calendar.ts:74-76` | per room-type inventory / rate calendar |
| `inventoryCount` vs `totalInventory` vs `availableInventory` vs `isAvailable` overlap | `types.ts:100-107`; `pricing.ts:78-82` | single inventory field + calendar |
| `basePrice` mirrors `price` "for older readers" | `_sanitize.ts:108-109` | drop |
| `perPersonPrice` on experiences never used (pricing uses `price`) | `types.ts:193` | drop or use |
| `serviceFeeRate` and `taxRate` per listing labelled "admin-only override" but `serviceFeeRate` is ignored and neither is admin editable here | `types.ts:163-166`; `pricing.ts:125-130` | platform settings + tax rules (TVA / taxe de séjour) |
| Approval mode in three places with different readers (User, Listing + instantBook, Organization) and search facet "instant" disagrees with engine (`searchFacets.ts:80` vs `pricing.ts:276-282`) | | one source per inventory item; drop `instantBook` or derive it |
| Agency onboarding never sends `bookingApprovalMode`; hotel/hostel onboarding hardcodes room types and prices; `hotelTaxId`, `placement`, `bedsCount`, admin custom fields collected but not sent | `BecomeHostFlow.tsx:692-703,777-813,175`; `:113-116` | onboarding API must accept real room types, tax id, custom fields |
| Onboarding step config in browser `localStorage` (admin edits only affect that browser) | `lib/onboarding-config.ts:1064-1092` | OnboardingConfig table served by API |
| Host drafts in `localStorage` | `lib/client/user-storage.ts:7-41` | optional server-side ListingDraft |
| `getListingById`, `getTripById` return any status; favorites can include drafts; `getFavoriteListings` returns unpublished listings to the guest | `actions/favorites.ts:13`; `lib/data/favorites.ts:7-11` | filter public status |
| Org profile pages render unverified and rejected orgs and their listings | `components/agency/orgProfilePage.tsx:56-80` | decide visibility rules |
| Guest contact (email + phone) is included on every populated reservation, including in guest-side `getReservations({userId})` responses and host lists for all statuses | `reservations.ts:17-31,64-73` | host-only serializer, possibly reveal contact only after confirmation |
| `ownerType` arg effectively ignored in `getWalletByOwner` (`wallet.ts:281-285`) | | query by (owner_type, owner_id) |
| Wallet `hostType` stored on wallet and preferred over booking host type (`wallet.ts:423`) | | derive from owner |
| Hard deletes: listings (`listings.ts:346-349`), trips, members, organizations; reservations keep dangling `listingId` | | soft delete / archive, PROTECT FKs |
| `MembershipStatus.removed` never used; `transferOrganizationOwnership` demotes every owner | `organizations.ts:230-232` | unique owner constraint |
| Deleting an org leaves other members with an org `hostType` and no org | `actions/organizations.ts:72-88` | cascade membership + user role logic |
| `ListingOwnerType` duplicated by `hostUserId`/`organizationId` presence; org listings also store creator `hostUserId` (`actions/host.ts:79-85`) which then makes `getReviewsByUserId` and public user profiles inconsistent | | `created_by` separate from owner |
| KPIs computed client side from full reservation lists (`lib/host-kpis.ts`); revenue uses gross `totalPrice` not net payout | `HostTodayClient.tsx:98-104`; `ReservationsClient.tsx:95` | server KPI endpoint |
| Exchange rate constant 152.47 | `lib/currency.ts:1` | ExchangeRate table or provider |
| Search is in-memory full scan with substring matching; no pagination; price filter on base price only | `lib/data/listings.ts:18-218` | SQL / PostGIS (latlng), trigram search on city, pagination, sort |
| `SearchParams.instantBook` ignored by data layer (handled only by facets); `TripSearchParams.duration` ignored | `listings.ts`, `trips.ts:17` | clean API params |
| Fake latency `delay()` in data layer | `_store.ts:44` | drop |
| Legacy cookies `darna_user_id`, `darna_host_type`, `darna_agency_id` cleared on logout | `app/api/auth/logout/route.ts:25-27` | drop after migration |
| `TODO: replace with Supabase` comments everywhere | every `lib/data/*.ts` | update to Django |
| `ListingVertical` includes `trip` and `hotel` but trips are a separate entity and hotels are stored as `home` | `types.ts:47-52` | clarify enum |
| `minGroupSize` on trips not enforced; trip departure dates can be in the past at creation; `durationDays` not reconciled with itinerary length | `availability.ts:126-144`; `actions/trips.ts:44-57` | validation in API |
| Reservation `subtotal` missing on legacy rows, so commission base / refunds fall back to `total - fees - taxes` | `reservations.ts:377-379`; `cancellation.ts:129-137`; `payout.ts:25` | make `subtotal` NOT NULL |

---

## 6. Page routes (34 `page.tsx`)

33 pages under `app/[locale]/` + root `app/page.tsx`. Auth column: "MW" = middleware redirect when no session (`middleware.ts:14-25,62-71`), "page" = page-level check.

| # | Route | File | Purpose | Data functions used | Actor | Auth required |
|---|---|---|---|---|---|---|
| 1 | `/` | `app/page.tsx` | redirect to `/en` | none | any | no |
| 2 | `/[locale]` | `app/[locale]/page.tsx` | home feed, category grid, trips grid | `getSessionUser`, `getListings`, `getVehicles`, `getExperiences`, `getFeaturedListings`, `getTrips`, `toCardListing`, `toCardTrip` | visitor, guest | no |
| 3 | `/[locale]/[...rest]` | `app/[locale]/[...rest]/page.tsx` | localized 404 catch-all | none | any | no |
| 4 | `/[locale]/search` | `app/[locale]/search/page.tsx` | search results, facets, map, trips | `getSessionUser`, `getListings` (x2), `getTrips`, `parseSideFilters`, `toFacet`, `toTripFacet`, `matchesListing`, `matchesTrip`, `verticalOf` | visitor, guest | no |
| 5 | `/[locale]/listings/[listingId]` | `app/[locale]/listings/[listingId]/page.tsx` (+ `layout.tsx` existence check) | listing detail + booking | `getHostContext`, `hostOwnsListing`, `getPublicListingById`, `getSessionUser`, `getUserById`, `toPublicUser`, `getOrganizationById`, `getReviewsByListingId`, `getListingAvailability`, `priceOverridesFor`, `getListings` | visitor, guest; owner sees drafts | no (booking needs login) |
| 6 | `/[locale]/trips/[tripId]` | `app/[locale]/trips/[tripId]/page.tsx` (+ `layout.tsx`) | agency trip detail + seat booking | `getHostContext`, `hostOwnsTrip`, `getPublicTripById`, `getSessionUser`, `seatsSoldByDeparture`, `todayKey` | visitor, guest; agency sees drafts | no (booking needs login) |
| 7 | `/[locale]/users/[userId]` | `app/[locale]/users/[userId]/page.tsx` | public user / host profile (`me`/`current` redirect to `/profile`) | `getUserById`, `getSessionUser`, `toPublicUser`, `getListings`, `getReviewsByUserId`, `getMembershipsForUser`, `getOrganizationById` | visitor, guest | no |
| 8 | `/[locale]/agencies/[organizationId]` | `app/[locale]/agencies/[organizationId]/page.tsx` -> `components/agency/orgProfilePage.tsx` | public agency profile | `getOrganizationById`, `getOrganizationMembers`, `getHostListings`, `getTrips`, `toPublicOrganization`, `toPublicMembers` | visitor | no |
| 9 | `/[locale]/hotels/[organizationId]` | `app/[locale]/hotels/[organizationId]/page.tsx` | public hotel profile | same as 8 (no trips) | visitor | no |
| 10 | `/[locale]/hostels/[organizationId]` | `app/[locale]/hostels/[organizationId]/page.tsx` | public hostel profile | same as 8 (no trips) | visitor | no |
| 11 | `/[locale]/help` | `app/[locale]/help/page.tsx` | help center + contact form (mock) | none | any | no |
| 12 | `/[locale]/login` | `app/[locale]/login/page.tsx` | login / register page | none (client posts to `/api/auth/*`) | visitor | no |
| 13 | `/[locale]/design-system` | `app/[locale]/design-system/page.tsx` | internal UI gallery, 404 in production | none | developer | no |
| 14 | `/[locale]/trips` | `app/[locale]/trips/page.tsx` | guest bookings (upcoming / past / cancelled), cancel, receipt | `getSessionUser`, `getReservations({userId})` | guest | MW + page |
| 15 | `/[locale]/favorites` | `app/[locale]/favorites/page.tsx` | wishlist | `getSessionUser`, `getFavoriteListings` | guest | MW + page |
| 16 | `/[locale]/messages` | `app/[locale]/messages/page.tsx` | inbox (first thread opened) | `getSessionUser`, `getConversations`, `getMessages` | guest, host | MW + page |
| 17 | `/[locale]/messages/[conversationId]` | `app/[locale]/messages/[conversationId]/page.tsx` | specific thread | `getSessionUser`, `getConversationForParticipant`, `getConversations`, `getMessages` | participant | MW + page (404 for non participants) |
| 18 | `/[locale]/notifications` | `app/[locale]/notifications/page.tsx` | notifications list | `getSessionUser`, `getNotifications` | guest, host | MW + page |
| 19 | `/[locale]/profile` | `app/[locale]/profile/page.tsx` | own profile view / edit | `getSessionUser`, `getHostListings({userId})`, `getReviewsByUserId` | guest, host | MW + page |
| 20 | `/[locale]/settings` | `app/[locale]/settings/page.tsx` | account settings (mostly mocked sections) | `getSessionUser` | guest, host | MW + page |
| 21 | `/[locale]/reservations` | `app/[locale]/reservations/page.tsx` | host reservations with KPIs (guests redirected to `/trips`) | `getSessionUser`, `getHostContext`, `hostOwnerKey`, `getReservations({hostId\|organizationId})`, `getHostListings` | host (any type) | MW + page |
| 22 | `/[locale]/properties` | `app/[locale]/properties/page.tsx` | legacy, redirects to `/host/listings` | none | host | MW |
| 23 | `/[locale]/become-a-host` | `app/[locale]/become-a-host/page.tsx` | host type selection / wizard start | `getSessionUser` | guest becoming host | MW + page |
| 24 | `/[locale]/become-a-host/[step]` | `app/[locale]/become-a-host/[step]/page.tsx` | wizard step (`1..n`, `agency`, `hotel`, `hostel`) | `getSessionUser` | guest becoming host, existing host adding listing | MW + page |
| 25 | `/[locale]/host` | `app/[locale]/host/page.tsx` | Today dashboard (org hosts only; individuals redirected to listings) | `requireHostContext`, `hostOwnerKey`, `getReservations`, `getHostListings`, `getReviewsByUserId` | org host | MW + layout (`requireHostContext`) |
| 26 | `/[locale]/host/listings` | `app/[locale]/host/listings/page.tsx` | manage listings + wallet compact | `requireHostContext`, `getHostListings` (+ client `getMyWalletAction`) | host | MW + layout |
| 27 | `/[locale]/host/bookings` | `app/[locale]/host/bookings/page.tsx` | manage bookings, accept / decline / cancel, mini calendar | `requireHostContext`, `hostOwnerKey`, `getReservations`, `getHostListings`, `getOverridesForListings` | host | MW + layout |
| 28 | `/[locale]/host/calendar` | `app/[locale]/host/calendar/page.tsx` | multi-view calendar, block / price | `requireHostContext`, `getHostListings`, `getReservations`, `getOverridesForListings` | host | MW + layout |
| 29 | `/[locale]/host/messages` | `app/[locale]/host/messages/page.tsx` | host inbox (full screen) | `requireHostContext`, `getConversations`, `getMessages` | host | MW + layout |
| 30 | `/[locale]/host/settings` | `app/[locale]/host/settings/page.tsx` | payouts (mock), identity, booking defaults, communication | `requireHostContext` | host | MW + layout |
| 31 | `/[locale]/host/agency/team` | `app/[locale]/host/agency/team/page.tsx` | org team management | `requireHostContext`, `getOrganizationMembers` | org host (any role; actions role-gated) | MW + layout; individuals redirected |
| 32 | `/[locale]/host/agency/settings` | `app/[locale]/host/agency/settings/page.tsx` | org settings, wallet, delete org | `requireHostContext` (+ client `getMyWalletAction`) | org host (owner / admin to save) | MW + layout; individuals redirected |
| 33 | `/[locale]/host/agency/trips` | `app/[locale]/host/agency/trips/page.tsx` | agency trips list | `requireHostContext`, `getTrips({organizationId, status:"all"})` | agency member | MW + layout; non agency redirected |
| 34 | `/[locale]/host/agency/trips/new` | `app/[locale]/host/agency/trips/new/page.tsx` | create trip wizard | `requireHostContext` | agency member | MW + layout; non agency redirected |

Non-page server files that also read data: `app/[locale]/layout.tsx` (`getSessionUser` for every page), `app/[locale]/host/layout.tsx` (`requireHostContext`, `getHostListings`), `app/[locale]/listings/[listingId]/layout.tsx`, `app/[locale]/trips/[tripId]/layout.tsx`, `app/sitemap.ts` (`getListings`, `getTrips`, `getOrganizations`), `app/robots.ts`.
