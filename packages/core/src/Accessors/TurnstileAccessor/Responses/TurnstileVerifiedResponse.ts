import { ResponseBase } from "../../../Common/ResponseBase";

// The vendor (or the fake) answered. `passed` is the one fact the Engine needs.
export class TurnstileVerifiedResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly passed: boolean,
  ) {
    super(correlationId);
  }
}
