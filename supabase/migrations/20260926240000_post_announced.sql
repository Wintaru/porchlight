-- Issue #24 review: a post tells its followers it is out once, ever. Unpublish and
-- publish again, a double-click on Publish, or two moderators approving the same post
-- together would each fan out again. `announced_at` is claimed with one conditional
-- update, so only the first of those finds it empty and sends the notices.
alter table public.posts add column announced_at timestamptz;

comment on column public.posts.announced_at is
  'When followers were told this post is out (#24). Set once; never readable by browser roles.';
