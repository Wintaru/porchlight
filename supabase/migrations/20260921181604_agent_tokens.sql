-- Issue #27 (D22, SPEC.md §17): personal agent tokens. A member mints one on the
-- settings page and hands it to their own agent; the server resolves it to an agent
-- actor that carries the member's profile and a grant of scopes. Only the SHA-256 of
-- the token is stored. The raw `plt_…` value is shown once and never again.

create type public.agent_scope as enum (
  'posts:draft',
  'posts:publish',
  'media:upload',
  'voice:write'
);

create table public.agent_tokens (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  -- sha256 of the raw token, lowercase hex, the same shape as anonymous_authors.
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  scopes public.agent_scope[] not null check (cardinality(scopes) > 0),
  expires_at timestamptz,
  revoked_at timestamptz,
  last_used_at timestamptz,
  created_at timestamptz not null default now()
);

comment on table public.agent_tokens is 'Personal MCP tokens (D22). Hash only; the raw token is shown once. Server-only: no browser role may read it.';

-- The settings page lists a member's tokens newest first.
create index agent_tokens_owner_idx on public.agent_tokens (owner_id, created_at desc);

-- RLS on with no policy: closed to anon and authenticated, the same wall as
-- anonymous_authors (the default privileges from the RLS migration already revoke the
-- grants). Every read and write goes through AgentTokenAccessor with the service role.
alter table public.agent_tokens enable row level security;

-- Erasure takes the tokens with it (SPEC.md §10): the profile row stays as `erased`,
-- so the cascade above never fires for an erase. Same body as the #14 function plus
-- the one delete.
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

  update public.profiles
  set status = 'erased', display_name = null, avatar_url = null, bio = null
  where id = p_profile_id;

  return 'erased';
end;
$$;
