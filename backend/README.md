# ravedeprinz API

Bun + PostgreSQL CMS API. No ORM, no framework: `Bun.serve` for HTTP, raw
SQL via `bun:sql`, `Bun.password` for password hashing. Serves the site's
public reads, auth, admin writes, and uploads. The frontend reaches it
over HTTP only, never directly at PostgreSQL.

## Layout

```
migrations/       numbered SQL, forward-only, applied in order on boot
src/
  index.ts        HTTP server (Bun.serve), routing, CORS
  config.ts       environment
  db.ts           Bun.sql client + migration runner (schema_migrations)
  types.ts        row shapes (mirror the public contract)
  errors.ts       404 / 503 / 500 contract + JSON helpers
  auth/           password hashing, token generation, session cookies
  services/       SQL only, no HTTP
  routes/         HTTP mapping only, no SQL
  seed.ts         idempotent deterministic content seed
  seed-auth.ts    idempotent owner seed, never overwrites a password
tests/            bun test, against the ravedeprinz_test database
```

## Commands

```bash
bun install
bun src/index.ts          # applies migrations + seeds on boot
bun --watch src/index.ts  # dev with reload
bun src/seed.ts           # idempotent seed
bun test                  # isolated test database
bun run typecheck         # tsc --noEmit (Bun itself does not typecheck)
```

## Environment

| Variable             | Default                                       |
| -------------------- | --------------------------------------------- |
| `PORT`               | `4100`                                        |
| `DATABASE_URL`       | required                                      |
| `FRONTEND_URL`       | `http://localhost:3000,http://localhost:3100` |
| `UPLOADS_DIR`        | `/data/uploads`                               |
| `AUTH_SEED_EMAIL`    | unset → owner seed skips                      |
| `AUTH_SEED_PASSWORD` | unset → owner seed skips                      |
| `COOKIE_SECURE`      | auto-set `Secure` flag in production          |

## API

- `/api/content/*` — public reads, published-only filtering in SQL.
- `/api/auth/login` — verifies the password, then issues a 30-day session;
  the raw token only ever sits in an `HttpOnly` cookie, the database stores
  its SHA-256 hash.
- `/api/auth/session` / `/api/auth/logout` — session check and revoke.
- `/api/admin/*` — session re-verified and admin required on every call;
  every write also lands in `audit_logs`.
- `/uploads/*` — file serving; uploads are validated by magic bytes, not
  extension.

## Docker

```bash
docker compose up -d --build   # postgres :5433, api :4100
```

Migrations and seeds re-run idempotently on boot, so a restart after a
crash resumes where it stopped.
