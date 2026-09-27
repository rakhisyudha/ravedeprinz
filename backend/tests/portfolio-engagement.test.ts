import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { SQL } from 'bun';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Isolated database + isolated upload directory, mirroring
// tests/admin-cms.test.ts. Env first, modules after.
const TEST_DB = 'postgres://archive:archive@127.0.0.1:5433/ravedeprinz_test';
process.env.DATABASE_URL = TEST_DB;
const UPLOADS_TMP = mkdtempSync(join(tmpdir(), 'cms-pe-uploads-'));
process.env.UPLOADS_DIR = UPLOADS_TMP;

const { sql, migrate } = await import('../src/db');
const { contentRouter } = await import('../src/routes/content');
const { adminCmsRouter } = await import('../src/routes/admin');
const { filesRouter } = await import('../src/routes/files');
const { authRouter } = await import('../src/routes/auth');
const { hashPassword } = await import('../src/auth/password');

const ADMIN_EMAIL = 'pe-admin@test.local';
const ADMIN_PASSWORD = 'pe-admin-123';
const READER_EMAIL = 'pe-reader@test.local';
const READER_PASSWORD = 'pe-reader-123';

const PROBE_SLUG = 'pe-migration-probe';
const CASE_SLUG = 'pe-case-study';
const OTHER_SLUG = 'pe-other-project';
const HIDDEN_SLUG = 'pe-hidden-project';
const UNPUBLISHED_SLUG = 'pe-unpublished-project';

const PNG_1PX = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

// A minimal but genuine PDF: the upload path sniffs magic bytes only.
const PDF_BYTES = Buffer.from(
  '%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n',
  'latin1',
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

async function call(
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
  const req = new Request(`http://test${path}`, { method: init?.method ?? 'GET', headers, body });
  const res = await adminCmsRouter(req, new URL(req.url));
  return { status: res.status, body: await res.json().catch(() => null) };
}

async function content(path: string): Promise<{ status: number; body: any }> {
  const req = new Request(`http://test${path}`);
  const res = await contentRouter(req, new URL(req.url));
  return { status: res.status, body: await res.json().catch(() => null) };
}

async function fetchUpload(path: string): Promise<Response> {
  const req = new Request(`http://test${path}`);
  return filesRouter(req, new URL(req.url));
}

function pdfForm(bytes: Uint8Array, name = 'cv.pdf'): FormData {
  const form = new FormData();
  form.set('file', new File([new Uint8Array(bytes)], name, { type: 'application/pdf' }));
  return form;
}

function pngForm(bytes: Uint8Array): FormData {
  const form = new FormData();
  form.set('file', new File([new Uint8Array(bytes)], 'shot.png', { type: 'image/png' }));
  return form;
}

let adminCookie = '';
let readerCookie = '';
let migrationProbe: Record<string, unknown> | null = null;

beforeAll(async () => {
  await ensureTestDatabase();

  // Seed one project BEFORE migration 006 so the test can prove the
  // migration is additive for rows that already exist.
  const columns = (await sql`
    select column_name from information_schema.columns
    where table_name = 'projects' and column_name = 'problem'
  `).values() as unknown[][];
  if (columns.length === 0) {
    await sql`delete from projects where slug = ${PROBE_SLUG}`;
    const inserted = (await sql`
      insert into projects (title, slug, description, year, status, stack, sort_order, featured)
      values ('Probe', ${PROBE_SLUG}, 'probe description', 2020, 'FINISHED', 'Go', 3, true)
      returning *
    `) as Array<Record<string, unknown>>;
    migrationProbe = inserted[0]!;
  }

  await migrate();

  // Sweep residue so a previously failed run never poisons this one.
  await sql`delete from projects where slug like 'pe-%'`;

  const adminRows = (await sql`
    insert into users (email, password_hash, role, active)
    values (${ADMIN_EMAIL}, ${await hashPassword(ADMIN_PASSWORD)}, 'owner', true)
    on conflict (email) do update set password_hash = excluded.password_hash
    returning id
  `) as Array<{ id: string }>;
  await sql`insert into admin_users (user_id) values (${adminRows[0]!.id}) on conflict do nothing`;
  await sql`
    insert into users (email, password_hash, role, active)
    values (${READER_EMAIL}, ${await hashPassword(READER_PASSWORD)}, 'editor', true)
    on conflict (email) do update set password_hash = excluded.password_hash
  `;

  adminCookie = await loginAs(ADMIN_EMAIL, ADMIN_PASSWORD);
  readerCookie = await loginAs(READER_EMAIL, READER_PASSWORD);

  await sql`
    insert into projects (title, slug, description, year, status, deployment_status, stack, sort_order, featured, visible, published)
    values
      ('Case Study Project', ${CASE_SLUG}, 'A case study.', 2024, 'IN PROGRESS', 'DEPLOYED', 'Go', 1, true, true, true),
      ('Other Project', ${OTHER_SLUG}, 'Another one.', 2023, 'FINISHED', 'DEPLOYED', 'React', 2, true, true, true),
      ('Hidden Project', ${HIDDEN_SLUG}, 'Hidden.', 2022, 'FINISHED', 'DEPLOYED', 'PHP', 3, false, false, true),
      ('Unpublished Project', ${UNPUBLISHED_SLUG}, 'Draft.', 2021, 'FINISHED', 'DEPLOYED', 'Vue', 4, false, true, false)
  `;
});

afterAll(async () => {
  const teardown = new SQL(process.env.DATABASE_URL!);
  await teardown`delete from projects where slug like 'pe-%'`;
  await teardown`delete from users where email in (${ADMIN_EMAIL}, ${READER_EMAIL})`;
  await teardown.close();
});

describe('migration 006 is additive', () => {
  test('existing rows keep their values and the new columns default to empty strings', async () => {
    const rows = (await sql`select * from projects where slug = ${PROBE_SLUG}`) as Array<
      Record<string, unknown>
    >;
    if (rows.length === 0) {
      // Another test file migrated the database first; insert now and assert
      // the same defaults, which still proves the columns exist and default.
      await sql`
        insert into projects (title, slug, year, status, sort_order)
        values ('Probe', ${PROBE_SLUG}, 2020, 'FINISHED', 3)
      `;
    }
    const row = (await sql`select * from projects where slug = ${PROBE_SLUG}`).at(0) as Record<
      string,
      unknown
    >;

    expect(row.problem).toBe('');
    expect(row.what_built).toBe('');
    expect(row.key_decision).toBe('');
    expect(row.outcome).toBe('');
    expect(row.title).toBe('Probe');
    expect(row.year).toBe(2020);
    expect(row.status).toBe('FINISHED');
    expect(row.sort_order).toBe(3);
    expect(row.featured).toBe(true);
  });

  test('site_settings gained cv_url, availability_status, and availability_note', async () => {
    const columns = (await sql`
      select column_name from information_schema.columns
      where table_name = 'site_settings'
        and column_name in ('cv_url', 'availability_status', 'availability_note')
      order by column_name
    `).values() as unknown[][];
    expect(columns.map((row) => row[0])).toEqual(['availability_note', 'availability_status', 'cv_url']);
  });

  test('the public site payload carries the new columns', async () => {
    const res = await content('/api/content/site');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('cv_url');
    expect(res.body).toHaveProperty('availability_status');
    expect(res.body).toHaveProperty('availability_note');
  });
});

describe('GET /api/content/projects/{slug}', () => {
  test('an exact match returns the project with all five case-study fields', async () => {
    const res = await content(`/api/content/projects/${CASE_SLUG}`);
    expect(res.status).toBe(200);
    expect(res.body.slug).toBe(CASE_SLUG);
    expect(res.body.title).toBe('Case Study Project');
    for (const field of ['problem', 'what_built', 'key_decision', 'outcome', 'stack']) {
      expect(res.body).toHaveProperty(field);
      expect(typeof res.body[field]).toBe('string');
    }
  });

  test('a case mismatch is a 404 with no project fields', async () => {
    const res = await content(`/api/content/projects/${CASE_SLUG.toUpperCase()}`);
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Not found' });
  });

  test('a hidden or unpublished project is a 404 with no project fields', async () => {
    for (const slug of [HIDDEN_SLUG, UNPUBLISHED_SLUG]) {
      const res = await content(`/api/content/projects/${slug}`);
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Not found' });
    }
  });

  test('a percent-encoded slug resolves to the same project', async () => {
    const res = await content(`/api/content/projects/${encodeURIComponent(CASE_SLUG)}`);
    expect(res.status).toBe(200);
    expect(res.body.slug).toBe(CASE_SLUG);
  });
});

describe('project writes', () => {
  test('updating one project leaves the others unchanged', async () => {
    const before = (await sql`select title, sort_order, featured from projects where slug = ${OTHER_SLUG}`).at(
      0,
    ) as Record<string, unknown>;

    const target = (await sql`select id from projects where slug = ${CASE_SLUG}`).at(0) as { id: string };
    const res = await call(adminCookie, `/api/admin/projects/${target.id}`, {
      method: 'PUT',
      body: { featured: false, sort_order: 9 },
    });
    expect(res.status).toBe(200);

    const after = (await sql`select title, sort_order, featured from projects where slug = ${OTHER_SLUG}`).at(
      0,
    ) as Record<string, unknown>;
    expect(after).toEqual(before);
  });

  test('case-study text round-trips exactly, including unicode and 10,000 characters', async () => {
    const target = (await sql`select id from projects where slug = ${CASE_SLUG}`).at(0) as { id: string };
    const payload = {
      problem: '日本語 — emoji 🚀 and a very long tail '.repeat(10),
      what_built: 'a'.repeat(10000),
      key_decision: '  leading and trailing spaces kept  ',
      outcome: 'line one\nline two\n\nline four',
      stack: 'Go · Postgres',
    };
    expect(payload.what_built.length).toBe(10000);

    const saved = await call(adminCookie, `/api/admin/projects/${target.id}`, {
      method: 'PUT',
      body: payload,
    });
    expect(saved.status).toBe(200);

    const fetched = await content(`/api/content/projects/${CASE_SLUG}`);
    expect(fetched.body.problem).toBe(payload.problem);
    expect(fetched.body.what_built).toBe(payload.what_built);
    expect(fetched.body.key_decision).toBe(payload.key_decision);
    expect(fetched.body.outcome).toBe(payload.outcome);
    expect(fetched.body.stack).toBe(payload.stack);
  });

  test('an over-long case-study field is a 400 naming the field and changes nothing', async () => {
    const target = (await sql`select id, problem from projects where slug = ${CASE_SLUG}`).at(0) as {
      id: string;
      problem: string;
    };
    const res = await call(adminCookie, `/api/admin/projects/${target.id}`, {
      method: 'PUT',
      body: { outcome: 'x'.repeat(10001) },
    });
    expect(res.status).toBe(400);
    expect((res.body as { field: string }).field).toBe('outcome');

    const after = (await sql`select problem from projects where slug = ${CASE_SLUG}`).at(0) as {
      problem: string;
    };
    expect(after.problem).toBe(target.problem);
  });

  test('a bad sort_order is a 400 naming sort_order', async () => {
    const target = (await sql`select id, sort_order from projects where slug = ${CASE_SLUG}`).at(0) as {
      id: string;
      sort_order: number;
    };
    const res = await call(adminCookie, `/api/admin/projects/${target.id}`, {
      method: 'PUT',
      body: { sort_order: 10000 },
    });
    expect(res.status).toBe(400);
    expect((res.body as { field: string }).field).toBe('sort_order');
    const after = (await sql`select sort_order from projects where slug = ${CASE_SLUG}`).at(0) as {
      sort_order: number;
    };
    expect(after.sort_order).toBe(target.sort_order);
  });

  test('a slug conflict is a 400 and leaves both rows unchanged', async () => {
    const other = (await sql`select id, title, description from projects where slug = ${OTHER_SLUG}`).at(
      0,
    ) as Record<string, unknown>;
    const target = (await sql`select id, title from projects where slug = ${CASE_SLUG}`).at(0) as Record<
      string,
      unknown
    >;

    const res = await call(adminCookie, `/api/admin/projects/${String(target.id)}`, {
      method: 'PUT',
      body: { slug: OTHER_SLUG },
    });
    expect(res.status).toBe(400);
    expect((res.body as { field: string }).field).toBe('slug');
    expect((res.body as { error: string }).error).toContain(OTHER_SLUG);

    const otherAfter = (await sql`select id, title, description from projects where slug = ${OTHER_SLUG}`).at(
      0,
    ) as Record<string, unknown>;
    const targetAfter = (await sql`select id, title, slug from projects where slug = ${CASE_SLUG}`).at(
      0,
    ) as Record<string, unknown>;
    expect(otherAfter).toEqual(other);
    expect(targetAfter).toEqual(target);
  });
});

describe('site settings admin endpoints', () => {
  test('401 without a cookie and 403 for an authenticated non-admin', async () => {
    for (const method of ['GET', 'PUT']) {
      const anonymous = await call(undefined, '/api/admin/site-settings', {
        method,
        body: method === 'PUT' ? { availability_status: 'OPEN_TO_WORK' } : undefined,
      });
      expect(anonymous.status).toBe(401);
      const reader = await call(readerCookie, '/api/admin/site-settings', {
        method,
        body: method === 'PUT' ? { availability_status: 'OPEN_TO_WORK' } : undefined,
      });
      expect(reader.status).toBe(403);
    }
  });

  test('the CV upload endpoint is 401 without a cookie and 403 for a reader', async () => {
    const anonymous = await call(undefined, '/api/admin/upload/cv', { method: 'POST', form: pdfForm(PDF_BYTES) });
    expect(anonymous.status).toBe(401);
    const reader = await call(readerCookie, '/api/admin/upload/cv', {
      method: 'POST',
      form: pdfForm(PDF_BYTES),
    });
    expect(reader.status).toBe(403);
  });

  test('an invalid PUT is a 400 naming the field and leaves the row unchanged', async () => {
    await call(adminCookie, '/api/admin/site-settings', {
      method: 'PUT',
      body: { contact_email: 'before@example.com', availability_status: 'OPEN_TO_WORK', availability_note: null },
    });
    const before = (await call(adminCookie, '/api/admin/site-settings')).body as Record<string, unknown>;

    for (const [body, field] of [
      [{ contact_email: 'nope', availability_status: 'OPEN_TO_WORK' }, 'contact_email'],
      [{ contact_email: 'a@b.co', availability_status: 'SOMETIMES' }, 'availability_status'],
      [{ contact_email: 'a@b.co', availability_status: 'OPEN_TO_WORK', availability_note: 'n'.repeat(121) }, 'availability_note'],
    ] as Array<[Record<string, unknown>, string]>) {
      const res = await call(adminCookie, '/api/admin/site-settings', { method: 'PUT', body });
      expect(res.status).toBe(400);
      expect((res.body as { field: string }).field).toBe(field);
    }

    const after = (await call(adminCookie, '/api/admin/site-settings')).body as Record<string, unknown>;
    expect(after).toEqual(before);
  });

  test('a valid PUT is returned by the following GET', async () => {
    const body = {
      contact_email: '  hello@ravedeprinz.me  ',
      availability_status: 'OPEN_TO_FREELANCE',
      availability_note: 'Booking from October.',
      cv_url: '/uploads/pe-existing-cv.pdf',
    };
    const put = await call(adminCookie, '/api/admin/site-settings', { method: 'PUT', body });
    expect(put.status).toBe(200);
    expect(put.body).toEqual({
      contact_email: 'hello@ravedeprinz.me',
      cv_url: '/uploads/pe-existing-cv.pdf',
      availability_status: 'OPEN_TO_FREELANCE',
      availability_note: 'Booking from October.',
    });

    const get = (await call(adminCookie, '/api/admin/site-settings')).body as Record<string, unknown>;
    expect(get).toEqual(put.body as Record<string, unknown>);
  });

  test('a blank email and a blank note are stored as null', async () => {
    const res = await call(adminCookie, '/api/admin/site-settings', {
      method: 'PUT',
      body: { contact_email: '   ', availability_status: 'NOT_AVAILABLE', availability_note: '   ' },
    });
    expect(res.status).toBe(200);
    expect((res.body as { contact_email: unknown }).contact_email).toBeNull();
    expect((res.body as { availability_note: unknown }).availability_note).toBeNull();
  });
});

describe('CV upload', () => {
  test('a PDF is accepted and served as application/pdf with an attachment disposition', async () => {
    const res = await call(adminCookie, '/api/admin/upload/cv', {
      method: 'POST',
      form: pdfForm(PDF_BYTES),
    });
    expect(res.status).toBe(200);
    const url = (res.body as { url: string }).url;
    expect(url).toMatch(/^\/uploads\/\d+_[0-9a-f]+\.pdf$/);

    const served = await fetchUpload(url);
    expect(served.status).toBe(200);
    expect(served.headers.get('Content-Type')).toBe('application/pdf');
    expect(served.headers.get('Content-Disposition')).toBe('attachment');
    expect(served.headers.get('X-Content-Type-Options')).toBe('nosniff');
  });

  test('the upload endpoint never writes cv_url by itself', async () => {
    await call(adminCookie, '/api/admin/site-settings', {
      method: 'PUT',
      body: { contact_email: 'keep@example.com', availability_status: 'OPEN_TO_WORK', availability_note: null, cv_url: '/uploads/pe-keep.pdf' },
    });
    const before = (await call(adminCookie, '/api/admin/site-settings')).body as { cv_url: string };

    const ok = await call(adminCookie, '/api/admin/upload/cv', { method: 'POST', form: pdfForm(PDF_BYTES) });
    expect(ok.status).toBe(200);
    const afterOk = (await call(adminCookie, '/api/admin/site-settings')).body as { cv_url: string };
    expect(afterOk.cv_url).toBe(before.cv_url);

    const png = await call(adminCookie, '/api/admin/upload/cv', { method: 'POST', form: pngForm(PNG_1PX) });
    expect(png.status).toBe(415);

    const huge = await call(adminCookie, '/api/admin/upload/cv', {
      method: 'POST',
      form: pdfForm(Buffer.concat([PDF_BYTES, Buffer.alloc(5 * 1024 * 1024 + 1 - PDF_BYTES.length, 0x20)])),
    });
    expect(huge.status).toBe(413);

    const afterFailures = (await call(adminCookie, '/api/admin/site-settings')).body as { cv_url: string };
    expect(afterFailures.cv_url).toBe(before.cv_url);
  });

  test('5 MB exactly is still accepted', async () => {
    const filler = 5 * 1024 * 1024 - PDF_BYTES.length;
    const res = await call(adminCookie, '/api/admin/upload/cv', {
      method: 'POST',
      form: pdfForm(Buffer.concat([PDF_BYTES, Buffer.alloc(filler, 0x20)])),
    });
    expect(res.status).toBe(200);
  });

  test('the image upload field still rejects a PDF', async () => {
    const res = await call(adminCookie, '/api/admin/upload', { method: 'POST', form: pdfForm(PDF_BYTES) });
    expect(res.status).toBe(415);
  });

  test('the image upload field still accepts a PNG', async () => {
    const res = await call(adminCookie, '/api/admin/upload', { method: 'POST', form: pngForm(PNG_1PX) });
    expect(res.status).toBe(200);
    expect((res.body as { url: string }).url).toMatch(/^\/uploads\/\d+_[0-9a-f]+\.png$/);
  });
});
