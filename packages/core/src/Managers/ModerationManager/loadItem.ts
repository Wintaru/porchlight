import type { ICommentAccessor } from "../../Accessors/CommentAccessor/ICommentAccessor";
import { LoadCommentByIdRequest } from "../../Accessors/CommentAccessor/Requests/LoadCommentByIdRequest";
import { CommentLoadedResponse } from "../../Accessors/CommentAccessor/Responses/CommentLoadedResponse";
import { CommentNotFoundResponse } from "../../Accessors/CommentAccessor/Responses/CommentNotFoundResponse";
import type { IPostAccessor } from "../../Accessors/PostAccessor/IPostAccessor";
import { LoadPostByIdRequest } from "../../Accessors/PostAccessor/Requests/LoadPostByIdRequest";
import { PostLoadedResponse } from "../../Accessors/PostAccessor/Responses/PostLoadedResponse";
import { PostNotFoundResponse } from "../../Accessors/PostAccessor/Responses/PostNotFoundResponse";
import type { ModerationTarget } from "../../Common/ModerationTarget";
import type { RequestContext } from "../../Common/RequestContext";
import type { PermissionSubject } from "../../Engines/PermissionEngine/PermissionSubject";
import type { LoadedItem } from "./LoadedItem";
import { ModerationUnavailableResponse } from "./Responses/ModerationUnavailableResponse";
import { NoSuchItemResponse } from "./Responses/NoSuchItemResponse";
import { unavailable } from "./unavailable";

// Loads a post or a comment by its ModerationTarget and normalizes the result: a
// tombstone comment answers NoSuchItemResponse, the same as an id nobody recognizes,
// since there is nothing left in it to moderate.
export async function loadItem(
  posts: IPostAccessor,
  comments: ICommentAccessor,
  target: ModerationTarget,
  context: Required<Pick<RequestContext, "correlationId">>,
): Promise<LoadedItem | NoSuchItemResponse | ModerationUnavailableResponse> {
  if (target.kind === "post") {
    const loaded = await posts.load(new LoadPostByIdRequest(target.id, context));
    if (loaded instanceof PostLoadedResponse) {
      return { kind: "post", post: loaded.post };
    }
    if (loaded instanceof PostNotFoundResponse) {
      return new NoSuchItemResponse(context.correlationId);
    }
    return unavailable(context.correlationId, loaded, "posts.load");
  }
  const loaded = await comments.load(new LoadCommentByIdRequest(target.id, context));
  if (loaded instanceof CommentNotFoundResponse) {
    return new NoSuchItemResponse(context.correlationId);
  }
  if (!(loaded instanceof CommentLoadedResponse)) {
    return unavailable(context.correlationId, loaded, "comments.load");
  }
  if (loaded.comment.status === "tombstone") {
    return new NoSuchItemResponse(context.correlationId);
  }
  const post = await posts.load(new LoadPostByIdRequest(loaded.comment.postId, context));
  if (!(post instanceof PostLoadedResponse)) {
    return post instanceof PostNotFoundResponse
      ? new NoSuchItemResponse(context.correlationId)
      : unavailable(context.correlationId, post, "posts.load");
  }
  return { kind: "comment", comment: loaded.comment, postStatus: post.post.status };
}

export function isLoadedItem(
  value: LoadedItem | NoSuchItemResponse | ModerationUnavailableResponse,
): value is LoadedItem {
  return (
    !(value instanceof NoSuchItemResponse) &&
    !(value instanceof ModerationUnavailableResponse)
  );
}

// The subject the PermissionEngine rules on for a loaded item.
export function subjectOf(item: LoadedItem): PermissionSubject {
  if (item.kind === "post") {
    return {
      kind: "post",
      id: item.post.id,
      author: item.post.author,
      status: item.post.status,
      commentsEnabled: item.post.commentsEnabled,
    };
  }
  return {
    kind: "comment",
    id: item.comment.id,
    author: item.comment.author,
    status: item.comment.status,
    postStatus: item.postStatus,
  };
}
