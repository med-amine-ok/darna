# BLADUS backend (first version)

Django 5.2 + Django REST Framework. Design documents: `../docs/backend/`
(start with `00-START-HERE.md`; the short version is `compact/BLADUS-backend-compact.pdf`).

## Run it

```bash
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

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
- **Dates**: stay ranges are half-open `[check_in, check_out)`; helpers in
  `apps.core.timeutils`.
- **Tests**: pytest, fixtures in `conftest.py` (`api`, `user`, `user_client`,
  `admin_client`, `make_user`, `client_for`). A test of a business rule is named
  `test_br_<area>_<nn>_...`.
- Never use the em dash character in code, comments or docs.
