-- 002_auth_schema.sql
-- Email + password authentication (Phase 3). Custom sessions, no OAuth yet.
-- Only raw values the server ever sees: password at login (never stored),
-- session token at login (only its hash is stored).

create table if not exists users (
  id            uuid primary key default gen_random_uuid(),
  email         text not null unique,
  password_hash text not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists users_email_idx on users (email);

create table if not exists sessions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users (id) on delete cascade,
  token_hash  text not null unique,
  expires_at  timestamptz not null,
  created_at  timestamptz not null default now(),
  revoked_at  timestamptz
);
create index if not exists sessions_token_hash_idx on sessions (token_hash);
create index if not exists sessions_user_id_idx on sessions (user_id);
create index if not exists sessions_expires_at_idx on sessions (expires_at);

create table if not exists admin_users (
  user_id    uuid primary key references users (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists admin_users_user_id_idx on admin_users (user_id);
