import type { IPostAccessor } from "../../Accessors/PostAccessor/IPostAccessor";
import { LoadPostByIdRequest } from "../../Accessors/PostAccessor/Requests/LoadPostByIdRequest";
import { LoadPostBySlugRequest } from "../../Accessors/PostAccessor/Requests/LoadPostBySlugRequest";
import { PostLoadedResponse } from "../../Accessors/PostAccessor/Responses/PostLoadedResponse";
import { PostNotFoundResponse } from "../../Accessors/PostAccessor/Responses/PostNotFoundResponse";
import type { Post } from "../../Common/Post";
import type { RequestContext } from "../../Common/RequestContext";
import type { PermissionSubject } from "../../Engines/PermissionEngine/PermissionSubject";
import type { PostSelector } from "./PostSelector";
import { NoSuchPostResponse } from "./Responses/NoSuchPostResponse";
import { PostUnavailableResponse } from "./Responses/PostUnavailableResponse";
import { unavailable } from "./unavailable";

// Every handler that acts on an existing post loads it the same way and answers the
// same two failures.
export async function loadPost(
  posts: IPostAccessor,
  selector: PostSelector,
  context: Required<Pick<RequestContext, "correlationId">>,
): Promise<Post | NoSuchPostResponse | PostUnavailableResponse> {
  const loaded = await posts.load(
    selector.by === "id"
      ? new LoadPostByIdRequest(selector.id, context)
      : new LoadPostBySlugRequest(selector.slug, context),
  );
  if (loaded instanceof PostLoadedResponse) {
    return loaded.post;
  }
  if (loaded instanceof PostNotFoundResponse) {
    return new NoSuchPostResponse(context.correlationId);
  }
  return unavailable(context.correlationId, loaded, "load");
}

export function isPost(
  value: Post | NoSuchPostResponse | PostUnavailableResponse,
): value is Post {
  return (
    !(value instanceof NoSuchPostResponse) && !(value instanceof PostUnavailableResponse)
  );
}

// The subject the PermissionEngine rules on for an existing post.
export function subjectOf(post: Post): PermissionSubject {
  return {
    kind: "post",
    id: post.id,
    author: post.author,
    status: post.status,
    commentsEnabled: post.commentsEnabled,
  };
}
