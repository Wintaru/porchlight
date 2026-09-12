import { ResponseBase } from "../../../Common/ResponseBase";

// The profile store could not be reached. `reason` is for the server log.
export class AccountUnavailableResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly reason: string,
  ) {
    super(correlationId);
  }
}
