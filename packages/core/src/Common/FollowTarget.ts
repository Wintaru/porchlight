// What a member follows (#24, D20): an author by profile id, or a tag by its slug, the
// same name a post carries it by.
export type FollowTarget =
  | { readonly kind: "author"; readonly profileId: string }
  | { readonly kind: "tag"; readonly slug: string };
