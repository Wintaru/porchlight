-- Moderation records (SPEC.md §7): reports, actions, the audit log and the block list.

-- A report goes with the item it is about: once a post or comment is erased there is
-- nothing left to act on, and the evidence envelope (not the report) is what a locked
-- item keeps.
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.profiles (id),
  post_id uuid references public.posts (id) on delete cascade,
  comment_id uuid references public.comments (id) on delete cascade,
  reason public.report_reason not null,
  details text,
  status public.report_status not null default 'open',
  resolved_by uuid references public.profiles (id),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  constraint reports_one_target check (num_nonnulls(post_id, comment_id) = 1),
  constraint reports_resolution_pair check ((resolved_by is null) = (resolved_at is null)),
  constraint reports_resolved_states check (
    (status in ('resolved', 'dismissed')) = (resolved_at is not null)
  )
);

comment on table public.reports is 'A report on a post or comment. illegal_content escalates at once (§7).';

create index reports_open_idx on public.reports (created_at) where status in ('open', 'escalated');
create index reports_post_idx on public.reports (post_id);
create index reports_comment_idx on public.reports (comment_id);

-- Every moderator action, with what it touched. At least one target.
create table public.mod_actions (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.profiles (id),
  action public.mod_action_kind not null,
  target_post_id uuid references public.posts (id) on delete set null,
  target_comment_id uuid references public.comments (id) on delete set null,
  target_profile_id uuid references public.profiles (id),
  target_anonymous_author_id uuid references public.anonymous_authors (id),
  target_media_id uuid references public.media_assets (id) on delete set null,
  reason text,
  created_at timestamptz not null default now()
  -- No "at least one target" check on purpose: `on delete set null` re-checks constraints,
  -- and an action whose only target was later erased (§10) must stay as a record.
);

comment on table public.mod_actions is 'One row per moderator action (§7). Targets are nulled when the item is deleted; the row stays.';

create index mod_actions_actor_idx on public.mod_actions (actor_id, created_at desc);
create index mod_actions_target_profile_idx on public.mod_actions (target_profile_id);

-- Append-only. actor_id is null for system events (a scan result, a retention sweep).
create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles (id),
  event text not null,
  subject_kind public.subject_kind,
  subject_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint audit_log_subject_pair check ((subject_kind is null) = (subject_id is null))
);

comment on table public.audit_log is 'Append-only. Global one-year retention regardless of region (§7).';

create index audit_log_subject_idx on public.audit_log (subject_kind, subject_id);
create index audit_log_created_idx on public.audit_log (created_at);

create trigger audit_log_refuse_change
  before update or delete on public.audit_log
  for each row execute function public.refuse_audit_log_change();

create trigger audit_log_refuse_truncate
  before truncate on public.audit_log
  for each statement execute function public.refuse_truncate();

-- The admin block list (D15): by anonymous token, by salted IP hash, or both.
create table public.blocks (
  id uuid primary key default gen_random_uuid(),
  anonymous_author_id uuid references public.anonymous_authors (id),
  ip_hash text,
  reason text,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  constraint blocks_has_subject check (num_nonnulls(anonymous_author_id, ip_hash) >= 1)
);

comment on table public.blocks is 'Anonymous blocks by token and salted IP hash (D15). Never a raw address.';

create index blocks_anonymous_author_idx on public.blocks (anonymous_author_id);
create index blocks_ip_hash_idx on public.blocks (ip_hash);
