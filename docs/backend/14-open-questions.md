# 14. Open questions (running list)

> **In plain words**
> Questions the code, the spec and the research could not answer. Some need you, some need a lawyer or accountant.
> This list is kept up to date after each phase. The ones that block design are marked **blocking**.

**Status (2026-11-09, Phase 8):**
- Q1 to Q13: decided (DEC-001 to DEC-013); DEC-014 and DEC-015 were added later by the product owner.
- **Moved to [13-decisions-needed.md](13-decisions-needed.md)** with options, recommendation, deadline (roadmap milestone) and the default if nobody decides: **Q14 to Q20**, **L1 to L7**, **F1 to F4**, and the new items below (**Q21 to Q28**, **L8 to L12**, **F5 to F7**). The tables on this page stay as the running record; answers are written here and in 13 when they arrive.
- New technical decisions for the tech lead (**T1 to T10**: hosting provider, mock-to-API switch, session model, storage, search, processors, backups) are listed only in [13-decisions-needed.md](13-decisions-needed.md) section 6.
- Deadlines refer to the milestones in [11-roadmap.md](11-roadmap.md). The most urgent outside answers are **L1 and L2, needed by the end of M5**.

Started 2026-11-04 (end of Phase 2). On 2026-11-04 the product owner accepted all defaults for Q1 to Q13; they are recorded as decisions DEC-001 to DEC-013 in `03-requirements.md` section 2.

## For you (product owner)

|   | Question | Blocking? | Answer |
|---|---|---|---|
| Q1 | Money model: does BLADUS only take a commission (host pre-pays a deposit, guest pays host), or collect guest payments and pay hosts out? | **blocking** | **Decided 2026-11-04 (default accepted):** M1 prepaid commission, ledger ready for later models |
| Q2 | Commission base: accommodation subtotal (website today), base price (admin), or full total incl. cleaning fee? | **blocking** | **Decided 2026-11-04 (default accepted):** Subtotal (nights x price), excluding cleaning fee and taxes |
| Q3 | Must new listings and trips be approved by staff before going live? | **blocking** | **Decided 2026-11-04 (default accepted):** Yes: `pending_review` first; hosts with a good history can be fast-tracked later |
| Q4 | Can one person be an individual host and also a member of organisations at the same time? | **blocking** | **Decided 2026-11-04 (default accepted):** Yes, with an active-organisation switcher |
| Q5 | Is "hotel" its own vertical or a kind of home? | **blocking** | **Decided 2026-11-04 (default accepted):** Own vertical in search, `home` family in analytics |
| Q6 | Trips: own tables with departures (seats, price, status per date)? | **blocking** | **Decided 2026-11-04 (default accepted):** Yes |
| Q7 | Is the admin's 2-step cap on the individual onboarding intended? | no | **Decided 2026-11-04 (default accepted):** No: keep the 12 steps |
| Q8 | Request-to-book reply window: keep 24 hours? configurable? | no | **Decided 2026-11-04 (default accepted):** 24 h, platform setting |
| Q9 | Who in an organisation may accept or decline a booking request? | no | **Decided 2026-11-04 (default accepted):** owner, admin, manager |
| Q10 | When are host earnings counted: at confirmation, check-in or check-out? | no | **Decided 2026-11-04 (default accepted):** At check-out (completed) |
| Q11 | Cancellation policies: keep flexible / moderate / strict, or add more? | no | **Decided 2026-11-04 (default accepted):** Keep three, stored as windows |
| Q12 | Do guests need phone verification before their first booking? | no | **Decided 2026-11-04 (default accepted):** Yes, phone OTP |
| Q13 | Which wilaya count do the apps show until the official codes 59 to 69 are confirmed? | no | **Decided 2026-11-04 (default accepted):** 69 |

### Raised by the schema (Phase 5), open (moved to 13-decisions-needed.md on 2026-11-09)

These are proposals built into the schema and rules. Each one can be changed without a redesign.

| # | Question | Blocking? | Proposal in the schema |
|---|---|---|---|
| Q14 | How far below zero may a host's commission deposit go before instant booking is switched off? | no | 20,000 DZD, per host type in settings (BR-PAY-10) |
| Q15 | Above which top-up amount must a second finance person approve? | no | 500,000 DZD (BR-PAY-07) |
| Q16 | Hostels: their own vertical, shown under the "Hotels" search tab? | no | Yes (ADR-005) |
| Q17 | One room type per booking at launch (several rooms of the same type allowed)? | no | Yes; mixed room types later (ADR-003) |
| Q18 | Can a host withdraw unused deposit money, and how fast? | no | Yes, on request, paid by finance within 7 days, after the 72 h hold rule |
| Q19 | Minimum number of photos | no | 5 for homes, 3 per room type (BR-MED-01) |
| Q20 | Host cancellation penalty | no | Moderation case after 3 host cancellations in 12 months; no fee (BR-CAN-03) |

## For a lawyer (VERIFY WITH A PROFESSIONAL)

L1 to L7 moved to [13-decisions-needed.md](13-decisions-needed.md) section 4 on 2026-11-09 (still open).

| # | Question |
|---|---|
| L1 | Does Law 18-05 art. 8 ("hosted in Algeria", `.com.dz`) apply to BLADUS as an intermediary, and to the API server as well as the website? |
| L2 | Does storing personal data or backups abroad need ANPDP authorisation under Law 18-07 as amended by Law 25-11? Which declarations must BLADUS file before launch? |
| L3 | Is collecting guest money and paying hosts a payment service under Règlement 25-02? Is the prepaid commission deposit model safe? |
| L4 | Which documents must each host type provide (individual home, "chez l'habitant", agency, hotel, hostel, vehicle rental, guide)? |
| L5 | Is whole-home short-term rental legal for individuals, and what must BLADUS check? |
| L6 | Duty to declare foreign guests (Law 08-11 art. 29): whose duty, and what must BLADUS store? |
| L7 | Data retention periods for IDs, bookings, messages and invoices. Is a DPO required? |

## For an accountant or bank

F1 to F4 moved to [13-decisions-needed.md](13-decisions-needed.md) section 5 on 2026-11-09 (still open).

| # | Question |
|---|---|
| F1 | VAT on BLADUS commission: 19% or 9% (tourism)? Who issues which invoice? |
| F2 | Taxe de séjour: does BLADUS collect it or only show it? |
| F3 | Chargily or SlickPay contract terms, settlement delays, amount units in their APIs. |
| F4 | Invoice numbering and retention rules for commission invoices to hosts. |

## Added 2026-11-09 (Phase 8: roadmap, risks, decisions)

Found while planning the build. All are open and listed with options and deadlines in [13-decisions-needed.md](13-decisions-needed.md).

### For you (product owner)

| # | Question | Blocking? | Deadline | Proposal |
|---|---|---|---|---|
| Q21 | Launch geography: all 69 wilayas or a few pilot wilayas? | no | M7 | All open, beta hosts recruited in pilot wilayas |
| Q22 | How do guests without an Algerian mobile (diaspora, foreigners) verify? DEC-012 and BR-ACC-01 only accept `+213[5-7]` numbers | **blocking** (sign-up) | M0 | Email code for non-Algerian numbers, stricter booking limits |
| Q23 | Public launch date relative to the baccalaureate exams (internet cuts, usually June) and the summer season | no | M6 | Closed beta May to June, public launch early July 2027 |
| Q24 | Who moderates at launch, and what review time do we promise hosts? | no | M2 | 2 moderators, 1 working day |
| Q25 | Must a host top up a first deposit before going live or before instant booking? | no | M4 | No, the credit floor (Q14) is enough |
| Q26 | Is the 24 h request reply window right for agencies whose trips depart weeks later? | no | M4 | 24 h default, 48 h for agencies (setting per host type) |
| Q27 | Support channels and hours at launch | no | M7 | WhatsApp Business + email + in-app, office hours Sunday to Thursday |
| Q28 | Which verticals open at launch? | no | M2 | All six, unless a legal answer (L4, L5, L9) closes one; closed by setting |

### For a lawyer (VERIFY WITH A PROFESSIONAL)

| # | Question |
|---|---|
| L8 | Terms of use, host terms and privacy notice texts in ar/fr/en, versioned for consent records (PRV-01). Who drafts, who signs off? |
| L9 | Does BLADUS itself need a tourism registration or travel agency licence (Law 99-06, Décret 17-161) because it lists and books agency trips and experiences? |
| L10 | Do foreign service providers that touch personal data (transactional email, international SMS fallback, error tracking, uptime monitoring) count as a transfer abroad needing ANPDP authorisation? |
| L11 | Company formalities before launch: commerce register activity code for an online marketplace, CNRC e-commerce registration, holder of the `.com.dz` domain. |
| L12 | Does the booking flow (instant and request) meet Law 18-05 art. 10 to 13 (offer content, 3-step order: review, confirm, contract)? |

### For an accountant or bank

| # | Question |
|---|---|
| F5 | Before commission invoices (PAY-11, R2), what must BLADUS give a host at launch for each top-up and each commission deducted: a receipt, a monthly statement, or a full invoice? |
| F6 | Accounting treatment of the prepaid deposit: customer advance (liability) until commission is deducted, then revenue? When is VAT due? |
| F7 | Which bank or CCP account receives host top-ups, and can we get statements in a format fit for daily reconciliation? |


---

## Check yourself

- [ ] Which product questions were decided on 2026-11-04, and where are they recorded?
- [ ] Where do the open questions go once they become decisions to make?
- [ ] Which questions need a lawyer, and which need an accountant or bank?
- [ ] What is the default if a product question is not answered in time?
