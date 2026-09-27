-- Issue #23: full-text search over posts and comments (SPEC.md §14, phase 2).
-- The `simple` configuration, not `english`: Porchlight runs in any region and any
-- language, and `simple` only lowercases and splits, so it never stems a word into
-- the wrong language. Each search term matches as a prefix instead ("plant" finds
-- "planter"), which covers most of what stemming gives an English reader.
--
-- The documents are expression indexes, not stored columns: the posts and comments
-- grants are column lists, and a new column would have to join them. One function per
-- document builds the vector for both the index and the query, so the two cannot drift.

create function public.post_search_document(p_title text, p_summary text, p_body_md text)
returns tsvector
language sql
immutable
parallel safe
set search_path = ''
as $$
  select
    setweight(to_tsvector('simple'::regconfig, coalesce(p_title, '')), 'A')
    || setweight(to_tsvector('simple'::regconfig, coalesce(p_summary, '')), 'B')
    || setweight(to_tsvector('simple'::regconfig, coalesce(p_body_md, '')), 'C')
$$;

create function public.comment_search_document(p_body_md text)
returns tsvector
language sql
immutable
parallel safe
set search_path = ''
as $$
  select to_tsvector('simple'::regconfig, coalesce(p_body_md, ''))
$$;

create index posts_search_idx on public.posts
  using gin (public.post_search_document(title, summary, body_md));

create index comments_search_idx on public.comments
  using gin (public.comment_search_document(body_md));

-- What a visitor typed, as a prefix query: letters and digits only (so nothing the
-- reader types is ever query syntax), at most eight terms, every one required. Null
-- when nothing searchable is left.
create function public.search_query(p_query text)
returns tsquery
language sql
immutable
parallel safe
set search_path = ''
as $$
  select to_tsquery('simple'::regconfig, string_agg(term || ':*', ' & '))
  from (
    select (regexp_matches(lower(coalesce(p_query, '')), '[[:alnum:]]+', 'g'))[1] as term
    limit 8
  ) terms
$$;

-- The members the caller muted or blocked (#23). SECURITY DEFINER because a visitor has
-- no grant on `member_blocks` at all; it only ever returns the caller's own rows, and
-- for a visitor (no auth.uid()) it returns none.
create function public.viewer_hidden_authors()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select target_id from public.member_blocks where member_id = (select auth.uid())
$$;

revoke execute on function public.viewer_hidden_authors () from public;
grant execute on function public.viewer_hidden_authors () to anon, authenticated;

-- The search itself. SECURITY INVOKER, so RLS is the wall exactly as for every other
-- read (D2): a visitor finds published posts and visible comments, a member also
-- their own. On top of RLS it applies the listing rule the feeds apply (public posts
-- only, never unlisted) and leaves out members the viewer muted or blocked (#23).
-- Snippets are plain text with U+E000/U+E001 around each match: the page splits on
-- those, so no markup from the search ever reaches the page as HTML.
create function public.search_site(p_query text, p_limit integer default 20)
returns table (
  kind text,
  post_id uuid,
  comment_id uuid,
  title text,
  slug text,
  author_handle text,
  snippet text,
  published_at timestamptz,
  rank real
)
language sql
stable
security invoker
set search_path = ''
as $$
  with q as (
    -- At most 50 of each kind, whatever the caller asks for: the function is open to
    -- anon, so the limit is the one bound on the ranking work.
    select public.search_query(p_query) as query,
      least(greatest(coalesce(p_limit, 20), 1), 50) as cap
  ),
  hidden as (
    select public.viewer_hidden_authors() as target_id
  ),
  found_posts as (
    select
      'post'::text as kind,
      p.id as post_id,
      null::uuid as comment_id,
      p.title,
      p.slug,
      a.handle as author_handle,
      ts_headline(
        'simple'::regconfig,
        coalesce(p.summary, '') || ' ' || p.body_md,
        q.query,
        'StartSel=' || chr(57344) || ', StopSel=' || chr(57345)
          || ', MaxWords=30, MinWords=12, ShortWord=2, MaxFragments=1'
      ) as snippet,
      p.published_at,
      ts_rank(public.post_search_document(p.title, p.summary, p.body_md), q.query) as rank
    from public.posts p
    cross join q
    left join public.profiles a on a.id = p.author_id
    where q.query is not null
      and public.post_search_document(p.title, p.summary, p.body_md) @@ q.query
      and p.status = 'published'
      and p.visibility = 'public'
      and (p.author_id is null or p.author_id not in (select target_id from hidden))
    order by rank desc, p.published_at desc
    limit (select cap from q)
  ),
  found_comments as (
    select
      'comment'::text as kind,
      p.id as post_id,
      c.id as comment_id,
      p.title,
      p.slug,
      pa.handle as author_handle,
      ts_headline(
        'simple'::regconfig,
        c.body_md,
        q.query,
        'StartSel=' || chr(57344) || ', StopSel=' || chr(57345)
          || ', MaxWords=30, MinWords=12, ShortWord=2, MaxFragments=1'
      ) as snippet,
      c.created_at as published_at,
      ts_rank(public.comment_search_document(c.body_md), q.query) as rank
    from public.comments c
    cross join q
    join public.posts p on p.id = c.post_id
    left join public.profiles pa on pa.id = p.author_id
    where q.query is not null
      and public.comment_search_document(c.body_md) @@ q.query
      and c.status = 'visible'
      and p.status = 'published'
      and p.visibility = 'public'
      and (c.author_id is null or c.author_id not in (select target_id from hidden))
    order by rank desc, c.created_at desc
    limit (select cap from q)
  )
  select * from (
    select * from found_posts
    union all
    select * from found_comments
  ) hits
  order by kind desc, rank desc, published_at desc
$$;

revoke execute on function public.search_site (text, integer) from public;
grant execute on function public.search_site (text, integer) to anon, authenticated;
