# ravedeprinz CMS v2 (Phase 2)

Parallel rebuild of the CMS backend: Bun + PostgreSQL, no Supabase.
Runs beside v1 (Bun :4000) on :4100 with its own database.

## Layout

```
migrations/       numbered SQL, applied in order on boot
src/
  index.ts        HTTP server (Bun.serve), routing, CORS
  config.ts       environment
  db.ts           Bun.sql client + migration runner
  types.ts        row shapes (mirror the public contract)
  errors.ts       404 / 503 / 500 contract + JSON helpers
  services/       SQL only, no HTTP
  routes/         HTTP mapping only, no SQL
  seed.ts         idempotent deterministic seed
```

## Commands

```bash
bun install
bun --watch src/index.ts  # applies pending migrations on boot
bun src/seed.ts           # idempotent seed (run after first boot)
```

Environment:

| Variable             | Default                                                 |
| -------------------- | ------------------------------------------------------- |
| `PORT`               | `4100`                                                  |
| `DATABASE_URL`       | `postgres://archive:archive@127.0.0.1:5433/ravedeprinz` |
| `FRONTEND_URL`       | `http://localhost:3000,http://localhost:3100`           |
| `AUTH_SEED_EMAIL`    | (unset → auth seed skips)                               |
| `AUTH_SEED_PASSWORD` | (unset → auth seed skips)                               |

## Authentication (Phase 3, email + password only)

- Passwords: `Bun.password` (bcrypt), never logged/stored/returned.
- Sessions: 256-bit `randomBytes` token, 30-day expiry, SHA-256 hash
  stored in PostgreSQL, raw token only in an HttpOnly cookie
  (`SameSite=Lax`, `Secure` in production).
- `POST /api/auth/login` → `{ user: { id, email, is_admin } }` + cookie.
  Failures share one generic 401; malformed input is 400.
- `GET /api/auth/session` → `{ authenticated, user? }`.
- `POST /api/auth/logout` → revokes + clears cookie, safe without session.
- `GET /api/admin/me` → `requireAdmin()` proof endpoint (401/403 enforced
  server-side). Full CRUD arrives in Phase 4.

```bash
bun test                 # auth matrix against ravedeprinz_test
bun run typecheck        # tsc --noEmit (Bun itself does not typecheck)
AUTH_SEED_EMAIL=you@x.co AUTH_SEED_PASSWORD=... bun src/seed-auth.ts
```

## Deferred (later phases)

Google OIDC, password reset, email verification, MFA, rate limiting,
CSRF tokens, session-expiry sliding, expired-session janitor (beyond the
opportunistic purge on login), audit logging, full admin CRUD.

## Docker

```bash
docker compose up -d --build   # postgres :5433, api :4100, seeds on boot
```

## Scope

Phase 2 serves public content only (`/api/health`, `/api/content/*`).
Admin/auth arrive in Phase 3/4. Published-only filtering lives in SQL.
