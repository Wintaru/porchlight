import type { IHandler } from "../../../Common/IHandler";
import type { FakeBlockState } from "../FakeBlockState";
import type { CheckAnonymousBlockRequest } from "../Requests/CheckAnonymousBlockRequest";
import { AnonymousBlockedResponse } from "../Responses/AnonymousBlockedResponse";
import { AnonymousNotBlockedResponse } from "../Responses/AnonymousNotBlockedResponse";
import { BlockAccessFailedResponse } from "../Responses/BlockAccessFailedResponse";

export class FakeCheckAnonymousBlockHandler implements IHandler<
  CheckAnonymousBlockRequest,
  AnonymousBlockedResponse | AnonymousNotBlockedResponse | BlockAccessFailedResponse
> {
  constructor(private readonly state: FakeBlockState) {}

  handle(
    request: CheckAnonymousBlockRequest,
  ): Promise<
    AnonymousBlockedResponse | AnonymousNotBlockedResponse | BlockAccessFailedResponse
  > {
    if (this.state.failing) {
      return Promise.resolve(
        new BlockAccessFailedResponse(request.correlationId, "BLOCK_FAKE_RESULT=fail"),
      );
    }
    const blocked =
      (request.anonymousAuthorId !== undefined &&
        this.state.blockedAuthorIds.has(request.anonymousAuthorId)) ||
      (request.ipHash !== null && this.state.blockedIpHashes.has(request.ipHash));
    return Promise.resolve(
      blocked
        ? new AnonymousBlockedResponse(request.correlationId, "fake block")
        : new AnonymousNotBlockedResponse(request.correlationId),
    );
  }
}
