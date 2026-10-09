# ravedeprinz

Personal site and CMS for [ravedeprinz.me](https://ravedeprinz.me). Astro + Svelte 5 on the front, a hand-rolled Bun API behind it, PostgreSQL underneath. No ORM, no framework auth, no SaaS CMS.

```
Astro + Svelte 5   :3100, published as :3000 via compose
  └── HTTP only
      Bun API       :4100
        └── SQL
            PostgreSQL 16   host :5433, container :5432
```

The frontend never touches PostgreSQL. Public reads, auth, admin writes, and uploads all go through the Bun API. The API is the security boundary; the server-side gate in `Frontend/src/middleware.ts` in front of `/admin/*` is only a UX shortcut. When the CMS is unreachable, pages render the static fallback content shipped in the frontend bundle (`Frontend/src/data/`), so nothing looks broken.

## Stack

- **Frontend** — Astro 7 (server output, Node adapter), Svelte 5 islands, hand-written CSS on a Tailwind reset, self-hosted FOT fonts. OG images rendered per request with `satori` + `resvg-js`; notes feed as RSS 2.0 (latest 20) that answers 503 with `Retry-After` instead of a broken feed.
- **Backend** — Bun, `Bun.serve` directly, raw SQL via `bun:sql`, `Bun.password` hashing, session tokens stored as SHA-256 hashes, forward-only migrations, `bun test` against an isolated test database.
- **Deliberately not used** — ORM, Supabase, NextAuth, Tailwind UI, shadcn, CSS-in-JS.

## Layout

```
Frontend/   Astro pages, Svelte islands, layouts, styles, SEO, OG generation
Backend/    Bun HTTP server, auth, CMS routes, uploads, migrations, seeds, tests
```

- `Frontend/src/lib/api.ts` wraps every CMS call in a three-state result (`ok` / `not-found` / `unavailable`) and never throws.
- `Frontend/src/lib/noteTags.ts` / `noteNav.ts` — a note carries one to three tags (16 characters each; `notes.tag` mirrors the first for older clients). `/notes?tag=A&tag=B` keeps notes with every selected tag, and each note links to its newer and older neighbours.
- `Backend/src/routes/` splits into content (public reads), auth, admin (writes), and files (`/uploads/*`).
- `Backend/src/services/upload.ts` validates uploads by magic bytes, not extension, and every admin write also lands in `audit_logs`.

## Auth

Login POSTs to `/api/auth/login`, verifies with `Bun.password`, and issues a 256-bit CSPRNG token. The raw token goes in an `HttpOnly` cookie (`SameSite=Lax`, `Path=/`, 30 days, `Secure` in production or when `COOKIE_SECURE=true`); only its SHA-256 hash is stored. Every `/api/admin/*` call is re-verified server-side.

## Data

Content lives in PostgreSQL: `site_settings`, `home_content`, `home_navigation`, `about_content`, `skills`, `work_entries`, `education_entries`, `projects`, `notes`, and the `now_*` tables, plus `users`, `sessions`, `admin_users`, and `audit_logs`. DDL is in `Backend/migrations/` — seven forward-only files applied in filename order on boot and tracked in `schema_migrations`. Never edit an applied migration; add a new file.

## Development

```bash
# Backend (:4100) — migrations and seeds apply on boot
cd Backend
bun install
bun src/index.ts
bun src/seed.ts          # idempotent content seed
bun src/seed-auth.ts     # owner seed, needs AUTH_SEED_* set
bun test                 # isolated test database
bun run typecheck

# Frontend (:3100)
cd Frontend
npm install
npm run dev
```

Sign in at `/login` with the seeded owner account.

**Environment** — copy `.env.example` to `.env` in each half. Frontend: `PUBLIC_CMS_API_URL`, `CMS_API_URL`, `SITE_URL` / `PUBLIC_SITE_URL`, `CMS_API_TIMEOUT_MS` (default 8000), and `PUBLIC_ANALYTICS_*`. Backend: `DATABASE_URL` (required), `PORT` (default 4100), `FRONTEND_URL`, `UPLOADS_DIR`, `AUTH_SEED_EMAIL` / `AUTH_SEED_PASSWORD`, `COOKIE_SECURE`. All optional with localhost defaults; `.env` files never enter git.

## Deployment

```bash
cd Backend  && docker compose up -d --build   # postgres :5433, api :4100
cd Frontend && docker compose up -d --build web   # :3000 on the host
```

The frontend image bakes `PUBLIC_CMS_API_URL`, `SITE_URL`, and `PUBLIC_SITE_URL` as build args, so rebuild when they change. Both halves join an external `webnet` so SSR fetches reach the API as `http://api:4100`. Migrations and seeds re-run idempotently on every boot, so a restart resumes after a crash. In production, nginx proxies `/api/*` and `/uploads/*` to `127.0.0.1:4100` and everything else to `127.0.0.1:3000` with `client_max_body_size 6M`, keeping everything same-origin.

Back up the `ravedeprinz_pgdata` and `ravedeprinz_uploads_v2` volumes plus the `.env` files. The default owner account comes from `AUTH_SEED_EMAIL` / `AUTH_SEED_PASSWORD`; the seed never overwrites an existing password — reset passwords from `/admin/users`.

## License

Personal project. All rights reserved. No license granted for reuse, redistribution, or modification.
