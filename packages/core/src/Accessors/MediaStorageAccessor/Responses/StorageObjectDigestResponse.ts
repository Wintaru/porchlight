import { ResponseBase } from "../../../Common/ResponseBase";

export class StorageObjectDigestResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly sha256: string,
    readonly bytes: number,
  ) {
    super(correlationId);
  }
}
