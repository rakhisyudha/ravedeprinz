// Standalone migration entry point. Run on container boot BEFORE seeds so
// any seed query (`select id from ...`) finds the expected tables.
import { migrate } from './db';

try {
  await migrate();
  console.log('[migrate] done');
  process.exit(0);
} catch (error) {
  console.error('[migrate] failed', error);
  process.exit(1);
}
