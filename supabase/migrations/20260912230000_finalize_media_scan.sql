-- Issue #10: the safety scan pipeline's write, atomic (SPEC.md §7). FinalizeUploadHandler
-- and FinalizeUploadAnonymouslyHandler already know the pipeline's verdict by the time
-- they call this: the media_assets row, its evidence envelope, and — only for a locked
-- verdict — the audit_log entry that doubles as the escalation record (issue #11 reads
-- audit_log for it rather than a second table) all land in one transaction.
--
-- Every nullable parameter below carries `default null`: a Postgres function parameter
-- has no nullability metadata of its own the way a table column does, so Supabase's type
-- generator marks a plain parameter as required and non-null regardless of the column it
-- feeds. A `default null` makes the generator mark the key optional, which is what lets
-- the TypeScript handler omit it instead of fighting a type that does not reflect the
-- schema's actual nullability.
create function public.finalize_media_scan(
  p_id uuid,
  p_storage_path text,
  p_kind public.media_kind,
  p_mime_type text,
  p_original_filename text,
  p_bytes bigint,
  p_sha256 text,
  p_scan_status public.scan_status,
  p_raw_ip_expires_at timestamptz,
  p_ip_hash text,
  p_turnstile_result public.turnstile_result,
  p_request_id text,
  p_frozen boolean,
  p_owner_id uuid default null,
  p_anonymous_author_id uuid default null,
  p_retain_until timestamptz default null,
  p_source_ip inet default null,
  p_source_port integer default null,
  p_user_agent text default null,
  p_perceptual_hash text default null,
  p_audit_event text default null,
  p_audit_details jsonb default null
)
returns setof public.media_assets
language plpgsql
set search_path = ''
as $$
begin
  insert into public.media_assets (
    id, owner_id, anonymous_author_id, storage_path, kind, mime_type,
    original_filename, bytes, sha256, scan_status, retain_until
  ) values (
    p_id, p_owner_id, p_anonymous_author_id, p_storage_path, p_kind, p_mime_type,
    p_original_filename, p_bytes, p_sha256, p_scan_status, p_retain_until
  );

  insert into public.submission_evidence (
    subject_kind, subject_id, author_id, anonymous_author_id, source_ip, source_port,
    raw_ip_expires_at, ip_hash, user_agent, turnstile_result, original_filename,
    original_bytes, sha256, perceptual_hash, request_id, frozen, retain_until
  ) values (
    'media', p_id, p_owner_id, p_anonymous_author_id, p_source_ip, p_source_port,
    p_raw_ip_expires_at, p_ip_hash, p_user_agent, p_turnstile_result, p_original_filename,
    p_bytes, p_sha256, p_perceptual_hash, p_request_id, p_frozen, p_retain_until
  );

  if p_audit_event is not null then
    insert into public.audit_log (actor_id, event, subject_kind, subject_id, details)
    values (null, p_audit_event, 'media', p_id, coalesce(p_audit_details, '{}'::jsonb));
  end if;

  return query select * from public.media_assets where id = p_id;
end;
$$;

revoke execute on function public.finalize_media_scan(
  uuid, text, public.media_kind, text, text, bigint, text, public.scan_status,
  timestamptz, text, public.turnstile_result, text, boolean, uuid, uuid, timestamptz,
  inet, integer, text, text, text, jsonb
) from public, anon, authenticated;
