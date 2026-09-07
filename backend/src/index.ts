import { serve } from 'bun';
import { config } from './config';
import { corsHeaders, errorResponse, notFound } from './errors';
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
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (url.pathname.startsWith('/api/content/') || url.pathname === '/api/health') {
      return contentRouter(request, url);
    }

    if (url.pathname.startsWith('/api/auth/')) {
      return authRouter(request, url);
    }

    // Every /api/admin/* route re-verifies the session server-side.
    // /api/admin/me stays on the auth router; the CMS router owns the rest.
    if (url.pathname === '/api/admin/me') {
      return adminRouter(request, url);
    }
    if (url.pathname.startsWith('/api/admin/')) {
      return adminCmsRouter(request, url);
    }

    if (url.pathname.startsWith('/uploads/')) {
      return filesRouter(request, url);
    }

    return errorResponse(notFound());
  },
} as Parameters<typeof serve>[0]);

console.log(`[api] ravedeprinz CMS v2 listening on :${config.port}`);
