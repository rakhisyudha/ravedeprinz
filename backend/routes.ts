import { adminClient, json, requireAdmin, logAudit } from './helpers';
import type { SupabaseClient } from '@supabase/supabase-js';

type Supabase = SupabaseClient;

const EMPTY_UUID = '00000000-0000-0000-0000-000000000000';

// ---------------------------------------------------------------------------
// Public content (published only)
// ---------------------------------------------------------------------------

export async function publicContent(request: Request, url: URL): Promise<Response> {
  switch (url.pathname) {
    case '/api/health':
      return json({ ok: true, service: 'ravedeprinz-cms' });

    case '/api/content/site': {
      const { data } = await adminClient.from('site_settings').select('*').limit(1).single();
      return json(data ?? {});
    }

    case '/api/content/home': {
      const [content, navigation] = await Promise.all([
        adminClient.from('home_content').select('*').limit(1).single(),
        adminClient.from('home_navigation').select('*').eq('visible', true).order('sort_order'),
      ]);
      return json({ content: content.data ?? null, navigation: navigation.data ?? [] });
    }

    case '/api/content/about': {
      const [content, skills] = await Promise.all([
        adminClient.from('about_content').select('*').limit(1).single(),
        adminClient.from('skills').select('*').eq('visible', true).order('sort_order'),
      ]);
      return json({ content: content.data ?? null, skills: skills.data ?? [] });
    }

    case '/api/content/work': {
      const [work, education] = await Promise.all([
        adminClient.from('work_entries').select('*').eq('visible', true).order('sort_order'),
        adminClient.from('education_entries').select('*').eq('visible', true).order('sort_order'),
      ]);
      return json({ work: work.data ?? [], education: education.data ?? [] });
    }

    case '/api/content/projects': {
      const { data } = await adminClient
        .from('projects')
        .select('*')
        .eq('published', true)
        .eq('visible', true)
        .order('sort_order')
        .order('year', { ascending: false });
      return json({ projects: data ?? [] });
    }

    case '/api/content/notes': {
      const { data } = await adminClient
        .from('notes')
        .select('*')
        .eq('published', true)
        .order('published_at', { ascending: false });
      return json({ notes: data ?? [] });
    }

    case '/api/content/now': {
      const [current, attention, history] = await Promise.all([
        adminClient.from('now_current').select('*').limit(1).single(),
        adminClient.from('now_attention').select('*').eq('visible', true).order('sort_order'),
        adminClient.from('now_history').select('*').order('created_at', { ascending: false }).limit(3),
      ]);
      return json({ current: current.data ?? null, attention: attention.data ?? [], history: history.data ?? [] });
    }

    case '/api/content/now/history': {
      const { data } = await adminClient.from('now_history').select('*').order('created_at', { ascending: false }).limit(3);
      return json({ history: data ?? [] });
    }

    default:
      if (url.pathname.startsWith('/api/content/notes/')) {
        const id = decodeURIComponent(url.pathname.split('/').pop() ?? '');
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
        let query = adminClient.from('notes').select('*').eq('published', true);
        query = isUuid ? query.eq('id', id) : query.eq('slug', id);
        const { data } = await query.maybeSingle();
        if (!data) return json({ error: 'Not found' }, 404);
        return json(data);
      }
      return json({ error: 'Not found' }, 404);
  }
}

// ---------------------------------------------------------------------------
// Admin CRUD
// ---------------------------------------------------------------------------

export async function adminApi(request: Request, url: URL, admin: { id: string; email: string; role: string }): Promise<Response> {
  const method = request.method;

  // ---- Home ----
  if (url.pathname === '/api/admin/home') {
    if (method === 'GET') {
      const [content, navigation] = await Promise.all([
        adminClient.from('home_content').select('*').limit(1).single(),
        adminClient.from('home_navigation').select('*').order('sort_order'),
      ]);
      return json({ content: content.data ?? null, navigation: navigation.data ?? [] });
    }
    if (method === 'PUT') {
      const body = await request.json();
      const { content, navigation } = body as { content?: Record<string, unknown>; navigation?: Array<Record<string, unknown> & { id?: string; page_key: string }> };
      if (content) {
        const { data: existing } = await adminClient.from('home_content').select('id').limit(1).single();
        if (existing) {
          const res = await adminClient.from('home_content').update({ ...content, updated_at: new Date().toISOString() }).eq('id', existing.id);
          if (res.error) return json({ error: `home_content: ${res.error.message}` }, 400);
        } else {
          const res = await adminClient.from('home_content').insert({ ...content });
          if (res.error) return json({ error: `home_content: ${res.error.message}` }, 400);
        }
      }
      if (navigation) {
        for (const item of navigation) {
          const { id, page_key, ...fields } = item;
          let res;
          if (id) res = await adminClient.from('home_navigation').update({ ...fields, updated_at: new Date().toISOString() }).eq('id', id);
          else if (page_key) res = await adminClient.from('home_navigation').upsert({ ...fields, page_key });
          if (res?.error) return json({ error: `home_navigation: ${res.error.message}` }, 400);
        }
      }
      await logAudit(admin, 'UPDATE', 'home');
      return json({ ok: true });
    }
  }

  // ---- About ----
  if (url.pathname === '/api/admin/about') {
    if (method === 'GET') {
      const [content, skills] = await Promise.all([
        adminClient.from('about_content').select('*').limit(1).single(),
        adminClient.from('skills').select('*').order('sort_order'),
      ]);
      return json({ content: content.data ?? null, skills: skills.data ?? [] });
    }
    if (method === 'PUT') {
      const { content, skills } = await request.json() as { content?: Record<string, unknown>; skills?: Array<Record<string, unknown> & { id?: string }> };
      if (content) {
        const { data: existing } = await adminClient.from('about_content').select('id').limit(1).single();
        if (existing) await adminClient.from('about_content').update({ ...content, updated_at: new Date().toISOString() }).eq('id', existing.id);
        else await adminClient.from('about_content').insert({ ...content });
      }
      if (skills) {
        const del = await adminClient.from('skills').delete().neq('id', EMPTY_UUID);
        if (del.error) return json({ error: `skills delete: ${del.error.message}` }, 400);
        const ins = await adminClient.from('skills').insert(skills.map(({ id, ...rest }) => rest));
        if (ins.error) return json({ error: `skills: ${ins.error.message}` }, 400);
      }
      await logAudit(admin, 'UPDATE', 'about');
      return json({ ok: true });
    }
  }

  // ---- Work / Education ----
  if (url.pathname === '/api/admin/work') {
    if (method === 'GET') {
      const [work, education] = await Promise.all([
        adminClient.from('work_entries').select('*').order('sort_order'),
        adminClient.from('education_entries').select('*').order('sort_order'),
      ]);
      return json({ work: work.data ?? [], education: education.data ?? [] });
    }
    if (method === 'PUT') {
      const { work, education } = await request.json() as { work?: Array<Record<string, unknown>>; education?: Array<Record<string, unknown>> };

      // Delete only rows the client removed, then upsert the rest by id.
      // A failed write never wipes rows the user kept.
      async function replaceRows(table: 'work_entries' | 'education_entries', rows: Array<Record<string, unknown>>, label: string): Promise<Response | null> {
        const ids = rows.map((r) => r.id).filter((v): v is string => typeof v === 'string' && v !== '');
        const del = ids.length
          ? await adminClient.from(table).delete().not('id', 'in', `(${ids.join(',')})`)
          : await adminClient.from(table).delete().neq('id', EMPTY_UUID);
        if (del.error) return json({ error: `${label}: ${del.error.message}` }, 400);

        const upsertRows = rows.map(({ id, ...rest }) => (id ? { id, ...rest } : rest));
        const up = await adminClient.from(table).upsert(upsertRows, { onConflict: 'id' });
        if (up.error) return json({ error: `${label}: ${up.error.message}` }, 400);
        return null;
      }

      if (work) {
        const err = await replaceRows('work_entries', work, 'work_entries');
        if (err) return err;
      }
      if (education) {
        const err = await replaceRows('education_entries', education, 'education_entries');
        if (err) return err;
      }
      await logAudit(admin, 'UPDATE', 'work');
      return json({ ok: true });
    }
  }

  // ---- Projects CRUD ----
  if (url.pathname === '/api/admin/projects' || url.pathname.startsWith('/api/admin/projects/')) {
    const id = url.pathname.split('/').pop();
    if (method === 'GET' && url.pathname === '/api/admin/projects') {
      const { data } = await adminClient.from('projects').select('*').order('sort_order');
      return json({ projects: data ?? [] });
    }
    if (method === 'POST') {
      const body = await request.json();
      const { data, error } = await adminClient.from('projects').insert(body).select().single();
      if (error) return json({ error: error.message }, 400);
      await logAudit(admin, 'CREATE', 'project', data.id, undefined, body);
      return json(data);
    }
    if (id && (method === 'PUT' || method === 'PATCH')) {
      const body = await request.json();
      const { data, error } = await adminClient.from('projects').update({ ...body, updated_at: new Date().toISOString() }).eq('id', id).select().single();
      if (error) return json({ error: error.message }, 400);
      await logAudit(admin, 'UPDATE', 'project', id, undefined, body);
      return json(data);
    }
    if (id && method === 'DELETE') {
      const { error } = await adminClient.from('projects').delete().eq('id', id);
      if (error) return json({ error: error.message }, 400);
      await logAudit(admin, 'DELETE', 'project', id);
      return json({ ok: true });
    }
  }

  // ---- Notes CRUD ----
  if (url.pathname === '/api/admin/notes' || url.pathname.startsWith('/api/admin/notes/')) {
    const id = url.pathname.split('/').pop();
    if (method === 'GET' && url.pathname === '/api/admin/notes') {
      const { data } = await adminClient.from('notes').select('*').order('created_at', { ascending: false });
      return json({ notes: data ?? [] });
    }
    if (method === 'POST') {
      const body = await request.json();
      const published = body.published ?? false;
      const insert = { title: body.title, slug: body.slug, body: body.body ?? '', tag: body.tag ?? 'REFLECTION', author: body.author ?? null, subtitle: body.subtitle ?? null, image_url: body.image_url ?? null, published, published_at: published ? new Date().toISOString() : null };
      const { data, error } = await adminClient.from('notes').insert(insert).select().single();
      if (error) return json({ error: error.message }, 400);
      await logAudit(admin, published ? 'PUBLISH' : 'CREATE', 'note', data.id);
      return json(data);
    }
    if (id && (method === 'PUT' || method === 'PATCH')) {
      const body = await request.json();
      const published = body.published;
      const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
      const editable = ['title', 'slug', 'body', 'tag', 'author', 'subtitle', 'image_url', 'sort_order'] as const;
      for (const key of editable) {
        if (key in body) update[key] = body[key];
      }
      if (typeof published === 'boolean') {
        update.published = published;
        update.published_at = published ? new Date().toISOString() : null;
      }
      const { data, error } = await adminClient.from('notes').update(update).eq('id', id).select().single();
      if (error) return json({ error: error.message }, 400);
      await logAudit(admin, published ? 'PUBLISH' : 'UPDATE', 'note', id);
      return json(data);
    }
    if (id && method === 'DELETE') {
      const { error } = await adminClient.from('notes').delete().eq('id', id);
      if (error) return json({ error: error.message }, 400);
      await logAudit(admin, 'DELETE', 'note', id);
      return json({ ok: true });
    }
  }

  // ---- Now ----
  if (url.pathname === '/api/admin/now' || url.pathname.startsWith('/api/admin/now/')) {
    const segment = url.pathname.split('/').pop();
    if (method === 'GET') {
      const [current, attention, history] = await Promise.all([
        adminClient.from('now_current').select('*').limit(1).single(),
        adminClient.from('now_attention').select('*').order('sort_order'),
        adminClient.from('now_history').select('*').order('created_at', { ascending: false }),
      ]);
      return json({ current: current.data ?? null, attention: attention.data ?? [], history: history.data ?? [] });
    }
    if (segment === 'current' && method === 'PUT') {
      const { current, attention, historyItem } = await request.json() as { current?: Record<string, unknown>; attention?: Array<Record<string, unknown> & { id?: string }>; historyItem?: { date_label?: string; text?: string } };
      const { data: existing } = await adminClient.from('now_current').select('id').limit(1).single();
      if (current) {
        const payload = { ...current, updated_at: new Date().toISOString() };
        if (existing) await adminClient.from('now_current').update(payload).eq('id', existing.id);
        else await adminClient.from('now_current').insert(payload);
      }
      if (attention) {
        await adminClient.from('now_attention').delete().neq('id', EMPTY_UUID);
        await adminClient.from('now_attention').insert(attention.map(({ id, ...rest }) => rest));
      }
      if (historyItem?.text) {
        await adminClient.from('now_history').insert({ date_label: historyItem.date_label ?? 'NOW', text: historyItem.text, source_type: 'UPDATE' });
      }
      await logAudit(admin, 'UPDATE', 'now');
      return json({ ok: true });
    }
    if (segment === 'history' && method === 'GET') {
      const { data } = await adminClient.from('now_history').select('*').order('created_at', { ascending: false });
      return json({ history: data ?? [] });
    }
    if (segment === 'history' && method === 'POST') {
      const body = await request.json();
      const { data, error } = await adminClient.from('now_history').insert(body).select().single();
      if (error) return json({ error: error.message }, 400);
      await logAudit(admin, 'CREATE', 'now_history', data.id);
      return json(data);
    }
  }

  return json({ error: 'Not found' }, 404);
}
