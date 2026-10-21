# DARNA Admin Console

A standalone, data-dense, accessible administration and marketplace moderation platform for the **DARNA** hospitality network in Algeria.

---

## 1. System Overview & Architecture

The DARNA repository is organized as a decoupled multi-app architecture:

```
darna/
├── frontend/   ← Public guest marketplace and host management portal (Port 3000)
└── admin/      ← Standalone administrative control center and moderation console (Port 3001)
```

### Technology Stack
- **Framework:** Next.js 14.2.35 (App Router)
- **Runtime:** React 18.3.1 (SSR + Client Components with strict boundary segregation)
- **Styling:** Tailwind CSS 3.3.1 using DARNA's Earthy Minimal palette:
  - Primary: `#2E3A2F` (Deep Forest)
  - Secondary: `#6B7F5B` (Sage Green)
  - Tertiary: `#D9C9B2` (Warm Sand)
  - Accent: `#C96F4F` (Terracotta)
  - Background: `#F8F6EE` (Warm Cream)
- **Typography:** DM Sans (Latin) + IBM Plex Sans Arabic (Arabic)
- **Icons:** Lucide React (Chrome UI) + Custom DARNA Brand SVGs (no emojis)
- **Internationalization:** `next-intl` (English `en`, French `fr`, Arabic `ar` with full RTL layout)
- **Maps:** Leaflet & React-Leaflet with custom marker clustering

---

## 2. Ports & Local Execution

| Service | Port | Dev Command | Description |
|---|---|---|---|
| **Public Frontend** | `3000` | `npm run dev` | Guest marketplace, booking engine, host extranet |
| **Admin Console** | `3001` | `npm run dev` (`next dev -p 3001`) | Central moderation, finance ledger, staff control |

### Running the Admin Console
```bash
cd admin
npm install
npm run dev
```
Open [http://localhost:3001](http://localhost:3001) in your browser.

---

## 3. Security, Authentication & Role Matrix

### Signed Cookie Session
- **Mechanism:** Signed JWT via `jose` stored in an `httpOnly`, `secure` (production), `sameSite=strict` cookie (`darna_admin_session`).
- **No Plaintext Cookies:** User IDs and permission claims are signed and cryptographically validated on every request.
- **Middleware Guard:** `middleware.ts` intercepts all requests to `/[locale]/(panel)/*`, verifies the session token, and redirects unauthenticated visits to `/[locale]/login?returnTo=...`.

### Role-Based Access Control (RBAC)
Configured in `lib/permissions.ts`. Every mutation function in `lib/data/*` executes `assertCan(session, permission)` on the server side:

| Role | Permissions & Responsibilities | Seed Account |
|---|---|---|
| `super_admin` | Unrestricted full access across all modules, configuration, staff, and financial overrides | `admin@darna.dz` / `DarnaAdmin2026!` |
| `moderator` | Host & listing approvals, review moderation, document inspection, dispute resolution | `moderator@darna.dz` / `DarnaMod2026!` |
| `finance` | Escrow wallets, CCP/bank top-ups, transaction ledgers, commission tiers, payout approvals | `finance@darna.dz` / `DarnaFinance2026!` |
| `support` | Read/write access to guests, bookings, dispute arbitration, and messaging logs | `support@darna.dz` / `DarnaSupport2026!` |
| `analyst` | Read-only analytics dashboards, reports generator, and CSV exports | `analyst@darna.dz` / `DarnaAnalyst2026!` |

---

## 4. Strict Seam Data Layer Rule

The application strictly separates presentation components from mock data sources:

```
components/ ────► lib/data/* ────► lib/mock-data/* (internal seed store)
                     ▲
            Single Data Seam
         (assertCan + query logic)
```

- **Seam Rule:** Components NEVER import `lib/mock-data/*` directly.
- **ESLint Enforcement:** ESLint `no-restricted-imports` forbids importing from `lib/mock-data/*` anywhere outside `lib/data/*`.
- **Query Contracts:** Every read operation takes a typed query (`{ filters, sort, page, pageSize }`) and returns `{ rows, total, facets }`.
- **Supabase Ready:** Every function in `lib/data/*` is tagged with `// TODO: replace with Supabase query` for seamless backend substitution.

---

## 5. Financial Treasury & Strict Ledger Rule

### Ledger Rule
**Host wallet balances are derived dynamically from the sum of transactions only.** No code path directly mutates a wallet balance.

1. **Credits:** Admin CCP/bank top-ups create an immutable `credit` transaction.
2. **Debits:** Platform fee commissions, withdrawal payouts, and dispute adjustments append corresponding ledger entries.
3. **Integrity:** `wallet.balance` is verified as:
   $$\text{Balance} = \sum \text{Credits} - \sum \text{Debits}$$

---

## 6. Host Onboarding Configurator Contract

The onboarding editor (`/onboarding`) manages dynamic step sequences for all 4 host types:
1. `individual` (Solo Host) — **Strictly capped at ≤ 2 steps**
2. `agency` (Tourism Agency)
3. `hotel` (Hotel & Palace)
4. `hostel` (Youth Hostel)

### JSON Contract (`OnboardingConfig`)
The configurator outputs a versioned JSON contract exported via `lib/types`:

```json
{
  "version": "2.4.0",
  "publishedAt": "2026-10-20T08:00:00Z",
  "hostType": "individual",
  "approvalMode": "instant",
  "maxSteps": 2,
  "steps": [
    {
      "id": "step_1",
      "order": 1,
      "title": {
        "en": "Property Basics",
        "fr": "Informations de Base",
        "ar": "المعلومات الأساسية"
      },
      "isRequired": true,
      "fields": [
        {
          "name": "title",
          "type": "text",
          "required": true
        },
        {
          "name": "wilayaCode",
          "type": "select",
          "required": true
        }
      ]
    },
    {
      "id": "step_2",
      "order": 2,
      "title": {
        "en": "Pricing & Photos",
        "fr": "Tarifs et Photos",
        "ar": "الأسعار والصور"
      },
      "isRequired": true,
      "fields": [
        {
          "name": "priceDzd",
          "type": "number",
          "required": true
        }
      ]
    }
  ]
}
```

> **Frontend Follow-Up:** The public `frontend/components/host/BecomeHostFlow.tsx` can consume this exact JSON contract to dynamically render host onboarding forms based on administrative publication.

---

## 7. Internationalization & Algerian Formatting Standards

- **Locales:** English (`en`), French (`fr`), Arabic (`ar`).
- **Complete RTL Support:** Arabic renders with `dir="rtl"`, mirrored flexbox/grid alignments, logical padding (`ps-`, `pe-`, `ms-`, `me-`), and reverse chevron animations.
- **Algerian Numbering Standard:** In compliance with Algerian banking and commerce conventions, Arabic (`ar`) amounts and dates use Latin numerals (`latn`) via `Intl.NumberFormat("ar-DZ-u-nu-latn")`. Centralized in `lib/utils/format.ts`.
- **Wilaya Reference:** Fully maps all 69 Algerian Wilayas (post-2021 territorial reform) with bilingual Arabic/French/English names and geographical regions (North, High Plateaus, South).

---

## 8. Quality Assurance & Verification Scripts

### Parity Check
```bash
npm run check:i18n
```
Verifies 100% key-for-key parity across `messages/en.json`, `messages/fr.json`, and `messages/ar.json`. Exits non-zero on missing or orphaned keys.

### Static Analysis
```bash
npx tsc --noEmit
npm run lint
```

### End-to-End Testing (Playwright)
```bash
npx playwright test
```
The test suite (`tests/e2e/admin.spec.ts`) validates:
1. Protected route redirects to `/login` with `returnTo`
2. Authentication failure / success flows
3. Hosts table filtering by category, search, and wilaya
4. Approvals moderation inbox action with undo toast
5. Financial Treasury wallet credit modal and cancelation
6. Arabic language switch with `dir="rtl"` layout verification

---

## 9. Shared-State Limitation (Important Note)

Because `frontend` and `admin` currently run as separate local development apps backed by deterministic in-memory mock datasets, **an approval or wallet recharge performed in the Admin Console will not automatically reflect in the public Frontend app.**

This is the expected behavior for independent mock-seeded architectures. Both applications adhere to strictly typed data seam boundaries (`lib/data/*`), allowing both projects to point to a shared PostgreSQL / Supabase backend without breaking UI contracts.
