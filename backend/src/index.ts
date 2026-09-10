import { serve } from 'bun';
import { config } from './config';
import { corsHeadersFor, errorResponse, notFound } from './errors';
import { checkConnection, migrate } from './db';
import { adminRouter, authRouter } from './routes/auth';
import { contentRouter } from './routes/content';
import { adminCmsRouter } from './routes/admin';
import { filesRouter } from './routes/files';

await migrate();

if (!(await checkConnection())) {
  console.error('[api] cannot reach PostgreSQL — starting anyway, reads will 503 until it is up');
}

serve({
  port: config.port,
  async fetch(request) {
    const url = new URL(request.url);
    console.log(`[api] ${request.method} ${url.pathname}`);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeadersFor(request.headers.get('origin')) });
    }

    let response: Response;
    if (url.pathname.startsWith('/api/content/') || url.pathname === '/api/health') {
      response = await contentRouter(request, url);
    } else if (url.pathname.startsWith('/api/auth/')) {
      response = await authRouter(request, url);
    // Every /api/admin/* route re-verifies the session server-side.
    // /api/admin/me stays on the auth router; the CMS router owns the rest.
    } else if (url.pathname === '/api/admin/me') {
      response = await adminRouter(request, url);
    } else if (url.pathname.startsWith('/api/admin/')) {
      response = await adminCmsRouter(request, url);
    } else if (url.pathname.startsWith('/uploads/')) {
      response = await filesRouter(request, url);
    } else {
      return errorResponse(notFound());
    }

    // Single CORS enforcement point: the routers emit the primary-origin
    // defaults via json(); the edge stamps the allowlisted request origin
    // (plus credentials) onto every actual response.
    const cors = corsHeadersFor(request.headers.get('origin'));
    for (const [key, value] of Object.entries(cors)) response.headers.set(key, value);
    return response;
  },
} as Parameters<typeof serve>[0]);

console.log(`[api] ravedeprinz CMS v2 listening on :${config.port}`);
