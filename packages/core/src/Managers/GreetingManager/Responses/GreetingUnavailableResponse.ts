import { ResponseBase } from "../../../Common/ResponseBase";

// The store could not be reached. The Manager translates the accessor's failure into
// this so the Client never sees an Accessor type. `reason` is for the server log.
export class GreetingUnavailableResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly reason: string,
  ) {
    super(correlationId);
  }
}
