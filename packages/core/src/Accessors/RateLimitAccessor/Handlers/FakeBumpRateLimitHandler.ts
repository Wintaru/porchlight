import type { IHandler } from "../../../Common/IHandler";
import type { BumpRateLimitRequest } from "../Requests/BumpRateLimitRequest";
import type { FakeRateLimitState } from "../FakeRateLimitState";
import { RateLimitAccessFailedResponse } from "../Responses/RateLimitAccessFailedResponse";
import { RateLimitBumpedResponse } from "../Responses/RateLimitBumpedResponse";

export class FakeBumpRateLimitHandler implements IHandler<
  BumpRateLimitRequest,
  RateLimitBumpedResponse | RateLimitAccessFailedResponse
> {
  constructor(private readonly state: FakeRateLimitState) {}

  handle(
    request: BumpRateLimitRequest,
  ): Promise<RateLimitBumpedResponse | RateLimitAccessFailedResponse> {
    if (this.state.failing) {
      return Promise.resolve(
        new RateLimitAccessFailedResponse(
          request.correlationId,
          "RATE_LIMIT_FAKE_RESULT=fail",
        ),
      );
    }
    const count = this.state.bump(request.subject, request.action, request.windowStart);
    return Promise.resolve(new RateLimitBumpedResponse(request.correlationId, count));
  }
}
