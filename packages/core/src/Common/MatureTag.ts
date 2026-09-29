// The seeded content-note tag (SPEC.md §7). A post that carries it is blurred until the
// reader asks, and its summary stays out of every card, feed, digest and unfurl (#117).
// The slug must match the `mature` row supabase/seed.sql inserts into `public.tags`.
export const MATURE_TAG = "mature";

// Whether a post's tag links, as the post_tags embed returns them, include MATURE_TAG.
export function carriesMatureTag(
  postTags: readonly { readonly tag: { readonly slug: string } | null }[],
): boolean {
  return postTags.some((link) => link.tag?.slug === MATURE_TAG);
}
