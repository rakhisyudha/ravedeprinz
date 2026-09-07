import { SQL } from 'bun';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { config } from './config';

export const sql = new SQL(config.databaseUrl, { max: 10 });

const MIGRATIONS_DIR = join(import.meta.dir, '..', 'migrations');

/** Applies pending *.sql migrations in filename order. Safe to run on boot. */
export async function migrate(): Promise<void> {
  await sql`
    create table if not exists schema_migrations (
      version    text primary key,
      applied_at timestamptz not null default now()
    )
  `;
  const applied = new Set(
    (await sql`select version from schema_migrations`.values()).map(([v]: [unknown]) => v as string),
  );
  const files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith('.sql')).sort();
  for (const file of files) {
    if (applied.has(file)) continue;
    const statement = await readFile(join(MIGRATIONS_DIR, file), 'utf8');
    await sql.unsafe(statement);
    // ON CONFLICT keeps concurrent boots (and parallel test files) safe.
    await sql`insert into schema_migrations (version) values (${file}) on conflict do nothing`;
    console.log(`[db] applied migration ${file}`);
  }
}

/** Cheap liveness probe used to distinguish "db down" from "query failed". */
export async function checkConnection(): Promise<boolean> {
  try {
    await sql`select 1`;
    return true;
  } catch {
    return false;
  }
}
