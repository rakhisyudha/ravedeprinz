# ravedeprinz

Personal site and CMS for [ravedeprinz.me](https://ravedeprinz.me). Astro + Svelte 5 frontend, hand-rolled Bun API backend, PostgreSQL. No ORM, no framework auth, no SaaS CMS.

```
Astro + Svelte 5   (:3100, published as :3000 via compose)
  ↓ HTTP only
Bun API            (:4100)
  ↓ SQL
PostgreSQL 16      (host :5433, container :5432)
```

The frontend never touches PostgreSQL. Public reads, auth, admin writes, and uploads all go through the Bun API over HTTP. When the CMS is down, pages fall back to static content shipped in the frontend bundle (`Frontend/src/data/content.ts`), so nothing looks broken.

## Stack

- **Frontend:** Astro 7 (server output, node adapter), Svelte 5 islands, hand-written CSS with a Tailwind reset, self-hosted FOT fonts. OG images generated per request with `satori` + `resvg-js`.
- **Backend:** Bun 1.x, `Bun.serve` directly, raw SQL via `bun:SQL`, `Bun.password` for hashing, session tokens hashed with SHA-256 before storage, forward-only SQL migrations, `bun test` against an isolated test database.
- **Not used, on purpose:** ORM, Supabase, NextAuth, Tailwind UI, shadcn, CSS-in-JS.

## Repository layout

```
Frontend/   Astro pages, Svelte islands, layouts, styles,
            SEO, per-note OG image generation
Backend/    Bun HTTP server, session auth, CMS writes,
            uploads, migrations, seeds, isolated test database
```

Key paths, briefly:

- `Frontend/src/middleware.ts` gates `/admin/*` server-side by checking the session against the API.
- `Frontend/src/lib/api.ts` wraps every CMS call in a three-state result (`ok` / `not-found` / `unavailable`) that never throws.
- `Frontend/src/lib/seo.ts` centralizes canonical URLs and OG metadata.
- `Backend/src/db.ts` owns the SQL client and forward-only migrations tracked in `schema_migrations`.
- `Backend/src/auth/` is the whole auth stack: password hashing, token generation, session cookie helpers.
- `Backend/src/routes/` splits into content (public reads), auth, admin (writes), and files (`/uploads/*`).
- `Backend/src/services/upload.ts` validates uploads by magic bytes, not extension.
- `Backend/migrations/` is four forward-only SQL files: content schema, auth schema, user roles, audit logs.

## Auth

- Login POSTs to `/api/auth/login`, verifies with `Bun.password`, then issues a 256-bit CSPRNG token. The raw token goes in an HttpOnly cookie, only the SHA-256 hash is stored in the database.
- Cookie: `HttpOnly`, `SameSite=Lax`, `Path=/`, 30 days. `Secure` is added in production or when `COOKIE_SECURE=true`.
- Every `/api/admin/*` call is re-verified by the backend. The Astro middleware is only a UX gate, not the security boundary.
- Every CMS write inserts a row into `audit_logs`.

## Content model

Content lives in PostgreSQL: `site_settings`, `home_content`, `home_navigation`, `about_content`, `skills`, `work_entries`, `education_entries`, `projects`, `notes`, the `now_*` tables, plus `users`, `sessions`, `admin_users`, and `audit_logs`. Full DDL is in `Backend/migrations/001_content_schema.sql` and `002_auth_schema.sql`.

Migrations are forward-only, applied in filename order on boot, tracked in `schema_migrations`. Never edit an applied migration; add a new file.

## Admin

`/admin/*` is the CMS: dashboard, home, about, work, projects, notes, now, and users pages. It renders 403 and 503 panels inline when the session lacks admin rights or the backend is unreachable.

## Local development

Backend:

```bash
cd Backend
bun install
bun src/index.ts           # applies migrations on boot
bun src/seed.ts            # idempotent content seed
bun src/seed-auth.ts       # owner seed, needs AUTH_SEED_* set
bun --watch src/index.ts   # dev with reload
bun test                   # isolated test database
bun run typecheck
```

Frontend:

```bash
cd Frontend
npm install
npm run dev   # http://localhost:3100
```

Sign in at `/login` with the seeded owner account.

### Environment variables

Frontend (`.env`): `PUBLIC_CMS_API_URL` (browser-facing API origin), `CMS_API_URL` (server-side API origin for SSR), `SITE_URL` (canonical origin for sitemap/robots/OG), `CMS_API_TIMEOUT_MS` (default 8000). All optional, all default to localhost values.

Backend (`.env`): `DATABASE_URL` (required), `PORT` (default 4100), `FRONTEND_URL` (CORS origin), `UPLOADS_DIR` (default `/data/uploads`), `AUTH_SEED_EMAIL` / `AUTH_SEED_PASSWORD`, `COOKIE_SECURE`. None of these should be committed.

## Docker deployment

Each half runs from its own directory:

```bash
cd Backend && docker compose up -d --build
cd Frontend && docker compose up -d --build web
```

The frontend build needs `PUBLIC_CMS_API_URL`, `SITE_URL`, and `PUBLIC_SITE_URL` set to `https://ravedeprinz.me`. Build args are baked into the image at build time, so rebuild when they change. Both containers join an external `webnet` network so SSR fetches resolve the API as `http://api:4100`.

Migrations and seeds run inside the API container on every boot and are idempotent, so a restart after a crash just resumes.

In production nginx proxies `/api/*` and `/uploads/*` to `127.0.0.1:4100`, everything else to `127.0.0.1:3000`, with `client_max_body_size 6M`. Same-origin means no CORS and no cookie scoping.

## Operational notes

- **Volumes:** `ravedeprinz_pgdata` (database) and `ravedeprinz_uploads_v2` (uploads). `ravedeprinz_uploads` is a retired volume kept around until migrated.
- **Backups:** `pg_dump` the database and snapshot the uploads volume. Back up `.env` files out of band.
- **Recovery:** if a first boot fails partway, `docker compose down && docker volume rm ravedeprinz_pgdata && docker compose up -d --build` wipes the DB and starts clean. The uploads volume is untouched.
- **Owner account:** set `AUTH_SEED_EMAIL` and `AUTH_SEED_PASSWORD` in `Backend/.env`, then restart the api container. The seed is idempotent and never overwrites an existing password; reset passwords in `/admin/users` instead.
- **Performance:** public pages ship at most two small Svelte islands; everything else is zero-JS Astro HTML.

## License

Personal project. All rights reserved. No license granted for reuse, redistribution, or modification.
