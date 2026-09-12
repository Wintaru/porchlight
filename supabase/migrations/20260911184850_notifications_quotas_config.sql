-- Notifications (SPEC.md §8), quotas and rate limits (§4, §6), and site config (§7).

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  kind public.notification_kind not null,
  post_id uuid references public.posts (id) on delete cascade,
  comment_id uuid references public.comments (id) on delete cascade,
  report_id uuid references public.reports (id) on delete cascade,
  -- What the bell shows: the moderator's reason, the replier's handle, and so on.
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

comment on table public.notifications is 'In-app notifications (D13). The browser subscribes to its own rows over Realtime.';

-- The bell: unread first, newest first, for one recipient.
create index notifications_recipient_idx
  on public.notifications (recipient_id, created_at desc);
create index notifications_unread_idx
  on public.notifications (recipient_id)
  where read_at is null;

-- Realtime only broadcasts tables in this publication, and it applies RLS per subscriber.
alter publication supabase_realtime add table public.notifications;

-- Bytes and files a member has stored. Caps per trust level live in QuotaEngine.
create table public.quotas (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  bytes_used bigint not null default 0,
  files_count integer not null default 0,
  updated_at timestamptz not null default now(),
  constraint quotas_non_negative check (bytes_used >= 0 and files_count >= 0)
);

create trigger quotas_set_updated_at
  before update on public.quotas
  for each row execute function public.set_updated_at();

-- Fixed-window counters (D15): one row per subject, action and window. No Redis.
-- subject is 'ip:<salted hash>' or 'anon:<anonymous author id>'.
create table public.rate_limits (
  subject text not null,
  action text not null,
  window_start timestamptz not null,
  count integer not null default 0,
  primary key (subject, action, window_start),
  constraint rate_limits_count_non_negative check (count >= 0)
);

comment on table public.rate_limits is 'Fixed-window rate limit counters per IP hash and anonymous token (D15).';

-- Sweeping expired windows only needs this index.
create index rate_limits_window_idx on public.rate_limits (window_start);

-- Admin-editable settings as key/value rows. Seeded with the maximum-caution defaults.
create table public.site_config (
  key text primary key,
  value jsonb not null,
  updated_by uuid references public.profiles (id),
  updated_at timestamptz not null default now()
);

comment on table public.site_config is 'Region, attachment allowlist, auto-promotion policy and other admin settings (§7).';

create trigger site_config_set_updated_at
  before update on public.site_config
  for each row execute function public.set_updated_at();
