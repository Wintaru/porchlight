// What the editor's background calls answer. They return instead of redirecting: the
// page stays put and shows the word in the top bar. The error is a code from the same
// table the redirects use (`errorTextFor`), so one sentence serves both.
// `version` is the post's version after this save: the next autosave sends it (#100).
export type AutosaveResult =
  | { readonly ok: true; readonly postId: string; readonly version: number }
  | { readonly ok: false; readonly error: string };

// A Save or Publish with JS: a stored save redirects, so only a refusal comes back.
export interface SaveRefusedResult {
  readonly ok: false;
  readonly error: string;
}

export type PreviewResult =
  { readonly ok: true; readonly bodyHtml: string } | { readonly ok: false };

// The Check button's answer (#32): each warning as its sentence, or a failure.
export type CheckResult =
  { readonly ok: true; readonly warnings: readonly string[] } | { readonly ok: false };
