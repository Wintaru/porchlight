-- Issue #32: voice guide revisions (SPEC.md §17, Later). Each time a member's voice
-- guide changes, by their hand in Settings or by their agent with update_voice_guide,
-- the text it replaced is kept here. The member can see what an agent changed and copy
-- an older rule back. Same trigger pattern as post_revisions (#23): every path that
-- writes the guide keeps history without having to remember to.
create table public.voice_guide_revisions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  guide_md text not null,
  replaced_at timestamptz not null default now()
);

comment on table public.voice_guide_revisions is
  'Earlier versions of a member''s voice guide (#32). Read through the AccountManager only.';

create index voice_guide_revisions_profile_idx
  on public.voice_guide_revisions (profile_id, replaced_at desc);

-- Closed to browser roles, like the guide itself (D2).
alter table public.voice_guide_revisions enable row level security;

-- The most versions kept per member. An agent that rewrites the guide on every draft
-- must not grow the table without end; the oldest go first.
create function public.keep_voice_guide_revision()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Erasure empties the guide on purpose: that is not a version to keep.
  if old.voice_guide_md is not null
    and new.voice_guide_md is distinct from old.voice_guide_md
    and new.status <> 'erased' then
    insert into public.voice_guide_revisions (profile_id, guide_md)
    values (old.id, old.voice_guide_md);
    delete from public.voice_guide_revisions
    where profile_id = old.id
      and id not in (
        select id from public.voice_guide_revisions
        where profile_id = old.id
        order by replaced_at desc, id
        limit 50
      );
  end if;
  return new;
end;
$$;

revoke execute on function public.keep_voice_guide_revision () from public, anon, authenticated;

create trigger profiles_keep_voice_guide_revision
  before update of voice_guide_md on public.profiles
  for each row execute function public.keep_voice_guide_revision();

-- Erasure removes the member's guide history. The profile row stays (status 'erased'),
-- so the foreign key's cascade does not fire. Same body as the subscribers version plus
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

  delete from public.follows
  where follower_id = p_profile_id or author_id = p_profile_id;

  delete from public.email_preferences where profile_id = p_profile_id;

  delete from public.subscribers where author_id = p_profile_id;

  delete from public.voice_guide_revisions where profile_id = p_profile_id;

  update public.profiles
  set status = 'erased', display_name = null, avatar_url = null, bio = null,
      voice_guide_md = null
  where id = p_profile_id;

  return 'erased';
end;
$$;

revoke execute on function public.erase_account (uuid) from public, anon, authenticated;
