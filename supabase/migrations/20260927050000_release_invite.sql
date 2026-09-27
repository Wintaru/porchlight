-- Issue #25 review: a first sign-in spends an invite use before it stores the profile.
-- When the store then fails, this gives the use back, so a one-use link is not burnt by
-- an error the friend did not cause.
create function public.release_invite(p_token_hash text)
returns void
language sql
set search_path = ''
as $$
  update public.invites
  set used_count = used_count - 1
  where token_hash = p_token_hash and used_count > 0;
$$;

revoke execute on function public.release_invite (text) from public, anon, authenticated;
