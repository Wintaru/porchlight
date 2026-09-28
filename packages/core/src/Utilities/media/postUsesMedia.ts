// Whether a post's body or cover uses an upload. Mirrors the SQL `post_uses_media`
// (#80): the cover is that upload, or the body holds its id anywhere, as every address
// of an upload does. Used where the text in hand is newer than the stored row (#90).
export interface PostMediaUse {
  readonly bodyMd: string;
  readonly coverMediaId: string | null;
}

export function postUsesMedia(post: PostMediaUse, mediaId: string): boolean {
  return post.coverMediaId === mediaId || post.bodyMd.includes(mediaId);
}
