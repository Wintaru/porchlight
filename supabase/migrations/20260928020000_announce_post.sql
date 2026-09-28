-- Issue #87 (D13, D20): a post tells its followers it is out in one database call, and
-- the claim and the notices commit together.
--
-- Before this, the claim on `announced_at` and the notice insert were separate calls:
-- a failed insert left the post claimed with no notices, and nothing tried again. It
-- also made one round trip per page of followers.

-- 1. Backfill (decision C5). A post that went out before #24 added `announced_at` has
-- it null. Approval no longer checks "was it pending?" and relies on the one-time claim
-- instead, so such a post, approved back from hidden, would tell its followers again.
-- Mark every post that went out as announced at the time it went out. Unpublish clears
-- `published_at`, so a post back in draft stays unmarked, as before.
--
-- ORDER: this backfill must run before #86's trigger that sets `announced_at` from the
-- database clock on a null to not-null update. With that trigger in place, this update
-- would stamp now() on every old post and put all of them in the next reader digests.
-- This migration adds no trigger and depends on none. The posts triggers are off for
-- the backfill only: `posts_set_updated_at` would stamp every old post as changed
-- today, and no trigger may rewrite the value set here. The Supabase CLI runs this file
-- as one transaction, so the triggers come back on, or the whole file rolls back. Never
-- run these statements one by one: a failed update would leave the triggers off.
alter table public.posts disable trigger user;

update public.posts
set announced_at = published_at
where announced_at is null
  and published_at is not null;

alter table public.posts enable trigger user;

-- 2. The claim and the fan-out. Only a public, published post that nobody announced
-- yet is claimed. Of two callers that race, the second waits on the row lock, then
-- finds `announced_at` set and claims nothing. The recipients: followers of the
-- author and of each tag on the post, each once, minus the author, minus anyone who
-- muted or blocked the author. An anonymous post (no author) reaches tag followers
-- only. An error in the insert rolls the claim back with it, so a retry can announce.
-- Answers the number of notices written: 0 when nothing was claimed.
create function public.announce_post(p_post_id uuid, p_at timestamptz)
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
    );
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

comment on function public.announce_post (uuid, timestamptz) is
  'Claims a post''s one follower announcement and writes its post.published notices (#87).';

revoke execute on function public.announce_post (uuid, timestamptz)
  from public, anon, authenticated;
