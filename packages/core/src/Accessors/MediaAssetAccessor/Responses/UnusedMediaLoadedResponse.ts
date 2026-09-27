import { ResponseBase } from "../../../Common/ResponseBase";

export class UnusedMediaLoadedResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly mediaIds: readonly string[],
  ) {
    super(correlationId);
  }
}
