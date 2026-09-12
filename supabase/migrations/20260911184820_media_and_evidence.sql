-- Uploads and the evidence envelope (SPEC.md §6, §7).

-- Every upload lands here as `pending` and stays quarantined until the scan pipeline
-- sets `clear`, `flagged` or `locked`. published_path is set only when a moderator has
-- approved the item (as mature, for a flagged one) and the re-encoded, metadata-stripped
-- copy exists, so it doubles as the "safe to show" marker for public reads.
create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles (id),
  anonymous_author_id uuid references public.anonymous_authors (id),
  storage_path text not null,
  published_path text,
  kind public.media_kind not null,
  mime_type text not null,
  original_filename text not null,
  bytes bigint not null,
  sha256 text not null,
  perceptual_hash text,
  scan_status public.scan_status not null default 'pending',
  -- Set when locked. The delete trigger below refuses deletion before this instant.
  retain_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint media_assets_storage_path_unique unique (storage_path),
  constraint media_assets_one_owner check (num_nonnulls(owner_id, anonymous_author_id) = 1),
  constraint media_assets_bytes_positive check (bytes > 0),
  constraint media_assets_sha256_shape check (sha256 ~ '^[0-9a-f]{64}$'),
  constraint media_assets_locked_has_retention check (
    scan_status <> 'locked' or retain_until is not null
  ),
  -- A published copy needs a scan verdict a moderator may act on: `clear`, or `flagged`
  -- when approved as mature (§7). Never `pending`, never `locked`.
  constraint media_assets_published_only_when_scanned check (
    published_path is null or scan_status in ('clear', 'flagged')
  )
);

comment on table public.media_assets is
  'One row per upload. Quarantined until scanned; published_path marks the approved copy (§7).';

create index media_assets_owner_idx on public.media_assets (owner_id);
create index media_assets_scan_status_idx on public.media_assets (scan_status);

create trigger media_assets_set_updated_at
  before update on public.media_assets
  for each row execute function public.set_updated_at();

create trigger media_assets_refuse_delete_while_retained
  before delete on public.media_assets
  for each row execute function public.refuse_delete_before_retain_until();

create trigger media_assets_refuse_truncate
  before truncate on public.media_assets
  for each statement execute function public.refuse_truncate();

-- What authorities ask for, captured in the same transaction as the submission (§7).
-- subject_id carries no foreign key: a frozen envelope outlives the item and the account
-- it belongs to, and erasure skips frozen rows.
create table public.submission_evidence (
  id uuid primary key default gen_random_uuid(),
  subject_kind public.subject_kind not null,
  subject_id uuid not null,
  author_id uuid references public.profiles (id),
  anonymous_author_id uuid references public.anonymous_authors (id),
  -- Raw address and port live for the region-gated window, then are nulled.
  source_ip inet,
  source_port integer,
  raw_ip_expires_at timestamptz not null,
  -- The salted hash stays after the window and feeds the D15 block list.
  ip_hash text not null,
  submitted_at timestamptz not null default now(),
  user_agent text,
  turnstile_result public.turnstile_result not null,
  original_filename text,
  original_bytes bigint,
  sha256 text,
  perceptual_hash text,
  request_id text not null,
  frozen boolean not null default false,
  retain_until timestamptz,
  constraint submission_evidence_one_author check (
    num_nonnulls(author_id, anonymous_author_id) = 1
  ),
  constraint submission_evidence_frozen_has_retention check (
    not frozen or retain_until is not null
  ),
  constraint submission_evidence_port_range check (
    source_port is null or source_port between 0 and 65535
  )
);

comment on table public.submission_evidence is
  'The evidence envelope of one post, comment or upload (§7). Frozen rows outlive erasure.';

create index submission_evidence_subject_idx
  on public.submission_evidence (subject_kind, subject_id);
create index submission_evidence_raw_ip_expiry_idx
  on public.submission_evidence (raw_ip_expires_at)
  where source_ip is not null;

create trigger submission_evidence_refuse_delete_while_retained
  before delete on public.submission_evidence
  for each row execute function public.refuse_delete_before_retain_until();

create trigger submission_evidence_refuse_truncate
  before truncate on public.submission_evidence
  for each statement execute function public.refuse_truncate();
