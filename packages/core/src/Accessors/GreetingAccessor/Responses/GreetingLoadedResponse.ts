import { ResponseBase } from "../../../Common/ResponseBase";

export class GreetingLoadedResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly greeting: string,
  ) {
    super(correlationId);
  }
}
