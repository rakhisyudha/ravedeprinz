# ravedeprinz

Personal site and CMS for [ravedeprinz.me](https://ravedeprinz.me). A
kinetic, editorial interface inspired by the angular energy of Persona 5
Royal, paired with a hand-rolled backend — no ORM, no framework auth, no
SaaS CMS dependency. Both halves run in Docker, or bare metal if you
prefer.

```
Astro + Svelte 5   (:3100, published as :3000 via compose)
  ↓ HTTP only
Bun API            (:4100)
  ↓ SQL
PostgreSQL 16      (host :5433, container :5432)
```

```
Frontend/     Astro pages, Svelte islands, layouts, styles, SEO,
              per-note OG image generation
Backend/      Bun HTTP server, custom session auth, CMS writes,
              uploads, migrations, seeds, isolated test database
```

The frontend never touches PostgreSQL. All content — public reads,
authentication, admin writes, uploads — flows through the Bun API over
HTTP. The backend owns sessions, authorization, CMS writes, file
storage, and seeding.

---

## Table of contents

- [Stack](#stack)
- [Repository layout](#repository-layout)
- [Architecture](#architecture)
- [Frontend: Astro + Svelte islands](#frontend-astro--svelte-islands)
- [Page transitions (View Transitions API)](#page-transitions-view-transitions-api)
- [Backend: Bun + raw SQL](#backend-bun--raw-sql)
- [Auth model](#auth-model)
- [Content model](#content-model)
- [Migrations](#migrations)
- [Design system](#design-system)
- [SEO and the OG image pipeline](#seo-and-the-og-image-pipeline)
- [Admin control panel](#admin-control-panel)
- [Local development](#local-development)
- [Docker deployment](#docker-deployment)
- [Production environment](#production-environment)
- [Operational notes](#operational-notes)

---

## Stack

**Frontend**

| Concern | Choice |
| --- | --- |
| Framework | Astro 7 (`output: 'server'`, `@astrojs/node` standalone) |
| Islands | Svelte 5 (via `@astrojs/svelte`) |
| Styling | Hand-written CSS (`global.css`) + Tailwind reset only |
| Fonts | Three FOT families, self-hosted: Skip Std B (decorative), Rodin Pro (display/UI), New Rodin Pro (mono UI). Instrument Serif loads from Google Fonts for body reading copy. |
| Transitions | Browser-native View Transitions API via `<ClientRouter />` |
| OG image | `satori` + `@resvg/resvg-js` at request time |

**Backend**

| Concern | Choice |
| --- | --- |
| Runtime | Bun 1.x (`oven/bun:1.4-alpine`) |
| Web server | `Bun.serve` directly (no Hono/Express) |
| Database | PostgreSQL 16, raw SQL via `bun:SQL` |
| Password hashing | `Bun.password` (bcrypt) |
| Session tokens | 256-bit CSPRNG, SHA-256 stored, HttpOnly cookie |
| Uploads | Filesystem (`/data/uploads` in Docker, configurable) |
| Migrations | Forward-only `.sql` files, applied in filename order |
| Tests | `bun test` against an isolated test database |

**Explicitly not used:** ORM, Supabase, NextAuth/Auth.js, Tailwind UI,
shadcn, any framework auth provider, any CSS-in-JS runtime. The whole
point of the project is to keep the dependency surface legible.

---

## Repository layout

```
Frontend/
  astro.config.mjs           # server output + node adapter + svelte
  tailwind.config.mjs        # reset only, no design tokens
  postcss.config.cjs
  Dockerfile
  docker-compose.yml         # external webnet, host port 3000 → 3100
  public/
    fonts/                   # FOT-Skip, FOT-Rodin, FOT-NewRodin .otf
    fonts-instrument-serif/  # Google Fonts CSS shim
  src/
    env.d.ts
    middleware.ts            # /admin/* server-side gate
    layouts/
      Base.astro             # html shell + global view-transition CSS + footer
      Admin.astro            # wraps Base, hides public chrome
    pages/
      index.astro            # home
      about.astro            # /about
      work.astro             # /work (CMS-driven record list)
      projects.astro         # /projects
      notes.astro            # /notes list
      notes/[slug].astro     # note detail, full SEO + JSON-LD
      notes/[slug]/opengraph-image.ts   # 1200x630 social card
      now.astro              # /now
      login.astro            # /login (uses AuthChrome, not Menu)
      admin/                 # /admin/* control panel pages
      sitemap.xml.ts         # generated sitemap
      robots.txt.ts          # generated robots.txt
    components/
      AuthChrome.astro       # minimal site header for /login
      HudPanel.svelte        # right-side HUD panel on home
      LoginForm.svelte       # client island for /login
      LogoutButton.svelte
      Menu.svelte            # primary navigation + INDEX scene
      NoteBody.astro         # tiny markdown subset renderer
      PageHead.astro         # shared page header (// LABEL / number + title + intro)
      ReadingProgress.svelte # reading progress bar on /notes/[slug]
      ShareBar.svelte        # share buttons on /notes/[slug]
      admin/                 # AdminNav, AdminDashboard, AdminNotes, etc.
    data/
      site.ts                # brand fallback + nav fallback + projectImages
      content.ts             # static content fallback (work, projects, notes)
    lib/
      api.ts                 # CMS transport with three-state result
      cms.ts                 # typed fetcher per content type
      readingTime.ts         # word count → minutes
      seo.ts                 # canonical URLs, OG image URLs, description cleanup
      welcome.ts             # admin greeting copy
    styles/
      global.css             # the whole design system

Backend/
  Dockerfile                 # bun:alpine, CMD = migrate && seed && api
  docker-compose.yml         # db + api, webnet, host 4100→4100, 5433→5432
  src/
    index.ts                 # entrypoint: migrate() → Bun.serve
    migrate.ts               # standalone CLI wrapper around migrate()
    config.ts                # env-driven config object
    db.ts                    # SQL client + migrate() (forward-only, idempotent)
    errors.ts                # JSON error responses, CORS headers
    seed.ts                  # idempotent public content seed
    seed-auth.ts             # idempotent owner seed (reads AUTH_SEED_*)
    types.ts                 # shared API response shapes
    auth/
      password.ts            # hash/verify via Bun.password
      tokens.ts              # CSPRNG + SHA-256 helpers
      session.ts             # cookie parsing, createSession, requireAuth/requireAdmin
    routes/
      auth.ts                # /api/auth/{login,logout,session}
      content.ts             # /api/content/{site,home,about,work,projects,notes,now}
      admin.ts               # /api/admin/* (CMS writes + /admin/me)
      files.ts               # /uploads/* public file serving
    services/
      upload.ts              # extension allowlist + magic-byte validation
      content.ts             # SELECT queries for /api/content/*
      auth.ts                # SELECT/INSERT for users + sessions
      users.ts               # admin user management
      audit.ts               # audit_logs writer
      admin.ts               # CMS write queries (UPDATE/INSERT)

  migrations/
    001_content_schema.sql   # site_settings, home, about, work, projects, notes, now
    002_auth_schema.sql      # users, sessions
    003_user_roles.sql       # admin_users
    004_audit_logs.sql       # append-only audit trail

  tests/
    *.test.ts                # bun test, isolated DB per file
```

---

## Architecture

The site is intentionally split into two deployable processes that
talk only over HTTP. This means the frontend bundle never holds a
database URL, never holds a password, and never runs SQL — and the
backend can be redeployed, scaled, or replaced without touching the
frontend.

**Process boundaries**

```
┌──────────────────────────┐         ┌─────────────────────────┐
│  Astro (Node standalone) │  HTTP   │   Bun (Bun.serve)       │
│  Port 3100 (host 3000)   │ ──────▶ │   Port 4100             │
│                          │         │                         │
│  - Renders pages         │         │  - Auth (sessions)      │
│  - Hydrates islands      │         │  - CMS reads/writes     │
│  - Generates OG images   │         │  - Serves /uploads/*    │
│  - Calls CMS via fetch() │         │  - Migrations on boot   │
└──────────────────────────┘         └────────────┬────────────┘
                                                  │ SQL
                                                  ▼
                                       ┌──────────────────────┐
                                       │ PostgreSQL 16        │
                                       │ Port 5432 (host 5433)│
                                       └──────────────────────┘
```

**Three-state API result**

`Frontend/src/lib/api.ts` wraps every backend call. It never throws; it
returns one of three discriminated states so pages can degrade
gracefully:

```ts
type ApiResult<T> =
  | { status: 'ok'; data: T }                    // live CMS data
  | { status: 'not-found' }                       // CMS answered: no such content
  | { status: 'unavailable'; message: string };   // CMS down, timed out, errored
```

A page like `notes.astro` does:

```ts
const liveNotes = await fetchNotes();
const notes = liveNotes?.notes ?? fallbackNotes.map(/* normalize */);
```

So when the backend is reachable, edits in `/admin` appear on the
next reload. When it isn't, the page falls back to the static content
shipped with the frontend bundle. The site never invents CMS data and
never shows a broken-looking page because Postgres restarted.

**SSR vs islands**

`output: 'server'` means Astro renders every request on the server.
Pages opt into prerendering individually (currently only `/login`,
which is fully static). Pages fetch CMS data in the frontmatter, which
runs on the server, so the browser never sees an intermediate loading
state for content it should already have.

Interactive bits hydrate as Svelte islands:

- `Menu.svelte` — `client:load` (mounts immediately, owns scroll + nav state)
- `LoginForm.svelte` — `client:load` (form + error state)
- `HudPanel.svelte` — `client:visible` (only mounts when scrolled into view)
- `ReadingProgress.svelte` — `client:load` (scroll-driven progress bar)
- `ShareBar.svelte` — `client:load` (clipboard share buttons)
- All `/admin/*` components — `client:load` (they need interactivity)

Everything else (typography, layout, the note detail page, the home
hero) is plain Astro HTML — zero JS shipped for those routes.

---

## Frontend: Astro + Svelte islands

### Layouts

- **`Base.astro`** — the public site shell. Sets `<head>` metadata,
  includes `<ClientRouter />` for view transitions, optionally renders
  `<Menu>` and `<footer class="site-footer">`, and registers the
  global view-transition CSS keyframes (see below).
- **`Admin.astro`** — wraps `Base` with `header={false} footer={false}`
  and gates content on `Astro.locals.adminGate` (set by middleware).
  Handles three states inline: unreachable CMS (503), authenticated
  non-admin (403), authenticated admin (renders the panel).

### Navigation: `Menu.svelte`

The primary navigation is a fixed `.site-header` plus a fullscreen
**scene** that wipes in when `[ INDEX ]` is tapped.

- **State**: `open` (boolean), `scrolled` (boolean, toggles compact
  header at >24px scroll), `preview` (the current route label, shown
  as huge background type in the scene).
- **The wipe**: uses Svelte transitions with a custom `clip-path`
  function driven by an `easeInOutQuint` curve (matches the previous
  `[0.76, 0, 0.24, 1]` "P5" easing). The same curve is reused for the
  page transition between routes, which is what makes them feel like
  one motion language.
- **Stagger**: each scene row appears as a group; numerals slide in
  14px from the left, labels 36px from the left, on a 40ms cascade
  starting at 120ms after open. Closing is delayed so the trigger can
  travel back to its starting position.
- **Reduced motion**: every animation is disabled under
  `prefers-reduced-motion: reduce`.

### `/login`: `AuthChrome.astro`

The login page disables the full `Menu` (because its nav scene is
irrelevant inside the auth flow) and renders a minimal `AuthChrome`
component instead. `AuthChrome` re-uses the exact same CSS classes
(`.site-header`, `.site-mark`, `.menu-trigger`, `.bracket`) so the
header and the trigger pick up the same responsive overrides as the
rest of the site. The trigger reads `[ HOME ]` and links to `/`.

The shared `<footer class="site-footer">` renders below the login
card via `Base.astro`, so `/login` closes with the same divider,
typography, and `◆` mark as every other page.

### Admin gate: `src/middleware.ts`

`/admin/*` is gated server-side before the layout renders:

1. The middleware reads the `session` cookie off the incoming request.
2. It calls `/api/auth/session` on the Bun backend with that cookie.
3. If unauthenticated → 302 to `/login`.
4. If authenticated → attach `{ reachable, user }` to
   `Astro.locals.adminGate` and continue.
5. If the backend is unreachable → attach `{ reachable: false, user: null }`
   so `Admin.astro` can render its offline panel.

The Bun API re-verifies the session on every `/api/admin/*` call. The
middleware is purely a UX gate — it cannot be bypassed to expose admin
functionality because the API enforces it independently.

### Markdown subset: `NoteBody.astro`

The note body is stored as markdown but the renderer is intentionally
narrow:

- Headings (`##`, `###`), paragraphs, bold (`**`), italics (`*`),
  unordered lists (`-`), inline images.
- Anything else (code blocks, tables, footnotes, raw HTML) is
  intentionally not supported — the body is a long-form essay, not a
  documentation surface.

The renderer escapes all input by default and only emits a small allowlist
of HTML elements.

---

## Page transitions (View Transitions API)

`Base.astro` includes `<ClientRouter />` from `astro:transitions`, which
mounts the browser's native View Transitions API on Astro's client-side
router. The keyframes that shape the actual motion live in a
`<style is:global>` block inside `Base.astro`:

```css
::view-transition-old(root) {
  animation: page-wipe-out 0.34s cubic-bezier(0.76, 0, 0.24, 1) both;
}
::view-transition-new(root) {
  animation: page-wipe-in 0.4s cubic-bezier(0.76, 0, 0.24, 1) 0.12s both;
}

@keyframes page-wipe-out {
  from { clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%); }
  to   { clip-path: polygon(0 0, 12% 0, 0 100%, 0 100%); }
}

@keyframes page-wipe-in {
  from { clip-path: polygon(100% 0, 112% 0, 112% 100%, 100% 100%); }
  to   { clip-path: polygon(0 0, 112% 0, 112% 100%, 0 100%); }
}

@media (prefers-reduced-motion: reduce) {
  ::view-transition-old(root),
  ::view-transition-new(root) { animation: none; }
}
```

**What the motion does**

The outgoing page is sheared off along a hard ~12% diagonal cut
traveling right→left over 0.34s. The incoming page's matching
diagonal edge sweeps in from the right over 0.4s with a 0.12s
lead-in. The whole swap lands inside 520ms.

**Why a clip-path wipe and not a slide or fade**

- It reads as a panel transformation, which matches the site's clip-
  path vocabulary (`.cut`, `.menu-scene::before`, `.auth-card`,
  `.project-frame`).
- The diagonal direction echoes the `skewX(-30deg)` red stripes that
  show up everywhere as structural dividers.
- `transform: translateY(...)` (the previous implementation) felt
  generic and was the most common complaint in user testing.

**The view-transition canvas is pinned to brand black**

`global.css` sets `background: var(--black)` on `::view-transition`
so a route swap can never expose browser-default white between the
exit and enter snapshots:

```css
::view-transition,
::view-transition-group(root),
::view-transition-old(root),
::view-transition-new(root) {
  background: var(--black);
}
```

**Reduced motion**

The `prefers-reduced-motion` block kills both animations entirely.
Routes still swap, just without choreography. No layout shift, no
flash.

**Where to tune the motion**

All the timing and shape lives in the one block at the top of
`Base.astro`. The easing curve `cubic-bezier(0.76, 0, 0.24, 1)` is
the same one `Menu.svelte` uses for the scene wipe — that's
deliberate, so the two motion languages stay coupled.

---

## Backend: Bun + raw SQL

### Entry point and boot order

The container's `CMD` is:

```sh
bun src/migrate.ts && bun src/seed.ts && bun src/seed-auth.ts && bun src/index.ts
```

- **`migrate.ts`** — applies any new `migrations/*.sql` files in
  filename order. Idempotent: tracks applied files in
  `schema_migrations`. Safe to run on every boot.
- **`seed.ts`** — populates the public content tables from
  `Backend/src/seed.ts` if they're empty. Idempotent — never
  overwrites existing rows.
- **`seed-auth.ts`** — provisions the owner account from the
  `AUTH_SEED_EMAIL` / `AUTH_SEED_PASSWORD` env vars. Idempotent —
  skips quietly if those vars aren't set, skips again if the user
  already exists, and never logs the password.
- **`index.ts`** — calls `migrate()` (redundant with `migrate.ts`,
  also idempotent) then starts `Bun.serve`.

### Routing

There is no router framework. `index.ts` reads `url.pathname` and
dispatches to one of four routers:

```
/api/content/*  →  contentRouter  (public reads)
/api/auth/*     →  authRouter     (login, logout, session)
/api/admin/*    →  adminCmsRouter (writes; gated by requireAuth/requireAdmin)
/api/admin/me   →  adminRouter    (used by middleware to verify sessions)
/uploads/*      →  filesRouter    (public file serving)
```

Every router handler ends by calling `errorResponse(...)` on failure
so the response shape is consistent across the API.

### Session lifecycle

```
login            createSession(userId)        // CSPRNG → SHA-256 → INSERT
                  ↓
                  Set-Cookie: session=<raw>; HttpOnly; SameSite=Lax; 30d
                  ↓
each /api/*      authenticate(request)         // parse cookie → SHA-256 → SELECT
                  ↓
                  { authenticated, user }
                  ↓
logout           revokeSession(request)       // UPDATE sessions SET revoked_at
                  ↓
                  Set-Cookie: session=; Max-Age=0
```

**Why SHA-256 the token before storing it**

A database read alone (e.g. a backup, a compromised replica, a SQL
log) cannot impersonate a session. The raw token only ever travels
inside the HttpOnly cookie; the database only ever sees its hash.

**Why 256 bits from a CSPRNG**

`node:crypto.randomBytes(32)` is a CSPRNG call. The chance of two
sessions colliding is astronomically lower than any other failure mode
in the system. Shorter tokens would be a security regression; longer
tokens would just bloat the cookie.

### Uploads

`POST /api/admin/uploads` (gated by `requireAdmin`) accepts multipart
form data. The handler:

1. Reads the first 16 bytes and validates the magic bytes against an
   allowlist of real image types (JPEG, PNG, WebP, GIF). The
   extension is ignored for validation — only the bytes matter.
2. Enforces a 5 MB size cap.
3. Generates a randomized filename (no original filename preserved).
4. Writes to `UPLOADS_DIR` (defaults to `/data/uploads` in Docker).

`GET /uploads/*` is served by `filesRouter` with an extension
allowlist, traversal guard, `Cache-Control: public, max-age=31536000,
immutable`, and `X-Content-Type-Options: nosniff`.

### CORS

CORS is set by the `corsHeaders` helper in `errors.ts`. The
production deployment uses same-origin (nginx serves the frontend and
proxies `/api/*` and `/uploads/*` to the backend), so CORS is only
relevant in local dev.

---

## Auth model

**Login flow**

1. Browser POSTs `{ email, password }` to `/api/auth/login`.
2. Backend looks up the user, verifies with `Bun.password.verify`.
3. On success: `createSession(userId)` → raw token goes into the
   `session` cookie, hash goes into the `sessions` table.
4. Response is `200` with the user object; the browser follows the
   redirect to `/admin`.

**Authorization tiers**

- `authenticate(request)` → `{ authenticated, user }`. Used by
  `/api/auth/session`.
- `requireAuth(auth)` → `user | Response(401)`. Used by
  `/api/admin/me`.
- `requireAdmin(auth)` → `user | Response(401) | Response(403)`.
  Used by every `/api/admin/*` write.

**Cookie attributes**

- `HttpOnly` — never readable from JavaScript.
- `Path=/` — sent on every request.
- `SameSite=Lax` — protects against most CSRF while allowing top-level
  navigations.
- `Secure` — added automatically when `NODE_ENV=production` or
  `COOKIE_SECURE=true`.
- `Max-Age=2592000` — 30 days. Sliding refresh is intentionally not
  implemented; logout is explicit.

**Why custom auth instead of an off-the-shelf library**

The whole point of the project is to keep the trust boundary legible.
A 100-line `session.ts` with one helper per concern is easier to audit
than any framework's auth stack, and it doesn't pull in dependencies
that could themselves become a CVE.

---

## Content model

All content lives in PostgreSQL. Public reads (`/api/content/*`) and
admin writes (`/api/admin/*`) both go through the Bun API — Astro
never holds a DB connection.

**Tables** (see `Backend/migrations/001_content_schema.sql` for the
full DDL):

| Table | Purpose |
| --- | --- |
| `site_settings` | site name, footer identity |
| `home_content` | hero headline, lede, CTA, HUD panel copy |
| `home_navigation` | the index list on the home page |
| `about_content` | bio, photo, quote, story body |
| `skills` | categorized skill list |
| `work_entries` | one row per role (date_label, description, stack) |
| `education_entries` | one row per institution |
| `projects` | title, description, year, status, stack, live_url, source_url, image_url |
| `notes` | slug, title, body (markdown), subtitle, tag, author, image_url, published_at |
| `now_current`, `now_attention`, `now_history` | the /now page |
| `users`, `sessions`, `admin_users` | auth |
| `audit_logs` | append-only mutation trail |

**Normalization at the frontend boundary**

The CMS types use one naming convention (`description`, `date_label`,
`status`, `live_url`, `source_url`); the static fallback files in
`Frontend/src/data/content.ts` use a shorter one (`desc`, `date`,
`type`, `link`, `github`). `work.astro` and `projects.astro` map
fallback rows to the CMS shape before rendering, so the template
code only ever sees the canonical names. This is the contract that
was fixed in Phase 6.3 — every page now references the canonical
fields directly.

---

## Migrations

**Forward-only, applied in filename order.**

```
migrations/
  001_content_schema.sql
  002_auth_schema.sql
  003_user_roles.sql
  004_audit_logs.sql
```

`db.ts::migrate()` is the only entry point:

1. Creates `schema_migrations(version, applied_at)` if missing.
2. Reads `select version from schema_migrations`.
3. Lists `migrations/*.sql` sorted alphabetically.
4. For each file not in the applied set: runs the SQL as one
   `sql.unsafe(...)` statement, then `insert into schema_migrations`.
5. Uses `on conflict do nothing` so two concurrent boots (or parallel
   test files) can't double-apply.

**Rules for adding a migration**

- Never edit a migration that has already been applied in production.
  Add a new file (e.g. `005_add_x.sql`).
- One logical change per file.
- Don't depend on the exact Postgres version in the SQL — use
  portable syntax.
- Use `if not exists` where idempotency matters, but rely on the
  applied-set tracking for the primary gate.

---

## Design system

The site has five colors. They appear in this order of frequency:

| Token | Hex | Used for |
| --- | --- | --- |
| `--black` | `#0d0d0d` | Background, page chrome, body |
| `--white` | `#ffffff` | Display type, primary text |
| `--red` | `#d92323` | Structural accents, brand `r`, active state, CTAs |
| `--dark-red` | `#732424` | Box shadows on red elements (offset for "P5" depth) |
| `--gray` | `#7b7b7b` | Eyebrow labels, metadata, secondary copy |

**Typography**

| Family | Role | Weight | Source |
| --- | --- | --- | --- |
| Skip Std B | Decorative headlines (rare) | — | `FOT-Skip-Std-B.otf` |
| Rodin Pro | Display (`.display`), headlines, hero, titles | 400 / 700 | `FOT-Rodin-Pro-{M,B}.otf` |
| New Rodin Pro | UI labels, eyebrows, mono metadata | 400 | `FOT-NewRodin-Pro-M.otf` |
| Instrument Serif | Reading copy (note body, about quote) | 400 | Google Fonts (serif fallback chain) |
| Space Grotesk | Fallback body (used in Admin) | — | system fallback |

**Geometric vocabulary**

The site reuses a small set of shape primitives over and over. Each
new component should pick from this list rather than inventing new
geometry:

- **`.cut`** — `clip-path: polygon(0 0, calc(100% - 28px) 0, 100% 28px, 100% 100%, 28px 100%, 0 calc(100% - 28px))` — the standard 28px chamfered rectangle.
- **`.cut-small`** — same idea, 12px corners. For badges and chips.
- **`skewX(-30deg)`** — the standard diagonal for red dividers and
  stripes. Echoes everywhere: `.site-header::after`, `.stripe`,
  `.home-rule-label i`, `.now-recent p i`, `.headline-meta i`.
- **Angled clip on hero panels** — `.hud-panel` uses an asymmetric
  polygon with rotating corners; the right column gets a
  `rotate(7deg)` slash (`profile-slash`).
- **Skewed transform on cards** — `.lift:hover` translates `(-6px,
  -6px) skewX(-1deg)` with a hard red shadow at `12px 12px 0`. This
  is the canonical "interactive" state for every card.

**Background texture**

The body has a fixed pseudo-element overlay:

```css
body::before {
  content: '';
  position: fixed; inset: 0; z-index: 60; pointer-events: none;
  opacity: .055;
  background-image: radial-gradient(#fff .55px, transparent .55px);
  background-size: 7px 7px;
  mix-blend-mode: screen;
}
```

A 7×7 dot grid at 5.5% opacity. It only shows on the brand-black
background and never interferes with content. The same texture
re-appears on `.site-header::before`, `.hud-number`, and
`.hud-noise-top`/`-bottom`.

**Angular interaction states**

Every interactive element follows the same recipe:

```css
button, a {
  transition: transform .16s cubic-bezier(.65, 0, .35, 1),
              filter .16s ease,
              background-color .16s ease,
              border-color .16s ease,
              color .16s ease;
}
button:active, a:active {
  transform: scale(.96);
  filter: brightness(1.18);
}
```

The `cubic-bezier(.65, 0, .35, 1)` is the same easing curve used for
the wipe transitions. Hovering on a card lifts it by `(-6px, -6px)`
and reveals the red accent border.

**The `.touch-target` pattern**

Mobile tap targets wrap themselves in a `::after` pseudo-element
that fills the box with `background: var(--red)` at 12% opacity on
press, scaled in from 0.6. This gives every tap a uniform red flash
without bleeding the tap color into the actual element styling.

**Responsive philosophy**

Two breakpoints for the site:

- **≤ 900px** — tablet. Header compacts from 78px to 56px; the
  `header-state` (middle route label) hides; `.home-page` collapses
  to a single column; note thumbs shrink.
- **≤ 600px** — phone. Header compacts further to 50px; brand
  typography shrinks; the menu trigger reduces padding and letter-
  spacing. The note detail page becomes a single-column reading view.

Desktop and mobile are deliberately treated as separate compositions.
You will not find "looks fine at both sizes" code anywhere — every
component makes a real decision about its mobile shape.

---

## SEO and the OG image pipeline

### Per-route SEO

`Frontend/src/lib/seo.ts` centralizes canonical URLs, OG image URLs,
and description cleanup. Pages that need SEO emit `<Fragment
slot="head">` from `Base.astro`, which renders inside `<head>` before
`<ClientRouter />`.

The note detail page is the most complete:

- `<link rel="canonical">`
- `og:title`, `og:description`, `og:type=article`, `og:url`,
  `og:site_name`
- `article:published_time`, `article:modified_time`, `article:author`,
  `article:tag`
- `og:image` (1200×630), `og:image:width`, `og:image:height`,
  `og:image:alt`
- Twitter card (`summary_large_image`) mirroring the OG metadata
- JSON-LD `BlogPosting` schema as inline `application/ld+json`

### Generated OG images

`Frontend/src/pages/notes/[slug]/opengraph-image.ts` is an Astro
endpoint that returns a 1200×630 PNG for each note. It's a Satori
pipeline:

1. `satori(...)` — turns a JSX-shaped object into an SVG, using
   `Rodin Pro` (regular + bold) loaded from disk.
2. `new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } })` —
   rasterizes the SVG to PNG at exactly 1200px wide.
3. Returns the PNG with `Cache-Control: public, max-age=3600`.

The card layout is:

```
┌──────────────────────────┬──────────────┐
│  // TAG                  │              │
│                          │              │
│  What Now?               │   COVER      │
│                          │   ARTWORK    │
│  excerpt in muted gray   │  (untouched) │
│                          │              │
│  RAVEDEPRINZ.ME / NOTES  │              │
└──────────────────────────┴──────────────┘
```

The right panel renders the note's `image_url` as `object-fit: cover`
with no border. The left panel is laid out to read like a cropped
fragment of the note detail page itself — same `// TAG` eyebrow, same
display-weight title, same muted reading copy, same site-name
footer. A 1px `rgba(217,35,35,0.55)` divider marks the seam between
type and image; that's the only red shape on the card.

The endpoint is `prerender = false` so every request resolves the
note from the CMS — a freshly-published note gets its OG image on the
next request with no rebuild.

### Sitemap and robots

- `sitemap.xml.ts` — emits a `urlset` containing the six static pages
  plus every note's `/notes/[slug]` (using its `published_at` as
  `lastmod`). Falls back gracefully if the CMS is down.
- `robots.txt.ts` — allows everything, points at the sitemap.

---

## Admin control panel

`/admin/*` is the CMS. It mounts its own chrome (different from the
public site) and is gated by the middleware.

**Pages**

| Route | Purpose |
| --- | --- |
| `/admin` | Dashboard with content health + recent edits |
| `/admin/home` | Hero content, HUD panel copy, index list |
| `/admin/about` | Bio, photo, quote, story body |
| `/admin/work` | Work entries (add/edit/delete + reorder) |
| `/admin/projects` | Project entries with status, live/source URLs |
| `/admin/notes` | Notes with markdown body editor |
| `/admin/now` | Current / attention / history |
| `/admin/users` | Admin user management |
| `/login` | Sign-in (shared route, not under `/admin`) |

**Chrome**

The admin uses its own header (`.admin-header`) and navigation
(`.admin-nav`) styled in the same angular vocabulary but with
different proportions — taller header, no scroll-compact, yellow
active-tab color (`#f2d34f`) instead of red because the active state
needs to be unambiguous against a busy editing surface.

The `AdminWelcome` panel sits below the header and shows a
context-aware greeting driven by `Frontend/src/lib/welcome.ts`.

**Failure states**

Every admin page handles two failure modes inline:

- **403** — signed in but not an admin. Renders the same angular
  "DENIED" panel as the auth gate (`auth-denied`, with `403` stamp).
- **503** — backend unreachable. Renders the same panel with `503`
  stamp and a "give it a moment and try again" hint.

**Audit trail**

Every CMS write inserts a row into `audit_logs` (who, what table,
what action, when, before/after). The dashboard surfaces recent
entries.

---

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

Open `http://localhost:3100`. Sign in at `/login` with the seeded
owner account and open `/admin`. Unauthenticated `/admin/*` requests
redirect to `/login`.

### Environment variables

**Frontend (`Frontend/.env`, never commit real values):**

| Variable | Required | Description |
| --- | --- | --- |
| `PUBLIC_CMS_API_URL` | no | Browser-facing Bun API origin (defaults `http://localhost:4100`) |
| `CMS_API_URL` | no | Server-side Bun API origin for SSR (defaults `http://localhost:4100`) |
| `SITE_URL` / `PUBLIC_SITE_URL` | no | Canonical origin for sitemap, robots, OG URLs, metadata |
| `CMS_API_TIMEOUT_MS` | no | Per-request timeout for CMS calls (defaults 8000) |

**Backend (`Backend/.env`, never commit):**

| Variable | Required | Description |
| --- | --- | --- |
| `PORT` | no | API port, defaults `4100` |
| `DATABASE_URL` | yes | PostgreSQL connection string |
| `FRONTEND_URL` | no | Frontend origin for CORS, defaults `http://localhost:3100` |
| `UPLOADS_DIR` | no | Upload storage, defaults `/data/uploads` in Docker |
| `AUTH_SEED_EMAIL` / `AUTH_SEED_PASSWORD` | no | Owner account provisioned by `seed-auth.ts` |
| `COOKIE_SECURE` | no | Force `Secure` cookie attribute outside production |

### Test database

`bun test` spins up an isolated Postgres database per test file. See
`Backend/tests/setup.ts` for the per-file schema reset. Tests never
touch the dev database.

---

## Docker deployment

Two compose files, run from their own directories.

### Backend

```bash
cd Backend
docker compose up -d --build
```

Migrations run first inside the API container on every boot, then
seeds, then the API. Seeds are idempotent — re-running `docker
compose up` after a crash or reboot just resumes where it stopped.

PostgreSQL on `5433` (volume `ravedeprinz_pgdata`), API on `4100`
(volume `ravedeprinz_uploads_v2` at `/data/uploads`).

The `db` and `api` services share a `webnet` Docker network so the API
resolves Postgres at `db:5432` regardless of the host port mapping.

### Frontend

```bash
cd Frontend
PUBLIC_CMS_API_URL=https://ravedeprinz.me \
SITE_URL=https://ravedeprinz.me \
PUBLIC_SITE_URL=https://ravedeprinz.me \
docker compose build web

docker compose up -d --build web
```

The frontend uses `external: true` on the same `webnet` so SSR
fetches resolve the Bun container by DNS as `http://api:4100`.

Build args bake origins into the image at build time — `PUBLIC_*`
gets inlined into the client bundle; `CMS_API_URL` is server-only.
Rebuild the image whenever any of these change.

The frontend container exposes `3100`; compose publishes it on host
port `3000` so nginx can `proxy_pass http://127.0.0.1:3000` without
further changes.

---

## Production environment

**Production `Backend/.env`:**

```bash
PORT=4100
DATABASE_URL=postgres://archive:STRONG_PASSWORD@db:5432/ravedeprinz
FRONTEND_URL=https://ravedeprinz.me
UPLOADS_DIR=/data/uploads
AUTH_SEED_EMAIL=you@example.com
AUTH_SEED_PASSWORD=STRONG_UNIQUE_PASSWORD
```

**Production frontend build args:**

```bash
PUBLIC_CMS_API_URL=https://ravedeprinz.me
SITE_URL=https://ravedeprinz.me
PUBLIC_SITE_URL=https://ravedeprinz.me
```

**Things to actually change vs the dev defaults**

- `DATABASE_URL` password — the `archive:archive` default is dev-only.
- `FRONTEND_URL` — must match the public HTTPS origin for the auth
  cookie + CORS check.
- `AUTH_SEED_*` — used only the first time `seed-auth.ts` runs. Safe
  to leave after that; the script is idempotent.

**Nginx config**

The compose files don't ship nginx. A typical reverse-proxy
configuration:

```nginx
server {
    server_name ravedeprinz.me www.ravedeprinz.me;
    client_max_body_size 6M;

    location /api/ {
        proxy_pass http://127.0.0.1:4100;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    location /uploads/ {
        proxy_pass http://127.0.0.1:4100;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_buffer_size 16k;
        proxy_buffers 4 32k;
        proxy_busy_buffers_size 64k;
    }

    listen 443 ssl;
    ssl_certificate     /etc/letsencrypt/live/ravedeprinz.me/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/ravedeprinz.me/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
}
```

Same-origin (`PUBLIC_CMS_API_URL=https://ravedeprinz.me`) means no
CORS, no cookie scoping, no second cert to maintain. nginx must
proxy the URL, never point at a container filesystem path for
`/uploads/`.

---

## Operational notes

**Persistent volumes**

- `ravedeprinz_pgdata` — PostgreSQL data. Survives container
  recreates.
- `ravedeprinz_uploads_v2` — CMS-uploaded files. Survives container
  recreates.
- `ravedeprinz_uploads` — the retired volume. Files are retained but
  it's no longer mounted. Migrate anything you still need, then
  drop it.

**Backups**

- `pg_dump` the database regularly. The test scripts under
  `Backend/tests/` show the schema.
- Snapshot `ravedeprinz_uploads_v2` — user content lives there.
- `.env` files should be backed up out-of-band (never committed).

**First-deploy recovery**

If the boot loop fails because migrations didn't run before seeds,
the volume `ravedeprinz_pgdata` will be partially populated. To
recover:

```sh
cd Backend
docker compose down
docker volume rm ravedeprinz_pgdata
docker compose up -d --build
```

That wipes the DB. The uploads volume is separate and is preserved.

**Seeding the owner account**

```sh
cd Backend
# Add to .env first:
#   AUTH_SEED_EMAIL=you@example.com
#   AUTH_SEED_PASSWORD=STRONG_PASSWORD
docker compose restart api
docker compose logs -f api
# expect: [seed-auth] created admin user you@example.com.
```

The seed is idempotent. Re-running with the same email never
overwrites the password; if you need to reset a password, do it
manually in `/admin/users`.

**Why there's no Supabase / no NextAuth / no ORM**

This project is small enough that a hand-rolled session table and a
single `Bun.password` call is more legible than a framework. The
entire auth stack is ~120 lines of TypeScript that any contributor
can audit in one sitting. The downside is that you maintain the
session table yourself; the upside is that there's no dependency
that can itself become a CVE.

**Why Astro server output instead of static + islands**

OG image generation is on-demand and per-note, which means
prerendering every note on every CMS edit isn't viable. Server
output lets pages fetch the CMS at request time, and Astro's island
architecture still ships zero JS for the routes that don't need it.

**Performance budget**

- The home page ships a single Svelte island (`HudPanel`,
  `client:visible`) and zero JS for the layout.
- The note detail page ships two islands (`ReadingProgress`,
  `ShareBar`) and the markdown renderer.
- The admin page ships roughly a dozen islands because it's an
  interactive surface — that's by design.

Total page-weight budget for the public site is intentionally small.
The biggest single asset is the Rodin Pro Bold OTF at ~140 KB, served
once per font-family.

---

## License

Personal project. All rights reserved by the owner. No license is
granted for reuse, redistribution, or modification by third parties.
