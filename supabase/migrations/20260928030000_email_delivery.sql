-- Issue #86 (D14): email delivery with no lost and no double digests.

-- 1. `announced_at` from the database clock. The sweep leaves a two-minute settle lag
-- before each reader window ends, and that lag assumes database time. The app passed
-- the request's start time, so a publish that ran long could stamp a time already
-- inside a window the sweep had claimed, and that reader never got the post. The
-- trigger fires only when the mark goes from empty to set: that is the one-time claim
-- in `announce_post` (#87). A later change to a set value is left alone.
--
-- ORDER: this must come after #87's backfill in 20260928020000_announce_post.sql. With
-- this trigger in place, that backfill would stamp now() on every old post and put
-- all of them in the next reader digests.
create function public.posts_announced_at_from_db_clock()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.announced_at := now();
  return new;
end;
$$;

create trigger posts_announced_at_from_db_clock
  before update of announced_at on public.posts
  for each row
  when (old.announced_at is null and new.announced_at is not null)
  execute function public.posts_announced_at_from_db_clock();

comment on function public.announce_post (uuid, timestamptz) is
  'Claims a post''s one follower announcement and writes its post.published notices (#87). '
  'The posts_announced_at_from_db_clock trigger replaces p_at with the database clock (#86).';

-- 2. A failed send puts all its windows back in one call, not one call per window.
-- `p_claims` is a JSON array of the claims the sweep got back. A window is put back
-- only while its cursor still stands at the window end, as in the single-row versions.
-- Answers how many windows went back.
--
-- A member can hold a digest claim and a queue claim from the same sweep. One UPDATE
-- ... FROM changes each row once only, so each kind has its own statement.
create function public.release_member_emails(p_claims jsonb)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_digests integer;
  v_queues integer;
begin
  update public.email_preferences ep
  set digest_cursor = c.window_start
  from jsonb_to_recordset(p_claims) as c(
    profile_id uuid, kind text, window_start timestamptz, window_end timestamptz
  )
  where c.kind = 'digest'
    and ep.profile_id = c.profile_id
    and ep.digest_cursor = c.window_end;
  get diagnostics v_digests = row_count;

  update public.email_preferences ep
  set queue_cursor = c.window_start
  from jsonb_to_recordset(p_claims) as c(
    profile_id uuid, kind text, window_start timestamptz, window_end timestamptz
  )
  where c.kind = 'queue'
    and ep.profile_id = c.profile_id
    and ep.queue_cursor = c.window_end;
  get diagnostics v_queues = row_count;

  return v_digests + v_queues;
end;
$$;

create function public.release_subscriber_emails(p_claims jsonb)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_count integer;
begin
  update public.subscribers s
  set cursor = c.window_start
  from jsonb_to_recordset(p_claims) as c(
    subscriber_id uuid, window_start timestamptz, window_end timestamptz
  )
  where s.id = c.subscriber_id
    and s.cursor = c.window_end;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- The single-row release_member_email and release_subscriber_email stay for one
-- release, so an app still on the old code keeps working while this migration rolls
-- out. A later migration drops them.

revoke execute on function public.posts_announced_at_from_db_clock ()
  from public, anon, authenticated;
revoke execute on function public.release_member_emails (jsonb)
  from public, anon, authenticated;
revoke execute on function public.release_subscriber_emails (jsonb)
  from public, anon, authenticated;
