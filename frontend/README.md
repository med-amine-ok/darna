# DARNA, frontend

DARNA is an Airbnb-style marketplace for Algeria: homes, hotels, hostels,
experiences, vehicles and agency-run multi-day trips, in English, French and
Arabic (RTL). This package is the public web app (guests and hosts). The
staff back-office lives in `../admin`.

Stack: Next.js 14 (App Router), next-intl 3, Tailwind CSS 3, zustand.

## Running locally

```bash
cp .env.example .env.local   # then set DARNA_SESSION_SECRET (optional in dev)
npm install
npm run dev                  # http://localhost:3000 (redirects to /en)
```

Other scripts: `npm run build`, `npm run start`, `npm run lint`,
`npx tsc --noEmit`.

## Environment variables

| Variable               | Required                                                                                   | Purpose                                                |
| ---------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------ |
| `DARNA_SESSION_SECRET` | Production: yes (32+ chars). Dev: no, an insecure fallback is used with a console warning. | HMAC-SHA256 key that signs the `darna_session` cookie. |

## Demo accounts

There is no backend yet: data comes from an in-memory mock store seeded from
`lib/mock-data` (it resets when the dev server restarts). Every seeded account
uses the password **`darna-demo-2026`**.

| Email                                              | Role                                         |
| -------------------------------------------------- | -------------------------------------------- |
| `yacine.traveler@darna.dz`                         | Guest / traveler                             |
| `amina.benali@darna.dz`                            | Individual host                              |
| `karim.mansouri@darna.dz`                          | Agency owner (Atlas Escapes) and hotel owner |
| `sofiane.mebarki@gmail.com`, `leila.hadj@yahoo.fr` | Guests                                       |

The login page also has one-click demo buttons. New accounts can be created
from the sign-up modal (passwords are hashed with scrypt in the mock store;
minimum 8 characters).

## How data and auth work (mock backend)

- **Session**: one signed, httpOnly `darna_session` cookie (payload: user id,
  host type, organization id, expiry), verified in `middleware.ts` and on the
  server via `getSessionUser()` (`lib/server/session.ts`). The browser never
  reads or writes identity cookies. `darna_mode` is only a UI preference.
- **Single source of truth**: `lib/data/*` are server-only functions over
  in-memory tables kept on `globalThis` (`lib/data/_tables.ts`). Each one is a
  `TODO: replace with Supabase` seam, swap the function body for a query
  without touching components.
- **Mutations** go through Server Actions in `app/actions/*`. Each action
  takes the user from the session, checks ownership / organization role, then
  calls `lib/data`. Client components call the action and update state or
  `router.refresh()`.
- **Organizations** are resolved only through the session user's active
  memberships (`lib/server/host-context.ts`). Roles: owner > admin > manager
  (`lib/host-types.ts`). New organizations start as `pending` verification.
- **Public pages** (`/listings/[id]`, `/users/[id]`, `/agencies/[id]`) receive
  public DTOs only (`lib/server/dto.ts`), no email, phone or address.
