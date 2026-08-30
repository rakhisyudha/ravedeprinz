-- ============================================================================
-- ravedeprinz CMS schema
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Global settings
-- ---------------------------------------------------------------------------
create table if not exists public.site_settings (
  id            uuid primary key default gen_random_uuid(),
  site_name     text not null default 'ravedeprinz',
  footer_name   text not null default 'ravedepr1nz',
  footer_label  text not null default 'PERSONAL ARCHIVE',
  hero_tagline  text not null default '',
  contact_email text,
  updated_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Home page
-- ---------------------------------------------------------------------------
create table if not exists public.home_content (
  id              uuid primary key default gen_random_uuid(),
  archive_label   text not null default '',
  archive_number  text not null default '001',
  headline_line_one  text not null default '',
  headline_line_two  text not null default '',
  headline_line_three text not null default '',
  headline_accent text not null default 'GUESS.',
  headline_period text not null default '.',
  headline_meta   text not null default '',
  intro           text not null default '',
  cta_label       text not null default 'ENTER THE ARCHIVE',
  cta_url         text not null default '/projects',
  hud_label       text not null default 'YEARS BUILDING',
  hud_subtitle    text not null default 'BACKEND / SYSTEMS / GO',
  years_building  int not null default 4,
  hud_noise_top   text not null default '// SYSTEM_04',
  hud_noise_bottom text not null default 'BUILD / REPEAT / SHIP',
  updated_at      timestamptz not null default now()
);

create table if not exists public.home_navigation (
  id            uuid primary key default gen_random_uuid(),
  page_key      text not null unique,
  label         text not null,
  description   text not null default '',
  display_number text not null default '',
  href          text not null,
  sort_order    int not null default 0,
  visible       boolean not null default true,
  updated_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- About page
-- ---------------------------------------------------------------------------
create table if not exists public.about_content (
  id             uuid primary key default gen_random_uuid(),
  eyebrow        text not null default '',
  quote          text not null default '',
  quote_accent   text not null default '',
  paragraph_one  text not null default '',
  paragraph_two  text not null default '',
  portrait_asset_id uuid,
  updated_at     timestamptz not null default now()
);

create table if not exists public.skills (
  id         uuid primary key default gen_random_uuid(),
  category   text not null,
  skill_name text not null,
  sort_order int not null default 0,
  visible    boolean not null default true
);

-- ---------------------------------------------------------------------------
-- Work / Education
-- ---------------------------------------------------------------------------
create table if not exists public.work_entries (
  id          uuid primary key default gen_random_uuid(),
  role        text not null,
  company     text not null,
  location    text not null default '',
  date_label  text not null default '',
  description text not null default '',
  stack       text not null default '',
  company_url text,
  sort_order  int not null default 0,
  visible     boolean not null default true
);

create table if not exists public.education_entries (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  institution text not null default '',
  date_label  text not null default '',
  description text not null default '',
  sort_order  int not null default 0,
  visible     boolean not null default true
);

-- ---------------------------------------------------------------------------
-- Projects
-- ---------------------------------------------------------------------------
create table if not exists public.projects (
  id                uuid primary key default gen_random_uuid(),
  title             text not null,
  slug              text not null unique,
  description       text not null default '',
  year              int not null default 0,
  status            text not null default 'FINISHED' check (status in ('FINISHED','IN PROGRESS','SHELVED')),
  deployment_status text not null default 'DEPLOYED' check (deployment_status in ('DEPLOYED','NOT_DEPLOYED')),
  stack             text not null default '',
  live_url          text,
  source_url        text,
  image_asset_id    uuid,
  sort_order        int not null default 0,
  featured          boolean not null default false,
  visible           boolean not null default true,
  published         boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Notes
-- ---------------------------------------------------------------------------
create table if not exists public.notes (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  slug         text not null unique,
  body         text not null default '',
  tag          text not null default 'REFLECTION',
  published    boolean not null default false,
  published_at timestamptz,
  sort_order   int not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Now page
-- ---------------------------------------------------------------------------
create table if not exists public.now_current (
  id           uuid primary key default gen_random_uuid(),
  updated_label text not null default '',
  label        text not null default 'CURRENTLY BUILDING',
  title        text not null default 'A CRM.',
  description  text not null default '',
  visible      boolean not null default true,
  updated_at   timestamptz not null default now()
);

create table if not exists public.now_attention (
  id         uuid primary key default gen_random_uuid(),
  number     text not null default '',
  label      text not null default '',
  title      text not null default '',
  note       text not null default '',
  sort_order int not null default 0,
  visible    boolean not null default true
);

create table if not exists public.now_history (
  id          uuid primary key default gen_random_uuid(),
  date_label  text not null default '',
  text        text not null default '',
  source_type text not null default 'UPDATE',
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Assets
-- ---------------------------------------------------------------------------
create table if not exists public.assets (
  id           uuid primary key default gen_random_uuid(),
  storage_path text not null,
  public_url   text not null,
  alt_text     text not null default '',
  asset_type   text not null default 'general',
  width        int,
  height       int,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Admin allowlist + audit
-- ---------------------------------------------------------------------------
create table if not exists public.admin_users (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid,
  email      text not null unique,
  role       text not null default 'editor',
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid,
  email       text,
  action      text not null,
  entity_type text not null,
  entity_id   text,
  before_data jsonb,
  after_data  jsonb,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Admin allowlist check (safe for anon / authenticated clients)
-- ---------------------------------------------------------------------------
create or replace function public.is_admin_user(target_email text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from admin_users
    where lower(email) = lower(target_email)
      and active = true
  );
$$;

grant execute on function public.is_admin_user(text) to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.site_settings     enable row level security;
alter table public.home_content      enable row level security;
alter table public.home_navigation   enable row level security;
alter table public.about_content     enable row level security;
alter table public.skills            enable row level security;
alter table public.work_entries      enable row level security;
alter table public.education_entries enable row level security;
alter table public.projects          enable row level security;
alter table public.notes             enable row level security;
alter table public.now_current       enable row level security;
alter table public.now_attention     enable row level security;
alter table public.now_history       enable row level security;
alter table public.assets            enable row level security;
alter table public.admin_users       enable row level security;
alter table public.audit_logs        enable row level security;

-- Public can read published content (select-only).
create policy "public reads site settings" on public.site_settings for select using (true);
create policy "public reads home content" on public.home_content for select using (true);
create policy "public reads home nav" on public.home_navigation for select using (visible = true);
create policy "public reads about content" on public.about_content for select using (true);
create policy "public reads skills" on public.skills for select using (visible = true);
create policy "public reads work" on public.work_entries for select using (visible = true);
create policy "public reads education" on public.education_entries for select using (visible = true);
create policy "public reads published projects" on public.projects for select using (published = true and visible = true);
create policy "public reads published notes" on public.notes for select using (published = true);
create policy "public reads now current" on public.now_current for select using (visible = true);
create policy "public reads now attention" on public.now_attention for select using (visible = true);
create policy "public reads now history" on public.now_history for select using (true);
create policy "public reads assets" on public.assets for select using (true);

-- Admin users are never directly readable by anon/authenticated. Only the
-- is_admin_user(target_email) RPC decides allowlist membership.
create policy "no direct reads of admin users" on public.admin_users for select using (false);
create policy "no direct reads of audit logs" on public.audit_logs for select using (false);

-- ---------------------------------------------------------------------------
-- CMS-managed images (files stored on the server, URL stored here)
-- ---------------------------------------------------------------------------
alter table public.about_content add column if not exists portrait_url text;
alter table public.projects add column if not exists image_url text;

-- ---------------------------------------------------------------------------
-- Notes: author + optional cover image (CMS-managed)
-- ---------------------------------------------------------------------------
alter table public.notes add column if not exists author text;
alter table public.notes add column if not exists image_url text;
alter table public.notes add column if not exists subtitle text;
