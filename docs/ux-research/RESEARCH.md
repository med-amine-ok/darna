# DARNA — UX research: what premium travel products actually do

Research date: 2026-10-29. Method: each site opened live in a real browser at 1440×900 and (for Airbnb) 375×812; scrolled, hovered, opened galleries/modals; design values were **measured from the live DOM** with a script that counts every computed font size, weight, radius, shadow, transition duration and easing on the page — so the numbers below are what these sites ship, not recollection. Screenshots are in `screenshots/`.

Principles are adapted, never copied: no assets, copy, imagery or trademarks from these sites are used in DARNA.

## Sites studied

| Site | Pages studied | Why |
|---|---|---|
| airbnb.com | home (desktop + mobile), scroll-collapsed header, search + map (Algiers), hotel/hostel listing (skeleton, gallery, sticky nav, rooms, amenities), "Show all photos" tour, mobile listing | Direct category reference |
| booking.com | Oran results, date picker | Hotel patterns, DZD, trust signals |
| getyourguide.com | Marrakesh activities | Experiences (closest to DARNA's Sahara/heritage trips) |
| turo.com | home | Vehicle rental |
| linear.app | home | Motion timing, depth on dark UI, display type |
| stripe.com | home | Tinted shadows, editorial two-tone headline, easing |
| apple.com/iphone | product hub | Tile radii, restraint, timing |
| aman.com | home | Luxury hospitality: serif type, warm canvas, editorial layout |
| dzappart.app, nreservi.com | home, hotels-by-wilaya | Algerian expectations |

Not visited in this pass (time): vrbo, expedia, hostelworld, viator, getaround, Four Seasons, Soho House, Notion, Vercel, Revolut, Wise, Awwwards showcases. The measured set already covers every pattern category in the brief; these can be added if you want broader coverage.

## 1. Typography

| Site | Display / headline | Body / UI | Notes |
|---|---|---|---|
| Airbnb | 22–28px, **weight 500** (h1 26/30, h2 22/26) | 14/20, 12/16 meta; weights 400/500/600/700 | One rounded geometric sans (Cereal, proprietary). Hierarchy from size + weight 500, not 700. Compact. |
| Linear | **64/64, weight 510, tracking −1.4px** | Inter Variable | Tight negative tracking is what makes big type look expensive. |
| Stripe | **48/55, weight 300, tracking −0.96px**, two-tone (first clause ink, rest muted) | sohne | Light weight + two-tone = editorial calm. |
| Aman | **Serif (Lyon Text) 31/45, weight 400, +0.5px** | 10px uppercase eyebrow, tracking 2px | Luxury = regular-weight serif, airy line-height ~1.45, tiny tracked eyebrows. Never bold. |
| GetYourGuide | Very large bold title ("Tours") | Bold card titles | Utility-bold, less premium. |
| Apple | Large tiles, product names large and tight | 12–17px UI | Restraint, whitespace. |

**Takeaways for DARNA**
- Pair a **warm editorial serif** for display (regular/medium weight, never heavy) with a **rounded geometric sans** for UI — the Aman × Airbnb combination. Open-source candidates: display *Fraunces* (soft, optical-size axis) or *Cormorant*; UI *Plus Jakarta Sans* / *DM Sans* / *Manrope* (closest open feel to Cereal). Arabic: *IBM Plex Sans Arabic* or *Noto Kufi Arabic* for UI, *El Messiri* / *Amiri* for display.
- Big type gets **negative tracking** (−1% to −2.5%); small eyebrows get **positive tracking** (+0.1em, uppercase only for ≤11px labels).
- Hierarchy via **size jumps + weight 500/600**, not everything at 700.
- Two-tone headlines (ink + muted) for section intros.

## 2. Spacing, radii, depth

**Radii measured**
- Airbnb: **20px** dominant (cards, images, map panel), pill 50%/999px, 12px booking card, 8px small, 32px large surfaces.
- Apple: **28px tiles**, 36px large, 980px pills.
- Linear: pill 9999px, 8/12px components.
- Stripe: 4–6px (fintech precision — not our tone).

**Shadows measured**
- Airbnb card/pill: `0 0 0 1px rgba(0,0,0,.02), 0 2px 6px rgba(0,0,0,.04), 0 4px 8px rgba(0,0,0,.10)` — a **hairline ring + two soft drops**.
- Airbnb booking card: `0 6px 16px rgba(0,0,0,.12)`, 24px padding, 12px radius.
- Stripe: shadows **tinted with the brand ink** (`rgba(50,50,93,.25) 0 30px 60px -10px`) — never pure black.
- Linear: 4-layer stacked shadows + `inset 0 0 0 0.5px rgba(255,255,255,.08)` inner highlight.

**Takeaways**
- An elevation scale built from **hairline ring + 2–3 soft layers**, tinted with DARNA primary `#2E3A2F` (warm green-black) instead of black.
- Radius scale: 8 / 12 / 16 / 20–24 / pill; images take the card's radius.
- Inner 1px highlight on raised surfaces (buttons, glass bars) for "tactile" depth.
- Airbnb's mobile category pills look **physically raised** (soft drop + top highlight) — the cheapest "wow" on mobile.

## 3. Imagery

- Airbnb cards: ~1:1 / 20:19 crops, 20px radius, carousel dots fading in on hover, badges ("Guest favorite") as white translucent pills top-start, heart top-end.
- Loading: **skeletons with the exact final geometry** (bento grid blocks, booking card bars) in a neutral tint — nothing pops or shifts.
- Detail: 5-image bento (1 large + 4), "Show all photos" opens a **full-screen photo tour grouped by space** (Overview, each room type).
- Mobile detail: full-bleed hero, then the **content sheet overlaps the image with large rounded top corners**; counter "1 / 62".
- Turo / DzAppart: hero image as an **inset rounded card** (not full-bleed) with headline + search laid over it.
- Aman: editorial asymmetry (text left, tall image right), autoplay video with visible pause control.
- GYG: 4:3 cards, "From" price, strikethrough deals, honest urgency badge.

**Takeaways**: consistent aspect ratios per card type; scrims under text; blur-up/dominant-colour placeholders; arch-shaped masks as DARNA's own motif (Moorish arch = brand logo shape); photo tour grouped by room for hotels/hostels.

## 4. Motion vocabulary (measured)

| Site | Dominant easing | Durations |
|---|---|---|
| Airbnb | `cubic-bezier(0.2, 0, 0, 1)` (206 uses) | 0.1s press, 0.2s shadow, 0.25s transform, 0.3s colour |
| Stripe | `cubic-bezier(0.25, 1, 0.5, 1)` (620 uses) | 0.3s standard, 0.15–0.25s micro, 0.8s large |
| Linear | `cubic-bezier(0.25, 0.46, 0.45, 0.94)`; large: `cubic-bezier(0.32, 0.72, 0, 1)` | 0.1s/0.16s micro, 0.4–0.7s reveals |
| Apple | `ease`, `cubic-bezier(0.4, 0, 0.6, 1)` | 0.24s / 0.32s |

Observed behaviours:
- **Header**: Airbnb's big search bar collapses into a compact 3-segment pill on scroll; header gains a hairline divider, not a heavy shadow. On the detail page, after the gallery, the header is **replaced by a sticky section-anchor bar** (Photos · Rooms · Amenities · Reviews · Location) while the booking card stays sticky.
- **Hover**: cards don't jump; arrows/dots fade in, heart scales; buttons transition box-shadow 0.2s + transform 0.25s.
- **Load**: Linear fades the hero in after paint; Airbnb resolves skeleton → content with a cross-fade.
- Everybody uses **one easing family** consistently — that consistency is the "expensive" feel.

**Takeaways for `lib/motion.ts`**: entrance ease-out `cubic-bezier(0.22, 1, 0.36, 1)` (≈ Stripe/Airbnb family); press 100–120ms; hover 200–250ms; overlays 280–320ms; page/large 450–600ms; springs for sheets and the heart. Stagger 40–60ms.

## 5. Component patterns worth adopting

| Pattern | Seen at | DARNA adaptation |
|---|---|---|
| Hero search → compact header pill on scroll | Airbnb | Already exists — make the morph smooth and the bar glass |
| Sticky section-anchor nav replacing header | Airbnb detail | Listing/hotel/trip detail |
| Sticky booking card with total price headline ("From $222 for 2 nights") + gradient CTA, 48px pill | Airbnb | BookingWidget; gradient derived from accent shades only |
| Mobile sticky bottom bar: total + dates + CTA | Airbnb | All detail pages |
| Photo tour grouped by space | Airbnb hotel | Hotel/hostel lightbox |
| Room cards: image + specs + price for stay | Airbnb, Booking | RoomCard |
| Quick-filter chip row under header | Airbnb, GYG, Turo | Search page (amenities, Instant, family-friendly…) |
| Flexible dates chips (±1/2/3/7 days) | Booking | Date picker |
| Rating badge with label ("Excellent 8.8 · 694 reviews") | Booking | Hotel cards |
| "/day" + "total" dual price | Turo | VehicleCard |
| Duration · rating · "From" price, honest urgency | GYG | ExperienceCard / TripCard |
| Map in inset rounded panel, price-pill markers, hovered card → dark pin | Airbnb | SearchMap |
| Raised category pills | Airbnb mobile | CategoryPills |
| Bottom tab bar with accent active state | Airbnb mobile | BottomNav |
| Two-tone editorial section headline | Stripe | Home sections |
| Eyebrow + serif headline + underlined text link | Aman | Editorial home sections, wilaya stories |

## 6. Mobile behaviours

- Bottom tab bar (Explore / Wishlists / Log in), active = accent icon + label.
- "Start your search" full-width pill opens a full-screen search.
- Horizontal card rails with partial next card visible (affordance to swipe).
- Detail: full-bleed image + overlapping rounded sheet; sticky bottom booking bar.
- Floating "Prices include all fees" toast-pill — informational, non-blocking.

## 7. Algerian / local expectations

- Prices in **DZD / DA**; "réservable en dinars, sans carte de crédit" is a selling point (Nreservi); **deposit online, rest to host** (DzAppart).
- **WhatsApp** contact prominent (header button + floating) — users expect a human channel.
- Browse by **wilaya grid with counts** (Nreservi lists ~40 wilayas with hotel counts).
- FR / EN / عربي switch visible; **"hôtes vérifiés"** is the main trust message.
- Airbnb now localises the home page to Algiers ("Available in Algiers this weekend", "Popular homes in Hydra") with Arabic place names — DARNA must look at least as local and much more premium.
- Local sites are functional but generic (template heroes, flat cards): **the premium bar in Algeria is low — this is DARNA's opportunity.**

## 8. Flat vs premium — what references do that DARNA doesn't (yet)

| Premium move (observed) | Where | DARNA today* |
|---|---|---|
| One easing family + consistent short durations everywhere | Airbnb, Stripe, Linear | Mixed CSS transitions, no shared motion tokens |
| Hairline ring + layered soft shadow; brand-tinted shadows | Airbnb, Stripe | Single faint shadows, mostly flat borders |
| Serif display at regular weight + tracked eyebrows | Aman | Sans everywhere, heavy weights |
| Negative tracking on big type | Linear, Stripe | Default tracking |
| Skeletons in final geometry, cross-fade in | Airbnb | Generic grid skeleton on some routes |
| Sticky section nav + sticky booking card + mobile bottom booking bar | Airbnb | Partial |
| Overlapping rounded sheet on mobile detail | Airbnb | Not present |
| Raised tactile chips, glass header | Airbnb, Apple | Flat pills |
| Photo tour grouped by space | Airbnb | Single lightbox |
| Inset rounded hero with text + search | Turo, DzAppart | Illustration hero |
| Two-tone editorial headlines, asymmetric editorial sections | Stripe, Aman | Uniform centred sections |
| Local trust: WhatsApp, wilaya grid with counts, "no card needed" | Nreservi, DzAppart | Not surfaced |

\* Confirmed against code and screenshots in `UI-AUDIT.md`.

## 9. Proposed direction (to be detailed in `docs/design/DESIGN-DIRECTION.md`)

**"Warm Algerian luxury — editorial and calm."** Aman's restraint and serif voice on DARNA's beige canvas; Airbnb's interaction model and component logic; Stripe/Linear-grade motion consistency and depth; local trust cues (WhatsApp, wilayas, DZD, verified hosts) treated as first-class UI, not footnotes. Brand motif: the **Moorish arch** from the DARNA logo used as image mask and section ornament, plus a very low-opacity zellige/rosette texture — never kitsch.
