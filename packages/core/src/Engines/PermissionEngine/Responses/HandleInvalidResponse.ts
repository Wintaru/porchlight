import { ResponseBase } from "../../../Common/ResponseBase";
import type { HandleRejection } from "../HandleRejection";

export class HandleInvalidResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly reason: HandleRejection,
  ) {
    super(correlationId);
  }
}
