-- #115: a member the author blocked gets none of the author's post.published notices,
-- even if they follow again after the block. The block ends their follow, and this
-- keeps a new one silent, the way a block is never shown to the member it names. The
-- same body as 20260928020000_announce_post.sql plus the second `not exists`.
create or replace function public.announce_post(p_post_id uuid, p_at timestamptz)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_author_id uuid;
  v_count integer;
begin
  update public.posts
  set announced_at = p_at
  where id = p_post_id
    and announced_at is null
    and status = 'published'
    and visibility = 'public'
  returning author_id into v_author_id;
  if not found then
    return 0;
  end if;

  insert into public.notifications (recipient_id, kind, post_id)
  select r.follower_id, 'post.published', p_post_id
  from (
    select f.follower_id
    from public.follows f
    where v_author_id is not null and f.author_id = v_author_id
    union
    select f.follower_id
    from public.follows f
    join public.post_tags pt on pt.tag_id = f.tag_id
    where pt.post_id = p_post_id
  ) r
  where r.follower_id is distinct from v_author_id
    and not exists (
      select 1 from public.member_blocks b
      where b.member_id = r.follower_id and b.target_id = v_author_id
    )
    and not exists (
      select 1 from public.member_blocks b
      where b.member_id = v_author_id
        and b.target_id = r.follower_id
        and b.level = 'block'
    );
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
