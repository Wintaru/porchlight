import type { IHandler } from "../../../Common/IHandler";
import type { FakeAnonymousAuthorState } from "../FakeAnonymousAuthorState";
import type { LoadAnonymousAuthorBySecretHashRequest } from "../Requests/LoadAnonymousAuthorBySecretHashRequest";
import { AnonymousAuthorAccessFailedResponse } from "../Responses/AnonymousAuthorAccessFailedResponse";
import { AnonymousAuthorLoadedResponse } from "../Responses/AnonymousAuthorLoadedResponse";
import { AnonymousAuthorNotFoundResponse } from "../Responses/AnonymousAuthorNotFoundResponse";

export class FakeLoadAnonymousAuthorBySecretHashHandler implements IHandler<
  LoadAnonymousAuthorBySecretHashRequest,
  | AnonymousAuthorLoadedResponse
  | AnonymousAuthorNotFoundResponse
  | AnonymousAuthorAccessFailedResponse
> {
  constructor(private readonly state: FakeAnonymousAuthorState) {}

  handle(
    request: LoadAnonymousAuthorBySecretHashRequest,
  ): Promise<
    | AnonymousAuthorLoadedResponse
    | AnonymousAuthorNotFoundResponse
    | AnonymousAuthorAccessFailedResponse
  > {
    if (this.state.failing) {
      return Promise.resolve(
        new AnonymousAuthorAccessFailedResponse(
          request.correlationId,
          "ANONYMOUS_AUTHOR_FAKE_RESULT=fail",
        ),
      );
    }
    const row = this.state.bySecretHash.get(request.secretHash);
    return Promise.resolve(
      row === undefined
        ? new AnonymousAuthorNotFoundResponse(request.correlationId)
        : new AnonymousAuthorLoadedResponse(request.correlationId, row),
    );
  }
}
