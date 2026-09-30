-- The home page shows the Following tab only from two authors up (D20), and asked for
-- that as a count of every author with a public post: an index scan over every public
-- post, on every signed-in home view. The question is yes or no, so stop at two.
create function public.several_published_authors()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select count(*) >= 2
  from (
    select distinct author_id
    from public.posts
    where status = 'published' and visibility = 'public' and author_id is not null
    limit 2
  ) authors
$$;

revoke execute on function public.several_published_authors () from public;
grant execute on function public.several_published_authors () to anon, authenticated;

-- `published_author_count` stays until a later migration: CI applies this one before
-- the new app goes live, and the app still serving meanwhile calls the old function.
