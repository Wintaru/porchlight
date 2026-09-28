-- Issue #93: the home and tag feeds put every id a member muted or blocked into the
-- request URL. Past about 200 the URL could pass the proxy's limit, and past 1000 the
-- list was cut. Now the database leaves those members out, and the page gets ids only.

-- A signed-in viewer's Everything feed (no tag) or one tag's feed, newest first: public
-- published posts, minus members they muted or blocked. SECURITY INVOKER and ids only,
-- like `following_post_ids`; the read-model loads the cards in one more query. A
-- visitor has nothing to leave out, so the pages query `posts` directly for them.
create function public.listed_post_ids(p_tag_id uuid default null, p_limit integer default 20)
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
      p_tag_id is null
      or exists (
        select 1 from public.post_tags pt where pt.post_id = p.id and pt.tag_id = p_tag_id
      )
    )
  order by p.published_at desc
  limit least(greatest(coalesce(p_limit, 20), 1), 50)
$$;

revoke execute on function public.listed_post_ids (uuid, integer) from public;
grant execute on function public.listed_post_ids (uuid, integer) to authenticated;

-- Every member the viewer muted or blocked, as one array. The presence lists and a
-- post's comments need the whole set, since anyone may join or reply. One array is one
-- row, so the API's 1000-row cap cannot cut it, as it cut the old list read.
create function public.viewer_hidden_author_ids()
returns uuid[]
language sql
stable
security invoker
set search_path = ''
as $$
  select array(select public.viewer_hidden_authors())
$$;

revoke execute on function public.viewer_hidden_author_ids () from public;
grant execute on function public.viewer_hidden_author_ids () to authenticated;
