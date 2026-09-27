import type { IHandler } from "../../../Common/IHandler";
import type { FakeHashMatchState } from "../FakeHashMatchState";
import type { MatchImageHashRequest } from "../Requests/MatchImageHashRequest";
import type { MatchMediaUrlRequest } from "../Requests/MatchMediaUrlRequest";
import { HashMatchAccessFailedResponse } from "../Responses/HashMatchAccessFailedResponse";
import { HashMatchResultResponse } from "../Responses/HashMatchResultResponse";

// Answers bytes and links alike: the fake result is one setting for both (#21).
export class FakeMatchImageHashHandler implements IHandler<
  MatchImageHashRequest | MatchMediaUrlRequest,
  HashMatchResultResponse | HashMatchAccessFailedResponse
> {
  constructor(private readonly state: FakeHashMatchState) {}

  handle(
    request: MatchImageHashRequest | MatchMediaUrlRequest,
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
