// Exactly one author per post (the `posts_one_author` CHECK). A member's post points at
// a profile; an anonymous one at an `anonymous_authors` row until it is claimed (D7).
export type PostAuthor =
  | { readonly kind: "member"; readonly profileId: string }
  | { readonly kind: "anonymous"; readonly anonymousAuthorId: string };
