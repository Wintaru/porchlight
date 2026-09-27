import type { IHandler } from "../../../Common/IHandler";
import type { FakePostState } from "../FakePostState";
import type { LoadPostRevisionsByAuthorRequest } from "../Requests/LoadPostRevisionsByAuthorRequest";
import { PostAccessFailedResponse } from "../Responses/PostAccessFailedResponse";
import { PostRevisionsLoadedResponse } from "../Responses/PostRevisionsLoadedResponse";

export class FakeLoadPostRevisionsByAuthorHandler implements IHandler<
  LoadPostRevisionsByAuthorRequest,
  PostRevisionsLoadedResponse | PostAccessFailedResponse
> {
  constructor(private readonly state: FakePostState) {}

  handle(
    request: LoadPostRevisionsByAuthorRequest,
  ): Promise<PostRevisionsLoadedResponse | PostAccessFailedResponse> {
    const { profileId, correlationId } = request;
    if (this.state.failing) {
      return Promise.resolve(
        new PostAccessFailedResponse(correlationId, "POST_FAKE_RESULT=fail"),
      );
    }
    const revisions = this.state.revisions.filter((revision) => {
      const author = this.state.posts.get(revision.postId)?.author;
      return author?.kind === "member" && author.profileId === profileId;
    });
    return Promise.resolve(new PostRevisionsLoadedResponse(correlationId, revisions));
  }
}
