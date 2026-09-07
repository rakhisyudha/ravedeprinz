import { sql } from '../db';
import { verifyPassword } from '../auth/password';
import type { SessionUser } from '../auth/session';

export type LoginInput = { email: unknown; password: unknown };

export type LoginResult =
  | { ok: true; user: SessionUser }
  | { ok: false; status: 400 | 401; message: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const email = value.trim().toLowerCase();
  return EMAIL_RE.test(email) ? email : null;
}

export async function loginUser(input: LoginInput): Promise<LoginResult> {
  const email = normalizeEmail(input.email);
  if (!email || typeof input.password !== 'string' || input.password.length === 0) {
    return { ok: false, status: 400, message: 'Email and password are required' };
  }

  const rows = await sql`
    select u.id, u.email, u.password_hash, u.active, (a.user_id is not null) as is_admin
    from users u
    left join admin_users a on a.user_id = u.id
    where u.email = ${email}
    limit 1
  `;
  const row = rows[0] as
    | { id: string; email: string; password_hash: string; active: boolean; is_admin: boolean }
    | undefined;

  // Same generic outcome whether the email is missing, disabled,
  // or the password is wrong.
  if (!row || !row.active || !(await verifyPassword(input.password, row.password_hash))) {
    return { ok: false, status: 401, message: 'Invalid email or password' };
  }

  return { ok: true, user: { id: row.id, email: row.email, is_admin: row.is_admin } };
}
