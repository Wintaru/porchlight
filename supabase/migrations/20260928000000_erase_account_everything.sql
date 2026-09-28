-- Issue #83 (SPEC.md §10, D5, D6): erasure leaves nothing of the member behind.
--
-- Three gaps closed here:
--   * the member's own reader subscriptions (#22), found by their sign-in address;
--   * their notifications inbox and their upload quota row;
--   * the link from an anonymous author they once claimed (#8) back to them, unless
--     frozen evidence still needs it.
-- Kept on purpose, as accountability: reports they filed or resolved, moderation
-- actions by or against them, the audit log (append-only), site blocks, site settings
-- and invites they made. Those rows hold only the id of an erased profile.
-- packages/db/test/erasure.test.ts lists every foreign key to profiles and auth.users
-- and fails when one is not handled here or named as kept.

-- The service role cannot read auth.users, so erasure asks this for the address. Server
-- only, like erase_account itself.
create function public.member_email_of(p_profile_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select lower(email) from auth.users where id = p_profile_id;
$$;

revoke execute on function public.member_email_of (uuid) from public, anon, authenticated;

-- Same body as the voice-guide-revisions version plus the deletes and the claim update
-- marked #83.
create or replace function public.erase_account(p_profile_id uuid)
returns text
language plpgsql
set search_path = ''
as $$
declare
  v_status public.profile_status;
  v_email text;
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

  -- Before the claim link goes below: it finds the evidence of claimed anonymous posts.
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

  -- #83: the member's own reader subscriptions, to the site or to any author.
  v_email := public.member_email_of(p_profile_id);
  if v_email is not null then
    delete from public.subscribers where email = v_email;
  end if;

  delete from public.voice_guide_revisions where profile_id = p_profile_id;

  -- #83: the inbox and the quota row.
  delete from public.notifications where recipient_id = p_profile_id;

  delete from public.quotas where profile_id = p_profile_id;

  -- #83: an anonymous author the member claimed no longer points at them. Its posts,
  -- comments and uploads moved to the member at claim time and went above. Frozen
  -- evidence outlives an erasure (§10), and the claim is its only path to the member,
  -- so an author that still has evidence (only retained rows are left by now) keeps it,
  -- the same way retained evidence keeps author_id.
  update public.anonymous_authors a
  set claimed_by = null, claimed_at = null
  where a.claimed_by = p_profile_id
    and not exists (
      select 1 from public.submission_evidence e where e.anonymous_author_id = a.id
    );

  update public.profiles
  set status = 'erased', display_name = null, avatar_url = null, bio = null,
      voice_guide_md = null
  where id = p_profile_id;

  return 'erased';
end;
$$;

revoke execute on function public.erase_account (uuid) from public, anon, authenticated;
