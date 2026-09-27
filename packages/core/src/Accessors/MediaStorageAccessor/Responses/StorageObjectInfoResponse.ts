import { ResponseBase } from "../../../Common/ResponseBase";

export class StorageObjectInfoResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly bytes: number,
    readonly contentType: string,
  ) {
    super(correlationId);
  }
}
