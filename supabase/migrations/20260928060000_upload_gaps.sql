-- Closes the gaps #80 left in removing unused uploads (#90, D16).
--
-- 1. A comment counts as a use. A member may put a picture's address in a comment, and
--    deleting the upload would break that comment. `media_in_use` is the one answer to
--    "does anything still show this upload": `unused_media` (the prune) and a member's
--    Remove (DeleteMedia) both ask it.
-- 2. A moderator can turn down a flagged upload that is not a cover (C13). It stays held
--    in quarantine and never gets a public copy; `rejected_at` takes it out of the queue.

create function public.media_in_use(p_media_id uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.posts p
    where public.post_uses_media(p.body_md, p.cover_media_id, p_media_id)
  )
  or exists (
    select 1
    from public.comments c
    where position(p_media_id::text in c.body_md) > 0
  );
$$;

revoke execute on function public.media_in_use(uuid) from public, anon, authenticated;

-- Same contract as before (#80), with comments counted through media_in_use.
create or replace function public.unused_media(
  p_media_ids uuid[],
  p_owner_id uuid,
  p_post_id uuid default null
)
returns setof uuid
language sql
stable
set search_path = ''
as $$
  with candidates as materialized (
    select m.id
    from public.media_assets m
    left join public.posts saved on saved.id = p_post_id
    where m.id = any(p_media_ids)
      and m.owner_id = p_owner_id
      and not coalesce(public.post_uses_media(saved.body_md, saved.cover_media_id, m.id), false)
  )
  select c.id
  from candidates c
  where not public.media_in_use(c.id);
$$;

revoke execute on function public.unused_media(uuid[], uuid, uuid) from public, anon, authenticated;

alter table public.media_assets
  add column rejected_at timestamptz;

-- Only a held upload can be turned down: a clear one needs no decision, and nobody ever
-- decides a locked one (SPEC.md §7).
alter table public.media_assets
  add constraint media_assets_rejected_only_flagged
  check (rejected_at is null or scan_status = 'flagged');

-- The queue's held uploads: flagged, not approved as mature, not turned down.
create index media_assets_held_idx
  on public.media_assets (created_at desc)
  where scan_status = 'flagged' and not mature and rejected_at is null;
