# Review of 2026-11-13: decisions to apply (plan and code)

Source: external review of the backend plan (critical, high and medium items).
These decisions replace anything older in the plan. No em dashes anywhere.

## Critical

### R1. Commission follows the refund (replaces DEC-018 of 2026-11-12; new text keeps the id DEC-018, marked "revised 2026-11-13")
- Commission is taken when a booking is confirmed (unchanged).
- Guest cancels a confirmed booking: the host gets back the same share of the commission as the share of the accommodation subtotal refunded to the guest. Returned = apply_bp(commission_minor, refund_bp of the policy window). Cleaning fee and taxes are outside the commission base, so they do not change it.
  - Villa example (8a): commission 6,660 DZD, refund window 50 %, guest owed 31,750 DZD: host gets 3,330 DZD back, BLADUS keeps 3,330 DZD.
- Host cancels a confirmed booking: guest owed the full total, full commission returned.
- Host declines or the request expires: no commission was ever taken, nothing to return.
- Admin cancels with refund R: refund_of_base = clamp(R - cleaning - taxes, 0, base); returned = round_half_up(commission * refund_of_base / base). R = total gives the full commission back.
- Why: with a full return on every cancellation, a host could keep the guest's money (non-refundable share) and pay no commission.

### R2. Double booking: what the database really guarantees (correct the plan's claim)
- Single-unit listings (home, vehicle): PostgreSQL exclusion constraint on bookings (daterange overlap, blocking statuses) plus the service lock on the listing row.
- Room pools, experience slots, trip departures: counters with CHECK (held + booked <= total, never negative) and one conditional UPDATE. No exclusion constraint.
- Blocked days (listing_day.is_blocked): NEW PostgreSQL triggers: (a) refuse setting is_blocked = true on a day covered by a blocking single-unit booking; (b) refuse inserting or moving a booking into a blocking status when a day in its range is blocked. Same rule in the services (inventory.set_days_blocked refuses `dates_booked`; booking creation refuses `dates_unavailable`), serialized by the lock on the listing row.

### R3. Hotel sync never oversells
- A sync from the hotel system can never set a room-night total below held + booked. The total is clamped to held + booked and an `inventory_conflict` row is opened for the admin (GET admin/inventory-conflicts, POST admin/inventory-conflicts/{id}/resolve).
- Every BLADUS booking change on a room-pool listing of a connected hotel enqueues an outbox message `inventory.push` at once (not only every 15 minutes). The outbox retries with backoff; after the last attempt the message is `dead` and shows in the admin queue (GET admin/outbox?status=dead, POST admin/outbox/{id}/retry).
- The 15-minute pull stays as a reconciliation pass.

## High

### R6. Admin control of money
- The four-eyes threshold (500,000 DZD) applies to the host's rolling 24-hour total of top-ups (pending + approved, including the new one), so splitting does not avoid it.
- The approver must always differ from the requester.
- Manual ledger adjustments (`wallet_adjustment`, signed amount, reason required): always need a second admin, each one is at most 1,000,000 DZD in absolute value, audited. Endpoints: GET/POST admin/wallet-adjustments, POST admin/wallet-adjustments/{id}/approve, POST admin/wallet-adjustments/{id}/reject.

### R7. Deposit race
- Booking creation and acceptance lock the host wallet balance row first (SELECT ... FOR UPDATE on account_balance of host_wallet), then check the floor, then take stock, then post the commission. Lock order everywhere: wallet balance, then listing or stock rows.
- No platform balance row is updated on the booking path. Commission revenue is computed from ledger entries (SUM), never from a shared row.

### R8. Host refunds are tracked as a debt
- Any cancellation with refund_due > 0 opens a `refund_obligation` (booking, host account, guest, amount, due_at = cancelled_at + refund_due_days, default 7 days; status open, declared, settled, disputed).
- Ledger memo: transaction `refund_due` (Dr host_refund_payable:<host>, Cr guest_refund_clearing) and `refund_settled` (the reverse) when settled.
- Host declares paid with a reference (POST host/refunds/{id}/declare-paid). Guest confirms (POST me/refunds/{id}/confirm-received) or disputes (POST me/refunds/{id}/dispute, back to open). Admin can settle with proof (POST admin/refunds/{id}/settle). Lists: GET host/refunds, GET me/refunds, GET admin/refunds?overdue=true.
- Overdue = status open or disputed and due_at passed. While a host has an overdue refund: no instant booking (requests only) and the host cannot accept requests (`refund_overdue`).

### R9. Security controls (define each in the plan; code where noted)
- SSRF: any URL a host gives (hotel system base_url, iCal link) must be https, resolve only to public IPs (no loopback, private, link-local, CGNAT, multicast, reserved, metadata 169.254.169.254), checked at save time and again at fetch time, no redirects to other hosts, 10 s timeout, 5 MB cap. Code: apps/core/netguard.py.
- SMS and OTP limits (code): per destination 3 per hour and 10 per day; per IP 10 per hour; global SMS budget 5,000 per day (setting), then `sms_budget_exceeded`; 6-digit code, 10 minutes, 5 attempts.
- Hashes: one-time codes, session tokens and lookup hashes use HMAC-SHA256 with a server secret `HASH_PEPPER` (env), never plain SHA-256 of a short value.
- Key management: every secret from the environment, filled from the host's secret store; integration credentials encrypted with AES-GCM (Fernet acceptable) under `INTEGRATION_KEYS` with a key id per record and yearly rotation; pepper rotation by dual-check window.
- CSRF: the API accepts only `Authorization: Bearer`, no cookies, so classic CSRF does not apply to it. The Next.js BFF keeps the token in an HttpOnly, Secure, SameSite=Lax cookie and checks Origin plus a double-submit CSRF token on every state-changing route.
- Uploads: size and type limits, content sniffing, EXIF stripped, files land in a quarantine bucket, ClamAV scan in the worker, only clean files are published.
- Audit log protection: insert-only enforced by a PostgreSQL trigger and by roles (below); daily export to write-once object storage.

### R11. Ledger protection
- Tables are owned by a separate migration role `bladus_migrator`; the app connects as `bladus_app` with SELECT and INSERT only on ledger_transaction, ledger_entry, audit_event (REVOKE alone does not stop the owner).
- PostgreSQL triggers refuse UPDATE and DELETE on ledger_transaction, ledger_entry and audit_event.
- Nightly `reconcile_balances` job recomputes every account_balance from ledger entries, reports differences to the admins (and the audit log) and exits non-zero; `--fix` rewrites the balance after a human check.

### R12. Operations page before M0
- New doc page: orchestrator (Docker Compose on one VPS for M0 to M2, systemd restart policy), failover (managed PostgreSQL or streaming replica, RPO 5 minutes, RTO 1 hour), Redis persistence (AOF everysec; Redis only for cache, throttles and Celery broker, never the only copy of data), backups and restore targets with a monthly restore test, monitoring and alerts (health checks, Sentry, uptime, queue depth, dead outbox, reconcile failures), CI/CD (tests, migrations check, build, deploy with rollback), secrets, rate limiting (Caddy has no built-in rate limit: use the caddy-ratelimit plugin or rely on DRF throttles plus fail2ban), on-call and runbooks.

### R13. Booking abuse
- Limits per guest: at most 3 pending requests and 6 upcoming bookings (pending + confirmed with check-out in the future) at a time (settings `max_pending_requests_per_guest`, `max_upcoming_bookings_per_guest`); error `too_many_open_bookings`.
- Stay confirmation before a review: a confirmed booking has a 6-digit check-in code shown to the guest; the host enters it on arrival (POST host/bookings/{id}/confirm-stay), or the guest confirms after check-in time (POST me/bookings/{id}/confirm-stay). Review allowed only when the booking is completed and the stay is confirmed. Auto-complete still completes, but without confirmation no review. A completed booking also cost the host its commission, which makes fake reviews expensive.

## Medium

### R14. Money rules
- Rounding: integer centimes, basis points, round half up at each computed line (apply_bp); totals are sums of rounded lines.
- Commission base: accommodation (or seats) subtotal after discounts; excludes cleaning fee and taxes.
- Idempotency storage: table idempotency_record (user, endpoint, key unique, SHA-256 of the body, stored status and body, 24 hours); same key with a different body = 422 `idempotency_key_reused`.
- Outbox: table outbox_message (topic, payload, status pending/sent/dead, attempts, next_attempt_at, last_error); written in the same transaction as the change; worker retries at 1 min, 5 min, 15 min, 1 h, 6 h, 24 h, then dead (8 attempts max) with an admin alert; handlers must be idempotent.

### R15. Search and framework
- PostgreSQL full-text has no Arabic stemmer: search uses pg_trgm trigram similarity (GIN trigram indexes on title and commune names) plus unaccent for French; test with a list of real Arabic, French and Darija queries.
- Framework: Django 5.2 LTS (supported to April 2028), not 6.1. The code already runs on 5.2.

### R16. Contradictions
- No online top-up endpoint while online payment is off (DEC-019): remove it from the spec or mark it not in v1.
- One operation count, computed from openapi.yaml.
- The four flow paths that differ from the endpoint list are fixed.
- One id scheme: UUIDv7 primary keys everywhere; human references only for display (BLD-YYYY-XXXXXX bookings, LST-... listings, TRP-... trips).
- Diagrams: sequence diagram endpoint labels are generated from (or checked against) openapi.yaml by a tool, so they cannot drift.
