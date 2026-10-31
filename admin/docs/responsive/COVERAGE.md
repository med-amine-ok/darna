# DARNA Admin, Responsive Coverage Matrix

Legend:

- `✔`: Passed all automated and interactive checks (no horizontal overflow, touch target ≥ 44px, spacing scale compliant, form input ≥ 16px, proper RTL mirroring, drawer/sheet functional).
- Viewports:
  - Small phones: 320×568, 360×640
  - Common phones: 375×667, 390×844, 412×915, 430×932
  - Phone landscape: 667×375, 844×390
  - Tablets: 768×1024, 820×1180, 1024×768
  - Desktop: 1280×720, 1536×864

| Route                              | Viewport Group                                | Locales (FR/EN/AR) | Tested States                                                     | Status  |
| ---------------------------------- | --------------------------------------------- | ------------------ | ----------------------------------------------------------------- | ------- |
| `/` (Tableau de bord)              | Small / Common / Landscape / Tablet / Desktop | fr / en / ar       | Default, KPI cards, Pending listings, Charts stacked              | ✔ Fixed |
| `/login`                           | Small / Common / Landscape / Tablet / Desktop | fr / en / ar       | Form centered, 16px inputs, keyboard safe, error alert            | ✔ Fixed |
| `/users`                           | Small / Common / Landscape / Tablet / Desktop | fr / en / ar       | Card list (<768), Table (≥768), Filters, Selection, Actions       | ✔ Fixed |
| `/users/guests`                    | Small / Common / Landscape / Tablet / Desktop | fr / en / ar       | Card list, Travel history, Status filters, Modals                 | ✔ Fixed |
| `/stays`                           | Small / Common / Landscape / Tablet / Desktop | fr / en / ar       | Card mode, SplitView sheet (<1024), Detail tabs, Filters drawer   | ✔ Fixed |
| `/stays/new` (Wizard 6 steps)      | Small / Common / Landscape / Tablet / Desktop | fr / en / ar       | Step 1–6, compact progress header, single column, sticky actions  | ✔ Fixed |
| `/stays/[id]`                      | Small / Common / Landscape / Tablet / Desktop | fr / en / ar       | Detail view, gallery carousel, specs 2-col grid, action bar       | ✔ Fixed |
| `/stays/[id]/review` (Review flow) | Small / Common / Landscape / Tablet / Desktop | fr / en / ar       | Decision sheet, checklist 44px eye button, document modal         | ✔ Fixed |
| `/stays/categories`                | Small / Common / Landscape / Tablet / Desktop | fr / en / ar       | Manager grid, add modal, touch action buttons                     | ✔ Fixed |
| `/stays/amenities`                 | Small / Common / Landscape / Tablet / Desktop | fr / en / ar       | Category filter, amenity cards, creation drawer                   | ✔ Fixed |
| `/stays/change-requests`           | Small / Common / Landscape / Tablet / Desktop | fr / en / ar       | Diff cards, approve/reject touch actions                          | ✔ Fixed |
| `/experiences`                     | Small / Common / Landscape / Tablet / Desktop | fr / en / ar       | Card list, collapsed header actions, filter drawer, preview sheet | ✔ Fixed |
| `/experiences/new`                 | Small / Common / Landscape / Tablet / Desktop | fr / en / ar       | Multi-step wizard, single column, sticky footer                   | ✔ Fixed |
| `/experiences/categories`          | Small / Common / Landscape / Tablet / Desktop | fr / en / ar       | Manager grid, add/edit dialog                                     | ✔ Fixed |
| `/trips`                           | Small / Common / Landscape / Tablet / Desktop | fr / en / ar       | Card mode, status badges, detail sheet, search                    | ✔ Fixed |
| `/trips/new`                       | Small / Common / Landscape / Tablet / Desktop | fr / en / ar       | Itinerary builder, 1-col form, date pickers                       | ✔ Fixed |
| `/trips/booking-requests`          | Small / Common / Landscape / Tablet / Desktop | fr / en / ar       | Request cards, approve/reject 44px buttons                        | ✔ Fixed |
| `/trips/categories`                | Small / Common / Landscape / Tablet / Desktop | fr / en / ar       | Category manager grid, icons, dialog                              | ✔ Fixed |
| `/cars`                            | Small / Common / Landscape / Tablet / Desktop | fr / en / ar       | Card list, specs chips, pricing pills, filter drawer              | ✔ Fixed |
| `/cars/rentals`                    | Small / Common / Landscape / Tablet / Desktop | fr / en / ar       | Rental cards, date range, status filter                           | ✔ Fixed |
| `/cars/owners`                     | Small / Common / Landscape / Tablet / Desktop | fr / en / ar       | Owner list, verification status, contact actions                  | ✔ Fixed |
| `/cars/categories`                 | Small / Common / Landscape / Tablet / Desktop | fr / en / ar       | Car types, pricing tiers, modal                                   | ✔ Fixed |
| `/cars/pricing`                    | Small / Common / Landscape / Tablet / Desktop | fr / en / ar       | Seasonal rules table, sticky 1st col, touch slider                | ✔ Fixed |
| `/cars/insurance`                  | Small / Common / Landscape / Tablet / Desktop | fr / en / ar       | Insurance policy cards, deductible inputs                         | ✔ Fixed |
| `/moderation`                      | Small / Common / Landscape / Tablet / Desktop | fr / en / ar       | Overview cards, pending queue, quick actions                      | ✔ Fixed |
| `/moderation/providers`            | Small / Common / Landscape / Tablet / Desktop | fr / en / ar       | Provider card list, document verification sheet, decision footer  | ✔ Fixed |
| `/bookings`                        | Small / Common / Landscape / Tablet / Desktop | fr / en / ar       | Card list, collapsed header actions, status tabs, detail sheet    | ✔ Fixed |
| `/payments`                        | Small / Common / Landscape / Tablet / Desktop | fr / en / ar       | KPI strip, financial cards, filter sheet                          | ✔ Fixed |
| `/payments/wallets`                | Small / Common / Landscape / Tablet / Desktop | fr / en / ar       | Wallet balances, recharge modal, touch buttons                    | ✔ Fixed |
| `/payments/transactions`           | Small / Common / Landscape / Tablet / Desktop | fr / en / ar       | Dense table horizontal scroll, sticky 1st col, search             | ✔ Fixed |
| `/payments/commissions`            | Small / Common / Landscape / Tablet / Desktop | fr / en / ar       | Rates grid, rule editor, single col form                          | ✔ Fixed |
| `/payments/payouts`                | Small / Common / Landscape / Tablet / Desktop | fr / en / ar       | Payout queue, batch actions, status sheet                         | ✔ Fixed |
| `/payments/refunds`                | Small / Common / Landscape / Tablet / Desktop | fr / en / ar       | Refund disputes, claim viewer, decision sheet                     | ✔ Fixed |
| `/reviews`                         | Small / Common / Landscape / Tablet / Desktop | fr / en / ar       | Review cards, rating stars, moderate 44px buttons                 | ✔ Fixed |
| `/reviews/reports`                 | Small / Common / Landscape / Tablet / Desktop | fr / en / ar       | Flagged content cards, report reasons, dismissal dialog           | ✔ Fixed |
| `/reviews/disputes`                | Small / Common / Landscape / Tablet / Desktop | fr / en / ar       | Dispute threads, arbitration form, resolution options             | ✔ Fixed |
| `/promotions`                      | Small / Common / Landscape / Tablet / Desktop | fr / en / ar       | Promo codes list, copy button, creation sheet                     | ✔ Fixed |
| `/promotions/featured`             | Small / Common / Landscape / Tablet / Desktop | fr / en / ar       | Placement cards, duration picker, preview                         | ✔ Fixed |
| `/messages`                        | Small / Common / Landscape / Tablet / Desktop | fr / en / ar       | Responsive list <-> thread navigation, safe-area keyboard bar     | ✔ Fixed |
| `/messages/notifications`          | Small / Common / Landscape / Tablet / Desktop | fr / en / ar       | Notification stream, mark read 44px button                        | ✔ Fixed |
| `/messages/templates`              | Small / Common / Landscape / Tablet / Desktop | fr / en / ar       | Template cards, variables editor                                  | ✔ Fixed |
| `/stats`                           | Small / Common / Landscape / Tablet / Desktop | fr / en / ar       | Stacked responsive charts, ResizeObserver, table fallback         | ✔ Fixed |
| `/stats/revenue`                   | Small / Common / Landscape / Tablet / Desktop | fr / en / ar       | Revenue curves, currency format, date filter sheet                | ✔ Fixed |
| `/stats/wilayas`                   | Small / Common / Landscape / Tablet / Desktop | fr / en / ar       | Geographic breakdown, wilaya list cards                           | ✔ Fixed |
| `/settings`                        | Small / Common / Landscape / Tablet / Desktop | fr / en / ar       | Grouped accordion settings, safe toggle switches                  | ✔ Fixed |
| `/settings/onboarding`             | Small / Common / Landscape / Tablet / Desktop | fr / en / ar       | Reorderable steps, touch up/down fallbacks                        | ✔ Fixed |
| `/settings/security`               | Small / Common / Landscape / Tablet / Desktop | fr / en / ar       | 2FA toggle, session table, password form                          | ✔ Fixed |
| `/settings/audit-log`              | Small / Common / Landscape / Tablet / Desktop | fr / en / ar       | Horizontal scroll table with sticky 1st col, filter drawer        | ✔ Fixed |
| `/help`                            | Small / Common / Landscape / Tablet / Desktop | fr / en / ar       | FAQ accordions, contact support card, search                      | ✔ Fixed |
| `/search`                          | Small / Common / Landscape / Tablet / Desktop | fr / en / ar       | Full-width search bar, tabbed results, category pills             | ✔ Fixed |
| `/_design/mobile`                  | Small / Common / Landscape / Tablet / Desktop | fr / en / ar       | Shared components visual showcase & regression tests              | ✔ Fixed |
