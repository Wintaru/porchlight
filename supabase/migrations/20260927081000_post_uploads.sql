-- Each upload belongs to one post (#80). The editor attaches an upload to the post it
-- was made for, and lists only that post's uploads. The database keeps the pairing
-- honest: an upload may only belong to a post of its own owner.
--
-- `used_in_post` marks an upload a saved version of its post has used. Only such an
-- upload counts as taken out when the post stops using it: one uploaded and not put in
-- yet stays for later.
alter table public.media_assets
  add column used_in_post boolean not null default false;

-- Until now an upload got a post only by being used in it.
update public.media_assets set used_in_post = true where post_id is not null;

-- Same rule as before, and now also marks an upload already attached to this post
-- (uploaded for it) as used once a save puts it in.
create or replace function public.link_post_media(p_post_id uuid)
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
    set post_id = post.id, used_in_post = true
    where m.owner_id = post.author_id
      and (m.post_id is null or (m.post_id = post.id and not m.used_in_post))
      and public.post_uses_media(post.body_md, post.cover_media_id, m.id);
  else
    update public.media_assets m
    set post_id = post.id, used_in_post = true
    where m.anonymous_author_id = post.anonymous_author_id
      and (m.post_id is null or (m.post_id = post.id and not m.used_in_post))
      and public.post_uses_media(post.body_md, post.cover_media_id, m.id);
  end if;
end;
$$;

revoke execute on function public.link_post_media(uuid) from public, anon, authenticated;
create function public.media_assets_post_owner_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.post_id is not null and not exists (
    select 1
    from public.posts p
    where p.id = new.post_id
      and (
        (new.owner_id is not null and p.author_id = new.owner_id)
        or (new.anonymous_author_id is not null and p.anonymous_author_id = new.anonymous_author_id)
      )
  ) then
    raise exception 'upload % cannot belong to post %: another owner', new.id, new.post_id
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger media_assets_post_owner_guard
  before insert or update of post_id on public.media_assets
  for each row execute function public.media_assets_post_owner_guard();

-- Of these uploads of `p_owner_id`, the ones no post uses any more. The editor deletes
-- them: on an explicit save, the post's uploads it took out; on deleting a post, all of
-- that post's uploads (#80). Any post counts, anyone's: a member may put another
-- member's public image in their own post, and deleting it would break that post.
-- `p_post_id`, the post just saved, sets aside the ones it still uses first, so the
-- scan of every post runs only for an upload taken out.
create function public.unused_media(
  p_media_ids uuid[],
  p_owner_id uuid,
  p_post_id uuid default null
)
returns setof uuid
language sql
stable
set search_path = ''
as $$
  with candidates as materialized (
    select m.id
    from public.media_assets m
    left join public.posts saved on saved.id = p_post_id
    where m.id = any(p_media_ids)
      and m.owner_id = p_owner_id
      and not coalesce(public.post_uses_media(saved.body_md, saved.cover_media_id, m.id), false)
  )
  select c.id
  from candidates c
  where not exists (
    select 1
    from public.posts o
    where public.post_uses_media(o.body_md, o.cover_media_id, c.id)
  );
$$;

revoke execute on function public.media_assets_post_owner_guard() from public, anon, authenticated;
revoke execute on function public.unused_media(uuid[], uuid, uuid) from public, anon, authenticated;
