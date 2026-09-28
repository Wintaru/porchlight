-- Issue #100: a late autosave must not overwrite a newer Save.
--
-- `version` counts the writes to a post. The trigger moves it by one on every update,
-- whatever the update says, so no writer can set it or forget it. The editor sends the
-- version it last saw with each autosave, and the store updates only a row that still
-- has that version. A save that lost the race then changes nothing and says so.
--
-- A counter and not `updated_at`: the timestamp has microseconds, a JavaScript Date
-- keeps milliseconds, and an exact match would need the raw text carried everywhere.
--
-- Adding a column with a constant default rewrites no rows.

alter table public.posts
  add column version integer not null default 1;

comment on column public.posts.version is
  'Moves by one on every update (posts_bump_version). An autosave matches on it (#100).';

create function public.bump_post_version()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.version := old.version + 1;
  return new;
end;
$$;

create trigger posts_bump_version
  before update on public.posts
  for each row execute function public.bump_post_version();
