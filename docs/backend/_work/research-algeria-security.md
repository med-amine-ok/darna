# BLADUS backend research: Algeria context, payments, compliance, infra, security

Research date / access date for every source below: **2026-11-04**.

Conventions used in this file:
- **[verified]** = read on an official or primary source page during this session.
- **[secondary]** = from a press article, agency blog or vendor page (not official text).
- **[unverified]** = could not confirm, conflicting, or inferred. Treat as a lead only.
- Every legal, tax and financial point is flagged **VERIFY WITH A PROFESSIONAL (not legal advice)**. This file is engineering research, not legal, tax or financial advice.

---

## Executive summary of risks and surprises

1. **Law 18-05 art. 8 requires an e-commerce site to be "hosted in Algeria" with a `.com.dz` extension**, plus RC registration and CNRC e-supplier filing. Text read directly in JO n° 28 of 16 May 2018 [verified]. This directly conflicts with an "EU VPS only" plan. VERIFY WITH A PROFESSIONAL.
2. **Law 18-07 was amended by Law 25-11 of 24 July 2025** (JO n° 48). Transfers of personal data abroad need ANPDP authorization; illicit transfer abroad carries 1 to 5 years prison and 500,000 to 1,000,000 DA fine [secondary]. Hosting user data in the EU is a transfer abroad. VERIFY WITH A PROFESSIONAL.
3. **Marketplace payouts to hosts are a regulated activity risk.** Collecting guest money and paying it out to third parties looks like a payment service; Banque d'Algérie Règlement 25-02 (PSP licence, minimum capital 160 million DA) now frames this [secondary]. Practical route: each host gets paid through their own gateway account, or BLADUS invoices only its commission. VERIFY WITH A PROFESSIONAL.
4. **Online card acceptance is DZD only and domestic (CIB / Edahabia) for most merchants.** Since a Banque d'Algérie update of 14 May 2026, banks may let e-merchants accept foreign Visa/Mastercard/Amex [secondary]; BDL already offers it at 5% per transaction + 65,000 DA/month + 70,000 DA setup, legal entities only [verified on bdl.dz].
5. **The country now has 69 wilayas and 1,541 communes** (Loi 26-06, JO n° 25 of 5 April 2026, per datasets quoting the JO) [secondary, JO itself not opened]. Codes 59 to 69 differ between sources.
6. **Public Nominatim forbids autocomplete** and caps at 1 req/s for the whole app [verified].
7. **SMS OTP via Twilio costs about USD 0.27 per SMS to Algeria** and needs sender ID registration [verified on twilio.com]. Local routes are much cheaper but less documented.
8. **Hetzner raised cloud prices twice in 2026** (April and June); old cheap plans are not orderable [secondary].

---

## C1. Payments in Algeria

### C1.1 The rails

| Rail | Operator | What it is | Notes |
|---|---|---|---|
| CIB card | SATIM (interbank switch) + banks | Domestic interbank debit card | Online acceptance through SATIM e-payment gateway. Merchant needs GIE Monétique authorization + bank contract [verified, cibweb.dz / satim.dz]. |
| Edahabia card | Algérie Poste (CCP accounts) | Postal debit card | Also accepted via SATIM gateway on e-commerce sites [verified, cibweb.dz]. |
| BaridiMob / CCP-to-CCP transfer (RIP) | Algérie Poste | App transfer between CCP accounts | MPT FAQ gives 1,000 DZD min and 200,000 DZD/day max [secondary, older]; Algerie360 says min 500 DZD [secondary]. Fees conflicting (baridimob.com says fee by amount; others say free) [unverified]. |
| BaridiPay (QR) | Algérie Poste | Merchant QR payment in BaridiMob, since 14 June 2025, min 100 DA | Needs a commercial CCP account [secondary]. No public API found [unverified]. |
| Bank transfer (RIB) | Banks via ACI / interbank | Virement | Manual reconciliation; no public instant-payment API found [unverified]. |
| Cash on arrival / COD | n/a | Very common in Algerian e-commerce | Yalidine COD capped at 150,000 DZD per parcel [secondary]. |
| Foreign Visa/Mastercard | Acquiring banks (e.g. BDL) via SATIM | Since 14 May 2026 update of BdA list of authorized products, banks may offer it after a declaration + 15 days [secondary] | BDL "E-commerce international": legal entities domiciled at BDL; 5% per transaction, pack 65,000 DA HT/month, onboarding 70,000 DA HT; tourism, travel and vehicle rental listed as priority sectors [verified, bdl.dz]. |

**Legal anchor (Law 18-05, JO n° 28, 2018) [verified, text read]:**
- Art. 27: payment by authorized means, remote or on delivery; electronic payment goes through platforms "mises en place et exploitées exclusivement par les banques agréées par la Banque d'Algérie et Algérie Poste".
- Art. 28: connection to payment platform secured by electronic certification.
- Art. 29: payment platforms are under Banque d'Algérie control.
- Art. 7: proceeds of cross-border sales must land in the e-supplier's account domiciled in Algeria.
VERIFY WITH A PROFESSIONAL.

### C1.2 How a merchant gets direct CIB/Edahabia acceptance (GIE Monétique / SATIM)

From the official CIBWeb portal and bank pages [verified + secondary]:
1. Prerequisites: inscription au **registre du commerce** (or registre de l'artisanat et des métiers) and in the **CNRC national file of e-suppliers** (e-commerce activity code) [verified, cibweb.dz FAQ as quoted in search].
2. Apply on cibweb.dz with RC attached; GIE Monétique decides acceptability "en moins de 24h" [verified, cibweb.dz].
3. Two paths: with a **GIE-referenced payment module** (4 steps) or a **non-referenced module** (8 steps incl. API retrieval, test slot, certification appointment, PV of certification) [verified, cibweb.dz pages p21/p22].
4. Sign adhesion contract with your bank; SATIM issues the web-merchant ID [secondary, Al Baraka Bank].
5. Adhesion is for one year, renewable [secondary, BNA].
6. Fees: no official grid found. Agencies cite 1% to 2.5% per transaction, sometimes about 50 DA fixed + 1.2%; settlement typically D+1/D+2; agency-reported ceilings 100,000 DA/transaction and 500,000 DA/month [secondary, conflicting, unverified]. Negotiated with the bank.

Referenced modules on cibweb.dz (page 1 of 3): Guiddini (NC/04/000013/2021), EBLINK, ATA CORP, ADEX Technology (ADEXEPAY), CONEX (ALPAY), Smart Solution and Innovation (Mpay), LRD Algérie (MYBUSI), shipili store, Web Rocket (WooCommerce), TROIS S PAY (3SPAY) [verified]. These are certified **integration modules**: the merchant still needs its own RC + bank contract.

### C1.3 Aggregators / gateways comparison

| Provider | Exists? | Model | Fees | Onboarding | Methods | Payout / settlement | Limits | Refunds | Webhooks | Docs |
|---|---|---|---|---|---|---|---|---|---|---|
| **Chargily Pay V2** | Yes [verified] | Aggregator (merchant uses Chargily's acceptance) | Starter 0% (cap 300 tx or 300,000 DZD); Comfort 1.5% (min 15 / max 1,500 DZD); Supreme 3% (30/3,000); Elite 4.5% (45/4,500). First month 0%. Fees can be on merchant, customer or split [verified, chargily.com pricing + dev docs] | Two-step verification (user account + application) by Chargily team; required documents not published [verified]; whether RC/auto-entrepreneur is required: **unverified** | `edahabia`, `cib`, `chargily_app` [verified]; Visa/MC "coming soon" on marketing page [secondary] | Balance hold 72h / 48h / 24h by plan; 1, 2 or 4 free payouts/month; extra payout 1.5% (min 150 DZD) [verified] | Starter capped as above; others unlimited [verified] | Yes, 2% commission (min 20, max 2,000 DZD) [verified] | Yes, "Webhooks" page in docs [verified exists; signature details not read] | https://dev.chargily.com/pay-v2 ; SDKs JS, PHP, Go, C#, WordPress, Shopify, Odoo on GitHub [verified] |
| **SlickPay** | Yes [verified] | Aggregator / fintech, Algiers, founded 2022 [secondary] | Auto 2% (instant after SATIM confirm), Daily 1.9%, Weekly 1.6%, Bimonthly 1.5%, Monthly 1.4%, Enterprise custom [verified, slick-pay.com] | Search summary says merchant needs RC, business bank account, SATIM / GIE authorization [secondary, unverified] | CIB, Edahabia; payment links; app [verified] | Per schedule above [verified] | Not published | Not found [unverified] | Not confirmed (docs site did not render) [unverified] | https://developers.slick-pay.com/ ; prod base `https://prodapi.slick-pay.com/api/v2` [secondary] ; WordPress plugin [verified] |
| **Guiddini Pay** | Yes [verified, cibweb registry] | Certified SATIM module + API ("Api paiement en ligne Satim-gateway") | Not published [unverified] | Merchant still needs its own RC + bank/SATIM contract (module path) [inferred from cibweb process] | CIB, Edahabia | Bank settlement | n/a | n/a | n/a | https://guiddini.dz/docs/api [secondary] |
| **Yalidine Pay** | **No evidence it exists** [unverified] | Yalidine is a courier with COD ("recouvrement") | n/a | n/a | Cash on delivery | n/a | 150,000 DZD/parcel COD [secondary] | n/a | n/a | n/a |
| **BDL e-commerce international** | Yes [verified] | Direct bank acquiring for foreign cards | 5% per tx, 65,000 DA HT/month, 70,000 DA HT setup [verified] | Legal entity domiciled at BDL, business plan, web-merchant contract, NDA [verified] | Visa, Mastercard | Likely DZD (fees "converties en DZD") [unverified] | n/a | n/a | n/a | https://www.bdl.dz/ecommerce-international/ |
| Other modules (ADEXEPAY, ALPAY, Mpay, 3SPAY...) | Listed as certified [verified] | Modules | Not researched | | | | | | | https://cibweb.dz/fr/modules-autorise |

### C1.4 Payout, escrow, refunds: realities for a marketplace

- **No public split-payment / connected-account product found** for any Algerian gateway (no Stripe Connect equivalent) [unverified: absence of evidence].
- Collecting funds for third parties and redistributing them is close to the definition of a payment service. **Règlement 25-02 of 14 April 2025** (JO n° 28) sets PSP licensing with **160 million DA minimum capital**; Instruction 06-2025 requires segregated ("cantonnement") customer-fund accounts [secondary, algerie-eco / El Watan; official list at bank-of-algeria.dz]. VERIFY WITH A PROFESSIONAL.
- **Realistic startup patterns** (engineering options, each needs legal review):
  1. **Commission-only + pay at property**: guest pays host directly (cash on arrival / BaridiMob to host's CCP); BLADUS invoices hosts a monthly commission. Lowest regulatory risk, weakest trust.
  2. **Deposit via BLADUS gateway = BLADUS service fee only** (Chargily/SlickPay), remainder paid to host on arrival.
  3. **Host-owned gateway accounts**: each pro host (hotel, agency) has its own Chargily/SlickPay/SATIM account; BLADUS creates checkouts with the host's keys. Not possible for individuals without verified accounts.
  4. **Full collection + payout (Airbnb model)**: needs a licensed PSP or bank partner. Treat as phase 2.
- **Escrow**: no consumer escrow product found [unverified]. "Hold until check-in + 24h" can only be emulated with gateway balance holds or BLADUS's own account (see risk above).
- **Refunds**: Chargily supports refunds (2% fee) [verified]. Plan refunds as partial amounts stored in a ledger; COD/cash refunds are manual.
- **Ledger**: build a double-entry ledger regardless (booking, fee, payout, refund, chargeback-like reversal), DZD integer amounts (centimes are not used in practice; store minor units anyway).

### C1.5 Diaspora / tourists with foreign cards

- Options found: bank acquiring for foreign cards via BDL (legal entity, 5%) [verified]; other banks may follow the 14 May 2026 BdA update [secondary]. International gateways (Stripe, PayPal merchant) for an Algerian entity: **not supported / unverified**; using a foreign entity to collect for Algerian stays raises exchange-control questions (Law 18-05 art. 7 requires proceeds domiciled in Algeria) [verified text]. VERIFY WITH A PROFESSIONAL.

---

## C2. Messaging and verification

### SMS / OTP

| Provider | Algeria price per SMS | Notes | Source |
|---|---|---|---|
| Twilio | USD 0.273 outbound; alphanumeric sender ID "Registration Required" | Unregistered traffic may be filtered by carriers | twilio.com/en-us/sms/pricing/dz ; support.twilio.com article 223133767 [verified] |
| Plivo | from USD 0.2077 (by network 0.21 to 0.32) | Network names outdated | plivo.com/sms/pricing/dz/ [secondary] |
| BulkGate | Djezzy EUR 0.076, Mobilis EUR 0.2412, Ooredoo EUR 0.1685 | OTP API | bulkgate.com/en/pricing/sms/dz/algeria/ [secondary] |
| Messaggio | Djezzy EUR 0.12, Mobilis EUR 0.30, Ooredoo EUR 0.29 | Also WhatsApp | messaggio.com [secondary] |
| Unimatrix | USD 0.16 flat | | unimtx.com/sms/dz [secondary] |
| Infobip, Vonage | Quote only | Not published | [unverified] |
| **Sobersys** (local) | Not published; 30 free SMS trial | Claims direct links to Djezzy, Ooredoo, Mobilis; REST API | sobersys.com [secondary] |
| Direct operator bulk SMS (Djezzy/Mobilis/Ooredoo business) | Not found; one blog cites 5 to 8 DZD domestic | Usually requires company contract | [unverified] |

Recommendation: abstract an `SmsProvider` interface, start with a local aggregator for cost, keep an international fallback (Twilio/BulkGate) for reliability, and prefer **WhatsApp or email OTP** where possible. Rate-limit OTP sends per phone, per IP and per device (SMS pumping fraud is real).

### WhatsApp Business Platform
- Since **1 July 2025 Meta charges per delivered template message** (marketing, utility, authentication), priced by recipient country; 1,000 free service messages per business number per month noted by secondary sources; new rate cards 1 July 2026 and 1 October 2026 [secondary]. Algeria's exact authentication rate: **not found** (likely in a "Rest of Africa" style region bucket) [unverified]. Official source to check: https://developers.facebook.com/docs/whatsapp/pricing . BSPs (e.g. Twilio) add a markup [secondary].

### Email
| Provider | Free tier | Paid | Source |
|---|---|---|---|
| Resend | 3,000/month, max 100/day, 1 domain | USD 20 for 50k; USD 35 for 100k | secondary (wpmailsmtp, dreamlit) |
| Amazon SES | 3,000 msgs/month for 12 months (new accounts, changed recently) | USD 0.10 per 1,000 | secondary (saaspricepulse, courier) |
| Brevo | 300/day (marketing + transactional shared) | Starter from USD 9 | brevo.com/bulk-email-service/ [verified claim of 300/day] |
Use SPF, DKIM, DMARC on the BLADUS domain; if the main site must be `.com.dz`, send mail from that domain.

### Push
- Web Push (VAPID) and Firebase Cloud Messaging are free to send (general knowledge, **not re-verified in this session**). Note Algeria has periodic national internet restrictions (e.g. exam periods) [secondary, algeriatech.news], so do not rely on push for critical flows.

---

## C3. Legal and compliance (ALL items: VERIFY WITH A PROFESSIONAL, not legal advice)

### C3.1 Personal data: Law 18-07 as amended by Law 25-11

| Point | Finding | Status |
|---|---|---|
| Base law | Loi n° 18-07 du 10 juin 2018; in force 10 August 2023 | secondary (cna.dz, Gide) |
| Amendment | **Loi n° 25-11 du 24 juillet 2025**, JO n° 48 (2025); amends, does not replace 18-07 | secondary (ACF, upgrowth, douane PDF title) |
| Authority | **ANPDP**, 15 rue Yahia Cherif Omar, Hydra, Alger; portal https://portail.anpdp.dz/ | secondary (multiple) |
| Prior formality | Art. 12: prior **declaration** or **authorization** for any processing. Authorization regime if: transfer abroad, sensitive data, or file interconnection. Online filing then signed paper deposit at ANPDP by appointment. Receipt immediately or within 48h; review within 10 days | secondary (anpdp.dz pages as summarized in search) |
| Transfer abroad | Original art. 44: prior ANPDP authorization. 25-11 adds chapter 6 / art. 45 bis 13: adequacy assessment of destination, derogations if "necessary" | secondary |
| Penalty for illicit transfer abroad | 1 to 5 years prison, 500,000 to 1,000,000 DA | secondary |
| DPO | Mandatory per one source; another says mainly public sector | **conflicting, unverified** |
| Breach notification | To ANPDP **within 5 days**; inform data subjects if high risk | secondary (two vendor blogs) |
| Foreign controller | Must appoint a representative in Algeria to deal with ANPDP | secondary |
| Data localization mandate in 18-07/25-11 | Not found as an explicit rule; but transfer abroad needs authorization | unverified |
| Admin fine | up to 500,000 DA | secondary |

Engineering consequences: processing register, DPIA for ID-document KYC (biometric photos, NIN), consent capture (Law 18-05 art. 26 also requires prior consent and data minimization) [verified text], breach runbook with a 5-day clock, data-subject request workflow.

### C3.2 E-commerce Law 18-05 (JO n° 28, 16 May 2018) [verified, text read]
- **Art. 2** applies if any party is Algerian, resides in Algeria, is an Algerian legal person, or contract concluded/performed in Algeria.
- **Art. 3** bans online transactions on gambling, alcohol/tobacco, pharma, IP-infringing goods, prohibited goods, and **any good or service requiring an "acte authentique"** (notarial deed). Long-term leases needing a notarial act are therefore out of scope for online contracting; short stays: **verify**.
- **Art. 8** e-commerce requires RC (or craft register) registration **and a website hosted in Algeria with a ".com.dz" extension**.
- **Art. 9** national file of e-suppliers at CNRC.
- **Art. 10 to 13** mandatory electronic offer content and three-step order (review, confirm, contract).
- **Art. 25** e-supplier must keep transaction records and transmit them electronically to CNRC (modalities by regulation). Fine 20,000 to 200,000 DA [secondary].
- **Art. 31 to 33** opt-in required for marketing messages; free unsubscribe; burden of proof on the e-supplier.
- No general consumer "droit de rétractation" for services found in 18-05; art. 22/23 cover delivery delay and non-conformity of goods. Cancellation terms must be in the offer/contract (art. 11/13). Consumer protection Law 09-03 also applies [not researched in detail, unverified].

**Hosting implication**: if BLADUS is an "e-fournisseur" (or the platform is treated as one), the site must be hosted in Algeria on `.com.dz`. Whether an intermediary marketplace or an API backend abroad behind an Algerian-hosted front satisfies "hébergé en Algérie" is **not defined in sources found** [unverified]. A web agency claims the rule is specific to e-commerce, not general websites [secondary].

### C3.3 Tourism, accommodation, agencies, vehicles

| Topic | Finding | Status |
|---|---|---|
| Hotel classification | Décret exécutif n° 19-158 du 30 avril 2019 (definition, operation, classification of hotel establishments) | secondary |
| Rooms at the owner's home ("logement chez l'habitant") | Interministerial circular of **16 June 2012**: max 15 guests, max 5 rooms, insurance fire/theft/civil liability, owner greets guests, furnished + hygiene/safety; **declaration at the APC** with copy of property title; APC may issue written authorization | secondary (Maghreb Emergent, 8 June 2026, citing FNAI) |
| Foreign guests | Must be declared to security services, art. 29 of Law 08-11 of 25 June 2008 | secondary (search summary) |
| Whole-apartment short-term rental (Airbnb style) | **No specific framework found**; general contract law; announced ministry project (Minister Didouche, ~2024) not found published | secondary, unverified |
| Rental income tax | IRG 7% on rental income cited (G n°51 monthly, G n°1 annual) | secondary, unverified |
| Travel agencies | Loi 99-06 du 4 avril 1999; Décret exécutif 17-161 du 15 mai 2017; licence signed by the Minister of Tourism after national commission opinion and security inquiry; categories A (domestic/inbound) and B (outbound) | verified exists on mta.gov.dz "Devenir agent de tourisme" + secondary |
| Usurping travel-agent title | 50,000 to 200,000 DA + 3 months to 3 years | secondary |
| Vehicle rental (without driver) | **No decree found** in this session; agencies' own T&Cs: civil liability insurance mandatory and included, driver usually 25+ with licence 2+ years | **unverified** (needs JORADP search; likely a regulated activity in the RC nomenclature) |
| Motor insurance | Civil liability motor insurance mandatory (general knowledge + agency T&Cs) | secondary |

### C3.4 Tax identifiers and rates

| Item | Finding | Status |
|---|---|---|
| RC | Registre du commerce (CNRC, Sidjilcom portal) | secondary |
| NIF | Tax ID, required on invoices | secondary |
| NIS | Statistical ID (ONS), required on invoices | secondary |
| Article d'imposition | On invoices | secondary |
| Carte d'artisan | Registre de l'artisanat et des métiers; accepted alternative to RC by art. 8 of 18-05 | verified (text) |
| Auto-entrepreneur | Loi 22-23 du 18 décembre 2022; card from ANAE (anae.dz); turnover cap 5,000,000 DA/year (LF 2023 art. 51); IFU 0.5% of turnover (LF 2024 art. 18); minimum 10,000 DA/year; outside VAT; liberal, regulated and artisanal activities excluded; activity list exists but not retrieved | secondary, VERIFY |
| Can an auto-entrepreneur sell online / be a host? | RC/craft register is required by 18-05 art. 8; whether the ANAE card satisfies this is **unverified** | unverified |
| NIN | 18-digit national identification number (Décret 10-210 of 2010; new decree in JO n° 60, 2023); different from the CNI card number | secondary |
| VAT standard | 19% | PwC tax summaries [verified] |
| VAT reduced | 9% (art. 23 CTCA list) | PwC [verified] |
| VAT tourism | **9% for tourism, hotel, thermal, classified restaurants, travel and tourist vehicle rental until 31 Dec 2027** (art. 42 LFC 2009 as amended by art. 215 LF 2025) | secondary (ACF, Deloitte) |
| Taxe de séjour | Per person per day (CIDTA art. 266 bis to 266 octies since LF 2022): 5* 600 DA, 4* 500, 3* 300, 2* 200, 1* 100. PLF 2027 proposes 50 DA for unclassified hotels and other accommodation (draft only) | secondary (visa-algerie.com, CNCC circular) |
| Invoices | Décret exécutif 05-468 du 10 décembre 2005 (under Law 04-02): seller identity, legal form, address, RC, NIF, NIS, article d'imposition, sequential number, date, description, HT, VAT rate and amount, TTC; cancelled invoices kept and marked | secondary |
| Retention of accounting docs | 10 years commonly cited (Code de commerce; article number conflicting 12 vs 18) | secondary, unverified article |

### C3.5 Documents to collect per host type (proposal, VERIFY WITH A PROFESSIONAL)

| Host type | Identity | Business / legal | Property / asset | Payout | Suggested retention |
|---|---|---|---|---|---|
| **Individual (rooms / home)** | CNI biométrique or passport (front/back), selfie liveness; NIN only if legally needed | Optional: auto-entrepreneur card (ANAE) if applicable; APC declaration receipt for "chez l'habitant" | Proof of ownership (acte) or lease + owner authorization; insurance certificate (fire/theft/civil liability) | CCP (RIP) or bank RIB in host's own name | ID images: delete or redact after verification + short window (e.g. 90 days) unless law requires; verification result + audit log: duration of account + 10 years if tied to invoices |
| **Travel agency** | Legal representative ID | RC, NIF, NIS, **Ministry of Tourism licence** (category A/B) | Office address | Company bank RIB | Contract + licence copies: relationship + 10 years |
| **Hotel** | Manager ID | RC, NIF, NIS, classification decision (Décret 19-158 regime), operating authorization | Address, star rating (drives taxe de séjour) | Company RIB | Relationship + 10 years |
| **Hostel / auberge** | Manager ID | RC or association/public status, operating authorization (regime **unverified**) | Address | RIB | Relationship + 10 years |
| **Vehicle owner / rental agency** | ID + driving licence of operator | RC with rental activity code (regime **unverified**), NIF, NIS | Carte grise, valid insurance (civil liability mandatory), contrôle technique | RIB | Relationship + 10 years; rental contracts per agency obligations |
| **Experience guide** | ID | Auto-entrepreneur card or RC; guide accreditation if any (**unverified**) | Activity insurance (civil liability) recommended | CCP/RIB | Relationship + 10 years |

Retention rules of thumb: invoices/accounting 10 years [secondary]; transaction records to CNRC (18-05 art. 25, no duration in law) [verified text]; personal data no longer than needed for purpose (18-07 principle) [secondary]. Store KYC files encrypted, separate bucket, short-lived signed URLs, access logged.

---

## C4. Geography data

### Official count
- **69 wilayas, 1,541 communes**: Loi n° 26-06 (signed 4 April 2026, JO n° 25 of 5 April 2026) supplementing Loi 84-09 with art. 52 bis 10 to 52 bis 20; announced at the Council of Ministers of 16 November 2025 [secondary: GitHub datasets quoting JO text; Morocco World News; DzairTube]. JO not opened directly: **check https://www.joradp.dz/**.
- 11 new wilayas and commune counts quoted from JO text: Aflou 12, Barika 8, El Kantara 5, Bir El Ater 4, El Aricha 4, Ksar Chellala 6, Aïn Oussera 10, Messaad 8, Ksar El Boukhari 21, Bou Saada 23, El Abiodh Sidi Cheikh 7 (total 108) [secondary].
- **Codes 59 to 69: inconsistent across sources** [unverified]; use ONS codes when published.
- **Dairas**: 546 (58-wilaya era, othmanus) vs 591 (el-amin dataset, 2026) [conflicting, unverified].

### Datasets
| Dataset | Coverage | Fields | License | Source |
|---|---|---|---|---|
| el-amin-dev/algeria-wilayas-communes | 69 / 591 dairas / 1,541 | ar/fr/en names, postal codes (27 null) | CC0 1.0 | https://github.com/el-amin-dev/algeria-wilayas-communes [verified] |
| ihahachi/Algeria-Cities | 69 / 1,541 | ar/fr, coordinates; CSV/JSON/GeoJSON/SQL | MIT | https://github.com/ihahachi/Algeria-Cities [secondary] |
| S450R1/algeria-cities-2025 | 69 / 1,541 | ar/latin; SQL/JSON/XML | Public domain | https://github.com/S450R1/algeria-cities-2025 [secondary] |
| othmanus/algeria-cities | 58 / 546 / 1,541 / 3,940 postcodes | ar/fr, dairas codes | MIT (per mirror) | https://github.com/othmanus/algeria-cities [secondary, outdated] |
| kossa/algerian-cities | 58 + lat/lng | Laravel | MIT | https://github.com/kossa/algerian-cities [secondary] |
| OpenStreetMap | boundaries, POIs | | ODbL (share-alike) | https://www.openstreetmap.org |
| GeoNames | places + admin codes | | CC BY 4.0 (general knowledge, not re-verified) | https://www.geonames.org |
| data.gov.dz / ONS | official codes | | not checked | [unverified] |

Recommendation: seed from el-amin (CC0) for names, merge coordinates from ihahachi (MIT, keep notice), keep a `source` and `valid_from` column so the next reform is a migration, and store both legacy 58-wilaya codes and new codes.

### Geocoding / maps
| Service | Terms | Fit |
|---|---|---|
| Nominatim (public) | Max 1 req/s for the whole app, valid User-Agent/Referer, cache results, **autocomplete forbidden**, ODbL attribution | Backend reverse-geocode only, cached [verified, operations.osmfoundation.org/policies/nominatim/] |
| Photon (photon.komoot.io) | "please be fair, extensive usage will be throttled", no SLA; Apache 2.0 code, OSM data | Autocomplete prototype; self-host for production [secondary] |
| OpenFreeMap | Free, no limits, no keys, commercial use allowed, OSM attribution required | Vector tiles for MapLibre [verified, openfreemap.org] |
| Mapbox / Google Maps | Paid per request; Algeria address quality not assessed | [unverified] |
Algerian addresses are often informal; geocode to commune + manual pin on map, not street-level text.

---

## C5. Hosting and infrastructure

### Connectivity
- Submarine cables: Medex (Annaba to Marseille branch), SeaMeWe-4 (Annaba to Marseille), ORVAL/ALVAL (Algiers/Oran to Valencia, 40 Tbps, live 31 Dec 2020), plus Medusa landing in Algiers and Collo (2026) [secondary].
- **Measured latency Algeria to Paris/Frankfurt/Marseille/Milan: not found** [unverified]. Secondary article context suggests tens of ms (40 to 80 ms discussed) [secondary]. Measure with RIPE Atlas probes in AS36947 (Algérie Télécom) before deciding.
- Government internet restrictions during exam periods disabled Cloudflare Algerian PoPs in June 2025 and rerouted via Europe (+30 to 70 ms) [secondary].

### Algerian hosting
| Provider | Offer | Price | Source |
|---|---|---|---|
| ICOSNET | DCs in Algiers and Oran; VPS, public cloud instances, VDC | Cloud instance from 2,800 DZD/month or 4.5 DZD/hour; VPS from 2,800 DZD HT/month | icosnet.com.dz [secondary/vendor] |
| Djezzy Cloud | Sovereign cloud IaaS/PaaS, ARPCE accredited, DC in Béjaïa | Not published | datacenters.com [secondary] |
| Algérie Télécom | Data centers | Not found | [unverified] |
| Others listed | Hostarts (Birtouta), AYRADE (Zeralda) | n/a | datacenters.com [secondary] |

### CDN
- Cloudflare has PoPs listed for Algiers (ALG), Oran (ORN), Constantine (CZL), Annaba (AAE); status varies between "operational" and "re-routed"; one tracker says ALG does not serve traffic [conflicting, check https://www.cloudflarestatus.com/locations].

### Recommended setups (costs rough, VERIFY current prices)
Because of 18-05 art. 8 and 18-07 transfers, the default should be **production data in Algeria**, with EU only for non-personal assets or encrypted offsite backups subject to ANPDP authorization.

| Stage | Setup | Rough monthly cost |
|---|---|---|
| Starter (compliant-leaning) | 1 to 2 ICOSNET (or Djezzy Cloud) VMs: Docker Compose (API, Postgres, Redis, worker, Caddy), daily `pg_dump` + WAL archiving to a second Algerian VM/DC (Oran vs Algiers), Cloudflare in front for static assets only | ~6,000 to 20,000 DZD (from 2,800 DZD per VPS; sizes unverified) |
| Starter (EU, legal risk) | Hetzner CX23 / CX33 class: CX23 EUR 5.49 after June 2026, CX33 EUR 8.49 [secondary]; CPX22 jumped to EUR 19.49 for new orders | EUR 10 to 40 |
| Scale-up | 2+ app nodes behind LB, managed or self-run Postgres primary + replica in a second DC, object storage for photos, separate KYC bucket, observability stack | Algeria: quote-based; EU: EUR 100 to 400 (OVH/Scaleway/DigitalOcean managed Postgres prices **not verified** this session) |
Backups: 3-2-1 rule, encrypted, restore test monthly, PITR for Postgres; ledger tables append-only.

---

## C6. Languages and culture

| Topic | Finding | Status |
|---|---|---|
| Languages | Arabic (official), Tamazight (official), French widely used in business, English growing | general knowledge, not re-verified |
| RTL | Arabic UI is RTL; use logical CSS properties and `dir` per locale | n/a |
| Digits | Maghreb (incl. Algeria) uses Western digits 0-9 in everyday Arabic text; Eastern Arabic-Indic mostly Mashreq | secondary (Wikipedia + language sites). For `Intl`, use `ar-DZ` with `numberingSystem: "latn"` to force Latin digits |
| Weekend | Friday and Saturday since 2009 (work week Sunday to Thursday) | secondary (The National, OfficeHolidays, Lloyds) |
| Phone | +213; mobiles 9 digits after country code starting 5, 6, 7 (since ARPCE plan of 22 Feb 2008); historical mapping 5 Ooredoo, 6 Mobilis, 7 Djezzy but number portability means prefix does not prove carrier; landlines 8 digits | verified (arpce.dz PDF title), secondary (Wikipedia). Safe regex `^\+213[5-7]\d{8}$` |
| National ID | CNIBE (biometric electronic ID card, chip, photo + fingerprints); NIN 18 digits (Décret 10-210), distinct from card number | secondary (interieur.gov.dz, mfa.gov.dz pages exist) |
| Passport | Biometric passport, used to request CNIBE online | secondary |
| Names | Arabic and Latin transliterations differ across documents; store `name_ar`, `name_latin` separately, family name often written first on official docs | [unverified] |
| Time zone | Africa/Algiers, UTC+1, no DST | general knowledge (IANA tzdb), not re-verified |
| Currency | DZD, no minor unit used in practice | general knowledge |

---

## D. Security and trust

### D1. OWASP API Security Top 10 (2023) mapped to BLADUS
Official list: https://owasp.org/API-Security/editions/2023/en/0x11-t10/ [verified].

| OWASP | BLADUS example | Control |
|---|---|---|
| API1 BOLA | `GET /bookings/{id}`, `/wallets/{id}`, `/payouts/{id}`, `/kyc/{fileId}`, `/conversations/{id}` | Authorize on every object: guest owns booking OR host owns listing OR admin; use non-guessable IDs (UUIDv7/ULID) but never rely on them |
| API2 Broken Authentication | OTP brute force, SMS pumping, session fixation | OTP 6 digits, 5 attempts, 10 min TTL, per-phone/IP/device rate limits, refresh-token rotation, MFA for hosts and admins |
| API3 Broken Object Property Level Authorization | Guest sees host phone/address before confirmation; mass-assignment of `status`, `price`, `commission_rate`, `is_verified` | Response DTOs per role; allowlist writable fields |
| API4 Unrestricted Resource Consumption | Search scraping, image upload size, SMS cost | Pagination caps, upload limits, per-user quotas, SMS budget alarms |
| API5 Broken Function Level Authorization | Host calling admin `/approve-listing` or `/refund` | RBAC middleware + deny-by-default routes, separate admin API |
| API6 Sensitive Business Flows | Calendar hoarding with unpaid holds, coupon abuse, review farming, mass account creation | Hold TTL, deposit before hold, device fingerprint, velocity limits |
| API7 SSRF | iCal import URL, image-by-URL upload, webhook URLs | Allowlist schemes, block private IP ranges, fetch via egress proxy |
| API8 Security Misconfiguration | Open Postgres/Redis, debug endpoints, CORS `*` | Hardening checklist, CIS baseline, secrets in env/secret store |
| API9 Improper Inventory Management | Old `/v1` endpoints, staging with prod data | OpenAPI inventory, version sunset, no prod data in staging |
| API10 Unsafe Consumption of APIs | Trusting gateway redirects instead of webhooks; unsigned webhooks | Verify webhook signatures (Chargily provides webhooks), re-fetch checkout status server-side, idempotency keys |

### D2. Fraud and fake-listing patterns
- **Off-platform payment pushes**: fake host asks for transfer outside the platform for a "discount"; scammers prefer wire, gift cards, crypto [verified, consumer.ftc.gov/articles/rental-listing-scams; Airbnb off-platform policy via secondary]. In Algeria the equivalent is BaridiMob/CCP transfers and "versement" deposits: detect RIP/CCP numbers, phone numbers and WhatsApp links in messages before booking confirmation.
- **Hijacked / fake listings** with stolen or AI-generated photos [verified FTC]: perceptual-hash photos against other listings, reverse-image checks, require property proof for first listing, first-payout delay.
- **Too-low prices, new profiles** [secondary]: risk scoring.
- **Triangulation / stolen cards**: less relevant while domestic cards require OTP (3-D Secure style SMS), but relevant once foreign cards are accepted.
- **Host-side fraud**: duplicate accounts after bans (device + phone + NIN hash), fake cancellations to rebook off-platform.

### D3. Review manipulation
- Only allow reviews tied to a completed booking; double-blind publishing (both sides or after 14 days); detect review rings (same device/IP/payment instrument), sudden review bursts; keep edit history.

### D4. Account takeover
- OTP-based login is SIM-swap exposed: require re-verification for payout detail changes, notify old channels, hold payouts 48 to 72 h after payout account change; admin accounts with TOTP/WebAuthn.

### D5. Data subject rights (18-07)
- Access, rectification, opposition, deletion workflow with identity check; export as JSON/PDF; deletion = anonymize users but retain booking/invoice records for legal retention (10 years for accounting [secondary]). Track each request in an auditable table with deadlines. Exact legal response deadlines: **unverified**.

### D6. Backup, restore, audit trail
- Postgres: nightly logical dump + continuous WAL archiving (PITR), encrypted (age/GPG), stored in a second location (second Algerian DC preferred; offsite abroad only after ANPDP transfer analysis).
- Monthly restore drill, documented RPO/RTO.
- Append-only `audit_log` (actor, action, object, before/after hash, IP, user agent, request id), hash-chained for tamper evidence; admin actions, payouts, refunds, KYC views always logged.
- Incident register + 5-day ANPDP breach notification runbook [secondary].

---

## Sources (all accessed 2026-11-04)

Payments
- https://www.cibweb.dz/fr/home ; https://cibweb.dz/fr/modules-autorise ; https://cibweb.dz/fr/page/processus-dautorisation-avec-un-module-de-paiement-reference-gie-monetique-p21 ; https://cibweb.dz/fr/page/processus-dautorisation-avec-un-module-de-paiement-non-reference-gie-monetique-p22
- https://www.satim.dz/index.php/fr/services-cib/paiement-en-ligne
- https://www.bna.dz/professionnel-integrer-le-paiement-en-ligne/
- https://www.albaraka-bank.dz/web-marchand-integrez-a-votre-site-de-commerce-le-paiement-en-ligne-rapide-et-sur-via-les-cartes-cib-ou-dhahabia-et-suivez-notre-guide-pratique/
- https://web-rocket.dz/activer-paiement-en-ligne-cibweb-procedure/
- https://dev.chargily.com/pay-v2/fees ; https://chargily.com/business/pay/pricing ; https://dev.chargily.com/pay-v2/account-verification ; https://dev.chargily.com/pay-v2/api-reference/checkouts/create ; https://chargily.com/dz/business/pay/help?lang=fr ; https://github.com/chargily
- https://www.slick-pay.com/ ; https://developers.slick-pay.com/ ; https://wordpress.org/plugins/slickpay-payment-gateway/ ; https://amarneche.me/blog/accept-online-payments-algeria
- https://guiddini.dz/docs/api/satim ; https://guiddini.com.dz/e-paiement-en-algerie/
- https://www.bdl.dz/ecommerce-international/
- https://maghrebemergent.news/fr/algerie-les-e-commercants-pourront-encaisser-des-cartes-bancaires-etrangeres/
- https://algerie-eco.com/2026/10/28/la-satim-certifiee-pour-personnaliser-les-cartes-visa-et-mastercard-en-algerie/
- https://www.algerie360.com/algerie-poste-quelles-sont-conditions-pour-transferer-de-largent-via-lapplication-baridimob/ ; https://algerie-eco.com/2025/08/25/algerie-poste-fixe-le-minimum-de-paiement-via-baridpay-a-100-da/ ; https://www.mpt.gov.dz/faq-electronic-banking-services/ ; https://www.baridimob.com/
- https://dz-ecom.com/en/blog/integrer-paiement-cib-satim-site-ecommerce-algerie ; https://webminds.dz/blog/paiement-en-ligne-algerie-cib-dahabia.html ; https://symloop.com/blog/ecommerce-cib-edahabia-algerie/
- https://www.storeino.com/fr/articles/yalidine-express-storeino
- https://algerie-eco.com/2025/05/14/banque-dalgerie-nouveau-cadre-reglementaire-pour-les-prestataires-de-services-de-paiement/ ; https://elwatan.dz/prestataires-de-services-de-paiement-la-banque-dalgerie-complete-le-dispositif-reglementaire/ ; https://www.bank-of-algeria.dz/agrement-instruction/

Messaging
- https://www.twilio.com/en-us/sms/pricing/dz ; https://support.twilio.com/hc/en-us/articles/223133767-International-Support-for-Alphanumeric-Sender-ID
- https://www.plivo.com/sms/pricing/dz/ ; https://www.bulkgate.com/en/pricing/sms/dz/algeria/ ; https://messaggio.com/bulk-sms/algeria/ ; https://www.unimtx.com/sms/dz ; https://sobersys.com/en/
- https://developers.facebook.com/docs/whatsapp/pricing ; https://sleekflow.io/blog/whatsapp-business-price
- https://wpmailsmtp.com/resend-review/ ; https://www.saaspricepulse.com/tools/amazon-ses ; https://www.brevo.com/bulk-email-service/ ; https://dreamlit.ai/blog/brevo-review

Legal / tax
- https://www.joradp.dz/FTP/JO-FRANCAIS/2018/F2018028.pdf (Law 18-05, text read)
- https://www.commerce.gov.dz/fr/actualites/la-loi-relative-au-commerce-electronique-fixant-les-regles-generales-du-commerce-electronique-des-biens-et-des-services ; https://legal-doctrine.com/en/edition/ecommerce-en-algerie-les-conditions-dexercice-des-activites-commerciales-en-ligne ; https://www.reporters.dz/ce-qu-il-faut-savoir-sur-la-loi-sur-le-commerce-electronique-hebergement-obligatoire-en-algerie/
- https://www.douane.gov.dz/IMG/pdf/loi_18-07_du_24_07_2025_fr_dz.pdf (title only; fetch failed) ; https://www.acf-dz.com/modification-de-la-loi-relative-a-la-protection-des-personnes-physiques-dans-le-traitement-des-donnees-a-caractere-personnel/ ; https://itsolutions.dz/loi-25-11-vs-18-07-algerie/ ; https://intervalle-technologies.com/blog/loi-25-11-donnees-personnelles-algerie-guide/ ; https://www.upgrowth.dz/journal-officiel/loi-18-07-protection-donnees-personnelles
- https://anpdp.dz/fr/quelles-sont-vos-obligations/ ; https://portail.anpdp.dz/ ; https://cna.dz/entree-en-vigueur-de-la-loi-sur-la-protection-des-donnees-a-caractere-personnel-en-algerie/14/08/2023/ ; https://www.gide.com/en/news-insights/setting-up-of-the-national-authority-for-the-protection-of-personal-data-anpdp/
- https://maghrebemergent.news/fr/location-chez-lhabitant-la-fnai-rappelle-lexistence-dun-cadre-reglementaire/ ; https://www.layyali.com/legislation-algerienne-location-saisonniere ; https://www.visa-algerie.com/chambres-dhotes-pour-touristes-en-algerie-lactivite-sera-reglementee/ ; https://zoomalgerie.com/location-airbnb-algerie-rentabilite-investissement-locatif-diaspora/
- https://www.mta.gov.dz/devenir-agent-de-tourisme/?lang=fr ; https://www.mta.gov.dz/wp-content/uploads/2022/06/recueil-texte-tourism-fr2022-.pdf ; https://www.algerie360.com/omra-2026-2027-agences-agreees-arnaques/
- https://algeria-rental.com/conditions-generales/ ; https://algerlocation.com/conditions-generales-de-location/
- https://www.upgrowth.dz/en/auto-entrepreneur-algeria ; https://www.algerie360.com/carte-auto-entrepreneur-anae-algerie/ ; https://www.village-justice.com/articles/les-avantages-statut-auto-entrepreneur-focus-sur-recente-loi-algerienne,49162.html
- https://taxsummaries.pwc.com/algeria ; https://www.pwc.co.za/en/publications/vat-in-africa/algeria-overview.html ; https://www.acf-dz.com/wp-content/uploads/2025/01/Mesure-phase-loi-de-finances-2025-ACF.pdf ; https://blog.avocats.deloitte.fr/algerie-les-principales-mesures-importantes-de-la-loi-de-finances-pour-2025/ ; https://lesenjeuxeco.dz/loi-de-finances-2026-les-principales-mesures-fiscales/
- https://www.visa-algerie.com/hotels-lalgerie-veut-instaurer-une-nouvelle-taxe-de-sejour/ ; https://www.cn-cncc.dz/admin/Upload/site/revue/revue-5bfc01759dece5d6c71e6bd2ee96e7b3.pdf
- https://www.dcwalger.dz/fr/index.php/component/content/category/9-haut-p ; https://lamacta.com/en/blog/decret-executif-05-468-facture-legale-algerie/
- https://algerie-eco.com/2023/09/22/les-dispositions-applicables-au-numero-didentification-national-definies-par-decret/ ; https://passeport.interieur.gov.dz/ ; https://clr.africanchildforum.org/Legislation%20Per%20Country/algeria/algeria_idnumber_2010_fr.pdf

Geography / maps
- https://github.com/islam-re/Algeria-wilayas/blob/main/JO%20Article%202026.md ; https://github.com/el-amin-dev/algeria-wilayas-communes ; https://github.com/ihahachi/Algeria-Cities ; https://github.com/S450R1/algeria-cities-2025 ; https://github.com/othmanus/algeria-cities ; https://github.com/kossa/algerian-cities
- https://www.moroccoworldnews.com/2025/11/268183/algeria-creates-11-new-wilayas-as-critics-question-political-motives/ ; https://www.dzair-tube.dz/en/algeria-sets-stage-for-new-territorial-order-69-provinces-over-1500-communes-enter-final-phase-of-realization/ ; https://en.wikipedia.org/wiki/Provinces_of_Algeria
- https://operations.osmfoundation.org/policies/nominatim/ ; https://github.com/komoot/photon/discussions/730 ; https://openfreemap.org/

Infra
- https://icosnet.com.dz/en/web-hosting/ ; https://icosnet.com.dz/cloud-link/ ; https://www.datacenters.com/providers/djezzy-cloud ; https://www.datacenters.com/locations/algeria
- https://www.cloudflarestatus.com/locations ; https://mining.cloudflare.manfredi.io/pops/alg/ ; https://algeriatech.news/dns-cdn-web-performance-algeria/ ; https://algeriatech.news/algeria-medusa-cable-2026-bandwidth-enterprise-cloud-latency-guide-2026/ ; https://www.samenacouncil.org/samena_daily_news?news=76897
- https://northflank.com/blog/hetzner-cloud-server-price-increases ; https://www.bitdoze.com/hetzner-cloud-cost-optimized-plans/

Culture
- https://www.arpce.dz/fr/file/u1h4y0 ; https://en.wikipedia.org/wiki/Telephone_numbers_in_Algeria
- https://www.thenationalnews.com/mena/2021/12/07/when-is-the-weekend-in-the-arab-world/ ; https://www.officeholidays.com/countries/algeria/2026
- https://en.wikipedia.org/wiki/Arabic_numerals ; https://en.wikipedia.org/wiki/Modern_Arabic_mathematical_notation

Security
- https://owasp.org/API-Security/editions/2023/en/0x11-t10/ ; https://api-security.owasp.org/editions/2023/en/0x00-toc/
- https://consumer.ftc.gov/articles/rental-listing-scams ; https://guard.io/blog/airbnb-vacation-rental-scams-fake-listing
