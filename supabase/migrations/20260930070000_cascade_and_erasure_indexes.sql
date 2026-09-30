-- Foreign keys with no index behind them. A delete on the parent runs the key's action
-- (cascade or set null) as one lookup per deleted parent row, and without an index each
-- lookup reads the whole child table: deleting a post with 300 comments scanned
-- `notifications` and `mod_actions` about 300 times each. Erasure (`erase_account`)
-- also filters on most of these columns. Partial on `is not null` where the column is
-- usually empty. Plain CREATE INDEX: `supabase db push` runs each migration in a
-- transaction, where CONCURRENTLY is not allowed.

create index notifications_post_idx on public.notifications (post_id)
  where post_id is not null;
create index notifications_comment_idx on public.notifications (comment_id)
  where comment_id is not null;
create index notifications_report_idx on public.notifications (report_id)
  where report_id is not null;

-- The `escalate`-only partial indexes cannot serve the set-null lookups, which match
-- every action kind.
create index mod_actions_target_post_idx on public.mod_actions (target_post_id)
  where target_post_id is not null;
create index mod_actions_target_comment_idx on public.mod_actions (target_comment_id)
  where target_comment_id is not null;
create index mod_actions_target_media_idx on public.mod_actions (target_media_id)
  where target_media_id is not null;

create index posts_cover_media_idx on public.posts (cover_media_id)
  where cover_media_id is not null;
create index posts_agent_token_idx on public.posts (agent_token_id)
  where agent_token_id is not null;

create index submission_evidence_author_idx on public.submission_evidence (author_id)
  where author_id is not null;
create index submission_evidence_anonymous_author_idx
  on public.submission_evidence (anonymous_author_id)
  where anonymous_author_id is not null;
create index submission_evidence_agent_token_idx on public.submission_evidence (agent_token_id)
  where agent_token_id is not null;

create index anonymous_authors_claimed_by_idx on public.anonymous_authors (claimed_by)
  where claimed_by is not null;

-- `profile_id` is third in `reactions_unique_per_member`, so a member's reactions (the
-- export, erasure, the profile cascade) had no index to use.
create index reactions_profile_idx on public.reactions (profile_id);

create index subscribers_author_idx on public.subscribers (author_id)
  where author_id is not null;

-- The digest reads posts announced in a window, site-wide or for one author.
create index posts_announced_idx on public.posts (announced_at)
  where status = 'published' and visibility = 'public' and announced_at is not null;
create index posts_author_announced_idx on public.posts (author_id, announced_at)
  where status = 'published' and visibility = 'public' and announced_at is not null;

-- A member's comments newest first (the profile page), as `posts_author_created_idx`
-- does for posts. It also serves every lookup by `author_id` alone, so it replaces the
-- old index.
create index comments_author_created_idx on public.comments (author_id, created_at desc);

-- Last, because DROP INDEX locks every read of the table until the migration commits.
-- `comments_author_idx` is covered by the index above; `reactions_post_idx` by the
-- leading column of `reactions_unique_per_member`.
drop index public.comments_author_idx;
drop index public.reactions_post_idx;
