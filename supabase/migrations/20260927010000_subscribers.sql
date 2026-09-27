-- Issue #22, D20: readers with no account follow the blog by email. A subscription is to
-- the whole site (author_id null) or to one author. Double opt-in: a row sends nothing
-- until its address confirms from the email. New posts arrive on the schedule the
-- reader picked, as one email.
create table public.subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  author_id uuid references public.profiles (id) on delete cascade,
  digest public.digest_schedule not null default 'daily',
  confirmed_at timestamptz,
  confirm_token text unique,
  confirm_sent_at timestamptz,
  unsubscribe_token text not null unique
    default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  -- Where the last email's window ended, as on email_preferences.
  cursor timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint subscribers_email_shape check (
    char_length(email) between 3 and 254 and email = lower(email) and email like '%@%'
  ),
  constraint subscribers_digest_on check (digest <> 'off')
);

comment on table public.subscribers is
  'Readers who follow the site or one author by email (#22, D20). Server only.';

-- One subscription per address and scope; the whole site is one scope.
create unique index subscribers_email_scope on public.subscribers (email, author_id)
  nulls not distinct;

-- No browser role reads or writes this table (D2).
alter table public.subscribers enable row level security;

-- A reader asks to subscribe. A confirmed subscription is left as it is, so a stranger
-- who types someone's address cannot change their schedule. An unconfirmed one gets a
-- new confirmation token, unless one went out in the last ten minutes: a form sent
-- again and again must not flood an inbox. The answer is for the server only; the page
-- says the same thing in every case.
-- `p_author_id` defaults to null, the whole site, so the generated Args type lets a
-- caller leave it out.
create function public.request_subscription(
  p_email text,
  p_digest public.digest_schedule,
  p_confirm_token text,
  p_author_id uuid default null
)
returns text
language plpgsql
set search_path = ''
as $$
declare
  v_row public.subscribers%rowtype;
begin
  select * into v_row
  from public.subscribers
  where email = p_email and author_id is not distinct from p_author_id
  for update;
  if found and v_row.confirmed_at is not null then
    return 'confirmed';
  end if;
  if found and v_row.confirm_sent_at > now() - interval '10 minutes' then
    return 'recent';
  end if;
  insert into public.subscribers (email, author_id, digest, confirm_token, confirm_sent_at)
  values (p_email, p_author_id, p_digest, p_confirm_token, now())
  on conflict (email, author_id) do update set
    digest = excluded.digest,
    confirm_token = excluded.confirm_token,
    confirm_sent_at = excluded.confirm_sent_at;
  return 'pending';
end;
$$;

-- The confirmation link's button. A token is good for seven days and once. The window
-- starts now, so the first email carries only posts that come after.
create function public.confirm_subscription(p_token text)
returns boolean
language sql
set search_path = ''
as $$
  with confirmed as (
    update public.subscribers
    set confirmed_at = now(), confirm_token = null, cursor = now()
    where confirm_token = p_token
      and confirmed_at is null
      and confirm_sent_at > now() - interval '7 days'
    returning 1
  )
  select exists (select 1 from confirmed);
$$;

-- The sweep's claim for readers, the same shape as claim_member_emails. Due when the
-- interval has passed and a post the reader follows went out in the window: public,
-- published, and announced (posts.announced_at, set once per post, #24), so a post
-- that goes out again is never mailed twice. Also drops confirmations nobody answered
-- in seven days, since the sweep is the one job that runs on a schedule.
create function public.claim_subscriber_emails(p_until timestamptz, p_limit integer)
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
      and s.cursor <= p_until - case s.digest
        when 'hourly' then interval '1 hour'
        else interval '1 day'
      end
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

create function public.release_subscriber_email(
  p_subscriber_id uuid,
  p_window_start timestamptz,
  p_window_end timestamptz
)
returns void
language sql
set search_path = ''
as $$
  update public.subscribers
  set cursor = p_window_start
  where id = p_subscriber_id and cursor = p_window_end;
$$;

revoke execute on function public.request_subscription (
  text, public.digest_schedule, text, uuid
) from public, anon, authenticated;
revoke execute on function public.confirm_subscription (text)
  from public, anon, authenticated;
revoke execute on function public.claim_subscriber_emails (timestamptz, integer)
  from public, anon, authenticated;
revoke execute on function public.release_subscriber_email (uuid, timestamptz, timestamptz)
  from public, anon, authenticated;

-- Erasure removes every reader's subscription to the erased author. The profile row
-- stays (status 'erased'), so the foreign key's cascade does not fire. Same body as the
-- email-preferences version plus the one delete.
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

  delete from public.subscribers where author_id = p_profile_id;

  update public.profiles
  set status = 'erased', display_name = null, avatar_url = null, bio = null,
      voice_guide_md = null
  where id = p_profile_id;

  return 'erased';
end;
$$;

revoke execute on function public.erase_account (uuid) from public, anon, authenticated;
