import type { DbClient } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import type { StoreNewMediaAssetRequest } from "../Requests/StoreNewMediaAssetRequest";
import { MediaAssetAccessFailedResponse } from "../Responses/MediaAssetAccessFailedResponse";
import { MediaAssetStoredResponse } from "../Responses/MediaAssetStoredResponse";
import { toMediaAsset } from "../toMediaAsset";

// `finalize_media_scan` writes the media_assets row, its evidence envelope, and — only
// for a locked verdict — the audit_log entry, in one transaction (SPEC.md §7). Its
// nullable parameters are optional in the generated Args type (they carry `default
// null` in the migration, since a Postgres function parameter has no nullability
// metadata of its own) — `exactOptionalPropertyTypes` means an absent value must be
// omitted from the object, not set to `undefined`, so this builds the args with spreads
// rather than a plain literal.
export class SupabaseStoreNewMediaAssetHandler implements IHandler<
  StoreNewMediaAssetRequest,
  MediaAssetStoredResponse | MediaAssetAccessFailedResponse
> {
  constructor(private readonly db: DbClient) {}

  async handle(
    request: StoreNewMediaAssetRequest,
  ): Promise<MediaAssetStoredResponse | MediaAssetAccessFailedResponse> {
    const { asset, evidence, auditEvent, correlationId } = request;
    const { data, error } = await this.db.rpc("finalize_media_scan", {
      p_id: asset.id,
      p_storage_path: asset.storagePath,
      p_kind: asset.kind,
      p_mime_type: asset.mimeType,
      p_original_filename: asset.originalFilename,
      p_bytes: asset.bytes,
      p_sha256: asset.sha256,
      p_scan_status: asset.scanStatus,
      p_raw_ip_expires_at: evidence.rawIpExpiresAt.toISOString(),
      p_ip_hash: evidence.ipHash,
      p_turnstile_result: evidence.turnstileResult,
      p_request_id: evidence.requestId,
      p_frozen: asset.scanStatus === "locked",
      ...(asset.owner.kind === "member" ? { p_owner_id: asset.owner.profileId } : {}),
      ...(asset.owner.kind === "anonymous"
        ? { p_anonymous_author_id: asset.owner.anonymousAuthorId }
        : {}),
      ...(asset.retainUntil !== null
        ? { p_retain_until: asset.retainUntil.toISOString() }
        : {}),
      ...(evidence.sourceIp !== null ? { p_source_ip: evidence.sourceIp } : {}),
      ...(evidence.sourcePort !== null ? { p_source_port: evidence.sourcePort } : {}),
      ...(evidence.userAgent !== undefined ? { p_user_agent: evidence.userAgent } : {}),
      ...(evidence.perceptualHash !== null
        ? { p_perceptual_hash: evidence.perceptualHash }
        : {}),
      ...(auditEvent !== undefined
        ? { p_audit_event: auditEvent.event, p_audit_details: auditEvent.details }
        : {}),
    });
    if (error) {
      return new MediaAssetAccessFailedResponse(correlationId, error.message);
    }
    const row = Array.isArray(data) ? data[0] : undefined;
    if (row === undefined) {
      return new MediaAssetAccessFailedResponse(
        correlationId,
        "finalize_media_scan returned no row",
      );
    }
    return new MediaAssetStoredResponse(correlationId, toMediaAsset(row));
  }
}
