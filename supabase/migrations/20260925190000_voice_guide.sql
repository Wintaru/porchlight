-- Issue #29: the voice guide and the agent's original draft (SPEC.md §17, D22).

-- The member's rules for how their agent writes. Private: the profiles grant is a
-- column list (the RLS migration), so a new column is closed to browser roles.
alter table public.profiles
  add column voice_guide_md text,
  add constraint profiles_voice_guide_length check (char_length(voice_guide_md) <= 20000);

comment on column public.profiles.voice_guide_md is
  'The member''s rules for their agent''s drafts (D22). Private; erased with the account.';

-- An erased profile keeps nothing personal, the guide included.
alter table public.profiles drop constraint profiles_erased_is_blank;
alter table public.profiles add constraint profiles_erased_is_blank check (
  status <> 'erased'
  or (display_name is null and avatar_url is null and bio is null and voice_guide_md is null)
);

-- The agent's own text, frozen at its first write, so the member (and their agent) can
-- compare it with what was published and turn the difference into a rule.
alter table public.posts add column agent_draft_md text;

comment on column public.posts.agent_draft_md is
  'The agent''s original text, frozen at its first write (D22). Never readable by browser roles.';

create function public.refuse_agent_draft_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.agent_draft_md is not null
    and new.agent_draft_md is distinct from old.agent_draft_md then
    raise exception 'agent_draft_md is frozen once written'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger posts_agent_draft_frozen
  before update of agent_draft_md on public.posts
  for each row execute function public.refuse_agent_draft_change();

-- The posts grant becomes a column list, the profiles pattern: every column a browser
-- role read before, and not the agent's draft. A column a later migration adds is
-- closed until it is named here.
revoke select on public.posts from anon, authenticated;
grant select (
  id, author_id, anonymous_author_id, slug, title, body_md, body_html, summary,
  cover_media_id, status, visibility, published_at, created_at, updated_at,
  comments_enabled, rejection_reason, origin, agent_token_id, reviewed_at
) on public.posts to anon, authenticated;

-- Erasure clears the guide. Same body as the #63 version plus the one column.
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

  update public.profiles
  set status = 'erased', display_name = null, avatar_url = null, bio = null,
      voice_guide_md = null
  where id = p_profile_id;

  return 'erased';
end;
$$;
