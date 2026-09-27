-- Issue #25: invite links make `sign_up = invite` real (SPEC.md §4, D20). An admin
-- makes a link; a friend who signs in through it gets an account, at the trust level
-- the link grants (trusted by default: the admin vouched for them). `open` and
-- `closed` ignore invites.
create table public.invites (
  id uuid primary key default gen_random_uuid(),
  -- SHA-256 of the token in the link. The token itself is shown once, like an agent
  -- token, and never stored.
  token_hash text not null unique,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  -- Null means no limit.
  max_uses integer,
  used_count integer not null default 0,
  trust_level public.trust_level not null default 'trusted',
  revoked_at timestamptz,
  constraint invites_max_uses_positive check (max_uses is null or max_uses > 0),
  constraint invites_used_within_max check (max_uses is null or used_count <= max_uses)
);

comment on table public.invites is
  'Invite links for sign_up = invite (#25). Server only; the link token is stored hashed.';

-- No browser role reads or writes this table (D2): the admin page goes through the
-- AccountManager.
alter table public.invites enable row level security;

-- Spends one use of a live link and answers the trust level it grants, or nothing when
-- the link is unknown, revoked, expired or used up. One statement, so two friends who
-- sign in through a one-use link at the same moment cannot both get in.
create function public.redeem_invite(p_token_hash text)
returns public.trust_level
language sql
set search_path = ''
as $$
  update public.invites
  set used_count = used_count + 1
  where token_hash = p_token_hash
    and revoked_at is null
    and (expires_at is null or expires_at > now())
    and (max_uses is null or used_count < max_uses)
  returning trust_level;
$$;

revoke execute on function public.redeem_invite (text) from public, anon, authenticated;
