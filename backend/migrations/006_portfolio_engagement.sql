-- 006_portfolio_engagement.sql
-- Case-study content and the contact/availability surface.
--
-- Additive only: existing project rows keep every current column value and
-- simply receive '' in the four new text columns. Re-running the file is
-- harmless — every statement is guarded, and the case-study length check is
-- wrapped in a duplicate_object handler.

alter table projects
  add column if not exists problem      text not null default '',
  add column if not exists what_built   text not null default '',
  add column if not exists key_decision text not null default '',
  add column if not exists outcome      text not null default '';

-- Second line of defence only; request validation in services/validation.ts
-- is the primary gate and reports which field failed.
do $$ begin
  alter table projects add constraint projects_case_study_len check (
    char_length(problem) <= 10000 and char_length(what_built) <= 10000 and
    char_length(key_decision) <= 10000 and char_length(outcome) <= 10000
  );
exception when duplicate_object then null; end $$;

alter table site_settings
  add column if not exists cv_url text,
  add column if not exists availability_status text not null default 'OPEN_TO_WORK'
    check (availability_status in ('OPEN_TO_WORK', 'OPEN_TO_FREELANCE', 'NOT_AVAILABLE')),
  add column if not exists availability_note text
    check (availability_note is null or char_length(availability_note) <= 120);
