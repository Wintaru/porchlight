-- Issue #24: the Following feed and the rule that hides it on a one-author site (D20).
--
-- Both are SECURITY INVOKER, so RLS is the wall as for every other read (D2). They
-- return ids and counts, not rows: `posts` has a column-list grant, and a function that
-- returned whole `posts` rows would hand back columns the browser roles may not read.

-- The viewer's Following feed, newest first: public published posts by an author they
-- follow or carrying a tag they follow, minus members they muted or blocked (#23).
-- The read-model loads the cards for these ids in one more query.
create function public.following_post_ids(p_limit integer default 20)
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
  order by p.published_at desc
  limit least(greatest(coalesce(p_limit, 20), 1), 50)
$$;

revoke execute on function public.following_post_ids (integer) from public;
grant execute on function public.following_post_ids (integer) to authenticated;

-- How many members have a public post out. The home page shows the Following tab only
-- from two up: with one author, Following and Everything are the same list.
create function public.published_author_count()
returns integer
language sql
stable
security invoker
set search_path = ''
as $$
  select count(distinct author_id)::integer
  from public.posts
  where status = 'published' and visibility = 'public' and author_id is not null
$$;

revoke execute on function public.published_author_count () from public;
grant execute on function public.published_author_count () to anon, authenticated;
