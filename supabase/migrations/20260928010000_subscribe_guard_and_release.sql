-- Issue #84 and #86 (C4 A): two requests for a new address at the same moment, and a
-- confirmation email that did not go out.

-- The same function as in 20260927010000_subscribers.sql, with a guard on the conflict
-- branch. Two requests for a new address at the same moment both find no row to lock,
-- and both insert. The second one then lands on the conflict branch. Before, it replaced
-- the first one's token, so the first email's link stopped working, and a subscription
-- confirmed in between got a new schedule. Now the conflict branch writes only what the
-- top of the function would have let through: an unconfirmed row with no confirmation
-- in the last ten minutes. When the guard stops the write, no email goes out.
create or replace function public.request_subscription(
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
  insert into public.subscribers as s
    (email, author_id, digest, confirm_token, confirm_sent_at)
  values (p_email, p_author_id, p_digest, p_confirm_token, now())
  on conflict (email, author_id) do update set
    digest = excluded.digest,
    confirm_token = excluded.confirm_token,
    confirm_sent_at = excluded.confirm_sent_at
  where s.confirmed_at is null
    and (s.confirm_sent_at is null or s.confirm_sent_at <= now() - interval '10 minutes');
  -- The guard stopped the write: the other request's email is on its way, or the
  -- address confirmed. Either way this request sends nothing.
  if not found then
    return 'recent';
  end if;
  return 'pending';
end;
$$;

-- A confirmation email that did not go out (#86, C4 A). The pending row goes, so the
-- reader can ask again at once instead of after the ten-minute hold. The stamp stays
-- the in-flight guard: a second click while the first send runs still sends nothing.
-- Only the row that carries this token, and only while it is unconfirmed.
create function public.release_subscription_confirmation(p_confirm_token text)
returns boolean
language sql
set search_path = ''
as $$
  with released as (
    delete from public.subscribers
    where confirm_token = p_confirm_token and confirmed_at is null
    returning 1
  )
  select exists (select 1 from released);
$$;

revoke execute on function public.release_subscription_confirmation (text)
  from public, anon, authenticated;
