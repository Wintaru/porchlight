import type { ICommentAccessor } from "../../Accessors/CommentAccessor/ICommentAccessor";
import { LoadCommentByIdRequest } from "../../Accessors/CommentAccessor/Requests/LoadCommentByIdRequest";
import { CommentLoadedResponse } from "../../Accessors/CommentAccessor/Responses/CommentLoadedResponse";
import type { IMemberBlockAccessor } from "../../Accessors/MemberBlockAccessor/IMemberBlockAccessor";
import { LoadMemberBlocksOfTargetRequest } from "../../Accessors/MemberBlockAccessor/Requests/LoadMemberBlocksOfTargetRequest";
import { MemberBlocksLoadedResponse } from "../../Accessors/MemberBlockAccessor/Responses/MemberBlocksLoadedResponse";
import type { NotificationKind } from "../../Common/NotificationKind";
import type { RequestContext } from "../../Common/RequestContext";
import type { LoadedItem } from "./LoadedItem";
import type { NotificationToSend } from "./recordModeration";

// The item's own author, told a decision was made about their post or comment (SPEC.md
// §8): approved, rejected, or another moderator action (hide, remove). Empty for an
// anonymous author: nobody has an inbox to notify until #34/#35 give one, and the
// `/anon` status page already answers "what happened to it" for them.
export function authorNotice(
  item: LoadedItem,
  kind: NotificationKind,
  payload: Record<string, unknown> = {},
): NotificationToSend[] {
  const author = item.kind === "post" ? item.post.author : item.comment.author;
  if (author.kind !== "member") {
    return [];
  }
  const target =
    item.kind === "post"
      ? { postId: item.post.id }
      : { postId: item.comment.postId, commentId: item.comment.id };
  return [{ recipientId: author.profileId, kind, ...target, payload }];
}

// When the approved item is a reply, the comment it answers gets its own notice
// (SPEC.md §8): the parent author asked to be told, distinct from `authorNotice`
// telling the reply's own author their comment is now visible. Silent when the two
// are the same person (a reply to your own comment) — nobody notifies themself — and
// when the parent's author muted or blocked the reply's author (#23), the same rule
// CreateComment applies to a reply that is visible at once. Like a parent that cannot
// be loaded, a mute check that cannot be read sends no notice: the approval stands.
export async function replyNotice(
  comments: ICommentAccessor,
  memberBlocks: IMemberBlockAccessor,
  item: LoadedItem,
  context: Required<Pick<RequestContext, "correlationId">>,
): Promise<NotificationToSend[]> {
  if (item.kind !== "comment" || item.comment.parentId === null) {
    return [];
  }
  const parent = await comments.load(
    new LoadCommentByIdRequest(item.comment.parentId, context),
  );
  if (
    !(parent instanceof CommentLoadedResponse) ||
    parent.comment.status === "tombstone" ||
    parent.comment.author.kind !== "member"
  ) {
    return [];
  }
  const replier = item.comment.author;
  if (replier.kind === "member") {
    if (replier.profileId === parent.comment.author.profileId) {
      return [];
    }
    const held = await memberBlocks.load(
      new LoadMemberBlocksOfTargetRequest(
        replier.profileId,
        [parent.comment.author.profileId],
        context,
      ),
    );
    if (!(held instanceof MemberBlocksLoadedResponse) || held.blocks.length > 0) {
      return [];
    }
  }
  return [
    {
      recipientId: parent.comment.author.profileId,
      kind: "reply.created",
      postId: item.comment.postId,
      commentId: item.comment.id,
    },
  ];
}

// A `mod.action` decided directly on a member's profile (ban, suspend, mark_trusted):
// no item to load, so the recipient is just the target profile id itself.
export function memberNotice(
  profileId: string,
  action: string,
  reason?: string | null,
): NotificationToSend[] {
  return [
    {
      recipientId: profileId,
      kind: "mod.action",
      payload: reason === undefined ? { action } : { action, reason },
    },
  ];
}
