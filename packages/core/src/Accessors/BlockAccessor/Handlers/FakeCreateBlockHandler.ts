import type { IHandler } from "../../../Common/IHandler";
import type { FakeBlockState } from "../FakeBlockState";
import type { CreateBlockRequest } from "../Requests/CreateBlockRequest";
import { BlockAccessFailedResponse } from "../Responses/BlockAccessFailedResponse";
import { BlockCreatedResponse } from "../Responses/BlockCreatedResponse";

export class FakeCreateBlockHandler implements IHandler<
  CreateBlockRequest,
  BlockCreatedResponse | BlockAccessFailedResponse
> {
  constructor(private readonly state: FakeBlockState) {}

  handle(
    request: CreateBlockRequest,
  ): Promise<BlockCreatedResponse | BlockAccessFailedResponse> {
    if (this.state.failing) {
      return Promise.resolve(
        new BlockAccessFailedResponse(request.correlationId, "BLOCK_FAKE_RESULT=fail"),
      );
    }
    this.state.blockedAuthorIds.add(request.anonymousAuthorId);
    return Promise.resolve(
      new BlockCreatedResponse(request.correlationId, globalThis.crypto.randomUUID()),
    );
  }
}
