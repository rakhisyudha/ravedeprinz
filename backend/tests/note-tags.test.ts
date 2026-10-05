import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { SQL } from 'bun';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Integration tests for multi-tag notes, following tests/admin-cms.test.ts:
// isolated test database, env first and modules after.
const TEST_DB = 'postgres://archive:archive@127.0.0.1:5433/ravedeprinz_test';
process.env.DATABASE_URL = TEST_DB;

const { sql, migrate } = await import('../src/db');
const { authRouter } = await import('../src/routes/auth');
const { adminCmsRouter } = await import('../src/routes/admin');
const { contentRouter } = await import('../src/routes/content');
const { hashPassword } = await import('../src/auth/password');

const ADMIN_EMAIL = 'nt-admin@test.local';
const ADMIN_PASSWORD = 'nt-admin-123';

type NoteRow = {
  id: string;
  slug: string;
  tag: string;
  tags: string[];
  published: boolean;
};

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

let adminCookie = '';

async function admin(path: string, init?: { method?: string; body?: unknown }) {
  const headers: Record<string, string> = { cookie: adminCookie };
  let body: BodyInit | undefined;
  if (init?.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(init.body);
  }
  const req = new Request(`http://test${path}`, { method: init?.method ?? 'GET', headers, body });
  const res = await adminCmsRouter(req, new URL(req.url));
  return { status: res.status, body: (await res.json().catch(() => null)) as any };
}

async function publicNotes(): Promise<NoteRow[]> {
  const req = new Request('http://test/api/content/notes');
  const res = await contentRouter(req, new URL(req.url));
  return ((await res.json()) as { notes: NoteRow[] }).notes;
}

async function storedRow(id: string): Promise<{ tag: string; tags: string[] }> {
  const rows = (await sql`select tag, tags from notes where id = ${id}`) as Array<{ tag: string; tags: string[] }>;
  return { tag: rows[0]!.tag, tags: [...rows[0]!.tags] };
}

const sweep = async () => {
  await sql`delete from notes where slug like 'nt-%'`;
};

beforeAll(async () => {
  await ensureTestDatabase();
  await migrate();
  await sweep();
  await sql`delete from users where email = ${ADMIN_EMAIL}`;
  const rows = (await sql`
    insert into users (email, password_hash, role, active)
    values (${ADMIN_EMAIL}, ${await hashPassword(ADMIN_PASSWORD)}, 'owner', true)
    returning id
  `) as Array<{ id: string }>;
  await sql`insert into admin_users (user_id) values (${rows[0]!.id})`;
  adminCookie = await loginAs(ADMIN_EMAIL, ADMIN_PASSWORD);
});

afterAll(async () => {
  const teardown = new SQL(process.env.DATABASE_URL!);
  await teardown`delete from notes where slug like 'nt-%'`;
  await teardown`delete from users where email = ${ADMIN_EMAIL}`;
  await teardown.close();
});

describe('migration 007', () => {
  const migrationSql = readFileSync(join(import.meta.dir, '..', 'migrations', '007_note_tags.sql'), 'utf8');

  class Rollback extends Error {}

  /** Runs the migration against a scratch schema holding an old-shape notes table, then rolls back. */
  async function againstOldShape(seed: string[]) {
    const seen: { first: Array<{ tag: string; tags: string[] }>; second: Array<{ tag: string; tags: string[] }> } = {
      first: [],
      second: [],
    };
    try {
      await sql.begin(async (tx) => {
        await tx.unsafe('create schema nt_probe');
        await tx.unsafe('create table nt_probe.notes (id serial primary key, tag text not null)');
        for (const tag of seed) await tx`insert into nt_probe.notes (tag) values (${tag})`;
        await tx.unsafe('set local search_path to nt_probe');
        await tx.unsafe(migrationSql);
        seen.first = (await tx.unsafe('select tag, tags from notes order by id')) as typeof seen.first;
        // Hand-edit a row, then run the file again: a second run must not
        // backfill over it.
        await tx.unsafe(`update notes set tags = array['EDITED'] where id = 1`);
        await tx.unsafe(migrationSql);
        seen.second = (await tx.unsafe('select tag, tags from notes order by id')) as typeof seen.second;
        throw new Rollback();
      });
    } catch (error) {
      if (!(error instanceof Rollback)) throw error;
    }
    return seen;
  }

  test('existing single tags are backfilled, normalized, and never truncated', async () => {
    const long = 'a very long legacy tag';
    const { first } = await againstOldShape(['reflection', '  dev   log ', '', long]);
    expect(first.map((row) => [...row.tags])).toEqual([
      ['REFLECTION'],
      ['DEV LOG'],
      ['REFLECTION'],
      [long.toUpperCase()],
    ]);
    // The old column is untouched.
    expect(first.map((row) => row.tag)).toEqual(['reflection', '  dev   log ', '', long]);
  });

  test('running the file again changes nothing', async () => {
    const { second } = await againstOldShape(['reflection', 'log']);
    expect([...second[0]!.tags]).toEqual(['EDITED']);
    expect([...second[1]!.tags]).toEqual(['LOG']);
  });

  test('the database refuses zero or four tags even if the API were bypassed', async () => {
    const insert = async (tags: string[]): Promise<void> => {
      await sql`insert into notes (title, slug, tags) values ('NT Raw', ${`nt-raw-${tags.length}`}, ${sql.array(tags, 'TEXT')})`;
    };
    const outcome = async (tags: string[]): Promise<'accepted' | 'rejected'> => {
      try {
        await insert(tags);
        return 'accepted';
      } catch {
        return 'rejected';
      }
    };
    expect(await outcome([])).toBe('rejected');
    expect(await outcome(['a', 'b', 'c', 'd'])).toBe('rejected');
    expect(await outcome(['a', 'b', 'c'])).toBe('accepted');
    await sweep();
  });
});

describe('creating and reading notes with tags', () => {
  test('tags are stored normalized, in order, with tag kept equal to the first', async () => {
    const created = await admin('/api/admin/notes', {
      method: 'POST',
      body: { title: 'NT Three Tags', body: 'x', tags: ['memoir', ' Dev   Log ', 'reflection'], published: true },
    });
    expect(created.status).toBe(200);
    expect(created.body.tags).toEqual(['MEMOIR', 'DEV LOG', 'REFLECTION']);
    expect(created.body.tag).toBe('MEMOIR');

    const listed = (await publicNotes()).find((n) => n.slug === 'nt-three-tags');
    expect(listed?.tags).toEqual(['MEMOIR', 'DEV LOG', 'REFLECTION']);
    expect(listed?.tag).toBe('MEMOIR');

    const detailReq = new Request('http://test/api/content/notes/nt-three-tags');
    const detail = (await (await contentRouter(detailReq, new URL(detailReq.url))).json()) as NoteRow;
    expect(detail.tags).toEqual(['MEMOIR', 'DEV LOG', 'REFLECTION']);
  });

  test('the legacy single tag still works and becomes a one-item list', async () => {
    const created = await admin('/api/admin/notes', {
      method: 'POST',
      body: { title: 'NT Legacy', body: 'x', tag: 'test' },
    });
    expect(created.status).toBe(200);
    expect(created.body.tags).toEqual(['TEST']);
    expect(created.body.tag).toBe('TEST');
  });

  test('no tag input keeps the historical default', async () => {
    const created = await admin('/api/admin/notes', { method: 'POST', body: { title: 'NT Default', body: 'x' } });
    expect(created.status).toBe(200);
    expect(created.body.tags).toEqual(['REFLECTION']);
  });

  test('invalid tags are rejected with the field named and nothing is written', async () => {
    const bad: Array<[string, unknown]> = [
      ['four tags', ['a', 'b', 'c', 'd']],
      ['none', []],
      ['too long', ['x'.repeat(17)]],
      ['a comma', ['a,b']],
      ['not a list', 'a'],
    ];
    for (const [label, tags] of bad) {
      const res = await admin('/api/admin/notes', { method: 'POST', body: { title: `NT Bad ${label}`, body: 'x', tags } });
      expect(res.status).toBe(400);
      expect(res.body.field).toBe('tags');
    }
    const rows = await sql`select 1 from notes where slug like 'nt-bad-%'`;
    expect(rows.length).toBe(0);
  });
});

describe('updating note tags', () => {
  let id = '';

  beforeAll(async () => {
    const created = await admin('/api/admin/notes', {
      method: 'POST',
      body: { title: 'NT Update Me', body: 'x', tags: ['one', 'two'] },
    });
    id = created.body.id;
  });

  test('a valid list replaces the stored tags and moves tag with it', async () => {
    const res = await admin(`/api/admin/notes/${id}`, { method: 'PUT', body: { tags: ['three', 'one'] } });
    expect(res.status).toBe(200);
    expect(await storedRow(id)).toEqual({ tag: 'THREE', tags: ['THREE', 'ONE'] });
  });

  test('a save that carries no tag value leaves the tags alone', async () => {
    const res = await admin(`/api/admin/notes/${id}`, { method: 'PUT', body: { subtitle: 'changed' } });
    expect(res.status).toBe(200);
    expect(await storedRow(id)).toEqual({ tag: 'THREE', tags: ['THREE', 'ONE'] });
  });

  test('a full-row echo with both fields saves the list, not the stale single tag', async () => {
    const res = await admin(`/api/admin/notes/${id}`, {
      method: 'PUT',
      body: { title: 'NT Update Me', tag: 'THREE', tags: ['x', 'y', 'z'] },
    });
    expect(res.status).toBe(200);
    expect(await storedRow(id)).toEqual({ tag: 'X', tags: ['X', 'Y', 'Z'] });
  });

  test('an invalid list is rejected and the row, including other fields, is unchanged', async () => {
    const before = await storedRow(id);
    const res = await admin(`/api/admin/notes/${id}`, {
      method: 'PUT',
      body: { subtitle: 'must not be written', tags: ['a', 'b', 'c', 'd'] },
    });
    expect(res.status).toBe(400);
    expect(res.body.field).toBe('tags');
    expect(await storedRow(id)).toEqual(before);
    const rows = (await sql`select subtitle from notes where id = ${id}`) as Array<{ subtitle: string | null }>;
    expect(rows[0]!.subtitle).not.toBe('must not be written');
  });

  test('the legacy single tag on update also sets the list', async () => {
    const res = await admin(`/api/admin/notes/${id}`, { method: 'PUT', body: { tag: 'solo' } });
    expect(res.status).toBe(200);
    expect(await storedRow(id)).toEqual({ tag: 'SOLO', tags: ['SOLO'] });
  });
});
