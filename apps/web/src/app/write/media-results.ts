import type { UploadView } from "@/lib/upload-view";

// What the attachment panel's background calls answer. They return instead of
// redirecting, the same shape `AutosaveResult` and `PreviewResult` use: the page stays
// put and the panel shows the word.
export type RequestUploadResult =
  | { readonly ok: true; readonly mediaId: string; readonly uploadUrl: string }
  | { readonly ok: false; readonly error: string };

export type FinalizeUploadResult =
  | { readonly ok: true; readonly upload: UploadView }
  | { readonly ok: false; readonly error: string };

export interface DeleteUploadResult {
  readonly ok: boolean;
}

// A saved cover looked up again: `gone` when it no longer exists or is not the member's,
// `failed` when the lookup itself did not work — the cover then stays as it was.
export type UploadLookup =
  | { readonly status: "found"; readonly upload: UploadView }
  | { readonly status: "gone" }
  | { readonly status: "failed" };
