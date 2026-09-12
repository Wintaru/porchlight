import { ResponseBase } from "../../../Common/ResponseBase";

export class AttachmentAllowlistLoadedResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly allowlist: readonly string[],
  ) {
    super(correlationId);
  }
}
