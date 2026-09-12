import { ResponseBase } from "../../../Common/ResponseBase";

export class StorageObjectDownloadedResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly bytes: Uint8Array,
  ) {
    super(correlationId);
  }
}
