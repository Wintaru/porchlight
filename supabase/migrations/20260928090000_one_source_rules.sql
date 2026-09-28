-- Issue #94: one source for a rule the database needs in more than one place.
--
-- 1. `is_staff_role`: the roles that count as staff. claim_member_emails wrote the list
--    out three times. The core keeps the same set in STAFF_ROLES (Common/UserRole.ts),
--    and packages/db/test/mirrors.test.ts fails when the two differ.
-- 2. `digest_interval`: how long a digest schedule waits between emails. Both claim
--    functions had their own `case`, whose `else` made any new schedule daily without
--    a word. Now a schedule with no interval here raises, and a db test calls this for
--    every value of the enum.
--
-- The claim functions below are the definitions from 20260927000000_email_preferences
-- and 20260927010000_subscribers, the latest ones, with only those rules changed.
-- `create or replace` keeps their grants.

create function public.is_staff_role(p_role public.user_role)
returns boolean
language sql
immutable
parallel safe
set search_path = ''
as $$
  select p_role in ('admin', 'moderator')
$$;

comment on function public.is_staff_role (public.user_role) is
  'The roles that count as staff; mirrors STAFF_ROLES in the core (#94).';

-- Null for `off`, which is never due. A comparison with null is not true, so a caller
-- that forgets to leave `off` out still sends nothing. Raises for a schedule this
-- function does not know, so a new enum value fails loudly instead of acting daily.
-- The raise stops the whole claim run, so no digest goes out until this function
-- learns the new schedule. That is on purpose: never answer "daily" for an unknown one.
create function public.digest_interval(p_schedule public.digest_schedule)
returns interval
language plpgsql
immutable
parallel safe
set search_path = ''
as $$
begin
  case p_schedule
    when 'off' then return null;
    when 'hourly' then return interval '1 hour';
    when 'daily' then return interval '1 day';
    else raise exception 'digest_interval: no interval for schedule %', p_schedule;
  end case;
end;
$$;

comment on function public.digest_interval (public.digest_schedule) is
  'The wait between two digests on a schedule; null for off, raises when unknown (#94).';

create or replace function public.claim_member_emails(p_until timestamptz, p_limit integer)
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
           (ep.queue_immediate and public.is_staff_role(p.role)) as queue_apart
    from public.email_preferences ep
    join public.profiles p on p.id = ep.profile_id
    where p.status = 'active'
      and ep.digest <> 'off'
      and ep.digest_cursor <= p_until - public.digest_interval(ep.digest)
      and exists (
        select 1 from public.notifications n
        where n.recipient_id = ep.profile_id
          and n.read_at is null
          and n.created_at > ep.digest_cursor
          and n.created_at <= p_until
          and not (
            n.kind = 'queue.pending'
            and ep.queue_immediate
            and public.is_staff_role(p.role)
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
      and public.is_staff_role(p.role)
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

create or replace function public.claim_subscriber_emails(p_until timestamptz, p_limit integer)
returns table (
  subscriber_id uuid,
  email text,
  author_id uuid,
  unsubscribe_token text,
  window_start timestamptz,
  window_end timestamptz
)
language plpgsql
set search_path = ''
as $$
#variable_conflict use_column
begin
  delete from public.subscribers s
  where s.confirmed_at is null and s.confirm_sent_at < now() - interval '7 days';

  return query
  with due as (
    select s.id, s.cursor as start_at
    from public.subscribers s
    where s.confirmed_at is not null
      and s.cursor <= p_until - public.digest_interval(s.digest)
      and exists (
        select 1 from public.posts p
        where p.status = 'published'
          and p.visibility = 'public'
          and p.announced_at > s.cursor
          and p.announced_at <= p_until
          and (s.author_id is null or p.author_id = s.author_id)
      )
    order by s.cursor
    limit p_limit
    for update of s skip locked
  )
  update public.subscribers s
  set cursor = p_until
  from due
  where s.id = due.id
  returning s.id, s.email, s.author_id, s.unsubscribe_token, due.start_at, p_until;
end;
$$;
