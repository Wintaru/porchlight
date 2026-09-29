-- The author frames the cover for the feed card: the point of the picture that stays in
-- view (0 to 1 across and down) and how far it is zoomed in. The card cuts the picture
-- to one box shape on every screen, so one framing fits all of them. The defaults are
-- the centre, not zoomed: how every card showed its cover before.
alter table public.posts
  add column cover_focus_x double precision not null default 0.5,
  add column cover_focus_y double precision not null default 0.5,
  add column cover_zoom double precision not null default 1,
  add constraint posts_cover_focus_x_range check (cover_focus_x >= 0 and cover_focus_x <= 1),
  add constraint posts_cover_focus_y_range check (cover_focus_y >= 0 and cover_focus_y <= 1),
  -- Keep equal to COVER_ZOOM_MAX in packages/core (mirrors.test.ts).
  add constraint posts_cover_zoom_range check (cover_zoom >= 1 and cover_zoom <= 4);

grant select (cover_focus_x, cover_focus_y, cover_zoom) on public.posts to anon, authenticated;
