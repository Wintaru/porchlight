// Who a comment list is for, so the store returns only what that reader may see: the
// same wall the `comments_public_read` and `comments_own_read` policies draw for the
// browser. `public` is visible comments and tombstones; `member` adds that member's own
// in any status; `all` is every row, for an admin.
export type CommentReadership =
  | { readonly kind: "public" }
  | { readonly kind: "member"; readonly profileId: string }
  | { readonly kind: "all" };
