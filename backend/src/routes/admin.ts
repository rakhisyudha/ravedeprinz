import { authenticate, requireAdmin, type SessionUser } from '../auth/session';
import { errorResponse, isConnectionError, json, notFound, toApiError } from '../errors';
import { logAudit } from '../services/audit';
import * as admin from '../services/admin';
import * as users from '../services/users';
import { storeUpload } from '../services/upload';

async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const parsed: unknown = await request.json();
    return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

// Write failures surface as 400 (mirroring the previous API); only
// connection-level failures become 503/500.
type RouteError = { status: number; message: string };

function dbError(label: string, error: unknown): RouteError {
  const message = error instanceof Error ? error.message : String(error);
  return { status: 400, message: `${label}: ${message}` };
}

async function guard<T>(label: string, work: () => Promise<T>): Promise<T | RouteError> {
  try {
    return await work();
  } catch (error) {
    if (isConnectionError(error)) {
      return { status: 503, message: 'Content service unavailable' };
    }
    return dbError(label, error);
  }
}

function isApiError(value: unknown): value is RouteError {
  return (
    typeof value === 'object' &&
    value !== null &&
    'status' in value &&
    typeof (value as RouteError).status === 'number' &&
    'message' in value
  );
}

export async function adminCmsRouter(request: Request, url: URL): Promise<Response> {
  const userOrError = requireAdmin(await authenticate(request));
  if (userOrError instanceof Response) return userOrError;
  const user: SessionUser = userOrError;

  try {
    const method = request.method;
    const path = url.pathname;

    // ---- Home ----
    if (path === '/api/admin/home') {
      if (method === 'GET') return json(await admin.getAdminHome());
      if (method === 'PUT') {
        const body = await readJson(request);
        const res = await guard('home', () =>
          admin.putAdminHome(body as { content?: admin.Row; navigation?: Array<admin.Row & { id?: string; page_key: string }> }),
        );
        if (isApiError(res)) return errorResponse(res);
        await logAudit(user, 'UPDATE', 'home');
        return json({ ok: true });
      }
    }

    // ---- About ----
    if (path === '/api/admin/about') {
      if (method === 'GET') return json(await admin.getAdminAbout());
      if (method === 'PUT') {
        const body = await readJson(request);
        const res = await guard('about', () =>
          admin.putAdminAbout(body as { content?: admin.Row; skills?: admin.Row[] }),
        );
        if (isApiError(res)) return errorResponse(res);
        await logAudit(user, 'UPDATE', 'about');
        return json({ ok: true });
      }
    }

    // ---- Work / education ----
    if (path === '/api/admin/work') {
      if (method === 'GET') return json(await admin.getAdminWork());
      if (method === 'PUT') {
        const body = await readJson(request);
        const res = await guard('work', () =>
          admin.putAdminWork(body as { work?: admin.Row[]; education?: admin.Row[] }),
        );
        if (isApiError(res)) return errorResponse(res);
        await logAudit(user, 'UPDATE', 'work');
        return json({ ok: true });
      }
    }

    // ---- Projects CRUD ----
    if (path === '/api/admin/projects' || path.startsWith('/api/admin/projects/')) {
      const id = path.split('/').pop() ?? '';
      if (method === 'GET' && path === '/api/admin/projects') {
        return json(await admin.getAdminProjects());
      }
      if (method === 'POST') {
        const body = await readJson(request);
        const res = await guard('projects', () => admin.createProject(body));
        if (isApiError(res)) return errorResponse(res);
        await logAudit(user, 'CREATE', 'project', (res as admin.Row).id as string | undefined, undefined, body);
        return json(res);
      }
      if (id && (method === 'PUT' || method === 'PATCH')) {
        const bad = admin.assertUuid(id);
        if (bad) return errorResponse(bad);
        const body = await readJson(request);
        const res = await guard('projects', () => admin.updateProject(id, body));
        if (isApiError(res)) return errorResponse(res);
        if (!res) return errorResponse({ status: 404, message: 'Not found' });
        await logAudit(user, 'UPDATE', 'project', id, undefined, body);
        return json(res);
      }
      if (id && method === 'DELETE') {
        const bad = admin.assertUuid(id);
        if (bad) return errorResponse(bad);
        const res = await guard('projects', () => admin.deleteProject(id));
        if (isApiError(res)) return errorResponse(res);
        if (res === 0) return errorResponse({ status: 404, message: 'Not found' });
        await logAudit(user, 'DELETE', 'project', id);
        return json({ ok: true });
      }
    }

    // ---- Notes CRUD ----
    if (path === '/api/admin/notes' || path.startsWith('/api/admin/notes/')) {
      const id = path.split('/').pop() ?? '';
      if (method === 'GET' && path === '/api/admin/notes') {
        return json(await admin.getAdminNotes());
      }
      if (method === 'POST') {
        const body = await readJson(request);
        const res = await guard('notes', () => admin.createNote(body));
        if (isApiError(res)) return errorResponse(res);
        const row = res as admin.Row;
        await logAudit(
          user,
          (row.published as boolean) ? 'PUBLISH' : 'CREATE',
          'note',
          row.id as string | undefined,
        );
        return json(res);
      }
      if (id && (method === 'PUT' || method === 'PATCH')) {
        const bad = admin.assertUuid(id);
        if (bad) return errorResponse(bad);
        const body = await readJson(request);
        const res = await guard('notes', () => admin.updateNote(id, body));
        if (isApiError(res)) return errorResponse(res);
        const { row, published } = res as { row: admin.Row | null; published?: boolean };
        if (!row) return errorResponse({ status: 404, message: 'Not found' });
        await logAudit(user, published ? 'PUBLISH' : 'UPDATE', 'note', id);
        return json(row);
      }
      if (id && method === 'DELETE') {
        const bad = admin.assertUuid(id);
        if (bad) return errorResponse(bad);
        const res = await guard('notes', () => admin.deleteNote(id));
        if (isApiError(res)) return errorResponse(res);
        if (res === 0) return errorResponse({ status: 404, message: 'Not found' });
        await logAudit(user, 'DELETE', 'note', id);
        return json({ ok: true });
      }
    }

    // ---- Now ----
    if (path === '/api/admin/now' || path.startsWith('/api/admin/now/')) {
      const segment = path.split('/').pop() ?? '';
      if (method === 'GET') {
        return json(await admin.getAdminNow());
      }
      if (segment === 'current' && method === 'PUT') {
        const body = await readJson(request);
        const res = await guard('now', () =>
          admin.putAdminNowCurrent(
            body as {
              current?: admin.Row;
              attention?: admin.Row[];
              historyItem?: { date_label?: string; text?: string };
            },
          ),
        );
        if (isApiError(res)) return errorResponse(res);
        await logAudit(user, 'UPDATE', 'now');
        return json({ ok: true });
      }
      if (segment === 'history' && method === 'GET') {
        return json(await admin.getAdminHistory());
      }
      if (segment === 'history' && method === 'POST') {
        const body = await readJson(request);
        const res = await guard('now_history', () => admin.createHistoryItem(body));
        if (isApiError(res)) return errorResponse(res);
        await logAudit(user, 'CREATE', 'now_history', (res as admin.Row).id as string | undefined);
        return json(res);
      }
    }

    // ---- Users (allowlist semantics on the new users table) ----
    if (path === '/api/admin/users' || path.startsWith('/api/admin/users/')) {
      const id = path.split('/').pop() ?? '';
      if (method === 'GET' && path === '/api/admin/users') {
        return json(await users.getUsers());
      }
      if (method === 'POST') {
        const body = await readJson(request);
        const res = await guard('users', () =>
          users.createUser({ email: body.email, password: body.password, role: body.role }),
        );
        if (isApiError(res)) return errorResponse(res);
        const created = res as { row?: admin.Row; error?: { status: 400 | 409; message: string } };
        if (created.error) return errorResponse(created.error);
        await logAudit(user, 'CREATE', 'admin_user', (created.row as admin.Row).id as string);
        return json(created.row);
      }
      if (id && method === 'PUT') {
        const bad = admin.assertUuid(id);
        if (bad) return errorResponse(bad);
        const body = await readJson(request);
        const res = await guard('users', () =>
          users.updateUser(id, { password: body.password, role: body.role, active: body.active }),
        );
        if (isApiError(res)) return errorResponse(res);
        const updated = res as { ok?: true; error?: { status: 404; message: string } };
        if (updated.error) return errorResponse(updated.error);
        await logAudit(user, 'UPDATE', 'admin_user', id);
        return json({ ok: true });
      }
      if (id && method === 'DELETE') {
        const bad = admin.assertUuid(id);
        if (bad) return errorResponse(bad);
        const res = await guard('users', () => users.deleteUser(id));
        if (isApiError(res)) return errorResponse(res);
        const deleted = res as { ok?: true; error?: { status: 404; message: string } };
        if (deleted.error) return errorResponse(deleted.error);
        await logAudit(user, 'DELETE', 'admin_user', id);
        return json({ ok: true });
      }
    }

    // ---- Upload (admin-only; same validation contract as before) ----
    if (path === '/api/admin/upload' && method === 'POST') {
      const form = await request.formData().catch(() => null);
      const result = await storeUpload(form?.get('file') ?? null);
      if (!result.ok) return errorResponse({ status: result.status, message: result.message });
      await logAudit(user, 'CREATE', 'upload', result.url);
      return json({ url: result.url });
    }

    return errorResponse(notFound());
  } catch (error) {
    return errorResponse(toApiError(error));
  }
}
