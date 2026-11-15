# Build rules for the 2026-11-15 endpoint push (shared by every builder)

The user decided: **the plan wins**. Every endpoint in `docs/backend/openapi.yaml` must exist in the code at the
same path and method, with the request body, response shape, status codes and error codes the spec gives.
Six builders work at the same time in the same folder (`C:\Users\OASIS\Documents\darna\backend`), each owning
whole Django apps. The split is in `build-split-2026-11-15.md` (same folder as this file).

## Read first
- `backend/README.md`: code conventions (layers, services/selectors, money, errors, auth, host context, audit,
  lock order, outbox, PostgreSQL-only guards, docstrings, test names). Follow them exactly.
- `docs/backend/openapi.yaml`: the contract for your operations (search by path or operationId).
- `docs/backend/04-business-rules.md` (rule ids), `05b-data-dictionary.md` (tables and columns),
  `06-api-design.md` (conventions, errors, pagination, idempotency), `07-architecture.md` section 2 (which app
  owns which table, allowed imports between layers), `08-security-privacy.md` when your endpoints touch security.
- Look at one finished app (for example `apps/bookings` or `apps/hosts`) before writing code, and copy its style.

## Ownership (strict)
- Edit only the apps you own (models, migrations, services, selectors, serializers, views, urls, admin, tests,
  management commands). You may import public functions of other apps when the layer rules allow it.
- Never edit: `backend/settings.py`, `backend/urls.py`, the root `conftest.py`, `apps/core/*`, or an app owned by
  another builder. Exceptions are written in your own brief. If you need a change there, work around it inside
  your app and list the wanted change in your final report.
- Settings keys: `apps/config` is owned by builder B. Others keep a module-level constant in their app with a
  comment `# TODO(config): move to platform settings` and report it.
- Migrations: always `python manage.py makemigrations <your_app_label>` with the label. Never run makemigrations
  without a label, never run `migrate` on `db.sqlite3` (the lead runs it at the end), never edit another app's
  migrations. If you need a FK to a model that does not exist yet in another builder's app, do not wait: report it.
- Git: read-only (`git diff`, `git status`). No commit, stash, checkout, reset or branch.

## Moved and extra endpoints
- If your section lists a planned path that the code already serves at another address, move it to the plan's
  address, remove the old route, and update the tests.
- For routes in your apps listed under "Built in the code but not in the plan": if the plan has an equivalent,
  remove the extra route (keep the service function if still used); if it has no equivalent, keep it. Report both.

## Quality bar for every endpoint
- Business logic in `services.py`/`selectors.py`, thin views. Permissions: public `AllowAny`; signed-in user;
  host routes through `get_host_context` and role checks; admin routes `apps.accounts.permissions.IsAdmin`.
- Every admin action and every money or team change calls `apps.audit.services.record(...)` in the same transaction.
- Swagger must read it: use generic views with `serializer_class`, or `@extend_schema(request=..., responses=...)`
  on each method. Paginated lists use `apps.catalog.api.page_schema(...)` for the response.
- Every module, class, function and method has a docstring saying what and why, citing `BR-...`/`DEC-...` ids.
- Tests in your app's `tests/` folder: at least the happy path, one permission refusal and each business rule you
  implement, named `test_br_<area>_<nn>_...` when a rule applies. Shared fixtures are in the root `conftest.py`
  (`api`, `user`, `user_client`, `admin_client`, `make_user`, `client_for`); add new fixtures in
  `apps/<app>/tests/conftest.py`.
- External services are not available: no real network calls. Email and SMS use the existing console backends;
  file storage and payment gateways get a pluggable backend with a local or disabled default, following the plan
  (DEC-019: no online payment in the first release, so payment endpoints answer the spec's disabled error).
- Never write the em dash character anywhere. The brand is BLADUS; keep internal `darna` identifiers.

## Running checks (other builders are mid-edit)
- Your tests: `python -m pytest apps/<app> -p no:warnings -o addopts="" -q`.
- Schema: `python manage.py spectacular --file <tmp file>`; your views must add no "Error" lines.
- A failure caused by another builder's half-written app is not yours: wait a minute and re-run; never fix it.
- Before finishing: your apps' tests pass, `python manage.py makemigrations --check --dry-run <your apps>` is clean.

## Final report (short, plain words)
1. Endpoints done (count) and any not done, with the reason.
2. Endpoints moved, extras removed or kept.
3. New models and migrations.
4. Changes you need in shared files (settings, root urls, root conftest, config DEFAULTS, other apps).
5. Test count for your apps and result.
