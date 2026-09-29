-- #120: a mature post is blurred until the reader asks (#117), so a search hit on one
-- shows its title and no snippet. Its comments keep theirs, as on the post page.
-- The 'mature' literal is MATURE_TAG in packages/core/src/Common/MatureTag.ts.

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
      case
        when exists (
          select 1
          from public.post_tags pt
          join public.tags t on t.id = pt.tag_id
          where pt.post_id = p.id and t.slug = 'mature'
        ) then null
        else ts_headline(
          'simple'::regconfig,
          public.markdown_plain_text(coalesce(p.summary, '') || E'\n\n' || p.body_md),
          q.query,
          'StartSel=' || chr(57344) || ', StopSel=' || chr(57345)
            || ', MaxWords=30, MinWords=12, ShortWord=0, MaxFragments=1'
        )
      end as snippet,
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
        public.markdown_plain_text(c.body_md),
        q.query,
        'StartSel=' || chr(57344) || ', StopSel=' || chr(57345)
          || ', MaxWords=30, MinWords=12, ShortWord=0, MaxFragments=1'
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
