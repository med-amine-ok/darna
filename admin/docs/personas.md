# DARNA Admin — User Personas (Approche Anthropo-Centrée)

This document formalizes the three user personas for the DARNA Admin Console in accordance with the Human-Computer Interaction course (*Concepts de base d'IHM*, ENP, Dr. O. Arki, Part 1 & Part 2). 

The platform design adheres to an **anthropo-centric** approach: the machine and interface adapt to human capabilities, experience levels, and socio-cultural habits—rather than forcing users to adapt to machine logic.

---

## 1. Persona Matrix Overview

| Attribute | **Nadia** | **Karim** | **Samir** |
|---|---|---|---|
| **Role** | Novice Moderator (First Week) | Support Agent (Daily Operator) | Finance Manager (Occasional Expert) |
| **Experience** | Novice admin, non-technical | Proficient, high digital literacy | Expert in finance, non-technical in dev |
| **Frequency of Use** | 2–3 times a day | Continuous (all day, 7–8 hours/day) | Weekly / Bi-weekly (occasional) |
| **Primary Goal** | Review and approve trusted hosts/listings without errors | Resolve guest/host disputes, answer tickets, edit records rapidly | Verify escrow solvency, recharge wallets, audit commission tiers |
| **Emotional State** | Cautious, slightly anxious about breaking things | Task-driven, impatient with sluggish UIs or multi-click menus | Methodical, detail-oriented, demands precision and audit trails |
| **Language & Direction** | French & Algerian Arabic (prefers French UI with Arabic tooltips/RTL option) | Algerian Arabic & French (switches based on context) | French & English |
| **Risk Tolerance** | Extremely low — needs confirmation, safety nets, and Undo | Moderate — values speed, bulk actions, and keyboard shortcuts | Near-Zero — financial actions must have exact confirmation and audit records |

---

## 2. Detailed Persona Profiles

### 2.1 Nadia — Novice Moderator
> *"I want to do a thorough job approving genuine Algerian hosts, but I'm terrified of accidentally clicking the wrong button or deleting something important."*

- **Background:** Joined DARNA's trust and safety operations team this week. Educated in Algiers, speaks French and Algerian Arabic fluently. Comfortable with consumer web apps (Airbnb, Instagram), but this is her first internal admin back-office.
- **Mental Model:** Conceptualizes DARNA as a community of Algerian families and tourism partners. Thinks in terms of real people ("Karim from Tipaza who rents his cottage"), not database IDs (`usr_9f81a7`) or internal state machines (`pending_review`).
- **Behaviors & Needs:**
  - Needs clear, unambiguous visual hierarchy. If a card says "3 hosts waiting for approval", the button should directly say "Review hosts" and lead straight to that pre-filtered list.
  - Highly susceptible to cognitive overload (Miller's $7 \pm 2$). When confronted with more than 7 columns or complex nested tabs, she gets disoriented.
  - Requires **reassurance** (IHM Principle: *Interface rassurante*):
    - Clear confirmation modals that explain *who* is affected and *what* will happen: *"You are about to reject 'Villa in Tipaza' by Karim B. Karim will be notified with your reason. You can restore it later."*
    - Non-destructive default actions; destructive actions separated by spacing and terracotta outline styling.
    - An **Undo** toast (~8 seconds) on all reversible actions.
    - A **Training Mode** where she can practice approving and editing without altering live records.
- **First 10-Second Test:** When opening the dashboard, Nadia must immediately see:
  1. *What needs my attention right now?* (Max 4 task-focused cards).
  2. *How is DARNA doing overall?* (4 plain metrics with friendly comparison sentences).
  3. Where to get help (? button in the top bar).

---

### 2.2 Karim — Daily Support Agent
> *"I process dozens of bookings, user inquiries, and listing updates every hour. Give me speed, shortcuts, and 3 clicks maximum."*

- **Background:** Has worked in hospitality customer support for 2 years. Spends his entire working day in the admin console. Highly efficient, memorizes repetitive workflows.
- **Mental Model:** Thinks in high-throughput queues, state changes, and transaction histories. Needs to find a user or booking by name, phone number, or wilaya in under 3 seconds.
- **Behaviors & Needs:**
  - **Fitts's Law (T12) & 3-Click Principle (T5):** Primary actions must be positioned consistently in easy-to-hit regions (top-end header corner, sticky bottom drawers).
  - Demands **Command Palette (`⌘K`)** for instant jumping to any record or page.
  - Needs **Bulk Actions** (e.g. approve 10 verified listings at once) with dynamic progress feedback (*"Approving 7 of 10 listings..."*).
  - Values URL-synced filter states so he can bookmark search queries or share exact filtered views with teammates.
  - Uses keyboard shortcuts (`⌘K`, `Esc`, `Tab`, `Enter`) to bypass mouse movements.

---

### 2.3 Samir — Finance Manager & Occasional Expert
> *"I only log in once or twice a week to reconcile host wallet balances, review commission revenues, and process payouts. I need total clarity and zero surprises."*

- **Background:** Senior finance accountant overseeing DARNA's treasury, commissions, and bank/CCP settlements. Familiar with accounting principles, but because he uses the admin only intermittently, he forgets where rare settings are located between sessions (*Syndrome de l'oisillon / Long-term memory decay*).
- **Mental Model:** Double-entry ledger mentality. Wallet balances are never arbitrary numbers; they are derived from immutable transaction histories ($Balance = \sum Credits - \sum Debits$).
- **Behaviors & Needs:**
  - **Memory support (T1 & Long-Term Memory):** Uses the "Where did it go?" guide and contextual Help drawer (`?`) to recall how commission tiers or wallet recharges operate.
  - **Plain terminology:** Dislikes opaque abbreviations (GMV, ADR, Take Rate). Prefers *"Money paid by guests"*, *"DARNA earnings"*, and *"Payment to host"*.
  - **Financial Safety & Near-Zero Risk (Part 1 §1.5):** Recharging a host wallet or changing platform commission tiers requires explicit confirmation showing the previous balance, adjustment amount, and resulting balance before final execution.
  - Tabular financial columns: Tabular numerals, right-aligned monetary values with proper thousands separators (`2,450,000 DZD`).

---

## 3. Socio-Cultural Adaptation (Algerian Market Context)

In accordance with course slide 26 (*Caractéristiques socio-culturelles*):

1. **Bi-directional Reading & Full RTL:**
   - Arabic is an official national language. The interface provides full right-to-left layout inversion: sidebars mirror from left to right, chevrons flip, tabular data maintains reading flow.
   - Arabic typography uses *IBM Plex Sans Arabic* tuned for comfortable readability (no tiny unreadable Arabic glyphs).
2. **Numeral Representation:**
   - In Algerian administrative and banking contexts, Arabic text predominantly utilizes standard Latin numerals (`1, 2, 3...`) for currencies and dates rather than Eastern Arabic numerals (`١, ٢, ٣...`). This convention is strictly respected.
3. **Official Week & Calendar Conventions:**
   - In Algeria, the weekend spans **Friday and Saturday**, with the working week beginning on **Sunday**.
   - Date pickers, calendar widgets, and occupancy scheduling explicitly reflect Sunday as the first day of the week, with Friday/Saturday highlighted as non-working days where applicable.
4. **Currency Formats:**
   - Official currency is Algerian Dinar (**DZD / د.ج**). Displayed consistently with French/Algerian spacing: `2 450 000 DZD` or `2,450,000 DZD` / `2.450.000 د.ج`.
5. **Color Connotations (Algerian & Global):**
   - **Green (`#2E3A2F` / `#6B7F5B`):** Represents national identity, safety, approval, solvent status, and verified documents.
   - **Terracotta Accent (`#C96F4F`):** Strictly reserved for alerts, pending decisions requiring urgent action, rejections, bans, and destructive warnings. Never used as random decorative background.
   - **Warm Sand (`#D9C9B2`) & Warm Cream (`#F8F6EE`):** Evokes the Algerian landscape (Sahara, Mediterranean stone), providing a calm, non-fatiguing workspace for long hours of screen reading.
