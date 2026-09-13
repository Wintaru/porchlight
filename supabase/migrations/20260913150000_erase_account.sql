-- Issue #14: account erasure in one transaction (SPEC.md §10).
--
-- Storage objects and the auth user are not Postgres rows, so they cannot join this
-- transaction: EraseAccountHandler removes the member's non-retained storage objects
-- before calling this function, and deletes the auth user after it commits (D2's
-- server-only write path, plus GoTrue's admin API not being reachable from plpgsql).
-- This function is everything that *can* be one transaction: the profile's posts,
-- comments, reactions and media rows.
--
-- Answers 'erased' when it ran, 'already-erased' when the profile was erased already
-- (a defensive check; a second attempt should be unreachable once the auth user is
-- gone), or 'not-found' for an unknown id.
create function public.erase_account(p_profile_id uuid)
returns text
language plpgsql
set search_path = ''
as $$
declare
  v_status public.profile_status;
begin
  -- Lock the row so two erase attempts for the same member serialize here.
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

  -- Frozen evidence is skipped (SPEC.md §7): filtering the retained rows out of the
  -- delete, rather than letting `refuse_delete_before_retain_until` raise on one of
  -- them, is what keeps this a single statement instead of aborting the whole
  -- transaction on the first locked upload.
  delete from public.media_assets
  where owner_id = p_profile_id
    and (retain_until is null or retain_until <= now());

  -- Every post this member wrote, and (by cascade) every comment and reaction on it —
  -- including comments and reactions left by other people (D6: posts have no
  -- tombstone state).
  delete from public.posts where author_id = p_profile_id;

  -- What is left is this member's own comments on posts they did not write. A comment
  -- with a reply is tombstoned so the reply still makes sense (D5); nulling author_id
  -- here is what keeps the plain delete below from also matching it.
  update public.comments
  set status = 'tombstone', author_id = null, body_md = '', body_html = ''
  where author_id = p_profile_id
    and exists (select 1 from public.comments r where r.parent_id = comments.id);

  delete from public.comments where author_id = p_profile_id;

  -- Any reaction this member left on someone else's post or comment (the design
  -- board's "every reaction you made" — reactions on the member's own now-deleted
  -- posts and comments are already gone by cascade above).
  delete from public.reactions where profile_id = p_profile_id;

  update public.profiles
  set status = 'erased', display_name = null, avatar_url = null, bio = null
  where id = p_profile_id;

  return 'erased';
end;
$$;

revoke execute on function public.erase_account (uuid) from public, anon, authenticated;
