import { SESSION_LIFETIME_MS } from '../auth/tokens';
import {
  authenticate,
  clearSessionCookie,
  createSession,
  revokeSession,
  requireAdmin,
  setSessionCookie,
} from '../auth/session';
import { errorResponse, json, notFound, toApiError } from '../errors';
import { loginUser } from '../services/auth';

async function readBody(request: Request): Promise<Record<string, unknown>> {
  try {
    const parsed: unknown = await request.json();
    return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export async function authRouter(request: Request, url: URL): Promise<Response> {
  try {
    if (url.pathname === '/api/auth/login' && request.method === 'POST') {
      const body = await readBody(request);
      const result = await loginUser({ email: body.email, password: body.password });
      if (!result.ok) return json({ error: result.message }, result.status);

      // Fresh random session per login: no session is ever reused or fixated.
      const token = await createSession(result.user.id);
      const headers = new Headers();
      setSessionCookie(headers, token, Math.floor(SESSION_LIFETIME_MS / 1000));
      return json({ user: result.user }, 200, Object.fromEntries(headers));
    }

    if (url.pathname === '/api/auth/logout' && request.method === 'POST') {
      // Safe with or without a session: revoke what matches, always clear.
      await revokeSession(request);
      const headers = new Headers();
      clearSessionCookie(headers);
      return json({ ok: true }, 200, Object.fromEntries(headers));
    }

    if (url.pathname === '/api/auth/session' && request.method === 'GET') {
      const auth = await authenticate(request);
      if (!auth.authenticated) return json({ authenticated: false });
      return json({ authenticated: true, user: auth.user });
    }

    return errorResponse(notFound());
  } catch (error) {
    return errorResponse(toApiError(error));
  }
}

// Minimal protected surface for Phase 3: proves requireAdmin(), nothing more.
// Full CRUD arrives with Phase 4.
export async function adminRouter(request: Request, url: URL): Promise<Response> {
  try {
    const user = requireAdmin(await authenticate(request));
    if (user instanceof Response) return user;

    if (url.pathname === '/api/admin/me' && request.method === 'GET') {
      return json({ user });
    }

    return errorResponse(notFound());
  } catch (error) {
    return errorResponse(toApiError(error));
  }
}
