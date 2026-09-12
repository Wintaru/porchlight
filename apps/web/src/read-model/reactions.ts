import { Constants, type DbClient, type Enums } from "@porchlight/db";

// The reactions on a post and on its comments: `kind` and `profile_id`, nothing more.
// Counts are summed here, per item and per kind, and the viewer's own are kept as a
// set so their buttons can show as pressed. Never a total per member and never a sort
// key (D9). The kinds come from the schema's enum: the read-model may not import the
// core, and the core's list is checked against this one.
const POST_REACTION_COLUMNS = "kind, profile_id";
// `comments!inner(post_id)` is the join the post-id filter runs on; the embedded
// column is not read.
const COMMENT_REACTION_COLUMNS = "comment_id, kind, profile_id, comments!inner(post_id)";

export type ReactionKind = Enums<"reaction_kind">;

export const REACTION_KINDS: readonly ReactionKind[] =
  Constants.public.Enums.reaction_kind;

export type ReactionCounts = Readonly<Record<ReactionKind, number>>;

export interface ItemReactions {
  readonly counts: ReactionCounts;
  readonly mine: ReadonlySet<ReactionKind>;
}

export interface PostReactions {
  readonly post: ItemReactions;
  readonly comments: ReadonlyMap<string, ItemReactions>;
}

const NO_COUNTS: ReactionCounts = { heart: 0, laugh: 0, wow: 0, sad: 0, clap: 0 };

export const NO_REACTIONS: ItemReactions = { counts: NO_COUNTS, mine: new Set() };

// Two reads, both filtered at the source: the post's own rows by `post_id`, and the
// comments' rows through the join (`comments!inner` with the post id on the comment),
// so a long thread never puts an id list on the request line. Both run under RLS, so a
// reaction on a comment the reader cannot see is not returned either.
export async function loadReactionsForPost(
  db: DbClient,
  postId: string,
  viewerId: string | undefined,
): Promise<PostReactions> {
  const [onPost, onComments] = await Promise.all([
    db.from("reactions").select(POST_REACTION_COLUMNS).eq("post_id", postId),
    db.from("reactions").select(COMMENT_REACTION_COLUMNS).eq("comments.post_id", postId),
  ]);
  if (onPost.error) {
    throw new Error(`reactions for post ${postId}: ${onPost.error.message}`);
  }
  if (onComments.error) {
    throw new Error(`reactions for comments of ${postId}: ${onComments.error.message}`);
  }

  const post = new Tally();
  for (const row of onPost.data) {
    post.add(row.kind, row.profile_id === viewerId);
  }
  const comments = new Map<string, Tally>();
  for (const row of onComments.data) {
    if (row.comment_id === null) {
      continue;
    }
    const tally = comments.get(row.comment_id) ?? new Tally();
    comments.set(row.comment_id, tally);
    tally.add(row.kind, row.profile_id === viewerId);
  }
  return {
    post: post.done(),
    comments: new Map([...comments].map(([id, tally]) => [id, tally.done()])),
  };
}

class Tally {
  private readonly counts: Record<ReactionKind, number> = { ...NO_COUNTS };
  private readonly mine = new Set<ReactionKind>();

  add(kind: ReactionKind, own: boolean): void {
    this.counts[kind] += 1;
    if (own) {
      this.mine.add(kind);
    }
  }

  done(): ItemReactions {
    return { counts: this.counts, mine: this.mine };
  }
}
