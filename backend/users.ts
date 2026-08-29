import { adminClient, json, requireAdmin, logAudit } from './helpers';

// Admin-only user management.
// Creating a user provisions a Supabase auth record (email + password) AND adds
// the email to the admin allowlist. That email can then sign in with either
// email + password or Google OAuth. No email that is not in the allowlist can
// gain CMS access through any login method.
export async function usersApi(request: Request, url: URL, admin: { id: string; email: string; role: string }): Promise<Response> {
  const method = request.method;
  const id = url.pathname.split('/').pop();

  if (url.pathname === '/api/admin/users' && method === 'GET') {
    const { data } = await adminClient.from('admin_users').select('*').order('created_at', { ascending: false });
    return json({ users: data ?? [] });
  }

  if (url.pathname === '/api/admin/users' && method === 'POST') {
    const { email, password, role = 'editor' } = await request.json() as { email?: string; password?: string; role?: string };
    if (!email || !password) return json({ error: 'email and password are required' }, 400);

    const normalized = String(email).trim().toLowerCase();
    const { data: existing } = await adminClient.from('admin_users').select('id, user_id').eq('email', normalized).maybeSingle();

    const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({ email: normalized, password, email_confirm: true });
    if (authError && !authError.message.includes('already been registered')) return json({ error: authError.message }, 400);

    let row;
    if (existing) {
      if (existing.user_id) return json({ error: 'Email is already registered' }, 409);
      const { data, error } = await adminClient.from('admin_users').update({ user_id: authUser?.user?.id, role }).eq('id', existing.id).select().single();
      if (error) return json({ error: error.message }, 400);
      row = data;
    } else {
      const { data, error } = await adminClient.from('admin_users').insert({ email: normalized, role, user_id: authUser?.user?.id }).select().single();
      if (error) return json({ error: error.message }, 400);
      row = data;
    }

    await logAudit(admin, 'CREATE', 'admin_user', row.id, undefined, { email: normalized, role });
    return json(row);
  }

  if (id && url.pathname.startsWith('/api/admin/users/') && method === 'PUT') {
    const { password, role, active } = await request.json() as { password?: string; role?: string; active?: boolean };
    const { data: existing } = await adminClient.from('admin_users').select('id, user_id').eq('id', id).maybeSingle();
    if (!existing) return json({ error: 'Not found' }, 404);

    const update: Record<string, unknown> = {};
    if (typeof role === 'string') update.role = role;
    if (typeof active === 'boolean') update.active = active;
    await adminClient.from('admin_users').update(update).eq('id', id);

    if (password && existing.user_id) {
      await adminClient.auth.admin.updateUserById(existing.user_id as string, { password });
    }
    await logAudit(admin, 'UPDATE', 'admin_user', id);
    return json({ ok: true });
  }

  if (id && url.pathname.startsWith('/api/admin/users/') && method === 'DELETE') {
    const { data: existing } = await adminClient.from('admin_users').select('id, user_id').eq('id', id).maybeSingle();
    if (!existing) return json({ error: 'Not found' }, 404);
    if (existing.user_id) await adminClient.auth.admin.deleteUser(existing.user_id as string);
    await adminClient.from('admin_users').delete().eq('id', id);
    await logAudit(admin, 'DELETE', 'admin_user', id);
    return json({ ok: true });
  }

  return json({ error: 'Not found' }, 404);
}
