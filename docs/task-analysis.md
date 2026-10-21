# DARNA Admin — Task Analysis (Analyse des Tâches selon MAD / HTA)

This document presents the task analysis for the 14 core administrative jobs of the DARNA Admin Console, applying the analytical methodology from the Human-Computer Interaction course (*Concepts de base d'IHM*, ENP, Dr. O. Arki, Partie 02 : Analyse des tâches).

Every control, button, table column, and dialog in the admin console is strictly derived from this task tree.

---

## 1. Methodology & Formalisms

In accordance with slides 46–75 of the course syllabus:
1. **Goal / Objectif:** An invariant, stable state of the system that an agent seeks to achieve.
2. **Technique du « Pourquoi ? / Comment ? »:**
   - **Pourquoi ? (Why?):** Traverses *upward* to higher-level objectives and business justifications.
   - **Comment ? (How?):** Traverses *downward* into sub-procedures and elementary physical actions.
3. **Elementary Task (Tâche Élémentaire):** An indivisible action executed on an input/output device (click, keypress, select, drag).
4. **Constructors (MAD Formalism):**
   - **SEQ:** Sequential execution (step $i$ must complete before step $i+1$).
   - **ALT:** Alternative choice (exclusive choice among mutually exclusive branches).
   - **PAR:** Parallel / unconstrained order (actions can occur concurrently or in arbitrary order).
   - **FAC:** Facultative (optional sub-task).
   - **BOUCLE:** Iterative loop (repeats over an item collection or until a condition holds).
5. **Ergonomic Constraint (T5 - Principe des 3 clics):**
   Every core task must reach its actionable decision state in **$\le 3$ clicks** from the Home dashboard.

---

## 2. Core Task Trees (The 14 Fundamental Administrative Jobs)

### Task 1: Approve a New Host
- **Objective:** Ensure only trustworthy, verified Algerian hosts operate on DARNA.
- **Pourquoi ?** Protect guest safety, guarantee housing standards, and maintain platform credibility.
- **Comment ?** Inspect identity credentials, verify commercial registry (if agency/hotel), inspect property photos, and trigger approval.
- **Preconditions:** Host application status is `under_review` or `applied`; staff has `hosts:approve` permission.
- **Initial State:** Dashboard displays "Needs your attention" card with pending hosts count.
- **Click Count from Home:** **2 clicks** (Card button "Review hosts" [1] $\rightarrow$ Row action "Approve" [2] $\rightarrow$ Confirmation dialog "Approve host" [3]).

```
Goal: Approve a new host
 SEQ
  1. Open host waiting for approval (ALT: Click "Review hosts" from Dashboard [Click 1] | Click "To review" in Sidebar | Global search ⌘K)
  2. Inspect credentials
      PAR:
        - Check identity card / passport document
        - Check business registry / license (FAC: Agencies, Hotels, Hostels only)
        - Check contact details, phone, and wilaya
  3. Click "Approve host" button [Click 2]
  4. Confirm approval in modal dialog [Click 3]
  5. System outputs success toast: "Host approved. They were notified." (with Undo action)
Target: ≤ 3 clicks from Dashboard (Actual: 2 to open drawer, 3 to final confirm).
```

---

### Task 2: Reject a Host with a Clear Reason
- **Objective:** Prevent unverified or fraudulent host accounts from going live while providing transparent guidance.
- **Pourquoi ?** Avoid spam/fraud, comply with tourism regulations, and explain to the applicant how to correct their file.
- **Comment ?** Identify non-compliant files, select a pre-formatted reason template, write an optional personalized note, and submit rejection.
- **Preconditions:** Host status is `under_review` or `applied`.
- **Initial State:** Host review drawer open or row visible in "To review" table.
- **Click Count from Home:** **3 clicks** (Click "Review hosts" [1] $\rightarrow$ Click "Reject" [2] $\rightarrow$ Select reason & confirm [3]).

```
Goal: Reject a host with reason
 SEQ
  1. Navigate to pending host in To review inbox [Click 1]
  2. Click "Reject host" action [Click 2]
  3. Formulate rejection in structured dialog:
      SEQ
        - Select rejection reason category (ALT: "Blurry ID" | "Invalid Tourism License" | "Property Mismatch" | "Other")
        - Type custom polite explanation note (FAC)
        - Click "Confirm rejection" [Click 3]
  4. System updates host to "rejected", sends SMS/email, and presents Toast: "Host rejected. Notification sent." (Undo option for 8s)
Target: ≤ 3 clicks from Dashboard.
```

---

### Task 3: Approve a Listing
- **Objective:** Validate that a newly created accommodation, tour, or vehicle listing satisfies DARNA safety and quality benchmarks.
- **Pourquoi ?** Ensure guest satisfaction, prevent misleading listings, and verify accurate pricing in Algerian Dinars.
- **Comment ?** Review listing photos, address, wilaya, pricing, amenities, and host profile, then approve.
- **Preconditions:** Listing status is `pending_review`.
- **Initial State:** Dashboard card "Listings waiting for review" visible.
- **Click Count from Home:** **2 clicks** ("Review listings" [1] $\rightarrow$ "Approve listing" [2]).

```
Goal: Approve a listing
 SEQ
  1. Click "Review listings" on Dashboard card [Click 1]
  2. Check listing details
      PAR:
        - Check photo gallery and cover picture
        - Verify night price in DZD and stay rules
        - Verify wilaya location and communal address
  3. Click "Approve listing" button [Click 2]
  4. Toast confirms: "Listing approved and published." (Undo available)
Target: ≤ 3 clicks from Dashboard.
```

---

### Task 4: Request Changes on a Listing
- **Objective:** Help a host refine their listing (e.g., higher-resolution photos, clearer address, accurate pricing) without outright rejection.
- **Pourquoi ?** Nurture host relationships, elevate marketplace quality, and avoid harsh rejections for minor oversights.
- **Comment ?** Select specific areas requiring modification, choose standard change items, and dispatch request.
- **Preconditions:** Listing is under review.
- **Initial State:** Listing detail or row action menu.
- **Click Count from Home:** **3 clicks** ("Review listings" [1] $\rightarrow$ "Request changes" [2] $\rightarrow$ Submit change request [3]).

```
Goal: Request changes on a listing
 SEQ
  1. Open listings inbox [Click 1]
  2. Click "Request changes" on listing [Click 2]
  3. Specify required changes in modal:
      SEQ
        - Check change checkboxes (PAR: "Add higher-res photos" | "Clarify address in wilaya" | "Update pricing rules")
        - Type helpful feedback message for host
        - Click "Send change request" [Click 3]
  4. Listing status updates to "changes_requested"; host is notified.
Target: ≤ 3 clicks from Dashboard.
```

---

### Task 5: Suspend a User or Host
- **Objective:** Temporarily de-activate an account engaged in suspicious behavior, contract violation, or safety infractions.
- **Pourquoi ?** Immediately safeguard marketplace participants while an investigation is underway.
- **Comment ?** Find account, trigger suspension dialog, record internal audit reason, and execute.
- **Preconditions:** Target entity exists and is active; operator has moderator role.
- **Initial State:** Hosts page or Guests page.
- **Click Count from Home:** **3 clicks** (Sidebar "Hosts" or "Guests" [1] $\rightarrow$ Row menu "⋯" $\rightarrow$ "Suspend" [2] $\rightarrow$ Confirm suspension with reason [3]).

```
Goal: Suspend a user or host
 SEQ
  1. Locate target account (ALT: Click "Hosts" or "Guests" in Sidebar [Click 1] | Search via ⌘K)
  2. Open row action menu and click "Suspend" [Click 2]
  3. In Suspension Dialog:
      SEQ
        - Review warning: "You are about to suspend [Name]. Their listings will be hidden immediately."
        - Enter suspension justification (e.g., "Repeated guest complaints", "Unanswered dispute")
        - Click "Confirm suspension" [Click 3]
  4. Toast confirms: "[Name] suspended. Reason recorded in history." (Reversible)
Target: ≤ 3 clicks from Dashboard.
```

---

### Task 6: Restore a Deleted or Suspended Item
- **Objective:** Reinstate an erroneously deleted or remediated listing, host, or user account.
- **Pourquoi ?** Empower administrators to recover from mistakes easily (*Principe d'interface rassurante*).
- **Comment ?** Filter table by status "Suspended" or "Deleted", click restore action, confirm reinstatement.
- **Preconditions:** Target item has status `suspended`, `banned`, or `deleted`.
- **Initial State:** Filterable entity list.
- **Click Count from Home:** **3 clicks** (Entity page [1] $\rightarrow$ Filter chip "Suspended/Deleted" [2] $\rightarrow$ "Restore" button [3]).

```
Goal: Restore a deleted or suspended item
 SEQ
  1. Navigate to target entity list (e.g., Hosts or Listings) [Click 1]
  2. Filter by status: select "Suspended" or "Deleted" [Click 2]
  3. Click "Restore" on item row [Click 3]
  4. Modal displays: "Reactivate [Name]? Their listings and profile will be restored."
  5. Confirm restore; item returns to active standing with toast notification.
Target: ≤ 3 clicks from Dashboard.
```

---

### Task 7: Handle a Flagged Review
- **Objective:** Neutralize toxic, defamatory, abusive, or fake reviews submitted by guests or hosts.
- **Pourquoi ?** Keep review forums authentic, polite, and legally compliant.
- **Comment ?** Inspect flagged comments, compare against booking history, decide to approve (keep) or hide.
- **Preconditions:** Reviews flagged by users exist.
- **Initial State:** Dashboard card "Reviews flagged by guests".
- **Click Count from Home:** **2 clicks** ("Check reviews" [1] $\rightarrow$ "Hide review" or "Keep review" [2]).

```
Goal: Handle a flagged review
 SEQ
  1. Click "Check reviews" from Dashboard card [Click 1]
  2. Review flagged text, guest identity, and rating
  3. Decide:
      ALT:
        - Click "Keep review" (dismiss flag) [Click 2]
        - Click "Hide review" (hide from public marketplace) [Click 2]
  4. System updates review status instantly with Undo toast.
Target: ≤ 3 clicks from Dashboard.
```

---

### Task 8: Decide on a Booking Dispute
- **Objective:** Arbitrate an unresolved conflict between a host and guest regarding check-in failure, property defects, or cancellation refunds.
- **Pourquoi ?** Provide fair, authoritative escrow resolution and protect customer trust.
- **Comment ?** Review dispute claims, inspect evidence, choose refund or payout distribution.
- **Preconditions:** Booking status is `disputed`.
- **Initial State:** Dashboard attention card or Bookings disputed tab.
- **Click Count from Home:** **2 clicks** ("See bookings" [1] $\rightarrow$ "Resolve dispute" [2]).

```
Goal: Decide on a booking dispute
 SEQ
  1. Click "See bookings" (Disputes tab) from Dashboard [Click 1]
  2. Open dispute arbitration drawer [Click 2]
  3. Review dispute details: guest claim, host reply, transaction amount
  4. Select verdict (ALT: "Full refund to guest" | "Release payout to host" | "Split 50/50") [Click 3]
  5. Confirm decision; ledger adjustments applied automatically.
Target: ≤ 3 clicks from Dashboard.
```

---

### Task 9: Recharge a Host Wallet
- **Objective:** Manually credit a partner's wallet following an offline CCP / bank transfer deposit.
- **Pourquoi ?** Allow Algerian hosts to top up advertising budgets, pay platform commissions, or receive manual settlements.
- **Comment ?** Search host, open wallet tab, enter credit amount in DZD, attach bank reference, confirm ledger write.
- **Preconditions:** Operator has `finance:write` role; valid host account exists.
- **Initial State:** Money page or Host detail page.
- **Click Count from Home:** **3 clicks** (Sidebar "Money" [1] $\rightarrow$ "Recharge wallet" button [2] $\rightarrow$ Enter amount & confirm [3]).

```
Goal: Recharge a host wallet
 SEQ
  1. Click "Money" in Sidebar [Click 1]
  2. Click "Recharge wallet" button [Click 2]
  3. Complete recharge form:
      SEQ
        - Select or search host name
        - Type deposit amount in DZD
        - Type CCP/bank slip reference number
        - Review summary: "Current balance: X DZD → New balance: Y DZD"
        - Click "Confirm recharge" [Click 3]
  4. Ledger credit transaction written, host balance updated, receipt toast generated.
Target: ≤ 3 clicks from Dashboard.
```

---

### Task 10: Change a Commission Rate
- **Objective:** Adjust the platform commission tier percentage for a specific host category (Individual, Agency, Hotel, Hostel).
- **Pourquoi ?** Run seasonal promotional cuts or adjust business unit economics.
- **Comment ?** Navigate to Commission tiers, select category, edit percentage, save with audit justification.
- **Preconditions:** Super Admin or Finance Officer role.
- **Initial State:** Money page $\rightarrow$ Commission tiers section.
- **Click Count from Home:** **3 clicks** (Sidebar "Money" [1] $\rightarrow$ Tab "Commission tiers" [2] $\rightarrow$ Edit rate & save [3]).

```
Goal: Change a commission rate
 SEQ
  1. Click "Money" in Sidebar [Click 1]
  2. Select "Commission tiers" tab [Click 2]
  3. Click "Edit rate" on target tier (e.g. Individual: 12% → 10%)
  4. Enter new percentage and effective date
  5. Click "Save commission rate" [Click 3]
  6. Toast confirms: "Commission updated to 10% for Individual hosts."
Target: ≤ 3 clicks from Dashboard.
```

---

### Task 11: Find a Listing in a Given Wilaya Within a Price Range
- **Objective:** Locate specific available properties matching geographic and budgetary criteria.
- **Pourquoi ?** Assist a customer support ticket or verify pricing density in a regional market.
- **Comment ?** Open Listings page, choose wilaya filter, adjust price range slider, view instant table results.
- **Preconditions:** Listings catalog populated.
- **Initial State:** Home dashboard.
- **Click Count from Home:** **2 clicks** (Sidebar "Listings" [1] $\rightarrow$ Select wilaya dropdown [2]).

```
Goal: Find listings in a wilaya within price range
 SEQ
  1. Click "Listings" in Sidebar [Click 1]
  2. Filter by Wilaya (e.g. "Oran" [31]) [Click 2]
  3. Filter by Price: adjust slider or type max price (e.g. "15,000 DZD")
  4. Table instantly refreshes showing matching count: "14 listings match in Oran".
Target: ≤ 3 clicks from Dashboard.
```

---

### Task 12: Find All Hotels (or Agencies) in a Wilaya
- **Objective:** Retrieve all commercial institutional partners operating in a specific Algerian province.
- **Pourquoi ?** Assess local hospitality partnerships and conduct regional audits.
- **Comment ?** Open Hosts page, select "Hotels" or "Agencies" type tab, select wilaya filter.
- **Preconditions:** Hosts database populated.
- **Initial State:** Home dashboard.
- **Click Count from Home:** **3 clicks** (Sidebar "Hosts" [1] $\rightarrow$ Tab "Hotels" [2] $\rightarrow$ Select Wilaya [3]).

```
Goal: Find all hotels or agencies in a wilaya
 SEQ
  1. Click "Hosts" in Sidebar [Click 1]
  2. Click type tab "Hotels" (or "Agencies") [Click 2]
  3. Select Wilaya from inline filter (e.g. "Constantine" [25]) [Click 3]
  4. Result display: "8 hotels found in Constantine".
Target: ≤ 3 clicks from Dashboard.
```

---

### Task 13: Edit the Onboarding Steps for a Host Type
- **Objective:** Add, remove, or reorder required onboarding verification steps for a host category (e.g. add commercial license requirement for Hostels).
- **Pourquoi ?** Adapt onboarding workflows to changing legal mandates or tourism laws.
- **Comment ?** Navigate to Host sign-up steps, choose host category, toggle or reorder steps, save changes.
- **Preconditions:** Super Admin role.
- **Initial State:** Sidebar "Manage" collapsed group.
- **Click Count from Home:** **3 clicks** (Sidebar "Manage" [1] $\rightarrow$ "Host sign-up steps" [2] $\rightarrow$ Toggle step & save [3]).

```
Goal: Edit onboarding steps for a host type
 SEQ
  1. Expand "Manage" in Sidebar and click "Host sign-up steps" [Click 1 & 2]
  2. Select host type tab (e.g. "Agencies")
  3. Toggle step requirement or drag step order
  4. Click "Save onboarding steps" [Click 3]
  5. Toast confirms: "Onboarding steps updated."
Target: ≤ 3 clicks from Dashboard.
```

---

### Task 14: See How the Business is Doing This Month
- **Objective:** Evaluate core business health (bookings count, money paid by guests, platform earnings, new host growth) at a glance.
- **Pourquoi ?** Daily leadership tracking, operational situational awareness, and executive decision-making.
- **Comment ?** View the 4 Miller KPI cards on Home dashboard, select period "Last 30 days", inspect trend takeaway sentences.
- **Preconditions:** Admin session active.
- **Initial State:** Anywhere in console or newly opened browser.
- **Click Count from Home:** **0 to 1 click** (0 clicks if landing on Home; 1 click on "Last 30 days" switch if viewing a different period).

```
Goal: See how the business is doing this month
 SEQ
  1. View Home dashboard [0 clicks upon login]
  2. Verify period switch is set to "Last 30 days" (default) [0 clicks; 1 click if switching from Today]
  3. Read exactly 4 Miller cards:
      PAR:
        - "Bookings" → "128 bookings" ("12% more than previous 30 days")
        - "Money paid by guests" → "2,450,000 DZD" ("8% more than previous 30 days")
        - "DARNA earnings" → "310,000 DZD" ("10% more than previous 30 days")
        - "New hosts" → "14 new hosts" ("Same as before")
  4. Inspect Chart 1 takeaway title: "Bookings are up 12% this month"
  5. Inspect Chart 2 takeaway title: "Oran, Algiers and Tipaza bring the most bookings"
Cognitive load: < 10 seconds to grasp full state. 0 to 1 click.
```

---

## 3. Task Click Count Summary Table

| Task # | Task Description | Primary Destination | Click Count from Home | Compliance ($\le 3$) |
|:---:|---|---|:---:|:---:|
| **1** | Approve a new host | Dashboard Card $\rightarrow$ Approvals Drawer | **2 – 3 clicks** | ✅ Yes ($\le 3$) |
| **2** | Reject a host with reason | Dashboard Card $\rightarrow$ Rejection Dialog | **3 clicks** | ✅ Yes ($\le 3$) |
| **3** | Approve a listing | Dashboard Card $\rightarrow$ Listing Preview | **2 clicks** | ✅ Yes ($\le 3$) |
| **4** | Request changes on listing | Dashboard Card $\rightarrow$ Change Request Modal | **3 clicks** | ✅ Yes ($\le 3$) |
| **5** | Suspend a user or host | Sidebar $\rightarrow$ Table Row $\rightarrow$ Modal | **3 clicks** | ✅ Yes ($\le 3$) |
| **6** | Restore a deleted item | Table $\rightarrow$ Filter Status $\rightarrow$ Restore | **3 clicks** | ✅ Yes ($\le 3$) |
| **7** | Handle a flagged review | Dashboard Card $\rightarrow$ Review Action | **2 clicks** | ✅ Yes ($\le 3$) |
| **8** | Decide on a booking dispute | Dashboard Card $\rightarrow$ Dispute Drawer | **2 – 3 clicks** | ✅ Yes ($\le 3$) |
| **9** | Recharge a host wallet | Sidebar Money $\rightarrow$ Top-up Modal | **3 clicks** | ✅ Yes ($\le 3$) |
| **10** | Change a commission rate | Sidebar Money $\rightarrow$ Tiers $\rightarrow$ Edit | **3 clicks** | ✅ Yes ($\le 3$) |
| **11** | Find listing in wilaya by price | Sidebar Listings $\rightarrow$ Wilaya Filter | **2 clicks** | ✅ Yes ($\le 3$) |
| **12** | Find all hotels in a wilaya | Sidebar Hosts $\rightarrow$ Tab $\rightarrow$ Wilaya | **3 clicks** | ✅ Yes ($\le 3$) |
| **13** | Edit onboarding steps | Sidebar Manage $\rightarrow$ Onboarding Steps | **3 clicks** | ✅ Yes ($\le 3$) |
| **14** | See how business is doing | Home Dashboard | **0 – 1 click** | ✅ Yes ($\le 3$) |
