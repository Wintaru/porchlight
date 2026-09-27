import { finalizeUpload, requestUpload } from "@/app/write/media-actions";
import type { UploadView } from "@/lib/upload-view";
import { isVideoFile, prepareVideo } from "./prepare-video";
import { uploadToSignedUrl } from "./upload-to-signed-url";

export type UploadOutcome =
  | { readonly ok: true; readonly upload: UploadView }
  | { readonly ok: false; readonly error: string };

// Where a long upload is, for the panel to show: a video is converted first (#21).
export interface UploadProgress {
  readonly stage: "preparing" | "uploading";
  readonly fraction: number;
}

// The three steps of one upload (SPEC.md §6): ask for a place, put the bytes there
// straight from the browser, then have the server check and scan what arrived. The
// cover picker and the attachment panel both upload this way. A video is converted in
// the browser before any of them (prepare-video.ts).
// `postId` is the post the upload is for, when the editor has one (#80).
export async function uploadFile(
  file: File,
  onProgress?: (progress: UploadProgress) => void,
  postId: string | null = null,
): Promise<UploadOutcome> {
  let upload = file;
  let convertedFrom: { readonly filename: string; readonly bytes: number } | null = null;
  if (isVideoFile(file)) {
    const prepared = await prepareVideo(file, (fraction) =>
      onProgress?.({ stage: "preparing", fraction }),
    );
    if (!prepared.ok) {
      return prepared;
    }
    upload = prepared.file;
    convertedFrom = { filename: file.name, bytes: file.size };
  }
  const requested = await requestUpload(upload.name, upload.size);
  if (!requested.ok) {
    return { ok: false, error: requested.error };
  }
  try {
    await uploadToSignedUrl(requested.uploadUrl, upload, (fraction) =>
      onProgress?.({ stage: "uploading", fraction }),
    );
  } catch {
    return { ok: false, error: "The upload did not reach storage. Try again." };
  }
  return finalizeUpload(requested.mediaId, upload.name, convertedFrom, postId);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${String(bytes)} B`;
  }
  const kib = bytes / 1024;
  if (kib < 1024) {
    return `${kib.toFixed(0)} KB`;
  }
  return `${(kib / 1024).toFixed(1)} MB`;
}
