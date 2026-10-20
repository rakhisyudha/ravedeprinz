-- 008_drop_years_claim.sql
-- The hero card's "04 years building" numeral is gone: the card now draws a
-- contribution-grid R instead of a number, so nothing renders the counter
-- or the two labels that framed it. They stay in the database only as a
-- field the admin can edit and no page can show.
--
-- Dropped here so the claim cannot creep back by accident and so the
-- admin stops offering inputs with no effect. The two card stickers
-- (hud_noise_top / hud_noise_bottom) stay: they are what the card shows.
--
-- Additive-safety: none needed. No page, no admin field and no API
-- response reads these columns any more, so no data is lost that the
-- site can still use.

alter table home_content
  drop column if exists years_building,
  drop column if exists hud_label,
  drop column if exists hud_subtitle;
