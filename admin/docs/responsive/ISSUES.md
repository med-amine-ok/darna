# DARNA Admin, Responsive & Mobile Issues Log

This log catalogs root-cause issues identified during the mobile audit and how they were permanently fixed in shared primitives and components.

---

### ISS-001: Horizontal Page Overflow on Mobile Data Tables

- **Affected Routes**: `/users`, `/stays`, `/cars`, `/trips`, `/bookings`, `/payments/transactions`, `/settings/audit-log`.
- **Viewports**: All phone viewports (320px–430px) in `fr`, `en`, and `ar`.
- **Root Cause**: Fixed `<table>` markup forced `scrollWidth` to 700px–1100px on 360px screens.
- **Root Fix**: Implemented automatic responsive Card List mode in shared `components/data-table/DataTable.tsx`. When `window.innerWidth < 768`, rows automatically transform into structured cards with thumbnail, primary title, status pill, key attributes, and action dropdown. For dense financial tables, added sticky first-column horizontal scroll container.
- **Status**: FIXED.

---

### ISS-002: Off-Canvas Sidebar Overflow in RTL Mode

- **Affected Routes**: All routes in Arabic (`ar`).
- **Viewports**: All mobile viewports (< 1024px).
- **Root Cause**: Closed sidebar drawer positioned via `translate-x-full` remained in the layout flow, causing `scrollWidth > innerWidth` in RTL.
- **Root Fix**: Added `max-lg:invisible max-lg:pointer-events-none` when `!isMobileOpen` in `components/layout/Sidebar.tsx`.
- **Status**: FIXED.

---

### ISS-003: Fixed Width Stepper in Wizards

- **Affected Routes**: `/stays/new`, `/experiences/new`, `/trips/new`.
- **Viewports**: Small and common phones (320px–430px).
- **Root Cause**: Desktop stepper required `min-w-[600px]`, pushing the viewport horizontally and causing layout breakage.
- **Root Fix**: Added compact progress header ("Étape X sur Y, [Nom]") with progress bar on `< lg` in `components/ui/Stepper.tsx`. Tapping the header opens a bottom sheet with all steps.
- **Status**: FIXED.

---

### ISS-004: Page Header Action Button Collisions

- **Affected Routes**: `/bookings`, `/experiences`, `/stays`.
- **Viewports**: Small and common phones (< 640px).
- **Root Cause**: Passing 3 un-collapsible action buttons in a row created a 430px strip that overflowed phone viewports.
- **Root Fix**: Upgraded `PageHeader.tsx` to automatically keep the primary action button and collapse secondary actions into a `⋯` "Actions" dropdown menu on `< sm`. Refactored `BookingsClient.tsx` and `ExperiencesListClient.tsx` to pass structured action objects.
- **Status**: FIXED.

---

### ISS-005: Form Input iOS Safari Auto-Zoom

- **Affected Routes**: All forms, wizards, modals, search inputs.
- **Viewports**: iOS Safari at 375px–430px portrait and landscape.
- **Root Cause**: `text-xs` (12px) and `text-sm` (14px) on `<input>`, `<select>`, and `<textarea>` triggered iOS Safari's default auto-zoom, breaking page framing.
- **Root Fix**: Updated `Input.tsx`, `Select.tsx`, and `Textarea.tsx` to use `text-base sm:text-sm` (16px on mobile). Added global CSS media rule enforcing `font-size: 16px !important` on mobile form controls.
- **Status**: FIXED.

---

### ISS-006: Sub-44px Touch Targets

- **Affected Routes**: All routes with icon buttons, tab bars, filter buttons.
- **Viewports**: Touch devices (< 1024px).
- **Root Cause**: `IconButton`, tab buttons, and action pills used desktop dimensions (`w-8 h-8` or `h-8`).
- **Root Fix**: Standardized `min-h-[44px]` and `w-11 h-11` minimum touch target sizes on mobile across `Button.tsx`, `IconButton.tsx`, `Tabs.tsx`, and dialog action footers.
- **Status**: FIXED.

---

### ISS-007: Content Occlusion by Mobile Bottom Navigation

- **Affected Routes**: All routes on mobile.
- **Viewports**: `< lg` (< 1024px).
- **Root Cause**: Sticky `<MobileBottomNav>` covered the bottom-most list items and actions.
- **Root Fix**: Updated `<PageContainer>` to include `pb-24 lg:pb-8` clearance, and offset `<Toast>` positioning to `bottom-20 lg:bottom-5`.
- **Status**: FIXED.

---

### ISS-008: Missing Spacing Scale Consistency

- **Affected Routes**: Various list and detail pages.
- **Viewports**: All phone viewports.
- **Root Cause**: Inconsistent padding and hardcoded margins.
- **Root Fix**: Created standard `<PageContainer>` (`px-3.5 sm:px-6 lg:px-8`) and replaced arbitrary margins with Tailwind standard scale steps.
- **Status**: FIXED.

---

### ISS-009: SplitView Detail Panel Collision on Mobile

- **Affected Routes**: `/stays`, `/bookings`, `/moderation/providers`.
- **Viewports**: `< 1024px`.
- **Root Cause**: Two-column layout attempted to display list and panel side-by-side.
- **Root Fix**: On `< 1024px`, detail panels slide in as full-screen route-like sheets with sticky header and back button.
- **Status**: FIXED.

---

### ISS-010: Dialog Button Squeezing on Small Phones

- **Affected Routes**: Confirm dialogs, delete modals, approval popups.
- **Viewports**: Small phones (320px–375px).
- **Root Cause**: Horizontal button rows forced long French buttons to truncate or collide.
- **Root Fix**: On `< sm`, modal footer buttons stack vertically (`flex-col-reverse sm:flex-row`) with primary action on top.
- **Status**: FIXED.
