# DARNA Admin — Responsive Coverage Matrix

This matrix tracks the audit, verification, and responsive fixes across all routes, viewport groups, locales (`en`, `fr`, `ar`), and states.

**Legend:**
- ✔ = Passed / Verified Responsive
- 🔧 = Fixed in this audit pass
- ⏳ = Pending verification

---

## 1. Route Coverage Matrix

| Route | Small Phone (320–360px) | Common Phone (375–430px) | Phone Landscape (667–844px) | Tablet (768–1024px) | Desktop (1280–1536px) | Locales (EN/FR/AR) | Detail / States Checked |
|---|---|---|---|---|---|---|---|
| `/login` | ✔ | ✔ | ✔ | ✔ | ✔ | EN, FR, AR | Default, validation error, keyboard focus |
| `/` (Tableau de bord) | ✔ | ✔ | ✔ | ✔ | ✔ | EN, FR, AR | Data, KPI cards 2x2, action cards stack, charts |
| `/users` (Utilisateurs) | ✔ | ✔ | ✔ | ✔ | ✔ | EN, FR, AR | Table card mode, profile detail panel, filter drawer |
| `/users/guests` (Voyageurs) | ✔ | ✔ | ✔ | ✔ | ✔ | EN, FR, AR | Filtered list, card mode, detail panel |
| `/providers` (Prestataires) | ✔ | ✔ | ✔ | ✔ | ✔ | EN, FR, AR | Provider cards, status badges, verification modal |
| `/stays` (Hébergements) | ✔ | ✔ | ✔ | ✔ | ✔ | EN, FR, AR | Card list, 3-dots menu, full-screen detail panel |
| `/stays/new` (Wizard) | ✔ | ✔ | ✔ | ✔ | ✔ | EN, FR, AR | 6 steps, compact stepper, map picker, single col |
| `/stays/[id]/review` (Review) | ✔ | ✔ | ✔ | ✔ | ✔ | EN, FR, AR | Stacked 2-col, sticky decision sheet, checklist |
| `/stays/categories` | ✔ | ✔ | ✔ | ✔ | ✔ | EN, FR, AR | Grid 2-col to 1-col, category modal |
| `/stays/change-requests` | ✔ | ✔ | ✔ | ✔ | ✔ | EN, FR, AR | Request list, diff comparison, approve/reject |
| `/experiences` (Expériences) | ✔ | ✔ | ✔ | ✔ | ✔ | EN, FR, AR | Card list, detail panel (disc, time, price, about) |
| `/experiences/new` (Wizard) | ✔ | ✔ | ✔ | ✔ | ✔ | EN, FR, AR | Step-by-step form, itinerary builder |
| `/experiences/categories` | ✔ | ✔ | ✔ | ✔ | ✔ | EN, FR, AR | Responsive cards, action buttons |
| `/trips` (Voyages organisés) | ✔ | ✔ | ✔ | ✔ | ✔ | EN, FR, AR | Card list, detail panel, status actions |
| `/trips/new` (Wizard) | ✔ | ✔ | ✔ | ✔ | ✔ | EN, FR, AR | Multi-day schedule form, pricing tiers |
| `/trips/booking-requests` | ✔ | ✔ | ✔ | ✔ | ✔ | EN, FR, AR | Bookings queue, action sheet |
| `/cars` (Location de voitures) | ✔ | ✔ | ✔ | ✔ | ✔ | EN, FR, AR | Card list, specs tiles, maintenance modal |
| `/cars/new` (Wizard) | ✔ | ✔ | ✔ | ✔ | ✔ | EN, FR, AR | Specs selector, photo dropzone, pricing rules |
| `/cars/rentals` (Locations) | ✔ | ✔ | ✔ | ✔ | ✔ | EN, FR, AR | Rentals list, status pill, contract inspect |
| `/cars/owners` (Propriétaires) | ✔ | ✔ | ✔ | ✔ | ✔ | EN, FR, AR | Owner agency cards, fleet size, verification |
| `/moderation/providers` | ✔ | ✔ | ✔ | ✔ | ✔ | EN, FR, AR | Category tabs, provider panel, document viewer |
| `/bookings` (Réservations) | ✔ | ✔ | ✔ | ✔ | ✔ | EN, FR, AR | Vertical tabs, card list, refund modal |
| `/payments` (Paiements) | ✔ | ✔ | ✔ | ✔ | ✔ | EN, FR, AR | Revenue KPI strip, ledger table, payout dialog |
| `/payments/wallets` | ✔ | ✔ | ✔ | ✔ | ✔ | EN, FR, AR | User balances, credit recharge dialog |
| `/payments/transactions` | ✔ | ✔ | ✔ | ✔ | ✔ | EN, FR, AR | Sticky first-col table, horizontal scroll |
| `/payments/commissions` | ✔ | ✔ | ✔ | ✔ | ✔ | EN, FR, AR | Platform tier breakdown, edit dialog |
| `/payments/payouts` | ✔ | ✔ | ✔ | ✔ | ✔ | EN, FR, AR | Payout batches, bank transfer status |
| `/payments/refunds` | ✔ | ✔ | ✔ | ✔ | ✔ | EN, FR, AR | Dispute refunds, refund processor modal |
| `/reviews` (Avis & signalements)| ✔ | ✔ | ✔ | ✔ | ✔ | EN, FR, AR | Moderation queue, star rating, hide/delete |
| `/reviews/reports` | ✔ | ✔ | ✔ | ✔ | ✔ | EN, FR, AR | Flagged reasons, customer report thread |
| `/reviews/disputes` | ✔ | ✔ | ✔ | ✔ | ✔ | EN, FR, AR | Dispute mediator, evidence viewer |
| `/promotions` (Codes promo) | ✔ | ✔ | ✔ | ✔ | ✔ | EN, FR, AR | Promo code cards, create dialog |
| `/promotions/featured` | ✔ | ✔ | ✔ | ✔ | ✔ | EN, FR, AR | Homepage highlights, slot manager |
| `/messages` (Conversations) | ✔ | ✔ | ✔ | ✔ | ✔ | EN, FR, AR | Two-screen master/detail, sticky composer |
| `/messages/notifications` | ✔ | ✔ | ✔ | ✔ | ✔ | EN, FR, AR | Broadcast announcements, compose modal |
| `/messages/templates` | ✔ | ✔ | ✔ | ✔ | ✔ | EN, FR, AR | Email/SMS templates, placeholder pills |
| `/stats` (Statistiques) | ✔ | ✔ | ✔ | ✔ | ✔ | EN, FR, AR | Responsive chart redraw, legend repositioning |
| `/stats/providers` | ✔ | ✔ | ✔ | ✔ | ✔ | EN, FR, AR | Provider breakdown, table alternative |
| `/stats/revenue` | ✔ | ✔ | ✔ | ✔ | ✔ | EN, FR, AR | Monthly revenue curve, breakdown cards |
| `/settings` (Paramètres) | ✔ | ✔ | ✔ | ✔ | ✔ | EN, FR, AR | Accordion sections, profile form |
| `/settings/onboarding` | ✔ | ✔ | ✔ | ✔ | ✔ | EN, FR, AR | Touch drag-reorder + up/down buttons |
| `/settings/audit-log` | ✔ | ✔ | ✔ | ✔ | ✔ | EN, FR, AR | Dense table with sticky 1st column |
| `/help` (Centre d'aide) | ✔ | ✔ | ✔ | ✔ | ✔ | EN, FR, AR | FAQ accordions, search bar, contact CTA |
| `/search` (Recherche globale) | ✔ | ✔ | ✔ | ✔ | ✔ | EN, FR, AR | Universal results, category filters |

---

## 2. Tested Viewport Groups
1. **Small Phones**: 320×568 (iPhone SE 1st gen), 360×640 (Galaxy S-series compact)
2. **Common Phones**: 375×667 (iPhone SE 2nd/3rd gen), 390×844 (iPhone 12/13/14), 412×915 (Pixel 7), 430×932 (iPhone 14/15 Pro Max)
3. **Phone Landscape**: 667×375, 844×390
4. **Tablets**: 768×1024 (iPad Mini), 820×1180 (iPad Air), 1024×768 (iPad Landscape)
5. **Desktop Regression Check**: 1280×720, 1536×864
