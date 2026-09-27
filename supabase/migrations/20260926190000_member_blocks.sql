-- Issue #23: a member mutes or blocks another member (SPEC.md §14, phase 2).
-- Mute hides the other member's posts from your lists and their comments from your
-- threads. Block does the same, and also stops them commenting on your posts and
-- replying to your comments. One row per pair: blocking a muted member changes the
-- row's level. The other member is never told. `public.blocks` is a different thing:
-- a moderator's block of an anonymous poster (D15).
create type public.member_block_level as enum ('mute', 'block');

create table public.member_blocks (
  member_id uuid not null references public.profiles (id) on delete cascade,
  target_id uuid not null references public.profiles (id) on delete cascade,
  level public.member_block_level not null,
  created_at timestamptz not null default now(),
  primary key (member_id, target_id),
  constraint member_blocks_not_self check (member_id <> target_id)
);

comment on table public.member_blocks is
  'A member''s mutes and blocks of other members (#23). Private to the member who made them.';

-- CreateComment asks "did the post's author or the parent's author block this member?"
create index member_blocks_target_idx on public.member_blocks (target_id, member_id);

-- A member reads their own rows, so the read-model can filter their lists. Writes go
-- through the AccountManager on the service role (D2); browser roles cannot write.
-- Nobody reads who blocked them.
alter table public.member_blocks enable row level security;

grant select (member_id, target_id, level, created_at)
  on public.member_blocks to authenticated;

create policy member_blocks_own_read on public.member_blocks
  for select to authenticated
  using (member_id = (select auth.uid()));

-- Erasure removes the member's mutes and blocks, and everyone else's of them: an
-- erased profile keeps nothing personal, and a block of nobody is noise. The profile
-- row stays (status 'erased'), so the foreign key's cascade does not fire. Same body as
-- the voice-guide version plus the one delete.
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

  update public.profiles
  set status = 'erased', display_name = null, avatar_url = null, bio = null,
      voice_guide_md = null
  where id = p_profile_id;

  return 'erased';
end;
$$;

revoke execute on function public.erase_account (uuid) from public, anon, authenticated;
