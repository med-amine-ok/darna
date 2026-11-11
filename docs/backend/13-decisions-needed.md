# 13. Decisions needed: who must decide what, and by when

> **In plain words**
> Building the backend needs some answers we cannot invent: product choices, legal checks, tax rules and technical picks.
> This page lists every decision still open, grouped by who decides: you (product owner), a lawyer, an accountant or bank, and the tech lead.
> For each one: the options, our recommendation, the milestone it blocks, and what happens if nobody decides.
> Decisions already taken (DEC-001 to DEC-015) are repeated first so you can see the whole picture.
> Legal and tax items are questions, not advice: VERIFY WITH A PROFESSIONAL.

**Terms used here** (see [glossary.md](glossary.md)):
- **Decision**: a choice that changes what we build. Once taken it gets a DEC number in [03-requirements.md](03-requirements.md) section 2.
- **Deadline (blocks)**: the roadmap milestone ([11-roadmap.md](11-roadmap.md)) that cannot finish without the answer.
- **Default**: what we build if nobody answers by the deadline. Every default here can be changed later by a setting or a data change unless marked "costly to change".
- **Setting**: a value in `platform_settings` that staff can change without new code.
- **PSP**: payment service provider (a licensed company allowed to move other people's money).
- **ANPDP**: Algeria's personal data protection authority.

IDs: Q (product) and L (legal) and F (finance) come from [14-open-questions.md](14-open-questions.md). T (tech lead) items are new on this page.

---

## 1. Decisions already made (for reference)

| ID | Decision | Date |
|---|---|---|
| DEC-001 | Money model M1: prepaid commission; guests pay hosts directly; ledger ready for M2 to M4 | 2026-11-04 |
| DEC-002 | Commission base = accommodation subtotal (nights x price after discount), no cleaning fee or taxes; trips and experiences: seats x price | 2026-11-04 |
| DEC-003 | New listings and trips need staff review before publication | 2026-11-04 |
| DEC-004 | One person can be an individual host and an organisation member, with an active-organisation switcher | 2026-11-04 |
| DEC-005 | Hotel is its own search vertical, counted in the home family for analytics | 2026-11-04 |
| DEC-006 | Trips are their own tables with departures | 2026-11-04 |
| DEC-007 | Keep the 12-step individual onboarding | 2026-11-04 |
| DEC-008 | Request-to-book reply window 24 h, as a setting | 2026-11-04 |
| DEC-009 | In an organisation, owner, admin and manager may answer requests | 2026-11-04 |
| DEC-010 | Host earnings count at completion | 2026-11-04 |
| DEC-011 | Three cancellation policies (flexible, moderate, strict) stored as time windows | 2026-11-04 |
| DEC-012 | Guests verify their phone before the first booking | 2026-11-04 |
| DEC-013 | Show 69 wilayas (codes 59 to 69 to confirm) | 2026-11-04 |
| DEC-014 | Individuals publish homes and vehicles; agencies experiences and trips; hotels and hostels their property | 2026-11-04 |
| DEC-015 | 8 experience types and 8 trip types, one shared list | 2026-11-04 |

Technical choices already taken in research: R-1 to R-11 in [02-research.md](02-research.md) section E (Django 6.1 + DRF + PostgreSQL/PostGIS + Celery/Redis + allauth headless; database-enforced availability; centimes and double-entry ledger; polling for messages; PostgreSQL search).

---

## 2. Summary

| Who decides | Count | Earliest deadline | Most urgent |
|---|---|---|---|
| Product owner | 15 (Q14 to Q28) | M0 | Q22 foreign phone numbers, Q28 verticals at launch |
| Lawyer | 16 (L1 to L16) | end of M5 (L1, L2) | **L1, L2** hosting and data transfer |
| Accountant or bank | 7 (F1 to F7) | M4 (F5 to F7) | F5 to F7 how to record and receipt deposits |
| Tech lead | 11 (T1 to T11, T5 already closed) | M0 | T1 hosting, T3 mock-to-API switch |
| **Total** | **49 (48 still open)** | | |

---

## 3. Product owner

Q14 to Q20 are the proposals already built into the schema (Phase 5); the default is the proposal. Q21 to Q28 are new (found while planning).

| ID | Decision | Options | Recommendation | Deadline (blocks) | If no decision |
|---|---|---|---|---|---|
| Q14 | How far below zero may a host's commission deposit go before instant booking switches off? | (a) 0 DZD; (b) 20,000 DZD for every host type; (c) per host type (e.g. individual 10,000, agency/hotel/hostel 50,000) | (c), starting at 20,000 for all, per host type in settings (BR-PAY-10) | M4 | 20,000 DZD for all; changeable by setting |
| Q15 | Above which top-up amount must a second finance person approve? | (a) never; (b) 500,000 DZD; (c) every top-up | (b) 500,000 DZD (BR-PAY-07) | M4 | 500,000 DZD; changeable by setting |
| Q16 | Hostels: own vertical shown under the "Hotels" search tab? | (a) own vertical under Hotels tab; (b) a hotel subtype; (c) own tab | (a) (ADR-005) | M2 | (a); changing later needs a data migration (costly to change) |
| Q17 | One room type per booking at launch (several rooms of that type allowed)? | (a) one type per booking; (b) mixed types in one booking | (a); mixed in a later release (ADR-003) | M3 | (a) |
| Q18 | Can a host withdraw unused deposit money, and how fast? | (a) no withdrawals; (b) on request, paid within 7 days after the 72 h hold; (c) only when the host leaves BLADUS | (c) at launch, (b) after L3 confirms it is not a payment service | M4 (withdrawal flow only) | (c): withdrawal only on closing the host account, handled manually by finance |
| Q19 | Minimum number of photos | (a) 5 for homes, 3 per room type; (b) 3 for all; (c) none | (a) (BR-MED-01) | M2 | (a); a setting |
| Q20 | Penalty when a host cancels | (a) none; (b) moderation case after 3 cancellations in 12 months; (c) fee | (b), no fee (BR-CAN-03) | M4 | (b) |
| Q21 | **New.** Launch geography: all 69 wilayas or a few pilot wilayas? | (a) all 69; (b) pilot (e.g. Algiers, Oran, Constantine, Béjaïa, Tizi Ouzou, Ghardaïa, Tamanrasset); (c) all, but marketing in pilots only | (c): no code limit, beta hosts recruited in pilot wilayas | M7 (beta recruitment) | (a) with no focus; beta harder to staff |
| Q22 | **New.** How do guests without an Algerian mobile verify (diaspora, foreigners)? DEC-012 and BR-ACC-01 only accept `+213[5-7]` | (a) Algerian mobile only; (b) any international mobile by SMS (higher cost and fraud); (c) email code for non-Algerian numbers plus stricter booking limits | (c) | M0 (sign-up) | (a): diaspora guests cannot book (risk K-28) |
| Q23 | **New.** Public launch date relative to the baccalaureate exams (internet cuts, usually June) and the summer season | (a) first week of June 2027, before the exams; (b) early July 2027, after the exams; (c) September | (b): closed beta in late May and June, public launch early July at the start of the summer season | M6 (to plan beta and marketing) | Launch falls in exam weeks; poor first impression (risk K-17) |
| Q24 | **New.** Who moderates at launch, and what review time do we promise hosts? | (a) 1 moderator, 2 working days; (b) 2 moderators, 1 working day; (c) outsourced | (b) during the beta and first 3 months | M2 | Queues grow, hosts give up (risk K-22) |
| Q25 | **New.** Must a host top up a first deposit before going live, or before instant booking? | (a) no, credit floor only; (b) first deposit before instant booking; (c) first deposit before publishing | (a) to grow supply, with the credit floor of Q14 | M4 | (a) |
| Q26 | **New.** Is a short request reply window (24 h) right for agencies whose trips depart weeks later? | (a) 24 h for all; (b) per host type setting; (c) per listing | (b): keep 24 h default, allow 48 h for agencies | M4 | (a) for all |
| Q27 | **New.** Support channels and hours at launch | (a) email and in-app only; (b) plus phone line; (c) plus WhatsApp Business | (c) WhatsApp Business with templates, office hours 9:00 to 18:00 Sunday to Thursday, on-call for safety issues | M7 | No clear channel; scams handled late |
| Q28 | **New.** Which verticals open at launch? | (a) all six (homes, hotels, hostels, experiences, vehicles, trips); (b) stays and trips first, vehicles and experiences later; (c) homes only | (a) if L5 and the vehicle rules (L4) allow; otherwise switch the blocked vertical off by setting | M2 | (a), with a legal risk for verticals whose rules are unclear |

## 4. Lawyer (VERIFY WITH A PROFESSIONAL)

| ID | Decision | Options | Recommendation (engineering view) | Deadline (blocks) | If no decision |
|---|---|---|---|---|---|
| L1 | Does Law 18-05 art. 8 ("hosted in Algeria", `.com.dz`) apply to BLADUS as an intermediary, and to the API server too? | (a) yes, everything in Algeria; (b) only the public website; (c) does not apply | Plan for (a) | **End of M5** (hosting contract), hard gate M7 | We host everything in Algeria anyway (safe default, higher ops cost) |
| L2 | Does storing personal data or backups abroad need ANPDP authorisation (Law 18-07 / 25-11)? Which declarations before launch? | (a) all data and backups in Algeria; (b) abroad with authorisation | (a), and file the declarations before M7 | **End of M5**, hard gate M7 | No real personal data can be processed: launch blocked |
| L3 | Is collecting guest money and paying hosts a payment service (Règlement 25-02)? Is the prepaid deposit model safe, including deposit withdrawals? | (a) M1 safe, withdrawals safe; (b) M1 safe, withdrawals only on closure; (c) partner bank or PSP needed | Confirm (a) or (b) for MVP; (c) for M2 to M4 | M4 for withdrawals (Q18); LATER for PAY-10 | Withdrawals only on account closure; PAY-10 stays off |
| L4 | Which documents must each host type provide (individual home, chez l'habitant, agency, hotel, hostel, vehicle rental, guide)? | List per host type | Draft list from [02-research.md](02-research.md) C3.5, confirmed by the lawyer | Draft by end of M1, final before M7 | Draft list used for real hosts: compliance risk (K-04) |
| L5 | Is whole-home short-term rental legal for individuals, and what must BLADUS check? | (a) legal with checks; (b) only "chez l'habitant"; (c) not allowed | Ask for the list of checks | M7 | Individual home vertical may need to be switched off by setting |
| L6 | Duty to declare foreign guests (Law 08-11 art. 29): whose duty, what must BLADUS store? | (a) host's duty, BLADUS reminds; (b) BLADUS must store and transmit | (a) with nationality captured only when needed | R2-B (PRV-06); earlier if (b) | Host reminder text only |
| L7 | Retention periods for IDs, bookings, messages, invoices. Is a DPO required? | Periods per data type | ID images 90 days after decision; accounting 10 years; messages 2 years after last booking | M6 (retention jobs) | Proposed periods used (BR-PRV-05) |
| L8 | **New.** Terms of use, host terms and privacy notice texts in ar/fr/en, versioned for consent records | Lawyer drafts or reviews our draft | Lawyer reviews our draft | M6 (consent versions live before beta) | No valid terms at beta: launch blocked |
| L9 | **New.** Does BLADUS itself need a tourism registration or travel agency licence (Law 99-06, Décret 17-161) because it sells agency trips and experiences? | (a) no, pure intermediary; (b) licence needed; (c) only if BLADUS takes payment | Ask; keep BLADUS out of the money flow for trips (M1) | M7 | Trips vertical may need to be switched off at launch |
| L10 | **New.** Do foreign service providers that touch personal data (transactional email, international SMS fallback, error tracking, uptime monitoring) count as transfer abroad? | (a) yes, all need authorisation; (b) allowed with contract clauses; (c) allowed for some data types | Assume (a); use Algerian or self-hosted services where possible (T8) | M6 | We self-host or use Algerian providers only (higher cost) |
| L11 | **New.** Company formalities before launch: commerce register activity code for an online marketplace, CNRC e-commerce registration, `.com.dz` domain holder | Checklist | Lawyer provides the checklist in M0 | M7 | Launch blocked by missing registration |
| L12 | **New.** Does the booking flow meet Law 18-05 art. 10 to 13 (offer content, 3-step order: review, confirm, contract) for both instant and request bookings? | (a) current flow is enough; (b) changes needed | Ask with screenshots of the flow | M6 | Risk of a non-compliant checkout; late UI changes |
| L13 | **New (from 08).** Exact content, addressee and start of the 5-day breach notification clock; duty to inform affected users | (a) clock starts at detection; (b) at confirmation | Ask for the official ANPDP procedure and template | M6 | Runbook timing may be wrong in a real breach |
| L14 | **New (from 08).** Legal basis for each processing in the register (contract, consent, legal obligation, legitimate interest as recognised by Law 18-07) | per processing line in 08 section 12.2 | Lawyer reviews the register table line by line | M6 | Register incomplete at the ANPDP declaration |
| L15 | **New (from 08).** Deadlines to answer access, correction and deletion requests, and which identity checks are allowed first | (a) 30 days; (b) shorter legal deadline | Use 30 days until confirmed | M6 | Requests answered late |
| L16 | **New (from 08).** May BLADUS publish a reviewer's first name and the host's name without separate consent? | (a) yes under the terms; (b) separate consent; (c) initials only | (c) initials until answered | M6 | Possible complaint from a reviewer |

## 5. Accountant or bank (VERIFY WITH A PROFESSIONAL)

| ID | Decision | Options | Recommendation (engineering view) | Deadline (blocks) | If no decision |
|---|---|---|---|---|---|
| F1 | VAT on BLADUS commission: 19% or 9% (tourism)? Who issues which invoice? | 19%; 9% until end of 2027; depends on host type | Store the VAT rate per invoice line so either works | R2-A (PAY-11) | Invoices not issued; R2-A blocked |
| F2 | Taxe de séjour: does BLADUS collect it or only show it? | (a) show only, host pays; (b) BLADUS collects | (a) for M1 | R2-A (PRC-04) | Tax lines stay hidden |
| F3 | Chargily or SlickPay: contract terms, settlement delays, amount units in their APIs | Chargily first, SlickPay second (R-7) | Sign Chargily; test amount units in sandbox | R2-A (PAY-06); paperwork starts M6 | Online top-up delayed |
| F4 | Invoice numbering and retention for commission invoices | Yearly sequence without gaps; 10 years | As BR-PAY-12 | R2-A (PAY-11) | Invoices not issued |
| F5 | **New.** Before PAY-11 (R2), what must BLADUS give a host at launch for each top-up and each commission deducted: a receipt, a monthly statement, or a full invoice? | (a) receipt per top-up and monthly statement; (b) invoice from day one | Ask; (b) would move PAY-11 into the MVP | M4 | Hosts get only the wallet history (PAY-08); possible non-compliance |
| F6 | **New.** Accounting treatment of the prepaid deposit: customer advance (liability) until commission is deducted, then revenue? When is VAT due? | (a) liability then revenue at deduction; (b) revenue at top-up | (a), which matches the ledger accounts (BR-PAY-03) | M4 | Ledger accounts may need renaming; reports wrong |
| F7 | **New.** Which bank or CCP account receives host top-ups, and in what format can we get statements for daily reconciliation? | Bank account; CCP account; both | Both, with CSV statements | M4 (account opened before M7) | Manual reconciliation only (risk K-07) |

## 6. Tech lead

| ID | Decision | Options | Recommendation | Deadline (blocks) | If no decision |
|---|---|---|---|---|---|
| T1 | Production hosting provider in Algeria (staging can be anywhere with demo data) | ICOSNET; Djezzy Cloud; another Algerian data centre | Trial ICOSNET and Djezzy Cloud on staging in M1 to M4; sign by end of M5 | Staging: M0. Production: end of M5 (blocks M7) | No production environment in time; launch slips |
| T2 | Where the backend code lives | (a) `backend/` folder in this repository (monorepo); (b) separate repository | (a): one pull request can change API and both apps; shared CI | M0 | Developers start in different places; merge pain |
| T3 | Mock-to-API switch mechanism and demo data identity | (a) per-module env flag `DATA_SOURCE_<MODULE>` on the Next.js server + API seeded with the same demo cast and a map from old IDs to UUIDs; (b) big-bang switch; (c) per-function flags | (a) | M0 | Big-bang switch late in the plan (risk K-13) |
| T4 | How the two Next.js servers hold the Django session | (a) allauth headless app tokens stored in an httpOnly cookie on the Next.js server; (b) Django session cookie shared on a common domain; (c) JWT | (a): revocable server-side (ACC-03) | M0 | Sign-in cannot ship |
| T5 | Small schema gaps found while planning | **Closed on 2026-11-09**: `incident_record`, `calendar_feed` and `otp_send_log` were added to `schema.dbml` | Done | n/a | n/a |
| T6 | Object storage and virus scanning in Algeria | (a) MinIO self-hosted + ClamAV; (b) provider S3-compatible storage if offered | (a) unless the chosen provider offers (b) in Algeria | M1 (documents) | KYC upload blocked |
| T7 | Text search in Arabic, French and English | (a) PostgreSQL unaccent + trigram + Arabic normalisation + place-name alias table; (b) self-hosted Meilisearch | (a) (R-11), with a 50-query test set; revisit (b) if the zero-result rate stays high | M3 | Weak Arabic search (risk K-15) |
| T8 | Third-party processors that see personal data | Email: Algerian SMTP relay or self-hosted vs Resend/Brevo; SMS: local aggregator + fallback; errors: self-hosted GlitchTip/Sentry vs SaaS; uptime: self-hosted | Prefer Algerian or self-hosted for anything with personal data; final list reviewed by the lawyer (L10) | M0 (interfaces), M6 (final providers) | Data transfer risk (K-02) |
| T9 | Typed API client for both apps | (a) openapi-typescript + openapi-fetch; (b) orval; (c) hand-written | (a): small, no runtime magic | M0 | Drift between API and apps |
| T10 | Second location for backups and restore drills | (a) second Algerian provider; (b) second data centre of the same provider; (c) abroad (needs L2) | (a) for provider independence | Decide in M6, running in M7 | Backups in one place only (risk K-19) |
| T11 | Six new staff permissions proposed in 06 and 08: `kyc.view_documents`, `privacy.handle_requests`, `wallets.approve_large_topup`, `reports.view`, `ledger.adjust` (plus a later `privacy_officer` role) | (a) add to the permission seed now; (b) reuse existing permissions | (a): least privilege for ID documents, four-eyes top-ups, read-only reporting | M1 (staff sign-in) | Moderators keep broad access to ID documents |

---

## Check yourself

- [ ] Which two lawyer answers have the earliest hard deadline, and why that milestone?
- [ ] What happens by default if nobody answers Q22 (foreign phone numbers)?
- [ ] Which accountant question could move commission invoices (PAY-11) into the MVP, and with which answer?
- [ ] Why is Q18 (deposit withdrawals) linked to a legal question?
- [ ] Which decisions can be changed later by a setting, and which one is marked costly to change?
- [ ] Which tech decision makes "one module at a time behind a flag" possible?
- [ ] Find the decision that keeps BLADUS from needing a PSP licence at launch.
