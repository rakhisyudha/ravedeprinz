import { sql } from '../db';
import { hashPassword } from '../auth/password';
import type { Row } from './admin';

export type UserRow = {
  id: string;
  email: string;
  role: string;
  active: boolean;
};

// Allowlist semantics mirror the old provisioning flow: an email can only
// sign in once it exists here (users row + admin_users link). Login itself
// additionally requires active = true.

export async function getUsers(): Promise<{ users: UserRow[] }> {
  const rows = (await sql`
    select u.id, u.email, u.role, u.active
    from users u
    join admin_users a on a.user_id = u.id
    order by u.created_at desc
  `) as UserRow[];
  return { users: rows };
}

export async function createUser(body: {
  email?: unknown;
  password?: unknown;
  role?: unknown;
}): Promise<{ row?: Row; error?: { status: 400 | 409; message: string } }> {
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  if (!email || !password) {
    return { error: { status: 400, message: 'email and password are required' } };
  }
  const role = body.role === 'owner' ? 'owner' : 'editor';

  const existing = (await sql`select id from users where email = ${email} limit 1`) as Array<{
    id: string;
  }>;
  if (existing.length > 0) {
    return { error: { status: 409, message: 'Email is already registered' } };
  }

  const created = (await sql`
    insert into users (email, password_hash, role, active)
    values (${email}, ${await hashPassword(password)}, ${role}, true)
    returning id, email, role, active
  `) as Row[];
  await sql`insert into admin_users (user_id) values (${(created[0] as { id: string }).id})`;
  return { row: created[0] };
}

export async function updateUser(
  id: string,
  body: { password?: unknown; role?: unknown; active?: unknown },
): Promise<{ ok: true } | { error: { status: 404; message: string } }> {
  const existing = (await sql`select id from users where id = ${id} limit 1`) as Array<{ id: string }>;
  if (existing.length === 0) return { error: { status: 404, message: 'Not found' } };

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.role === 'string') update.role = body.role;
  if (typeof body.active === 'boolean') update.active = body.active;
  if (typeof body.password === 'string' && body.password.length > 0) {
    update.password_hash = await hashPassword(body.password);
  }
  await sql`update users set ${sql(update)} where id = ${id}`;
  return { ok: true };
}

export async function deleteUser(id: string): Promise<{ ok: true } | { error: { status: 404; message: string } }> {
  // Sessions and the admin link cascade from the users row.
  const rows = await sql`delete from users where id = ${id} returning id`;
  if (rows.length === 0) return { error: { status: 404, message: 'Not found' } };
  return { ok: true };
}
