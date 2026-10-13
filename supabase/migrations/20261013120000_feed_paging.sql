-- Older posts on every list (the home feed, Following, a tag's page). Each list shows
-- one page, and a reader moves on from the last post they saw: the page after a post is
-- every post before it in (published_at, id) order. Two posts can share a time, so `id`
-- breaks the tie and no post is shown twice or skipped. A cursor rather than an offset,
-- because a new post moves every offset page by one while a reader pages.
--
-- The new arguments change the signatures, so the old functions are dropped first: a
-- `create or replace` with new arguments would add an overload beside them.

drop function public.listed_post_ids (uuid, integer);
drop function public.following_post_ids (integer);

-- `published_at <= p_before_at` alone is what the feed index can serve; the second
-- condition removes the posts at that same time that come at or after the cursor's id.
create function public.listed_post_ids(
  p_tag_id uuid default null,
  p_limit integer default 20,
  p_before_at timestamptz default null,
  p_before_id uuid default null
)
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
        and (
          p_before_at is null
          or (
            p.published_at <= p_before_at
            and (p.published_at < p_before_at or p.id < p_before_id)
          )
        )
      order by p.published_at desc, p.id desc
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
        and (
          p_before_at is null
          or (
            p.published_at <= p_before_at
            and (p.published_at < p_before_at or p.id < p_before_id)
          )
        )
      order by p.published_at desc, p.id desc
      limit (select n from cap)
    )
  ) listed
  order by listed.published_at desc, listed.id desc
  limit (select n from cap)
$$;

revoke execute on function public.listed_post_ids (uuid, integer, timestamptz, uuid) from public;
grant execute on function public.listed_post_ids (uuid, integer, timestamptz, uuid) to authenticated;

create function public.following_post_ids(
  p_limit integer default 20,
  p_before_at timestamptz default null,
  p_before_id uuid default null
)
returns table (id uuid, published_at timestamptz)
language sql
stable
security invoker
set search_path = ''
as $$
  select p.id, p.published_at
  from public.posts p
  where p.status = 'published'
    and p.visibility = 'public'
    and (p.author_id is null or p.author_id not in (select public.viewer_hidden_authors()))
    and (
      p.author_id in (
        select f.author_id from public.follows f
        where f.follower_id = (select auth.uid()) and f.author_id is not null
      )
      or exists (
        select 1
        from public.post_tags pt
        join public.follows f on f.tag_id = pt.tag_id
        where pt.post_id = p.id and f.follower_id = (select auth.uid())
      )
    )
    and (
      p_before_at is null
      or (
        p.published_at <= p_before_at
        and (p.published_at < p_before_at or p.id < p_before_id)
      )
    )
  order by p.published_at desc, p.id desc
  limit least(greatest(coalesce(p_limit, 20), 1), 50)
$$;

revoke execute on function public.following_post_ids (integer, timestamptz, uuid) from public;
grant execute on function public.following_post_ids (integer, timestamptz, uuid) to authenticated;
