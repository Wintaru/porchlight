-- The tags a visitor may see: those on at least one public, published post (SPEC.md
-- §5). The read-model filtered through an embed of `post_tags` and `posts`, which
-- PostgREST also returns: every public post id under every tag, on each home view, tag
-- page and editor open, only to be thrown away. `exists` answers the same question and
-- returns only the tag. Security invoker, so the caller's RLS on posts still applies.
-- Returns `setof tags`, so PostgREST can select, filter, order and limit the result.
create function public.public_tags()
returns setof public.tags
language sql
stable
security invoker
set search_path = ''
as $$
  select t.*
  from public.tags t
  where exists (
    select 1
    from public.post_tags pt
    join public.posts p on p.id = pt.post_id
    where pt.tag_id = t.id and p.status = 'published' and p.visibility = 'public'
  )
$$;

revoke execute on function public.public_tags () from public;
grant execute on function public.public_tags () to anon, authenticated;
