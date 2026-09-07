import { sql } from '../db';
import { json } from '../errors';
import { hashSessionToken, newSessionToken, sessionExpiry } from './tokens';

export const SESSION_COOKIE = 'session';

export type SessionUser = { id: string; email: string; is_admin: boolean };

export type AuthResult =
  | { authenticated: true; user: SessionUser }
  | { authenticated: false };

function parseCookies(header: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index < 0) continue;
    const name = part.slice(0, index).trim();
    if (name) out[name] = decodeURIComponent(part.slice(index + 1).trim());
  }
  return out;
}

function isProduction(): boolean {
  return process.env.NODE_ENV === 'production' || process.env.COOKIE_SECURE === 'true';
}

function cookieAttributes(maxAgeSeconds: number): string {
  const parts = ['HttpOnly', 'Path=/', `Max-Age=${maxAgeSeconds}`, 'SameSite=Lax'];
  if (isProduction()) parts.push('Secure');
  return parts.join('; ');
}

export function setSessionCookie(headers: Headers, token: string, maxAgeSeconds: number): void {
  headers.append('Set-Cookie', `${SESSION_COOKIE}=${token}; ${cookieAttributes(maxAgeSeconds)}`);
}

export function clearSessionCookie(headers: Headers): void {
  headers.append('Set-Cookie', `${SESSION_COOKIE}=; ${cookieAttributes(0)}`);
}

export async function createSession(userId: string): Promise<string> {
  const token = newSessionToken();
  const tokenHash = hashSessionToken(token);
  // Opportunistic hygiene: drop sessions that already expired.
  await sql`delete from sessions where expires_at < now()`;
  await sql`
    insert into sessions (user_id, token_hash, expires_at)
    values (${userId}, ${tokenHash}, ${sessionExpiry()})
  `;
  return token;
}

async function lookupSession(token: string): Promise<AuthResult> {
  const rows = await sql`
    select s.expires_at, s.revoked_at, u.id, u.email,
           (a.user_id is not null) as is_admin
    from sessions s
    join users u on u.id = s.user_id
    left join admin_users a on a.user_id = u.id
    where s.token_hash = ${hashSessionToken(token)}
    limit 1
  `;
  const row = rows[0] as
    | { expires_at: Date; revoked_at: Date | null; id: string; email: string; is_admin: boolean }
    | undefined;
  if (!row) return { authenticated: false };
  if (row.revoked_at) return { authenticated: false };
  if (row.expires_at.getTime() <= Date.now()) return { authenticated: false };
  return { authenticated: true, user: { id: row.id, email: row.email, is_admin: row.is_admin } };
}

/** Reads the session cookie, hashes the token, validates the row. Never throws. */
export async function authenticate(request: Request): Promise<AuthResult> {
  try {
    const token = parseCookies(request.headers.get('cookie'))[SESSION_COOKIE];
    if (!token) return { authenticated: false };
    return await lookupSession(token);
  } catch {
    return { authenticated: false };
  }
}

/** Rejects unauthenticated requests with 401. */
export function requireAuth(auth: AuthResult): SessionUser | Response {
  if (!auth.authenticated) {
    return json({ error: 'Authentication required' }, 401);
  }
  return auth.user;
}

/** Rejects unauthenticated (401) or non-admin (403) requests. */
export function requireAdmin(auth: AuthResult): SessionUser | Response {
  const user = requireAuth(auth);
  if (user instanceof Response) return user;
  if (!user.is_admin) {
    return json({ error: 'Not authorized' }, 403);
  }
  return user;
}

export async function revokeSession(request: Request): Promise<void> {
  try {
    const token = parseCookies(request.headers.get('cookie'))[SESSION_COOKIE];
    if (!token) return;
    await sql`update sessions set revoked_at = now() where token_hash = ${hashSessionToken(token)}`;
  } catch {
    // Logout stays safe/idempotent even if the database is unreachable.
  }
}
