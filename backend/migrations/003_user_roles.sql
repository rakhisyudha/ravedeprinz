-- 003_user_roles.sql
-- The old CMS tracked role/active per allowlist entry and the admin UI
-- edits both, so users carries them. Authorization still only checks
-- admin_users membership; role is display metadata, active gates login.
alter table users add column if not exists role text not null default 'editor';
alter table users add column if not exists active boolean not null default true;
