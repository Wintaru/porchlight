import { ResponseBase } from "../../../Common/ResponseBase";

export class GreetingStoredResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly greeting: string,
  ) {
    super(correlationId);
  }
}
