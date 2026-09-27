-- Issue #75: presence (SPEC.md §14, WAYFINDER D2). Who is typing a comment on a post,
-- and who is on the site now, through Supabase Realtime Presence. Nothing is stored:
-- presence lives only in the channel. The channels are private, so only a signed-in
-- member with an active profile can join one, to send or to see.

-- A member's choice to be seen, default on. Off means their browser sends nothing; they
-- still see others. Not granted to the browser roles: the server reads it for the page.
alter table public.profiles
  add column show_presence boolean not null default true;

comment on column public.profiles.show_presence is
  'Whether the member is shown online and typing (#75). Server only.';

-- Whether the caller may join a presence channel: an active member. Security definer
-- so the Realtime policy below can ask it without the caller reading profiles.
create function public.presence_allowed()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and status = 'active'
  )
$$;

revoke execute on function public.presence_allowed () from public, anon;
grant execute on function public.presence_allowed () to authenticated;

-- Realtime Authorization: a private channel's join and presence messages pass these
-- policies. Only the `presence:` topics, only the presence extension.
create policy presence_members_receive on realtime.messages
  for select to authenticated
  using (
    realtime.messages.extension = 'presence'
    and (select realtime.topic()) like 'presence:%'
    and (select public.presence_allowed())
  );

create policy presence_members_send on realtime.messages
  for insert to authenticated
  with check (
    realtime.messages.extension = 'presence'
    and (select realtime.topic()) like 'presence:%'
    and (select public.presence_allowed())
  );
