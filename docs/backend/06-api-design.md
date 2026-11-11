# 06. API design: how the apps talk to the backend

> **In plain words**
> This page explains the contract between the two Next.js apps (website and admin) and the Django backend.
> The exact contract is the file [openapi.yaml](openapi.yaml): 266 operations, each one linked to the requirements and rules it serves.
> The browser never calls Django. The Next.js server calls Django for it, with a session token the browser never sees.
> Every function the apps use today in `lib/data` and their server actions gets an endpoint (table in section 8), or the table says why it goes away.
> Money is always in centimes, errors always have a stable code and a message in English, French or Arabic.
> Guest payments and payouts are written in the contract but switched off ("dormant") until the money model changes.

**Terms used here** (see also [glossary.md](glossary.md)):
- **API**: the list of requests one program can send to another and the answers it gets back.
- **REST**: a common style of API where each thing has a web address (a URL) and you act on it with HTTP verbs: GET (read), POST (create or do an action), PUT (replace), PATCH (change part), DELETE (remove).
- **Endpoint** (or operation): one verb on one URL, for example `POST /api/v1/me/bookings`.
- **OpenAPI**: a standard file format that describes every endpoint, its inputs and outputs. Tools read it to check the API, draw documentation and generate code.
- **BFF (backend for frontend)**: the server part of each Next.js app. It receives the browser's requests and calls Django on its behalf.
- **Session token**: a long random string that proves who you are to Django. django-allauth creates it at login; it can be cancelled at any time.
- **Idempotency key**: a random value the app sends with a "create" request. If the same request arrives twice (double click, network retry), Django does the work once and returns the same answer.
- **Cursor**: a bookmark returned with a page of results; you send it back to get the next page. Used for feeds that grow (messages, notifications).
- **ETag**: a version label of a response. The app sends it back to ask "has this changed?" or "save only if nobody changed it meanwhile".
- **Webhook**: a request that another company's server (a payment gateway) sends to us when something happens.
- **Dormant endpoint**: present in the contract, but returns 404 until a feature flag is switched on (`x-dormant: true`).

---

## 1. The contract file

| Item | Value |
|---|---|
| File | [openapi.yaml](openapi.yaml), OpenAPI 3.1.0 |
| Size | 266 operations on 220 paths, 38 tags in 7 groups |
| Groups | auth 15, public 22, me (guest) 26, shared (messaging 7, media 4), host 72, admin 119, webhooks 1 |
| Dormant (money models M2 to M4) | 8: `createGuestPayment`, `listHostPayouts`, `requestHostPayout`, `receiveGatewayWebhook`, `adminListPayouts`, `adminApprovePayout`, `adminRejectPayout`, `adminMarkPayoutSent` |
| Lint | `npx @redocly/cli lint openapi.yaml` (recommended rules): valid, 0 errors, 0 warnings |
| Enums | Copied from [schema.dbml](schema.dbml) by name and value (each carries `x-db-enum`) |

Every operation has: `operationId`, `summary`, `tags`, `security`, error responses, and these extensions:

| Extension | Meaning |
|---|---|
| `x-requirements` | Requirement IDs from [03-requirements.md](03-requirements.md) |
| `x-rules` | Rule IDs from [04-business-rules.md](04-business-rules.md) |
| `x-release` | MVP, R2 or Later |
| `x-dormant` | `true` for the switched-off money endpoints |
| `x-host-permission` | Organisation permission needed (host endpoints, table in section 4.4) |
| `x-staff-permission` | Staff permission needed (admin endpoints, section 4.5) |

When Django is built, drf-spectacular generates the real file from the code. CI then compares it with this one (see section 10): this file is the target, not decoration.

Requirements not cited by any operation are the ones with no endpoint of their own: jobs and quality targets (AVL-05 holds, BKG-04 completion job, NTF-02 email/SMS, NTF-04 outbox, NFR-01 to NFR-10 and NFR-13, PRV-03 to PRV-05), plus two features not designed yet: MSG-06 staff broadcast (R2) and PRV-06 foreign guest declaration (R2). They are covered by the conventions below or left for a later phase.

---

## 2. Big picture

```
Browser ──(cookie)──> Next.js website server (BFF) ──(X-Session-Token)──> Django /api/v1/*
Browser ──(cookie)──> Next.js admin server (BFF)   ──(X-Session-Token)──> Django /api/v1/admin/*
Payment gateway ───────────────(signature header)─────────────────────────> Django /api/v1/webhooks/*
```

- Django is never exposed to browsers for app traffic. The public listing pages are rendered by Next.js, which calls the public endpoints.
- Images and documents are the exception: the browser uploads them straight to object storage with a presigned URL (section 3.10), so big files never go through Next.js or Django.

---

## 3. Conventions

### 3.1 URLs and naming
- Base path `/api/v1`. Production host `https://api.bladus.dz`.
- Nouns in plural, lowercase, words separated by `-` (`/room-types`). Path ids in `{snake_case}`.
- Groups by who is acting: `/api/v1/...` public, `/api/v1/me/...` the signed-in person, `/api/v1/host/...` the active host account, `/api/v1/admin/...` staff.
- Actions that are not plain edits use a verb sub-path with POST: `/host/bookings/{id}/accept`, `/admin/hosts/{id}/suspend`. One action, one permission, one audit row.
- Status changes with many targets use `POST .../status` with the target status in the body.

### 3.2 JSON
- Field names in **snake_case**, both ways.
- Missing optional values are `null`, not left out, in responses.
- Text written by users comes back in its original language with `source_language`. Platform labels (amenities, types, wilayas) come in the language asked by `Accept-Language`; `labels` gives all three when needed.

### 3.3 Dates and times
- Timestamps: ISO 8601 in UTC with `Z` (`2026-11-09T09:30:00Z`).
- Stay dates: plain dates (`2026-12-18`) meaning the day in Africa/Algiers. Ranges are half-open: `check_out` is the day you leave, it is not a night of the stay.
- The week starts on Sunday; Friday and Saturday are the weekend (BR-SYS-05). Digits are always Latin (0 to 9), also in Arabic.

### 3.4 Money
- Always the `Money` object: `{"amount_minor": 1850000, "currency": "DZD"}` = 18,500 DZD. `amount_minor` is an integer number of centimes (1 DZD = 100 centimes). Never a float.
- Inputs use `MoneyInput` (positive amount). Rates are basis points (`1200` = 12%).
- Query filters on prices say their unit in the name: `min_price_minor`.
- Totals are sums of rounded lines (half up), so the apps never recompute prices: they show what the quote says (BR-PAY-01, BR-PRC-01).

### 3.5 Identifiers
- Every id is a UUIDv7 (time-ordered, not guessable).
- People also see short references: bookings `BLD-2026-7K2M9Q`, listings `LST-7K2M9Q`, trips `TRP-...`. Endpoints that show one item accept either the UUID or the reference in the path (`booking_id`, `listing_id`, `trip_id`).
- Messages and notifications use growing integer ids, because they are also the sync cursor.

### 3.6 Pagination
| Kind | Used by | Query | Response |
|---|---|---|---|
| Cursor | feeds and website lists: search, reviews, notifications, favourites, my bookings, host lists, wallet entries | `cursor`, `limit` (1 to 50, default 20) | `results`, `next_cursor` (null at the end), `has_more` |
| Page numbers | admin tables (need "page 4 of 12") | `page`, `page_size` (1 to 100, default 20) | `results`, `meta {page, page_size, total_count, total_pages}`, often `facets` |

Cursors are opaque strings: the apps must not build or read them.

### 3.7 Errors
All errors use `application/problem+json`, in the RFC 9457 "Problem Details" style:

```json
{
  "type": "https://api.bladus.dz/errors/dates_unavailable",
  "title": "Dates unavailable",
  "status": 409,
  "code": "dates_unavailable",
  "detail": "Another booking took 2026-12-19 while you were booking.",
  "message": "Ces dates viennent d'être réservées. Choisissez d'autres dates.",
  "instance": "/api/v1/me/bookings",
  "request_id": "01933c10-77aa-7d00-9a51-5b2b0b6f3a10",
  "errors": []
}
```

- `code` never changes once published. The apps map it to their own text when they want (the website's `ActionResult` codes become these codes, NFR-13).
- `message` is ready to show, in the language of `Accept-Language` (en, fr, ar; default fr), BR-SYS-04.
- `errors` lists field problems on 422: `{"field": "room_types.0.unit_count", "code": "out_of_range", "message": "...", "params": {"min": 1}}`.
- Some codes add members: `price_changed` adds the new `quote`; `permission_denied` adds `required_permission`; `night_booked` adds `dates`.

**Status codes used**

| Status | When | Example codes |
|---|---|---|
| 400 | Malformed request; also all login failures (same answer every time) | `bad_request`, `invalid_credentials`, `invalid_code`, `invalid_current_password` |
| 401 | No valid session | `not_authenticated` |
| 403 | Signed in but not allowed | `permission_denied`, `mfa_required`, `phone_verification_required`, `host_offer_not_allowed`, `agency_not_verified`, `cannot_book_own_listing`, `four_eyes_same_user`, `invitation_contact_mismatch`, `account_suspended` |
| 404 | Not found, not yours, or a dormant feature switched off | `not_found`, `feature_disabled`, `not_an_organization` |
| 409 | Conflict with the current state | `dates_unavailable`, `not_enough_units`, `seats_unavailable`, `price_changed`, `quote_expired`, `booking_not_pending`, `request_expired`, `booking_not_cancellable`, `refund_changed`, `wallet_below_credit_floor`, `invalid_transition`, `receipt_already_used`, `topup_not_pending`, `idempotency_in_progress`, `email_taken`, `phone_taken`, `already_member`, `invitation_pending`, `invitation_used`, `cannot_remove_owner`, `review_exists`, `already_reported`, `reply_locked`, `inventory_in_use`, `night_booked`, `slug_taken`, `in_use`, `has_future_bookings`, `case_resolved`, `last_super_admin` |
| 412 | `If-Match` is stale | `stale_version` |
| 422 | Validation failed | `validation_failed` (with `errors`), `idempotency_key_reused`, `listing_incomplete`, `documents_missing`, `documents_not_approved`, `reason_required`, `refund_exceeds_total`, `review_window_closed`, `dispute_window_closed`, `invitation_expired`, `unknown_field`, `unknown_setting`, `core_step_removed`, `preference_locked`, `min_nights`, `max_nights`, `advance_notice`, `capacity_exceeded`, `file_type_not_allowed`, `file_too_large` |
| 429 | Rate limit | `rate_limited`, `login_locked` (with `Retry-After`) |

A host who asks for another host account's data gets **404, not 403**, so ids cannot be probed (BR-ORG-01).

### 3.8 Filtering and sorting
- Filters are plain query parameters named like the field (`status`, `vertical`, `wilaya`). Lists of values are comma-separated: `?vertical=home,hotel`.
- Free text is always `q`.
- Sorting is `ordering`, with `-` for descending: `?ordering=-created`. Only the values listed in the contract are accepted.
- Facets: the admin list endpoints return `facets` with counts per value; public search has its own `GET /listings/facets`. A facet is counted without its own filter, so the user sees what they would get by changing it (BR-SRC-01).

### 3.9 Rate limits (per group)
Counters live in Redis, shared by all servers (ACC-07, NFR-11). Because all website traffic comes from the BFF, the BFF sends the real client IP in `X-Forwarded-For`; Django trusts that header **only** from the BFF's private network address.

| Group | Limit (proposal, tune after launch) | Key |
|---|---|---|
| Login failures | 5 in 15 min, then 60 s lock | account and IP |
| One-time codes | 3 sends per phone per hour, 10 per IP per hour; 5 tries per code | phone, IP |
| Signup, password reset | 10 per IP per hour | IP |
| Public reads (search, pages) | 120 per minute; search and map 60 per minute | IP |
| Quotes | 60 per minute | user or IP |
| Booking create | 10 per minute, 50 per day | user |
| Messages | 30 per minute; new conversations 20 per day | user |
| Uploads | 120 per hour | user |
| Other user and host writes | 120 per minute | user |
| Admin | 600 per minute; exports 10 per hour | staff user |

Responses over the limit are 429 with `Retry-After`. SMS sends also have a daily budget alarm.

### 3.10 Uploads
1. `POST /media/uploads` with purpose, type, size, hash: returns `media_id` and a presigned URL (valid 10 minutes).
2. The browser PUTs the file straight to storage (quarantine area).
3. `POST /media/{media_id}/complete`: checks start (type sniffing, virus scan for documents, metadata removal, renditions, duplicate detection).
4. The app polls `GET /media/{media_id}` until `ready` (or `rejected` with a code), then uses the `media_id` in a listing, room type, document or avatar.
Private documents are only read through `GET .../url`, which returns a 5-minute link and writes an audit row (BR-MED-02).

### 3.11 Caching and ETags
| Endpoint | Caching |
|---|---|
| `GET /reference`, `/geo/*`, `/onboarding-flows/{host_type}`, `/reference/reasons` | `Cache-Control: public, max-age=3600`, `ETag`; `If-None-Match` gives 304. Next.js caches them and revalidates by tag. |
| `GET /listings/{id}`, `/trips/{id}`, `/organizations/{slug}` | `ETag`; public when anonymous, `private` when the session adds personal fields |
| Search, facets, map | Short public cache (60 s) only for anonymous requests without dates |
| Everything under `/me`, `/host`, `/admin` | `Cache-Control: no-store` |

**Optimistic locking**: edits where two people may work at once (listing, trip, organisation, settings, onboarding flow draft, commission rates) need `If-Match` with the ETag of the last read. If someone saved in between, the answer is 412 and the app reloads.

### 3.12 Other headers
| Header | Direction | Use |
|---|---|---|
| `X-Session-Token` | BFF to Django | Who is calling |
| `X-Host-Account` | BFF to Django | Active host account (section 4.3) |
| `Accept-Language` | BFF to Django | en, fr, ar |
| `Idempotency-Key` | BFF to Django | Section 5 |
| `X-Request-Id` | both | Correlation id; created by the BFF, echoed in logs and errors (NFR-09) |
| `Idempotency-Replayed: true` | Django to BFF | The response is a stored replay |
| `Deprecation`, `Sunset` | Django to BFF | Section 9 |

---

## 4. Authentication and permissions

### 4.1 Website users (BFF cookie plus allauth session token)
1. The login form posts to a Next.js route handler (today `app/api/auth/login/route.ts`).
2. The handler calls `POST /api/v1/auth/login` (or the phone code flow `POST /auth/code/request` then `POST /auth/code/confirm`).
3. Django (django-allauth headless, "app" client) answers with a **session token**. The handler stores it in an encrypted, `httpOnly`, `Secure`, `SameSite=Lax` cookie. JavaScript in the browser cannot read it.
4. On every server render or server action, the BFF decrypts the cookie and sends `X-Session-Token` to Django.
5. Logout calls `DELETE /api/v1/auth/session` (the token dies at once on the server, BR-ACC-03) and deletes the cookie.

If allauth answers with a pending step (`verify_phone`, `mfa_authenticate`), the BFF shows that step. Sessions last 30 days, sliding. A password change revokes all other sessions. The website keeps its CSRF guard on its own route handlers and server actions (same-origin check); Django itself only receives server-to-server calls with a header token, so it needs no CSRF cookie.

### 4.2 Staff (admin BFF, mandatory second factor)
- The admin app uses a separate, staff-only allauth mount at `/api/v1/admin/auth/*`. Non-staff accounts get the same `invalid_credentials` as a bad password.
- Login is always two steps: password, then TOTP or passkey (`POST /admin/auth/2fa/authenticate`). A staff member without a second factor can only enrol it; every other admin endpoint answers 403 `mfa_required` (BR-ACC-04).
- Sessions: 8 hours absolute, 30 minutes idle (settings). Cookie `SameSite=Strict`.
- `/api/v1/admin/*` refuses website tokens, and host and guest endpoints refuse staff tokens (STF-05). A staff member who is also a host uses two separate sign-ins.
- Deactivating a staff member or changing their role takes effect on the next request: permissions are read from the database every time.

### 4.3 The active host account
A **host account** is either one user (individual host) or one organisation (agency, hotel, hostel). One person can hold several (DEC-004).

1. `GET /me/workspaces` lists the host accounts the user can act for, with role, permissions, allowed verticals.
2. The workspace switcher calls `PUT /me/workspaces/active {host_account_id}`. Django stores it in the session. This replaces `switchWorkspaceAction`.
3. Every `/host/*` request acts for the account in the `X-Host-Account` header if present, else the one in the session.
4. On every request Django checks that the user owns that individual account or has an **active membership** in that organisation. If not: 404. Then it checks the role permission for the endpoint (403 `permission_denied` if missing).
5. All lists are filtered by that host account in the query itself, never after loading (BR-ORG-01).

The header lets two browser tabs work on two organisations at once without fighting over the session value.

### 4.4 Host permissions (organisation roles, BR-ORG-05, DEC-009)

| Permission | owner | admin | manager | agent | guide |
|---|---|---|---|---|---|
| org.edit, members.manage | X | X | | | |
| org.delete, transfer ownership, payout_details.edit | X | | | | |
| listings.manage, trips.manage, calendar.manage | X | X | X | | |
| bookings.view | X | X | X | X | X (own departures) |
| bookings.respond (accept, decline) | X | X | X | | |
| bookings.cancel_as_host | X | X | | | |
| messages.reply | X | X | X | X | X |
| wallet.view, invoices.view | X | X | | | |

An individual host has every permission on their own host account. Agents and guides get `commission: null` in bookings (they never see money). The offer rule (DEC-014) comes on top of permissions: individual = home, vehicle; agency = experience and trips; hotel = hotel; hostel = hostel. A forbidden vertical gives 403 `host_offer_not_allowed`.

### 4.5 Staff permissions
The 34 permissions and 5 roles of the admin app (matrix in [_work/admin-inventory.md](_work/admin-inventory.md) section 1.1) move into the `staff_role_permission` table and are checked on every admin endpoint, deny by default (BR-STF-01). Each admin operation names its permission in `x-staff-permission`. This contract adds three permissions that the admin app does not have yet:

| New permission | Why | Proposed roles |
|---|---|---|
| `reports.view` | Dashboard KPIs and charts were open to any staff (no check) | all 5 roles |
| `ledger.adjust` | Ledger corrections did not exist | super_admin, finance |
| `privacy.handle_requests` | Data protection requests (PRV-02) | super_admin, support |

---

## 5. Idempotency and concurrency

### 5.1 Idempotency keys (BR-SYS-01)
Required on: booking create, onboarding submit, listing and trip create, staff refunds, manual top-ups, ledger adjustments, departure cancel, online top-up and the dormant payment endpoints. Optional (recommended) on accept, decline, cancel, top-up approval and moderation decisions.

| Situation | Answer |
|---|---|
| First call with key K | Normal processing; response stored 24 h with the hash of the body |
| Same K, same body, first call finished | Stored response, same status, header `Idempotency-Replayed: true` |
| Same K while the first call still runs | 409 `idempotency_in_progress` (retry after a moment) |
| Same K, different body | 422 `idempotency_key_reused` |

The BFF creates the key when the user opens the confirm step (not when they click), so a double click or a network retry sends the same key. Keys are per user and per endpoint (`idempotency_record` table).

### 5.2 The booking race
Two guests press "Book" for the same nights at the same second:
1. Both requests open a database transaction and re-price their quote.
2. Single units (homes, vehicles): both try to insert a booking. The **exclusion constraint** on `(listing, stay)` lets exactly one succeed; the other gets an error from PostgreSQL that Django turns into **409 `dates_unavailable`** (BR-AVL-01).
3. Pooled units (rooms, beds, slots, seats): each request runs one `UPDATE ... SET held/booked = booked + n WHERE booked + held + n <= total` per night. The loser updates 0 rows and gets **409 `not_enough_units`** or `seats_unavailable` (BR-AVL-02, BR-TRP-02).
4. The winner gets 201. The loser's app shows the message and reloads availability.

No application lock is needed; the database is the referee.

### 5.3 Other 409 cases
- Status moves that are not allowed by the state machines: `invalid_transition` (listings, trips, hosts, reviews, top-ups).
- Host accepts a request that expired a second ago: `request_expired`. Host accepts while the wallet is below the credit floor: `wallet_below_credit_floor` (BR-PAY-10).
- Quote no longer valid at booking: `price_changed` (with the new quote) or `quote_expired`.
- Duplicates: `receipt_already_used` (same receipt and method), `email_taken`, `review_exists`, `slug_taken`.
- Shrinking inventory under existing bookings: `inventory_in_use`, `night_booked`.

---

## 6. Webhooks (dormant)

`POST /api/v1/webhooks/gateway/{provider}` receives gateway callbacks (Chargily first). It is **dormant**: it returns 404 until online top-up (R2, PAY-06) or guest payments (M2 to M4) are switched on.

When active (BR-SYS-02, BR-PAY-08):
1. Store the raw body and headers in `gateway_event` first.
2. Check the signature (HMAC-SHA256 of the raw body with the provider secret, header `signature`), mark `signature_valid`.
3. Deduplicate by `(provider, event_id)` (database unique key). A replay answers 200 `{"received": true, "duplicate": true}` and does nothing.
4. Answer 200 within a second; a Celery worker processes the event once (credit the wallet, mark the top-up).
5. Never trust the amount in the browser return URL; only the verified webhook credits money.

BLADUS does not send outgoing webhooks to partners in this version.

---

## 7. How the Next.js apps consume the API

> Note: both apps run a Next.js version with breaking changes. Before writing the client code, read the guides in `node_modules/next/dist/docs/` of each app, as `frontend/AGENTS.md` asks.

1. **Types**: `openapi-typescript openapi.yaml -o lib/api/schema.d.ts` in each app (a script in package.json, run in CI). No hand-written API types.
2. **Client**: one server-only module `lib/api/client.ts` per app with `openapi-fetch`'s `createClient<paths>()`. A middleware adds `X-Session-Token` (from the cookie), `Accept-Language`, `X-Request-Id`, `X-Host-Account` (website host pages) and turns `problem+json` into the existing `ActionResult` error codes.
3. **`lib/data` keeps its function names**: each body becomes one typed call, for example `getListings(params)` becomes `client.GET("/api/v1/listings", { params: { query } })`. Pages do not change (this was the point of the `lib/data` layer).
4. **Server actions stay** as thin wrappers: session check, call, `revalidatePath`/`revalidateTag`. Business checks move to Django; the action no longer decides anything about money or availability.
5. **Route handlers** stay only where the browser must call the BFF directly: login, logout, register, and a small proxy for message sync polling (`/api/messages/sync`) and upload tickets. They forward to Django and never expose the token.
6. **Mock store**: `lib/data/_store.ts` and the seeds stay behind a flag for demos and tests; a `BLADUS_API_MODE=mock|live` switch picks the implementation per module, so modules can move one at a time.
7. **Contract tests**: schemathesis runs against Django with this file; the apps' unit tests use MSW handlers generated from the examples.

---

## 8. Every app function mapped to an endpoint

Paths below omit the `/api/v1` prefix. "Removed" means the function has no endpoint, with the reason. "Internal" means it becomes backend code that the apps no longer call.

### 8.1 Website: `lib/data` infrastructure (`_store.ts`, `_tables.ts`, `_sanitize.ts`)

| Function | Endpoint |
|---|---|
| `globalStore`, `removeWhere`, `clone`, `delay`, table constants | Removed: replaced by the Django ORM and PostgreSQL (kept only in mock mode) |
| `ListingInputError` | Replaced by 422 Problem with field `errors` |
| `isAllowedImageUrl` | Removed: images are only `media_id`s from `POST /media/uploads` |
| `OWNER_SETTABLE_LISTING_STATUSES` | Becomes the `HostStatusChange.status` enum of `POST /host/listings/{listing_id}/status` |
| `sanitizeListingInput` | Becomes server validation of `ListingWrite` |

### 8.2 Website: accounts (`auth.ts`, `account.ts`, `favorites.ts`, route handlers)

| Function or action | Endpoint |
|---|---|
| `verifyCredentials`, route `POST /api/auth/login` | `POST /auth/login` (`authLogin`); phone OTP: `POST /auth/code/request`, `POST /auth/code/confirm` |
| `registerUser`, route `POST /api/auth/register` | `POST /auth/signup`, then `POST /auth/phone/verify` or `/auth/email/verify` |
| route `POST /api/auth/logout` | `DELETE /auth/session` |
| `getUserById` | Own: `GET /me`; others: `GET /users/{user_id}` (public projection) |
| `getUsersByIds` | Removed: no caller; people are embedded as `UserRef` in responses |
| `getUserByEmail` | Removed: internal (invitation matching happens in Django) |
| `changePassword`, `changePasswordAction` | `POST /auth/password/change` |
| `updateUserProfile`, `updateProfileAction` | `PATCH /me`; phone change: `PUT /me/phone` + `POST /auth/phone/verify` |
| `updateUserHostStatus` | Removed: being a host is now holding a host account, created by `POST /host/onboarding/drafts/{host_type}/submit`; approval mode moved to `PATCH /host/account` |
| `setUserFavorite`, `setFavoriteAction` | `PUT` / `DELETE /me/favorites/{target_type}/{target_id}` |
| `getFavoriteListings` | `GET /me/favorites` |
| `DEMO_PASSWORD` | Removed: seed fixtures only |
| `lib/server` session helpers (`getSession`, `getSessionUser`, `startSession`, `refreshSession`, `endSession`) | Stay in the BFF; they call `GET /auth/session` and the login/logout endpoints |
| `isTrustedJsonRequest` | Stays in the BFF (CSRF guard of its own routes) |
| `toPublicUser`, `toPublicOrganization`, `toPublicMembers`, `toCardListing`, `toCardTrip` | Removed: Django serializers return the public shapes (`PublicUser`, `PublicOrganization`, `ListingCard`, `TripCard`) |

### 8.3 Website: catalogue (`listings.ts`, `experiences.ts`, `vehicles.ts`, `reviews.ts`)

| Function or action | Endpoint |
|---|---|
| `getListings` | `GET /listings` (`searchListings`); facets `GET /listings/facets`; map `GET /listings/map` |
| `isPublicListing` | Internal: the search query only returns published listings of approved hosts |
| `getPublicListingById` | `GET /listings/{listing_id}` |
| `getFeaturedListings` | `GET /listings?featured=true&vertical=` |
| `getExperiences` | `GET /listings?vertical=experience` |
| `getVehicles` | `GET /listings?vertical=vehicle` |
| `getListingById` | Owner: `GET /host/listings/{listing_id}`; other uses were internal checks, now in Django |
| `getHostListings` | `GET /host/listings`; public organisation and host pages: `GET /listings?host_account=` |
| `createListing`, `createMyListingAction` | `POST /host/listings` (offer rule, starts as draft) |
| `updateListing`, `updateMyListingAction` | `PATCH /host/listings/{listing_id}`; status part: `POST /host/listings/{listing_id}/status`; photos: `PUT .../photos`; room types: `.../room-types` |
| `deleteListing`, `deleteMyListingAction` | `DELETE /host/listings/{listing_id}` (soft delete now) |
| `mockReviews` | Removed: replaced by the `review` table |
| `getReviewsByListingId` | `GET /listings/{listing_id}/reviews` (and `GET /trips/{trip_id}/reviews`) |
| `getReviewsByUserId` | `GET /users/{user_id}/reviews?role=author|host`; host dashboard: `GET /host/reviews` |

### 8.4 Website: bookings and availability (`reservations.ts`, `bookings.ts`)

| Function or action | Endpoint |
|---|---|
| `getReservations` (guest, `userId`) | `GET /me/bookings` |
| `getReservations` (host, `hostId` / `organizationId`) | `GET /host/bookings`; calendar page: `GET /host/calendar` |
| `getReservationById` | `GET /me/bookings/{booking_id}` or `GET /host/bookings/{booking_id}` |
| `getReservationOwner` | Removed: permission check inside Django |
| `ReservationConflictError` | 409 Problem (`dates_unavailable`, `not_enough_units`, `seats_unavailable`) |
| `getListingAvailability` | `GET /listings/{listing_id}/availability` |
| `unavailableNights`, `isListingFreeForRange` | Internal availability service (feeds search and availability) |
| `seatsSoldByDeparture` | `GET /trips/{trip_id}/departures` (`seats_left`) |
| `createListingReservation`, `createTripReservation`, `createBookingAction` | `POST /quotes`, then `POST /me/bookings` with `Idempotency-Key` |
| `cancelReservation` (guest), `cancelMyReservationAction` | `GET /me/bookings/{booking_id}/cancellation-preview`, `POST /me/bookings/{booking_id}/cancel` |
| `cancelReservation` (host), `respondToReservationAction` decision `cancel` | `POST /host/bookings/{booking_id}/cancel` |
| `respondToRequest`, `respondToReservationAction` decision `confirm` / `decline` | `POST /host/bookings/{booking_id}/accept`, `POST /host/bookings/{booking_id}/decline` |
| Internal helpers (`guestForHost`, `tripFor`, `settle`, `populate`, `ownedInventory`, `activeListingReservations`, `reservationRoomTypeId`, `usageByNight`, `capacityOf`, `buildReservation`, `commissionOwner`, `commissionBase`, `chargeCommission`) | Internal: Django booking, availability and ledger services. `settle` (lazy expiry and completion) becomes scheduled jobs (BR-BKG-04, BR-BKG-05) |

### 8.5 Website: calendar (`calendar.ts`, `calendar` actions)

| Function or action | Endpoint |
|---|---|
| `getAvailabilityOverrides` | `GET /host/listings/{listing_id}/calendar` |
| `getOverridesForListings` | `GET /host/calendar?listing_ids=&from=&to=` |
| `blockedDateKeys`, `priceOverridesFor` | Internal (availability and pricing services) |
| `setDatesBlocked`, `setListingDatesBlockedAction` | `PUT /host/listings/{listing_id}/calendar/blocks` |
| `setDatePrice`, `setListingDatePriceAction` | `PUT /host/listings/{listing_id}/calendar/prices` (now also per room type) |

### 8.6 Website: messages and notifications

| Function or action | Endpoint |
|---|---|
| `getConversations` | `GET /conversations?as=guest|host` |
| `getConversationForParticipant` | `GET /conversations/{conversation_id}` |
| `isConversationParticipant` | Removed: permission check in Django |
| `getMessages`, `getConversationMessagesAction` | `GET /conversations/{conversation_id}/messages?after=` (and `before=` for history); live updates: `GET /conversations/sync?after=` |
| `sendMessage`, `sendMessageAction` | `POST /conversations/{conversation_id}/messages` |
| `markConversationAsRead`, `markConversationReadAction` | `POST /conversations/{conversation_id}/read` |
| `findOrCreateConversation`, `startConversationAction` | `POST /conversations` |
| `getNotifications`, `getMyNotificationsAction` | `GET /me/notifications` |
| `markNotificationAsRead`, `markNotificationReadAction` | `POST /me/notifications/{notification_id}/read` |
| `markAllNotificationsAsRead`, `markAllNotificationsReadAction` | `POST /me/notifications/read-all` |

### 8.7 Website: organisations, team and workspaces (`organizations.ts`)

| Function or action | Endpoint |
|---|---|
| `ORGANIZATION_LEGAL_FIELDS`, `ORGANIZATION_EDITABLE_FIELDS` | Become the `OrganizationUpdate` schema; legal fields trigger re-verification (BR-ORG-06) |
| `getOrganizationById` | Public: `GET /organizations/{org_slug}`; private: `GET /host/organization` |
| `getOrganizations` | `GET /organizations` |
| `getOrganizationMembers` | `GET /host/organization/members`; public team inside `PublicOrganization.team` |
| `getMembershipsForUser`, `resolveActiveOrganization`, `getHostContext`, `requireHostContext`, `hostOwnerKey` | `GET /me/workspaces` and `GET /host/account`; the BFF keeps a thin `getHostContext` built on them |
| `switchWorkspaceAction` | `PUT /me/workspaces/active` |
| `getMembership`, `getMemberById`, `getOrgContext`, `hostOwnsListing`, `hostOwnsTrip`, `getHostContextForReservation` | Removed: permission checks in Django (section 4.3) |
| `createOrganization` | `POST /host/onboarding/drafts/{host_type}/submit` (creates organisation, owner, invitations) |
| `updateOrganization`, `updateOrganizationAction` | `PATCH /host/organization` (with `If-Match`) |
| `deleteOrganization`, `deleteOrganizationAction` | `DELETE /host/organization?confirm_name=` (soft) |
| `addOrganizationMember`, `inviteMemberAction` | `POST /host/organization/invitations`; the invitee accepts with `POST /me/invitations/accept`. Direct add is removed: a member always accepts first (ORG-03) |
| (new) list and revoke invitations | `GET /host/organization/invitations`, `DELETE /host/organization/invitations/{invitation_id}` |
| `updateOrganizationMemberRole`, `changeMemberRoleAction` | `PATCH /host/organization/members/{membership_id}` |
| `transferOrganizationOwnership`, `transferOwnershipAction` | `POST /host/organization/transfer-ownership` |
| `removeOrganizationMember`, `removeMemberAction` | `DELETE /host/organization/members/{membership_id}` (soft) |
| `updateOrganizationVerification` | Staff only: `POST /admin/hosts/{host_account_id}/approve` (and reject, request-changes) or `POST /admin/moderation/cases/{case_id}/decisions` |

### 8.8 Website: becoming a host (`host.ts`)

| Function or action | Endpoint |
|---|---|
| `completeHostOnboardingAction` | `GET /onboarding-flows/{host_type}`, `PUT /host/onboarding/drafts/{host_type}` (save as you go), `POST /host/onboarding/drafts/{host_type}/submit`; then documents (`POST /host/documents`) and `POST /host/verification/submit` |
| `setBookingApprovalModeAction` | `PATCH /host/account` (`default_approval_mode`) |
| `localStorage` drafts in `BecomeHostFlow` | Replaced by server drafts (`GET /host/onboarding/drafts`) |

### 8.9 Website: trips (`trips.ts`)

| Function or action | Endpoint |
|---|---|
| `getTrips` (public) | `GET /trips` |
| `getTrips` (agency, `status: all`) | `GET /host/trips` |
| `getTripById` | Owner: `GET /host/trips/{trip_id}`; other uses were internal checks |
| `getPublicTripById` | `GET /trips/{trip_id}` (UUID or reference; old slugs redirect) |
| `createTrip`, `createTripAction` | `POST /host/trips` (+ `POST /host/trips/{trip_id}/departures` for each date, replacing the array of dates) |
| `updateTrip` | `PATCH /host/trips/{trip_id}` |
| `setTripStatusAction` | `POST /host/trips/{trip_id}/status` |
| `deleteTrip`, `deleteTripAction` | `DELETE /host/trips/{trip_id}` (soft) |

### 8.10 Website: wallet (`wallet.ts`)

| Function or action | Endpoint |
|---|---|
| `getWalletByOwner`, `getMyWalletAction` | `GET /host/wallet`; history `GET /host/wallet/entries` |
| `getRateForHostType`, `DEFAULT_COMMISSION_RATES` | Internal; the effective rate is in `GET /host/wallet` (`commission_rate_bp`) |
| `getCommissionRates`, `saveCommissionRates` | Staff only: `GET` / `PUT /admin/commission-rates` |
| `getWallets`, `getWalletById` | Staff only: `GET /admin/wallets`, `GET /admin/wallets/{host_account_id}` |
| `rechargeWallet` | Staff only: `POST /admin/wallets/{host_account_id}/topups` |
| `deductBookingCommission`, `reverseBookingCommission`, `getBookingCommission`, `computeBalance`, `findOrCreateWallet`, `appendTransaction`, `netCommissionFor` | Internal ledger service, called inside the booking transaction; results visible in `HostBooking.commission` and wallet entries |

### 8.11 Admin: dashboard, moderation, audit, search

| Function (data and action) | Endpoint |
|---|---|
| `getDashboardKPIs` | `GET /admin/analytics/kpis` |
| `getDashboardCharts` | `GET /admin/analytics/charts` |
| `getAttentionItems` | `GET /admin/dashboard/attention` |
| `exportKpiReport` | `POST /admin/exports {dataset: "kpi"}` |
| `getApprovalsInbox` | `GET /admin/moderation/cases?kind=`, counts `GET /admin/moderation/counts`; decisions `POST /admin/moderation/cases/{case_id}/decisions` |
| `logAudit`, `logExport` | Removed as calls: Django writes audit rows in the same transaction as each change |
| `listAuditLogs` | `GET /admin/audit-events` |
| `exportAuditLogs` | `POST /admin/exports {dataset: "audit"}` |
| `searchGlobalCommandPalette` | `GET /admin/search?q=` |

### 8.12 Admin: sign-in and staff (`auth.ts`, `credentials.ts`, `team.ts`)

| Function | Endpoint |
|---|---|
| `loginAction` | `POST /admin/auth/login`, then `POST /admin/auth/2fa/authenticate` |
| `logoutAction` | `DELETE /admin/auth/session` |
| `getCurrentAdmin`, `requireAdmin`, `requirePermission` | `GET /admin/auth/session` (user + permissions); checks done by Django on every call |
| `verifyAdminCredentials`, `getAdminPasswordHash` | Removed: Django authentication |
| `getDemoCredentials`, `listDevDemoAccounts`, `getDevSeedPassword` | Removed: development only, replaced by seed fixtures |
| `listTeamMembers` | `GET /admin/staff` (roles matrix: `GET /admin/staff/roles`) |
| `getTeamMemberById`, `findTeamMemberByEmail`, `recordTeamMemberLogin` | Removed: internal to Django authentication |
| `updateMemberRole` | `PATCH /admin/staff/{staff_id}` |
| `toggleMemberActive` | `POST /admin/staff/{staff_id}/deactivate` or `/activate` |
| `inviteMember` | `POST /admin/staff/invitations`; acceptance `POST /admin/auth/invitations/accept` then `POST /admin/auth/authenticators/totp` |
| (missing today) staff password change, MFA reset | `POST /admin/auth/password/change`, `POST /admin/staff/{staff_id}/reset-mfa` |

### 8.13 Admin: hosts (`hosts.ts`)

| Function | Endpoint |
|---|---|
| `listHosts` | `GET /admin/hosts` |
| `getHostById` | `GET /admin/hosts/{host_account_id}` |
| `exportHosts` | `POST /admin/exports {dataset: "hosts"}` |
| `getProviderCategory` | Removed: `host_type` is a field of every host |
| `transitionHost` | Internal state machine service |
| `approveHost`, `rejectHost`, `suspendHost`, `unsuspendHost`, `banHost`, `restoreHost` | `POST /admin/hosts/{host_account_id}/approve`, `/reject`, `/suspend`, `/unsuspend`, `/ban`, `/restore` (+ new `/request-changes`) |
| `deleteHost` | `DELETE /admin/hosts/{host_account_id}` |
| `overrideCommission` | `PUT` / `DELETE /admin/hosts/{host_account_id}/commission-override` |
| (missing today) document review, credit limit | `GET /admin/documents/{document_id}/url`, `POST .../approve`, `POST .../reject`; `PUT /admin/hosts/{host_account_id}/credit-limit-override` |

### 8.14 Admin: listings, trips and network (`listings.ts`, `network.ts`)

| Function | Endpoint |
|---|---|
| `listListings` | `GET /admin/listings`; trips (now separate tables): `GET /admin/trips` |
| `getListingById` | `GET /admin/listings/{listing_id}`; trips `GET /admin/trips/{trip_id}` |
| `exportListings` | `POST /admin/exports {dataset: "listings"}` (or `"trips"`) |
| `matchListingStatus` | Removed: one status set, no aliases |
| `transitionListing` | Internal state machine service |
| `approveListing`, `rejectListing`, `requestChangesListing`, `suspendListing`, `restoreListing` | `POST /admin/listings/{listing_id}/approve`, `/reject`, `/request-changes`, `/suspend`, `/restore` |
| `deleteListing` | `DELETE /admin/listings/{listing_id}` |
| `featureListing` | `PUT /admin/listings/{listing_id}/featured` |
| `updateListingStatus` | `POST /admin/listings/{listing_id}/status`; trips `POST /admin/trips/{trip_id}/status` |
| `searchNetwork` | `GET /admin/listings` (same filters, every status) |

### 8.15 Admin: bookings, users, reviews

| Function | Endpoint |
|---|---|
| `listBookings` | `GET /admin/bookings` |
| `getBookingById` | `GET /admin/bookings/{booking_id}` |
| `exportBookings` | `POST /admin/exports {dataset: "bookings"}` |
| `cancelBooking` | `POST /admin/bookings/{booking_id}/cancel` |
| `refundBooking` (and private `applyRefund`) | `POST /admin/bookings/{booking_id}/refunds` with `Idempotency-Key` |
| `resolveDispute` | `POST /admin/bookings/{booking_id}/dispute/resolve` (R2) |
| `listUsers` | `GET /admin/users` |
| `getUserById` | `GET /admin/users/{user_id}` |
| `suspendUser`, `unsuspendUser`, `banUser`, `restoreUser` | `POST /admin/users/{user_id}/suspend`, `/unsuspend`, `/ban`, `/restore` |
| `deleteUser` | `DELETE /admin/users/{user_id}` (anonymisation follows, BR-PRV-02) |
| `updateUserStatus` | Removed: replaced by the explicit transitions above (the schema has no "pending" user status) |
| `listReviews` | `GET /admin/reviews` |
| `hideReview`, `restoreReview`, `dismissFlag` | `POST /admin/reviews/{review_id}/hide`, `/restore`, `/dismiss-reports` |
| `deleteReview` | `DELETE /admin/reviews/{review_id}` (status `removed`) |
| (new) data protection requests | `GET /admin/data-requests`, `POST /admin/data-requests/{data_request_id}/complete` |

### 8.16 Admin: finance and ledger (`finance.ts`, `ledger.ts`)

| Function | Endpoint |
|---|---|
| `getFinanceSummary` | `GET /admin/finance/summary` |
| `listWallets` | `GET /admin/wallets` |
| `exportWallets` | `POST /admin/exports {dataset: "wallets"}` |
| `listTransactions` | `GET /admin/ledger/transactions` |
| `exportTransactions` | `POST /admin/exports {dataset: "ledger"}` |
| `rechargeWallet` | `POST /admin/wallets/{host_account_id}/topups`; four-eyes: `GET /admin/topups?status=pending_approval`, `POST /admin/topups/{topup_id}/approve`, `/reject` |
| `getCommissionRates`, `updateCommissionRates` | `GET` / `PUT /admin/commission-rates` |
| `listPayouts`, `approvePayout`, `rejectPayout` | Dormant: `GET /admin/payouts`, `POST /admin/payouts/{payout_id}/approve`, `/reject` (+ `/mark-sent`) |
| `listRefunds` | `GET /admin/refunds` |
| `computeWalletAggregates`, `getHostBalance`, `appendLedgerEntry` | Internal ledger service (balances from `account_balance`) |
| (missing today) ledger correction | `POST /admin/ledger/adjustments` |

### 8.17 Admin: configuration (`settings.ts`, `onboarding.ts`, `categories.ts`, `promotions.ts`)

| Function | Endpoint |
|---|---|
| `getPlatformSettings` | `GET /admin/settings` (history `GET /admin/settings/versions`) |
| `updatePlatformSettings` | `PATCH /admin/settings` with `If-Match` |
| `getOnboardingConfig` | `GET /admin/onboarding-flows`, `GET /admin/onboarding-flows/{host_type}/versions[/{version}]` |
| `updateOnboardingFlow` | `PUT /admin/onboarding-flows/{host_type}/draft`, then `POST /admin/onboarding-flows/{host_type}/publish`; rollback `POST .../versions/{version}/republish` |
| `listCategories`, `createCategory`, `toggleCategoryStatus`, `deleteCategory` | `GET` / `POST /admin/categories`, `PATCH /admin/categories/{category_id}` (`is_active`), `DELETE` (only when unused) |
| (missing today) amenities and property types | `/admin/amenities`, `/admin/property-types` (same four operations) |
| `listPromotions`, `createPromotion`, `togglePromotionStatus`, `deletePromotion` | `GET` / `POST /admin/coupons`, `PATCH /admin/coupons/{coupon_id}`, `DELETE` (R2) |
| `unwrap` (`lib/actions/result.ts`), `DomainError`, `ValidationError` (`lib/data/errors.ts`) | Stay in the admin app; they now wrap Problem responses |

### 8.18 New endpoints with no caller today
These serve requirements the apps do not implement yet: second-factor enrolment, email and phone verification, password reset, consents, data requests, notification preferences (R2), media uploads, host documents and verification submission, change requests, payout accounts, room-type and slot management, departures, review writing, replies and reports, disputes (R2), host earnings, invoices (R2), online top-up (R2), reference lists and reason codes, moderation cases and bulk decisions (R2), staff MFA reset. Each is in `openapi.yaml` with its requirement IDs.

### 8.19 Gaps found while mapping
- The website profile edits `bio`, `address` and `languages` (`updateProfileAction`), but `schema.dbml` has no such columns on `user`. `PATCH /me` leaves them out. Decide: add columns or drop the fields (proposed question for [14-open-questions.md](14-open-questions.md)).
- Trips are addressed by slug in the website today; the schema has only a reference. Old slugs need a redirect table or are dropped.
- `addOrganizationMember` added members directly; the new flow always goes through an invitation the person accepts.

---

## 9. Versioning and deprecation
- The major version is in the path (`/api/v1`). The `info.version` of the file follows semantic versioning (`1.0.0-draft.1` today).
- **Allowed without a new major version**: new endpoints, new optional request fields, new response fields, new enum values in responses that the apps already treat as "unknown" (the apps must not crash on an unknown value).
- **Breaking** (needs `/api/v2` for the affected endpoints): removing or renaming a field or endpoint, changing a type or unit, making an optional input required, changing an error `code`, changing pagination style.
- A deprecated endpoint answers with `Deprecation: true` and `Sunset: <date>` headers (RFC 9745 and RFC 8594) and is marked `deprecated: true` in the file. Both apps are ours, so the notice is at least one release (minimum 30 days) before removal; any future partner API needs 6 months.
- CI runs `oasdiff breaking` between the main-branch file and the pull request; a breaking change fails the build unless the version changes.

---

## 10. Worked examples

All examples use the Tipaza villa of example 8a in [04-business-rules.md](04-business-rules.md): 3 nights x 18,500 DZD, cleaning 4,000 DZD, individual host at 12%. Money is in centimes. The same examples are embedded in `openapi.yaml`.

### 10.1 Search
```http
GET /api/v1/listings?vertical=home&wilaya=42&check_in=2026-12-18&check_out=2026-12-21&guests=5&amenities=wifi,pool&ordering=price&limit=20
Accept-Language: fr
X-Session-Token: (from the BFF cookie, optional here)
```
```json
{
  "results": [{
    "id": "01933b80-1111-7aaa-8bbb-000000000001",
    "reference": "LST-7K2M9Q",
    "vertical": "home",
    "experience_type": null,
    "title": "Villa with sea view in Tipaza",
    "property_type": "villa",
    "commune": {"id": 4201, "name": "Tipaza", "wilaya_code": 42, "wilaya_name": "Tipaza"},
    "location_public": {"lat": 36.5921, "lng": 2.4433},
    "price_from": {"amount_minor": 1850000, "currency": "DZD"},
    "price_unit": "night",
    "rating_avg": 4.8, "review_count": 23,
    "instant_bookable": false, "host_type": "individual",
    "matched_availability": {"full_match": true, "from": "2026-12-18", "to": "2026-12-21"},
    "quoted_total": {"amount_minor": 5950000, "currency": "DZD"},
    "is_favorite": false
  }],
  "next_cursor": "eyJyIjowLjkxLCJpZCI6IjAxOTMzYjgwIn0",
  "has_more": true,
  "total_estimate": 37
}
```
The filter panel calls `GET /api/v1/listings/facets` with the same query to show counts. `location_public` is the fuzzed point (BR-SRC-03).

### 10.2 Quote, then booking
```http
POST /api/v1/quotes
Content-Type: application/json

{"listing_id": "01933b80-1111-7aaa-8bbb-000000000001", "check_in": "2026-12-18", "check_out": "2026-12-21",
 "guests_adults": 4, "guests_children": 1, "units": 1}
```
Response `201` (shortened: three `night` lines of 1,850,000 and one `cleaning_fee` line of 400,000):
```json
{
  "id": "01933c0f-aaaa-7bbb-8ccc-00000000a001",
  "expires_at": "2026-11-09T10:00:00Z",
  "nights": 3,
  "subtotal": {"amount_minor": 5550000, "currency": "DZD"},
  "discount": {"amount_minor": 0, "currency": "DZD"},
  "cleaning_fee": {"amount_minor": 400000, "currency": "DZD"},
  "taxes": {"amount_minor": 0, "currency": "DZD"},
  "total": {"amount_minor": 5950000, "currency": "DZD"},
  "platform_fee": {"amount_minor": 0, "currency": "DZD"},
  "approval_mode": "request",
  "cancellation_policy": {"code": "moderate", "version": 1, "label": "Modérée", "windows": [
    {"min_days_before": 5, "refund_bp": 10000}, {"min_days_before": 1, "refund_bp": 5000}, {"min_days_before": 0, "refund_bp": 0}]}
}
```
The guest confirms (phone already verified, DEC-012):
```http
POST /api/v1/me/bookings
Idempotency-Key: 6f1d2c0e-5a7b-4c1e-9d3a-2b8f0e7c4a11
Content-Type: application/json

{"quote_id": "01933c0f-aaaa-7bbb-8ccc-00000000a001", "guest_message": "We arrive around 16:00 with a baby.", "terms_version": "2026-10"}
```
Response `201`: a `GuestBooking` with `reference: "BLD-2026-7K2M9Q"`, `status: "pending"` (request mode), `request_expires_at` 24 hours later (DEC-008), `total` 5,950,000, `address_line: null` (hidden until confirmed), `payment_status: "not_collected"` (model M1). If the guest clicks twice, the second call returns the same body with `Idempotency-Replayed: true`. If someone else took the nights first: `409 dates_unavailable`.

### 10.3 Host accepts the request
```http
POST /api/v1/host/bookings/BLD-2026-7K2M9Q/accept
X-Host-Account: 01933b7e-8a10-7c3e-9f00-1a2b3c4d5e01
Idempotency-Key: 0b9e4f7a-3c2d-4e11-8a6b-7d5c9e1f2a33
Content-Type: application/json

{"message_to_guest": "Welcome! The key box code will be sent the day before."}
```
Response `200` (extract):
```json
{
  "reference": "BLD-2026-7K2M9Q",
  "status": "confirmed",
  "confirmed_at": "2026-11-09T11:02:00Z",
  "guest": {"id": "01933a00-0000-7000-8000-0000000a0001", "display_name": "Yacine M.", "avatar_url": null},
  "guest_phone_e164": "+213555123456",
  "commission": {"rate_bp": 1200,
                 "base": {"amount_minor": 5550000, "currency": "DZD"},
                 "amount": {"amount_minor": 666000, "currency": "DZD"},
                 "reversed": {"amount_minor": 0, "currency": "DZD"}},
  "allowed_actions": ["cancel", "message"]
}
```
In the same transaction Django posts the ledger transaction "debit host_wallet 6,660 DZD, credit commission revenue 6,660 DZD" (example 9a), writes the outbox events (notification, SMS to the guest) and the message. An agent or guide would get `403 permission_denied` with `required_permission: "bookings.respond"`. A host whose wallet is below the credit floor gets `409 wallet_below_credit_floor`.

### 10.4 Wallet top-up with four-eyes approval
Finance user Samira records a CCP transfer of 600,000 DZD for Atlas Escapes (above the 500,000 DZD threshold):
```http
POST /api/v1/admin/wallets/01933b7e-8a10-7c3e-9f00-1a2b3c4d5e02/topups
Idempotency-Key: 9a7c1e22-4b6f-4d0a-8e3c-1f2d3b4c5d66

{"amount": {"amount_minor": 60000000, "currency": "DZD"}, "method": "ccp_transfer",
 "receipt_reference": "CCP-0012345-2026-11-08", "note": "Transfer seen on CCP statement 08/11"}
```
Response `201`: `status: "pending_approval"`, `needs_second_approval: true`, nothing posted to the ledger yet. Using the same receipt again gives `409 receipt_already_used`.

A second finance user, Nadir, approves:
```http
POST /api/v1/admin/topups/01933d00-0000-7000-8000-0000000e0001/approve
Idempotency-Key: 2c4e6a80-1b3d-4f5a-9c7e-0d2f4a6b8c99
```
```json
{
  "id": "01933d00-0000-7000-8000-0000000e0001",
  "status": "approved",
  "amount": {"amount_minor": 60000000, "currency": "DZD"},
  "requested_by": {"id": "01933a00-0000-7000-8000-0000000d0001", "display_name": "Samira (finance)"},
  "approved_by": {"id": "01933a00-0000-7000-8000-0000000d0002", "display_name": "Nadir (finance)"},
  "ledger_transaction_id": "01933d00-0000-7000-8000-0000000f0001",
  "needs_second_approval": true,
  "wallet_balance_after": {"amount_minor": 61240000, "currency": "DZD"}
}
```
If Samira tried to approve her own top-up: `403 four_eyes_same_user`. Both actions are in the audit log with ids, not names (BR-STF-03).

### 10.5 Message sync (polling)
The guest's messages page first calls `GET /api/v1/conversations/sync` (no cursor) and gets the current cursor. Then, every `poll_after_ms`:
```http
GET /api/v1/conversations/sync?after=m90398&as=guest
```
```json
{
  "conversations": [{"id": "01933c10-0000-7000-8000-00000000c001", "kind": "booking", "my_role": "guest",
                     "unread_count": 1, "last_read_message_id": 90398, "muted": false,
                     "subject": {"booking_reference": "BLD-2026-7K2M9Q", "title": "Villa with sea view in Tipaza"},
                     "other_party": {"id": "01933a00-0000-7000-8000-0000000a0009", "display_name": "Karim B.", "avatar_url": null}}],
  "messages": [{"id": 90412, "conversation_id": "01933c10-0000-7000-8000-00000000c001", "sender_role": "host_member",
                "kind": "text", "body": "Welcome! The key box code will be sent the day before.",
                "is_masked": false, "created_at": "2026-11-09T11:02:05Z"}],
  "unread_total": 1,
  "next_cursor": "m90412",
  "has_more": false,
  "poll_after_ms": 10000
}
```
When nothing changed, `conversations` and `messages` are empty and the cursor stays the same. When the guest opens the thread, the app calls `POST /conversations/{id}/read {"last_read_message_id": 90412}`. Before a booking is confirmed, a phone number in a message arrives as `"0555 ** ** **"` with `is_masked: true` (BR-MSG-01). Later, Centrifugo can push the same events without changing this endpoint.

---

## Check yourself

- [ ] Why does the browser never hold the Django session token, and where is it kept instead?
- [ ] A user is a member of two organisations. How does Django know which one a host request is for, and what happens if the id is not theirs?
- [ ] Write the `Money` object for 12,500 DZD.
- [ ] Two guests book the last room at the same moment. Which part of the system decides who wins, and what does the loser receive?
- [ ] What happens when the same `Idempotency-Key` is sent twice with the same body? And with a different body?
- [ ] Which website function has no endpoint any more because being a host is now a host account, and which endpoint replaces it?
- [ ] Why is the gateway webhook marked `x-dormant`, and what does it answer today?
- [ ] Which change to the API would force a `/api/v2`: adding a response field, or renaming one?
