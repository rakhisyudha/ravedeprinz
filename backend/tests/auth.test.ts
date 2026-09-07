import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { SQL } from 'bun';

// Isolated database: never touches development data. Env must be set before
// importing src modules because db.ts binds DATABASE_URL at import time.
const TEST_DB = 'postgres://archive:archive@127.0.0.1:5433/ravedeprinz_test';
process.env.DATABASE_URL = TEST_DB;

const { migrate } = await import('../src/db');
const { authRouter, adminRouter } = await import('../src/routes/auth');
const { contentRouter } = await import('../src/routes/content');
const { hashPassword } = await import('../src/auth/password');
const { hashSessionToken, newSessionToken } = await import('../src/auth/tokens');

const ADMIN_EMAIL = 'admin@test.local';
const ADMIN_PASSWORD = 'correct-horse-123';
const USER_EMAIL = 'reader@test.local';
const USER_PASSWORD = 'reader-pass-123';

async function ensureTestDatabase(): Promise<void> {
  const maint = new SQL('postgres://archive:archive@127.0.0.1:5433/postgres');
  try {
    await maint.unsafe('CREATE DATABASE "ravedeprinz_test"');
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes('already exists')) throw error;
  }
  await maint.close();
}

async function callAuth(
  path: string,
  init?: { method?: string; body?: unknown; cookie?: string },
): Promise<{ status: number; body: unknown; setCookies: string[] }> {
  const headers: Record<string, string> = {};
  if (init?.body !== undefined) headers['Content-Type'] = 'application/json';
  if (init?.cookie) headers.cookie = init.cookie;
  const req = new Request(`http://test${path}`, {
    method: init?.method ?? 'GET',
    headers,
    body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
  const res = await authRouter(req, new URL(req.url));
  return {
    status: res.status,
    body: await res.json().catch(() => null),
    setCookies: typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : [],
  };
}

async function callAdmin(cookie?: string) {
  const req = new Request('http://test/api/admin/me', {
    headers: cookie ? { cookie } : {},
  });
  const res = await adminRouter(req, new URL(req.url));
  return { status: res.status, body: await res.json().catch(() => null) };
}

function sessionCookie(setCookies: string[]): string {
  const raw = setCookies.find((c) => c.startsWith('session='));
  if (!raw) throw new Error('expected a session Set-Cookie');
  return raw.split(';')[0]!;
}

let adminCookie = '';
let userCookie = '';

beforeAll(async () => {
  await ensureTestDatabase();
  await migrate();

  const adminHash = await hashPassword(ADMIN_PASSWORD);
  const userHash = await hashPassword(USER_PASSWORD);
  const adminRows = (await (
    await import('../src/db')
  ).sql`insert into users (email, password_hash) values (${ADMIN_EMAIL}, ${adminHash}) returning id`) as Array<{
    id: string;
  }>;
  const userRows = (await (
    await import('../src/db')
  ).sql`insert into users (email, password_hash) values (${USER_EMAIL}, ${userHash}) returning id`) as Array<{
    id: string;
  }>;
  const { sql } = await import('../src/db');
  await sql`insert into admin_users (user_id) values (${adminRows[0]!.id})`;
  await sql`
    insert into notes (slug, title, body, published, published_at)
    values ('phase3-probe-public', 'Probe Public', 'visible', true, now()),
           ('phase3-probe-draft', 'Probe Draft', 'hidden', false, null)
  `;
});

afterAll(async () => {
  // Dedicated teardown client: the shared src/db pool must stay open
  // because test files share the module registry.
  const teardown = new SQL(process.env.DATABASE_URL!);
  await teardown`delete from notes where slug like 'phase3-probe-%'`;
  await teardown`delete from users where email in (${ADMIN_EMAIL}, ${USER_EMAIL})`;
  await teardown.close();
});

describe('login', () => {
  test('valid credentials succeed with safe shape and HttpOnly cookie', async () => {
    const res = await callAuth('/api/auth/login', {
      method: 'POST',
      body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      user: { id: expect.any(String), email: ADMIN_EMAIL, is_admin: true },
    });
    const cookie = sessionCookie(res.setCookies);
    expect(cookie).toMatch(/^session=[0-9a-f]{64}$/);
    expect(res.setCookies[0]).toContain('HttpOnly');
    adminCookie = cookie;

    const userRes = await callAuth('/api/auth/login', {
      method: 'POST',
      body: { email: USER_EMAIL, password: USER_PASSWORD },
    });
    expect(userRes.status).toBe(200);
    expect((userRes.body as { user: { is_admin: boolean } }).user.is_admin).toBe(false);
    userCookie = sessionCookie(userRes.setCookies);
  });

  test('wrong password and unknown email share one generic 401', async () => {
    const wrong = await callAuth('/api/auth/login', {
      method: 'POST',
      body: { email: ADMIN_EMAIL, password: 'wrong-password' },
    });
    const unknown = await callAuth('/api/auth/login', {
      method: 'POST',
      body: { email: 'ghost@test.local', password: 'whatever-123' },
    });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body).toEqual(unknown.body);
    expect(wrong.body).toEqual({ error: 'Invalid email or password' });
  });

  test('malformed bodies are rejected as 400', async () => {
    for (const body of [{}, { email: 'not-an-email', password: 'x' }, { email: ADMIN_EMAIL }]) {
      const res = await callAuth('/api/auth/login', { method: 'POST', body });
      expect(res.status).toBe(400);
    }
  });

  test('emails normalize (case + whitespace)', async () => {
    const res = await callAuth('/api/auth/login', {
      method: 'POST',
      body: { email: '  ADMIN@test.local ', password: ADMIN_PASSWORD },
    });
    expect(res.status).toBe(200);
  });
});

describe('session', () => {
  test('valid session authenticates with admin flag', async () => {
    const req = new Request('http://test/api/auth/session', { headers: { cookie: adminCookie } });
    const res = await authRouter(req, new URL(req.url));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      authenticated: true,
      user: { id: expect.any(String), email: ADMIN_EMAIL, is_admin: true },
    });
  });

  test('missing, garbage, expired, and revoked sessions read as unauthenticated', async () => {
    const { sql } = await import('../src/db');
    const expiredToken = newSessionToken();
    const adminId = (
      (await sql`select id from users where email = ${ADMIN_EMAIL}`) as Array<{ id: string }>
    )[0]!.id;
    await sql`insert into sessions (user_id, token_hash, expires_at) values (${adminId}, ${hashSessionToken(expiredToken)}, now() - interval '1 hour')`;

    for (const cookie of [
      undefined,
      'session=garbage-token',
      `session=${expiredToken}`,
    ]) {
      const req = new Request('http://test/api/auth/session', {
        headers: cookie ? { cookie } : {},
      });
      const res = await authRouter(req, new URL(req.url));
      expect(await res.json()).toEqual({ authenticated: false });
    }
    await sql`delete from sessions where token_hash = ${hashSessionToken(expiredToken)}`;
  });

  test('revoked sessions cannot be reused', async () => {
    const login = await callAuth('/api/auth/login', {
      method: 'POST',
      body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    });
    const cookie = sessionCookie(login.setCookies);

    const logoutReq = new Request('http://test/api/auth/logout', {
      method: 'POST',
      headers: { cookie },
    });
    const logoutRes = await authRouter(logoutReq, new URL(logoutReq.url));
    expect(logoutRes.status).toBe(200);
    const cleared = logoutRes.headers.getSetCookie().find((c) => c.startsWith('session='));
    expect(cleared).toContain('Max-Age=0');

    const reuseReq = new Request('http://test/api/auth/session', { headers: { cookie } });
    const reuseRes = await authRouter(reuseReq, new URL(reuseReq.url));
    expect(await reuseRes.json()).toEqual({ authenticated: false });
  });

  test('logout without a session is safe and still clears the cookie', async () => {
    const res = await callAuth('/api/auth/logout', { method: 'POST' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});

describe('authorization', () => {
  test('unauthenticated admin access is 401', async () => {
    expect((await callAdmin()).status).toBe(401);
  });

  test('authenticated non-admin is 403', async () => {
    const res = await callAdmin(userCookie);
    expect(res.status).toBe(403);
    expect(res.body).toEqual({ error: 'Not authorized' });
  });

  test('authenticated admin is allowed', async () => {
    const res = await callAdmin(adminCookie);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      user: { id: expect.any(String), email: ADMIN_EMAIL, is_admin: true },
    });
  });
});

describe('seed-auth', () => {
  test('first run creates, second run skips, password never logged', async () => {
    process.env.AUTH_SEED_EMAIL = 'seeded@test.local';
    process.env.AUTH_SEED_PASSWORD = 'seed-secret-123';
    const { seedAuth } = await import('../src/seed-auth');

    const logged: string[] = [];
    const originalLog = console.log;
    console.log = (message?: unknown) => {
      logged.push(String(message));
    };
    try {
      const first = await seedAuth();
      const second = await seedAuth();
      expect(first.message).toContain('created admin user');
      expect(second.message).toContain('exists, skipping');
    } finally {
      console.log = originalLog;
    }
    // seedAuth itself never logs; assert nothing captured a secret anyway.
    expect(logged.join('\n')).not.toContain('seed-secret-123');

    const { sql } = await import('../src/db');
    const rows = (await sql`select id from users where email = 'seeded@test.local'`) as Array<{
      id: string;
    }>;
    expect(rows.length).toBe(1);
    const admins = (await sql`select user_id from admin_users where user_id = ${rows[0]!.id}`) as Array<{
      user_id: string;
    }>;
    expect(admins.length).toBe(1);
    const stored = (await sql`select password_hash from users where email = 'seeded@test.local'`) as Array<{
      password_hash: string;
    }>;
    expect(stored[0]!.password_hash).not.toContain('seed-secret-123');
    await sql`delete from users where email = 'seeded@test.local'`;
    delete process.env.AUTH_SEED_EMAIL;
    delete process.env.AUTH_SEED_PASSWORD;
  });
});

describe('public contract unchanged', () => {
  test('published-only reads still hold', async () => {
    const listReq = new Request('http://test/api/content/notes');
    const listRes = await contentRouter(listReq, new URL(listReq.url));
    const list = (await listRes.json()) as { notes: Array<{ slug: string }> };
    expect(list.notes.some((n) => n.slug === 'phase3-probe-public')).toBe(true);
    expect(list.notes.some((n) => n.slug === 'phase3-probe-draft')).toBe(false);

    const draftReq = new Request('http://test/api/content/notes/phase3-probe-draft');
    const draftRes = await contentRouter(draftReq, new URL(draftReq.url));
    expect(draftRes.status).toBe(404);
  });
});
