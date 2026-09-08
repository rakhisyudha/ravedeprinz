import { sql } from '../db';
import { ensureUniqueSlug, slugify } from '../utils/slug';

// Admin content writes. Semantics mirror the previous Supabase-backed API
// exactly (including its quirks: skills wipe+insert, work delete-diff,
// raw project bodies, note published_at toggling). Route handlers stay
// SQL-free; all queries live here.

export type Row = Record<string, unknown>;
export type AdminError = { status: 400; message: string };

// Columns the server owns. Admin forms echo fully-loaded rows (id,
// created_at, updated_at included), so every client-supplied object is
// scrubbed before it reaches a SET clause: this makes a duplicated or
// forged updated_at structurally impossible, in one place, for all tables.
const SERVER_COLUMNS = new Set(['id', 'created_at', 'updated_at']);

export function writable(row: Row): Row {
  const out: Row = {};
  for (const [key, value] of Object.entries(row)) {
    if (!SERVER_COLUMNS.has(key)) out[key] = value;
  }
  return out;
}

function dbError(label: string, error: unknown): AdminError {
  const message = error instanceof Error ? error.message : String(error);
  return { status: 400, message: `${label}: ${message}` };
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export function assertUuid(id: string): AdminError | null {
  return isUuid(id) ? null : { status: 400, message: 'Invalid id' };
}

// ---------------------------------------------------------------------------
// Home
// ---------------------------------------------------------------------------

export async function getAdminHome(): Promise<{ content: Row | null; navigation: Row[] }> {
  const [contentRows, navRows] = await Promise.all([
    sql`select * from home_content limit 1`,
    sql`select * from home_navigation order by sort_order`,
  ]);
  return { content: (contentRows[0] as Row | undefined) ?? null, navigation: navRows as Row[] };
}

export async function putAdminHome(body: {
  content?: Row;
  navigation?: Array<Row & { id?: string; page_key: string }>;
}): Promise<void> {
  if (body.content) {
    const fields = writable(body.content);
    const existing = (await sql`select id from home_content limit 1`) as Array<{ id: string }>;
    if (existing.length > 0) {
      await sql`update home_content set ${sql(fields)}, updated_at = now() where id = ${existing[0]!.id}`;
    } else {
      await sql`insert into home_content ${sql(fields)}`;
    }
  }
  if (body.navigation) {
    for (const item of body.navigation) {
      const { id, page_key, ...rest } = item;
      const fields = writable(rest);
      if (id) {
        await sql`update home_navigation set ${sql(fields)}, updated_at = now() where id = ${id}`;
      } else if (page_key) {
        const cols = { ...fields, page_key } as Record<string, unknown>;
        await sql`
          insert into home_navigation ${sql(cols)}
          on conflict (page_key) do update set ${sql(fields as Record<string, unknown>)}, updated_at = now()
        `;
      }
    }
  }
}

// ---------------------------------------------------------------------------
// About (content singleton + skills wipe+insert)
// ---------------------------------------------------------------------------

export async function getAdminAbout(): Promise<{ content: Row | null; skills: Row[] }> {
  const [contentRows, skillRows] = await Promise.all([
    sql`select * from about_content limit 1`,
    sql`select * from skills order by sort_order`,
  ]);
  return { content: (contentRows[0] as Row | undefined) ?? null, skills: skillRows as Row[] };
}

export async function putAdminAbout(body: { content?: Row; skills?: Row[] }): Promise<void> {
  if (body.content) {
    const fields = writable(body.content);
    const existing = (await sql`select id from about_content limit 1`) as Array<{ id: string }>;
    if (existing.length > 0) {
      await sql`update about_content set ${sql(fields)}, updated_at = now() where id = ${existing[0]!.id}`;
    } else {
      await sql`insert into about_content ${sql(fields)}`;
    }
  }
  if (body.skills) {
    await sql`delete from skills`;
    for (const skill of body.skills) {
      await sql`insert into skills ${sql(writable(skill))}`;
    }
  }
}

// ---------------------------------------------------------------------------
// Work / education (delete rows the client removed, upsert the rest by id)
// ---------------------------------------------------------------------------

async function replaceRows(
  table: 'work_entries' | 'education_entries',
  rows: Row[],
): Promise<void> {
  const ids = rows
    .map((r) => r.id)
    .filter((v): v is string => typeof v === 'string' && v !== '');
  if (ids.length > 0) {
    await sql`delete from ${sql(table)} where id not in ${sql(ids)}`;
  } else {
    await sql`delete from ${sql(table)}`;
  }
  for (const row of rows) {
    // id is kept for the by-id upsert below; timestamps are always stripped.
    const { id, ...rest } = row;
    const fields = writable(rest);
    if (id) {
      await sql`
        insert into ${sql(table)} ${sql({ id, ...fields })}
        on conflict (id) do update set ${sql(fields)}
      `;
    } else {
      await sql`insert into ${sql(table)} ${sql(fields)}`;
    }
  }
}

export async function getAdminWork(): Promise<{ work: Row[]; education: Row[] }> {
  const [workRows, educationRows] = await Promise.all([
    sql`select * from work_entries order by sort_order`,
    sql`select * from education_entries order by sort_order`,
  ]);
  return { work: workRows as Row[], education: educationRows as Row[] };
}

export async function putAdminWork(body: { work?: Row[]; education?: Row[] }): Promise<void> {
  if (body.work) await replaceRows('work_entries', body.work);
  if (body.education) await replaceRows('education_entries', body.education);
}

// ---------------------------------------------------------------------------
// Projects CRUD (raw bodies, like the previous API)
// ---------------------------------------------------------------------------

export async function getAdminProjects(): Promise<{ projects: Row[] }> {
  const rows = await sql`select * from projects order by sort_order`;
  return { projects: rows as Row[] };
}

export async function createProject(body: Row): Promise<Row> {
  const rows = (await sql`insert into projects ${sql(writable(body))} returning *`) as Row[];
  return rows[0]!;
}

export async function updateProject(id: string, body: Row): Promise<Row | null> {
  const rows = (await sql`
    update projects set ${sql(writable(body))}, updated_at = now()
    where id = ${id} returning *
  `) as Row[];
  return rows[0] ?? null;
}

export async function deleteProject(id: string): Promise<number> {
  const rows = await sql`delete from projects where id = ${id} returning id`;
  return rows.length;
}

// ---------------------------------------------------------------------------
// Notes CRUD (locked slug: editable allowlist excludes it; the slug is
// the note's stable URL identity and can NEVER be modified after
// creation. createNote generates one server-side from the title; the
// slug field on update payloads is ignored.)
// ---------------------------------------------------------------------------

const NOTE_EDITABLE = ['title', 'body', 'tag', 'author', 'subtitle', 'image_url', 'sort_order'] as const;

export async function getAdminNotes(): Promise<{ notes: Row[] }> {
  const rows = await sql`select * from notes order by created_at desc`;
  return { notes: rows as Row[] };
}

export async function createNote(body: Row): Promise<Row> {
  const title = String(body.title ?? '').trim();
  if (!title) {
    throw Object.assign(new Error('Title is required'), { status: 400 });
  }
  // The slug is generated server-side from the title at create time
  // only. Subsequent edits to the title can never change the slug
  // (the editable allowlist excludes slug). Any slug in the request
  // body is ignored — there is exactly one slug-generation policy
  // and it lives here, so the URL identity is stable.
  const base = slugify(title);
  const slug = await ensureUniqueSlug(base, async (candidate) => {
    const rows = await sql`select 1 from notes where slug = ${candidate} limit 1`;
    return rows.length > 0;
  });

  const published = (body.published as boolean | undefined) ?? false;
  const rows = (await sql`
    insert into notes (title, slug, body, tag, author, subtitle, image_url, published, published_at)
    values (
      ${title}, ${slug}, ${(body.body as string | undefined) ?? ''},
      ${(body.tag as string | undefined) ?? 'REFLECTION'}, ${(body.author as string | null | undefined) ?? null},
      ${(body.subtitle as string | null | undefined) ?? null}, ${(body.image_url as string | null | undefined) ?? null},
      ${published}, ${published ? new Date().toISOString() : null}
    )
    returning *
  `) as Row[];
  return rows[0]!;
}

export async function updateNote(id: string, body: Row): Promise<{ row: Row | null; published?: boolean }> {
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const key of NOTE_EDITABLE) {
    if (key in body) update[key] = body[key];
  }
  let published: boolean | undefined;
  if (typeof body.published === 'boolean') {
    published = body.published;
    update.published = published;
    update.published_at = published ? new Date().toISOString() : null;
  }
  const rows = (await sql`
    update notes set ${sql(update)} where id = ${id} returning *
  `) as Row[];
  return { row: rows[0] ?? null, published };
}

export async function deleteNote(id: string): Promise<number> {
  const rows = await sql`delete from notes where id = ${id} returning id`;
  return rows.length;
}

// ---------------------------------------------------------------------------
// Now (singleton + wipe+insert attention + appended history)
// ---------------------------------------------------------------------------

export async function getAdminNow(): Promise<{ current: Row | null; attention: Row[]; history: Row[] }> {
  const [currentRows, attentionRows, historyRows] = await Promise.all([
    sql`select * from now_current limit 1`,
    sql`select * from now_attention order by sort_order`,
    sql`select * from now_history order by created_at desc`,
  ]);
  return {
    current: (currentRows[0] as Row | undefined) ?? null,
    attention: attentionRows as Row[],
    history: historyRows as Row[],
  };
}

export async function putAdminNowCurrent(body: {
  current?: Row;
  attention?: Row[];
  historyItem?: { date_label?: string; text?: string };
}): Promise<void> {
  if (body.current) {
    const fields = writable(body.current);
    const existing = (await sql`select id from now_current limit 1`) as Array<{ id: string }>;
    if (existing.length > 0) {
      await sql`update now_current set ${sql(fields)}, updated_at = now() where id = ${existing[0]!.id}`;
    } else {
      await sql`insert into now_current ${sql(fields)}`;
    }
  }
  if (body.attention) {
    await sql`delete from now_attention`;
    for (const item of body.attention) {
      await sql`insert into now_attention ${sql(writable(item))}`;
    }
  }
  if (body.historyItem?.text) {
    await sql`
      insert into now_history (date_label, text, source_type)
      values (${body.historyItem.date_label ?? 'NOW'}, ${body.historyItem.text}, 'UPDATE')
    `;
  }
}

export async function getAdminHistory(): Promise<{ history: Row[] }> {
  const rows = await sql`select * from now_history order by created_at desc`;
  return { history: rows as Row[] };
}

export async function createHistoryItem(body: Row): Promise<Row> {
  const rows = (await sql`insert into now_history ${sql(writable(body))} returning *`) as Row[];
  return rows[0]!;
}

export { dbError };
