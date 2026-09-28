-- Issue #89 (decision C9): the notification bell joins a private Realtime channel, so
-- the hosted project can switch off public Realtime access. With public access on,
-- anyone who holds the public key can join or broadcast on any public channel, and use
-- the project's Realtime quota. With it off, Realtime refuses every public channel, and
-- the bell (a public channel until now) would go dark.
--
-- A private channel passes these policies once, at join. The bell's channel carries
-- only postgres_changes, which Realtime still filters by the RLS on notifications. The
-- join still needs a SELECT policy on realtime.messages, so a member may join only
-- `notifications:<their own id>`, and only to listen. There is no insert policy: a
-- browser can broadcast nothing on these topics.

create policy notifications_recipient_receive on realtime.messages
  for select to authenticated
  using (
    realtime.messages.extension = 'broadcast'
    and (select realtime.topic()) = 'notifications:' || (select auth.uid())::text
  );
