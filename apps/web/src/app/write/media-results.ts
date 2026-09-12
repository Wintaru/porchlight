import type { MediaKind } from "@porchlight/core";

// What the attachment panel's background calls answer. They return instead of
// redirecting, the same shape `AutosaveResult` and `PreviewResult` use: the page stays
// put and the panel shows the word.
export type RequestUploadResult =
  | { readonly ok: true; readonly mediaId: string; readonly uploadUrl: string }
  | { readonly ok: false; readonly error: string };

export type FinalizeUploadResult =
  | {
      readonly ok: true;
      readonly mediaId: string;
      readonly originalFilename: string;
      readonly kind: MediaKind;
      readonly bytes: number;
      readonly viewUrl: string;
    }
  | { readonly ok: false; readonly error: string };

export interface DeleteUploadResult {
  readonly ok: boolean;
}
