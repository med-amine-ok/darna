# 08. Security and privacy

> **In plain words**
> This page says what we protect (people's identities, ID documents, money records, the platform's reputation), from whom, and how.
> It maps the ten most common API attacks (OWASP API Top 10) to BLADUS endpoints, and defines login, sessions, roles, secrets, encryption, file safety and rate limits.
> It explains how Algerian personal data law (Law 18-07 as amended by Law 25-11) shapes the design: data stays in Algeria, a register of processing, consents, a 5-day breach notice.
> Section 15 defines, one by one, the security controls decided after the review of 2026-11-13 (DEC-025, DEC-026): outgoing URL check, SMS limits, hashing, keys, CSRF, uploads, audit and ledger protection.
> It ends with a checklist to complete before launch and the questions a lawyer must answer.
> Every legal point is marked **VERIFY WITH A PROFESSIONAL**: this is an engineering plan, not legal advice.

**Terms used here** (see also [glossary.md](glossary.md)):
- **Threat model**: a structured list of what could go wrong, who could cause it, and what stops it.
- **STRIDE**: six kinds of threat: **S**poofing (pretending to be someone), **T**ampering (changing data), **R**epudiation (denying you did something), **I**nformation disclosure (leaks), **D**enial of service (making the site unusable), **E**levation of privilege (getting rights you should not have).
- **OWASP API Top 10**: the list of the 10 most common API security risks (2023 edition), published by the OWASP foundation.
- **OTP**: one-time password, here a 6-digit code sent by SMS or email.
- **MFA / 2FA**: multi-factor login: a password plus a second proof (an authenticator app code (TOTP) or a passkey).
- **TOTP**: time-based one-time password, the 6-digit code shown by apps such as Google Authenticator.
- **Passkey (WebAuthn)**: login with the phone or laptop's fingerprint or PIN; cannot be phished.
- **Session token**: a random value that proves "this request comes from a signed-in user". Here created by allauth, kept by the Next.js server.
- **Cookie flags**: `HttpOnly` (JavaScript cannot read it), `Secure` (only sent over HTTPS), `SameSite` (not sent with requests coming from other sites).
- **CSRF**: cross-site request forgery: another site makes your browser send a request to ours.
- **Encryption at rest / in transit**: data is unreadable on disk / on the network without a key.
- **Envelope encryption**: data is encrypted with a data key; the data key is itself encrypted with a master key kept elsewhere.
- **HMAC**: a hash mixed with a secret key; the same input always gives the same output, but nobody without the key can compute or reverse it.
- **Hash chain**: each audit row stores the hash of the previous row, so deleting or changing a row breaks the chain visibly.
- **ClamAV**: a free antivirus engine that scans uploaded files.
- **EXIF**: hidden information inside photos (camera, date, **GPS position**).
- **DPIA**: data protection impact assessment, a written study of the risks of a sensitive processing (here: ID documents).
- **Data subject**: the person the data is about (guest, host, staff).
- **Controller / processor**: the controller (BLADUS) decides why data is processed; a processor (hosting company, SMS provider) processes it on BLADUS's instructions.
- **RPO / RTO**: how much data we may lose (recovery point) / how long we may be down (recovery time) after a disaster.
- **SSRF**: server-side request forgery: tricking our server into calling an address it should not reach (an internal service, the cloud metadata address).
- **Pepper**: a server secret mixed into every hash, kept outside the database, so a stolen database alone cannot be used to guess short values like 6-digit codes.
- **Database role**: a PostgreSQL login with its own rights. The app's role is not the owner of the tables, so it cannot bypass the rules.

Inputs: [02-research.md](02-research.md) sections C.3 and D, [03-requirements.md](03-requirements.md) (ACC, STF, MED, PRV, NFR-05, NFR-11), [04-business-rules.md](04-business-rules.md), [05-database-schema.md](05-database-schema.md) ADR-012 and ADR-014, [07-architecture.md](07-architecture.md).

---

## 1. What we protect (assets)

| Asset | Where it lives | Sensitivity | Why it matters |
|---|---|---|---|
| ID documents and their numbers (KYC) | `host_document`, private bucket | **Very high** | Identity theft; law on personal data; trust of hosts |
| Payout and refund account numbers (CCP RIP, bank RIB) | `payout_account.number_encrypted` | **Very high** | Redirecting money (account takeover) |
| Login secrets: passwords, OTPs, session tokens, MFA secrets | `user`, allauth tables, Redis | **Very high** | Full account takeover |
| Ledger, wallet balances, top-ups, invoices | `ledger_*`, `wallet_topup`, `invoice` | **High** | Money; legal record keeping (10 years, VERIFY) |
| Exact addresses of homes | `listing` exact point, booking snapshot | **High** | Physical safety of hosts and guests |
| Contact details (phone, email), names in Arabic and Latin | `user`, `organization` | High | Spam, fraud, harassment |
| Messages between guests and hosts | `message` | High | Private conversations, contact details |
| Bookings (who stays where, when) | `booking` | High | Reveals movements and home absence |
| Audit log | `audit_event` | High | Our proof of who did what |
| Staff accounts and permissions | `staff_profile`, role tables | High | One staff takeover reaches everyone's data |
| Platform secrets (keys, database passwords) | secret store, servers | **Very high** | Everything above |
| Public listings and photos | `listing`, public bucket | Low (public) | Integrity: fake or changed listings harm guests |
| Availability and prices | inventory tables | Medium (business) | Scraping by competitors, calendar blocking |
| Reputation and service availability | whole platform | High | Outages and fraud destroy trust |

## 2. Who might attack, and who must be trusted

| Actor | Motivation | Typical attempts |
|---|---|---|
| Anonymous visitor / scraper | Data, competition | Bulk listing scraping, enumeration of ids, map scraping for exact addresses |
| Fraudster posing as host | Money | Fake listing with stolen photos, asks for a CCP transfer outside BLADUS, disappears |
| Fraudster posing as guest | Money, harm | Stolen identity, fake payment receipts sent to hosts, harassment |
| Account takeover attacker | Money, data | Password reuse, OTP brute force, SIM swap, phishing of staff |
| SMS pumping fraud | Money (premium SMS revenue share) | Mass OTP requests to number ranges they control |
| Competing host | Ranking | Fake reviews, calendar blocking with requests never confirmed |
| Malicious or careless staff member (insider) | Curiosity, money | Viewing KYC files without need, manual top-up to a friend's wallet, mass export |
| Compromised dependency or CI | Wide access | Malicious package, stolen deployment secrets |
| Hosting or infrastructure provider incident | none (accident) | Disk loss, data centre outage, misrouted backups |

Trusted components: the Next.js servers (BFF), the Django API, workers, PostgreSQL, Redis, object storage, all in the private network in Algeria ([02-containers](diagrams/rendered/02-containers.svg)). Trust boundaries: browser to proxy (internet), proxy to Next.js, Next.js to Django (private network, service authentication), Django to external providers (SMS, email, gateway in R2).

## 3. Threats by STRIDE

| STRIDE | Threat in BLADUS | Main controls | Rules / reqs |
|---|---|---|---|
| Spoofing | Login with stolen password or brute-forced OTP | Argon2 passwords, breached-password check, OTP 6 digits / 10 min / 5 tries, lockout, MFA for staff and payout hosts | BR-ACC-02, 04, 05 |
| Spoofing | Fake webhook claiming a payment (R2) | Signature verified, event re-fetched from the gateway, stored raw, processed once | BR-SYS-02, BR-PAY-08 |
| Spoofing | Request pretending to come from the BFF with a forged client IP | Django trusts `X-Forwarded-For` only from proxy/BFF addresses; BFF authenticates to Django with a service key on the private network | section 4.5 |
| Tampering | Changing a price or commission in the request | Server computes every price (quote); writable fields allowlisted; `status`, `commission_rate_bp` never writable by hosts | BR-PRC-01, API3 |
| Tampering | Editing ledger or audit rows directly in the database | Triggers refuse UPDATE and DELETE for every role; tables owned by `bladus_migrator`, app role `bladus_app` has SELECT and INSERT only (15.8); deferred balance trigger; hash chain; nightly `reconcile_balances` (BR-PAY-15); nightly verification | BR-PAY-02, BR-STF-02 |
| Tampering | Turning an approved listing into a fake one | Key-field edits go to a revision under review | BR-LST-02, ADR-009 |
| Repudiation | Staff denies refunding or approving | Audit event with actor id, role, IP, request id, before/after; hash chain | BR-STF-02, 03 |
| Repudiation | Host denies accepting a booking | `booking_event` with actor and time, insert-only | BR-BKG-06 |
| Information disclosure | Reading another user's booking (`/bookings/{id}`) | Object-level checks in selectors; UUIDv7 ids; 404 for other people's objects | API1, NFR-12 |
| Information disclosure | Exact address before confirmation | Public point fuzzed by up to 500 m; exact point only for host and confirmed guest | BR-SRC-03 |
| Information disclosure | KYC file leaked by URL sharing | Private bucket; signed URLs valid 5 min; every view audited | BR-MED-02 |
| Information disclosure | GPS position inside photos | Metadata stripped on re-encode | BR-MED-01 |
| Information disclosure | Personal data in logs or error tracking | Log scrubbing of phone, email, tokens, document numbers; Sentry/GlitchTip `send_default_pii = False` and scrubbers | [09-devops-hosting.md](09-devops-hosting.md) section 9 |
| Denial of service | Booking requests that block calendars without intent | Request TTL 24 h; per guest at most 3 pending requests and 6 upcoming bookings (`too_many_open_bookings`); velocity flags | BR-BKG-08, BR-BKG-04, API6 |
| Denial of service | SMS pumping draining budget | Per destination 3 per hour and 10 per day, per IP 10 per hour, global budget 5,000 SMS per day then `sms_budget_exceeded`; every send recorded in `otp_send_log` (HMAC of the destination) (15.2) | BR-ACC-02, NFR-11 |
| Information disclosure / Spoofing | SSRF through a URL given by a host (hotel system address, iCal link) | Outgoing URL check at save and at fetch time: https only, public IPs only, no cross-host redirect, 10 s, 5 MB (15.1) | BR-SYS-06, NFR-14 |
| Denial of service | Large uploads, expensive search | Presigned size limits, decompression-bomb limit, page size max 50, statement timeouts | API4 |
| Elevation of privilege | Host calling an admin endpoint | Separate `/api/v1/admin` surface, staff token + MFA, deny by default | STF-05, BR-STF-01 |
| Elevation of privilege | Organisation agent accepting bookings or seeing money | Organisation role permissions via django-rules | BR-ORG-05, DEC-009 |
| Elevation of privilege | Staff member giving themselves a role | One staff role, admin (DEC-016); `team.manage` changes need a second admin's confirmation; staff changes audited and notified to every admin | BR-STF-01 |

## 4. Authentication and sessions

### 4.1 Building blocks

django-allauth in **headless** mode, "app" client (research B.3): the API returns a session token; the Next.js server keeps it. allauth modules used: `account` (email and phone), `mfa` (TOTP, WebAuthn passkeys, recovery codes), `usersessions` (list and revoke sessions). Passwords hashed with **Argon2id**.

### 4.2 Cookies held by the Next.js servers

| Cookie | App | Content | Flags | Lifetime |
|---|---|---|---|---|
| `__Host-bladus_session` | Website | allauth session token, encrypted (AES-256-GCM) with `BLADUS_SESSION_COOKIE_KEY`, plus active host account id | `HttpOnly; Secure; SameSite=Lax; Path=/`; no `Domain` (the `__Host-` prefix forces this) | 30 days sliding (BR-ACC-03) |
| `__Host-bladus_admin` | Admin | staff session token, encrypted with `ADMIN_SESSION_COOKIE_KEY` | `HttpOnly; Secure; SameSite=Strict; Path=/` | 8 h absolute, 30 min idle (BR-ACC-03) |
| `bladus_locale` | Website | `en`, `fr` or `ar` | `Secure; SameSite=Lax` | 1 year |

- `SameSite=Lax` plus an **Origin check** on every mutating route handler and server action protects against CSRF on the website; the admin uses `Strict`.
- The Django API itself uses no cookies for the apps (token in header), so classic CSRF does not apply to it. The Django admin console uses Django's own session and CSRF cookies on its own host name.
- These replace the current `darna_session` (website, HMAC-signed, built-in development secret in test mode) and `darna_admin_session` (admin, JWT that cannot be revoked). With test mode OFF the website must refuse to start without its key.

### 4.3 Sign-in rules

| Topic | Rule |
|---|---|
| Sign-up | Email + password, or Algerian phone + OTP. Verification code before the first booking (DEC-012, BR-ACC-01) |
| Passwords | Minimum 10 characters; refused if in a local list of the 100,000 most common breached passwords; no composition rules; change revokes all other sessions (ACC-04) |
| OTP | 6 digits, valid 10 min, invalidated after 5 wrong tries, max 3 sends per phone per hour and 10 per IP per hour, same error for every failure (BR-ACC-02). Phone numbers outside Algeria need an extra check (CAPTCHA by a self-hosted provider, or email verification first) to limit SMS pumping |
| Lockout | 5 failures in 15 min lock the account and the IP for 60 s, counters in Redis shared by all servers (BR-ACC-05). Repeated locks increase the wait (60 s, 5 min, 15 min) |
| Staff MFA | Mandatory before any admin endpoint works (`403 mfa_required`); TOTP or passkey; 10 single-use recovery codes; passkeys recommended for admins (BR-ACC-04) |
| Host MFA | Mandatory before adding or changing payout or refund account details (BR-ACC-04, BR-PAY-09) |
| Step-up | Sensitive actions (change email or phone, payout details, ownership transfer, staff role change, export) need a fresh authentication within the last 10 minutes |
| Session revocation | Logout, password change, staff deactivation, ban: tokens deleted server-side immediately; the next API call returns `401` (ACC-03, STF-02) |
| New device | Email or SMS notice on sign-in from a new device for hosts with a wallet and for staff |
| Staff invitation | One-time link valid 48 h; staff sets password, then must enrol MFA before the first admin page (STF-02) |

### 4.4 Account recovery and SIM swap

Phone-number recovery alone is not enough for hosts with payout details or for staff: they also need the email link or an MFA recovery code. After a phone or email change, payout changes are blocked for 72 h and the old contact is notified (BR-PAY-09, research D.2).

### 4.5 Service-to-service authentication

- Next.js to Django: private network only, plus a header `X-BFF-Key` with a per-app secret (`BFF_SERVICE_KEY_WEBSITE`, `BFF_SERVICE_KEY_ADMIN`) checked by a Django middleware. A request to `/api/v1/admin` with the website key is refused even with a staff token.
- Django to PostgreSQL and Redis: TLS on the private network, separate database roles (section 7.3).
- Workers to providers (SMS, email): API keys from the secret store; outbound traffic through an egress proxy allowlist (SSRF protection, API7).

## 5. Authorisation

### 5.1 Three surfaces, deny by default

1. **Public and guest** (`/public`, `/me`): object ownership checked in selectors (`bookings_for_guest(user)`); other people's objects return **404**, not 403, so ids cannot be probed.
2. **Host** (`/host`): every request names `X-Host-Account`; a permission class checks the user holds it (individual owner or active membership) and the organisation role permission (table 5.3). Lists are always filtered by that host account.
3. **Staff** (`/admin`): staff token, MFA done, permission check on every endpoint (table 5.2). Today every admin has every permission (DEC-016); the checks stay in the code so roles can be split later without new endpoints.

Output fields per role are separate serializers (no "one serializer with hidden fields"). Writable fields are an explicit allowlist per endpoint (mass-assignment protection, API3).

### 5.2 Staff roles and permissions

**One staff role: admin, with every permission (DEC-016, BR-STF-01).** The permission list stays in `staff_permission` and `staff_role_permission`, and every admin endpoint still checks its permission (deny by default), so roles can be split later (for example a privacy officer or a read-only analyst) by data, not by new code.

| Permission groups (all granted to admin) | Examples |
|---|---|
| Hosts | hosts.view, hosts.approve, hosts.reject, hosts.suspend, hosts.delete, hosts.commission_override, kyc.view_documents (every view audited) |
| Listings and reviews | listings.view, listings.approve, listings.feature, listings.delete, reviews.view, reviews.moderate, reviews.delete |
| Users and privacy | users.view, users.suspend, users.ban, users.delete, privacy.handle_requests |
| Bookings | bookings.view, bookings.cancel, bookings.dispute, bookings.refund |
| Money | wallets.view, wallets.recharge, commissions.manage, ledger.adjust, payouts.approve (dormant) |
| Platform | onboarding.edit, team.manage, settings.manage, categories.manage, promotions.manage, reports.export, audit.view |

**Separation of duties with one role** (DEC-022): it comes from **two different admin accounts**, not from two roles.

- Top-ups: when the host's rolling 24-hour total of top-ups (pending + approved, including the new one) passes 500,000 DZD, a second admin must approve; the approver is always different from the requester (`four_eyes_same_user`, BR-PAY-07).
- Manual wallet adjustments (`wallet_adjustment`): always need a second admin (`four_eyes_required`), at most 1,000,000 DZD each, reason required, audited (BR-PAY-13).
- An admin cannot deactivate the last other admin; staff changes are notified to every admin.
- BLADUS must therefore always have at least two active admin accounts held by two real people.

### 5.3 Organisation roles

From BR-ORG-05, table 2a in [04-business-rules.md](04-business-rules.md):

| Permission | owner | admin | manager | agent | guide |
|---|---|---|---|---|---|
| org.edit, members.manage | X | X | | | |
| org.delete, ownership transfer | X | | | | |
| listings.manage, trips.manage, calendar.manage | X | X | X | | |
| bookings.view | X | X | X | X | own departures |
| bookings.respond (accept, decline) | X | X | X | | |
| bookings.cancel_as_host | X | X | | | |
| messages.reply | X | X | X | X | X |
| wallet.view, invoices.view | X | X | | | |
| payout_details.edit (with MFA) | X | | | | |

Individual hosts hold every permission on their own host account.

## 6. OWASP API Top 10 (2023) mapped to BLADUS endpoints

| Risk | Endpoints most at risk | Controls | How we test |
|---|---|---|---|
| API1 Broken object level authorisation | `GET/PATCH /me/bookings/{id}`, `/host/bookings/{id}`, `/me/conversations/{id}`, `/host/documents/{id}`, `/admin/hosts/{id}/documents/{doc}` | Scoped selectors; UUIDv7; 404 for foreign objects; tests per endpoint with a second user | `test_api1_*` per app: user B cannot read user A's object |
| API2 Broken authentication | `/_allauth/app/v1/auth/login`, `/auth/code/request`, `/auth/password/reset` | Section 4; lockout; same error message for all failures | Brute-force test hits lock at try 6 |
| API3 Broken object property level authorisation | `PATCH /host/listings/{id}` (status, commission), `GET /public/listings/{id}` (exact address, host phone) | Explicit writable fields; output serializers per role; host phone hidden before confirmation | Schemathesis + tests that `status` in PATCH body is ignored or refused |
| API4 Unrestricted resource consumption | `/public/search`, `/public/search/map`, `/host/media/uploads`, `/auth/code/request` | Page size max 50, 500 map pins, upload size in presigned policy, OTP and SMS budget, statement timeout 5 s | k6 abuse scenarios; limits in unit tests |
| API5 Broken function level authorisation | `/admin/*` (refund, top-up, ban), `/host/organizations/{id}/members` | Separate surface; staff permission per view; org role per view; deny by default | Matrix test: every admin endpoint x every role |
| API6 Unrestricted access to sensitive business flows | `POST /me/bookings` (calendar blocking), `/public/quotes`, reviews, invitations, coupons (R2) | Max 5 open requests per guest; request TTL; reviews only after completed booking; coupon per-user limit; velocity rules | Business-flow tests; risk flags (R2) |
| API7 Server-side request forgery | Hotel system connection (`POST /host/integrations`, sync job), iCal import feeds (`calendar_feed`, Later), image-by-URL (not offered) | Outgoing URL check at save and at every fetch: https only, public IPs only (no loopback, private, link-local, CGNAT, multicast, reserved, 169.254.169.254), no cross-host redirect, 10 s timeout, 5 MB cap (15.1, BR-SYS-06); egress proxy allowlist | Unit tests on `netguard` with private, metadata and redirect cases; DNS rebinding test |
| API8 Security misconfiguration | Whole API, Django admin console, Redis, storage buckets | Hardening checklist (section 13); `DEBUG = False`; CORS closed (BFF only); security headers; Redis not public; buckets private by default | Automated config checks (`manage.py check --deploy`), external scan before launch |
| API9 Improper inventory management | Old `/api/v1` endpoints, staging with real data, forgotten debug routes | OpenAPI is the inventory; CI diff on every change; staging uses synthetic data only; old versions removed on a schedule | OpenAPI diff gate; route list compared with spec |
| API10 Unsafe consumption of APIs | Payment gateway (R2), SMS and email providers, Nominatim | Webhook signature + server-side status re-check; timeouts; validate provider responses; never trust redirect parameters | Contract tests with recorded provider responses |

## 7. Secrets, keys and encryption

### 7.1 Secrets management

| Rule | Detail |
|---|---|
| Where secrets live | Production and staging secrets in an encrypted file per environment (SOPS with age keys) in a private operations repository; decrypted only on the servers at deploy time into files readable by the service user. Move to HashiCorp Vault or OpenBao when the team grows |
| Never | In the application repository, Docker images, `NEXT_PUBLIC_` variables, logs, error reports, tickets or chat |
| CI | GitHub Actions environment secrets with required reviewers for `production`; CI never holds database or encryption keys, only deploy credentials |
| Access | Two named people hold production key access; each access to the master encryption key is logged |
| Rotation | See table 7.2. Rotation is rehearsed in staging first |
| Leak response | Rotate, revoke, search logs for use, record in the incident register |

### 7.2 Key and secret inventory

| Secret | Used for | Rotation |
|---|---|---|
| `DJANGO_SECRET_KEY` | Django signing (password reset links, Django admin console) | Yearly, or on leak (supports a fallback list) |
| `BLADUS_SESSION_COOKIE_KEY`, `ADMIN_SESSION_COOKIE_KEY` | Encrypt BFF cookies | Yearly (two keys accepted during rotation) |
| `BFF_SERVICE_KEY_WEBSITE`, `BFF_SERVICE_KEY_ADMIN` | Next.js to Django service authentication | Every 6 months |
| `FIELD_ENCRYPTION_KEYS` (master key, versioned) | Envelope encryption of payout numbers | Yearly; old versions kept to decrypt, data re-wrapped by a job |
| `ID_HASH_PEPPER` | HMAC of document numbers and recipient hashes | Never rotated casually (hashes would change); rotation needs a planned re-hash from the source documents, impossible after images are deleted, so guard it carefully |
| `HASH_PEPPER` | HMAC-SHA256 of one-time codes, session token lookups and lookup hashes (phone, email) (BR-SYS-07, 15.3) | Yearly or on leak, by a dual-check window: new hashes use the new pepper, checks accept old and new until the longest-lived value expires (codes 10 min, sessions 30 days) |
| `INTEGRATION_KEYS` (versioned, key id per record) | AES-GCM (Fernet acceptable) encryption of hotel system credentials in `property_integration` (15.4) | Yearly; records store `credentials_key_id`; a job re-encrypts with the new key, old key removed after the job |
| Database passwords (per role) | PostgreSQL | Every 6 months |
| Redis password | Redis AUTH | Every 6 months |
| Storage access keys | Object storage | Every 6 months |
| SMS, email, gateway API keys and webhook secrets | Providers | Yearly or per provider policy |
| Backup encryption key (age) | Encrypt dumps and archives | Yearly; private key stored offline by two people |

### 7.3 Encryption

| Layer | How |
|---|---|
| In transit, public | TLS 1.2 and 1.3 only, modern ciphers, HSTS `max-age=63072000; includeSubDomains; preload` after a trial period, certificates by ACME (Let's Encrypt) through Caddy |
| In transit, private | PostgreSQL `sslmode=verify-full`; Redis with TLS and AUTH; object storage over HTTPS even inside the network |
| At rest, disks | Full-disk encryption (LUKS) on database, storage and backup volumes where the provider allows it; otherwise encrypted volumes on top of provider disks (VERIFY with ICOSNET / Djezzy Cloud what is offered) |
| At rest, backups | Every dump and WAL archive encrypted with age before leaving the server (see [09-devops-hosting.md](09-devops-hosting.md)) |
| At rest, object storage | Server-side encryption on private and quarantine buckets |
| Field level: payout numbers | AES-256-GCM with a random data key per row; data key wrapped by the master key from `FIELD_ENCRYPTION_KEYS`; stored as `key_version + wrapped_key + nonce + ciphertext` in `payout_account.number_encrypted`; only `number_last4` in clear (ADR-014). The master key is never in the database or in backups |
| Field level: ID numbers | Never stored in clear. Normalised (digits only, upper case), then `HMAC-SHA256(ID_HASH_PEPPER, type + ":" + number)` in `host_document.number_hash`, used to detect the same ID on two accounts (research D.2) |
| Recipients in logs | `delivery_log.recipient_hash` is an HMAC of the phone or email, never the clear value |
| Database roles | `bladus_migrator` (owner, used only by migrations), `bladus_app` (SELECT and INSERT only on ledger, audit, `booking_event`; see 15.8), `bladus_readonly` (reports, replicas), `bladus_backup` |

## 8. File security

| Control | Detail | Rule |
|---|---|---|
| Direct upload with presigned PUT | Valid 5 minutes, exact `Content-Type` and `Content-Length` in the signature, into the **quarantine** bucket only | MED-01 |
| Real type check | Magic bytes, not file name or browser type; SVG, HTML and Office files refused | BR-MED-01, 02 |
| Decompression bombs | Pillow `MAX_IMAGE_PIXELS = 50,000,000`; worker memory and time limits | API4 |
| Metadata | Photos re-encoded; EXIF, XMP, IPTC (including GPS) removed | BR-MED-01 |
| Virus scan | ClamAV daemon (signatures updated hourly) for every document and message attachment; infected files deleted and the event audited | BR-MED-02 |
| PDF safety | Refuse PDFs with JavaScript, launch actions or embedded files | BR-MED-02 |
| Private bucket | No public listing; downloads by signed GET valid 5 minutes, `Content-Disposition: attachment`; each view writes `audit_event` (`KYC_DOCUMENT_VIEW`) | BR-MED-02 |
| Naming | Random UUID keys; original file name kept only as metadata, sanitised | |
| Retention | ID images deleted 90 days after the verification decision (VERIFY) | BR-PRV-05 |

## 9. Rate limits

Two layers: coarse limits per IP at the proxy (Caddy) to stop floods, fine limits per user / IP / phone in Django (DRF throttles and allauth limits) stored in Redis db 2. Responses use `429` with `Retry-After`.

| Scope | Limit | Layer |
|---|---|---|
| Any request per IP | 30 per second burst, 600 per minute | Proxy |
| Login attempts | 5 failures in 15 min per account and per IP, then lock 60 s (growing) | allauth + Redis (BR-ACC-05) |
| OTP and SMS send | Per destination (phone or email) 3 per hour and 10 per day; per IP 10 per hour; 20 per device id per day; every attempt (sent, failed, `blocked_rate_limit`) written to `otp_send_log` | Redis + service (BR-ACC-02) |
| Global SMS budget | 5,000 SMS per day (setting `sms_daily_budget`); above it SMS sends answer `sms_budget_exceeded` and the admins are alerted | service (BR-ACC-02) |
| OTP verify | 5 tries per code | allauth |
| Password reset request | 3 per account per hour, 10 per IP per hour | allauth |
| Search and public reads | 120 per minute per IP, 300 per minute per signed-in user | DRF |
| Quote | 60 per minute per user or IP | DRF |
| Booking create | 10 per hour per guest; at most 3 pending requests and 6 upcoming bookings at once (`too_many_open_bookings`) | DRF + service (BR-BKG-08, API6) |
| Check-in code entry | 5 wrong codes per booking lock host entry for 1 hour | service (BR-BKG-09) |
| Messages | 30 per minute per user; 200 per day to new conversations | DRF |
| Message polling | 1 per 3 seconds per user per conversation | DRF |
| Upload slots | 60 per hour per host account | DRF |
| Reviews and reports | 10 reports per day per user | DRF |
| Admin API | 600 per minute per staff user; exports 10 per hour | DRF |
| SMS budget | daily and monthly caps in settings, spend summed from `otp_send_log.cost_minor` and `delivery_log.cost_minor`; alert at 80%, stop non-critical SMS at 100%; abnormal volume per phone prefix or IP range raises a pumping alert | job `notifications.sms_budget_check` (NFR-11) |

## 10. Audit log with hash chain

- **What is logged** (STF-03): every staff write; every host money action (top-up, commission override, payout details change); team changes (invite, role change, removal, ownership transfer); logins, failed logins, MFA changes and session revocations; every KYC file view; exports (filters and row count); settings and onboarding publishes; privacy requests and their handling.
- **Row content**: `occurred_at`, `actor_id`, `actor_kind`, `actor_role`, `action`, `object_type`, `object_id`, `host_account_id`, `before`, `after`, `ip`, `user_agent`, `request_id`, `prev_hash`, `hash` ([schema.dbml](schema.dbml)). `before` and `after` keep only changed fields and never contain secrets, full document numbers or message bodies.
- **Hash**: `hash = SHA-256(prev_hash || canonical_json(row without hash))`, where canonical JSON has sorted keys and UTC timestamps. Rows are appended through one service which takes a short advisory lock so the chain has a single order.
- **Protection**: insert-only, enforced twice: a trigger refuses UPDATE and DELETE for every role, and `bladus_app` has only SELECT and INSERT (the table owner is `bladus_migrator`, see 15.7); a daily job exports the previous day to write-once object storage; monthly partitions; the job `audit.verify_hash_chain` recomputes yesterday's chain each night and stores the day's final hash as an **anchor** in a separate place (the backup bucket in the second data centre and an email to two named people). A break raises a critical alert.
- **Access**: `audit.view` for reading; nobody can edit. Exports of the audit log are themselves audited.
- **Retention**: 5 years for staff and security events, 10 years where linked to accounting (VERIFY).

`pghistory` row history (bookings, listings, memberships, settings) complements the audit log for "what did this row look like before" questions (ADR-012).

## 11. Fraud and trust controls

| Pattern (research D.2) | Signals | Controls | Rules |
|---|---|---|---|
| Off-platform payment push (CCP/RIP numbers, BaridiMob, WhatsApp links before confirmation) | Regex and number patterns in messages | Masked before confirmation; repeated attempts flag the thread; guest warning banner | BR-MSG-01, MSG-04 |
| Fake listing with stolen photos | Perceptual hash match, reverse-image hits, new host with many listings | Review before publishing; proof of property for the first listing; trust case on duplicates | BR-LST-02, BR-MED-01, BR-HST-03 |
| Duplicate accounts after a ban | Same phone, same device id, same ID number hash | Block sign-up or verification with a matching hash; case for staff | BR-ACC-01, ADR-014 |
| Account takeover via SIM swap | Phone change then payout change; new device; new country | Re-verification; MFA; 72 h hold on payout changes; notices to old contacts | BR-PAY-09 |
| Fake wallet top-up receipt | Same receipt reference twice; large amounts; several top-ups split under the threshold | Unique receipt per method; four-eyes when the rolling 24-hour total passes 500,000 DZD; approver always different | BR-PAY-07 |
| Admin crediting a wallet by hand | Manual adjustments | `wallet_adjustment` only, never an edit; second admin; cap 1,000,000 DZD; audited; nightly reconciliation | BR-PAY-13, BR-PAY-15 |
| Host keeps the guest's money after a cancellation | Refund obligation open or disputed past its due date | Refund obligation tracked as a debt (7 days); overdue: instant booking off and no accepting requests (`refund_overdue`); guest can dispute; admin can settle with proof. VERIFY WITH A PROFESSIONAL (consumer law on refund delays) | BR-CAN-06, BR-CAN-07 |
| Host cancels to avoid commission | Many guest cancellations with non-refundable shares | Commission follows the refund: the host keeps commission only on the refunded share (DEC-018 revised) | BR-PAY-05 |
| Calendar blocking by fake requests (booking hoarding) | Many open requests, no confirmations | 24 h TTL; at most 3 pending requests and 6 upcoming bookings per guest (`too_many_open_bookings`); flags | BR-BKG-04, BR-BKG-08, API6 |
| Fake reviews and review rings | Reviews only from completed bookings with a confirmed stay; bursts; same IP/device | Stay confirmation (check-in code entered by the host, or guest confirmation after check-in time) before any review; a completed booking also cost the host its commission; burst and ring detection (R2) | BR-BKG-09, BR-REV-01, BR-MOD-04 |
| SMS pumping | Many OTP requests to sequential numbers or foreign ranges, visible in `otp_send_log` (by phone hash and IP) | Limits per phone/IP/device; foreign numbers need extra checks; budget stop | BR-ACC-02, ACC-02, NFR-11 |
| Staff insider abuse | Unusual KYC views, exports, top-ups, adjustments | Four-eyes with two admin accounts; every view audited; insert-only audit with daily write-once export; weekly review of KYC views and exports by a second admin | BR-STF-01, 02, 04, BR-PAY-13 |
| Host with many cancellations | 3 host cancellations in 12 months | Moderation case | BR-CAN-03 |

Principle: risk rules add friction (extra check, case for staff), they never silently block (BR-MOD-04, Airbnb "targeted friction", research A.1).

## 12. Privacy by design (Law 18-07 as amended by Law 25-11)

All of this section: **VERIFY WITH A PROFESSIONAL.** Status of the law text: research C.3 rates it [secondary].

### 12.1 Roles and formalities

| Topic | Plan |
|---|---|
| Controller | BLADUS (the legal entity operating the platform) |
| Processors | Hosting provider (ICOSNET or Djezzy Cloud), backup site, SMS aggregator, email provider, later payment gateway. Each needs a written contract with data protection clauses |
| ANPDP formalities | File the prior declaration or request authorisation for each processing in the register (12.2) **before launch**; KYC and any transfer abroad likely need authorisation (L2) |
| Data protection contact | Name a person responsible for personal data (and a DPO if required, L7) |
| Privacy notice | In en, fr, ar; versioned; acceptance stored in `consent_record` (PRV-01) |

### 12.2 Register of processing (first version)

| Processing | Data | People | Purpose | Legal basis (to confirm) | Retention | Recipients | Location |
|---|---|---|---|---|---|---|---|
| Accounts and login | Name (ar, latin), email, phone, password hash, sessions, IP | Guests, hosts, staff | Provide the service, security | Contract | Account life + 3 years after closure (VERIFY) | BLADUS staff by role | Algeria |
| Host verification (KYC) | ID images, document numbers (hashed), RC, NIF, NIS, licences, proof of property | Hosts, organisation representatives | Fraud prevention, legal checks on hosts | Legal obligation / legitimate interest (VERIFY) | Images 90 days after decision; decision and hash for account life + 5 years | Moderators with `kyc.view_documents` | Algeria |
| Bookings | Guest identity, dates, guests count, amounts, address revealed | Guests, hosts | Contract execution, Law 18-05 transaction records | Contract, legal obligation | 10 years (accounting, VERIFY) | Host of the booking, support, finance | Algeria |
| Commission wallet and invoices | Host account, amounts, receipts, payout account (encrypted) | Hosts | Accounting, commission | Contract, legal obligation | 10 years | Finance | Algeria |
| Messages | Message text (masked view), attachments | Guests, hosts | Communication, dispute handling, fraud prevention | Contract, legitimate interest | 3 years after last activity | Participants; support on a case | Algeria |
| Reviews | Ratings, comments, first name | Guests, hosts | Trust | Contract / legitimate interest | Account life; anonymised on deletion | Public | Algeria |
| Notifications | Phone, email, language | All users | Service messages | Contract | Delivery log 1 year (hashed recipient) | SMS and email processors | Algeria; foreign providers only after authorisation |
| Marketing | Email, phone, opt-in record | Opted-in users | Promotions | Consent (Law 18-05 art. 31) | Until withdrawal | Email provider | As above |
| Audit and security logs | Actor id, IP, user agent, actions | Staff, users | Security, accountability | Legitimate interest / legal obligation | 5 to 10 years (see 10) | Super admins | Algeria |
| Foreign guest declaration support (R2) | Nationality, ID type | Foreign guests | Help hosts with Law 08-11 art. 29 duty | Legal obligation (VERIFY, L6) | As required by law | Host | Algeria |

### 12.3 Consents

- Stored in `consent_record` with document (`terms`, `privacy`, `marketing`), version, time, IP (BR-PRV-01).
- Marketing is opt-in, never pre-ticked, withdrawable in one click from every message (NTF-03, BR-PRV-03). Critical service messages cannot be switched off.
- A new version of the terms or privacy notice asks for acceptance again at the next sign-in.

### 12.4 DPIA for KYC (outline)

1. Description: which documents per host type (table 3a in [04-business-rules.md](04-business-rules.md)), who sees them, how long.
2. Necessity: why each document is needed (L4); can a check be done without keeping the image (keep decision + hash)?
3. Risks: leak of ID images, insider viewing, identity theft, over-retention.
4. Measures: private bucket, scan, 5-minute signed views, every view audited, weekly review, 90-day deletion, HMAC instead of numbers, encryption at rest, data in Algeria.
5. Residual risk and sign-off by the responsible person; review yearly or on change.

### 12.5 Data subject requests

| Request | How | Deadline (VERIFY) |
|---|---|---|
| Access | Self-service JSON export from the profile (`/me/privacy/export`), built by a job, link valid 24 h | Target 30 days, usually same day |
| Correction | Profile edit; name changes on verified hosts go through re-verification | 30 days |
| Deletion | `data_subject_request` (kind `deletion`), identity re-confirmed, 14-day cooling-off, then anonymisation job: names, contacts, photos, ID files erased; bookings, ledger, invoices kept with a pseudonymous id for the legal period (BR-PRV-02) | 30 days |
| Objection to marketing | One click, immediate | Immediate |
| Requests by email or letter | Logged by staff with `privacy.handle_requests` in the same table, `due_at` tracked on the admin dashboard | as above |

Blocking cases: open bookings or disputes, negative wallet balance; the user is told what remains and why.

### 12.6 Retention table (proposal, VERIFY WITH A PROFESSIONAL)

| Data | Keep | Then | Job |
|---|---|---|---|
| ID document images | 90 days after the verification decision | Delete file; keep decision, type, number hash | `accounts.retention_sweep` |
| Rejected applicant documents | 90 days after rejection | Delete | same |
| Booking records | 10 years after check-out | Anonymise guest identity | same |
| Ledger, top-ups, invoices | 10 years after the financial year | Archive offline | manual yearly |
| Messages | 3 years after last activity | Delete bodies, keep metadata 1 more year | same |
| Notifications | 1 year | Delete | same |
| Delivery log | 1 year | Delete | same |
| Quotes not booked | 24 hours after expiry | Delete | `pricing.purge_expired_quotes` |
| Idempotency records | 24 hours | Delete | `core.purge_idempotency_records` |
| OTP send log (`otp_send_log`, hashed phone, IP) | 90 days | Delete | `accounts.retention_sweep` |
| Incident register (`incident_record`) | 5 years after closure (VERIFY) | Archive offline | yearly |
| Application logs | 90 days hot, 1 year archived | Delete | log rotation |
| Audit events | 5 years (10 if money-related) | Archive offline | yearly |
| Backups | PITR 7 days, nightly 35 days, monthly 12 months | Delete | backup tool |
| Deleted accounts | Anonymised after 30 days | Pseudonymous id only | `accounts.process_deletion_requests` |

### 12.7 Personal data breach runbook (5-day clock)

Law 25-11 requires notifying ANPDP within **5 days** (research C.3, VERIFY the exact start of the clock and the content of the notice).

| Time | Action | Who |
|---|---|---|
| Hour 0 | Anyone who suspects a breach reports it in the incident channel; the on-call engineer creates an `incident_record` row (`detected_at` = time of discovery = start of the clock; `personal_data_involved`; the system sets `anpdp_deadline_at = detected_at + 5 days`) | Anyone, on-call |
| Hour 0 to 4 | Contain: revoke keys or sessions, block accounts or IPs, take affected systems offline if needed; preserve logs and evidence (no wiping) | On-call + tech lead |
| Hour 4 to 24 | Assess: which data, how many people, which categories (KYC, contacts, money), whether data left the system; severity (low / high) | Tech lead + data protection contact |
| Day 1 to 2 | Decide on notification with the lawyer; draft the ANPDP notice (nature of the breach, categories and number of people and records, likely consequences, measures taken, contact person) | Data protection contact + lawyer |
| Day 2 to 4 | If high risk to people: prepare messages to affected users in en, fr, ar (what happened, what to do, contact) | Data protection contact |
| **Before day 5** | Send the notice to ANPDP; set `anpdp_notified_at` and attach the sending proof | Data protection contact |
| Day 5+ | Inform users if required (set `users_notified_at`); follow up; root cause analysis; fixes with deadlines; update this runbook; set `closed_at` | Team |

The incident register is the `incident_record` table (staff-only, every change audited in `audit_event`). It keeps every incident, even those not notified to ANPDP, with the reasoning in `summary` and `actions_taken`. The hourly job `audit.incident_deadline_watch` reminds the owner and super admins at day 2, day 4 and 12 hours before `anpdp_deadline_at` while `anpdp_notified_at` is empty.

### 12.8 Data residency

| Data | Location | Note |
|---|---|---|
| PostgreSQL, Redis, private and quarantine buckets, backups, logs, error tracking | **Algeria only** (primary and second data centre) | BR-PRV-04, PRV-03 |
| Public listing photos and static JS/CSS | Algeria by default; a foreign CDN only for static files and photo renditions **without people's faces or personal data**, after legal advice | VERIFY (L1, L2) |
| Error tracking | Self-hosted Sentry-compatible tool (GlitchTip) in Algeria, PII scrubbing on; Sentry SaaS would send data abroad | L10 |
| SMS and email providers | Prefer Algerian providers. A foreign provider (Twilio, Resend) receives phone numbers and email addresses: that is a **transfer abroad** that may need ANPDP authorisation | VERIFY (L2, L10) |
| CI (GitHub Actions) | Source code and synthetic test data only; never production data or secrets for data stores | |
| Staging | Synthetic data only, so it may run anywhere; we still keep it in Algeria for parity | |

## 13. Pre-launch security checklist

- [ ] `NEXT_PUBLIC_BLADUS_TEST_MODE=0` in the website production build; the build fails otherwise; demo accounts absent; no development secrets anywhere.
- [ ] All `DARNA_SESSION_SECRET` / `ADMIN_AUTH_SECRET` mock auth code removed after the auth module migration.
- [ ] `manage.py check --deploy` clean; `DEBUG = False`; `ALLOWED_HOSTS` exact; `SECURE_PROXY_SSL_HEADER` set correctly; security headers (HSTS, CSP, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `frame-ancestors 'none'`) on both Next.js apps and Django admin console.
- [ ] TLS A grade on an external test; HTTP redirects to HTTPS.
- [ ] Django API not reachable from the internet except the webhook path; Redis, PostgreSQL, storage admin ports closed from outside (external port scan).
- [ ] Database roles and grants applied (`bladus_migrator` owns, `bladus_app` runs); `bladus_app` cannot UPDATE or DELETE ledger, audit, `booking_event`, and the triggers refuse it even for the owner (test).
- [ ] Outgoing URL check (`apps/core/netguard.py`) tested with the private, metadata and redirect cases.
- [ ] `HASH_PEPPER` and `INTEGRATION_KEYS` generated, stored in the secret store, backed up offline by two people.
- [ ] BFF CSRF: Origin check and double-submit token on every state-changing route (test).
- [ ] `reconcile_balances` scheduled nightly and its alert tested; daily audit export to write-once storage running.
- [ ] Every admin account has MFA; admins use passkeys; recovery codes stored offline; at least two active admin accounts held by two people.
- [ ] Admin app reachable only through allowlisted IPs or a VPN, in addition to MFA.
- [ ] Rate limits active and tested (section 9); SMS budget caps configured.
- [ ] Secrets in the secret store only; repository scanned for secrets (gitleaks) including history.
- [ ] Dependency scans clean or accepted (pip-audit, npm audit, image scan with Trivy).
- [ ] Field encryption key and ID pepper generated, stored, backed up offline by two people; restore of an encrypted field tested.
- [ ] Backups encrypted, in the second Algerian data centre; restore drill done once (see [09-devops-hosting.md](09-devops-hosting.md)).
- [ ] Audit hash chain verification job running; anchor delivered.
- [ ] ClamAV running with fresh signatures; EXIF strip verified on a phone photo with GPS.
- [ ] Log and error scrubbing verified (no phone, email, token, document number in logs).
- [ ] OWASP API Top 10 tests green (section 6); external penetration test done and high findings fixed.
- [ ] Privacy notice and terms published in 3 languages; consent capture working.
- [ ] ANPDP declarations or authorisations filed (VERIFY); processor contracts signed.
- [ ] Breach runbook printed, contacts current, one tabletop exercise done (including creating a test `incident_record` and seeing the deadline reminders).
- [ ] Incident on-call rota defined.

## 14. Items needing a lawyer (VERIFY WITH A PROFESSIONAL)

| # | Question | Linked |
|---|---|---|
| L1 | Does Law 18-05 art. 8 (hosting in Algeria, `.com.dz`) apply to BLADUS, to the API, to static files and to a CDN? | 12.8, [09](09-devops-hosting.md) |
| L2 | Which ANPDP declarations or authorisations must be filed before launch? | 12.1, 12.8 |
| L3 | Is the prepaid commission deposit (M1) outside payment-service licensing (Règlement 25-02)? | DEC-001 |
| L4 | Which KYC documents are necessary and proportionate per host type? | 12.4 |
| L6 | Foreign guest declaration duty (Law 08-11 art. 29): what must BLADUS collect or remind? | 12.2 |
| L7 | Retention periods (ID images, bookings, messages, invoices, logs, OTP send log, incident register); is a DPO mandatory? | 12.6 |
| L8 | Terms of use and privacy notice texts in ar, fr, en, versioned for consent records | 12.1, 12.3 |
| L10 | Do foreign providers touching personal data (SMS fallback, email, error tracking, uptime monitoring) count as a transfer abroad? | 12.8 |
| L11 | Company formalities, including the `.com.dz` domain holder | [09](09-devops-hosting.md) section 4 |
| L13 (new) | Exact content, addressee and start of the 5-day breach notification clock; duty to inform users | 12.7 |
| L14 (new) | Legal basis for each processing in the register (contract, consent, legal obligation, legitimate interest as recognised by Law 18-07) | 12.2 |
| L15 (new) | Rights deadlines (access, correction, deletion) and identity checks allowed before answering | 12.5 |
| L16 (new) | Is publishing a reviewer's first name and the host's name allowed without separate consent? | 12.2 |

L1 to L12 are tracked in [13-decisions-needed.md](13-decisions-needed.md). New items L13 to L16 should be added there at its next update.

## 15. Security controls decided on 2026-11-13 (DEC-025, DEC-026)

Each control below says what it does, where it is enforced and how we test it. The rule ids are in [04-business-rules.md](04-business-rules.md). (Section number 15 keeps the earlier section numbers stable.)

### 15.1 Outgoing URL check (SSRF)

| | |
|---|---|
| What | Any URL a host gives (hotel system `base_url`, iCal link) must be `https`, and its host name must resolve **only** to public IP addresses: no loopback, private (10/8, 172.16/12, 192.168/16, fc00::/7), link-local, CGNAT 100.64.0.0/10, multicast, reserved, and never the metadata address 169.254.169.254. No redirect to another host. Timeout 10 seconds; response capped at 5 MB |
| When | At save time (clear error for the host) **and again at every fetch** (DNS can change between save and fetch); the connection is made to the checked IP address, so a second DNS answer cannot switch it |
| Where | `apps/core/netguard.py`, used by the hotel sync and iCal jobs; outbound traffic also goes through the egress proxy allowlist (4.5) |
| Rule | BR-SYS-06, NFR-14 |
| Test | `https://169.254.169.254/`, `https://127.0.0.1/`, `https://10.0.0.5/`, a name that resolves to a private IP, `http://` URLs, a redirect to another host, a slow server (11 s) and a 6 MB answer are all refused |

### 15.2 SMS and one-time code limits

| | |
|---|---|
| What | Codes: 6 digits, valid 10 minutes, 5 wrong attempts invalidate the code. Sends: per destination (phone or email) 3 per hour and 10 per day; per IP 10 per hour; a **global SMS budget of 5,000 per day** (setting `sms_daily_budget`), after which SMS sends answer `sms_budget_exceeded` and the admins are alerted. The same answer is given for known and unknown numbers |
| Where | Service in `accounts` with Redis counters; every send recorded in `otp_send_log` (HMAC of the destination, IP, status, cost) |
| Rule | BR-ACC-02, NFR-11 |
| Test | 4th send to one phone in an hour refused; 11th in a day refused; 11th from one IP in an hour refused; budget reached: `sms_budget_exceeded` and an alert; 6th attempt with the right code fails |

### 15.3 Hashes with a server pepper

| | |
|---|---|
| What | One-time codes, session token lookups and lookup hashes (phone, email, ID number) are stored as **HMAC-SHA256 with a server secret** `HASH_PEPPER` (ID numbers keep `ID_HASH_PEPPER`), never a plain SHA-256 of a short value: a 6-digit code has only a million values, so a plain hash is reversed in milliseconds |
| Rotation | Dual-check window: new values are hashed with the new pepper; checks accept old and new pepper until the longest-lived value has expired; then the old pepper is removed |
| Where | `apps/core/hashing.py`, used by accounts, sessions and `otp_send_log` |
| Rule | BR-SYS-07, NFR-14 |
| Test | The stored hash of a code differs from SHA-256 of the code; a code hashed with the old pepper is accepted during the window and refused after it |

### 15.4 Key management

| | |
|---|---|
| What | Every secret comes from the **environment**, filled at deploy time from the host's secret store (section 7.1); nothing in the repository or images. Hotel system credentials are encrypted with **AES-GCM** (Fernet acceptable) under `INTEGRATION_KEYS`, with a **key id stored on each record** (`credentials_key_id`) and **yearly rotation** (re-encrypt job, then the old key is removed). Payout numbers keep envelope encryption under `FIELD_ENCRYPTION_KEYS` (7.3). Pepper rotation as in 15.3 |
| Where | Django settings read only environment variables; `apps/core/crypto.py` |
| Rule | DEC-025, ADR-014 |
| Test | App refuses to start when a required secret is missing; a record encrypted with key 1 is still readable after key 2 is added; after the re-encrypt job no record uses key 1 |

### 15.5 CSRF

| | |
|---|---|
| What | The Django API accepts **only** `Authorization: Bearer` (or the session token header) and **no cookies**, so classic CSRF does not apply to it. The Next.js BFF keeps the token in an **HttpOnly, Secure, SameSite=Lax** cookie (admin: Strict) and, on every state-changing route handler and server action, checks the **Origin** header **plus a double-submit CSRF token** (a random value in a readable cookie that must match a header or form field) |
| Where | Next.js middleware in both apps; Django refuses cookie-only requests on `/api/v1` |
| Rule | DEC-025, ACC-03 |
| Test | A POST from another origin is refused; a POST without the matching CSRF token is refused; a request to the API with only a cookie gets 401 |

### 15.6 Uploads

| | |
|---|---|
| What | Size and type limits (photos 15 MB, documents 10 MB); content sniffing by magic bytes; EXIF, XMP and IPTC (including GPS) stripped by re-encoding; files land in a **quarantine bucket**; **ClamAV** scans them in the worker; **only clean files are published** (moved to the public or private bucket); infected files deleted and audited |
| Where | Presigned upload, then `media` worker job (section 8) |
| Rule | BR-MED-01, BR-MED-02 |
| Test | EICAR test file rejected; a PNG renamed `.jpg` handled by real type; a photo with GPS comes out without it; a file is not reachable before the scan ends |

### 15.7 Audit log protection

| | |
|---|---|
| What | `audit_event` is insert-only: a PostgreSQL **trigger refuses UPDATE and DELETE** for every role, and the app role has only SELECT and INSERT (the owner is another role, 15.8); hash chain (section 10); **daily export** of the previous day to **write-once object storage** (object lock) in the second data centre |
| Rule | BR-STF-02, DEC-026 |
| Test | UPDATE and DELETE fail as `bladus_app` and as the owner; the daily export exists and cannot be overwritten |

### 15.8 Ledger protection

| | |
|---|---|
| What | Tables are **owned by a separate migration role `bladus_migrator`**; the app connects as **`bladus_app`** with **SELECT and INSERT only** on `ledger_transaction`, `ledger_entry` and `audit_event` (and `booking_event`). This matters because **REVOKE alone does not stop a table owner**. In addition, **triggers refuse UPDATE and DELETE** on these tables for every role. Corrections are new transactions or a `wallet_adjustment` approved by a second admin |
| Reconciliation | Nightly job `reconcile_balances` recomputes every `account_balance` from ledger entries, reports differences to the admins and the audit log, and **exits non-zero** when one differs; `--fix` rewrites a balance only after a human check, and is audited |
| Where | Migrations (roles, grants, triggers); Celery beat job |
| Rule | BR-PAY-02, BR-PAY-15, DEC-026 |
| Test | UPDATE on `ledger_entry` as `bladus_app` and as `bladus_migrator` fails; a hand-edited balance is reported the next night and the job exit code is non-zero |

---

## Check yourself

- [ ] Name the three most sensitive assets and where each is stored.
- [ ] Why does the website cookie use the `__Host-` prefix, and what does `HttpOnly` prevent?
- [ ] A host with payout details changes their phone number. What happens to payout changes for the next 72 hours, and why?
- [ ] Which OWASP API risk covers "guest reads another guest's booking", and what does the API answer?
- [ ] How is an ID card number stored, and why can it still detect a banned person signing up again?
- [ ] What makes a deleted audit row visible?
- [ ] A laptop with a database dump is stolen on day 0. List what must happen before day 5.
- [ ] Why might a foreign SMS provider need ANPDP authorisation?
- [ ] A host enters `https://169.254.169.254/` as the hotel system address. When and where is it refused?
- [ ] Why is REVOKE not enough to protect the ledger, and what is added?
- [ ] Why is a plain SHA-256 of a 6-digit code unsafe?
