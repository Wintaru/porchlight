// What a moderator action, or a report, is aimed at (SPEC.md §7): a post or a comment.
// Shared by ModerationManager's item actions and ReportAccessor, so both name the same
// two kinds the same way.
export type ModerationTarget =
  | { readonly kind: "post"; readonly id: string }
  | { readonly kind: "comment"; readonly id: string };
