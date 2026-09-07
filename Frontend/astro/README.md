# ravedeprinz — Astro scaffold (Phase 1)

Parallel rebuild of the Next.js frontend. Runs beside it on :3100;
nginx keeps sending production traffic to :3000 until routes cut over.

## Commands

```bash
npm install
npm run dev     # :3100
npm run build
npm run preview # :3100
```

## Content API (Phase 2)

Pages fetch live content from the Bun API through `src/lib/cms.ts`
(transport in `src/lib/api.ts`, never PostgreSQL directly):

| Variable             | Default                   |
| -------------------- | ------------------------- |
| `CMS_API_URL`        | `http://127.0.0.1:4100`   |
| `PUBLIC_CMS_API_URL` | (browser fallback)        |
| `CMS_API_TIMEOUT_MS` | `8000`                    |

When the API is unreachable, pages render their intentional static
fallback from `src/data/*`. `live* === null` always means
CMS-unreachable — the code never invents CMS data.

## Status

- Shell + global styles ported; menu choreography recreated with
  Svelte 5 + Astro View Transitions (see `src/layouts/Base.astro`,
  `src/components/Menu.svelte`).
- Pages are static renders over `src/data/*` fallback content.
- `/login` posts email + password to the Bun API (`LoginForm` island,
  direct browser → Bun with cookies); no Google button in this phase.
- `/admin` is server-gated: unauthenticated → `/login`, non-admin →
  403 panel, expired/unreachable CMS → offline panel. Full content
  management arrives in Phase 4.
- `/notes/[slug]` articles and remaining dynamic behavior land in
  later phases (see repo root plan).

## Conventions

- Same visual language, same class names, same copy as production.
- Svelte islands only where interaction requires it
  (`Menu` always, `HudPanel` on `client:visible`).
- `prefers-reduced-motion` is respected for transitions and entrances.
