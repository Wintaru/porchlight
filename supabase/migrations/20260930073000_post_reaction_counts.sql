-- The reactions on a post and on its comments, counted per item and kind (D9: never a
-- total per member, never a sort key). The read-model fetched every reaction row and
-- counted in the app: past PostgREST's 1000-row cap the counts came out short, and the
-- payload grew with every tap. One row per item and kind comes back instead, with
-- whether `p_viewer_id` is among them so their button shows as pressed.
--
-- Security invoker: the caller's RLS decides what is counted, as it did for the rows,
-- so a reaction on a comment the reader cannot see is not counted either.
create function public.post_reaction_counts(p_post_id uuid, p_viewer_id uuid default null)
returns table (comment_id uuid, kind public.reaction_kind, total integer, mine boolean)
language sql
stable
security invoker
set search_path = ''
as $$
  select null::uuid, r.kind, count(*)::integer, coalesce(bool_or(r.profile_id = p_viewer_id), false)
  from public.reactions r
  where r.post_id = p_post_id and r.comment_id is null
  group by r.kind
  union all
  select r.comment_id, r.kind, count(*)::integer, coalesce(bool_or(r.profile_id = p_viewer_id), false)
  from public.reactions r
  join public.comments c on c.id = r.comment_id
  where c.post_id = p_post_id
  group by r.comment_id, r.kind
$$;

revoke execute on function public.post_reaction_counts (uuid, uuid) from public;
grant execute on function public.post_reaction_counts (uuid, uuid) to anon, authenticated;
