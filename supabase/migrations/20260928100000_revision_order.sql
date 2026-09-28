-- Issue #97: revisions saved in one transaction keep their order. `now()` is the
-- transaction's start time, so two saves in one transaction (the voice guide trigger's
-- insert-then-trim, or a script that edits a post twice) got the same `replaced_at`, and
-- the order between them was up to the uuid. `clock_timestamp()` is the time of the
-- insert itself. The readers sort by `id` after `replaced_at`, so a tie that is still
-- possible (two inserts in the same microsecond) comes back in a fixed order.
alter table public.post_revisions
  alter column replaced_at set default clock_timestamp();

alter table public.voice_guide_revisions
  alter column replaced_at set default clock_timestamp();
