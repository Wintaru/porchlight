import { ResponseBase } from "../../../Common/ResponseBase";

// The accessor could not reach its store. `reason` is for the log, never for a member.
export class GreetingAccessFailedResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly reason: string,
  ) {
    super(correlationId);
  }
}
