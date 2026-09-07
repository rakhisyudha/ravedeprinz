-- 004_audit_logs.sql
-- Minimal append-only audit trail mirroring the old logAudit() calls.
-- Nothing in normal CRUD ever updates or deletes these rows.

create table if not exists audit_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references users (id) on delete set null,
  email       text,
  action      text not null,
  entity_type text not null,
  entity_id   text,
  before_data jsonb,
  after_data  jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists audit_logs_created_at_idx on audit_logs (created_at);
create index if not exists audit_logs_entity_idx on audit_logs (entity_type, entity_id);
