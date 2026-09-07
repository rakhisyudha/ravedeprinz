# ravedeprinz

Personal site and CMS. The frontend is an Astro app with Svelte islands,
the backend is a Bun API over PostgreSQL. No framework auth providers, no
ORM, no Supabase. Both run in Docker, or on bare metal if you prefer.

```
Astro (:3100, :3000 via compose)
  ↓ HTTP
Bun API (:4100)
  ↓ SQL
PostgreSQL (:5433)
```

## Structure

```
Frontend/     Astro pages, Svelte islands, layouts, styles, SEO
Backend/      Bun API, auth, CMS operations, migrations, tests
```

The frontend never touches PostgreSQL: all content and auth go through
the Bun API over HTTP. The backend owns sessions, authorization, CMS
writes, uploads, and seeding.

## Prerequisites

- Node.js 22 or newer
- Bun 1.x
- Docker and Docker Compose if you want the container setup

## Environment variables

### Frontend (`Frontend/.env`)

| Variable | Required | Description |
| --- | --- | --- |
| `PUBLIC_CMS_API_URL` | no | Browser-facing Bun API origin, defaults to `http://localhost:4100` |
| `CMS_API_URL` | no | Server-side Bun API origin for SSR, defaults to `http://localhost:4100` |
| `SITE_URL` / `PUBLIC_SITE_URL` | no | Canonical origin for sitemap, robots, OG URLs, metadata |

### Backend (`Backend/.env`, never commit)

| Variable | Required | Description |
| --- | --- | --- |
| `PORT` | no | API port, defaults to `4100` |
| `DATABASE_URL` | yes | PostgreSQL connection string |
| `FRONTEND_URL` | no | Frontend origin for CORS, defaults to `http://localhost:3100` |
| `UPLOADS_DIR` | no | Upload storage, defaults to `/data/uploads` in Docker |
| `AUTH_SEED_EMAIL` / `AUTH_SEED_PASSWORD` | no | Owner account provisioned by `seed-auth.ts` |

## Local development

### Backend

```bash
cd Backend
bun install
bun src/index.ts      # applies migrations on boot
bun src/seed.ts       # idempotent content seed (run after first boot)
bun src/seed-auth.ts  # idempotent owner seed (needs AUTH_SEED_* set)
bun --watch src/index.ts   # dev with reload
bun test              # auth + CMS matrix (isolated test database)
bun run typecheck     # tsc --noEmit (Bun itself does not typecheck)
```

### Frontend

```bash
cd Frontend
npm install
npm run dev
```

Open `http://localhost:3100`. The admin area is behind the Bun session
cookie: sign in at `/login` with a seeded/provisioned account and open
`/admin`. Unauthenticated `/admin/*` requests redirect to `/login`.

## Docker

Two compose files. Run each from its own directory.

### Backend

```bash
cd Backend
docker compose up -d --build
```

Migrations run first inside the API container on every boot, then
seeds, then the API. Seeds are idempotent — re-running `docker compose
up` after a crash or reboot just resumes where it stopped.

PostgreSQL on `5433` (volume `ravedeprinz_pgdata`), API on `4100`
(volume `ravedeprinz_uploads_v2` at `/data/uploads`). Seeds run on boot
and skip when data exists.

### Frontend

```bash
cd Frontend
docker compose up -d --build web
```

Serves on host port `3000` (container `3100`), so the existing nginx
`proxy_pass` keeps working unchanged. Build args `PUBLIC_CMS_API_URL`,
`CMS_API_URL`, `SITE_URL`, `PUBLIC_SITE_URL` bake origins; override them
for production without source changes.

Uploaded images live in the named volume `ravedeprinz_uploads_v2`,
mounted at `/data/uploads` in the API container, so images survive
recreates. Nginx must proxy `/uploads/` to the Bun API (or to Astro,
which relays to Bun); never point nginx at a container filesystem path.
The retired `ravedeprinz_uploads` volume is retained with its files but
no longer mounted — migrate anything still needed, then drop it.

## Content model

PostgreSQL tables, migrated forward-only under `Backend/migrations/`:

- `site_settings`, `home_content`, `home_navigation` for the home page
- `about_content`, `skills`, `work_entries`, `education_entries` for about and work
- `projects` for the project list
- `notes` for the note list
- `now_current`, `now_attention`, `now_history` for the now page
- `users`, `sessions`, `admin_users` for email/password auth
- `audit_logs` (append-only) for admin mutations

Public reads (`/api/content/*`) return published content only. Admin
writes (`/api/admin/*`) require a server-verified admin session.

## Notes (ravedeprinz.me/notes)

The notes section is the personal writing part of the site. It reads like a
small Medium or Substack: a list of posts, each with a tag, author, publish
date, reading time, and a cover image. The list is the archive, the detail
page is the essay.

Each note is a single long-form page. The body supports a light subset of
markdown: paragraphs, headings, lists, bold, italics, and inline images.
Every article shows a reading progress bar, an archive share card, and share
links for the canonical URL. Per-note 1200×630 Open Graph images are
generated with the site identity, plus JSON-LD, sitemap, and robots entries,
so pasting a link produces a proper card.

Posts are stored in the `notes` table and managed from `/admin/notes`. The
`subtitle`, `author`, and `image_url` columns drive the list page and the
social preview, while the `body` column is the article itself.

## Notes

- The upload endpoint accepts images up to 5 MB and validates the real file
  type from magic bytes, not the extension.
- Auth is custom: `Bun.password` hashes, opaque SHA-256 session tokens,
  HttpOnly `SameSite=Lax` cookies, server-side `requireAuth`/`requireAdmin`.
- The frontend build produces the standalone Node server run by
  `Frontend/Dockerfile`.


## To Be Implemented

- `/savepoint` session to put a gaming log. The `/notes` stays for a reflection 
  and thoughts, and this `/savepoint` session will act like a log entry. Log is a Data, 
  and Note are story.
Each entry is small and consistent:
- Cover image, platform, status: NOW PLAYING / COMPLETED / BACKLOG / SHELVED.
- Started and finished date, hours played, short verdict.
- One paragraph of personal note, or a review for the game.
- Somewhat will makes the app more lightweight, smoother, and more optimization will come.
- `/notes/[id]` will have more share option and more compatibily to app that can be shared.
