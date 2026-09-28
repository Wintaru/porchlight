import type { ICommentAccessor } from "../../Accessors/CommentAccessor/ICommentAccessor";
import { LoadCommentByIdRequest } from "../../Accessors/CommentAccessor/Requests/LoadCommentByIdRequest";
import { CommentLoadedResponse } from "../../Accessors/CommentAccessor/Responses/CommentLoadedResponse";
import { CommentNotFoundResponse } from "../../Accessors/CommentAccessor/Responses/CommentNotFoundResponse";
import type { IMemberBlockAccessor } from "../../Accessors/MemberBlockAccessor/IMemberBlockAccessor";
import { LoadMemberBlocksOfTargetRequest } from "../../Accessors/MemberBlockAccessor/Requests/LoadMemberBlocksOfTargetRequest";
import { MemberBlocksLoadedResponse } from "../../Accessors/MemberBlockAccessor/Responses/MemberBlocksLoadedResponse";
import type { LiveComment } from "../../Common/LiveComment";
import type { MemberBlock } from "../../Common/MemberBlock";
import type { RequestContext } from "../../Common/RequestContext";
import type { LoadedItem } from "./LoadedItem";
import { ModerationUnavailableResponse } from "./Responses/ModerationUnavailableResponse";
import { unavailable } from "./unavailable";

// What approving a comment needs to know about its thread (#85): the live comment it
// answers, if any, and the mutes and blocks that the post's author and that comment's
// author hold against the writer. One parent read and one block read serve both the
// block check and the reply notice.
export interface ThreadHolds {
  readonly parent: LiveComment | undefined;
  readonly holds: readonly MemberBlock[];
}

// A read that fails answers unavailable, so an approval never goes through unchecked.
// An anonymous writer has no member to block, and a parent that is gone or a
// tombstone has no author whose block could count.
export async function loadThreadHolds(
  comments: ICommentAccessor,
  memberBlocks: IMemberBlockAccessor,
  item: Extract<LoadedItem, { kind: "comment" }>,
  context: Required<Pick<RequestContext, "correlationId">>,
): Promise<ThreadHolds | ModerationUnavailableResponse> {
  const parent = await loadParent(comments, item.comment.parentId, context);
  if (parent instanceof ModerationUnavailableResponse) {
    return parent;
  }
  const writer = item.comment.author;
  if (writer.kind !== "member") {
    return { parent, holds: [] };
  }
  // The same holders CommentManager's loadBlocksAgainst asks about: keep the two sets
  // equal, or the queue lets in what the comment form refuses.
  const holderIds = [
    ...new Set(
      [item.postAuthor, parent?.author].flatMap((author) =>
        author?.kind === "member" && author.profileId !== writer.profileId
          ? [author.profileId]
          : [],
      ),
    ),
  ];
  if (holderIds.length === 0) {
    return { parent, holds: [] };
  }
  const loaded = await memberBlocks.load(
    new LoadMemberBlocksOfTargetRequest(writer.profileId, holderIds, context),
  );
  if (!(loaded instanceof MemberBlocksLoadedResponse)) {
    return unavailable(context.correlationId, loaded, "memberBlocks.load");
  }
  return { parent, holds: loaded.blocks };
}

async function loadParent(
  comments: ICommentAccessor,
  parentId: string | null,
  context: Required<Pick<RequestContext, "correlationId">>,
): Promise<LiveComment | ModerationUnavailableResponse | undefined> {
  if (parentId === null) {
    return undefined;
  }
  const loaded = await comments.load(new LoadCommentByIdRequest(parentId, context));
  if (loaded instanceof CommentNotFoundResponse) {
    return undefined;
  }
  if (!(loaded instanceof CommentLoadedResponse)) {
    return unavailable(context.correlationId, loaded, "comments.load");
  }
  return loaded.comment.status === "tombstone" ? undefined : loaded.comment;
}
