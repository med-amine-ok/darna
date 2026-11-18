# BLADUS backend (first version)

Django 5.2 + Django REST Framework. Design documents: `../docs/backend/`
(start with `00-START-HERE.md`; the short version is `compact/BLADUS-backend-compact.pdf`).

## Run it

```bash
python manage.py migrate
python manage.py createsuperuser
python manage.py seed_demo      # optional: the demo world of the website and admin panel
python manage.py runserver
```

`seed_demo` loads the geography and the taxonomy, then creates the demo users,
hosts, organisations, listings, trips, bookings, conversations, reviews and
deposits through the services (about a minute). Running it again changes
nothing; to rebuild, start from a fresh database. Every demo account (for example
`yacine.traveler@bladus.dz`, `amina.benali@bladus.dz`, `karim.mansouri@bladus.dz`)
uses the demo password of `frontend/lib/data/auth.ts`. Staff accounts
(`admin@bladus.dz`, `moderator@`, `support@`, `finance@`, `analyst@bladus.dz`)
have no authenticator yet: the first admin sign-in asks to enrol one (BR-ACC-04).

API: `http://localhost:8000/api/v1/`
Interactive Swagger UI: `http://localhost:8000/swagger/` or `http://localhost:8000/api/docs/`
ReDoc UI: `http://localhost:8000/api/redoc/`
OpenAPI schema: `http://localhost:8000/api/schema/`
Tests: `python -m pytest`.

Without `DATABASE_URL` the project uses SQLite. Set `DATABASE_URL=postgres://...`
(see `.env.example`) for PostgreSQL, which is required in production.

## Code conventions (every app follows them)

- **Layers**: apps are listed in `backend/settings.py` from low to high; an app
  only imports apps listed before it.
- **Files per app**: `models.py` (tables), `selectors.py` (read queries),
  `services.py` (every write and business rule), `serializers.py` (API shapes),
  `views.py` (thin HTTP layer), `urls.py`, `admin.py`, `tests/`.
- **Docstrings**: every module, class, function and method has a docstring that
  says what it does and why, citing the rule id (`BR-...`, `DEC-...`) from
  `docs/backend/04-business-rules.md` when one applies.
- **Ids**: `apps.core.models.UUIDModel` (UUIDv7). Human references with
  `apps.core.ids.human_reference`.
- **Money**: integer centimes in `*_minor` columns + `currency`; rates in basis
  points `*_bp`; helpers in `apps.core.money`.
- **Errors**: services raise `apps.core.errors.DomainError` (or `NotFoundError`,
  `ForbiddenError`, `ConflictError`) with a stable `code`; the API answers
  `{"code", "message", "status", "errors"}`.
- **Auth**: `Authorization: Bearer <session token>`; `request.user`, `request.auth`
  (the `SessionToken`). Admin endpoints live under `/api/v1/admin/` and use
  `apps.accounts.permissions.IsAdmin`. Public endpoints set
  `permission_classes = [AllowAny]`.
- **Host endpoints** live under `/api/v1/host/`, call
  `apps.hosts.context.get_host_context(request)` and always filter by
  `ctx.host_account`; role checks with `ctx.require("listings.manage")`.
- **Settings and commission**: `apps.config.services.get_settings()`,
  `commission_rate_bp(host_account)`.
- **Audit**: every admin action and every money or team change calls
  `apps.audit.services.record(...)` inside the same transaction.
- **Transactions**: services that write several rows use `transaction.atomic`;
  rows that must not change concurrently are read with `select_for_update()`.
- **Lock order** (review R7): host wallet balance (`ledger.services.lock_wallet`)
  first, then the booking, then the listing or stock rows. Never update a
  platform-wide row on the booking path; totals are sums of ledger lines.
- **Side effects** (calls to hotel systems, later emails and SMS) go through the
  outbox: `apps.core.outbox.enqueue(topic, payload)` inside the same transaction,
  delivered by `run_outbox` with retries; handlers must be idempotent.
- **PostgreSQL-only guards** live in `RunPython` migrations that check
  `schema_editor.connection.vendor` (exclusion constraint, triggers); the same
  rule must also be checked in the service so SQLite behaves the same.

## Scheduled jobs (cron or Celery beat in production)

| Command | When | What |
|---|---|---|
| `python manage.py expire_requests` | every 5 min | expire unanswered requests |
| `python manage.py complete_stays` | every 5 min | complete finished stays |
| `python manage.py run_outbox` | every minute | push room changes to hotel systems, with retries |
| `python manage.py reconcile_balances` | every night | compare wallet balances with ledger lines; exit code 1 = alert |
| `python manage.py sync_moderation_cases` | every 15 min | open moderation cases for items waiting for review |
| `python manage.py publish_reviews` | every hour | publish reviews whose 14-day window ended (BR-REV-02) |
| `python manage.py publish_reviews --recompute` | every night | rebuild rating averages (BR-REV-04) |
| `python manage.py monthly_invoices` | 1st of each month | commission invoices of the past month |

- **Dates**: stay ranges are half-open `[check_in, check_out)`; helpers in
  `apps.core.timeutils`.
- **Tests**: pytest, fixtures in `conftest.py` (`api`, `user`, `user_client`,
  `admin_client`, `make_user`, `client_for`). A test of a business rule is named
  `test_br_<area>_<nn>_...`.
- Never use the em dash character in code, comments or docs.

## Production settings checked at start

With `DJANGO_DEBUG=False` the server refuses to start until these are set:
`DJANGO_SECRET_KEY`, `HASH_PEPPER`, `INTEGRATION_KEYS`, `MEDIA_STORAGE_BACKEND=s3`
(plus the `MEDIA_S3_*` values) and `MEDIA_SCANNER` (a real virus scanner). Email
uses SMTP (`EMAIL_HOST` and friends); payment webhooks need
`CHARGILY_WEBHOOK_SECRET` / `SLICKPAY_WEBHOOK_SECRET` once online payment is on
(DEC-019 keeps it off). See `.env.example`.
