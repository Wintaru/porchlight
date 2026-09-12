// Who wrote a post or a comment: exactly one of the two (the `posts_one_author` and
// `comments_one_author_or_tombstone` CHECKs). A member's item points at a profile; an
// anonymous one at an `anonymous_authors` row until it is claimed (D7).
export type ContentAuthor =
  | { readonly kind: "member"; readonly profileId: string }
  | { readonly kind: "anonymous"; readonly anonymousAuthorId: string };
