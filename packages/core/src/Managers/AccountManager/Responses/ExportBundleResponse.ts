import { ResponseBase } from "../../../Common/ResponseBase";

// The zip bytes and the filename to serve them under.
export class ExportBundleResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly filename: string,
    readonly bytes: Uint8Array,
  ) {
    super(correlationId);
  }
}
