# Rules for wiring the frontend and admin apps to the Django API (2026-11-15)

The user asked: connect the backend to the frontend, remove all mock data, and make every screen work with
its real endpoint. Several builders work at the same time in the same folders, each owning a set of files.

## Apps and how they talk to the backend
- Website: `C:\Users\OASIS\Documents\darna\frontend` (Next.js 14, next-intl, server actions). Admin panel:
  `C:\Users\OASIS\Documents\darna\admin` (Next.js 14, port 3001). Backend: `C:\Users\OASIS\Documents\darna\backend`
  (Django, `/api/v1`). A backend is already running at `http://localhost:8000` (do not start or stop it; do not
  start Next dev servers either, the lead does the browser checks).
- Read each app's `AGENTS.md` first. The API contract is `docs/backend/openapi.yaml`, but the code is the truth:
  check real shapes with `curl http://localhost:8000/api/v1/...` or the live schema `http://localhost:8000/api/schema/`,
  and the serializers in `backend/apps/<app>/serializers.py`.
- Pattern (BFF): the browser never calls Django. Pages (server components), server actions and route handlers
  call Django through `lib/api/client.ts` (`api`, `apiOrNull`, `apiAll`, `rowsOf`, `totalOf`,
  `newIdempotencyKey`, `ApiError`). The Django token lives in an httpOnly cookie and is added there.
  Client components keep calling server actions; never import `lib/api/*` into a client component.
- Website shared pieces already written by the lead (do not rewrite, extend only if needed and say so):
  `lib/api/client.ts`, `lib/api/errors.ts` (`apiAction`, `failFromError`, `actionCodeFor`), `lib/api/me.ts`
  (`/me` + workspaces -> `User`), `lib/api/organization.ts` (`toOrganization`), `lib/server/session.ts`
  (`getSessionUser`, `getMe`, `startSession(token)`, `refreshSession(user, orgId)`, `endSession`),
  `lib/server/host-context.ts` (`getHostContext` from the backend's active workspace), `app/api/auth/*`.
- Admin shared piece: `admin/lib/api/client.ts` (same API, cookie `bladus_admin_api_token`). Admin builder AD1
  writes the admin session layer on top of it; AD2 uses AD1's helpers (see their briefs).

## Mapping, types and mock data
- Keep the screens. Replace the bodies of the data modules (`frontend/lib/data/*`, `admin/lib/data/*`) and
  the server actions with API calls, mapping backend JSON to the existing TypeScript types. Put mappers in your
  own `lib/api/<area>.ts` files. Money: the backend uses integer centimes (`*_minor`); convert where the
  existing types use dinars, and send centimes back.
- Shared files (`types.ts`, `admin/lib/types/*`, `lib/action-result.ts`, `messages/*.json`): additive edits
  only (new optional fields, new error codes with their translations in en, fr and ar), small Edit calls, re-read
  before editing because others edit them too.
- Keep exported function names of data modules stable when files you do not own call them. You may change
  signatures only when every caller is in your own files.
- No module you own may import `lib/mock-data/*`, `lib/data/_store.ts`, `lib/data/_tables.ts`,
  `admin/lib/mock-data/*` or invent data. Do NOT delete those mock files yourself: the seed builder reads them,
  the lead deletes them at the end. Hard-coded demo arrays in components or pages you own must go too
  (replace with API data or an honest empty state).
- Features the backend switches off (online payment, payouts, DEC-019) must show the disabled state, not fake data.

## Backend gaps
- If the backend lacks a field, filter or endpoint you need: first check whether another endpoint already gives
  it. If not, you may make a small ADDITIVE change in the backend app(s) named in your brief only (a read-only
  serializer field, a query filter), with a test, never changing existing behaviour; run that app's tests
  (`python -m pytest apps/<app> -p no:warnings -o addopts="" -q` from `backend/`). Anything else: work around it
  and list it in your report. No migrations unless your brief allows it.

## Quality bar
- Every page shows loading, empty and error states honestly (an API failure must not crash a page: catch in the
  data layer, show the empty or error UI). Use the skill patterns: one central client, normalised errors,
  retries only for reads, Idempotency-Key on money writes, debounce + AbortController for search-as-you-type in
  client components.
- Security: never send the token to the browser, never log it, never put personal data in URLs; server actions
  check the session; host actions rely on the backend's permission checks (403 -> FORBIDDEN).
- Type check after your changes: `npx tsc --noEmit` in the app folder (errors in files you do not own may be
  another builder mid-edit: re-run later, never fix them). Also `npm run lint` on your files if it is fast.
- No em dashes anywhere. Brand BLADUS; keep internal `darna` identifiers. Git: read-only, no commits.

## Final report (short)
1. Screens and actions now on the API, and anything still not wired (with reason).
2. Backend changes you made (files, tests) and backend gaps you worked around.
3. Shared-file edits (types, error codes, messages).
4. `tsc` result for your files.
