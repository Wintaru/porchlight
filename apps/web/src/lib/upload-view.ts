import type { MediaAsset, MediaKind } from "@porchlight/core";

import { publicMediaUrl } from "@/lib/media-url";

// One upload as the editor shows it (#52). `publicUrl` is the published copy (#36):
// what goes into a post. Null while a flagged image waits for a moderator, or when the
// copy could not be made (`retryable`: the scan cleared it, so trying again may work).
// A `mature` image is only ever a cover, where the post page blurs it; in the body it
// would show unblurred.
export interface UploadView {
  readonly mediaId: string;
  readonly originalFilename: string;
  readonly kind: MediaKind;
  readonly bytes: number;
  readonly publicUrl: string | null;
  readonly awaitingReview: boolean;
  readonly retryable: boolean;
  readonly mature: boolean;
}

export function uploadViewOf(asset: MediaAsset): UploadView {
  return {
    mediaId: asset.id,
    originalFilename: asset.originalFilename,
    kind: asset.kind,
    bytes: asset.bytes,
    publicUrl:
      asset.publishedPath === null ? null : publicUrlOf(asset, asset.publishedPath),
    awaitingReview: asset.scanStatus === "flagged" && asset.publishedPath === null,
    retryable: asset.scanStatus === "clear" && asset.publishedPath === null,
    mature: asset.mature,
  };
}

// An image is shown inline. Any other file is a download from the storage origin,
// never opened in the page (SPEC.md §6): `download` makes Supabase Storage answer with
// `Content-Disposition: attachment` under the original name.
function publicUrlOf(asset: MediaAsset, publishedPath: string): string {
  const url = publicMediaUrl(publishedPath);
  if (asset.kind === "image") {
    return url;
  }
  return `${url}?${new URLSearchParams({ download: asset.originalFilename }).toString()}`;
}
