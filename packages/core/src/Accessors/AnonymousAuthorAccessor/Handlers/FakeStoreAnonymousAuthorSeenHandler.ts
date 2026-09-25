import type { IHandler } from "../../../Common/IHandler";
import type { FakeAnonymousAuthorState } from "../FakeAnonymousAuthorState";
import type { StoreAnonymousAuthorSeenRequest } from "../Requests/StoreAnonymousAuthorSeenRequest";
import { AnonymousAuthorAccessFailedResponse } from "../Responses/AnonymousAuthorAccessFailedResponse";
import { AnonymousAuthorSeenResponse } from "../Responses/AnonymousAuthorSeenResponse";

export class FakeStoreAnonymousAuthorSeenHandler implements IHandler<
  StoreAnonymousAuthorSeenRequest,
  AnonymousAuthorSeenResponse | AnonymousAuthorAccessFailedResponse
> {
  constructor(private readonly state: FakeAnonymousAuthorState) {}

  handle(
    request: StoreAnonymousAuthorSeenRequest,
  ): Promise<AnonymousAuthorSeenResponse | AnonymousAuthorAccessFailedResponse> {
    if (this.state.failing) {
      return Promise.resolve(
        new AnonymousAuthorAccessFailedResponse(
          request.correlationId,
          "ANONYMOUS_AUTHOR_FAKE_RESULT=fail",
        ),
      );
    }
    const row = this.state.byId.get(request.anonymousAuthorId);
    if (row !== undefined) {
      this.state.store({ ...row, ipHash: request.ipHash });
    }
    return Promise.resolve(new AnonymousAuthorSeenResponse(request.correlationId));
  }
}
