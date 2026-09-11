import { ResponseBase } from "../../../Common/ResponseBase";

// The current greeting, after a set or a get.
export class GreetingResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly greeting: string,
  ) {
    super(correlationId);
  }
}
