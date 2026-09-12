-- Row level security and grants (SPEC.md §3, issue #3).
--
-- Two walls, one rule: the browser roles (anon, authenticated) can only read, and only
-- what the policies below open. Every write goes through a Manager on the server with
-- the service role, which bypasses RLS (D2). Tables without a policy stay closed.

-- 1. Take the browser roles' default table privileges away, for these tables and for
--    every table a later migration creates.
revoke all on all tables in schema public from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated;
-- Functions too: without this, the first `security definer` helper a later migration
-- adds is a public RPC by default.
revoke all on all functions in schema public from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all on functions from anon, authenticated;

-- 2. Every table has RLS on. A table with no policy answers nothing to the browser roles.
alter table public.profiles enable row level security;
alter table public.anonymous_authors enable row level security;
alter table public.posts enable row level security;
alter table public.comments enable row level security;
alter table public.tags enable row level security;
alter table public.post_tags enable row level security;
alter table public.reactions enable row level security;
alter table public.media_assets enable row level security;
alter table public.submission_evidence enable row level security;
alter table public.reports enable row level security;
alter table public.mod_actions enable row level security;
alter table public.audit_log enable row level security;
alter table public.notifications enable row level security;
alter table public.quotas enable row level security;
alter table public.rate_limits enable row level security;
alter table public.blocks enable row level security;
alter table public.site_config enable row level security;

-- 3. Public reads (feed, post page, profile page) and members' own items.
--    `(select auth.uid())` instead of a bare `auth.uid()` lets the planner evaluate the
--    call once per statement instead of once per row.

-- Profiles: active profiles are public, minus trust_level. Trust is a moderation fact:
-- a member's own settings page and the admin views read it on the server (§4). A column
-- list on the grant is the wall for that column: a `select *` from the browser is
-- refused, so the read-model has to name what it reads.
grant select (id, handle, display_name, avatar_url, bio, role, status, created_at)
  on public.profiles to anon, authenticated;

create policy profiles_public_read on public.profiles
  for select to anon, authenticated
  using (status = 'active');

create policy profiles_own_read on public.profiles
  for select to authenticated
  using (id = (select auth.uid()));

-- Posts: published and public for everyone; every status for the author (§5).
grant select on public.posts to anon, authenticated;

create policy posts_public_read on public.posts
  for select to anon, authenticated
  using (status = 'published' and visibility = 'public');

create policy posts_own_read on public.posts
  for select to authenticated
  using (author_id = (select auth.uid()));

-- Comments: visible ones and tombstones, on a post the caller can see; plus the
-- author's own. The subquery on posts runs under the caller's own posts policies, so
-- "a post the caller can see" is defined exactly once, on posts.
grant select on public.comments to anon, authenticated;

create policy comments_public_read on public.comments
  for select to anon, authenticated
  using (
    status in ('visible', 'tombstone')
    and exists (select 1 from public.posts p where p.id = comments.post_id)
  );

create policy comments_own_read on public.comments
  for select to authenticated
  using (author_id = (select auth.uid()));

-- Tags are public. A post's tags follow the post.
grant select on public.tags to anon, authenticated;

create policy tags_public_read on public.tags
  for select to anon, authenticated
  using (true);

grant select on public.post_tags to anon, authenticated;

create policy post_tags_follow_post on public.post_tags
  for select to anon, authenticated
  using (exists (select 1 from public.posts p where p.id = post_tags.post_id));

-- Reactions follow the item they sit on.
grant select on public.reactions to anon, authenticated;

create policy reactions_follow_item on public.reactions
  for select to anon, authenticated
  using (
    exists (select 1 from public.posts p where p.id = reactions.post_id)
    or exists (select 1 from public.comments c where c.id = reactions.comment_id)
  );

-- Media: only the approved, re-encoded copy is public (§7). Owners see their own
-- uploads and their scan state, except a locked item, which nobody views (§7). The
-- column list keeps the quarantine path, the original filename, the hashes and the
-- anonymous token id on the server: the published copy is the metadata-stripped one.
grant select (id, owner_id, published_path, kind, mime_type, bytes, scan_status, created_at)
  on public.media_assets to anon, authenticated;

create policy media_assets_public_read on public.media_assets
  for select to anon, authenticated
  using (published_path is not null);

create policy media_assets_own_read on public.media_assets
  for select to authenticated
  using (owner_id = (select auth.uid()) and scan_status <> 'locked');

-- Notifications: the recipient, and nobody else (§8). Realtime applies this policy to
-- every subscriber, so the bell only ever sees its own rows.
grant select on public.notifications to authenticated;

create policy notifications_recipient_read on public.notifications
  for select to authenticated
  using (recipient_id = (select auth.uid()));

-- 4. Server-only tables get no grant and no policy: anonymous_authors,
--    submission_evidence, reports, mod_actions, audit_log, quotas, rate_limits, blocks,
--    site_config.
