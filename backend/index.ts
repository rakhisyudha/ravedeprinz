import { serve } from 'bun';
import { json, requireAdmin } from './helpers';
import { publicContent, adminApi } from './routes';
import { usersApi } from './users';

const port = Number(process.env.PORT ?? 4000);

serve({
  port,
  async fetch(request) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return json({}, 204);
    }

    // Public content endpoints require no auth but return only published rows.
    if (url.pathname.startsWith('/api/content/') || url.pathname === '/api/health') {
      return publicContent(request, url);
    }

    // Everything else under /api/admin requires a valid admin bearer token.
    const result = await requireAdmin(request);
    if ('error' in result) return result.error;

    if (url.pathname.startsWith('/api/admin/users')) {
      return usersApi(request, url, result.user);
    }

    return adminApi(request, url, result.user);
  },
});

console.log(`[cms] ravedeprinz CMS listening on :${port}`);
