# 02. Research: what others do, which Django tools to use, and what Algeria requires

> **In plain words**
> Before designing tables we looked at how Airbnb, Booking.com, Expedia and GetYourGuide solve the same problems, and which Django tools are best today.
> We also checked Algerian realities: how online payment works, SMS costs, the laws on e-commerce and personal data, maps and hosting.
> Big finding: Algerian law likely requires the site to be hosted in Algeria, and collecting guest money to pay hosts may need a payment licence.
> So the safest first version is "BLADUS takes only its commission", which matches what the website already does.
> Every legal, tax or money point here is marked **VERIFY WITH A PROFESSIONAL**. This is engineering research, not legal advice.

Research date: all sources accessed on **2026-11-04**. Labels: **[verified]** read on an official or primary page; **[secondary]** press, vendor or blog; **[unverified]** could not confirm. Full source lists with every URL: [Appendix R1](_work/research-platforms-django.md) and [Appendix R2](_work/research-algeria-security.md).

**Terms used here** (also in [glossary.md](glossary.md)):
- **Exclusion constraint**: a database rule that refuses two rows whose date ranges overlap for the same unit. It makes double booking impossible even if the app has a bug.
- **Idempotency key**: a unique ID the client sends with a payment request; if the request is retried, the server returns the first result instead of charging twice.
- **Double-entry ledger**: every money movement is written as two or more lines that add up to zero (money leaves one account and enters another), so errors are visible.
- **PSP**: payment service provider, a company licensed to hold and move other people's money.
- **KYC**: "know your customer", checking a host's identity and documents.
- **BFF**: "backend for frontend", here the Next.js server holding the login cookie and calling Django for the browser.

---

## A. Comparable platforms

### A.1 What they publish

| Platform | Lesson for BLADUS | Source |
|---|---|---|
| Airbnb | Started as one big app, split into services only when hundreds of engineers needed it | https://medium.com/airbnb-engineering/building-services-at-airbnb-part-1-c4c1d8fa811b |
| Airbnb payments | Idempotency keys with a row lock, always on the main database, to avoid double payments | https://medium.com/airbnb-engineering/avoiding-double-payments-in-a-distributed-payments-system-2981f6b070bb |
| Airbnb finance | Money modelled as accounting events in a double-entry ledger | https://medium.com/airbnb-engineering/tracking-the-money-scaling-financial-reporting-at-airbnb-6d742b80f040 |
| Airbnb messaging | Clients fetch only what changed since their last sync | https://medium.com/airbnb-engineering/messaging-sync-scaling-mobile-messaging-at-airbnb-659142036f06 |
| Airbnb trust | Extra checks only for risky users ("targeted friction") | https://medium.com/airbnb-engineering/fighting-financial-fraud-with-targeted-friction-82d950d8900e |
| Airbnb reviews | 14 days after checkout, both sides blind until both wrote or time ran out | https://www.airbnb.com/help/article/13 |
| Booking.com | Hotel inventory = room type x rate plan x date; "rooms to sell" per room type per date | https://developers.booking.com/connectivity/docs/ari.md |
| Booking.com reviews | Only real bookers review; moderated; visible 36 months | https://partner.booking.com/en-us/help/guest-reviews/general/guest-review-process-and-conditions |
| Expedia | Cancellation policy is structured data (penalty windows), shown before booking | https://developers.expediagroup.com/rapid/lodging/shopping/constructing-cancellation-policies |
| GetYourGuide | Activities sold as time slots with seats; flow is check, hold, confirm | https://www.getyourguide.careers/posts/scaling-the-inventory-parts-of-our-system-using-kafka-streams |
| pretix (open source, Django) | Best Django example of quota inventory with time-limited holds | https://docs.pretix.eu/dev/development/concepts.html |
| django-hordak | Double-entry accounting in Django with database constraints | https://github.com/adamcharnock/django-hordak |

Not found: Airbnb's calendar architecture, Vrbo developer docs, Airbnb's current cancellation tiers from a primary page [unverified].

### A.2 One idea that covers all six products

Every bookable thing is **a unit, a time shape and a capacity**:

| Vertical | What is sold | Time shape | Capacity per slot |
|---|---|---|---|
| Home | the whole place | nights `[check-in, check-out)` | 1 |
| Hotel | a room type (pool of N rooms) | nights | N per night |
| Hostel | a bed type or dorm (pool of beds) | nights | beds per night |
| Experience | an option at a start time | time slot | seats per slot |
| Vehicle | a vehicle | pickup to return | 1 |
| Agency trip | a departure on fixed dates | fixed departure | seats per departure |

### A.3 Hard problems and our decisions

| Problem | Decision |
|---|---|
| Double booking | Capacity 1: date range column plus **exclusion constraint** in PostgreSQL. Pools (rooms, beds, seats): one **inventory row per unit per day or slot** with a rule `held + booked <= total`, updated atomically inside a transaction. Holds expire by a scheduled job. Search results are re-checked inside the booking transaction. |
| Search at Algeria scale | PostgreSQL only at first (map box, filters, availability), with a small search table per listing. An external engine only when measured slow. |
| Pricing | Nightly prices stored per unit and date, built from rules (base, weekend, season, long stay). The server gives a **quote** with an ID and expiry, re-checked at booking. |
| Money | Idempotency key on every money endpoint; append-only double-entry ledger; balances computed from entries; gateway webhooks stored raw, verified and processed once. |
| Cancellation | Named policy templates stored as windows (hours before start, refund %); copied onto the booking at confirmation. |
| Fake listings and fraud | Listings go through review; host KYC before any payout; rule-based flags (new account + high value, duplicate photos, phone numbers in messages) that add friction, not blanket bans. |
| Reviews | Only after a completed booking, one per direction, 14-day window, double-blind, host can reply once. |
| Architecture | **Modular monolith**: one Django project split into clear apps. Services later only if needed. |

---

## B. Django ecosystem (two or more options per decision)

Versions read from PyPI and npm on 2026-11-04.

| # | Decision | Option 1 | Option 2 | **Choice** | Why |
|---|---|---|---|---|---|
| B.0 | Django version | 6.1.3 (supported to Dec 2027) | 5.2 LTS (to Apr 2028) | **Django 6.1 on Python 3.13**, move to 6.2 LTS in 2027 | 6.x has built-in tasks API and CSP; 6.1 overlaps 6.2 LTS |
| B.1 | Database and maps | PostgreSQL + PostGIS (GeoDjango) | Plain lat/lng numbers | **PostGIS** | Real distance and map-box queries, wilaya polygons, range types and exclusion constraints |
| B.2 | API framework | Django REST Framework 3.18.3 | Django Ninja 1.7.3 | **DRF** (HackSoft style) | Mature permissions, throttling, OpenAPI; most Algerian Django devs know it |
| B.3 | Accounts and login | django-allauth 65.21 headless | dj-rest-auth + SimpleJWT | **allauth headless** | Phone OTP, MFA (TOTP, passkeys), rate limits built in; session tokens, not long-lived JWTs |
| B.4 | Permissions | django-rules (predicates) | django-guardian (per-object rows) | **Own `Membership` roles + django-rules** + always filtering lists by the caller's organisations | Rights come from membership, not per-object grants |
| B.5 | Background jobs | Celery 5.6 + Redis | Django tasks (6.0+), Dramatiq, Huey | **Celery + Redis** | Retries, schedules, monitoring; tasks kept thin so moving to Django tasks later is easy |
| B.6 | Live messaging | Polling a "changes since" endpoint | Centrifugo 6.10, Django Channels | **Polling first, Centrifugo later** | Simplest to run; Airbnb's sync idea |
| B.7 | Search | PostgreSQL full-text + pg_trgm + PostGIS | Meilisearch 1.56, Typesense, OpenSearch | **PostgreSQL first** | One store, consistent with availability; Meilisearch only if Arabic typo search is needed |
| B.8 | Files and images | django-storages + Cloudflare R2 (S3 API) | Cloudinary | **S3-compatible storage**, presigned uploads, Pillow renditions, ClamAV for documents | Vendor-neutral. **Location must respect Algerian law, see C.3** |
| B.9 | Translations | django-modeltranslation 0.20 (columns per language) | django-parler 2.4 (translation tables) | **modeltranslation** for platform lists (amenities, wilayas); hosts write in one language with `source_language` | Fixed 3 languages, fast reads |
| B.10 | Back office | Existing Next.js admin | Django admin + Unfold 0.110 | **Both**: Next.js admin is the product; Django admin is a staff-only, MFA, mostly read-only console | Fast internal tools without bypassing rules |
| B.11 | History / audit | django-pghistory 3.9 (database triggers) | django-simple-history, django-auditlog (signals) | **pghistory + a domain `AuditEvent` table** | Triggers also catch bulk updates |
| B.12 | Limits, cache, idempotency | DRF throttles + Redis cache + in-house idempotency | django-ratelimit (inactive since 2024), django-idempotency-key (inactive since 2023), django-cachalot | **First option** | Libraries in option 2 are unmaintained or unsuited to write-heavy tables |
| B.13 | API contract | drf-spectacular 0.30 + openapi-typescript/openapi-fetch | orval 8.46, hey-api | **spectacular + openapi-typescript** | Small typed client that works in Next.js server components |
| B.14 | Tests | pytest-django + factory_boy + hypothesis + schemathesis | model_bakery | **First option** | Readable factories; property tests for money and dates; contract fuzzing |
| B.15 | Structure | Modular monolith (HackSoft services/selectors), ideas from cookiecutter-django | Many small services | **Modular monolith** | Small team, one database, clear boundaries |
| B.16 | Ops tooling | pydantic-settings, ruff, mypy + django-stubs, GitHub Actions, Sentry, structlog, Prometheus | django-environ, black/isort | **First option** | Typed settings that fail fast; one fast linter |
| B.17 | Money storage | Whole numbers in centimes (`BigIntegerField`) + currency | Decimal / django-money (repo archived, moving to Codeberg) | **Centimes + currency code** + small in-house `Money` type | Exact sums; DZD has minor unit 2 in ISO 4217 even though prices are whole dinars |

---

## C. Algeria

### C.1 Payments

| Rail or provider | What it is | Facts | Status |
|---|---|---|---|
| CIB card | Bank debit card through SATIM | Merchant needs commerce register (RC), CNRC e-supplier filing, GIE Monétique authorisation and a bank contract | [verified] cibweb.dz |
| Edahabia card | Algérie Poste card | Accepted through the same SATIM gateway | [verified] |
| BaridiMob / CCP transfer | Postal account transfers | Limits and fees conflict across sources | [secondary] |
| BaridiPay QR | Merchant QR since June 2025 | No public API found | [unverified] |
| Cash on arrival | Very common | Manual reconciliation | [secondary] |
| Foreign cards | Through BDL bank | 5% per transaction + 65,000 DA/month + 70,000 DA setup, companies only | [verified] bdl.dz |
| **Chargily Pay V2** | Aggregator with API and webhooks | Fees 0% (starter cap), 1.5%, 3%, 4.5% by plan; refunds 2%; payout holds 24 to 72 h; CIB, Edahabia | [verified] dev.chargily.com |
| SlickPay | Aggregator | 1.4% to 2% by payout schedule | [verified] slick-pay.com |
| Guiddini | Certified SATIM module, not an aggregator | Merchant still needs its own bank contract | [verified] cibweb.dz |

**Key realities** (VERIFY WITH A PROFESSIONAL):
1. **No split payment product** (no "Stripe Connect" for Algeria) was found [unverified: absence of evidence].
2. Collecting guest money and paying it to hosts looks like a **payment service**. Banque d'Algérie Règlement 25-02 (April 2025) sets PSP licensing with **160 million DA** minimum capital [secondary].
3. Law 18-05 art. 27: electronic payment must go through platforms run by approved banks and Algérie Poste [verified, text read].

**Payment models, from lowest to highest legal risk:**

| # | Model | Fits current website? |
|---|---|---|
| M1 | Guest pays host directly (cash or transfer); host pre-pays commission to BLADUS; BLADUS invoices commission | **Yes**: this is the prepaid wallet the website already has |
| M2 | Guest pays a deposit equal to BLADUS's commission through Chargily; rest paid to host on arrival | Close |
| M3 | Professional hosts use their own gateway accounts; BLADUS creates checkouts with their keys | For hotels and agencies only |
| M4 | BLADUS collects everything and pays hosts out (Airbnb model) | Needs a licensed PSP or bank partner: phase 2 |

**Recommendation for the blueprint:** design the ledger so all four models fit, launch with **M1 (plus optional M2)**, and keep M4 behind a decision gate. This resolves disagreement D-16 in favour of the spec and the website, and makes the admin's "booking payment / host payout" flow a later phase. **Decision needed from you** (see `13-decisions-needed.md`).

### C.2 Messaging and verification

| Channel | Cost / fact | Status |
|---|---|---|
| Twilio SMS to Algeria | about USD 0.27 per SMS, sender ID registration required | [verified] twilio.com |
| BulkGate | EUR 0.08 to 0.24 by carrier | [secondary] |
| Local aggregator (e.g. Sobersys) | prices not published | [secondary] |
| WhatsApp Business | paid per template message since July 2025; Algeria rate not found | [secondary] |
| Email (Resend, SES, Brevo) | free tiers 300/day to 3,000/month | [secondary] |

Decision: one `SmsProvider` interface, a local aggregator first with an international fallback; email and WhatsApp OTP where possible; strict limits per phone, IP and device against SMS pumping fraud.

### C.3 Legal (all points: VERIFY WITH A PROFESSIONAL, not legal advice)

| Law | What it says that matters | Status | Consequence |
|---|---|---|---|
| **Law 18-05 (e-commerce), art. 8** | E-commerce requires RC registration and **a site hosted in Algeria with a `.com.dz` domain** | [verified] JO n° 28, 2018 | Plan production hosting in Algeria |
| Law 18-05 art. 10 to 13, 25, 31 to 33 | Mandatory offer content; order in 3 steps (review, confirm, contract); keep transaction records for CNRC; opt-in for marketing | [verified] | Booking flow and consent records |
| **Law 18-07 on personal data, amended by Law 25-11 (July 2025)** | Prior declaration or authorisation to ANPDP; **transfer abroad needs ANPDP authorisation**; breach notice within **5 days** | [secondary] | Keep personal data in Algeria; register of processing; breach runbook |
| Circular of 16 June 2012 ("chez l'habitant") | Max 5 rooms, 15 guests, insurance, declaration at the APC | [secondary] | Individual host documents |
| Law 08-11 art. 29 | Foreign guests must be declared to security services | [secondary] | Guest nationality field and host reminder |
| Law 99-06, Décret 17-161 | Travel agencies need a Ministry of Tourism licence (A or B) | [verified exists] mta.gov.dz | Agency KYC |
| Décret 19-158 | Hotel classification | [secondary] | Star rating drives tourist tax |
| Vehicle rental rules | No decree found | [unverified] | Ask a lawyer |
| Whole-home short-term rental | No specific framework found | [unverified] | Ask a lawyer |

### C.4 Tax

| Item | Value | Status |
|---|---|---|
| VAT standard / reduced | 19% / 9% | [verified] PwC |
| VAT for tourism, hotels, travel, tourist vehicle rental | 9% until 31 Dec 2027 | [secondary] |
| Taxe de séjour (tourist tax) per person per night | 5* 600 DA, 4* 500, 3* 300, 2* 200, 1* 100; 50 DA proposed for unclassified (draft) | [secondary] |
| Invoice content (Décret 05-468) | RC, NIF, NIS, article d'imposition, sequential number, HT, VAT, TTC | [secondary] |
| Accounting retention | 10 years commonly cited | [secondary] |
| Auto-entrepreneur | Turnover cap 5M DA/year, IFU 0.5% | [secondary] |

### C.5 Geography

- **69 wilayas and 1,541 communes** since Loi 26-06 (JO n° 25, 5 April 2026) [secondary; JO not opened]. Codes 59 to 69 differ between sources.
- Seed data: **el-amin-dev/algeria-wilayas-communes** (CC0, names in ar/fr/en) + coordinates from **ihahachi/Algeria-Cities** (MIT). Keep `source` and `valid_from` so the next reform is a data migration; keep the old 58-wilaya codes too.
- Maps: OpenFreeMap tiles are free with attribution [verified]. Public **Nominatim forbids autocomplete** and allows 1 request per second [verified]: use it only server-side and cached. Addresses are often informal: commune + pin on the map.

### C.6 Hosting

| Option | Price | Fit |
|---|---|---|
| ICOSNET (Algiers, Oran) | from 2,800 DZD/month per VPS | **Recommended for production data** [secondary] |
| Djezzy Cloud (Béjaïa) | quote | Alternative [secondary] |
| Hetzner (EU) | raised prices in 2026; CX23 about EUR 5.49 | Dev and non-personal assets only [secondary] |
| Cloudflare | PoPs in Algiers, Oran, Constantine, Annaba, status varies | Static assets [conflicting] |

Backups: encrypted, second Algerian data centre, restore test monthly. Offsite backups abroad only after ANPDP analysis.

### C.7 Culture and formats

| Topic | Rule |
|---|---|
| Weekend | Friday and Saturday; week starts Sunday |
| Digits | Latin digits even in Arabic (`ar-DZ` with `latn`) |
| Phone | `+213` then 5, 6 or 7 and 8 digits: `^\+213[5-7]\d{8}$` |
| Time zone | Africa/Algiers, UTC+1, no daylight saving |
| Names | Store Arabic and Latin forms separately |
| ID | Biometric ID card; NIN has 18 digits (different from card number) |

---

## D. Security

### D.1 OWASP API Top 10 (2023) applied to BLADUS

| Risk | BLADUS example | Control |
|---|---|---|
| API1 object access | `GET /bookings/{id}` of someone else | Check ownership on every object; non-guessable IDs (UUIDv7) |
| API2 authentication | OTP brute force, SMS pumping | 6 digits, 5 tries, 10 min, limits per phone/IP/device; MFA for staff and hosts with payouts |
| API3 property access | Guest sees host phone before booking; mass-assigning `status` or `commission_rate` | Output fields per role; allowlist of writable fields |
| API4 resource use | Scraping, big uploads, SMS cost | Page size caps, upload limits, SMS budget alarms |
| API5 function access | Host calling a staff refund endpoint | Separate admin API, deny by default |
| API6 business flows | Holding calendars without paying, coupon abuse, fake reviews | Hold expiry, velocity limits |
| API7 SSRF | Calendar import URL, image by URL | Block private IPs, egress proxy |
| API8 misconfiguration | Open Redis, debug on, CORS `*` | Hardening checklist |
| API9 inventory | Old endpoints, prod data in staging | OpenAPI inventory, no prod data in staging |
| API10 unsafe APIs | Trusting payment redirect instead of webhook | Verify webhook signature, re-check status server-side |

Source: https://owasp.org/API-Security/editions/2023/en/0x11-t10/ [verified].

### D.2 Fraud and abuse

- Off-platform payment pushes (BaridiMob/CCP numbers, WhatsApp links in messages before confirmation): detect and warn.
- Fake listings with stolen photos: perceptual hash, proof of property for the first listing, delay on first payout.
- Duplicate accounts after a ban: phone, device and hashed NIN.
- Account takeover via SIM swap: re-verify before payout detail changes, hold payouts 48 to 72 h after such a change.
- Reviews only from completed bookings; watch for bursts and rings.

### D.3 Data rights, backups, audit

- Access, correction, deletion: deletion anonymises the person but keeps booking and invoice records for legal retention.
- Append-only audit log with actor, action, object, before/after hash, IP, request ID; hash-chained for tamper evidence. KYC file views always logged.
- Breach runbook with a 5-day ANPDP clock.

---

## E. Decisions taken in this phase, and what needs a professional

| # | Decision | Confidence | Needs |
|---|---|---|---|
| R-1 | Django 6.1 + DRF + PostgreSQL/PostGIS + Celery/Redis + allauth headless | High | none |
| R-2 | Exclusion constraints for single units, daily inventory rows for pools | High | none |
| R-3 | Centimes + currency, double-entry ledger, idempotency keys | High | none |
| R-4 | Launch money model M1 (prepaid commission), ledger ready for M2 to M4 | Medium | **Your decision** + **lawyer / accountant** |
| R-5 | Host production data in Algeria (ICOSNET or Djezzy Cloud) | Medium | **Lawyer** (Law 18-05 art. 8, Law 18-07/25-11) |
| R-6 | `.com.dz` domain for the public site | Medium | **Lawyer** |
| R-7 | Chargily as first gateway, SlickPay as second | Medium | **Accountant / bank**: contract terms, amount units in API |
| R-8 | KYC document list per host type (see R2 C3.5) | Low | **Lawyer** |
| R-9 | VAT 9% and taxe de séjour handling per booking | Low | **Accountant** |
| R-10 | 69 wilayas from el-amin + ihahachi | Medium | Check official JO and ONS codes |
| R-11 | Polling for messages, PostgreSQL search | High | none |

---

## Check yourself

- [ ] Why does an exclusion constraint matter more than a check in Python code?
- [ ] What are the four payment models, and which one does the website already use?
- [ ] Which Algerian law article points to hosting in Algeria, and why is it flagged "verify"?
- [ ] Why do we store money in centimes even though prices are whole dinars?
- [ ] Why polling before WebSockets for messages?
- [ ] Name two fraud patterns that are specific to Algeria's payment habits.
- [ ] How many wilayas and communes does Algeria have today, and which seed datasets will we use?
