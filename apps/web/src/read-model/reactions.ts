import { Constants, type DbClient, type Enums } from "@porchlight/db";

// The reactions on a post and on its comments, counted per item and per kind in the
// database, with whether the viewer is among them so their buttons can show as pressed.
// Never a total per member and never a sort key (D9). The kinds come from the schema's
// enum: the read-model may not import the core, and the core's list is checked against
// this one.
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

interface CountRow {
  readonly comment_id: string | null;
  readonly kind: ReactionKind;
  readonly total: number;
  readonly mine: boolean;
}

const NO_COUNTS: ReactionCounts = { heart: 0, laugh: 0, wow: 0, sad: 0, clap: 0 };

export const NO_REACTIONS: ItemReactions = { counts: NO_COUNTS, mine: new Set() };

// One read under RLS, so a reaction on a comment the reader cannot see is not counted.
export async function loadReactionsForPost(
  db: DbClient,
  postId: string,
  viewerId: string | undefined,
): Promise<PostReactions> {
  const { data, error } = await db.rpc("post_reaction_counts", {
    p_post_id: postId,
    ...(viewerId === undefined ? {} : { p_viewer_id: viewerId }),
  });
  if (error) {
    throw new Error(`reactions for post ${postId}: ${error.message}`);
  }

  // The post's own counts come back with no comment id, which the generated type misses.
  const rows: readonly CountRow[] = data;
  const post = new Tally();
  const comments = new Map<string, Tally>();
  for (const { comment_id: commentId, kind, total, mine } of rows) {
    const tally = commentId === null ? post : (comments.get(commentId) ?? new Tally());
    if (commentId !== null) {
      comments.set(commentId, tally);
    }
    tally.add(kind, total, mine);
  }
  return {
    post: post.done(),
    comments: new Map([...comments].map(([id, tally]) => [id, tally.done()])),
  };
}

class Tally {
  private readonly counts: Record<ReactionKind, number> = { ...NO_COUNTS };
  private readonly mine = new Set<ReactionKind>();

  add(kind: ReactionKind, total: number, own: boolean): void {
    this.counts[kind] += total;
    if (own) {
      this.mine.add(kind);
    }
  }

  done(): ItemReactions {
    return { counts: this.counts, mine: this.mine };
  }
}
