# ravedeprinz

Personal site and CMS. The frontend is a Next.js app, the backend is a small Bun
service that keeps Supabase in sync with the content you edit. Both run in
Docker, or on bare metal if you prefer.

## Structure

```
Frontend/     Next.js site and admin panels
Backend/      Bun CMS service, seeding, and Supabase helpers
```

The frontend talks to Supabase directly for auth and content. The backend is
the write path: it seeds default content, keeps the allowlist of admin emails
in `admin_users`, and handles the content types you manage in the admin UI.

## Prerequisites

- Node.js 20 or newer
- Bun
- A Supabase project with the schema from `Backend/supabase/schema.sql`
  applied
- Docker and Docker Compose if you want the container setup

## Environment variables

### Frontend (`Frontend/.env.local`)

| Variable | Required | Description |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | Supabase anon key |
| `NEXT_PUBLIC_SITE_URL` | no | Public site URL, defaults to `http://localhost:3000` |
| `NEXT_PUBLIC_CMS_API_URL` | no | Public URL of the CMS service, defaults to `http://localhost:4000` |
| `CMS_API_URL` | no | In-container CMS URL, defaults to `http://cms:4000` |

### Backend (`Backend/.env`)

| Variable | Required | Description |
| --- | --- | --- |
| `SUPABASE_URL` | yes | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | Service role key. Treat this as a secret, do not expose it in the browser |
| `FRONTEND_URL` | no | Frontend origin for CORS, defaults to `http://localhost:3000` |
| `SEED_ADMIN_EMAIL` | no | Email added to the admin allowlist when seeding |

## Local development

### Backend

```bash
cd Backend
bun install
bun run seed     # seed default content once
bun run dev      # start with watch mode
```

The seed is idempotent. It skips if `admin_users` already has a row, so
re-running it never duplicates or overwrites content.

### Frontend

```bash
cd Frontend
npm install
npm run dev
```

Open `http://localhost:3000`. The admin area is behind Supabase auth and only
lets allowlisted emails through. Add your email as `SEED_ADMIN_EMAIL` in
`Backend/.env` before seeding so you can log in.

## Docker

Two compose files. Run each from its own directory.

### Backend

```bash
cd Backend
docker compose up -d --build
```

Listens on `4000`. Uses `Backend/docker-compose.yml`.

### Frontend

```bash
cd Frontend
docker compose up -d --build
```

Listens on `3000`. Uses `Frontend/docker-compose.yml`.

Uploaded images live in a named Docker volume called `ravedeprinz_uploads`,
mounted at `/app/public/uploads`. The volume is shared across container
recreates, so images survive rebuilds.

Deployment uses the standalone Next.js output. Nginx on the host proxies
`ravedeprinz.me` to the frontend container. Do not point nginx directly at the
upload volume. `/app/public/uploads` only exists inside the container, so
nginx must proxy `/uploads/` to Next.js on port `3000`.

## Content model

The admin UI edits these tables, all scoped to `public`:

- `site_settings`, `home_content`, `home_navigation` for the home page
- `about_content`, `skills`, `work_entries`, `education_entries` for about and work
- `projects` for the project list
- `notes` for the note list
- `now_current`, `now_attention`, `now_history` for the now page
- `admin_users` for the login allowlist

See `Backend/supabase/schema.sql` for the full schema. The seed content lives
in `Backend/seed-content.ts`.

## Notes (ravedeprinz.me/notes)

The notes section is the personal writing part of the site. It reads like a
small Medium or Substack: a list of posts, each with a tag, author, publish
date, reading time, and a cover image. The list is the archive, the detail
page is the essay.

Each note is a single long-form page. The body supports a light subset of
markdown: paragraphs, headings, lists, bold, italics, and inline images.
Every article shows a reading progress bar, a preview card that mirrors how
the post looks when shared, and share links for the canonical URL. Open Graph
and Twitter metadata are generated from the note title, subtitle, and cover
image, so pasting a link into Slack or X produces a proper card.

Posts are stored in the `notes` table and managed from `/admin/notes`. The
`subtitle`, `author`, and `image_url` columns drive the list page and the
social preview, while the `body` column is the article itself.

## Notes

- The upload endpoint accepts images up to 5 MB and validates the real file
  type from magic bytes, not the extension.
- Auth uses Supabase. Login is handled by `app/auth/callback/route.ts`.
- The frontend build produces the standalone output required by the
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
