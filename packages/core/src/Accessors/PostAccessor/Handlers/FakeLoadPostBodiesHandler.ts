import type { IHandler } from "../../../Common/IHandler";
import type { FakePostState } from "../FakePostState";
import type { LoadPostBodiesRequest } from "../Requests/LoadPostBodiesRequest";
import { PostAccessFailedResponse } from "../Responses/PostAccessFailedResponse";
import { PostBodiesLoadedResponse } from "../Responses/PostBodiesLoadedResponse";

export class FakeLoadPostBodiesHandler implements IHandler<
  LoadPostBodiesRequest,
  PostBodiesLoadedResponse | PostAccessFailedResponse
> {
  constructor(private readonly state: FakePostState) {}

  handle(
    request: LoadPostBodiesRequest,
  ): Promise<PostBodiesLoadedResponse | PostAccessFailedResponse> {
    const { afterId, limit, correlationId } = request;
    if (this.state.failing) {
      return Promise.resolve(
        new PostAccessFailedResponse(correlationId, "POST_FAKE_RESULT=fail"),
      );
    }
    const bodies = [...this.state.posts.values()]
      .filter((post) => afterId === null || post.id > afterId)
      .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
      .slice(0, limit)
      .map((post) => ({ id: post.id, bodyMd: post.bodyMd, bodyHtml: post.bodyHtml }));
    return Promise.resolve(new PostBodiesLoadedResponse(correlationId, bodies));
  }
}
