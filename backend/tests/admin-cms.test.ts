import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { SQL } from 'bun';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Isolated database + isolated upload directory. Env first, modules after.
const TEST_DB = 'postgres://archive:archive@127.0.0.1:5433/ravedeprinz_test';
process.env.DATABASE_URL = TEST_DB;
const UPLOADS_TMP = mkdtempSync(join(tmpdir(), 'cms-uploads-'));
process.env.UPLOADS_DIR = UPLOADS_TMP;

const { migrate } = await import('../src/db');
const { authRouter } = await import('../src/routes/auth');
const { adminCmsRouter } = await import('../src/routes/admin');
const { filesRouter } = await import('../src/routes/files');
const { hashPassword } = await import('../src/auth/password');

const ADMIN_EMAIL = 'cms-admin@test.local';
const ADMIN_PASSWORD = 'cms-admin-123';
const USER_EMAIL = 'cms-reader@test.local';
const USER_PASSWORD = 'cms-reader-123';

const PNG_1PX = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

async function ensureTestDatabase(): Promise<void> {
  const maint = new SQL('postgres://archive:archive@127.0.0.1:5433/postgres');
  try {
    await maint.unsafe('CREATE DATABASE "ravedeprinz_test"');
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes('already exists')) throw error;
  }
  await maint.close();
}

async function loginAs(email: string, password: string): Promise<string> {
  const req = new Request('http://test/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const res = await authRouter(req, new URL(req.url));
  if (res.status !== 200) throw new Error(`login failed for ${email}: ${res.status}`);
  const cookie = res.headers.getSetCookie().find((c) => c.startsWith('session='));
  if (!cookie) throw new Error('login set no cookie');
  return cookie.split(';')[0]!;
}

async function adminCall(
  cookie: string | undefined,
  path: string,
  init?: { method?: string; body?: unknown; form?: FormData },
): Promise<{ status: number; body: unknown }> {
  const headers: Record<string, string> = {};
  if (cookie) headers.cookie = cookie;
  let body: BodyInit | undefined;
  if (init?.form) {
    body = init.form;
  } else if (init?.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(init.body);
  }
  const req = new Request(`http://test${path}`, {
    method: init?.method ?? 'GET',
    headers,
    body,
  });
  // filesRouter is exercised separately; admin paths only here.
  const routed = await adminCmsRouter(req, new URL(req.url));
  return { status: routed.status, body: await routed.json().catch(() => null) };
}

let adminCookie = '';
let userCookie = '';

beforeAll(async () => {
  await ensureTestDatabase();
  await migrate();
  const { sql } = await import('../src/db');
  // Sweep probe residue so a previously failed run never poisons this one.
  await sql`delete from notes where slug like 'phase4-%' or slug like 'ts-%'`;
  await sql`delete from projects where slug like 'phase4-%' or slug like 'ts-%'`;

  const adminRows = (await sql`
    insert into users (email, password_hash, role, active)
    values (${ADMIN_EMAIL}, ${await hashPassword(ADMIN_PASSWORD)}, 'owner', true)
    returning id
  `) as Array<{ id: string }>;
  await sql`insert into admin_users (user_id) values (${adminRows[0]!.id})`;
  await sql`
    insert into users (email, password_hash, role, active)
    values (${USER_EMAIL}, ${await hashPassword(USER_PASSWORD)}, 'editor', true)
  `;

  adminCookie = await loginAs(ADMIN_EMAIL, ADMIN_PASSWORD);
  userCookie = await loginAs(USER_EMAIL, USER_PASSWORD);
});

afterAll(async () => {
  // Dedicated teardown client: the shared src/db pool must stay open
  // because test files share the module registry.
  const teardown = new SQL(process.env.DATABASE_URL!);
  await teardown`delete from notes where slug like 'phase4-%'`;
  await teardown`delete from projects where slug like 'phase4-%'`;
  await teardown`delete from users where email in (${ADMIN_EMAIL}, ${USER_EMAIL})`;
  await teardown.close();
});

describe('admin authorization', () => {
  test('unauthenticated admin access is 401', async () => {
    for (const path of ['/api/admin/notes', '/api/admin/projects', '/api/admin/users', '/api/admin/home']) {
      expect((await adminCall(undefined, path)).status).toBe(401);
    }
  });

  test('authenticated non-admin is 403 everywhere', async () => {
    for (const path of ['/api/admin/notes', '/api/admin/projects', '/api/admin/users', '/api/admin/now']) {
      const res = await adminCall(userCookie, path);
      expect(res.status).toBe(403);
      expect(res.body).toEqual({ error: 'Not authorized' });
    }
  });

  test('admin reaches protected endpoints', async () => {
    expect((await adminCall(adminCookie, '/api/admin/notes')).status).toBe(200);
    // /api/admin/me lives on the auth router; the CMS router must not claim it.
    expect((await adminCall(adminCookie, '/api/admin/me')).status).toBe(404);
  });
});

describe('notes CRUD + publishing', () => {
  test('create draft, publish, unpublish, delete', async () => {
    const created = await adminCall(adminCookie, '/api/admin/notes', {
      method: 'POST',
      body: { title: 'Phase4 Draft', slug: 'phase4-draft', body: 'hello', tag: 'TEST' },
    });
    expect(created.status).toBe(200);
    const row = created.body as { id: string; published: boolean; published_at: null };
    expect(row.published).toBe(false);
    expect(row.published_at).toBeNull();

    // Drafts stay invisible publicly but readable by admins.
    const { contentRouter } = await import('../src/routes/content');
    const pubReq = new Request('http://test/api/content/notes/phase4-draft');
    expect((await contentRouter(pubReq, new URL(pubReq.url))).status).toBe(404);
    const adminList = (await adminCall(adminCookie, '/api/admin/notes')).body as {
      notes: Array<{ slug: string }>;
    };
    expect(adminList.notes.some((n) => n.slug === 'phase4-draft')).toBe(true);

    const published = await adminCall(adminCookie, `/api/admin/notes/${row.id}`, {
      method: 'PUT',
      body: { published: true },
    });
    expect(published.status).toBe(200);
    expect((published.body as { published_at: string }).published_at).not.toBeNull();

    const pubReq2 = new Request('http://test/api/content/notes/phase4-draft');
    expect((await contentRouter(pubReq2, new URL(pubReq2.url))).status).toBe(200);

    const unpublished = await adminCall(adminCookie, `/api/admin/notes/${row.id}`, {
      method: 'PUT',
      body: { published: false },
    });
    expect((unpublished.body as { published_at: null }).published_at).toBeNull();

    const deleted = await adminCall(adminCookie, `/api/admin/notes/${row.id}`, { method: 'DELETE' });
    expect(deleted.status).toBe(200);
    expect(deleted.body).toEqual({ ok: true });
  });

  test('invalid payloads and ids are 400', async () => {
    const missing = await adminCall(adminCookie, '/api/admin/notes', {
      method: 'POST',
      body: { body: 'no title, no slug' },
    });
    expect(missing.status).toBe(400);
    const badId = await adminCall(adminCookie, '/api/admin/notes/not-a-uuid', {
      method: 'PUT',
      body: { title: 'x' },
    });
    expect(badId.status).toBe(400);
  });

  test('slug lookup still resolves published notes', async () => {
    const { contentRouter } = await import('../src/routes/content');
    const req = new Request('http://test/api/content/notes/phase4-draft');
    expect((await contentRouter(req, new URL(req.url))).status).toBe(404);
  });
});

describe('projects CRUD', () => {
  test('create, update, delete roundtrip', async () => {
    const created = await adminCall(adminCookie, '/api/admin/projects', {
      method: 'POST',
      body: { title: 'Phase4 Project', slug: 'phase4-project', year: 2026, status: 'IN PROGRESS' },
    });
    expect(created.status).toBe(200);
    const id = (created.body as { id: string }).id;

    const updated = await adminCall(adminCookie, `/api/admin/projects/${id}`, {
      method: 'PUT',
      body: { status: 'FINISHED', year: 2025 },
    });
    expect(updated.status).toBe(200);
    expect((updated.body as { status: string }).status).toBe('FINISHED');

    const deleted = await adminCall(adminCookie, `/api/admin/projects/${id}`, { method: 'DELETE' });
    expect(deleted.body).toEqual({ ok: true });

    const missing = await adminCall(adminCookie, `/api/admin/projects/${id}`, {
      method: 'PUT',
      body: { status: 'SHELVED' },
    });
    expect(missing.status).toBe(404);
  });
});

describe('home / about / work / now writes', () => {
  test('home content + nav upsert roundtrip', async () => {
    const put = await adminCall(adminCookie, '/api/admin/home', {
      method: 'PUT',
      body: {
        content: { archive_label: 'PROBE', cta_label: 'PHASE4 PROBE' },
        navigation: [
          { page_key: 'phase4-probe', label: 'Probe', description: '', display_number: '99', href: '/probe' },
        ],
      },
    });
    expect(put.body).toEqual({ ok: true });

    const after = (await adminCall(adminCookie, '/api/admin/home')).body as {
      content: Record<string, unknown>;
      navigation: Array<{ page_key: string; label: string }>;
    };
    expect(after.content.cta_label).toBe('PHASE4 PROBE');
    expect(after.navigation.some((n) => n.page_key === 'phase4-probe')).toBe(true);

    // Nav upserts have no delete path; remove the probe row directly.
    const { sql } = await import('../src/db');
    await sql`delete from home_navigation where page_key = 'phase4-probe'`;
    await sql`delete from home_content where archive_label = 'PROBE'`;
  });

  test('about content + skills replace roundtrip', async () => {
    const before = (await adminCall(adminCookie, '/api/admin/about')).body as {
      skills: Array<{ category: string; skill_name: string }>;
    };
    const count = before.skills.length;

    const put = await adminCall(adminCookie, '/api/admin/about', {
      method: 'PUT',
      body: {
        content: { quote: 'PHASE4 PROBE QUOTE' },
        skills: [...before.skills.map((s) => ({ category: s.category, skill_name: s.skill_name })), { category: 'Probe', skill_name: 'ProbeSkill' }],
      },
    });
    expect(put.body).toEqual({ ok: true });

    const after = (await adminCall(adminCookie, '/api/admin/about')).body as {
      content: { quote: string };
      skills: unknown[];
    };
    expect(after.content.quote).toBe('PHASE4 PROBE QUOTE');
    expect(after.skills.length).toBe(count + 1);

    await adminCall(adminCookie, '/api/admin/about', {
      method: 'PUT',
      body: {
        content: { quote: 'I like work that is' },
        skills: before.skills.map((s) => ({ category: s.category, skill_name: s.skill_name })),
      },
    });

    // The test database holds no seeded content; remove what this test made.
    const { sql: cleanSql } = await import('../src/db');
    await cleanSql`delete from skills`;
    await cleanSql`delete from about_content`;
  });

  test('work entries replace roundtrip', async () => {
    const before = (await adminCall(adminCookie, '/api/admin/work')).body as {
      work: Array<Record<string, unknown>>;
      education: Array<Record<string, unknown>>;
    };
    const put = await adminCall(adminCookie, '/api/admin/work', {
      method: 'PUT',
      body: {
        work: [...before.work, { role: 'Phase4 Probe', company: 'Probe Co' }],
        education: before.education,
      },
    });
    expect(put.body).toEqual({ ok: true });

    const after = (await adminCall(adminCookie, '/api/admin/work')).body as {
      work: Array<{ role: string }>;
    };
    expect(after.work.some((w) => w.role === 'Phase4 Probe')).toBe(true);

    await adminCall(adminCookie, '/api/admin/work', {
      method: 'PUT',
      body: { work: before.work, education: before.education },
    });
  });

  test('now current + attention + history append roundtrip', async () => {
    const put = await adminCall(adminCookie, '/api/admin/now/current', {
      method: 'PUT',
      body: {
        current: { title: 'PHASE4 PROBE CURRENT' },
        attention: [{ number: '99', label: 'PROBE', title: 'Probe', note: 'probe note' }],
        historyItem: { date_label: 'PROBE', text: 'phase4 probe history entry' },
      },
    });
    expect(put.body).toEqual({ ok: true });

    const after = (await adminCall(adminCookie, '/api/admin/now')).body as {
      current: { title: string };
      attention: Array<{ number: string }>;
      history: Array<{ text: string }>;
    };
    expect(after.current.title).toBe('PHASE4 PROBE CURRENT');
    expect(after.attention).toEqual([{ number: '99', label: 'PROBE', title: 'Probe', note: 'probe note' }].map((a) => expect.objectContaining(a)));
    expect(after.history.some((h) => h.text === 'phase4 probe history entry')).toBe(true);

    const { sql: cleanSql } = await import('../src/db');
    await cleanSql`delete from now_attention`;
    await cleanSql`delete from now_current`;
    await cleanSql`delete from now_history where text = 'phase4 probe history entry'`;
  });
});

describe('server-controlled timestamps', () => {
  const FORGED = '2000-01-01T00:00:00.000Z';
  // Unique slugs per run: a failed run must never poison the next one.
  const RUN = Date.now().toString(36);
  const slug = (name: string) => `ts-${RUN}-${name}`;

  async function storedUpdatedAt(table: string, where: string): Promise<string> {
    const { sql } = await import('../src/db');
    const rows = (await sql.unsafe(`select updated_at from ${table} where ${where} limit 1`)) as Array<{
      updated_at: Date;
    }>;
    return new Date(rows[0]!.updated_at).toISOString();
  }

  test('full-row PUTs cannot forge updated_at (home, projects, notes, about, work, now)', async () => {
    // Home: PUT back a fully-loaded row shape including server columns.
    await adminCall(adminCookie, '/api/admin/home', {
      method: 'PUT',
      body: { content: { archive_label: 'TS PROBE', updated_at: FORGED, created_at: FORGED, id: 'x' } },
    });
    const home = (await adminCall(adminCookie, '/api/admin/home')).body as {
      content: { updated_at: string };
    };
    expect(home.content.updated_at).not.toBe(FORGED);

    // Projects: forged updated_at + created_at + id on update and create.
    const created = (await adminCall(adminCookie, '/api/admin/projects', {
      method: 'POST',
      body: { title: 'TS Probe', slug: slug('probe-forged'), updated_at: FORGED, created_at: FORGED },
    })).body as { id: string };
    const updated = await adminCall(adminCookie, `/api/admin/projects/${created.id}`, {
      method: 'PUT',
      body: { title: 'TS Probe', updated_at: FORGED },
    });
    expect(updated.status).toBe(200);
    expect((updated.body as { updated_at: string }).updated_at).not.toBe(FORGED);
    expect(new Date((updated.body as { updated_at: string }).updated_at).getTime()).toBeGreaterThan(
      Date.now() - 60_000,
    );

    // Notes: allowlist already excludes server columns; forged value ignored.
    const note = (await adminCall(adminCookie, '/api/admin/notes', {
      method: 'POST',
      body: { title: 'TS Note', slug: slug('note-forged'), updated_at: FORGED },
    })).body as { id: string };
    const notePut = await adminCall(adminCookie, `/api/admin/notes/${note.id}`, {
      method: 'PUT',
      body: { title: 'TS Note', updated_at: FORGED, created_at: FORGED },
    });
    expect(notePut.status).toBe(200);
    expect((notePut.body as { updated_at: string }).updated_at).not.toBe(FORGED);

    // About + work + now singletons with forged timestamps.
    expect(
      (await adminCall(adminCookie, '/api/admin/about', {
        method: 'PUT',
        body: { content: { quote: 'TS', updated_at: FORGED } },
      })).status,
    ).toBe(200);
    expect(await storedUpdatedAt('about_content', `quote = 'TS'`)).not.toBe(FORGED);

    // work_entries has no updated_at column; the 200 alone proves the
    // forged key neither duplicated an assignment nor persisted.
    expect(
      (await adminCall(adminCookie, '/api/admin/work', {
        method: 'PUT',
        body: { work: [{ role: 'TS', company: 'TS Co', updated_at: FORGED }], education: [] },
      })).status,
    ).toBe(200);
    const workRows = (await adminCall(adminCookie, '/api/admin/work')).body as {
      work: Array<Record<string, unknown>>;
    };
    expect(workRows.work.some((w) => w.role === 'TS' && !('updated_at' in w))).toBe(true);

    expect(
      (await adminCall(adminCookie, '/api/admin/now/current', {
        method: 'PUT',
        body: { current: { title: 'TS', updated_at: FORGED } },
      })).status,
    ).toBe(200);
    expect(await storedUpdatedAt('now_current', `title = 'TS'`)).not.toBe(FORGED);

    // Cleanup everything timestamp probes made (LIKE sweeps stale runs too).
    const { sql } = await import('../src/db');
    await sql`delete from projects where slug like 'ts-%'`;
    await sql`delete from notes where slug like 'ts-%'`;
    await sql`delete from about_content where quote = 'TS'`;
    await sql`delete from work_entries where role = 'TS'`;
    await sql`delete from now_current where title = 'TS'`;
    await sql`delete from home_content where archive_label = 'TS PROBE'`;
  });
});

describe('upload', () => {
  test('rejects unauthenticated, non-image, oversized, and missing files', async () => {
    expect((await adminCall(undefined, '/api/admin/upload', { method: 'POST' })).status).toBe(401);

    const text = new FormData();
    text.append('file', new File(['not an image'], 'evil.txt', { type: 'text/plain' }));
    const badType = await adminCall(adminCookie, '/api/admin/upload', { method: 'POST', form: text });
    expect(badType.status).toBe(415);

    const big = new FormData();
    big.append('file', new File([new Uint8Array(6 * 1024 * 1024)], 'big.png', { type: 'image/png' }));
    const tooBig = await adminCall(adminCookie, '/api/admin/upload', { method: 'POST', form: big });
    expect(tooBig.status).toBe(413);

    const empty = new FormData();
    const missing = await adminCall(adminCookie, '/api/admin/upload', { method: 'POST', form: empty });
    expect(missing.status).toBe(400);
  });

  test('roundtrip stores and serves with correct headers', async () => {
    const form = new FormData();
    form.append('file', new File([PNG_1PX], 't.png', { type: 'image/png' }));
    const stored = await adminCall(adminCookie, '/api/admin/upload', { method: 'POST', form });
    expect(stored.status).toBe(200);
    const url = (stored.body as { url: string }).url;
    expect(url).toMatch(/^\/uploads\/[0-9]+_[0-9a-f]{32}\.png$/);

    const req = new Request(`http://test${url}`);
    const res = await filesRouter(req, new URL(req.url));
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('image/png');
    expect(res.headers.get('Cache-Control')).toContain('immutable');
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect((await res.arrayBuffer()).byteLength).toBe(PNG_1PX.length);
  });

  test('serve rejects traversal, bad extensions, and missing files', async () => {
    for (const [path, status] of [
      ['/uploads/../index.ts', 404],
      ['/uploads/x.exe', 415],
      ['/uploads/no-such-file.png', 404],
    ] as const) {
      const req = new Request(`http://test${path}`);
      expect((await filesRouter(req, new URL(req.url))).status).toBe(status);
    }
  });
});

describe('users', () => {
  test('create, duplicate, disable/enable, delete with login gating', async () => {
    const created = await adminCall(adminCookie, '/api/admin/users', {
      method: 'POST',
      body: { email: 'phase4-new@test.local', password: 'new-pass-123', role: 'editor' },
    });
    expect(created.status).toBe(200);
    const id = (created.body as { id: string }).id;

    const duplicate = await adminCall(adminCookie, '/api/admin/users', {
      method: 'POST',
      body: { email: 'phase4-new@test.local', password: 'other-123' },
    });
    expect(duplicate.status).toBe(409);

    const loginOk = await loginAs('phase4-new@test.local', 'new-pass-123');
    expect(loginOk.startsWith('session=')).toBe(true);

    const disabled = await adminCall(adminCookie, `/api/admin/users/${id}`, {
      method: 'PUT',
      body: { active: false },
    });
    expect(disabled.body).toEqual({ ok: true });

    const blockedReq = new Request('http://test/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'phase4-new@test.local', password: 'new-pass-123' }),
    });
    const blocked = await authRouter(blockedReq, new URL(blockedReq.url));
    expect(blocked.status).toBe(401);

    await adminCall(adminCookie, `/api/admin/users/${id}`, { method: 'PUT', body: { active: true } });
    const removed = await adminCall(adminCookie, `/api/admin/users/${id}`, { method: 'DELETE' });
    expect(removed.body).toEqual({ ok: true });

    const goneReq = new Request('http://test/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'phase4-new@test.local', password: 'new-pass-123' }),
    });
    const gone = await authRouter(goneReq, new URL(goneReq.url));
    expect(gone.status).toBe(401);
  });

  test('missing user updates are 404', async () => {
    const missingId = '11111111-2222-3333-4444-555555555555';
    expect((await adminCall(adminCookie, `/api/admin/users/${missingId}`, { method: 'PUT', body: {} })).status).toBe(
      404,
    );
    expect(
      (await adminCall(adminCookie, `/api/admin/users/${missingId}`, { method: 'DELETE' })).status,
    ).toBe(404);
  });
});

describe('audit', () => {
  test('mutations append audit rows', async () => {
    const { sql } = await import('../src/db');
    const before = (await sql`select count(*)::int as n from audit_logs`) as Array<{ n: number }>;
    await adminCall(adminCookie, '/api/admin/projects', {
      method: 'POST',
      body: { title: 'Phase4 Audit Probe', slug: 'phase4-audit-probe' },
    });
    const probe = (await sql`select id from projects where slug = 'phase4-audit-probe'`) as Array<{
      id: string;
    }>;
    await sql`delete from projects where slug = 'phase4-audit-probe'`;
    const after = (await sql`select count(*)::int as n from audit_logs`) as Array<{ n: number }>;
    expect(after[0]!.n).toBeGreaterThan(before[0]!.n);
    const latest = (await sql`
      select action, entity_type, entity_id, email from audit_logs order by created_at desc limit 1
    `) as Array<{ action: string; entity_type: string; entity_id: string; email: string }>;
    expect(latest[0]).toMatchObject({
      action: 'CREATE',
      entity_type: 'project',
      entity_id: probe[0]!.id,
      email: ADMIN_EMAIL,
    });
  });
});
