-- 005_notes_stable_slugs.sql
-- Lock the slug behavior: slug is generated server-side at note creation
-- only, and after creation it can never change via update. The slug is
-- the note's public URL identity; created_at preserves the original
-- publication date (now used by the Story renderer), distinct from
-- updated_at which moves on every edit.
--
-- Nothing destructive here. The notes table already has id (uuid),
-- slug (text unique), title, body, tag, author, subtitle, image_url,
-- published, published_at, sort_order, created_at, updated_at. This
-- migration introduces one new flag the brief sketches — the rest of
-- the change is at the service layer (createNote/updateNote + utils/slug).

alter table notes
  add column if not exists featured_on_now boolean not null default false;
