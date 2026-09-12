import { ResponseBase } from "../../../Common/ResponseBase";

// An Accessor behind the guard could not be reached. reason is for the log, never for
// a visitor.
export class AnonymousGuardUnavailableResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly reason: string,
  ) {
    super(correlationId);
  }
}
