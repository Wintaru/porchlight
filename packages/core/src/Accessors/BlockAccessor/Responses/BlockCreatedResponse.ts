import { ResponseBase } from "../../../Common/ResponseBase";

export class BlockCreatedResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly blockId: string,
  ) {
    super(correlationId);
  }
}
