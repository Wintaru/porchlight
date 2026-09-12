import { ResponseBase } from "../../../Common/ResponseBase";

// The store could not be reached or refused in a way no other response models. `reason`
// is for the log, never for a member.
export class ReactionAccessFailedResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly reason: string,
  ) {
    super(correlationId);
  }
}
