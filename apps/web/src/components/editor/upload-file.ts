import { finalizeUpload, requestUpload } from "@/app/write/media-actions";
import type { UploadView } from "@/lib/upload-view";
import { uploadToSignedUrl } from "./upload-to-signed-url";

export type UploadOutcome =
  | { readonly ok: true; readonly upload: UploadView }
  | { readonly ok: false; readonly error: string };

// The three steps of one upload (SPEC.md §6): ask for a place, put the bytes there
// straight from the browser, then have the server check and scan what arrived. The
// cover picker and the attachment panel both upload this way.
export async function uploadFile(file: File): Promise<UploadOutcome> {
  const requested = await requestUpload(file.name, file.size);
  if (!requested.ok) {
    return { ok: false, error: requested.error };
  }
  try {
    await uploadToSignedUrl(requested.uploadUrl, file);
  } catch {
    return { ok: false, error: "The upload did not reach storage. Try again." };
  }
  return finalizeUpload(requested.mediaId, file.name);
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
