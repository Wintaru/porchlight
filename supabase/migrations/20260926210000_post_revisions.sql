-- Issue #23: post revisions (SPEC.md §14, phase 2). Each time a post that is out (its
-- `published_at` is set) changes its title, summary or body, the version readers saw
-- is kept here. A draft never makes revisions: autosave writes a draft every few
-- seconds, and nobody has read it yet. Unpublish clears `published_at`, so the edits a
-- post gets while it is taken down leave no revisions of their own; the history shows
-- them folded into the next version readers saw.
--
-- A trigger, not a Manager write: every path that edits a post (the editor, an agent,
-- an admin) keeps history without having to remember to. Same pattern as
-- `posts_agent_draft_frozen`.
create table public.post_revisions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  title text not null,
  summary text,
  body_md text not null,
  -- When the post row was last written before this version was replaced (its
  -- `updated_at`, which any save moves, words or not), and when a save replaced it.
  saved_at timestamptz not null,
  replaced_at timestamptz not null default now()
);

comment on table public.post_revisions is
  'Earlier versions of a published post (#23). Read through the PostManager only.';

create index post_revisions_post_idx on public.post_revisions (post_id, replaced_at desc);

-- Closed to browser roles: the author and staff read history through the PostManager,
-- which checks `post.edit` first. Erasing the post (or the account) cascades.
alter table public.post_revisions enable row level security;

create function public.keep_post_revision()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.published_at is not null
    and (
      new.title is distinct from old.title
      or new.summary is distinct from old.summary
      or new.body_md is distinct from old.body_md
    ) then
    insert into public.post_revisions (post_id, title, summary, body_md, saved_at)
    values (old.id, old.title, old.summary, old.body_md, old.updated_at);
  end if;
  return new;
end;
$$;

revoke execute on function public.keep_post_revision () from public, anon, authenticated;

create trigger posts_keep_revision
  before update of title, summary, body_md on public.posts
  for each row execute function public.keep_post_revision();
