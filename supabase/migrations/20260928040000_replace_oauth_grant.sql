-- Issue #88 (D25, SPEC.md §17): consenting again replaces a member's OAuth grant in one
-- database call.
--
-- Before this, the consent page made three calls: load the live grant, revoke it, and
-- insert the new one. Two presses on Allow could race: the second press's insert met
-- the first press's new row on the one-live-grant index and failed, so the member saw
-- "could not be saved" although a grant was in place. And an insert that failed after
-- the revoke left the member with no grant at all.
--
-- Now the revoke and the insert run in one transaction, so a failed insert rolls the
-- revoke back and the earlier grant stays live. A transaction-scoped advisory lock on
-- (member, client) makes a second press wait for the first to commit. The second press
-- then revokes the first press's row and inserts its own: the last press wins, and both
-- presses succeed (decision C6). Each statement in a plpgsql function takes a new
-- snapshot, so the update after the lock sees the row the first press committed.
-- `revoked_at` and the new row's `created_at` are both this transaction's `now()`.
create function public.replace_oauth_grant(
  p_owner_id uuid,
  p_client_id uuid,
  p_name text,
  p_scopes public.agent_scope[]
)
returns setof public.agent_tokens
language plpgsql
set search_path = ''
as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'replace_oauth_grant:' || p_owner_id::text || ':' || p_client_id::text,
      0
    )
  );

  update public.agent_tokens
  set revoked_at = now()
  where owner_id = p_owner_id
    and oauth_client_id = p_client_id
    and revoked_at is null;

  return query
  insert into public.agent_tokens (owner_id, name, oauth_client_id, scopes)
  values (p_owner_id, p_name, p_client_id, p_scopes)
  returning *;
end;
$$;

comment on function public.replace_oauth_grant (uuid, uuid, text, public.agent_scope[]) is
  'Revokes the member''s live grant for an OAuth client and stores the new one, in one transaction; the last caller wins (#88, D25).';

-- The server calls it with the service role after the consent page's checks. A browser
-- call would let a member grant scopes to any client without the page.
revoke execute on function public.replace_oauth_grant (uuid, uuid, text, public.agent_scope[])
  from public, anon, authenticated;
