# DARNA Admin — Responsive & Mobile Architecture Guide

## 1. Core Principles

The DARNA Admin design system is architected to guarantee responsive fidelity across **all viewports (320px small phones to 1536px large desktop displays)**, **all application states**, and **all three supported languages (`fr` French, `en` English, `ar` Arabic RTL)**.

### Rules & Non-Negotiables
- **DARNA Earthy Minimal Palette:** Unchanged across all breakpoints (`#2E3A2F` Deep Forest Pine, `#6B7F5B` Sage Green, `#D9C9B2` Warm Sand, `#C96F4F` Terracotta Rust, `#F8F6EE` Desert Cream). No artificial blues or generic greys.
- **Root-Cause Architectural Fixes:** Responsive adaptations are enforced in shared primitives, layout tokens, and base components. No `overflow-x: hidden` hacks on `body` to mask bugs.
- **Zero Feature Loss:** No controls, filters, or actions are removed on mobile; they adapt into mobile-ergonomic patterns (bottom sheets, card lists, sticky thumb action bars).
- **Touch Target Ergonomics (Fitts's Law):** All interactive elements on phone viewports have minimum touch targets of **44×44 px** with at least **8 px** clearance between neighboring targets.
- **No iOS Auto-Zoom:** All inputs, textareas, and selects enforce `font-size: 16px` minimum on viewports `< 640px`.

---

## 2. Spacing Scale & Layout Primitives

### Standard Spacing Tokens
- **Base Grid:** 4px / 8px scale.
- **Margins & Gaps:**
  - Micro-gaps (icon + label, tags): `gap-2` (8px).
  - Button groups: `gap-2.5` to `gap-3` (10–12px).
  - Form fields: `space-y-4` (16px) within groups; `space-y-6` (24px) between sections.
  - Section headings: 24–32px margin-top, 12–16px margin-bottom.

### Primitives: `<PageContainer>` & `<Section>`
All admin pages must be wrapped in `<PageContainer>` rather than applying custom padding:
```tsx
import { PageContainer, Section } from "@/components/ui/PageContainer";

export default function ExamplePage() {
  return (
    <PageContainer>
      <PageHeader title="Gestion des annonces" />
      <Section>
        {/* Content */}
      </Section>
    </PageContainer>
  );
}
```

- **Horizontal padding:** `px-3.5` (14px) on small phones, `sm:px-6` (24px) on tablets, `lg:px-8` (32px) on desktop.
- **Bottom padding:** `pb-24` on mobile to clear the sticky `<MobileBottomNav>`, `lg:pb-8` on desktop.

---

## 3. Breakpoint Strategy

DARNA follows a **mobile-first** hierarchy:
- **Base (< 640px):** Single-column stacked layouts, bottom sheets, card lists, sticky bottom bars.
- **`sm` (≥ 640px):** Two-column card grids, visible header actions, modal dialogs.
- **`md` (≥ 768px):** Standard data tables, full stepper rows, 3-column grids.
- **`lg` (≥ 1024px):** Fixed sidebar (218px width), side-by-side split view panels, full top navigation.
- **`xl` (≥ 1280px):** Multi-column dashboard widgets, 3-column wizard layouts.

---

## 4. Component-Level Responsive Behaviors

### 4.1 Navigation & App Shell
- **Desktop (≥ 1024px):** Fixed 218px left sidebar (right in RTL), full top bar.
- **Mobile (< 1024px):**
  - Sidebar becomes an **off-canvas drawer** (`w-[280px] max-w-[85vw] h-[100dvh]`), triggered by the top-bar hamburger button or the bottom nav "Plus" tab. Traps focus, locks body scroll, closes on route navigation or ESC.
  - **Mobile Bottom Navigation (`<MobileBottomNav>`):** 5 thumb-friendly destinations (*Accueil*, *À traiter*, *Réservations*, *Messages*, *Plus*). Safe-area aware (`pb-[max(0.375rem,env(safe-area-inset-bottom))]`).
  - **Top Bar (`<Header>`):** Fixed 56px height. Language switch moves into avatar dropdown menu on `< sm`.

### 4.2 Data Tables (`<DataTable>`)
- **Default (< md): Card List Mode:** Automatically converts rows into structured touch cards with thumbnail, primary title, status pill, 2–3 key facts (via column `mobilePriority`), and `⋯` action menu.
- **Dense/Financial Tables (`tableOnly`):** Retains tabular format inside a smooth horizontal scroll area with a **sticky first column** and edge fade shadow.
- **Pagination:** Compact stepper (`‹ Page 2 / 13 ›` with ≥44px buttons) on `< sm`, full numbered pagination on desktop.

### 4.3 Detail Panels & Split View (`<SplitView>`, `<DetailPanel>`)
- **Desktop (≥ 1024px):** Fixed column side-by-side with table.
- **Mobile (< 1024px):** Full-screen slide-over sheet (`inset-y-0 end-0 z-50 h-[100dvh] w-full sm:max-w-md`) with backdrop, sticky header, internal scroll, and safe-area aware action bar.

### 4.4 Wizards & Review Flows (`<WizardLayout>`, `<Stepper>`, `<DecisionCard>`)
- **Stepper:** Compact header on `< md` (*Étape 2 sur 6 — Localisation* with progress bar) + tap-to-open step sheet; desktop displays full connected circles.
- **Actions:** Mobile sticky bottom action bar (*Enregistrer en brouillon* + *Suivant*) pinned above safe area.
- **Decision Card:** Full-width action buttons with minimum 44px height; modal reasons adapt seamlessly.

### 4.5 Modals & Dialogs (`<Dialog>`, `<ConfirmDialog>`)
- Centered on screen with `p-3 sm:p-4`, `max-h-[calc(100dvh-2rem)]`, internal scroll.
- Action buttons stack **vertically** on mobile (`flex-col-reverse sm:flex-row`) with `min-h-[44px]`.

---

## 5. Multilingual & RTL Standards

- **Logical Properties:** All margins, paddings, borders, and position offsets use logical utilities:
  - `ms-` / `me-` instead of `ml-` / `mr-`
  - `ps-` / `pe-` instead of `pl-` / `pr-`
  - `start-` / `end-` instead of `left-` / `right-`
  - `text-start` / `text-end` instead of `text-left` / `text-right`
- **Icon Directionality:** Directional icons (arrows, chevrons, back links) include `rtl:rotate-180`.
- **String Length Resilience:** French strings (often 30% longer than English) and Arabic text must never clip awkwardly or break grid cells; `min-w-0` and `truncate` or `break-words` are applied systematically.

---

## 6. How to Add a New Page & Acceptance Criteria

When adding a new route or page to DARNA Admin:
1. Wrap root content in `<PageContainer>` and use `<PageHeader>` for page titles.
2. Use `<KpiStrip>` for metric rows (automatically handles 2-col mobile to 6-col desktop).
3. Use `<DataTable>` with `mobilePriority` annotations on key columns.
4. If a detail panel is needed, wrap with `<SplitView>`.
5. Run the responsive verification suite:
   ```bash
   npm run test:responsive
   ```
6. Verify the page passes all 0-overflow checks across 360px, 390px, 667px, 768px, and 1280px in `fr`, `en`, and `ar`.
