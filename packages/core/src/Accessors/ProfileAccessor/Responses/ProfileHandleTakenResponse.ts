import { ResponseBase } from "../../../Common/ResponseBase";

// The unique constraint on `handle` refused the write.
export class ProfileHandleTakenResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly handle: string,
  ) {
    super(correlationId);
  }
}
