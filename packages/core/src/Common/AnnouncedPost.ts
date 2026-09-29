// A post as a reader's email lists it (#22, D20): public, published, and announced
// once (posts.announced_at, #24). `authorHandle` is null for an unclaimed anonymous post,
// whose only address is /p/slug. `summary` is the author's, else the body's first
// sentence (posts.excerpt, D18), as on the feed card, and null for a post with the
// mature tag, whose text stays behind its click (#117).
export interface AnnouncedPost {
  readonly id: string;
  readonly title: string;
  readonly summary: string | null;
  readonly slug: string;
  readonly authorId: string | null;
  readonly authorHandle: string | null;
  readonly announcedAt: Date;
}
