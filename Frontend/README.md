# ravedeprinz — frontend

Astro + Svelte islands. Server-rendered pages, zero-JS static content by
default, client islands only where interaction requires it (menu, HUD
count-up, login/logout, share controls, reading progress, admin editors).

## Commands

```bash
npm install
npm run dev     # :3100
npm run build
npm run preview # :3100
npm start       # serve dist/ (:3100)
```

## Content API

Pages fetch live content from the Bun API through `src/lib/cms.ts`
(transport in `src/lib/api.ts`, never PostgreSQL directly):

| Variable             | Default                   |
| -------------------- | ------------------------- |
| `CMS_API_URL`        | `http://localhost:4100`   |
| `PUBLIC_CMS_API_URL` | `http://localhost:4100`   |
| `CMS_API_TIMEOUT_MS` | `8000`                    |
| `SITE_URL` / `PUBLIC_SITE_URL` | `http://localhost:3000` |

Copy `.env.example` to `.env` for local development. When the API is
unreachable, pages render their intentional static fallback from
`src/data/*`. `live* === null` always means CMS-unreachable — the code
never invents CMS data.

## Conventions

- Same visual language, same class names, same copy as the design system.
- Svelte islands only where interaction requires it
  (`Menu` always, `HudPanel` on `client:visible`).
- `prefers-reduced-motion` is respected for transitions and entrances.
- Admin pages live under `src/pages/admin/` behind the server-side gate
  in `src/middleware.ts`; every `/api/admin/*` call is re-verified by Bun.

## Docker

```bash
docker compose up -d --build web   # :3000 on the host, :3100 inside
```

Build args `PUBLIC_CMS_API_URL`, `CMS_API_URL`, `SITE_URL`,
`PUBLIC_SITE_URL` bake API/origin URLs. Production overrides them
without source changes. nginx keeps proxying the host port as before.
