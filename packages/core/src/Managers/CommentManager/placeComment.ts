import type { ICommentAccessor } from "../../Accessors/CommentAccessor/ICommentAccessor";
import type { IProfileAccessor } from "../../Accessors/ProfileAccessor/IProfileAccessor";
import { LoadProfileByIdRequest } from "../../Accessors/ProfileAccessor/Requests/LoadProfileByIdRequest";
import { ProfileLoadedResponse } from "../../Accessors/ProfileAccessor/Responses/ProfileLoadedResponse";
import { ProfileNotFoundResponse } from "../../Accessors/ProfileAccessor/Responses/ProfileNotFoundResponse";
import { MAX_COMMENT_DEPTH } from "../../Common/Comment";
import type { LiveComment } from "../../Common/LiveComment";
import type { RequestContext } from "../../Common/RequestContext";
import { loadComment } from "./loadComment";
import { CommentRejectedResponse } from "./Responses/CommentRejectedResponse";
import { CommentUnavailableResponse } from "./Responses/CommentUnavailableResponse";
import { unavailable } from "./unavailable";

// The handle an anonymous author is answered by. `anon` is a reserved handle (SPEC.md
// §5), so it can never name a real member. Shared by a member's and a visitor's
// CreateComment: the depth rule (D10) does not care who is replying.
const ANONYMOUS_MENTION = "anon";

// Where a reply lands and what it says.
export interface Placement {
  readonly parentId: string | null;
  readonly bodyMd: string;
}

export function isPlacement(
  value: Placement | CommentRejectedResponse | CommentUnavailableResponse,
): value is Placement {
  return (
    !(value instanceof CommentRejectedResponse) &&
    !(value instanceof CommentUnavailableResponse)
  );
}

// A root comment goes where it is. A reply needs a visible parent on this post; at the
// cap it moves up one level and names the comment it answers (D10).
export async function place(
  comments: ICommentAccessor,
  profiles: IProfileAccessor,
  parentId: string | null,
  postId: string,
  bodyMd: string,
  context: Required<Pick<RequestContext, "correlationId">>,
): Promise<Placement | CommentRejectedResponse | CommentUnavailableResponse> {
  if (parentId === null) {
    return { parentId: null, bodyMd };
  }
  const parent = await loadComment(comments, parentId, context);
  if (parent instanceof CommentUnavailableResponse) {
    return parent;
  }
  if (parent?.postId !== postId || parent.status !== "visible") {
    return new CommentRejectedResponse(context.correlationId, "no-such-parent");
  }
  if (parent.depth < MAX_COMMENT_DEPTH) {
    return { parentId: parent.id, bodyMd };
  }
  const mention = await mentionFor(profiles, parent, context);
  if (mention instanceof CommentUnavailableResponse) {
    return mention;
  }
  return { parentId: parent.parentId, bodyMd: `@${mention} ${bodyMd}` };
}

async function mentionFor(
  profiles: IProfileAccessor,
  parent: LiveComment,
  context: Required<Pick<RequestContext, "correlationId">>,
): Promise<string | CommentUnavailableResponse> {
  if (parent.author.kind === "anonymous") {
    return ANONYMOUS_MENTION;
  }
  const loaded = await profiles.load(
    new LoadProfileByIdRequest(parent.author.profileId, context),
  );
  if (loaded instanceof ProfileLoadedResponse) {
    return loaded.profile.handle;
  }
  if (loaded instanceof ProfileNotFoundResponse) {
    // A profile row outlives every state a member can be in (erasure keeps the
    // handle), so this is a broken reference, not a case with a name of its own.
    return new CommentUnavailableResponse(
      context.correlationId,
      `comment ${parent.id} names profile ${parent.author.profileId}, which is gone`,
    );
  }
  return unavailable(context.correlationId, loaded, "load");
}
