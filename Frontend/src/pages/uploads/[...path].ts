import type { APIRoute } from 'astro';
import { serverApiBase } from '../../lib/api';

// Same-origin proxy for CMS uploads. Bun owns validation, storage, and
// canonical headers; this route only relays so origin-relative
// /uploads/* URLs resolve on the Astro origin in dev and preview.
// (In production nginx routes /uploads/* to Bun before Astro.)
export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const apiBase = serverApiBase().replace(/\/$/, '');
  const segments = params.path;
  const parts = Array.isArray(segments) ? segments : typeof segments === 'string' ? [segments] : [];
  // Single safe segment only: mirrors Bun's traversal guard.
  if (parts.length !== 1 || !parts[0] || parts[0].includes('\0')) {
    return new Response('Not found', { status: 404 });
  }
  const name = parts[0];

  let upstream: Response;
  try {
    upstream = await fetch(`${apiBase}/uploads/${encodeURIComponent(name)}`);
  } catch {
    return new Response('Not found', { status: 404 });
  }
  if (!upstream.ok) {
    return new Response('Not found', { status: upstream.status === 415 ? 415 : 404 });
  }

  const headers = new Headers();
  for (const key of ['content-type', 'content-length', 'cache-control']) {
    const value = upstream.headers.get(key);
    if (value) headers.set(key, value);
  }
  headers.set('X-Content-Type-Options', 'nosniff');
  return new Response(upstream.body, { status: 200, headers });
};
