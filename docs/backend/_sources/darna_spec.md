# DARNA — Host Types, Approval Modes, Trips, Search-Date Fix & Admin Financial/Analytics Expansion

## 0. How to work — read this before anything else

This spec changes core structural assumptions (host types, onboarding, search filtering, admin capabilities, money) that touch almost every part of the app already built. Do not treat these as 9 independent tickets to bang out in any order — **Section 1 requires you to map the real dependencies between all of them before writing code**, because several genuinely depend on others (you cannot build the simplified Solo interface correctly until the 4-way host-type model exists; you cannot build per-type commission rates until host types exist; you cannot build the admin onboarding-step editor until you know what steps actually exist per type).

**For every section below, before building it, open a browser (read that tool's own skill first) and research how a real, comparable platform handles that specific thing** — e.g. for hotel/hostel onboarding, look at how Booking.com or a hotel-extranet-style flow structures room/property setup; for the host-side balance/commission/payout model, look at how Airbnb or Uber describes host payouts and commission; for a "Trips" concept, look at how Airbnb's own "Experiences"/curated-trip features or a tour operator site present a multi-day packaged offering. Apply what you learn in DARNA's own identity, not as a literal copy. State briefly in your summary what you checked for each section.

Work through this in the order given in Section 10 (not the order I listed my points to you), confirm the app builds after each section, and wait for my go-ahead before continuing to the next.

---

## 1. Study the system first: dependency map (do this before writing any code)

Produce a short written dependency map (share it with me before starting Section 2) covering:

- Which existing systems the 4-way host-type expansion (Section 2) touches: the host-type selection screen, `Organization`/`Membership` data model, the Become-a-Host flow, Host Mode navigation, the public agency profile, admin Users/Listings tables, and anywhere `hostType` is currently read as a binary `individual`/`agency`.
- That the **Solo simplified interface (Section 4)** only applies to `hostType: "individual"` — Agency/Hotel/Hostel all keep (and in fact need an even richer version of) the full Host Mode interface already specced (Today/Bookings/Calendar/Listings/Messages + org-specific pages). Confirm you understand these are opposite directions of change for different host types, not a global simplification.
- That the **booking-approval setting (Section 3)** is onboarding-flow content that must exist for all 4 types before Section 6's admin step-editor can manage it as a step.
- That the **wallet/commission system (Section 8)** depends on host types existing (commission % is set per type) and depends on bookings/reservations already being created (deductions happen per booking) — this is additive to the existing `Reservation` flow, not a replacement.
- That the **admin analytics expansion (Section 7)** depends on the host-type dimension (Section 2) and the Trips/vertical data (Section 5) existing as real, queryable data before it can be broken down by them.
- That the **search date-overlap fix (Section 4 in my numbering — "search filter in the dates")** is independent of everything else here and can be fixed any time, first if convenient, since it's a scoped bug fix with no dependency on the host-type work.

---

## 2. Host types: add Hotel and Hostel alongside Individual and Agency

The host-type selection screen (shown when a user clicks "Become a host") currently offers 2 choices. Expand it to **4**: **Individual (Solo)**, **Agency/Business**, **Hotel**, **Hostel** — each a selectable card (icon + label + one-line description), single-select.

### 2.1 Data model
- Extend `hostType` to `"individual" | "agency" | "hotel" | "hostel"`.
- Hotel and Hostel both use the `Organization`/`Membership` model already built for Agency (they're businesses with potentially multiple staff/managers, same ownership structure) — add a `businessCategory: "agency" | "hotel" | "hostel"` field on `Organization` so the same underlying entity type carries the distinction, rather than building three parallel data models. State clearly in your summary that this is the approach you took (or your alternative, if you judge a different structure is cleaner — but justify it).
- A `Listing` created under a Hotel/Hostel organization needs a **room/unit sub-structure** that Agency-owned listings don't: a hotel property has one physical address but multiple bookable room types (e.g. "Standard Double," "Deluxe Suite") each with its own price, capacity, amenities, and photos, and potentially multiple physical units of each room type with their own availability. Model this as a `RoomType` (belongs to a parent `Listing`/property) with its own inventory count and availability, rather than forcing every room into being a separate top-level `Listing` — this keeps search results showing one card per hotel property (matching how real hotel booking sites work) while the detail page lets the guest pick a room type.
- Hostels follow the same `RoomType` pattern but typically add **per-bed booking** (a dorm room type where a guest books one bed, not the whole room) — model a `bookingUnit: "room" | "bed"` on `RoomType` so hostel dorm rooms can be booked per-bed while private hostel rooms and hotel rooms book as a whole unit.

### 2.2 Registration flows
- **Individual:** unchanged — straight into the simplified listing-creation flow (see Section 4).
- **Agency:** unchanged from the existing spec (business basics → details → team size → invites → review).
- **Hotel:** a registration flow following the same shape as Agency's but with hotel-specific fields: property name, star rating (optional self-declared), total room count (rough estimate), check-in/check-out time policy, hotel-wide amenities (pool, gym, breakfast included, parking, etc.), plus the same business details/contact/team-invite steps as Agency. On completion, creates an `Organization` with `businessCategory: "hotel"` and redirects into a Hotel Workspace.
- **Hostel:** same shape as Hotel's flow, with hostel-specific fields instead (dorm vs. private room mix, shared facilities list, age/guest-type policy if relevant, curfew/house-rules fields if you think they add realism — keep optional). Creates an `Organization` with `businessCategory: "hostel"` and redirects into a Hostel Workspace.

### 2.3 Hotel/Hostel Workspace (host-mode interface)
- Reuses the full Host Mode layout and Agency Workspace pattern already specced (Today/Bookings/Calendar/Listings/Messages/Team/Settings, org identity in the header) — this is **not** simplified like Solo (see Section 4), since hotel/hostel operators are professional users managing real inventory.
- **Listings page becomes a property+room manager:** instead of a flat list of listings, show the organization's properties, and within each property, its `RoomType`s with their own status/price/availability/quick-edit, since that's the real unit of inventory for these host types.
- **Calendar** needs to handle per-room-type (and per-bed, for hostels) availability rather than just per-listing — extend the calendar's per-listing filter to drill into per-room-type when the selected listing is a hotel/hostel property.
- Public-facing: a hotel/hostel property's listing card and detail page should visually signal "multiple room types available, from [lowest price]" rather than a single fixed price, and the detail page's booking widget becomes a room-type picker (select room type → then dates/guests → price) instead of the simple homes-style date-and-guest-count widget.

---

## 3. Booking approval mode — part of every onboarding flow

Add an explicit **"How do you want to handle booking requests?"** step to the onboarding flow for **all four host types** (Individual, Agency, Hotel, Hostel) — not just buried in the existing Phase-9-style "booking settings" step for Individual, make sure Agency/Hotel/Hostel registration includes it too, since it was previously only specced for the solo listing flow:

- Two options, single-select, clear plain-language explanation of each:
  - **Instant Book** — reservations are automatically approved the moment a guest completes payment, no host action needed.
  - **Request to Book** — the host (or, for Agency/Hotel/Hostel, any team member with permission) must manually approve or decline each request within a reasonable window before it's confirmed.
- Store this as a setting on the `User` (for Individual) or `Organization` (for Agency/Hotel/Hostel) — `bookingApprovalMode: "instant" | "request"` — as the **default** applied to new listings, with the ability to override it per-listing later if you want to support that level of granularity (state whether you did).
- When `"request"` mode is active, a new reservation enters a `pending` status and surfaces in the host/org's Today page and Bookings page with Accept/Decline actions (this connects to what's already specced there) rather than immediately becoming `confirmed`.

---

## 4. Solo (Individual) host interface — radically simplified

This applies **only** to `hostType: "individual"` — Agency/Hotel/Hostel keep the full-featured interface. The existing full Host Mode spec (Today/Bookings/Calendar/Listings/Messages as 5 separate sections) is **too complex for a first-time, non-technical solo host** and needs to collapse down.

### 4.1 Structure: maximum 2 pages
- **Page 1 — "My listings"** (effectively this is also their landing page after becoming a host): a simple list/grid of the listings they've created (likely just one, for most solo hosts), each card showing just what matters — a thumbnail, title, status (Live/Paused), price, and a plain-language upcoming-bookings count ("2 upcoming stays"). Tapping a listing opens a simple edit view (reusing the existing listing-creation step form, not a new interface) rather than a separate admin-style table. A clear, prominent "+ Add a new place" button.
- **Page 2 — "Bookings"**: a simple chronological list of their reservations — guest name/avatar, dates, status, total payout — with Accept/Decline buttons directly on the card if they're in Request-to-Book mode (Section 3). No separate Calendar page, no separate Today/Overview dashboard, no KPI cards, no analytics, no multi-view calendar — all of that complexity is removed for this host type.
- If a date/availability view is genuinely necessary (so they can see what's booked when), fold a **very simple month-grid mini-calendar** into the top of the Bookings page itself (read-only, just showing which days are booked) rather than giving it a dedicated page with Day/Week/Month/Year views — that full calendar system from the earlier spec stays exclusive to Agency/Hotel/Hostel.
- Messages stay accessible via the existing shared Messages system (same as guest-mode messages, filtered to host conversations) — reachable from the navbar/menu as already specced, not a third page, since it already exists as infrastructure and doesn't need solo-specific simplification.

### 4.2 Tone and content
- Plain language throughout — no admin-style jargon ("Occupancy rate," "KPI," "Aggregate metrics"). Use "You have 2 bookings this week" instead of a stat card grid.
- No settings sprawl — fold the few settings a solo host genuinely needs (payout method, booking approval mode toggle) into a single simple section reachable from "My listings," not a separate dense settings page mirroring the guest account settings structure.
- Onboarding tooltips/empty-state guidance are welcome here specifically (e.g. first-time empty state on "My listings": "Ready to host? Create your first listing in a few minutes." with a friendly illustration) since this interface is explicitly for a beginner audience.

### 4.3 Navigation
- Solo hosts get a minimal 2-item host-mode nav (My listings / Bookings) instead of the 5-item Today/Bookings/Calendar/Listings/Messages bar — confirm the "Switch to hosting" navbar entry correctly routes a Solo host into this 2-page interface, and routes Agency/Hotel/Hostel users into the full interface, based on their `hostType`/`businessCategory`.

---

## 5. Agency-exclusive "Trips" feature

A new content type, **exclusive to Agency-type hosts** (not Hotel, Hostel, or Individual) — a curated, multi-day packaged trip (e.g. "3-Day Sahara Desert Expedition") that an agency can publish, which then becomes bookable on the platform.

### 5.1 Data model
- New `Trip` type: title, cover photo + gallery, multi-day itinerary (reuse the structure already established for the Itinerary-style content elsewhere if applicable, or a simple day-by-day list of stops/activities), duration, group size limits, per-person price, what's included/excluded, meeting point/location, cancellation policy, `organizationId` (must belong to an Agency — enforce this at creation, Hotel/Hostel orgs should not see this option).

### 5.2 Creating a Trip (Agency Workspace only)
- Add a prominent **"+ Add a trip"** button inside the Agency Workspace (near the Listings page, or as its own "Trips" section within the agency nav — your call, state which) that launches a trip-creation flow: basics (title, description, cover photo) → itinerary builder (add day-by-day stops, each with a name, short blurb, optional time) → logistics (duration, group size, meeting point, price) → inclusions/exclusions → cancellation policy → review & publish. Follow the same full-page step pattern already established for listing creation.
- Published trips appear in the Agency Workspace's own Trips list (view/edit/pause/delete) and simultaneously become live on the public platform.

### 5.3 Public-facing: Trips as a platform vertical
- Add **"Trips"** as a 4th segment in the homepage category switcher, alongside Homes / Experiences / Vehicles (the pill shown in the hero — add a 4th segment, matching the same pill styling, with a fitting icon).
- A Trips tab shows a feed/grid of published trips (sourced only from Agency organizations), each card showing cover photo, title, duration, agency name, starting price, rating if reviews exist.
- A trip detail page follows the same general page shape as a listing detail page (gallery, description, itinerary breakdown instead of amenities, host/agency card, booking widget) but reflects trip-specific content (day-by-day itinerary display, group size + per-person pricing instead of nightly rate + guest counter).
- Guests can book a Trip the same way they book a listing — creates a reservation against the `Trip`, respects the agency's booking-approval mode (Section 3), appears in both the guest's Trips/reservations page and the agency's Bookings page.

---

## 6. Search filter: date-range overlap logic (bug fix)

Currently, searching with a date range that only **partially overlaps** a listing's available range (your example: listing available Oct 2–10, guest searches Oct 3–11) doesn't correctly surface that listing. Fix the filtering logic in `lib/data/listings.ts` (and the equivalent for Hotel/Hostel room-type availability, and Vehicles/Trips) to use genuine **date-range overlap** matching rather than exact-containment matching: a listing should appear in results whenever its availability window and the searched window intersect at all, not only when the listing fully covers the exact requested range.

- **Important nuance to handle correctly, not just visually:** if a listing is only partially available within the searched range (your example: available Oct 2–10 but searched Oct 3–11, so Oct 10–11 isn't actually available), it should still appear in results (per your explicit example), but the listing card and detail page must clearly communicate the real availability — e.g. a small badge/note "Available Oct 3–10 within your dates" — rather than silently implying the full requested range is bookable. When the guest actually attempts to book, the date picker in the booking widget should only let them select within the listing's true available sub-range, with a clear message if their originally-searched range doesn't fully fit. Don't let this become a silent overbooking bug — the fix is about **surfacing** partially-matching results, not about **allowing bookings** outside real availability.
- Apply the same overlap logic consistently across Homes, Vehicles, Experiences, Trips, and Hotel/Hostel room-type search.

---

## 7. Admin: dynamic control over the Become-a-Host step flow, per host type

Give the admin panel real control over the onboarding flow content for each of the 4 host types, rather than the step sequence being hardcoded only in frontend code.

### 7.1 Data model
- A `OnboardingStepConfig` type per `hostType`: an ordered list of steps, each with an id, title, a list of fields (field id, label per locale, field type — text/number/select/multi-select/image-upload/toggle, required flag, options list if applicable), and an active/inactive flag.
- Seed this from the actual step sequences already specced for each of the 4 types (Individual's 12 steps, Agency's 5 steps, Hotel's and Hostel's equivalents) so the admin starts with a real, working baseline rather than an empty config.

### 7.2 Admin UI (`admin/onboarding-flows` or similar, new section in the sidebar)
- Tabs or a selector for each of the 4 host types.
- Per type: a reorderable list of its steps (drag-to-reorder, or up/down controls), each expandable to show/edit its fields — add a new field, remove a field, reorder fields within a step, edit a field's label/type/required status, add/remove entire steps.
- The actual Become-a-Host / Agency-Registration / Hotel-Registration / Hostel-Registration flows in the live app must **read from this config** to render their steps and fields dynamically, rather than being hardcoded — this is what makes the admin control real rather than cosmetic. This is a meaningful architecture decision: build the onboarding flows as a config-driven renderer (step config → rendered form) rather than one-off hardcoded step components, so admin edits actually take effect.
- Removing a step/field that's core to a working flow (e.g. removing all steps) should be guarded with a confirmation (using the premium dialog system already built) and a warning if it would leave the flow non-functional (e.g. zero steps, or a required data field like "price" removed entirely).

---

## 8. Admin: full-depth analytics & KPIs, broken down by host type and vertical

Substantially expand the admin Dashboard and Reports sections (already specced) to cross-cut by the dimensions that now exist:

- **By host type:** every major KPI (revenue, bookings, active listings/properties, average booking value, growth rate) available filtered to Individual / Agency / Hotel / Hostel, plus a comparison view showing all 4 side by side (e.g. a grouped bar chart comparing revenue-per-host-type).
- **By vertical:** the same KPIs filterable/comparable across Homes / Vehicles / Experiences / Trips.
- **Cross-tab:** at least one view combining both dimensions meaningfully — e.g. "Revenue by host type × vertical" as a matrix/heatmap (which combinations even exist — Trips only ever belongs to Agency, Hotel/Hostel only ever produce Homes-like bookings — so this matrix will legitimately have empty cells, render those as "—" rather than 0, since 0 would misleadingly imply there were zero but possible bookings).
- Follow the `dataviz` skill for all of this — read it before building any chart here, and apply its color/accessibility/form guidance on top of the Earthy Minimal palette's established chart conventions (accent → secondary → primary series order).
- Specific new KPIs to add: total platform commission earned (ties into Section 9), average commission rate by host type, host growth rate by type (new hosts of each type per period), Trips-specific metrics (bookings, revenue, average group size), Hotel/Hostel-specific metrics (average room occupancy, average nightly rate).
- This is a genuinely large dashboard — organize it with clear section headers/tabs (Overview / By Host Type / By Vertical / Financial) rather than one overwhelming wall of charts, since information density without organization defeats the purpose of "incredible analytics."

---

## 9. Admin: host wallet, manual recharge, and per-type commission

A real (mocked) financial ledger system for hosts.

### 9.1 Data model
- `Wallet`: belongs to a `User` (Individual) or `Organization` (Agency/Hotel/Hostel), holds a `balance`, currency (DZD, matching the platform's existing currency).
- `Transaction`: belongs to a `Wallet`, has `type` (`recharge` / `commission_deduction` / `payout` — add others if they round this out sensibly), `amount` (signed, or a separate direction field), `relatedBookingId` (nullable, set for commission deductions), `adminUserId` (nullable, set for manual recharges — who performed it), `note`, `timestamp`. This is an append-only ledger — balance is derived from summing transactions, not just a mutable number, so there's a real audit trail.

### 9.2 Admin: manual recharge (`admin/users` or `admin/wallets`, extend the user/org detail view)
- On a host's (or organization's) detail view in the admin panel, add a **"Recharge balance"** action: admin enters an amount (e.g. 10,000,000 DZD) and an optional note (e.g. "Bank transfer received, ref #1234"), confirms via the premium dialog system, which creates a `recharge` transaction and increases the wallet balance by that amount. This models the real-world flow you described: the host pays the platform offline, the admin credits their in-platform balance manually.
- Show the host's current balance prominently on their admin detail view, plus a transaction history table (type, amount, date, related booking if applicable, admin who performed it if a recharge).

### 9.3 Commission rate per host type
- Extend Platform Settings (already specced) so the single commission % becomes **4 separate rates**, one per host type (Individual/Agency/Hotel/Hostel) — admin can set/edit each independently, since different host types plausibly warrant different take rates.
- On every confirmed booking, create a `commission_deduction` transaction against the relevant host's/organization's wallet for `booking total × that host type's commission rate`, reducing their balance — this should happen automatically as part of the mock booking-confirmation flow (`lib/data/reservations.ts`), not as a separate manual admin step.
- Surface the host's **current balance** somewhere relevant on their own side too — the Host Mode / Agency/Hotel/Hostel Workspace settings or Today page should show their wallet balance and recent transactions (read-only from their side — they can't recharge themselves, only the admin can), so this isn't an admin-only black box.
- If a host's balance goes negative (commission deductions exceed their recharged balance), surface this clearly to both the host (a visible warning banner) and the admin (a flagged state in the Users/Organizations table, e.g. in the "action needed" panel on the admin dashboard) — don't silently let balances go negative without visibility, since that's the realistic failure mode of this model worth designing for even without real payment enforcement.

---

## 10. Execution order

1. Research pass per section (Section 0) + dependency map (Section 1) — share with me first.
2. Search date-overlap fix (Section 6) — fully independent, do it first to get a quick clean win.
3. Host-type expansion: data model + 4-way selection screen + Hotel/Hostel registration flows (Section 2).
4. Booking-approval-mode step added to all 4 onboarding flows (Section 3).
5. Solo simplified 2-page interface (Section 4) — now that all 4 types exist, scope the simplification correctly to Individual only.
6. Agency Trips feature, including the homepage 4th vertical tab (Section 5).
7. Admin dynamic onboarding-step editor (Section 7) — now that real step content exists for all 4 types to seed it from.
8. Admin wallet/recharge/commission system (Section 9).
9. Admin analytics expansion (Section 8) — last, since it depends on host types, Trips, and the wallet/commission data all existing to report on.

Pause for my go-ahead after each numbered step above.

---

## Rules
- Don't silently simplify or expand scope beyond what's specified — if Section 4's "2 pages max" genuinely can't fit something essential (e.g. you find Solo hosts truly need a 3rd page for something), stop and ask rather than quietly building a 3rd page or quietly cutting something essential to force-fit 2.
- Every new string, across every new host type's flows and the new admin sections, goes through `messages/en.json`/`fr.json`/`ar.json`, fully RTL-correct.
- Every new money-related number (wallet balances, commission amounts) is formatted consistently with the DZD currency convention already used elsewhere in the app.
- Report back after each step: what you researched and where, every product decision you made that wasn't fully specified, and confirmation the app builds and runs cleanly end-to-end on mock data.
</USER_REQUEST>
<ADDITIONAL_METADATA>
The current local time is: 2026-10-12T19:31:49+01:00.

The user's current state is as follows:
Active Document: c:\Users\OASIS\Documents\skills\senior-frontend\SKILL.md (LANGUAGE_MARKDOWN)
Cursor is on line: 496
Other open documents:
- c:\Users\OASIS\Documents\darna\frontend\components\ToastContainerBar.tsx (LANGUAGE_TSX)
- c:\Users\OASIS\Documents\darna\frontend\app\[locale]\host\layout.tsx (LANGUAGE_TSX)
- c:\Users\OASIS\Documents\darna\frontend\middleware.ts (LANGUAGE_TYPESCRIPT)
- c:\Users\OASIS\Documents\darna\frontend\lib\data\auth.ts (LANGUAGE_TYPESCRIPT)
- c:\Users\OASIS\Documents\darna\frontend\app\api\host\complete\route.ts (LANGUAGE_TYPESCRIPT)
No browser pages are currently open.

The user has mentioned some items in the form @[ITEM]. Here is extra information about the items that were mentioned by the user, in the order that they appear:

@[c:\Users\OASIS\Documents\skills\senior-frontend\SKILL.md:L1-L495] is a [Text Block]:
---
name: senior-frontend
description: Frontend development skill for React, Next.js, TypeScript, and Tailwind CSS applications. Use when building React components, optimizing Next.js performance, analyzing bundle sizes, scaffolding frontend projects, implementing accessibility, or reviewing frontend code quality.
risk: safe
source: https://github.com/alirezarezvani/claude-skills
date_added: "2026-03-07"
---

# Senior Frontend

Frontend development patterns, performance optimization, and automation tools for React/Next.js applications.

## When to Use
- Use when scaffolding a new React or Next.js project with TypeScript and Tailwind CSS.
- Use when generating new components or custom hooks.
- Use when analyzing and optimizing bundle sizes for frontend applications.
- Use to implement or review advanced React patterns like Compound Components or Render Props.
- Use to ensure accessibility compliance and implement robust testing strategies.

## Table of Contents

- [Project Scaffolding](#project-scaffolding)
- [Component Generation](#component-generation)
- [Bundle Analysis](#bundle-analysis)
- [React Patterns](#react-patterns)
- [Next.js Optimization](#nextjs-optimization)
- [Accessibility and Testing](#accessibility-and-testing)

---

## Project Scaffolding

Generate a new Next.js or React project with TypeScript, Tailwind CSS, and best practice configurations.

### Workflow: Create New Frontend Project

1. Run the scaffolder with your project name and template:

   ```bash
   python scripts/frontend_scaffolder.py my-app --template nextjs
   ```

2. Add optional features (auth, api, forms, testing, storybook):

   ```bash
   python scripts/frontend_scaffolder.py dashboard --template nextjs --features auth,api
   ```

3. Navigate to the project and install dependencies:

   ```bash
   cd my-app && npm install
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

### Scaffolder Options

| Option               | Description                                       |
| -------------------- | ------------------------------------------------- |
| `--template nextjs`  | Next.js 14+ with App Router and Server Components |
| `--template react`   | React + Vite with TypeScript                      |
| `--features auth`    | Add NextAuth.js authentication                    |
| `--features api`     | Add React Query + API client                      |
| `--features forms`   | Add React Hook Form + Zod validation              |
| `--features testing` | Add Vitest + Testing Library                      |
| `--dry-run`          | Preview files without creating them               |

### Generated Structure (Next.js)

```
my-app/
├── app/
│   ├── layout.tsx        # Root layout with fonts
│   ├── page.tsx          # Home page
│   ├── globals.css       # Tailwind + CSS variables
│   └── api/health/route.ts
├── components/
│   ├── ui/               # Button, Input, Card
│   └── layout/           # Header, Footer, Sidebar
├── hooks/                # useDebounce, useLocalStorage
├── lib/                  # utils (cn), constants
├── types/                # TypeScript interfaces
├── tailwind.config.ts
├── next.config.js
└── package.json
```

---

## Component Generation

Generate React components with TypeScript, tests, and Storybook stories.

### Workflow: Create a New Component

1. Generate a client component:

   ```bash
   python scripts/component_generator.py Button --dir src/components/ui
   ```

2. Generate a server component:

   ```bash
   python scripts/component_generator.py ProductCard --type server
   ```

3. Generate with test and story files:

   ```bash
   python scripts/component_generator.py UserProfile --with-test --with-story
   ```

4. Generate a custom hook:
   ```bash
   python scripts/component_generator.py FormValidation --type hook
   ```

### Generator Options

| Option          | Description                                  |
| --------------- | -------------------------------------------- |
| `--type client` | Client component with 'use client' (default) |
| `--type server` | Async server component                       |
| `--type hook`   | Custom React hook                            |
| `--with-test`   | Include test file                            |
| `--with-story`  | Include Storybook story                      |
| `--flat`        | Create in output dir without subdirectory    |
| `--dry-run`     | Preview without creating files               |

### Generated Component Example

```tsx
"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface ButtonProps {
  className?: string;
  children?: React.ReactNode;
}

export function Button({ className, children }: ButtonProps) {
  return <div className={cn("", className)}>{children}</div>;
}
```

---

## Bundle Analysis

Analyze package.json and project structure for bundle optimization opportunities.

### Workflow: Optimize Bundle Size

1. Run the analyzer on your project:

   ```bash
   python scripts/bundle_analyzer.py /path/to/project
   ```

2. Review the health score and issues:

   ```
   Bundle Health Score: 75/100 (C)

   HEAVY DEPENDENCIES:
     moment (290KB)
       Alternative: date-fns (12KB) or dayjs (2KB)

     lodash (71KB)
       Alternative: lodash-es with tree-shaking
   ```

3. Apply the recommended fixes by replacing heavy dependencies.

4. Re-run with verbose mode to check import patterns:
   ```bash
   python scripts/bundle_analyzer.py . --verbose
   ```

### Bundle Score Interpretation

| Score  | Grade | Action                         |
| ------ | ----- | ------------------------------ |
| 90-100 | A     | Bundle is well-optimized       |
| 80-89  | B     | Minor optimizations available  |
| 70-79  | C     | Replace heavy dependencies     |
| 60-69  | D     | Multiple issues need attention |
| 0-59   | F     | Critical bundle size problems  |

### Heavy Dependencies Detected

The analyzer identifies these common heavy packages:

| Package       | Size  | Alternative                    |
| ------------- | ----- | ------------------------------ |
| moment        | 290KB | date-fns (12KB) or dayjs (2KB) |
| lodash        | 71KB  | lodash-es with tree-shaking    |
| axios         | 14KB  | Native fetch or ky (3KB)       |
| jquery        | 87KB  | Native DOM APIs                |
| @mui/material | Large | shadcn/ui or Radix UI          |

---

## React Patterns

Reference: `references/react_patterns.md`

### Compound Components

Share state between related components:

```tsx
const Tabs = ({ children }) => {
  const [active, setActive] = useState(0);
  return (
    <TabsContext.Provider value={{ active, setActive }}>
      {children}
    </TabsContext.Provider>
  );
};

Tabs.List = TabList;
Tabs.Panel = TabPanel;

// Usage
<Tabs>
  <Tabs.List>
    <Tabs.Tab>One</Tabs.Tab>
    <Tabs.Tab>Two</Tabs.Tab>
  </Tabs.List>
  <Tabs.Panel>Content 1</Tabs.Panel>
  <Tabs.Panel>Content 2</Tabs.Panel>
</Tabs>;
```

### Custom Hooks

Extract reusable logic:

```tsx
function useDebounce<T>(value: T, delay = 500): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

// Usage
const debouncedSearch = useDebounce(searchTerm, 300);
```

### Render Props

Share rendering logic:

```tsx
function DataFetcher({ url, render }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(url)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [url]);

  return render({ data, loading });
}

// Usage
<DataFetcher
  url="/api/users"
  render={({ data, loading }) =>
    loading ? <Spinner /> : <UserList users={data} />
  }
/>;
```

---

## Next.js Optimization

Reference: `references/nextjs_optimization_guide.md`

### Server vs Client Components

Use Server Components by default. Add 'use client' only when you need:

- Event handlers (onClick, onChange)
- State (useState, useReducer)
- Effects (useEffect)
- Browser APIs

```tsx
// Server Component (default) - no 'use client'
async function ProductPage({ params }) {
  const product = await getProduct(params.id); // Server-side fetch

  return (
    <div>
      <h1>{product.name}</h1>
      <AddToCartButton productId={product.id} /> {/* Client component */}
    </div>
  );
}

// Client Component
("use client");
function AddToCartButton({ productId }) {
  const [adding, setAdding] = useState(false);
  return <button onClick={() => addToCart(productId)}>Add</button>;
}
```

### Image Optimization

```tsx
import Image from 'next/image';

// Above the fold - load immediately
<Image
  src="/hero.jpg"
  alt="Hero"
  width={1200}
  height={600}
  priority
/>

// Responsive image with fill
<div className="relative aspect-video">
  <Image
    src="/product.jpg"
    alt="Product"
    fill
    sizes="(max-width: 768px) 100vw, 50vw"
    className="object-cover"
  />
</div>
```

### Data Fetching Patterns

```tsx
// Parallel fetching
async function Dashboard() {
  const [user, stats] = await Promise.all([getUser(), getStats()]);
  return <div>...</div>;
}

// Streaming with Suspense
async function ProductPage({ params }) {
  return (
    <div>
      <ProductDetails id={params.id} />
      <Suspense fallback={<ReviewsSkeleton />}>
        <Reviews productId={params.id} />
      </Suspense>
    </div>
  );
}
```

---

## Accessibility and Testing

Reference: `references/frontend_best_practices.md`

### Accessibility Checklist

1. **Semantic HTML**: Use proper elements (`<button>`, `<nav>`, `<main>`)
2. **Keyboard Navigation**: All interactive elements focusable
3. **ARIA Labels**: Provide labels for icons and complex widgets
4. **Color Contrast**: Minimum 4.5:1 for normal text
5. **Focus Indicators**: Visible focus states

```tsx
// Accessible button
<button
  type="button"
  aria-label="Close dialog"
  onClick={onClose}
  className="focus-visible:ring-2 focus-visible:ring-blue-500"
>
  <XIcon aria-hidden="true" />
</button>

// Skip link for keyboard users
<a href="#main-content" className="sr-only focus:not-sr-only">
  Skip to main content
</a>
```

### Testing Strategy

```tsx
// Component test with React Testing Library
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

test("button triggers action on click", async () => {
  const onClick = vi.fn();
  render(<Button onClick={onClick}>Click me</Button>);

  await userEvent.click(screen.getByRole("button"));
  expect(onClick).toHaveBeenCalledTimes(1);
});

// Test accessibility
test("dialog is accessible", async () => {
  render(<Dialog open={true} title="Confirm" />);

  expect(screen.getByRole("dialog")).toBeInTheDocument();
  expect(screen.getByRole("dialog")).toHaveAttribute("aria-labelledby");
});
```

---

## Quick Reference

### Common Next.js Config

```js
// next.config.js
const nextConfig = {
  images: {
    remotePatterns: [{ hostname: "cdn.example.com" }],
    formats: ["image/avif", "image/webp"],
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "@heroicons/react"],
  },
};
```

### Tailwind CSS Utilities

```tsx
// Conditional classes with cn()
import { cn } from "@/lib/utils";

<button
  className={cn(
    "px-4 py-2 rounded",
    variant === "primary" && "bg-blue-500 text-white",
    disabled && "opacity-50 cursor-not-allowed",
  )}
/>;
```

### TypeScript Patterns

```tsx
// Props with children
interface CardProps {
  className?: string;
  children: React.ReactNode;
}

// Generic component
interface ListProps<T> {
  items: T[];
  renderItem: (item: T) => React.ReactNode;
}

function List<T>({ items, renderItem }: ListProps<T>) {
  return <ul>{items.map(renderItem)}</ul>;
}
```

---

## Resources

- React Patterns: `references/react_patterns.md`
- Next.js Optimization: `references/nextjs_optimization_guide.md`
- Best Practices: `references/frontend_best_practices.md`

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
</ADDITIONAL_METADATA>