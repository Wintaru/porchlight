import type { IHandler } from "../../../Common/IHandler";
import type { FakeAnonymousAuthorState } from "../FakeAnonymousAuthorState";
import type { LoadAnonymousStatusRequest } from "../Requests/LoadAnonymousStatusRequest";
import { AnonymousAuthorAccessFailedResponse } from "../Responses/AnonymousAuthorAccessFailedResponse";
import { AnonymousStatusLoadedResponse } from "../Responses/AnonymousStatusLoadedResponse";

export class FakeLoadAnonymousStatusHandler implements IHandler<
  LoadAnonymousStatusRequest,
  AnonymousStatusLoadedResponse | AnonymousAuthorAccessFailedResponse
> {
  constructor(private readonly state: FakeAnonymousAuthorState) {}

  handle(
    request: LoadAnonymousStatusRequest,
  ): Promise<AnonymousStatusLoadedResponse | AnonymousAuthorAccessFailedResponse> {
    if (this.state.failing) {
      return Promise.resolve(
        new AnonymousAuthorAccessFailedResponse(
          request.correlationId,
          "ANONYMOUS_AUTHOR_FAKE_RESULT=fail",
        ),
      );
    }
    return Promise.resolve(
      new AnonymousStatusLoadedResponse(
        request.correlationId,
        this.state.itemsById.get(request.anonymousAuthorId) ?? [],
      ),
    );
  }
}
