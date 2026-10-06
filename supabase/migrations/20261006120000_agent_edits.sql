-- D32 (SPEC.md §17): a member may let their agent change their published posts. The
-- scope is opt-in. `agent_edited_at` marks a published post an agent changed and no
-- person has saved since; the posts list and the disclosure footer read it.
-- `reviewed_at` cannot carry this, because posts written before D22 have none.
alter type public.agent_scope add value 'posts:edit' after 'posts:publish';

alter table public.posts add column agent_edited_at timestamptz;

comment on column public.posts.agent_edited_at is 'When an agent last changed this published post, until a person saves it (D32). Null otherwise.';

grant select (agent_edited_at) on public.posts to anon, authenticated;
