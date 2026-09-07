// Centralized transport for the Bun content API. Pages never fetch()
// directly and Astro never touches PostgreSQL: HTTP only, always.
//
// Result states keep three situations apart on purpose:
//   ok          — live CMS content, render it
//   not-found   — the CMS answered: this content does not exist
//   unavailable — CMS unreachable, timed out, or errored: the page may
//                 fall back to its intentional static content instead of
//                 inventing CMS data.

function resolveBase(): string {
  // Server: prefer runtime env (Docker/K8s inject these after the build;
  // import.meta is baked at build time). Browser: process is undefined,
  // so the baked public origin applies.
  const runtime = typeof process !== 'undefined' ? process.env.CMS_API_URL : undefined;
  return (
    runtime ??
    import.meta.env.CMS_API_URL ??
    import.meta.env.PUBLIC_CMS_API_URL ??
    'http://localhost:4100'
  );
}

// Server-only helper for middleware/endpoints that must honor runtime
// environment (e.g. CMS_API_URL=http://api:4100 inside Docker).
// Never import this from a client island.
export function serverApiBase(): string {
  return resolveBase();
}

const TIMEOUT_MS = Number(import.meta.env.CMS_API_TIMEOUT_MS ?? 8000);

export type ApiOk<T> = { status: 'ok'; data: T };
export type ApiMissing = { status: 'not-found' };
export type ApiDown = { status: 'unavailable'; message: string };
export type ApiResult<T> = ApiOk<T> | ApiMissing | ApiDown;

export async function apiGet<T>(path: string): Promise<ApiResult<T>> {
  const base = resolveBase();
  let res: Response;
  try {
    res = await fetch(`${base}${path}`, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch {
    return { status: 'unavailable', message: 'CMS unreachable' };
  }
  if (res.status === 404) return { status: 'not-found' };
  if (!res.ok) return { status: 'unavailable', message: `CMS responded ${res.status}` };
  try {
    return { status: 'ok', data: (await res.json()) as T };
  } catch {
    return { status: 'unavailable', message: 'CMS returned an invalid response' };
  }
}
