import { ResponseBase } from "../../../Common/ResponseBase";

// A store or the config could not be reached. `reason` is for the server log.
export class PostUnavailableResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly reason: string,
  ) {
    super(correlationId);
  }
}
