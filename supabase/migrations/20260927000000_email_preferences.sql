-- Issue #22: email digests (SPEC.md §8, D14). A member picks how often the unread bell
-- notifications arrive as one email. An admin or moderator can also ask for the
-- moderation queue at once. The sweep (/api/email/digest) claims what is due here and
-- sends it.
create type public.digest_schedule as enum ('off', 'hourly', 'daily');

-- One row per member who has saved an email setting. No row reads as the defaults.
-- The cursors are where the last email's window ended: the next email holds only what
-- came after. `unsubscribe_token` is the one-click link in every email; it only turns
-- email off, so it is kept as is.
create table public.email_preferences (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  digest public.digest_schedule not null default 'off',
  queue_immediate boolean not null default false,
  digest_cursor timestamptz not null default now(),
  queue_cursor timestamptz not null default now(),
  unsubscribe_token text not null unique
    default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  updated_at timestamptz not null default now()
);

comment on table public.email_preferences is
  'A member''s email settings and digest cursors (#22). Server only.';

-- No browser role reads or writes this table: the settings page reads it through the
-- NotificationManager on the service role (D2).
alter table public.email_preferences enable row level security;

-- Saves a member's settings. Turning a kind of email on starts its window now, so the
-- first email never carries the member's whole history.
create function public.set_email_preferences(
  p_profile_id uuid,
  p_digest public.digest_schedule,
  p_queue_immediate boolean
)
returns void
language sql
set search_path = ''
as $$
  insert into public.email_preferences (profile_id, digest, queue_immediate)
  values (p_profile_id, p_digest, p_queue_immediate)
  on conflict (profile_id) do update set
    digest = excluded.digest,
    queue_immediate = excluded.queue_immediate,
    digest_cursor = case
      when public.email_preferences.digest = 'off' and excluded.digest <> 'off' then now()
      else public.email_preferences.digest_cursor
    end,
    queue_cursor = case
      when not public.email_preferences.queue_immediate and excluded.queue_immediate
        then now()
      else public.email_preferences.queue_cursor
    end,
    updated_at = now();
$$;

-- The sweep's claim. Every due email is claimed in one statement: its cursor moves to
-- `p_until` and the old cursor comes back as the window's start, so two sweeps that
-- overlap never send the same window twice (SKIP LOCKED). A digest is due when its
-- interval has passed since the last one and it has something to say; the queue email
-- is due whenever a new item waits. `counts` is the unread notifications in the window
-- by kind. The queue kind leaves the digest for a member who gets it at once. Only
-- active members, and only staff for the queue. Security definer: it reads the address
-- from auth.users.
create function public.claim_member_emails(p_until timestamptz, p_limit integer)
returns table (
  profile_id uuid,
  email text,
  unsubscribe_token text,
  kind text,
  window_start timestamptz,
  window_end timestamptz,
  counts jsonb
)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
begin
  return query
  with due as (
    select ep.profile_id, ep.digest_cursor as start_at,
           (ep.queue_immediate and p.role in ('admin', 'moderator')) as queue_apart
    from public.email_preferences ep
    join public.profiles p on p.id = ep.profile_id
    where p.status = 'active'
      and ep.digest <> 'off'
      and ep.digest_cursor <= p_until - case ep.digest
        when 'hourly' then interval '1 hour'
        else interval '1 day'
      end
      and exists (
        select 1 from public.notifications n
        where n.recipient_id = ep.profile_id
          and n.read_at is null
          and n.created_at > ep.digest_cursor
          and n.created_at <= p_until
          and not (
            n.kind = 'queue.pending'
            and ep.queue_immediate
            and p.role in ('admin', 'moderator')
          )
      )
    order by ep.digest_cursor
    limit p_limit
    for update of ep skip locked
  ),
  claimed as (
    update public.email_preferences ep
    set digest_cursor = p_until
    from due
    where ep.profile_id = due.profile_id
    returning ep.profile_id, ep.unsubscribe_token, due.start_at, due.queue_apart
  )
  select c.profile_id, u.email::text, c.unsubscribe_token, 'digest'::text,
         c.start_at, p_until,
         (
           select jsonb_object_agg(k.kind, k.n)
           from (
             select n.kind::text as kind, count(*) as n
             from public.notifications n
             where n.recipient_id = c.profile_id
               and n.read_at is null
               and n.created_at > c.start_at
               and n.created_at <= p_until
               and not (c.queue_apart and n.kind = 'queue.pending')
             group by n.kind
           ) k
         )
  from claimed c
  join auth.users u on u.id = c.profile_id
  where u.email is not null;

  return query
  with due as (
    select ep.profile_id, ep.queue_cursor as start_at
    from public.email_preferences ep
    join public.profiles p on p.id = ep.profile_id
    where p.status = 'active'
      and p.role in ('admin', 'moderator')
      and ep.queue_immediate
      and exists (
        select 1 from public.notifications n
        where n.recipient_id = ep.profile_id
          and n.kind = 'queue.pending'
          and n.read_at is null
          and n.created_at > ep.queue_cursor
          and n.created_at <= p_until
      )
    order by ep.queue_cursor
    limit p_limit
    for update of ep skip locked
  ),
  claimed as (
    update public.email_preferences ep
    set queue_cursor = p_until
    from due
    where ep.profile_id = due.profile_id
    returning ep.profile_id, ep.unsubscribe_token, due.start_at
  )
  select c.profile_id, u.email::text, c.unsubscribe_token, 'queue'::text,
         c.start_at, p_until,
         (
           select jsonb_build_object('queue.pending', count(*))
           from public.notifications n
           where n.recipient_id = c.profile_id
             and n.kind = 'queue.pending'
             and n.read_at is null
             and n.created_at > c.start_at
             and n.created_at <= p_until
         )
  from claimed c
  join auth.users u on u.id = c.profile_id
  where u.email is not null;
end;
$$;

-- A send that failed puts its window back, unless a later claim has moved on.
create function public.release_member_email(
  p_profile_id uuid,
  p_kind text,
  p_window_start timestamptz,
  p_window_end timestamptz
)
returns void
language sql
set search_path = ''
as $$
  update public.email_preferences
  set digest_cursor = case when p_kind = 'digest' then p_window_start else digest_cursor end,
      queue_cursor = case when p_kind = 'queue' then p_window_start else queue_cursor end
  where profile_id = p_profile_id
    and case when p_kind = 'digest' then digest_cursor else queue_cursor end = p_window_end;
$$;

revoke execute on function public.set_email_preferences (uuid, public.digest_schedule, boolean)
  from public, anon, authenticated;
revoke execute on function public.claim_member_emails (timestamptz, integer)
  from public, anon, authenticated;
revoke execute on function public.release_member_email (uuid, text, timestamptz, timestamptz)
  from public, anon, authenticated;

-- Erasure removes the member's email settings. The profile row stays (status 'erased'),
-- so the foreign key's cascade does not fire. Same body as the follows version plus the
-- one delete.
create or replace function public.erase_account(p_profile_id uuid)
returns text
language plpgsql
set search_path = ''
as $$
declare
  v_status public.profile_status;
begin
  select status into v_status
  from public.profiles
  where id = p_profile_id
  for update;
  if not found then
    return 'not-found';
  end if;
  if v_status = 'erased' then
    return 'already-erased';
  end if;

  delete from public.submission_evidence
  where (
      author_id = p_profile_id
      or anonymous_author_id in (
        select id from public.anonymous_authors where claimed_by = p_profile_id
      )
    )
    and (retain_until is null or retain_until <= now());

  delete from public.media_assets
  where owner_id = p_profile_id
    and (retain_until is null or retain_until <= now());

  delete from public.posts where author_id = p_profile_id;

  update public.comments
  set status = 'tombstone', author_id = null, body_md = '', body_html = ''
  where author_id = p_profile_id
    and exists (select 1 from public.comments r where r.parent_id = comments.id);

  delete from public.comments where author_id = p_profile_id;

  delete from public.reactions where profile_id = p_profile_id;

  delete from public.agent_tokens where owner_id = p_profile_id;

  delete from public.member_blocks
  where member_id = p_profile_id or target_id = p_profile_id;

  delete from public.follows
  where follower_id = p_profile_id or author_id = p_profile_id;

  delete from public.email_preferences where profile_id = p_profile_id;

  update public.profiles
  set status = 'erased', display_name = null, avatar_url = null, bio = null,
      voice_guide_md = null
  where id = p_profile_id;

  return 'erased';
end;
$$;

revoke execute on function public.erase_account (uuid) from public, anon, authenticated;
