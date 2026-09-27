-- Issue #43: rate_limits rows go once their window can no longer count. Producers: the
-- D15 anonymous guard and the email subscribe limits (hourly windows), and the agent
-- caps (#28, daily windows). A row is kept two days from its window's start: past the
-- longest window, with a day to spare for a clock that runs late. Nothing reads an
-- older row.
comment on table public.rate_limits is
  'Fixed-window rate limit counters (D15, #28, #22). Rows older than two days are swept hourly (#43).';

-- Answers how many rows it removed, for the job log. `rate_limits_window_idx` keeps the
-- scan to the old rows.
create function public.sweep_rate_limits()
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_removed integer;
begin
  delete from public.rate_limits
  where window_start < now() - interval '2 days';
  get diagnostics v_removed = row_count;
  return v_removed;
end;
$$;

revoke execute on function public.sweep_rate_limits () from public, anon, authenticated;

-- In the database, like null-expired-raw-ips, so it runs on any host that runs the
-- stack. pg_cron is already on (20260925170000_null_expired_raw_ips).
select cron.schedule(
  'sweep-rate-limits',
  '23 * * * *',
  'select public.sweep_rate_limits()'
);
