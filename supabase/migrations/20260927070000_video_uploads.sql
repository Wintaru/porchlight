-- Video uploads (#21, D4b). A video is far larger than a photo: the trusted cap is
-- 250 MiB and an admin has no quota (D16). The bucket limit stays the coarse outer bound
-- (20260912215700_storage_buckets.sql): FinalizeUploadHandler checks the real size
-- against the per-trust-level caps. 500 MiB is the largest file the site takes from
-- anyone, an admin included. The project-wide upload limit in the Supabase dashboard
-- must be at least this high too (docs/deploy.md).
update storage.buckets
set file_size_limit = 524288000
where id in ('quarantine', 'public-media');

-- HEIC photos and MP4 video join the default attachment allowlist (#21). A site that
-- saved its allowlist before these types existed never had the chance to choose them,
-- so they are added to a stored list once, here. An admin can untick either on /admin.
-- A site with no stored list reads the new default in code already.
update public.site_config
set value = value || (
  select coalesce(jsonb_agg(added), '[]'::jsonb)
  from unnest(array['heic', 'mp4']) as added
  where not value ? added
)
where key = 'attachment_allowlist';
