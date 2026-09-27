-- Issue #24: the social layer (D20). A member follows an author or a tag; a post that
-- goes out notifies the followers of its author and of its tags (`post.published`).
alter type public.notification_kind add value 'post.published';

-- One row per follower and target. Exactly one target: an author (a profile) or a tag.
create table public.follows (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid not null references public.profiles (id) on delete cascade,
  author_id uuid references public.profiles (id) on delete cascade,
  tag_id uuid references public.tags (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint follows_one_target check (num_nonnulls(author_id, tag_id) = 1),
  constraint follows_not_self check (author_id is distinct from follower_id)
);

comment on table public.follows is
  'Who follows which author or tag (#24, D20). Private to the follower.';

create unique index follows_author_unique on public.follows (follower_id, author_id)
  where author_id is not null;
create unique index follows_tag_unique on public.follows (follower_id, tag_id)
  where tag_id is not null;
-- The fan-out on publish: every follower of one author, of one tag.
create index follows_author_idx on public.follows (author_id) where author_id is not null;
create index follows_tag_idx on public.follows (tag_id) where tag_id is not null;

-- A member reads their own follows, so the read-model can build their Following feed
-- and show Follow or Unfollow. Writes go through the AccountManager (D2). Nobody
-- reads who follows them: the social layer has no follower counts (D9).
alter table public.follows enable row level security;

grant select (id, follower_id, author_id, tag_id, created_at)
  on public.follows to authenticated;

create policy follows_own_read on public.follows
  for select to authenticated
  using (follower_id = (select auth.uid()));

-- A tag's page can say what the tag is for. An admin writes it; `tags` is already
-- readable in full by the browser roles, so the new column is public with the rest.
alter table public.tags
  add column description_md text,
  add constraint tags_description_length check (char_length(description_md) <= 2000);

-- Erasure removes the member's follows and everyone's follows of them. The profile row
-- stays (status 'erased'), so the foreign keys' cascade does not fire. Same body as the
-- member-blocks version plus the one delete.
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

  update public.profiles
  set status = 'erased', display_name = null, avatar_url = null, bio = null,
      voice_guide_md = null
  where id = p_profile_id;

  return 'erased';
end;
$$;

revoke execute on function public.erase_account (uuid) from public, anon, authenticated;
