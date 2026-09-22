-- Issue #28 (D22, SPEC.md §17): where a post came from. Every post records whether a
-- person or an agent wrote it, which token if an agent did, and when a signed-in person
-- last saved or published it. #30 turns these into the badge, the publish warning and
-- the disclosure footer.

create type public.post_origin as enum ('editor', 'agent');

alter table public.posts
  add column origin public.post_origin not null default 'editor',
  -- The token is kept for provenance, so revoking one must not erase the record: no
  -- cascade, and the column goes null if the token row is ever deleted.
  add column agent_token_id uuid references public.agent_tokens (id) on delete set null,
  -- The first save or publish by a signed-in person. Null on an agent draft nobody has
  -- opened yet; always set on a post a person wrote.
  add column reviewed_at timestamptz,
  -- Only an agent post names a token. `reviewed_at` carries no constraint: a post
  -- written before this migration has none, and the badge asks only whether an agent
  -- post is still unreviewed.
  add constraint posts_token_only_for_agent
    check (agent_token_id is null or origin = 'agent');

comment on column public.posts.origin is 'Who wrote the first draft: the editor (a person) or an agent (D22).';
comment on column public.posts.reviewed_at is 'When a signed-in person last saved or published it. Null means an agent draft nobody has reviewed.';

-- The drafts list shows the badge, so it filters on these two together.
create index posts_agent_unreviewed_idx
  on public.posts (author_id)
  where origin = 'agent' and reviewed_at is null;

alter table public.submission_evidence
  add column agent_token_id uuid references public.agent_tokens (id) on delete set null;

comment on column public.submission_evidence.agent_token_id is 'The agent token behind this submission, when an agent made it (D22).';
