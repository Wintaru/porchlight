import { ResponseBase } from "../../../Common/ResponseBase";

// An Accessor or Engine answered something this handler did not expect. `reason` is for
// the log, never for a moderator.
export class ModerationUnavailableResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly reason: string,
  ) {
    super(correlationId);
  }
}
