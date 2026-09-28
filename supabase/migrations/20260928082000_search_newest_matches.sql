-- Issue #93 (C16): search ranked every match before it applied the limit. On a site of
-- 50,000 posts and 200,000 comments a one-letter search took about 21 seconds: the GIN
-- indexes were never used, so every published post and comment built its document,
-- twice. The measurement is in DECISIONS.md. Three changes:
--
-- 1. A term of one letter or digit matches as a whole word, not as a prefix. "a:*"
--    matches nearly every document; "a" matches only the word "a".
-- 2. `search_candidates` picks the newest SEARCH_CANDIDATES (200) matches of each kind
--    through the GIN indexes, and `search_site` ranks only those. A very common word
--    ranks among recent writing, not the whole archive, which is the trade the plan
--    accepted.
-- 3. The document functions carry their real cost, so the planner stops treating a
--    rebuilt document as nearly free and walks the index that fits the word.

create or replace function public.search_query(p_query text)
returns tsquery
language sql
immutable
parallel safe
set search_path = ''
as $$
  select to_tsquery(
    'simple'::regconfig,
    string_agg(case when length(term) >= 2 then term || ':*' else term end, ' & ')
  )
  from (
    select (regexp_matches(lower(coalesce(p_query, '')), '[[:alnum:]]+', 'g'))[1] as term
    limit 8
  ) terms
$$;

-- Building a document parses the whole post, which the default cost of 100 undercounts
-- by about a hundred times (0.15 ms for a 400-word post in the measurement).
alter function public.post_search_document(text, text, text) cost 10000;
alter function public.comment_search_document(text) cost 2000;

-- The ids a search may rank: the newest 200 public published posts, and the newest 200
-- visible comments on them, that match. SECURITY DEFINER because under RLS the match
-- operator `@@` is not leakproof, so Postgres may not use a GIN index for it and
-- builds the document of every readable row instead. The function applies a rule
-- stricter than RLS (public, published, visible, minus the caller's muted and blocked
-- members), so it returns only what any visitor may read, and `search_site` still
-- reads the rows themselves as the caller. EXECUTE plans the statement with the query
-- in hand, so for posts the planner can tell a rare word (the GIN index) from a common
-- one (the newest-first feed index, stopping at 200). Comments have no newest-first
-- index, so a common word scans every matching comment through the GIN index.
create function public.search_candidates(p_query text)
returns table (post_id uuid, comment_id uuid)
language plpgsql
stable
security definer
set search_path = ''
as $f$
declare
  v_query tsquery := public.search_query(p_query);
begin
  if v_query is null then
    return;
  end if;
  return query execute $sql$
    (
      select p.id, null::uuid
      from public.posts p
      where public.post_search_document(p.title, p.summary, p.body_md) @@ $1
        and p.status = 'published'
        and p.visibility = 'public'
        and (p.author_id is null
          or p.author_id not in (select public.viewer_hidden_authors()))
      order by p.published_at desc
      limit 200
    )
    union all
    (
      select c.post_id, c.id
      from public.comments c
      join public.posts p on p.id = c.post_id
      where public.comment_search_document(c.body_md) @@ $1
        and c.status = 'visible'
        and p.status = 'published'
        and p.visibility = 'public'
        and (c.author_id is null
          or c.author_id not in (select public.viewer_hidden_authors()))
      order by c.created_at desc
      limit 200
    )
  $sql$ using v_query;
end
$f$;

revoke execute on function public.search_candidates (text) from public;
grant execute on function public.search_candidates (text) to anon, authenticated;

-- Same result shape and rules as before (#23), now ranking only the candidates. The
-- rows are read here as the caller, so RLS stays the wall (D2), and the listing rule is
-- checked again on them.
create or replace function public.search_site(p_query text, p_limit integer default 20)
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
    -- anon, so the limit and the candidate cap bound the ranking work.
    select public.search_query(p_query) as query,
      least(greatest(coalesce(p_limit, 20), 1), 50) as cap
  ),
  candidates as (
    select sc.post_id, sc.comment_id from public.search_candidates(p_query) sc
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
    from candidates cd
    join public.posts p on p.id = cd.post_id
    cross join q
    left join public.profiles a on a.id = p.author_id
    where cd.comment_id is null
      and p.status = 'published'
      and p.visibility = 'public'
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
    from candidates cd
    join public.comments c on c.id = cd.comment_id
    join public.posts p on p.id = c.post_id
    cross join q
    left join public.profiles pa on pa.id = p.author_id
    where c.status = 'visible'
      and p.status = 'published'
      and p.visibility = 'public'
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
