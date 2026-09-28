-- Issue #101 (D27): a private post is its author's alone. Nobody else reads it through
-- the browser roles: not a visitor, not another member, not a moderator or an admin.
-- The Managers apply the same rule for the server's own reads (the service role
-- bypasses RLS), and the listing functions already list public posts only.

-- 1. The read wall. `posts_own_read` still opens every post to its author, so this is
-- the only change: a published post is everyone's unless it is private. Comments,
-- post_tags and reactions follow the post through their own `exists` on posts, which
-- runs under this policy, so a private post's comments, tags and reactions close too.
drop policy posts_public_read on public.posts;

create policy posts_public_read on public.posts
  for select to anon, authenticated
  using (status = 'published' and visibility <> 'private');

-- 2. Two states that must never exist. A private post never waits in the moderation
-- queue: nobody but its author may see it, so there is nothing to approve (decision 1
-- on #101). Going public from private goes through the normal publish path at that
-- moment, which can make it `pending` with visibility `public`. And an anonymous post
-- is never private: an anonymous author has no account to read it with.
alter table public.posts
  add constraint posts_private_never_pending
    check (not (visibility = 'private' and status = 'pending')),
  add constraint posts_private_has_member
    check (visibility <> 'private' or anonymous_author_id is null);

-- 3. An upload in a private post. `media_assets_public_read` opened every approved
-- upload's row to everyone, so a visitor could list the published copies of a private
-- post's pictures. The helper reads past RLS on purpose: under the caller's own RLS a
-- private post is invisible, so "not in a private post" would be true for everyone
-- but the author. It answers only true or false for one post id.
create function public.post_is_private(p_post_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.posts p where p.id = p_post_id and p.visibility = 'private'
  )
$$;

comment on function public.post_is_private (uuid) is
  'Whether a post is private (#101, D27). Used by media_assets_public_read.';

revoke execute on function public.post_is_private (uuid) from public;
grant execute on function public.post_is_private (uuid) to anon, authenticated;

drop policy media_assets_public_read on public.media_assets;

create policy media_assets_public_read on public.media_assets
  for select to anon, authenticated
  using (
    published_path is not null
    and (post_id is null or not public.post_is_private(post_id))
  );

-- 4. The author's own home feed shows their private posts beside everyone's public
-- ones (#101). Only the Everything feed: a tag's feed stays public posts only. Two
-- branches, so each keeps its own index: the public one the feed index, the private
-- one the author's own posts index.
create or replace function public.listed_post_ids(p_tag_id uuid default null, p_limit integer default 20)
returns table (id uuid, published_at timestamptz)
language sql
stable
security invoker
set search_path = ''
as $$
  with cap as (
    select least(greatest(coalesce(p_limit, 20), 1), 50) as n
  )
  select listed.id, listed.published_at
  from (
    (
      select p.id, p.published_at
      from public.posts p
      where p.status = 'published'
        and p.visibility = 'public'
        and (p.author_id is null or p.author_id not in (select public.viewer_hidden_authors()))
        and (
          p_tag_id is null
          or exists (
            select 1 from public.post_tags pt where pt.post_id = p.id and pt.tag_id = p_tag_id
          )
        )
      order by p.published_at desc
      limit (select n from cap)
    )
    union all
    (
      select p.id, p.published_at
      from public.posts p
      where p_tag_id is null
        and p.author_id = (select auth.uid())
        and p.status = 'published'
        and p.visibility = 'private'
      order by p.published_at desc
      limit (select n from cap)
    )
  ) listed
  order by listed.published_at desc
  limit (select n from cap)
$$;
