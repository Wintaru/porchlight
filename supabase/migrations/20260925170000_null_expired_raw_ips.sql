-- Issue #62: raw addresses leave the evidence envelope when their window closes
-- (SPEC.md §7). Every row sets `raw_ip_expires_at` from the region's
-- `raw_ip_retention_days`; after it, the raw address and port are nulled and only the
-- salted hash stays. A frozen row (a locked item) keeps its whole envelope until
-- `retain_until`, so this skips it until then — the same test the delete trigger uses.
--
-- Answers how many rows it cleared, for the job log.
create function public.null_expired_raw_ips()
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_cleared integer;
begin
  update public.submission_evidence
  set source_ip = null, source_port = null
  where raw_ip_expires_at <= now()
    and (source_ip is not null or source_port is not null)
    and (retain_until is null or retain_until <= now());
  get diagnostics v_cleared = row_count;
  return v_cleared;
end;
$$;

revoke execute on function public.null_expired_raw_ips () from public, anon, authenticated;

-- The schedule lives in the database, so it runs on any host that runs the stack:
-- hosted Supabase and the self-hosted images both ship pg_cron. Daily is enough for a
-- window counted in days; `raw_ip_expiry_idx` keeps the scan to the expired rows.
create extension if not exists pg_cron with schema pg_catalog;

select cron.schedule(
  'null-expired-raw-ips',
  '17 3 * * *',
  'select public.null_expired_raw_ips()'
);
