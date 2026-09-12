// An `anonymous_authors` row as every layer sees it (D7). The secret never leaves the
// browser and its cookie; the store keeps only the hash, and this shape omits even that.
export interface AnonymousAuthor {
  readonly id: string;
  readonly claimedBy: string | null;
  readonly createdAt: Date;
}
