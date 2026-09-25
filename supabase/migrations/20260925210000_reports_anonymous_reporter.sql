-- Issue #58: a visitor's report names the anonymous author the guard admitted, so a
-- moderator can block a visitor who files false reports (SPEC.md §7, D15). A member's
-- report names the member; a report filed before this has neither.
alter table public.reports
  add column reporter_anonymous_author_id uuid
    references public.anonymous_authors (id) on delete set null,
  add constraint reports_one_reporter check (
    num_nonnulls(reporter_id, reporter_anonymous_author_id) <= 1
  );

comment on column public.reports.reporter_anonymous_author_id is
  'The anonymous author a visitor''s report came from (#58), for the block button.';

-- Postgres does not index a foreign key on its own; this keeps a later delete of an
-- anonymous author from scanning every report.
create index reports_reporter_anonymous_author_idx
  on public.reports (reporter_anonymous_author_id)
  where reporter_anonymous_author_id is not null;
