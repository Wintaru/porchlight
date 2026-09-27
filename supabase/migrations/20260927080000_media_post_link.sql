-- Which post an upload belongs to (#80). An upload joins the first post of its owner
-- that uses it: the post's body names the upload's id (every public copy is stored as
-- `<id>.<extension>`, so its URL carries the id) or the post's cover is the upload. A
-- trigger does the linking, not a Manager write, so every path that saves a post (the
-- editor, an agent, an admin) links without having to remember to. Same pattern as
-- `keep_post_revision`.
--
-- An upload that no post has used yet has no post. Deleting the post leaves its uploads
-- with none: they stay the member's, and quota, retention and locks are unchanged.
alter table public.media_assets
  add column post_id uuid references public.posts (id) on delete set null;

create index media_assets_post_idx on public.media_assets (post_id);
-- The anonymous branch of `link_post_media` below looks uploads up by this column.
create index media_assets_anonymous_author_idx on public.media_assets (anonymous_author_id);

-- The one test of "this post uses this upload", for the linking and for the prune.
create function public.post_uses_media(p_body_md text, p_cover_media_id uuid, p_media_id uuid)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_cover_media_id is not distinct from p_media_id
    or position(p_media_id::text in p_body_md) > 0;
$$;

-- Links the owner's uploads that this post uses and that no post holds yet. An upload
-- another post already holds keeps that post: it belongs where it was first used. One
-- equality per branch, so each lookup uses that owner column's index.
create function public.link_post_media(p_post_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
declare
  post record;
begin
  select id, author_id, anonymous_author_id, body_md, cover_media_id
  into post
  from public.posts
  where id = p_post_id;
  if not found then
    return;
  end if;

  if post.author_id is not null then
    update public.media_assets m
    set post_id = post.id
    where m.owner_id = post.author_id
      and m.post_id is null
      and public.post_uses_media(post.body_md, post.cover_media_id, m.id);
  else
    update public.media_assets m
    set post_id = post.id
    where m.anonymous_author_id = post.anonymous_author_id
      and m.post_id is null
      and public.post_uses_media(post.body_md, post.cover_media_id, m.id);
  end if;
end;
$$;

create function public.link_post_media_on_save()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  perform public.link_post_media(new.id);
  return null;
end;
$$;

-- An autosave that leaves the body and cover as they were links nothing new, so the
-- update trigger fires only on a change.
create trigger posts_link_media_on_insert
  after insert on public.posts
  for each row execute function public.link_post_media_on_save();

create trigger posts_link_media_on_update
  after update of body_md, cover_media_id on public.posts
  for each row
  when (
    new.body_md is distinct from old.body_md
    or new.cover_media_id is distinct from old.cover_media_id
  )
  execute function public.link_post_media_on_save();

revoke execute on function public.post_uses_media(text, uuid, uuid) from public, anon, authenticated;
revoke execute on function public.link_post_media(uuid) from public, anon, authenticated;
revoke execute on function public.link_post_media_on_save() from public, anon, authenticated;

-- The uploads made before this migration: each joins the oldest post of its owner
-- that uses it, the same rule the trigger follows from now on.
update public.media_assets m
set post_id = first_use.post_id
from (
  select distinct on (a.id) a.id as media_id, p.id as post_id
  from public.media_assets a
  join public.posts p
    on (
      (p.author_id is not null and a.owner_id = p.author_id)
      or (p.anonymous_author_id is not null and a.anonymous_author_id = p.anonymous_author_id)
    )
    and public.post_uses_media(p.body_md, p.cover_media_id, a.id)
  where a.post_id is null
  order by a.id, p.created_at
) first_use
where m.id = first_use.media_id;
