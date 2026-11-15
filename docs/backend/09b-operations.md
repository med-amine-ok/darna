# 09b. Operations: how BLADUS is kept running (read before M0)

> **In plain words**
> This one page says how the backend is run day to day, decided before the first line of code (DEC-027).
> Until M2 everything runs on one rented server with Docker Compose; a broken program restarts by itself.
> The database has a live copy elsewhere: we lose at most 5 minutes of data and are back within 1 hour.
> Backups are restored for real once a month, alerts tell us about problems before users do, and every deploy can be undone.
> Secrets never live in the code. The details are in [09-devops-hosting.md](09-devops-hosting.md).
> Hosting in Algeria and the data law points are research: **VERIFY WITH A PROFESSIONAL**.

**Terms used here** (see [glossary.md](glossary.md)): **VPS** (a rented virtual server), **orchestrator** (the tool that starts and restarts programs), **RPO / RTO** (how much data we may lose / how long we may be down), **runbook** (a written step-by-step procedure), **on-call** (the person who answers alerts).

---

## 1. The decisions

| Topic | Decision | Notes |
|---|---|---|
| Orchestrator | **Docker Compose on one VPS for M0 to M2**, started by a systemd unit with `Restart=always`; every container `restart: unless-stopped` | Move to several servers (still Compose) before the closed beta in M7, as in [09-devops-hosting.md](09-devops-hosting.md) section 3. Kubernetes only above about 6 servers |
| Database failover | **Managed PostgreSQL with failover** if the Algerian provider offers it, otherwise a **streaming replica** at a second site. **RPO 5 minutes, RTO 1 hour** | WAL archived every 60 s with pgBackRest; promotion steps in runbook R4 |
| Redis | Persistence **AOF `appendfsync everysec`**. Redis holds only cache, rate-limit counters and the Celery broker | **Never the only copy of data**: bookings, money and outbox messages are in PostgreSQL. Losing Redis loses at most one second of counters |
| Backups | Point-in-time recovery 7 days; nightly encrypted dump kept 35 days and 12 months; storage buckets replicated; all copies in Algeria | **Restore test every month** on a scratch server, timed (must be under 1 hour), with `reconcile_balances` and the audit chain check on the copy |
| Monitoring | Health checks (`/internal/healthz`, `/internal/readyz`), error tracking (Sentry SDK to a self-hosted GlitchTip), outside uptime probe every minute, metrics and dashboards | One alert channel; critical alerts also by SMS through a second provider |
| CI/CD | GitHub Actions: lint, types, tests on real PostgreSQL, **migrations check**, contract check, build images, deploy to staging, manual approval, deploy to production | Every deploy keeps the previous image; **rollback** = redeploy the previous tag (migrations are expand-then-contract, so no down-migration) |
| Secrets | Environment variables filled at deploy time from the host's secret store, never in Git | `HASH_PEPPER` (HMAC of codes, tokens, lookup hashes; rotated with a dual-check window), `INTEGRATION_KEYS` (hotel system credentials, a key id per record, new key yearly), `DJANGO_SECRET_KEY` with fallbacks, database roles `bladus_migrator` and `bladus_app` |
| Rate limiting | Caddy has **no built-in rate limit**: build it with the `caddy-ratelimit` plugin, **or** rely on DRF throttles plus fail2ban on the access logs | The real limits (login, one-time codes, SMS budget of 5,000 per day) are in Django and Redis anyway (BR-ACC-02, BR-ACC-05) |

## 2. Alerts that wake someone up

| Alert | Why it matters |
|---|---|
| Site or API down (3 failed probes) | Users cannot book |
| Error rate above 1% for 5 minutes | Often a bad deploy: roll back |
| Queue depth: `critical` queue above 100, or more than 1,000 pending outbox messages | Codes and booking notices are late |
| Any **dead outbox message** | A notice or a hotel `inventory.push` failed 8 times; see `GET admin/outbox?status=dead` |
| **`reconcile_balances` failed** (non-zero exit) | A wallet balance does not match the ledger: freeze top-ups and adjustments |
| WAL archive older than 10 minutes, nightly dump older than 26 hours | The 5-minute RPO is at risk |
| Replica lag above 60 seconds | Failover would lose data |
| SMS budget at 80% | Possible SMS pumping fraud |

## 3. On-call and runbooks

One named on-call person per week (two people rotate during the beta). They acknowledge within 15 minutes in office hours and 30 minutes at night. Runbooks live in `ops/runbooks/`, one page each:

| Runbook | One line |
|---|---|
| R1 Deploy | Tag, staging green, approve, migrate with `bladus_migrator`, rolling restart, smoke test, watch 15 minutes |
| R2 Rollback | Redeploy the previous image tag; turn off the feature flag if the change was behind one |
| R3 Incident | Detect, declare severity, communicate (status page in en, fr, ar), stabilise, write a short note |
| R4 Database failover | Promote the replica or trigger managed failover, point the apps at it, check `readyz`, reconcile and audit chain |
| R5 Restore | Restore to a chosen minute on a scratch server, check, then switch or copy back the lost rows |
| R6 Dead outbox | Read `last_error`, fix the cause (provider, hotel system), retry from the admin queue |
| R7 Ledger mismatch | Freeze money actions, compare entries and balances, `reconcile_balances --fix` only after a human check |
| R8 Personal data breach | Start the 5-day ANPDP clock in `incident_record` ([08-security-privacy.md](08-security-privacy.md)); VERIFY WITH A PROFESSIONAL |
| R9 Secret rotation | New `HASH_PEPPER` or `INTEGRATION_KEYS` key, dual-check window, re-encrypt, remove the old value |

---

## Check yourself

- [ ] Until which milestone does everything run on one server, and what restarts a stopped program?
- [ ] What are the RPO and RTO, and which two options give them?
- [ ] Why is it safe to lose Redis?
- [ ] Which two alerts are about money or messages that BLADUS cannot afford to lose?
- [ ] Caddy has no built-in rate limit: what are the two options?
