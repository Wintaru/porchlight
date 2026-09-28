-- Issue #92: one rule for "does this invite link still let someone in" (D20). Before,
-- the rule was written twice: in `redeem_invite` (database clock) and in the app
-- (app clock), and the two could disagree near an expiry. Now the rule lives here only.
-- `redeem_invite` spends a use by it, `check_invite` answers it without spending, and
-- the admin list reads it as the computed column `invite_is_live`.

-- Whether a link still lets someone in, by the database clock. Takes the row, so
-- PostgREST also serves it as a computed column of `invites`. The parameter has no
-- name: the generated types show a computed column only for an unnamed one.
create function public.invite_is_live(public.invites)
returns boolean
language sql
stable
set search_path = ''
as $$
  select $1.revoked_at is null
    and ($1.expires_at is null or $1.expires_at > now())
    and ($1.max_uses is null or $1.used_count < $1.max_uses);
$$;

revoke execute on function public.invite_is_live (public.invites)
from public, anon, authenticated;

-- Same statement shape as before (one update, so two friends on a one-use link cannot
-- both get in), with the rule from `invite_is_live`.
create or replace function public.redeem_invite(p_token_hash text)
returns public.trust_level
language sql
set search_path = ''
as $$
  update public.invites as i
  set used_count = i.used_count + 1
  where i.token_hash = p_token_hash
    and public.invite_is_live(i)
  returning i.trust_level;
$$;

revoke execute on function public.redeem_invite (text) from public, anon, authenticated;

-- Whether a link is live, without spending a use: the sign-in link form asks this
-- before it mails a new address.
create function public.check_invite(p_token_hash text)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.invites as i
    where i.token_hash = p_token_hash and public.invite_is_live(i)
  );
$$;

revoke execute on function public.check_invite (text) from public, anon, authenticated;
