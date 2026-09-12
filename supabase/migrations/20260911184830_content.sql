-- Posts, comments, tags and reactions (SPEC.md §5).

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references public.profiles (id),
  anonymous_author_id uuid references public.anonymous_authors (id),
  -- Globally unique (the ER diagram's UK), so a claim never collides with the new
  -- author's existing slugs and /p/slug can 301 to /@handle/slug (D11).
  slug text not null,
  title text not null,
  body_md text not null default '',
  body_html text not null default '',
  summary text,
  cover_media_id uuid references public.media_assets (id) on delete set null,
  status public.post_status not null default 'draft',
  visibility public.post_visibility not null default 'public',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint posts_slug_unique unique (slug),
  constraint posts_slug_shape check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint posts_title_not_blank check (length(trim(title)) > 0),
  -- Exactly one author. Posts have no tombstone state: erasure deletes them (D6).
  constraint posts_one_author check (num_nonnulls(author_id, anonymous_author_id) = 1),
  constraint posts_published_has_date check (
    status <> 'published' or published_at is not null
  )
);

comment on table public.posts is 'A post. body_md is canonical, body_html is the cached render (D3).';

create index posts_author_idx on public.posts (author_id);
create index posts_anonymous_author_idx on public.posts (anonymous_author_id);
-- The home feed: newest public published posts first (§5).
create index posts_feed_idx on public.posts (published_at desc)
  where status = 'published' and visibility = 'public';
create index posts_status_idx on public.posts (status);

create trigger posts_set_updated_at
  before update on public.posts
  for each row execute function public.set_updated_at();

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  -- Comments go with their post (D6).
  post_id uuid not null references public.posts (id) on delete cascade,
  -- No cascade (D5): a parent with replies is tombstoned, never deleted. Deleting one
  -- anyway fails on this key. Whole-thread deletion still works through post_id.
  parent_id uuid references public.comments (id),
  author_id uuid references public.profiles (id),
  anonymous_author_id uuid references public.anonymous_authors (id),
  body_md text not null default '',
  body_html text not null default '',
  depth smallint not null default 0,
  status public.comment_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Exactly one author, or none for a tombstone (D5).
  constraint comments_one_author_or_tombstone check (
    num_nonnulls(author_id, anonymous_author_id) = case when status = 'tombstone' then 0 else 1 end
  ),
  constraint comments_tombstone_is_empty check (
    status <> 'tombstone' or (body_md = '' and body_html = '')
  ),
  -- Threads cap at 6 (D10). depth is derived from the parent by the trigger below, so a
  -- reply to a depth-6 comment fails here and CommentManager attaches it one level up.
  constraint comments_depth_range check (depth between 0 and 6),
  constraint comments_root_has_no_parent check ((parent_id is null) = (depth = 0))
);

comment on table public.comments is 'A threaded comment. depth <= 6; a tombstone keeps replies in place (D5, D10).';

create index comments_post_idx on public.comments (post_id, created_at);
create index comments_parent_idx on public.comments (parent_id);
create index comments_author_idx on public.comments (author_id);
create index comments_anonymous_author_idx on public.comments (anonymous_author_id);
create index comments_status_idx on public.comments (status);

create trigger comments_set_updated_at
  before update on public.comments
  for each row execute function public.set_updated_at();

-- depth is parent.depth + 1, or 0 for a root. Derived, so it cannot drift from the tree.
create function public.set_comment_depth()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.parent_id is null then
    new.depth := 0;
  else
    select c.depth + 1 into strict new.depth
    from public.comments c
    where c.id = new.parent_id;
  end if;
  return new;
end;
$$;

create trigger comments_set_depth
  before insert or update of parent_id on public.comments
  for each row execute function public.set_comment_depth();

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  name text not null,
  created_at timestamptz not null default now(),
  constraint tags_slug_unique unique (slug),
  constraint tags_slug_shape check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

comment on table public.tags is 'A tag. The `mature` tag is mandatory on approved nudity (§7).';

create table public.post_tags (
  post_id uuid not null references public.posts (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  primary key (post_id, tag_id)
);

create index post_tags_tag_idx on public.post_tags (tag_id);

-- Reactions count on the item only: never on a profile, never a sort key (D9).
create table public.reactions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references public.posts (id) on delete cascade,
  comment_id uuid references public.comments (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  kind public.reaction_kind not null,
  created_at timestamptz not null default now(),
  constraint reactions_one_target check (num_nonnulls(post_id, comment_id) = 1),
  -- One reaction of each kind per member per item. NULLS NOT DISTINCT makes the unused
  -- target column (always null) take part in the comparison instead of exempting the row.
  constraint reactions_unique_per_member unique nulls not distinct (post_id, comment_id, profile_id, kind)
);

create index reactions_post_idx on public.reactions (post_id);
create index reactions_comment_idx on public.reactions (comment_id);
