import { MATURE_TAG } from "@/lib/mature-tag";
import { publicMediaUrl } from "@/lib/media-url";

interface CoverSource {
  readonly cover: {
    readonly published_path: string | null;
    readonly mature: boolean;
  } | null;
  readonly post_tags: readonly { readonly tag: { readonly slug: string } | null }[];
}

export interface ShownCover {
  readonly src: string;
  // Blurred behind a click (SPEC.md §7): the image itself is mature, or the post
  // carries the mature tag.
  readonly mature: boolean;
}

// The one rule for whether a post's cover shows, on its own page and on a feed card
// (#73). A cover shows only once it has a published copy (#36): a held or quarantined
// one has no `published_path`, so it shows nowhere and takes no space.
export function shownCover(post: CoverSource): ShownCover | undefined {
  const path = post.cover?.published_path;
  if (post.cover === null || path === null || path === undefined) {
    return undefined;
  }
  return {
    src: publicMediaUrl(path),
    mature:
      post.cover.mature || post.post_tags.some((link) => link.tag?.slug === MATURE_TAG),
  };
}
