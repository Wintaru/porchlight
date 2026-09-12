import type { ICommentAccessor } from "../../Accessors/CommentAccessor/ICommentAccessor";
import { LoadCommentByIdRequest } from "../../Accessors/CommentAccessor/Requests/LoadCommentByIdRequest";
import { CommentLoadedResponse } from "../../Accessors/CommentAccessor/Responses/CommentLoadedResponse";
import { CommentNotFoundResponse } from "../../Accessors/CommentAccessor/Responses/CommentNotFoundResponse";
import type { Comment } from "../../Common/Comment";
import type { PostStatus } from "../../Common/PostStatus";
import type { RequestContext } from "../../Common/RequestContext";
import type { PermissionSubject } from "../../Engines/PermissionEngine/PermissionSubject";
import type { CommentUnavailableResponse } from "./Responses/CommentUnavailableResponse";
import { unavailable } from "./unavailable";

// A comment by id. `undefined` means there is no such comment; the caller decides which
// response that is.
export async function loadComment(
  comments: ICommentAccessor,
  id: string,
  context: Required<Pick<RequestContext, "correlationId">>,
): Promise<Comment | undefined | CommentUnavailableResponse> {
  const loaded = await comments.load(new LoadCommentByIdRequest(id, context));
  if (loaded instanceof CommentLoadedResponse) {
    return loaded.comment;
  }
  if (loaded instanceof CommentNotFoundResponse) {
    return undefined;
  }
  return unavailable(context.correlationId, loaded, "load");
}

// The subject the PermissionEngine rules on for an existing comment.
export function commentSubjectOf(
  comment: Comment,
  postStatus: PostStatus,
): PermissionSubject {
  return {
    kind: "comment",
    id: comment.id,
    author: comment.status === "tombstone" ? null : comment.author,
    status: comment.status,
    postStatus,
  };
}
