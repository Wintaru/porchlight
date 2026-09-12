// What the editor's background calls answer. They return instead of redirecting: the
// page stays put and shows the word in the top bar. The error is a code from the same
// table the redirects use (`errorTextFor`), so one sentence serves both.
export type AutosaveResult =
  | { readonly ok: true; readonly postId: string }
  | { readonly ok: false; readonly error: string };

export type PreviewResult =
  { readonly ok: true; readonly bodyHtml: string } | { readonly ok: false };
