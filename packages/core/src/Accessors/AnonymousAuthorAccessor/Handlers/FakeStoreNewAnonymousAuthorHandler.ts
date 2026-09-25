import type { AnonymousAuthor } from "../../../Common/AnonymousAuthor";
import type { IHandler } from "../../../Common/IHandler";
import type { FakeAnonymousAuthorState } from "../FakeAnonymousAuthorState";
import type { StoreNewAnonymousAuthorRequest } from "../Requests/StoreNewAnonymousAuthorRequest";
import { AnonymousAuthorAccessFailedResponse } from "../Responses/AnonymousAuthorAccessFailedResponse";
import { AnonymousAuthorStoredResponse } from "../Responses/AnonymousAuthorStoredResponse";

export class FakeStoreNewAnonymousAuthorHandler implements IHandler<
  StoreNewAnonymousAuthorRequest,
  AnonymousAuthorStoredResponse | AnonymousAuthorAccessFailedResponse
> {
  constructor(private readonly state: FakeAnonymousAuthorState) {}

  handle(
    request: StoreNewAnonymousAuthorRequest,
  ): Promise<AnonymousAuthorStoredResponse | AnonymousAuthorAccessFailedResponse> {
    if (this.state.failing) {
      return Promise.resolve(
        new AnonymousAuthorAccessFailedResponse(
          request.correlationId,
          "ANONYMOUS_AUTHOR_FAKE_RESULT=fail",
        ),
      );
    }
    const author: AnonymousAuthor = {
      id: globalThis.crypto.randomUUID(),
      claimedBy: null,
      createdAt: request.timestamp,
    };
    this.state.store({
      ...author,
      secretHash: request.secretHash,
      ipHash: request.ipHash,
    });
    return Promise.resolve(
      new AnonymousAuthorStoredResponse(request.correlationId, author),
    );
  }
}
