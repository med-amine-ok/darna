# DARNA Admin, Mobile & Responsive Architecture Guide

## 1. Design System & Principles

- **Palette**: Earthy Minimal strictly preserved (`#2E3A2F` Primary, `#6B7F5B` Secondary, `#D9C9B2` Tertiary, `#C96F4F` Accent, `#F8F6EE` Background). No blue/navy elements.
- **Breakpoints**:
  - `sm`: 640px
  - `md`: 768px
  - `lg`: 1024px
  - `xl`: 1280px
- **Mobile First**: All layouts designed for 320px–430px base width, progressively enhanced upward.
- **Touch Targets**: Minimum 44×44 px with ≥ 8 px separation between interactive elements (Fitts's Law).
- **iOS Safari Auto-Zoom Prevention**: All input, select, and textarea elements use `text-base sm:text-sm` (16px minimum on phones).
- **Safe Area Insets**: Handled via `env(safe-area-inset-top)` and `env(safe-area-inset-bottom)`.
- **Viewport Dynamic Height**: Using `100dvh` for off-canvas drawer, dialogs, and sheets.

---

## 2. Core Shared Primitives

### `<PageContainer>`

Standardizes outer horizontal padding and bottom spacing across all routes:

- `px-3.5 sm:px-6 lg:px-8`
- `pb-24 lg:pb-8` to ensure page content is never occluded by `<MobileBottomNav>` on mobile.

### `<MobileBottomNav>`

Sticky bottom navigation visible on `< lg` (< 1024px):

- 5 primary destinations: _Accueil_, _À traiter_, _Réservations_, _Messages_, _Plus_.
- _Plus_ opens the full off-canvas drawer navigation.
- Safe-area aware (`pb-[max(0.375rem,env(safe-area-inset-bottom))]`).

### `<Sidebar>`

- **Desktop (≥ 1024px)**: Fixed side navigation rail (width: 218px).
- **Mobile/Tablet (< 1024px)**: Off-canvas drawer sliding from start side (`100dvh`, width: 280px / max 85vw).
- Auto-closes on ESC key and route change.
- Hidden with `max-lg:invisible max-lg:pointer-events-none` when closed to guarantee zero horizontal scroll footprint in RTL/LTR.

### `<DataTable>`

- **Mobile (< 768px)**: Automatic responsive Card List mode (`isMobile` detection via `window.innerWidth < 768`). Each row renders as an informative card with thumbnail, title, status pill, key attributes, and action trigger.
- **Desktop (≥ 768px) / Dense Tables**: Full data table with horizontal scrolling container and sticky first column (`border-e`).

### `<Stepper>` & `<WizardLayout>`

- **Mobile (< 1024px)**: Compact progress bar header ("Étape X sur Y, [Nom]") with tap-to-open step sheet.
- **Desktop (≥ 1024px)**: Full stepper with circular step badges and truncated labels.
- Sticky safe-area bottom action bar on mobile (_Enregistrer en brouillon_ + _Suivant_).

### `<FilterBar>` & `<FilterDrawer>`

- Fluid search box with 16px font-size.
- Filter button displays active filter count badge.
- Secondary filters open inside a full-height off-canvas drawer with sticky _Réinitialiser_ and _Appliquer_ actions.

---

## 3. Direction & Localization (RTL / LTR)

- Logical properties used consistently: `ms-`, `me-`, `ps-`, `pe-`, `start-`, `end-`, `text-start`, `text-end`.
- Direction-sensitive icons (e.g. chevrons, arrows, steps) mirrored using `rtl:rotate-180`.
- Verified across `fr` (French, long strings), `en` (English), and `ar` (Arabic RTL).

---

## 4. How to Add a New Page and Maintain Compliance

1. Always wrap the page content with `<PageContainer>`.
2. For tabular data, use `<DataTable>`, it will automatically switch to card mode on phone screens.
3. For multi-step forms, wrap steps inside `<WizardLayout>` and pass steps to `<Stepper>`.
4. Ensure all action buttons use `<Button>` or `<IconButton>` which provide 44px min-h touch targets on mobile.
5. In `<PageHeader>`, pass secondary actions as an array so they automatically collapse into a `⋯` menu on mobile.
6. Verify against `npm run test:responsive` before committing.
