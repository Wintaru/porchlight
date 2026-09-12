import type { IHandler } from "../../../Common/IHandler";
import type { FakeAnonymousAuthorState } from "../FakeAnonymousAuthorState";
import type { ClaimAnonymousAuthorRequest } from "../Requests/ClaimAnonymousAuthorRequest";
import { AnonymousAuthorAccessFailedResponse } from "../Responses/AnonymousAuthorAccessFailedResponse";
import { AnonymousAuthorAlreadyClaimedResponse } from "../Responses/AnonymousAuthorAlreadyClaimedResponse";
import { AnonymousAuthorClaimedResponse } from "../Responses/AnonymousAuthorClaimedResponse";
import { AnonymousAuthorNotFoundResponse } from "../Responses/AnonymousAuthorNotFoundResponse";

export class FakeClaimAnonymousAuthorHandler implements IHandler<
  ClaimAnonymousAuthorRequest,
  | AnonymousAuthorClaimedResponse
  | AnonymousAuthorAlreadyClaimedResponse
  | AnonymousAuthorNotFoundResponse
  | AnonymousAuthorAccessFailedResponse
> {
  constructor(private readonly state: FakeAnonymousAuthorState) {}

  handle(
    request: ClaimAnonymousAuthorRequest,
  ): Promise<
    | AnonymousAuthorClaimedResponse
    | AnonymousAuthorAlreadyClaimedResponse
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
    const claimed = this.state.claim(request.anonymousAuthorId, request.profileId);
    if (claimed === undefined) {
      return Promise.resolve(new AnonymousAuthorNotFoundResponse(request.correlationId));
    }
    if (claimed === "already-claimed") {
      return Promise.resolve(
        new AnonymousAuthorAlreadyClaimedResponse(request.correlationId),
      );
    }
    return Promise.resolve(new AnonymousAuthorClaimedResponse(request.correlationId));
  }
}
