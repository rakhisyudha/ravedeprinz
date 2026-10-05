-- 007_note_tags.sql
-- Up to three tags per note.
--
-- Additive only. The single-value `tag` column stays exactly as it was and
-- the API keeps it equal to the first entry of `tags` on every write, so a
-- frontend that still reads `tag` keeps working and the app can be rolled
-- back without touching the data.
--
-- The whole block runs only when `tags` does not exist yet, so the backfill
-- happens once and re-running the file is harmless. The backfill normalizes
-- the old value the way the API does (collapse whitespace, trim, uppercase)
-- and falls back to REFLECTION, the column's historical default, when the old
-- value was blank. It deliberately does not truncate: an existing tag longer
-- than the new 16-character write limit keeps displaying and only has to be
-- shortened the next time that note is edited.

do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = current_schema() and table_name = 'notes' and column_name = 'tags'
  ) then
    alter table notes add column tags text[] not null default array['REFLECTION'];

    update notes
       set tags = array[
         coalesce(nullif(upper(btrim(regexp_replace(tag, '\s+', ' ', 'g'))), ''), 'REFLECTION')
       ];

    -- Second line of defence only; services/validation.ts is the primary gate
    -- and reports which field failed.
    alter table notes add constraint notes_tags_count check (cardinality(tags) between 1 and 3);
  end if;
end $$;
