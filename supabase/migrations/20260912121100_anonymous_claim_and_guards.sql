-- Issue #8: the anonymous claim flow and the D15 guards (SPEC.md §4).
--
-- Three server-only functions. Every write goes through a Manager with the service
-- role (D2), so each function revokes execute from the browser roles at the end.

-- Moves everything an anonymous author wrote onto a profile in one transaction and
-- records the claim (D7). Posts, comments and uploads all carry the two author columns
-- with a one-of-two CHECK, so each row flips both at once. Answers `claimed` when the
-- row was moved, `already-claimed` when someone got there first (a second sign-in with
-- the same cookie), and `no-such-author` for an unknown id.
create function public.claim_anonymous_author(p_anonymous_author_id uuid, p_profile_id uuid)
returns text
language plpgsql
set search_path = ''
as $$
declare
  v_claimed_by uuid;
begin
  -- Lock the author row so two claims of the same secret serialize here.
  select claimed_by into v_claimed_by
  from public.anonymous_authors
  where id = p_anonymous_author_id
  for update;
  if not found then
    return 'no-such-author';
  end if;
  if v_claimed_by is not null then
    return 'already-claimed';
  end if;

  update public.posts
  set author_id = p_profile_id, anonymous_author_id = null
  where anonymous_author_id = p_anonymous_author_id;

  update public.comments
  set author_id = p_profile_id, anonymous_author_id = null
  where anonymous_author_id = p_anonymous_author_id;

  update public.media_assets
  set owner_id = p_profile_id, anonymous_author_id = null
  where anonymous_author_id = p_anonymous_author_id;

  update public.anonymous_authors
  set claimed_by = p_profile_id, claimed_at = now()
  where id = p_anonymous_author_id;

  return 'claimed';
end;
$$;

revoke execute on function public.claim_anonymous_author (uuid, uuid) from public, anon, authenticated;

-- Counts one submission against a fixed window and answers the new count, so the caller
-- compares once and never reads before it writes (D15). The primary key makes the upsert
-- atomic under concurrent submits.
create function public.bump_rate_limit(p_subject text, p_action text, p_window_start timestamptz)
returns integer
language sql
set search_path = ''
as $$
  insert into public.rate_limits (subject, action, window_start, count)
  values (p_subject, p_action, p_window_start, 1)
  on conflict (subject, action, window_start)
    do update set count = public.rate_limits.count + 1
  returning count;
$$;

revoke execute on function public.bump_rate_limit (text, text, timestamptz) from public, anon, authenticated;

-- Everything an anonymous author wrote, for the status page keyed by their cookie (D13):
-- posts and comments in one result, newest first, each with the count of visible
-- replies (comments on a post, direct replies to a comment). A comment carries its
-- post's slug and, once the post is claimed, the post author's handle, so the page can
-- link to it. `body_md` is truncated at the source: the page shows a line, not a body.
create function public.anonymous_status(p_anonymous_author_id uuid)
returns table (
  kind public.subject_kind,
  id uuid,
  title text,
  status text,
  created_at timestamptz,
  reply_count bigint,
  post_slug text,
  post_author_handle text
)
language sql
stable
set search_path = ''
as $$
  select
    'post'::public.subject_kind as kind,
    p.id,
    p.title,
    p.status::text,
    p.created_at,
    (select count(*) from public.comments c where c.post_id = p.id and c.status = 'visible') as reply_count,
    p.slug as post_slug,
    null::text as post_author_handle
  from public.posts p
  where p.anonymous_author_id = p_anonymous_author_id
  union all
  select
    'comment'::public.subject_kind as kind,
    c.id,
    left(c.body_md, 120) as title,
    c.status::text,
    c.created_at,
    (select count(*) from public.comments r where r.parent_id = c.id and r.status = 'visible') as reply_count,
    p.slug as post_slug,
    pr.handle as post_author_handle
  from public.comments c
  join public.posts p on p.id = c.post_id
  left join public.profiles pr on pr.id = p.author_id
  where c.anonymous_author_id = p_anonymous_author_id
  order by created_at desc;
$$;

revoke execute on function public.anonymous_status (uuid) from public, anon, authenticated;
