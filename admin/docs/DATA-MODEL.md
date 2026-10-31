# DARNA admin, canonical data model

This page is the reference for the admin back-office enums, state machines, money rules and pricing constants. It also shows how each one maps to the guest/host app (`../frontend/types.ts`, `../frontend/lib/booking/config.ts`).

Admin source of truth:

- Types: `lib/types/index.ts`
- State machines: `lib/domain/transitions.ts` (client-safe; the UI and `lib/data/*` both use it)
- Pricing and money limits: `lib/pricing.ts` (client-safe)
- Ledger: `lib/data/ledger.ts`
- Mock DB: `lib/mock-data/store.ts`, seeded by `lib/mock-data/generator.ts`

The frontend is **not** modified by the admin work. The mapping below is what a shared package or backend has to reconcile (audit report §9).

---

## 1. Listing status

The canonical admin values are `draft`, `pending_review`, `approved`, `changes_requested`, `rejected`, `suspended`, `archived` and `deleted`.

The legacy aliases `pending`, `published` and `refused` are still accepted on read. `normalizeListingStatus()` folds them into `pending_review`, `approved` and `rejected`. New writes always use the canonical value.

| Admin (canonical)                  | Frontend `ListingStatus` | Notes                                                             |
| ---------------------------------- | ------------------------ | ----------------------------------------------------------------- |
| `draft`                            | `draft`                  |                                                                   |
| `pending_review` (alias `pending`) | `pending`                |                                                                   |
| `changes_requested`                | `pending`                | Frontend has no "changes requested"; shown to the host as pending |
| `approved` (alias `published`)     | `active`                 |                                                                   |
| `suspended`                        | `suspended`              |                                                                   |
| `rejected` (alias `refused`)       |,                        | Not visible on frontend                                           |
| `archived`                         |,                        | Not visible on frontend                                           |
| `deleted`                          |,                        | Soft delete; `statusBeforeDelete` keeps the previous status       |

Allowed transitions (`LISTING_TRANSITIONS`):

| From                | To                                                                                             |
| ------------------- | ---------------------------------------------------------------------------------------------- |
| `draft`             | `pending_review`, `deleted`                                                                    |
| `pending_review`    | `approved`, `changes_requested`, `rejected`, `deleted`                                         |
| `changes_requested` | `pending_review`, `approved`, `rejected`, `deleted`                                            |
| `approved`          | `suspended`, `archived`, `changes_requested`, `pending_review`, `deleted`                      |
| `rejected`          | `pending_review`, `deleted`                                                                    |
| `suspended`         | `approved`, `pending_review`, `deleted`                                                        |
| `archived`          | `approved`, `deleted`                                                                          |
| `deleted`           | only via `restoreListing`, which returns to `statusBeforeDelete` (`pending_review` if unknown) |

Moving a listing to `rejected`, `suspended` or `changes_requested` requires a reason of at least 3 characters. Only `approved` listings can be featured.

## 2. Host status

The admin host statuses are `applied`, `under_review`, `approved`, `rejected`, `suspended`, `banned` and `deleted`. The frontend has no host lifecycle; it only has `OrganizationVerificationStatus` = `pending | verified | rejected`.

| Action        | Allowed from                                                   | Result                                           | Reason required |
| ------------- | -------------------------------------------------------------- | ------------------------------------------------ | --------------- |
| approve       | `applied`, `under_review`, `rejected`                          | `approved` (verification becomes `verified`)     | no              |
| reject        | `applied`, `under_review`                                      | `rejected`                                       | yes             |
| suspend       | `approved`                                                     | `suspended`                                      | yes             |
| unsuspend     | `suspended`                                                    | `approved`                                       | no              |
| ban           | `approved`, `suspended`, `rejected`, `under_review`, `applied` | `banned`                                         | yes             |
| delete (soft) | any except `deleted`                                           | `deleted`; `statusBeforeDelete` is stored        | no              |
| restore       | `deleted`                                                      | `statusBeforeDelete` (`under_review` if unknown) | no              |

## 3. Booking status and payment status

| Admin `BookingStatus` | Frontend `ReservationStatus`                                                 |
| --------------------- | ---------------------------------------------------------------------------- |
| `pending`             | `pending`                                                                    |
| `confirmed`           | `confirmed`                                                                  |
| `completed`           | `completed`                                                                  |
| `cancelled`           | `cancelled`                                                                  |
| `disputed`            |, (frontend has no dispute state)                                            |
| `refunded`            |, (frontend uses `cancelled` + `paymentStatus: refunded`)                    |
|,                     | `declined`, `expired` (host-side outcomes; admin treats them as `cancelled`) |

Allowed transitions (`BOOKING_TRANSITIONS`):

| From        | To                                               |
| ----------- | ------------------------------------------------ |
| `pending`   | `confirmed`, `cancelled`                         |
| `confirmed` | `completed`, `cancelled`, `disputed`, `refunded` |
| `completed` | `disputed`, `refunded`                           |
| `disputed`  | `confirmed`, `completed`, `refunded`             |
| `cancelled` | `refunded`                                       |
| `refunded`  |,                                                |

Payment status: `paid | partially_refunded | refunded | pending | failed`. The frontend `PaymentStatus` adds `voided` and has no `failed`.

### Refund rules

`refundBooking` and `resolveDispute` both apply these rules:

- The booking status must be `confirmed`, `completed`, `cancelled` or `disputed`.
- The payment status must be `paid` or `partially_refunded`.
- The amount must be an integer DZD with `0 < amount ≤ totalAmountDzd − refundedAmountDzd`.
- `refundedAmountDzd` accumulates. When it reaches the total, the booking moves to `refunded` and `paymentStatus` to `refunded`. Otherwise `paymentStatus` becomes `partially_refunded`.
- Each refund writes a negative `booking_refund` ledger entry to the host wallet. The entry is the host's proportional share: `amount × hostPayoutDzd / totalAmountDzd`.

### Dispute outcomes

- `refund_full` refunds the remaining amount; the booking becomes `refunded`.
- `refund_partial` refunds an amount below the remaining balance. The booking returns to its lifecycle status: `completed` if check-out has passed, otherwise `confirmed`.
- `declined` makes no refund. The booking returns to its lifecycle status the same way.

A resolution note is always required, and the outcome is stored in `booking.disputeResolution`.

## 4. Wallet ledger and transaction types

| Admin `TransactionType` | Sign | Frontend `TransactionType`                     |
| ----------------------- | ---- | ---------------------------------------------- |
| `wallet_recharge`       | +    | `recharge`                                     |
| `booking_payment`       | +    |, (frontend wallet is prepaid-commission only) |
| `commission_deduction`  | −    | `commission_deduction`                         |
| `host_payout`           | −    | `payout`                                       |
| `booking_refund`        | −    |,                                              |
| `adjustment`            | ±    | `adjustment`                                   |

Ledger rules:

- A wallet balance is **always** the sum of its ledger entries. `Host.walletBalance` and `HostWallet.balance` are derived on every read.
- `balanceAfter` is the running balance in chronological order. The seed generator sorts entries by date before computing it.

### Payouts

`PayoutRequest.status` is one of `pending | approved | processed | rejected`.

- **Approve:** allowed from `pending` only. It checks that the balance covers the amount, writes a negative `host_payout` entry, and sets `processedAt`, `processedBy` and `transactionId`. Checks and writes run with no `await` between them, so a second approval fails cleanly.
- **Reject:** allowed from `pending` only. A reason is required and there is no ledger movement.
- **Account display:** shows `accountDetails.ccpRip ?? rib ?? phone` masked to the last 4 characters, or `,` when missing.

## 5. Onboarding field types

| Admin `OnboardingFieldType` | Frontend `OnboardingFieldType`          |
| --------------------------- | --------------------------------------- |
| `text`                      | `text`                                  |
| `textarea`                  | `textarea`                              |
| `number`                    | `number`                                |
| `select`                    | `select`                                |
| `multiselect`               | `multi-select`                          |
| `file`                      | `image-upload`                          |
| `boolean`                   | `toggle`                                |
| `radio`                     |, (render as `select`)                  |
| `location`                  |, (frontend uses its own wilaya picker) |
| `amenities`                 |, (render as `multi-select`)            |

## 6. Money and pricing constants (`lib/pricing.ts`)

All amounts are **integer DZD**. Display them with `formatDzd(amount, locale)` from `lib/utils/format.ts`, never with `toLocaleString(...) + " DZD"`.

| Constant              | Admin value                                                                              | Frontend value                                                                                      |
| --------------------- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Guest service fee     | `GUEST_SERVICE_FEE_PERCENT = 7` (% of base price, all verticals)                         | `SERVICE_FEE_RATES`: home/hotel 10 %, vehicle/experience 8 %, trip 0 % (of subtotal), **diverges** |
| Default commission    | `DEFAULT_COMMISSION_RATES = { individual: 12, agency: 15, hotel: 18, hostel: 10 }`       | same values in `lib/booking/config.ts`                                                              |
| Max manual recharge   | `MAX_RECHARGE_DZD = 10 000 000`                                                          |,                                                                                                   |
| Commission rate input | 0–100, at most 2 decimals (`isValidCommissionRate`)                                      |,                                                                                                   |
| Display discounts     | `DISCOUNTS = { weekly: 10, biweekly: 15, monthly: 25, group: 10 }` via `applyDiscount()` |,                                                                                                   |

The admin booking breakdown (`computeBookingAmounts`) is:

- `serviceFee = round(base × 7 %)`
- `total = base + serviceFee`
- `commission = round(base × rate %)`
- `hostPayout = base − commission`

## 7. Server-side validation (`lib/auth/run-action.ts`)

| Helper                           | Rule                                           |
| -------------------------------- | ---------------------------------------------- |
| `dzd(value, field, min, max)`    | Finite integer within `[min, max]`             |
| `rate(value, field)`             | Valid commission rate (see §6)                 |
| `reason(value)`                  | Trimmed string of at least 3 characters        |
| `requireAlso(actor, permission)` | Requires a second permission (used by exports) |

Business-rule failures throw `DomainError` (`lib/data/errors.ts`) and come back as `{ ok: false, code: "conflict" }`.

## 8. Audit trail and exports

- `store.audit` is read-only. The only writer is `store.appendAudit()`, called only by `lib/data/audit.logAudit()`. Entries are frozen.
- The actor and IP always come from the server session (`lib/auth/current-admin.ts`) or, for sign-in attempts, from request headers.
- CSV exports are built by `toCsv()` (`lib/utils/csv.ts`): every cell is quoted, quotes are doubled, and cells starting with `= + - @ TAB CR` get a `'` prefix to block formula injection.
- Exports run as server actions over the **full filtered dataset** and require `reports.export` plus the dataset's view permission. Each one is recorded as a `DATA_EXPORT` audit entry with `entityType: "export"`.
- Export actions: ledger, wallets, bookings, hosts, listings, audit log, KPI report.

## 9. Canonical routes

Each legacy route below is a server redirect (query string preserved, `lib/canonical-redirect.ts`) to its canonical route.

| Legacy route  | Canonical route                                                                                  |
| ------------- | ------------------------------------------------------------------------------------------------ |
| `/finance`    | `/payments` (tabs: `/payments/wallets`, `/transactions`, `/commissions`, `/payouts`, `/refunds`) |
| `/audit-log`  | `/settings/audit-log`                                                                            |
| `/team`       | `/settings/team`                                                                                 |
| `/onboarding` | `/settings/onboarding`                                                                           |
| `/providers`  | `/moderation/providers`                                                                          |
