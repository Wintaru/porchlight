-- Issue #31: an agent's upload names its token in the evidence envelope, as an agent's
-- post already does (SPEC.md §17, D22). A frozen envelope for a locked upload then shows
-- which token sent it, so the member knows which one to revoke. Same body as the #10
-- function plus the one parameter and column; the old signature is dropped rather than
-- overloaded, so every caller reaches this one.
drop function public.finalize_media_scan(
  uuid, text, public.media_kind, text, text, bigint, text, public.scan_status,
  timestamptz, text, public.turnstile_result, text, boolean, uuid, uuid, timestamptz,
  inet, integer, text, text, text, jsonb
);

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
  p_audit_details jsonb default null,
  p_agent_token_id uuid default null
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
    original_bytes, sha256, perceptual_hash, request_id, frozen, retain_until,
    agent_token_id
  ) values (
    'media', p_id, p_owner_id, p_anonymous_author_id, p_source_ip, p_source_port,
    p_raw_ip_expires_at, p_ip_hash, p_user_agent, p_turnstile_result, p_original_filename,
    p_bytes, p_sha256, p_perceptual_hash, p_request_id, p_frozen, p_retain_until,
    p_agent_token_id
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
  inet, integer, text, text, text, jsonb, uuid
) from public, anon, authenticated;
