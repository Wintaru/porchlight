-- Issue #93 (C17, #44): `posts_author_idx` was `(author_id)` only, so a capped list of
-- one author's posts still read and sorted every one of them. Two indexes replace it.
-- Plain CREATE INDEX: `supabase db push` runs each migration in a transaction, where
-- CONCURRENTLY is not allowed.

-- The author's own lists (dashboard, agent tools): newest first, `id` breaking ties, as
-- `LoadPostsByAuthor` orders them. It also serves every lookup by `author_id` alone
-- (the foreign key, erasure), which is why the old index can go.
create index posts_author_created_idx on public.posts (author_id, created_at desc, id);

-- The public profile page: one author's public published posts, newest first. Also
-- lets `published_author_count` count authors from the index alone.
create index posts_author_public_idx on public.posts (author_id, published_at desc)
  where status = 'published' and visibility = 'public';

-- Last, because DROP INDEX locks every read of `posts` until the migration commits.
drop index public.posts_author_idx;
