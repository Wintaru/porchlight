// One thing check_draft noticed in a draft (SPEC.md §17, #32). Warnings, never a block:
// the heuristics catch the obvious and miss the rest, and the writer decides.
export type DraftWarning =
  // A phrase the voice guide bans, and how often it appears.
  | { readonly kind: "banned-phrase"; readonly phrase: string; readonly count: number }
  // Every sentence about the same length: the flat rhythm of generated text.
  | { readonly kind: "uniform-sentences"; readonly meanWords: number }
  // Many "this, that, and the other" lists of three.
  | { readonly kind: "tricolons"; readonly count: number }
  // A heading over nearly every paragraph.
  | { readonly kind: "headings"; readonly headings: number; readonly paragraphs: number }
  // The last paragraph sums up what came before.
  | { readonly kind: "closing-summary"; readonly opening: string };

// The one sentence each warning reads as, in the editor and in the check_draft tool.
export function draftWarningText(warning: DraftWarning): string {
  switch (warning.kind) {
    case "banned-phrase":
      return warning.count === 1
        ? `"${warning.phrase}" is on the banned list.`
        : `"${warning.phrase}" is on the banned list (${String(warning.count)} times).`;
    case "uniform-sentences":
      return `The sentences are all about the same length (${String(warning.meanWords)} words). Vary them.`;
    case "tricolons":
      return `${String(warning.count)} lists of three. One is a style; many read as a formula.`;
    case "headings":
      return `${String(warning.headings)} headings for ${String(warning.paragraphs)} paragraphs. A heading over every paragraph reads like a report.`;
    case "closing-summary":
      return `The last paragraph opens with "${warning.opening}" and sums up. Stop when the point is made.`;
  }
}
