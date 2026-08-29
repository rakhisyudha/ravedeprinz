import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const frontendOrigin = process.env.FRONTEND_URL ?? 'http://localhost:3000';

export const adminClient: SupabaseClient = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export const corsHeaders = {
  'Access-Control-Allow-Origin': frontendOrigin,
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, content-type',
};

export function json(body: unknown, status = 200, extra: Record<string, string> = {}) {
  return Response.json(body, { status, headers: { ...corsHeaders, ...extra } });
}

export type AdminUser = { id: string; email: string; role: string };

/** Verifies a bearer token and confirms the caller is an active admin. */
export async function requireAdmin(request: Request): Promise<{ user: AdminUser; error?: never } | { user?: never; error: Response }> {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return { error: json({ error: 'Missing token' }, 401) };

  const { data: userData, error: tokenError } = await adminClient.auth.getUser(token);
  if (tokenError || !userData.user?.email) return { error: json({ error: 'Invalid token' }, 401) };

  const { data: adminRow } = await adminClient.from('admin_users').select('id, email, role').eq('email', userData.user.email).eq('active', true).maybeSingle();
  if (!adminRow) return { error: json({ error: 'Not authorized' }, 403) };

  return { user: { id: userData.user.id, email: adminRow.email as string, role: adminRow.role as string } };
}

export async function logAudit(admin: AdminUser, action: string, entityType: string, entityId?: string, before?: unknown, after?: unknown) {
  await adminClient.from('audit_logs').insert({
    user_id: admin.id,
    email: admin.email,
    action,
    entity_type: entityType,
    entity_id: entityId,
    before_data: before ?? null,
    after_data: after ?? null,
  });
}
