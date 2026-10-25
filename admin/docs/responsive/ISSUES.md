# DARNA Admin — Responsive Audit Issues Log

This log documents every layout, spacing, touch target, overflow, and responsive problem identified and resolved during the mobile audit across all routes and locales.

---

## Issue Log & Root Resolutions

### 1. App Shell & Layout
- **Issue ISS-001**: Desktop sidebar margin (`md:ms-[218px]`) applied on tablet screens (< 1024px), squeezing the content area.
  - **Root Fix**: Upgraded breakpoint to `lg:ms-[218px]`. Below 1024px, the main container takes 100% width, and the sidebar acts as an off-canvas drawer.
- **Issue ISS-002**: Mobile navigation on phones was solely dependent on opening the large 13-item sidebar.
  - **Root Fix**: Implemented `<MobileBottomNav />` with safe-area support, giving instant one-thumb access to *Accueil*, *À traiter*, *Réservations*, *Messages*, and *Plus* (which opens the sidebar drawer).
- **Issue ISS-003**: Top bar on phones (< 640px) had language switcher and long search placeholder colliding on the same line.
  - **Root Fix**: Set top bar to clean 56px (`h-14`), moved language switcher into avatar dropdown menu on `< sm`, and streamlined mobile search.

### 2. Form Inputs & Touch Targets
- **Issue ISS-004**: Form controls (`<input>`, `<select>`, `<textarea>`) had `text-sm` (14px), triggering iOS Safari automatic viewport zoom-on-focus.
  - **Root Fix**: Updated `Input.tsx`, `Select.tsx`, `Textarea.tsx`, `PhoneInput.tsx`, and `globals.css` with `text-base sm:text-sm` and minimum touch height of 44px (`min-h-[44px]`).
- **Issue ISS-005**: Interactive buttons and pagination controls smaller than 44×44 px on phone viewports.
  - **Root Fix**: Applied minimum touch targets and expanded hitboxes with `touch-action: manipulation`.

### 3. Data Tables & Lists
- **Issue ISS-006**: Wide 6–8 column HTML `<table>` elements forced severe horizontal scrolling on small screens.
  - **Root Fix**: Upgraded `DataTable.tsx` with mobile Card List mode on `< md`. Each item renders as an ergonomic card with key attributes, status pills, and actions, while dense tables (audit-log, ledger) use sticky first columns with shadow scroll affordance.
- **Issue ISS-007**: Numbered pagination buttons (`1, 2, 3, 4, 5`) collided on phones.
  - **Root Fix**: Responsive pagination collapsing to compact stepper (`‹ Page 2 / 13 ›`) on mobile.

### 4. Split-View & Detail Panels
- **Issue ISS-008**: Detail panel below 1024px was rendered under the table as an awkward vertical block.
  - **Root Fix**: Upgraded `SplitView.tsx` and `DetailPanel.tsx` to display as a full-screen slide-over sheet below 1024px with a sticky header and sticky bottom actions.

### 5. Dialogs, Modals, & Toasts
- **Issue ISS-009**: Dialogs lacked safe-area bottom margins and horizontal spacing on small phones (< 360px).
  - **Root Fix**: Added `max-h-[calc(100dvh-32px)]` with internal scrolling, 16px side margins, and stacked footer buttons on `< sm`.
- **Issue ISS-010**: Floating toasts in `Toast.tsx` (`bottom-5 end-5`) overlapped the mobile bottom nav and touched screen edges on phones.
  - **Root Fix**: Adjusted mobile positioning to `bottom-20 lg:bottom-5 start-4 end-4 sm:start-auto sm:end-5 max-w-[calc(100vw-2rem)] sm:max-w-sm`.

### 6. RTL Mirroring & Spacing
- **Issue ISS-011**: Hardcoded physical margins/paddings (`pl-10`, `mr-4`) in drawers and forms caused asymmetry in Arabic RTL.
  - **Root Fix**: Replaced with logical properties (`ps-`, `pe-`, `ms-`, `me-`, `start-`, `end-`) and mirrored chevron icons.

### 7. Steppers, Wizards & Decision Cards
- **Issue ISS-012**: KPI Strip cards in `KpiStrip.tsx` had large padding (`p-3.5`) and icons (`w-10 h-10`) that caused cramped text and wrapping on 320px–360px phones.
  - **Root Fix**: Refined layout with responsive padding (`p-2.5 sm:p-3.5`), adaptive gap (`gap-2 sm:gap-3 lg:gap-4`), smaller mobile icon tile (`w-8 h-8 sm:w-10 sm:h-10`), and `min-h-[44px]` touch target.
- **Issue ISS-013**: Wizard layout in `Stepper.tsx` had a fixed `min-w-[600px]` that caused horizontal scrolling on mobile viewports.
  - **Root Fix**: Transformed mobile stepper into a compact progress bar ("Étape X sur Y — [Nom]") with tap-to-view step selector drawer, while retaining responsive full-step row on desktop. Added mobile sticky bottom action bar in `WizardLayout.tsx`.
- **Issue ISS-014**: Review decision buttons in `DecisionCard.tsx` and proof inspect button in `ReviewChecklist.tsx` had sub-44px touch targets.
  - **Root Fix**: Upgraded action buttons with `min-h-[44px]`, eye inspect button with `w-11 h-11`, and textarea with `text-base sm:text-xs`.
- **Issue ISS-015**: Modals in `Dialog.tsx` and `ConfirmDialog.tsx` lacked vertical button stacking on `< sm` and could overflow viewport height.
  - **Root Fix**: Set `max-h-[calc(100dvh-2rem)]`, vertical action button stacking (`flex-col-reverse sm:flex-row`), and 44px touch targets.
- **Issue ISS-016**: Tabs in `Tabs.tsx` had button heights < 44px on mobile phones.
  - **Root Fix**: Added `min-h-[44px] sm:min-h-[34px]` to tab buttons across pill and line variants.

