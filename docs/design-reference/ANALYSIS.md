# DARNA Admin — Design Reference Analysis & Architectural Mapping

## 1. Executive Summary & Canvas Proportions

This analysis dissects the 11 high-fidelity French UI design mockups for the DARNA Admin application (`admin/docs/design-reference/`), mapped to a standard reference canvas of **1536 × 1024 px**.

### 1.1 Canvas Grid & Global Metrics
- **Canvas Dimensions**: 1536 px (W) × 1024 px (H).
- **Sidebar**: Fixed width **218 px** (~14.2% of viewport width), 100vh height.
- **Top Bar**: Fixed height **64 px** (sticky across all routes), offset by 218 px from the left.
- **Content Viewport**: 1318 px (W) × 960 px (H).
- **Content Padding**: Uniform **24 px** (`p-6`) on all sides.
- **Split-View Proportions** (Pattern A & B):
  - **Left Data Table Zone**: **846 px** (~64.2% of usable content area).
  - **Right Detail Panel**: **424 px** (~32.2% of usable content area), sticky, max height `calc(100vh - 112px)`, independent vertical scroll.
- **Wizard 3-Column Proportions** (Pattern D):
  - **Form Column 1 (Left)**: ~470 px.
  - **Form Column 2 (Middle)**: ~470 px.
  - **Preview & Guidance Rail (Right)**: **320 px** (sticky live card, progress checklist, step tips).

---

## 2. Palette & Design Token Translation

While the design mockups use a generic SaaS blue/navy palette, DARNA enforces the **Earthy Minimal** palette with strict WCAG AA contrast compliance:

| Mockup Element & Usage | Mockup Color (Reference) | DARNA Palette Token | Hex / Value | Contrast & Usage Rules |
|---|---|---|---|---|
| Sidebar Background | Dark Navy `#0F172A` | `primary.800` / `primary` | `#2E3A2F` | White / ivory text (`#F8F6EE`), subtle hairline separator `#364135` |
| Sidebar Active Item Pill | Royal Blue `#2563EB` | `primary.900` / `primary.700` | `#1E261F` / `#364135` | Tinted background with secondary/tertiary indicator dot |
| Page Background | Soft Grey-Blue `#F1F5F9` | `darnaBg` | `#F8F6EE` | Warm organic canvas background |
| Card Background | Pure White `#FFFFFF` | `#FFFFFF` | `#FFFFFF` | Border `1px solid rgba(46, 58, 47, 0.08)`, soft shadow `darna-card` |
| Primary Action Buttons ("Ajouter...", "Suivant") | Bright Blue `#2563EB` | `primary` | `#2E3A2F` | Solid `#2E3A2F`, text `#FFFFFF`, hover `#364135`, active scale-98 |
| Positive Actions & Status ("Valider", "Publié", "Disponible") | Emerald Green `#10B981` | `secondary` | `#6B7F5B` | Deeper shade `#536446` for solid buttons (AA text contrast); pill bg `#E8EDE3`, text `#35402E` |
| Warning / Pending ("En attente", "Demander compléments") | Orange / Amber `#F59E0B` | `tertiary` | `#D9C9B2` | Pill bg `#F4EFE7`, text `#61523D`, icon ochre-brown `#79654A` |
| Danger / Destructive ("Refuser", "Supprimer", "Annulée") | Vivid Red `#EF4444` | `accent` | `#C96F4F` | Terracotta family: solid `#C96F4F`, outline `#C96F4F`, pill bg `#F9EAE5`, text `#7C3922` |
| Neutral / In-progress ("En cours", "Suspendu", "Réservée") | Slate / Blue `#3B82F6` | `primary-tint` | `#455243` | Neutral green-grey pill bg `#E5E8E5`, text `#2E3A2F` |
| Category Pills (Aventure, Culture, Nature, Gastronomie, Mer) | Multicolor rainbow | Palette-calm rotation | Secondary / Tertiary / Primary tints | Paired with semantic Lucide icon, never ambiguous terracotta |

---

## 3. Detailed Mockup-by-Mockup Anatomy

### Image 01: `01-validation-prestataires.png` — Validation des prestataires (`/moderation/providers`)
- **Route**: `/moderation/providers` (Pattern B — Pattern A + category tabs + moderation decision footer).
- **Layout Zones**:
  1. **Page Header**: Title "Validation des prestataires", Subtitle "Vérifiez et validez tous les prestataires avant leur publication sur la plateforme.", right action "Paramètres de validation" (gear outline button).
  2. **KPI Strip (4 cards)**:
     - "En attente de validation" (124, Clock icon in amber circular tile).
     - "Prestataires validés" (326, Check icon in green circular tile).
     - "À compléter" (18, File-text icon in blue circular tile).
     - "Refusés" (12, Cross icon in red circular tile).
  3. **Horizontal Category Tabs**: Tous (124) · Hôtes (32) · Hôtels & Hostels (18) · Agences de voyages (14) · Expériences (28) · Agences de location (32).
  4. **Filter Bar**: Search "Rechercher un prestataire...", Select "Type de prestataire", Select "Région / Wilaya", Select "Statut" (default: "En attente"), Button "Plus de filtres".
  5. **Data Table**: 7 columns (☐, Prestataire [avatar + name + subtitle], Type [type pill], Localisation [pin + wilaya], Date de demande, Statut [pill], Actions [menu `...`]).
  6. **Pagination**: "Affichage de 1 à 10 sur 124 prestataires", numbered pagination `« 1 2 3 4 5 ... 13 »`, select "10 par page".
  7. **Split Detail Panel (Right)**:
     - Hero image carousel with close "X", title "Villa les Oliviers", status badge "En attente de validation", 3 metadata chips (Type, Wilaya, Date).
     - 6 Tabs: Informations · Photos · Documents · Avis · Activités · Historique.
     - "Informations générales" card with contact details and property specs grid (Capacité, Chambres, Prix).
     - Description text block.
     - "Documents fournis (4/4)" checklist with green check badges and downloadable tiles (Carte d'identité, Titre de propriété, Photos, Règlement).
     - Profile action buttons: "Voir le profil public" and "Contacter".
     - **Decision Footer**: "Refuser" (accent outline), "Demander des compléments" (tertiary outline), "Valider et publier" (solid secondary).

### Image 02: `02-voyages-organises-list.png` — Voyages organisés (`/trips`)
- **Route**: `/trips` (Pattern A).
- **Layout Zones**:
  1. **Header**: "Voyages organisés", subtitle, right actions: "Exporter", "Catégories", "+ Ajouter un voyage" (solid primary).
  2. **KPI Strip (6 cards)**: 156 Tous les voyages · 98 Publiés · 24 En attente · 12 Suspendus · 8 Refusés · 14 Brouillons.
  3. **Filter Bar**: Search "Rechercher un voyage...", Destination, Catégorie, Date de départ, Statut, "Filtres".
  4. **Data Table**: Columns: ☐, `#` (`#T0124`), Voyage (thumbnail + title + category subtext), Destination, Date de départ, Durée ("3 jours"), Prix (DZD) ("25,000"), Statut, Actions.
  5. **Split Detail Panel**: Carousel with "1/12", status badge "Publié", `...` menu; Title "Tassili n'Ajjer", category, rating "★ 4.9 (128 avis)", location + "Voir sur la carte"; 5 tabs (Détails, Programme, Photos, Avis 128, Réservations); 4 spec tiles (Date de départ, Durée, Taille groupe, Niveau); Description; Points forts checklist; Sticky action footer (Modifier le voyage, Voir sur le site, Dupliquer, Suspendre, Supprimer).

### Image 03: `03-experience-wizard-step2-localisation.png` — Ajouter une expérience — Étape 2 Localisation (`/experiences/new`)
- **Route**: `/experiences/new` (Pattern D).
- **Layout Zones**:
  1. **Header**: "← Retour à la liste", H1 "Ajouter une expérience", subtitle, "Enregistrer en brouillon", "Suivant →".
  2. **6-Step Stepper**: 1 Informations générales (done check) · 2 Localisation (active filled) · 3 Détails et programme · 4 Tarifs et disponibilités · 5 Photos et médias · 6 Règles et validation.
  3. **Left/Center Form**:
     - "Adresse et localisation" card: Pays* (Algérie with flag), Région / Wilaya*, Ville*, Adresse exacte* search input + guidance note.
     - Interactive Leaflet map card with Carte/Satellite toggle, zoom, draggable pin, address badge with clear button.
     - "Points d'intérêt à proximité" card (up to 5 items with distance and remove tag).
     - "Accès et transport" card (Moyen d'accès principal*, instructions textarea).
     - "Localisation et visibilité" card (radio: Emplacement exact / Zone approximative ~5km / Masquée).
     - "Lieux de prise en charge (optionnel)" card.
  4. **Right Guidance Rail**:
     - Live preview card "Aperçu de l'expérience" with photo carousel, title, location, rating, badges, description.
     - "Progression de la création" card (2/6 checklist).
     - "Conseils pour la localisation" card (actionable tips).

### Image 04: `04-hebergement-validation-review.png` — Validation d'un hébergement (`/stays/:id/review`)
- **Route**: `/stays/:id/review` (Pattern C — Full-page review flow).
- **Layout Zones**:
  1. **Header**: "← Retour à la liste", H1 "Validation d'un hébergement" + pill "En attente de validation", subtitle, right "Voir sur le site", "Suivant →".
  2. **5-Step Stepper**: 1 Informations · 2 Photos · 3 Documents · 4 Vérification (active) · 5 Décision.
  3. **Left Wide Column**:
     - Media gallery: 1 large hero + 5 thumbnails + "+7".
     - Header summary card: Title "Villa avec piscine – Hydra", badges, ID `#H00124`, address + "Voir sur la carte", 4 stats (8 voyageurs, 4 chambres, 3 salles de bain, 250 m²).
     - Host profile card: Avatar, name, status, rating, contact info, "Voir le profil".
     - 7 Tabs: Informations générales · Localisation · Équipements · Tarifs et disponibilité · Règles · Calendrier · Historique.
     - Tab content: Specs table + "Modifier" button; Description; Équipements (15 chips); Location map card with landmark commute times.
  4. **Right Verification Column**:
     - "Vérification et conformité" checklist: 7 verification items with status pills and eye inspect buttons.
     - "Notes internes" textarea for private admin notes.
     - "Décision" radio group: Approuver et publier · Demander des modifications · Refuser.
     - Decision buttons: Solid secondary, outline neutral, outline accent.

### Image 05: `05-hebergements-list.png` — Gestion des hébergements (`/stays`)
- **Route**: `/stays` (Pattern A).
- **Layout Zones**:
  1. **Header**: "Gestion des hébergements", subtitle, right actions: "Exporter", "+ Ajouter un hébergement".
  2. **KPI Strip (5 cards)**: 1,248 Total · 186 En attente de validation · 892 Publiés · 78 Suspendus · 54 Refusés.
  3. **Filter Bar**: Search, Région, Ville, Type de logement, Statut, "Plus de filtres".
  4. **Data Table**: Columns: ☐, Hébergement (thumb + title + `#H00124`), Hôte, Ville/Région, Type (Villa, Appartement, etc.), Prix/nuit, Statut, Note, Réservations, Actions (eye + `...`).
  5. **Split Detail Panel**: Carousel, title, ID, rating, 5 tabs (Informations, Photos, Équipements, Calendrier, Réservations), specs card, Hôte card with verified tick, Tarifs et disponibilités card, sticky footer (Suspendre, Modifier, Dupliquer, Supprimer).

### Image 06: `06-hebergement-detail-overview.png` — Détail d'un hébergement (`/stays/:id`)
- **Route**: `/stays/:id` (Pattern E — Full detail page with tabs).
- **Layout Zones**:
  1. **Header**: "← Retour à la liste", Title + status pill, ID + creation timestamp, "← Précédent", "Suivant →".
  2. **Tab Bar (9 tabs)**: Vue d'ensemble · Informations · Photos · Équipements · Tarifs et disponibilité · Règles · Calendrier · Documents · Historique (+ Chambres for hotels/hostels).
  3. **Left Body**: Photo grid with "Image principale" tag + 6 thumbs + "+12", Informations générales 3-column specs card, Équipements icon grid card, Règles de la maison card.
  4. **Right Rail**: Statut de validation decision card, "À vérifier" quick checklist card, Hôte / Propriétaire card with 4 verification indicators, Documents du propriétaire list with view and download buttons.

### Image 07: `07-experiences-list.png` — Gestion des expériences (`/experiences`)
- **Route**: `/experiences` (Pattern A).
- **Layout Zones**:
  1. **Header**: "Gestion des expériences", subtitle, "Exporter", "Catégories", "+ Ajouter une expérience".
  2. **KPI Strip (5 cards)**: 238 Total · 46 En attente · 162 Publiées · 18 Suspendues · 12 Refusées.
  3. **Filter Bar**: Search, Région, Ville, Catégorie, Statut, "Plus de filtres".
  4. **Data Table**: Columns: ☐, Expérience (thumb + title + `#EXP0023`), Organisateur/Guide, Lieu, Catégorie (Aventure, Culture, Nature, Gastronomie, Mer), Prix DZD, Statut, Note, Réservations, Actions.
  5. **Split Detail Panel**: Carousel, title, ID, rating, location, 6 tabs (Aperçu, Informations, Photos, Calendrier, Réservations, Avis), 4 spec tiles, description, points forts checklist, Organisateur/Guide card, sticky footer actions.

### Image 08: `08-hebergement-wizard-step1.png` — Ajouter un hébergement — Étape 1 (`/stays/new`)
- **Route**: `/stays/new` (Pattern D).
- **Layout Zones**:
  1. **Header**: "← Retour", H1 "Ajouter un hébergement", subtitle, "Enregistrer en brouillon", "Publier l'hébergement".
  2. **6-Step Stepper**: 1 Informations générales (active) · 2 Localisation · 3 Équipements · 4 Photos et description · 5 Tarifs et disponibilité · 6 Règles et validation.
  3. **Form Layout (2-column)**:
     - Left: Informations générales card (Title*, Type*, Category*, Capacity*, Rooms*, Bathrooms*, Surface*, Year, Host*, Short desc /300, Detailed rich text /2000), Règles principales card with toggles and check-in/out times.
     - Middle: Localisation card (Address*, Wilaya*, Commune*, interactive map with pin, nearby POIs tag list), Contact card (Phone* +213, Email*, contact display toggle).
  4. **Right Rail**: Live preview card, Creation progress 1/6 card, Tips card.

### Image 09: `09-location-voitures-list.png` — Location de voitures (`/cars`)
- **Route**: `/cars` (Pattern A).
- **Layout Zones**:
  1. **Header**: "Location de voitures", subtitle, "Exporter", "Catégories", "+ Ajouter une voiture".
  2. **KPI Strip (6 cards)**: 1,024 Véhicules · 542 Disponibles · 186 Réservées · 42 En maintenance · 32 Indisponibles · 86 Agences/Propriétaires.
  3. **Filter Bar**: Search make/model, Catégorie, Ville, Boîte de vitesse, Carburant, Statut, "Filtres".
  4. **Data Table**: Columns: ☐, `#` (`#V1024`), Véhicule (thumb + name + year/fuel/gearbox), Catégorie (SUV, Citadine, etc.), Ville, Prix/jour, Statut, Actions.
  5. **Split Detail Panel**: Carousel, title, city, rating, map link, 6 tabs (Détails, Tarifs, Photos, Équipements, Réservations, Avis), 8 spec tiles (Catégorie, Année, Carburant, Boîte, Capacité, Portes, Climatisation, GPS), description, duration pricing table (1–3, 4–7, 8–15, +15 days), availability mini-calendar with booked days, sticky footer actions.

### Image 10: `10-experience-wizard-step1.png` — Ajouter une expérience — Étape 1 (`/experiences/new`)
- **Route**: `/experiences/new` (Pattern D).
- **Layout Zones**:
  1. **Header**: "← Retour à la liste", H1 "Ajouter une expérience", subtitle, "Enregistrer en brouillon", "Suivant →".
  2. **6-Step Stepper**: 1 Informations générales (active) · 2 Localisation · 3 Détails et programme · 4 Tarifs et disponibilités · 5 Photos et médias · 6 Règles et validation.
  3. **Form Layout (2-column)**:
     - Left: Informations générales card (Title*, Main category*, Sub-category, Duration*, Difficulty*, Group size*, Languages offered* tags, Short desc /300, Detailed rich text /2000, Points forts checklist builder with add input).
     - Middle: "Catégorie et informations complémentaires" card (Icon upload, Experience type radio options, Keywords tags input, Main image with preview, Photo gallery min 5 counter 5/20 with upload, Presentation video upload/URL).
  4. **Right Rail**: Live preview card, Creation progress 1/6 card, Tips card.

### Image 11: `11-reservations-list.png` — Gestion des réservations (`/bookings`)
- **Route**: `/bookings` (Pattern A + category tabs).
- **Layout Zones**:
  1. **Header**: "Gestion des réservations", subtitle, "Exporter", "Rapport", "+ Nouvelle réservation".
  2. **Category Tabs with Counts**: Toutes 1,248 · Hébergements 642 · Expériences 238 · Voyages organisés 156 · Voitures 212.
  3. **Date Range & Filter Bar**: Date-range picker (01/03/2024 – 31/03/2024) + "Filtres"; Filter inputs row (Search number/client/email, Type d'activité, Statut, Date de réservation, Date de début, Région, "Réinitialiser").
  4. **Data Table**: Columns: ☐, `#` (`#R1248` + date), Client (avatar + name), Type (icon + label), Détails (title + location), Dates (range + duration), Montant (DZD), Statut, Actions.
  5. **Split Detail Panel**: Header with `#R1248`, status badge, booking timestamp, Print button, `...`, close "X"; Image + service badge; location + map link; 5 tabs (Détails, Client, Paiement, Messages 3, Historique); Arrival/Departure breakdown with "Modifier les dates"; Montant et paiements price calculation table; "Paiement reçu" status card with "Voir la transaction" and "Télécharger la facture"; Sticky footer (Modifier la réservation, Envoyer un message, Annuler la réservation, Rembourser, Signaler un problème).

---

## 4. Cross-Mockup Inconsistencies & Resolution Matrix

| Inconsistency Observed in Mockups | Mockups Affected | Root Cause / Variance | Normalized Resolution for DARNA |
|---|---|---|---|
| Sidebar Menu Structure | Image 01 vs others | Image 01 has "Validation & Modération" expanded between Cars and Bookings; others do not show it or show different subsets | Adopt the complete **14-item navigation union** (§3.3) with accordion behavior where only one section expands at a time |
| Notification Badge Count | 01, 02, 03, 04, 08, 09, 10, 11 show `3`; 05, 07 show `12` | Static design artifact | Dynamic badge bound to mock notification store; default seed = 3 unread |
| Chevron Directions | Down vs Right vs Up across mockups | Inconsistent icon assets used in design tool | Strict standard: chevron-down when collapsed, 180° rotation up when expanded; horizontally flipped in RTL |
| ID Prefixes Collision | Trips (Image 02) uses `#V0124` while Cars (Image 09) uses `#V1024` | Both used "V" for Voyage and Véhicule | Disambiguate completely: `#T...` for Trips (Voyages), `#V...` for Vehicles (Voitures), `#H...` for Stays (Hébergements), `#EXP...` for Experiences, `#R...` for Bookings (Réservations), `#P...` for Providers |
| Sub-items as Separate Pages vs Filter Presets | Mockup sub-items e.g. "Publiés", "Suspendus", "Refusés" | Some designs treated them as discrete pages | Implement the **Saved View Architecture**: "Publiés", "En attente", "Suspendus", "Refusés" route to the same list page with URL preset `?status=...`, synchronizing the sidebar pill, filter select, and KPI cards |
| Action Button Color Inconsistency | Some buttons use neutral borders, others green or red | Varied designer intent | Unified design system tokens: Primary solid `#2E3A2F`, Secondary outline `#6B7F5B`, Tertiary outline `#D9C9B2`, Accent outline `#C96F4F` |
| Detail Panel Column Priority | Table gets cramped when panel is open on 1280px–1440px screens | Responsive constraint | Automatic column priority system: hide low-priority columns (Rating, Bookings count, Dates) when split panel is active; full table restored on close |

---

## 5. Architectural Checklist for Implementation
- [x] Document full layout zones, proportions, component inventory, and spacing rhythm.
- [x] Map all 11 reference images to reusable Patterns (A, B, C, D, E).
- [x] Resolve all cross-mockup inconsistencies with rationalized system rules.
- [x] Enforce DARNA Earthy Minimal palette token translation.
