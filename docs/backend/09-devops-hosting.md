# 09. DevOps and hosting: where BLADUS runs and how we operate it

> **In plain words**
> BLADUS runs in three places: your laptop (dev), a test copy with fake data (staging), and the real site (production).
> Production and every copy of personal data live in Algerian data centres (ICOSNET or Djezzy Cloud), with backups in a second Algerian site. This follows our reading of Law 18-05 art. 8 and Law 18-07/25-11: **VERIFY WITH A PROFESSIONAL**.
> We start simple: a few servers running Docker Compose. Every code change is checked automatically on GitHub (tests, types, API contract) before it can be deployed.
> We can lose at most 15 minutes of data (RPO) and be back within 4 hours (RTO); a restore is practised every month.
> This page also gives a rough monthly cost, step-by-step runbooks (deploy, rollback, incident, restore), and the list of settings each program needs.

**Terms used here** (see also [glossary.md](glossary.md)):
- **Environment**: one complete copy of the system (dev, staging, production) with its own data and secrets.
- **Container / image**: an image is a packaged program with everything it needs; a container is a running copy of it. **Docker Compose** starts several containers from one file.
- **Reverse proxy**: the front door server (Caddy) that receives HTTPS traffic and passes it to the right program.
- **TLS certificate**: the file that makes `https://` work and proves the site's identity.
- **CDN**: content delivery network, servers in many places that keep copies of static files close to users.
- **CI/CD**: continuous integration (check every change automatically) and continuous delivery (deploy automatically after checks).
- **GitHub Actions**: GitHub's service that runs these checks and deployments.
- **Migration**: a versioned script that changes the database structure.
- **WAL / PITR**: PostgreSQL writes every change first into a log (write-ahead log). Keeping that log lets us restore the database to any minute in the past: point-in-time recovery.
- **Replica**: a second database server that continuously copies the main one.
- **RPO / RTO**: recovery point objective (how much recent data we accept to lose) / recovery time objective (how long we accept to be down).
- **Observability**: logs (what happened), metrics (numbers over time), traces and error reports, so we see problems before users report them.
- **Health check**: a small URL that says "I am alive" (liveness) or "I can serve requests" (readiness).
- **Runbook**: a written step-by-step procedure for an operation or an emergency.
- **Environment variable (env var)**: a named setting given to a program when it starts (for example `DATABASE_URL`).

Inputs: [02-research.md](02-research.md) sections B.16, C.3, C.6; [03-requirements.md](03-requirements.md) NFR-01 to NFR-13; [05-database-schema.md](05-database-schema.md) section 7; [07-architecture.md](07-architecture.md); [08-security-privacy.md](08-security-privacy.md); diagram [02-containers](diagrams/rendered/02-containers.svg).

---

## 1. Environments

| Environment | Purpose | Where | Data | Deploys | Access |
|---|---|---|---|---|---|
| **dev** | Developer laptops | Local Docker Compose | Factories and demo seed only | Manual | Developer |
| **ci** | Automatic checks on every pull request | GitHub Actions runners (temporary) | Synthetic test data created by tests | Every push | Automatic |
| **staging** | Final check before production; demos; shadow-read migration of the apps ([07-architecture.md](07-architecture.md) section 10.4) | One server in Algeria (same provider as production, for parity) | Synthetic data from the demo seed; **never a copy of production** | Automatic on merge to `main` | Team, testers, product owner |
| **production** | Real users | Algerian data centre A (primary) + data centre B (backups, replica) | Real personal data | On a release tag, after manual approval | Two named operators; staff use the admin app only |

Rules: staging has its own secrets, own SMS sandbox (or a capped real account), and its email sends only to an allowlist of team addresses. Production data is never copied to dev, ci or staging (OWASP API9). For a bug that needs production data, a person with production access investigates inside production.

## 2. Hosting plan (Algeria first)

All legal points: **VERIFY WITH A PROFESSIONAL** (L1, L2, L10 in [13-decisions-needed.md](13-decisions-needed.md)).

| Site | Provider (candidates) | What runs there | Why |
|---|---|---|---|
| **Data centre A** (primary) | ICOSNET Algiers (recommended in research C.6), or Djezzy Cloud | Everything in production: proxy, Next.js apps, Django API, workers, PostgreSQL primary, Redis, object storage, ClamAV, monitoring | Law 18-05 art. 8 points to hosting in Algeria; Law 18-07/25-11 restricts personal data transfers abroad |
| **Data centre B** (second site) | ICOSNET Oran if A is ICOSNET Algiers; or Djezzy Cloud Béjaïa; ideally a different provider from A | PostgreSQL streaming replica (warm standby), pgBackRest repository (PITR archive), nightly encrypted dumps, object storage replica of private and public buckets, audit anchors | Survive the loss of site A; backups must also stay in Algeria (BR-PRV-04) |
| **Staging** | Same provider as A, separate account or project | All-in-one server | Parity of network, OS and latency |
| **Outside Algeria** (optional, flagged) | Cloudflare or a European CDN; Hetzner for build caches | Only non-personal assets: Next.js static JS/CSS, fonts, maybe public photo renditions without people. **No API, no HTML pages with personal data, no backups** | Faster static files; only after the lawyer answers L1 and L2. **VERIFY** |
| GitHub | GitHub (USA) | Source code, CI on synthetic data, container images (no data, no secrets) | Standard tooling; no personal data involved |

Questions to ask the Algerian providers before signing (record answers in the ops repository): available VPS sizes and prices; dedicated servers; private network between servers; disk encryption; snapshots; S3-compatible object storage offer (if none, we run MinIO or Garage ourselves); bandwidth limits and international transit quality; IPv6; DDoS protection; SLA; support hours; site B availability with the same provider; data processing contract with data protection clauses.

## 3. Container layout (Docker Compose to start)

One Docker image for the backend (`bladus-api`) used by the API, workers and beat with different commands; one image per Next.js app. Kubernetes is **not** needed at launch; revisit when we run more than about 6 servers or need automatic scaling.

| Container | Image / program | Command or role | Server (launch) | Replicas |
|---|---|---|---|---|
| `caddy` | Caddy 2 | TLS, HTTP/2 and HTTP/3, reverse proxy, coarse rate limits, security headers, access logs | app | 1 |
| `website` | Next.js (frontend) | `next start`; BFF for guests and hosts | app | 2 (rolling deploys) |
| `admin` | Next.js (admin) | `next start`; staff BFF; reachable only from allowlisted IPs or VPN | app | 1 |
| `api` | `bladus-api` | `gunicorn config.wsgi` with sync workers (2 x CPU + 1), 30 s timeout | app | 2 |
| `worker-critical` | `bladus-api` | `celery worker -Q critical,default` (OTP, booking notifications, outbox) | worker | 1 (concurrency 8) |
| `worker-media` | `bladus-api` | `celery worker -Q media` (images, documents), memory limit 2 GB | worker | 1 (concurrency 2) |
| `worker-reports` | `bladus-api` | `celery worker -Q reports` (exports, invoices) | worker | 1 (concurrency 1) |
| `beat` | `bladus-api` | `celery beat`; **exactly one** in the whole system | worker | 1 |
| `clamav` | ClamAV daemon | `clamd` + `freshclam` hourly | worker | 1 |
| `postgres` | PostgreSQL 17 + PostGIS 3.5 | Primary database, `pg_stat_statements` on | db | 1 |
| `pgbouncer` | PgBouncer | Connection pooling, transaction mode | db | 1 |
| `pgbackrest` | pgBackRest | WAL archiving and backups to site B | db | 1 |
| `postgres-replica` | PostgreSQL 17 + PostGIS | Streaming replica, read-only reports | site B | 1 |
| `redis` | Redis 7 | db 0 broker, db 1 cache, db 2 limits and OTP; AOF on; password; TLS | app (move to its own server when needed) | 1 |
| `minio` (or `garage`) | S3-compatible storage | Buckets `public`, `private`, `quarantine`, `exports`; only if the provider has no S3 offer in Algeria | storage | 1 (+ replica at site B) |
| `prometheus`, `alertmanager`, `grafana` | Monitoring | Metrics, alerts, dashboards | monitoring | 1 each |
| `node-exporter`, `postgres-exporter`, `redis-exporter`, `celery-exporter`, `caddy` metrics | Exporters | Expose metrics | every server | 1 each |
| `glitchtip` (+ its own Postgres and Redis) | Sentry-compatible error tracking, self-hosted | Errors from Django, Celery, both Next.js apps | monitoring | 1 |
| `loki` + `promtail` (or `vector`) | Log storage and shipping | JSON logs searchable 90 days | monitoring | 1 |

Servers at launch (production): **app**, **worker**, **db**, **storage**, **monitoring** at site A; **backup/replica** at site B. Staging runs all containers on one server with smaller limits. The dev `compose.yaml` runs `postgres`, `redis`, `minio`, `clamav`, `api`, one worker, `beat` and Mailpit (fake email inbox).

## 4. Domains and DNS

| Name (proposal) | Points to | Purpose |
|---|---|---|
| `bladus.com.dz` and `www.bladus.com.dz` | Caddy at site A | Website (guests and hosts) |
| `admin.bladus.com.dz` | Caddy at site A, IP allowlist | Admin app |
| `hooks.bladus.com.dz` | Caddy, routes only `/api/v1/webhooks/*` to Django | Payment gateway webhooks (R2) |
| `media.bladus.com.dz` | Storage (public bucket) through Caddy or CDN | Public photo renditions |
| `static.bladus.com.dz` | Caddy or CDN | Next.js static files (optional; Next.js can serve them itself) |
| `console.bladus.com.dz` | Caddy, VPN only | Django admin console (staff, MFA, read-mostly) |
| `status.bladus.com.dz` | Outside the main infrastructure | Public status page |

- `.com.dz` registration goes through the Algerian registry (NIC.dz, run by CERIST) and normally requires a registered company (RC). Law 18-05 art. 8 mentions `.com.dz` for e-commerce. **VERIFY WITH A PROFESSIONAL** (L1, L11 in [13-decisions-needed.md](13-decisions-needed.md)). Also register `bladus.dz` if available and `bladus.com` to protect the brand; redirect them to the main name.
- The Django API has **no public host name**: only the Next.js servers reach it on the private network (BFF, [07-architecture.md](07-architecture.md) section 10).
- Email: send from `notify.bladus.com.dz` with SPF, DKIM and DMARC (`p=quarantine`, then `reject`).
- DNS with two providers or a provider with anycast; low TTL (300 s) on records we may switch during an incident.

## 5. TLS

- Caddy obtains and renews certificates automatically with ACME (Let's Encrypt; ZeroSSL as fallback). If the `.com.dz` registry or provider requires another certificate authority, use that one (VERIFY).
- TLS 1.2 and 1.3 only; HSTS on after two weeks of stable HTTPS, then `includeSubDomains` and `preload`.
- Internal traffic: TLS from Caddy to Next.js is optional on the same server; **required** between servers (Django to PostgreSQL with `verify-full`, Redis TLS, storage HTTPS) using a small internal certificate authority (step-ca) or provider private network plus TLS.

## 6. CDN

- **Launch without a foreign CDN.** Next.js serves its static files with long cache headers (`immutable`), Caddy compresses (zstd, gzip), public photos are served from the storage server through Caddy with `Cache-Control: public, max-age=31536000, immutable` (keys are random and never reused).
- If measurements show slow images or static files for users far from site A, options in order: (1) a second Caddy cache in another Algerian city; (2) Cloudflare or another CDN **only** for `static.` and `media.`, after the lawyer confirms public photos and static files are not personal data subject to residency (VERIFY). Never route the website HTML, the admin or the API through a foreign CDN, because the CDN would decrypt personal data.

## 7. CI/CD on GitHub Actions

### 7.1 Pipelines

| Workflow | Trigger | Jobs (in order) | Blocks merge or deploy? |
|---|---|---|---|
| `backend-ci.yml` | Every pull request and push | 1. **Lint**: `ruff check`, `ruff format --check`. 2. **Types**: `mypy` with django-stubs and djangorestframework-stubs. 3. **Architecture**: `lint-imports` (import-linter layer contracts). 4. **Migrations**: `makemigrations --check --dry-run`, migration linter, migrate from zero. 5. **Tests**: `pytest` with a **PostGIS service container** (`postgis/postgis:17-3.5`) and Redis service; coverage gates ([10-testing-quality.md](10-testing-quality.md) section 11). 6. **Traceability**: every BR rule has a test. 7. **Security**: `pip-audit`, `bandit`, `gitleaks` | Yes |
| `contract.yml` | Every pull request | 1. Generate `openapi.yaml` with `spectacular --validate --fail-on-warn`. 2. **OpenAPI diff** against `main` with `oasdiff breaking`; a breaking change fails unless the PR has the `api-breaking` label and a `/v2` plan. 3. Start the API with seed data and run **schemathesis** (all endpoints, stateful links). 4. Generate TypeScript types and run `tsc --noEmit` in `frontend/` and `admin/` against them | Yes |
| `frontend-ci.yml` / `admin-ci.yml` | Changes under `frontend/` or `admin/` | `npm ci`, `next lint`, `tsc --noEmit`, unit tests, Playwright smoke tests (admin already has Playwright), `npm audit --omit=dev` | Yes |
| `build.yml` | Merge to `main`, tags | Build images (`bladus-api`, `bladus-website`, `bladus-admin`) with build args; **refuse the website production build unless `NEXT_PUBLIC_BLADUS_TEST_MODE=0`**; Trivy image scan (fail on critical); SBOM; push to GitHub Container Registry with the commit SHA tag | Yes for deploy |
| `deploy-staging.yml` | After `build.yml` on `main` | Deploy to staging (runbook 11.1), run smoke tests, run k6 smoke (1 minute) | Yes for production |
| `deploy-prod.yml` | Release tag `vYYYY.MM.DD.N` | Manual approval by one of two named approvers (GitHub environment protection), then runbook 11.1 on production, smoke tests, automatic rollback on failure | |
| `nightly.yml` | Every night | Concurrency test suite with repeats, full schemathesis run, dependency scan, k6 performance run against staging (weekly) | Opens an issue on failure |

### 7.2 How deployment reaches Algeria

The deploy job runs on a **self-hosted GitHub Actions runner** inside the private network at site A (one for staging, one for production, separate machines). It only pulls signed images and runs Compose commands; it holds no database passwords (those are on the servers, decrypted from the secret store at deploy time). Alternative: a bastion host with SSH deploy keys restricted to one command.

## 8. Database operations

### 8.1 Migrations policy

1. **Expand, then contract.** A release may only add things (columns nullable or with a constant default, new tables, new indexes). Removing or renaming happens in a later release, after no running code uses the old name. This keeps the previous app version working, so rollback never needs a down-migration.
2. Large indexes use `AddIndexConcurrently` in a non-atomic migration; constraints on large tables are added `NOT VALID` then validated separately.
3. Every migration sets `lock_timeout = 5s`; if it cannot get the lock it fails instead of freezing the site.
4. Data migrations are separate from schema migrations and must be safe to run twice; big backfills run as Celery jobs in batches, not inside migrations.
5. Migrations run as a **one-off container** (`manage.py migrate`) before the new app containers start, using the `bladus_migrate` role. The app role cannot change the schema.
6. A pgBackRest incremental backup is taken right before any release that contains a migration flagged `risky` in review.
7. Squash migrations only once a year, never across a release still deployed somewhere.

### 8.2 Backups, PITR and replica

| Mechanism | Tool | Frequency | Kept | Target (NFR-04) |
|---|---|---|---|---|
| WAL archive | pgBackRest, `archive_timeout = 60 s`, repository at site B, encrypted (`repo-cipher-type = aes-256-cbc`) | continuous | 7 days of PITR | RPO 15 min (expected: about 1 min) |
| Full + differential backups | pgBackRest | full weekly (Sunday 02:00), differential daily | 2 full cycles | base for PITR |
| Streaming replica | PostgreSQL physical replication to site B | continuous | live | fast failover, RTO 4 h |
| Logical dump | `pg_dump -Fc`, encrypted with **age** before leaving the server | nightly 01:00 | 35 daily, 12 monthly | protection against logical mistakes and tool bugs |
| Object storage | MinIO bucket replication (or provider replication) to site B; versioning on private buckets | continuous | 30 days of versions | documents and photos |
| Secrets and keys | Offline copies of the backup decryption key and field encryption master key, held by two people | on change | always | without them backups are useless |

All backup copies stay in Algeria (BR-PRV-04). Backup jobs report a "last success" metric; an alert fires if older than 26 hours (dumps) or 10 minutes (WAL archive).

### 8.3 Monthly restore drill

On the first Tuesday of each month: restore the latest full backup plus WAL to a scratch server at site B to a chosen time 1 hour earlier; run `manage.py check`, row counts, `ledger.reconcile_balances` and `audit.verify_hash_chain` on the copy; open 3 random private documents from the storage replica; record the time taken (must be under 4 hours) and the result in the drill log; destroy the scratch server. A failed drill is a high-priority incident.

### 8.4 Routine care

`pg_stat_statements` reviewed weekly (top 20 queries by total time, compared with the query plan targets in [05-database-schema.md](05-database-schema.md) section 7); autovacuum tuned for hot tables (`room_type_night`, `outbox_event`, `notification`); minor PostgreSQL updates monthly, major upgrades yearly with a rehearsal in staging; disk alerts at 70% and 85%.

## 9. Observability

### 9.1 Logs

- **structlog** writes one JSON object per line to stdout; Promtail or Vector ships them to Loki (in Algeria), searchable 90 days, archived 1 year.
- Fields on every API log line: `ts`, `level`, `event`, `request_id`, `user_id`, `host_account_id`, `staff` (boolean), `method`, `route` (pattern, not raw path), `status`, `duration_ms`, `db_queries`, `db_ms`, `ip_prefix` (IPv4 /24 for analytics; full IP only in the audit log), `app_version`. Celery lines add `task`, `task_id`, `queue`, `attempt`.
- **Never logged**: passwords, OTP codes, session tokens, `Authorization` or `X-Session-Token` headers, ID numbers, payout numbers, message bodies, full phone numbers or emails (masked as `+213 5** ** ** 12`). A scrubbing processor enforces this and has its own tests.

### 9.2 Errors

GlitchTip (Sentry-compatible, self-hosted in Algeria) with the Sentry SDKs in Django, Celery and both Next.js apps; `send_default_pii = False`; request bodies and headers scrubbed; release and environment tags; source maps uploaded for the Next.js apps but not served publicly.

### 9.3 Metrics

Prometheus scrapes every 15 s. Key metrics:

| Metric | Source | Why |
|---|---|---|
| `http_request_duration_seconds{route,method,status}` (histogram) | django-prometheus | NFR-01, NFR-02 latency |
| `bladus_booking_create_total{result}` (`confirmed`, `pending`, `conflict`, `price_changed`, `error`) | app | Booking health, double-booking attempts |
| `bladus_outbox_pending`, `bladus_outbox_oldest_age_seconds`, `bladus_outbox_failed` | app (scraped from DB by a collector) | Notifications delayed |
| `celery_queue_length{queue}`, `celery_task_failed_total{task}` | celery-exporter | Background work |
| `bladus_beat_heartbeat_timestamp` | `core.heartbeat` task every minute | Beat is alive |
| `bladus_otp_sent_total{channel,provider}`, `bladus_sms_spend_dzd_today` | app | SMS pumping, budget |
| `bladus_login_failures_total`, `bladus_lockouts_total` | app | Attacks |
| `bladus_ledger_reconcile_mismatch` | `ledger.reconcile_balances` | Money correctness |
| `bladus_audit_chain_ok` | `audit.verify_hash_chain` | Tamper evidence |
| `bladus_backup_last_success_timestamp{kind}` | backup scripts | NFR-04 |
| `pg_replication_lag_seconds`, `pg_stat_activity_count`, `pg_database_size_bytes` | postgres-exporter | Database health |
| `redis_memory_used_bytes`, evictions | redis-exporter | Cache and limits |
| Node CPU, memory, disk, network | node-exporter | Capacity |

### 9.4 Health checks

| Endpoint | Checks | Used by |
|---|---|---|
| `/internal/healthz` (Django) | Process answers | Container restart policy |
| `/internal/readyz` (Django) | `SELECT 1` on PostgreSQL through PgBouncer, Redis `PING`, storage bucket reachable, no unapplied migrations | Caddy upstream health, deploy smoke test |
| `/api/health` (each Next.js app) | Process answers and can reach Django `readyz` | Caddy, deploy |
| Celery | `celery inspect ping` + beat heartbeat age | Monitoring |
| External | Uptime probe from outside the provider (website home, login page, one search) every minute | Status page, alerts |

### 9.5 Alerts

| Alert | Condition | Severity | First action |
|---|---|---|---|
| Site down | External probe fails 3 times in a row | critical | Incident runbook 11.3 |
| API slow | p95 read latency > 300 ms or booking create > 600 ms for 10 min (NFR-01) | high | Check DB, recent deploy |
| Search slow | p95 search > 500 ms for 10 min (NFR-02) | high | `pg_stat_statements`, indexes |
| Error rate | 5xx > 1% of requests for 5 min | critical | GlitchTip, rollback if after a deploy |
| Outbox stuck | Oldest pending event > 5 min, or any `failed` | high | Worker logs, provider status |
| Beat stopped | Heartbeat older than 3 min | critical | Restart beat (only one!) |
| Queue backlog | `critical` queue > 100 for 5 min | high | Scale worker, check provider |
| SMS spend | 80% of daily budget | high | Check for pumping; at 100% non-critical SMS stop automatically |
| Login attack | Lockouts > 50 in 10 min | high | Block IP ranges at Caddy |
| Ledger mismatch | `bladus_ledger_reconcile_mismatch > 0` | critical | Freeze top-ups; finance and tech lead investigate |
| Audit chain broken | `bladus_audit_chain_ok == 0` | critical | Security incident; preserve evidence |
| Backup late | WAL archive > 10 min or nightly dump > 26 h | critical | Fix before anything else (RPO at risk) |
| Replica lag | > 60 s for 10 min | high | Network to site B, disk |
| Disk | > 85% on any server | high | Expand or clean |
| Certificate | Expires in < 14 days | high | Check Caddy renewal |
| Restore drill | Not recorded this month by day 10 | medium | Schedule it |

Alerts go to a team chat channel and, for critical ones, by SMS to the on-call person (through a different provider than the user SMS, so a provider outage does not hide its own alert).

## 10. Capacity and cost (rough, VERIFY WITH QUOTES)

**Capacity basis**: NFR-01 (50 requests per second on one app node, p95 300 ms reads), NFR-02 (search p95 500 ms with 20,000 listings), and the two-year growth estimate in [05-database-schema.md](05-database-schema.md) section 7 (fits one PostgreSQL primary with 8 vCPU / 32 GB). Expected launch traffic is far below these numbers; the sizes below leave headroom and can start smaller.

**Prices are rough planning numbers, not quotes.** Only "ICOSNET from 2,800 DZD/month per VPS" comes from research (C.6, [secondary]); other lines are estimates by analogy. Exchange rate assumed **1 EUR = 150 DZD** (official rate order of magnitude; VERIFY at the time of purchase).

| Item | Size (launch) | DZD per month | EUR per month |
|---|---|---|---|
| App server (Caddy, 2 x website, admin, 2 x API, Redis) | 8 vCPU, 16 GB RAM, 160 GB SSD | 25,000 to 45,000 | 165 to 300 |
| Worker server (Celery queues, beat, ClamAV) | 4 vCPU, 8 GB, 80 GB | 12,000 to 25,000 | 80 to 165 |
| Database server (PostgreSQL primary, PgBouncer, pgBackRest) | 8 vCPU, 32 GB, 500 GB SSD | 40,000 to 80,000 | 265 to 535 |
| Storage server (MinIO, if no provider S3) | 2 vCPU, 4 GB, 2 TB disk | 15,000 to 35,000 | 100 to 235 |
| Monitoring server (Prometheus, Grafana, Loki, GlitchTip) | 4 vCPU, 8 GB, 200 GB | 10,000 to 20,000 | 65 to 135 |
| Site B: replica + backup repository + storage replica | 8 vCPU, 32 GB, 3 TB | 35,000 to 70,000 | 235 to 465 |
| Staging (all-in-one) | 8 vCPU, 16 GB, 200 GB | 15,000 to 30,000 | 100 to 200 |
| SMS (assume 10,000 per month; local aggregator 3 to 8 DZD each, prices not published, VERIFY; Twilio about USD 0.27) | | 30,000 to 80,000 | 200 to 535 |
| Email (transactional, provider in Algeria or self-hosted relay, VERIFY) | | 0 to 5,000 | 0 to 35 |
| Domains (`.com.dz`, `.dz`, `.com`), yearly cost spread | | 500 to 1,500 | 3 to 10 |
| GitHub (Team plan, about 5 users) | | 2,500 to 4,000 | 17 to 27 |
| TLS certificates (ACME) | | 0 | 0 |
| **Total per month** | | **about 185,000 to 395,000** | **about 1,230 to 2,640** |
| One-off: external penetration test before launch | | 600,000 to 1,500,000 | 4,000 to 10,000 |
| One-off: legal review (privacy, e-commerce, hosting) | | quote needed | quote needed |

Ways to start cheaper: merge worker and monitoring onto the app server for the first months (saves about 25,000 DZD); use email or WhatsApp codes before SMS where users accept it (SMS is the largest variable cost); keep staging off outside working hours.

When to grow: second API server when CPU > 60% at peak for a week; Redis on its own server when memory > 2 GB; read replica for search when DB CPU > 60% at peak; external search only per [07-architecture.md](07-architecture.md) section 7.

## 11. Runbooks

### 11.1 Deploy

1. Check: CI green on the commit; release notes list migrations and flags; no open critical alert; not Thursday evening or Friday (Algerian weekend starts Friday; avoid deploying before it).
2. Announce in the team channel with the release tag.
3. Runner pulls images for the tag and verifies their digests.
4. If the release has a `risky` migration: trigger a pgBackRest incremental backup and wait for success.
5. Run the migration container (`manage.py migrate --noinput`) with the `bladus_migrate` role. On failure: stop here (nothing else changed); open an incident if the site is affected.
6. Rolling update of `api`: start the new container, wait for `/internal/readyz`, remove one old container from Caddy, stop it gracefully (30 s), repeat.
7. Restart workers with warm shutdown (`SIGTERM`, tasks finish), then start new ones. Restart `beat` last, making sure only one runs.
8. Rolling update of `website` and `admin` the same way.
9. Smoke tests: home page in 3 languages, search with dates, listing detail, login, host dashboard (staging account), admin login with MFA (staging only), `/internal/readyz`.
10. Watch dashboards 15 minutes (error rate, latency, outbox). Announce success.

### 11.2 Rollback

1. Decide fast: a new error rate above 1% or a broken key flow after a deploy means rollback first, analysis later.
2. Redeploy the previous image tag with steps 6 to 9 of 11.1. **Do not** run down-migrations: the expand-then-contract rule keeps the previous code compatible with the new schema.
3. If the bad release changed data (wrong postings, wrong statuses), stop the affected jobs (feature flag or scale the worker to 0), then write correcting transactions through services (ledger: reversing transactions). Never edit rows by hand.
4. If a migration itself destroyed data (should be impossible under the policy): restore to a scratch server with PITR to the minute before the migration and copy back the affected rows with a reviewed script (runbook 11.4).
5. Write a short incident note.

### 11.3 Incident

1. **Detect**: alert or user report. The on-call person acknowledges within 15 minutes (business hours) or 30 minutes (night).
2. **Declare**: open an entry in the incident register with severity (SEV1 site down or data at risk; SEV2 key feature broken; SEV3 degraded). Name one incident lead.
3. **Communicate**: status page updated within 30 minutes for SEV1/SEV2 in en, fr, ar; staff informed in the admin app banner.
4. **Stabilise**: rollback (11.2), switch off a feature flag, block abusive traffic at Caddy, scale workers, or fail over (step 5).
5. **Failover to site B** (site A lost or database primary lost for more than 30 minutes): promote the replica at site B; switch DNS (TTL 300 s) to site B's proxy; start app, worker and beat containers there from the same images; verify `readyz`, the ledger reconcile and the audit chain; keep site A isolated until repaired, then rebuild it as the new replica. Target total time under 4 hours (RTO).
6. **Personal data involved?** Start the breach runbook in [08-security-privacy.md](08-security-privacy.md) section 12.7 at once: the 5-day ANPDP clock starts at discovery.
7. **Close**: when stable for 1 hour. Within 5 working days: blameless review (timeline, cause, what worked, actions with owners and dates).

### 11.4 Restore (data loss or corruption)

1. Freeze writes if corruption is spreading: put the platform in maintenance mode (`maintenance_mode` setting; the website shows a notice; staff read-only).
2. Identify the target time (just before the bad event) from logs, `booking_event`, `audit_event`.
3. Restore with pgBackRest to a **scratch** server at site B to that time (`--type=time --target=...`). Never restore over the live primary first.
4. Verify on the scratch copy: row counts, ledger reconcile, audit chain up to the target time, sample bookings.
5. Choose: (a) **partial repair**: export the affected rows from the scratch copy and re-apply them through a reviewed script or services (preferred, keeps later good data); (b) **full restore**: replace the primary with the restored copy (loses everything after the target time; users must be told; bookings after that time must be rebuilt from emails and logs).
6. For object storage: restore object versions from the site B replica.
7. Lift maintenance mode, monitor, record the restore in the drill/incident log. If personal data was lost or exposed, apply the breach runbook.

## 12. Environment variables (names and purpose only)

No values here. Real values live in the secret store ([08-security-privacy.md](08-security-privacy.md) section 7). Typed and validated at start by pydantic-settings (`config/env.py`); a missing required value stops the program.

### 12.1 Django API, workers and beat

| Variable | Purpose |
|---|---|
| `BLADUS_ENV` | `dev`, `ci`, `staging` or `production`; selects defaults and safety checks |
| `DJANGO_SETTINGS_MODULE` | Settings module for the environment |
| `DJANGO_SECRET_KEY` / `DJANGO_SECRET_KEY_FALLBACKS` | Django signing key, and old keys accepted during rotation |
| `DJANGO_ALLOWED_HOSTS` | Host names Django answers to (private names only) |
| `TRUSTED_PROXY_IPS` | Addresses allowed to set `X-Forwarded-For` (Caddy, BFFs) |
| `BFF_SERVICE_KEY_WEBSITE` / `BFF_SERVICE_KEY_ADMIN` | Service keys checked on requests from each Next.js server |
| `DATABASE_URL` | PostgreSQL connection through PgBouncer, app role |
| `DATABASE_MIGRATE_URL` | Connection with the migration role (migration container only) |
| `DATABASE_REPLICA_URL` | Read-only replica for reports and exports |
| `DB_STATEMENT_TIMEOUT_MS` / `DB_LOCK_TIMEOUT_MS` | Database time limits ([07-architecture.md](07-architecture.md) section 3) |
| `REDIS_URL` | Redis for cache (db 1) |
| `CELERY_BROKER_URL` | Redis for Celery (db 0) |
| `RATELIMIT_REDIS_URL` | Redis for rate limits, OTP counters, locks (db 2) |
| `S3_ENDPOINT_URL` | Object storage address (in Algeria) |
| `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | Object storage credentials |
| `S3_BUCKET_PUBLIC` / `S3_BUCKET_PRIVATE` / `S3_BUCKET_QUARANTINE` / `S3_BUCKET_EXPORTS` | Bucket names |
| `MEDIA_PUBLIC_BASE_URL` | Base URL for public photo renditions |
| `PRESIGNED_URL_TTL_SECONDS` | Lifetime of upload and private download links (300) |
| `CLAMAV_HOST` / `CLAMAV_PORT` | Antivirus daemon address |
| `FIELD_ENCRYPTION_KEYS` | Versioned master keys for envelope encryption of payout numbers |
| `ID_HASH_PEPPER` | Secret for HMAC of ID numbers and recipient hashes |
| `SMS_PROVIDER` / `SMS_API_KEY` / `SMS_SENDER_ID` | Main SMS provider (local aggregator) |
| `SMS_FALLBACK_PROVIDER` / `SMS_FALLBACK_API_KEY` | Fallback SMS provider (transfer abroad: VERIFY) |
| `SMS_DAILY_BUDGET_DZD` / `SMS_MONTHLY_BUDGET_DZD` | SMS spending caps (NFR-11) |
| `EMAIL_BACKEND` / `EMAIL_HOST` / `EMAIL_PORT` / `EMAIL_HOST_USER` / `EMAIL_HOST_PASSWORD` / `EMAIL_USE_TLS` | Outgoing email |
| `DEFAULT_FROM_EMAIL` | Sender address (`no-reply@notify.bladus.com.dz`) |
| `STAGING_EMAIL_ALLOWLIST` | Staging only: addresses allowed to receive email |
| `SENTRY_DSN` / `SENTRY_ENVIRONMENT` / `SENTRY_RELEASE` | Error tracking (GlitchTip) |
| `LOG_LEVEL` / `LOG_JSON` | Logging level and format |
| `PROMETHEUS_MULTIPROC_DIR` | Shared folder for metrics from several Gunicorn workers |
| `GUNICORN_WORKERS` / `GUNICORN_TIMEOUT` | API process tuning |
| `CELERY_WORKER_CONCURRENCY` | Worker tuning per container |
| `NOMINATIM_URL` / `NOMINATIM_USER_AGENT` | Address lookup service (server-side, cached, 1 request per second) |
| `MONEY_MODEL` | `M1` at launch; other models stay off until legal approval (BR-PAY-11) |
| `CHARGILY_API_KEY` / `CHARGILY_WEBHOOK_SECRET` | Payment gateway (R2 only) |
| `AUDIT_ANCHOR_EMAILS` | Who receives the daily audit hash anchor |
| `TIME_ZONE_BUSINESS` | `Africa/Algiers` (business dates; storage stays UTC) |

Business settings (commission rates, request TTL, credit limits, maintenance mode, feature flags) are **not** environment variables: they live in the versioned `platform_settings` table (BR-CFG-01).

### 12.2 Website (Next.js)

| Variable | Purpose |
|---|---|
| `BLADUS_API_URL` | Private address of the Django API (server-only) |
| `BFF_SERVICE_KEY` | This app's service key for Django (server-only) |
| `BLADUS_SESSION_COOKIE_KEY` / `BLADUS_SESSION_COOKIE_KEY_PREVIOUS` | Encryption key for the session cookie, and the previous key during rotation (replaces `DARNA_SESSION_SECRET`) |
| `BLADUS_API_MODULES` | Server-only list of `lib/data` modules served by the API instead of mock data (migration flag) |
| `BLADUS_SHADOW_MODULES` | Staging: modules running in shadow-read mode |
| `NEXT_PUBLIC_SITE_URL` | Public origin for canonical URLs, sitemap, Open Graph |
| `NEXT_PUBLIC_BLADUS_TEST_MODE` | Demo test mode. **Must be `0` in production and any environment with real data**; the build refuses otherwise |
| `NEXT_PUBLIC_MEDIA_BASE_URL` | Base URL of public photos |
| `NEXT_PUBLIC_MAP_TILES_URL` | Map tiles (OpenFreeMap, with attribution) |
| `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` | Error tracking, server and browser (browser DSN is not a secret) |

### 12.3 Admin (Next.js)

| Variable | Purpose |
|---|---|
| `BLADUS_API_URL` | Private address of the Django API |
| `BFF_SERVICE_KEY` | Admin service key for Django |
| `ADMIN_SESSION_COOKIE_KEY` / `ADMIN_SESSION_COOKIE_KEY_PREVIOUS` | Encryption key for the staff cookie (replaces `ADMIN_AUTH_SECRET`) |
| `ADMIN_IDLE_TIMEOUT_MINUTES` | Fallback idle timeout if settings are unreachable (30) |
| `BLADUS_API_MODULES` | Migration flag, as for the website |
| `NEXT_PUBLIC_FRONTEND_URL` | Public website origin (for "view public page" links) |
| `SENTRY_DSN` | Error tracking |

The current `ADMIN_SEED_*` variables (mock staff passwords) disappear when the admin `auth` module moves to the API; staff accounts are then created by invitation (STF-02).

### 12.4 Operations

| Variable | Purpose |
|---|---|
| `PGBACKREST_REPO1_HOST` / `PGBACKREST_REPO1_CIPHER_PASS` | Backup repository at site B and its encryption passphrase |
| `BACKUP_AGE_RECIPIENT` | Public key used to encrypt nightly dumps (the private key is offline) |
| `REPLICATION_PASSWORD` | Password of the replication role |
| `MINIO_ROOT_USER` / `MINIO_ROOT_PASSWORD` | Storage administrator (if self-hosted) |
| `GRAFANA_ADMIN_PASSWORD` | Monitoring administrator |
| `ALERT_SMS_PROVIDER_KEY` / `ALERT_CHAT_WEBHOOK_URL` | Where alerts are sent |

---

## Check yourself

- [ ] Why is staging never filled with a copy of production data?
- [ ] Which data may live outside Algeria, under which condition, and who must confirm it?
- [ ] Which container must run exactly once, and what happens if two run?
- [ ] A release removes a column. Why must the removal wait for a later release?
- [ ] What gives us an RPO of 15 minutes, and what gives us an RTO of 4 hours?
- [ ] What do we check during the monthly restore drill?
- [ ] Which pipeline step refuses a website build with test mode on?
- [ ] Where do commission rates live: environment variables or the database? Why?
