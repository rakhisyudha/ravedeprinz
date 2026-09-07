import { defineMiddleware } from 'astro:middleware';
import { serverApiBase } from './lib/api';

// Server-side gate for /admin/*. Layouts cannot return redirects, so the
// redirect decision lives here; pages/layouts read the verified session
// from context.locals instead of refetching. The Bun API re-verifies
// every /api/admin/* call regardless.
export const onRequest = defineMiddleware(async (context, next) => {
  if (!context.url.pathname.startsWith('/admin')) {
    return next();
  }

  const apiBase = serverApiBase().replace(/\/$/, '');

  try {
    const res = await fetch(`${apiBase}/api/auth/session`, {
      headers: { cookie: context.request.headers.get('cookie') ?? '' },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      context.locals.adminGate = { reachable: false, user: null };
      return next();
    }
    const session = (await res.json()) as
      | { authenticated: false }
      | { authenticated: true; user: { id: string; email: string; is_admin: boolean } };
    if (!session.authenticated) {
      return context.redirect('/login');
    }
    context.locals.adminGate = { reachable: true, user: session.user };
    return next();
  } catch {
    context.locals.adminGate = { reachable: false, user: null };
    return next();
  }
});
