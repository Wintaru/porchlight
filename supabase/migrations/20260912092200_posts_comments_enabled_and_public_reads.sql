-- Issue #5: per-post comment switch (D20) and two read policies the post pages need.

-- The author decides in the editor whether a post takes comments (SPEC.md §5). Existing
-- comments stay visible when it is off; only new ones are refused (#7).
alter table public.posts
  add column comments_enabled boolean not null default true;

-- An unlisted post is excluded from every list (feed, tag page, sitemap, RSS) but is
-- readable by anyone with the link (SPEC.md §5). The #3 policy hid it from everyone but
-- its author, so /@handle/slug could never render one. Lists filter on visibility in
-- the read-model; the wall here is status only.
drop policy posts_public_read on public.posts;

create policy posts_public_read on public.posts
  for select to anon, authenticated
  using (status = 'published');

-- An erased profile keeps only id, handle, role and status (profiles_erased_is_blank),
-- so opening the row leaks nothing, and it is what lets /@handle answer 410 Gone for an
-- erased author instead of 404 (D11, SPEC.md §10). Suspended and banned stay hidden.
drop policy profiles_public_read on public.profiles;

create policy profiles_public_read on public.profiles
  for select to anon, authenticated
  using (status in ('active', 'erased'));

-- Replaces a post's tag set in one statement, so a save never leaves a post half-tagged.
-- p_tags is a JSON array of {slug, name}. A tag that exists keeps its name; a new one is
-- created. Server-only: every write goes through a Manager with the service role (D2).
create function public.replace_post_tags(p_post_id uuid, p_tags jsonb)
returns void
language plpgsql
set search_path = ''
as $$
begin
  -- Three statements, not one data-modifying CTE: a CTE's insert is invisible to the
  -- same statement's later select, so a brand-new tag would never get linked.
  insert into public.tags (slug, name)
  select distinct on (t.slug) t.slug, t.name
  from jsonb_to_recordset(p_tags) as t (slug text, name text)
  on conflict (slug) do nothing;

  delete from public.post_tags pt
  using public.tags t
  where pt.post_id = p_post_id
    and pt.tag_id = t.id
    and t.slug not in (select w.slug from jsonb_to_recordset(p_tags) as w (slug text));

  insert into public.post_tags (post_id, tag_id)
  select p_post_id, t.id
  from public.tags t
  where t.slug in (select w.slug from jsonb_to_recordset(p_tags) as w (slug text))
  on conflict do nothing;
end;
$$;

revoke execute on function public.replace_post_tags (uuid, jsonb) from public, anon, authenticated;
