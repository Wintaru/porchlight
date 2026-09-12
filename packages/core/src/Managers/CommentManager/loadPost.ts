import type { IPostAccessor } from "../../Accessors/PostAccessor/IPostAccessor";
import { LoadPostByIdRequest } from "../../Accessors/PostAccessor/Requests/LoadPostByIdRequest";
import { PostLoadedResponse } from "../../Accessors/PostAccessor/Responses/PostLoadedResponse";
import { PostNotFoundResponse } from "../../Accessors/PostAccessor/Responses/PostNotFoundResponse";
import type { Post } from "../../Common/Post";
import type { RequestContext } from "../../Common/RequestContext";
import type { PermissionSubject } from "../../Engines/PermissionEngine/PermissionSubject";
import type { CommentUnavailableResponse } from "./Responses/CommentUnavailableResponse";
import { unavailable } from "./unavailable";

// The post a comment or a reaction is aimed at. `undefined` means there is no such
// post; the caller decides which response that is (a rejection for a new comment, a
// missing target for a reaction).
export async function loadPost(
  posts: IPostAccessor,
  id: string,
  context: Required<Pick<RequestContext, "correlationId">>,
): Promise<Post | undefined | CommentUnavailableResponse> {
  const loaded = await posts.load(new LoadPostByIdRequest(id, context));
  if (loaded instanceof PostLoadedResponse) {
    return loaded.post;
  }
  if (loaded instanceof PostNotFoundResponse) {
    return undefined;
  }
  return unavailable(context.correlationId, loaded, "load");
}

// The subject the PermissionEngine rules on for a post.
export function postSubjectOf(post: Post): PermissionSubject {
  return {
    kind: "post",
    id: post.id,
    author: post.author,
    status: post.status,
    commentsEnabled: post.commentsEnabled,
  };
}
