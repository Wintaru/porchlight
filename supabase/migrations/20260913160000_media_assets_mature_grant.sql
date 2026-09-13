-- `media_assets.mature` (added by 20260913000000_moderation_manager_columns.sql) was
-- never added to the public column grant, so the browser roles could not read it —
-- issue #15 needs it to keep a mature item's own cover out of its OpenGraph card and
-- JSON-LD (SPEC.md §9, D18: "mature items always use the branded card"). Column grants
-- accumulate, so this only adds the one column to the existing grant.
grant select (mature) on public.media_assets to anon, authenticated;
