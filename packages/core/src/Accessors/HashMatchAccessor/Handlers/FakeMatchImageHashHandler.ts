import type { IHandler } from "../../../Common/IHandler";
import type { FakeHashMatchState } from "../FakeHashMatchState";
import type { MatchImageHashRequest } from "../Requests/MatchImageHashRequest";
import { HashMatchAccessFailedResponse } from "../Responses/HashMatchAccessFailedResponse";
import { HashMatchResultResponse } from "../Responses/HashMatchResultResponse";

export class FakeMatchImageHashHandler implements IHandler<
  MatchImageHashRequest,
  HashMatchResultResponse | HashMatchAccessFailedResponse
> {
  constructor(private readonly state: FakeHashMatchState) {}

  handle(
    request: MatchImageHashRequest,
  ): Promise<HashMatchResultResponse | HashMatchAccessFailedResponse> {
    if (this.state.result === "fail") {
      return Promise.resolve(
        new HashMatchAccessFailedResponse(
          request.correlationId,
          "HASH_MATCH_FAKE_RESULT=fail",
        ),
      );
    }
    return Promise.resolve(
      new HashMatchResultResponse(request.correlationId, this.state.result === "match"),
    );
  }
}
