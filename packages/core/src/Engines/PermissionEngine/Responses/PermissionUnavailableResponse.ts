import { ResponseBase } from "../../../Common/ResponseBase";

// The rule needed site policy and the config store could not answer. `reason` is for
// the server log.
export class PermissionUnavailableResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly reason: string,
  ) {
    super(correlationId);
  }
}
