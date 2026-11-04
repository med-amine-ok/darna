# BLADUS admin back-office: raw inventory for the backend blueprint

Scope: `admin/` only (Next.js 14, next-intl, mock store). Read-only analysis, 2026-11-04.
All paths are relative to `admin/` unless prefixed with `frontend/`. `L` = line number.
Status legend: **built** = UI + server action + store mutation + audit; **partial** = some parts real, some hardcoded; **mocked-only** = UI state + toast, nothing persisted.

Key sources: `lib/types/index.ts`, `lib/permissions.ts`, `lib/route-permissions.ts`, `lib/domain/transitions.ts`, `lib/pricing.ts`, `lib/data/*`, `lib/actions/*`, `lib/auth/*`, `lib/mock-data/{store,generator,admins}.ts`, `middleware.ts`, `docs/DATA-MODEL.md`, `README.md`.

Note: `docs/DATA-MODEL.md` section 6 is stale: it still says `GUEST_SERVICE_FEE_PERCENT = 7`; code says `0` (`lib/pricing.ts:16`).

---

## 1. Feature inventory per role

### 1.1 Permission matrix (source: `lib/permissions.ts:3-93`)

34 permissions (`lib/types/index.ts:165-199`). `X` = granted.

| Permission | super_admin | moderator | support | finance | analyst |
|---|---|---|---|---|---|
| hosts.view | X | X | X | X | X |
| hosts.approve | X | X | | | |
| hosts.reject | X | X | | | |
| hosts.suspend | X | X | | | |
| hosts.delete (also ban, restore) | X | | | | |
| hosts.commission_override | X | | | X | |
| listings.view | X | X | X | | X |
| listings.approve (also request changes, unsuspend, create wizards, change requests) | X | X | | | |
| listings.reject | X | X | | | |
| listings.suspend (also archive) | X | X | | | |
| listings.delete (also restore) | X | | | | |
| listings.feature | X | X | | | |
| users.view | X | X | X | | X |
| users.suspend (also unsuspend, mark active/pending) | X | X | X | | |
| users.ban | X | | | | |
| users.delete (also restore) | X | | | | |
| bookings.view | X | | X | X | X |
| bookings.cancel | X | | X | | |
| bookings.refund | X | | X | X | |
| bookings.dispute | X | | X | | |
| reviews.view | X | X | X | | X |
| reviews.moderate | X | X | | | |
| reviews.delete | X | | | | |
| wallets.view | X | | | X | X |
| wallets.recharge | X | | | X | |
| commissions.manage | X | | | X | |
| payouts.approve | X | | | X | |
| onboarding.edit | X | | | | |
| categories.manage | X | X | | | |
| promotions.manage | X | X | | | |
| reports.export | X | X | | X | X |
| audit.view | X | X | X | X | X |
| team.manage | X | | | | |
| settings.manage | X | | | | |
| **count** | 34 | 17 | 10 | 10 | 8 |

Notes:
- Finance has `hosts.commission_override` but NOT `listings.view` or `users.view` (`lib/permissions.ts:71-82`).
- Support can refund and resolve disputes but cannot see wallets, so it cannot see the ledger effect of its own refunds.
- `resolveDispute` with a refund outcome needs `bookings.dispute` AND `bookings.refund` (`lib/actions/bookings.ts:36-38`, `lib/data/bookings.ts:291-292`): only super_admin and support qualify.
- Role labels: `lib/permissions.ts:107-113`.
- Permissions are resolved from the CURRENT role in the store on every request (`lib/auth/current-admin.ts:44-59`), never from JWT claims. `AdminUser.permissions?` (`lib/types/index.ts:137`) exists but is unused (no per-user overrides).

### 1.2 Route -> permission map (source: `lib/route-permissions.ts:12-63`, longest prefix wins, `null` = any signed-in admin)

| Route prefix | Permission | Route prefix | Permission |
|---|---|---|---|
| `/` (exact) | null | `/categories` | categories.manage |
| `/help` | null | `/stays/categories`, `/experiences/categories`, `/trips/categories`, `/cars/categories` | categories.manage |
| `/messages` | null | `/stays/amenities`, `/experiences/amenities` | categories.manage |
| `/where-did-it-go` | null | `/bookings` | bookings.view |
| `/users` | users.view | `/trips/booking-requests` | bookings.view |
| `/hosts` | hosts.view | `/cars/rentals` | bookings.view |
| `/moderation` | hosts.view | `/cars/owners` | hosts.view |
| `/approvals` | hosts.view | `/payments` | wallets.view |
| `/listings`, `/network`, `/search` | listings.view | `/reviews` | reviews.view |
| `/stays`, `/experiences`, `/trips`, `/cars` | listings.view | `/promotions` | promotions.manage |
| `/stays/new`, `/experiences/new`, `/trips/new`, `/cars/new` | listings.approve | `/stats`, `/reports` | reports.export |
| `/stays/change-requests`, `/experiences/change-requests` | listings.approve | `/settings` | settings.manage |
| | | `/settings/onboarding` | onboarding.edit |
| | | `/settings/commissions` | commissions.manage |
| | | `/settings/team` | team.manage |
| | | `/settings/audit-log` | audit.view |

This map is client-side only (sidebar, bottom nav, palette). The real gate is `guardPage(perm)` in each server page (`lib/auth/page-guard.tsx:19-28`) plus `runAction(perm)` in each server action (`lib/auth/run-action.ts:24-45`). Page guards mirror the map except: `/cars/insurance` and `/cars/pricing` pages use `listings.view` (map says `/cars` = listings.view, consistent), and `/payments/commissions` is `wallets.view` while `/settings/commissions` is `commissions.manage` (same component).

### 1.3 Feature table (role access derived from 1.1 + 1.2)

SA = super_admin, MO = moderator, SU = support, FI = finance, AN = analyst. "view" = can open, "act" = can mutate.

| # | Feature | Route(s) | Component(s) | Status | SA | MO | SU | FI | AN | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Sign-in / sign-out / session | `/login` | `(auth)/login/LoginForm.tsx`, `lib/actions/auth.ts`, `components/layout/Header.tsx` | built | act | act | act | act | act | JWT HS256 cookie, rate limit in memory, dev quick-fill buttons |
| 2 | Dashboard KPIs, charts, attention list, recent audit | `/` | `(panel)/page.tsx`, `DashboardClient.tsx` | partial | view | view | view | view | view | KPIs computed from store with fake period multipliers and hardcoded trends (`lib/data/analytics.ts:14,41-51`); monthly chart hardcoded (`:59-66`); page calls data layer directly so SU/MO see revenue though they lack `reports.export` |
| 3 | Approvals inbox (hosts, listings, documents, reviews, disputes) | `/approvals?tab=` | `approvals/ApprovalsClient.tsx` | partial | act | act (no disputes refund) | view | view | view | hosts/listings/reviews/disputes real; document approve calls `approveHost` (wrong entity), document reject is toast only; "undo" is toast only (`ApprovalsClient.tsx:268-298,310-340`) |
| 4 | Provider validation (host KYC queue) | `/moderation/providers`, `/moderation` (redirect), `/providers` (legacy), `/cars/owners` (redirect) | `moderation/providers/ProvidersValidationClient.tsx` | partial | act | act | view | view | view | approve/reject/unsuspend real; "request changes" toast only (`:373-395`); documents tab hardcoded "4/4" (`:730`) |
| 5 | Hosts directory + detail drawer | `/hosts`, `/hosts/[id]` | `hosts/HostsClient.tsx`, `hosts/[id]/page.tsx` | built | act | approve/suspend | view | override+recharge | view | ban exists in data+action but no UI; reject not offered in HostsClient |
| 6 | Host commission override | `/hosts` drawer | `HostsClient.tsx:377` | built | act | | | act | | `overrideCommission`; no "reset to default" |
| 7 | Host wallet recharge (from host drawer) | `/hosts` | `HostsClient.tsx:397-426` | built | act | | | act | | method hardcoded `ccp_transfer`, reason hardcoded English |
| 8 | Guests/users directory | `/users`, `/users/guests`, `/users?status=suspended,banned` | `users/UsersClient.tsx` | partial | act | suspend | suspend | | view | suspend/ban/delete/mark active/pending real; reset password toast only (`:287`); export toast only (`:567`) |
| 9 | All listings (cross-vertical) | `/listings` | `listings/ListingsClient.tsx`, `components/features/listings/useListingStatusActions.tsx` | built | act | act (no delete) | view | | view | approve, request changes, feature, status moves, delete/restore, bulk approve, CSV export |
| 10 | Vertical lists | `/stays`, `/experiences`, `/trips`, `/cars` | `StaysListClient`, `ExperiencesListClient`, `TripsListClient`, `CarsListClient` | partial | act | act | view | | view | list + status actions real; detail panel content partly hardcoded (schedules, tiers, seats) |
| 11 | Listing detail + decision | `/stays/[id]`, `/experiences/[id]`, `/trips/[id]`, `/cars/[id]` | `stays/[id]/StayDetailClient.tsx` (shared) | built | act | act | view | | view | no vertical check: `/cars/lst_001` shows a home |
| 12 | Listing review wizard (checklist) | `/x/[id]/review` | `stays/[id]/review/StayReviewClient.tsx` (shared) | partial | act | act | view | | view | decision persisted; checklist + internal notes NOT persisted (`ModerationChecklist` type unused) |
| 13 | Create listing wizards | `/stays/new`, `/experiences/new`, `/trips/new`, `/cars/new` | `StayWizardClient.tsx`, `ExperienceWizardClient.tsx` (reused for trips and cars) | mocked-only | act | act | | | | prefilled demo data, "save draft" and "create" are toasts (`StayWizardClient.tsx:179-206`) |
| 14 | Listing change requests | `/stays/change-requests`, `/experiences/change-requests` | `components/management/ChangeRequestsClient.tsx` | mocked-only | act | act | | | | 3 hardcoded requests in `useState` (`:43-77`), approve/reject local only |
| 15 | Trip booking requests | `/trips/booking-requests` | same `ChangeRequestsClient` | mocked-only | view | | view | view | view | shows listing change requests, not bookings |
| 16 | Categories (global) | `/categories` | `categories/CategoriesClient.tsx` | built | act | act | | | | create/toggle/delete, no edit, no reorder |
| 17 | Per-vertical categories | `/stays/categories`, `/experiences/categories`, `/trips/categories`, `/cars/categories` | `components/management/CategoriesManagerClient.tsx` | partial | act | act | | | | list is NOT filtered by vertical; no delete |
| 18 | Car pricing tiers, car insurance | `/cars/pricing`, `/cars/insurance` | `CategoriesManagerClient` | mocked (misuse) | act | act | view | | view | writes rows into the categories store; no pricing/insurance model; `Insurance`, `PricingTier` types unused |
| 19 | Amenities | `/stays/amenities`, `/experiences/amenities` | redirect to categories | missing | | | | | | `Amenity` type exists, no store, no data function |
| 20 | Bookings | `/bookings`, `/cars/rentals` (redirect `?vertical=cars`) | `bookings/BookingsClient.tsx`, `components/features/bookings/BookingMoneyDialogs.tsx` | built | act | | act | refund | view | cancel, refund, dispute, CSV; vertical tab counts hardcoded (`:189-194`) |
| 21 | Finance overview + wallets + ledger + payouts + refunds | `/payments`, `/payments/{wallets,transactions,commissions,payouts,refunds}`, `/finance` (legacy) | `payments/PaymentsClient.tsx` | built | act | | | act | view | recharge, approve/reject payout, edit default rates, CSV exports |
| 22 | Default commission rates | `/payments/commissions`, `/settings/commissions` | `PaymentsClient` initialTab=commissions | built | act | | | act | view (payments) | rates do not propagate to existing hosts |
| 23 | Reviews moderation | `/reviews`, `/reviews?status=flagged` | `reviews/ReviewsClient.tsx` | built | act | act (no delete) | view | | view | hide, restore, dismiss flag, delete; export toast only (`:225`) |
| 24 | Review "reports" and "disputes" tabs | `/reviews/reports`, `/reviews/disputes` | `ReviewsClient` | mocked-only | view | view | view | | view | same review list unfiltered; no report or dispute entity behind it |
| 25 | Coupons | `/promotions` | `promotions/PromotionsClient.tsx` | built | act | act | | | | create/toggle/delete, no edit; not consumed by any checkout |
| 26 | Featured placements | `/promotions/featured` | `PromotionsClient` | mocked-only | act | act | | | | hardcoded `FEATURED_PLACEMENTS` (`:45-49`); the real flag is `Listing.isFeatured` via `/listings` |
| 27 | Messages, sent notifications, templates, broadcast | `/messages`, `/messages/notifications`, `/messages/templates` | `messages/MessagesClient.tsx` | mocked-only | act | act | act | act | act | threads in `useState` (`:93-163`), broadcast dialog is toast only (`:529-535`); no permission at all |
| 28 | Stats / reports | `/stats`, `/stats/{providers,services,wilayas,revenue,reports}`, `/reports` | `stats/StatsClient.tsx` | partial | view | view | | view | view | almost all figures hardcoded (`:44-79`); KPI CSV export is real and audited |
| 29 | Network explorer, search | `/network`, `/search?q=` | `NetworkClient.tsx`, `SearchClient.tsx` | built | act | act | view | | view | guest-style search over listings; quick approve / suspend |
| 30 | Platform settings (general, languages, notifications, security) | `/settings`, `/settings/{languages,notifications,security}` | `settings/SettingsClient.tsx` | partial | act | | | | | saves to store but with field-name mismatch; languages static; notifications toggles never saved; nothing enforces maintenance/2FA/timeout |
| 31 | Team & roles | `/settings/team`, `/team` (legacy) | `settings/team/TeamClient.tsx` | built | act | | | | | change role, activate/deactivate, invite (no email, no acceptance flow, no password set) |
| 32 | Audit log | `/settings/audit-log`, `/audit-log` (legacy) | `settings/audit-log/AuditLogClient.tsx` | built | view+export | view+export | view | view+export | view+export | export needs `reports.export` too |
| 33 | Onboarding configurator | `/settings/onboarding`, `/onboarding` (legacy) | `settings/onboarding/OnboardingClient.tsx` | partial | act | | | | | add/remove/reorder steps, toggle required, publish; no field editor; guest site does not read it |
| 34 | Command palette | global (Ctrl/Cmd+K) | `components/layout/CommandPalette.tsx` | built | act | act | act | act | act | results filtered by permission; links to non-existent `/listings/{id}`, `/bookings/{id}`, `/users/{id}` |
| 35 | Help, where-did-it-go, product tour, training mode, what-changed banner | `/help`, `/where-did-it-go` | `HelpClient`, `WhereDidItGoClient`, `ProductTour`, `TrainingModeBanner`, `WhatChangedBanner` | UI only | view | view | view | view | view | state in `localStorage` (`components/layout/AdminLayoutClient.tsx:39-92`); training mode does not block writes |

### 1.4 Per-role summary

| Role | Can do (real, persisted) | Sees but cannot act | Notably cannot |
|---|---|---|---|
| super_admin | everything in 1.3 | n/a | nothing gated; only role with onboarding, team, settings, listings.delete, users.ban/delete, reviews.delete, hosts.delete/ban |
| moderator | approve/reject/suspend hosts and listings, feature listings, request changes, review hide/restore/dismiss, categories, coupons, suspend guests, CSV exports (hosts, listings, audit, KPI) | users, audit log, dashboard revenue | bookings (no `bookings.view`), wallets, delete anything, ban |
| support | cancel/refund bookings, resolve disputes (incl. refunds), suspend/unsuspend guests, mark guest active/pending | hosts, listings, reviews, audit | wallets/ledger, any export (no `reports.export`), stats |
| finance | wallet recharge, payout approve/reject, default commission rates, host commission override, booking refunds (not disputes), ledger/wallet/booking/host exports | hosts, bookings, audit | listings, users, reviews (no `.view`), cancel bookings, resolve disputes |
| analyst | CSV exports of hosts, listings, bookings, wallets, ledger, audit, KPI | hosts, listings, users, bookings, reviews, wallets, audit, stats | any mutation |

---

## 2. Data inventory

### 2.1 Types in `lib/types/index.ts`

| Type | Lines | Fields (abridged where noted) | Enums / relations | Used by store? |
|---|---|---|---|---|
| `UserRole` | 1 | `"guest" \| "host" \| "admin"` | copied from frontend | unused |
| `HostType` | 2 | `individual \| agency \| hotel \| hostel` | key of commission rates, onboarding flows | yes |
| `ProviderCategory` | 4-9 | `host \| hotel_hostel \| travel_agency \| experience_company \| rental_agency` | derived by `getProviderCategory` (`lib/data/hosts.ts:38-45`) | derived only |
| `Document` | 11-23 | id, type, title, fileName, fileSize, fileUrl, mimeType?, status `valid\|to_check\|missing\|rejected`, reviewer?, reviewedAt?, rejectionReason? | | unused |
| `ModerationChecklistItem` / `ModerationChecklist` | 25-46 | items, internalNotes, decision `approve_publish\|request_changes\|reject`, decisionReason, decisionAt, decidedBy; entityType `stay\|experience\|trip\|car\|provider`; item status `valid\|to_check\|missing\|rejected\|conforme\|verifiee\|complete` | | unused |
| `ChangeRequest` | 48-60 | id, entityType, entityId, entityTitle, requestedBy, requestedAt, status `pending\|approved\|rejected`, beforeState, afterState, reason?, adminResponse? | | unused (UI has its own local type) |
| `WizardDraft` | 62-68 | id, entityType, step, data, updatedAt | | unused |
| `PointOfInterest`, `PickupPoint`, `ProgrammeItem`, `PricingTier`, `Insurance`, `HouseRules` | 70-115 | listing sub-structures | `Listing.pointsOfInterest`, `.pickupPoints`, `.programme`, `.pricingTiers`, `.houseRules` | never seeded |
| `Amenity` | 117-124 | id, name{en,fr,ar}, icon, category, order?, isFeatured? | | unused |
| `AdminRole` | 126 | `super_admin \| moderator \| support \| finance \| analyst` | | yes |
| `AdminUser` | 128-142 | id, name, email, role, avatar?, isActive, createdAt, lastLoginAt?, permissions?, status? `active\|invited\|deactivated`, invitedAt?, invitedBy? | `store.team` | yes |
| `AdminActor` | 149-155 | id, name, role, ip? | server-derived | runtime |
| `AuditActor` | 158-163 | id, name, role `AdminRole\|"anonymous"`, ip? | | runtime |
| `Permission` | 165-199 | 34 values, see 1.1 | | |
| `HostStatus` | 201-208 | `applied \| under_review \| approved \| rejected \| suspended \| banned \| deleted` | | yes |
| `VerificationStatus` | 210 | `verified \| pending \| missing \| expired` | | yes |
| `HostDocument` | 212-221 | id, type `id_card\|commercial_register\|tax_card\|tourism_licence\|property_deed`, title, fileUrl, status `pending\|approved\|rejected`, rejectionReason?, uploadedAt, reviewedAt? | embedded in `Host.documents` | yes |
| `OrganizationMember` | 223-230 | userId, name, email, role `owner\|admin\|manager\|guide\|agent`, phone?, avatar? | | never seeded |
| `Organization` | 232-250 | id, name, hostType, ownerUserId, description?, logo?, coverImage?, address?, wilayaCode, phone?, email?, tradeRegisterNumber?, taxNumber?, tourismLicenseNumber?, verificationStatus **boolean**, members[], createdAt | `Host.organization?`, `Host.organizationId?` | never seeded |
| `Host` | 252-298 | id, ownerName, businessName?, email, phone, hostType, status, statusBeforeDelete?, verificationStatus, wilayaCode, city, address?, rating, reviewsCount, listingsCount, bookingsCount, walletBalance (derived), commissionRate (%), isCommissionOverridden?, joinedAt, lastActiveAt, bookingApprovalMode `instant\|request`, verticalsOffered[], organizationId?, organization?, documents[], adminNotes[], providerCategory?, formattedId?, agencyMetadata{teamSize,hasTrips,licenseNumber}?, hotelMetadata{starRating,roomCount,amenities[]}?, hostelMetadata{bedCount,dormTypes[]}? | no link to a `GuestUser`/user account | yes |
| `ListingVertical` | 300 | `home \| hotel \| experience \| vehicle \| trip` | | yes |
| `ListingStatus` | 301-312 | canonical `draft\|pending_review\|approved\|changes_requested\|rejected\|suspended\|archived\|deleted` + legacy aliases `pending\|published\|refused` | `normalizeListingStatus` (`lib/domain/transitions.ts:73-78`) | yes |
| `BookingUnit` | 314 | `room \| bed \| property \| person \| day` | | partially |
| `RoomType` | 316-329 | id, propertyListingId, name, description?, price, bookingUnit `room\|bed`, totalInventory, availableInventory?, capacity, bedsDescription?, amenities[], imageSrc[] | `Listing.rooms` (hotel/hostel hosts only) | yes |
| `Listing` | 331-386 | id, formattedId?, title, description, category (vertical), vertical? (dup), propertyType, hostId, hostName, hostType (denormalised), status, statusBeforeDelete?, price, priceDzd? (dup), originalPrice?, imageSrc[], images? (dup), createdAt, updatedAt, wilayaCode, city, address?, coordinates{lat,lng}, guestCapacity, bedroomCount?, bathroomCount?, surfaceM2?, constructionYear?, rating, reviewsCount, bookingsCount, amenities[] (free strings), bookingApprovalMode, isFeatured, isReported, adminNotes[], moderationChecklist{photosOk,locationAccurate,priceReasonable,policiesPresent,descriptionAppropriate}?, rooms?, houseRules?, pointsOfInterest?, pickupPoints?, programme?, pricingTiers?, specs? | `hostId -> Host.id` | yes |
| `GuestStatus` | 388 | `active \| pending \| suspended \| banned \| deleted` | | yes |
| `GuestUser` | 390-411 | id, name, email, phone?, avatar?, status, role `guest\|host\|both`, emailVerified (bool), idVerified, wilayaCode?, preferredLanguage `en\|fr\|ar`, bookingsCount, totalSpentDzd, walletBalanceDzd, reviewsWrittenCount, favoritesCount, joinedAt, lastActiveAt, isFlagged, adminNotes[] | counters are random, not derived | yes |
| `BookingStatus` | 413-419 | `pending \| confirmed \| cancelled \| completed \| disputed \| refunded` | | yes |
| `Booking` | 421-466 | id, reference (`BLD-2026-NNNN`), listingId, listingTitle, listingImage, vertical, hostId, hostName, hostType, guestId, guestName, guestEmail, guestPhone, wilayaCode, status, approvalMode, checkInDate, checkOutDate (YYYY-MM-DD), nightsCount, guestsCount, basePriceDzd, serviceFeeDzd (always 0), totalAmountDzd, commissionRate, commissionAmountDzd, hostPayoutDzd, paymentStatus, refundedAmountDzd?, refundedAt?, paymentMethod `cib_edahabia\|ccp_transfer\|baridimob\|cash_on_arrival`, createdAt, cancelledAt?, disputeReason?, disputeResolution{outcome,refundAmountDzd,note,resolvedAt,resolvedBy}?, adminNotes[] | `listingId`, `hostId`, `guestId` (heavy denormalisation) | yes |
| `BookingPaymentStatus` | 468 | `paid \| partially_refunded \| refunded \| pending \| failed` | | yes |
| `DisputeOutcome` | 470 | `refund_full \| refund_partial \| declined` | | yes |
| `ReviewStatus` | 472 | `published \| flagged \| hidden \| deleted` | | yes |
| `ReviewItem` | 474-497 | id, listingId, listingTitle, vertical, guestId, guestName, guestAvatar?, hostId, hostName, hostType, wilayaCode, rating 1-5, comment, status, flagReason?, flaggedBy?, createdAt, hostReply{comment,createdAt}?, adminNotes[] | no `bookingId` | yes |
| `TransactionType` | 499-505 | `booking_payment \| commission_deduction \| host_payout \| wallet_recharge \| booking_refund \| adjustment` | | yes |
| `WalletTransaction` | 507-523 | id, walletId (`wlt_<hostId>`), hostId, hostName, hostType, type, amount (signed int), amountDzd? (dup), balanceAfter, reference, description, bookingRef?, receiptReference?, adminActor? (name, not id), createdAt | | yes |
| `HostWallet` | 525-542 | id, hostId, ownerName, businessName?, hostName?, hostType, wilayaCode, balance (derived), balanceDzd?, totalEarned, totalCommissionsPaid, totalCommissionsPaidDzd?, totalPayouts, lastTransactionAt, isNegative, commissionRate? | 1:1 with Host | yes |
| `PayoutRequest` | 544-565 | id, hostId, hostName, hostType, amountDzd, payoutMethod `ccp\|bank_wire\|baridimob`, accountDetails{ccpRip?,rib?,phone?}, status, requestedAt, processedAt?, processedBy? (name), rejectionReason?, transactionId?, adminNotes? | `transactionId -> WalletTransaction.id` | yes |
| `PayoutStatus` | 567 | `pending \| approved \| processed \| rejected` | `processed` never produced | yes |
| `AuditEntry` | 569-584 | id, timestamp, actorId, actorName, actorRole, action (free string), entityType `host\|listing\|user\|booking\|review\|wallet\|payout\|setting\|onboarding\|promotion\|auth\|export\|team`, entityId, entityName? (never set), beforeState?, afterState?, details, ipAddress | | yes |
| `ModerationCase` | 586-600 | id, type `host\|listing\|document\|review\|dispute`, entityId, title, subtitle, submittedAt, waitingDays, priority `high\|normal\|low`, hostType?, vertical?, wilayaCode?, status, details (any) | computed view | computed |
| `OnboardingFieldType` | 603-613 | `text \| textarea \| number \| select \| multiselect \| radio \| file \| location \| amenities \| boolean` | | yes |
| `OnboardingFieldConfig` | 615-626 | id?, key?, label{en,fr,ar}, type, required?, order?, placeholder?, helpText?, options?[{value,label}], isCore? | | yes |
| `OnboardingStepConfig` | 628-639 | id, stepNumber?, order?, isCore?, isActive?, isRequired?, title?, name? (dup of title), description, fields[] | | yes |
| `OnboardingConfig` | 641-649 | version (int, global), updatedAt, publishedBy (name), flows: Record<HostType,{maxPagesAllowed?, steps[]}> | | yes |
| `CategoryItem` | 651-661 | id, name{en,fr,ar}, vertical, slug?, iconName?, icon? (dup), listingCount, isActive, order | not linked to listings (`Listing.propertyType` is free text) | yes |
| `PromotionCoupon` | 663-680 | id, code, discountType `percentage\|fixed_dzd\|fixed`, discountValue, minSpendDzd, maxUsage?/maxUses? (dup), usedCount/currentUses? (dup), startDate?/endDate?/expiresAt? (dup), status `active\|expired\|disabled`, scope? `all\|ListingVertical`, targetWilayas?, targetHostTypes? | | yes |
| `PlatformSettings` | 682-701 | platformName, supportEmail, supportPhone, defaultLocale, enabledLocales[], primaryCurrency `DZD`, supportedCurrencies[], guestServiceFeePercent, serviceFeePercent? (dup), defaultCommissionRates, instantBookingPlatformWide, maintenanceMode, sessionTimeoutMinutes, twoFactorAuthEnabled, security{sessionTimeoutMinutes?,twoFactorRequired?}? (dup) | | yes |
| `PaginatedResult<T>` | 703-710 | rows, total, page, pageSize, totalPages, facets? | | contract |
| `QueryParams` | 712-719 | page, pageSize, search, sortBy, sortOrder, filters | | unused |
| `NetworkSearchParams` | 721-730 | vertical?, destination?, wilayaCode?, guests?, minPrice?, maxPrice?, hostType?, propertyType? | | yes |
| `CommandPaletteResult` | 732-739 | id, type `host\|listing\|user\|booking\|review\|action`, title, subtitle, href, badge? | | yes |

Other types outside `lib/types`: `CurrentAdmin` (`lib/auth/current-admin.ts:28-35`), `SessionPayload` (`lib/auth/session.ts:20-26`), `ActionResult`/`ActionErrorCode` (`lib/actions/result.ts:8-12`), `FinanceSummary` (`lib/data/finance.ts:389-403`), `WalletAggregate` (`lib/data/ledger.ts:12-18`), filter param interfaces in each `lib/data/*.ts`, `Wilaya` (`lib/utils/wilayas.ts`, code string `"01".."68"`, region `north|high_plateaus|south`).

### 2.2 Mock collections (`lib/mock-data/store.ts:30-211`, seeded by `lib/mock-data/generator.ts`)

Seed RNG: LCG seed `20261020` (`generator.ts:25-34`), but dates use `Date.now()` so timestamps shift every boot.

| Collection | Rows | Id format | Seed distribution (generator lines) |
|---|---|---|---|
| `users` (GuestUser) | 320 | `usr_001` | status: active 85%, suspended 9%, banned 4%, deleted 2% (`:84`); role `both` for i<=80 else `guest` (`:95`); never `pending`; bookingsCount 0-18 random, totalSpent = count x 12k-65k, walletBalanceDzd 0-45k (`:85-102`) |
| `hosts` (Host) | 128 (32 per host type, round robin `:117`) | `hst_001` | status: approved 65%, under_review 13%, applied 10%, suspended 6%, rejected 4%, banned 2% (`:121-127`); verification verified 70%/pending 15%/missing 10%/expired 5% (`:129-131`); 15% commission overridden at default +2.5 or -2.0 (`:146-149`); docs: id_card always approved, non-individual also RC, tax card, tourism licence (approved if verified else pending) (`:157-194`); listingsCount/bookingsCount/rating random (`:208-211`); walletBalance overwritten from ledger (`:544-546`) |
| `listings` (Listing) | 430 | `lst_001` | random host; vertical by host type: agency trip/experience/vehicle, hotel+hostel `hotel`, individual home/experience (`:278-282`); status approved 65%, pending_review 13%, changes_requested 8%, rejected 6%, suspended 4%, draft 2%, archived 2% (`:284-291`); price ranges per vertical (`:293-298`); 2 RoomTypes for hotel/hostel (`:300-327`); isFeatured 12%, isReported 4%; coordinates random box around 28.03,1.66 +/-4deg (`:347-350`) |
| `bookings` (Booking) | 840 | `bkg_0001`, ref `BLD-2026-8001..8840` | status completed 50%, confirmed 25%, pending 10%, cancelled 7%, disputed 5%, refunded 3% (`:382-387`); nights 1-7, base = listing.price x nights, amounts via `computeBookingAmounts` (`:389-396`); payment refunded/pending/paid by status (`:429`); paymentMethod never `cash_on_arrival` (`:431`); check-in -120..+60 days |
| `reviews` (ReviewItem) | 330 | `rev_001` | from a random booking; published 85%, flagged 9%, hidden 4%, deleted 2% (`:452-456`); flagged rating 1-2 else 4-5 |
| `transactions` (WalletTransaction) | 1550 | `tx_0001`, ref `TXN-DZ-10001..` | booking_payment 50% (+15k..85k), commission_deduction 25% (-2k..15k), host_payout 15% (-20k..100k), wallet_recharge 10% (+20k..150k) (`:492-512`); NOT linked to real bookings (random `BLD-2026-xxxx` refs `:496,522`); no `booking_refund` or `adjustment` seeded; sorted chronologically and `balanceAfter` computed (`:527-541`) |
| `wallets` (HostWallet) | 128 | `wlt_<hostId>` | derived from transactions (`:549-570`) |
| `audit` (AuditEntry) | 215 seeded (frozen) | `aud_001`; runtime `aud_<ms>_<rand>` | all actor adm_01; 7 template actions incl. `COMMISSION_CHANGE`, `DISPUTE_RESOLVE` which no code path emits; entityId like `host_42` (not real ids) (`:574-598`) |
| `payouts` (PayoutRequest) | 14 | `pay_001` | first 14 approved hosts; idx<9 pending, 9-11 approved, 12-13 rejected (`:615`); pending idx%4==3 deliberately exceeds balance (`:616-620`); seeded approved ones have no `transactionId` and no matching ledger debit |
| `team` (AdminUser) | 5 | `adm_01..adm_05`; invite `adm_inv_<base36>` | one per role (`lib/mock-data/admins.ts:14-65`); passwords from env vars with dev defaults (`:67-82`) |
| `categories` (CategoryItem) | 3 | `cat_villas`, `cat_sahara`, `cat_4x4`; runtime `cat_<ms>` | listingCount hardcoded 48/42/28 (`store.ts:44-48`) |
| `promotions` (PromotionCoupon) | 3 | `cpn_sahara2026`, `cpn_marhaban`, `cpn_oran_sea`; runtime `cpn_<ms>` | SAHARA2026 15% experience; MARHABAN 5000 DZD fixed all; ORANSEA 10% home expired (`store.ts:50-90`) |
| `platformSettings` | 1 | n/a | `store.ts:92-106`: defaultLocale `fr`, currencies DZD/EUR/USD, guestServiceFeePercent 0, default rates, sessionTimeoutMinutes 480, twoFactorAuthEnabled false |
| `onboardingConfig` | 1 | n/a | version 1; individual 2 steps (5 fields), agency 1 step (2 fields), hotel 1 step (2), hostel 1 step (1) (`store.ts:108-191`) |
| `credentials` | Map adminId -> `scrypt$salt$hash` | n/a | lazily hashed on first login (`lib/data/credentials.ts:9-18`) |

Generator file comments say ">= 125 hosts", ">= 420 listings" etc. Actual loop bounds: 320 / 128 / 430 / 840 / 330 / 1550 / 215 / 14.

---

## 3. Function inventory: `lib/data/*` and `lib/actions/*`

Conventions:
- Every `lib/data` function is `server-only`; every `lib/actions` function is `"use server"` and wraps the data call in `runAction(permission, fn)` (`lib/auth/run-action.ts:24-45`) which returns `{ok,data}|{ok:false,code}` with codes `unauthenticated|forbidden|invalid|conflict|failed`.
- Read functions in `lib/data` do NOT call `assertCan`; protection relies on the action or on `guardPage` in the calling server page. Mutations call `assertCan(actor.role, perm)` again (defense in depth).
- All mock functions `await delay(100..200ms)`.
- "Audit" column = calls `logAudit`/`logExport`.

### 3.1 analytics

| File:L | Function | Inputs | Output | R/W | Callers | Perm | Audit | Future backend |
|---|---|---|---|---|---|---|---|---|
| data/analytics.ts:11 | getDashboardKPIs | period `7d\|30d\|90d\|1y` | net revenue, GMV, commission, counts, fixed occupancy 78.4/cancel 4.8/response 24, fake trends | R | `(panel)/page.tsx` (direct), StatsClient via action | page: none; action: reports.export | no | `GET /api/v1/admin/analytics/kpis?period=` (real time windows) |
| data/analytics.ts:55 | getDashboardCharts | period (ignored) | monthlyRevenue (hardcoded), revenueByHostType, hostCategoryPerformance, revenueByVertical (listing counts), bookingsByWilaya top 10 | R | dashboard page, StatsClient | same | no | `GET /api/v1/admin/analytics/charts?period=` |
| data/analytics.ts:161 | getAttentionItems | none | counts of pending hosts/listings, flagged reviews, disputes + top items with hrefs | R | dashboard page | none | no | `GET /api/v1/admin/attention` (or reuse moderation queue counts) |
| data/analytics.ts:206 | exportKpiReport | reportName, period, actor | CsvExport | R | StatsClient | reports.export | yes DATA_EXPORT `kpi_report` | `POST /api/v1/admin/reports/kpi/export` (async job) |
| actions/analytics.ts:6,10,14 | getDashboardKPIs / getDashboardCharts / exportKpiReport | as above | ActionResult | | StatsClient | reports.export | as data | |

### 3.2 approvals

| File:L | Function | Inputs | Output | R/W | Callers | Perm | Audit | Future backend |
|---|---|---|---|---|---|---|---|---|
| data/approvals.ts:8 | getApprovalsInbox | tab `hosts\|listings\|documents\|reviews\|disputes` | `{items: ModerationCase[], counts}` oldest first | R | `(panel)/layout.tsx` (count badge, if hosts.view), ApprovalsClient | action: hosts.view | no | `GET /api/v1/admin/moderation/queue?type=&page=` + `GET /api/v1/admin/moderation/counts` |
| actions/approvals.ts:6 | getApprovalsInbox | tab | | | ApprovalsClient | hosts.view | | |

### 3.3 audit

| File:L | Function | Inputs | Output | R/W | Callers | Perm | Audit | Future backend |
|---|---|---|---|---|---|---|---|---|
| data/audit.ts:20 | logAudit | actor, action, entityType, entityId, details, before?, after? | AuditEntry | W (append) | every mutating data fn, auth actions | n/a | is the audit | DB insert in same transaction as the mutation (Django signal or service layer) |
| data/audit.ts:48 | logExport | actor, dataset, rowCount, filters | void | W | all export fns | n/a | `DATA_EXPORT` | same |
| data/audit.ts:102 | listAuditLogs | page, pageSize(20), actorRole, entityType, search | Paginated<AuditEntry> | R | dashboard page (pageSize 6, if audit.view), AuditLogClient | audit.view | no | `GET /api/v1/admin/audit-logs?actor_role=&entity_type=&q=&page=` |
| data/audit.ts:127 | exportAuditLogs | filters, actor | CsvExport | R | AuditLogClient | audit.view + reports.export | yes | `POST /api/v1/admin/audit-logs/export` |
| actions/audit.ts:8,13 | listAuditLogs / exportAuditLogs | | | | AuditLogClient | audit.view (+reports.export) | | |

### 3.4 auth / credentials / team-auth

| File:L | Function | Inputs | Output | R/W | Callers | Perm | Audit | Future backend |
|---|---|---|---|---|---|---|---|---|
| actions/auth.ts:33 | loginAction | FormData email, password, locale, returnTo | redirect or `{error}` | W (cookie, lastLoginAt, rate-limit map) | LoginForm | public | LOGIN_BLOCKED / LOGIN_FAILURE / LOGIN_SUCCESS | `POST /api/v1/admin/auth/login` (set httpOnly cookie or return token) |
| actions/auth.ts:116 | logoutAction | FormData locale | redirect | W (cookie delete) | Header | signed-in | LOGOUT | `POST /api/v1/admin/auth/logout` (server-side session revocation) |
| actions/auth.ts:137 | getDemoCredentials | email | `{email,password}` or null (dev only) | R | LoginForm | public, NODE_ENV=development | no | drop |
| data/credentials.ts:9 | getAdminPasswordHash | adminId | hash or null | R/W (lazy hash) | lib/auth/credentials.ts | n/a | no | Django auth `password` column |
| data/credentials.ts:21 | listDevDemoAccounts | none | SA, MO, FI emails (dev) | R | login page | public dev | no | drop |
| data/credentials.ts:30 | getDevSeedPassword | adminId | string (dev) | R | getDemoCredentials | dev | no | drop |
| auth/credentials.ts:17 | verifyAdminCredentials | email, password | ok/unknown_account/bad_password/inactive | R | loginAction | n/a | no | Django `authenticate()` |
| auth/current-admin.ts:44 | getCurrentAdmin (React cache) | cookie | CurrentAdmin or null | R | layout, guardPage, login page, dashboard, logout | n/a | no | `GET /api/v1/admin/auth/me` |
| auth/current-admin.ts:66,73 | requireAdmin / requirePermission | perm | AdminActor | R | runAction | | | DRF permission classes |

### 3.5 bookings

| File:L | Function | Inputs | Output | R/W | Callers | Perm | Audit | Future backend |
|---|---|---|---|---|---|---|---|---|
| data/bookings.ts:93 | listBookings | status, vertical, hostType, wilayaCode, paymentStatus, approvalMode, search, pendingOver24h, sortBy `created\|checkIn\|amount`, sortOrder, page, pageSize(12) | Paginated<Booking> + facets status, vertical (global counts) | R | BookingsClient | bookings.view | no | `GET /api/v1/admin/bookings?status=&vertical=&host_type=&wilaya=&payment_status=&approval_mode=&q=&pending_over_24h=&ordering=&page=` |
| data/bookings.ts:138 | getBookingById | id | Booking or null | R | none (action unused) | bookings.view | no | `GET /api/v1/admin/bookings/{id}` |
| data/bookings.ts:144 | exportBookings | filters, actor | CsvExport (19 cols) | R | BookingsClient | reports.export + bookings.view | yes DATA_EXPORT `bookings` | `POST /api/v1/admin/bookings/export` |
| data/bookings.ts:165 | cancelBooking | id, reason (>=3), actor | Booking | W | BookingsClient | bookings.cancel | BOOKING_CANCEL | `POST /api/v1/admin/bookings/{id}/cancel {reason}` |
| data/bookings.ts:205 | applyRefund (private) | idx, amount, note, actor | {prev,next} | W + ledger | refundBooking, resolveDispute | | via caller | service function inside a DB transaction with `SELECT ... FOR UPDATE` on booking + wallet |
| data/bookings.ts:251 | refundBooking | id, amount (int DZD), reason, actor | Booking | W + ledger `booking_refund` | BookingsClient (RefundDialog) | bookings.refund | BOOKING_REFUND / BOOKING_PARTIAL_REFUND | `POST /api/v1/admin/bookings/{id}/refunds {amount_dzd, reason, idempotency_key}` |
| data/bookings.ts:284 | resolveDispute | id, outcome, note, actor, amount? | Booking | W + ledger | BookingsClient (DisputeDialog), ApprovalsClient | bookings.dispute (+bookings.refund unless declined) | BOOKING_DISPUTE_RESOLVED / _DECLINED | `POST /api/v1/admin/bookings/{id}/dispute/resolve {outcome, note, amount_dzd?}` |
| actions/bookings.ts:11,15,19,24,30,50 | listBookings, getBookingById, cancelBooking, refundBooking, resolveDispute, exportBookings | validated with `id`, `reason`, `dzd`, `oneOf` | | | as above | as above | | |

### 3.6 categories

| File:L | Function | Inputs | Output | R/W | Callers | Perm | Audit | Future backend |
|---|---|---|---|---|---|---|---|---|
| data/categories.ts:10 | listCategories | none | CategoryItem[] sorted by order | R | CategoriesClient, CategoriesManagerClient | action: **null** (any admin) | no | `GET /api/v1/admin/categories?vertical=` |
| data/categories.ts:15 | createCategory | item minus id/listingCount, actor | CategoryItem | W | CategoriesClient, CategoriesManagerClient | categories.manage | CATEGORY_CREATE (entityType `setting`, no before/after) | `POST /api/v1/admin/categories` |
| data/categories.ts:33 | toggleCategoryStatus | id, actor | CategoryItem | W | both | categories.manage | CATEGORY_TOGGLE | `PATCH /api/v1/admin/categories/{id} {is_active}` |
| data/categories.ts:59 | deleteCategory | id, actor | true (hard delete, silent if unknown) | W | CategoriesClient | categories.manage | CATEGORY_DELETE | `DELETE /api/v1/admin/categories/{id}` (block if listings attached) |
| actions/categories.ts:7,11,15,19 | same 4 | `obj(item)` only, no field validation | | | | | | |

### 3.7 command palette

| File:L | Function | Inputs | Output | R/W | Callers | Perm | Audit | Future backend |
|---|---|---|---|---|---|---|---|---|
| data/command-palette.ts:8 | searchGlobalCommandPalette | query | <=12 results across hosts, listings, bookings, users (substring), or 5 default actions | R | CommandPalette | action: null, then filters by per-type perm + `canAccessPath` (`actions/command-palette.ts:18-26`) | no | `GET /api/v1/admin/search?q=` (Postgres trigram / full-text) |

### 3.8 finance + ledger

| File:L | Function | Inputs | Output | R/W | Callers | Perm | Audit | Future backend |
|---|---|---|---|---|---|---|---|---|
| data/ledger.ts:21 | computeWalletAggregates | none | Map hostId -> {balance, totalEarned, totalCommissionsPaid, totalPayouts, lastTransactionAt} | R | listWallets, getFinanceSummary, listHosts | n/a | no | SQL `GROUP BY host_id` or materialised balance with ledger as source of truth |
| data/ledger.ts:38 | getHostBalance | hostId | number | R | recharge, payouts, hosts | n/a | no | `SUM(amount)` under row lock |
| data/ledger.ts:58 | appendLedgerEntry | host, type, amount (non-zero int), description, bookingRef?, receiptReference?, adminActor? | WalletTransaction (prefix ref `TXN-BKG/COM/PAY/REC/RFD/ADJ-<base36>`) | W | rechargeWallet, approvePayout, applyRefund | n/a | caller | `ledger_entries` insert, append-only |
| data/finance.ts:82 | listWallets | hostType, wilayaCode, onlyNegative, minBalance, maxBalance, search, page, pageSize(12) | Paginated<HostWallet> sorted by balance desc, facets hostType, solvency | R | PaymentsClient | wallets.view | no | `GET /api/v1/admin/wallets?...` |
| data/finance.ts:145 | listTransactions | hostId, type, search, page, pageSize(15) | Paginated<WalletTransaction> newest first | R | PaymentsClient | wallets.view | no | `GET /api/v1/admin/ledger?host=&type=&q=&page=` |
| data/finance.ts:160 | exportTransactions | type, search, hostId, actor | CsvExport | R | PaymentsClient | reports.export + wallets.view | DATA_EXPORT `wallet_ledger` | `POST /api/v1/admin/ledger/export` |
| data/finance.ts:183 | exportWallets | filters, actor | CsvExport | R | PaymentsClient | reports.export + wallets.view | DATA_EXPORT `wallets` | `POST /api/v1/admin/wallets/export` |
| data/finance.ts:205 | rechargeWallet | hostId, amount 1..10,000,000, method (free string), reason (free, not min length), receiptReference (required), actor | {transaction, newBalance} | W ledger `wallet_recharge` | PaymentsClient, HostsClient | wallets.recharge | WALLET_RECHARGE (before/after balance, txId) | `POST /api/v1/admin/wallets/{hostId}/recharges {amount_dzd, method, reason, receipt_reference}` + unique constraint on receipt_reference + Idempotency-Key |
| data/finance.ts:247 | getCommissionRates | none | Record<HostType, number> | R | PaymentsClient | wallets.view | no | `GET /api/v1/admin/commission-rates` |
| data/finance.ts:252 | updateCommissionRates | rates (each 0..100, 2 dp), actor | rates | W settings | PaymentsClient | commissions.manage | COMMISSION_RATES_UPDATE | `PUT /api/v1/admin/commission-rates` (versioned, effective_from) |
| data/finance.ts:283 | listPayouts | status | PayoutRequest[] pending first, no paging | R | PaymentsClient | wallets.view | no | `GET /api/v1/admin/payouts?status=&page=` |
| data/finance.ts:311 | approvePayout | id, actor | PayoutRequest | W ledger `host_payout` + payout | PaymentsClient | payouts.approve | PAYOUT_APPROVE | `POST /api/v1/admin/payouts/{id}/approve` (+ later `/mark-processed`) |
| data/finance.ts:359 | rejectPayout | id, reason (>=3), actor | PayoutRequest | W | PaymentsClient | payouts.approve | PAYOUT_REJECT | `POST /api/v1/admin/payouts/{id}/reject {reason}` |
| data/finance.ts:406 | getFinanceSummary | none | FinanceSummary (wallet total, negatives, pending payouts, month commissions/payouts, refunds, escrow) | R | PaymentsClient | wallets.view | no | `GET /api/v1/admin/finance/summary` |
| data/finance.ts:468 | listRefunds | page, pageSize(10) | refunded bookings projection | R | PaymentsClient | wallets.view | no | `GET /api/v1/admin/refunds?page=` (needs a `refunds` table, today only a cumulative field) |
| actions/finance.ts:22-128 | 12 wrappers | validated with dzd/rate/reason/str | | | | as above | | |

### 3.9 hosts

| File:L | Function | Inputs | Output | R/W | Callers | Perm | Audit | Future backend |
|---|---|---|---|---|---|---|---|---|
| data/hosts.ts:38 | getProviderCategory | Host | ProviderCategory | R | listHosts, exportHosts | | | DB column or computed property |
| data/hosts.ts:47 | listHosts | category, hostType, status (comma list), verificationStatus, wilayaCode (str or array), search, approvalMode, vertical, minRating, minBookings, minListings, onlyNegativeBalance, minStars, hasTrips, sortBy `joined\|rating\|listings\|bookings\|balance`, sortOrder, page, pageSize(12) (minPrice/maxPrice declared but ignored) | Paginated<Host> + facets category (filtered), hostType, status (global) + formattedId `#P00001` | R | `hosts/page.tsx` (direct SSR), HostsClient, ProvidersValidationClient | hosts.view | no | `GET /api/v1/admin/hosts?...` |
| data/hosts.ts:199 | getHostById | id | Host with ledger balance | R | `hosts/[id]/page.tsx` (direct); action unused | hosts.view | no | `GET /api/v1/admin/hosts/{id}` |
| data/hosts.ts:206 | exportHosts | filters, actor | CsvExport (17 cols) | R | HostsClient | reports.export + hosts.view | DATA_EXPORT `hosts` | `POST /api/v1/admin/hosts/export` |
| data/hosts.ts:249 | transitionHost (private) | id, action, actor, reason? | Host | W | 7 wrappers below | per action (`:221-229`) | yes (`:231-239`) | service + state machine |
| data/hosts.ts:304 | approveHost | id, actor | Host (status approved, verification verified) | W | ApprovalsClient, HostsClient, ProvidersValidationClient | hosts.approve | HOST_APPROVE | `POST /api/v1/admin/hosts/{id}/approve` |
| data/hosts.ts:308 | rejectHost | id, reason, actor | Host | W | ApprovalsClient, ProvidersValidationClient | hosts.reject | HOST_REJECT | `POST /api/v1/admin/hosts/{id}/reject {reason}` |
| data/hosts.ts:312 | suspendHost | id, reason, actor | Host | W | HostsClient | hosts.suspend | HOST_SUSPEND | `POST /api/v1/admin/hosts/{id}/suspend {reason}` |
| data/hosts.ts:316 | unsuspendHost | id, actor | Host | W | HostsClient, ProvidersValidationClient | hosts.suspend | HOST_UNSUSPEND | `POST /api/v1/admin/hosts/{id}/unsuspend` |
| data/hosts.ts:320 | banHost | id, reason, actor | Host | W | none (no UI) | hosts.delete | HOST_BAN | `POST /api/v1/admin/hosts/{id}/ban {reason}` |
| data/hosts.ts:324 | deleteHost | id, actor | Host (soft) | W | HostsClient | hosts.delete | HOST_DELETE | `DELETE /api/v1/admin/hosts/{id}` (soft) |
| data/hosts.ts:328 | restoreHost | id, actor | Host | W | HostsClient | hosts.delete | HOST_RESTORE | `POST /api/v1/admin/hosts/{id}/restore` |
| data/hosts.ts:332 | overrideCommission | id, rate, actor | Host | W | HostsClient | hosts.commission_override | HOST_COMMISSION_OVERRIDE | `PUT /api/v1/admin/hosts/{id}/commission {rate}` + `DELETE` to revert to default |
| actions/hosts.ts:8-57 | 11 wrappers | | | | | | | |

### 3.10 listings + network

| File:L | Function | Inputs | Output | R/W | Callers | Perm | Audit | Future backend |
|---|---|---|---|---|---|---|---|---|
| data/listings.ts:39 | matchListingStatus | listingStatus, filterStatus (comma list, alias aware) | bool | R | listListings | | | drop once aliases are migrated |
| data/listings.ts:68 | listListings | status, vertical, hostType, wilayaCode, search, minPrice, maxPrice, approvalMode, isFeatured, isReported, minCapacity, minBedrooms, amenity, sortBy `created\|price\|rating\|bookings`, sortOrder, page, pageSize(12) | Paginated<Listing> + facets status (scoped to vertical, incl. alias keys), vertical; formattedId `#H/#EXP/#T/#V` | R | `listings/page.tsx` (direct), ListingsClient, Stays/Experiences/Trips/CarsListClient | listings.view | no | `GET /api/v1/admin/listings?status=&vertical=&host_type=&wilaya=&min_price=&max_price=&approval_mode=&featured=&reported=&min_capacity=&min_bedrooms=&amenity=&q=&ordering=&page=` |
| data/listings.ts:212 | getListingById | id | Listing | R | `stays|experiences|trips|cars/[id]` and `/review` pages (direct); action unused | listings.view | no | `GET /api/v1/admin/listings/{id}` |
| data/listings.ts:219 | exportListings | filters, actor | CsvExport (17 cols) | R | ListingsClient, useListingStatusActions | reports.export + listings.view | DATA_EXPORT `listings` | `POST /api/v1/admin/listings/export` |
| data/listings.ts:252 | transitionListing (private) | id, target, actor, {reason, auditAction, notePrefix} | Listing | W | wrappers | `permissionForListingTarget` (`:233-245`) | yes | state machine service |
| data/listings.ts:296 | approveListing | id, actor | Listing | W | Approvals, Listings, Stays, Experiences, Trips lists, StayDetail, StayReview, Network | listings.approve | LISTING_APPROVE | `POST /api/v1/admin/listings/{id}/approve` |
| data/listings.ts:300 | rejectListing | id, reason, actor | Listing | W | Approvals, StayDetail, StayReview | listings.reject | LISTING_REJECT | `POST /api/v1/admin/listings/{id}/reject {reason}` |
| data/listings.ts:304 | requestChangesListing | id, notes, actor | Listing | W | Listings, StayDetail, StayReview | listings.approve | LISTING_REQUEST_CHANGES | `POST /api/v1/admin/listings/{id}/request-changes {notes}` |
| data/listings.ts:312 | suspendListing | id, reason, actor | Listing | W | NetworkClient | listings.suspend | LISTING_SUSPEND | `POST /api/v1/admin/listings/{id}/suspend {reason}` |
| data/listings.ts:316 | deleteListing | id, actor | Listing (soft) | W | ListingsClient, useListingStatusActions | listings.delete | LISTING_DELETE | `DELETE /api/v1/admin/listings/{id}` |
| data/listings.ts:321 | restoreListing | id, actor | Listing | W | StayDetail, useListingStatusActions | listings.delete | LISTING_RESTORE | `POST /api/v1/admin/listings/{id}/restore` |
| data/listings.ts:348 | featureListing | id, isFeatured, actor | Listing | W | ListingsClient | listings.feature | LISTING_FEATURE / LISTING_UNFEATURE | `PUT /api/v1/admin/listings/{id}/featured {is_featured, placement?, until?}` |
| data/listings.ts:379 | updateListingStatus | id, status, actor, reason? | Listing | W | Stays/Experiences/Trips lists, StayDetail, useListingStatusActions | by target status (`actions/listings.ts:25-37`) | LISTING_STATUS_CHANGE | `POST /api/v1/admin/listings/{id}/status {status, reason?}` |
| data/network.ts:11 | searchNetwork | NetworkSearchParams (vertical default `home`) | {results (all statuses, unpaginated), total, vertical} | R | NetworkClient, SearchClient | listings.view | no | `GET /api/v1/admin/listings/search?...` (or reuse guest search endpoint with admin scope) |
| actions/listings.ts:39-95, actions/network.ts:7 | wrappers | | | | | | | |

### 3.11 onboarding

| File:L | Function | Inputs | Output | R/W | Callers | Perm | Audit | Future backend |
|---|---|---|---|---|---|---|---|---|
| data/onboarding.ts:10 | getOnboardingConfig | none | deep copy OnboardingConfig | R | OnboardingClient | onboarding.edit | no | admin: `GET /api/v1/admin/onboarding-configs`; public: `GET /api/v1/onboarding-config/{hostType}` (published only) |
| data/onboarding.ts:15 | updateOnboardingFlow | hostType, steps (unvalidated array), actor | OnboardingConfig (version+1) | W | OnboardingClient | onboarding.edit | ONBOARDING_CONFIG_PUBLISH (before/after flow) | `POST /api/v1/admin/onboarding-configs/{hostType}/versions` (draft) + `POST .../versions/{v}/publish` |
| actions/onboarding.ts:9,13 | wrappers | `oneOf(hostType)`, `Array.isArray(steps)` only | | | | | | |

### 3.12 promotions

| File:L | Function | Inputs | Output | R/W | Callers | Perm | Audit | Future backend |
|---|---|---|---|---|---|---|---|---|
| data/promotions.ts:10 | listPromotions | none | PromotionCoupon[] | R | PromotionsClient | promotions.manage | no | `GET /api/v1/admin/coupons` |
| data/promotions.ts:15 | createPromotion | coupon minus id/usedCount (no validation, no code uniqueness) | coupon | W | PromotionsClient | promotions.manage | PROMOTION_CREATE | `POST /api/v1/admin/coupons` |
| data/promotions.ts:33 | togglePromotionStatus | id | coupon (`active` <-> `disabled`) | W | PromotionsClient | promotions.manage | PROMOTION_TOGGLE | `PATCH /api/v1/admin/coupons/{id}` |
| data/promotions.ts:60 | deletePromotion | id | true (hard delete) | W | PromotionsClient | promotions.manage | PROMOTION_DELETE | `DELETE /api/v1/admin/coupons/{id}` (soft if used) |

### 3.13 reviews

| File:L | Function | Inputs | Output | R/W | Callers | Perm | Audit | Future backend |
|---|---|---|---|---|---|---|---|---|
| data/reviews.ts:20 | listReviews | status, vertical, rating (exact), wilayaCode, search, page, pageSize(12) | Paginated<ReviewItem> + facets status | R | ReviewsClient | reviews.view | no | `GET /api/v1/admin/reviews?status=&vertical=&rating=&wilaya=&q=&page=` |
| data/reviews.ts:82 | hideReview | id | ReviewItem | W | ReviewsClient, ApprovalsClient (reject) | reviews.moderate | REVIEW_HIDE (full object before/after) | `POST /api/v1/admin/reviews/{id}/hide {reason}` |
| data/reviews.ts:111 | restoreReview | id | ReviewItem (published) | W | ReviewsClient | reviews.moderate | REVIEW_RESTORE | `POST /api/v1/admin/reviews/{id}/restore` |
| data/reviews.ts:140 | deleteReview | id | ReviewItem (soft) | W | ReviewsClient | reviews.delete | REVIEW_DELETE | `DELETE /api/v1/admin/reviews/{id}` |
| data/reviews.ts:169 | dismissFlag | id | ReviewItem (published, flagReason cleared) | W | ReviewsClient, ApprovalsClient (approve) | reviews.moderate | REVIEW_FLAG_DISMISS | `POST /api/v1/admin/reviews/{id}/flags/dismiss` |

### 3.14 settings

| File:L | Function | Inputs | Output | R/W | Callers | Perm | Audit | Future backend |
|---|---|---|---|---|---|---|---|---|
| data/settings.ts:10 | getPlatformSettings | none | PlatformSettings | R | SettingsClient | settings.manage | no | `GET /api/v1/admin/settings` |
| data/settings.ts:15 | updatePlatformSettings | Partial<PlatformSettings> (no field validation, shallow merge) | PlatformSettings | W | SettingsClient | settings.manage | PLATFORM_SETTINGS_UPDATE | `PATCH /api/v1/admin/settings` with serializer whitelist |

### 3.15 team

| File:L | Function | Inputs | Output | R/W | Callers | Perm | Audit | Future backend |
|---|---|---|---|---|---|---|---|---|
| data/team.ts:19 | listTeamMembers | none | AdminUser[] | R | TeamClient | team.manage | no | `GET /api/v1/admin/staff` |
| data/team.ts:28 | getTeamMemberById | id | AdminUser | R | getCurrentAdmin | internal | no | session lookup |
| data/team.ts:33 | findTeamMemberByEmail | email | AdminUser | R | verifyAdminCredentials, getDemoCredentials | internal | no | |
| data/team.ts:42 | recordTeamMemberLogin | id | void | W lastLoginAt | loginAction | internal | no (LOGIN_SUCCESS covers it) | `last_login` |
| data/team.ts:51 | updateMemberRole | userId, role, actor | AdminUser | W | TeamClient | team.manage | TEAM_ROLE_UPDATE (entityType `user`) | `PATCH /api/v1/admin/staff/{id} {role}` |
| data/team.ts:96 | toggleMemberActive | userId, actor | AdminUser | W | TeamClient | team.manage | TEAM_STATUS_TOGGLE (no before/after) | `POST /api/v1/admin/staff/{id}/activate` / `/deactivate` |
| data/team.ts:143 | inviteMember | {name, email, role}, actor | AdminUser (invited, inactive) | W | TeamClient | team.manage | TEAM_MEMBER_INVITE (entityType `team`) | `POST /api/v1/admin/staff/invitations` + `POST /api/v1/admin/auth/accept-invite {token, password}` |

### 3.16 users (guests)

| File:L | Function | Inputs | Output | R/W | Callers | Perm | Audit | Future backend |
|---|---|---|---|---|---|---|---|---|
| data/users.ts:26 | listUsers | status (comma list), role, emailVerified, idVerified, wilayaCode, search, minBookings, minSpend, isFlagged, sortBy `joined\|bookings\|spend\|activity`, sortOrder, page, pageSize(12) | Paginated<GuestUser> + facets status, role | R | `users/page.tsx`, `users/guests/page.tsx` (direct), UsersClient | users.view | no | `GET /api/v1/admin/users?...` |
| data/users.ts:127 | getUserById | id | GuestUser | R | none | users.view | no | `GET /api/v1/admin/users/{id}` |
| data/users.ts:133 | suspendUser | id, reason (any string, may be empty), actor | GuestUser | W | UsersClient | users.suspend | USER_SUSPEND (full user objects incl. PII in before/after) | `POST /api/v1/admin/users/{id}/suspend {reason}` |
| data/users.ts:164 | unsuspendUser | id | GuestUser | W | none | users.suspend | USER_UNSUSPEND | `POST /api/v1/admin/users/{id}/unsuspend` |
| data/users.ts:193 | banUser | id, reason | GuestUser | W | UsersClient | users.ban | USER_BAN | `POST /api/v1/admin/users/{id}/ban {reason}` |
| data/users.ts:224 | deleteUser | id | GuestUser (soft) | W | UsersClient | users.delete | USER_DELETE | `DELETE /api/v1/admin/users/{id}` (soft + anonymise) |
| data/users.ts:253 | restoreUser | id | GuestUser (active) | W | none | users.delete | USER_RESTORE | `POST /api/v1/admin/users/{id}/restore` |
| data/users.ts:282 | updateUserStatus | id, status (any GuestStatus), actor | GuestUser | W | UsersClient (mark active / mark pending) | NO assertCan in data; action maps status -> perm (`actions/users.ts:12-16,46-51`) | USER_STATUS_CHANGE | `POST /api/v1/admin/users/{id}/status {status, reason}` with state machine |

### 3.17 Unused exports (no UI caller)

`actions/bookings.getBookingById`, `actions/hosts.getHostById`, `actions/hosts.banHost`, `actions/listings.getListingById`, `actions/users.getUserById`, `actions/users.unsuspendUser`, `actions/users.restoreUser`. Missing entirely: document approve/reject, host "changes requested", amenity CRUD, category edit/reorder, coupon edit, review reply/report handling, payout `processed`, ledger `adjustment`, change-request CRUD, listing create/edit, messaging, notifications, templates, staff password reset/MFA.

---

## 4. Business rules in code

### 4.1 Money and commissions

| Rule | Value | Source |
|---|---|---|
| All money integer DZD | `isValidDzdAmount` int in [min,max] | `lib/pricing.ts:54-66`, `lib/auth/run-action.ts:81-86` |
| Guest service fee | **0%** ("BLADUS does not charge travellers") | `lib/pricing.ts:11-16`; frontend agrees (`frontend/lib/booking/config.ts:21-34`); `docs/DATA-MODEL.md` s6 still says 7 (stale) |
| Default commission per host type | individual 12, agency 15, hotel 18, hostel 10 (% of base) | `lib/pricing.ts:19-25`; copied into settings `store.ts:101`; hardcoded AGAIN in `lib/data/analytics.ts:69-74` and `StatsClient.tsx:61-66` |
| Commission rate validation | 0..100, max 2 decimals | `lib/pricing.ts:32-34,69-74`, `run-action.ts:89-94` |
| Change defaults | `updateCommissionRates` replaces `platformSettings.defaultCommissionRates`; does NOT update `Host.commissionRate` of non-overridden hosts and does NOT reprice existing bookings | `lib/data/finance.ts:252-279` |
| Per-host override | sets `commissionRate` + `isCommissionOverridden=true`; no way to clear the override | `lib/data/hosts.ts:332-364` |
| Seed overrides | 15% of hosts, default +2.5 or -2.0 | `generator.ts:146-149` |
| Booking amounts | `serviceFee = round(base*0/100)=0`, `total = base + serviceFee`, `commission = round(base*rate/100)`, `hostPayout = base - commission` | `lib/pricing.ts:77-92`; base = listing.price x nights (`generator.ts:390`) |
| Commission rate frozen on booking | `Booking.commissionRate` stored at creation | `generator.ts:426` |
| Display discounts | weekly 10, biweekly 15, monthly 25, group 10; `applyDiscount` | `lib/pricing.ts:37-51`; display only (ListingsClient, CarsListClient) |
| Max manual recharge / generic max amount | 10,000,000 DZD | `lib/pricing.ts:28-30` |

### 4.2 Wallet ledger

| Rule | Detail | Source |
|---|---|---|
| Balance = sum of ledger entries; `Host.walletBalance` and `HostWallet.balance` re-derived on every read | | `lib/data/ledger.ts:1-42`, `finance.ts:34-49`, `hosts.ts:62-63,202` |
| Entry types and signs | booking_payment +, commission_deduction -, host_payout -, wallet_recharge +, booking_refund -, adjustment +/- | `lib/types/index.ts:499-505`, `docs/DATA-MODEL.md` s4 |
| Entry must be non-zero integer | DomainError otherwise | `ledger.ts:67-69` |
| `balanceAfter` = current sum + amount at write time | | `ledger.ts:71` |
| Reference prefixes | TXN-BKG, TXN-COM, TXN-PAY, TXN-REC, TXN-RFD, TXN-ADJ + base36 time + random | `ledger.ts:44-51,72` |
| Atomicity | "no await between check and write" (single-threaded mock) | `ledger.ts:53-57`; real DB needs transaction + `SELECT ... FOR UPDATE` |
| Who writes entries at runtime | only recharge (+), payout approval (-), refund host share (-). Nothing writes `booking_payment` or `commission_deduction` when a booking is confirmed/completed. | `finance.ts:225`, `finance.ts:328`, `bookings.ts:229` |
| Negative balance allowed | yes (seed has negatives; `isNegative` flag; refund clawback can go below 0) | `generator.ts:568`, `bookings.ts:226-237` |

### 4.3 Wallet recharge (`lib/data/finance.ts:205-245`, `lib/actions/finance.ts:46-66`)

- Perm `wallets.recharge`; amount int 1..10,000,000; `receiptReference` required (trimmed, <=200 chars); `method` free string <=100 (UI sends values from PaymentsClient select or hardcoded `ccp_transfer` in HostsClient `:411`); `reason` free string, no minimum.
- Writes `wallet_recharge` entry with description `Admin manual recharge (<method>): <reason>`, `adminActor` = actor NAME.
- **No idempotency**: same receipt reference can be credited twice; no duplicate check, no four-eyes approval.
- Audit `WALLET_RECHARGE` with balance before/after and txId.

### 4.4 Payouts (`lib/data/finance.ts:281-385`)

| Step | Rule |
|---|---|
| List | pending first then newest (`:287-291`), no paging |
| Approve | perm `payouts.approve`; only from `pending` (`findPendingPayout :295-303`); host must exist; amount positive int; refuse if `getHostBalance < amount` with "Insufficient wallet balance" DomainError (`:322-327`); writes `host_payout` -amount; sets status `approved`, processedAt, processedBy (name), transactionId (`:335-342`) |
| Double-debit protection | status check + balance check + ledger write + status write in one synchronous block (`:315-343`); second call fails because status is no longer `pending`. No idempotency key, no DB lock (mock only). |
| Confirmation UI | confirm dialog `payoutToApprove`, busy flag prevents double click (`PaymentsClient.tsx:356-376`) |
| Reject | from `pending` only, reason >=3 chars, no ledger movement (`:359-385`) |
| `processed` | type value exists; no code transitions approved -> processed (no bank-confirmation step) |
| Seed | 14 requests; 2 of the 9 pending deliberately exceed balance (`generator.ts:613-620`) |
| Account display | masked last 4 of ccpRip ?? rib ?? phone (DATA-MODEL s4) |

### 4.5 Bookings, cancellations, refunds, disputes (`lib/domain/transitions.ts:13-51`, `lib/data/bookings.ts`)

- `BOOKING_TRANSITIONS`: pending -> confirmed|cancelled; confirmed -> completed|cancelled|disputed|refunded; completed -> disputed|refunded; disputed -> confirmed|completed|refunded; cancelled -> refunded; refunded -> none (`transitions.ts:13-20`). Only cancel, refund and dispute-resolution transitions are reachable from the admin; confirm/complete/dispute-open are not.
- Cancel: allowed from pending/confirmed, reason >=3; sets cancelledAt; **no automatic refund, no ledger reversal** (`bookings.ts:165-197`).
- Refundable statuses: confirmed, completed, cancelled, disputed; payment must be `paid` or `partially_refunded`; remaining = total - refundedSoFar (`transitions.ts:32-45`).
- Refund: int DZD, `0 < amount <= remaining`; cumulative `refundedAmountDzd`; full -> status `refunded` + payment `refunded`, else payment `partially_refunded` (`bookings.ts:205-249`).
- Host clawback: `hostShare = round(amount * hostPayoutDzd / totalAmountDzd)` written as negative `booking_refund` (`bookings.ts:225-237`). Platform keeps the commission share of a refund implicitly (commission never reversed).
- Dispute resolve: only from `disputed`; note >=3 required; `refund_full` refunds remaining -> `refunded`; `refund_partial` requires amount < remaining -> back to `completed` if checkout passed else `confirmed`; `declined` no money -> lifecycle status; stores `disputeResolution` (`bookings.ts:284-346`).
- Saved view "pending > 24h": `status=pending && createdAt < now-24h` (`bookings.ts:72-78`). Matches frontend `REQUEST_TO_BOOK_TTL_HOURS = 24` (`frontend/lib/booking/config.ts:55`) but admin never expires anything.
- Escrow (finance KPI): sum of total - refunded for confirmed/disputed paid bookings (`finance.ts:443-448`).
- No idempotency on refunds: two concurrent identical refund calls in a real DB would both pass without a lock.

### 4.6 Host state machine (`lib/domain/transitions.ts:55-71`, `lib/data/hosts.ts:221-302`)

| Action | From | To | Reason | Perm | Audit |
|---|---|---|---|---|---|
| approve | applied, under_review, rejected | approved (+verification `verified`) | no | hosts.approve | HOST_APPROVE |
| reject | applied, under_review | rejected | yes | hosts.reject | HOST_REJECT |
| suspend | approved | suspended | yes | hosts.suspend | HOST_SUSPEND |
| unsuspend | suspended | approved | no | hosts.suspend | HOST_UNSUSPEND |
| ban | approved, suspended, rejected, under_review, applied | banned | yes | hosts.delete | HOST_BAN |
| delete | any except deleted | deleted, stores statusBeforeDelete | no | hosts.delete | HOST_DELETE |
| restore | deleted | statusBeforeDelete or under_review | no | hosts.delete | HOST_RESTORE |

- No transition applied -> under_review (no "start review" action). Banned is terminal except via delete/restore.
- Reasons appended to `Host.adminNotes` as text (`hosts.ts:269-278`).
- Approve sets verification to `verified` without touching `documents[].status`.
- Suspending/banning a host does NOT cascade to its listings or open bookings.
- A second, contradictory transition table exists in `lib/status.ts:58,68` (`HOST_TRANSITIONS`, `LISTING_TRANSITIONS`) that differs from `lib/domain/transitions.ts` (e.g. allows `deleted -> approved|suspended`, `banned -> suspended`). Only `lib/domain/transitions.ts` is enforced.

### 4.7 Listing state machine (`lib/domain/transitions.ts:73-109`, `lib/data/listings.ts:233-387`)

- Transitions: draft -> pending_review|deleted; pending_review -> approved|changes_requested|rejected|deleted; changes_requested -> pending_review|approved|rejected|deleted; approved -> suspended|archived|changes_requested|pending_review|deleted; rejected -> pending_review|deleted; suspended -> approved|pending_review|deleted; archived -> approved|deleted; deleted -> only `restoreListing` (`:83-93`).
- Reason (>=3 chars, `MIN_REASON_LENGTH`) required for rejected, suspended, changes_requested (`:102-112`); appended to `adminNotes`.
- Permission by target: rejected -> listings.reject; suspended/archived -> listings.suspend; deleted -> listings.delete; anything else (approved, pending_review, changes_requested, draft) -> listings.approve (`listings.ts:233-245`).
- Legacy aliases accepted on read and filter (`matchListingStatus :39-66`), folded on write.
- Feature: only `approved` listings can be featured; unfeature always allowed (`listings.ts:360-362`). Featuring is a boolean only (no placement, no period, no ordering, no price).
- Approval queue only picks literal `pending_review` (`approvals.ts:33`), not legacy `pending`.

### 4.8 Reviews (`lib/data/reviews.ts`)

- No state machine: hide/restore/delete/dismiss can be applied from any status (e.g. restore a deleted review to published). No reason captured. Flags are a single `flagReason` string on the review (no flag entity, no reporter list). `hostReply` is display only.

### 4.9 Guests (`lib/data/users.ts`)

- No state machine; `updateUserStatus` can move any status to any status; reason optional/empty for suspend and ban (action uses `str`, not `reason`, `actions/users.ts:26-36`). `pending` status exists but nothing explains its meaning.

### 4.10 Moderation SLA / waiting time (`lib/data/approvals.ts`)

| Queue | Source rows | waitingDays from | Priority rule | Line |
|---|---|---|---|---|
| hosts | status applied or under_review | `joinedAt` | high if >3 days | 12-30 |
| listings | status `pending_review` | `createdAt` (not submission time) | high if >4 days | 32-50 |
| documents | `Host.documents[].status == pending` | `uploadedAt` | high if >3 days | 52-72 |
| reviews | status flagged | `createdAt` of review | always high | 74-90 |
| disputes | booking status disputed | booking `createdAt` (not dispute time) | always high | 92-108 |

`waitingDays = max(1, floor((now - t)/1 day))`; sorted oldest first (`:126-127`). No `low` priority produced. No assignment/claiming, no SLA breach timestamps.

### 4.11 Promotions

- Coupon toggle `active <-> disabled` (`promotions.ts:43`); `expired` is never computed from dates. No validation of code uniqueness, ranges, or dates. Create from UI sends `maxUses` + `expiresAt` (`PromotionsClient.tsx:120-129`) while seeds use `maxUsage` + `startDate/endDate`; `scope` not set on create. `usedCount` never incremented (no redemption path).
- Featured placements tab is static (`PromotionsClient.tsx:45-49`).

### 4.12 Categories taxonomy

- Flat list: `{id, name{en,fr,ar}, vertical, slug?, iconName?/icon?, listingCount, isActive, order}`. 3 seeds (home, experience, vehicle). `listingCount` hardcoded, not computed. No parent/child, no link from `Listing` (listing uses free-text `propertyType`, seeds per vertical in `generator.ts:267-273`). Hard delete. Car "pricing" and "insurance" pages also write into this list.

### 4.13 Onboarding config versioning (`lib/data/onboarding.ts`)

- Single global `version` integer incremented on every publish of ANY host type (`:31`); `updatedAt`, `publishedBy` (name). No draft vs published, no history kept (previous flow only in the audit `beforeState`), no rollback.
- Only server rule: `individual` max 2 steps (`:24-26`, also UI `OnboardingClient.tsx:118,158`). `maxPagesAllowed` is preserved but not checked. Steps are not schema-validated.
- Audit `ONBOARDING_CONFIG_PUBLISH`, entityType `onboarding`, entityId = hostType.

### 4.14 Audit log (`lib/data/audit.ts`, `lib/mock-data/store.ts:240-254`)

- Fields: id, timestamp, actorId, actorName, actorRole, action, entityType, entityId, details, beforeState?, afterState?, ipAddress (`types:569-584`). `entityName` never filled.
- Append-only: store has no setter; entries frozen (`store.ts:245-254`). Actor and IP from server session / headers (`client-ip.ts`: first X-Forwarded-For, then X-Real-IP, else `unknown`, max 64 chars).
- Logged actions (53 code paths, see list): BOOKING_CANCEL, BOOKING_REFUND, BOOKING_PARTIAL_REFUND, BOOKING_DISPUTE_RESOLVED, BOOKING_DISPUTE_DECLINED, CATEGORY_CREATE, CATEGORY_TOGGLE, CATEGORY_DELETE, COMMISSION_RATES_UPDATE, DATA_EXPORT, HOST_APPROVE, HOST_REJECT, HOST_SUSPEND, HOST_UNSUSPEND, HOST_BAN, HOST_DELETE, HOST_RESTORE, HOST_COMMISSION_OVERRIDE, LISTING_APPROVE, LISTING_REJECT, LISTING_REQUEST_CHANGES, LISTING_SUSPEND, LISTING_DELETE, LISTING_RESTORE, LISTING_FEATURE, LISTING_UNFEATURE, LISTING_STATUS_CHANGE, LOGIN_BLOCKED, LOGIN_FAILURE, LOGIN_SUCCESS, LOGOUT, ONBOARDING_CONFIG_PUBLISH, PAYOUT_APPROVE, PAYOUT_REJECT, PLATFORM_SETTINGS_UPDATE, PROMOTION_CREATE, PROMOTION_TOGGLE, PROMOTION_DELETE, REVIEW_HIDE, REVIEW_RESTORE, REVIEW_DELETE, REVIEW_FLAG_DISMISS, TEAM_ROLE_UPDATE, TEAM_STATUS_TOGGLE, TEAM_MEMBER_INVITE, USER_SUSPEND, USER_UNSUSPEND, USER_BAN, USER_DELETE, USER_RESTORE, USER_STATUS_CHANGE, WALLET_RECHARGE. Seed-only: COMMISSION_CHANGE, DISPUTE_RESOLVE.
- NOT logged: reads/views of PII, failed permission checks (ForbiddenError), approvals inbox views, mocked-only UI actions, login with empty fields (`auth.ts:56-59` records rate-limit failure but no audit).
- Inconsistent entityType: team role/toggle use `user` (`team.ts:86,130`) while invite uses `team`; categories use `setting`.
- before/after sizes vary: users/reviews/team store FULL objects (PII, `users.ts:157-158`), hosts/listings store only `{status}`.
- Export audit records active filters and row count (`audit.ts:48-68`).

### 4.15 Auth, session, rate limit, MFA

| Item | Value | Source |
|---|---|---|
| Cookie | `darna_admin_session`, httpOnly, secure in prod, sameSite strict, path `/`, maxAge = TTL | `lib/auth/config.ts:8`, `lib/actions/auth.ts:96-102` |
| JWT | HS256, iss `urn:darna:admin`, aud `urn:darna:admin-panel`, sub = userId, claims userId/email/name/role/avatar | `config.ts:11-12`, `session.ts:28-51` |
| Secret | `ADMIN_AUTH_SECRET` >= 32 chars required in prod; dev fallback constant | `config.ts:14-35` |
| Session TTL | **8 h** absolute (no sliding, no refresh, no server-side revocation list) | `config.ts:9` |
| `platformSettings.sessionTimeoutMinutes` | 480 in store, UI writes `security.sessionTimeoutMinutes` (default 120 in UI); neither is read by auth | `store.ts:104`, `SettingsClient.tsx:125,147,166` |
| Revocation | effective immediately for deactivation / role change because every request re-reads the store (`current-admin.ts:44-59`); logout only deletes the cookie (token still valid until exp) | |
| Middleware | edge check of JWT only; redirects to `/{locale}/login?returnTo=`; `/login` exact match exempt | `middleware.ts:19-56` |
| returnTo | same-origin relative path only, no `//`, `\`, control chars, not the login page, <=2048 chars | `lib/auth/return-to.ts:17-37` |
| Password hashing | scrypt, 16-byte salt, 64-byte key, `scrypt$salt$hash`; constant-time compare; dummy hash for unknown emails | `lib/auth/password.ts:12-34`, `credentials.ts:17-27` |
| Login rate limit | 5 failures within 15 min window -> 60 s lock, keyed separately by `email:<lower>` and `ip:<ip>`; success clears only the email key | `lib/auth/rate-limit.ts:9-77` |
| Generic error | unknown email, bad password, inactive -> same `invalidCredentials` | `auth.ts:69-82` |
| Input caps | email 254, password 256 | `auth.ts:25-26` |
| MFA | **none**. Only boolean flags `twoFactorAuthEnabled` / `security.twoFactorRequired` in settings, never enforced | `types:696-700`, `store.ts:105` |
| Password reset / change for staff | none | |
| Invite acceptance | none (invited accounts can never sign in) | `team.ts:138-186` |

### 4.16 Exports

- CSV built server-side by `toCsv` (`lib/utils/csv.ts`): all cells quoted, `"` doubled, cells starting with `= + - @ TAB CR` prefixed with `'`. Exports cover the full filtered dataset, require `reports.export` plus the dataset view permission (`requireAlso`), and are audited as `DATA_EXPORT`. Filenames `darna_<dataset>_<date>.csv` (still "darna").

---

## 5. Onboarding configurator contract

### 5.1 Admin shape (what `/settings/onboarding` edits and publishes)

```
OnboardingConfig {                         // lib/types/index.ts:641-649
  version: number                          // global counter, +1 per publish of any flow
  updatedAt: ISO string
  publishedBy: string                      // admin NAME
  flows: {
    individual | agency | hotel | hostel: {
      maxPagesAllowed?: number             // 2 for individual
      steps: OnboardingStepConfig[]
    }
  }
}
OnboardingStepConfig {                     // :628-639
  id: string
  stepNumber?: number   order?: number     // seeds use stepNumber, UI-created steps use order
  title?: {en,fr,ar}    name?: {en,fr,ar}  // seeds use title, UI-created steps use name
  description: {en,fr,ar}
  isCore?, isActive?, isRequired?: boolean // seeds: isCore+isActive; UI: isRequired
  fields: OnboardingFieldConfig[]
}
OnboardingFieldConfig {                    // :615-626
  id?: string  key?: string                // seeds use id, UI-created field uses key "custom_notes"
  label: {en,fr,ar}
  type: text|textarea|number|select|multiselect|radio|file|location|amenities|boolean
  required?, order?, isCore?
  placeholder?, helpText?: {en?,fr?,ar?}
  options?: [{value, label{en,fr,ar}}]
}
```

### 5.2 Seeded flows (`lib/mock-data/store.ts:108-191`)

| Host type | Step id | Title (en) | Fields (id: type, required) |
|---|---|---|---|
| individual (max 2) | step_ind_1 | Property Basics & Space | vertical: select (core, NO options), propertyType: text, wilaya: location (core) |
| individual | step_ind_2 | Pricing & Photos | priceDzd: number (core), photos: file (core) |
| agency | step_ag_1 | Agency Registration | tradeRegister: text, tourismLicense: text |
| hotel | step_htl_1 | Hotel Classification | starRating: number, roomCount: number |
| hostel | step_hst_1 | Hostel & Dormitory Details | bedCount: number |

### 5.3 Editor capabilities (`app/[locale]/(panel)/settings/onboarding/OnboardingClient.tsx`)

- Switch host type; reorder steps (renumbers `order`, `:89-108`); toggle `isRequired` (`:110-114`); add step with fixed template `id: step_<Date.now()>`, `name`, one `custom_notes` text field (`:116-148`); remove step (no `isCore` guard, `:150-154`); publish whole step array for the active host type (`:156-176`); view/copy JSON of the full config (`:386-418`).
- Cannot: edit step titles/descriptions, add/edit/remove fields, set field types/options/placeholders, toggle `isActive`, preview, save a draft, see history, roll back.

### 5.4 Guest-site counterpart (`frontend/lib/onboarding-config.ts`, `frontend/types.ts:507-572`)

| Aspect | Admin | Frontend |
|---|---|---|
| Container | `OnboardingConfig.flows[hostType].steps` + global version | `Record<HostType, OnboardingStepConfig[]>`, optional `HostTypeOnboardingConfig {hostType, steps, updatedAt?}` |
| Storage | server mock store | hardcoded defaults + browser `localStorage` key `darna_onboarding_config_<hostType>` (`onboarding-config.ts:1064-1091`) |
| Step count | individual 2, agency 1, hotel 1, hostel 1 | individual **12** (`:5-430`), agency 5 (`:433-605`), hotel 7 (`:607-840`), hostel 7 (`:842-1062`) |
| Step ids | `step_ind_1`, `step_ag_1`, ... , UI `step_<ms>` | `category_vertical`, `placement`, `location`, ..., `agency_basics`, `hotel_basics`, `hostel_basics`; custom steps must start with `custom_step_` |
| Step required props | `stepNumber?`, `title?`, `isActive?` optional | `stepNumber`, `title`, `isActive` required |
| Field id | `id?` or `key?` | `id` required, `order` and `required` required |
| Field types | text, textarea, number, select, multiselect, radio, file, location, amenities, boolean | text, number, textarea, select, multi-select, image-upload, toggle |
| Field `defaultValue` | absent | present |
| Consumption | none | `BecomeHostFlow.tsx:189` calls `getOnboardingSteps(hostType)`; renders extra non-core fields of a step matched by step id (`:192-200`) and fully renders only custom steps whose id starts with `custom_step_` (`:2387-2389`); progress bar counts `isActive` steps (`:1035-1038`) |

Consequences for a shared backend:
1. Admin-published steps would not match any frontend step id, so the guest wizard would ignore them except for the progress count; admin-created steps (`step_<ms>`) are never rendered because the prefix is not `custom_step_`.
2. The admin "individual max 2 pages" rule contradicts the frontend 12-step individual flow.
3. Field types need a canonical enum + mapping (multiselect/multi-select, file/image-upload, boolean/toggle; radio, location, amenities have no frontend renderer). `docs/DATA-MODEL.md` s5 documents the mapping.
4. Core vs custom fields: frontend skips `isCore` fields and `BUILT_IN_FIELD_IDS`, i.e. the config can only ADD custom fields to built-in steps; it cannot reorder/remove built-in steps. Admin UI implies it can.
5. Recommended contract: `GET /api/v1/onboarding-config/{hostType}` returns `{hostType, version, publishedAt, steps:[{id, stepNumber, title{en,fr,ar}, description, isActive, isCore, fields:[{id, type, label, required, order, options?, placeholder?, helpText?, defaultValue?}]}]}` with a per-host-type version; custom answers stored as JSON on the host application (`custom_fields`), validated server-side against the published version id the host started with.

---

## 6. Gaps and inconsistencies

### 6.1 Mock shortcuts that will not survive a real backend

| # | Issue | Where |
|---|---|---|
| 1 | Atomicity relies on "no await" in single-threaded JS; needs DB transactions + row locks on wallet/booking/payout | `ledger.ts:53-57`, `finance.ts:315-343`, `bookings.ts:199-204` |
| 2 | No idempotency keys on recharge, refund, payout approval, dispute resolution | `finance.ts:205`, `bookings.ts:251,284` |
| 3 | Ids generated with `Date.now()` / `Math.random()` (collisions possible) | `audit.ts:30`, `ledger.ts:72-74`, `categories.ts:24`, `promotions.ts:24`, `team.ts:163` |
| 4 | Rate limiter in process memory (`globalThis`), lost on restart, not shared across instances | `rate-limit.ts:19-22` |
| 5 | Session not revocable server-side (logout only deletes cookie) | `auth.ts:116-130` |
| 6 | Audit actor/admin recorded by NAME in ledger (`adminActor`), payouts (`processedBy`), onboarding (`publishedBy`), disputes (`resolvedBy`), team (`invitedBy`); needs FK to staff id | `ledger.ts:65`, `finance.ts:339`, `onboarding.ts:33`, `bookings.ts:330`, `team.ts:171` |
| 7 | Denormalised names copied into bookings/reviews/transactions (hostName, guestName, listingTitle, hostType); will drift on rename | `types:421-466,474-497,507-523` |
| 8 | Counters stored, not derived: Host.listingsCount/bookingsCount/rating/reviewsCount, Listing.rating/reviewsCount/bookingsCount, GuestUser.bookingsCount/totalSpentDzd/walletBalanceDzd, CategoryItem.listingCount | `generator.ts:85-107,208-211,354-356`, `store.ts:45-47` |
| 9 | Seed ledger not linked to bookings (random refs); no booking lifecycle writes `booking_payment`/`commission_deduction` | `generator.ts:492-524` |
| 10 | Hardcoded figures in UI: sidebar badges 186/46/24/42/8 (`Sidebar.tsx:100,116,132,149,186` + reviews), bookings tab counts 1248/642/... (`BookingsClient.tsx:189-194`), dashboard fallbacks `|| 3`, `|| 5` (`DashboardClient.tsx:138-141`), StatsClient arrays (`:44-79`), analytics trends (`analytics.ts:41-51,59-66`), period multipliers (`analytics.ts:14`) | |
| 11 | Read functions without `assertCan`; server pages call data directly: dashboard shows revenue KPIs and attention items to every role (`(panel)/page.tsx:15-21`) | |
| 12 | `updatePlatformSettings` accepts any partial object, shallow merge, no whitelist | `settings.ts:15-39` |
| 13 | `updateOnboardingFlow` accepts any steps payload | `onboarding.ts:15-56`, `actions/onboarding.ts:13-17` |
| 14 | `createCategory`, `createPromotion` accept unvalidated objects | `actions/categories.ts:11`, `actions/promotions.ts:11` |
| 15 | Hard deletes for categories and coupons | `categories.ts:59-73`, `promotions.ts:60-74` |
| 16 | Files: every document/photo is `/assets/template.jpeg` or `/assets/house.png`; no upload, storage, virus scan, signed URLs | `generator.ts:162,312` |
| 17 | `Date.now()`-based seed timestamps: data changes on every boot | generator throughout |
| 18 | Errors thrown as plain `Error` (not DomainError) in users/reviews/team/categories/promotions/onboarding become `code: "failed"` instead of `conflict`/`invalid` | `users.ts:142`, `reviews.ts:90`, `team.ts:57,61,73,117`, `onboarding.ts:25` |
| 19 | Commission default change not propagated to non-overridden hosts; no "revert override" | `finance.ts:252-279`, `hosts.ts:332-364` |
| 20 | Payout `processed` state and bank/CCP confirmation missing; debit happens at approval | `finance.ts:311-356` |
| 21 | Cancel does not trigger refund or ledger reversal; refund never reverses commission | `bookings.ts:165-197,225-237` |

### 6.2 Features with no persistence (mocked-only)

Messages/conversations/broadcast/templates (`MessagesClient.tsx`), change requests and trip booking requests (`ChangeRequestsClient.tsx`), create wizards for all 4 verticals (`StayWizardClient.tsx`, `ExperienceWizardClient.tsx`), featured placements (`PromotionsClient.tsx:45-49,347`), review reports/disputes tabs (`ReviewsClient.tsx:90`), review CSV export (`:225`), guest password reset and guest export (`UsersClient.tsx:287,567`), document approve/reject (`ApprovalsClient.tsx:281-284`), approvals "undo" (`:289`), provider "request changes" (`ProvidersValidationClient.tsx:383-388`), listing review checklist + internal notes (`StayReviewClient.tsx:84-105`), settings notification toggles and languages tab (`SettingsClient.tsx:129-133,283-330`), maintenance mode / 2FA / session timeout (stored, not enforced), training mode (localStorage only), car pricing tiers and insurance (stored as categories), amenities (redirect, no model), team invitations (no email, no acceptance).

### 6.3 Admin vs guest-site model mismatches (`frontend/types.ts`)

| Concept | Admin | Frontend | Note |
|---|---|---|---|
| Users | `GuestUser` (`usr_001`) and `Host` (`hst_001`) are separate tables with no link | single `User` with `role guest\|host\|admin`, `hostType`, `organizationId` (`frontend/types.ts:4-24`) | backend needs one `users` table + host profile; admin `Host.organizationId`/`Organization.ownerUserId` never seeded |
| Organization | `Organization.verificationStatus: boolean`, `hostType` | `verificationStatus: pending\|verified\|rejected`, `businessCategory agency\|hotel\|hostel`, `businessRegistrationNumber`, `businessEmail/Phone`, hotel/hostel policy fields (`:292-326`) | admin flattens org into Host + `agencyMetadata/hotelMetadata/hostelMetadata` |
| Listing status | 8 canonical + 3 aliases | `active\|pending\|suspended\|draft` (`:54`) | admin `approved` = frontend `active`; `changes_requested`, `rejected`, `archived`, `deleted` invisible on frontend |
| Listing fields | `propertyType`, `hostId/hostName/hostType`, `wilayaCode`, `coordinates{lat,lng}`, `guestCapacity`, `isFeatured`, `reviewsCount`, `rooms`, `houseRules` object, `bookingApprovalMode`, duplicates `vertical/priceDzd/images` | `type`, `ownerType` + `hostUserId`/`organizationId`, `locationValue`/`commune`/`country`, `latlng [lat,lng]`, `guestCount`, `featured`, `reviewCount`, `roomTypes`, `houseRules string[]`, `instantBook` + `bookingApprovalMode`, plus `cleaningFee`, `cancellationPolicy`, `minNights/maxNights`, `serviceFeeRate`, `taxRate`, vehicle and experience fields (`:110-196`) | admin cannot see or moderate cleaning fee, cancellation policy, stay rules, vehicle/experience specifics |
| Trips | listing with `category: "trip"` | separate `Trip` entity (`trip_*` ids) with itinerary, departures, `organizationId` (`:261-290`) | admin has no trip itinerary model |
| Wilaya | string code `"01".."68"`, **68** entries (`lib/utils/wilayas.ts`, `{ code:` count = 68); README and UI strings say **69** (`messages/en.json:291,747,894,895,1417`, `HostsClient.tsx:905`) | numeric code 1..58, **58** entries (`frontend/lib/algeria.ts`, header comment), footer "58 wilayas" (`frontend/messages/en/footer.json:32`); wilaya derived from `commune` | three different counts (58 / 68 / 69); codes 59-68 in admin (Aflou, Barika, ...) do not exist on the frontend; string vs number type |
| Booking | `Booking`, ref `BLD-2026-NNNN`, `checkInDate/checkOutDate`, `basePriceDzd`, `totalAmountDzd`, `refundedAmountDzd`, statuses incl. `disputed`, `refunded` | `Reservation` (`res_*`), `startDate/endDate`, `subtotal`, `totalPrice`, `cleaningFee`, `taxes`, `refundAmount`, `cancelledBy`, `expiresAt`, `declineReason`, `selectedRoomTypeId`, `unitCount`, statuses incl. `declined`, `expired` (`:198-250`) | admin ignores cleaning fee in payout math; frontend payout = subtotal + cleaning - commission - refund (`frontend/lib/booking/payout.ts:17-34`), admin payout = base - commission |
| Payment status | `paid\|partially_refunded\|refunded\|pending\|failed` | `paid\|pending\|refunded\|partially_refunded\|voided` | |
| Payment method | `cib_edahabia\|ccp_transfer\|baridimob\|cash_on_arrival` | free string | |
| Wallet model | per host (`wlt_<hostId>`), mixes guest-money settlement (`booking_payment` credits, `host_payout` withdrawals, refunds) | per owner `ownerType user\|organization`, PREPAID COMMISSION wallet: `recharge`, `commission_deduction`, `payout`, `adjustment` (`:574-603`, `frontend/lib/data/wallet.ts`) | fundamentally different money flow; must be decided before modelling the ledger |
| Transaction | `amount`, `balanceAfter`, `reference`, `bookingRef`, `adminActor` name | `amount`, `currency`, `relatedBookingId`, `adminUserId`, `note`, `timestamp` | |
| Commission | on base price (`lib/pricing.ts:84`) | on accommodation subtotal (excl. cleaning) (`frontend/lib/booking/config.ts:10-19`) | same rates; frontend also stores live rates in its own server store (`frontend/lib/data/wallet.ts:250-266`), a second source of truth |
| Review | `ReviewItem` with status/flags/hostReply, single rating | `Review` with 5 sub-ratings (cleanliness, accuracy, communication, location, value), no status (`:71-88`) | |
| Coupon | `PromotionCoupon` (`discountType percentage\|fixed_dzd\|fixed`, `maxUsage/maxUses`, `usedCount/currentUses`, `startDate/endDate/expiresAt`, `status`, `scope`) | `Coupon` (`percentage\|fixed`, `validFrom/validTo`, `usageLimit/usageCount`, `verticalScope`, `isActive`) (`:474-486`) | |
| Category | `name{en,fr,ar}`, `iconName`, `listingCount`, `isActive`, `order` | `labelKey`, `icon`, `descriptionKey` (i18n keys) (`:63-69`) | |
| Amenity | `name{en,fr,ar}`, free `category` | `nameKey`, `category essentials\|features\|location\|safety` | admin listings store amenities as free strings ("Fast WiFi") |
| Audit | `actorId/actorName/actorRole/entityType/entityId/before/after/ipAddress` | `AuditLogEntry adminId/adminName/targetType/targetId` (`:457-472`) | frontend has its own admin-ish audit type |
| Ids | sequential `usr_001`, `hst_001`, `lst_001`, `bkg_0001`, `rev_001`, `tx_0001`, `pay_001` | slug-like seeds (`lst_tipaza_villa`, `res_tipaza_01`, `usr_amina...`) and `prefix_<uuid>` at runtime (`frontend/lib/ids.ts:6-8`) | pick UUIDs (or ULIDs) + human references |
| Locale default | `i18n.ts` default `en`, root redirects `/en`; platformSettings.defaultLocale `fr` | | |
| Brand in identifiers | cookie `darna_admin_session`, JWT iss `urn:darna:admin`, CSV `darna_*`, localStorage `darna_admin_*` | `darna_onboarding_config_*` | intentional per project memory, but worth listing for the backend |

### 6.4 Other inconsistencies inside admin

| # | Issue | Where |
|---|---|---|
| 1 | Settings field mismatch: UI writes `serviceFeePercent` and `security.{sessionTimeoutMinutes,twoFactorRequired}`, store/type primary fields are `guestServiceFeePercent`, `sessionTimeoutMinutes`, `twoFactorAuthEnabled`; UI always shows fee 0 and timeout default 120 | `SettingsClient.tsx:141-172`, `store.ts:92-106`, `types:682-701` |
| 2 | Two transition tables (`lib/status.ts` vs `lib/domain/transitions.ts`) | `lib/status.ts:58-80` |
| 3 | Command palette and dashboard attention links to non-existent routes `/listings/{id}`, `/bookings/{id}`, `/users/{id}` (404 via `[...rest]`) | `command-palette.ts:56,76,92`, `analytics.ts:190,198` |
| 4 | Sidebar `/bookings?type=stay` ignored (client reads `vertical`); `/cars/rentals?status=in_progress` not a BookingStatus | `Sidebar.tsx:150-153,182-185`, `BookingsClient.tsx:73-74` |
| 5 | `/x/[id]` detail pages do not check vertical | `cars/[id]/page.tsx:18` etc. |
| 6 | Trips and cars "new" pages reuse the experience wizard | `trips/new/page.tsx:2`, `cars/new/page.tsx:2` |
| 7 | Document approval approves the whole host | `ApprovalsClient.tsx:281-284` |
| 8 | Category manager per vertical shows all verticals | `CategoriesManagerClient.tsx:58-67` |
| 9 | StatsClient provider type `carRental` is not a HostType | `StatsClient.tsx:61-66,73-77` |
| 10 | `listHosts` declares `minPrice/maxPrice` filters but ignores them | `hosts.ts:22-23` |
| 11 | Approvals queue ignores legacy `pending` listings; listing waiting time uses `createdAt` | `approvals.ts:33,35` |
| 12 | Many unused types (Document, ModerationChecklist, ChangeRequest, WizardDraft, Amenity, Insurance, PricingTier, Organization, QueryParams, UserRole) | `lib/types/index.ts` |
| 13 | `docs/DATA-MODEL.md` says 7% service fee; README says "Supabase Ready" while target is Django | `docs/DATA-MODEL.md` s6, `README.md` s4 |
| 14 | README "Every mutation executes `assertCan(session, permission)`": false for `updateUserStatus` | `users.ts:282-308` |
| 15 | Messages area (incl. broadcast to all users) needs no permission | `messages/*/page.tsx` `guardPage(null)` |

---

## 7. Page routes (80 `page.tsx` under `app/[locale]` + `app/page.tsx`)

All panel pages also pass through `middleware.ts` (JWT) and `(panel)/layout.tsx` (store-backed admin check + approvals count via `getApprovalsInbox` when `hosts.view`). "Data" lists server-side data calls and client actions.

| Route | Purpose | Data / actions | guardPage |
|---|---|---|---|
| `/` (app/page.tsx) | redirect to `/en` | none | n/a |
| `/[locale]` | Dashboard | data: getDashboardKPIs, getDashboardCharts, getAttentionItems, listAuditLogs (if audit.view) | null |
| `/login` | Sign-in | data: listDevDemoAccounts, getCurrentAdmin; actions: loginAction, getDemoCredentials | public (redirects if signed in) |
| `/approvals` | Moderation inbox, 5 queues | actions: getApprovalsInbox, approveHost, rejectHost, approveListing, rejectListing, hideReview, dismissFlag, resolveDispute | hosts.view |
| `/audit-log` | legacy redirect -> `/settings/audit-log` | none | none (target guarded) |
| `/bookings` | Bookings list, cancel, refund, dispute, export | actions: listBookings, cancelBooking, refundBooking, resolveDispute, exportBookings | bookings.view |
| `/cars` | Vehicle listings list | actions: listListings + useListingStatusActions (updateListingStatus, deleteListing, restoreListing, exportListings) | listings.view |
| `/cars/[id]` | Listing detail (shared StayDetailClient) | data: getListingById; actions: approve/reject/requestChanges/restore/updateListingStatus | listings.view |
| `/cars/[id]/review` | Review wizard (shared StayReviewClient) | data: getListingById; actions: approveListing, rejectListing, requestChangesListing | listings.view |
| `/cars/categories` | Vehicle categories | actions: listCategories, createCategory, toggleCategoryStatus | categories.manage |
| `/cars/insurance` | "Insurance" (category manager reuse) | same as above | listings.view |
| `/cars/new` | Add car (experience wizard reuse), mocked | none | listings.approve |
| `/cars/owners` | redirect `/moderation/providers?category=rental_agency&status=all` | none | hosts.view |
| `/cars/pricing` | "Pricing tiers" (category manager reuse) | categories actions | listings.view |
| `/cars/rentals` | redirect `/bookings?vertical=cars[&status=]` | none | bookings.view |
| `/categories` | Global category management | actions: listCategories, createCategory, toggleCategoryStatus, deleteCategory | categories.manage |
| `/experiences` | Experience listings | listListings, approveListing, updateListingStatus + useListingStatusActions | listings.view |
| `/experiences/[id]` | Detail | getListingById + listing actions | listings.view |
| `/experiences/[id]/review` | Review wizard | getListingById + decisions | listings.view |
| `/experiences/amenities` | redirect `/experiences/categories` | none | categories.manage |
| `/experiences/categories` | Experience categories | categories actions | categories.manage |
| `/experiences/change-requests` | Change requests, mocked | none | listings.approve |
| `/experiences/new` | Add experience wizard, mocked | none | listings.approve |
| `/finance` | legacy redirect -> `/payments` | none | none |
| `/help` | Help center (static) | none | null |
| `/hosts` | Hosts directory | data: listHosts (SSR); actions: listHosts, approveHost, suspendHost, unsuspendHost, deleteHost, restoreHost, overrideCommission, rechargeWallet, exportHosts | hosts.view |
| `/hosts/[id]` | Host profile (server rendered) | data: getHostById | hosts.view |
| `/listings` | All listings | data: listListings (SSR); actions: listListings, approveListing, requestChangesListing, featureListing, deleteListing, exportListings + useListingStatusActions | listings.view |
| `/messages` | Conversations, mocked | none | null |
| `/messages/notifications` | Sent notifications, mocked | none | null |
| `/messages/templates` | Templates, mocked | none | null |
| `/moderation` | redirect `/moderation/providers` | none | hosts.view |
| `/moderation/providers` | Provider (host) validation | actions: listHosts, approveHost, rejectHost, unsuspendHost | hosts.view |
| `/network` | Network explorer | actions: searchNetwork, approveListing, suspendListing | listings.view |
| `/onboarding` | legacy redirect -> `/settings/onboarding` | none | none |
| `/payments` | Finance overview tab | actions: getFinanceSummary, listWallets, listTransactions, listPayouts, listRefunds, getCommissionRates, rechargeWallet, approvePayout, rejectPayout, updateCommissionRates, exportTransactions, exportWallets | wallets.view |
| `/payments/commissions` | Commission defaults tab | same | wallets.view (save needs commissions.manage) |
| `/payments/payouts` | Payout requests tab | same | wallets.view |
| `/payments/refunds` | Refunds tab | same | wallets.view |
| `/payments/transactions` | Ledger tab | same | wallets.view |
| `/payments/wallets` | Wallets tab | same | wallets.view |
| `/promotions` | Coupons | actions: listPromotions, createPromotion, togglePromotionStatus, deletePromotion | promotions.manage |
| `/promotions/featured` | Featured placements, mocked | same client, static data | promotions.manage |
| `/providers` | legacy redirect -> `/moderation/providers` | none | none |
| `/reports` | Reports tab of stats | actions: getDashboardKPIs, getDashboardCharts, exportKpiReport | reports.export |
| `/reviews` | Reviews moderation | actions: listReviews, hideReview, restoreReview, dismissFlag, deleteReview | reviews.view |
| `/reviews/disputes` | "Disputes" tab (unfiltered reviews) | same | reviews.view |
| `/reviews/reports` | "User reports" tab (unfiltered reviews) | same | reviews.view |
| `/search` | Search results (`?q=`) | actions: searchNetwork | listings.view |
| `/settings` | General settings | actions: getPlatformSettings, updatePlatformSettings | settings.manage |
| `/settings/audit-log` | Audit trail | actions: listAuditLogs, exportAuditLogs | audit.view |
| `/settings/commissions` | Commission defaults (PaymentsClient) | finance actions | commissions.manage |
| `/settings/languages` | Languages tab (static) | settings actions | settings.manage |
| `/settings/notifications` | Notification prefs (not saved) | settings actions | settings.manage |
| `/settings/onboarding` | Onboarding configurator | actions: getOnboardingConfig, updateOnboardingFlow | onboarding.edit |
| `/settings/security` | Session timeout, 2FA flag (not enforced) | settings actions | settings.manage |
| `/settings/team` | Staff and roles | actions: listTeamMembers, updateMemberRole, toggleMemberActive, inviteMember | team.manage |
| `/stats` | Stats overview (mostly hardcoded) | analytics actions | reports.export |
| `/stats/providers` | By provider type | analytics actions | reports.export |
| `/stats/reports` | Report exports | analytics actions + exportKpiReport | reports.export |
| `/stats/revenue` | Revenue | analytics actions | reports.export |
| `/stats/services` | By vertical | analytics actions | reports.export |
| `/stats/wilayas` | By wilaya (hardcoded 4 rows) | analytics actions | reports.export |
| `/stays` | Stay listings | listListings, approveListing, updateListingStatus + useListingStatusActions | listings.view |
| `/stays/[id]` | Detail | getListingById + listing actions | listings.view |
| `/stays/[id]/review` | Review wizard | getListingById + decisions | listings.view |
| `/stays/amenities` | redirect `/stays/categories` | none | categories.manage |
| `/stays/categories` | Stay categories | categories actions | categories.manage |
| `/stays/change-requests` | Change requests, mocked | none | listings.approve |
| `/stays/new` | Add stay wizard, mocked | none | listings.approve |
| `/team` | legacy redirect -> `/settings/team` | none | none |
| `/trips` | Trip listings | listListings, approveListing, updateListingStatus + useListingStatusActions | listings.view |
| `/trips/[id]` | Detail | getListingById + listing actions | listings.view |
| `/trips/[id]/review` | Review wizard | getListingById + decisions | listings.view |
| `/trips/booking-requests` | "Booking requests" (change-requests mock) | none | bookings.view |
| `/trips/categories` | Trip categories | categories actions | categories.manage |
| `/trips/new` | Add trip (experience wizard reuse), mocked | none | listings.approve |
| `/users` | Users (guests + both) | data: listUsers (SSR); actions: listUsers, suspendUser, banUser, deleteUser, updateUserStatus | users.view |
| `/users/guests` | Users filtered `role=guest` | same | users.view |
| `/where-did-it-go` | Old-to-new navigation map (static) | none | none (layout auth only) |
| `/[...rest]` | Localised 404 | none | n/a |

Global (every panel page): `CommandPalette` -> `searchGlobalCommandPalette`; `Header` -> `logoutAction`; `AdminSessionProvider.useCan` hides buttons by permission.
