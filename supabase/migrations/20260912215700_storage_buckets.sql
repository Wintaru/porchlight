-- The two phase 1 buckets behind MediaStorageAccessor (SPEC.md §6, D4). Quarantine
-- holds every original upload until #10's scan pipeline and #11's approval queue clear
-- it; nothing in it is public. The public bucket is where #10/#11 later copy an
-- approved, re-encoded file — this issue never writes to it, but the bucket exists now
-- so that later work is a copy, not a bucket-creation migration of its own.
--
-- `file_size_limit` is a coarse outer bound, not the real cap: FinalizeUploadHandler
-- re-checks the actual downloaded bytes against the site's per-trust-level quota
-- (site_config.attachment_quota_by_trust, default 20 MiB for a trusted member's largest
-- file). This just stops a wildly oversized upload at the storage layer itself, ahead
-- of anything this application code gets a chance to reject.
insert into storage.buckets (id, name, public, file_size_limit)
values
  ('quarantine', 'quarantine', false, 52428800),
  ('public-media', 'public-media', true, 52428800)
on conflict (id) do nothing;
