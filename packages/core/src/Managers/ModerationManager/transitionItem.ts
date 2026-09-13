import type { ICommentAccessor } from "../../Accessors/CommentAccessor/ICommentAccessor";
import { StoreCommentStatusRequest } from "../../Accessors/CommentAccessor/Requests/StoreCommentStatusRequest";
import { CommentStoredResponse } from "../../Accessors/CommentAccessor/Responses/CommentStoredResponse";
import type { IPostAccessor } from "../../Accessors/PostAccessor/IPostAccessor";
import { StorePostChangesRequest } from "../../Accessors/PostAccessor/Requests/StorePostChangesRequest";
import { PostStoredResponse } from "../../Accessors/PostAccessor/Responses/PostStoredResponse";
import type { CommentStatus } from "../../Common/CommentStatus";
import type { ModerationTarget } from "../../Common/ModerationTarget";
import type { PostStatus } from "../../Common/PostStatus";
import type { LoadedItem } from "./LoadedItem";
import type { ModerationItemResponse } from "./Responses/ModerationItemResponse";
import type { ModerationUnavailableResponse } from "./Responses/ModerationUnavailableResponse";
import { unavailable } from "./unavailable";

export type Item = ModerationItemResponse["item"];

// The shared move behind approve, reject, hide and remove (SPEC.md §7): the same
// status change lands on whichever kind the target is, with the same rejection-reason
// bookkeeping (set for `reject`, cleared for anything else).
export async function transitionItem(
  posts: IPostAccessor,
  comments: ICommentAccessor,
  target: ModerationTarget,
  status: {
    readonly post: PostStatus;
    readonly comment: Exclude<CommentStatus, "tombstone">;
  },
  rejectionReason: string | null,
  context: { readonly correlationId: string; readonly timestamp: Date },
): Promise<Item | ModerationUnavailableResponse> {
  if (target.kind === "post") {
    const publishedAt = status.post === "published" ? context.timestamp : undefined;
    const stored = await posts.store(
      new StorePostChangesRequest(
        target.id,
        {
          status: status.post,
          rejectionReason,
          ...(publishedAt !== undefined ? { publishedAt } : {}),
        },
        context,
      ),
    );
    if (stored instanceof PostStoredResponse) {
      return { kind: "post", post: stored.post };
    }
    return unavailable(context.correlationId, stored, "posts.store");
  }
  const stored = await comments.store(
    new StoreCommentStatusRequest(target.id, status.comment, rejectionReason, context),
  );
  if (stored instanceof CommentStoredResponse && stored.comment.status !== "tombstone") {
    return { kind: "comment", comment: stored.comment };
  }
  return unavailable(context.correlationId, stored, "comments.store");
}

// Reuses `LoadedItem`'s own item, so a caller that already loaded the item for a
// permission check does not need to re-shape it after the transition.
export function itemOf(loaded: LoadedItem): Item {
  return loaded.kind === "post"
    ? { kind: "post", post: loaded.post }
    : { kind: "comment", comment: loaded.comment };
}

export function isItem(value: Item | ModerationUnavailableResponse): value is Item {
  return "kind" in value;
}
