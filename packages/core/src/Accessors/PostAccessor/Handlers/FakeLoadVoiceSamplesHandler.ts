import type { IHandler } from "../../../Common/IHandler";
import type { FakePostState } from "../FakePostState";
import type { LoadVoiceSamplesRequest } from "../Requests/LoadVoiceSamplesRequest";
import { PostAccessFailedResponse } from "../Responses/PostAccessFailedResponse";
import { VoiceSamplesLoadedResponse } from "../Responses/VoiceSamplesLoadedResponse";

export class FakeLoadVoiceSamplesHandler implements IHandler<
  LoadVoiceSamplesRequest,
  VoiceSamplesLoadedResponse | PostAccessFailedResponse
> {
  constructor(private readonly state: FakePostState) {}

  handle(
    request: LoadVoiceSamplesRequest,
  ): Promise<VoiceSamplesLoadedResponse | PostAccessFailedResponse> {
    if (this.state.failing) {
      return Promise.resolve(
        new PostAccessFailedResponse(request.correlationId, "POST_FAKE_RESULT=fail"),
      );
    }
    const samples = [...this.state.posts.values()]
      .filter(
        (post) =>
          post.author.kind === "member" &&
          post.author.profileId === request.profileId &&
          post.status === "published" &&
          post.origin === "editor" &&
          post.agentDraftMd === null,
      )
      .flatMap((post) =>
        post.publishedAt === null
          ? []
          : [{ title: post.title, bodyMd: post.bodyMd, publishedAt: post.publishedAt }],
      )
      .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())
      .slice(0, request.limit);
    return Promise.resolve(
      new VoiceSamplesLoadedResponse(request.correlationId, samples),
    );
  }
}
