import type { IHandler } from "../../../Common/IHandler";
import type { FakeTurnstileState } from "../FakeTurnstileState";
import type { VerifyTurnstileRequest } from "../Requests/VerifyTurnstileRequest";
import { TurnstileVerifiedResponse } from "../Responses/TurnstileVerifiedResponse";

export class FakeVerifyTurnstileHandler implements IHandler<
  VerifyTurnstileRequest,
  TurnstileVerifiedResponse
> {
  constructor(private readonly state: FakeTurnstileState) {}

  handle(request: VerifyTurnstileRequest): Promise<TurnstileVerifiedResponse> {
    return Promise.resolve(
      new TurnstileVerifiedResponse(request.correlationId, this.state.passing),
    );
  }
}
