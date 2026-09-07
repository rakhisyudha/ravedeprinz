import { sql } from '../db';
import type { SessionUser } from '../auth/session';

// Append-only trail mirroring the old logAudit() call sites. Rows are
// never updated or deleted by admin CRUD.
export async function logAudit(
  admin: Pick<SessionUser, 'id' | 'email'>,
  action: string,
  entityType: string,
  entityId?: string,
  before?: unknown,
  after?: unknown,
): Promise<void> {
  try {
    await sql`
      insert into audit_logs (user_id, email, action, entity_type, entity_id, before_data, after_data)
      values (
        ${admin.id}, ${admin.email}, ${action}, ${entityType}, ${entityId ?? null},
        ${before === undefined ? null : JSON.stringify(before)},
        ${after === undefined ? null : JSON.stringify(after)}
      )
    `;
  } catch (error) {
    console.error('[audit] failed to record', error instanceof Error ? error.message : error);
  }
}
