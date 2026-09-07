// Idempotent auth seed: provisions the owner account from environment.
// Never logs the password, never overwrites an existing password, never
// duplicates rows. Skips quietly when AUTH_SEED_EMAIL is not configured.
import { sql } from './db';
import { hashPassword } from './auth/password';

export async function seedAuth(): Promise<{ message: string }> {
  const email = process.env.AUTH_SEED_EMAIL?.trim().toLowerCase() ?? '';
  const password = process.env.AUTH_SEED_PASSWORD ?? '';

  if (!email || !password) {
    return { message: '[seed-auth] AUTH_SEED_EMAIL/AUTH_SEED_PASSWORD not set — skipping.' };
  }

  const existing = (await sql`select id from users where email = ${email} limit 1`) as Array<{
    id: string;
  }>;
  if (existing.length > 0) {
    const admin = await sql`select user_id from admin_users where user_id = ${existing[0]!.id} limit 1`;
    if (admin.length === 0) {
      await sql`insert into admin_users (user_id) values (${existing[0]!.id})`;
    }
    return { message: '[seed-auth] admin user exists, skipping.' };
  }

  const created = (await sql`
    insert into users (email, password_hash) values (${email}, ${await hashPassword(password)})
    returning id
  `) as Array<{ id: string }>;
  await sql`insert into admin_users (user_id) values (${created[0]!.id})`;
  return { message: `[seed-auth] created admin user ${email}.` };
}

if (import.meta.main) {
  seedAuth().then(
    ({ message }) => {
      console.log(message);
      process.exit(0);
    },
    (error) => {
      console.error('[seed-auth] failed', error);
      process.exit(1);
    },
  );
}
