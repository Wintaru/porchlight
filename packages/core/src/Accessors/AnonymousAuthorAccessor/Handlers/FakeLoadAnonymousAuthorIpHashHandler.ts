import type { IHandler } from "../../../Common/IHandler";
import type { FakeAnonymousAuthorState } from "../FakeAnonymousAuthorState";
import type { LoadAnonymousAuthorIpHashRequest } from "../Requests/LoadAnonymousAuthorIpHashRequest";
import { AnonymousAuthorAccessFailedResponse } from "../Responses/AnonymousAuthorAccessFailedResponse";
import { AnonymousAuthorIpHashLoadedResponse } from "../Responses/AnonymousAuthorIpHashLoadedResponse";
import { AnonymousAuthorNotFoundResponse } from "../Responses/AnonymousAuthorNotFoundResponse";

type Result =
  | AnonymousAuthorIpHashLoadedResponse
  | AnonymousAuthorNotFoundResponse
  | AnonymousAuthorAccessFailedResponse;

export class FakeLoadAnonymousAuthorIpHashHandler implements IHandler<
  LoadAnonymousAuthorIpHashRequest,
  Result
> {
  constructor(private readonly state: FakeAnonymousAuthorState) {}

  handle(request: LoadAnonymousAuthorIpHashRequest): Promise<Result> {
    if (this.state.failing) {
      return Promise.resolve(
        new AnonymousAuthorAccessFailedResponse(
          request.correlationId,
          "ANONYMOUS_AUTHOR_FAKE_RESULT=fail",
        ),
      );
    }
    const row = this.state.byId.get(request.anonymousAuthorId);
    return Promise.resolve(
      row === undefined
        ? new AnonymousAuthorNotFoundResponse(request.correlationId)
        : new AnonymousAuthorIpHashLoadedResponse(request.correlationId, row.ipHash),
    );
  }
}
