import type { Tables } from "@porchlight/db";

import type { ContentAuthor } from "../../Common/ContentAuthor";
import type { MediaAsset } from "../../Common/MediaAsset";

// Never `select *`: the shape here is the one the mapper below expects.
export const MEDIA_ASSET_COLUMNS =
  "id, owner_id, anonymous_author_id, storage_path, published_path, kind, mime_type, original_filename, bytes, sha256, scan_status, retain_until, created_at, updated_at";

export type MediaAssetRow = Pick<
  Tables<"media_assets">,
  | "id"
  | "owner_id"
  | "anonymous_author_id"
  | "storage_path"
  | "published_path"
  | "kind"
  | "mime_type"
  | "original_filename"
  | "bytes"
  | "sha256"
  | "scan_status"
  | "retain_until"
  | "created_at"
  | "updated_at"
>;

export function toMediaAsset(row: MediaAssetRow): MediaAsset {
  return {
    id: row.id,
    owner: toOwner(row),
    storagePath: row.storage_path,
    publishedPath: row.published_path,
    kind: row.kind,
    mimeType: row.mime_type,
    originalFilename: row.original_filename,
    bytes: row.bytes,
    sha256: row.sha256,
    scanStatus: row.scan_status,
    retainUntil: row.retain_until === null ? null : new Date(row.retain_until),
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

// The `media_assets_one_owner` CHECK guarantees exactly one of the two columns is set.
function toOwner(
  row: Pick<MediaAssetRow, "id" | "owner_id" | "anonymous_author_id">,
): ContentAuthor {
  if (row.owner_id !== null) {
    return { kind: "member", profileId: row.owner_id };
  }
  if (row.anonymous_author_id !== null) {
    return { kind: "anonymous", anonymousAuthorId: row.anonymous_author_id };
  }
  throw new Error(`media asset ${row.id} has no owner`);
}
