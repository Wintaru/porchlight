-- Issue #63: erasure takes the member's evidence envelopes with it (SPEC.md §7, §10).
-- Since #61 every post and comment has a `submission_evidence` row, and #14's function
-- never touched the table, so an erased member left an address hash and a user agent
-- behind for each thing they wrote. A frozen row (a locked item) is kept until
-- `retain_until`, as SPEC.md §7 says: the filter skips it rather than letting the
-- delete trigger raise and abort the whole erase. Rows of an anonymous author the
-- member claimed go too, since those posts and comments became the member's.
-- Same body as the agent-tokens version plus the one delete.
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
  set status = 'erased', display_name = null, avatar_url = null, bio = null
  where id = p_profile_id;

  return 'erased';
end;
$$;
