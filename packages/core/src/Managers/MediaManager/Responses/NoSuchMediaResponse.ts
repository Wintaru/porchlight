import { ResponseBase } from "../../../Common/ResponseBase";

export class NoSuchMediaResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly mediaId: string,
  ) {
    super(correlationId);
  }
}
