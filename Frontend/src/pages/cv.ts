import type { APIRoute } from 'astro';
import { serverApiBase } from '../lib/api';
import { fetchSite } from '../lib/cms';
import { cached } from '../lib/requestCache';
import { cvDownloadFilename } from '../data/site';

// Stable public URL for the CV.
//
// Uploads are stored under hashed names, so the raw /uploads/<hash>.pdf URL
// would also become the name a browser saves. This route reads the current
// cv_url from the CMS, proxies those bytes, and sets Content-Disposition to
// the configured filename — so the link stays /cv when the CV is replaced,
// and the saved name stays clean. Storage on disk is untouched.

export const prerender = false;

// Same budget as the other CMS calls (lib/api.ts CMS_API_TIMEOUT_MS).
const UPSTREAM_TIMEOUT_MS = 8000;

// A single upload filename, and only a .pdf one. The path comes from the
// database, so it is validated before it is ever used as a URL segment.
const UPLOAD_PATH = /^\/uploads\/([^/]+)$/;
const UPLOAD_NAME = /^[A-Za-z0-9._-]+\.pdf$/;

function notFound(): Response {
  return new Response('Not found', {
    status: 404,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-Content-Type-Options': 'nosniff' },
  });
}

export const GET: APIRoute = async ({ locals }) => {
  const site = await cached(locals, 'site', fetchSite);
  const stored = site?.cv_url?.trim() ?? '';

  const match = UPLOAD_PATH.exec(stored);
  if (!match) return notFound();
  let name: string;
  try {
    name = decodeURIComponent(match[1]!);
  } catch {
    return notFound();
  }
  if (!UPLOAD_NAME.test(name)) return notFound();

  // Fetch from the API origin rather than the public one: in production
  // nginx sends /uploads/* to Bun, so requesting the public path from the
  // Astro server would be a needless round trip to itself.
  let upstream: Response;
  try {
    upstream = await fetch(`${serverApiBase().replace(/\/$/, '')}/uploads/${encodeURIComponent(name)}`, {
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
  } catch {
    return notFound();
  }
  if (!upstream.ok || !upstream.body) return notFound();

  return new Response(upstream.body, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${cvDownloadFilename}"`,
      // Short: the URL never changes, so a re-upload would otherwise be
      // served stale from a cache. Revalidation is cheap here.
      'Cache-Control': 'public, max-age=300, must-revalidate',
      'X-Content-Type-Options': 'nosniff',
    },
  });
};
