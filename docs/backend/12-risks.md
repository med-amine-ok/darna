# 12. Risks: what could go wrong, and what we do about it

> **In plain words**
> This is the list of things that could hurt BLADUS while we build and launch the backend: legal, money, fraud, technical, operations, team and scope.
> Each risk gets two marks from 1 to 5: how likely it is, and how bad it would be. Multiplied, they give a score from 1 to 25.
> Each risk has an owner (a role, not a name), what we do to reduce it, and the early sign that tells us it is happening.
> The heat map at the end shows the dangerous corner at a glance. We review this list at every milestone review ([11-roadmap.md](11-roadmap.md)).
> Legal and tax points are engineering reading, not advice: VERIFY WITH A PROFESSIONAL.

**Terms used here** (see [glossary.md](glossary.md)):
- **Risk register**: a table of risks, kept up to date, with owners and actions.
- **Likelihood (L)**: 1 rare, 2 unlikely, 3 possible, 4 likely, 5 almost certain (during the MVP build and first 6 months after launch).
- **Impact (I)**: 1 small annoyance, 2 a few days lost, 3 a feature late or a few unhappy users, 4 launch delayed or money lost, 5 legal stop, data breach or loss of trust.
- **Score**: L x I. **15 to 25 high**, **8 to 14 medium**, **1 to 7 low**.
- **Mitigation**: what we do now to make the risk smaller or less harmful.
- **Trigger / early signal**: what we would see first if the risk starts to happen.
- **SMS pumping**: fraud where bots request many one-time codes to numbers that earn the attacker money.
- **SIM swap**: a criminal gets a victim's phone number moved to a new SIM card and receives their codes.
- **Exclusion constraint**: a PostgreSQL rule that refuses two rows whose ranges overlap (used against double booking).
- **PSP**: payment service provider, a licensed company allowed to hold and move other people's money.

Owner roles: **PO** product owner, **TL** tech lead, **BE** backend developers, **FE** frontend developer, **LAW** external lawyer, **ACC** external accountant, **FIN** BLADUS finance staff, **MOD** moderation lead, **SUP** support lead.

---

## 1. Risk register

| ID | Risk | L | I | Score | Owner | Mitigation | Trigger / early signal | Linked |
|---|---|---|---|---|---|---|---|---|
| K-01 | **Legal: hosting.** Law 18-05 art. 8 requires the e-commerce site to be hosted in Algeria with `.com.dz`; production abroad could be unlawful (VERIFY WITH A PROFESSIONAL) | 3 | 5 | **15** | PO + LAW | Plan production in Algeria from day one (R-5); staging with demo data only; ask L1 early; keep the deployment portable (containers, no cloud-only services) | Lawyer says the API server is covered too; Algerian provider cannot give a date | PRV-03, BR-PRV-04, R-5, R-6, L1, T1 |
| K-02 | **Legal: data transfer abroad** through foreign services (email, SMS fallback, error tracking, CI logs, backups) without ANPDP authorisation under Law 18-07 / 25-11 (VERIFY WITH A PROFESSIONAL) | 4 | 4 | **16** | TL + LAW | List every processor (T8); self-host error tracking; keep personal data out of logs; local SMS aggregator first; no backups abroad; ask L2 and L10 | A new SaaS appears in the stack; personal data found in logs or error reports | PRV-03, NFR-09, BR-PRV-04, L2, L10, T8 |
| K-03 | **Legal: PSP licence.** Collecting guest money (M2 to M4), or even refunding host deposits, may be a payment service under Règlement 25-02 (VERIFY WITH A PROFESSIONAL) | 2 | 5 | 10 | PO + LAW | Launch with M1 only (DEC-001); M2 to M4 switched off by setting (BR-PAY-11); deposit withdrawals only after L3 | Pressure to "just take card payments"; a host asks for a refund of deposit | PAY-10, BR-PAY-11, DEC-001, Q18, L3 |
| K-04 | **Legal: KYC.** Wrong document list per host type, or storing ID images longer than allowed, or without the required declaration (VERIFY WITH A PROFESSIONAL) | 3 | 4 | 12 | PO + LAW | Document types as data (change without code); private bucket, 5-minute signed URLs, every view audited; delete ID images after 90 days (BR-PRV-05) pending L7 | Moderators ask for documents not on the list; L4 answer differs from the draft | HST-03, MED-02, MOD-08, BR-HST-03, BR-PRV-05, L4, L7 |
| K-05 | **Legal: tourism rules.** Agencies need a licence; "chez l'habitant" has room and guest caps; whole-home rental by individuals has no clear frame; BLADUS itself might need a tourism registration to sell trips (VERIFY WITH A PROFESSIONAL) | 3 | 4 | 12 | PO + LAW | Agency licence number required at verification (BR-TRP-01); verticals and host types switchable by setting; ask L5 and L9 | Ministry or wilaya warning; a competitor shut down; lawyer flags L9 | TRP-01, HST-07, LST-01, BR-TRP-01, BR-HST-05, L5, L9 |
| K-06 | **Tax and invoices.** Wrong VAT rate on commission (19% or 9%), no receipts for deposits at launch, missing tourist tax handling (VERIFY WITH A PROFESSIONAL) | 3 | 3 | 9 | ACC + FIN | Invoices in R2 behind F1 and F4; ask F5 now about receipts at launch; keep every ledger line with host NIF so invoices can be issued backwards | Accountant asks for documents we cannot produce; a host asks for an invoice | PAY-11, PRC-04, BR-PAY-12, BR-PRC-04, F1, F2, F4, F5 |
| K-07 | **Payments: manual top-ups.** Typing errors, the same receipt credited twice, fake bank or CCP receipts | 3 | 3 | 9 | FIN | Receipt reference unique per method; four-eyes above a threshold (Q15); daily reconciliation against the bank or CCP statement (F7); audit of every top-up | Reconciliation mismatch; a top-up reversed by the bank | PAY-05, BR-PAY-07, STF-03, Q15, F7 |
| K-08 | **Payments: gateway (R2).** Chargily contract slow; amount units (dinars or centimes) misread; webhooks missed or replayed | 3 | 3 | 9 | TL + FIN | Start paperwork in M6; contract test on amount units (F3); store raw webhook, verify signature, dedupe by event id (BR-SYS-02); second gateway (SlickPay) as fallback | Contract not signed 4 weeks before R2-A; sandbox amounts off by 100 | PAY-06, PAY-09, BR-PAY-08, BR-SYS-02, R-7, F3 |
| K-09 | **Fraud: off-platform payment scams and fake listings.** Fake host asks for a CCP transfer before arrival; stolen photos | 4 | 4 | **16** | MOD + SUP | Review before publication (DEC-003); contact masking until confirmation (BR-MSG-01); perceptual photo hash for duplicates (BR-MED-01); risk flags in R2 (MOD-07); guest safety tips in the UI | Reports mentioning "paid by CCP, host vanished"; duplicate photo hashes across hosts | LST-02, MSG-04, MED-01, MOD-07, BR-MSG-01, BR-MOD-04 |
| K-10 | **Fraud: SMS pumping and OTP abuse** driving SMS cost up | 3 | 3 | 9 | TL | Limits per phone, IP and device (BR-ACC-02); daily SMS budget alarm (NFR-11); block premium and foreign ranges unless Q22 allows; email OTP where possible | SMS spend per day above budget; many codes to one prefix | ACC-02, NFR-11, BR-ACC-02, Q22 |
| K-11 | **Fraud: account takeover** of hosts or staff (SIM swap, password reuse) | 2 | 4 | 8 | TL | 2FA for staff and for hosts before payout detail changes (BR-ACC-04); 72 h hold after a change (BR-PAY-09); notify old email and phone | Payout account changes followed by support complaints | ACC-05, HST-05, BR-ACC-04, BR-PAY-09 |
| K-12 | **Technical: double booking** if the database guarantees are built wrong (exclusion constraint, inventory rows, holds) | 2 | 5 | 10 | BE | Constraints in the database, not only in Python (ADR-002); concurrency tests on real PostgreSQL in CI (M4 exit); idempotency keys on create (BKG-10) | Any concurrency test flaky; support ticket "two guests same night" | AVL-01, AVL-02, AVL-05, BKG-10, BR-AVL-01, BR-AVL-02, BR-SYS-01 |
| K-13 | **Technical: mock-to-API switch** breaks pages: different IDs, enum names, field names (58 vs 69 wilayas, statuses), behaviour the mock did silently | 4 | 3 | 12 | FE + TL | One module at a time behind a flag (roadmap section 2); demo cast seeded with stable IDs (T3); enum mapping from [05-database-schema.md](05-database-schema.md) section 8; typed client (NFR-08); 5 days on staging before a module counts as switched | A module is rolled back twice; contract tests fail after an API change | NFR-08, NFR-13, T3, T9, schema section 8 |
| K-14 | **Technical: performance.** Search with facets, availability and map is slow on small Algerian VPS sizes | 3 | 3 | 9 | BE | Search table `listing_search_doc` (ADR-011); indexes from schema section 7; load test from M3, enforced in M6; cache facet counts briefly | Search p95 above 500 ms on staging data | NFR-01, NFR-02, SRC-01, SRC-02 |
| K-15 | **Technical: Arabic search quality.** Spelling variants (alef forms, ta marbuta), Latin transliterations (Tizi Ouzou, Tizi-Ouzou), Darija names; PostgreSQL trigram works less well on Arabic | 4 | 3 | 12 | BE | Normalise Arabic text before indexing; alias table for place names in three scripts from the geography seed; test set of 50 real queries (T7) | Zero-result rate above 10% for Arabic queries | SRC-03, SRC-04, T7 |
| K-16 | **Operations: SMS deliverability and cost.** Codes not arriving on some operators (Mobilis, Djezzy, Ooredoo), sender ID registration delays, about USD 0.27 per SMS abroad | 4 | 4 | **16** | TL + PO | `SmsProvider` interface with a local aggregator first and a fallback (R2 C.2); email and WhatsApp codes where possible; measure delivery per operator from the beta; budget alarm | Code verification rate below 85%; complaints "no code received" | ACC-01, ACC-02, NTF-02, BR-NTF-02, DEC-012 |
| K-17 | **Operations: internet restrictions during the baccalaureate exams** (usually June; mobile data and social networks cut or slowed nationwide) during launch or high season | 4 | 3 | 12 | PO | Do not launch in the exam weeks (Q23); SMS (not internet) for critical alerts; job schedules tolerate delays (expiry at deadline even if nobody is online); communicate in advance | Official exam calendar published; cuts announced | NFR-03, BKG-03, Q23 |
| K-18 | **Operations: single hosting provider in Algeria.** Outage, slow support, few managed services (no managed PostgreSQL or object storage), contract lead time | 3 | 4 | 12 | TL | Choose provider by end of M5 (T1); infrastructure as code so we can move; self-managed PostgreSQL with streaming replica; MinIO for files (T6); status page | Provider cannot give a date; repeated incidents on staging trial | NFR-03, NFR-04, PRV-03, T1, T6, R-5 |
| K-19 | **Operations: backups.** No second Algerian location, or restores never tested | 3 | 4 | 12 | TL | Second Algerian data centre or provider for encrypted dumps (T10); monthly restore drill (NFR-04); point-in-time recovery 7 days | A restore drill fails or is skipped | NFR-04, PRV-03, T10 |
| K-20 | **Team and skills.** Two backend developers: bus factor of 1 on ledger and availability; PostGIS, Celery and allauth headless new to the team; half-time frontend developer is the bottleneck for switches | 4 | 4 | **16** | PO + TL | Pair on ledger and booking code; written ADRs; code review by the other developer always; spike weeks in M0 for allauth and PostGIS; frontend switch tasks planned in the chart; budget for a second frontend half-time in M4 | Switch tasks slip twice; one developer is the only reviewer of a module | NFR-10, roadmap A1 |
| K-21 | **Scope creep.** R2 items (online payment, coupons, realtime chat, disputes) or new admin wishes pulled into the MVP | 4 | 3 | 12 | PO | New ideas go to R2 by default; any MVP addition must remove something of equal size; milestone reviews check the scope list | Requirements count in MVP grows above 126; milestone slips by more than a week | [03-requirements.md](03-requirements.md) section 5, DEC-001 |
| K-22 | **Moderation backlog at launch.** Listings stuck in `pending_review`, hosts give up | 3 | 3 | 9 | MOD | Queues with waiting time and priority (MOD-01); reason catalogue (MOD-03); staffing decision (Q24); fast track for good hosts later (DEC-003) | Oldest item in the listing queue older than 2 days | MOD-01, MOD-03, LST-02, BR-MOD-01, Q24 |
| K-23 | **Legal answers arrive late** (L1, L2, L4, L5, L9, L11) and block production | 4 | 4 | **16** | PO | Engage the lawyer in M0; give the lawyer this blueprint's questions in writing; dated gates in the roadmap; design so that a negative answer is a setting, not a rewrite | No written answer to L1 or L2 by mid-M5 | L1 to L12, roadmap section 6 |
| K-24 | **Calendar slip** from Ramadan, Eids and year-end holidays | 4 | 2 | 8 | PO + TL | Longer M3 and M4; 2-week buffer; no launch in Ramadan | Velocity in M3 lower than 70% of M2 | roadmap A3 |
| K-25 | **Business: hosts do not pay back negative balances** under model M1 | 3 | 2 | 6 | FIN | Credit floor per host type (BR-PAY-10, Q14); below 0 instant booking switches to request; dashboard of negative wallets (PAY-07) | Total negative balance grows month over month | PAY-07, BR-PAY-10, Q14, Q25 |
| K-26 | **Security breach**, especially of KYC documents, with a 5-day ANPDP notification duty | 2 | 5 | 10 | TL | OWASP API Top 10 controls (NFR-05); private documents with short signed URLs (MED-02); breach runbook and drill (PRV-05); external review in M6 | Unusual document view counts in the audit log; dependency alert | NFR-05, MED-02, PRV-05, STF-03, BR-MED-02 |
| K-27 | **Geography data wrong** for the new wilayas 59 to 69 | 3 | 2 | 6 | BE | Seed with `source` and `valid_from` (BR-SRC-02); check against the official journal before M7; correction is a data migration | Hosts in new wilayas report the wrong name or commune | SRC-04, BR-SRC-02, DEC-013 |
| K-28 | **Diaspora and foreign guests cannot verify** because phone OTP accepts only Algerian mobiles (DEC-012) | 4 | 3 | 12 | PO | Decide Q22 in M0 (email or international number verification for non-Algerian numbers, with stricter limits) | Sign-up drop-off from abroad; support requests from France and Canada | ACC-01, ACC-02, BR-ACC-01, DEC-012, Q22 |
| K-29 | **Email deliverability** (spam folders) and low email use by some hosts | 3 | 2 | 6 | TL | SPF, DKIM, DMARC on the sending domain; SMS for critical events (BR-NTF-02); in-app notifications always | Bounce or complaint rate above 2% | NTF-02, ACC-04, BR-NTF-02 |
| K-30 | **Map and geocoding services** (OpenFreeMap tiles, Nominatim 1 request per second) limit or change terms | 2 | 2 | 4 | BE | Server-side geocoding with cache; commune plus pin, no autocomplete on public Nominatim; self-host tiles if needed | Tile errors or 429 responses | SRC-02, LST-06 |
| K-31 | **Money rounding errors** between centimes and whole dinars, or between quote and booking | 2 | 4 | 8 | BE | Centimes everywhere (BR-PAY-01); one rounding helper; property tests and the worked examples in [04-business-rules.md](04-business-rules.md) as tests | Ledger reconciliation off by a few centimes | PAY-12, PRC-05, PAY-03, BR-PAY-01, BR-PAY-04 |
| K-32 | **Business: hosts refuse to pre-pay** a commission deposit (model M1), so supply stays low | 3 | 4 | 12 | PO | Credit floor so hosts can start before paying (Q14, Q25); simple top-up by CCP or BaridiMob; online top-up in R2-A; clear commission rates | Few top-ups during the beta; hosts stay in request mode | PAY-02, PAY-05, PAY-07, DEC-001, Q25 |

**32 risks**: 6 high, 22 medium, 4 low.

## 2. Heat map (likelihood x impact)

Cells list risk IDs. Bold cells are high (score 15 or more).

| Likelihood \ Impact | 1 small | 2 days lost | 3 feature late | 4 launch late or money lost | 5 legal stop or breach |
|---|---|---|---|---|---|
| **5 almost certain** | | | | | |
| **4 likely** | | K-24 | K-13, K-15, K-17, K-21, K-28 | **K-02, K-09, K-16, K-20, K-23** | |
| **3 possible** | | K-25, K-27, K-29 | K-06, K-07, K-08, K-10, K-14, K-22 | K-04, K-05, K-18, K-19, K-32 | **K-01** |
| **2 unlikely** | | K-30 | | K-11, K-31 | K-03, K-12, K-26 |
| **1 rare** | | | | | |

## 3. The six high risks, and what to watch first

| Risk | First action | When |
|---|---|---|
| K-01 Hosting in Algeria | Send L1 to the lawyer; shortlist ICOSNET and Djezzy Cloud (T1) | M0 |
| K-02 Data transfer abroad | Processor list (T8) reviewed by the lawyer (L10) | M0, then M6 |
| K-09 Off-platform scams | Contact masking and review before publication ship in the MVP | M2, M5 |
| K-16 SMS deliverability | Contract a local aggregator and test all three operators on staging | M0 |
| K-20 Team and skills | Pairing rule and review rule written in the contributing guide | M0 |
| K-23 Late legal answers | Written question list to the lawyer with the roadmap dates | M0 |

Medium risks with the highest impact on dates: K-13 (switch breaks), K-18 (hosting set-up), K-21 (scope creep), K-17 (exam period).

---

## Check yourself

- [ ] How is the score calculated, and which band is "high"?
- [ ] Which two risks are about where data lives, and what single decision reduces both?
- [ ] Why is double booking (K-12) only "unlikely" even though its impact is 5?
- [ ] What is the early signal that SMS pumping (K-10) is happening?
- [ ] Which risk explains why the launch should not fall in the baccalaureate exam weeks?
- [ ] Name two ways we keep the mock-to-API switch (K-13) from breaking the apps.
- [ ] Who owns the scope creep risk, and what rule do they apply to new ideas?
