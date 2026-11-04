# 14. Open questions (running list)

> **In plain words**
> Questions the code, the spec and the research could not answer. Some need you, some need a lawyer or accountant.
> This list is kept up to date after each phase. The ones that block design are marked **blocking**.

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

### Raised by the schema (Phase 5), open

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

| # | Question |
|---|---|
| F1 | VAT on BLADUS commission: 19% or 9% (tourism)? Who issues which invoice? |
| F2 | Taxe de séjour: does BLADUS collect it or only show it? |
| F3 | Chargily or SlickPay contract terms, settlement delays, amount units in their APIs. |
| F4 | Invoice numbering and retention rules for commission invoices to hosts. |
