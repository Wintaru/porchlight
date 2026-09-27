-- Issue #81 (WAYFINDER D26): the server vouches for who is online and typing. Under
-- #75 a member tracked Realtime Presence under a key of their choice, and a policy
-- cannot see that key: Realtime checks these policies once, at join. So a member
-- could appear as another member.
--
-- Now only the server sends on the `presence:` topics: a route that knows the signed-in
-- member broadcasts "this member is here, typing or not" with the service role, which
-- passes no policy. A member's browser may only listen, to broadcasts, and may send
-- nothing: no insert policy on these topics, for broadcast or for presence. Nothing is
-- stored: a REST broadcast goes to the channel and not to realtime.messages.

drop policy presence_members_send on realtime.messages;
drop policy presence_members_receive on realtime.messages;

create policy presence_members_receive on realtime.messages
  for select to authenticated
  using (
    realtime.messages.extension = 'broadcast'
    and (select realtime.topic()) like 'presence:%'
    and (select public.presence_allowed())
  );
