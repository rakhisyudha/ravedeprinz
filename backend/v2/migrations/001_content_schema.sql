-- 001_content_schema.sql
-- Public content tables for the ravedeprinz archive API.
-- Ported from the Supabase schema, minus Supabase-isms (RLS, policies,
-- service-role helpers): this API is the only reader, and it filters
-- published/visible rows in SQL. Auth tables arrive with Phase 3;
-- the asset-id columns were never read by the frontend and belong to
-- the future asset system (Phase 4), so they are deliberately omitted.

create extension if not exists pgcrypto;

create table if not exists site_settings (
  id            uuid primary key default gen_random_uuid(),
  site_name     text not null default 'ravedeprinz',
  footer_name   text not null default 'ravedepr1nz',
  footer_label  text not null default 'PERSONAL ARCHIVE',
  hero_tagline  text not null default '',
  contact_email text,
  updated_at    timestamptz not null default now()
);

create table if not exists home_content (
  id                uuid primary key default gen_random_uuid(),
  archive_label     text not null default '',
  archive_number    text not null default '001',
  headline_line_one text not null default '',
  headline_line_two text not null default '',
  headline_line_three text not null default '',
  headline_accent   text not null default 'GUESS.',
  headline_period   text not null default '.',
  headline_meta     text not null default '',
  intro             text not null default '',
  cta_label         text not null default 'ENTER THE ARCHIVE',
  cta_url           text not null default '/projects',
  hud_label         text not null default 'YEARS BUILDING',
  hud_subtitle      text not null default 'BACKEND / SYSTEMS / GO',
  years_building    int not null default 4,
  hud_noise_top     text not null default '// SYSTEM_04',
  hud_noise_bottom  text not null default 'BUILD / REPEAT / SHIP',
  updated_at        timestamptz not null default now()
);

create table if not exists home_navigation (
  id             uuid primary key default gen_random_uuid(),
  page_key       text not null unique,
  label          text not null,
  description    text not null default '',
  display_number text not null default '',
  href           text not null,
  sort_order     int not null default 0,
  visible        boolean not null default true,
  updated_at     timestamptz not null default now()
);

create table if not exists about_content (
  id            uuid primary key default gen_random_uuid(),
  eyebrow       text not null default '',
  quote         text not null default '',
  quote_accent  text not null default '',
  paragraph_one text not null default '',
  paragraph_two text not null default '',
  portrait_url  text,
  updated_at    timestamptz not null default now()
);

create table if not exists skills (
  id         uuid primary key default gen_random_uuid(),
  category   text not null,
  skill_name text not null,
  sort_order int not null default 0,
  visible    boolean not null default true
);

create table if not exists work_entries (
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

create table if not exists education_entries (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  institution text not null default '',
  date_label  text not null default '',
  description text not null default '',
  sort_order  int not null default 0,
  visible     boolean not null default true
);

create table if not exists projects (
  id                uuid primary key default gen_random_uuid(),
  title             text not null,
  slug              text not null unique,
  description       text not null default '',
  year              int not null default 0,
  status            text not null default 'FINISHED' check (status in ('FINISHED', 'IN PROGRESS', 'SHELVED')),
  deployment_status text not null default 'DEPLOYED' check (deployment_status in ('DEPLOYED', 'NOT_DEPLOYED')),
  stack             text not null default '',
  live_url          text,
  source_url        text,
  image_url         text,
  sort_order        int not null default 0,
  featured          boolean not null default false,
  visible           boolean not null default true,
  published         boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create table if not exists notes (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  slug         text not null unique,
  body         text not null default '',
  tag          text not null default 'REFLECTION',
  author       text,
  subtitle     text,
  image_url    text,
  published    boolean not null default false,
  published_at timestamptz,
  sort_order   int not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists now_current (
  id            uuid primary key default gen_random_uuid(),
  updated_label text not null default '',
  label         text not null default 'CURRENTLY BUILDING',
  title         text not null default 'A CRM.',
  description   text not null default '',
  visible       boolean not null default true,
  updated_at    timestamptz not null default now()
);

create table if not exists now_attention (
  id         uuid primary key default gen_random_uuid(),
  number     text not null default '',
  label      text not null default '',
  title      text not null default '',
  note       text not null default '',
  sort_order int not null default 0,
  visible    boolean not null default true
);

create table if not exists now_history (
  id          uuid primary key default gen_random_uuid(),
  date_label  text not null default '',
  text        text not null default '',
  source_type text not null default 'UPDATE',
  created_at  timestamptz not null default now()
);
