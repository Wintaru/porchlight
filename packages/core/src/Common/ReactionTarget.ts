// What a reaction sits on: a post or a comment, never both (the `reactions_one_target`
// CHECK). Counts live on the item and nowhere else (D9).
export type ReactionTarget =
  | { readonly kind: "post"; readonly id: string }
  | { readonly kind: "comment"; readonly id: string };
